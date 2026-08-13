import * as THREE from 'three';
import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface PoliceVehicle {
  mesh: THREE.Group;
  type: 'patrol' | 'interceptor' | 'swat';
  pos: THREE.Vector3;
  rotY: number;
  speed: number;
  maxSpeed: number;
  health: number;
  lightBar: THREE.PointLight;
  isWrecked: boolean;
  sirenPhase: number;
}

interface CollectibleItem {
  mesh: THREE.Group;
  type: 'cash' | 'nitro' | 'repair';
  pos: THREE.Vector3;
}

interface HydrantWaterSpout {
  particles: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number }>;
  pos: THREE.Vector3;
}

export class PoliceChase3DEngine implements GameEngineInstance {
  private canvas!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private callbacks: GameEngineCallbacks;

  // Player Getaway Muscle Car
  private playerCar!: THREE.Group;
  private carPos = new THREE.Vector3(0, 0.4, 0);
  private carRotY = 0;
  private speed = 0;
  private maxSpeed = 62;
  private acceleration = 26;
  private carHealth = 100;
  private maxCarHealth = 100;

  // Nitro
  private nitro = 100;
  private isNitroActive = false;

  // Wanted System & Police Pursuit AI
  private wantedStars = 1;
  private policeList: PoliceVehicle[] = [];
  private helicopterMesh!: THREE.Group;
  private heliLight!: THREE.SpotLight;
  private isEvading = false;
  private escapeTimer = 0;
  private score = 0;
  private copsWrecked = 0;
  private cashCollected = 0;

  // Environment & Collectibles
  private collectibles: CollectibleItem[] = [];
  private waterSpouts: HydrantWaterSpout[] = [];
  private buildings: THREE.Box3[] = [];

  // Inputs
  private keys: Record<string, boolean> = {};
  private touchSteer = 0;
  private touchGas = false;
  private touchBrake = false;
  private touchHandbrake = false;
  private isDestroyed = false;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
  }

  public init3D(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.015);

    const aspect = (canvas.clientWidth || 800) / (canvas.clientHeight || 450);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 300);
    this.camera.position.set(0, 5, -15);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 450, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
    } catch {}

    // Lighting (Midnight City Highway)
    const ambient = new THREE.AmbientLight(0x2d3748, 0.8);
    this.scene.add(ambient);

    const moonLight = new THREE.DirectionalLight(0x60a5fa, 0.7);
    moonLight.position.set(30, 80, 40);
    moonLight.castShadow = true;
    this.scene.add(moonLight);

    // Build Open City Grid
    this.buildCityGrid();

    // Build Getaway Muscle Car
    this.playerCar = this.createGetawayCar();
    this.playerCar.position.copy(this.carPos);
    this.scene.add(this.playerCar);

    // Build Police Helicopter
    this.buildHelicopter();

    // Spawn Initial Police Cruisers
    this.spawnPolice('patrol');
    this.spawnPolice('patrol');

    // Spawn Collectibles across map
    this.spawnCityCollectibles();

    this.callbacks.onHealthUpdate?.(this.carHealth, this.maxCarHealth);
    this.callbacks.onScoreUpdate(this.score);
  }

  private createGetawayCar(): THREE.Group {
    const car = new THREE.Group();

    // Muscle Car Body (Sleek Matte Black & Gold Stripes)
    const bodyGeo = new THREE.BoxGeometry(2.1, 0.75, 4.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.9,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    car.add(body);

    // Gold Racing Stripe
    const stripeGeo = new THREE.BoxGeometry(0.5, 0.76, 4.65);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0.55;
    car.add(stripe);

    // Muscle Hood Scoop
    const scoopGeo = new THREE.BoxGeometry(0.8, 0.25, 1.2);
    const scoop = new THREE.Mesh(scoopGeo, bodyMat);
    scoop.position.set(0, 1.0, 1.2);
    car.add(scoop);

    // Windshield & Roof
    const roofGeo = new THREE.BoxGeometry(1.6, 0.6, 2.3);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.1, -0.3);
    car.add(roof);

    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const hlL = new THREE.Mesh(hlGeo, hlMat);
    hlL.position.set(-0.7, 0.55, 2.3);
    const hlR = new THREE.Mesh(hlGeo, hlMat);
    hlR.position.set(0.7, 0.55, 2.3);
    car.add(hlL);
    car.add(hlR);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.8 });
    [-1.1, 1.1].forEach((x) => {
      [-1.35, 1.35].forEach((z) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.4, z);
        wheel.castShadow = true;
        car.add(wheel);
      });
    });

    return car;
  }

  private createPoliceMesh(type: 'patrol' | 'interceptor' | 'swat'): { mesh: THREE.Group; lightBar: THREE.PointLight } {
    const cop = new THREE.Group();
    const isSwat = type === 'swat';

    // Body (Black & White LAPD style cruiser)
    const bodyGeo = new THREE.BoxGeometry(isSwat ? 2.6 : 2.0, isSwat ? 1.4 : 0.7, isSwat ? 5.2 : 4.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isSwat ? 0x1e293b : 0x0f172a,
      metalness: 0.7,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = isSwat ? 0.9 : 0.5;
    body.castShadow = true;
    cop.add(body);

    if (!isSwat) {
      // White doors panel
      const doorGeo = new THREE.BoxGeometry(2.05, 0.5, 2.0);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
      const doors = new THREE.Mesh(doorGeo, doorMat);
      doors.position.set(0, 0.5, 0);
      cop.add(doors);
    }

    // Heavy Push Bumper Bar (Front Ram)
    const pushBarGeo = new THREE.BoxGeometry(isSwat ? 2.7 : 2.1, 0.6, 0.2);
    const pushBarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const pushBar = new THREE.Mesh(pushBarGeo, pushBarMat);
    pushBar.position.set(0, 0.6, isSwat ? 2.7 : 2.3);
    cop.add(pushBar);

    // Flashing Siren Light Bar (Red / Blue)
    const sirenBarGeo = new THREE.BoxGeometry(1.2, 0.15, 0.3);
    const sirenBarMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const sirenBar = new THREE.Mesh(sirenBarGeo, sirenBarMat);
    sirenBar.position.set(0, isSwat ? 1.7 : 1.35, 0);
    cop.add(sirenBar);

    const lightBar = new THREE.PointLight(0xef4444, 3, 12);
    lightBar.position.set(0, isSwat ? 1.8 : 1.4, 0);
    cop.add(lightBar);

    return { mesh: cop, lightBar };
  }

  private buildHelicopter() {
    this.helicopterMesh = new THREE.Group();

    // Heli Body
    const bodyGeo = new THREE.BoxGeometry(2.2, 1.8, 4.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.helicopterMesh.add(body);

    // Tail Boom
    const tailGeo = new THREE.CylinderGeometry(0.3, 0.2, 5);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0.3, -3.8);
    this.helicopterMesh.add(tail);

    // Searchlight
    this.heliLight = new THREE.SpotLight(0xffffff, 4, 80, Math.PI / 8, 0.3);
    this.heliLight.position.set(0, -0.5, 1);
    this.heliLight.target.position.set(0, -30, 0);
    this.heliLight.castShadow = true;
    this.helicopterMesh.add(this.heliLight);
    this.helicopterMesh.add(this.heliLight.target);

    this.helicopterMesh.position.set(0, 28, 0);
    this.scene.add(this.helicopterMesh);
  }

  private buildCityGrid() {
    // City Base Road Asphalt
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // City Blocks (Avenues with Skyscrapers)
    const blockPositions = [
      { x: -35, z: -35, w: 25, d: 25, h: 40 },
      { x: 35, z: -35, w: 25, d: 25, h: 55 },
      { x: -35, z: 35, w: 25, d: 25, h: 48 },
      { x: 35, z: 35, w: 25, d: 25, h: 60 },
      { x: -90, z: 0, w: 30, d: 80, h: 35 },
      { x: 90, z: 0, w: 30, d: 80, h: 42 },
      { x: 0, z: -90, w: 80, d: 30, h: 38 },
      { x: 0, z: 90, w: 80, d: 30, h: 50 }
    ];

    blockPositions.forEach((b) => {
      const bldgGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const bldgMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.5,
        roughness: 0.4
      });
      const bldg = new THREE.Mesh(bldgGeo, bldgMat);
      bldg.position.set(b.x, b.h / 2, b.z);
      bldg.castShadow = true;
      bldg.receiveShadow = true;
      this.scene.add(bldg);

      this.buildings.push(new THREE.Box3().setFromObject(bldg));
    });
  }

  private spawnCityCollectibles() {
    const spots = [
      { x: 0, z: -45, type: 'cash' },
      { x: -45, z: 0, type: 'nitro' },
      { x: 45, z: 0, type: 'repair' },
      { x: 0, z: 45, type: 'cash' },
      { x: -60, z: -60, type: 'nitro' },
      { x: 60, z: 60, type: 'cash' }
    ];

    spots.forEach((s) => {
      const group = new THREE.Group();
      const col = s.type === 'cash' ? 0x22c55e : s.type === 'nitro' ? 0x06b6d4 : 0xec4899;
      const geo = new THREE.BoxGeometry(1.2, 0.8, 1.2);
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.6;
      group.add(mesh);

      const light = new THREE.PointLight(col, 2, 6);
      light.position.y = 1.0;
      group.add(light);

      group.position.set(s.x, 0, s.z);
      this.scene.add(group);

      this.collectibles.push({ mesh: group, type: s.type as any, pos: group.position });
    });
  }

  private spawnPolice(type: 'patrol' | 'interceptor' | 'swat') {
    const { mesh, lightBar } = this.createPoliceMesh(type);

    const angle = Math.random() * Math.PI * 2;
    const spawnPos = this.carPos.clone().add(new THREE.Vector3(Math.cos(angle) * 45, 0.4, Math.sin(angle) * 45));
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    const maxSpd = type === 'swat' ? 44 : type === 'interceptor' ? 64 : 52;
    const hp = type === 'swat' ? 140 : type === 'interceptor' ? 60 : 75;

    this.policeList.push({
      mesh,
      type,
      pos: spawnPos,
      rotY: 0,
      speed: 30,
      maxSpeed: maxSpd,
      health: hp,
      lightBar,
      isWrecked: false,
      sirenPhase: Math.random() * 10
    });

    soundManager.playSiren();
  }

  public update(dt: number) {
    if (this.isDestroyed) return;

    // 1. Getaway Car Physics
    let steerInput = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) steerInput += 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) steerInput -= 1;
    if (this.touchSteer !== 0) steerInput = this.touchSteer;

    let gasInput = (this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchGas) ? 1 : 0;
    let brakeInput = (this.keys['KeyS'] || this.keys['ArrowDown'] || this.touchBrake) ? 1 : 0;
    const isDrifting = !!(this.keys['Space'] || this.touchHandbrake);

    // Nitro
    if ((this.keys['ShiftLeft'] || this.keys['KeyN'] || this.isNitroActive) && this.nitro > 0 && gasInput > 0) {
      this.speed = Math.min(this.maxSpeed * 1.35, this.speed + this.acceleration * 2.0 * dt);
      this.nitro = Math.max(0, this.nitro - 35 * dt);
      soundManager.playNitro();
    } else {
      if (isDrifting) {
        this.nitro = Math.min(100, this.nitro + 12 * dt);
      }
    }

    // Acceleration / Braking
    if (gasInput > 0) {
      this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);
      soundManager.playEngineRev(this.speed / this.maxSpeed);
    } else if (brakeInput > 0) {
      if (this.speed > 0.5) {
        this.speed = Math.max(0, this.speed - this.acceleration * 2.2 * dt);
        soundManager.playTireScreech();
      } else {
        this.speed = Math.max(-16, this.speed - this.acceleration * 0.8 * dt);
      }
    } else {
      this.speed *= Math.pow(0.985, dt * 60);
    }

    if (Math.abs(this.speed) > 0.4) {
      this.carRotY += steerInput * (isDrifting ? 3.0 : 2.0) * dt * (this.speed >= 0 ? 1 : -1);
    }

    this.carPos.x += Math.sin(this.carRotY) * this.speed * dt;
    this.carPos.z += Math.cos(this.carRotY) * this.speed * dt;

    // Bounds clamp
    this.carPos.x = Math.max(-140, Math.min(140, this.carPos.x));
    this.carPos.z = Math.max(-140, Math.min(140, this.carPos.z));

    this.playerCar.position.copy(this.carPos);
    this.playerCar.rotation.y = this.carRotY;

    // Camera follow player
    const camTarget = new THREE.Vector3(
      this.carPos.x - Math.sin(this.carRotY) * 10.0,
      this.carPos.y + 4.2,
      this.carPos.z - Math.cos(this.carRotY) * 10.0
    );
    this.camera.position.lerp(camTarget, 0.12);
    this.camera.lookAt(this.carPos.x, this.carPos.y + 1.2, this.carPos.z);

    // 2. Helicopter Pursuit Following Overhead
    if (this.helicopterMesh) {
      const heliTarget = new THREE.Vector3(this.carPos.x, 24, this.carPos.z);
      this.helicopterMesh.position.lerp(heliTarget, 0.04);
      this.helicopterMesh.rotation.y += 0.8 * dt;
      this.heliLight.target.position.copy(this.carPos);
    }

    // 3. Police AI Pursuit Logic
    this.policeList.forEach((cop, idx) => {
      if (cop.isWrecked) return;

      // Siren light alternation (Red & Blue)
      cop.sirenPhase += dt * 10;
      const isRed = Math.sin(cop.sirenPhase) > 0;
      cop.lightBar.color.setHex(isRed ? 0xef4444 : 0x3b82f6);

      // AI Drive towards player
      const dirToPlayer = this.carPos.clone().sub(cop.pos);
      const dist = dirToPlayer.length();

      dirToPlayer.normalize();
      const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
      cop.rotY = targetAngle;

      cop.speed = Math.min(cop.maxSpeed, cop.speed + 15 * dt);
      cop.pos.x += Math.sin(cop.rotY) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.rotY) * cop.speed * dt;

      cop.mesh.position.copy(cop.pos);
      cop.mesh.rotation.y = cop.rotY;

      // Ramming / PIT Maneuver Collision with Player
      if (dist < 2.8) {
        soundManager.playHit();
        const playerSpeedImpact = Math.abs(this.speed);

        if (playerSpeedImpact > 45 || this.isNitroActive) {
          // Player wrecks the cop!
          cop.health -= 60;
          if (cop.health <= 0) {
            cop.isWrecked = true;
            this.copsWrecked++;
            this.score += 750;
            this.callbacks.onScoreUpdate(this.score);
            soundManager.playExplosion();
            cop.mesh.rotation.z = Math.PI / 2;
          }
        } else {
          // Cop damages player!
          this.carHealth = Math.max(0, this.carHealth - 12);
          this.callbacks.onHealthUpdate?.(this.carHealth, this.maxCarHealth);
          if (this.carHealth <= 0) {
            this.callbacks.onGameOver(this.score);
          }
        }
      }
    });

    // 4. Collectibles Pickup
    this.collectibles.forEach((item) => {
      item.mesh.rotation.y += 2 * dt;
      if (this.carPos.distanceTo(item.pos) < 2.5) {
        if (item.type === 'cash') {
          this.cashCollected += 5000;
          this.score += 1500;
          this.callbacks.onScoreUpdate(this.score);
          soundManager.playCashRegister();
        } else if (item.type === 'nitro') {
          this.nitro = 100;
          soundManager.playCoin();
        } else if (item.type === 'repair') {
          this.carHealth = Math.min(this.maxCarHealth, this.carHealth + 40);
          this.callbacks.onHealthUpdate?.(this.carHealth, this.maxCarHealth);
          soundManager.playLevelUp();
        }
        // Respawn item elsewhere
        item.pos.set((Math.random() - 0.5) * 120, 0, (Math.random() - 0.5) * 120);
        item.mesh.position.copy(item.pos);
      }
    });

    // Escaped Bounties
    this.score += Math.floor(dt * 25 * this.wantedStars);
    this.callbacks.onScoreUpdate(this.score);

    // Render Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public handleKeyDown(code: string) {
    this.keys[code] = true;
    if (code === 'KeyN' || code === 'ShiftLeft') this.isNitroActive = true;
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
    if (code === 'KeyN' || code === 'ShiftLeft') this.isNitroActive = false;
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'STEER_LEFT') this.touchSteer = 1;
    if (action === 'STEER_RIGHT') this.touchSteer = -1;
    if (action === 'GAS') this.touchGas = true;
    if (action === 'BRAKE') this.touchBrake = true;
    if (action === 'HANDBRAKE') this.touchHandbrake = true;
    if (action === 'NITRO') this.isNitroActive = true;
  }

  public handleVirtualActionUp(action: string) {
    if (action === 'STEER_LEFT' && this.touchSteer === 1) this.touchSteer = 0;
    if (action === 'STEER_RIGHT' && this.touchSteer === -1) this.touchSteer = 0;
    if (action === 'GAS') this.touchGas = false;
    if (action === 'BRAKE') this.touchBrake = false;
    if (action === 'HANDBRAKE') this.touchHandbrake = false;
    if (action === 'NITRO') this.isNitroActive = false;
  }

  public getCustomControls() {
    return {
      type: 'police-chase',
      buttons: [
        { id: 'STEER_LEFT', label: '◀ STEER', color: 'bg-slate-700' },
        { id: 'STEER_RIGHT', label: 'STEER ▶', color: 'bg-slate-700' },
        { id: 'GAS', label: '🟢 GAS', color: 'bg-emerald-600' },
        { id: 'BRAKE', label: '🔴 BRAKE', color: 'bg-rose-600' },
        { id: 'NITRO', label: `⚡ NITRO (${Math.floor(this.nitro)}%)`, color: 'bg-cyan-500' }
      ]
    };
  }

  public restart() {
    this.carHealth = 100;
    this.nitro = 100;
    this.speed = 0;
    this.score = 0;
    this.copsWrecked = 0;
    this.carPos.set(0, 0.4, 0);
    this.policeList.forEach((c) => this.scene.remove(c.mesh));
    this.policeList = [];
    this.spawnPolice('patrol');
    this.spawnPolice('patrol');
    this.callbacks.onHealthUpdate?.(100, 100);
    this.callbacks.onScoreUpdate(0);
  }

  public pause() {}
  public resume() {}

  public destroy() {
    this.isDestroyed = true;
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

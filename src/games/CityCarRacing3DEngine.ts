import * as THREE from 'three';
import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface AICar {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  rotY: number;
  speed: number;
  maxSpeed: number;
  waypointIndex: number;
  color: number;
  lap: number;
  currentCheckpoint: number;
}

interface Waypoint {
  x: number;
  z: number;
}

export class CityCarRacing3DEngine implements GameEngineInstance {
  private canvas!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private callbacks: GameEngineCallbacks;

  // Player Car
  private playerCar!: THREE.Group;
  private frontLeftWheel!: THREE.Mesh;
  private frontRightWheel!: THREE.Mesh;
  private rearLeftWheel!: THREE.Mesh;
  private rearRightWheel!: THREE.Mesh;
  private exhaustLight!: THREE.PointLight;

  private carPos = new THREE.Vector3(0, 0.4, -10);
  private carRotY = 0;
  private speed = 0;
  private maxSpeed = 58; // approx 210 km/h
  private acceleration = 24;
  private friction = 0.985;
  private steerAngle = 0;
  private driftFactor = 0;
  private isDrifting = false;

  // Nitro
  private nitro = 100;
  private isNitroActive = false;

  // Circuit Waypoints (Oval / S-Curve City Circuit)
  private waypoints: Waypoint[] = [
    { x: 0, z: -10 },
    { x: 0, z: 80 },
    { x: 25, z: 130 },
    { x: 70, z: 150 },
    { x: 130, z: 120 },
    { x: 140, z: 50 },
    { x: 110, z: 0 },
    { x: 70, z: -30 },
    { x: 30, z: -50 },
    { x: -10, z: -40 }
  ];

  // Race Progress
  private currentLap = 1;
  private totalLaps = 3;
  private currentCheckpoint = 0;
  private lapStartTime = 0;
  private currentLapTime = 0;
  private bestLapTime = 999;
  private raceFinished = false;
  private position = 1;

  // AI Rivals
  private aiCars: AICar[] = [];

  // Visuals & Particles
  private tireSmoke: Array<{ mesh: THREE.Mesh; life: number; velocity: THREE.Vector3 }> = [];
  private flameParticles: Array<{ mesh: THREE.Mesh; life: number }> = [];

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
    this.scene.background = new THREE.Color(0x060914);
    this.scene.fog = new THREE.FogExp2(0x060914, 0.012);

    const aspect = (canvas.clientWidth || 800) / (canvas.clientHeight || 450);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 300);
    this.camera.position.set(0, 4, -18);

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

    // Lighting (Metropolis Neon Night)
    const ambient = new THREE.AmbientLight(0x273549, 0.9);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Build City & Racetrack
    this.buildCityTrack();

    // Build Player Car
    this.playerCar = this.createCarModel(0x0284c7, true);
    this.playerCar.position.copy(this.carPos);
    this.scene.add(this.playerCar);

    // Build 3 AI Rival Cars
    const aiColors = [0xdc2626, 0xf59e0b, 0x10b981];
    aiColors.forEach((col, idx) => {
      const aiMesh = this.createCarModel(col, false);
      const startPos = new THREE.Vector3((idx % 2 === 0 ? 3 : -3), 0.4, -15 - idx * 6);
      aiMesh.position.copy(startPos);
      this.scene.add(aiMesh);

      this.aiCars.push({
        mesh: aiMesh,
        pos: startPos,
        rotY: 0,
        speed: 38 + idx * 3,
        maxSpeed: 46 + idx * 2.5,
        waypointIndex: 1,
        color: col,
        lap: 1,
        currentCheckpoint: 0
      });
    });

    this.lapStartTime = performance.now();
  }

  private createCarModel(color: number, isPlayer: boolean): THREE.Group {
    const car = new THREE.Group();

    // Chassis / Body
    const bodyGeo = new THREE.BoxGeometry(2.0, 0.7, 4.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.85,
      roughness: 0.25
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    car.add(body);

    // Cabin / Roof & Windshield
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.1
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.0, -0.3);
    cabin.castShadow = true;
    car.add(cabin);

    // Rear Spoiler
    const spoilerGeo = new THREE.BoxGeometry(1.9, 0.08, 0.4);
    const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
    spoiler.position.set(0, 1.15, -1.9);
    car.add(spoiler);

    // Headlights (glowing cyan / white)
    const headLightGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const hlLeft = new THREE.Mesh(headLightGeo, headLightMat);
    hlLeft.position.set(-0.7, 0.5, 2.2);
    const hlRight = new THREE.Mesh(headLightGeo, headLightMat);
    hlRight.position.set(0.7, 0.5, 2.2);
    car.add(hlLeft);
    car.add(hlRight);

    // Taillights (glowing red)
    const tailLightGeo = new THREE.BoxGeometry(0.4, 0.12, 0.1);
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tlLeft = new THREE.Mesh(tailLightGeo, tailLightMat);
    tlLeft.position.set(-0.7, 0.55, -2.2);
    const tlRight = new THREE.Mesh(tailLightGeo, tailLightMat);
    tlRight.position.set(0.7, 0.55, -2.2);
    car.add(tlLeft);
    car.add(tlRight);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });

    const createWheel = (x: number, z: number) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.38, z);
      wheel.castShadow = true;
      car.add(wheel);
      return wheel;
    };

    const fl = createWheel(-1.05, 1.3);
    const fr = createWheel(1.05, 1.3);
    const rl = createWheel(-1.05, -1.3);
    const rr = createWheel(1.05, -1.3);

    if (isPlayer) {
      this.frontLeftWheel = fl;
      this.frontRightWheel = fr;
      this.rearLeftWheel = rl;
      this.rearRightWheel = rr;

      this.exhaustLight = new THREE.PointLight(0x38bdf8, 0, 8);
      this.exhaustLight.position.set(0, 0.4, -2.4);
      car.add(this.exhaustLight);
    }

    return car;
  }

  private buildCityTrack() {
    // Ground base
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x090d16 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // Track Ribbon using Waypoints
    const points: THREE.Vector3[] = this.waypoints.map(w => new THREE.Vector3(w.x, 0.05, w.z));
    points.push(points[0].clone()); // loop

    const curve = new THREE.CatmullRomCurve3(points);
    curve.closed = true;

    // Track Geometry Extrusion
    const trackGeo = new THREE.TubeGeometry(curve, 100, 7.5, 4, true);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.2
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.scale.set(1, 0.02, 1);
    this.scene.add(trackMesh);

    // Checkpoint Gate Arches
    this.waypoints.forEach((wp, idx) => {
      const archGroup = new THREE.Group();
      const archMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x22c55e : 0x38bdf8,
        wireframe: true
      });

      const poleLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), archMat);
      poleLeft.position.set(-8, 3, 0);
      const poleRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), archMat);
      poleRight.position.set(8, 3, 0);
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.6, 0.4), archMat);
      topBar.position.set(0, 6, 0);

      archGroup.add(poleLeft);
      archGroup.add(poleRight);
      archGroup.add(topBar);

      archGroup.position.set(wp.x, 0, wp.z);
      this.scene.add(archGroup);
    });

    // Skyscrapers & Neon City Buildings
    const bldgColors = [0x0f172a, 0x1e1b4b, 0x172554, 0x022c22, 0x311042];
    for (let i = 0; i < 45; i++) {
      const h = 25 + Math.random() * 60;
      const w = 12 + Math.random() * 15;
      const d = 12 + Math.random() * 15;
      const bldgGeo = new THREE.BoxGeometry(w, h, d);
      const col = bldgColors[Math.floor(Math.random() * bldgColors.length)];
      const bldgMat = new THREE.MeshStandardMaterial({
        color: col,
        metalness: 0.6,
        roughness: 0.3
      });
      const bldg = new THREE.Mesh(bldgGeo, bldgMat);

      // Random position outside track center
      const angle = (i / 45) * Math.PI * 2;
      const radius = 100 + Math.random() * 90;
      bldg.position.set(Math.cos(angle) * radius + 60, h / 2, Math.sin(angle) * radius + 50);
      bldg.castShadow = true;
      this.scene.add(bldg);

      // Neon roof sign
      if (Math.random() < 0.5) {
        const signGeo = new THREE.BoxGeometry(w * 0.7, 2, 0.5);
        const signMat = new THREE.MeshBasicMaterial({
          color: Math.random() < 0.5 ? 0x06b6d4 : 0xf43f5e
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(bldg.position.x, h + 1, bldg.position.z);
        this.scene.add(sign);
      }
    }
  }

  public update(dt: number) {
    if (this.isDestroyed || this.raceFinished) return;

    this.currentLapTime = (performance.now() - this.lapStartTime) / 1000;

    // 1. Controls & Steering
    let steerInput = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) steerInput += 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) steerInput -= 1;
    if (this.touchSteer !== 0) steerInput = this.touchSteer;

    let gasInput = (this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchGas) ? 1 : 0;
    let brakeInput = (this.keys['KeyS'] || this.keys['ArrowDown'] || this.touchBrake) ? 1 : 0;
    this.isDrifting = !!(this.keys['Space'] || this.touchHandbrake);

    // Nitro
    if ((this.keys['ShiftLeft'] || this.keys['KeyN'] || this.isNitroActive) && this.nitro > 0 && gasInput > 0) {
      this.speed = Math.min(this.maxSpeed * 1.35, this.speed + this.acceleration * 1.8 * dt);
      this.nitro = Math.max(0, this.nitro - 30 * dt);
      this.exhaustLight.intensity = 4.0;
      soundManager.playNitro();
    } else {
      this.exhaustLight.intensity = 0;
      // Passive nitro refill on drifting
      if (this.isDrifting && Math.abs(this.speed) > 10) {
        this.nitro = Math.min(100, this.nitro + 15 * dt);
      }
    }

    // Acceleration & Braking Physics
    if (gasInput > 0) {
      this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);
      soundManager.playEngineRev(this.speed / this.maxSpeed);
    } else if (brakeInput > 0) {
      if (this.speed > 0.5) {
        this.speed = Math.max(0, this.speed - this.acceleration * 2.2 * dt);
        soundManager.playTireScreech();
      } else {
        this.speed = Math.max(-15, this.speed - this.acceleration * 0.8 * dt); // reverse
      }
    } else {
      this.speed *= Math.pow(this.friction, dt * 60);
    }

    // Steering Physics with drift slip angle
    const speedRatio = Math.abs(this.speed) / this.maxSpeed;
    const turnSpeed = (this.isDrifting ? 3.2 : 2.2) * (this.speed >= 0 ? 1 : -1);

    if (Math.abs(this.speed) > 0.5) {
      this.carRotY += steerInput * turnSpeed * dt * Math.min(1.0, speedRatio + 0.3);
    }

    // Wheel visual turning
    const maxWheelTurn = 0.5;
    this.frontLeftWheel.rotation.y = steerInput * maxWheelTurn;
    this.frontRightWheel.rotation.y = steerInput * maxWheelTurn;

    // Wheel rolling rotation
    const rollDelta = (this.speed * dt) / 0.38;
    this.frontLeftWheel.rotation.x += rollDelta;
    this.frontRightWheel.rotation.x += rollDelta;
    this.rearLeftWheel.rotation.x += rollDelta;
    this.rearRightWheel.rotation.x += rollDelta;

    // Car Position Update
    this.carPos.x += Math.sin(this.carRotY) * this.speed * dt;
    this.carPos.z += Math.cos(this.carRotY) * this.speed * dt;

    this.playerCar.position.copy(this.carPos);
    this.playerCar.rotation.y = this.carRotY;

    // Body roll during heavy turns
    this.playerCar.rotation.z = -steerInput * speedRatio * (this.isDrifting ? 0.12 : 0.05);

    // Camera Chase Camera
    const camOffset = new THREE.Vector3(
      this.carPos.x - Math.sin(this.carRotY) * 9.0,
      this.carPos.y + 3.8,
      this.carPos.z - Math.cos(this.carRotY) * 9.0
    );
    this.camera.position.lerp(camOffset, 0.14);
    this.camera.lookAt(this.carPos.x, this.carPos.y + 1.2, this.carPos.z);

    // 2. Checkpoint & Lap Progress
    const targetWp = this.waypoints[this.currentCheckpoint];
    const distToCheckpoint = new THREE.Vector2(this.carPos.x - targetWp.x, this.carPos.z - targetWp.z).length();

    if (distToCheckpoint < 16) {
      this.currentCheckpoint = (this.currentCheckpoint + 1) % this.waypoints.length;

      // Finished a lap!
      if (this.currentCheckpoint === 0) {
        soundManager.playCoin();
        if (this.currentLapTime < this.bestLapTime) {
          this.bestLapTime = this.currentLapTime;
        }

        if (this.currentLap >= this.totalLaps) {
          // Finished race!
          this.raceFinished = true;
          const finalScore = Math.max(1000, Math.floor(10000 - this.currentLapTime * 50) * (5 - this.position));
          this.callbacks.onScoreUpdate(finalScore);
          this.callbacks.onGameOver(finalScore);
          soundManager.playLevelUp();
        } else {
          this.currentLap++;
          this.lapStartTime = performance.now();
        }
      }
    }

    // 3. AI Opponent Racing Logic
    let aheadCount = 0;
    this.aiCars.forEach((ai) => {
      const wp = this.waypoints[ai.waypointIndex];
      const targetVec = new THREE.Vector3(wp.x, 0.4, wp.z);
      const dir = targetVec.clone().sub(ai.pos);
      const dist = dir.length();

      if (dist < 12) {
        ai.waypointIndex = (ai.waypointIndex + 1) % this.waypoints.length;
        if (ai.waypointIndex === 0) {
          ai.lap++;
        }
      }

      dir.normalize();
      const targetRot = Math.atan2(dir.x, dir.z);
      ai.rotY = targetRot;

      ai.pos.x += Math.sin(ai.rotY) * ai.speed * dt;
      ai.pos.z += Math.cos(ai.rotY) * ai.speed * dt;

      ai.mesh.position.copy(ai.pos);
      ai.mesh.rotation.y = ai.rotY;

      // Check if AI is ahead of player
      if (ai.lap > this.currentLap || (ai.lap === this.currentLap && ai.waypointIndex > this.currentCheckpoint)) {
        aheadCount++;
      }
    });

    this.position = aheadCount + 1;
    this.callbacks.onScoreUpdate(Math.floor(this.speed * 3.6)); // Show km/h in score bar

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
      type: 'racing',
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
    this.carPos.set(0, 0.4, -10);
    this.carRotY = 0;
    this.speed = 0;
    this.currentLap = 1;
    this.currentCheckpoint = 0;
    this.raceFinished = false;
    this.nitro = 100;
    this.lapStartTime = performance.now();
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

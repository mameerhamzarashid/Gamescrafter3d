import * as THREE from 'three';
import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

type CropType = 'wheat' | 'corn' | 'sunflower' | 'pumpkin';
type ToolType = 'plow' | 'seeder' | 'water' | 'harvester';

interface CropFieldTile {
  mesh: THREE.Mesh;
  cropMeshes: THREE.Group[];
  x: number;
  z: number;
  state: 'dry' | 'plowed' | 'seeded' | 'watered' | 'ripe';
  cropType: CropType;
  growthProgress: number; // 0 to 1
}

export class FarmingSimulator3DEngine implements GameEngineInstance {
  private canvas!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private callbacks: GameEngineCallbacks;

  // 3D Tractor Vehicle
  private tractorGroup!: THREE.Group;
  private frontLeftWheel!: THREE.Mesh;
  private frontRightWheel!: THREE.Mesh;
  private rearLeftWheel!: THREE.Mesh;
  private rearRightWheel!: THREE.Mesh;
  private activeToolMesh!: THREE.Group;
  private windmillBlades!: THREE.Group;

  // Tractor Physics
  private tractorPos = new THREE.Vector3(0, 0.4, 0);
  private tractorRotY = 0;
  private speed = 0;
  private maxSpeed = 16;
  private acceleration = 12;
  private steerAngle = 0;

  // Farming Equipment & Crops
  private currentTool: ToolType = 'plow';
  private selectedCrop: CropType = 'wheat';
  private grainHopper = 0;
  private hopperCapacity = 50;
  private farmMoney = 150;
  private farmLevel = 1;

  // 4 Fields with grid tiles
  private fieldTiles: CropFieldTile[] = [];

  // Windmill & Scenery
  private windmillPos = new THREE.Vector3(25, 0, -25);
  private marketPos = new THREE.Vector3(-20, 0, 15);

  // Inputs
  private keys: Record<string, boolean> = {};
  private touchSteer = 0;
  private touchGas = false;
  private touchBrake = false;
  private isToolActive = true;
  private isDestroyed = false;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
  }

  public init3D(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x93c5fd);
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.012);

    const aspect = (canvas.clientWidth || 800) / (canvas.clientHeight || 450);
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 250);
    this.camera.position.set(0, 7, -14);

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

    // Sun & Farm Lighting
    const ambient = new THREE.AmbientLight(0xfef9c3, 0.7);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfffbeb, 1.1);
    sun.position.set(40, 70, 30);
    sun.castShadow = true;
    this.scene.add(sun);

    // Build Farm Environment
    this.buildFarm();

    // Build 3D Green Tractor
    this.buildTractor();

    this.callbacks.onScoreUpdate(this.farmMoney);
  }

  private buildFarm() {
    // Base Green Meadow
    const groundGeo = new THREE.PlaneGeometry(250, 250);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Red Farm Barn
    const barnGroup = new THREE.Group();
    const barnBodyGeo = new THREE.BoxGeometry(10, 7, 14);
    const barnBodyMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
    const barnBody = new THREE.Mesh(barnBodyGeo, barnBodyMat);
    barnBody.position.y = 3.5;
    barnBody.castShadow = true;
    barnGroup.add(barnBody);

    const roofGeo = new THREE.ConeGeometry(8.5, 4.5, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 9.0;
    roof.rotation.y = Math.PI / 4;
    barnGroup.add(roof);

    barnGroup.position.set(22, 0, 18);
    this.scene.add(barnGroup);

    // Grain Silo
    const siloGeo = new THREE.CylinderGeometry(2.5, 2.5, 12, 16);
    const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 });
    const silo = new THREE.Mesh(siloGeo, siloMat);
    silo.position.set(32, 6, 18);
    silo.castShadow = true;
    this.scene.add(silo);

    // Windmill
    const windmillGroup = new THREE.Group();
    const towerGeo = new THREE.CylinderGeometry(1.5, 2.8, 14, 8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 7;
    tower.castShadow = true;
    windmillGroup.add(tower);

    this.windmillBlades = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.6, 6.5, 0.08);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 3.25;
      blade.rotation.z = (i / 4) * Math.PI * 2;
      this.windmillBlades.add(blade);
    }
    this.windmillBlades.position.set(0, 13.5, 1.6);
    windmillGroup.add(this.windmillBlades);
    windmillGroup.position.copy(this.windmillPos);
    this.scene.add(windmillGroup);

    // Farmers Market Weigh-Station Outpost
    const marketGroup = new THREE.Group();
    const marketBoothGeo = new THREE.BoxGeometry(6, 4, 6);
    const marketBoothMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
    const marketBooth = new THREE.Mesh(marketBoothGeo, marketBoothMat);
    marketBooth.position.y = 2.0;
    marketGroup.add(marketBooth);

    const signGeo = new THREE.BoxGeometry(5, 1.2, 0.2);
    const signMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 4.8, 2.5);
    marketGroup.add(sign);

    marketGroup.position.copy(this.marketPos);
    this.scene.add(marketGroup);

    // Build 2 Large Farmland Fields (Grids of 8x6 tiles each)
    this.buildFieldGrid(-16, -14, 8, 6);
    this.buildFieldGrid(12, -14, 8, 6);
  }

  private buildFieldGrid(startX: number, startZ: number, cols: number, rows: number) {
    const tileSize = 2.4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + (c - cols / 2) * tileSize;
        const z = startZ + (r - rows / 2) * tileSize;

        const tileGeo = new THREE.PlaneGeometry(tileSize * 0.95, tileSize * 0.95);
        const tileMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.95 }); // dry dirt
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.rotation.x = -Math.PI / 2;
        tileMesh.position.set(x, 0.02, z);
        tileMesh.receiveShadow = true;
        this.scene.add(tileMesh);

        this.fieldTiles.push({
          mesh: tileMesh,
          cropMeshes: [],
          x,
          z,
          state: 'dry',
          cropType: 'wheat',
          growthProgress: 0
        });
      }
    }
  }

  private buildTractor() {
    this.tractorGroup = new THREE.Group();

    // Tractor Hood & Engine Body (Iconic John Deere Green)
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.2, 2.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.0, 0.4);
    body.castShadow = true;
    this.tractorGroup.add(body);

    // Yellow Rims stripe
    const stripeGeo = new THREE.BoxGeometry(1.85, 0.15, 2.85);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 1.2, 0.4);
    this.tractorGroup.add(stripe);

    // Tractor Glass Cabin
    const cabinGeo = new THREE.BoxGeometry(1.6, 1.4, 1.5);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.9, -0.6);
    cabin.castShadow = true;
    this.tractorGroup.add(cabin);

    // Front Headlights
    const hlGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(-0.6, 1.2, 1.8);
    const hl2 = new THREE.Mesh(hlGeo, hlMat);
    hl2.position.set(0.6, 1.2, 1.8);
    this.tractorGroup.add(hl1);
    this.tractorGroup.add(hl2);

    // Exhaust Pipe
    const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(0.6, 2.0, 1.2);
    this.tractorGroup.add(pipe);

    // 4 Wheels (Small front wheels, massive rear tractor wheels)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });

    // Front Wheels
    const frontWheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12);
    this.frontLeftWheel = new THREE.Mesh(frontWheelGeo, wheelMat);
    this.frontLeftWheel.rotation.z = Math.PI / 2;
    this.frontLeftWheel.position.set(-1.05, 0.4, 1.2);
    this.frontRightWheel = new THREE.Mesh(frontWheelGeo, wheelMat);
    this.frontRightWheel.rotation.z = Math.PI / 2;
    this.frontRightWheel.position.set(1.05, 0.4, 1.2);
    this.tractorGroup.add(this.frontLeftWheel);
    this.tractorGroup.add(this.frontRightWheel);

    // Rear Massive Wheels
    const rearWheelGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.5, 14);
    this.rearLeftWheel = new THREE.Mesh(rearWheelGeo, wheelMat);
    this.rearLeftWheel.rotation.z = Math.PI / 2;
    this.rearLeftWheel.position.set(-1.15, 0.75, -0.8);
    this.rearRightWheel = new THREE.Mesh(rearWheelGeo, wheelMat);
    this.rearRightWheel.rotation.z = Math.PI / 2;
    this.rearRightWheel.position.set(1.15, 0.75, -0.8);
    this.tractorGroup.add(this.rearLeftWheel);
    this.tractorGroup.add(this.rearRightWheel);

    // Rear Tool Hitch Attachment (Plow/Seeder/Harvester)
    this.activeToolMesh = new THREE.Group();
    const toolBarGeo = new THREE.BoxGeometry(2.6, 0.3, 0.8);
    const toolBarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7 });
    const toolBar = new THREE.Mesh(toolBarGeo, toolBarMat);
    toolBar.position.set(0, 0.4, -2.0);
    this.activeToolMesh.add(toolBar);

    this.tractorGroup.add(this.activeToolMesh);
    this.tractorGroup.position.copy(this.tractorPos);
    this.scene.add(this.tractorGroup);
  }

  public switchTool(tool: ToolType) {
    this.currentTool = tool;
    soundManager.playClick();
  }

  public switchCrop(crop: CropType) {
    this.selectedCrop = crop;
    soundManager.playClick();
  }

  public sellHarvest() {
    if (this.grainHopper <= 0) return;
    const earnings = this.grainHopper * 18;
    this.farmMoney += earnings;
    this.grainHopper = 0;
    this.callbacks.onScoreUpdate(this.farmMoney);
    soundManager.playCashRegister();
  }

  public update(dt: number) {
    if (this.isDestroyed) return;

    // Rotate Windmill
    if (this.windmillBlades) {
      this.windmillBlades.rotation.z += 1.2 * dt;
    }

    // Tractor Steering & Acceleration
    let steerInput = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) steerInput += 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) steerInput -= 1;
    if (this.touchSteer !== 0) steerInput = this.touchSteer;

    let gasInput = (this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchGas) ? 1 : 0;
    let brakeInput = (this.keys['KeyS'] || this.keys['ArrowDown'] || this.touchBrake) ? 1 : 0;

    if (gasInput > 0) {
      this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);
      soundManager.playEngineRev(this.speed / this.maxSpeed);
    } else if (brakeInput > 0) {
      if (this.speed > 0.5) {
        this.speed = Math.max(0, this.speed - this.acceleration * 1.8 * dt);
      } else {
        this.speed = Math.max(-8, this.speed - this.acceleration * 0.6 * dt);
      }
    } else {
      this.speed *= Math.pow(0.92, dt * 60);
    }

    if (Math.abs(this.speed) > 0.3) {
      this.tractorRotY += steerInput * 1.8 * dt * (this.speed >= 0 ? 1 : -1);
    }

    // Wheel visual turning
    this.frontLeftWheel.rotation.y = steerInput * 0.4;
    this.frontRightWheel.rotation.y = steerInput * 0.4;

    this.tractorPos.x += Math.sin(this.tractorRotY) * this.speed * dt;
    this.tractorPos.z += Math.cos(this.tractorRotY) * this.speed * dt;

    this.tractorGroup.position.copy(this.tractorPos);
    this.tractorGroup.rotation.y = this.tractorRotY;

    // Camera follow tractor
    const camTarget = new THREE.Vector3(
      this.tractorPos.x - Math.sin(this.tractorRotY) * 9.5,
      this.tractorPos.y + 6.0,
      this.tractorPos.z - Math.cos(this.tractorRotY) * 9.5
    );
    this.camera.position.lerp(camTarget, 0.12);
    this.camera.lookAt(this.tractorPos.x, this.tractorPos.y + 1.2, this.tractorPos.z);

    // Check interaction with Field Tiles under the tractor rear hitch
    const hitchPos = new THREE.Vector3(
      this.tractorPos.x - Math.sin(this.tractorRotY) * 2.0,
      0,
      this.tractorPos.z - Math.cos(this.tractorRotY) * 2.0
    );

    this.fieldTiles.forEach((tile) => {
      const dist = new THREE.Vector2(tile.x - hitchPos.x, tile.z - hitchPos.z).length();

      // Tool Application when tractor rolls over field
      if (dist < 1.6 && Math.abs(this.speed) > 0.5) {
        if (this.currentTool === 'plow' && tile.state === 'dry') {
          tile.state = 'plowed';
          (tile.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x451a03); // rich dark plowed soil
          soundManager.playMining();
        } else if (this.currentTool === 'seeder' && tile.state === 'plowed') {
          tile.state = 'seeded';
          tile.cropType = this.selectedCrop;
          tile.growthProgress = 0.1;
          (tile.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x78350f);
          soundManager.playCoin();
        } else if (this.currentTool === 'water' && (tile.state === 'seeded' || tile.state === 'plowed')) {
          tile.state = 'watered';
          (tile.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x292524); // damp soil
          soundManager.playSplash();
        } else if (this.currentTool === 'harvester' && tile.state === 'ripe') {
          if (this.grainHopper < this.hopperCapacity) {
            this.grainHopper += 5;
            tile.state = 'dry';
            tile.growthProgress = 0;
            (tile.mesh.material as THREE.MeshStandardMaterial).color.setHex(0xa16207);
            tile.cropMeshes.forEach((m) => this.scene.remove(m));
            tile.cropMeshes = [];
            soundManager.playLevelUp();
          }
        }
      }

      // Crop Growth Progression
      if (tile.state === 'watered' || tile.state === 'seeded') {
        tile.growthProgress += dt * 0.12; // Grow to ripe in ~8 seconds

        if (tile.growthProgress >= 1.0) {
          tile.state = 'ripe';
          // Spawn 3D Ripe Stalks
          this.spawnRipeCrops(tile);
        }
      }
    });

    // Check Market Station Proximity to auto-sell
    if (this.tractorPos.distanceTo(this.marketPos) < 6.0 && this.grainHopper > 0) {
      this.sellHarvest();
    }

    // Render Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private spawnRipeCrops(tile: CropFieldTile) {
    const cropGroup = new THREE.Group();
    const stalkMat = new THREE.MeshStandardMaterial({
      color: tile.cropType === 'sunflower' ? 0xfacc15 : tile.cropType === 'corn' ? 0x65a30d : 0xeab308,
      roughness: 0.6
    });

    for (let i = 0; i < 4; i++) {
      const stalkGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6);
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.set((i % 2 - 0.5) * 0.8, 0.7, (Math.floor(i / 2) - 0.5) * 0.8);
      stalk.castShadow = true;
      cropGroup.add(stalk);
    }

    cropGroup.position.set(tile.x, 0, tile.z);
    this.scene.add(cropGroup);
    tile.cropMeshes.push(cropGroup);
  }

  public handleKeyDown(code: string) {
    this.keys[code] = true;
    if (code === 'Digit1') this.switchTool('plow');
    if (code === 'Digit2') this.switchTool('seeder');
    if (code === 'Digit3') this.switchTool('water');
    if (code === 'Digit4') this.switchTool('harvester');
    if (code === 'KeyE') this.sellHarvest();
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'STEER_LEFT') this.touchSteer = 1;
    if (action === 'STEER_RIGHT') this.touchSteer = -1;
    if (action === 'GAS') this.touchGas = true;
    if (action === 'BRAKE') this.touchBrake = true;
    if (action === 'TOOL_PLOW') this.switchTool('plow');
    if (action === 'TOOL_SEED') this.switchTool('seeder');
    if (action === 'TOOL_WATER') this.switchTool('water');
    if (action === 'TOOL_HARVEST') this.switchTool('harvester');
    if (action === 'SELL_MARKET') this.sellHarvest();
  }

  public handleVirtualActionUp(action: string) {
    if (action === 'STEER_LEFT' && this.touchSteer === 1) this.touchSteer = 0;
    if (action === 'STEER_RIGHT' && this.touchSteer === -1) this.touchSteer = 0;
    if (action === 'GAS') this.touchGas = false;
    if (action === 'BRAKE') this.touchBrake = false;
  }

  public getCustomControls() {
    return {
      type: 'farming',
      buttons: [
        { id: 'TOOL_PLOW', label: '🚜 1. PLOW', color: this.currentTool === 'plow' ? 'bg-amber-600' : 'bg-slate-700' },
        { id: 'TOOL_SEED', label: `🌱 2. SEED (${this.selectedCrop.toUpperCase()})`, color: this.currentTool === 'seeder' ? 'bg-emerald-600' : 'bg-slate-700' },
        { id: 'TOOL_WATER', label: '💧 3. WATER', color: this.currentTool === 'water' ? 'bg-blue-600' : 'bg-slate-700' },
        { id: 'TOOL_HARVEST', label: `🌾 4. REAP (${this.grainHopper}/${this.hopperCapacity})`, color: this.currentTool === 'harvester' ? 'bg-yellow-500' : 'bg-slate-700' },
        { id: 'SELL_MARKET', label: '💰 SELL CROPS', color: 'bg-emerald-700' }
      ]
    };
  }

  public restart() {
    this.farmMoney = 150;
    this.grainHopper = 0;
    this.speed = 0;
    this.tractorPos.set(0, 0.4, 0);
    this.fieldTiles.forEach((tile) => {
      tile.state = 'dry';
      tile.growthProgress = 0;
      (tile.mesh.material as THREE.MeshStandardMaterial).color.setHex(0xa16207);
      tile.cropMeshes.forEach((m) => this.scene.remove(m));
      tile.cropMeshes = [];
    });
    this.callbacks.onScoreUpdate(this.farmMoney);
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

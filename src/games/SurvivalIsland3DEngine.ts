import * as THREE from 'three';
import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface IslandResource {
  mesh: THREE.Group;
  type: 'tree' | 'rock' | 'coconut' | 'berry' | 'driftwood';
  health: number;
  maxHealth: number;
  position: THREE.Vector3;
  isHarvested: boolean;
}

interface CraftedStructure {
  mesh: THREE.Group;
  type: 'campfire' | 'shelter' | 'purifier';
  position: THREE.Vector3;
  pointLight?: THREE.PointLight;
}

interface IslandCreature {
  mesh: THREE.Group;
  type: 'boar';
  health: number;
  position: THREE.Vector3;
  rotation: number;
  speed: number;
  wanderTimer: number;
  isDead: boolean;
}

export class SurvivalIsland3DEngine implements GameEngineInstance {
  private canvas!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private callbacks: GameEngineCallbacks;

  // Player Explorer
  private playerGroup!: THREE.Group;
  private playerPos = new THREE.Vector3(0, 0.8, 0);
  private playerRotY = 0;
  private playerVel = new THREE.Vector3();
  private isSwinging = false;
  private swingTimer = 0;
  private toolMesh!: THREE.Mesh;

  // Survival Stats
  private health = 100;
  private maxHealth = 100;
  private hunger = 100;
  private thirst = 100;
  private stamina = 100;
  private daysSurvived = 1;
  private dayTime = 0.2; // 0 to 1 (0 = morning, 0.5 = noon, 0.75 = sunset, 0.9 = night)

  // Inventory
  private inventory = {
    wood: 6,
    stone: 4,
    fiber: 2,
    meat: 0,
    cookedMeat: 0,
    coconut: 2,
    axe: true,
    pickaxe: false,
    spear: false
  };

  // Environment & Lighting
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private oceanWater!: THREE.Mesh;
  private resources: IslandResource[] = [];
  private structures: CraftedStructure[] = [];
  private creatures: IslandCreature[] = [];

  // Crafting state
  private isCraftingMenuOpen = false;
  private selectedCraft: 'campfire' | 'shelter' | 'spear' | 'pickaxe' = 'campfire';

  // Input & Controls
  private keys: Record<string, boolean> = {};
  private touchMove = { x: 0, y: 0, active: false };
  private touchAim = { x: 0, y: 0, active: false };
  private isDestroyed = false;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
  }

  public init3D(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc);
    this.scene.fog = new THREE.FogExp2(0x7dd3fc, 0.015);

    const aspect = (canvas.clientWidth || 800) / (canvas.clientHeight || 450);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    this.camera.position.set(0, 5, 8);

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

    // Ambient & Dynamic Sun Light
    this.ambientLight = new THREE.AmbientLight(0xfef08a, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    this.sunLight.position.set(40, 60, 30);
    this.sunLight.castShadow = true;
    this.scene.add(this.sunLight);

    // Build Island World
    this.buildIsland();

    // Build Player Explorer
    this.buildPlayer();

    // Spawn Wildlife
    this.spawnWildlife();

    this.callbacks.onHealthUpdate?.(this.health, this.maxHealth);
    this.callbacks.onScoreUpdate(this.daysSurvived);
  }

  private buildIsland() {
    // Ocean Water Plane
    const oceanGeo = new THREE.PlaneGeometry(300, 300, 32, 32);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85
    });
    this.oceanWater = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanWater.rotation.x = -Math.PI / 2;
    this.oceanWater.position.y = -0.2;
    this.scene.add(this.oceanWater);

    // Island Terrain (Central mound with sandy beach)
    const islandGeo = new THREE.CylinderGeometry(28, 38, 2.5, 32);
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Lush tropical grass
      roughness: 0.9
    });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = 0.5;
    island.receiveShadow = true;
    this.scene.add(island);

    // Sandy coastline ring
    const sandGeo = new THREE.RingGeometry(24, 38, 32);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xfde047, // Golden Sand
      roughness: 0.95
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = 1.76;
    sand.receiveShadow = true;
    this.scene.add(sand);

    // Spawn 16 Palm Trees
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 16;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      this.createPalmTree(x, z);
    }

    // Spawn 12 Stone Boulders
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 18;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      this.createRockResource(x, z);
    }
  }

  private createPalmTree(x: number, z: number) {
    const treeGroup = new THREE.Group();

    // Curved Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 4.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.25;
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Palm Leaves Fronds
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });
    for (let i = 0; i < 6; i++) {
      const leafGeo = new THREE.ConeGeometry(0.8, 2.8, 4);
      const leaf = new THREE.Mesh(leafGeo, frondMat);
      leaf.position.y = 4.4;
      leaf.rotation.z = Math.PI / 3;
      leaf.rotation.y = (i / 6) * Math.PI * 2;
      leaf.castShadow = true;
      treeGroup.add(leaf);
    }

    // Coconuts
    const nutGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const nutMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const nut1 = new THREE.Mesh(nutGeo, nutMat);
    nut1.position.set(0.2, 4.2, 0.2);
    treeGroup.add(nut1);

    treeGroup.position.set(x, 1.7, z);
    this.scene.add(treeGroup);

    this.resources.push({
      mesh: treeGroup,
      type: 'tree',
      health: 4,
      maxHealth: 4,
      position: new THREE.Vector3(x, 1.7, z),
      isHarvested: false
    });
  }

  private createRockResource(x: number, z: number) {
    const rockGroup = new THREE.Group();
    const rockGeo = new THREE.DodecahedronGeometry(0.9, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.y = 0.6;
    rock.scale.set(1 + Math.random() * 0.4, 0.8 + Math.random() * 0.3, 1 + Math.random() * 0.4);
    rock.castShadow = true;
    rockGroup.add(rock);

    rockGroup.position.set(x, 1.7, z);
    this.scene.add(rockGroup);

    this.resources.push({
      mesh: rockGroup,
      type: 'rock',
      health: 5,
      maxHealth: 5,
      position: new THREE.Vector3(x, 1.7, z),
      isHarvested: false
    });
  }

  private spawnWildlife() {
    for (let i = 0; i < 3; i++) {
      const boar = new THREE.Group();

      // Boar Body
      const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 1.2);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.9 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.45;
      body.castShadow = true;
      boar.add(body);

      // Head & Snout
      const headGeo = new THREE.BoxGeometry(0.5, 0.45, 0.5);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0, 0.55, 0.7);
      boar.add(head);

      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 12;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 1.7, Math.sin(angle) * radius);
      boar.position.copy(pos);
      this.scene.add(boar);

      this.creatures.push({
        mesh: boar,
        type: 'boar',
        health: 3,
        position: pos,
        rotation: Math.random() * Math.PI * 2,
        speed: 2.2,
        wanderTimer: 2.0,
        isDead: false
      });
    }
  }

  private buildPlayer() {
    this.playerGroup = new THREE.Group();

    // Body (Survivor explorer)
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    this.playerGroup.add(body);

    // Head with Explorer Hat
    const headGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.4;
    this.playerGroup.add(head);

    // Handheld Tool (Stone Axe / Pickaxe)
    const toolGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.4, 0.9, 0.4);
    handle.rotation.x = Math.PI / 4;
    toolGroup.add(handle);

    const headToolGeo = new THREE.BoxGeometry(0.12, 0.22, 0.35);
    const headToolMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const toolHead = new THREE.Mesh(headToolGeo, headToolMat);
    toolHead.position.set(0.4, 1.15, 0.65);
    toolGroup.add(toolHead);

    this.toolMesh = toolHead;
    this.playerGroup.add(toolGroup);

    this.playerGroup.position.copy(this.playerPos);
    this.scene.add(this.playerGroup);
  }

  public interact() {
    this.isSwinging = true;
    this.swingTimer = 0.3;

    // Check closest resource within 2.5 meters
    let closestRes: IslandResource | null = null;
    let minDist = 2.8;

    for (const res of this.resources) {
      if (res.isHarvested) continue;
      const d = this.playerPos.distanceTo(res.position);
      if (d < minDist) {
        minDist = d;
        closestRes = res;
      }
    }

    if (closestRes) {
      closestRes.health--;
      // Wobble animation
      closestRes.mesh.rotation.z += 0.08;
      setTimeout(() => {
        if (closestRes && closestRes.mesh) closestRes.mesh.rotation.z = 0;
      }, 100);

      if (closestRes.type === 'tree') {
        soundManager.playChop();
        this.inventory.wood += 2;
        if (Math.random() < 0.3) {
          this.inventory.coconut += 1;
        }
      } else if (closestRes.type === 'rock') {
        soundManager.playMining();
        this.inventory.stone += 2;
        this.inventory.fiber += 1;
      }

      if (closestRes.health <= 0) {
        closestRes.isHarvested = true;
        this.scene.remove(closestRes.mesh);
        soundManager.playLevelUp();
      }
      return;
    }

    // Check wildlife hunt
    for (const creature of this.creatures) {
      if (creature.isDead) continue;
      if (this.playerPos.distanceTo(creature.position) < 2.5) {
        creature.health--;
        soundManager.playHit();
        if (creature.health <= 0) {
          creature.isDead = true;
          this.inventory.meat += 2;
          this.scene.remove(creature.mesh);
          soundManager.playCoin();
        }
        return;
      }
    }
  }

  public craft(type: 'campfire' | 'shelter' | 'spear' | 'pickaxe') {
    if (type === 'campfire' && this.inventory.wood >= 4 && this.inventory.stone >= 2) {
      this.inventory.wood -= 4;
      this.inventory.stone -= 2;

      // Build 3D Campfire
      const fireGroup = new THREE.Group();
      const stonesGeo = new THREE.TorusGeometry(0.8, 0.15, 6, 12);
      const stonesMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const stones = new THREE.Mesh(stonesGeo, stonesMat);
      stones.rotation.x = Math.PI / 2;
      fireGroup.add(stones);

      const fireLight = new THREE.PointLight(0xf97316, 2.5, 12, 1.5);
      fireLight.position.y = 0.6;
      fireGroup.add(fireLight);

      const spawnPos = this.playerPos.clone().add(new THREE.Vector3(Math.sin(this.playerRotY) * 2, 0, Math.cos(this.playerRotY) * 2));
      fireGroup.position.copy(spawnPos);
      this.scene.add(fireGroup);

      this.structures.push({ mesh: fireGroup, type: 'campfire', position: spawnPos, pointLight: fireLight });
      soundManager.playLevelUp();
    } else if (type === 'shelter' && this.inventory.wood >= 8 && this.inventory.fiber >= 3) {
      this.inventory.wood -= 8;
      this.inventory.fiber -= 3;

      const shelterGroup = new THREE.Group();
      const roofGeo = new THREE.ConeGeometry(2.2, 2.5, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 1.3;
      shelterGroup.add(roof);

      const spawnPos = this.playerPos.clone().add(new THREE.Vector3(Math.sin(this.playerRotY) * 2.5, 0, Math.cos(this.playerRotY) * 2.5));
      shelterGroup.position.copy(spawnPos);
      this.scene.add(shelterGroup);

      this.structures.push({ mesh: shelterGroup, type: 'shelter', position: spawnPos });
      soundManager.playLevelUp();
    }
  }

  public eatOrDrink() {
    if (this.inventory.cookedMeat > 0) {
      this.inventory.cookedMeat--;
      this.hunger = Math.min(100, this.hunger + 40);
      this.health = Math.min(this.maxHealth, this.health + 20);
      soundManager.playCoin();
    } else if (this.inventory.coconut > 0) {
      this.inventory.coconut--;
      this.thirst = Math.min(100, this.thirst + 35);
      this.hunger = Math.min(100, this.hunger + 15);
      soundManager.playSplash();
    }
  }

  public update(dt: number) {
    if (this.isDestroyed) return;

    // Day/Night progression
    this.dayTime = (this.dayTime + dt * 0.015) % 1.0;
    const sunAngle = this.dayTime * Math.PI * 2;
    this.sunLight.position.set(Math.cos(sunAngle) * 50, Math.sin(sunAngle) * 50, 20);

    const isNight = this.dayTime > 0.75 || this.dayTime < 0.15;
    this.scene.background = new THREE.Color(isNight ? 0x050814 : 0x7dd3fc);
    this.sunLight.intensity = isNight ? 0.15 : 1.2;
    this.ambientLight.intensity = isNight ? 0.2 : 0.6;

    if (this.dayTime > 0.98 && this.dayTime < 0.99) {
      this.daysSurvived++;
      this.callbacks.onScoreUpdate(this.daysSurvived);
      soundManager.playLevelUp();
    }

    // Survival Decay
    this.hunger = Math.max(0, this.hunger - dt * 0.8);
    this.thirst = Math.max(0, this.thirst - dt * 1.2);

    if (this.hunger <= 0 || this.thirst <= 0) {
      this.health = Math.max(0, this.health - dt * 4);
      this.callbacks.onHealthUpdate?.(Math.floor(this.health), this.maxHealth);
      if (this.health <= 0) {
        this.callbacks.onGameOver(this.daysSurvived * 1000);
      }
    }

    // Player Movement
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x += 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x -= 1;

    if (this.touchMove.active) {
      moveDir.x = -this.touchMove.x;
      moveDir.z = -this.touchMove.y;
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.playerRotY = Math.atan2(moveDir.x, moveDir.z);
      this.playerVel.x = moveDir.x * 5.2;
      this.playerVel.z = moveDir.z * 5.2;
    } else {
      this.playerVel.multiplyScalar(0.75);
    }

    this.playerPos.addScaledVector(this.playerVel, dt);
    // Keep within island radius
    const radiusFromCenter = new THREE.Vector2(this.playerPos.x, this.playerPos.z).length();
    if (radiusFromCenter > 25) {
      this.playerPos.normalize().multiplyScalar(25);
    }

    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y = this.playerRotY;

    // Swing Tool Animation
    if (this.isSwinging) {
      this.swingTimer -= dt;
      this.toolMesh.rotation.x = Math.PI / 2;
      if (this.swingTimer <= 0) {
        this.isSwinging = false;
        this.toolMesh.rotation.x = 0;
      }
    }

    // Camera follow player
    const camTarget = new THREE.Vector3(
      this.playerPos.x - Math.sin(this.playerRotY) * 5.5,
      this.playerPos.y + 4.5,
      this.playerPos.z - Math.cos(this.playerRotY) * 5.5
    );
    this.camera.position.lerp(camTarget, 0.1);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.0, this.playerPos.z);

    // Update Creatures (Boars wandering)
    this.creatures.forEach((c) => {
      if (c.isDead) return;
      c.wanderTimer -= dt;
      if (c.wanderTimer <= 0) {
        c.wanderTimer = 2.0 + Math.random() * 3;
        c.rotation = Math.random() * Math.PI * 2;
      }

      c.position.x += Math.sin(c.rotation) * c.speed * dt;
      c.position.z += Math.cos(c.rotation) * c.speed * dt;
      c.mesh.position.copy(c.position);
      c.mesh.rotation.y = c.rotation;
    });

    // Render Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public handleKeyDown(code: string) {
    this.keys[code] = true;
    if (code === 'Space' || code === 'KeyE') this.interact();
    if (code === 'KeyC') this.craft('campfire');
    if (code === 'KeyF') this.eatOrDrink();
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'ACTION') this.interact();
    if (action === 'CRAFT_CAMPFIRE') this.craft('campfire');
    if (action === 'CRAFT_SHELTER') this.craft('shelter');
    if (action === 'EAT_DRINK') this.eatOrDrink();
    if (action === 'JOYSTICK_MOVE') this.touchMove.active = true;
  }

  public handleVirtualActionUp(action: string) {
    if (action === 'JOYSTICK_MOVE') this.touchMove.active = false;
  }

  public getCustomControls() {
    return {
      type: 'survival',
      buttons: [
        { id: 'ACTION', label: '🪓 CHOP / MINE / HUNT', color: 'bg-amber-600' },
        { id: 'EAT_DRINK', label: `🥥 EAT/DRINK (${this.inventory.coconut + this.inventory.cookedMeat})`, color: 'bg-emerald-600' },
        { id: 'CRAFT_CAMPFIRE', label: '🔥 CRAFT CAMPFIRE (4W 2S)', color: 'bg-rose-600' },
        { id: 'CRAFT_SHELTER', label: '⛺ CRAFT CABIN (8W 3F)', color: 'bg-indigo-600' }
      ]
    };
  }

  public restart() {
    this.health = 100;
    this.hunger = 100;
    this.thirst = 100;
    this.daysSurvived = 1;
    this.playerPos.set(0, 0.8, 0);
    this.inventory = {
      wood: 6,
      stone: 4,
      fiber: 2,
      meat: 0,
      cookedMeat: 0,
      coconut: 2,
      axe: true,
      pickaxe: false,
      spear: false
    };
    this.callbacks.onHealthUpdate?.(100, 100);
    this.callbacks.onScoreUpdate(1);
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

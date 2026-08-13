import * as THREE from 'three';
import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface Zombie {
  mesh: THREE.Group;
  type: 'walker' | 'runner' | 'brute';
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  isDead: boolean;
  deathTimer: number;
  walkCycle: number;
}

interface Bullet {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  damage: number;
  isHeadshot?: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface SupplyDrop {
  mesh: THREE.Group;
  type: 'ammo' | 'health' | 'upgrade';
  position: THREE.Vector3;
}

export class ZombieSurvival3DEngine implements GameEngineInstance {
  private canvas!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private callbacks: GameEngineCallbacks;

  // Player state
  private playerGroup!: THREE.Group;
  private flashlight!: THREE.SpotLight;
  private muzzleLight!: THREE.PointLight;
  private playerPos = new THREE.Vector3(0, 1.0, 0);
  private playerRotY = 0;
  private playerVelocity = new THREE.Vector3();
  private health = 100;
  private maxHealth = 100;
  private stamina = 100;
  private score = 0;
  private wave = 1;
  private kills = 0;
  private combo = 0;
  private comboTimer = 0;

  // Weapons
  private currentWeapon: 'rifle' | 'shotgun' | 'pistol' = 'rifle';
  private ammo = { rifle: 30, shotgun: 8, pistol: 12 };
  private maxClip = { rifle: 30, shotgun: 8, pistol: 12 };
  private reserveAmmo = { rifle: 150, shotgun: 40, pistol: 999 };
  private fireTimer = 0;
  private isReloading = false;
  private reloadTimer = 0;

  // Game entities
  private zombies: Zombie[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private supplyDrops: SupplyDrop[] = [];
  private barricades: THREE.Box3[] = [];

  // Wave management
  private zombiesToSpawn = 10;
  private zombiesSpawned = 0;
  private spawnTimer = 0;
  private waveCompleted = false;
  private waveBreakTimer = 3;

  // Input states
  private keys: Record<string, boolean> = {};
  private mouseAim = { x: 0, y: 0 };
  private touchMove = { x: 0, y: 0, active: false };
  private touchAim = { x: 0, y: 0, active: false };
  private isFiring = false;
  private isSprinting = false;
  private isAiming = false;

  // Visual effects
  private screenFlash = 0;
  private bloodSplatterLevel = 0;
  private isDestroyed = false;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
  }

  public init3D(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Scene setup with dark foggy post-apocalyptic atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.FogExp2(0x05070d, 0.035);

    // 2. Camera setup
    const aspect = (canvas.clientWidth || 800) / (canvas.clientHeight || 450);
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 150);
    this.camera.position.set(0, 7, 9);
    this.camera.lookAt(0, 1, 0);

    // 3. WebGL Renderer
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 450, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch {
      // Fallback
    }

    // 4. Lights
    const ambient = new THREE.AmbientLight(0x1a2638, 0.7);
    this.scene.add(ambient);

    const moonLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    moonLight.position.set(25, 45, 20);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    this.scene.add(moonLight);

    // 5. Build Map & Environment
    this.buildMap();

    // 6. Build Player Model
    this.buildPlayer();

    // Notify initial stats
    this.callbacks.onHealthUpdate?.(this.health, this.maxHealth);
    this.callbacks.onWaveUpdate?.(this.wave);
    this.callbacks.onScoreUpdate(this.score);
  }

  private buildMap() {
    // Ground: cracked dark asphalt
    const groundGeo = new THREE.PlaneGeometry(100, 100, 20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.85,
      metalness: 0.15
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Boundary walls & Warehouses
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const containerMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.4 });
    const containerMat2 = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.4 });
    const containerMat3 = new THREE.MeshStandardMaterial({ color: 0x991b1b, metalness: 0.6, roughness: 0.4 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

    // Shipping Containers
    const containerPositions = [
      { x: -14, z: -10, rot: 0.3, mat: containerMat1 },
      { x: 16, z: -12, rot: -0.2, mat: containerMat2 },
      { x: -15, z: 12, rot: 1.5, mat: containerMat3 },
      { x: 12, z: 14, rot: 0.8, mat: containerMat1 },
      { x: 0, z: -20, rot: 0, mat: containerMat2 },
      { x: -22, z: 0, rot: Math.PI / 2, mat: containerMat3 },
      { x: 22, z: 2, rot: Math.PI / 2, mat: containerMat1 }
    ];

    containerPositions.forEach((pos) => {
      const contGeo = new THREE.BoxGeometry(3.5, 3.2, 8);
      const cont = new THREE.Mesh(contGeo, pos.mat);
      cont.position.set(pos.x, 1.6, pos.z);
      cont.rotation.y = pos.rot;
      cont.castShadow = true;
      cont.receiveShadow = true;
      this.scene.add(cont);

      const box = new THREE.Box3().setFromObject(cont);
      this.barricades.push(box);
    });

    // Wooden Crates & Barricades
    const cratePositions = [
      { x: -5, z: -6 }, { x: -6.5, z: -6 }, { x: -5.7, z: -4.5 },
      { x: 7, z: -4 }, { x: 8.5, z: -4 },
      { x: -8, z: 6 }, { x: 6, z: 8 }, { x: 0, z: 10 }
    ];

    cratePositions.forEach((pos) => {
      const crateGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(pos.x, 0.7, pos.z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      this.scene.add(crate);

      const box = new THREE.Box3().setFromObject(crate);
      this.barricades.push(box);
    });

    // Flickering Street Lamps with Point Lights
    const lampPositions = [
      { x: -10, z: -10 }, { x: 10, z: -10 },
      { x: -10, z: 10 }, { x: 10, z: 10 }
    ];

    lampPositions.forEach((pos) => {
      const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(pos.x, 3, pos.z);
      pole.castShadow = true;
      this.scene.add(pole);

      const lightHeadGeo = new THREE.ConeGeometry(0.5, 0.4, 8);
      const lightHead = new THREE.Mesh(lightHeadGeo, poleMat);
      lightHead.position.set(pos.x, 6, pos.z);
      this.scene.add(lightHead);

      const lampLight = new THREE.PointLight(0xffedd5, 1.2, 16, 2);
      lampLight.position.set(pos.x, 5.8, pos.z);
      lampLight.castShadow = true;
      this.scene.add(lampLight);
    });
  }

  private buildPlayer() {
    this.playerGroup = new THREE.Group();

    // Body (tactical armor survivor)
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    this.playerGroup.add(body);

    // Tactical Vest
    const vestGeo = new THREE.BoxGeometry(0.75, 0.6, 0.45);
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.y = 1.0;
    this.playerGroup.add(vest);

    // Head with helmet/visor
    const headGeo = new THREE.SphereGeometry(0.28, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.65;
    head.castShadow = true;
    this.playerGroup.add(head);

    // Visor glowing cyan
    const visorGeo = new THREE.BoxGeometry(0.35, 0.12, 0.2);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.65, 0.2);
    this.playerGroup.add(visor);

    // Gun model (Assault Rifle)
    const gunGroup = new THREE.Group();
    const gunBodyGeo = new THREE.BoxGeometry(0.12, 0.18, 0.85);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.3 });
    const gunBody = new THREE.Mesh(gunBodyGeo, gunMat);
    gunBody.position.set(0.35, 1.1, 0.45);
    gunGroup.add(gunBody);

    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
    const barrel = new THREE.Mesh(barrelGeo, gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.35, 1.14, 0.9);
    gunGroup.add(barrel);

    // Laser Sight (glowing red line)
    const laserGeo = new THREE.CylinderGeometry(0.01, 0.01, 20);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.5 });
    const laser = new THREE.Mesh(laserGeo, laserMat);
    laser.rotation.x = Math.PI / 2;
    laser.position.set(0.35, 1.14, 10.9);
    gunGroup.add(laser);

    this.playerGroup.add(gunGroup);

    // Flashlight mounted on player
    this.flashlight = new THREE.SpotLight(0xffffff, 2.5, 30, Math.PI / 6, 0.4, 1.2);
    this.flashlight.position.set(0.35, 1.2, 0.5);
    this.flashlight.target.position.set(0.35, 1.0, 10);
    this.flashlight.castShadow = true;
    this.playerGroup.add(this.flashlight);
    this.playerGroup.add(this.flashlight.target);

    // Muzzle Flash light (triggered on shot)
    this.muzzleLight = new THREE.PointLight(0xfef08a, 0, 8);
    this.muzzleLight.position.set(0.35, 1.14, 1.2);
    this.playerGroup.add(this.muzzleLight);

    this.playerGroup.position.copy(this.playerPos);
    this.scene.add(this.playerGroup);
  }

  private spawnZombie(type: 'walker' | 'runner' | 'brute' = 'walker') {
    const zombieGroup = new THREE.Group();

    // Size based on type
    const scale = type === 'brute' ? 1.6 : type === 'runner' ? 0.9 : 1.1;
    const skinColor = type === 'brute' ? 0x450a0a : type === 'runner' ? 0x14532d : 0x1e3a29;

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.65 * scale, 0.9 * scale, 0.35 * scale);
    const bodyMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.9 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9 * scale;
    body.castShadow = true;
    zombieGroup.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.26 * scale, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55 * scale;
    head.castShadow = true;
    zombieGroup.add(head);

    // Glowing Red Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05 * scale, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1 * scale, 1.58 * scale, 0.22 * scale);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1 * scale, 1.58 * scale, 0.22 * scale);
    zombieGroup.add(leftEye);
    zombieGroup.add(rightEye);

    // Arms reaching out
    const armGeo = new THREE.BoxGeometry(0.18 * scale, 0.18 * scale, 0.7 * scale);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.4 * scale, 1.1 * scale, 0.35 * scale);
    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.4 * scale, 1.1 * scale, 0.35 * scale);
    zombieGroup.add(leftArm);
    zombieGroup.add(rightArm);

    // Random Spawn position outside visible radius
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 15;
    const spawnX = this.playerPos.x + Math.cos(angle) * distance;
    const spawnZ = this.playerPos.z + Math.sin(angle) * distance;

    zombieGroup.position.set(spawnX, 0, spawnZ);
    this.scene.add(zombieGroup);

    const maxHp = type === 'brute' ? 300 : type === 'runner' ? 40 : 80;
    const speed = type === 'brute' ? 1.8 : type === 'runner' ? 5.2 : 2.6;
    const damage = type === 'brute' ? 35 : type === 'runner' ? 10 : 18;

    this.zombies.push({
      mesh: zombieGroup,
      type,
      health: maxHp,
      maxHealth: maxHp,
      speed,
      damage,
      attackCooldown: 0,
      isDead: false,
      deathTimer: 0,
      walkCycle: Math.random() * Math.PI * 2
    });

    if (Math.random() < 0.3) {
      soundManager.playZombieGroan();
    }
  }

  private fire() {
    if (this.isReloading) return;
    if (this.ammo[this.currentWeapon] <= 0) {
      this.reload();
      return;
    }

    const fireRate = this.currentWeapon === 'rifle' ? 0.12 : this.currentWeapon === 'shotgun' ? 0.65 : 0.25;
    if (this.fireTimer > 0) return;

    this.fireTimer = fireRate;
    this.ammo[this.currentWeapon]--;

    // Play gunshot audio
    soundManager.playGunshot(this.currentWeapon);

    // Flash Muzzle Light
    this.muzzleLight.intensity = 4.0;
    setTimeout(() => {
      if (!this.isDestroyed) this.muzzleLight.intensity = 0;
    }, 45);

    // Spawn bullets
    const bulletCount = this.currentWeapon === 'shotgun' ? 6 : 1;
    const damage = this.currentWeapon === 'rifle' ? 35 : this.currentWeapon === 'shotgun' ? 22 : 45;

    for (let i = 0; i < bulletCount; i++) {
      const bulletGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const bulletMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);

      // Position at gun tip
      const origin = new THREE.Vector3(0.35, 1.14, 1.0);
      origin.applyEuler(new THREE.Euler(0, this.playerRotY, 0));
      origin.add(this.playerPos);
      bulletMesh.position.copy(origin);

      // Spread direction
      const spread = this.currentWeapon === 'shotgun' ? 0.12 : 0.02;
      const angle = this.playerRotY + (Math.random() - 0.5) * spread;
      const velocity = new THREE.Vector3(Math.sin(angle), (Math.random() - 0.5) * 0.03, Math.cos(angle)).normalize().multiplyScalar(48);

      this.scene.add(bulletMesh);
      this.bullets.push({
        mesh: bulletMesh,
        velocity,
        life: 0.8,
        damage
      });
    }

    // Gun Recoil effect
    this.playerPos.x -= Math.sin(this.playerRotY) * 0.06;
    this.playerPos.z -= Math.cos(this.playerRotY) * 0.06;
  }

  private reload() {
    if (this.isReloading) return;
    if (this.ammo[this.currentWeapon] >= this.maxClip[this.currentWeapon]) return;
    if (this.reserveAmmo[this.currentWeapon] <= 0) return;

    this.isReloading = true;
    this.reloadTimer = 1.4;
    soundManager.playClick();
  }

  private switchWeapon(weapon: 'rifle' | 'shotgun' | 'pistol') {
    if (this.currentWeapon === weapon) return;
    this.currentWeapon = weapon;
    this.isReloading = false;
    soundManager.playClick();
  }

  public update(dt: number) {
    if (this.isDestroyed) return;

    // Combo timer cooldown
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Weapon Cooldowns & Reload
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const needed = this.maxClip[this.currentWeapon] - this.ammo[this.currentWeapon];
        const available = Math.min(needed, this.reserveAmmo[this.currentWeapon]);
        this.ammo[this.currentWeapon] += available;
        if (this.currentWeapon !== 'pistol') {
          this.reserveAmmo[this.currentWeapon] -= available;
        }
        soundManager.playHit();
      }
    }

    // 1. Player Movement Physics
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x += 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x -= 1;

    // Virtual Touch Joystick input
    if (this.touchMove.active) {
      moveDir.x = -this.touchMove.x;
      moveDir.z = -this.touchMove.y;
    }

    // Sprint & Stamina
    const isSprinting = (this.keys['ShiftLeft'] || this.isSprinting) && this.stamina > 10 && moveDir.lengthSq() > 0;
    if (isSprinting) {
      this.stamina = Math.max(0, this.stamina - 25 * dt);
    } else {
      this.stamina = Math.min(100, this.stamina + 15 * dt);
    }

    const currentSpeed = (isSprinting ? 7.5 : 4.5);
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.playerVelocity.x = moveDir.x * currentSpeed;
      this.playerVelocity.z = moveDir.z * currentSpeed;
    } else {
      this.playerVelocity.multiplyScalar(0.8);
    }

    // Apply movement & collision with barricades
    const nextPos = this.playerPos.clone().addScaledVector(this.playerVelocity, dt);
    nextPos.x = Math.max(-35, Math.min(35, nextPos.x));
    nextPos.z = Math.max(-35, Math.min(35, nextPos.z));

    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - 0.4, 0, nextPos.z - 0.4),
      new THREE.Vector3(nextPos.x + 0.4, 2, nextPos.z + 0.4)
    );

    let collided = false;
    for (const b of this.barricades) {
      if (b.intersectsBox(playerBox)) {
        collided = true;
        break;
      }
    }

    if (!collided) {
      this.playerPos.copy(nextPos);
    }

    // 2. Player Aim & Rotation
    if (this.touchAim.active) {
      this.playerRotY = Math.atan2(this.touchAim.x, this.touchAim.y);
    } else if (this.mouseAim.x !== 0 || this.mouseAim.y !== 0) {
      // Calculate angle to mouse pointer in world space
      this.playerRotY = Math.atan2(this.mouseAim.x, this.mouseAim.y);
    } else if (moveDir.lengthSq() > 0) {
      this.playerRotY = Math.atan2(moveDir.x, moveDir.z);
    }

    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y = this.playerRotY;

    // Camera follow player smoothly
    const targetCamPos = new THREE.Vector3(
      this.playerPos.x - Math.sin(this.playerRotY) * 4.5,
      this.playerPos.y + 6.5,
      this.playerPos.z - Math.cos(this.playerRotY) * 4.5
    );
    this.camera.position.lerp(targetCamPos, 0.12);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z);

    // Auto fire when firing button or left click held
    if (this.isFiring || this.keys['Space']) {
      this.fire();
    }

    // 3. Update Bullets & Hit Detection
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.mesh.position.addScaledVector(b.velocity, dt);
      b.life -= dt;

      // Zombie Hit Check
      let hit = false;
      for (const z of this.zombies) {
        if (z.isDead) continue;
        const dist = z.mesh.position.distanceTo(b.mesh.position);
        if (dist < 1.2) {
          hit = true;
          // Headshot check (if bullet is high)
          const isHeadshot = b.mesh.position.y > 1.4;
          const dmg = isHeadshot ? b.damage * 2.2 : b.damage;
          z.health -= dmg;

          // Blood particles
          this.createBloodSplatter(b.mesh.position, isHeadshot ? 12 : 6, isHeadshot);

          if (z.health <= 0) {
            z.isDead = true;
            this.kills++;
            this.combo++;
            this.comboTimer = 3.5;
            const points = (z.type === 'brute' ? 250 : z.type === 'runner' ? 120 : 70) * Math.max(1, this.combo);
            this.score += points;
            this.callbacks.onScoreUpdate(this.score);
            soundManager.playExplosion();

            // Chance of supply drop
            if (Math.random() < 0.25) {
              this.spawnSupplyDrop(z.mesh.position);
            }
          } else {
            soundManager.playHit();
          }
          break;
        }
      }

      if (hit || b.life <= 0) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }

    // 4. Update Zombies AI
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];

      if (z.isDead) {
        z.deathTimer += dt;
        // Ragdoll fall animation
        z.mesh.rotation.x = Math.min(Math.PI / 2, z.mesh.rotation.x + 5 * dt);
        z.mesh.position.y = Math.max(0.2, z.mesh.position.y - 0.8 * dt);
        if (z.deathTimer > 3.0) {
          this.scene.remove(z.mesh);
          this.zombies.splice(i, 1);
        }
        continue;
      }

      // Move toward player
      const toPlayer = this.playerPos.clone().sub(z.mesh.position);
      const dist = toPlayer.length();

      if (dist > 0.8) {
        toPlayer.normalize();
        z.mesh.position.addScaledVector(toPlayer, z.speed * dt);
        z.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

        // Shambling leg animation
        z.walkCycle += dt * z.speed * 3;
        z.mesh.rotation.z = Math.sin(z.walkCycle) * 0.1;
      } else {
        // Attack player!
        z.attackCooldown -= dt;
        if (z.attackCooldown <= 0) {
          z.attackCooldown = 1.0;
          this.health -= z.damage;
          this.screenFlash = 0.5;
          soundManager.playHit();
          this.callbacks.onHealthUpdate?.(Math.max(0, this.health), this.maxHealth);

          if (this.health <= 0) {
            this.callbacks.onGameOver(this.score);
          }
        }
      }
    }

    // 5. Update Supply Drops
    for (let i = this.supplyDrops.length - 1; i >= 0; i--) {
      const drop = this.supplyDrops[i];
      drop.mesh.rotation.y += 1.5 * dt;

      if (drop.mesh.position.distanceTo(this.playerPos) < 1.8) {
        if (drop.type === 'ammo') {
          this.reserveAmmo.rifle += 60;
          this.reserveAmmo.shotgun += 16;
          this.score += 50;
        } else if (drop.type === 'health') {
          this.health = Math.min(this.maxHealth, this.health + 40);
          this.callbacks.onHealthUpdate?.(this.health, this.maxHealth);
        }
        soundManager.playCoin();
        this.scene.remove(drop.mesh);
        this.supplyDrops.splice(i, 1);
      }
    }

    // 6. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 9.8 * dt; // gravity
      p.life -= dt;
      const scale = Math.max(0.01, p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life <= 0 || p.mesh.position.y < 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // 7. Wave Spawner System
    if (this.zombiesSpawned < this.zombiesToSpawn) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(0.6, 2.2 - this.wave * 0.15);
        const rand = Math.random();
        const type = this.wave >= 3 && rand < 0.15 ? 'brute' : rand < 0.4 ? 'runner' : 'walker';
        this.spawnZombie(type);
        this.zombiesSpawned++;
      }
    } else if (this.zombies.length === 0 && !this.waveCompleted) {
      // Wave cleared!
      this.waveCompleted = true;
      this.waveBreakTimer = 4.0;
      this.score += this.wave * 500;
      this.callbacks.onScoreUpdate(this.score);
      soundManager.playLevelUp();
    }

    if (this.waveCompleted) {
      this.waveBreakTimer -= dt;
      if (this.waveBreakTimer <= 0) {
        this.wave++;
        this.waveCompleted = false;
        this.zombiesSpawned = 0;
        this.zombiesToSpawn = 10 + this.wave * 5;
        this.callbacks.onWaveUpdate?.(this.wave);
      }
    }

    // Render 3D Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private createBloodSplatter(pos: THREE.Vector3, count: number, isHeadshot: boolean) {
    for (let i = 0; i < count; i++) {
      const size = isHeadshot ? 0.12 : 0.08;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({ color: isHeadshot ? 0xdc2626 : 0x991b1b });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 6
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        color: new THREE.Color(0xdc2626)
      });
    }
  }

  private spawnSupplyDrop(pos: THREE.Vector3) {
    const dropGroup = new THREE.Group();
    const type: 'ammo' | 'health' = Math.random() < 0.6 ? 'ammo' : 'health';

    const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const boxMat = new THREE.MeshStandardMaterial({
      color: type === 'ammo' ? 0x38bdf8 : 0x22c55e,
      roughness: 0.3
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.4;
    dropGroup.add(box);

    // Glowing beacon
    const beaconLight = new THREE.PointLight(type === 'ammo' ? 0x38bdf8 : 0x22c55e, 2, 6);
    beaconLight.position.y = 1.0;
    dropGroup.add(beaconLight);

    dropGroup.position.set(pos.x, 0, pos.z);
    this.scene.add(dropGroup);
    this.supplyDrops.push({ mesh: dropGroup, type, position: dropGroup.position });
  }

  public handlePointerDown(x: number, y: number) {
    this.isFiring = true;
    this.updateAimFromPointer(x, y);
  }

  public handlePointerMove(x: number, y: number) {
    this.updateAimFromPointer(x, y);
  }

  public handlePointerUp() {
    this.isFiring = false;
  }

  private updateAimFromPointer(x: number, y: number) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    this.mouseAim.x = x - centerX;
    this.mouseAim.y = y - centerY;
  }

  public handleKeyDown(code: string) {
    this.keys[code] = true;
    if (code === 'KeyR') this.reload();
    if (code === 'Digit1') this.switchWeapon('rifle');
    if (code === 'Digit2') this.switchWeapon('shotgun');
    if (code === 'Digit3') this.switchWeapon('pistol');
    if (code === 'Space') this.isFiring = true;
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
    if (code === 'Space') this.isFiring = false;
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'FIRE') this.isFiring = true;
    if (action === 'RELOAD') this.reload();
    if (action === 'SWITCH_GUN') {
      const list: Array<'rifle' | 'shotgun' | 'pistol'> = ['rifle', 'shotgun', 'pistol'];
      const nextIdx = (list.indexOf(this.currentWeapon) + 1) % list.length;
      this.switchWeapon(list[nextIdx]);
    }
    if (action === 'SPRINT') this.isSprinting = true;
    if (action === 'JOYSTICK_MOVE') this.touchMove.active = true;
  }

  public handleVirtualActionUp(action: string) {
    if (action === 'FIRE') this.isFiring = false;
    if (action === 'SPRINT') this.isSprinting = false;
    if (action === 'JOYSTICK_MOVE') this.touchMove.active = false;
  }

  public getCustomControls() {
    return {
      type: 'fps-dual',
      buttons: [
        { id: 'FIRE', label: '🔥 FIRE', color: 'bg-rose-500 hover:bg-rose-400' },
        { id: 'RELOAD', label: `🔄 RELOAD (${this.ammo[this.currentWeapon]}/${this.reserveAmmo[this.currentWeapon]})`, color: 'bg-slate-700' },
        { id: 'SWITCH_GUN', label: `🔫 ${this.currentWeapon.toUpperCase()}`, color: 'bg-cyan-600' },
        { id: 'SPRINT', label: '⚡ SPRINT', color: 'bg-amber-500' }
      ]
    };
  }

  public restart() {
    this.health = 100;
    this.score = 0;
    this.wave = 1;
    this.kills = 0;
    this.combo = 0;
    this.ammo = { rifle: 30, shotgun: 8, pistol: 12 };
    this.reserveAmmo = { rifle: 150, shotgun: 40, pistol: 999 };
    this.zombies.forEach((z) => this.scene.remove(z.mesh));
    this.zombies = [];
    this.bullets.forEach((b) => this.scene.remove(b.mesh));
    this.bullets = [];
    this.supplyDrops.forEach((d) => this.scene.remove(d.mesh));
    this.supplyDrops = [];
    this.playerPos.set(0, 1, 0);
    this.callbacks.onHealthUpdate?.(this.health, this.maxHealth);
    this.callbacks.onWaveUpdate?.(this.wave);
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

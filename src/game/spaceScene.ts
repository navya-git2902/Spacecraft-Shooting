import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ARENA_HALF_SIZE } from './catalog';
import {
  buildAsteroidMesh,
  buildPowerUpMesh,
  buildSpacecraftMesh,
  ShipMeshRig,
} from './models';
import {
  AsteroidObstacle,
  MatchSnapshot,
  PowerUpEntity,
  ProjectileState,
  ShipState,
} from './types';

export interface ProjectedShipLabel {
  id: string;
  name: string;
  team: 'A' | 'B';
  isHuman: boolean;
  isBoss: boolean;
  hp: number;
  maxHp: number;
  shield: number;
  screenX: number;
  screenY: number;
  visible: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

export class SpaceArenaRenderer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private isSoftwareGl: boolean;
  private frustumSize = 36;

  private shipRigs = new Map<string, ShipMeshRig>();
  private shipMeta = new Map<string, string>();
  private projectileMeshes = new Map<string, THREE.Mesh>();
  private powerUpMeshes = new Map<string, THREE.Group>();
  private asteroidMeshes = new Map<string, THREE.Group>();

  // Pooled particle system via InstancedMesh
  private particleCount = 320;
  private particles: Particle[] = [];
  private particleMesh: THREE.InstancedMesh;
  private starMesh!: THREE.InstancedMesh;

  // Cozy background celestial props
  private celestialGroup = new THREE.Group();
  private planetRing!: THREE.Mesh;
  private spaceStation!: THREE.Group;

  // Camera tracking & juice
  private camTargetX = 0;
  private camTargetZ = 0;
  private shakeIntensity = 0;
  private showcaseAngle = 0;

  // Shared projectile geometries/materials
  private boltGeo = new THREE.CapsuleGeometry(0.14, 0.72, 4, 8);
  private missileGeo = new THREE.ConeGeometry(0.24, 0.95, 8);
  private orbGeo = new THREE.SphereGeometry(0.32, 10, 10);
  private projectileMatCache = new Map<string, THREE.MeshBasicMaterial>();

  private raycaster = new THREE.Raycaster();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
  private mouseNdc = new THREE.Vector2();

  private frameId = 0;
  private disposed = false;
  private onContextLostCb?: () => void;

  constructor(container: HTMLElement, onContextLost?: () => void) {
    this.container = container;
    this.onContextLostCb = onContextLost;

    // Software WebGL guard (SwiftShader, llvmpipe, WARP)
    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.onContextLostCb?.();
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0d1d);
    this.scene.fog = new THREE.FogExp2(0x0b0d1d, 0.0042);

    // Mandatory studio environment map for metallic & glass PBR reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const aspect = w / Math.max(1, h);
    this.camera = new THREE.OrthographicCamera(
      (-this.frustumSize * aspect) / 2,
      (this.frustumSize * aspect) / 2,
      this.frustumSize / 2,
      -this.frustumSize / 2,
      0.1,
      260,
    );
    this.camera.position.set(32, 38, 32);
    this.camera.lookAt(0, 0, 0);

    // Orient shared projectile geometries along +Z
    this.boltGeo.rotateX(Math.PI / 2);
    this.missileGeo.rotateX(Math.PI / 2);

    this.setupLighting();
    this.setupSpaceEnvironment();

    // Initialize pooled particle InstancedMesh
    const pGeo = new THREE.OctahedronGeometry(0.32, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, this.particleCount);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 0.001,
        color: new THREE.Color(0xffffff),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.particleMesh);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
  }

  private setupLighting(): void {
    // Cool cosmic sky / warm nebula bounce hemisphere fill
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x3b1d5e, 1.05);
    this.scene.add(hemi);

    // Warm key directional light
    const key = new THREE.DirectionalLight(0xfff1e6, 2.2);
    key.position.set(24, 42, 18);
    if (!this.isSoftwareGl) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      const d = 42;
      key.shadow.camera.left = -d;
      key.shadow.camera.right = d;
      key.shadow.camera.top = d;
      key.shadow.camera.bottom = -d;
      key.shadow.camera.near = 5;
      key.shadow.camera.far = 110;
      key.shadow.bias = -0.0005;
      key.shadow.normalBias = 0.02;
    }
    this.scene.add(key);

    // Cozy rose-violet rim light from opposite corner
    const rim = new THREE.DirectionalLight(0xf472b6, 1.15);
    rim.position.set(-28, 18, -26);
    this.scene.add(rim);
  }

  private setupSpaceEnvironment(): void {
    // 1. Procedural Orbital Sector Grid Floor (SRGBColorSpace + max anisotropy + polygonOffset)
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0d1024';
    ctx.fillRect(0, 0, size, size);

    // Soft radial nebula glow in center
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      40,
      size / 2,
      size / 2,
      size * 0.52,
    );
    grad.addColorStop(0, 'rgba(79, 70, 229, 0.22)');
    grad.addColorStop(0.5, 'rgba(192, 38, 211, 0.09)');
    grad.addColorStop(1, 'rgba(11, 13, 29, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle crisp isometric grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 2;
    const step = size / 16;
    for (let i = 0; i <= 16; i++) {
      const p = i * step;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Center tactical ring
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.colorSpace = THREE.SRGBColorSpace;
    floorTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const floorGeo = new THREE.PlaneGeometry(
      ARENA_HALF_SIZE * 2.25,
      ARENA_HALF_SIZE * 2.25,
    );
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.78,
      metalness: 0.22,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.05;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // 2. Arena Perimeter Beacon Buoys (natural space boundary markers)
    const buoyGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.4, 8);
    const buoyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.2,
      roughness: 0.3,
      metalness: 0.6,
    });
    const corners = [
      [-ARENA_HALF_SIZE, -ARENA_HALF_SIZE],
      [ARENA_HALF_SIZE, -ARENA_HALF_SIZE],
      [ARENA_HALF_SIZE, ARENA_HALF_SIZE],
      [-ARENA_HALF_SIZE, ARENA_HALF_SIZE],
      [0, -ARENA_HALF_SIZE],
      [0, ARENA_HALF_SIZE],
      [-ARENA_HALF_SIZE, 0],
      [ARENA_HALF_SIZE, 0],
    ];
    for (const [bx, bz] of corners) {
      const buoy = new THREE.Mesh(buoyGeo, buoyMat);
      buoy.position.set(bx, 0.6, bz);
      this.scene.add(buoy);
    }

    // Perimeter glowing rail lines
    const linePts = [
      new THREE.Vector3(-ARENA_HALF_SIZE, 0.05, -ARENA_HALF_SIZE),
      new THREE.Vector3(ARENA_HALF_SIZE, 0.05, -ARENA_HALF_SIZE),
      new THREE.Vector3(ARENA_HALF_SIZE, 0.05, ARENA_HALF_SIZE),
      new THREE.Vector3(-ARENA_HALF_SIZE, 0.05, ARENA_HALF_SIZE),
      new THREE.Vector3(-ARENA_HALF_SIZE, 0.05, -ARENA_HALF_SIZE),
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.55,
    });
    this.scene.add(new THREE.Line(borderGeo, borderMat));

    // 3. Instanced Starfield (700 twinkling stars below & around arena)
    const starCount = 700;
    const starGeo = new THREE.OctahedronGeometry(0.22, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.starMesh = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const starPalette = [
      new THREE.Color(0xbae6fd),
      new THREE.Color(0xfbcfe8),
      new THREE.Color(0xddd6fe),
      new THREE.Color(0xfef08a),
    ];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 190,
        -6 - Math.random() * 40,
        (Math.random() - 0.5) * 190,
      );
      const s = 0.45 + Math.random() * 1.4;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      this.starMesh.setMatrixAt(i, dummy.matrix);
      this.starMesh.setColorAt(
        i,
        starPalette[i % starPalette.length],
      );
    }
    this.starMesh.instanceMatrix.needsUpdate = true;
    if (this.starMesh.instanceColor) {
      this.starMesh.instanceColor.needsUpdate = true;
    }
    this.starMesh.computeBoundingSphere();
    this.scene.add(this.starMesh);

    // 4. Floating Cozy Planets, Moon & Space Station beyond the arena
    this.scene.add(this.celestialGroup);

    // Pastel Violet Ringed Planet
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(8.5, 28, 24),
      new THREE.MeshStandardMaterial({
        color: 0x7c3aed,
        emissive: 0x2e1065,
        emissiveIntensity: 0.45,
        roughness: 0.65,
        metalness: 0.15,
      }),
    );
    planet.position.set(-48, -12, -46);
    this.celestialGroup.add(planet);

    const pRingGeo = new THREE.RingGeometry(11.5, 16.5, 48);
    pRingGeo.rotateX(Math.PI / 2.6);
    const pRingMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    });
    this.planetRing = new THREE.Mesh(pRingGeo, pRingMat);
    this.planetRing.position.copy(planet.position);
    this.celestialGroup.add(this.planetRing);

    // Cozy Cyan-Rose Moon
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 22, 18),
      new THREE.MeshStandardMaterial({
        color: 0xf9a8d4,
        emissive: 0x831843,
        emissiveIntensity: 0.25,
        roughness: 0.8,
        metalness: 0.1,
      }),
    );
    moon.position.set(50, -9, -38);
    this.celestialGroup.add(moon);

    // Mini Orbital Space Station in background
    this.spaceStation = new THREE.Group();
    this.spaceStation.position.set(-44, -6, 36);
    const stCore = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 5.2, 12),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.3,
        metalness: 0.85,
      }),
    );
    this.spaceStation.add(stCore);
    const stRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.42, 10, 28),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65,
        roughness: 0.25,
        metalness: 0.7,
      }),
    );
    stRing.rotation.x = Math.PI / 2;
    this.spaceStation.add(stRing);
    this.celestialGroup.add(this.spaceStation);
  }

  public syncAsteroids(asteroids: AsteroidObstacle[]): void {
    const activeIds = new Set(asteroids.map((a) => a.id));
    for (const [id, mesh] of this.asteroidMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.asteroidMeshes.delete(id);
      }
    }
    for (const ast of asteroids) {
      if (!this.asteroidMeshes.has(ast.id)) {
        const mesh = buildAsteroidMesh(ast.radius, ast.variant);
        mesh.position.set(ast.x, 0, ast.z);
        this.scene.add(mesh);
        this.asteroidMeshes.set(ast.id, mesh);
      }
    }
  }

  public spawnExplosion(x: number, z: number, colorHex: string, count = 24, speed = 11): void {
    const col = new THREE.Color(colorHex);
    let spawned = 0;
    for (let i = 0; i < this.particleCount && spawned < count; i++) {
      const p = this.particles[i];
      if (p.life <= 0) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (0.35 + Math.random() * 0.85) * speed;
        p.x = x;
        p.y = 0.65;
        p.z = z;
        p.vx = Math.cos(ang) * spd;
        p.vy = 1.5 + Math.random() * 5.0;
        p.vz = Math.sin(ang) * spd;
        p.maxLife = 0.35 + Math.random() * 0.45;
        p.life = p.maxLife;
        p.size = 0.35 + Math.random() * 0.65;
        p.color.copy(col);
        spawned++;
      }
    }
  }

  public addCameraShake(amount: number): void {
    this.shakeIntensity = Math.min(1.4, this.shakeIntensity + amount);
  }

  public getAimWorldPoint(clientX: number, clientY: number): { x: number; z: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.floorPlane, hit)) {
      return { x: hit.x, z: hit.z };
    }
    return null;
  }

  public syncSnapshot(
    snapshot: MatchSnapshot,
    dt: number,
    focusShipId?: string,
    isMenuShowcase = false,
  ): ProjectedShipLabel[] {
    // Update ships
    const activeShipIds = new Set<string>();
    let focusX = 0;
    let focusZ = 0;
    let foundFocus = false;

    for (const s of snapshot.ships) {
      activeShipIds.add(s.id);
      const sig = `${s.shipId}-${s.skinId}-${s.team}-${Boolean(s.isBoss)}`;
      let rig = this.shipRigs.get(s.id);
      if (!rig || this.shipMeta.get(s.id) !== sig) {
        if (rig) this.scene.remove(rig.root);
        rig = buildSpacecraftMesh(s.shipId, s.skinId, s.team, Boolean(s.isBoss));
        this.scene.add(rig.root);
        this.shipRigs.set(s.id, rig);
        this.shipMeta.set(s.id, sig);
      }

      rig.root.visible = s.alive;
      if (s.alive) {
        // Smooth visual interpolation
        rig.root.position.x = THREE.MathUtils.damp(rig.root.position.x, s.x, 18, dt);
        rig.root.position.z = THREE.MathUtils.damp(rig.root.position.z, s.z, 18, dt);
        rig.bodyGroup.rotation.y = s.angle;

        // Subtle banking roll during movement
        const speedMag = Math.hypot(s.vx, s.vz);
        rig.bodyGroup.position.y =
          0.55 + Math.sin(snapshot.elapsedTime * 3.5 + s.x * 0.2) * 0.08;
        const flameScale = 0.7 + Math.min(1.1, speedMag * 0.06);
        for (const flame of rig.thrusters) {
          flame.scale.set(1, 1, flameScale);
        }

        // Shield visibility
        rig.shieldMesh.visible = s.shield > 0;
        if (rig.shieldMesh.visible) {
          rig.shieldMesh.rotation.y += dt * 1.4;
        }

        // Boss orbital rings & telegraph
        for (let i = 0; i < rig.bossRings.length; i++) {
          rig.bossRings[i].rotation.z += dt * (i === 0 ? 1.1 : -1.4);
        }
        rig.telegraphRing.visible = s.telegraphTimer > 0;
        if (rig.telegraphRing.visible) {
          const pulse = 1 + Math.sin(snapshot.elapsedTime * 18) * 0.12;
          rig.telegraphRing.scale.setScalar(pulse);
        }

        // Hit flash
        const flashing = s.hitFlashTimer > 0;
        for (let i = 0; i < rig.hullMaterials.length; i++) {
          const mat = rig.hullMaterials[i];
          if (flashing) {
            mat.emissive.setHex(0xffffff);
            mat.emissiveIntensity = 0.85;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }

        if (s.id === focusShipId) {
          focusX = rig.root.position.x;
          focusZ = rig.root.position.z;
          foundFocus = true;
        }
      }
    }

    for (const [id, rig] of this.shipRigs) {
      if (!activeShipIds.has(id)) {
        this.scene.remove(rig.root);
        this.shipRigs.delete(id);
        this.shipMeta.delete(id);
      }
    }

    // Update projectiles
    this.syncProjectiles(snapshot.projectiles);

    // Update power-ups
    this.syncPowerUps(snapshot.powerUps, snapshot.elapsedTime);

    // Update camera
    if (isMenuShowcase) {
      this.showcaseAngle += dt * 0.16;
      const dist = 42;
      this.camera.position.set(
        Math.cos(this.showcaseAngle) * dist,
        36,
        Math.sin(this.showcaseAngle) * dist,
      );
      this.camera.lookAt(0, 0, 0);
    } else {
      if (!foundFocus && snapshot.ships.length > 0) {
        const alive = snapshot.ships.find((sh) => sh.alive);
        if (alive) {
          focusX = alive.x;
          focusZ = alive.z;
        }
      }
      this.camTargetX = THREE.MathUtils.damp(this.camTargetX, focusX * 0.58, 6.5, dt);
      this.camTargetZ = THREE.MathUtils.damp(this.camTargetZ, focusZ * 0.58, 6.5, dt);

      let shakeX = 0;
      let shakeZ = 0;
      if (this.shakeIntensity > 0.005) {
        shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        shakeZ = (Math.random() - 0.5) * this.shakeIntensity;
        this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 12, dt);
      } else {
        this.shakeIntensity = 0;
      }

      this.camera.position.set(
        this.camTargetX + 32 + shakeX,
        38,
        this.camTargetZ + 32 + shakeZ,
      );
      this.camera.lookAt(this.camTargetX + shakeX, 0, this.camTargetZ + shakeZ);
    }

    // Animate background celestial props & particles
    this.updateAmbientAndParticles(dt);

    // Project ship labels to screen coordinates
    return this.projectShipLabels(snapshot.ships);
  }

  public renderMenuIdle(dt: number): void {
    this.showcaseAngle += dt * 0.14;
    const dist = 42;
    this.camera.position.set(
      Math.cos(this.showcaseAngle) * dist,
      36,
      Math.sin(this.showcaseAngle) * dist,
    );
    this.camera.lookAt(0, 0, 0);
    this.updateAmbientAndParticles(dt);
    this.renderer.render(this.scene, this.camera);
  }

  public renderFrame(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private syncProjectiles(projectiles: ProjectileState[]): void {
    const activeIds = new Set<string>();
    for (const p of projectiles) {
      activeIds.add(p.id);
      let mesh = this.projectileMeshes.get(p.id);
      if (!mesh) {
        let mat = this.projectileMatCache.get(p.colorHex);
        if (!mat) {
          mat = new THREE.MeshBasicMaterial({ color: p.colorHex });
          this.projectileMatCache.set(p.colorHex, mat);
        }
        const geo =
          p.kind === 'missile'
            ? this.missileGeo
            : p.kind === 'boss_orb'
              ? this.orbGeo
              : this.boltGeo;
        mesh = new THREE.Mesh(geo, mat);
        this.scene.add(mesh);
        this.projectileMeshes.set(p.id, mesh);
      }
      mesh.position.set(p.x, 0.58, p.z);
      mesh.rotation.y = p.angle;
    }

    for (const [id, mesh] of this.projectileMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    }
  }

  private syncPowerUps(powerUps: PowerUpEntity[], elapsed: number): void {
    const activeIds = new Set<string>();
    for (const pu of powerUps) {
      activeIds.add(pu.id);
      let grp = this.powerUpMeshes.get(pu.id);
      if (!grp) {
        grp = buildPowerUpMesh(pu.type);
        grp.position.set(pu.x, 0, pu.z);
        this.scene.add(grp);
        this.powerUpMeshes.set(pu.id, grp);
      }
      grp.children[0].rotation.y = elapsed * 2.2;
      grp.children[0].position.y = 0.8 + Math.sin(elapsed * 3.2 + pu.x) * 0.16;
      grp.children[1].rotation.z = elapsed * 1.7;
    }

    for (const [id, grp] of this.powerUpMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(grp);
        this.powerUpMeshes.delete(id);
      }
    }
  }

  private updateAmbientAndParticles(dt: number): void {
    this.planetRing.rotation.z += dt * 0.08;
    this.spaceStation.rotation.y += dt * 0.25;

    let anyDirty = false;
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 6.5 * dt;
        const frac = Math.max(0, p.life / p.maxLife);
        _vec3.set(p.x, Math.max(0.1, p.y), p.z);
        _euler.set(p.life * 4, p.life * 3, 0);
        _quat.setFromEuler(_euler);
        _scale.setScalar(p.size * frac);
        _mat4.compose(_vec3, _quat, _scale);
        this.particleMesh.setMatrixAt(i, _mat4);
        this.particleMesh.setColorAt(i, p.color);
        anyDirty = true;
      } else if (p.size > 0) {
        p.size = 0;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        anyDirty = true;
      }
    }
    if (anyDirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private projectShipLabels(ships: ShipState[]): ProjectedShipLabel[] {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const labels: ProjectedShipLabel[] = [];

    for (const s of ships) {
      if (!s.alive) continue;
      _vec3.set(s.x, s.isBoss ? 3.2 : 2.1, s.z);
      _vec3.project(this.camera);
      const screenX = (_vec3.x * 0.5 + 0.5) * w;
      const screenY = (-_vec3.y * 0.5 + 0.5) * h;
      const visible =
        _vec3.z >= -1 &&
        _vec3.z <= 1 &&
        screenX > -80 &&
        screenX < w + 80 &&
        screenY > -60 &&
        screenY < h + 60;

      labels.push({
        id: s.id,
        name: s.name,
        team: s.team,
        isHuman: s.isHuman,
        isBoss: Boolean(s.isBoss),
        hp: Math.ceil(s.hp),
        maxHp: s.maxHp,
        shield: Math.ceil(s.shield),
        screenX,
        screenY,
        visible,
      });
    }
    return labels;
  }

  public scheduleLoop(callback: (dt: number) => void): void {
    let lastTime = performance.now();
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      callback(dt);

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    this.camera.left = (-this.frustumSize * aspect) / 2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

import * as THREE from 'three';
import { POWERUP_INFO, SHIPS, SKINS } from './catalog';
import { PowerUpType, ShipId, SkinId, TeamId } from './types';

export interface ShipMeshRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  thrusters: THREE.Mesh[];
  shieldMesh: THREE.Mesh;
  teamRing: THREE.Mesh;
  telegraphRing: THREE.Mesh;
  bossRings: THREE.Mesh[];
  hullMaterials: THREE.MeshStandardMaterial[];
  baseColors: THREE.Color[];
}

function createBeveledHullShape(shipId: ShipId): THREE.Shape {
  const s = new THREE.Shape();
  if (shipId === 'sparrow') {
    s.moveTo(0, 1.35);
    s.lineTo(0.48, 0.25);
    s.lineTo(0.42, -0.95);
    s.lineTo(0.18, -1.15);
    s.lineTo(-0.18, -1.15);
    s.lineTo(-0.42, -0.95);
    s.lineTo(-0.48, 0.25);
    s.closePath();
  } else if (shipId === 'aegis') {
    s.moveTo(0, 1.2);
    s.lineTo(0.75, 0.45);
    s.lineTo(0.68, -0.85);
    s.lineTo(0.32, -1.15);
    s.lineTo(-0.32, -1.15);
    s.lineTo(-0.68, -0.85);
    s.lineTo(-0.75, 0.45);
    s.closePath();
  } else if (shipId === 'dart') {
    s.moveTo(0, 1.55);
    s.lineTo(0.34, 0.1);
    s.lineTo(0.36, -1.05);
    s.lineTo(0, -0.85);
    s.lineTo(-0.36, -1.05);
    s.lineTo(-0.34, 0.1);
    s.closePath();
  } else {
    // bastion
    s.moveTo(0, 1.25);
    s.lineTo(0.62, 0.65);
    s.lineTo(0.72, -0.85);
    s.lineTo(0.45, -1.2);
    s.lineTo(-0.45, -1.2);
    s.lineTo(-0.72, -0.85);
    s.lineTo(-0.62, 0.65);
    s.closePath();
  }
  return s;
}

function createWingShape(shipId: ShipId): THREE.Shape {
  const w = new THREE.Shape();
  if (shipId === 'dart') {
    w.moveTo(0.25, 0.2);
    w.lineTo(1.55, -0.65);
    w.lineTo(1.35, -1.05);
    w.lineTo(0.28, -0.6);
    w.closePath();
  } else if (shipId === 'aegis') {
    w.moveTo(0.5, 0.35);
    w.lineTo(1.45, 0.05);
    w.lineTo(1.55, -0.75);
    w.lineTo(0.5, -0.85);
    w.closePath();
  } else if (shipId === 'bastion') {
    w.moveTo(0.55, 0.4);
    w.lineTo(1.6, -0.15);
    w.lineTo(1.45, -0.95);
    w.lineTo(0.55, -0.85);
    w.closePath();
  } else {
    w.moveTo(0.35, 0.25);
    w.lineTo(1.48, -0.45);
    w.lineTo(1.35, -0.92);
    w.lineTo(0.36, -0.72);
    w.closePath();
  }
  return w;
}

export function buildSpacecraftMesh(
  shipId: ShipId,
  skinId: SkinId,
  team: TeamId,
  isBoss = false,
): ShipMeshRig {
  const shipCfg = SHIPS[shipId];
  const skinCfg = SKINS[skinId];

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.55;
  root.add(bodyGroup);

  const hullColor = new THREE.Color(
    skinId === 'starlight' ? shipCfg.hullHex : skinCfg.hullHex,
  );
  const trimColor = new THREE.Color(
    skinId === 'starlight' ? shipCfg.trimHex : skinCfg.trimHex,
  );
  const glowColor = new THREE.Color(
    isBoss ? '#FB7185' : team === 'A' ? '#38BDF8' : '#F472B6',
  );

  // Primary hull material (metallic, crisp bevel specular)
  const hullMat = new THREE.MeshStandardMaterial({
    color: hullColor,
    roughness: 0.26,
    metalness: 0.72,
  });

  // Wing / armor plate material (varied roughness >= 0.25 delta for material contrast)
  const wingMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.58,
    metalness: 0.34,
  });

  // Dark mechanical nacelle metal
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e2240,
    roughness: 0.42,
    metalness: 0.88,
  });

  // Tinted optical cockpit canopy
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: team === 'A' ? 0x38bdf8 : 0xf472b6,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.85,
  });

  // Emissive thruster / accent material
  const glowMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.1,
  });

  const hullMaterials: THREE.MeshStandardMaterial[] = [hullMat, wingMat];
  const baseColors: THREE.Color[] = [hullColor.clone(), trimColor.clone()];

  const scale = isBoss ? 2.15 : 1.0;
  bodyGroup.scale.setScalar(scale);

  // 1. Primary beveled fuselage (ExtrudeGeometry oriented along +Z forward)
  const hullShape = createBeveledHullShape(shipId);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.center();
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  bodyGroup.add(hullMesh);

  // 2 & 3. Left & Right sculpted wings
  const wingShape = createWingShape(shipId);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  wingGeo.rotateX(Math.PI / 2);
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0, -0.02, 0);
  rightWing.castShadow = true;
  bodyGroup.add(rightWing);

  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.scale.x = -1;
  leftWing.position.set(0, -0.02, 0);
  leftWing.castShadow = true;
  bodyGroup.add(leftWing);

  // 4. Cockpit Canopy Dome
  const canopyGeo = new THREE.SphereGeometry(0.28, 20, 16);
  canopyGeo.scale(0.95, 0.72, 1.75);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 0.25, 0.22);
  bodyGroup.add(canopy);

  // 5 & 6. Twin Engine Nacelles & Thruster Exhaust Cones
  const thrusters: THREE.Mesh[] = [];
  const nacelleGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.65, 14);
  nacelleGeo.rotateX(Math.PI / 2);
  const flameGeo = new THREE.ConeGeometry(0.13, 0.55, 12);
  flameGeo.rotateX(-Math.PI / 2);

  const nacelleOffsets =
    shipId === 'bastion' || isBoss ? [-0.52, 0.52] : [-0.34, 0.34];

  for (const xOff of nacelleOffsets) {
    const nacelle = new THREE.Mesh(nacelleGeo, darkMetalMat);
    nacelle.position.set(xOff, 0.02, -0.82);
    nacelle.castShadow = true;
    bodyGroup.add(nacelle);

    const flame = new THREE.Mesh(flameGeo, glowMat);
    flame.position.set(xOff, 0.02, -1.35);
    bodyGroup.add(flame);
    thrusters.push(flame);
  }

  // 7 & 8. Dorsal Weapon Turret / Twin Wingtip Blasters
  const barrelGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.52, 10);
  barrelGeo.rotateX(Math.PI / 2);
  for (const side of [-1, 1]) {
    const blaster = new THREE.Mesh(barrelGeo, darkMetalMat);
    blaster.position.set(side * 0.65, 0.06, 0.32);
    bodyGroup.add(blaster);

    const tipBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 10),
      glowMat,
    );
    tipBeacon.position.set(side * 1.32, 0.02, -0.58);
    bodyGroup.add(tipBeacon);
  }

  // 9. Dorsal Reactor Core / Crest
  const crestGeo = new THREE.OctahedronGeometry(0.18, 0);
  crestGeo.scale(1.1, 0.55, 1.4);
  const crest = new THREE.Mesh(crestGeo, glowMat);
  crest.position.set(0, 0.24, -0.45);
  bodyGroup.add(crest);

  // Boss extra orbital rings & heavy turrets
  const bossRings: THREE.Mesh[] = [];
  if (isBoss) {
    for (let i = 0; i < 2; i++) {
      const rGeo = new THREE.TorusGeometry(1.8 + i * 0.35, 0.06, 10, 40);
      const rMat = new THREE.MeshStandardMaterial({
        color: 0xfb7185,
        emissive: 0xf43f5e,
        emissiveIntensity: 1.5,
        roughness: 0.25,
        metalness: 0.8,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = Math.PI / 2 + (i === 0 ? 0.22 : -0.22);
      bodyGroup.add(ring);
      bossRings.push(ring);
    }
  }

  // Protective Shield Bubble (shown when shield > 0)
  const shieldGeo = new THREE.SphereGeometry(isBoss ? 3.5 : 1.75, 24, 18);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.26,
    roughness: 0.1,
    metalness: 0.1,
    depthWrite: false,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.position.y = 0.55;
  shieldMesh.renderOrder = 4;
  shieldMesh.visible = false;
  root.add(shieldMesh);

  // Ground Team Indicator Ring (pivoted at y = 0.03 above arena floor)
  const ringGeo = new THREE.RingGeometry(
    isBoss ? 2.9 : 1.25,
    isBoss ? 3.25 : 1.48,
    32,
  );
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: isBoss ? 0xfb7185 : team === 'A' ? 0x38bdf8 : 0xf472b6,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const teamRing = new THREE.Mesh(ringGeo, ringMat);
  teamRing.position.y = 0.04;
  root.add(teamRing);

  // Telegraph Danger Ring (visible during Boss windup attacks)
  const teleGeo = new THREE.RingGeometry(3.4, 4.2, 36);
  teleGeo.rotateX(-Math.PI / 2);
  const teleMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(teleGeo, teleMat);
  telegraphRing.position.y = 0.06;
  telegraphRing.visible = false;
  root.add(telegraphRing);

  return {
    root,
    bodyGroup,
    thrusters,
    shieldMesh,
    teamRing,
    telegraphRing,
    bossRings,
    hullMaterials,
    baseColors,
  };
}

export function buildPowerUpMesh(type: PowerUpType): THREE.Group {
  const info = POWERUP_INFO[type];
  const color = new THREE.Color(info.colorHex);
  const group = new THREE.Group();

  // Outer rotating holographic diamond frame
  const coreGeo =
    type === 'health'
      ? new THREE.OctahedronGeometry(0.55, 0)
      : type === 'shield'
        ? new THREE.IcosahedronGeometry(0.52, 0)
        : type === 'missile_upgrade'
          ? new THREE.ConeGeometry(0.45, 0.95, 6)
          : new THREE.DodecahedronGeometry(0.48, 0);

  const coreMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.45,
    roughness: 0.2,
    metalness: 0.5,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 0.8;
  group.add(core);

  // Orbiting ring
  const ringGeo = new THREE.TorusGeometry(0.75, 0.045, 8, 28);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.8;
  ring.rotation.x = Math.PI / 3;
  group.add(ring);

  // Ground beacon circle
  const baseGeo = new THREE.RingGeometry(0.65, 0.85, 24);
  baseGeo.rotateX(-Math.PI / 2);
  const baseMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.04;
  group.add(base);

  return group;
}

export function buildAsteroidMesh(radius: number, variant: number): THREE.Group {
  const group = new THREE.Group();

  // Multi-part crystalline asteroid: rocky core + glowing crystal outcrops
  const rockGeo = new THREE.DodecahedronGeometry(radius, 1);
  const posAttr = rockGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const noise =
      0.86 +
      0.24 * Math.sin(vx * 2.1 + variant) * Math.cos(vz * 1.9 - variant);
    posAttr.setXYZ(i, vx * noise, vy * noise * 0.78, vz * noise);
  }
  rockGeo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? 0x3b3363 : 0x2d325a,
    roughness: 0.85,
    metalness: 0.18,
    flatShading: true,
  });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.y = radius * 0.52;
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);

  // Glowing crystal spikes
  const crystalColor = variant % 3 === 0 ? 0x38bdf8 : variant % 3 === 1 ? 0xa78bfa : 0xf472b6;
  const crystalMat = new THREE.MeshStandardMaterial({
    color: crystalColor,
    emissive: crystalColor,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.65,
  });

  const crystalCount = 3;
  for (let c = 0; c < crystalCount; c++) {
    const cGeo = new THREE.ConeGeometry(radius * 0.18, radius * 0.65, 5);
    const crystal = new THREE.Mesh(cGeo, crystalMat);
    const ang = (c / crystalCount) * Math.PI * 2 + variant;
    crystal.position.set(
      Math.cos(ang) * radius * 0.42,
      radius * 0.85,
      Math.sin(ang) * radius * 0.42,
    );
    crystal.rotation.set(
      Math.sin(ang) * 0.45,
      ang,
      -Math.cos(ang) * 0.45,
    );
    group.add(crystal);
  }

  // Soft perimeter ring on floor plane
  const ringGeo = new THREE.RingGeometry(radius * 0.98, radius * 1.12, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: crystalColor,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.03;
  group.add(ring);

  return group;
}

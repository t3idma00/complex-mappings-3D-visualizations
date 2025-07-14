import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';

const crystalLoader = new GLTFLoader();
const rockLoader = new GLTFLoader();
const turretLoader = new GLTFLoader();

export const crystalData = []; // {x, z, object, activated}
export const turretMixers = [];
export const turrets = [];

let loadPromises = [];

export function createMoonZones(scene, texturePath, rockColliders) {
  const loader = new THREE.TextureLoader();
  const zoneData = [
    { name: "Landing Zone", x: 0, z: 0, texture: './assets/textures/moon.jpg' },
    { name: "Crater Valley", x: 500, z: 0, texture: './assets/textures/crater.jpg' },
    { name: "Ruined Base", x: 0, z: -500, texture: './assets/textures/ruined.jpg' },
    { name: "Power Hub", x: 500, z: -500, texture: './assets/textures/stars.jpg' }
  ];

  zoneData.forEach(({ name, x, z, texture }) => {
    const groundTex = loader.load(texture);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(10, 10);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshStandardMaterial({ map: groundTex })
);
ground.receiveShadow = true;

    ground.rotation.x = -Math.PI / 2;
    ground.position.set(x, 0, z);
    scene.add(ground);



    const label = createZoneLabelMesh(name);
    label.position.set(x, 0.1, z);
    scene.add(label);

    addFixedRocks(scene, x, z, rockColliders);
    if (name === "Crater Valley") addCraters(scene, x, z, rockColliders);
    if (name === "Ruined Base") addBrokenStructures(scene, x, z);
    if (["Landing Zone", "Crater Valley", "Ruined Base"].includes(name)) {
      loadPromises.push(addCrystal(scene, x + 50, z - 50));
    }
  });
}

export function waitForZoneAssets() {
  return Promise.all(loadPromises);
}

function createZoneLabelMesh(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.font = '28px sans-serif';
  ctx.fillText(text, 10, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
  const geo = new THREE.PlaneGeometry(20, 5);
  return new THREE.Mesh(geo, mat);
}

function addCraters(scene, baseX, baseZ, rockColliders) {
  for (let i = 0; i < 5; i++) {
    const x = baseX + (Math.random() - 0.5) * 400;
    const z = baseZ + (Math.random() - 0.5) * 400;
    const crater = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 15, 2, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    crater.rotation.x = Math.PI / 2;
    crater.position.set(x, 0.1, z);
    scene.add(crater);
    rockColliders.push({ position: crater.position.clone(), radius: 12 });
  }
}

function addBrokenStructures(scene, baseX, baseZ) {
  for (let i = 0; i < 3; i++) {
    const x = baseX + (Math.random() - 0.5) * 300;
    const z = baseZ + (Math.random() - 0.5) * 300;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    building.position.set(x, 5, z);
    scene.add(building);
  }
}

function addCrystal(scene, x, z) {
  return new Promise((resolve) => {
    crystalLoader.load('./assets/models/crystal.glb', gltf => {
      const crystal = gltf.scene;
      crystal.scale.set(5, 5, 5);
      crystal.position.set(x, 0, z);
      scene.add(crystal);
      crystalData.push({ x, z, object: crystal, activated: false });

      addTurretsAround(scene, x, z).then(resolve);
    });
  });
}

function addTurretsAround(scene, cx, cz) {
  const offsets = [
    [10, 10, Math.PI / 4],
    [-10, 10, -Math.PI / 2],
    [10, -10, Math.PI / 2],
    [-10, -10, Math.PI]
  ];

  const turretLoads = offsets.map(([dx, dz, rotation]) => {
    return new Promise((resolve) => {
      turretLoader.load('./assets/models/Turrets.glb', gltf => {
        const turretGroup = new THREE.Group();
        const turretModel = gltf.scene;
        turretModel.scale.set(1.2, 1.2, 1.2);
        turretModel.rotation.y = 0;
        turretGroup.add(turretModel);

        turretGroup.position.set(cx + dx, 0.1, cz + dz);
        turretGroup.rotation.y = rotation;
        scene.add(turretGroup);

        turrets.push({ object: turretGroup, cooldown: 0, health: 5 });

        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new AnimationMixer(turretModel);
          mixer.clipAction(gltf.animations[0]).play();
          turretMixers.push(mixer);
        }

        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        dot.position.copy(turretGroup.position).add(new THREE.Vector3(0, 2, 0));
        scene.add(dot);

        resolve(); // resolve this turret
      });
    });
  });

  return Promise.all(turretLoads);
}

function addFixedRocks(scene, baseX, baseZ, rockColliders) {
  const positions = [
    [baseX + 100, baseZ + 80],
    [baseX - 120, baseZ - 90],
    [baseX + 50, baseZ - 150],
    [baseX - 160, baseZ + 130],
    [baseX + 180, baseZ + 30]
  ];

  positions.forEach(([x, z]) => {
    rockLoader.load('./assets/models/rock.glb', gltf => {
      const rock = gltf.scene;
      const scale = 1.5;
      rock.scale.set(scale, scale, scale);
      rock.position.set(x, 0, z);
      rock.rotation.y = Math.PI / 3;
      scene.add(rock);
      const bbox = new THREE.Box3().setFromObject(rock);
      const size = bbox.getSize(new THREE.Vector3()).length();
      rockColliders.push({ position: rock.position.clone(), radius: size * 0.3 });
    });
  });
}

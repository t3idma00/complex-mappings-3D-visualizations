import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';

const crystalLoader = new GLTFLoader();
const rockLoader = new GLTFLoader();
const turretLoader = new GLTFLoader();

export const crystalData = []; // {x, z, object, activated}
export const turretMixers = [];
export const turrets = [];

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
      new THREE.MeshBasicMaterial({ map: groundTex })
    );
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
      addCrystal(scene, x + 50, z - 50);
    }
  });
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
  crystalLoader.load('./assets/models/crystal.glb', gltf => {
    const crystal = gltf.scene;
    crystal.scale.set(5, 5, 5);
    crystal.position.set(x, 0, z);
    scene.add(crystal);
    crystalData.push({ x, z, object: crystal, activated: false });
    addTurretsAround(scene, x, z);
  });
}

function addTurretsAround(scene, cx, cz) {
  const offsets = [
    [10, 10, Math.PI / 4],
    [-10, 10, -Math.PI / 2],
    [10, -10, Math.PI / 2],
    [-10, -10, Math.PI]
  ];

  offsets.forEach(([dx, dz, rotation]) => {
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
    });
  });
}

// ✅ Fixed Rock Positions (same every time)
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

export function addStarDome(scene, camera) {
  const radius = 5000;
  const starsGeometry = new THREE.BufferGeometry();
  const twinklingStarsGeometry = new THREE.BufferGeometry();

  const starPositions = [], twinklingStarPositions = [], starColors = [], twinklingStarColors = [], twinklingAlphas = [];
  const color = new THREE.Color();

  for (let i = 0; i < 10500; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    const isTwinkling = i >= 10000;
    const lightness = isTwinkling ? 0.95 : 0.9 + Math.random() * 0.1;
    const hue = Math.random() * 0.1;
    const saturation = Math.random() * 0.2;
    color.setHSL(hue, saturation, lightness);

    if (isTwinkling) {
      twinklingStarPositions.push(x, y, z);
      twinklingStarColors.push(color.r, color.g, color.b);
      twinklingAlphas.push(1);
    } else {
      starPositions.push(x, y, z);
      starColors.push(color.r, color.g, color.b);
    }
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

  const starMaterial = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    fog: false
  });

  const stars = new THREE.Points(starsGeometry, starMaterial);
  stars.renderOrder = -1000;
  scene.add(stars);

  twinklingStarsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(twinklingStarPositions, 3));
  twinklingStarsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(twinklingStarColors, 3));
  const alphaAttribute = new THREE.Float32BufferAttribute(twinklingAlphas, 1);
  twinklingStarsGeometry.setAttribute('alpha', alphaAttribute);

  const twinklingStarMaterial = new THREE.PointsMaterial({
    size: 2.0,
    vertexColors: true,
    transparent: true,
    fog: false,
    onBeforeCompile: (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `
        varying float vAlpha;
        void main() {
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
        'gl_FragColor = vec4( outgoingLight, vAlpha );'
      );
    }
  });

  const twinklingStars = new THREE.Points(twinklingStarsGeometry, twinklingStarMaterial);
  twinklingStars.renderOrder = -999;
  scene.add(twinklingStars);

  const twinklingData = [];
  for (let i = 0; i < twinklingStarPositions.length / 3; i++) {
    twinklingData.push({
      speed: 0.5 + Math.random() * 2,
      offset: Math.random() * Math.PI * 2,
      baseSize: 1.5 + Math.random() * 1.0
    });
  }

  return {
    position: stars.position,
    copy: stars.position.copy.bind(stars.position),
    update: (time) => {
      const alphaAttrib = twinklingStarsGeometry.getAttribute('alpha');
      for (let i = 0; i < twinklingData.length; i++) {
        const t = time * twinklingData[i].speed + twinklingData[i].offset;
        const opacity = 0.5 + 0.5 * Math.sin(t);
        alphaAttrib.setX(i, opacity);
      }
      alphaAttrib.needsUpdate = true;
    }
  };
}

function addRandomRocks(scene, baseX, baseZ, rockColliders) {
  for (let i = 0; i < 5; i++) {
    const x = baseX + (Math.random() - 0.5) * 400;
    const z = baseZ + (Math.random() - 0.5) * 400;
    rockLoader.load('./assets/models/rock.glb', gltf => {
      const rock = gltf.scene;
      const scale = 1 + Math.random() * 2;
      rock.scale.set(scale, scale, scale);
      rock.position.set(x, 0, z);
      rock.rotation.y = Math.random() * Math.PI * 2;
      scene.add(rock);
      const bbox = new THREE.Box3().setFromObject(rock);
      const size = bbox.getSize(new THREE.Vector3()).length();
      rockColliders.push({ position: rock.position.clone(), radius: size * 0.3 });
    });
  }
}
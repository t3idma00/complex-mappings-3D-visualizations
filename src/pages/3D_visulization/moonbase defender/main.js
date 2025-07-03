import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer, Box3 } from 'three';
import { setupControls } from './controls.js';
import { createMoonZones, crystalData, addStarDome, turretMixers, turrets } from './map.js';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.01);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 8000);
camera.position.y = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.HemisphereLight(0xddddff, 0x222233, 1.5));
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
scene.add(new THREE.DirectionalLight(0xffffff, 1.8).position.set(20, 100, -50));
scene.add(new THREE.DirectionalLight(0x8888ff, 0.3).position.set(-20, 30, 40));

// Stars
const starDome = addStarDome(scene, camera);

// Terrain & Controls
const rockColliders = [];
createMoonZones(scene, './assets/textures/moon.jpg', rockColliders);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());
setupControls(controls, camera, rockColliders);
document.body.addEventListener('click', () => controls.lock());

// Player Gun
let muzzle = null;
new GLTFLoader().load('./assets/models/gun.glb', gltf => {
  const gun = gltf.scene;
  gun.scale.set(0.3, 0.2, 0.3);
  gun.position.set(0.2, -0.2, -0.7);
  gun.rotation.y = Math.PI;
  muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.04, -1);
  gun.add(muzzle);
  camera.add(gun);
});

// Audio
const bullets = [], turretBullets = [], enemyBullets = [], airshipBombs = [], enemies = [], airships = [];
const shootDirection = new THREE.Vector3();
const listener = new THREE.AudioListener();
camera.add(listener);
const shootSound = new THREE.Audio(listener);
new THREE.AudioLoader().load('./assets/sounds/shoot.mp3', buffer => {
  shootSound.setBuffer(buffer);
  shootSound.setVolume(0.5);
});

// Shooting
window.addEventListener('click', () => {
  if (!controls.isLocked || !muzzle) return;
  const muzzleWorld = new THREE.Vector3();
  muzzle.getWorldPosition(muzzleWorld);
  camera.getWorldDirection(shootDirection);
  const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
  bullet.position.copy(muzzleWorld);
  bullet.userData.velocity = shootDirection.clone().multiplyScalar(0.8);
  scene.add(bullet);
  bullets.push(bullet);
  if (shootSound.isPlaying) shootSound.stop();
  shootSound.play();
});

// Spawning
function spawnEnemy(x, z) {
  new GLTFLoader().load('./assets/models/enemy1.glb', gltf => {
    const enemy = gltf.scene;
    enemy.scale.set(0.1, 0.1, 0.1);
    enemy.position.set(x, 0, z);
    enemy.health = 10;
    enemy.mixer = new AnimationMixer(enemy);
    enemy.mixer.clipAction(gltf.animations[0]).play();
    scene.add(enemy);
    enemies.push(enemy);

    setInterval(() => {
      if (enemy.health <= 0) return;
      const eye = enemy.position.clone(); eye.y += 5;
      const dir = controls.getObject().position.clone().sub(eye).normalize();
      const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 }));
      bullet.position.copy(eye);
      bullet.userData.velocity = dir.multiplyScalar(0.08);
      scene.add(bullet);
      enemyBullets.push(bullet);
    }, 2000);
  });
}

function spawnAirship(x, z) {
  new GLTFLoader().load('./assets/models/airship.glb', gltf => {
    const ship = gltf.scene;
    ship.scale.set(2, 2, 2);
    ship.position.set(x, 10, z);
    ship.health = 15;
    scene.add(ship);
    airships.push(ship);

    setInterval(() => {
      if (ship.health <= 0) return;
      const bomb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0xff6600 }));
      bomb.position.copy(ship.position);
      bomb.userData.velocity = new THREE.Vector3(0, -0.1, 0);
      scene.add(bomb);
      airshipBombs.push(bomb);
    }, 4000);
  });
}

spawnEnemy(10, -10);
spawnEnemy(-10, -10);
spawnEnemy(0, -30);
spawnAirship(0, -20);
spawnAirship(10, -30);
spawnAirship(-10, -30);

// Player Health
let playerHealth = 20;
function updateHealthBar() {
  const bar = document.getElementById('health-bar');
  const percent = (playerHealth / 20) * 100;
  bar.style.width = percent + '%';
  bar.style.backgroundColor = percent < 20 ? 'red' : percent < 40 ? 'orange' : 'limegreen';
}

// Crystal Activation
let activatedCount = 0;
const counterDiv = document.createElement('div');
counterDiv.style.cssText = 'position:fixed;top:20px;right:20px;color:white;font-size:20px;z-index:1000;font-family:monospace';
document.body.appendChild(counterDiv);
function updateCrystalCounter() {
  counterDiv.textContent = `Crystals Activated: ${activatedCount} / ${crystalData.length}`;
}
updateCrystalCounter();

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') {
    crystalData.forEach(data => {
      if (!data.activated && data.object.position.distanceTo(controls.getObject().position) < 6) {
        data.activated = true;
        activatedCount++;
        updateCrystalCounter();
        data.object.traverse(child => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.color.set(0x00ff99);
            child.material.opacity = 0.6;
            child.material.transparent = true;
            child.material.emissive.set(0x00ff99);
            child.material.emissiveIntensity = 0.3;
          }
        });
      }
    });
  }
});

// Minimap Setup
const zoneImages = {
  'Landing Zone': Object.assign(new Image(), { src: './assets/textures/moon.jpg' }),
  'Crater Valley': Object.assign(new Image(), { src: './assets/textures/crater.jpg' }),
  'Ruined Base': Object.assign(new Image(), { src: './assets/textures/ruined.jpg' }),
  'Power Hub': Object.assign(new Image(), { src: './assets/textures/stars.jpg' })
};
const zoneData = [
  { name: 'Landing Zone', x: 0, z: 0 },
  { name: 'Crater Valley', x: 500, z: 0 },
  { name: 'Ruined Base', x: 0, z: -500 },
  { name: 'Power Hub', x: 500, z: -500 }
];

// Animate
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  controls.update();
  starDome.position.copy(camera.position);
  starDome.update?.(time);

  enemies.forEach(e => {
    e.mixer?.update(delta);
    if (e.health > 0) {
      const dir = controls.getObject().position.clone().sub(e.position); dir.y = 0;
      if (dir.length() > 1) e.position.add(dir.normalize().multiplyScalar(0.02));
      e.lookAt(controls.getObject().position.x, e.position.y, controls.getObject().position.z);
    }
  });

  airships.forEach(a => {
    if (a.health > 0) {
      const dir = controls.getObject().position.clone().sub(a.position); dir.y = 0;
      if (dir.length() > 2) a.position.add(dir.normalize().multiplyScalar(0.01));
      a.lookAt(controls.getObject().position.x, a.position.y, controls.getObject().position.z);
    }
  });

  turrets.forEach(t => {
    const dist = t.object.position.distanceTo(controls.getObject().position);
    t.cooldown -= delta;
    if (dist < 25 && t.cooldown <= 0) {
      const pos = t.object.position.clone(); pos.y += 2;
      const dir = controls.getObject().position.clone().sub(pos).normalize();
      const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222 }));
      bullet.position.copy(pos);
      bullet.userData.velocity = dir.multiplyScalar(0.8);
      scene.add(bullet);
      turretBullets.push(bullet);
      t.cooldown = 1.5;
    }
  });

  [...bullets].forEach((b, i) => {
    b.position.add(b.userData.velocity);
    enemies.forEach(e => {
      if (e.health > 0 && new Box3().setFromObject(e).containsPoint(b.position)) {
        e.health--; scene.remove(b); bullets.splice(i, 1);
        if (e.health <= 0) setTimeout(() => scene.remove(e), 1000);
      }
    });
    airships.forEach(a => {
      if (a.health > 0 && new Box3().setFromObject(a).containsPoint(b.position)) {
        a.health--; scene.remove(b); bullets.splice(i, 1);
        if (a.health <= 0) setTimeout(() => scene.remove(a), 1000);
      }
    });
    turrets.forEach(t => {
      if (t.health > 0 && b.position.distanceTo(t.object.position) < 1.5) {
        t.health--; scene.remove(b); bullets.splice(i, 1);
        if (t.health <= 0) scene.remove(t.object);
      }
    });
  });

  [...turretBullets, ...enemyBullets].forEach((b, i, arr) => {
    b.position.add(b.userData.velocity);
    if (b.position.distanceTo(controls.getObject().position) < 0.6) {
      playerHealth--;
      updateHealthBar();
      scene.remove(b);
      arr.splice(i, 1);
      if (playerHealth <= 0) alert('Game Over'), window.location.reload();
    }
  });

  airshipBombs.forEach((b, i) => {
    b.position.add(b.userData.velocity);
    if (b.position.y < 0.1 || b.position.distanceTo(controls.getObject().position) < 1.5) {
      if (b.position.distanceTo(controls.getObject().position) < 1.5) {
        playerHealth -= 2;
        updateHealthBar();
        if (playerHealth <= 0) alert('Game Over'), window.location.reload();
      }
      scene.remove(b);
      airshipBombs.splice(i, 1);
    }
  });

  turretMixers.forEach(m => m.update(delta));

  // Minimap render
  const canvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const mapSize = 1000;
  const scale = canvas.width / mapSize;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  zoneData.forEach(zone => {
    const img = zoneImages[zone.name];
    if (img.complete) {
      const zoneSize = 500 * scale;
      const dx = (zone.x - camera.position.x) * scale + centerX - zoneSize / 2;
      const dz = (zone.z - camera.position.z) * scale + centerY - zoneSize / 2;
      ctx.drawImage(img, dx, dz, zoneSize, zoneSize);
    }
  });

  ctx.beginPath();
  ctx.arc(centerX, centerY, canvas.width / 2 - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.clip();

  ctx.fillStyle = 'lime';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'red';
  enemies.forEach(e => {
    const dx = (e.position.x - camera.position.x) * scale;
    const dz = (e.position.z - camera.position.z) * scale;
    ctx.beginPath();
    ctx.arc(centerX + dx, centerY + dz, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'limegreen';
  crystalData.forEach(pos => {
    const dx = (pos.x - camera.position.x) * scale;
    const dz = (pos.z - camera.position.z) * scale;
    ctx.beginPath();
    ctx.arc(centerX + dx, centerY + dz, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  document.getElementById('activation-prompt').style.display =
    crystalData.some(data =>
      !data.activated && data.object.position.distanceTo(controls.getObject().position) < 6
    ) ? 'block' : 'none';

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

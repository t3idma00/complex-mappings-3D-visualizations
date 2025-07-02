// --- main.js ---
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';

import { AnimationMixer, Box3 } from 'three';
import { setupControls } from './controls.js';
import { createMoonZones, crystalData, addStarDome } from './map.js';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.01);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 8000);
camera.position.y = 2;

const starDome = addStarDome(scene, camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xddddff, 0x222233, 1.5);
scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(20, 100, -50);
dirLight.castShadow = true;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
fillLight.position.set(-20, 30, 40);
scene.add(fillLight);

const rockColliders = [];
createMoonZones(scene, './assets/textures/moon.jpg', rockColliders);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());
setupControls(controls, camera, rockColliders);
const activationPrompt = document.getElementById('activation-prompt');

document.body.addEventListener('click', () => controls.lock());

let muzzle = null;
new GLTFLoader().load('./assets/models/gun.glb', (gltf) => {
  const gunModel = gltf.scene;
  gunModel.scale.set(0.3, 0.2, 0.3);
  gunModel.position.set(0.2, -0.2, -0.7);
  gunModel.rotation.y = Math.PI;
  muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.04, -1);
  gunModel.add(muzzle);
  camera.add(gunModel);
});

const bullets = [], enemyBullets = [], airshipBombs = [], enemies = [], airships = [];
const shootDirection = new THREE.Vector3();
const listener = new THREE.AudioListener();
camera.add(listener);
const shootSound = new THREE.Audio(listener);
new THREE.AudioLoader().load('./assets/sounds/shoot.mp3', buffer => {
  shootSound.setBuffer(buffer);
  shootSound.setVolume(0.5);
});

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

let playerHealth = 20;
function updateHealthBar() {
  const bar = document.getElementById('health-bar');
  const percent = (playerHealth / 20) * 100;
  bar.style.width = percent + '%';
  bar.style.backgroundColor = percent < 20 ? 'red' : percent < 40 ? 'orange' : 'limegreen';
}

function spawnEnemy(x, z) {
  new GLTFLoader().load('./assets/models/enemy1.glb', (gltf) => {
    const enemy = gltf.scene;
    enemy.scale.set(0.1, 0.1, 0.1);
    enemy.position.set(x, 0, z);
    enemy.rotation.y = Math.PI;
    enemy.health = 10;
    enemy.mixer = new AnimationMixer(enemy);
    enemy.mixer.clipAction(gltf.animations[0]).play();
    scene.add(enemy);
    enemies.push(enemy);

    setInterval(() => {
      if (!enemy || enemy.health <= 0) return;
      const eye = enemy.position.clone();
      eye.y += 5;
      const dir = controls.getObject().position.clone().sub(eye).normalize();
      const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 5, metalness: 0.8, roughness: 0.1 })
      );
      bullet.position.copy(eye);
      bullet.userData.velocity = dir.multiplyScalar(0.08);
      scene.add(bullet);
      enemyBullets.push(bullet);
    }, 2000);
  });
}

function spawnAirship(x, z) {
  new GLTFLoader().load('./assets/models/airship.glb', (gltf) => {
    const airship = gltf.scene;
    airship.scale.set(2, 2, 2);
    airship.position.set(x, 10, z);
    airship.rotation.y = Math.PI;
    airship.health = 15;
    scene.add(airship);
    airships.push(airship);

    setInterval(() => {
      if (!airship || airship.health <= 0) return;
      const bomb = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0xff6600, emissiveIntensity: 2 })
      );
      bomb.position.copy(airship.position);
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

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  controls.update();
  starDome.position.copy(camera.position);
  starDome.update?.(time);

  enemies.forEach((e) => {
    e.mixer?.update(delta);
    if (e.health > 0) {
      const dir = controls.getObject().position.clone().sub(e.position); dir.y = 0;
      if (dir.length() > 1) e.position.add(dir.normalize().multiplyScalar(0.02));
      e.lookAt(controls.getObject().position.x, e.position.y, controls.getObject().position.z);
    }
  });

  airships.forEach((a) => {
    if (a.health > 0) {
      const dir = controls.getObject().position.clone().sub(a.position); dir.y = 0;
      if (dir.length() > 2) a.position.add(dir.normalize().multiplyScalar(0.01));
      a.lookAt(controls.getObject().position.x, a.position.y, controls.getObject().position.z);
    }
  });

  bullets.forEach((b, i) => {
    b.position.add(b.userData.velocity);

    enemies.forEach((e) => {
      if (e.health > 0 && new Box3().setFromObject(e).containsPoint(b.position)) {
        e.health--;
        scene.remove(b);
        bullets.splice(i, 1);
        if (e.health <= 0) {
          e.traverse(c => c.isMesh && Object.assign(c.material, {
            emissive: new THREE.Color(0x00ff00),
            emissiveIntensity: 0.1,
            color: new THREE.Color(0x66ff66),
            metalness: 0.2,
            roughness: 0.6
          }));
          setTimeout(() => scene.remove(e), 1000);
        }
      }
    });

    airships.forEach((ship) => {
      if (ship.health > 0 && new Box3().setFromObject(ship).containsPoint(b.position)) {
        ship.health--;
        scene.remove(b);
        bullets.splice(i, 1);
        if (ship.health <= 0) {
          ship.traverse(c => {
            if (c.isMesh) {
              c.material = c.material.clone();
              c.material.color.set(0x882222);
              c.material.emissive.set(0xff0000);
              c.material.emissiveIntensity = 0.4;
            }
          });
          setTimeout(() => scene.remove(ship), 1500);
        }
      }
    });

    if (b.position.length() > 100) {
      scene.remove(b);
      bullets.splice(i, 1);
    }
  });

  enemyBullets.forEach((b, i) => {
    b.position.add(b.userData.velocity);
    if (b.position.distanceTo(controls.getObject().position) < 0.6) {
      playerHealth--;
      updateHealthBar();
      scene.remove(b);
      enemyBullets.splice(i, 1);
      if (playerHealth <= 0) alert('Game Over!'), window.location.reload();
    } else if (b.position.length() > 100) {
      scene.remove(b);
      enemyBullets.splice(i, 1);
    }
  });

  airshipBombs.forEach((b, i) => {
    b.position.add(b.userData.velocity);
    if (b.position.y < 0.1 || b.position.distanceTo(controls.getObject().position) < 1) {
      scene.remove(b);
      airshipBombs.splice(i, 1);
      if (b.position.distanceTo(controls.getObject().position) < 1.5) {
        playerHealth -= 2;
        updateHealthBar();
        if (playerHealth <= 0) alert('Game Over!'), window.location.reload();
      }
    }
  });

  // --- MINIMAP ---
  const canvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const mapSize = 1000;
  const scale = canvas.width / mapSize;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

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

  ctx.fillStyle = 'cyan';
  [
    { name: 'Landing Zone', x: 0, z: 0 },
    { name: 'Crater Valley', x: 500, z: 0 },
    { name: 'Ruined Base', x: 0, z: -500 },
    { name: 'Power Hub', x: 500, z: -500 }
  ].forEach(zone => {
    const dx = (zone.x - camera.position.x) * scale;
    const dz = (zone.z - camera.position.z) * scale;
    ctx.beginPath();
    ctx.arc(centerX + dx, centerY + dz, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  let nearCrystal = false;
  crystalData.forEach(data => {
    if (!data.activated && data.object.position.distanceTo(controls.getObject().position) < 6) {
      nearCrystal = true;
    }
  });
  activationPrompt.style.display = nearCrystal ? 'block' : 'none';

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

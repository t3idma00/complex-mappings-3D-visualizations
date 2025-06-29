// main.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer, Box3 } from 'three';
import { setupControls } from './controls.js';
import { createMoonZones, crystalData } from './map.js';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xaaaaaa, 0x000000, 1));
const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 1.0));

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

const bullets = [];
const enemyBullets = [];
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
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );
  bullet.position.copy(muzzleWorld);
  bullet.userData.velocity = shootDirection.clone().multiplyScalar(0.8);
  scene.add(bullet);
  bullets.push(bullet);
  if (shootSound.isPlaying) shootSound.stop();
  shootSound.play();
});

let playerHealth = 20;
function updateHealthBar() {
  const healthBar = document.getElementById('health-bar');
  const percentage = (playerHealth / 20) * 100;
  healthBar.style.width = percentage + '%';
  if (percentage < 40) healthBar.style.backgroundColor = 'orange';
  if (percentage < 20) healthBar.style.backgroundColor = 'red';
}

const enemies = [];
function spawnEnemy(x, z) {
  new GLTFLoader().load('./assets/models/enemy1.glb', (gltf) => {
    const enemy = gltf.scene;
    enemy.scale.set(0.1, 0.1, 0.1);
    enemy.position.set(x, 0, z);
    enemy.rotation.y = Math.PI;
    enemy.health = 10;
    enemy.mixer = new AnimationMixer(enemy);
    const clip = gltf.animations[0];
    enemy.mixer.clipAction(clip).play();
    scene.add(enemy);
    enemies.push(enemy);

    setInterval(() => {
      if (!enemy || enemy.health <= 0) return;
      const eye = enemy.position.clone();
      eye.y += 5;
      eye.z -= 0.1;
      const dir = controls.getObject().position.clone().sub(eye).normalize();
      const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xff0000,
          emissive: 0xff0000,
          emissiveIntensity: 5,
          metalness: 0.8,
          roughness: 0.1
        })
      );
      bullet.position.copy(eye);
      bullet.userData.velocity = dir.multiplyScalar(0.08);
      scene.add(bullet);
      enemyBullets.push(bullet);
    }, 2000);
  });
}

spawnEnemy(5, -10);
spawnEnemy(-10, -10);
spawnEnemy(0, -20);

let activatedCount = 0;
const counterDiv = document.createElement('div');
counterDiv.style.position = 'fixed';
counterDiv.style.top = '20px';
counterDiv.style.right = '20px';
counterDiv.style.color = 'white';
counterDiv.style.fontSize = '20px';
counterDiv.style.zIndex = 1000;
counterDiv.style.fontFamily = 'monospace';
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

        // Apply soft tint over original crystal meshes
        data.object.traverse(child => {
          if (child.isMesh) {
            child.material = child.material.clone(); // prevent affecting others
            child.material.color.set(0x00ff99);      // tint color
            child.material.opacity = 0.6;            // semi-transparent
            child.material.transparent = true;
            child.material.emissive.set(0x00ff99);   // light glow
            child.material.emissiveIntensity = 0.3;  // subtle
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
  controls.update();

  enemies.forEach((enemy) => {
    if (enemy.mixer) enemy.mixer.update(delta);
    if (enemy.health > 0) {
      const target = controls.getObject().position.clone();
      const dir = target.clone().sub(enemy.position);
      dir.y = 0;
      if (dir.length() > 1) {
        dir.normalize();
        enemy.position.add(dir.multiplyScalar(0.02));
        enemy.lookAt(target.x, enemy.position.y, target.z);
      }
    }
  });

  bullets.forEach((bullet, i) => {
    bullet.position.add(bullet.userData.velocity);
    enemies.forEach((enemy) => {
      if (enemy.health > 0 && new Box3().setFromObject(enemy).containsPoint(bullet.position)) {
        enemy.health--;
        scene.remove(bullet);
        bullets.splice(i, 1);
        if (enemy.health <= 0) {
          enemy.traverse(child => {
            if (child.isMesh) {
              child.material.emissive = new THREE.Color(0x00ff00);
              child.material.emissiveIntensity = 0.1;
              child.material.color.set(0x66ff66);
              child.material.metalness = 0.2;
              child.material.roughness = 0.6;
            }
          });
          setTimeout(() => { scene.remove(enemy); }, 1000);
        }
      }
    });
    if (bullet.position.length() > 100) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  });

  enemyBullets.forEach((bullet, i) => {
    bullet.position.add(bullet.userData.velocity);
    if (bullet.position.distanceTo(controls.getObject().position) < 0.6) {
      playerHealth--;
      updateHealthBar();
      scene.remove(bullet);
      enemyBullets.splice(i, 1);
      if (playerHealth <= 0) {
        alert('Game Over!');
        window.location.reload();
      }
    } else if (bullet.position.length() > 100) {
      scene.remove(bullet);
      enemyBullets.splice(i, 1);
    }
  });

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
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fill();

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

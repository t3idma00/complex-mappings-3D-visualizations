import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { setupControls } from './controls.js';
import { createMoonZones, crystalData, turretMixers, turrets } from './map.js';
import {
  setupPlayer,
  handleShooting,
  handleCrystalActivation,
  handleTaxiInteraction,
  updateHealthBar,
  getMuzzle
} from './player.js';
import {
  spawnEnemy,
  spawnAirship,
  updateEnemies,
  updateAirships,
  handleEnemyHits
} from './enemies.js';
import { drawMinimap } from './minimap.js';
import { setupUI, showActivationPrompt, updateCrystalCounter } from './ui.js';
import { healthPacks } from './enemies.js';
import { updateTaxiFlight } from './player.js';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.01);
window.scene = scene;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 8000);
camera.position.y = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2.0));
scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const dirLight = new THREE.DirectionalLight(0xffffff, 3.5);
dirLight.position.set(100, 200, 100);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.camera.left = -200;
dirLight.shadow.camera.right = 200;
dirLight.shadow.camera.top = 200;
dirLight.shadow.camera.bottom = -200;
scene.add(dirLight);

// Star field
const starGeometry = new THREE.BufferGeometry();
const starCount = 2000;
const starPositions = [], starSizes = [];
for (let i = 0; i < starCount; i++) {
  const r = 2000 + Math.random() * 1000;
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(2 * Math.random() - 1);
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  starPositions.push(x, y, z);
  starSizes.push(1 + Math.random() * 1.5);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2, transparent: true, opacity: 0.8, depthWrite: false });
const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);

// Terrain
const rockColliders = [];
createMoonZones(scene, './assets/textures/moon.jpg', rockColliders);
window.crystalData = crystalData;

// UI
setupUI();
updateCrystalCounter();

// Controls
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());
setupControls(controls, camera, rockColliders);
document.body.addEventListener('click', () => {
  if (!window.inEndSequence) controls.lock();
});

// Player
const {
  bullets,
  turretBullets,
  enemyBullets,
  airshipBombs,
  enemies,
  airships,
  shootSound
} = setupPlayer(scene, camera);

// Health
let playerHealth = 20;
updateHealthBar(playerHealth);

// Spawning
const zonePositions = [
  { name: "Landing Zone", x: 0, z: 0 },
  { name: "Crater Valley", x: 500, z: 0 },
  { name: "Ruined Base", x: 0, z: -500 },
  { name: "Power Hub", x: 500, z: -500 }
];
zonePositions.forEach(zone => {
  for (let i = 0; i < 3; i++) {
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetZ = (Math.random() - 0.5) * 100;
    spawnEnemy(scene, controls, enemies, enemyBullets, './assets/models/enemy1.glb', zone.x + offsetX, zone.z + offsetZ);
  }
  for (let i = 0; i < 3; i++) {
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetZ = (Math.random() - 0.5) * 100;
    spawnAirship(scene, airships, airshipBombs, './assets/models/airship.glb', zone.x + offsetX, zone.z + offsetZ);
  }
});

// Input events
document.addEventListener('keydown', (e) => {
if (e.code === 'KeyE') {
  const activated = handleCrystalActivation(controls.getObject().position);
  if (activated) {
    handleTaxiInteraction(controls.getObject().position);
  }

  // ✅ If taxi is already landed and not entered, allow entering it
  if (window.taxi && window.taxi.userData?.hasLanded && !window.enteredTaxi) {
    window.keyEPressedToEnter = true;
  }
}

});

window.addEventListener('click', () => {
  if (window.inEndSequence) return; // ❌ Don't shoot in end sequence
  if (!controls.isLocked || !getMuzzle()) return;
  handleShooting(scene, camera, bullets, shootSound);
});

// Game Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (!window.enteredTaxi) {
  controls.update();
}
  starField.position.copy(camera.position);

  const sizeAttr = starGeometry.attributes.size;
  for (let i = 0; i < sizeAttr.count; i++) {
    sizeAttr.array[i] = 1.5 + Math.sin(time * 2 + i) * 0.5;
  }
  sizeAttr.needsUpdate = true;

  updateEnemies(scene, delta, controls, enemies);
  updateAirships(scene, delta, controls, airships);

  turrets.forEach(t => {
    if (t.health <= 0) return;
    const dist = t.object.position.distanceTo(controls.getObject().position);
    t.cooldown -= delta;
    if (dist < 25 && t.cooldown <= 0) {
      const pos = t.object.position.clone(); pos.y += 2;
      const dir = controls.getObject().position.clone().sub(pos).normalize();
      const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222 }));
      bullet.position.copy(pos);
      bullet.userData.velocity = dir.multiplyScalar(0.8);
      bullet.userData.life = 10;
      scene.add(bullet);
      turretBullets.push(bullet);
      t.cooldown = 1.5;
    }
  });

  handleEnemyHits(scene, bullets, enemies, airships, turrets);

  [...turretBullets, ...enemyBullets].forEach((b, i, arr) => {
    b.position.add(b.userData.velocity);
    b.userData.life -= delta;
    if (b.userData.life <= 0) {
      scene.remove(b);
      arr.splice(i, 1);
      return;
    }
    if (b.position.distanceTo(controls.getObject().position) < 0.6) {
      playerHealth -= 0.1;
      updateHealthBar(playerHealth);
      scene.remove(b);
      arr.splice(i, 1);
      if (playerHealth <= 0) {
        playerHealth = 0;
        updateHealthBar(playerHealth);
        alert('Game Over');
        window.location.reload();
      }
    }
  });

  airshipBombs.forEach((b, i) => {
    b.position.add(b.userData.velocity);
    b.userData.life -= delta;
    if (b.userData.life <= 0 || b.position.y < 0.1 || b.position.distanceTo(controls.getObject().position) < 1.5) {
      if (b.position.distanceTo(controls.getObject().position) < 1.5) {
        playerHealth -= 2;
        updateHealthBar(playerHealth);
        if (playerHealth <= 0) alert('Game Over'), window.location.reload();
      }
      scene.remove(b);
      airshipBombs.splice(i, 1);
    }
  });

  healthPacks.forEach((hp, i) => {
    hp.rotation.y += 0.01;
    if (hp.position.distanceTo(controls.getObject().position) < 2) {
      playerHealth = Math.min(20, playerHealth + 5);
      updateHealthBar(playerHealth);
      scene.remove(hp);
      healthPacks.splice(i, 1);
    }
  });

  turretMixers.forEach(m => m.update(delta));
  drawMinimap(camera, enemies, crystalData);
  showActivationPrompt(controls.getObject().position, crystalData);



  updateTaxiFlight(controls);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyE') window.keyEPressedToEnter = false;
});
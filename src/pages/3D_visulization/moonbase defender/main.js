// main.js
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


const starDome = new THREE.Mesh(
  new THREE.SphereGeometry(4000, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide })
);
scene.add(starDome);

// Terrain & Moon Zones
const rockColliders = [];
createMoonZones(scene, './assets/textures/moon.jpg', rockColliders);

// Set global crystalData after zone creation
window.crystalData = crystalData;

// UI
setupUI();
updateCrystalCounter(); // Call updateCrystalCounter from ui.js

// Controls
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());
setupControls(controls, camera, rockColliders);
document.body.addEventListener('click', () => controls.lock());

// Player Setup
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

// Spawn enemies and airships
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

// Key Input
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') {
    const activated = handleCrystalActivation(controls.getObject().position);
    // No need to call updateCrystalCounter here, as it's handled inside handleCrystalActivation
    handleTaxiInteraction(controls.getObject().position);
  }
});

window.addEventListener('click', () => {
  if (!controls.isLocked || !getMuzzle()) return;
  handleShooting(scene, camera, bullets, shootSound);
});

// Game Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  controls.update();
  starDome.position.copy(camera.position);
  // starDome.update?.(time); // Uncomment if starDome has an update method

  updateEnemies(scene, delta, controls, enemies);
  updateAirships(scene, delta, controls, airships);

  turrets.forEach(t => {
    if (t.health <= 0) return;
    const dist = t.object.position.distanceTo(controls.getObject().position);
    t.cooldown -= delta;
    if (dist < 25 && t.cooldown <= 0) {
      const pos = t.object.position.clone(); pos.y += 2;
      const dir = controls.getObject().position.clone().sub(pos).normalize();
      const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222 })
      );
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
      playerHealth--;
      updateHealthBar(playerHealth);
      scene.remove(b);
      arr.splice(i, 1);
      if (playerHealth <= 0) alert('Game Over'), window.location.reload();
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

  turretMixers.forEach(m => m.update(delta));
  drawMinimap(camera, enemies, crystalData);
  showActivationPrompt(controls.getObject().position, crystalData);

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
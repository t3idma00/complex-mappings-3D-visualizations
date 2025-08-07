
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
  getMuzzle,
  updateGunAnimation,
  updateTaxiFlight
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


const params = new URLSearchParams(window.location.search);
window.gameDifficulty = params.get('difficulty') || 'Normal';
console.log("Difficulty:", window.gameDifficulty);


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
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -200;
dirLight.shadow.camera.right = 200;
dirLight.shadow.camera.top = 200;
dirLight.shadow.camera.bottom = -200;
scene.add(dirLight);

const textureLoader = new THREE.TextureLoader();



// Star Field
const starGeometry = new THREE.BufferGeometry();
const starPositions = [], starColors = [], starSizes = [];
const color = new THREE.Color();

//  denser star field
for (let i = 0; i < 5000; i++) {  // Amount of stars
  // sphere of stars with larger radius
  const radius = 5000;  
  
  //  spherical distribution
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  starPositions.push(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
  
  // color variation
  const hue = Math.random() * 0.2;  // Increased color variation range
  const saturation = Math.random() * 0.3;
  const lightness = 0.8 + Math.random() * 0.2;  // Brighter stars
  color.setHSL(hue, saturation, lightness);
  starColors.push(color.r, color.g, color.b);
  
  // Larger size variation
  starSizes.push(1.5 + Math.random() * 3);  // Larger stars
}

starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

const starMaterial = new THREE.PointsMaterial({
  size: 2,  // star base size
  sizeAttenuation: false,  
  vertexColors: true,
  transparent: true,
  opacity: 1,
  fog: false,
  depthWrite: false 
});

const starField = new THREE.Points(starGeometry, starMaterial);
starField.renderOrder = -1;  // Render before other objects
scene.add(starField);

// Controls
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());
setupControls(controls, camera, []);
document.body.addEventListener('click', () => {
  if (!window.inEndSequence) controls.lock();
});

// Terrain + UI + Crystals
const rockColliders = [];
createMoonZones(scene, './assets/textures/moon.jpg', rockColliders);
setupUI();
updateCrystalCounter();
window.crystalData = crystalData;

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

// Difficulty modifiers
let enemyCount = 3;
let enemyDamage = 0.1;
let enemyHealth = 20;

switch (window.gameDifficulty) {
  case 'Easy':
    enemyCount = 2;
    enemyDamage = 0.05;
    enemyHealth = 10;
    break;
  case 'Hard':
    enemyCount = 5;
    enemyDamage = 0.2;
    enemyHealth = 30;
    break;

}



let playerHealth = 20;
updateHealthBar(playerHealth);

// Spawn
[
  { name: 'Landing Zone', x: 0, z: 0 },
  { name: 'Crater Valley', x: 500, z: 0 },
  { name: 'Ruined Base', x: 0, z: -500 },
  { name: 'Power Hub', x: 500, z: -500 }
].forEach(zone => {
  for (let i = 0; i < enemyCount; i++) {
  const x = zone.x + (Math.random() - 0.5) * 100;
  const z = zone.z + (Math.random() - 0.5) * 100;
  const enemy = spawnEnemy(scene, controls, enemies, enemyBullets, './assets/models/enemy1.glb', x, z);
  if (enemy) enemy.userData.health = enemyHealth; //  custom HP per difficulty
}
  for (let i = 0; i < 3; i++) {
    const x = zone.x + (Math.random() - 0.5) * 100;
    const z = zone.z + (Math.random() - 0.5) * 100;
    spawnAirship(scene, airships, airshipBombs, './assets/models/airship.glb', x, z);
  }
});

// E key for activation / entering taxi
document.addEventListener('keydown', e => {
  if (e.code === 'KeyE') {
    const activated = handleCrystalActivation(controls.getObject().position);
    if (activated) handleTaxiInteraction(controls.getObject().position);
    if (window.taxi?.userData?.hasLanded && !window.enteredTaxi)
      window.keyEPressedToEnter = true;
  }
});

document.addEventListener('keyup', e => {
  if (e.code === 'KeyE') window.keyEPressedToEnter = false;
});
window.addEventListener('click', () => {
  if (!window.inEndSequence && controls.isLocked && getMuzzle()) {
    handleShooting(scene, camera, bullets, shootSound);
  }
});

// Animate
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (!window.enteredTaxi) {
    controls.update();
    updateGunAnimation(delta);
  }

    starField.position.copy(camera.position);
' '
 const sizeAttr = starGeometry.attributes.size;
  for (let i = 0; i < sizeAttr.count; i++) {
    sizeAttr.array[i] = 1.5 + Math.sin(time * 3 + i) * 1.5;
  }
  sizeAttr.needsUpdate = true;

  updateEnemies(scene, delta, controls, enemies);
  updateAirships(scene, delta, controls, airships);

  //Turret fire logic 
  turrets.forEach(t => {
    if (t.health <= 0) return;
    t.cooldown -= delta;
    const dist = t.object.position.distanceTo(controls.getObject().position);
    if (dist < 25 && t.cooldown <= 0) {
      const pos = t.object.position.clone(); pos.y += 2;
      const dir = controls.getObject().position.clone().sub(pos).normalize();

      const bulletGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8, 1, true);
      bulletGeometry.rotateX(Math.PI / 2);
      const bulletMaterial = new THREE.MeshStandardMaterial({
        color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 5,
        metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.9, depthWrite: false
      });
      const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
      bullet.position.copy(pos);
      bullet.lookAt(controls.getObject().position);
      bullet.userData.velocity = dir.multiplyScalar(0.4);
      bullet.userData.life = 10;

      scene.add(bullet);
      turretBullets.push(bullet);
      t.cooldown = 0.8;
    }
  });

  handleEnemyHits(scene, bullets, enemies, airships, turrets);

  [...enemyBullets, ...turretBullets].forEach((b, i, arr) => {
    b.position.add(b.userData.velocity);
    b.userData.life -= delta;
    if (b.userData.life <= 0) return scene.remove(b), arr.splice(i, 1);
    if (b.position.distanceTo(controls.getObject().position) < 0.6) {
  playerHealth -= enemyDamage; // use difficulty based damage
  updateHealthBar(playerHealth);
  scene.remove(b); arr.splice(i, 1);
  if (playerHealth <= 0) {
    updateHealthBar(0); alert('Game Over'); window.location.reload();
  }
}
  });

  airshipBombs.forEach((b, i) => {
    b.position.add(b.userData.velocity);
    b.userData.life -= delta;
    if (b.userData.life <= 0 || b.position.y < 0.1) {
      if (b.position.distanceTo(controls.getObject().position) < 1.5) {
        playerHealth -= 2;
        updateHealthBar(playerHealth);
        if (playerHealth <= 0) alert('Game Over'), window.location.reload();
      }
      scene.remove(b); airshipBombs.splice(i, 1);
    }
  });

  healthPacks.forEach((hp, i) => {
    hp.rotation.y += 0.01;
    if (hp.position.distanceTo(controls.getObject().position) < 2) {
      playerHealth = Math.min(20, playerHealth + 5);
      updateHealthBar(playerHealth);
      scene.remove(hp); healthPacks.splice(i, 1);
    }
  });

  turretMixers.forEach(m => m.update(delta));
  drawMinimap(camera, enemies, crystalData);
  showActivationPrompt(controls.getObject().position, crystalData);

  updateTaxiFlight(controls);
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
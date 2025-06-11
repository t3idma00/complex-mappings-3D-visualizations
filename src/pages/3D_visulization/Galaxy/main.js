import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createRingGalaxy,
  createSpiralGalaxy,
  createSolarSystem,
  updateSolarSystem,
  createTwinklingStars,
  createSpacecraft
} from './models.js';
import { setupControls, updateSpacecraftMovement,onShoot } from './control.js';
import { planetInfo } from './planetinfo.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 60);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const dateDisplay = document.getElementById('dateDisplay');
const today = new Date();
let currentDate = new Date(today);
dateDisplay.textContent = `🕒 ${currentDate.toDateString()}`;

const spiralGroup = new THREE.Group();
spiralGroup.add(createSpiralGalaxy({ starCount: 15000, radius: 30, branches: 3, spin: 1.5, randomness: 0.3, yThickness: 1.2, innerColor: '#fff5cc', outerColor: '#cc33ff' }));
spiralGroup.position.set(-40, 10, -20);
spiralGroup.rotation.set(Math.PI / 4, Math.PI / 5, 0);
scene.add(spiralGroup);

const ringGalaxies = createRingGalaxy({ countPerRing: 10000, size: 0.03, radii: [1.5, 3, 3.5], thickness: 0.7, colorStart: '#ff6030', colorEnd: '#1b3984' });
ringGalaxies.forEach((r, i) => {
  r.position.set(30, -5, 20);
  r.rotation.set(Math.PI, 0, 0);
  scene.add(r);
});

const solarSystem = createSolarSystem(scene);
const starField = createTwinklingStars(4000, 300);
scene.add(starField);

// Spacecraft
const spacecraft = createSpacecraft();
scene.add(spacecraft);
let spacecraftActive = true;

//bullet
const bullets = [];

onShoot(() => {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  bullet.position.copy(spacecraft.position);

  // Get the local forward direction (-Z)
  const direction = new THREE.Vector3(0 , 1, 0 );
  direction.applyQuaternion(spacecraft.quaternion);
  direction.normalize();

  bullet.userData.velocity = direction.multiplyScalar(1); // speed = 1 unit/frame
  scene.add(bullet);
  bullets.push(bullet);
});


// Music
const listener = new THREE.AudioListener();
camera.add(listener);
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
let musicStarted = false;
function startBackgroundMusic() {
  if (musicStarted) return;
  musicStarted = true;
  audioLoader.load('./asset/spaceSound.mp3', buffer => {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
    sound.play();
  });
}
window.addEventListener('click', startBackgroundMusic, { once: true });
window.addEventListener('keydown', startBackgroundMusic, { once: true });

// Music Control Button
const audioControlButton = document.createElement('button');
audioControlButton.textContent = 'Mute Music';
audioControlButton.style.position = 'absolute';
audioControlButton.style.bottom = '20px';
audioControlButton.style.right = '20px';
audioControlButton.style.zIndex = '1000';
document.body.appendChild(audioControlButton);
audioControlButton.onclick = () => {
  if (sound.isPlaying) {
    sound.pause();
    audioControlButton.textContent = 'Play Music';
  } else {
    sound.play();
    audioControlButton.textContent = 'Mute Music';
  }
};

// Planet Info + Spacecraft Raycast
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const popup = document.getElementById('popup');
function smoothZoomTo(pos) {
  const start = camera.position.clone();
  const target = pos.clone().add(new THREE.Vector3(10, 10, 10));
  const startTarget = controls.target.clone();
  const duration = 3000;
  const startTime = performance.now();
  function animateZoom() {
    const t = Math.min((performance.now() - startTime) / duration, 1);
    camera.position.lerpVectors(start, target, t);
    controls.target.lerpVectors(startTarget, pos, t);
    if (t < 1) requestAnimationFrame(animateZoom);
    else controls.target.copy(pos);
  }
  animateZoom();
}

window.addEventListener('click', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.far = 1000;
  const intersects = raycaster.intersectObjects(scene.children, true);
  if (intersects.length > 0) {
    const clicked = intersects.find(obj => obj.object.name?.toLowerCase());
    const name = clicked?.object.name.toLowerCase();
    if (name === 'spacecraft') {
      spacecraftActive = true;
      popup.innerHTML = `🚀 <b>Spacecraft</b><br>You are now in control! Use W/A/S/D to move.`;
      popup.style.display = 'block';
      return;
    }
    if (planetInfo[name]) {
      popup.innerHTML = planetInfo[name];
      popup.style.display = 'block';
      const planet = solarSystem[name];
      if (planet) smoothZoomTo(planet.position);
      return;
    }
  }
  popup.style.display = 'none';
});

// Controls and Animate
setupControls();
function animate() {
  requestAnimationFrame(animate);
  spiralGroup.rotation.y += 0.0012;
  ringGalaxies.forEach((r, i) => r.rotation.y += 0.0008 / (i + 1));
  updateSolarSystem(solarSystem);

  const alphaAttr = starField.userData.alphaAttr;
  for (let i = 0; i < alphaAttr.count; i++) {
    alphaAttr.setX(i, 0.5 + 0.5 * Math.sin(Date.now() * 0.001 + i * 0.5));
  }
  alphaAttr.needsUpdate = true;

  if (spacecraftActive) {
    updateSpacecraftMovement(spacecraft);
    
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
  const bullet = bullets[i];
  bullet.position.add(bullet.userData.velocity);

  if (bullet.position.length() > 300) {
    scene.remove(bullet);
    bullets.splice(i, 1);
  }
}

  controls.update();
  renderer.render(scene, camera);
}
animate();

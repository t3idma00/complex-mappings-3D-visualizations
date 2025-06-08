import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import {
  createRingGalaxy,
  createSpiralGalaxy,
  createSolarSystem,
  updateSolarSystem
} from './models.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 🌌 Spiral Galaxy
const spiralGroup = new THREE.Group();
spiralGroup.add(createSpiralGalaxy({
  starCount: 15000,
  radius: 30,
  branches: 3,
  spin: 1.5,
  randomness: 0.3,
  yThickness: 1.2,
  innerColor: '#fff5cc',
  outerColor: '#cc33ff'
}));
spiralGroup.position.set(-40, 10, -20);
spiralGroup.rotation.set(Math.PI / 4, Math.PI / 5, 0);
scene.add(spiralGroup);

// Ring Galaxy
const ringGalaxies = createRingGalaxy({
  countPerRing: 10000,
  size: 0.03,
  radii: [1.5, 3,3.5],
  thickness: 0.7,
  colorStart: '#ff6030',
  colorEnd: '#1b3984'
});
ringGalaxies.forEach(r => {
  r.position.set(30, -5, 20);
r.rotation.set(180 * Math.PI / 180, 0, 0);
scene.add(r);
});

//  Solar System at center
const solarSystem = createSolarSystem(scene);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  spiralGroup.rotation.y += 0.0012;
  ringGalaxies.forEach((r, i) => r.rotation.y += 0.0008 / (i + 1));

  updateSolarSystem(solarSystem);

  controls.update();
  renderer.render(scene, camera);
}
animate();

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

// Galaxy 1
const ring1 = createRingGalaxy({
  countPerRing: 10000,
  size: 0.025,
  radii: [1.5, 3, 4.5],
  thickness: 0.7,
  colorStart: '#ff6030',
  colorEnd: '#1b3984'
});
ring1.forEach(r => {
  r.position.set(-30, 0, 0);
  scene.add(r);
});

// Galaxy 2
const spiral1 = new THREE.Group();
spiral1.add(createSpiralGalaxy({
  starCount: 15000,
  radius: 4,
  branches: 5,
  spin: 1.8,
  randomness: 0.3,
  yThickness: 1.5,
  innerColor: '#fff5cc',
  outerColor: '#cc33ff'
}));
spiral1.position.set(-10, 0, 0);
scene.add(spiral1);

// Galaxy 3
const ring2 = createRingGalaxy({
  countPerRing: 10000,
  size: 0.025,
  radii: [1.5, 3, 4.5],
  thickness: 0.7,
  colorStart: '#ff6030',
  colorEnd: '#1b3984'
});
ring2.forEach(r => {
  r.position.set(10, 0, 0);
  scene.add(r);
});

// Galaxy 4
const spiral2 = new THREE.Group();
spiral2.add(createSpiralGalaxy({
  starCount: 15000,
  radius: 4,
  branches: 5,
  spin: 1.8,
  randomness: 0.3,
  yThickness: 1.5,
  innerColor: '#fff5cc',
  outerColor: '#cc33ff'
}));
spiral2.position.set(30, 0, 0);
scene.add(spiral2);

// Solar System in center
const solarSystem = createSolarSystem(scene);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  ring1.forEach((r, i) => r.rotation.y += 0.003 / (i + 1));
  ring2.forEach((r, i) => r.rotation.y += 0.003 / (i + 1));
  spiral1.rotation.y += 0.0012;
  spiral2.rotation.y += 0.0012;

  updateSolarSystem(solarSystem);

  controls.update();
  renderer.render(scene, camera);
}
animate();

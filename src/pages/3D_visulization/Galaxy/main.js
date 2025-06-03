import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';

// Create a scene 
const scene = new THREE.Scene();

// Set up a camera (controls what we see)
const camera = new THREE.PerspectiveCamera(
  75,                          // field of view
  window.innerWidth / window.innerHeight,  // aspect ratio
  0.1,                         // near plane
  100                          // far plane
);
camera.position.z = 10;        // Move camera back so we can see the galaxy

// Create the WebGL renderer and add to page
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls so you can rotate/zoom with mouse
const controls = new OrbitControls(camera, renderer.domElement);

//  Galaxy parameters
const parameters = {
  count: 10000,     // number of stars
  size: 0.02,       // star size
  radius: 5,        // galaxy radius
  branches: 3,      // number of spiral arms
  spin: 1,          // twist of arms
  randomness: 0.4,  // how scattered stars are
};

//  Create geometry and empty arrays for positions + colors
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(parameters.count * 3);  // x, y, z for each point
const colors = new Float32Array(parameters.count * 3);     // r, g, b for each point

// 🎨 Inside-to-outside color
const colorInside = new THREE.Color("#ff6030");
const colorOutside = new THREE.Color("#1b3984");

// 🌀 Generate spiral star positions
for (let i = 0; i < parameters.count; i++) {
  const i3 = i * 3;

  const radius = Math.random() * parameters.radius;
  const spinAngle = radius * parameters.spin;
  const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;

  const randomX = (Math.random() - 0.5) * parameters.randomness;
  const randomY = (Math.random() - 0.5) * parameters.randomness;
  const randomZ = (Math.random() - 0.5) * parameters.randomness;

  positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
  positions[i3 + 1] = randomY;
  positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

  // Color blend based on radius
  const mixedColor = colorInside.clone();
  mixedColor.lerp(colorOutside, radius / parameters.radius);

  colors[i3] = mixedColor.r;
  colors[i3 + 1] = mixedColor.g;
  colors[i3 + 2] = mixedColor.b;
}

// 🧩 Add position and color attributes to geometry
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// 💫 Create a material for the stars
const material = new THREE.PointsMaterial({
  size: parameters.size,
  sizeAttenuation: true, // make size smaller with distance
  vertexColors: true,    // color buffer
  depthWrite: false,     // fix brightness blend
  blending: THREE.AdditiveBlending // glow more
});

// 🌌 Create the particle system and add to scene
const galaxy = new THREE.Points(geometry, material);
scene.add(galaxy);

// ♻️ Animate and slowly rotate the galaxy
function animate() {
  requestAnimationFrame(animate);
  galaxy.rotation.y += 0.001; // spin the galaxy
  controls.update();          // keep orbit controls smooth
  renderer.render(scene, camera);
}
animate();

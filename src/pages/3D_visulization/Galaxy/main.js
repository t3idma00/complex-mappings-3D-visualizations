import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';

// Create a scene 
const scene = new THREE.Scene();

// Set up a camera (controls what we see)
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 10;  // move camera back

// Create the WebGL renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

// Galaxy ring parameters
const parameters = {
  countPerRing: 3000,               // stars per ring
  size: 0.025,                      // star size
  radii: [1.5, 3, 4.5],             // ring center radii
  thickness: 0.7                  // how wide each ring appears
};

// Prepare geometry buffers
const totalCount = parameters.countPerRing * parameters.radii.length;
const positions = new Float32Array(totalCount * 3);
const colors = new Float32Array(totalCount * 3);

// Color blend from red to blue
const colorStart = new THREE.Color("#ff6030");
const colorEnd = new THREE.Color("#1b3984");

let i3 = 0;
parameters.radii.forEach((baseRadius, ringIndex) => {
  for (let i = 0; i < parameters.countPerRing; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = baseRadius + (Math.random() - 0.5) * parameters.thickness;

    const x = Math.cos(angle) * radius;
    const y = (Math.random() - 0.5) * 0.5; // slight vertical spread
    const z = Math.sin(angle) * radius;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    const t = ringIndex / (parameters.radii.length - 1);
    const starColor = colorStart.clone().lerp(colorEnd, t);

    colors[i3] = starColor.r;
    colors[i3 + 1] = starColor.g;
    colors[i3 + 2] = starColor.b;

    i3 += 3;
  }
});

// Add attributes to geometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// Create the material
const material = new THREE.PointsMaterial({
  size: parameters.size,
  sizeAttenuation: true,
  vertexColors: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

// Create and add the particle system
const galaxy = new THREE.Points(geometry, material);
scene.add(galaxy);

// Animate
function animate() {
  requestAnimationFrame(animate);
  galaxy.rotation.y += 0.001; // rotate
  controls.update();
  renderer.render(scene, camera);
}
animate();

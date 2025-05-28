// main.js
import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { setupKeyControls } from './controls.js';
import { createRamp, createLaunchRamp } from './track.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd1e5);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
light.castShadow = true;
scene.add(light);

// Cannon-es Physics world
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0)
});

// Floor (Three.js)
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 20),
  new THREE.MeshStandardMaterial({ color: 0x999999 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Floor (Cannon-es)
const floorBody = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Plane(),
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// Axis Helper
const worldAxis = new THREE.AxesHelper(2);
worldAxis.position.set(0, 0.01, 0);
scene.add(worldAxis);

// Launch ramp
const launchRamp = createLaunchRamp(-3, 8.5, 0, -Math.PI / 12);
scene.add(launchRamp);

// Ball (Three.js)
const ballGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.castShadow = true;
ball.receiveShadow = true;
scene.add(ball);

// Ball (Cannon-es)
let ballBody;
function createBall() {
  if (ballBody) world.removeBody(ballBody);
  ballBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(0.3),
    position: new CANNON.Vec3(-2.2, 8.6, 0),
  });
  world.addBody(ballBody);
}
createBall();

// Goal pipe
const pipeGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 32, 1, true);
const pipeMaterial = new THREE.MeshStandardMaterial({
  color: 0x00cc88,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide
});
const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
pipe.position.set(13, 0.5, 0);
scene.add(pipe);

// Ramps and Controls
const selectableObjects = [];
const rampBodies = [];
for (let i = 0; i < 5; i++) {
  const x = i * 3;
  const y = 5 - i * 1.5;
  const z = 0;
  const ramp = createRamp(x, y, z, -Math.PI / 12);
  scene.add(ramp);
  selectableObjects.push(ramp);

  const rampBody = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.KINEMATIC, // allow manual movement
    shape: new CANNON.Box(new CANNON.Vec3(1, 0.1, 0.5)),
    position: new CANNON.Vec3(x, y, z),
  });
  rampBody.quaternion.setFromEuler(0, 0, -Math.PI / 12);
  world.addBody(rampBody);
  rampBodies.push(rampBody);
}

const controlManager = (() => {
  const keys = {};
  let target = null;
  const speed = 0.1;

  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function update() {
    if (!target) return;

    if (keys['q']) target.position.y += speed;
    if (keys['e']) target.position.y -= speed;
    if (keys['a']) target.position.x -= speed;
    if (keys['d']) target.position.x += speed;
  }

  function setTarget(object) {
    target = object;
  }

  return { update, setTarget };
})();

controlManager.setTarget(rampBodies[0]);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(selectableObjects);
  if (intersects.length > 0) {
    const selectedIndex = selectableObjects.indexOf(intersects[0].object);
    controlManager.setTarget(rampBodies[selectedIndex]);
    console.log('Selected ramp:', intersects[0].object.position);
  }
});

// Reset Button
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r') {
    createBall();
  }
});

// Animate loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  world.step(1 / 60, delta, 3);

  // Sync ball
  ball.position.copy(ballBody.position);
  ball.quaternion.copy(ballBody.quaternion);

  // Sync ramps
  rampBodies.forEach((body, i) => {
    selectableObjects[i].position.copy(body.position);
    selectableObjects[i].quaternion.copy(body.quaternion);
  });

  controlManager.update();
  controls.update();
  renderer.render(scene, camera);
}
animate();

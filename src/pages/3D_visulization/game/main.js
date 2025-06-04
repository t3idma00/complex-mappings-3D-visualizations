import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { createRamp, createLaunchRamp } from './track.js';

// Load win sound
const winSound = new Audio('./winsound.mp3');

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

// Physics world
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

// Axis helper
const worldAxis = new THREE.AxesHelper(2);
worldAxis.position.set(0, 0.01, 0);
scene.add(worldAxis);

// Launch ramp
const launchRamp = createLaunchRamp(-3, 8.5, 0, -Math.PI / 12);
scene.add(launchRamp);

// Globals
let ballBody;
let goalScored = false;
const pipeWalls = [];

// Ball (Three.js)
const ballGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.castShadow = true;
ball.receiveShadow = true;
scene.add(ball);

// Ball (Cannon-es)
function createBall() {
  if (ballBody) world.removeBody(ballBody);
  ballBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(0.3),
    position: new CANNON.Vec3(-2.2, 8.6, 0),
  });
  world.addBody(ballBody);
  goalScored = false;

  // Hide "You Won" text
  const winText = document.getElementById('winText');
  if (winText) winText.style.display = 'none';
}
createBall();

// Pipe (THREE visual)
const pipeGeometry = new THREE.CylinderGeometry(0.6, 0.6, 1, 32, 1, true);
const pipeMaterial = new THREE.MeshStandardMaterial({
  color: 0x00cc88,
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide
});
const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
pipe.position.set(13, 0.5, 0);
scene.add(pipe);

// Pipe body (Cannon trigger)
const pipeBody = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Box(new CANNON.Vec3(0.6, 0.5, 0.6)),
  position: new CANNON.Vec3(13, 0.5, 0),
  collisionResponse: false
});
world.addBody(pipeBody);

// Pipe floor
const pipeFloorBody = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Cylinder(0.55, 0.55, 0.1, 16),
  position: new CANNON.Vec3(pipeBody.position.x, pipeBody.position.y - 0.45, pipeBody.position.z),
});
world.addBody(pipeFloorBody);

// Pipe walls
const wallThickness = 0.05;
const wallHeight = 1;
const wallRadius = 0.55;

const wallPositions = [
  { x: wallRadius, z: 0 },
  { x: -wallRadius, z: 0 },
  { x: 0, z: wallRadius },
];

wallPositions.forEach(({ x, z }) => {
  const wall = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight / 2, 0.05)),
    position: new CANNON.Vec3(pipeBody.position.x + x, pipeBody.position.y, pipeBody.position.z + z),
  });
  wall.update = () => {
    wall.position.set(pipeBody.position.x + x, pipeBody.position.y, pipeBody.position.z + z);
  };
  pipeWalls.push(wall);
  world.addBody(wall);
});

// Check goal
function checkGoal() {
  if (!goalScored && ballBody.position.distanceTo(pipeBody.position) < 0.5) {
    goalScored = true;
    console.log("🎯 Ball entered the goal!");
    winSound.play();

    const winText = document.getElementById('winText');
    if (winText) winText.style.display = 'block';
  }
}

// Pipe Controller (I / J keys)
const pipeController = (() => {
  const keys = {};
  const speed = 0.1;

  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function update() {
    if (keys['j']) pipeBody.position.x -= speed;
    if (keys['l']) pipeBody.position.x += speed;
  }

  return { update };
})();

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
    type: CANNON.Body.KINEMATIC,
    shape: new CANNON.Box(new CANNON.Vec3(1, 0.1, 0.5)),
    position: new CANNON.Vec3(x, y, z),
  });
  rampBody.quaternion.setFromEuler(0, 0, -Math.PI / 12);
  world.addBody(rampBody);
  rampBodies.push(rampBody);
}

// Ramp Control Manager
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

// Click to select ramp
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

// Reset ball
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r') {
    createBall();
  }
});

// Animate
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

  // Sync pipe
  pipe.position.copy(pipeBody.position);
  pipeFloorBody.position.set(
    pipeBody.position.x,
    pipeBody.position.y - 0.45,
    pipeBody.position.z
  );
  pipeWalls.forEach(wall => wall.update());

  checkGoal();
  pipeController.update();
  controlManager.update();
  controls.update();
  renderer.render(scene, camera);
}
animate();

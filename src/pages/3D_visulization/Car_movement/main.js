import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Key tracking
let keys = {};
document.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// Ground
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Car body
const bodyGeo = new THREE.BoxGeometry(2, 0.5, 4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const car = new THREE.Mesh(bodyGeo, bodyMat);
car.position.y = 0.5;
scene.add(car);

// Add cabin on top of car body
const cabinGeo = new THREE.BoxGeometry(1.5, 0.6, 2);
const cabinMat = new THREE.MeshStandardMaterial({ color: 0x5555ff });
const cabin = new THREE.Mesh(cabinGeo, cabinMat);

cabin.position.y = 0.55;  // Slightly above the car body
cabin.position.z = 0.6;  // Moved slightly toward the back
car.add(cabin);


// Movement state
let speed = 0;
let carDirection = 0;
let steeringAngle = 0;
const maxSpeed = 0.2;
const acceleration = 0.01;
const maxSteeringAngle = 0.5;

// Car wheels
const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

let frontLeft, frontRight;
const wheels = [];

const wheelPositions = [
  [-1, -0.15, -1.5], [1, -0.15, -1.5], // front left, right
  [-1, -0.15, 1.5], [1, -0.15, 1.5]    // back left, right
];

wheelPositions.forEach((pos, index) => {
  const wheel = new THREE.Mesh(wheelGeo, wheelMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(...pos);

  car.add(wheel);  // Attach to car
  wheels.push(wheel);

  if (index === 0) frontLeft = wheel;
  if (index === 1) frontRight = wheel;
});

// Camera
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// Animate
function animate() {
  requestAnimationFrame(animate);

  // Handle steering
  if (keys["a"]) {
    steeringAngle += 0.02;
  } else if (keys["d"]) {
    steeringAngle -= 0.02;
  } else {
    steeringAngle *= 0.9;
  }

  steeringAngle = Math.max(Math.min(steeringAngle, maxSteeringAngle), -maxSteeringAngle);

  // Rotate front wheels visually
  frontLeft.rotation.y = steeringAngle;
  frontRight.rotation.y = steeringAngle;

  // Handle speed
  if (keys["s"]) {
    speed = Math.min(speed + acceleration, maxSpeed);
  } else if (keys["w"]) {
    speed = Math.max(speed - acceleration, -maxSpeed / 2);
  } else {
    speed *= 0.95;
  }

  // Turn car
  carDirection -= steeringAngle * speed * 0.5;

  // Move car
  car.position.x += Math.sin(carDirection) * speed;
  car.position.z += Math.cos(carDirection) * speed;
  car.rotation.y = -carDirection;

  renderer.render(scene, camera);
}

animate();

// Basic car setup using a cube body and four wheel cylinders in Three.js
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
ground.rotation.x = -Math.PI /2;
scene.add(ground);

// Car body
const bodyGeo = new THREE.BoxGeometry(2, 0.5, 4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const car = new THREE.Mesh(bodyGeo, bodyMat);
car.position.y = 0.5;
scene.add(car);

// Movement state
let carDirection = 0;
let speed = 0;
const maxSpeed = 0.2;
const acceleration = 0.01;
const rotationSpeed = 0.03;




// Car wheels (using cylinders)
const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
const wheels = [];

const wheelPositions = [
  [-1, 0.2, -1.5], [1, 0.2, -1.5],
  [-1, 0.2, 1.5], [1, 0.2, 1.5]
];

wheelPositions.forEach(pos => {
  const wheel = new THREE.Mesh(wheelGeo, wheelMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(...pos);
  scene.add(wheel);
  wheels.push(wheel);
});

// Camera setup
camera.position.set(5, 5, 10);
camera.lookAt(0, 0, 0);

// Render loop
function animate() {
  requestAnimationFrame(animate);

  // Movement
  if (keys["arrowup"]) {
    speed = Math.min(speed + acceleration, maxSpeed);
  } else if (keys["arrowdown"]) {
    speed = Math.max(speed - acceleration, -maxSpeed / 2);
  } else {
    speed *= 0.95;
  }

  if (keys["arrowleft"]) {
    carDirection += rotationSpeed;
  }
  if (keys["arrowright"]) {
    carDirection -= rotationSpeed;
  }

  car.position.x += Math.sin(carDirection) * speed;
  car.position.z += Math.cos(carDirection) * speed;
  car.rotation.y = -carDirection;

  wheels.forEach(wheel => {
    wheel.position.x += Math.sin(carDirection) * speed;
    wheel.position.z += Math.cos(carDirection) * speed;
    wheel.rotation.y += speed * 5;
  });

  renderer.render(scene, camera);
}




animate();

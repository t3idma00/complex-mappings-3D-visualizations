// main.js
import * as THREE from 'three';
import { createAstronaut, createRocket } from './models.js';

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xACACFF);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x404040));

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
light.castShadow = true;
scene.add(light);

const topLight = new THREE.DirectionalLight(0xffffff, 0.8);
topLight.position.set(0, 30, 0);
topLight.castShadow = true;
scene.add(topLight);

const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load('grass.jpg');
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(50, 50);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ map: grassTexture })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const astronaut = createAstronaut();
astronaut.castShadow = true;
astronaut.position.y = 0.5;
scene.add(astronaut);

const rocket = createRocket();
rocket.position.set(10, 0, -5);
scene.add(rocket);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

let isInRocket = false;

// Pointer lock
document.body.addEventListener("click", () => {
  document.body.requestPointerLock();
});
document.addEventListener("pointerlockchange", () => {
  const instruction = document.getElementById("instruction");
  if (instruction) instruction.style.display = document.pointerLockElement === document.body ? "none" : "block";
});

let keysPressed = {};
document.addEventListener("keydown", e => keysPressed[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keysPressed[e.key.toLowerCase()] = false);

let rotationY = 0;
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    rotationY -= event.movementX * 0.01;
  }
});

let velocityY = 0;
const gravity = -0.001;

function astronautMovement() {
  const speed = 0.1;
  const forward = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const right = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));

  function move(dir, backward = false) {
    const step = dir.clone().multiplyScalar(backward ? -speed : speed);
    astronaut.position.add(step);
  }

  if (keysPressed["w"]) {
    move(forward);
    if (astronaut.position.y <= 0.5) velocityY = 0.02;
  }
  if (keysPressed["s"]) move(forward, true);
  if (keysPressed["a"]) move(right);
  if (keysPressed["d"]) move(right, true);

  if (keysPressed["q"]) velocityY += 0.002;
  if (keysPressed["e"]) velocityY -= 0.01;

  velocityY += gravity;
  astronaut.position.y += velocityY;
  if (astronaut.position.y < 0.5) {
    astronaut.position.y = 0.5;
    velocityY = 0;
  }

  // Check if near rocket and press 'e'
  const distanceToRocket = astronaut.position.distanceTo(rocket.position);
  if (distanceToRocket < 2 && keysPressed['e']) {
    isInRocket = true;
    astronaut.visible = false;
    rocket.add(camera);
    camera.position.set(0, 2, 5);
    camera.lookAt(new THREE.Vector3(0, 2, 0));
  }
}

function rocketMovement() {
  if (keysPressed['w']) {
    rocket.position.y += 0.1;
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (isInRocket) {
    rocketMovement();
  } else {
    astronautMovement();
    astronaut.rotation.y = rotationY;

    const distance = 8, height = 4;
    const offsetX = Math.sin(rotationY) * distance;
    const offsetZ = Math.cos(rotationY) * distance;
    camera.position.set(
      astronaut.position.x - offsetX,
      astronaut.position.y + height,
      astronaut.position.z - offsetZ
    );
    camera.lookAt(astronaut.position);
  }

  renderer.render(scene, camera);
}

animate();

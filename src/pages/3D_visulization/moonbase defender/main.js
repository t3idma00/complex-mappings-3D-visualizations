import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { setupControls } from './controls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xaaaaaa, 0x000000, 1));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

const moonTexture = new THREE.TextureLoader().load('./assets/textures/moon.jpg');
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshBasicMaterial({ map: moonTexture })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

let muzzle = null;
const loader = new GLTFLoader();
loader.load('./assets/models/gun.glb', (gltf) => {
  const gunModel = gltf.scene;
  gunModel.scale.set(0.3, 0.2, 0.3);
  gunModel.position.set(0.2, -0.2, -0.7);
  gunModel.rotation.y = Math.PI;

  muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.04, -1);
  gunModel.add(muzzle);

  camera.add(gunModel);
}, undefined, (error) => {
  console.error('Failed to load gun model:', error);
});

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());
setupControls(controls, camera);

document.body.addEventListener('click', () => {
  controls.lock();
});

const bullets = [];
const shootDirection = new THREE.Vector3();

// Audio setup
const listener = new THREE.AudioListener();
camera.add(listener);
const shootSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('./assets/sounds/shoot.mp3', buffer => {
  shootSound.setBuffer(buffer);
  shootSound.setVolume(0.5);
});

window.addEventListener('click', () => {
  if (!controls.isLocked || !muzzle) return;

  const muzzleWorld = new THREE.Vector3();
  muzzle.getWorldPosition(muzzleWorld);

  camera.getWorldDirection(shootDirection);

  const geometry = new THREE.SphereGeometry(0.05, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const bullet = new THREE.Mesh(geometry, material);

  bullet.position.copy(muzzleWorld);
  bullet.userData.velocity = shootDirection.clone().multiplyScalar(0.8);

  scene.add(bullet);
  bullets.push(bullet);

  if (shootSound?.isPlaying) shootSound.stop();
  shootSound?.play();
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.position.add(bullet.userData.velocity);

    if (bullet.position.length() > 100) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  }
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

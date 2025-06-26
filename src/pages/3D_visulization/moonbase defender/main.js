import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
import { setupControls } from './controls.js';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xaaaaaa, 0x000000, 1));
const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

// Moon terrain
const moonTexture = new THREE.TextureLoader().load('./assets/textures/moon.jpg');
moonTexture.wrapS = moonTexture.wrapT = THREE.RepeatWrapping;
moonTexture.repeat.set(10, 10);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshBasicMaterial({ map: moonTexture })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Controls
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());
const rockColliders = [];
setupControls(controls, camera, rockColliders);

document.body.addEventListener('click', () => controls.lock());

// Gun setup
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
}, undefined, console.error);

// Bullets
const bullets = [];
const enemyBullets = [];
const shootDirection = new THREE.Vector3();
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

  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );

  bullet.position.copy(muzzleWorld);
  bullet.userData.velocity = shootDirection.clone().multiplyScalar(0.8);
  scene.add(bullet);
  bullets.push(bullet);

  if (shootSound.isPlaying) shootSound.stop();
  shootSound.play();
});

// Rocks + red cylinder colliders
const rockPositions = [
  { x: 10, y: 0, z: -15 },
  { x: -20, y: 0, z: 5 },
  { x: 30, y: 0, z: 20 },
  { x: -35, y: 0, z: -25 },
];

const rockLoader = new GLTFLoader();
rockLoader.load('./assets/models/rock.glb', (gltf) => {
  const rockModel = gltf.scene;
  rockPositions.forEach(pos => {
    const rock = rockModel.clone(true);
    rock.position.set(pos.x, 0.25, pos.z);
    rock.scale.setScalar(0.5);
    rock.rotation.y = Math.random() * Math.PI * 2;
    scene.add(rock);

    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7, 8, 5),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    cylinder.position.set(pos.x, 2.5, pos.z);
    scene.add(cylinder);

    rockColliders.push({ position: cylinder.position.clone(), radius: 7 });
  });
});

// Enemy + animation + follow player
let enemy;
let enemyMixer = null;
const enemyLoader = new GLTFLoader();
enemyLoader.load('./assets/models/enemy1.glb', (gltf) => {
  enemy = gltf.scene;
  enemy.scale.set(0.1, 0.1, 0.1);
  enemy.position.set(5, 0, -10);
  enemy.rotation.y = Math.PI;
  scene.add(enemy);

  enemyMixer = new AnimationMixer(enemy);
  const clip = gltf.animations[0];
  const action = enemyMixer.clipAction(clip);
  action.play();

  // Shoot from enemy eye
  setInterval(() => {
    if (!enemy) return;

    const eyePosition = enemy.position.clone();
    eyePosition.y += 5;
    eyePosition.z -= 0.1;

    const direction = controls.getObject().position.clone().sub(eyePosition).normalize();

    const bulletMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 5,
      metalness: 0.8,
      roughness: 0.1
    });

    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      bulletMaterial
    );

    bullet.position.copy(eyePosition);
    bullet.userData.velocity = direction.multiplyScalar(0.08);
    scene.add(bullet);
    enemyBullets.push(bullet);
  }, 2000);
});

// Animation loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  controls.update();

  if (enemyMixer) enemyMixer.update(delta);

  if (enemy) {
    const playerPos = controls.getObject().position.clone();
    const dir = playerPos.clone().sub(enemy.position);
    dir.y = 0;
    if (dir.length() > 1) {
      dir.normalize();
      enemy.position.add(dir.multiplyScalar(0.02));
      enemy.lookAt(playerPos.x, enemy.position.y, playerPos.z);
    }
  }

  bullets.forEach((bullet, i) => {
    bullet.position.add(bullet.userData.velocity);
    if (bullet.position.length() > 100) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  });

  enemyBullets.forEach((bullet, i) => {
    bullet.position.add(bullet.userData.velocity);
    if (bullet.position.distanceTo(controls.getObject().position) < 0.6) {
      console.log('💥 Player hit by enemy!');
      scene.remove(bullet);
      enemyBullets.splice(i, 1);
    }
    if (bullet.position.length() > 100) {
      scene.remove(bullet);
      enemyBullets.splice(i, 1);
    }
  });

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

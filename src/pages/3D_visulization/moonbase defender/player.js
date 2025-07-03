import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let muzzle = null;
let shootSound = null;

export function setupPlayer(scene, camera) {
  const bullets = [], turretBullets = [], enemyBullets = [], airshipBombs = [], enemies = [], airships = [];

  const listener = new THREE.AudioListener();
  camera.add(listener);
  shootSound = new THREE.Audio(listener);

  new THREE.AudioLoader().load('./assets/sounds/shoot.mp3', buffer => {
    shootSound.setBuffer(buffer);
    shootSound.setVolume(0.5);
  });

  new GLTFLoader().load('./assets/models/gun.glb', gltf => {
    const gun = gltf.scene;
    gun.scale.set(0.3, 0.2, 0.3);
    gun.position.set(0.2, -0.2, -0.7);
    gun.rotation.y = Math.PI;
    muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.04, -1);
    gun.add(muzzle);
    camera.add(gun);
  });

  return {
    bullets,
    turretBullets,
    enemyBullets,
    airshipBombs,
    enemies,
    airships,
    shootSound
  };
}

export function getMuzzle() {
  return muzzle;
}

export function handleShooting(scene, camera, bullets, shootSound) {
  const shootDirection = new THREE.Vector3();
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
}

export function handleCrystalActivation(playerPos) {
  let activatedAny = false;
  for (const data of window.crystalData || []) {
    if (!data.activated && data.object.position.distanceTo(playerPos) < 6) {
      data.activated = true;
      activatedAny = true;
      data.object.traverse(child => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color.set(0x00ff99);
          child.material.opacity = 0.6;
          child.material.transparent = true;
          child.material.emissive.set(0x00ff99);
          child.material.emissiveIntensity = 0.3;
        }
      });
    }
  }
  return activatedAny;
}

export function updateHealthBar(health) {
  const bar = document.getElementById('health-bar');
  const percent = (health / 20) * 100;
  bar.style.width = percent + '%';
  bar.style.backgroundColor = percent < 20 ? 'red' : percent < 40 ? 'orange' : 'limegreen';
}

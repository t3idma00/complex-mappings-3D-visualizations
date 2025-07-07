import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let muzzle = null;
let muzzle2 = null;
let shootSound = null;
let taxi = null;
let taxiActivated = false;
let enteredTaxi = false;
let currentWeapon = 'gun1';

let gun1, gun2;

export function setupPlayer(scene, camera) {
  const bullets = [], turretBullets = [], enemyBullets = [], airshipBombs = [], enemies = [], airships = [];

  const listener = new THREE.AudioListener();
  camera.add(listener);
  shootSound = new THREE.Audio(listener);
  new THREE.AudioLoader().load('./assets/sounds/shoot.mp3', buffer => {
    shootSound.setBuffer(buffer);
    shootSound.setVolume(0.5);
  });

  // Load Gun 1
  new GLTFLoader().load('./assets/models/gun.glb', gltf => {
    gun1 = gltf.scene;
    gun1.scale.set(0.3, 0.2, 0.3);
    gun1.position.set(0.2, -0.2, -0.7);
    gun1.rotation.y = Math.PI;
    muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.04, -1);
    gun1.add(muzzle);
    camera.add(gun1);
  });

  // Load Gun 2
  new GLTFLoader().load('./assets/models/gun2.glb', gltf => {
    gun2 = gltf.scene;
    gun2.scale.set(0.3, 0.2, 0.3);
    gun2.position.set(0.2, -0.15, -0.3);
    gun2.rotation.set(THREE.MathUtils.degToRad(3), Math.PI / 2, 0);

    gun2.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    muzzle2 = new THREE.Object3D();
    muzzle2.position.set(0.5, 0.04, 0); // ⬅ adjust if still not at the tip
    gun2.add(muzzle2);

    gun2.visible = false;
    camera.add(gun2);
  });

  // Weapon Switching
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Digit1') {
      currentWeapon = 'gun1';
      if (gun1) gun1.visible = true;
      if (gun2) gun2.visible = false;
    }
    if (e.code === 'Digit2') {
      currentWeapon = 'gun2';
      if (gun1) gun1.visible = false;
      if (gun2) gun2.visible = true;
    }

    const ui = document.getElementById('weapon-indicator');
    if (ui) ui.textContent = `🔫 ${currentWeapon.toUpperCase()}`;
  });

  loadTaxiModel(scene);
  setupCrystalCounter();

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

function loadTaxiModel(scene) {
  new GLTFLoader().load('./assets/models/Taxi.glb', gltf => {
    taxi = gltf.scene;
    taxi.scale.set(4, 4, 4);
    taxi.position.set(500, 0, -500);
    taxi.visible = false;
    scene.add(taxi);
  });
}

function setupCrystalCounter() {
  if (!document.getElementById('crystal-counter')) {
    const counterDiv = document.createElement('div');
    counterDiv.id = 'crystal-counter';
    counterDiv.style.cssText = 'position:fixed;top:20px;right:20px;color:white;font-size:20px;z-index:1000;font-family:monospace';
    document.body.appendChild(counterDiv);
  }
  updateCrystalCounter();
}

function updateCrystalCounter() {
  const count = (window.crystalData || []).filter(d => d.activated).length;
  const total = (window.crystalData || []).length;
  document.getElementById('crystal-counter').textContent = `Crystals Activated: ${count} / ${total}`;
}

export function getMuzzle() {
  return currentWeapon === 'gun1' ? muzzle : muzzle2;
}

export function handleShooting(scene, camera, bullets, shootSound) {
  const shootDirection = new THREE.Vector3();
  const muzzleWorld = new THREE.Vector3();
  const activeMuzzle = getMuzzle();
  activeMuzzle.getWorldPosition(muzzleWorld);
  camera.getWorldDirection(shootDirection);

  let bullet;
  if (currentWeapon === 'gun1') {
    bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
  } else if (currentWeapon === 'gun2') {
    const waveGeometry = new THREE.RingGeometry(0.1, 0.2, 32);
    const waveMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    bullet = new THREE.Mesh(waveGeometry, waveMaterial);
    bullet.quaternion.copy(camera.quaternion); // make it face forward

    // bullet.rotation.x = Math.PI / 2;
    bullet.userData.pulse = true;
    bullet.userData.scaleDir = 1;
  }

  bullet.position.copy(muzzleWorld);
  bullet.userData.velocity = shootDirection.clone().multiplyScalar(0.8);
  bullet.userData.life = 10;
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

  if (activatedAny) updateCrystalCounter();

  if (!taxiActivated && window.crystalData.every(d => d.activated)) {
    taxiActivated = true;
    taxi.visible = true;
    const msg = document.createElement('div');
    msg.id = 'taxi-msg';
    msg.textContent = ' All crystals activated. Find the spaceship!';
    msg.style.cssText = 'position:fixed;top:60px;right:20px;font-family:monospace;font-size:18px;color:#0f0;background:#000a;padding:10px;border-radius:6px;z-index:1000';
    document.body.appendChild(msg);
  }

  return activatedAny;
}

export function updateHealthBar(health) {
  const bar = document.getElementById('health-bar');
  const percent = (health / 20) * 100;
  bar.style.width = percent + '%';
  bar.style.backgroundColor = percent < 20 ? 'red' : percent < 40 ? 'orange' : 'limegreen';
}

export function handleTaxiInteraction(playerPos) {
  if (enteredTaxi || !taxiActivated || !taxi) return;

  const dist = taxi.position.distanceTo(playerPos);
  if (dist < 6) {
    enteredTaxi = true;
    const msg = document.getElementById('taxi-msg');
    if (msg) msg.textContent = '🚀 Boarding spaceship...';

    let t = 0;
    const flyInterval = setInterval(() => {
      taxi.position.y += 0.5;
      t += 1;
      if (t > 100) {
        clearInterval(flyInterval);
        alert('🎉 You escaped the Moonbase! Game Completed.');
        window.location.reload();
      }
    }, 50);
  }
}

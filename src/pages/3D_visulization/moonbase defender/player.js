
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { updateCrystalCounter } from './ui.js';

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

  new GLTFLoader().load('./assets/models/gun2.glb', gltf => {
    gun2 = gltf.scene;
    gun2.scale.set(0.3, 0.2, 0.3);
    gun2.position.set(0.2, -0.15, -0.3);
    gun2.rotation.set(THREE.MathUtils.degToRad(3), Math.PI / 2, 0);
    muzzle2 = new THREE.Object3D();
    muzzle2.position.set(0.5, 0.04, 0);
    gun2.add(muzzle2);
    gun2.visible = false;
    camera.add(gun2);
  });

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

  return { bullets, turretBullets, enemyBullets, airshipBombs, enemies, airships, shootSound };
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
  } else {
    bullet = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.015, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 })
    );
    bullet.rotation.x = Math.PI;
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
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          if (child.material.color) child.material.color.set(0x00ff99);
          child.material.opacity = 0.6;
          child.material.transparent = true;
          if (child.material.emissive) child.material.emissive.set(0x00ff99);
          child.material.emissiveIntensity = 0.3;
        }
      });
    }
  }
  if (activatedAny) updateCrystalCounter();
  const allActivated = window.crystalData.every(d => d.activated);
  if (!taxiActivated && allActivated && !window.taxi) {
    taxiActivated = true;
    handleTaxiInteraction(playerPos);
  }
  return activatedAny;
}

export function updateHealthBar(health) {
  const bar = document.getElementById('health-bar');
  const percent = (health / 20) * 100;
  bar.style.width = percent + '%';
  bar.style.backgroundColor = percent < 20 ? 'red' : percent < 40 ? 'orange' : 'limegreen';
}

export function handleTaxiInteraction(playerPosition) {
  if (window.taxi || taxiActivated) return;

  const loader = new GLTFLoader();
  loader.load('./assets/models/Taxi.glb', gltf => {
    const model = gltf.scene;
    model.scale.set(3, 3, 3);
    const startPos = playerPosition.clone().add(new THREE.Vector3(25, 80, 0));
    const offset = new THREE.Vector3(350, -4, -150);
    const endPos = playerPosition.clone().add(offset);
    model.position.copy(startPos);
    model.userData.endPos = endPos;
    model.userData.hasLanded = false;
    window.taxi = model;
    window.scene.add(model);
    const el = document.createElement('div');
    el.id = 'taxi-msg';
    el.textContent = '🚀 Taxi incoming! Wait for landing...';
    el.style.cssText = 'position:fixed;top:60px;right:20px;font-family:monospace;font-size:18px;color:#0f0;background:#000a;padding:10px;border-radius:6px;z-index:1000';
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 6000);
  });
}

export function updateTaxiFlight(controls) {
  const player = controls.getObject();
  if (window.taxi && window.taxi.userData) {
    const endPos = window.taxi.userData.endPos;
    const taxiPos = window.taxi.position;
    if (!window.taxi.userData.hasLanded && taxiPos.y > endPos.y) {
      taxiPos.y -= 0.3;
      if (taxiPos.y <= endPos.y) {
        taxiPos.y = endPos.y;
        window.taxi.userData.hasLanded = true;
      }
    }
    if (window.taxi.userData.hasLanded && !enteredTaxi) {
      const dist = taxiPos.distanceTo(player.position);
      if (dist < 5) {
        if (!document.getElementById('enter-taxi-msg')) {
          const el = document.createElement('div');
          el.id = 'enter-taxi-msg';
          el.textContent = ' Press E to enter the taxi';
          el.style.cssText = 'position:fixed;top:100px;right:20px;font-family:monospace;font-size:18px;color:#0ff;background:#000a;padding:10px;border-radius:6px;z-index:1000';
          document.body.appendChild(el);
        }
      } else {
        const existing = document.getElementById('enter-taxi-msg');
        if (existing) existing.remove();
      }
      if (dist < 5 && window.keyEPressedToEnter) {
        enteredTaxi = true;
        controls.unlock();
        if (gun1) gun1.visible = false;
        if (gun2) gun2.visible = false;
        player.position.copy(taxiPos).add(new THREE.Vector3(0, 2, 0));
        window.scene.attach(player);
        const winText = document.createElement('div');
        winText.textContent = 'You escaped the Moon Base! You Win!';
        winText.style.cssText = 'position:fixed;top:100px;right:20px;font-family:monospace;font-size:24px;color:#00ff88;background:#000a;padding:12px;border-radius:6px;z-index:1000';
        document.body.appendChild(winText);
        const enterMsg = document.getElementById('enter-taxi-msg');
        if (enterMsg) enterMsg.remove();
      }
    }
  }
  if (enteredTaxi && window.taxi) {
    window.taxi.position.y += 0.5;
    controls.getObject().position.y += 0.5;
  }
}

window.keyEPressedToEnter = false;
window.addEventListener('keydown', e => {
  if (e.code === 'KeyE') window.keyEPressedToEnter = true;
});
window.addEventListener('keyup', e => {
  if (e.code === 'KeyE') window.keyEPressedToEnter = false;
});

import * as THREE from 'three';

const keys = { w: false, a: false, s: false, d: false };

let shootCallback = null;

export function setupControls() {
  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = true;
    if (key === ' ' && shootCallback) shootCallback(); // spacebar = shoot
  });

  window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = false;
  });
}

export function onShoot(callback) {
  shootCallback = callback;
}

export function updateSpacecraftMovement(spacecraft) {
  const speed = 0.1;
  if (keys.w) spacecraft.position.z -= speed;
  if (keys.s) spacecraft.position.z += speed;
  if (keys.a) spacecraft.position.x -= speed;
  if (keys.d) spacecraft.position.x += speed;
}

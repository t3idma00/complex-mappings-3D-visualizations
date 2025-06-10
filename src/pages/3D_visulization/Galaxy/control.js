// === control.js ===
import * as THREE from 'three';

const keys = { w: false, a: false, s: false, d: false };

export function setupControls() {
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', e => {
    if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false;
  });
}

export function updateSpacecraftMovement(spacecraft) {
  const speed = 0.1;
  if (keys.w) spacecraft.position.z -= speed;
  if (keys.s) spacecraft.position.z += speed;
  if (keys.a) spacecraft.position.x -= speed;
  if (keys.d) spacecraft.position.x += speed;
}




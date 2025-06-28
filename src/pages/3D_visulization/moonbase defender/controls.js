import * as THREE from 'three';

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const move = { forward: false, backward: false, left: false, right: false };
let canJump = false;

export function setupControls(controls, camera, rockColliders) {
  document.addEventListener('keydown', e => {
    switch (e.code) {
      case 'KeyW': move.forward = true; break;
      case 'KeyA': move.left = true; break;
      case 'KeyS': move.backward = true; break;
      case 'KeyD': move.right = true; break;
      case 'Space':
        if (canJump) velocity.y += 30; // Higher jump for Moon effect
        canJump = false;
        break;
    }
  });

  document.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': move.forward = false; break;
      case 'KeyA': move.left = false; break;
      case 'KeyS': move.backward = false; break;
      case 'KeyD': move.right = false; break;
    }
  });

  controls.update = function () {
    const delta = 0.05;
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 1.62 * 2.0 * delta; // Reduced gravity for Moon
    velocity.y *= 0.98;

    direction.z = Number(move.forward) - Number(move.backward);
    direction.x = Number(move.right) - Number(move.left);
    direction.normalize();

    if (move.forward || move.backward) velocity.z -= direction.z * 40.0 * delta;
    if (move.left || move.right) velocity.x -= direction.x * 40.0 * delta;

    const player = controls.getObject();
    const playerRadius = 0.6;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveX = right.clone().multiplyScalar(-velocity.x * delta);
    const moveZ = forward.clone().multiplyScalar(-velocity.z * delta);

    const nextPosX = player.position.clone().add(moveX);
    const blockedX = rockColliders.some(({ position, radius }) =>
      position.distanceTo(nextPosX) < playerRadius + radius
    );
    if (!blockedX) player.position.add(moveX);

    const nextPosZ = player.position.clone().add(moveZ);
    const blockedZ = rockColliders.some(({ position, radius }) =>
      position.distanceTo(nextPosZ) < playerRadius + radius
    );
    if (!blockedZ) player.position.add(moveZ);

    camera.position.y += velocity.y * delta;
    if (camera.position.y < 2) {
      velocity.y = 0;
      camera.position.y = 2;
      canJump = true;
    }
  };
}

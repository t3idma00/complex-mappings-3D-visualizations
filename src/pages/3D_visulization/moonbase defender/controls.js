import * as THREE from 'three';

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const move = { forward: false, backward: false, left: false, right: false };
let canJump = false;

export function setupControls(controls, camera) {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  function onKeyDown(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': move.forward = true; break;
      case 'ArrowLeft':
      case 'KeyA': move.left = true; break;
      case 'ArrowDown':
      case 'KeyS': move.backward = true; break;
      case 'ArrowRight':
      case 'KeyD': move.right = true; break;
      case 'Space':
        if (canJump) velocity.y += 5;
        canJump = false;
        break;
    }
  }

  function onKeyUp(event) {
    switch (event.code) {
      case 'KeyW': move.forward = false; break;
      case 'KeyA': move.left = false; break;
      case 'KeyS': move.backward = false; break;
      case 'KeyD': move.right = false; break;
    }
  }

  controls.update = function () {
    const delta = 0.05;
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 9.8 * 5.0 * delta;

    direction.z = Number(move.forward) - Number(move.backward);
    direction.x = Number(move.right) - Number(move.left);
    direction.normalize();

    if (move.forward || move.backward) velocity.z -= direction.z * 40.0 * delta;
    if (move.left || move.right) velocity.x -= direction.x * 40.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    camera.position.y += velocity.y * delta;
    if (camera.position.y < 2) {
      velocity.y = 0;
      camera.position.y = 2;
      canJump = true;
    }
  };
}

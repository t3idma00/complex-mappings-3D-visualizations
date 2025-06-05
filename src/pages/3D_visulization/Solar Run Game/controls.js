import * as THREE from 'three';

export function setupPlayerControls(playerGroup, camera, domElement) {
  const keys = {};
  let rotationY = 0;
  let pitchObject = new THREE.Object3D();
  let yawObject = new THREE.Object3D();
  yawObject.position.y = 2;
  yawObject.add(pitchObject);
  pitchObject.add(camera);

  camera.position.set(0, 0, 0); // attach directly to pitch
  playerGroup.add(yawObject); // attach camera pivot to player

  let velocityY = 0;
  const gravity = -0.01;
  const speed = 0.07;
  let isJumping = false;
  let hopPower = 0.07;

  // Input listeners
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'w' && !isJumping) {
      velocityY = hopPower; // add hop
      isJumping = true;
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  domElement.addEventListener("click", () => {
    document.body.requestPointerLock();
  });

  // Mouse movement: pitch (up/down), yaw (left/right)
  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === document.body) {
      yawObject.rotation.y -= event.movementX * 0.002;
      pitchObject.rotation.x -= event.movementY * 0.002;
      pitchObject.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, pitchObject.rotation.x));
    }
  });

  function update() {
    // Direction from yawObject
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yawObject.quaternion).setY(0).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yawObject.quaternion).setY(0).normalize();

    // Movement
    if (keys["w"]) playerGroup.position.add(forward.clone().multiplyScalar(speed));
    if (keys["s"]) playerGroup.position.add(forward.clone().multiplyScalar(-speed));
    if (keys["a"]) playerGroup.position.add(right.clone().multiplyScalar(-speed));
    if (keys["d"]) playerGroup.position.add(right.clone().multiplyScalar(speed));

    // Manual vertical controls (optional)
    if (keys["q"]) velocityY += 0.02;
    if (keys["e"]) velocityY -= 0.02;

    // Gravity
    velocityY += gravity;
    playerGroup.position.y += velocityY;

    if (playerGroup.position.y < 0.5) {
      playerGroup.position.y = 0.5;
      velocityY = 0;
      isJumping = false;
    }

    // Rotate astronaut body to face direction
    playerGroup.rotation.y = yawObject.rotation.y;
  }

  return { update };
}

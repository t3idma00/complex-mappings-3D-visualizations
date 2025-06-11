import * as THREE from 'three';

export function createRamp(x = 0, y = 0, z = 0, rotation = -Math.PI / 12) {
  const geometry = new THREE.BoxGeometry(2, 0.2, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x885522 });
  const ramp = new THREE.Mesh(geometry, material);
  ramp.position.set(x, y, z);
  ramp.rotation.z = rotation; // slope to +X
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  return ramp;
}

export function createLaunchRamp(x = 0, y = 0, z = 0, rotation = -Math.PI / 12) {
  const geometry = new THREE.BoxGeometry(2, 0.2, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x993333 }); // red-brown
  const ramp = new THREE.Mesh(geometry, material);
  ramp.position.set(x, y, z);
  ramp.rotation.z = rotation;
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  return ramp;
}

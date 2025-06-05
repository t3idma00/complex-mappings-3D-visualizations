import * as THREE from 'three';

export function createAstronaut() {
  const astronaut = new THREE.Group();

  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2cc });     // cream
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff3333 });     // red
  const limbMat = new THREE.MeshStandardMaterial({ color: 0x3333ff });     // blue trousers
  const armMat  = new THREE.MeshStandardMaterial({ color: 0xfff2cc });     // cream arms

  // Body (shirt)
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.5), bodyMat);
  body.position.y = 1;
  astronaut.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), headMat);
  head.position.y = 2;
  astronaut.add(head);

  // Arms
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), armMat);
  leftArm.position.set(-0.65, 1, 0);
  astronaut.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.65;
  astronaut.add(rightArm);

  // Legs (blue)
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), limbMat);
  leftLeg.position.set(-0.3, 0, 0);
  astronaut.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.3;
  astronaut.add(rightLeg);

  return astronaut;
}

export function createRocket() {
  const rocket = new THREE.Group();

const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff }); // pure white
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 32), bodyMaterial);
  body.position.y = 2;
  rocket.add(body);

  const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 32), coneMaterial);
  nose.position.y = 4.6;
  rocket.add(nose);

  const finMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const fin1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.8), finMaterial);
  fin1.position.set(0.5, 0.3, 0);
  rocket.add(fin1);

  const fin2 = fin1.clone();
  fin2.position.x = -0.5;
  rocket.add(fin2);

  const fin3 = fin1.clone();
  fin3.rotation.y = Math.PI / 2;
  fin3.position.set(0, 0.3, 0.5);
  rocket.add(fin3);

  const fin4 = fin3.clone();
  fin4.position.z = -0.5;
  rocket.add(fin4);

  return rocket;
}

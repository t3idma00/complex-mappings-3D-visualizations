import * as THREE from 'three';

export function createTrack(scene) {
  const trackGroup = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x222266 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x333399 });

  const trackWidth = 6;
  const wallHeight = 0.5;
  const wallThickness = 0.1;

  function addWalls(mesh) {
    const depth = mesh.geometry.parameters.depth;
    const width = mesh.geometry.parameters.width;

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, depth),
      wallMaterial
    );
    const rightWall = leftWall.clone();

    leftWall.position.set(-width / 2 + wallThickness / 2, wallHeight / 2, 0);
    rightWall.position.set(width / 2 - wallThickness / 2, wallHeight / 2, 0);

    mesh.add(leftWall);
    mesh.add(rightWall);
  }

  // Track 1 - Flat Start
  const track1 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, 6), material);
  track1.position.set(0, 0, 0);
  addWalls(track1);
  trackGroup.add(track1);

  // Track 2 - Ramp
  const track2 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, 4), material);
  track2.rotation.x = -Math.PI / 10;
  track2.position.set(0, -0.6, -4.5);
  addWalls(track2);
  trackGroup.add(track2);

  // Track 3 - Flat
  const track3 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, 6), material);
  track3.position.set(0, -1, -9.5);
  addWalls(track3);
  trackGroup.add(track3);

  // Track 4 - Downward Slope
  const track4 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, 5), material);
  track4.rotation.x = -Math.PI / 12;
  track4.position.set(0, -1.5, -14.5);
  addWalls(track4);
  trackGroup.add(track4);

  // Track 5 - Final Flat
  const track5 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, 5), material);
  track5.position.set(0, -2.0, -19);
  addWalls(track5);
  trackGroup.add(track5);

   // Track 6 - Start of right turn
  const track6Depth = 3;
  const track6 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, track6Depth), material);
  track6.rotation.y = -Math.PI / 2;
  track6.position.set(trackWidth / 2 + track6Depth / 2, -2.0, -21);
  addWalls(track6);
  trackGroup.add(track6);

  // Curve Piece 1 -30°
  const curve1 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, 2), material);
  curve1.rotation.y = -Math.PI / 6; // -30°
  curve1.position.set(trackWidth * 0.85, -2.0, -22.5);
  addWalls(curve1);
  trackGroup.add(curve1);

  // Curve Piece 2 -60°
  const curve2 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, 2), material);
  curve2.rotation.y = -Math.PI / 3; // -60°
  curve2.position.set(trackWidth * 1.45, -2.0, -22.5);
  addWalls(curve2);
  trackGroup.add(curve2);

  // Curve Piece 3 -90°
  const curve3 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, 2), material);
  curve3.rotation.y = -Math.PI / 2; // -90°
  curve3.position.set(trackWidth * 2.1, -2.0, -21.5);
  addWalls(curve3);
  trackGroup.add(curve3);

  // Track 7 - Final straight (X direction)
  const track7Depth = 6;
  const track7 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.2, track7Depth), material);
  track7.rotation.y = -Math.PI / 2;
  track7.position.set(trackWidth * 2.5 + track7Depth / 2, -2.0, -21.5);
  addWalls(track7);
  trackGroup.add(track7);


  scene.add(trackGroup);
}

export function createPlanet(scene, { name = 'Planet', position = new THREE.Vector3(0, 1, 0) }) {
  const geometry = new THREE.SphereGeometry(0.3, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0x44aaff });
  const planet = new THREE.Mesh(geometry, material);
  planet.name = name;
  planet.castShadow = true;
  planet.position.copy(position);
  scene.add(planet);
}

export function createGoalPortal(scene, position = new THREE.Vector3(0, 0.2, -5)) {
  const geometry = new THREE.TorusGeometry(0.5, 0.05, 16, 100);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffdd55,
    emissive: 0xffaa00,
    emissiveIntensity: 1,
  });
  const portal = new THREE.Mesh(geometry, material);
  portal.position.copy(position);
  portal.rotation.x = Math.PI / 2;
  portal.receiveShadow = false;
  scene.add(portal);
}

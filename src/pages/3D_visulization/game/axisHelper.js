import * as THREE from 'three';

export function createAxisHelperOverlay(mainCamera) {
  const scene = new THREE.Scene();

  // Camera looking from front-bottom-right
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
  camera.position.set(1.5, 1.5, 1.5);  // better viewing angle
  camera.lookAt(0, 0, 0);

  // Thicker Axes
  const axesLength = 1.2;
  const axesHelper = new THREE.AxesHelper(axesLength);
  scene.add(axesHelper);

  // Line materials for bold axis look (optional)
  const materialX = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const materialY = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const materialZ = new THREE.LineBasicMaterial({ color: 0x0000ff });

  // Axis lines (explicit)
  const pointsX = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(axesLength, 0, 0)];
  const pointsY = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axesLength, 0)];
  const pointsZ = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axesLength)];

  const lineX = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsX), materialX);
  const lineY = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsY), materialY);
  const lineZ = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsZ), materialZ);

  scene.add(lineX);
  scene.add(lineY);
  scene.add(lineZ);

  // Small corner renderer
  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(100, 100);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '10px';
  renderer.domElement.style.left = '10px';
  renderer.domElement.style.pointerEvents = 'none';
  document.body.appendChild(renderer.domElement);

  return {
    render: () => {
      camera.quaternion.copy(mainCamera.quaternion); // sync rotation
      renderer.render(scene, camera);
    }
  };
}

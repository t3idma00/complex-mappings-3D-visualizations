// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xa0a0a0);
document.body.appendChild(renderer.domElement);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// Load city background
const loader = new THREE.GLTFLoader();
loader.load('city_nyc_times_square.glb', (gltf) => {
  const cityScene = gltf.scene;
  cityScene.scale.set(0.8, 0.8, 0.8);
  scene.add(cityScene);
}, undefined, (error) => {
  console.error('Failed to load GLB:', error);
});

// Load wood texture
const textureLoader = new THREE.TextureLoader();
const woodTexture = textureLoader.load('wood.jpg');

// Cube (player) with wood texture
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ map: woodTexture })
);
cube.scale.set(0.1, 0.1, 0.1);
cube.position.set(0.5, 0.05, -3);
scene.add(cube);

// Keyboard input
const keys = {};
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Mouse rotation
let rotationY = 0;
document.body.addEventListener("click", () => {
  document.body.requestPointerLock();
});
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === document.body) {
    document.addEventListener("mousemove", onMouseMove);
  } else {
    document.removeEventListener("mousemove", onMouseMove);
  }
});
function onMouseMove(e) {
  rotationY -= e.movementX * 0.002;
}

// Gravity setup
const gravity = -9.8; // units/sec²
let velocityY = 0;

const clock = new THREE.Clock();

// Movement logic
function moveCube(delta) {
  const speed = 3;
  const moveStep = speed * delta;

  const forward = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const right = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));

  // Horizontal movement
  if (keys["w"]) cube.position.add(forward.clone().multiplyScalar(moveStep));
  if (keys["s"]) cube.position.add(forward.clone().multiplyScalar(-moveStep));
  if (keys["d"]) cube.position.add(right.clone().multiplyScalar(-moveStep));
  if (keys["a"]) cube.position.add(right.clone().multiplyScalar(moveStep));

  // Vertical input
  if (keys["q"]) velocityY += 15 * delta;
  if (keys["e"]) velocityY -= 30 * delta;

  // Gravity
  velocityY += gravity * delta;
  cube.position.y += velocityY * delta;

  // Ground limit
  const minY = 0.05;
  if (cube.position.y < minY) {
    cube.position.y = minY;
    velocityY = 0;
  }

  cube.rotation.y = rotationY;
}

// Animate
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  moveCube(delta);

  // Camera follow
  const followDistance = 1.0;
  const height = 0.5;
  const offsetX = Math.sin(rotationY) * followDistance;
  const offsetZ = Math.cos(rotationY) * followDistance;
  camera.position.set(
    cube.position.x - offsetX,
    cube.position.y + height,
    cube.position.z - offsetZ
  );
  camera.lookAt(cube.position);

  renderer.render(scene, camera);
}
animate();

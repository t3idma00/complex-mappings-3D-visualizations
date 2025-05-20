// Variables for physics
let velocityY = 0;
const gravity = -0.001;
const backgroundCubes = [];

// Pointer lock for mouse control
document.body.addEventListener("click", () => {
  document.body.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  const isLocked = document.pointerLockElement === document.body;
  const instruction = document.getElementById("instruction");
  if (instruction) instruction.style.display = isLocked ? "none" : "block";
});

// Scene and Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xACACFF);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Load textures
const textureLoader = new THREE.TextureLoader();
const boxTexture = textureLoader.load("brickwall.jpg");
const woodTexture = textureLoader.load("wood.jpg");
const grassTexture = textureLoader.load("grass.jpg");
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(50, 50);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 1;
light.shadow.camera.far = 50;
light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
scene.add(light);

const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);

// Main cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ map: woodTexture });
const cube = new THREE.Mesh(geometry, material);
const cubeHalfHeight = geometry.parameters.height / 2;
cube.position.y = cubeHalfHeight;
cube.castShadow = true;
scene.add(cube);

// Ground plane
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ map: grassTexture });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// Background cubes
for (let i = 0; i < 20; i++) {
  const boxGeo = new THREE.BoxGeometry(1, 3, 1);
  const boxMat = new THREE.MeshStandardMaterial({ map: boxTexture });
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 30);
  box.castShadow = true;
  box.receiveShadow = true;
  backgroundCubes.push(box);
  scene.add(box);
}

// Slope
const slope = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0x999999 })
);
slope.rotation.set(-Math.PI / 6, 0, 0); // 30 degree slope
slope.position.set(0, 0, -10);
slope.receiveShadow = true;
scene.add(slope);

// Combine all static obstacles
const allObstacles = [...backgroundCubes, slope];

// Keyboard control
let keysPressed = {};
document.addEventListener("keydown", e => keysPressed[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keysPressed[e.key.toLowerCase()] = false);

// Mouse rotation
let rotationY = 0;
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    const sensitivity = 0.01;
    rotationY -= event.movementX * sensitivity;
  }
});

// Collision detection using bounding boxes
function isColliding(a, b) {
  const boxA = new THREE.Box3().setFromObject(a);
  const boxB = new THREE.Box3().setFromObject(b);
  return boxA.intersectsBox(boxB);
}

// Update cube position
function CubeMovement() {
  const speed = 0.1;
  const forward = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const right = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));

  function attemptMove(directionVec, backward = false) {
    const step = directionVec.clone().multiplyScalar(backward ? -speed : speed);
    cube.position.add(step);
    for (let obs of allObstacles) {
      if (isColliding(cube, obs)) {
        cube.position.sub(step);
        break;
      }
    }
  }

  if (keysPressed["w"]) attemptMove(forward);
  if (keysPressed["s"]) attemptMove(forward, true);
  if (keysPressed["a"]) attemptMove(right);
  if (keysPressed["d"]) attemptMove(right, true);

  if (keysPressed["q"]) velocityY += 0.002;
  if (keysPressed["e"]) velocityY -= 0.01;

  // Apply gravity
  velocityY += gravity;
  cube.position.y += velocityY;

  // Floor collision
  if (cube.position.y < cubeHalfHeight) {
    cube.position.y = cubeHalfHeight;
    velocityY = 0;
  }

  // Landing check on other objects
  for (let obs of allObstacles) {
    if (isColliding(cube, obs)) {
      const obsBox = new THREE.Box3().setFromObject(obs);
      const cubeBox = new THREE.Box3().setFromObject(cube);
      const cubeBottom = cubeBox.min.y;
      const obsTop = obsBox.max.y;
      if (velocityY < 0 && cubeBottom < obsTop && cube.position.y > obsTop) {
        cube.position.y = obsTop + cubeHalfHeight;
        velocityY = 0;
        break;
      }
    }
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  CubeMovement();
  cube.rotation.y = rotationY;

  // Camera follows cube
  const distance = 5;
  const height = 3;
  const offsetX = Math.sin(rotationY) * distance;
  const offsetZ = Math.cos(rotationY) * distance;
  camera.position.x = cube.position.x - offsetX;
  camera.position.z = cube.position.z - offsetZ;
  camera.position.y = cube.position.y + height;
  camera.lookAt(cube.position);

  // Debug display
  const debugPanel = document.getElementById("debug");
  if (debugPanel) {
    debugPanel.innerHTML = `
      <strong>Physics Info</strong><br/>
      Position X: ${cube.position.x.toFixed(2)}<br/>
      Position Y: ${cube.position.y.toFixed(2)}<br/>
      Velocity Y: ${velocityY.toFixed(4)}<br/>
      Acceleration (gravity): ${gravity}
    `;
  }

  renderer.render(scene, camera);
}

animate();

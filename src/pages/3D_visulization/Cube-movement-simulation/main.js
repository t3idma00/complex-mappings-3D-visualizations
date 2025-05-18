let velocityY = 0;         // cubes vertical velocity
const gravity = -0.001;    // downward force
const backgroundCubes = [];


// Enable pointer lock on click
document.body.addEventListener("click", () => {
  document.body.requestPointerLock();
});

// Show/hide instruction message
document.addEventListener("pointerlockchange", () => {
  const isLocked = document.pointerLockElement === document.body;
  document.getElementById("instruction").style.display = isLocked ? "none" : "block";
});

// Setup scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xACACFF); // background
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();
const boxTexture = textureLoader.load("brickwall.jpg");


// Main cube 
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const cube = new THREE.Mesh(geometry, material);
const cubeHalfHeight = geometry.parameters.height / 2;
cube.position.y = cubeHalfHeight; // start on top of ground
scene.add(cube);

// Background cubes
for (let i = 0; i < 20; i++) {
  const boxGeo = new THREE.BoxGeometry(1, 3, 1);
  const color = new THREE.Color(Math.random(), Math.random(), Math.random());
  const boxMat = new THREE.MeshBasicMaterial({ map: boxTexture });

  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(
    (Math.random() - 0.5) * 20,
    0,
    (Math.random() - 0.5) * 30
  );
 backgroundCubes.push(box);
scene.add(box);

}

// Ground plane
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshBasicMaterial({ color: 0x809c13, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// Keyboard tracking
let keysPressed = {};
document.addEventListener("keydown", e => keysPressed[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keysPressed[e.key.toLowerCase()] = false);

// Mouse based rotation
let rotationY = 0;
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    const sensitivity = 0.01;
    rotationY -= event.movementX * sensitivity;
  }
});

function isColliding(a, b) {
  const boxA = new THREE.Box3().setFromObject(a);
  const boxB = new THREE.Box3().setFromObject(b);
  return boxA.intersectsBox(boxB);
}





// Cube Movements
function CubeMovement() {
  const speed = 0.1;
  const forward = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const right = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));

  // Try forward movement (W)
  if (keysPressed["w"]) {
    const next = cube.position.clone().add(forward.clone().multiplyScalar(speed));
    cube.position.copy(next);
    for (let obs of backgroundCubes) {
      if (isColliding(cube, obs)) {
        cube.position.sub(forward.clone().multiplyScalar(speed));
        break;
      }
    }
  }

  // Backward (S)
  if (keysPressed["s"]) {
    const next = cube.position.clone().add(forward.clone().multiplyScalar(-speed));
    cube.position.copy(next);
    for (let obs of backgroundCubes) {
      if (isColliding(cube, obs)) {
        cube.position.add(forward.clone().multiplyScalar(speed));
        break;
      }
    }
  }

  // Left (A)
  if (keysPressed["a"]) {
    const next = cube.position.clone().add(right.clone().multiplyScalar(speed));
    cube.position.copy(next);
    for (let obs of backgroundCubes) {
      if (isColliding(cube, obs)) {
        cube.position.sub(right.clone().multiplyScalar(speed));
        break;
      }
    }
  }

  // Right (D)
  if (keysPressed["d"]) {
    const next = cube.position.clone().add(right.clone().multiplyScalar(-speed));
    cube.position.copy(next);
    for (let obs of backgroundCubes) {
      if (isColliding(cube, obs)) {
        cube.position.add(right.clone().multiplyScalar(speed));
        break;
      }
    }
  }

  // Q and E control vertical force
  if (keysPressed["q"]) velocityY += 0.002;
  if (keysPressed["e"]) velocityY -= 0.01;

  velocityY += gravity;
cube.position.y += velocityY;

// Collision check with ground
if (cube.position.y < cubeHalfHeight) {
  cube.position.y = cubeHalfHeight;
  velocityY = 0;
}

// Check if cube is falling onto a background cube
for (let obs of backgroundCubes) {
  if (isColliding(cube, obs)) {
    // Get bounding boxes
    const obsBox = new THREE.Box3().setFromObject(obs);
    const cubeBox = new THREE.Box3().setFromObject(cube);

    const cubeBottom = cubeBox.min.y;
    const obsTop = obsBox.max.y;

    // If falling down and lands on top
    if (velocityY < 0 && cubeBottom < obsTop && cube.position.y > obsTop) {
      cube.position.y = obsTop + cubeHalfHeight;
      velocityY = 0;
      break;
    }
  }
}

}



// Render loop
function animate() {
  requestAnimationFrame(animate);
  CubeMovement();

  // Rotate cube
  cube.rotation.y = rotationY;

  // Camera follow logic
  const distance = 5;
  const height = 3;
  const offsetX = Math.sin(rotationY) * distance;
  const offsetZ = Math.cos(rotationY) * distance;

  camera.position.x = cube.position.x - offsetX;
  camera.position.z = cube.position.z - offsetZ;
  camera.position.y = cube.position.y + height;
  camera.lookAt(cube.position);

  renderer.render(scene, camera);
}
// ✅ This one is correct:
function animate() {
  requestAnimationFrame(animate);
  CubeMovement();

  cube.rotation.y = rotationY;

  const distance = 5;
  const height = 3;
  const offsetX = Math.sin(rotationY) * distance;
  const offsetZ = Math.cos(rotationY) * distance;

  camera.position.x = cube.position.x - offsetX;
  camera.position.z = cube.position.z - offsetZ;
  camera.position.y = cube.position.y + height;
  camera.lookAt(cube.position);

  // Show physics values
  const debugPanel = document.getElementById("debug");
  debugPanel.innerHTML = `
    <strong>Physics Info</strong><br/>
    Position X: ${cube.position.x.toFixed(2)}<br/>
    Position Y: ${cube.position.y.toFixed(2)}<br/>
    Velocity Y: ${velocityY.toFixed(4)}<br/>
    Acceleration (gravity): ${gravity}
  `;

  renderer.render(scene, camera);
}
animate();

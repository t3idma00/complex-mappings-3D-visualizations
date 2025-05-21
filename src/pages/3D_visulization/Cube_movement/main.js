// Physics and setup
let velocityY = 0;
const gravity = -0.001;
let previousX = 0;
let previousZ = 0;
const backgroundCubes = [];

// Pointer lock
document.body.addEventListener("click", () => {
  document.body.requestPointerLock();
});
document.addEventListener("pointerlockchange", () => {
  const isLocked = document.pointerLockElement === document.body;
  const instruction = document.getElementById("instruction");
  if (instruction) instruction.style.display = isLocked ? "none" : "block";
});

// Scene
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

// Textures
const loader = new THREE.TextureLoader();
const grassTexture = loader.load("grass.jpg");
const woodTexture = loader.load("wood.jpg");
const brickTexture = loader.load("brickwall.jpg");
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(50, 50);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
light.castShadow = true;
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// Main cube
const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: woodTexture }));
cube.castShadow = true;
cube.position.y = 0.5;
scene.add(cube);
const cubeHalfHeight = 0.5;

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ map: grassTexture })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Background cubes
for (let i = 0; i < 20; i++) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), new THREE.MeshStandardMaterial({ map: brickTexture }));
  box.position.set((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 30);
  box.castShadow = box.receiveShadow = true;
  backgroundCubes.push(box);
  scene.add(box);
}

//custom shader material

const prismShaderMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vPos;
    void main() {
      // A color effect based on position
      float r = 0.5 + 0.5 * sin(vPos.y * 2.0);
      float g = 0.5 + 0.5 * sin(vPos.x * 2.0);
      float b = 0.5 + 0.5 * sin(vPos.z * 2.0);
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
  side: THREE.DoubleSide
});


// Filled slope using triangular prism 
const prismGeometry = new THREE.BufferGeometry();
const verts = new Float32Array([
  // Bottom rectangle
  -5, 0, -10,  5, 0, -10,  5, 0, -5,  -5, 0, -5,
  // Top front edge (slope)
  -5, 2.5, -5,  5, 2.5, -5
]);
const indices = [
  // Bottom face
  0, 1, 2,  0, 2, 3,
  // Back vertical face
  0, 1, 5,  0, 5, 4,
  // Right vertical side
  1, 2, 5,
  // Left triangle side
  0, 3, 4,
  // Top slope
  3, 2, 5,  3, 5, 4
];
prismGeometry.setAttribute("position", new THREE.BufferAttribute(verts, 3));
prismGeometry.setIndex(indices);
prismGeometry.computeVertexNormals();

const slope = new THREE.Mesh(prismGeometry, prismShaderMaterial);
slope.castShadow = slope.receiveShadow = true;
scene.add(slope);


const allObstacles = [...backgroundCubes, slope];

// Keyboard and mouse controls
let keysPressed = {};
document.addEventListener("keydown", e => keysPressed[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keysPressed[e.key.toLowerCase()] = false);

let rotationY = 0;
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    rotationY -= event.movementX * 0.01;
  }
});

// Collision detection
function isColliding(a, b) {
  const boxA = new THREE.Box3().setFromObject(a);
  const boxB = new THREE.Box3().setFromObject(b);
  return boxA.intersectsBox(boxB);
}

// Movement logic
function CubeMovement() {
  const speed = 0.1;
  const forward = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const right = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));

  function tryMove(dir, backward = false) {
    const step = dir.clone().multiplyScalar(backward ? -speed : speed);
    cube.position.add(step);
    for (let obs of allObstacles) {
      if (isColliding(cube, obs)) {
        const obsBox = new THREE.Box3().setFromObject(obs);
        const cubeBox = new THREE.Box3().setFromObject(cube);
        const bottom = cubeBox.min.y;
        const top = obsBox.max.y;
        const gap = Math.abs(bottom - top);
        if (gap > 0.05) cube.position.sub(step);
        break;
      }
    }
  }

  if (keysPressed["w"]) tryMove(forward);
  if (keysPressed["s"]) tryMove(forward, true);
  if (keysPressed["a"]) tryMove(right);
  if (keysPressed["d"]) tryMove(right, true);

  if (keysPressed["q"]) velocityY += 0.002;
  if (keysPressed["e"]) velocityY -= 0.01;

  velocityY += gravity;
  cube.position.y += velocityY;

  if (cube.position.y < cubeHalfHeight) {
    cube.position.y = cubeHalfHeight;
    velocityY = 0;
  }

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

// Animate
function animate() {
  requestAnimationFrame(animate);
  CubeMovement();
  cube.rotation.y = rotationY;

  const distance = 5, height = 3;
  const offsetX = Math.sin(rotationY) * distance;
  const offsetZ = Math.cos(rotationY) * distance;
  camera.position.set(cube.position.x - offsetX, cube.position.y + height, cube.position.z - offsetZ);
  camera.lookAt(cube.position);

  const velocityX = cube.position.x - previousX;
  const velocityZ = cube.position.z - previousZ;
  previousX = cube.position.x;
  previousZ = cube.position.z;

  const debugPanel = document.getElementById("debug");
  if (debugPanel) {
    debugPanel.innerHTML = `
      <strong>Physics Info</strong><br/>
      Position X: ${cube.position.x.toFixed(2)}<br/>
      Position Y: ${cube.position.y.toFixed(2)}<br/>
      Position Z: ${cube.position.z.toFixed(2)}<br/>
      Velocity X: ${velocityX.toFixed(4)}<br/>
      Velocity Y: ${velocityY.toFixed(4)}<br/>
      Velocity Z: ${velocityZ.toFixed(4)}<br/>
      Acceleration (gravity): ${gravity}
    `;
  }

  renderer.render(scene, camera);
}

animate();

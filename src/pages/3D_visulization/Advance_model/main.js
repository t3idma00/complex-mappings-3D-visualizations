// Physics and setup
let velocityY = 0;
const gravity = -0.001;
let previousX = 0;
let previousZ = 0;
const backgroundCubes = [];

// Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xACACFF);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Textures
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load("grass.jpg");
const woodTexture = textureLoader.load("wood.jpg");
const brickTexture = textureLoader.load("brickwall.jpg");
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(50, 50);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
light.castShadow = true;
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

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

// Custom shader slope
const prismShaderMaterial = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0.0 } },
  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vPos;
    void main() {
      float r = 0.5 + 0.5 * sin(vPos.y * 2.0 + uTime);
      float g = 0.5 + 0.5 * sin(vPos.x * 2.0 + uTime);
      float b = 0.5 + 0.5 * sin(vPos.z * 2.0 + uTime);
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
  side: THREE.DoubleSide
});

const prismGeometry = new THREE.BufferGeometry();
const verts = new Float32Array([
  -5, 0, -10,  5, 0, -10,  5, 0, -5,  -5, 0, -5,
  -5, 2.5, -5,  5, 2.5, -5
]);
const indices = [ 0,1,2, 0,2,3, 0,1,5, 0,5,4, 1,2,5, 0,3,4, 3,2,5, 3,5,4 ];
prismGeometry.setAttribute("position", new THREE.BufferAttribute(verts, 3));
prismGeometry.setIndex(indices);
prismGeometry.computeVertexNormals();

const slope = new THREE.Mesh(prismGeometry, prismShaderMaterial);
slope.castShadow = slope.receiveShadow = true;
scene.add(slope);

// Controls
let keysPressed = {};
document.addEventListener("keydown", e => keysPressed[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keysPressed[e.key.toLowerCase()] = false);

let rotationY = 0;
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    rotationY -= event.movementX * 0.01;
  }
});
document.body.addEventListener("click", () => document.body.requestPointerLock());

let robot, mixer;
const loader = new THREE.GLTFLoader();
loader.load("animated_robot.glb", function(gltf) {
  robot = gltf.scene;

  robot.scale.set(0.5, 0.5, 0.5);
  robot.position.set(0, 0.5, 0);
  robot.castShadow = true;
  scene.add(robot);
  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(robot);
    gltf.animations.forEach(clip => mixer.clipAction(clip).play());
  }
}, undefined, console.error);

const allObstacles = [...backgroundCubes, slope];

// Collision detection
function isColliding(a, b) {
  const boxA = new THREE.Box3().setFromObject(a);
  const boxB = new THREE.Box3().setFromObject(b);
  return boxA.intersectsBox(boxB);
}

// Robot movement logic
function RobotMovement() {
  if (!robot) return;

  const speed = 0.1;
  const forward = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const right = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));

  function tryMove(dir, backward = false) {
    const step = dir.clone().multiplyScalar(backward ? -speed : speed);
    robot.position.add(step);
    for (let obs of allObstacles) {
      if (isColliding(robot, obs)) {
        robot.position.sub(step);
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
  robot.position.y += velocityY;

  if (robot.position.y < 0.5) {
    robot.position.y = 0.5;
    velocityY = 0;
  }

  for (let obs of allObstacles) {
    if (isColliding(robot, obs)) {
      const obsBox = new THREE.Box3().setFromObject(obs);
      const robotBox = new THREE.Box3().setFromObject(robot);
      const robotBottom = robotBox.min.y;
      const obsTop = obsBox.max.y;
      if (velocityY < 0 && robotBottom < obsTop && robot.position.y > obsTop) {
        robot.position.y = obsTop + 0.5;
        velocityY = 0;
        break;
      }
    }
  }

  robot.rotation.y = rotationY;
}

// Animate
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  RobotMovement();
  prismShaderMaterial.uniforms.uTime.value += 0.01;

  if (robot) {
    const distance = 10, height = 6;
    const offsetX = Math.sin(rotationY) * distance;
    const offsetZ = Math.cos(rotationY) * distance;
    camera.position.set(robot.position.x - offsetX, robot.position.y + height, robot.position.z - offsetZ);
    camera.lookAt(robot.position);

    const velocityX = robot.position.x - previousX;
    const velocityZ = robot.position.z - previousZ;
    previousX = robot.position.x;
    previousZ = robot.position.z;

    const debugPanel = document.getElementById("debug");
    if (debugPanel) {
      debugPanel.innerHTML = `
        <strong>Physics Info</strong><br/>
        Position X: ${robot.position.x.toFixed(2)}<br/>
        Position Y: ${robot.position.y.toFixed(2)}<br/>
        Position Z: ${robot.position.z.toFixed(2)}<br/>
        Velocity X: ${velocityX.toFixed(4)}<br/>
        Velocity Y: ${velocityY.toFixed(4)}<br/>
        Velocity Z: ${velocityZ.toFixed(4)}<br/>
        Acceleration (gravity): ${gravity}
      `;
    }
  }

  renderer.render(scene, camera);
}
animate();

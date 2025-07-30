const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);
const camera = new THREE.OrthographicCamera(
  window.innerWidth / -100,
  window.innerWidth / 100,
  window.innerHeight / 100,
  window.innerHeight / -100,
  0.1,
  1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const params = {
  flowSpeed: 1.0,
  particleSpeed: 0.5,
  showCylinder: true,
  streamlineColor: '#3366ff',
  particleColor: '#ffff00'
};

const cylinder = new THREE.Mesh(
  new THREE.CircleGeometry(1, 64),
  new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide })
);
if (params.showCylinder) scene.add(cylinder);

function getVelocity(x, y) {
  const r2 = x * x + y * y;
  const a2 = 1 * 1;
  const U = params.flowSpeed;
  if (r2 > a2 * 0.99) {
    const vx = U * (1 + a2 * (y * y - x * x) / (r2 * r2));
    const vy = U * (-2 * a2 * x * y) / (r2 * r2);
    return new THREE.Vector2(vx, vy);
  }
  return new THREE.Vector2(0, 0);
}

let streamlinePaths = [];
let particles = [];

function generateStreamlines() {
  scene.children = scene.children.filter(obj => obj.userData?.isParticle || obj === cylinder);
  streamlinePaths = [];
  const yValues = [-1.5, -1.0, -0.5, 0.5, 1.0, 1.5];

  yValues.forEach(y => {
    let x = -4, yy = y;
    const path = [];

    for (let i = 0; i < 300; i++) {
      const v = getVelocity(x, yy);
      const norm = v.length();
      v.normalize().multiplyScalar(0.03);
      x += v.x;
      yy += v.y;
      path.push(new THREE.Vector3(x, yy, 0));
      if (x > 4 || norm < 0.001) break;
    }

    if (path.length > 10) {
      const geometry = new THREE.BufferGeometry().setFromPoints(path);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(params.streamlineColor),
        transparent: true,
        opacity: 0.3
      });
      scene.add(new THREE.Line(geometry, material));
      streamlinePaths.push(path);
    }
  });
}

function createParticles() {
  particles.forEach(p => scene.remove(p.mesh));
  particles = [];

  streamlinePaths.forEach(path => {
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(params.particleColor),
          transparent: true,
          opacity: 0.8
        })
      );
      mesh.userData.isParticle = true;
      scene.add(mesh);
      particles.push({ mesh, path, progress: i / 10 });
    }
  });
}

function updateParticles(delta) {
  particles.forEach(p => {
    p.progress += delta * params.particleSpeed / p.path.length;
    if (p.progress > 1) p.progress -= 1;

    const index = Math.floor(p.progress * (p.path.length - 1));
    const nextIndex = Math.min(index + 1, p.path.length - 1);
    const lerpT = (p.progress * (p.path.length - 1)) % 1;

    const a = p.path[index];
    const b = p.path[nextIndex];
    p.mesh.position.lerpVectors(a, b, lerpT);
  });
}

function refresh() {
  if (params.showCylinder) {
    scene.add(cylinder);
  } else {
    scene.remove(cylinder);
  }
  generateStreamlines();
  createParticles();
}

// GUI
const gui = new dat.GUI();
gui.add(params, 'flowSpeed', 0.2, 2).step(0.1).onChange(refresh);
gui.add(params, 'particleSpeed', 0.1, 2).step(0.1);
gui.add(params, 'showCylinder').onChange(refresh);
gui.addColor(params, 'streamlineColor').onChange(refresh);
gui.addColor(params, 'particleColor').onChange(refresh);

// Resize
window.addEventListener('resize', () => {
  camera.left = window.innerWidth / -100;
  camera.right = window.innerWidth / 100;
  camera.top = window.innerHeight / 100;
  camera.bottom = window.innerHeight / -100;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Pan & zoom
let dragging = false;
let prevMouse = { x: 0, y: 0 };

window.addEventListener('mousedown', e => {
  dragging = true;
  prevMouse = { x: e.clientX, y: e.clientY };
});
window.addEventListener('mouseup', () => dragging = false);
window.addEventListener('mousemove', e => {
  if (dragging) {
    const dx = (e.clientX - prevMouse.x) / 100;
    const dy = (e.clientY - prevMouse.y) / 100;
    camera.position.x -= dx;
    camera.position.y += dy;
    prevMouse = { x: e.clientX, y: e.clientY };
  }
});
window.addEventListener('wheel', e => {
  camera.zoom *= e.deltaY > 0 ? 1.1 : 0.9;
  camera.updateProjectionMatrix();
});

refresh();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  updateParticles(clock.getDelta());
  renderer.render(scene, camera);
}
animate();

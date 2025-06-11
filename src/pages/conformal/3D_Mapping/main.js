const CONFIG = {
  RANGE: 1.5,
  Z_SCALE: 2,
  POINT_SIZE: 1,
  SPACING: 0.2,
  OFFSET: { x: 0, y: 0 }
};

const canvas2D = document.getElementById('control-canvas');
const ctx = canvas2D.getContext('2d');
canvas2D.width = 300;
canvas2D.height = 300;

let scene, camera, renderer, controls;
let inputPoints, outputPoints, heightPoints;
let inputMaterial, outputMaterial, heightMaterial;
let inputGeom = new THREE.BufferGeometry();
let outputGeom = new THREE.BufferGeometry();
let heightGeom = new THREE.BufferGeometry();
let points = [];

function createTexture(color) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  c.beginPath();
  c.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
  const tex = new THREE.Texture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function init3D() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(4, 4, 8);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  controls = new THREE.OrbitControls(camera, renderer.domElement);

  inputMaterial = new THREE.PointsMaterial({
    size: CONFIG.POINT_SIZE * 0.05,
    map: createTexture('red'), transparent: true
  });
  outputMaterial = new THREE.PointsMaterial({
    size: CONFIG.POINT_SIZE * 0.05,
    map: createTexture('lime'), transparent: true
  });
  heightMaterial = new THREE.PointsMaterial({
    size: CONFIG.POINT_SIZE * 0.05,
    map: createTexture('deepskyblue'), transparent: true
  });

  inputPoints = new THREE.Points(inputGeom, inputMaterial);
  outputPoints = new THREE.Points(outputGeom, outputMaterial);
  heightPoints = new THREE.Points(heightGeom, heightMaterial);
  scene.add(inputPoints, outputPoints, heightPoints);
  scene.add(new THREE.GridHelper(10, 20));
  scene.add(new THREE.AxesHelper(5));

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function generatePoints() {
  points = [];
  const steps = Math.floor(CONFIG.RANGE / CONFIG.SPACING);
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      points.push({
        x: CONFIG.OFFSET.x + i * CONFIG.SPACING,
        y: CONFIG.OFFSET.y + j * CONFIG.SPACING
      });
    }
  }
  return points;
}

function updateGeometry(points) {
  const n = points.length;
  const input = new Float32Array(n * 3);
  const output = new Float32Array(n * 3);
  const height = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    input[i * 3] = p.x;
    input[i * 3 + 1] = p.y;
    input[i * 3 + 2] = 0;

    const re = p.x ** 2 - p.y ** 2;
    const im = 2 * p.x * p.y;
    output[i * 3] = re;
    output[i * 3 + 1] = im;
    output[i * 3 + 2] = 0;

    height[i * 3] = p.x;
    height[i * 3 + 1] = p.y;
    height[i * 3 + 2] = re * CONFIG.Z_SCALE;
  }

  inputGeom.setAttribute('position', new THREE.BufferAttribute(input, 3));
  outputGeom.setAttribute('position', new THREE.BufferAttribute(output, 3));
  heightGeom.setAttribute('position', new THREE.BufferAttribute(height, 3));
}

function drawCanvas(points) {
  const w = canvas2D.width, h = canvas2D.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  const scale = w / (CONFIG.RANGE * 2);
  const spacing = CONFIG.SPACING;

  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, -scale);

  const minX = -CONFIG.RANGE, maxX = CONFIG.RANGE;
  const minY = -CONFIG.RANGE, maxY = CONFIG.RANGE;

  const startX = Math.floor(minX / spacing) * spacing;
  const endX = Math.ceil(maxX / spacing) * spacing;
  const startY = Math.floor(minY / spacing) * spacing;
  const endY = Math.ceil(maxY / spacing) * spacing;

  ctx.lineWidth = 0.5 / scale;
  ctx.strokeStyle = '#444';
  ctx.fillStyle = 'black';
  const fontSize = 10 / scale;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';

  for (let x = startX; x <= endX; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
    ctx.stroke();
  }

  for (let y = startY; y <= endY; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1 / scale;
  ctx.beginPath();
  ctx.moveTo(minX, 0);
  ctx.lineTo(maxX, 0);
  ctx.moveTo(0, minY);
  ctx.lineTo(0, maxY);
  ctx.stroke();

  ctx.save();
  ctx.scale(1, -1);
  ctx.fillText('Re(z)', maxX - 0.1, 0.2);
  ctx.fillText('Im(z)', -0.15, -maxY + 0.05);
  ctx.restore();

  let labelStep = spacing < 0.3 ? Math.ceil(0.3 / spacing) : 1;

  ctx.fillStyle = 'black';
  let count = 0;
  for (let x = startX; x <= endX; x += spacing) {
    if (Math.abs(x) < 1e-6) continue;
    if (count % labelStep === 0) {
      ctx.save(); ctx.scale(1, -1);
      ctx.fillText(x.toFixed(2), x, 0.05);
      ctx.restore();
    }
    count++;
  }

  count = 0;
  for (let y = startY; y <= endY; y += spacing) {
    if (Math.abs(y) < 1e-6) continue;
    if (count % labelStep === 0) {
      ctx.save(); ctx.scale(1, -1);
      ctx.fillText(y.toFixed(2), 0.2, -y + 0.05);
      ctx.restore();
    }
    count++;
  }

  ctx.fillStyle = 'red';
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, CONFIG.POINT_SIZE * 0.03, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.restore();
}

function add3DAxisLabels() {
  const loader = new THREE.FontLoader();
  loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x17272c });

    const createLabel = (text, pos) => {
      const geom = new THREE.TextGeometry(text, {
        font: font, size: 0.1, height: 0.01
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(pos.x, pos.y, pos.z);
      scene.add(mesh);
    };

    createLabel("Re(z)", { x: 4.5, y: 0, z: 0 });
    createLabel("Im(z)", { x: 0, y: 4.5, z: 0 });
    createLabel("Re(f(z))", { x: 0, y: 0, z: 4.5 });

    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      createLabel(i.toString(), { x: i, y: -0.1, z: 0 });
      createLabel(i.toString(), { x: -0.3, y: i, z: 0 });
      createLabel(i.toString(), { x: -0.3, y: -0.3, z: i });
    }
  });
}

function screenToPlaneCoords(mx, my) {
  const rect = canvas2D.getBoundingClientRect();
  const x = (mx - rect.left - canvas2D.width / 2) * (CONFIG.RANGE * 2) / canvas2D.width;
  const y = (canvas2D.height / 2 - (my - rect.top)) * (CONFIG.RANGE * 2) / canvas2D.height;
  return { x, y };
}

// Drag handling
let isDragging = false, lastMousePos = null;

canvas2D.onmousedown = e => {
  isDragging = true;
  lastMousePos = screenToPlaneCoords(e.clientX, e.clientY);
  canvas2D.style.cursor = 'grabbing';
};

canvas2D.onmousemove = e => {
  if (!isDragging) return;
  const current = screenToPlaneCoords(e.clientX, e.clientY);
  const dx = current.x - lastMousePos.x;
  const dy = current.y - lastMousePos.y;
  lastMousePos = current;

  for (let i = 0; i < points.length; i++) {
    points[i].x += dx;
    points[i].y += dy;
  }

  CONFIG.OFFSET.x += dx;
  CONFIG.OFFSET.y += dy;
  updateGeometry(points);
  drawCanvas(points);
};

canvas2D.onmouseup = canvas2D.onmouseleave = () => {
  isDragging = false;
  canvas2D.style.cursor = 'grab';
};

// UI Events
document.getElementById('resetBtn').onclick = () => {
  CONFIG.OFFSET = { x: 0, y: 0 };
  CONFIG.SPACING = 0.2;
  spacingSlider.value = 0.2;
  spacingValue.textContent = "0.2";
  const pts = generatePoints();
  updateGeometry(pts);
  drawCanvas(pts);
};

document.getElementById('zScale').oninput = e => {
  CONFIG.Z_SCALE = parseFloat(e.target.value);
  document.getElementById('zScaleValue').textContent = CONFIG.Z_SCALE.toFixed(1);
  updateGeometry(points);
};

document.getElementById('pointSize').oninput = e => {
  CONFIG.POINT_SIZE = parseFloat(e.target.value);
  document.getElementById('pointSizeValue').textContent = CONFIG.POINT_SIZE.toFixed(1);
  inputMaterial.size = outputMaterial.size = heightMaterial.size = CONFIG.POINT_SIZE * 0.05;
  inputMaterial.needsUpdate = outputMaterial.needsUpdate = heightMaterial.needsUpdate = true;
  drawCanvas(points);
};

const spacingSlider = document.getElementById('pointSpacing');
const spacingValue = document.getElementById('pointSpacingValue');
spacingSlider.oninput = () => {
  CONFIG.SPACING = parseFloat(spacingSlider.value);
  spacingValue.textContent = CONFIG.SPACING.toFixed(2);
  const pts = generatePoints();
  updateGeometry(pts);
  drawCanvas(pts);
};

// Init
init3D();
add3DAxisLabels();
points = generatePoints();
updateGeometry(points);
drawCanvas(points);

(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();

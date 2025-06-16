const CONFIG = {
  RANGE_2D: math.pi,    
  RANGE_3D: 2,    
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

let userFuncText = "z^2";
let userFunc = math.compile(userFuncText);

//Added quadrants
const quadrantChecks = {
  quad1: true,
  quad2: false,
  quad3: false,
  quad4: false
};

document.getElementById('quad1').onchange = e => {
  quadrantChecks.quad1 = e.target.checked;
  updatePointsAndCanvas();
};
document.getElementById('quad2').onchange = e => {
  quadrantChecks.quad2 = e.target.checked;
  updatePointsAndCanvas();
};
document.getElementById('quad3').onchange = e => {
  quadrantChecks.quad3 = e.target.checked;
  updatePointsAndCanvas();
};
document.getElementById('quad4').onchange = e => {
  quadrantChecks.quad4 = e.target.checked;
  updatePointsAndCanvas();
};

document.getElementById('updateFuncBtn').onclick = () => {
  const input = document.getElementById('funcInput').value;
  try {
    userFunc = math.compile(input);
    userFuncText = input;
    updateGeometry(points);
  } catch (err) {
    alert("Invalid function: " + err.message);
  }
};

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

function add3DAxisLabels() {
  const loader = new THREE.FontLoader();
  loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const material = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });

    const createLabel = (text, position) => {
      const geometry = new THREE.TextGeometry(text, {
        font: font,
        size: 0.04,
        height: 0.01,
        curveSegments: 1,
  
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x, position.y, position.z);
      scene.add(mesh);
    };

    // Axis names
    createLabel("Re(z)", { x: 3, y: 0, z: 0 });
    createLabel("Im(z)", { x: 0, y: 3, z: 0 });
    createLabel("Re(f(z))", { x: 0, y: 0, z: 3 });

    // Tick labels 
    const ticks = [-1.5, -1.0, -0.5, 0.5, 1.0, 1.5];
    ticks.forEach(val => {
      const label = val.toFixed(1);

      // X axis ticks
      createLabel(label, { x: val, y: -0.12, z: 0 });

      // Y axis ticks
      createLabel(label, { x: -0.18, y: val, z: 0 });

      // Z axis ticks
      createLabel(label, { x: -0.18, y: -0.18, z: val });
    });
  });
}


function init3D() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3, 3, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  inputMaterial = new THREE.PointsMaterial({
    size: CONFIG.POINT_SIZE * 0.05,
    map: createTexture('red'),
    transparent: true
  });

  outputMaterial = new THREE.PointsMaterial({
    size: CONFIG.POINT_SIZE * 0.05,
    map: createTexture('lime'),
    transparent: true
  });

  heightMaterial = new THREE.PointsMaterial({
    size: CONFIG.POINT_SIZE * 0.05,
    map: createTexture('deepskyblue'),
    transparent: true
  });

  inputPoints = new THREE.Points(inputGeom, inputMaterial);
  outputPoints = new THREE.Points(outputGeom, outputMaterial);
  heightPoints = new THREE.Points(heightGeom, heightMaterial);

  scene.add(inputPoints, outputPoints, heightPoints);

  const gridSize = CONFIG.RANGE_3D * 2;
  const divisions = Math.round(gridSize / CONFIG.SPACING);
  const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x888888, 0xcccccc);
  scene.add(gridHelper);

  scene.add(new THREE.AxesHelper(CONFIG.RANGE_3D * 1.25));

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function generatePoints() {
  points = [];
const steps = Math.floor(CONFIG.RANGE_2D / CONFIG.SPACING);

  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      let x = CONFIG.OFFSET.x + i * CONFIG.SPACING;
      let y = CONFIG.OFFSET.y + j * CONFIG.SPACING;

      const inQ1 = x >= 0 && y >= 0;
      const inQ2 = x <= 0 && y >= 0;
      const inQ3 = x <= 0 && y <= 0;
      const inQ4 = x >= 0 && y <= 0;

      if ((inQ1 && quadrantChecks.quad1) ||
          (inQ2 && quadrantChecks.quad2) ||
          (inQ3 && quadrantChecks.quad3) ||
          (inQ4 && quadrantChecks.quad4)) {
        points.push({ x, y });
      }
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
    const z = math.complex(p.x, p.y);
    let fz;
    try {
      fz = userFunc.evaluate({ z });
    } catch (e) {
      fz = math.complex(0, 0);
    }

    input[i * 3] = p.x;
    input[i * 3 + 1] = p.y;
    input[i * 3 + 2] = 0;

    output[i * 3] = fz.re;
    output[i * 3 + 1] = fz.im;
    output[i * 3 + 2] = 0;

    height[i * 3] = p.x;
    height[i * 3 + 1] = p.y;
    height[i * 3 + 2] = fz.re * CONFIG.Z_SCALE;
  }

  inputGeom.setAttribute('position', new THREE.BufferAttribute(input, 3));
  outputGeom.setAttribute('position', new THREE.BufferAttribute(output, 3));
  heightGeom.setAttribute('position', new THREE.BufferAttribute(height, 3));
}



function drawCanvas(points) {
  const w = canvas2D.width, h = canvas2D.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();

const scale = w / (CONFIG.RANGE_2D * 2);
  const spacing = CONFIG.SPACING;

  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, -scale);

const minX = -CONFIG.RANGE_2D, maxX = CONFIG.RANGE_2D;
const minY = -CONFIG.RANGE_2D, maxY = CONFIG.RANGE_2D;


  const startX = Math.floor(minX / spacing) * spacing;
  const endX = Math.ceil(maxX / spacing) * spacing;
  const startY = Math.floor(minY / spacing) * spacing;
  const endY = Math.ceil(maxY / spacing) * spacing;

  ctx.lineWidth = 0.2 / scale;
  ctx.strokeStyle = '#444';
  ctx.fillStyle = 'black';
  const fontSize = 8 / scale;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'middle';
  ctx.textBaseline = 'top';

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

  let labelStep = (spacing < 0.5) ? Math.ceil(0.5 / spacing) : 1;

  ctx.fillStyle = 'black';
  let count = 0;
  for (let x = startX; x <= endX; x += spacing) {
    if (Math.abs(x) < 1e-6) continue;
    if (count % labelStep === 0) {
      ctx.save(); ctx.scale(1, -1);
      ctx.fillText(x.toFixed(2), x, 0.05); ctx.restore();
    }
    count++;
  }

  count = 0;
  for (let y = startY; y <= endY; y += spacing) {
    if (Math.abs(y) < 1e-6) continue;
    if (count % labelStep === 0) {
      ctx.save(); ctx.scale(1, -1);
      ctx.fillText(y.toFixed(2), 0.2, -y + 0.05); ctx.restore();
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

function screenToPlaneCoords(mx, my) {
  const rect = canvas2D.getBoundingClientRect();
  const x = (mx - rect.left - canvas2D.width / 2) * (CONFIG.RANGE_2D * 2) / canvas2D.width;
  const y = (canvas2D.height / 2 - (my - rect.top)) * (CONFIG.RANGE_2D * 2) / canvas2D.height;
  return { x, y };
}


// Drag 
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

document.getElementById('resetBtn').onclick = () => {
  CONFIG.OFFSET.x = 0;
  CONFIG.OFFSET.y = 0;
  updatePointsAndCanvas();
};

// Point Size
document.getElementById('pointSize').addEventListener('input', e => {
  const val = parseFloat(e.target.value);
  CONFIG.POINT_SIZE = val;
  e.target.previousElementSibling.querySelector('span').textContent = val.toFixed(1);
  inputMaterial.size = outputMaterial.size = heightMaterial.size = val * 0.05;
  drawCanvas(points);
});

// Height Scale
document.getElementById('zScale').addEventListener('input', e => {
  const val = parseFloat(e.target.value);
  CONFIG.Z_SCALE = val;
  e.target.previousElementSibling.querySelector('span').textContent = val.toFixed(1);
  updateGeometry(points);
});

// Point Spacing
document.getElementById('pointSpacing').addEventListener('input', e => {
  const val = parseFloat(e.target.value);
  CONFIG.SPACING = val;
  e.target.previousElementSibling.querySelector('span').textContent = val.toFixed(2);
  updatePointsAndCanvas();
});

function updatePointsAndCanvas() {
  points = generatePoints();
  updateGeometry(points);
  drawCanvas(points);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function main() {
  init3D();
  add3DAxisLabels();
  points = generatePoints();
  updateGeometry(points);
  drawCanvas(points);
  animate();
  canvas2D.style.cursor = 'grab';
}

main();

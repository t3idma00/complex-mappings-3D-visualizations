const CONFIG = {
  RANGE: 3,
  STEP: 0.5,
  BG_COLOR: 0xffffff,
  GRID_COLOR_X: 0x3498db,
  GRID_COLOR_Y: 0xe74c3c,
  AXIS_COLOR: 0x2c3e50,
  AXIS_WIDTH: 2,
  MINOR_GRID_OPACITY: 0.6,
  TRANSFORMED_GRID_OPACITY: 0.8
};

function applyFunction() {
  const input = document.getElementById('functionInput').value;
  const parsed = math.parse(input.replace(/z/g, '(x + i * y)'));
  const compiled = parsed.compile();

  function userTransform(x, y) {
    try {
      const result = compiled.evaluate({ x, y, i: math.complex(0, 1) });
      if (!result || !('re' in result) || !('im' in result)) return { x: NaN, y: NaN };
      return { x: result.re, y: result.im };
    } catch (err) {
      console.error(err);
      return { x: NaN, y: NaN };
    }
  }

  const canvasContainer = document.getElementById('custom-canvas');
  canvasContainer.innerHTML = '';
  initVisualization('custom-canvas', userTransform);
}

function initVisualization(canvasId, transformFunction) {
  const container = document.getElementById(canvasId);
  if (!container) return;

  const scene = new THREE.Scene();
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  const aspect = width / height;

  const camera = new THREE.OrthographicCamera(
    aspect > 1 ? -CONFIG.RANGE * aspect : -CONFIG.RANGE,
    aspect > 1 ? CONFIG.RANGE * aspect : CONFIG.RANGE,
    aspect > 1 ? CONFIG.RANGE : CONFIG.RANGE / aspect,
    aspect > 1 ? -CONFIG.RANGE : -CONFIG.RANGE / aspect,
    1, 1000
  );
  camera.position.z = 10;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(CONFIG.BG_COLOR);
  container.appendChild(renderer.domElement);

  addBaseGrid(scene);
  addTransformedGrid(scene, transformFunction);

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}

function addBaseGrid(scene) {
  for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += CONFIG.STEP) {
    if (Math.abs(y) < 0.01) continue;
    addLine(scene, [-CONFIG.RANGE, y, 0, CONFIG.RANGE, y, 0], CONFIG.GRID_COLOR_Y, 1, CONFIG.MINOR_GRID_OPACITY);
  }

  for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += CONFIG.STEP) {
    if (Math.abs(x) < 0.01) continue;
    addLine(scene, [x, -CONFIG.RANGE, 0, x, CONFIG.RANGE, 0], CONFIG.GRID_COLOR_X, 1, CONFIG.MINOR_GRID_OPACITY);
  }

  addLine(scene, [-CONFIG.RANGE, 0, 0, CONFIG.RANGE, 0, 0], CONFIG.AXIS_COLOR, CONFIG.AXIS_WIDTH, 1);
  addLine(scene, [0, -CONFIG.RANGE, 0, 0, CONFIG.RANGE, 0], CONFIG.AXIS_COLOR, CONFIG.AXIS_WIDTH, 1);
}

function addTransformedGrid(scene, transform) {
  for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += CONFIG.STEP) {
    const points = [];
    for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += 0.05) {
      const t = transform(x, y);
      if (!isNaN(t.x) && !isNaN(t.y) && isFinite(t.x) && isFinite(t.y)) {
        points.push(new THREE.Vector3(t.x, t.y, 0));
      }
    }
    if (points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      scene.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({
        color: CONFIG.GRID_COLOR_Y,
        transparent: true,
        opacity: CONFIG.TRANSFORMED_GRID_OPACITY
      })));
    }
  }

  for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += CONFIG.STEP) {
    const points = [];
    for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += 0.05) {
      const t = transform(x, y);
      if (!isNaN(t.x) && !isNaN(t.y) && isFinite(t.x) && isFinite(t.y)) {
        points.push(new THREE.Vector3(t.x, t.y, 0));
      }
    }
    if (points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      scene.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({
        color: CONFIG.GRID_COLOR_X,
        transparent: true,
        opacity: CONFIG.TRANSFORMED_GRID_OPACITY
      })));
    }
  }
}

function addLine(scene, coords, color, width = 1, opacity = 0.7) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(coords), 3));
  const material = new THREE.LineBasicMaterial({
    color,
    linewidth: width,
    transparent: true,
    opacity: opacity
  });
  scene.add(new THREE.Line(geometry, material));
}

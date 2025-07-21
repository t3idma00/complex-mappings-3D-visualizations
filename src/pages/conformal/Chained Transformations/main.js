const CONFIG = {
  RANGE: 3,
  STEP: 0.5,
  BG_COLOR: 0xffffff,
  GRID_COLOR_X: 0x3498db,
  GRID_COLOR_Y: 0xe74c3c,
  AXIS_COLOR: 0x000000,
  AXIS_WIDTH: 2,
  MINOR_GRID_OPACITY: 0.5,
  TRANSFORMED_GRID_OPACITY: 0.85
};

function renderAll() {
  const fExpr = document.getElementById("fInput").value || "z";
  const gExpr = document.getElementById("gInput").value || "z";
  const hExpr = document.getElementById("hInput").value || "z";

  const f = parseComplex(fExpr);
  const g = parseComplex(gExpr);
  const h = parseComplex(hExpr);

  const g_f = compose(g, f);
  const h_g_f = compose(h, g_f);

  renderGrid("canvas-f", f);
  renderGrid("canvas-g", g_f);
  renderGrid("canvas-h", h_g_f);
}

// Input expression into transform function
function parseComplex(expr) {
  try {
    const parsed = math.parse(expr.replace(/z/g, "(x + i * y)"));
    const compiled = parsed.compile();
    return (x, y) => {
      try {
        const result = compiled.evaluate({ x, y, i: math.complex(0, 1) });
        return { x: result.re, y: result.im };
      } catch {
        return { x: NaN, y: NaN };
      }
    };
  } catch {
    return () => ({ x: NaN, y: NaN });
  }
}

// Compose f(g(x, y))
function compose(f, g) {
  return (x, y) => {
    const mid = g(x, y);
    return f(mid.x, mid.y);
  };
}

// Create scene, camera, renderer
function createScene(containerId) {
  const container = document.getElementById(containerId);
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  const aspect = width / height;

  const scene = new THREE.Scene();

  const camera = new THREE.OrthographicCamera(
    -CONFIG.RANGE * aspect,
    CONFIG.RANGE * aspect,
    CONFIG.RANGE,
    -CONFIG.RANGE,
    1,
    1000
  );
  camera.position.z = 10;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(CONFIG.BG_COLOR);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  return { scene, camera, renderer };
}

function addAxisLabels(scene) {
  const labelSize = 64;

  function createLabel(text, position) {
    const canvas = document.createElement('canvas');
    canvas.width = labelSize;
    canvas.height = labelSize;
    const ctx = canvas.getContext('2d');
    ctx.font = '28px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, labelSize / 2, labelSize / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.5, 0.5, 1); // size in world units
    sprite.position.set(position.x, position.y, 0);
    scene.add(sprite);
  }

  const offset = CONFIG.RANGE + 0.3;
  createLabel('x', { x: offset, y: 0 });
  createLabel('y', { x: 0, y: offset });
}


function renderGrid(canvasId, transform) {
  const { scene, camera, renderer } = createScene(canvasId);

  addGrid(scene);
  addAxisLabels(scene); 
  addTransformed(scene, transform);

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  animate();
}


// Add base grid
function addGrid(scene) {
  for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += CONFIG.STEP) {
    const points = [
      new THREE.Vector3(-CONFIG.RANGE, y, 0),
      new THREE.Vector3(CONFIG.RANGE, y, 0)
    ];
    addLine(scene, points, CONFIG.GRID_COLOR_Y, CONFIG.MINOR_GRID_OPACITY);
  }

  for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += CONFIG.STEP) {
    const points = [
      new THREE.Vector3(x, -CONFIG.RANGE, 0),
      new THREE.Vector3(x, CONFIG.RANGE, 0)
    ];
    addLine(scene, points, CONFIG.GRID_COLOR_X, CONFIG.MINOR_GRID_OPACITY);
  }

  // X and Y axes
  addLine(scene, [
    new THREE.Vector3(-CONFIG.RANGE, 0, 0),
    new THREE.Vector3(CONFIG.RANGE, 0, 0)
  ], CONFIG.AXIS_COLOR, 1);

  addLine(scene, [
    new THREE.Vector3(0, -CONFIG.RANGE, 0),
    new THREE.Vector3(0, CONFIG.RANGE, 0)
  ], CONFIG.AXIS_COLOR, 1);
}

// Draw transformed grid lines
function addTransformed(scene, transform) {
  for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += CONFIG.STEP) {
    const points = [];
    for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += 0.05) {
      const pt = transform(x, y);
      if (isFinite(pt.x) && isFinite(pt.y)) {
        points.push(new THREE.Vector3(pt.x, pt.y, 0));
      }
    }
    if (points.length > 1) {
      addLine(scene, points, CONFIG.GRID_COLOR_Y, CONFIG.TRANSFORMED_GRID_OPACITY);
    }
  }

  for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += CONFIG.STEP) {
    const points = [];
    for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += 0.05) {
      const pt = transform(x, y);
      if (isFinite(pt.x) && isFinite(pt.y)) {
        points.push(new THREE.Vector3(pt.x, pt.y, 0));
      }
    }
    if (points.length > 1) {
      addLine(scene, points, CONFIG.GRID_COLOR_X, CONFIG.TRANSFORMED_GRID_OPACITY);
    }
  }
}

// Utility to add a line
function addLine(scene, points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity
  });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

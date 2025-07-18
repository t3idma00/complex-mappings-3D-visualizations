const globeCanvas = document.getElementById('globe');
const mapCanvas = document.getElementById('map');
const mapCtx = mapCanvas.getContext('2d');
const uploadInput = document.getElementById('upload');

// THREE.js setup
const renderer = new THREE.WebGLRenderer({ canvas: globeCanvas, antialias: true });
renderer.setSize(500, 500);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.z = 15;
scene.add(new THREE.AmbientLight(0xffffff));

const globeGeo = new THREE.SphereGeometry(5, 64, 64);
let globe = null;

let textureCanvas, textureCtx, textureNeedsUpdate = false;
let isDrawing = false;
let lastDrawPos = { x: 0, y: 0 };

let isDragging = false;
let previousMouse = { x: 0, y: 0 };

// Raycaster + Mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();


// Create realistic 3D pen as a group
const pen = new THREE.Group();

// Pen tip
const tipGeometry = new THREE.ConeGeometry(0.05, 0.2, 16);
const tipMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
const tip = new THREE.Mesh(tipGeometry, tipMaterial);
tip.position.y = -0.6; 
pen.add(tip);

// Pen body
const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 16);
const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
pen.add(body);



// Final position/visibility
pen.visible = false;
scene.add(pen);


function latLonToUV(lat, lon) {
  return {
    u: (lon + 180) / 360,
    v: 1 - (lat + 90) / 180
  };
}

function invMercator(x, y) {
  const λ = (x - 250) / 250 * Math.PI;
  const φ = 2 * Math.atan(Math.exp((250 - y) * Math.PI / 250)) - Math.PI / 2;
  return {
    lon: λ * 180 / Math.PI,
    lat: φ * 180 / Math.PI
  };
}

function latToY(lat) {
  const φ = Math.min(Math.max(lat, -85), 85) * Math.PI / 180;
  return 250 - 250 * Math.log(Math.tan(Math.PI / 4 + φ / 2)) / Math.PI;
}

function lonToX(lon) {
  return 250 + (lon * Math.PI / 180) * 250 / Math.PI;
}

function drawGrid() {
  mapCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  mapCtx.lineWidth = 1;

  for (let lat = -75; lat <= 75; lat += 15) {
    const y = latToY(lat);
    mapCtx.beginPath();
    mapCtx.moveTo(0, y);
    mapCtx.lineTo(500, y);
    mapCtx.stroke();
  }

  for (let lon = -180; lon <= 180; lon += 30) {
    const x = lonToX(lon);
    mapCtx.beginPath();
    mapCtx.moveTo(x, 0);
    mapCtx.lineTo(x, 500);
    mapCtx.stroke();
  }
}

function drawMap(texCanvas) {
  const texCtx = texCanvas.getContext('2d');
  const texData = texCtx.getImageData(0, 0, texCanvas.width, texCanvas.height);

  const imageData = mapCtx.createImageData(500, 500);
  const data = imageData.data;

  for (let y = 0; y < 500; y++) {
    for (let x = 0; x < 500; x++) {
      const { lat, lon } = invMercator(x, y);
      if (lat < -85 || lat > 85) continue;

      const { u, v } = latLonToUV(lat, lon);
      const tx = Math.floor(u * texCanvas.width);
      const ty = Math.floor(v * texCanvas.height);

      const srcIdx = (ty * texCanvas.width + tx) * 4;
      const dstIdx = (y * 500 + x) * 4;

      data[dstIdx] = texData.data[srcIdx];
      data[dstIdx + 1] = texData.data[srcIdx + 1];
      data[dstIdx + 2] = texData.data[srcIdx + 2];
      data[dstIdx + 3] = 255;
    }
  }

  mapCtx.putImageData(imageData, 0, 0);
  drawGrid();
}

function getMouseUV(event) {
  const rect = globeCanvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(globe);
  if (intersects.length > 0) {
    const uv = intersects[0].uv;
    return {
      x: uv.x * textureCanvas.width,
      y: (1 - uv.y) * textureCanvas.height
    };
  }
  return null;
}

function updatePenPosition(event) {
  const rect = globeCanvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(globe);
  if (intersects.length > 0) {
    const intersect = intersects[0];
    const point = intersect.point.clone();
    const normal = intersect.face.normal.clone().transformDirection(globe.matrixWorld);

    const offset = 0.6;
    pen.position.copy(point.clone().add(normal.clone().multiplyScalar(offset)));

    const yAxis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, normal.normalize());
    pen.quaternion.copy(quaternion);

    pen.visible = true;
  } else {
    pen.visible = false;
  }
}

// === Mouse Events ===
globeCanvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isDrawing = true;
    const pos = getMouseUV(e);
    if (pos) lastDrawPos = pos;
  } else if (e.button === 2) {
    isDragging = true;
    previousMouse = { x: e.clientX, y: e.clientY };
  }
});

globeCanvas.addEventListener('mousemove', (e) => {
  updatePenPosition(e);

  if (isDrawing && textureCtx) {
    const pos = getMouseUV(e);
    if (pos) {
      textureCtx.strokeStyle = 'blue';
      textureCtx.lineWidth = 4;
      textureCtx.lineCap = 'round';

      textureCtx.beginPath();
      textureCtx.moveTo(lastDrawPos.x, lastDrawPos.y);
      textureCtx.lineTo(pos.x, pos.y);
      textureCtx.stroke();

      lastDrawPos = pos;
      textureNeedsUpdate = true;
    }
  }

  if (isDragging && globe) {
    const deltaX = e.clientX - previousMouse.x;
    const deltaY = e.clientY - previousMouse.y;

    globe.rotation.y += deltaX * 0.005;
    globe.rotation.x += deltaY * 0.005;
    globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));

    previousMouse = { x: e.clientX, y: e.clientY };
  }
});

globeCanvas.addEventListener('mouseup', () => {
  isDrawing = false;
  isDragging = false;
  pen.visible = false;
});

globeCanvas.addEventListener('mouseleave', () => {
  isDrawing = false;
  isDragging = false;
  pen.visible = false;
});

globeCanvas.addEventListener('contextmenu', e => e.preventDefault());

// === Upload Image and Initialize Texture ===
uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      textureCanvas = document.createElement('canvas');
      textureCanvas.width = img.width;
      textureCanvas.height = img.height;
      textureCtx = textureCanvas.getContext('2d');
      textureCtx.drawImage(img, 0, 0);

      const texture = new THREE.CanvasTexture(textureCanvas);
      if (globe) scene.remove(globe);
      globe = new THREE.Mesh(globeGeo, new THREE.MeshBasicMaterial({ map: texture }));
      scene.add(globe);

      drawMap(textureCanvas);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// === Animation Loop ===
function animate() {
  requestAnimationFrame(animate);
  if (globe && textureNeedsUpdate) {
    globe.material.map.needsUpdate = true;
    drawMap(textureCanvas);
    textureNeedsUpdate = false;
  }
  renderer.render(scene, camera);
}
animate();

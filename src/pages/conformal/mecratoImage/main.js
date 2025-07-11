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

// Drag control 
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

globeCanvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  previousMousePosition = { x: e.clientX, y: e.clientY };
});

globeCanvas.addEventListener('mousemove', (e) => {
  if (!isDragging || !globe) return;

  const deltaX = e.clientX - previousMousePosition.x;
  const deltaY = e.clientY - previousMousePosition.y;

  globe.rotation.y += deltaX * 0.005;
  globe.rotation.x += deltaY * 0.005;
  globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x)); 

  previousMousePosition = { x: e.clientX, y: e.clientY };
});

globeCanvas.addEventListener('mouseup', () => {
  isDragging = false;
});

globeCanvas.addEventListener('mouseleave', () => {
  isDragging = false;
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Converts lat/lon to UV coordinates
function latLonToUV(lat, lon) {
  const u = (lon + 180) / 360;
  const v = 1 - (lat + 90) / 180;
  return { u, v };
}

// Inverse Mercator projection
function invMercator(x, y) {
  const λ = (x - 250) / 250 * Math.PI;
  const φ = 2 * Math.atan(Math.exp((250 - y) * Math.PI / 250)) - Math.PI / 2;
  return {
    lon: λ * 180 / Math.PI,
    lat: φ * 180 / Math.PI
  };
}

function latToY(lat) {
  const phi = Math.min(Math.max(lat, -85), 85) * Math.PI / 180;
  return 250 - 250 * Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI;
}

function lonToX(lon) {
  return 250 + (lon * Math.PI / 180) * 250 / Math.PI;
}

function drawMap(img) {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = img.width;
  texCanvas.height = img.height;
  const texCtx = texCanvas.getContext('2d');
  texCtx.drawImage(img, 0, 0);
  const texData = texCtx.getImageData(0, 0, texCanvas.width, texCanvas.height);

  const imgData = mapCtx.createImageData(500, 500);
  const data = imgData.data;

  for (let y = 0; y < 500; y++) {
    for (let x = 0; x < 500; x++) {
      const { lat, lon } = invMercator(x, y);
      if (lat < -85 || lat > 85) continue;

      const { u, v } = latLonToUV(lat, lon);
      const tx = Math.floor(u * img.width);
      const ty = Math.floor(v * img.height);

      if (tx < 0 || tx >= img.width || ty < 0 || ty >= img.height) continue;

      const i = (ty * img.width + tx) * 4;
      const j = (y * 500 + x) * 4;

      data[j] = texData.data[i];
      data[j + 1] = texData.data[i + 1];
      data[j + 2] = texData.data[i + 2];
      data[j + 3] = 255;
    }
  }

  mapCtx.putImageData(imgData, 0, 0);
  drawGrid();
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

// Handle local image upload
uploadInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;

      if (globe) scene.remove(globe);
      globe = new THREE.Mesh(globeGeo, new THREE.MeshBasicMaterial({ map: texture }));
      scene.add(globe);

      drawMap(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

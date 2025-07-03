const globeCanvas = document.getElementById('globe');
const mapCanvas = document.getElementById('map');
mapCanvas.width = 500;
mapCanvas.height = 500;
const mapCtx = mapCanvas.getContext('2d');

const renderer = new THREE.WebGLRenderer({ canvas: globeCanvas, antialias: true });
renderer.setSize(500, 500);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.z = 15;
scene.add(new THREE.AmbientLight(0xffffff));

const geometry = new THREE.SphereGeometry(5, 64, 64);

let globe;

function latLonToUV(lat, lon) {
  // Convert lat, lon 
  const u = (lon + 180) / 360;
  const v = 1 - (lat + 90) / 180;
  return { u, v };
}

function inverseMercator(x, y, R = 250) {
  const lambda = ((x - 250) / R) * Math.PI;
  const phi = 2 * Math.atan(Math.exp((250 - y) * Math.PI / R)) - Math.PI / 2;
  return {
    lon: lambda * 180 / Math.PI,
    lat: phi * 180 / Math.PI,
  };
}

// Load elephant image 
const img = new Image();
img.crossOrigin = 'anonymous';  
img.src = 'https://upload.wikimedia.org/wikipedia/commons/6/63/African_elephant_warning_raised_trunk.jpg';

img.onload = () => {
  // Create Three.js texture
  const texture = new THREE.Texture(img);
  texture.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({ map: texture });
  globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  animate();

  renderInverseMercatorProjection(img);
};

function animate() {
  requestAnimationFrame(animate);
  if (globe) globe.rotation.y += 0.002;
  renderer.render(scene, camera);
}

// Render Mercator projection 
function renderInverseMercatorProjection(img) {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = img.width;
  texCanvas.height = img.height;
  const texCtx = texCanvas.getContext('2d');
  texCtx.drawImage(img, 0, 0);
  const texData = texCtx.getImageData(0, 0, texCanvas.width, texCanvas.height);

  const width = mapCanvas.width;
  const height = mapCanvas.height;

  const imageData = mapCtx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { lat, lon } = inverseMercator(x, y);

      if (lat < -85 || lat > 85) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
        continue;
      }

      const { u, v } = latLonToUV(lat, lon);

      let tx = Math.floor(u * texCanvas.width);
      let ty = Math.floor(v * texCanvas.height);

      tx = Math.min(texCanvas.width - 1, Math.max(0, tx));
      ty = Math.min(texCanvas.height - 1, Math.max(0, ty));

      const texIdx = (ty * texCanvas.width + tx) * 4;
      const r = texData.data[texIdx];
      const g = texData.data[texIdx + 1];
      const b = texData.data[texIdx + 2];
      const a = texData.data[texIdx + 3];

      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }

  mapCtx.putImageData(imageData, 0, 0);

  drawGrid();
}

function drawGrid() {
  mapCtx.strokeStyle = 'rgba(0,0,0,0.2)';
  mapCtx.lineWidth = 1;

  for (let lat = -75; lat <= 75; lat += 15) {
    mapCtx.beginPath();
    for (let x = 0; x <= mapCanvas.width; x++) {
      const y = latToY(lat);
      if (x === 0) mapCtx.moveTo(x, y);
      else mapCtx.lineTo(x, y);
    }
    mapCtx.stroke();
  }

  for (let lon = -180; lon <= 180; lon += 30) {
    mapCtx.beginPath();
    for (let y = 0; y <= mapCanvas.height; y++) {
      const x = lonToX(lon);
      if (y === 0) mapCtx.moveTo(x, y);
      else mapCtx.lineTo(x, y);
    }
    mapCtx.stroke();
  }
}

function latToY(lat, R = 250) {
  const maxPhi = 85;
  const clampedLat = Math.min(Math.max(lat, -maxPhi), maxPhi);
  const phiRad = clampedLat * Math.PI / 180;
  return 250 - R * Math.log(Math.tan(Math.PI / 4 + phiRad / 2)) / Math.PI;
}

function lonToX(lon, R = 250) {
  const lambda = lon * Math.PI / 180;
  return R * lambda / Math.PI + 250;
}

const zoneImages = {
  'Landing Zone': Object.assign(new Image(), { src: './assets/textures/moon.jpg' }),
  'Crater Valley': Object.assign(new Image(), { src: './assets/textures/crater.jpg' }),
  'Ruined Base': Object.assign(new Image(), { src: './assets/textures/ruined.jpg' }),
  'Power Hub': Object.assign(new Image(), { src: './assets/textures/stars.jpg' })
};
const zoneData = [
  { name: 'Landing Zone', x: 0, z: 0 },
  { name: 'Crater Valley', x: 500, z: 0 },
  { name: 'Ruined Base', x: 0, z: -500 },
  { name: 'Power Hub', x: 500, z: -500 }
];

export function drawMinimap(camera, enemies, crystalData) {
  const canvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const mapSize = 1000;
  const scale = canvas.width / mapSize;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  zoneData.forEach(zone => {
    const img = zoneImages[zone.name];
    if (img.complete) {
      const zoneSize = 500 * scale;
      const dx = (zone.x - camera.position.x) * scale + centerX - zoneSize / 2;
      const dz = (zone.z - camera.position.z) * scale + centerY - zoneSize / 2;
      ctx.drawImage(img, dx, dz, zoneSize, zoneSize);
    }
  });

  ctx.beginPath();
  ctx.arc(centerX, centerY, canvas.width / 2 - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.clip();

  ctx.fillStyle = 'lime';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'red';
  enemies.forEach(e => {
    const dx = (e.position.x - camera.position.x) * scale;
    const dz = (e.position.z - camera.position.z) * scale;
    ctx.beginPath();
    ctx.arc(centerX + dx, centerY + dz, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'limegreen';
  crystalData.forEach(pos => {
    const dx = (pos.x - camera.position.x) * scale;
    const dz = (pos.z - camera.position.z) * scale;
    ctx.beginPath();
    ctx.arc(centerX + dx, centerY + dz, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

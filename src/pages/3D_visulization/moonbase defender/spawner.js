
export function spawnWave(waveNumber, scene, controls, enemies, enemyBullets, airships, airshipBombs) {
  const playerPos = controls.getObject().position; // Player position reference
  const minDistance = 50; // Minimum distance from player
  const spawnRange = 300; // Range for spawning enemies

  for (let i = 0; i < waveNumber; i++) {
    let x, z, dist;

    // generating random positions 
    do {
      x = (Math.random() - 0.5) * spawnRange;
      z = (Math.random() - 0.5) * spawnRange - 100;
      dist = Math.sqrt((x - playerPos.x) ** 2 + (z - playerPos.z) ** 2);
    } while (dist < minDistance);

    import('./enemies.js').then(mod => {
      mod.spawnEnemy(scene, controls, enemies, enemyBullets, './assets/models/enemy1.glb', x, z);
    });
  }
}



let enemyShootSound;

const listener = new THREE.AudioListener();
document.addEventListener('DOMContentLoaded', () => {
  const camera = document.querySelector('canvas')?.__threeObj?.camera;
  if (camera) camera.add(listener);
});

new THREE.AudioLoader().load('./assets/sounds/Enemygun_sound.mp3', buffer => {
  enemyShootSound = new THREE.Audio(listener);
  enemyShootSound.setBuffer(buffer);
  enemyShootSound.setVolume(1.2); // volume 
});

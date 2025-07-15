
export function spawnWave(waveNumber, scene, controls, enemies, enemyBullets, airships, airshipBombs) {
  for (let i = 0; i < waveNumber; i++) {
    const x = (Math.random() - 0.5) * 300;
    const z = (Math.random() - 0.5) * 300 - 100;
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
  enemyShootSound.setVolume(1.2); // adjust volume as needed
});

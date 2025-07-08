
export function spawnWave(waveNumber, scene, controls, enemies, enemyBullets, airships, airshipBombs) {
  for (let i = 0; i < waveNumber; i++) {
    const x = (Math.random() - 0.5) * 300;
    const z = (Math.random() - 0.5) * 300 - 100;
    import('./enemies.js').then(mod => {
      mod.spawnEnemy(scene, controls, enemies, enemyBullets, './assets/models/enemy1.glb', x, z);
    });
  }
}

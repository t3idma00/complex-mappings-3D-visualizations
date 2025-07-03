import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3 } from 'three';

export function spawnEnemy(scene, controls, enemies, enemyBullets, modelPath, x, z) {
  new GLTFLoader().load(modelPath, gltf => {
    const enemy = gltf.scene;
    enemy.scale.set(0.1, 0.1, 0.1);
    enemy.position.set(x, 0, z);
    enemy.health = 10;
    enemy.mixer = new AnimationMixer(enemy);
    enemy.mixer.clipAction(gltf.animations[0]).play();
    scene.add(enemy);
    enemies.push(enemy);

    setInterval(() => {
      if (enemy.health <= 0) return;
      const eye = enemy.position.clone(); eye.y += 5;
      const dir = controls.getObject().position.clone().sub(eye).normalize();
      const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 })
      );
      bullet.position.copy(eye);
      bullet.userData.velocity = dir.multiplyScalar(0.08);
      scene.add(bullet);
      enemyBullets.push(bullet);
    }, 2000);
  });
}

export function spawnAirship(scene, airships, airshipBombs, modelPath, x, z) {
  new GLTFLoader().load(modelPath, gltf => {
    const ship = gltf.scene;
    ship.scale.set(2, 2, 2);
    ship.position.set(x, 10, z);
    ship.health = 15;
    scene.add(ship);
    airships.push(ship);

    setInterval(() => {
      if (ship.health <= 0) return;
      const bomb = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0xff6600 })
      );
      bomb.position.copy(ship.position);
      bomb.userData.velocity = new THREE.Vector3(0, -0.1, 0);
      scene.add(bomb);
      airshipBombs.push(bomb);
    }, 4000);
  });
}

export function updateEnemies(scene, delta, controls, enemies) {
  enemies.forEach(e => {
    e.mixer?.update(delta);
    if (e.health > 0) {
      const dir = controls.getObject().position.clone().sub(e.position); dir.y = 0;
      if (dir.length() > 1) e.position.add(dir.normalize().multiplyScalar(0.02));
      e.lookAt(controls.getObject().position.x, e.position.y, controls.getObject().position.z);
    }
  });
}

export function updateAirships(scene, delta, controls, airships) {
  airships.forEach(a => {
    if (a.health > 0) {
      const dir = controls.getObject().position.clone().sub(a.position); dir.y = 0;
      if (dir.length() > 2) a.position.add(dir.normalize().multiplyScalar(0.01));
      a.lookAt(controls.getObject().position.x, a.position.y, controls.getObject().position.z);
    }
  });
}

export function handleEnemyHits(scene, bullets, enemies, airships, turrets) {
  [...bullets].forEach((b, i) => {
    b.position.add(b.userData.velocity);
    enemies.forEach(e => {
      if (e.health > 0 && new Box3().setFromObject(e).containsPoint(b.position)) {
        e.health--; scene.remove(b); bullets.splice(i, 1);
        if (e.health <= 0) setTimeout(() => scene.remove(e), 1000);
      }
    });
    airships.forEach(a => {
      if (a.health > 0 && new Box3().setFromObject(a).containsPoint(b.position)) {
        a.health--; scene.remove(b); bullets.splice(i, 1);
        if (a.health <= 0) setTimeout(() => scene.remove(a), 1000);
      }
    });
    turrets.forEach(t => {
      if (t.health > 0 && b.position.distanceTo(t.object.position) < 1.5) {
        t.health--; scene.remove(b); bullets.splice(i, 1);
        if (t.health <= 0) scene.remove(t.object);
      }
    });
  });
}

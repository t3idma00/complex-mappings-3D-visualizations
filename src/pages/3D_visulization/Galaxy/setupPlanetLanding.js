import * as THREE from 'three';
import { planetInfo } from './planetinfo.js';

export function setupPlanetLanding(scene, camera, controls, planets,renderer) {
  const popup = document.getElementById('popup');
  const exitBtn = document.getElementById('exitPlanetButton');
  let skybox = null;
  let surface = null;

  window.addEventListener('click', e => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const clicked = intersects[0].object;
      const clickedName = clicked.name?.toLowerCase() || '';
      const matched = planets.find(p => p.name === clickedName);
      if (matched) showPlanetPopup(matched);
    }
  });
function showPlanetPopup(planet) {
  const info = planetInfo[planet.name] || '';
  popup.innerHTML = `
    ${info}
    <br>
    <button id="landButton">🌌 Land Here</button>
  `;
  popup.style.display = 'block';
  document.getElementById('landButton').onclick = () => landOnPlanet(planet);
}

  function landOnPlanet(planet) {
    popup.style.display = 'none';

    surface = createSurface(planet.name);
    scene.add(surface);

    skybox = createSkybox(planet.name);
    scene.add(skybox);

    camera.position.set(0, 2, 5);
    controls.target.set(0, 2, 0);
    controls.update();

    exitBtn.style.display = 'block';
  }

  exitBtn.onclick = () => {
    if (surface) scene.remove(surface);
    if (skybox) scene.remove(skybox);
    exitBtn.style.display = 'none';
    controls.target.set(0, 0, 0);
    camera.position.set(0, 30, 60);
    controls.update();
  };

  function createSurface(name) {
    const geo = new THREE.PlaneGeometry(100, 100);
    const mat = new THREE.MeshStandardMaterial({ color: name === 'mars' ? 0xaa5533 : 0x3366aa });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    return plane;
  }

  function createSkybox(name) {
    const group = new THREE.Group();
    const stars = name === 'earth'
      ? ['Polaris', 'Ursa Major', 'Cassiopeia']
      : ['Southern Cross', 'Centaurus', 'Alpha Centauri'];
    stars.forEach((star, i) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }));
      sprite.position.set(Math.cos(i) * 50, 20 + i * 5, Math.sin(i) * 50);
      sprite.scale.set(2, 2, 2);
      sprite.name = star;
      group.add(sprite);
    });
    return group;
  }
}




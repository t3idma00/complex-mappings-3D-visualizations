import * as THREE from 'three';
import { planetInfo } from './planetinfo.js';
import { createConstellation, realConstellations } from './constellations.js';


const landingLocations = {
  mercury: new THREE.Vector3(300, 0, 300),
  venus: new THREE.Vector3(-300, 0, 300),
  earth: new THREE.Vector3(300, 0, -300),
  mars: new THREE.Vector3(-300, 0, -300),
  jupiter: new THREE.Vector3(600, 0, 600),
  saturn: new THREE.Vector3(-600, 0, 600),
  uranus: new THREE.Vector3(600, 0, -600),
  neptune: new THREE.Vector3(-600, 0, -600),
  default: new THREE.Vector3(0, 0, 0)
};





export function setupPlanetLanding(scene, camera, controls, planets, renderer) {
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

  const landingPos = landingLocations[planet.name] || landingLocations.default;

  
  if (surface) scene.remove(surface);
  if (skybox) scene.remove(skybox);

  surface = createSurface(planet.name);
  surface.position.copy(landingPos);
  scene.add(surface);

  skybox = createSkybox(planet.name);
  skybox.position.copy(landingPos);
  scene.add(skybox);

  // Smooth camera transition
  const fromPos = camera.position.clone();
  const toPos = landingPos.clone().add(new THREE.Vector3(0, 2, 5));
  const fromTarget = controls.target.clone();
  const toTarget = landingPos.clone();

  const duration = 1000;
  const start = performance.now();

  function animateCamera(time) {
    const t = Math.min((time - start) / duration, 1);
    camera.position.lerpVectors(fromPos, toPos, t);
    controls.target.lerpVectors(fromTarget, toTarget, t);
    controls.update();
    if (t < 1) requestAnimationFrame(animateCamera);
  }

  requestAnimationFrame(animateCamera);

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

 function createSurface(planetName) {
  const geo = new THREE.PlaneGeometry(100, 100);
  const loader = new THREE.TextureLoader();

  const textureMap = {
    mercury: '2k_mercury.jpg',
    venus: '2k_venus_surface.jpg', // better than atmosphere
    earth: '2k_earth.jpg',
    mars: '2k_mars.jpg',
    jupiter: '2k_jupiter.jpg',
    saturn: '2k_saturn.jpg',
    uranus: '2k_uranus.jpg',
    neptune: '2k_neptune.jpg',
    default: '2k_sun.jpg' // fallback texture
  };

  const textureFile = textureMap[planetName] || textureMap.default;
  const texture = loader.load(`./asset/${textureFile}`);

  const mat = new THREE.MeshStandardMaterial({ map: texture });
  const surface = new THREE.Mesh(geo, mat);
  surface.rotation.x = -Math.PI / 2;
  surface.receiveShadow = true;
  return surface;
}


  function createSkybox(planetName) {
  const group = new THREE.Group();

if (planetName === 'earth') {
  realConstellations.forEach(({ name, stars }) => {
    const starObjs = stars.map(s => {
      const raRad = s.ra * Math.PI / 180;
      const decRad = s.dec * Math.PI / 180;
      const radius = 25;
      let x = Math.cos(decRad) * Math.cos(raRad);
      let y = Math.sin(decRad);
      let z = Math.cos(decRad) * Math.sin(raRad);
      const len = Math.sqrt(x * x + y * y + z * z);
      x *= radius / len;
      y *= radius / len;
      z *= radius / len;
      return { name: s.name, position: [x, y, z], info: s.info };
    });
    group.add(createConstellation(name, starObjs));
  });


  } else {

    const starGroups = {
      mercury: ['Thuban', 'Aldebaran'],
      venus: ['Vega', 'Altair'],
      mars: ['Betelgeuse', 'Antares'],
      jupiter: ['Io', 'Europa', 'Ganymede'],
      saturn: ['Titan', 'Enceladus'],
      uranus: ['Miranda', 'Ariel'],
      neptune: ['Triton'],
      default: ['Alpha Centauri']
    };

    const stars = starGroups[planetName] || starGroups.default;
    stars.forEach((star, i) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }));
      sprite.position.set(Math.cos(i) * 50, 20 + i * 5, Math.sin(i) * 50);
      sprite.scale.set(2, 2, 2);
      sprite.name = star;
      group.add(sprite);
    });
  }

  return group;
}

}

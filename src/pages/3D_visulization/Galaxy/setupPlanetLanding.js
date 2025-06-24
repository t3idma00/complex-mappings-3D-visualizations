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
  const panel = document.getElementById('controlPanel');
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
    panel.style.display = 'none';
    const landingPos = landingLocations[planet.name] || landingLocations.default;

    if (surface) scene.remove(surface);
    if (skybox) {
      skybox.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(mat => mat.dispose());
          else obj.material.dispose();
        }
      });
      scene.remove(skybox);
      skybox = null;
    }

    surface = createSurface(planet.name);
    surface.position.copy(landingPos);
    scene.add(surface);

    skybox = createSkybox(planet.name);
    skybox.position.copy(landingPos);
    scene.add(skybox);

    const fromPos = camera.position.clone();
    const toPos = landingPos.clone().add(new THREE.Vector3(0, 5, 0));
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

    controls.maxDistance = 40;
    controls.minDistance = 1;
    controls.maxPolarAngle = Math.PI;
    controls.minPolarAngle = 0;

    exitBtn.style.display = 'block';
  }

  exitBtn.onclick = () => {
    if (surface) scene.remove(surface);
    if (skybox) scene.remove(skybox);
    panel.style.display = 'block';
    exitBtn.style.display = 'none';
    controls.target.set(0, 0, 0);
    camera.position.set(0, 30, 60);
    controls.maxDistance = Infinity;
    controls.minDistance = 0;
    controls.maxPolarAngle = Math.PI;
    controls.minPolarAngle = 0;
    controls.update();
  };

  function createSurface(planetName) {
    const loader = new THREE.TextureLoader();
    const textureMap = {
      mercury: '2k_mercury.jpg',
      venus: '2k_venus_surface.jpg',
      earth: '2k_earth.jpg',
      mars: '2k_mars.jpg',
      jupiter: '2k_jupiter.jpg',
      saturn: '2k_saturn.jpg',
      uranus: '2k_uranus.jpg',
      neptune: '2k_neptune.jpg',
      default: '2k_sun.jpg'
    };

    const textureFile = textureMap[planetName] || textureMap.default;
    const texture = loader.load(`./asset/${textureFile}`);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const size = 100;
    const geo = new THREE.PlaneGeometry(size, size, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.FrontSide });

    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.renderOrder = -1;

    return plane;
  }

  function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(10, 5, 1);
    sprite.renderOrder = 999;
    sprite.material.depthTest = false;
    return sprite;
  }

  function createSkybox(planetName) {
  const group = new THREE.Group();

  const skyColors = {
    earth:   { top: '#0c2b5a', bottom: '#104f91' },
    mars:    { top: '#3b1f0f', bottom: '#703c22' },
    venus:   { top: '#473323', bottom: '#bb9c4a' },
    jupiter: { top: '#1b1a34', bottom: '#4e4a80' },
    saturn:  { top: '#2d2b40', bottom: '#aa95d3' },
    uranus:  { top: '#153544', bottom: '#88cde4' },
    neptune: { top: '#0b2447', bottom: '#2a64a6' },
    mercury: { top: '#1a1a1a', bottom: '#4a4a4a' },
    default: { top: '#0c2b5a', bottom: '#104f91' }
  };

  const { top, bottom } = skyColors[planetName] || skyColors.default;

  const skyGeo = new THREE.SphereGeometry(48, 128, 64);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(top) },
      bottomColor: { value: new THREE.Color(bottom) },
      offset: { value: 50 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
      }
    `
  });

  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.rotation.x = Math.PI / 2;
  group.add(sky);

 if (planetName === 'earth') {
  const directions = ['NORTH', 'NORTHEAST', 'EAST', 'SOUTHEAST', 'SOUTH', 'SOUTHWEST', 'WEST', 'NORTHWEST'];
  directions.forEach((dir, i) => {
    const angle = (i / directions.length) * Math.PI * 2;
    const x = Math.sin(angle) * 42;
    const z = Math.cos(angle) * 42;
    const sprite = createTextSprite(dir);
    sprite.position.set(x, 1.5, z);
    group.add(sprite);
  });
}

  group.rotation.y = Math.PI;

  realConstellations.forEach(({ name, stars }) => {
    const starObjs = stars.map(s => {
      const raRad = s.ra * Math.PI / 180;
      const decRad = s.dec * Math.PI / 180;
      const radius = 46;
      let x = Math.cos(decRad) * Math.cos(raRad);
      let y = Math.sin(decRad);
      let z = Math.cos(decRad) * Math.sin(raRad);
      const len = Math.sqrt(x * x + y * y + z * z);
      x *= radius / len;
      y *= radius / len;
      z *= radius / len;
      return { name: s.name, position: [x, y, z], info: s.info };
    });

    const constellation = createConstellation(name, starObjs);
    group.add(constellation);

    if (starObjs.length > 0) {
      const avg = starObjs.reduce((acc, s) => {
        acc.x += s.position[0];
        acc.y += s.position[1];
        acc.z += s.position[2];
        return acc;
      }, { x: 0, y: 0, z: 0 });

      const n = starObjs.length;
      const label = createTextSprite(name);
      label.position.set(avg.x / n, avg.y / n + 1.5, avg.z / n);
      group.add(label);
    }
  });

  return group;
}
}

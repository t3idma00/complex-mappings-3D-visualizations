import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createRingGalaxy,
  createSpiralGalaxy,
  createTwinklingStars,
  createSpacecraft,
  createPhysicsWorld,
  createSolarSystemWithPhysics,
  updatePhysics
} from './models.js';
import { planetInfo, Constellations } from './planetinfo.js';
import { setupControls, updateSpacecraftMovement, onShoot } from './control.js';
import { setupPlanetLanding } from './setupPlanetLanding.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 60);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const world = createPhysicsWorld();
const { sun, planets } = createSolarSystemWithPhysics(scene, world);

const dateDisplay = document.getElementById('dateDisplay');
const baseYear = new Date().getFullYear();
let completedOrbits = 0;
let lastAngle = 0;

const spiralGroup = new THREE.Group();
spiralGroup.add(createSpiralGalaxy({
  starCount: 15000,
  radius: 30,
  branches: 3,
  spin: 1.5,
  randomness: 0.3,
  yThickness: 1.2,
  innerColor: '#fff5cc',
  outerColor: '#cc33ff'
}));
spiralGroup.position.set(-40, 10, -20);
spiralGroup.rotation.set(Math.PI / 4, Math.PI / 5, 0);
scene.add(spiralGroup);

const ringGalaxies = createRingGalaxy({
  countPerRing: 10000,
  size: 0.03,
  radii: [1.5, 3, 3.5],
  thickness: 0.7,
  colorStart: '#ff6030',
  colorEnd: '#1b3984'
});
ringGalaxies.forEach((r, i) => {
  r.position.set(30, -5, 20);
  r.rotation.set(Math.PI, 0, 0);
  scene.add(r);
});

const starField = createTwinklingStars(4000, 300);
scene.add(starField);

const spacecraft = createSpacecraft();
scene.add(spacecraft);
let spacecraftActive = true;

const bullets = [];
onShoot(() => {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  bullet.position.copy(spacecraft.position);
  const direction = new THREE.Vector3(0, 1, 0);
  direction.applyQuaternion(spacecraft.quaternion);
  direction.normalize();
  bullet.userData.velocity = direction.multiplyScalar(1);
  scene.add(bullet);
  bullets.push(bullet);
});

const listener = new THREE.AudioListener();
camera.add(listener);
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
let musicStarted = false;

function startBackgroundMusic() {
  if (musicStarted) return;
  musicStarted = true;
  audioLoader.load('./asset/spaceSound.mp3', buffer => {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
    sound.play();
  });
}
window.addEventListener('click', startBackgroundMusic, { once: true });
window.addEventListener('keydown', startBackgroundMusic, { once: true });

const audioControlButton = document.createElement('button');
audioControlButton.textContent = 'Mute Music';
audioControlButton.style.position = 'absolute';
audioControlButton.style.bottom = '20px';
audioControlButton.style.right = '20px';
audioControlButton.style.zIndex = '1000';
document.body.appendChild(audioControlButton);
audioControlButton.onclick = () => {
  if (sound.isPlaying) {
    sound.pause();
    audioControlButton.textContent = 'Play Music';
  } else {
    sound.play();
    audioControlButton.textContent = 'Mute Music';
  }
};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const popup = document.getElementById('popup');

function smoothZoomTo(pos) {
  const start = camera.position.clone();
  const target = pos.clone().add(new THREE.Vector3(10, 10, 10));
  const startTarget = controls.target.clone();
  const duration = 3000;
  const startTime = performance.now();
  function animateZoom() {
    const t = Math.min((performance.now() - startTime) / duration, 1);
    camera.position.lerpVectors(start, target, t);
    controls.target.lerpVectors(startTarget, pos, t);
    if (t < 1) requestAnimationFrame(animateZoom);
    else controls.target.copy(pos);
  }
  animateZoom();
}

window.addEventListener('click', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.far = 1000;
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const clicked = intersects[0];
    const object = clicked.object;
    const name = object.name?.toLowerCase() || '';
    const parentName = object.parent?.name?.toLowerCase() || '';
    const constellationId = object.userData?.constellationName?.toLowerCase();

    if (name === 'spacecraft') {
      spacecraftActive = true;
      popup.innerHTML = `🚀 <b>Spacecraft</b><br>You are now in control! Use W/A/S/D to move.`;
      popup.style.display = 'block';
      return;
    }

    if (planetInfo[name]) {
      popup.innerHTML = planetInfo[name];
      popup.style.display = 'block';
      return;
    }

    if (Constellations[name]) {
      popup.innerHTML = Constellations[name];
      popup.style.display = 'block';
      return;
    }

    if (Constellations[parentName]) {
      popup.innerHTML = Constellations[parentName] + `<br><br>${object.userData.info || ''}`;
      popup.style.display = 'block';
      return;
    }

    if (Constellations[constellationId]) {
      popup.innerHTML = Constellations[constellationId];
      popup.style.display = 'block';
      return;
    }
  }

  popup.style.display = 'none';
});

setupControls();

function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);
  updatePhysics(planets, sun);
  spiralGroup.rotation.y += 0.0012;
  ringGalaxies.forEach((r, i) => r.rotation.y += 0.0008 / (i + 1));

  const alphaAttr = starField.userData.alphaAttr;
  for (let i = 0; i < alphaAttr.count; i++) {
    alphaAttr.setX(i, 0.5 + 0.5 * Math.sin(Date.now() * 0.001 + i * 0.5));
  }
  alphaAttr.needsUpdate = true;

  if (spacecraftActive) updateSpacecraftMovement(spacecraft);
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.position.add(bullet.userData.velocity);
    if (bullet.position.length() > 300) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  }

  const earth = planets.find(p => p.name === 'earth');
  if (earth) {
    const angle = Math.atan2(earth.body.position.z, earth.body.position.x);
    if (lastAngle > 2.5 && angle < -2.5) {
      completedOrbits++;
    }
    lastAngle = angle;
    const simulatedYear = baseYear + completedOrbits;
    dateDisplay.textContent = `🕒 Year: ${simulatedYear}`;
  }

  controls.update();
  renderer.render(scene, camera);
}

scene.add(new THREE.AxesHelper(10));
animate();

const panel = document.getElementById('controlPanel');

// Sun Mass control FIRST
const sunGroup = document.createElement('div');
sunGroup.className = 'planet-group';

const sunTitle = document.createElement('h4');
sunTitle.textContent = "Sun";
sunTitle.style.marginBottom = '5px';
sunGroup.appendChild(sunTitle);

const sunMassLabel = document.createElement('label');
sunMassLabel.textContent = `Mass (${sun.mass.toFixed(0)})`;
sunGroup.appendChild(sunMassLabel);

const sunMassSlider = document.createElement('input');
sunMassSlider.type = 'range';
sunMassSlider.min = 10;
sunMassSlider.max = 3000;
sunMassSlider.step = 1;
sunMassSlider.value = sun.mass;
sunMassSlider.oninput = () => {
  sun.mass = parseFloat(sunMassSlider.value);
  sunMassLabel.textContent = `Mass (${sun.mass.toFixed(0)})`;
};
sunGroup.appendChild(sunMassSlider);
panel.appendChild(sunGroup);

// Then planets
planets.forEach(planet => {
  const group = document.createElement('div');
  group.className = 'planet-group';

  const title = document.createElement('h4');
  title.textContent = planet.name.charAt(0).toUpperCase() + planet.name.slice(1);
  title.style.marginBottom = '5px';
  group.appendChild(title);

  const massLabel = document.createElement('label');
  massLabel.textContent = `Mass (${planet.body.mass.toFixed(2)}× Earth)`;
  const massSlider = document.createElement('input');
  massSlider.type = 'range';
  massSlider.min = 0.01;
  massSlider.max = 500;
  massSlider.step = 0.01;
  massSlider.value = planet.body.mass;
  massSlider.oninput = () => {
    planet.body.mass = parseFloat(massSlider.value);
    massLabel.textContent = `Mass (${planet.body.mass.toFixed(2)}× Earth)`;
  };
  group.appendChild(massLabel);
  group.appendChild(massSlider);

  const orbitLabel = document.createElement('label');
  orbitLabel.textContent = `Orbit Radius (${planet.initialOrbit.toFixed(1)})`;
  const orbitSlider = document.createElement('input');
  orbitSlider.type = 'range';
  orbitSlider.min = 4;
  orbitSlider.max = 60;
  orbitSlider.step = 0.5;
  orbitSlider.value = planet.initialOrbit;
  orbitSlider.oninput = () => {
    const radius = parseFloat(orbitSlider.value);
    orbitLabel.textContent = `Orbit Radius (${radius})`;
    planet.initialOrbit = radius;
    const G = 1;
    const angle = Math.atan2(planet.body.position.z, planet.body.position.x);
    const speed = Math.sqrt((G * sun.mass) / radius);
    planet.body.position.set(radius * Math.cos(angle), 0, radius * Math.sin(angle));
    planet.body.velocity.set(-Math.sin(angle) * speed, 0, Math.cos(angle) * speed);
    planet.initialVelocity = { vx: speed, vz: speed };
  };
  group.appendChild(orbitLabel);
  group.appendChild(orbitSlider);

  panel.appendChild(group);
});

setupPlanetLanding(scene, camera, controls, planets, renderer);

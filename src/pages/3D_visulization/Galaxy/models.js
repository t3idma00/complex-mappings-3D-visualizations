import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

export function createRingGalaxy({ countPerRing, size, radii, thickness, colorStart, colorEnd }) {
  const ringGroup = [];
  const start = new THREE.Color(colorStart);
  const end = new THREE.Color(colorEnd);

  radii.forEach((baseRadius, ringIndex) => {
    const positions = new Float32Array(countPerRing * 3);
    const colors = new Float32Array(countPerRing * 3);
    let i3 = 0;
    for (let i = 0; i < countPerRing; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = baseRadius + (Math.random() - 0.5) * thickness;
      const x = Math.cos(angle) * radius;
      const y = (Math.random() - 0.5) * 0.5;
      const z = Math.sin(angle) * radius;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      const t = ringIndex / (radii.length - 1);
      const color = start.clone().lerp(end, t);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      i3 += 3;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size, sizeAttenuation: true, vertexColors: true,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    ringGroup.push(new THREE.Points(geometry, material));
  });
  return ringGroup;
}

export function createSpiralGalaxy({ starCount, radius, branches, spin, randomness, yThickness, innerColor, outerColor }) {
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const colorInside = new THREE.Color(innerColor);
  const colorOutside = new THREE.Color(outerColor);
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const r = Math.random() * radius;
    const branchAngle = (i % branches) / branches * Math.PI * 2;
    const spinAngle = r * spin;
    const randomX = (Math.random() - 0.5) * randomness * r;
    const randomY = (Math.random() - 0.5) * randomness * r * yThickness;
    const randomZ = (Math.random() - 0.5) * randomness * r;
    positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;
    const mixedColor = colorInside.clone().lerp(colorOutside, r / radius);
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.02, sizeAttenuation: true, vertexColors: true,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geometry, material);
}

export function createTwinklingStars(count = 3000, spread = 200) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * spread;
    positions[i3 + 1] = (Math.random() - 0.5) * spread;
    positions[i3 + 2] = (Math.random() - 0.5) * spread;
    alphas[i] = Math.random();
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const stars = new THREE.Points(geometry, material);
  stars.userData.alphaAttr = geometry.getAttribute('alpha');
  return stars;
}

export function createSolarSystem(scene) {
  const objects = {};
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.5));

  const sunTexture = textureLoader.load('./asset/2k_sun.jpg');
  const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), sunMaterial);
  sun.name = 'sun';
  scene.add(sun);

  const sunlight = new THREE.PointLight(0xffffff, 2, 500);
  sunlight.position.set(0, 0, 0);
  scene.add(sunlight);
  objects.sun = sun;

  const baseSpeed = 0.05;
  const planetData = [
    { name: 'mercury', texture: '2k_mercury.jpg', size: 0.6, orbit: 8 },
    { name: 'venus', texture: '2k_venus_surface.jpg', size: 1, orbit: 12 },
    { name: 'earth', texture: '2k_earth.jpg', size: 1.2, orbit: 16 },
    { name: 'mars', texture: '2k_mars.jpg', size: 1, orbit: 20 },
    { name: 'jupiter', texture: '2k_jupiter.jpg', size: 2.5, orbit: 26 },
    { name: 'saturn', texture: '2k_saturn.jpg', size: 2, orbit: 32 },
    { name: 'uranus', texture: '2k_uranus.jpg', size: 1.5, orbit: 38 },
    { name: 'neptune', texture: '2k_neptune.jpg', size: 1.5, orbit: 44 }
  ];

  for (const planet of planetData) {
    // Planet mesh
    const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
    const texture = textureLoader.load(`./asset/${planet.texture}`);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = planet.name;
    scene.add(mesh);

    const speed = baseSpeed / Math.pow(planet.orbit, 1.5);

    objects[planet.name] = mesh;
    objects[`${planet.name}Orbit`] = planet.orbit;
    objects[`${planet.name}Angle`] = Math.random() * Math.PI * 2;
    objects[`${planet.name}Speed`] = speed;

    // Orbit line
    const orbitPoints = [];
    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(
        Math.cos(theta) * planet.orbit,
        0,
        Math.sin(theta) * planet.orbit
      ));
    }
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
    const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
    scene.add(orbitLine);
  }

  return objects;
}


export function updateSolarSystem(objects) {
  const planetNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  for (const name of planetNames) {
    const angleKey = `${name}Angle`;
    const speedKey = `${name}Speed`;
    const orbitKey = `${name}Orbit`;
    objects[angleKey] += objects[speedKey];
    const r = objects[orbitKey];
    const mesh = objects[name];
    mesh.position.set(Math.cos(objects[angleKey]) * r, 0, Math.sin(objects[angleKey]) * r);
    mesh.rotation.y += 0.01;
  }
}

export function createSpacecraft() {
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 2, 16),
    new THREE.MeshStandardMaterial({ color: 0xcccccc })
  );

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x3333ff })
  );
  cockpit.position.set(0, 1, 0);

  const wingGeometry = new THREE.PlaneGeometry(1.5, 0.5);
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide });

  const wingLeft = new THREE.Mesh(wingGeometry, wingMaterial);
  wingLeft.rotation.set(0.3, 0, Math.PI / 2);
  wingLeft.position.set(-0.7, 0.3, -0.2);

  const wingRight = wingLeft.clone();
  wingRight.position.set(0.7, 0.3, -0.2);

  const spacecraft = new THREE.Group();
  spacecraft.name = 'spacecraft';
  spacecraft.add(body, cockpit, wingLeft, wingRight);

  [body, cockpit, wingLeft, wingRight].forEach(part => {
    part.userData.parentGroup = spacecraft;
  });

  spacecraft.rotation.x = Math.PI / 2;
  spacecraft.position.set(0, 5, -50);
  return spacecraft;
}

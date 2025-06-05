import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

// Ring Galaxy Generator
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
      size: size,
      sizeAttenuation: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const ring = new THREE.Points(geometry, material);
    ringGroup.push(ring);
  });

  return ringGroup;
}

// Spiral Galaxy Generator
export function createSpiralGalaxy({
  starCount,
  radius,
  branches,
  spin,
  randomness,
  yThickness,
  innerColor,
  outerColor
}) {
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
    size: 0.02,
    sizeAttenuation: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  return new THREE.Points(geometry, material);
}

// Solar System Generator with Textures
export function createSolarSystem(scene) {
  const objects = {};

  //  Dim Ambient Light 
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // moderate base light
scene.add(ambientLight);


const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.5); // soft directional feel
scene.add(hemiLight);

  // Sun with texture, self-lit
  const sunTexture = textureLoader.load('./asset/2k_sun.jpg');
  const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
  const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  scene.add(sun);

  //  PointLight from Sun to light planets
  const sunlight = new THREE.PointLight(0xffffff, 2, 500);
  sunlight.position.set(0, 0, 0);
  scene.add(sunlight);

  objects.sun = sun;

  //  Planets with reduced brightness via emissive
  const planetData = [
    { name: 'mercury', texture: '2k_mercury.jpg', size: 0.6, orbit: 8, speed: 0.004 },
    { name: 'venus',   texture: '2k_venus_surface.jpg', size: 1, orbit: 12, speed: 0.003 },
    { name: 'earth',   texture: '2k_earth.jpg', size: 1.2, orbit: 16, speed: 0.002 },
    { name: 'mars',    texture: '2k_mars.jpg', size: 1, orbit: 20, speed: 0.0016 },
    { name: 'jupiter', texture: '2k_jupiter.jpg', size: 2.5, orbit: 26, speed: 0.0012 },
    { name: 'saturn',  texture: '2k_saturn.jpg', size: 2, orbit: 32, speed: 0.001 },
    { name: 'uranus',  texture: '2k_uranus.jpg', size: 1.5, orbit: 38, speed: 0.0008 },
    { name: 'neptune', texture: '2k_neptune.jpg', size: 1.5, orbit: 44, speed: 0.0006 }
  ];

  for (const planet of planetData) {
    const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
    const texture = textureLoader.load(`./asset/${planet.texture}`);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      emissive: 0x000000,            
      emissiveIntensity: 0.1         // slight self-glow to help visibility
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = planet.name;
    scene.add(mesh);

    objects[planet.name] = mesh;
    objects[`${planet.name}Orbit`] = planet.orbit;
    objects[`${planet.name}Angle`] = Math.random() * Math.PI * 2;
    objects[`${planet.name}Speed`] = planet.speed;
  }

  return objects;
}



// Update planet positions

export function updateSolarSystem(objects) {
  const planetNames = [
    'mercury', 'venus', 'earth', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune'
  ];

  for (const name of planetNames) {
    const angleKey = `${name}Angle`;
    const speedKey = `${name}Speed`;
    const orbitKey = `${name}Orbit`;

    // Orbiting around the Sun
    objects[angleKey] += objects[speedKey];
    const r = objects[orbitKey];
    const mesh = objects[name];

    mesh.position.set(
      Math.cos(objects[angleKey]) * r,
      0,
      Math.sin(objects[angleKey]) * r
    );

    // 🌍 Add self-rotation (axis spin)
    mesh.rotation.y += 0.01; // speed per planet
  }
}


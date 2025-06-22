
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const textureLoader = new THREE.TextureLoader();

export function createPhysicsWorld() {
  const world = new CANNON.World();
  world.gravity.set(0, 0, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  return world;
}

export function createSolarSystemWithPhysics(scene, world) {
  const bodies = {};
  const meshes = {};

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.5));

  const sunTexture = textureLoader.load('./asset/2k_sun.jpg');
  const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), sunMaterial);
  sunMesh.name = 'sun';
  scene.add(sunMesh);

  const sunBody = new CANNON.Body({ mass: 1000 });
  sunBody.position.set(0, 0, 0);
  world.addBody(sunBody);

  bodies['sun'] = sunBody;
  meshes['sun'] = sunMesh;

  const sunlight = new THREE.PointLight(0xffffff, 2, 500);
  sunlight.position.set(0, 0, 0);
  scene.add(sunlight);

  const planetData = [
    { name: 'mercury', texture: '2k_mercury.jpg', size: 0.6, orbit: 8, mass: 0.055 },
    { name: 'venus', texture: '2k_venus_surface.jpg', size: 1, orbit: 12, mass: 0.815 },
    { name: 'earth', texture: '2k_earth.jpg', size: 1.2, orbit: 16, mass: 1 },
    { name: 'mars', texture: '2k_mars.jpg', size: 1, orbit: 20, mass: 0.107 },
    { name: 'jupiter', texture: '2k_jupiter.jpg', size: 2.5, orbit: 26, mass: 318 },
    { name: 'saturn', texture: '2k_saturn.jpg', size: 2, orbit: 32, mass: 95 },
    { name: 'uranus', texture: '2k_uranus.jpg', size: 1.5, orbit: 38, mass: 14 },
    { name: 'neptune', texture: '2k_neptune.jpg', size: 1.5, orbit: 44, mass: 17 }
  ];

  const G = 1;

  function setCircularOrbit(body, centerMass, radius) {
    const angle = 0;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    body.position.set(x, 0, z);

    const speed = Math.sqrt((G * centerMass) / radius);
    const vx = -Math.sin(angle) * speed;
    const vz = Math.cos(angle) * speed;
    body.velocity.set(vx, 0, vz);
    return { radius, vx, vz };
  }

  for (const planet of planetData) {
    const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
    const texture = textureLoader.load(`./asset/${planet.texture}`);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = planet.name;
    scene.add(mesh);

    const body = new CANNON.Body({ mass: planet.mass });
    const orbitInfo = setCircularOrbit(body, sunBody.mass, planet.orbit);
    world.addBody(body);

    planet.initialOrbit = orbitInfo.radius;
    planet.initialVelocity = { vx: orbitInfo.vx, vz: orbitInfo.vz };

    bodies[planet.name] = body;
    meshes[planet.name] = mesh;

    planet.body = body;
    planet.mesh = mesh;
    planet.userAdjusted = false;

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

  return {
    sun: sunBody,
    planets: planetData.map(p => ({
      name: p.name,
      body: bodies[p.name],
      mesh: meshes[p.name],
      initialOrbit: p.initialOrbit,
      initialVelocity: p.initialVelocity,
      userAdjusted: false
    }))
  };
}

export function updatePhysics(planets, sunBody) {
  const G = 1;
  for (const planet of planets) {
    const r = new CANNON.Vec3().copy(sunBody.position).vsub(planet.body.position);
    const distanceSq = r.lengthSquared();
    const force = r.scale((G * sunBody.mass * planet.body.mass) / (distanceSq * Math.sqrt(distanceSq)));
    planet.body.applyForce(force);
    planet.mesh.position.copy(planet.body.position);
    planet.mesh.rotation.y += 0.01;

   if (!planet.userAdjusted && sunBody.mass === 1000) {
  const currentRadius = planet.body.position.length();
  const originalRadius = planet.initialOrbit;
  if (Math.abs(currentRadius - originalRadius) > 0.4) {
    const angle = Math.atan2(planet.body.position.z, planet.body.position.x);
    const radius = planet.initialOrbit;
    const speed = Math.sqrt((G * sunBody.mass) / radius);
    planet.body.position.set(radius * Math.cos(angle), 0, radius * Math.sin(angle));
    planet.body.velocity.set(-Math.sin(angle) * speed, 0, Math.cos(angle) * speed);
  }
}
    }
  }


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
    size: 0.02,
    sizeAttenuation: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  return new THREE.Points(geometry, material);
}

export function createTwinklingStars(count = 1000, radius = 300) {
  const positions = new Float32Array(count * 3);
  const alpha = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.random() * radius;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);
    alpha[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.4,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.userData.alphaAttr = geometry.getAttribute('alpha');
  return points;
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
  spacecraft.rotation.x = Math.PI / 2;
  spacecraft.position.set(0, 5, -50);
  return spacecraft;
}

// === constellations.js ===
import * as THREE from 'three';

export function createConstellation(name, starsData, color = 0xffffff) {
  const group = new THREE.Group();
  group.name = name;

  const starMaterial = new THREE.MeshBasicMaterial({ color });
  const starGeometry = new THREE.SphereGeometry(0.2, 8, 8);

  const stars = starsData.map(data => {
    const [x, y, z] = data.position;
    const star = new THREE.Mesh(starGeometry, starMaterial.clone());
    star.position.set(x, y, z);
    star.name = data.name;
    group.add(star);
    return star;
  });

  for (let i = 0; i < starsData.length - 1; i++) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...starsData[i].position),
      new THREE.Vector3(...starsData[i + 1].position)
    ]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x8888ff })
    );
    group.add(line);
  }

  return group;
}

export function createAllConstellations() {
  const all = new THREE.Group();

  const orionStars = [
    { name: 'Betelgeuse', position: [100, 60, -200] },
    { name: 'Bellatrix', position: [103, 58, -203] },
    { name: 'Alnilam', position: [102, 55, -207] },
    { name: 'Mintaka', position: [105, 53, -210] },
    { name: 'Rigel', position: [110, 50, -215] }
  ];
  all.add(createConstellation('Orion', orionStars));

  const ursaMajorStars = [
    { name: 'Dubhe', position: [50, 60, -180] },
    { name: 'Merak', position: [52, 58, -182] },
    { name: 'Phecda', position: [54, 56, -184] },
    { name: 'Megrez', position: [56, 58, -186] },
    { name: 'Alioth', position: [58, 60, -188] },
    { name: 'Mizar', position: [60, 62, -190] },
    { name: 'Alkaid', position: [62, 64, -192] }
  ];
  all.add(createConstellation('Ursa Major', ursaMajorStars));

  const cassiopeiaStars = [
    { name: 'Schedar', position: [10, 70, -120] },
    { name: 'Caph', position: [12, 68, -122] },
    { name: 'Gamma Cas', position: [14, 66, -124] },
    { name: 'Ruchbah', position: [16, 68, -126] },
    { name: 'Segin', position: [18, 70, -128] }
  ];
  all.add(createConstellation('Cassiopeia', cassiopeiaStars));

  const lyraStars = [
    { name: 'Vega', position: [90, 70, -230] }
  ];
  all.add(createConstellation('Lyra', lyraStars));

  return all;
}

export function createConstellationSphere() {
  const container = new THREE.Group();

  const radius = 200;
  const tilt = Math.PI / 6;

  const baseConstellations = [
    {
      name: 'Orion',
      points: [[1, 0.5], [1.1, 0.48], [1.2, 0.45], [1.3, 0.43], [1.4, 0.4]]
    },
    {
      name: 'Ursa Major',
      points: [[0.5, 1], [0.55, 1.05], [0.6, 1.1], [0.65, 1.12], [0.7, 1.14]]
    },
    {
      name: 'Cassiopeia',
      points: [[-1, 0.5], [-0.95, 0.6], [-0.9, 0.55], [-0.85, 0.65], [-0.8, 0.6]]
    },
    {
      name: 'Lyra',
      points: [[-0.2, -1.2], [-0.25, -1.25], [-0.3, -1.3]]
    }
  ];

  for (let i = 0; i < baseConstellations.length; i++) {
    const { name, points } = baseConstellations[i];
    const thetaOffset = (i / baseConstellations.length) * Math.PI * 2;
    const stars = points.map(([x, y]) => {
      const theta = thetaOffset + x;
      const phi = tilt + y;
      const xpos = radius * Math.cos(phi) * Math.cos(theta);
      const ypos = radius * Math.sin(phi);
      const zpos = radius * Math.cos(phi) * Math.sin(theta);
      return { name: `${name}-star`, position: [xpos, ypos, zpos] };
    });
    const constellation = createConstellation(name, stars);
    container.add(constellation);
  }

  return container;
}

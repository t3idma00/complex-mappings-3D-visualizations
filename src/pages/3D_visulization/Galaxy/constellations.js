import * as THREE from 'three';
import { Constellations } from './planetinfo.js';

export function createConstellation(name, starsData, color = 0xffffff) {
  const group = new THREE.Group();
  group.name = name;

  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const geo = new THREE.SphereGeometry(0.3, 8, 8);

  starsData.forEach(data => {
    const [x, y, z] = data.position;
    const star = new THREE.Mesh(geo, mat.clone());
    star.position.set(x, y, z);
    star.name = data.name;
    star.userData.info = data.info || '';
    star.userData.constellation = name;
    group.add(star);
  });

 for (let i = 0; i < starsData.length - 1; i++) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...starsData[i].position),
    new THREE.Vector3(...starsData[i + 1].position)
  ]);
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.5 })
  );
  line.name = name.toLowerCase(); // 
  line.userData = {
    constellationName: name.toLowerCase()
  };
  group.add(line);
}


  return group;
}

const deg = Math.PI / 180;
const realConstellations = [
  {
    name: 'orion',
    stars: [
      { name: 'Betelgeuse', ra: 88.79, dec: 7.41, info: '🔴 Red supergiant star nearing supernova' },
      { name: 'Bellatrix', ra: 81.28, dec: 6.35, info: '💫 Hot blue giant' },
      { name: 'Alnilam', ra: 85.19, dec: -1.20, info: '🌌 Middle star in Orion’s Belt' },
      { name: 'Mintaka', ra: 83.00, dec: -0.29, info: '🌌 Right star in Orion’s Belt' },
      { name: 'Rigel', ra: 78.63, dec: -8.20, info: '🔷 Blue-white supergiant' }
    ]
  },
  {
    name: 'ursa major',
    stars: [
      { name: 'Dubhe', ra: 165.46, dec: 61.75, info: '⭐ Part of the Big Dipper' },
      { name: 'Merak', ra: 165.46, dec: 56.38, info: '⭐ Pointer star to Polaris' },
      { name: 'Phecda', ra: 178.46, dec: 53.69, info: '⭐ In the bowl of Big Dipper' },
      { name: 'Megrez', ra: 183.86, dec: 57.03, info: '⭐ Connects bowl to handle' },
      { name: 'Alioth', ra: 193.51, dec: 55.96, info: '⭐ Brightest in Ursa Major' },
      { name: 'Mizar', ra: 200.98, dec: 54.92, info: '👁️ Double star with Alcor' },
      { name: 'Alkaid', ra: 206.88, dec: 49.31, info: '🔚 Tip of Big Dipper’s handle' }
    ]
  },
  {
    name: 'ursa minor',
    stars: [
      { name: 'Polaris', ra: 37.95, dec: 89.26, info: '🧭 North Star – aligned with Earth’s axis' },
      { name: 'Kochab', ra: 222.68, dec: 74.16, info: '⭐ Second-brightest in Ursa Minor' },
      { name: 'Pherkad', ra: 230.54, dec: 71.83, info: '💫 Partner of Kochab' }
    ]
  },
  {
    name: 'cassiopeia',
    stars: [
      { name: 'Schedar', ra: 10.13, dec: 56.54, info: '💎 Brightest in Cassiopeia' },
      { name: 'Caph', ra: 2.29, dec: 59.15, info: '⭐ Westernmost star of W shape' },
      { name: 'Gamma Cas', ra: 14.18, dec: 60.72, info: '🌟 Blue-white giant' },
      { name: 'Ruchbah', ra: 21.45, dec: 60.23, info: '⭐ Corner of W shape' },
      { name: 'Segin', ra: 34.39, dec: 63.67, info: '⭐ Easternmost star' }
    ]
  },
  {
    name: 'cygnus',
    stars: [
      { name: 'Deneb', ra: 310.36, dec: 45.28, info: '🌟 One of the Summer Triangle stars' },
      { name: 'Sadr', ra: 305.56, dec: 40.26, info: '💫 Center of Cygnus cross' },
      { name: 'Gienah', ra: 292.68, dec: 33.97, info: '⭐ Wing tip of the swan' }
    ]
  },
  {
    name: 'lyra',
    stars: [
      { name: 'Vega', ra: 279.23, dec: 38.78, info: '🌟 Brightest in Lyra and 5th brightest in night sky' }
    ]
  },
  {
    name: 'draco',
    stars: [
      { name: 'Eltanin', ra: 271.32, dec: 51.49, info: '🐉 Brightest in Draco' },
      { name: 'Rastaban', ra: 262.63, dec: 52.30, info: '👁️ Dragon’s eye' },
      { name: 'Grumium', ra: 257.22, dec: 55.17, info: '💫 Curved tail star' }
    ]
  },
  {
    name: 'taurus',
    stars: [
      { name: 'Aldebaran', ra: 68.98, dec: 16.51, info: '🔥 Eye of the bull, orange giant' },
      { name: 'Elnath', ra: 81.57, dec: 28.61, info: '⭐ Horn tip of the bull' }
    ]
  },
  {
    name: 'scorpius',
    stars: [
      { name: 'Antares', ra: 247.35, dec: -26.43, info: '🔴 Red supergiant, “heart” of the scorpion' },
      { name: 'Shaula', ra: 263.40, dec: -37.10, info: '🔱 Tail of the scorpion' }
    ]
  },
  {
    name: 'leo',
    stars: [
      { name: 'Regulus', ra: 152.09, dec: 11.97, info: '🦁 Heart of the lion, brightest star' },
      { name: 'Denebola', ra: 177.27, dec: 14.57, info: '💫 Tail of the lion' }
    ]
  },
  {
    name: 'pegasus',
    stars: [
      { name: 'Markab', ra: 346.19, dec: 15.21, info: '🐎 One corner of Pegasus Square' },
      { name: 'Scheat', ra: 349.29, dec: 28.61, info: '⭐ Bright red giant' },
      { name: 'Algenib', ra: 14.18, dec: 15.18, info: '⭐ Eastern corner of the Square' }
    ]
  },
  {
    name: 'andromeda',
    stars: [
      { name: 'Alpheratz', ra: 2.10, dec: 29.09, info: '👑 Head of Andromeda, shared with Pegasus' },
      { name: 'Mirach', ra: 17.43, dec: 35.62, info: '⭐ Middle of Andromeda’s body' },
      { name: 'Almach', ra: 30.97, dec: 42.33, info: '⭐ Foot of Andromeda' }
    ]
  },
  {
    name: 'aquarius',
    stars: [
      { name: 'Sadalmelik', ra: 342.40, dec: -0.31, info: '💧 Brightest in Aquarius' },
      { name: 'Sadalsuud', ra: 22.87, dec: -5.39, info: '⭐ Lucky star of the lucky ones' }
    ]
  },
  {
    name: 'gemini',
    stars: [
      { name: 'Castor', ra: 113.65, dec: 31.89, info: '👬 One of the twin stars' },
      { name: 'Pollux', ra: 116.33, dec: 28.03, info: '👬 Other twin, orange giant' }
    ]
  },
  {
    name: 'canis major',
    stars: [
      { name: 'Sirius', ra: 101.29, dec: -16.72, info: '⭐ Brightest star in the night sky' },
      { name: 'Adhara', ra: 104.66, dec: -28.97, info: '💫 Second-brightest in Canis Major' }
    ]
  }
];


export function createConstellationSphere(radius = 350) {
  const group = new THREE.Group();
  for (const { name, stars } of realConstellations) {
    const starObjs = stars.map(s => {
      const raRad = s.ra * deg;
      const decRad = s.dec * deg;
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
  }
  return group;
}

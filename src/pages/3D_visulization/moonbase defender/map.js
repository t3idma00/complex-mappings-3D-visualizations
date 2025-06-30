// map.js
import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';

const crystalLoader = new GLTFLoader();
export const crystalData = []; // will hold {x, z, object, activated}

export function createMoonZones(scene, texturePath, rockColliders) {
  const loader = new THREE.TextureLoader();
  const moonTexture = loader.load(texturePath);
  moonTexture.wrapS = moonTexture.wrapT = THREE.RepeatWrapping;
  moonTexture.repeat.set(10, 10);

  const zoneData = [
    { name: "Landing Zone", x: 0, z: 0 },
    { name: "Crater Valley", x: 500, z: 0 },
    { name: "Ruined Base", x: 0, z: -500 },
    { name: "Power Hub", x: 500, z: -500 }
  ];

  zoneData.forEach(({ name, x, z }) => {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshBasicMaterial({ map: moonTexture })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(x, 0, z);
    scene.add(ground);

    const label = createZoneLabelMesh(name);
    label.position.set(x, 0.1, z);
    scene.add(label);

    if (name === "Crater Valley") addCraters(scene, x, z, rockColliders);
    if (name === "Ruined Base") addBrokenStructures(scene, x, z);
    if (["Landing Zone", "Crater Valley", "Ruined Base"].includes(name)) {
      addCrystal(scene, x + 50, z - 50);
    }
  });

  addZoneBridges(scene);
}

function createZoneLabelMesh(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.font = '28px sans-serif';
  ctx.fillText(text, 10, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
  const geo = new THREE.PlaneGeometry(20, 5);
  return new THREE.Mesh(geo, mat);
}

function addCraters(scene, baseX, baseZ, rockColliders) {
  for (let i = 0; i < 5; i++) {
    const x = baseX + (Math.random() - 0.5) * 400;
    const z = baseZ + (Math.random() - 0.5) * 400;
    const crater = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 15, 2, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    crater.rotation.x = Math.PI / 2;
    crater.position.set(x, 0.1, z);
    scene.add(crater);
    rockColliders.push({ position: crater.position.clone(), radius: 12 });
  }
}

function addBrokenStructures(scene, baseX, baseZ) {
  for (let i = 0; i < 3; i++) {
    const x = baseX + (Math.random() - 0.5) * 300;
    const z = baseZ + (Math.random() - 0.5) * 300;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    building.position.set(x, 5, z);
    scene.add(building);
  }
}

function addCrystal(scene, x, z) {
  crystalLoader.load('./assets/models/crystal.glb', gltf => {
    const crystal = gltf.scene;
    crystal.scale.set(5, 5, 5);
    crystal.position.set(x, 0, z);
    scene.add(crystal);
    crystalData.push({ x, z, object: crystal, activated: false });
  });
}

function addZoneBridges(scene) {
  const bridge1 = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 500),
    new THREE.MeshStandardMaterial({ color: 0x777777 })
  );
  bridge1.position.set(250, 0.5, 0);
  scene.add(bridge1);

  const bridge2 = new THREE.Mesh(
    new THREE.BoxGeometry(500, 1, 40),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
  );
  bridge2.position.set(0, 0.5, -250);
  scene.add(bridge2);

  const bridge3 = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 500),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  bridge3.position.set(500, 0.5, -250);
  scene.add(bridge3);
}



export function addStarDome(scene, camera) {
  const radius = 5000;
  
  // Create starfield
  const starsGeometry = new THREE.BufferGeometry();
  const twinklingStarsGeometry = new THREE.BufferGeometry();
  
  const starPositions = [];
  const twinklingStarPositions = [];
  const starColors = [];
  const twinklingStarColors = [];
  const twinklingAlphas = []; // Separate array for alpha values
  const color = new THREE.Color();

  // Generate random stars (10000 normal, 500 twinkling)
  for (let i = 0; i < 10500; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    // Slightly brighter and larger for twinkling stars
    const isTwinkling = true; 
    const lightness = isTwinkling ? 0.95 : 0.9 + Math.random() * 0.1;
    const hue = Math.random() * 0.1;
    const saturation = Math.random() * 0.2;
    color.setHSL(hue, saturation, lightness);
    
    if (isTwinkling) {
      twinklingStarPositions.push(x, y, z);
      twinklingStarColors.push(color.r, color.g, color.b);
      twinklingAlphas.push(1); // Initial alpha
    } else {
      starPositions.push(x, y, z);
      starColors.push(color.r, color.g, color.b);
    }
  }

  // Regular stars
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

  const starMaterial = new THREE.PointsMaterial({
    size: 1.2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    fog: false
  });

  const stars = new THREE.Points(starsGeometry, starMaterial);
  stars.renderOrder = -1000;
  scene.add(stars);

  // Twinkling stars
  twinklingStarsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(twinklingStarPositions, 3));
  twinklingStarsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(twinklingStarColors, 3));
  
  // Create a separate attribute for alphas
  const alphaAttribute = new THREE.Float32BufferAttribute(twinklingAlphas, 1);
  twinklingStarsGeometry.setAttribute('alpha', alphaAttribute);

  const twinklingStarMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 }
  },
  vertexShader: `
    attribute float alpha;
    varying float vAlpha;
    void main() {
      vAlpha = alpha;
      gl_PointSize = 2.0;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float twinkle = 0.5 + 0.5 * sin(vAlpha * 10.0);
      gl_FragColor = vec4(vec3(1.0), twinkle);
    }
  `,
  transparent: true,
  depthWrite: false
});

  const twinklingStars = new THREE.Points(twinklingStarsGeometry, twinklingStarMaterial);
  twinklingStars.renderOrder = -999;
  scene.add(twinklingStars);

  // Animation data for twinkling
  const twinklingData = [];
  for (let i = 0; i < twinklingStarPositions.length / 3; i++) {
    twinklingData.push({
      speed: 0.5 + Math.random() * 2, // Random twinkle speed
      offset: Math.random() * Math.PI * 2, // Random phase offset
      baseSize: 1.5 + Math.random() * 1.0 // Random base size
    });
  }

  // Return object with update function
  return {
    position: stars.position,
    copy: stars.position.copy.bind(stars.position),
    update: (time) => {
      // Animate twinkling stars
      const alphaAttrib = twinklingStarsGeometry.getAttribute('alpha');
      const sizeArray = new Array(twinklingStarPositions.length / 3).fill(0);
      
      for (let i = 0; i < twinklingData.length; i++) {
        const t = time * twinklingData[i].speed + twinklingData[i].offset;
        const opacity = 0.5 + 0.5 * Math.sin(t); // Oscillates between 0 and 1
        
        // Update alpha
        alphaAttrib.setX(i, opacity);
        
        // Update size
        sizeArray[i] = twinklingData[i].baseSize * (0.8 + 0.4 * Math.sin(t * 1.3));
      }
      
      alphaAttrib.needsUpdate = true;
      twinklingStarMaterial.size = sizeArray.reduce((a, b) => a + b, 0) / sizeArray.length;
    }
  };
}
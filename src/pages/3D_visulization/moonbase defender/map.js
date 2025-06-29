import * as THREE from 'three';

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
    if (name === "Power Hub") addEnergyNode(scene, x, z);
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
      new THREE.MeshStandardMaterial({ color: 0x222222, wireframe: false })
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

function addEnergyNode(scene, x, z) {
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffff, emissiveIntensity: 1 })
  );
  core.position.set(x + 100, 5, z - 100);
  scene.add(core);
}

function addZoneBridges(scene) {
  const bridge1 = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 500),
    new THREE.MeshStandardMaterial({ color: 0x777777 })
  );
  bridge1.position.set(250, 0.5, 0); // Between Landing and Crater Valley
  scene.add(bridge1);

  const bridge2 = new THREE.Mesh(
    new THREE.BoxGeometry(500, 1, 40),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
  );
  bridge2.position.set(0, 0.5, -250); // Between Landing and Ruined Base
  scene.add(bridge2);

  const bridge3 = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 500),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  bridge3.position.set(500, 0.5, -250); // Between Crater Valley and Power Hub
  scene.add(bridge3);
}

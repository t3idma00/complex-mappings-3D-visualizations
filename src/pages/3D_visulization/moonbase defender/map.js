import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function createMoonZones(scene, texturePath, rockColliders) {
  const moonTexture = new THREE.TextureLoader().load(texturePath);
  moonTexture.wrapS = moonTexture.wrapT = THREE.RepeatWrapping;
  moonTexture.repeat.set(10, 10);

  const zoneData = [
    { name: "Landing Zone", x: 0, z: 0 },
    { name: "Crater Valley", x: 500, z: 0 },
    { name: "Ruined Base", x: 0, z: -500 },
    { name: "Power Hub", x: 500, z: -500 },
  ];

  const rockPositions = [
    { x: 10, y: 0, z: -15 },
    { x: -20, y: 0, z: 5 },
    { x: 30, y: 0, z: 20 },
    { x: -35, y: 0, z: -25 },
  ];

  zoneData.forEach(({ name, x, z }) => {
    // Ground plane for zone
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshBasicMaterial({ map: moonTexture })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(x, 0, z);
    scene.add(ground);

    // Label
    const label = createZoneLabelMesh(name);
    label.position.set(x, 0.1, z);
    label.lookAt(0, 100, 0); // upright face
    scene.add(label);

    // Load and place rocks for this zone
    const loader = new GLTFLoader();
    loader.load('./assets/models/rock.glb', (gltf) => {
      rockPositions.forEach(offset => {
        const rock = gltf.scene.clone(true);
        rock.position.set(x + offset.x, 0.25, z + offset.z);
        rock.scale.setScalar(0.5);
        rock.rotation.y = Math.random() * Math.PI * 2;
        scene.add(rock);

        // Add red collider cylinder
        const cylinder = new THREE.Mesh(
          new THREE.CylinderGeometry(7, 7, 8, 5),
          new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        cylinder.position.set(x + offset.x, 2.5, z + offset.z);
        scene.add(cylinder);

        // Push collider data for movement logic
        rockColliders.push({
          position: cylinder.position.clone(),
          radius: 7
        });
      });
    });
  });
}

// Zone label (floating text)
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

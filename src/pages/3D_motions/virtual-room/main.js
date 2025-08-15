import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';
import { Box3 } from 'https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js';

// --- Scene & Camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 10, 10);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 10, 5);
scene.add(dirLight);

// --- Texture Loader ---
const textureLoader = new THREE.TextureLoader();

// --- Floor ---
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// Floor Textures
const floorTextures = {
    Wood: textureLoader.load('./assets/textures/wood.jpg'),
    Marble: textureLoader.load('./assets/textures/marble.jpg'),
    Tiles: textureLoader.load('./assets/textures/tiles.jpg')
};
for (const key in floorTextures) {
    const tex = floorTextures[key];
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.encoding = THREE.sRGBEncoding;
}

// --- Walls ---
const wallGeometry = new THREE.BoxGeometry(10, 5, 10);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.BackSide });
const walls = new THREE.Mesh(wallGeometry, wallMaterial);
walls.position.y = 2.5;
scene.add(walls);

// Wall Textures
const wallTextures = {
    Wallpaper1: textureLoader.load('./assets/textures/wallpaper1.jpg'),
    Wallpaper2: textureLoader.load('./assets/textures/wallpaper2.jpg'),
    Brick: textureLoader.load('./assets/textures/brick.jpg')
};
for (const key in wallTextures) {
    const tex = wallTextures[key];
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.encoding = THREE.sRGBEncoding;
}

// --- GUI ---
const gui = new GUI();
const params = {
    wallColor: "#ffffff",
    wallType: 'Color',
    floorType: 'Wood'
};

gui.addColor(params, 'wallColor').name('Wall Color').onChange(value => {
    if (params.wallType === 'Color') walls.material.color.set(value);
});

gui.add(params, 'wallType', ['Color', ...Object.keys(wallTextures)]).name('Wall Type').onChange(value => {
    if (value === 'Color') {
        walls.material.map = null;
        walls.material.color.set(params.wallColor);
    } else {
        walls.material.map = wallTextures[value];
        walls.material.needsUpdate = true;
    }
});

gui.add(params, 'floorType', Object.keys(floorTextures)).name('Floor Type').onChange(value => {
    floor.material.map = floorTextures[value];
    floor.material.needsUpdate = true;
});

// --- Furniture Loader ---
const loader = new GLTFLoader();
const furnitureItems = [];
const furnitureData = [
    { name: 'Chair', file: './assets/models/chair.glb', targetHeight: 0.5, color: 0xff0000 },
    { name: 'Table', file: './assets/models/table.glb', targetHeight: 0.7, color: 0x00ff00 },
    { name: 'Sofa', file: './assets/models/sofa.glb', targetHeight: 0.8, color: 0x0000ff }
];

function normalizeModelScale(model, targetHeight) {
    const box = new Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const currentHeight = size.y;
    if (currentHeight === 0) return;
    const scale = targetHeight / currentHeight;
    model.scale.multiplyScalar(scale);
}

function addFurniture(type) {
    const data = furnitureData.find(f => f.name === type);
    if (!data) return;

    loader.load(data.file, gltf => {
        const furniture = gltf.scene;
        normalizeModelScale(furniture, data.targetHeight);
        furniture.position.set(0, 0, 0);
        furniture.userData = { type: data.name };
        scene.add(furniture);
        furnitureItems.push(furniture);

        const fParams = { color: data.color };
        gui.addColor(fParams, 'color').name(`${data.name} Color`).onChange(value => {
            furniture.traverse(child => {
                if (child.isMesh) child.material.color.set(value);
            });
        });
    });
}

furnitureData.forEach(f => gui.add({ [f.name]: () => addFurniture(f.name) }, f.name));

// --- Drag & Move Furniture ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;
const gridSize = 0.5;
function snapToGrid(value) { return Math.round(value / gridSize) * gridSize; }

function onMouseDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(furnitureItems, true);
    if (intersects.length > 0) {
        selectedObject = intersects[0].object;
        while (!furnitureItems.includes(selectedObject)) selectedObject = selectedObject.parent;
    }
}

function onMouseMove(event) {
    if (!selectedObject) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);

    intersect.x = snapToGrid(intersect.x);
    intersect.z = snapToGrid(intersect.z);
    selectedObject.position.set(intersect.x, 0, intersect.z);
}

function onMouseUp() { selectedObject = null; }

window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);

// --- Rotate & Scale Furniture ---
window.addEventListener('keydown', e => {
    if (!selectedObject) return;
    if (e.key === 'q') selectedObject.rotation.y += Math.PI / 16;
    if (e.key === 'e') selectedObject.rotation.y -= Math.PI / 16;
    if (e.key === 'w') selectedObject.scale.multiplyScalar(1.05);
    if (e.key === 's') selectedObject.scale.multiplyScalar(0.95);
});

// --- Animate ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

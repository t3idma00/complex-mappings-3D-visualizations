// CONFIGURATION
const CONFIG = {
    RANGE: Math.PI,
    STEP: 0.25,
    BG_COLOR: 0xffffff,
    GRID_COLOR_X: 0x3498db,
    GRID_COLOR_Y: 0xe74c3c,
    AXIS_COLOR: 0x2c3e50,
    AXIS_WIDTH: 2,
    MINOR_GRID_OPACITY: 0.6,
    TRANSFORMED_GRID_OPACITY: 0.8,
    POINT_SIZE: 8,
    GRID_DENSITY: 10,
    IMAGE_OPACITY: 0.8,
    IMAGE_GRID_SIZE: 50,
    HANDLE_SIZE: 0.15,
    HANDLE_COLOR: 0xff0000,
    INITIAL_IMAGE_SCALE: 0.5,
    MIN_SCALE: 0.1,
    MAX_SCALE: 2.0,
    BOUNDARY_PADDING: 0.9
};

// Global variables
let scenes = {};
let dragging = false;
let draggedObject = null; 
let draggedHandleIndex = -1;
let dragOffset = { x: 0, y: 0 };
let loadedImage = null;
let imageTexture = null;
let imageMesh = null;
let imageHandles = [];
let imageCorners = [
    { x: -1, y: -1 }, 
    { x: 1, y: -1 },  
    { x: 1, y: 1 },   
    { x: -1, y: 1 }   
];
let imagePosition = { x: 0, y: 0 };
let imageScale = { x: CONFIG.INITIAL_IMAGE_SCALE, y: CONFIG.INITIAL_IMAGE_SCALE };

// Utility Functions
function createScene(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Canvas container with ID '${containerId}' not found!`);
        return null;
    }
    const scene = new THREE.Scene();
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const aspect = width / height;

    const camera = new THREE.OrthographicCamera(
        aspect > 1 ? -CONFIG.RANGE * aspect : -CONFIG.RANGE,
        aspect > 1 ? CONFIG.RANGE * aspect : CONFIG.RANGE,
        aspect > 1 ? CONFIG.RANGE : CONFIG.RANGE / aspect,
        aspect > 1 ? -CONFIG.RANGE : -CONFIG.RANGE / aspect,
        1,
        1000
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(CONFIG.BG_COLOR);
    container.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        const aspect = width / height;

        camera.left = aspect > 1 ? -CONFIG.RANGE * aspect : -CONFIG.RANGE;
        camera.right = aspect > 1 ? CONFIG.RANGE * aspect : CONFIG.RANGE;
        camera.top = aspect > 1 ? CONFIG.RANGE : CONFIG.RANGE / aspect;
        camera.bottom = aspect > 1 ? -CONFIG.RANGE : -CONFIG.RANGE / aspect;

        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    return { scene, camera, renderer, container };
}

function addBaseGrid(scene) {
    if (!scene) return;

    for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += CONFIG.STEP) {
        if (Math.abs(y) < 0.01) continue;
        addLine(scene, [-CONFIG.RANGE, y, 0, CONFIG.RANGE, y, 0], CONFIG.GRID_COLOR_Y, 1, CONFIG.MINOR_GRID_OPACITY);
    }

    for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += CONFIG.STEP) {
        if (Math.abs(x) < 0.01) continue;
        addLine(scene, [x, -CONFIG.RANGE, 0, x, CONFIG.RANGE, 0], CONFIG.GRID_COLOR_X, 1, CONFIG.MINOR_GRID_OPACITY);
    }

    addLine(scene, [-CONFIG.RANGE, 0, 0, CONFIG.RANGE, 0, 0], CONFIG.AXIS_COLOR, CONFIG.AXIS_WIDTH, 1);
    addLine(scene, [0, -CONFIG.RANGE, 0, 0, CONFIG.RANGE, 0], CONFIG.AXIS_COLOR, CONFIG.AXIS_WIDTH, 1);

    for (let i = -CONFIG.RANGE; i <= CONFIG.RANGE; i += CONFIG.STEP) {
        if (i !== 0) {
            const tickLength = 0.1;
            addLine(scene, [i, -tickLength / 2, 0, i, tickLength / 2, 0], CONFIG.AXIS_COLOR, 1.5, 1);
const xLabel = createTextLabel(i.toFixed(2), i, -tickLength * 1.5);
            scene.add(xLabel);
            addLine(scene, [-tickLength / 2, i, 0, tickLength / 2, i, 0], CONFIG.AXIS_COLOR, 1.5, 1);
const yLabel = createTextLabel(i.toFixed(2), tickLength * 1.5, i);
            scene.add(yLabel);
        }
    }
}

function addLine(scene, coords, color, width = 1, opacity = 0.7) {
    if (!scene) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(coords), 3));
    const material = new THREE.LineBasicMaterial({
        color,
        linewidth: width,
        transparent: true,
        opacity: opacity
    });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
}

function createImageHandles(scene) {
   
    imageHandles.forEach(handle => scene.remove(handle));
    imageHandles = [];

    const handleGeometry = new THREE.SphereGeometry(CONFIG.HANDLE_SIZE * 1.5, 16, 16); 
    const handleMaterial = new THREE.MeshBasicMaterial({ 
        color: CONFIG.HANDLE_COLOR,
        depthTest: false 
    });

    // Create handles at each corner
    for (let i = 0; i < 4; i++) {
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(
            imagePosition.x + imageCorners[i].x * imageScale.x,
            imagePosition.y + imageCorners[i].y * imageScale.y,
            0.1
        );
        handle.userData.isHandle = true;
        handle.userData.handleIndex = i;
        handle.renderOrder = 2; 
        scene.add(handle);
        imageHandles.push(handle);
    }
}

function updateImageTransformation(scene, transformFunction, canvasId) {
    if (!scene || !loadedImage) return;

    if (imageMesh) scene.remove(imageMesh);
    if (canvasId === 'input-canvas') createImageHandles(scene);

    // Create geometry with a grid for distortion
    const geometry = new THREE.PlaneGeometry(2, 2, CONFIG.IMAGE_GRID_SIZE, CONFIG.IMAGE_GRID_SIZE);
    const material = new THREE.MeshBasicMaterial({
        map: imageTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: CONFIG.IMAGE_OPACITY,
        depthTest: true,
    });

    imageMesh = new THREE.Mesh(geometry, material);
    imageMesh.name = 'image';
    imageMesh.userData.isImage = true;
    imageMesh.renderOrder = 1;

    if (canvasId === 'input-canvas') {
        // On input canvas: scale and position only
        imageMesh.scale.set(imageScale.x, imageScale.y, 1);
        imageMesh.position.set(imagePosition.x, imagePosition.y, 0);
    } else {
        // On output canvas: apply complex transform
        const posAttr = geometry.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < posAttr.count; i++) {
            vertex.fromBufferAttribute(posAttr, i);

            const sx = (vertex.x + 1) / 2;
            const sy = (vertex.y + 1) / 2;

            const A = imageHandles[0]?.position || new THREE.Vector3(-1, -1, 0);
            const B = imageHandles[1]?.position || new THREE.Vector3(1, -1, 0);
            const C = imageHandles[2]?.position || new THREE.Vector3(1, 1, 0);
            const D = imageHandles[3]?.position || new THREE.Vector3(-1, 1, 0);

            // Bilinear interpolation to get pixel location
            const px = A.x * (1 - sx) * (1 - sy) +
                       B.x * sx * (1 - sy) +
                       C.x * sx * sy +
                       D.x * (1 - sx) * sy;

            const py = A.y * (1 - sx) * (1 - sy) +
                       B.y * sx * (1 - sy) +
                       C.y * sx * sy +
                       D.y * (1 - sx) * sy;

            const { x: tx, y: ty } = transformFunction(px, py);

            posAttr.setXYZ(i, isNaN(tx) ? 0 : tx, isNaN(ty) ? 0 : ty, 0);
        }

        posAttr.needsUpdate = true;
    }

    scene.add(imageMesh);
    return imageMesh;
}


function createTextLabel(text, x, y) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 9;
    context.font = `${fontSize}px Arial`;
    const textWidth = context.measureText(text).width;
    canvas.width = textWidth * 2;
    canvas.height = fontSize * 2;

    context.font = `${fontSize}px Arial`;
    context.fillStyle = '#0e141a';
    context.scale(2, 2);
    context.fillText(text, 0, fontSize);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, 0);
    sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);
    return sprite;
}

function initVisualization(canvasId, transformFunction) {
    const { scene, camera, renderer, container } = createScene(canvasId);
    if (!scene || !renderer || !camera) {
        console.error(`Failed to create scene or renderer for canvas ID '${canvasId}'.`);
        return;
    }

    scenes[canvasId] = { scene, camera, renderer, container, transformFunction };
    addBaseGrid(scene);

    if (loadedImage) {
        updateImageTransformation(scene, transformFunction, canvasId);
    }

    if (canvasId === 'input-canvas') {
        enableDragging(container, scene, camera);
    }

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}

function enableDragging(container, scene, camera) {
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let worldIntersectPoint = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    function getMousePosition(event) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onPointerDown(event) {
    getMousePosition(event);
    raycaster.setFromCamera(mouse, camera);

    // Handle dragging start for handles
    const handleIntersects = raycaster.intersectObjects(imageHandles, true);
    if (handleIntersects.length > 0) {
        dragging = true;
        draggedObject = 'handle';
        draggedHandleIndex = handleIntersects[0].object.userData.handleIndex;

        dragOffset.x = handleIntersects[0].object.position.x - handleIntersects[0].point.x;
        dragOffset.y = handleIntersects[0].object.position.y - handleIntersects[0].point.y;
        return;
    }

    // Handle dragging start for image
    const intersects = raycaster.intersectObject(imageMesh, true);
    if (intersects.length > 0) {
        dragging = true;
        draggedObject = 'image';

        dragOffset.x = imageMesh.position.x - intersects[0].point.x;
        dragOffset.y = imageMesh.position.y - intersects[0].point.y;
    }
}


    function onPointerMove(event) {
    if (!dragging) return;

    getMousePosition(event);
    raycaster.setFromCamera(mouse, camera);

    if (!raycaster.ray.intersectPlane(plane, worldIntersectPoint)) return;

    const maxPos = CONFIG.RANGE;
    const minPos = -maxPos;

    if (draggedObject === 'handle') {
        let newHandleX = worldIntersectPoint.x + dragOffset.x;
        let newHandleY = worldIntersectPoint.y + dragOffset.y;

        newHandleX = Math.max(minPos, Math.min(maxPos, newHandleX));
        newHandleY = Math.max(minPos, Math.min(maxPos, newHandleY));

        const oppositeIndex = (draggedHandleIndex + 2) % 4;
        const oppositeHandle = imageHandles[oppositeIndex];

        if (oppositeHandle) {
            const oppositeX = oppositeHandle.position.x;
            const oppositeY = oppositeHandle.position.y;

            const newScaleX = Math.max(CONFIG.MIN_SCALE, Math.abs(newHandleX - oppositeX) / 2);
            const newScaleY = Math.max(CONFIG.MIN_SCALE, Math.abs(newHandleY - oppositeY) / 2);

            imageScale.x = newScaleX;
            imageScale.y = newScaleY;
            imagePosition.x = (newHandleX + oppositeX) / 2;
            imagePosition.y = (newHandleY + oppositeY) / 2;

            updateAllImages();
        }
    } else if (draggedObject === 'image') {
        imagePosition.x = Math.max(minPos, Math.min(maxPos, worldIntersectPoint.x + dragOffset.x));
        imagePosition.y = Math.max(minPos, Math.min(maxPos, worldIntersectPoint.y + dragOffset.y));
        updateAllImages();
    }
}


    function onPointerUp() {
        dragging = false;
        draggedObject = null;
        draggedHandleIndex = -1;
    }

    container.style.touchAction = 'none'; 
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerUp);
}

function updateAllImages() {
    for (const canvasId in scenes) {
        const { scene, transformFunction } = scenes[canvasId];

        if (scene.getObjectByName('image')) scene.remove(scene.getObjectByName('image'));
        imageHandles.forEach(handle => scene.remove(handle));

        if (loadedImage) {
            updateImageTransformation(scene, transformFunction, canvasId);
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initVisualization('input-canvas', (x, y) => ({ x, y }));
    initVisualization('z2-canvas', (x, y) => ({ x: x * x - y * y, y: 2 * x * y }));
    initVisualization('inverse-canvas', (x, y) => {
        const denom = x * x + y * y;
        return denom < 0.0001 ? { x: NaN, y: NaN } : { x: x / denom, y: -y / denom };
    });
    initVisualization('z3-canvas', (x, y) => ({ x: x ** 3 - 3 * x * y * y, y: 3 * x * x * y - y ** 3 }));
    initVisualization('sinz-canvas', (x, y) => ({ x: Math.sin(x) * Math.cosh(y), y: Math.cos(x) * Math.sinh(y) }));
    initVisualization('cosz-canvas', (x, y) => ({ x: Math.cos(x) * Math.cosh(y), y: -Math.sin(x) * Math.sinh(y) }));
    initVisualization('tanz-canvas', (x, y) => {
        const denom = Math.cos(2 * x) + Math.cosh(2 * y);
        return Math.abs(denom) < 0.0001 ? { x: NaN, y: NaN } : { x: Math.sin(2 * x) / denom, y: Math.sinh(2 * y) / denom };
    });
    initVisualization('logz-canvas', (x, y) => ({ x: 0.5 * Math.log10(x * x + y * y), y: Math.atan2(y, x) }));
    initVisualization('lnz-canvas', (x, y) => ({ x: 0.5 * Math.log(x * x + y * y), y: Math.atan2(y, x) }));
    initVisualization('expz-canvas', (x, y) => {
        const expX = Math.exp(x);
        return { x: expX * Math.cos(y), y: expX * Math.sin(y) };
    });

    // Handle image upload
    document.getElementById('image-upload').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            loadedImage = new Image();
            loadedImage.onload = function () {
                imageTexture = new THREE.Texture(loadedImage);
                imageTexture.needsUpdate = true;

                const aspect = loadedImage.width / loadedImage.height;
                imagePosition = { x: 0, y: 0 };
                imageScale = {
                    x: CONFIG.INITIAL_IMAGE_SCALE * (aspect > 1 ? 1 : aspect),
                    y: CONFIG.INITIAL_IMAGE_SCALE * (aspect > 1 ? 1/aspect : 1)
                };

                updateAllImages();
            };
            loadedImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
});
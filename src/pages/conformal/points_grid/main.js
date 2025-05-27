// CONFIGURATION
const CONFIG = {
    RANGE: 3,
    STEP: 0.25,
    BG_COLOR: 0xffffff,
    GRID_COLOR_X: 0x3498db,
    GRID_COLOR_Y: 0xe74c3c,
    AXIS_COLOR: 0x2c3e50,
    AXIS_WIDTH: 2,
    MINOR_GRID_OPACITY: 0.6,
    TRANSFORMED_GRID_OPACITY: 0.8,
    POINT_SIZE: 8,
    GRID_DENSITY: 10
};

// Global variables to store scene data and drag state
let scenes = {};
let pointsData = {};
let dragging = false;
let draggedPointIndex = -1;
let dragOffset = { x: 0, y: 0 };

// COMPLEX FUNCTION TRANSFORMATIONS

function identityTransform(x, y) {
    return { x: x, y: y };
}

function squareTransform(x, y) {
    return { x: x * x - y * y, y: 2 * x * y };
}

function inverseTransform(x, y) {
    const denom = x * x + y * y;
    return denom < 0.0001 ? { x: NaN, y: NaN } : { x: x / denom, y: -y / denom };
}

function cubeTransform(x, y) {
    return { x: x ** 3 - 3 * x * y * y, y: 3 * x * x * y - y ** 3 };
}

function sinTransform(x, y) {
    return { x: Math.sin(x) * Math.cosh(y), y: Math.cos(x) * Math.sinh(y) };
}

function cosTransform(x, y) {
    return { x: Math.cos(x) * Math.cosh(y), y: -Math.sin(x) * Math.sinh(y) };
}

function tanTransform(x, y) {
    const denom = Math.cos(2 * x) + Math.cosh(2 * y);
    if (Math.abs(denom) < 0.0001) {
        return { x: NaN, y: NaN };
    }
    return { x: Math.sin(2 * x) / denom, y: Math.sinh(2 * y) / denom };
}

function logTransform(x, y) {
    return { x: 0.5 * Math.log(x * x + y * y), y: Math.atan2(y, x) };
}

function lnTransform(x, y) {
    return logTransform(x, y);
}

function expTransform(x, y) {
    const expX = Math.exp(x);
    return { x: expX * Math.cos(y), y: expX * Math.sin(y) };
}

// UTILITY FUNCTIONS

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
            const xLabel = createTextLabel(i.toString(), i, -tickLength * 1.5);
            scene.add(xLabel);
            addLine(scene, [-tickLength / 2, i, 0, tickLength / 2, i, 0], CONFIG.AXIS_COLOR, 1.5, 1);
            const yLabel = createTextLabel(i.toString(), tickLength * 1.5, i);
            scene.add(yLabel);
        }
    }
}

function addTransformedGrid(scene, transform, containerId) {
    if (!scene) return;

    const pointsGeometry = new THREE.BufferGeometry();
    const pointsMaterial = new THREE.PointsMaterial({
        size: CONFIG.POINT_SIZE,
        vertexColors: true
    });

    const positions = [];
    const colors = [];
    let initialPoints;

    if (containerId === 'input-canvas') {
        if (!pointsData['input-canvas']) {
            pointsData['input-canvas'] = [];
            let startX = 1;
            let startY = 1;
            const pointSpacing = 0.25;
            for (let i = 0; i < CONFIG.GRID_DENSITY; i++) {
                for (let j = 0; j < CONFIG.GRID_DENSITY; j++) {
                    const x = startX + i * pointSpacing;
                    const y = startY + j * pointSpacing;
                    pointsData['input-canvas'].push({ x: x, y: y, originalX: x, originalY: y });
                }
            }
        }
        initialPoints = pointsData['input-canvas'];
    } else {
        if (!pointsData['input-canvas']) {
            pointsData['input-canvas'] = [];
            let startX = 1;
            let startY = 1;
            const pointSpacing = 0.25;
            for (let i = 0; i < CONFIG.GRID_DENSITY; i++) {
                for (let j = 0; j < CONFIG.GRID_DENSITY; j++) {
                    const x = startX + i * pointSpacing;
                    const y = startY + j * pointSpacing;
                    pointsData['input-canvas'].push({ x: x, y: y, originalX: x, originalY: y });
                }
            }
        }
        initialPoints = pointsData['input-canvas'];
    }


    for (let i = 0; i < CONFIG.GRID_DENSITY * CONFIG.GRID_DENSITY; i++) {
        const originalPoint = initialPoints[i];
        const transformedPoint = transform(originalPoint.x, originalPoint.y);

        if (!isNaN(transformedPoint.x) && !isNaN(transformedPoint.y) && isFinite(transformedPoint.x) && isFinite(transformedPoint.y)) {
            positions.push(transformedPoint.x, transformedPoint.y, 0);
            const color = new THREE.Color();
            color.setHSL((originalPoint.x + CONFIG.RANGE) / (2 * CONFIG.RANGE), 1, (originalPoint.y + CONFIG.RANGE) / (2 * CONFIG.RANGE));
            colors.push(color.r, color.g, color.b);
        }
    }

    pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    points.name = 'points';
    scene.add(points);
    return points;
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
    scene.add(new THREE.Line(geometry, material));
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
    let points = addTransformedGrid(scene, transformFunction, canvasId);
    scenes[canvasId].points = points;

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

    container.addEventListener('mousedown', (event) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([scene.getObjectByName('points')]);

        if (intersects.length > 0) {
            dragging = true;
            draggedPointIndex = intersects[0].index;
            const point = intersects[0].point;
             dragOffset.x = point.x - pointsData['input-canvas'][draggedPointIndex].x;
             dragOffset.y = point.y - pointsData['input-canvas'][draggedPointIndex].y;
        }
    });

    container.addEventListener('mousemove', (event) => {
        if (dragging && draggedPointIndex !== -1) {
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const hitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(hitPlane, intersectPoint);

            if (intersectPoint) {
                const newX = intersectPoint.x - dragOffset.x;
                const newY = intersectPoint.y - dragOffset.y;

                // Update all points, keeping their relative positions
                const firstPointX = pointsData['input-canvas'][0].originalX;
                const firstPointY = pointsData['input-canvas'][0].originalY;

                const deltaX = newX - firstPointX;
                const deltaY = newY - firstPointY;

                for (let i = 0; i < pointsData['input-canvas'].length; i++) {
                    pointsData['input-canvas'][i].x = pointsData['input-canvas'][i].originalX + deltaX;
                    pointsData['input-canvas'][i].y = pointsData['input-canvas'][i].originalY + deltaY;
                }
                updateAllPoints();
            }
        }
    });

    container.addEventListener('mouseup', () => {
        dragging = false;
        draggedPointIndex = -1;
    });

    container.addEventListener('mouseleave', () => {
        dragging = false;
        draggedPointIndex = -1;
    });
}

function updateAllPoints() {
    for (const canvasId in scenes) {
        if (canvasId !== 'input-canvas') {
            const { scene, points, transformFunction } = scenes[canvasId];
            scene.remove(points);
            const newPoints = addTransformedGrid(scene, transformFunction, canvasId);
            scenes[canvasId].points = newPoints;
        } else {
            const { scene, points } = scenes[canvasId];
            scene.remove(points);
            const newPoints = addTransformedGrid(scene, identityTransform, canvasId);
            scenes[canvasId].points = newPoints;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initVisualization('input-canvas', identityTransform);
    initVisualization('z2-canvas', squareTransform);
    initVisualization('inverse-canvas', inverseTransform);
    initVisualization('z3-canvas', cubeTransform);
    initVisualization('sinz-canvas', sinTransform);
    initVisualization('cosz-canvas', cosTransform);
    initVisualization('tanz-canvas', tanTransform);
    initVisualization('logz-canvas', logTransform);
    initVisualization('lnz-canvas', lnTransform);
    initVisualization('expz-canvas', expTransform);
});

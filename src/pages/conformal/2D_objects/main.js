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
    INITIAL_SHAPE_SCALE: 0.4 
};

// Global variables
let scenes = {};
let initialShape = null;
let initialShapeVertices = [];
let dragging = false;
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

function createShapeGeometryFromVertices(vertices) {
    if (!vertices || vertices.length < 3) return null;
    const shape = new THREE.Shape();
    shape.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        shape.lineTo(vertices[i].x, vertices[i].y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
}

function getShapeVerticesFromGeometry(geometry) {
    if (!geometry || !geometry.attributes.position) return [];
    const position = geometry.attributes.position;
    const vertices = [];
    for (let i = 0; i < position.count; i++) {
        vertices.push({ x: position.getX(i), y: position.getY(i) });
    }
    return vertices;
}

function createMeshFromGeometry(geometry, color) {
    if (!geometry) return null;
    const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    return new THREE.Mesh(geometry, material);
}

function addTransformedShape(scene, transform, vertices) {
    if (!scene || !vertices || vertices.length === 0) return null;

    const transformedVertices = vertices.map(v => transform(v.x, v.y));
    const validTransformedVertices = transformedVertices.filter(v => !isNaN(v.x) && !isNaN(v.y) && isFinite(v.x) && isFinite(v.y));

    if (validTransformedVertices.length < 3) {
        return null;
    }

    const geometry = createShapeGeometryFromVertices(validTransformedVertices);
    if (!geometry) return null;
    const material = new THREE.MeshBasicMaterial({ color: 0xffa500, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return mesh;
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

    scenes[canvasId] = { scene, camera, renderer, container, transformFunction, transformedShape: null };
    addBaseGrid(scene);

    if (canvasId === 'input-canvas') {
        setupShapeSelector(container, scene, camera);
    }

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }

    animate();
}

// MODIFIED: Simplified getVerticesForShape
function getVerticesForShape(shapeName, scale) {
    switch (shapeName) {
        case 'square':
            return [{ x: -scale, y: scale }, { x: scale, y: scale }, { x: scale, y: -scale }, { x: -scale, y: -scale }];
        case 'circle':
            const circlePoints = [];
            for (let i = 0; i < 64; i++) {
                const angle = 2 * Math.PI * i / 64;
                circlePoints.push({ x: scale * Math.cos(angle), y: scale * Math.sin(angle) });
            }
            return circlePoints;
        case 'triangle': 
            return [{ x: 0, y: scale }, { x: -scale * Math.sqrt(3) / 2, y: -scale / 2 }, { x: scale * Math.sqrt(3) / 2, y: -scale / 2 }];
        case 'rectangle':
            return [{ x: -scale * 1.5, y: scale }, { x: scale * 1.5, y: scale }, { x: scale * 1.5, y: -scale }, { x: -scale * 1.5, y: -scale }];
        case 'ellipse': 
            const ellipsePoints = [];
            for (let i = 0; i < 64; i++) {
                const angle = 2 * Math.PI * i / 64;
                ellipsePoints.push({ x: scale * 1.5 * Math.cos(angle), y: scale * Math.sin(angle) });
            }
            return ellipsePoints;
        case 'line segment': 
            return [{ x: -scale, y: 0 }, { x: scale, y: 0 }];
        case 'point': 
            return [{ x: 0, y: 0 }];
        case 'cross':
              return [
                {x: -scale/3, y: scale},
                {x: scale/3, y: scale},
                {x: scale/3, y: scale/3},
                {x: scale, y: scale/3},
                {x: scale, y: -scale/3},
                {x: scale/3, y: -scale/3},
                {x: scale/3, y: -scale},
                {x: -scale/3, y: -scale},
                {x: -scale/3, y: -scale/3},
                {x: -scale, y: -scale/3},
                {x: -scale, y: scale/3},
                {x: -scale/3, y: scale}
              ];
        case 'arrow':
            return [
                { x: 0, y: scale },
                { x: scale * 0.5, y: scale },
                { x: scale * 0.5, y: scale * 0.5 },
                { x: scale, y: 0.5 * scale},
                { x: scale * 0.5, y: -scale * 0.5 },
                { x: scale * 0.5, y: -scale },
                { x: 0, y: -scale },
                {x: 0, y: -scale * 0.5},
                {x: -scale * 0.5, y: -scale * 0.5},
                {x: -scale * 0.5, y: scale * 0.5},
                {x: 0, y: scale}
            ];
        case 'star (5-pointed)':
            const star5Points = [];
            for (let i = 0; i < 5; i++) {
                const outerRadius = scale;
                const innerRadius = scale * 0.4;
                const angle = (Math.PI / 5) + (2 * Math.PI / 5) * i;
                const xOuter = outerRadius * Math.cos(angle);
                const yOuter = outerRadius * Math.sin(angle);
                const xInner = innerRadius * Math.cos(angle + Math.PI / 5);
                const yInner = innerRadius * Math.sin(angle + Math.PI / 5);
                star5Points.push({ x: xOuter, y: yOuter });
                star5Points.push({ x: xInner, y: yInner });
            }
            return star5Points;
        default:
            console.error(`Unknown shape: ${shapeName}`);
            return [{ x: -scale, y: scale }, { x: scale, y: scale }, { x: scale, y: -scale }, { x: -scale, y: -scale }]; 
    }
}

function setupShapeSelector(container, scene, camera) {
    const select = document.createElement('select');
    // list of shapes
    const shapes = [
      'square', 'circle', 'triangle', 'rectangle', 'ellipse',
<<<<<<< HEAD
      'line segment', 'point', 'cross', 'arrow', 'star (5-pointed)'
=======
       'star (5-pointed)'
>>>>>>> 34e94ce0bc2dd846f30ae03a1910aa63659961d2
    ];

    shapes.forEach(shapeName => {
        const option = document.createElement('option');
        option.value = shapeName;
        option.textContent = shapeName.charAt(0).toUpperCase() + shapeName.slice(1);
        select.appendChild(option);
    });

    select.style.position = 'absolute';
    select.style.top = '10px';
    select.style.left = '10px';
    container.appendChild(select);

    select.addEventListener('change', (event) => {
        const selectedShape = event.target.value;
        if (initialShape) {
            scene.remove(initialShape);
            initialShape = null;
            initialShapeVertices = [];
        }

        const vertices = getVerticesForShape(selectedShape, CONFIG.INITIAL_SHAPE_SCALE);
        const geometry = createShapeGeometryFromVertices(vertices);
        if (geometry) {
            initialShape = createMeshFromGeometry(geometry, 0x00ff00);
            scene.add(initialShape);
            initialShapeVertices = vertices;
            enableShapeDragging(container, scene, camera, initialShape);
            updateTransformedShapes();
        }
    });

    // Initialize with the first shape
    const initialShapeName = shapes[0];
    const vertices = getVerticesForShape(initialShapeName, CONFIG.INITIAL_SHAPE_SCALE);
    const geometry = createShapeGeometryFromVertices(vertices);
    if (geometry) {
        initialShape = createMeshFromGeometry(geometry, 0x00ff00);
        scene.add(initialShape);
        initialShapeVertices = vertices;
        enableShapeDragging(container, scene, camera, initialShape);
        updateTransformedShapes();
    }
}

function enableShapeDragging(container, scene, camera, shape) {
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let isDraggingShape = false;

    container.addEventListener('mousedown', (event) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(shape);

        if (intersects.length > 0) {
            isDraggingShape = true;
            const point = intersects[0].point;
            dragOffset.x = point.x - shape.position.x;
            dragOffset.y = point.y - shape.position.y;
        }
    });

    container.addEventListener('mousemove', (event) => {
        if (isDraggingShape) {
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const hitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(hitPlane, intersectPoint);

            if (intersectPoint) {
                shape.position.set(intersectPoint.x - dragOffset.x, intersectPoint.y - dragOffset.y, 0);
                initialShapeVertices = getShapeVerticesFromGeometry(shape.geometry);
                updateTransformedShapes();
            }
        }
    });

    container.addEventListener('mouseup', () => {
        isDraggingShape = false;
    });

    container.addEventListener('mouseleave', () => {
        isDraggingShape = false;
    });
}

function updateTransformedShapes() {
    for (const canvasId in scenes) {
        if (canvasId !== 'input-canvas') {
            const { scene, transformFunction, transformedShape } = scenes[canvasId];
            if (transformedShape) {
                scene.remove(transformedShape);
            }
            const transformedVertices = initialShapeVertices.map(v => ({
                x: initialShape.position.x + v.x,
                y: initialShape.position.y + v.y
            }));
            const newTransformedShape = addTransformedShape(scene, transformFunction, transformedVertices);
            scenes[canvasId].transformedShape = newTransformedShape;
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
<<<<<<< HEAD
    initVisualization('lnz-canvas', lnTransform);
=======
>>>>>>> 34e94ce0bc2dd846f30ae03a1910aa63659961d2
    initVisualization('expz-canvas', expTransform);
});
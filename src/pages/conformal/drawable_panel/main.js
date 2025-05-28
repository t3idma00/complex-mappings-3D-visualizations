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
let initialShape = null; // Represents the currently displayed shape on input-canvas
let initialShapeVertices = []; // Not used directly for multi-shape history, but for single shape manipulation
let dragging = false;
let dragOffset = { x: 0, y: 0 };
let draggedShapeIndex = -1; // New: Index of the shape being dragged in drawingHistory

// Freehand Drawing variables
let isDrawing = false;
let currentDrawingPoints = [];
let freehandLine = null; // To visualize the drawing process

// New: History of drawn shapes, each element is an array of vertices
let drawingHistory = [];

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
    // For freehand drawing, we can simply create a Line loop or LineSegments.
    // If you want a filled shape, it's more complex as it needs to be convex
    // or triangulated. For now, we'll draw it as a line.
    if (!vertices || vertices.length < 2) {
        if (vertices.length === 1) { // Handle single points as well
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute([vertices[0].x, vertices[0].y, 0], 3));
            return geometry;
        }
        return null;
    }

    const points = [];
    for (let i = 0; i < vertices.length; i++) {
        points.push(new THREE.Vector3(vertices[i].x, vertices[i].y, 0));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
}

function createMeshFromGeometry(geometry, color) {
    if (!geometry) return null;
    const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
    return new THREE.Line(geometry, material); // Use Line for freehand
}

function addTransformedShape(scene, transform, vertices) {
    if (!scene || !vertices || vertices.length === 0) return null;

    const transformedVertices = vertices.map(v => transform(v.x, v.y));
    const validTransformedVertices = transformedVertices.filter(v => !isNaN(v.x) && !isNaN(v.y) && isFinite(v.x) && isFinite(v.y));

    if (validTransformedVertices.length < 2 && validTransformedVertices.length !== 1) { // Need at least 2 points for a line, or 1 for a point
        return null;
    }

    const geometry = createShapeGeometryFromVertices(validTransformedVertices);
    if (!geometry) return null;
    const material = new THREE.LineBasicMaterial({ color: 0xffa500, linewidth: 2 });
    const mesh = new THREE.Line(geometry, material); // Always draw as a line
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

    scenes[canvasId] = { scene, camera, renderer, container, transformFunction, transformedShapes: [] }; // transformedShapes now an array
    addBaseGrid(scene);

    if (canvasId === 'input-canvas') {
        setupFreehandDrawing(container, scene, camera);
        setupUndoButton(); // New: setup the undo button
    }

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }

    animate();
}

function setupFreehandDrawing(container, scene, camera) {
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();

    container.addEventListener('mousedown', (event) => {
        if (container.id === 'input-canvas') {
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children.filter(obj => obj instanceof THREE.Line));

            if (intersects.length > 0) {
                // Check if the intersected object is one of our drawn shapes
                const clickedObject = intersects[0].object;
                const index = scenes['input-canvas'].transformedShapes.indexOf(clickedObject);
                if (index !== -1) {
                    dragging = true;
                    draggedShapeIndex = index;
                    const intersectPoint = intersects[0].point;
                    const shapeVertices = drawingHistory[draggedShapeIndex];
                    const firstVertex = shapeVertices[0];
                    dragOffset.x = intersectPoint.x - firstVertex.x;
                    dragOffset.y = intersectPoint.y - firstVertex.y;
                    return; // Stop here, we are dragging
                }
            }

            // If not dragging an existing shape, start drawing
            isDrawing = true;
            currentDrawingPoints = [];
            if (freehandLine) {
                scene.remove(freehandLine);
                freehandLine = null;
            }

            const hitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(hitPlane, intersectPoint);

            if (intersectPoint) {
                currentDrawingPoints.push({ x: intersectPoint.x, y: intersectPoint.y });
            }
        }
    });

    container.addEventListener('mousemove', (event) => {
        if (container.id === 'input-canvas') {
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const hitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(hitPlane, intersectPoint);

            if (dragging && draggedShapeIndex !== -1 && intersectPoint) {
                const newX = intersectPoint.x - dragOffset.x;
                const newY = intersectPoint.y - dragOffset.y;

                const currentShapeVertices = drawingHistory[draggedShapeIndex];
                const deltaX = newX - currentShapeVertices[0].x;
                const deltaY = newY - currentShapeVertices[0].y;

                drawingHistory[draggedShapeIndex] = currentShapeVertices.map(v => ({
                    x: v.x + deltaX,
                    y: v.y + deltaY
                }));
                updateAllScenes();
            } else if (isDrawing && intersectPoint) {
                currentDrawingPoints.push({ x: intersectPoint.x, y: intersectPoint.y });

                // Update the visual drawing line
                if (freehandLine) {
                    scene.remove(freehandLine);
                }
                const points = currentDrawingPoints.map(p => new THREE.Vector3(p.x, p.y, 0));
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
                freehandLine = new THREE.Line(geometry, material);
                scene.add(freehandLine);
            }
        }
    });

    container.addEventListener('mouseup', () => {
        if (container.id === 'input-canvas') {
            if (isDrawing) {
                isDrawing = false;
                if (freehandLine) {
                    scene.remove(freehandLine);
                    freehandLine = null;
                }
                if (currentDrawingPoints.length > 1) {
                    drawingHistory.push(currentDrawingPoints);
                } else if (currentDrawingPoints.length === 1) {
                    drawingHistory.push(currentDrawingPoints);
                }
                updateAllScenes();
            } else if (dragging) {
                dragging = false;
                draggedShapeIndex = -1;
            }
        }
    });

    container.addEventListener('mouseleave', () => {
        if (container.id === 'input-canvas') {
            if (isDrawing) {
                isDrawing = false;
                if (freehandLine) {
                    scene.remove(freehandLine);
                    freehandLine = null;
                }
                if (currentDrawingPoints.length > 1) {
                    drawingHistory.push(currentDrawingPoints);
                } else if (currentDrawingPoints.length === 1) {
                    drawingHistory.push(currentDrawingPoints);
                }
                updateAllScenes();
            } else if (dragging) {
                dragging = false;
                draggedShapeIndex = -1;
            }
        }
    });
}

function setupUndoButton() {
    const undoButton = document.getElementById('undo-button');
    if (undoButton) {
        undoButton.addEventListener('click', () => {
            if (drawingHistory.length > 0) {
                drawingHistory.pop(); // Remove the last drawn shape
                updateAllScenes(); // Re-render all scenes
            }
        });
    }
}

function updateAllScenes() {
    // Clear all existing shapes from all scenes
    for (const canvasId in scenes) {
        const { scene, transformedShapes } = scenes[canvasId];
        transformedShapes.forEach(shape => scene.remove(shape));
        scenes[canvasId].transformedShapes = []; // Clear the array
    }

    // Redraw all shapes from history in all scenes
    drawingHistory.forEach(shapeVertices => {
        for (const canvasId in scenes) {
            const { scene, transformFunction } = scenes[canvasId];
            let addedShape = null;

            if (canvasId === 'input-canvas') {
                // For the input canvas, just draw the shape as is
                const geometry = createShapeGeometryFromVertices(shapeVertices);
                if (geometry) {
                    addedShape = createMeshFromGeometry(geometry, 0x00ff00);
                    scene.add(addedShape);
                }
            } else {
                // For transformed canvases, apply the transformation
                const transformedVertices = shapeVertices.map(v => transformFunction(v.x, v.y));
                const validTransformedVertices = transformedVertices.filter(v => !isNaN(v.x) && !isNaN(v.y) && isFinite(v.x) && isFinite(v.y));

                if (validTransformedVertices.length >= 2 || (validTransformedVertices.length === 1 && shapeVertices.length === 1)) { // Handle single points
                    const geometry = createShapeGeometryFromVertices(validTransformedVertices);
                    if (geometry) {
                        addedShape = createMeshFromGeometry(geometry, 0xffa500);
                        scene.add(addedShape);
                    }
                }
            }
            if (addedShape) {
                scenes[canvasId].transformedShapes.push(addedShape);
            }
        }
    });
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
    initVisualization('expz-canvas', expTransform);
});
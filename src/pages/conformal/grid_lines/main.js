// CONFIGURATION
const CONFIG = {
    RANGE: 3,
    STEP: 0.5,
    BG_COLOR: 0xffffff,
    GRID_COLOR_X: 0x3498db,
    GRID_COLOR_Y: 0xe74c3c,
    AXIS_COLOR: 0x2c3e50,
    AXIS_WIDTH: 2, 
    MINOR_GRID_OPACITY: 0.6,
    TRANSFORMED_GRID_OPACITY: 0.8
  };
  
  // COMPLEX FUNCTION TRANSFORMATIONS
  
  // Identity transform
  function identityTransform(x, y) {
    return { x: x, y: y };
  }
  
  // Square transform
  function squareTransform(x, y) {
    return { x: x * x - y * y, y: 2 * x * y };
  }
  
  // Inverse transform
  function inverseTransform(x, y) {
    const denom = x * x + y * y;
    return denom < 0.0001 ? { x: NaN, y: NaN } : { x: x / denom, y: -y / denom };
  }
  
  // Cube transform
  function cubeTransform(x, y) {
    return { x: x ** 3 - 3 * x * y * y, y: 3 * x * x * y - y ** 3 };
  }
  
  // Sine transform: sin(z) = sin(x)cosh(y) + i·cos(x)sinh(y)
  function sinTransform(x, y) {
    return { x: Math.sin(x) * Math.cosh(y), y: Math.cos(x) * Math.sinh(y) };
  }
  
  // Cosine transform: cos(z) = cos(x)cosh(y) - i·sin(x)sinh(y)
  function cosTransform(x, y) {
    return { x: Math.cos(x) * Math.cosh(y), y: -Math.sin(x) * Math.sinh(y) };
  }
  
  // Tangent transform: tan(z) = sin(2x)/(cos(2x)+cosh(2y)) + i·sinh(2y)/(cos(2x)+cosh(2y))
  function tanTransform(x, y) {
    const denom = Math.cos(2 * x) + Math.cosh(2 * y);
    if (Math.abs(denom) < 0.0001) {
        return { x: NaN, y: NaN }; 
    }
    return { x: Math.sin(2 * x) / denom, y: Math.sinh(2 * y) / denom };
  }
  
  // Logarithm transform: log(z) = ln|z| + i·Arg(z) = 0.5*ln(x²+y²) + i·atan2(y, x)
  function logTransform(x, y) {
    return { x: 0.5 * Math.log(x * x + y * y), y: Math.atan2(y, x) };
  }
  
  
  function lnTransform(x, y) {
    return logTransform(x, y); 
  }
  
  // Exponential transform: e^z = e^x(cos(y) + i·sin(y))
  function expTransform(x, y) {
    const expX = Math.exp(x);
    return { x: expX * Math.cos(y), y: expX * Math.sin(y) };
  }
  // UTILITY FUNCTIONS
  
  // Create a visualization scene with Three.js
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
  
    // Handle window resizing
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
  
    return { scene, camera, renderer };
  }
  
  // Add base grid and axes
  function addBaseGrid(scene) {
    if (!scene) return; 
  
    // Add minor grid lines
    for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += CONFIG.STEP) {
        if (Math.abs(y) < 0.01) continue; 
        addLine(scene, [-CONFIG.RANGE, y, 0, CONFIG.RANGE, y, 0], CONFIG.GRID_COLOR_Y, 1, CONFIG.MINOR_GRID_OPACITY);
    }
  
    for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += CONFIG.STEP) {
        if (Math.abs(x) < 0.01) continue; 
        addLine(scene, [x, -CONFIG.RANGE, 0, x, CONFIG.RANGE, 0], CONFIG.GRID_COLOR_X, 1, CONFIG.MINOR_GRID_OPACITY);
    }
  
    // Add main axes with stronger appearance
    addLine(scene, [-CONFIG.RANGE, 0, 0, CONFIG.RANGE, 0, 0], CONFIG.AXIS_COLOR, CONFIG.AXIS_WIDTH, 1); // X-axis
    addLine(scene, [0, -CONFIG.RANGE, 0, 0, CONFIG.RANGE, 0], CONFIG.AXIS_COLOR, CONFIG.AXIS_WIDTH, 1); // Y-axis
  
    // Add tick marks and labels on axes
    for (let i = -CONFIG.RANGE; i <= CONFIG.RANGE; i += CONFIG.STEP) {
        if (i !== 0) {
            const tickLength = 0.1;
  
            // Tick marks on x-axis
            addLine(scene, [i, -tickLength / 2, 0, i, tickLength / 2, 0], CONFIG.AXIS_COLOR, 1.5, 1);
  
            // Text label for x-axis
            const xLabel = createTextLabel(i.toString(), i, -tickLength * 1.5);
            scene.add(xLabel);
  
            // Tick marks on y-axis
            addLine(scene, [-tickLength / 2, i, 0, tickLength / 2, i, 0], CONFIG.AXIS_COLOR, 1.5, 1);
  
            // Text label for y-axis
            const yLabel = createTextLabel(i.toString(), tickLength * 1.5, i);
            scene.add(yLabel);
        }
    }
  }
  
  // Add transformed grid based on a given function
  function addTransformedGrid(scene, transform) {
    if (!scene) return; // Check if the scene is valid
  
    // Constant Im(z) lines (horizontal in input)
    for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += CONFIG.STEP) {
        const points = [];
        for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += 0.05) {
            const t = transform(x, y);
            if (!isNaN(t.x) && !isNaN(t.y) && isFinite(t.x) && isFinite(t.y)) {
                points.push(new THREE.Vector3(t.x, t.y, 0));
            }
        }
        if (points.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            scene.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({
                color: CONFIG.GRID_COLOR_Y,
                transparent: true,
                opacity: CONFIG.TRANSFORMED_GRID_OPACITY,
                linewidth: 2 
            })));
        }
    }
  
    // Constant Re(z) lines (vertical in input)
    for (let x = -CONFIG.RANGE; x <= CONFIG.RANGE; x += CONFIG.STEP) {
        const points = [];
        for (let y = -CONFIG.RANGE; y <= CONFIG.RANGE; y += 0.05) {
            const t = transform(x, y);
            if (!isNaN(t.x) && !isNaN(t.y) && isFinite(t.x) && isFinite(t.y)) {
                points.push(new THREE.Vector3(t.x, t.y, 0));
            }
        }
        if (points.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            scene.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({
                color: CONFIG.GRID_COLOR_X,
                transparent: true,
                opacity: CONFIG.TRANSFORMED_GRID_OPACITY,
                linewidth: 2 
            })));
        }
    }
  }
  
  // Helper function to add a line to the scene
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
  
  // Function to create a simple text label using Canvas and Texture
  function createTextLabel(text, x, y) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 9; // Increased font size for sharper text
    context.font = `${fontSize}px Arial`;
    const textWidth = context.measureText(text).width;
    canvas.width = textWidth * 2;   
    canvas.height = fontSize * 2;  
  
    // Re-measure and draw with updated canvas size and higher resolution
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
  
  // Initialize a visualization with a given transformation function
  function initVisualization(canvasId, transformFunction) {
    const { scene, camera, renderer } = createScene(canvasId);
  
    if (!scene || !renderer || !camera) {
        console.error(`Failed to create scene or renderer for canvas ID '${canvasId}'.`);
        return;
    }
  
    // Add base grid and transformed grid
    addBaseGrid(scene);
    addTransformedGrid(scene, transformFunction);
  
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
  
    animate();
  }
  
  // INITIALIZATION
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
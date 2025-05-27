const stats = {
    distance: "0 m",
    time: "0 s",
    firstHit: false
};

//Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.001);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

//Configuration
const config = {
    ballRadius: 0.1,
    groundSize: 400,
    gridSize: 30,
    gridDivisions: 30,
    ballSegment: 32,
    shadowQuality: 2048,
};

//Initialize renderer
function initRenderer() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    document.body.appendChild(renderer.domElement);
}

//Create lights
function createLights() {
    const ambientLight = new THREE.AmbientLight(0x404040,0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = config.shadowQuality;
    directionalLight.shadow.mapSize.height = config.shadowQuality;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);
}

//Create ball
function createBall(){
    const geometry = new THREE.SphereGeometry(
        config.ballRadius,
        config.ballSegment,
        config.ballSegment
    );
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        roughness: 0.1,
        metalness: 0.3,
        emissive: 0x000000,
        emissiveIntensity: 0.1,
    });
    const ball = new THREE.Mesh(geometry, material);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball);
    return ball;
}

//Create ground
function createGround() {
    const geometry = new THREE.PlaneGeometry(config.groundSize, config.groundSize);
    const material = new THREE.MeshStandardMaterial({
        color: 0x2E8B57,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = Math.PI/2;
    ground.position.y = -config.ballRadius;
    ground.receiveShadow = true;
    scene.add(ground);
    return ground;
}

//Create helpers
function createHelpers() {
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
}

//Create trajectory
function createTrajectory() {
    const material = new THREE.LineBasicMaterial({ 
        color: 0xff9900,
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
    });
    const geometry = new THREE.BufferGeometry();
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    return line;
}

//Physics system
class PhysicsEngine {
    constructor(ball,statsPanel) {
        this.ball = ball;
        this.statsPanel = statsPanel;
        this.reset();
        this.gravity = -9.81; // m/s^2
        this.bounceFactor = 0.7;
        this.dragCoefficient = 0.47;  // Air resistance coefficient
        this.airDensity = 1.225; // kg/m^3 (for Air)
        this.crossSectionArea = Math.PI * config.ballRadius**2; // projected area of the ball
        this.groundLevel = config.ballRadius;
        this.pathPoints = [];
        this.isSimulating = false;
        this.ballMass = 1; // kg - added mass property
        this.bounceFactor = 0.65; // Energy retained after bounce
        this.rollingResistance = 0.05;  // Resistance when rolling
        this.minVelocityThreshold =0.005;
        this.minBounceHeight = 0.005; // Minimum height to consider a bounce
        this.rollingFriction = 0.98; // Friction when rolling on ground
        this.firstHitTime = 0;
        this.firstHitDistance = 0;
        this.hasFirstHit = false;  
        this.timeElapsed = 0;
        this.isRolling = false;

    }

    reset() {
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
        this.ballPositionX = 0;
        this.ballPositionY = this.groundLevel;
        this.ballPositionZ = 0;
        this.pathPoints = [];
        this.isSimulating = false;
        this.timeElapsed = 0;
        this.firstHitTime = 0;
        this.firstHitDistance = 0;
        this.hasFirstHit = false;
        stats.distance = "0 m";
        stats.time = "0 s";
        this.updateBallPosition();
    }

    launch(angle, speed) {
        const radians = angle * Math.PI / 180;
        this.velocityX = speed * Math.cos(radians);
        this.velocityY = speed * Math.sin(radians);
        this.velocityZ = 0;
        this.ballPositionX = 0;
        this.ballPositionY = this.groundLevel;
        this.ballPositionZ = 0;
        this.pathPoints = [];
        this.isSimulating = true;
        this.pathPoints.push(new THREE.Vector3(this.ballPositionX, this.ballPositionY, this.ballPositionZ));
        this.hasFirstHit = false;
        this.timeElapsed = 0;
        stats.firstHit = false;
    }

    recordPosition() {
        this.pathPoints.push(new THREE.Vector3(this.ballPositionX, this.ballPositionY, this.ballPositionZ));
    }

    updateTrajectory(trajectory) {
        if (this.pathPoints.length >1) {
            trajectory.geometry.setFromPoints(this.pathPoints);
        } else {
            trajectory.geometry.setFromPoints([]);
        }
    }

    update(deltaTime) {
        if (!this.isSimulating) return;

        const deltaTimeSeconds = deltaTime / 1000; 
        this.timeElapsed += deltaTimeSeconds;

        // Apply Gravity
        this.velocityY += this.gravity * deltaTimeSeconds;

        // Air resistance (only when not rolling for more realism)
        if (!this.isRolling) {
            const velocity = Math.sqrt(this.velocityX**2 + this.velocityY**2 + this.velocityZ**2);
            if (velocity > 0) {
                const dragForce = (0.5 * this.airDensity * velocity**2 * 
                                 this.dragCoefficient * this.crossSectionArea) / this.ballMass;
                
                this.velocityX -= (this.velocityX / velocity) * dragForce * deltaTimeSeconds;
                this.velocityY -= (this.velocityY / velocity) * dragForce * deltaTimeSeconds;
                this.velocityZ -= (this.velocityZ / velocity) * dragForce * deltaTimeSeconds;
            }
        }

        // Update position
        this.ballPositionX += this.velocityX * deltaTimeSeconds;
        this.ballPositionY += this.velocityY * deltaTimeSeconds;
        this.ballPositionZ += this.velocityZ * deltaTimeSeconds;

        // Ground collision
        if (this.ballPositionY <= this.groundLevel) {
            const overShoot = this.groundLevel - this.ballPositionY;
            this.ballPositionY = this.groundLevel + overShoot * 0.2;
            
            // Record first hit
            if (!this.hasFirstHit) {
                this.firstHitTime = this.timeElapsed;
                this.firstHitDistance = Math.abs(this.ballPositionX);
                this.hasFirstHit = true;
                stats.distance = this.firstHitDistance.toFixed(2)+" m";
                stats.time = this.firstHitTime.toFixed(2)+" s";
                if (this.statsPanel) this.statsPanel.updateDisplay();
            }
            
            // Handle bounce or rolling
            if (Math.abs(this.velocityY) > this.minBounceHeight) {
                // Bounce
                this.isRolling = false;
                this.velocityY = -this.velocityY * this.bounceFactor;
                // Reduce horizontal velocity more aggressively during bounces
                this.velocityX *= 0.85;
                this.velocityZ *= 0.85;
            } else {
                // Rolling
                this.isRolling = true;
                this.velocityY = 0;
                // Apply rolling resistance
                this.velocityX *= this.rollingFriction;
                this.velocityZ *= this.rollingFriction;
            }

            // Check for stop condition
            const currentSpeed = Math.sqrt(this.velocityX**2 + this.velocityZ**2);
            if (currentSpeed < this.minVelocityThreshold && 
                Math.abs(this.velocityY) < 0.001) {
                this.isSimulating = false;
                this.velocityX = 0;
                this.velocityY = 0;
                this.velocityZ = 0;
                this.ballPositionY = this.groundLevel;
            }
        }
        
        this.updateBallPosition();
    }
    updateBallPosition() {
    this.ball.position.set(this.ballPositionX, this.ballPositionY, this.ballPositionZ);
}
}

//Create stats panel
class StatsPanel {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '320px';
        this.container.style.right = '10px';
        this.container.style.color = 'white';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.container.style.padding = '10px';
        this.container.style.borderRadius = '5px';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.zIndex = '100';

        this.distanceElement = document.createElement('div');
        this.timeElement = document.createElement('div');

        this.container.appendChild(this.distanceElement);
        this.container.appendChild(this.timeElement);

        document.body.appendChild(this.container);
        this.updateDisplay();
    }

    updateDisplay() {
        this.distanceElement.textContent = `Distance: ${stats.distance}`;
        this.timeElement.textContent = `Time to first hit: ${stats.time}`;
    }

}

// Main appliction
class App {
    constructor() {
        initRenderer();
        createLights();
        this.ball = createBall();
        createGround();
        createHelpers();
        this.trajectory = createTrajectory();

        this.statsPanel = new StatsPanel();
        this.physics = new PhysicsEngine(this.ball, this.statsPanel);

    
        this.controls = new THREE.OrbitControls(camera, renderer.domElement);
        this.controls.enableDamping = true;	
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI *0.9; //Prevent camera going under ground
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;

        camera.position.set(10, 10, 20);
        camera.lookAt(0, 0, 0);

        

        this.setupGUI();
        this.setupEventListeners();
        this.lastTime = performance.now();
        this.animate();
    }

    setupGUI() {
    this.gui = new (window.GUI || lil.GUI)({width: 300});
    this.params = {
        angle: 45,
        speed: 15, // More realistic initial speed (m/s)
        gravity: -9.81,
        bounceFactor: 0.7,
        dragCoefficient: 0.47, // Standard for smooth sphere
        airDensity: 1.225,
        ballMass: 0.1, // kg
        showTrajectory: true,
        launch: () => this.physics.launch(this.params.angle, this.params.speed),
        reset: () => {
            this.physics.dragCoefficient = this.params.dragCoefficient;
            this.physics.ballMass = this.params.ballMass;
            this.physics.bounceFactor = this.params.bounceFactor;
            this.physics.reset();
        },
    };

        this.gui.add(this.params, 'angle', 0, 90).name('Launch Angle (°)');
        this.gui.add(this.params, 'speed', 0.1, 30).step(0.5).name('Initial Speed (m/s)');
        this.gui.add(this.params, 'gravity', -0.1,-0.001).name('Gravity (m/s²)');
        this.gui.add(this.params, 'bounceFactor').onChange((val) => {
        this.physics.bounceFactor = val;});
        this.gui.add(this.params, 'showTrajectory').name('Show Trajectory');
        this.gui.add(this.params, 'dragCoefficient', 0, 0.1).step(0.001).name('Drag Coefficient (Cd)');
        this.gui.add(this.params, 'ballMass', 0.01, 1).step(0.01).name('Ball Mass (kg)');
        this.gui.add(this.params, 'airDensity', 0.1, 2).step(0.1).name('Air Density (kg/m³)');
        this.gui.add(this.params, 'launch').name('Launch Ball');
        this.gui.add(this.params, 'reset').name('Reset Simulation');
    }

    setupEventListeners(){
        window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('keydown', (event) => {
        if (event.code === 'Space') {
            this.physics.launch(this.params.angle, this.params.speed);
        }
        if (event.code === 'KeyR') {
            this.physics.reset();
        }
    });
    }

    onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
    requestAnimationFrame(this.animate.bind(this));

    // Get actual frame delta time instead of fixed value
    const now = performance.now();
    const deltaTime = Math.min(now - (this.lastTime || now), 100); // Cap at 100ms
    this.lastTime = now;

    this.physics.update(deltaTime);

    if (this.params.showTrajectory && this.physics.isSimulating) {
        this.physics.recordPosition();
        this.physics.updateTrajectory(this.trajectory);
    }

    this.controls.update();
    renderer.render(scene, camera);
}
}


//Start the app
new App();
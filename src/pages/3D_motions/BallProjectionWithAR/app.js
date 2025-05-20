
//Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

//Configuration
const config = {
    ballRadius: 0.5,
    groundSize: 30,
    gridSize: 30,
    gridDivisions: 30,
};

//Initialize renderer
function initRenderer() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x333333);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
}

//Create lights
function createLights() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
}

//Create ball
function createBall(){
    const geometry = new THREE.SphereGeometry(config.ballRadius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x0077ff,
        roughness: 0.1,
        metalness: 0.3,
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
        color: 0xaaaaaa,
        side: THREE.DoubleSide
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
    const gridHelper = new THREE.GridHelper(config.gridSize, config.gridDivisions, 0x555555, 0x333333);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
}

//Create trajectory
function createTrajectory() {
    const material = new THREE.LineBasicMaterial({ color: 0xff9900 });
    const geometry = new THREE.BufferGeometry();
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    return line;
}

//Physics system
class PhysicsEngine {
    constructor(ball) {
        this.ball = ball;
        this.reset();
        this.gravity = -0.02;
        this.bounceFactor = 0.7;
        this.dragCoefficient = 0.02;  // Air resistance coefficient
        this.airDensity = 1.2; // kg/m^3 (for Air)
        this.crossSectionArea = Math.PI * config.ballRadius**2; // projected area of the ball
        this.groundLevel = -config.ballRadius+config.ballRadius;
        this.pathPoints = [];
        this.isSimulating = false;
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

        //Calculate velocity magnitude
        const velocity = Math.sqrt(
            this.velocityX **2 +
            this.velocityY **2 +
            this.velocityZ **2
        );

        //Air resisitance calculation (Drag force)
        if (velocity > 0) {
            //Drag force magnitude : Fd = 0.5 * ρ * v^2 * Cd * A
            const dragForce = 0.5 * this.airDensity * velocity**2 * this.dragCoefficient * this.crossSectionArea;

            //Normalize velocity to get direction
            const dragX = -(this.velocityX / velocity) * dragForce * deltaTime;
            const dragY = -(this.velocityY / velocity) * dragForce * deltaTime; 
            const dragZ = -(this.velocityZ / velocity) * dragForce * deltaTime;

            //Apply drag force
            this.velocityX += dragX;
            this.velocityY += dragY;
            this.velocityZ += dragZ;
        }



        //Apply gravity
        this.velocityY += this.gravity * deltaTime;

        //Update position
        this.ballPositionX += this.velocityX * deltaTime;
        this.ballPositionY += this.velocityY * deltaTime;
        this.ballPositionZ += this.velocityZ * deltaTime;

        //Ground collision
        if (this.ballPositionY <= this.groundLevel) {
            this.ballPositionY = this.groundLevel;
            this.velocityY = -this.velocityY * this.bounceFactor*0.9; // Reduce bounce energy
            this.velocityX = this.velocityX * this.bounceFactor*0.95;
            this.velocityZ = this.velocityZ * this.bounceFactor*0.95;

            //Stop simulation if energy is very low
            if (velocity <0.05) {
                this.isSimulating = false;
            }
        }
        this.updateBallPosition();
    }
    updateBallPosition() {
        this.ball.position.set(this.ballPositionX, this.ballPositionY, this.ballPositionZ);
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

        this.physics = new PhysicsEngine(this.ball);
        this.controls = new THREE.OrbitControls(camera, renderer.domElement);
        this.controls.enableDamping = true;	
        this.controls.dampingFactor = 0.05;

        camera.position.set(10, 10, 20);
        camera.lookAt(0, 0, 0);

        this.setupGUI();
        this.setupEventListeners();
        this.animate();
    }

    setupGUI() {
        this.gui = new (window.GUI || lil.GUI)({width: 300});
        this.params = {
            angle: 45,
            speed: 0.5,
            gravity: -0.02,
            bounceFactor: 0.7,
            dragCoefficient: 0.02,
            airDensity: 1.2,
            showTrajectory: true,
            launch: () => this.physics.launch(this.params.angle, this.params.speed),
            reset: () => {
                this.physics.dragCoefficient = this.params.dragCoefficient;
                this.physics.reset();
                },
        };

        this.gui.add(this.params, 'angle', 0, 90).name('Launch Angle');
        this.gui.add(this.params, 'speed', 0.1, 2).step(0.1).name('Initial Speed');
        this.gui.add(this.params, 'gravity', -0.1,-0.001).name('Gravity');
        this.gui.add(this.params, 'bounceFactor', 0.1, 0.9).name('Bounce Factor');
        this.gui.add(this.params, 'showTrajectory').name('Show Trajectory');
        this.gui.add(this.params, 'launch').name('Launch Ball');
        this.gui.add(this.params, 'reset').name('Reset Simulation');
        this.gui.add(this.params, 'dragCoefficient', 0, 0.1).step(0.001).name('Drag Coefficient')
        .onChange(val => this.physics.dragCoefficient = val);
    }

    setupEventListeners(){
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('click',() => this.params.launch());
    }

    onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const deltaTime = 0.016; // 60 FPS
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
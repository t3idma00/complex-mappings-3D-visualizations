

const stats ={
    distance: "0 m",
    time: "0 s",
    firstHit: false,
}


//Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x333333, 0.05);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
initRenderer();

//Configuration
const config = {
    ballRadius: 0.5,
    groundSize: 30,
    gridSize: 30,
    gridDivisions: 30,
    ballSegment: 32,
    shadowQuality: 2048,
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
        color: 0x0077ff,
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
        color: 0xaaaaaa,
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
    const gridHelper = new THREE.GridHelper(
        config.gridSize, 
        config.gridDivisions, 
        0x555555, 
        0x333333
    );
    gridHelper.position.y = -config.ballRadius;
    scene.add(gridHelper);

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
        this.gravity = -9.81;
        this.bounceFactor = 0.7;
        this.crossSectionArea = Math.PI *config.ballRadius ** 2;
        this.groundLevel = config.ballRadius;
        this.pathPoints = [];
        this.isSimulating = false;
        this.firstHitTime = 0;
        this.firstHitDistance = 0;
        this.hasFirstHit = false;
        this.timeElapsed = 0;
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
        this.firstHitTime = 0;
        this.firstHitDistance = 0;
        this.hasFirstHit = false;
        this.timeElapsed = 0;
        stats.distance = "0 m";
        stats.time = "0 s";
        stats.firstHit = false;
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

        //Update time
        this.timeElapsed += deltaTime;

        //Apply gravity
        this.velocityY += this.gravity * deltaTime;

        //Update position
        this.ballPositionX += this.velocityX * deltaTime;
        this.ballPositionY += this.velocityY * deltaTime;
        this.ballPositionZ += this.velocityZ * deltaTime;

        //Ground collision
        if (this.ballPositionY <= this.groundLevel) {
            this.ballPositionY = this.groundLevel;
            //Record first hit time and distance
            if (!this.hasFirstHit) {
                this.firstHitTime = this.timeElapsed;
                this.firstHitDistance = Math.abs(this.ballPositionX);
                this.hasFirstHit = true;

                //Update stats
                stats.distance = this.firstHitDistance.toFixed(2) + " m";
                stats.time = this.firstHitTime.toFixed(2) + " s";
                if (this.statsPanel) this.statsPanel.updateDisplay();
            }

            //Bounce
            this.velocityY = -this.velocityY * this.bounceFactor;
            this.velocityX *= this.bounceFactor * 0.9;
            this.velocityZ *= this.bounceFactor * 0.9;


        
            //Reset position
            this.ballPositionY = this.groundLevel;
            

            //Stop simulation if energy is very low
            if (Math.abs(this.velocityY) <0.01 && Math.abs(this.velocityX) <0.01 && Math.abs(this.velocityZ)<0.01){
                this.isSimulating = false;
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
            speed: 15,
            gravity: -9.81,
            bounceFactor: 0.7,
            ballMass: 0.1,
            showTrajectory: true,
            launch: () => this.physics.launch(this.params.angle, this.params.speed),
            reset: () => {
                this.physics.reset();
                if (this.statsPanel) {
                    this.statsPanel.updateDisplay();
                }
            }

        };

        this.gui.add(this.params, 'angle', 0, 90).name('Launch Angle (°)');
        this.gui.add(this.params, 'speed', 0.1,30).step(0.1).name('Initial Speed (m/s)');
        this.gui.add(this.params, 'gravity', -0.1,-0.001).name('Gravity (m/s²)');
        this.gui.add(this.params, 'bounceFactor', 0.1, 0.9).name('Bounce Factor');
        this.gui.add(this.params, 'showTrajectory').name('Show Trajectory');
        this.gui.add(this.params, 'launch').name('Launch Ball');
        this.gui.add(this.params, 'reset').name('Reset Simulation');
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
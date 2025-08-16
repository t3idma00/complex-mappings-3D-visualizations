// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Add lights
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Game variables
let ball;
let board;
let boardGroup;
let holes = [];
let startPoint;
let endHole;
let gameOver = false;
const boardSize = 20;
const holeRadius = 0.8;
const ballRadius = 0.5;

// Physics variables - Adjusted for slower movement
const gravity = 0.01; // Reduced gravity
const friction = 0.985; // Higher friction (still low but not extreme)
let ballVelocity = new THREE.Vector3(0.3, 0, 0.3); // Moderate initial speed
let boardRotation = { x: 0, z: 0 };
const maxTiltAngle = Math.PI / 6; // Standard tilt angle
const tiltSpeed = 0.015; // Slower tilt response

// Create game elements
function createGameElements() {
    // Create a group for the board and holes so we can tilt them together
    boardGroup = new THREE.Group();
    scene.add(boardGroup);

    // Create board
    const boardGeometry = new THREE.BoxGeometry(boardSize, 0.5, boardSize);
    const boardMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.7
    });
    board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.y = -0.25;
    board.receiveShadow = true;
    boardGroup.add(board);

    // Create dangerous holes (to avoid)
    const dangerHolePositions = [
        { x: -5, z: -5 },
        { x: 5, z: -5 },
        { x: -5, z: 5 },
        { x: 0, z: 0 }
    ];

    const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, 1, 32);
    const dangerHoleMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    
    dangerHolePositions.forEach(pos => {
        const hole = new THREE.Mesh(holeGeometry, dangerHoleMaterial);
        hole.position.set(pos.x, 0, pos.z);
        hole.rotation.x = Math.PI / 2;
        holes.push({
            mesh: hole,
            position: new THREE.Vector3(pos.x, 0, pos.z),
            isGoal: false
        });
        boardGroup.add(hole);
    });

    // Create start point
    const startGeometry = new THREE.CylinderGeometry(1, 1, 0.1, 32);
    const startMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF });
    startPoint = new THREE.Mesh(startGeometry, startMaterial);
    startPoint.position.set(-8, 0.1, -8);
    startPoint.rotation.x = Math.PI / 2;
    boardGroup.add(startPoint);

    // Create goal hole (the one you WANT to fall into)
    const goalHoleMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
    endHole = new THREE.Mesh(holeGeometry, goalHoleMaterial);
    endHole.position.set(8, 0, 8);
    endHole.rotation.x = Math.PI / 2;
    holes.push({
        mesh: endHole,
        position: new THREE.Vector3(8, 0, 8),
        isGoal: true
    });
    boardGroup.add(endHole);

    // Create ball
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(-8, ballRadius, -8);
    ball.castShadow = true;
    scene.add(ball);
}

// Check if ball is in any hole
function checkHoleCollision() {
    for (const hole of holes) {
        const distance = Math.sqrt(
            Math.pow(ball.position.x - hole.position.x, 2) + 
            Math.pow(ball.position.z - hole.position.z, 2)
        );
        
        if (distance < holeRadius) {
            return hole;
        }
    }
    return null;
}

// Handle keyboard input for tilting
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Update board tilt based on keyboard input
function updateBoardTilt() {
    if (keys.ArrowUp && boardRotation.x > -maxTiltAngle) {
        boardRotation.x -= tiltSpeed;
    }
    if (keys.ArrowDown && boardRotation.x < maxTiltAngle) {
        boardRotation.x += tiltSpeed;
    }
    if (keys.ArrowLeft && boardRotation.z > -maxTiltAngle) {
        boardRotation.z -= tiltSpeed;
    }
    if (keys.ArrowRight && boardRotation.z < maxTiltAngle) {
        boardRotation.z += tiltSpeed;
    }

    // Apply smooth rotation
    boardGroup.rotation.x = boardRotation.x;
    boardGroup.rotation.z = boardRotation.z;
}

// Update ball physics
function updateBallPhysics() {
    // Apply gravity
    ballVelocity.y -= gravity;

    // Apply tilt forces based on board rotation
    const tiltForceX = Math.sin(boardGroup.rotation.z) * gravity * 20;
    const tiltForceZ = -Math.sin(boardGroup.rotation.x) * gravity * 20;
    
    ballVelocity.x += tiltForceX;
    ballVelocity.z += tiltForceZ;

    // Apply friction
    ballVelocity.x *= friction;
    ballVelocity.z *= friction;

    // Update position
    ball.position.x += ballVelocity.x;
    ball.position.y += ballVelocity.y;
    ball.position.z += ballVelocity.z;

    // Check if ball is on the board
    if (ball.position.y < ballRadius) {
        ball.position.y = ballRadius;
        ballVelocity.y = 0;
    }
}

// Game loop
function animate() {
    if (!gameOver) {
        updateBoardTilt();
        updateBallPhysics();

        // Check for hole collisions
        const collidedHole = checkHoleCollision();
        if (collidedHole) {
            if (collidedHole.isGoal) {
                // Win condition
                gameOver = true;
                document.getElementById('win-message').style.display = "block";
            } else {
                // Lose condition
                gameOver = true;
                document.getElementById('lose-message').style.display = "block";
            }
        }

        // Check if ball fell off the board
        if (ball.position.y < -10) {
            gameOver = true;
            document.getElementById('lose-message').style.display = "block";
        }
    }
    
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize and start game
createGameElements();
animate();
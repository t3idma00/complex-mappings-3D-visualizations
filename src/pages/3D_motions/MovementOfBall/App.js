import * as THREE from 'three';

//Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xeeeeee); // Set background color
document.body.appendChild(renderer.domElement);

//Add some lights
const directionalLight = new THREE.DirectionalLight(0xffffff,2 );
directionalLight.position.set(15,15,15);
scene.add(directionalLight);


//Create a ball
const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const ballMaterial = new THREE.MeshPhongMaterial({
    color: 0x0077ff,
    shininess: 150
});
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(ball);

//Create a ground plane
const groundGeometry = new THREE.PlaneGeometry(10,10);
const groundMaterial = new THREE.MeshPhongMaterial({
    color: 0xaaaaaa,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2; // Rotate the plane to be horizontal
ground.position.y = -0.5; // Move the plane down
scene.add(ground);

//Set camera position
camera.position.set(0,0,10);
camera.lookAt(0, 0, 0);

//Physics variables
let ballPositionY = 5; //Start 5 units above the ground
let velocityY = 0;
const gravity = -0.01;
const bounceFactor = 0.7; // Energy loss on bounce



//Animation loop
function animate() {
    requestAnimationFrame(animate);

    //Physics update
    velocityY += gravity;
    ballPositionY += velocityY;

    //Ground collision
    if (ballPositionY <= -4.5) { //-5 (ground)+0.5 (ball radius)
        ballPositionY = -4.5;
        velocityY = -velocityY * bounceFactor;
    }

    //Update ball position
    ball.position.y = ballPositionY;

    

    renderer.render(scene, camera);
}

animate();

//Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

//Reset animation on click
window.addEventListener('keydown', (event) => {
    if (event.key ==='Enter') {
    ballPositionY = 5;
    velocityY = 0;
    if (typeof pathPoints !== 'undefined') 
        pathPoints.length = 0; // Clear the path
        event.preventDefault();
    }
});

renderer.domElement.style.pointerEvents = 'none'; // Disable pointer events on the canvas



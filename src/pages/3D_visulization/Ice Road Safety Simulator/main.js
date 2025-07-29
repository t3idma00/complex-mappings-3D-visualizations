import * as THREE from 'three';

let scene, camera, renderer;
let carGroup, tires = [];
let isBraking = false;
let carPositionX = -40;
let speedKmh = 60;
let speed = speedKmh / 3.6; // m/s
const roadLength = 100;
const carLoopLimit = 50;
let brakeStartX = null;
let brakingDistance = 0;
let animationBrakingDistance = 0;
let targetStopX = null;

const G = 9.81;
let roadMesh, crosswalkStripes = [];

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaec6cf);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 25);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#scene') });
    renderer.setSize(window.innerWidth, window.innerHeight);

    createRoad();
    createCrosswalk();
    createCar();

    // Set default road color
    updateRoadColor(document.getElementById('surface').value);

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Brake Button
    document.getElementById('brakeBtn').addEventListener('click', () => {
        if (!isBraking && speed > 0) {
            isBraking = true;
            brakeStartX = carPositionX;

            // Get parameters
            speedKmh = parseFloat(document.getElementById('speed').value);
            speed = speedKmh / 3.6;
            const tireType = document.getElementById('tireType').value;
            const surface = document.getElementById('surface').value;

            const mu = getFrictionCoefficient(surface, tireType);
            brakingDistance = (speed * speed) / (2 * mu * G);
            targetStopX = carPositionX + brakingDistance;
            animationBrakingDistance = brakingDistance;

            document.getElementById('brakeDistanceDisplay').style.display = 'none';
            document.getElementById('resultMessage').style.display = 'none';
        }
    });

    // Drive Button
    document.getElementById('driveBtn').addEventListener('click', () => {
        if (speed === 0) {
            carPositionX = -carLoopLimit;
            speedKmh = parseFloat(document.getElementById('speed').value);
            speed = speedKmh / 3.6;
            document.getElementById('brakeDistanceDisplay').style.display = 'none';
            document.getElementById('resultMessage').style.display = 'none';
        }
    });

    // Speed Slider
    const speedSlider = document.getElementById('speed');
    const speedValue = document.getElementById('speedValue');

    speedSlider.addEventListener('input', () => {
        const kmh = speedSlider.value;
        speedValue.textContent = kmh;
        if (!isBraking) {
            speedKmh = kmh;
            speed = speedKmh / 3.6;
        }
    });

    // Road Surface Change (update color dynamically)
    document.getElementById('surface').addEventListener('change', (e) => {
        updateRoadColor(e.target.value);
    });

    // Formula Panel Toggle
    document.getElementById('formulaHeader').addEventListener('click', () => {
        const content = document.getElementById('formulaContent');
        const header = document.getElementById('formulaHeader');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            header.textContent = '▲ Hide Physics Formula';
        } else {
            content.style.display = 'none';
            header.textContent = '▼ Show Physics Formula';
        }
    });
}

function getFrictionCoefficient(surface, tire) {
    const table = {
        snow: { summer: 0.2, winter: 0.35 },
        asphalt: { summer: 0.8, winter: 0.9 }
    };
    return table[surface][tire];
}

function createRoad() {
    const roadGeo = new THREE.PlaneGeometry(roadLength, 10);
    const roadMat = new THREE.MeshBasicMaterial({ color: 0x777777, side: THREE.DoubleSide });
    roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    scene.add(roadMesh);

    const lineGeo = new THREE.PlaneGeometry(4, 0.2);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    for (let i = -roadLength / 2; i < roadLength / 2; i += 6) {
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(i, 0.01, 0);
        scene.add(line);
    }
}

function updateRoadColor(surface) {
    if (surface === 'snow') {
        roadMesh.material.color.set(0xffffff);
        crosswalkStripes.forEach(stripe => stripe.material.color.set(0x000000));
    } else {
        roadMesh.material.color.set(0x777777);
        crosswalkStripes.forEach(stripe => stripe.material.color.set(0xffffff));
    }
}

function createCrosswalk() {
    const stripeGeo = new THREE.PlaneGeometry(0.5, 10);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const startX = carLoopLimit - 25;
    for (let i = 0; i < 6; i++) {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(startX + i * 1, 0.02, 0);
        scene.add(stripe);
        crosswalkStripes.push(stripe);
    }
}

function createCar() {
    carGroup = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(3, 1.5, 4);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.5, 0);
    carGroup.add(body);
    carGroup.rotation.y = Math.PI / 2;

    const tireGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 32);
    const tireMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const tirePositions = [[-1.5, 0.5, 2], [1.5, 0.5, 2], [-1.5, 0.5, -2], [1.5, 0.5, -2]];
    tirePositions.forEach(pos => {
        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(...pos);
        carGroup.add(tire);
        tires.push(tire);
    });

    carGroup.position.set(carPositionX, 0, 0);
    scene.add(carGroup);
}

function animate() {
    requestAnimationFrame(animate);

    if (!isBraking && speed > 0) {
        carPositionX += speed * 0.05;
    }

    if (isBraking && speed > 0) {
        carPositionX += speed * 0.05;
        speed -= (speed * speed) / (2 * animationBrakingDistance * 60);

        if (carPositionX >= targetStopX || speed <= 0) {
            speed = 0;
            isBraking = false;

            const distanceDisplay = document.getElementById('brakeDistanceDisplay');
            const messageDisplay = document.getElementById('resultMessage');

            distanceDisplay.textContent = `Braking Distance: ${brakingDistance.toFixed(2)} m`;
            distanceDisplay.style.display = 'block';

            const crosswalkStart = carLoopLimit - 25;
            if (targetStopX < crosswalkStart) {
                messageDisplay.textContent = "Perfect braking! Safety first : you kept the crosswalk clear :)";
                messageDisplay.style.color = "lightgreen";
            } else {
                messageDisplay.textContent = "Too late! Imagine if someone was crossing : Always keep a minimum speed and brake earlier :(";
                messageDisplay.style.color = "red";
            }
            messageDisplay.style.display = 'block';
        }
    }

    if (carPositionX > carLoopLimit && !isBraking) {
        carPositionX = -carLoopLimit;
    }

    carGroup.position.x = carPositionX;
    tires.forEach(tire => { tire.rotation.x += speed * 0.1; });
    renderer.render(scene, camera);
}

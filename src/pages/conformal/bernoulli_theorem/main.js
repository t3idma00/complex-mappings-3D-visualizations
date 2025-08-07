let sketch = function(p) {
    let U_freeStream = 1.0; 
    let R_cylinder = 50;   
    let numParticles = 500; 
    let particleSpeedMultiplier = 1.0; 
    let showPressure = true;

    const pressureResolution = 2; 
    const particleSpawnRate = 5; 

    let particles = [];
    let particleSpawnCounter = 0;

    let flowSpeedSlider;
    let cylinderRadiusSlider;
    let numParticlesSlider;
    let particleSpeedMultiplierSlider;
    let showPressureCheckbox;
    let flowSpeedValueSpan;
    let cylinderRadiusValueSpan;
    let numParticlesValueSpan;
    let particleSpeedMultiplierValueSpan;

    // Particle Class Definition
    class Particle {
        constructor(x, y) {
            this.pos = p.createVector(x, y);
            this.lifespan = 255; 
            this.trail = []; 
            this.trailLength = 10; 
        }

        update() {
            let z_comp = this.pos.copy(); 
            let distToCenter = p.dist(0, 0, this.pos.x, this.pos.y);

            
            if (distToCenter < R_cylinder + 1 || this.pos.x > p.width / 2 + 50 || this.pos.x < -p.width / 2 - 50 ||
                this.pos.y > p.height / 2 + 50 || this.pos.y < -p.height / 2 - 50) {
                this.reset();
                return;
            }

            let w = complexVelocity(z_comp); 
            let u = w.x;   
            let v = -w.y;  

            
            this.trail.push(this.pos.copy());
            if (this.trail.length > this.trailLength) {
                this.trail.shift();
            }

            
            this.pos.x += u * particleSpeedMultiplier;
            this.pos.y += v * particleSpeedMultiplier;

            this.lifespan -= 1; 
        }

        display() {
            p.noStroke();
            p.fill(0, 150, 255, 200); 

            // Draw particle dot
            p.ellipse(this.pos.x, this.pos.y, 3, 3); 

            // Draw trail
            p.stroke(0, 150, 255, 100); 
            p.strokeWeight(1);
            p.noFill();
            p.beginShape();
            for (let i = 0; i < this.trail.length; i++) {
                let alpha = p.map(i, 0, this.trail.length - 1, 0, 100); 
                p.stroke(0, 150, 255, alpha);
                p.vertex(this.trail[i].x, this.trail[i].y);
            }
            p.endShape();
        }

        reset() {
            
            let startYOffset = p.height * 0.4; 
            this.pos = p.createVector(-p.width / 2 - 50, p.random(-startYOffset, startYOffset));
            this.lifespan = 255; 
            this.trail = []; 
        }
    }

    p.setup = function() {
        let canvas = p.createCanvas(800, 400);
        canvas.parent('canvas-container');
        p.pixelDensity(1);

        flowSpeedSlider = p.select('#flowSpeed');
        cylinderRadiusSlider = p.select('#cylinderRadius');
        numParticlesSlider = p.select('#numParticles');
        particleSpeedMultiplierSlider = p.select('#particleSpeedMultiplier');
        showPressureCheckbox = p.select('#showPressure');

        flowSpeedValueSpan = p.select('#flowSpeedValue');
        cylinderRadiusValueSpan = p.select('#cylinderRadiusValue');
        numParticlesValueSpan = p.select('#numParticlesValue');
        particleSpeedMultiplierValueSpan = p.select('#particleSpeedMultiplierValue');

        U_freeStream = parseFloat(flowSpeedSlider.value());
        R_cylinder = parseFloat(cylinderRadiusSlider.value());
        numParticles = parseInt(numParticlesSlider.value());
        particleSpeedMultiplier = parseFloat(particleSpeedMultiplierSlider.value());
        showPressure = showPressureCheckbox.checked();

        flowSpeedValueSpan.html(U_freeStream.toFixed(1));
        cylinderRadiusValueSpan.html(R_cylinder);
        numParticlesValueSpan.html(numParticles);
        particleSpeedMultiplierValueSpan.html(particleSpeedMultiplier.toFixed(1));

        flowSpeedSlider.input(() => {
            U_freeStream = parseFloat(flowSpeedSlider.value());
            flowSpeedValueSpan.html(U_freeStream.toFixed(1));
        });
        cylinderRadiusSlider.input(() => {
            R_cylinder = parseFloat(cylinderRadiusSlider.value());
            cylinderRadiusValueSpan.html(R_cylinder);
        });
        numParticlesSlider.input(() => {
            numParticles = parseInt(numParticlesSlider.value());
            numParticlesValueSpan.html(numParticles);
        });
        particleSpeedMultiplierSlider.input(() => {
            particleSpeedMultiplier = parseFloat(particleSpeedMultiplierSlider.value());
            particleSpeedMultiplierValueSpan.html(particleSpeedMultiplier.toFixed(1));
        });
        showPressureCheckbox.changed(() => {
            showPressure = showPressureCheckbox.checked();
        });

        // Initialize particles
        for (let i = 0; i < numParticles; i++) {
            let startYOffset = p.height * 0.4; 
            particles.push(new Particle(-p.width / 2 - p.random(0, 100), p.random(-startYOffset, startYOffset)));
        }
    };

    p.draw = function() {
        p.background(255);
        p.translate(p.width / 2, p.height / 2); 

        if (showPressure) {
            drawPressureVisualization();
        }

        p.noFill();
        p.stroke(0);
        p.strokeWeight(2);
        p.ellipse(0, 0, R_cylinder * 2, R_cylinder * 2); 

        drawParticles();
    };

    function complexVelocity(z_comp) {
        let z = p.createVector(z_comp.x, z_comp.y);
        let z_magSq = z.magSq();

        let w_real = U_freeStream;
        let w_imag = 0;

        if (z_magSq < 0.001) { 
             return p.createVector(0,0);
        }

        let R_squared_U = R_cylinder * R_cylinder * U_freeStream;
        let z_squared_real = z.x * z.x - z.y * z.y;
        let z_squared_imag = 2 * z.x * z.y;

        let denom = z_squared_real * z_squared_real + z_squared_imag * z_squared_imag;
        let term2_real = (R_squared_U * z_squared_real) / denom;
        let term2_imag = (-R_squared_U * z_squared_imag) / denom;

        w_real -= term2_real;
        w_imag -= term2_imag;

        return p.createVector(w_real, w_imag);
    }

    function drawParticles() {
        // Update and display particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].display();
        }

        particleSpawnCounter++;
        if (particleSpawnCounter >= particleSpawnRate && particles.length < numParticles) {
            let startYOffset = p.height * 0.4; 
            particles.push(new Particle(-p.width / 2 - 50, p.random(-startYOffset, startYOffset)));
            particleSpawnCounter = 0;
        }

        particles = particles.filter(p => p.lifespan > 0);
        while(particles.length < numParticles) {
            let startYOffset = p.height * 0.4;
            particles.push(new Particle(-p.width / 2 - 50, p.random(-startYOffset, startYOffset)));
        }
    }

    function drawPressureVisualization() {
        const resolution = pressureResolution;
        const maxSpeedColor = 2.0 * U_freeStream;
        p.noStroke();

        for (let x = -p.width / 2; x < p.width / 2; x += resolution) {
            for (let y = -p.height / 2; y < p.height / 2; y += resolution) {
                let dist = p.dist(0, 0, x, y);
                if (dist > R_cylinder) {
                    let z_comp = p.createVector(x, y);
                    let w = complexVelocity(z_comp);
                    let speed = p.sqrt(w.x * w.x + w.y * w.y);

                    let speedNormalized = p.constrain(speed / maxSpeedColor, 0, 1);

                    let blue = p.map(speedNormalized, 0, 1, 255, 0);
                    let red = p.map(speedNormalized, 0, 1, 0, 255);

                    p.fill(red, 0, blue, 100);
                    p.rect(x, y, resolution, resolution);
                }
            }
        }
    }
};

new p5(sketch);
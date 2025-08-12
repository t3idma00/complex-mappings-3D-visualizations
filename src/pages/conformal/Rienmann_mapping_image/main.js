
  // Complex Number Utilities
function Complex(re, im=0) {
  this.re = re;
  this.im = im;
}
Complex.prototype.add = function(c){ return new Complex(this.re + c.re, this.im + c.im); }
Complex.prototype.sub = function(c){ return new Complex(this.re - c.re, this.im - c.im); }
Complex.prototype.mul = function(c){ 
  return new Complex(this.re*c.re - this.im*c.im, this.re*c.im + this.im*c.re); 
}
Complex.prototype.scale = function(s){ return new Complex(this.re*s, this.im*s); }
Complex.prototype.conj = function(){ return new Complex(this.re, -this.im); }
Complex.prototype.abs = function(){ return Math.sqrt(this.re*this.re + this.im*this.im); }
Complex.prototype.pow = function(n){
  let r = new Complex(1,0);
  for(let i=0; i<n; i++) r = r.mul(this);
  return r;
}

// Parameters
const degree = 7;  
const gridRes = 150; 

// Numerical integration over square [-1,1]^2
function integrateSquare(f) {
  let sum = new Complex(0,0);
  let dx = 2/gridRes;
  let dy = 2/gridRes;
  for(let i=0; i<gridRes; i++){
    for(let j=0; j<gridRes; j++){
      let x = -1 + dx*(i+0.5);
      let y = -1 + dy*(j+0.5);
      let val = f(new Complex(x,y));
      sum = sum.add(val.scale(dx*dy));
    }
  }
  return sum;
}

// Monomial basis z^n
function monomial(z, n){ return z.pow(n); }

function innerProduct(f,g){
  return integrateSquare(z => f(z).mul(g(z).conj()));
}

function gramSchmidt(){
  let basis = [];
  for(let n=0; n<degree; n++){
    basis.push(z => monomial(z,n));
  }

  let ortho = [];
  for(let i=0; i<degree; i++){
    let f = basis[i];
    let proj = z => new Complex(0,0);
    for(let j=0; j<i; j++){
      let c = innerProduct(f, ortho[j]);
      proj = ((old) => (z => old(z).add(ortho[j](z).scale(c.re))))(proj);
    }
    let g = z => f(z).sub(proj(z));
    let norm = Math.sqrt(innerProduct(g,g).re);
    if(norm > 1e-14) ortho.push(z => g(z).scale(1/norm));
    else ortho.push(z => new Complex(0,0));
  }
  return ortho;
}

// Bergman Kernel 
function bergmanKernel(z,w,ortho){
  let sum = new Complex(0,0);
  for(let p of ortho){
    sum = sum.add(p(z).mul(p(w).conj()));
  }
  return sum;
}

const center = new Complex(0,0);

// Map derivative f'(z) 
function mapDerivative(z, ortho){
  let norm = bergmanKernel(center, center, ortho).re;
  return bergmanKernel(z, center, ortho).scale(1/norm);
}

function integrateMap(z, ortho, steps=20){
  let dz = new Complex((z.re - center.re)/steps, (z.im - center.im)/steps);
  let sum = new Complex(0,0);
  for(let k=0; k<=steps; k++){
    let t = new Complex(center.re + dz.re*k, center.im + dz.im*k);
    let w = mapDerivative(t, ortho);
    let weight = (k === 0 || k === steps) ? 0.5 : 1;
    sum = sum.add(w.scale(weight));
  }
  return sum.mul(dz);
}

let img;
let orthoBasis;
let squarePoints = [];
let mappedPoints = [];
let imgLoaded = false;

function setup(){
  createCanvas(900, 500);
  orthoBasis = gramSchmidt();
  
  const fileInput = select('#imageUpload');
  fileInput.changed(fileChanged);
  
  // Initialize grid points
  for(let i=0; i<gridRes; i++){
    for(let j=0; j<gridRes; j++){
      let x = -1 + 2*(i+0.5)/gridRes;
      let y = -1 + 2*(j+0.5)/gridRes;
      squarePoints.push(new Complex(x,y));
    }
  }
  
  mappedPoints = squarePoints.map(p => integrateMap(p, orthoBasis));
}

function fileChanged(){
  let file = select('#imageUpload').elt.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function(e) {
      img = loadImage(e.target.result, () => {
        imgLoaded = true;
        redraw();
      });
    };
    reader.readAsDataURL(file);
  }
}

function draw(){
  background(240);
  
  // Draw square domain 
  push();
  translate(width*0.25, height/2);
  noFill();
  stroke(0);
  rectMode(CENTER);
  rect(0,0,300,300);
  
  if(imgLoaded){
    imageMode(CENTER);
    image(img, 0, 0, 300, 300);
  } else {
    fill(0);
    textAlign(CENTER, CENTER);
    text("Upload an image", 0, 0);
  }
  
  fill(0);
  textAlign(CENTER);
  text("Square [-1,1]^2", 0, -170);
  pop();
  
  // Draw mapped image 
  push();
  translate(width*0.75, height/2);
  noFill();
  stroke(0);
  ellipse(0,0,300,300); 
  
  if(imgLoaded){
    // Draw the mapped image
    for(let i=0; i<squarePoints.length; i++){
      let p = squarePoints[i];
      let mp = mappedPoints[i];
      
      let x = map(p.re, -1, 1, 0, img.width);
      let y = map(p.im, -1, 1, 0, img.height);
      let c = img.get(x, y);
      
      fill(c);
      noStroke();
      ellipse(mp.re*150, -mp.im*150, 4, 4);
    }
  }
  
  fill(0);
  textAlign(CENTER);
  text("Mapped to Disk", 0, -170);
  pop();
  

}


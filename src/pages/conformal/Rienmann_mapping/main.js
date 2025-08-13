
  // Complex Number Utilities
  function Complex(re, im=0) { this.re = re; this.im = im; }
  Complex.prototype.add = function(c){ return new Complex(this.re + c.re, this.im + c.im); }
  Complex.prototype.sub = function(c){ return new Complex(this.re - c.re, this.im - c.im); }
  Complex.prototype.mul = function(c){ return new Complex(this.re*c.re - this.im*c.im, this.re*c.im + this.im*c.re); }
  Complex.prototype.scale = function(s){ return new Complex(this.re*s, this.im*s); }
  Complex.prototype.conj = function(){ return new Complex(this.re, -this.im); }
  Complex.prototype.abs = function(){ return Math.sqrt(this.re*this.re + this.im*this.im); }
  Complex.prototype.pow = function(n){
    let r = new Complex(1,0);
    for(let i=0; i<n; i++) r = r.mul(this);
    return r;
  }

  // Problem Parameters
  const degree =10;     
  const gridRes = 120;   
  const center = new Complex(0,0);  

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

  //Bergman Setup
  function monomial(z, n){ return z.pow(n); }
  function innerProduct(f,g){ return integrateSquare(z => f(z).mul(g(z).conj())); }

  function gramSchmidt(){
    let basis = [];
    for(let n=0; n<degree; n++) basis.push(z => monomial(z,n));
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

  function bergmanKernel(z,w,ortho){
    let sum = new Complex(0,0);
    for(let p of ortho) sum = sum.add(p(z).mul(p(w).conj()));
    return sum;
  }
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

  //Visualization
  let squarePoints = [];
  let mappedPoints = [];
  let orthoBasis;
  let uploadedImg;

  function setup(){
    createCanvas(900, 480);
    pixelDensity(1);
    orthoBasis = gramSchmidt();

    //mapping grid
    for(let i=0; i<gridRes; i++){
      for(let j=0; j<gridRes; j++){
        let x = -1 + 2*(i+0.5)/gridRes;
        let y = -1 + 2*(j+0.5)/gridRes;
        let sq = new Complex(x,y);
        squarePoints.push(sq);
        mappedPoints.push(integrateMap(sq, orthoBasis));
      }
    }

    noLoop();
  }

  function draw(){
    background(255);

    //Square Domain
    push();
    translate(width*0.25, height/2);
    rectMode(CENTER);
    noFill();
    stroke(0);
    rect(0,0,300,300);

    if(uploadedImg){
      imageMode(CENTER);
      image(uploadedImg, 0, 0, 300, 300);
    } else {
      fill(0);
      noStroke();
      for(let p of squarePoints){
        ellipse(p.re*150, -p.im*150, 3, 3);
      }
    }
    pop();

    //Disk Domain 
    push();
    translate(width*0.75, height/2);
    noFill();
    stroke(0);
    ellipse(0,0,300,300);

    if(uploadedImg){
      noStroke();
      uploadedImg.loadPixels();
      for(let idx=0; idx<squarePoints.length; idx++){
        let sq = squarePoints[idx];
        let mp = mappedPoints[idx];

        //corresponding pixel in uploaded image
        let imgX = floor(map(sq.re, -1, 1, 0, uploadedImg.width-1));
        let imgY = floor(map(-sq.im, -1, 1, 0, uploadedImg.height-1));
        let pixIndex = (imgY * uploadedImg.width + imgX) * 4;
        let r = uploadedImg.pixels[pixIndex];
        let g = uploadedImg.pixels[pixIndex+1];
        let b = uploadedImg.pixels[pixIndex+2];
        fill(r, g, b);
        ellipse(mp.re*150, -mp.im*150, 3, 3);
      }
    } else {
      fill('red');
      noStroke();
      for(let p of mappedPoints){
        ellipse(p.re*150, -p.im*150, 3,3);
      }
    }
    pop();
  }

  //Image Upload 
  document.getElementById('imgUpload').addEventListener('change', function(e){
    let file = e.target.files[0];
    if(file){
      let reader = new FileReader();
      reader.onload = function(evt){
        uploadedImg = loadImage(evt.target.result, () => redraw());
      }
      reader.readAsDataURL(file);
    }
  });

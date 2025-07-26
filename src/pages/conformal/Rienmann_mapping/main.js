
const math = {
  zeros: (rows, cols) => Array(rows).fill().map(() => Array(cols).fill(0)),
  transpose: (m) => m[0].map((_, i) => m.map(row => row[i])),
  complex: (re, im) => ({ re, im }),
  conj: (c) => ({ re: c.re, im: -c.im }),
  plus: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
  minus: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
  times: (a, b) => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  }),
  divide: (a, b) => {
    const d = b.re * b.re + b.im * b.im;
    return {
      re: (a.re * b.re + a.im * b.im) / d,
      im: (a.im * b.re - a.re * b.im) / d
    };
  },
  abs: (c) => Math.sqrt(c.re * c.re + c.im * c.im),
  sqrt: (c) => {
    const r = math.abs(c);
    const t = Math.atan2(c.im, c.re);
    return {
      re: Math.sqrt(r) * Math.cos(t / 2),
      im: Math.sqrt(r) * Math.sin(t / 2)
    };
  },
  polyval: (p, z) => {
    if (Array.isArray(z[0])) {
      const result = math.zeros(z.length, z[0].length);
      for (let i = 0; i < z.length; i++) {
        for (let j = 0; j < z[0].length; j++) {
          result[i][j] = p.reduce((acc, coeff) =>
            math.plus(math.times(acc, z[i][j]), coeff), { re: 0, im: 0 });
        }
      }
      return result;
    } else {
      return p.reduce((acc, coeff) => math.plus(math.times(acc, z), coeff), { re: 0, im: 0 });
    }
  }
};

// --- Visualization Functions ---
function plot(points, color, canvasId, highlightPoint = null) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Calculate bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(row => {
    row.forEach(p => {
      if (p.re < minX) minX = p.re;
      if (p.re > maxX) maxX = p.re;
      if (p.im < minY) minY = p.im;
      if (p.im > maxY) maxY = p.im;
    });
  });

  if (highlightPoint) {
    if (highlightPoint.re < minX) minX = highlightPoint.re;
    if (highlightPoint.re > maxX) maxX = highlightPoint.re;
    if (highlightPoint.im < minY) minY = highlightPoint.im;
    if (highlightPoint.im > maxY) maxY = highlightPoint.im;
  }

  // Add padding
  const pad = 0.1;
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  minX -= rangeX * pad;
  maxX += rangeX * pad;
  minY -= rangeY * pad;
  maxY += rangeY * pad;

  // Calculate scaling factors
  const scaleX = width / (maxX - minX);
  const scaleY = height / (maxY - minY);

  // Draw grid lines
  ctx.strokeStyle = color + '80'; // Semi-transparent
  ctx.lineWidth = 1;
  
  // Horizontal lines
  for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    for (let j = 0; j < points[i].length; j++) {
      const p = points[i][j];
      const x = (p.re - minX) * scaleX;
      const y = height - (p.im - minY) * scaleY;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  // Vertical lines
  for (let j = 0; j < points[0].length; j++) {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i][j];
      const x = (p.re - minX) * scaleX;
      const y = height - (p.im - minY) * scaleY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Draw points
  ctx.fillStyle = color;
  points.forEach(row => {
    row.forEach(p => {
      const x = (p.re - minX) * scaleX;
      const y = height - (p.im - minY) * scaleY;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Draw highlight point if provided
  if (highlightPoint) {
    const x = (highlightPoint.re - minX) * scaleX;
    const y = height - (highlightPoint.im - minY) * scaleY;
    
    // Glow effect
    const gradient = ctx.createRadialGradient(x, y, 5, x, y, 15);
    gradient.addColorStop(0, '#9b59b6');
    gradient.addColorStop(1, 'rgba(155, 89, 182, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Main point
    ctx.fillStyle = '#9b59b6';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw axes
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  
  // X-axis
  if (minY <= 0 && maxY >= 0) {
    const yZero = height - (0 - minY) * scaleY;
    ctx.beginPath();
    ctx.moveTo(0, yZero);
    ctx.lineTo(width, yZero);
    ctx.stroke();
  }
  
  // Y-axis
  if (minX <= 0 && maxX >= 0) {
    const xZero = (0 - minX) * scaleX;
    ctx.beginPath();
    ctx.moveTo(xZero, 0);
    ctx.lineTo(xZero, height);
    ctx.stroke();
  }
}

// --- Riemann Mapping Calculation ---
function calculateRiemannMapping(originalZ, zeta) {
  const size = 10;
  const f = math.transpose(math.zeros(size, size).map((r, i) => {
    r[i] = 1;
    return r;
  }));

  const g = gramschmidt(f, originalZ, originalZ.length * originalZ[0].length);
  const [K, Kzz] = makekernel(g, zeta);
  const phi = makephi(K, Kzz, zeta);
  const mappedZ = math.polyval(phi, originalZ);
  
  return {
    mappedZ,
    highlightPoint: math.polyval(phi, zeta)
  };
}

function gramschmidt(V, z, N) {
  const [rows, cols] = [V.length, V[0].length];
  const U = math.zeros(rows, cols).map(row => row.map(() => ({ re: 0, im: 0 })));
  const Vc = V.map(row => row.map(v => ({ re: v, im: 0 })));

  const v0 = Vc.map(row => row[0]);
  const norm = Math.sqrt(innerproduct(v0, v0, z, N).re);
  U.forEach((row, i) => row[0] = math.divide(v0[i], { re: norm, im: 0 }));

  for (let i = 1; i < cols; i++) {
    let u = Vc.map(row => row[i]);
    for (let j = 0; j < i; j++) {
      const uj = U.map(row => row[j]);
      const ip = innerproduct(uj, u, z, N);
      u = u.map((val, k) => math.minus(val, math.times(ip, uj[k])));
    }
    const norm = Math.sqrt(innerproduct(u, u, z, N).re);
    if (norm > 0) {
      U.forEach((row, k) => row[i] = math.divide(u[k], { re: norm, im: 0 }));
    }
  }

  return U;
}

function innerproduct(p, q, z, N) {
  const pVal = math.polyval(p, z);
  const qVal = math.polyval(q, z);
  let sum = { re: 0, im: 0 };

  for (let i = 0; i < pVal.length; i++) {
    for (let j = 0; j < pVal[0].length; j++) {
      sum = math.plus(sum, math.times(pVal[i][j], math.conj(qVal[i][j])));
    }
  }
  return math.divide(sum, { re: N, im: 0 });
}

function makekernel(g, zeta) {
  const rows = g.length, k = g[0].length;
  let K = Array(rows).fill().map(() => ({ re: 0, im: 0 }));
  let Kzz = { re: 0, im: 0 };

  for (let i = 0; i < k; i++) {
    const gi = g.map(row => row[i]);
    const val = math.polyval(gi, zeta);
    for (let j = 0; j < rows; j++) {
      K[j] = math.plus(K[j], math.times(g[j][i], math.conj(val)));
    }
    Kzz = math.plus(Kzz, math.times(val, math.conj(val)));
  }
  return [K, Kzz, zeta];
}

function makephi(K, Kzz, zeta) {
  const scale = math.sqrt(math.divide({ re: Math.PI, im: 0 }, Kzz));
  const dphi = K.map(v => math.times(scale, v));
  const phi = dphi.map((c, i) => math.divide(c, { re: K.length - i, im: 0 }));
  const last = phi[phi.length - 1];
  const normalized = phi.map(c => math.divide(c, last));
  normalized.push(math.times(zeta, { re: -1, im: 0 }));
  return normalized;
}

// --- Animation Functions ---
function animateTransformation(originalZ, mappedZ, duration, updateCallback, completionCallback) {
  const startTime = performance.now();
  const interpolated = originalZ.map(row => row.map(() => ({ re: 0, im: 0 })));
  
  function frame(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Interpolate between original and mapped points
    for (let i = 0; i < originalZ.length; i++) {
      for (let j = 0; j < originalZ[i].length; j++) {
        interpolated[i][j] = {
          re: originalZ[i][j].re + (mappedZ[i][j].re - originalZ[i][j].re) * progress,
          im: originalZ[i][j].im + (mappedZ[i][j].im - originalZ[i][j].im) * progress
        };
      }
    }
    
    updateCallback(interpolated, progress);
    
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else if (completionCallback) {
      completionCallback();
    }
  }
  
  requestAnimationFrame(frame);
}

// --- Main Application ---
document.addEventListener('DOMContentLoaded', () => {
  let N = 20; 
  let zeta = math.complex(2, 2); 
  let originalZ = []; 
  let mappedZ = []; 
  let isAnimating = false;

  // Initialize the visualization
  function initialize() {
    // Create original grid
    const t = Array.from({ length: N }, (_, i) => 1 + 2 * (i / (N - 1))); 
    originalZ = t.map(y => t.map(x => math.complex(x, y)));
    
    const result = calculateRiemannMapping(originalZ, zeta);
    mappedZ = result.mappedZ;
    
 
    plot(originalZ, '#e74c3c', 'originalCanvas');
    plot(mappedZ, '#4285f4', 'mappedCanvas', result.highlightPoint);
  }

  // Update the visualization when parameters change
  function updateVisualization() {
    if (isAnimating) return;
    
    const result = calculateRiemannMapping(originalZ, zeta);
    mappedZ = result.mappedZ;
    plot(mappedZ, '#4285f4', 'mappedCanvas', result.highlightPoint);
  }

  // Set up event listeners for controls
  document.getElementById('realPart').addEventListener('input', function() {
    zeta.re = parseFloat(this.value);
    document.getElementById('realValue').textContent = zeta.re.toFixed(1);
    updateVisualization();
  });

  document.getElementById('imagPart').addEventListener('input', function() {
    zeta.im = parseFloat(this.value);
    document.getElementById('imagValue').textContent = zeta.im.toFixed(1);
    updateVisualization();
  });

  document.getElementById('gridSize').addEventListener('input', function() {
    N = parseInt(this.value);
    document.getElementById('gridSizeValue').textContent = N;
    
    // Regenerate grid
    const t = Array.from({ length: N }, (_, i) => 1 + 2 * (i / (N - 1)));
    originalZ = t.map(y => t.map(x => math.complex(x, y)));
    
    updateVisualization();
  });

  document.getElementById('animationSpeed').addEventListener('input', function() {
    document.getElementById('speedValue').textContent = this.value;
  });

  document.getElementById('animateBtn').addEventListener('click', function() {
    if (isAnimating) return;
    
    isAnimating = true;
    this.disabled = true;
    
    const speed = parseInt(document.getElementById('animationSpeed').value);
    const duration = 2000 - (speed * 18); 
    
    animateTransformation(
      originalZ,
      mappedZ,
      duration,
      (interpolated, progress) => {
        const result = calculateRiemannMapping(originalZ, zeta);
        plot(
          interpolated, 
          '#4285f4', 
          'mappedCanvas', 
          progress === 1 ? result.highlightPoint : null
        );
      },
      () => {
        isAnimating = false;
        this.disabled = false;
      }
    );
  });

  // Initialize the application
  initialize();
});

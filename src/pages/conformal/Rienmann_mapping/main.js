
    const size = 400;
    const margin = 0.05;
    const scale = 1 - margin;
    const colorH = "#0077cc", colorV = "#cc3300";
    let maxRadius = 0;
    let imageData = null;

    // Initialize with conformal grid
    drawInitialConformalCells();

    function conformalMapApprox(x, y) {
      const z = math.complex(x, y);
      const z5 = math.pow(z, 5);
      const z9 = math.pow(z, 9);
      const result = math.add(math.add(z, math.multiply(0.0731647, z5)), math.multiply(0.00358709, z9));
      return { x: result.re, y: result.im };
    }

    function toSvgCoords(x, y, size, normalize = 1) {
      return {
        x: size / 2 + x * size / 2 * scale / normalize,
        y: size / 2 - y * size / 2 * scale / normalize
      };
    }

    function generatePath(points) {
      let path = "";
      for (let i = 0; i < points.length; i++) {
        const svgCoords = toSvgCoords(points[i].x, points[i].y, size, maxRadius);
        if (i === 0) {
          path += `M ${svgCoords.x} ${svgCoords.y}`;
        } else {
          path += ` L ${svgCoords.x} ${svgCoords.y}`;
        }
      }
      return path;
    }

    // ✅ Draw square grid cells and their conformal mapped versions
    function drawInitialConformalCells() {
      const squareSvg = d3.select("#square");
      const diskSvg = d3.select("#disk");

      squareSvg.selectAll("*").remove();
      diskSvg.selectAll("*").remove();

      const squareGroup = squareSvg.append("g");
      const diskGroup = diskSvg.append("g");

      const cellCount = 20;
      const step = 2 / cellCount;

      // Compute max radius for normalization
      maxRadius = 0;
      for (let i = 0; i <= cellCount; i++) {
        for (let j = 0; j <= cellCount; j++) {
          const x = -1 + i * step;
          const y = -1 + j * step;
          const mapped = conformalMapApprox(x, y);
          const r = Math.sqrt(mapped.x * mapped.x + mapped.y * mapped.y);
          if (r > maxRadius) maxRadius = r;
        }
      }

      for (let i = 0; i < cellCount; i++) {
        for (let j = 0; j < cellCount; j++) {
          const x0 = -1 + i * step;
          const y0 = -1 + j * step;
          const x1 = x0 + step;
          const y1 = y0 + step;

          const corners = [
            { x: x0, y: y0 },
            { x: x1, y: y0 },
            { x: x1, y: y1 },
            { x: x0, y: y1 }
          ];

          const squarePath = corners.map(p => toSvgCoords(p.x, p.y, size))
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(" ") + " Z";

          squareGroup.append("path")
            .attr("d", squarePath)
            .attr("fill", "none")
            .attr("stroke", "#999")
            .attr("stroke-width", 0.5);

          const mappedCorners = corners.map(p => conformalMapApprox(p.x, p.y));
          const diskPath = mappedCorners.map(p => toSvgCoords(p.x, p.y, size, maxRadius))
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(" ") + " Z";

          diskGroup.append("path")
            .attr("d", diskPath)
            .attr("fill", "none")
            .attr("stroke", "#999")
            .attr("stroke-width", 0.5);
        }
      }
    }

    // Image upload handler
    document.getElementById('imageUpload').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;

        img.onload = function() {
          processImage(img);
        };
      };
      reader.readAsDataURL(file);
    });

    function processImage(img) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const imgSize = Math.min(img.width, img.height);
      canvas.width = imgSize;
      canvas.height = imgSize;

      ctx.drawImage(img,
        (img.width - imgSize) / 2,
        (img.height - imgSize) / 2,
        imgSize, imgSize,
        0, 0, imgSize, imgSize);

      imageData = ctx.getImageData(0, 0, imgSize, imgSize);

      drawOriginalImage();
      drawMappedImage();
    }

    function drawOriginalImage() {
      const squareSvg = d3.select("#square");
      squareSvg.selectAll("*").remove();

      const imgSize = imageData.width;
      const sampleDensity = 2;
      const group = squareSvg.append("g");

      for (let y = 0; y < imgSize; y += sampleDensity) {
        for (let x = 0; x < imgSize; x += sampleDensity) {
          const u = -1 + 2 * x / imgSize;
          const v = 1 - 2 * y / imgSize;

          const pixelIndex = (y * imgSize + x) * 4;
          const r = imageData.data[pixelIndex];
          const g = imageData.data[pixelIndex + 1];
          const b = imageData.data[pixelIndex + 2];
          const a = imageData.data[pixelIndex + 3] / 255;

          const svgCoords = toSvgCoords(u, v, size);

          group.append("rect")
            .attr("x", svgCoords.x - sampleDensity / 2)
            .attr("y", svgCoords.y - sampleDensity / 2)
            .attr("width", sampleDensity)
            .attr("height", sampleDensity)
            .attr("fill", `rgba(${r},${g},${b},${a})`)
            .attr("stroke", "none");
        }
      }
    }

    function drawMappedImage() {
      if (!imageData) return;

      const svg = d3.select("#disk");
      svg.selectAll("*").remove();

      const imgSize = imageData.width;
      const sampleDensity = 2;
      const group = svg.append("g");

      for (let y = 0; y < imgSize; y += sampleDensity) {
        for (let x = 0; x < imgSize; x += sampleDensity) {
          const u = -1 + 2 * x / imgSize;
          const v = 1 - 2 * y / imgSize;

          const mapped = conformalMapApprox(u, v);

          const pixelIndex = (y * imgSize + x) * 4;
          const r = imageData.data[pixelIndex];
          const g = imageData.data[pixelIndex + 1];
          const b = imageData.data[pixelIndex + 2];
          const a = imageData.data[pixelIndex + 3] / 255;

          const svgCoords = toSvgCoords(mapped.x, mapped.y, size, maxRadius);

          group.append("rect")
            .attr("x", svgCoords.x - sampleDensity / 2)
            .attr("y", svgCoords.y - sampleDensity / 2)
            .attr("width", sampleDensity)
            .attr("height", sampleDensity)
            .attr("fill", `rgba(${r},${g},${b},${a})`)
            .attr("stroke", "none");
        }
      }
    }

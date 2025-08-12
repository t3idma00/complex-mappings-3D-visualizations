

    const size = 400;
    const margin = 0.05;
    const scale = 1 - margin;
    let maxRadius = 0;

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

          // Draw square grid cell
          const squarePath = corners.map(p => toSvgCoords(p.x, p.y, size))
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(" ") + " Z";

          squareGroup.append("path")
            .attr("d", squarePath)
            .attr("fill", "none")
            .attr("stroke", "#999")
            .attr("stroke-width", 0.5);

          // Draw mapped cell in disk
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

    // Draw on load
    drawInitialConformalCells();
  
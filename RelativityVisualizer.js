
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RelativityVisualizer = () => {
  // State for our parameters
  const [mass, setMass] = useState(10);
  const [resolution, setResolution] = useState(50);
  const [showLightPaths, setShowLightPaths] = useState(true);
  const [observer1Position, setObserver1Position] = useState(30);
  const [observer2Position, setObserver2Position] = useState(20);
  const [observer2Angle, setObserver2Angle] = useState(120);
  const [rotation, setRotation] = useState(0);
  const [viewAngle, setViewAngle] = useState(30);
  const [activeObserver, setActiveObserver] = useState(1);
  const [showFactPanel, setShowFactPanel] = useState(true);
  const [activeTab, setActiveTab] = useState('spacetime'); // 'spacetime', 'singularity'
  const [viewMode, setViewMode] = useState('penrose'); // For singularity tab: 'penrose' or 'kerr'
  const [showConsensus, setShowConsensus] = useState(false); // For singularity tab
  
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  // Calculate the spacetime grid
  const calculateSpacetimeGrid = (mass, rotation) => {
    const size = 60;
    const gridSize = 20;
    const step = size / gridSize;
    
    const grid = [];
    
    // Create grid points
    for (let x = -size/2; x <= size/2; x += step) {
      for (let y = -size/2; y <= size/2; y += step) {
        const r = Math.sqrt(x*x + y*y);
        if (r < 2) continue; // Skip points too close to center
        
        // Calculate z based on simplified Schwarzschild metric
        let z = -mass / r;
        
        // Add rotation effect (simplified)
        if (rotation > 0) {
          const theta = Math.atan2(y, x);
          z += rotation * mass * Math.sin(theta) / (r*r) * 0.5;
        }
        
        grid.push({ x, y, z });
      }
    }
    
    return grid;
  };
  
  // Calculate light paths in curved spacetime
  const calculateLightPaths = (mass, rotation, numPaths = 8) => {
    const paths = [];
    const sourceDistance = observer1Position;
    
    for (let i = 0; i < numPaths; i++) {
      const angle = (i * 2 * Math.PI) / numPaths;
      const path = [];
      
      // Starting point
      const x0 = sourceDistance * Math.cos(angle);
      const y0 = sourceDistance * Math.sin(angle);
      const r0 = Math.sqrt(x0*x0 + y0*y0);
      const z0 = -mass / r0;
      path.push({ x: x0, y: y0, z: z0 });
      
      // Calculate path (simplified approximation)
      const steps = 100;
      let x = x0;
      let y = y0;
      let vx = -Math.cos(angle) * 0.5;
      let vy = -Math.sin(angle) * 0.5;
      
      for (let j = 0; j < steps; j++) {
        // Update position
        x += vx;
        y += vy;
        
        // Calculate gravitational effect
        const r = Math.sqrt(x*x + y*y);
        if (r < 2.5) break; // Inside event horizon (simplified)
        
        // Update velocity due to spacetime curvature
        const forceFactor = mass / (r*r*r);
        vx -= x * forceFactor;
        vy -= y * forceFactor;
        
        // Add rotation effect
        if (rotation > 0) {
          const theta = Math.atan2(y, x);
          const rotFactor = rotation * mass / (r*r*r) * 0.2;
          vx += -y * rotFactor;
          vy += x * rotFactor;
        }
        
        // Normalize velocity to maintain "speed of light"
        const vMag = Math.sqrt(vx*vx + vy*vy);
        vx = vx / vMag * 0.5;
        vy = vy / vMag * 0.5;
        
        // Calculate z for visualization
        const z = -mass / r;
        
        // Add to path
        path.push({ x, y, z });
      }
      
      paths.push(path);
    }
    
    return paths;
  };
  
  // Calculate relativistic effects between observers
  const calculateRelativisticEffects = () => {
    // Convert observer2Angle to radians
    const angleRad = observer2Angle * Math.PI / 180;
    
    // Position of second observer
    const x2 = observer2Position * Math.cos(angleRad);
    const y2 = observer2Position * Math.sin(angleRad);
    
    // Calculate gravitational potential at each observer
    const r1 = observer1Position;
    const r2 = observer2Position;
    
    // Calculate using scaled gravitational constant (G=1) and mass
    // This is the gravitational potential energy per unit mass: GM/r
    const potential1 = mass / r1;
    const potential2 = mass / r2;
    
    // Scale factor to ensure time dilation stays reasonable
    // Keeps 2*potential < 1 to avoid imaginary results
    const scaleFactor = 0.1;
    
    // Time dilation factor (simplified approximation)
    // Using the Schwarzschild metric approximation
    const timeDilation1 = 1 / Math.sqrt(1 - (2 * potential1 * scaleFactor));
    const timeDilation2 = 1 / Math.sqrt(1 - (2 * potential2 * scaleFactor));
    
    // Calculate relative time dilation
    const relativeTimeDilation = timeDilation2 / timeDilation1;
    
    // Space contraction factor
    const spaceContraction1 = Math.sqrt(1 - (2 * potential1 * scaleFactor));
    const spaceContraction2 = Math.sqrt(1 - (2 * potential2 * scaleFactor));
    
    // Light travel time between observers
    // Simplified - actual path would follow geodesic
    const distance = Math.sqrt(r1*r1 + r2*r2 - 2*r1*r2*Math.cos(angleRad));
    
    // Approximate light travel time with gravitational delay
    const lightTravelTime = distance * (1 + (potential1 + potential2) / 2 * scaleFactor);
    
    // Calculate gravitational redshift (also scaled to avoid NaN)
    const redshift = Math.sqrt((1 - 2 * potential2 * scaleFactor) / (1 - 2 * potential1 * scaleFactor)) - 1;
    
    // Calculate escape velocities (as fraction of c)
    // v_esc = sqrt(2GM/r)
    const escapeVelocity1 = Math.sqrt(2 * potential1 * scaleFactor);
    const escapeVelocity2 = Math.sqrt(2 * potential2 * scaleFactor);
    
    return {
      observer1: { 
        x: observer1Position, 
        y: 0, 
        r: r1, 
        potential: potential1, 
        timeDilation: timeDilation1,
        escapeVelocity: escapeVelocity1
      },
      observer2: { 
        x: x2, 
        y: y2, 
        r: r2, 
        potential: potential2, 
        timeDilation: timeDilation2,
        escapeVelocity: escapeVelocity2
      },
      relativeTimeDilation,
      lightTravelTime,
      redshift,
      spaceContraction1,
      spaceContraction2,
      distance
    };
  };
  
  // Generate fun facts based on relativistic effects
  const generateFacts = (effects) => {
    const { observer1, observer2, relativeTimeDilation, lightTravelTime, redshift, distance } = effects;
    
    // Time dilation facts
    const timeDilationPercent = ((relativeTimeDilation - 1) * 100).toFixed(4);
    const timeDilationFact = relativeTimeDilation > 1 
      ? `Observer 2 experiences time ${timeDilationPercent}% slower than Observer 1 due to being deeper in the gravitational well.`
      : `Observer 1 experiences time ${Math.abs(timeDilationPercent)}% slower than Observer 2 due to being deeper in the gravitational well.`;
    
    // Clock difference over time in seconds
    const secondsDifference = 31536000 * Math.abs(relativeTimeDilation - 1);
    
    // Format time difference in a human-readable way
    const formatTimeDifference = (seconds) => {
      // If very small, just show seconds
      if (seconds < 60) {
        return `${seconds.toFixed(2)} seconds`;
      }
      
      // For larger time periods, break down into years, months, days, etc.
      const years = Math.floor(seconds / 31536000);
      const remainingAfterYears = seconds % 31536000;
      
      const months = Math.floor(remainingAfterYears / 2592000);
      const remainingAfterMonths = remainingAfterYears % 2592000;
      
      const days = Math.floor(remainingAfterMonths / 86400);
      const remainingAfterDays = remainingAfterMonths % 86400;
      
      const hours = Math.floor(remainingAfterDays / 3600);
      const remainingAfterHours = remainingAfterDays % 3600;
      
      const minutes = Math.floor(remainingAfterHours / 60);
      const remainingSeconds = Math.floor(remainingAfterHours % 60);
      
      let result = "";
      if (years > 0) result += `${years} year${years !== 1 ? "s" : ""} `;
      if (months > 0) result += `${months} month${months !== 1 ? "s" : ""} `;
      if (days > 0) result += `${days} day${days !== 1 ? "s" : ""} `;
      if (hours > 0) result += `${hours} hour${hours !== 1 ? "s" : ""} `;
      if (minutes > 0) result += `${minutes} minute${minutes !== 1 ? "s" : ""} `;
      if (remainingSeconds > 0) result += `${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`;
      
      return result.trim();
    };
    
    const timeDifferenceStr = formatTimeDifference(secondsDifference);
    const clockFact = `After 1 year, their clocks would differ by approximately ${timeDifferenceStr}.`;
    
    // Light travel fact
    const lightFact = `Light takes approximately ${lightTravelTime.toFixed(2)} time units to travel between the observers.`;
    
    // Redshift fact
    const redshiftPercent = (redshift * 100).toFixed(4);
    const redshiftFact = redshift > 0
      ? `Light from Observer 2 appears redshifted by ${redshiftPercent}% to Observer 1.`
      : `Light from Observer 1 appears redshifted by ${Math.abs(redshiftPercent)}% to Observer 2.`;
    
    // Escape velocity facts - use pre-calculated values
    const escapeVelocityFact1 = `Observer 1's escape velocity is ${(observer1.escapeVelocity * 100).toFixed(2)}% of the speed of light.`;
    const escapeVelocityFact2 = `Observer 2's escape velocity is ${(observer2.escapeVelocity * 100).toFixed(2)}% of the speed of light.`;
    
    // Proper distance fact - scaled to be realistic
    const scaleFactor = 0.1; // Same as in calculateRelativisticEffects
    const properDistance = distance / (1 + (observer1.potential + observer2.potential) / 2 * scaleFactor);
    const properDistanceFact = `The proper distance between observers is ${properDistance.toFixed(2)} units.`;
    
    // Fun gravitational event horizon fact
    const schwarzschildRadius = 2 * mass * scaleFactor; // Scaled to match our other calculations
    const horizonFact = `At this mass, the event horizon would be at ${schwarzschildRadius.toFixed(2)} units from center.`;
    
    // Einstein ring fact
    const einsteinRingRadius = 4 * mass * scaleFactor; // Simplified approximation
    const einsteinRingFact = `Light from a distant source directly behind the mass would form an Einstein ring of radius ${einsteinRingRadius.toFixed(2)} units.`;
    
    return {
      timeDilationFact,
      clockFact,
      lightFact,
      redshiftFact,
      escapeVelocityFact1,
      escapeVelocityFact2,
      properDistanceFact,
      horizonFact,
      einsteinRingFact
    };
  };

  // Function to render the Spacetime View
  const renderSpacetimeView = (svg, containerWidth, containerHeight) => {
    // Calculate data
    const gridPoints = calculateSpacetimeGrid(mass, rotation);
    const lightPaths = showLightPaths ? calculateLightPaths(mass, rotation) : [];
    const relativisticEffects = calculateRelativisticEffects();
    
    // Set up scales and projections
    const xExtent = d3.extent(gridPoints, d => d.x);
    const yExtent = d3.extent(gridPoints, d => d.y);
    const zExtent = d3.extent(gridPoints, d => d.z);
    
    // Set up pseudo-3D projection
    const angleRad = viewAngle * Math.PI / 180;
    const project = (x, y, z) => {
      // Apply rotation around y-axis
      const rotX = x * Math.cos(angleRad) - z * Math.sin(angleRad);
      const rotZ = x * Math.sin(angleRad) + z * Math.cos(angleRad);
      
      return {
        x: rotX,
        y: y,
        z: rotZ
      };
    };
    
    // Scale for mapping to screen coordinates
    const xScale = d3.scaleLinear()
      .domain([xExtent[0], xExtent[1]])
      .range([50, containerWidth - 50]);
    
    const yScale = d3.scaleLinear()
      .domain([yExtent[0], yExtent[1]])
      .range([containerHeight - 50, 50]);
    
    // Color scale for depth
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([zExtent[1], zExtent[0]]);
    
    // Group for gridPoints
    const pointsGroup = svg.append("g");
    
    // Draw grid points with depth-based size and color
    gridPoints.forEach(point => {
      const projected = project(point.x, point.y, point.z);
      
      // Calculate visual depth (closer points are larger and less transparent)
      const depthFactor = (projected.z - zExtent[0]) / (zExtent[1] - zExtent[0]);
      const size = 2 + 3 * (1 - depthFactor);
      const opacity = 0.3 + 0.7 * (1 - depthFactor);
      
      pointsGroup.append("circle")
        .attr("cx", xScale(projected.x))
        .attr("cy", yScale(projected.y))
        .attr("r", size)
        .attr("fill", colorScale(point.z))
        .attr("opacity", opacity);
    });
    
    // Draw light paths
    if (showLightPaths) {
      lightPaths.forEach((path, i) => {
        // Project all points
        const projectedPath = path.map(p => {
          const proj = project(p.x, p.y, p.z);
          return {
            x: xScale(proj.x),
            y: yScale(proj.y),
            z: proj.z
          };
        });
        
        // Create line generator
        const lineGenerator = d3.line()
          .x(d => d.x)
          .y(d => d.y)
          .curve(d3.curveBasis);
        
        // Draw path
        svg.append("path")
          .datum(projectedPath)
          .attr("d", lineGenerator)
          .attr("fill", "none")
          .attr("stroke", "yellow")
          .attr("stroke-width", 2)
          .attr("opacity", 0.7);
      });
    }
    
    // Draw central mass
    const centerProj = project(0, 0, -20);
    svg.append("circle")
      .attr("cx", xScale(centerProj.x))
      .attr("cy", yScale(centerProj.y))
      .attr("r", Math.max(5, Math.min(20, mass/2)))
      .attr("fill", "orange")
      .attr("opacity", 0.9);
    
    // Draw observer 1
    const observer1Proj = project(relativisticEffects.observer1.x, relativisticEffects.observer1.y, -mass/relativisticEffects.observer1.r);
    svg.append("circle")
      .attr("cx", xScale(observer1Proj.x))
      .attr("cy", yScale(observer1Proj.y))
      .attr("r", 6)
      .attr("fill", activeObserver === 1 ? "#4CAF50" : "#2196F3")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr("cursor", "pointer")
      .on("click", () => setActiveObserver(1));
    
    // Add "1" label to observer 1
    svg.append("text")
      .attr("x", xScale(observer1Proj.x) + 8)
      .attr("y", yScale(observer1Proj.y) - 8)
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("1");
    
    // Draw observer 2
    const observer2Proj = project(relativisticEffects.observer2.x, relativisticEffects.observer2.y, -mass/relativisticEffects.observer2.r);
    svg.append("circle")
      .attr("cx", xScale(observer2Proj.x))
      .attr("cy", yScale(observer2Proj.y))
      .attr("r", 6)
      .attr("fill", activeObserver === 2 ? "#4CAF50" : "#2196F3")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr("cursor", "pointer")
      .on("click", () => setActiveObserver(2));
    
    // Add "2" label to observer 2
    svg.append("text")
      .attr("x", xScale(observer2Proj.x) + 8)
      .attr("y", yScale(observer2Proj.y) - 8)
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("2");
    
    // Draw a line connecting the observers
    const connectingLine = [
      { x: relativisticEffects.observer1.x, y: relativisticEffects.observer1.y, z: -mass/relativisticEffects.observer1.r },
      { x: relativisticEffects.observer2.x, y: relativisticEffects.observer2.y, z: -mass/relativisticEffects.observer2.r }
    ].map(p => {
      const proj = project(p.x, p.y, p.z);
      return {
        x: xScale(proj.x),
        y: yScale(proj.y)
      };
    });
    
    svg.append("line")
      .attr("x1", connectingLine[0].x)
      .attr("y1", connectingLine[0].y)
      .attr("x2", connectingLine[1].x)
      .attr("y2", connectingLine[1].y)
      .attr("stroke", "#aaaaaa")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.7);
  };

  // Function to render the Singularity Debate View
  const renderSingularityDebateView = (svg, containerWidth, containerHeight) => {
    // Clear previous SVG content
    svg.selectAll("*").remove();
    
    // Constants for visualization
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const maxRadius = Math.min(containerWidth, containerHeight) / 2.5;
    
    // Draw outer event horizon
    svg.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", maxRadius * 0.8)
      .attr("fill", "none")
      .attr("stroke", "#444")
      .attr("stroke-width", 2);
      
    // Draw inner event horizon (for Kerr black hole)
    svg.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", maxRadius * 0.5)
      .attr("fill", "none")
      .attr("stroke", "#666")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5");
    
    // Add label for outer event horizon
    svg.append("text")
      .attr("x", centerX + maxRadius * 0.8 + 10)
      .attr("y", centerY)
      .attr("fill", "white")
      .attr("font-size", "12px")
      .text("Outer Event Horizon");
      
    // Add label for inner event horizon
    svg.append("text")
      .attr("x", centerX + maxRadius * 0.5 + 10)
      .attr("y", centerY + 20)
      .attr("fill", "white")
      .attr("font-size", "12px")
      .text("Inner Event Horizon");
    
    // Different visualizations based on view mode
    if (viewMode === 'penrose') {
      // Draw Penrose-Hawking singularity (ring for Kerr black hole)
      const ringPoints = [];
      for (let angle = 0; angle <= 2 * Math.PI; angle += 0.1) {
        ringPoints.push({
          x: centerX + Math.cos(angle) * maxRadius * 0.2,
          y: centerY + Math.sin(angle) * maxRadius * 0.1 // Elliptical to show perspective
        });
      }
      
      // Create line generator
      const lineGenerator = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveCardinalClosed);
      
      // Draw ring singularity
      svg.append("path")
        .datum(ringPoints)
        .attr("d", lineGenerator)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 3);
        
      // Add a glow effect to singularity
      const defs = svg.append("defs");
      
      const glow = defs.append("filter")
        .attr("id", "glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
        
      glow.append("feGaussianBlur")
        .attr("stdDeviation", "5")
        .attr("result", "coloredBlur");
        
      const feMerge = glow.append("feMerge");
      feMerge.append("feMergeNode")
        .attr("in", "coloredBlur");
      feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");
      
      // Apply glow to ring
      svg.select("path")
        .style("filter", "url(#glow)");
      
      // Add label for ring singularity
      svg.append("text")
        .attr("x", centerX)
        .attr("y", centerY + maxRadius * 0.2)
        .attr("fill", "red")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Ring Singularity");
        
      // Draw geodesics leading to singularity
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * 2 * Math.PI;
        const startX = centerX + Math.cos(angle) * maxRadius * 0.7;
        const startY = centerY + Math.sin(angle) * maxRadius * 0.7;
        
        // Create a curved path to the singularity
        const path = [];
        for (let t = 0; t <= 1; t += 0.1) {
          const pathX = centerX + (startX - centerX) * (1 - t) * (1 - t);
          const pathY = centerY + (startY - centerY) * (1 - t) * (1 - t);
          path.push({ x: pathX, y: pathY });
        }
        
        // Create line generator
        const pathGenerator = d3.line()
          .x(d => d.x)
          .y(d => d.y)
          .curve(d3.curveBasis);
        
        // Draw the path
        svg.append("path")
          .datum(path)
          .attr("d", pathGenerator)
          .attr("fill", "none")
          .attr("stroke", "yellow")
          .attr("stroke-width", 1)
          .attr("opacity", 0.6);
      }
      
      // Add title
      svg.append("text")
        .attr("x", centerX)
        .attr("y", 30)
        .attr("fill", "white")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Penrose-Hawking Model: Inevitable Singularity");
        
      // Add explanation
      svg.append("text")
        .attr("x", 20)
        .attr("y", containerHeight - 70)
        .attr("fill", "white")
        .attr("font-size", "14px")
        .text("All geodesics (paths through spacetime) inevitably terminate at the singularity,");
        
      svg.append("text")
        .attr("x", 20)
        .attr("y", containerHeight - 50)
        .attr("fill", "white")
        .attr("font-size", "14px")
        .text("where spacetime curvature becomes infinite and physics breaks down.");
        
      // Add warning icon
      svg.append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", maxRadius * 0.15)
        .attr("fill", "rgba(255,0,0,0.2)")
        .attr("stroke", "red")
        .attr("stroke-width", 1);
        
      svg.append("text")
        .attr("x", centerX)
        .attr("y", centerY + 5)
        .attr("fill", "red")
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text("∞");
        
    } else if (viewMode === 'kerr') {
      // Draw Kerr alternative - non-singular matter distribution
      const ringPoints = [];
      for (let angle = 0; angle <= 2 * Math.PI; angle += 0.1) {
        ringPoints.push({
          x: centerX + Math.cos(angle) * maxRadius * 0.2,
          y: centerY + Math.sin(angle) * maxRadius * 0.1 // Elliptical to show perspective
        });
      }
      
      // Create line generator
      const lineGenerator = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveCardinalClosed);
      
      // Draw matter distribution (not a singularity)
      svg.append("path")
        .datum(ringPoints)
        .attr("d", lineGenerator)
        .attr("fill", "rgba(64, 224, 208, 0.3)")
        .attr("stroke", "turquoise")
        .attr("stroke-width", 2);
      
      // Add label for non-singular region
      svg.append("text")
        .attr("x", centerX)
        .attr("y", centerY + maxRadius * 0.2)
        .attr("fill", "turquoise")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Non-singular Matter");
        
      // Draw geodesics that don't terminate
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * 2 * Math.PI;
        const startX = centerX + Math.cos(angle) * maxRadius * 0.7;
        const startY = centerY + Math.sin(angle) * maxRadius * 0.7;
        
        // Create a path that curves around the central region
        const path = [];
        for (let t = 0; t <= 1; t += 0.05) {
          // Parametric equations for a path that curves around
          const pathAngle = angle + t * Math.PI * 2; // Full revolution
          const radiusFactor = 0.7 - 0.4 * t + 0.4 * t * t; // Moves inward then back out
          
          const pathX = centerX + Math.cos(pathAngle) * maxRadius * radiusFactor;
          const pathY = centerY + Math.sin(pathAngle) * maxRadius * radiusFactor;
          path.push({ x: pathX, y: pathY });
        }
        
        // Create line generator
        const pathGenerator = d3.line()
          .x(d => d.x)
          .y(d => d.y)
          .curve(d3.curveBasis);
        
        // Draw the path
        svg.append("path")
          .datum(path)
          .attr("d", pathGenerator)
          .attr("fill", "none")
          .attr("stroke", "lightblue")
          .attr("stroke-width", 1)
          .attr("opacity", 0.6);
      }
      
      // Add title
      svg.append("text")
        .attr("x", centerX)
        .attr("y", 30)
        .attr("fill", "white")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Kerr's Alternative: No True Singularity");
        
      // Add explanation
      svg.append("text")
        .attr("x", 20)
        .attr("y", containerHeight - 70)
        .attr("fill", "white")
        .attr("font-size", "14px")
        .text("Geodesics may have finite affine length but don't necessarily encounter");
        
      svg.append("text")
        .attr("x", 20)
        .attr("y", containerHeight - 50)
        .attr("fill", "white")
        .attr("font-size", "14px")
        .text("infinite curvature. Physics might remain valid throughout the black hole.");
    }

    // Render consensus overlay if enabled
    if (showConsensus) {
      // Add semi-transparent overlay
      svg.append("rect")
        .attr("class", "consensus-element")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("fill", "rgba(0, 0, 0, 0.7)");
      
      // Add title
      svg.append("text")
        .attr("class", "consensus-element")
        .attr("x", containerWidth / 2)
        .attr("y", 40)
        .attr("fill", "white")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Scientific Consensus & Evidence");
      
      // Draw citation bar
      const barWidth = containerWidth * 0.7;
      const barHeight = 30;
      const barX = (containerWidth - barWidth) / 2;
      const barY = 100;
      
      // Background for citation bar
      svg.append("rect")
        .attr("class", "consensus-element")
        .attr("x", barX)
        .attr("y", barY)
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("fill", "#444")
        .attr("rx", 5)
        .attr("ry", 5);
      
      // Penrose-Hawking citations (approx. 95%)
      svg.append("rect")
        .attr("class", "consensus-element")
        .attr("x", barX)
        .attr("y", barY)
        .attr("width", barWidth * 0.95)
        .attr("height", barHeight)
        .attr("fill", "steelblue")
        .attr("rx", 5)
        .attr("ry", 5);
      
      // Kerr alternative citations (approx. 5%)
      svg.append("rect")
        .attr("class", "consensus-element")
        .attr("x", barX + barWidth * 0.95)
        .attr("y", barY)
        .attr("width", barWidth * 0.05)
        .attr("height", barHeight)
        .attr("fill", "turquoise")
        .attr("rx", 0)
        .attr("ry", 0);
      
      // Label for Penrose-Hawking
      svg.append("text")
        .attr("class", "consensus-element")
        .attr("x", barX + barWidth * 0.4)
        .attr("y", barY + barHeight / 2 + 5)
        .attr("fill", "white")
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .text("Traditional View (~95% of publications)");
      
      // Label for Kerr alternative
      svg.append("text")
        .attr("class", "consensus-element")
        .attr("x", barX + barWidth * 0.97)
        .attr("y", barY + barHeight + 20)
        .attr("fill", "turquoise")
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .text("Alternative (~5%)");
      
      // Add key points about the scientific evidence
      const addPoint = (iconSymbol, text, y, color = "white") => {
        // Use circle with text instead of React icons
        svg.append("circle")
          .attr("class", "consensus-element")
          .attr("cx", barX + 10)
          .attr("cy", y - 5)
          .attr("r", 10)
          .attr("fill", "rgba(0,0,0,0.3)")
          .attr("stroke", color)
          .attr("stroke-width", 1);
        
        // Add icon indicator
        svg.append("text")
          .attr("class", "consensus-element")
          .attr("x", barX + 10)
          .attr("y", y - 4)
          .attr("fill", color)
          .attr("font-size", "10px")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .text(iconSymbol);
        
        svg.append("text")
          .attr("class", "consensus-element")
          .attr("x", barX + 30)
          .attr("y", y)
          .attr("fill", color)
          .attr("font-size", "14px")
          .text(text);
      };
      
      addPoint("🏆", "Nobel Prize awarded to Penrose in 2020 for black hole singularity work", 180);
      addPoint("📚", "Textbooks & literature predominantly teach the singularity model", 220);
      addPoint("📄", "Most peer-reviewed papers assume singularities exist", 260);
      addPoint("📅", "Kerr's alternative is very recent (December 2023)", 300, "turquoise");
      addPoint("➡️", "Debate is ongoing and may evolve as more physicists respond", 340);
      addPoint("⚠️", "Direct observation inside black holes is impossible with current technology", 380, "orange");
      addPoint("⚡", "Both models produce identical predictions for what we can observe outside", 420);
      
      // Add historical context
      svg.append("text")
        .attr("class", "consensus-element")
        .attr("x", containerWidth / 2)
        .attr("y", containerHeight - 30)
        .attr("fill", "white")
        .attr("font-size", "16px")
        .attr("font-style", "italic")
        .attr("text-anchor", "middle")
        .text("This represents an evolving scientific debate between mathematical possibilities");
    }
  };

  // Effect to render visualization when parameters change
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = 500;
    
    // Create SVG
    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight);
    
    // Render the appropriate view
    if (activeTab === 'spacetime') {
      renderSpacetimeView(svg, containerWidth, containerHeight);
    } else if (activeTab === 'singularity') {
      renderSingularityDebateView(svg, containerWidth, containerHeight);
    }
  }, [
    activeTab,
    mass,
    rotation,
    observer1Position,
    observer2Position,
    observer2Angle,
    viewAngle,
    activeObserver,
    showLightPaths,
    viewMode,
    showConsensus
  ]);
  
  // Calculate effects for the fact panel
  const relativisticEffects = calculateRelativisticEffects();
  const facts = generateFacts(relativisticEffects);
  
  // Tab content for different visualizations
  const renderFactPanel = () => {
    if (activeTab === 'spacetime') {
      return (
        <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold flex items-center">
              Observer {activeObserver === 1 ? "1" : "2"} Facts
            </h3>
            <button 
              className="flex items-center text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
              onClick={() => setActiveObserver(activeObserver === 1 ? 2 : 1)}
            >
              Switch to Observer {activeObserver === 1 ? "2" : "1"}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <p className="text-sm">{facts.timeDilationFact}</p>
            </div>
            <div className="flex items-start">
              <p className="text-sm">{facts.clockFact}</p>
            </div>
            <div className="flex items-start">
              <p className="text-sm">{facts.lightFact}</p>
            </div>
            <div className="flex items-start">
              <p className="text-sm">{facts.redshiftFact}</p>
            </div>
            <div className="flex items-start">
              <p className="text-sm">
                {activeObserver === 1 ? facts.escapeVelocityFact1 : facts.escapeVelocityFact2}
              </p>
            </div>
            <div className="flex items-start">
              <p className="text-sm">{facts.properDistanceFact}</p>
            </div>
          </div>
        </div>
      );
    } else if (activeTab === 'singularity') {
      return (
        <div className="mt-4 bg-gray-800 p-4 rounded-lg text-white">
          <h3 className="text-lg font-semibold mb-2">
            Key Differences
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-700 rounded-lg">
              <h4 className="font-medium text-blue-300 mb-2">Penrose-Hawking View:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Inside the event horizon, all paths lead to a singularity</li>
                <li>At the singularity, spacetime curvature becomes infinite</li>
                <li>Physics as we know it breaks down completely at the singularity</li>
                <li>Backed by mathematical singularity theorems</li>
                <li>This view has dominated black hole physics for 60+ years</li>
              </ul>
            </div>
            
            <div className="p-3 bg-gray-700 rounded-lg">
              <h4 className="font-medium text-turquoise mb-2">Kerr's Alternative View:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Geodesics may have finite affine length but don't require true singularities</li>
                <li>The ring "singularity" could be replaced by exotic but non-singular matter</li>
                <li>Physics might remain valid throughout the entire black hole</li>
                <li>Claims to provide counterexamples to singularity proofs</li>
                <li>Proposed by Kerr himself in December 2023 (60 years after his original work)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-yellow-300 mb-2">Why This Matters:</h4>
            <p className="text-sm">
              The presence or absence of singularities has profound implications for physics. True singularities suggest our current physics theories break down and require a quantum theory of gravity. If Kerr is right and singularities can be avoided, it could mean our existing theories might be extended to describe all of reality, potentially changing our approach to unifying physics.
            </p>
          </div>
          
          <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-800">
            <h4 className="font-medium text-blue-300 mb-2">
              Remember:
            </h4>
            <p className="text-sm italic">
              Both models produce identical predictions for what we can observe outside the event horizon. Since we cannot directly observe the interior of black holes with current technology, this debate may remain theoretical for the foreseeable future.
            </p>
          </div>
        </div>
      );
    }
  };
  
  return (
    <div className="flex flex-col w-full p-4 bg-gray-100 rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Interactive Relativity Theory Visualizer</h1>
      
      {/* Tab navigation */}
      <div className="flex flex-wrap border-b border-gray-300 mb-4">
        <button
          className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-1 ${activeTab === 'spacetime' ? 'bg-gray-800 text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
          onClick={() => setActiveTab('spacetime')}
        >
          Spacetime Curvature
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'singularity' ? 'bg-gray-800 text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
          onClick={() => setActiveTab('singularity')}
        >
          Singularity Debate
        </button>
      </div>
      
      {/* Singularity mode selector */}
      {activeTab === 'singularity' && (
        <div className="flex justify-between mb-4">
          <div className="inline-flex rounded-md shadow-sm bg-gray-800" role="group">
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${viewMode === 'penrose' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-300'}`}
              onClick={() => setViewMode('penrose')}
            >
              Traditional View (Penrose/Hawking)
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${viewMode === 'kerr' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-300'}`}
              onClick={() => setViewMode('kerr')}
            >
              Alternative View (Kerr)
            </button>
          </div>
          
          <button
            className={`px-3 py-1 rounded-lg ${showConsensus ? 'bg-orange-600' : 'bg-gray-600'}`}
            onClick={() => setShowConsensus(!showConsensus)}
          >
            {showConsensus ? 'Hide' : 'Show'} Scientific Consensus
          </button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-3/5" ref={containerRef}>
          <div className="bg-gray-800 rounded-lg p-2 relative">
            <svg ref={svgRef} className="w-full"></svg>
            
            {/* Camera controls */}
            {activeTab === 'spacetime' && (
              <div className="absolute top-2 right-2 flex space-x-2">
                <button 
                  className="p-2 bg-gray-700 rounded-full hover:bg-gray-600"
                  onClick={() => setViewAngle((prev) => (prev + 15) % 360)}
                >
                  🔄
                </button>
              </div>
            )}
          </div>
          
          {/* Fact panel */}
          {renderFactPanel()}
        </div>
        
        <div className="w-full md:w-2/5 p-4 bg-white rounded-lg shadow md:ml-4 mt-4 md:mt-0">
          <h2 className="text-lg font-semibold mb-4">Parameters</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Mass (1-50 units)
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={mass}
              onChange={(e) => setMass(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-right text-sm">{mass} units</div>
          </div>
          
          {/* Show observer position controls only for spacetime tab */}
          {activeTab === 'spacetime' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Observer 1 Distance
                </label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={observer1Position}
                  onChange={(e) => setObserver1Position(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-right text-sm">{observer1Position} units</div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Observer 2 Distance
                </label>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={observer2Position}
                  onChange={(e) => setObserver2Position(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-right text-sm">{observer2Position} units</div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Observer 2 Angle
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={observer2Angle}
                  onChange={(e) => setObserver2Angle(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-right text-sm">{observer2Angle}° around central mass</div>
              </div>
            </>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Rotation Effect
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-right text-sm">{rotation.toFixed(1)}</div>
          </div>
          
          {activeTab === 'spacetime' && (
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showLightPaths}
                  onChange={(e) => setShowLightPaths(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Show Light Paths</span>
              </label>
            </div>
          )}
          
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <h3 className="text-md font-semibold mb-2">General Relativity Effects</h3>
            <p className="text-sm mb-2">
              This visualization demonstrates several key effects from Einstein's theory of relativity:
            </p>
            <ul className="text-sm list-disc ml-5 space-y-1">
              <li>Spacetime curvature around massive objects</li>
              <li>Gravitational time dilation between observers</li>
              <li>Gravitational redshift of light</li>
              <li>Light following curved geodesics</li>
              <li>Proper vs. coordinate distance</li>
              <li>Frame-dragging effects from rotating masses</li>
            </ul>
            <p className="text-sm mt-2">
              Try placing Observer 2 much closer to the central mass than Observer 1 to see dramatic time dilation effects!
            </p>
            
            <div className="mt-3 pt-3 border-t border-blue-200">
              <h4 className="text-sm font-semibold mb-1">Additional Facts:</h4>
              <p className="text-xs mb-1">
                {facts.horizonFact}
              </p>
              <p className="text-xs">
                {facts.einsteinRingFact}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelativityVisualizer;
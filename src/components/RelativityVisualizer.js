
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { 
  Camera, 
  Users, 
  Clock, 
  Zap, 
  RotateCcw, 
  Layers, 
  Orbit, 
  Waves, 
  Eye, 
  LocateFixed,
  LifeBuoy 
} from 'lucide-react';

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
  
  // State for tab navigation
  const [activeTab, setActiveTab] = useState('spacetime'); // 'spacetime', 'particles', 'waves', 'observer', 'extreme', 'singularity'
  
  // State for singularity tab
  const [viewMode, setViewMode] = useState('penrose'); // For singularity tab: 'penrose' or 'kerr'
  const [showConsensus, setShowConsensus] = useState(false); // For singularity tab
  
  // State for advanced features
  const [particleCount, setParticleCount] = useState(50);
  const [particleSpeed, setParticleSpeed] = useState(0.3);
  const [waveAmplitude, setWaveAmplitude] = useState(0.5);
  const [waveFrequency, setWaveFrequency] = useState(0.05);
  const [extremeObjectType, setExtremeObjectType] = useState('blackhole'); // 'blackhole', 'neutron', 'kerr', 'merger'
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [frameTime, setFrameTime] = useState(0);
  
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const wavePointsRef = useRef([]);
  
  // Utility Constants
  const SPEED_OF_LIGHT = 1;
  const GRAVITATIONAL_CONSTANT = 1;
  const SCALE_FACTOR = 0.1; // Used to scale gravitational effects for visualization
  
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
    
    // Time dilation factor (simplified approximation)
    // Using the Schwarzschild metric approximation
    const timeDilation1 = 1 / Math.sqrt(1 - (2 * potential1 * SCALE_FACTOR));
    const timeDilation2 = 1 / Math.sqrt(1 - (2 * potential2 * SCALE_FACTOR));
    
    // Calculate relative time dilation
    const relativeTimeDilation = timeDilation2 / timeDilation1;
    
    // Space contraction factor
    const spaceContraction1 = Math.sqrt(1 - (2 * potential1 * SCALE_FACTOR));
    const spaceContraction2 = Math.sqrt(1 - (2 * potential2 * SCALE_FACTOR));
    
    // Light travel time between observers
    // Simplified - actual path would follow geodesic
    const distance = Math.sqrt(r1*r1 + r2*r2 - 2*r1*r2*Math.cos(angleRad));
    
    // Approximate light travel time with gravitational delay
    const lightTravelTime = distance * (1 + (potential1 + potential2) / 2 * SCALE_FACTOR);
    
    // Calculate gravitational redshift (also scaled to avoid NaN)
    const redshift = Math.sqrt((1 - 2 * potential2 * SCALE_FACTOR) / (1 - 2 * potential1 * SCALE_FACTOR)) - 1;
    
    // Calculate escape velocities (as fraction of c)
    // v_esc = sqrt(2GM/r)
    const escapeVelocity1 = Math.sqrt(2 * potential1 * SCALE_FACTOR);
    const escapeVelocity2 = Math.sqrt(2 * potential2 * SCALE_FACTOR);
    
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
    const properDistance = distance / (1 + (observer1.potential + observer2.potential) / 2 * SCALE_FACTOR);
    const properDistanceFact = `The proper distance between observers is ${properDistance.toFixed(2)} units.`;
    
    // Fun gravitational event horizon fact
    const schwarzschildRadius = 2 * mass * SCALE_FACTOR; // Scaled to match our other calculations
    const horizonFact = `At this mass, the event horizon would be at ${schwarzschildRadius.toFixed(2)} units from center.`;
    
    // Einstein ring fact
    const einsteinRingRadius = 4 * mass * SCALE_FACTOR; // Simplified approximation
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

  // Initialize the particle simulation
  const initParticles = () => {
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Random angle and distance
      const angle = Math.random() * 2 * Math.PI;
      const distance = 10 + Math.random() * 40;
      
      // Initial position
      const x = distance * Math.cos(angle);
      const y = distance * Math.sin(angle);
      
      // Initial velocity (perpendicular to radial direction for orbital motion)
      const speed = particleSpeed * (0.8 + 0.4 * Math.random());
      const vx = -y * speed / Math.sqrt(x*x + y*y);
      const vy = x * speed / Math.sqrt(x*x + y*y);
      
      particles.push({
        x, y,
        vx, vy,
        trail: [], // Store previous positions for trail effect
        color: d3.interpolateRainbow(i / particleCount),
        size: 1 + Math.random() * 2
      });
    }
    
    return particles;
  };
  
  // Update particle positions based on gravitational field
  const updateParticles = (particles, dt, centralMass, rotation) => {
    return particles.map(particle => {
      const { x, y, vx, vy, trail, color, size } = particle;
      
      // Calculate distance from center
      const r = Math.sqrt(x*x + y*y);
      
      // Skip if particle is inside event horizon
      const eventHorizon = 2 * centralMass * SCALE_FACTOR;
      if (r < eventHorizon) {
        // Create a new particle outside
        const angle = Math.random() * 2 * Math.PI;
        const distance = 10 + Math.random() * 40;
        
        // Initial position
        const newX = distance * Math.cos(angle);
        const newY = distance * Math.sin(angle);
        
        // Initial velocity (perpendicular to radial direction for orbital motion)
        const speed = particleSpeed * (0.8 + 0.4 * Math.random());
        const newVx = -newY * speed / Math.sqrt(newX*newX + newY*newY);
        const newVy = newX * speed / Math.sqrt(newX*newX + newY*newY);
        
        return {
          x: newX, y: newY,
          vx: newVx, vy: newVy,
          trail: [],
          color,
          size
        };
      }
      
      // Calculate gravitational force
      const forceMagnitude = centralMass / (r*r);
      const forceX = -x * forceMagnitude / r;
      const forceY = -y * forceMagnitude / r;
      
      // Add frame-dragging effect if rotation > 0
      let frameX = 0;
      let frameY = 0;
      
      if (rotation > 0) {
        const rotationEffect = rotation * centralMass / (r*r*r) * 0.2;
        frameX = -y * rotationEffect;
        frameY = x * rotationEffect;
      }
      
      // Apply forces to get new velocity
      const newVx = vx + (forceX + frameX) * dt;
      const newVy = vy + (forceY + frameY) * dt;
      
      // Apply velocity to get new position
      const newX = x + newVx * dt;
      const newY = y + newVy * dt;
      
      // Update trail
      const newTrail = [...trail, { x, y }];
      if (newTrail.length > 20) newTrail.shift(); // Limit trail length
      
      return {
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
        trail: newTrail,
        color,
        size
      };
    });
  };
  
  // Generate gravitational wave simulation data
  const generateWavePoints = () => {
    const points = [];
    const waveCount = 100;
    const source1 = { x: -10, y: 0 };
    const source2 = { x: 10, y: 0 };
    
    for (let i = 0; i < waveCount; i++) {
      const angle = (i / waveCount) * 2 * Math.PI;
      const radius = 5 + i * 0.5;
      
      // Calculate wave positions around both sources
      const x1 = source1.x + radius * Math.cos(angle);
      const y1 = source1.y + radius * Math.sin(angle);
      
      const x2 = source2.x + radius * Math.cos(angle);
      const y2 = source2.y + radius * Math.sin(angle);
      
      points.push(
        { 
          x: x1, 
          y: y1, 
          source: 1, 
          radius, 
          angle, 
          phase: Math.random() * Math.PI * 2
        },
        {
          x: x2,
          y: y2,
          source: 2,
          radius,
          angle,
          phase: Math.random() * Math.PI * 2
        }
      );
    }
    
    return points;
  };
  
  // Update wave points for animation
  const updateWaves = (points, time, amplitude, frequency) => {
    // Calculate current orbital angle for sources
    const orbitFreq = 0.05;
    const orbitAngle = time * orbitFreq;
    
    // Update source positions (spiraling in)
    const initialDistance = 10;
    const decayRate = 0.03;
    const distance = Math.max(2, initialDistance * Math.exp(-time * decayRate));
    
    const source1 = {
      x: -distance * Math.cos(orbitAngle),
      y: -distance * Math.sin(orbitAngle)
    };
    
    const source2 = {
      x: distance * Math.cos(orbitAngle),
      y: distance * Math.sin(orbitAngle)
    };
    
    return points.map(point => {
      // Get the correct source
      const source = point.source === 1 ? source1 : source2;
      
      // Calculate new position based on radius and angle
      const newAngle = point.angle + time * 0.1;
      const x = source.x + point.radius * Math.cos(newAngle);
      const y = source.y + point.radius * Math.sin(newAngle);
      
      // Calculate wave displacement
      const waveDisplacement = Math.sin(time * frequency + point.phase) * amplitude;
      
      return {
        ...point,
        x,
        y,
        angle: newAngle,
        displacement: waveDisplacement,
        sourceX: source.x,
        sourceY: source.y
      };
    });
  };
  
  // Render functions for different visualization types
  const renderParticleView = (svg, containerWidth, containerHeight) => {
    // Initialize particles if needed
    if (particlesRef.current.length === 0) {
      particlesRef.current = initParticles();
    }
    
    // Scale for mapping to screen coordinates
    const scale = Math.min(containerWidth, containerHeight) / 120;
    const xScale = d => (containerWidth / 2) + d * scale;
    const yScale = d => (containerHeight / 2) - d * scale;
    
    // Draw central mass
    svg.append("circle")
      .attr("cx", xScale(0))
      .attr("cy", yScale(0))
      .attr("r", Math.max(5, Math.min(20, mass/2)))
      .attr("fill", "orange")
      .attr("opacity", 0.9);
    
    // Draw event horizon
    const eventHorizonRadius = 2 * mass * SCALE_FACTOR;
    svg.append("circle")
      .attr("cx", xScale(0))
      .attr("cy", yScale(0))
      .attr("r", eventHorizonRadius * scale)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.8);
      
    // Draw ergosphere if rotating
    if (rotation > 0) {
      const ergosphereRadius = 2 * mass * SCALE_FACTOR * (1 + Math.sqrt(1 - rotation * rotation));
      svg.append("circle")
        .attr("cx", xScale(0))
        .attr("cy", yScale(0))
        .attr("r", ergosphereRadius * scale)
        .attr("fill", "none")
        .attr("stroke", "purple")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "3,3")
        .attr("opacity", 0.7);
    }
    
    // Draw particles and their trails
    particlesRef.current.forEach(particle => {
      // Draw trail
      if (particle.trail.length > 1) {
        const lineGenerator = d3.line()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
          .curve(d3.curveBasis);
        
        svg.append("path")
          .datum(particle.trail)
          .attr("d", lineGenerator)
          .attr("fill", "none")
          .attr("stroke", particle.color)
          .attr("stroke-width", 1)
          .attr("opacity", 0.5);
      }
      
      // Draw particle
      svg.append("circle")
        .attr("cx", xScale(particle.x))
        .attr("cy", yScale(particle.y))
        .attr("r", particle.size)
        .attr("fill", particle.color)
        .attr("opacity", 0.9);
    });
    
    // Update particles for next frame if simulation is running
    if (simulationRunning) {
      const dt = 0.1; // Time step
      particlesRef.current = updateParticles(particlesRef.current, dt, mass, rotation);
      setFrameTime(prev => prev + dt);
    }
  };
  
  const renderGravitationalWaves = (svg, containerWidth, containerHeight) => {
    // Initialize wave points if needed
    if (wavePointsRef.current.length === 0) {
      wavePointsRef.current = generateWavePoints();
    }
    
    // Scale for mapping to screen coordinates
    const scale = Math.min(containerWidth, containerHeight) / 120;
    const xScale = d => (containerWidth / 2) + d * scale;
    const yScale = d => (containerHeight / 2) - d * scale;
    
    // Update wave points based on current time
    const updatedWavePoints = simulationRunning ? 
      updateWaves(wavePointsRef.current, frameTime, waveAmplitude, waveFrequency) : 
      wavePointsRef.current;
    
    if (simulationRunning) {
      wavePointsRef.current = updatedWavePoints;
      setFrameTime(prev => prev + 0.1);
    }
    
    // Draw wave points
    updatedWavePoints.forEach(point => {
      if (!point.displacement) return;
      
      // Draw line connecting to source
      svg.append("line")
        .attr("x1", xScale(point.sourceX))
        .attr("y1", yScale(point.sourceY))
        .attr("x2", xScale(point.x))
        .attr("y2", yScale(point.y))
        .attr("stroke", point.source === 1 ? "#ff5722" : "#2196f3")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.2);
      
      // Draw wave point with displacement
      svg.append("circle")
        .attr("cx", xScale(point.x))
        .attr("cy", yScale(point.y))
        .attr("r", Math.abs(point.displacement) * 3 + 1)
        .attr("fill", point.displacement > 0 ? 
          (point.source === 1 ? "#ff5722" : "#2196f3") : 
          (point.source === 1 ? "#ffccbc" : "#bbdefb"))
        .attr("opacity", 0.7);
    });
    
    // Draw sources (two black holes)
    svg.append("circle")
      .attr("cx", xScale(updatedWavePoints[0].sourceX))
      .attr("cy", yScale(updatedWavePoints[0].sourceY))
      .attr("r", 6)
      .attr("fill", "#ff5722")
      .attr("opacity", 0.9);
      
    svg.append("circle")
      .attr("cx", xScale(updatedWavePoints[1].sourceX))
      .attr("cy", yScale(updatedWavePoints[1].sourceY))
      .attr("r", 6)
      .attr("fill", "#2196f3")
      .attr("opacity", 0.9);
    
    // Draw a connecting line
    svg.append("line")
      .attr("x1", xScale(updatedWavePoints[0].sourceX))
      .attr("y1", yScale(updatedWavePoints[0].sourceY))
      .attr("x2", xScale(updatedWavePoints[1].sourceX))
      .attr("y2", yScale(updatedWavePoints[1].sourceY))
      .attr("stroke", "#aaaaaa")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.7);
  };
  
  const renderObserverView = (svg, containerWidth, containerHeight) => {
    // This view simulates what an observer would see
    const observer = activeObserver === 1 ? 
      { x: observer1Position, y: 0 } : 
      { 
        x: observer2Position * Math.cos(observer2Angle * Math.PI / 180), 
        y: observer2Position * Math.sin(observer2Angle * Math.PI / 180) 
      };
    
    // Scale for mapping to screen coordinates
    const scale = Math.min(containerWidth, containerHeight) / 120;
    const xScale = d => (containerWidth / 2) + d * scale;
    const yScale = d => (containerHeight / 2) - d * scale;
    
    // Draw coordinate grid as seen by the observer
    // The grid will be distorted based on gravitational effects
    
    // Draw concentric circles to represent distance
    const circles = [5, 10, 15, 20, 30, 40];
    circles.forEach(radius => {
      // Calculate apparent radius due to spacetime curvature
      const apparentRadius = radius * (1 - mass / (radius * 10));
      
      svg.append("circle")
        .attr("cx", xScale(0))
        .attr("cy", yScale(0))
        .attr("r", apparentRadius * scale)
        .attr("fill", "none")
        .attr("stroke", "#555555")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5);
        
      // Add distance label
      svg.append("text")
        .attr("x", xScale(apparentRadius * 0.7))
        .attr("y", yScale(apparentRadius * 0.7))
        .attr("fill", "#999999")
        .attr("font-size", "10px")
        .text(`${radius} units`);
    });
    
    // Draw radial lines
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    angles.forEach(angle => {
      const radians = angle * Math.PI / 180;
      // Lines curve due to gravity
      const curvePath = [];
      
      for (let r = 1; r <= 50; r += 0.5) {
        // Calculate curved position due to gravity
        const bendFactor = mass / (r * 10);
        const curvedAngle = radians + bendFactor * Math.sin(radians);
        
        curvePath.push({
          x: r * Math.cos(curvedAngle),
          y: r * Math.sin(curvedAngle)
        });
      }
      
      // Create line generator
      const lineGenerator = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveBasis);
      
      // Draw curved path
      svg.append("path")
        .datum(curvePath)
        .attr("d", lineGenerator)
        .attr("fill", "none")
        .attr("stroke", "#555555")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5);
      
      // Add angle label
      const labelRadius = 45;
      svg.append("text")
        .attr("x", xScale(labelRadius * Math.cos(radians)))
        .attr("y", yScale(labelRadius * Math.sin(radians)))
        .attr("fill", "#999999")
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .text(`${angle}°`);
    });
    
    // Draw central mass
    svg.append("circle")
      .attr("cx", xScale(0))
      .attr("cy", yScale(0))
      .attr("r", mass * 0.5)
      .attr("fill", "orange")
      .attr("opacity", 0.9);
    
    // Draw observer (center of view)
    svg.append("circle")
      .attr("cx", xScale(0))
      .attr("cy", yScale(0))
      .attr("r", 6)
      .attr("fill", "#4CAF50")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);
    
    // Add "You are here" label
    svg.append("text")
      .attr("x", xScale(0) + 10)
      .attr("y", yScale(0) - 10)
      .attr("fill", "white")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(`Observer ${activeObserver}`);
    
    // Draw other observer with apparent position
    const otherObserver = activeObserver === 1 ? 
      { 
        x: observer2Position * Math.cos(observer2Angle * Math.PI / 180), 
        y: observer2Position * Math.sin(observer2Angle * Math.PI / 180) 
      } : 
      { x: observer1Position, y: 0 };
    
    // Calculate relative position
    const relX = otherObserver.x - observer.x;
    const relY = otherObserver.y - observer.y;
    const distance = Math.sqrt(relX*relX + relY*relY);
    const angle = Math.atan2(relY, relX);
    
    // Apply visual distortion due to gravity
    const visualDistance = distance * (1 - mass / (distance * 10));
    const visualAngle = angle + (mass / (distance * 15)) * Math.sin(angle * 2);
    
    const apparentX = visualDistance * Math.cos(visualAngle);
    const apparentY = visualDistance * Math.sin(visualAngle);
    
    // Draw the apparent position of the other observer
    svg.append("circle")
      .attr("cx", xScale(apparentX))
      .attr("cy", yScale(apparentY))
      .attr("r", 6)
      .attr("fill", "#2196F3")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);
    
    // Add label
    svg.append("text")
      .attr("x", xScale(apparentX) + 10)
      .attr("y", yScale(apparentY) - 10)
      .attr("fill", "white")
      .attr("font-size", "12px")
      .text(`Observer ${activeObserver === 1 ? 2 : 1}`);
      
    // Add "apparent position" line
    svg.append("line")
      .attr("x1", xScale(apparentX))
      .attr("y1", yScale(apparentY))
      .attr("x2", xScale(relX))
      .attr("y2", yScale(relY))
      .attr("stroke", "#aaaaaa")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.7);
    
    // Add "actual position" label
    svg.append("circle")
      .attr("cx", xScale(relX))
      .attr("cy", yScale(relY))
      .attr("r", 3)
      .attr("fill", "#999999")
      .attr("opacity", 0.5);
      
    svg.append("text")
      .attr("x", xScale(relX) + 5)
      .attr("y", yScale(relY) - 5)
      .attr("fill", "#999999")
      .attr("font-size", "10px")
      .text("Actual position");
  };
  
  const renderExtremeObjects = (svg, containerWidth, containerHeight) => {
    // Scale for mapping to screen coordinates
    const scale = Math.min(containerWidth, containerHeight) / 120;
    const xScale = d => (containerWidth / 2) + d * scale;
    const yScale = d => (containerHeight / 2) - d * scale;
    
    // Draw different types of extreme objects
    switch (extremeObjectType) {
      case 'blackhole':
        // Regular black hole
        // Event horizon
        const eventHorizonRadius = 2 * mass * SCALE_FACTOR;
        
        // Shadow region (black disc)
        svg.append("circle")
          .attr("cx", xScale(0))
          .attr("cy", yScale(0))
          .attr("r", eventHorizonRadius * scale)
          .attr("fill", "black");
        
        // Event horizon boundary
        svg.append("circle")
          .attr("cx", xScale(0))
          .attr("cy", yScale(0))
          .attr("r", eventHorizonRadius * scale)
          .attr("fill", "none")
          .attr("stroke", "red")
          .attr("stroke-width", 2);
        
        // Photon sphere
        svg.append("circle")
          .attr("cx", xScale(0))
          .attr("cy", yScale(0))
          .attr("r", 1.5 * eventHorizonRadius * scale)
          .attr("fill", "none")
          .attr("stroke", "yellow")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "3,3");
        
        // Accretion disc
        const innerRadius = 3 * eventHorizonRadius;
        const outerRadius = 8 * eventHorizonRadius;
        
        // Create a radial gradient for the accretion disc
        const radialGradient = svg.append("defs")
          .append("radialGradient")
          .attr("id", "accretionGradient")
          .attr("cx", "50%")
          .attr("cy", "50%")
          .attr("r", "50%")
          .attr("fx", "50%")
          .attr("fy", "50%");
          
        radialGradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", "#ff9500")
          .attr("stop-opacity", 1);
          
        radialGradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", "#ff5722")
          .attr("stop-opacity", 0.3);
        
        // Draw accretion disc
        for (let i = 0; i < 50; i++) {
          const angle = (i / 50) * Math.PI * 2;
          const random = 0.8 + Math.random() * 0.4;
          const discRadius = random * (innerRadius + (i / 50) * (outerRadius - innerRadius));
          
          svg.append("circle")
            .attr("cx", xScale(0))
            .attr("cy", yScale(0))
            .attr("r", discRadius * scale)
            .attr("fill", "none")
            .attr("stroke", d3.interpolateInferno(i / 50))
            .attr("stroke-width", 0.5 + Math.random())
            .attr("opacity", 0.1 + Math.random() * 0.3);
        }
        
        // Labels
        svg.append("text")
          .attr("x", xScale(eventHorizonRadius) + 5)
          .attr("y", yScale(0))
          .attr("fill", "red")
          .attr("font-size", "12px")
          .text("Event Horizon");
          
        svg.append("text")
          .attr("x", xScale(1.5 * eventHorizonRadius) + 5)
          .attr("y", yScale(1.5 * eventHorizonRadius))
          .attr("fill", "yellow")
          .attr("font-size", "12px")
          .text("Photon Sphere");
        
        break;
        
      case 'neutron':
        // Neutron star
        const neutronRadius = mass * 0.3; // Neutron stars are much smaller than black holes
        
        // Draw neutron star surface
        svg.append("circle")
          .attr("cx", xScale(0))
          .attr("cy", yScale(0))
          .attr("r", neutronRadius * scale)
          .attr("fill", "url(#neutronGradient)");
        
        // Create a radial gradient for the neutron star
        const neutronGradient = svg.append("defs")
          .append("radialGradient")
          .attr("id", "neutronGradient")
          .attr("cx", "50%")
          .attr("cy", "50%")
          .attr("r", "50%")
          .attr("fx", "50%")
          .attr("fy", "50%");
          
        neutronGradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", "#ffffff")
          .attr("stop-opacity", 1);
          
        neutronGradient.append("stop")
          .attr("offset", "80%")
          .attr("stop-color", "#64b5f6")
          .attr("stop-opacity", 1);
          
        neutronGradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", "#1976d2")
          .attr("stop-opacity", 1);
        
        // Draw magnetic field lines
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const fieldLine = [];
          
          for (let r = neutronRadius; r <= neutronRadius * 5; r += neutronRadius * 0.2) {
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            
            // Add dipole field effect
            const bendFactor = 0.2 * (1 - (neutronRadius / r));
            const bentX = x + bendFactor * neutronRadius * Math.sin(angle + frameTime);
            const bentY = y - bendFactor * neutronRadius * Math.cos(angle + frameTime);
            
            fieldLine.push({ x: bentX, y: bentY });
          }
          
          // Create line generator
          const lineGenerator = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
            .curve(d3.curveBasis);
          
          // Draw magnetic field line
          svg.append("path")
            .datum(fieldLine)
            .attr("d", lineGenerator)
            .attr("fill", "none")
            .attr("stroke", "#4fc3f7")
            .attr("stroke-width", 1)
            .attr("opacity", 0.4);
        }
        
        // Draw jets along magnetic axis (tilted)
        const jetAngle = Math.PI / 4; // 45 degrees tilt
        const jetLength = neutronRadius * 10;
        
        // North jet
        const northJet = [];
        for (let r = neutronRadius; r <= jetLength; r += neutronRadius * 0.1) {
          const magnitude = (r / jetLength) * 2;
          const width = neutronRadius * 0.3 * (1 - r / jetLength);
          
          northJet.push({
            x: r * Math.cos(jetAngle),
            y: r * Math.sin(jetAngle),
            width
          });
        }
        
        // Create line generator for jets
        const jetGenerator = d3.line()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
          .curve(d3.curveBasis);
        
        // Draw north jet
        northJet.forEach(point => {
          svg.append("circle")
            .attr("cx", xScale(point.x))
            .attr("cy", yScale(point.y))
            .attr("r", point.width * scale)
            .attr("fill", "#039be5")
            .attr("opacity", 0.7 * (1 - Math.sqrt(point.x*point.x + point.y*point.y) / jetLength));
        });
        
        // South jet
        const southJet = northJet.map(point => ({
          x: -point.x,
          y: -point.y,
          width: point.width
        }));
        
        southJet.forEach(point => {
          svg.append("circle")
            .attr("cx", xScale(point.x))
            .attr("cy", yScale(point.y))
            .attr("r", point.width * scale)
            .attr("fill", "#039be5")
            .attr("opacity", 0.7 * (1 - Math.sqrt(point.x*point.x + point.y*point.y) / jetLength));
        });
        
        // Label
        svg.append("text")
          .attr("x", xScale(neutronRadius) + 5)
          .attr("y", yScale(neutronRadius) + 15)
          .attr("fill", "white")
          .attr("font-size", "12px")
          .text("Neutron Star");
          
        svg.append("text")
          .attr("x", xScale(jetLength * 0.7 * Math.cos(jetAngle)))
          .attr("y", yScale(jetLength * 0.7 * Math.sin(jetAngle)))
          .attr("fill", "#039be5")
          .attr("font-size", "12px")
          .text("Relativistic Jet");
        
        if (simulationRunning) {
          setFrameTime(prev => prev + 0.02);
        }
        
        break;
        
      case 'kerr':
        // Rotating (Kerr) black hole
        const kerrMass = mass;
        const kerrSpin = rotation;
        
        // Event horizon for Kerr black hole is different from Schwarzschild
        const rPlus = kerrMass + Math.sqrt(kerrMass*kerrMass - kerrSpin*kerrSpin);
        const rMinus = kerrMass - Math.sqrt(kerrMass*kerrMass - kerrSpin*kerrSpin);
        
        // Scale for visualization
        const kerrScale = SCALE_FACTOR;
        const horizonRadius = rPlus * kerrScale;
        
        // Ergosphere (static limit)
        const ergoRadius = 2 * kerrMass * kerrScale;
        
        // Draw ergosphere (oblate spheroid approximation)
        const ergoPoints = [];
        for (let angle = 0; angle <= 2 * Math.PI; angle += 0.1) {
          // Flattened at poles due to rotation
          const flattenFactor = 1 - 0.3 * kerrSpin * Math.abs(Math.sin(angle));
          const x = ergoRadius * Math.cos(angle);
          const y = ergoRadius * flattenFactor * Math.sin(angle);
          ergoPoints.push({ x, y });
        }
        
        // Create line generator
        const ergoLineGenerator = d3.line()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
          .curve(d3.curveCardinalClosed);
        
        // Draw ergosphere
        svg.append("path")
          .datum(ergoPoints)
          .attr("d", ergoLineGenerator)
          .attr("fill", "rgba(128, 0, 128, 0.2)")
          .attr("stroke", "purple")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "5,5");
        
        // Draw event horizon (more circular)
        const horizonPoints = [];
        for (let angle = 0; angle <= 2 * Math.PI; angle += 0.1) {
          // Slightly flattened
          const flattenFactor = 1 - 0.1 * kerrSpin * Math.abs(Math.sin(angle));
          const x = horizonRadius * Math.cos(angle);
          const y = horizonRadius * flattenFactor * Math.sin(angle);
          horizonPoints.push({ x, y });
        }
        
        // Draw event horizon
        svg.append("path")
          .datum(horizonPoints)
          .attr("d", ergoLineGenerator)
          .attr("fill", "black")
          .attr("stroke", "red")
          .attr("stroke-width", 2);
        
        // Draw rotation axis
        svg.append("line")
          .attr("x1", xScale(0))
          .attr("y1", yScale(-ergoRadius * 1.5))
          .attr("x2", xScale(0))
          .attr("y2", yScale(ergoRadius * 1.5))
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .attr("opacity", 0.5)
          .attr("stroke-dasharray", "5,5");
        
        // Draw frame-dragging effect
        const frameDraggingPoints = [];
        const frameDraggingRadius = horizonRadius * 3;
        let startAngle = frameTime * kerrSpin;
        
        for (let i = 0; i < 360; i += 10) {
          const angle = (i / 180) * Math.PI + startAngle;
          const distance = frameDraggingRadius * (1 + 0.1 * Math.sin(angle * 5));
          
          frameDraggingPoints.push({
            x: distance * Math.cos(angle),
            y: distance * Math.sin(angle)
          });
        }
        
        // Draw frame-dragging points
        frameDraggingPoints.forEach(point => {
          svg.append("circle")
            .attr("cx", xScale(point.x))
            .attr("cy", yScale(point.y))
            .attr("r", 1.5)
            .attr("fill", "orange")
            .attr("opacity", 0.8);
        });
        
        // Labels
        svg.append("text")
          .attr("x", xScale(horizonRadius) + 5)
          .attr("y", yScale(0))
          .attr("fill", "red")
          .attr("font-size", "12px")
          .text("Event Horizon");
          
        svg.append("text")
          .attr("x", xScale(ergoRadius) + 5)
          .attr("y", yScale(ergoRadius * 0.5))
          .attr("fill", "purple")
          .attr("font-size", "12px")
          .text("Ergosphere");
          
        svg.append("text")
          .attr("x", xScale(frameDraggingRadius) + 5)
          .attr("y", yScale(frameDraggingRadius))
          .attr("fill", "orange")
          .attr("font-size", "12px")
          .text("Frame Dragging");
        
        if (simulationRunning) {
          setFrameTime(prev => prev + 0.05);
        }
        
        break;
        
      case 'merger':
        // Black hole merger simulation
        // Calculate orbital parameters
        const time = frameTime;
        const initialSeparation = 40;
        const decayRate = 0.03;
        
        // Decreasing orbital separation
        const separation = Math.max(5, initialSeparation * Math.exp(-time * decayRate));
        const orbitFrequency = 0.05 * Math.pow(separation / initialSeparation, -1.5);
        const orbitAngle = time * orbitFrequency;
        
        // Positions of the black holes
        const mass1 = mass * 0.6;
        const mass2 = mass * 0.4;
        
        // Center of mass
        const centerX = 0;
        const centerY = 0;
        
        // Position of first black hole
        const bh1x = centerX - separation * (mass2 / (mass1 + mass2)) * Math.cos(orbitAngle);
        const bh1y = centerY - separation * (mass2 / (mass1 + mass2)) * Math.sin(orbitAngle);
        
        // Position of second black hole
        const bh2x = centerX + separation * (mass1 / (mass1 + mass2)) * Math.cos(orbitAngle);
        const bh2y = centerY + separation * (mass1 / (mass1 + mass2)) * Math.sin(orbitAngle);
        
        // Draw first black hole
        const horizon1 = 2 * mass1 * SCALE_FACTOR;
        svg.append("circle")
          .attr("cx", xScale(bh1x))
          .attr("cy", yScale(bh1y))
          .attr("r", horizon1 * scale)
          .attr("fill", "black")
          .attr("stroke", "red")
          .attr("stroke-width", 2);
        
        // Draw second black hole
        const horizon2 = 2 * mass2 * SCALE_FACTOR;
        svg.append("circle")
          .attr("cx", xScale(bh2x))
          .attr("cy", yScale(bh2y))
          .attr("r", horizon2 * scale)
          .attr("fill", "black")
          .attr("stroke", "red")
          .attr("stroke-width", 2);
        
        // Draw gravitational waves
        // The amplitude increases as the black holes get closer
        const waveAmplitudeMax = 5 * SCALE_FACTOR * (initialSeparation / separation);
        
        // Draw circular waves emanating from the system
        for (let radius = 5; radius < 100; radius += 5) {
          // Wave phase depends on distance and time
          const wavePhase = time * 5 - radius * 0.3;
          const amplitude = waveAmplitudeMax * Math.exp(-radius * 0.02) * Math.sin(wavePhase);
          
          const wavePoints = [];
          for (let angle = 0; angle <= 2 * Math.PI; angle += 0.1) {
            // Direction-dependent amplitude (quadrupole radiation pattern)
            const directionFactor = 1 + 0.5 * Math.cos(2 * angle);
            
            // Get wave position
            const waveRadius = radius + amplitude * directionFactor;
            const wx = waveRadius * Math.cos(angle);
            const wy = waveRadius * Math.sin(angle);
            
            wavePoints.push({ x: wx, y: wy });
          }
          
          // Create line generator
          const waveLineGenerator = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
            .curve(d3.curveCardinalClosed);
          
          // Draw wave
          svg.append("path")
            .datum(wavePoints)
            .attr("d", waveLineGenerator)
            .attr("fill", "none")
            .attr("stroke", d3.interpolateViridis(radius / 100))
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.5);
        }
        
        // Draw orbital path
        svg.append("circle")
          .attr("cx", xScale(centerX))
          .attr("cy", yScale(centerY))
          .attr("r", separation * scale)
          .attr("fill", "none")
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .attr("opacity", 0.3)
          .attr("stroke-dasharray", "3,3");
        
        // Labels
        svg.append("text")
          .attr("x", xScale(bh1x) + 5)
          .attr("y", yScale(bh1y) - 10)
          .attr("fill", "white")
          .attr("font-size", "12px")
          .text(`${mass1.toFixed(1)} M☉`);
          
        svg.append("text")
          .attr("x", xScale(bh2x) + 5)
          .attr("y", yScale(bh2y) - 10)
          .attr("fill", "white")
          .attr("font-size", "12px")
          .text(`${mass2.toFixed(1)} M☉`);
        
        // Add merger state
        let mergerState = "Early inspiral";
        if (separation < 15) mergerState = "Late inspiral";
        if (separation < 10) mergerState = "Merger imminent";
        if (separation < 7) mergerState = "Merger";
        
        svg.append("text")
          .attr("x", xScale(-40))
          .attr("y", yScale(-40))
          .attr("fill", "white")
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .text(`Merger state: ${mergerState}`);
          
        svg.append("text")
          .attr("x", xScale(-40))
          .attr("y", yScale(-35))
          .attr("fill", "white")
          .attr("font-size", "12px")
          .text(`Separation: ${separation.toFixed(1)} units`);
        
        // Reset simulation if merger complete
        if (separation <= 5 && simulationRunning) {
          setFrameTime(0);
        } else if (simulationRunning) {
          setFrameTime(prev => prev + 0.1);
        }
        
        break;
    }
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
    
    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create new SVG
    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", containerHeight);
    
    // Render the appropriate view based on active tab
    switch (activeTab) {
      case 'spacetime':
        renderSpacetimeView(svg, containerWidth, containerHeight);
        break;
      case 'particles':
        renderParticleView(svg, containerWidth, containerHeight);
        break;
      case 'waves':
        renderGravitationalWaves(svg, containerWidth, containerHeight);
        break;
      case 'observer':
        renderObserverView(svg, containerWidth, containerHeight);
        break;
      case 'extreme':
        renderExtremeObjects(svg, containerWidth, containerHeight);
        break;
      case 'singularity':
        renderSingularityDebateView(svg, containerWidth, containerHeight);
        break;
    }
    
    // Set up animation loop if needed
    if (simulationRunning && 
        (activeTab === 'particles' || 
         activeTab === 'waves' || 
         (activeTab === 'extreme' && extremeObjectType !== 'blackhole'))) {
      animationRef.current = requestAnimationFrame(() => {
        // Force re-render
        setFrameTime(prev => prev + 0.1);
      });
    }
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
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
    simulationRunning,
    frameTime,
    particleCount,
    particleSpeed,
    waveAmplitude,
    waveFrequency,
    extremeObjectType,
    viewMode,
    showConsensus
  ]);
  
  // Calculate effects for the fact panel
  const relativisticEffects = calculateRelativisticEffects();
  const facts = generateFacts(relativisticEffects);
  
  // Tab content for different visualizations
  const tabContent = {
    spacetime: (
      <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold flex items-center">
            <Users size={20} className="mr-2" />
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
            <Clock size={16} className="mt-1 mr-2 flex-shrink-0 text-blue-300" />
            <p className="text-sm">{facts.timeDilationFact}</p>
          </div>
          <div className="flex items-start">
            <Clock size={16} className="mt-1 mr-2 flex-shrink-0 text-blue-300" />
            <p className="text-sm">{facts.clockFact}</p>
          </div>
          <div className="flex items-start">
            <Zap size={16} className="mt-1 mr-2 flex-shrink-0 text-yellow-300" />
            <p className="text-sm">{facts.lightFact}</p>
          </div>
          <div className="flex items-start">
            <Zap size={16} className="mt-1 mr-2 flex-shrink-0 text-yellow-300" />
            <p className="text-sm">{facts.redshiftFact}</p>
          </div>
          <div className="flex items-start">
            <RotateCcw size={16} className="mt-1 mr-2 flex-shrink-0 text-green-300" />
            <p className="text-sm">
              {activeObserver === 1 ? facts.escapeVelocityFact1 : facts.escapeVelocityFact2}
            </p>
          </div>
          <div className="flex items-start">
            <RotateCcw size={16} className="mt-1 mr-2 flex-shrink-0 text-green-300" />
            <p className="text-sm">{facts.properDistanceFact}</p>
          </div>
        </div>
      </div>
    ),
    
    particles: (
      <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold flex items-center">
            <Orbit size={20} className="mr-2" />
            Particle Simulation Controls
          </h3>
          <button 
            className={`flex items-center text-xs px-3 py-1 rounded ${simulationRunning ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}
            onClick={() => setSimulationRunning(!simulationRunning)}
          >
            {simulationRunning ? 'Pause' : 'Start'} Simulation
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">
              Particle Count
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={particleCount}
              onChange={(e) => {
                setParticleCount(Number(e.target.value));
                particlesRef.current = []; // Reset particles
              }}
              className="w-full accent-blue-500"
            />
            <div className="text-right text-sm text-gray-200">{particleCount} particles</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">
              Particle Speed
            </label>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.05"
              value={particleSpeed}
              onChange={(e) => {
                setParticleSpeed(Number(e.target.value));
                particlesRef.current = []; // Reset particles
              }}
              className="w-full accent-blue-500"
            />
            <div className="text-right text-sm text-gray-200">{particleSpeed * 100}% of c</div>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-md font-medium mb-2 text-gray-200">What You're Seeing:</h4>
          <p className="text-sm mb-2 text-gray-200">
            This simulation shows how massive objects affect the motion of particles in spacetime. 
          </p>
          <ul className="text-sm list-disc ml-5 space-y-1 text-gray-200">
            <li>The central mass creates a gravitational well that pulls particles inward</li>
            <li>Particles with sufficient tangential velocity can maintain stable orbits</li>
            <li>The event horizon (red circle) is a boundary beyond which escape is impossible</li>
            <li>Adding rotation creates frame-dragging, pulling particles in the direction of rotation</li>
          </ul>
        </div>
      </div>
    ),
    
    waves: (
      <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold flex items-center">
            <Waves size={20} className="mr-2" />
            Gravitational Wave Controls
          </h3>
          <button 
            className={`flex items-center text-xs px-3 py-1 rounded ${simulationRunning ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}
            onClick={() => setSimulationRunning(!simulationRunning)}
          >
            {simulationRunning ? 'Pause' : 'Start'} Simulation
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">
              Wave Amplitude
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={waveAmplitude}
              onChange={(e) => setWaveAmplitude(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="text-right text-sm text-gray-200">{waveAmplitude.toFixed(1)} units</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">
              Wave Frequency
            </label>
            <input
              type="range"
              min="0.01"
              max="0.2"
              step="0.01"
              value={waveFrequency}
              onChange={(e) => setWaveFrequency(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="text-right text-sm text-gray-200">{waveFrequency.toFixed(2)} Hz</div>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-md font-medium mb-2 text-gray-200">What You're Seeing:</h4>
          <p className="text-sm mb-2 text-gray-200">
            This simulation shows gravitational waves emitted by two massive objects orbiting each other.
          </p>
          <ul className="text-sm list-disc ml-5 space-y-1 text-gray-200">
            <li>The blue and orange dots represent two massive objects (like black holes or neutron stars)</li>
            <li>As they orbit, they emit gravitational waves - ripples in spacetime</li>
            <li>The waves travel outward at the speed of light</li>
            <li>As the objects get closer, the waves become stronger and more frequent</li>
            <li>Eventually, the objects merge, creating a strong burst of gravitational radiation</li>
          </ul>
          <p className="text-sm mt-2 text-gray-200">
            Gravitational waves were first directly detected in 2015 by LIGO, confirming a major prediction of Einstein's General Relativity.
          </p>
        </div>
      </div>
    ),
    
    observer: (
      <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold flex items-center">
            <Eye size={20} className="mr-2" />
            Observer Reference Frame
          </h3>
          <button 
            className="flex items-center text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
            onClick={() => setActiveObserver(activeObserver === 1 ? 2 : 1)}
          >
            Switch to Observer {activeObserver === 1 ? "2" : "1"}
          </button>
        </div>
        
        <div className="mt-3">
          <h4 className="text-md font-medium mb-2 text-gray-200">What You're Seeing:</h4>
          <p className="text-sm mb-2 text-gray-200">
            This visualization shows how spacetime looks from the perspective of Observer {activeObserver}.
          </p>
          <ul className="text-sm list-disc ml-5 space-y-1 text-gray-200">
            <li>The grid shows how coordinate lines appear warped due to gravity</li>
            <li>The apparent position of the other observer is shifted from their actual position</li>
            <li>This shift is due to the bending of light in curved spacetime</li>
            <li>Distance measurements are distorted by gravitational effects</li>
            <li>The stronger the gravity, the more severe the distortion</li>
          </ul>
          <p className="text-sm mt-2 italic text-gray-200">
            "Spacetime tells matter how to move; matter tells spacetime how to curve." — John Wheeler
          </p>
        </div>
        
        <div className="mt-4 bg-gray-700 p-3 rounded">
          <h4 className="text-md font-medium mb-1 text-gray-200">Observer {activeObserver}'s Measurements:</h4>
          <p className="text-sm text-gray-200">
            When Observer {activeObserver} looks at Observer {activeObserver === 1 ? "2" : "1"}, 
            they see them at a different position than their actual location due to gravitational lensing.
            Light from the other observer appears redshifted by {Math.abs((relativisticEffects.redshift * 100).toFixed(4))}%.
          </p>
        </div>
      </div>
    ),
    
    extreme: (
      <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold flex items-center">
            <LifeBuoy size={20} className="mr-2" />
            Extreme Objects
          </h3>
          <div className="flex items-center">
            <button 
              className={`flex items-center text-xs px-3 py-1 rounded ${simulationRunning ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'} mr-2`}
              onClick={() => setSimulationRunning(!simulationRunning)}
            >
              {simulationRunning ? 'Pause' : 'Start'} Simulation
            </button>
            <select
              value={extremeObjectType}
              onChange={(e) => {
                setExtremeObjectType(e.target.value);
                setFrameTime(0); // Reset animation
              }}
              className="bg-gray-700 text-white text-sm rounded py-1 px-2"
            >
              <option value="blackhole">Black Hole</option>
              <option value="neutron">Neutron Star</option>
              <option value="kerr">Rotating Black Hole</option>
              <option value="merger">Black Hole Merger</option>
            </select>
          </div>
        </div>
        
        <div className="mt-3">
          <h4 className="text-md font-medium mb-2 text-gray-200">About {
            extremeObjectType === 'blackhole' ? 'Black Holes' :
            extremeObjectType === 'neutron' ? 'Neutron Stars' :
            extremeObjectType === 'kerr' ? 'Rotating Black Holes' :
            'Black Hole Mergers'
          }:</h4>
          
          {extremeObjectType === 'blackhole' && (
            <div>
              <p className="text-sm mb-2 text-gray-200">
                Black holes are regions of spacetime where gravity is so strong that nothing—no particles or even electromagnetic radiation such as light—can escape from it.
              </p>
              <ul className="text-sm list-disc ml-5 space-y-1 text-gray-200">
                <li>The event horizon (red circle) marks the point of no return</li>
                <li>The photon sphere (yellow dashed line) is where light can orbit the black hole</li>
                <li>The accretion disk forms from matter falling toward the black hole</li>
                <li>Black holes are predicted by Einstein's theory of general relativity</li>
                <li>First directly imaged in 2019 by the Event Horizon Telescope</li>
              </ul>
            </div>
          )}
          
          {extremeObjectType === 'neutron' && (
            <div>
              <p className="text-sm mb-2 text-gray-200">
                Neutron stars are the collapsed cores of massive stars, supported against further collapse by neutron degeneracy pressure.
              </p>
              <ul className="text-sm list-disc ml-5 space-y-1 text-gray-200">
                <li>Typically have a mass of 1.4 solar masses compressed into a sphere just 20km in diameter</li>
                <li>Extremely dense - a teaspoon would weigh billions of tons</li>
                <li>Magnetic fields over a trillion times stronger than Earth's</li>
                <li>Can spin hundreds of times per second (pulsars)</li>
                <li>Emit beams of radiation from their magnetic poles</li>
              </ul>
            </div>
          )}
          
          {extremeObjectType === 'kerr' && (
            <div>
              <p className="text-sm mb-2 text-gray-200">
                Rotating (Kerr) black holes introduce new relativistic effects beyond those of static black holes.
              </p>
              <ul className="text-sm list-disc ml-5 space-y-1 text-gray-200">
                <li>The event horizon (red) becomes oblate (flattened at poles) due to rotation</li>
                <li>The ergosphere (purple) is a region where space itself is dragged in the direction of rotation</li>
                <li>Objects in the ergosphere cannot remain stationary relative to distant observers</li>
                <li>Frame dragging effect pulls all objects in the direction of rotation</li>
                <li>Energy can actually be extracted from a rotating black hole (Penrose process)</li>
              </ul>
            </div>
          )}
          
          {extremeObjectType === 'merger' && (
            <div>
              <p className="text-sm mb-2 text-gray-200">
                Black hole mergers are among the most energetic events in the universe, releasing energy as gravitational waves.
              </p>
              <ul className="text-sm list-disc ml-5 space-y-1 text-gray-200">
                <li>As black holes orbit, they lose energy through gravitational radiation</li>
                <li>This causes their orbits to decay, bringing them closer together</li>
                <li>The closer they get, the faster they orbit and the stronger the waves</li>
                <li>During merger, up to 5% of their mass is converted to gravitational wave energy</li>
                <li>LIGO detected the first black hole merger in 2015, confirming Einstein's prediction</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    ),
    
    singularity: (
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
            <h4 className="font-medium text-blue-300 mb-2">Kerr's Alternative View:</h4>
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
    )
  };

  // Function to render the fact panel based on active tab
  const renderFactPanel = () => {
    return tabContent[activeTab] || null;
  };
  
  return (
    <div className="flex flex-col w-full p-4 bg-gray-800 rounded-lg text-white">
      <h1 className="text-2xl font-bold mb-4 text-white">Interactive Relativity Theory Visualizer</h1>
      
      {/* Tab navigation */}
      <div className="flex flex-wrap border-b border-gray-600 mb-4">
        <button
          className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-1 ${activeTab === 'spacetime' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          onClick={() => setActiveTab('spacetime')}
        >
          <Layers size={16} className="inline mr-1" />
          Spacetime Curvature
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-1 ${activeTab === 'particles' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          onClick={() => setActiveTab('particles')}
        >
          <Orbit size={16} className="inline mr-1" />
          Particle Geodesics
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-1 ${activeTab === 'waves' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          onClick={() => setActiveTab('waves')}
        >
          <Waves size={16} className="inline mr-1" />
          Gravitational Waves
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-1 ${activeTab === 'observer' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          onClick={() => setActiveTab('observer')}
        >
          <Eye size={16} className="inline mr-1" />
          Observer View
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-1 ${activeTab === 'extreme' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          onClick={() => setActiveTab('extreme')}
        >
          <LifeBuoy size={16} className="inline mr-1" />
          Extreme Objects
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'singularity' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          onClick={() => setActiveTab('singularity')}
        >
          <LocateFixed size={16} className="inline mr-1" />
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
            {(activeTab === 'spacetime' || activeTab === 'particles' || activeTab === 'waves') && (
              <div className="absolute top-2 right-2 flex space-x-2">
                <button 
                  className="p-2 bg-gray-700 rounded-full hover:bg-gray-600"
                  onClick={() => setViewAngle((prev) => (prev + 15) % 360)}
                >
                  <Camera size={16} color="white" />
                </button>
              </div>
            )}
          </div>
          
          {/* Fact panel */}
          {renderFactPanel()}
        </div>
        
        <div className="w-full md:w-2/5 p-4 bg-gray-700 rounded-lg shadow md:ml-4 mt-4 md:mt-0 text-white">
          <h2 className="text-lg font-semibold mb-4 text-white">Parameters</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-200">
              Mass (1-50 units)
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={mass}
              onChange={(e) => setMass(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="text-right text-sm text-gray-200">{mass} units</div>
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
          
          <div className="mt-6 p-3 bg-blue-900 bg-opacity-20 rounded-lg border border-blue-800">
            <h3 className="text-md font-semibold mb-2 text-blue-300">General Relativity Effects</h3>
            <p className="text-sm mb-2 text-gray-200">
              This visualization demonstrates several key effects from Einstein's theory of relativity:
            </p>
            <ul className="text-sm list-disc ml-5 space-y-1 text-gray-200">
              <li>Spacetime curvature around massive objects</li>
              <li>Gravitational time dilation between observers</li>
              <li>Gravitational redshift of light</li>
              <li>Light following curved geodesics</li>
              <li>Proper vs. coordinate distance</li>
              <li>Frame-dragging effects from rotating masses</li>
            </ul>
            <p className="text-sm mt-2 text-gray-200">
              Try placing Observer 2 much closer to the central mass than Observer 1 to see dramatic time dilation effects!
            </p>
            
            <div className="mt-3 pt-3 border-t border-blue-700">
              <h4 className="text-sm font-semibold mb-1 text-blue-300">Additional Facts:</h4>
              <p className="text-xs mb-1 text-gray-200">
                {facts.horizonFact}
              </p>
              <p className="text-xs text-gray-200">
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
// Lightning bolt generation using fractal noise (fBm) approach
// Based on the mathematical equation: r(u) = A + u(B-A) + σΣ2^(-kH)cos(2^k*ω*u + φ_k)n⊥

const defaultConfig = {
  hurstExponent: 0.3,
  sigma: 30,
  octaves: 6,
  omega: 2,
  segments: 50,
  branchProbability: 0.3,
  branchLengthMultiplier: 1, // Longer branches
  branchSigmaMultiplier: 0.5
};

/**
 * Generate a lightning bolt path using fractal Brownian motion
 */
export function generateLightningBolt(
  startPoint,
  endPoint,
  config = {}
) {
  const cfg = { ...defaultConfig, ...config };
  
  // Main direction vector
  const direction = {
    x: endPoint.x - startPoint.x,
    y: endPoint.y - startPoint.y
  };
  
  // Perpendicular unit normal vector
  const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  const normal = {
    x: -direction.y / length,
    y: direction.x / length
  };
  
  const mainPath = [];
  const branches = [];
  
  // Generate main path using fractal noise
  for (let i = 0; i <= cfg.segments; i++) {
    const u = i / cfg.segments;
    
    // Base position along the line A + u(B-A)
    const baseX = startPoint.x + u * direction.x;
    const baseY = startPoint.y + u * direction.y;
    
    // Fractal noise perturbation: σΣ2^(-kH)cos(2^k*ω*u + φ_k)n⊥
    let perturbation = 0;
    for (let k = 0; k < cfg.octaves; k++) {
      const amplitude = Math.pow(2, -k * cfg.hurstExponent);
      const frequency = Math.pow(2, k) * cfg.omega;
      const phase = Math.random() * 2 * Math.PI; // Random phase φ_k
      
      perturbation += amplitude * Math.cos(frequency * u + phase);
    }
    
    // Apply tapering (reduce sigma towards the end)
    const taper = 1 - Math.pow(u, 2);
    const finalPerturbation = cfg.sigma * perturbation * taper;
    
    const point = {
      x: baseX + finalPerturbation * normal.x,
      y: baseY + finalPerturbation * normal.y
    };
    
    mainPath.push(point);
    
    // Generate branches probabilistically
    if (i > 0 && i < cfg.segments && Math.random() < cfg.branchProbability) {
      const branch = generateBranch(
        point,
        direction,
        normal,
        cfg,
        u
      );
      if (branch.length > 0) {
        branches.push(branch);
      }
    }
  }
  
  return { mainPath, branches };
}

/**
 * Generate a branch from a given point
 */
function generateBranch(
  startPoint,
  mainDirection,
  mainNormal,
  config,
  parentU
) {
  const branchLength = config.segments * config.branchLengthMultiplier * (1 - parentU);
  const branchSegments = Math.max(3, Math.floor(branchLength));
  
  // Random branch direction (45-135 degrees from main direction)
  const angle = (Math.PI / 4) + (Math.random() * Math.PI / 2);
  const branchDirection = {
    x: Math.cos(angle) * mainDirection.x - Math.sin(angle) * mainDirection.y,
    y: Math.sin(angle) * mainDirection.x + Math.cos(angle) * mainDirection.y
  };
  
  // Normalize branch direction
  const branchDirLength = Math.sqrt(branchDirection.x * branchDirection.x + branchDirection.y * branchDirection.y);
  branchDirection.x /= branchDirLength;
  branchDirection.y /= branchDirLength;
  
  // Branch end point
  const branchEndPoint = {
    x: startPoint.x + branchDirection.x * branchLength * 20,
    y: startPoint.y + branchDirection.y * branchLength * 20
  };
  
  // Generate branch with reduced parameters
  const branchConfig = {
    ...config,
    segments: branchSegments,
    sigma: config.sigma * config.branchSigmaMultiplier,
    branchProbability: config.branchProbability * 0.5, // Reduce sub-branching
    branchLengthMultiplier: config.branchLengthMultiplier * 0.7
  };
  
  const branchBolt = generateLightningBolt(startPoint, branchEndPoint, branchConfig);
  return branchBolt.mainPath;
}

/**
 * Generate multiple lightning bolts for a more dramatic effect
 */
export function generateLightningStorm(
  screenWidth,
  screenHeight,
  boltCount = 1
) {
  const bolts = [];
  
  for (let i = 0; i < boltCount; i++) {
    // Random start point at the top (above screen for dramatic effect)
    const startX = Math.random() * screenWidth;
    const startY = -50 - Math.random() * 100; // Start above screen
    
    // Random end point much lower on screen for longer bolts
    const endX = startX + (Math.random() - 0.5) * screenWidth * 0.4;
    const endY = screenHeight * (0.7 + Math.random() * 0.25); // Go much further down
    
    const bolt = generateLightningBolt(
      { x: startX, y: startY },
      { x: endX, y: endY },
      {
        // Vary parameters slightly for each bolt
        hurstExponent: 0.25 + Math.random() * 0.15,
        sigma: 25 + Math.random() * 15,
        branchProbability: 0.2 + Math.random() * 0.2
      }
    );
    
    bolts.push(bolt);
  }
  
  return bolts;
}

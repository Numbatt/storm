import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLightningStorm } from '../../utils/lightningGenerator';

export const LightningAnimation = () => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [lightningBolts, setLightningBolts] = useState([]);
  const [screenDimensions, setScreenDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  // Update screen dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setScreenDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const triggerLightning = () => {
      if (screenDimensions.width === 0 || screenDimensions.height === 0) return;
      
      // Generate lightning bolts
      const bolts = generateLightningStorm(
        screenDimensions.width,
        screenDimensions.height,
        Math.random() > 0.7 ? 2 : 1 // Sometimes generate 2 bolts
      );
      
      setLightningBolts(bolts);
      setIsFlashing(true);
      
      // Clear lightning after animation
      setTimeout(() => {
        setIsFlashing(false);
        setLightningBolts([]);
      }, 300);
      
      // Schedule next lightning strike (every 3 seconds)
      setTimeout(triggerLightning, 3500);
    };

    // Initial delay before first lightning
    const initialDelay = 2000;
    const timeout = setTimeout(triggerLightning, initialDelay);

    return () => clearTimeout(timeout);
  }, [screenDimensions]);

  // Convert path points to SVG path string
  const pathToSVG = (points) => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-10">
      {/* Lightning bolts */}
      <AnimatePresence>
        {isFlashing && lightningBolts.length > 0 && (
          <motion.svg
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 w-full h-full"
            style={{ filter: 'drop-shadow(0 0 8px rgba(147, 197, 253, 0.8))' }}
          >
            {lightningBolts.map((bolt, boltIndex) => (
              <g key={boltIndex}>
                {/* Main lightning path */}
                <motion.path
                  d={pathToSVG(bolt.mainPath)}
                  stroke="url(#lightningGradient)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 0.8, 0] }}
                  transition={{ 
                    pathLength: { duration: 0.1, ease: "easeOut" },
                    opacity: { duration: 0.3, times: [0, 0.1, 0.7, 1] }
                  }}
                />
                
                {/* Lightning branches */}
                {bolt.branches.map((branch, branchIndex) => (
                  <motion.path
                    key={branchIndex}
                    d={pathToSVG(branch)}
                    stroke="url(#lightningGradient)"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1, 0.6, 0] }}
                    transition={{ 
                      pathLength: { duration: 0.08, ease: "easeOut", delay: 0.05 },
                      opacity: { duration: 0.25, times: [0, 0.2, 0.8, 1], delay: 0.05 }
                    }}
                  />
                ))}
              </g>
            ))}
            
            {/* Gradient definition for lightning */}
            <defs>
              <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="20%" stopColor="#93c5fd" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
                <stop offset="80%" stopColor="#3b82f6" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#1e40af" stopOpacity="0.5" />
              </linearGradient>
            </defs>
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
};

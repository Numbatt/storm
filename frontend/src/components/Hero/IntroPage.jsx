import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RainAnimation } from './RainAnimation';
import { LightningAnimation } from './LightningAnimation';
import { AnimatedButton } from './AnimatedButton';

export const IntroPage = ({ onEnterApp }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleEnterSite = () => {
    setIsTransitioning(true);
    // Navigate to the main app after a brief transition
    setTimeout(() => {
      onEnterApp();
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden">
      
      {/* Rain Animation */}
      <RainAnimation />
      
      {/* Lightning Animation */}
      <LightningAnimation />
      
      {/* Main Content */}
      <AnimatePresence>
        {!isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="relative z-20 min-h-screen flex items-center justify-center px-4"
          >
            <div className="text-center max-w-4xl mx-auto">
              {/* Main Heading */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="mb-8"
              >
                <h1 className="text-6xl md:text-8xl text-white mb-4">
                  <span className="font-light tracking-wide">Welcome to </span>
                  <motion.span
                    className="italic bg-gradient-to-r from-[#51A3F0] via-[#99CBF7] to-[#E0F1FF] bg-clip-text text-transparent"
                    style={{ fontFamily: 'Georgia, serif' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                  >
                    Storm
                  </motion.span>
                </h1>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed"
              >
                Advanced flood simulation and visualization platform for predictive analysis and emergency response planning
              </motion.p>

              {/* Call to Action Button */}
              <AnimatedButton onClick={handleEnterSite}>
                Enter Storm
              </AnimatedButton>

              {/* Ambient glow effect */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-[#51A3F0]/10 via-[#99CBF7]/5 to-transparent rounded-full blur-3xl -z-10"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transition to main site */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-white text-2xl"
            >
              <span>Loading </span>
              <span 
                className="italic bg-gradient-to-r from-[#51A3F0] via-[#99CBF7] to-[#E0F1FF] bg-clip-text text-transparent"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Storm
              </span>
              ...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

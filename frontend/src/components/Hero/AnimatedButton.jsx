import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedButton = ({ children, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      className="relative px-8 py-4 border border-white/20 rounded-lg bg-gradient-to-r from-transparent to-transparent hover:from-[#51A3F0]/10 hover:to-[#E0F1FF]/10 transition-all duration-300 group overflow-hidden"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.8 }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-[#51A3F0] via-[#99CBF7] to-[#E0F1FF] opacity-0 group-hover:opacity-20 transition-opacity duration-300"
        initial={false}
        animate={{
          background: [
            'linear-gradient(90deg, #51A3F0, #99CBF7, #E0F1FF)',
            'linear-gradient(180deg, #E0F1FF, #BBDCFA, #51A3F0)',
            'linear-gradient(270deg, #99CBF7, #E0F1FF, #74B5F2)',
            'linear-gradient(360deg, #51A3F0, #99CBF7, #E0F1FF)'
          ]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
        initial={false}
      />
      
      {/* Button text */}
      <span className="relative z-10 text-white group-hover:text-white transition-colors duration-300">
        {children}
      </span>
      
      {/* Border glow */}
      <motion.div
        className="absolute inset-0 rounded-lg border border-[#51A3F0]/0 group-hover:border-[#51A3F0]/50 transition-all duration-300"
        whileHover={{
          boxShadow: "0 0 20px rgba(81,163,240,0.3)"
        }}
      />
    </motion.button>
  );
};

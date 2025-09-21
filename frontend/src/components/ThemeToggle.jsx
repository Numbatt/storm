import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
        className={`
        relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out
        ${isDark 
          ? 'bg-gradient-to-r from-[#51A3F0] to-[#99CBF7]' 
          : 'bg-gray-300'
        }
        focus:outline-none focus:ring-2 focus:ring-[#51A3F0]/50 focus:ring-offset-2 focus:ring-offset-gray-900 dark:focus:ring-offset-gray-900 light:focus:ring-offset-white
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className={`
          absolute top-0.5 w-5 h-5 rounded-full shadow-lg
          ${isDark ? 'bg-white' : 'bg-white'}
        `}
        animate={{
          x: isDark ? 26 : 2
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
      >
        {/* Icon inside the toggle */}
        <div className="flex items-center justify-center h-full">
          {isDark ? (
            // Moon icon for dark mode
            <svg
              className="w-3 h-3 text-gray-800"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            // Sun icon for light mode
            <svg
              className="w-3 h-3 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </motion.div>
    </motion.button>
  )
}

export default ThemeToggle

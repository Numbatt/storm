import React from 'react';

const RainDrop = ({ left, delay, duration }) => {
  return (
    <div
      className="absolute w-0.5"
      style={{
        left: `${left}%`,
        height: '120px',
        animation: `rainFall ${duration}s linear ${delay}s infinite both`,
        background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.3), transparent)',
        transformOrigin: 'top center',
        opacity: 0, // start hidden until animation kicks in
      }}
    />
  );
};

export const RainAnimation = () => {
  const rainDrops = Array.from({ length: 150 }, (_, i) => ({
    id: i,
    left: Math.random() * 120 - 10, // Allow rain to start from outside the screen
    delay: Math.random() * 3 + 0.5, // Add minimum delay to prevent immediate visibility
    duration: 0.8 + Math.random() * 0.7,
  }));

  return (
    <>
      <style>{`
        @keyframes rainFall {
          0% {
            transform: rotate(15deg) translateY(-150px) translateX(-30px);
            opacity: 0;
          }
          5% {
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: rotate(15deg) translateY(calc(100vh + 50px)) translateX(40px);
            opacity: 0;
          }
        }
      `}</style>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {rainDrops.map((drop) => (
          <RainDrop
            key={drop.id}
            left={drop.left}
            delay={drop.delay}
            duration={drop.duration}
          />
        ))}
      </div>
    </>
  );
};

import { motion } from 'framer-motion';

export const AISphere = () => {
  return (
    <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
      {/* Outer Glow */}
      <motion.div
        className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* The Core Sphere */}
      <div className="relative w-32 h-32">
        {/* Layer 1: Base Gradient */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-blue-400 to-indigo-600 opacity-80"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Layer 2: Inner Shimmer */}
        <motion.div
          className="absolute inset-1 rounded-full border border-white/20 bg-primary/10 overflow-hidden"
          animate={{
            boxShadow: [
              "inset 0 0 20px rgba(255,255,255,0.2)",
              "inset 0 0 40px rgba(255,255,255,0.4)",
              "inset 0 0 20px rgba(255,255,255,0.2)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Moving highlights to simulate refraction */}
          <motion.div
            className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-50%', '50%'],
              y: ['-50%', '50%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </motion.div>

        {/* Organic Distortion Layers (SVG) */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full scale-125 mix-blend-screen overflow-visible">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {[...Array(3)].map((_, i) => (
            <motion.circle
              key={i}
              cx="50"
              cy="50"
              r={40 + i * 2}
              fill="none"
              stroke={i === 0 ? "rgba(75, 226, 119, 0.6)" : i === 1 ? "rgba(56, 189, 248, 0.4)" : "rgba(129, 140, 248, 0.2)"}
              strokeWidth="0.5"
              strokeDasharray="1 2"
              filter="url(#glow)"
              animate={{
                rotate: i % 2 === 0 ? 360 : -360,
                scale: [1, 1.1, 0.9, 1],
                rx: [0, 4, 8, 4, 0], // Simulating organic distortion
              }}
              transition={{
                rotate: { duration: 5 + i * 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 3 + i, repeat: Infinity, ease: "easeInOut" },
              }}
            />
          ))}

          {/* Particle dots inside */}
          {[...Array(12)].map((_, i) => (
            <motion.circle
              key={`dot-${i}`}
              cx={50 + Math.cos(i) * 30}
              cy={50 + Math.sin(i) * 30}
              r="1"
              fill="white"
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.2, 0.8],
                cx: [50 + Math.cos(i) * 30, 50 + Math.cos(i) * 35, 50 + Math.cos(i) * 30],
                cy: [50 + Math.sin(i) * 30, 50 + Math.sin(i) * 35, 50 + Math.sin(i) * 30],
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </svg>

        {/* Core Pulsing Light */}
        <motion.div
          className="absolute inset-4 rounded-full bg-white/40 blur-[10px]"
          animate={{
            scale: [0.8, 1.3, 0.8],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );
};

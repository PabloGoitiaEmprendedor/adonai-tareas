import { motion } from "framer-motion";

interface OrbitItem {
  text: string;
  radius: number;
  startAngle: number;
}

const ORBIT_ITEMS: OrbitItem[] = [
  // Ring 1 (Radius 105, 2 items: 0, 180 degrees)
  { text: "Tareas", radius: 105, startAngle: 0 },
  { text: "Metas", radius: 105, startAngle: 180 },

  // Ring 2 (Radius 145, 3 items: 45, 165, 285 degrees)
  { text: "Recordatorios", radius: 145, startAngle: 45 },
  { text: "Fácil de usar", radius: 145, startAngle: 165 },
  { text: "Priorización", radius: 145, startAngle: 285 },

  // Ring 3 (Radius 185, 3 items: 90, 210, 330 degrees)
  { text: "Calendarios", radius: 185, startAngle: 90 },
  { text: "Tareas con amigos", radius: 185, startAngle: 210 },
  { text: "Web y escritorio", radius: 185, startAngle: 330 },

  // Ring 4 (Radius 225, 3 items: 135, 255, 15 degrees)
  { text: "Lista siempre visible", radius: 225, startAngle: 135 },
  { text: "IA integrada", radius: 225, startAngle: 255 },
  { text: "Integraciones", radius: 225, startAngle: 15 },
];

const RING_RADII = [105, 145, 185, 225];
const ORBIT_SPEED = 55; // 55 seconds per full rotation - slow and calm

export default function OrbitalSystem() {
  return (
    <>
      {/* Mobile & Tablet: scaled orbital system */}
      <div className="relative mx-auto flex h-[320px] w-[320px] items-center justify-center lg:hidden">
        <div className="absolute inset-0 scale-[0.61] origin-center">
          {/* Rings */}
          {RING_RADII.map((r) => (
            <div
              key={r}
              className="absolute rounded-full border border-dashed border-[#5B7CFA]/12"
              style={{
                width: r * 2,
                height: r * 2,
                left: `calc(50% - ${r}px)`,
                top: `calc(50% - ${r}px)`,
              }}
            />
          ))}

          {/* Center logo */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute inset-0 scale-150 rounded-full bg-[#5B7CFA]/15 blur-2xl" />
            <div className="relative h-20 w-20 rounded-[24px] bg-white shadow-[0_18px_45px_rgba(91,124,250,0.2)]">
              <img src="/logo.png" alt="Adonai" className="h-full w-full rounded-[24px] object-contain" />
            </div>
          </div>

          {/* Orbiting items */}
          {ORBIT_ITEMS.map((item, i) => {
            const r = item.radius;
            const startAngle = item.startAngle;

            return (
              <motion.div
                key={item.text}
                className="absolute"
                style={{
                  width: r * 2,
                  height: r * 2,
                  left: `calc(50% - ${r}px)`,
                  top: `calc(50% - ${r}px)`,
                }}
                initial={{ rotate: startAngle, opacity: 0 }}
                animate={{ rotate: startAngle + 360, opacity: 1 }}
                transition={{
                  rotate: { duration: ORBIT_SPEED, repeat: Infinity, ease: "linear" },
                  opacity: { duration: 0.5, delay: 0.15 + i * 0.05 },
                }}
              >
                <motion.div
                  className="absolute left-1/2 top-0 -translate-x-1/2"
                  initial={{ rotate: -startAngle }}
                  animate={{ rotate: -(startAngle + 360) }}
                  transition={{ duration: ORBIT_SPEED, repeat: Infinity, ease: "linear" }}
                >
                  <span className="inline-block whitespace-nowrap rounded-full border border-[#5B7CFA]/18 bg-white/92 px-3 py-1.5 text-xs font-bold text-[#151820]/70 shadow-sm backdrop-blur-sm">
                    {item.text}
                  </span>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Desktop: full-size orbital system */}
      <div className="relative mx-auto hidden h-[520px] w-[520px] lg:block">
        {RING_RADII.map((r) => (
          <div
            key={r}
            className="absolute rounded-full border border-dashed border-[#5B7CFA]/8"
            style={{
              width: r * 2,
              height: r * 2,
              left: `calc(50% - ${r}px)`,
              top: `calc(50% - ${r}px)`,
            }}
          />
        ))}

        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 scale-150 rounded-full bg-[#5B7CFA]/15 blur-2xl" />
          <div className="relative h-20 w-20 rounded-[24px] bg-white shadow-[0_18px_45px_rgba(91,124,250,0.2)]">
            <img src="/logo.png" alt="Adonai" className="h-full w-full rounded-[24px] object-contain" />
          </div>
        </div>

        {ORBIT_ITEMS.map((item, i) => {
          const r = item.radius;
          const startAngle = item.startAngle;

          return (
            <motion.div
              key={item.text}
              className="absolute"
              style={{
                width: r * 2,
                height: r * 2,
                left: `calc(50% - ${r}px)`,
                top: `calc(50% - ${r}px)`,
              }}
              initial={{ rotate: startAngle, opacity: 0, scale: 0.8 }}
              animate={{ rotate: startAngle + 360, opacity: 1, scale: 1 }}
              transition={{
                rotate: { duration: ORBIT_SPEED, repeat: Infinity, ease: "linear" },
                opacity: { duration: 0.5, delay: 0.2 + i * 0.05 },
                scale: { duration: 0.5, delay: 0.2 + i * 0.05 },
              }}
            >
              <motion.div
                className="absolute left-1/2 top-0 -translate-x-1/2"
                initial={{ rotate: -startAngle }}
                animate={{ rotate: -(startAngle + 360) }}
                transition={{ duration: ORBIT_SPEED, repeat: Infinity, ease: "linear" }}
              >
                <span className="inline-block whitespace-nowrap rounded-full border border-[#5B7CFA]/18 bg-white/92 px-3 py-1.5 text-xs font-bold text-[#151820]/70 shadow-sm backdrop-blur-sm">
                  {item.text}
                </span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

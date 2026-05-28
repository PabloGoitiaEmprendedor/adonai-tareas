import { motion } from "framer-motion";

const ITEMS = [
  "Tareas",
  "Recordatorios",
  "Calendarios",
  "Lista de tareas siempre visible",
  "Tareas con amigos y grupos",
  "Inteligencia artificial",
  "En móvil y ordenador",
];

const RADII = [125, 175, 110, 210, 150, 220, 170];
const SPEEDS = [26, 32, 30, 38, 28, 42, 35];
const RING_RADII = [120, 170, 215];
const START_ANGLES = ITEMS.map((_, i) => (360 / ITEMS.length) * i);

export default function OrbitalSystem() {
  return (
    <>
      {/* Mobile: simple pill grid */}
      <div className="flex flex-wrap justify-center gap-2 lg:hidden">
        {ITEMS.map((item) => (
          <motion.span
            key={item}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-full border border-[#5B7CFA]/18 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#151820]/65 shadow-sm"
          >
            {item}
          </motion.span>
        ))}
      </div>

      {/* Desktop: orbital system */}
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
            <img
              src="/logo.png"
              alt="Adonai"
              className="h-full w-full rounded-[24px] object-contain"
            />
          </div>
        </div>

        {ITEMS.map((item, i) => {
          const r = RADII[i];
          const speed = SPEEDS[i];
          const startAngle = START_ANGLES[i];

          return (
            <motion.div
              key={item}
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
                rotate: {
                  duration: speed,
                  repeat: Infinity,
                  ease: "linear",
                },
                opacity: {
                  duration: 0.5,
                  delay: 0.2 + i * 0.07,
                },
                scale: {
                  duration: 0.5,
                  delay: 0.2 + i * 0.07,
                },
              }}
            >
              <motion.div
                className="absolute left-1/2 top-0 -translate-x-1/2"
                initial={{ rotate: -startAngle }}
                animate={{ rotate: -(startAngle + 360) }}
                transition={{
                  duration: speed,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <span className="inline-block whitespace-nowrap rounded-full border border-[#5B7CFA]/18 bg-white/92 px-3 py-1.5 text-xs font-bold text-[#151820]/70 shadow-sm backdrop-blur-sm">
                  {item}
                </span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

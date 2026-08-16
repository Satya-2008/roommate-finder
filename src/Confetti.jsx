import { useMemo } from "react";

const COLORS = ["#8b5cf6", "#ec4899", "#22d3ee", "#34d399", "#fbbf24"];

function Confetti({ count = 70 }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: 2.4 + Math.random() * 1.6,
      delay: Math.random() * 0.5,
      rotate: Math.random() * 360,
    }));
  }, [count]);

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default Confetti;
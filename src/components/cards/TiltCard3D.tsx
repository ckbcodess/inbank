"use client";

import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, type MotionValue } from "framer-motion";

interface TiltContextType {
  glareX: MotionValue<string>;
  glareY: MotionValue<string>;
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  isHovered: boolean;
}

const TiltContext = createContext<TiltContextType | null>(null);
export const useTiltContext = () => useContext(TiltContext);

interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  maxRotation?: number; // Maximum tilt angle in degrees, default 12
}

export function TiltCard3D({
  children,
  className = "",
  maxRotation = 12,
}: TiltCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Normalized mouse coordinates from -1 to 1
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Weighted spring physics for physical mass and smooth inertia
  const springConfig = { stiffness: 130, damping: 24, mass: 1.4 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Rotation transforms: Y movement drives rotateX (inverted), X movement drives rotateY
  const rotateX = useTransform(springY, [-1, 1], [maxRotation, -maxRotation]);
  const rotateY = useTransform(springX, [-1, 1], [-maxRotation, maxRotation]);

  // Dynamic specular glare position tracking mouse
  const glareX = useTransform(springX, [-1, 1], ["0%", "100%"]);
  const glareY = useTransform(springY, [-1, 1], ["0%", "100%"]);

  const overlaySheen = useMotionTemplate`radial-gradient(circle 520px at ${glareX} ${glareY}, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.06) 60%, transparent 80%)`;
  const colorDodgeSheen = useMotionTemplate`radial-gradient(circle 320px at ${glareX} ${glareY}, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 40%, transparent 75%)`;
  const borderSpecular = useMotionTemplate`radial-gradient(circle 380px at ${glareX} ${glareY}, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 30%, rgba(255,255,255,0.08) 65%, transparent 100%)`;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();

      // Calculate position relative to card center from -1 to 1
      const normalizedX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const normalizedY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      x.set(normalizedX);
      y.set(normalizedY);
    },
    [x, y]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <TiltContext.Provider value={{ glareX, glareY, springX, springY, isHovered }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative select-none cursor-default [perspective:1000px] ${className}`}
      >
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          className="relative size-full rounded-[20px] will-change-transform overflow-hidden"
        >
          {children}

          {/* Dynamic Specular Card Sheen (Overlay reflection) with enhanced blur diffusion */}
          <motion.div
            className="pointer-events-none absolute -inset-2 rounded-[24px] mix-blend-overlay blur-[20px] transition-opacity duration-300 z-10"
            style={{
              opacity: isHovered ? 0.55 : 0,
              background: overlaySheen,
            }}
          />

          {/* Core Specular Sheen (Color-Dodge) with smooth silky blur */}
          <motion.div
            className="pointer-events-none absolute -inset-2 rounded-[24px] mix-blend-color-dodge blur-[28px] transition-opacity duration-300 z-10"
            style={{
              opacity: isHovered ? 0.35 : 0,
              background: colorDodgeSheen,
            }}
          />

          {/* 1.5px Base Ambient Rim Stroke */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[20px] z-20 transition-opacity duration-300"
            style={{
              boxShadow: "inset 0 0 0 1.5px rgba(255, 255, 255, 0.14)",
            }}
          />

          {/* 1.5px Dynamic Light-Reactive Specular Stroke (Tracks mouse glare position) */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[20px] p-[1.5px] z-20"
            style={{
              background: borderSpecular,
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              opacity: isHovered ? 1 : 0.45,
              transition: "opacity 0.25s ease-out",
            }}
          />
        </motion.div>
      </div>
    </TiltContext.Provider>
  );
}

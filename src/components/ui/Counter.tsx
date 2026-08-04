"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useMotionValue, useReducedMotion } from "framer-motion";

export function Counter({
  value,
  suffix = "",
  duration = 1.8,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const motionValue = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const isDecimal = !Number.isInteger(value);

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      if (ref.current) ref.current.textContent = `${value}${suffix}`;
      return;
    }

    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        if (!ref.current) return;
        ref.current.textContent = `${isDecimal ? latest.toFixed(1) : Math.round(latest).toLocaleString()}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [isInView, motionValue, value, suffix, duration, isDecimal, prefersReducedMotion]);

  return <span ref={ref}>0{suffix}</span>;
}

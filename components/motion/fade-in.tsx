"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Pixels of upward travel during the fade. Keep small. */
  travel?: number;
};

export function FadeIn({
  children,
  delay = 0,
  className,
  travel = 8
}: Props) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: travel }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{
        duration: 0.7,
        delay: delay / 1000,
        ease: [0.22, 0.61, 0.36, 1]
      }}
    >
      {children}
    </motion.div>
  );
}

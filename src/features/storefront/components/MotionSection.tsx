"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

type ItemProps = {
  children: ReactNode;
  className?: string;
  index?: number;
  /** Use inside horizontal scroll strips — avoids whileInView hiding off-screen cards */
  instant?: boolean;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function MotionSection({
  children,
  className,
  delay = 0,
}: SectionProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <section className={className}>{children}</section>;
  }

  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.5, ease, delay }}
    >
      {children}
    </motion.section>
  );
}

export function MotionRevealItem({
  children,
  className,
  index = 0,
  instant = false,
}: ItemProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion || instant) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -5% 0px" }}
      transition={{
        duration: 0.45,
        ease,
        delay: Math.min(index * 0.06, 0.3),
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionHoverLift({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}

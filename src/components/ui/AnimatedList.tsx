'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in seconds between each child animation */
  staggerDelay?: number;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

/**
 * Wraps children in staggered fade-in + slide-up animations.
 * Pass grid classes via `className`. Each direct child gets animated individually.
 */
export function AnimatedList({
  children,
  className,
  staggerDelay,
}: AnimatedListProps) {
  const variants = staggerDelay
    ? {
        ...containerVariants,
        visible: {
          transition: { staggerChildren: staggerDelay },
        },
      }
    : containerVariants;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child) =>
        child ? (
          <motion.div variants={itemVariants}>{child}</motion.div>
        ) : null
      )}
    </motion.div>
  );
}

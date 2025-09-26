"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

const sizeStyles = {
  sm: {
    container: "h-8 gap-1",
    button: "h-8 w-8 text-sm",
    value: "min-w-[2.5rem] text-sm",
  },
  md: {
    container: "h-10 gap-2",
    button: "h-10 w-10 text-base",
    value: "min-w-[3rem] text-base",
  },
} as const;

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max,
  size = "md",
  className,
}: QuantityStepperProps) {
  const styles = sizeStyles[size];
  const minValue = Number.isFinite(min) ? min : 0;
  const maxValue = Number.isFinite(max as number) ? (max as number) : undefined;

  const clamp = (next: number) => {
    const withMin = Math.max(next, minValue);
    if (typeof maxValue === "number") {
      return Math.min(withMin, maxValue);
    }
    return withMin;
  };

  const isAtMin = value <= minValue;
  const isAtMax = typeof maxValue === "number" ? value >= maxValue : false;

  const handleDecrease = () => {
    const next = clamp(value - 1);
    if (next !== value) {
      onChange(next);
    }
  };

  const handleIncrease = () => {
    const next = clamp(value + 1);
    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-white/10 bg-black/20 px-2",
        styles.container,
        className,
      )}
      role="group"
      aria-label="Selector de cantidad"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDecrease}
        aria-label="Disminuir"
        title="Quitar uno"
        disabled={isAtMin}
        className={cn("rounded-full", styles.button)}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn("text-center font-semibold text-white", styles.value)}
      >
        {clamp(value)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleIncrease}
        aria-label="Aumentar"
        title="Añadir uno"
        disabled={isAtMax}
        className={cn("rounded-full", styles.button)}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

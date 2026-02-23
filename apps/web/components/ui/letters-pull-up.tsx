"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@workspace/ui/lib/utils";

type LettersPullUpProps = {
  text: string;
  className?: string;
};

export function LettersPullUp({ text, className }: LettersPullUpProps) {
  const chars = text.split("");
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <span ref={ref} aria-label={text} className={cn("inline-flex flex-wrap justify-center", className)}>
      {chars.map((char, i) => (
        <motion.span
          key={`${char}-${i}-${text}`}
          initial={{ y: 10, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: i * 0.03, duration: 0.32, ease: "easeOut" }}
          className="inline-block"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { HTMLAttributes } from "react";

type TagProps = HTMLAttributes<HTMLSpanElement>;

export function Tag({ className, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex justify-center items-center px-3 py-1 text-xs font-medium rounded-full",
        className,
      )}
      {...props}
    />
  );
}

export default Tag;


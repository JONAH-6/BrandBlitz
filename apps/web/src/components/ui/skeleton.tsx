import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-[var(--muted)] motion-safe:animate-pulse motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}


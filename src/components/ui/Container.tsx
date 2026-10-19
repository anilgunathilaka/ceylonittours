import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-(--container-content) px-3 sm:px-5 lg:px-8", className)}>
      {children}
    </Tag>
  );
}

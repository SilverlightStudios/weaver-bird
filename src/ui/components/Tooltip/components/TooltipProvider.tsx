import type { ReactNode } from "react";

export interface TooltipProviderProps {
  children: ReactNode;
  delayDuration?: number;
}

export function TooltipProvider({
  children,
  delayDuration: _delayDuration,
}: TooltipProviderProps) {
  // This is mainly for API compatibility with shadcn
  // Our implementation doesn't need a global provider
  return <>{children}</>;
}

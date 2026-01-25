import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useDrawerContext } from "./DrawerContext";

export const DrawerPortal = ({ children }: { children: ReactNode }) => {
  const { portalContainer } = useDrawerContext();
  // In Storybook iframes, portal to the iframe's body or custom container
  const portalTarget = portalContainer ?? document.body;
  return createPortal(children, portalTarget);
};

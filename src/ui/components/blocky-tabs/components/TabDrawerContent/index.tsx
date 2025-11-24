import React from "react";
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "../../../Drawer/Drawer";
import { ZoneId } from "../../types";
import { ResizeHandle } from "../../ResizeHandle";
import s from "./TabDrawerContent.module.scss";

interface TabDrawerContentProps {
  zone: ZoneId;
  label: string;
  animationClass: string;
  drawerStyle: React.CSSProperties;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const TabDrawerContent: React.FC<TabDrawerContentProps> = ({
  zone,
  label,
  animationClass,
  drawerStyle,
  onResizeMouseDown,
  children,
}) => {
  return (
    <DrawerContent
      className={animationClass}
      style={{ ...drawerStyle, position: "relative" }}
    >
      <DrawerClose className={s.closeButton}>×</DrawerClose>
      <DrawerHeader>
        <DrawerTitle>{label}</DrawerTitle>
        <DrawerDescription>{`Tab located in ${zone} zone`}</DrawerDescription>
      </DrawerHeader>
      <div className={s.content}>{children}</div>

      <ResizeHandle zone={zone} onMouseDown={onResizeMouseDown} />
    </DrawerContent>
  );
};

import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Drawer } from "../../../Drawer/Drawer";
import { ZoneId, TabItem } from "../../types";
import { isHorizontalZone } from "../../constants";
import {
  useDrawerAnimation,
  useTabTranslation,
  useDrawerResize,
  useDrawerDimensions,
} from "../../hooks";
import { getDrawerMargin } from "../../utils";
import { Tab } from "../Tab";
import { TabDrawerContent } from "../TabDrawerContent";
import s from "./DraggableTab.module.scss";

interface DraggableTabProps {
  tab: TabItem;
  zone: ZoneId;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  activeZone: ZoneId | null;
  portalContainer: HTMLElement | null;
  drawerSize: number;
  onDrawerResize: (size: number) => void;
}

export const DraggableTab: React.FC<DraggableTabProps> = ({
  tab,
  zone,
  isActive,
  onClick,
  onClose,
  activeZone,
  portalContainer,
  drawerSize,
  onDrawerResize,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id, data: { zone, tab } });

  const [isHovered, setIsHovered] = useState(false);

  const { animationClass, closingZone, closingViaResizeRef } =
    useDrawerAnimation(isActive, zone, activeZone);

  const tabTranslation = useTabTranslation(
    zone,
    isActive,
    isHovered,
    activeZone,
    closingZone,
  );

  const handleResizeMouseDown = useDrawerResize(
    zone,
    drawerSize,
    onDrawerResize,
    onClose,
    closingViaResizeRef,
  );

  const drawerDimensions = useDrawerDimensions(zone, drawerSize);

  const outerWrapperStyle: React.CSSProperties = {
    transform: tabTranslation || undefined,
  };

  const dndWrapperStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const drawerStyle: React.CSSProperties = {
    overflow: "hidden",
    ...drawerDimensions,
    position: isHorizontalZone(zone) ? "relative" : "absolute",
    ...getDrawerMargin(zone),
  };

  return (
    <>
      <div
        className={`${s.wrapper} ${isHovered ? s.hovered : ""}`}
        style={outerWrapperStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          ref={setNodeRef}
          style={dndWrapperStyle}
          {...attributes}
          {...listeners}
          className={s.tabWrapper}
          data-zone={zone}
        >
          <Tab
            zone={zone}
            label={tab.label}
            icon={tab.icon}
            color={tab.color}
            isActive={isActive}
            isDragging={isDragging}
            isHovered={isHovered}
            onClick={onClick}
          />
        </div>

        {/* Non-interactive visual tail - rendered after tab for natural stacking */}
        {!isDragging && (
          <div
            className={`${s.tail} ${isActive ? s.tailActive : ""}`}
            data-zone={zone}
            style={{ backgroundColor: tab.color || "var(--color-block)" }}
          />
        )}
      </div>

      <Drawer
        open={isActive}
        onOpenChange={(open) => !open && onClick()}
        position={zone}
        portalContainer={portalContainer}
        modal={false}
      >
        <TabDrawerContent
          zone={zone}
          label={tab.label}
          animationClass={animationClass}
          drawerStyle={drawerStyle}
          onResizeMouseDown={handleResizeMouseDown}
        >
          {tab.content}
        </TabDrawerContent>
      </Drawer>
    </>
  );
};

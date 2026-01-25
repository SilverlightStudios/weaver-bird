import React from "react";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { ZoneId, TabItem } from "../../types";
import { DRAWER_DEFAULT_SIZE } from "../../constants";
import { DraggableTab } from "../DraggableTab";
import s from "./SortableTabZone.module.scss";

interface SortableTabZoneProps {
  id: ZoneId;
  items: TabItem[];
  activeTabId: string | null;
  onTabClick: (id: string) => void;
  showZones?: boolean;
  style?: React.CSSProperties;
  activeZone: ZoneId | null;
  portalContainer: HTMLElement | null;
  drawerSizes: Record<string, number>;
  onDrawerResize: (tabId: string, size: number) => void;
  setDrawerSizes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export const SortableTabZone: React.FC<SortableTabZoneProps> = ({
  id,
  items,
  activeTabId,
  onTabClick,
  showZones,
  style,
  activeZone,
  portalContainer,
  drawerSizes,
  onDrawerResize,
  setDrawerSizes,
}) => {
  const strategy =
    id === "top" || id === "bottom"
      ? horizontalListSortingStrategy
      : verticalListSortingStrategy;

  // Make the zone itself droppable
  const { setNodeRef } = useDroppable({
    id: id,
  });

  const zoneClass =
    id === "top"
      ? s.zoneTop
      : id === "bottom"
        ? s.zoneBottom
        : id === "left"
          ? s.zoneLeft
          : s.zoneRight;

  const isEmpty = items.length === 0;
  const className = [zoneClass, showZones && s.debug, isEmpty && s.empty]
    .filter(Boolean)
    .join(" ");

  return (
    <SortableContext id={id} items={items.map((t) => t.id)} strategy={strategy}>
      <div ref={setNodeRef} className={className} style={style}>
        {items.map((tab) => (
          <DraggableTab
            key={tab.id}
            tab={tab}
            zone={id}
            isActive={activeTabId === tab.id}
            activeZone={activeZone}
            portalContainer={portalContainer}
            drawerSize={
              drawerSizes[tab.id] ??
              tab.defaultDrawerSize ??
              DRAWER_DEFAULT_SIZE
            }
            onDrawerResize={(size) => onDrawerResize(tab.id, size)}
            onClick={() => {
              onTabClick(activeTabId === tab.id ? "" : tab.id);
            }}
            onClose={() => {
              onTabClick("");
              setDrawerSizes((prev) => {
                const newSizes = { ...prev };
                delete newSizes[tab.id];
                return newSizes;
              });
            }}
          />
        ))}
      </div>
    </SortableContext>
  );
};

import React, { useState, useTransition } from "react";
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DropAnimation} from "@dnd-kit/core";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import s from "./BlockyTabs.module.scss";
import type { ZoneId, TabItem, BlockyTabsProps } from "./types";
import {
  DND_ACTIVATION_DISTANCE,
  DRAWER_DEFAULT_SIZE,
  ZONE_SHRINK_RATIO,
  CANVAS_SHRINK_RATIO,
  isHorizontalZone,
} from "./constants";
import { SortableTabZone } from "./components/SortableTabZone";
import { Tab } from "./components/Tab";

export const BlockyTabs: React.FC<BlockyTabsProps> = ({
  initialTabs,
  showZones = false,
  children,
  fullscreen = false,
}) => {
  const [items, setItems] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<TabItem | null>(null);
  const [drawerSizes, setDrawerSizes] = useState<Record<string, number>>({});
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  // React 19: useTransition for non-blocking drawer content rendering
  // This marks drawer content updates as low-priority, keeping the UI responsive
  // during tab switches while the drawer rotation animation plays
  const [_isPending, startTransition] = useTransition();

  // Sync items when initialTabs changes
  React.useEffect(() => {
    setItems(initialTabs);
  }, [initialTabs]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DND_ACTIVATION_DISTANCE },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findContainer = (id: string): ZoneId | undefined => {
    if (id in items) return id as ZoneId;
    return (Object.keys(items) as ZoneId[]).find((key) =>
      items[key].find((item) => item.id === id),
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current as
      | { tab: TabItem }
      | undefined;
    if (activeData) setActiveDragItem(activeData.tab);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over?.id || active.id === over.id) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer)
      return;

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((i) => i.id === active.id);
      const overIndex = overItems.findIndex((i) => i.id === over.id);

      const newIndex =
        over.id in prev
          ? overItems.length + 1
          : overIndex >= 0
            ? overIndex +
              (over &&
              active.rect.current.translated &&
              active.rect.current.translated.top >
                over.rect.top + over.rect.height
                ? 1
                : 0)
            : overItems.length + 1;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((item) => item.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over?.id as string);

    if (activeContainer && overContainer && activeContainer === overContainer) {
      const activeIndex = items[activeContainer].findIndex(
        (i) => i.id === active.id,
      );
      const overIndex = items[overContainer].findIndex(
        (i) => i.id === over?.id,
      );

      if (activeIndex !== overIndex) {
        setItems((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(
            prev[activeContainer],
            activeIndex,
            overIndex,
          ),
        }));
      }
    }

    setActiveDragItem(null);
  };

  const activeZone: ZoneId | null = activeTabId
    ? (findContainer(activeTabId) ?? null)
    : null;

  const getActiveDrawerSize = () => {
    if (!activeTabId) return DRAWER_DEFAULT_SIZE;

    // If we have a stored size, use it
    if (drawerSizes[activeTabId]) {
      return drawerSizes[activeTabId];
    }

    // Otherwise, find the tab and use its defaultDrawerSize
    const activeTab = Object.values(items)
      .flat()
      .find((tab) => tab.id === activeTabId);

    return activeTab?.defaultDrawerSize || DRAWER_DEFAULT_SIZE;
  };

  const getZoneStyle = (zone: ZoneId): React.CSSProperties => {
    const style: React.CSSProperties = { transition: "all 300ms ease" };
    if (!activeZone) return style;

    const activeSize = getActiveDrawerSize();
    const unit = isHorizontalZone(activeZone) ? "vw" : "vh";
    const drawerSize = `${activeSize}${unit}`;
    const zoneShrink = `${activeSize * ZONE_SHRINK_RATIO}${unit}`;

    if (zone === activeZone) {
      const direction = ["left", "top"].includes(zone) ? "" : "-";
      style.transform = isHorizontalZone(zone)
        ? `translateX(${direction}${drawerSize})`
        : `translateY(${direction}${drawerSize})`;
    } else {
      const isPerpendicular =
        (isHorizontalZone(activeZone) && !isHorizontalZone(zone)) ||
        (!isHorizontalZone(activeZone) && isHorizontalZone(zone));

      if (isPerpendicular) {
        style[activeZone] = zoneShrink;
      }
    }

    return style;
  };

  const getCanvasStyle = (): React.CSSProperties => {
    if (!activeZone) return {};

    const activeSize = getActiveDrawerSize();
    const shrinkAmount = `${activeSize * CANVAS_SHRINK_RATIO}${isHorizontalZone(activeZone) ? "vw" : "vh"}`;

    return {
      [activeZone]: shrinkAmount,
      transition: "all 300ms ease",
      overflow: "hidden",
    };
  };

  const handleTabClick = (id: string) => {
    // React 19 optimization: Wrap tab state change in startTransition
    // This tells React that opening/closing drawers is non-urgent, allowing:
    // 1. Rotation animations to run smoothly (high priority)
    // 2. Content loading to happen in background (low priority)
    // 3. User interactions (clicks, typing) to stay responsive
    startTransition(() => {
      setActiveTabId(id || null);
    });
  };
  const handleDrawerResize = (tabId: string, size: number) =>
    setDrawerSizes((prev) => ({ ...prev, [tabId]: size }));

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: "0.5" } },
    }),
  };

  const zones: ZoneId[] = ["top", "left", "right", "bottom"];

  return (
    <div className={s.root}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className={`${s.container} ${fullscreen ? s.fullscreen : ""}`}
          ref={setPortalContainer}
        >
          <div className={s.zonesWrapper}>
            {zones.map((zoneId) => (
              <SortableTabZone
                key={zoneId}
                id={zoneId}
                items={items[zoneId]}
                activeTabId={activeTabId}
                onTabClick={handleTabClick}
                showZones={showZones}
                style={getZoneStyle(zoneId)}
                activeZone={activeZone}
                portalContainer={portalContainer}
                drawerSizes={drawerSizes}
                onDrawerResize={handleDrawerResize}
                setDrawerSizes={setDrawerSizes}
              />
            ))}
          </div>

          <div className={s.canvas} style={getCanvasStyle()}>
            {children ||
              (!activeTabId && (
                <div style={{ opacity: 0.5 }}>Select a tab</div>
              ))}
          </div>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeDragItem && (
            <Tab
              zone="top"
              label={activeDragItem.label}
              icon={activeDragItem.icon}
              color={activeDragItem.color}
              isActive={false}
              isDragging={true}
              onClick={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

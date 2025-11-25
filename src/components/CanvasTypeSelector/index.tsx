import React, { useEffect, useState } from "react";
import styles from "./styles.module.scss";
import { useStore } from "../../state/store";
import { Tabs, TabsList, TabsTrigger } from "@/ui/components/tabs";

export type CanvasRenderMode = "3D" | "2D" | "Item";

interface CanvasTypeSelectorProps {
  disabled2D?: boolean;
  disabled3D?: boolean;
  disabledItem?: boolean;
  targetRef: React.RefObject<HTMLElement>;
}

export const CanvasTypeSelector: React.FC<CanvasTypeSelectorProps> = ({
  disabled2D = false,
  disabled3D = false,
  disabledItem = false,
  targetRef,
}) => {
  const canvasRenderMode = useStore((state) => state.canvasRenderMode);
  const setCanvasRenderMode = useStore((state) => state.setCanvasRenderMode);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0 });

  // Update position when targetRef changes or on resize
  useEffect(() => {
    const updatePosition = () => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        setPosition({
          left: rect.left,
          top: rect.top,
          width: rect.width,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    // Use ResizeObserver to track canvas resize from BlockyTabs
    const resizeObserver = new ResizeObserver(updatePosition);
    if (targetRef.current) {
      resizeObserver.observe(targetRef.current);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      resizeObserver.disconnect();
    };
  }, [targetRef]);

  return (
    <div
      className={styles.canvasTypeSelector}
      style={{
        left: `${position.left + position.width / 2}px`,
        top: `${position.top}px`,
      }}
    >
      <Tabs
        value={canvasRenderMode}
        onValueChange={(value) =>
          setCanvasRenderMode(value as CanvasRenderMode)
        }
      >
        <TabsList className={styles.tabsList}>
          <TabsTrigger value="3D" disabled={disabled3D}>
            3D
          </TabsTrigger>
          <TabsTrigger value="2D" disabled={disabled2D}>
            2D
          </TabsTrigger>
          <TabsTrigger value="Item" disabled={disabledItem}>
            Item
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

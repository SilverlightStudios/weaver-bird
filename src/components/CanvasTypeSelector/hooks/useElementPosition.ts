import type { RefObject } from "react";
import { useEffect, useState } from "react";

interface Position {
    left: number;
    top: number;
    width: number;
}

/**
 * Custom hook to track element position using getBoundingClientRect
 * Updates on window resize and when target element resizes (via ResizeObserver)
 */
export function useElementPosition(
    targetRef: RefObject<HTMLElement>,
): Position {
    const [position, setPosition] = useState<Position>({ left: 0, top: 0, width: 0 });

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

    return position;
}

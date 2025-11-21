/**
 * Hook to make a pack list item sortable with dnd-kit
 */

import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers";
import { useSortable } from "@dnd-kit/react/sortable";

interface UseSortReturn {
  setNodeRef: (element: HTMLElement | null) => void;
  isDragging: boolean;
  isDropTarget: boolean;
}

export function useSort(
  id: string,
  containerId: string,
  index: number,
  disabled: boolean = false,
): UseSortReturn {
  const { ref, isDragging, isDropTarget } = useSortable({
    id,
    index,
    group: containerId,
    type: "pack",
    accept: ["pack"],
    modifiers: [RestrictToVerticalAxis],
    disabled,
  });

  return {
    setNodeRef: ref,
    isDragging,
    isDropTarget,
  };
}

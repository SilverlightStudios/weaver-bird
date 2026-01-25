import { DragOverlay } from "@dnd-kit/react";
import { minecraftTextToHTML } from "@/utils/minecraftColors";
import { ResourcePackCard } from "@components/ResourcePackCard";
import { formatPackSize } from "../utilities";
import type { PackItem } from "../types";
import s from "../styles.module.scss";

interface PackDragOverlayProps {
  activeItem: PackItem | null;
}

export function PackDragOverlay({ activeItem }: PackDragOverlayProps) {
  return (
    <DragOverlay>
      {activeItem ? (
        <div className={s.cardWrapper}>
          <ResourcePackCard
            name={activeItem.name}
            iconSrc={
              activeItem.icon_data
                ? `data:image/png;base64,${activeItem.icon_data}`
                : undefined
            }
            metadata={
              activeItem.size
                ? [
                    {
                      label: "Size",
                      value: formatPackSize(activeItem.size),
                    },
                  ]
                : []
            }
            description={
              activeItem.description ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: minecraftTextToHTML(activeItem.description),
                  }}
                />
              ) : undefined
            }
            isDragging
          />
        </div>
      ) : null}
    </DragOverlay>
  );
}

/**
 * PreviewItem Component - Wrapper for item previews with 2D/3D view tabs
 *
 * Allows users to switch between:
 * - 2D flat texture view
 * - 3D dropped item view
 */
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/components/tabs";
import Preview2D from "@components/Preview2D";
import Preview3DItem from "@components/Preview3DItem";
import type { ItemDisplayMode } from "@lib/itemDisplayModes";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  displayMode?: ItemDisplayMode;
  rotate?: boolean;
}

export default function PreviewItem({
  assetId,
  displayMode = "ground",
  rotate = true,
}: Props) {
  const [activeTab, setActiveTab] = useState<"3d" | "2d">("3d");

  if (!assetId) {
    return (
      <div className={s.root}>
        <div className={s.placeholder}>Select an item to preview</div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "3d" | "2d")}>
        <TabsList className={s.tabsList}>
          <TabsTrigger value="3d" className={s.tabTrigger}>
            3D View
          </TabsTrigger>
          <TabsTrigger value="2d" className={s.tabTrigger}>
            2D View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="3d" className={s.tabContent}>
          <Preview3DItem
            assetId={assetId}
            displayMode={displayMode}
            rotate={rotate}
          />
        </TabsContent>

        <TabsContent value="2d" className={s.tabContent}>
          <Preview2D assetId={assetId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

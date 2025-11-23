/**
 * PreviewDecoratedPotEntity Component - Wrapper for entity decorated pot previews with 2D/3D view tabs
 *
 * Allows users to switch between:
 * - 3D decorated pot block view (default)
 * - 2D flat texture view
 */
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/components/tabs";
import Preview2D from "@components/Preview2D";
import DecoratedPotBlockView from "@components/DecoratedPotBlockView";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
}

export default function PreviewDecoratedPotEntity({ assetId }: Props) {
  const [activeTab, setActiveTab] = useState<"3d" | "2d">("3d");

  if (!assetId) {
    return (
      <div className={s.root}>
        <div className={s.placeholder}>Select a decorated pot texture to preview</div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "3d" | "2d")}>
        <TabsList className={s.tabsList}>
          <TabsTrigger value="3d" className={s.tabTrigger}>
            3D
          </TabsTrigger>
          <TabsTrigger value="2d" className={s.tabTrigger}>
            2D
          </TabsTrigger>
        </TabsList>

        <TabsContent value="3d" className={s.tabContent}>
          <DecoratedPotBlockView entityTexture={assetId} />
        </TabsContent>

        <TabsContent value="2d" className={s.tabContent}>
          <Preview2D assetId={assetId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

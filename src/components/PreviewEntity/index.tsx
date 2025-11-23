/**
 * PreviewEntity Component - Wrapper for entity texture previews with 2D/3D view tabs
 *
 * Provides a tabbed interface for viewing entity textures:
 * - 3D entity preview using Preview3D (default) - automatically detects and renders entities
 * - 2D flat texture view for inspecting the texture map
 *
 * Used for all entity textures (chests, mobs, decorated pots, etc.)
 */
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/components/tabs";
import Preview2D from "@components/Preview2D";
import Preview3D from "@components/Preview3D";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
}

export default function PreviewEntity({ assetId }: Props) {
  const [activeTab, setActiveTab] = useState<"3d" | "2d">("3d");
  const [showPot, setShowPot] = useState(false);

  if (!assetId) {
    return (
      <div className={s.root}>
        <div className={s.placeholder}>Select an entity texture to preview</div>
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
          <Preview3D
            assetId={assetId}
            showPot={showPot}
            onShowPotChange={setShowPot}
            blockProps={{}}
            seed={0}
            foliagePreviewBlock="minecraft:block/oak_leaves"
            allAssetIds={[]}
          />
        </TabsContent>

        <TabsContent value="2d" className={s.tabContent}>
          <Preview2D assetId={assetId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

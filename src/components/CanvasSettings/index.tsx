/**
 * Canvas Settings Component
 *
 * Displays canvas-specific settings that change based on the active canvas mode:
 * - 3D: Floor grid toggle
 * - 2D: Pixel grid toggle
 * - Item: Grid, rotation, and hover animation toggles
 */

import { useStore } from "@state/store";
import { Separator } from "@/ui/components/Separator/Separator";
import s from "./styles.module.scss";

export default function CanvasSettings() {
  const canvasRenderMode = useStore((state) => state.canvasRenderMode);
  const canvas3DShowGrid = useStore((state) => state.canvas3DShowGrid);
  const canvas2DShowPixelGrid = useStore((state) => state.canvas2DShowPixelGrid);
  const canvasItemShowGrid = useStore((state) => state.canvasItemShowGrid);
  const canvasItemRotate = useStore((state) => state.canvasItemRotate);
  const canvasItemHover = useStore((state) => state.canvasItemHover);

  const setCanvas3DShowGrid = useStore((state) => state.setCanvas3DShowGrid);
  const setCanvas2DShowPixelGrid = useStore(
    (state) => state.setCanvas2DShowPixelGrid,
  );
  const setCanvasItemShowGrid = useStore(
    (state) => state.setCanvasItemShowGrid,
  );
  const setCanvasItemRotate = useStore((state) => state.setCanvasItemRotate);
  const setCanvasItemHover = useStore((state) => state.setCanvasItemHover);

  const render3DSettings = () => (
    <div>
      <h3>3D Canvas Settings</h3>
      <Separator style={{ margin: "0.75rem 0" }} />

      <label className={s.checkboxLabel}>
        <input
          type="checkbox"
          checked={canvas3DShowGrid}
          onChange={(e) => setCanvas3DShowGrid(e.target.checked)}
          className={s.checkbox}
        />
        <span className={s.labelText}>Show Floor Grid</span>
      </label>

      <p className={s.description}>
        Display a floor grid beneath blocks for spatial reference in the 3D
        preview.
      </p>
    </div>
  );

  const render2DSettings = () => (
    <div>
      <h3>2D Canvas Settings</h3>
      <Separator style={{ margin: "0.75rem 0" }} />

      <label className={s.checkboxLabel}>
        <input
          type="checkbox"
          checked={canvas2DShowPixelGrid}
          onChange={(e) => setCanvas2DShowPixelGrid(e.target.checked)}
          className={s.checkbox}
        />
        <span className={s.labelText}>Show Pixel Grid</span>
      </label>

      <p className={s.description}>
        Display a pixel grid overlay to help visualize individual pixels in the
        texture.
      </p>
    </div>
  );

  const renderItemSettings = () => (
    <div>
      <h3>Item Canvas Settings</h3>
      <Separator style={{ margin: "0.75rem 0" }} />

      <label className={s.checkboxLabel}>
        <input
          type="checkbox"
          checked={canvasItemShowGrid}
          onChange={(e) => setCanvasItemShowGrid(e.target.checked)}
          className={s.checkbox}
        />
        <span className={s.labelText}>Show Grid</span>
      </label>

      <label className={s.checkboxLabel}>
        <input
          type="checkbox"
          checked={canvasItemRotate}
          onChange={(e) => setCanvasItemRotate(e.target.checked)}
          className={s.checkbox}
        />
        <span className={s.labelText}>Rotate Animation</span>
      </label>

      <label className={s.checkboxLabel}>
        <input
          type="checkbox"
          checked={canvasItemHover}
          onChange={(e) => setCanvasItemHover(e.target.checked)}
          className={s.checkbox}
        />
        <span className={s.labelText}>Hover Animation</span>
      </label>

      <p className={s.description}>
        Control the display and animation settings for dropped items in the
        preview canvas.
      </p>
    </div>
  );

  return (
    <div className={s.root}>
      {canvasRenderMode === "3D" && render3DSettings()}
      {canvasRenderMode === "2D" && render2DSettings()}
      {canvasRenderMode === "Item" && renderItemSettings()}
    </div>
  );
}

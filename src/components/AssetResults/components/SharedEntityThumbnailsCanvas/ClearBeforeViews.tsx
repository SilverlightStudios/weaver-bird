import { useFrame, useThree } from "@react-three/fiber";

export function ClearBeforeViews() {
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    // View renders into many scissored rectangles. With a demand-driven loop,
    // stale pixels can remain when cards move (scroll) unless we clear.
    gl.setScissorTest(false);
    gl.clear(true, true, true);
  }, 0);
  return null;
}

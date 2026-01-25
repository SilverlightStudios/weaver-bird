import { useFrame } from "@react-three/fiber";
import { updateAnimatedTextures } from "@lib/three/textureLoader";

/**
 * Component that updates animated textures every frame
 */
export function AnimationUpdater() {
  useFrame(() => {
    updateAnimatedTextures(performance.now());
  });
  return null;
}

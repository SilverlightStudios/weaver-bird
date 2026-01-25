import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export function InvalidateOnLayoutChanges() {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        invalidate();
      });
    };

    // Initial paint.
    schedule();

    // Scroll doesn't bubble; listen in capture to catch scroll containers.
    const onScroll = () => schedule();
    const onResize = () => schedule();
    const scrollOpts: AddEventListenerOptions = { capture: true, passive: true };
    const resizeOpts: AddEventListenerOptions = { passive: true };

    document.addEventListener("scroll", onScroll, scrollOpts);
    window.addEventListener("resize", onResize, resizeOpts);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
    };
  }, [invalidate]);

  return null;
}

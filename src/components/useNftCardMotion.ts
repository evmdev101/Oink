import { useEffect, useRef } from "react";
import { startDecorativeFrameLoop } from "../themes/backgroundAnimation";

/** Automatic NFT-style sway and lighting, independent of pointer position. */
export function useNftCardMotion(paused: boolean) {
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const motion = useRef({
    phase: 0, x: 0, y: 0, lightX: 50, lightY: 42,
  });

  useEffect(() => {
    const surface = stage.current;
    const plane = card.current;
    if (!surface || !plane) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = typeof IntersectionObserver === "undefined";
    let visibilityChanged = () => {};
    const visible = () => inView && !document.hidden && !paused;
    const updateAvailability = () => {
      surface.dataset.animate = String(visible() && !reduced.matches);
    };
    const draw = () => {
      const state = motion.current;
      if (reduced.matches) {
        state.x = state.y = 0;
        state.lightX = 50;
        state.lightY = 42;
      } else {
        // Match the reference's 60 Hz motion, including its continuously moving light.
        state.phase += .016;
        state.x += (Math.sin(state.phase * .6) * .28 - state.x) * .08;
        state.y += (Math.cos(state.phase * .45) * .2 - state.y) * .08;
        state.lightX += (50 + Math.sin(state.phase * .6) * 20 - state.lightX) * .1;
        state.lightY += (42 + Math.cos(state.phase * .45) * 16 - state.lightY) * .1;
      }
      plane.style.setProperty("--contract-rotate-y", `${state.x * 14}deg`);
      plane.style.setProperty("--contract-rotate-x", `${-state.y * 14}deg`);
      plane.style.setProperty("--contract-light-x", `${state.lightX}%`);
      plane.style.setProperty("--contract-light-y", `${state.lightY}%`);
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      updateAvailability();
      visibilityChanged();
    });
    const loop = startDecorativeFrameLoop(draw, {
      requestFrame: callback => requestAnimationFrame(callback),
      cancelFrame: id => cancelAnimationFrame(id),
      visible,
      reducedMotion: () => reduced.matches,
      onVisibilityChange: callback => {
        const change = () => { updateAvailability(); callback(); };
        visibilityChanged = change;
        document.addEventListener("visibilitychange", change);
        return () => { visibilityChanged = () => {}; document.removeEventListener("visibilitychange", change); };
      },
      onMotionChange: callback => {
        const change = () => { updateAvailability(); callback(); };
        reduced.addEventListener("change", change);
        return () => reduced.removeEventListener("change", change);
      },
    });
    observer?.observe(surface);
    updateAvailability();
    return () => { observer?.disconnect(); loop.stop(); surface.dataset.animate = "false"; };
  }, [paused]);

  return { stage, card };
}

export type DecorativeFrameEnvironment = {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (id: number) => void;
  visible: () => boolean;
  reducedMotion: () => boolean;
  onVisibilityChange: (callback: () => void) => () => void;
  onMotionChange: (callback: () => void) => () => void;
};

// Decorative frames never need to run faster than 60 Hz or while off screen.
// Reduced motion keeps a still version of the selected theme instead of hiding it.
export function startDecorativeFrameLoop(draw: () => void, environment: DecorativeFrameEnvironment) {
  let disposed = false;
  let frame: number | null = null;
  let lastFrame = -Infinity;
  const animating = () => !disposed && environment.visible() && !environment.reducedMotion();
  const cancel = () => {
    if (frame !== null) environment.cancelFrame(frame);
    frame = null;
  };
  const queue = () => {
    if (frame === null && animating()) frame = environment.requestFrame(tick);
  };
  function tick(timestamp: number) {
    frame = null;
    if (!animating()) return;
    if (timestamp - lastFrame >= 1000 / 60 - 0.5) {
      lastFrame = timestamp;
      draw();
    }
    queue();
  }
  const redraw = () => {
    if (!disposed && environment.visible()) draw();
    queue();
  };
  const resume = () => {
    cancel();
    lastFrame = -Infinity;
    redraw();
  };
  const removeVisibilityListener = environment.onVisibilityChange(resume);
  const removeMotionListener = environment.onMotionChange(resume);
  redraw();
  return {
    redraw,
    stop: () => {
      disposed = true;
      cancel();
      removeVisibilityListener();
      removeMotionListener();
    },
  };
}

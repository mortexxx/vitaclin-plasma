// src/AnimatedContent.jsx
import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";

export default function AnimatedContent({
  children,
  active = true,
  playKey = 0,
  distance = 150,
  direction = "horizontal",
  reverse = false,
  duration = 1.2,
  ease = "bounce.out",
  initialOpacity = 0.2,
  animateOpacity = true,
  scale = 1.1,
  delay = 0.3,
  className = "",
  ...props
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!active) {
      gsap.set(el, { visibility: "hidden" });
      return;
    }

    const axis = direction === "horizontal" ? "x" : "y";
    const offset = reverse ? -distance : distance;

    gsap.killTweensOf(el);

    gsap.set(el, {
      visibility: "visible",
      [axis]: offset,
      scale,
      opacity: animateOpacity ? initialOpacity : 1,
    });

    const tween = gsap.to(el, {
      [axis]: 0,
      scale: 1,
      opacity: 1,
      duration,
      ease,
      delay,
      clearProps: `${axis},scale,opacity`,
    });

    return () => tween.kill();
  }, [
    active,
    playKey,
    distance,
    direction,
    reverse,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    scale,
    delay,
  ]);

  return (
    <div ref={ref} className={className} style={{ visibility: "hidden" }} {...props}>
      {children}
    </div>
  );
}

// src/PageTransitionOverlay.jsx
import { useEffect, useRef } from "react";
import "./PageTransitionOverlay.css";

export default function PageTransitionOverlay({ active, onDone }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const el = overlayRef.current;
    if (!el) return;

    let finished = false;

    const finishOnce = () => {
      if (finished) return;
      finished = true;
      if (onDone) onDone();
    };

    const handleEnd = (e) => {
      // Ignore bubbling from child bubbles; only consider the overlay itself
      if (e.target !== el) return;
      // Ensure we react to the fade animation, not other keyframes
      if (e.animationName !== "pageTransitionFade") return;
      finishOnce();
    };

    el.addEventListener("animationend", handleEnd);

    // Fallback in case animationend is missed or interrupted
    const t = setTimeout(finishOnce, 750);

    return () => {
      clearTimeout(t);
      el.removeEventListener("animationend", handleEnd);
    };
  }, [active, onDone]);

  if (!active) return null;

  return (
    <div className="page-transition-overlay" ref={overlayRef}>
      <div className="page-transition-bubble page-transition-bubble-1" />
      <div className="page-transition-bubble page-transition-bubble-2" />
      <div className="page-transition-bubble page-transition-bubble-3" />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { animate, createDraggable, stagger, type JSAnimation } from "animejs";

/**
 * Motion policy for Nexora.
 *
 * Two sources of truth feed every animation:
 *   1. the OS-level `prefers-reduced-motion` media query, and
 *   2. the organisation setting stored in `OrgSettings.reduceMotion`.
 *
 * Callers pass the org setting in; the hook folds both together so a component
 * only ever has to ask "may I animate?".
 */
export function useMotionEnabled(orgReduced?: boolean) {
  const [systemReduced, setSystemReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setSystemReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return !orgReduced && !systemReduced;
}

/** Staggered entrance for any element marked with `data-reveal` inside `ref`. */
export function useReveal<T extends HTMLElement>(enabled: boolean, key?: unknown) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (targets.length === 0) return;
    const animation = animate(targets, {
      opacity: [0, 1],
      translateY: [16, 0],
      filter: ["blur(6px)", "blur(0px)"],
      duration: 620,
      delay: stagger(55),
      ease: "out(3)",
    });
    return () => {
      animation.revert();
    };
  }, [enabled, key]);

  return ref;
}

/** Animated number that eases from its previous value to the next one. */
export function useCountUp(value: number, enabled = true, duration = 900) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (!enabled) {
      previous.current = value;
      setDisplay(value);
      return;
    }
    const state = { value: previous.current };
    const animation = animate(state, {
      value,
      duration,
      ease: "out(4)",
      onUpdate: () => setDisplay(state.value),
      onComplete: () => {
        previous.current = value;
      },
    });
    return () => {
      animation.revert();
    };
  }, [value, enabled, duration]);

  return display;
}

/** Entrance animation for a route change. */
export function usePageEnter(enabled: boolean, key: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    const animation = animate(element, {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 460,
      ease: "out(3)",
    });
    return () => {
      animation.revert();
    };
  }, [enabled, key]);

  return ref;
}

/** Springy count-up for a single ring/dial element. */
export function animateValue(
  from: number,
  to: number,
  onUpdate: (value: number) => void,
  duration = 1000,
): JSAnimation {
  const state = { value: from };
  return animate(state, {
    value: to,
    duration,
    ease: "out(4)",
    onUpdate: () => onUpdate(state.value),
  });
}

/**
 * Draggable brand mark for the login scene. The logo bounces on idle, follows
 * the pointer when grabbed, and springs back into place on release.
 */
export function useBouncyLogo(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!enabled) {
      element.style.transform = "";
      return;
    }

    const idle = animate(element, {
      translateY: [0, -9],
      rotate: [-2, 2],
      duration: 2600,
      loop: true,
      alternate: true,
      ease: "inOutSine",
    });

    const draggable = createDraggable(element, {
      container: element.parentElement ?? undefined,
      releaseEase: "outElastic(1, 0.55)",
      onGrab: () => idle.pause(),
      onRelease: () => {
        idle.play();
      },
    });

    return () => {
      draggable.revert();
      idle.revert();
    };
  }, [enabled]);

  return ref;
}

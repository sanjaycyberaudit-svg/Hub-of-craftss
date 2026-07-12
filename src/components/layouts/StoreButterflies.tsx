"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "hoc-butterflies-done";

type ButterflyPose = {
  x: number;
  y: number;
  rotate: number;
  scaleX: number;
};

function randomPose(prev?: ButterflyPose): ButterflyPose {
  const x = 6 + Math.random() * 82;
  const y = 10 + Math.random() * 72;
  const dx = prev ? x - prev.x : Math.random() - 0.5;
  return {
    x,
    y,
    rotate: -18 + Math.random() * 36,
    scaleX: dx < 0 ? -1 : 1,
  };
}

function RealisticButterfly({
  variant,
}: {
  variant: "rose" | "lavender";
}) {
  const isRose = variant === "rose";
  const upper = isRose ? "#e070a8" : "#8b6fc4";
  const upperDeep = isRose ? "#c03078" : "#6a4aa8";
  const lower = isRose ? "#f0a8c8" : "#b8a0e0";
  const spot = isRose ? "#fff5fa" : "#f3ecff";
  const body = isRose ? "#5c2a40" : "#3d2a55";
  const accent = isRose ? "#f5d06a" : "#e8c86a";

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className="store-butterfly__svg"
    >
      <g className="store-butterfly__wing store-butterfly__wing--left">
        <path
          d="M30 30C22 14 6 10 4 20c-1.5 7 10 14 26 12Z"
          fill={upper}
        />
        <path
          d="M30 30C22 14 6 10 4 20c-1.5 7 10 14 26 12Z"
          fill={upperDeep}
          fillOpacity="0.35"
        />
        <circle cx="12" cy="18" r="2.2" fill={spot} fillOpacity="0.9" />
        <circle cx="18" cy="22" r="1.4" fill={spot} fillOpacity="0.75" />
        <circle cx="14" cy="24" r="1" fill={accent} fillOpacity="0.7" />
        <path
          d="M30 32C18 36 8 48 14 50c6 2 12-8 16-18Z"
          fill={lower}
        />
        <circle cx="18" cy="42" r="1.6" fill={spot} fillOpacity="0.8" />
      </g>
      <g className="store-butterfly__wing store-butterfly__wing--right">
        <path
          d="M34 30C42 14 58 10 60 20c1.5 7-10 14-26 12Z"
          fill={upper}
        />
        <path
          d="M34 30C42 14 58 10 60 20c1.5 7-10 14-26 12Z"
          fill={upperDeep}
          fillOpacity="0.35"
        />
        <circle cx="52" cy="18" r="2.2" fill={spot} fillOpacity="0.9" />
        <circle cx="46" cy="22" r="1.4" fill={spot} fillOpacity="0.75" />
        <circle cx="50" cy="24" r="1" fill={accent} fillOpacity="0.7" />
        <path
          d="M34 32C46 36 56 48 50 50c-6 2-12-8-16-18Z"
          fill={lower}
        />
        <circle cx="46" cy="42" r="1.6" fill={spot} fillOpacity="0.8" />
      </g>
      <ellipse cx="32" cy="33" rx="2.2" ry="9" fill={body} />
      <ellipse cx="32" cy="23.5" rx="2.4" ry="2.6" fill={body} />
      <path
        d="M30.5 22 Q26 14 24 12.5"
        stroke={body}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M33.5 22 Q38 14 40 12.5"
        stroke={body}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="24" cy="12.5" r="1.1" fill={accent} />
      <circle cx="40" cy="12.5" r="1.1" fill={accent} />
    </svg>
  );
}

function FlyingButterfly({
  variant,
  initial,
}: {
  variant: "rose" | "lavender";
  initial: ButterflyPose;
}) {
  const [pose, setPose] = useState<ButterflyPose>(initial);
  const [duration, setDuration] = useState(5.5);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = (from: ButterflyPose) => {
      const wait = 2800 + Math.random() * 4200;
      timer = setTimeout(() => {
        if (cancelled) return;
        const next = randomPose(from);
        setDuration(4 + Math.random() * 4.5);
        setPose(next);
        schedule(next);
      }, wait);
    };

    schedule(pose);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Mount once from the initial random pose for this visit.
  }, []);

  return (
    <span
      className="store-butterfly"
      style={{
        transform: `translate3d(${pose.x}vw, ${pose.y}vh, 0) rotate(${pose.rotate}deg) scaleX(${pose.scaleX})`,
        transition: `transform ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      <RealisticButterfly variant={variant} />
    </span>
  );
}

/**
 * Homepage-only: two butterflies for 5–10s, then fade out for the rest of the visit.
 */
export function StoreButterflies() {
  const [phase, setPhase] = useState<"boot" | "show" | "fade" | "done">(
    "boot",
  );
  const [starts, setStarts] = useState<[ButterflyPose, ButterflyPose] | null>(
    null,
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("done");
      return;
    }

    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") {
        setPhase("done");
        return;
      }
    } catch {
      /* private mode — still allow one show */
    }

    setStarts([randomPose(), randomPose()]);
    setPhase("show");

    const visibleMs = 5000 + Math.random() * 5000; // 5–10s
    const fadeTimer = setTimeout(() => setPhase("fade"), visibleMs);
    const doneTimer = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setPhase("done");
    }, visibleMs + 900);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "boot" || phase === "done" || !starts) return null;

  return (
    <div
      className={
        phase === "fade"
          ? "store-butterflies store-butterflies--fade-out"
          : "store-butterflies"
      }
      aria-hidden="true"
    >
      <FlyingButterfly variant="rose" initial={starts[0]} />
      <FlyingButterfly variant="lavender" initial={starts[1]} />
    </div>
  );
}

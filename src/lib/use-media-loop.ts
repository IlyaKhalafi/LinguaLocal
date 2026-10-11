"use client";

import { useEffect, type RefObject } from "react";

export function useMediaLoop(
  ref: RefObject<HTMLMediaElement | null>,
  active: boolean,
  start: number | null,
  end: number | null,
) {
  useEffect(() => {
    const player = ref.current;
    if (!player || !active || start === null || end === null) return;
    let frame = 0;
    const stop = () => cancelAnimationFrame(frame);
    const tick = () => {
      if (player.paused) return;
      if (player.currentTime >= end) player.currentTime = start;
      frame = requestAnimationFrame(tick);
    };
    const begin = () => {
      stop();
      frame = requestAnimationFrame(tick);
    };
    player.addEventListener("playing", begin);
    player.addEventListener("pause", stop);
    player.addEventListener("ended", stop);
    if (!player.paused) begin();
    return () => {
      stop();
      player.removeEventListener("playing", begin);
      player.removeEventListener("pause", stop);
      player.removeEventListener("ended", stop);
    };
  }, [ref, active, start, end]);
}

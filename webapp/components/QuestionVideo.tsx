"use client";

import { useRef } from "react";

type IOSVideoElement = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

export function QuestionVideo({ src, className }: { src: string; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);

  function enterFullScreen() {
    const player = video.current as IOSVideoElement | null;
    if (!player) return;
    if (player.requestFullscreen) {
      void player.requestFullscreen().catch(() => player.webkitEnterFullscreen?.());
      return;
    }
    player.webkitEnterFullscreen?.();
  }

  return <div className={`question-video ${className ?? ""}`}>
    <video ref={video} controls playsInline autoPlay={false} preload="metadata" src={src} />
    <button className="video-fullscreen-button" type="button" onClick={enterFullScreen}>Full screen</button>
  </div>;
}

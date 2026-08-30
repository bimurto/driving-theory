"use client";

import { useEffect, useRef, useState } from "react";

type NativeVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitRequestFullscreen?: () => void;
};

export function supportsNativeVideoFullscreen(player: NativeVideoElement) {
  return Boolean(player.requestFullscreen || player.webkitEnterFullscreen || player.webkitRequestFullscreen);
}

export function QuestionVideo({ src, className }: { src: string; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setFallbackFullscreen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  async function enterFullScreen() {
    const player = video.current as NativeVideoElement | null;
    if (!player) return;

    if (fallbackFullscreen) {
      setFallbackFullscreen(false);
      return;
    }

    if (!supportsNativeVideoFullscreen(player)) {
      setFallbackFullscreen(true);
      return;
    }

    try {
      if (player.requestFullscreen) {
        await player.requestFullscreen();
        return;
      }
      if (player.webkitEnterFullscreen) {
        player.webkitEnterFullscreen();
        return;
      }
      if (player.webkitRequestFullscreen) {
        player.webkitRequestFullscreen();
        return;
      }
    } catch {
      // Android WebViews commonly reject the Fullscreen API without a WebChromeClient.
    }

    setFallbackFullscreen(true);
  }

  return <div className={`question-video ${fallbackFullscreen ? "question-video-fullscreen" : ""} ${className ?? ""}`}>
    <video ref={video} controls playsInline autoPlay={false} preload="metadata" src={src} />
    <button className="video-fullscreen-button" type="button" onClick={() => void enterFullScreen()}>
      {fallbackFullscreen ? "Close full screen" : "Full screen"}
    </button>
  </div>;
}

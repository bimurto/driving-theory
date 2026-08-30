"use client";

import type { TouchEvent } from "react";
import { useRef, useState } from "react";

const minimumZoom = 1;
const maximumZoom = 3;

export function clampImageZoom(value: number) {
  return Math.min(maximumZoom, Math.max(minimumZoom, value));
}

export function pinchZoom(startZoom: number, startDistance: number, currentDistance: number) {
  return clampImageZoom(startZoom * currentDistance / startDistance);
}

function touchDistance(touches: { [index: number]: { clientX: number; clientY: number } }) {
  const [first, second] = [touches[0], touches[1]];
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

export function QuestionImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  function close() { setOpen(false); setZoom(1); pinch.current = null; }

  function beginPinch(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) return;
    pinch.current = { distance: touchDistance(event.touches), zoom };
  }

  function updatePinch(event: TouchEvent<HTMLDivElement>) {
    if (!pinch.current || event.touches.length !== 2) return;
    event.preventDefault();
    setZoom(pinchZoom(pinch.current.zoom, pinch.current.distance, touchDistance(event.touches)));
  }

  return <>
    <div className={`question-image ${className ?? ""}`}>
      <img src={src} alt={alt} />
      <button className="image-zoom-button" type="button" onClick={() => setOpen(true)}>Zoom image</button>
    </div>
    {open && <div className="image-viewer-overlay" role="presentation" onClick={close}>
      <section className="image-viewer" role="dialog" aria-modal="true" aria-label="Zoomed question image" onClick={(event) => event.stopPropagation()}>
        <div className="image-viewer-actions"><button type="button" onClick={() => setZoom((value) => clampImageZoom(value - 0.25))} disabled={zoom === minimumZoom}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => clampImageZoom(value + 0.25))} disabled={zoom === maximumZoom}>+</button><button type="button" onClick={close}>Close</button></div>
        <div className="image-viewer-canvas" onTouchStart={beginPinch} onTouchMove={updatePinch} onTouchEnd={() => { pinch.current = null; }}><img src={src} alt={alt} style={{ width: `${zoom * 100}%` }} /></div>
      </section>
    </div>}
  </>;
}

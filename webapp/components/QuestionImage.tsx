"use client";

import { useState } from "react";

export function QuestionImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  function close() { setOpen(false); setZoom(1); }

  return <>
    <div className={`question-image ${className ?? ""}`}>
      <img src={src} alt={alt} />
      <button className="image-zoom-button" type="button" onClick={() => setOpen(true)}>Zoom image</button>
    </div>
    {open && <div className="image-viewer-overlay" role="presentation" onClick={close}>
      <section className="image-viewer" role="dialog" aria-modal="true" aria-label="Zoomed question image" onClick={(event) => event.stopPropagation()}>
        <div className="image-viewer-actions"><button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.25))} disabled={zoom === 1}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} disabled={zoom === 3}>+</button><button type="button" onClick={close}>Close</button></div>
        <div className="image-viewer-canvas"><img src={src} alt={alt} style={{ width: `${zoom * 100}%` }} /></div>
      </section>
    </div>}
  </>;
}

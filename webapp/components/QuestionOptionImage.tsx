"use client";

import { useState } from "react";

export function QuestionOptionImage({ src, label, className }: { src: string; label: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return <span className="image-option-unavailable" role="status">Image unavailable</span>;
  return <img className={className} src={src} alt={`Road sign option ${label}`} onError={() => setFailed(true)} />;
}

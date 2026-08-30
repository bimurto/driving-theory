"use client";

import type { StarRating } from "@/lib/progress";

type StarRatingControlProps = {
  rating: StarRating;
  onChange: (rating: StarRating) => void;
};

export function StarRatingControl({ rating, onChange }: StarRatingControlProps) {
  return <fieldset className="star-rating" aria-label="Revision priority">
    <legend>Revision priority</legend>
    {[1, 2, 3].map((value) => {
      const starRating = value as StarRating;
      const active = rating === starRating;
      return <button className={active ? "active" : ""} type="button" key={value} aria-pressed={active} aria-label={`${active ? "Remove" : "Set"} ${value}-star revision priority`} onClick={() => onChange(active ? 0 : starRating)}>{"★".repeat(value)}</button>;
    })}
  </fieldset>;
}

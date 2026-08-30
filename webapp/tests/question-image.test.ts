import { describe, expect, it } from "vitest";
import { clampImageZoom, pinchZoom } from "../components/QuestionImage";

describe("question image pinch zoom", () => {
  it("scales an image proportionally to the two-finger distance", () => {
    expect(pinchZoom(1, 100, 180)).toBe(1.8);
  });

  it("keeps a pinch gesture within the supported zoom range", () => {
    expect(pinchZoom(1, 100, 20)).toBe(1);
    expect(pinchZoom(2, 100, 200)).toBe(3);
    expect(clampImageZoom(1.5)).toBe(1.5);
  });
});

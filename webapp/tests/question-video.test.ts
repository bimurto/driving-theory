import { describe, expect, it } from "vitest";
import { supportsNativeVideoFullscreen } from "../components/QuestionVideo";

describe("question video fullscreen", () => {
  it("identifies Android WebViews with no native fullscreen API so the in-page fallback can open", () => {
    expect(supportsNativeVideoFullscreen({} as HTMLVideoElement)).toBe(false);
  });

  it("continues to use native fullscreen where the player supports it", () => {
    expect(supportsNativeVideoFullscreen({ requestFullscreen() { return Promise.resolve(); } } as HTMLVideoElement)).toBe(true);
  });
});

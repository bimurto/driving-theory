import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared statistic grids", () => {
  it("fit their columns to the number of rendered statistics", () => {
    const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const statGridRule = styles.match(/\.stat-grid\s*\{[^}]+\}/)?.[0];

    expect(statGridRule).toMatch(/grid-template-columns:\s*repeat\(auto-fit,/);
  });
});

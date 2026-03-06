import { describe, expect, it } from "vitest";

import { buildPublishedEqcmPath } from "./student-eqcm-utils";

describe("buildPublishedEqcmPath", () => {
  it("returns base path when no filter is active", () => {
    expect(buildPublishedEqcmPath({ niveau: "all", matiere: "all" })).toBe(
      "/eqcm",
    );
  });

  it("includes both niveau and matiere when active", () => {
    expect(
      buildPublishedEqcmPath({ niveau: "2AM", matiere: "Math" }),
    ).toBe("/eqcm?niveau=2AM&matiere=Math");
  });

  it("encodes unsafe chars in niveau values", () => {
    expect(
      buildPublishedEqcmPath({ niveau: "3AS sciences", matiere: "Physique" }),
    ).toBe("/eqcm?niveau=3AS+sciences&matiere=Physique");
  });
});

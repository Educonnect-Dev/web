import { describe, expect, it } from "vitest";

import { getPostAuthRoute } from "./auth-redirect";

describe("getPostAuthRoute", () => {
  it("routes students to student dashboard", () => {
    expect(getPostAuthRoute("student", false)).toBe("/dashboard/student");
  });

  it("routes teachers without profile to onboarding", () => {
    expect(getPostAuthRoute("teacher", false)).toBe("/onboarding/teacher-profile");
  });

  it("routes teachers with profile to teacher dashboard", () => {
    expect(getPostAuthRoute("teacher", true)).toBe("/dashboard/teacher");
  });
});

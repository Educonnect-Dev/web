import { describe, expect, it } from "vitest";

import { ping } from "./ping";

describe("ping", () => {
  it("returns ok", () => {
    expect(ping()).toBe("ok");
  });
});

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SubscriberCountCard } from "./teacher-profile-page";

describe("SubscriberCountCard", () => {
  it("renders the subscriber count", () => {
    const html = renderToString(<SubscriberCountCard count={12} />);
    expect(html).toContain("12");
  });
});

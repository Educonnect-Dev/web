import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TeacherSearchPage } from "./teacher-search-page";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

describe("TeacherSearchPage", () => {
  it("renders the search layout and form labels", () => {
    const html = renderToString(<TeacherSearchPage />);

    expect(html).toContain("search.title");
    expect(html).toContain("auth.loginAsStudent");
    expect(html).toContain("auth.loginCta");
  });
});

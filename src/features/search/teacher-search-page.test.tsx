import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TeacherSearchPage } from "./teacher-search-page";

describe("TeacherSearchPage", () => {
  it("renders the search layout and form labels", () => {
    const html = renderToString(<TeacherSearchPage />);

    expect(html).toContain("search-page");
    expect(html).toContain("search-filters");
    expect(html).toContain("Recherche de profs");
    expect(html).toContain("Matière");
    expect(html).toContain("Niveau");
  });
});

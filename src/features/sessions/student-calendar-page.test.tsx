import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { StudentCalendarPage } from "./student-calendar-page";

describe("StudentCalendarPage", () => {
  it("renders access reserved when unauthenticated", () => {
    const html = renderToString(
      <MemoryRouter>
        <StudentCalendarPage />
      </MemoryRouter>,
    );
    expect(html).toContain("Calendrier");
  });
});

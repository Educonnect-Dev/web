import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { StudentCalendarPage } from "./student-calendar-page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("StudentCalendarPage", () => {
  it("renders access reserved when unauthenticated", () => {
    const html = renderToString(
      <MemoryRouter>
        <StudentCalendarPage />
      </MemoryRouter>,
    );
    expect(html).toContain("studentPages.loginTitleCalendar");
    expect(html).toContain("auth.loginAsStudent");
  });
});

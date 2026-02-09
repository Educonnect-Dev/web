import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { StudentDashboardPage } from "./student-dashboard-page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("StudentDashboardPage", () => {
  it("renders access reserved when unauthenticated", () => {
    const html = renderToString(
      <MemoryRouter>
        <StudentDashboardPage />
      </MemoryRouter>,
    );
    expect(html).toContain("auth.reserved");
    expect(html).toContain("auth.loginAsStudent");
  });
});

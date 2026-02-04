import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { StudentDashboardPage } from "./student-dashboard-page";

describe("StudentDashboardPage", () => {
  it("renders access reserved when unauthenticated", () => {
    const html = renderToString(
      <MemoryRouter>
        <StudentDashboardPage />
      </MemoryRouter>,
    );
    expect(html).toContain("Accès réservé");
  });
});

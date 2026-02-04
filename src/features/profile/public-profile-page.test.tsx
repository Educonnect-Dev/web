import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PublicProfilePage } from "./public-profile-page";

describe("PublicProfilePage", () => {
  it("renders the public profile layout shell", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/public-profiles/teacher-1"]}>
        <Routes>
          <Route path="/public-profiles/:id" element={<PublicProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("profile-public");
    expect(html).toContain("Profil public");
    expect(html).toContain('href="/search/teachers"');
  });
});

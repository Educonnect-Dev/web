import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TeacherSettingsPage } from "./teacher-settings-page";

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({
    auth: { user: { id: "teacher-1", role: "teacher", email: "teacher@example.com" } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../shared/hooks/use-language", () => ({
  useLanguage: () => ({ language: "fr", setLanguage: vi.fn() }),
}));

vi.mock("../../../services/api-client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe("TeacherSettingsPage", () => {
  it("does not render Zoom connection UI anymore", () => {
    const html = renderToString(<TeacherSettingsPage />);
    expect(html).not.toContain("teacherSettings.zoomTitle");
    expect(html).not.toContain("teacherSettings.zoomConnect");
    expect(html).not.toContain("teacherSettings.zoomDisconnect");
  });
});

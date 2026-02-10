import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: vi.fn(),
  };
});

vi.mock("../../services/api-client", () => ({
  apiGet: vi.fn(),
}));

vi.mock("../dashboard/student-dashboard-layout", () => ({
  StudentDashboardLayout: ({ children }: { children: unknown }) => <div>{children}</div>,
}));

describe("FeedPage", () => {
  it("renders a bold teacher link to public profile", async () => {
    const React = await import("react");
    const setState = vi.fn();
    const states: Array<[unknown, typeof setState]> = [
      [
        { user: { id: "student-1", role: "student", email: "s@example.com" }, accessToken: "token" },
        setState,
      ],
      [
        [
          {
            id: "feed-1",
            teacherId: "teacher-1",
            teacherName: "Professeur Demo",
            title: "Cours",
            type: "video",
            price: 0,
            currency: "DZD",
            isPaid: false,
            fileUrl: undefined,
            createdAt: "2026-02-01T00:00:00.000Z",
          },
        ],
        setState,
      ],
      [null, setState],
      [false, setState],
    ];

    (React.useState as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => states.shift() as any);

    const { FeedPage } = await import("./feed-page");
    const html = renderToString(<FeedPage />);
    expect(html).toContain('href="/public-profiles/teacher-1"');
    expect(html).toContain('<strong class="content-author__name">Professeur Demo</strong>');
    expect(html).toContain('class="feed-card__title"');
    expect(html).toContain('class="feed-card__meta"');
  });
});

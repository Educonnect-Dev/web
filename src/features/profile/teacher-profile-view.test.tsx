import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TeacherProfileView } from "./teacher-profile-view";

describe("TeacherProfileView", () => {
  const data = {
    profile: {
      id: "teacher-1",
      userId: "teacher-1",
      bio: "Bio test",
      subject: "math",
      level: "licence",
      isVerified: true,
      teachingLevel: "lycee" as const,
      currentPosition: "Prof",
      experienceYears: 5,
    },
    contents: [
      { id: "c1", title: "PDF", type: "pdf" as const, price: 0, currency: "DZD", isPaid: false },
    ],
    offers: [{ id: "o1", title: "Mensuel", price: 1500, currency: "DZD", description: "Offre" }],
  };

  it("shows subscribe button in student mode", () => {
    const html = renderToString(<TeacherProfileView data={data} mode="student" />);
    expect(html).toContain("S&#x27;abonner");
  });

  it("shows subscribed badge when already subscribed", () => {
    const html = renderToString(<TeacherProfileView data={data} mode="student" isSubscribed />);
    expect(html).toContain("Déjà abonné");
    expect(html).toContain("Accès abonné");
  });

  it("hides subscribe button in preview mode", () => {
    const html = renderToString(<TeacherProfileView data={data} mode="preview" />);
    expect(html).not.toContain("S'abonner");
  });
});

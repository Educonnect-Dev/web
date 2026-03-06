import type { ReactNode } from "react";

type DashboardSectionProps = {
  title: string;
  children: ReactNode;
};

export function DashboardSection({ title, children }: DashboardSectionProps) {
  return (
    <section className="dashboard-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}


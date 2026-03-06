import type { ReactNode } from "react";

type DashboardStatCardProps = {
  title: string;
  value: ReactNode;
  tag?: ReactNode;
  highlighted?: boolean;
};

export function DashboardStatCard({ title, value, tag, highlighted = false }: DashboardStatCardProps) {
  return (
    <div className={`dashboard-card${highlighted ? " highlight" : ""}`}>
      <h3>{title}</h3>
      <div className="dashboard-value">{value}</div>
      {tag ? <span className="dashboard-tag">{tag}</span> : null}
    </div>
  );
}


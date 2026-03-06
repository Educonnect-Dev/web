import type { ReactNode } from "react";

type DashboardHeaderProps = {
  title: string;
  subtitle: ReactNode;
  actions?: ReactNode;
};

export function DashboardHeader({ title, subtitle, actions }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions ? <div className="dashboard-actions">{actions}</div> : null}
    </header>
  );
}


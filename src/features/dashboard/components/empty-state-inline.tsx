type EmptyStateInlineProps = {
  title: string;
  description?: string;
  statusLabel?: string;
};

export function EmptyStateInline({ title, description, statusLabel }: EmptyStateInlineProps) {
  return (
    <div className="dashboard-row">
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {statusLabel ? <span className="status">{statusLabel}</span> : null}
    </div>
  );
}

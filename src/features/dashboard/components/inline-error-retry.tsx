type InlineErrorRetryProps = {
  message: string;
  retryLabel: string;
  onRetry: () => void | Promise<void>;
};

export function InlineErrorRetry({ message, retryLabel, onRetry }: InlineErrorRetryProps) {
  return (
    <div className="dashboard-card compact">
      <p>{message}</p>
      <button className="btn btn-ghost" type="button" onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  );
}

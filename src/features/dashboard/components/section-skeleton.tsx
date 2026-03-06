type SectionSkeletonProps = {
  rows?: number;
  compact?: boolean;
};

export function SectionSkeleton({ rows = 2, compact = false }: SectionSkeletonProps) {
  return (
    <div className={`dashboard-card${compact ? " compact" : ""}`}>
      <div className="dashboard-list">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="dashboard-row">
            <div>
              <strong>Chargement...</strong>
              <p>Récupération des données</p>
            </div>
            <span className="status">...</span>
          </div>
        ))}
      </div>
    </div>
  );
}


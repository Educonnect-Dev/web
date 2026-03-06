type EqcmFilterOptions = {
  niveau: string;
  matiere: "all" | "Math" | "Physique" | "Sciences";
};

export function buildPublishedEqcmPath(filters: EqcmFilterOptions): string {
  const params = new URLSearchParams();
  if (filters.niveau !== "all") {
    params.set("niveau", filters.niveau);
  }
  if (filters.matiere !== "all") {
    params.set("matiere", filters.matiere);
  }
  const query = params.toString();
  return query ? `/eqcm?${query}` : "/eqcm";
}

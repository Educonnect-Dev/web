import { useTranslation } from "react-i18next";

type ComingSoonPageProps = {
  title?: string;
};

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  const { t } = useTranslation();
  return (
    <div className="coming-soon">
      <div className="coming-soon__card">
        <span className="coming-soon__badge">{t("common.comingSoon")}</span>
        <h1>{title ?? t("common.comingSoonTitle")}</h1>
        <p>{t("common.comingSoonBody")}</p>
      </div>
    </div>
  );
}

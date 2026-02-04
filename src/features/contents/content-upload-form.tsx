import { useState } from "react";
import { useTranslation } from "react-i18next";

import { apiPost } from "../../services/api-client";
import { uploadFile } from "../../services/upload-client";

type ContentType = "video" | "pdf";
type Visibility = "free" | "paid";

type FreeContent = {
  id: string;
  title: string;
  type: "video" | "pdf";
  fileUrl: string;
  price: number;
  currency: string;
  isPaid: false;
};

type PaidContent = {
  id: string;
  title: string;
  type: "video" | "pdf";
  price: number;
  currency: string;
  isPaid: true;
};

type ContentUploadFormProps = {
  onCreated?: () => void;
};

export function ContentUploadForm({ onCreated }: ContentUploadFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ContentType>("pdf");
  const [visibility, setVisibility] = useState<Visibility>("free");
  const [price, setPrice] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Fichier requis.");
      return;
    }

    if (type === "pdf" && file.type !== "application/pdf") {
      setError("PDF requis.");
      return;
    }

    if (type === "video" && !file.type.startsWith("video/")) {
      setError("Vidéo requise.");
      return;
    }

    if (visibility === "paid" && (!price || price < 0)) {
      setError("Prix invalide.");
      return;
    }

    setIsUploading(true);
    const endpoint = type === "pdf" ? "/uploads/pdf" : "/uploads/videos";
    const uploadResponse = await uploadFile(endpoint, file);
    if (uploadResponse.error || !uploadResponse.data?.signedUrl || !uploadResponse.data?.path) {
      setError(uploadResponse.error?.message ?? "Upload impossible.");
      setIsUploading(false);
      return;
    }

    const filePath = uploadResponse.data.path;
    const fileUrl = uploadResponse.data.signedUrl;
    const fileBucket = type === "pdf" ? "pdf" : "videos";
    if (visibility === "free") {
      const response = await apiPost<FreeContent>(
        "/free-contents",
        { title, type, filePath, fileBucket, fileUrl },
      );
      if (response.error) {
        setError(response.error.message);
        setIsUploading(false);
        return;
      }
    } else {
      const response = await apiPost<PaidContent>(
        "/contents",
        { title, type, price: Number(price), filePath, fileBucket, fileUrl },
      );
      if (response.error) {
        setError(response.error.message);
        setIsUploading(false);
        return;
      }
    }

    setTitle("");
    setPrice(0);
    setFile(null);
    setSuccess("Contenu publié.");
    setIsUploading(false);
    onCreated?.();
  };

  return (
    <form className="content-form" onSubmit={handleSubmit}>
      <h3>{t("teacherPages.uploadTitle")}</h3>
      <label>
        {t("teacherPages.title")}
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label>
        {t("teacherPages.typeLabel")}
        <select value={type} onChange={(event) => setType(event.target.value as ContentType)}>
          <option value="pdf">PDF</option>
          <option value="video">Vidéo</option>
        </select>
      </label>
      <label>
        {t("teacherPages.visibilityLabel")}
        <select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}>
          <option value="free">{t("teacherPages.visibilityFree")}</option>
          <option value="paid">{t("teacherPages.visibilityPaid")}</option>
        </select>
      </label>
      {visibility === "paid" ? (
        <label>
          {t("teacherPages.priceLabel")}
          <input
            type="number"
            min="0"
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
          />
        </label>
      ) : null}
      <label>
        {t("teacherPages.uploadFile")}
        <input
          type="file"
          accept={type === "pdf" ? "application/pdf" : "video/*"}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {error ? <div className="form-error">{error}</div> : null}
      {success ? <div className="form-success">{success}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={isUploading}>
        {isUploading ? t("studentPages.loading") : t("teacherPages.uploadNow")}
      </button>
    </form>
  );
}

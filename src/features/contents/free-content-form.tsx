import { useState } from "react";

import { apiPost } from "../../services/api-client";

type FreeContent = {
  id: string;
  title: string;
  type: "video" | "pdf";
  fileUrl: string;
  price: number;
  currency: string;
  isPaid: false;
};

type FreeContentFormProps = {
  onCreated?: () => void;
};

export function FreeContentForm({ onCreated }: FreeContentFormProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"video" | "pdf">("video");
  const [fileUrl, setFileUrl] = useState("");
  const [result, setResult] = useState<FreeContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const response = await apiPost<FreeContent>(
      "/free-contents",
      { title, type, fileUrl },
    );

    if (response.error) {
      setError(response.error.message);
      return;
    }

    setResult(response.data ?? null);
    if (onCreated) {
      onCreated();
    }
  };

  return (
    <form className="content-form" onSubmit={handleSubmit}>
      <h3>Publier un contenu gratuit</h3>
      <label>
        Titre
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Type
        <select value={type} onChange={(event) => setType(event.target.value as "video" | "pdf")}>
          <option value="video">Vidéo</option>
          <option value="pdf">PDF</option>
        </select>
      </label>
      <label>
        Fichier (URL)
        <input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
      </label>
      {error ? <div className="form-error">{error}</div> : null}
      {result ? <div className="form-success">Contenu gratuit créé: {result.title}</div> : null}
      <button className="btn btn-primary" type="submit">
        Publier maintenant
      </button>
    </form>
  );
}

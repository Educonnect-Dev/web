import { useState } from "react";

import { apiPost } from "../../services/api-client";

type PaidContent = {
  id: string;
  title: string;
  type: "video" | "pdf";
  price: number;
  currency: string;
  isPaid: true;
};

export function PaidContentForm() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"video" | "pdf">("video");
  const [price, setPrice] = useState(0);
  const [fileUrl, setFileUrl] = useState("");
  const [result, setResult] = useState<PaidContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const response = await apiPost<PaidContent>(
      "/contents",
      { title, type, price: Number(price), fileUrl },
    );
    if (response.error) {
      setError(response.error.message);
      return;
    }
    setResult(response.data ?? null);
  };

  return (
    <form className="content-form" onSubmit={handleSubmit}>
      <h3>Publier un contenu payant</h3>
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
        Prix (DZD)
        <input
          type="number"
          min="0"
          value={price}
          onChange={(event) => setPrice(Number(event.target.value))}
        />
      </label>
      <label>
        Fichier (URL)
        <input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
      </label>
      {error ? <div className="form-error">{error}</div> : null}
      {result ? (
        <div className="form-success">
          Contenu créé: {result.title} • {result.price} {result.currency}
        </div>
      ) : null}
      <button className="btn btn-primary" type="submit">
        Publier maintenant
      </button>
    </form>
  );
}

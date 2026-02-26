import { useEffect } from "react";

type SeoMetaInput = {
  title?: string;
  description?: string;
  robots?: string;
  canonicalPath?: string;
  ogType?: "website" | "profile" | "article";
};

const DEFAULT_SITE_NAME = "Educonnect";
const DEFAULT_BASE_URL = "https://educonnect-dz.com";

export function useSeoMeta(input: SeoMetaInput) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (input.title) {
      document.title = input.title;
      setMeta("property", "og:title", input.title);
      setMeta("name", "twitter:title", input.title);
    }

    if (input.description) {
      setMeta("name", "description", input.description);
      setMeta("property", "og:description", input.description);
      setMeta("name", "twitter:description", input.description);
    }

    if (input.robots) {
      setMeta("name", "robots", input.robots);
    }

    setMeta("property", "og:site_name", DEFAULT_SITE_NAME);

    if (input.ogType) {
      setMeta("property", "og:type", input.ogType);
    }

    if (input.canonicalPath) {
      const canonicalUrl = buildCanonicalUrl(input.canonicalPath);
      setCanonical(canonicalUrl);
      setMeta("property", "og:url", canonicalUrl);
    }
  }, [input.canonicalPath, input.description, input.ogType, input.robots, input.title]);
}

function buildCanonicalUrl(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return `${DEFAULT_BASE_URL}/`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/#/")) return `${DEFAULT_BASE_URL}${trimmed}`;
  if (trimmed.startsWith("/")) return `${DEFAULT_BASE_URL}/#${trimmed}`;
  return `${DEFAULT_BASE_URL}/#/${trimmed.replace(/^#?\/?/, "")}`;
}

function setCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.href = href;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let meta = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

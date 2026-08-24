import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { SupportPage } from "../pages";

const TITLE = "Apoio — PQOQ";
const DESCRIPTION =
  "Conheça as frentes de apoio, instituições, parceiros e redes que sustentam o projeto PQOQ.";
const SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/XWqZyB5aTyeH2fMJCJwuPlYI8Ah1/social-images/social-1781919685917-ChatGPT_Image_16_de_jun._de_2026,_21_34_50.webp";

export const Route = createFileRoute("/apoio")({
  component: SupportRoute,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pqoqcriamos.lovable.app/apoio" },
      { property: "og:image", content: SOCIAL_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://pqoqcriamos.lovable.app/apoio" }],
  }),
});

function SupportRoute() {
  return (
    <PQOQRoute page="apoio" title="PQOQ Criamos - Apoio">
      <SupportPage />
    </PQOQRoute>
  );
}

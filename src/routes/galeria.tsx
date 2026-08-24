import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { GalleryPage } from "../pages";

// Legacy alias kept for old links. /acervo is the canonical route, so canonical
// and og:url point there to avoid duplicate content.
const TITLE = "Acervo — PQOQ";
const DESCRIPTION =
  "Imagens, bastidores, obras e registros visuais do projeto Por que criamos o que criamos.";
const SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/XWqZyB5aTyeH2fMJCJwuPlYI8Ah1/social-images/social-1781919685917-ChatGPT_Image_16_de_jun._de_2026,_21_34_50.webp";

export const Route = createFileRoute("/galeria")({
  component: GalleryRoute,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pqoqcriamos.lovable.app/acervo" },
      { property: "og:image", content: SOCIAL_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://pqoqcriamos.lovable.app/acervo" }],
  }),
});

function GalleryRoute() {
  return (
    <PQOQRoute page="galeria" title="PQOQ Criamos - ACERVO">
      <GalleryPage />
    </PQOQRoute>
  );
}

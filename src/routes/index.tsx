import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { HomePage } from "../pages";

const TITLE = "PQOQ — Por que criamos o que criamos";
const DESCRIPTION =
  "Podcast, videocast e acervo cultural dedicado aos processos criativos de artistas do extremo sul da Bahia.";
const SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/XWqZyB5aTyeH2fMJCJwuPlYI8Ah1/social-images/social-1781919685917-ChatGPT_Image_16_de_jun._de_2026,_21_34_50.webp";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pqoqcriamos.lovable.app/" },
      { property: "og:image", content: SOCIAL_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://pqoqcriamos.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PQOQ Criamos",
          url: "https://pqoqcriamos.lovable.app/",
          description: DESCRIPTION,
          publisher: {
            "@type": "Organization",
            name: "PQOQ Criamos",
            url: "https://pqoqcriamos.lovable.app/",
          },
        }),
      },
    ],
  }),
});

function Index() {
  return (
    <PQOQRoute page="home" title="PQOQ Criamos - Home">
      <HomePage />
    </PQOQRoute>
  );
}

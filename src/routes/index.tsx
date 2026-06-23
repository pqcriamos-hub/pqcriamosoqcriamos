import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { HomePage } from "../pages";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PQOQ Criamos — Acervo de Processos Criativos do Sul da Bahia" },
      {
        name: "description",
        content:
          "Acervo vivo de artistas, processos criativos e memória cultural do extremo sul da Bahia. Podcast e videocast com novos episódios a cada quinze dias.",
      },
      { property: "og:title", content: "PQOQ Criamos — Acervo de Processos Criativos" },
      {
        property: "og:description",
        content:
          "Acervo vivo de artistas, processos criativos e memória cultural do extremo sul da Bahia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pqoqcriamos.lovable.app/" },
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
          description:
            "Acervo vivo de artistas, processos criativos e memória cultural do extremo sul da Bahia.",
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

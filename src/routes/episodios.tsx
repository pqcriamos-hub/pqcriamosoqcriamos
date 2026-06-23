import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { EpisodesPage } from "../pages";

export const Route = createFileRoute("/episodios")({
  component: EpisodesRoute,
  head: () => ({
    meta: [
      { title: "Episódios — PQOQ Criamos" },
      {
        name: "description",
        content:
          "Todos os episódios do PQOQ: videocast e podcast com artistas do extremo sul da Bahia, com vídeo, áudio e acervo de cada conversa.",
      },
      { property: "og:title", content: "Episódios — PQOQ Criamos" },
      {
        property: "og:description",
        content:
          "Videocast e podcast com artistas do extremo sul da Bahia, com vídeo, áudio e acervo.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pqoqcriamos.lovable.app/episodios" },
    ],
    links: [{ rel: "canonical", href: "https://pqoqcriamos.lovable.app/episodios" }],
  }),
});

function EpisodesRoute() {
  return (
    <PQOQRoute page="episodios" title="PQOQ Criamos - Episódios">
      <EpisodesPage />
    </PQOQRoute>
  );
}

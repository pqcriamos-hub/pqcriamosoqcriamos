import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { EpisodePage } from "../pages";

export const Route = createFileRoute("/episodio")({
  component: EpisodeRoute,
  head: () => ({
    meta: [
      { title: "Episódio — PQOQ Criamos" },
      {
        name: "description",
        content:
          "Episódio completo do PQOQ com vídeo, áudio e acervo da conversa sobre processos criativos de artistas do extremo sul da Bahia.",
      },
      { property: "og:title", content: "Episódio — PQOQ Criamos" },
      {
        property: "og:description",
        content: "Episódio completo do PQOQ com vídeo, áudio e acervo da conversa.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://pqoqcriamos.lovable.app/episodio" },
    ],
    links: [{ rel: "canonical", href: "https://pqoqcriamos.lovable.app/episodio" }],
  }),
});

function EpisodeRoute() {
  return (
    <PQOQRoute page="episodios" title="PQOQ Criamos - Episódio">
      <EpisodePage />
    </PQOQRoute>
  );
}

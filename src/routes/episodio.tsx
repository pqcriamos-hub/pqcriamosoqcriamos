import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { EpisodePage } from "../pages";

export const Route = createFileRoute("/episodio")({
  component: EpisodeRoute,
});

function EpisodeRoute() {
  return (
    <PQOQRoute page="episodios" title="PQOQ Criamos - Episódio">
      <EpisodePage />
    </PQOQRoute>
  );
}

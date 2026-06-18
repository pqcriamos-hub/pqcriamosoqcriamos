import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { EpisodesPage } from "../pages";

export const Route = createFileRoute("/episodios")({
  component: EpisodesRoute,
});

function EpisodesRoute() {
  return (
    <PQOQRoute page="episodios" title="PQOQ Criamos - Episódios">
      <EpisodesPage />
    </PQOQRoute>
  );
}

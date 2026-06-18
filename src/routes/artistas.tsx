import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { ArtistsPage } from "../pages";

export const Route = createFileRoute("/artistas")({
  component: ArtistsRoute,
});

function ArtistsRoute() {
  return (
    <PQOQRoute page="artistas" title="PQOQ Criamos - Artistas">
      <ArtistsPage />
    </PQOQRoute>
  );
}

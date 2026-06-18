import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { GalleryPage } from "../pages";

export const Route = createFileRoute("/galeria")({
  component: GalleryRoute,
});

function GalleryRoute() {
  return (
    <PQOQRoute page="galeria" title="PQOQ Criamos - Galeria">
      <GalleryPage />
    </PQOQRoute>
  );
}

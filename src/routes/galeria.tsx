import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { GalleryPage } from "../pages";

export const Route = createFileRoute("/galeria")({
  component: GalleryRoute,
  head: () => ({
    meta: [
      { title: "Galeria — PQOQ Criamos" },
      {
        name: "description",
        content:
          "Galeria de imagens, bastidores, capas e registros de gravação do projeto PQOQ e dos artistas convidados.",
      },
      { property: "og:title", content: "Galeria — PQOQ Criamos" },
      {
        property: "og:description",
        content: "Imagens, bastidores, capas e registros de gravação do projeto PQOQ.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pqcriamosoqcriamos.lovable.app/galeria" },
    ],
    links: [{ rel: "canonical", href: "https://pqcriamosoqcriamos.lovable.app/galeria" }],
  }),
});

function GalleryRoute() {
  return (
    <PQOQRoute page="galeria" title="PQOQ Criamos - Galeria">
      <GalleryPage />
    </PQOQRoute>
  );
}

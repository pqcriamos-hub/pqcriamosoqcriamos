import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { ArtistsPage } from "../pages";

export const Route = createFileRoute("/artistas")({
  component: ArtistsRoute,
  head: () => ({
    meta: [
      { title: "Artistas — PQOQ Criamos" },
      {
        name: "description",
        content:
          "Catálogo de artistas locais e regionais de diferentes linguagens, trajetórias e formas de criar registrados pelo acervo PQOQ.",
      },
      { property: "og:title", content: "Artistas — PQOQ Criamos" },
      {
        property: "og:description",
        content:
          "Catálogo de artistas locais e regionais de diferentes linguagens e trajetórias.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pqcriamosoqcriamos.lovable.app/artistas" },
    ],
    links: [{ rel: "canonical", href: "https://pqcriamosoqcriamos.lovable.app/artistas" }],
  }),
});

function ArtistsRoute() {
  return (
    <PQOQRoute page="artistas" title="PQOQ Criamos - Artistas">
      <ArtistsPage />
    </PQOQRoute>
  );
}

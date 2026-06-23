import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { SupportPage } from "../pages";

export const Route = createFileRoute("/apoio")({
  component: SupportRoute,
  head: () => ({
    meta: [
      { title: "Apoio — PQOQ Criamos" },
      {
        name: "description",
        content:
          "Rede de apoio e colaboração do PQOQ: UFSB/PROEX, Campus Paulo Freire, acessibilidade e parcerias com a comunidade.",
      },
      { property: "og:title", content: "Apoio — PQOQ Criamos" },
      {
        property: "og:description",
        content: "Rede de apoio e colaboração do PQOQ com universidade, parceiros e comunidade.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pqoqcriamos.lovable.app/apoio" },
    ],
    links: [{ rel: "canonical", href: "https://pqoqcriamos.lovable.app/apoio" }],
  }),
});

function SupportRoute() {
  return (
    <PQOQRoute page="apoio" title="PQOQ Criamos - Apoio">
      <SupportPage />
    </PQOQRoute>
  );
}

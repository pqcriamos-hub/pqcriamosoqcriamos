import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { AboutPage } from "../pages";

export const Route = createFileRoute("/sobre")({
  component: AboutRoute,
  head: () => ({
    meta: [
      { title: "Sobre — PQOQ Criamos" },
      {
        name: "description",
        content:
          "Conheça o PQOQ: projeto de extensão, escuta e produção audiovisual dedicado aos processos criativos de artistas do extremo sul da Bahia.",
      },
      { property: "og:title", content: "Sobre — PQOQ Criamos" },
      {
        property: "og:description",
        content:
          "Projeto de extensão e produção audiovisual sobre processos criativos no extremo sul da Bahia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pqcriamosoqcriamos.lovable.app/sobre" },
    ],
    links: [{ rel: "canonical", href: "https://pqcriamosoqcriamos.lovable.app/sobre" }],
  }),
});

function AboutRoute() {
  return (
    <PQOQRoute page="sobre" title="PQOQ Criamos - Sobre">
      <AboutPage />
    </PQOQRoute>
  );
}

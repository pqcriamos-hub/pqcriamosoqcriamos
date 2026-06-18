import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { AboutPage } from "../pages";

export const Route = createFileRoute("/sobre")({
  component: AboutRoute,
});

function AboutRoute() {
  return (
    <PQOQRoute page="sobre" title="PQOQ Criamos - Sobre">
      <AboutPage />
    </PQOQRoute>
  );
}

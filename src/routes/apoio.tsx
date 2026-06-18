import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { SupportPage } from "../pages";

export const Route = createFileRoute("/apoio")({
  component: SupportRoute,
});

function SupportRoute() {
  return (
    <PQOQRoute page="apoio" title="PQOQ Criamos - Apoio">
      <SupportPage />
    </PQOQRoute>
  );
}

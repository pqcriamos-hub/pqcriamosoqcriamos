import { createFileRoute } from "@tanstack/react-router";
import { PQOQRoute } from "../components/PQOQRoute";
import { HomePage } from "../pages";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <PQOQRoute page="home" title="PQOQ Criamos - Home">
      <HomePage />
    </PQOQRoute>
  );
}

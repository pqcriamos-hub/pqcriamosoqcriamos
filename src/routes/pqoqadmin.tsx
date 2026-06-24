import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const Route = createFileRoute("/pqoqadmin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — PQOQ Criamos" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <AdminGate>
      {({ email, signOut }) => (
        <AdminShell email={email} onSignOut={() => void signOut()}>
          <AdminDashboard />
        </AdminShell>
      )}
    </AdminGate>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";

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
      {({ email, userId, isAdmin, signOut }) => (
        <AdminShell
          email={email}
          userId={userId}
          isAdmin={isAdmin}
          onSignOut={() => void signOut()}
        />
      )}
    </AdminGate>
  );
}

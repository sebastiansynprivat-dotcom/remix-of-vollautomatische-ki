import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
  ssr: false,
});

function AuthGate() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) {
      const isAdminRoute = pathname.startsWith("/admin");
      navigate({ to: isAdminRoute ? "/admin/login" : "/login" });
    }
  }, [session, loading, navigate, pathname]);

  if (loading || !session) {
    return (
      <div style={{
        minHeight: "100dvh", display: "grid", placeItems: "center",
        background: "var(--surface-1)", color: "var(--text-subtle)", fontSize: 14,
      }}>
        Laden…
      </div>
    );
  }

  return <Outlet />;
}

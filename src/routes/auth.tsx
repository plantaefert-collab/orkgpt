import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { resolvePostAuthDestination } from "@/lib/auth-destination";

function readPendingNext(): string | undefined {
  try {
    const value = sessionStorage.getItem("pf_oauth_next");
    if (value) {
      sessionStorage.removeItem("pf_oauth_next");
      return value;
    }
  } catch {}
  return undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Guia Orquídeas Floridas" },
      { name: "description", content: "Acesse sua conta para salvar e continuar seu protocolo de 21 dias." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  async function resolveDestination(userId: string) {
    const pendingNext = readPendingNext();
    return resolvePostAuthDestination(userId, { explicitRedirect: next ?? pendingNext });
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted || !data.session) return;
      const dest = await resolveDestination(data.session.user.id);
      if (mounted) navigate({ to: dest, replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        const dest = await resolveDestination(session.user.id);
        if (mounted) navigate({ to: dest, replace: true });
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, next]);

  return (
    <AuthScreen
      next={next}
      onBack={() => navigate({ to: "/", replace: true })}
      onSuccess={async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const dest = await resolveDestination(data.session.user.id);
        navigate({ to: dest, replace: true });
      }}
    />
  );
}

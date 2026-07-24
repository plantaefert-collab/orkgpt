import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlantaefertLogo } from "@/components/PlantaefertLogo";

type OAuthClient = {
  name?: string;
  redirect_uri?: string;
};

type OAuthAuthorizationDetails = {
  client?: OAuthClient | null;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
};

type OAuthRedirect = {
  redirect_url?: string;
  redirect_to?: string;
};

function isRedirect(data: OAuthAuthorizationDetails | OAuthRedirect): data is OAuthRedirect {
  return "redirect_url" in data && !("client" in data);
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search.authorization_id === "string" ? search.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) {
      throw new Error("Missing authorization_id");
    }
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    if (isRedirect(data)) {
      const immediate = data.redirect_url ?? data.redirect_to;
      if (immediate) throw redirect({ href: immediate });
    }
    return data as OAuthAuthorizationDetails;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl border border-border shadow-xl text-center">
        <h1 className="font-display text-2xl text-primary">Não foi possível carregar</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {String((error as Error)?.message ?? error)}
        </p>
        <Link to="/" className="mt-6 inline-block text-primary font-semibold hover:underline">
          Voltar ao início
        </Link>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: oauthError } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);

    if (oauthError) {
      setBusy(false);
      setError(oauthError.message);
      return;
    }

    const target = (data as OAuthRedirect)?.redirect_url ?? (data as OAuthRedirect)?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Nenhum redirecionamento retornado pelo servidor de autorização.");
      return;
    }

    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "um aplicativo";
  const redirectUri = details?.client?.redirect_uri ?? "";
  const scopes = (details?.scope ?? "openid email profile")
    .split(" ")
    .filter((s: string) => s.trim());

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl border border-border shadow-xl">
        <header className="text-center mb-8">
          <PlantaefertLogo className="mx-auto mb-5 h-16 w-auto object-contain" />
          <h1 className="font-display text-2xl text-primary">
            Conectar {clientName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ao Guia Orquídeas Floridas
          </p>
        </header>

        <div className="space-y-4 text-sm text-foreground">
          <p>
            Isso permite que <strong>{clientName}</strong> use este app como você.
          </p>
          {redirectUri && (
            <p className="text-xs text-muted-foreground">
              Redirecionamento: <code className="bg-muted px-1 py-0.5 rounded">{redirectUri}</code>
            </p>
          )}

          <div className="rounded-xl border border-border p-4 space-y-2">
            <p className="font-semibold text-foreground">Dados compartilhados</p>
            <ul className="space-y-1 text-muted-foreground">
              {scopes.includes("openid") && (
                <li>• Identidade básica</li>
              )}
              {scopes.includes("email") && (
                <li>• Endereço de e-mail</li>
              )}
              {scopes.includes("profile") && (
                <li>• Nome e perfil</li>
              )}
              {scopes
                .filter((s: string) => !["openid", "email", "profile"].includes(s))
                .map((s: string) => (
                  <li key={s}>• Permissão adicional: {s}</li>
                ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Isso não ignora as permissões ou políticas deste app. Os dados acessíveis dependem do que está habilitado no backend.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 p-3 rounded-xl text-xs font-medium bg-destructive/10 text-destructive">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="w-full rounded-full bg-accent py-3.5 text-sm font-bold text-accent-foreground shadow-md shadow-accent/20 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Processando..." : "Aprovar conexão"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="w-full rounded-full border border-border bg-background py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
          >
            Cancelar conexão
          </button>
        </div>
      </div>
    </main>
  );
}

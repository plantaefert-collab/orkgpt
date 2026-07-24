import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlantaefertLogo } from "@/components/PlantaefertLogo";


type Feedback = {
  tone: "error" | "success";
  message: string;
} | null;

interface AuthScreenProps {
  onBack: () => void;
  onSuccess: (context?: { isNewSignup?: boolean }) => void;
  next?: string;
}

function isSameOriginRelativePath(path: string): boolean {
  try {
    const url = new URL(path, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/");
  } catch {
    return false;
  }
}

export function AuthScreen({ onBack, onSuccess, next }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [lastSignupEmail, setLastSignupEmail] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const getFriendlyAuthError = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) {
      return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
    }

    if (normalized.includes("email not confirmed")) {
      return "Seu cadastro foi criado, mas o e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar.";
    }

    if (normalized.includes("user already registered") || normalized.includes("already registered")) {
      return "Este e-mail já tem uma conta. Se você ainda não confirmou o cadastro, reenvie o link de confirmação.";
    }

    if (normalized.includes("weak password") || normalized.includes("password")) {
      return "Use uma senha com pelo menos 6 caracteres.";
    }

    return message || "Não foi possível autenticar agora. Tente novamente.";
  };

  const handleEmailAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        setFeedback({ tone: "error", message: "Informe seu e-mail para continuar." });
        return;
      }

      if (password.length < 6) {
        setFeedback({ tone: "error", message: "Use uma senha com pelo menos 6 caracteres." });
        return;
      }

      const { data, error } = mode === "signup"
        ? await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: { emailRedirectTo: window.location.origin },
          })
        : await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      
      if (error) throw error;
      if (data.session) {
        onSuccess({ isNewSignup: mode === "signup" });
      } else if (mode === "signup") {
        setLastSignupEmail(trimmedEmail);
        setFeedback({
          tone: "success",
          message: "Cadastro criado! Agora entre com seu e-mail e senha.",
        });
        setMode("login");
      }
    } catch (err: unknown) {
      setFeedback({
        tone: "error",
        message: getFriendlyAuthError(err instanceof Error ? err.message : "Erro na autenticação"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = (email.trim() || lastSignupEmail).trim();

    if (!targetEmail) {
      setFeedback({ tone: "error", message: "Informe seu e-mail para reenviar a confirmação." });
      return;
    }

    setResendLoading(true);
    setFeedback(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: window.location.origin },
      });

      if (error) throw error;

      setLastSignupEmail(targetEmail);
      setFeedback({
        tone: "success",
        message: "Reenviamos o link de confirmação. Confira a caixa de entrada e o spam.",
      });
    } catch (err: unknown) {
      setFeedback({
        tone: "error",
        message: getFriendlyAuthError(err instanceof Error ? err.message : "Erro ao reenviar confirmação"),
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setFeedback(null);
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      try { sessionStorage.setItem("pf_oauth_pending", "1"); } catch {}
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" }
      });

      if (result?.error) {
        throw result.error;
      }

      if (result?.redirected) {
        return;
      }

      onSuccess();
    } catch (err: unknown) {
      setFeedback({
        tone: "error",
        message: "Erro ao iniciar login com Google: " + (err instanceof Error ? err.message : "desconhecido"),
      });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-[400px] bg-card p-8 rounded-3xl border border-border shadow-xl">
        <header className="text-center mb-8">
          <PlantaefertLogo className="mx-auto mb-5 h-16 w-auto object-contain" />

          <h1 className="font-display text-2xl text-primary">
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Acesse seu progresso salvo." : "Comece sua jornada botânica."}
          </p>
        </header>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="auth-email" className="text-sm font-semibold text-foreground px-1">E-mail</label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="exemplo@email.com"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="auth-password" className="text-sm font-semibold text-foreground px-1">Senha</label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
          </div>

          {feedback && (
            <div
              aria-live="polite"
              className={`p-3 rounded-xl text-xs font-medium ${
                feedback.tone === "success"
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent py-3.5 text-sm font-bold text-accent-foreground shadow-md shadow-accent/20 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Processando..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={loading || resendLoading}
            className="w-full text-xs font-semibold text-primary transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendLoading ? "Reenviando confirmação..." : "Reenviar confirmação por e-mail"}
          </button>
        </form>

        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <span className="relative bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            ou continue com
          </span>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-3 rounded-full border border-border bg-background py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? "Abrindo Google..." : "Google"}
        </button>

        <div className="mt-8 text-center text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setFeedback(null);
            }}
            className="text-primary font-semibold hover:underline"
          >
            {mode === "login" ? "Não tem uma conta? Cadastre-se" : "Já tem uma conta? Entre agora"}
          </button>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

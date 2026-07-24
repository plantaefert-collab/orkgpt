import { createFileRoute, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode, type ChangeEvent, useEffect, useRef, useLayoutEffect } from "react";
import { toast, Toaster } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import sceneEnraizar from "@/assets/scene-enraizar.jpg";
import sceneNutrir from "@/assets/scene-nutrir.jpg";
import { PlantaefertLogo } from "@/components/PlantaefertLogo";
import { playSuccessSound, playPopSound } from "@/lib/audio-feedback";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import {
  Sprout,
  Leaf,
  Home,
  Calendar,
  CalendarCheck,
  Stethoscope,
  Images,
  BookOpen,
  Camera,
  Droplets,
  Sun,
  Wind,
  FlowerIcon,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  RefreshCw,
  X,
  Plus,
  Info,
  Flower2,
  Sparkles,
  AlertCircle,
  Loader2,
  FileText,
  Download,
  Bell,
  Check,
  ArrowRight,
  Share2,
  HelpCircle,
  CheckSquare,
  Settings,
  Volume2,
  VolumeX,
  Zap,
  Clock,
  Smartphone,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useProtocolStore, isDiagnosisCurrent, defaultState, getState, computeFocusDay, isDayFullyDone } from "@/lib/protocol-store";
import { PHOTO_ERROR_MESSAGE } from "@/lib/image-compress";
import { uploadOrEncodePhoto } from "@/lib/photo-upload";
import {
  getProtocolDay,
  getProtocolPhase,
  APPLICATION_DAYS,
  PHOTO_DAYS,
  PROTOCOL_PHASES,
  WEEKS,
  getWeekForDay,
  getFocusCategories,
  getFocusDays,
  type ProtocolDay,
  type DayStage,
  type RegisterOption,
  CATEGORY_FOCUS_DAYS,
} from "@/lib/protocol-plan";
import {
  CATEGORY_LABEL,
  DIAGNOSIS_OPTIONS,
  totalObservations,
  type DiagnosisCategory,
  type DiagnosisGuidance,
  type DiagnosisResult,
} from "@/lib/diagnosis-matrix";
import { useAuthBootstrap } from "@/hooks/use-auth-bootstrap";
import type { AuthBootstrapStatus } from "@/lib/auth/types";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { LegacyProgressDialog } from "@/components/auth/LegacyProgressDialog";
import { 
  hasLegacyData, 
  getLegacyData, 
  clearLegacyData, 
  isGuestActive, 
  setGuestActive, 
  getMigrationRecord, 
  saveMigrationRecord, 
  saveToCache 
} from "@/lib/protocol-cache";
import { saveProfileRemote, saveProgressRemote } from "@/lib/protocol-cloud";
import welcomeOrchid from "@/assets/welcome-orchid.jpg";
import kitMetodo from "@/assets/kit-metodo-app.jpg";
import { exportProtocolPDF, previewProtocolPDF, protocolPdfFilename } from "@/lib/pdf-export";
import { WelcomeScreen } from "@/components/WelcomeScreen";



export const Route = createFileRoute("/protocolo-21-dias")({
  head: () => ({
    meta: [
      { title: "Guia Prático Orquídeas Floridas — PlantaeFert" },
      {
        name: "description",
        content:
          "Protocolo interativo de 21 dias para diagnosticar, enraizar, nutrir e acompanhar sua orquídea com o método de 2 passos PlantaeFert.",
      },
      { property: "og:title", content: "Guia Prático Orquídeas Floridas — PlantaeFert" },
      {
        property: "og:description",
        content: "Plano guiado de 21 dias para orquídeas floridas.",
      },
    ],
  }),
  component: ProtocoloPage,
});

type Tab = "inicio" | "plano" | "diagnostico" | "diario" | "aprender" | "resumo" | "metodo" | "orquidea";

function phaseOf(day: number) {
  const phase = getProtocolPhase(day);
  const tones = {
    "fase-1": "green",
    "fase-2": "lilac",
    "fase-3": "accent",
  } as const;
  return {
    label: phase.title,
    range: phase.range,
    tone: tones[phase.id as keyof typeof tones] || "green",
  };
}

function ProtocoloPage() {
  return <ProtocoloShell />;
}

const TAB_TO_PATH: Record<Tab, string> = {
  inicio: "/inicio",
  plano: "/plano",
  diagnostico: "/diagnostico",
  diario: "/diario",
  aprender: "/aprender",
  resumo: "/resumo",
  metodo: "/metodo",
  orquidea: "/minha-orquidea",
};
const PATH_TO_TAB: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([t, p]) => [p, t as Tab]),
) as Record<string, Tab>;

function isLocalPreviewHost() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export function ProtocoloShell({ initialTab }: { initialTab?: Tab } = {}) {
  const store = useProtocolStore();
  const { status, user, error: authError, setStatus } = useAuthBootstrap();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [tab, _setTab] = useState<Tab>(initialTab ?? PATH_TO_TAB[pathname] ?? "inicio");
  const [previewDay, setPreviewDay] = useState<number | null>(null);
  const hasInitialTab = initialTab !== undefined;

  // Sync URL -> tab (voltar/avançar do navegador, deep links, compartilhamento)
  useEffect(() => {
    const fromPath = PATH_TO_TAB[pathname];
    if (fromPath && fromPath !== tab) _setTab(fromPath);
  }, [pathname]);

  // Sync tab -> URL
  const setTab = (next: Tab) => {
    _setTab(next);
    const target = TAB_TO_PATH[next];
    if (target && target !== pathname) {
      navigate({ to: target });
    }
  };

  const [guestMode, setGuestMode] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showLegacyDialog, setShowLegacyDialog] = useState(false);

  const actorId = user?.id ?? "guest";

  useEffect(() => {
    // O modo visitante só continua ativo quando foi escolhido explicitamente.
    // No localhost, liberamos a visualização como visitante para que cada aba
    // de preview funcione sem depender do sessionStorage de outra aba.
    // Fora do ambiente local, páginas internas sem sessão seguem para o login.
    if (status === "signed_out") {
      if (isGuestActive() || isLocalPreviewHost()) {
        if (isLocalPreviewHost()) setGuestActive(true);
        setGuestMode(true);
      } else if (hasInitialTab) {
        navigate({ to: "/auth", replace: true });
      }
    } else {
      setGuestMode(false);
    }
  }, [status, hasInitialTab, navigate]);


  useEffect(() => {
    if (status === "loading_remote_data" && hasLegacyData()) {
      // Verificação de marcador de migração
      if (user?.id && !getMigrationRecord(user.id)) {
        setShowLegacyDialog(true);
      }
    }
  }, [status, user?.id]);

  if (status === "booting" || status === "loading_remote_data") {
    return (
      <div className="min-h-screen bg-[#F8F5EE] relative flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        {/* Marca d'água botânica */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
          <svg width="400" height="400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#155F4E]">
             <path d="M50 10C50 10 40 30 40 50C40 70 50 90 50 90M50 10C50 10 60 30 60 50C60 70 50 90 50 90M20 50C20 50 40 45 50 50C60 55 80 50 80 50" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round"/>
             <circle cx="50" cy="50" r="2" fill="currentColor"/>
          </svg>
        </div>
        
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="mb-6 text-[#155F4E] relative z-10"
        >
          <div className="p-3 bg-white/50 backdrop-blur-sm rounded-full border border-[#155F4E]/10 shadow-sm">
            <Loader2 size={32} strokeWidth={1.5} />
          </div>
        </motion.div>
        <div className="font-display text-2xl text-[#155F4E] relative z-10 mb-2">Preparando sua jornada...</div>
        <div className="text-[10px] text-[#155F4E]/50 font-bold uppercase tracking-[0.2em] relative z-10">PlantaeFert Nutrição Vegetal</div>
      </div>
    );
  }

  if (status === "auth_error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h2 className="text-xl font-display text-foreground">Ops! Algo deu errado</h2>
        <p className="mt-2 text-muted-foreground max-w-xs">{authError || "Não foi possível carregar seus dados."}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 rounded-full bg-accent px-8 py-3 text-sm font-bold text-accent-foreground shadow-md shadow-accent/20"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="font-sans text-foreground antialiased selection:bg-accent/20">
      <Toaster 
        position="top-center" 
        richColors 
        toastOptions={{
          className: "font-sans",
          style: {
            borderRadius: '1rem',
            padding: '12px 16px',
          },
          classNames: {
            toast: "border shadow-lg",
            success: "bg-[#F8F5EE] border-[#155F4E]/20 text-[#155F4E]",
            info: "bg-[#F8EAF2] border-[#9C2F6F]/20 text-[#9C2F6F]",
            error: "bg-destructive/5 border-destructive/20 text-destructive",
            warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
          }
        }}
        icons={{
          success: <Sprout size={18} className="text-[#155F4E]" />,
          info: <Sparkles size={18} className="text-[#9C2F6F]" />,
          error: <AlertCircle size={18} className="text-destructive" />,
          warning: <AlertTriangle size={18} className="text-yellow-600" />,
        }}
      />
      <AnimatePresence mode="wait">
        {status === "signed_out" && !guestMode && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <WelcomeScreen
              onStart={() => setStatus("signing_in")}
              onExplore={() => {
                setGuestActive(true);
                setGuestMode(true);
                setTab("inicio");
              }}
              onRegisterOrchid={() => setStatus("needs_diagnosis")}
              onQuickAction={(t) => {
                setStatus("ready");
                setTab(t as Tab);
              }}
            />

          </motion.div>
        )}

        {status === "signing_in" && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <AuthScreen
              onBack={() => setStatus("signed_out")}
              onSuccess={() => {
                // O bootstrap cuidará da transição
              }}
            />
          </motion.div>
        )}

        {/* Overlay "Sincronizando..." é gerenciado pelo estado de carregamento
            inicial (booting/loading_remote_data) no early return acima. */}

        {/* O cadastro da planta agora é acessível via aba Início se o usuário desejar */}

        {status === "needs_diagnosis" && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-background"
          >
            <SignupScreen
              actorId={actorId}
              onBack={() => setStatus("ready")}
              onNext={() => setStatus("diagnosing")}
            />
          </motion.div>
        )}

        {status === "diagnosing" && (
          <motion.div
            key="diagnosis"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-background"
          >
            <DiagnosisScreen
              actorId={actorId}
              onBack={() => setStatus("needs_diagnosis")}
              onFinish={() => {
                store.saveDiagnosisResult(actorId);
                setStatus("reviewing_diagnosis_result");
                // Ao concluir o diagnóstico, a "Tarefa do dia" correspondente será exibida 
                // naturalmente ao retornar ao fluxo principal ou ao ver o resumo.
              }}
            />
          </motion.div>
        )}

        {status === "reviewing_diagnosis_result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-background"
          >
            <DiagnosisResultScreen
              actorId={actorId}
              onBack={() => setStatus("diagnosing")}
              onFinish={async () => {
                store.setOnboarded(true, actorId);
                if (actorId !== "guest") {
                  const { error } = await saveProfileRemote(actorId, { onboarded: true });
                  if (error) {
                    toast.warning("Resultado salvo neste aparelho", {
                      description: "A sincronização da conclusão será tentada novamente depois.",
                    });
                  }
                }
                setStatus("ready");
                setTab("inicio");
              }}
            />
          </motion.div>
        )}

        <AnimatePresence>
          {previewDay !== null && (
            <DayPreviewModal
              day={previewDay}
              onClose={() => setPreviewDay(null)}
              onSelect={() => {
                store.setCurrentDay(previewDay, actorId);
                setPreviewDay(null);
              }}
            />
          )}
        </AnimatePresence>

        {(status === "ready" || guestMode) && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <AppShell tab={tab} setTab={setTab} onReset={() => setShowReset(true)} userEmail={user?.email} setStatus={setStatus}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 10, rotateY: 5 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: -10, rotateY: -5 }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.22, 1, 0.36, 1],
                    opacity: { duration: 0.3 }
                  }}
                  style={{ perspective: "1000px" }}
                >
                  {tab === "inicio" && <InicioTab actorId={actorId} setTab={setTab} setStatus={setStatus} />}
                  {tab === "plano" && <PlanoTab actorId={actorId} setTab={setTab} onPreviewDay={setPreviewDay} setStatus={setStatus} />}
                  {tab === "diagnostico" && (
                    <DiagnosticoTab actorId={actorId} onRedo={() => setStatus("needs_diagnosis")} setTab={setTab} />
                  )}
                  {tab === "diario" && <DiarioTab actorId={actorId} />}
                  {tab === "aprender" && <AprenderTab setTab={setTab} />}
                  {tab === "resumo" && <ResumoTab actorId={actorId} />}
                  {tab === "metodo" && <MetodoContent />}
                  {tab === "orquidea" && <MinhaOrquideaTab actorId={actorId} setTab={setTab} />}
                </motion.div>
              </AnimatePresence>
            </AppShell>
          </motion.div>
        )}
      </AnimatePresence>

      {showLegacyDialog && user?.id && (
        <LegacyProgressDialog 
          onImport={async () => {
            const legacyData = getLegacyData();
            if (legacyData && user.id) {
              store.hydrateStore(legacyData);
              await saveProgressRemote(user.id, legacyData);
              saveMigrationRecord(user.id, { status: "imported", timestamp: new Date().toISOString() });
              clearLegacyData();
            }
            setShowLegacyDialog(false);
          }}
          onContinue={() => {
            if (user.id) {
              saveMigrationRecord(user.id, { status: "dismissed", timestamp: new Date().toISOString() });
            }
            setShowLegacyDialog(false);
          }}
        />
      )}

      <AnimatePresence>
        {showReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm"
            >
              <ConfirmModal
                title="Reiniciar meu plano?"
                description="Isso apagará cadastro, diagnóstico, checklists, fotos e anotações salvas."
                confirmLabel="Reiniciar meu plano"
                onCancel={() => setShowReset(false)}
                onConfirm={async () => {
                  store.clearStore();
                  saveToCache(actorId, defaultState);
                  if (user?.id) {
                    await saveProgressRemote(user.id, defaultState);
                  }
                  setShowReset(false);
                  setStatus("needs_diagnosis");
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhaseProgressBar({ currentDay }: { currentDay: number }) {
  const phaseInfo = useMemo(() => {
    const day = Math.min(21, Math.max(1, currentDay));
    if (day <= 7) return { label: "Fase 1: Dias 1–7", progress: (day / 7) * 100, color: "bg-primary" };
    if (day <= 14) return { label: "Fase 2: Dias 8–14", progress: ((day - 7) / 7) * 100, color: "bg-accent" };
    return { label: "Fase 3: Dias 15–21", progress: ((day - 14) / 7) * 100, color: "bg-accent" };
  }, [currentDay]);

  return (
    <div className="shrink-0 border-t border-border bg-card px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Progresso da {phaseInfo.label}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground">
          Dia <span className="font-display text-lg text-primary">{currentDay}</span> de 21
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          key={phaseInfo.label}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, phaseInfo.progress))}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full ${phaseInfo.color}`}
        />
      </div>
    </div>
  );
}

/* ---------------- Shell ---------------- */


function AppShell({
  tab,
  setTab,
  onReset,
  userEmail,
  setStatus,
  children,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onReset: () => void;
  userEmail?: string;
  setStatus?: (s: AuthBootstrapStatus) => void;
  children: ReactNode;
}) {
  const { state, clearSaveError } = useProtocolStore();
  const { user } = useAuthBootstrap();
  const actorId = user?.id || "guest";
  const diagnosisFresh = isDiagnosisCurrent(state);
  return (
    <div className="h-[100dvh] overflow-hidden bg-background font-sans selection:bg-primary/10">
      <div className="mx-auto flex h-[100dvh] min-h-0 max-w-[440px] flex-col shadow-[0_30px_90px_-20px_rgba(23,61,50,0.1)] sm:my-4 sm:h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border sm:border-border sm:bg-card">
        <header className="sticky top-0 z-20 flex shrink-0 flex-col border-b border-border bg-card/80 backdrop-blur-md sm:rounded-t-2xl">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <Link to="/" className="flex items-center" aria-label="PlantaeFert — Início">
              <PlantaefertLogo className="h-10 w-auto object-contain" />
            </Link>
            <div className="flex items-center gap-1">
              {state.plant.name && (
                <div className="hidden max-w-[130px] items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground sm:flex">
                  <Flower2 size={12} className="shrink-0" />
                  <span className="truncate">{state.plant.name}</span>
                </div>
              )}
              <button
                onClick={onReset}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Reiniciar meu plano"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          
          {/* Marca d'água botânica linear sutil no header */}
          <div className="absolute right-0 top-0 h-full w-32 pointer-events-none opacity-[0.04] overflow-hidden">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary w-full h-full">
              <path d="M10 90C30 70 40 40 90 10M10 90C40 80 60 70 90 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <path d="M40 60C45 55 55 55 60 60M30 70C35 65 45 65 50 70" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round"/>
            </svg>
          </div>
        </header>

        {state.saveError && (
          <div
            role="alert"
            className="flex items-start gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 text-[13px] leading-snug text-destructive"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{state.saveError}</span>
            <button
              onClick={clearSaveError}
              aria-label="Fechar aviso"
              className="ml-1 rounded-full p-1 text-destructive hover:bg-destructive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <main className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-28 pt-4 [-webkit-overflow-scrolling:touch]">
          <div className="relative space-y-6">
            {tab === "inicio" && userEmail && (
              <AccountMenu 
                email={userEmail} 
                onLogout={() => {
                  // O bootstrap cuidará do redirecionamento
                }} 
              />
            )}
            {children}
          </div>
        </main>

        <PhaseProgressBar currentDay={state.currentDay} />
        <nav className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-card/90 shadow-[0_-8px_24px_-20px_rgba(21,95,78,0.45)] backdrop-blur-md sm:rounded-b-2xl">
          <div className="relative grid h-[68px] grid-cols-5">
            <TabBtn
              active={tab === "inicio"}
              onClick={() => setTab("inicio")}
              icon={<Home size={20} />}
              label="Início"
            />
            <TabBtn
              active={tab === "orquidea"}
              onClick={() => setTab("orquidea")}
              icon={
                state.plant.photo ? (
                  <div className="h-5 w-5 overflow-hidden rounded-full ring-1 ring-primary/20">
                    <img src={state.plant.photo} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <Flower2 size={20} />
                )
              }

              label="Orquídea"
            />
            <TabBtn
              active={tab === "plano"}
              onClick={() => setTab("plano")}
              featured
              icon={<CalendarCheck size={22} id="nav-plano" />}
              label="Plano"
            />
            <TabBtn
              active={tab === "diagnostico"}
              onClick={() => setTab("diagnostico")}
              icon={
                <div className="relative">
                  <Stethoscope size={20} />
                  {!diagnosisFresh && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-card ring-2 ring-accent"
                    />
                  )}
                </div>
              }
              label="Diagnóstico"
            />
            <TabBtn
              active={tab === "aprender"}
              onClick={() => setTab("aprender")}
              icon={<BookOpen size={20} />}
              label="Dicas"
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  ariaLabel,
  featured = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  ariaLabel?: string;
  featured?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative h-[68px] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        featured && "text-accent",
        !featured && (active ? "text-primary" : "text-muted-foreground hover:text-foreground"),
      )}
    >
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2",
          featured ? "-top-4" : "top-1.5",
        )}
      >
        <span
          className={cn(
            "grid place-items-center transition-all duration-500",
            featured
              ? "h-[52px] w-[52px] rounded-full border-2 border-accent/40 bg-accent text-accent-foreground shadow-[0_10px_22px_-10px_rgba(156,47,111,0.75)] ring-1 ring-accent/25 hover:scale-105 hover:bg-accent/90"
              : "h-9 w-9 rounded-xl",
            !featured && (active ? "scale-105 bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-transparent"),
            featured && active && "ring-2 ring-accent/50",
          )}
        >
          {icon}
        </span>
        {active && (
          <motion.div
            layoutId="tabGlow"
            className={cn(
              "absolute -inset-1 z-[-1] blur-md",
              featured ? "rounded-full bg-accent/25" : "rounded-2xl bg-primary/10",
            )}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </div>
      <span
        className={cn(
          "absolute inset-x-0 bottom-1.5 whitespace-nowrap text-center text-[11px] font-bold uppercase tracking-wide transition-opacity duration-300",
          featured && "text-accent opacity-100",
          !featured && (active ? "opacity-100" : "opacity-60"),
        )}
      >
        {label}
      </span>
    </button>
  );
}

/* ---------------- Welcome (moved to @/components/WelcomeScreen) ---------------- */


/* ---------------- Auth ---------------- */



function SignupScreen({
  actorId,
  onNext,
  onBack,
}: {
  actorId: string;
  onNext: () => void;
  onBack?: () => void;
}) {
  const { state, updatePlant } = useProtocolStore();

  const plant = state.plant;

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const photo = await uploadOrEncodePhoto(file, actorId);
      updatePlant({ photo }, actorId);
    } catch {
      alert(PHOTO_ERROR_MESSAGE);
    }
  };

  const canSave = plant.name.trim().length > 0;

  return (
    <div className="min-h-screen overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-screen max-w-[440px] flex-col px-5 py-6 sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:shadow-[0_15px_50px_-30px_rgba(23,61,50,0.25)]">
        <div className="flex items-start justify-between">
          <StepHeader
            step={1}
            total={3}
            title="Cadastro da orquídea"
            subtitle="Conte um pouco sobre sua planta."
          />
          {onBack && (
            <button
              onClick={onBack}
              className="mt-1 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Voltar para o início"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="mt-6 space-y-5">
          <Field label="Nome da planta *">
            <input
              value={plant.name}
              onChange={(e) => {
                const name = e.target.value;
                updatePlant({ name }, actorId);
              }}
              placeholder="Ex.: Minha Phalaenopsis"
              className="w-full rounded-lg border border-input bg-card px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label="Espécie (opcional)">
            <input
              value={plant.species}
              onChange={(e) => {
                const species = e.target.value;
                updatePlant({ species, unknownSpecies: false }, actorId);
              }}
              disabled={plant.unknownSpecies}
              placeholder="Ex.: Phalaenopsis, Cattleya…"
              className="w-full rounded-lg border border-input bg-card px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={plant.unknownSpecies}
                onChange={(e) => {
                  const unknownSpecies = e.target.checked;
                  updatePlant({
                    unknownSpecies,
                    species: unknownSpecies ? "" : plant.species,
                  }, actorId);
                }}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Não sei a espécie
            </label>
          </Field>

          <SelectField
            label="Local de cultivo"
            value={plant.location}
            onChange={(v) => updatePlant({ location: v }, actorId)}
            options={["Varanda", "Janela interna", "Jardim externo", "Estufa", "Outro"]}
          />

          <SelectField
            label="Tipo de vaso"
            value={plant.pot}
            onChange={(v) => updatePlant({ pot: v }, actorId)}
            options={[
              "Vaso plástico transparente",
              "Vaso plástico comum",
              "Vaso de barro",
              "Vaso de madeira",
              "Cachepot",
              "Outro",
            ]}
          />

          <SelectField
            label="Tipo de substrato"
            value={plant.substrate}
            onChange={(v) => updatePlant({ substrate: v }, actorId)}
            options={[
              "Casca de pinus",
              "Fibra de coco",
              "Musgo (sphagnum)",
              "Mistura",
              "Não sei",
              "Outro",
            ]}
          />

          <SelectField
            label="Principal dificuldade"
            value={plant.difficulty}
            onChange={(v) => updatePlant({ difficulty: v }, actorId)}
            options={[
              "Não floresce",
              "Folhas caídas ou enrugadas",
              "Raízes fracas",
              "Manchas nas folhas",
              "Não sei o que fazer",
              "Outra",
            ]}
          />

          <Field label="Foto atual da planta">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-colors hover:border-primary/40">
              {plant.photo ? (
                <img
                  src={plant.photo}
                  alt="Sua orquídea"
                  className="max-h-48 rounded-lg object-cover"
                />
              ) : (
                <>
                  <Camera size={22} className="text-muted-foreground" />
                  <div className="text-sm font-medium text-foreground">Enviar foto</div>
                  <div className="text-xs text-muted-foreground">Salva apenas no seu navegador</div>
                </>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
            </label>
            {plant.photo && (
              <button
                onClick={() => updatePlant({ photo: null }, actorId)}
                className="mt-2 text-xs text-muted-foreground underline"
              >
                Remover foto
              </button>
            )}
          </Field>
        </div>
        <div className="mt-8 pb-4">

        <button
          onClick={async () => {
            if (actorId !== "guest") {
              const { registerPlantRemote } = await import("@/lib/protocol-cloud");
              const { error } = await registerPlantRemote(actorId, {
                plant_name: plant.name,
                plant_species: plant.species,
                plant_unknown_species: plant.unknownSpecies,
                plant_location: plant.location,
                plant_pot: plant.pot,
                plant_substrate: plant.substrate,
                plant_difficulty: plant.difficulty,
              });
              if (error) {
                console.error("Erro ao registrar planta:", error);
                alert("Erro ao salvar dados da orquídea. Tente novamente.");
                return;
              }
            }
            onNext();
          }}
          disabled={!canSave}
          className="mt-8 w-full rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          Salvar e fazer diagnóstico
        </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-card px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Selecione…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

function StepHeader({
  step,
  total,
  title,
  subtitle,
}: {
  step: number;
  total: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-accent">
        Passo {step} de {total}
      </div>
      <h1 className="mt-1 text-2xl font-display tracking-tight text-primary">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/* ---------------- Diagnosis ---------------- */

const DIAG_CATEGORIES: Array<{ key: DiagnosisCategory; icon: ReactNode }> = [
  { key: "roots", icon: <Sprout size={18} /> },
  { key: "leaves", icon: <Leaf size={18} /> },
  { key: "environment", icon: <Sun size={18} /> },
  { key: "potAndSubstrate", icon: <FlowerIcon size={18} /> },
  { key: "wateringAndRoutine", icon: <Droplets size={18} /> },
];

function DiagnosisScreen({ actorId, onFinish, onBack }: { actorId: string; onFinish: () => void; onBack: () => void }) {
  const { state, toggleDiagnosis, clearSaveError } = useProtocolStore();

  const total = DIAG_CATEGORIES.length;
  const totalSelected = DIAG_CATEGORIES.reduce(
    (acc, c) => acc + state.diagnosis[c.key].length,
    0,
  );
  const categoriesWithAnswers = DIAG_CATEGORIES.filter(
    (c) => state.diagnosis[c.key].length > 0,
  ).length;
  const [openItem, setOpenItem] = useState<string | undefined>(DIAG_CATEGORIES[0].key);

  return (
    <div className="min-h-screen overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-screen max-w-[440px] flex-col px-5 py-6 sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:shadow-[0_15px_50px_-30px_rgba(23,61,50,0.25)]">
        <StepHeader
          step={2}
          total={3}
          title="Diagnóstico guiado"
          subtitle="Toque em cada categoria e marque os sinais que você observa."
        />

        <ProgressBar value={(categoriesWithAnswers / total) * 100} className="mt-4" />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{categoriesWithAnswers} de {total} categorias exploradas</span>
          <span>{totalSelected} sinal(is) marcado(s)</span>
        </div>

        {state.saveError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm text-accent"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{state.saveError}</span>
            <button
              type="button"
              onClick={clearSaveError}
              aria-label="Fechar aviso"
              className="rounded-full p-1 text-accent hover:bg-accent/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <Accordion
          type="single"
          collapsible
          value={openItem}
          onValueChange={setOpenItem}
          className="mt-5 space-y-2"
        >
          {DIAG_CATEGORIES.map((c) => {
            const options = DIAGNOSIS_OPTIONS[c.key];
            const selected = state.diagnosis[c.key];
            const count = selected.length;
            return (
              <AccordionItem
                key={c.key}
                value={c.key}
                className="overflow-hidden rounded-2xl border border-border bg-card data-[state=open]:border-primary/40"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex flex-1 items-center gap-3 pr-2">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
                        count > 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                      }`}
                    >
                      {count > 0 ? <CheckCircle2 size={16} /> : c.icon}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate text-left text-sm font-semibold text-foreground">
                        {CATEGORY_LABEL[c.key]}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          count > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count > 0 ? `${count} marcado(s)` : "toque para abrir"}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Toque nos chips que descrevem a observação atual.
                  </p>
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label={`Alternativas de ${CATEGORY_LABEL[c.key]}`}
                  >
                    {options.map((opt) => {
                      const active = selected.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleDiagnosis(c.key, opt, actorId)}
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-foreground hover:border-primary/40"
                          }`}
                        >
                          {active ? <CheckCircle2 size={14} /> : <Circle size={14} className="text-muted-foreground" />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <InfoCard tone="lilac" icon={<Info size={16} />}>
          Um sinal isolado não fecha um diagnóstico. Marque só o que observa hoje — você pode voltar e editar.
        </InfoCard>

        <div className="mt-auto pt-8 flex gap-2 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 rounded-full border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft size={16} /> Voltar
          </button>
          <button
            onClick={onFinish}
            className="ml-auto flex items-center gap-1 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver resultado <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}


/* ---------------- Diagnosis Result Screen ---------------- */

function DiagnosisResultScreen({ actorId, onBack, onFinish }: { actorId: string; onBack: () => void; onFinish: () => void }) {
  const { state } = useProtocolStore();
  const observations = totalObservations(state.diagnosis);
  const current = isDiagnosisCurrent(state);
  const result = state.diagnosisResult;

  return (
    <div className="min-h-screen overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-screen max-w-[440px] flex-col px-5 py-6 sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:shadow-[0_15px_50px_-30px_rgba(23,61,50,0.25)]">
        <StepHeader
          step={3}
          total={3}
          title="Seu resultado personalizado"
          subtitle={
            state.plant.name
              ? `Baseado nas suas observações sobre “${state.plant.name}”.`
              : "Baseado nas suas observações de hoje."
          }
        />
        <div className="mt-3 text-xs text-muted-foreground">
          {observations} {observations === 1 ? "sinal observado" : "sinais observados"}. Este
          resultado orienta o acompanhamento — não é um diagnóstico definitivo.
        </div>

        {result ? (
          <div className="space-y-4">
            {!current && (
              <InfoCard tone="warn" icon={<AlertTriangle size={16} />}>
                As respostas foram alteradas. Este resultado pode estar desatualizado, mas você ainda pode visualizá-lo abaixo.
              </InfoCard>
            )}
            <ResultBlocks result={result} answers={state.diagnosis} />
          </div>
        ) : (
          <div className="mt-5">
            <InfoCard tone="lilac" icon={<Info size={16} />}>
              O resultado está sendo preparado. Revise as respostas e toque em “Ver resultado” para
              gerar as orientações personalizadas.
            </InfoCard>
          </div>
        )}

        {result && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                try {
                  await exportProtocolPDF(state);
                  toast.success("Diagnóstico exportado em PDF");
                } catch {
                  toast.error("Não foi possível gerar o PDF");
                }
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download size={16} /> Baixar em PDF
            </button>
            <button
              onClick={async () => {
                const text = `Meu diagnóstico da orquídea${state.plant.name ? ` "${state.plant.name}"` : ""}: ${result.priorities.length} prioridade(s), ${result.adjustments.length} ajuste(s), ${result.favorable.length} sinal(is) favorável(is).`;
                try {
                  if (navigator.share) {
                    await navigator.share({ title: "Diagnóstico da minha orquídea", text, url: window.location.href });
                  } else {
                    await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
                    toast.success("Resumo copiado para a área de transferência");
                  }
                } catch {
                  /* usuário cancelou */
                }
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Share2 size={16} /> Compartilhar
            </button>
          </div>
        )}

        <div className="mt-auto pt-8 flex gap-2 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 rounded-full border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft size={16} /> Revisar respostas
          </button>
          {result && (
            <button
              onClick={onFinish}
              className="ml-auto flex items-center gap-1 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver meu acompanhamento <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultBlocks({
  result,
  answers,
}: {
  result: DiagnosisResult;
  answers?: Record<DiagnosisCategory, string[]>;
}) {
  const {
    priorities,
    adjustments,
    favorable,
    insufficientInformation,
    trackingPoints,
    conflicts,
    insights,
  } = result;
  const hasAny =
    priorities.length + adjustments.length + favorable.length + insufficientInformation.length > 0;

  const nextSteps = [...priorities, ...adjustments].slice(0, 3);

  // Health score e veredito vêm do motor (fonte única de verdade — diagnosis-matrix.ts).
  const score = result.healthScore;
  const scoreStatus = result.healthStatus;
  const scoreColor = "text-accent";
  const scoreBgCls = "border-accent/45 bg-gradient-to-br from-accent/[0.15] via-accent/[0.07] to-card shadow-[0_10px_28px_-18px_rgba(156,47,111,0.55)] ring-1 ring-accent/10";

  return (
    <div className="mt-5 space-y-3">
      {hasAny && (
        <div className={`rounded-2xl border p-4 ${scoreBgCls}`}>
          <div className="flex items-center gap-4">
            <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-card shadow-inner ring-1 ring-accent/15">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-accent/15" />
                <motion.circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className={scoreColor}
                  initial={{ strokeDasharray: "0 214", strokeDashoffset: 0 }}
                  animate={{ strokeDasharray: `${(score / 100) * 214} 214` }}
                  transition={{ duration: 1, ease: "circOut" }}
                />
              </svg>
              <div className="text-center">
                <div className={`font-display text-2xl leading-none ${scoreColor}`}>{score}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-accent/70">saúde</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-accent/70">Veredito</div>
              <div className={`font-display text-lg leading-tight ${scoreColor}`}>{scoreStatus.label}</div>
              <p className="mt-1 text-xs leading-relaxed text-accent/80">{scoreStatus.message}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-accent/10 bg-card/80 py-2">
              <div className="text-lg font-bold text-accent">{priorities.length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-accent/65">prioridades</div>
            </div>
            <div className="rounded-lg border border-accent/10 bg-card/80 py-2">
              <div className="text-lg font-bold text-accent">{adjustments.length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-accent/65">ajustes</div>
            </div>
            <div className="rounded-lg border border-accent/10 bg-card/80 py-2">
              <div className="text-lg font-bold text-accent">{favorable.length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-accent/65">favoráveis</div>
            </div>
          </div>
          {nextSteps.length > 0 && (
            <div className="mt-3 rounded-xl border border-accent/15 bg-card/85 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-accent">Próximos passos</div>
              <ol className="mt-2 space-y-2 text-sm text-accent/80">
                {nextSteps.map((s, i) => (
                  <li key={s.id} className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                      {i + 1}
                    </span>
                    <span>
                      <strong className="text-accent">{s.title}.</strong> {s.action}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
      {hasAny && (
        <DiagnosisSummaryChecklist
          score={score}
          statusLabel={scoreStatus.label}
          priorities={priorities}
          adjustments={adjustments}
        />
      )}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className="rounded-2xl border border-accent/40 bg-accent/5 p-4"
            >
              <div className="flex items-start gap-2.5">
                <Droplets size={18} className="mt-0.5 shrink-0 text-accent" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-accent">{ins.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/80">{ins.message}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ins.relatedAnswers.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-accent/30 bg-card px-2 py-0.5 text-[11px] text-foreground/70"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <HelpCircle size={16} className="text-primary" /> Sinais opostos — vale reconferir
          </div>
          <ul className="mt-2 space-y-1.5">
            {conflicts.map((c) => (
              <li key={c.category} className="text-xs leading-relaxed text-muted-foreground">
                Em <strong className="text-foreground">{CATEGORY_LABEL[c.category]}</strong> você marcou
                “{c.favorable}” e “{c.priority}” ao mesmo tempo. Observe novamente com calma para confirmar o que se aplica hoje.
              </li>
            ))}
          </ul>
        </div>
      )}
      {!hasAny && (
        <InfoCard tone="lilac" icon={<Info size={16} />}>
          Ainda há poucas informações registradas. Use os pontos abaixo como roteiro de observação
          para completar o diagnóstico com mais segurança.
        </InfoCard>
      )}
      {priorities.length > 0 && (
        <ResultSection title="Pontos que merecem atenção próxima" tone="warn" items={priorities} />
      )}
      {adjustments.length > 0 && (
        <ResultSection title="Ajustes recomendados" tone="accent" items={adjustments} />
      )}
      {favorable.length > 0 && (
        <ResultSection title="Sinais favoráveis" tone="green" items={favorable} />
      )}
      {insufficientInformation.length > 0 && (
        <ResultSection title="Ainda não observado" tone="muted" items={insufficientInformation} />
      )}
      {trackingPoints.length > 0 && (
        <div className="rounded-2xl border border-border bg-secondary/50 p-4">
          <div className="text-sm font-bold text-primary">Pontos para acompanhar</div>
          <ul className="mt-2 space-y-1.5">
            {trackingPoints.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-secondary-foreground/90">
                <ChevronRight size={16} className="mt-0.5 shrink-0 text-primary" /> {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {answers && (
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card">
          <AccordionItem value="why" className="border-none">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <HelpCircle size={16} /> Como chegamos nesse diagnóstico
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">
                Este resultado combina as respostas por categoria. Categorias com mais sinais têm maior peso no veredito.
              </p>
              <ul className="mt-3 space-y-2">
                {(Object.keys(CATEGORY_LABEL) as DiagnosisCategory[]).map((cat) => {
                  const values = answers[cat] ?? [];
                  return (
                    <li key={cat} className="rounded-lg border border-border/60 bg-muted/40 p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider text-primary">{CATEGORY_LABEL[cat]}</div>
                        <div className="text-[10px] text-muted-foreground">{values.length} sinal(is)</div>
                      </div>
                      {values.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {values.map((v) => (
                            <span key={v} className="rounded-full bg-card px-2 py-0.5 text-[11px] text-foreground/80 border border-border/60">
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] italic text-muted-foreground">Nenhum sinal marcado.</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      <InfoCard tone="lilac" icon={<Info size={16} />}>
        Um sinal isolado não fecha um diagnóstico. Utilize estas orientações como apoio à
        observação.
      </InfoCard>
    </div>
  );
}

function DiagnosisSummaryChecklist({
  score,
  statusLabel,
  priorities,
  adjustments,
}: {
  score: number;
  statusLabel: string;
  priorities: DiagnosisGuidance[];
  adjustments: DiagnosisGuidance[];
}) {
  const steps = useMemo(
    () => [...priorities, ...adjustments].slice(0, 6),
    [priorities, adjustments]
  );
  const storageKey = useMemo(
    () => `diagnosis-summary-checks:${steps.map((s) => s.id).join("|")}`,
    [steps]
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {
      /* ignore */
    }
  }, [checked, storageKey]);

  const affected = useMemo(() => {
    const counts = new Map<DiagnosisCategory, number>();
    [...priorities, ...adjustments].forEach((g) => {
      counts.set(g.category, (counts.get(g.category) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [priorities, adjustments]);

  const doneCount = steps.filter((s) => checked[s.id]).length;
  const progressPct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary/70 to-secondary/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Resumo do diagnóstico
          </div>
          <div className="font-display text-base text-primary">
            {statusLabel} · saúde {score}/100
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary">
            {doneCount}/{steps.length}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            concluídos
          </div>
        </div>
      </div>

      {affected.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Categorias mais afetadas
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {affected.map(([cat, n]) => (
              <span
                key={cat}
                className="rounded-full border border-primary/25 bg-card px-2.5 py-0.5 text-[11px] font-medium text-primary"
              >
                {CATEGORY_LABEL[cat]} · {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Próximos passos
            </div>
            <div className="text-[10px] text-muted-foreground">{progressPct}%</div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <ul className="mt-3 space-y-2">
            {steps.map((s) => {
              const isDone = !!checked[s.id];
              return (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 bg-card/80 p-2.5 hover:bg-card">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [s.id]: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span
                      className={`text-sm ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      <strong>{s.title}.</strong> {s.action}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResultSection({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "warn" | "accent" | "green" | "muted";
  items: DiagnosisGuidance[];
}) {
  const toneCls =
    tone === "warn"
      ? "border-accent/40 bg-accent/5"
      : tone === "accent"
        ? "border-primary/20 bg-lilac/40"
        : tone === "green"
          ? "border-primary/20 bg-secondary/40"
          : "border-border bg-card";
  return (
    <section className={`rounded-3xl border p-5 shadow-sm transition-all hover:shadow-md ${toneCls}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary/80">{title}</h3>
        <div className={`h-2 w-2 rounded-full animate-pulse ${
          tone === "warn" ? "bg-accent" : 
          tone === "accent" ? "bg-primary" : 
          tone === "green" ? "bg-primary" : "bg-muted-foreground"
        }`} />
      </div>
      <ul className="space-y-4">
        {items.map((g) => {
          const isCriticalDay = [3, 10, 17].some(d => CATEGORY_FOCUS_DAYS[g.category]?.includes(d));
          return (
            <li key={g.id} className={cn(
              "group relative overflow-hidden rounded-2xl border bg-card/70 p-4 transition-all hover:border-primary/40",
              isCriticalDay ? "border-accent/30 ring-1 ring-accent/10" : "border-border/60"
            )}>
              {isCriticalDay && (
                <div className="absolute right-0 top-0 rounded-bl-xl bg-accent px-2.5 py-1 text-[9px] font-black uppercase tracking-tighter text-white shadow-sm ring-1 ring-white/20">
                  Dia Crítico
                </div>
              )}
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                {CATEGORY_LABEL[g.category]} · {g.answer}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-base font-bold text-primary">{g.title}</div>
                {isCriticalDay && <Zap size={14} className="text-accent animate-pulse" />}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{g.explanation}</p>
              
              <div className="mt-4 flex flex-col gap-2.5">
                <div className="rounded-xl bg-primary/5 p-3 border border-primary/10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 block mb-1">O que fazer</span>
                  <span className="text-sm font-medium text-foreground/90">{g.action}</span>
                </div>
                
                {(g.avoid || g.tracking.length > 0 || g.warning) && (
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {g.avoid && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <X size={14} className="mt-0.5 shrink-0 text-accent/60" />
                        <p><span className="font-bold text-foreground/70">Evite:</span> {g.avoid}</p>
                      </div>
                    )}
                    {g.tracking.length > 0 && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Info size={14} className="mt-0.5 shrink-0 text-primary/60" />
                        <p><span className="font-bold text-foreground/70">Acompanhe:</span> {g.tracking.join(" · ")}</p>
                      </div>
                    )}
                    {g.warning && (
                      <div className="mt-1 flex gap-2 rounded-xl bg-accent p-2.5 text-xs text-white border border-accent/20">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-white" />
                        <span className="font-bold">{g.warning}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProgressBar({ value, className = "", color = "bg-primary" }: { value: number; className?: string; color?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

function InfoCard({
  tone,
  icon,
  children,
}: {
  tone: "lilac" | "warn" | "green";
  icon: ReactNode;
  children: ReactNode;
}) {
  const styles =
    tone === "warn"
      ? "border-accent/40 bg-accent/10 text-accent"
      : tone === "lilac"
        ? "border-lilac bg-lilac/60 text-lilac-foreground"
        : "border-border bg-secondary text-secondary-foreground";
  return (
    <div className={`flex gap-2 rounded-2xl border p-3.5 text-sm leading-relaxed ${styles}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

/* ---------------- Sistema visual de cards ---------------- */

const APP_CARD_BASE = "rounded-2xl border border-primary/25 bg-primary/[0.04] shadow-sm";
const APP_CARD_INTERACTIVE = `${APP_CARD_BASE} transition-all hover:border-primary/40 hover:bg-primary/[0.06] active:scale-[0.99]`;
const APP_CARD_FEATURED = "rounded-2xl border-2 border-accent/50 bg-gradient-to-br from-accent/[0.16] via-accent/[0.05] to-card shadow-[0_10px_32px_-14px_rgba(156,47,111,0.36)] ring-1 ring-accent/15";
const APP_CARD_GREEN_FEATURED = "rounded-2xl border-2 border-primary/45 bg-gradient-to-br from-primary/[0.14] via-primary/[0.04] to-card shadow-[0_10px_32px_-14px_rgba(21,95,78,0.34)] ring-1 ring-primary/15";
const APP_CARD_ACCENT_LAYER = "border-2 border-accent/50 bg-gradient-to-br from-accent/[0.16] via-accent/[0.05] to-card shadow-[0_10px_32px_-14px_rgba(156,47,111,0.36)] ring-1 ring-accent/15";
const APP_CARD_INNER = "rounded-xl border border-primary/15 bg-card shadow-[0_4px_14px_-10px_rgba(21,95,78,0.45)]";
const APP_CARD_INNER_HOVER = `${APP_CARD_INNER} transition-all hover:border-primary/35 hover:bg-primary/[0.06] hover:shadow-sm`;
const APP_CARD_INNER_INTERACTIVE = `${APP_CARD_INNER_HOVER} active:scale-[0.99]`;

/* ---------------- Início ---------------- */

function InicioTab({ actorId, setTab, setStatus }: { actorId: string; setTab: (t: Tab) => void; setStatus: (s: AuthBootstrapStatus) => void }) {
  const handleRedirectToPlan = () => {
    setTab("plano");
    toast.success("Abrindo seu plano de 21 dias", {
      description: "Confira as tarefas para hoje.",
      duration: 3000,
    });
    // O foco e scroll serão tratados pelo useEffect na PlanoTab
  };
  const { state, setCurrentDay, updateSettings, updateDay } = useProtocolStore();
  
  const playInteractionSound = () => {
    if (state.settings?.muteSounds) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio interaction blocked", e);
    }
  };
  const focusedMode = !!state.settings?.focusedMode;
  const setFocusedMode = (v: boolean) => updateSettings({ focusedMode: v }, actorId);

  // Sistema de Áudio para Notificações Críticas
  const playCriticalSound = () => {
    if (state.settings?.muteSounds) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      // Som mais "premium" e alerta: dois bips em harmonia
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // A4
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio context not supported or blocked", e);
    }
  };
  




  // Foco do dia = fonte única compartilhada (Início, Minha Orquídea, Plano).
  const focusDay = computeFocusDay(state, (d) => getProtocolDay(d).checklist);
  const day = focusDay;
  const phase = phaseOf(day);
  const isApplicationDay = APPLICATION_DAYS.includes(day);
  const diagnosisFresh = isDiagnosisCurrent(state);
  const hasPlant = !!state.plant.name?.trim();
  const journeyReady = hasPlant && diagnosisFresh && state.onboarded;

  const initialFlowCard = !hasPlant
    ? {
        step: 1,
        title: "Cadastre sua orquídea",
        description: "Conte sobre sua planta para iniciarmos um acompanhamento realmente personalizado.",
        action: "Começar cadastro e diagnóstico",
        icon: <Plus size={20} />,
        open: () => setStatus("needs_diagnosis"),
      }
    : !diagnosisFresh
      ? {
          step: 2,
          title: "Faça o diagnóstico guiado",
          description: "O cadastro está pronto. Agora observe cinco áreas para gerar as recomendações da sua planta.",
          action: "Continuar diagnóstico",
          icon: <Stethoscope size={20} />,
          open: () => setStatus("diagnosing"),
        }
      : {
          step: 3,
          title: "Veja seu resultado personalizado",
          description: "Suas respostas já foram analisadas. Confira o resultado para liberar o acompanhamento de 21 dias.",
          action: "Ver meu resultado",
          icon: <CheckCircle2 size={20} />,
          open: () => setStatus("reviewing_diagnosis_result"),
        };

  // Mantém state.currentDay sincronizado com o foco real do usuário
  // para que ao abrir o plano ele já esteja no dia correto.
  useEffect(() => {
    if (state.currentDay !== focusDay) {
      setCurrentDay(focusDay, actorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDay]);

  const completedDays = Array.from({ length: 21 }, (_, i) => i + 1).filter((d) =>
    isDayFullyDone(state, d, getProtocolDay(d).checklist),
  ).length;
  const totalApplications = state.applications.length;
  const totalNotes = Object.values(state.days).filter((d) => d.note?.trim()).length;
  const totalPhotos = Object.values(state.days).filter((d) => d.photo).length;

  // Dados para o "Resumo do dia" e "Próximos cuidados"
  const todayEntry = state.days[day] ?? { checklist: {}, note: "", completed: false };
  const todayMeta = getProtocolDay(day);
  const totalTasks = todayMeta.checklist.length;
  const doneTasks = todayMeta.checklist.filter((label) => !!todayEntry.checklist?.[label]).length;
  const noteDone = !!todayEntry.note?.trim();
  const photoDone = !!todayEntry.photo;
  const appsDoneToday = state.applications.filter((a) => a.day === day).length;
  const hasPendencies = doneTasks < totalTasks || !noteDone || !photoDone;
  const dayFullyDone = isDayFullyDone(state, day, todayMeta.checklist);

  const pendingCareLabels = [
    ...(doneTasks < totalTasks
      ? [`${totalTasks - doneTasks} ${totalTasks - doneTasks === 1 ? "tarefa" : "tarefas"}`]
      : []),
    ...(isApplicationDay && !todayEntry.applicationDone ? ["aplicação"] : []),
    ...(todayMeta.requiresPhoto && !photoDone ? ["foto de acompanhamento"] : []),
  ];

  const formatCareList = (items: string[]) => {
    if (items.length <= 1) return items[0] ?? "";
    return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
  };

  const milestoneDay = [3, 7, 10, 14, 17, 21].find((candidate) => candidate > day);
  const milestoneMeta = milestoneDay ? getProtocolDay(milestoneDay) : null;
  const diagnosisGuidance = diagnosisFresh
    ? state.diagnosisResult?.priorities[0] ?? state.diagnosisResult?.adjustments[0]
    : undefined;
  const diagnosisFocusDay = diagnosisGuidance
    ? getFocusDays([diagnosisGuidance.category]).find((candidate) => candidate >= day) ?? day
    : day;

  type NextCareItem = {
    id: string;
    label: string;
    title: string;
    description: string;
    icon: ReactNode;
    onClick: () => void;
  };

  const nextCareItems: NextCareItem[] = [];

  if (pendingCareLabels.length > 0) {
    nextCareItems.push({
      id: `today-${day}`,
      label: "Hoje",
      title: `Conclua os cuidados do Dia ${day}`,
      description: `Ainda falta ${formatCareList(pendingCareLabels)}.`,
      icon: <CheckSquare size={17} />,
      onClick: handleRedirectToPlan,
    });
  }

  if (milestoneDay && milestoneMeta) {
    nextCareItems.push({
      id: `milestone-${milestoneDay}`,
      label: `Próximo marco · Dia ${milestoneDay}`,
      title: milestoneMeta.title,
      description: milestoneMeta.mainAction,
      icon: <CalendarCheck size={17} />,
      onClick: () => {
        setCurrentDay(milestoneDay, actorId);
        handleRedirectToPlan();
      },
    });
  }

  if (diagnosisGuidance) {
    nextCareItems.push({
      id: `diagnosis-${diagnosisGuidance.category}`,
      label: `Diagnóstico · ${CATEGORY_LABEL[diagnosisGuidance.category]}`,
      title: diagnosisGuidance.title,
      description: diagnosisGuidance.action,
      icon: <Stethoscope size={17} />,
      onClick: () => {
        setCurrentDay(diagnosisFocusDay, actorId);
        handleRedirectToPlan();
      },
    });
  }

  const handleCompleteDay = () => {
    playInteractionSound();
    if (navigator.vibrate && !state.settings?.hapticsDisabled) {
      navigator.vibrate([15, 40, 15]);
    }
    const confirmed = window.confirm(
      `Confirmar a conclusão do Dia ${day}?\n\nTodas as tarefas serão marcadas como feitas e seu progresso será atualizado.`,
    );
    if (!confirmed) return;
    const allChecked: Record<string, boolean> = {};
    todayMeta.checklist.forEach((label) => {
      allChecked[label] = true;
    });
    updateDay(day, { checklist: allChecked, completed: true }, actorId);
    toast.success(`Dia ${day} concluído!`, {
      description: day < 21 ? `Vamos para o Dia ${day + 1}.` : "Parabéns, você completou os 21 dias! 🎉",
      duration: 4000,
    });
  };
  const reminderTime = state.settings?.reminderTime ?? "08:00";

  return (
    <div className="space-y-4">
      {/* Entrada única e retomável do cadastro, diagnóstico e resultado. */}
      {!journeyReady && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            playInteractionSound();
            initialFlowCard.open();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              playInteractionSound();
              initialFlowCard.open();
            }
          }}
          className={cn(
            APP_CARD_FEATURED,
            "group relative w-full cursor-pointer overflow-hidden p-6 text-left transition-all hover:border-accent/65 hover:from-accent/20 active:scale-[0.99]",
          )}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent">
                <Sparkles size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Passo {initialFlowCard.step} de 3 · Seu próximo passo
                </span>
              </div>
              <ChevronRight size={20} className="text-accent/60 transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="mt-3 font-display text-2xl leading-tight text-primary">
              {initialFlowCard.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/75">
              {initialFlowCard.description}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm transition-transform group-hover:scale-105">
                {initialFlowCard.icon}
              </div>
              <span className="font-bold text-accent group-hover:underline">
                {initialFlowCard.action}
              </span>
            </div>
          </div>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/15 blur-2xl transition-all group-hover:bg-accent/25" />
        </div>
      )}

      {journeyReady && (
        <>
      <div className="flex items-center justify-between px-1">
        <SectionHeader
          eyebrow={`Dia ${day} de 21`}
          title="Seu próximo cuidado"
          subtitle="Siga a recomendação de hoje e avance no seu plano."
        />
        <button
          onClick={() => {
            playInteractionSound();
            if (navigator.vibrate && !state.settings?.hapticsDisabled) {
              navigator.vibrate(10);
            }
            setFocusedMode(!focusedMode);
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
            focusedMode 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "bg-primary/5 text-primary hover:bg-primary/10"
          )}
        >
          {focusedMode ? <Sparkles size={12} /> : <Wind size={12} />}
          {focusedMode ? "Modo Focado" : "Focar"}
        </button>
      </div>

      {(() => {
        const meta = getProtocolDay(day);
        const today = state.days[day] ?? { checklist: {}, note: "", completed: false };
        const checklistState = today.checklist ?? {};
        const pendingChecklist = meta.checklist
          .map((label, i) => ({ label, i, done: !!checklistState[label] }))
          .filter((c) => !c.done);
        const nextItems = pendingChecklist.slice(0, 3);
        const allDone = pendingChecklist.length === 0;

        // Detecta estado contextual do usuário
        const hasPlant = !!state.plant.name?.trim();
        const applicationPending = isApplicationDay && !today.applicationDone;
        const protocolFinished = day >= 21 && allDone;

        type Ctx = {
          eyebrow: string;
          title: string;
          desc: string;
          cta: { label: string; icon: ReactNode; onClick: () => void };
        };

        let ctx: Ctx | null = null;
        if (protocolFinished) {
          ctx = {
            eyebrow: "Protocolo concluído",
            title: "Faça sua avaliação final",
            desc: "Registre o que evoluiu e defina sua rotina de manutenção.",
            cta: { label: "Ver resumo", icon: <Calendar size={16} />, onClick: () => setTab("resumo") },
          };
        } else if (applicationPending) {
          const isCriticalApplication = [3, 10, 17].includes(day);
          ctx = {
            eyebrow: `Dia ${day} · ${isCriticalApplication ? "⚠️ APLICAÇÃO CRÍTICA" : "Aplicação"}`,
            title: meta.title,
            desc: isCriticalApplication 
              ? "⚠️ HOJE É O DIA! Não pule esta aplicação para garantir o resultado do protocolo."
              : "Hoje é dia de aplicar o Método de 2 Passos. Registre para não perder o próximo ciclo.",
            cta: { label: `Fazer aplicação agora (Dia ${day})`, icon: <ChevronRight size={16} />, onClick: handleRedirectToPlan },
          };
        } else if (allDone && day < 21) {
          ctx = {
            eyebrow: `Dia ${day} · Concluído`,
            title: "Você concluiu o dia de hoje",
            desc: "Avance para o próximo dia ou registre uma observação extra.",
            cta: { label: `Ir para o dia ${day + 1}`, icon: <ChevronRight size={16} />, onClick: () => { setCurrentDay(day + 1, actorId); handleRedirectToPlan(); } },
          };
        } else {
          ctx = {
            eyebrow: `Dia ${day}`,
            title: meta.title,
            desc: meta.mainAction,
            cta: { label: `Focar no dia ${day}`, icon: <Sparkles size={16} />, onClick: handleRedirectToPlan },
          };
        }

        const showChecklist = hasPlant && diagnosisFresh && !applicationPending && !protocolFinished && !allDone && nextItems.length > 0;
        const progressPct = Math.round(((day - 1) / 21) * 100 + (allDone ? Math.round(100 / 21) : 0));
        const hasNote = !!today.note?.trim();
        const showRegistrationShortcut = diagnosisFresh && !allDone && !hasNote;

        return (
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if ([3, 10, 17].includes(day) && !state.days[day]?.applicationDone) {
                playCriticalSound();
              }
              ctx.cta.onClick();
            }}
            onKeyDown={(e) => { 
              if (e.key === "Enter" || e.key === " ") {
                if ([3, 10, 17].includes(day) && !state.days[day]?.applicationDone) {
                  playCriticalSound();
                }
                ctx.cta.onClick(); 
              }
            }}
            className={cn(
              APP_CARD_INTERACTIVE,
              APP_CARD_ACCENT_LAYER,
              "group relative w-full cursor-pointer overflow-hidden p-5 text-left",
              isApplicationDay && [3, 10, 17].includes(day)
                ? "border-accent/60 from-accent/20 shadow-[0_12px_36px_-13px_rgba(156,47,111,0.44)] ring-accent/20 animate-[pulse_3s_ease-in-out_infinite] hover:border-accent/70 hover:from-accent/[0.23]"
                : "hover:border-accent/65 hover:from-accent/20"
            )}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{ctx.eyebrow}</span>
                </div>
                {isApplicationDay && (
                  <span className={cn(
                    "flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent",
                    [3, 10, 17].includes(day) && "animate-pulse",
                  )}>
                     <Droplets size={10} />
                     Aplicação
                  </span>
                )}
                <ChevronRight size={16} className="text-primary/40 transition-transform group-hover:translate-x-1" />
              </div>
              <h3 className="mt-2 font-display text-xl leading-tight text-primary">
                {ctx.title}
              </h3>
              <p className="mt-1.5 text-sm text-primary/75">
                {ctx.desc}
              </p>

              {hasPlant && diagnosisFresh && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Progresso do plano</span>
                    <span>Dia {day} de 21</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/15">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                    />
                  </div>
                </div>
              )}

              {showChecklist && (
                <div className="mt-3 space-y-1.5 rounded-xl bg-card/60 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Checklist pendente
                  </div>
                  {nextItems.map((c) => (
                    <div key={c.i} className="flex items-start gap-2 text-xs text-primary/85">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span className="leading-snug">{c.label}</span>
                    </div>
                  ))}
                  {pendingChecklist.length > nextItems.length && (
                    <div className="pt-1 text-[10px] italic text-muted-foreground">
                      +{pendingChecklist.length - nextItems.length} item(ns) no plano
                    </div>
                  )}
                </div>
              )}

              {showRegistrationShortcut && (
                <button
                onClick={(e) => {
                  e.stopPropagation();
                  playInteractionSound();
                  handleRedirectToPlan();
                    setTimeout(() => {
                      const registerEl = document.querySelector('[data-register-field]');
                      if (registerEl) {
                        registerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                          const input = registerEl.querySelector('textarea');
                          if (input) input.focus({ preventScroll: true });
                        }, 500);
                      }
                    }, 100);

                  }}
                  className="mt-3 flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-[11px] font-bold text-primary transition-all hover:bg-primary/10 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} />
                    <span>Fazer registro do dia</span>
                  </div>
                  <ChevronRight size={14} className="opacity-40" />
                </button>
              )}

              {showChecklist && nextItems.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playInteractionSound();
                    handleRedirectToPlan();
                    setTimeout(() => {
                      const firstChecklistEl = document.querySelector('[data-checklist-item]');
                      if (firstChecklistEl) {
                        firstChecklistEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                          const trigger = firstChecklistEl.querySelector('button') || firstChecklistEl;
                          (trigger as HTMLElement).focus({ preventScroll: true });
                        }, 500);
                      }
                    }, 100);

                  }}
                  className="mt-3 flex w-full items-center justify-between rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5 text-[11px] font-bold text-accent transition-all hover:bg-primary/10 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare size={14} />
                    <span>Concluir: {nextItems[0].label}</span>
                  </div>
                  <ChevronRight size={14} className="opacity-40" />
                </button>
              )}

              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  playInteractionSound();
                  if ([3, 10, 17].includes(day) && !state.days[day]?.applicationDone) {
                    playCriticalSound();
                  }
                  ctx.cta.onClick(); 
                }}
                className={cn(
                  "mt-4 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-sm transition-all hover:brightness-110 active:scale-[0.98]",
                  "bg-accent text-accent-foreground",
                )}
              >
                {ctx.cta.icon}
                {ctx.cta.label}
              </button>
              
              <div className="mt-2 text-center">
                 <span className="text-[10px] font-medium text-muted-foreground/80 italic">
                   Etapa atual: <span className="font-bold text-accent">Dia {day}</span> • {getProtocolDay(day).title}
                 </span>
              </div>
            </div>
          </div>
        );
      })()}


      <div className={cn(APP_CARD_GREEN_FEATURED, "group relative overflow-hidden transition-all hover:border-primary/60 hover:from-primary/[0.18] hover:shadow-[0_12px_36px_-14px_rgba(21,95,78,0.4)] active:scale-[0.99]")}>
            <div className="relative w-full overflow-hidden">
              <img
                src={kitMetodo}
                alt="Kit Método 2 Passos"
                loading="lazy"
                className="h-44 w-full object-cover sm:h-52 md:h-60"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/25 via-transparent to-transparent" />
            </div>
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-2 text-primary">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary shadow-sm">
                  <Sprout size={18} />
                </div>
                <h3 className="font-display text-xl text-primary">Método de 2 Passos</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                Entenda como funciona o protocolo de Enraizar e Nutrir para sua orquídea florescer.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setTab("metodo")}
                  className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-bold text-accent-foreground shadow-sm shadow-accent/20 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  Ver explicação <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setTab("metodo")}
                  className="flex items-center gap-2 rounded-full border border-primary/30 bg-card px-5 py-2 text-xs font-bold text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
                >
                  Modo de usar <ChevronRight size={14} />
                </button>
              </div>
            </div>
      </div>

      {!focusedMode && (
        <>
          <SectionHeader
            eyebrow="Acompanhamento"
            title="Sua evolução em 21 dias"
            subtitle="Veja o que já foi concluído e acompanhe os próximos passos."
            nowrapTitle
          />

          <div 
            onClick={handleRedirectToPlan}
            className={cn(APP_CARD_INTERACTIVE, "group relative cursor-pointer overflow-hidden p-4 sm:p-5")}
          >
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-card transition-transform group-hover:scale-105">
                {state.plant.photo ? (
                  <img src={state.plant.photo} alt={state.plant.name} className="h-full w-full object-cover" />
                ) : (
                  <Flower2 size={22} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="truncate font-display text-lg text-foreground">Sua jornada</h4>
                  <span className="text-[10px] font-bold text-primary">{Math.round(((day - 1) / 21) * 100)}%</span>
                </div>
                <p className="text-xs font-medium text-foreground/80 line-clamp-1">
                  {getProtocolDay(day).mainAction}
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-1000"
                    style={{ width: `${Math.round(((day - 1) / 21) * 100)}%` }}
                  />
                </div>
              </div>
              <button 
                onClick={handleRedirectToPlan}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-sm shadow-accent/20 transition-transform active:scale-90 hover:brightness-110"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className={cn(APP_CARD_BASE, "p-4 sm:p-5")}>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">Sua jornada até aqui</h3>
                <p className="text-[10px] text-muted-foreground">Progresso consolidado</p>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2">
              <StatCard label="Dias concluídos" value={`${completedDays}/21`} icon={<CalendarCheck size={14} />} />
              <StatCard label="Aplicações" value={totalApplications} icon={<Droplets size={14} />} />
              <StatCard label="Observações" value={totalNotes} icon={<BookOpen size={14} />} />
              <StatCard label="Fotos" value={totalPhotos} icon={<Images size={14} />} />
            </div>
          </div>

          {/* Cuidados híbridos: pendências reais, próximo marco e diagnóstico. */}
          {nextCareItems.length > 0 && (
            <div className={cn(APP_CARD_BASE, "p-4 sm:p-5")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-primary">
                    <Bell size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Próximos cuidados</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl leading-tight text-primary">
                    O que merece sua atenção agora
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Selecionamos as próximas ações com base no seu plano e diagnóstico.
                  </p>
                </div>
                <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
                  {nextCareItems.length} {nextCareItems.length === 1 ? "prioridade" : "prioridades"}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {nextCareItems.slice(0, 3).map((care) => (
                  <button
                    key={care.id}
                    onClick={care.onClick}
                    className={cn(
                      APP_CARD_INNER_INTERACTIVE,
                      "group/care flex w-full items-center gap-3 p-3 text-left",
                    )}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/care:bg-primary/15">
                      {care.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        {care.label}
                      </div>
                      <div className="mt-0.5 font-display text-base leading-tight text-primary">
                        {care.title}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {care.description}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-primary/35 transition-transform group-hover/care:translate-x-0.5"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resumo do dia — reposicionado após os lembretes importantes. */}
          {hasPlant && diagnosisFresh && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleRedirectToPlan}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleRedirectToPlan(); }}
              className={cn(APP_CARD_INTERACTIVE, "group relative cursor-pointer overflow-hidden p-5 hover:border-primary/40")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Calendar size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Resumo do dia {day}</span>
                </div>
                <ChevronRight size={16} className="text-primary/40 transition-transform group-hover:translate-x-1" />
              </div>
              <h3 className="mt-2 font-display text-2xl leading-tight text-primary">
                {hasPendencies ? "Você tem pendências" : "Dia em dia"}
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className={cn(APP_CARD_INNER, "p-3 text-center")}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tarefas</div>
                  <div className="mt-1 font-display text-2xl text-primary">
                    {doneTasks}<span className="text-primary/40">/{totalTasks || "—"}</span>
                  </div>
                </div>
                <div className={cn(APP_CARD_INNER, "p-3 text-center")}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aplicações</div>
                  <div className="mt-1 font-display text-2xl text-accent">{appsDoneToday}</div>
                </div>
                <div className={cn(APP_CARD_INNER, "p-3 text-center")}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Registro</div>
                  <div className="mt-1 font-display text-2xl text-primary">{noteDone ? "✓" : "—"}</div>
                </div>
              </div>
              {(!noteDone || !photoDone) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!noteDone && (
                    <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                      Registro pendente
                    </span>
                  )}
                  {!photoDone && (
                    <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                      Foto pendente
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playInteractionSound();
                  handleRedirectToPlan();
                  setTimeout(() => {
                    const registerEl = document.querySelector('[data-register-field]');
                    if (registerEl) {
                      registerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setTimeout(() => {
                        const input = registerEl.querySelector('textarea');
                        if (input) input.focus({ preventScroll: true });
                      }, 500);
                    }
                  }, 100);
                }}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm font-bold text-primary transition-all hover:bg-primary/10 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={16} />
                  <span>Escrever registro do dia</span>
                </div>
                <ChevronRight size={16} className="opacity-40" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (dayFullyDone) return;
                  handleCompleteDay();
                }}
                disabled={dayFullyDone}
                className={cn(
                  "mt-2 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.98]",
                  dayFullyDone
                    ? "cursor-not-allowed border border-primary/20 bg-primary/[0.06] text-primary/60"
                    : "border border-accent bg-accent text-accent-foreground shadow-md shadow-accent/20 hover:bg-accent/90",
                )}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{dayFullyDone ? `Dia ${day} concluído` : "Concluir meu dia"}</span>
                </div>
                {!dayFullyDone && <ChevronRight size={16} className="opacity-70" />}
              </button>
            </div>
          )}

          <div className={cn(APP_CARD_BASE, "group relative overflow-hidden p-4 transition-all hover:border-primary/30")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Bell size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Lembretes & Notificações</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                Ativo
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Receba alertas diários para não esquecer as aplicações e checklists do seu plano de 21 dias.
            </p>
            <div className="mt-4 grid gap-2">
              <button 
                onClick={() => {
                  if ("Notification" in window) {
                    Notification.requestPermission();
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground shadow-sm shadow-accent/20 transition-all active:scale-[0.98] hover:brightness-110"
              >
                <Bell size={14} /> Ativar Notificações Push
              </button>
              <div className={cn(APP_CARD_INNER_HOVER, "group/reminder flex items-center gap-3 p-3")}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/[0.06] text-primary">
                  <Clock size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-primary">Horário preferido</div>
                  <div className="text-[10px] text-muted-foreground">Melhor horário para receber o lembrete</div>
                </div>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => updateSettings({ reminderTime: e.target.value }, actorId)}
                  className="rounded-lg border border-primary/20 bg-card px-2 py-1.5 text-sm font-bold text-primary transition-colors group-hover/reminder:border-primary/35 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col items-center gap-2">
            <button
              onClick={handleRedirectToPlan}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-bold text-accent-foreground shadow-sm shadow-accent/20 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Calendar size={18} />
              Continuar meu plano · Dia {day}
            </button>
            <span className="text-[10px] font-medium text-muted-foreground text-center">
              Você está no <span className="font-bold text-primary">Dia {day}</span>: {getProtocolDay(day).title}
            </span>
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}








/* ---------------- Plano ---------------- */

type PlanoTabProps = {
  actorId: string;
  setTab: (tab: Tab) => void;
  onPreviewDay: (day: number) => void;
  setStatus: (status: AuthBootstrapStatus) => void;
};

function PlanoTab({ actorId, setTab, onPreviewDay, setStatus }: PlanoTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  useEffect(() => {
    // Ao entrar na aba plano via redirecionamento (ou tab change), foca no topo
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    
    // Melhora a acessibilidade movendo o foco para o título da aba
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  const { state, setCurrentDay, updateDay, toggleChecklist, toggleDayCompleted } =
    useProtocolStore();

  const day = state.currentDay;
  const [showMethod, setShowMethod] = useState(false);
  const [showIncompleteConfirmation, setShowIncompleteConfirmation] = useState(false);
  const meta = getProtocolDay(day);
  const entry = state.days[day] ?? { checklist: {}, note: "", completed: false };
  const isApplication = APPLICATION_DAYS.includes(day);
  const trackingPoints = state.diagnosisResult?.trackingPoints ?? [];
  const diagnosisFresh = isDiagnosisCurrent(state);
  const completedChecklistCount = meta.checklist.filter((item) => !!entry.checklist[item]).length;
  const pendingChecklistCount = meta.checklist.length - completedChecklistCount;

  const week = useMemo(() => getWeekForDay(day), [day]);
  const activeWeek = WEEKS.find((w) => w.id === week) ?? WEEKS[0];
  const focusCategories = useMemo(
    () => (diagnosisFresh ? getFocusCategories(state.diagnosisResult) : []),
    [state.diagnosisResult, diagnosisFresh],
  );
  const focusDaysSet = useMemo(() => new Set(getFocusDays(focusCategories)), [focusCategories]);
  const isFocusDay = focusDaysSet.has(day);

  useEffect(() => {
    setShowIncompleteConfirmation(false);
  }, [day]);

  const completeCurrentDay = () => {
    if (entry.completed) return;

    toggleDayCompleted(day, actorId);
    setShowIncompleteConfirmation(false);
    playSuccessSound();

    if ([7, 14, 21].includes(day)) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#9C2F6F", "#155F4E", "#F8F5EE", "#F8EAF2"],
      });
      toast.success(
        day === 7
          ? "Fase 1 concluída!"
          : day === 14
          ? "Fase 2 concluída!"
          : "Protocolo concluído!",
      );
    } else {
      toast.success(`Dia ${day} concluído!`);
    }
  };

  const goToNextDay = () => {
    if (day >= 21) {
      setTab("resumo");
      return;
    }

    setCurrentDay(day + 1, actorId);
    window.setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div ref={containerRef} className="space-y-4">
      <div className={cn(APP_CARD_FEATURED, "relative overflow-hidden p-6")}>
        <div className="absolute -right-4 -top-4 opacity-[0.04] text-primary rotate-12">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M50 10C50 10 30 40 30 60C30 80 50 95 50 95C50 95 70 80 70 60C70 40 50 10 50 10Z" stroke="currentColor" strokeWidth="1"/>
             <path d="M30 60C30 60 40 55 50 60C60 65 70 60 70 60" stroke="currentColor" strokeWidth="0.5"/>
          </svg>
        </div>
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-wider text-accent">Meu plano</div>
          <motion.h1 
            ref={titleRef}
            tabIndex={-1}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              opacity: { duration: 0.4 },
              y: { duration: 0.4 },
              scale: { duration: 0.6, delay: 0.2, ease: "easeOut" }
            }}
            className="text-3xl font-display tracking-tight text-primary outline-none focus-visible:ring-4 focus-visible:ring-primary/30 rounded-lg transition-shadow duration-300"
          >
            Plano de <span className="text-4xl text-accent">21</span> dias
          </motion.h1>
        </div>
      </div>


      <WeekPicker
        currentWeek={week}
        onSelect={(w) => {
          const firstDay = w === 1 ? 1 : w === 2 ? 8 : 15;
          setCurrentDay(firstDay, actorId);
        }}
        currentDay={day}
        onSelectDay={(d) => setCurrentDay(d, actorId)}
        onPreviewDay={onPreviewDay}
        weekDays={activeWeek.days}
      />

      {focusCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-3.5"
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
              <Sparkles size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-accent">
                Plano personalizado pelo diagnóstico
              </div>
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                Foco em{" "}
                <strong>
                  {focusCategories.map((c) => CATEGORY_LABEL[c]).join(" e ").toLowerCase()}
                </strong>
                . Dias destacados abordam esses pontos com mais profundidade.
                {isFocusDay && " Hoje é um deles."}
              </p>
            </div>
          </div>
        </motion.div>
      )}


      {!diagnosisFresh && day === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-6 text-center"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope size={24} />
          </div>
          <h3 className="font-display text-lg text-primary">Personalize seu plano</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O diagnóstico ajuda a identificar as necessidades específicas da sua orquídea hoje.
          </p>
          <button
            onClick={() => setStatus("needs_diagnosis")}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground shadow-md shadow-accent/20 transition-transform active:scale-95"
          >
            Fazer diagnóstico agora
            <ChevronRight size={16} />
          </button>
        </motion.div>
      )}

      {meta.stages && meta.stages.length > 0 ? (
        <DayHeaderCard meta={meta} />
      ) : (
        <DayContentCard
          meta={meta}
          entry={entry}
          onToggleChecklist={(item) => toggleChecklist(day, item, actorId)}
          onUpdate={(patch) => updateDay(day, patch, actorId)}
          diagnosisFresh={diagnosisFresh}
          trackingPoints={trackingPoints}
          setStatus={setStatus}
        />
      )}

      {meta.stages && meta.stages.length > 0 && (
        <StagesList day={day} meta={meta} onOpenMethod={() => setShowMethod(true)} setStatus={setStatus} />
      )}

      {isApplication && day !== 1 && (
        <button
          onClick={() => setShowMethod(true)}
          className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Abrir Método de 2 Passos
        </button>
      )}

      <div className={cn(APP_CARD_BASE, "p-5")}>
        <div className="grid gap-2">
          {meta.checklist.map((item) => {
            const checked = !!entry.checklist[item];
            return (
              <motion.button
                key={item}
                data-checklist-item
                whileTap={{ scale: 0.98 }}

                onClick={() => {
                  toggleChecklist(day, item, actorId);
                  if (!checked) playPopSound();
                }}
                aria-pressed={checked}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                  checked
                    ? "border-primary bg-primary/5 text-primary"
                    : `${APP_CARD_INNER_INTERACTIVE} text-foreground`,
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {checked ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle2 size={18} className="text-primary" />
                    </motion.div>
                  ) : (
                    <Circle size={18} className="text-muted-foreground" />
                  )}
                </div>
                <span className={`min-w-0 flex-1 ${checked ? "line-through opacity-60" : ""}`}>{item}</span>
              </motion.button>
            );
          })}
        </div>

        <RegisterField meta={meta} entry={entry} onChange={(note) => updateDay(day, { note }, actorId)} data-register-field />

        <DayPhotoField
          day={day}
          photo={entry.photo ?? null}
          caption={entry.photoCaption ?? ""}
          actorId={actorId}
          onPhoto={(photo) => updateDay(day, { photo }, actorId)}
          onCaption={(photoCaption) => updateDay(day, { photoCaption }, actorId)}
        />

        {!entry.completed && (
          <button
            onClick={() => {
              if (pendingChecklistCount > 0) {
                setShowIncompleteConfirmation(true);
                return;
              }
              completeCurrentDay();
            }}
            className="mt-4 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Concluir dia
          </button>
        )}

        {!entry.completed && showIncompleteConfirmation && (
          <div
            role="alert"
            className="mt-3 animate-in fade-in slide-in-from-top-2 rounded-2xl border border-accent/30 bg-accent/[0.07] p-4 duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                <AlertTriangle size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg leading-tight text-primary">
                  Ainda {pendingChecklistCount === 1 ? "há 1 tarefa pendente" : `há ${pendingChecklistCount} tarefas pendentes`}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Você pode continuar preenchendo o checklist ou concluir o dia mesmo assim.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setShowIncompleteConfirmation(false)}
                className="rounded-full border border-primary/20 bg-card px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                Continuar preenchendo
              </button>
              <button
                onClick={completeCurrentDay}
                className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition-transform active:scale-[0.98]"
              >
                Concluir mesmo assim
              </button>
            </div>
          </div>
        )}

        {entry.completed && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-2xl border border-primary/25 bg-primary/[0.05] p-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <CheckCircle2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl leading-tight text-primary">
                  {day === 21 ? "Protocolo concluído!" : `Dia ${day} concluído!`}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {day === 7
                    ? "Você concluiu a primeira fase. Seu progresso foi salvo."
                    : day === 14
                    ? "Você concluiu a segunda fase. Seu progresso foi salvo."
                    : day === 21
                    ? "Seu progresso foi salvo. Agora veja o resultado da sua jornada."
                    : "Seu progresso foi salvo. Continue quando estiver pronto."}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                onClick={goToNextDay}
                className="flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition-transform active:scale-[0.98]"
              >
                {day === 21 ? "Ver meu resultado final" : `Ir para o Dia ${day + 1}`}
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => setTab("inicio")}
                className="flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-card px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                <Home size={15} />
                Voltar ao Início
              </button>
            </div>

            <button
              onClick={() => toggleDayCompleted(day, actorId)}
              className="mt-3 w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              Desfazer conclusão
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (day > 1) {
                  setCurrentDay(day - 1, actorId);
                }
              }}
              disabled={day === 1}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft size={13} />
              Dia Anterior
            </button>
            <button
              onClick={() => {
                const lastCompleted = Object.entries(state.days)
                  .filter(([_, d]) => d.completed)
                  .map(([day, _]) => parseInt(day))
                  .sort((a, b) => b - a)[0];
                
                if (lastCompleted) {
                  setCurrentDay(lastCompleted, actorId);
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <RefreshCw size={13} />
              Último Concluído
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTab("inicio")}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Home size={13} />
              Início
            </button>
            <button
              onClick={() => setTab("diagnostico")}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Stethoscope size={13} />
              Diagnóstico
            </button>
          </div>
          <button
            onClick={() => setTab("diario")}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Images size={13} />
            Ver Diário (Evolução)
          </button>
        </div>
      </div>

      {day === 21 && <FinalEvaluation actorId={actorId} />}

      {showMethod && <MethodDrawer actorId={actorId} day={day} onClose={() => setShowMethod(false)} />}

    </div>
  );
}

function WeekPicker({
  currentWeek,
  onSelect,
  currentDay,
  onSelectDay,
  onPreviewDay,
  weekDays,
}: {
  currentWeek: 1 | 2 | 3;
  onSelect: (w: 1 | 2 | 3) => void;
  currentDay: number;
  onSelectDay: (day: number) => void;
  onPreviewDay: (day: number) => void;
  weekDays: number[];
}) {
  const { state } = useProtocolStore();
  const diagnosisFresh = isDiagnosisCurrent(state);
  const focusDays = useMemo(() => {
    if (!diagnosisFresh) return new Set<number>();
    const cats = getFocusCategories(state.diagnosisResult);
    return new Set(getFocusDays(cats));
  }, [state.diagnosisResult, diagnosisFresh]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = (d: number) => {
    longPressTimer.current = setTimeout(() => {
      onPreviewDay(d);
      longPressTimer.current = null;
    }, 600);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Semanas do plano"
        className="grid grid-cols-3 gap-1.5 rounded-full border border-border bg-card p-1"
      >
        {WEEKS.map((w) => {
          const active = w.id === currentWeek;
          return (
            <button
              key={w.id}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(w.id)}
              className={`min-h-[44px] rounded-full px-2 text-[12px] font-semibold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w.label}
            </button>
          );
        })}
      </div>
      <div
        className="grid grid-cols-4 gap-2"
        role="group"
        aria-label={`Dias da semana ${currentWeek}`}
      >
        {weekDays.map((d) => {
          const active = d === currentDay;
          const isApp = APPLICATION_DAYS.includes(d);
          const isCompleted = state.days[d]?.completed;
          const isFocus = focusDays.has(d);
          const isFullyDone = isDayFullyDone(state, d, getProtocolDay(d).checklist);
          const isPending = d <= state.currentDay && !isCompleted;


          return (
            <motion.button
              key={d}
              data-day-button={d}
              onClick={() => onSelectDay(d)}
              onPointerDown={() => startPress(d)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              aria-current={active ? "step" : undefined}
              aria-label={`${isApp ? `Dia ${d}, dia de aplicação` : `Dia ${d}`}${isCompleted ? ", concluído" : ""}${isFocus ? ", foco do diagnóstico" : ""}${isPending ? ", registro pendente" : ""}`}
              className={`relative min-h-[54px] rounded-xl border px-2 py-2 text-[13px] font-semibold transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : isCompleted
                    ? "border-primary/20 bg-primary/5 text-primary/80"
                    : isFocus
                      ? "border-accent/60 bg-accent/5 text-foreground hover:border-accent"
                      : "border-primary/15 bg-card text-foreground hover:border-primary/35 hover:bg-primary/[0.06] hover:shadow-sm"
              }`}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] opacity-60 uppercase font-bold tracking-tighter">Dia</span>
                <span className="font-display text-lg leading-none">{d}</span>
              </div>

              
              {isCompleted && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[8px] text-primary-foreground shadow-sm ${active ? 'ring-1 ring-primary-foreground' : ''}`}
                >
                  ✓
                </motion.div>
              )}
              {!isCompleted && isPending && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-[8px] text-accent-foreground shadow-sm ${active ? 'ring-1 ring-accent-foreground' : ''}`}
                  title="Registro Pendente"
                >
                  !
                </motion.div>
              )}
              {isApp && !isCompleted && !isPending && (
                <span
                  aria-hidden
                  className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${
                    active ? "bg-accent-foreground" : "bg-accent"
                  }`}
                />
              )}

              
              {/* Tooltip/Preview Simulado via Título ou CSS se necessário, 
                  mas para mobile o long-press pode ser simulado com title para preview nativo 
                  ou podemos adicionar um pequeno indicador de tarefa */}
              <div className="sr-only">Tarefa: {getProtocolDay(d).title}</div>
            </motion.button>
          );
        })}
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-1 text-[10px] font-medium text-muted-foreground/80">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-primary flex items-center justify-center text-[7px] text-white">✓</div>
          <span>Concluído</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-accent flex items-center justify-center text-[7px] text-white font-bold">!</div>
          <span>Registro Pendente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span>Dia de Aplicação</span>
        </div>
      </div>

    </div>

  );
}

function DayHeaderCard({ meta }: { meta: ProtocolDay }) {
  const phase = phaseOf(meta.day);
  return (
    <div className={cn(APP_CARD_GREEN_FEATURED, "relative overflow-hidden p-5")}>
      <div className="absolute -right-6 -top-6 opacity-[0.05] text-primary rotate-12">
        <Sprout size={100} />
      </div>
      <div className="relative z-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent">
          {phase.range}
        </div>
        <h2 className="mt-1 text-lg font-display text-primary">
          Dia <span className="text-2xl text-accent">{meta.day}</span> — {meta.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{meta.objective}</p>
        <p className="mt-2 text-sm text-foreground/85">{meta.mainAction}</p>
        {meta.tip && (
          <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-sm text-secondary-foreground">
            <span className="font-semibold text-primary">Dica: </span>
            {meta.tip}
          </div>
        )}
      </div>
    </div>
  );
}

function DayContentCard({
  meta,
  entry,
  onToggleChecklist: _onToggleChecklist,
  onUpdate: _onUpdate,
  diagnosisFresh,
  trackingPoints,
  setStatus,
}: {
  meta: ProtocolDay;
  entry: { checklist: Record<string, boolean>; note: string; completed: boolean };
  onToggleChecklist: (item: string) => void;
  onUpdate: (patch: { note?: string }) => void;
  diagnosisFresh: boolean;
  trackingPoints: string[];
  setStatus?: (status: AuthBootstrapStatus) => void;
}) {
  void entry;
  const tracking = diagnosisFresh ? trackingPoints.slice(0, 3) : [];
  return (
    <div className={cn(APP_CARD_GREEN_FEATURED, "relative overflow-hidden p-5")}>
      <div className="absolute -right-6 -top-6 opacity-[0.05] text-primary rotate-12">
        <Leaf size={100} />
      </div>
      <div className="relative z-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent">
          {phaseOf(meta.day).range}
        </div>
        <h2 className="mt-1 text-lg font-display text-primary">
          Dia <span className="text-2xl text-accent">{meta.day}</span> — {meta.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{meta.objective}</p>
        <p className="mt-2 text-sm text-foreground/85">{meta.mainAction}</p>
        {meta.tip && (
          <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-sm text-secondary-foreground">
            <span className="font-semibold text-primary">Dica: </span>
            {meta.tip}
          </div>
        )}

        <DetailAccordions
          howTo={meta.howTo}
          observe={meta.observe}
          avoid={meta.avoid}
          registerText={meta.registerText}
          attention={meta.attention}
          personalizedTracking={meta.personalizedContext ? tracking : []}
          customObserveTitle={meta.observeTitle}
          setStatus={setStatus}
        />
      </div>
    </div>
  );
}

function StagesList({
  day,
  meta,
  onOpenMethod,
  setStatus,
}: {
  day: number;
  meta: ProtocolDay;
  onOpenMethod: () => void;
  setStatus?: (status: AuthBootstrapStatus) => void;
}) {
  const stages = meta.stages ?? [];
  return (
    <Accordion
      type="multiple"
      defaultValue={stages.length > 0 ? [stages[0].id] : []}
      className="space-y-2"
    >
      {stages.map((stage, idx) => {
        const isApplicationStage = APPLICATION_DAYS.includes(day) && idx === stages.length - 1;
        return (
          <AccordionItem
            key={stage.id}
            value={stage.id}
            data-checklist-item
            className={cn(APP_CARD_INNER_HOVER, "overflow-hidden")}
          >

            <AccordionTrigger className="px-5 py-4 text-left text-[15px] font-semibold text-primary hover:no-underline group">
              <span className="flex items-center gap-2">
                <span className="text-accent group-data-[state=open]:rotate-90 transition-transform">
                  <Flower2 size={14} />
                </span>
                {stage.title}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              <StageBody
                stage={stage}
                onOpenMethod={isApplicationStage ? onOpenMethod : undefined}
                setStatus={setStatus}
                day={day}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function StageBody({ stage, onOpenMethod, setStatus, day }: { stage: DayStage; onOpenMethod?: () => void; setStatus?: (status: AuthBootstrapStatus) => void; day?: number }) {
  return (
    <div className="space-y-3 text-sm text-foreground/85">
      {stage.objective && <p className="text-sm text-muted-foreground">{stage.objective}</p>}
      {stage.mainAction && (
        <p className="text-sm text-foreground/85">
          <span className="font-semibold text-primary">O que fazer: </span>
          {stage.mainAction}
        </p>
      )}
      {stage.tip && (
        <div className="rounded-2xl bg-secondary/60 px-3 py-2 text-sm text-secondary-foreground">
          <span className="font-semibold text-primary">Dica: </span>
          {stage.tip}
        </div>
      )}
      <DetailAccordions
        howTo={stage.howTo}
        observe={stage.observe}
        avoid={stage.avoid}
        registerText={stage.registerText}
        attention={stage.attention}
        personalizedTracking={[]}
        customObserveTitle={(stage as any).observeTitle as string | undefined}
        setStatus={day === 1 && stage.id === "etapa-1-registrar" ? setStatus : undefined}
      />
      {day === 1 && stage.id === "etapa-1-registrar" && setStatus && (
        <button
          id="btn-signup"
          onClick={() => setStatus("needs_diagnosis")}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/10 active:scale-[0.98]"
        >
          <Sprout size={16} />
          Cadastre sua Orquídea
        </button>
      )}
      {onOpenMethod && (
        <button
          onClick={onOpenMethod}
          className="mt-2 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Abrir Método de 2 Passos
        </button>
      )}
    </div>
  );
}

function DetailAccordions({
  howTo,
  observe,
  avoid,
  registerText,
  attention,
  personalizedTracking,
  customObserveTitle,
  setStatus,
}: {
  howTo?: string[];
  observe?: string[];
  avoid?: string[];
  registerText?: string;
  attention?: string[];
  personalizedTracking: string[];
  customObserveTitle?: string;
  setStatus?: (s: AuthBootstrapStatus) => void;
}) {
  const sections: Array<{ id: string; title: string; content: ReactNode }> = [];

  if (howTo && howTo.length > 0) {
    sections.push({
      id: "como-fazer",
      title: "Como fazer",
      content: <BulletList items={howTo} />,
    });
  }
  if (observe && observe.length > 0) {
    sections.push({
      id: "observe",
      title: customObserveTitle || "Observe",
      content: <BulletList items={observe} />,
    });
  }
  if (avoid && avoid.length > 0) {
    sections.push({
      id: "evite",
      title: "Evite",
      content: <BulletList items={avoid} />,
    });
  }
  if (registerText) {
    sections.push({
      id: "registre",
      title: "Registre",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-foreground/85">{registerText}</p>
          {setStatus && (
            <div className="pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStatus("needs_diagnosis");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-[12px] font-bold text-primary transition-all hover:bg-primary/20 active:scale-[0.98]"
              >
                <Sprout size={14} />
                Cadastre sua Orquídea
              </button>
            </div>
          )}
        </div>
      ),
    });
  }
  if (attention && attention.length > 0) {
    sections.push({
      id: "atencao",
      title: "Atenção",
      content: <BulletList items={attention} />,
    });
  }
  if (personalizedTracking.length > 0) {
    sections.push({
      id: "no-seu-caso",
      title: "No seu caso",
      content: <BulletList items={personalizedTracking} />,
    });
  }

  if (sections.length === 0) return null;

  return (
    <Accordion type="multiple" className="mt-3 space-y-2">
      {sections.map((s) => (
        <AccordionItem
          key={s.id}
          value={s.id}
            className={cn(APP_CARD_INNER_HOVER, "overflow-hidden")}
        >
          <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-primary hover:no-underline">
            {s.title}
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">{s.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm text-foreground/85">
      {items.map((it, i) => (
        <li key={`${i}-${it.slice(0, 20)}`} className="flex gap-2">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
          <span className="min-w-0 flex-1">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function RegisterField({
  meta,
  entry,
  onChange,
  ...props
}: {
  meta: ProtocolDay;
  entry: { note: string };
  onChange: (v: string) => void;
  [key: string]: any;
}) {

  const label = meta.recordPrompt || "Registre sua observação de hoje.";
  const options: RegisterOption[] | undefined = meta.registerOptions;
  const inputId = `note-day-${meta.day}`;
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    entry.note.trim() ? "saved" : "idle",
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyChange = (v: string) => {
    onChange(v);
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveState(v.trim() ? "saved" : "idle");
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="mt-4 space-y-2 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl p-2 -m-2 transition-shadow" {...props}>

      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="block text-[13px] font-semibold text-primary">
          {label}
        </label>
        <span
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            saveState === "saving"
              ? "bg-accent/10 text-accent"
              : saveState === "saved"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              saveState === "saving"
                ? "bg-accent animate-pulse"
                : saveState === "saved"
                  ? "bg-primary"
                  : "bg-muted-foreground/50"
            }`}
          />
          {saveState === "saving" ? "Salvando…" : saveState === "saved" ? "Salvo" : "Em progresso"}
        </span>
      </div>
      {options && options.length > 0 && (
        <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const active = entry.note.startsWith(opt.label);
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  const rest = entry.note.replace(/^[^\n]*\n?/, "");
                  notifyChange(rest ? `${opt.label}\n${rest}` : opt.label);
                }}
                className={`min-h-[36px] rounded-full border px-3 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
      <textarea
        id={inputId}
        value={entry.note}
        onChange={(e) => notifyChange(e.target.value)}
        placeholder={
          options && options.length > 0 ? "Observação complementar (opcional)" : "Sua anotação"
        }
        rows={3}
        className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function MethodDrawer({ actorId, day, onClose }: { actorId: string; day: number; onClose: () => void }) {
  const { registerApplication, state } = useProtocolStore();

  const applicationsForDay = state.applications.filter((a) => a.day === day);
  const entry = state.days[day] ?? { checklist: {}, note: "", completed: false };
  const checklist = getProtocolDay(day).checklist;
  const allChecked = checklist.every((item) => !!entry.checklist[item]);
  const canRegister = !APPLICATION_DAYS.includes(day) || allChecked;

  return (
    <Drawer onClose={onClose} title="Método de 2 Passos">
      <p className="text-sm text-foreground/85">
        Realize o Método de 2 Passos uma vez por semana, preferencialmente nos horários mais frescos
        do dia. Os produtos são prontos para uso e não precisam de diluição.
      </p>

      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-border bg-secondary/50 p-4">
          <div className="flex items-center gap-2 text-primary">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <Sprout size={18} strokeWidth={2.2} />
            <span className="text-base font-bold">Enraizar</span>
          </div>
          <p className="mt-2 text-sm text-secondary-foreground/90">
            Aplique primeiro o Enraizador nas raízes e no substrato. Distribua o produto de forma
            uniforme até umedecer levemente as áreas indicadas, sem escorrer e sem encharcar.
          </p>
          <div className="mt-2 text-[12px] font-semibold uppercase tracking-wider text-primary/80">
            Enraizador Forte 500 ml Pronto Uso
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-lilac/60 p-4">
          <div className="flex items-center gap-2 text-lilac-foreground">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              2
            </span>
            <Leaf size={18} strokeWidth={2.2} />
            <span className="text-base font-bold">Nutrir</span>
          </div>
          <p className="mt-2 text-sm text-lilac-foreground/90">
            Em seguida, aplique o Bokashi nas raízes, folhas e substrato. Distribua o produto de
            forma uniforme até umedecer levemente, sem escorrer e sem encharcar. Evite aplicar
            diretamente nas flores.
          </p>
          <div className="mt-2 text-[12px] font-semibold uppercase tracking-wider text-primary/80">
            Bokashi Orquídeas Premium 500 ml Pronto Uso
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} />
          <span className="font-semibold">Cuidados</span>
        </div>
        <ul className="mt-2 space-y-1 text-[13px] text-accent">
          <li>Não diluir</li>
          <li>Preferir horários mais frescos</li>
          <li>Não aplicar sob sol forte, especialmente entre 9h e 16h</li>
          <li>Evitar aplicação direta nas flores</li>
          <li>Não deixar o produto escorrer</li>
          <li>Não encharcar raízes ou substrato</li>
          <li>Não misturar com outros produtos durante a aplicação</li>
          <li>Não repetir a aplicação por engano</li>
        </ul>
      </div>

      {applicationsForDay.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-secondary-foreground">
          <div className="font-semibold text-primary">Histórico de aplicações no Dia {day}</div>
          <ul className="mt-1 space-y-0.5">
            {applicationsForDay.map((a) => (
              <li key={a.id}>
                {a.timestamp && !a.migrated
                  ? new Date(a.timestamp).toLocaleString("pt-BR")
                  : "Aplicação registrada na versão anterior"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {!canRegister && (
          <p className="text-center text-[11px] font-medium text-accent">
            Complete todo o checklist para liberar o registro.
          </p>
        )}
        <button
          disabled={!canRegister}
          onClick={() => {
            registerApplication(day, actorId);
            onClose();
          }}
          className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {applicationsForDay.length > 0
            ? "Registrar nova aplicação"
            : "Registrar aplicação concluída"}
        </button>
      </div>
    </Drawer>
  );
}

/* ---------------- Diagnóstico Tab ---------------- */

function DiagnosticoTab({ actorId, onRedo, setTab }: { actorId: string; onRedo: () => void; setTab: (tab: Tab) => void }) {
  const { state } = useProtocolStore();

  const items: Array<{ key: DiagnosisCategory; label: string; values: string[] }> = (
    Object.keys(CATEGORY_LABEL) as DiagnosisCategory[]
  ).map((k) => ({ key: k, label: CATEGORY_LABEL[k], values: state.diagnosis[k] }));
  const result = state.diagnosisResult;
  const current = isDiagnosisCurrent(state);

  return (
    <div className="space-y-4">
      <div className={cn(APP_CARD_FEATURED, "relative overflow-hidden p-6")}>
        <div className="absolute -right-4 -top-4 opacity-[0.08] text-primary rotate-12">
          <Stethoscope size={120} />
        </div>
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-wider text-accent">Diagnóstico</div>
          <h1 className="text-2xl font-display tracking-tight text-primary">Sinais <span className="text-3xl text-accent">Observados</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Este resumo orienta sua observação. Um sinal isolado não fecha um diagnóstico.
          </p>
        </div>
      </div>

      {result && !current && (
        <InfoCard tone="warn" icon={<AlertTriangle size={16} />}>
          Você editou respostas depois de gerar o resultado. Refaça o diagnóstico para atualizar as
          orientações.
        </InfoCard>
      )}

      {items.map((it) => (
        <div key={it.key} className={cn(APP_CARD_BASE, "p-4")}>
          <div className="text-sm font-bold text-primary">{it.label}</div>
          {it.values.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Nada marcado.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {it.values.map((v) => (
                <span
                  key={v}
                  className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {result && <ResultBlocks result={result} />}

      <div className="space-y-3">
        <button
          onClick={onRedo}
          className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition-all active:scale-[0.98]"
        >
          Refazer diagnóstico
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTab("plano")}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-accent/20 bg-accent/5 py-3 text-[12px] font-bold text-accent transition-colors hover:bg-accent/10"
          >
            <CalendarCheck size={14} />
            Ver meu plano
          </button>
          <button
            onClick={() => {
              setTab("plano");
            }}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-primary/20 bg-primary/5 py-3 text-[12px] font-bold text-primary transition-colors hover:bg-primary/10"
          >
            <Sparkles size={14} />
            Ver tarefa do dia
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Diário ---------------- */

function DayPhotoField({
  day,
  photo,
  caption,
  actorId,
  onPhoto,
  onCaption,
}: {
  day: number;
  photo: string | null;
  caption: string;
  actorId: string;
  onPhoto: (photo: string | null) => void;
  onCaption: (caption: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadOrEncodePhoto(file, actorId);
      onPhoto(url);
    } catch {
      alert(PHOTO_ERROR_MESSAGE);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };
  return (
    <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-accent">
          Foto do Dia {day}
        </div>
        {photo && (
          <button
            type="button"
            onClick={() => onPhoto(null)}
            className="text-[11px] font-semibold text-muted-foreground hover:text-destructive"
          >
            Remover
          </button>
        )}
      </div>
      <label className="mt-2 block cursor-pointer">
        {photo ? (
          <img
            src={photo}
            alt={`Foto do dia ${day}`}
            className="h-48 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="grid h-32 place-items-center rounded-xl border-2 border-dashed border-border bg-card text-center">
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Camera size={20} />
              <span className="text-xs font-medium">
                {busy ? "Enviando..." : "Anexar foto"}
              </span>
            </div>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleUpload}
          disabled={busy}
        />
      </label>
      {photo && (
        <input
          value={caption}
          onChange={(e) => onCaption(e.target.value)}
          placeholder="Legenda (opcional)"
          className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
    </div>
  );
}

function DiarioTab({ actorId }: { actorId: string }) {
  const { state, updateDay } = useProtocolStore();


  const handlePhoto = async (day: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const photo = await uploadOrEncodePhoto(file, actorId);
      updateDay(day, { photo }, actorId);
    } catch {
      alert(PHOTO_ERROR_MESSAGE);
    }
  };

  return (
    <div className="space-y-4">
      <div className={cn(APP_CARD_FEATURED, "relative overflow-hidden p-6")}>
        <div className="absolute -right-4 -top-4 opacity-[0.08] text-primary rotate-12">
          <Images size={120} />
        </div>
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-wider text-accent">
            Diário fotográfico
          </div>
          <h1 className="text-2xl font-display tracking-tight text-primary">Linha do tempo <span className="text-3xl text-accent">21</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre fotos e observações nos Dias 1, 7, 14 e 21.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {PHOTO_DAYS.map((d: number) => {
          const entry = state.days[d] ?? { checklist: {}, note: "", completed: false };
          return (
            <div key={d} className={cn(APP_CARD_BASE, "relative overflow-hidden p-4")}>
              <div className="absolute -right-6 -top-6 opacity-[0.03] text-primary rotate-12">
                <Camera size={80} />
              </div>
              <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    {phaseOf(d).range}
                  </div>
                  <div className="text-lg font-bold text-primary">Dia <span className="font-display text-2xl text-accent">{d}</span></div>
                </div>
                {entry.photo ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    Registrado
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    Aguardando
                  </span>
                )}
              </div>

              <label className="mt-3 block cursor-pointer">
                {entry.photo ? (
                  <img
                    src={entry.photo}
                    alt={`Foto do dia ${d}`}
                    className="h-48 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="grid h-40 place-items-center rounded-xl border-2 border-dashed border-border bg-muted/40 text-center">
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Camera size={22} />
                      <span className="text-xs font-medium">Adicionar foto</span>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handlePhoto(d, e)}
                />
              </label>

              <input
                value={entry.photoCaption ?? ""}
                onChange={(e) => updateDay(d, { photoCaption: e.target.value }, actorId)}
                placeholder="Legenda"
                className="mt-3 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <FieldSmall
                  label="Raízes"
                  value={entry.roots ?? ""}
                  onChange={(v) => updateDay(d, { roots: v }, actorId)}
                />
                <FieldSmall
                  label="Folhas"
                  value={entry.leavesObs ?? ""}
                  onChange={(v) => updateDay(d, { leavesObs: v }, actorId)}
                />
                <FieldSmall
                  label="Brotos/hastes"
                  value={entry.shoots ?? ""}
                  onChange={(v) => updateDay(d, { shoots: v }, actorId)}
                />
                <FieldSmall
                  label="Observações"
                  value={entry.observations ?? ""}
                  onChange={(v) => updateDay(d, { observations: v }, actorId)}
                />
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldSmall({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

/* ---------------- Final Evaluation ---------------- */

function FinalEvaluation({ actorId }: { actorId: string }) {
  const { state, updateFinalEval } = useProtocolStore();

  const fe = state.finalEval;

  const paths: Array<{
    id: typeof fe.path;
    label: string;
    desc: string;
    tone: "green" | "lilac" | "accent" | "warn";
  }> = [
    {
      id: "evolved",
      label: "Apresentou evolução",
      desc: "Sinais claros de melhora nas raízes, folhas ou brotos.",
      tone: "green",
    },
    {
      id: "stable",
      label: "Está estável",
      desc: "Sem mudança clara. Continue observando e mantendo o cuidado.",
      tone: "lilac",
    },
    {
      id: "worsening",
      label: "Está piorando",
      desc: "Procure orientação especializada com um profissional.",
      tone: "warn",
    },
    {
      id: "healthy-no-bloom",
      label: "Saudável, mas não floresceu",
      desc: "Vigor bom, sem floração. Ajuste luz e ciclo natural.",
      tone: "accent",
    },
  ];

  return (
    <div className={cn(APP_CARD_BASE, "rounded-3xl p-5")}>
      <div className="text-xs font-bold uppercase tracking-wider text-accent">Avaliação final</div>
      <h2 className="mt-1 text-lg font-bold text-primary">Reflexão <span className="font-display text-2xl text-accent">Final</span></h2>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {PHOTO_DAYS.map((d: number) => {
          const p = state.days[d]?.photo;
          return (
            <div
              key={d}
              className="aspect-square overflow-hidden rounded-lg border border-border bg-muted/40"
            >
              {p ? (
                <img src={p} alt={`Dia ${d}`} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[10px] font-semibold text-muted-foreground">
                  Dia <span className="font-display text-xs">{d}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {[
          { key: "improved", label: "O que melhorou?" },
          { key: "same", label: "O que permaneceu igual?" },
          { key: "attention", label: "O que ainda precisa de atenção?" },
          { key: "keep", label: "Qual cuidado será mantido?" },
        ].map((q) => (
          <label key={q.key} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {q.label}
            </span>
            <textarea
              value={fe[q.key as keyof typeof fe] as string}
              onChange={(e) => updateFinalEval({ [q.key]: e.target.value } as Partial<typeof fe>, actorId)}
              rows={2}
              className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold text-primary">
          Como sua planta chegou ao Dia 21?
        </div>
        <div className="grid gap-2">
          {paths.map((p) => {
            const active = fe.path === p.id;
            return (
              <button
                key={p.id}
                onClick={() => updateFinalEval({ path: p.id }, actorId)}
                className={`rounded-2xl border p-3 text-left text-sm transition-colors ${
                  active
                    ? p.tone === "warn"
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                <div className="font-bold">{p.label}</div>
                <div className="mt-0.5 text-xs opacity-90">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {fe.path === "worsening" && (
        <div className="mt-3">
          <InfoCard tone="warn" icon={<AlertTriangle size={16} />}>
            Recomendamos buscar ajuda de um profissional em orquídeas. Sinais persistentes de
            deterioração pedem avaliação presencial.
          </InfoCard>
        </div>
      )}
    </div>
  );
}

/* ---------------- Aprender ---------------- */

const LIBRARY: Array<{ id: string; title: string; icon: ReactNode; body: string }> = [
  {
    id: "raizes",
    title: "Raízes",
    icon: <Sprout size={18} />,
    body: "Raízes saudáveis são firmes e esverdeadas quando úmidas. Pontas claras indicam crescimento. Raízes muito moles, escuras ou com mau cheiro pedem atenção imediata: revise rega, drenagem e substrato.",
  },
  {
    id: "rega",
    title: "Rega",
    icon: <Droplets size={18} />,
    body: "Prefira verificar a umidade antes de regar. Substrato encharcado sufoca raízes. Rega por calendário fixo costuma encharcar em dias frios e faltar em dias quentes.",
  },
  {
    id: "luz",
    title: "Luz",
    icon: <Sun size={18} />,
    body: "Orquídeas gostam de luz clara e indireta. Sol forte direto queima folhas. Falta de luz reduz vigor e dificulta floração.",
  },
  {
    id: "ventilacao",
    title: "Ventilação",
    icon: <Wind size={18} />,
    body: "Ar parado favorece fungos e apodrecimento. Um ambiente com ventilação suave contribui para raízes saudáveis e folhas firmes.",
  },
  {
    id: "vaso",
    title: "Vaso e drenagem",
    icon: <FlowerIcon size={18} />,
    body: "O vaso deve permitir passagem de ar e drenagem eficiente. Água acumulada é uma das principais causas de perda de raízes.",
  },
  {
    id: "substrato",
    title: "Substrato",
    icon: <Leaf size={18} />,
    body: "Substrato bom se mantém aerado, drena rápido e não vira uma massa compactada. Quando compacta, é hora de repor.",
  },
  {
    id: "erros",
    title: "Erros comuns",
    icon: <AlertTriangle size={18} />,
    body: "Regar por calendário fixo, misturar vários produtos, mudar de local com frequência e usar sol direto forte são erros que enfraquecem a planta.",
  },
  {
    id: "evolucao",
    title: "Sinais de evolução",
    icon: <Sparkles size={18} />,
    body: "Pontas verdes ou avermelhadas nas raízes, folhas mais firmes, brotos novos e hastes florais em desenvolvimento são bons indícios.",
  },
  {
    id: "faq",
    title: "Perguntas frequentes",
    icon: <Info size={18} />,
    body: "‘Vai florescer em 21 dias?’ — Não prometemos floração garantida. O plano cria condições favoráveis. ‘Posso usar em qualquer orquídea?’ — Foco em espécies comuns cultivadas em casa. Em dúvida, procure um profissional.",
  },
];

function AprenderTab({ setTab }: { setTab: (tab: any) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const current = LIBRARY.find((l) => l.id === open);

  return (
    <div className="space-y-6">
      <div className={cn(APP_CARD_FEATURED, "relative overflow-hidden rounded-[2rem] p-8")}>
        <div className="absolute -right-8 -top-8 opacity-[0.05] text-primary rotate-12">
          <BookOpen size={160} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            <BookOpen size={12} /> Biblioteca de Cuidado
          </div>
          <h1 className="mt-4 font-display text-3xl leading-tight tracking-tight text-primary">
            Dicas & Guia <br />
            <span className="text-accent">Botânico</span>
          </h1>
          <p className="mt-3 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
            Fundamentos e orientações práticas para sua orquídea florescer.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {LIBRARY.map((l) => (
          <button
            key={l.id}
            onClick={() => setOpen(l.id)}
            className={cn(APP_CARD_INTERACTIVE, "group relative flex items-center gap-4 overflow-hidden p-4 hover:shadow-md")}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {l.icon}
            </div>
            <div className="flex-1 pr-6">
              <div className="text-sm font-bold text-primary">{l.title}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-1">{l.body}</div>
            </div>
            <ChevronRight size={16} className="absolute right-4 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </button>
        ))}
      </div>

      <div 
        onClick={() => setTab("metodo")}
        className={cn(APP_CARD_GREEN_FEATURED, "group relative cursor-pointer overflow-hidden p-5 transition-all hover:border-primary/60 active:scale-[0.99]")}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <Info size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary">O Método de 2 Passos</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Enraizar & Nutrir</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Entenda a ciência por trás do nosso protocolo de 21 dias e como aplicar corretamente os produtos.
        </p>
        <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-primary uppercase tracking-wider">
          Ver detalhes <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      <AnimatePresence>
        {current && (
          <Drawer onClose={() => setOpen(null)} title={current.title} icon={current.icon}>
            <p className="text-base leading-relaxed text-foreground/90">{current.body}</p>
          </Drawer>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Drawer & Modal ---------------- */

/* ---------------- Método Tab ---------------- */

function MetodoContent() {
  const [activeProduct, setActiveProduct] = useState<"enraizador" | "nutrir" | null>(null);

  const productDetails = {
    enraizador: {
      title: "Enraizador Forte",
      icon: <Sprout size={24} />,
      color: "var(--color-plantae-green)",
      badge: "Enraizar",
      steps: [
        "Dilua 5ml (1 tampa) em 1 litro de água filtrada ou descansada.",
        "Aplique via rega no substrato, molhando bem as raízes.",
        "Pode ser usado via foliar (borrifar) no final da tarde.",
        "Frequência recomendada: 1x por semana na fase de enraizamento."
      ],
      doses: "5ml por litro de água.",
      warnings: "Evite aplicar sob sol forte. Não aplicar diretamente nas flores abertas."
    },
    nutrir: {
      title: "Bokashi Orquídeas",
      icon: <Leaf size={24} />,
      color: "var(--color-plantae-magenta)",
      badge: "Nutrir",
      steps: [
        "Agite bem antes de usar.",
        "Dilua 5ml em 1 litro de água.",
        "Regue o substrato uniformemente ao redor da planta.",
        "Use a cada 15 dias para manutenção ou 7 dias para estímulo."
      ],
      doses: "5ml por litro de água.",
      warnings: "Mantenha em local fresco e escuro. Mantenha fora do alcance de crianças."
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className={cn(APP_CARD_FEATURED, "relative overflow-hidden rounded-[2rem] p-8")}>
        <div className="absolute -right-8 -top-8 opacity-[0.05] text-primary rotate-12">
          <Sparkles size={160} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Info size={12} /> Conhecimento Técnico
          </div>
          <h1 className="mt-4 font-display text-3xl leading-tight tracking-tight text-primary">
            O Método <br />
            <span className="text-accent">2 Passos</span>
          </h1>
          <p className="mt-3 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
            A ciência por trás do sucesso das suas orquídeas.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className={cn(APP_CARD_GREEN_FEATURED, "relative group overflow-hidden rounded-3xl p-6")}>
          {/* Ilustração Botânica Linear - Enraizar */}
          <div className="absolute -right-4 -top-4 opacity-[0.07] pointer-events-none group-hover:scale-110 transition-transform duration-700">
            <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
              <path d="M50 90C50 90 45 70 45 50C45 30 50 10 50 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <path d="M50 70C40 65 30 75 25 60C20 45 40 40 50 45" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
              <path d="M50 70C60 65 70 75 75 60C80 45 60 40 50 45" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
              <path d="M50 50C40 45 35 30 20 35" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
              <path d="M50 50C60 45 65 30 80 35" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <motion.div
              className="relative aspect-square w-full overflow-hidden rounded-2xl"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <img
                src={sceneEnraizar}
                alt="Enraizador Forte em cena botânica"
                loading="lazy"
                width={1024}
                height={1024}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
            </motion.div>
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Passo 01</div>
              <h2 className="font-display text-3xl text-primary">Enraizar</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4 relative z-10">
            <p className="text-[15px] leading-relaxed text-foreground/80">
              O segredo de uma orquídea florida começa onde ninguém vê: nas <span className="font-bold text-primary">raízes</span>. Sem um sistema radicular forte, a planta não consegue absorver os nutrientes necessários para florescer.
            </p>
            <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
              <h4 className="text-sm font-bold text-primary">O que acontece:</h4>
              <ul className="mt-2 space-y-2">
                {[
                  "Estimula o surgimento de novas raízes",
                  "Aumenta a área de absorção de água",
                  "Fortalece a planta contra períodos de seca",
                  "Prepara a base para receber a nutrição"
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/70">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <button 
              onClick={() => setActiveProduct("enraizador")}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/10 bg-primary/5 py-3 text-[13px] font-bold text-primary transition-all active:scale-95 hover:bg-primary/10"
            >
              <Info size={16} /> Ver como usar
            </button>

            <AnimatePresence initial={false}>
              {activeProduct === "enraizador" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <ProductInstructions detail={productDetails.enraizador} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className={cn(APP_CARD_FEATURED, "relative group overflow-hidden rounded-3xl p-6")}>
          {/* Ilustração Botânica Linear - Nutrir */}
          <div className="absolute -right-4 -top-4 opacity-[0.07] pointer-events-none group-hover:scale-110 transition-transform duration-700">
            <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
              <path d="M50 90V40" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <path d="M50 40C50 40 70 35 80 20C90 5 70 0 50 15C30 0 10 5 20 20C30 35 50 40 50 40Z" stroke="currentColor" strokeWidth="0.8" fill="currentColor" fillOpacity="0.1"/>
              <path d="M50 60C50 60 75 55 85 40" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
              <path d="M50 60C50 60 25 55 15 40" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <motion.div
              className="relative aspect-square w-full overflow-hidden rounded-2xl"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <img
                src={sceneNutrir}
                alt="Bokashi Orquídeas em cena botânica"
                loading="lazy"
                width={1024}
                height={1024}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
            </motion.div>
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Passo 02</div>
              <h2 className="font-display text-3xl text-accent">Nutrir</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4 relative z-10">
            <p className="text-[15px] leading-relaxed text-foreground/80">
              Com as raízes prontas, entramos com a <span className="font-bold text-accent">nutrição premium</span>. O Bokashi Orquídeas fornece os elementos exatos que a planta precisa para o vigor vegetativo e a futura floração.
            </p>
            <div className="rounded-2xl bg-accent/5 p-4 border border-accent/10">
              <h4 className="text-sm font-bold text-accent">O que acontece:</h4>
              <ul className="mt-2 space-y-2">
                {[
                  "Aumenta a imunidade natural da planta",
                  "Proporciona folhas mais verdes e firmes",
                  "Apoia o surgimento de novos brotos e hastes",
                  "Garante energia para ciclos de flores duradouras"
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/70">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-accent" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => setActiveProduct("nutrir")}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/10 bg-accent/5 py-3 text-[13px] font-bold text-accent transition-all active:scale-95 hover:bg-accent/10"
            >
              <Info size={16} /> Ver como usar
            </button>

            <AnimatePresence initial={false}>
              {activeProduct === "nutrir" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <ProductInstructions detail={productDetails.nutrir} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className={cn(APP_CARD_BASE, "p-5")}>
        <h3 className="text-sm font-bold text-primary">Por que em 21 dias?</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          As orquídeas têm um metabolismo lento. 21 dias é o tempo ideal para que a planta processe os estímulos do enraizamento e comece a responder visualmente à nutrição, criando uma base sólida para o desenvolvimento contínuo.
        </p>
      </div>
    </div>
  );
}

function ProductInstructions({ detail }: { detail: { title: string; color: string; steps: string[]; doses: string; warnings: string } }) {
  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-primary/10 bg-background/60 p-4">
      <div>
        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Passo a Passo
        </h4>
        <div className="space-y-3">
          {detail.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div 
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold"
                style={{ backgroundColor: `${detail.color}15`, color: detail.color }}
              >
                {i + 1}
              </div>
              <p className="text-[14px] leading-relaxed text-foreground/80">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-primary/[0.04] p-3 border border-primary/5">
        <div className="flex items-center gap-2 mb-1">
          <Droplets size={14} style={{ color: detail.color }} />
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-primary">Dose Sugerida</h4>
        </div>
        <p className="text-[13px] text-muted-foreground">{detail.doses}</p>
      </div>

      <div className="rounded-xl bg-amber-500/[0.04] p-3 border border-amber-500/10">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={14} className="text-amber-600" />
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-amber-700">Cuidados</h4>
        </div>
        <p className="text-[13px] text-amber-600/80 leading-relaxed">{detail.warnings}</p>
      </div>
    </div>
  );
}

function Drawer({
  title,
  onClose,
  children,
  icon,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-plantae-green)]/40 backdrop-blur-md sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-[32px] border-t border-white/20 bg-[var(--color-plantae-cream)] shadow-2xl sm:rounded-[32px] sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de arraste visual para mobile */}
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-primary/10 sm:hidden" />

        <div className="px-6 pb-8 pt-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-4">
              {icon && (
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-plantae-lilac)] text-[var(--color-plantae-green)]">
                  {icon}
                </div>
              )}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  Biblioteca
                </div>
                <div className="font-display text-2xl font-normal text-[var(--color-plantae-green)]">{title}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/50 text-[var(--color-plantae-green)] transition-colors hover:bg-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative">
            <div className="absolute -left-2 top-0 h-4 w-1 rounded-full bg-accent" />
            <div className="pl-4">{children}</div>
          </div>

          <button
            onClick={onClose}
            className="mt-8 w-full rounded-full bg-[var(--color-plantae-green)] py-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-plantae-cream)] transition-transform active:scale-[0.98]"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-primary/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="text-lg font-bold text-primary">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ---------------- Resumo ---------------- */

function ResumoTab({ actorId }: { actorId: string }) {
  const { state } = useProtocolStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const completedDays = Object.values(state.days).filter((d) => d.completed).length;
  const totalApplications = state.applications.length;
  const totalNotes = Object.values(state.days).filter((d) => d.note?.trim()).length;
  const totalPhotos = Object.values(state.days).filter((d) => d.photo).length;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      await exportProtocolPDF(state);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const openPreview = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    try {
      const url = await previewProtocolPDF(state);
      setPreviewUrl(url);
    } catch (error) {
      console.error("Erro ao gerar pré-visualização:", error);
      toast.error("Não foi possível gerar a pré-visualização.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className={cn(APP_CARD_FEATURED, "p-6")}>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="font-display text-xl text-primary">Resumo da Jornada <span className="text-2xl text-accent">21</span></h2>
            <p className="text-xs text-muted-foreground">Visão geral do seu progresso de 21 dias.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatCard label="Dias concluídos" value={`${completedDays}/21`} icon={<CalendarCheck size={16} />} />
          <StatCard label="Aplicações" value={totalApplications} icon={<Droplets size={16} />} />
          <StatCard label="Observações" value={totalNotes} icon={<BookOpen size={16} />} />
          <StatCard label="Fotos" value={totalPhotos} icon={<Images size={16} />} />
        </div>
      </div>

      <div className={cn(APP_CARD_BASE, "p-6")}>
        <h3 className="text-sm font-bold text-primary">Exportar Dados</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Revise a pré-visualização do relatório antes de baixar ou gere o PDF completo com todos os registros, observações e fotos.
        </p>

        <div className="mt-4 grid gap-2">
          <button
            onClick={openPreview}
            disabled={isPreviewing || isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-3.5 text-sm font-bold text-primary transition-all hover:bg-primary/10 active:scale-[0.98] disabled:opacity-50"
          >
            {isPreviewing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Preparando pré-visualização...
              </>
            ) : (
              <>
                <FileText size={18} />
                Pré-visualizar relatório
              </>
            )}
          </button>
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download size={18} />
                Baixar Relatório em PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div className={cn(APP_CARD_BASE, "p-5")}>
        <h3 className="mb-4 text-sm font-bold text-primary">Linha do Tempo</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((weekNum) => {
            const weekDays = [1, 2, 3, 4, 5, 6, 7].map(d => (weekNum - 1) * 7 + d);
            const weekCompleted = weekDays.filter(d => state.days[d]?.completed).length;
            
            return (
              <div key={weekNum} className="relative pl-6">
                <div className="absolute left-0 top-1 h-full w-px bg-border" />
                <div className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Semana <span className="font-display text-sm">{weekNum}</span>
                  </span>
                  <span className="text-[10px] font-medium text-accent">
                    {weekCompleted}/7 concluídos
                  </span>
                </div>
                
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {weekDays.map(d => (
                    <div 
                      key={d} 
                      className={`h-1.5 rounded-full ${state.days[d]?.completed ? 'bg-primary' : 'bg-secondary'}`}
                      title={`Dia ${d}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-background/95 backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base text-primary">Pré-visualização do relatório</h3>
                <p className="truncate text-[11px] text-muted-foreground">
                  Revise seus registros e fotos antes de baixar.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={previewUrl}
                  download={protocolPdfFilename(state)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground shadow-sm shadow-accent/20 transition-all hover:brightness-110"
                >
                  <Download size={14} />
                  Baixar
                </a>
                <button
                  onClick={closePreview}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-secondary/70 text-foreground/70 transition-colors hover:bg-secondary"
                  aria-label="Fechar pré-visualização"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe
              src={previewUrl}
              title="Pré-visualização do relatório em PDF"
              className="flex-1 w-full border-0 bg-white"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className={cn(APP_CARD_INNER, "p-3")}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-display text-primary leading-none">{value}</div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  hint,
  subtitle,
  nowrapTitle,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  subtitle?: string;
  nowrapTitle?: boolean;
}) {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-accent">{eyebrow}</div>
          <h2 className={cn("font-display text-lg leading-tight text-primary", nowrapTitle && "whitespace-nowrap")}>{title}</h2>
        </div>
        {hint && (
          <span className="shrink-0 text-[10px] italic text-muted-foreground text-right max-w-[55%]">
            {hint}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-[12px] italic text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function DayPreviewModal({ 
  day, 
  onClose, 
  onSelect 
}: { 
  day: number; 
  onClose: () => void; 
  onSelect: () => void;
}) {
  const meta = getProtocolDay(day);
  const phase = getProtocolPhase(day);
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-6 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-secondary/50 p-2 text-foreground/60 transition-colors hover:bg-secondary"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{phase.range}</span>
             <div className="h-1 flex-1 bg-border/40 rounded-full" />
          </div>
          
          <h2 className="mt-4 font-display text-3xl tracking-tight text-primary">
            Dia <span className="text-4xl text-accent">{day}</span>
          </h2>
          <h3 className="mt-1 text-xl font-bold text-primary/80">{meta.title}</h3>
          
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Objetivo</div>
              <p className="mt-1 text-sm leading-relaxed text-foreground/80">{meta.objective}</p>
            </div>
            
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Tarefa Principal</div>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90 font-medium">{meta.mainAction}</p>
            </div>

            {meta.tip && (
              <div className="flex gap-3 rounded-2xl bg-accent/5 p-4 border border-accent/10">
                <Sparkles size={18} className="shrink-0 text-accent" />
                <p className="text-xs italic text-accent/80">{meta.tip}</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={onSelect}
              className="w-full rounded-2xl bg-accent py-4 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Começar este dia agora
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-2xl border border-border py-4 text-sm font-bold text-muted-foreground transition-all hover:bg-muted"
            >
              Voltar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------- Minha Orquídea ---------------- */

function MinhaOrquideaTab({ actorId, setTab }: { actorId: string; setTab: (t: Tab) => void }) {
  const { state, updatePlant, setCurrentDay, updateSettings } = useProtocolStore();
  const [showPlantForm, setShowPlantForm] = useState(false);
  
  const playInteractionSound = () => {
    if (state.settings?.muteSounds) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio interaction blocked", e);
    }
  };
  // Foco derivado do checklist real — mesma fonte de verdade da aba Início.
  const focusDay = computeFocusDay(state, (d) => getProtocolDay(d).checklist);
  const today = getProtocolDay(focusDay);
  const todayChecklist = today.checklist ?? [];
  const todayTasks = state.days[focusDay]?.checklist ?? {};
  const todayDoneCount = todayChecklist.filter((t) => todayTasks[t]).length;
  const upcomingDays = Array.from({ length: 3 }, (_, i) => focusDay + 1 + i).filter((d) => d <= 21);
  const goToDay = (d: number) => {
    setCurrentDay(d, actorId);
    setTab("plano");
  };
  const plant = state.plant;

  const completedDays = Array.from({ length: 21 }, (_, i) => i + 1).filter((d) =>
    isDayFullyDone(state, d, getProtocolDay(d).checklist),
  ).length;
  const totalApplications = state.applications.length;
  const totalPhotos = Object.values(state.days).filter((d) => d.photo).length;
  const totalNotes = Object.values(state.days).filter((d) => d.note?.trim()).length;
  const progressPct = Math.round((completedDays / 21) * 100);
  const diagnosisFresh = isDiagnosisCurrent(state);

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const photo = await uploadOrEncodePhoto(file, actorId);
      updatePlant({ photo }, actorId);
      toast.success("Foto atualizada");
    } catch {
      toast.error(PHOTO_ERROR_MESSAGE);
    }
  };

  const persistProfile = async () => {
    if (actorId === "guest") {
      toast.success("Dados salvos no navegador");
      return;
    }
    const { registerPlantRemote } = await import("@/lib/protocol-cloud");
    const { error } = await registerPlantRemote(actorId, {
      plant_name: plant.name,
      plant_species: plant.species,
      plant_unknown_species: plant.unknownSpecies,
      plant_location: plant.location,
      plant_pot: plant.pot,
      plant_substrate: plant.substrate,
      plant_difficulty: plant.difficulty,
    });
    if (error) {
      toast.error("Não foi possível salvar. Tente novamente.");
      return;
    }
    toast.success("Cadastro salvo");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header/Identidade */}
      <div className={cn(APP_CARD_FEATURED, "order-1 p-6")}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {plant.photo ? (
              <img
                src={plant.photo}
                alt={plant.name || "Sua orquídea"}
                className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/20"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Flower2 size={32} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-accent">Minha Orquídea</div>
            <h1 className="mt-0.5 truncate font-display text-2xl text-primary">
              {plant.name || "Sem nome ainda"}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {plant.species || (plant.unknownSpecies ? "Espécie desconhecida" : "Espécie não informada")}
            </p>
          </div>
        </div>
      </div>

      {/* Resumo de Progresso */}
      <div className={cn(APP_CARD_BASE, "order-4 p-6")}>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <CalendarCheck size={18} />
          </div>
          <div>
            <h2 className="font-display text-lg text-primary">Meu progresso</h2>
            <p className="text-xs text-muted-foreground">Dia {focusDay} de 21 · {progressPct}% concluído</p>
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard label="Dias concluídos" value={`${completedDays}/21`} icon={<CalendarCheck size={16} />} />
          <StatCard label="Aplicações" value={totalApplications} icon={<Droplets size={16} />} />
          <StatCard label="Observações" value={totalNotes} icon={<BookOpen size={16} />} />
          <StatCard label="Fotos" value={totalPhotos} icon={<Images size={16} />} />
        </div>

        {/* Saúde Atual */}
        {(() => {
          const result = state.diagnosisResult;
          const hasResult = !!result;
          const status = result?.healthStatus;
          const score = result?.healthScore ?? 0;
          const isWarn = status?.tone === "warn";
          const containerCls = !hasResult
            ? "border-border bg-muted/40"
            : isWarn
              ? "border-accent/40 bg-gradient-to-br from-accent/10 to-accent/5"
              : "border-primary/25 bg-gradient-to-br from-secondary/60 to-secondary/20";
          const alerts = hasResult ? [...(result?.priorities ?? []), ...(result?.adjustments ?? [])].slice(0, 4) : [];
          return (
            <>
              <div className={`mt-4 rounded-2xl border p-4 ${containerCls}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isWarn ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}>
                      <Stethoscope size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[10px] font-bold uppercase tracking-widest ${isWarn ? "text-accent" : "text-primary"}`}>Saúde atual</div>
                      <div className={`font-display text-base leading-tight ${isWarn ? "text-accent" : "text-primary"}`}>
                        {hasResult ? status?.label : "Diagnóstico pendente"}
                      </div>
                    </div>
                  </div>
                  {hasResult && (
                    <div className={`shrink-0 text-right font-display text-xl leading-none ${isWarn ? "text-accent" : "text-primary"}`}>
                      {score}<span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                  {hasResult
                    ? status?.message
                    : "Responda o diagnóstico rápido para receber prioridades e um plano ajustado à sua orquídea."}
                </p>
                {!diagnosisFresh && hasResult && (
                  <p className="mt-1 text-[11px] font-semibold text-accent">Respostas alteradas — atualize seu diagnóstico.</p>
                )}
                <button
                  onClick={() => setTab("diagnostico")}
                  className={cn(APP_CARD_INNER_INTERACTIVE, "mt-3 flex w-full items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-primary")}
                >
                  <span>Acessar detalhes do diagnóstico</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {alerts.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent">Alertas de atenção</div>
                  <ul className="space-y-2">
                    {alerts.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-start gap-2.5 rounded-xl border border-accent/25 bg-accent/5 p-3"
                      >
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent" />
                        <div className="min-w-0 text-xs leading-relaxed text-foreground">
                          <strong className="text-foreground">{a.title}:</strong>{" "}
                          <span className="text-foreground/80">{a.action}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] italic text-muted-foreground">
                    Se os sinais persistirem ou piorarem, considere consultar um orquidófilo experiente.
                  </p>
                </div>
              )}
            </>
          );
        })()}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setTab("plano")}
            className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 active:scale-[0.98]"
          >
            Ver meu plano
          </button>
          <button
            onClick={() => setTab("resumo")}
            className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            Ver resumo completo
          </button>
        </div>

        {/* Linha do tempo e marcos */}
        <div className="mt-6 border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-widest text-accent">Linha do tempo e marcos</div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Protocolo 21 dias
            </span>
          </div>
          <ol className="relative space-y-3">
            {[1, 7, 14, 21].map((d) => {
              const meta = getProtocolDay(d);
              const done = isDayFullyDone(state, d, meta.checklist);
              const isFocus = d === focusDay;
              const label = d === 1 ? "Início" : d === 21 ? "Final" : `Fase ${meta.phase}`;
              return (
                <li key={d} className="flex items-start gap-3">
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      isFocus
                        ? "bg-accent text-white shadow-sm ring-2 ring-accent/30"
                        : done
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {d}
                  </div>
                  <button
                    onClick={() => goToDay(d)}
                    className={cn(APP_CARD_INNER_INTERACTIVE, "min-w-0 flex-1 px-3 py-2 text-left")}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-widest text-accent">{label}</div>
                    <div className="mt-0.5 truncate text-sm font-semibold text-foreground">Dia {d}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                      <span className={`rounded-full px-2 py-0.5 ${done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {done ? "Concluído" : "Pendente"}
                      </span>
                      {isFocus && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">Hoje</span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Hoje — Resumo do dia atual */}
      <div className={cn(APP_CARD_FEATURED, "order-2 p-6")}>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-accent">Hoje · Dia {focusDay}</div>
            <h2 className="mt-0.5 truncate font-display text-lg text-primary">{today.title}</h2>
          </div>
        </div>

        {today.objective && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{today.objective}</p>
        )}

        {todayChecklist.length > 0 && (
          <div className={cn(APP_CARD_INNER, "mt-4 p-4")}>
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Checklist do dia</span>
              <span className="text-muted-foreground">{todayDoneCount}/{todayChecklist.length}</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {todayChecklist.slice(0, 3).map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <span className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border ${todayTasks[item] ? "border-primary bg-primary" : "border-border"}`} />
                  <span className={todayTasks[item] ? "text-muted-foreground line-through" : ""}>{item}</span>
                </li>
              ))}
              {todayChecklist.length > 3 && (
                <li className="pl-6 text-xs text-muted-foreground">+ {todayChecklist.length - 3} outras tarefas</li>
              )}
            </ul>
          </div>
        )}

        <button
          onClick={() => goToDay(focusDay)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 active:scale-[0.98]"
        >
          Abrir tarefa de hoje
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Próximos passos */}
      {upcomingDays.length > 0 && (
        <div className={cn(APP_CARD_GREEN_FEATURED, "order-3 p-6")}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary shadow-sm">
              <CalendarCheck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Em destaque</div>
              <h2 className="font-display text-lg text-primary">Próximos passos</h2>
              <p className="text-xs text-muted-foreground">Atalhos para os próximos dias do protocolo</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {upcomingDays.map((d) => {
              const meta = getProtocolDay(d);
              return (
                <li key={d}>
                  <button
                    onClick={() => goToDay(d)}
                    className={cn(APP_CARD_INNER_INTERACTIVE, "group flex w-full items-center gap-3 px-4 py-3 text-left")}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 font-display text-sm font-bold text-primary">
                      {d}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <span>Dia {d} · Fase {meta.phase}</span>
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-primary">Foco</span>
                      </div>
                      <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{meta.title}</div>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-primary/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Cadastro da Planta */}
      <div className={cn(APP_CARD_BASE, "order-5 overflow-hidden")}>
        {!showPlantForm ? (
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Flower2 size={18} />
                </div>
                <div>
                  <h2 className="font-display text-lg text-primary">
                    {plant.name.trim() ? "Sua planta" : "Cadastrar sua planta"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {plant.name.trim() ? "Informações básicas do seu cultivo." : "Identifique sua planta para um plano melhor."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  playInteractionSound();
                  setShowPlantForm(true);
                }}
                className="flex h-10 items-center gap-2 rounded-full border border-border bg-muted/40 px-4 text-xs font-bold text-foreground hover:bg-muted"
              >
                {plant.name.trim() ? (
                  <>
                    <Settings size={14} />
                    <span>Atualizar</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Começar</span>
                  </>
                )}
              </button>
            </div>

            {!plant.name.trim() && (
              <div className="mt-5 rounded-xl bg-accent/5 border border-accent/10 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 text-accent">
                    <Info size={16} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-accent uppercase tracking-wider">Por que cadastrar?</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Ao identificar o nome, espécie e local de cultivo, o protocolo se torna mais assertivo para as necessidades reais da sua planta hoje.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {plant.name.trim() && (
              <div className={cn(APP_CARD_INNER, "mt-5 flex items-center gap-4 p-4")}>
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-primary/5">
                  {plant.photo ? (
                    <img src={plant.photo} alt={plant.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-primary/40">
                      <Flower2 size={20} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{plant.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {plant.species || "Espécie não informada"} • {plant.location || "Local não informado"}
                  </div>
                </div>
                <div className="flex h-6 items-center gap-1 rounded-full bg-primary/10 px-2 text-[10px] font-bold text-primary">
                  <Check size={10} />
                  Cadastrada
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Flower2 size={18} />
                </div>
                <div>
                  <h2 className="font-display text-lg text-primary">Ficha da Planta</h2>
                  <p className="text-xs text-muted-foreground">Preencha os detalhes do seu cultivo.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlantForm(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-5">
              <Field label="Nome da planta">
                <input
                  value={plant.name}
                  onChange={(e) => updatePlant({ name: e.target.value }, actorId)}
                  placeholder="Ex.: Minha Phalaenopsis"
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </Field>

              <Field label="Espécie (opcional)">
                <input
                  value={plant.species}
                  onChange={(e) => updatePlant({ species: e.target.value, unknownSpecies: false }, actorId)}
                  disabled={plant.unknownSpecies}
                  placeholder="Ex.: Phalaenopsis, Cattleya…"
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={plant.unknownSpecies}
                    onChange={(e) => {
                      const unknownSpecies = e.target.checked;
                      updatePlant({ unknownSpecies, species: unknownSpecies ? "" : plant.species }, actorId);
                    }}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Não sei a espécie
                </label>
              </Field>

              <SelectField
                label="Local de cultivo"
                value={plant.location}
                onChange={(v) => updatePlant({ location: v }, actorId)}
                options={["Varanda", "Janela interna", "Jardim externo", "Estufa", "Outro"]}
              />

              <SelectField
                label="Tipo de vaso"
                value={plant.pot}
                onChange={(v) => updatePlant({ pot: v }, actorId)}
                options={["Vaso plástico transparente", "Vaso plástico comum", "Vaso de barro", "Vaso de madeira", "Cachepot", "Outro"]}
              />

              <SelectField
                label="Tipo de substrato"
                value={plant.substrate}
                onChange={(v) => updatePlant({ substrate: v }, actorId)}
                options={["Casca de pinus", "Fibra de coco", "Musgo (sphagnum)", "Mistura", "Não sei", "Outro"]}
              />

              <SelectField
                label="Principal dificuldade"
                value={plant.difficulty}
                onChange={(v) => updatePlant({ difficulty: v }, actorId)}
                options={["Não floresce", "Folhas caídas ou enrugadas", "Raízes fracas", "Manchas nas folhas", "Não sei o que fazer", "Outra"]}
              />

              <Field label="Foto da planta">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-colors hover:border-primary/40">
                  {plant.photo ? (
                    <img src={plant.photo} alt="Sua orquídea" className="max-h-48 rounded-lg object-cover" />
                  ) : (
                    <>
                      <Camera size={22} className="text-muted-foreground" />
                      <div className="text-sm font-medium text-foreground">Enviar foto</div>
                      <div className="text-xs text-muted-foreground">Salva no seu navegador</div>
                    </>
                  )}
                  <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
                </label>
                {plant.photo && (
                  <button
                    onClick={() => updatePlant({ photo: null }, actorId)}
                    className="mt-2 text-xs text-muted-foreground underline"
                  >
                    Remover foto
                  </button>
                )}
              </Field>
            </div>

            <button
              onClick={() => {
                persistProfile();
                setShowPlantForm(false);
              }}
              disabled={!plant.name.trim()}
              className="mt-8 w-full rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              Salvar cadastro
            </button>
          </div>
        )}
      </div>

      {/* Preferências */}
      <div className={cn(APP_CARD_BASE, "order-6 p-6")}>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="font-display text-lg text-primary">Preferências</h2>
            <p className="text-xs text-muted-foreground">Personalize sua experiência no aplicativo.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className={cn(APP_CARD_INNER_HOVER, "flex items-center justify-between p-4")}>
            <div className="flex items-center gap-3">
              <div className={cn("grid h-10 w-10 place-items-center rounded-lg transition-colors", state.settings?.muteSounds ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                {state.settings?.muteSounds ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">Sons</div>
                <div className="truncate text-[10px] text-muted-foreground">Silenciar interações</div>
              </div>
            </div>
            <button
              onClick={() => {
                updateSettings({ muteSounds: !state.settings?.muteSounds }, actorId);
                if (state.settings?.muteSounds) {
                   setTimeout(() => playInteractionSound(), 50);
                }
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                !state.settings?.muteSounds ? "bg-primary" : "bg-muted"
              )}
            >
              <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out", !state.settings?.muteSounds ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>

          <div className={cn(APP_CARD_INNER_HOVER, "flex items-center justify-between p-4")}>
            <div className="flex items-center gap-3">
              <div className={cn("grid h-10 w-10 place-items-center rounded-lg transition-colors", state.settings?.hapticsDisabled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                <Zap size={20} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">Vibrações</div>
                <div className="truncate text-[10px] text-muted-foreground">Feedback tátil</div>
              </div>
            </div>
            <button
              onClick={() => {
                updateSettings({ hapticsDisabled: !state.settings?.hapticsDisabled }, actorId);
                if (!state.settings?.hapticsDisabled && "vibrate" in navigator) {
                  navigator.vibrate(10);
                }
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                !state.settings?.hapticsDisabled ? "bg-primary" : "bg-muted"
              )}
            >
              <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out", !state.settings?.hapticsDisabled ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>

          <div className={cn(APP_CARD_INNER_HOVER, "flex items-center justify-between p-4")}>
            <div className="flex items-center gap-3">
              <div className={cn("grid h-10 w-10 place-items-center rounded-lg transition-colors", state.settings?.focusedMode ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                <Wind size={20} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">Modo Focado</div>
                <div className="truncate text-[10px] text-muted-foreground">Reduzir distrações no início</div>
              </div>
            </div>
            <button
              onClick={() => {
                playInteractionSound();
                if (navigator.vibrate && !state.settings?.hapticsDisabled) {
                  navigator.vibrate(10);
                }
                updateSettings({ focusedMode: !state.settings?.focusedMode }, actorId);
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                state.settings?.focusedMode ? "bg-primary" : "bg-muted"
              )}
            >
              <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out", state.settings?.focusedMode ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>

          <div className={cn(APP_CARD_INNER_HOVER, "flex items-center justify-between p-4")}>
            <div className="flex items-center gap-3">
              <div className={cn("grid h-10 w-10 place-items-center rounded-lg transition-colors", state.settings?.highContrast ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Sparkles size={20} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">Alto Contraste</div>
                <div className="truncate text-[10px] text-muted-foreground">Reforça cores, bordas e foco</div>
              </div>
            </div>
            <button
              aria-label="Alternar alto contraste"
              aria-pressed={!!state.settings?.highContrast}
              onClick={() => {
                playInteractionSound();
                if (navigator.vibrate && !state.settings?.hapticsDisabled) {
                  navigator.vibrate(10);
                }
                updateSettings({ highContrast: !state.settings?.highContrast }, actorId);
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                state.settings?.highContrast ? "bg-primary" : "bg-muted"
              )}
            >
              <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out", state.settings?.highContrast ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Unused imports guard: reference to keep certain icons in bundle for clarity/future.
export const _icons = { Plus };

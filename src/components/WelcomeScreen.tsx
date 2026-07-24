import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout,
  Leaf,
  Calendar,
  CalendarCheck,
  Stethoscope,
  BookOpen,
  Camera,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { PlantaefertLogo } from "@/components/PlantaefertLogo";
import { getProtocolDay, getProtocolPhase } from "@/lib/protocol-plan";
import welcomeOrchid from "@/assets/welcome-orchid.jpg";
import { useProtocolStore } from "@/lib/protocol-store";

export type WelcomeTab = "inicio" | "orquidea" | "plano" | "diagnostico" | "diario" | "aprender" | "resumo" | "metodo";

export interface WelcomeScreenProps {
  onStart: () => void;
  onExplore: () => void;
  onQuickAction?: (tab: WelcomeTab) => void;
  onRegisterOrchid?: () => void;
}

export function WelcomeScreen({
  onStart,
  onExplore,
  onQuickAction,
  onRegisterOrchid,
}: WelcomeScreenProps) {
  const { state } = useProtocolStore();
  const day = state.currentDay;
  const phase = getProtocolPhase(day);
  const protocolDay = getProtocolDay(day);
  const phaseIndex = phase.id === "fase-1" ? 0 : phase.id === "fase-2" ? 1 : 2;

  const PhaseIllustration = () => {
    if (phaseIndex === 0) {
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full p-8 opacity-40 text-primary-foreground">
          <path d="M50 80 Q30 80 20 60 Q10 40 30 20 Q50 0 70 20 Q90 40 80 60 Q70 80 50 80 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="65" cy="35" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="79" y1="49" x2="90" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    }
    if (phaseIndex === 1) {
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full p-8 opacity-40 text-primary-foreground">
          <path d="M50 90 L50 40 M50 70 Q70 60 80 40 M50 60 Q30 50 20 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 40 Q70 30 70 10 Q50 0 30 10 Q30 30 50 40" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full p-8 opacity-40 text-primary-foreground">
        <circle cx="50" cy="40" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {[0, 72, 144, 216, 288].map((deg) => (
          <path key={deg} d="M50 40 Q70 20 50 5 Q30 20 50 40" fill="none" stroke="currentColor" strokeWidth="1.5" transform={`rotate(${deg}, 50, 40)`} />
        ))}
        <path d="M50 90 L50 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  };

  const phaseStyles = [
    { bg: "var(--color-plantae-cream)", accent: "var(--color-plantae-rose)" },
    { bg: "#F0F4F2", accent: "var(--color-plantae-lilac)" },
    { bg: "#F9F2F7", accent: "rgba(217,70,239,0.1)" },
  ];

  const currentStyle = phaseStyles[phaseIndex];
  const phaseLabels = ["Diagnosticar", "Manter", "Consolidar"];
  const currentPhaseLabel = phaseLabels[phaseIndex];

  return (
    <motion.div
      initial={false}
      animate={{ backgroundColor: currentStyle.bg }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className="min-h-screen font-sans"
      style={{ color: "var(--color-plantae-ink)" }}
    >
      <motion.div
        initial={false}
        animate={{ backgroundColor: currentStyle.bg }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-5 pb-8 pt-6 sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:rounded-[28px] sm:px-6 sm:shadow-[0_20px_70px_-40px_rgba(23,61,50,0.35)] border-x border-border/10 sm:border"
      >
        <header className="flex items-center">
          <PlantaefertLogo className="h-12 w-auto object-contain" />
        </header>


        <figure
          className="relative mt-5 overflow-hidden rounded-[28px] border border-white/20 shadow-xl transition-colors duration-1000"
          style={{ backgroundColor: currentStyle.accent }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative h-[220px] w-full sm:h-[240px]"
            >
              <img
                src={welcomeOrchid}
                alt="Orquídea Phalaenopsis saudável em vaso, com folhas verdes e raízes aéreas visíveis em ambiente doméstico claro."
                width={1024}
                height={1024}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <PhaseIllustration />
              </div>
            </motion.div>
          </AnimatePresence>

          <span
            className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md"
            style={{ backgroundColor: "var(--color-plantae-rose)", color: "var(--color-plantae-magenta)" }}
          >
            <Sparkles size={11} /> Fase: {currentPhaseLabel}
          </span>
        </figure>

        <h1 className="mt-6 font-display leading-[1.02] tracking-tight" style={{ color: "var(--color-plantae-green)" }}>
          <span className="block text-[22px] font-normal" style={{ color: "var(--color-plantae-mute)" }}>
            Guia Prático
          </span>
          <span className="mt-1 block text-[36px] leading-[1.05] font-normal min-[390px]:text-[40px] sm:text-[44px] [word-spacing:0.02em]">
            <span className="whitespace-nowrap">Orquídeas</span>{" "}
            <em className="not-italic whitespace-nowrap" style={{ color: "var(--color-plantae-magenta)" }}>
              Floridas
            </em>
          </span>
        </h1>

        <p className="mt-4 text-[15px] font-semibold" style={{ color: "var(--color-plantae-green)" }}>
          Seu plano guiado • Dias 1 a 21
        </p>

        <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--color-plantae-mute)" }}>
          {phase.description}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <StepCard
            number="1"
            label="Enraizar"
            support="Fortalecer a base"
            text="Cuidar das raízes e preparar a planta para aproveitar melhor a rotina."
            bg="var(--color-plantae-lilac)"
            ink="var(--color-plantae-green)"
            badge="var(--color-plantae-green)"
            badgeInk="var(--color-plantae-cream)"
            icon={<Sprout size={18} strokeWidth={2} />}
          />
          <div
            className="flex items-center gap-2 pl-6 text-[10px] uppercase tracking-[0.2em]"
            style={{ color: "var(--color-plantae-mute)" }}
          >
            <span className="h-px w-6" style={{ backgroundColor: "var(--color-plantae-mute)" }} />
            depois
          </div>
          <StepCard
            number="2"
            label="Nutrir"
            support="Apoiar o desenvolvimento"
            text="Oferecer suporte nutricional para o vigor e os próximos ciclos da planta."
            bg="var(--color-plantae-lilac)"
            ink="var(--color-plantae-green)"
            badge="var(--color-plantae-magenta)"
            badgeInk="var(--color-plantae-cream)"
            icon={<Leaf size={18} strokeWidth={2} />}
          />
        </div>

        <div
          className="mt-5 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.6)",
            color: "var(--color-plantae-ink)",
            border: "1px solid rgba(23,61,50,0.08)",
          }}
        >
          <div className="flex items-center gap-2">
            <Stethoscope size={13} style={{ color: "var(--color-plantae-green)" }} />
            <CalendarCheck size={13} style={{ color: "var(--color-plantae-green)" }} />
            <Camera size={13} style={{ color: "var(--color-plantae-green)" }} />
            <span
              className="ml-1 text-[12px] font-semibold uppercase tracking-[0.09em]"
              style={{ color: "var(--color-plantae-green)" }}
            >
              Diagnóstico · Tarefas · Fotos
            </span>
          </div>
          <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--color-plantae-mute)" }}>
            Acompanhe tudo em um só lugar.
          </p>
        </div>

        {state.currentDay > 1 && onQuickAction && (
          <div
            className="mt-6 overflow-hidden rounded-[24px] border border-white/30 shadow-sm"
            style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-3.5">
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Próxima ação</span>
              <div className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-plantae-magenta)]" />
            </div>
            <div className="grid grid-cols-3 divide-x divide-black/5">
              <button
                onClick={() => onQuickAction("diagnostico")}
                className="flex flex-col items-center gap-1.5 py-4 transition-colors hover:bg-white/40 active:scale-95"
              >
                <div className="rounded-full bg-white p-2 shadow-sm">
                  <Stethoscope size={16} className="text-[#155F4E]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Exame</span>
              </button>
              <button
                onClick={() => onQuickAction("plano")}
                className="flex flex-col items-center gap-1.5 py-4 transition-colors hover:bg-white/40 active:scale-95"
              >
                <div className="rounded-full bg-white p-2 shadow-sm">
                  <Calendar size={16} className="text-[#155F4E]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Diário</span>
              </button>
              <button
                onClick={() => onQuickAction("aprender")}
                className="flex flex-col items-center gap-1.5 py-4 transition-colors hover:bg-white/40 active:scale-95"
              >
                <div className="rounded-full bg-white p-2 shadow-sm">
                  <BookOpen size={16} className="text-[#155F4E]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Aprender</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {state.currentDay > 1 ? (
            <button
              onClick={onStart}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-4 text-[15px] font-semibold uppercase tracking-[0.06em] transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--color-plantae-green)", color: "var(--color-plantae-cream)" }}
            >
              <span className="relative z-10 flex flex-col items-center">
                <span className="flex items-center gap-2">
                  Retomar: Dia {state.currentDay} <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                </span>
                <span className="text-[10px] opacity-70 normal-case tracking-normal">
                  Próximo passo: {protocolDay.title}
                </span>
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ) : (
            <>
              <button
                onClick={onStart}
                className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-4 text-[15px] font-semibold uppercase tracking-[0.06em] transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--color-plantae-green)", color: "var(--color-plantae-cream)" }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Começar diagnóstico <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>

              {onRegisterOrchid && (
                <button
                  onClick={onRegisterOrchid}
                  className="flex items-center justify-center gap-2 rounded-full border border-[#155F4E]/10 px-6 py-3.5 text-[14px] font-medium transition-colors hover:bg-white/40"
                  style={{ color: "var(--color-plantae-green)" }}
                >
                  <Sprout size={16} /> Cadastro da orquídea
                </button>
              )}
            </>
          )}

          <button
            onClick={onExplore}
            className="mt-2 rounded-full px-6 py-2.5 text-[13px] font-medium underline-offset-4 hover:underline"
            style={{ color: "var(--color-plantae-mute)" }}
          >
            Apenas explorar como visitante
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepCard({
  number,
  label,
  support,
  text,
  bg,
  ink,
  badge,
  badgeInk,
  icon,
}: {
  number: string;
  label: string;
  support: string;
  text: string;
  bg: string;
  ink: string;
  badge: string;
  badgeInk: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[24px] p-5 border border-white/40 shadow-sm" style={{ backgroundColor: bg }}>
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold shadow-sm"
          style={{ backgroundColor: badge, color: badgeInk }}
        >
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span style={{ color: ink }}>{icon}</span>
            <h3 className="font-display text-[20px] leading-none" style={{ color: ink }}>
              {label}
            </h3>
          </div>
          <p
            className="mt-1 text-[12.5px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: ink, opacity: 0.7 }}
          >
            {support}
          </p>
          <p
            className="mt-1.5 text-[14.5px] leading-[1.55]"
            style={{ color: "var(--color-plantae-ink)", opacity: 0.85 }}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

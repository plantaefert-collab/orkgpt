import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Lock, Sparkles, Leaf, Stethoscope, Rocket } from "lucide-react";
import { useProtocolStore } from "@/lib/protocol-store";

export const Route = createFileRoute("/primeiros-passos")({
  head: () => ({
    meta: [
      { title: "Primeiros Passos — Guia Prático Orquídeas Floridas" },
      { name: "description", content: "Configure sua jornada em poucos passos: cadastre sua orquídea, faça o diagnóstico guiado e receba seu plano personalizado." },
      { property: "og:title", content: "Primeiros Passos — Guia Prático Orquídeas Floridas" },
      { property: "og:description", content: "Configure sua jornada em poucos passos: cadastre sua orquídea, faça o diagnóstico guiado e receba seu plano personalizado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrimeirosPassosPage,
});

type PreviewMode = "real" | "sem-planta" | "planta-cadastrada" | "diagnostico-concluido";

type StepStatus = "done" | "available" | "locked";

function PrimeirosPassosPage() {
  const { state } = useProtocolStore();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<PreviewMode>("real");

  const { hasPlant, hasDiagnosis } = useMemo(() => {
    if (preview === "sem-planta") return { hasPlant: false, hasDiagnosis: false };
    if (preview === "planta-cadastrada") return { hasPlant: true, hasDiagnosis: false };
    if (preview === "diagnostico-concluido") return { hasPlant: true, hasDiagnosis: true };
    return {
      hasPlant: !!state.plant.name?.trim(),
      hasDiagnosis: state.diagnosisStatus === "fresh" && !!state.diagnosisResult,
    };
  }, [preview, state.plant.name, state.diagnosisStatus, state.diagnosisResult]);

  const steps: Array<{
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    status: StepStatus;
    ctaLabel?: string;
    onCta?: () => void;
  }> = [
    {
      id: "conta",
      title: "Conta criada",
      description: "Seu acesso ao Guia Prático já está pronto.",
      icon: <Sparkles className="h-5 w-5" />,
      status: "done",
    },
    {
      id: "cadastro",
      title: "Cadastre sua orquídea",
      description: "Dê um nome, adicione uma foto e conte um pouco sobre onde ela vive.",
      icon: <Leaf className="h-5 w-5" />,
      status: hasPlant ? "done" : "available",
      ctaLabel: hasPlant ? "Revisar cadastro" : "Cadastrar orquídea",
      onCta: () => navigate({ to: "/minha-orquidea" }),
    },
    {
      id: "diagnostico",
      title: "Faça o diagnóstico guiado",
      description: "Responda perguntas simples sobre raízes, folhas e ambiente.",
      icon: <Stethoscope className="h-5 w-5" />,
      status: !hasPlant ? "locked" : hasDiagnosis ? "done" : "available",
      ctaLabel: hasDiagnosis ? "Ver diagnóstico" : "Iniciar diagnóstico",
      onCta: () => navigate({ to: hasDiagnosis ? "/resumo" : "/diagnostico" }),
    },
    {
      id: "jornada",
      title: "Sua jornada está pronta",
      description: "Veja o plano de 21 dias personalizado com base no seu diagnóstico.",
      icon: <Rocket className="h-5 w-5" />,
      status: !hasDiagnosis ? "locked" : "available",
      ctaLabel: "Ir para meu início",
      onCta: () => navigate({ to: "/inicio" }),
    },
  ];

  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <main className="min-h-screen bg-[#F8F5EE] pb-16">
      <div className="mx-auto w-full max-w-xl px-5 pt-8">
        {/* Preview-only selector */}
        <div className="mb-6 rounded-xl border border-dashed border-accent/60 bg-accent/5 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider text-accent">
              Somente preview
            </span>
            <span className="text-muted-foreground">Simular estado</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              ["real", "Estado real"],
              ["sem-planta", "Sem planta"],
              ["planta-cadastrada", "Planta cadastrada"],
              ["diagnostico-concluido", "Diagnóstico concluído"],
            ] as Array<[PreviewMode, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPreview(value)}
                className={`rounded-full border px-3 py-1 transition ${
                  preview === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
            Guia Prático
          </p>
          <h1 className="font-serif text-3xl leading-tight text-primary md:text-4xl">
            Bem-vindo ao seu Guia Prático
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Vamos conhecer sua orquídea e preparar juntos a jornada de cuidados que ela merece.
          </p>
        </header>

        {/* Progress indicator */}
        <section className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-primary">
              Configuração da sua jornada
            </span>
            <span className="text-xs text-muted-foreground">
              {doneCount} de {steps.length}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {/* Steps */}
        <ol className="space-y-4">
          {steps.map((step, idx) => (
            <StepCard key={step.id} step={step} index={idx + 1} />
          ))}
        </ol>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Já explorou antes?{" "}
          <Link to="/inicio" className="font-medium text-primary underline underline-offset-4">
            Ir direto para meu início
          </Link>
        </p>
      </div>
    </main>
  );
}

function StepCard({
  step,
  index,
}: {
  step: {
    title: string;
    description: string;
    icon: React.ReactNode;
    status: StepStatus;
    ctaLabel?: string;
    onCta?: () => void;
  };
  index: number;
}) {
  const isLocked = step.status === "locked";
  const isDone = step.status === "done";
  const isAvailable = step.status === "available";

  return (
    <li
      className={`relative rounded-2xl border p-5 transition ${
        isDone
          ? "border-primary/30 bg-primary/5"
          : isAvailable
            ? "border-accent bg-background shadow-sm ring-1 ring-accent/20"
            : "border-border bg-muted/40 opacity-70"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${
            isDone
              ? "bg-primary text-primary-foreground"
              : isAvailable
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {isDone ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : isLocked ? (
            <Lock className="h-5 w-5" />
          ) : (
            step.icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Passo {index}
            </span>
            {isDone && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                Concluído
              </span>
            )}
            {isAvailable && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
                Disponível
              </span>
            )}
            {isLocked && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Bloqueado
              </span>
            )}
          </div>
          <h3 className="font-serif text-lg text-primary">{step.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>

          {step.ctaLabel && step.onCta && !isLocked && (
            <button
              type="button"
              onClick={step.onCta}
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isAvailable
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-primary/30 bg-transparent text-primary hover:bg-primary/5"
              }`}
            >
              {step.ctaLabel}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// Onboarding flow documentation: https://guia02.lovable.app/inicio
import { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Camera, 
  Flower2, 
  Stethoscope, 
  Leaf, 
  Home, 
  Droplets, 
  Sparkles,
  ArrowRight,
  Info,
  X,
  Smartphone,
  Check,
  Sprout
} from "lucide-react";
import { useProtocolStore } from "@/lib/protocol-store";
import { uploadOrEncodePhoto } from "@/lib/photo-upload";
import { PHOTO_ERROR_MESSAGE } from "@/lib/image-compress";

type OnboardingStep = "welcome" | "plant_info" | "diagnosis_intro" | "diagnosis_roots" | "diagnosis_leaves" | "diagnosis_env" | "summary";

interface OnboardingFlowProps {
  actorId: string;
  onFinish: () => void;
}

export function OnboardingFlow({ actorId, onFinish }: OnboardingFlowProps) {
  const { state, updatePlant, toggleDiagnosis, saveDiagnosisResult, setOnboarded, setOnboardingStep } = useProtocolStore();
  const [step, setStep] = useState<OnboardingStep>((state.onboardingStep as OnboardingStep) || "welcome");
  const [direction, setDirection] = useState(0);
  const [busy, setBusy] = useState(false);

  const plant = state.plant;
  const diagnosis = state.diagnosis;

  const nextStep = () => {
    const sequence: OnboardingStep[] = ["welcome", "plant_info", "diagnosis_intro", "diagnosis_roots", "diagnosis_leaves", "diagnosis_env", "summary"];
    const currentIndex = sequence.indexOf(step);
    if (currentIndex < sequence.length - 1) {
      setDirection(1);
      const next = sequence[currentIndex + 1];
      setStep(next);
      setOnboardingStep(next, actorId);
    } else {
      handleFinish();
    }
  };

  const prevStep = () => {
    const sequence: OnboardingStep[] = ["welcome", "plant_info", "diagnosis_intro", "diagnosis_roots", "diagnosis_leaves", "diagnosis_env", "summary"];
    const currentIndex = sequence.indexOf(step);
    if (currentIndex > 0) {
      setDirection(-1);
      const prev = sequence[currentIndex - 1];
      setStep(prev);
      setOnboardingStep(prev, actorId);
    }
  };

  const handleFinish = () => {
    saveDiagnosisResult(actorId);
    setOnboarded(true, actorId);
    onFinish();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadOrEncodePhoto(file, actorId);
      updatePlant({ photo: url }, actorId);
    } catch {
      alert(PHOTO_ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-accent/20">
      {/* Header Progress */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Flower2 size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary">Primeiro Acesso</h1>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Passo {["welcome", "plant_info", "diagnosis_intro", "diagnosis_roots", "diagnosis_leaves", "diagnosis_env", "summary"].indexOf(step) + 1} de 7</p>
            </div>
          </div>
          <button onClick={onFinish} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <X size={20} />
          </button>
        </div>
        <div className="h-1 w-full bg-muted">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((["welcome", "plant_info", "diagnosis_intro", "diagnosis_roots", "diagnosis_leaves", "diagnosis_env", "summary"].indexOf(step) + 1) / 7) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            {step === "welcome" && (
              <motion.div
                key="welcome"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="text-center"
              >
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
                    <div className="relative rounded-full bg-accent/10 p-5 text-accent">
                      <Sparkles size={40} />
                    </div>
                  </div>
                </div>
                <h2 className="font-display text-3xl text-primary">Bem-vindo(a) ao seu Protocolo!</h2>
                <p className="mt-4 text-muted-foreground">
                  Vamos preparar tudo para sua orquídea florescer. Em poucos passos vamos cadastrar sua planta e entender a saúde dela hoje.
                </p>
                
                <div className="mt-8 space-y-4 text-left">
                  {[
                    { icon: <Smartphone size={18} />, title: "Plano Personalizado", desc: "Um guia de 21 dias feito para o estado da sua planta." },
                    { icon: <Stethoscope size={18} />, title: "Diagnóstico Guiado", desc: "Identifique problemas em raízes, folhas e ambiente." },
                    { icon: <Droplets size={18} />, title: "Método de 2 Passos", desc: "Aprenda a aplicar o enraizamento e nutrição." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-primary">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "plant_info" && (
              <motion.div
                key="plant_info"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <h2 className="font-display text-2xl text-primary">1. Cadastro da Orquídea</h2>
                <p className="mt-1 text-sm text-muted-foreground">Dê uma identidade para sua planta.</p>

                <div className="mt-8 space-y-6">
                  <div className="flex flex-col items-center">
                    <label className="group relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary/40">
                      {plant.photo ? (
                        <img src={plant.photo} alt="Sua planta" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary">
                          <Camera size={24} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{busy ? "Enviando..." : "Foto"}</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={busy} />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-primary">Nome da planta</label>
                      <input
                        value={plant.name}
                        onChange={(e) => updatePlant({ name: e.target.value }, actorId)}
                        placeholder="Ex: Minha Phalaenopsis"
                        className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-primary">Espécie</label>
                      <input
                        value={plant.species}
                        onChange={(e) => updatePlant({ species: e.target.value, unknownSpecies: false }, actorId)}
                        disabled={plant.unknownSpecies}
                        placeholder="Ex: Phalaenopsis Branca"
                        className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={plant.unknownSpecies}
                          onChange={(e) => updatePlant({ unknownSpecies: e.target.checked, species: e.target.checked ? "" : plant.species }, actorId)}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        Não sei a espécie exata
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "diagnosis_intro" && (
              <motion.div
                key="diagnosis_intro"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="text-center"
              >
                <div className="mb-6 flex justify-center">
                  <div className="rounded-full bg-primary/10 p-5 text-primary">
                    <Stethoscope size={40} />
                  </div>
                </div>
                <h2 className="font-display text-2xl text-primary">Diagnóstico Guiado</h2>
                <p className="mt-4 text-muted-foreground">
                  Agora vamos analisar os sinais que sua orquídea está dando. Isso ajuda a definir as prioridades do seu plano de 21 dias.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {["Raízes", "Folhas", "Ambiente"].map((item, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-4">
                      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/5 text-primary">
                        {i === 0 ? <Sprout size={16} /> : i === 1 ? <Leaf size={16} /> : <Home size={16} />}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{item}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {(step === "diagnosis_roots" || step === "diagnosis_leaves" || step === "diagnosis_env") && (
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {step === "diagnosis_roots" ? <Sprout size={20} /> : step === "diagnosis_leaves" ? <Leaf size={20} /> : <Home size={20} />}
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-primary">
                      {step === "diagnosis_roots" ? "2. Raízes" : step === "diagnosis_leaves" ? "3. Folhas" : "4. Ambiente"}
                    </h2>
                    <p className="text-xs text-muted-foreground">Marque tudo o que observar hoje.</p>
                  </div>
                </div>

                <div className="mt-8 grid gap-2">
                  {(step === "diagnosis_roots" 
                    ? ["Firmes e verdes", "Secas ou ocas", "Escuras ou moles", "Crescendo para fora", "Puntas verdes ativas"]
                    : step === "diagnosis_leaves"
                    ? ["Verde escuro firme", "Amareladas", "Enrugadas ou moles", "Manchas escuras", "Brotos novos surgindo"]
                    : ["Luz indireta clara", "Sol direto forte", "Pouca luz", "Boa ventilação", "Local muito abafado"]
                  ).map((option) => {
                    const category = step === "diagnosis_roots" ? "roots" : step === "diagnosis_leaves" ? "leaves" : "environment";
                    const active = diagnosis[category].includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => toggleDiagnosis(category, option, actorId)}
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                          active 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="text-sm font-medium">{option}</span>
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-muted/20"}`}>
                          {active && <Check size={12} strokeWidth={4} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === "summary" && (
              <motion.div
                key="summary"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="text-center"
              >
                <div className="mb-6 flex justify-center">
                  <div className="rounded-full bg-primary/10 p-5 text-primary">
                    <CheckCircle2 size={40} />
                  </div>
                </div>
                <h2 className="font-display text-2xl text-primary">Tudo pronto para começar!</h2>
                <p className="mt-4 text-muted-foreground">
                  Analisamos suas informações e seu plano de 21 dias está sendo gerado.
                </p>

                <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card">
                  <div className="bg-primary/5 p-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-lg bg-primary/10">
                        {plant.photo ? <img src={plant.photo} alt={plant.name} className="h-full w-full object-cover" /> : <Flower2 className="m-2 text-primary/40" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-primary">{plant.name || "Sua Orquídea"}</div>
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{plant.species || "Espécie não informada"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 text-left">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent">Resumo do Diagnóstico</div>
                    <div className="flex flex-wrap gap-2">
                      {[...diagnosis.roots, ...diagnosis.leaves, ...diagnosis.environment].slice(0, 4).map((tag, i) => (
                        <span key={i} className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-foreground/70">
                          {tag}
                        </span>
                      ))}
                      {[...diagnosis.roots, ...diagnosis.leaves, ...diagnosis.environment].length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{ [...diagnosis.roots, ...diagnosis.leaves, ...diagnosis.environment].length - 4} mais</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
 
      <style dangerouslySetInnerHTML={{ __html: `
        .selection\\:bg-accent\\/20 ::selection { background-color: rgba(var(--accent), 0.2); }
      `}} />

      {/* Footer Navigation */}
      <footer className="border-t border-border bg-background p-6">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <button
            onClick={prevStep}
            disabled={step === "welcome"}
            className="flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-0"
          >
            <ChevronLeft size={18} /> Voltar
          </button>
          
          <button
            onClick={nextStep}
            disabled={step === "plant_info" && !plant.name}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-50"
          >
            {step === "summary" ? "Começar Protocolo" : "Próximo"}
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "50%" : "-50%",
    opacity: 0,
    scale: 0.98,
    filter: "blur(4px)"
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      x: { type: "spring", stiffness: 400, damping: 40 },
      opacity: { duration: 0.25 },
      scale: { duration: 0.3 },
      filter: { duration: 0.2 }
    }
  } as any,
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? "50%" : "-50%",
    opacity: 0,
    scale: 0.98,
    filter: "blur(4px)",
    transition: {
      x: { type: "spring", stiffness: 400, damping: 40 },
      opacity: { duration: 0.2 },
      scale: { duration: 0.3 },
      filter: { duration: 0.2 }
    }
  } as any)
};

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlantaefertLogo } from "@/components/PlantaefertLogo";
import {
  Sprout,
  Stethoscope,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  Award,
  Leaf,
  Clock,
  Flower2,
  Camera,
  AlertTriangle,
  Info,
  ChevronLeft,
  X,
} from "lucide-react";
import {
  CATEGORY_LABEL,
  DIAGNOSIS_OPTIONS,
  
  computeDiagnosisResult,
  type DiagnosisCategory,
  type DiagnosisGuidance,
  type Classification,
} from "@/lib/diagnosis-matrix";

export function OfficialEditorialFlowComponent() {
  const [step, setStep] = useState<number>(1); // 1: Cadastro, 2: Diagnostico (5 Abas), 3: Resultado

  // ---------------------------------------------------------------------------
  // PASSO 1: CAMPOS DO CADASTRO DA ORQUÍDEA
  // ---------------------------------------------------------------------------
  const [plantName, setPlantName] = useState<string>("Minha Phalaenopsis");
  const [species, setSpecies] = useState<string>("Phalaenopsis");
  const [dontKnowSpecies, setDontKnowSpecies] = useState<boolean>(false);
  const [location, setLocation] = useState<string>("Varanda");
  const [potType, setPotType] = useState<string>("Vaso plástico transparente");
  const [substrateType, setSubstrateType] = useState<string>("Casca de pinus");
  const [primaryDifficulty, setPrimaryDifficulty] = useState<string>("Folhas caídas ou enrugadas");
  const [plantPhoto, setPlantPhoto] = useState<string | null>(null);
  const [isSavingCadastro, setIsSavingCadastro] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // PASSO 2: DIAGNÓSTICO GUIADO (5 ÁREAS)
  // ---------------------------------------------------------------------------
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<DiagnosisCategory, string[]>>({
    roots: ["Raízes secas ou ocas"],
    leaves: ["Folhas amareladas"],
    environment: ["Boa luminosidade indireta"],
    potAndSubstrate: ["Vaso com furos suficientes"],
    wateringAndRoutine: ["Rego sempre em dias fixos"],
  });

  const categoriesOrder: DiagnosisCategory[] = [
    "roots",
    "leaves",
    "environment",
    "potAndSubstrate",
    "wateringAndRoutine",
  ];

  const resetAll = () => {
    setStep(1);
    setCurrentCategoryIndex(0);
    setPlantName("Minha Phalaenopsis");
    setSpecies("Phalaenopsis");
    setDontKnowSpecies(false);
    setLocation("Varanda");
    setPotType("Vaso plástico transparente");
    setSubstrateType("Casca de pinus");
    setPrimaryDifficulty("Folhas caídas ou enrugadas");
    setPlantPhoto(null);
    setSelectedAnswers({
      roots: ["Raízes secas ou ocas"],
      leaves: ["Folhas amareladas"],
      environment: ["Boa luminosidade indireta"],
      potAndSubstrate: ["Vaso com furos suficientes"],
      wateringAndRoutine: ["Rego sempre em dias fixos"],
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPlantPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAnswer = (catKey: DiagnosisCategory, answerText: string) => {
    setSelectedAnswers((prev) => {
      const currentList = prev[catKey] || [];
      const exists = currentList.includes(answerText);
      const nextList = exists
        ? currentList.filter((a) => a !== answerText)
        : [...currentList, answerText];
      return { ...prev, [catKey]: nextList };
    });
  };

  // Compute Diagnosis Result using matrix
  const rawResult = computeDiagnosisResult(selectedAnswers, 0);
  const resultData = {
    priorityItems: rawResult.priorities,
    adjustmentItems: rawResult.adjustments,
    favorableItems: rawResult.favorable,
    insufficientItems: rawResult.insufficientInformation,
    trackingPoints: rawResult.trackingPoints,
    healthScore: rawResult.healthScore,
    healthStatus: rawResult.healthStatus,
  };
  const totalObservedCount = Object.values(selectedAnswers).reduce(
    (sum, list) => sum + list.length,
    0
  );

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#173D32] font-sans selection:bg-[#155F4E]/10 pb-16">
      {/* Top Demo Header */}
      <header className="sticky top-0 z-50 border-b border-[#155F4E]/15 bg-[#F8F5EE]/95 backdrop-blur-md px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlantaefertLogo className="h-8 w-auto object-contain" />
              <span className="rounded-full bg-[#155F4E]/10 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#155F4E]">
                Inventário Editorial 3 Passos
              </span>
            </div>
            <button
              onClick={resetAll}
              className="flex items-center gap-1 text-[12px] font-bold text-[#D35400] hover:underline"
            >
              <RotateCcw size={14} /> Reiniciar
            </button>
          </div>

          {/* Quick Step Switcher */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#155F4E]/10 p-1 text-[10.5px] font-bold">
            <button
              onClick={() => setStep(1)}
              className={`rounded-lg py-1.5 text-center transition-all ${
                step === 1 ? "bg-[#155F4E] text-white font-extrabold shadow-xs" : "text-[#173D32]/70 hover:text-[#173D32]"
              }`}
            >
              Passo 1 (Cadastro)
            </button>
            <button
              onClick={() => setStep(2)}
              className={`rounded-lg py-1.5 text-center transition-all ${
                step === 2 ? "bg-[#155F4E] text-white font-extrabold shadow-xs" : "text-[#173D32]/70 hover:text-[#173D32]"
              }`}
            >
              Passo 2 (Exame)
            </button>
            <button
              onClick={() => setStep(3)}
              className={`rounded-lg py-1.5 text-center transition-all ${
                step === 3 ? "bg-[#D35400] text-white font-extrabold shadow-xs" : "text-[#173D32]/70 hover:text-[#173D32]"
              }`}
            >
              Passo 3 (Veredito)
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto min-h-[calc(100vh-140px)] max-w-[460px] px-4 py-6">
        <AnimatePresence mode="wait">
          {/* =========================================================================
             PASSO 1 DE 3 — CADASTRO DA ORQUÍDEA
             ========================================================================= */}
          {step === 1 && (
            <motion.div
              key="passo-1-cadastro"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border border-[#155F4E]/15 bg-white p-6 shadow-xl space-y-5"
            >
              {/* Step Badge & Header */}
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D35400]">
                  Passo 1 de 3
                </span>
                <h1 className="font-display text-2xl text-[#173D32]">Cadastro da Orquídea</h1>
                <p className="text-xs text-[#173D32]/75">
                  Conte um pouco sobre sua planta para personalizar o acompanhamento.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsSavingCadastro(true);
                  setTimeout(() => {
                    setIsSavingCadastro(false);
                    setStep(2);
                  }, 400);
                }}
                className="space-y-4 text-xs"
              >
                {/* 4.1 Nome da planta (obrigatório) */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#173D32] mb-1">
                    Nome da planta *
                  </label>
                  <input
                    type="text"
                    required
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    placeholder="Ex.: Minha Phalaenopsis"
                    className="w-full rounded-2xl border border-[#155F4E]/20 bg-[#F8F5EE]/60 px-4 py-3 text-sm font-semibold text-[#173D32] focus:border-[#155F4E] focus:bg-white focus:outline-none"
                  />
                  <p className="mt-1 text-[10.5px] text-[#173D32]/60">
                    Utilizado para personalizar as notificações e orientações.
                  </p>
                </div>

                {/* 4.2 Espécie (opcional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold uppercase tracking-wider text-[#173D32]">
                      Espécie — opcional
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[#155F4E]">
                      <input
                        type="checkbox"
                        checked={dontKnowSpecies}
                        onChange={(e) => {
                          setDontKnowSpecies(e.target.checked);
                          if (e.target.checked) setSpecies("Não sei a espécie");
                        }}
                        className="rounded border-[#155F4E] text-[#155F4E]"
                      />
                      <span>Não sei a espécie</span>
                    </label>
                  </div>

                  {!dontKnowSpecies && (
                    <input
                      type="text"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                      placeholder="Ex.: Phalaenopsis, Cattleya, Dendrobium..."
                      className="w-full rounded-2xl border border-[#155F4E]/20 bg-[#F8F5EE]/60 px-4 py-3 text-sm font-semibold text-[#173D32] focus:border-[#155F4E] focus:bg-white focus:outline-none"
                    />
                  )}
                </div>

                {/* 4.3 Local de cultivo */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#173D32] mb-1.5">
                    Local de cultivo
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 font-semibold">
                    {["Varanda", "Janela interna", "Jardim externo", "Estufa", "Outro"].map((loc) => (
                      <button
                        type="button"
                        key={loc}
                        onClick={() => setLocation(loc)}
                        className={`rounded-xl border p-2.5 text-left transition-all ${
                          location === loc
                            ? "border-[#155F4E] bg-[#155F4E]/10 text-[#155F4E] font-bold shadow-xs"
                            : "border-[#155F4E]/15 bg-white text-[#173D32]/70 hover:border-[#155F4E]/30"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4.4 Tipo de vaso */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#173D32] mb-1.5">
                    Tipo de vaso
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 font-semibold">
                    {[
                      "Vaso plástico transparente",
                      "Vaso plástico comum",
                      "Vaso de barro",
                      "Vaso de madeira",
                      "Cachepot",
                      "Outro",
                    ].map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPotType(p)}
                        className={`rounded-xl border p-2.5 text-left text-[11px] transition-all ${
                          potType === p
                            ? "border-[#155F4E] bg-[#155F4E]/10 text-[#155F4E] font-bold shadow-xs"
                            : "border-[#155F4E]/15 bg-white text-[#173D32]/70 hover:border-[#155F4E]/30"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4.5 Tipo de substrato */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#173D32] mb-1.5">
                    Tipo de substrato
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 font-semibold">
                    {[
                      "Casca de pinus",
                      "Fibra de coco",
                      "Musgo sphagnum",
                      "Mistura",
                      "Não sei",
                      "Outro",
                    ].map((sub) => (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => setSubstrateType(sub)}
                        className={`rounded-xl border p-2.5 text-left text-[11px] transition-all ${
                          substrateType === sub
                            ? "border-[#155F4E] bg-[#155F4E]/10 text-[#155F4E] font-bold shadow-xs"
                            : "border-[#155F4E]/15 bg-white text-[#173D32]/70 hover:border-[#155F4E]/30"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4.6 Principal dificuldade */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#173D32] mb-1.5">
                    Principal dificuldade
                  </label>
                  <div className="space-y-1.5 font-semibold">
                    {[
                      "Não floresce",
                      "Folhas caídas ou enrugadas",
                      "Raízes fracas",
                      "Manchas nas folhas",
                      "Não sei o que fazer",
                      "Outra",
                    ].map((diff) => (
                      <button
                        type="button"
                        key={diff}
                        onClick={() => setPrimaryDifficulty(diff)}
                        className={`w-full rounded-xl border p-3 text-left transition-all ${
                          primaryDifficulty === diff
                            ? "border-[#D35400] bg-[#D35400]/10 text-[#D35400] font-bold shadow-xs"
                            : "border-[#155F4E]/15 bg-white text-[#173D32]/70 hover:border-[#D35400]/30"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4.7 Foto atual da planta */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#173D32] mb-1.5">
                    Foto atual da planta
                  </label>

                  {plantPhoto ? (
                    <div className="relative rounded-2xl overflow-hidden border border-[#155F4E]/20">
                      <img src={plantPhoto} alt="Foto da planta" className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPlantPhoto(null)}
                        className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#155F4E]/25 bg-[#F8F5EE]/50 p-5 cursor-pointer hover:border-[#155F4E]">
                      <Camera size={24} className="text-[#155F4E]" />
                      <span className="font-bold text-[#155F4E]">Enviar foto</span>
                      <span className="text-[10px] text-[#173D32]/60">
                        Salva apenas no seu navegador
                      </span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Final Button */}
                <button
                  type="submit"
                  disabled={isSavingCadastro}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#155F4E] py-4 text-xs font-extrabold uppercase tracking-wider text-white shadow-xl shadow-[#155F4E]/25 transition-all hover:bg-[#10483b] active:scale-[0.98]"
                >
                  <span>{isSavingCadastro ? "Salvando cadastro..." : "Concluir cadastro"}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </motion.div>
          )}

          {/* =========================================================================
             PASSO 2 DE 3 — DIAGNÓSTICO GUIADO (5 ÁREAS COM AS 55 OPÇÕES OFICIAIS)
             ========================================================================= */}
          {step === 2 && (
            <motion.div
              key={`passo-2-diag-${currentCategoryIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border border-[#155F4E]/15 bg-white p-6 shadow-xl space-y-4"
            >
              {/* Step Header */}
              <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#D35400]">
                <span>Passo 2 de 3 • Área {currentCategoryIndex + 1} de 5</span>
                <span>{(currentCategoryIndex + 1) * 20}%</span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#155F4E]/10">
                <div
                  className="h-full bg-[#D35400] transition-all duration-300"
                  style={{ width: `${(currentCategoryIndex + 1) * 20}%` }}
                />
              </div>

              <div>
                <h2 className="font-display text-2xl text-[#173D32]">Diagnóstico Guiado</h2>
                <p className="mt-1 text-xs text-[#173D32]/75 font-semibold">
                  Marque tudo que você observa em "{plantName}".
                </p>
                <p className="mt-0.5 text-[11px] text-[#173D32]/60">
                  Selecione todas as alternativas que descrevem sua observação atual.
                </p>
              </div>

              {/* Educational Warning Alert */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3 text-[11px] font-medium text-amber-900 flex items-start gap-2">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Um sinal isolado não fecha um diagnóstico. Estas escolhas orientam a observação nos próximos dias.
                </span>
              </div>

              {/* Active Category Title */}
              <div className="flex items-center gap-2.5 pt-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#155F4E]/10 text-[#155F4E]">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#155F4E]">
                    Área {currentCategoryIndex + 1}
                  </span>
                  <h3 className="font-display text-lg text-[#173D32]">
                    {CATEGORY_LABEL[categoriesOrder[currentCategoryIndex]]}
                  </h3>
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {DIAGNOSIS_OPTIONS[categoriesOrder[currentCategoryIndex]].map((optText) => {
                  const catKey = categoriesOrder[currentCategoryIndex];
                  const currentSelected = selectedAnswers[catKey] || [];
                  const isChecked = currentSelected.includes(optText);

                  return (
                    <button
                      key={optText}
                      type="button"
                      onClick={() => toggleAnswer(catKey, optText)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-semibold transition-all ${
                        isChecked
                          ? "border-[#155F4E] bg-[#155F4E]/10 text-[#155F4E] font-bold shadow-xs"
                          : "border-[#155F4E]/15 bg-white text-[#173D32]/80 hover:border-[#155F4E]/30"
                      }`}
                    >
                      <span>{optText}</span>
                      <div
                        className={`grid h-5 w-5 place-items-center rounded-full border transition-all ${
                          isChecked ? "border-[#155F4E] bg-[#155F4E] text-white" : "border-[#173D32]/30"
                        }`}
                      >
                        {isChecked && <CheckCircle2 size={14} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Category Footer Navigation */}
              <div className="flex items-center gap-2 pt-3 border-t border-[#155F4E]/10">
                <button
                  type="button"
                  onClick={() => {
                    if (currentCategoryIndex > 0) {
                      setCurrentCategoryIndex(currentCategoryIndex - 1);
                    } else {
                      setStep(1); // Return to Cadastro
                    }
                  }}
                  className="flex items-center gap-1 rounded-2xl border border-[#155F4E]/20 px-4 py-3 text-xs font-bold text-[#173D32]/70 hover:bg-[#155F4E]/10"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentCategoryIndex < 4) {
                      setCurrentCategoryIndex(currentCategoryIndex + 1);
                    } else {
                      setStep(3); // Go to Result
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#155F4E] py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-[#155F4E]/20 hover:bg-[#10483b]"
                >
                  <span>
                    {currentCategoryIndex === 4 ? "Gerar Resultado Personalizado" : "Próxima Área"}
                  </span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* =========================================================================
             PASSO 3 DE 3 — RESULTADO PERSONALIZADO (VEREDITO POR CATEGORIAS & ACCONPANHAMENTO)
             ========================================================================= */}
          {step === 3 && (
            <motion.div
              key="passo-3-resultado"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Header Result Card */}
              <div className="rounded-3xl border border-[#155F4E]/15 bg-white p-6 shadow-xl text-center space-y-3">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-[#155F4E] text-white shadow-lg shadow-[#155F4E]/20">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D35400]">
                    Passo 3 de 3
                  </span>
                  <h1 className="font-display text-2xl text-[#173D32]">Seu Resultado Personalizado</h1>
                  <p className="mt-1 text-xs font-bold text-[#155F4E]">
                    Baseado nas suas observações sobre "{plantName}".
                  </p>
                  <p className="mt-1 text-[11px] text-[#173D32]/70">
                    {totalObservedCount} sinais observados. Este resultado orienta o acompanhamento e não é um diagnóstico definitivo.
                  </p>
                </div>
              </div>

              {/* VEREDITO / NÍVEL DE SAÚDE */}
              <div className="rounded-3xl border-2 border-[#D35400]/40 bg-white p-5 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#D35400]">
                      Veredito
                    </div>
                    <div className="mt-1 font-display text-lg leading-tight text-[#173D32]">
                      {resultData.healthStatus.label}
                    </div>
                    <p className="mt-1 text-[11px] text-[#173D32]/70">
                      {resultData.healthStatus.message}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#155F4E]/70">
                      Nível de saúde
                    </div>
                    <div className="font-display text-4xl leading-none text-[#155F4E]">
                      {resultData.healthScore}
                      <span className="text-lg text-[#155F4E]/60">/100</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#155F4E]/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#D35400] to-[#155F4E] transition-all"
                    style={{ width: `${resultData.healthScore}%` }}
                  />
                </div>
              </div>

              {/* 18.1 PONTOS QUE MERECEM ATENÇÃO PRÓXIMA (PRIORITY) */}
              {resultData.priorityItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#D35400]">
                    <AlertTriangle size={16} />
                    <span>Pontos que Merecem Atenção Próxima ({resultData.priorityItems.length})</span>
                  </div>

                  {resultData.priorityItems.map((item) => (
                    <GuidanceResultCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {/* 18.2 AJUSTES RECOMENDADOS (ADJUSTMENT) */}
              {resultData.adjustmentItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#155F4E]">
                    <Stethoscope size={16} />
                    <span>Ajustes Recomendados ({resultData.adjustmentItems.length})</span>
                  </div>

                  {resultData.adjustmentItems.map((item) => (
                    <GuidanceResultCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {/* 18.3 SINAIS FAVORÁVEIS (FAVORABLE) */}
              {resultData.favorableItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#155F4E]">
                    <Sparkles size={16} />
                    <span>Sinais Favoráveis ({resultData.favorableItems.length})</span>
                  </div>

                  {resultData.favorableItems.map((item) => (
                    <GuidanceResultCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {/* 18.4 AINDA NÃO OBSERVADO (INSUFFICIENT) */}
              {resultData.insufficientItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#173D32]/70">
                    <Info size={16} />
                    <span>Ainda Não Observado ({resultData.insufficientItems.length})</span>
                  </div>

                  {resultData.insufficientItems.map((item) => (
                    <GuidanceResultCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {/* 20. PONTOS PARA ACOMPANHAR NO PLANO DE 21 DIAS */}
              <div className="rounded-3xl border-2 border-[#155F4E]/30 bg-gradient-to-br from-[#155F4E]/10 to-[#155F4E]/5 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#155F4E]">
                  <Clock size={16} className="text-[#D35400]" />
                  <span>Pontos para Acompanhar no Plano de 21 Dias</span>
                </div>

                <p className="text-[11.5px] text-[#173D32]/80 leading-relaxed">
                  Estes são os principais focos selecionados pelo sistema para guiar seus lembretes e checklists semanais:
                </p>

                <div className="space-y-2">
                  {resultData.trackingPoints.slice(0, 5).map((track: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-xl bg-white p-3 text-xs font-bold text-[#173D32] border border-[#155F4E]/15"
                    >
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#155F4E] text-[10px] text-white">
                        {i + 1}
                      </span>
                      <span>{track}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Kit Prescriptions Card (500ml Pronto Uso - Sem Diluição) */}
              <div className="rounded-3xl border-2 border-[#155F4E] bg-white p-5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#155F4E]">
                    <ShieldCheck size={18} className="text-[#D35400]" />
                    <span>Prescrição do Kit Método 2 Passos</span>
                  </div>
                  <span className="rounded-full bg-[#155F4E] px-2.5 py-0.5 text-[9.5px] font-extrabold text-white uppercase">
                    500ml Pronto Uso
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="rounded-2xl bg-[#F8F5EE] p-3.5 border border-[#155F4E]/15 space-y-1">
                    <div className="flex items-center justify-between font-bold text-[#155F4E]">
                      <span className="flex items-center gap-1.5">
                        <Sprout size={16} className="text-[#D35400]" /> 1º Passo: Enraizador Orgânico 500ml
                      </span>
                      <span className="text-[10px] bg-[#D35400]/10 text-[#D35400] px-2 py-0.5 rounded font-extrabold">
                        Pronto Uso
                      </span>
                    </div>
                    <p className="text-[11px] text-[#173D32]/80">
                      <strong>Ácidos Húmicos, Fúlvicos e Algas Marinhas</strong>. Borrifar 1x por semana nas raízes e substrato (sem diluir).
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8F5EE] p-3.5 border border-[#155F4E]/15 space-y-1">
                    <div className="flex items-center justify-between font-bold text-[#155F4E]">
                      <span className="flex items-center gap-1.5">
                        <Leaf size={16} className="text-[#155F4E]" /> 2º Passo: Bokashi Líquido 500ml
                      </span>
                      <span className="text-[10px] bg-[#155F4E]/10 text-[#155F4E] px-2 py-0.5 rounded font-extrabold">
                        Pronto Uso
                      </span>
                    </div>
                    <p className="text-[11px] text-[#173D32]/80">
                      Nutrição biológica completa. Aplicar em seguida nas raízes, folhas e substrato (sem diluir).
                    </p>
                  </div>
                </div>
              </div>

              {/* 21. AVISO FINAL DO RESULTADO */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-center text-xs font-medium text-amber-900">
                <p>
                  ⚠️ Um sinal isolado não fecha um diagnóstico. Utilize estas orientações como apoio à observação.
                </p>
              </div>

              {/* 22. BOTÕES DO RESULTADO */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-2xl border border-[#155F4E]/30 bg-white py-3.5 text-xs font-extrabold uppercase text-[#173D32] shadow-sm hover:bg-[#F8F5EE]"
                >
                  ↺ Revisar respostas
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Plano de 21 Dias liberado para "${plantName}"!`)}
                  className="rounded-2xl bg-[#155F4E] py-3.5 text-xs font-extrabold uppercase text-white shadow-xl hover:bg-[#10483b]"
                >
                  Ir para meu plano ➔
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* =========================================================================
   GUIDANCE RESULT CARD (RENDER INDIVIDUAL EDITORIAL CARDS)
   ========================================================================= */
function GuidanceResultCard({ item }: { item: DiagnosisGuidance }) {
  const getBadgeStyle = (classification: Classification) => {
    switch (classification) {
      case "priority":
        return "border-[#D35400]/30 bg-[#D35400]/10 text-[#D35400]";
      case "adjustment":
        return "border-[#155F4E]/20 bg-[#155F4E]/10 text-[#155F4E]";
      case "favorable":
        return "border-emerald-300 bg-emerald-50 text-emerald-800";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700";
    }
  };

  return (
    <div className="rounded-2xl border border-[#155F4E]/15 bg-white p-4 shadow-sm space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#155F4E]">
          {CATEGORY_LABEL[item.category]} · {item.answer}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider border ${getBadgeStyle(
            item.classification
          )}`}
        >
          {item.classification === "priority"
            ? "Atenção Próxima"
            : item.classification === "adjustment"
            ? "Ajuste Recomendado"
            : item.classification === "favorable"
            ? "Sinal Favorável"
            : "Ainda Não Observado"}
        </span>
      </div>

      <h3 className="font-display text-base text-[#173D32] font-bold">{item.title}</h3>

      {/* Explicação */}
      <div className="text-[11.5px] text-[#173D32]/80 leading-relaxed">
        <strong>O que representa:</strong> {item.explanation}
      </div>

      {/* Ação */}
      <div className="rounded-xl bg-[#F8F5EE] p-3 text-[11.5px] text-[#173D32] space-y-1">
        <div>
          <strong className="text-[#155F4E]">O que fazer:</strong> {item.action}
        </div>
        {item.avoid && (
          <div className="text-[#D35400]">
            <strong>Evite:</strong> {item.avoid}
          </div>
        )}
      </div>

      {/* Acompanhamento */}
      {item.tracking && item.tracking.length > 0 && (
        <div className="text-[11px] text-[#173D32]/75">
          <strong>Acompanhe nos próximos dias:</strong> {item.tracking.join(" • ")}
        </div>
      )}

      {/* Alerta */}
      {item.warning && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] font-bold text-red-900 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-red-600 shrink-0" />
          <span>{item.warning}</span>
        </div>
      )}
    </div>
  );
}

// 21-day orchid care protocol: https://guia02.lovable.app/inicio
// Consegue fazer uma auditoria completa no site?
import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthDestination } from "@/lib/auth-destination";
import {
  ChevronRight,
  ChevronDown,
  LogIn,
  Flower2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Star,
  HelpCircle,
  Smartphone,
  PackageCheck,
  ShieldCheck,
  ArrowRight,
  Award,
  Leaf,
  Sprout,
  Bug,
  SunMedium,
  Ban,
  Heart,
  Droplets
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import welcomeOrchid from "@/assets/hero-plantaefert.jpg";
import kitMetodo from "@/assets/kit-metodo-app.jpg";
import { PlantaefertLogo } from "@/components/PlantaefertLogo";
import { useAuthBootstrap } from "@/hooks/use-auth-bootstrap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlantaeFert — Guia Prático para Orquídeas Floridas em 21 Dias" },
      {
        name: "description",
        content:
          "Método de 2 Passos + protocolo guiado de 21 dias para diagnosticar, enraizar e nutrir sua orquídea. Comece grátis.",
      },
      { property: "og:title", content: "PlantaeFert — Guia Prático para Orquídeas Floridas em 21 Dias" },
      {
        property: "og:description",
        content:
          "Método de 2 Passos + protocolo guiado de 21 dias para diagnosticar, enraizar e nutrir sua orquídea. Comece grátis.",
      },
    ],
    links: [
      { rel: "preload", as: "image", href: welcomeOrchid, fetchpriority: "high" },
    ],
  }),
  component: HomePage,
});

const ETAPAS = [
  {
    n: "01",
    title: "Diagnóstico",
    subtitle: "Sinal de Alerta",
    body: "Identifique se sua orquídea está sem flores, com folhas amareladas ou raízes secas em menos de 2 minutos.",
    isAlert: true,
  },
  {
    n: "02",
    title: "Enraizamento Orgânico",
    subtitle: "Passo I • 500ml Pronto Uso",
    body: "Fortaleça e multiplique as raízes com o Enraizador Orgânico (Ácidos Húmicos, Fúlvicos e Algas Marinhas).",
    isAlert: false,
  },
  {
    n: "03",
    title: "Nutrição Bokashi",
    subtitle: "Passo II • 500ml Pronto Uso",
    body: "Nutra raízes e folhas com o Bokashi Líquido Orquídeas para estimular o crescimento saudável e a floração.",
    isAlert: false,
  },
  {
    n: "04",
    title: "Acompanhamento Guiado",
    subtitle: "Diário de 21 Dias",
    body: "Siga as notificações semanais, registe fotos da evolução e garanta que sua orquídea floresça com força.",
    isAlert: false,
  },
];

const SINTOMAS = [
  {
    id: "folhas_amarelas",
    iconComponent: Leaf,
    title: "Folhas Amarelas ou Moles",
    tag: "Alerta de Nutrição",
    desc: "Sinal frequente de desequilíbrio nutricional ou raízes comprometidas.",
    recompensa: "Requer o Passo I (Enraizador Forte) para restaurar a absorção radicular antes da adubação.",
    actionText: "Começar Resgate da Planta",
  },
  {
    id: "sem_flores",
    iconComponent: Flower2,
    title: "Não Floresce há Meses",
    tag: "Falta de Energia",
    desc: "A planta não acumulou energia suficiente nas raízes para emitir hastes florais.",
    recompensa: "Requer o Passo II (Bokashi Premium) para indução floral equilibrada em 21 dias.",
    actionText: "Ativar Indução Floral",
  },
  {
    id: "raizes_secas",
    iconComponent: Sprout,
    title: "Raízes Secas ou Podres",
    tag: "Urgência Radicular",
    desc: "Substrato compactado ou excesso de água sem oxigenação das raízes.",
    recompensa: "Protocolo de Emergência: Limpeza de raízes + Dose de resgate com Enraizador.",
    actionText: "Ver Protocolo de Raízes",
  },
  {
    id: "manchas_pragas",
    iconComponent: Bug,
    title: "Manchas ou Pragas",
    tag: "Baixa Imunidade",
    desc: "Cochonilhas e fungos atacam orquídeas fragilizadas por nutrição incorreta.",
    recompensa: "Guia de Limpeza Orgânica + Imunização organomineral acelerada.",
    actionText: "Ver Imunização Orgânica",
  },
];

const DEPOIMENTOS = [
  {
    nome: "Dra. Maria Helena",
    local: "São Paulo, SP",
    texto: "Minha Phalaenopsis estava sem dar flor há 2 anos e com folhas moles. No dia 12 do protocolo já surgiram 3 raízes verdes novas! O aplicativo facilita muito o dia a dia.",
    orquidea: "Phalaenopsis",
    estrelas: 5,
  },
  {
    nome: "Carlos Eduardo",
    local: "Belo Horizonte, MG",
    texto: "O kit físico com o Enraizador e o Bokashi junto com os lembretes do aplicativo são perfeitos. Nunca mais errei o dia de adubar ou regar.",
    orquidea: "Dendrobium Nobile",
    estrelas: 5,
  },
  {
    nome: "Sônia Regina",
    local: "Rio de Janeiro, RJ",
    texto: "Já tinha perdido várias orquídeas por excesso de água. O diagnóstico do aplicativo me mostrou exatamente o que fazer na primeira semana.",
    orquidea: "Cattleya Labiata",
    estrelas: 5,
  },
];

const FAQS = [
  {
    pergunta: "O método funciona para qualquer espécie de orquídea?",
    resposta: "Sim! O Método de 2 Passos (Enraizador Forte + Bokashi Orquídeas) foi formulado especificamente para as principais espécies cultivadas no Brasil, incluindo Phalaenopsis, Dendrobium, Cattleya, Vanda, Oncidium e Paphiopedilum."
  },
  {
    pergunta: "Como o aplicativo se integra com os adubos do Kit?",
    resposta: "No aplicativo você recebe um cronograma diário personalizado de 21 dias. Ele avisa o momento exato de aplicar o Enraizador Forte e o Bokashi Premium, ajustado para o estado atual da sua planta, além de registrar a evolução em fotos."
  },
  {
    pergunta: "Nunca cuidei de orquídeas antes. Consigo acompanhar?",
    resposta: "Com certeza! Todo o protocolo foi feito para ser simples, direto e prático. Você não precisa decorar receitas ou improvisar rotinas — basta dedicar 2 minutos por dia para checar as orientações do app."
  },
  {
    pergunta: "Quanto tempo demora para ver os primeiros resultados?",
    resposta: "Entre 7 e 14 dias a maioria dos cultivadores observa o surgimento de novas pontas de raízes verdes ativas e recuperação no tom de verde das folhas com o uso do Enraizador Forte."
  },
  {
    pergunta: "Como recebo o acesso ao aplicativo de 21 dias?",
    resposta: "O acesso é liberado instantaneamente! Você pode criar sua conta gratuitamente aqui no site e acessar o protocolo direto do celular ou computador."
  }
];

function HomePage() {
  const { user } = useAuthBootstrap();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  const [selectedSintomaId, setSelectedSintomaId] = useState("folhas_amarelas");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const sintomaAtual = SINTOMAS.find((s) => s.id === selectedSintomaId) || SINTOMAS[0];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session || redirectedRef.current) return;
      const hasOAuthHash = typeof window !== "undefined" && /access_token|code=/.test(window.location.hash + window.location.search);
      const justSignedIn = sessionStorage.getItem("pf_oauth_pending") === "1";
      if (!hasOAuthHash && !justSignedIn) return;
      redirectedRef.current = true;
      sessionStorage.removeItem("pf_oauth_pending");
      const dest = await resolvePostAuthDestination(session.user.id);
      navigate({ to: dest, replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#155F4E] selection:bg-[#D35400]/20 selection:text-[#155F4E]">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[#155F4E]/10 bg-[#F8F5EE]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-20 md:px-10">
          <Link to="/" className="flex shrink-0 items-center">
            <PlantaefertLogo className="h-9 md:h-11 w-auto object-contain transition-transform hover:scale-105" />
          </Link>
          <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-semibold sm:gap-6">
            <Link to={isLoggedIn ? "/metodo" : "/auth"} className="hidden text-[#155F4E]/70 hover:text-[#D35400] transition sm:inline">
              Método
            </Link>
            <Link to={isLoggedIn ? "/aprender" : "/auth"} className="hidden text-[#155F4E]/70 hover:text-[#D35400] transition sm:inline">
              Aprender
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  to="/minha-orquidea"
                  className="hidden items-center gap-1.5 text-[#155F4E]/70 hover:text-[#D35400] transition sm:inline-flex"
                >
                  <Flower2 className="h-3.5 w-3.5" />
                  Minha orquídea
                </Link>
                <Link
                  to="/inicio"
                  className="inline-flex items-center gap-1.5 bg-[#9C2F6F] px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#F8F5EE] shadow-sm shadow-[#9C2F6F]/20 transition-colors duration-300 hover:bg-[#85275E] sm:px-4"
                >
                  Continuar
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1.5 text-[#155F4E]/80 hover:text-[#D35400] transition"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline sm:inline">Entrar</span>
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1.5 bg-[#9C2F6F] px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#F8F5EE] shadow-sm shadow-[#9C2F6F]/20 transition-colors duration-300 hover:bg-[#85275E] sm:px-4"
                >
                  <span className="hidden sm:inline">Começar grátis</span>
                  <span className="sm:hidden">Começar</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col overflow-hidden lg:flex-row lg:items-stretch lg:min-h-[calc(100vh-4rem)]">
        <div className="absolute top-0 right-0 hidden p-8 z-20 lg:block">
          <span className="text-[10px] tracking-[0.3em] font-semibold text-[#155F4E]/60 uppercase">
            Nutrição &amp; Tecnologia Botânica
          </span>
        </div>

        <div className="z-10 flex w-full items-center p-8 md:p-16 lg:w-1/2 lg:p-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <div className="mb-8 h-px w-20 bg-[#D35400]" />
            <h1 className="mb-10 font-serif text-5xl leading-[0.95] md:text-7xl lg:text-8xl">
              Nutrindo raízes, <br />
              <span className="italic text-[#D35400]">florescendo</span> orquídeas.
            </h1>
            <p className="mb-12 max-w-lg text-lg leading-relaxed text-[#155F4E]/80 md:text-xl">
              O ecossistema completo para salvar e florir sua orquídea: adubação organomineral de alta precisão aliada a um aplicativo guiado de 21 dias.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/auth"
                className="bg-[#9C2F6F] px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-[#F8F5EE] shadow-md shadow-[#9C2F6F]/20 transition-all duration-500 hover:bg-[#85275E] hover:shadow-xl"
              >
                Começar meu plano grátis
              </Link>
              <Link
                to="/auth"
                className="border border-[#155F4E]/20 px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-[#155F4E] transition-all duration-500 hover:bg-[#155F4E] hover:text-[#F8F5EE]"
              >
                Conhecer o Kit + App
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-[#155F4E]/60">
              <span className="flex items-center gap-1.5 font-semibold text-[#D35400]">
                <Star className="h-3.5 w-3.5 fill-[#D35400]" /> 4.9/5
              </span>
              <span>•</span>
              <span>+12.000 Orquídeas Salvas</span>
            </div>
          </motion.div>
        </div>

        <div className="relative w-full bg-[#155F4E]/5 lg:min-h-0 lg:w-1/2">
          <div className="p-6 md:p-12 md:pb-28 lg:p-20 lg:pb-32">
            <div className="relative w-full md:h-full">
              <div className="w-full overflow-hidden border border-[#155F4E]/10 shadow-2xl rounded-2xl">
                <img
                  src={welcomeOrchid}
                  alt="Kit PlantaeFert com Enraizador Forte e Bokashi Orquídeas ao lado de uma orquídea florida"
                  className="h-auto w-full object-cover md:h-full transition-transform duration-700 hover:scale-105"
                  width={1200}
                  height={1600}
                />
              </div>
              <div className="relative mx-auto -mt-8 max-w-sm bg-[#F8F5EE] p-6 shadow-xl md:absolute md:-bottom-20 md:-left-12 md:mt-0 md:p-10 rounded-xl border border-[#155F4E]/10">
                <p className="mb-4 font-serif text-lg italic leading-tight">
                  “A ciência da terra refinada por gerações de cuidado botânico.”
                </p>
                <span className="text-[10px] uppercase tracking-widest opacity-60 font-semibold text-[#D35400]">
                  Est. 1984 &mdash; PlantaeFert Nutrição Vegetal
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mini-Diagnóstico Interativo */}
      <section className="bg-white border-y border-[#155F4E]/10 py-20 px-4 md:px-10">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D35400]/10 text-[#D35400] text-[10px] font-bold uppercase tracking-widest">
              <AlertTriangle className="h-3 w-3" /> Teste Rápido de Saúde
            </span>
            <h2 className="mt-4 font-serif text-3xl md:text-5xl text-[#155F4E]">
              Qual é o sintoma atual da sua orquídea?
            </h2>
            <p className="mt-3 text-sm text-[#155F4E]/70 max-w-xl mx-auto">
              Selecione o estado da sua planta para ver o diagnóstico prévio e o protocolo recomendado:
            </p>
          </motion.div>

          {/* Sintomas Selector Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {SINTOMAS.map((s) => {
              const isSelected = s.id === selectedSintomaId;
              const Icon = s.iconComponent;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSintomaId(s.id)}
                  className={`flex flex-col items-center p-5 rounded-xl border text-center transition-all duration-300 ${
                    isSelected
                      ? "bg-[#D35400] text-white border-[#D35400] shadow-lg scale-[1.02]"
                      : "bg-[#F8F5EE] text-[#155F4E] border-[#155F4E]/15 hover:border-[#D35400]/40 hover:bg-white"
                  }`}
                >
                  <Icon className={`h-8 w-8 mb-3 transition-colors ${isSelected ? "text-white" : "text-[#D35400]"}`} />
                  <span className="text-xs font-bold leading-tight">{s.title}</span>
                </button>
              );
            })}
          </div>

          {/* Resultado do Mini-Diagnóstico */}
          <AnimatePresence mode="wait">
            <motion.div
              key={sintomaAtual.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="p-8 rounded-2xl border border-[#D35400]/20 bg-[#F8F5EE] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8"
            >
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#D35400] text-white">
                    {sintomaAtual.tag}
                  </span>
                  <span className="text-xs font-serif italic text-[#155F4E]/60">Diagnóstico Prévio</span>
                </div>
                <h3 className="font-serif text-2xl font-normal text-[#155F4E] mb-2">
                  {sintomaAtual.title}
                </h3>
                <p className="text-sm text-[#155F4E]/80 mb-4">
                  {sintomaAtual.desc}
                </p>
                <div className="flex items-start gap-2 text-xs font-medium text-[#155F4E] bg-white p-4 rounded-xl border border-[#155F4E]/10">
                  <CheckCircle2 className="h-4 w-4 text-[#D35400] shrink-0 mt-0.5" />
                  <span><strong>Recomendação:</strong> {sintomaAtual.recompensa}</span>
                </div>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                <Link
                  to="/auth"
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#9C2F6F] text-white font-bold text-[10px] uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-[#85275E] transition-colors duration-300 shadow-md shadow-[#9C2F6F]/20"
                >
                  <span>{sintomaAtual.actionText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Jornada de Cuidado */}
      <section className="border-t border-[#155F4E]/5 bg-[#F8F5EE] px-4 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#155F4E]/60">
              Jornada de Cuidado
            </span>
            <h2 className="mt-3 font-serif text-3xl md:text-5xl text-[#155F4E]">
              O Caminho para uma Orquídea Florida
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPAS.map((e, index) => (
              <motion.div
                key={e.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`group flex flex-col justify-between p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  e.isAlert
                    ? "border-[#D35400]/20 bg-[#D35400]/5 hover:bg-[#D35400]/10 hover:border-[#D35400]/40"
                    : "border-[#155F4E]/20 bg-[#155F4E]/5 hover:bg-[#155F4E]/10 hover:border-[#155F4E]/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span
                      className={`font-serif text-2xl italic font-semibold ${
                        e.isAlert ? "text-[#D35400]" : "text-[#155F4E]"
                      }`}
                    >
                      {e.n}.
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        e.isAlert
                          ? "bg-white/60 border-[#D35400]/20 text-[#D35400]"
                          : "bg-white/60 border-[#155F4E]/20 text-[#155F4E]"
                      }`}
                    >
                      {e.subtitle}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-normal mb-3 text-[#155F4E]">
                    {e.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#155F4E]/80">
                    {e.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Método de 2 Passos + Kit Físico + App */}
      <section className="relative overflow-hidden bg-[#155F4E] py-24 text-[#F8F5EE] md:py-32">
        <div className="mb-16 flex flex-col justify-between gap-12 px-8 md:px-24 lg:mb-24 lg:flex-row lg:items-end">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="mb-6 inline-block text-[10px] font-bold uppercase tracking-[0.4em] text-[#D35400] bg-[#D35400]/15 px-4 py-1.5 rounded-full border border-[#D35400]/30 font-mono">
              Kit Físico 2x 500ml Pronto Uso + App Guiado 21 Dias
            </span>
            <h2 className="font-serif text-5xl font-normal leading-none md:text-7xl lg:text-8xl">
              O Método de <br />
              <span className="italic text-[#D35400]">2 Passos</span>
            </h2>
            <p className="mt-4 font-serif italic text-lg text-[#F8F5EE]/90">
              “Mais raízes. Mais força. Mais flores. Mais vida para suas orquídeas.”
            </p>
          </motion.div>
          <div className="lg:pb-4">
            <p className="max-w-xs text-sm uppercase leading-relaxed tracking-wider text-[#F8F5EE]/80 border-l-2 border-[#D35400] pl-4">
              Produtos 100% prontos para uso (sem necessidade de diluir) combinados com notificações semanais no celular.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 border-t border-[#F8F5EE]/10 md:grid-cols-2">
          <div className="group border-b border-[#F8F5EE]/10 transition-colors duration-500 hover:bg-[#F8F5EE]/5 md:border-b-0 md:border-r">
            <div className="relative p-12 lg:p-20">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#F8F5EE]/20 transition-all duration-500 group-hover:border-[#D35400] bg-[#D35400]/10">
                  <span className="font-serif text-xl italic text-[#D35400]">I</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded bg-[#D35400] text-white">
                  500ml Pronto Uso
                </span>
              </div>
              <h4 className="mb-4 font-serif text-3xl md:text-4xl">Enraizador Orgânico</h4>
              <p className="mb-6 text-base leading-relaxed text-[#F8F5EE]/80">
                Formulado com <strong>Ácidos Húmicos, Ácidos Fúlvicos e Extrato de Algas Marinhas</strong>. Fortalece a base da planta, favorecendo raízes mais fortes, ativas e acelerando a recuperação de transplantes.
              </p>
              <div className="space-y-2 text-xs text-[#F8F5EE]/70 mb-6 bg-black/20 p-4 rounded-xl border border-white/10">
                <div>• <strong>Modo de uso:</strong> Aplicar nas raízes e no substrato 1x por semana.</div>
                <div>• <strong>Indicação:</strong> Orquídeas debilitadas, com poucas raízes ou recém-transplantadas.</div>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D35400] font-semibold">
                <Sparkles className="h-4 w-4" /> Passo I — Fortalecimento Radicular
              </div>
            </div>
          </div>
          <div className="group transition-colors duration-500 hover:bg-[#F8F5EE]/5">
            <div className="relative p-12 lg:p-20">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#F8F5EE]/20 transition-all duration-500 group-hover:border-[#D35400] bg-[#D35400]/10">
                  <span className="font-serif text-xl italic text-[#D35400]">II</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded bg-[#155F4E] border border-white/30 text-white">
                  500ml Pronto Uso
                </span>
              </div>
              <h4 className="mb-4 font-serif text-3xl md:text-4xl">Bokashi Líquido Orquídeas</h4>
              <p className="mb-6 text-base leading-relaxed text-[#F8F5EE]/80">
                Nutrição orgânica equilibrada para crescimento vigoroso, manutenção de folhas mais verdes e firmes, e estímulo contínuo à emissão de hastes florais vibrantes.
              </p>
              <div className="space-y-2 text-xs text-[#F8F5EE]/70 mb-6 bg-black/20 p-4 rounded-xl border border-white/10">
                <div>• <strong>Modo de uso:</strong> Aplicar nas raízes, folhas e substrato 1x por semana.</div>
                <div>• <strong>Indicação:</strong> Nutrição de manutenção, crescimento e preparação para floração.</div>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                <Flower2 className="h-4 w-4" /> Passo II — Indução Floral &amp; Nutrição
              </div>
            </div>
          </div>
        </div>

        {/* Kit visual */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto mt-20 max-w-5xl px-8 md:px-24"
        >
          <div className="border border-[#F8F5EE]/15 p-4 rounded-2xl bg-white/5 backdrop-blur-sm">
            <img
              src={kitMetodo}
              alt="Kit Bokashi Líquido Orquídeas 500ml Pronto Uso + Enraizador Orgânico 500ml Pronto Uso PlantaeFert"
              className="mx-auto h-auto w-full max-w-2xl object-cover rounded-xl shadow-2xl"
              loading="lazy"
              width={1024}
              height={1408}
            />
          </div>

          {/* Destaques de uso e segurança */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <SunMedium className="h-6 w-6 text-amber-300 mx-auto mb-2" />
              <span className="font-bold block text-white">Horas Frescas</span>
              <span className="text-[11px] text-[#F8F5EE]/70">Evite sol entre 9h e 16h</span>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <Droplets className="h-6 w-6 text-[#D35400] mx-auto mb-2" />
              <span className="font-bold block text-white">Não Dilui</span>
              <span className="text-[11px] text-[#F8F5EE]/70">Produtos prontos para uso</span>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <Ban className="h-6 w-6 text-rose-300 mx-auto mb-2" />
              <span className="font-bold block text-white">Cuidado com Flores</span>
              <span className="text-[11px] text-[#F8F5EE]/70">Evitar borrifar nas flores</span>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <Heart className="h-6 w-6 text-emerald-300 mx-auto mb-2" />
              <span className="font-bold block text-white">Pet Friendly</span>
              <span className="text-[11px] text-[#F8F5EE]/70">Não tóxico para animais</span>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#9C2F6F] hover:bg-[#85275E] text-white font-bold text-xs uppercase tracking-widest px-10 py-5 rounded-xl shadow-xl shadow-[#9C2F6F]/20 transition-all"
            >
              <span>Garantir Kit 500ml + Acesso ao App</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/opcoes-metodo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 text-[#F8F5EE] font-bold text-xs uppercase tracking-widest px-8 py-5 rounded-xl hover:bg-white/10 transition-all"
            >
              <span>Ver Outras Propostas</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Depoimentos & Prova Social */}
      <section className="bg-white py-24 px-4 md:px-10 border-b border-[#155F4E]/10">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D35400]">
              Prova Social
            </span>
            <h2 className="mt-3 font-serif text-3xl md:text-5xl text-[#155F4E]">
              Quem usa o Método PlantaeFert aprova
            </h2>
            <p className="mt-3 text-sm text-[#155F4E]/70 max-w-lg mx-auto">
              Histórias reais de quem transformou orquídeas fragilizadas em plantas com raízes fortes e florações exuberantes.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {DEPOIMENTOS.map((d, index) => (
              <motion.div
                key={d.nome}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="p-8 rounded-2xl bg-[#F8F5EE] border border-[#155F4E]/10 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(d.estrelas)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#D35400] text-[#D35400]" />
                    ))}
                  </div>
                  <p className="text-sm italic leading-relaxed text-[#155F4E]/90 mb-6">
                    “{d.texto}”
                  </p>
                </div>
                <div className="pt-4 border-t border-[#155F4E]/10 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#155F4E]">{d.nome}</h4>
                    <span className="text-[11px] text-[#155F4E]/60">{d.local}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-1 bg-[#155F4E]/10 text-[#155F4E] rounded">
                    {d.orquidea}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Interativo */}
      <section className="bg-[#F8F5EE] py-24 px-4 md:px-10 border-b border-[#155F4E]/10">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#155F4E]/60">
              Tire Suas Dúvidas
            </span>
            <h2 className="mt-3 font-serif text-3xl md:text-5xl text-[#155F4E]">
              Perguntas Frequentes
            </h2>
          </motion.div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.pergunta}
                  className="rounded-xl border border-[#155F4E]/15 bg-white overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <span className="font-serif text-lg font-medium text-[#155F4E]">
                      {faq.pergunta}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-[#D35400] transition-transform duration-300 shrink-0 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-6 text-sm leading-relaxed text-[#155F4E]/80 border-t border-[#155F4E]/5 pt-4">
                          {faq.resposta}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative flex items-center justify-center overflow-hidden px-8 py-32 text-center md:py-40 bg-white">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
          <span className="select-none font-serif text-[40vw] uppercase leading-none text-[#155F4E]">
            Raiz
          </span>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-4xl"
        >
          <h2 className="mb-12 font-serif text-5xl font-normal leading-tight md:text-7xl lg:text-8xl text-[#155F4E]">
            Pronto para começar seus <span className="italic text-[#D35400]">21 dias</span>?
          </h2>
          <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:gap-8">
            <Link
              to="/auth"
              className="w-full bg-[#9C2F6F] px-14 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F8F5EE] shadow-xl shadow-[#9C2F6F]/20 transition-all hover:scale-105 hover:bg-[#85275E] md:w-auto rounded-xl"
            >
              Começar meu plano grátis
            </Link>
            <Link
              to="/auth"
              className="w-full bg-[#155F4E] px-14 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F8F5EE] transition-all hover:bg-[#155F4E]/90 md:w-auto rounded-xl"
            >
              Ver o método de 2 passos
            </Link>
          </div>
          <p className="mt-12 text-[10px] uppercase tracking-[0.3em] text-[#155F4E]/60 font-semibold">
            Diagnóstico em menos de 2 minutos • Sem cartão de crédito
          </p>
        </motion.div>
      </section>

      <footer className="border-t border-[#155F4E]/10 py-12 text-center bg-[#F8F5EE]">
        <div className="flex flex-col items-center justify-center gap-4">
          <PlantaefertLogo className="h-8 md:h-9 w-auto object-contain opacity-90" />
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#155F4E]/60">
            © {new Date().getFullYear()} PlantaeFert · Método de 2 Passos &amp; Tecnologias Botânicas
          </div>
        </div>
      </footer>
    </div>
  );
}

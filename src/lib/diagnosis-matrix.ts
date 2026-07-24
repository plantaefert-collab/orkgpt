// Matriz de classificação do diagnóstico.
// Cada alternativa possui uma orientação individual, com título, explicação,
// ação sugerida, pontos de acompanhamento e, quando aplicável, alerta.
// Linguagem educativa: não afirmamos doença nem prometemos floração.

export type DiagnosisCategory =
  | "roots"
  | "leaves"
  | "environment"
  | "potAndSubstrate"
  | "wateringAndRoutine";

export type Classification = "favorable" | "adjustment" | "priority" | "insufficient";

export type DiagnosisGuidance = {
  id: string;
  category: DiagnosisCategory;
  answer: string;
  title: string;
  classification: Classification;
  explanation: string;
  action: string;
  tracking: string[];
  avoid?: string;
  warning?: string;
  /**
   * Peso de urgência (maior = mais urgente). Usado para ordenar as prioridades
   * sem depender de casamento por string. Quando ausente, é derivado da
   * classificação em {@link classificationSeverity}.
   */
  severity?: number;
};

export const CATEGORY_LABEL: Record<DiagnosisCategory, string> = {
  roots: "Raízes",
  leaves: "Folhas",
  environment: "Ambiente",
  potAndSubstrate: "Vaso e substrato",
  wateringAndRoutine: "Rega e rotina",
};

// Ordem apresentada na etapa
export const DIAGNOSIS_OPTIONS: Record<DiagnosisCategory, string[]> = {
  roots: [
    "Firmes, verdes ou prateadas",
    "Pontas novas em crescimento",
    "Poucas raízes visíveis",
    "Raízes secas ou ocas",
    "Raízes escuras",
    "Raízes moles",
    "Mau cheiro próximo às raízes ou ao substrato",
    "Não consigo visualizar ou avaliar as raízes",
  ],
  leaves: [
    "Firmes e sem alterações aparentes",
    "Folha nova surgindo",
    "Brotação nova visível",
    "Folhas enrugadas",
    "Folhas murchas ou sem firmeza",
    "Folhas amareladas",
    "Folhas muito escuras",
    "Manchas claras ou áreas com aparência de queimadura",
    "Manchas escuras",
    "Manchas aumentando ou se espalhando",
    "Queda ou deterioração rápida das folhas",
    "Não consigo avaliar o estado das folhas",
  ],
  environment: [
    "Boa luminosidade indireta",
    "Sol direto forte",
    "Local muito escuro",
    "Boa circulação de ar",
    "Ambiente abafado",
    "Vento forte diretamente",
    "Próxima de ar-condicionado ou ventilador",
    "Mudada de lugar recentemente",
    "Movimentada de lugar com frequência",
    "Não consigo avaliar luminosidade ou ventilação",
  ],
  potAndSubstrate: [
    "Vaso com furos suficientes",
    "Água escoa livremente",
    "Substrato solto e arejado",
    "Planta firme no vaso",
    "Água acumulada no pratinho ou cachepot",
    "Vaso permanece molhado por muito tempo",
    "Substrato compactado",
    "Substrato deteriorado ou se desfazendo",
    "Mau cheiro no vaso ou substrato",
    "Planta solta ou balançando",
    "Não sei quando o substrato foi trocado",
    "Não consigo avaliar vaso ou substrato",
  ],
  wateringAndRoutine: [
    "Verifico a umidade antes de regar",
    "Observo raízes e peso do vaso",
    "Garanto o escoamento",
    "Retiro água acumulada",
    "Rego sempre em dias fixos",
    "Rego mesmo com o substrato úmido",
    "Tenho dificuldade para saber quando regar",
    "A água permanece acumulada depois da rega",
    "Uso vários fertilizantes ou produtos ao mesmo tempo",
    "Não lembro quando foi feita a última aplicação",
    "Mudo frequentemente a quantidade ou a frequência",
    "Ainda não possuo uma rotina definida",
    "Não consigo avaliar a rotina atual",
  ],
};

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type GuidanceInit = Omit<DiagnosisGuidance, "id" | "category" | "answer"> & {
  answer: string;
};

function build(category: DiagnosisCategory, entries: GuidanceInit[]): DiagnosisGuidance[] {
  return entries.map((e) => ({
    id: `${category}:${slug(e.answer)}`,
    category,
    answer: e.answer,
    title: e.title,
    classification: e.classification,
    explanation: e.explanation,
    action: e.action,
    tracking: e.tracking,
    avoid: e.avoid,
    warning: e.warning,
    severity: e.severity,
  }));
}

/** Severidade padrão quando a orientação não define uma explicitamente. */
function classificationSeverity(classification: Classification): number {
  switch (classification) {
    case "priority":
      return 50;
    case "adjustment":
      return 40;
    case "favorable":
      return 10;
    case "insufficient":
      return 0;
  }
}

/** Urgência efetiva usada na ordenação (maior primeiro). */
export function effectiveSeverity(g: DiagnosisGuidance): number {
  return g.severity ?? classificationSeverity(g.classification);
}

const ROOTS = build("roots", [
  {
    answer: "Firmes, verdes ou prateadas",
    title: "Raízes com boa aparência",
    classification: "favorable",
    explanation:
      "Raízes firmes, esverdeadas quando úmidas e prateadas quando secas costumam indicar boa hidratação e vigor.",
    action: "Mantenha a rotina atual de observação antes de regar.",
    tracking: ["Firmeza das raízes", "Cor após a rega"],
  },
  {
    answer: "Pontas novas em crescimento",
    title: "Sinal favorável de atividade radicular",
    classification: "favorable",
    explanation: "Pontas claras ou avermelhadas em crescimento indicam que a planta está ativa.",
    action: "Continue observando e evite mudanças bruscas de local ou rotina.",
    tracking: ["Aparecimento de novas pontas"],
  },
  {
    answer: "Poucas raízes visíveis",
    title: "Sistema radicular reduzido",
    classification: "adjustment",
    explanation:
      "Poucas raízes visíveis podem estar relacionadas a substrato antigo, rega inadequada ou histórico de perda.",
    action: "Reforce a observação da umidade e evite encharcamento até novas raízes surgirem.",
    tracking: ["Surgimento de novas raízes", "Firmeza das raízes existentes"],
    avoid: "Evite adubações ou mudanças múltiplas ao mesmo tempo.",
  },
  {
    answer: "Raízes secas ou ocas",
    title: "Raízes desidratadas",
    classification: "adjustment",
    explanation:
      "Raízes ressecadas ou ocas podem indicar rega insuficiente ou substrato que não retém umidade.",
    action:
      "Avalie o tempo de secagem do substrato e verifique se a rega está molhando bem toda a massa.",
    tracking: ["Tempo de secagem", "Firmeza das raízes"],
  },
  {
    answer: "Raízes escuras",
    title: "Coloração alterada nas raízes",
    classification: "adjustment",
    explanation:
      "Raízes escuras podem estar relacionadas a excesso de umidade ou substrato deteriorado. Avalie junto com outros sinais.",
    action: "Reavalie drenagem, ventilação e frequência de rega.",
    tracking: ["Evolução da cor", "Firmeza ao toque"],
  },
  {
    answer: "Raízes moles",
    title: "Raízes com perda de firmeza",
    classification: "priority",
    severity: 80,
    explanation:
      "Raízes moles merecem acompanhamento próximo. Podem estar relacionadas a excesso de umidade prolongado.",
    action: "Suspenda regas até o substrato secar, verifique a drenagem e remova água acumulada.",
    tracking: ["Firmeza das raízes", "Tempo de secagem do substrato"],
    warning: "Se houver deterioração rápida, procure orientação especializada.",
  },
  {
    answer: "Mau cheiro próximo às raízes ou ao substrato",
    title: "Odor no substrato",
    classification: "priority",
    severity: 90,
    explanation: "Mau cheiro pode estar relacionado a substrato encharcado ou em decomposição.",
    action:
      "Reavalie substrato, drenagem e ventilação; retire água acumulada e evite regar até secar.",
    tracking: ["Presença ou ausência de odor", "Secagem do substrato"],
    warning: "Sinal que merece atenção. Procure orientação especializada se persistir.",
  },
  {
    answer: "Não consigo visualizar ou avaliar as raízes",
    title: "Ainda não observado",
    classification: "insufficient",
    explanation:
      "Avaliar raízes ajuda a entender rega e substrato. Observe com calma quando possível.",
    action: "Nos próximos dias, observe cor, firmeza e presença de pontas novas.",
    tracking: ["Aparência das raízes"],
  },
]);

const LEAVES = build("leaves", [
  {
    answer: "Firmes e sem alterações aparentes",
    title: "Folhas em boa aparência",
    classification: "favorable",
    explanation: "Folhas firmes costumam indicar boa hidratação e nutrição estável.",
    action: "Mantenha a rotina atual e continue observando semanalmente.",
    tracking: ["Firmeza e cor das folhas"],
  },
  {
    answer: "Folha nova surgindo",
    title: "Sinal favorável de crescimento",
    classification: "favorable",
    explanation: "Folha nova indica atividade e ajuda a acompanhar o vigor da planta.",
    action: "Evite mudanças simultâneas de rotina durante o crescimento.",
    tracking: ["Desenvolvimento da folha nova"],
  },
  {
    answer: "Brotação nova visível",
    title: "Brotação em desenvolvimento",
    classification: "favorable",
    explanation: "A presença de brotação é um bom indício para acompanhar.",
    action: "Mantenha luz indireta e ventilação estável.",
    tracking: ["Evolução da brotação"],
  },
  {
    answer: "Folhas enrugadas",
    title: "Folhas com perda de turgor",
    classification: "adjustment",
    explanation:
      "Folhas enrugadas podem estar relacionadas a raízes com dificuldade de absorver água.",
    action: "Avalie raízes, umidade do substrato e ventilação; ajuste apenas um fator por vez.",
    tracking: ["Turgor das folhas", "Firmeza das raízes"],
  },
  {
    answer: "Folhas murchas ou sem firmeza",
    title: "Folhas sem firmeza",
    classification: "adjustment",
    explanation: "Pode estar relacionado ao sistema radicular; avalie junto com os outros sinais.",
    action: "Revise raízes, drenagem e frequência de rega.",
    tracking: ["Firmeza das folhas", "Estado das raízes"],
  },
  {
    answer: "Folhas amareladas",
    title: "Folhas com coloração amarelada",
    classification: "adjustment",
    explanation:
      "Pode estar relacionado ao ciclo natural de folhas antigas, à luz ou à rega. Avalie junto com outros sinais.",
    action: "Observe se ocorre em folhas antigas ou novas e revise luz e rega.",
    tracking: ["Localização e evolução do amarelado"],
  },
  {
    answer: "Folhas muito escuras",
    title: "Folhas muito escuras",
    classification: "adjustment",
    explanation:
      "Coloração muito escura pode indicar pouca luz. A planta usa a folha para fotossíntese.",
    action: "Reavalie a luminosidade indireta do ambiente.",
    tracking: ["Cor das folhas", "Vigor geral"],
  },
  {
    answer: "Manchas claras ou áreas com aparência de queimadura",
    title: "Áreas com aparência de queimadura",
    classification: "adjustment",
    explanation:
      "A exposição intensa pode provocar alterações ou áreas com aparência de queimadura.",
    action: "Reduza exposição ao sol direto e ofereça luz filtrada.",
    tracking: ["Estabilidade das manchas", "Novas áreas afetadas"],
  },
  {
    answer: "Manchas escuras",
    title: "Manchas escuras nas folhas",
    classification: "adjustment",
    explanation:
      "Manchas escuras merecem acompanhamento; podem ter várias origens e não confirmam sozinhas uma condição específica.",
    action: "Observe se estão estáveis ou aumentando ao longo dos dias e revise ventilação e rega.",
    tracking: ["Tamanho e quantidade das manchas"],
  },
  {
    answer: "Manchas aumentando ou se espalhando",
    title: "Manchas em expansão",
    classification: "priority",
    severity: 95,
    explanation:
      "Manchas que aumentam merecem atenção próxima. Podem estar relacionadas a excesso de umidade, ventilação insuficiente ou outras causas.",
    action: "Melhore ventilação, revise rega e evite molhar folhas ao entardecer.",
    tracking: ["Velocidade de expansão"],
    warning: "Se progredirem rapidamente, procure orientação especializada.",
  },
  {
    answer: "Queda ou deterioração rápida das folhas",
    title: "Deterioração acelerada",
    classification: "priority",
    severity: 100,
    explanation: "Deterioração rápida merece avaliação próxima e cuidadosa.",
    action: "Registre fotos, reduza intervenções simultâneas e avalie substrato e raízes.",
    tracking: ["Ritmo da deterioração"],
    warning: "Procure orientação especializada.",
  },
  {
    answer: "Não consigo avaliar o estado das folhas",
    title: "Ainda não observado",
    classification: "insufficient",
    explanation: "Uma boa observação das folhas ajuda a entender o vigor geral.",
    action: "Nos próximos dias, observe firmeza, cor e presença de manchas.",
    tracking: ["Aparência das folhas"],
  },
]);

const ENVIRONMENT = build("environment", [
  {
    answer: "Boa luminosidade indireta",
    title: "Boa condição de luz",
    classification: "favorable",
    explanation: "Luz indireta abundante cria condições favoráveis ao vigor.",
    action: "Mantenha o local e observe a estabilidade da folhagem.",
    tracking: ["Estabilidade da luz ao longo do dia"],
  },
  {
    answer: "Sol direto forte",
    title: "Exposição intensa ao sol",
    classification: "adjustment",
    explanation:
      "A exposição intensa pode provocar alterações ou áreas com aparência de queimadura.",
    action: "Ofereça luz filtrada ou reduza o tempo de sol direto.",
    tracking: ["Novas manchas claras", "Firmeza das folhas"],
  },
  {
    answer: "Local muito escuro",
    title: "Pouca luminosidade",
    classification: "adjustment",
    explanation: "Baixa luz pode reduzir o vigor e dificultar novos ciclos.",
    action: "Aproxime a planta de uma janela clara com luz indireta.",
    tracking: ["Cor das folhas", "Ritmo de crescimento"],
  },
  {
    answer: "Boa circulação de ar",
    title: "Ar circulando bem",
    classification: "favorable",
    explanation: "Boa ventilação ajuda a secagem do substrato e contribui para a saúde das folhas.",
    action: "Mantenha o local e evite fechar completamente o ambiente.",
    tracking: ["Tempo de secagem após a rega"],
  },
  {
    answer: "Ambiente abafado",
    title: "Baixa circulação de ar",
    classification: "adjustment",
    explanation:
      "Ambientes abafados podem dificultar a secagem do substrato e favorecer problemas.",
    action: "Melhore a ventilação natural quando possível.",
    tracking: ["Tempo de secagem", "Sinais de umidade prolongada"],
  },
  {
    answer: "Vento forte diretamente",
    title: "Corrente de ar intensa",
    classification: "adjustment",
    explanation: "Vento forte constante pode desidratar folhas e raízes.",
    action: "Reposicione para local protegido, mantendo ventilação suave.",
    tracking: ["Firmeza das folhas"],
  },
  {
    answer: "Próxima de ar-condicionado ou ventilador",
    title: "Fluxo de ar mecânico direto",
    classification: "adjustment",
    explanation: "Ar seco direto de aparelhos pode desidratar a planta rapidamente.",
    action: "Afaste do fluxo direto e mantenha ventilação natural.",
    tracking: ["Turgor das folhas"],
  },
  {
    answer: "Mudada de lugar recentemente",
    title: "Adaptação em curso",
    classification: "adjustment",
    explanation:
      "Mudanças recentes podem exigir alguns dias de adaptação antes que os sinais se estabilizem.",
    action: "Evite novas mudanças simultâneas e observe por alguns dias.",
    tracking: ["Estabilização dos sinais"],
  },
  {
    answer: "Movimentada de lugar com frequência",
    title: "Muitas mudanças de local",
    classification: "adjustment",
    explanation: "Mudanças frequentes dificultam a leitura dos sinais e a adaptação da planta.",
    action: "Defina um local principal e mantenha por algumas semanas.",
    tracking: ["Estabilidade dos sinais"],
  },
  {
    answer: "Não consigo avaliar luminosidade ou ventilação",
    title: "Ainda não observado",
    classification: "insufficient",
    explanation: "Luz e ventilação influenciam bastante a rotina. Observe em diferentes horários.",
    action: "Verifique quanto tempo o local recebe luz clara ao longo do dia.",
    tracking: ["Luz e ventilação do local"],
  },
]);

const POT = build("potAndSubstrate", [
  {
    answer: "Vaso com furos suficientes",
    title: "Boa drenagem estrutural",
    classification: "favorable",
    explanation: "Furos suficientes ajudam a evitar acúmulo de água.",
    action: "Mantenha a estrutura atual.",
    tracking: ["Escoamento após rega"],
  },
  {
    answer: "Água escoa livremente",
    title: "Escoamento adequado",
    classification: "favorable",
    explanation: "Escoamento livre é um bom indicador de drenagem.",
    action: "Continue observando após cada rega.",
    tracking: ["Escoamento constante"],
  },
  {
    answer: "Substrato solto e arejado",
    title: "Substrato em boa condição",
    classification: "favorable",
    explanation: "Substrato arejado ajuda a manter raízes saudáveis e a secagem correta.",
    action: "Mantenha e observe a evolução ao longo das semanas.",
    tracking: ["Estrutura do substrato"],
  },
  {
    answer: "Planta firme no vaso",
    title: "Boa fixação",
    classification: "favorable",
    explanation: "Planta firme indica boa ancoragem e apoio das raízes.",
    action: "Continue observando ao longo do plano.",
    tracking: ["Estabilidade da planta"],
  },
  {
    answer: "Água acumulada no pratinho ou cachepot",
    title: "Acúmulo de água",
    classification: "priority",
    severity: 75,
    explanation: "Água acumulada mantém o substrato encharcado e pode prejudicar as raízes.",
    action: "Retire a água após regar e revise a drenagem.",
    tracking: ["Presença de água acumulada"],
  },
  {
    answer: "Vaso permanece molhado por muito tempo",
    title: "Secagem lenta",
    classification: "priority",
    severity: 65,
    explanation: "Substrato persistentemente molhado dificulta a respiração das raízes.",
    action: "Reavalie ventilação, exposição à luz e substrato; considere ajustar a rotina de rega.",
    tracking: ["Tempo de secagem"],
  },
  {
    answer: "Substrato compactado",
    title: "Substrato compactado",
    classification: "adjustment",
    explanation:
      "Quando o substrato está compactado, deteriorado ou demora muito para secar, pode ser necessário avaliar possíveis correções.",
    action: "Observe drenagem e considere avaliar troca em momento apropriado.",
    tracking: ["Escoamento e secagem"],
  },
  {
    answer: "Substrato deteriorado ou se desfazendo",
    title: "Substrato deteriorado",
    classification: "adjustment",
    explanation: "Substrato deteriorado retém mais água e dificulta o escoamento.",
    action: "Considere avaliar a troca em momento apropriado.",
    tracking: ["Estrutura do substrato"],
  },
  {
    answer: "Mau cheiro no vaso ou substrato",
    title: "Odor no vaso",
    classification: "priority",
    severity: 85,
    explanation: "Odor no substrato pode estar relacionado a decomposição por excesso de umidade.",
    action: "Interrompa a rega até secar e avalie ventilação e drenagem.",
    tracking: ["Presença ou ausência de odor"],
    warning: "Sinal que merece atenção. Procure orientação especializada se persistir.",
  },
  {
    answer: "Planta solta ou balançando",
    title: "Fixação comprometida",
    classification: "adjustment",
    explanation: "Uma planta solta pode indicar substrato deteriorado ou perda de raízes.",
    action: "Reforce apoio quando possível e avalie as raízes.",
    tracking: ["Estabilidade da planta", "Estado das raízes"],
  },
  {
    answer: "Não sei quando o substrato foi trocado",
    title: "Histórico do substrato desconhecido",
    classification: "adjustment",
    explanation:
      "Sem histórico, observe a estrutura e o comportamento da secagem ao longo do plano.",
    action: "Registre observações semanais sobre o substrato.",
    tracking: ["Estrutura e secagem"],
  },
  {
    answer: "Não consigo avaliar vaso ou substrato",
    title: "Ainda não observado",
    classification: "insufficient",
    explanation: "Vaso e substrato têm grande influência na rega.",
    action: "Observe drenagem e estrutura nos próximos dias.",
    tracking: ["Estado do vaso e substrato"],
  },
]);

const ROUTINE = build("wateringAndRoutine", [
  {
    answer: "Verifico a umidade antes de regar",
    title: "Rotina de verificação",
    classification: "favorable",
    explanation: "Verificar a umidade antes da rega ajuda a evitar encharcamento.",
    action: "Mantenha esse hábito ao longo do plano.",
    tracking: ["Consistência da verificação"],
  },
  {
    answer: "Observo raízes e peso do vaso",
    title: "Observação atenta",
    classification: "favorable",
    explanation: "Raízes e peso do vaso são bons indicadores para decidir sobre a rega.",
    action: "Continue observando semanalmente.",
    tracking: ["Frequência da observação"],
  },
  {
    answer: "Garanto o escoamento",
    title: "Escoamento na rotina",
    classification: "favorable",
    explanation: "Garantir o escoamento contribui para a saúde das raízes.",
    action: "Mantenha a prática após cada rega.",
    tracking: ["Escoamento após rega"],
  },
  {
    answer: "Retiro água acumulada",
    title: "Cuidado com água parada",
    classification: "favorable",
    explanation: "Remover água parada evita substrato encharcado.",
    action: "Continue conferindo o pratinho e o cachepot.",
    tracking: ["Presença de água acumulada"],
  },
  {
    answer: "Rego sempre em dias fixos",
    title: "Rega por calendário",
    classification: "adjustment",
    explanation:
      "Regar apenas por calendário pode encharcar em dias frios e faltar água em dias quentes.",
    action: "Combine o calendário com a verificação da umidade antes de cada rega.",
    tracking: ["Ajustes conforme o clima"],
  },
  {
    answer: "Rego mesmo com o substrato úmido",
    title: "Rega com substrato úmido",
    classification: "priority",
    severity: 60,
    explanation:
      "Regar com o substrato ainda úmido pode manter o meio encharcado e prejudicar as raízes.",
    action: "Aguarde a secagem parcial antes de regar novamente.",
    tracking: ["Tempo de secagem", "Firmeza das raízes"],
  },
  {
    answer: "Tenho dificuldade para saber quando regar",
    title: "Dúvida na frequência",
    classification: "adjustment",
    explanation: "É comum. Observar peso do vaso, raízes e substrato ajuda a criar critério.",
    action: "Use a próxima semana para observar o tempo de secagem antes de decidir novas regas.",
    tracking: ["Critérios de rega"],
  },
  {
    answer: "A água permanece acumulada depois da rega",
    title: "Acúmulo após rega",
    classification: "priority",
    severity: 70,
    explanation: "Acúmulo persistente pode indicar drenagem insuficiente ou substrato deteriorado.",
    action: "Revise vaso, pratinho e substrato; ajuste a drenagem quando possível.",
    tracking: ["Escoamento e secagem"],
  },
  {
    answer: "Uso vários fertilizantes ou produtos ao mesmo tempo",
    title: "Uso simultâneo de produtos",
    classification: "priority",
    severity: 55,
    explanation:
      "O uso simultâneo dificulta identificar o que ajuda ou o que pode estar prejudicando.",
    action: "Simplifique a rotina durante o plano de 21 dias, evitando misturas.",
    tracking: ["Efeito das aplicações"],
  },
  {
    answer: "Não lembro quando foi feita a última aplicação",
    title: "Histórico de aplicação incerto",
    classification: "adjustment",
    explanation:
      "Sem histórico, é difícil avaliar efeito. O próprio plano ajuda a criar essa memória.",
    action: "Registre as próximas aplicações usando a tela do dia.",
    tracking: ["Datas das aplicações"],
  },
  {
    answer: "Mudo frequentemente a quantidade ou a frequência",
    title: "Rotina instável",
    classification: "adjustment",
    explanation: "Rotinas muito variáveis dificultam a leitura de sinais e a adaptação da planta.",
    action: "Escolha uma rotina simples e mantenha ao menos durante o plano de 21 dias.",
    tracking: ["Estabilidade da rotina"],
  },
  {
    answer: "Ainda não possuo uma rotina definida",
    title: "Sem rotina definida",
    classification: "adjustment",
    explanation: "Uma rotina simples ajuda a observar sinais com mais clareza.",
    action: "Comece com verificação de umidade antes de regar e registros semanais.",
    tracking: ["Criação da rotina"],
  },
  {
    answer: "Não consigo avaliar a rotina atual",
    title: "Ainda não observado",
    classification: "insufficient",
    explanation: "Descrever a rotina ajuda a identificar ajustes simples.",
    action: "Anote nos próximos dias como acontece a rega e a observação.",
    tracking: ["Descrição da rotina"],
  },
]);

export const GUIDANCE_BY_CATEGORY: Record<DiagnosisCategory, DiagnosisGuidance[]> = {
  roots: ROOTS,
  leaves: LEAVES,
  environment: ENVIRONMENT,
  potAndSubstrate: POT,
  wateringAndRoutine: ROUTINE,
};

export const ALL_GUIDANCE: DiagnosisGuidance[] = [
  ...ROOTS,
  ...LEAVES,
  ...ENVIRONMENT,
  ...POT,
  ...ROUTINE,
];

/**
 * Clusters de sinais correlacionados. Quando o usuário marca ao menos
 * `minMatches` respostas do mesmo cluster, o resultado ganha um insight
 * sintetizando o padrão — em vez de listar os sinais soltos.
 * Estrutura em tabela para permitir novos clusters no futuro.
 */
export type SignalCluster = {
  id: string;
  title: string;
  message: string;
  minMatches: number;
  answers: string[];
};

const SIGNAL_CLUSTERS: SignalCluster[] = [
  {
    id: "excesso-de-agua",
    title: "Vários sinais apontam para excesso de água",
    message:
      "Os sinais marcados sugerem que o substrato pode estar retendo umidade por tempo demais. Priorize secagem, drenagem e ventilação antes de qualquer outra mudança.",
    minMatches: 2,
    answers: [
      "Raízes moles",
      "Mau cheiro próximo às raízes ou ao substrato",
      "Mau cheiro no vaso ou substrato",
      "Água acumulada no pratinho ou cachepot",
      "Vaso permanece molhado por muito tempo",
      "Rego mesmo com o substrato úmido",
      "A água permanece acumulada depois da rega",
    ],
  },
];

const EMPTY_OBSERVATION_GUIDANCE: DiagnosisGuidance[] = [
  {
    id: "roots:observacao-ainda-nao-registrada",
    category: "roots",
    answer: "Observação ainda não registrada",
    title: "Raízes ainda não avaliadas",
    classification: "insufficient",
    explanation:
      "Sem observar as raízes, ainda não é possível entender com segurança como está a absorção de água e nutrientes.",
    action: "Nos próximos dias, observe cor, firmeza e presença de pontas novas nas raízes.",
    tracking: ["Cor das raízes", "Firmeza das raízes", "Pontas novas"],
  },
  {
    id: "leaves:observacao-ainda-nao-registrada",
    category: "leaves",
    answer: "Observação ainda não registrada",
    title: "Folhas ainda não avaliadas",
    classification: "insufficient",
    explanation:
      "As folhas ajudam a acompanhar hidratação, vigor e resposta ao ambiente ao longo do protocolo.",
    action: "Observe firmeza, cor, manchas e surgimento de folhas ou brotações novas.",
    tracking: ["Firmeza das folhas", "Cor das folhas", "Novas brotações"],
  },
  {
    id: "environment:observacao-ainda-nao-registrada",
    category: "environment",
    answer: "Observação ainda não registrada",
    title: "Ambiente ainda não avaliado",
    classification: "insufficient",
    explanation:
      "Luz, ventilação e mudanças de local influenciam diretamente a leitura dos sinais da orquídea.",
    action: "Observe a luminosidade indireta, a circulação de ar e se a planta sofreu mudanças recentes.",
    tracking: ["Luminosidade", "Ventilação", "Estabilidade do local"],
  },
  {
    id: "potAndSubstrate:observacao-ainda-nao-registrada",
    category: "potAndSubstrate",
    answer: "Observação ainda não registrada",
    title: "Vaso e substrato ainda não avaliados",
    classification: "insufficient",
    explanation:
      "Drenagem, estrutura do substrato e firmeza da planta ajudam a decidir se a rotina deve ser ajustada.",
    action: "Verifique se há furos, acúmulo de água, substrato compactado ou planta solta no vaso.",
    tracking: ["Escoamento", "Tempo de secagem", "Firmeza da planta"],
  },
  {
    id: "wateringAndRoutine:observacao-ainda-nao-registrada",
    category: "wateringAndRoutine",
    answer: "Observação ainda não registrada",
    title: "Rotina ainda não avaliada",
    classification: "insufficient",
    explanation:
      "A rotina de rega e aplicação precisa ser observada para evitar excesso de água ou intervenções simultâneas.",
    action: "Antes de regar, verifique umidade, peso do vaso e escoamento; registre as aplicações feitas.",
    tracking: ["Umidade antes da rega", "Escoamento", "Histórico de aplicações"],
  },
];

export type DiagnosisAnswers = Record<DiagnosisCategory, string[]>;

export type HealthTone = "green" | "accent" | "warn";

export type HealthStatus = {
  label: string;
  tone: HealthTone;
  message: string;
};

export type DiagnosisConflict = {
  category: DiagnosisCategory;
  favorable: string;
  priority: string;
};

export type DiagnosisInsight = {
  id: string;
  title: string;
  message: string;
  relatedAnswers: string[];
};

export type DiagnosisResult = {
  favorable: DiagnosisGuidance[];
  adjustments: DiagnosisGuidance[];
  priorities: DiagnosisGuidance[];
  insufficientInformation: DiagnosisGuidance[];
  trackingPoints: string[];
  /** Índice de saúde 0–100 derivado das classificações. */
  healthScore: number;
  /** Faixa textual correspondente ao {@link healthScore}. */
  healthStatus: HealthStatus;
  /** Sinais opostos marcados na mesma categoria (favorável + prioridade). */
  conflicts: DiagnosisConflict[];
  /** Padrões sintetizados a partir de sinais correlacionados. */
  insights: DiagnosisInsight[];
  completedAt: string | null;
  answersVersion: number;
};

/**
 * Deriva o índice de saúde (0–100) e a faixa textual a partir das listas
 * classificadas. Penaliza prioridades e ajustes; bonifica sinais favoráveis.
 * Fonte única de verdade — antes vivia embutido na UI (`ResultBlocks`).
 */
export function deriveHealthScore(
  favorableCount: number,
  adjustmentCount: number,
  priorityCount: number,
): { healthScore: number; healthStatus: HealthStatus } {
  const observedCount = favorableCount + adjustmentCount + priorityCount;
  const weightedRisk = Math.max(0, priorityCount * 3 + adjustmentCount * 1.5 - favorableCount * 0.75);
  const raw = observedCount === 0 ? 100 : 100 - Math.sqrt(weightedRisk) * 16;
  const healthScore = Math.round(Math.max(0, Math.min(100, raw)));
  const healthStatus: HealthStatus =
    healthScore >= 80
      ? { label: "Saudável", tone: "green", message: "Sua orquídea mostra sinais consistentes de saúde. Mantenha a rotina." }
      : healthScore >= 60
        ? { label: "Estável com ajustes", tone: "accent", message: "Boa base. Alguns ajustes vão elevar o desempenho." }
        : healthScore >= 40
          ? { label: "Em recuperação", tone: "accent", message: "Há pontos de atenção. Siga as prioridades para reverter." }
          : { label: "Requer atenção imediata", tone: "warn", message: "Foque nas prioridades desta semana. É reversível." };
  return { healthScore, healthStatus };
}

export function computeDiagnosisResult(
  answers: DiagnosisAnswers,
  answersVersion: number,
  completedAt: string = new Date().toISOString(),
): DiagnosisResult {
  const favorable: DiagnosisGuidance[] = [];
  const adjustments: DiagnosisGuidance[] = [];
  const priorities: DiagnosisGuidance[] = [];
  const insufficient: DiagnosisGuidance[] = [];
  const observations = totalObservations(answers);

  if (observations === 0) {
    insufficient.push(...EMPTY_OBSERVATION_GUIDANCE);
  }

  const conflicts: DiagnosisConflict[] = [];

  (Object.keys(answers) as DiagnosisCategory[]).forEach((cat) => {
    let firstFavorable: string | null = null;
    let firstPriority: string | null = null;
    for (const ans of answers[cat]) {
      const g = GUIDANCE_BY_CATEGORY[cat].find((x) => x.answer === ans);
      if (!g) continue;
      if (g.classification === "favorable") {
        favorable.push(g);
        if (firstFavorable === null) firstFavorable = g.answer;
      } else if (g.classification === "adjustment") {
        adjustments.push(g);
      } else if (g.classification === "priority") {
        priorities.push(g);
        if (firstPriority === null) firstPriority = g.answer;
      } else {
        insufficient.push(g);
      }
    }
    // Sinais opostos na mesma categoria: um favorável e um prioritário.
    if (firstFavorable && firstPriority) {
      conflicts.push({ category: cat, favorable: firstFavorable, priority: firstPriority });
    }
  });

  // Ordena prioridades por urgência (maior primeiro), estável para empates.
  priorities.sort((a, b) => effectiveSeverity(b) - effectiveSeverity(a));

  // pontos de acompanhamento: derivados das prioridades, depois ajustes.
  const tracking = new Set<string>();
  [...priorities, ...adjustments].forEach((g) => {
    g.tracking.forEach((t) => tracking.add(t));
  });
  const trackingPoints = Array.from(tracking).slice(0, 5);

  const insights = computeInsights(answers);
  const { healthScore, healthStatus } = deriveHealthScore(
    favorable.length,
    adjustments.length,
    priorities.length,
  );

  return {
    favorable,
    adjustments,
    priorities,
    insufficientInformation: insufficient,
    trackingPoints,
    healthScore,
    healthStatus,
    conflicts,
    insights,
    completedAt,
    answersVersion,
  };
}

/**
 * Sintetiza padrões a partir de sinais correlacionados marcados pelo usuário.
 * Percorre {@link SIGNAL_CLUSTERS} e emite um insight por cluster com ao menos
 * `minMatches` respostas presentes.
 */
export function computeInsights(answers: DiagnosisAnswers): DiagnosisInsight[] {
  const selected = new Set<string>();
  (Object.values(answers) as string[][]).forEach((arr) => arr.forEach((a) => selected.add(a)));

  const insights: DiagnosisInsight[] = [];
  for (const cluster of SIGNAL_CLUSTERS) {
    const matched = cluster.answers.filter((a) => selected.has(a));
    if (matched.length >= cluster.minMatches) {
      insights.push({
        id: cluster.id,
        title: cluster.title,
        message: cluster.message,
        relatedAnswers: matched,
      });
    }
  }
  return insights;
}

export function totalObservations(answers: DiagnosisAnswers): number {
  return (Object.values(answers) as string[][]).reduce((n, arr) => n + arr.length, 0);
}

// --- Normalização e Migração ---

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    if (v.length === 0) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function normalizeCurrentDay(v: unknown): number {
  if (typeof v !== "number") return 1;
  if (!Number.isInteger(v)) return 1;
  if (v < 1 || v > 21) return 1;
  return v;
}

function mapRootAnswer(v: string): string[] {
  switch (v) {
    case "Firmes": return ["Firmes, verdes ou prateadas"];
    case "Pontas novas": return ["Pontas novas em crescimento"];
    case "Poucas raízes": return ["Poucas raízes visíveis"];
    case "Secas ou ocas": return ["Raízes secas ou ocas"];
    case "Escuras ou moles": return ["Raízes escuras", "Raízes moles"];
    case "Mau cheiro": return ["Mau cheiro próximo às raízes ou ao substrato"];
    default: return [v];
  }
}

function mapLeafAnswer(v: string): string[] {
  switch (v) {
    case "Firmes": return ["Firmes e sem alterações aparentes"];
    case "Enrugadas": return ["Folhas enrugadas"];
    case "Amareladas": return ["Folhas amareladas"];
    case "Manchas": return ["Manchas escuras"];
    case "Folha nova": return ["Folha nova surgindo"];
    case "Brotação": return ["Brotação nova visível"];
    default: return [v];
  }
}

export function migrateLegacyDiagnosis(saved: unknown): DiagnosisAnswers {
  const acc: DiagnosisAnswers = {
    roots: [],
    leaves: [],
    environment: [],
    potAndSubstrate: [],
    wateringAndRoutine: [],
  };
  if (!isPlainObject(saved)) return acc;

  const push = (cat: DiagnosisCategory, values: string[]) => {
    for (const v of values) if (typeof v === "string" && v.length > 0) acc[cat].push(v);
  };

  for (const v of asStringArray(saved.roots)) push("roots", mapRootAnswer(v));
  for (const v of asStringArray(saved.leaves)) push("leaves", mapLeafAnswer(v));
  
  // Mapeamento simples para environment e routine do legado
  if (Array.isArray(saved.environment)) {
    for (const v of saved.environment) if (typeof v === "string") acc.environment.push(v);
  }
  if (Array.isArray(saved.routine)) {
    for (const v of saved.routine) if (typeof v === "string") acc.wateringAndRoutine.push(v);
  }
  if (Array.isArray(saved.wateringAndRoutine)) {
    for (const v of saved.wateringAndRoutine) if (typeof v === "string") acc.wateringAndRoutine.push(v);
  }
  if (Array.isArray(saved.potAndSubstrate)) {
    for (const v of saved.potAndSubstrate) if (typeof v === "string") acc.potAndSubstrate.push(v);
  }

  return {
    roots: uniqueStrings(acc.roots),
    leaves: uniqueStrings(acc.leaves),
    environment: uniqueStrings(acc.environment),
    potAndSubstrate: uniqueStrings(acc.potAndSubstrate),
    wateringAndRoutine: uniqueStrings(acc.wateringAndRoutine),
  };
}

export function normalizeDays(v: unknown): Record<number, any> {
  if (!isPlainObject(v)) return {};
  const out: Record<number, any> = {};
  for (const [k, val] of Object.entries(v)) {
    const n = Number(k);
    if (!Number.isInteger(n) || n < 1 || n > 21) continue;
    out[n] = val;
  }
  return out;
}

export function normalizeApplications(v: unknown): any[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isPlainObject);
}

export function normalizeFinalEval(v: unknown): any {
  if (!isPlainObject(v)) return { improved: "", same: "", attention: "", keep: "", path: "" };
  return v;
}

export function normalizeDiagnosisStatus(v: unknown): "none" | "fresh" | "outdated" {
  return v === "fresh" || v === "outdated" || v === "none" ? v : "none";
}

export function normalizeAnswersVersion(value: unknown): number {
  if (typeof value !== "number") return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

const VALID_CATEGORIES: DiagnosisCategory[] = [
  "roots",
  "leaves",
  "environment",
  "potAndSubstrate",
  "wateringAndRoutine",
];
const VALID_CLASSIFICATIONS = ["favorable", "adjustment", "priority", "insufficient"] as const;

export function normalizeDiagnosisGuidance(value: unknown): DiagnosisGuidance | null {
  if (!isPlainObject(value)) return null;
  const { id, category, classification } = value;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category as DiagnosisCategory)) return null;
  if (typeof classification !== "string" || !(VALID_CLASSIFICATIONS as readonly string[]).includes(classification)) return null;
  return value as DiagnosisGuidance;
}

function normalizeGuidanceList(v: unknown): DiagnosisGuidance[] | null {
  if (!Array.isArray(v)) return null;
  const out: DiagnosisGuidance[] = [];
  for (const item of v) {
    const g = normalizeDiagnosisGuidance(item);
    if (g) out.push(g);
  }
  return out;
}

export function normalizeDiagnosisResult(v: unknown): DiagnosisResult | null {
  if (!isPlainObject(v)) return null;
  const favorable = normalizeGuidanceList(v.favorable);
  const adjustments = normalizeGuidanceList(v.adjustments);
  const priorities = normalizeGuidanceList(v.priorities);
  const insufficientInformation = normalizeGuidanceList(v.insufficientInformation);
  if (!favorable || !adjustments || !priorities || !insufficientInformation) return null;

  const raw = v as Record<string, unknown>;
  // Recalcula sempre pela matriz atual para corrigir resultados salvos com a
  // fórmula antiga, que podia derrubar o veredito para 0 ao marcar muitos sinais.
  const { healthScore, healthStatus } = deriveHealthScore(favorable.length, adjustments.length, priorities.length);

  return {
    ...(v as DiagnosisResult),
    favorable,
    adjustments,
    priorities,
    insufficientInformation,
    healthScore,
    healthStatus,
    conflicts: Array.isArray(raw.conflicts) ? (raw.conflicts as DiagnosisConflict[]) : [],
    insights: Array.isArray(raw.insights) ? (raw.insights as DiagnosisInsight[]) : [],
  };
}

export function reconcileDiagnosisResultState(
  diagnosisResult: DiagnosisResult | null,
  diagnosisStatus: "none" | "fresh" | "outdated",
  answersVersion: number,
): { diagnosisResult: DiagnosisResult | null; diagnosisStatus: "none" | "fresh" | "outdated" } {
  if (diagnosisResult === null) return { diagnosisResult: null, diagnosisStatus: "none" };
  if (diagnosisResult.answersVersion !== answersVersion) return { diagnosisResult, diagnosisStatus: "outdated" };
  return { diagnosisResult, diagnosisStatus: diagnosisStatus === "none" ? "fresh" : diagnosisStatus };
}


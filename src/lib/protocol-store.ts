import { useState, useCallback, useEffect } from "react";
import { saveToCache } from "./protocol-cache";

import {
  computeDiagnosisResult,
  migrateLegacyDiagnosis,
  normalizeCurrentDay,
  normalizeDays,
  normalizeApplications,
  normalizeFinalEval,
  normalizeDiagnosisStatus,
  normalizeAnswersVersion,
  normalizeDiagnosisResult,
  reconcileDiagnosisResultState,
  totalObservations,
  type DiagnosisAnswers,
  type DiagnosisCategory,
  type DiagnosisResult,
} from "./diagnosis-matrix";

export type PlantInfo = {
  name: string;
  species: string;
  unknownSpecies: boolean;
  location: string;
  pot: string;
  substrate: string;
  difficulty: string;
  photo: string | null;
};

export type DiagnosisStatus = "none" | "fresh" | "outdated";

export type DayEntry = {
  checklist: Record<string, boolean>;
  note: string;
  completed: boolean;
  photo?: string | null;
  photoCaption?: string;
  roots?: string;
  leavesObs?: string;
  shoots?: string;
  observations?: string;
  applicationDone?: boolean;
};

export type FinalEvaluation = {
  improved: string;
  same: string;
  attention: string;
  keep: string;
  path: "" | "evolved" | "stable" | "worsening" | "healthy-no-bloom";
};

export type ApplicationRecord = {
  id: string;
  day: number;
  timestamp: string | null;
  migrated?: boolean;
};

export type ProtocolState = {
  schemaVersion: 2;
  currentDay: number;
  plant: PlantInfo;
  diagnosis: DiagnosisAnswers;
  diagnosisResult: DiagnosisResult | null;
  diagnosisStatus: DiagnosisStatus;
  answersVersion: number;
  days: Record<number, DayEntry>;
  applications: ApplicationRecord[];
  finalEval: FinalEvaluation;
  onboarded: boolean;
  settings?: {
    muteSounds?: boolean;
    hapticsDisabled?: boolean;
    focusedMode?: boolean;
    highContrast?: boolean;
    reminderTime?: string;
  };
  onboardingStep?: string;
  /** Non-persisted transient flag set when the last localStorage write failed. */
  saveError?: string;
};

export const SAVE_ERROR_MESSAGE =
  "Não foi possível salvar esta alteração no navegador. Libere espaço ou remova alguma fotografia e tente novamente.";

export const SYNC_ERROR_MESSAGE =
  "Salvamos suas alterações neste aparelho, mas ainda não conseguimos sincronizar com a sua conta. Tentaremos novamente automaticamente.";

export function isDiagnosisCurrent(state: ProtocolState): boolean {
  return (
    state.diagnosisStatus === "fresh" &&
    state.diagnosisResult !== null &&
    state.diagnosisResult.answersVersion === state.answersVersion
  );
}

/**
 * Verifica se o dia está totalmente concluído com base no checklist real
 * (ou na flag `completed` quando o dia não tem checklist).
 */
export function isDayFullyDone(state: ProtocolState, day: number, checklist: string[] | undefined): boolean {
  const entry = state.days[day];
  if (!entry) return false;
  if (!checklist || checklist.length === 0) return !!entry.completed;
  return checklist.every((label) => !!entry.checklist?.[label]);
}

/**
 * Deriva o dia de foco a partir do primeiro dia não concluído no checklist.
 * Fonte única de verdade compartilhada por Início, Minha Orquídea e Plano.
 */
export function computeFocusDay(state: ProtocolState, getChecklist: (day: number) => string[] | undefined): number {
  for (let d = 1; d <= 21; d++) {
    if (!isDayFullyDone(state, d, getChecklist(d))) return d;
  }
  return 21;
}

export { totalObservations };
// Re-exports for backwards compatibility with existing tests / callers
// that historically imported these helpers from protocol-store.
export {
  migrateLegacyDiagnosis,
  uniqueStrings,
  normalizeCurrentDay,
  normalizeAnswersVersion,
  reconcileDiagnosisResultState,
} from "./diagnosis-matrix";

const DEFAULT_CURRENT_DAY = 1;

const emptyPlant: PlantInfo = {
  name: "",
  species: "",
  unknownSpecies: false,
  location: "",
  pot: "",
  substrate: "",
  difficulty: "",
  photo: null,
};

const emptyDiag: DiagnosisAnswers = {
  roots: [],
  leaves: [],
  environment: [],
  potAndSubstrate: [],
  wateringAndRoutine: [],
};

export const defaultState: ProtocolState = {
  schemaVersion: 2,
  currentDay: DEFAULT_CURRENT_DAY,
  plant: emptyPlant,
  diagnosis: emptyDiag,
  diagnosisResult: null,
  diagnosisStatus: "none",
  answersVersion: 0,
  days: {},
  applications: [],
  finalEval: { improved: "", same: "", attention: "", keep: "", path: "" },
  onboarded: false,
  onboardingStep: "welcome",
};

let listeners: Array<() => void> = [];
let currentState: ProtocolState = { ...defaultState };

function notifyListeners() {
  listeners.forEach((l) => l());
}

export function getState(): ProtocolState {
  return currentState;
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function hydrateStore(state: ProtocolState): void {
  const normalizedResult = normalizeDiagnosisResult(state.diagnosisResult);
  const reconciled = reconcileDiagnosisResultState(
    normalizedResult,
    state.diagnosisStatus,
    state.answersVersion,
  );
  currentState = {
    ...state,
    diagnosisResult: reconciled.diagnosisResult,
    diagnosisStatus: reconciled.diagnosisStatus,
    saveError: undefined,
  };
  notifyListeners();
}

export function clearStore(): void {
  currentState = { ...defaultState };
  notifyListeners();
}

/**
 * Normaliza o progresso vindo do banco (protocol_progress).
 */
export function normalizeRemoteProgress(progress: any): ProtocolState {
  const next: ProtocolState = {
    ...defaultState,
    currentDay: normalizeCurrentDay(progress.current_day),
  };

  next.days = normalizeDays(progress.completed_tasks);
  next.applications = normalizeApplications(progress.applications);
  
  const remoteDiagnosis = migrateLegacyDiagnosis(progress.diagnosis_answers);
  const remoteDiagnosisCount = totalObservations(remoteDiagnosis);
  const remoteResult = normalizeDiagnosisResult(progress.diagnosis_result);
  const remoteStatus = normalizeDiagnosisStatus(progress.diagnosis_status);
  const remoteAnswersVersion = normalizeAnswersVersion(progress.answers_version);

  const reconciled = reconcileDiagnosisResultState(remoteResult, remoteStatus, remoteAnswersVersion);
  
  return {
    ...next,
    diagnosis: remoteDiagnosisCount > 0 ? remoteDiagnosis : next.diagnosis,
    answersVersion: remoteAnswersVersion,
    diagnosisResult: reconciled.diagnosisResult,
    diagnosisStatus: reconciled.diagnosisStatus,
  };
}

/**
 * Marca a geração de sincronização mais recente. Permite descartar o resultado
 * (sucesso ou falha) de uma sincronização antiga quando outra já começou.
 */
let syncGeneration = 0;

/**
 * Sincroniza o estado com a nuvem em background, com uma nova tentativa. Em caso
 * de falha, sinaliza `saveError` para o banner já existente; ao ter sucesso,
 * limpa esse aviso automaticamente (auto-cura). Nunca lança para o chamador.
 */
async function syncRemote(actorId: string, state: ProtocolState): Promise<void> {
  const generation = ++syncGeneration;
  try {
    const { saveProgressRemote } = await import("./protocol-cloud");
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { error } = await saveProgressRemote(actorId, state);
        if (!error) {
          // Sucesso: limpa o aviso de sincronização se ainda formos a tentativa atual.
          if (generation === syncGeneration && currentState.saveError === SYNC_ERROR_MESSAGE) {
            currentState = { ...currentState, saveError: undefined };
            notifyListeners();
          }
          return;
        }
      } catch {
        /* rede/exceção — cai para nova tentativa abaixo */
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
    }
  } catch {
    /* falha ao importar o módulo — tratada abaixo como falha de sincronização */
  }
  // Falhou após a nova tentativa: sinaliza apenas se ainda formos a sincronização atual.
  if (generation === syncGeneration) {
    currentState = { ...currentState, saveError: SYNC_ERROR_MESSAGE };
    notifyListeners();
  }
}

export function useProtocolStore() {
  const [, force] = useState(0);
  
  useEffect(() => {
    return subscribe(() => force((n) => n + 1));
  }, []);

  const state = currentState;

  const wrapSetState = useCallback((updater: (s: ProtocolState) => ProtocolState, actorId: string | "guest") => {
    const next = updater(currentState);
    currentState = next;
    notifyListeners();

    // Persistência local — se o navegador recusar (ex.: cota cheia), avisa sem quebrar a ação.
    try {
      saveToCache(actorId, next);
    } catch {
      currentState = { ...currentState, saveError: SAVE_ERROR_MESSAGE };
      notifyListeners();
    }

    // Sincronização com a nuvem (quando logado), em background, com retry e aviso em caso de falha.
    if (actorId !== "guest") {
      void syncRemote(actorId, next);
    }
  }, []);

  const updatePlant = useCallback((patch: Partial<PlantInfo>, actorId: string | "guest") => {
    wrapSetState((s) => ({ ...s, plant: { ...s.plant, ...patch } }), actorId);
  }, [wrapSetState]);

  const toggleDiagnosis = useCallback((cat: DiagnosisCategory, value: string, actorId: string | "guest") => {
    wrapSetState((s) => {
      const arr = s.diagnosis[cat];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      const nextStatus: DiagnosisStatus =
        s.diagnosisResult && s.diagnosisStatus !== "none" ? "outdated" : s.diagnosisStatus;
      return {
        ...s,
        diagnosis: { ...s.diagnosis, [cat]: next },
        answersVersion: s.answersVersion + 1,
        diagnosisStatus: nextStatus,
      };
    }, actorId);
  }, [wrapSetState]);

  const saveDiagnosisResult = useCallback((actorId: string | "guest") => {
    wrapSetState((s) => {
      const result = computeDiagnosisResult(s.diagnosis, s.answersVersion);
      return { ...s, diagnosisResult: result, diagnosisStatus: "fresh" };
    }, actorId);
  }, [wrapSetState]);

  const updateDay = useCallback((day: number, patch: Partial<DayEntry>, actorId: string | "guest") => {
    wrapSetState((s) => {
      const existing: DayEntry = s.days[day] ?? { checklist: {}, note: "", completed: false };
      return { ...s, days: { ...s.days, [day]: { ...existing, ...patch } } };
    }, actorId);
  }, [wrapSetState]);

  const toggleChecklist = useCallback((day: number, key: string, actorId: string | "guest") => {
    wrapSetState((s) => {
      const existing: DayEntry = s.days[day] ?? { checklist: {}, note: "", completed: false };
      const checklist = { ...existing.checklist, [key]: !existing.checklist[key] };
      return { ...s, days: { ...s.days, [day]: { ...existing, checklist } } };
    }, actorId);
  }, [wrapSetState]);

  const toggleDayCompleted = useCallback((day: number, actorId: string | "guest") => {
    wrapSetState((s) => {
      const existing: DayEntry = s.days[day] ?? { checklist: {}, note: "", completed: false };
      return { ...s, days: { ...s.days, [day]: { ...existing, completed: !existing.completed } } };
    }, actorId);
  }, [wrapSetState]);

  const registerApplication = useCallback((day: number, actorId: string | "guest") => {
    wrapSetState((s) => {
      const record: ApplicationRecord = { 
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, 
        day, 
        timestamp: new Date().toISOString() 
      };
      const existing: DayEntry = s.days[day] ?? { checklist: {}, note: "", completed: false };
      return {
        ...s,
        applications: [...s.applications, record],
        days: { ...s.days, [day]: { ...existing, applicationDone: true } },
      };
    }, actorId);
  }, [wrapSetState]);

  const setCurrentDay = useCallback((day: number, actorId: string | "guest") => {
    wrapSetState((s) => ({ ...s, currentDay: day }), actorId);
  }, [wrapSetState]);

  const setOnboarded = useCallback((v: boolean, actorId: string | "guest") => {
    wrapSetState((s) => ({ ...s, onboarded: v }), actorId);
  }, [wrapSetState]);

  const updateFinalEval = useCallback((patch: Partial<FinalEvaluation>, actorId: string | "guest") => {
    wrapSetState((s) => ({ ...s, finalEval: { ...s.finalEval, ...patch } }), actorId);
  }, [wrapSetState]);

  return {
    state,
    updatePlant,
    toggleDiagnosis,
    saveDiagnosisResult,
    updateDay,
    toggleChecklist,
    toggleDayCompleted,
    registerApplication,
    setCurrentDay,
    setOnboarded,
    updateFinalEval,
    hydrateStore, // Adicionado para facilitar uso em componentes quando necessário
    clearStore,   // Adicionado
    clearSaveError: () => {
      currentState = { ...currentState, saveError: undefined };
      notifyListeners();
    },
    updateSettings: (patch: Partial<NonNullable<ProtocolState['settings']>>, actorId: string | "guest") => {
      wrapSetState((s) => ({
        ...s,
        settings: { ...s.settings, ...patch }
      }), actorId);
    },
    setOnboardingStep: (step: string, actorId: string | "guest") => {
      wrapSetState((s) => ({ ...s, onboardingStep: step }), actorId);
    }
  };
}

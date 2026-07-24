import { describe, it, expect } from "bun:test";
import {
  migrateLegacyDiagnosis,
  normalizeCurrentDay,
  normalizeAnswersVersion,
  normalizeDiagnosisStatus,
  normalizeDiagnosisGuidance,
  normalizeDiagnosisResult,
  reconcileDiagnosisResultState,
  normalizeDays,
  normalizeApplications,
  normalizeFinalEval,
  type DiagnosisResult,
  type DiagnosisGuidance,
} from "../diagnosis-matrix";

describe("normalizeCurrentDay", () => {
  it("clamps invalid values to 1", () => {
    expect(normalizeCurrentDay(undefined)).toBe(1);
    expect(normalizeCurrentDay("5")).toBe(1);
    expect(normalizeCurrentDay(0)).toBe(1);
    expect(normalizeCurrentDay(22)).toBe(1);
    expect(normalizeCurrentDay(1.5)).toBe(1);
  });
  it("keeps values in range 1..21", () => {
    expect(normalizeCurrentDay(1)).toBe(1);
    expect(normalizeCurrentDay(10)).toBe(10);
    expect(normalizeCurrentDay(21)).toBe(21);
  });
});

describe("normalizeAnswersVersion", () => {
  it("returns 0 for non-numeric, negative or NaN", () => {
    expect(normalizeAnswersVersion("2")).toBe(0);
    expect(normalizeAnswersVersion(NaN)).toBe(0);
    expect(normalizeAnswersVersion(-5)).toBe(0);
  });
  it("floors positive numbers", () => {
    expect(normalizeAnswersVersion(3.9)).toBe(3);
  });
});

describe("normalizeDiagnosisStatus", () => {
  it("passes through valid statuses", () => {
    expect(normalizeDiagnosisStatus("fresh")).toBe("fresh");
    expect(normalizeDiagnosisStatus("outdated")).toBe("outdated");
    expect(normalizeDiagnosisStatus("none")).toBe("none");
  });
  it("defaults invalid input to 'none'", () => {
    expect(normalizeDiagnosisStatus("bogus")).toBe("none");
    expect(normalizeDiagnosisStatus(undefined)).toBe("none");
  });
});

describe("migrateLegacyDiagnosis", () => {
  it("returns empty answers for non-object input", () => {
    expect(migrateLegacyDiagnosis(null).roots).toEqual([]);
    expect(migrateLegacyDiagnosis("x").leaves).toEqual([]);
  });

  it("maps legacy short root/leaf labels to canonical answers", () => {
    const r = migrateLegacyDiagnosis({
      roots: ["Firmes", "Escuras ou moles"],
      leaves: ["Amareladas"],
    });
    expect(r.roots).toContain("Firmes, verdes ou prateadas");
    expect(r.roots).toContain("Raízes escuras");
    expect(r.roots).toContain("Raízes moles");
    expect(r.leaves).toContain("Folhas amareladas");
  });

  it("dedupes and drops non-string values", () => {
    const r = migrateLegacyDiagnosis({
      roots: ["Firmes", "Firmes", 42, null],
      environment: ["Boa luz", "Boa luz"],
      wateringAndRoutine: ["Rego semanal"],
      routine: ["Rego semanal"],
      potAndSubstrate: ["Vaso com furos"],
    });
    expect(r.roots).toEqual(["Firmes, verdes ou prateadas"]);
    expect(r.environment).toEqual(["Boa luz"]);
    expect(r.wateringAndRoutine).toEqual(["Rego semanal"]);
    expect(r.potAndSubstrate).toEqual(["Vaso com furos"]);
  });
});

describe("normalizeDiagnosisGuidance", () => {
  it("rejects non-object or invalid category/classification", () => {
    expect(normalizeDiagnosisGuidance(null)).toBeNull();
    expect(normalizeDiagnosisGuidance({ id: "x", category: "bogus", classification: "favorable" })).toBeNull();
    expect(normalizeDiagnosisGuidance({ id: "x", category: "roots", classification: "bad" })).toBeNull();
    expect(normalizeDiagnosisGuidance({ id: "", category: "roots", classification: "favorable" })).toBeNull();
  });
  it("accepts a well-formed guidance object", () => {
    const g = normalizeDiagnosisGuidance({ id: "roots:x", category: "roots", classification: "favorable" });
    expect(g).not.toBeNull();
    expect(g?.category).toBe("roots");
  });
});

describe("normalizeDiagnosisResult", () => {
  it("returns null for non-object input", () => {
    expect(normalizeDiagnosisResult(null)).toBeNull();
    expect(normalizeDiagnosisResult("x")).toBeNull();
  });
  it("returns null when any bucket is not an array", () => {
    expect(
      normalizeDiagnosisResult({ favorable: [], adjustments: [], priorities: null, insufficientInformation: [] }),
    ).toBeNull();
  });
  it("normalizes a valid result with the current scoring formula", () => {
    const valid: DiagnosisResult = {
      favorable: [],
      adjustments: [],
      priorities: [],
      insufficientInformation: [],
      trackingPoints: [],
      healthScore: 100,
      healthStatus: { label: "Saudável", tone: "green", message: "ok" },
      conflicts: [],
      insights: [],
      completedAt: "2026-01-01T00:00:00.000Z",
      answersVersion: 1,
    };
    const normalized = normalizeDiagnosisResult(valid);
    expect(normalized).toEqual({
      ...valid,
      healthStatus: {
        label: "Saudável",
        tone: "green",
        message: "Sua orquídea mostra sinais consistentes de saúde. Mantenha a rotina.",
      },
    });
  });

  it("recalculates a persisted score produced by an older formula", () => {
    const guidance = (classification: DiagnosisGuidance["classification"], id: string): DiagnosisGuidance => ({
      id,
      category: "roots",
      classification,
    } as DiagnosisGuidance);
    const persisted = {
      favorable: [guidance("favorable", "f-1")],
      adjustments: Array.from({ length: 6 }, (_, index) => guidance("adjustment", `a-${index}`)),
      priorities: Array.from({ length: 3 }, (_, index) => guidance("priority", `p-${index}`)),
      insufficientInformation: [],
      trackingPoints: [],
      healthScore: 0,
      healthStatus: { label: "Requer atenção imediata", tone: "warn", message: "antigo" },
      conflicts: [],
      insights: [],
      completedAt: "2026-01-01T00:00:00.000Z",
      answersVersion: 1,
    };

    const normalized = normalizeDiagnosisResult(persisted);
    expect(normalized?.healthScore).toBe(54);
    expect(normalized?.healthStatus.label).toBe("Em recuperação");
  });

  it("backfills health score, conflicts and insights for legacy results", () => {
    const legacy = {
      favorable: [],
      adjustments: [],
      priorities: [],
      insufficientInformation: [],
      trackingPoints: [],
      completedAt: "2026-01-01T00:00:00.000Z",
      answersVersion: 1,
    };
    const out = normalizeDiagnosisResult(legacy);
    expect(out?.healthScore).toBe(100);
    expect(out?.healthStatus.label).toBe("Saudável");
    expect(out?.conflicts).toEqual([]);
    expect(out?.insights).toEqual([]);
  });
});

describe("reconcileDiagnosisResultState", () => {
  const result: DiagnosisResult = {
    favorable: [],
    adjustments: [],
    priorities: [],
    insufficientInformation: [],
    trackingPoints: [],
    healthScore: 100,
    healthStatus: { label: "Saudável", tone: "green", message: "ok" },
    conflicts: [],
    insights: [],
    completedAt: null,
    answersVersion: 3,
  };

  it("forces status 'none' when result is null", () => {
    expect(reconcileDiagnosisResultState(null, "fresh", 3)).toEqual({
      diagnosisResult: null,
      diagnosisStatus: "none",
    });
  });
  it("marks 'outdated' when answersVersion differs", () => {
    const r = reconcileDiagnosisResultState(result, "fresh", 4);
    expect(r.diagnosisStatus).toBe("outdated");
  });
  it("upgrades 'none' to 'fresh' when versions match", () => {
    expect(reconcileDiagnosisResultState(result, "none", 3).diagnosisStatus).toBe("fresh");
  });
  it("preserves 'outdated' status when versions match", () => {
    expect(reconcileDiagnosisResultState(result, "outdated", 3).diagnosisStatus).toBe("outdated");
  });
});

describe("normalizeDays / normalizeApplications / normalizeFinalEval", () => {
  it("keeps only integer keys 1..21", () => {
    const out = normalizeDays({ 1: { x: 1 }, 22: { x: 1 }, abc: {}, 0: {} });
    expect(Object.keys(out)).toEqual(["1"]);
  });
  it("returns [] for non-array applications", () => {
    expect(normalizeApplications(null)).toEqual([]);
  });
  it("keeps only plain-object applications", () => {
    expect(normalizeApplications([{ id: "a" }, "x", 1, null])).toEqual([{ id: "a" }]);
  });
  it("returns a safe default for finalEval when input is invalid", () => {
    expect(normalizeFinalEval(null)).toEqual({ improved: "", same: "", attention: "", keep: "", path: "" });
  });
});

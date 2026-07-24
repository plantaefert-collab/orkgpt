import { describe, it, expect } from "bun:test";
import {
  computeDiagnosisResult,
  computeInsights,
  deriveHealthScore,
  totalObservations,
  type DiagnosisAnswers,
  type DiagnosisCategory,
} from "../diagnosis-matrix";

const EMPTY: DiagnosisAnswers = {
  roots: [],
  leaves: [],
  environment: [],
  potAndSubstrate: [],
  wateringAndRoutine: [],
};

function withAnswers(patch: Partial<Record<DiagnosisCategory, string[]>>): DiagnosisAnswers {
  return { ...EMPTY, ...patch };
}

describe("totalObservations", () => {
  it("returns 0 for empty answers", () => {
    expect(totalObservations(EMPTY)).toBe(0);
  });

  it("sums answers across categories", () => {
    const a = withAnswers({ roots: ["a", "b"], leaves: ["c"] });
    expect(totalObservations(a)).toBe(3);
  });
});

describe("computeDiagnosisResult", () => {
  it("returns only insufficient-info guidance when no observations exist", () => {
    const r = computeDiagnosisResult(EMPTY, 1, "2026-01-01T00:00:00.000Z");
    expect(r.favorable).toHaveLength(0);
    expect(r.adjustments).toHaveLength(0);
    expect(r.priorities).toHaveLength(0);
    expect(r.insufficientInformation.length).toBeGreaterThan(0);
    expect(r.trackingPoints).toEqual([]);
    expect(r.completedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(r.answersVersion).toBe(1);
  });

  it("classifies a favorable answer correctly", () => {
    const r = computeDiagnosisResult(
      withAnswers({ roots: ["Firmes, verdes ou prateadas"] }),
      2,
    );
    expect(r.favorable).toHaveLength(1);
    expect(r.favorable[0]?.classification).toBe("favorable");
    expect(r.adjustments).toHaveLength(0);
    expect(r.priorities).toHaveLength(0);
    expect(r.insufficientInformation).toHaveLength(0);
  });

  it("classifies adjustment and priority answers into separate buckets", () => {
    const r = computeDiagnosisResult(
      withAnswers({ roots: ["Poucas raízes visíveis", "Raízes moles"] }),
      3,
    );
    expect(r.adjustments.map((g) => g.answer)).toContain("Poucas raízes visíveis");
    expect(r.priorities.map((g) => g.answer)).toContain("Raízes moles");
  });

  it("orders priorities by severity (most urgent first), regardless of input order", () => {
    // "Mau cheiro..." (severity 90) is more urgent than "Raízes moles" (severity 80).
    const r = computeDiagnosisResult(
      withAnswers({
        roots: ["Raízes moles", "Mau cheiro próximo às raízes ou ao substrato"],
      }),
      1,
    );
    expect(r.priorities[0]?.answer).toBe("Mau cheiro próximo às raízes ou ao substrato");
    expect(r.priorities[1]?.answer).toBe("Raízes moles");
  });

  it("ranks the most severe priority first across categories", () => {
    const r = computeDiagnosisResult(
      withAnswers({
        wateringAndRoutine: ["Uso vários fertilizantes ou produtos ao mesmo tempo"], // 55
        leaves: ["Queda ou deterioração rápida das folhas"], // 100
        potAndSubstrate: ["Água acumulada no pratinho ou cachepot"], // 75
      }),
      1,
    );
    expect(r.priorities.map((g) => g.answer)).toEqual([
      "Queda ou deterioração rápida das folhas",
      "Água acumulada no pratinho ou cachepot",
      "Uso vários fertilizantes ou produtos ao mesmo tempo",
    ]);
  });

  it("dedupes tracking points and caps them at 5", () => {
    const r = computeDiagnosisResult(
      withAnswers({
        roots: [
          "Raízes moles",
          "Mau cheiro próximo às raízes ou ao substrato",
          "Poucas raízes visíveis",
          "Raízes secas ou ocas",
          "Raízes escuras",
        ],
      }),
      1,
    );
    expect(r.trackingPoints.length).toBeLessThanOrEqual(5);
    expect(new Set(r.trackingPoints).size).toBe(r.trackingPoints.length);
  });

  it("ignores unknown/inconsistent answer strings without throwing", () => {
    const r = computeDiagnosisResult(
      withAnswers({
        roots: ["Firmes, verdes ou prateadas", "resposta inexistente xyz"],
      }),
      1,
    );
    expect(r.favorable).toHaveLength(1);
    expect(r.adjustments).toHaveLength(0);
    expect(r.priorities).toHaveLength(0);
  });

  it("defaults completedAt to a valid ISO timestamp when omitted", () => {
    const r = computeDiagnosisResult(EMPTY, 0);
    expect(typeof r.completedAt).toBe("string");
    expect(Number.isNaN(Date.parse(r.completedAt as string))).toBe(false);
  });

  it("propagates the given answersVersion", () => {
    const r = computeDiagnosisResult(EMPTY, 42);
    expect(r.answersVersion).toBe(42);
  });
});

describe("deriveHealthScore", () => {
  it("returns a perfect band with no issues", () => {
    const { healthScore, healthStatus } = deriveHealthScore(0, 0, 0);
    expect(healthScore).toBe(100);
    expect(healthStatus.label).toBe("Saudável");
    expect(healthStatus.tone).toBe("green");
  });

  it("keeps an explicit score and flags urgent attention with many priorities", () => {
    const { healthScore, healthStatus } = deriveHealthScore(0, 0, 6);
    expect(healthScore).toBe(25);
    expect(healthStatus.label).toBe("Requer atenção imediata");
    expect(healthStatus.tone).toBe("warn");
  });

  it("uses a proportional weighted average across classified signals", () => {
    // (2*100 + 1*60 + 1*25) / 4 = 71.25 -> 71
    expect(deriveHealthScore(2, 1, 1).healthScore).toBe(71);
    // (1*60 + 2*25) / 3 = 36.67 -> 37
    const mid = deriveHealthScore(0, 1, 2);
    expect(mid.healthScore).toBe(37);
    expect(mid.healthStatus.label).toBe("Requer atenção imediata");
  });

  it("keeps a dense mixed diagnosis away from an artificial zero", () => {
    const mixed = deriveHealthScore(1, 6, 3);
    expect(mixed.healthScore).toBe(54);
    expect(mixed.healthStatus.label).toBe("Em recuperação");
  });
});

describe("computeDiagnosisResult — score / conflicts / insights", () => {
  it("attaches healthScore and healthStatus to the result", () => {
    const r = computeDiagnosisResult(withAnswers({ roots: ["Raízes moles"] }), 1);
    expect(r.healthScore).toBe(25);
    expect(r.healthStatus.label).toBe("Requer atenção imediata");
  });

  it("detects opposing signals in the same category as a conflict", () => {
    const r = computeDiagnosisResult(
      withAnswers({ roots: ["Firmes, verdes ou prateadas", "Raízes moles"] }),
      1,
    );
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toEqual({
      category: "roots",
      favorable: "Firmes, verdes ou prateadas",
      priority: "Raízes moles",
    });
  });

  it("does not flag a conflict when only one polarity is present", () => {
    const r = computeDiagnosisResult(withAnswers({ roots: ["Raízes moles"] }), 1);
    expect(r.conflicts).toHaveLength(0);
  });

  it("synthesizes an over-watering insight when >=2 related signals are marked", () => {
    const r = computeDiagnosisResult(
      withAnswers({
        roots: ["Raízes moles"],
        potAndSubstrate: ["Água acumulada no pratinho ou cachepot"],
      }),
      1,
    );
    expect(r.insights.map((i) => i.id)).toContain("excesso-de-agua");
    const insight = r.insights.find((i) => i.id === "excesso-de-agua");
    expect(insight?.relatedAnswers.length).toBeGreaterThanOrEqual(2);
  });

  it("does not synthesize the over-watering insight for a single related signal", () => {
    const insights = computeInsights(withAnswers({ roots: ["Raízes moles"] }));
    expect(insights).toHaveLength(0);
  });
});

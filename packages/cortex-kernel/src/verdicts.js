// Post-ladder literature evaluation — the frozen verifyCascade "steps 3-4"
// run verbatim. This is the EXPLICIT epistemic boundary: the deterministic
// ladder (advancement.js) stops at EPISTEMICALLY_SUPPORTED; novelty class,
// final verdict, and prize candidacy live here and depend on a literature
// count that, in the standalone, comes from the network. The count is an
// INPUT (litGround/litCount); no network call is made.
//
// Transient ids (prereg:*, cand:*) and timestamps are stripped by
// canonicalization, so a fixed placeholder is used — the decision is unchanged.

import { LIT_KNOWN, LIT_EMERGING } from "./types.js";
import { NULL_TRACER } from "./internal/trace.js";

/** Literature novelty classification (classifyLit), verbatim. */
export const classifyLit = (count) =>
  count == null ? "UNVERIFIED" : (count > LIT_KNOWN ? "KNOWN" : (count >= LIT_EMERGING ? "EMERGING" : "UNEXPLORED"));

/** Final verdict from grounding, novelty class, and the hollow verdict. */
export const deriveFinalVerdict = ({ grounded, litClass, hollowVerdict }) =>
  !grounded ? "INCOHERENT" : (litClass === "OFF" ? hollowVerdict : (litClass === "UNEXPLORED" ? "PROMISING" : litClass));

/**
 * Apply the literature layer to a deterministic decision.
 *   opts: { litGround, litCount, item, meta }
 *     item = { hollow, combination, usesFromA, usesFromB, sharedMechanism,
 *              hollowCheck, litQuery, schemaA, schemaB }  (normalized schemas)
 *     meta = { cellName, density, cell }
 * Returns the literature fields plus prizeCandidate and probeLogEntry, in the
 * exact projected shape (fields absent when the frozen source leaves them so).
 */
export const applyLiteratureAssessment = (decision, { litGround = false, litCount = null, item = {}, meta = {} }, tracer = NULL_TRACER) => {
  const cellName = meta.cellName || "cellA×cellB";
  const density = meta.density || 0;
  const hollowVerdict = item.hollow || "PLAUSIBLE";
  const grounded = hollowVerdict !== "LIKELY-HOLLOW";
  const pass = decision.typeCheck && decision.typeCheck.pass;

  let lit; // literature-derived fields (present only on pass, mirroring frozen)
  if (!pass) {
    lit = {
      mechanismGrounded: grounded,
      litClass: "SKIPPED",
      finalVerdict: "INCOHERENT",
      verifications: [{ instrument: "typecheck", result: "fail", reason: decision.typeCheck.reason, at: "" }],
    };
  } else {
    const preregId = "prereg:kernel"; // stripped by canonicalization
    const l = litGround ? { count: litCount, top: [] } : { count: null, skipped: true };
    const litClass = l.skipped ? "OFF" : classifyLit(l.count);
    const finalVerdict = deriveFinalVerdict({ grounded, litClass, hollowVerdict });
    lit = {
      mechanismGrounded: grounded,
      litClass,
      litCount: l.count,
      litNote: l.note,
      modelEstimated: !!l.modelEstimated,
      finalVerdict,
      verifications: [
        { instrument: "typecheck", result: "pass", sharedObject: decision.typeCheck.sharedObject, at: "" },
        { instrument: !!l.modelEstimated ? "model-estimate (UNVERIFIED)" : "openalex", result: litClass, count: l.count, preregId, at: "" },
      ],
      preregId,
    };
  }
  tracer.record({ step: "literature", litGround, litCount, litClass: lit.litClass, finalVerdict: lit.finalVerdict });

  // prize candidacy (step 4)
  const prize = pass && decision.stage === "EPISTEMICALLY_SUPPORTED" && grounded && lit.litClass === "UNEXPLORED" && !lit.modelEstimated;
  let prizeCandidate = null;
  if (prize) {
    prizeCandidate = {
      id: "cand:kernel", at: "", cell: cellName,
      combination: item.combination, usesFromA: item.usesFromA, usesFromB: item.usesFromB,
      sharedMechanism: item.sharedMechanism, hollowCheck: item.hollowCheck,
      typeCheck: decision.typeCheck, mechCompat: decision.mechCompat, mechClass: decision.mechClass,
      bridge: decision.bridge, obligations: decision.obligations, impossibility: decision.impossibility,
      schemaA: item.schemaA, schemaB: item.schemaB,
      litQuery: item.litQuery || "query terms", litCount: lit.litCount, litTop: [],
      preregId: lit.preregId, producedBy: "model:in-artifact", status: "candidate-awaiting-independent-verification",
    };
  }

  const known = lit.litClass === "KNOWN" ? 1 : 0, emerging = lit.litClass === "EMERGING" ? 1 : 0;
  const probeLogEntry = {
    cellName, density,
    paperCount: (lit.litCount != null) ? lit.litCount : null,
    verdict: prizeCandidate ? "CANDIDATE" : (emerging ? "EMERGING" : (known ? "KNOWN" : "INCOHERENT")),
    prize: !!prizeCandidate,
    killedByType: pass ? 0 : 1,
    mechClasses: decision.mechClass ? [decision.mechClass] : [],
    at: "",
  };

  return { ...lit, prizeCandidate, probeLogEntry };
};

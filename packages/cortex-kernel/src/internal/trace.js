// Explainability trace channel — structurally separate from the canonical
// decision. A tracer is an opt-in sink; the default is a no-op. Decision
// logic must never branch on whether a tracer is present, so enabling trace
// cannot change any canonical output (enforced by a differential test).

/** No-op tracer: records nothing. The default everywhere. */
export const NULL_TRACER = Object.freeze({
  record() {},
  child() { return NULL_TRACER; },
});

/** A collecting tracer. `entries` accumulates { phase, ...record } objects. */
export const createTracer = (phase = "root") => {
  const entries = [];
  const tracer = {
    entries,
    record(record) { entries.push({ phase, ...record }); return tracer; },
    child(childPhase) {
      const c = createTracer(childPhase);
      entries.push({ phase, child: c.entries });
      return c;
    },
  };
  return tracer;
};

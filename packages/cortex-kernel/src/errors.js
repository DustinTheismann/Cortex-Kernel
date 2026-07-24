// Error taxonomy for the extracted kernel.
//
// Two distinct failure modes are kept separate:
//   - BrainIndexError: how the frozen loader rejects bad import input. The
//     message text is part of observable v0.5.1 behavior and must match the
//     standalone exactly (e.g. "missing repos[] array").
//   - RegistryIntegrityError: a Phase-2 integrity assertion tripped (a
//     corrupt registry / definition set). These guard against corruption of
//     the extracted material; they never fire for valid v0.5.1 data and thus
//     never alter valid behavior.

export class KernelError extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
}

/** Loader rejection — message text mirrors the frozen onFile behavior. */
export class BrainIndexError extends KernelError {}

/** Structural corruption of the extracted definitions/registry (fail-closed). */
export class RegistryIntegrityError extends KernelError {}

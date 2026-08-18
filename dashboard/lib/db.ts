// Supabase mutations return errors in the result rather than throwing, so an
// unchecked `await supabase.from(...).insert(...)` swallows every failure — the
// UI closes and reports success while the row was never written. Entries typed
// into a dialog exist nowhere else, so a swallowed write is unrecoverable.
//
// Wrap every mutation in this. It returns null on success, or a message to show
// the user. Callers must not proceed to their success path on a non-null result.

type MutationResult = { error: { message: string } | null };

// Used whenever the underlying error carries no usable message, so the return
// value is always either null (success) or a non-empty string (failure).
const FALLBACK_MESSAGE = "Unknown database error";

export async function mutate(
  op: PromiseLike<MutationResult>,
): Promise<string | null> {
  try {
    const { error } = await op;
    if (error) {
      console.error("[db] mutation failed:", error.message);
      // Never return a falsy string. Callers guard with `if (err)`, so an error
      // carrying a blank message would otherwise read as success — reintroducing
      // the exact swallowed-write bug this module exists to prevent.
      return error.message || FALLBACK_MESSAGE;
    }
    return null;
  } catch (e) {
    // Network failure or a thrown client error — never reaches the result shape.
    const message = e instanceof Error ? e.message : "";
    console.error("[db] mutation threw:", message || FALLBACK_MESSAGE);
    return message || FALLBACK_MESSAGE;
  }
}

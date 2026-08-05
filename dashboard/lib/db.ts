// Supabase mutations return errors in the result rather than throwing, so an
// unchecked `await supabase.from(...).insert(...)` swallows every failure — the
// UI closes and reports success while the row was never written. Entries typed
// into a dialog exist nowhere else, so a swallowed write is unrecoverable.
//
// Wrap every mutation in this. It returns null on success, or a message to show
// the user. Callers must not proceed to their success path on a non-null result.

type MutationResult = { error: { message: string } | null };

export async function mutate(
  op: PromiseLike<MutationResult>,
): Promise<string | null> {
  try {
    const { error } = await op;
    if (error) {
      console.error("[db] mutation failed:", error.message);
      return error.message;
    }
    return null;
  } catch (e) {
    // Network failure or a thrown client error — never reaches the result shape.
    const message = e instanceof Error ? e.message : "Something went wrong";
    console.error("[db] mutation threw:", message);
    return message;
  }
}

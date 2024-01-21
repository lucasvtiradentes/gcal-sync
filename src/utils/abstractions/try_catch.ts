export async function tryCatch<TData>(promise: Promise<TData>) {
  try {
    return {
      data: await promise
    };
  } catch (e) {
    return { error: e };
  }
}

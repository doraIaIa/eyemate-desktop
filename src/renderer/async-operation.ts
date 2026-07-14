export const LOCAL_OPERATION_TIMEOUT = "LOCAL_OPERATION_TIMEOUT";

export async function withOperationTimeout<T>(operation: Promise<T>, timeoutMs = 10_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(LOCAL_OPERATION_TIMEOUT)), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

// Simple in-memory file locking mechanism

type ReleaseLockFunction = () => Promise<void>;

const locks = new Map<string, boolean>();

export async function acquireLock(filePath: string): Promise<ReleaseLockFunction> {
  const maxAttempts = 10;
  const retryDelay = 100; // ms
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!locks.has(filePath) || !locks.get(filePath)) {
      locks.set(filePath, true);
      return async () => {
        locks.set(filePath, false);
      };
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(`Failed to acquire lock for ${filePath} after ${maxAttempts} attempts`);
}
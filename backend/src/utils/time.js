let clockFn = () => new Date();

/**
 * Returns the current server Date (injectable via setClock for deterministic tests).
 */
export const now = () => clockFn();

/**
 * Returns the current server time in epoch milliseconds.
 */
export const nowMs = () => now().getTime();

/**
 * Overrides the server clock function for tests.
 */
export const setClock = (fn) => {
  clockFn = typeof fn === 'function' ? fn : () => new Date(fn);
};

/**
 * Restores the default system clock.
 */
export const resetClock = () => {
  clockFn = () => new Date();
};

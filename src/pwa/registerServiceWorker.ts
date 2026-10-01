/**
 * 3D Neuroanatomy Atlas: Phase 10 SW registration.
 * Standard: AAS-2026-NEURO-V1
 *
 * Single one-line host call (see docs/PHASE_10_COMPLETION_REPORT.md):
 *   void registerServiceWorker();
 * Safe to import anywhere: browser-only work happens inside the function,
 * which resolves null outside browsers or when workers are unsupported.
 * Mounting is wired from `index.html`; `src/main.ts` is untouched by design
 * (Phase 12 owns host mounting — see the completion report).
 *
 * NOTE: this file uses the literal `navigator.serviceWorker` under an explicit
 * Phase 10 waiver in `src/phase_3_1_integrity.test.ts` (the Phase 10 registry
 * entry authorizes service workers, so the token is permitted here and only
 * here). An earlier revision assembled the key from string fragments to dodge
 * the gate's grep; that was gate evasion and was replaced with this waiver.
 */

export interface RegisterOptions {
  /** Worker script URL, relative to the app scope. Defaults to `sw.js`. */
  swUrl?: string;
  /** Registration scope. Defaults to `./` (the `/neuro-atlas-3d/` subpath). */
  scope?: string;
}

interface WorkerContainer {
  register(url: string, options?: { scope?: string }): Promise<ServiceWorkerRegistration>;
}

/**
 * Register the Phase 10 worker exactly once per page load. Resolves the
 * registration, or null when registration is unavailable, skipped, or
 * failed. Never throws; never touches study-state storage.
 */
export async function registerServiceWorker(
  opts: RegisterOptions = {},
): Promise<ServiceWorkerRegistration | null> {
  try {
    const nav = globalThis.navigator as Navigator | undefined;
    const container = nav?.serviceWorker as WorkerContainer | undefined;
    if (!container || typeof container.register !== 'function') return null;
    const registration = await container.register(opts.swUrl ?? 'sw.js', {
      scope: opts.scope ?? './',
    });
    return registration;
  } catch (err) {
    console.warn('[PWA] SW registration failed (offline mode unavailable):', err);
    return null;
  }
}

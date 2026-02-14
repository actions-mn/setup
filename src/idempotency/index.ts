/**
 * Idempotency module for setup-metanorma action.
 *
 * Provides functionality to detect when Metanorma is already installed
 * and skip redundant installations.
 *
 * @example
 * ```typescript
 * import { IdempotencyManager } from './idempotency/index.js';
 *
 * const idempotency = new IdempotencyManager();
 * const result = await idempotency.checkAndSkipIfAlreadyInstalled(settings);
 *
 * if (result.shouldSkip) {
 *   core.info(`Skipping installation: ${result.details}`);
 *   return;
 * }
 * ```
 */

export {IdempotencyManager} from './idempotency-manager.js';
export * from './types.js';

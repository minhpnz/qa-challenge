/* eslint-disable no-console */
/**
 * Deliberately tiny. Test logs compete with the reporter for attention, so the
 * bar for emitting one is high: step names belong in `test.step`, not here.
 * This exists for the few cross-cutting facts a failure triager needs (which
 * ephemeral user a test used, which environment it hit).
 */
export const logger = {
  info(message: string, context: Record<string, unknown> = {}): void {
    console.log(format('info', message, context));
  },
  warn(message: string, context: Record<string, unknown> = {}): void {
    console.warn(format('warn', message, context));
  },
  error(message: string, context: Record<string, unknown> = {}): void {
    console.error(format('error', message, context));
  },
};

function format(level: string, message: string, context: Record<string, unknown>): string {
  const suffix = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
  return `[${level}] ${message}${suffix}`;
}

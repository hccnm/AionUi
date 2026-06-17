declare global {
  interface Console {
    __AionWebConsolePatched__?: boolean;
  }
}

const SILENCED_CONSOLE_PATTERNS = [
  'accessing element.ref was removed in react 19',
  'ref is now a regular prop',
  'each child in a list should have a unique "key" prop',
];

function messageFrom(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}

function shouldSilence(args: unknown[]): boolean {
  const normalized = args.map(messageFrom).join('\n').toLowerCase();
  return SILENCED_CONSOLE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function applyRuntimePatches(): void {
  if (typeof console === 'undefined' || console.__AionWebConsolePatched__) return;

  const rawError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (shouldSilence(args)) return;
    rawError(...args);
  };
  console.__AionWebConsolePatched__ = true;
}

applyRuntimePatches();

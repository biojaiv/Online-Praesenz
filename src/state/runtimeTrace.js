const listeners = new Set();
let sequence = 0;

export function traceExecution(event = {}) {
  const payload = Object.freeze({
    id: ++sequence,
    source: String(event.source || 'runtime'),
    code: String(event.code || ''),
    timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
  });

  for (const listener of listeners) {
    try {
      listener(payload);
    } catch (error) {
      console.error('Runtime trace listener failed:', error);
    }
  }
  return payload;
}

export function onRuntimeTrace(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

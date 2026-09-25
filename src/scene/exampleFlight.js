/** Reserve the current camera while a project is open, without moving it. */
export function createExampleFlight({ capture, restore }) {
  let snapshot = null;
  return {
    get active() { return snapshot !== null; },
    get state() { return snapshot ? 'open' : 'idle'; },
    get yaw() { return 0; },
    update() {},
    open() {
      if (snapshot) return Promise.resolve(false);
      snapshot = capture();
      return Promise.resolve(true);
    },
    close() {
      if (!snapshot) return Promise.resolve(false);
      restore(snapshot);
      snapshot = null;
      return Promise.resolve(true);
    },
    dispose() { if (snapshot) restore(snapshot); snapshot = null; },
  };
}

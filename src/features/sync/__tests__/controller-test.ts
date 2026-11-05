import { createSyncController, WRITE_DEBOUNCE_MS } from '../controller';
import type { SyncResult } from '../engine';

function fakeEngine() {
  const engine = {
    pending: 0,
    result: { pushed: 0, pulled: 0 } as SyncResult,
    fail: false,
    syncs: 0,
    async sync() {
      engine.syncs++;
      if (engine.fail) throw new Error('offline');
      engine.pending = 0;
      return engine.result;
    },
    async pendingCount() {
      return engine.pending;
    },
  };
  return engine;
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('sync controller', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('turns a burst of writes into one debounced sync', async () => {
    const engine = fakeEngine();
    const controller = createSyncController(engine);

    for (let i = 0; i < 5; i++) {
      engine.pending++;
      controller.noteWrite();
      jest.advanceTimersByTime(500);
    }
    expect(engine.syncs).toBe(0);
    await flush();
    expect(controller.getState()).toMatchObject({ status: 'pending', pending: 5 });

    jest.advanceTimersByTime(WRITE_DEBOUNCE_MS);
    await flush();

    expect(engine.syncs).toBe(1);
    expect(controller.getState()).toMatchObject({ status: 'synced', pending: 0 });
  });

  it('syncs immediately on request and cancels the pending debounce', async () => {
    const engine = fakeEngine();
    const controller = createSyncController(engine);
    controller.noteWrite();

    await controller.syncNow();
    jest.advanceTimersByTime(WRITE_DEBOUNCE_MS * 2);
    await flush();

    expect(engine.syncs).toBe(1);
  });

  it('bumps the revision only when a sync pulled something', async () => {
    const engine = fakeEngine();
    const controller = createSyncController(engine);

    await controller.syncNow();
    expect(controller.getState().revision).toBe(0);

    engine.result = { pushed: 0, pulled: 2 };
    await controller.syncNow();
    expect(controller.getState().revision).toBe(1);
  });

  it('keeps the pending count when offline, then recovers', async () => {
    const engine = fakeEngine();
    const controller = createSyncController(engine);
    engine.pending = 3;
    engine.fail = true;

    await controller.syncNow();
    expect(controller.getState()).toMatchObject({ status: 'pending', pending: 3 });

    engine.fail = false;
    await controller.syncNow();
    expect(controller.getState()).toMatchObject({ status: 'synced', pending: 0 });
  });

  it('reports an error when a sync fails with nothing pending', async () => {
    const engine = fakeEngine();
    const controller = createSyncController(engine);
    engine.fail = true;

    await controller.syncNow();

    expect(controller.getState().status).toBe('error');
  });

  it('notifies subscribers, and dispose cancels a scheduled sync', async () => {
    const engine = fakeEngine();
    const controller = createSyncController(engine);
    const listener = jest.fn();
    controller.subscribe(listener);

    await controller.syncNow();
    expect(listener).toHaveBeenCalled();

    controller.noteWrite();
    controller.dispose();
    jest.advanceTimersByTime(WRITE_DEBOUNCE_MS);
    await flush();
    expect(engine.syncs).toBe(1);
  });
});

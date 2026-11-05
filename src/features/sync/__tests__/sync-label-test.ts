import { syncLabel } from '../sync-label';

describe('syncLabel', () => {
  it('says synced when nothing is waiting', () => {
    expect(syncLabel({ status: 'synced', pending: 0, revision: 0 })).toBe('Synchronisé');
  });

  it('shows the pending count, with the singular for one', () => {
    expect(syncLabel({ status: 'pending', pending: 3, revision: 0 })).toBe('3 en attente');
    expect(syncLabel({ status: 'pending', pending: 1, revision: 0 })).toBe('1 en attente');
  });

  it('says syncing while a sync runs', () => {
    expect(syncLabel({ status: 'syncing', pending: 2, revision: 0 })).toBe('Synchronisation…');
  });

  it('reports an error', () => {
    expect(syncLabel({ status: 'error', pending: 0, revision: 0 })).toBe(
      'Erreur de synchronisation',
    );
  });
});

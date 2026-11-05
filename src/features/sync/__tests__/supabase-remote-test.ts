import { fromRemoteRow, pullStart, toRemoteRow } from '../supabase-remote';

describe('supabase row mapping', () => {
  it('adds the household and turns counts into a boolean when pushing', () => {
    expect(toRemoteRow({ id: 'e1', counts: 0, note: null }, 'h1')).toEqual({
      id: 'e1',
      counts: false,
      note: null,
      household_id: 'h1',
    });
    expect(toRemoteRow({ id: 'c1', name: 'Florence' }, 'h1')).not.toHaveProperty('counts');
  });

  it('normalises timestamps and drops server-only columns when pulling', () => {
    const row = fromRemoteRow({
      id: 'e1',
      household_id: 'h1',
      server_synced_at: '2026-11-02T14:00:01.123456+00:00',
      created_at: '2026-11-02T14:00:00+00:00',
      updated_at: '2026-11-02T14:00:00.250+00:00',
      deleted_at: null,
      occurred_at: '2026-11-02T13:59:00+00:00',
      local_date: '2026-11-02',
      counts: true,
      note: null,
    });
    expect(row).toEqual({
      id: 'e1',
      created_at: '2026-11-02T14:00:00.000Z',
      updated_at: '2026-11-02T14:00:00.250Z',
      deleted_at: null,
      occurred_at: '2026-11-02T13:59:00.000Z',
      local_date: '2026-11-02',
      counts: 1,
      note: null,
    });
  });

  it('resumes a pull slightly before the saved cursor', () => {
    expect(pullStart(null)).toBeNull();
    expect(pullStart('2026-11-02T14:00:10.000Z')).toBe('2026-11-02T14:00:05.000Z');
  });
});

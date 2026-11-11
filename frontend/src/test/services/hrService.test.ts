import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hrService } from '../../services/hrService';

describe('hrService error propagation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('throws an error on createStand when backend returns an error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Numele standului este obligatoriu' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(hrService.createStand({ locationName: '' })).rejects.toThrow(
      'Numele standului este obligatoriu'
    );
  });

  it('throws an error on deleteStand when backend fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Eroare la ștergerea standului pe server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(hrService.deleteStand('stand-123')).rejects.toThrow(
      'Eroare la ștergerea standului pe server.'
    );
  });

  it('throws an error on publicStandSignup when server returns failure payload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, message: 'Schimbul este deja ocupat complet.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(
      hrService.publicStandSignup('stand-1', {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '0712345678',
        shiftId: 'shift-1',
        roleId: 'role-1',
      })
    ).rejects.toThrow('Schimbul este deja ocupat complet.');
  });
});

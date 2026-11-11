import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailService } from '../../services/emailService';

describe('emailService template operations', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('copies a template and parses response', async () => {
    const mockCopied = {
      id: 'copy-123',
      name: 'Copy of Sponsor Gold',
      department: 'fundraising',
      subject: 'Parteneriat 2026',
      blocks: JSON.stringify([{ id: 'b1', type: 'header', title: 'Hello' }]),
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockCopied), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await emailService.copyTemplate('tmpl-1');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/admin/emails/templates/tmpl-1/copy',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.id).toBe('copy-123');
    expect(result.name).toBe('Copy of Sponsor Gold');
    expect(Array.isArray(result.blocks)).toBe(true);
    expect(result.blocks[0].title).toBe('Hello');
  });

  it('throws an error if copying fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Template not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(emailService.copyTemplate('missing-id')).rejects.toThrow('Failed to copy template: 404');
  });
});

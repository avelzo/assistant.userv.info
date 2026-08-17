import { describe, expect, it } from 'vitest';
import { hasAdminRole, ROLES } from '@/lib/roles';

describe('roles', () => {
  it('reconnaît uniquement le rôle admin côté serveur', () => {
    expect(hasAdminRole(ROLES.ADMIN)).toBe(true);
    expect(hasAdminRole(ROLES.USER)).toBe(false);
    expect(hasAdminRole('ADMIN')).toBe(false);
    expect(hasAdminRole(undefined)).toBe(false);
  });
});

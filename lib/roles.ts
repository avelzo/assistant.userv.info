export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export function hasAdminRole(role?: string | null): boolean {
  return role === ROLES.ADMIN;
}

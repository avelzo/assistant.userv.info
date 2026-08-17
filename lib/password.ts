import { compare, hash } from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

function isBcryptHash(value: string): boolean {
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(data: { password: string; hash: string }): Promise<boolean> {
  if (!data.hash) {
    return false;
  }

  if (isBcryptHash(data.hash)) {
    return compare(data.password, data.hash);
  }

  return false;
}

import { prisma } from '@/lib/prisma';

export async function getCreditPacks() {
  return prisma.creditPack.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

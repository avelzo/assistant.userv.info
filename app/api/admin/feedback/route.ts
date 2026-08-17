import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';
import { feedbackService } from '@/lib/feedback/feedback-service';
import { maskEmail } from '@/lib/admin/mask-email';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: admin.status });
  }

  const feedbacks = await feedbackService.listForAdmin({ take: 100 });
  const userIds = [...new Set(feedbacks.map((row) => row.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const emailById = new Map(users.map((user) => [user.id, maskEmail(user.email)]));

  return NextResponse.json({
    feedbacks: feedbacks.map((row) => ({
      ...row,
      emailMasked: emailById.get(row.userId) || '***',
    })),
  });
}

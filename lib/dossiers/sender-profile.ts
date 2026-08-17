import { prisma } from '@/lib/prisma';

export type SenderProfile = {
  fullName: string;
  addressLine: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
};

export async function loadSenderProfile(userId: string): Promise<SenderProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      firstname: true,
      lastname: true,
      addressLine: true,
      postalCode: true,
      city: true,
      phone: true,
      email: true,
    },
  });

  const fullName =
    [user?.firstname, user?.lastname].filter(Boolean).join(' ').trim() || (user?.name || '').trim();

  return {
    fullName,
    addressLine: user?.addressLine || '',
    postalCode: user?.postalCode || '',
    city: user?.city || '',
    phone: user?.phone || '',
    email: user?.email || '',
  };
}

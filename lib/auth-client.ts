'use client';

import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export function useAuthSession() {
  const { data, isPending } = authClient.useSession();

  return {
    data,
    status: (isPending ? 'loading' : data ? 'authenticated' : 'unauthenticated') as
      | 'loading'
      | 'authenticated'
      | 'unauthenticated',
  };
}

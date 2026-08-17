import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { sendResetPasswordEmailMessage, sendVerificationEmailMessage } from '@/lib/auth-emails';
import { getAllowedOrigins } from '@/lib/origin';
import { getTrustedClientIp } from '@/lib/ip';
import { consumeRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { recordSecurityEvent } from '@/lib/security-event';
import { ROLES } from '@/lib/roles';

function authSecret(): string {
  return process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
}

function authBaseUrl(): string {
  return String(process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
}

export const auth = betterAuth({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Assistant Administratif AI',
  baseURL: authBaseUrl(),
  secret: authSecret(),
  trustedOrigins: getAllowedOrigins(),
  telemetry: { enabled: false },
  database: prismaAdapter(prisma, {
    provider: 'mongodb',
  }),
  advanced: {
    database: {
      generateId: false,
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      firstname: {
        type: 'string',
        required: false,
        input: true,
      },
      lastname: {
        type: 'string',
        required: false,
        input: true,
      },
    },
    changeEmail: {
      enabled: false,
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmailMessage({ to: user.email, url });
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 72,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmailMessage({ to: user.email, url });
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-up/email') {
        throw new APIError('FORBIDDEN', { message: 'Inscription indisponible.' });
      }

      if (ctx.path !== '/send-verification-email') {
        return;
      }

      const request = ctx.request;
      if (!request) {
        return;
      }

      const ip = getTrustedClientIp(request);
      const limit = await consumeRateLimit({
        key: `verify-email:ip:${ip}`,
        windowMs: RATE_LIMITS.verifyEmailIp.windowMs,
        max: RATE_LIMITS.verifyEmailIp.max,
      });

      if (!limit.allowed) {
        await recordSecurityEvent({
          kind: 'RATE_LIMIT',
          route: '/api/auth/send-verification-email',
          status: 429,
          ip,
        });
        throw new APIError('TOO_MANY_REQUESTS', { message: 'Trop de tentatives. Réessayez plus tard.' });
      }
    }),
  },
  plugins: [
    admin({
      defaultRole: ROLES.USER,
      adminRoles: [ROLES.ADMIN],
    }),
    nextCookies(),
  ],
});

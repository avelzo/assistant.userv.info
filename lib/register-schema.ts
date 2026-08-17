import { z } from 'zod';

export const REGISTER_MIN_PASSWORD = 8;
export const REGISTER_MAX_PASSWORD = 72;
export const REGISTER_MIN_SUBMIT_MS = Number(process.env.REGISTER_MIN_SUBMIT_MS || '1500');

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3)
    .max(254)
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(REGISTER_MIN_PASSWORD).max(REGISTER_MAX_PASSWORD),
  firstname: z.string().trim().min(1).max(80),
  lastname: z.string().trim().max(80).optional(),
  recaptchaToken: z.string().min(1),
  formStartedAt: z.number().finite(),
  website: z.string().max(200).optional(),
  acceptedTerms: z.literal(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;

import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email();

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

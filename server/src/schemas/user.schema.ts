import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const registerBodySchema = z.object({
  username: usernameSchema,
  email: z.email(),
  password: passwordSchema,
});

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileBodySchema = z
  .object({
    username: usernameSchema.optional(),
    avatarUrl: z.url("Invalid URL format").optional(),
  })
  .refine(
    (data) => data.username !== undefined || data.avatarUrl !== undefined,
    { message: "At least one of username or avatarUrl must be provided" }
  );

export const changePasswordBodySchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const requestEmailChangeBodySchema = z.object({
  newEmail: z.email(),
});

export const verifyEmailQuerySchema = z.object({
  token: z.uuid("Invalid token format"),
});


export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
export type RequestEmailChangeBody = z.infer<typeof requestEmailChangeBodySchema>;
export type VerifyEmailQuery = z.infer<typeof verifyEmailQuerySchema>;
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthPort } from "@/application/auth/ports/auth-port";

/**
 * Supabase Auth adapter. `emailRedirectTo` points back to the app's auth callback
 * route, which exchanges the confirmation/reset code for a session.
 */
export class SupabaseAuthAdapter implements AuthPort {
  constructor(
    private readonly client: SupabaseClient,
    private readonly siteUrl: string,
  ) {}

  async signUp(input: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<{ userId: string }> {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName },
        emailRedirectTo: `${this.siteUrl}/auth/callback`,
      },
    });
    if (error || !data.user)
      throw error ?? new Error("Sign up did not return a user");
    return { userId: data.user.id };
  }

  async signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<{ userId: string }> {
    const { data, error } = await this.client.auth.signInWithPassword(input);
    if (error || !data.user)
      throw error ?? new Error("Sign in did not return a user");
    return { userId: data.user.id };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${this.siteUrl}/auth/callback?next=/reset-password/confirm`,
    });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  }

  async getCurrentUserId(): Promise<string | null> {
    const { data } = await this.client.auth.getUser();
    return data.user?.id ?? null;
  }
}

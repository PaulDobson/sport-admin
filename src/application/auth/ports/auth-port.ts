/** Port for authentication operations. Infrastructure implements this against Supabase Auth. */
export interface AuthPort {
  signUp(input: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<{ userId: string }>;
  signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<{ userId: string }>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  getCurrentUserId(): Promise<string | null>;
}

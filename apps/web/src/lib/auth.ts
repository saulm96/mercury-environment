import { API_ORIGIN } from './api';

export async function signOut(): Promise<void> {
  try {
    await fetch(`${API_ORIGIN}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Logout is best-effort; the caller should redirect regardless.
  }
}

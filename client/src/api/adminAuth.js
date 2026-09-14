const KEY = "interviewPrep.adminSecret";

export function getAdminSecret() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setAdminSecret(secret) {
  try {
    if (secret) localStorage.setItem(KEY, secret);
    else localStorage.removeItem(KEY);
  } catch {
    // Ignore (private browsing / storage disabled) — admin just won't stay
    // logged in across refreshes.
  }
}

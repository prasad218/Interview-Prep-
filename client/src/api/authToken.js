const KEY = "interviewPrep.authToken";

export function getToken() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    // Ignore (private browsing / storage disabled) — user just won't stay
    // logged in across refreshes.
  }
}

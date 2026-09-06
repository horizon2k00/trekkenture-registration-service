const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "trekkenture-admin-token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Shared JSON client. Admin calls attach the session token by default; a 401
 * clears stale authentication and notifies the auth context immediately.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token = getStoredToken();
  if (authenticated && token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = Array.isArray(body.message)
        ? body.message.join(", ")
        : body.message || message;
    } catch {
      // Keep the HTTP fallback when the response is not JSON.
    }
    if (response.status === 401 && authenticated) {
      storeToken(null);
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Downloads a protected XLSX response export without navigating away. */
export async function downloadExport(formId: string, slug: string) {
  const token = getStoredToken();
  const response = await fetch(
    `${API_URL}/admin/forms/${formId}/submissions/export`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    if (response.status === 401) {
      storeToken(null);
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    throw new ApiError("Could not export responses", response.status);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}-responses.xlsx`;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start reading the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

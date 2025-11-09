//  this code is used to standardize the api calls to the backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function readAccessToken(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const cookieMatch = document.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
  if (cookieMatch?.[1]) {
    return decodeURIComponent(cookieMatch[1]);
  }

  const stored = window.localStorage.getItem("accessToken");
  return stored ?? undefined;
}

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = readAccessToken();
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  if (options.headers) {
    const custom = new Headers(options.headers as HeadersInit);
    custom.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

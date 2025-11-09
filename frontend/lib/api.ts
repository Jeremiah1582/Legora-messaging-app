//  this code is used to standardize the api calls to the backend

import { cookies } from "next/headers"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export async function apiCall(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let token: string | null = null;

  if (typeof window === 'undefined') {
    // Server-side: use Next.js cookies API
    const cookieToken = (await cookies()).get('token');
    token = cookieToken?.value || null;
  } else {
    // Client-side: use document.cookie or a library like js-cookie
    const match = document.cookie.match(/(^|;)\\s*token=([^;]*)/);
    token = match ? decodeURIComponent(match[2]) : null;
  }

  const headers: HeadersInit & { Authorization?: string } = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${endpoint}`, { ...options, headers });
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';

interface AuthResponse {
  message: string;
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

type Mode = 'login' | 'register';

function persistSession(accessToken: string, user: AuthResponse['user']) {
  const maxAgeSeconds = 15 * 60; // align with backend access token expiry
  const secure = window.location.protocol === 'https:';
  // document.cookie = `accessToken=${encodeURIComponent(
  //   accessToken,
  // )}; path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure ? '; Secure' : ''}`;

  // storing accesstoken in local storage instead of cookie to avoid cors issues for now
  window.localStorage.setItem('accessToken', accessToken);

  if (user) {
    window.localStorage.setItem('currentUser', JSON.stringify(user));
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const existingToken = window.localStorage.getItem('accessToken');
    if (existingToken) {
      router.replace('/conversations');
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const isRegister = mode === 'register';
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister ? { email, password, name } : { email, password };

    setIsLoading(true);
    try {
      const response = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data: AuthResponse = await response.json();
      if (!response.ok) {
        const parsed = data as { message?: string; error?: string };
        setError(parsed.error || parsed.message || 'Unable to complete request');
        return;
      }

      if (isRegister) {
        setInfo('Account created. You can log in now.');
        setMode('login');
        setName('');
        setPassword('');
        return;
      }

      if (!data.accessToken || !data.user) {
        setError('Login succeeded but access token was missing.');
        return;
      }

      persistSession(data.accessToken, data.user);
      router.push('/conversations');
    } catch (err) {
      console.error('Authentication error:', err);
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-6 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h1 className="h3 mb-3 text-center">
                {mode === 'login' ? 'Log in to message' : 'Create your account'}
              </h1>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              {info && (
                <div className="alert alert-success" role="alert">
                  {info}
                </div>
              )}

              <form onSubmit={handleSubmit} className="d-grid gap-3">
                {mode === 'register' && (
                  <div>
                    <label htmlFor="name" className="form-label">
                      Name
                    </label>
                    <input
                      id="name"
                      className="form-control"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    id="email"
                    className="form-control"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    id="password"
                    className="form-control"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                  />
                </div>

                <button
                  className="btn btn-primary w-100"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Register'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError(null);
                    setInfo(null);
                  }}
                >
                  {mode === 'login'
                    ? "Need an account? Register here."
                    : 'Already registered? Log in instead.'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


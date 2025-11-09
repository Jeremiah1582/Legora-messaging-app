'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';

interface MinimalUser {
  id: string;
  email: string;
  name: string;
}

interface ConversationParticipant {
  user: MinimalUser;
}

interface ConversationMessage {
  id: string;
  content: string;
  createdAt: string;
  sender?: MinimalUser;
}

interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
}

type ConversationResponse =
  | Conversation
  | {
      message: string;
      conversation: Conversation;
    };

export default function ConversationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<MinimalUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<MinimalUser[]>([]);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    const storedUser = window.localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (err) {
        console.warn('Failed to parse cached user', err);
      }
    }

    const fetchInitialData = async () => {
      try {
        const [conversationsRes, usersRes] = await Promise.all([
          apiCall('/api/conversations'),
          apiCall('/api/user/all_users'),
        ]);

        if (conversationsRes.status === 401 || usersRes.status === 401) {
          window.localStorage.removeItem('accessToken');
          window.localStorage.removeItem('currentUser');
          router.replace('/login');
          return;
        }

        if (!conversationsRes.ok) {
          throw new Error('Unable to load conversations');
        }
        if (!usersRes.ok) {
          throw new Error('Unable to load users');
        }

        const conversationsData = (await conversationsRes.json()) as Conversation[];
        const usersData = (await usersRes.json()) as MinimalUser[];

        setConversations(conversationsData);
        setUsers(usersData);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [router]);

  const availablePartners = useMemo(() => {
    if (!currentUser) return users;
    return users.filter((user) => user.id !== currentUser.id);
  }, [currentUser, users]);

  const handleCreateConversation = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !selectedPartner) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await apiCall('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          participantIds: [currentUser.id, selectedPartner],
        }),
      });

      const payload = (await response.json()) as ConversationResponse;

      if (!response.ok) {
        throw new Error(
          (payload as { error?: string }).error || 'Unable to create conversation',
        );
      }

      const conversation =
        'conversation' in payload ? payload.conversation : payload;

      setConversations((prev) => {
        const exists = prev.some((item) => item.id === conversation.id);
        if (exists) {
          return prev.map((item) => (item.id === conversation.id ? conversation : item));
        }
        return [conversation, ...prev];
      });

      setSelectedPartner('');
      router.push(`/conversations/${conversation.id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    const secure = window.location.protocol === 'https:';
    document.cookie = `accessToken=; Max-Age=0; path=/; SameSite=Lax${
      secure ? '; Secure' : ''
    }`;
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('currentUser');
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-3 text-muted">Fetching your conversations…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Conversations</h1>
          <small className="text-muted">
            {currentUser ? `Signed in as ${currentUser.name} (${currentUser.email})` : ''}
          </small>
        </div>
        <button type="button" className="btn btn-outline-danger" onClick={handleLogout}>
          Log out
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <section className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5">Start a conversation</h2>
          <p className="text-muted small mb-3">
            Select a teammate to create a new 1:1 thread. Existing threads will be reused.
          </p>
          <form className="row g-3 align-items-center" onSubmit={handleCreateConversation}>
            <div className="col-sm-8 col-md-6">
              <label htmlFor="participant" className="form-label visually-hidden">
                Participant
              </label>
              <select
                id="participant"
                className="form-select"
                value={selectedPartner}
                onChange={(event) => setSelectedPartner(event.target.value)}
                required
              >
                <option value="" disabled>
                  Choose teammate…
                </option>
                {availablePartners.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-4 col-md-3">
              <button className="btn btn-primary w-100" type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Open chat'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card border-0 shadow-sm">
        <div className="card-body">
          <h2 className="h5 mb-3">Your threads</h2>
          {conversations.length === 0 ? (
            <p className="text-muted mb-0">No conversations yet. Start one above.</p>
          ) : (
            <div className="list-group">
              {conversations.map((conversation) => {
                const otherParticipants = conversation.participants
                  .map((participant) => participant.user)
                  .filter((participant) => participant.id !== currentUser?.id);

                const title =
                  otherParticipants.length > 0
                    ? otherParticipants.map((user) => user.name).join(', ')
                    : 'Just you';

                const lastMessage = conversation?.messages?.[0];

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-start"
                    onClick={() => router.push(`/conversations/${conversation.id}`)}
                  >
                    <div>
                      <h3 className="h6 mb-1">{title}</h3>
                      <p className="mb-0 text-muted small">
                        {lastMessage
                          ? `${lastMessage.sender?.name ?? 'Someone'}: ${lastMessage.content}`
                          : 'No messages yet'}
                      </p>
                    </div>
                    <span className="badge bg-light text-secondary">
                      {new Date(
                        lastMessage?.createdAt ?? conversation?.messages?.[0]?.createdAt ?? Date.now(),
                      ).toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


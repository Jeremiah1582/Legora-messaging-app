'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';
import { getSocket } from '@/lib/socketio';

interface MinimalUser {
  id: string;
  name: string;
  email: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: MinimalUser;
  conversationId?: string;
}

interface Conversation {
  id: string;
  participants: { user: MinimalUser }[];
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.id as string | undefined;
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<MinimalUser[]>([]);
  const [currentUser, setCurrentUser] = useState<MinimalUser | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversationId) {
      router.replace('/conversations');
    }
  }, [conversationId, router]);

  useEffect(() => {
    const token = window.localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    const cachedUser = window.localStorage.getItem('currentUser');
    if (cachedUser) {
      try {
        setCurrentUser(JSON.parse(cachedUser));
      } catch (err) {
        console.warn('Failed to parse cached user', err);
      }
    }

    const fetchConversation = async () => {
      if (!conversationId) return;

      try {
        const [messagesRes, conversationsRes] = await Promise.all([
          apiCall(`/api/messages?conversationId=${conversationId}`),
          apiCall('/api/conversations'),
        ]);

        if (!messagesRes.ok) {
          throw new Error('Unable to load messages');
        }

        const messagesData = (await messagesRes.json()) as Message[];
        setMessages(messagesData);

        if (conversationsRes.ok) {
          const conversations = (await conversationsRes.json()) as Conversation[];
          const matched = conversations.find((item) => item.id === conversationId);
          if (matched) {
            setParticipants(matched.participants.map((participant) => participant.user));
          }
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId, router]);

  useEffect(() => {
    const socket = getSocket();
    if (!conversationId) return;

    socket.emit('room:join', conversationId);

    const handleIncoming = (message: Message) => {
      if (message.conversationId && message.conversationId !== conversationId) {
        return;
      }
      setMessages((prev) => [...prev, message]);
    };

    socket.on('message:new', handleIncoming);

    return () => {
      socket.off('message:new', handleIncoming);
    };
  }, [conversationId]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const participantLabel = useMemo(() => {
    if (!currentUser) return participants.map((person) => person.name).join(', ');
    return participants
      .filter((person) => person.id !== currentUser.id)
      .map((person) => person.name)
      .join(', ');
  }, [currentUser, participants]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || !conversationId) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await apiCall('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId,
          content: draft.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to send message');
      }

      setDraft('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-3 text-muted">Loading conversation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <button
        type="button"
        className="btn btn-link px-0 mb-3"
        onClick={() => router.push('/conversations')}
      >
        ← Back to conversations
      </button>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white">
          <h1 className="h4 mb-0">{participantLabel || 'Conversation'}</h1>
          <p className="text-muted small mb-0">
            Messages are delivered in real time. Token expires after 15 minutes.
          </p>
        </div>

        <div className="card-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <p className="text-muted text-center my-5">No messages yet. Say hello!</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`d-flex ${message.sender.id === currentUser?.id ? 'justify-content-end' : 'justify-content-start'}`}
                >
                  <div
                    className={`rounded-3 px-3 py-2 ${
                      message.sender.id === currentUser?.id
                        ? 'bg-primary text-white'
                        : 'bg-light text-dark'
                    }`}
                    style={{ maxWidth: '75%' }}
                  >
                    <div className="small fw-semibold">{message.sender.name}</div>
                    <div>{message.content}</div>
                    <div className="small opacity-75 mt-1">
                      {new Date(message.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-danger m-3 mb-0" role="alert">
            {error}
          </div>
        )}

        <div className="card-footer bg-white">
          <form className="d-flex gap-2" onSubmit={handleSend}>
            <label htmlFor="message" className="visually-hidden">
              Message
            </label>
            <input
              id="message"
              className="form-control"
              placeholder="Type a message…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={sending}
            />
            <button className="btn btn-primary" type="submit" disabled={sending || !draft.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { io, Socket } from 'socket.io-client'
import './App.css'

type AuthMode = 'login' | 'register'

interface AuthUser {
  id: string
  nickname: string
}

interface UserSearchResponse {
  success: boolean
  users: AuthUser[]
  error?: string
}

interface ChatMessage {
  _id?: string
  sender: string
  receiver: string
  content: string
  createdAt?: string
}

interface ChannelSummary {
  id: string
  name: string
  memberCount: number
  joined: boolean
}

interface ChannelMessage {
  _id?: string
  sender: string
  senderNickname?: string
  channel: string
  content: string
  createdAt?: string
}

interface PresenceUser {
  id: string
  nickname: string
}

interface PresenceMember {
  id: string
  nickname: string
  online: boolean
}

const appendUniqueById = <T extends { _id?: string }>(items: T[], item: T): T[] => {
  if (item._id && items.some((existing) => existing._id === item._id)) {
    return items
  }

  return [...items, item]
}

const API_BASE_URL = 'http://localhost:1234'
const SOCKET_SERVER_URL = 'http://localhost:4000'
const PRESENCE_SERVICE_URL = 'http://localhost:5000'

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [token, setToken] = useState('')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [receiverNickname, setReceiverNickname] = useState('')
  const [receiverId, setReceiverId] = useState('')
  const [receiverLabel, setReceiverLabel] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [channels, setChannels] = useState<ChannelSummary[]>([])
  const [channelNameInput, setChannelNameInput] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<ChannelSummary | null>(null)
  const [channelMessages, setChannelMessages] = useState<ChannelMessage[]>([])
  const [channelMessageInput, setChannelMessageInput] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [channelMembers, setChannelMembers] = useState<PresenceMember[]>([])
  const [authForm, setAuthForm] = useState({
    nickname: '',
    password: '',
  })
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const socketRef = useRef<Socket | null>(null)
  const receiverIdRef = useRef('')
  const selectedChannelIdRef = useRef('')

  useEffect(() => {
    receiverIdRef.current = receiverId
  }, [receiverId])

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannel?.id || ''
  }, [selectedChannel])

  useEffect(() => {
    const storedToken = localStorage.getItem('chat_token')
    const storedUser = localStorage.getItem('chat_user')

    if (!storedToken || !storedUser) {
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser) as AuthUser
      setToken(storedToken)
      setCurrentUser(parsedUser)
    } catch {
      localStorage.removeItem('chat_token')
      localStorage.removeItem('chat_user')
    }
  }, [])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    const socket = io(SOCKET_SERVER_URL)
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('register', { userId: currentUser.id, nickname: currentUser.nickname })
    })

    socket.on('new_message', (incoming: ChatMessage) => {
      const activeReceiver = receiverIdRef.current
      const belongsToOpenChat =
        incoming.sender === activeReceiver || incoming.receiver === activeReceiver

      if (belongsToOpenChat) {
        setMessages((prev) => appendUniqueById(prev, incoming))
      }
    })

    socket.on('channel_message', (incoming: ChannelMessage) => {
      if (incoming.channel === selectedChannelIdRef.current) {
        setChannelMessages((prev) => appendUniqueById(prev, incoming))
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [currentUser])

  useEffect(() => {
    const fetchHistory = async () => {
      if (!token || !receiverId.trim()) {
        setMessages([])
        return
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/chat/history?user2=${encodeURIComponent(receiverId.trim())}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        const data = (await response.json()) as ChatMessage[] | { error?: string }
        if (!response.ok) {
          const apiError = 'error' in data ? data.error : 'Failed to load chat history'
          setError(apiError || 'Failed to load chat history')
          setMessages([])
          return
        }

        setError('')
        setMessages(data as ChatMessage[])
      } catch {
        setError('Could not connect to backend server.')
      }
    }

    void fetchHistory()
  }, [token, receiverId])

  useEffect(() => {
    const fetchChannels = async () => {
      if (!token) {
        setChannels([])
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/channel/list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = (await response.json()) as {
          success?: boolean
          channels?: ChannelSummary[]
          error?: string
        }

        if (!response.ok) {
          setError(data.error || 'Failed to load channels')
          return
        }

        setChannels(data.channels || [])
      } catch {
        setError('Could not connect to backend server.')
      }
    }

    void fetchChannels()
  }, [token])

  useEffect(() => {
    if (!currentUser) {
      setOnlineUsers([])
      return
    }

    let timer: ReturnType<typeof setInterval> | null = null

    const fetchOnlineUsers = async () => {
      try {
        const response = await fetch(`${PRESENCE_SERVICE_URL}/online-users`)
        const data = (await response.json()) as {
          success?: boolean
          users?: PresenceUser[]
        }

        if (response.ok) {
          setOnlineUsers(data.users || [])
        }
      } catch {
        // Presence service is optional for core chat flow.
      }
    }

    void fetchOnlineUsers()
    timer = setInterval(() => {
      void fetchOnlineUsers()
    }, 4000)

    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [currentUser])

  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedChannel?.id) {
        setChannelMembers([])
        return
      }

      try {
        const response = await fetch(
          `${PRESENCE_SERVICE_URL}/channel/${encodeURIComponent(selectedChannel.id)}/members`,
        )
        const data = (await response.json()) as {
          success?: boolean
          members?: PresenceMember[]
        }

        if (response.ok) {
          setChannelMembers(data.members || [])
        }
      } catch {
        // Presence service is optional for core chat flow.
      }
    }

    void fetchMembers()
  }, [selectedChannel])

  const refreshChannels = async () => {
    if (!token) {
      return
    }

    const response = await fetch(`${API_BASE_URL}/api/channel/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = (await response.json()) as {
      success?: boolean
      channels?: ChannelSummary[]
      error?: string
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load channels')
    }

    setChannels(data.channels || [])
  }

  const openChannel = async (channel: ChannelSummary) => {
    try {
      if (selectedChannel?.id && selectedChannel.id !== channel.id) {
        socketRef.current?.emit('leave_channel', {
          userId: currentUser?.id,
          channelId: selectedChannel.id,
        })
      }

      const joinResponse = await fetch(`${API_BASE_URL}/api/channel/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channelId: channel.id }),
      })

      const joinData = (await joinResponse.json()) as { error?: string }
      if (!joinResponse.ok) {
        setError(joinData.error || 'Failed to join channel')
        return
      }

      socketRef.current?.emit('join_channel', { userId: currentUser?.id, channelId: channel.id })
      setSelectedChannel({ ...channel, joined: true })

      const messagesResponse = await fetch(
        `${API_BASE_URL}/api/channel/messages?channelId=${encodeURIComponent(channel.id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const messageData = (await messagesResponse.json()) as
        | ChannelMessage[]
        | { error?: string }

      if (!messagesResponse.ok) {
        const apiError = 'error' in messageData ? messageData.error : 'Failed to load channel messages'
        setError(apiError || 'Failed to load channel messages')
        return
      }

      setChannelMessages(messageData as ChannelMessage[])
      try {
        const membersResponse = await fetch(
          `${PRESENCE_SERVICE_URL}/channel/${encodeURIComponent(channel.id)}/members`,
        )
        const membersData = (await membersResponse.json()) as {
          members?: PresenceMember[]
        }
        if (membersResponse.ok) {
          setChannelMembers(membersData.members || [])
        }
      } catch {
        // Presence service is optional for core chat flow.
      }

      setChannels((prev) =>
        prev.map((item) =>
          item.id === channel.id ? { ...item, joined: true } : item,
        ),
      )
      setError('')
    } catch {
      setError('Could not connect to backend server.')
    }
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const registerResponse = await fetch(`${API_BASE_URL}/api/user/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nickname: authForm.nickname,
            password: authForm.password,
          }),
        })

        const registerData = (await registerResponse.json()) as { error?: string }
        if (!registerResponse.ok) {
          setError(registerData.error || 'Registration failed')
          return
        }

        setMode('login')
        setError('Registration successful. Please login now.')
        return
      }

      const loginResponse = await fetch(`${API_BASE_URL}/api/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: authForm.nickname,
          password: authForm.password,
        }),
      })

      const loginData = (await loginResponse.json()) as {
        error?: string
        token?: string
        user?: AuthUser
      }

      if (!loginResponse.ok || !loginData.token || !loginData.user) {
        setError(loginData.error || 'Login failed')
        return
      }

      setToken(loginData.token)
      setCurrentUser(loginData.user)
      localStorage.setItem('chat_token', loginData.token)
      localStorage.setItem('chat_user', JSON.stringify(loginData.user))
      setError('')
    } catch {
      setError('Could not connect to backend server.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const content = messageInput.trim()
    if (!content || !receiverId.trim()) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver: receiverId.trim(),
          content,
        }),
      })

      const data = (await response.json()) as ChatMessage | { error?: string }
      if (!response.ok) {
        const apiError = 'error' in data ? data.error : 'Failed to send message'
        setError(apiError || 'Failed to send message')
        return
      }

      setMessages((prev) => appendUniqueById(prev, data as ChatMessage))
      setMessageInput('')
      setError('')
    } catch {
      setError('Could not connect to backend server.')
    }
  }

  const handleCreateChannel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = channelNameInput.trim()
    if (!name) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/channel/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      })

      const data = (await response.json()) as {
        success?: boolean
        channel?: ChannelSummary
        error?: string
      }

      if (!response.ok || !data.channel) {
        setError(data.error || 'Failed to create channel')
        return
      }

      setChannelNameInput('')
      await refreshChannels()
      await openChannel({ ...data.channel, joined: true })
      setError('')
    } catch {
      setError('Could not connect to backend server.')
    }
  }

  const handleSendChannelMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const content = channelMessageInput.trim()
    if (!content || !selectedChannel) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/channel/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          content,
        }),
      })

      const data = (await response.json()) as ChannelMessage | { error?: string }
      if (!response.ok) {
        const apiError = 'error' in data ? data.error : 'Failed to send channel message'
        setError(apiError || 'Failed to send channel message')
        return
      }

      setChannelMessages((prev) => appendUniqueById(prev, data as ChannelMessage))
      setChannelMessageInput('')
      setError('')
    } catch {
      setError('Could not connect to backend server.')
    }
  }

  const handleOpenChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nickname = receiverNickname.trim()
    if (!nickname) {
      setReceiverId('')
      setReceiverLabel('')
      setMessages([])
      return
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/user/search?nickname=${encodeURIComponent(nickname)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const data = (await response.json()) as UserSearchResponse
      if (!response.ok) {
        setError(data.error || 'Failed to search users')
        return
      }

      const exactMatch = data.users.find(
        (user) => user.nickname.toLowerCase() === nickname.toLowerCase(),
      )
      const targetUser = exactMatch || data.users[0]

      if (!targetUser) {
        setReceiverId('')
        setReceiverLabel('')
        setMessages([])
        setError('No user found with that nickname')
        return
      }

      setReceiverId(targetUser.id)
      setReceiverLabel(targetUser.nickname)
      setError('')
    } catch {
      setError('Could not connect to backend server.')
    }
  }

  const handleLogout = () => {
    if (selectedChannel?.id) {
      socketRef.current?.emit('leave_channel', {
        userId: currentUser?.id,
        channelId: selectedChannel.id,
      })
    }

    setToken('')
    setCurrentUser(null)
    setReceiverNickname('')
    setReceiverId('')
    setReceiverLabel('')
    setMessages([])
    setChannels([])
    setChannelNameInput('')
    setSelectedChannel(null)
    setChannelMessages([])
    setChannelMessageInput('')
    setOnlineUsers([])
    setChannelMembers([])
    localStorage.removeItem('chat_token')
    localStorage.removeItem('chat_user')
  }

  return (
    <main className="app-shell">
      <h1>Simple Chat Client</h1>

      {!currentUser ? (
        <section className="panel auth-panel">
          <div className="mode-switch">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="form-grid">
            <label>
              Nickname
              <input
                type="text"
                value={authForm.nickname}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, nickname: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        </section>
      ) : (
        <section className="panel chat-panel">
          <div className="chat-header">
            <p>
              Logged in as <strong>{currentUser.nickname}</strong>
            </p>
            <p className="muted">Online: {onlineUsers.length}</p>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>

          <div className="chat-grid">
            <div className="sub-panel">
              <h2 className="section-title">Direct Messages</h2>

              <form onSubmit={handleOpenChat} className="send-row">
                <input
                  type="text"
                  placeholder="Enter receiver nickname"
                  value={receiverNickname}
                  onChange={(event) => setReceiverNickname(event.target.value)}
                />
                <button type="submit">Open chat</button>
              </form>

              {receiverLabel && (
                <p className="muted">
                  Chat with <strong>{receiverLabel}</strong>
                </p>
              )}

              <div className="messages-box">
                {messages.length === 0 ? (
                  <p className="muted">No direct messages yet for this conversation.</p>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender === currentUser.id
                    return (
                      <div
                        key={message._id || `${message.sender}-${message.createdAt || Date.now()}`}
                        className={`message-item ${isMine ? 'mine' : 'theirs'}`}
                      >
                        <p>{message.content}</p>
                        <small>{isMine ? 'You' : 'Them'}</small>
                      </div>
                    )
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="send-row">
                <input
                  type="text"
                  placeholder="Type a direct message"
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                />
                <button type="submit">Send</button>
              </form>
            </div>

            <div className="sub-panel">
              <h2 className="section-title">Channels</h2>

              <form onSubmit={handleCreateChannel} className="send-row">
                <input
                  type="text"
                  placeholder="New channel name"
                  value={channelNameInput}
                  onChange={(event) => setChannelNameInput(event.target.value)}
                />
                <button type="submit">Create</button>
              </form>

              <div className="channel-list">
                {channels.length === 0 ? (
                  <p className="muted">No channels yet.</p>
                ) : (
                  channels.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
                      onClick={() => {
                        void openChannel(channel)
                      }}
                    >
                      <span>#{channel.name}</span>
                      <small>{channel.memberCount} members</small>
                    </button>
                  ))
                )}
              </div>

              <div className="presence-grid">
                <div className="presence-card">
                  <h3 className="section-title">Online Users</h3>
                  {onlineUsers.length === 0 ? (
                    <p className="muted">No users online.</p>
                  ) : (
                    <ul className="presence-list">
                      {onlineUsers.map((user) => (
                        <li key={user.id}>{user.nickname}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="presence-card">
                  <h3 className="section-title">Channel Members</h3>
                  {!selectedChannel ? (
                    <p className="muted">Open a channel to view members.</p>
                  ) : channelMembers.length === 0 ? (
                    <p className="muted">No members tracked yet.</p>
                  ) : (
                    <ul className="presence-list">
                      {channelMembers.map((member) => (
                        <li key={member.id}>
                          {member.nickname} {member.online ? '' : '(offline)'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="messages-box">
                {!selectedChannel ? (
                  <p className="muted">Select a channel to start chatting.</p>
                ) : channelMessages.length === 0 ? (
                  <p className="muted">No messages in #{selectedChannel.name} yet.</p>
                ) : (
                  channelMessages.map((message) => {
                    const isMine = message.sender === currentUser.id
                    return (
                      <div
                        key={message._id || `${message.sender}-${message.createdAt || Date.now()}`}
                        className={`message-item ${isMine ? 'mine' : 'theirs'}`}
                      >
                        <p>{message.content}</p>
                        <small>{isMine ? 'You' : message.senderNickname || message.sender}</small>
                      </div>
                    )
                  })
                )}
              </div>

              <form onSubmit={handleSendChannelMessage} className="send-row">
                <input
                  type="text"
                  placeholder={selectedChannel ? `Message #${selectedChannel.name}` : 'Pick a channel first'}
                  value={channelMessageInput}
                  onChange={(event) => setChannelMessageInput(event.target.value)}
                  disabled={!selectedChannel}
                />
                <button type="submit" disabled={!selectedChannel}>
                  Send
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {error && <p className="status-text">{error}</p>}
      <p className="status-text hint">Backend: 1234, Socket server: 4000</p>
    </main>
  )
}

export default App

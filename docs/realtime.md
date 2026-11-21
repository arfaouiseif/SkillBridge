# Real-time events (Socket.IO)

Messages are **sent** through REST (`POST /api/conversations/{id}/messages`).
The socket is used to **receive** live updates and to show "is typing".
Payload types (`Message`, ...) are defined in [openapi.yaml](openapi.yaml).

## Connecting

- Same host as the API, default Socket.IO path `/socket.io`. In development the Angular
  proxy must forward `/socket.io` to the API with WebSocket support (`"ws": true`).
- Authentication: send the JWT in the handshake, e.g. `io({ auth: { token } })`.
  A missing or invalid token refuses the connection (`connect_error`, message `unauthorized`).
- Reconnection is automatic. Events missed while offline are **not replayed**: after a
  reconnection, reload the data through REST (`GET /conversations`, `GET /conversations/unread-count`,
  the open conversation's history).

## Server to client

| Event | Payload | When |
|---|---|---|
| `message:new` | `Message` | A message was saved in one of my conversations. Sent to both participants, so the sender's other tabs stay in sync; clients de-duplicate by message `id`. |
| `messages:read` | `{ conversationId, readerId, readAt }` | The other participant read my messages: set `readAt` on my messages of that conversation. |
| `typing` | `{ conversationId, userId, isTyping }` | The other participant started or stopped typing. |
| `presence` | `{ userId, online }` | A user I share a conversation with connected (first connection) or disconnected (last connection). |

## Client to server

| Event | Payload | Notes |
|---|---|---|
| `typing` | `{ conversationId, isTyping }` | Send `true` when the user starts typing and `false` after about 2 seconds without typing or when the message is sent. Send at most one event every 2 seconds. Ignored if the user is not a participant. |

## Rules

- Each connection joins the room `user:{userId}`; the server emits to rooms. Clients never manage rooms.
- Only messages are stored. Typing and presence are never saved.
// Test client: logs in as a seeded user, connects to the socket and prints every event.
// Usage: npm run chat:listen -- <email> [conversationId]
// With a conversationId, pressing Enter sends a "typing" event for it.
import { io } from 'socket.io-client';

const [email, conversationArg] = process.argv.slice(2);
const baseUrl = process.env.API_URL ?? 'http://localhost:3000';

async function main() {
  if (!email) {
    console.log('Usage: npm run chat:listen -- <email> [conversationId]');
    process.exit(1);
  }

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' }),
  });
  if (!response.ok) {
    console.log('Login failed with status', response.status);
    process.exit(1);
  }
  const { token, user } = (await response.json()) as {
    token: string;
    user: { id: number; name: string };
  };

  const socket = io(baseUrl, { auth: { token: process.env.BAD_TOKEN ? 'bad-token' : token } });

  socket.on('connect', () => console.log(`Connected as ${user.name} (id ${user.id})`));
  socket.on('connect_error', (error) => console.log('Connection refused:', error.message));
  socket.on('disconnect', () => console.log('Disconnected'));

  for (const event of ['message:new', 'messages:read', 'typing', 'presence']) {
    socket.on(event, (payload) => console.log(`[${event}]`, JSON.stringify(payload)));
  }

  if (conversationArg) {
    const conversationId = Number(conversationArg);
        if (!Number.isInteger(conversationId)) {
      console.log(`"${conversationArg}" is not a valid conversation id`);
      process.exit(1);
    }
    console.log(`Press Enter to send "typing" in conversation ${conversationId}`);
    process.stdin.on('data', () => {
      socket.emit('typing', { conversationId, isTyping: true });
      setTimeout(() => socket.emit('typing', { conversationId, isTyping: false }), 2000);
    });
  }
}

main();
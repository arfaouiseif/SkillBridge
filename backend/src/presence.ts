// Number of open connections per user (a user can have several tabs open).
// Kept in memory: it resets when the server restarts.
const connections = new Map<number, number>();

// Returns true if the user has just come online (first connection)
export function addConnection(userId: number): boolean {
  const count = (connections.get(userId) ?? 0) + 1;
  connections.set(userId, count);
  return count === 1;
}

// Returns true if the user has just gone offline (last connection closed)
export function removeConnection(userId: number): boolean {
  const count = (connections.get(userId) ?? 0) - 1;
  if (count <= 0) {
    connections.delete(userId);
    return true;
  }
  connections.set(userId, count);
  return false;
}

export function isOnline(userId: number): boolean {
  return connections.has(userId);
}
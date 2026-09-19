const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Y = require('yjs');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Per-room Y.Doc and user map
const rooms = new Map(); // roomId -> { doc: Y.Doc, users: Map<socketId, user> }

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      doc: new Y.Doc(),
      users: new Map(),
    });
  }
  return rooms.get(roomId);
}

function broadcastUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const users = Array.from(room.users.values());
  io.to(roomId).emit('room-users', { users });
}

const COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F'];
function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  let currentRoom = null;

  socket.on('join-room', ({ roomId, username }) => {
    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
      const prev = rooms.get(currentRoom);
      if (prev) {
        prev.users.delete(socket.id);
        broadcastUsers(currentRoom);
      }
    }

    currentRoom = roomId;
    socket.join(roomId);

    const room = getRoom(roomId);
    room.users.set(socket.id, {
      id: socket.id,
      username,
      color: randomColor(),
    });

    // Send the full current doc state to the newly joined client only
    const stateUpdate = Y.encodeStateAsUpdate(room.doc);
    socket.emit('sync-state', { update: Array.from(stateUpdate) });

    broadcastUsers(roomId);
    console.log(`${username} joined room: ${roomId}`);
  });

  // Relay delta update to everyone else in the room, also apply to server doc
  socket.on('doc-update', ({ roomId, update }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const uint8 = new Uint8Array(update);
    // Apply to server-side doc so new joiners get up-to-date state
    Y.applyUpdate(room.doc, uint8);

    // Relay the SAME delta to all other clients — do NOT re-encode
    socket.to(roomId).emit('doc-update', { update });
  });

  socket.on('awareness-update', ({ roomId, update }) => {
    socket.to(roomId).emit('awareness-update', { clientId: socket.id, update });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        broadcastUsers(currentRoom);
      }
      io.to(currentRoom).emit('user-left', { clientId: socket.id });
    }
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));

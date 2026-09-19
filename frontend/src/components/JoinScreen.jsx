import { useState } from 'react';

export default function JoinScreen({ onJoin }) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = username.trim();
    const room = roomId.trim() || 'default';
    if (!name) return;
    onJoin({ username: name, roomId: room });
  };

  return (
    <div className="join-screen">
      <form className="join-card" onSubmit={handleSubmit}>
        <h1>⚡ CollabEdit</h1>
        <p>Real-time collaborative editor powered by CRDT</p>
        <input
          type="text"
          placeholder="Your name"
          value={username}
          onChange={e => setUsername(e.target.value)}
          maxLength={24}
          required
          autoFocus
        />
        <input
          type="text"
          placeholder="Room ID (leave blank for default)"
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
          maxLength={32}
        />
        <button className="join-btn" type="submit">Join Room →</button>
      </form>
    </div>
  );
}

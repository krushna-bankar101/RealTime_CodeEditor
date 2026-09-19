import { useState, useCallback } from 'react';
import './App.css';
import JoinScreen from './components/JoinScreen';
import CollabEditor from './components/CollabEditor';

export default function App() {
  const [session, setSession] = useState(null);

  // Stable references — won't change between renders
  const handleJoin = useCallback((s) => setSession(s), []);
  const handleLeave = useCallback(() => setSession(null), []);

  return (
    <div className="app">
      {!session ? (
        <JoinScreen onJoin={handleJoin} />
      ) : (
        <CollabEditor
          username={session.username}
          roomId={session.roomId}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}

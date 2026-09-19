import { useState, memo } from 'react';
import Editor from '@monaco-editor/react';
import { useCollabEditor } from '../hooks/useCollabEditor';
import UsersPanel from './UsersPanel';

const LANGUAGES = ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'markdown', 'rust', 'go'];

// Defined outside component — never recreated on re-render
const EDITOR_OPTIONS = {
  fontSize: 14,
  minimap: { enabled: false },
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  lineNumbers: 'on',
  renderLineHighlight: 'all',
  cursorBlinking: 'smooth',
  smoothScrolling: true,
  padding: { top: 12 },
};

const CollabEditor = memo(function CollabEditor({ username, roomId, onLeave }) {
  const [language, setLanguage] = useState('javascript');
  const { connected, users, typingUsers, onEditorMount } = useCollabEditor({ roomId, username });

  const me = users.find(u => u.username === username);
  const typingOthers = typingUsers.filter(t => t.username !== username);

  return (
    <>
      <header className="header">
        <div className="header-left">
          <h2>⚡ CollabEdit</h2>
          <span className="room-badge">#{roomId}</span>
          <div className={`status-dot ${connected ? '' : 'offline'}`} title={connected ? 'Connected' : 'Disconnected'} />
        </div>
        <button className="leave-btn" onClick={onLeave}>Leave Room</button>
      </header>

      <div className="main-layout">
        <UsersPanel
          users={users}
          currentSocketId={me?.id}
          typingUsers={typingUsers}
        />

        <div className="editor-panel">
          <div className="editor-toolbar">
            <select
              className="language-select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <span className="editor-info">
              {users.length} user{users.length !== 1 ? 's' : ''} in room
            </span>
            {typingOthers.length > 0 && (
              <span className="typing-indicator">
                {typingOthers.map(t => t.username).join(', ')} {typingOthers.length === 1 ? 'is' : 'are'} typing...
              </span>
            )}
          </div>

          <div className="monaco-wrapper">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              onMount={onEditorMount}
              options={EDITOR_OPTIONS}
            />
          </div>
        </div>
      </div>
    </>
  );
});

export default CollabEditor;

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3001';

export function useCollabEditor({ roomId, username }) {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Keep latest roomId/username accessible inside the effect without re-running it
  const roomIdRef = useRef(roomId);
  const usernameRef = useRef(username);
  roomIdRef.current = roomId;
  usernameRef.current = username;

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const isRemoteRef = useRef(false);
  const typingTimerRef = useRef(null);

  // Single effect, runs ONCE on mount, cleans up on unmount
  useEffect(() => {
    // ── Y.js setup ──
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('content');
    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    // ── Socket setup ──
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', {
        roomId: roomIdRef.current,
        username: usernameRef.current,
      });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('sync-state', ({ update }) => {
      isRemoteRef.current = true;
      Y.applyUpdate(ydoc, new Uint8Array(update));
      isRemoteRef.current = false;
      flushToEditor();
    });

    socket.on('doc-update', ({ update }) => {
      isRemoteRef.current = true;
      Y.applyUpdate(ydoc, new Uint8Array(update));
      isRemoteRef.current = false;
      flushToEditor();
    });

    socket.on('room-users', ({ users: u }) => setUsers(u));

    socket.on('awareness-update', ({ clientId, update }) => {
      if (!update?.username) return;
      setTypingUsers(prev => {
        const next = prev.filter(u => u.clientId !== clientId);
        if (update.typing) next.push({ clientId, username: update.username });
        return next;
      });
    });

    socket.on('user-left', ({ clientId }) => {
      setTypingUsers(prev => prev.filter(u => u.clientId !== clientId));
    });

    // ── Y.Doc update observer — sends local changes to server ──
    ydoc.on('update', (update, origin) => {
      if (origin !== 'local') return;
      socket.emit('doc-update', {
        roomId: roomIdRef.current,
        update: Array.from(update),
      });
      // typing awareness
      clearTimeout(typingTimerRef.current);
      socket.emit('awareness-update', {
        roomId: roomIdRef.current,
        update: { typing: true, username: usernameRef.current },
      });
      typingTimerRef.current = setTimeout(() => {
        socket.emit('awareness-update', {
          roomId: roomIdRef.current,
          update: { typing: false, username: usernameRef.current },
        });
      }, 1500);
    });

    // ── Cleanup ──
    return () => {
      clearTimeout(typingTimerRef.current);
      socket.disconnect();
      ydoc.destroy();
      socketRef.current = null;
      ydocRef.current = null;
      ytextRef.current = null;
      setConnected(false);
      setUsers([]);
    };
  }, []); // ← empty: runs once, never re-runs

  // Flush Y.Text → Monaco (guard prevents echo)
  function flushToEditor() {
    const editor = editorRef.current;
    const ytext = ytextRef.current;
    if (!editor || !ytext) return;
    const model = editor.getModel();
    if (!model) return;
    const newValue = ytext.toString();
    if (model.getValue() === newValue) return;
    isRemoteRef.current = true;
    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: newValue }],
      () => null
    );
    isRemoteRef.current = false;
  }

  // Called once when Monaco mounts
  function onEditorMount(editor) {
    editorRef.current = editor;

    // Sync any content already in Y.Text (late joiner case)
    flushToEditor();

    editor.onDidChangeModelContent((event) => {
      if (isRemoteRef.current) return; // ignore remote-applied changes

      const ydoc = ydocRef.current;
      const ytext = ytextRef.current;
      if (!ydoc || !ytext) return;

      ydoc.transact(() => {
        const sorted = [...event.changes].sort((a, b) => b.rangeOffset - a.rangeOffset);
        for (const { rangeOffset, rangeLength, text } of sorted) {
          if (rangeLength > 0) ytext.delete(rangeOffset, rangeLength);
          if (text.length > 0) ytext.insert(rangeOffset, text);
        }
      }, 'local');
    });
  }

  return { connected, users, typingUsers, onEditorMount };
}

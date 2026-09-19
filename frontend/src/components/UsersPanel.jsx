export default function UsersPanel({ users, currentSocketId, typingUsers }) {
  return (
    <aside className="users-panel">
      <div className="users-panel-header">
        Connected Users ({users.length})
      </div>
      <div className="users-list">
        {users.length === 0 && (
          <p className="empty-users">No users yet</p>
        )}
        {users.map(user => {
          const isYou = user.id === currentSocketId;
          const isTyping = typingUsers.some(t => t.username === user.username && !isYou);
          return (
            <div className="user-item" key={user.id}>
              <div
                className="user-avatar"
                style={{ background: user.color }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{user.username}</div>
                <div className="user-status">
                  {isTyping ? '✏️ typing...' : '● online'}
                </div>
              </div>
              {isYou && <span className="you-badge">you</span>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

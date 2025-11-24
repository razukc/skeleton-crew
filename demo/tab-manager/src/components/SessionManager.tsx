import React, { useState } from 'react';
import { SavedSession } from '../types/index.js';

interface SessionManagerProps {
  sessions: SavedSession[];
  onSave: (name: string) => void;
  onRestore: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function SessionManager({ sessions, onSave, onRestore, onDelete }: SessionManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const handleSaveClick = () => {
    setShowSaveDialog(true);
    setSessionName('');
  };

  const handleSaveConfirm = () => {
    if (sessionName.trim()) {
      onSave(sessionName.trim());
      setShowSaveDialog(false);
      setSessionName('');
    }
  };

  const handleSaveCancel = () => {
    setShowSaveDialog(false);
    setSessionName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveConfirm();
    } else if (e.key === 'Escape') {
      handleSaveCancel();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="session-manager">
      <div className="session-manager-header">
        <h3>Saved Sessions</h3>
        <button
          className="session-save-button"
          onClick={handleSaveClick}
          aria-label="Save current session"
        >
          + Save Session
        </button>
      </div>

      {showSaveDialog && (
        <div className="session-save-dialog">
          <input
            type="text"
            className="session-name-input"
            placeholder="Enter session name..."
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            onKeyDown={handleKeyPress}
            autoFocus
            aria-label="Session name"
          />
          <div className="session-dialog-buttons">
            <button
              className="session-dialog-button session-dialog-confirm"
              onClick={handleSaveConfirm}
              disabled={!sessionName.trim()}
            >
              Save
            </button>
            <button
              className="session-dialog-button session-dialog-cancel"
              onClick={handleSaveCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="session-list">
        {sessions.length === 0 ? (
          <div className="session-list-empty">
            No saved sessions. Click "Save Session" to save your current tabs.
          </div>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="session-item">
              <div className="session-info">
                <div className="session-name">{session.name}</div>
                <div className="session-meta">
                  <span className="session-date">{formatDate(session.createdAt)}</span>
                  <span className="session-tab-count">
                    {session.tabs.length} tab{session.tabs.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="session-actions">
                <button
                  className="session-action-button session-restore-button"
                  onClick={() => onRestore(session.id)}
                  aria-label={`Restore session ${session.name}`}
                >
                  Restore
                </button>
                <button
                  className="session-action-button session-delete-button"
                  onClick={() => onDelete(session.id)}
                  aria-label={`Delete session ${session.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

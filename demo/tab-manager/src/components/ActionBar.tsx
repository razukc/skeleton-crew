interface ActionBarProps {
  onCreateGroup?: () => void;
  onFindDuplicates: () => void;
  onSaveSession: () => void;
  hasTabGroups: boolean;
  selectedTabsCount?: number;
  isLoading?: boolean;
}

export function ActionBar({
  onCreateGroup,
  onFindDuplicates,
  onSaveSession,
  hasTabGroups,
  selectedTabsCount = 0,
  isLoading = false
}: ActionBarProps) {
  return (
    <div className="action-bar">
      {hasTabGroups && onCreateGroup && (
        <button
          className="action-button action-create-group"
          onClick={onCreateGroup}
          disabled={isLoading || selectedTabsCount === 0}
          aria-label="Create tab group"
          title={selectedTabsCount === 0 ? 'Select tabs to create a group' : 'Create group from selected tabs'}
        >
          <span className="action-icon">📁</span>
          <span className="action-label">Create Group</span>
          {selectedTabsCount > 0 && (
            <span className="action-badge">{selectedTabsCount}</span>
          )}
        </button>
      )}

      <button
        className="action-button action-find-duplicates"
        onClick={onFindDuplicates}
        disabled={isLoading}
        aria-label="Find duplicate tabs"
      >
        <span className="action-icon">🔍</span>
        <span className="action-label">Find Duplicates</span>
      </button>

      <button
        className="action-button action-save-session"
        onClick={onSaveSession}
        disabled={isLoading}
        aria-label="Save current session"
      >
        <span className="action-icon">💾</span>
        <span className="action-label">Save Session</span>
      </button>

      {isLoading && (
        <div className="action-loading">
          <span className="action-loading-spinner">⏳</span>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Tab, TabGroup } from '../types/index.js';

interface TabListProps {
  tabs: Tab[];
  groups: TabGroup[];
  onTabClick: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
}

export function TabList({ tabs, groups, onTabClick, onTabClose }: TabListProps) {
  // Group tabs by groupId
  const groupedTabs = new Map<number | undefined, Tab[]>();
  
  tabs.forEach(tab => {
    const groupId = tab.groupId;
    if (!groupedTabs.has(groupId)) {
      groupedTabs.set(groupId, []);
    }
    groupedTabs.get(groupId)!.push(tab);
  });

  // Render ungrouped tabs first, then grouped tabs
  const ungroupedTabs = groupedTabs.get(undefined) || [];
  const groupedEntries = Array.from(groupedTabs.entries()).filter(([groupId]) => groupId !== undefined);

  return (
    <div className="tab-list">
      {/* Ungrouped tabs */}
      {ungroupedTabs.map(tab => (
        <TabItem
          key={tab.id}
          tab={tab}
          onTabClick={onTabClick}
          onTabClose={onTabClose}
        />
      ))}

      {/* Grouped tabs */}
      {groupedEntries.map(([groupId, groupTabs]) => {
        const group = groups.find(g => g.id === groupId);
        return (
          <div key={groupId} className="tab-group">
            {group && (
              <div className="tab-group-header" style={{ borderLeftColor: group.color }}>
                <span className="tab-group-title">{group.title || 'Untitled Group'}</span>
                <span className="tab-group-count">({groupTabs.length})</span>
              </div>
            )}
            <div className="tab-group-items">
              {groupTabs.map(tab => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  onTabClick={onTabClick}
                  onTabClose={onTabClose}
                />
              ))}
            </div>
          </div>
        );
      })}

      {tabs.length === 0 && (
        <div className="tab-list-empty">No tabs found</div>
      )}
    </div>
  );
}

interface TabItemProps {
  tab: Tab;
  onTabClick: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
}

function TabItem({ tab, onTabClick, onTabClose }: TabItemProps) {
  const handleClick = () => {
    onTabClick(tab.id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTabClose(tab.id);
  };

  return (
    <div
      className={`tab-item ${tab.active ? 'tab-item-active' : ''}`}
      onClick={handleClick}
    >
      <div className="tab-item-content">
        {tab.favIconUrl && (
          <img
            src={tab.favIconUrl}
            alt=""
            className="tab-favicon"
            onError={(e) => {
              // Hide broken favicon images
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="tab-info">
          <div className="tab-title">{tab.title || 'Untitled'}</div>
          <div className="tab-url">{tab.url}</div>
        </div>
      </div>
      <button
        className="tab-close-button"
        onClick={handleClose}
        aria-label="Close tab"
      >
        ×
      </button>
    </div>
  );
}

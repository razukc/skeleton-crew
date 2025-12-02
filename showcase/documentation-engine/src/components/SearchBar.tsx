/**
 * SearchBar Component
 * 
 * Search input with results display and result selection.
 * 
 * @see Requirements 4.3, 4.4
 */

import React, { useState, useRef, useEffect } from 'react';

export interface SearchResult {
  id: string;
  title: string;
  path: string;
  score: number;
  snippet: string;
}

export interface SearchBarProps {
  onSearch: (term: string) => void;
  results: SearchResult[];
  onResultSelect: (path: string) => void;
}

/**
 * Highlight search term in text
 * @param text - Text to highlight
 * @param term - Search term to highlight
 * @returns HTML string with highlighted term
 */
function highlightSearchTerm(text: string, term: string): string {
  if (!term || !text) return text;
  
  const regex = new RegExp(`(${term})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * SearchBar component with results dropdown
 * 
 * Provides search input and displays results with navigation.
 * 
 * @see Requirements 4.3, 4.4
 */
export function SearchBar({ onSearch, results, onResultSelect }: SearchBarProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsResultsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (value.trim()) {
      // Debounce search by 300ms
      debounceTimerRef.current = window.setTimeout(() => {
        onSearch(value);
        setIsResultsOpen(true);
      }, 300);
    } else {
      setIsResultsOpen(false);
      onSearch(''); // Clear results immediately when input is empty
    }
  };

  const handleResultClick = (path: string) => {
    onResultSelect(path);
    setSearchTerm('');
    setIsResultsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsResultsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className="search-bar" ref={searchRef}>
      <div className="search-input-container">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          className="search-input"
          placeholder="Search documentation..."
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Search documentation"
          aria-expanded={isResultsOpen}
          aria-controls="search-results"
        />
      </div>

      {isResultsOpen && searchTerm && (
        <div className="search-results" id="search-results" role="listbox">
          {results.length === 0 ? (
            <div className="search-no-results">
              No results found for "{searchTerm}"
            </div>
          ) : (
            <ul className="search-results-list">
              {results.map((result) => (
                <li key={result.id} className="search-result-item">
                  <button
                    className="search-result-button"
                    onClick={() => handleResultClick(result.path)}
                    role="option"
                  >
                    <div className="search-result-title">{result.title}</div>
                    <div className="search-result-path">{result.path}</div>
                    {result.snippet && (
                      <div 
                        className="search-result-snippet"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightSearchTerm(result.snippet, searchTerm) 
                        }}
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <style>{`
        .search-bar {
          position: relative;
          flex: 1;
          max-width: 600px;
        }

        .search-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          font-size: 1rem;
          color: var(--text-muted, #6b7280);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 0.75rem 0.5rem 2.5rem;
          border: 1px solid var(--border-color, #d1d5db);
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background: var(--input-bg, #ffffff);
          color: var(--text-color, #1f2937);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--focus-color, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-input::placeholder {
          color: var(--text-muted, #9ca3af);
        }

        .search-results {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          right: 0;
          max-height: 400px;
          overflow-y: auto;
          background: var(--dropdown-bg, #ffffff);
          border: 1px solid var(--border-color, #d1d5db);
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          z-index: 50;
        }

        /* Dark theme styles */
        [data-theme="dark"] .search-input {
          background: var(--input-bg, #2d2d2d);
          color: var(--text-color, #e5e7eb);
          border-color: var(--border-color, #404040);
        }

        [data-theme="dark"] .search-input:focus {
          border-color: var(--focus-color, #60a5fa);
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
        }

        [data-theme="dark"] .search-input::placeholder {
          color: var(--text-muted, #6b7280);
        }

        [data-theme="dark"] .search-icon {
          color: var(--text-muted, #9ca3af);
        }

        [data-theme="dark"] .search-results {
          background: var(--dropdown-bg, #2d2d2d);
          border-color: var(--border-color, #404040);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        .search-no-results {
          padding: 1rem;
          text-align: center;
          color: var(--text-muted, #6b7280);
          font-size: 0.875rem;
        }

        .search-results-list {
          list-style: none;
          margin: 0;
          padding: 0.5rem;
        }

        .search-result-item {
          margin: 0;
        }

        .search-result-button {
          width: 100%;
          padding: 0.75rem;
          background: none;
          border: none;
          border-radius: 0.375rem;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .search-result-button:hover {
          background: var(--result-hover-bg, #f3f4f6);
        }

        .search-result-button:focus {
          outline: 2px solid var(--focus-color, #3b82f6);
          outline-offset: 2px;
        }

        .search-result-title {
          font-weight: 600;
          color: var(--text-color, #1f2937);
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .search-result-path {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
          margin-bottom: 0.25rem;
        }

        .search-result-snippet {
          font-size: 0.75rem;
          color: var(--text-color, #4b5563);
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .search-result-snippet mark {
          background-color: #fef08a;
          color: #854d0e;
          padding: 0.125rem 0.25rem;
          border-radius: 0.125rem;
          font-weight: 600;
        }

        /* Dark theme result styles */
        [data-theme="dark"] .search-no-results {
          color: var(--text-muted, #9ca3af);
        }

        [data-theme="dark"] .search-result-button:hover {
          background: var(--result-hover-bg, #3d3d3d);
        }

        [data-theme="dark"] .search-result-button:focus {
          outline-color: var(--focus-color, #60a5fa);
        }

        [data-theme="dark"] .search-result-title {
          color: var(--text-color, #e5e7eb);
        }

        [data-theme="dark"] .search-result-path {
          color: var(--text-muted, #9ca3af);
        }

        [data-theme="dark"] .search-result-snippet {
          color: var(--text-color, #d1d5db);
        }

        [data-theme="dark"] .search-result-snippet mark {
          background-color: #854d0e;
          color: #fef08a;
        }
      `}</style>
    </div>
  );
}

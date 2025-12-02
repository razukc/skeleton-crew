/**
 * VersionSelector Component
 * 
 * Displays a dropdown to switch between documentation versions.
 * Uses the versioning plugin to get available versions and handle switching.
 * 
 * @see Requirements 9.2, 9.3
 */

import React, { useState, useEffect } from 'react';
import type { Runtime } from 'skeleton-crew-runtime';
import type { RuntimeContextWithVersioning } from '../plugins/versioning.js';

interface VersionSelectorProps {
  runtime: Runtime;
}

export const VersionSelector: React.FC<VersionSelectorProps> = ({ runtime }) => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  const context = runtime.getContext() as RuntimeContextWithVersioning;
  const versioning = context.versioning;

  // Get available versions
  const versions = versioning?.getVersions() || [];
  const current = versioning?.getCurrentVersion();

  useEffect(() => {
    if (current) {
      setCurrentVersion(current.label);
    }
  }, [current]);

  // Don't render if no versioning plugin or only one version
  if (!versioning || versions.length <= 1) {
    return null;
  }

  const handleVersionSwitch = async (versionId: string) => {
    try {
      const currentPath = window.location.pathname;
      await context.actions.runAction('version:switch', { 
        versionId, 
        currentPath 
      });
      setIsOpen(false);
    } catch (error) {
      console.error('[VersionSelector] Failed to switch version:', error);
    }
  };

  return (
    <div className="version-selector">
      <button
        className="version-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select documentation version"
        aria-expanded={isOpen}
      >
        <span className="version-label">{currentVersion}</span>
        <svg
          className={`version-arrow ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="version-selector-backdrop" 
            onClick={() => setIsOpen(false)}
          />
          <div className="version-selector-dropdown">
            {versions.map((version) => (
              <button
                key={version.id}
                className={`version-option ${current?.id === version.id ? 'active' : ''}`}
                onClick={() => handleVersionSwitch(version.id)}
              >
                {version.label}
                {current?.id === version.id && (
                  <svg
                    className="version-check"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13 4L6 11L3 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <style>{`
        .version-selector {
          position: relative;
        }

        .version-selector-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--color-bg-secondary, var(--sidebar-bg, #f9fafb));
          border: 1px solid var(--color-border, var(--border-color, #e5e7eb));
          border-radius: 6px;
          color: var(--color-text, var(--text-color, #1f2937));
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .version-selector-button:hover {
          background: var(--color-bg-tertiary, var(--header-bg, #ffffff));
          border-color: var(--color-border-hover, var(--border-color, #d1d5db));
        }

        .version-label {
          white-space: nowrap;
        }

        .version-arrow {
          transition: transform 0.2s;
        }

        .version-arrow.open {
          transform: rotate(180deg);
        }

        .version-selector-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
        }

        .version-selector-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 200px;
          background: var(--color-bg-primary, var(--header-bg, #ffffff));
          border: 1px solid var(--color-border, var(--border-color, #e5e7eb));
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          overflow: hidden;
        }

        /* Dark theme support */
        [data-theme="dark"] .version-selector-dropdown {
          background: var(--color-bg-primary, var(--header-bg, #2d2d2d));
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .version-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: var(--color-text, var(--text-color, #1f2937));
          font-size: 0.875rem;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;
        }

        .version-option:hover {
          background: var(--color-bg-secondary, var(--sidebar-bg, #f3f4f6));
        }

        [data-theme="dark"] .version-option:hover {
          background: var(--color-bg-secondary, var(--sidebar-bg, #3a3a3a));
        }

        .version-option.active {
          color: var(--color-primary, #3b82f6);
          font-weight: 600;
        }

        .version-check {
          color: var(--color-primary, #3b82f6);
        }

        @media (max-width: 768px) {
          .version-selector-button {
            padding: 0.4rem 0.6rem;
            font-size: 0.8rem;
          }

          .version-selector-dropdown {
            min-width: 160px;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Callout Component
 * 
 * Renders callout boxes for important information with type-based styling.
 * Supports info, warning, and error types with appropriate icons and colors.
 * 
 * @see Requirements 13.2, 13.3, 13.4, 13.5
 */

import React from 'react';

/**
 * Callout type options
 */
export type CalloutType = 'info' | 'warning' | 'error';

/**
 * Callout component props
 */
export interface CalloutProps {
  /**
   * Type of callout (determines styling and icon)
   */
  type?: CalloutType;
  
  /**
   * Optional title for the callout
   */
  title?: string;
  
  /**
   * Content to display in the callout
   */
  children: React.ReactNode;
}

/**
 * Icon mapping for each callout type
 * @see Requirements 13.3, 13.4, 13.5
 */
const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌'
};

/**
 * CSS class names for each callout type
 * Theme-aware colors are defined in CSS
 * @see Requirements 13.3, 13.4, 13.5
 */
const CALLOUT_CLASSES: Record<CalloutType, string> = {
  info: 'callout-info',
  warning: 'callout-warning',
  error: 'callout-error'
};

/**
 * Callout component
 * 
 * Renders a styled callout box with an icon and content.
 * The styling is determined by the type prop.
 * 
 * @see Requirements 13.2, 13.3, 13.4, 13.5
 */
export function Callout({
  type = 'info',
  title,
  children
}: CalloutProps): JSX.Element {
  // Get icon and class for the callout type
  const icon = CALLOUT_ICONS[type];
  const className = CALLOUT_CLASSES[type];

  return (
    <>
      <div
        className={`callout ${className}`}
        role="note"
        aria-label={`${type} callout`}
      >
        {/* Icon and optional title */}
        <div className="callout-header">
          <span className="callout-icon" aria-hidden="true">
            {icon}
          </span>
          {title && (
            <strong className="callout-title">
              {title}
            </strong>
          )}
        </div>

        {/* Content */}
        <div className="callout-content">
          {children}
        </div>
      </div>

      <style>{`
        .callout {
          margin-top: 1rem;
          margin-bottom: 1rem;
          padding: 1rem;
          border-left: 4px solid;
          border-radius: 0.375rem;
          font-family: system-ui, -apple-system, sans-serif;
          transition: background-color 0.2s, border-color 0.2s, color 0.2s;
        }

        .callout-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .callout-icon {
          font-size: 1.25rem;
          line-height: 1;
        }

        .callout-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .callout-content {
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .callout-content p:first-child {
          margin-top: 0;
        }

        .callout-content p:last-child {
          margin-bottom: 0;
        }

        /* Info Callout - Blue */
        .callout-info {
          background-color: var(--callout-info-bg);
          border-left-color: var(--callout-info-border);
          color: var(--callout-info-text);
        }

        /* Warning Callout - Yellow/Orange */
        .callout-warning {
          background-color: var(--callout-warning-bg);
          border-left-color: var(--callout-warning-border);
          color: var(--callout-warning-text);
        }

        /* Error Callout - Red */
        .callout-error {
          background-color: var(--callout-error-bg);
          border-left-color: var(--callout-error-border);
          color: var(--callout-error-text);
        }

        /* Light Theme Colors */
        [data-theme="light"] {
          --callout-info-bg: #e3f2fd;
          --callout-info-border: #2196f3;
          --callout-info-text: #0d47a1;

          --callout-warning-bg: #fff8e1;
          --callout-warning-border: #ffc107;
          --callout-warning-text: #f57f17;

          --callout-error-bg: #ffebee;
          --callout-error-border: #f44336;
          --callout-error-text: #c62828;
        }

        /* Dark Theme Colors */
        [data-theme="dark"] {
          --callout-info-bg: rgba(33, 150, 243, 0.15);
          --callout-info-border: #42a5f5;
          --callout-info-text: #90caf9;

          --callout-warning-bg: rgba(255, 193, 7, 0.15);
          --callout-warning-border: #ffb300;
          --callout-warning-text: #ffd54f;

          --callout-error-bg: rgba(244, 67, 54, 0.15);
          --callout-error-border: #ef5350;
          --callout-error-text: #ef9a9a;
        }
      `}</style>
    </>
  );
}



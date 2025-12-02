/**
 * Playground Component
 * 
 * Interactive code editor with live preview.
 * Allows users to experiment with code examples.
 * 
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import type { RuntimeContext } from 'skeleton-crew-runtime';
import type { ViewUpdate } from '@codemirror/view';

/**
 * Playground preset example
 */
export interface PlaygroundPreset {
  name: string;
  code: string;
}

/**
 * Playground component props
 */
export interface PlaygroundProps {
  /**
   * Initial code to display
   */
  initialCode?: string;
  
  /**
   * Programming language (default: 'javascript')
   */
  language?: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  
  /**
   * Preset examples
   */
  presets?: PlaygroundPreset[];
  
  /**
   * Runtime context (reserved for future use)
   */
  context?: RuntimeContext;
  
  /**
   * Unique ID for session storage
   */
  id?: string;
  
  /**
   * Children (initial code can be passed as children)
   */
  children?: string;
}

/**
 * Error boundary state
 */
interface ErrorState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Session storage key prefix
 */
const STORAGE_KEY_PREFIX = 'playground-code-';

/**
 * Debounce delay for preview updates (ms)
 */
const DEBOUNCE_DELAY = 500;

/**
 * Playground component
 * 
 * Provides an interactive code editor with live preview.
 * 
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */
export function Playground({
  initialCode: initialCodeProp,
  language = 'javascript',
  presets: presetsProp,
  context: _context,
  id,
  children
}: PlaygroundProps): JSX.Element {
  // Ensure presets is always an array
  const presets = Array.isArray(presetsProp) ? presetsProp : [];
  
  // Generate a unique ID if not provided (using initial code hash)
  const uniqueId = id || `playground-${Math.abs(hashCode(initialCodeProp || ''))}`;
  
  // Simple hash function for generating unique IDs
  function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
  // Use initial code from props or children
  const defaultCode = initialCodeProp || (typeof children === 'string' ? children : '');
  
  // Load code from session storage or use default
  // @see Requirements 8.5
  const loadStoredCode = (): string => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return defaultCode;
    }
    
    try {
      const stored = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${uniqueId}`);
      return stored || defaultCode;
    } catch (error) {
      console.warn('[playground] Failed to load from session storage:', error);
      return defaultCode;
    }
  };

  const [code, setCode] = useState<string>(loadStoredCode());
  const [output, setOutput] = useState<string>('');
  const [errorState, setErrorState] = useState<ErrorState>({ hasError: false, error: null });
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for theme changes from the runtime context
  useEffect(() => {
    if (!_context) {
      return;
    }

    const handleThemeChange = (data: any) => {
      if (data && (data.theme === 'light' || data.theme === 'dark')) {
        setTheme(data.theme);
      }
    };

    const unsubscribe = _context.events.on('theme:changed', handleThemeChange);
    
    // Get initial theme
    const themeContext = _context as any;
    if (themeContext.theme && themeContext.theme.getCurrentTheme) {
      setTheme(themeContext.theme.getCurrentTheme());
    }

    return () => {
      unsubscribe();
    };
  }, [_context]);

  /**
   * Save code to session storage
   * @see Requirements 8.5
   */
  const saveCode = useCallback((newCode: string): void => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    
    try {
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${uniqueId}`, newCode);
    } catch (error) {
      console.warn('[playground] Failed to save to session storage:', error);
    }
  }, [uniqueId]);

  /**
   * Execute code and update preview
   * @see Requirements 8.2, 8.3
   */
  const executeCode = useCallback((codeToExecute: string): void => {
    console.log('[playground] Executing code:', codeToExecute.substring(0, 50) + '...');
    try {
      // Clear previous error
      setErrorState({ hasError: false, error: null });
      
      // Capture console.log output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
        originalLog.apply(console, args);
      };

      try {
        // Execute the code
        // Note: Using Function constructor for safer evaluation than eval
        const result = new Function(codeToExecute)();
        
        // Restore console.log
        console.log = originalLog;
        
        // Build output
        let outputText = '';
        if (logs.length > 0) {
          outputText += logs.join('\n');
        }
        if (result !== undefined) {
          if (outputText) outputText += '\n';
          outputText += `=> ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`;
        }
        
        console.log('[playground] Output:', outputText || '// No output');
        setOutput(outputText || '// No output');
      } catch (execError) {
        // Restore console.log
        console.log = originalLog;
        throw execError;
      }
    } catch (error) {
      // Handle errors without crashing the page
      // @see Requirements 8.3
      const err = error as Error;
      setErrorState({ hasError: true, error: err });
      setOutput(`Error: ${err.message}`);
      console.error('[playground] Execution error:', err);
    }
  }, []);

  /**
   * Handle code changes with debouncing
   * @see Requirements 8.2
   */
  const handleCodeChange = useCallback((newCode: string): void => {
    setCode(newCode);
    saveCode(newCode);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce preview update
    debounceTimerRef.current = setTimeout(() => {
      executeCode(newCode);
    }, DEBOUNCE_DELAY);
  }, [executeCode, saveCode]);

  /**
   * Handle preset selection
   * @see Requirements 8.4
   */
  const handlePresetChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const presetName = event.target.value;
    setSelectedPreset(presetName);
    
    if (presetName) {
      const preset = presets.find(p => p.name === presetName);
      if (preset) {
        const newCode = preset.code;
        setCode(newCode);
        saveCode(newCode);
        
        // Update editor
        if (editorViewRef.current) {
          editorViewRef.current.dispatch({
            changes: {
              from: 0,
              to: editorViewRef.current.state.doc.length,
              insert: newCode
            }
          });
        }
        
        // Execute immediately
        executeCode(newCode);
      }
    }
  };

  /**
   * Initialize CodeMirror editor
   * @see Requirements 8.1
   */
  useEffect(() => {
    if (!editorRef.current || editorViewRef.current) {
      return;
    }

    // Create editor state with theme and syntax highlighting
    const extensions = [
      basicSetup,
      javascript(),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          const newCode = update.state.doc.toString();
          handleCodeChange(newCode);
        }
      })
    ];
    
    // Add dark theme if needed (oneDark includes its own syntax colors)
    if (theme === 'dark') {
      extensions.push(oneDark);
    }
    
    const startState = EditorState.create({
      doc: code,
      extensions
    });

    // Create editor view
    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    });

    editorViewRef.current = view;

    // Cleanup
    return () => {
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
        editorViewRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []); // Only run once on mount

  // Execute initial code in a separate effect
  useEffect(() => {
    if (editorViewRef.current) {
      executeCode(code);
    }
  }, []); // Only execute once on mount

  // Update editor theme when theme changes
  useEffect(() => {
    if (editorViewRef.current) {
      const currentCode = editorViewRef.current.state.doc.toString();
      
      // Recreate editor with new theme
      const extensions = [
        basicSetup,
        javascript(),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString();
            handleCodeChange(newCode);
          }
        })
      ];
      
      if (theme === 'dark') {
        extensions.push(oneDark);
      }
      
      const newState = EditorState.create({
        doc: currentCode,
        extensions
      });
      
      editorViewRef.current.setState(newState);
    }
  }, [theme, handleCodeChange]);

  // Theme-aware styles
  const styles: Record<string, React.CSSProperties> = {
    container: {
      marginTop: '1rem',
      marginBottom: '1rem',
      border: `1px solid ${theme === 'dark' ? '#30363d' : '#d0d7de'}`,
      borderRadius: '0.5rem',
      overflow: 'hidden',
      backgroundColor: theme === 'dark' ? '#0d1117' : '#ffffff'
    },
    presets: {
      padding: '0.75rem 1rem',
      borderBottom: `1px solid ${theme === 'dark' ? '#30363d' : '#d0d7de'}`,
      backgroundColor: theme === 'dark' ? '#161b22' : '#f6f8fa',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: theme === 'dark' ? '#c9d1d9' : '#24292f'
    },
    select: {
      padding: '0.25rem 0.5rem',
      fontSize: '0.875rem',
      border: `1px solid ${theme === 'dark' ? '#30363d' : '#d0d7de'}`,
      borderRadius: '0.25rem',
      backgroundColor: theme === 'dark' ? '#0d1117' : '#ffffff',
      color: theme === 'dark' ? '#c9d1d9' : '#24292f',
      cursor: 'pointer'
    },
    editorWrapper: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      minHeight: '400px'
    },
    editor: {
      borderRight: `1px solid ${theme === 'dark' ? '#30363d' : '#d0d7de'}`,
      display: 'flex',
      flexDirection: 'column'
    },
    editorHeader: {
      padding: '0.5rem 1rem',
      backgroundColor: theme === 'dark' ? '#161b22' : '#f6f8fa',
      borderBottom: `1px solid ${theme === 'dark' ? '#30363d' : '#d0d7de'}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerTitle: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: theme === 'dark' ? '#c9d1d9' : '#24292f'
    },
    headerLanguage: {
      fontSize: '0.75rem',
      color: theme === 'dark' ? '#8b949e' : '#57606a',
      textTransform: 'uppercase'
    },
    editorContent: {
      flex: 1,
      overflow: 'auto',
      fontSize: '0.875rem'
    },
    preview: {
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme === 'dark' ? '#0d1117' : '#ffffff'
    },
    previewHeader: {
      padding: '0.5rem 1rem',
      backgroundColor: theme === 'dark' ? '#161b22' : '#f6f8fa',
      borderBottom: `1px solid ${theme === 'dark' ? '#30363d' : '#d0d7de'}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    previewContent: {
      flex: 1,
      padding: '1rem',
      margin: 0,
      fontSize: '0.875rem',
      fontFamily: 'monospace',
      overflow: 'auto',
      backgroundColor: theme === 'dark' ? '#0d1117' : '#ffffff',
      color: theme === 'dark' ? '#c9d1d9' : '#24292f',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    },
    errorContent: {
      color: '#f85149',
      backgroundColor: theme === 'dark' ? '#1c1917' : '#fff5f5'
    },
    errorBadge: {
      padding: '0.125rem 0.5rem',
      fontSize: '0.75rem',
      fontWeight: 600,
      color: '#ffffff',
      backgroundColor: '#f85149',
      borderRadius: '0.25rem'
    }
  };

  return (
    <div className="playground-container" style={styles.container}>
      {/* Preset selector */}
      {/* @see Requirements 8.4 */}
      {presets.length > 0 && (
        <div className="playground-presets" style={styles.presets}>
          <label htmlFor="preset-select" style={styles.label}>
            Examples:
          </label>
          <select
            id="preset-select"
            value={selectedPreset}
            onChange={handlePresetChange}
            style={styles.select}
          >
            <option value="">Custom</option>
            {presets.map(preset => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="playground-editor-wrapper" style={styles.editorWrapper}>
        {/* Code editor */}
        {/* @see Requirements 8.1 */}
        <div className="playground-editor" style={styles.editor}>
          <div className="playground-editor-header" style={styles.editorHeader}>
            <span style={styles.headerTitle}>Code</span>
            <span style={styles.headerLanguage}>{language}</span>
          </div>
          <div ref={editorRef} style={styles.editorContent} />
        </div>

        {/* Preview pane */}
        {/* @see Requirements 8.1, 8.2 */}
        <div className="playground-preview" style={styles.preview}>
          <div className="playground-preview-header" style={styles.previewHeader}>
            <span style={styles.headerTitle}>Output</span>
            {errorState.hasError && (
              <span style={styles.errorBadge}>Error</span>
            )}
          </div>
          <pre style={{
            ...styles.previewContent,
            ...(errorState.hasError ? styles.errorContent : {})
          }}>
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * Search Plugin
 * 
 * Provides full-text search functionality using MiniSearch.
 * Indexes page content on registration and executes search queries.
 * 
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 11.3
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';
import MiniSearch from 'minisearch';
import type { ScreenMetadata } from './markdown.js';

/**
 * Document structure for search indexing
 */
export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  headings: string;
  path: string;
}

/**
 * Search result with relevance score and snippet
 */
export interface SearchResult {
  id: string;
  title: string;
  path: string;
  score: number;
  snippet: string;
}

/**
 * Search plugin interface
 */
export interface SearchPlugin {
  /**
   * Execute a search query
   * @param term - Search term
   * @returns Array of search results ranked by relevance
   */
  search(term: string): SearchResult[];

  /**
   * Get the search index
   * @returns MiniSearch instance
   */
  getIndex(): MiniSearch<SearchDocument>;
}

/**
 * Extended RuntimeContext with search plugin
 */
export interface RuntimeContextWithSearch extends RuntimeContext {
  search: SearchPlugin;
}

/**
 * Extract text content from markdown AST
 * 
 * @param node - Markdown AST node
 * @returns Extracted text content
 */
function extractTextFromAST(node: any): string {
  if (!node) return '';

  if (node.type === 'text') {
    return node.value || '';
  }

  if (node.type === 'code') {
    return node.value || '';
  }

  if (node.children && Array.isArray(node.children)) {
    return node.children.map(extractTextFromAST).join(' ');
  }

  return '';
}

/**
 * Create search document from screen metadata
 * 
 * @param id - Screen ID
 * @param metadata - Screen metadata
 * @returns Search document
 * @see Requirements 4.1
 */
function createSearchDocument(
  id: string,
  metadata: ScreenMetadata
): SearchDocument {
  // Extract title
  const title = metadata.frontmatter.title || id;

  // Extract content from markdown AST
  const content = extractTextFromAST(metadata.content);

  // Extract headings text
  const headings = metadata.headings.map(h => h.text).join(' ');

  return {
    id,
    title,
    content,
    headings,
    path: metadata.path
  };
}

/**
 * Format search results with snippets
 * 
 * @param results - Raw MiniSearch results
 * @param documents - Map of document IDs to documents
 * @param term - Search term for snippet extraction
 * @returns Formatted search results
 * @see Requirements 4.3, 4.5
 */
function formatSearchResults(
  results: any[],
  documents: Map<string, SearchDocument>,
  term: string
): SearchResult[] {
  return results.map(result => {
    const doc = documents.get(result.id);
    
    if (!doc) {
      return {
        id: result.id,
        title: result.id,
        path: '/',
        score: result.score,
        snippet: ''
      };
    }

    // Extract snippet around the search term
    const snippet = extractSnippet(doc.content, term);

    return {
      id: result.id,
      title: doc.title,
      path: doc.path,
      score: result.score,
      snippet
    };
  });
}

/**
 * Extract snippet around search term
 * 
 * @param content - Full content text
 * @param term - Search term
 * @param contextLength - Number of characters around term (default: 100)
 * @returns Snippet with search term highlighted
 */
function extractSnippet(
  content: string,
  term: string,
  contextLength: number = 100
): string {
  if (!content || !term) return '';

  // Find the term in content (case-insensitive)
  const lowerContent = content.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerContent.indexOf(lowerTerm);

  if (index === -1) {
    // Term not found, return beginning of content
    return content.substring(0, contextLength * 2) + '...';
  }

  // Extract context around the term
  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + term.length + contextLength);

  let snippet = content.substring(start, end);

  // Add ellipsis if needed
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Create the search plugin
 * 
 * This plugin provides full-text search functionality using MiniSearch.
 * It indexes page content when pages are registered and executes search queries.
 * 
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 11.3
 */
export function createSearchPlugin(): PluginDefinition {
  // Create MiniSearch index
  // @see Requirements 4.1
  const searchIndex = new MiniSearch<SearchDocument>({
    fields: ['title', 'content', 'headings'], // Fields to index
    storeFields: ['title', 'path', 'id'], // Fields to store for retrieval
    searchOptions: {
      fuzzy: 0.2, // Allow fuzzy matching
      prefix: true, // Match prefixes
      boost: { title: 2, headings: 1.5 } // Boost title and headings
    }
  });

  // Store documents for snippet extraction
  const documents = new Map<string, SearchDocument>();
  
  // Store unsubscribe functions for cleanup
  let unsubscribePageRegistered: (() => void) | null = null;
  const unregisterFunctions: Array<() => void> = [];

  // Search plugin implementation
  const searchPlugin: SearchPlugin = {
    search(term: string): SearchResult[] {
      if (!term || term.trim().length === 0) {
        return [];
      }

      // Execute search
      // @see Requirements 4.2
      const results = searchIndex.search(term);

      // Format results with snippets
      // @see Requirements 4.3, 4.5
      return formatSearchResults(results, documents, term);
    },

    getIndex(): MiniSearch<SearchDocument> {
      return searchIndex;
    }
  };

  return {
    name: 'search',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      // Extend the runtime context with search plugin
      (context as RuntimeContextWithSearch).search = searchPlugin;

      // Listen to markdown:page-registered events to index pages
      // @see Requirements 4.1
      unsubscribePageRegistered = context.events.on('markdown:page-registered', (data: any) => {
        if (!data || !data.id || !data.metadata) {
          return;
        }

        try {
          // Create search document from metadata
          const doc = createSearchDocument(data.id, data.metadata);

          // Store document for snippet extraction
          documents.set(data.id, doc);

          // Add to search index
          searchIndex.add(doc);
        } catch (error) {
          console.error(`[search] Error indexing page ${data.id}:`, error);
        }
      });
      
      // Index any pages that were already loaded before this plugin was initialized
      // This handles the case where markdown-loader completes before search plugin setup
      const markdownContext = context as any;
      if (markdownContext.markdown) {
        const existingPages = markdownContext.markdown.getAllMetadata();
        
        for (const [id, metadata] of existingPages.entries()) {
          try {
            const doc = createSearchDocument(id, metadata);
            documents.set(id, doc);
            searchIndex.add(doc);
          } catch (error) {
            console.error(`[search] Error indexing existing page ${id}:`, error);
          }
        }
      }

      // Register search:query action
      // @see Requirements 4.2, 11.3
      const unregisterQuery = context.actions.registerAction({
        id: 'search:query',
        timeout: 5000,
        handler: async (params: { term: string }) => {
          const results = searchPlugin.search(params.term);

          // Emit search:results event
          // @see Requirements 11.3
          context.events.emit('search:results', {
            term: params.term,
            results
          });

          return results;
        }
      });
      unregisterFunctions.push(unregisterQuery);
    },
    dispose(): void {
      // Clean up event listener
      if (unsubscribePageRegistered) unsubscribePageRegistered();
      
      // Unregister all actions
      unregisterFunctions.forEach(fn => fn());
      unregisterFunctions.length = 0;
      
      // Clear search index and documents
      searchIndex.removeAll();
      documents.clear();
      
      console.log('[search] Plugin disposed');
    }
  };
}

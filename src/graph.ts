/**
 * High-level Graph API for GraphQLite
 */

import { Database } from 'bun:sqlite';
import type {
  CypherValue,
  CypherRow,
  CypherResult,
  GraphOptions,
  GraphStats,
} from './types';
import { GraphQLiteError } from './types';
import { parseCypherResult, resultToRows, resolveExtensionPath } from './utils';

/**
 * A GraphQLite database connection
 * 
 * Provides a high-level API for working with graph databases using Cypher queries.
 */
export class Graph {
  private db: Database;
  private extensionLoaded: boolean = false;

  /**
   * Open a GraphQLite database connection
   * 
   * @param dbPath - Path to database file, or ":memory:" for in-memory database
   * @param options - Optional configuration
   */
  constructor(dbPath: string, options?: GraphOptions) {
    // Open SQLite database
    this.db = new Database(dbPath);
    
    // Enable load_extension if needed
    if (options?.enableLoadExtension !== false) {
      try {
        // Note: Bun's SQLite might not support load_extension in all cases
        // This is a placeholder - actual implementation depends on Bun's capabilities
        this.db.run('PRAGMA load_extension = ON');
      } catch (error) {
        // If load_extension is not supported, we might need to use FFI
        console.warn('Could not enable load_extension:', error);
      }
    }

    // Load GraphQLite extension if path provided
    const extensionPath = resolveExtensionPath(options?.extensionPath);
    if (extensionPath) {
      this.loadExtension(extensionPath);
    }
  }

  /**
   * Load the GraphQLite extension
   * 
   * @param extensionPath - Path to the extension library
   */
  private loadExtension(extensionPath: string): void {
    try {
      // Remove file extension for SQLite's load_extension (it expects base name)
      const basePath = extensionPath.replace(/\.(so|dylib|dll)$/, '');
      
      // Use SQLite's load_extension function
      // Note: The path needs to be properly escaped/quoted
      const query = this.db.prepare(`SELECT load_extension(?)`);
      query.run(basePath);
      
      // Verify extension loaded
      const testQuery = this.db.prepare('SELECT graphqlite_test() as result');
      const testResult = testQuery.get() as { result: string } | undefined;
      
      if (testResult?.result?.includes('successfully')) {
        this.extensionLoaded = true;
      } else {
        throw new GraphQLiteError('Extension loaded but verification failed');
      }
    } catch (error) {
      if (error instanceof GraphQLiteError) {
        throw error;
      }
      throw new GraphQLiteError(
        `Failed to load extension from ${extensionPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute a Cypher query
   * 
   * @param query - Cypher query string
   * @param params - Optional parameters as JSON object
   * @returns Array of row objects
   * 
   * @example
   * ```ts
   * const graph = new Graph(':memory:');
   * const results = graph.cypher('MATCH (n:Person) RETURN n.name, n.age');
   * ```
   */
  cypher<T extends CypherRow = CypherRow>(
    query: string,
    params?: Record<string, CypherValue>
  ): T[] {
    if (!this.extensionLoaded) {
      throw new GraphQLiteError(
        'GraphQLite extension not loaded. Provide extensionPath in constructor options.'
      );
    }

    try {
      // Build parameterized query if params provided
      let stmt;
      let result: { result: string } | undefined;
      
      if (params) {
        const paramsJson = JSON.stringify(params);
        stmt = this.db.prepare("SELECT cypher(?1, ?2) as result");
        result = stmt.get(query, paramsJson) as { result: string } | undefined;
      } else {
        stmt = this.db.prepare("SELECT cypher(?1) as result");
        result = stmt.get(query) as { result: string } | undefined;
      }
      
      if (!result?.result) {
        return [];
      }

      const cypherResult = parseCypherResult(result.result);
      return resultToRows(cypherResult) as T[];
    } catch (error) {
      if (error instanceof GraphQLiteError) {
        throw error;
      }
      throw new GraphQLiteError(
        `Cypher query failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute a Cypher query and return raw result
   * 
   * @param query - Cypher query string
   * @param params - Optional parameters as JSON object
   * @returns Raw CypherResult object
   */
  cypherRaw(
    query: string,
    params?: Record<string, CypherValue>
  ): CypherResult {
    if (!this.extensionLoaded) {
      throw new GraphQLiteError(
        'GraphQLite extension not loaded. Provide extensionPath in constructor options.'
      );
    }

    try {
      let stmt;
      let result: { result: string } | undefined;
      
      if (params) {
        const paramsJson = JSON.stringify(params);
        stmt = this.db.prepare("SELECT cypher(?1, ?2) as result");
        result = stmt.get(query, paramsJson) as { result: string } | undefined;
      } else {
        stmt = this.db.prepare("SELECT cypher(?1) as result");
        result = stmt.get(query) as { result: string } | undefined;
      }
      
      if (!result?.result) {
        return { columns: [], data: [] };
      }

      return parseCypherResult(result.result);
    } catch (error) {
      if (error instanceof GraphQLiteError) {
        throw error;
      }
      throw new GraphQLiteError(
        `Cypher query failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    try {
      const stmt = this.db.prepare("SELECT gql_graph_loaded() as result");
      const result = stmt.get() as { result: string } | undefined;
      
      if (result?.result) {
        const parsed = JSON.parse(result.result);
        if (parsed.loaded) {
          return {
            nodes: parsed.nodes ?? 0,
            edges: parsed.edges ?? 0,
          };
        }
      }
      return { nodes: 0, edges: 0 };
    } catch {
      return { nodes: 0, edges: 0 };
    }
  }

  /**
   * Load graph into cache for algorithm acceleration
   */
  loadGraph(): void {
    const stmt = this.db.prepare("SELECT gql_load_graph()");
    stmt.run();
  }

  /**
   * Unload graph from cache
   */
  unloadGraph(): void {
    const stmt = this.db.prepare("SELECT gql_unload_graph()");
    stmt.run();
  }

  /**
   * Reload graph from database
   */
  reloadGraph(): void {
    const stmt = this.db.prepare("SELECT gql_reload_graph()");
    stmt.run();
  }

  /**
   * Access the underlying SQLite database
   */
  getDatabase(): Database {
    return this.db;
  }
}


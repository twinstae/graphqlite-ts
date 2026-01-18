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
  PageRankResult,
  LouvainResult,
  ShortestPathResult,
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
      // Convert to absolute path
      const path = require('path');
      const fs = require('fs');
      const absolutePath = path.isAbsolute(extensionPath) 
        ? extensionPath 
        : path.resolve(process.cwd(), extensionPath);
      
      // Verify file exists
      if (!fs.existsSync(absolutePath)) {
        throw new GraphQLiteError(`Extension file not found: ${absolutePath}`);
      }
      
      // Use Bun's native loadExtension method
      // This is the recommended way to load extensions in Bun
      this.db.loadExtension(absolutePath);
      
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
   * Upsert a node (create if not exists, update if exists)
   * 
   * @param nodeId - Unique identifier for the node
   * @param properties - Properties to set on the node
   * @param label - Optional label for the node
   * 
   * @example
   * ```ts
   * graph.upsertNode('alice', { name: 'Alice', age: 30 }, 'Person');
   * ```
   */
  upsertNode(
    nodeId: string,
    properties: Record<string, CypherValue>,
    label?: string
  ): void {
    if (!this.extensionLoaded) {
      throw new GraphQLiteError(
        'GraphQLite extension not loaded. Provide extensionPath in constructor options.'
      );
    }

    const escapedId = nodeId.replace(/'/g, "\\'");
    const nodeLabel = label || 'Entity';
    const allProperties = { ...properties, id: nodeId };

    // Check if node exists
    const checkResult = this.cypher(`MATCH (n {id: '${escapedId}'}) RETURN count(n) as cnt`);
    const exists = checkResult.length > 0 && (checkResult[0]?.cnt as number) > 0;

    if (exists) {
      // Update existing node - set each property individually
      for (const [key, value] of Object.entries(properties)) {
        let valStr: string;
        if (value === null) {
          valStr = 'null';
        } else if (typeof value === 'string') {
          valStr = `'${value.replace(/'/g, "\\'")}'`;
        } else if (typeof value === 'boolean') {
          valStr = value.toString().toLowerCase();
        } else {
          valStr = String(value);
        }
        this.cypher(`MATCH (n {id: '${escapedId}'}) SET n.${key} = ${valStr}`);
      }
    } else {
      // Create new node with all properties
      const propPairs = Object.entries(allProperties).map(([key, value]) => {
        if (value === null) {
          return `${key}: null`;
        } else if (typeof value === 'string') {
          return `${key}: '${String(value).replace(/'/g, "\\'")}'`;
        } else if (typeof value === 'boolean') {
          return `${key}: ${value.toString().toLowerCase()}`;
        } else {
          return `${key}: ${value}`;
        }
      }).join(', ');
      this.cypher(`CREATE (n:${nodeLabel} {${propPairs}})`);
    }
  }

  /**
   * Upsert an edge (create if not exists, update if exists)
   * 
   * @param sourceId - Source node identifier
   * @param targetId - Target node identifier
   * @param properties - Properties to set on the edge
   * @param relType - Optional relationship type (defaults to 'RELATED')
   * 
   * @example
   * ```ts
   * graph.upsertEdge('alice', 'bob', { since: 2020 }, 'KNOWS');
   * ```
   */
  upsertEdge(
    sourceId: string,
    targetId: string,
    properties: Record<string, CypherValue>,
    relType?: string
  ): void {
    if (!this.extensionLoaded) {
      throw new GraphQLiteError(
        'GraphQLite extension not loaded. Provide extensionPath in constructor options.'
      );
    }

    const relationshipType = relType || 'RELATED';
    const escSource = sourceId.replace(/'/g, "\\'");
    const escTarget = targetId.replace(/'/g, "\\'");

    // Check if edge exists
    const checkResult = this.cypher(
      `MATCH (a {id: '${escSource}'})-[r]->(b {id: '${escTarget}'}) RETURN count(r) as cnt`
    );
    const exists = checkResult.length > 0 && (checkResult[0]?.cnt as number) > 0;

    if (exists) {
      // Update existing edge - set each property individually
      for (const [key, value] of Object.entries(properties)) {
        let valStr: string;
        if (value === null) {
          valStr = 'null';
        } else if (typeof value === 'string') {
          valStr = `'${value.replace(/'/g, "\\'")}'`;
        } else if (typeof value === 'boolean') {
          valStr = value.toString().toLowerCase();
        } else {
          valStr = String(value);
        }
        this.cypher(
          `MATCH (a {id: '${escSource}'})-[r:${relationshipType}]->(b {id: '${escTarget}'}) SET r.${key} = ${valStr}`
        );
      }
    } else {
      // Create new edge
      if (Object.keys(properties).length > 0) {
        const propPairs = Object.entries(properties).map(([key, value]) => {
          if (value === null) {
            return `${key}: null`;
          } else if (typeof value === 'string') {
            return `${key}: '${String(value).replace(/'/g, "\\'")}'`;
          } else if (typeof value === 'boolean') {
            return `${key}: ${value.toString().toLowerCase()}`;
          } else {
            return `${key}: ${value}`;
          }
        }).join(', ');
        this.cypher(
          `MATCH (a {id: '${escSource}'}), (b {id: '${escTarget}'}) CREATE (a)-[r:${relationshipType} {${propPairs}}]->(b)`
        );
      } else {
        this.cypher(
          `MATCH (a {id: '${escSource}'}), (b {id: '${escTarget}'}) CREATE (a)-[r:${relationshipType}]->(b)`
        );
      }
    }
  }

  /**
   * Compute PageRank scores for all nodes
   * 
   * @param damping - Damping factor (default: 0.85)
   * @param iterations - Number of iterations (default: 20)
   * @returns Map of node IDs to PageRank scores
   * 
   * @example
   * ```ts
   * const ranks = graph.pagerank(0.85, 20);
   * console.log(ranks['alice']); // 0.123...
   * ```
   */
  pagerank(damping: number = 0.85, iterations: number = 20): PageRankResult {
    if (!this.extensionLoaded) {
      throw new GraphQLiteError(
        'GraphQLite extension not loaded. Provide extensionPath in constructor options.'
      );
    }

    try {
      // Use Cypher function: RETURN pageRank(damping, iterations)
      const query = `RETURN pageRank(${damping}, ${iterations})`;
      const results = this.cypher<{ column_0: Array<{ node_id: number; user_id?: string; score: number }> }>(query);

      if (results.length > 0 && results[0]?.column_0) {
        const ranks: PageRankResult = {};
        const algoResults = results[0].column_0;
        
        if (Array.isArray(algoResults)) {
          for (const row of algoResults) {
            // Use user_id if available (string ID), otherwise fall back to node_id
            const id = row.user_id ?? String(row.node_id);
            if (id && typeof row.score === 'number') {
              ranks[String(id)] = row.score;
            }
          }
        }
        
        return ranks;
      }
    } catch (error) {
      throw new GraphQLiteError(
        `PageRank computation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {};
  }

  /**
   * Compute Louvain community detection
   * 
   * @param resolution - Resolution parameter (default: 1.0)
   * @returns Map of node IDs to community IDs
   * 
   * @example
   * ```ts
   * const communities = graph.louvain(1.0);
   * console.log(communities['alice']); // 0 (community ID)
   * ```
   */
  louvain(resolution: number = 1.0): LouvainResult {
    if (!this.extensionLoaded) {
      throw new GraphQLiteError(
        'GraphQLite extension not loaded. Provide extensionPath in constructor options.'
      );
    }

    try {
      // Use Cypher function: RETURN louvain(resolution)
      const query = `RETURN louvain(${resolution})`;
      const results = this.cypher<{ column_0: Array<{ node_id: number; user_id?: string; community: number }> }>(query);

      if (results.length > 0 && results[0]?.column_0) {
        const communities: LouvainResult = {};
        const algoResults = results[0].column_0;
        
        if (Array.isArray(algoResults)) {
          for (const row of algoResults) {
            // Use user_id if available (string ID), otherwise fall back to node_id
            const id = row.user_id ?? String(row.node_id);
            if (id && typeof row.community === 'number') {
              communities[String(id)] = row.community;
            }
          }
        }
        
        return communities;
      }
    } catch (error) {
      throw new GraphQLiteError(
        `Louvain computation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {};
  }

  /**
   * Find shortest path between two nodes using Dijkstra's algorithm
   * 
   * @param sourceId - Source node identifier
   * @param targetId - Target node identifier
   * @param weight - Optional property name to use as edge weight
   * @returns Path result with node IDs and optional distance, or null if no path exists
   * 
   * @example
   * ```ts
   * const path = graph.shortestPath('alice', 'bob');
   * if (path) {
   *   console.log(path.path); // ['alice', 'charlie', 'bob']
   *   console.log(path.distance); // 2
   * }
   * ```
   */
  shortestPath(
    sourceId: string,
    targetId: string,
    weight?: string
  ): ShortestPathResult | null {
    if (!this.extensionLoaded) {
      throw new GraphQLiteError(
        'GraphQLite extension not loaded. Provide extensionPath in constructor options.'
      );
    }

    try {
      // Use Cypher function: RETURN dijkstra("source", "target", "weight?")
      // Escape quotes in IDs
      const escSource = sourceId.replace(/"/g, '\\"');
      const escTarget = targetId.replace(/"/g, '\\"');
      
      let query: string;
      if (weight) {
        const escWeight = weight.replace(/"/g, '\\"');
        query = `RETURN dijkstra("${escSource}", "${escTarget}", "${escWeight}")`;
      } else {
        query = `RETURN dijkstra("${escSource}", "${escTarget}")`;
      }

      const results = this.cypher<{ column_0: { path: string[]; distance?: number; found?: boolean } }>(query);

      if (results.length > 0 && results[0]?.column_0) {
        const pathData = results[0].column_0;
        
        // Check if path was found
        if (pathData.found === false || !pathData.path || pathData.path.length === 0) {
          return null;
        }

        return {
          path: pathData.path,
          distance: pathData.distance,
        };
      }
    } catch (error) {
      throw new GraphQLiteError(
        `Shortest path computation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return null;
  }

  /**
   * Alias for shortestPath() using Dijkstra's algorithm
   * 
   * @param sourceId - Source node identifier
   * @param targetId - Target node identifier
   * @param weight - Optional property name to use as edge weight
   * @returns Path result with node IDs and optional distance, or null if no path exists
   * 
   * @example
   * ```ts
   * const path = graph.dijkstra('alice', 'bob', 'cost');
   * ```
   */
  dijkstra(
    sourceId: string,
    targetId: string,
    weight?: string
  ): ShortestPathResult | null {
    return this.shortestPath(sourceId, targetId, weight);
  }

  /**
   * Access the underlying SQLite database
   */
  getDatabase(): Database {
    return this.db;
  }
}


/**
 * Type definitions for GraphQLite TypeScript bindings
 */

/**
 * A value returned from a Cypher query
 */
export type CypherValue =
  | null
  | boolean
  | number
  | string
  | CypherValue[]
  | { [key: string]: CypherValue };

/**
 * A single row from a Cypher query result
 */
export interface CypherRow {
  [columnName: string]: CypherValue;
}

/**
 * Result structure returned from cypher() function
 */
export interface CypherResult {
  columns: string[];
  data: CypherValue[][];
}

/**
 * Options for opening a GraphQLite connection
 */
export interface GraphOptions {
  /** Path to the GraphQLite extension library */
  extensionPath?: string;
  /** Enable load_extension (required for loading extensions) */
  enableLoadExtension?: boolean;
}

/**
 * Graph statistics returned from stats methods
 */
export interface GraphStats {
  nodes: number;
  edges: number;
}

/**
 * Options for upserting nodes
 */
export interface UpsertNodeOptions {
  /** Optional label for the node */
  label?: string;
}

/**
 * Options for upserting edges
 */
export interface UpsertEdgeOptions {
  /** Optional relationship type */
  relType?: string;
}

/**
 * PageRank algorithm result
 * Maps node ID to PageRank score
 */
export type PageRankResult = Record<string, number>;

/**
 * Louvain community detection algorithm result
 * Maps node ID to community ID
 */
export type LouvainResult = Record<string, number>;

/**
 * Shortest path algorithm result
 */
export interface ShortestPathResult {
  /** Array of node IDs in the path */
  path: string[];
  /** Optional distance/cost of the path */
  distance?: number;
}

/**
 * Error thrown by GraphQLite operations
 */
export class GraphQLiteError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'GraphQLiteError';
  }
}


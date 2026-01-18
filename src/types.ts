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
 * Error thrown by GraphQLite operations
 */
export class GraphQLiteError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'GraphQLiteError';
  }
}


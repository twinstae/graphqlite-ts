/**
 * Utility functions for GraphQLite
 */

import * as fs from 'node:fs';
import type { CypherResult, CypherRow, CypherValue } from './types';

/**
 * Parse JSON result from cypher() function
 */
export function parseCypherResult(jsonStr: string): CypherResult {
  // Check if it's an error response
  if (typeof jsonStr === 'string' && jsonStr.startsWith('Error')) {
    throw new Error(jsonStr);
  }
  
  // Check if it's a success message (for CREATE/UPDATE/DELETE queries)
  if (typeof jsonStr === 'string' && jsonStr.includes('Query executed successfully')) {
    // Return empty result for non-RETURN queries
    return { columns: [], data: [] };
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    
    // Check if parsed result is an error
    if (typeof parsed === 'string' && parsed.startsWith('Error')) {
      throw new Error(parsed);
    }
    
    // Handle {columns, data} format
    if (parsed && typeof parsed === 'object' && 'columns' in parsed && 'data' in parsed) {
      return parsed as CypherResult;
    }
    
    // Handle array format: [{"name":"Alice","age":30}]
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Extract columns from first object
      const firstRow = parsed[0];
      if (typeof firstRow === 'object' && firstRow !== null) {
        const columns = Object.keys(firstRow);
        const data = parsed.map((row: any) => 
          columns.map(col => row[col] ?? null)
        );
        return { columns, data };
      }
    }
    
    // Handle empty array
    if (Array.isArray(parsed) && parsed.length === 0) {
      return { columns: [], data: [] };
    }
    
    // Handle empty result
    return { columns: [], data: [] };
  } catch (error) {
    // If JSON parsing fails, it might be a plain success message
    if (typeof jsonStr === 'string' && jsonStr.includes('successfully')) {
      return { columns: [], data: [] };
    }
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to parse Cypher result: ${jsonStr}`);
  }
}

/**
 * Convert CypherResult to array of row objects
 */
export function resultToRows(result: CypherResult): CypherRow[] {
  return result.data.map((rowData) => {
    const row: CypherRow = {};
    result.columns.forEach((column, index) => {
      row[column] = rowData[index] ?? null;
    });
    return row;
  });
}

/**
 * Get platform-specific library extension
 */
export function getLibraryExtension(): string {
  if (process.platform === 'darwin') {
    return '.dylib';
  } else if (process.platform === 'win32') {
    return '.dll';
  } else {
    return '.so';
  }
}

/**
 * Resolve path to GraphQLite extension library
 */
export function resolveExtensionPath(customPath?: string): string | null {
  if (customPath) {
    return customPath;
  }
  
  // Check environment variable
  const envPath = process.env.GRAPHQLITE_EXTENSION_PATH;
  if (envPath) {
    return envPath;
  }
  
  // Default search paths
  const ext = getLibraryExtension();
  const libName = `graphqlite${ext}`;
  
  const searchPaths = [
    `./build/${libName}`,
    `./native/${libName}`,
    `/usr/local/lib/${libName}`,
    `/usr/lib/${libName}`,
  ];
  
  // In Node.js/Bun, we can check if file exists
  try {
    for (const path of searchPaths) {
      try {
        if (fs.existsSync(path)) {
          return path;
        }
      } catch {
        // Continue searching
      }
    }
  } catch {
    // File system check not available
  }
  
  return null;
}

/**
 * Escape single quotes in a string for use in Cypher queries
 */
export function escapeCypherString(str: string): string {
  return str.replace(/'/g, "\\'");
}

/**
 * Format a Cypher value to its string representation
 */
export function formatCypherValue(value: CypherValue): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return `'${escapeCypherString(value)}'`;
  }
  if (typeof value === 'boolean') {
    return value.toString().toLowerCase();
  }
  return String(value);
}

/**
 * Format properties as a Cypher property map string
 * @example formatProperties({ name: 'Alice', age: 30 }) => "name: 'Alice', age: 30"
 */
export function formatCypherProperties(properties: Record<string, CypherValue>): string {
  return Object.entries(properties)
    .map(([key, value]) => {
      if (value === null) {
        return `${key}: null`;
      }
      if (typeof value === 'string') {
        return `${key}: '${escapeCypherString(String(value))}'`;
      }
      if (typeof value === 'boolean') {
        return `${key}: ${value.toString().toLowerCase()}`;
      }
      return `${key}: ${value}`;
    })
    .join(', ');
}


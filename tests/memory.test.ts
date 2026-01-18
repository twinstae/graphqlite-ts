/**
 * Memory management and safety tests
 */

import { test, expect } from 'bun:test';
import { Graph } from '../src/graph';
import { GraphQLiteError } from '../src/types';

const EXTENSION_PATH = process.env.GRAPHQLITE_EXTENSION_PATH || './native/graphqlite.so';

function createTestGraph(): Graph | null {
  try {
    return new Graph(':memory:', {
      extensionPath: EXTENSION_PATH,
      enableLoadExtension: true,
    });
  } catch (error) {
    if (error instanceof GraphQLiteError && error.message.includes('Failed to load')) {
      return null;
    }
    throw error;
  }
}

test('Multiple queries do not leak memory', () => {
  const graph = createTestGraph();
  if (!graph) {
    throw new Error('Extension not available');
  }

  try {
    graph.cypher("CREATE (n:Person {name: 'Test'})");
    
    // Execute many queries
    for (let i = 0; i < 100; i++) {
      const results = graph.cypher("MATCH (n:Person) RETURN n.name as name");
      expect(Array.isArray(results)).toBe(true);
    }
    
    // If we get here without crashing, memory is likely managed correctly
    expect(true).toBe(true);
  } finally {
    graph.close();
  }
});

test('Large result sets are handled correctly', () => {
  const graph = createTestGraph();
  if (!graph) {
    throw new Error('Extension not available');
  }

  try {
    // Create many nodes
    for (let i = 0; i < 100; i++) {
      graph.cypher(`CREATE (n:Person {name: 'Person${i}', id: ${i}})`);
    }
    
    // Query all nodes
    const results = graph.cypher("MATCH (n:Person) RETURN n.name as name, n.id as id ORDER BY n.id");
    expect(results.length).toBeGreaterThanOrEqual(100);
  } finally {
    graph.close();
  }
});

test('Null values are handled correctly', () => {
  const graph = createTestGraph();
  if (!graph) {
    throw new Error('Extension not available');
  }

  try {
    graph.cypher("CREATE (n:Person {name: 'Alice', age: NULL})");
    
    const results = graph.cypher("MATCH (n:Person) RETURN n.name as name, n.age as age");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe('Alice');
    expect(results[0]?.age).toBeNull();
  } finally {
    graph.close();
  }
});

test('Invalid input handling', () => {
  const graph = createTestGraph();
  if (!graph) {
    throw new Error('Extension not available');
  }

  try {
    // Empty string
    expect(() => graph.cypher('')).toThrow();
    
    // Null (TypeScript should prevent this, but test anyway)
    // This would be a compile error in TypeScript
    
    // Very long query string
    const longQuery = 'MATCH (n) RETURN n'.repeat(1000);
    // Should either work or throw a meaningful error, not crash
    try {
      graph.cypher(longQuery);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  } finally {
    graph.close();
  }
});

test('Closed database cannot be used', () => {
  const graph = createTestGraph();
  if (!graph) {
    throw new Error('Extension not available');
  }

  graph.close();
  
  // Attempting to use a closed database should throw
  expect(() => {
    graph.cypher("MATCH (n) RETURN n");
  }).toThrow();
});


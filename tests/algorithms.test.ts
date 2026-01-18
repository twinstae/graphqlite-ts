/**
 * Graph algorithm tests for GraphQLite
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

test('Graph statistics work', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.cypher("CREATE (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})");
    graph.cypher("MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS]->(b)");
    
    const stats = graph.getStats();
    expect(stats).toHaveProperty('nodes');
    expect(stats).toHaveProperty('edges');
    expect(typeof stats.nodes).toBe('number');
    expect(typeof stats.edges).toBe('number');
  } finally {
    graph.close();
  }
});

test('Load graph cache', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.cypher("CREATE (a:Person {name: 'Alice'})");
    
    // Should not throw
    expect(() => graph.loadGraph()).not.toThrow();
  } finally {
    graph.close();
  }
});

test('Unload graph cache', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.loadGraph();
    
    // Should not throw
    expect(() => graph.unloadGraph()).not.toThrow();
  } finally {
    graph.close();
  }
});

test('Reload graph cache', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.cypher("CREATE (a:Person {name: 'Alice'})");
    graph.loadGraph();
    
    // Should not throw
    expect(() => graph.reloadGraph()).not.toThrow();
  } finally {
    graph.close();
  }
});

// Note: Actual algorithm tests (PageRank, shortest path, etc.) would require
// more complex graph structures and verification of algorithm results.
// These can be added when the extension is fully available for testing.


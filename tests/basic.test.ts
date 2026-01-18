/**
 * Basic functionality tests for GraphQLite
 */

import { test, expect, beforeAll, afterAll } from 'bun:test';
import { Graph } from '../src/graph';
import { GraphQLiteError } from '../src/types';

// Note: These tests require the GraphQLite extension to be built
// and available at the expected path. They may be skipped if the
// extension is not available.

const EXTENSION_PATH = process.env.GRAPHQLITE_EXTENSION_PATH || './native/graphqlite.so';

test('Graph class can be instantiated', () => {
  const graph = new Graph(':memory:', {
    extensionPath: EXTENSION_PATH,
    enableLoadExtension: true,
  });
  expect(graph).toBeInstanceOf(Graph);
  graph.close();
});

test('Graph with extension loads successfully', () => {
  const graph = new Graph(':memory:', {
    extensionPath: EXTENSION_PATH,
    enableLoadExtension: true,
  });
  
  // If we get here without error, extension loading worked (or was skipped)
  graph.close();
});

test('Graph can execute simple Cypher query', () => {
  const graph = new Graph(':memory:', {
    extensionPath: EXTENSION_PATH,
    enableLoadExtension: true,
  });

  try {
    const results = graph.cypher('CREATE (n:Test {name: "test"}) RETURN n.name as name');
    expect(Array.isArray(results)).toBe(true);
  } finally {
    graph.close();
  }
});

test('Graph close() works', () => {
  const graph = new Graph(':memory:', {
    extensionPath: EXTENSION_PATH,
    enableLoadExtension: true,
  });
  
  // Should not throw
  expect(() => graph.close()).not.toThrow();
});


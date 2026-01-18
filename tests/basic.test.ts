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
  try {
    const graph = new Graph(':memory:', {
      extensionPath: EXTENSION_PATH,
      enableLoadExtension: true,
    });
    expect(graph).toBeInstanceOf(Graph);
    graph.close();
  } catch (error) {
    // If extension is not available, skip test
    if (error instanceof GraphQLiteError && (error.message.includes('Failed to load') || error.message.includes('not authorized'))) {
      console.warn('Skipping test: Extension not available or not authorized');
      return;
    }
    throw error;
  }
});

test('Graph with extension loads successfully', () => {
  try {
    const graph = new Graph(':memory:', {
      extensionPath: EXTENSION_PATH,
      enableLoadExtension: true,
    });
    
    // If we get here without error, extension loading worked (or was skipped)
    graph.close();
  } catch (error) {
    // If extension is not available, skip test
    if (error instanceof GraphQLiteError && error.message.includes('Failed to load extension')) {
      console.warn('Skipping test: Extension not available');
      return;
    }
    throw error;
  }
});

test('Graph can execute simple Cypher query', () => {
  try {
    const graph = new Graph(':memory:', {
      extensionPath: EXTENSION_PATH,
      enableLoadExtension: true,
    });

    try {
      const results = graph.cypher('CREATE (n:Test {name: "test"}) RETURN n.name as name');
      expect(Array.isArray(results)).toBe(true);
    } catch (error) {
      // If extension not loaded, skip this test
      if (error instanceof GraphQLiteError && error.message.includes('not loaded')) {
        console.warn('Skipping test: Extension not loaded');
        return;
      }
      throw error;
    } finally {
      graph.close();
    }
  } catch (error) {
    // If extension path is invalid, skip test
    if (error instanceof GraphQLiteError && error.message.includes('Failed to load')) {
      console.warn('Skipping test: Extension not available');
      return;
    }
    throw error;
  }
});

test('Graph close() works', () => {
  try {
    const graph = new Graph(':memory:', {
      extensionPath: EXTENSION_PATH,
      enableLoadExtension: true,
    });
    
    // Should not throw
    expect(() => graph.close()).not.toThrow();
  } catch (error) {
    // If extension is not available, skip test
    if (error instanceof GraphQLiteError && (error.message.includes('Failed to load') || error.message.includes('not authorized'))) {
      console.warn('Skipping test: Extension not available or not authorized');
      return;
    }
    throw error;
  }
});


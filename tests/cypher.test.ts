/**
 * Cypher query tests for GraphQLite
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
      return null; // Extension not available
    }
    throw error;
  }
}

test('CREATE node with properties', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.cypher("CREATE (n:Person {name: 'Alice', age: 30})");
    
    const results = graph.cypher("MATCH (n:Person {name: 'Alice'}) RETURN n.name as name, n.age as age");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe('Alice');
    expect(results[0]?.age).toBeDefined();
  } finally {
    graph.close();
  }
});

test('CREATE edge between nodes', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.cypher("CREATE (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})");
    graph.cypher("MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS {since: 2020}]->(b)");
    
    const results = graph.cypher("MATCH (a:Person)-[r:KNOWS]->(b:Person) RETURN a.name as from, b.name as to, r.since as since");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.from).toBe('Alice');
    expect(results[0]?.to).toBe('Bob');
    expect(results[0]?.since).toBe(2020);
  } finally {
    graph.close();
  }
});

test('MATCH with WHERE clause', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.cypher("CREATE (n1:Person {name: 'Alice', age: 30}), (n2:Person {name: 'Bob', age: 25})");
    
    const results = graph.cypher("MATCH (n:Person) WHERE n.age > 26 RETURN n.name as name ORDER BY n.name");
    expect(results.length).toBe(1);
    expect(results[0]?.name).toBe('Alice');
  } finally {
    graph.close();
  }
});

test('RETURN multiple columns', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.cypher("CREATE (n:Person {name: 'Alice', age: 30, city: 'NYC'})");
    
    const results = graph.cypher("MATCH (n:Person) RETURN n.name as name, n.age as age, n.city as city");
    expect(results.length).toBe(1);
    expect(results[0]?.name).toBe('Alice');
    expect(results[0]?.age).toBe(30);
    expect(results[0]?.city).toBe('NYC');
  } finally {
    graph.close();
  }
});

test('Complex pattern matching', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    // Create a chain: Alice -> Bob -> Charlie
    graph.cypher("CREATE (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}), (c:Person {name: 'Charlie'})");
    graph.cypher("MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}), (c:Person {name: 'Charlie'}) CREATE (a)-[:KNOWS]->(b)-[:KNOWS]->(c)");
    
    // Match two-hop path
    const results = graph.cypher("MATCH (a:Person)-[:KNOWS]->(b:Person)-[:KNOWS]->(c:Person) RETURN a.name as start, c.name as end");
    expect(results.length).toBeGreaterThan(0);
  } finally {
    graph.close();
  }
});

test('Parameterized query', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.cypher("CREATE (n:Person {name: 'Alice', age: 30})");
    
    const results = graph.cypher("MATCH (n:Person) WHERE n.name = $name RETURN n.age as age", {
      name: 'Alice',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.age).toBe(30);
  } finally {
    graph.close();
  }
});

test('Error handling for invalid Cypher syntax', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    expect(() => {
      graph.cypher("INVALID CYPHER SYNTAX");
    }).toThrow();
  } finally {
    graph.close();
  }
});

test('cypherRaw returns raw result structure', () => {
  const graph = createTestGraph();
  if (!graph) {
    console.warn('Skipping test: Extension not available');
    return;
  }

  try {
    graph.cypher("CREATE (n:Person {name: 'Alice'})");
    
    const result = graph.cypherRaw("MATCH (n:Person) RETURN n.name as name");
    expect(result).toHaveProperty('columns');
    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.columns)).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  } finally {
    graph.close();
  }
});


/**
 * Graph algorithm tests for GraphQLite
 */

import { test, expect } from 'bun:test';
import { Graph } from '../src/graph';
import { GraphQLiteError } from '../src/types';

const EXTENSION_PATH = process.env.GRAPHQLITE_EXTENSION_PATH || './native/graphqlite.so';

function createTestGraph(): Graph {
  return new Graph(':memory:', {
    extensionPath: EXTENSION_PATH,
    enableLoadExtension: true,
  });
}

test('Graph statistics work', () => {
  const graph = createTestGraph();

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

  try {
    graph.cypher("CREATE (a:Person {name: 'Alice'})");
    graph.loadGraph();
    
    // Should not throw
    expect(() => graph.reloadGraph()).not.toThrow();
  } finally {
    graph.close();
  }
});

test('upsertNode creates new node', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice', age: 30 }, 'Person');
    
    const results = graph.cypher("MATCH (n {id: 'alice'}) RETURN n.name as name, n.age as age");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe('Alice');
    expect(results[0]?.age).toBe(30);
  } finally {
    graph.close();
  }
});

test('upsertNode updates existing node', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice', age: 30 }, 'Person');
    graph.upsertNode('alice', { name: 'Alice', age: 31 }, 'Person');
    
    const results = graph.cypher("MATCH (n {id: 'alice'}) RETURN n.name as name, n.age as age");
    expect(results.length).toBe(1);
    expect(results[0]?.name).toBe('Alice');
    expect(results[0]?.age).toBe(31);
  } finally {
    graph.close();
  }
});

test('upsertEdge creates new edge', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice' }, 'Person');
    graph.upsertNode('bob', { name: 'Bob' }, 'Person');
    graph.upsertEdge('alice', 'bob', { since: 2020 }, 'KNOWS');
    
    const results = graph.cypher("MATCH (a {id: 'alice'})-[r:KNOWS]->(b {id: 'bob'}) RETURN r.since as since");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.since).toBe(2020);
  } finally {
    graph.close();
  }
});

test('upsertEdge updates existing edge', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice' }, 'Person');
    graph.upsertNode('bob', { name: 'Bob' }, 'Person');
    graph.upsertEdge('alice', 'bob', { since: 2020 }, 'KNOWS');
    graph.upsertEdge('alice', 'bob', { since: 2021 }, 'KNOWS');
    
    const results = graph.cypher("MATCH (a {id: 'alice'})-[r:KNOWS]->(b {id: 'bob'}) RETURN r.since as since");
    expect(results.length).toBe(1);
    expect(results[0]?.since).toBe(2021);
  } finally {
    graph.close();
  }
});

test('pagerank returns valid results', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice' }, 'Person');
    graph.upsertNode('bob', { name: 'Bob' }, 'Person');
    graph.upsertEdge('alice', 'bob', {}, 'KNOWS');
    
    const ranks = graph.pagerank();
    expect(typeof ranks).toBe('object');
    expect(ranks).toHaveProperty('alice');
    expect(ranks).toHaveProperty('bob');
    expect(typeof ranks.alice).toBe('number');
    expect(typeof ranks.bob).toBe('number');
  } finally {
    graph.close();
  }
});

test('louvain returns valid results', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice' }, 'Person');
    graph.upsertNode('bob', { name: 'Bob' }, 'Person');
    graph.upsertEdge('alice', 'bob', {}, 'KNOWS');
    
    const communities = graph.louvain();
    expect(typeof communities).toBe('object');
    expect(communities).toHaveProperty('alice');
    expect(communities).toHaveProperty('bob');
    expect(typeof communities.alice).toBe('number');
    expect(typeof communities.bob).toBe('number');
  } finally {
    graph.close();
  }
});

test('shortestPath finds path between connected nodes', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice' }, 'Person');
    graph.upsertNode('bob', { name: 'Bob' }, 'Person');
    graph.upsertEdge('alice', 'bob', {}, 'KNOWS');
    
    const path = graph.shortestPath('alice', 'bob');
    expect(path).not.toBeNull();
    expect(path).toHaveProperty('path');
    expect(Array.isArray(path!.path)).toBe(true);
    expect(path!.path.length).toBeGreaterThan(0);
  } finally {
    graph.close();
  }
});

test('shortestPath returns null for unreachable nodes', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice' }, 'Person');
    graph.upsertNode('bob', { name: 'Bob' }, 'Person');
    // No edge between them
    
    const path = graph.shortestPath('alice', 'bob');
    expect(path).toBeNull();
  } finally {
    graph.close();
  }
});

test('dijkstra alias works', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice' }, 'Person');
    graph.upsertNode('bob', { name: 'Bob' }, 'Person');
    graph.upsertEdge('alice', 'bob', {}, 'KNOWS');
    
    const path = graph.dijkstra('alice', 'bob');
    expect(path).not.toBeNull();
    expect(path).toHaveProperty('path');
  } finally {
    graph.close();
  }
});

test('upsertNode handles special characters in values', () => {
  const graph = createTestGraph();

  try {
    // Test with single quotes, which need escaping
    graph.upsertNode('test', { name: "O'Reilly", quote: "It's a test", description: 'Has "quotes" too' }, 'Test');
    
    const results = graph.cypher("MATCH (n {id: 'test'}) RETURN n.name as name, n.quote as quote, n.description as description");
    expect(results.length).toBe(1);
    expect(results[0]?.name).toBe("O'Reilly");
    expect(results[0]?.quote).toBe("It's a test");
    expect(results[0]?.description).toBe('Has "quotes" too');
  } finally {
    graph.close();
  }
});

test('upsertEdge handles special characters in properties', () => {
  const graph = createTestGraph();

  try {
    graph.upsertNode('alice', { name: 'Alice' }, 'Person');
    graph.upsertNode('bob', { name: 'Bob' }, 'Person');
    graph.upsertEdge('alice', 'bob', { note: "Alice's friend" }, 'KNOWS');
    
    const results = graph.cypher("MATCH (a {id: 'alice'})-[r:KNOWS]->(b {id: 'bob'}) RETURN r.note as note");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.note).toBe("Alice's friend");
  } finally {
    graph.close();
  }
});

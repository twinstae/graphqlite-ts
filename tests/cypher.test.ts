/**
 * Cypher query tests for GraphQLite
 */

import { test, expect } from 'bun:test';
import { Graph } from '../src/graph';

const EXTENSION_PATH = process.env.GRAPHQLITE_EXTENSION_PATH || './native/graphqlite.so';

function createTestGraph(): Graph {
  return new Graph(':memory:', {
    extensionPath: EXTENSION_PATH,
    enableLoadExtension: true,
  });
}

test('CREATE node with properties', () => {
  const graph = createTestGraph();

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

  try {
    graph.cypher("CREATE (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})");
    graph.cypher("MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS {since: 2020}]->(b)");
    
    const results = graph.cypher("MATCH (a:Person)-[r:KNOWS]->(b:Person) RETURN a.name as fromName, b.name as toName, r.since as since");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.fromName).toBe('Alice');
    expect(results[0]?.toName).toBe('Bob');
    expect(results[0]?.since).toBe(2020);
  } finally {
    graph.close();
  }
});

test('MATCH with WHERE clause', () => {
  const graph = createTestGraph();

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

  try {
    // Create a chain: Alice -> Bob -> Charlie
    graph.cypher("CREATE (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}), (c:Person {name: 'Charlie'})");
    graph.cypher("MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}), (c:Person {name: 'Charlie'}) CREATE (a)-[:KNOWS]->(b)-[:KNOWS]->(c)");
    
    // Match two-hop path
    const results = graph.cypher("MATCH (a:Person)-[:KNOWS]->(b:Person)-[:KNOWS]->(c:Person) RETURN a.name as startName, c.name as endName");
    expect(results.length).toBeGreaterThan(0);
  } finally {
    graph.close();
  }
});

test('Parameterized query', () => {
  const graph = createTestGraph();

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

test('cypherRaw with parameters', () => {
  const graph = createTestGraph();

  try {
    graph.cypher("CREATE (n:Person {name: 'Alice', age: 30})");
    
    const result = graph.cypherRaw("MATCH (n:Person) WHERE n.name = $name RETURN n.age as age", {
      name: 'Alice',
    });
    expect(result).toHaveProperty('columns');
    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.columns)).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.columns).toContain('age');
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0][0]).toBe(30);
  } finally {
    graph.close();
  }
});

test('Value escaping handles special characters', () => {
  const graph = createTestGraph();

  try {
    // Test escaping of single quotes in strings
    graph.cypher("CREATE (n:Person {name: 'O\\'Reilly', quote: \"It's a test\"})");
    
    const results = graph.cypher("MATCH (n:Person) WHERE n.name = 'O\\'Reilly' RETURN n.name as name, n.quote as quote");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe("O'Reilly");
  } finally {
    graph.close();
  }
});


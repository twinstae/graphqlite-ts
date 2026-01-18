# graphqlite-ts

TypeScript/JavaScript bindings for [GraphQLite](https://github.com/colliery-io/graphqlite) - a SQLite extension that adds graph database capabilities with Cypher query language support.

## Overview

GraphQLite adds graph database functionality to SQLite, allowing you to:
- Store and query graph data using Cypher query language
- Use graph algorithms (PageRank, shortest paths, community detection, etc.)
- Combine graph and relational queries in a single database

This library provides TypeScript/JavaScript bindings for GraphQLite using Bun's built-in SQLite support.

## Installation

```bash
bun install graphqlite-ts
```

## Prerequisites

Before using this library, you need to build or obtain the GraphQLite extension:

1. **Build from source** (recommended for development):
   ```bash
   git clone https://github.com/colliery-io/graphqlite.git
   cd graphqlite
   make extension
   ```

2. **Set the extension path** via environment variable:
   ```bash
   export GRAPHQLITE_EXTENSION_PATH=/path/to/graphqlite.so
   ```

   Or specify it in code when creating a Graph instance.

## Quick Start

```typescript
import { Graph } from 'graphqlite-ts';

// Open a graph database (in-memory or file)
const graph = new Graph(':memory:', {
  extensionPath: './native/graphqlite.so', // Path to extension
  enableLoadExtension: true,
});

// Create nodes with properties
graph.cypher("CREATE (alice:Person {name: 'Alice', age: 30})");
graph.cypher("CREATE (bob:Person {name: 'Bob', age: 25})");

// Create relationships
graph.cypher(`
  MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
  CREATE (a)-[:KNOWS {since: 2020}]->(b)
`);

// Query the graph
const results = graph.cypher(`
  MATCH (a:Person)-[:KNOWS]->(b:Person)
  RETURN a.name as from, b.name as to
`);

console.log(results);
// [{ from: 'Alice', to: 'Bob' }]

// Close the database
graph.close();
```

## API Reference

### `Graph` Class

#### Constructor

```typescript
new Graph(dbPath: string, options?: GraphOptions)
```

- `dbPath`: Path to SQLite database file, or `":memory:"` for in-memory database
- `options`:
  - `extensionPath?: string` - Path to GraphQLite extension library
  - `enableLoadExtension?: boolean` - Enable SQLite extension loading (default: `true`)

#### Methods

##### `cypher<T>(query: string, params?: Record<string, CypherValue>): T[]`

Execute a Cypher query and return results as an array of row objects.

```typescript
const results = graph.cypher<{name: string, age: number}>(
  "MATCH (n:Person) RETURN n.name as name, n.age as age"
);
```

##### `cypherRaw(query: string, params?: Record<string, CypherValue>): CypherResult`

Execute a Cypher query and return the raw result structure.

```typescript
const result = graph.cypherRaw("MATCH (n:Person) RETURN n.name");
// { columns: ['name'], data: [['Alice'], ['Bob']] }
```

##### `close(): void`

Close the database connection.

##### `getStats(): GraphStats`

Get graph statistics (node and edge counts).

```typescript
const stats = graph.getStats();
// { nodes: 10, edges: 15 }
```

##### `loadGraph(): void`

Load the graph into cache for algorithm acceleration.

##### `unloadGraph(): void`

Unload the graph from cache.

##### `reloadGraph(): void`

Reload the graph from the database into cache.

##### `upsertNode(nodeId: string, properties: Record<string, CypherValue>, label?: string): void`

Upsert a node (create if not exists, update if exists). Uses Cypher MERGE for idempotent operations.

```typescript
// Create or update a node with a label
graph.upsertNode('alice', { name: 'Alice', age: 30 }, 'Person');

// Create or update a node without a label
graph.upsertNode('node1', { value: 42 });
```

##### `upsertEdge(sourceId: string, targetId: string, properties: Record<string, CypherValue>, relType?: string): void`

Upsert an edge (create if not exists, update if exists). Uses Cypher MERGE for idempotent operations.

```typescript
// Create or update an edge with relationship type
graph.upsertEdge('alice', 'bob', { since: 2020 }, 'KNOWS');

// Create or update an edge without explicit type (defaults to 'RELATED')
graph.upsertEdge('node1', 'node2', { weight: 5 });
```

##### `pagerank(damping?: number, iterations?: number): PageRankResult`

Compute PageRank scores for all nodes in the graph.

- `damping`: Damping factor (default: `0.85`)
- `iterations`: Number of iterations (default: `20`)
- Returns: Map of node IDs to PageRank scores

```typescript
const ranks = graph.pagerank(0.85, 20);
console.log(ranks['alice']); // 0.123...
```

##### `louvain(resolution?: number): LouvainResult`

Compute Louvain community detection algorithm to find communities in the graph.

- `resolution`: Resolution parameter (default: `1.0`)
- Returns: Map of node IDs to community IDs

```typescript
const communities = graph.louvain(1.0);
console.log(communities['alice']); // 0 (community ID)
```

##### `shortestPath(sourceId: string, targetId: string, weight?: string): ShortestPathResult | null`

Find shortest path between two nodes using Dijkstra's algorithm.

- `sourceId`: Source node identifier
- `targetId`: Target node identifier
- `weight`: Optional property name to use as edge weight
- Returns: Path result with node IDs and optional distance, or `null` if no path exists

```typescript
const path = graph.shortestPath('alice', 'bob');
if (path) {
  console.log(path.path); // ['alice', 'charlie', 'bob']
  console.log(path.distance); // 2 (if weight property specified)
}

// With weighted edges
const weightedPath = graph.shortestPath('alice', 'bob', 'cost');
```

##### `dijkstra(sourceId: string, targetId: string, weight?: string): ShortestPathResult | null`

Alias for `shortestPath()`. Same functionality as `shortestPath()`.

```typescript
const path = graph.dijkstra('alice', 'bob', 'cost');
```

##### `getDatabase(): Database`

Access the underlying Bun SQLite database object.

## Type Definitions

### `CypherValue`

```typescript
type CypherValue =
  | null
  | boolean
  | number
  | string
  | CypherValue[]
  | { [key: string]: CypherValue };
```

### `CypherRow`

```typescript
interface CypherRow {
  [columnName: string]: CypherValue;
}
```

### `CypherResult`

```typescript
interface CypherResult {
  columns: string[];
  data: CypherValue[][];
}
```

## Examples

### Creating Nodes and Edges

```typescript
// Create nodes with labels and properties
graph.cypher("CREATE (n:Person {name: 'Alice', age: 30})");
graph.cypher("CREATE (n:Company {name: 'Acme Corp', founded: 2000})");

// Create relationships
graph.cypher(`
  MATCH (p:Person {name: 'Alice'}), (c:Company {name: 'Acme Corp'})
  CREATE (p)-[:WORKS_AT {since: 2020, role: 'Engineer'}]->(c)
`);
```

### Upserting Nodes and Edges

```typescript
// Upsert nodes (create or update)
graph.upsertNode('alice', { name: 'Alice', age: 30 }, 'Person');
graph.upsertNode('alice', { name: 'Alice', age: 31 }, 'Person'); // Updates age

// Upsert edges (create or update)
graph.upsertNode('alice', { name: 'Alice' }, 'Person');
graph.upsertNode('bob', { name: 'Bob' }, 'Person');
graph.upsertEdge('alice', 'bob', { since: 2020 }, 'KNOWS');
graph.upsertEdge('alice', 'bob', { since: 2021 }, 'KNOWS'); // Updates 'since' property
```

### Querying with MATCH

```typescript
// Find all people
const people = graph.cypher("MATCH (p:Person) RETURN p.name as name, p.age as age");

// Find relationships
const relationships = graph.cypher(`
  MATCH (a:Person)-[r:KNOWS]->(b:Person)
  RETURN a.name as from, b.name as to, r.since as since
`);

// Pattern matching
const paths = graph.cypher(`
  MATCH (a:Person)-[:KNOWS*2]->(c:Person)
  RETURN a.name as start, c.name as end
`);
```

### Using WHERE Clauses

```typescript
const adults = graph.cypher(`
  MATCH (p:Person)
  WHERE p.age >= 18
  RETURN p.name as name
`);
```

### Parameterized Queries

```typescript
const results = graph.cypher(
  "MATCH (p:Person {name: $name}) RETURN p.age as age",
  { name: 'Alice' }
);
```

### Graph Algorithms

```typescript
// PageRank - find important nodes
graph.upsertNode('alice', { name: 'Alice' }, 'Person');
graph.upsertNode('bob', { name: 'Bob' }, 'Person');
graph.upsertEdge('alice', 'bob', {}, 'FOLLOWS');
graph.upsertEdge('bob', 'alice', {}, 'FOLLOWS');

const ranks = graph.pagerank(0.85, 20);
console.log(ranks['alice']); // PageRank score

// Community Detection with Louvain
const communities = graph.louvain(1.0);
console.log(communities['alice']); // Community ID

// Shortest Path
graph.upsertNode('charlie', { name: 'Charlie' }, 'Person');
graph.upsertEdge('alice', 'charlie', {}, 'KNOWS');
graph.upsertEdge('charlie', 'bob', {}, 'KNOWS');

const path = graph.shortestPath('alice', 'bob');
if (path) {
  console.log(path.path); // ['alice', 'charlie', 'bob']
}

// Shortest path with weighted edges
graph.upsertEdge('alice', 'bob', { cost: 10 }, 'CONNECTED');
graph.upsertEdge('alice', 'charlie', { cost: 5 }, 'CONNECTED');
graph.upsertEdge('charlie', 'bob', { cost: 3 }, 'CONNECTED');

const weightedPath = graph.dijkstra('alice', 'bob', 'cost');
if (weightedPath) {
  console.log(weightedPath.path); // ['alice', 'charlie', 'bob']
  console.log(weightedPath.distance); // 8 (5 + 3)
}
```

## Platform Support

- **Linux**: `.so` extension files
- **macOS**: `.dylib` extension files
- **Windows**: `.dll` extension files (if GraphQLite supports Windows builds)

## Building the Extension

If you need to build GraphQLite from source:

```bash
# Clone the repository
git clone https://github.com/colliery-io/graphqlite.git
cd graphqlite

# Build the extension
make extension

# The extension will be in build/graphqlite.so (or .dylib on macOS)
```

## Troubleshooting

### Extension Not Found

If you see "Failed to load extension", ensure:
1. The extension file exists at the specified path
2. The path is absolute or relative to the current working directory
3. The extension matches your platform (Linux `.so`, macOS `.dylib`)

### Extension Loading Disabled

On some systems, SQLite extension loading may be disabled. The library attempts to enable it automatically, but if this fails, you may need to:
- Rebuild Bun with extension loading support
- Use a different SQLite installation

### Memory Issues

For large graphs, consider:
- Using `loadGraph()` to cache the graph structure
- Regularly calling `unloadGraph()` to free memory
- Using file-based databases instead of in-memory

## License

MIT

## Links

- [GraphQLite Repository](https://github.com/colliery-io/graphqlite)
- [GraphQLite Documentation](https://colliery-io.github.io/graphqlite/)
- [Cypher Query Language Reference](https://neo4j.com/docs/cypher-manual/)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

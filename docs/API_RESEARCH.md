# GraphQLite API Research Notes

## Architecture Overview

GraphQLite is a SQLite extension that adds graph database capabilities via Cypher query language support.

## Key Findings

### Extension Loading
- GraphQLite is compiled as a shared library: `.so` (Linux), `.dylib` (macOS), `.dll` (Windows)
- The extension must be loaded into a SQLite connection using `sqlite3_load_extension()`
- After loading, SQL functions become available

### SQL Functions Exposed

1. **`cypher(query, params_json?)`** - Main function for executing Cypher queries
   - Returns JSON string with query results
   - Optional second parameter for parameterized queries (JSON format)
   - Example: `SELECT cypher('MATCH (n:Person) RETURN n.name')`

2. **`graphqlite_test()`** - Test function to verify extension loaded
   - Returns: "GraphQLite extension loaded successfully!"

3. **`gql_load_graph()`** - Load graph into cache for algorithm acceleration
   - Returns: `{"status":"loaded","nodes":N,"edges":M}`

4. **`gql_unload_graph()`** - Unload cached graph
   - Returns: `{"status":"unloaded"}` or `{"status":"not_loaded"}`

5. **`gql_reload_graph()`** - Reload graph from database
   - Returns: Status JSON with node/edge counts

6. **`gql_graph_loaded()`** - Check if graph is loaded
   - Returns: `{"loaded":true,"nodes":N,"edges":M}` or `{"loaded":false}`

7. **`regexp(pattern, string)`** - Regex matching function

### API Usage Pattern (from Rust bindings)

```rust
// 1. Open SQLite connection
let conn = rusqlite::Connection::open(path)?;

// 2. Load extension
conn.load_extension(&extension_path, None)?;

// 3. Execute Cypher queries via SQL
let result: String = conn.query_row("SELECT cypher(?1)", [query], |row| row.get(0))?;

// 4. Parse JSON result
let cypher_result = CypherResult::from_json(&result);
```

### Result Format

The `cypher()` function returns JSON in this format:
```json
{
  "columns": ["name", "age"],
  "data": [
    ["Alice", 30],
    ["Bob", 25]
  ]
}
```

### Error Handling

If there's an error, the JSON string starts with "Error":
```json
"Error: syntax error at line 1"
```

## Implementation Strategy for TypeScript/Bun

Since GraphQLite works as a SQLite extension, we have two approaches:

### Approach 1: Use bun:sqlite (Recommended)
- Use Bun's built-in SQLite support
- Load extension using SQLite's load_extension method
- Execute `SELECT cypher(...)` queries
- Parse JSON results

### Approach 2: Use Bun FFI (As requested)
- Use FFI to call `sqlite3_open()`, `sqlite3_load_extension()`, etc.
- More low-level but gives more control
- Requires managing SQLite C API directly

Given the user's request for Bun FFI, we'll use Approach 2, but we may also provide Approach 1 as an alternative.


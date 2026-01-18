/**
 * Bun FFI bindings for GraphQLite
 * 
 * Note: GraphQLite is a SQLite extension, so we primarily use bun:sqlite
 * to interact with it. FFI is used here for future extensibility or if
 * we need direct access to C functions.
 * 
 * For now, this module provides utilities that may be useful for
 * low-level operations.
 */

import { resolveExtensionPath, getLibraryExtension } from './utils';

/**
 * Platform-specific library path utilities
 */
export function getNativeLibraryPath(customPath?: string): string | null {
  return resolveExtensionPath(customPath);
}

/**
 * Get the expected library filename for the current platform
 */
export function getLibraryFilename(): string {
  const ext = getLibraryExtension();
  return `graphqlite${ext}`;
}

/**
 * Note: Direct FFI usage for GraphQLite is limited since it's a SQLite extension.
 * The extension must be loaded via SQLite's extension API, which bun:sqlite
 * handles natively.
 * 
 * If we need to use FFI for SQLite operations directly (like sqlite3_load_extension),
 * we would need to link against SQLite's C library, which is typically already
 * available through bun:sqlite.
 */


/**
 * Platform compatibility tests
 */

import { test, expect } from 'bun:test';
import { getLibraryExtension, resolveExtensionPath } from '../src/utils';

test('Platform detection returns correct extension', () => {
  const ext = getLibraryExtension();
  expect(typeof ext).toBe('string');
  expect(['.so', '.dylib', '.dll']).toContain(ext);
});

test('Extension path resolution works', () => {
  const envPath = process.env.GRAPHQLITE_EXTENSION_PATH;
  
  // Test with custom path
  const customPath = '/custom/path/graphqlite.so';
  const resolved = resolveExtensionPath(customPath);
  expect(resolved).toBe(customPath);
  
  // Test with environment variable
  if (envPath) {
    const envResolved = resolveExtensionPath();
    expect(typeof envResolved).toBe('string');
  }
});


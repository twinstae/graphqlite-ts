#!/bin/bash
# Build script for GraphQLite native extension
# This script builds the GraphQLite extension from source

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/native"
GRAPHQLITE_SOURCE="${GRAPHQLITE_SOURCE:-/tmp/graphqlite-source}"

echo "Building GraphQLite extension..."
echo "Source: $GRAPHQLITE_SOURCE"
echo "Output: $BUILD_DIR"

# Check if source exists
if [ ! -d "$GRAPHQLITE_SOURCE" ]; then
    echo "Error: GraphQLite source not found at $GRAPHQLITE_SOURCE"
    echo "Please clone the repository:"
    echo "  git clone https://github.com/colliery-io/graphqlite.git $GRAPHQLITE_SOURCE"
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR"

# Build the extension
cd "$GRAPHQLITE_SOURCE"

# Use the Makefile to build the extension
# Check if make extension target exists
if make -n extension 2>/dev/null | grep -q "extension"; then
    echo "Building extension using Makefile..."
    make extension RELEASE=1
else
    echo "Warning: 'make extension' target not found, attempting manual build..."
fi

# Copy built extension to native directory
# The Makefile should build to build/ directory
if [ -f "$GRAPHQLITE_SOURCE/build/graphqlite.so" ]; then
    cp "$GRAPHQLITE_SOURCE/build/graphqlite.so" "$BUILD_DIR/"
    echo "✓ Copied graphqlite.so to $BUILD_DIR/"
elif [ -f "$GRAPHQLITE_SOURCE/build/graphqlite.dylib" ]; then
    cp "$GRAPHQLITE_SOURCE/build/graphqlite.dylib" "$BUILD_DIR/"
    echo "✓ Copied graphqlite.dylib to $BUILD_DIR/"
elif [ -f "$GRAPHQLITE_SOURCE/build/graphqlite.dll" ]; then
    cp "$GRAPHQLITE_SOURCE/build/graphqlite.dll" "$BUILD_DIR/"
    echo "✓ Copied graphqlite.dll to $BUILD_DIR/"
else
    echo "Warning: Could not find built extension in build/ directory"
    echo "Please build manually using: cd $GRAPHQLITE_SOURCE && make extension"
fi

echo "Build complete!"


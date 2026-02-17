#!/bin/bash
set -e

APP_NAME="jsmuggle"
OUTPUT_DIR="dist"
mkdir -p $OUTPUT_DIR

echo "Generating SEA blob..."
node --experimental-sea-config ./sea-config.json

# Get the Node binary path and copy it
NODE_PATH=$(command -v node)
EXECUTABLE_NAME=$APP_NAME

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    EXECUTABLE_NAME="${APP_NAME}.exe"
fi

cp "$NODE_PATH" "$OUTPUT_DIR/$EXECUTABLE_NAME"

echo "Injecting blob into $EXECUTABLE_NAME..."
POSTJECT_ARGS=(
    "$OUTPUT_DIR/$EXECUTABLE_NAME" 
    "NODE_SEA_BLOB" 
    "$OUTPUT_DIR/sea-prep.blob" 
    "--sentinel-fuse" "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"
)

# macOS requires an extra segment name
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Remove existing signature first
    codesign --remove-signature "$OUTPUT_DIR/$EXECUTABLE_NAME"
    npx postject "${POSTJECT_ARGS[@]}" --macho-segment-name "NODE_SEA"
    # Re-sign for local execution (ad-hoc)
    codesign --sign - "$OUTPUT_DIR/$EXECUTABLE_NAME"
else
    npx postject "${POSTJECT_ARGS[@]}"
fi

echo "✓ Created $OUTPUT_DIR/$EXECUTABLE_NAME"
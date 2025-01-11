#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(dirname "$0")"

# Files to sync (relative to src/ and gui/src/)
FILES_TO_SYNC=(
    "benchmark.ts"
    "benchmarkTypes.ts"
)

# Function to sync file based on most recent modification
sync_file() {
    local file=$1
    local src_file="$SCRIPT_DIR/../../src/$file"
    local gui_file="$SCRIPT_DIR/../src/$file"

    if [ ! -f "$src_file" ] || [ ! -f "$gui_file" ]; then
        echo "ERROR: One or both files do not exist:"
        echo "  $src_file"
        echo "  $gui_file"
        return 1
    fi

    # Get modification times
    local src_time=$(stat -c %Y "$src_file")
    local gui_time=$(stat -c %Y "$gui_file")

    if [ $src_time -gt $gui_time ]; then
        read -p "Copy src/$file to gui/src/$file? [y/N] " response
        if [[ "$response" =~ ^[yY]$ ]]; then
            cp "$src_file" "$gui_file"
            echo "Copied src/$file to gui/src/$file"
        else
            echo "Skipped copying src/$file to gui/src/$file"
            return 1
        fi
    elif [ $gui_time -gt $src_time ]; then
        read -p "Copy gui/src/$file to src/$file? [y/N] " response
        if [[ "$response" =~ ^[yY]$ ]]; then
            cp "$gui_file" "$src_file"
            echo "Copied gui/src/$file to src/$file"
        else
            echo "Skipped copying gui/src/$file to src/$file"
            return 1
        fi
    else
        echo "$file is already in sync"
    fi
}

# Sync all files
EXIT_CODE=0
for file in "${FILES_TO_SYNC[@]}"; do
    sync_file "$file" || EXIT_CODE=1
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "All files have been synchronized"
else
    echo "Some files could not be synchronized"
fi

exit $EXIT_CODE

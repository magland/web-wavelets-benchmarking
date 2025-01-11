#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(dirname "$0")"

# Files to check (relative to src/ and gui/src/)
FILES_TO_CHECK=(
    "benchmark.ts"
    "benchmarkTypes.ts"
)

# Function to check if files are identical
check_file() {
    local file=$1
    if ! diff "$SCRIPT_DIR/../../src/$file" "$SCRIPT_DIR/../src/$file" >/dev/null; then
        echo "ERROR: $file files are different between src/ and gui/src/"
        return 1
    fi
    return 0
}

# Check all files
EXIT_CODE=0
for file in "${FILES_TO_CHECK[@]}"; do
    check_file "$file" || EXIT_CODE=1
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "All files are identical"
else
    echo "Please ensure the files are identical"
fi

exit $EXIT_CODE

#!/bin/bash

# Post-deployment test runner script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing test dependencies..."
cd "$SCRIPT_DIR"
npm install --silent

echo ""
echo "Running post-deployment tests..."
node post-deployment.test.js

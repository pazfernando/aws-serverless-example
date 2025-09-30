#!/bin/bash

# Pre-deployment test runner script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing test dependencies..."
cd "$SCRIPT_DIR"
npm install --silent

echo ""
echo "Running pre-deployment tests..."
node pre-deployment.test.js

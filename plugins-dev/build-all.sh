#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

for plugin_dir in plugins-dev/*/; do
	plugin_name=$(basename "$plugin_dir")
	if [ "$plugin_name" = "ui" ] || [ "$plugin_name" = "_release" ] || [ "$plugin_name" = "vite.config.plugin.ts" ]; then
		continue
	fi
	if [ ! -f "$plugin_dir/index.ts" ]; then
		continue
	fi
	echo "Building $plugin_name..."
	PLUGIN="$plugin_name" npx vite build --config plugins-dev/vite.config.plugin.ts
done

echo "All plugins built."

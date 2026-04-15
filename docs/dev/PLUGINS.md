# Build a plugin

```bash
PLUGIN=hello-plugin npx vite build --config plugins-dev/vite.config.plugin.ts

PLUGIN=trade-stats-plugin npx vite build --config plugins-dev/vite.config.plugin.ts

PLUGIN=file-processor-plugin npx vite build --config plugins-dev/vite.config.plugin.ts
```

# Build a release version
```bash
PLUGIN=hello-plugin RELEASE=true npx vite build --config plugins-dev/vite.config.plugin.ts

PLUGIN=trade-stats-plugin RELEASE=true npx vite build --config plugins-dev/vite.config.plugin.ts

PLUGIN=file-processor-plugin RELEASE=true npx vite build --config plugins-dev/vite.config.plugin.ts
```
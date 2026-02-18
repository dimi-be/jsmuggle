# Contributing to jsmuggle

We welcome contributions to `jsmuggle`! This document provides guidelines for development, including project structure, build process, and technical stack.

## Development Setup

To get started with development, you'll need Node.js v22.x or higher.

```bash
# Install dependencies
npm install

# Build TypeScript (bundles into single executable)
npm run build

# Type check only (no emit)
npm run typecheck

# Run in development mode
npm run dev

# Run built version
npm start

# Run tests
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Format code
npx prettier --write .
```

## Build Process

The project uses **esbuild** to bundle all dependencies into a single executable file:

- **Input**: `src/index.ts`
- **Output**: `dist/jsmuggle.cjs` (496KB minified)
- **Format**: CommonJS (for Node.js compatibility)

Benefits of bundling:

- Single file distribution (~500KB vs multiple MB with node_modules)
- Faster startup time (no module resolution overhead)
- Self-contained executable
- Tree-shaking eliminates unused code

## Project Structure

```
src/
├── index.ts              # CLI entry point (Commander.js)
├── context.ts            # Shared context (HTTP client, cookie jar)
├── commands/
│   ├── auth/
│   │   ├── index.ts      # Auth command registration
│   │   ├── actions.ts    # Auth business logic (status/login/logout)
│   │   └── prompts.ts    # Login prompts (credentials)
│   ├── download/
│   │   ├── index.ts      # Download command registration
│   │   ├── actions.ts    # Download business logic
│   │   └── prompts.ts    # Download prompts (overwrite)
│   └── search/
│       ├── index.ts      # Search command registration
│       ├── actions.ts    # Search business logic
│       └── prompts.ts    # Search prompts (GC code input)
├── auth/
│   ├── index.ts          # Auth orchestration & re-exports
│   ├── login.ts          # CSRF token extraction & login flow
│   ├── session.ts        # Session validation
│   └── __tests__/        # Unit tests for auth module
├── scraper/
│   ├── client.ts         # HTTP client with cookie jar support
│   ├── geocache.ts       # Geocache page scraping
│   ├── search.ts         # Search functionality
│   ├── gpx.ts            # GPX file download
│   └── __tests__/        # Unit tests for scraper module
├── config/
│   └── storage.ts        # Session storage (cross-platform)
├── utils/
│   ├── fs.ts             # File system utilities
│   ├── download.ts       # Shared download logic for GPX files
│   └── har-logger.ts     # HAR format logging for trace mode
└── types/
    └── index.ts          # TypeScript interfaces
```

## Technical Stack

- **Runtime:** Node.js v22.x+
- **Language:** TypeScript 5.7.3
- **Bundler:** esbuild 0.27.3 (bundles all dependencies into single executable)
- **CLI Framework:** Commander.js 13.1.0
- **Interactive Prompts:** Clack 0.10.0
- **HTTP Client:** axios 1.7.9 with axios-cookiejar-support 5.0.5
- **Cookie Management:** tough-cookie 5.1.0
- **HTML Parsing:** LinkeDOM 0.18.9
- **Coordinate Parsing:** geo-coordinates-parser 1.7.4
- **Development:** tsx 4.19.2
- **Testing:** vitest 4.0.18
- **Formatting:** prettier 3.8.1

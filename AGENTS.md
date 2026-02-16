# jsmuggle - Agent Context

## Project Overview

jsmuggle is a Node.js CLI tool that downloads GPX files from geocaching.com for geocaching enthusiasts. It handles authentication, session management, and provides verbose/trace modes for debugging.

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run
node dist/index.cjs --help
```

## Project Structure

```
src/
├── index.ts              # CLI entry point with subcommand routing
├── context.ts            # Shared context (HTTP client, cookie jar, global options)
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

scripts/
└── build.js              # esbuild bundling script

dist/
├── index.cjs             # Bundled executable (main output)
└── index.cjs.map         # Source map for debugging
```

## Technical Stack

- **Runtime:** Node.js v20.x+
- **Language:** TypeScript 5.7.3
- **Bundler:** esbuild 0.27.3 (bundles all dependencies into single executable)
- **CLI:** Commander.js 13.1.0 with subcommands
- **Prompts:** Clack 0.10.0
- **HTTP:** axios 1.7.9 + axios-cookiejar-support 5.0.5
- **Cookies:** tough-cookie 5.1.0
- **HTML Parsing:** JSDOM 28.0.0
- **Coordinate Parsing:** geo-coordinates-parser 1.7.4
- **Development:** tsx 4.19.2
- **Testing:** vitest 4.0.18
- **Formatting:** prettier 3.8.1

## Key Conventions

1. **Cookie Management:**
    - Uses `axios-cookiejar-support` with `tough-cookie`
    - Cookie jar created once in `context.ts` and shared across all commands
    - Session stored in cross-platform location:
        - Windows: `%APPDATA%/jsmuggle/session.json`
        - macOS: `~/Library/Application Support/jsmuggle/session.json`
        - Linux: `~/.local/share/jsmuggle/session.json`
    - Cookies saved using `getSetCookieStringsSync()` to preserve all attributes

2. **Command Architecture:**
    - `src/index.ts` acts as the router defining all subcommands
    - `src/context.ts` provides shared HTTP client and global options
    - Each command receives a `CommandContext` object with `{ client, options }`
    - Commands are in `src/commands/[name]/index.ts`

3. **HTTP Client:**
    - `maxRedirects: 0` - redirects handled manually to check status codes
    - `validateStatus` allows 302 redirects
    - User-Agent: Firefox 140.0 on Linux
    - Created once per command execution via `initializeContext()`

4. **Error Handling:**
    - MVP approach: stop execution on error with informative message
    - All async errors bubble up to command handlers
    - HAR file saved in finally block if trace mode enabled

5. **Code Formatting:**
    - Uses Prettier for code formatting
    - Indentation: Tabs (for accessibility and readability)
    - Run `npx prettier --write .` before committing changes

## CLI Structure

### Global Options

Available to all commands:

- `--verbose`: Enable detailed logging
- `--trace [path]`: Enable HAR logging to `./jsmuggle.har` or the specified path

### Commands

#### `auth` - Manage user sessions

- `jsmuggle auth` - Check session status
- `jsmuggle auth login` - Force new login flow
- `jsmuggle auth logout` - Clear session file
- Options: `-u, --username`, `-p, --password`

#### `download` (alias: `d`) - Download GPX files

- `jsmuggle download <codes...>` - Download one or more GC codes
- Options: `-o, --output`, `-d, --delay`, `-f, --force`

#### `search` (alias: `s`) - Search for caches

- `jsmuggle search <searchTerm>` - Search by GC code, coordinates, or keyword
- `jsmuggle search <searchTerm> --download` - Auto-download all results
- Arguments: `<searchTerm>` (GC code, coordinates, or keyword)
- Options: `--no-premium`, `--download`, `-o, --output`, `-d, --delay`, `-f, --force`, `-r, --radius`, `-l, --limit`
- **Delay behavior**: The `-d, --delay` parameter applies to both search pagination requests (when fetching multiple pages) and download requests
- **Search Types**:
    - GC code: `GC13Y2Y` (case insensitive, max 14 chars)
    - Coordinates: `40° 26.7717, -79° 56.93172` or `40.446195, -79.948862`
    - Keyword: `Seattle`

**Interactive Mode:** When `--download` is not provided, shows a multiselect prompt to choose which caches to download.

### Default Behavior

Running `jsmuggle` without any command defaults to auth status check.

## Known Limitations

1. **MVP Error Handling:** Stops on first error rather than attempting recovery
2. **HAR File Location:** Fixed at `./jsmuggle.har` in current directory

## Build System

### esbuild Configuration

The build script (`scripts/build.js`) configures esbuild with:

- **Bundle**: All dependencies inlined (except jsdom)
- **Platform**: `node` - Node.js environment
- **Target**: `node20` - Node.js 20 compatibility
- **Format**: `cjs` - CommonJS output (works with Node.js CLI execution)
- **Minify**: Enabled for production builds
- **Sourcemap**: Enabled for debugging
- **External**: `jsdom` (has runtime file dependencies)

### Why CommonJS?

Although the source uses ESM (`"type": "module"`), the bundled output is CommonJS (`.cjs`) because:

1. ESM bundles don't work well with shebang execution in Node.js
2. CommonJS allows dynamic `require()` for native Node.js modules
3. Better compatibility with CLI execution patterns

## Debugging Commands

```bash
# Check CLI options
node dist/index.cjs --help

# Check auth subcommand
node dist/index.cjs auth --help

# Check download subcommand
node dist/index.cjs download --help

# Check search subcommand
node dist/index.cjs search --help

# Check session status
node dist/index.cjs auth

# Login
node dist/index.cjs auth login -u MyUser

# Download two caches
node dist/index.cjs download GC123 GC456 -o ./gpx

# Search and auto-download
node dist/index.cjs search -g GC123 --download

# Verbose mode
node dist/index.cjs --verbose download GC13Y2Y

# Trace mode
node dist/index.cjs --trace download GC13Y2Y

# Both modes
node dist/index.cjs --verbose --trace download GC13Y2Y
```

## Features

- **Subcommand-based CLI** - Clean separation of concerns with `auth`, `download`, and `search` commands
- **Interactive Mode** - Search results can be interactively selected for download using Clack multiselect
- **GPX Validation** - Validates downloaded files are valid GPX format before saving
- **Pre-download Checks** - Checks if file exists before attempting download to save API calls
- **Cross-platform Session Storage** - Session stored in appropriate location for each OS
- **Search Radius** - Configure search radius with `-r, --radius` parameter (passed to API)
- **Result Limiting** - Limit number of results with `-l, --limit` parameter (includes reference cache)
- **Automatic Pagination** - Fetches multiple pages using `skip` parameter when limit exceeds single page results
- **Progress Indication** - Shows "Fetching page X... (Y results)" spinner during multi-page fetches
- **JSON API** - Uses `results.json` endpoint with dynamically extracted buildId
- **Dynamic BuildId** - Automatically extracts buildId from `/play/results` page before each search session
- **Interactive Mode Limit** - Capped at 100 total results with user notification when exceeded

## Build Commands

```bash
npm run build      # Bundle with esbuild into dist/index.cjs
npm run typecheck  # Type check with tsc --noEmit
npm run dev        # Run with tsx (development)
npm start          # Run compiled version
```

### Build Details

- **Bundler**: esbuild 0.27.3
- **Entry**: `src/index.ts`
- **Output**: `dist/index.cjs` (496KB minified + sourcemap)
- **Target**: Node.js 20
- **Format**: CommonJS (required for bundling with Node.js native modules)
- **External**: `jsdom` (must remain external due to runtime file dependencies like `default-stylesheet.css` and `xhr-sync-worker.js`)
- **Shebang**: Automatically prepended to output for CLI execution

### Bundle Output

The build produces:

- `dist/index.cjs` - Main executable (496KB, minified)
- `dist/index.cjs.map` - Source map for debugging (1.7MB)

All npm dependencies (except jsdom) are bundled into the single file, making distribution easy.

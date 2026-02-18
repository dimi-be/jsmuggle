# jsmuggle

Generate GPX files from geocaching.com from the command line.

## Requirements

- Node.js v22.x or higher
- A geocaching.com account

## Installation

### Run from source

```bash
npm install
npm run dev
```

### Portable application

The easiest way to use `jsmuggle` (if you don't have node.js installed) is to download the pre-built SEA (Single Executable Application) executable for your operating system. These are offered for Linux, macOS, and Windows (x64).

**macOS Note**: The macOS version is not signed (and not tested). You may need to grant it permission to run in `System Settings > Privacy & Security`.

### Install using NPM

The best way is to install it globally with NPM. If you have Node.js (v22.x or higher) installed with npm.

```bash
npm install -g jsmuggle
```

### Using the Bundled Script (Node.js required)

If you have Node.js (v22.x or higher) installed, you can download just the bundled script instead of the full executable.

## Usage

```bash
jsmuggle [global-options] [command] [options]
```

### Global Options

These options are available for all commands:

- `--verbose` - Show extra details about HTTP requests being made
- `--trace [path]` - Trace mode logs all requests to `./jsmuggle.har` or the specified path
- `-h, --help` - Display help message

### Commands

#### `auth` - Manage user sessions

```bash
jsmuggle auth [action] [options]
```

**Actions:**

- (no action) - Check session status
- `login` - Force a new login flow
- `logout` - Clear the session file

**Options:**

- `-u, --username <username>` - Username for authentication
- `-p, --password <password>` - Password for authentication

**Examples:**

Check session status:

```bash
jsmuggle auth
```

Login with credentials:

```bash
jsmuggle auth login -u myusername -p mypassword
```

Login with prompts (if credentials not provided):

```bash
jsmuggle auth login
```

Logout:

```bash
jsmuggle auth logout
```

#### `download` (alias: `d`) - Fetch GPX files for specific caches

```bash
jsmuggle download <codes...> [options]
```

**Arguments:**

- `<codes...>` - One or more GC codes (e.g., GC13Y2Y GC12345)

**Options:**

- `-o, --output <directory>` - Output directory for GPX files (default: `.`)
- `-d, --delay <ms>` - Delay between requests in milliseconds (default: `1000`)
- `-f, --force` - Skip overwrite prompts and ignore individual download errors

**Examples:**

Download a single cache:

```bash
jsmuggle download GC13Y2Y
```

Download multiple caches:

```bash
jsmuggle download GC13Y2Y GC12345 GC99999
```

Download to specific directory:

```bash
jsmuggle download GC13Y2Y GC12345 -o ~/Downloads
```

Download with custom delay (2 seconds between each):

```bash
jsmuggle download GC13Y2Y GC12345 --delay 2000
```

Force download without prompts:

```bash
jsmuggle download GC13Y2Y GC12345 -f
```

Download with verbose mode:

```bash
jsmuggle download GC13Y2Y --verbose
```

Using the alias:

```bash
jsmuggle d GC13Y2Y GC12345 -o ~/Downloads
```

#### `search` (alias: `s`) - Query geocaches via GC code, coordinates, or keywords

```bash
jsmuggle search <searchTerm> [options]
```

**Arguments:**

- `<searchTerm>` - Required. Can be a GC code (e.g., `GC13Y2Y`), coordinates (e.g., `40° 26.7717, -79° 56.93172`), or keyword (e.g., `Seattle`)

**Options:**

- `--no-premium` - Filter out Premium Member Only caches
- `--download` - Download all results immediately after searching (non-interactive mode)
- `-o, --output <directory>` - Output directory for GPX files (default: `.`)
- `-d, --delay <ms>` - Delay between requests (search pagination and downloads) in milliseconds (default: `1000`)
- `-f, --force` - Skip overwrite prompts and ignore individual download errors
- `-r, --radius <number>` - Search radius in miles or kilometers based on user settings (default: `10`)
- `-l, --limit <number>` - Maximum number of results to display (default: `20`)

**Examples:**

Search by GC code:

```bash
jsmuggle search GC13Y2Y
jsmuggle s GC13Y2Y
```

Search by coordinates:

```bash
jsmuggle search "40° 26.7717, -79° 56.93172"
jsmuggle s "40.446195, -79.948862"
```

Search by keyword:

```bash
jsmuggle search Seattle
jsmuggle s "Central Park"
```

Search excluding premium-only caches:

```bash
jsmuggle search GC13Y2Y --no-premium
```

Search and download results:

```bash
jsmuggle search GC13Y2Y --download
jsmuggle search Seattle --download -o ~/Downloads
```

Search with custom radius (25 miles/km):

```bash
jsmuggle search GC13Y2Y --radius 25
```

Search with custom limit (show only 10 results):

```bash
jsmuggle search GC13Y2Y --limit 10
```

**Interactive Mode:**

When `--download` is not provided, the tool enters interactive mode and displays a multiselect prompt:

```bash
jsmuggle search GC13Y2Y
```

This will show search results with checkboxes. Use space to select caches, enter to confirm, and the selected caches will be downloaded.

### Default Behavior

If no command is provided, the tool defaults to checking session status (equivalent to `jsmuggle auth`):

```bash
jsmuggle
```

## Session Management

Session information is stored in a cross-platform location. The tool will:

1. Check for an existing valid session first
2. If no session exists or it's expired, prompt for credentials (if not provided as arguments)
3. Save the session after successful login
4. Never store your password - only session cookies

**Session storage locations:**

- Windows: `%APPDATA%/jsmuggle/session.json`
- macOS: `~/Library/Application Support/jsmuggle/session.json`
- Linux: `~/.local/share/jsmuggle/session.json`

## Features

- **Subcommand-based CLI** - Clean separation of concerns with `auth`, `download`, and `search` commands
- **Interactive Mode** - Search results can be interactively selected for download using Clack multiselect (when `--download` is not provided)
- **Interactive prompts** for credentials (passwords are hidden during input)
- **Session persistence** - no need to login every time
- **File overwrite confirmation** - prompts before replacing existing GPX files (skips to next cache if declined)
- **Pre-download file check** - checks if file exists before attempting download to save API calls
- **GPX file validation** - validates downloaded files are valid GPX format before saving
- **Directory validation** - checks if directory exists and is writable
- **Cache existence validation** - verifies geocache exists before downloading
- **Verbose mode** - shows HTTP requests with status codes for debugging
- **Trace mode** - logs all HTTP requests to a HAR file for detailed debugging
- **Multiple cache downloads** - download multiple caches in one command with space-separated GC codes
- **Flexible Search** - Search by GC code, coordinates (various formats supported), or keywords
- **Search and download** - download GPX files from search results (auto-download with `--download` or interactive selection)
- **Premium cache handling** - show all caches with `[P]` marker for premium, use `--no-premium` to filter out
- **Rate limiting** - configurable delay between downloads to avoid being blocked
- **Force mode** - skip all prompts and continue on errors
- **Progress tracking** - visual progress indicator showing X/Y completed
- **Search radius** - filter caches by distance from reference point with `-r, --radius`
- **Result limiting** - limit number of search results with `-l, --limit`
- **Automatic pagination** - automatically fetches multiple pages when limit exceeds single page capacity
- **Progress indication** - shows "Fetching page X... (Y results)" spinner when getting multiple pages of results

## Development

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

### Build Process

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

## License

GNU GENERAL PUBLIC LICENSE Version 3

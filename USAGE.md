# Usage

`jsmuggle [global-options] [command] [options]`

## Global Options

These options are available for all commands:

- `--verbose` - Show extra details about HTTP requests being made
- `--trace [path]` - Trace mode logs all requests to `./jsmuggle.har` or the specified path
- `-h, --help` - Display help message

## Commands

### `auth` - Manage user sessions

`jsmuggle auth [action] [options]`

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

### `download` (alias: `d`) - Fetch GPX files for specific caches

`jsmuggle download <codes...> [options]`

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

### `search` (alias: `s`) - Query geocaches via GC code, coordinates, or keywords

`jsmuggle search <searchTerm> [options]`

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

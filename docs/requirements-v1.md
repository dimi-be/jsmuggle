# jsmuggle MVP

## Description

jsmuggle is a tool that allows you to generate gpx files from the geocaching.com website from the commandline.

This document describes the minimal viable product for this tool. In this phase we do not wory too much about error handling. When we encounter an error we stop and provide as much information as possible to be able to debug it.

Keep in mind that the application will grow in the future and structure it in a way that makes it easily maintainable and extensible in the future.

## MVP User stories

The MVP focuses on two core functionalities: authentication and downloading single or multiple geocaches.

For detailed command usage, options, and examples, please refer to the main [README.md](../../README.md).

### 1. Authentication

- The `auth` command is used to manage user sessions.
- Users can check their login status, log in with their credentials, or log out.
- Sessions are persisted to avoid logging in for every command.

### 2. Download GPX Files

- The `download` command (with alias `d`) is used to fetch GPX files for one or more geocaches.
- It takes one or more GC codes as arguments.
- It includes options for specifying an output directory, adding a delay between requests, and forcing downloads.

## Requirements

### Usage

Usage: `jsmuggle [global-options] [command] [options]`

The tool is organized into commands. For a full list of commands and their options, see the main `README.md`.

**Global Options:**

- `--verbose` - Show extra details about what is going on.
- `--trace` - Trace mode logs all requests to ./jsmuggle.har
- `-h, --help` - Display help message

**Examples:**

- `jsmuggle auth`: Login and prompt for credentials if needed. Show session information.
- `jsmuggle download GC13Y2Y -o ~/Downloads`: Save GC13Y2Y.gpx file to `~/Downloads/`.

### Storage

Session information is stored in a cross-platform location to ensure persistence between commands.

- **Windows:** `%APPDATA%/jsmuggle/session.json`
- **macOS:** `~/Library/Application Support/jsmuggle/session.json`
- **Linux:** `~/.local/share/jsmuggle/session.json`

The tool prompts the user if a file to be downloaded already exists, unless the `--force` flag is used.

### Verbose mode

When verbose mode is active the tool will inform the user of the requests that were executed. In the form: `STATUS_CODE METHOD URL`

Examples:

- After getting the signin page succesfully will print:
  `200 GET https://www.geocaching.com/account/signin`
- When posting the login it will print:
  `200 POST https://www.geocaching.com/account/signin`
- Getting a geocache that does not exist:
  `404 GET https://www.geocaching.com/geocache/GC404FOO`

### Trace mode

When trace mode is active, a HAR file is created that will contain the details of all HTTP requests that are being made.

The file will be called `jsmuggle.har` and will be created in the current directory.

### Authentication requirements

The tool must login to geocaching.com using the user's username and password. It must store the session information, but not the password or username.

The password should not be visible when the users enters it when prompted (so if it is not passed as a paramter). Use Clack.

### Technical

Follow the following technical requirements:

- **Runtime:** Node.js v20.x+
- **Language:** TypeScript
- **CLI Framework:** Commander.js
- **Interactive Prompts:** Clack
- **HTTP Client:** axios with axios-cookiejar-support
- **Cookie Management:** tough-cookie
- **HTML Parsing:** LinkeDOM
- **prettier**
- **vitest**
- **geo-coordinates-parser**
  \n\n

# Search

The tool can be used to return perform a search and return a list of caches. In a later phase the option will be added to download the gpx files from this search.

# Search User Stories

## 1 Search and return results

**Subcommand:** `search <searchTerm>` (or alias `s`)

**Argument:** `searchTerm` **required!** can be a GC code, coordinates or a keyword

**Options:**

- `--no-premium` - Filter out Premium Member Only caches
- `--download` - Download all results immediately after searching (non-interactive mode)
- `-o, --output <directory>` - Output directory for GPX files (default: `.`)
- `-d, --delay <ms>` - Delay between requests (search pagination and downloads) in milliseconds (default: `1000`)
- `-f, --force` - Skip overwrite prompts and ignore individual download errors
- `-r, --radius <number>` - Search radius in miles or kilometers based on user settings (default: `10`)
- `-l, --limit <number>` - Maximum number of results to display (default: `20`)
- `-h, --help`: Print this message

**Examples:**

- `jsmuggle s GCK25B`
- `jsmuggle search GCK25B`
- `jsmuggle search GCK25B --no-premium`
- `jsmuggle s "N 47° 38.938 W 122° 20.887"`
- `jsmuggle s "47.6489667°, -122.3481167°"`
- `jsmuggle s Seattle`
- `jsmuggle search Seattle --download -o ~/Downloads`
- `jsmuggle search "Central Park" --radius 25 --limit 10`

The application will return a list of all the caches that have been found in the following format:
`GC_CODE name premium_indicator distance`

The premium inidicator is [P] if premium or nothing if not premium.

## 2 Search and download results

The .gpx files of the caches are downloaded when the `-o, --download` option is set.

First the program will perform a search and the results just story 1. Then it will start downloading in the same way as it now downloads multiple caches.

It will respect the behaviour that is set by specifying --force

Examples:

- `jsmuggle search GC123 -o ./gpx` Download to ./gpx folder
- `jsmuggle search GC123 --output ./gpx`
- `jsmuggle search GC123 --download --force` Continue on errors and overwrite existing files

## 3 Limit and Interactive Mode

The number of search results can be limited with the `-l, --limit` option. The default is 20.

When the `--download` flag is **not** provided, the tool enters an interactive mode. It displays the search results with checkboxes, allowing the user to select which caches to download.

## 4 Search Term Types

The search term can be any of the following: GC code, coordinates, or a keyword.

- **GC code:**
    - Case-insensitive
    - Starts with "GC"
    - Followed by alphanumeric characters

- **Coordinates:**
    - The tool uses the `geo-coordinates-parser` library to validate and parse various coordinate formats.
    - If the input is successfully parsed, the search is performed using the resulting latitude and longitude.

- **Keyword:** - Any input that is not identified as a GC code or a set of coordinates is treated as a keyword.
  \n\n

# Requirements: CLI Subcommand Refactor

## 1. Objective

Refactor the current flat CLI structure into a subcommand-based architecture using **Commander.js**. This will resolve flag naming conflicts (e.g., `-c` for coordinates vs. GC code) and provide a more scalable interface for future features like search and interactive lists.

## 2. Command Hierarchy & Mapping

### 2.1 Global Options

These options must be available to **all** subcommands.

- `--verbose`: Enable detailed logging.
- `--trace`: Enable HAR logging to `jsmuggle.har`.

### 2.2 Subcommand: `auth`

**Purpose:** Manage user sessions.

- **Action:** If no subcommand is provided (e.g., `jsmuggle auth`), check session status.
- **Sub-actions:** - `login`: Force a new login flow.
- `logout`: Clear the `session.json` file.

- **Options:**
- `-u, --username <string>`
- `-p, --password <string>`

### 2.3 Subcommand: `download` (or alias `d`)

**Purpose:** Fetch GPX files for specific caches.

- **Argument:** `<codes...>` (Required: One or more GC codes, space-separated).
- **Options:**
- `-o, --output <directory>`: (Replaces old `-d`). Default: `.`.
- `-d, --delay <ms>`: Delay between requests. Default: `1000`.
- `-f, --force`: Skip overwrite prompts and ignore individual download errors.

### 2.4 Subcommand: `search` (or alias `s`)

**Purpose:** Query geocaches via GC code, coordinates, or keywords.

- **Argument:** `<searchTerm>` (Required: A GC code, coordinates, or a keyword).
- **Options:**
- `--no-premium`: Filter out Premium Member Only caches.
- `--download`: Download all results immediately after searching.
- `-o, --output <directory>`: Output directory for GPX files.
- `-d, --delay <ms>`: Delay between requests.
- `-f, --force`: Skip overwrite prompts and ignore download errors.
- `-r, --radius <number>`: Search radius in miles or kilometers.
- `-l, --limit <number>`: Maximum number of results to display.

---

## 3. Implementation Details

### 3.1 Migration Logic

- **Flags to Arguments:** GC Codes are no longer passed via `-c`. They are now "positional arguments" for the `download` command.
- **Default Action:** If the user runs `jsmuggle` without any command, the tool should default to the `auth` (status check) logic.

### 3.2 Code Structure

The implementation agent should follow the folder structure defined in the current `README.md`:

1. **`src/index.ts`**: Acts as the router/entry point defining the commands.
2. **`src/commands/[command-name]/index.ts`**: Contains the `action()` logic for that specific subcommand.

---

## 4. User Interaction (Clack)

- **Prompting:** If `auth login` is called without `-u` or `-p`, use Clack's `text` and `password` prompts.

## 5. Examples for Implementation Testing

The agent must verify the following command syntax:

| Feature                          | Command                                     |
| -------------------------------- | ------------------------------------------- |
| **Check Login Status**           | `jsmuggle auth`                             |
| **Login with Prompts**           | `jsmuggle auth login`                       |
| **Login with Credentials**       | `jsmuggle auth login -u MyUser -p MyPass`   |
| **Logout**                       | `jsmuggle auth logout`                      |
| **Download Single Cache**        | `jsmuggle download GC123`                   |
| **Download Multiple Caches**     | `jsmuggle d GC123 GC456 -o ./gpx`           |
| **Search by Keyword**            | `jsmuggle search "Central Park"`            |
| **Search and Auto-Download**     | `jsmuggle s Seattle --download --radius 25` |
| **Search with Interactive Mode** | `jsmuggle search "40.446195, -79.948862"`   |

---

### Final Check for the Agent:

> **Note:** Ensure that `axios-cookiejar-support` and `tough-cookie` are shared across all subcommand instances so that a login in the `auth` command is recognized by the `download` command.

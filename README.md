# jsmuggle

Generate GPX files from geocaching.com from the command line.

## Features

- **Subcommand-based CLI** - Clean separation of concerns with `auth`, `download`, and `search` commands
- **Interactive Mode** - Search results can be interactively selected for download
- **Session persistence** - no need to login every time
- **Flexible Search** - Search by GC code, coordinates, or keywords
- **Search and download** - download GPX files from search results
- **Rate limiting** - configurable delay between downloads to avoid being blocked
- **Force mode** - skip all prompts and continue on errors

For a full list of features, see the detailed [Usage Guide](USAGE.md).

## Requirements

- Node.js v22.x or higher
- A geocaching.com account

## Installation

There are several ways to install `jsmuggle`.

### Portable application (Recommended)

The easiest way to use `jsmuggle` (if you don't have node.js installed) is to download the pre-built SEA (Single Executable Application) executable for your operating system from the [latest release](https://github.com/your-repo/jsmuggle/releases/latest). These are offered for Linux, macOS, and Windows (x64 only).

**macOS Note**: The macOS version is not signed. You may need to grant it permission to run in `System Settings > Privacy & Security`.

### Install using NPM

If you have Node.js (v22.x or higher) installed, you can install it globally with NPM.

```bash
npm install -g jsmuggle
```

## Basic Usage

Login to your geocaching.com account:

```bash
jsmuggle auth login
```

Search for caches by keyword and interactively select which ones to download:

```bash
jsmuggle search "Central Park"
```

Download specific caches by their GC code into a directory named `gpx-files`:

```bash
jsmuggle download GC13Y2Y GC12345 -o gpx-files
```

For a complete list of commands, options, and advanced usage scenarios, please refer to the **[Detailed Usage Guide](USAGE.md)**.

## Development

Contributions are welcome! Please see the **[Contributing Guide](CONTRIBUTING.md)** for details on how to set up your development environment, run tests, and build the project.

## License

[GNU GENERAL PUBLIC LICENSE Version 3](LICENSE)

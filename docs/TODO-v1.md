## Testing

- [x] Check all functionality
    - [x] Help
    - [x] Auth
        - [x] Help
        - [x] Delay
        - [x] Login
        - [x] Logout
    - [x] Download
        - [x] Help
        - [x] Delay
        - [x] Single
        - [x] Multi
        - [x] Prompt overwrite
        - [x] Force overwrite
        - [x] Output dir
    - [x] Search
        - [x] Help
        - [x] Delay
        - [x] GC code
        - [x] Coords
        - [x] Keyword
        - [x] Limit
        - [x] Radius
        - [x] Premium indicator
        - [x] No Premium
    - [x] Help
        - [x] Help
        - [x] Delay
        - [x] Router
        - [x] Auth
        - [x] Download
        - [x] Search

## TODOS

- [x] Check if .gpx exists before downloading not after
- [x] Test if downloaded file is a .gpx file before saving
- [x] Include the reference cache in the search results
- [x] Add multiple page functionality to search
- [x] change session location to .local folder (or/and make it cross platform)
- [x] remove unit conversion and just work with the returned distances since they match the users preference (can remove Math.js dependency)
- [x] HAR file: make location configurable via --trace
- [x] Output validation
    - [x] Search results distance between parenthesis for clarity
    - [x] Premium indicator after GC Code
    - [x] Hide error details unless verbose
- [x] Bug: Search: total caches count is inconsistent with --no-premium flag
      First all results are shown without premium and total will say for example 100, in interactive mode total is shown - premium 80 for exmample
      Fix: Also subtract the premium caches from the first total (== show total of filtered results)
- [~] Bug: Search: reference cache is double (can be result of switching to json api instead of html) (On hold, does not happen all the time, needs more investigation)
  Fix: Don't add reference cache anymore and just show all results
- [x] Change: Search: Don't print list with search results in interactive mode. Inmediately show cache selection form.
- [x] Delay should be a general option because it should be used in all sub commands
- [x] Esbuild for bundling

### Interactive Mode (Section 2)

- ✅ Logic gate implemented: `--download` triggers auto-download, otherwise shows multiselect
- ✅ Clack multiselect integrated for cache selection
- ✅ Selection output passed directly to download logic

### Testing and Polish (Section 3)

- ✅ Pre-download file check: Validates file existence before API call
- ✅ GPX validation: Validates downloaded file is valid GPX format with proper XML namespace
- ✅ Cross-platform session storage: Uses platform-appropriate directories
- ✅ Removed Math.js: Distances now displayed as returned by geocaching.com
- ✅ Reference cache inclusion: The GC code used for search is now included at the top of results with distance '0'
- ✅ Radius parameter: `-r, --radius <number>` with default 10, passed to API via `&r=` query parameter
- ✅ Limit parameter: `-l, --limit <number>` with default 20, applied client-side to slice results
- ✅ Multiple page functionality: Automatically fetches additional pages using `skip` parameter when user requests more results than single page provides
- ✅ JSON API: Uses `results.json` endpoint with dynamically extracted buildId
- ✅ Progress spinner: Shows "Fetching page X... (Y results)" when fetching multiple pages
- ✅ Interactive mode limit: Capped at 100 results total (including reference cache) with user notification
- ✅ Dynamic buildId extraction: Extracts buildId from `/play/results` page before search
- ✅ Flexible search: Removed `-g/--gc` option in favor of required positional `<searchTerm>` argument
- ✅ Search by coordinates: Uses geo-coordinates-parser to detect and convert coordinate formats
- ✅ Search by keyword: All non-GC-code, non-coordinate input treated as keyword search
- ✅ Smart search type detection: Automatically detects GC code, coordinates, or keywords
- ✅ Reference cache only for GC searches: Reference cache added only when searching by GC code

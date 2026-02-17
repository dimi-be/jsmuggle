# Scraping geocaching.com

This document outlines the specifications for scraping the geocaching.com website.

## Table of Contents

- [General Principles](#general-principles)
- [1. Authentication (Login)](#1-authentication-login)
    - [1.1. Phase 1: Capturing the CSRF Token](#11-phase-1-capturing-the-csrf-token)
    - [1.2. Phase 2: Submitting the Authentication POST](#12-phase-2-submitting-the-authentication-post)
    - [1.3. Phase 3: Validating the Session](#13-phase-3-validating-the-session)
- [2. Scraping User and Cache Information](#2-scraping-user-and-cache-information)
    - [2.1. Scraping the Username](#21-scraping-the-username)
    - [2.2. Scraping a Geocache Page](#22-scraping-a-geocache-page)
- [3. Downloading a GPX File](#3-downloading-a-gpx-file)
    - [3.1. Phase 1: Capturing Form Data](#31-phase-1-capturing-form-data)
    - [3.2. Phase 2: Executing the Download Request](#32-phase-2-executing-the-download-request)
- [4. Searching for Geocaches](#4-searching-for-geocaches)
    - [4.1. Step 1: Extracting the Search API `buildId`](#41-step-1-extracting-the-search-api-buildid)
    - [4.2. Search by GC Code](#42-search-by-gc-code)
    - [4.3. Search by Coordinates or Keyword](#43-search-by-coordinates-or-keyword)
    - [4.4. Handling Pagination](#44-handling-pagination)
    - [4.5. Parsing Search Results](#45-parsing-search-results)

---

## General Principles

These principles apply to all scraping requests made to geocaching.com.

### User-Agent

All requests must include a modern browser `User-Agent` header to avoid being blocked.

```
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0
```

### Cookie Management

Session cookies must be saved after every request and sent with subsequent requests to maintain the user's session and extend its duration.

---

## 1. Authentication (Login)

This section describes the multi-phase process for authenticating a user and establishing a valid session.

### 1.1. Phase 1: Capturing the CSRF Token

A `__RequestVerificationToken` (CSRF token) is required to submit the login form.

- **Target URL:** `https://www.geocaching.com/account/signin`
- **Method:** `GET`
- **Logic:**
    1.  Request the sign-in page to get initial session cookies.
    2.  Parse the HTML response using LinkeDOM.
    3.  Find the login form (`<form id="SignupSignin">`).
    4.  Extract the `value` from the hidden input `input[name="__RequestVerificationToken"]`.
    5.  Extract the `value` from the hidden input `input[name="ReturnUrl"]`.

### 1.2. Phase 2: Submitting the Authentication POST

Submit the user's credentials along with the tokens captured in Phase 1.

- **Target URL:** `/account/signin` (or the `action` attribute of the form).
- **Method:** `POST`
- **Headers:**
    - `Content-Type`: `application/x-www-form-urlencoded`
    - `Referer`: `https://www.geocaching.com/account/signin`
- **Body (URL-encoded):**
    - `UsernameOrEmail`: The user's username or email.
    - `Password`: The user's password.
    - `__RequestVerificationToken`: The token from Phase 1.
    - `ReturnUrl`: The URL from Phase 1.

### 1.3. Phase 3: Validating the Session

A successful login results in a `302 Redirect` to the user's profile or the specified `ReturnUrl`. To confirm, perform a follow-up request.

- **Validation URL:** `https://www.geocaching.com/account/settings/profile`
- **Method:** `GET`
- **Success Condition:** The response has a status code of `200`.
- **Failure Condition:** The response is a `302 Redirect` back to the sign-in page.

---

## 2. Scraping User and Cache Information

### 2.1. Scraping the Username

The username can be extracted from a script block on authenticated pages.

- **Logic:**
    1.  Find the script tag containing `window.chromeSettings`.
    2.  Use a regular expression to extract the `username` value from the JSON-like object within the script.

    ```html
    <script>
    	window.chromeSettings = {
    	  "username": "[USER_NAME]",
    	  ...
    	}
    </script>
    ```

### 2.2. Scraping a Geocache Page

Basic geocache details can be retrieved from its main page.

- **Target URL:** `https://www.geocaching.com/geocache/[GC_CODE]`
- **Method:** `GET`
- **Success Condition:** Status code `200`.
- **Failure Condition:** Status code `404` (cache not found).

#### Parsing Geocache Details:

- **Cache Name:** The text content of the `<span>` with `id="ctl00_ContentBody_CacheName"`.
- **Premium Status:** The page contains a `<section>` element with the class `premium-upgrade-widget`.

---

## 3. Downloading a GPX File

Downloading a GPX file requires a valid session and form data scraped from the geocache page.

### 3.1. Phase 1: Capturing Form Data

- **Target URL:** `https://www.geocaching.com/geocache/[GC_CODE]`
- **Method:** `GET`
- **Logic:**
    1.  Request the geocache page.
    2.  Parse the HTML with LinkeDOM and find the main form (`<form id="aspnetForm">`).
    3.  Extract all name-value pairs from the hidden inputs (`<input type="hidden">`).
    4.  Modify the form data: set the value of `__EVENTTARGET` to `ctl00$ContentBody$lnkGpxDownload`.
    5.  Ensure the `__RequestVerificationToken` is included in the cookies for the next request.

### 3.2. Phase 2: Executing the Download Request

- **Target URL:** `https://www.geocaching.com/geocache/[GC_CODE]`
- **Method:** `POST`
- **Headers:**
    - `Content-Type`: `application/x-www-form-urlencoded`
    - `Referer`: `https://www.geocaching.com/geocache/[GC_CODE]`
- **Body (URL-encoded):** All the name-value pairs captured and modified in Phase 1.
- **Response Handling:** The response should be treated as a stream (`responseType: 'stream'`) and piped to a file (e.g., `[GC_CODE].gpx`).

---

## 4. Searching for Geocaches

The search functionality relies on an internal API that requires a dynamic `buildId`.

### 4.1. Step 1: Extracting the Search API `buildId`

- **Target URL:** `https://www.geocaching.com/play/results`
- **Method:** `GET`
- **Logic:**
    1.  Find the `<script id="__NEXT_DATA__" type="application/json">` tag.
    2.  Parse its JSON content.
    3.  Extract the string value of the `buildId` attribute.

### 4.2. Search by GC Code

This search finds caches _near_ a reference geocache.

- **Target URL:** `https://www.geocaching.com/_next/data/[buildId]/en/play/results.json`
- **Method:** `GET`
- **Query Parameters:**
    - `oid`: The reference GC code.
    - `ot`: `'geocache'`
    - `sort`: `'distance'`
    - `asc`: `'true'`
    - `r`: Search radius (integer, unit based on user settings).
    - `skip`: `0` for the initial request.
- **Headers:**
    - `Referer`: `https://www.geocaching.com/play/results?[query-params-without-skip]`

### 4.3. Search by Coordinates or Keyword

- **Target URL:** Same as above.
- **Method:** `GET`
- **Query Parameters:**
    - `st`: The coordinates or keyword string.
    - `ot`: `'query'`
    - `sort`: `'distance'`
    - `asc`: `'true'`
    - `r`: Search radius.
    - `skip`: `0` for the initial request.
- **Headers:**
    - `Referer`: `https://www.geocaching.com/play/results?[query-params-without-skip]`

### 4.4. Handling Pagination

The search API response includes `total` (total results) and `take` (results per page).

- **Logic:** To get the next page, increment the `skip` parameter by the `take` value. (e.g., `skip = take * (pageNumber - 1)`).
- **End Condition:** Stop paginating when the `results` array in the response is empty.

### 4.5. Parsing Search Results

The search response is a JSON object.

#### Main Search Result Fields:

| Path                                            | Type    | Description                     |
| ----------------------------------------------- | ------- | ------------------------------- |
| `pageProps.searchResults.results[].code`        | string  | GC code of the result.          |
| `pageProps.searchResults.results[].name`        | string  | Full name of the cache.         |
| `pageProps.searchResults.results[].premiumOnly` | boolean | `true` if it's a premium cache. |
| `pageProps.searchResults.results[].distance`    | string  | Formatted distance with units.  |

#### Reference Geocache (for GC Code searches):

When searching by GC code, the reference cache is not in the `results` array and must be handled separately.

| Path                                     | Type    | Description                 |
| ---------------------------------------- | ------- | --------------------------- |
| `pageProps.geocache.referenceCode`       | string  | GC code of the reference.   |
| `pageProps.geocache.name`                | string  | Name of the reference.      |
| `pageProps.geocache.state.isPremiumOnly` | boolean | `true` if premium.          |
| **Distance**                             | N/A     | Should be displayed as '0'. |

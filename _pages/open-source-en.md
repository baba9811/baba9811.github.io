---
layout: page
title: Open Source Contributions
permalink: /en/open-source/
nav: false
nav_title: Open Source Contributions
nav_order: 2
lang: en
ko_url: /open-source/
---

<!-- Generated from Obsidian canonical contribution records. Update via the OSS workspace. -->

<div class="oss-contributions" markdown="1">

<div class="oss-intro" markdown="1">

Contributions to open-source projects.

[한국어](/open-source/)

</div>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> agno-agi/agno](https://github.com/agno-agi/agno)

Python · Sep 2026
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #9995](https://github.com/agno-agi/agno/pull/9995)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Fixed silent CSV row loss during asynchronous pagination by applying header skipping only to the first page; added regression tests for header modes, page boundaries and original row numbering.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [Issue #9999](https://github.com/agno-agi/agno/issues/9999)

bug report · Resolved via PR #10037
{: .oss-entry-meta}

</div>

Identified silent text loss in grouped PowerPoint shapes, traced the cause to missing traversal of nested shapes, and provided a minimal reproduction used to verify the upstream fix.

[Upstream fix: PR #10037](https://github.com/agno-agi/agno/pull/10037)
{: .oss-followup}

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> edwardkim/rhwp](https://github.com/edwardkim/rhwp)

TypeScript · Sep 2026
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #6786](https://github.com/edwardkim/rhwp/pull/6786)

bugfix · Merged into devel
{: .oss-entry-meta}

</div>

Fixed keyboard activation failures in text and highlight color controls by separating selection-preserving mousedown handling from standard click activation; added regression tests for keyboard and mouse input, selection preservation, and undo.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> google/adk-docs](https://github.com/google/adk-docs)

Markdown · Sep 2026
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #2244](https://github.com/google/adk-docs/pull/2244)

documentation · Merged into main
{: .oss-entry-meta}

</div>

Clarified that Python session-history filters limit the loaded event view while preserving stored history when new events are appended.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> google/adk-python](https://github.com/google/adk-python)

Python · Sep 2026
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #7072](https://github.com/google/adk-python/pull/7072)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Fixed empty-text artifacts being treated as missing by removing an incorrect rejection in the shared in-memory load path; added regression tests for storage backends, session/user scopes, version lookup, and session rewind.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #7113](https://github.com/google/adk-python/pull/7113)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Fixed file artifact creation timestamps changing on every metadata read by preserving persisted timestamps in the shared conversion helper; added regression tests for repeated reads, service reopening, multiple versions, and session/user scopes.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #7122](https://github.com/google/adk-python/pull/7122)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Prevented artifact paths from colliding with internal version storage by rejecting reserved filenames before writing; added regression tests for unsafe paths, ordinary nested names and legacy reads and deletes.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #7124](https://github.com/google/adk-python/pull/7124)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Restored oldest-first Redis session lists by sorting on update time with deterministic user and session ID tie-breakers; added regression tests for user-scoped and app-wide lists.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> i-am-bee/beeai-framework](https://github.com/i-am-bee/beeai-framework)

Python · Sep 2026
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #1660](https://github.com/i-am-bee/beeai-framework/pull/1660)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Fixed incorrect GrepTool search results for leading-hyphen patterns by separating ripgrep options from search arguments; added regression tests through the public API with real ripgrep.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #1661](https://github.com/i-am-bee/beeai-framework/pull/1661)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Prevented GrepTool from consuming or waiting on host input by isolating ripgrep's stdin with DEVNULL; added a public-API regression that verifies the host's input remains readable.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #1662](https://github.com/i-am-bee/beeai-framework/pull/1662)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Fixed default file, shell and console I/O failures in new execution contexts by providing local fallbacks when reading ContextVars; added public-API regressions for context isolation, nested overrides and cleanup back to defaults.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> pandas-dev/pandas](https://github.com/pandas-dev/pandas)

Python · Sep 2026
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #68991](https://github.com/pandas-dev/pandas/pull/68991)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Fixed empty cells left by hidden indexes and columns in Typst table output by filtering hidden cells while preserving sparse MultiIndex labels; added regressions for hiding, concatenation, truncation and empty tables.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> ratatui/ratatui](https://github.com/ratatui/ratatui)

Rust · Aug 2026
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #2743](https://github.com/ratatui/ratatui/pull/2743)

bugfix · Merged into main
{: .oss-entry-meta}

</div>

Fixed a BufferDiff rendering bug that left stale background and underline styles on wide Unicode glyphs by clearing trailing cells before repainting; added regression tests for emoji and Korean text.

</div>

</section>

</div>

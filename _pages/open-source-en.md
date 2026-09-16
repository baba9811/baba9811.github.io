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

[한국어](/open-source/)

Contributions to open-source projects.

## Agno

Python | Sep 2026

### [PR #9995](https://github.com/agno-agi/agno/pull/9995)

bugfix · Merged into main

Fixed silent CSV row loss during asynchronous pagination by applying header skipping only to the first page; added regression tests for header modes, page boundaries and original row numbering.

### [Issue #9999](https://github.com/agno-agi/agno/issues/9999)

bug report · Resolved via PR #10037

Identified silent text loss in grouped PowerPoint shapes, traced the cause to missing traversal of nested shapes, and provided a minimal reproduction used to verify the upstream fix.

[Upstream fix: PR #10037](https://github.com/agno-agi/agno/pull/10037)

## Google ADK

Python | Sep 2026

### [PR #7072](https://github.com/google/adk-python/pull/7072)

bugfix · Merged into main

Fixed empty-text artifacts being treated as missing by removing an incorrect rejection in the shared in-memory load path; added regression tests for storage backends, session/user scopes, version lookup, and session rewind.

### [PR #7113](https://github.com/google/adk-python/pull/7113)

bugfix · Merged into main

Fixed file artifact creation timestamps changing on every metadata read by preserving persisted timestamps in the shared conversion helper; added regression tests for repeated reads, service reopening, multiple versions, and session/user scopes.

## Ratatui

Rust | Aug 2026

### [PR #2743](https://github.com/ratatui/ratatui/pull/2743)

bugfix · Merged into main

Fixed a BufferDiff rendering bug that left stale background and underline styles on wide Unicode glyphs by clearing trailing cells before repainting; added regression tests for emoji and Korean text.

## rhwp

TypeScript | Sep 2026

### [PR #6786](https://github.com/edwardkim/rhwp/pull/6786)

bugfix · Merged into devel

Fixed keyboard activation failures in text and highlight color controls by separating selection-preserving mousedown handling from standard click activation; added regression tests for keyboard and mouse input, selection preservation, and undo.

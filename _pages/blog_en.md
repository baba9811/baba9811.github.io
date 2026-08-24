---
layout: default
permalink: /en/blog/
title: blog (en)
nav: true
nav_order: 2
lang: en
pagination:
  enabled: true
  collection: posts
  permalink: /page/:num/
  # 전 글을 한 페이지에 — per_page 5 + trail 5칸이면 7페이지가 되어
  # 가장 오래된 글까지 nav 에서 5클릭. 한 페이지면 2클릭. 100 초과 시 값만 올림
  per_page: 100
  sort_field: date
  sort_reverse: true
  locale: en
  trail:
    before: 1
    after: 3
---

{%- comment -%}
  This page intentionally has no body. jekyll-paginate-v2 reuses
  _pages/blog.md's body for every paginating index it generates, so the
  rendered HTML at /en/blog/ comes from blog.md. blog.md branches on
  `page.lang` (= "en" here, "ko" on /blog/) to swap the toggle button,
  the post-list filter, and the tag/category aggregation. Keep this page
  for its front-matter (permalink, locale, title, lang) only.
{%- endcomment -%}

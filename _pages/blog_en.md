---
layout: default
permalink: /en/blog/
title: blog (en)
nav: false
lang: en
pagination:
  enabled: true
  collection: posts
  permalink: /page/:num/
  per_page: 5
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

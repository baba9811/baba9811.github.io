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
  # trail 은 현재 페이지 주변 5칸만 보여줌 — 6페이지 이상이 되면 마지막 페이지가
  # 1페이지에서 링크되지 않음. pagination.liquid 의 처음·마지막 링크가 그걸 메움
  per_page: 10
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

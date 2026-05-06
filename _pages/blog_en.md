---
layout: default
permalink: /en/blog/
title: blog (en)
nav: false
lang: en
pagination:
  enabled: true
  collection: posts
  permalink: /en/page/:num/
  per_page: 5
  sort_field: date
  sort_reverse: true
  locale: en
  trail:
    before: 1
    after: 3
---

<div class="post">

{% assign blog_name_size = site.blog_name | size %}
{% assign blog_description_size = site.blog_description | size %}

{% if blog_name_size > 0 or blog_description_size > 0 %}

  <div class="header-bar">
    <h1>{{ site.blog_name }}</h1>
    <h2>{{ site.blog_description }}</h2>
  </div>
  {% endif %}

<p style="text-align: right; margin-bottom: 1rem;">
  <a href="{{ '/blog/' | relative_url }}" class="btn btn-sm btn-outline-secondary">🇰🇷 한국어</a>
</p>

{%- assign TAG_LIMIT = 6 -%}
{%- assign CAT_LIMIT = 3 -%}

{%- assign lang_posts = site.posts | where: "lang", "en" -%}
{%- assign tag_pool = lang_posts | map: "tags" | join: "," | split: "," -%}
{%- assign unique_tags = tag_pool | uniq -%}
{%- assign weighted_tags = "" -%}
{%- for tag in unique_tags -%}
  {%- if tag == "" -%}{%- continue -%}{%- endif -%}
  {%- assign cnt = 0 -%}
  {%- for t in tag_pool -%}
    {%- if t == tag -%}{%- assign cnt = cnt | plus: 1 -%}{%- endif -%}
  {%- endfor -%}
  {%- capture padded -%}00000{{ cnt }}{%- endcapture -%}
  {%- assign padded = padded | slice: -5, 5 -%}
  {%- assign weighted_tags = weighted_tags | append: padded | append: "|" | append: tag | append: "," -%}
{%- endfor -%}
{%- assign sorted_tags = weighted_tags | split: "," | sort | reverse -%}

{%- assign cat_pool = lang_posts | map: "categories" | join: "," | split: "," -%}
{%- assign unique_cats = cat_pool | uniq -%}
{%- assign weighted_cats = "" -%}
{%- for cat in unique_cats -%}
  {%- if cat == "" -%}{%- continue -%}{%- endif -%}
  {%- assign cnt = 0 -%}
  {%- for c in cat_pool -%}
    {%- if c == cat -%}{%- assign cnt = cnt | plus: 1 -%}{%- endif -%}
  {%- endfor -%}
  {%- capture padded -%}00000{{ cnt }}{%- endcapture -%}
  {%- assign padded = padded | slice: -5, 5 -%}
  {%- assign weighted_cats = weighted_cats | append: padded | append: "|" | append: cat | append: "," -%}
{%- endfor -%}
{%- assign sorted_cats = weighted_cats | split: "," | sort | reverse -%}

{% if sorted_tags.size > 0 or sorted_cats.size > 0 %}

  <div class="tag-category-list">
    <ul class="p-0 m-0">
      {% for entry in sorted_tags limit: TAG_LIMIT %}
        {% assign tag = entry | split: "|" | last %}
        {% if tag == "" %}{% continue %}{% endif %}
        <li>
          <i class="fa-solid fa-hashtag fa-sm"></i> <a href="{{ tag | slugify | prepend: '/blog/tag/' | relative_url }}">{{ tag }}</a>
        </li>
        {% unless forloop.last %}
          <p>&bull;</p>
        {% endunless %}
      {% endfor %}
      {% if sorted_cats.size > 0 and sorted_tags.size > 0 %}
        <p>&bull;</p>
      {% endif %}
      {% for entry in sorted_cats limit: CAT_LIMIT %}
        {% assign category = entry | split: "|" | last %}
        {% if category == "" %}{% continue %}{% endif %}
        <li>
          <i class="fa-solid fa-tag fa-sm"></i> <a href="{{ category | slugify | prepend: '/blog/category/' | relative_url }}">{{ category }}</a>
        </li>
        {% unless forloop.last %}
          <p>&bull;</p>
        {% endunless %}
      {% endfor %}
    </ul>
  </div>
  {% endif %}

{% assign featured_posts = lang_posts | where: "featured", "true" %}
{% if featured_posts.size > 0 %}
<br>

<div class="container featured-posts">
{% assign is_even = featured_posts.size | modulo: 2 %}
<div class="row row-cols-{% if featured_posts.size <= 2 or is_even == 0 %}2{% else %}3{% endif %}">
{% for post in featured_posts %}
<div class="col mb-4">
<a href="{{ post.url | relative_url }}">
<div class="card hoverable">
<div class="row g-0">
<div class="col-md-12">
<div class="card-body">
<div class="float-right">
<i class="fa-solid fa-thumbtack fa-xs"></i>
</div>
<h3 class="card-title text-lowercase">{{ post.title }}</h3>
<p class="card-text">{{ post.description }}</p>

                    {% if post.external_source == blank %}
                      {% assign read_time = post.content | number_of_words | divided_by: 180 | plus: 1 %}
                    {% else %}
                      {% assign read_time = post.feed_content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
                    {% endif %}
                    {% assign year = post.date | date: "%Y" %}

                    <p class="post-meta">
                      {{ read_time }} min read &nbsp; &middot; &nbsp;
                      <a href="{{ year | prepend: '/blog/' | relative_url }}">
                        <i class="fa-solid fa-calendar fa-sm"></i> {{ year }} </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
      {% endfor %}
      </div>
    </div>
    <hr>

{% endif %}

  <ul class="post-list">

    {% if page.pagination.enabled %}
      {% assign postlist = paginator.posts %}
    {% else %}
      {% assign postlist = lang_posts %}
    {% endif %}

    {% for post in postlist %}

    {% if post.external_source == blank %}
      {% assign read_time = post.content | number_of_words | divided_by: 180 | plus: 1 %}
    {% else %}
      {% assign read_time = post.feed_content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
    {% endif %}
    {% assign year = post.date | date: "%Y" %}
    {% assign tags = post.tags | join: "" %}
    {% assign categories = post.categories | join: "" %}

    <li>

{% if post.thumbnail %}

<div class="row">
          <div class="col-sm-9">
{% endif %}
        <h3>
        {% if post.redirect == blank %}
          <a class="post-title" href="{{ post.url | relative_url }}">{{ post.title }}</a>
        {% elsif post.redirect contains '://' %}
          <a class="post-title" href="{{ post.redirect }}" target="_blank">{{ post.title }}</a>
          <svg width="2rem" height="2rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        {% else %}
          <a class="post-title" href="{{ post.redirect | relative_url }}">{{ post.title }}</a>
        {% endif %}
      </h3>
      <p>{{ post.description }}</p>
      <p class="post-meta">
        {{ read_time }} min read &nbsp; &middot; &nbsp;
        {{ post.date | date: '%B %d, %Y' }}
        {% if post.external_source %}
        &nbsp; &middot; &nbsp; {{ post.external_source }}
        {% endif %}
      </p>
      <p class="post-tags">
        <a href="{{ year | prepend: '/blog/' | relative_url }}">
          <i class="fa-solid fa-calendar fa-sm"></i> {{ year }} </a>

          {% if tags != "" %}
          &nbsp; &middot; &nbsp;
            {% for tag in post.tags %}
            <a href="{{ tag | slugify | prepend: '/blog/tag/' | relative_url }}">
              <i class="fa-solid fa-hashtag fa-sm"></i> {{ tag }}</a>
              {% unless forloop.last %}
                &nbsp;
              {% endunless %}
              {% endfor %}
          {% endif %}

          {% if categories != "" %}
          &nbsp; &middot; &nbsp;
            {% for category in post.categories %}
            <a href="{{ category | slugify | prepend: '/blog/category/' | relative_url }}">
              <i class="fa-solid fa-tag fa-sm"></i> {{ category }}</a>
              {% unless forloop.last %}
                &nbsp;
              {% endunless %}
              {% endfor %}
          {% endif %}
    </p>

{% if post.thumbnail %}

</div>

  <div class="col-sm-3">
    <img class="card-img" src="{{ post.thumbnail | relative_url }}" style="object-fit: cover; height: 90%" alt="image">
  </div>
</div>
{% endif %}
    </li>

    {% endfor %}

  </ul>

{% if page.pagination.enabled %}
{% include pagination.liquid %}
{% endif %}

</div>

---
title:  "Jekyll을 이용한 github 블로그 포스팅"
excerpt: "md 파일에 마크다운 문법으로 작성하여 Github 원격 저장소에 업로드. 에디터는 Visual Studio code, 로컬 서버에서 확인. "

categories:
  - Blog
tags:
  - [Blog, jekyll, Github, Git]

toc: true
toc_sticky: true
 
date: 2022-01-05
last_modified_at: 2022-01-05
---
# 머릿말 작성 문법

title : 포스트의 제목을 큰 따옴표로 적어준다.
title:  "Jekyll을 이용한 github 블로그 포스팅"

excerpt : 포스트 목록에서 보여지는 블로그 소개글로 들어가는 것.
excerpt: "md 파일에 마크다운 문법으로 작성하여 Github 원격 저장소에 업로드. 에디터는 Visual Studio code, 로컬 서버에서 확인. "

categories : 포스트의 카테고리 설정

categories:
  - Blog


tags : 포스트의 태그 설정

tags:
  - [Blog, jekyll, Github, Git]


toc : table of contents. 포스트의 헤더들만 보여주는 목차를 사용할 것인지 여부 설정
true로 할 경우 포스트의 목차가 보이게 됨.

toc_sticky : true로 할경우 목차가 스크롤을 따라 움직이게 됨.

date : 글을 처음 작성한 날짜 yyyy-mm-dd 형식

last_modified_at : 글을 수정한 날짜

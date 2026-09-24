---
layout: page
title: 오픈소스 기여
permalink: /open-source/
nav: true
nav_title: Open Source Contributions
nav_order: 2
lang: ko
en_url: /en/open-source/
---

<!-- Generated from Obsidian canonical contribution records. Update via the OSS workspace. -->

<div class="oss-contributions" markdown="1">

<div class="oss-intro" markdown="1">

오픈소스 프로젝트에 기여한 기록입니다.

[English](/en/open-source/)

</div>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> agno-agi/agno](https://github.com/agno-agi/agno)

Python · 2026.09
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #9995](https://github.com/agno-agi/agno/pull/9995)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

비동기 CSV 페이지 처리 중 데이터 행이 누락되는 문제를 첫 페이지에서만 헤더를 건너뛰도록 수정하고, 헤더 처리 모드·페이지 경계·원본 행 번호에 대한 회귀 테스트 추가.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [Issue #9999](https://github.com/agno-agi/agno/issues/9999)

버그 제보 · 후속 PR #10037로 해결
{: .oss-entry-meta}

</div>

PowerPoint 그룹 내부 텍스트 누락을 발견하고 중첩 도형 탐색 누락으로 원인을 좁혀, 후속 수정 검증에 활용된 최소 재현 코드 제공.

[후속 수정: PR #10037](https://github.com/agno-agi/agno/pull/10037)
{: .oss-followup}

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> edwardkim/rhwp](https://github.com/edwardkim/rhwp)

TypeScript · 2026.09
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #6786](https://github.com/edwardkim/rhwp/pull/6786)

버그 수정 · devel 브랜치 병합
{: .oss-entry-meta}

</div>

글자색·형광펜 버튼의 키보드 활성화 오류를 선택 보존용 mousedown 처리와 표준 click 활성화를 분리해 수정하고, 키보드·마우스 입력과 선택 보존·실행 취소에 대한 회귀 테스트 추가.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> google/adk-docs](https://github.com/google/adk-docs)

Markdown · 2026.09
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #2244](https://github.com/google/adk-docs/pull/2244)

문서 · main 브랜치 병합
{: .oss-entry-meta}

</div>

Python 세션 이력 필터가 불러올 이벤트만 제한하며 새 이벤트를 추가해도 기존 저장 이력이 유지됨을 문서화.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> google/adk-python](https://github.com/google/adk-python)

Python · 2026.09
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #7072](https://github.com/google/adk-python/pull/7072)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

인메모리 공통 로딩 경로에서 빈 텍스트를 누락 데이터로 오인하던 조건을 제거해 수정하고, 저장소별 저장·조회와 세션·사용자 범위, 버전 조회 및 세션 되감기 회귀 테스트 추가.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #7113](https://github.com/google/adk-python/pull/7113)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

파일 아티팩트의 생성 시각이 조회할 때마다 바뀌던 버그를 공통 메타데이터 변환 함수에서 저장된 시각을 유지하도록 수정하고, 반복 조회·서비스 재생성·다중 버전·세션 및 사용자 범위 회귀 테스트 추가.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #7122](https://github.com/google/adk-python/pull/7122)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

파일 아티팩트 경로와 내부 버전 저장소의 충돌로 발생하던 누락·삭제 문제를 저장 전 경로 검증으로 차단하고, 잘못된 경로 거부·정상 중첩 경로·기존 데이터 읽기와 삭제 회귀 테스트 추가.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #7124](https://github.com/google/adk-python/pull/7124)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

Redis 세션 목록이 최신 활동순으로 반환되던 문제를 갱신 시각의 오름차순 정렬과 사용자·세션 ID 동률 처리로 수정하고, 사용자별·앱 전체 조회 회귀 테스트 추가.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> i-am-bee/beeai-framework](https://github.com/i-am-bee/beeai-framework)

Python · 2026.09
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #1660](https://github.com/i-am-bee/beeai-framework/pull/1660)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

하이픈으로 시작하는 검색어가 옵션으로 해석되어 GrepTool 검색 결과가 누락되거나 잘리는 문제를 ripgrep 옵션과 검색 인자를 분리해 수정하고, 공개 API와 실제 ripgrep을 사용하는 회귀 테스트 추가.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #1661](https://github.com/i-am-bee/beeai-framework/pull/1661)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

ripgrep의 표준 입력을 DEVNULL로 분리해 GrepTool이 호스트 입력을 소모하거나 대기하는 문제를 수정하고, 공개 API 실행 뒤 호스트 입력이 보존되는지 검증하는 회귀 테스트 추가.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #1662](https://github.com/i-am-bee/beeai-framework/pull/1662)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

ContextVar를 조회할 때 로컬 기본값을 제공해 새 실행 문맥에서 파일·셸·콘솔 I/O가 실패하는 문제를 수정하고, 문맥 분리·중첩 설정·설정 해제 후 기본 동작 복구를 검증하는 공개 API 회귀 테스트 추가.

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #1683](https://github.com/i-am-bee/beeai-framework/pull/1683)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

캐시 값의 참조를 유지하면서 내부 상태를 독립적으로 복사해 SlidingCache 복제본과 원본의 변경이 서로 영향을 주는 문제를 수정하고, 변경 격리·독립적인 항목 제거·TTL 만료 경계 회귀 테스트 추가.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> pandas-dev/pandas](https://github.com/pandas-dev/pandas)

Python · 2026.09
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #68991](https://github.com/pandas-dev/pandas/pull/68991)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

Typst 표 출력에서 숨긴 인덱스·열이 빈칸으로 남는 문제를 희소 MultiIndex 레이블을 보존하는 셀 필터링으로 수정하고, 숨김·표 연결·출력 생략·빈 표에 대한 회귀 테스트 추가.

</div>

</section>

<section class="oss-project" markdown="1">

<div class="oss-project-header" markdown="1">

## [<i class="fa-brands fa-github" aria-hidden="true"></i> ratatui/ratatui](https://github.com/ratatui/ratatui)

Rust · 2026.08
{: .oss-project-meta}

</div>

<div class="oss-entry" markdown="1">

<div class="oss-entry-header" markdown="1">

### [PR #2743](https://github.com/ratatui/ratatui/pull/2743)

버그 수정 · main 브랜치 병합
{: .oss-entry-meta}

</div>

와이드 Unicode 글리프의 스타일 변경 시 후행 셀에 배경색과 밑줄이 남던 BufferDiff 렌더링 버그를 재출력 전 후행 셀을 먼저 지우도록 수정하고, 이모지와 한글 회귀 테스트 추가.

</div>

</section>

</div>

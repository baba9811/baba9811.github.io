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

[English](/en/open-source/)

오픈소스 프로젝트에 기여한 기록입니다.

## Agno

Python | 2026.09

### [PR #9995](https://github.com/agno-agi/agno/pull/9995)

버그 수정 · main 브랜치 병합

비동기 CSV 페이지 처리 중 데이터 행이 누락되는 문제를 첫 페이지에서만 헤더를 건너뛰도록 수정하고, 헤더 처리 모드·페이지 경계·원본 행 번호에 대한 회귀 테스트 추가.

### [Issue #9999](https://github.com/agno-agi/agno/issues/9999)

버그 제보 · 후속 PR #10037로 해결

PowerPoint 그룹 내부 텍스트 누락을 발견하고 중첩 도형 탐색 누락으로 원인을 좁혀, 후속 수정 검증에 활용된 최소 재현 코드 제공.

[후속 수정: PR #10037](https://github.com/agno-agi/agno/pull/10037)

## Google ADK

Python | 2026.09

### [PR #7072](https://github.com/google/adk-python/pull/7072)

버그 수정 · main 브랜치 병합

인메모리 공통 로딩 경로에서 빈 텍스트를 누락 데이터로 오인하던 조건을 제거해 수정하고, 저장소별 저장·조회와 세션·사용자 범위, 버전 조회 및 세션 되감기 회귀 테스트 추가.

### [PR #7113](https://github.com/google/adk-python/pull/7113)

버그 수정 · main 브랜치 병합

파일 아티팩트의 생성 시각이 조회할 때마다 바뀌던 버그를 공통 메타데이터 변환 함수에서 저장된 시각을 유지하도록 수정하고, 반복 조회·서비스 재생성·다중 버전·세션 및 사용자 범위 회귀 테스트 추가.

## Ratatui

Rust | 2026.08

### [PR #2743](https://github.com/ratatui/ratatui/pull/2743)

버그 수정 · main 브랜치 병합

와이드 Unicode 글리프의 스타일 변경 시 후행 셀에 배경색과 밑줄이 남던 BufferDiff 렌더링 버그를 재출력 전 후행 셀을 먼저 지우도록 수정하고, 이모지와 한글 회귀 테스트 추가.

## ReMe

Python | 2026.09

### [PR #557](https://github.com/agentscope-ai/ReMe/pull/557)

버그 수정 · 진행 중

대용량 비정상 JSON의 인덱싱 실패를 해결하고 대체 처리 시 텍스트·줄 범위를 보존하는 수정 PR 제출; 청크 경계·줄바꿈·인덱스 교체 회귀 테스트 추가.

## rhwp

TypeScript | 2026.09

### [PR #6786](https://github.com/edwardkim/rhwp/pull/6786)

버그 수정 · devel 브랜치 병합

글자색·형광펜 버튼의 키보드 활성화 오류를 선택 보존용 mousedown 처리와 표준 click 활성화를 분리해 수정하고, 키보드·마우스 입력과 선택 보존·실행 취소에 대한 회귀 테스트 추가.

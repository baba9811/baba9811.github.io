---
layout: post
title: "[논문 리뷰] RAGU: A Multi-Step GraphRAG Engine with a Compact Domain-Adapted LLM"
date: 2026-08-20 14:00:00 +0900
description: "단일 패스 추출 대신 추출과 통합을 분리한 GraphRAG 엔진, 그리고 RAG 파이프라인 안의 LLM 에는 세계 지식이 아니라 언어 능력이 필요하다는 가설로 7B 추출기를 정당화한 시스템 논문"
tags: ["graphrag", "retrieval-augmented-generation", "knowledge-graph", "information-extraction", "small-language-models", "open-source"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/fig2-pipeline.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/
en_url: /en/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Mikhail Komarov et al. (저자 8명, ITMO University · Novosibirsk State University · Far Eastern Federal University) |
| 학회 | arXiv preprint · 2026 |
| arXiv 또는 DOI | [2607.11683](https://arxiv.org/abs/2607.11683) |
| Code | [RaguTeam/RAGU](https://github.com/RaguTeam/RAGU) |
| 데이터 | GraphRAG-Bench (Medical) · BioASQ · MuSiQue · 2WikiMultiHopQA · NEREL 기반 IE 벤치마크 · MERA |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-08-20 |

## TL;DR

- GraphRAG 시스템 대부분이 지식 그래프를 <strong>한 번의 LLM 추출 패스</strong>로 만든다. RAGU 는 추출 (extraction) 과 통합 (consolidation) 을 분리해, 2단계 타입 추출 → DBSCAN 기반 중복 제거 → LLM 요약 → Leiden 커뮤니티 탐지의 다단계 파이프라인으로 그래프를 만든다.
- 논문의 진짜 주장은 엔진이 아니라 가설이다. RAG 파이프라인 안에서 LLM 이 하는 일 — 이해, 추출, 문맥 위에서의 추론 — 은 <strong>세계 지식이 아니라 언어 능력</strong>이고, 언어 능력은 파라미터 수에 훨씬 약하게 스케일한다. Qwen2.5-Instruct 계열에서 세계 지식 퀴즈 (CheGeKa) F1 은 0.5B→72B 에 21.1배 오르는데, 모든 사실이 문맥에 주어지는 MultiQ 는 4배에 그친다 (로그-선형 기울기 0.65 대 0.26).
- 이 가설에 따라 7B 추출기 Meno-Lite-0.1 을 학습시켰다. 자체 IE 벤치마크 조화평균에서 Qwen2.5-32B 대비 상대 +12.5% (0.468 vs 0.416), 특히 관계 추출 F1 이 0.347 대 0.239 로 크게 앞선다.
- GraphRAG-Bench (Medical) 에서는 명확한 교차가 나온다. 단답 사실 검색은 HippoRAG 2 가 우세하지만 (AC 72.4 vs 54.2), 태스크가 합성 (synthesis) 쪽으로 갈수록 격차가 단조적으로 줄고 Creative Generation 에서 뒤집힌다 (AC 59.0 vs 56.9, Coverage 57.4 vs 34.7).
- multi-hop QA 에서 보이던 HippoRAG 2 의 큰 우위는 상당 부분 <strong>답변 포맷 아티팩트</strong>였다. 단답을 강제하면 2WikiMultiHopQA 격차가 −19.3pp 에서 −5.5pp 로 줄고 BioASQ 는 역전된다 (72.9 vs 72.4). 다만 MuSiQue 에서는 진짜 격차가 남는다 (54.4 vs 40.1).

## 소개 (Introduction)

RAG (retrieval-augmented generation) 는 LLM 을 외부 지식에 접지시키는 표준 레시피가 됐지만, 전통적 RAG 는 평평한 청크를 꺼내올 뿐 문서를 가로지르는 엔티티 관계를 포착하지 못한다. GraphRAG 는 그 틈을 지식 그래프로 메운다. 문서에서 엔티티와 관계를 뽑아 그래프를 만들고, 검색 시점에 그래프를 순회해 흩어진 근거를 모은다. Microsoft GraphRAG 이후 LightRAG, HippoRAG 2 등이 이 방향을 밀었고, 이제는 "GraphRAG 를 쓸 것인가"보다 "언제 쓸 가치가 있는가"가 질문이 된 단계다.

그런데 실제로 GraphRAG 를 프로덕션에 올려보면 세 가지가 걸린다. 첫째, 대부분의 시스템이 그래프 구축을 <strong>단일 LLM 추출 패스</strong>로 처리한다. 같은 인물이 청크마다 다른 표기로 등장하면 그냥 별개 노드가 되고, 이를 청크 경계 너머에서 합칠 장치가 없다. 결과는 노이즈가 많고 중복이 심한 그래프다. 둘째, 추출 품질이 그래프 품질을 결정한다는 이유로 실무자들은 기본값처럼 GPT-4 급 API 모델을 쓴다. 셋째, 오픈소스 프레임워크의 엔지니어링 성숙도가 낮다. 설치가 깨지거나, 심하면 LLM 원본 출력에 `eval()` 을 거는 코드 경로가 살아 있다.

이 논문이 흥미로운 건 두 번째 장애물을 <strong>가정이 아니라 검증 대상</strong>으로 놓았다는 점이다. 저자들은 "추출 품질을 위해 큰 모델이 필요하다"는 통념이 잘못된 전제 위에 서 있다고 본다. RAG 파이프라인 안에서 LLM 이 실제로 하는 일은 문맥을 읽고, 엔티티를 뽑고, 설명을 요약하고, 주어진 문맥에서 답을 만드는 것이다. 전부 <em>언어 능력</em>이지 <em>사실 암기</em>가 아니다. 그리고 두 능력은 파라미터 수에 대해 전혀 다른 기울기로 자란다는 것이 이 논문의 출발점이다.

그래서 논문은 세 가지를 한꺼번에 들고 나온다 — 가설, 그 가설에 맞춰 학습한 7B 추출 모델, 그리고 그 모델을 얹어 돌리는 모듈형 엔진. 시스템 데모 논문의 외형을 하고 있지만 실제로 읽을 가치가 있는 부분은 가설의 실증과, 그 가설이 downstream 에서 얼마나 (혹은 얼마나 안) 먹히는지에 대한 정직한 보고다.

## 핵심 기여 (Key Contributions)

- <strong>Language/World Knowledge 가설.</strong> 세계 지식은 파라미터 수에 거의 선형에 가깝게 자라지만 언어 능력은 훨씬 완만하게 자란다는 가설을 세우고, Qwen2.5-Instruct 6개 크기에 걸쳐 MERA 벤치마크로 검증했다. 이 가설이 컴팩트 추출기라는 설계 선택 전체를 떠받친다.
- <strong>Meno-Lite-0.1.</strong> RuadaptQwen2.5-7B-Lite-Beta 에서 파생한 7B 모델로, NEREL 스키마 기반 추출과 multi-hop QA 에 맞춰 continued pretraining + SFT 를 거쳤다. IE 벤치마크 조화평균에서 Qwen2.5-32B 를 상대 12.5% 앞선다.
- <strong>RAGU 엔진.</strong> 추출과 통합을 분리한 6단계 인덱싱 파이프라인, 검색 엔진 5종, 교체 가능한 3계층 스토리지. `pip install graph_ragu` 로 설치되고 단일 GPU 에서 돈다. MIT 라이선스.
- <strong>답변 포맷 교란 요인의 분리.</strong> multi-hop QA 에서 시스템 간 격차의 상당 부분이 답변 길이/형식 차이에서 온다는 것을 verbose/terse 두 프로토콜로 분리해 보였다. 리뷰어 입장에서 이 논문에서 가장 값어치 있는 실험이다.
- <strong>엔지니어링 감사.</strong> HippoRAG 2 의 고정 커밋을 대상으로 `eval()` 호출 위치, `assert False` 제어 흐름, 스토리지 추상화 부재 등을 파일·라인 단위로 짚었다. 재현 가능한 형태의 비판이라는 점에서 드문 부록이다.

## 관련 연구 / 배경 지식

### GraphRAG 계보

Microsoft GraphRAG (Edge et al., 2024) 는 엔티티·관계를 뽑아 그래프를 만든 뒤 커뮤니티 탐지로 계층을 세우고, 커뮤니티 요약을 map-reduce 로 합쳐 "이 코퍼스의 주요 테마는?" 같은 전역 질문에 답한다. 강력하지만 인덱싱 시점의 LLM 호출량이 크다 — 뒤에 나오는 비용 표에서 문서당 40k 토큰이라는 숫자가 여기서 온다.

LightRAG (Guo et al., 2025) 는 그 비용을 줄이는 방향이다. 자유 형식 단일 패스 추출로 그래프를 만들고 dual-level 검색 (low-level 엔티티 + high-level 테마) 으로 응답 속도를 확보한다. 대신 스키마 제약이 없어 추출 결과가 구조적으로 헐겁다. 이 논문의 GraphRAG-Bench 답변 품질 지표에서 LightRAG 가 네 난이도 전부 최하위인 것도 저자들은 여기서 설명한다.

HippoRAG 2 (Gutiérrez et al., 2025) 는 접근이 다르다. 해마 기억 이론에서 착안해 personalized PageRank 로 그래프를 순회하는데, 이 방식은 <em>체인을 따라가는</em> 검색에 특히 강하다. 이 논문의 결과에서 HippoRAG 2 가 단답 사실과 MuSiQue 에서 앞서는 이유가 정확히 이것이다. Wikontic (Chepurova et al., 2026) 은 Wikidata 온톨로지에 정렬된 그래프를 만드는 쪽으로, 타입 제약을 건다는 점에서 RAGU 와 방향이 겹친다.

### NEREL 스키마

RAGU 의 추출은 자유 형식이 아니라 <strong>NEREL 스키마</strong>에 묶여 있다. NEREL (Loukachevitch et al., 2021) 은 러시아어 뉴스 기사 900여 편에 중첩 개체명·관계·이벤트를 단 데이터셋으로, <strong>29개 엔티티 타입과 49개 관계 타입</strong>을 정의한다. RAGU 는 이 타입 집합을 추출기의 출력 공간으로 쓴다. 자유 형식 추출이 `"창시자"`, `"만든 사람"`, `"creator of"` 를 서로 다른 관계로 뱉는 문제를 스키마 단에서 없애는 셈이다.

대가도 분명하다. NEREL 은 러시아어 뉴스 도메인용으로 만들어진 스키마다. 뒤에 나오는 Dennis Ritchie 예제에서 "C 언어를 만들었다"가 `WORKS_AS` 로 잡히는 것도, 49개 관계 타입 집합이 저작·창작 관계를 직접 담아내지 못한 결과로 보인다. 저자들도 Bias 절에서 이 스키마가 다른 언어·도메인에 적용될 때 조정이 필요할 수 있음을 인정한다.

### MERA · CheGeKa · MultiQ

가설 검증에 쓰인 벤치마크들은 러시아어권 평가 스위트다. MERA (Fenogenova et al., 2024) 는 러시아어 LLM 종합 평가 벤치마크이고, 그 안의 CheGeKa 는 퀴즈쇼 문제 — 모델이 <em>기억</em>하고 있어야 답할 수 있는 세계 지식 태스크다. 반대로 MultiQ 는 답에 필요한 사실이 전부 문맥에 들어 있는 multi-hop QA 로, 순수하게 <em>읽고 조합하는</em> 능력만 본다. 이 대비가 논문의 핵심 그림을 만든다.

## 방법 / 아키텍처 상세

### 언어 능력과 세계 지식의 스케일링 분리

{% include figure.liquid loading="eager"
   path="assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/fig1-scaling.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Qwen2.5-Instruct 계열에서 모델 크기가 세계 지식 (CheGeKa) 과 언어 능력 (MultiQ) 에 미치는 영향. MultiQ 는 3B 부근에서 이미 대부분의 성능에 도달하고 32B 에서 포화해 72B 에서는 오히려 미세하게 내려간다. 반면 CheGeKa 는 72B 까지 계속 오른다."
   zoomable=true %}

논문의 첫 번째 그림이 사실상 논문 전체의 논증이다. 같은 모델 계열 (Qwen2.5-Instruct) 을 0.5B 부터 72B 까지 여섯 크기로 놓고 두 태스크의 F1 을 찍었다.

- <strong>CheGeKa</strong> (세계 지식): F1 이 0.5B→72B 에서 <strong>21.1배</strong> 증가. 로그-선형 기울기 0.65.
- <strong>MultiQ</strong> (문맥 내 사실 조합): 같은 구간에서 <strong>4배</strong>. 기울기 0.26.

기울기 차이 자체보다 곡선 모양이 더 설득력 있다. MultiQ 는 3B 부근에서 이미 0.39 에 도달하고 32B 에서 0.58 로 포화한다. 72B 는 오히려 아주 살짝 내려간다. 반면 CheGeKa 는 끝까지 우상향한다. RAG 파이프라인 안의 LLM 이 하는 일이 MultiQ 쪽에 가깝다면, 32B 를 인덱싱에 쓰는 건 대부분 낭비라는 얘기다.

### 다단계 그래프 구축

{% include figure.liquid loading="eager"
   path="assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/fig2-pipeline.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: 엔드투엔드 인덱싱 파이프라인. 실선 화살표는 단계 간 데이터 흐름, 점선 화살표는 각 단계가 만들어내는 산출물이다. 산출물 (청크 · 엔티티/관계 · 커뮤니티 · 커뮤니티 요약) 이 전부 명시적으로 저장된다는 점이 증분 갱신과 감사 가능성의 기반이 된다."
   zoomable=true %}

RAGU 의 인덱싱은 6단계로 나뉘고 각 단계가 교체 가능한 컴포넌트다.

<strong>Step 1 — 청킹.</strong> 세 가지 전략을 제공한다. `SimpleChunker` (고정 크기 + 오버랩), `SemanticTextChunker` (임베딩 기반으로 분할 지점 결정), `SmartSemanticChunker` (cross-encoder 재순위화까지). 특별할 건 없지만 뒤 단계가 전부 청크 품질에 의존하므로 선택지를 열어둔 것.

<strong>Step 2 — 2단계 타입 추출.</strong> 여기가 첫 번째 핵심이다. 단일 패스 시스템과 달리 RAGU 는 엔티티 추출 (Stage 1) 과 관계 추출 (Stage 2) 을 분리한다.

1. Stage 1 에서 엔티티를 먼저 뽑고 NEREL 스키마에 대해 검증한다.
2. 검증을 통과한 엔티티 집합을 Stage 2 의 <strong>제약 조건으로 되먹인다</strong>. 관계의 `source_entity` 와 `target_entity` 는 반드시 검증된 엔티티 이름과 일치해야 한다.

이 되먹임이 없으면 LLM 은 관계를 만들면서 엔티티 이름을 슬쩍 바꾸거나 (같은 사람을 "Ritchie" 와 "Dennis Ritchie" 로), 존재하지 않는 엔티티를 관계의 끝점으로 만들어낸다. 그래프에 dangling edge 와 유령 노드가 생기는 전형적인 경로다. 단계를 나누고 제약을 거는 것만으로 이 클래스의 오류가 구조적으로 사라진다. 두 단계 모두에 ICL 예시를 주입할 수 있고, 예시 선택 전략은 semantic / BM25 / hybrid / random 중에서 고른다.

<strong>Step 3 — Consolidation.</strong> 두 번째 핵심이자 논문 제목의 "multi-step" 이 가리키는 단계다. `EntitySummarizer` 가 엔티티를 (이름, 타입) 으로 묶고, 중복 언급이 많은 엔티티에 대해서는 DBSCAN 클러스터링과 LLM 요약을 적용한다. `RelationSummarizer` 도 같은 패턴을 따른다.

여기서 순서가 중요하다. <strong>커뮤니티 탐지 이전에</strong> 노이즈를 줄인다. 중복 노드가 남은 채로 Leiden 을 돌리면 같은 실체가 여러 노드로 쪼개진 상태에서 커뮤니티가 잡히므로, 커뮤니티 경계 자체가 오염된다. LightRAG 같은 단일 패스 시스템에 아예 없는 단계이고, 저자들이 성능 차이의 근원으로 지목하는 지점이기도 하다.

<strong>Steps 4–6 — 커뮤니티 탐지, 요약, 정제.</strong> 계층적 Leiden 클러스터링이 중복 제거된 그래프를 분할하고, LLM 이 각 커뮤니티에 대해 구조화된 리포트 (제목, 요약, findings) 를 만든다. 마지막으로 `RemoveIsolatedNodes` 같은 플러그형 모듈이 선택적으로 그래프를 정제한다.

### 검색 엔진 다섯 종

인덱싱된 그래프 위에서 다섯 가지 검색 엔진이 돈다.

| 엔진 | 동작 |
|------|------|
| `LocalSearch` | 벡터 유사도로 엔티티를 찾고 관계·청크로 확장 |
| `GlobalSearch` | LLM 이 커뮤니티 요약을 평가·선별해 전역 질문에 답변 |
| `NaiveSearch` | 그래프를 쓰지 않는 표준 벡터 RAG (내부 베이스라인) |
| `MixSearch` | 여러 엔진을 병렬로 돌려 결과 결합 |
| `QueryPlanEngine` | 질의를 DAG 로 분해해 하위 질의를 순서대로 해결 |

전부 cross-encoder 재순위화와 Qdrant 를 통한 dense+sparse 하이브리드 검색을 지원한다. 실험 표에 등장하는 `NaiveRAG` 행이 바로 이 `NaiveSearchEngine` 이라는 점이 중요하다 — 같은 생성 프롬프트를 공유하는 내부 대조군이므로, RAGU 대 NaiveRAG 비교는 프롬프트 차이가 제거된 순수 그래프 효과를 본다.

### 엔지니어링

시스템 논문답게 엔지니어링에 한 절을 통째로 쓴다. 요약하면 네 가지다.

1. <strong>3계층 스토리지 추상화</strong> (graph / KV / vector) 와 라이프사이클 콜백. 백엔드 교체가 생성자 인자 변경으로 끝난다 — NetworkX→Neo4j, NanoVDB→Qdrant.
2. <strong>async-first API</strong> 와 bounded concurrency. 세마포어로 동시 호출을 제한해 API rate limit 아래에서 안전한 처리량을 낸다.
3. <strong>Pydantic v2 로 검증되는 구조화 출력.</strong> LLM 응답을 수동 JSON 후처리하지 않고, 코드 인젝션 경로도 차단한다.
4. <strong>증분 upsert/update/delete</strong> 와 결정적 해시 기반 ID, 병합 정책, 그리고 스토어 간 정합성을 검사하는 consistency auditor.

여기에 약 374개의 테스트와 결정적 mock LLM 서버가 붙어 있어 API 키 없이 CI 를 돌릴 수 있다. 모든 도메인 객체 (엔티티, 관계, 청크) 가 결정적 MD5 식별자를 갖기 때문에 검색 결과를 원문까지 역추적할 수 있다.

### Meno-Lite-0.1

가설을 실물로 만든 부분이다. RuadaptQwen2.5-7B-Lite-Beta (Tikhomirov and Chernyshev, 2025) 에서 출발해 두 단계를 거쳤다.

- <strong>Continued pretraining</strong>: 1.3B 토큰. 러시아어·영어 교육/과학 텍스트.
- <strong>Supervised fine-tuning</strong>: 50M 토큰. NEREL 기반 추출, multi-hop QA (MultiHop-RAG, mtRAG), 질의 로그.

일반 목적 LLM 과의 결정적 차이는 instruction 설계에 있다. <strong>사실을 기억해 답하는 게 아니라 문맥을 사용해 답하도록</strong> 가르친다. 컴퓨트를 세계 지식이 아니라 언어 능력에 투자한다는 가설의 직접 구현이다.

주요 속성:

| 속성 | 값 |
|------|------|
| 파라미터 | 7B |
| 컨텍스트 윈도우 | 128K (128K 지점 passkey retrieval 0.98) |
| 토크나이저 효율 (러시아어) | 3.77 chars/token — vanilla Qwen2.5 의 2.57 대비 47% 개선 |
| 서빙 | vLLM, 단일 컨슈머 GPU |
| 라이선스 | Apache 2.0 |

## 학습 목표 / 손실 함수

이 논문은 새로운 손실 함수를 제안하지 않는다. Meno-Lite-0.1 의 학습은 표준적인 causal LM 목적 — continued pretraining 과 SFT 모두 다음 토큰 예측의 cross-entropy — 로 진행되고, 새로움은 손실의 형태가 아니라 <strong>어떤 데이터에 그 손실을 걸었는가</strong>에 있다. 그러니 이 절에서 정식화할 가치가 있는 건 손실이 아니라 논문이 세운 스케일링 가설 쪽이다.

파라미터 수 $N$ 에 대한 태스크 성능 $F\_1$ 을 로그-선형 모델로 놓으면

$$
\begin{aligned}
\log F_1 &= \alpha \log N + c, \\
\alpha_{\text{CheGeKa}} &= 0.65, \\
\alpha_{\text{MultiQ}} &= 0.26
\end{aligned}
$$

가 된다. 여기서 $\alpha$ 는 <em>파라미터를 두 배로 늘렸을 때 성능이 몇 배가 되는가</em>를 지배하는 지수다. 세계 지식 태스크의 $\alpha$ 가 언어 능력 태스크의 2.5배라는 것이 논문의 정량적 주장이고, 실제 관측된 배율 (21.1배 대 4배, 파라미터는 144배) 과도 대략 들어맞는다.

여기서 파생되는 설계 원칙은 단순하다. 파이프라인 안의 어떤 컴포넌트가 요구하는 능력이 $\alpha$ 가 작은 쪽에 속한다면, 그 컴포넌트에는 작은 모델을 붙여야 한다. RAG 인덱싱 — 청크를 읽고 엔티티를 뽑고 설명을 요약하는 일 — 은 전부 $\alpha$ 가 작은 쪽이다. 반면 답변 생성 단계는 사용자 질의에 따라 세계 지식이 섞여 들어올 수 있으므로 논문도 여기는 gpt-4o-mini 를 쓴다. 즉 이 가설은 "작은 모델로 다 된다"가 아니라 <strong>"파이프라인 단계별로 필요한 능력의 종류가 다르니 모델도 달라야 한다"</strong>에 가깝다.

## 학습 데이터와 파이프라인

### Meno-Lite-0.1 학습 구성

| 단계 | 데이터 | 규모 |
|------|--------|------|
| 베이스 | RuadaptQwen2.5-7B-Lite-Beta | 7B |
| Continued pretraining | 러시아어·영어 교육/과학 텍스트 (FineWeb-Edu, RuLM 등) | 1.3B 토큰 |
| SFT | NEREL 기반 추출 · MultiHop-RAG · mtRAG · 질의 로그 · GPT-4o-mini 합성 instruction | 50M 토큰 |

학습 코퍼스는 전부 공개 데이터셋이고, 저자들은 개인 식별 정보가 포함되지 않았음을 명시한다. IE 벤치마크는 NEREL 의 test-only 파생물로 MIT 라이선스이며 LM Evaluation Harness 에 `nerel-bench` 태스크 그룹으로 통합돼 있다.

### 평가 setup

| 항목 | 설정 |
|------|------|
| 벤치마크 | GraphRAG-Bench (Medical), BioASQ, MuSiQue, 2WikiMultiHopQA |
| 답변 생성 LLM | gpt-4o-mini (전 시스템 공통, 고정) |
| 그래프 구축 LLM | 독립 변수 — Meno-Lite-0.1 (7B), gpt-oss-20b, Qwen2.5-7B |
| 임베딩 | bge-large-en-v1.5 (GraphRAG-Bench) / gte-multilingual-base (multi-hop QA) |
| LLM-as-judge | google/gemini-3-flash-preview |
| 지표 | Answer Correctness (AC), ROUGE-L, Coverage, Faithfulness, Evidence Recall (ER), Context Relevancy |

설계에서 눈여겨볼 점 두 가지. 답변 생성 LLM 을 전 시스템에 고정해 <strong>그래프 구축 품질만 분리</strong>했고, judge 모델을 생성 모델과 다른 계열로 잡아 evaluator–generator 중첩을 피했다. 후자는 LLM-as-judge 실험에서 자주 빠뜨리는 통제인데 명시적으로 챙겼다.

## 실험 결과

### GraphRAG-Bench (Medical)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/tab1-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: GraphRAG-Bench (Medical) 생성 품질. 같은 시스템의 두 행은 인덱싱 LLM 만 다르다. 인덱싱 LLM 을 Qwen2.5-7B 에서 Meno-Lite-0.1 로 바꿔도 어떤 시스템에서든 수치가 거의 움직이지 않는다는 점에 주목."
   zoomable=true %}

GraphRAG-Bench 는 난이도가 올라가는 네 단계로 구성된다 — Fact Retrieval, Complex Reasoning, Contextual Summarize, Creative Generation. 결과를 Answer Correctness 기준으로 보면 깨끗한 교차가 나온다.

| 난이도 | HippoRAG 2 | RAGU | 격차 |
|--------|-----------|------|------|
| Fact Retrieval | 72.4 | 54.2 | −18.2 pp |
| Complex Reasoning | 68.4 | 53.7 | −14.7 pp |
| Contextual Summarize | 65.0 | 64.1 | −0.9 pp |
| Creative Generation | 56.9 | 59.0 | <strong>+2.1 pp</strong> |

(모두 Meno-Lite-0.1 을 인덱싱 LLM 으로 쓴 행)

Coverage — 관련 자료를 <em>빠짐없이</em> 가져왔는지를 직접 보상하는 지표 — 로 넘어가면 격차가 더 크게 벌어진다. Creative Generation 에서 RAGU 57.4 대 HippoRAG 2 34.7, Contextual Summarize 에서 71.1 대 51.7. Faithfulness 도 34.2 대 26.6 으로 RAGU 가 앞선다. LightRAG 는 전 구간에서 최하위인데 (Creative Generation AC 14.4, Coverage 3.9), 저자들은 이를 자유 형식 단일 패스 추출이 만든 구조적으로 빈약한 그래프의 결과로 읽는다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/fig3-crossover.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: 태스크 복잡도에 따른 교차. (a) Answer Correctness 에서 HippoRAG 2 (주황) 와 RAGU (파랑) 의 간격이 왼쪽에서 오른쪽으로 갈수록 좁아지다가 마지막에 뒤집힌다. (b) Evidence Recall 은 factoid 세 구간에서 RAGU 가 가장 높지만, Creative Generation 에서는 LightRAG 가 59.9 로 가장 높다."
   zoomable=true %}

Evidence Recall 이 메커니즘 쪽 증거다. Fact Retrieval 에서 RAGU 82.4, LightRAG 76.1, HippoRAG 2 75.6. 같은 시스템 순서 (RAGU / LightRAG / HippoRAG 2) 로 Complex Reasoning 74.5 / 71.3 / 66.7, Contextual Summarize 74.8 / 70.2 / 71.8. 즉 <strong>RAGU 가 가장 완전한 근거 집합을 가져오고도 단답 정확도에서는 진다</strong>. 저자들은 이를 HippoRAG 2 의 체인 순회가 단일 사실 질의에서 갖는 <em>정밀도</em>로 설명한다. 넓게 긁어오는 전략과 정확히 찍는 전략의 차이이고, 지표에 따라 승자가 갈리는 게 당연한 구도다.

### Multi-hop QA — 포맷 아티팩트의 분리

{% include figure.liquid loading="eager"
   path="assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/tab2-multihop.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: (a) verbose 프롬프트에서는 HippoRAG 2 가 전 열을 지배하지만, (b) terse 프롬프트로 통제하면 BioASQ 는 역전되고 2WikiMultiHopQA 격차는 1/4 이하로 줄어든다. HippoRAG 2 행이 두 패널에서 동일한 것은 기본 프롬프트가 이미 단답을 내기 때문이다."
   zoomable=true %}

이 실험이 논문에서 가장 잘 설계된 부분이다. BioASQ, MuSiQue, 2WikiMultiHopQA 는 정답이 짧은 순수 factoid QA 다. 이런 벤치마크에서는 <strong>답변 형식이 overlap 기반 지표를 강하게 흔든다</strong>. 저자들은 두 프로토콜로 나눠 보고했다.

<strong>(a) verbose — 각 시스템 기본 프롬프트.</strong> HippoRAG 2 가 전 열을 지배한다. BioASQ AC 74.1 대 RAGU 56.0. 그런데 ROUGE-L 을 같이 보면 12.2 대 48.8 이다. RAGU 의 장문 답변이 단답 정답과 표면적으로 겹치지 않으면서 ROUGE-L 과 AC 를 동시에 끌어내린 것이다.

<strong>(b) terse — 단답 강제.</strong> 그림이 크게 바뀐다.

| 벤치마크 | HippoRAG 2 | RAGU (GPT) | verbose 격차 → terse 격차 |
|----------|-----------|------------|--------------------------|
| BioASQ | 72.4 | <strong>72.9</strong> | −18.1 pp → +0.5 pp |
| 2WikiMultiHopQA | 63.5 | 58.0 | −19.3 pp → −5.5 pp |
| MuSiQue | 54.4 | 40.1 | −12.8 pp → −14.3 pp |

BioASQ 는 역전되고 2WikiMultiHopQA 는 격차가 1/4 이하로 줄어든다. 반면 <strong>MuSiQue 에서는 격차가 오히려 조금 커진다</strong>. 저자들은 이를 진짜 능력 차이로 인정한다 — MuSiQue 는 가장 어려운 multi-hop 벤치마크이고, personalized PageRank 의 체인 추적이 통합 기반 검색으로는 표면화되지 않는 경로를 따라간다는 것이다. 자기 시스템이 지는 구간을 포맷 탓으로 돌리지 않고 남겨둔 점은 신뢰를 준다.

또 하나. RAGU 를 gpt-oss-20b (20B) 로 인덱싱한 결과와 Meno-Lite-0.1 (7B) 로 인덱싱한 결과의 차이가 1–2pp 에 불과하다. 20B 를 7B 로 갈아끼워도 downstream 이 거의 안 움직인다는 뜻이고, 이게 가설의 실전 검증이다.

### IE 벤치마크 — 모델 자체의 성능

{% include figure.liquid loading="eager"
   path="assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/tab3-ie-bench.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: IE 벤치마크. Meno-Lite-0.1 의 우위가 거의 전적으로 RE (관계 추출) 열에서 나온다는 점이 중요하다. NER 과 정의 생성에서는 오히려 대형 모델들이 앞선다."
   zoomable=true %}

파이프라인이 아니라 추출 모델 자체를 재는 벤치마크다. Meno-Lite-0.1 (7B) 이 조화평균 0.468 로 1위, Qwen2.5-32B 가 0.416 으로 2위 — 상대 +12.5%.

그런데 열별로 뜯어보면 이야기가 더 구체적이다.

| 모델 | 크기 | NER | Def | RE | RDef | HM |
|------|------|-----|-----|----|----|-----|
| Meno-Lite-0.1 | 7B | 0.504 | 0.527 | <strong>0.347</strong> | 0.558 | <strong>0.468</strong> |
| Qwen2.5-32B | 32B | 0.536 | 0.528 | 0.239 | 0.599 | 0.416 |
| gemma-3-27b | 27B | 0.544 | 0.482 | 0.224 | 0.583 | 0.396 |
| Qwen2.5-14B | 14B | 0.510 | 0.518 | 0.222 | 0.583 | 0.396 |
| Qwen2.5-7B | 7B | 0.477 | 0.479 | 0.192 | 0.541 | 0.356 |
| T-lite-1.0 | 7B | 0.466 | 0.464 | 0.174 | 0.533 | 0.336 |

<strong>Meno-Lite-0.1 의 우위는 사실상 RE 한 열에서 나온다.</strong> NER (0.504) 은 gemma-3-27b (0.544) 와 Qwen2.5-32B (0.536) 보다 낮고, 관계 정의 (RDef) 도 0.558 로 32B 의 0.599 에 못 미친다. 반면 관계 추출 F1 은 0.347 로 2위인 32B 의 0.239 를 45% 상회한다. 저자들은 관계 추출이 언어 이해 의존도가 가장 높은 하위 태스크라고 설명하지만, NEREL 로 SFT 를 한 모델이 NEREL 스키마 관계 추출에서 앞서는 것은 도메인 적응 효과와 구분하기 어렵다. 저자들도 한계 절에서 이 분포 중첩을 인정한다.

MERA 전체 점수는 0.555, LIBRA 128K 지점 passkey retrieval 은 0.98 이다. 긴 컨텍스트 처리는 견고하다는 뜻인데, 뒤의 한계 절에서 "multi-hop 추론은 32K 를 넘으면 떨어진다"고 따로 밝히는 것과 함께 읽어야 한다. passkey 를 찾는 것과 긴 문맥에서 추론하는 것은 다른 능력이다.

### 사례 연구 — 한 문단이 그래프가 되기까지

논문은 저장소에 들어 있는 예제 스크립트로 파이프라인 전체를 한 문단 위에서 시연한다. 입력은 이렇다.

> Dennis Ritchie, the creator of the C programming language, and the co-creator of the Unix operating system, died on October 12, 2011, at the age of 70. His father, Alistair E. Ritchie, worked for many years at Bell Laboratories in Murray Hill, New Jersey.

<strong>Stage 1 (엔티티).</strong> NEREL 스키마 아래에서 타입이 붙은 엔티티 9개가 나온다.

| 엔티티 | NEREL 타입 |
|--------|-----------|
| Dennis Ritchie | `PERSON` |
| Alistair E. Ritchie | `PERSON` |
| C Programming Language | `PRODUCT` |
| Unix Operating System | `PRODUCT` |
| Bell Laboratories | `ORGANIZATION` |
| October 12, 2011 | `DATE` |
| 70 | `AGE` |
| Murray Hill | `DISTRICT` |
| New Jersey | `STATE_OR_PROV` |

<strong>Stage 2 (관계).</strong> 이 검증된 엔티티 집합만을 끝점으로 삼아 관계 8개를 뽑는다. 논문에 표시된 다섯 개는 `Dennis Ritchie —WORKS_AS→ C Programming Language`, `Dennis Ritchie —WORKS_AS→ Unix Operating System`, `Dennis Ritchie —DATE_OF_DEATH→ October 12, 2011`, `Alistair E. Ritchie —PARENT_OF→ Dennis Ritchie`, `Bell Laboratories —LOCATED_IN→ Murray Hill` 이다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/fig4-knowledge-graph.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: 한 문단에서 만들어진 지식 그래프. Leiden 클러스터링이 이 9-엔티티 그래프를 두 커뮤니티로 나눈다 — Dennis Ritchie 와 그의 창작물 (5 엔티티, 4 관계), 그리고 Bell Laboratories · Murray Hill · New Jersey · Alistair Ritchie 를 공간·직업적 연결로 묶은 쪽 (4 엔티티, 3 관계). 두 커뮤니티를 잇는 것은 PARENT_OF 엣지 하나다."
   zoomable=true %}

<strong>커뮤니티와 검색.</strong> Leiden 클러스터링이 그래프를 두 커뮤니티로 분할하고 LLM 이 각각에 구조화된 요약을 붙인다. 그 위에서 `LocalSearchEngine` 은 여러 엣지를 타야 답할 수 있는 질문에 답한다 — "C 언어를 만든 사람의 아버지는 어디서 일했나?" 에 대해 `PARENT_OF` 와 `WORKPLACE` 를 연달아 타고 Bell Laboratories 를 반환하는 식이다.

작은 예제지만 두 가지가 보인다. 하나는 2단계 추출이 실제로 무엇을 막는가 — 관계의 끝점이 전부 Stage 1 에서 확정된 이름이므로 "Ritchie" 같은 부분 표기가 별도 노드로 새어 나가지 않는다. 다른 하나는 타입 스키마의 대가다. <strong>"C 언어를 만들었다"가 `WORKS_AS` 로 잡힌다.</strong> 사람이 읽기에 명백히 부정확하지만, 스키마가 강제하는 49개 관계 타입 안에서는 이게 가장 가까운 선택지였을 것이다. 일관성을 얻는 대신 표현력을 내주는 거래이고, 논문은 이 지점을 정면으로 다루지 않는다.

## 결과 분석 / Ablation

### 파인튜닝의 이득은 어디로 갔나

{% include figure.liquid loading="eager"
   path="assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/tab7-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 7: RAGU 설정별 ablation. ICL 유무, 검증 유무, 인덱싱 모델을 어떻게 조합해도 네 난이도 전부에서 AC 변동이 2pp 를 넘지 않는다. Qwen2.5-3B 로 내려도 마찬가지다."
   zoomable=true %}

Ablation 표를 보면 이 논문에서 가장 흥미로운 긴장이 드러난다.

- 인덱싱 모델을 <strong>3B 에서 14B 까지</strong> 바꿔도 AC 변동은 1.5pp 이하.
- ICL 예시 주입과 엔티티 검증을 켜고 끄는 것도 각각 1pp 미만.
- <strong>Meno-Lite-0.1 과 Qwen2.5-7B 는 모든 설정에서 1pp 이내.</strong>

IE 벤치마크에서 Qwen2.5-32B 를 12.5% 앞섰던 모델이, 엔드투엔드 QA 에서는 스톡 Qwen2.5-7B 와 구분되지 않는다. 그리고 이 현상은 RAGU 뿐 아니라 HippoRAG 2 와 LightRAG 파이프라인에서도 똑같이 나타난다 (Table 1 의 각 시스템 두 행을 비교해 보면 확인된다).

저자들의 해석은 이렇다 — 이건 파인튜닝의 실패가 아니라, <strong>통합 단계가 있으면 GraphRAG QA 품질이 추출기 선택에 대해 상당히 강건해진다</strong>는 증거다. Meno-Lite-0.1 은 7B 비용으로 32B급 추출을 제공하고, 통합 파이프라인은 downstream 강건성을 제공하니 둘은 상보적이라는 것.

프레이밍으로는 매끄럽지만, 뒤집어 읽으면 이 논문의 두 기여물이 서로를 약화시킨다. 파이프라인이 추출기 품질에 강건하다면 굳이 전용 추출기를 학습시킬 이유가 약해지고, 반대로 추출기가 그렇게 좋다면 파이프라인이 그 이득을 downstream 으로 전달하지 못하고 있는 것이다. 논문은 전자를 택했지만, 실무자 입장에서는 <strong>"통합 파이프라인만 제대로 있으면 인덱싱 모델은 3B 짜리로 충분하다"</strong>가 더 실용적인 결론일 수 있다. 그리고 그건 저자들의 가설을 오히려 더 강하게 지지한다.

### 넓게 긁기 vs 정확히 찍기

Evidence Recall 과 Answer Correctness 가 갈라지는 현상도 짚을 만하다. Fact Retrieval 에서 RAGU 는 근거를 82.4% 회수하고도 AC 54.2 에 그치는 반면, HippoRAG 2 는 75.6% 만 회수하고 AC 72.4 를 낸다. 근거를 더 많이 가져오는 것이 단답 정확도로 이어지지 않는다는 뜻이다.

이건 검색 자체보다 <strong>생성 단계의 문제</strong>일 가능성이 높다. 넓은 컨텍스트가 gpt-4o-mini 에게 주어졌을 때 단답을 뽑아내는 대신 관련은 있지만 초점이 어긋난 정보를 섞을 여지가 커진다. terse 프롬프트 실험이 정확히 이 지점을 건드린다 — 검색 결과는 그대로 두고 생성 지시만 조였을 뿐인데 RAGU 의 BioASQ AC 가 56.0 에서 72.9 로 17pp 가까이 뛴다. 같은 컨텍스트에서 답을 뽑아내는 방식만 바꿔도 이 정도가 움직인다면, GraphRAG-Bench 의 factoid 구간 격차 역시 순수한 검색 능력 차이로만 읽어서는 안 된다. 논문이 이 두 실험을 연결해 해석하지 않은 것은 아쉽다.

### 엔지니어링 비교

{% include figure.liquid loading="eager"
   path="assets/img/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/tab6-engineering.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 6: 프로덕션 리스크별로 정리한 엔지니어링 비교. 각 행이 '이 속성이 없으면 무엇이 터지는가'로 이름 붙어 있다는 점이 이 표를 단순 기능 체크리스트와 구분한다."
   zoomable=true %}

부록 A 의 비교표는 기능 나열이 아니라 <strong>프로덕션 리스크</strong>별로 조직돼 있다. 크래시 시 데이터 유실, 백엔드 마이그레이션 비용, API 처리량, LLM 출력에서의 코드 실행, 일시적 장애 복구, 회귀 탐지, 증분 유지보수, 재현 가능한 배포, 모듈성.

저자들이 특히 강조하는 두 가지는 실제로 심각하다.

1. <strong>`eval()` 호출.</strong> HippoRAG 2 는 LLM 원본 응답을 정규식으로 필터링한 부분 문자열에 파이썬 `eval()` 을 건다 (`openie_openai.py:36,88`). 모델이 적대적 내용을 뱉으면 임의 코드 실행 표면이 되고, 구문이 조금만 어긋나도 호출 지점에서 멀리 떨어진 곳에서 불투명한 예외가 난다.
2. <strong>`assert False` 를 제어 흐름으로 사용.</strong> 오프라인 인덱싱 경로가 `assert False` 로 종료되는데 (`HippoRAG.py:216`), `python -O` 로 실행하면 assertion 이 제거되어 파이프라인 나머지가 기대하는 온라인 vLLM 서버 없이 <strong>조용히 인덱싱으로 진행된다</strong>. 프로덕션에서 가장 나쁜 종류의 버그다.

모든 주장이 커밋 `d437bfb1` (2025-09-04) 기준 파일·라인으로 고정돼 있어 재현 검증이 가능하다. 다만 이건 경쟁 시스템 저자가 쓴 비교표라는 점은 감안해야 한다.

### 비용

인덱싱 비용은 문서당 일회성이고 질의 시점 답변 생성 비용과 분리해서 봐야 한다 (답변 생성은 전 시스템이 gpt-4o-mini 로 동일).

| 시스템 | 인덱싱 모델 | 토큰/문서 | 문서당 비용 |
|--------|------------|----------|------------|
| MS-GraphRAG (global) | gpt-4o (API) | ~40k | ~USD 0.10 |
| HippoRAG 2 | gpt-oss-20b (local) | ~6k | 고정 GPU 비용 |
| LightRAG | gpt-oss-20b (local) | ~8k | 고정 GPU 비용 |
| RAGU + Meno-Lite-0.1 | Meno-Lite-0.1 (local) | ~8k | 고정 GPU 비용 |

10만 문서 규모에서 MS-GraphRAG 약 USD 10,000 대 RAGU 약 USD 100. 다만 표를 정확히 읽으면 이 비교는 <strong>로컬 서빙 대 API 서빙</strong>의 차이지 RAGU 고유의 이득이 아니다. HippoRAG 2 와 LightRAG 도 같은 GPU 비용 계급에 있고, 오히려 HippoRAG 2 가 문서당 토큰은 더 적다 (6k 대 8k).

## 한계와 비판적 평가

<strong>저자가 인정한 한계</strong>

- 스케일링 근거가 단일 모델 계열 (Qwen2.5) 과 선택된 태스크에 기반한다. 여섯 크기에 걸쳐 견고하긴 하지만 보편 정리가 아니라 잘 뒷받침된 가설이다.
- Meno-Lite-0.1 은 파라메트릭 사실 회상을 문맥 접지와 맞바꾼 모델이라 단독 지식 베이스로 쓰면 안 된다. multi-hop 추론은 32K 토큰을 넘으면 저하되는데, 7B 급에서는 전형적인 현상이다.
- IE 벤치마크에 분포 중첩 우려가 있다. Meno-Lite-0.1 의 SFT 는 NEREL 의 train/validation split 을 쓰고 벤치마크는 held-out test split 을 다른 instruction 표현으로 쓰지만, 주석 스키마와 텍스트 도메인이 겹치므로 잔여 이점을 완전히 배제할 수 없다.
- 기본 NetworkX 그래프 백엔드는 수백만 노드 규모로 확장되지 않는다. 그리고 최종 그래프 품질은 여전히 추출 LLM 에 민감하다 — 약한 베이스 모델이 넣은 구조적 노이즈는 통합으로도 완전히 교정되지 않는다.

<strong>리뷰어로서 추가로 보이는 한계</strong>

- <strong>가설의 검증 도메인과 적용 도메인이 어긋난다.</strong> 언어 능력 vs 세계 지식 가설은 러시아어 벤치마크 (CheGeKa, MultiQ) 로 검증됐는데, GraphRAG 평가는 전부 영어다. 가설 자체는 언어 독립적으로 보이지만, 영어에서 같은 기울기 분리가 나타나는지는 논문이 보여주지 않는다.
- <strong>Evidence Recall 수치가 본문과 그림에서 어긋난다.</strong> 초록과 본문은 "evidence recall up to 0.84 vs ≤0.76", "84 vs ≤76%" 라고 적는데 Figure 3(b) 의 최고값은 82.4 다. 비교 대상 76.1 은 그림과 일치하므로 0.84 쪽이 반올림/전사 오류로 보인다. 초록에 들어간 숫자라 더 눈에 띈다.
- <strong>단일 도메인 · 단일 시드.</strong> GraphRAG-Bench 는 Medical 도메인만 돌렸고, 표 어디에도 신뢰구간·표준편차·시드 수가 없다. Contextual Summarize 의 −0.9pp 를 "parity" 라고 부르려면 변동성 추정이 필요하다.
- <strong>비용 우위의 비교 대상이 품질 평가에 없다.</strong> USD 100 대 USD 10,000 의 상대는 MS-GraphRAG 인데, MS-GraphRAG 는 Table 1·2 어디에도 등장하지 않는다. 즉 "가장 비싼 시스템보다 100배 싸다"와 "품질이 비슷하다"가 서로 다른 비교군에서 나온 주장이다.
- <strong>질의 시점 비용·지연 보고 없음.</strong> 인덱싱 비용만 다룬다. 그런데 RAGU 의 `MixSearch` 와 `QueryPlanEngine` 은 구조상 질의당 LLM 호출이 여러 번 나가는 설계다. 넓은 컨텍스트를 gpt-4o-mini 에 밀어넣는 것도 질의 비용에 잡힌다. 운영 관점에서 빠져 있는 절반이다.
- <strong>MuSiQue 격차에 대한 처방이 없다.</strong> HippoRAG 2 의 personalized PageRank 가 통합 기반 검색이 놓치는 경로를 잡는다고 진단해 놓고, PPR 류 순회를 RAGU 에 붙여보는 ablation 은 없다. 두 접근이 상보적이라면 결합 실험이 가장 자연스러운 다음 수인데 비어 있다.
- <strong>임베딩 모델이 벤치마크군마다 다르다.</strong> GraphRAG-Bench 는 bge-large-en-v1.5, multi-hop QA 는 gte-multilingual-base 를 쓰는데 이유가 설명되지 않는다. 각 표 안에서는 통제되지만 표 사이 비교는 어려워진다.
- <strong>타입 스키마의 의미적 부정확성이 사례에서 그대로 노출된다.</strong> Dennis Ritchie 가 C 언어를 "만들었다"가 `WORKS_AS` 로 잡힌다. 49개 관계 타입 안에 저작·창작 관계가 없어 생긴 결과로 보이는데, 스키마 제약이 일관성을 주는 대신 표현력을 깎는 트레이드오프를 논문이 정면으로 다루지 않는다.

## 시사점 / Takeaways

- <strong>파이프라인 단계마다 필요한 능력의 종류가 다르다.</strong> "인덱싱에는 언어 능력, 답변에는 세계 지식"이라는 분해는 RAG 를 넘어 에이전트 파이프라인 전반에 적용할 수 있는 사고 도구다. 어떤 단계에 어떤 크기의 모델을 붙일지 결정할 때, 그 단계가 요구하는 능력의 스케일링 지수를 먼저 묻는 습관이 유용하다.
- <strong>추출과 통합을 분리하는 것만으로 얻는 게 크다.</strong> 엔티티를 먼저 확정하고 그것을 관계 추출의 제약으로 되먹이는 설계는 dangling edge 라는 오류 클래스를 통째로 제거한다. 모델을 키우는 것보다 파이프라인을 나누는 게 싸고 확실한 개선인 전형적 사례다.
- <strong>벤치마크 격차의 상당 부분이 답변 포맷일 수 있다.</strong> verbose/terse 두 프로토콜로 나눠 보고한 것만으로 −19.3pp 가 −5.5pp 로 줄었다. 자기 시스템이 지는 벤치마크를 만났을 때 가장 먼저 확인할 것은 프롬프트가 정답 형식과 맞는지다. 반대로 리뷰어라면 overlap 기반 지표를 쓰는 논문의 격차 주장은 포맷 통제 여부를 먼저 봐야 한다.
- <strong>넓은 회수와 정확한 회수는 다른 목표다.</strong> Fact Retrieval 에서 Evidence Recall 1위 (82.4) 를 하고도 Answer Correctness 는 18pp 뒤지는 상황은, 지표 선택이 시스템 평가를 얼마나 좌우하는지 보여준다. 요약·장문 생성이 목적이면 Coverage 계열을, 단답 조회가 목적이면 정밀도 계열을 봐야 한다.
- <strong>재현 가능한 형태로 쓴 엔지니어링 비판은 논문이 될 수 있다.</strong> 커밋 해시를 고정하고 파일·라인으로 주장을 앵커한 부록 A 는, 흔히 블로그 글로 흘러가는 종류의 관찰을 검증 가능한 학술 기여로 바꿔놓았다. 다만 경쟁 시스템 저자의 감사라는 점은 독자가 감안해야 한다.

## 설치 및 사용법

```bash
pip install graph_ragu
```

Meno-Lite-0.1 은 vLLM 으로 단일 컨슈머 GPU 에서 서빙한다.

```bash
vllm serve bond005/meno-lite-0.1 --max-model-len 131072
```

파이프라인 구성은 스토리지 3계층을 생성자 인자로 주입하는 형태다. 프로토타입 (NetworkX + NanoVDB) 에서 프로덕션 (Neo4j + Qdrant) 으로 옮기는 것이 인자 교체로 끝나는 것이 이 설계의 핵심 주장이다.

```python
# 개념 예시 — 정확한 API 시그니처는 저장소 문서를 참조
from graph_ragu import RAGU, Settings

ragu = RAGU(settings=Settings(language="en"))
await ragu.index(documents)                  # 6단계 인덱싱 파이프라인
answer = await ragu.search("...", engine="local")
```

전체 API 문서와 실행 가능한 예제는 저장소에 있고, 별도의 데모 웹 프론트엔드와 시연 영상도 공개돼 있다.

## 참고 자료

- 논문: [arXiv:2607.11683](https://arxiv.org/abs/2607.11683)
- Code: [github.com/RaguTeam/RAGU](https://github.com/RaguTeam/RAGU) (MIT)
- 모델: [bond005/meno-lite-0.1](https://huggingface.co/bond005/meno-lite-0.1) (Apache 2.0)
- 데모 영상: [youtu.be/bicJDMJuQfg](https://youtu.be/bicJDMJuQfg)

## 더 읽어보기

- **[From Local to Global: A Graph RAG Approach to Query-Focused Summarization](https://arxiv.org/abs/2404.16130)** (Edge et al., 2024) — Microsoft GraphRAG 원논문. 커뮤니티 탐지 + 커뮤니티 요약 map-reduce 로 전역 질문에 답하는 구조를 처음 제시했고, RAGU 의 Steps 4–6 이 이 계보 위에 있다.
- **[LightRAG: Simple and Fast Retrieval-Augmented Generation](https://arxiv.org/abs/2410.05779)** (Guo et al., 2025) — 단일 패스 자유 형식 추출 + dual-level 검색으로 GraphRAG 비용을 줄인 시스템. 이 논문에서 "통합 단계가 없으면 어떻게 되는가"의 대조군 역할을 한다.
- **[From RAG to Memory: Non-Parametric Continual Learning for Large Language Models](https://arxiv.org/abs/2502.14802)** (Gutiérrez et al., ICML 2025) — HippoRAG 2. personalized PageRank 기반 그래프 순회로 단답 정밀도와 체인 추적에 강하다. RAGU 의 주 비교 대상이자, 이 논문이 끝내 넘지 못한 MuSiQue 를 가져간 시스템.
- **[When to Use Graphs in RAG: A Comprehensive Analysis for Graph Retrieval-Augmented Generation](https://arxiv.org/abs/2506.05690)** (Xiang et al., ICLR 2026) — GraphRAG-Bench 원논문. 난이도 4단계 (fact retrieval → creative generation) 설계가 이 리뷰의 교차 그래프를 가능하게 만든 틀이다.
- **[NEREL: A Russian Dataset with Nested Named Entities, Relations and Events](https://arxiv.org/abs/2108.13112)** (Loukachevitch et al., 2021) — RAGU 추출기가 출력 공간으로 쓰는 29 엔티티 · 49 관계 타입 스키마의 원본. 러시아어 뉴스 도메인용으로 설계됐다는 사실이 이 논문의 스키마 관련 한계를 이해하는 열쇠다.

---
layout: post
title: "[논문 리뷰] Learning from Research: Toward Lifelong Agent Harness Evolution"
date: 2026-10-02 12:09:29 +0900
description: "문헌 기반 topic 탐색과 모듈 재조합으로 모델 가중치 없이 하네스를 개선하는 ScholarEvolve의 방법, 실험, 한계."
tags: ["llm-agents", "agent-harness", "self-improvement", "evolutionary-search", "tool-use"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig1-overview.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/
en_url: /en/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Jingbo Yang et al. (저자 6명, UC Santa Barbara · Microsoft) |
| 학회 | arXiv · 2026 · CC BY 4.0 |
| arXiv | [2609.40169](https://arxiv.org/abs/2609.40169) |
| 데이터 | AppWorld Normal·Challenge, τ²-Bench Telecom |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-10-02 |

## TL;DR

- ScholarEvolve는 모델 가중치를 고정한 채 연구 문헌에서 실행 메커니즘을 찾아 tool·context·skills·memory·workflow 모듈을 바꾸는 하네스 진화 프레임워크다.
- 논문을 관련도 순으로만 고르지 않고 구현 방식별 topic으로 나누어 탐색 예산을 배분한다. 개별 모듈의 성능을 측정한 뒤 조합 전체를 다시 실행해 채택 여부를 결정한다.
- Qwen3.5-27B의 AppWorld Challenge TGC는 49.6%→63.6%, GPT-5.4-mini의 Telecom pass^1은 72.7%→81.9%로 개선된다. 각각 +14.0%p, +9.2%p다.
- 세 출판 시기 구간을 이용한 반복 개선도 평가하지만, 실제 장기 배포에서의 무제한 자기 개선을 입증한 것은 아니다. 고정된 경험·평가 집합과 세 차례 업데이트라는 조건이 있다.
- 문헌에서 가져온 구현도 크게 실패할 수 있다. 개선의 핵심은 연구 아이디어의 유입과 함께 데이터 분리, 실행 검사, 조합 평가를 유지하는 데 있다.

## 소개 (Introduction)

에이전트가 같은 종류의 실수를 반복하면 프롬프트에 주의사항을 추가하거나 검증 단계를 하나 더 붙이기 쉽다. 검색 결과를 놓치면 다시 검색하게 하고, 잘못된 tool call을 만들면 critic에게 검토를 맡기는 식이다. 이런 수정은 당장의 실패와 직접 연결되지만, 가능한 해결책의 범위를 넓혀 주지는 않는다. 필요한 정보가 context 압축 중 사라지는 문제에 검증 호출만 추가하면, 여러 모델이 같은 불완전한 근거를 반복해서 읽을 수도 있다. 실패 기록은 어디가 아픈지 보여 주지만 어떤 설계를 도입해야 하는지까지 항상 알려 주지는 않는다.

사람인 연구자나 엔지니어는 이 지점에서 다른 연구를 찾아본다. 긴 문맥에서 정보를 고르는 방법, 성공한 행동 순서를 재사용하는 방법, 과거 경험을 검색하는 방법은 이미 서로 다른 연구 분야에서 다루고 있다. 문제는 논문의 아이디어를 읽는 것과 현재 에이전트에 잘 맞는 실행 코드로 바꾸는 것 사이에 큰 간격이 있다는 데 있다. 원래 방법의 가정, 사용할 수 있는 데이터, 현재 도구의 입출력 형식이 다르면 같은 이름의 기법도 전혀 다르게 작동한다. 여러 개선안을 한꺼번에 넣었을 때 서로 충돌할 가능성도 있다.

Yang et al.의 [ScholarEvolve](https://arxiv.org/abs/2609.40169)는 이 문헌 조사와 구현·검증 과정을 탐색 알고리즘으로 묶는다. 무엇을 바꿀지는 하네스의 기능별 모듈로, 어떻게 바꿀지는 논문에서 추출한 메커니즘 topic으로 정리한다. 그리고 논문의 권위나 coding agent의 설명을 최종 판단 기준으로 삼지 않고 실제 과제 성능으로 후보를 선택한다. 이 리뷰는 arXiv v1의 본문과 부록을 기준으로 방법의 구조, 개선의 원인, 지속적 진화라는 주장에 필요한 조건을 연결해 살펴본다.

## 핵심 기여 (Key Contributions)

- <strong>실패 경험을 넘어서는 연구 기반 제안.</strong> 실행 기록에서 능력의 빈틈을 추출하고, 이를 일반적인 연구 질문으로 바꾸어 새로운 구현 메커니즘을 찾는다.
- <strong>모듈과 topic의 이중 탐색 구조.</strong> 수정 위치와 해결 원리를 분리해 비슷한 workflow 변형에 후보 예산이 집중되는 문제를 줄인다.
- <strong>실행 가능한 모듈 변이와 검증된 재조합.</strong> 인터페이스를 유지한 단일 모듈 수정, 사전 실행 검사, 완성된 조합의 validation 평가를 연결한다.
- <strong>고정 backbone의 성능·신뢰도 분석.</strong> 두 모델과 두 환경에서의 결과뿐 아니라 미경험 앱 전이, 반복 실행의 성공 패턴, 잔여 실패 유형을 분석한다.
- <strong>출판 시기별 추가 개선 실험.</strong> 새 문헌이 들어올 때 기존 champion에서 다시 탐색하는 과정을 세 업데이트로 평가한다.

## 관련 연구 / 배경 지식

### 하네스 최적화와 모델 학습의 구분

하네스(harness)는 모델의 출력이 실제 작업으로 이어지도록 만드는 실행 프로그램이다. 어떤 도구를 보여 줄지, 과거 대화 중 무엇을 입력에 남길지, 실패한 호출을 어떻게 복구할지, 언제 작업을 끝낼지를 결정한다. 같은 모델도 하네스가 제공하는 관찰과 행동 공간에 따라 결과가 달라진다. 따라서 가중치가 고정되어 있다는 말은 시스템의 행동이 고정되어 있다는 뜻이 아니다. 검색 가능한 기억과 재사용 절차, 코드상의 제어 흐름을 바꾸어도 작업 능력은 달라질 수 있다.

[Meta-Harness](https://arxiv.org/abs/2603.28052)는 코드와 실행 피드백에 접근하는 proposer가 하네스 프로그램을 탐색하는 선행 연구다. ScholarEvolve도 이 큰 방향을 공유하지만, 후보를 제안하는 정보원을 외부 연구 문헌으로 확장하고 탐색을 모듈별로 조직한다. 이 차이를 “기존 방법에는 기억이나 도구 수정이 없었다”로 단순화하면 부정확하다. 논문의 핵심은 수정 가능한 구성요소의 발명보다, 제한된 탐색 예산을 서로 다른 연구 메커니즘에 어떻게 배분하는지에 있다.

### 메커니즘 topic과 의미적 중복

문헌 검색에서 관련 논문을 많이 모았다고 다양한 개선안을 확보한 것은 아니다. 서로 다른 제목의 논문들이 모두 같은 정보를 검색하는 방법을 조금씩 변형할 수 있다. 후보 예산이 네 개라면 이런 논문 네 편을 구현하는 것보다 검색, 압축, 점수화, 예산 배분처럼 다른 원리를 탐색하는 편이 유리할 가능성이 있다. ScholarEvolve의 topic은 연구 분야 이름보다는 구현 가능한 개입 방식에 가깝다.

분류 과정은 [TopicGPT](https://arxiv.org/abs/2311.01449)의 주제 생성·정제·할당 방식을 따른다. 다만 여기서 orthogonal이라는 말은 벡터 내적이 0이라는 수학적 보장이 아니다. 같은 작동 원리를 다른 말로 표현한 category를 합치고, 지나치게 세분된 변형을 정리해 의미적 중복을 줄인다는 뜻이다. 서로 다른 topic의 구현도 실제 실행에서는 상호작용할 수 있으므로, 분류 결과만으로 조합의 독립성을 가정할 수 없다.

## 방법 / 아키텍처 상세

### 1. 다섯 모듈의 역할과 실행 경계

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig1-overview.png" class="img-fluid rounded z-depth-1" caption="Figure 1: 문헌 기반 모듈 탐색과 재조합의 개요. 오른쪽은 AppWorld Challenge의 Qwen3.5-27B TGC·SGC(%)." zoomable=true %}

하네스는 tool interface, context management, skills, memories, agentic workflows의 다섯 모듈로 표현된다. 각 모듈은 자유롭게 모든 상태를 바꾸는 코드 조각이 아니라 정의된 입출력 경계를 가진다. Memory는 관련 경험을 evidence로 반환하고, skills는 재사용 절차를 제공한다. Context 모듈은 이 결과와 정책·history를 모델 입력으로 조립한다. Workflow는 그 입력을 바탕으로 다음 행동 proposal을 만들고, tool interface가 이를 환경에서 실행 가능한 action으로 바꾼다.

| 모듈 | 변경 대상 | 논문의 대표 구현 |
|------|-----------|------------------|
| Tool interface | 노출 도구와 행동 표현·검사 | API 문서 조회 macro, Python 문법 검사와 제한적 정규화 |
| Context management | 입력 정보의 선택·압축·배치 | Query 관련도·최근성 점수와 문자 예산 배분 |
| Skills | 반복 가능한 작업 절차 | 성공 trajectory의 API subsequence를 pseudocode로 구성 |
| Memories | 과거 상황·행동·결과의 저장과 검색 | 구조화된 episode 요약과 관련 경험 검색 |
| Agentic workflows | 모델 호출과 역할 간 조정 | Planner·solver·critic의 제안과 verifier의 행동 선택 |

이 구분은 단일 모듈의 효과를 관찰하고 다른 후보와 교체할 수 있게 한다. 그렇다고 모듈들이 행동적으로 독립적인 것은 아니다. 긴 skill을 검색하면 context 모듈이 남길 수 있는 history가 줄어들고, workflow가 여러 제안을 만들면 tool interface가 받아야 하는 출력 형식이 달라질 수 있다. 공통 인터페이스는 조합을 가능하게 하는 조건이며, 그 조합이 유용하다는 증명은 아니다. 이 때문에 ScholarEvolve는 단일 모듈 검사와 전체 조합 평가를 별도 단계로 둔다.

### 2. 실패 기록에서 능력 중심 연구 질문으로의 변환

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig2-framework.png" class="img-fluid rounded z-depth-1" caption="Figure 2: 실패 분석·문헌 검색·topic 분류(a), 세대별 변이·선택·교차(b), 고정 backbone 주위의 다섯 실행 모듈(c)." zoomable=true %}

문헌 pool을 만드는 출발점은 evolution set의 실행 trajectory다. Auditor는 실패를 에이전트 원인과 환경 원인으로 나누고, 반복되며 추론 시점의 설계 변경으로 개선할 수 있는 문제를 우선한다. Research model은 구체적인 benchmark 이름, 도메인 entity, tool·field 이름을 제거해 일반적인 capability gap으로 바꾼다. 예를 들어 특정 앱의 필드를 잘못 읽었다는 사례를 그대로 검색하는 대신, 이전 관찰의 보존이나 상태 추적이라는 문제로 표현한다.

그다음 각 모듈의 책임과 현재 동작을 함께 보고 두 종류의 검색어를 만든다. 하나는 context compression처럼 능력 영역을 넓게 가리키는 query이고, 다른 하나는 특정 해결 메커니즘을 겨냥하는 query다. 두 집합을 섞어 arXiv에서 제목·초록·링크를 수집한다. 모듈 안에서는 정규화된 제목으로 중복을 제거하고 초록 없는 항목을 제외하지만, 한 논문이 여러 모듈에 관련되면 각 pool에 남을 수 있다. 따라서 나중에 등장하는 module–paper record 수는 고유 논문 수와 다르다.

이 추상화는 현재 실패에 과도하게 특화된 patch를 줄이려는 장치다. 다만 benchmark 이름을 검색어에서 지운다고 일반화가 자동으로 보장되지는 않는다. Research model이 어떤 실패를 중요하다고 보았는지, 어떤 검색어를 만들었는지에 따라 후보 pool은 여전히 달라진다. 논문은 분류 근거와 출처를 남겨 이 선택 과정을 추적 가능하게 만든다. 평가에서 유용했던 변경을 확인하는 일과 문헌 조사 자체의 완전성을 보장하는 일은 구분해야 한다.

### 3. Topic 분류와 round-robin 후보 배분

Research model은 제목과 초록을 batch로 읽으면서 기존 taxonomy에 맞는 topic을 재사용하거나 새로운 메커니즘 category를 추가한다. 정제 단계에서는 동의어·중복 category를 합치고, 너무 좁거나 모호한 항목을 정리한다. 각 논문에는 초록의 근거 구절과 함께 순서가 있는 topic 목록을 부여한다. 여러 메커니즘을 설명하는 논문도 주된 기여에 해당하는 첫 topic 하나가 후보 선택용 cluster를 결정한다.

현재 하네스나 backbone이 이미 제공하는 메커니즘은 screening으로 제외한다. 남은 비어 있지 않은 cluster를 크기순으로 정렬한 뒤, 각 cluster를 한 번씩 방문하는 round-robin 방식으로 논문을 고른다. Cluster 안에서는 검색 순서를 유지한다. 예산이 K편이면 가능한 범위에서 먼저 K개의 서로 다른 topic을 덮고, 모든 cluster를 방문한 뒤에야 같은 topic에서 추가 논문을 고른다. 가장 큰 cluster에 예산을 비례 배분하는 방식과는 다르다.

이 방법은 관련도를 무시하자는 주장이 아니다. 관련 없는 논문을 먼저 걸러 놓고, 그 안에서 구현 기회를 다양한 메커니즘에 분산한다. 따라서 ablation도 검색 자체를 제거하는 비교가 아니라, 같은 screening pool과 예산에서 topic별 선택을 관련도 순 선택으로 바꾸는 비교다. Qwen의 해당 pool에는 1,956개의 module–paper record가 있다. 이 수치를 모두 읽고 구현한 논문 1,956편이라고 해석해서는 안 된다.

### 4. Mutation blueprint와 실행 가능성 검사

선택한 논문은 초록만 보고 구현하지 않는다. Research agent가 본문과 부록, 이용 가능한 공식 코드를 읽고 mutation blueprint를 만든다. 여기에 원래 메커니즘과 가정, 대상 인터페이스, 필요한 상태·artifact, runtime 연산, 추가 모델 호출, 종료 조건을 적는다. 원 논문에서 가져온 부분과 현재 하네스에 맞추어 바꾼 부분을 구분하고 paper·topic 출처도 유지한다. 이 단계가 문헌 요약을 실행 가능한 변경 명세로 바꾸는 연결 고리다.

Coding agent는 그 명세와 현재 구현, 인터페이스, 환경 action 형식을 받아 한 모듈만 바꾼다. 이후 import, 인터페이스 호환성, artifact 생성·재로딩, 통제된 모델 응답에 대한 유효 action 생성 등을 검사한다. 오류가 있으면 repair budget 안에서 수정한다. 이 검사는 아예 실행할 수 없는 후보에 평가 rollout을 낭비하지 않기 위한 것이며, 실행 검사 통과가 과제 해결 능력의 개선을 뜻하지는 않는다.

지속적으로 보관할 skill library와 memory는 evolution set의 trajectory에서만 구성한다. Validation과 test에서는 이 저장물을 고정하되 한 episode 안의 관찰과 상태는 갱신할 수 있다. 즉 현재 작업에서 방금 본 오류를 기억하는 것은 허용하지만, validation 문제를 풀면서 만든 경험을 다음 평가 문제의 영구 지식으로 누적하는 것은 허용하지 않는다. 코드뿐 아니라 artifact의 출처를 관리하는 이유가 여기에 있다.

### 5. 단일 모듈 평가와 조합의 재검증

각 세대는 현재 champion을 기준 하네스로 삼는다. 먼저 같은 validation task와 trial에서 모듈별 후보를 평가하고 기준 대비 task별 reward 차이를 계산한다. 이후 각 모듈 자리에서 어떤 구현을 쓸지 선택하는 configuration을 만든다. 새 후보만 넣어야 하는 것은 아니며, 일부 자리에 기준 구현을 그대로 둘 수도 있다. 이 선택지가 있어야 다른 모듈과 충돌하는 변경을 조합에서 뺄 수 있다.

가능한 조합은 개별 모듈에서 측정한 gain의 합으로 먼저 순위를 매긴다. 이 계산은 기존 측정값을 재사용하므로 추가 rollout이 필요 없다. 그러나 합산 점수는 shortlist를 만드는 근사치다. 최종 후보 조합은 실제 완성된 하네스로 다시 실행하고 그 관측 성능으로 선택한다. 두 모듈이 같은 실패를 고치면 이득을 두 번 셀 수 있고, 성공률 상한 때문에 개별 gain의 합을 실현할 수 없을 수도 있기 때문이다.

후보군에는 교차 조합뿐 아니라 단일 모듈 변이도 포함된다. 가장 좋은 후보와 기존 champion의 paired task gain을 비교해 bootstrap 구간의 하한이 0보다 클 때만 새 champion을 유지한다. 실행 가능한 후보가 없거나 확인된 개선이 없으면 기존 하네스를 남긴다. 논문의 수렴 설정은 확인된 개선이 없는 한 세대에서 현재 cycle을 멈추는 것이다. 이후 새 문헌이 들어오면 이 champion을 출발점으로 새로운 탐색 cycle을 시작할 수 있다.

### 6. 최종 Qwen 하네스의 구체적 동작

부록의 구현 예시는 연구 이름과 실제 코드 사이의 간격을 잘 보여 준다. ToolACE-R에서 영감을 받은 tool 모듈은 `DOC_ACTION`을 API 문서 조회 코드로 확장하고, Python AST와 statement 구조를 확인하며 제한된 수정과 fallback을 수행한다. 원 방법의 전체 학습 pipeline을 그대로 옮겼다는 의미는 아니다. Context 모듈도 query 의존적 압축의 아이디어를 가져와 관련도·최근성에 따라 문자 예산을 배분하고, 선택된 내용을 시간 순서로 배치한다.

Skill-as-Pseudocode 기반 모듈은 성공 trajectory에서 반복되는 API 호출 subsequence를 모아 입력·출력, 적용 조건, 순서, 관측된 support count를 가진 절차로 만든다. Runtime에서는 task 문구와 trigger의 겹침, support를 이용해 절차를 선택한다. Oracle Agent Memory 기반 모듈은 task·action·output·outcome을 요약한 저장소를 만들고 lexical similarity에 outcome 관련 점수를 더해 검색한다. 복잡한 원 연구를 현재 인터페이스에서 동작하는 작은 메커니즘으로 바꾸는 사례다.

TMAS 기반 workflow는 planner·solver·critic의 서로 다른 다음 행동 제안을 받은 뒤 verifier가 하나를 고른다. 이전 관찰과 오류에 따른 재시도 지침은 episode 안에서 유지한다. 따라서 이 구현은 하나의 환경 action을 만들기 위해 여러 모델 호출을 할 수 있다. 가중치를 학습하지 않았다는 사실과 추론 계산량이 늘지 않았다는 주장은 전혀 다르다. 리뷰에서 하네스 개선을 읽을 때도 성능과 runtime 비용을 별도로 평가해야 하는 이유다.

## 학습 목표 / 손실 함수

### 고정 backbone의 기대 reward와 조합 점수

이 논문은 모델 파라미터를 gradient로 업데이트하는 손실함수를 제안하지 않는다. 최적화 대상은 실행 프로그램 H다. 고정된 모델 파라미터를 θ, 목표 task 분포를 P, 하네스 아래 생성되는 trajectory를 τ라고 쓰면 논문 식 (1)의 목적은 다음과 같다.

$$
\begin{aligned}
H^\star &\in \arg\max_{H\in\mathcal H} J(H),\\
J(H) &= \mathbb E_{x\sim P_{\mathrm{tar}}}
\mathbb E_{\tau\sim p_\theta(\cdot\mid H,x)}[R(x,\tau)].
\end{aligned}
$$

목표 분포는 우리가 실제로 잘 풀기를 원하는 과제들의 분포다. 손에 있는 test set은 그 분포의 유한한 표본이며, 최적화에 직접 사용하는 데이터가 아니다. Evolution set은 조사와 artifact 구축에, validation set은 후보 선택에, test set은 선택이 끝난 뒤 결과 보고에 사용한다. 이 세 역할을 나누어야 하네스가 평가 문제를 외워 점수를 올리는 경로를 줄일 수 있다.

후보 c의 모듈 j가 task i에서 얻은 단독 gain을 g로 쓰면 식 (3)의 조합 screening 점수는 다음과 같다. 기준 모듈을 유지할 때의 gain은 0으로 둔다.

$$
\widehat\Delta(c)=\frac{1}{|D_{\mathrm{val}}|}
\sum_{i\in D_{\mathrm{val}}}\sum_{j=1}^{5}g_{j,c_j}(i).
$$

실제 조합의 gain은 완성된 하네스의 reward에서 기준 reward를 뺀 값으로 별도 측정한다. 이 관측값과 예측값의 차이에는 모듈 간 상호작용뿐 아니라 reward 상한과 평가 변동도 섞인다. 따라서 예측보다 덜 좋아졌다는 이유만으로 두 모듈의 의미적 충돌을 확정할 수는 없다. 이 식의 역할은 평가할 조합의 우선순위를 정하는 것이고, 최종 채택은 관측 결과와 불확실성에 따른다.

### Telecom pass^k의 반복 성공 조건

Telecom에서는 한 run마다 task당 네 번의 내부 trial을 수행한다. Task i가 그중 s번 성공했다면 pass^k에 기여하는 값은 다음과 같다.

$$
\operatorname{pass}^{k}_{i}=\frac{\binom{s_i}{k}}{\binom{4}{k}}.
$$

성공 횟수가 k보다 작으면 0이다. 40개 test task에 대해 평균을 낸 뒤 세 run의 평균과 표준편차를 보고한다. 이는 k번의 시도 중 모두 성공할 가능성을 추정하므로, k가 커질수록 더 엄격한 지표가 된다. 예를 들어 네 번 중 세 번 성공한 task는 pass^1에 3/4를 기여하지만 pass^4에는 0을 기여한다. 코딩 문제에서 흔히 보는 “k번 중 한 번이라도 성공”하는 pass@k와 혼동하면 신뢰도 개선의 의미가 뒤집힌다.

## 학습 데이터와 파이프라인

### Evolution·validation·test의 분리

| 환경 | Evolution set | Validation set | 최종 test | 평가 조건 |
|------|---------------|----------------|-----------|-----------|
| AppWorld | 공식 train 90 task | DEV 57 task | Normal 168, Challenge 417 task | Episode당 최대 100 environment step |
| τ²-Bench Telecom | 별도 sampled pool 250 task | 공식 train 74 task | 공식 test 40 task | 최대 200 conversation step, 오류 10회 |

AppWorld의 TGC는 성공한 task의 비율이고, SGC는 한 scenario의 세 변형을 모두 성공한 scenario의 비율이다. Normal은 56개, Challenge는 139개 scenario로 구성된다. Challenge에는 evolution·validation에 없던 Amazon 또는 Gmail API를 요구하는 과제가 들어 있다. 같은 하네스와 같은 고정 artifact를 Normal과 Challenge에 사용하므로, 후자의 개선은 익숙하지 않은 앱으로 실행 전략이 전이되는지를 보는 근거가 된다.

Telecom의 250개 experience task는 base collection을 제외한 전체 collection에서 seed 2026으로 층화 추출한다. Service issue 18개, mobile data 60개, MMS 172개로 구성된다. 공식적으로 train이라는 이름이 붙은 74개 task는 여기서는 validation 역할을 한다. Split 이름과 실제 사용 목적을 따로 봐야 하는 이유다. 사용자 simulator는 GPT-5.2 high reasoning을 사용하고 simulation seed는 300으로 설정한다.

### 모델 설정과 후보 예산

주 실험의 task backbone은 Qwen3.5-27B와 GPT-5.4-mini다. Qwen은 vLLM 0.27.1, tensor parallelism 4, temperature 0, thinking 활성화로 제공된다. Mini는 low reasoning을 사용하며 최대 completion은 모델 호출당 65,536 token이다. 같은 benchmark·backbone의 초기 하네스와 개선 하네스는 task-model 설정과 environment limit를 맞춘다. AppWorld 요청의 low reasoning 필드를 Qwen serving template이 무시했다는 부록 설명도 있으므로, 요청 옵션만 보고 Qwen의 thinking이 꺼졌다고 해석하면 안 된다.

주 실험에서는 GPT-5.4가 연구 선택을 수행하고 Codex의 GPT-5.4가 후보를 구현한다. AppWorld는 모듈당 네 개, 총 20개 paper-derived 후보를 요청하며 Telecom은 모듈당 세 개, 총 15개를 요청한다. 비교 방법에는 같은 setting 안에서 동일한 search rollout 예산을 배정한다. AppWorld 초기 DEV 측정은 세 run이며 Mini finalist는 추가로 아홉 run에 걸쳐 확인한다. 이 설정은 모델 호출 수, token, 비용까지 모두 같다는 뜻은 아니다.

출판 시기별 실험은 별도 설정이다. 매 업데이트마다 모듈당 최대 한 논문에서 최대 다섯 변이와 최대 네 조합을 평가하며, 가장 좋은 하네스는 총 세 번 DEV 평가를 받는다. 연구 선택은 GPT-5.4, 구현은 Codex GPT-5.5를 사용한다. 주 결과표와 이 실험을 같은 후보 pool·같은 구현 모델에서 나온 연속 숫자로 읽지 않는 것이 중요하다.

## 실험 결과

### AppWorld의 과제 완료와 미경험 앱 전이

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/tab1-results.png" class="img-fluid rounded z-depth-1" caption="Table 1: AppWorld Normal·Challenge의 TGC·SGC와 τ²-Bench Telecom의 pass^k. 세 run의 평균±표준편차(%), 동일 backbone 대비 변화량(%p)." zoomable=true %}

Qwen의 Normal TGC는 69.0%에서 81.4%로, SGC는 48.8%에서 69.0%로 오른다. Challenge에서는 TGC 49.6%→63.6%, SGC 28.3%→44.8%다. Meta Harness의 Qwen Challenge TGC는 54.6%이므로 ScholarEvolve가 9.0%p 높다. 개별 task 성공뿐 아니라 세 변형을 일관되게 푸는 SGC에서도 개선을 확인할 수 있다.

Mini의 Normal TGC는 67.1%→72.4%, Challenge TGC는 46.1%→55.6%다. Challenge SGC도 21.1%→32.4%로 개선된다. 반면 같은 논문의 Meta Harness 비교에서는 Mini Challenge TGC가 45.6%로 초기값보다 약간 낮다. 이는 코드 수정의 자유도나 반복 탐색 자체가 항상 이득을 주는 것은 아니라는 사례다. 다만 특정 예산과 구현에서 얻은 비교이므로 모든 상황에서 Meta Harness가 열등하다고 일반화할 수는 없다.

Qwen의 Normal 81.4%는 초기 하네스의 Kimi-K2.6 81.3%와 비슷하며, GPT-5.4 85.7%와의 차이는 16.7%p에서 4.3%p로 줄어든다. 약 74%의 격차 축소라는 논문의 표현은 이 Normal TGC 비교에 한정된다. Challenge에서 GPT-5.4는 80.4%로 여전히 훨씬 높다. 특정 benchmark의 성능 접근을 모델 전체 능력의 동등성으로 확대해서는 안 된다.

### Telecom의 평균 성공과 반복 신뢰도

Mini의 Telecom pass^1은 72.7%→81.9%, pass^4는 49.2%→58.3%다. 한 번의 평균 성공 가능성과 반복 실행 모두를 만족하는 조건에서 각각 개선이 있다. 그러나 pass^4가 여전히 pass^1보다 훨씬 낮으므로, 평균 성능이 높아졌다는 사실만으로 일관된 서비스 처리가 해결되었다고 볼 수는 없다. 이 두 숫자를 함께 봐야 실제 운영에서 반복 실패가 남아 있다는 점이 드러난다.

Qwen은 초기 pass^1이 이미 96.7%라 개선 폭이 98.1%까지 +1.4%p로 작다. 반면 pass^4는 86.7%에서 93.3%로 +6.6%p 오른다. 높은 초기 성공률에서 남은 간헐적 실패를 줄이는 효과가 더 엄격한 지표에 반영된 것으로 읽을 수 있다. 동일한 방법도 backbone의 초기 수준과 실패 분포에 따라 가장 크게 움직이는 metric이 달라진다.

### 세 출판 시기 구간의 반복 개선

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/tab5-lifelong.png" class="img-fluid rounded z-depth-1" caption="Table 5: Qwen3.5-27B의 세 차례 문헌 업데이트별 AppWorld Normal TGC·SGC 평균±표준편차(%)." zoomable=true %}

문헌 window는 2025년 12월까지, 2026년 1~4월, 2026년 5~8월의 세 구간이다. 현재 index에서 arXiv 최초 제출일을 기준으로 재구성하며, Qwen의 가중치와 evolution trajectory, 파생 artifact는 고정한다. 각 세대의 선택을 모두 끝낸 뒤 Normal test에서 평가한다. 따라서 새 task 경험이 계속 쌓이는 online learning 실험과는 다르다. 추가 문헌을 공급하는 조건에서 설계를 더 개선할 수 있는지를 보는 실험이다.

ScholarEvolve의 TGC는 69.00→73.41→79.76→81.55%, SGC는 48.80→54.17→61.91→66.67%로 증가한다. Meta Harness의 마지막 값은 각각 69.64%, 51.19%다. 문헌 유입이 세 번의 업데이트에 걸쳐 유용한 후보를 제공했다는 증거지만, 실제 시간 흐름에 따라 수개월 운영한 결과는 아니다. 또한 주 결과표의 Qwen Normal 81.4%·69.0%와 이 실험의 81.55%·66.67%는 서로 다른 protocol의 수치이므로 섞어 쓰지 않아야 한다.

## 결과 분석 / Ablation

### Topic 선택과 모듈 분리의 누적 효과

Table 2는 구성요소를 하나씩 독립적으로 제거하는 방식이 아니라 누적 제거 실험이다. Qwen Normal TGC는 전체 방법 81.4%, topic-guided selection 제거 80.0%, 여기에 module-wise mutation 제거 78.6%, 마지막으로 research guidance까지 제거하면 76.8%다. Mini는 같은 순서로 72.4→69.8→69.3→67.5%다. 마지막 행이 이 실험의 Meta Harness 조건에 해당한다.

첫 변화는 같은 문헌 pool과 paper budget에서 다양성을 보장하는 선택이 relevance ranking보다 유리했다는 근거다. Qwen의 TGC·SGC 차이는 각각 1.4%p·2.3%p, Mini는 2.6%p·5.4%p다. 뒤쪽 차이는 이미 앞의 요소가 제거된 상태에서 측정되므로, 이를 각 요소의 독립 기여도로 더하거나 다른 순서에서도 같은 값이라고 가정하면 안 된다. 문헌 유입, 모듈 분리, topic 선택이 함께 작동하는 설계라는 점을 읽어야 한다.

### 단독 최고 후보와 최선의 조합의 차이

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/tab3-composition.png" class="img-fluid rounded z-depth-1" caption="Table 3: AppWorld DEV 57개 task의 단일 모듈과 조합 성능. 세 run의 TGC·SGC 평균±표준편차(%), N/A는 해당 조합에서 제외된 모듈." zoomable=true %}

DEV 57개 task에서 Qwen의 memory-only TGC는 81.3%로 강하지만, 조합은 84.8%에 도달한다. Mini는 skills·memory·workflow만 결합하고 tool·context는 초기 구현을 유지하며 77.2%를 얻는다. 모든 모듈을 무조건 교체하는 것이 목적이 아니라, 선택한 구성에서 실제로 도움이 되는 변경을 남긴다는 뜻이다. 표의 N/A도 해당 모델에서 그 기능 자체가 없다는 의미가 아니라 이 조합에 그 모듈 변이를 넣지 않았다는 뜻이다.

더 직접적인 사례는 Qwen skill 후보의 순위 역전이다. 단독 TGC 75.4%인 후보를 73.7% 후보로 바꾸었는데 전체 조합은 80.7%에서 84.8%로 좋아진다. 개별 최고점만 골라 합치는 전략의 한계를 보여 준다. 다만 부록 A.1은 이 Table 3 조합의 skill 구현이 주 test 하네스와 다르고 나머지 네 모듈은 같다고 명시한다. 이 숫자로 최종 test 하네스의 정확한 구성이나 각 모듈의 기여를 역산해서는 안 된다.

### 문헌 기반 후보의 큰 퇴행과 선택의 역할

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/tab7-candidates.png" class="img-fluid rounded z-depth-1" caption="Table 7: Qwen AppWorld의 20개 단일 모듈 후보. DEV TGC 변화량(%p), 90% paired task-bootstrap 구간, 개선·악화 task 수(W/L), 최종 채택 모듈(별표)." zoomable=true %}

20개 Qwen 후보 중 17개는 standalone DEV TGC가 초기보다 높고, 8개는 90% paired task-bootstrap 구간이 0 위에 있다. 그러나 나머지 세 후보는 크게 악화된다. 두 context 후보의 변화량은 −45.6%p, −43.3%p이고 CoEvo-Mem 기반 memory 후보는 −67.8%p다. 최종 하네스는 이들을 제외한다. 실행 가능성을 검사한 뒤에도 과제 성능은 무너질 수 있다는 점이 수치로 드러난다.

이 결과는 해당 원 논문들이 잘못되었다는 판정이 아니다. 특정 backbone·host harness·artifact·adaptation 아래 구현된 후보가 실패했다는 결과다. 실제로 Mini의 최종 AppWorld memory는 CoEvo-Mem 기반 구현을 사용한다. 같은 출처에서 가져온 아이디어도 모델과 구현 맥락에 따라 채택 여부가 달라진다. 연구 문헌을 신뢰할 수 있는 제안 원천으로 쓰되, 현재 시스템에 대한 성능 보증서로 취급하지 않는 것이 이 방법의 실질적인 교훈이다.

### 과제별 신뢰도와 API 범위의 불확실성

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig3-evolution.png" class="img-fluid rounded z-depth-1" caption="Figure 3: 왼쪽은 세 업데이트에 따른 AppWorld Normal TGC·SGC(%)와 표준편차. 오른쪽은 초기·최종 하네스의 3회 중 성공 횟수별 task 수, 모델별 585개 task." zoomable=true %}

Normal·Challenge를 합친 585개 task에서 Qwen은 221개의 성공 횟수가 늘고 57개는 줄었다. Mini는 200개 개선, 106개 악화다. Qwen에서 세 번 모두 성공한 task는 205개에서 333개로 증가한다. 개선된 task 중 처음부터 한두 번 성공하던 task의 비중은 Qwen 73.3%, Mini 66.0%다. 따라서 성능 향상은 전혀 못 풀던 문제를 새로 푸는 효과와, 이미 가끔 풀던 문제를 더 안정적으로 푸는 효과가 섞여 있다.

API 범위 분석에서는 공식 reference solution이 사용한 distinct API 개수를 기준으로 task를 묶는다. Train의 최대는 12개이며 이를 넘는 Challenge task는 102개다. 이 집단의 평균 TGC 개선은 Qwen +9.5%p, Mini +7.2%p지만 95% paired scenario-bootstrap 구간은 각각 [−0.7, 19.6], [0.3, 14.1]%p다. Qwen의 구간이 0을 포함한다는 점까지 함께 봐야 한다. 또한 이 API 개수는 reference solution의 도구 범위이지 agent가 실제로 수행한 step 수나 task 난도의 완전한 대리변수가 아니다.

### 응답 형식 개선과 잔여 목표 실패

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig8-failures.png" class="img-fluid rounded z-depth-1" caption="Figure 8: Qwen의 Normal·Challenge 종료 진단. 가로축은 전체 episode 대비 비율(%), 빈 원은 초기 하네스, 마름모는 ScholarEvolve, 숫자는 초기→최종 건수." zoomable=true %}

실패 분석은 개선의 성격을 더 구체화한다. Qwen의 초기·최종 실패 episode 1,336개를 분석한 행동 taxonomy에서 invalid response format은 492→206건으로 크게 줄지만, constraint violation은 91→89건, incomplete retrieval은 77→70건으로 변화가 작다. 에이전트가 작업을 수행하고도 종료 응답 규약을 어기는 문제를 고치는 것이 점수에 크게 기여한 반면, 요구사항 추적과 증거를 빠짐없이 모으는 문제는 계속 남는다.

Figure 8은 이 중복 가능한 행동 label과 다른 진단이다. 실행 종료, 응답 contract, 답의 정확성, 목표 상태의 순서로 처음 실패한 endpoint 하나를 부여한다. 가로축 분모는 실패 episode만이 아니라 Normal 504개, Challenge 1,251개의 전체 episode다. Challenge의 response-contract violation은 407→177건으로 줄지만 unmet goal state는 203→251건으로 늘어난다. 앞선 검사에 걸리던 episode가 이제 뒤의 검사까지 통과해 분류될 수 있으므로, 이 증가를 그대로 “하네스가 목표 상태 실패를 그만큼 새로 만들었다”라고 해석하면 안 된다.

실제 상태 처리의 개선 사례도 있다. 새 객체를 만드는 대신 요청된 기존 객체를 찾아 수정하거나, 이전 장바구니 내용이 새 주문에 섞이지 않도록 먼저 정리한 두 task는 0/3에서 3/3 성공으로 바뀐다. 다만 사례 두 개가 전체 개선의 비율을 설명하지는 않는다. 논문이 제시한 full-cohort 빈도와 정성 사례를 함께 읽되, 특정 mechanism이 모든 개선을 일으켰다는 인과 주장까지 확장하지 않는 것이 타당하다.

## 한계와 비판적 평가

### Rollout 예산과 실제 계산 비용의 차이

같은 search rollout 예산은 공정한 비교를 위한 중요한 조건이지만 전체 계산 비용의 동등성은 아니다. 문헌 검색·분류·blueprint 작성·코드 repair가 추가되고, 배포된 workflow도 action 하나당 여러 모델 호출을 할 수 있다. 논문은 성능 중심의 근거를 제공하지만 이 모든 비용을 묶은 token·요금·wall-clock 기준의 효율 비교는 충분하지 않다. 모델 재학습이 없다는 장점을 곧바로 더 싸거나 빠른 운영으로 바꾸어 말할 수 없다.

### 제한된 validation과 시간축 재구성

AppWorld DEV는 57개 task이고 Telecom test는 40개다. 반복 선택과 bootstrap gate는 우연한 개선을 줄이려는 장치지만, 작은 validation을 여러 번 이용한 탐색의 선택 편향까지 자동으로 제거하지 않는다. 문헌 window도 현재 index에서 과거 제출일로 재구성한다. 세 번의 성공적인 업데이트는 의미가 있으나, 실제 배포 중 task 분포가 바뀌고 memory가 누적되는 상황에서 지속적으로 개선을 유지한다는 증거는 추가로 필요하다.

### 자동 실패 주석과 구현 재현성의 범위

실패 taxonomy는 evidence quote와 step index를 보존하고 로컬 진단으로 교차 확인하지만, 두 annotation pass 모두 같은 모델을 사용하며 두 번째 pass는 첫 번째 결과를 본다. 독립적인 사람 간 일치도와 같은 검증은 아니다. 지원되는 unresolved label이 없는 실패 episode도 218개이며, 그 불확실성을 남겨 둔다. 따라서 label 빈도는 보관된 trajectory에 대한 유용한 기술 통계로 읽어야 하고, 완전히 관측된 원인 분포로 취급해서는 안 된다.

2026-10-02 확인 시 논문이 연결한 공식 GitHub 저장소는 비어 있다. 부록은 선택된 모듈의 코드 일부를 제공하지만 전체 pipeline, 실행 환경, artifact를 그대로 재현할 수 있는 공개 배포물은 확인하지 못했다. 원문에 코드 공개 문구가 있다는 사실과 실제 실행 가능한 저장소가 있다는 사실을 구분해야 한다. 이 리뷰의 구현 설명은 본문과 부록에 근거하며, 검증할 수 없는 설치·실행 명령은 제시하지 않는다.

## 시사점 / Takeaways

- <strong>실패 분석은 문제를 찾고, 문헌은 해결책의 범위를 넓힌다.</strong> 두 정보원을 함께 사용하되 특정 benchmark의 patch를 일반 메커니즘으로 착각하지 않는 것이 중요하다.
- <strong>다양성은 후보 생성 전에 설계할 수 있다.</strong> 같은 예산에서 다른 메커니즘을 시도하도록 topic을 배분하는 방식은 관련도 순 검색을 보완한다.
- <strong>모듈화의 가치는 교체와 검증에 있다.</strong> 단독 최고 후보들을 모은 조합보다 덜 강한 후보를 포함한 조합이 나을 수 있으므로 전체 실행 평가가 필요하다.
- <strong>신뢰도와 실패 종류를 함께 봐야 한다.</strong> 평균 성공률, 반복 성공 조건, 응답 규약, 실제 목표 상태는 서로 다른 개선을 드러낸다.
- <strong>지속적 진화에는 평가 자산의 관리가 필요하다.</strong> 고정 artifact의 출처, validation의 역할, 새 문헌의 시간 범위까지 관리해야 새 지식의 효과를 해석할 수 있다.

## 참고 자료

- [Learning from Research: Toward Lifelong Agent Harness Evolution](https://arxiv.org/abs/2609.40169): Yang et al., 2026. 본 리뷰는 arXiv v1 본문과 부록 기준.
- [공식 ScholarEvolve 저장소](https://github.com/UCSB-NLP-Chang/ScholarEvolve): 논문이 안내한 주소. 2026-10-02 확인 시 빈 저장소로, 실행 코드 공개 여부는 추후 확인 필요.
- 그림·표의 출처는 위 논문이며, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)에 따라 저자에게 귀속. 수치 해석과 비판적 평가는 리뷰 본문의 설명.

## 더 읽어보기

- **[Meta-Harness: End-to-End Optimization of Model Harnesses](https://arxiv.org/abs/2603.28052)** (Lee et al., 2026): 코드·실행 trace·평가 결과를 이용하는 하네스 탐색과 본 논문의 비교 기준.
- **[TopicGPT: A Prompt-based Topic Modeling Framework](https://arxiv.org/abs/2311.01449)** (Pham et al., NAACL 2024): 생성·정제·할당 단계로 문헌의 의미적 topic을 구성하는 기반 방법.
- **[AppWorld: A Controllable World of Apps and People for Benchmarking Interactive Coding Agents](https://arxiv.org/abs/2407.18901)** (Trivedi et al., ACL 2024): 여러 앱의 API와 변화하는 환경 상태를 다루는 interactive coding agent 평가.
- **[τ²-Bench: Evaluating Conversational Agents in a Dual-Control Environment](https://arxiv.org/abs/2506.07982)** (Barres et al., 2025): 에이전트와 사용자가 함께 상태를 바꾸는 기술 지원 환경과 반복 신뢰도 평가.

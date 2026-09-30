---
layout: post
title: "[논문 리뷰] Agentic Routing: The Harness-Native Data Flywheel"
date: 2026-09-30 15:24:47 +0900
description: "실행 상태에 따라 모델을 배정하는 OpenSquilla: 비용·품질·지연 시간의 실험과 라우팅 기록의 학습 데이터 활용"
tags: [llm-routing, agents, harness, ensemble, cost-efficiency, off-policy-learning]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/fig1-regimes.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0044-agentic-routing-the-harness-native-data-flywheel/
en_url: /en/papers/0044-agentic-routing-the-harness-native-data-flywheel/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Xinchen Liu et al. (저자 15명, TokenRhythm Technologies) |
| 학회 | arXiv · 2026 |
| arXiv | [2607.11399](https://arxiv.org/abs/2607.11399) |
| Code | [TokenRhythm/opensquilla](https://github.com/TokenRhythm/opensquilla) |
| 데이터 | DRACO와 PinchBench 1.2.1의 에이전트 실행 결과 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-09-30 |

## TL;DR

- Agentic Routing은 원래 질문뿐 아니라 tool 오류, context 상태, 검증 결과를 보고 다음 실행 단계에 모델 하나 또는 모델 집합을 배정하는 관점이다. OpenSquilla는 가벼운 필터와 LightGBM으로 시작하는 구현을 제시한다.
- PinchBench singleton은 OpenClaw의 Opus 4.8 대비 점수 93.35→93.14, 과제당 비용 0.2224→0.0204 USD를 기록한다. 같은 OpenSquilla 하네스의 Opus와 비교하면 점수는 94.33→93.14, 비용 절감은 약 87.6%다.
- DRACO의 고정 proposer 앙상블은 DuckDuckGo 조건에서 60.82점·0.3766 USD를 기록한다. 다만 p95 지연 시간이 3,097초이고 비교군의 과제 coverage도 달라, 품질과 청구 비용의 이득을 응답 속도까지 확장할 수는 없다.
- 라우팅 기록을 다음 router와 specialist의 학습에 재사용하는 data flywheel을 설계한다. 현재 정책의 실험 결과와 여러 세대의 재학습으로 개선이 누적된다는 장기 가설은 구분해서 읽어야 한다.

## 소개 (Introduction)

코딩 에이전트가 파일 이름을 확인하는 순간과, 여러 번 실패한 테스트의 원인을 찾는 순간에 같은 모델이 꼭 필요할까? 조사 에이전트가 검색어를 만드는 순간과, 서로 충돌하는 출처를 종합해 최종 보고서를 쓰는 순간에도 요구되는 능력은 다르다. 가장 강력한 모델을 처음부터 끝까지 사용하면 선택은 간단하지만, 단순한 단계에도 그 모델의 요금과 대기 시간을 지불한다. 반대로 작은 모델만 고집하면 한 번의 잘못된 판단이 여러 번의 재시도와 복구로 이어질 수 있다.

문제는 질문의 길이나 주제만으로 이 차이를 판단하기 어렵다는 점이다. 같은 사용자의 요청도 이미 검색에 성공했는지, context를 압축하면서 근거를 잃었는지, 직전 tool call이 실패했는지에 따라 다음 단계의 난도가 달라진다. 여기서 하네스(harness)는 프롬프트를 감싸는 얇은 코드가 아니라 관찰, 문맥, 도구, 상태, 검증과 복구를 관리하는 실행 환경이다. 모델 선택에 필요한 정보 상당수가 이 환경 안에 있다.

Liu et al.의 [Agentic Routing](https://arxiv.org/abs/2607.11399)은 모델 배정을 이 실행 환경의 일부로 다룬다. 동시에 선택 직전의 상태와 선택 이후의 결과를 기록하면, 운영 로그가 다음 정책을 학습하는 데이터가 된다고 제안한다. 이 리뷰는 arXiv v1의 본문과 부록을 기준으로 두 주장을 나누어 살펴본다. 하나는 이질적인 모델을 배정해 지금의 비용·품질을 바꿀 수 있다는 실험적 주장이고, 다른 하나는 그 과정에서 얻은 데이터로 미래의 router와 모델을 개선한다는 시스템 설계다.

## 핵심 기여 (Key Contributions)

- <strong>실행 상태에 조건화한 모델 배정.</strong> 정적인 query 분류를 넘어 검증 실패, 복구 이력, context 압력까지 선택의 입력으로 정의하고, 개별 응답보다 전체 trajectory의 결과를 목적에 둔다.
- <strong>Singleton과 ensemble의 공통 목적함수.</strong> 하나의 비싼 모델, 하나의 싼 모델, 여러 저렴한 모델의 조합을 품질·비용 관점에서 비교하며 aggregator의 비용도 포함한다.
- <strong>예측·행동·결과를 구분한 arena record.</strong> 이전 router가 선택한 모델을 정답으로 복제하지 않고, 환경의 검증 결과와 복구 비용으로 그 선택을 평가할 수 있게 기록 구조를 설계한다.
- <strong>OpenSquilla의 배포 정책 비교.</strong> PinchBench와 DRACO에서 singleton, 고정 proposer 앙상블, 실행 시점에 조합을 고르는 routed ensemble을 평가해 적용 조건에 따른 차이를 보여 준다.

## 관련 연구 / 배경 지식

### Query routing과 실행 상태의 차이

[FrugalGPT](https://arxiv.org/abs/2305.05176)는 여러 LLM을 cascade로 연결해 비용과 품질을 조절했고, [RouteLLM](https://arxiv.org/abs/2406.18665)은 preference data로 강한 모델과 약한 모델 사이의 선택을 학습했다. 이런 연구를 통해 모든 입력을 가장 비싼 모델로 처리할 필요는 없다는 점은 이미 알려져 있다. 이번 논문의 차별점은 저렴한 모델을 쓰자는 주장 자체보다, 에이전트가 수행 중인 단계의 정보를 선택 문제에 포함하는 데 있다.

예를 들어 “문서를 요약해 달라”는 같은 요청도 문서가 context에 온전히 들어 있는 상태와, 검색이 실패해 일부 조각만 남은 상태는 다르다. 첫 상태에는 작은 모델이 충분할 수 있지만 두 번째 상태에서는 추가 검색이나 근거 복원 능력이 중요해진다. 이 예시는 논문의 capability matching을 풀어 설명한 것이다. 실제로 어떤 상태 특징이 성능 개선에 얼마나 기여했는지는 별도의 ablation으로 확인해야 한다.

### 모델 간 상호보완성과 선택 편향

[Mixture-of-Agents](https://arxiv.org/abs/2406.04692)는 여러 LLM의 출력을 다음 모델이 참고하도록 결합한다. 여러 모델을 호출하는 것만으로 항상 이득이 생기지는 않는다. 모두 같은 근거를 놓치거나 같은 오류를 반복한다면 호출 수만 늘어난다. Agentic Routing이 강조하는 complementarity는 개별 모델의 평균 점수보다 현재 상태에서 서로 다른 실패를 보완할 가능성에 가깝다.

학습 데이터에도 비슷한 문제가 있다. Router가 어떤 상태에서 늘 모델 A만 선택했다면 로그에는 A의 결과만 충분히 쌓인다. A가 실패했다는 사실만으로 B가 성공했을 것이라고 알 수는 없다. 이런 선택 편향을 다루는 것이 off-policy evaluation이며, [Doubly Robust Policy Evaluation and Learning](https://arxiv.org/abs/1103.4601)은 과거 행동의 선택 확률과 결과 예측을 함께 이용하는 접근을 제시한다. 로그를 많이 모으는 것과 새로운 정책을 신뢰성 있게 평가하는 것은 서로 다른 일이다.

## 방법 / 아키텍처 상세

### 1. Harness state와 단계별 모델 집합

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/fig1-regimes.png" class="img-fluid rounded z-depth-1" caption="Figure 1: 하네스 상태에서 시작하는 singleton·multi-model 두 실행 모드. 공유 model pool, aggregator, 검증 결과와 비용 기록의 피드백 경로." zoomable=true %}

입력은 사용자 과제 q, 후보 model pool, 현재 단계의 harness state다. 상태에는 현재 관찰과 원본·압축 context, 사용 가능한 행동, 생성한 artifact, tool 이력, 복구 상태, 검증 신호가 들어간다. 출력은 다음 단계에서 사용할 모델 집합이며, 여러 모델을 선택했다면 그 결과를 결합하는 정책까지 포함한다. 모델 하나를 모든 단계에 고정하는 기존 방식도 이 정의의 특수한 경우다.

여기서 단계별이라는 말은 token마다 모델을 바꾼다는 뜻이 아니다. 논문은 현재 하네스의 실행 step이나 turn에서 이루어지는 결정을 다룬다. Token 수준 조합과 speculative decoding의 연결은 향후 방향으로 남긴다. 또한 모델 선택과 하네스 설정을 함께 최적화할 수 있다는 넓은 비전을 제시하지만, 보고된 실험은 주변 하네스 정책을 고정한 상태에서 모델 또는 모델 집합을 배정하는 데 초점을 맞춘다.

이 범위를 구분해야 개선 원인을 이해할 수 있다. Tool schema나 context 압축 방식까지 동시에 바꾸었다면 모델 선택만의 효과를 알기 어렵다. 반대로 하네스를 고정했다는 사실은 그 하네스가 모든 모델에 최적이라는 뜻도 아니다. 같은 모델을 OpenClaw와 OpenSquilla에서 실행한 결과가 다른 이유도 이 실행 환경의 역할과 연결된다.

### 2. 네 단계의 저비용 capability matching

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/fig2-routing.png" class="img-fluid rounded z-depth-1" caption="Figure 2: 왼쪽의 규칙 기반 분기, 가운데의 query별 LLM 선택, 오른쪽의 실행 단계별 모델 선택과 중간·최종 reward 피드백." zoomable=true %}

공개 초기 정책은 매번 큰 LLM에게 모델 선택을 물어보지 않는다. 먼저 단순하고 위험이 낮은 입력을 저렴한 경로로 보내고, 과제의 유형을 파악한 뒤, 실행 상태로 요구 능력을 보정한다. 마지막으로 남은 후보를 LightGBM ranker가 비교해 실제 모델이나 tier에 연결한다. 논문은 이를 다음 네 역할로 설명한다.

| 단계 | 판단 대상 | 역할 |
|------|-----------|------|
| Order admission | 명백히 단순하고 위험이 낮은 상태 | 저렴한 fast path 선택 |
| Demand construction | 코딩·추론·대화·tool use 등 과제 유형 | 필요한 능력의 대략적인 profile 구성 |
| Risk pricing | Context 압력, 실패, 검증, 복구, 행동의 가역성 | 능력이 부족할 때 생길 손실과 복구 부담 반영 |
| Capability matching | 후보의 능력과 배포 profile | LightGBM 순위와 registry를 통한 실제 모델 배정 |

여기서 risk pricing은 논문에 완전히 명시된 별도 확률 모델의 이름이라기보다, 실패가 나중에 만들어 낼 비용을 선택에 반영하는 역할이다. 싼 모델이 세 번 재시도하고 결국 강한 모델로 복구해야 한다면 첫 호출의 낮은 요금만 보고 좋은 선택이라고 할 수 없다. 반대로 명확한 형식 변환에 강한 모델을 계속 쓰는 것은 불필요한 능력에 비용을 지불하는 셈이다.

LightGBM은 이 전체 구상의 필수 이론 요소가 아니다. 적은 데이터로 시작하고 낮은 호출 지연을 유지하기 위한 cold-start 구현이다. 따라서 결과를 “tree model이 모든 agent reasoning을 대신한다”라고 읽으면 안 된다. Router는 다음 일을 수행할 모델을 고르고, 실제 답변 생성과 tool 사용은 선택된 모델과 하네스가 담당한다. Router 자체의 판단 비용도 절약분보다 작아야 한다.

### 3. Proposer 선택과 상태 기반 aggregation

Multi-model 모드에서는 먼저 과제 유형, 난도, 필요한 능력, 위험, 검증 가능성, 허용 비용·지연 시간, 라우팅 불확실성을 담은 task profile을 만든다. 그다음 profile에 맞는 proposer 집합을 구성한다. 개별 점수 상위 모델을 그대로 고르는 top-k와 달리, 이미 선택한 모델에 후보 하나를 더했을 때 얻을 추가 가치와 오류의 상호보완성을 고려한다.

선택된 proposer들은 각각 후보 출력을 만들고 aggregator가 하나의 실행 가능한 결과로 결합한다. 소프트웨어 과제라면 테스트나 patch 적용 결과, tool 과제라면 schema와 권한 제약, 조사 과제라면 사실성·인용·완전성 평가를 활용할 수 있다. 이러한 검증 방식은 과제에 따라 선택할 수 있는 설계 공간이며, 모든 benchmark에서 모든 검증기를 동시에 사용했다는 뜻은 아니다.

Aggregator도 선택의 일부다. 저렴한 proposer 여러 개를 호출하고 마지막에 아주 비싼 모델로 전부 다시 쓰면 기대한 절감이 사라질 수 있다. 반대로 규칙이나 실행 가능한 verifier로 후보를 선택할 수 있는 과제는 더 가벼운 결합이 가능하다. 집합에 모델이 몇 종류 들어 있는지와 실제 호출 횟수도 구분해야 한다. DRACO의 선택된 구성은 저렴한 proposer 일부에서 추가 stochastic sample을 생성한다.

### 4. 예측·행동·결과의 분리

Arena record에는 질문과 상태만 들어가지 않는다. 선택 당시의 후보 목록, router가 예상한 능력 요구, 후보 점수와 confidence, 선택한 모델·aggregator, 이후 실행 trace, verifier 결과, 최종 성과, 실제 비용·소요 시간, 탐색 또는 replay 여부를 함께 남긴다. 선택 전에 알았던 것과 행동 뒤에 관찰한 것을 구분하는 것이 핵심이다.

예를 들어 router가 작은 모델에 높은 confidence를 주었지만 tool call이 실패하고 강한 모델의 복구가 필요했다면, 그 선택을 모범 답안으로 저장하지 않는다. 같은 상태에서 작은 모델을 선택한 행동이 어떤 결과와 비용으로 이어졌는지를 저장한다. 반대로 작은 모델이 검증을 통과했다면 그 상태에서 비싼 모델을 쓰지 않아도 되었을 가능성을 보여 주는 자료가 된다.

다만 이러한 기록만으로 선택하지 않은 모든 모델의 성능을 알 수는 없다. 논문은 불확실성이 큰 상태의 escalation, 일부 상태의 대안 모델 replay와 oracle 평가로 관측 범위를 넓히자고 제안한다. Ensemble은 같은 상태에 여러 후보의 출력을 얻는다는 이점이 있지만, 실행하지 않은 후보가 전체 trajectory에서 어떤 결과를 냈을지까지 자동으로 관측하는 것은 아니다.

## 학습 목표 / 손실 함수

### Trajectory 손실과 실제 실행 비용

논문의 중심 목적은 한 번의 모델 응답 점수를 최대화하는 것이 아니라, 끝까지 수행한 trajectory의 task loss와 비용을 함께 줄이는 것이다. 식 (1)의 관계를 나누어 쓰면 다음과 같다.

$$
\begin{aligned}
S_t &= g(\mathcal M\mid h_t),\\
\ell(\tau) &= 1-R_{\mathrm{task}}(\tau),\\
C(\tau) &= \sum_{t=1}^{T}\sum_{m\in S_t}c(m,h_t).
\end{aligned}
$$

여기서 g는 router, h는 현재 상태, S는 선택한 모델 집합, τ는 전체 실행 경로다. Task reward가 높을수록 loss는 작아지고, 비용은 각 단계에서 호출한 모델들의 비용을 누적한다. 식의 reward 정의를 DRACO 원점수 60.82에 그대로 대입해 음의 loss를 계산할 필요는 없다. 목적함수의 추상적인 task reward와 결과표의 benchmark-native score는 표현 수준이 다르다.

저자는 기대 task loss와 기대 비용의 Pareto frontier를 목표로 삼고, 비용에 가중치를 주어 운영점을 선택한다. Singleton의 식 (5)은 여기에 즉시 얻는 step reward를 더한다. 테스트 통과, tool call 성공, schema 충족 또는 LLM judge의 평가처럼 중간 피드백을 이용해 긴 실행 경로의 마지막 결과만 기다리는 어려움을 줄이려는 것이다. 중간 보상이 있어도 전체 실패와 복구 비용을 목적에서 제거하지 않는다.

### Ensemble의 상호보완성 보정

식 (8)을 읽기 쉽게 항별로 나누면 아래와 같다. u는 proposer 집합 P와 aggregation 정책 a의 조합이며, 각 항은 현재 상태에서 그 행동을 택했을 때의 기대값이다.

$$
\begin{aligned}
J(u\mid h_t) ={}& \ell(u\mid h_t)+\lambda C(u\mid h_t)\\
&-\alpha V(P\mid h_t)\\
&-\beta\rho(u\mid h_t).
\end{aligned}
$$

Loss와 비용은 작을수록 좋고, proposer의 상호보완성 V와 step reward ρ는 클수록 좋으므로 뒤의 두 항에는 음의 부호가 붙는다. 논문은 과거 오류의 decorrelation, 상태별 disagreement, verifier 피드백을 이용한 diminishing-returns surrogate로 V를 구성한다고 설명한다. 그러나 이 설명에서 특정 계수나 구현 수식을 임의로 복원할 수는 없다.

상호보완성 항은 그 자체가 최종 목표라기보다 조합 탐색의 보조 장치다. 비용만 보면 특정 싼 모델들에 선택이 몰릴 수 있고, noisy한 trajectory loss만으로 조합을 탐색하기도 어렵다. 저자는 loss 추정이 좋아질수록 α를 줄여 실제 품질·비용 목표로 돌아가도록 설명한다. 서로 다른 답을 내는 모델이 많다는 사실만으로 좋은 조합이라고 보상해서는 안 된다는 뜻이다.

또한 선형 가중합으로 모든 Pareto 운영점을 찾을 수 있다는 표현은 주의해서 읽을 필요가 있다. 이산적인 모델 조합의 비볼록 frontier에서는 가중합으로 드러나지 않는 점이 있을 수 있다. 이 리뷰에서는 해당 수식을 운영점 선택의 실용적인 목적함수로 해석하며, 완전한 frontier 탐색의 보장으로 보지는 않는다.

## 학습 데이터와 파이프라인

### Cold start와 후속 router 세대

논문이 제시하는 발전 경로는 공개 LightGBM seed에서 시작해 상태 encoder와 예측 head를 학습하고, 이후 후보 모델의 profile을 표현하는 supply encoder를 추가하는 순서다. Profile에 가격, context 길이, latency, tool 신뢰성, 과제별 성공 이력을 넣으면 모델 이름을 고정 class로 외우는 것보다 새로운 모델을 후보로 추가하기 쉽다. 다만 새로운 모델의 실제 능력을 파악하는 관측 비용은 여전히 필요하다.

| 구분 | 입력·역할 | 증거의 범위 |
|------|----------|-------------|
| 초기 정책 | 수작업 특징, 저비용 필터, LightGBM | 보고된 singleton 실행의 출발점 |
| 후속 router | Arena corpus, 상태 encoder, loss·cost 예측 | 단계적 학습·배포 설계 |
| Supply encoder | Model card와 관측된 실행 profile | 새 모델 일반화를 위한 설계 |
| Specialist 학습 | 검증된 성공, 실패 후 복구, 대안 출력 | Distillation·SFT·preference 데이터 활용 구상 |
| 배포 승격 | 이전 정책 대비 품질·비용 비교 | 개선이 없으면 이전 정책 유지 또는 rollback |

현재 데이터로 이전 router의 모델 선택을 그대로 맞히는 정확도는 목표가 아니다. 결과를 이용해 비슷한 품질을 더 싸게 얻거나, 같은 예산으로 품질을 높였는지가 중요하다. 논문은 inverse-propensity 또는 doubly robust 보정을 언급하지만, 이 보고서에는 corpus 규모에 따른 여러 세대의 개선 곡선이나 모든 학습 hyperparameter가 제시되지는 않는다. 따라서 표의 성능을 장기적인 flywheel 완성의 증거로 확대하면 안 된다.

### Model 학습과 router 학습의 보상 분리

같은 실행 기록이라도 용도에 따라 가공 방식이 달라진다. 실패한 작은 모델을 강한 모델이 고친 사례는 SFT나 distillation 자료가 될 수 있고, 검증을 통과한 답과 실패한 답은 preference pair의 후보가 된다. 반복되는 tool 형식 오류는 specialist를 만들 근거이며, 특정 단계에서 복구가 자주 필요하다면 router나 verifier를 개선할 근거다.

논문은 모델 자체의 학습 reward와 router의 reward를 구분한다. 답변 모델에는 품질과 안전·오류 관련 신호를 중심으로 주고, router에는 호출 비용·지연·복구 비용을 포함한다. 단순히 짧고 싼 출력을 좋은 답으로 학습시키면 필요한 설명을 생략하는 방향으로 갈 수 있기 때문이다. 비용 효율적인 시스템과 짧게 말하는 모델은 같은 대상이 아니다.

이 구상의 운영 조건도 분명하다. 후보 모델들의 능력과 가격에 차이가 있어야 배정할 가치가 있고, router의 overhead가 절감액을 잠식하지 않아야 한다. 기록의 provenance와 검증 신뢰성을 관리해야 실패 로그가 유용한 supervision으로 바뀐다. 비용 절감으로 같은 예산에서 더 많은 trace를 얻는다는 논리는 가능하지만, 늘어난 trace가 얼마나 새로운 상태를 포함하는지까지 따져야 지속적인 학습 이득을 기대할 수 있다.

## 실험 결과

### PinchBench singleton의 비교 하네스

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab1-pinch-single.png" class="img-fluid rounded z-depth-1" caption="Table 1: PinchBench singleton의 모델·하네스별 평균 점수, 과제당 청구 비용(USD), 입출력 token 수(천 개)." zoomable=true %}

PinchBench 1.2.1에서는 Opus 4.8, GLM 5.2, DS4 Flash를 후보로 사용한다. OpenClaw의 Opus baseline은 93.35점·0.2224 USD이고, OpenSquilla router는 93.14점·0.0204 USD다. 점수 차이는 0.21점이며 비용은 약 90.83% 감소한다. 논문이 강조하는 약 10.9배 낮은 비용은 이 두 행의 비교다.

그러나 여기에는 하네스 차이가 함께 들어 있다. 같은 OpenSquilla 안의 Opus baseline은 94.33점·0.1649 USD다. 이 행과 router를 비교하면 점수 차이는 1.19점, 비용 절감은 약 87.63%다. 이 값들은 표의 숫자로 직접 계산한 비교이며, headline보다 라우팅 도입의 효과를 판단하는 데 더 가까운 기준이다. 둘 다 비용이 크게 줄었다는 결론은 같지만, 품질을 거의 완벽하게 보존했다는 인상은 비교 대상에 따라 달라진다.

OpenRouter Auto는 OpenClaw에서 88.10점·0.1204 USD를 기록한다. OpenSquilla router가 이 설정보다 좋은 결과를 보이지만, 이를 모든 query-level router의 보편적인 열세로 일반화할 수는 없다. Model pool, 하네스, provider 설정을 포함한 배포 정책 전체의 비교로 읽어야 한다. Token 수 역시 OpenClaw Opus 187.7K, OpenSquilla Opus 97.7K, router 51.3K로 달라진다.

### DRACO singleton의 가격 구성 변화

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab2-draco-single.png" class="img-fluid rounded z-depth-1" caption="Table 2: DRACO singleton의 평균 점수, 과제당 비용(USD), 입출력 token 수(천 개). Routing threshold 0.95 조건." zoomable=true %}

DRACO는 조사 보고서의 사실성, 완전성, 객관성, 표현과 인용 품질을 평가한다. Singleton pool은 Opus 4.8, GLM 5.2, DS4 Pro이며, 표의 routing threshold는 0.95다. 같은 OpenSquilla의 Opus와 비교하면 52.36→52.33점, 0.6559→0.3729 USD로 바뀐다. 비용 감소는 약 43.15%이고 점수 유지 비율은 약 99.94%다.

주목할 부분은 총 token 수가 103.5K에서 108.6K로 오히려 증가했다는 점이다. 이번 절감은 단순히 문맥이나 답변을 줄인 결과만으로 설명되지 않는다. Token을 어느 모델에 배정했는지에 따른 가격 구성 변화가 중요하다는 해석과 일치한다. 다만 aggregate token 수만으로 각 모델의 호출 비율이나 caching의 기여까지 분해할 수는 없다.

### DuckDuckGo DRACO의 고정 proposer 앙상블

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab3-draco-ensemble.png" class="img-fluid rounded z-depth-1" caption="Table 3: DuckDuckGo DRACO의 고정 proposer 구성과 singleton 비교. 평균 점수·과제당 비용(USD)·token 수(천 개), p50/p95 시간(초), 실행 coverage." zoomable=true %}

선택된 구성은 DeepSeek V4, GLM 5.2, Gemini 3 Flash, Qwen 3.7을 proposer로 사용하고 GLM 5.2로 결합한다. Gemini와 Qwen에는 추가 stochastic sample도 배정한다. 논문 §4.3.3이 명시하듯 앞선 주요 앙상블 결과는 run마다 proposer 집합을 미리 고정한 실험이다. 모든 단계에서 router가 조합을 새로 찾은 결과와 구분해야 한다.

이 구성은 60.82점·0.3766 USD를 기록한다. Fable 5의 59.80점·1.2122 USD와 비교하면 점수는 1.02점 높고 비용은 약 68.9% 낮다. 다만 Fable은 실행한 94개 과제, 앙상블은 100개 과제의 결과다. 동일한 100개 전체에서 짝지어진 평균 차이를 보고한 것이 아니므로, coverage를 제외한 한 숫자의 순위만 강조하기 어렵다.

시간 비용은 더 뚜렷하다. 앙상블의 p50/p95는 535.5/3,097.0초이고, Fable은 187.7/343.5초다. Opus의 p50/p95는 165.3/270.6초다. 앙상블의 평균 청구액이 낮아도 사용자가 기다리는 꼬리 지연은 크게 늘어난다. 579.7K token이라는 사용량도 싼 모델의 많은 연산을 비싼 모델의 적은 연산과 교환한 운영점임을 보여 준다.

### Brave DRACO와 Hermes MoA 비교

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab4-5-draco.png" class="img-fluid rounded z-depth-1" caption="Tables 4–5: 위쪽의 DRACO Hermes MoA·Sakana 비교와 아래쪽의 Brave 검색 조건. 평균 점수·과제당 비용(USD), token 수(천 개), 시간(초), coverage." zoomable=true %}

기본 검색 조건의 Hermes MoA는 59.55점·0.4460 USD이고 제안 구성은 60.82점·0.3766 USD다. 이 비교는 평가한 Hermes preset보다 나은 품질·비용 운영점의 사례다. Mixture-of-Agents라는 접근 전체를 이겼다는 뜻은 아니다. Aggregator가 실제 tool call을 수행하는 방식과 proposer·aggregator의 선택 자체가 서로 다른 시스템 설정이다.

검색 provider를 Brave로 바꾼 별도 실험에서는 앙상블이 64.09점·0.1218 USD, Fable이 62.06점·1.3241 USD다. 약 90.8%의 비용 절감이지만 Fable은 safety filtering으로 7개 과제를 완료하지 못해 93개 완료 과제의 평균을 사용한다. 앙상블은 100개다. p50/p95도 앙상블 656.8/2,096.0초, Fable 126.5/206.3초로 차이가 크다.

따라서 DuckDuckGo의 60.82와 Brave의 64.09를 나란히 놓고 router 하나만 바꿔 얻은 개선으로 설명할 수 없다. 검색 결과와 provider별 실행 조건이 함께 바뀌었다. 논문의 Figure 3은 여러 운영점을 요약하지만, 구체적인 절감률과 비교 조건은 각 원래 결과표를 기준으로 확인하는 편이 명확하다.

### PinchBench ensemble의 제한적인 이득

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab6-pinch-ensemble.png" class="img-fluid rounded z-depth-1" caption="Table 6: PinchBench ensemble의 0–1 정규화 점수, 과제당 비용(USD), 입출력 token 수(천 개), p50/p95 시간(초)." zoomable=true %}

Table 6은 Table 1과 달리 점수를 0–1로 표시한다. Opus는 0.9433점·0.1649 USD, 앙상블은 0.9431점·0.1349 USD다. 표시된 값의 차이는 0.0002이고 비용은 약 18.2% 줄었다. 논문 본문에는 점수 차이를 0.0003으로 적지만, 여기서는 반올림되어 공개된 표의 값을 기준으로 비교한다. 이 차이를 유의미한 품질 우열로 볼 근거는 제시되지 않는다.

대신 p50은 23.1초에서 96.0초, token 수는 97.7K에서 272.4K로 증가한다. GPT-5.5의 0.9373점·0.0963 USD와 비교하면 앙상블의 점수는 높지만 비용과 시간이 더 든다. 이미 강한 단일 모델이 높은 점수를 얻는 짧은 과제에서는 앙상블이 자동으로 최선의 선택이 되지 않는다는 결과다.

## 결과 분석 / Ablation

### Runtime proposer 선택과 diversity 가중치

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab7-routed-ensemble.png" class="img-fluid rounded z-depth-1" caption="Table 7: DuckDuckGo DRACO에서 실행 시점에 proposer 집합을 구성하는 세 routing policy. GLM 5.2 aggregator 고정, judged task 기준 비용·token 평균과 coverage." zoomable=true %}

Table 7은 미리 선정한 proposer 구성에서 한 걸음 더 나아간 실험이다. Aggregator를 GLM 5.2로 고정하고 router가 실행 시점에 proposer 집합을 구성한다. Control은 59.18점·0.3249 USD, diversity-heavy는 60.31점·0.3172 USD, quality-heavy는 59.93점·0.2582 USD다. Diversity-heavy는 상호보완성 가중치를 키우고, quality-heavy는 예상 모델 품질에 더 무게를 둔다.

Diversity-heavy의 점수가 control보다 1.13점 높으면서 비용은 조금 낮다는 사실은, 개별 성능뿐 아니라 조합의 상호보완성을 고려할 이유를 보여 준다. 하지만 coverage는 각각 99/100과 100/100이며 반복 실행의 분산이나 유의성은 보고되지 않는다. 특정 계수 하나의 보편적인 효과를 확정하는 결과보다는, 정책의 다른 운영점이 실제로 가능하다는 근거로 읽는 편이 타당하다.

Quality-heavy가 오히려 가장 저렴한 결과를 얻었다는 점도 이름만으로 비용을 예측해서는 안 된다는 예다. 목적함수의 가중치와 전체 trajectory의 실제 청구액 사이에는 생성 길이, 모델 구성, 복구가 개입한다. Diversity-heavy는 고정 구성의 60.82점보다 낮은 60.31점이지만 비용은 약 15.8% 낮다. 다만 p50 837.1초이므로 고정 구성의 535.5초보다 빠른 운영점이라고 말할 수는 없다.

### 부록 사례의 근거 수집과 선택 조건

Singleton 부록은 CNC 장비 선정, 코드 완성 인터페이스, Mumbai podcast studio 조달을 다룬다. 공통적으로 강한 baseline이 live search의 공백을 보고하고, 선택된 DeepSeek V4 Pro는 요구 항목을 더 충실히 채운 결과를 제시한다. 예를 들어 CNC 사례는 52.42→65.90점, 0.1663→0.1122 USD다. 이런 사례는 평균 모델 순위와 특정 과제의 적합성이 다를 수 있음을 보여 준다.

앙상블 부록은 재무 수치 추출, 국가별 checkout 복구 UX, 커피 농가의 traceability 시스템을 다룬다. 필요한 분모·분자를 확보하거나 서로 다른 시스템의 역할을 구분한 출력이 높은 점수를 받는다. 다만 이 세 사례는 두 strong singleton이 모두 60점 미만이고 ensemble 중 하나가 70점 초과인 조건으로 골랐다. 성공 패턴의 설명에는 유용하지만, 무작위 표본의 평균적인 개선을 나타내지는 않는다.

또한 더 상세한 보고서가 언제나 더 사실적이라는 뜻은 아니다. 부록의 점수와 excerpt는 저자가 제시한 평가 증거이며, 리뷰에서 해당 조달·재무·법률 관련 내용의 현재 정확성을 독립적으로 확인한 것은 아니다. 여기서 살펴볼 것은 추천 내용 자체보다, 검색 실패와 요구 사항 누락이 최종 점수에 연결되는 실행 메커니즘이다.

## 한계와 비판적 평가

### Aggregate 성능과 단계별 인과의 간격

실험은 배포한 정책의 최종 점수와 비용을 보여 주지만, context 신호·verifier 신호·복구 이력을 각각 제거한 비교는 충분하지 않다. Task마다 한 번 선택하는 router와 매 단계 선택하는 router를 같은 pool과 하네스에서 엄밀히 비교한 결과도 더 필요하다. 저자가 설명하는 단계별 상태의 중요성은 설득력 있는 설계 근거지만, 각 구성 요소의 기여가 모두 실증적으로 분해된 것은 아니다.

여러 세대의 router와 specialist가 서로를 개선한다는 flywheel에도 같은 구분이 적용된다. 현재 정책이 싸게 실행된다는 사실은 다음 세대의 학습에 유용한 데이터를 더 모을 여지를 만든다. 그러나 그 데이터로 학습한 specialist를 다시 pool에 넣었을 때 얼마나 개선되는지, 다른 하네스에서도 이득이 유지되는지는 이 보고서의 결과표로 확인할 수 없다.

### Coverage·지연 시간·비용 회계의 조건

DRACO의 일부 strong baseline은 모든 과제를 완료하지 않았다. 미완료 과제 처리와 공통 과제 부분집합의 짝지어진 비교가 없으면 평균 점수 차이에는 난도 구성 차이가 섞일 수 있다. 또한 매우 작은 점수 차이를 해석할 때에는 여러 seed나 반복 실행의 변동성을 알아야 한다. 현재 표는 유용한 운영 사례지만 통계적인 동등성 검정은 아니다.

실제 제품에서는 p95 지연 시간과 timeout도 품질의 일부다. 값싼 token을 많이 쓰는 전략이 비동기 조사에는 적합해도 실시간 상호작용에는 맞지 않을 수 있다. 보고된 청구 비용 역시 해당 provider와 실행 시점의 조건에 의존하므로, 가격이 바뀌거나 검색·검증·라우터 운영 비용을 다른 방식으로 계산하면 경제성이 달라진다. 논문의 USD 값을 현재 서비스 견적처럼 사용해서는 안 된다.

### Environment label의 신뢰성과 관측 범위

Router의 행동을 정답으로 복제하지 않는 설계는 중요하지만, 환경이 제공한 label이라고 해서 모두 완벽한 ground truth는 아니다. 테스트가 요구 사항을 빠뜨릴 수 있고, LLM judge가 장황함이나 그럴듯한 인용에 영향을 받을 수 있다. 검증 오류가 반복되면 outcome 기반 학습도 그 오류를 강화할 수 있다. 논문이 여러 검증 신호와 고위험 영역의 audit을 강조하는 이유다.

반사실적 coverage도 별도의 비용을 요구한다. 선택 확률을 기록하고 보정하더라도 어떤 모델이 특정 상태에서 전혀 실행되지 않았다면 그 결과를 로그만으로 알아낼 수 없다. 대안 실행과 replay가 필요하며, 그 탐색 비용까지 포함해 flywheel의 순이득을 평가해야 한다. 공개 seed가 있다고 축적된 arena corpus와 후속 고성능 정책까지 그대로 재현할 수 있는 것도 아니다.

## 시사점 / Takeaways

- 모델 선택의 기준은 원래 질문의 주제뿐 아니라 현재 실패 상태와 복구 가능성이다. 에이전트 운영에서는 모델별 평균 benchmark 점수만으로 호출을 배정하기 어렵다.
- Router의 핵심 산출물은 모델 이름 하나에 그치지 않는다. 선택 당시의 후보·예측과 이후의 성과·복구 비용을 분리해 남긴 기록이 다음 개선의 근거가 된다.
- Ensemble은 더 많은 token으로 더 낮은 청구 비용을 만들 수 있다. 동시에 기다리는 시간은 늘 수 있으므로 품질·돈·시간을 별도로 비교해야 한다.
- 실험을 읽을 때 같은 하네스, 검색 provider, 과제 coverage, 점수 scale인지 먼저 확인해야 한다. 고정 proposer 구성의 결과와 동적 선택의 결과도 구분해야 한다.
- Data flywheel은 운영 로그가 자동으로 좋은 학습 데이터가 된다는 약속이 아니다. 검증 품질, 대안 행동의 관측, 선택 편향 보정이 갖추어져야 다음 정책의 개선을 판단할 수 있다.

## 설치 및 사용법

현재 [공식 README](https://github.com/TokenRhythm/opensquilla#quick-terminal-install)는 release wheel을 사용하는 설치 경로를 안내한다. 2026-09-30 확인 기준 예시는 다음과 같다. `recommended` extra에는 LightGBM과 ONNX Runtime 등 SquillaRouter 실행 의존성이 포함되며, 패키지는 Python 3.12 이상을 요구한다.

```bash
uv tool install --python 3.12 \
  "opensquilla[recommended] @ https://github.com/TokenRhythm/opensquilla/releases/download/v0.5.5/opensquilla-0.5.5-py3-none-any.whl"
opensquilla onboard
opensquilla gateway run
```

Onboarding에서 사용할 provider와 인증 정보를 설정한다. macOS에서는 router의 native library에 `libomp`가 필요한 경우도 있으므로 공식 troubleshooting을 함께 확인하는 편이 좋다. 위 예시는 현재 공개 제품의 시작 경로이며 논문의 모든 실험 설정을 재현하는 명령은 아니다. 이 리뷰에서는 README와 dependency manifest를 대조했으며, 실제 설치나 유료 API 실행은 수행하지 않았다.

## 참고 자료

- [Agentic Routing: The Harness-Native Data Flywheel](https://arxiv.org/abs/2607.11399): 리뷰의 기준인 arXiv v1 본문과 부록. 그림·표의 출처는 Liu et al.과 TokenRhythm Technologies.
- [OpenSquilla 공식 저장소](https://github.com/TokenRhythm/opensquilla): 공개 코드와 설치 문서. 현재 README의 benchmark 결과와 논문 v1 결과를 구분해 사용.
- [arXiv 배포 라이선스](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html): 논문에는 arXiv non-exclusive distribution license가 표시되어 있으며, 코드의 Apache-2.0 라이선스와 별개.

## 더 읽어보기

- **[FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance](https://arxiv.org/abs/2305.05176)** (Chen et al., 2023): 여러 모델을 cascade로 연결하는 비용·품질 최적화의 출발점.
- **[RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665)** (Ong et al., 2024): Preference data로 강한 모델과 약한 모델 사이의 선택을 학습하는 접근.
- **[Mixture-of-Agents Enhances Large Language Model Capabilities](https://arxiv.org/abs/2406.04692)** (Wang et al., 2024): 여러 LLM의 출력을 계층적으로 결합하는 모델 수준 ensemble.
- **[Doubly Robust Policy Evaluation and Learning](https://arxiv.org/abs/1103.4601)** (Dudik et al., ICML 2011): 과거 정책이 만든 편향된 로그로 새로운 정책을 평가하는 통계적 기반.

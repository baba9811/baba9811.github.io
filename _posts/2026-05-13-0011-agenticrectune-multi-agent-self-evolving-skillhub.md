---
layout: post
title: "[논문 리뷰] AgenticRecTune: Multi-Agent with Self-Evolving Skillhub for Recommendation System Optimization"
date: 2026-05-13 10:00:00 +0900
description: "Google Discover 의 pre-ranking · ranking · re-ranking 세 단계 시스템 구성 (fusion weight, demotion weight, diversity threshold 등) 을 사람이 더 이상 튜닝하지 않도록, Actor · Critic · Insight · Skill · Online 다섯 에이전트가 라이브 A/B 결과를 메모리·스킬허브로 되먹임하며 자기진화하는 LLM 에이전트 프레임워크. Engagement 와 Diversity 를 동시에 끌어올린 산업 적용 사례."
tags: [recommendation-system, llm-agent, multi-agent, hyperparameter-optimization, ab-testing]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/fig1-workflow.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/
en_url: /en/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Xidong Wu et al. (10명 공동 저자, Google) |
| 학회 | arXiv preprint · 2026 (cs.IR, 2026-04-21 v1) |
| arXiv | [2604.26969](https://arxiv.org/abs/2604.26969) |
| 데이터 | Google Discover 의 라이브 A/B 트래픽 (pre-ranking · ranking · re-ranking 세 단계) |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-05-13 |

## TL;DR

- Google Discover 의 다단계 추천 시스템 (pre-ranking → ranking → re-ranking) 에서 *모델 자체* 가 아닌 **system-level 구성 파라미터** — fusion weight, demotion weight, diversity threshold 같은 — 의 튜닝을 사람이 더 이상 손대지 않게 자동화한 LLM 멀티에이전트 프레임워크 **AgenticRecTune**. Gemini 3 Pro 를 백본으로 한 다섯 에이전트 (Actor, Critic, Insight, Skill, Online) 가 협업한다.
- 핵심 한 줄: Actor 가 도메인 지식과 Pareto frontier elite 후보를 받아 새 구성을 제안 → Critic 이 포맷·가드레일·과거 실패 사례로 걸러내 → Online 이 라이브 A/B 를 돌려 결과를 수집 → Insight 가 self-/cross-learning 으로 패턴을 추출 → Skill 이 그 패턴을 스킬허브의 `Domain Knowledge` 슬롯에 누적하며 *다음 라운드의 prompt 가 점점 더 똑똑해진다*.
- Online A/B 결과로 세 단계 모두에서 engagement·diversity 가 동시에 올라간다. 가장 인상적인 건 re-ranking 의 Diversity 태스크에서 **Diversity Metric +3.43%**, pre-ranking 의 Value-Based Retrieval 에서 **Engagement Metric 1 +0.75% / 2 +0.90%** 동시 개선 — north star metric 을 직접 최대화하는 *online-in-the-loop* 방식이 offline proxy 기반 튜닝보다 결정적으로 더 잘 정렬된다.
- Ablation 한 컷: **Actor-Critic 이 single-agent 대비 engagement 를 2배 이상 끌어올린다** (Value-Based Retrieval 에서 0.75% vs 0.29%, 0.90% vs 0.26%). Critic 의 역할은 단순 검수가 아니라 *Actor 의 hallucinated 후보를 사전에 잘라내는 필터링* — single-agent 가 만든 후보의 절반 가까이는 production 에 올릴 수 없는 형식·범위 위반이다. 백본 모델 측면에서는 Gemini 3 Pro 가 diversity 태스크에서 +3.43% 로 3 Flash (+1.69%) · 1.5 Pro (+2.11%) 를 모두 앞서, "추론 깊이가 부족하면 high-dimensional 검색 공간을 못 누빈다" 는 직관을 뒷받침.
- 한계는 명확하다. 코드 미공개, 비교군은 Google 의 production tuning 한 종류뿐, ablation 은 diversity 한 태스크에서만, "Engagement Metric 1/2" 의 정의 비공개, 통계적 유의성은 본문 한 줄 (p < 0.05) 외 표에 따로 보고되지 않는다. 백본 LLM 도 Gemini 단일 벤더라 GPT / Claude 로의 일반화 주장이 없다. 그럼에도 *서비스급 추천 시스템의 system-level config 튜닝을 LLM 에이전트로 자동화한 첫 산업 보고서* 라는 점에서, 모델보다 *문제 정식화와 메모리 구조* 가 더 큰 가치다.

## 소개 (Introduction)

본 블로그가 직전에 다룬 [paper 0010 AudienceLinkNet](/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/) 은 *Rakuten 70여 개 서비스를 가로지르는 cross-service knowledge graph 위에서 audience expansion 을 푸는* 산업 보고서였다. 그 글의 무게는 모델 기법 (TransE + GCN) 의 새로움보다 *문제 정식화 — KG 한 장으로 lookalike 의 sparse seed 문제를 우회한다* 에 있었다. 오늘 다루는 AgenticRecTune 도 비슷한 구도다. 등장하는 부속품 — Actor-Critic, LLM agent, memory, self-evolving skill — 은 모두 1-2년 전 ML / NLP 학회에서 형태를 잡은 패러다임이지만, 이걸 *Google Discover 급 라이브 추천 시스템의 다단계 config 튜닝* 에 한 장의 closed-loop 로 묶은 첫 *서비스 적용 사례 보고서* 라는 데서 가치가 나온다.

산업급 추천 시스템 (industrial-scale recommender) 의 표준 구조는 보통 **retrieval → pre-ranking → ranking → re-ranking** 의 다단계 파이프라인이다. retrieval 이 수억 후보에서 수천을 거르고, pre-ranking 이 가벼운 모델로 다시 수백 ∼ 수천으로 압축, ranking 이 복잡한 multi-task 분류로 정밀 점수화, 마지막 re-ranking 이 list-wise diversity·비즈니스 룰·필터를 적용한다. 학회 논문이 *각 단계 모델의 새로운 아키텍처* 를 제안할 때 자주 놓치는 것은, 실제 production 의 성능을 결정하는 건 **각 단계 모델의 output 을 어떻게 섞을 것인가** — fusion weight, head weight, dismissal weight, diversity threshold, demotion weight 같은 *system-level 구성* 이다. 모델 head 가 좋아도 fusion weight 가 잘못 잡히면 online north star metric 은 떨어지고, fusion weight 가 잘 잡히면 평범한 모델 head 도 production 에서 빛난다. 그래서 production 추천팀의 작업 시간 중 상당 비중이 모델 학습이 아니라 *system-level config 튜닝* 에 들어간다.

기존 자동화의 한계는 두 갈래다. **Standard AutoML / HPO** (Bayesian optimization, grid search, evolutionary search) 는 수치적으로 잘 작동하지만 *왜 그 구성이 좋은가* 를 설명하지 못하고 production 의 자연어 목표 (e.g., "long-term retention 을 해치지 않고 short-term engagement 를 올려라") 와 직접 정렬되지 않는다. **LLM 기반 HPO** (AgentHPO, ML-Agent 등) 는 자연어 정렬은 좋지만 *small-scale offline benchmark* 에서 실험된 것이라 다단계 라이브 시스템의 *non-differentiable glue* — sorting, top-K, business logic — 위에서는 어떻게 작동할지 검증된 적이 없었다. AgenticRecTune 의 위치는 두 갈래의 합집합이다: LLM 의 추론 능력을 사용하되, *online north star metric 을 직접 최대화하는 closed-loop* 로 묶어 offline proxy 와 online 사이의 alignment gap 을 없앤다.

지금 이 논문을 굳이 읽을 가치가 있는 건 두 가지 때문이다. 첫째, **multi-agent framework 의 역할 분담이 그럴듯하다** — Actor 가 제안만 하고 Critic 이 별도 검증하는 분할은 LLM 의 hallucination 을 *생성과 선택을 분리* 하는 가장 보편적 패턴인데, 그게 실제 라이브 A/B 환경에서 single-agent 대비 engagement 를 2배 이상 끌어올린다는 정량적 증거를 처음으로 보여준다. 둘째, **Insight + Skill Agent 의 self-evolving skillhub 구조** — Insight 가 메모리에서 자기·교차 학습으로 패턴을 추출하고 Skill 이 그걸 Domain Knowledge 슬롯에 누적해 *다음 라운드의 prompt 가 점점 더 똑똑해지는* 메커니즘 — 은 [Agentic Context Engineering (Zhang et al., 2025)](https://arxiv.org/abs/2510.04618) 의 "playbook" 개념과 정확히 같은 방향을 산업 추천 도메인에 적용한 첫 보고서다. ACE 가 일반 LLM agent benchmark (AppWorld, finance reasoning) 에서 +10.6% 같은 수치를 보여준 것을 추천 도메인 north star metric 에 매핑한 셈이다.

## 핵심 기여 (Key Contributions)

저자 측 contribution 과 리뷰어 관점의 의미를 함께 적는다.

- **End-to-end system-level config 최적화의 첫 산업 보고.** Google Discover 의 pre-ranking · ranking · re-ranking 세 단계 *모두* 의 system-level 구성 파라미터를 *동일한 LLM 멀티에이전트 프레임워크 한 장* 으로 자동 튜닝한다. retrieval / ranking 한 단계만 다루던 기존 LLM-recommendation 연구 (RecPrompt, RecMind, InteRecAgent) 와 달리, 다단계 파이프라인의 *glue* 자체를 자동화 대상으로 잡는다.
- **Self-Evolving Skillhub.** Insight Agent 가 매 사이클마다 메모리에서 패턴을 추출해 Skill Agent 의 *Domain Knowledge* 슬롯에 누적하는 구조 (4.4 절). 매번 같은 prompt 에서 출발하지 않고 *지난 라운드의 학습을 다음 라운드 prompt 에 빌트인* 한다. 정적 prompt 가 아닌 *evolving prompt* 라는 점이 핵심 — [ACE (Zhang et al., 2025)](https://arxiv.org/abs/2510.04618) 의 "context as evolving playbook" 과 같은 발상.
- **Actor-Critic 으로 hallucination 필터링.** Actor 가 다수 후보 + 자연어 explanation 을 제안하고, Critic 이 별도 LLM 으로 *format check, alignment with goals, explanation soundness, selection diversity* 의 4가지 룰로 정제 (Figure 3 의 Critic prompt 가 정확히 이 4단계 평가). Single-agent 대비 engagement 가 2배 이상 올라간다는 정량 증거가 Table 3 에 박힌다.
- **Online A/B 직접 사용 (offline proxy 우회).** Online Agent 가 Google 의 production A/B 플랫폼에 직접 코드를 생성·배포·결과 수집까지 한다. CTR 같은 offline label 을 proxy 로 쓰지 않고 *DAU, session time, retention 같은 north star* 를 직접 metric 으로 사용 — *proxy-online alignment gap* 자체를 우회한다.
- **(리뷰어 관점) 다섯 에이전트 분업의 *오캄 면도날* 통과.** Actor / Critic / Insight / Skill / Online — 처음 봤을 때 "에이전트 다섯 개는 과한 것 아닌가" 싶지만, 각 에이전트가 *직교적인* 책임 (생성 / 검증 / 패턴추출 / 지식누적 / 실행) 을 갖는다. Skill 과 Insight 를 하나로 묶지 않은 이유도 본문에서 명시 — Insight 는 *pattern extraction* (귀납), Skill 은 *operational synthesis* (도메인 지식으로 변환) — 두 단계를 동일 prompt 에 묶으면 LLM 의 attention 이 흩어진다는 경험적 진단이 깔려 있다.

## 관련 연구 / 배경 지식

본 논문 §2 는 관련 연구를 세 갈래로 깔끔하게 나눈다. 그 분류를 그대로 따라가며 각 갈래에서 직전 SOTA 와 본 논문이 차별화되는 지점을 짚는다.

### LLM 을 추천 모델 / 시뮬레이터 / 인터랙티브 에이전트로

가장 직관적 사용은 *LLM 자체를 추천기로* 만드는 것이다. P5 (Geng et al., 2022) 가 추천 태스크들을 모두 text-to-text 로 통일하는 unified paradigm 을 깔았고, RecPrompt (Liu et al., 2024) 가 뉴스 추천에서 prompt engineering 을 자동화했다. STARec (Wu et al., 2025) 은 "Fast/Slow" 인지를 흉내내 사용자 선호 reasoning 을 처리했고, MemRec (Chen et al., 2026) 은 user-item co-engagement 의 collaborative memory 를 lightweight LM 으로 따로 관리하는 *memory-augmented* 아키텍처를 제안. InteRecAgent (Huang et al., 2024) 와 RecMind (Wang et al., 2024) 는 사용자와 직접 대화하며 발견을 돕는 대화형 에이전트 방향. 이 갈래의 공통점은 *LLM 이 추천 결과 자체를 만든다* 는 것 — 본 논문은 정반대로 *LLM 이 추천 시스템의 구성을 튜닝* 한다.

### 자율 ML 엔지니어링과 HPO

기계학습 엔지니어 (MLE) 의 역할을 LLM 에이전트가 대신하려는 시도. AI Scientist (Lu et al., 2024) 와 PACEvolve (Yan et al., 2026) 가 연구 가설 생성·반복 코딩을 자동화했고, AgentHPO (Liu et al., 2024) 는 [Creator-Executor 구조의 LLM hyperparameter 최적화](https://arxiv.org/abs/2402.01881) 를 제안해 12 개 ML 태스크에서 *human best trial 을 매치하거나 능가* 함을 보였다. autoresearch (Ferreira et al., 2026) 는 LLM 과 classical HPO 의 hybrid 가 더 우수함을 정량적으로 보였고, ML-Agent (Liu et al., 2025) 는 강화학습으로 ML 엔지니어링 작업을 가르쳤다. Eureka (Ma et al., 2023) 는 reward design 자체를 LLM 으로 자동화. [ACE (Zhang et al., 2025)](https://arxiv.org/abs/2510.04618) 는 context 를 "evolving playbook" 으로 보고 누적·반영·큐레이션을 분리해 +10.6% (agent benchmark), +8.6% (finance) 의 개선을 보였다. 본 논문은 이 갈래의 *직접 후예* — 다만 *offline reward 가 명시되어 있는 문제* (e.g., loss, accuracy) 가 아닌 *non-differentiable production pipeline* 에서, *수치 reward 가 아닌 north star A/B metric* 으로 푼다는 점이 차별화된다.

### System-level orchestration 과 online metric 직접 최적화

추천 시스템 자체의 자동 최적화. AgenticTagger (Xie et al., 2026) 는 [LLM 으로 item representation 을 위한 vocabulary 를 multi-agent reflection 으로 정제](https://arxiv.org/abs/2602.05945) 해 retrieval / ranking / re-ranking 전반에 사용. Self-EvolveRec (Kim et al., 2026) 은 [LLM 의 directional feedback 로 추천 모델의 *소스 코드* 를 자기진화](https://arxiv.org/abs/2602.12612) 시키는 NAS 변종. Wang et al. (2026) 의 self-evolving system 은 YouTube 의 신경망 아키텍처와 손실함수를 다시 쓰는 MLE 흉내. DualAgent-Rec (Zhang et al., 2025) 은 single epoch 안에서 exploitation 과 exploration 의 균형을 LLM coordinator 로 잡는다. 본 논문이 이 갈래에서 갖는 차별점은 명확하다 — **다른 모든 작업은 "코드를 다시 쓰거나 모델 구조를 바꾸는" model editing 인 반면, AgenticRecTune 은 *system-level orchestration* — 모델은 그대로 두고 모델 head 들 사이의 *fusion weight, threshold, demotion* 같은 system-level 잉크 자국을 다시 칠한다.** 그래서 모델 deploy 비용 없이 (재학습 없이) production 에 적용 가능하다는 industrial advantage 가 직접적으로 따라온다.

## 방법 / 아키텍처 상세

본 논문의 워크플로우 한 장이 모든 것을 압축한다. Figure 1 을 먼저 보자.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/fig1-workflow.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: AgenticRecTune 의 closed-loop. Skill hub 와 Agent Memory 가 중앙 storage, 그 좌측에서 Actor·Critic 이 reasoning loop 를 돌리고 (Read), 우측에서 Online Agent 가 라이브 A/B 를 실행하고 (Write), 아래쪽에서 Skill·Insight 가 결과를 누적 (Update)."
   zoomable=true %}

좌측의 *reasoning loop* — Actor / Critic — 가 skillhub 의 도메인 지식과 agent memory 의 elite 후보를 *읽어* 새 config 후보를 만든다. 우측의 *online experiment loop* — Online Agent — 가 만들어진 후보를 라이브 A/B 트래픽에 *써* 결과를 수집한다. 아래쪽의 *self-evolution loop* — Insight / Skill — 가 메모리에 누적된 결과에서 패턴을 추출하고 그 패턴을 다시 스킬허브의 도메인 지식으로 *업데이트* 한다. 세 loop 가 동시에 돈다.

### 문제 정식화 — Multi-Level Compositional Optimization

본 논문 §3 의 formulation 은 깔끔하다. 추천 시스템의 각 단계는 그 단계의 모델 weight $\mathbf{w}$ 와 *system-level config* $\theta$ 를 갖는다. pre-ranking·ranking·re-ranking 세 단계의 함수와 구성을 다음처럼 둔다.

$$
f_{\text{pre}}(x; \mathbf{w}_{\text{pre}}, \theta_{\text{pre}}), \quad
f_{\text{rank}}(C_1; \mathbf{w}_{\text{rank}}, \theta_{\text{rank}}), \quad
f_{\text{re}}(C_2; \mathbf{w}_{\text{re}}, \theta_{\text{re}})
$$

여기서 $C\_1, C\_2$ 는 직전 단계의 출력 (압축된 후보 집합). $\theta\_{\text{pre}}$ 의 예는 *CTR head weight, dismiss rate weight*, $\theta\_{\text{rank}}$ 는 *CTR weight, heart rate*, $\theta\_{\text{re}}$ 는 *demotion weight, diversity threshold*. 전체 파이프라인은 합성 함수

$$
\mathcal{F} = f_{\text{re}}\bigl( f_{\text{rank}}\bigl( f_{\text{pre}}(x; \mathbf{w}_{\text{pre}}, \theta_{\text{pre}}); x; \mathbf{w}_{\text{rank}}, \theta_{\text{rank}} \bigr); x; \mathbf{w}_{\text{re}}, \theta_{\text{re}} \bigr)
$$

이고 전체 구성 벡터는 $\Theta = [\theta\_{\text{pre}}, \theta\_{\text{rank}}, \theta\_{\text{re}}] \in \mathcal{P}$. 사용자의 실제 implicit/explicit 행동을 $y\_{\text{true}}$ 라 하면 시스템 출력에 대해 평가된 metric vector $M(\mathcal{F}, y\_{\text{true}}) = [M\_1, \ldots, M\_J]$ 가 정의되고, 본 논문은 north star metric $\\{M\_1, \ldots, M\_n\\}$ 의 합을 *primary objective*, 나머지 $\\{M\_{n+1}, \ldots, M\_J\\}$ 를 *guardrail constraint* 로 두는 multi-objective formulation 을 채택한다.

$$
U(M) = \sum_{i=1}^{n} M_i(\mathcal{F}, y_{\text{true}})
\quad \text{s.t.} \quad
M_j(\mathcal{F}, y_{\text{true}}) \ge b_j \quad \forall j \in \\{n+1, \ldots, J\\}
$$

여기서 $b\_j$ 는 secondary metric $M\_j$ 가 떨어지면 안 되는 lower bound 다 (예: "diversity 를 올리되 retention 은 baseline 이하로 떨어지면 안 됨"). 최종 최적화 문제는

$$
\Theta^{*} = \arg\max_{\Theta \in \mathcal{P}} \mathbb{E}\_{(x, y\_{\text{true}}) \sim \mathcal{D}} \bigl[ U\bigl(M(\mathcal{F}(x; \mathbf{w}, \Theta), y\_{\text{true}})\bigr) \bigr] \quad \text{s.t.} \quad \mathbb{E}\_{x \sim \mathcal{D}} [C(\Theta)] \le C_{\max}
$$

이때 $C(\Theta)$ 는 시스템 비용 (latency, infra cost 등). 이 문제가 어려운 두 가지 이유를 본 논문은 §4 첫머리에 명시한다. (i) **Non-differentiable** — sorting, top-K, business logic 같은 비미분 연산이 들어 있어 gradient 가 안 통한다. (ii) **Multi-metric** — primary 와 guardrail 의 trade-off 가 본질적이다. 그래서 *gradient 가 아닌 reasoning* 으로 푸는 LLM-agent 방향이 자연스러워진다.

### 4.1 Reasoning Loop: Actor + Critic

Reasoning loop 는 두 단계로 나뉜다.

#### 4.1.1 Task Prompt Construction & 4.1.2 Actor 의 후보 제안

Actor Agent 는 매 사이클 시작에 *task context, constraints, domain knowledge from skillhub, elite candidates from Agent Memory* 를 합쳐 고도로 구조화된 reasoning prompt 를 만든다. 그 안에는

- **What is the optimization task** (예: "Value-Based Ranking 의 utility curve 구성")
- **Parameters description** — 각 파라미터의 의미와 허용 범위
- **Task requirement** — quality 와 engagement 의 trade-off 어떻게 다룰지
- **North star metric** — DAU 는 neutral-to-positive, Impressions 는 ...
- **Domain knowledge** — "DAU 가 음수면 ...", "Impressions 가 음수면 ..."
- **Elite configurations (Pareto frontier)** — 지금까지의 best 후보 elites_str
- **Initial configuration parameters** — 현재 baseline 에서 출발

이 prompt 의 형식이 Figure 2 (좌측) 에 그대로 박혀 있다. Actor 는 이 입력을 받아 *max\_proposals 개* 의 새 config 후보를 제안하며, 각 후보마다 *왜 이 파라미터를 이쪽으로 옮기는가* 의 자연어 설명 (justification) 을 붙인다 — 후속 단계의 해석 가능성을 위해.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/fig2-3-actor-critic-prompts.png"
   class="img-fluid rounded z-depth-1"
   caption="Figures 2 & 3: Actor (좌) 와 Critic (우) 의 prompt 예시. Actor 는 Value-Based Ranking 의 utility curve 를 제안하라는 reasoning 컨텍스트를 받고, Critic 은 (1) Validity (TYPO 없는지), (2) Alignment with Goals, (3) Explanation soundness, (4) Selection diversity, (5) Output format (XML) 의 5단계 룰로 정제한다."
   zoomable=true %}

#### 4.1.3 Critic 의 검증과 정제

Critic Agent 는 *별도 LLM 인스턴스* 로 Actor 의 출력을 받아 다섯 룰로 평가 (Figure 3):

1. **Validity Checks** — 형식·타입 오류, 범위 위반
2. **Alignment with Goals** — Optimization Objectives 와 metric priority 에 부합하는가
3. **Assess Explanation** — Actor 의 justification 이 *logically sound* 하고 *parameter description 으로 plausible* 한가
4. **Selection Criteria** — 다양성을 가진 N 개를 추리되, 서로 너무 비슷한 후보는 배제
5. **Output Format** — `<proposals>...</proposals>` XML, 각 `<proposal>` 안에 `<hypothesis>`, `<config>` 보존, *추가로* `<justification>` 태그를 새로 달아 *왜 이 제안을 선택했는지* 적어달라

여기서 핵심은 5번 — Critic 이 *선택의 justification 까지 별도로 적게 강제* 함으로써 Critic 자신의 reasoning 도 후속 메모리에 남는다. 이게 단순 "format checker" 가 아니라 *meta-reasoner* 로 작동하는 구조적 이유다. Critic 이 끝나면 살아남은 후보를 Agent Memory 에 write 한다.

### 4.2 Online Experiments: 라이브 A/B 의 자동 운영

#### 4.2.1 Experiment Code Generation

Online Agent 는 추상 파라미터값 (예: `ast_vbr = {...}`) 을 *production 에서 돌릴 수 있는 구체 코드 / 스크립트 / config 파일* 로 변환한다. 이 단계가 reasoning loop 와 라이브 시스템을 잇는 *최종 변환* — Reasoning 단계의 모든 추론이 여기서 결국 production deploy 가능한 artifact 로 떨어진다.

#### 4.2.2 A/B Testing Task Generation

자동으로 production A/B 플랫폼에 새 실험을 등록한다. 트래픽 비율, 제어 그룹 (현재 production config) vs treatment group (Agent 가 제안한 후보들) 의 매핑, 통계적 유의성 도달까지의 최소 horizon 을 잡는다. **여기까지 진행한 뒤 온라인 A/B 시작 전에 사람의 review 가 한 번 들어간다** — Google 의 production 에 코드를 던지기 직전 한 단계 명시적 사람 게이트가 있다는 점은 industrial reality 측면에서 정직한 설계다.

#### 4.2.3 Results Collection

실험 종료 후 platform API 로 north star metric (DAU, session time 등) 과 통계적 유의성 결과를 가져와 Agent Memory 의 해당 task item 에 *Write* 한다. 이 데이터가 다음 round 의 prompt 와 skillhub self-evolution 의 ground truth 가 된다.

### 4.3 Agent Memory: 라운드 사이 정보 보존

Memory 는 단순 log 가 아니라 *id name · config string · explanation · proposed time · status · results · evaluation check info* 의 구조화 레코드. Critic 이 write 하고 Online Agent 가 결과를 *update* 하며, 다음 라운드 시작에 Actor 가 *elite task items* 를 read 한다.

- **Memory Pruning & Selection** — Insight Agent 가 정기적으로 redundant 활동 로그를 prune. *strict dominance* — 어떤 후보가 모든 지표에서 다른 후보보다 명백히 우수하면 후자는 archive — 만 유지하는 *Pareto frontier 의 top-performer pool* 을 만든다.
- **Diversity Maximization** — 후보 사이 거리를 표준화 후 greedy selection 으로 *기존 셋과 가장 먼* 후보를 반복 추가. 메모리가 한쪽으로 쏠리는 것을 방지.

### 4.4 Self-Evolving Skill — 본 논문의 진짜 신선함

각 Skill 은 *하나의 최적화 태스크에 대한 플러그인* 으로, 여섯 슬롯을 갖는다.

- **Task Context** — production / 추천 시스템의 어떤 컴포넌트를 최적화하는가
- **Task Requirement** — 허용 search space, 결과 JSON schema, infrastructure 제약
- **North Star Metric** — primary / secondary 와 방향성
- **Initial Configuration Parameters** — 현재 production baseline
- **Domain Knowledge** — task-specific heuristics, 과거 최적화 로그, 전문가 가이드라인
- **Tools** — A/B 플랫폼 deploy, online metric 조회, 통계적 유의성 분석 등 executable function

Static Skill 은 사람이 한 번 정의해 두면 끝이지만, AgenticRecTune 의 Skill 은 두 메커니즘으로 자기진화한다.

#### 4.4.1 Dynamic Knowledge Extraction

Insight Agent 가 메모리에서 *self-/cross-learning* 으로 패턴을 추출 (4.3.4) — 이 두 모드의 분업이 중요하다.

- **Self-Learning**: 같은 태스크의 반복된 trial 로그를 비교해 *어떤 파라미터를 어느 방향으로 옮기면 어느 metric 이 어떻게 움직였는가* 의 sensitivity pattern 을 추출. 예: "diversity penalty 를 공격적으로 올리면 engagement 가 일관되게 떨어진다" 같은 부정 패턴.
- **Cross-Learning**: 여러 태스크의 결과를 *MapReduce* 식으로 parallel 분석 (Map) 후 global synthesis (Reduce) — 태스크가 달라도 공유되는 거시 규칙을 추출.

추출된 패턴은 Skill Agent 가 해당 태스크의 Domain Knowledge 슬롯에 *append* 한다. *동시에 Skill 의 Task Requirement (search space bound) 도 dynamically tighten* — "diversity penalty 가 0.7 이상이면 실패" 가 학습되면 다음 라운드 search space 에서 0.7 이상은 아예 빠진다. 이게 Skill 의 *상한선 학습* 메커니즘이다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/fig4-cross-study.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Cross-study 분석으로 추출된 Primary Curve 별 영향과 Learned Patterns. 예: lvr_curve 는 DAU·Impression·Clickbait 에 가장 강한 lever, ctr_curve 는 'Volume Driver' 로 CTR 을 살리는 핵심, cg_curve (strict) 는 'Safety Regressor' — 너무 빡빡하면 clickbait 는 막지만 DAU 도 같이 떨어진다. 이런 규칙이 Skill 의 Domain Knowledge 에 적재된다."
   zoomable=true %}

#### 4.4.2 Novel Skill Generation

Insight 가 모은 cross-task pattern 으로부터 Skill Agent 가 *완전히 새로운 스킬* 을 합성. 사람이 새 스킬을 작성하는 단계 없이 자동으로 가능. 예를 들면 "*Diversity Maximization Under Engagement Floor*" 같은 새 태스크가 기존 *Diversity* 와 *Engagement Stability* 스킬의 cross-pattern 으로부터 만들어진다.

이 둘이 결합돼 Skill hub 는 *정적 사람-작성 룰의 모음* 이 아닌 *learning engine* 으로 작동한다. 그래서 본 논문이 "Self-Evolving" 이라는 단어를 굳이 표제에 넣는다.

## 학습 목표 / 손실 함수

본 논문은 LLM 을 *추가 학습* 시키지 않는다 — 모두 *prompt 와 in-context 정보로만* 작동한다. 따라서 *gradient-based loss* 는 존재하지 않고, 최적화 대상은 §3 의 multi-level compositional optimization 문제의 utility $U(M)$ 그 자체다.

$$
\Theta^{*} = \arg\max_{\Theta \in \mathcal{P}} \mathbb{E}\_{(x, y\_{\text{true}}) \sim \mathcal{D}} \bigl[ U\bigl(M(\mathcal{F}(x; \mathbf{w}, \Theta), y\_{\text{true}})\bigr) \bigr] \quad \text{s.t.} \quad \mathbb{E}\_{x \sim \mathcal{D}} [C(\Theta)] \le C_{\max}
$$

LLM 이 그래도 *loss-like* 한 신호로 학습하는 지점은 두 군데다. (1) **Critic Agent 가 평가하는 5-rule alignment** — Actor 의 출력이 형식·목표·설명·다양성·포맷의 5축에서 얼마나 정렬되는가 — 가 implicit 한 *cross-rule loss* 역할. (2) **Insight Agent 가 메모리에서 추출하는 sensitivity pattern** — north star metric 변화량과 파라미터 변화량 사이의 부호·크기 관계 — 이 *implicit gradient surrogate* 역할. 이 두 implicit signal 이 다음 라운드 prompt 의 *Domain Knowledge* 슬롯에 누적된다.

## 학습 데이터와 파이프라인

본 논문은 표준적 supervised dataset 을 쓰지 않는다. 데이터는 <em>라이브 A/B 의 결과 자체</em>다. 다만 reproducibility 를 위해 setup 을 간단히 정리.

| 항목 | 값 |
|------|------|
| 적용 시스템 | Google Discover (피드 추천) |
| 단계 | pre-ranking · ranking · re-ranking |
| 백본 LLM | Gemini 3 Pro (default) / Gemini 3 Flash / Gemini 1.5 Pro (ablation) |
| 트래픽 분배 | 사용자 → orthogonal bucket 으로 random partition |
| Control group | 현재 production 의 baseline config |
| Treatment groups | Agent 가 제안한 config 후보들 (max_proposals 변수) |
| 실험 horizon | 표준 launch period 통해 통계적 유의성 도달 (p < 0.05) |
| Primary metric | "Engagement Metric 1", "Engagement Metric 2" (Diversity Metric 도) — 정확 정의는 비공개 |
| 사람 게이트 | A/B 시작 *직전* 한 번의 review |

다섯 에이전트 분업은 *컴퓨팅 자원* 측면에서도 비대칭이다. 본문에는 GPU 사용량이 명시되지 않았지만, Reasoning loop (Actor + Critic) 는 사이클당 *대략 $O(\text{num proposals})$* LLM 호출, Self-evolution loop (Insight + Skill) 는 *cycle 종료 후 한 번씩* 추가 호출, Online Agent 의 code generation 도 *cycle 당 한 번*. Google 의 production 추천 시스템 한 라운드 비용에 비하면 LLM 호출 비용은 무시할 수 있는 수준 — 그래서 ROI 측면에서 명백히 이긴다.

## 실험 결과

### Online A/B Testing: 세 단계 모두에서 양의 lift

본 논문의 메인 결과는 Table 1 한 장이다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/tab1-task-stages.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: 세 단계 task 별 lift. Pre-Ranking 의 Value-Based Retrieval 이 engagement 두 지표에서 가장 큰 효과 (0.75% / 0.90%), Re-Ranking 의 Diversity 가 diversity metric 에서 가장 큰 효과 (3.43%)."
   zoomable=true %}

세 단계 모두에서 production baseline 대비 *positive lift* 를 얻는다. 단계별 해석:

- **Pre-Ranking (Value-Based Retrieval)**: Engagement Metric 1 +0.75%, Engagement Metric 2 +0.90%, Diversity +0.48%. 가벼운 retrieval 모델의 utility curve (multi-head 점수 결합 방식) 를 LLM 이 조정한 결과. *Engagement 가 가장 크게 오른 단계* — 가장 위쪽 funnel 에서 거르는 기준 자체가 후속 ranking·re-ranking 에 누적 영향을 주기 때문일 것.
- **Ranking (Value Fusion)**: Engagement Metric 1 +0.62%, Metric 2 +0.19%, Diversity +0.06%. 복잡한 multi-task ranking 모델의 fusion weight 조정. Engagement 1 은 비교적 크게 올랐지만 Metric 2 와 Diversity 는 작다 — ranking 단계는 search space 가 가장 크고 trade-off 가 가장 첨예해서 한쪽 metric 의 동시 개선이 어렵다.
- **Re-Ranking (Diversity)**: Engagement Metric 1 +0.21%, Metric 2 +0.29%, **Diversity +3.43%**. List-wise diversity threshold·topic balance 의 조정. *Diversity 에서 압도적 개선* 이 본 논문의 가장 극적인 결과 — Re-ranking 단계는 list-wise rule 이라 한 차원에 집중하면 다른 metric 을 크게 안 해치고 끌어올릴 수 있음을 보여준다.

전 단계에서 *engagement 와 diversity 가 동시에 양수* 라는 점이 가장 중요하다. 일반적으로 diversity penalty 를 올리면 engagement 가 떨어지고, engagement 를 강화하면 diversity 가 무너진다 — 그 trade-off frontier 자체를 LLM 이 *위로 밀어 올렸다* 는 의미다.

### 결과 분석 — 왜 통하는가?

본문 §5.2 의 단계별 해석을 정리하면.

- **Pre-Ranking**: Production engineer 가 *놓치고 있던 high-dimensional 파라미터 interaction* 을 LLM 이 발견. multi-head retrieval 모델의 weight 들 사이 미묘한 trade-off — 단순한 grid search 로는 잘 안 잡히는 *sensitive parameter coupling* — 을 Insight Agent 가 누적된 메모리에서 surfacing 한다. 본문에서는 "Identifying impactful parameter interactions that engineers had previously missed" 라고 직접 보고한다.
- **Ranking**: 가장 어려운 단계. value fusion stage 의 다중 점수를 가중합으로 결합하는데, 각 sub-model 의 score scale 이 다르고 sensitivity 도 다르다. LLM 의 reasoning 이 grid search 보다 더 효율적으로 high-dim 가중치 공간을 누빈다.
- **Re-Ranking**: 가장 큰 효과. List-wise property — topic diversity, content fatigue mitigation, business rule — 의 calibration 이 list-wise 라 search space 의 *비선형성* 이 가장 크다. AgenticRecTune 의 iterative feedback loop 가 단기 engagement 손실 없이 diversity 만 올리는 *specific 조합* 을 발견 — diversity 3.43% 상승에 engagement 도 두 지표 모두 양수.

## 결과 분석 / Ablation

### Model Ablation — Gemini 3 Pro 가 Diversity 에서 압도

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/tab2-model-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 동일 태스크 (Re-Ranking Diversity) 에서 백본 LLM 만 바꿔 보는 ablation. Gemini 3 Pro 의 Diversity Metric +3.43% 가 다른 둘을 크게 앞선다."
   zoomable=true %}

세 백본 모델 비교 (Re-Ranking Diversity 태스크):

- **Gemini 3 Pro**: Engagement 1 0.21%, Engagement 2 0.29%, **Diversity 3.43%** ← 가장 균형
- **Gemini 3 Flash**: Engagement 1 0.08%, Engagement 2 0.07%, Diversity 1.69% ← 컴퓨팅 효율적이지만 모든 지표에서 약함
- **Gemini 1.5 Pro**: Engagement 1 0.22%, Engagement 2 0.27%, Diversity 2.11% ← 앞 두 metric 은 3 Pro 와 비등, Diversity 만 32% 가량 못 미침

해석은 두 가지로 갈린다. (i) Engagement 두 지표는 *Pro 급 모델 사이* 에서 큰 차이가 없다 — 단순 alignment 면 1.5 Pro 도 충분. (ii) Diversity Metric 은 *high-parameter reasoning* 이 결정적 — list-wise diversity threshold 의 미세 조정은 long-context 와 multi-step reasoning 깊이가 필요한 작업이라 3 세대 Pro 의 추론 깊이가 직접 효과를 본다. 본문이 직접 적는 결론도 같다 — "newer Gemini 3 architecture is better suited for the complex reasoning required."

Flash 의 약세는 흥미롭다. Engagement 두 지표에서도 Flash 가 1.5 Pro 대비 절반 수준 (0.08 vs 0.22) 인데, 이건 *short context model 이 메모리·skillhub 의 누적 도메인 지식을 충분히 활용하지 못한다* 는 신호. self-evolving prompt 의 길이가 길어지는 long-horizon 시나리오에서는 context 가 큰 모델이 결정적이다.

### Strategy Ablation — Critic 의 결정적 역할

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/tab3-strategy-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: Actor-Critic vs Single Agent (Value-Based Retrieval 태스크). Engagement 두 지표에서 2배 이상의 차이."
   zoomable=true %}

이 표가 본 논문의 가장 강한 정량 증거다.

- **Actor-Critic Strategy**: Engagement 1 0.75%, Engagement 2 0.90%, Diversity 0.48%
- **Single Agent Strategy**: Engagement 1 0.29%, Engagement 2 0.26%, Diversity 0.06%

Engagement 두 지표 모두 **2.5∼3.5배** 차이. Diversity 도 8배 차이. 본문이 직접 해석하는 메커니즘은 — *Critic 이 Actor 의 hallucinated 후보를 사전에 잘라낸다*. Single-agent 가 만든 후보 중 상당 부분은 *format 위반, 범위 위반, 의미 없는 justification* 을 포함한 *유효하지 않은* 제안이고, 그게 그대로 A/B 에 올라가면 engagement 손실로 이어진다. Critic 의 분리는 단순 quality control 이 아니라 *생성과 선택을 분리* 하는 LLM 의 가장 보편적인 hallucination 완화 패턴 — Actor 가 *exploration* 을, Critic 이 *exploitation 의 안전판* 을 담당.

흥미로운 second-order observation: Engagement 가 2.5∼3.5배 오르는 데 비해 Diversity 는 8배 — Critic 의 효과가 *engagement 보다 diversity 에서 더 결정적* 이다. 이건 *diversity 측 후보가 hallucinated 일 때 더 명확히 production 을 망친다* 는 직관과 일치 — diversity penalty 가 잘못된 범위로 올라가면 list 의 평균 quality 자체가 무너진다.

## 한계와 비판적 평가

### 저자가 인정한 한계

본문 §6 (Conclusion) 의 자기진단은 매우 짧다 — 산업 적용에는 성공했고 multi-shifting 환경에서도 잘 정렬된다는 정도. 명시적 limitation 절은 없다.

### 리뷰어 입장에서 보이는 한계

- **재현 불가능성**. 코드 미공개, "Engagement Metric 1/2" 같은 익명화된 지표 (CTR? Dwell time? Re-visit rate? 알 수 없음), Diversity Metric 의 정의도 비공개. Google Discover 내부 시스템 의존이라 *외부 연구자가 본 논문의 결과를 검증할 길이 없다*. 산업 보고서의 본질적 한계지만 학회 발표라면 어느 정도 anonymized synthetic benchmark 라도 같이 풀었으면 좋았다.
- **단일 벤더 LLM**. 백본은 모두 Gemini 계열 (3 Pro / 3 Flash / 1.5 Pro). GPT-4 / Claude / Llama 로의 generalization 이 검증되지 않았다. Multi-agent framework 가 LLM 이름과 무관하게 일반화될지, 아니면 Gemini 의 특정 instruction-following 특성에 강하게 의존하는지는 미지의 영역.
- **Ablation 범위가 좁다**. Strategy ablation 은 *Value-Based Retrieval* 한 태스크에서만, Model ablation 은 *Re-Ranking Diversity* 한 태스크에서만. 일반화 주장에 비해 ablation 의 task coverage 가 1/3 이다. 세 태스크 × 세 모델 × 두 strategy = 18 칸의 표가 본문에 있었어야 한다.
- **통계적 유의성의 보고 부재**. §5.1 에 "p < 0.05 evaluated" 한 줄이 있지만, Table 1∼3 의 셀별 p-value 나 confidence interval 이 빠져 있다. +0.06% Diversity 같은 작은 lift 가 유의한지 판단할 근거가 부족.
- **비교 baseline 의 부재**. 같은 system-level config 최적화에 대해 *standard Bayesian HPO, evolutionary search, AgentHPO, ACE* 같은 본문 §2 에서 인용한 직접 비교군이 *zero*. "production tuning" 한 종류 vs AgenticRecTune 의 1:1 비교만으로 *LLM-agent 가 standard HPO 보다 우월하다* 를 주장하기는 어렵다. 본 논문은 "기존 자동화는 라이브 A/B 에 안 통한다" 는 *정성적* 주장만 하는데, 라이브 A/B 의 한 buck 에 AgentHPO 를 함께 돌려 비교했어야 한다.
- **Cost 보고의 누락**. LLM 호출 비용·infra cost·총 사이클 시간이 본문 어디에도 나오지 않는다. ROI 주장의 정량 근거 부족.
- **Skill hub 의 long-horizon 안정성**. 본 논문은 *몇 번의 사이클* 결과를 보고하지만, *수개월의 누적 self-evolution* 결과는 보고하지 않는다. ACE 가 지적한 *brevity bias* 와 *context collapse* 가 본 시스템에도 발생할 가능성이 있는데 — long-horizon 에서 skillhub 가 *수렴하는지, 발산하는지, 진동하는지* 의 데이터가 없다.

## 시사점 / Takeaways

- **System-level config 는 model architecture 만큼 중요한 lever 다.** 추천 시스템의 production performance 를 결정하는 건 단지 더 좋은 모델이 아니라 *모델 head 들 사이의 fusion weight, threshold, demotion* 같은 system glue. 학회 논문이 model architecture 에 집중하는 동안 production 의 진짜 lever 는 이쪽에 있다는 점을 데이터로 입증.
- **LLM agent 의 *생성-선택 분리* 는 hallucination 완화의 가장 직접적 패턴.** Actor-Critic 의 engagement 2배 lift 는 *Critic 이 Actor 의 hallucinated proposal 을 사전에 잘라내는* 직접 효과. LLM 으로 production 의사결정을 자동화할 때 *항상* 별도 검증 에이전트를 둬야 한다는 일반 lesson.
- **Self-evolving prompt 는 LLM 의 진짜 fine-tuning 대체재로 작동한다.** Skill hub 의 Domain Knowledge 슬롯이 매 라운드 자동 update 되면서 *다음 라운드 prompt 가 점점 더 똑똑* 해진다. weight 학습 없이도 *in-context learning at the system level* 이 가능. [ACE (Zhang et al., 2025)](https://arxiv.org/abs/2510.04618) 의 evolving playbook 패러다임이 추천 시스템 도메인에서도 성립함을 산업 사례로 확증.
- **Online north star 직접 최적화가 offline proxy 우회의 결정적 lever.** offline CTR-like proxy 가 online DAU·retention 과 어긋나는 *alignment gap* 은 모든 추천 시스템 팀의 고질병. AgenticRecTune 의 가장 큰 정렬 효과는 사실 *online metric 을 reward 로 직접 사용한 것* — proxy 없이 north star 자체를 최적화 대상으로 둔 closed-loop 의 위력.
- **추천 시스템의 자동화는 *모델 자동화* 에서 *시스템 자동화* 로 이동 중.** AutoML / NAS 가 모델 검색을 자동화한 다음 단계는 *모델은 그대로 두고 그 위의 system orchestration 을 자동화* 하는 것. AgenticRecTune 은 그 트렌드의 산업급 첫 보고서. 다음 5년의 추천 시스템 R&D 가 *model 학회 트랙* 에서 *system orchestration 트랙* 으로 무게 중심이 옮겨갈 가능성을 시사.

## 참고 자료

- 논문: [arXiv:2604.26969](https://arxiv.org/abs/2604.26969)
- 적용 시스템: [Google Discover](https://discover.google.com/)
- 관련 패러다임: [Agentic Context Engineering (ACE)](https://arxiv.org/abs/2510.04618) — context as evolving playbook

## 더 읽어보기

- **[Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models](https://arxiv.org/abs/2510.04618)** (Zhang et al., 2025) — context 를 evolving playbook 으로 보고 generation·reflection·curation 을 분리. AgenticRecTune 의 Skill hub 진화 메커니즘과 정확히 같은 발상.
- **[Large Language Model Agent for Hyper-Parameter Optimization (AgentHPO)](https://arxiv.org/abs/2402.01881)** (Liu et al., 2024) — Creator-Executor 두 에이전트로 ML 태스크의 hyperparameter 를 자동 최적화. AgenticRecTune 의 Actor-Critic 의 *single-task offline* 버전.
- **[Self-EvolveRec: Self-Evolving Recommender Systems with LLM-based Directional Feedback](https://arxiv.org/abs/2602.12612)** (Kim et al., 2026) — LLM 의 directional feedback 으로 추천 모델의 *소스 코드* 를 self-evolve. AgenticRecTune 이 *config 만* 건드린다면 이쪽은 *model 자체* 를 건드리는 NAS 변종.
- **[AgenticTagger: Structured Item Representation for Recommendation with LLM Agents](https://arxiv.org/abs/2602.05945)** (Xie et al., 2026) — LLM 으로 item representation 의 vocabulary 를 multi-agent reflection 으로 정제. AgenticRecTune 과 같은 그룹의 자매 작업 (Google · UCSD).
- **[MemRec: Collaborative Memory-Augmented Agentic Recommender System](https://arxiv.org/abs/2601.08816)** (Chen et al., 2026) — user-item co-engagement 의 collaborative memory 를 lightweight LM 으로 따로 관리. AgenticRecTune 이 *system-level config* 의 memory 라면 이쪽은 *user/item* 의 memory.
- **[Graph-Based Audience Expansion Model for Marketing Campaigns](/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/)** (Rahman et al., SIGIR 2024) — 본 블로그 직전 글. Rakuten 의 cross-service KG 기반 lookalike. AgenticRecTune 과 같은 *산업급 추천 시스템 적용* 보고서로 짝지어 읽기 좋다.

---
layout: post
title: "[논문 리뷰] A Survey on Generative Recommendation: Data, Model, and Tasks"
date: 2026-06-04 16:00:00 +0900
description: "추천 시스템을 판별형 점수화에서 생성형 합성으로 재정의하는 흐름을, 데이터·모델·태스크 세 축으로 체계화한 서베이"
tags: [generative-recommendation, large-language-models, diffusion-models, recommender-systems, survey]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig3-taxonomy.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/
en_url: /en/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/
---

{% include lang_toggle.html %}

#### 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Min Hou et al. (저자 9명, 중국 Hefei University of Technology · 싱가포르 National University of Singapore) |
| 학회 | AI Open (Elsevier · KeAi) · 2026 · (open access, CC BY-NC-ND 4.0) |
| arXiv 또는 DOI | [10.1016/j.aiopen.2026.05.002](https://doi.org/10.1016/j.aiopen.2026.05.002) |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-06-04 |

#### TL;DR

- 추천 시스템은 지난 20년간 협업 필터링 → 행렬 분해 → 딥러닝으로 진화해 왔고, 이제 LLM과 확산 모델 (diffusion model) 의 등장으로 추천을 "후보를 점수화해 고르는 판별 문제 (discriminative scoring)" 가 아니라 "결과를 생성하는 문제 (generation task)" 로 재정의하는 **생성형 추천 (generative recommendation)** 패러다임으로 넘어가고 있다.
- 이 서베이는 단순히 논문을 나열하는 대신, 생성 모델이 추천 파이프라인의 어느 단계에 개입하는가를 기준으로 **데이터 (data) · 모델 (model) · 태스크 (task)** 세 축의 통합 프레임워크를 제시한다. 데이터 축에서는 지식 증강과 행위 시뮬레이션, 모델 축에서는 LLM 기반 추천 · 대형 추천 모델 (Large Recommendation Model, LRM) · 확산 기반 추천, 태스크 축에서는 Top-K · 개인화 콘텐츠 생성 · 대화형 · 설명형 · 추론형 추천을 다룬다.
- 저자들은 생성형 추천의 다섯 가지 핵심 이점 (world knowledge · 자연어 이해 · 추론 능력 · scaling law · 창의적 생성) 을 정리하고, 데이터 벤치마크 부재, 편향과 강건성, 배포 효율이라는 세 갈래의 미해결 과제를 비판적으로 짚으며 "지능형 추천 어시스턴트" 로의 로드맵을 그린다.

#### 소개 (Introduction)

추천 시스템 (Recommender System, RS) 은 전자상거래, 소셜 미디어, 교육, 동영상, 음악 등 거의 모든 사용자 중심 서비스의 기반 인프라다. 핵심 문제는 변하지 않았다 — 폭발적으로 늘어나는 콘텐츠 공간에서 사용자를 그가 좋아할 아이템과 연결하는 것. 그러나 이 문제를 푸는 방식은 기술 패러다임의 전환을 따라 계속 바뀌어 왔다. 1990년대 콘텐츠 기반 / 협업 필터링 휴리스틱, 2000년대 Netflix Prize 를 기점으로 한 행렬 분해 (matrix factorization), 2010년대 중반 이후 CNN · RNN · GNN · Transformer 기반 딥러닝이 차례로 SOTA 를 갈아치웠다. 이들은 모두 사용자 $u$ 와 아이템 $i$ 의 표현을 학습해 매칭 점수 $f(u,i)$ 를 계산하는 **판별형 (discriminative)** 관점을 공유한다.

최근 LLM 과 확산 모델이 가져온 변화는 단순한 성능 개선이 아니라 문제 정의 자체의 전환이다. LLM 은 방대한 사전학습 코퍼스에서 얻은 world knowledge, 자연어 이해, 추론, in-context learning 같은 emergent ability 를 갖고 있고, 확산 모델은 노이즈에서 의미 있는 신호를 반복적으로 복원하는 강력한 생성 능력을 갖고 있다. 이 능력들을 추천에 적용하면 추천을 더 이상 "고정된 후보 집합에서 점수가 높은 것을 고르는" 문제가 아니라 "사용자에게 맞는 결과를 직접 생성하는" 문제로 볼 수 있다. 저자들은 이것을 생성형 추천이라 부르고, 이 패러다임이 데이터 희소성과 cold-start, 설명 가능성, 대화형 상호작용 같은 오랜 난제들을 새로운 방식으로 공략한다고 본다.

문제는 이 분야가 너무 빠르게 커지고 있다는 점이다. 이미 여러 서베이가 나왔지만 (Wu et al. 2024, Lin et al. 2025, Zhao et al. 2024, Deldjoo et al. 2024, Li et al. 2023 등) 대부분 2024년 이전 상태에 머물러 있어 2025년 이후 폭발적으로 늘어난 agent 기반 시뮬레이션, SFT 정렬, 대형 추천 모델 (LRM) 같은 최신 흐름을 충분히 담지 못한다. 이 서베이의 차별점은 (1) 더 넓은 패러다임 커버리지, (2) 작업을 단순 분류하는 대신 추천 파이프라인의 운영 단계 (데이터 준비 → 모델 설계 → 태스크 실현) 로 분해하는 **data–model–task 프레임워크**, (3) 태스크 단위 혁신을 별도 섹션으로 깊게 다룬다는 것이다.

#### 핵심 기여 (Key Contributions)

- **생성형 추천의 통합 정의와 3축 프레임워크.** 생성형 추천을 "생성 모델 (LLM, 확산 모델) 이 추천 파이프라인의 어느 단계에 활용되는 모든 접근" 으로 폭넓게 정의하고, 데이터 합성 · 모델 수준 추천 · 태스크 수준 생성이라는 세 패러다임으로 정리한다. 이는 개별 모델을 나열하는 기존 서베이와 달리 "생성 능력이 파이프라인 어디에 끼어드는가" 라는 일관된 렌즈를 제공한다.
- **데이터 축의 재정리.** 단순 분류 대신 Content / Representation / Behavior / Structure 라는 네 종류의 데이터 증강과, agent 기반 행위 시뮬레이션 (상호작용 · 사회적 시뮬레이션), 그리고 multi-domain / multi-task / multi-modal / one-model-for-all 의 데이터 통합으로 세분화한다.
- **모델 축의 깊은 taxonomy.** LLM 기반 추천 (사전학습 LLM · 정렬 · 학습목표/추론), 대형 추천 모델 (LRM) 의 scaling law 와 end-to-end 추천, 확산 기반 추천 (증강 데이터 생성 · 타깃 아이템 생성) 을 정렬 메커니즘과 학습 목표까지 파고든다. 특히 2025년의 핵심 흐름인 HSTU · OneRec 같은 산업용 대형 추천 모델을 정면으로 다룬다.
- **태스크 축의 신규 능력 정리.** Top-K 를 넘어 개인화 콘텐츠 생성, 대화형 추천, 설명형 추천, 추론형 추천 등 생성 모델이 비로소 가능케 한 태스크들을 별도로 다룬다.
- **비판적 로드맵.** 데이터 벤치마크 부재, 편향 (popularity · fairness · position), 강건성 (자연 노이즈 · 악의적 공격), 배포 효율 (학습 · 추론) 을 미해결 과제로 정리하고 향후 방향을 제시한다.

이 서베이의 전체 구조는 Figure 2 의 개요와 Figure 3 의 분류 체계로 한눈에 들어온다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig3-taxonomy.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: 생성형 추천 연구의 분류 체계. 데이터(Sec 3) · 모델(Sec 4) · 태스크(Sec 5) 세 축을 따라 대표 연구들을 배치한다."
   zoomable=true %}

#### 관련 연구 / 배경 지식

생성형 추천을 이해하려면 먼저 판별형과 생성형의 근본적인 차이를 짚어야 한다. 확률론적으로, 판별형 모델은 조건부 확률 $P(y \mid x)$ 를 학습하거나 입력 $x$ 를 출력 $y$ 로 직접 매핑한다. 반면 생성형 모델은 결합 확률 $P(x, y)$ 를 학습한다 — 즉 입력과 라벨이 함께 어떻게 생성되는지를 모델링한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig1-disc-vs-gen.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: 판별형 추천(좌)은 user·item 표현을 학습해 matching function으로 점수를 낸다. 생성형 추천(우)은 사용자 이력을 입력으로 생성 모델(LLM, diffusion)이 추천 결과를 직접 생성한다."
   zoomable=true %}

판별형 추천 모델은 학습 시 임베딩 레이어로 사용자·아이템을 dense vector $\mathbf{e}\_u = \phi\_u(u)$, $\mathbf{e}\_i = \phi\_i(i)$ 로 매핑한 뒤 매칭 점수 $f\_{ui} = \text{Score}(\mathbf{e}\_u, \mathbf{e}\_i)$ 를 계산한다. 대표적인 손실 함수는 다음과 같다.

$$
\begin{aligned}
\mathcal{L}_{\text{rating}} &= \frac{1}{N} \sum_{i=1}^{N} \left( y_{ui} - f(u,i) \right)^2, \\
\mathcal{L}_{\text{point}} &= - \sum_{(u,i) \in D} \left[ y_{ui} \log \sigma(f_{ui}) + (1 - y_{ui}) \log(1 - \sigma(f_{ui})) \right], \\
\mathcal{L}_{\text{pair}} &= - \sum_{(u, i^+, i^-) \in D} \log \sigma(f_{ui^+} - f_{ui^-}).
\end{aligned}
$$

각각 명시적 피드백 (별점) 을 위한 MSE, implicit 피드백을 위한 BCE (pointwise), 그리고 implicit 피드백을 위한 BPR (Bayesian Personalized Ranking, pairwise) 손실이다. 추론 시에는 후보 집합 $I$ 전체에 대해 점수를 계산하고 정렬해 Top-K 를 뽑는다.

$$
\hat{i} = \arg\max_{i \in I} f(u, i), \qquad \text{TopK}_u = \text{Top-K}_{i \in I} f(u, i).
$$

이 구조의 한계는 명확하다. 후보 집합이 고정돼 있어야 하고, 매번 모든 후보를 점수화해야 하며, 표현 학습이 제한된 의미 정보에 의존하고, cold-start 에 취약하며, 추천 이유를 설명하기 어렵다. 생성형 추천은 이 한계들을 정면으로 공략한다.

저자들은 생성형 추천이 판별형을 능가하는 다섯 가지 이점을 정리한다. (1) **World Knowledge Integration** — LLM 이 사전학습으로 흡수한 엔티티·사건·문화적 맥락을 추천에 자연스럽게 끌어온다. (2) **Natural Language Understanding** — "금요일 밤에 편하게 볼 수 있지만 지루하지 않은 것" 같은 자유로운 자연어 요구를 직접 해석한다. (3) **Reasoning Capabilities** — 단순 패턴 매칭을 넘어 "왜 이 아이템을 선호하는가" 의 논리 과정을 모델링한다. (4) **Scaling Law** — 모델·데이터를 키우면 성능이 예측 가능하게 향상된다. (5) **Generative Capabilities for Novel Recommendations** — 기존 후보를 고르는 대신 새 콘텐츠·번들·아이템 설명을 직접 만들어 filter bubble 을 깬다.

다만 저자들은 생성형의 우위가 보편적이지 않다는 점도 분명히 한다. 생성형이 진짜 이득을 주는 조건은 세 가지다 — (1) 데이터 희소·cross-domain 상황 (LLM 의 world knowledge 가 부족한 행동 신호를 보완), (2) 대화형·설명형·콘텐츠 생성처럼 본질적으로 생성적인 태스크, (3) HSTU 처럼 scaling law 가 작동하는 대규모 학습 체제.

#### 방법 / 아키텍처 상세

이제 data–model–task 세 축을 차례로 깊게 들여다본다.

### 데이터 축 (Sec 3): 생성 모델이 데이터를 만든다

전통적 추천이 "주어진 데이터셋" 에 의존했다면, LLM 은 데이터를 능동적으로 **생성 (data generation)** 하고 이질적 데이터를 **통합 (data unification)** 한다.

**데이터 생성 — 지식 증강.** Table 1 은 LLM 기반 데이터 증강을 네 종류로 나눈다. (1) **Content Augmentation** 은 사용자·아이템 프로필을 자연어로 풍부하게 만든다 (ONCE, LLM-Rec, LRD, MSIT, KAR, SINGLE, IRLLRec). 단순 생성을 넘어 SeRALM 은 추천 목표에 맞춰 정렬된 설명을 생성하고, LettinGo 는 생성된 프로필이 추천 성능에 미치는 영향을 DPO 로 최적화하며, TRAWL 은 생성 텍스트를 임베딩으로 인코딩해 어댑터로 추천 공간에 정렬한다. (2) **Representation Augmentation** 은 의미적·태스크 친화적 특징을 자동 구성한다 (DynLLM, GE4Rec, HyperLLM). (3) **Behavior Augmentation** 은 합성 상호작용으로 cold-start·fairness 를 공략한다 — ColdLLM 은 필터와 리파이너의 coupled-funnel 구조로 cold-start 사용자의 상호작용을 시뮬레이션하고, LLM-FairRec 은 fairness-aware 프롬프트로 소수 사용자를 위한 공정한 pseudo-interaction 을 만든다. (4) **Structure Augmentation** 은 그래프·관계 같은 고차원 구조를 유도한다 (SBR, LLMRec, CORONA, LLM-KERec, TCR-QF, COSMO).

**데이터 생성 — agent 기반 행위 시뮬레이션.** LLM agent 의 세 가지 능력 (환경 인지, 보상과 태스크를 연결하는 추론, 인간 같은 언어 생성) 을 활용해 사용자 행동을 시뮬레이션한다. Figure 4 가 이 전체 그림을 요약한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig4-data-generation.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: LLM 기반 데이터 생성. 왼쪽은 open-world knowledge를 활용한 content/representation/behavior/structure 증강, 오른쪽은 agent 기반 상호작용·사회적 시뮬레이션."
   zoomable=true %}

상호작용 시뮬레이션에서 Agent4Rec 은 factual·emotional memory 를 갖춘 사용자 agent 로 인과적 행동 분석을 가능케 하고, AgentCF 는 사용자와 아이템 agent 를 동시에 시뮬레이션해 협업 필터링 개념을 모델링한다. STEAM 은 구조화·진화하는 agent memory 로 다면적 선호의 변화를 추적한다. 사회적 시뮬레이션에서 GGBond 는 인지 agent 와 동적 사회 동학을 결합해 관심 유사도·성격 호환성에 기반한 사회적 유대의 진화를 모델링한다.

**데이터 통합.** LLM 은 이질적 데이터를 공유 의미 공간으로 인코딩해 네 가지 통합을 가능케 한다. (1) **Multi-Domain** — DM-CDR (확산 기반 preference encoder), LLM4CDSR, LLMCDSR, LLM-RecG (zero-shot CDSR). (2) **Multi-Task** — P5 가 추천 태스크를 text-to-text 로 통합한 선구자, GPSD 는 생성형 사전학습과 판별형 fine-tuning 을 결합, ARTS, EcomScriptBench. (3) **Multi-Modal** — UniMP, MQL4GRec, LLaRA, PAD (3단계 pretrain-align-disentangle), MSRBench, MLLM-MSR. (4) **One Model for All** — P5, M6-Rec (고정 후보 집합 제거), UniTRec, CLLM4Rec. 최근에는 model merging 관점이 등장해 RecCocktail 은 재사용 가능한 "base spirit" LoRA 에 도메인별 "ingredient" LoRA 를 합치고, WeaveRec 은 multi-domain 순차 추천으로 확장한다.

### 모델 축 (Sec 4): 생성 모델이 추천 엔진이 된다

**LLM 기반 추천 — 사전학습 LLM.** 프롬프트 설계와 in-context learning 에 의존하는 zero/few-shot 활용이다. LLM-as-Enhancer (사용자·아이템 프로필을 자연어로 재작성해 협업 필터링·순차 모델에 주입) 와 LLM-as-Recommender (Chat-REC 처럼 프롬프트만으로 직접 추천 생성) 의 두 갈래로 나뉜다.

**LLM 기반 추천 — 정렬 (alignment).** 사전학습 LLM 은 click/engagement 신호, Top-K 순위, long-tail, exposure bias 를 무시하므로, 추천 데이터로 fine-tuning 해 정렬한다. Figure 6 은 사용자·아이템 프로필을 LLM 에 주입하는 네 가지 방식을 보여준다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig6-aligning-llms.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: 추천을 위한 LLM 정렬의 네 패러다임 — (a) 텍스트 메타데이터, (b) 협업 토큰, (c) ID 번호, (d) 학습 가능한 ID 토큰."
   zoomable=true %}

(a) **텍스트 프롬프팅** 은 사용자 프로필을 자연어로 구성한다 — TALLRec 은 명시적 선호 문장을 프롬프트에 삽입하고 LoRA 로 경량 적응, LlamaRec 은 순차 추천기로 후보를 좁혀 집중된 컨텍스트를 제공, Reason4Rec 은 리뷰에서 선호·아이템 속성을 추출한다. 텍스트만으로는 협업 신호가 빠진다는 게 한계다. (b) **협업 신호 기반** 은 CF 임베딩을 프로필에 주입한다 — CoRAL 은 협업 신호를 명시적 문장 ("User A also prefers X, Y, Z") 으로 재구성, CORONA 는 LLM 추론과 GNN 을 coarse-to-fine 으로 결합, HyperLLM 은 LLM 생성 요약으로 협업 모델을 강화한다. (c)(d) **아이템 토큰화** 는 아이템을 LLM 어휘의 토큰으로 매핑한다. ID 기반 (P5) 은 단순하지만 확장성·의미 부족, 텍스트 기반 (BIGRec) 은 너무 길고 협업 지식 부족, codebook 기반 (TIGER, RPG, ActionPiece) 은 공유 어휘의 discrete token 시퀀스로 어휘 크기를 줄인다. 한 단계 더 나아가 **codebook + 협업 신호** 는 CF 를 토큰화에 직접 통합한다 — LETTER 는 RQ-VAE 에 contrastive alignment, TokenRec, CCFRec, LLM2Rec. SIIT 는 LLM 이 학습 중 아이템 토큰을 self-tuning 하는 self-adaptive 방향이다.

**LLM 기반 추천 — 학습 목표와 추론.** Table 5 는 네 가지 학습 패러다임을 수식과 함께 정리한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/tab5-training-objectives.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5: LLM 기반 생성형 추천의 통합 학습 목표 — SFT, Self-Supervised Learning, Reinforcement Learning, Direct Preference Optimization."
   zoomable=true %}

- **Supervised Fine-Tuning (SFT).** next-item 예측을 위해 정의된 템플릿으로 fine-tuning. 목표는 $-\log \pi\_\theta(y^+ \mid x)$. positive pair 만 학습해 명시적 negative 가 없어 ranking margin 학습이 어렵다는 게 약점이다 (P5, LGIR).
- **Self-Supervised Learning (SSL).** 수작업 템플릿 의존을 줄이는 보조 신호 (FELLAS, HFAR). InfoNCE 형태의 contrastive 목표를 쓴다.
- **Reinforcement Learning (RL).** ranked session 에 reward 기반 최적화로 비미분 metric 을 모델링. 목표는 $-\left[ r\_\phi(x, y^+) - \beta D\_{\text{KL}}(\pi\_\theta(y \mid x) \,\Vert \, \pi\_{\text{ref}}(y \mid x)) \right]$ (LEA, RPP). 대규모 피드백이 필요하고 불안정하다.
- **Direct Preference Optimization (DPO).** reward model 없이 선호쌍을 직접 최적화 (LettinGo, RosePO, SPRec). 목표는 $-\log \sigma\!\left( \beta \log \frac{\pi\_\theta(y^+ \mid x)}{\pi\_{\text{ref}}(y^+ \mid x)} - \beta \log \frac{\pi\_\theta(y^- \mid x)}{\pi\_{\text{ref}}(y^- \mid x)} \right)$.

추론 단계에서는 직접 생성이 가장 단순하지만 prompt-sensitive 하고 다양성 제어가 어렵다. 그래서 reranking (RecRanker 의 2단계 파이프라인, LLM4Rerank 의 multi-hop 추론, GFN4Rec 의 GFlowNet) 과 acceleration (FELLAS, Prompt Distillation, AtSpeed 의 speculative decoding 으로 2–2.5배 가속) 이 보완책으로 등장한다.

**대형 추천 모델 (LRM).** LLM 을 빌려 쓰는 대신 추천에 특화된 native scaling law 를 세우려는 흐름이다. Figure 7 이 두 방향 (LRM 아키텍처, end-to-end 추천) 을 보여준다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig7-lrm.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: 대형 추천 모델의 두 방향. (a) LRM 아키텍처 (encoder-decoder + tokenizer), (b) end-to-end 추천이 전통적 cascade(retrieval-coarse-fine) 구조를 대체."
   zoomable=true %}

Meta 의 **HSTU** 는 LLM 의 scaling law 가 추천에도 적용됨을 입증한 기념비적 연구다. 전통적 판별형 CTR 예측을 생성형 시퀀스 모델링 태스크로 변환하고, 사용자별로 여러 pointwise 샘플을 하나의 행동 시퀀스로 통합한 뒤 causal autoregressive 로 모델링한다. 시퀀스 길이 1024–8192 를 처리하며, 모델 규모를 키울수록 성능이 계속 향상돼 1.5조 (1.5 trillion) 파라미터에 도달한다 — 판별형 모델이 약 2000억 (200 billion) 파라미터에서 정체되는 것과 대조적이다. 이후 Meituan 의 MTGR, Redbook 의 GenRank 가 뒤를 이었다.

end-to-end 방향에서 Kuaishou 의 **OneRec** 은 전통적 retrieval-coarse-fine ranking cascade 를 단일 생성 모델로 대체한 대표 사례다. 핵심 온라인 지표인 총 시청 시간 (total watch time) 을 1.68% 개선했고, 컴퓨팅 자원 활용률을 11% → 28.8% 로 끌어올렸으며, 런타임 비용은 cascade 의 10.6% 에 불과하다. encoder-decoder 구조에 MoE 를 써 모델 용량을 확장하고, pointwise 예측 대신 session 기반으로 전체 추천 리스트를 생성하며, DPO 로 선호 정렬 단계를 추가한다. OneSug 는 이를 쿼리 추천으로, EGA-V2 는 계층적 토큰화와 multi-token 예측으로 확장한다.

**확산 기반 추천.** 확산 모델을 추천에 적용하는 두 갈래를 Figure 8 이 보여준다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig8-diffusion.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: 확산 기반 생성형 추천의 두 유형. (a) 증강 데이터 생성 (노이즈 소셜/상호작용 네트워크 정제, 결손 모달 복원), (b) 타깃 아이템 생성 (조건부 가이드 reverse process)."
   zoomable=true %}

(1) **증강 데이터 생성** 은 고품질 상호작용 데이터 생성 (DGFedRS, MoDiCF 의 modality-aware 결손 복원, TDM), 강건한 표현 생성 (ARD 의 소셜 네트워크 정제, DDRM, DRGO), 선호 주입 조건부 생성 (DMCDR, InDiRec) 으로 나뉜다. (2) **타깃 아이템 생성** 은 사용자의 미래 상호작용 확률을 노이즈에서 복원한다 — DiffRec (denoising 으로 상호작용 예측), DreamRec (타깃 아이템을 노이징해 negative sampling 제거), DiffRIS, DiQDiff. 다양성·불확실성 모델링을 위한 DiffDiv, 임베딩 collapse 를 다루는 ADRec·PreferDiff 도 있다.

### 태스크 축 (Sec 5): 생성 모델이 새 태스크를 연다

- **Top-K 추천.** 생성 결과를 유효한 아이템에 매핑하는 grounding 이 핵심이다. Vocabulary-Constrained Decoding (P5 의 constrained beam-search, IDGenRec 의 trie, TransRec 의 FM-index), Post-Generation Filtering (BIGRec 의 L2 distance grounding), Prompt Augmentation (LLaRA, A-LLMRec, iLoRA) 세 전략이 있다.
- **개인화 콘텐츠 생성.** 기존 아이템을 고르는 대신 새 콘텐츠를 만든다. 시각 콘텐츠 (DiFashion 의 개인화 의상 조합, DreamVTON·OOTDiffusion 의 가상 피팅, InstantBooth), 텍스트 콘텐츠 (리뷰·뉴스 헤드라인 생성 — Ao et al. 의 PENS 가 Microsoft News 클릭 이력으로 개인화 헤드라인 벤치마크 구축).
- **대화형 추천.** 멀티턴 자연어 상호작용으로 동적 선호를 끌어낸다. He et al. 은 off-the-shelf LLM 이 fine-tuning 없이도 지도학습 CRS baseline 을 능가함을 보였다. Retrieval-augmented (GraphRAG, RetrievalCRS, KGPL), unified 아키텍처 (MemoCRS 의 memory module), evaluation (BehaviorAlignment) 으로 발전한다.
- **설명형 추천.** Prompt-based (P5, LLM2ER), graph-enhanced (XRec 의 GNN 임베딩, G-Refer 의 hybrid graph retrieval), reasoning-based 로 나뉜다. 설명의 ground truth 구성이 난제다.
- **추론형 추천.** Explicit reasoning (Reason4Rec 의 deliberative 추론, Reason-to-Recommend 의 Interaction-of-Thought, ThinkRec, OneRec-Think), implicit reasoning (LatentR³ 의 압축된 latent CoT, ReaRec, STREAM-Rec 의 residual-based 반복 정제), LLM reasoning augmentation (DeepRec, LLMRG) 으로 나뉜다.

#### 학습 목표 / 손실 함수

이 서베이의 가장 중요한 수식적 기여는 Table 5 의 LLM 기반 추천 학습 목표 통합이다 (위 "방법" 절에 임베드). 네 가지 패러다임의 본질적 차이를 손실 함수로 풀면 다음과 같다.

SFT 의 $-\log \pi\_\theta(y^+ \mid x)$ 는 사용자 컨텍스트 $x$ 가 주어졌을 때 선호 아이템 $y^+$ 의 우도를 최대화한다. 단순하지만 negative 가 없어 "무엇을 추천하지 말아야 하는가" 를 배우지 못한다. RL 목표 $-\left[ r\_\phi(x, y^+) - \beta D\_{\text{KL}}(\pi\_\theta \,\Vert \, \pi\_{\text{ref}}) \right]$ 는 reward $r\_\phi$ 를 최대화하되 KL 항으로 reference policy $\pi\_{\text{ref}}$ 에서 너무 멀어지지 않게 제약한다 ($\beta$ 가 penalty 강도). DPO 는 별도 reward model 없이, 선호 아이템 $y^+$ 와 거부 아이템 $y^-$ 의 로그 우도 비율 차이를 직접 최적화한다 — reward model 학습의 불안정성을 피하면서 선호 정렬을 달성하는 게 핵심이다. 여기서 $\pi\_\theta$ 는 policy model, $\pi\_{\text{ref}}$ 는 reference model, $\sigma$ 는 sigmoid 다.

확산 기반 추천에서는 forward process $q(S\_t \mid S\_{t-1})$ 가 데이터에 점진적으로 노이즈를 더하고, reverse process $p\_\theta(S\_{t-1} \mid S\_t)$ 가 이를 복원하도록 학습한다. 추천에서는 이 reverse process 에 preference guidance 나 user intent guidance 같은 조건을 주입해 (Figure 8) 사용자 맞춤 결과를 생성한다.

#### 학습 데이터와 파이프라인

이 논문은 서베이이므로 단일 학습 파이프라인 대신 분야 전체의 데이터·평가 지형을 정리한다. 대표적인 데이터셋과 평가 패러다임을 표로 요약하면 다음과 같다.

| 구분 | 대표 사례 | 생성형 추천에서의 한계 |
|------|-----------|----------------------|
| 데이터셋 | MovieLens, Netflix Prize, Amazon Review, Yelp | 비대화형 · 오프라인 · 정적 — 멀티턴·동적 피드백 평가 불가 |
| 랭킹 평가 | NDCG@K, Recall@K, Precision@K, MRR@K, HR@K, AUC | 고정 후보 집합·명확한 relevance label 전제 → open-ended 생성에 부적합 |
| 콘텐츠 품질 | BLEU, ROUGE-L, SBERT, LLM-E, FID | BLEU/ROUGE 는 lexical overlap 의존 → 자유 생성의 의미 품질 반영 부족 |
| 다양성 | ILD, Coverage, Novelty | 정확도 지표와 함께 보고되는 경우 드묾 |
| 공정성 | DP (Demographic Parity), EO (Equal Opportunity) | 함께 측정되는 벤치마크 부족 |
| 대화형 | SR (Success Rate), AT (Average Turns) | 대화 시뮬레이터 품질에 의존 → 실제 사용자 충실도 의문 |

핵심 메시지는 명확하다 — 기존 벤치마크는 점수화 정확도를 측정하도록 설계됐기 때문에, 생성형 모델을 "개인화 어시스턴트" 로 평가하기에는 근본적으로 부적합하다. 동적·멀티턴·상호작용 평가를 지원하는 새 벤치마크가 시급하다.

#### 실험 결과

서베이라 단일 실험 표는 없지만, 본문에서 강조하는 대표적 정량 결과를 정리하면 생성형 추천의 실질적 임팩트가 드러난다.

### 대형 추천 모델의 scaling

HSTU 는 모델 규모를 키울수록 성능이 계속 향상돼 1.5조 파라미터에 도달하는 반면, 판별형 추천 모델은 약 2000억 파라미터에서 효과가 정체된다. 이는 "추천에도 LLM 식 scaling law 가 작동한다" 는 핵심 주장을 뒷받침하는 가장 강력한 증거다.

### end-to-end 추천의 산업적 검증

OneRec 은 Kuaishou 메인 추천에서 총 시청 시간을 1.68% 개선했다. 추천 도메인에서 1%대 시청 시간 개선은 수억 DAU 규모에서 막대한 가치다. 더 인상적인 건 효율이다 — 컴퓨팅 자원 활용률 11% → 28.8%, 런타임 비용은 전통적 cascade 의 10.6%. 즉 생성형 통합 모델이 성능과 엔지니어링 효율을 동시에 잡을 수 있음을 산업 스케일에서 입증했다.

### 대화형 추천의 zero-shot 우위

He et al. 의 결과는 off-the-shelf LLM 이 fine-tuning 없이도 지도학습 CRS baseline 을 능가함을 보였다. 이는 대화형처럼 본질적으로 생성적인 태스크에서 LLM 의 자연어 능력이 즉각적인 이득을 준다는 증거다.

#### 결과 분석 / Ablation

서베이 전체를 관통하는 분석적 통찰을 정리하면 다음과 같다.

**데이터 축 — 증강의 효과는 "정렬" 에서 갈린다.** 단순히 LLM 으로 텍스트를 더 생성하는 것만으로는 부족하다. 본문이 반복적으로 강조하듯, 외부 지식은 추천 목표와 정렬되지 않으면 오히려 노이즈가 된다. 그래서 SeRALM (정렬된 설명 생성), LettinGo (DPO 로 프로필 영향 최적화), TRAWL (어댑터로 추천 공간 정렬) 처럼 "생성 → 정렬" 을 명시적으로 다루는 방법이 핵심이다. 이는 곧 데이터 생성의 병목이 생성 능력이 아니라 정렬 능력임을 시사한다.

**모델 축 — 토큰화가 LLM 추천의 진짜 병목이다.** Figure 6 의 네 패러다임 비교에서 드러나듯, ID 기반은 확장성, 텍스트 기반은 길이와 협업 지식 부족이라는 trade-off 에 갇힌다. codebook + 협업 신호 (LETTER, TokenRec) 방향이 의미와 협업 지식을 동시에 담는 절충안으로 부상하지만, "효율적이면서 의미적으로도 충분한 토큰" 설계는 여전히 열린 문제다.

**모델 축 — LRM 이 LLM 추천보다 산업에서 먼저 통한다.** 흥미로운 관찰은, LLM 을 빌려 쓰는 방식보다 추천에 특화된 native 대형 모델 (HSTU, OneRec) 이 산업 배포에서 더 큰 성과를 냈다는 점이다. LLM 정렬 연구가 학술적으로 풍부한 반면, scaling law 를 추천 데이터에 직접 적용한 LRM 이 효율·성능 양면에서 실전 검증을 통과했다. 이는 "추천을 자연어로 강제 변환하는 비용" 이 생각보다 크다는 신호로 읽힌다.

**태스크 축 — grounding 이 생성형 Top-K 의 안전장치다.** 생성 모델은 존재하지 않는 아이템을 hallucinate 할 수 있으므로, vocabulary-constrained decoding 이나 post-generation filtering 같은 grounding 없이는 Top-K 추천에 바로 쓸 수 없다. 이 grounding 메커니즘의 정확도가 전체 추천 품질을 좌우한다.

#### 한계와 비판적 평가

저자들이 인정한 미해결 과제는 Figure 9 의 비전 (전통적 판별형 vs 생성형 어시스턴트) 과 함께 세 갈래로 정리된다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig9-assistant.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9: 전통적 판별형 추천(좌, 고정 후보·소형 모델·단일 태스크)과 생성형 추천 어시스턴트(우, 대화형·멀티모달·멀티도메인·추론)의 비교."
   zoomable=true %}

- **데이터·평가.** 기존 벤치마크 (MovieLens, Amazon 등) 는 정적·비대화형이라 생성형 어시스턴트를 평가하기 부적합하다. 동적·멀티턴·상호작용을 지원하는 대규모 벤치마크와 평가 기준이 없다.
- **편향.** Popularity bias (인기 아이템이 사전학습 코퍼스에 더 많이 등장해 과대 추천), fairness bias (성별·인종 같은 민감 속성 관련), position bias (LLM 이 프롬프트 상위 후보를 선호) — SFT 는 popularity bias 를 키우고, DPO 는 선호쌍 품질에 민감하다.
- **강건성.** 자연 노이즈 (clickbait 등) 와 악의적 공격에 취약하다. 특히 textual simulation attack 은 아이템 설명을 의미상 유사하지만 거짓된 버전으로 재작성하는 공격으로, 전통적 공격보다 저비용·black-box 에서 실행 가능하고 여러 모델·태스크에 전이된다.
- **배포 효율.** 학습 효율 — PEFT 가 비용을 줄이지만 급증하는 규모에는 부족. 추론 효율 — autoregressive decoding 의 다중 직렬 LLM 호출이 실시간 추천의 latency 병목이다. Top-K 의 distinct 시퀀스 생성에 beam search 가 필요해 speculative decoding 같은 NLP 가속 기법을 그대로 쓰기 어렵다.

리뷰어 관점에서 추가로 짚자면, 이 서베이는 커버리지가 매우 넓은 대신 개별 방법의 정량 비교 (어떤 토큰화가 어떤 데이터셋에서 몇 % 우위인가) 가 거의 없다. 분야가 빠르게 움직이고 벤치마크가 통일되지 않은 현실을 반영한 것이지만, "무엇이 실제로 더 나은가" 를 판단하려는 독자에게는 아쉬운 지점이다. 또한 LLM 기반 정렬 연구가 학술적으로는 가장 풍부하게 다뤄지는 반면, 산업적으로 검증된 LRM (HSTU·OneRec) 의 비중이 상대적으로 작아, 학계·산업의 무게중심 차이가 taxonomy 에 충분히 반영됐는지는 더 논의할 여지가 있다.

#### 시사점 / Takeaways

- **생성형 추천의 본질은 "점수화 → 생성" 의 관점 전환이다.** 고정 후보를 점수화하는 판별형에서, 사용자에게 맞는 결과를 직접 생성하는 생성형으로의 이동은 cold-start·설명성·대화형 같은 오랜 난제를 새 각도에서 공략하게 한다. 단, 생성형의 우위는 데이터 희소·본질적 생성 태스크·대규모 학습이라는 조건에서만 분명하다.
- **data–model–task 프레임워크가 이 분야를 읽는 가장 유용한 지도다.** 생성 능력이 파이프라인의 어느 단계 (데이터 생성·통합 / 추천 엔진 / 신규 태스크) 에 개입하는지로 나누면, 수백 편의 논문이 일관된 좌표 위에 놓인다.
- **산업에서는 LLM 차용보다 native LRM 이 먼저 통했다.** HSTU 의 1.5조 파라미터 scaling 과 OneRec 의 시청 시간 1.68% 개선·런타임 비용 10.6% 는, 추천을 자연어로 강제 변환하기보다 추천 데이터에 scaling law 를 직접 적용하는 편이 실전에서 효율·성능 양면에서 강력함을 보여준다.
- **토큰화와 grounding 이 LLM 추천의 실질적 병목이다.** 의미와 협업 지식을 동시에 담는 아이템 토큰 설계, 그리고 hallucination 을 막는 grounding 메커니즘이 생성형 Top-K 의 품질을 좌우한다.
- **평가 인프라가 가장 시급한 미해결 과제다.** 정적·비대화형 벤치마크로는 생성형 어시스턴트를 제대로 측정할 수 없다. 동적·멀티턴·멀티모달 평가 체계 없이는 분야의 진짜 진전을 가늠하기 어렵다.

#### 참고 자료

- 논문: [A Survey on Generative Recommendation: Data, Model, and Tasks](https://doi.org/10.1016/j.aiopen.2026.05.002) (AI Open, 2026, open access)
- 분류 체계·개요: 본문 Figure 2 (survey overview), Figure 3 (taxonomy)

#### 더 읽어보기

- **[Actions Speak Louder than Words: Trillion-Parameter Sequential Transducers for Generative Recommendations](https://arxiv.org/abs/2402.17152)** (Zhai et al., ICML 2024) — HSTU. 추천에 LLM 식 scaling law 가 작동함을 1.5조 파라미터 규모로 입증한 대형 추천 모델의 출발점.
- **[OneRec: Unifying Retrieve and Rank with Generative Recommender and Iterative Preference Alignment](https://arxiv.org/abs/2502.18965)** (Deng et al., 2025) — Kuaishou 의 end-to-end 생성형 추천. cascade 를 단일 모델로 대체해 시청 시간 1.68% 개선, 런타임 비용 cascade 의 10.6%.
- **[Recommender Systems with Generative Retrieval](https://arxiv.org/abs/2305.05065)** (Rajput et al., NeurIPS 2023) — TIGER. Semantic ID 로 아이템을 codebook 토큰 시퀀스로 표현해 autoregressive 하게 생성·검색하는 토큰화의 대표작.
- **[Recommendation as Language Processing (RLP): A Unified Pretrain, Personalized Prompt & Predict Paradigm (P5)](https://arxiv.org/abs/2203.13366)** (Geng et al., RecSys 2022) — 추천 태스크를 text-to-text 로 통합한 선구적 연구. multi-task·one-model-for-all 통합의 원형.
- **[A Review of Modern Recommender Systems Using Generative Models (Gen-RecSys)](https://arxiv.org/abs/2404.00579)** (Deldjoo et al., KDD 2024) — GAN·VAE·LLM 을 아우르는 생성형 추천 서베이. 본 논문과 함께 읽으면 분야의 시간적 변화가 보인다.

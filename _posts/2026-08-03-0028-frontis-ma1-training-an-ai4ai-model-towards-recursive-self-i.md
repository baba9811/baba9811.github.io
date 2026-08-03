---
layout: post
title: "[논문 리뷰] Frontis-MA1: Training an AI4AI Model towards Recursive Self-Improvement in Machine Learning Engineering"
date: 2026-08-03 14:00:00 +0900
description: "Draft·Improve·Debug·Crossover 네 개의 원자 operator 를 post-training 과 진화 탐색이 공유하게 만든 오픈 풀스택. 35B 모델이 RTX 4090 한 장·12시간 예산에서 MLE-Bench Lite 71.21% 를 찍는다."
tags: [ai4ai, recursive-self-improvement, mle-agent, evolutionary-search, reinforcement-learning, post-training, agent]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig5-workflow.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/
en_url: /en/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/
---

{% include lang_toggle.html %}

#### 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Junlin Yang et al. (24명 공동 저자, Frontis.AI · 칭화대 · 저장대 · SJTU · Georgia Tech) |
| 학회 | arXiv · 2026 · 모델 가중치 및 전체 스택 공개 |
| arXiv 또는 DOI | [2607.28568](https://arxiv.org/abs/2607.28568) |
| Code | [FrontisAI/OpenRSI](https://github.com/FrontisAI/OpenRSI) |
| 데이터 | OpenMLE-Gym — 실행 가능 MLE task 5,758개 · execution-grounded SFT 코퍼스 26,259건 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-08-03 |

#### TL;DR

- AI 가 AI 를 만드는 능력(AI4AI)을 재귀적 자기개선(recursive self-improvement, RSI)의 방향으로 밀어붙이려면, 개선을 수행하는 주체 자체가 학습돼야 한다. 이 논문은 머신러닝 엔지니어링(MLE)을 그 실행 가능한 테스트베드로 삼고, 환경(OpenMLE-Gym) · 학습(OpenMLE-ERL) · 탐색(OpenMLE-Evo)을 하나로 묶은 오픈 풀스택 OpenMLE 를 공개한다.
- 핵심 설계는 <strong>Draft · Improve · Debug · Crossover</strong> 라는 네 개의 원자 operator 를 post-training 의 학습 단위이자 inference-time 탐색의 호출 단위로 <em>동일하게</em> 쓰는 것이다. 학습된 operator 가 곧 진화 harness 의 변이 엔진이 되면서 학습과 탐색이 하나의 루프로 닫힌다.
- MLE-Bench Lite 22개 task, RTX 4090 한 장(12 GB VRAM) · task 당 12시간이라는 빠듯한 예산에서 Frontis-MA1-35B 는 base 모델 대비 Medal Average 39.39% → 60.61% 로 오르고, OpenMLE-Evo-Max 를 붙이면 71.21% 에 도달해 GPT-5.5 + Codex(68.18%)를 넘고 2.8T Kimi K3(72.73%)에 근접한다.
- 별도 벤치마크인 NatureBench Lite 에서도 모델·harness 각각의 기여가 재현된다. harness 를 고정하면 모델 교체만으로 Match-SOTA 가 50% → 70%, 모델을 고정하면 harness 교체만으로 20% → 50% 로 오른다.

#### 소개 (Introduction)

AI 의 성능 향상을 사람 엔지니어만 밀어붙이던 시기는 끝나가고 있다. AI 시스템이 코드를 쓰고, 실험을 돌리고, 설계 공간을 탐색하고, 다음 세대 AI 를 만드는 일에 참여한다. 이 흐름을 AI for AI (AI4AI) 라고 부르고, 그 극단에 놓인 것이 재귀적 자기개선(recursive self-improvement, RSI)이다. 개선된 시스템이 다시 자기 후속 세대를 만드는 <em>과정 자체</em>를 개선하는 루프다. 이 목표에 도달하려면 한 방에 좋은 코드를 뽑아내는 능력만으로는 부족하다. 데이터를 살펴보고, 알고리즘을 제안하고, 실험을 실행하고, 실패를 진단하고, 다음 연산 예산을 어디에 쓸지 결정하는 에이전트가 필요하다.

머신러닝 엔지니어링(MLE)은 이 요구를 거의 그대로 담고 있는 도메인이다. 에이전트는 실제 문제에 대해 ML 솔루션을 만들고, 실행 피드백을 받아 반복적으로 개선해야 한다. 궤적은 보통 "일단 돌아가는 파이프라인" 에서 시작해 반복 실험을 거쳐 강한 사람 참가자나 프런티어 모델 파이프라인에 견줄 만한 솔루션으로 나아간다. 각 반복은 시간과 연산을 소모하고, 그 결과는 몇 분에서 몇 시간 뒤에야 도착한다. 지연되고, 노이즈가 있고, task 마다 이질적인 피드백 아래에서 에이전트가 AI 시스템을 개선하는 방법을 연구하기에 이보다 구체적인 무대는 드물다.

지금까지 MLE 에이전트 연구는 크게 세 갈래로 나뉘어 발전했다. 첫째, 구조화된 탐색이나 진화 탐색을 쓰는 inference-time harness. 둘째, 실행 가능한 task 와 환경 구축. 셋째, 실행 피드백으로 MLE 에이전트를 post-train 하는 연구. 문제는 이 세 갈래가 거의 만나지 않는다는 점이다. 저자들이 Appendix Table 11 에서 점검한 대표 공개 시스템들 중, task/환경 구축 + execution-grounded post-training + 학습된 에이전트를 장기 탐색에 배치하는 진화 harness 를 <em>모두</em> 갖추고, 게다가 그 루프를 재현할 산출물까지 공개한 사례는 하나도 없었다. 이 논문의 출발점은 그 공백이다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig2-positioning.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: 이 논문의 위치. 왼쪽은 AI4AI 안에서의 MLE 와 OpenMLE 스택, 오른쪽은 evolution → meta-evolution → RSI 로 이어지는 메커니즘 사다리. Frontis-MA1 이라는 이름의 MA 는 Meta-evolution Agent 에서 왔다."
   zoomable=true %}

#### 핵심 기여 (Key Contributions)

- **operator 를 학습과 탐색의 공유 인터페이스로 삼은 설계.** Draft, Improve, Debug, Crossover 를 SFT/RL 의 학습 타깃이자 진화 탐색의 호출 단위로 동일하게 정의했다. 검증된 진화 전이(transition)가 나중에 탐색이 조합할 바로 그 변환을 지도(supervise)하게 되면서, 학습된 모델이 harness 의 변이 엔진이 되는 meta-evolutionary loop 가 형성된다.
- **OpenMLE-Gym: 5,758개 품질 게이트 통과 실행 가능 task.** Curated Anchors 156개, Kaggle Datasets 기반 3,362개, 자체 Kaggle Competition 파이프라인 2,240개를 하나의 실행 가능 패키지 규약으로 통일하고, 격리 실행 · 구조화 피드백 · task 별 평가기를 붙였다.
- **OpenMLE-ERL: 실행 근거 기반 SFT + RL.** budget-adaptive 수집으로 26,259건 SFT 코퍼스를 만들고, adaptive reward bounds 와 entropic advantage 로 "돌아가기만 하는 프로그램" 이 아니라 "상위권 프로그램" 에 학습 신호를 집중시킨다.
- **OpenMLE-Evo: 경험 기반 장기 탐색.** 결정적(deterministic) experience card/board 를 쌓고, quality·progress·novelty 세 인자로 부모를 고르고, 호출된 operator 에 대해서만 on-demand 로 메모리를 합성한다.
- **재현 가능한 전체 스택 공개.** 데이터, 학습·평가 코드, 샌드박스 인프라, harness 코드, 최종 체크포인트까지 공개한다. Appendix Table 11 의 점검 기준(Data / Sandbox / Train code / RL method / Eval / Weights) 여섯 항목을 모두 채운 유일한 시스템이다.

리뷰어 입장에서 가장 값어치 있다고 보는 건 세 번째 축이 아니라 <strong>첫 번째 축, 즉 인터페이스 정렬</strong>이다. 기존 연구들은 "좋은 harness" 와 "좋은 모델" 을 따로 최적화해왔고, 그래서 harness 가 부르는 연산과 모델이 배운 행동이 어긋났다. 이 논문은 그 둘을 같은 네 개의 동사로 묶는다. 아래에서 볼 탐색 효율 수치(토큰 41.7% 감소, 토큰당 신기록 갱신 84.3% 증가)는 대부분 이 정렬에서 나온다.

#### 관련 연구 / 배경 지식

**MLE-Bench 와 메달 기반 채점.** MLE-Bench (Chan et al., 2024)는 Kaggle 대회를 에이전트 과제로 포장한 벤치마크다. 에이전트는 대회 설명과 학습 데이터를 받고 `submission.csv` 를 만들어야 하며, 채점은 그 대회의 실제 사람 리더보드를 기준으로 한다. 이 논문이 쓰는 세 지표는 모두 여기서 나온다. Valid Rate 는 22개 task 중 유효 제출을 만든 task 수, Medal Average 는 Kaggle 메달(bronze/silver/gold)을 하나라도 받은 task 비율, Human Rank 는 제출 솔루션이 넘어선 사람 참가자 비율을 task·run 평균한 값이다. 셋 다 높을수록 좋다.

**AIDE 와 AIRA 계열의 코드 공간 탐색.** AIDE (Jiang et al., 2025)는 프로그램을 노드로 하는 트리를 만들고, 실행 피드백을 받아 노드를 개선·수정하며 탐색한다. AIRA-dojo (Toledo et al., 2025)와 AIRA2 (Hambardzumyan et al., 2026)는 이 아이디어를 population 기반으로 확장하고, 탐색 정책·operator 품질·처리량·아이디어 다양성이 성능의 핵심 인자임을 보였다. OpenMLE-Evo 는 AIRA-Evo 스타일 population 루프를 그대로 채택하되, 그 루프가 실행 증거를 <em>쓰는 방식</em>만 재설계한다. 그래서 이 논문의 가장 정직한 baseline 도 original AIRA-Evo 다.

**RLVR 과 그 한계.** 수학·코드 생성에서 검증 가능한 보상 기반 RL(RLVR)은 강력하지만, Yue et al. (2025)의 분석대로 RL 은 이미 보상받는 솔루션을 강화해 Pass@1 을 올릴 뿐 큰 $K$ 에서의 Pass@$K$ 는 잘 못 늘린다. 반면 teacher distillation 은 base 모델의 sampling support 에 없던 행동을 주입할 수 있다. 이 논문의 SFT → RL 이단 구성은 정확히 이 분석을 따른다. SFT 가 도달 가능한 프로그램 집합을 넓히고, RL 이 그 안에서 좋은 쪽으로 확률을 옮긴다.

**MLE 에서의 RLVR 이 다른 점.** 짧은 호흡의 수학 RLVR 과 달리 여기서는 (1) 많은 프로그램이 아예 보상을 못 만들고, (2) 성공한 프로그램의 점수는 서로 다른 지표·범위의 연속값이고, (3) 피드백이 몇 분~몇 시간짜리 샌드박스 실행 뒤에야 오고, (4) Draft 를 제외한 모든 행동이 "어떤 부모를 골랐는가" 에 의존한다. OpenMLE-ERL 의 설계 결정(adaptive bounds, entropic advantage, 비동기 rollout, 부모 상태 선택)은 하나하나 이 네 가지에 대응한다.

#### 방법 / 아키텍처 상세

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig5-workflow.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: OpenMLE 학습·추론 워크플로 전체. 위쪽의 네 atomic operator 가 ① 진화적 추론, ② 실행 rollout 기반 SFT, ③ 실행 피드백 기반 RL 세 블록 모두에서 같은 의미로 쓰인다."
   zoomable=true %}

##### 문제 정의

각 task $\tau$ 는 자연어 명세, 공개 데이터, 제출 규약, task 전용 평가기, 샌드박스 실행 환경으로 구성된다. 스텝 $t$ 에서 탐색 알고리즘이 operator $a\_t$ 를 고르고, 0개 이상의 부모 프로그램과 그 실행 피드백으로부터 operator context $c\_t$ 를 구성한다. 모델은 다음을 제안하고 샌드박스가 채점한다.

$$
p_t \sim g_\theta(\cdot \mid \tau, a_t, c_t), \qquad s_t = R_\tau(\mathcal{E}(p_t, \tau))
$$

여기서 $g\_\theta$ 는 operator 로 조건화된 프로그램 생성 정책, $\mathcal{E}$ 는 샌드박스, $R\_\tau$ 는 task 별 평가기다. 유한한 실행 예산 안에서 진화적 추론의 목표는 부호 정렬된(항상 클수록 좋은) 점수 $\tilde{s}\_t$ 를 최대화하는 후보를 찾는 것이다.

$$
p^\star = p_{\arg\max_{t \in \mathcal{I}} \tilde{s}_t}
$$

Meta-evolution 은 여기에 학습 루프를 하나 더 얹는다. SFT 와 RL 은 모두 다음 목적의 특수 케이스로 정리된다.

$$
\mathcal{L}_{\text{evo}}(\theta) = -\mathbb{E}_{(\tau_i, a_i, c_i, p_i)} \left[ w(s_i) \log g_\theta(p_i \mid \tau_i, a_i, c_i) \right]
$$

$w(s\_i)$ 가 실행 결과를 학습 가중치로 바꾸는 함수다. SFT 에서는 품질 필터가 고득점 프로그램만 남겨 양의 지도 신호를 주고, RL 에서는 처리된 실행 보상과 entropic advantage 가 clipped policy objective 안에서 가중치 역할을 한다. 즉 두 단계가 <em>같은 파라미터</em> $\theta$ 를, <em>같은 조건부</em> $g\_\theta(\cdot \mid \tau, a, c)$ 위에서 갱신한다. 이 형식적 통일이 나중에 "학습한 것과 부르는 것이 같다" 는 주장의 근거가 된다.

##### OpenMLE-Gym: 검증 가능한 환경을 스케일로 만들기

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig3-gym-curation.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: OpenMLE-Gym 의 task 큐레이션과 실행 가능 패키지 포맷. 왼쪽은 품질-규모 트레이드오프상의 세 소스, 가운데는 Kaggle Competition 필터링 퍼널, 오른쪽은 통일된 패키지 레이아웃."
   zoomable=true %}

환경은 다섯 요소로 정의된다. **task/state** 는 task 명세 · 공개 데이터 · 숨겨진 평가기 · 자원 예산 · 현재 workspace 상태, **action** 은 에이전트가 제출한 MLE 프로그램과 실행 요구사항, **transition** 은 샌드박스 실행, **observation** 은 실행 상태 · task 점수 · 로그 · 에러 타입 · 산출물 · 런타임 메타데이터를 담은 구조화 레코드, **reward** 는 평가기가 돌려주는 검증 가능한 task 점수다.

task 는 품질-규모 트레이드오프상의 세 소스에서 온다.

| 소스 | 개수 | 특징 |
|------|------|------|
| Curated Anchors | 156 | 논문·벤치마크에서 수작업 선별. 신뢰도 최고, 규모 제약 |
| Kaggle Datasets | 3,362 | MLE-Smith 의 dataset-to-task 파이프라인 확장 + 패키지 단위 품질 관리 |
| Kaggle Competitions | 2,240 | 사람이 쓴 명세·지표·제출 규약. 리더보드라는 외부 증거 존재 |
| **합계** | **5,758** | |

Competition 브랜치의 퍼널이 이 절의 백미다. Meta Kaggle 카탈로그의 약 11,000개 대회에서 출발해, 리더보드 길이 스크리닝과 MLE-Bench 중복 제거, 라이선스·대회 규칙 심사를 거쳐 3,972개(36% 잔존)로 줄고, 자동 패키지 구축과 지표 검증을 통과해 2,839개(26%)가 되고, 마지막으로 엄격한 의미론적 품질 게이트를 넘은 2,240개(20%)만 남는다. 여기서 <strong>MLE-Bench 와 겹치는 대회를 명시적으로 배제</strong>했다는 점은 이 논문 전체의 신뢰도를 지탱하는 조치다.

의미론적 품질 게이트는 LLM 기반 필터가 task 설명 · raw 파일 · 처리 스크립트 · 처리 결과 · 대표 데이터 샘플을 함께 보고 다섯 축(task validity, data sufficiency, raw-data usage, task complexity, data quality)으로 판정한다. 여기서 걸러내려는 것은 자명한 규칙으로 풀리는 degenerate 타깃, 학습/평가 신호 부족, 원본 자산의 피상적 사용, 난이도 불일치, 데이터 누수, 어노테이션 오류, 잘못된 전처리다. 그리고 metric-valid 하면서 `recommended` 판정을 받은 task 만 최종 수용한다 — `conditional` 은 탈락이다.

샌드박스 백엔드는 중앙 스케줄러가 API 요청을 받아 CPU/GPU Docker worker 에 분배하는 구조이고, 여섯 가지 피드백 모드를 돌려준다. 정상 완료, 런타임 에러, 코드 누락, 제출 파일 누락, 채점 실패, 타임아웃. 이 구분은 생각보다 중요하다. 에이전트가 "프로세스는 성공했지만 제출 파일이 없다" 와 "제출 파일은 있는데 스키마가 틀렸다" 와 "제출은 유효한데 점수가 낮다" 를 구별할 수 있어야 Debug 와 Improve 중 무엇을 부를지 결정할 수 있기 때문이다.

modality 분포는 tabular 44%, image 18%, time series 13%, multimodal 11%, text 9%, audio 2%, video 1%, 기타 2% 이고, task type 은 classification 56% · regression 31% 로 둘이 87% 를 차지한다. 패키지 크기는 1 MiB 미만 29% 부터 1 GiB 이상 9% 까지 퍼져 있다. 다만 소스 데이터 라이선스·저작권 제약 때문에 전체 task 패키지 데이터를 공개하는 것은 1,415개뿐이고, 나머지 4,343개는 `prepare.py` 와 `metric.py` 만 공개한다.

##### OpenMLE-ERL: 재사용 가능한 operator 를 강화하기

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig7-rollout-learning.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: 실행된 rollout 으로부터의 학습. 왼쪽 Supervised Warm Start 는 parallel path(임계값 통과 Draft)와 evolutionary path(반복 Debug 뒤의 유효 endpoint 로부터 역추적)를 결합한다. 오른쪽은 RL 의 부모 선택 · adaptive bounds · entropic advantage."
   zoomable=true %}

###### 네 개의 원자 operator

OpenMLE 의 중심 설계 원칙은 <strong>모델이 배우는 지역적 기술과 inference-time 탐색 알고리즘을 분리</strong>하는 것이다. 전체 궤적을 학습시키면 controller 별로 다른 희소한 지도 신호에 종속되지만, 재사용 가능한 프로그램 변환 operator 를 학습시키면 같은 operator 를 여러 탐색 절차가 조합할 수 있다. 네 operator 의 역할은 각각 이렇다. Draft 는 task 명세로부터 새 솔루션을 제안하고, Improve 는 선택된 부모 하나를 개선하고, Crossover 는 두 부모를 합성하고, Debug 는 실패했거나 보상이 0 이하인 부모를 수리한다.

###### 실행 근거 기반 지도 warm start

SFT 데이터 수집은 두 경로로 나뉜다.

**Parallel path** 는 task 마다 완결된 Draft 솔루션을 독립적으로 샘플·실행한다. 1차 배치는 GLM-4.7 로 수집하고, 같은 task 에서 유효 점수를 받은 후보 중 점수 중복을 제거한 뒤 상위 4개까지만 남겨 11,519건을 얻었다. 2차 배치는 GLM-4.7 과 Qwen3-30B-A3B-Thinking-2507 을 함께 쓰되, 두 teacher 의 후보를 task 안에서 <em>공동 랭킹</em>한다. GLM 후보는 공동 Top-4 안에 들면 채택하고, Qwen 후보는 전체 1위일 때만 채택한다. 그래서 task 당 최대 4개라는 상한이 유지된다(GLM 4개 + Qwen 1개가 되지 않는다). 2차 배치는 5,726건(GLM 5,075 + Qwen 651)이고, 두 배치를 합쳐 17,245건의 full-response 예제가 된다.

**Evolutionary path** 는 "완성된 솔루션은 최종 프로그램을 보여줄 뿐, 실행 피드백을 어떻게 개선에 써야 하는지는 가르쳐주지 않는다" 는 문제의식에서 출발한다. GLM-4.7 로 AIRA-Evo 탐색을 돌려 부모 관계 · 프로그램 버전 · 실행 피드백 · task 점수를 가진 탐색 트리를 만들고, 여기서 <em>local segment</em> 를 뽑는다. segment 는 Draft/Improve/Crossover 노드에서 시작해 연속된 Debug 자손을 따라가고, 다른 Draft/Improve/Crossover 노드에 닿으면 끝난다. 채택 조건은 operator 별로 다르다. Draft segment 는 양수 점수로 끝나야 하고, Improve segment 는 부모를 넘어야 하고, Crossover segment 는 두 부모 중 나은 쪽을 넘어야 한다. 그리고 endpoint 는 추가로 bronze/silver/gold 수준에 도달해야 한다.

multi-step segment 의 스텝 취사선택은 DeepSeek-V4-Pro 가 <strong>인과적 상속(causal inheritance)</strong> 기준으로 판정한다. 어떤 스텝이 도입한 전략 · 필수 중간 상태 · 결정적 에러 수리가 이후 스텝에 상속되어 endpoint 에 실질적으로 기여했는가를 본다. 겉치레에 그치는 편집, 원인 규명 없는 blind retry, 자원 제한 회피를 위해 학습 규모만 줄인 변경, 실패한 환경 수정이나 외부 네트워크 접근은 버린다. 이 판정 프롬프트가 Appendix B.1 에 통째로 실려 있는데, "목표(goal)와 방법(method)을 구분하라 — endpoint 가 '과적합 해결' 이라는 목표만 유지하고 완전히 다른 방법을 쓴다면 그 스텝의 방법은 상속된 게 아니다" 같은 규칙이 꽤 정교하다. 이 경로가 9,014건의 trajectory-step 예제를 기여한다.

두 경로를 합치고 정규화된 메시지 전체에 대해 정확 중복 제거를 한 뒤, 대상 모델의 chat template 을 적용해 32,768 토큰을 넘는 예제를 제외하면 최종 26,259건이 된다. 구성은 이렇다.

| 축 | 분포 |
|------|------|
| 지도 유형 | full response 17,245건(65.7%) · trajectory step 9,014건(34.3%) |
| operator | Draft 19,436(74.0%) · Debug 4,340(16.5%) · Improve 1,741(6.6%) · Crossover 742(2.8%) |
| 길이 중앙값 | full response 8,407 토큰 · trajectory step 14,051 토큰 |

trajectory step 이 더 긴 이유는 부모 프로그램 · 실행 피드백 · 지역 탐색 컨텍스트를 함께 담기 때문이다. 수집은 budget-adaptive 하게 멈춘다. 채택 예제 쿼터를 채우거나 task 의 실행 예산이 소진되면 종료하므로, 쉬운 task 는 일찍 끝나고 성공이 희소한 task 에 더 많은 시도가 배정된다.

###### 실행 근거 기반 강화학습

**이질적 결과를 비교 가능하게 만들기.** 어떤 task 는 accuracy 를, 어떤 task 는 log loss 를 최적화한다. 방향을 맞춰도 범위가 다르다. 부호 정렬된 점수 $\tilde{s}$ 에 대해 고정 bound 로 정의한 base reward 는 다음과 같다.

$$
r_{\text{base}}(\tilde{s}; b_{\text{best}}, b_{\text{worst}}) = \text{clip}\left( \frac{\tilde{s} - b_{\text{worst}}}{b_{\text{best}} - b_{\text{worst}}},\, 0,\, 1 \right)^{\alpha}, \qquad \alpha > 0
$$

문제는 리더보드나 이론적 극값이 현재 정책이 도달하는 점수 영역보다 훨씬 넓다는 것이다. 그러면 의미 있게 다른 프로그램들이 거의 같은 보상으로 뭉개진다. 그래서 OpenMLE 는 각 task 의 on-policy 점수 frontier 에서 더 좁은 <strong>adaptive bound</strong> 를 유도한다. 성공한 과거 프로그램과 현재 rollout group 의 점수를 내림차순 정렬해 $x\_{(1)} \ge \cdots \ge x\_{(K)}$ 라 하면,

$$
\begin{aligned}
B_{\text{dyn}} &= x_{(1)}, \\
W_{\text{dyn}} &= x_{(\min(16, K))}, \\
W_{\text{dyn}} &\leftarrow W_{\text{dyn}} - 0.25 \max(B_{\text{dyn}} - W_{\text{dyn}},\, 0)
\end{aligned}
$$

최고점이 상한, 16번째 점수가 하한 기준점이 되고(점수가 16개보다 적으면 최저점 사용), 두 기준점 간격의 1/4 만큼 하한을 더 내린다. 이 마지막 확장이 없으면 점수가 촘촘히 뭉쳐 있을 때 그럭저럭 성공한 프로그램들이 통째로 0 으로 clip 된다. task 메타데이터에 유효한 이론적/리더보드 한계가 있으면 $B = \min(B\_{\text{dyn}}, B\_{\text{static}})$, $W = \max(W\_{\text{dyn}}, W\_{\text{static}})$ 로 범위를 가둔다.

**상위 꼬리에 학습 신호 집중시키기.** MLE 평가는 <em>찾아낸 최고 프로그램</em>의 품질로 보상한다. 그렇다면 간신히 돌아가는 제출이 최상위 제출과 같은 양의 보상을 받아서는 안 된다. OpenMLE 는 rollout group 상단의 보상 격차를 증폭하는 entropic advantage 를 쓴다. 구현상의 max-centering 을 생략하면 형태는 이렇다.

$$
A^{\text{ent}}_i \approx \frac{\exp(\beta\, r_{\text{proc},i})}{\frac{1}{G-1} \sum_{j \neq i} \exp(\beta\, r_{\text{proc},j})} - 1
$$

집중도를 결정하는 $\beta$ 는 고정된 엔트로피/KL 예산 아래에서 선택된다. 구체적으로는 group 분포 $q\_i(\beta) \propto \exp(\beta c\_i)$ (여기서 $c\_i = r\_{\text{proc},i} - \max\_j r\_{\text{proc},j}$) 가 균등분포로부터 $\mathrm{KL}(q\_\beta \Vert \mathrm{Unif}(K)) \approx \log 2$ 만큼 떨어지도록 이분 탐색으로 정한다(최대 탐색값 $10^6$, 60회 이분). 이 advantage 가 GRPO 식 group-normalized 신호를 대체해 clipped policy objective 에 들어간다. 순서가 중요하다. adaptive bound 가 먼저 group 내부의 차이를 <em>보이게</em> 만들고, entropic weighting 이 그다음에 최상위 후보 쪽으로 학습 신호를 <em>몰아준다</em>.

**stragglers 제거.** MLE RL 의 지배적 지연은 토큰 생성이 아니라 후보 프로그램 실행에서 나오고, 런타임 편차가 크다. 동기 배치에서는 완료된 group 이 가장 느린 샌드박스 잡을 기다리며 놀게 된다. OpenMLE 는 생성-실행 group 을 독립적으로 띄우고 trainer 가 큐에서 완료된 group 을 바로 소비한다. Appendix B.4 의 실측으로 40개 matched step 에서 평균 step time 이 동기 97.0분 대 비동기 50.8분, 1.91배 차이였다. 비동기 수집이 빠른 task 나 즉시 실패하는 task 를 더 자주 소비할 수 있다는 우려에 대해서는, 대표 실행 두 건에서 task 별 step 수가 중앙값 ±2 이내이고 변동계수가 각각 1.56%, 2.06% 였다고 보고한다.

**학습에 유용한 상태 고르기.** 진화적 RL 은 task 와 operator 뿐 아니라 그 operator 가 작용할 <em>프로그램 상태</em>도 골라야 한다. 균등 샘플링은 고갈된 영역에 업데이트를 낭비하고, greedy 샘플링은 현재 챔피언만 반복 학습해 다양성을 죽인다. OpenMLE 는 세 항을 결합한 fitness 에 비례해 부모를 뽑는다.

$$
F(p) = \text{norm}(R_p) + \text{norm}\left( \mathrm{Var}_{c \in \text{child}(p)} R_c \right) + \text{norm}(C_p)
$$

$R\_p$ 는 강한 부모를 선호하고, 자식 보상 분산은 operator 결과가 아직 정보를 주는 영역을 짚어내고, $C\_p$ 는 방문 횟수에 따라 감소하는 냉각 계수로 한 챔피언이 rollout 예산을 독점하는 것을 막는다. 구현상 Improve/Crossover 는 저장 보상이 양수인 프로그램으로, Debug 는 비양수인 프로그램으로 후보 집합이 제한된다.

**Reward hacking 대응.** 저자들은 어려운 task 에서 보상이 아주 낮은 수준에 빠르게 정체되는 현상을 관찰했고, 케이스 스터디에서 원인을 찾았다. 모델이 sample submission 을 가져와 무작위로 섞어 제출하는 식의 명백한 reward hacking 이었다. 대응은 단순하다. RL 중에 o3-mini 를 LLM judge 로 두고 샌드박스 실행 <em>전에</em> hack 여부를 검사한 뒤, 검출되면 실행을 건너뛰고 보상 $-0.5$ 를 준다.

##### OpenMLE-Evo: 경험으로 장기 탐색을 키우기

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig9-evo-harness.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9: OpenMLE-Evo 탐색 harness. ① 평가된 노드마다 experience card 갱신, ② quality·progress·novelty 세 인자 점수화, ③ softmax 로 부모 선택 후 operator 호출, ④ 선택된 조상(V)·형제(H) 에 대해서만 LLM 메모리 합성."
   zoomable=true %}

원본 AIRA-Evo 와의 차이가 이 절의 전부다. AIRA-Evo 는 대체로 자유 형식 메모리를 저장하고, 그것을 <em>미리</em> 요약하고, 부모를 주로 스칼라 fitness 로 고르고, 서로 다른 operator 에게 대체로 비슷한 히스토리를 준다. OpenMLE-Evo 는 넷 다 바꾼다.

**구조화된 경험 축적.** 샌드박스 평가가 끝나면 노드마다 결정적으로 채워지는 experience card 가 붙는다. 정체성·계보(`node_id`, `operator`, `parents`, `generation_id`), 관측 결과(`score`, `fitness`, `reward`, `status`, `error_signature`), 자원 회계(샌드박스/모델 시간, 비용, 토큰 수), 방법 특성(imports 로부터 자동 검출한 method family, 그 방향이 이미 얼마나 탐색됐는지), 파생 탐색 신호(부모 대비 델타, novelty, rank, 현재 챔피언 여부, selection utility), 그리고 의미론적 증거(plan, analysis, 지연 생성되는 rich summary). 이 카드들을 task 단위로 집계한 것이 experience board 이고, 여기에 method family 별 통계, family 별 최고 노드, 미탐색 방향, 반복 실패, 점수 추세, parent graph 가 들어간다.

핵심은 이 상태가 <strong>결정적이고 질의 가능하다</strong>는 것이다. LLM 요약이 아니라 탐색 상태와 실행 결과에서 그대로 뽑아낸 값이므로, 부모 선택의 입력으로 쓰기에 안전하다.

**세 인자 부모 선택.** 카드 메타데이터를 세 요소로 변환한다. 정규화된 검증 점수 $\tilde{s}\_i$, 가장 강한 부모 대비 양의 개선분 $\widetilde{\Delta}\_i$, 그리고 method-family novelty $\nu\_i$. novelty 는 같은 family 에 이미 기록된 카드 수 $N\_{f\_i}$ 에 대해 $\nu\_i = 1/\sqrt{1 + N\_{f\_i}}$ 로 정의된다. 샘플링된 island $\mathcal{I}$ 안에서 효용과 선택 확률은 다음과 같다.

$$
\begin{aligned}
U_i &= \lambda_s \tilde{s}_i + \lambda_\Delta \widetilde{\Delta}_i + \lambda_n \nu_i, \\
P(i \mid \mathcal{I}) &= \frac{\exp(U_i / \tau)}{\sum_{j \in \mathcal{I}} \exp(U_j / \tau)}
\end{aligned}
$$

즉 부모 선택이 현재 솔루션 품질, 계보 대비 이룬 진전, 그 방향이 나타내는 알고리즘적 참신성 세 가지를 함께 본다. 고품질 쪽으로의 선택 압력은 유지하면서도, 의미 있는 진전을 보인 후보나 유망하지만 덜 탐색된 접근에 예산을 배분한다.

**연산 유발 메모리 합성.** AIRA-Evo 는 평가된 모든 노드의 히스토리를 기본적으로 LLM 으로 요약한다. 나중에 아무 operator 도 선택하지 않을 노드에 추론 예산을 쓰는 데다, 그 요약을 <em>결정 컨텍스트가 정해지기 전에</em> 만든다는 게 더 큰 문제다. OpenMLE-Evo 는 결정적 저장과 LLM 합성을 분리한다. 평가 직후에는 카드와 board 만 남기고, Improve/Crossover/Debug 호출이 관련 노드를 <em>고른 다음에야</em> 선택된 부모와 검색된 조상·형제·에러 관련 시도에 대해서만 메모리 모델을 부르고 그 결과를 캐싱한다.

**operator 조건부 컨텍스트 구성.** 검색 집합의 기본값이 operator 마다 다르다.

| operator | 기본 검색 증거 |
|------|------|
| Draft | 상속 메모리 없음. task 명세에서 독립 브랜치 시작 |
| Improve | 선택된 부모 + 최근 조상 3개 + 상위 직계 형제 3개(부모 선택과 같은 효용으로 랭킹) + 관련 board 필드 |
| Crossover | 두 부모 각각에 대해 최근 조상 2개 + 상위 형제 2개, family 통계와 반복 에러, method-family 상보성 단서 |
| Debug | 현재 버그 노드 + 같은 error signature 를 가진 이전 노드 + 최근 시도, 관련 노드 총 3개까지 |

여기서 "형제(sibling)" 는 부모를 최소 하나 공유하는 이전 후보를 말한다. Improve 는 자기 계보를 수직으로 훑고 근처 대안을 수평으로 대조할 수 있게 되고, Crossover 는 두 브랜치의 호환 가능한 강점과 충돌 지점을 보고, Debug 는 같은 실패 모드에 대한 과거 수리를 재사용한다. 프롬프트에는 남은 탐색 예산 · 남은 스텝 수 · 실행당 제한도 명시돼서, 결정이 실제 연산 제약 안에서 실현 가능하게 유지된다.

#### 학습 데이터와 파이프라인

| 항목 | Frontis-MA1-30B | Frontis-MA1-35B |
|------|------|------|
| Base 모델 | Qwen3-30B-A3B-Thinking-2507 | Qwen3.6-35B-A3B |
| SFT 방식 | full-parameter SFT | full-parameter SFT |
| SFT 프레임워크 | SLIME + Ray + Megatron-LM | SLIME + Ray + Megatron-LM |
| 컨텍스트 컷오프 | 32,768 토큰 | 32,768 토큰 |
| 정밀도 | bfloat16 | bfloat16 |
| Global batch | 128 | 128 |
| Gradient accumulation | 업데이트당 64 microbatch | 업데이트당 32 microbatch |
| Learning rate | $3.0 \times 10^{-5}$, cosine decay to 0, warmup 0.1 | 동일 |
| Epoch | 3 | 3 |
| RL 프레임워크 | SLIME + Ray + SGLang | SLIME + Ray + SGLang |
| operator 샘플링 확률 | Draft 0.50 · Improve 0.17 · Debug 0.17 · Crossover 0.16 | 동일 |
| Rollout group | rollout 당 prompt 16개 × 샘플 16개, global batch 128, rollout 당 optimizer step 2회 | 동일 |
| 생성 설정 | temperature 1.0, 최대 응답 24,576 토큰 | 동일 |
| Objective | GSPO + TTT-Discover 스타일 reward post-processing, clip $\epsilon = 3.5 \times 10^{-4}$, TIS 활성 | 동일 |
| Optimizer | Adam, lr $1.0 \times 10^{-6}$ constant, weight decay 0.1, $\beta\_1 = 0.9$, $\beta\_2 = 0.98$ | 동일 |

`<think>` 지도는 두 모델 모두 유지한다. 30B 는 qwen3 loss mask, 35B 는 qwen3_5 호환 loss mask 를 쓴다.

평가 설정은 다음과 같다. 공식 22-task MLE-Bench Lite split 을 쓰고, 별도 언급이 없으면 각 OpenMLE-Evo 구성을 독립 실행 3회로 평가한다. task 당 예산은 <strong>RTX 4090 한 장(12 GB VRAM)에서 12시간</strong> 이다. 저자들이 강조하듯 이는 공식 MLE-Bench runs registry 에 보고된 대다수 평가보다 작은 task 당 샌드박스 연산 예산이다(다만 이 비교는 accelerator 할당과 wall-clock 예산만 보며 모델 추론 비용이나 FLOPs 정규화는 하지 않는다).

**OpenMLE-Evo-Max** 는 표준 구성을 두 방향으로 확장한 것이다. 첫째, 공개 대회 산출물에서 재사용 가능한 cross-task prior 를 증류한다(증류 전에 MLE-Bench 관련 소스는 전부 배제). 둘째, 총 샌드박스 연산 예산은 그대로 두고 비동기 multi-GPU 병렬 탐색을 켠다.

#### 실험 결과

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig1-mlebench-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: MLE-Bench Lite 결과. 왼쪽은 완료된 모든 harness 결과, 오른쪽 Pareto 패널은 모델 크기 대비 최고 harness 성능. Frontis-MA1-35B 가 1T 이상 규모 모델들 사이에 35B 로 올라와 있다."
   zoomable=true %}

##### 학습 이득과 탐색 이득이 합쳐진다

동일한 OpenMLE-Evo harness 아래에서의 통제 비교가 이 논문의 1차 증거다.

| 모델 | Framework | Valid Rate | Medal Average | Human Rank |
|------|------|------|------|------|
| Qwen3.6-35B-A3B (base) | OpenMLE-Evo | 19.67/22 | 39.39% | 0.5828 |
| Frontis-MA1-35B | OpenMLE-Evo | 21.67/22 | 60.61% | 0.7647 |
| Frontis-MA1-35B | OpenMLE-Evo-Max | 22.00/22 | 71.21% | 0.8126 |
| Qwen3-30B-A3B-Thinking-2507 (base) | OpenMLE-Evo | 17.33/22 | 34.85% | 0.5573 |
| Frontis-MA1-30B | OpenMLE-Evo | 21.67/22 | 53.03% | 0.7055 |
| Frontis-MA1-30B | OpenMLE-Evo-Max | 22.00/22 | 66.67% | 0.8053 |

harness 를 완전히 고정한 상태에서 post-training 만으로 Medal Average 가 21.22 포인트(39.39 → 60.61) 오른다. 두 번째 백본에서도 18.18 포인트(34.85 → 53.03)로 재현되므로 특정 체크포인트의 운은 아니다. 여기에 OpenMLE-Evo-Max 를 얹으면 71.21% 로, GPT-5.5 + Codex(68.18%)를 3.03 포인트 앞선다.

##### harness 를 고정하고 모델을 바꾸기 / 모델을 고정하고 harness 를 바꾸기

| 모델 | 일반 harness | OpenMLE-Evo | OpenMLE-Evo-Max |
|------|------|------|------|
| GLM-5.2 | Claude Code 59.09% | 62.12% | 66.67% |
| MiniMax M3 | Codex 54.55% | 59.09% | 65.15% |
| Kimi K2.6 | Claude Code 59.09% | 66.67% | — |
| MiniMax M2.7 | Claude Code 45.50% | 50.00% | — |
| Frontis-MA1-35B | AIRA-Evo 53.03% | 60.61% | 71.21% |

네 개의 프런티어 모델 전부에서 OpenMLE-Evo 가 범용 코딩 에이전트 harness 를 이긴다. 그리고 Frontis-MA1-35B 에 대해서는 원본 AIRA-Evo 53.03% → OpenMLE-Evo 60.61% 로, 같은 모델·같은 operator 어휘를 쓰면서 <em>탐색이 실행 증거를 쓰는 방식만 바꿔서</em> 7.58 포인트를 얻는다. 이 항목이 §5 의 세 가지 설계 변경을 정당화하는 가장 직접적인 수치다.

참고로 범용 harness 쪽 상위권은 GPT-5.6 Sol + Codex 72.73%(Human Rank 0.8891), Kimi K3 + Claude Code 72.73%(0.8574), Claude Opus 4.8 + Claude Code 63.64%, Gemini 3.5 Flash + Gemini CLI 63.64%, Claude Sonnet 5 + Claude Code 59.09% 다.

##### 장기 자기개선

이 논문에서 가장 흥미로운 관찰은 총점이 아니라 <strong>점수가 언제 오르는가</strong>다. Frontis-MA1-35B + OpenMLE-Evo-Max 는 12시간 내내 개선을 이어가고, 검증 68.18% 대비 최종 테스트 71.21% 로 오히려 일반화가 좋다(GPT-5.6 Sol 과 Kimi K3 는 검증 77.3% 에서 테스트 72.7% 로 떨어진다).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig13-leaf-trajectory.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 13: leaf-classification 의 모델별 탐색 궤적. 초반 두 번의 Debug 로 image·tabular 브랜치를 세우고, 두 번의 Crossover 로 융합하고, 마지막 Improve 가 ConvNeXt-Tiny 로 가장 큰 도약을 만든다."
   zoomable=true %}

leaf-classification 궤적이 대표적이다. 스텝 2 Debug 가 multiclass 라벨 인코딩 · 불안정한 fold · LightGBM 정규화를 고쳐 log loss 0.44622(Human Rank 0.3534)를 만들고, 스텝 4 Debug 가 99개 클래스를 모두 커버하도록 ResNet18 브랜치를 안정화해 0.23730(0.4160)으로, 스텝 11 Improve 가 EfficientNet 임베딩에 192개 엔지니어링 feature 를 결합해 0.17472(0.4398)로, 스텝 15 Crossover 가 ResNet18 브랜치와 정규화된 LightGBM feature 를 하나의 hybrid 로 융합해 0.13123(0.4737)으로, 스텝 29 Crossover 가 augmentation·early stopping·TTA 를 더해 0.08268(0.5407)로, 마지막 스텝 45 Improve 가 ConvNeXt-Tiny 임베딩과 정규화 MLP 로 0.02990(0.7713)까지 간다. 후반부 Improve 와 Crossover 가 <strong>전체 검증 이득의 85.0%</strong> 를 만든다. held-out 최종은 Human Rank 0.9455 로 Bronze 이고, 가장 강한 비교 모델은 검증 0.6303 에서 멈추고 메달을 못 딴다.

mlsp-2013-birds 에서는 이 경향이 더 극단적이다. Improve 와 Crossover 가 검증 개선의 <strong>91.9%</strong> 를 차지한다. 스텝 5 Debug 로 제출을 유효하게 만든 뒤(AUC 0.74786), 스텝 48 Improve 가 필터링된 스펙트로그램과 segment 히스토그램을 EfficientNet-B0 및 MLP 와 융합하고(0.79390), 스텝 71-72 Crossover 가 안전한 파싱·SpecAugment·계층 CV·EfficientNet-B2 + TTA 를 결합하고(0.82774), 스텝 118 Crossover 가 클래스 가중치를 더하고(0.85744), 스텝 119 Improve 가 focal loss 와 TTA 로 희귀종 예측을 개선하고(0.87737), 스텝 150 Crossover 가 메모리가 지목한 EfficientNet-B2 브랜치를 선택해 0.88576 에 도달한다. held-out Human Rank 0.8889 로 Silver. 여기서 저자들이 강조하는 것은 메모리의 <em>양</em>이 아니라 <em>선택</em>이다. 어떤 브랜치가 robust parsing · imbalance handling · augmentation · 표현 품질에 기여했는지 보존하는 동시에, 열등한 ResNet50 방향은 "피해야 할 증거" 로 표시한다.

##### 솔루션 천장

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig15-medal-tier.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 15: Gold/Silver/Bronze 분해. 학습과 탐색 개선이 Bronze 문턱을 넘기는 솔루션 수만 늘리는 게 아니라 Gold 비중 자체를 키운다."
   zoomable=true %}

메달 수가 늘었다는 것만으로는 "간신히 Bronze 를 더 땄다" 와 구별되지 않는다. Figure 15 의 등급 분해는 post-training 과 OpenMLE-Evo-Max 가 성공 솔루션을 Gold 쪽으로 밀어올린다는 것을 보여준다. 30B 비교에서도 같은 방향의 변화가 재현되고, 모델을 고정한 GLM-5.2 · MiniMax M3 비교에서도 나타나므로 이 패턴은 탐색 개선에도 적용된다. 외부 시스템과 비교하면 Frontis-MA1-35B + OpenMLE-Evo-Max 가 Claude Opus 4.8 + Claude Code 와 Gemini 3.5 Flash + Gemini CLI 를 앞서고, Kimi K3 의 Gold 비율과 대등하다.

##### 탐색 효율과 메커니즘

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig16-search-efficiency.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 16: 원본 AIRA-Evo(회색)와 OpenMLE-Evo(청록)의 탐색 효율. 같은 체크포인트·같은 시드·12시간 예산·harness 당 66개 task-run 기준."
   zoomable=true %}

같은 Frontis-MA1-35B 체크포인트, 같은 시드, 같은 12시간 예산, harness 당 66개 task-run 을 맞춘 비교다.

| 지표 | AIRA-Evo | OpenMLE-Evo | 변화 |
|------|------|------|------|
| 총 모델 토큰 | 129.3M | 75.3M | −41.7% |
| Prompt 토큰 | 83.5M | 41.5M | −50.3% |
| 평가된 노드 수 | 3,430 | 3,004 | −12.4% |
| 신기록 검증 갱신 | 229 | 246 | +7.4% |
| 모델 토큰 100만당 신기록 갱신 | 1.77 | 3.27 | +84.3% |
| 신기록을 세운 Improve 비율 | 44/931 (4.73%) | 72/769 (9.36%) | +98.1% |
| Improve 프롬프트 평균 길이 | 102.8K자 | 35.7K자 | −65.3% |
| Improve 프롬프트 99분위 | 389.0K자 | 54.3K자 | −86.1% |
| Crossover 프롬프트 평균 | 140.4K자 | 55.3K자 | −60.6% |
| Crossover 프롬프트 99분위 | 419.2K자 | 78.4K자 | −81.3% |

읽는 법이 중요하다. 노드 수는 12.4% 밖에 안 줄었는데 토큰은 41.7% 줄었다. 절약이 "탐색을 일찍 끝내서" 나 "후보를 훨씬 적게 평가해서" 가 아니라 <strong>확장 한 번을 더 싸게 만들어서</strong> 나왔다는 뜻이다. 그리고 압축은 꼬리에서 특히 강하다. Improve 프롬프트 99분위가 389K → 54.3K 로 줄었다는 것은, 자유 형식 히스토리가 무한정 늘어나 매 요청에 통째로 직렬화되던 최악의 경우가 사라졌다는 의미다.

Figure 17 과 Figure 18 은 이 메커니즘을 개별 궤적에서 짚는다. nomad2018-predict-transparent-conductors 에서 원본 AIRA-Evo 는 Draft 실패 후 하나의 계보를 따라 7번 연속 Debug 하며 점점 커지는 히스토리를 물려받고, 최종 검증 RMSE 0.06633 · held-out 0.06096 에 그친다. OpenMLE-Evo 는 스텝 81 에서 상보적 증거로 targeted Crossover 를 구성한다. 한쪽 부모는 원자 속성 · 동적 공유결합 엣지 · 단위격자 부피를 제공하고(검증 RMSE 0.06309), 다른 쪽은 불규칙한 `.xyz` 기하 구조를 견디는 robust parser 를 제공한다(0.06573). 여기에 수평 메모리가 RDF 캐시 `TypeError` 와 3328 × 94 feature 불일치를 <em>음의 증거</em>로 표시해 자식 컨텍스트에 조용히 섞여 들어가는 것을 막는다. 결과는 검증 0.06087 · held-out 0.05410 으로 각각 8.2%, 11.3% 개선이다.

right-whale-redux 는 세 인자 선택이 왜 필요한지 보여준다. 원본 AIRA-Evo 에서는 독립 수리된 두 브랜치가 검증 AUC 0.94656 과 0.85546 에 도달하고, 점수만 보는 선택이 강한 쪽을 남겨 held-out AUC 0.94852 로 끝난다. OpenMLE-Evo 의 스텝 10 후보 풀에서는 Parent A 가 AUC 0.99187 로 점수 1위(ResNet-SE + 64-Mel + AMP + TTA)이고, Parent B 는 0.98773 으로 점수는 6위지만 자기 부모 대비 0.00568 개선해 gain 1위다(Log-Mel + Delta/Delta-Delta 시간 채널). Score/Gain/Novelty 가중치 1.0/0.6/0.3 을 적용하면 Parent B 의 효용 순위가 1위로 올라오고, 같은 10-부모 풀 안에서 선택 확률이 10.47% → 17.09% 로 상대 63.2% 증가한다. Parent B 가 Improve 대상으로 선택되어 나온 자식이 검증 AUC 0.99203, held-out 0.99386 이다. 다만 저자들 스스로 "전체 프레임워크가 targeted Memory 도 함께 바꾸므로 원본 AIRA-Evo 와의 end-to-end 차이를 세 가중치만으로 돌려선 안 된다" 고 못 박는다.

##### modality 별 성능과 NatureBench 전이

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig19-modality.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 19: MLE-Bench Lite 의 modality 별 결과. 넓은 외곽선 막대가 Medal Rate, 좁은 채움 막대가 평균 Human Rank."
   zoomable=true %}

22개 task 를 image(9) · text(5) · tabular/structured(4) · audio(2) · multimodal(2) 다섯 그룹으로 나눠 보면, Frontis-MA1-35B 는 같은 harness 의 Qwen3.6-35B-A3B 대비 <em>다섯 그룹 모두에서</em> 평균 Human Rank 를 올리고 그룹별 Medal Rate 를 한 번도 낮추지 않는다. Medal Rate 기준으로 image 44% → 52%, text 33% → 60%, tabular 42% → 50%, audio 33% → 100%, multimodal 33% → 83%. 늘어난 14개 메달이 image/text/tabular/audio/multimodal 에 +2/+4/+1/+4/+3 으로 흩어져 있으므로 총계 이득이 한 modality 때문은 아니다. 다만 audio 와 multimodal 은 각각 2개 task 뿐이라 그 극적인 수치(33% → 100%)의 해상도는 낮다.

NatureBench (Wang et al., 2026)는 코딩 에이전트가 발표된 과학 결과를 재현하거나 능가할 수 있는지를 묻는 벤치마크로, Nature 계열 논문에서 추출한 90개 컨테이너화 task 를 6개 과학 도메인에 걸쳐 담고 있다. 이질적인 과학 지표를 방향 정규화된 상대 격차로 비교한다.

$$
g = \mathrm{dir} \cdot \frac{m - m_{\text{SOTA}}}{|m_{\text{SOTA}}|}, \qquad \mathrm{dir} \in \{-1, +1\}
$$

Match-SOTA(All M)는 $g \ge 0$ 인 task 비율, Surpass-SOTA(All S)는 $g > 0.1$ 인 더 엄격한 비율이다. 전이 실험은 6개 도메인과 6개 입력 modality 계열, 4개 ML task 타입을 아우르는 고정 10-task 부분집합 NatureBench Lite 에서 수행되고, NatureBench 의 컨테이너 · 숨겨진 평가기 · 유효성 규칙 · 웹 검색 비활성 · task 당 4시간 탐색 예산을 그대로 유지한다.

| 구성 | All S | All M |
|------|------|------|
| Frontis-MA1-35B + OpenMLE-Evo NB adapter | 30.0% (3/10) | 70.0% (7/10) |
| Qwen3.6-35B-A3B + OpenMLE-Evo NB adapter | 20.0% (2/10) | 50.0% (5/10) |
| Qwen3.6-35B-A3B + 원본 AIRA-Evo | 10.0% (1/10) | 20.0% (2/10) |

adapter 를 고정하고 모델만 바꾸면 All M 이 50% → 70%, 모델을 고정하고 harness 만 바꾸면 20% → 50% 다. 두 요소의 기여가 분리되어 관측된다는 점이 핵심이다. 결과적으로 결합 시스템은 이 부분집합에서 GPT-5.4, GLM-5.1, MiniMax-M3 가 달성한 3/10 · 7/10 과 같고, DeepSeek-V4-Pro · Claude Opus 4.6 · MiniMax-M2.7 구성을 넘는다. 다만 상위권인 Claude Opus 4.7 과 GLM-5.2(둘 다 Claude Code 로 7/10 · 10/10)에는 못 미친다.

protein variant effect prediction 궤적 하나가 상세히 소개되는데, 11개 protein-assay 인스턴스에 걸친 task 수준 집계 개선이 $g = 0.1161$ 로 base 의 $g = 0.0243$ 을 크게 앞선다. 탐색은 유효 Draft 0.0679 에서 시작해 Debug·Improve 를 거쳐 Crossover 챔피언 0.1016 에 이르는데, 여기서 챔피언만 탐욕적으로 다듬는 대신 세 인자 선택기가 별도의 0.0955 브랜치를 다시 방문한다. 수직·수평 메모리가 성공적인 물리화학적 feature 를 보존하면서 근처의 timeout · `KeyError` · 중첩 매핑 실패를 노출하고, 결과 Improve 노드가 robust flat mapping 을 유지한 채 학습 라벨 기반 위치 prior 와 5-fold LightGBM 앙상블을 더해 0.1161 에 도달한다.

#### 결과 분석 / Ablation

이 논문의 실험 설계에서 실제로 <em>분리</em>되는 것과 <em>분리되지 않는</em> 것을 구분해서 보는 게 중요하다.

**분리되는 것 ①: 모델 대 harness.** harness 를 완전히 고정하고 체크포인트만 갈아끼운 39.39% → 60.61% 는 이 논문에서 가장 깨끗한 숫자다. 두 개의 백본에서 각각 21.22 포인트와 18.18 포인트로 재현되고, NatureBench Lite 에서도 같은 방향(All M 50% → 70%)이 나온다. 반대 방향, 즉 모델을 고정하고 harness 만 바꾼 비교도 네 개의 프런티어 모델과 원본 AIRA-Evo 에 대해 각각 성립한다.

**분리되는 것 ②: 진화 harness 의 효율.** Figure 16 의 66개 matched task-run 비교는 같은 체크포인트·같은 시드를 쓰기 때문에 harness 차이만 남는다. 여기서 "노드는 12.4% 줄었는데 토큰은 41.7% 줄었다" 는 비대칭이 bounded context 라는 메커니즘 주장을 뒷받침한다. 만약 절약이 단순히 탐색을 일찍 끝낸 데서 왔다면 두 수치가 비슷하게 줄었어야 한다.

**분리되지 않는 것 ①: OpenMLE-Evo 세 컴포넌트의 개별 기여.** structured experience card, 세 인자 부모 선택, on-demand 메모리 합성 — 이 셋 중 무엇이 7.58 포인트(53.03 → 60.61)를 만들었는지에 대한 통제 ablation 이 없다. Figure 17 과 18 은 잘 고른 궤적 두 개이고, 저자들도 이를 "grounded trace" 라고 부르지 절대 ablation 이라고 주장하지 않는다. $\lambda\_s / \lambda\_\Delta / \lambda\_n = 1.0/0.6/0.3$ 이라는 가중치도 sweep 없이 고정값이고, 저자들이 §8 에서 task 의존적 가중치 학습을 future work 로 명시한다.

**분리되지 않는 것 ②: post-training 과 teacher distillation.** SFT 코퍼스는 GLM-4.7 이 만들고 DeepSeek-V4-Pro 가 선별한 것이다. 즉 "post-training 이득 21.22 포인트" 의 상당 부분은 <strong>더 강한 teacher 로부터의 증류</strong>이고, Frontis-MA1 이 자기 궤적으로 자기를 개선한 결과가 아니다. RSI 서사에서 이건 중요한 구분이다. 논문은 이 점을 숨기지 않지만(§B.1 에 teacher 를 명시한다), 제목과 abstract 의 "towards Recursive Self-Improvement" 라는 표현은 실제로 닫힌 루프가 한 바퀴 돌았다는 인상을 주기 쉽다. 실제로 관측된 것은 루프의 절반, 즉 "진화 궤적으로 operator 를 학습시킬 수 있다" 까지다.

**분리되지 않는 것 ③: OpenMLE-Evo-Max 안의 두 변화.** 60.61 → 71.21 이라는 10.6 포인트 점프는 (a) cross-task experience prior 주입과 (b) 비동기 multi-GPU 병렬 탐색이 <em>동시에</em> 켜진 결과다. 둘의 기여 비율이 보고되지 않는다. 그리고 (a)의 "MLE-Bench 관련 소스는 전부 배제" 라는 주장은 감사하기 까다롭다. Kaggle 대회 write-up 은 대회 경계를 넘어 기법을 공유하므로, "이 대회의 데이터가 아니다" 와 "이 대회를 푸는 데 필요한 정보가 아니다" 는 다른 명제다.

**operator 지도 분포와 성능 기여의 역전.** 이게 가장 흥미로운 긴장이다. SFT 코퍼스는 Draft 74.0% · Debug 16.5% · Improve 6.6% · Crossover 2.8% 로 압도적으로 Draft 에 쏠려 있다. 그런데 §6.3 의 메커니즘 분석은 검증 이득의 85.0%(leaf-classification)와 91.9%(mlsp-2013-birds)가 후반 Improve 와 Crossover 에서 나온다고 말한다. 가장 적게 지도한 두 operator 가 가장 크게 기여한다는 뜻이다. 두 가지 해석이 가능하다. 낙관적으로는 Improve/Crossover 지도의 표본 효율이 매우 높다는 것이고, 비관적으로는 이 두 operator 의 성능이 대부분 base 모델의 일반 코딩 능력과 harness 가 주는 잘 구조화된 컨텍스트에서 나오고 SFT 기여는 작다는 것이다. operator 별 지도 비율을 바꿔가며 하는 ablation 이 있었다면 답이 나왔을 텐데, 없다.

**RL 보상 설계의 효과.** Figure 8 은 entropic weighting 이 rollout group 내 최고 후보에 배정되는 평균 처리 advantage 를 1.58 → 6.39 로 4.0배 키운다는 것과, adaptive bounds 와 결합했을 때 smoothed Group Best Reward 최고점이 0.666(이전 보상 구성 대비 +0.089)이 된다는 것을 보여준다. 함께 표시된 테스트 medal rate 24.2 ± 5.7 → 34.8 ± 4.3 은 <em>초기 단계의 더 단순한 harness</em>로 측정한 값이므로 본문 표의 60.61% 와 직접 비교하면 안 된다. 이 각주를 달아둔 건 저자들의 정직한 태도다.

**분산의 크기.** Appendix D.1 의 3-epoch 재현 통계는 반드시 같이 봐야 한다. Frontis-MA1-35B + OpenMLE-Evo 는 60.61% ± 7.73%, Evo-Max 는 71.21% ± 8.57%, base 는 39.39% ± 5.67% 다. base 대비 21.22 포인트 이득은 이 분산을 뚫고 남지만, 71.21% 대 GLM-5.2 Evo-Max 66.67% ± 8.57% 같은 근접 비교는 통계적으로 구별되지 않는다. 게다가 Codex · Claude Code · Gemini CLI 참조는 비용 때문에 <strong>단 1회만 평가</strong>돼 점 추정치로 남아 있다. 즉 "GPT-5.5 + Codex 를 3.03 포인트 앞섰다" 는 문장은 한쪽은 3회 평균, 다른 쪽은 1회 관측인 비교다.

#### 한계와 비판적 평가

**저자가 인정한 한계 (§8).** 저자들은 RSI 까지의 격차를 다섯 개의 능력 경계로 정리한다. (1) 실행 결과라는 단일 신호로는 어떤 <em>연구 방향</em>이 유망하고 일반화 가능하고 추가 연산을 들일 가치가 있는지 판단할 수 없다. 가설·추론 과정·비평·이전 가능한 연구 전략의 품질을 담는 목적함수가 필요하다. (2) 학습된 operator 를 외부 진화 harness 로 조합하는 현재 구조는 모델이 스스로 시작할 수 있는 행동 범위를 제한한다. (3) 에이전트가 개선하는 대상이 외부 ML 산출물에 한정돼 있고, 언어 모델 자체의 개선에는 참여하지 않는다. (4) 진화가 후보 솔루션 위에서만 일어나고 진화 시스템 자체는 고정돼 있다. (5) experience card 에 담긴 풍부한 메타데이터 중 부모 선택이 실제로 쓰는 것은 세 인자뿐이다.

**리뷰어로서 추가로 보이는 것들.**

<em>RSI 주장과 실증 사이의 간극.</em> 위에서 짚었듯 meta-evolution 은 1세대까지만 관측됐다. 진짜 RSI 검증은 "Frontis-MA1 이 만든 궤적으로 Frontis-MA1-gen2 를 학습시켰더니 다시 좋아지더라" 인데, 이 실험이 없다. 논문의 마지막 문단이 "OpenMLE 가 일반적·자율적 재귀 자기개선을 실현한다는 주장이 아니라 그 진전을 연구하기 위한 테스트베드" 라고 명시적으로 물러서는 것은 적절하지만, 그렇다면 제목의 무게는 과하다.

<em>22개 task 라는 해상도.</em> MLE-Bench Lite 는 22개 task 이므로 task 하나가 4.55 포인트다. 60.61% 와 66.67% 는 task 1.3개 차이다. NatureBench Lite 는 10개 task 이므로 task 하나가 10 포인트이고, 저자들도 이 점을 명시한다. 이 해상도에서 3회 평균과 1회 관측을 섞어 순위를 매기는 것은 위험하다.

<em>연산 예산 비교의 양날.</em> RTX 4090 12 GB · 12시간이라는 예산은 24시간 · H200 이나 2×A100 을 쓴 시스템들보다 확실히 작고, 이건 진짜 강점이다. 하지만 같은 이유로 "GPT-5.6 Sol 72.73% 에 근접" 같은 비교도 조건이 다른 비교다. Appendix Table 11 이 "점수는 엄밀히 비교 가능하지 않다" 고 각주를 다는 건 이 때문인데, 그 각주가 본문의 서사에는 충분히 반영되지 않는다.

<em>공개 스택 안의 비공개 의존.</em> reward hacking 검출에 o3-mini 를 LLM judge 로 쓰고, SFT teacher 로 GLM-4.7 과 DeepSeek-V4-Pro 를 쓴다. "전체 스택 공개" 라는 주장의 실효성은 이 외부 API 들에 접근 가능한지에 달려 있다. 그리고 reward hacking judge 의 오탐률(정상 솔루션을 hack 으로 오인해 $-0.5$ 를 주는 비율)이 보고되지 않는데, 이건 학습 신호를 직접 오염시킬 수 있는 값이다.

<em>데이터 공개의 부분성.</em> 5,758개 task 중 전체 패키지 데이터가 공개되는 것은 1,415개(24.6%)뿐이다. 나머지 4,343개는 `prepare.py` 와 `metric.py` 만 나온다. 라이선스 제약상 불가피하지만, "5,758개 task 로 학습했다" 는 결과를 외부에서 그대로 재현하는 것은 불가능하다는 뜻이다.

<em>평가 지표의 구조적 한계.</em> Medal Average 와 Human Rank 는 모두 Kaggle 리더보드라는 고정된 역사적 분포에 기대고 있다. 대회 테스트 split 밖에서 솔루션이 일반화되는지, 학습·추론 비용이 실용적인지는 측정되지 않는다. 12시간 동안 탐색해서 얻은 프로그램의 <em>운영 비용</em>도 보고되지 않는데, MLE 자동화의 실무 가치를 논하려면 필요한 숫자다.

#### 시사점 / Takeaways

- **학습 단위와 호출 단위를 같게 맞추는 것이 harness 를 정교하게 만드는 것보다 먼저다.** 이 논문에서 harness 만 바꿔 얻은 이득(53.03 → 60.61)과 모델만 바꿔 얻은 이득(39.39 → 60.61)이 둘 다 존재하고 서로 합쳐진다는 것이 핵심 관측이다. 그리고 둘이 합쳐질 수 있었던 이유는 Draft/Improve/Debug/Crossover 라는 네 동사를 양쪽이 같은 의미로 쓰기 때문이다. 에이전트 시스템을 설계할 때 "모델이 배운 행동" 과 "스캐폴드가 부르는 행동" 의 어휘를 일치시키는 것은 공짜에 가까운 설계 결정인데 자주 생략된다.
- **장기 탐색에서 컨텍스트를 잘라내는 것이 컨텍스트를 늘리는 것보다 낫다.** Improve 프롬프트 99분위가 389K자에서 54.3K자로 줄면서 토큰당 신기록 갱신이 84.3% 늘었다. 무한정 자라는 히스토리를 매 요청에 직렬화하는 것은 비용만 늘리는 게 아니라 신호 대 잡음비를 떨어뜨린다. 관련 있는 조상 3개 · 형제 3개 같은 <em>작고 구조화된</em> 컨텍스트가 더 낫다는 실증이 꽤 설득력 있다.
- **결정적 상태와 LLM 요약을 분리하고, 요약은 필요할 때만 하라.** experience card 는 실행 결과에서 그대로 뽑은 결정적 값이라 부모 선택의 입력으로 안전하고, 자연어 메모리는 어떤 operator 가 어떤 노드를 골랐는지 알고 난 뒤에 만들어야 그 결정 맥락에 맞는다. "미리 다 요약해두기" 는 직관적이지만 예산도 낭비하고 품질도 떨어뜨린다.
- **보상 스케일이 학습 신호의 해상도를 결정한다.** 리더보드나 이론적 극값 같은 고정 bound 를 쓰면 현재 정책이 실제로 도달한 좁은 점수 영역 안의 차이가 뭉개진다. on-policy frontier 에서 bound 를 다시 잡고(adaptive bounds) 상위 꼬리를 증폭하는(entropic advantage) 순서는 검증 가능한 보상을 쓰는 다른 도메인에도 그대로 이식 가능한 레시피다.
- **"RSI 를 향해" 라는 서사와 실제로 측정된 것을 분리해서 읽어야 한다.** 이 논문이 보인 것은 진화 궤적으로 program-transformation operator 를 학습시킬 수 있고 그 이득이 탐색 이득과 합쳐진다는 것이다. 자기 궤적으로 자기를 개선하는 2세대 실험은 없다. 그럼에도 데이터·샌드박스·학습 코드·RL 방법·평가·가중치 여섯 축을 모두 공개한 첫 사례라는 점에서, 그 2세대 실험을 <em>남이 해볼 수 있게</em> 만들었다는 기여는 별개로 크다.

#### 설치 및 사용법

전체 스택은 [FrontisAI/OpenRSI](https://github.com/FrontisAI/OpenRSI) 에 공개돼 있고, 모델 가중치는 [HuggingFace 컬렉션](https://huggingface.co/collections/FrontisAI/frontis-ma1) 에서 받을 수 있다. 프로젝트 페이지는 [frontisai.github.io/OpenRSI](https://frontisai.github.io/OpenRSI) 다.

OpenMLE-Gym 의 task 패키지 규약은 아래 레이아웃을 따르므로, 자체 데이터셋을 같은 형식으로 맞추면 harness 를 그대로 재사용할 수 있다.

```text
task_package/
├── raw/                        # 원본 대회 자산
├── data/
│   ├── public/                 # 에이전트에게 보이는 부분
│   │   ├── description.txt
│   │   ├── train.csv  /  train/ ...
│   │   ├── test.csv   /  test/  ...
│   │   └── sample_submission.csv
│   └── private/                # 숨겨진 정답
│       └── test_answer.csv
└── utils/
    ├── prepare.py              # 결정적 train/test 분할
    └── metric.py               # 예측 파일 검증 + 스칼라 점수 반환
```

샌드박스는 프로그램에 `DATA_DIR` 환경변수로 공개 데이터 경로를 주입하고, 다음과 같은 형태로 실행한 뒤 구조화된 레코드를 돌려준다.

```bash
export DATA_DIR=<task-public-data-dir>
python <sandbox-job-workspace>/code/main.py \
  2>&1 | tee -a <sandbox-job-workspace>/sandbox_stdout.log
```

반환 레코드에는 `score`, `status`, `error_type`(여섯 피드백 모드 중 하나), 런타임 메타데이터, workspace 산출물이 담긴다. 예를 들어 설치된 PyTorch 가 지원하지 않는 인자를 쓴 경우 `error_type: code_execution_error` 와 함께 traceback 이 그대로 전달되어 다음 Debug 호출의 근거가 된다.

#### 참고 자료

- 논문: [arXiv:2607.28568](https://arxiv.org/abs/2607.28568)
- Code: [github.com/FrontisAI/OpenRSI](https://github.com/FrontisAI/OpenRSI)
- 모델 가중치: [HuggingFace — FrontisAI/frontis-ma1](https://huggingface.co/collections/FrontisAI/frontis-ma1)
- 프로젝트 페이지: [frontisai.github.io/OpenRSI](https://frontisai.github.io/OpenRSI)

#### 더 읽어보기

- **[MLE-bench: Evaluating Machine Learning Agents on Machine Learning Engineering](https://arxiv.org/abs/2410.07095)** (Chan et al., 2024) — 이 논문의 주 평가 벤치마크. 75개 Kaggle 대회를 에이전트 과제로 포장하고 사람 리더보드 메달 기준으로 채점한다.
- **[AIDE: AI-Driven Exploration in the Space of Code](https://arxiv.org/abs/2502.13138)** (Jiang et al., 2025) — Draft/Improve/Debug 계열 코드 공간 트리 탐색의 원형. OpenMLE 의 operator 어휘가 여기서 출발한다.
- **[AI Research Agents for Machine Learning: Search, Exploration, and Generalization in MLE-bench](https://arxiv.org/abs/2507.02554)** (Toledo et al., 2025) — AIRA-dojo. 이 논문의 baseline harness 인 원본 AIRA-Evo 의 출처이자, 탐색 정책·operator 품질이 성능을 가른다는 분석의 근거.
- **[AIRA_2: Overcoming Bottlenecks in AI Research Agents](https://arxiv.org/abs/2603.26499)** (Hambardzumyan et al., 2026) — OpenMLE-Evo-Max 의 비동기 병렬 탐색이 참고한 후속 작업.
- **[MLE-Smith: Scaling MLE Tasks with Automated Multi-Agent Pipeline](https://arxiv.org/abs/2510.07307)** (Qiang et al., 2025) — OpenMLE-Gym 의 Kaggle Dataset 3,362개 task 를 만든 dataset-to-task 파이프라인의 원본.
- **[NatureBench: Can Coding Agents Match the Published SOTA of Nature-Family Papers?](https://arxiv.org/abs/2606.24530)** (Wang et al., 2026) — 전이 실험에 쓰인 과학 AutoResearch 벤치마크. 90개 컨테이너화 task 와 direction-normalized relative gap 지표를 정의한다.
- **[Learning to Discover at Test Time](https://arxiv.org/abs/2601.16175)** (Yuksekgonul et al., 2026) — OpenMLE-ERL 의 entropic advantage 가 따르는 upper-tail 원칙(TTT-Discover)의 출처.

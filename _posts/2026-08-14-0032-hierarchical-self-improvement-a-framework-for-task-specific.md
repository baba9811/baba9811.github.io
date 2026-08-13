---
layout: post
title: "[논문 리뷰] Hierarchical Self-Improvement: A Framework for Task-Specific Evolvable Agent Harnesses"
date: 2026-08-14 14:00:00 +0900
description: "모델을 얼려둔 채 에이전트 하네스만 3계층으로 진화시켜 BALROG 에서 BabyAI +39.3, Crafter +33.0 을 얻고, 그 개선이 어디서 멈추는지까지 실증한 프레임워크"
tags: ["llm-agents", "self-improvement", "agent-harness", "meta-evolution", "balrog", "frozen-backbone"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/fig1-hsi-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/
en_url: /en/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Tailin Zhou (HKUST) |
| 학회 | arXiv preprint · 2026 |
| arXiv 또는 DOI | [2608.08466](https://arxiv.org/abs/2608.08466) |
| Code | [TailinZhou/hsi](https://github.com/TailinZhou/hsi) |
| 데이터 | BALROG — BabyAI · BabaIsAI · Crafter · MiniHack · TextWorld · NLE 의 6개 장기 호흡 텍스트 게임 환경 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-08-14 |

## TL;DR

- 모델 파라미터를 전혀 건드리지 않고 **에이전트를 둘러싼 실행 스캐폴드 (harness) 만** 진화시킨다. 하나의 frozen LLM 이 세 계층 — 태스크를 수행하는 harness $H$, $H$ 를 고쳐 쓰는 evolver, evolver 의 전략 $\Sigma$ 를 고쳐 쓰는 meta-evolver — 에서 동시에 동작하며, 가장 바깥 실행 로직만 frozen anchor 로 고정해 무제한 자기참조를 막는다.
- DeepSeek-V4-Flash 를 frozen backbone 으로 BALROG 에서 초기 harness 대비 BabyAI +39.3, Crafter +33.0, TextWorld +25.0, MiniHack +15.0 (raw % Progress). 5개 환경 평균은 18.9 → 41.4 로 두 배 이상 오른다.
- BabaIsAI 에서 20% 미공개 split 을 두고 평가하면 BreakStop 0.98, GoTo 1.00 으로 held-out 일반화까지 확인된다. 반면 NLE 는 meta-on 에서도 0.2 에 머물러 아무 개선이 없다.
- 핵심 주장은 성능 수치가 아니라 <strong>경계</strong>다. harness 진화는 두 가지 상한에 묶인다 — 진화를 이끌 보상 신호가 있어야 한다는 *feedback-fidelity bound*, 그리고 backbone 이 못 하는 일은 harness 를 아무리 고쳐도 안 된다는 *backbone capability bound*.
- 태스크 실행 중에는 reasoning 을 끄고 (thinking-off), 자기수정 중에만 켜는 설계로 "추론 예산을 더 쓴 것 아니냐"는 교란 요인을 분리해냈다. 이게 이 논문에서 가장 정직한 부분이다.

## 소개 (Introduction)

LLM 에이전트를 개선하는 방법을 떠올려 보면 대부분 두 갈래로 나뉜다. 하나는 모델 자체를 손보는 쪽 — 추가 학습, RLHF, 더 큰 모델로 교체. 다른 하나는 모델 주변을 손보는 쪽 — 프롬프트를 다듬고, 툴을 붙이고, 메모리 구조를 바꾸고, 검증 로직을 넣는다. 후자를 통칭해 **harness** 라고 부른다. 실무에서 에이전트를 만들어 본 사람이라면 두 번째가 실제로 성능을 얼마나 크게 흔드는지 안다. 같은 모델을 쓰는데도 harness 설계에 따라 벤치마크 점수가 20점씩 갈리는 일이 흔하다.

문제는 이 harness 가 거의 항상 <strong>사람이 손으로 만들고, 배포 이후에는 고정된 유물</strong>로 취급된다는 점이다. 에이전트는 태스크를 수행하지만, 자기가 태스크를 수행하는 방식 자체를 고쳐 쓰지는 못한다. 최근의 자기개선 (self-improvement) 연구들이 이 틈을 파고들었지만, 대부분은 편집 가능한 경계를 에이전트의 *per-step 의사결정 코드* 에 두거나 (Gödel Agent, Darwin Gödel Machine 계열), 아니면 더 넓은 스캐폴드를 다루더라도 <strong>외부의 더 강한 모델</strong>을 proposer 로 두고 최적화한다 (Meta-Harness, AHE 계열). 전자는 진화 가능한 표면이 좁고, 후자는 "개선된 게 에이전트인가 아니면 그걸 설계한 더 센 모델인가"라는 귀속 문제를 남긴다.

여기에 더 불편한 지적이 하나 있다. Wang et al. (2026b) 의 *Rethinking the Evaluation of Harness Evolution* 은 피드백과 추론 예산을 맞춘 통제 실험에서, unit test 가 없는 조건에서 harness evolution 67.4% 대 단순 병렬 샘플링 72.3%, unit test 가 있는 조건에서 75.8% 대 86.0% 로 <strong>양쪽 모두 병렬 샘플링이 앞섰다</strong>고 보고했다. 탐색과 평가 태스크가 분리되면 일반화 이득은 +0.6pp 에 그친다. 즉 지금까지 보고된 harness evolution 의 이득 상당수가 <strong>진짜 능력 향상이 아니라 테스트 타임 탐색을 더 한 결과</strong>일 수 있다는 것이다. 이 논문은 정확히 그 비판을 정면으로 받는 설계를 들고 나온다.

그래서 던지는 질문은 이렇다. *모델이 얼어 있을 때, 에이전트는 자기 harness 를 내생적으로 진화시켜 성능을 올릴 수 있는가? 그리고 그 개선을 궁극적으로 무엇이 제한하는가?* 앞부분은 이미 여러 논문이 시도했고, 이 논문의 진짜 기여는 뒷부분에 있다.

## 핵심 기여 (Key Contributions)

- **HSI 프레임워크.** frozen LLM 하나가 중첩된 세 개의 rewriting scope 에서 동작하며 자기 태스크 harness 를 진화시킨다. 가장 바깥 실행 로직을 frozen anchor 로 고정해 재귀적 자기수정이 무한히 번지지 않게 한다. 세 스코프는 같은 모델·같은 프롬프트 포맷·같은 `react()` 프리미티브를 공유하고, <strong>오직 사용 가능한 툴과 실행 컨텍스트로만 구분</strong>된다.
- **모델 상한을 통제한 상태의 긍정 증거.** frozen DeepSeek-V4-Flash 로 BALROG 의 중간 난이도 환경에서 일관된 이득을 얻고, BabaIsAI 서브스위트에서는 held-out 일반화까지 보인다. 특히 태스크 실행 시 reasoning 을 끄는 프로토콜로 inference-time reasoning 을 교란 요인에서 제거했다.
- **스케일링 한계의 실증적 특성화.** 피드백 가용성과 backbone 능력이라는 두 실천적 경계를 식별하고, 난이도가 다른 환경들을 가로질러 언제 내생적 harness 진화가 먹히고 언제 안 먹히는지를 보인다. NLE 에서의 실패를 감추지 않고 결과의 일부로 제시한 게 이 논문의 성격을 잘 보여준다.
- **task-specific 진화라는 스케일링 축.** 하나의 만능 harness 를 찾는 대신, 태스크 패밀리마다 자기 harness 를 따로 유지하고 고정된 task-injection seam 을 통해 iteration 간에 hot-swap 한다. Wang et al. (2026b) 가 지적한 "universal harness 의 overfitting" 문제를 설계 차원에서 우회하는 선택이다.

## 관련 연구 / 배경 지식

### Gödel Machine 계보

Schmidhuber (2003) 의 Gödel Machine 은 자기 프로그램을 — 미래의 수정을 담당하는 절차까지 포함해 — 스스로 고칠 수 있는 시스템을 제안했다. 단, 그 수정이 성능을 개선한다는 것이 **증명 가능할 때만** 수정한다는 조건이 붙었다. 이 증명 조건은 실제로는 충족 불가능에 가까웠고, 최근 LLM 기반 후속 연구들은 증명을 경험적 검증으로 갈아끼우며 이 아이디어를 실용화했다.

Gödel Agent (Yin et al., 2025) 는 런타임 코드 수정으로 자기참조적 개선을 실현했고, Darwin Gödel Machine (Zhang et al., 2026b) 은 자기참조 코드 수정에 population 기반 open-ended 탐색을 결합해 SWE-bench 20.0% → 50.0% 를 달성했다. 여기서 흥미로운 결과 하나 — DGM 의 greedy ablation 은 39.7% 에 그쳐, archive 기반 탐색이 본질적이라는 것을 보였다. Huxley-Gödel Machine (Wang et al., 2025) 은 벤치마크 성능과 자기개선 잠재력 사이의 불일치를 지적하며 clade 수준 meta-productivity (CMP) 를 도입했고, Group-Evolving Agents (Weng et al., 2026) 는 진화 단위를 개체에서 그룹으로 옮겼다. HyperAgents (Zhang et al., 2026c) 는 meta-mechanism 자체를 편집 가능하게 만들어 이 방향을 한 단계 더 밀었다.

이 계보의 공통점은 편집 가능한 경계를 <strong>에이전트의 의사결정 절차나 프로그램 실행 코드</strong>에 둔다는 것이다. 더 넓은 agent harness 를 내생적으로 진화시킬 수 있는가는 열린 문제로 남아 있었다.

### Harness engineering

harness engineering 은 LLM 을 둘러싼 실행 컴포넌트 — 프롬프트, 툴, 메모리, 검증 메커니즘 — 가 에이전트 행동과 성능을 어떻게 규정하는지를 다룬다. Meta-Harness (Lee et al., 2026b) 는 harness 최적화를 outer-loop 탐색 문제로 정식화했는데, 여기서 proposer 는 전체 파일시스템 접근권을 가진 더 강한 coding agent 다. AutoHarness (Lou et al., 2026) 는 Thompson sampling 기반 트리 탐색으로 code harness 를 합성한다. Self-Harness (Zhang et al., 2026a) 는 weakness mining · harness proposal · proposal validation 의 3단계로 고정 모델이 외부 도움 없이 자기 harness 를 개선할 수 있음을 보였다 (MiniMax M2.5 40.5% → 61.9%).

배포 중 적응을 다루는 흐름도 있다. TTHE (Nie et al., 2026) 는 실행 트레이스로 테스트 타임에 harness 를 진화시키고, Live-SWE-Agent (Xia et al., 2025) 는 문제 해결 중에 툴을 만들어 쓴다. Continual Harness (Karten et al., 2026) 는 reset-free 온라인 환경으로 확장했다.

그런데 이들 대부분은 <strong>태스크 harness 자체를 진화</strong>시킬 뿐, harness 가 어떻게 발견·선택·재작성되는지를 지배하는 *메커니즘* 은 진화시키지 않는다. HSI 가 파고드는 지점이 정확히 여기다.

### 평가와 이론적 한계

Harness-Bench (Yao et al., 2026) 는 harness 설계를 독립적인 평가 축으로 세우고, 동일 모델에서도 harness 구성에 따라 최대 23.8 점의 격차가 난다는 것을 보였다. Harness Updating Is Not Harness Benefit (Lin et al., 2026b) 은 harness 를 *업데이트하는 능력* 과 그 업데이트로부터 *이득을 보는 능력* 을 분리했는데, 후자가 non-monotonic 이라는 게 핵심 발견이다 — 중간 티어 모델이 가장 크게 이득을 보고 (+19.3pp), 약한 모델은 skill-load rate 가 낮아 (25.1% vs 95.7%) 이득이 가장 적다. 이 논문의 NLE 실패 사례에 대한 직접적인 선례다.

이론 쪽에서는 Wang et al. (2026a) 가 자기수정 하에서 distribution-free PAC 보장이 보존되는 <strong>필요충분조건</strong>이 policy-reachable hypothesis family 의 VC dimension 이 균등하게 유계인 것임을 보였다. 태스크가 요구하는 함수 복잡도가 모델의 도달 가능한 VC dimension 을 넘어서면 어떤 harness engineering 도 그 격차를 메울 수 없다. HSI 의 *backbone capability bound* 는 이 정리의 경험적 대응물이다.

<div class="row mt-3"><div class="col-sm mt-3 mt-md-0">
{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/tab4-comparative-summary.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4: 대표적 harness evolution / self-improvement 방법과 HSI 의 비교. Proposer 는 누가 harness 편집을 제안하는지, Surface 는 편집 가능한 코드 표면이다. 대부분의 선행 연구가 Domain 열에서 Coding 에 몰려 있는 반면 HSI 만 BALROG 라는 점, 그리고 Proposer 가 'Same frozen M' 인 점이 이 논문의 좌표를 보여준다."
   zoomable=true %}
</div></div>

## 방법 / 아키텍처 상세

### 설계 원칙 — 왜 계층이어야 하는가

HSI 가 상정하는 harness 는 *task-specific and continuously evolvable* 하다. 태스크 패밀리마다 자기 harness 를 유지하고, 고정된 task-injection seam 을 통해 iteration 간에 hot-swap 되며, 환경 피드백으로 다듬어진다.

여기서 왜 계층 분리가 필연적인지가 나온다. 단층 설계라면 harness 의 태스크 대면 동작과 그 harness 를 고쳐 쓰는 전략이 한 덩어리에 묶인다. 최적화의 *대상* 과 *최적화기* 가 분리 불가능해지는 것이다. 계층 분리는 이 둘을 떼어낸다 — 태스크 harness 는 진화하되 그것을 고쳐 쓰는 절차는 고정되고, 그 rewriting 절차 자체는 한 층 위에서 진화하되 가장 바깥 anchor 는 frozen 으로 남는다.

**Principle 1 (단일 frozen 모델, 세 harness 스코프).** 하나의 frozen LLM $M$ 이 세 계층에서 동작한다. task-harness scope 에서 $M$ 은 harness $H$ 를 실행해 환경과 상호작용한다. evolver scope 에서 $M$ 은 seed selection · harness evolution · candidate selection 을 통해 $H$ 를 수정한다. meta-evolver scope 에서 $M$ 은 evolver 전략 자체를 — seed 생성, commit selection, archive 유지, 최종 버전 export 같은 결정을 포함해 — 수정한다.

세 스코프는 같은 frozen 모델, 같은 프롬프트 포맷, 같은 `react()` 프리미티브를 공유한다. <strong>다른 것은 오직 사용 가능한 툴과 실행 컨텍스트뿐</strong>이다. 스코프는 명시적 메모리 경계로 분리되며, 독립된 에이전트가 아니라 독립된 히스토리를 유지한다. 이 점이 중요하다 — Meta-Harness 나 AHE 처럼 외부의 더 강한 proposer 를 쓰는 접근과 달리, HSI 는 양쪽 모두에 같은 frozen 모델을 쓴다. 그래서 개선의 귀속이 명확하다.

**Principle 2 (자기결정적 explore–exploit).** HSI 는 진화 중 explore–exploit 스케줄을 명시하지 않는다. 언제 코드를 살펴볼지, 후보를 평가할지, 교훈을 기록할지, 탐색과 활용에 노력을 어떻게 배분할지 — 전부 $M$ 이 통제하는 진화 가능 전략의 일부로 취급된다. 프레임워크는 원자적 상호작용 프리미티브, 진화 피드백 신호, 구조적 불변식만 제공한다.

### 세 계층 스코프

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/fig1-hsi-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: HSI 프레임워크. 오른쪽 초록 블록이 태스크 harness H (HarnessPolicy, context/memory/prompt, hook/tool/helper), 가운데 파랑이 evolver 의 3단계 (seed selection → main evolution → commit selection), 왼쪽 보라가 meta-evolver 로 evolver 전략 Σ 의 네 정책 (seed / evolution / commit / best-version selector) 을 고쳐 쓴다. 하단 File System 이 세 스코프의 메모리 경계를 물리적으로 분리한다."
   zoomable=true %}

**task-harness scope** 는 현재 harness $H$ 를 실행한다. $H$ 안에는 프롬프트, 툴, 메모리, 상태 관리, hook, 그리고 모델이 환경과 상호작용하는 방식을 결정하는 정책이 들어 있다. 진화의 주된 편집 대상이며, 고정된 injection seam 으로 태스크에 연결된다.

**evolver scope** 는 iteration 을 가로질러 태스크 harness 를 수정한다. $\Sigma$ 가 정의하는 진화 절차를 실행하며, 각 iteration 은 seed selection · main evolution · commit selection 의 세 단계로 구성된다. harness 평가를 통해 환경 피드백을 받고, evolution archive 와 bootstrap memory 로 지속적 정보를 유지한다.

**meta-evolver scope** 는 harness 진화 과정보다 한 층 위에서 동작하며 $\Sigma$ 자체를 수정한다. 다만 <strong>meta-evolution 을 수행하는 실행 로직은 편집 불가능</strong>하다. 불변 초기화 템플릿에서 로드되며, 자기수정을 경계 짓는 바깥 frozen anchor 역할을 한다.

부록의 Eq. 9 가 이 계층을 한 줄로 요약한다.

$$
M \;\longrightarrow\; H \;\longrightarrow\; \Sigma \;\longrightarrow\; \text{frozen anchor}
$$

아래 층은 적응 가능하고, 가장 바깥 실행 경계는 고정된다. 재귀적 수정 과정이 여기서 종료된다.

### 5단계 진화 루프

진화 과정은 다섯 단계로 이루어진다. 앞의 세 단계는 태스크 harness $H$ 에 작용하고, 네 번째는 진화 전략 $\Sigma$ 를 수정하며, 마지막 단계는 평가용으로 export 할 harness 를 고른다. 각 단계는 bounded `react()` 루프로 구현되며 중심 결정은 frozen LLM $M$ 에 위임된다.

$H\_t$ 를 iteration $t$ 시작 시점의 harness, $\mathcal{G}\_t = (V\_t, E\_t)$ 를 누적 evolution graph 라 하자. 각 노드 $v \in V\_t$ 는 보상 $r\_v$ 로 주석된 commit 된 harness 스냅샷이고, edge 는 버전 간 의미적 관계를 담는다.

$$
\begin{aligned}
(\hat{H}_t,\, h_t) &= \mathrm{SeedSelect}(\mathcal{G}_t,\, M) &&\text{(1)} \\
\{V_t^{(k)}\}_{k=1}^{K_t} &= \mathrm{MainEvolve}(\hat{H}_t,\, h_t;\, M) &&\text{(2)} \\
C_t &= \mathrm{CommitSelect}(\{V_t^{(k)}\}_{k=1}^{K_t},\, \mathcal{G}_t;\, M) &&\text{(3)} \\
\Sigma_{t+1} &= \mathrm{MetaEvolve}(\mathcal{G}_t \cup C_t,\, \Sigma_t;\, M) &&\text{(4)} \\
H^{*} &= \mathrm{BestVersionSelect}(\mathcal{G}_T,\, M,\, \Sigma) &&\text{(5)}
\end{aligned}
$$

(논문의 원 표기는 각각 `seed_selection`, `main_evolution`, `commit_selection`, `meta_evolution`, `best_version_selection` 이다.)

**Seed selection (Eq. 1)** 은 $\mathcal{G}\_t$ 에서 조상 하나를 골라 다음 iteration 을 위한 구조화된 가설 $h\_t$ 를 생성한다. 결정은 $M$ 이 이전 보상, 진화 이력, 누적 교훈을 근거로 내린다. 생성된 가설은 네 요소를 담는다 — 선택된 anchor 버전, 그것을 고른 동기, 기대하는 개선 방향, 그리고 **falsification criterion**. 이 마지막 항목이 설계상 흥미롭다. 가설이 이후 진화 과정에 주입되면서, 진화는 제약 없는 mutation 에서 명시적 예측이 이끄는 goal-directed 탐색으로 바뀐다.

**Main evolution (Eq. 2)** 은 $M$ 이 태스크 harness 를 직접 수정하는 단계다. 편집 가능 표면은 프롬프트, 툴, 메모리, 상태 관리, hook, 실행 정책 등 harness 의 모든 태스크 대면 컴포넌트를 포함한다. 여기서 유일하게 보존되는 불변식이 **task-injection interface** 다 — 내부 컴포넌트는 얼마든지 바뀌어도, 태스크를 harness 에 연결하는 외부 인터페이스는 고정된다. 이 불변식 덕에 진화된 버전들을 직접 비교할 수 있고 harness 가 iteration 간에 hot-swappable 해진다.

**Commit selection (Eq. 3)** 은 최고 보상 후보 하나만 고르지 않는다. 여러 진화 방향을 담은 **다양성 있는 commit pool** 을 유지한다. 선택된 각 버전은 $M$ 이 생성한 의미적 근거와 함께 evolution graph 에 추가되어, 이후 seed selection 이 성공·실패·미탐색 분기를 추론할 수 있게 한다.

**Meta-evolution (Eq. 4)** 은 harness 진화를 지배하는 전략 $\Sigma$ 를 수정한다. $\Sigma$ 의 편집 가능 표면에는 seed selection, main evolution, commit selection, 최종 버전 선택을 담당하는 절차가 포함된다. $\Sigma$ 를 바꿈으로써 meta-evolver 는 후보 harness 만이 아니라 <strong>미래의 harness 를 발견하는 탐색 전략 자체</strong>를 바꾼다.

**Best-version selection (Eq. 5)** 은 $T$ iteration 후 배포할 harness 를 고른다. 다양성을 유지하는 중간 commit selection 과 달리 이 단계는 <strong>일반화를 우선</strong>한다. 후보들은 validation 성능으로 평가되고 선택된 harness 가 held-out 평가로 export 된다. 선택 절차 자체도 $\Sigma$ 의 일부라, meta-evolution 이 최종 배포 결정 방식까지 적응시킬 수 있다.

### 실행 인터페이스와 메모리

모든 HSI 컴포넌트는 같은 frozen LLM $M$ 과 공유 `react()` 실행 프리미티브로 인스턴스화된다. 매 스텝 모델은 현재 메시지 히스토리, 사용 가능 툴, 태스크별 컨텍스트를 받아 행동을 낸다.

$$
a_t = M(o_t,\, \mathcal{T},\, \mathcal{C}_t)
$$

$o\_t$ 는 현재 관측, $\mathcal{T}$ 는 사용 가능 툴 집합, $\mathcal{C}\_t$ 는 스코프별 컨텍스트다. 선택된 행동은 파일을 수정하거나, 평가를 요청하거나, 정보를 기록하거나, 현재 단계를 종료할 수 있다.

evolver scope 의 툴은 파일 조작 (`read`, `write`, `edit`, `bash`) 에 더해 진화 전용 프리미티브를 갖는다.

| 툴 | 역할 |
|------|------|
| `plan` | iteration-local 추론 노트북 유지 |
| `compact_context` | 컨텍스트 예산이 빠듯해지면 이전 상호작용 요약 |
| `evaluate` | 현재 harness 를 실행해 환경 피드백 반환 |
| `lesson` | 이후 iteration 을 위한 재사용 가능한 통찰 기록 |
| `end_evolution` | 현재 진화 과정 종료 |

프레임워크는 이 연산들 사이에 순서를 규정하지 않는다. 언제 무엇을 쓸지는 관측된 피드백과 현재 진화 목표에 따라 모델이 정한다.

메모리는 지속성이 다른 세 채널로 나뉜다. **iteration-local memory** 는 `plan.md` 에 저장되는 임시 노트북으로, 후보 버전이 폐기되면 코드 상태와 함께 롤백된다. **persistent evolutionary memory** 는 `BOOTSTRAP.md` 의 교훈 archive 로, 발견된 패턴·실패한 방향·재사용 가능한 진화 가이드를 요약해 담는다. **evolution graph memory** 는 $\mathcal{G}\_t$ 로, 각 노드에 harness 스냅샷 · 달성 보상 · 진화 스텝 메타데이터를 담고 edge 에 "기존 접근 확장", "실패 모드 수리", "다른 방향 탐색" 같은 의미 관계를 인코딩한다.

전체 히스토리를 LLM 에 그대로 노출하면 컨텍스트 예산을 초과하고 불필요한 노이즈가 들어온다. 그래서 HSI 는 압축 요약을 되찾는 probe 메커니즘을 쓴다.

$$
z = \mathrm{probe}(\mathcal{T}_{\text{history}},\, q)
$$

meta-evolver 는 예컨대 "어떤 seed-selection 행동이 성공적 iteration 과 상관되는가", "어떤 진화 패턴이 자주 regression 으로 이어지는가", "어떤 가설 구조가 큰 개선에 선행하는가" 같은 질의를 던진다. 장기 진화 이력을 활용하면서도 추론 컨텍스트를 유계로 유지하는 장치다.

### 스코프 격리와 평가 인터페이스

HSI 는 세 스코프 사이의 경계를 명시적으로 강제한다. 태스크 harness $H$ 는 evolver 가 편집할 수 있지만 진화 전략 $\Sigma$ 는 수정하지 못한다. 반대로 meta-evolver 는 $\Sigma$ 를 수정할 수 있지만 meta-evolution 중에 태스크 harness 를 직접 건드리지 못한다. 인가된 디렉토리 밖의 수정은 거부된다.

평가는 편집 가능 표면 <strong>바깥</strong>에서 수행된다. harness 는 고정된 인터페이스로 태스크를 받는다.

$$
\mathrm{using\text{-}harness}(\mathit{agent},\, \mathit{task})
$$

$H$ 의 내부 구현이 iteration 마다 바뀌어도 이 인터페이스는 불변이다. 따라서 진화된 모든 버전이 같은 task injection 메커니즘 아래 동작하고 동일한 development / validation / test 프로토콜로 비교될 수 있다. evaluator 는 스칼라 보상과 선택적 텍스트 피드백을 함께 반환한다.

## 학습 목표 / 손실 함수

HSI 에는 gradient 로 최소화하는 손실 함수가 없다. 모델 파라미터가 얼어 있기 때문이다. 대신 후보 harness 를 순위 매기는 <strong>확률적 lower-confidence-bound 보상</strong>이 최적화 신호 역할을 한다.

$$
r = \mu - z \cdot \frac{\sigma}{\sqrt{n}}, \qquad z = 0.5
$$

$\mu$ 와 $\sigma$ 는 평가 trial 들에 대한 평균과 표준편차, $n$ 은 trial 수다. BALROG 의 episode-level % Progress (0–100) 를 $[0,1]$ 로 rescale 해 쓴다.

이 보상 형태가 왜 필요한지는 생각해 볼 만하다. 진화 중 후보 harness 는 효율을 위해 호출당 <strong>에피소드 1개</strong>로 평가된다. 이런 저표본 환경에서 평균만 보고 고르면 운 좋게 높은 점수를 받은 궤적이 선택될 위험이 크다. LCB 는 분산에 비례해 페널티를 매겨 이 낙관 편향을 깎아낸다. $z = 0.5$ 는 페널티를 세게 걸지 않는 값인데, 탐색을 지나치게 억누르지 않으려는 절충으로 읽힌다.

다만 <strong>보고되는 모든 결과는 LCB 보상이 아니라 raw % Progress 평균</strong>이다. LCB 는 진화 중 후보 선택에만 쓰이고, 최종 평가는 full episode budget 으로 더 안정적인 추정을 얻는다. 이 분리는 정직한 설계다 — 선택 기준과 보고 기준을 섞으면 selection bias 가 결과에 스며든다.

## 학습 데이터와 파이프라인

### 벤치마크

BALROG (Paglieri et al., 2025) 는 계획, 메모리, 탐색, 툴 사용 능력을 평가하도록 설계된 장기 호흡 텍스트 기반 상호작용 환경 벤치마크다. 6개 환경이 능력 요구 수준을 달리해 배치되어 있다.

| 환경 | 요구 능력 |
|------|------|
| BabyAI | 구조화된 환경에서의 지시 따르기와 내비게이션 |
| BabaIsAI | 규칙 조작이 필요한 퍼즐 (서브스위트: BreakStop / GoTo / Make / Advanced) |
| Crafter | 장기 계획, 자원 관리, 순차적 의사결정 |
| TextWorld | 다단계 추론과 객체 조작 |
| MiniHack | 복잡한 상태 공간과 희소 피드백의 로그라이크 |
| NLE | 위와 같으나 훨씬 더 어려움 (NetHack Learning Environment) |

이 난이도 스펙트럼이 논문 결론의 핵심 장치다. frozen backbone 이 non-trivial 성능을 내는 태스크부터 성능이 바닥에 머무는 태스크까지 한 프레임 안에 놓여 있어서, harness 진화가 <strong>어디서 먹히고 어디서 멈추는지</strong>를 같은 실험 안에서 관찰할 수 있다.

### Backbone 과 진화 설정

모든 실험은 `deepseek-v4-flash-preview` API 로 접근한 DeepSeek-V4-Flash 를 세 스코프 전체의 frozen backbone 으로 쓴다. 진화 run 하나는 $T = 5$ outer iteration 으로 구성되고, iteration 당 최대 80 `react()` 스텝이 주어진다.

가장 중요한 설정이 <strong>thinking on/off 분리</strong>다.

| 스코프 | reasoning | 온도 | 스텝 예산 |
|------|------|------|------|
| task-harness | 비활성 (thinking off) | 0 | — |
| evolver | 활성, reasoning effort 최대 | — | iteration 당 최대 80 `react()` |
| meta-evolver | 활성 | — | iteration 당 최대 50 `react()` |

태스크 실행 중 확장 추론을 끄면 모델의 per-step 능력 상한이 고정된다. 이 설정은 development 평가, validation 평가, best-version selection, 최종 테스트에 걸쳐 고정된다. 따라서 **태스크 실행 중 관찰된 개선은 inference time 의 추가 추론 연산으로 돌릴 수 없다**. Wang et al. (2026b) 가 제기한 "test-time scaling 교란" 비판에 대한 직접적인 대응이다.

진화 공간에도 제약이 걸린다. 모든 태스크 상호작용은 frozen backbone $M$ 을 거쳐야 한다. 진화는 프롬프트·툴·메모리·상태 관리·제어 로직을 수정할 수 있지만, **모델을 외부 탐색 절차나 non-LLM 정책으로 대체할 수는 없다**. 이 제약이 없으면 "harness 진화"가 사실상 "LLM 을 버리고 BFS 를 짜 넣기"로 퇴화한다.

meta-evolver scope 는 greedy archive 를 쓰고, seed selection 과 commit pooling 이 둘 다 진화 가능하며, seed 가설이 각 iteration 의 첫 시스템 프롬프트에 주입된다. seed selection 중에는 짧은 seed-validation probe (최대 3회 `evaluate()` 호출) 가 허용된다. 반면 <strong>terminal best-version selection 단계는 고정된 non-evolvable agentic 단계</strong>로, 모든 진화의 마지막에 한 번 실행된다. init harness 는 사전 평가되지 않으며 iteration 1 은 cold start 다.

### 평가 프로토콜

BALROG 환경은 절차적으로 생성되고 각 `evaluate()` 호출이 새 초기 seed 를 샘플링한다. 두 프로토콜을 쓴다.

**In-distribution evolution (Setup A).** 진화와 최종 평가에 같은 태스크 집합을 쓰되, 각 평가 에피소드는 새로 샘플링된 환경 seed 에서 생성된다. 이전에 마주친 태스크의 확률적 변형 하에서 성능이 개선되는지를 측정한다. TextWorld, BabyAI, Crafter, MiniHack, NLE 에 적용된다.

**Held-out task generalization (Setup B).** BabaIsAI 에 대해 서브스위트 카테고리 (BreakStop, GoTo, Make, Advanced) 기준으로 태스크 패밀리 split 을 구성한다. 각 서브스위트는 development / validation / test 로 나뉘고, <strong>test split 은 진화 과정 내내 접근 불가</strong>다. Advanced 는 태스크가 3개뿐이라 유의미한 held-out 평가가 불가능해 제외된다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/tab3-per-suite-config.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: 스위트별 실험 설정. Dev / Val 은 스위트에서 dev (진화 보상 신호) 와 val (best-version 선택) 에 배정된 비율, Test ep. 는 최종 테스트의 태스크당 에피소드 수, Dev ep. 는 진화 중 태스크당 에피소드 수 (LCB 보상이 노이즈를 흡수), Test rep. 는 진화 후 전체 테스트를 반복 평가한 횟수, Submit-best 는 terminal best-version selection 단계의 스텝 예산이다."
   zoomable=true %}

### 베이스라인

세 종류의 비교 기준을 둔다. 첫째, **Init Harness** — 진화 없이 같은 backbone 과 같은 평가 프로토콜로 평가한 원본 수작업 harness. 이것이 harness 진화 효과를 재는 주 통제 베이스라인이다. 둘째, 공개된 BALROG 리더보드 결과 — 서로 다른 backbone 과 reasoning 설정을 쓰는 frontier 모델들에 대한 맥락 참조. 셋째, 외부 proposer 기반 harness 최적화 방법들은 <strong>통제 비교에서 의도적으로 제외</strong>했다. 더 강한 외부 모델에 의존하는 방법은 frozen backbone 하의 내생적 진화와 전제가 다르기 때문이다.

## 실험 결과

### In-distribution 성능 (Setup A)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/tab1-balrog-comparison.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Setup A 기준 BALROG 리더보드 비교. 상단 블록은 2026-08-03 에 수집한 frontier 모델들의 공개 리더보드 수치, 하단 3행이 동일 frozen DeepSeek-V4-Flash backbone 하의 통제 비교다. BabaIsAI 는 서브스위트 프로토콜이 리더보드의 mixed-task 프로토콜과 달라 제외됐다."
   zoomable=true %}

핵심 비교는 하단 세 행이다. 셋 다 DeepSeek-V4-Flash 를 쓰고 **harness 를 진화시키는지, 어떻게 진화시키는지만 다르다**.

같은 backbone 과 같은 task-time inference 설정에서 출발해, meta-evolution-on 설정은 모든 non-trivial 스위트에서 초기 harness 를 크게 개선한다.

> BabyAI 81.3 (init harness 42.0, +39.3) · Crafter 44.6 (11.6, +33.0) · TextWorld 65.0 (40.0, +25.0) · MiniHack 15.8 (0.8, +15.0)

5개 환경 평균은 18.9 → 41.4 로 오른다. backbone 과 task-time reasoning 예산은 그대로 둔 채 얻은 수치다.

frontier 시스템과의 비교도 흥미롭다. TextWorld 에서 HSI 는 65.0 % Progress 로 Grok-4 (62.9), Claude-Opus-4.5-Thinking (59.0), Gemini-3-Flash (50.2) 를 넘어선다. Crafter 에서는 44.6 으로 DeepSeek-R1 (36.4), GPT-5-minimal-think (39.1), GPT-4o (33.1) 를 앞선다. 다만 이건 서로 다른 backbone·설정 간 비교이므로 맥락 참조로만 읽어야 하고, harness 진화의 효과를 분리해내는 건 어디까지나 통제된 init-harness 비교다.

### Held-out 일반화 (Setup B)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/tab2-babaisai-heldout.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: Setup B (20% held-out test) 기준 BabaIsAI 서브스위트 결과. Best Dev 는 진화 중 선택된 최고 development 보상, Test 결과는 태스크 간 표준편차와 함께 보고된다. Init Harness 는 3회 베이스라인 run 의 평균이다."
   zoomable=true %}

각 서브스위트는 backbone, 진화 예산, 초기화 템플릿, 평가 프로토콜을 고정한 채 독립적인 harness 를 진화시킨다. 유일한 변수는 태스크 패밀리다.

결과가 두 개의 뚜렷한 체제로 갈린다. **내비게이션 지향 태스크** (BreakStop, GoTo) 에서는 held-out 성능이 거의 완벽하다 — meta-on 이 각각 0.9800, 1.0000 에 도달한다. 초기 harness 가 0.0333, 0.1818 이었던 걸 감안하면 큰 폭이다. meta-off 변형도 비슷한 수준 (1.0000, 0.9636) 이라, 이 난이도에서는 meta-evolution 이 결정적이지 않다는 뜻이기도 하다. 진화된 harness 가 관찰된 development 태스크를 넘어 전이되는 <strong>재사용 가능한 상호작용 패턴</strong>을 발견했다고 볼 수 있다.

반면 **Make 는 확연히 어렵다.** zero-shot init harness (0.0000) 대비 개선은 있지만 held-out 성능이 meta-on 0.3625, meta-off 0.3375 에 그친다. Best Dev 가 0.5556 인 것과 비교하면 dev→test 격차도 크다. 표준편차 0.3284 라는 값도 눈에 띈다 — 태스크에 따라 되기도 하고 안 되기도 한다는 뜻이다. 다단계 crafting 은 진화 중 발견된 재사용 가능한 harness 변환을 넘어서는 능력을 요구한다.

### Meta-evolution 의 효과

Table 1 의 meta-off ablation 은 진화 전략 자체를 진화시키는 것의 기여를 분리한다. meta-evolver 를 제거하면 평가된 모든 스위트에서 성능이 떨어진다.

| 스위트 | meta-on | meta-off | 차이 |
|------|------|------|------|
| BabyAI | 81.3 | 77.3 | −4.0 |
| Crafter | 44.6 | 36.4 | −8.2 |
| TextWorld | 65.0 | 46.0 | −19.0 |
| MiniHack | 15.8 | 5.8 | −10.0 |
| 평균 | 41.4 | 33.1 | −8.3 |

가장 큰 개선이 TextWorld (+19.0) 와 MiniHack (+10.0) 에서 나온다. <strong>진화 탐색 공간이 복잡해질수록 진화 절차 자체를 적응시키는 게 점점 더 이득</strong>이 된다는 해석이 나온다. 뒤집어 말하면 BabyAI 처럼 상대적으로 단순한 환경에서는 meta-evolution 의 한계 기여가 작다 (+4.0).

NLE 는 의미 있는 meta-off 비교가 불가능하다. 두 설정 모두 거의 0 에 가까운 보상을 얻기 때문이다. meta-on 결과 0.2 는 <strong>진화가 유용한 harness 수정을 발견하기에 충분한 태스크 피드백을 받지 못한다</strong>는 신호다.

### 진화 궤적

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/fig2-crafter-trajectory.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: Crafter 에서의 HSI 진화 궤적 (Setup A, meta-on). dev 보상이 init harness 0.166 에서 iteration 4 의 0.578 (초록 별 = export 된 best version) 까지 오르고 iteration 5 에서 regression 이 일어난다. 각 iteration 카드는 seed 출처 · main-evolution 편집 · 결과 · commit pool 네 필드와, meta-evolver 가 Σ 에 무엇을 새로 썼는지를 요약한 meta 필드를 담는다."
   zoomable=true %}

Crafter 궤적은 전형적인 in-distribution 진화 패턴을 보여준다. 초기 iteration 들은 주로 <strong>누락된 태스크 표현을 도입</strong>한다 — 잠재된 보상 신호 노출, 인벤토리 정보 구조화, action-state 정렬 개선. iteration 1 에서 0.166 → 0.430 (2.6배) 으로 단일 최대 도약이 일어나고, iteration 2 가 구조화된 인벤토리와 crafting 힌트로 0.511 (+19%), iteration 3 이 0.488 에서 정체 (카드에 "hits LLM spatial limit" 로 기록), iteration 4 가 두 조상의 ensemble fusion 과 안전 제약으로 0.578 peak 를 찍는다. iteration 5 에서는 0.497 → 0.341 로 regression 이 발생한다.

이 regression 이 중요하다. <strong>진화가 모든 분기를 단조적으로 개선하지 않고 non-convex 한 harness 설계 공간을 탐색한다</strong>는 증거다. best version 이 마지막 iteration 이 아니라 iteration 4 에서 나왔다는 점, 그래서 terminal best-version selection 단계가 필요하다는 점이 여기서 설명된다.

meta-evolver 의 기여는 성공적인 국소 발견을 <strong>재사용 가능한 진화 휴리스틱으로 변환</strong>하는 데 있다. iteration 을 가로질러 $\Sigma$ 를 "raw observation 보다 구조화된 상태 표현을 우선하라", "성능 정체 부근에서 지나치게 공격적인 탐색을 피하라" 같은 상위 원칙으로 갱신한다. 이 변경들은 태스크 성능을 직접 바꾸는 게 아니라 <strong>이후의 탐색 행동</strong>에 영향을 준다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/fig3-babaisai-make-trajectory.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: BabaIsAI-Make 에서의 HSI 진화 궤적 (Setup B, meta-on). 파란 곡선이 dev 보상, 빨간 링이 commit-pool 버전, 주황 삼각형이 val 모드에서 확정된 commit (해당 commit 자체에는 dev 평가가 기록되지 않음) 을 표시한다. 각 삼각형은 commit 의 anchor x 위치에 val 보상 높이로 찍히고, 점선 수직선이 dev anchor 에서 val 보상까지 내려온다."
   zoomable=true %}

BabaIsAI-Make 궤적은 held-out 진화를 보여준다. Crafter 와 달리 Setup B 는 validation 동작을 명시적으로 노출한다. dev peak 는 iteration 을 따라 0.222 → 0.333 → 0.222 (정체) → 0.444 → 0.556 으로 움직인다. 각 iteration 이 도입한 것은 plan tracking 을 갖춘 single-`react()` 재작성 (iter 1), WIN-target 지속성을 갖춘 spatial-map builder (iter 2), BFS pathfinding 을 이용한 auto-target 계산 (iter 3), directional fallback 을 갖춘 auto-push 메커니즘 (iter 4), LLM-aware cross-room 내비게이션 (iter 5) 이다.

meta-evolver 는 여기서 **"LLM targets, BFS navigates"** 라는 2계층 패턴을 성문화하고 commit pool 을 1개에서 3개로 점진적으로 확장한다. 이 패턴 자체가 꽤 인상적이다 — 목표 선정이라는 의미적 판단은 LLM 에 맡기고, 경로 탐색이라는 결정론적 계산은 BFS 에 맡기는 역할 분담을, 에이전트가 스스로 발견해 전략에 새겨 넣었다는 뜻이다.

held-out validation 마커들은 발견된 메커니즘 여럿이 development 태스크를 넘어 전이됨을 보여주지만, 남은 격차 (dev peak 0.556 vs test 0.3625) 는 다단계 crafting 이 여전히 frozen backbone 의 능력 경계에 근접해 있음을 가리킨다.

## 결과 분석 / Ablation

### 무엇이 실제로 작동했는가

두 궤적을 겹쳐 보면 일관된 3단 패턴이 보인다. <strong>초기 iteration 은 누락된 추상화를 발견</strong>하고, <strong>중간 iteration 은 구조화된 알고리즘 컴포넌트를 도입</strong>하며, <strong>후기 iteration 은 경쟁하는 설계를 다듬거나 가지치기</strong>한다. 자기개선이 단순 프롬프트 최적화가 아니라 점진적 harness 재구조화를 통해 일어난다는 정성적 증거다.

더 구체적으로, Crafter 에서 evolver 가 찾아낸 지배적 레버는 <strong>숨겨진 게임 피드백을 명시화하는 것</strong>이었다 — 보상 신호, 인벤토리 상태, crafting 가능 여부를 harness 컨텍스트에 차례로 노출. 이건 사실 사람이 에이전트를 튜닝할 때 가장 먼저 하는 일이기도 하다. 모델이 못 하는 걸 하게 만든 게 아니라, **모델이 이미 할 수 있는데 정보가 없어서 못 하던 것을 풀어준** 것이다. 이 관찰이 뒤에 나올 두 bound 를 이해하는 열쇠다.

또 하나 — 진화 run 전반에서 **가장 큰 성능 개선은 보통 첫 iteration 에서** 일어나고 이후 iteration 은 점진적 이득에 그친다. 초기 harness 재설계가 지배적 개선을 포착하고, 후기 iteration 은 탐색과 선택을 통해 기존 해를 정제한다는 뜻이다. 실용적으로는 $T$ 를 크게 늘리는 것의 수익 체감이 빠르다는 신호다.

### 두 개의 경계

BALROG 전체를 가로질러 같은 정성적 패턴이 나타난다. harness 진화는 frozen backbone 이 이미 유의미한 역량을 보이는 태스크에서 가장 크게 개선되고, 능력 경계 근처의 태스크에서는 이득이 작고 노이즈가 크며, 유용한 피드백을 얻기 어려운 태스크에서는 개선이 제한된다.

**Feedback-fidelity bound.** 진화는 선택을 이끌 정보성 있는 보상 신호를 필요로 한다. harness 수정은 정적 검사만으로는 평가하기 어렵다. 유용한 신호는 오직 "수정된 harness 가 환경에서 실행됐을 때 더 나은 행동을 내는가"뿐이다. NLE 가 이 bound 의 사례다 — 보상이 극도로 희소해 진화가 무엇을 개선해야 할지 알 방법이 없다. meta-on 0.2 라는 수치는 개선이 아니라 노이즈에 가깝다.

**Backbone capability bound.** harness 재설계는 frozen 모델의 한계를 극복할 수 없다. Crafter iteration 3 의 카드에 적힌 "hits LLM spatial limit" 이 이걸 그대로 보여준다. BabaIsAI-Make 의 dev–test 격차도 같은 맥락이다. harness 진화는 모델 주변의 행동을 재조직하고 증폭할 수 있지만, 모델이 유용한 상호작용 신호를 생성하지 못하는 태스크는 넘어서지 못한다.

이 두 bound 는 Wang et al. (2026a) 의 이론적 결과 — 태스크가 요구하는 함수 복잡도가 모델의 도달 가능한 VC dimension 을 넘으면 어떤 자기수정도 그 격차를 못 메운다 — 의 경험적 대응물이다. 그리고 Lin et al. (2026b) 의 "harness-benefit 은 non-monotonic 하고 약한 모델일수록 이득이 적다"는 발견의 직접적 재현이기도 하다.

### 단일 seed 진화라는 선택

HSI 는 의도적으로 population 기반 병렬 스케일링을 피하고 <strong>단일 진화 계보</strong>를 따른다. 성능 변화를 후보 처리량 증가가 아니라 harness 재설계에 귀속시킬 수 있게 하기 위해서다. 탐색 효율을 귀속 명확성과 맞바꾼 것이다.

이건 방법론적으로 옳은 선택이지만 비용이 있다. DGM 의 ablation 이 보여줬듯 archive 기반 population 탐색은 greedy 대비 실질적 이득 (50.0% vs 39.7%) 을 준다. HSI 는 그 이득을 포기했고, 논문도 이를 인정하며 population 탐색을 상보적인 추가 스케일링 차원으로 남겨둔다.

## 한계와 비판적 평가

**저자가 인정한 한계.**

- 계산 자원 제약으로 평가가 선별된 벤치마크·backbone·비교 집합에 국한된다. 전면적인 실증 연구가 아니라 초기 탐색이라고 명시한다.
- 진화는 정보성 있는 피드백을 요구하며, 보상이 극도로 희소한 환경에서는 개선 신호가 불충분하다.
- 최종 성능이 frozen 모델의 능력에 제약된다.
- 단일 seed 진화는 탐색 효율을 희생한다.

**리뷰어 관점에서 추가로 보이는 한계.**

- **backbone 이 하나뿐이다.** 모든 결과가 DeepSeek-V4-Flash 단일 모델에서 나왔다. Lin et al. (2026b) 이 harness-benefit 의 non-monotonicity 를 보고했고 Zhang et al. (2026a) 이 "같은 초기 harness 와 같은 알고리즘에서 모델마다 완전히 다른 harness 수정이 나온다"는 것을 보인 마당에, 단일 backbone 결과에서 도출한 두 bound 가 얼마나 일반적인지는 알 수 없다. 특히 "중간 티어 모델이 가장 큰 이득을 본다"는 선행 발견이 맞다면, DeepSeek-V4-Flash 는 이득이 가장 잘 보이는 지점에 놓여 있었을 수 있다.
- **통계적 유의성 검정이 없다.** 보고된 변동은 전부 *평가* 쪽에서 나온다 — 평가 에피소드 간 분산, 그리고 Table 3 의 Test rep. (진화가 끝난 뒤 전체 테스트를 3회까지 재평가) 이다. 정작 *진화 run 자체의 재현성* — 같은 설정으로 진화를 다시 돌렸을 때 비슷한 harness 가 나오는가 — 은 어디에도 없다. Table 2 에서 3회 베이스라인 run 을 평균낸 것은 Init Harness 뿐이고, HSI 팔은 진화 run 하나로 읽힌다. 진화가 본질적으로 확률적이라고 논문 스스로 말하는 만큼, run-to-run 분산은 결과 해석에 필수적인 정보다. GSME (Luo et al., 2026b) 가 지적한 "비통계적 mean-improves 규칙은 진짜 중립인 메커니즘의 60% 가량을 승리로 오인한다"는 문제가 그대로 적용된다.
- **Table 3 의 Meta 열이 본문 결과와 어긋난다.** 부록 Table 3 은 TextWorld 와 BabaIsAI-BreakStop 의 Meta 를 `off` 로 기록하는데, 본문 산문은 이 열을 "meta-evolver scope 가 활성화되었는지"로 정의한다. 그런데 Table 1 은 TextWorld meta-on 65.0 을, Table 2 는 BreakStop meta-on 0.9800 을 보고한다. 두 스위트에 대해 meta-on 팔이 실제로 어떤 설정으로 돌았는지가 불분명하다. TextWorld 는 meta-evolution 기여가 가장 큰 (+19.0) 스위트라 이 모호성의 무게가 작지 않다.
- **Dev / Val 비율 정의가 맞아떨어지지 않는다.** 본문은 Dev 와 Val 을 "스위트에서 각각에 배정된 비율"로 정의하는데, BabaIsAI-GoTo 와 Make 는 Dev 0.8, Val 0.25 로 합이 1.05 다. 여기에 20% test split 까지 더하면 1.25 가 된다. Val 이 dev 의 부분집합이거나 겹치는 것으로 보이지만 명시되어 있지 않아, Setup B 의 split 을 그대로 재현하기 어렵다.
- **held-out 일반화의 증거 폭이 좁다.** 실제로 held-out 평가가 된 것은 BabaIsAI 서브스위트 3개뿐이고, 그중 둘 (BreakStop, GoTo) 은 init harness 대비 거의 포화 (0.98, 1.00) 라 상한 효과로 변별력이 낮다. 유일하게 어려운 Make 는 0.36 에 그친다. "태스크 패밀리 안에서 일반화한다"는 주장을 지지하기에는 표본이 얇다.
- **비용이 전혀 보고되지 않는다.** iteration 당 최대 80 `react()` 스텝 × 5 iteration × 세 스코프를 돌리는 진화 비용, 그리고 진화된 harness 의 추론 시점 오버헤드 (BFS pathfinding, spatial-map builder 같은 컴포넌트가 붙은 harness 는 초기 harness 보다 스텝당 비용이 클 수 있다) 가 어디에도 없다. Live-SWE-Agent 가 태스크당 0.02–0.12 달러의 오버헤드를 명시한 것과 대비된다. harness 진화가 "테스트 타임 탐색을 더 한 것"이 아니라는 주장은 reasoning 을 끄는 것으로 절반만 방어된다 — 진화된 harness 자체가 더 많은 환경 스텝을 쓴다면 여전히 예산 비교가 필요하다.
- **task-injection seam 이 불변이라는 가정의 대가.** 이 불변식이 hot-swap 과 버전 비교를 가능하게 하지만, 동시에 진화가 도달할 수 있는 harness 공간을 seam 이 허용하는 형태로 한정한다. 초기 seam 설계가 사실상 사람이 넣은 강한 귀납 편향인데, 이 seam 자체를 어떻게 설계했고 다른 seam 이었으면 결과가 어떻게 달라지는지에 대한 ablation 이 없다.

## 시사점 / Takeaways

- **frozen 모델 위의 harness 는 아직 많이 남아 있는 최적화 축이다.** 파라미터를 하나도 안 건드리고 5개 환경 평균 18.9 → 41.4 를 얻었다. 실무적으로 읽으면, 지금 쓰고 있는 에이전트의 성능 격차 상당 부분이 모델이 아니라 그 주변 스캐폴드에 있을 수 있다는 뜻이다. 모델을 갈아끼우기 전에 harness 를 의심하는 게 순서상 맞다.
- **자기개선의 정직한 검증은 "무엇을 고정했는가"로 판가름난다.** 이 논문에서 가장 배울 점은 결과가 아니라 프로토콜이다. 태스크 실행 중 reasoning off, 모든 상호작용은 frozen $M$ 경유, 모델을 외부 탐색으로 대체 금지, 평가는 편집 가능 표면 바깥. 이런 통제 없이 보고된 harness evolution 이득은 test-time scaling 과 구분되지 않는다.
- **진화가 발견한 것은 대개 "모델이 못 하던 것"이 아니라 "모델이 볼 수 없던 것"이다.** Crafter 의 지배적 레버가 숨겨진 게임 피드백의 명시화였다는 사실은 harness 설계에 대한 실용적 지침이다. 새 능력을 주입하려 하기 전에, 모델이 이미 가진 능력을 쓰지 못하게 막고 있는 관측 병목부터 찾아라.
- **한 만능 harness 보다 태스크 패밀리별 harness 가 현실적이다.** BabaIsAI 안에서는 재사용 가능한 전략이 발견되지만, 그 메커니즘이 확연히 다른 환경으로 자동 전이되지는 않는다. 자기개선 에이전트의 스케일링은 universal harness 하나를 키우는 방향보다 태스크 분포별 전문화 harness 를 유지하는 방향이 유망해 보인다.
- **개선의 상한을 미리 진단할 수 있으면 진화를 돌릴지 말지 결정할 수 있다.** 보상이 희소하거나 (feedback bound) 모델이 태스크의 기본 요소를 못 다루면 (capability bound), harness 진화는 시간과 토큰만 태운다. NLE 에 5 iteration 을 돌려 0.2 를 얻은 결과는 실패가 아니라 이 진단 기준의 교정용 데이터로 읽어야 한다.

## 설치 및 사용법

저자가 소스 코드를 [TailinZhou/hsi](https://github.com/TailinZhou/hsi) 에 공개했다. 논문에 실행 예제가 실려 있지는 않으므로, 아래는 논문이 기술한 인터페이스 구조를 그대로 옮긴 개념적 요약이다.

```text
harness/          ← 태스크 harness H (evolver 가 편집 가능)
  HarnessPolicy, context/memory/prompt, hooks, tools, helpers
evolution/        ← evolver 전략 Σ (meta-evolver 가 편집 가능)
  seed policy, evolution policy, commit policy, best-version selector policy
plan.md           ← iteration-local 메모 (후보 폐기 시 롤백)
BOOTSTRAP.md      ← iteration 을 넘어 지속되는 교훈 archive
<meta-evolver 실행 로직>  ← 불변 초기화 템플릿 (frozen anchor)
```

평가 진입점은 `using_harness(agent, task)` 로 고정되어 있고, 진화된 harness 는 내부 구현이 어떻게 바뀌든 이 시그니처를 유지해야 iteration 간 hot-swap 과 버전 간 비교가 성립한다. 재현을 시도한다면 Table 3 의 스위트별 설정 (Dev / Val 비율, 에피소드 수, Meta on/off, submit-best 스텝 예산) 을 먼저 맞추는 게 순서다.

## 참고 자료

- 논문: [arXiv:2608.08466](https://arxiv.org/abs/2608.08466)
- Code: [github.com/TailinZhou/hsi](https://github.com/TailinZhou/hsi)
- 벤치마크: [BALROG](https://github.com/balrog-ai/BALROG)

## 더 읽어보기

- **[BALROG: Benchmarking Agentic LLM and VLM Reasoning On Games](https://arxiv.org/abs/2411.13543)** (Paglieri et al., ICLR 2025) — 이 논문이 전적으로 의존하는 벤치마크. BabyAI 부터 NetHack 까지 난이도 스펙트럼을 한 프레임에 놓은 설계가 HSI 의 두 bound 논증을 가능하게 했다.
- **[Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents](https://arxiv.org/abs/2505.22954)** (Zhang et al., ICLR 2026) — 자기참조 코드 수정에 archive 기반 population 탐색을 결합. greedy ablation 39.7% vs full 50.0% 은 HSI 가 포기한 단일 계보 설계의 기회비용을 정량화해준다.
- **[Gödel Agent: A Self-Referential Agent Framework for Recursive Self-Improvement](https://arxiv.org/abs/2410.04444)** (Yin et al., 2025) — LLM 기반 자기참조 개선의 첫 프레임워크. 편집 가능 경계를 의사결정 절차에 둔 전형으로, HSI 가 harness 로 경계를 넓힌 출발점이다.
- **[Rethinking the Evaluation of Harness Evolution for Agents](https://arxiv.org/abs/2607.12227)** (Wang et al., 2026) — harness evolution 이득의 상당 부분이 test-time scaling 과 구분되지 않는다는 비판. HSI 의 thinking-off 프로토콜과 통제 베이스라인 설계가 이 논문에 대한 응답이다.
- **[On The Statistical Limits of Self-Improving Agents](https://arxiv.org/abs/2510.04399)** (Wang et al., 2026) — 자기수정 하에서 distribution-free PAC 보장이 보존될 필요충분조건을 VC dimension 으로 규정. HSI 의 backbone capability bound 에 대응하는 이론적 뼈대다.

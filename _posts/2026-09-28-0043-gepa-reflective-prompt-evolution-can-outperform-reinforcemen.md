---
layout: post
title: "[논문 리뷰] GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"
date: 2026-09-28 08:30:24 +0900
description: "실행 trace를 읽는 reflection과 instance별 Pareto 탐색으로 프롬프트를 개선하는 GEPA의 구조, GRPO 비교, rollout 비용과 일반화 한계."
tags: [prompt-optimization, reflection, evolutionary-search, compound-ai, reinforcement-learning]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig3-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/
en_url: /en/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Lakshya A Agrawal et al. (저자 17명, UC Berkeley · Stanford · Notre Dame · MIT 등) |
| 학회 | ICLR Oral · 2026 |
| arXiv 또는 DOI | [2507.19457](https://arxiv.org/abs/2507.19457) |
| Code | [gepa-ai/gepa](https://github.com/gepa-ai/gepa) |
| 데이터 | HotpotQA · IFBench · HoVer · PUPA · AIME-2025 · LiveBench-Math |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-09-28 |

## TL;DR

- GEPA는 실행 과정과 평가 피드백을 LLM이 읽고 프롬프트를 수정하는 optimizer다. 모델 가중치는 고정하고, validation의 서로 다른 문제에서 강점을 보이는 후보를 함께 유지한다.
- Qwen3-8B의 여섯 과제 평균 점수는 GEPA 54.85, GRPO 48.91, MIPROv2 47.84다. GEPA의 GRPO 대비 차이는 5.94점이지만, AIME-2025에서는 GRPO가 더 높다.
- ‘최대 35배 적은 rollout’은 IFBench에서 최적 프롬프트를 발견한 시점인 678회와 GRPO의 24,000회를 비교한 수치다. GEPA의 해당 과제 전체 탐색 예산 3,593회나 실제 시간·비용의 35배 절감과 같은 말이 아니다.
- GPT-4.1 Mini에서는 GEPA 65.22, GEPA+Merge 66.36으로 MIPROv2의 58.67보다 높다. 그러나 Merge는 Qwen3-8B에서 평균을 낮추므로 항상 도움이 되는 기능은 아니다.
- 핵심은 좋은 수정 지시를 생성하는 능력과 다양한 후보를 보존하는 탐색을 결합한 데 있다. Reflection의 설명을 믿는 대신 실제 실행으로 수정안을 검증한다.

## 소개 (Introduction)

LLM에게 일을 시킨 뒤 실패를 관찰하는 방법은 여러 가지다. 답이 틀렸다는 0점만 받을 수도 있고, 두 번째 검색 query에 필요한 인물 이름이 빠졌다는 사실을 알 수도 있다. 코드가 실패했다면 compiler가 어떤 함수나 타입을 이해하지 못했는지 알려 준다. 이 정보들을 모두 하나의 reward로 줄이면 학습하기 쉬운 숫자는 얻지만, 다음 시도에서 무엇을 바꾸어야 하는지에 대한 단서는 사라진다. 이미 자연어와 코드를 이해하는 모델에게는 이 단서 자체가 유용한 학습 재료일 수 있다.

이 문제는 여러 LLM 호출이 연결된 compound AI system에서 더 뚜렷하다. 검색 query 생성, 검색 결과 요약, 최종 답변 작성이 이어지는 프로그램에서는 마지막 답만 보고 어느 단계가 잘못됐는지 판단하기 어렵다. 개발자가 전체 실행 기록을 읽으면 해결할 수 있는 문제도, 가중치 업데이트나 최종 점수만을 사용하는 탐색에서는 많은 시행착오가 필요할 수 있다. 반대로 사람의 직감으로 프롬프트를 한 번 고치는 방식은 작은 예시에서만 통하는 규칙을 만들기 쉽다.

Agrawal et al.의 [GEPA](https://arxiv.org/abs/2507.19457)는 이 두 문제를 함께 다룬다. LLM이 실행 기록에서 개선 방향을 제안하고, 진화적 탐색이 그 제안을 반복 검증한다. 이 리뷰는 ICLR 2026 Oral로 채택된 arXiv v2를 기준으로, reflection과 Pareto 선택의 역할을 나누어 살펴본다. 제목의 “reinforcement learning보다 나을 수 있다”는 주장도 어떤 모델, 데이터, 계산 예산에서 성립하는지까지 확인한다.

## 핵심 기여 (Key Contributions)

- <strong>실행과 평가 trace에 기반한 프롬프트 변이.</strong> 현재 지시문뿐 아니라 실제 입력, 중간 출력, reasoning과 실패 원인을 읽어 수정안을 만든다. 여러 모듈 중 하나의 프롬프트를 바꾸면서 전체 프로그램의 성능으로 평가한다.
- <strong>Instance별 강점을 보존하는 후보 선택.</strong> 전체 평균이 가장 높은 후보 하나만 반복 개선하지 않는다. Validation의 서로 다른 예시에서 최고 성능을 내는 후보를 남겨 탐색의 출발점을 다양하게 유지한다.
- <strong>공통 조상을 이용한 모듈 단위 Merge.</strong> 서로 다른 탐색 경로에서 얻은 변경을 모듈별로 조합한다. 프롬프트 문장을 임의로 이어 붙이는 방식과 구분된다.
- <strong>가중치 학습과 prompt optimization을 함께 둔 실험.</strong> Qwen3-8B의 GRPO, 두 모델의 MIPROv2, GPT-4.1 Mini의 TextGrad·Trace와 비교하고, 후보 선택 ablation과 모델 간 프롬프트 전이를 분석한다.
- <strong>환경 피드백을 이용한 적용 범위 확장.</strong> NPU·CUDA kernel 생성과 adversarial prompt 탐색을 통해, 정답 데이터 외에 compiler·profiler 같은 실행 환경도 수정의 근거가 될 수 있음을 보인다.

## 관련 연구 / 배경 지식

### Prompt optimization과 가중치 최적화의 차이

Prompt optimization은 같은 모델에 넣는 지시문이나 예시를 바꾸는 작업이다. 모델 파라미터에 접근하지 못하는 API 환경에서도 사용할 수 있고, 최적화 결과를 텍스트로 확인할 수 있다. 다만 추론 때마다 긴 프롬프트를 읽는 비용이 생기며, 모델이 이미 갖춘 능력을 이끌어 내는 범위에 제약받는다. 반면 GRPO 같은 reinforcement learning은 여러 출력의 상대적인 reward를 이용해 가중치를 업데이트한다. 두 방법은 변경하는 대상과 필요한 인프라가 다르므로 하나의 순위만으로 서로를 완전히 대체한다고 결론내리기는 어렵다.

GEPA의 비교 대상인 MIPROv2는 multi-stage 프로그램의 instruction과 few-shot demonstration을 함께 탐색한다. 잘 작동한 실행 예시를 프롬프트에 넣으면 모델이 원하는 입출력 패턴을 배울 수 있다. GEPA는 주로 instruction을 수정하면서 실패에서 얻은 지식을 지시문에 압축한다. 따라서 두 방법의 차이는 “자동으로 고친다”는 점보다 어떤 정보를 이용해 다음 후보를 제안하고 탐색하는지에 있다.

### Verbal feedback과 textual gradient

Reflexion은 실패에 대한 언어적 반성을 다음 시도의 기억으로 활용했고, TextGrad는 실행 결과에 대한 비판을 텍스트 변수의 수정 방향으로 전파한다. 이런 방법에서 gradient라는 표현은 보통 수치 미분과 같은 의미가 아니다. LLM이 자연어로 작성한 비판과 수정 제안을, 최적화를 위한 방향 정보로 사용한다는 비유다. Trace 역시 프로그램 실행과 피드백을 이용하므로, GEPA만이 처음으로 실패 이유를 읽는 방법이라고 설명하면 선행 연구와의 차이가 흐려진다.

GEPA의 특징은 이 언어적 수정 과정을 후보 집합의 진화와 결합하는 데 있다. 현재 최고 평균 점수의 후보가 다음 개선의 가장 좋은 부모라는 보장은 없다. 어떤 후보는 전체 평균이 낮아도 까다로운 유형에서 독특한 성공 패턴을 가지고 있을 수 있다. 그 후보를 일찍 버리지 않는 것이 다음 단계의 성능 향상에 도움이 되는지, 논문은 동일한 evolution harness 안의 선택 전략 비교로 확인한다.

### Rollout과 reflection call의 구분

논문에서 rollout은 입력 하나에 대해 AI 프로그램을 실행하고 평가하는 단위다. 여러 검색과 LLM 호출을 거치는 프로그램이라도 하나의 평가 rollout으로 집계될 수 있다. 프롬프트 수정안을 작성하는 reflection model의 호출 횟수와도 다르다. 따라서 rollout 수는 평가 예산의 좋은 척도지만, 서로 다른 프로그램의 GPU 시간이나 API 요금을 직접 나타내지는 않는다.

또한 새 후보를 세 개의 예시에서 비교하는 비용과 전체 validation에서 평가하는 비용이 함께 들어간다. 최적화가 적은 횟수의 reflection으로 끝났다고 해서 검증 비용까지 작다는 뜻은 아니다. 이 구분은 뒤에서 678회, 3,593회, 24,000회라는 숫자가 각각 무엇을 세는지 이해하는 기준이 된다.

## 방법 / 아키텍처 상세

### 1. 고정된 프로그램과 모듈별 지시문

{% include figure.liquid loading="eager" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig3-framework.png" class="img-fluid rounded z-depth-1" caption="Figure 3: 후보 선택, 실행 trace 수집, reflection 기반 지시문 수정, 평가와 후보 집합 갱신으로 이어지는 GEPA의 반복 과정." zoomable=true %}

논문은 프로그램을 여러 모듈과 control flow의 조합으로 표현한다. 각 모듈에는 프롬프트, 모델 가중치, 입력·출력 인터페이스가 있다. GEPA의 핵심 설정에서는 이 중 프롬프트 집합만 최적화한다. 검색을 언제 호출할지, 몇 개의 모듈을 연결할지, 어떤 모델을 사용할지까지 매번 새로 설계하는 것은 아니다. 이렇게 변경 범위를 제한하면 실패 원인을 지시문의 변경과 연결하기가 쉬워진다.

후보 하나는 단일 문자열일 수도 있지만, multi-module 프로그램에서는 모듈별 프롬프트를 모은 완전한 프로그램 설정이다. 검색 query 생성기를 바꾸면 뒤쪽 요약기와 답변기의 입력도 달라진다. GEPA는 수정 대상 모듈의 trace를 reflection에 제공하면서도, 후보의 최종 가치는 프로그램 전체의 metric으로 판단한다. 국소적으로 더 자연스러운 query가 전체 정답률을 높이는지는 별도로 실행해서 확인해야 하기 때문이다.

처음에는 기본 프롬프트로 구성한 후보만 있다. 이후 후보마다 어떤 부모에서 생겼는지와 validation의 각 예시에서 얻은 점수를 기록한다. 이 이력은 좋은 후보를 다시 선택하는 데 쓰이고, Merge 단계에서는 두 후보의 공통 조상을 찾는 근거가 된다. 최적화의 산출물은 이 탐색 이력 전체가 아니라 최종적으로 선택된 프롬프트 설정이다.

### 2. 실행·평가 trace와 세 예시의 reflection

매 반복에서 부모 후보와 수정할 모듈을 고른다. 실험에서는 모듈을 round-robin 방식으로 순환하며, training set에서 세 예시를 뽑아 부모 프로그램을 실행한다. Reflection model은 현재 지시문과 모듈의 입출력, 필요한 reasoning 기록, 평가 피드백을 읽고 새로운 지시문을 작성한다. “더 잘 생각하라” 같은 일반적인 문구보다 실패한 실제 상황을 근거로 수정하도록 만든다.

실행 trace와 평가 trace는 다른 역할을 한다. 전자는 모델이 무엇을 입력받아 어떤 중간 출력을 만들었는지 보여 준다. 후자는 그 출력이 왜 성공하거나 실패했는지 설명한다. 검색 문제라면 필요한 문서를 찾았는지, instruction-following 문제라면 어떤 제약을 어겼는지, kernel 생성이라면 compiler 오류와 실행 성능이 무엇인지가 피드백이 된다. 모듈별 피드백을 제공할 수 있으면 수정 대상과 원인을 더 직접적으로 연결할 수 있다.

예를 들어 두 번째 검색 query가 첫 번째 질문을 거의 반복했다면, 최종 답이 틀렸다는 정보만으로는 해결책이 불명확하다. 첫 검색 결과에 중간 연결 고리가 되는 인물이 있었고 두 번째 검색이 그 인물을 사용하지 않았다는 trace가 있으면, “이미 얻은 bridge entity와 아직 부족한 관계를 query에 포함하라”는 규칙을 제안할 수 있다. 부록의 HotpotQA 프롬프트는 이런 방식으로 검색 전략을 구체화한다. 이는 새로운 사실을 무한히 학습하는 과정이라기보다, 관찰한 실패를 재사용 가능한 실행 지침으로 바꾸는 과정이다.

### 3. Minibatch 개선 조건과 전체 validation 평가

수정안은 부모와 같은 세 예시에서 다시 평가한다. 평균 metric이 부모보다 좋아지면 후보 집합에 넣고 전체 Pareto validation set에서 평가해 예시별 점수 벡터를 저장한다. 작은 minibatch에서 개선되지 않은 수정안에 전체 validation 비용을 쓰지 않는 구조다. 이 단계는 reflection이 그럴듯한 설명을 했다는 이유만으로 지시문을 채택하지 않게 한다.

여기서 새 후보가 현재 전체 평균 1위보다 반드시 좋아야 하는 것은 아니다. 선택된 부모보다 해당 minibatch에서 나아진 후보는 탐색 집합에 들어갈 수 있고, validation의 특정 예시에서 강점을 보이면 다음 부모로 선택될 기회가 있다. 평균 1위만 갱신하는 hill climbing과 다른 지점이다. 반대로 세 예시에서 우연히 좋아진 규칙이 들어올 가능성도 남으므로, 이 통과 조건 자체를 일반화의 보장으로 이해해서는 안 된다.

전체 validation은 선택의 근거이지 최종 test set이 아니다. GEPA는 이를 반복해서 사용하며 어떤 후보를 더 발전시킬지 결정한다. 마지막에는 전체 validation 평균이 가장 좋은 단일 후보를 반환한다. 일반적인 여섯 benchmark 실험에서 test 예시마다 정답을 보고 최상의 프롬프트로 갈아타는 oracle ensemble을 사용하는 것은 아니다.

### 4. Instance별 Pareto 후보와 선택 확률

논문의 Pareto 선택은 각 validation instance에서 최고 점수를 기록한 후보들을 찾는 데서 출발한다. 같은 예시에서 동점인 후보도 포함한다. 이들을 합친 뒤 지배되는 후보를 제거하고, 남은 후보가 최고 성능 집합에 속하는 예시 수에 비례해 부모를 샘플링한다. 따라서 후보들을 균등하게 뽑는 것도, 여섯 benchmark를 각각 하나의 목적함수로 삼는 것도 아니다. 한 과제 안의 validation 예시들이 선택의 기준이다.

직관을 위한 가상 예시를 생각해 보자. 후보 A는 쉬운 검색 질문 대부분에 강하고, 후보 B는 전체 평균은 낮지만 특정 multi-hop 질문을 유일하게 해결한다. 평균 기준의 작은 beam은 B를 버릴 수 있다. Instance별 최고 후보를 보존하면 B가 다음 reflection의 출발점으로 남고, 그 전략을 다른 질문에도 적용할 가능성을 탐색할 수 있다. 이것은 실제 실험 수치가 아니라 선택 규칙을 설명하기 위한 예다.

모든 낮은 점수 후보를 무조건 살려 두는 것은 아니다. 선택 가능한 후보는 실제 validation의 어떤 부분에서라도 강점을 보여야 한다. 이 때문에 탐색은 무작위 다양성과 성능 위주의 집중 사이를 조절한다. 다만 제한된 validation에서 발견한 다양성이 실제 사용자 분포의 다양성을 대표하는지는 별개의 문제다. 관측되지 않은 실패 유형을 Pareto 선택만으로 보존할 수는 없다.

### 5. 공통 조상에 기반한 system-aware Merge

GEPA+Merge는 서로 다른 경로에서 나온 후보의 모듈을 조합한다. 두 후보가 공유하는 조상을 찾고, 조상과 비교해 어떤 모듈의 프롬프트가 바뀌었는지 확인한다. 한쪽만 바꾼 모듈은 그 변경을 가져오고, 양쪽이 바꾼 모듈은 전체 점수가 더 높은 부모의 프롬프트를 택한다. 동점 처리도 별도로 둔다. 두 프롬프트의 문장을 LLM이 다시 섞어 쓰는 연산과는 다르다.

본문의 간략한 설명만 보면 두 후보가 완전히 서로 다른 모듈만 수정해야 하는 것처럼 읽힐 수 있다. 그러나 부록 Algorithms 3–4는 겹치는 변경도 처리하며, 최소한 한쪽만 변경한 모듈이 있는지 등의 조건을 검사한다. 이미 시도한 조합이나 직접적인 조상 관계를 피하고, 공통 조상보다 성능이 나빠진 경로를 무분별하게 결합하지 않도록 제한한다. 실험에서는 Merge 호출을 최대 다섯 번으로 제한한다.

서로 다른 모듈의 좋은 변경도 함께 사용하면 충돌할 수 있다. Query 생성기가 내보내는 정보와 요약기가 기대하는 형태가 함께 달라지기 때문이다. Merge는 후보를 만드는 또 하나의 제안 방식이며, 결과가 좋을지 평가 전에 확정할 수 없다. 실제로 GPT-4.1 Mini에서는 평균 성능을 높이지만 Qwen3-8B에서는 떨어뜨린다. 이 결과는 모듈 간 상호작용을 무시한 단순한 재사용이 충분하지 않음을 보여 준다.

## 학습 목표 / 손실 함수

GEPA는 프롬프트에 대해 미분 가능한 loss를 만들거나 backpropagation을 수행하지 않는다. 논문의 목적을 간결하게 쓰면 다음과 같다. 프로그램을 $\Phi$, 모듈별 프롬프트 집합을 $\Pi$, 고정된 모델 가중치를 $\Theta$, 평가 metric을 $\mu$라고 하자.

$$
\begin{aligned}
\Pi^\star &\in \arg\max_{\Pi}\;
\mathbb{E}_{(x,m)\sim\mathcal{D}}
\left[\mu\bigl(\Phi(x;\Pi,\Theta),m\bigr)\right] \\
\text{subject to}\quad &N_{\mathrm{rollout}}\le B.
\end{aligned}
$$

여기서 $m$은 정답이나 평가에 필요한 metadata이고, $B$는 탐색의 rollout 예산이다. 실제 기대값은 유한한 데이터와 validation 점수로 추정한다. 목표는 예산 안에서 좋은 프롬프트를 찾는 것이며, reflection의 문장 품질 자체가 목적함수에 들어가지는 않는다. Metric이 틀린 행동에 높은 점수를 주면 GEPA 역시 그 방향으로 최적화될 수 있다.

후보 $c$의 validation 예시 $i$에 대한 점수를 $S\_{c,i}$라고 쓰면, 부모 선택의 출발점은 다음과 같다.

$$
\begin{aligned}
s_i^\star &= \max_{c\in\mathcal{C}} S_{c,i}, \\
\mathcal{P}_i^\star &= \{c\in\mathcal{C}:S_{c,i}=s_i^\star\}.
\end{aligned}
$$

이 집합들을 합치고 지배되는 후보를 제거한 뒤, 후보가 남아 있는 최고 집합의 개수를 $f(c)$라 두면 선택 확률은 다음처럼 정규화된다.

$$
p(c)=\frac{f(c)}{\sum_{c'\in\mathcal{C}_{\mathrm{keep}}} f(c')}.
$$

이는 논문 Algorithm 2의 핵심을 요약한 표기다. 단일 평균 점수는 마지막 후보를 고르는 기준으로 남아 있지만, 다음 수정의 부모를 고르는 과정에서는 예시별 성능 구조를 사용한다. 따라서 최종 평가 기준과 탐색 중의 자원 배분 기준을 분리한 설계라고 볼 수 있다.

## 학습 데이터와 파이프라인

### 여섯 과제의 데이터 분할과 평가 단위

| 과제 | Training / validation / test | 프로그램과 평가 대상 |
|------|------|------|
| HotpotQA | 150 / 300 / 300 | Multi-hop 검색과 최종 질문 답변 |
| IFBench | 150 / 300 / 294 | 초안 생성과 재작성, instruction 제약 충족 |
| HoVer | 150 / 300 / 300 | 최대 3-hop 검색의 gold document retrieval |
| PUPA | 111 / 111 / 221 | 개인정보를 제한한 외부 LLM 질의와 응답 품질 |
| AIME-2025 | 45 / 45 / 30개 고유 test 문제 | 2022–2024 문제로 최적화, 2025 문제별 5회 생성 |
| LiveBench-Math | 총 368개를 대략 세 부분으로 분할 | 2025-07-30 snapshot의 수학 문제 |

AIME의 test 결과는 30개의 서로 다른 문제에서 다섯 번씩 생성한 150개 응답에 기반한다. 150개의 독립적인 수학 문제로 일반화했다고 읽으면 평가 규모를 과대평가한다. IFBench는 IF-RLVR의 training 자료와 IFBench의 보지 못한 제약을 이용하므로 단순히 같은 문구를 외우는 것보다 어려운 instruction generalization을 목표로 한다. LiveBench는 고정 snapshot의 무작위 분할이므로 이후 시점의 새로운 문제까지 직접 검증한 설정은 아니다.

HoVer에서는 문서 검색 성능을 최적화하며, 이 점수를 최종 fact-verification label accuracy로 바꾸어 부르면 안 된다. PUPA도 개인정보 유출과 답변 유용성을 함께 보는 metric이다. 높은 점수가 모든 민감 정보의 유출 확률을 같은 비율로 줄였다는 뜻은 아니며, 실제 개인정보 보호 수준을 알려면 metric의 구성과 실패 사례를 추가로 보아야 한다.

### 모델·비교군·탐색 예산

| 항목 | 주요 설정 |
|------|------|
| Task model | Qwen3-8B, GPT-4.1 Mini의 2025-04-14 버전 |
| Context | 16,384 tokens |
| 생성 설정 | Qwen temperature 0.6, top-p 0.95, top-k 20; GPT temperature 1 |
| GEPA | Reflection minibatch 3, 모듈 round-robin, Merge 최대 5회 |
| Data 역할 | Training은 feedback용, validation은 Pareto 선택용 |
| MIPROv2 | Heavy 설정, instruction 후보 18개와 few-shot set 후보 18개 |
| 주요 GRPO | LoRA rank 16, alpha 64, dropout 0.05, 500 steps, 24,000 rollouts |
| GRPO 업데이트 | Group 12, step당 입력 4개, learning rate $10^{-5}$ |

Prompt optimizer 비교는 먼저 MIPROv2의 rollout 사용량을 기록한 뒤 GEPA 예산을 비슷하게 맞춘다. 논문이 보고하는 차이는 10.15% 이내다. 모든 방법의 시간을 초 단위로 같게 맞춘 실험은 아니다. TextGrad와 Trace에도 같은 과제와 평가 피드백을 연결하되, 각 방법이 지원하는 모듈별 feedback 인터페이스의 차이는 남는다.

주요 GRPO 실험은 Qwen3-8B의 projection들에 LoRA를 적용한다. Training에는 H100 또는 A100 80GB 한 장을 사용하고 inference 자원을 별도로 둔다. 부록에는 full-parameter training 비교도 있지만, 제어하기 쉽게 바꾼 2-hop HoVer 설정이다. 이를 여섯 과제 전체에서 full-parameter GRPO를 이겼다는 근거로 확장할 수는 없다. 또한 논문은 GRPO hyperparameter를 여러 조합으로 수동 탐색했다고 설명하지만, 모든 가능한 학습 예산과 튜닝 범위를 포괄하는 비교는 아니다.

## 실험 결과

### Qwen3-8B의 GRPO·MIPROv2 비교

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/tab1-qwen.png" class="img-fluid rounded z-depth-1" caption="Table 1: Qwen3-8B의 여섯 과제 점수와 평균, baseline 대비 개선량. 하단의 GEPA·GRPO 탐색 rollout 예산." zoomable=true %}

여섯 과제 평균은 GEPA 54.85로, GRPO 48.91보다 5.94점, MIPROv2 47.84보다 7.01점 높다. Baseline 45.23과 비교하면 9.62점 개선이다. 서로 다른 metric을 0–100 척도로 나타낸 후 평균한 값이므로, 54.85를 하나의 공통 정확도라고 부르기보다는 여섯 과제의 aggregate score로 읽는 편이 정확하다.

개별 과제에서는 HotpotQA 62.33 (GRPO 43.33, +19.00), HoVer 52.33 (38.67, +13.66)의 차이가 크다. 여러 단계의 검색에서 실패 원인을 설명하고 지시문으로 반영하는 방식이 잘 맞는 결과다. 반면 AIME-2025는 GEPA 32.00, GRPO 38.00으로 방향이 바뀐다. 가중치 학습이 수학 문제에서 유리한 경우도 있다는 뜻이며, 논문 제목의 “can outperform”을 모든 과제의 우위로 바꾸면 안 된다.

GEPA+Merge의 평균은 52.40으로 GEPA보다 낮다. 특히 IFBench는 38.61에서 28.23으로 떨어진다. PUPA도 91.85에서 86.26으로 낮아진다. Merge의 긍정적인 사례만 소개하면 기본 GEPA의 강점과 별도 기능의 불안정성을 구분하지 못한다. 표에 나온 숫자가 보여 주는 것은 좋은 프롬프트 변경의 조합도 모델과 과제에 따라 재검증이 필요하다는 사실이다.

### 678회와 3,593회의 rollout 효율

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig1-rollout-efficiency.png" class="img-fluid rounded z-depth-1" caption="Figure 1: Qwen3-8B의 rollout 수에 따른 validation 점수 곡선과 별표의 test 점수. 왼쪽 HotpotQA, 오른쪽 IFBench와 test 점수용 우측 세로축." zoomable=true %}

IFBench에서 GEPA는 최적 프롬프트를 678 rollouts 시점에 얻는다. 이를 GRPO의 24,000 rollouts와 비교하면 약 35.4배 차이다. 그러나 이후의 탐색까지 포함한 GEPA 전체 예산은 3,593회다. 최종적으로 발견된 최적 후보의 위치를 돌아보는 수치와, 처음부터 얼마나 예산을 할당해야 그 후보를 찾을 수 있는지는 다른 질문이다. 실무 예산 계획에서는 이 둘을 분리해야 한다.

Table 1의 GEPA 전체 예산은 과제별 1,839–7,051회이며 평균 3,936회다. GRPO의 과제당 24,000회와 비교하면 평균적으로 약 6.1배 적다. 이 역시 reflection 호출, prompt 길이, 전체 프로그램의 호출 수, training GPU 비용을 하나로 환산한 값은 아니다. Rollout 효율의 증거는 강하지만 같은 비율의 wall-clock 단축이나 요금 절감을 그대로 보장하지 않는다.

### GPT-4.1 Mini의 prompt optimizer 비교

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/tab2-gpt.png" class="img-fluid rounded z-depth-1" caption="Table 2: GPT-4.1 Mini의 여섯 과제 점수와 평균. Trace·MIPROv2·TextGrad·GEPA 비교와 Qwen3-8B 최적화 프롬프트의 전이 결과." zoomable=true %}

GPT-4.1 Mini에서는 baseline 53.03에서 GEPA 65.22, GEPA+Merge 66.36으로 올라간다. MIPROv2는 58.67, TextGrad는 59.14, Trace는 56.30이다. GEPA와 MIPROv2의 평균 차이는 6.55점이고, Merge를 포함하면 7.69점이다. 이 표에는 GPT 모델의 GRPO 결과가 없으므로, 이 수치 자체를 GPT 모델에 대한 가중치 학습과의 직접 비교로 제시할 수는 없다.

AIME-2025는 GEPA 59.33 (MIPROv2 51.33, +8.00)이다. Qwen3-8B의 MIPROv2 대비 AIME 차이인 12.00점과 구분해야 한다. HotpotQA에서는 기본 GEPA가 69.00으로 Merge의 65.67보다 높지만, IFBench·HoVer·PUPA에서는 Merge가 더 좋다. 평균 개선이 모든 과제의 일관된 개선을 뜻하지 않는다는 점은 여기서도 유지된다.

Qwen3-8B를 대상으로 최적화한 프롬프트를 GPT-4.1 Mini에 그대로 옮기면 평균 62.03을 얻는다. GPT baseline보다 9.00점 높지만 GPT에서 직접 최적화한 GEPA의 65.22에는 못 미친다. 실행 과정에서 얻은 일부 전략이 모델을 넘어 재사용된다는 증거다. 반대로 모든 모델 쌍에서 대칭적으로 전이되거나 재튜닝이 필요 없다는 주장까지 뒷받침하지는 않는다.

### NPU kernel 생성과 환경 피드백

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig7-npu.png" class="img-fluid rounded z-depth-1" caption="Figure 7: AMD NPU kernel의 vector utilization. 왼쪽 방법별 평균 비율(%), 오른쪽 기능적으로 올바른 kernel별 비율과 두 방법의 비교." zoomable=true %}

AMD XDNA2 NPU 실험에서는 GPT-4o가 compiler와 profiler의 피드백을 이용해 kernel을 만든다. 최대 열 번 순차 수정하는 Sequential10의 평균 vector utilization은 4.25%이고, RAG를 추가하면 16.33%, RAG와 MIPROv2를 함께 쓰면 19.03%다. GEPA의 최종 단일 프롬프트는 runtime RAG 없이 26.85%를 얻는다. 최적화 중 오류에 맞는 문서를 찾아 얻은 지식을 지시문에 반영하는 방식이다.

Figure 7의 더 높은 30.52%는 Pareto 후보에서 과제별 최선의 결과를 사용하는 설정이다. 단일 프롬프트의 26.85%와 구분해야 한다. 이 실험은 해결하려는 kernel 집합 자체에서 탐색하는 inference-time optimization이므로, 앞선 held-out test benchmark와 일반화 주장이 같지 않다. 또한 vector utilization은 정확도나 end-to-end 속도 향상률이 아니라 벡터 연산 활용 지표다.

CUDA 실험도 NVIDIA V100에서 대표 과제 35개를 대상으로 수행한다. 논문의 fast₁이 20%를 넘는다는 결과는 PyTorch eager보다 빠르면서 올바른 kernel의 비율에 관한 것이지, 모든 연산이 20% 빨라졌다는 뜻이 아니다. 이 확장 실험들의 의미는 새로운 하드웨어의 API·성능 제약을 실행 피드백으로 학습할 수 있다는 데 있으며, 모든 하드웨어와 새로운 kernel에서의 일반화는 추가 검증이 필요하다.

## 결과 분석 / Ablation

### 후보 선택 전략과 탐색 다양성

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/tab3-fig6-selection.png" class="img-fluid rounded z-depth-1" caption="Table 3·Figure 6: 위쪽 Qwen3-8B의 네 과제 후보 선택 ablation, 아래쪽 평균 최고 후보 선택과 Pareto 선택의 탐색 트리. 노드의 후보 번호와 점수." zoomable=true %}

같은 evolution harness에서 부모 선택만 바꾼 네 과제 실험은 GEPA의 탐색 설계를 가장 직접적으로 확인한다. 평균 최고 후보만 고르는 SelectBestCandidate의 평균은 54.89, 상위 네 후보를 유지하는 BeamSearch는 53.95, GEPA는 61.28이다. GEPA는 greedy 선택보다 6.39점, beam보다 7.33점 높다. Reflection이 같아도 어디서 다음 수정을 시작하느냐가 결과를 바꾼다.

Figure 6의 트리는 평균 1위만 선택할 때 한 경로 주변에서 수정이 반복되고, Pareto 선택에서는 여러 계통이 발전하는 모습을 보여 준다. 이는 해당 실행에서의 탐색 경로를 설명하는 그림이며 전역 최적해를 찾는다는 증명은 아니다. 또한 이 ablation은 HotpotQA·IFBench·HoVer·PUPA 네 과제 평균이다. 앞선 여섯 과제 평균 54.85와 직접 비교해 성능이 더 높아졌다고 해석해서는 안 된다.

### Few-shot 예시 대비 지시문의 길이

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig18-prompt-length.png" class="img-fluid rounded z-depth-1" caption="Figure 18: 네 과제의 최적화된 prompt token 수. 위쪽 GPT-4.1 Mini, 아래쪽 Qwen3-8B, 막대 위 MIPROv2 대비 길이 비율." zoomable=true %}

MIPROv2는 demonstration을 포함하기 때문에 프롬프트가 길어질 수 있다. Figure 18의 네 과제 aggregate에서 GPT-4.1 Mini용 GEPA 프롬프트는 MIPROv2보다 4.3배 짧고, Merge는 4.8배 짧다. Qwen3-8B에서는 각각 4.9배와 4.5배이며, 개별 PUPA의 Merge 결과에서 최대 9.2배 차이가 나온다. 이 수치는 기본 seed 프롬프트 대비 축소율이 아니라 최적화된 MIPROv2 결과 대비다.

실패에서 배운 전략을 instruction에 압축하면 예시를 여러 개 그대로 넣는 것보다 짧게 표현할 수 있다는 해석이 가능하다. 다만 최적화된 GEPA 지시문 자체가 짧거나 단순하다는 뜻은 아니다. 부록에는 상당히 긴 규칙과 예외를 쌓은 프롬프트도 나온다. Token 수 감소는 serving 비용을 줄일 가능성을 보여 주지만, 실제 지연 시간은 출력 길이와 모델의 reasoning 등에도 좌우된다.

### Adversarial prompt와 평가 형식의 취약성

추가 실험에서는 AIME 2022–2024 문제로 adversarial prompt를 탐색하고 GPT-5 Mini의 AIME-2025 pass@1을 76%에서 10%로 낮춘다. 이때 모델이 수학적 능력을 잃었다고 해석하면 안 된다. 최종 프롬프트는 관련 없는 내용과 출력 지시를 이용하며, 모델이 실제 정답 대신 문자 그대로 `### <final answer>`를 출력하는 현상도 관찰된다. 요구된 형식과 채점 경로를 교란하는 효과가 성능 저하에 포함된다.

이 결과는 GEPA가 evaluator가 보상하는 방향으로 강하게 탐색한다는 사실을 반대 방향에서 보여 준다. 공격 성공률이 목표라면 시스템의 취약한 경로를 찾아내고, 답변 품질이 목표라도 metric에 허점이 있으면 그 허점을 이용할 수 있다. 따라서 좋은 optimizer를 갖추는 것과 좋은 평가 목적을 설계하는 일은 분리할 수 없다.

## 한계와 비판적 평가

### Validation 반복 사용과 작은 평가 집합

Pareto set은 탐색 과정에서 반복 사용된다. 독립 test를 남겼다는 점은 장점이지만, 작은 validation에서 특이한 성공을 보인 후보가 계속 선택될 수 있다. 특히 AIME는 test의 고유 문제가 30개뿐이므로 다섯 번의 생성이 문제 다양성까지 늘려 주지는 않는다. 한 평균 점수 차이를 다른 문제 분포에서도 안정적인 개선으로 받아들이려면 더 많은 문제와 반복 실행이 필요하다.

부록의 실제 프롬프트에는 일반적인 검색 전략뿐 아니라 특정 이름이나 사례를 포함한 규칙도 남는다. 일부 instruction-following 프롬프트는 질문 반복처럼 과도하게 구체적인 지시를 추가한다. 이런 관찰만으로 성능 하락의 원인을 확정할 수는 없지만, 점수가 오른 프롬프트가 사람이 원하는 간결하고 일관된 정책과 같지는 않음을 보여 준다. 도입할 때는 test 점수 외에 충돌하는 규칙과 원하지 않는 행동도 점검해야 한다.

### Rollout 비교의 범위와 RL의 개선 여지

주요 GRPO 비교는 특정 모델, LoRA 설정, 최대 24,000 rollouts, 선택된 hyperparameter에 대한 실험이다. GEPA의 유리한 결과를 더 큰 모델, 더 긴 training, 다른 RL 알고리즘 전체로 일반화할 수 없다. 반대로 AIME의 GRPO 우위는 프롬프트 수정으로 해결하기 어려운 능력 향상에 가중치 업데이트가 도움이 될 가능성을 남긴다.

Reflection에는 언어모델 호출 비용이 들고, 후보의 전체 validation에도 비용이 든다. 프로그램마다 rollout 하나의 가격도 다르다. 실무에서 둘 중 무엇을 선택할지 판단하려면 최적화 총비용, 배포 시 prompt 길이, 예상 요청 수, 최종 품질을 함께 계산해야 한다. 논문의 효율 비교는 출발점이지만 그대로 구매나 인프라 규모의 결론이 되지는 않는다.

### 피드백 품질과 모듈 간 상호작용

GEPA는 실패 원인이 언어로 드러나는 환경에서 특히 설득력 있다. Compiler 메시지나 놓친 문서 목록은 구체적인 수정 근거를 준다. 그러나 사용자의 장기 만족도나 모호한 창작 품질처럼 정확한 feedback을 만들기 어려운 문제에서는 reflection이 잘못된 원인을 설명할 수 있다. 풍부한 문장이 있다는 사실보다 그 문장이 실제 문제와 연결되는지가 중요하다.

Merge의 모델별 차이는 이 한계를 더 분명하게 보여 준다. 각 모듈의 국소 개선이 전체 프로그램에서는 충돌할 수 있고, 제한된 예산에서 Merge 평가가 다른 탐색 기회를 줄일 수도 있다. 논문의 결과만으로 어느 원인이 Qwen3-8B의 하락을 얼마나 설명하는지는 분리할 수 없다. 그러므로 Merge를 기본적으로 켜기보다 자신의 프로그램에서 같은 예산으로 비교하는 접근이 타당하다.

## 시사점 / Takeaways

- <strong>실행 로그의 가치를 평가 점수와 함께 설계할 것.</strong> 어떤 제약을 어겼고 어떤 문서를 놓쳤는지 남겨야 reflection이 실제 수정 근거를 얻는다.
- <strong>최종 평가와 탐색 중 선택 기준을 구분할 것.</strong> 최종 평균 점수가 목표여도 평균 1위만 부모로 선택하는 전략이 가장 효율적이지는 않다.
- <strong>작은 프롬프트 개선에도 독립 test를 유지할 것.</strong> 읽기 좋은 규칙과 몇 개 예시의 성공은 일반화의 충분한 증거가 아니다.
- <strong>Merge와 모델 간 전이를 별도 실험으로 취급할 것.</strong> 재사용 가능한 전략은 존재하지만, 조합과 전이가 자동으로 이득을 보장하지 않는다.
- <strong>프롬프트 최적화와 RL을 단계적으로 비교할 것.</strong> 먼저 저비용으로 노출 가능한 능력을 확인하고, 남은 능력 차이를 가중치 학습으로 줄일 수 있는지 같은 평가 체계에서 살펴볼 가치가 있다.

## 설치 및 사용법

공식 [GEPA 저장소](https://github.com/gepa-ai/gepa)는 MIT license로 공개되어 있다. 다음은 리뷰 시점 README의 AIME quickstart를 줄인 예다. 논문의 실험 설정을 그대로 재현하는 스크립트가 아니라 현재 API를 익히기 위한 예시이며, task model과 reflection model 호출에 사용할 provider 인증과 API 비용이 필요하다.

```bash
pip install "gepa[full]"
```

```python
import gepa

trainset, valset, _ = gepa.examples.aime.init_dataset()
result = gepa.optimize(
    seed_candidate={
        "system_prompt": "Solve the problem. Put the final answer as ### <answer>."
    },
    trainset=trainset,
    valset=valset,
    task_lm="openai/gpt-4.1-mini",
    reflection_lm="openai/gpt-5",
    max_metric_calls=150,
)
print(result.best_candidate["system_prompt"])
```

여기의 GPT-5 reflection 설정과 150 metric calls를 논문의 모든 실험 설정으로 받아들이면 안 된다. 저장소는 논문 이후에도 발전했으며, README의 실행 예시와 논문 표의 점수는 동일한 재현 조건이 아니다. 이 리뷰에서는 유료 최적화를 실행하지 않았다. 실제 적용에서는 자신의 seed program과 metric을 정의하고, 수정에 사용할 training 자료와 선택용 validation, 마지막 확인용 test를 먼저 분리하는 것이 시작점이다.

## 참고 자료

- 원문: [GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning](https://arxiv.org/abs/2507.19457), Agrawal et al., arXiv v2, ICLR 2026 Oral.
- 코드 및 사용 예시: [gepa-ai/gepa](https://github.com/gepa-ai/gepa), MIT license.
- 그림·표 출처: Agrawal et al.의 원문 Figures 1, 3, 6, 7, 18 및 Tables 1–3. 원문 arXiv 배포 조건은 [non-exclusive distribution license](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html)이며 코드의 MIT license와 별개다.

## 더 읽어보기

- **[Optimizing Instructions and Demonstrations for Multi-Stage Language Model Programs](https://arxiv.org/abs/2406.11695)** (Opsahl-Ong et al., 2024): MIPRO의 instruction·demonstration 탐색과 multi-stage 프로그램 최적화의 배경.
- **[TextGrad: Automatic “Differentiation” via Text](https://arxiv.org/abs/2406.07496)** (Yuksekgonul et al., 2024): 자연어 feedback을 텍스트 변수의 수정 방향으로 전파하는 접근.
- **[Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366)** (Shinn et al., 2023): 실패에 대한 언어적 반성을 다음 시도의 기억으로 활용하는 방법.
- **[DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines](https://arxiv.org/abs/2310.03714)** (Khattab et al., 2023): LLM 프로그램을 모듈과 metric으로 표현하고 자동 최적화하는 기반.

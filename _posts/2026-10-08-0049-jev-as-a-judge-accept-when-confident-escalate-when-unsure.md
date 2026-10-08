---
layout: post
title: "[논문 리뷰] JEV-as-a-Judge: Accept When Confident, Escalate When Unsure"
date: 2026-10-08 09:05:26 +0900
description: "JEV의 확신도로 저비용 판정을 채택하고 어려운 사례만 추론 모델에 넘기는 평가 cascade의 성능, 비용, 실패 조건"
tags: [llm-as-a-judge, confidence, model-routing, evaluation, calibration]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig2-routing.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/
en_url: /en/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Yubo Li, Yidi Miao, Ramayya Krishnan, Rema Padman (Carnegie Mellon University) |
| 학회 | arXiv · 2026 · CC BY 4.0 |
| arXiv | [2609.26550v4](https://arxiv.org/abs/2609.26550v4) |
| 데이터 | RewardBench, JudgeBench, HaluEval, RM-Bench, PPE 등의 판정 과제 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-10-08 |

## TL;DR

- JEV는 설명문 대신 허용된 label의 확률을 반환하는 decision-only judge다. 이 연구는 새 모델을 학습하기보다, JEV의 판정을 언제 그대로 쓰고 언제 더 강한 judge에 넘길지 실험한다.
- 사전에 고정한 cascade는 미사용 선호 응답 1,610쌍에서 GPT-6 Astra보다 정확도 0.93 percentage points 높고, 같은 표본을 GPT-6만으로 판정할 때의 추정 API 비용 중 41.4%를 사용한다. 표본의 83%가 RewardBench라는 조건이 중요하다.
- 새로운 두 correctness 업무의 570쌍에서는 업무별 threshold를 정해 GPT-6와 동일한 정확도를 얻지만, 74.2%를 넘겨야 하므로 비용은 75.5%까지 올라간다. 어려운 업무일수록 절약 폭을 줄여 품질을 지킨 결과다.
- 높은 확신도 자체가 안전장치는 아니다. 오답의 문체가 더 정교한 경우 routing이 약해지고, 근거 없는 장문 평가에서는 확신도로 오류를 구분하는 능력이 거의 무작위 수준이다.

## 소개 (Introduction)

모델의 응답을 다른 모델로 평가하면 사람의 검토를 모두 기다리지 않고도 많은 실험을 비교할 수 있다. 문제는 평가 대상이 늘어날수록 judge의 호출도 함께 늘어난다는 점이다. 새 checkpoint를 만들 때마다 수천 개의 답변을 다시 비교하고, 데이터 필터링이나 학습 reward를 만들 때 같은 판정을 반복한다. 가장 강한 추론 모델을 모든 항목에 사용하면 어려운 오류를 찾을 가능성이 높지만, 명백히 좋은 답변과 명백히 나쁜 답변을 가르는 데까지 같은 비용을 지불한다.

반대로 저렴한 judge 하나로 전부 처리하면 무엇을 놓쳤는지 알기 어렵다. 문장이 자연스럽고 길다는 이유로 잘못된 풀이를 선호할 수 있고, 수학이나 코드의 결론을 실제로 검증하지 않은 채 표면적 단서를 따라갈 수도 있다. 그래서 필요한 것은 단순히 평균 정확도가 높은 저가 모델만이 아니다. 자신이 잘 처리한 사례와 추가 추론이 필요한 사례를 구분하는 신호가 있어야 한다. 그 신호가 실제 오류와 연결된다면 비싼 추론은 필요한 일부 항목에 집중할 수 있다.

Li et al.의 [JEV-as-a-Judge](https://arxiv.org/abs/2609.26550)는 이 가능성을 TypeSafe의 JEV로 측정한다. 이 리뷰는 2026년 10월 6일 공개된 v4의 본문과 부록을 기준으로 한다. 가장 중요한 질문은 JEV가 GPT-6를 전부 대체할 수 있는지가 아니라, 어떤 종류의 판단을 맡길 수 있고 그 경계를 실제 데이터에서 어떻게 정할 수 있는지다. 본문을 따라가려면 단일 모델 성능, 확신도의 오류 구분 능력, 두 모델을 연결한 시스템의 성능을 서로 다른 측정으로 읽어야 한다.

## 핵심 기여 (Key Contributions)

- **판정 업무별 적용 범위:** 일반 선호도·근거 기반 사실성처럼 텍스트에서 판단 단서를 읽는 작업과, 수학·코드·논리처럼 결과를 도출해야 하는 작업을 분리한 실증 분석.
- **동일한 출력 형식의 비교:** JEV와 생성형 judge에 같은 입력과 label 확률 계약을 적용하고, 정확도·확률 품질·실패·API 비용·응답 시간을 함께 측정한 비교.
- **고정 threshold와 새 업무의 검증:** 기존 출력의 사후 조합, 사전에 정한 정책의 held-out 평가, 실제 순차 호출, 새로운 업무의 prospective test를 구분한 검증.
- **운영 가능한 threshold 선택 절차:** 소규모 현지 label에서 정확도 차이의 점추정치 대신 하한을 사용하고, 업무별 threshold와 별도 검증 표본을 두는 절차.

## 관련 연구 / 배경 지식

### 판정 정확도와 확률 품질의 구분

LLM-as-a-judge는 질문과 후보 응답, 평가 기준인 rubric을 받아 어느 답변이 더 좋은지 판정한다. Reward model도 응답에 점수를 부여하지만, scalar 점수의 차이가 곧 정답 확률인 것은 아니다. 이 논문에서 Skywork의 reward 차이는 별도 routing 신호로 사용할 수 있어도, 그대로 Brier score 같은 확률 평가에 넣지는 않는다. 반대로 생성형 모델이 JSON으로 0.9를 출력했다고 해서 그 값이 통계적으로 검증된 확률이 되는 것도 아니다.

여기서 calibration은 90%라고 말한 사례들을 모았을 때 실제로 약 90%가 맞는지를 뜻한다. 오류 구분 능력은 틀린 사례에 상대적으로 더 낮은 확신도를 주는지다. 두 속성은 연결되지만 동일하지 않다. 확률이 전반적으로 과신되어 있어도 오류 순서는 잘 정렬할 수 있고, 평균적인 확률 오차가 작더라도 특정 위험 집단을 가려내지 못할 수 있다. Cascade가 직접 필요로 하는 것은 먼저 오류를 찾아 넘길 수 있는 순위 신호이며, threshold를 다른 업무로 옮길 때는 그 신호의 분포까지 다시 확인해야 한다.

### 선택적 판정과 judge 오류의 상관관계

확실한 경우만 답하고 나머지는 보류하는 선택적 예측(selective prediction)은 오래된 문제다. [Trust or Escalate](https://arxiv.org/abs/2407.18370)는 이를 LLM 평가와 여러 단계의 judge에 연결했다. JEV 논문은 새로운 routing 알고리즘이나 보편적인 보장을 제안하기보다, 특정 hosted judge의 확률이 이런 운영에 얼마나 쓸 만한지 조사한다. 따라서 threshold 선택 규칙의 단순함보다 실제 평가 설계와 실패 분석이 기여의 중심이다.

두 번째 judge가 강하다는 사실만으로 모든 오류가 수정되지는 않는다. JEV와 fallback이 같은 문체나 잘못된 상식에 속으면 호출을 하나 더 해도 판정은 그대로다. Rao et al.의 [JEV vs. LLMs as Rubric Judges](https://arxiv.org/abs/2609.29769)는 저렴한 생성형 judge들과 JEV의 공유 오류가 cascade의 개선을 제한함을 보여 준다. 이번 논문은 더 강한 추론 judge가 JEV의 어떤 오류를 고칠 수 있는지 본다는 점에서 비교 설정이 다르다. 두 결과를 하나의 모델에 대한 찬반으로 읽기보다, fallback의 오류가 얼마나 보완적인지에 대한 질문으로 연결하는 편이 맞다.

## 방법 / 아키텍처 상세

### 1. Label 확률과 최대 확률 기반 confidence

{% include figure.liquid loading="eager" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig2-routing.png" class="img-fluid rounded z-depth-1" caption="Figure 2: Label 확률의 최댓값과 threshold에 따른 JEV 판정 채택·강한 judge 이관 흐름. 확률값은 설명용 예시." zoomable=true %}

JEV에 전달하는 것은 자연어 지시, 구조화된 state, 허용된 출력 type이다. 주 실험은 한 요청에 하나의 Choice 질문을 넣는다. 두 답변의 선호도를 평가한다면 state에는 질문과 A·B 응답이 들어가고, label의 의미는 rubric으로 지정한다. 반환 결과는 선택된 label과 각 label의 확률이다. 연구에서 사용하는 confidence는 다음과 같다.

$$
q = \max_k p_k.
$$

여기서 $p\_k$는 label $k$의 반환 확률이다. 주의할 점은 JEV 응답에 이미 `confidence`라는 native field도 있다는 사실이다. 그 값은 분포 전체로부터 계산하는 공급자 고유의 통계량이며 정확한 구현은 공개되지 않는다. 저자들은 모든 judge에서 공통으로 얻을 수 있는 최대 label 확률을 사용한다. 따라서 API의 `confidence` 필드를 그대로 읽는 구현과 이 논문의 routing을 같은 것으로 취급해서는 안 된다.

JEV는 yes/no 확률을 반환하는 Noul과 순서 있는 척도의 확률을 반환하는 Score도 제공한다. 그러나 같은 이진 질문을 서로 다른 type으로 표현해도 확률이 완전히 같지는 않았다. 48개 사례의 interface audit에서 Choice와 Noul의 차이는 평균 0.055였고, 근접한 판정 하나가 뒤집혔다. Type을 자유롭게 바꾸면서 같은 threshold를 재사용할 근거는 없으므로, 실제 적용에서는 입력 형식과 label 의미까지 하나의 고정된 평가 설정으로 다루는 것이 자연스럽다.

### 2. 후보 순서 정렬과 두 확률의 평균

응답을 A 다음 B로 제시할 때와 B 다음 A로 제시할 때 judge의 선택이 달라질 수 있다. 첫 번째 위치를 선호하는 편향과 실제 응답의 품질을 구분하려면, label 이름이 아니라 원래 응답의 정체성으로 확률을 정렬해야 한다. 논문의 사전 고정 pairwise 정책은 두 순서를 모두 판정한다.

$$
\begin{aligned}
\bar p(A) &= \tfrac12\bigl[p_1(A,B)\bigr.\\
&\qquad\bigl.+1-p_1(B,A)\bigr],\\
q &= \max\{\bar p(A),1-\bar p(A)\}.
\end{aligned}
$$

$p\_1(x,y)$는 응답을 $(x,y)$ 순서로 보여 주었을 때 첫 번째 응답을 선호할 확률이다. 두 번째 호출에서 첫 번째 자리에 놓인 것은 B이므로, 그 값의 여집합을 취해야 A에 대한 확률이 된다. 두 호출의 첫 label 확률을 그대로 평균내면 후보가 서로 바뀐 상태의 값을 더하는 셈이 된다. 위 식은 위치가 바뀌어도 같은 응답에 대한 믿음을 결합하기 위한 처리다.

평균 확률이 더 큰 응답을 JEV의 판정으로 삼고, 정확히 동률이면 평가에서 반 점수를 준다. 한쪽 호출이라도 유효하지 않으면 항상 fallback으로 넘긴다. 모든 항목을 두 번 읽는 만큼 JEV 호출 비용도 두 번 계산한다. 이 조치는 순서 변화에 대한 완충 장치이지만, 그 자체로 큰 정확도 향상을 보장하는 핵심 알고리즘이라고 보기는 어렵다. 논문은 평균 전후의 효과를 별도로 측정한다.

### 3. 독립 fallback과 최종 판정의 교체

$q$가 정해진 threshold $\tau$ 이상이면 JEV의 판정을 채택한다. 미만이면 더 강한 judge를 호출하고 그 판정을 최종 결과로 사용한다. Fallback은 JEV의 선택이나 확률을 보지 않고 원래 입력을 독립적으로 평가한다. 두 judge가 토론하거나, 두 확률을 다시 평균내거나, fallback이 첫 판정을 수정하는 이유를 생성하는 구조는 아니다.

이 순차 교체 방식은 비용의 의미도 명확하게 만든다. 모든 사례에는 JEV 비용이 들고, 이관한 사례에만 fallback 비용이 추가된다. 다만 호출 비율과 비용 비율은 같지 않다. JEV가 어려워하는 사례의 입력이 더 길거나 fallback의 reasoning token이 많으면, 30%만 넘겨도 비용은 30%보다 높을 수 있다. 실제 headline 결과에서도 이관율 31.5%와 비용 비율 41.4%가 다르다. 각 표본의 실제 usage를 기준으로 계산해야 하는 이유다.

실시간 실험에서는 두 JEV 순서를 동시에 실행하고, 이관이 필요할 때 그 뒤에 GPT-6를 호출한다. 따라서 채택된 사례는 빠르게 끝나지만, 이관된 사례는 JEV를 기다린 시간까지 추가된다. 평균 비용이 줄었다는 결과만으로 모든 요청의 latency가 줄었다고 말할 수 없다. 대부분을 이관해야 하는 업무에서는 비용이 조금 줄어도 응답 시간 개선은 작거나 일부 구간에서 사라질 수 있다.

### 4. 점추정치와 하한 기반 threshold 선택

Threshold는 정답 label이 있는 target workload의 작은 selection set에서 고른다. 각 후보 threshold에 대해 cascade와 fallback이 같은 항목에서 맞았는지 비교한다. Cascade가 맞고 fallback만 틀렸다면 이득이고, 그 반대면 손해이며, 둘이 함께 맞거나 함께 틀렸다면 차이는 없다. 일반적인 이진 correctness 항목의 차이를 수식으로 쓰면 다음과 같다.

$$
\begin{aligned}
d_i &= \mathbf{1}\{\hat y_i^{\mathrm{cascade}}=y_i\}\\
&\quad-\mathbf{1}\{\hat y_i^{\mathrm{fallback}}=y_i\}.
\end{aligned}
$$

원문은 이 차이를 −1, 0, 1로 설명하며, 평균 확률이 정확히 동률인 판정에는 앞서 말한 반 점수 처리도 둔다. Point rule은 평균 차이 $\bar d$가 −0.02 이상인 후보 중 가장 많이 채택하는 threshold를 고른다. 즉 비용과 오류를 임의의 가중합으로 최소화하지 않고, fallback 대비 정확도 손실을 2 percentage points 이내로 제한한 뒤 coverage를 높인다. 같은 coverage의 tie에는 더 엄격한 threshold를 선호한다.

작은 selection set에서는 관측된 손실이 작아도 진짜 손실이 작다고 확신하기 어렵다. Lower-bound rule은 이를 고려해 다음 조건을 요구한다.

$$
\bar d-1.645\frac{s_d}{\sqrt n}\ge -0.02.
$$

$n$은 selection 항목 수, $s\_d$는 항목별 차이의 표준편차다. 한쪽 95% 정규근사 하한을 사용하므로 점추정치가 경계에 가까운 후보는 통과하기 어렵다. PPE selection 100쌍에서 threshold 0.9는 관측 차이 −2.00 points로 point rule을 만족하지만 하한은 −4.31 points다. Lower-bound rule은 차이가 없었던 0.95로 이동한다. 아무 후보도 통과하지 못하면 모두 넘긴다. 이 식은 보수적인 선택 절차이며, 분포 변화나 여러 threshold 탐색까지 포괄하는 무조건적인 성능 보장으로 해석해서는 안 된다.

## 평가 목표 / 지표 정의

### 정확도, 오류 구분, 확률 오차의 역할

이 연구는 JEV의 학습 목표나 손실 함수를 제안하지 않으며 어떤 모델도 새로 학습하거나 fine-tuning하지 않는다. 주된 목표는 이미 존재하는 judge를 평가하고 호출 정책을 정하는 것이다. 기본 정확도는 제공된 benchmark label과 판정이 일치하는 비율이고, final-answer 과제는 label 작성자의 출처가 완전하지 않아 검증된 정답에 대한 정확도보다 기존 label과의 agreement로 해석한다. 출력 실패도 정확도 분모에 남겨 오답으로 센다.

Brier score는 모든 label의 예측 확률과 정답의 one-hot 표현 사이 제곱 오차를 더한 값이다. NLL은 정답 label에 얼마나 낮은 확률을 주었는지 벌점을 부여하고, ECE는 confidence를 열 구간으로 나누어 구간별 확률과 정확도의 차이를 요약한다. 이 세 값은 작을수록 좋다. 반면 error-detection AUROC는 오답을 양성으로 놓고 $1-q$로 정렬할 때 얼마나 잘 분리되는지 보며, 0.5는 무작위 순위에 해당한다. 확률 지표는 유효한 응답에 대해서만 계산하므로 정확도와 분모가 다를 수 있다.

이 차이는 운영 판단에 직접 연결된다. JSON schema를 완벽하게 지키는 모델도 내용은 틀릴 수 있고, 확률이 잘 정렬되는 모델도 절대값은 과신할 수 있다. 또한 benchmark label이 잘못되면 옳은 판단에 높은 확률을 준 모델이 오히려 큰 벌점을 받는다. 따라서 단일 calibration 숫자로 judge의 신뢰성을 서열화하기보다, 실제 판정 오류와 label 검증, 채택 coverage를 같이 읽어야 한다.

### API 비용과 응답 시간의 측정 범위

비용은 수집 당시 가격과 반환된 usage로 계산한 추정값이며 청구서의 실측 합계가 아니다. Cached input 할인과 billed reasoning token을 포함하고, usage가 빠진 호출은 보수적인 예약 비용을 더한 상한도 보고한다. 로컬 모델에는 임의의 API 환산 단가를 부여하지 않는다. 따라서 로컬 first stage가 포함된 cascade의 API 비용은 GPU 시간까지 합친 총소유비용과 다르다.

Latency의 주 비교는 품질 평가 전체 실행에서 가져오지 않는다. 그 실행의 동기식 비용 기록이 client를 지연시켰기 때문에, 별도로 고정한 120개 항목의 timing panel을 사용했다. Public task별 40개, persistent client, 고정 pacing 등의 조건에서 네트워크·provider·retry가 포함된 outcome latency를 측정한다. 이는 모델의 순수 연산 시간이나 최대 throughput이 아니다. Cascade의 실시간 latency와 단일 judge timing panel의 중앙값도 서로 다른 표본이므로 숫자를 직접 섞지 않아야 한다.

## 평가 데이터와 파이프라인

### 기본 표본과 selection·held-out 분리

<div class="table-responsive" markdown="1">

| 평가 묶음 | 표본과 역할 | 주요 해석 조건 |
|-----------|-------------|----------------|
| RewardBench | 선호 응답 1,500쌍 | 공식 subset 가중치와 다른 표본 구성 |
| JudgeBench | GPT-4o split 전체 350쌍 | 지식·추론·수학·코드 correctness |
| HaluEval QA | 질문 1,500개에서 답변 3,000개 | 질문마다 정답·hallucinated 답변, supplied evidence 포함 |
| Final answer·controls | 150 + 108 + 64개 | 기존 label agreement 및 쉬운 양성·합성 control |
| Frozen cascade | Selection 96쌍, held-out 1,610쌍 | Selection은 RewardBench 64, JudgeBench 32쌍 |
| Prospective test | 업무별 selection 100쌍, held-out 총 570쌍 | PPE 400쌍과 JudgeBench Claude split 170쌍 |

</div>

기본 판정은 총 5,172개이고 pilot 642개와 held-out 4,530개로 나뉜다. 같은 질문에서 나온 응답은 서로 다른 split에 흩어지지 않게 묶는다. 이 중 cascade의 핵심 held-out 평가는 선호 응답 1,610쌍이다. HaluEval의 2,920개 held-out 판정까지 더한 4,530개 전체와 구분해야 한다. 각 결과의 신뢰구간도 관련 응답을 독립 표본처럼 부풀리지 않도록 source question 단위 bootstrap을 사용한다.

신규 PPE 표본은 MMLU-Pro, MATH, GPQA, MBPP-Plus, IFEval에서 각각 100쌍을 뽑고, 업무 내부 selection과 test를 분리한다. JudgeBench의 Claude-3.5-Sonnet split은 이전에 판정하지 않은 응답 270쌍을 사용한다. 다만 질문 91개는 기존 GPT-4o split과 겹치므로 완전히 새로운 질문만의 실험은 아니다. 저자들은 이를 남겨 두되 seen·unseen 질문 결과를 분리한다. 새 응답과 새 질문을 같은 일반화 조건으로 묶지 않는 것이 중요하다.

### 동일 출력 계약과 실험의 사전 고정 범위

주 비교는 JEV, 생성형 LLM 14개, reward model 2개를 합친 17개 설정이다. Hosted reasoning judge는 대체로 low effort를 사용하고 Qwen3.6은 default 설정이다. 로컬 Qwen은 non-thinking mode이므로 크기·계산량·serving이 일치하는 아키텍처 비교가 아니다. 생성형 judge도 JEV와 같은 입력을 받아 verdict와 모든 label의 확률만 출력하며, 공개 설명문은 요구하지 않는다. 그래도 내부 reasoning 비용은 발생할 수 있고 가격 계산에 포함된다.

Schema field, label 소속, 유한한 확률, 합계, verdict와 argmax의 일치 여부를 검사한다. 확률 합 허용 오차는 반올림을 고려한 0.025다. 잘못된 내용을 더 좋은 답으로 바꾸려는 재시도나 사후 수정은 없고, 일시적인 transport 실패만 최대 세 번 시도한다. 선호 정답, 응답 생성 모델 이름, split 같은 숨겨야 할 metadata는 입력에서 제외한다. Final-answer 과제에서 reference가 보이는 것은 누수가 아니라 과제 정의 자체다.

모든 분석이 사전에 계획된 것은 아니다. Frozen two-order 정책, 인간 adjudication의 primary outcome, 새로운 업무의 prospective protocol은 평가 결과를 보기 전에 고정했다. 반면 여러 모델 family 비교, skill별 slice, 전체 threshold sweep, 다른 first stage의 비교는 탐색적이다. 예쁘게 보이는 곡선에서 가장 좋은 지점을 고른 결과와, 처음 정한 threshold를 손대지 않고 평가한 결과의 증거 강도가 다르다는 점을 계속 유지해야 한다.

## 실험 결과

### 단일 judge의 성능과 비용 위치

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/tab1-main-results.png" class="img-fluid rounded z-depth-1" caption="Table 1: 17개 judge 설정의 기본 정확도(%), 유효 응답 수, 120항목 timing panel의 1,000건당 추정 비용(USD)과 latency 중앙값(초)." zoomable=true %}

JEV의 RewardBench 정확도는 92.5%로 GPT-6와 같고, HaluEval은 87.3%로 GPT-6의 88.4%보다 1.1 points 낮다. 반면 JudgeBench에서는 78.6% 대 93.1%로 차이가 크다. 원래 집계값에서 계산한 paired difference는 −14.6 points이며, 반올림한 두 표시값의 단순 차이와 조금 다르다. Final-answer의 label agreement는 94.0% 대 96.7%다. Public 판정 4,850개를 합치면 JEV는 LLM judge 15개 중 여덟 번째다.

차별점은 최고 정확도보다 비용이다. Timing panel에서 JEV는 1,000건당 0.044달러, GPT-6는 12.182달러이며, 중앙 latency는 각각 0.15초와 1.89초다. 약 277배의 비용 차이와 약 13배의 시간 차이다. 다만 이 숫자는 단일 판정의 비교다. JEV가 어려워한 항목을 GPT-6에 넘기는 시스템 전체에 277배 절감을 그대로 적용할 수 없다. GPT-6 역시 모든 benchmark에서 최고인 기준 모델은 아니며, GPT-5.6 Sol은 public pooled 정확도가 더 높고 이 timing panel의 비용은 약 절반이다.

### 텍스트 단서와 결과 도출의 성능 경계

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig4-skill-boundary.png" class="img-fluid rounded z-depth-1" caption="Figure 4: (a) Skill별 JEV−GPT-6 정확도 차이(pp)와 95% 구간, (b) 다른 judge 13개의 오답 수별 정확도(%), (c) RM-Bench 문체·domain별 정확도 차이(pp)." zoomable=true %}

Skill을 benchmark 경계 밖으로 모으면 차이가 더 선명하다. 채팅 품질, 유해 요청 거절, 답해야 하는 요청, 근거 기반 사실성에서는 JEV가 GPT-6의 약 2 points 이내에 있다. 전문가 지식에서는 7.0 points, 코드에서는 12.9 points, 수학에서는 14.3 points, 논리 퍼즐에서는 27.6 points 뒤진다. 단순히 코드라는 이름의 과제이면 전부 어렵다는 뜻은 아니다. 눈에 보이는 버그를 비교하는 RewardBench code-repair에서는 두 모델이 99–100%에 도달하지만, 결과를 따라가야 하는 LiveCodeBench에서는 간격이 커진다.

저자들은 JEV와 GPT-6를 제외한 다른 LLM judge 13개가 틀린 수로 난이도를 나눈다. 모두 맞힌 3,286개에서 두 모델은 99.8%와 99.7%이고, 10개 이상이 틀린 311개에서는 둘 다 9.6%다. 차이는 그 사이의 중간 난이도에 모인다. 매우 쉬운 경우는 저렴한 judge도 처리하고, 대부분이 놓치는 경우는 강한 judge도 어렵지만, 추론 모델이 아직 풀 수 있는 중간 영역에서 fallback의 추가 계산이 가치를 만든다는 해석이다. 이는 전체 benchmark label을 기준으로 한 관측이며 가장 어려운 집단에는 label 문제도 포함될 수 있다.

### 고정 cascade의 held-out 결과와 표본 구성

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/tab4-frozen-cascade.png" class="img-fluid rounded z-depth-1" caption="Table 4: Threshold 0.9로 고정한 1,610쌍의 cascade 결과. 정확도(%), GPT-6 대비 차이(pp), 이관율(%), 포착한 JEV 오류 비율(%), 동일 표본의 비용 비율." zoomable=true %}

Selection 96쌍에서 정한 threshold 0.9를 그대로 적용하면 1,610 held-out 쌍의 68.5%를 JEV가 처리하고 31.5%를 GPT-6로 넘긴다. 넘긴 집단에 JEV 오류의 85%가 들어 있다. 최종 정확도는 93.4%로 GPT-6 단독 92.5%보다 높고, paired gain은 +0.93 points, 95% 구간은 [0.24, 1.66]이다. 비용은 GPT-6 단독의 41.4%, missing usage를 보수적으로 계산하면 44.0%다.

이 평균을 만드는 두 benchmark의 모습은 다르다. RewardBench 1,340쌍에서는 24.8%를 이관하고 GPT-6보다 1.27 points 높으며 비용 비율은 0.267이다. JudgeBench 270쌍에서는 64.8%를 이관하고, JEV 단독 81.3%가 cascade 92.2%로 올라가지만 GPT-6의 93.0%에는 조금 못 미친다. 차이 −0.74 points의 구간 [−2.22, 0.74]는 0과 −2를 모두 포함한다. 관측된 손실이 작다는 것과 모든 미래 표본에서 2 points 이내임이 입증됐다는 것은 다르다.

이전 버전의 비용 비율 56.8%와 최신 41.4%도 모델 성능 개선으로 읽으면 안 된다. 이전 510쌍은 JudgeBench 비중이 53%였고, 이후 RewardBench 1,100쌍이 추가되면서 최신 표본의 JudgeBench 비중은 17%가 됐다. 기존 출력과 threshold는 그대로다. 어려운 업무가 적어지면 pooled 절감률이 커지는 구성 효과이므로, 자신의 실제 workload 비율에 가까운 benchmark별 결과를 우선 참고해야 한다.

### 새로운 업무의 prospective 실시간 검증

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/tab5-prospective.png" class="img-fluid rounded z-depth-1" caption="Table 5: 신규 570쌍의 실시간 cascade와 threshold 0.9의 사후 비교. 업무별 정확도(%), 이관율(%), 비용 비율과 latency p50·p95(초)." zoomable=true %}

새로운 업무에서는 업무별 selection 100쌍에 lower-bound rule을 적용한다. PPE에는 0.95, JudgeBench Claude split에는 0.99가 선택됐다. Held-out의 JEV 단독 정확도는 각각 78.2%와 70.9%로 GPT-6의 88.2%와 94.7%보다 낮다. 그러나 threshold를 엄격하게 잡아 각각 67.8%와 89.4%를 이관한 결과, cascade는 두 업무 모두 GPT-6와 같은 집계 정확도에 도달한다.

전체 570쌍에서는 JEV 76.1%, cascade와 GPT-6가 각각 90.2%다. 이관율 74.2%, JEV 오류 포착률 93%, 비용 비율 0.755이므로 약 24.5%를 절약한다. 이전 headline의 약 59% 절약보다 작지만, first stage가 약한 업무에서 더 많이 넘기도록 현지 threshold를 조정한 결과라는 점에서 설득력이 있다. 서로 다른 데이터에서도 항상 같은 절감률을 유지한다는 주장이었다면 오히려 근거가 약했을 것이다.

Latency 중앙값은 cascade 1.87초, GPT-6 단독 1.91초이고 p95는 4.95초와 5.58초다. 쉬운 항목만 따로 보면 빠르지만, 대부분이 이관되므로 전체 중앙값은 크게 줄지 않는다. 같은 정확도도 모든 항목에서 같은 답을 냈다는 뜻은 아니며, PPE의 정확도 차이 구간은 [−1.00, 1.00] points다. JudgeBench의 seen·unseen 질문에서도 각각 parity를 보고하지만, 두 correctness workload의 관측을 모든 평가 과제로 확장할 수는 없다.

## 결과 분석 / Ablation

### Confidence의 오류 집중과 순서 평균의 효과

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig5-confidence.png" class="img-fluid rounded z-depth-1" caption="Figure 5: JEV confidence 구간별 JEV와 GPT-6의 정확도(%). Pairwise 과제는 양순서 평균, HaluEval은 단일 판정이며 가로축 아래는 항목 수." zoomable=true %}

Public 4,850개를 JEV confidence로 나누면 $q\ge0.9$인 3,744개에서 JEV와 GPT-6는 94.7%와 94.4%로 가깝다. 그보다 낮은 1,106개에서는 67.7%와 75.0%로 fallback의 이점이 커진다. 이미 잘 처리하는 집단은 저가 모델에 남기고 추가 추론의 효과가 큰 집단만 보내는 근거다. 다만 이는 같은 전체 표본을 사후 분할한 설명이며, Table 4의 별도 held-out 결과와 동일한 실험은 아니다.

순서를 뒤집어 JEV 판정이 바뀐 95쌍 중 base-order confidence가 0.9 이상인 것은 세 쌍뿐이다. 불안정성이 대부분 낮은 confidence 영역에 모이므로 gate가 그 위험을 상당 부분 흡수한다. Held-out 1,610쌍에서 양순서 평균 자체의 정확도 이득은 +0.62 points, 95% 구간 [−0.22, 1.42]로 유의하지 않다. 순서 평균을 넣었다는 사실보다, 오류가 gate 아래로 모이는지가 더 직접적인 설명이다.

또한 “오류 대부분이 낮은 confidence에 있다”와 “높은 confidence 집단이 다른 모델보다 안전하다”는 다르다. 단일 호출 JudgeBench에서 JEV의 전체 오류 중 고확신 오류의 몫은 12%로 GPT-6의 25%보다 작지만, 고확신 집단 내부 오류율은 JEV 6.5%, GPT-6 2.0%다. 앞의 숫자는 오류를 얼마나 넘길 수 있는지, 뒤의 숫자는 남겨 둔 판정이 얼마나 위험한지를 말한다. 분모를 바꾸어 두 주장을 혼동하면 저가 judge의 안전성을 과장하게 된다.

### 문체 교란과 reference-free 장문의 실패

RM-Bench는 같은 prompt의 좋은 답과 나쁜 답을 concise, detailed plain text, detailed Markdown으로 조합한다. 두 답의 문체가 같을 때 JEV는 85.4%이지만, 나쁜 답을 더 정교하게 쓴 hard 조건에서는 76.6%로 떨어진다. GPT-6는 91.8%에서 90.1%로 훨씬 덜 변한다. 단순한 길이 선호와 동일한 현상으로 환원할 수는 없지만, 표현의 품질과 내용의 정확성을 분리하는 데 JEV가 더 취약하다는 결과다.

Confidence도 함께 약해진다. 양순서 평균 기준 error-detection AUROC는 normal 조건 0.839에서 hard 조건 0.764로 떨어지고, 고확신 집단의 오류율은 easy 1.5%에서 hard 7.9%로 커진다. 더 높은 threshold 0.99를 쓰면 hard 조건에서 GPT-6의 정확도를 맞출 수 있지만 76%를 이관해야 한다. 이 결과는 같은 표본에서 threshold를 살핀 사후 분석이므로 신규 환경에 대한 검증된 기본 설정은 아니다.

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig16-prose.png" class="img-fluid rounded z-depth-1" caption="Figure 16: 근거 문서 요약과 reference-free 응답의 label agreement·평균 최대 확률(상단, %) 및 JEV의 정답·오답 confidence 분포(하단, 건수). 검은 마름모는 평균 최대 확률." zoomable=true %}

더 강한 실패는 reference-free 장문이다. 기존 인간 label을 기준으로 균형 있게 뽑은 200개 응답에서 JEV, GPT-4.1 mini, GPT-5.4의 agreement는 53.5%, 54.0%, 56.0%인데 평균 최대 확률은 0.91, 0.94, 0.96이다. JEV의 오류 구분 AUROC는 0.498이다. 거의 무작위에 가까운 판단을 매우 자신 있게 내리므로, confidence threshold를 올리는 것만으로 믿을 만한 하위 집단이 자동으로 생기지 않는다. 이 실험에는 GPT-6가 포함되지 않았으며, GPT-6도 같은 수치를 보였다고 확대해서는 안 된다.

문서가 주어진 요약 400개에서 JEV agreement는 69.8%였다. 하지만 두 장문 집단은 내용과 label의 출처까지 달라, 이 차이를 근거 제공 하나의 인과 효과로 읽을 수 없다. 이 결과가 지지하는 것은 workload 의존성이다. “장문”이라는 표면적 특징만으로 적용 범위를 정하거나, reference 없는 factuality 평가에 기존 confidence를 그대로 이식할 근거는 없다.

### Threshold 추정의 표본 수와 업무별 분리

논문은 1,850쌍에서 selection 표본을 반복 추출하고 나머지에서 평가하는 simulation도 수행한다. 96개 label로 하나의 threshold를 정할 때 point rule은 정확도 손실이 2 points를 넘는 경우가 44.0%다. 같은 label 수의 lower-bound rule은 5.2%, 업무별 lower-bound threshold는 0.6%다. 즉 label 수를 늘리는 것뿐 아니라 uncertainty를 반영하고 성격이 다른 업무를 분리하는 것이 중요하다.

이 simulation에서 96개는 전체 추출 예산이며 업무마다 96개를 배정한 것이 아니다. 반면 prospective test는 업무마다 100개를 사용한다. 또한 simulation은 같은 benchmark pool을 재사용하므로 distribution shift에 대해서는 낙관적일 수 있다. “100개면 충분하다”라는 보편적 표본 수 법칙보다, 작은 시작 표본으로 보수적으로 선택한 뒤 별도 held-out 성능을 확인하는 운영 절차로 읽는 편이 정확하다.

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig9-prospective-tradeoff.png" class="img-fluid rounded z-depth-1" caption="Figure 9: 신규 업무의 threshold별 정확도(%)와 상대 비용(a·c), 평균 latency(초, b·d). 빈 원은 selection에서 고정한 실시간 정책, 별표는 GPT-6 단독." zoomable=true %}

Fallback을 바꾸는 경우도 다시 검증해야 한다. 전체 표본의 사후 sweep에서 JEV→GPT-5.6는 매력적인 비용·정확도 조합을 보이지만, 사전에 선택한 threshold 0.7은 held-out JudgeBench에서 fallback보다 4.81 points 낮았다. RewardBench의 작은 이득이 pooled 결과에서 이 실패를 가릴 수 있다. 더 저렴한 강한 모델이 있다는 발견과 그 모델을 위한 threshold가 다른 업무에도 잘 맞는다는 주장은 별개다.

### 인간 재판정과 calibration 결론의 변화

Label noise를 점검하기 위해 990개 부분집합에서 둘 중 하나라도 benchmark label과 다른 163개 및 control 20개를 맹검 재판정했다. JudgeBench의 두 모델 불일치 69개 중 인간은 GPT-6 편을 57개, JEV 편을 한 개에서 들었다. 어려운 correctness의 격차를 단지 benchmark label의 결함으로 설명하기 어렵다는 근거다. 반면 HaluEval에서 두 judge가 함께 틀렸다고 표시된 26개 중 24개는 인간이 judge 쪽 판단을 지지했다.

이 240개 HaluEval 부분집합에서 확정적인 인간 label로 일부를 치환하면 Brier score는 JEV 0.176 대 GPT-6 0.245에서 0.062 대 0.032로 바뀐다. 예측과 확률을 바꾸지 않았는데 우열이 뒤집힌다. 이는 JEV가 더 잘 calibration되어 있다는 주장을 noisy label에서 곧바로 일반화하면 안 된다는 구체적인 사례다. 동시에 선택적으로 감사한 작은 집합의 label 치환을 새로운 전체 benchmark 정답으로 취급해서도 안 된다.

## 한계와 비판적 평가

### 비공개 모델과 동일 계산량 비교의 부재

JEV는 특정 proprietary service 버전이며 학습 데이터와 benchmark 중복 정도를 알 수 없다. 생성형 모델과 크기·reasoning effort·serving을 맞춘 비교도 아니므로, 비용 차이가 어떤 내부 설계에서 나오는지 이 연구만으로 분해할 수 없다. JEV와 비슷한 typed interface를 제공하는 공개 Laya checkpoint들은 이 과제에서 약한 성능을 보였지만, 그것이 모든 encoder 기반 judge의 가능성을 부정하지는 않는다. 논문이 보여 주는 것은 평가한 zero-shot checkpoint의 결과다.

재현성 역시 범위를 구분할 필요가 있다. Appendix P는 보존된 출력으로 주요 분석을 재생하는 offline package를 설명하며, API나 GPU 없이 실행할 수 있다고 명시한다. 이는 JEV의 가중치나 학습 과정을 재현하는 것과 다르다. 이 리뷰에서 확인한 PDF와 arXiv 페이지에는 해당 package의 직접 다운로드 주소가 없으므로, 동명의 다른 저장소를 이 논문의 코드로 연결하거나 설치 명령을 추정하지 않는다.

### 선택적 인간 감사와 근사적인 threshold 하한

인간 감사는 임의 추출한 전체 benchmark 감사가 아니라 모델의 불일치에 집중한다. 연구팀 구성원 한 명이 전체 항목을 평가했고, 예정됐던 두 번째 인간 pass 대신 LLM pass가 불일치 항목을 골라낸 뒤 저자가 adjudication했다. 최종 label은 인간 판단이지만, 독립적인 다수 평가자의 합의와 같지는 않다. 일부 항목에서는 양쪽 답이 모두 타당하거나 판단이 불가능해 indecisive로 남는다.

리뷰어 관점에서 lower-bound 식도 신뢰구간이라는 이름만으로 강한 보장을 부여하기 어렵다. 작은 표본에서 차이의 분산이 0이면 식의 하한도 관측 평균과 같아지고, 여러 threshold 중 하나를 선택한 이후의 불확실성은 별도 문제다. 논문이 제시한 simulation과 prospective test는 이 절차의 유용성을 뒷받침하지만, 위험 상한을 모든 분포에서 증명하지는 않는다. 특히 오류 비용이 균일하지 않은 업무에서는 평균 정확도 2 points 손실이라는 허용 기준부터 다시 정해야 한다.

### 절감률의 업무 구성과 latency 꼬리 의존성

새 업무의 실시간 검증은 이 연구의 강점이지만 두 correctness workload와 570개 held-out 쌍이라는 범위를 가진다. 기존 510쌍의 live replication에서 중앙값 0.27초 대 2.10초라는 큰 개선도 p95에서는 4.26초 대 4.49초로 줄어든다. 적게 이관되는 집단의 빠른 응답이 중앙값을 낮추더라도, 어려운 항목의 기다림까지 사라지는 것은 아니다.

가격도 수집 시점과 usage 규칙에 의존한다. 따라서 실제 채택 여부는 자신의 데이터에서 first stage의 판정 품질, 오류의 종류, 이관되는 입력의 길이, fallback의 추가 연산을 함께 측정해야 한다. 이 논문을 제품 도입의 보장으로 읽기보다, 그런 측정을 어떤 순서와 분모로 수행해야 하는지 보여 주는 운영 연구로 읽을 때 활용 가치가 더 크다.

## 시사점 / Takeaways

- Judge를 고를 때 평균 정확도와 함께 <strong>고확신 집단의 오류율, 채택 coverage, 오류 순위 신호</strong>를 보자. 세 값은 서로 다른 질문에 답한다.
- **Threshold는 모델 이름 하나에 붙는 상수가 아니다.** Workload, rubric, label type, 후보 순서 처리, fallback이 달라지면 별도의 selection과 검증이 필요하다.
- **절감률의 분모를 확인하자.** 단일 JEV의 277배 비용 차이, frozen cascade의 41.4% 비용, 신규 업무의 75.5% 비용은 서로 다른 측정이다.
- **강한 fallback도 공유 오류를 지우지는 못한다.** 문체에 속거나 근거가 없는 경우에는 confidence gating만 추가하기보다 판정 근거와 검증 방식을 개선해야 한다.
- <strong>쉬운 판정과 어려운 판정의 계산 예산을 나누는 설계</strong>가 유효할 수 있다. 다만 어려운 업무에서 절약 폭이 줄어드는 것은 품질을 지키기 위한 정상적인 결과일 수 있다.

## 참고 자료

- [JEV-as-a-Judge: Accept When Confident, Escalate When Unsure, arXiv v4](https://arxiv.org/abs/2609.26550v4): 본문·Appendix A–P, 특히 Table 1·4·5·31·36과 식 (1).
- [원문 PDF](https://arxiv.org/pdf/2609.26550v4): Yubo Li, Yidi Miao, Ramayya Krishnan, Rema Padman. 이 글의 Figure 2·4·5·9·16과 Table 1·4·5의 출처.
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): 원문 그림·표의 라이선스. 한국어 설명과 분석은 이 리뷰에서 작성.

## 더 읽어보기

- **[RewardBench: Evaluating Reward Models for Language Modeling](https://arxiv.org/abs/2403.13787)** (Lambert et al., 2024): 채팅·안전·추론의 선호 응답 비교를 통해 reward model의 강점과 약점을 평가한 benchmark.
- **[JudgeBench: A Benchmark for Evaluating LLM-based Judges](https://arxiv.org/abs/2410.12784)** (Tan et al., 2024): 지식·수학·추론·코드의 객관적 정오를 중심으로 judge를 평가하는 과제 구성.
- **[RM-Bench: Benchmarking Reward Models of Language Models with Subtlety and Style](https://arxiv.org/abs/2410.16184)** (Liu et al., 2024): 내용의 미세한 차이와 응답 문체의 효과를 분리하는 평가.
- **[Trust or Escalate: LLM Judges with Provable Guarantees for Human Agreement](https://arxiv.org/abs/2407.18370)** (Jung et al., 2024): 선택적 평가와 단계적 이관을 인간 판단과의 일치 보장으로 연결한 선행 연구.
- **[JEV vs. LLMs as Rubric Judges: Cheaper, Faster, and Wrong in the Same Places](https://arxiv.org/abs/2609.29769)** (Rao et al., 2026): 저렴한 judge들의 공유 오류가 cascade의 정확도 개선을 제한하는 조건에 관한 비교 연구.

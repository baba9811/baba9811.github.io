---
layout: post
title: "[논문 리뷰] Algorithmically Establishing Trust in Evaluators"
date: 2026-05-14 22:00:00 +0900
description: "라벨 없는 환경에서 LLM-as-a-judge 같은 평가자(evaluator)의 신뢰를 zero-knowledge 스타일의 챌린지-응답 프로토콜로 (1/4)^r 확률 한계까지 증명적으로 확립하는 No-Data Algorithm."
tags: [llm-as-a-judge, evaluation, zero-knowledge-proof, trust, low-resource-language]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/fig1-ev-protocol-flow.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0014-algorithmically-establishing-trust-in-evaluators/
en_url: /en/papers/0014-algorithmically-establishing-trust-in-evaluators/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Adrian de Wynter (The University of York · Microsoft) |
| 학회 | arXiv preprint · 2026 |
| arXiv | [2506.03083](https://arxiv.org/abs/2506.03083) |
| Code | [adewynter/no_data_algorithm](https://github.com/adewynter/no_data_algorithm) |
| 데이터 | 합성 바이너리 문자열 (IP/OOP, 각 498 항목) · West Frisian 저자원 언어 라벨링 코퍼스 (1,015 항목) |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-05-14 |

## TL;DR

- <strong>No-Data Algorithm</strong>: 정답 라벨이 <em>전혀 없는</em> 상황에서 평가자(evaluator, 예: LLM-as-a-judge)가 "정말 라벨을 안다"고 주장하는 게 사실인지 알고리즘적으로 검증한다.
- 핵심은 두 챌린지(equality up to permutation / up to isomorphism)를 무작위로 던지는 <strong>EV(Evaluator-Verifier) 프로토콜</strong>이다. Babai (1985)의 Arthur-Merlin 프로토콜에 기반한 zero-knowledge 스타일 챌린지-응답.
- <strong>수학적 보장</strong>: $r$ 라운드 후 거짓말 평가자를 놓칠 확률은 $\le (1/4)^r$. 정확도 $\alpha$인 평가자에 대해 $\mathbb{E}[\text{correct}] \le 1 - (1-\alpha)(1 - \phi + \phi(1/4)^r)$.
- <strong>실증 결과</strong>: 합성 바이너리 데이터셋(o3-mini 평가자)에서 <em>모르는</em> 데이터 분포(OOP)일 때 success rate가 28%로 떨어져 거짓을 폭로. West Frisian 라벨링(GPT-4.1 평가자+검증자)에서는 success rate가 IP 86–88% vs OOP 1–2%로 깔끔히 분리.

## 소개 (Introduction)

평가는 ML의 가장 근본적인 문제다. 그러나 LLM-as-a-judge가 사실상 표준이 된 지금, <em>평가자 자체</em>의 신뢰가 흔들리고 있다. 전통적으로는 (1) 정답 라벨이 있는 reference set과 비교하거나, (2) 평가자가 "어떻게든" 정답을 안다고 가정하는 두 가지 방식으로 신뢰를 확립해왔다. 두 방식 모두 라벨이 없을 때 무력하다 — 전자는 데이터를 요구하고 후자는 가정에 불과하기 때문이다.

라벨이 부족한 시나리오는 예외가 아니라 빈번하다. <strong>저자원 언어</strong> (West Frisian처럼 라벨된 데이터가 사실상 없는 언어), <strong>의료 도메인</strong> (라벨 비용이 막대), <strong>시장 조사</strong> (정답이 unique), <strong>벤치마크 오염</strong> (Sainz et al. 2023의 경고처럼, 라벨이 있어도 모델이 미리 본 데이터일 수 있음). 이런 곳에서 LLM judge를 그냥 쓰는 건 결과의 통계적 의미를 잃는다.

본 논문은 <em>수학적으로 엄밀하게</em> — `1 - (1/4)^r` 확률로 — 평가자의 라벨 지식을 검증하는 <strong>No-Data Algorithm</strong>을 제안한다. 핵심 아이디어는 두 가지다. 첫째, 평가자에게 <em>비슷한 다른 데이터점</em>을 만들어 보라고 시키고 그 일관성을 따진다 (zero-knowledge proof의 챌린지-응답 게임과 같은 구조). 둘째, 두 챌린지는 <em>정보 이론적으로 상호배타적</em>이라 둘 다 통과하려면 진짜 라벨 함수를 알아야 한다. 따라서 정답을 모르는 평가자는 매 라운드 최대 1/2 확률로 한 챌린지만 우연히 통과할 수 있고, <em>둘 다</em>를 빠져나갈 확률은 1/4 이하다.

이 논문은 <em>수학적으로</em> 새로운 발상은 아니다 — Arthur-Merlin 프로토콜과 zero-knowledge proof는 80년대부터 있었다. 그러나 그 아이디어를 <em>평가자 신뢰</em>라는 ML 평가 문제에 옮겨와 실제로 작동함을 보인 것은 처음이다. 정확도 지표가 만연한 환경에서 <em>그 정확도 자체를 어떻게 믿을 것인가</em>라는 메타 질문에 답한다는 점에서, 라벨 없는 평가가 일상이 된 LLM 시대에 읽을 가치가 크다.

## 핵심 기여 (Key Contributions)

- <strong>No-Data Algorithm 제안</strong>: 라벨이 전혀 없는 상황에서 평가자의 신뢰를 $(1/4)^r$ 확률 한계까지 끌어올리는 알고리즘. AM 프로토콜의 챌린지-응답 메커니즘을 분류 평가에 맞게 변형했다.
- <strong>두 정리로 정밀한 정합성 보장</strong>: Lemma 5.1 (EV 프로토콜의 거짓 감지 확률 한계 $(1/4)^r$), Theorem 5.2 (평가자 정확도 $\alpha$와 라벨 뒤집기 확률 $\phi$를 결합한 No-Data Algorithm 전체의 정확도 상한).
- <strong>합성 + 실제 자연어 실험</strong>: 바이너리 문자열에서 in-phenomenon(IP)/out-of-phenomenon(OOP) 두 setup으로 이론을 검증하고, West Frisian 저자원 언어 라벨링으로 현실적 응용까지 보였다.
- <strong>베이스라인과의 비교 (Cohen's κ, PA, ensemble)</strong>: 라벨 없이는 보정이 불가능한 일치도 지표들이 OOP에서 모순된 신호를 내는 반면, No-Data Algorithm의 success rate는 IP 86.2 vs OOP 1.2로 깔끔히 분리됨을 보인다.

## 관련 연구 / 배경 지식

<strong>Arthur-Merlin 프로토콜 (Babai 1985).</strong> 무한한 계산력을 가진 prover Merlin이 random coin을 가진 verifier Arthur에게 어떤 statement가 참임을 <em>통계적</em>으로 설득하는 프로토콜이다. zero-knowledge proof의 친척으로, Goldreich (2009)와 Arora & Barak (2009)이 정리한 표준 교과서 주제다. 본 논문의 EV 프로토콜은 AM의 챌린지-응답 구조를 차용했지만 <em>secrecy</em> 보장 (Merlin의 비밀이 새지 않음) 대신 <em>평가자가 진짜 안다는 것</em>만 검증하도록 단순화되었다.

<strong>LLM-as-a-judge의 부상.</strong> Zheng et al.의 MT-Bench/Chatbot Arena (Zheng et al., NeurIPS 2023), Liu et al.의 G-Eval (Liu et al., EMNLP 2023) 같은 작업이 GPT-4류 강력 모델을 자동 평가자로 쓰는 패러다임을 정착시켰다. Li et al. 2024의 종합 survey도 이 분야의 빠른 성장을 정리한다. 그러나 여러 후속 연구가 이 평가자들의 신뢰성을 의심해왔다 — Gehrmann et al. 2023은 평가 실천의 균열을, Bavaresco et al. 2024는 20개 NLP 평가 과제에서 LLM judge가 인간을 대체할 수 없다는 결과를, Hada et al. 2024는 다국어 환경에서 평가 품질이 급락한다는 점을 보였다.

<strong>일치도(agreement) 메트릭의 한계.</strong> 라벨이 없을 때 베이스라인은 <em>여러 평가자의 합의를 보는 것</em>이다 — Cohen's κ, Fleiss & Cohen 1973의 ICC, percentage agreement (PA) 같은 지표들. 그러나 이들은 <em>보정(calibration)</em>을 요구한다. κ=0.4가 좋은지 나쁜지는 도메인마다 다르고, 보정에는 reference data가 필요하다. 본 논문이 강조하듯 라벨이 없는 상황에서 이 메트릭들은 "모순적이거나 불완전한 정보"만 준다 (Table 9의 핵심 관찰).

<strong>이전 trustworthy ML 연구.</strong> Jovanović et al. 2023은 representation learning에서 <em>공정한</em> 표현을 입증가능하게 학습하는 작업을, Dimitrov et al. 2022는 <em>입증가능하게 robust한</em> 적대적 예시를 다뤘다. 본 논문은 같은 <em>입증가능성(provability)</em> 전통을 평가자 신뢰로 확장한다.

## 방법 / 아키텍처 상세

### 표기와 가정

데이터점 $x \in X$, 라벨 $y \in Y$. 본 논문은 $Y = \{0, 1\}$ (이진 분류)에 집중한다. 또한 $X \subseteq \{0, 1\}^n$ — 모든 데이터점이 $n$비트 바이너리 문자열이라고 가정. 이 가정은 증명 단순화를 위한 것이고 실제로는 자연어 문자열 같은 다른 데이터에 적용 가능하다고 §7에서 논한다.

각 $x \in \{0,1\}^n$에 대해 그 <em>relevant subset</em> $S\_x \in 2^x$를 정의한다 (예: 부분 문자열의 집합). 구체적 구성은 setup에 따라 §4.1에서 다룬다.

<strong>기준(criterion)</strong> $c\colon X \to \{0,1\}$은 데이터점을 분류한다. <strong>루브릭(rubric)</strong> $C\colon \times\_{i,\ldots,n} \{0,1\} \to \{0,1\}^n$은 <em>기준의 순서 집합</em> $\mathcal{C} = \{c\_1, \ldots, c\_n\}$의 출력을 비트 문자열로 이은 것: $C = c\_1 c\_2 \ldots c\_n$. 어떤 기준이 <em>arity > 1</em>인 비선형 기준 (예: $c\_i = c\_a \oplus c\_b$, XOR)으로 분해되면 그 비선형 기준이 분해된 형태를 $\bar{C}$로 쓴다. 모든 기준이 명시적으로 분해되어 있으면 그 루브릭을 <strong>total</strong>이라 한다.

<strong>Aggregator</strong> $\sigma\colon \{0,1\}^n \to Y$는 $n$비트 출력을 최종 라벨로 mapping한다 (e.g., 다수결).

두 점 $x, x' \in X$가 <strong>similar</strong>하다는 것은 $x \cong x'$ <em>그리고</em> $x \equiv x'$ 둘 다 — 즉 isomorphism (구조적 동치)과 permutation (순열) 양쪽에서 동치라는 뜻이다.

<strong>Lying</strong> 평가자는 "라벨을 안다"는 <em>근거 없는 주장</em>을 펴는 모든 평가자다. 두 종류 모두 포함: 정보 없이 추측하는 uninformed lying과 자신 있게 틀리는 sycophantic lying. 전자는 in-distribution에서도 실패하는 반면 후자는 in-distribution에선 잘 맞춘다. 둘을 라벨 없이 구별하는 게 본 논문의 핵심 도전이다.

<strong>Assumption 3.1</strong> (Composition assumption): 진짜 매핑 $f\colon X \to Y$는 루브릭과 aggregator의 합성이다:

$$
f = \sigma C \quad (1)
$$

이는 약한 가정이다 — 데이터점이 라벨을 받는 <em>이유</em> (criterion)가 있고, 이유가 여럿이면 모으는 방식 (aggregator)이 있다는 것뿐. 실제 시나리오에서 $C$나 $\sigma$가 알려지지 않으면 사용자 정의 surrogate를 쓰면 되지만 그 경우 <em>신뢰 한계는 surrogate에 대한</em> 것이라는 점에 유의해야 한다.

### EV 프로토콜 — 한 라운드의 작동

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/fig1-ev-protocol-flow.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: EV 프로토콜 한 라운드. 평가자(파랑)는 x와 similar한 x′와 부분 라벨 ỹ′을 만들고, verifier(주황)가 두 챌린지 중 균등 무작위로 하나를 선택해 답을 요구한다. r번 반복."
   zoomable=true %}

EV 프로토콜은 데이터점 $x \in X$와 루브릭 $C$를 양쪽이 공유한 상태에서 시작한다. Aggregator $\sigma$는 verifier에게 주어지지 않는다. 평가자는 $f\colon X \to Y$를 <em>안다</em>고 주장한다. $C$가 공개되므로 그 주장은 실질적으로 <em>aggregator $\sigma$를 안다</em>는 주장과 같다. Verifier는 이 주장을 <em>충분히 검증</em>해 라벨링을 신뢰해도 되는지 결정하려 한다.

<strong>한 라운드 절차:</strong>

1. 평가자가 $x$와 similar한 $x' \in X$를 생성하고, 그에 대응하는 <em>부분 라벨</em> $\tilde{y}'$도 생성. 부분이라 부르는 이유: 평가자는 $f$에 접근 권한이 없으므로 $C(x')$에 기반한 <em>추측</em>에 불과하기 때문. 일단 생성하면 이 라운드에서 변경 불가.
2. Verifier가 두 챌린지 중 하나를 균등 무작위로 선택:
   - <strong>Challenge 1 (Equality up to Permutation)</strong> — "$x' \equiv x$인 이유를 보여라". Verifier는
     $$ \forall s \in S_x, \exists t \in S_{x'}.\ \forall c \in \bar{C},\ c(s) = c(t) \quad (2) $$
     를 체크. 즉 $x'$의 substring 중 $x$의 어떤 substring과 <em>모든 기준의 (total) 평가가 일치</em>하는 것이 적어도 하나 있어야 함.
   - <strong>Challenge 2 (Equality up to Isomorphism)</strong> — "$f(x') = y$인 이유를 보여라". $y$는 verifier가 모르므로 대신 $x' \cong x$를 체크: verifier가 $C(x') = C(x)$임을 검증.
3. 평가자가 챌린지에 실패하면 프로토콜은 즉시 failure 반환. 통과하면 다음 라운드. $r$라운드 모두 통과하면 success 반환. 어느 경우든 $\tilde{y}'$도 반환.

### 두 챌린지가 왜 함께 필요한가

Lemma A.1의 핵심: 두 챌린지는 <em>상호 배타적인 정보</em>를 제공하며, <em>함께</em>만이 평가자의 거짓을 잡아낸다 (necessary and sufficient).

- <strong>Challenge 1만</strong>으로는 부족: $C(x') = C(x)$가 성립해도 $x'$의 <em>내부 구조</em>는 다를 수 있다 (e.g., disjunctive clause로 같은 평가가 나오는 다른 문자열). 즉 <em>permutation 동치</em>는 통과 가능하지만 <em>isomorphism 동치</em>는 보장 안 됨.
- <strong>Challenge 2만</strong>으로는 부족: $C(x') = C(x)$는 <em>최종 인코딩</em>이 같음을 보일 뿐, 내부 비트 구조의 동치성을 보장하지 않음.

따라서 평가자가 진짜 $f$를 알면 두 챌린지 모두 매번 통과 가능. 모른다면 — 둘 다 통과하려면 <em>둘 다</em>에 대응되는 $x'$를 만들어야 하는데, 정보 없이 그건 본질적으로 $f$를 아는 것과 같다.

거짓 평가자가 우연히 통과할 수 있는 경우는 둘:

- <strong>Lie 1: "좋은" $x'$ 생성</strong>: $S\_{x'} = S\_x$인 $x'$를 만들어 Challenge 1을 통과 가능하지만 Challenge 2 ($C(x') = C(x)$)에서 1/2 확률로 실패.
- <strong>Lie 2: $f(x') \ne y$</strong>: $C(x') = C(x)$가 되도록 만들어 Challenge 2 통과 가능하지만 Challenge 1에서 1/2 확률로 실패.

챌린지가 1/2 확률로 선택되므로 한 라운드 통과 확률은 <em>최대</em> $1/2 \times 1/2 = 1/4$. $r$라운드 후엔 $(1/4)^r$.

### No-Data Algorithm — 전체 구조

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/alg1-no-data-algorithm.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 1: No-Data Algorithm. 데이터셋 X의 매 점에 대해 EV 프로토콜을 r 라운드 실행하고, 실패한 라운드에 대해서는 확률 φ로 라벨을 뒤집어 success 카운트와 예측을 반환한다."
   zoomable=true %}

알고리즘은 데이터셋 $X$의 각 점에 대해 EV 프로토콜을 $r$라운드 호출한다. EV가 성공하면 평가자의 라벨 $y$를 그대로 받아들이고 success를 +1. 실패하면 — 평가자가 잘못된 라벨을 줬을 가능성이 있으므로 — 확률 $\phi$로 라벨을 뒤집어 ($\tilde{y} = \neg y$) predictions에 추가하고 success는 0. 최종적으로 (1) 라벨 예측 리스트, (2) success 카운트를 반환한다.

라벨 뒤집기 단계가 중요한 이유: EV가 실패했다는 건 평가자가 라벨을 모른다는 신호다. 만약 평가자가 <em>일관되게</em> 틀린 라벨을 주는 sycophantic liar라면 뒤집은 라벨이 옳을 확률이 높다. $\phi$는 평가자의 예상 오류율에 가깝게 튜닝한다 — Theorem 5.2가 보여주듯 $\phi$가 정확하면 알고리즘의 출력이 <em>알려진 케이스의 정확도</em>에 가까워진다.

## 학습 목표 / 손실 함수

이 논문에는 <em>학습되는 모델</em>이 없다 — No-Data Algorithm은 외부 평가자를 <em>검증</em>하는 메타 알고리즘이다. 그래서 손실 함수가 아니라 <strong>정합성 한계(correctness bound)</strong> 두 개로 핵심을 정의한다.

### Lemma 5.1 — EV 프로토콜 정합성 한계

verifier가 $r$ 라운드 후 평가자의 거짓을 감지하지 못할 확률은

$$
\Pr[\text{verifier misses lie}] \le \left(\frac{1}{4}\right)^r
$$

증명 스케치: 위에서 본 두 거짓 시나리오 (Lie 1, Lie 2) 각각에 대해 평가자가 한 라운드 통과 확률은 1/4. Union bound로 $r$라운드 후 $(1/4)^r$.

### Theorem 5.2 — No-Data Algorithm 전체 정합성 한계

평가자의 정확도가 $\alpha$인 균형 데이터셋 $X$에서, 평가자가 mislabel할 때마다 거짓말한다고 가정하면:

$$
\begin{aligned}
\mathbb{E}[\text{correct}] \le 1 - (1 - \alpha)\left(1 - \phi + \phi\left(\frac{1}{4}\right)^r\right)
\end{aligned}
\quad (3)
$$

증명 스케치 (Appendix A.4): 잘못된 라벨이 <em>감지되지 않을 확률</em>과 <em>감지됐지만 뒤집히지 않을 확률</em>에 union bound를 적용. 오류 $\epsilon = 1 - \alpha$에 대해

$$
\begin{aligned}
\mathbb{E}[\text{undetected}] &= \epsilon \left(\frac{1}{4}\right)^r, \\
\mathbb{E}[\text{detected, no flip}] &= \epsilon(1 - \phi)\left(1 - \left(\frac{1}{4}\right)^r\right), \\
\mathbb{E}[\text{wrong}] &\le \epsilon\left(1 - \phi + \phi\left(\frac{1}{4}\right)^r\right).
\end{aligned}
$$

이 식이 알려주는 것: (1) 평가자의 진짜 정확도 $\alpha$가 높고 $\phi$가 잘 보정되면 No-Data Algorithm의 출력이 <em>알려진 케이스의 정확도</em>에 가까워진다. (2) 반대로 $\alpha = 0$ (즉 항상 틀리는 평가자)이면 출력에서 라벨을 <em>복원할 방법이 없다</em> — 정보를 무에서 만들 수 없기 때문. 따라서 알고리즘의 주 목적은 <em>라벨링이 아니라 신뢰 확립</em>임을 §7.1에서 강조한다.

### Lemma B.1 — 실행 시간

평가자와 verifier가 임의 입력에 대해 다항 시간이면, $\|D\|$ 크기 데이터셋과 $r$ EV 라운드에 대해 No-Data Algorithm은 $O(r\|D\|)$ 시간에 실행된다. 단순한 linear sweep이라 stress가 작다.

## 학습 데이터와 파이프라인

논문은 두 실험 setup을 쓴다. 두 경우 모두 <em>훈련</em>은 평가자 자체에만 일어나고, No-Data Algorithm은 그 위에서 검증만 한다.

### Experiment 1 — 합성 바이너리 문자열

| 항목 | 내용 |
|------|------|
| 입력 도메인 | $\{0,1\}^n$ 바이너리 문자열 |
| 데이터셋 | In-Phenomenon (IP) / Out-of-Phenomenon (OOP) 두 disjoint 데이터셋 |
| 테스트 크기 | 각 498 항목, balanced |
| Aggregator $\sigma$ | 다수결 (majority vote) |
| 평가자 1 | Decision Tree (sklearn 기본 파라미터) |
| 평가자 2 | o3-mini (OpenAI, version 2025-01-31), max tokens 50,000 |
| Verifier | 규칙 기반 매칭 (test set과 적절한 rubric 매칭) |
| $\phi$ | DT는 0.4, LLM은 0.1 |
| $r$ | 3 |

IP rubric 세 criterion: $c\_0$ (1의 개수가 짝수), $c\_1 = c\_{1,a} \oplus c\_{1,b}$ (0으로 시작 XOR 10101 포함), $c\_2$ (1이 5개 초과). OOP rubric: $c\_0$ (111 포함), $c\_1$ (1로 끝남), $c\_2$ (110001 포함). 핵심 디자인: DT와 LLM 둘 다 IP에서 <em>훈련/관찰</em>했고, OOP는 본 적이 없다. 즉 OOP에서 success rate가 떨어져야 알고리즘이 작동하는 것.

### Experiment 2 — West Frisian 저자원 언어

| 항목 | 내용 |
|------|------|
| 데이터 출처 | OpenOrca, MMLU, OpenCode, WildChat에서 무작위 prompt 추출 |
| 응답 생성 | GPT-4o |
| 번역 | 4명의 native West Frisian 화자가 prompt+response를 전문 번역 + 어노테이션 |
| 어노테이터 보상 | 28.7 USD/hr부터 시작 (시니어리티 기반) |
| 데이터셋 크기 | 1,015 항목 (train 500 / test 515) |
| 평가자 + verifier | 둘 다 GPT-4.1 (version LONGCO-2025-04-14), 다른 prompt |
| Evaluator/verifier max tokens | 256 |
| Generator (similar datapoint 생성) max tokens | 5,000 |
| Temperature | 0 (모두) |
| $\phi$ | 0.1, 0.3, 0.7 세 값 모두 비교 |

IP rubric은 6개 criterion: (1) West Frisian으로 응답, (2) 문화·논리적으로 정확, (3) 코드면 문법 오류 없음, (4) 문법적으로 정확, (5) 잘림 없음, (6) 사용자 지시 정확히 따름. OOP rubric은 7개 criterion으로 거의 직교하게 설계 — 응답이 <em>Dutch</em>로 되어 있는지 등 (GPT-4o가 West Frisian이 아닌 Dutch로 응답하는 경향이 강함). IP rubric은 decomposable하지 않고 OOP rubric만 decomposable — Conclusion에서 다루는 ambiguity의 실제 사례.

## 실험 결과

### 합성 데이터: IP/OOP의 success rate 갭이 핵심 신호

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab1-rubrics.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: 합성 실험의 두 루브릭. IP의 c₁은 XOR 분해로 인해 실제 기준은 5개({c₀, c₂, c₁ₐ, c₁ᵦ, c₁})."
   zoomable=true %}

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab2-synthetic-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: known(라벨 알려진 참조)과 unknown(No-Data Algorithm 출력) 결과. DT/LLM 모두 IP에선 known과 가깝지만, OOP에선 정확도는 따라가도 success rate가 크게 떨어진다."
   zoomable=true %}

| Setup | 평가자 | known Acc/F1 | unknown Acc/F1 | unknown Succ/Flips |
|-------|--------|--------------|----------------|---------------------|
| IP | DT | 62.2 / 58.8 | 62.2 / 59.8 | <strong>100.0 / 0.0</strong> |
| IP | LLM (o3-mini) | 99.8 / 99.8 | 97.6 / 97.6 | <strong>81.3 / 1.8</strong> |
| OOP | DT | 54.2 / 54.2 | 52.8 / 52.1 | <strong>4.8 / 46.4</strong> |
| OOP | LLM (o3-mini) | 60.6 / 66.2 | 59.0 / 64.0 | <strong>28.0 / 6.0</strong> |

읽는 법: 정확도는 known/unknown 모두 거의 같다. 즉 <em>정확도만으론 평가자의 신뢰성을 알 수 없다</em>. 결정적 차이는 <strong>success rate</strong>다.

- IP의 success rate 격차 (100% DT vs 81% LLM): 둘 다 IP를 <em>진짜로</em> 안다.
- OOP의 success rate 격차 (5% DT vs 28% LLM): 둘 다 OOP를 <em>모른다</em>. LLM이 약간 더 높은 건 추측을 더 잘 해서지 진짜 아는 게 아님.
- 즉 success rate가 28% 아래로 떨어지면 deception 의심.

### West Frisian: φ와 무관한 안정적 success rate

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab3-westfrisian-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: GPT-4.1 평가자+verifier의 West Frisian 결과. φ를 0.1에서 0.7까지 바꿔도 success rate는 IP 86–88%, OOP 1–2%로 거의 변하지 않는다."
   zoomable=true %}

| Setup | $\phi$ | IP Succ/Flips | OOP Succ/Flips |
|-------|--------|---------------|----------------|
| Unknown | 0.7 | 87.8 / 9.3 | 1.4 / 70.3 |
| Unknown | 0.3 | 86.8 / 4.9 | 1.2 / 33.6 |
| Unknown | 0.1 | 86.2 / 1.8 | 1.2 / 9.1 |
| Known (predict $y$) | – | 76.3 / 80.3 (Acc/F1) | 51.5 / 67.2 |
| Known (avg per $c \in \bar{C}$) | – | 89.5 / 94.0 | 45.3 / 46.5 |

읽는 법: <strong>success rate가 $\phi$와 사실상 독립</strong>이다. flip은 $\phi$에 따라 크게 변하지만 (OOP에서 9 → 70까지) success rate는 거의 고정. 이게 본 알고리즘의 가장 실용적 함의 — 운영 시점에 success rate를 <em>원시(raw) 신호</em>로 쓰고, $\phi$는 사후에 라벨 정확도를 끌어올리는 데만 튜닝하면 된다. 또 OOP에서 정확도가 <em>near-random</em> (50% 부근)인데 success rate는 1–2%로 일관되게 낮음: 정확도가 우연이라도 거짓은 폭로된다.

### LLM 다종 비교 (Appendix D)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab5-llm-comparison.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5: 네 LLM(o3-mini, DeepSeek R1-Distill-Qwen-32B, GPT-4o, Qwen 2.5-VL 7B)의 합성 데이터 결과. IP known에서 o3-mini만 99.8%로 진짜 학습한 것이고, 나머지는 50–61% 수준. 그러나 모두 unknown에선 알려진 케이스에 정확도를 맞춰감 — 즉 정확도만으론 진짜 아는 모델과 알맞게 추측하는 모델을 구별할 수 없다는 점을 강조한다."
   zoomable=true %}

이 표가 짚는 핵심: 정확도는 같아 보여도 success rate가 모델별로 갈린다. 진짜 IP를 아는 o3-mini는 success가 53.8 (φ=0) → 55.4 (φ=0.5) → 55.4 (φ=0.9)로 일관. DeepSeek/GPT-4o/Qwen은 OOP에서 정확도가 <em>높아 보이는데</em> (78% 등) success rate가 6–34%로 낮아 deception을 폭로한다.

### 베이스라인 비교: ensemble은 라벨 없으면 무력하다

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab9-baselines.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 9: GPT-4.1, o3-mini, Qwen 2.5 세 평가자의 ensemble(평균/다수결) vs No-Data Algorithm. ensemble은 OOP에서 우연 이상의 정확도(50–61%)를 보이는데 라벨이 없으니 이게 deception인지 판단 불가. Cohen's κ는 IP에서 0.39(poor)지만 ensemble 성능은 known에 근접 — 일치도가 곧 신뢰가 아님."
   zoomable=true %}

| | IP trust | OOP trust | IP Acc/F1 | OOP Acc/F1 |
|---|---|---|---|---|
| Known (GPT-4.1) | – | – | 76.3 / 80.3 | 51.5 / 67.2 |
| No-Data Algorithm ($\phi=0.1$) | <strong>86.2</strong> | <strong>1.2</strong> | 76.9 / 79.8 | 50.7 / 16.4 |
| Ensemble (Average), κ / PA | 0.39 / 0.72 | 0.0 / 0.37 | 80.6 / 81.3 | 50.1 / 0.0 |
| Ensemble (Majority vote), κ / PA | 0.39 / 0.72 | 0.0 / 0.37 | 75.5 / 79.9 | 61.6 / 48.7 |

읽는 법: ensemble은 IP에서 정확도가 단일 모델을 따라잡지만 (75–81%), κ=0.39는 Fleiss & Cohen 1973 기준에선 <em>poor agreement</em>다. <em>라벨이 있다면</em> 우리는 이 모순을 해소할 수 있다 (정확도가 좋으니까 κ는 보정하면 된다고). 그러나 라벨이 <em>없으면</em> κ가 낮다는 신호를 신뢰해야 할지 무시해야 할지 결정 불가. OOP에서는 더 심각: majority vote가 61.6% 정확도를 보이지만 — 이건 <em>근본적으로 불가능한</em> 결과다 (OOP 분포에 대해 어떤 정보도 없어야 하므로). 그러나 κ=0.0이라는 <em>모순적</em> 신호로는 판단할 수 없다. 반면 No-Data Algorithm의 trust score (86.2 vs 1.2)는 <em>라벨 없이 단독으로</em> 결정 가능한 신호다.

## 결과 분석 / Ablation

### Ablation 1: 거짓 평가자와 거짓 generator (Appendix D.2)

DT 평가자 + $\phi=0.4$로 세 가지 거짓 시나리오:

- <strong>Lie 1</strong> ($\sigma$ 모름): $C(x)$는 출력하지만 $\bar{C}(x)$는 모름. IP success 17.0 (Flips 35.1). 정확도는 58.6/58.8로 그대로.
- <strong>Lie 2</strong> ($f$ 모름): $y' = y$인 $x'$만 retrieve 가능. IP success 0.6 (Flips 37.4). 거의 모든 라운드에서 잡힘.
- <strong>Lie 3</strong> (확률 $p=1/10$로 거짓): generator 단계에서 1/10 확률로 잘못된 라벨 출력. IP success 43.6 (Flips 24.9). 노이즈 있는 거짓이라 detection 어려움.

핵심 관찰: $\sigma$를 모르는 거짓 (Lie 1)은 IP에서 success 17%로 <em>상대적으로 높음</em> — 평가자가 $f$의 절반을 알기 때문. $f$를 모르는 거짓 (Lie 2)은 IP에서 0.6%로 <em>완전히 폭로</em>. 후자가 더 심각한 거짓이라는 게 합리적.

### Ablation 2: LLM 생성 전략 (Appendix D.3)

평가자가 <em>데이터에서 picking</em> vs <em>rubric으로부터 generation</em> 중 어떤 방식으로 $x'$를 만드는지 비교. o3-mini: picking IP success 81.3 vs generation 55.4 (격차 -26pp). GPT-4o: 28.7 vs 5.8 (격차 -23pp). 즉 LLM이 <em>자연어가 아닌</em> 바이너리 문자열을 새로 생성하는 건 어렵다는 게 드러난다. 그러나 §6.2의 자연어 실험에서는 generation도 잘 작동 — LLM은 자연어에 최적화돼 있기 때문.

### Ablation 3: Linguistic competency (Appendix D.4)

Qwen 2.5-VL 7B는 West Frisian에 능통하지 않은 평가자. IP에서 정확도는 ~35% 부근 (GPT-4.1의 76% 대비 크게 낮음), 그러나 <em>success rate는 여전히 거짓 평가자와 다른 패턴</em>을 보임. 이는 <em>uninformed liar</em>와 <em>sycophantic liar</em>가 다르게 폭로된다는 §3.2의 주장을 뒷받침한다 — Qwen은 단순히 무지(uninformed)할 뿐 거짓말하지 않으니 success rate가 적당히 떨어지지만 0이 되진 않음.

### Ablation 4: Ternary 라벨 (Appendix C.1)

$Y = \{0, 1, 2\}$로 확장: (a) 모든 $c\_i$가 0, (b) 한 개만 1, (c) 모두 0이 아닌 경우 셋으로 분류. 이론적으로 one-vs-all로 $k-1$번 돌리면 보장이 유지되지만, 단순히 algorithm을 그대로 돌리면 약 6% 정확도 차이 발생. label flip을 disable하면 known에 약간 더 가까워짐. 본격적 multi-class 보장은 future work로 남겨둠 (Conjecture 1).

## 한계와 비판적 평가

### 저자가 인정한 한계

- <strong>이진 라벨 가정</strong>: $Y = \{0, 1\}$에 집중. $k \ge 3$인 다중 라벨은 one-vs-all 분해로 가능하지만 정확한 보장은 추가 발전 필요.
- <strong>루브릭 의존성</strong>: 알고리즘은 <em>주어진</em> 루브릭 $C$에 대해서만 신뢰를 측정한다. 루브릭이 잘못 설계되면 신뢰 점수는 <em>그 잘못된 루브릭에 대한</em> 신뢰일 뿐. §7.3에서 강조하듯 루브릭 설계 책임은 사용자에게 있다.
- <strong>거짓-기반 정확도 가정</strong>: Theorem 5.2의 도출은 "평가자가 mislabel할 때마다 거짓말"한다고 가정. 정답을 단순히 <em>추측해서</em> 맞추는 평가자 (라벨은 맞지만 챌린지는 통과 못함)는 다른 분석이 필요.
- <strong>$\sigma$가 알려지지 않은 시나리오</strong>: 실제 도메인에서는 진짜 aggregator가 알려지지 않을 수 있어 사용자 정의 surrogate가 필요한데, 그 경우 신뢰 보장은 surrogate에 대한 것뿐.

### 리뷰어가 추가로 보는 한계

- <strong>Verifier 비용</strong>: 자연어 실험에서 evaluator+verifier 둘 다 GPT-4.1을 호출하고, generator로 또 호출한다. 1 라운드당 최소 3번의 GPT-4.1 호출 (max tokens는 다르지만). 1,015개 항목 × 3 라운드 × 3 호출 = ~9천 호출. 비용·latency 보고가 본문에 없다.
- <strong>Generator 품질이 결과를 흔든다</strong>: §6.1.2의 LLM picking vs generation 격차 (~25pp)는 generator 능력이 평가자 능력만큼이나 중요할 수 있음을 시사. 그러나 본문에는 "picking 방식이 더 효과적"이라는 단순 결론만 있고, generator 품질 측정 자체에 대한 논의는 부재.
- <strong>이론과 실증의 갭</strong>: Theorem 5.2의 $(1/4)^r$ bound는 <em>완벽한 verifier</em> 가정. 실제로 verifier가 GPT-4.1이라면 verifier 자체의 reliability가 보장을 깨뜨릴 수 있다. §7.2에서 "evaluator와 verifier가 다른 task를 푼다"고 변호하지만, 두 GPT-4.1 인스턴스가 서로의 prompt에 sensitive한 정도가 정량화되지 않음.
- <strong>Rubric ambiguity가 결과의 일반성을 흔든다</strong>: §6.2의 IP rubric은 <em>내부 모순</em>을 포함 ("응답은 정확해야 한다" + "사용자 지시를 정확히 따라야 한다 — 답이 틀려도"). 이런 ambiguity에도 알고리즘이 작동한 게 강점인 동시에, "rubric design이 잘 되면" 가정과 충돌한다.
- <strong>수치 신뢰성의 외부 검증 부재</strong>: Table 5에서 "DeepSeek IP known 61.0%"는 의외로 낮은데 (DeepSeek은 일반적으로 강력함), 본 setup 특유의 binary string task에 대한 결과인지, 일반적 reasoning 약점인지 분리 안 됨. 다른 task에서 같은 결과를 재현하는 실험이 없다.

## 시사점 / Takeaways

- <strong>"정확도가 같다"는 "신뢰가 같다"가 아니다</strong>: Table 2의 DT/LLM IP 사례, Table 9의 ensemble OOP 사례에서 정확도는 비슷하거나 ensemble이 더 높은데 <em>알고리즘적 신뢰 신호</em>는 완전히 갈린다. 라벨이 없을 때 정확도는 <em>uninterpretable</em> 양이다.
- <strong>Success rate가 $\phi$와 무관하다는 점은 운영상 큰 자산</strong>: West Frisian 실험에서 success rate가 86 ± 1%로 $\phi \in \{0.1, 0.3, 0.7\}$ 전체에서 안정. 따라서 운영 시 trust 측정을 하면서 $\phi$는 <em>post-hoc accuracy 향상</em>을 위해 따로 튜닝하면 된다.
- <strong>저자원 언어, 의료, 시장조사 같은 라벨 희소 도메인에서 정말 쓸 수 있는 도구</strong>: 라벨이 없는 환경에서 LLM judge의 "이 모델 이 데이터를 안다"를 <em>알고리즘적으로</em> 검증할 수 있는 첫 번째 도구. West Frisian 실험은 이게 toy가 아니라는 증거.
- <strong>루브릭이 곧 측정</strong>: 알고리즘은 <em>주어진 루브릭</em>에 대한 신뢰만 측정한다. 따라서 루브릭 디자인이 곧 평가의 본질이 된다 — 본 논문이 §7.3에서 강조하듯 이는 과학적 방법론 ($H\_0$ 설계)과 동형. 알고리즘이 좋아도 루브릭이 ill-posed하면 결과는 의미 없다.

## 설치 및 사용법

저자의 [GitHub repo](https://github.com/adewynter/no_data_algorithm)에 모든 데이터와 코드가 공개되어 있다. README와 코드 구조를 직접 보는 게 가장 빠르지만, 본문 §6의 setup을 그대로 재현하려면 OpenAI API 키와 (West Frisian 실험을 돌리려면) GPT-4.1 액세스가 필요하다. 합성 실험은 외부 API 없이도 DT 평가자만으로 돌릴 수 있어 알고리즘 동작을 보기에 적합하다.

```bash
git clone https://github.com/adewynter/no_data_algorithm
cd no_data_algorithm
# 자세한 실행은 repo README 참조
```

## 참고 자료

- 논문: <https://arxiv.org/abs/2506.03083>
- Code & 데이터: <https://github.com/adewynter/no_data_algorithm>

## 더 읽어보기

- **[Trading Group Theory for Randomness](https://dl.acm.org/doi/10.1145/22145.22192)** (Babai, STOC 1985) — Arthur-Merlin 프로토콜의 원조 논문. 본 논문의 EV 프로토콜이 변형한 zero-knowledge style 챌린지-응답의 출발점.
- **[Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)** (Zheng et al., NeurIPS 2023) — LLM-as-a-judge 패러다임을 학계 표준에 가깝게 자리잡힌 작업. position/verbosity bias 같은 본 논문이 풀고자 하는 신뢰 문제의 출발점.
- **[G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://arxiv.org/abs/2303.16634)** (Liu et al., EMNLP 2023) — GPT-4를 NLG 평가자로 쓰는 대표적 작업. 본 논문이 다루는 "평가자 신뢰" 문제의 근본 동기.
- **[LLMs-as-Judges: A Comprehensive Survey on LLM-based Evaluation Methods](https://arxiv.org/abs/2412.05579)** (Li et al., 2024) — LLM-as-judge 분야의 종합 survey. 본 논문이 위치하는 더 큰 맥락 파악에 유용.
- **[NLP Evaluation in trouble: On the Need to Measure LLM Data Contamination for each Benchmark](https://arxiv.org/abs/2310.18018)** (Sainz et al., EMNLP 2023) — 라벨이 <em>있어도</em> 모델이 미리 본 데이터일 수 있다는 우려를 제기한 position paper. 본 논문이 <em>라벨이 없는</em> 영역으로 한 발 더 나아간 동기.
- **[Awes, Laws, and Flaws From Today's LLM Research](https://arxiv.org/abs/2408.15409)** (de Wynter, ACL 2025) — 같은 저자의 LLM 연구 메타 분석. 2,000여 편 LLM 논문을 비판적으로 검토하며 LLM-as-evaluator의 부상을 정량화. 본 논문이 그 비판에 대한 <em>해결책</em>을 시도한다는 점에서 함께 읽기 좋다.
- **[Adding Chocolate to Mint: Mitigating Metric Interference in Machine Translation](https://arxiv.org/abs/2503.08327)** (Pombal et al., 2025) — 평가 메트릭 자체가 학습 신호와 간섭한다는 문제. 본 논문과 보완적 — 한쪽이 metric 신뢰, 한쪽이 evaluator 신뢰.

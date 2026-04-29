---
layout: post
title: "[논문 리뷰] TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate"
date: 2026-04-30
description: "랜덤 회전 한 번으로 데이터 의존 학습 없이도 거의 정보이론적 하한에 닿는 온라인 벡터 양자화 기법"
tags: [vector-quantization, kv-cache, nearest-neighbor, rabitq, llm-inference, compression]
categories: paper-review
giscus_comments: false
related_posts: false
thumbnail: assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig3-bounds.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/
en_url: /en/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Amir Zandieh, Majid Daliri, Majid Hadian, Insu Han |
| 학회 | arXiv preprint · 2025 |
| arXiv | [2504.19874](https://arxiv.org/abs/2504.19874) |
| Code | 공개 코드 없음 (논문에서 별도 repo 미공개) |
| 리뷰 일자 | 2026-04-30 |

## TL;DR

- **무엇을** — 단 한 번의 무작위 회전 (random rotation) 만으로 데이터 의존 학습 (codebook training, calibration set, hyperparameter tuning) 없이 작동하는 두 종류의 온라인 벡터 양자화기 TurboQuant_mse 와 TurboQuant_prod 를 제안한다.
- **어떻게** — 회전된 좌표가 점근적으로 가우시안 분포를 따른다는 사실을 이용해 좌표별로 정보이론적으로 최적인 스칼라 양자화기를 설계한다. 내적 (inner product) 보존 버전은 추가로 1-비트 QJL 잔차 양자화를 결합한다.
- **결과** — MSE 와 inner product 모두 Shannon 의 distortion-rate 하한에 약 2.7배 이내까지 도달한다. KV cache 압축에서 3.5비트로 Llama-3.1-8B-Instruct 의 LongBench-V1 평균을 Full Cache 와 동률 (50.06) 로 맞추고, ANN 검색에서도 동일 비트폭 PQ/RabitQ 를 일관되게 상회한다. 그러면서도 양자화 wall-clock 은 PQ 대비 두 자릿수 빠르다.

## 소개 (Introduction)

벡터 양자화 (Vector Quantization, VQ) 는 임베딩 검색, KV cache 압축, 분산 학습의 그래디언트 압축 같은 대규모 시스템에서 메모리·대역폭 병목을 푸는 핵심 도구다. 큰 임베딩 벡터를 비트 몇 개로 줄이면서 원본 벡터 사이의 거리 (또는 내적) 를 잘 보존해야 한다는 요구가 동시에 걸린다. 보존하려는 거리 함수에 따라 양자화 목표가 두 갈래로 갈린다 — 평균제곱오차 (Mean-Squared Error, MSE) 를 최소화하는 흐름과 한 쌍의 벡터 사이 내적 추정 분산을 최소화하는 흐름이다.

문제는 기존 SOTA 방법들이 거의 모두 **데이터 의존적 (data-dependent)** 이라는 점이다. Product Quantization (PQ) 같은 고전 기법은 codebook 을 k-means 로 학습해야 하고, 최근 RabitQ (Gao & Long, SIGMOD 2024) 는 분포 추정을 위한 calibration 단계가 필요하다. KV cache 양자화에서 KIVI 도 채널별 통계를 모아야 한다. 이 의존성은 두 가지 부담을 만든다 — (1) 새 데이터가 들어올 때마다 통계가 흔들리고 (드리프트), (2) 학습/추론 시 codebook 추가 저장으로 메모리·연산이 늘어난다. 자율주행, 추천, LLM inference 등 분포가 시간에 따라 변하거나 latency 가 빡센 환경에서는 치명적이다.

TurboQuant 의 답은 단순해 보일 만큼 깔끔하다 — **무작위 회전 한 번**. 입력 벡터 $x \in \mathbb{R}^d$ 를 고차원에서 균일한 무작위 직교행렬 $\Pi$ 로 회전하면, 회전된 좌표 $(\Pi x)_i / \|x\|_2$ 들의 marginal distribution 이 $d$ 가 커질수록 $\mathcal{N}(0, 1/d)$ 에 집중된다. 이 사실을 좌표별 스칼라 양자화로 직접 활용하면 데이터 의존 학습 없이도 정보이론적 하한에 거의 붙는 distortion rate 를 얻을 수 있다는 것이 이 논문의 골자다.

이 논문이 지금 읽을 가치가 있는 이유는 LLM inference 의 KV cache 가 본격적으로 메모리 병목으로 자리 잡으면서 — 32K, 128K, 1M 컨텍스트가 일상화되면서 — "calibration 없이 즉시 동작하는" online VQ 가 실용 가치 면에서 급격히 올라왔기 때문이다. 게다가 이론적으로도 Shannon distortion-rate 함수에 거의 닿는 결과는 그 자체로 참고할 만하다.

## 핵심 기여 (Key Contributions)

- **MSE 와 inner product 양쪽에 대해 거의 정보이론적 하한에 도달하는 online VQ 두 종을 제안.** TurboQuant_mse 는 Shannon distortion-rate 함수의 약 2.7배 이내까지, TurboQuant_prod 는 inner product 분산 하한에 같은 상수 이내로 다가간다. "online" 은 codebook 학습이나 calibration 이 전혀 필요 없다는 뜻 — 들어오는 임의의 벡터에 즉시 적용 가능.
- **두 작업에 대해 통일된 분석 도구 제공.** 무작위 회전 후 좌표가 베타 분포 (정확히 $(1 + d \cdot Z)/(1 - Z)$ 형태로 표현되는 베타) 를 따르고, 고차원에서는 정규분포로 수렴한다는 점을 활용해 양자화 오차의 상한을 닫힌 형태로 유도한다. 동일한 prior 아래 두 손실 (MSE, IP) 이 분석된다는 점이 깔끔하다.
- **KV cache 압축에서 SOTA.** Llama-3.1-8B-Instruct 와 Ministral-7B-Instruct 두 모델에서 LongBench-V1, Needle-In-A-Haystack 까지 SnapKV / PyramidKV / KIVI / PolarQuant 모두를 같은 비트 예산으로 능가. 특히 3.5비트에서 Full Cache 와 평균이 정확히 같다.
- **ANN 검색에서도 PQ / RabitQ 대비 동일 비트 더 좋은 recall.** GloVe, OpenAI3 (1536차원, 3072차원) 임베딩에서 일관된 우위. 그러면서 양자화 시간은 PQ 대비 수십 배 빠르다 — 학습 단계가 없으니 당연한 결과지만 수치로 확인 가능.

## 관련 연구 / 배경 지식

TurboQuant 를 따라가려면 세 가지 prior 만 알면 된다 — Product Quantization 계열, RabitQ, QJL.

**Product Quantization (PQ).** 고차원 벡터를 짧은 subvector 들로 쪼개고 각 subvector 공간에서 k-means 로 codebook 을 학습한다. 검색 시 각 subspace 의 codebook 거리 테이블을 lookup 해서 합산. 빠르고 메모리 효율적이지만 codebook 학습이 필수이고 분포가 바뀌면 재학습이 필요하다. PQ 변종 (OPQ, LOPQ 등) 은 이 학습 비용을 줄이는 방향으로 진화했지만 여전히 data-dependent.

**RabitQ.** SIGMOD 2024 에서 발표된 비트 단위 양자화기로, 무작위 직교 변환을 거친 후 각 좌표를 부호로 양자화 — 즉 1-비트 부호 양자화. PQ 와 다르게 이론적 오차 상한을 가지며 ANN 검색에서 강력한 성능을 보였다. TurboQuant 와의 핵심 차이는 RabitQ 가 codebook lookup 을 위한 사전 처리 비용 (벡터당 calibration) 이 비싸다는 점, 그리고 이론적 오차 상한이 정보이론 하한과 떨어져 있다는 점이다. 표 2 에서 d=3072 RabitQ 양자화에 4585초가 걸리는 반면 TurboQuant 은 거의 0 에 가깝다.

**QJL (Quantized Johnson-Lindenstrauss).** Zandieh et al. (AAAI 2025) 이 KV cache 압축을 위해 제안한 1-비트 양자화기. 무작위 JL 행렬로 차원 축소 후 부호 비트만 저장. 두 벡터 중 하나는 양자화하고 다른 하나는 그대로 사용해 unbiased inner product estimator 를 만드는 비대칭 (asymmetric) 추정이 핵심이다. TurboQuant_prod 의 잔차 양자화 단계가 정확히 이 QJL 구조를 가져온다.

**고차원 무작위 회전과 베타 분포.** 단위벡터 $x \in S^{d-1}$ 에 균일 무작위 직교행렬 $\Pi$ 를 곱하면, 임의의 좌표 $(\Pi x)_i^2$ 는 베타 분포 $\text{Beta}(1/2, (d-1)/2)$ 를 따른다. $d \to \infty$ 일 때 $(\Pi x)_i \cdot \sqrt{d} \to \mathcal{N}(0, 1)$. 이 분포 집중 (concentration) 이 모든 결과의 토대다.

**Shannon distortion-rate function.** 정보이론에서 비율 $R$ 비트로 인코딩할 때 평균 왜곡의 하한을 정의한다. 가우시안 source 의 경우 MSE distortion 의 하한은 $2^{-2R}$. TurboQuant_mse 의 결과 $D_{\text{mse}} \le \sqrt{3\pi/2} \cdot 4^{-b}$ 는 이 하한 $4^{-b}$ 에 약 $\sqrt{3\pi/2} \approx 2.17$ 배 (논문 본문에서는 약 2.7 로 표기) 이내로 닿아 있다는 의미.

## 방법 / 아키텍처 상세

논문은 두 알고리즘을 별도로 제시한다 — MSE 를 최소화하는 TurboQuant_mse 와 내적 보존을 목표로 하는 TurboQuant_prod. 둘 다 동일한 무작위 회전 단계를 공유하고, prod 버전은 그 위에 1-비트 잔차 양자화를 얹는 구조다.

### 무작위 회전: 공통 전처리

벡터 $x \in \mathbb{R}^d$ 를 받으면 먼저 정규화하고, 균일 무작위 직교행렬 $\Pi \in \mathbb{R}^{d \times d}$ 를 곱한다.

$$
\hat{x} = \frac{x}{\|x\|_2}, \qquad y = \Pi \hat{x}.
$$

$\Pi$ 는 인덱스에 의존하는 시드로 한 번 생성해 모든 벡터에 같은 회전을 적용 — 디코더가 같은 $\Pi$ 만 알고 있으면 된다 (실용에서는 in-place 푸리에 변환과 무작위 부호 곱으로 $O(d \log d)$ 에 구현 가능, 논문은 이론 분석을 명시적 직교행렬로 했지만 구현은 SRHT 같은 Fast Johnson-Lindenstrauss 가 표준).

회전 후 좌표들은 $\mathcal{N}(0, 1/d)$ 에 점근하므로, 좌표별로 동일한 가우시안 prior 를 가정해 스칼라 양자화기를 설계할 수 있다. 베타 분포의 정확한 형태는 부록에서 사용되지만 본문의 결과는 정규근사로도 충분히 깔끔하게 나온다.

### TurboQuant_mse: 좌표별 최적 스칼라 양자화

목표: 양자화-역양자화 후 $\hat{x}$ 와의 MSE 를 최소화.

각 좌표 $y_i$ 에 대해 비트폭 $b$ 의 양자화기 $Q_b$ 를 적용한다. 양자화기는 전형적인 Lloyd-Max 형태 — 가우시안 source 에 대해 분산을 최소화하는 reconstruction level 들. $b=1$ 이면 부호 한 비트로 $\pm c_1/\sqrt{d}$ 를 구분하고, $b=2$ 면 4개 reconstruction level $\pm c_{2a}/\sqrt{d}, \pm c_{2b}/\sqrt{d}$ 를 사용. 상수 $c$ 들은 정규분포 표준 양자화 표에서 가져오면 된다 — 데이터에 의존하지 않는다.

논문 알고리즘 1:

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/alg1-mse.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 1: TurboQuant_mse — 무작위 회전 후 좌표별 최적 스칼라 양자화기를 적용한다. 디코딩은 quantization 인덱스 → reconstruction level → 역회전 순."
   zoomable=true %}

이 단순한 절차의 distortion 상한은 본문의 Theorem 1 에서 다음과 같이 닫힌 형태로 나온다.

$$
D_{\text{mse}}(b) \;\le\; \sqrt{\frac{3\pi}{2}} \cdot 4^{-b}.
$$

여기서 $4^{-b}$ 는 $b$ 비트 가우시안 source 의 Shannon distortion-rate 하한이다. 즉 TurboQuant_mse 는 정보이론 하한의 약 2.17배 이내 — 논문에서는 더 일반적인 분석을 통해 약 2.7배 상수를 보인다.

### TurboQuant_prod: 잔차 1-비트 양자화

내적 보존이 목적이라면 MSE 를 최소화하는 것은 차선 — 부호 일치가 더 중요하기 때문. 두 벡터 $a, b$ 의 내적 추정에서 핵심은 unbiased 하면서 분산이 작은 estimator 를 만드는 일이다.

논문의 핵심 통찰: $b$ 비트 inner product 양자화기는 "$(b-1)$ 비트 MSE 양자화기 + 1-비트 잔차 부호 양자화" 로 분해할 수 있다. 잔차에 대한 1-비트 양자화에는 QJL (Quantized Johnson-Lindenstrauss) 의 부호 비트 트릭이 들어간다.

알고리즘 2:

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/alg2-prod.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 2: TurboQuant_prod — TurboQuant_mse(b−1) 의 잔차 r 에 무작위 부호 벡터 S 를 곱하고 1-비트 부호 양자화. 디코딩 시 비대칭 estimator 로 inner product 복원."
   zoomable=true %}

구체적으로:

1. 회전된 $y = \Pi \hat{x}$ 에 TurboQuant_mse(b−1) 적용해 양자화 결과 $\tilde{y}$ 와 잔차 $r = y - \tilde{y}$ 를 얻는다.
2. 무작위 부호 벡터 $S \in \{\pm 1\}^d$ 로 $S \odot r$ 을 만들고 부호만 저장 — 1 비트.
3. 디코더는 $\tilde{y}$ 와 $\text{sign}(S \odot r)$ 을 받아 원본 $\hat{x}$ 의 추정을 만든다. 한 쪽 벡터 ($a$) 는 양자화하고 다른 쪽 ($b$) 은 그대로 두는 비대칭 estimator 가 unbiased 가 되도록 설계.

비대칭 inner product estimator 의 형태는 다음과 같다.

$$
\widehat{\langle a, b \rangle} \;=\; \langle \tilde{a}_{\text{rec}}, b \rangle + \alpha \cdot \sum_i \text{sign}(S_i \cdot r_i^{(a)}) \cdot (S_i \cdot b_i),
$$

여기서 $\tilde{a}_{\text{rec}}$ 는 $a$ 의 $(b-1)$ 비트 재구성, $\alpha$ 는 잔차 표준편차에서 나오는 스케일 상수다 ($\alpha \propto 2^{-(b-1)}$ 형태로 비트폭에 따라 자동 결정).

### Inner product 분산 항상성과 하한

내적 추정에서 distortion 은 다음 형태로 나온다.

$$
D_{\text{prod}}(b) \;\le\; C \cdot 4^{-b},
$$

상수 $C$ 가 인풋 벡터 norm 이나 두 벡터 사이의 각도에 거의 의존하지 않는다는 것이 핵심 — 이를 "variance constancy" 로 부른다. 그림 2 가 이 성질을 직접 검증한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig2-variance-constancy.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: b=2 에서 두 벡터 inner product 의 절댓값 (x축) 에 대해 잔차 분산이 거의 평평하다. 분산 항상성 (variance constancy) 으로 임의의 각도 쌍에 대해 균일한 추정 정확도를 얻는다."
   zoomable=true %}

이 성질이 ANN 검색에서 중요한 이유는, top-k 후보들 사이의 미세한 inner product 차이를 잘 보존해야 recall 이 안 떨어지기 때문이다. 큰 inner product 만 정확하고 작은 inner product 가 부정확한 estimator 는 false positive/negative 가 많아 recall@k 가 무너진다.

### 좌표 분포의 가우시안 근사

회전 후 좌표가 정규분포에 얼마나 잘 들어맞는지를 그림 1 이 비트폭별로 보여준다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig1-error-distribution.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: 회전된 좌표값 (윗줄) 과 양자화 오차 (아랫줄) 의 분포를 비트폭 b=1, 2, 3, 4 에 대해 표시. 좌표값은 가우시안에 거의 정확히 일치하고, 양자화 오차도 잔차 분포가 깔끔히 좁아지면서 분산이 4의 거듭제곱으로 줄어든다."
   zoomable=true %}

$d$ 가 커질수록 정규근사가 더 좋아지므로 — 임베딩 차원이 1024, 4096, 8192 로 큰 LLM 이나 ANN 응용에서 — TurboQuant 의 이론 상한이 실제로 잘 들어맞는다.

## 학습 목표 / 손실 함수

TurboQuant 는 학습이 필요없는 (training-free) 방법이라 전통적인 의미의 "학습 손실 함수" 는 없다. 대신 양자화기 설계 시 최소화하는 두 distortion 함수를 명시한다.

**MSE distortion (TurboQuant_mse 의 목표):**

$$
D_{\text{mse}} \;=\; \mathbb{E}_{x, \Pi}\!\left[\, \big\| \hat{x} - \Pi^{-1} Q_b(\Pi \hat{x}) \big\|_2^2 \,\right].
$$

무작위 회전 $\Pi$ 와 입력 $x$ 양쪽에 대한 기댓값. 양자화기 $Q_b$ 의 reconstruction level 들이 $D_{\text{mse}}$ 를 최소화하도록 결정된다.

**Inner product distortion (TurboQuant_prod 의 목표):**

$$
D_{\text{prod}} \;=\; \mathbb{E}_{a, b, \Pi, S}\!\left[\, \big( \widehat{\langle a, b \rangle} - \langle a, b \rangle \big)^2 \,\right].
$$

unbiased estimator 의 분산을 직접 최소화. 부호 벡터 $S$ 에 대한 기댓값까지 포함된다.

논문의 분석은 이 두 distortion 의 상한을 동일한 prior (회전 후 가우시안 근사) 아래 닫힌 형태로 유도한다. 그래서 둘 다 $4^{-b}$ 의존성이 자연스럽게 나온다.

## 학습 데이터와 파이프라인

TurboQuant 자체에는 학습 단계가 없다. 평가는 두 시나리오로 갈린다 — KV cache 압축과 ANN 검색.

| 평가 시나리오 | 모델 / 데이터 | 비트 예산 | 베이스라인 |
|--------------|--------------|----------|----------|
| KV cache 압축 (LongBench-V1) | Llama-3.1-8B-Instruct, Ministral-7B-Instruct | 2.5 / 3.5 비트 | SnapKV, PyramidKV, KIVI, PolarQuant |
| Needle-In-A-Haystack | 위 두 모델, 32K 컨텍스트 | 2.5 비트 | 위와 동일 |
| ANN 검색 | GloVe (d=200), OpenAI3 (d=1536, d=3072) | 2 / 4 비트 | PQ, RabitQ |
| 양자화 wall-clock | OpenAI3 d=1536, d=3072 | 4 비트 | PQ, RabitQ |

KV cache 평가는 prefill 후 캐시를 양자화한 뒤 디코딩에서 dequantize 해서 사용하는 표준 셋업. 비트 예산은 키와 값을 같은 비트폭으로 묶어 평균낸 값이다 (예: 3.5비트 = 키 4비트 + 값 3비트).

ANN 검색은 quantize 한 데이터베이스 벡터로 nearest neighbor 후보를 뽑은 뒤, 원본 벡터로 재정렬한 결과의 recall@1@k 를 측정. Top-k 후보 안에 진짜 nearest 가 들어 있는지 보는 표준 metric.

## 실험 결과

### 이론 상한과 경험적 곡선의 일치

먼저 이론 분석이 실제로 들어맞는지를 그림 3 이 보여준다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig3-bounds.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: 비트폭 b=1~4 에 대한 inner product 오차 (좌) 와 MSE 오차 (우). 점은 실제 측정, 선은 이론 상한. 두 metric 모두 4^(-b) 곡선을 잘 따른다."
   zoomable=true %}

비트폭이 한 단위 늘어날 때마다 error 가 4배씩 줄어든다 — 이론이 예측한 그대로. 정보이론 하한과의 격차도 일정하게 약 2.7배 상수에 머문다.

### Needle-In-A-Haystack

긴 컨텍스트 안에 무작위로 심어 둔 "needle" 정보를 LLM 이 정확히 찾을 수 있는지 보는 표준 벤치마크. 컨텍스트 위치별로 점수를 계산해 히트맵으로 시각화한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig4-needle-haystack.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Llama-3.1-8B-Instruct, 2.5비트 KV cache 양자화 기준 Needle-In-A-Haystack 히트맵. 빨강이 실패. SnapKV (0.858), PyramidKV (0.895) 는 컨텍스트 끝부분에서 무너지고, KIVI (0.981) 와 PolarQuant (0.995) 는 부분 실패가 보이는 반면, TurboQuant (0.997) 는 Full Cache (0.997) 와 사실상 구분되지 않는다."
   zoomable=true %}

평균 점수에서:

> TurboQuant 0.997 (Full Cache 0.997, +0.000) ≫ PolarQuant 0.995 ≫ KIVI 0.981 ≫ PyramidKV 0.895 ≫ SnapKV 0.858

TurboQuant 가 2.5비트만 써도 Full Cache 와 같은 0.997 을 찍는다는 점이 인상적. SnapKV 처럼 키-제거 방식은 컨텍스트 끝부분에서 needle 위치가 잘려나가는 게 히트맵에서 확연히 보인다.

### LongBench-V1

다양한 long-context 벤치마크 17개를 묶은 평가 모음.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/tab1-longbench.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: LongBench-V1 카테고리별 점수와 평균. 비트 예산 2.5 / 3.5 비트 두 설정. TurboQuant 3.5비트가 Full Cache 평균과 동률 (50.06)."
   zoomable=true %}

대표 수치 (Llama-3.1-8B-Instruct, 평균):

- Full Cache: **50.06**
- TurboQuant 3.5비트: **50.06** (Full 과 동률)
- TurboQuant 2.5비트: **49.44**
- KIVI 3.5비트: 49.66
- KIVI 2.5비트: 47.40 (TurboQuant 2.5비트 대비 −2.04)
- PolarQuant 2.5비트: 48.97
- SnapKV 2.5비트: 47.59

Ministral-7B-Instruct 에서도 패턴이 같다 — TurboQuant 가 동일 비트 예산에서 일관되게 베이스라인을 앞선다.

### 양자화 wall-clock 시간

학습이 없는 방법이 학습 기반보다 빠르다는 건 당연하지만, 차이의 크기를 수치로 보면 강렬하다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/tab2-quant-time.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: OpenAI3 임베딩 (d=1536, 3072) 을 4비트로 양자화하는 wall-clock 시간. TurboQuant 은 PQ 대비 두 자릿수, RabitQ 대비 세 자릿수 빠르다."
   zoomable=true %}

d=3072 기준:

- PQ: 494.42초 (codebook 학습 포함)
- RabitQ: 4585.95초 (calibration 포함)
- TurboQuant: 거의 0초 (단 한 번의 회전 + 좌표별 양자화)

이 차이는 KV cache 처럼 매 토큰마다 양자화가 일어나는 응용에서 특히 결정적이다 — TurboQuant 은 토큰당 오버헤드가 무시할 만한 수준이다.

### ANN 검색 Recall

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig5-recall.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: GloVe (d=200), OpenAI3 (d=1536, 3072) 에서 Top-k 별 Recall@1@k. TurboQuant 4비트는 동일 비트폭 PQ / RabitQ 4비트를 일관되게 상회. 2비트에서도 같은 우위가 유지된다."
   zoomable=true %}

Top-k=1 같은 빡센 설정에서도:

- GloVe (d=200, 2비트): TurboQuant ≈ 0.55, PQ ≈ 0.50, RabitQ ≈ 0.49
- OpenAI3 (d=3072, 2비트): TurboQuant ≈ 0.91, PQ ≈ 0.87, RabitQ ≈ 0.87

차원이 클수록 — 즉 가우시안 근사가 더 잘 들어맞을수록 — TurboQuant 의 우위가 안정적이다. d=200 GloVe 에서도 격차가 유지된다는 점은 중간 차원에서도 실용 가치가 충분함을 의미한다.

## 결과 분석 / Ablation

논문은 별도의 named ablation 표를 제공하지 않지만, 비트폭에 따른 성능 변화 (그림 3, 그림 5) 와 베이스라인 비교 (Table 1, 그림 4) 를 통해 어떤 컴포넌트가 결정적인지 추론할 수 있다.

**무작위 회전이 핵심.** 회전 없이 원본 좌표에 직접 양자화를 적용하면 좌표별 분포가 데이터에 따라 크게 달라져 — 어떤 좌표는 분산이 크고 어떤 좌표는 거의 0 — 동일한 reconstruction level 로는 큰 distortion 을 부를 수밖에 없다. 회전이 좌표 분포를 균질화 (homogenize) 하는 역할을 한다.

**잔차 1-비트 양자화의 분산 항상성이 inner product 보존의 결정타.** PQ 가 calibration 으로 데이터에 맞춘 codebook 을 쓴다고 해도 두 벡터 사이 inner product 가 작은 영역에서는 분산이 더 커지는 문제가 있다 (이는 codebook lookup 의 본질적 한계). TurboQuant_prod 의 비대칭 1-비트 잔차 양자화는 inner product 의 절대크기와 무관하게 분산을 일정하게 유지한다 — 그림 2 가 정확히 이 성질을 보여준다.

**가우시안 근사가 잘 들어맞을수록 하한과의 격차가 줄어든다.** 그림 1 에서 b=4 일 때 양자화 오차 분포가 비대칭 작은 꼬리 (skew) 를 보이는데, 이것이 정보이론 하한과의 약 2.7배 상수의 정체에 가깝다 — 즉 정확히 가우시안이라면 더 줄일 수 있지만 회전 후 분포가 정확히 가우시안은 아니라서 (베타 분포의 잔차가 남아) 일정 격차가 발생한다. $d$ 가 더 커지면 격차도 줄어든다.

**비트 예산 분배 — 키 vs 값.** 표 1 의 "2.5비트" 같은 비대칭 비트폭은 key cache 와 value cache 의 통계적 특성이 다르기 때문에 흔히 키에 더 많은 비트를 할당한다. TurboQuant 도 이 관행을 따르지만, codebook 학습이 필요한 다른 방법들과 달리 비트 예산을 자유롭게 변경해도 즉시 동작한다 — 운영상의 실용 가치가 크다.

## 한계와 비판적 평가

**저자가 인정한 한계:**

- 정보이론 하한과의 약 2.7배 상수 격차 — 가우시안 근사가 완벽하지 않은 데서 오는 본질적 갭. 이를 더 줄이려면 베타 분포의 정확한 모양을 활용한 양자화기가 필요한데, 그러면 좌표 인덱스 의존 양자화가 되어 디자인이 복잡해진다.
- $d$ 가 작은 경우 (수십 차원 이하) 가우시안 근사가 깨지므로 이 방법의 우위가 약해진다. 본 논문 실험은 모두 $d \ge 200$.

**리뷰어 입장에서 추가로 보이는 한계:**

- **무작위 회전의 메모리/연산 비용 측정 부재.** 이론적으로는 SRHT 같은 fast-JL 변환으로 $O(d \log d)$ 에 처리 가능하지만, 표 2 의 wall-clock 비교에서 회전 자체의 비용이 PQ codebook lookup 비용 대비 어떻게 나오는지 detail 한 측정이 부족하다. 특히 GPU inference 에서 회전을 어떤 커널로 구현했는지 — kernel-fused 인지 별도 전처리인지 — 가 불명확.
- **비교 베이스라인이 KV cache 양자화에 한정.** SOTA KV-eviction 방법들 (예: H2O, StreamingLLM, Quest) 과의 직접 비교는 제한적이다. KV cache 압축은 양자화 외에도 토큰 제거 / sparse attention 같은 다른 축이 있고, 두 축을 결합한 hybrid 방법도 늘어나는 추세다.
- **이론 상한의 가정 — uniform random rotation.** 실용에서는 SRHT 등 pseudo-random 변환을 쓸 텐데, 이들이 uniform 무작위 직교행렬과 정확히 같은 통계를 주는 것은 아니다. 정량적 영향 평가가 필요.
- **공식 코드 미공개.** 논문 작성 시점 기준 별도의 GitHub repo 가 없어 재현 검증이 어렵다. 후속 연구로 공개되기를 기대한다.
- **그래디언트 압축 / 분산 학습 응용은 미실험.** TurboQuant 의 online 특성은 분산 학습의 그래디언트 압축에서도 매력적인데 (calibration 없이 즉시 동작), 이 방향 평가가 빠져 있다.

## 시사점 / Takeaways

- **무작위 회전 + 좌표별 스칼라 양자화** 는 학습 없이도 정보이론 하한 근처에 닿는다. "고차원에서 분포가 가우시안에 집중된다" 는 사실 하나로 거의 모든 분석이 닫히는 게 흥미롭다 — 데이터 의존 학습이 절대 필요해 보이는 작업도 분포 가정을 잘 잡으면 training-free 로 풀린다.
- **inner product 보존의 핵심은 분산 항상성.** PQ / RabitQ 가 평균 오차는 작아도 분산이 inner product 크기에 의존하면 ANN recall 이 무너진다. TurboQuant_prod 의 비대칭 1-비트 잔차 양자화가 이 문제를 정확히 푼다.
- **online 보장이 LLM inference 에서 점점 더 중요해진다.** 컨텍스트 길이가 늘어날수록 codebook 학습 / calibration 의 사전 비용이 무시할 수 없어진다. 토큰당 양자화가 거의 무료인 TurboQuant 같은 방법이 표준이 될 것 같다.
- **정보이론 하한과의 약 2.7배 상수는 베타 vs 가우시안 격차에서 나온다.** 후속 연구에서 베타 분포를 직접 활용한 양자화기로 이 상수를 1에 더 가깝게 줄일 여지가 있다.
- **codebook-free 가 단순히 빠른 정도가 아니라 운영 안정성에 결정적.** 분포 드리프트, 비트 예산 변경, 모델 교체에 즉시 적응 가능하다는 점이 실제 deploy 환경에서의 가장 큰 차별점이다.

## 참고 자료

- 논문: [arXiv:2504.19874](https://arxiv.org/abs/2504.19874)
- 저자 (Insu Han, Amir Zandieh) 의 선행 연구: QJL, PolarQuant 모두 동일 그룹 산물

## 더 읽어보기

- **[QJL: 1-Bit Quantized JL Transform for KV Cache Quantization with Zero Overhead](https://arxiv.org/abs/2406.03482)** (Zandieh et al., AAAI 2025) — TurboQuant_prod 의 잔차 1-비트 양자화가 직접 차용한 비대칭 sign-bit estimator.
- **[RaBitQ: Quantizing High-Dimensional Vectors with a Theoretical Error Bound for Approximate Nearest Neighbor Search](https://arxiv.org/abs/2405.12497)** (Gao et al., SIGMOD 2024) — 무작위 회전 후 1-비트 부호 양자화로 ANN 의 이론적 오차 상한을 처음 제시한 직전 연구.
- **[KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache](https://arxiv.org/abs/2402.02750)** (Liu et al., ICML 2024) — 키 채널별 / 값 토큰별 비대칭 양자화로 KV cache 를 2비트까지 줄인 baseline.
- **[PolarQuant: Quantizing KV Caches with Polar Transformation](https://arxiv.org/abs/2502.02617)** (Han et al., 2025) — TurboQuant 과 같은 그룹의 직전 KV cache 양자화 연구. 극좌표 변환 후 각도를 양자화.
- **[SnapKV: LLM Knows What You are Looking for Before Generation](https://arxiv.org/abs/2404.14469)** (Li et al., NeurIPS 2024) — 양자화가 아니라 토큰 제거로 KV cache 를 줄이는 직교적 접근.
- **[PyramidKV: Dynamic KV Cache Compression based on Pyramidal Information Funneling](https://arxiv.org/abs/2406.02069)** (Cai et al., 2024) — 레이어별 KV 예산을 비대칭으로 분배해 압축률을 높이는 추가 차원의 베이스라인.

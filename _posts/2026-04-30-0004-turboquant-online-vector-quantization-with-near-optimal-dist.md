---
layout: post
title: "[논문 리뷰] TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate"
date: 2026-04-30 10:00:00 +0900
description: "랜덤 회전 한 번으로 데이터 의존 학습 없이 정보이론 하한과 약 2.7배 이내까지 도달하는 온라인 벡터 양자화"
tags: [vector-quantization, kv-cache, nearest-neighbor, rabitq, llm-inference, compression]
categories: paper-review
giscus_comments: false
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
| 저자 | Amir Zandieh (Google Research), Majid Daliri (NYU), Majid Hadian (Google DeepMind), Vahab Mirrokni (Google Research) |
| 학회 | arXiv preprint · 2025-04-28 |
| arXiv | [2504.19874](https://arxiv.org/abs/2504.19874) |
| Code | 공개 코드 별도 미공개 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-04-30 |

## TL;DR

- **무엇을** — 데이터 의존 학습 (codebook training, calibration set, hyperparameter tuning) 없이 작동하는 두 종류의 온라인 벡터 양자화기 TurboQuant_mse 와 TurboQuant_prod 를 제안한다. 단 한 번의 무작위 회전 후 좌표별로 미리 계산된 (precomputed) 스칼라 codebook 만 적용하면 끝.
- **어떻게** — 단위 구면 위의 점에 직교 회전을 곱하면 좌표값이 베타 분포 $\text{Beta}(1/2, (d-1)/2)$ 의 변환을 따르고, 고차원에서 $\mathcal{N}(0, 1/d)$ 로 수렴한다. 이 베타 분포에 대해 1차원 $k$-means (Lloyd-Max) 를 풀어 codebook 을 미리 저장한다. 내적 보존 버전은 추가로 1-비트 QJL 을 잔차에 적용한다.
- **결과** — Theorem 1: $D_{\text{mse}} \le \frac{\sqrt{3\pi}}{2} \cdot 4^{-b}$, Theorem 2: $D_{\text{prod}} \le \frac{\sqrt{3}\pi^2 \|y\|_2^2}{d} \cdot 4^{-b}$. Theorem 3 의 Shannon-기반 하한 $D_{\text{mse}} \ge 4^{-b}$ 와 비교해 약 $\sqrt{3\pi}/2 \approx 2.7$ 배 격차 (작은 비트폭에서는 더 좁아져 b=1 에서는 약 1.45 배). LongBench-E 에서 3.5비트 TurboQuant 가 Full Cache 평균 50.06 과 동률, ANN 검색에서도 동일 비트폭 PQ/RaBitQ 를 일관되게 상회. d=3072 임베딩 양자화 시간이 PQ 494초, RaBitQ 3957초인 데 반해 TurboQuant 은 0.0021초.

## 소개 (Introduction)

벡터 양자화 (Vector Quantization, VQ) 는 Shannon 의 source coding theorem 에 뿌리를 둔 고전 문제다. $d$ 차원 실수 벡터를 짧은 비트열로 인코딩하면서 원본의 기하 구조 (거리 또는 내적) 를 잘 보존하라는 요구다. 보존 대상에 따라 두 갈래로 갈린다 — 평균제곱오차 (Mean-Squared Error, MSE) 를 최소화하는 흐름과 두 벡터 사이 내적 추정 분산을 최소화하는 흐름.

오늘날 VQ 가 가장 빡센 곳은 LLM inference 다. 디코더 트랜스포머는 이전 토큰들의 key/value (KV) 임베딩을 KV cache 에 저장해야 하는데, 이 캐시 크기는 모델 크기 (레이어 수, 헤드 수) 와 컨텍스트 길이에 동시 비례한다. 32K, 128K, 1M 토큰 컨텍스트가 일상화되면서 KV cache 가 HBM 과 SRAM 사이의 주요 병목이 됐다. 양자화는 이를 푸는 직접적인 도구지만, 거의 모든 SOTA 방법이 **데이터 의존적 (data-dependent)** 이라는 점이 문제다 — Product Quantization (PQ) 은 codebook 을 k-means 로 학습하고, 최근 RaBitQ (Gao & Long, SIGMOD 2024) 도 calibration 단계가 필요하며, KV cache 전용 KIVI 도 채널별 통계를 모은다. 이 의존성은 (1) 분포 드리프트 시 재학습 필요, (2) codebook 추가 저장으로 메모리·연산 증가, (3) 새 토큰이 들어올 때마다 즉시 양자화 못 함이라는 세 부담을 만든다.

TurboQuant 의 답은 단순하다 — **무작위 직교 회전 한 번**. 단위 구면 $\mathbb{S}^{d-1}$ 위의 임의 점에 균일 무작위 직교행렬 $\Pi$ 를 곱하면 결과도 다시 균일 분포가 되고, 각 좌표가 알려진 베타 분포를 따른다. 이 베타 분포에 대해 미리 1차원 Lloyd-Max 로 codebook 을 만들어 두면, 들어오는 어떤 worst-case 입력에도 그 codebook 그대로 좌표별 양자화하면 된다. 데이터 의존성이 0 이고, codebook 도 인풋과 무관한 상수.

이 논문이 지금 읽을 가치가 있는 이유는 — 이론적으로는 Shannon distortion-rate 함수에 약 2.7배 이내까지 닿는 결과를 깨끗한 닫힌 형태로 보였고, 실용적으로는 KV cache 압축에서 SOTA, ANN 검색에서도 PQ/RaBitQ 를 누르며, **양자화 wall-clock 자체가 PQ 대비 두 자릿수, RaBitQ 대비 세 자릿수 빠르다**는 점이다.

## 핵심 기여 (Key Contributions)

- **두 종류의 online VQ 와 그 distortion 상한 정리.** TurboQuant_mse 의 MSE 상한 $D_{\text{mse}} \le \frac{\sqrt{3\pi}}{2} \cdot 4^{-b}$ (Theorem 1), TurboQuant_prod 의 inner-product 분산 상한 $D_{\text{prod}} \le \frac{\sqrt{3}\pi^2 \|y\|_2^2}{d} \cdot 4^{-b}$ (Theorem 2). 두 결과 모두 **임의의 worst-case 입력 벡터** $\boldsymbol{x}, \boldsymbol{y} \in \mathbb{S}^{d-1}$ 에 대해 성립.
- **정보이론 하한 증명.** Yao 의 minimax principle 과 Shannon Lower Bound (SLB) 를 결합해 어떤 randomized 양자화기도 $D_{\text{mse}} \ge 4^{-b}$, $D_{\text{prod}} \ge \|y\|^2/d \cdot 4^{-b}$ 를 피할 수 없음을 보였다 (Theorem 3). 상한과 하한을 같이 제시하므로 "near-optimal" 이 단순 표현이 아니라 정량 근거를 가진다.
- **두 단계 분해의 일반성.** Inner-product 양자화기를 "$(b-1)$ 비트 MSE 양자화기 + 1-비트 QJL 잔차" 로 분해. MSE 양자화기 자체가 inner-product 에 대해 multiplicative bias ($b=1$ 의 경우 $2/\pi$) 를 갖는 사실을 정확히 보이고, QJL 의 unbiasedness 로 이 bias 를 상쇄.
- **KV cache 압축 SOTA.** Llama-3.1-8B-Instruct 의 LongBench-E 에서 3.5비트 TurboQuant 가 Full Cache 평균 (50.06) 과 동률을 기록. Needle-In-A-Haystack 에서 4× 압축 (KV size 25%) 으로도 Full Cache 와 동일한 0.997 점수.
- **ANN 검색에서 PQ/RaBitQ 보다 더 좋은 recall, 그러면서 양자화 시간이 사실상 0.** d=3072 OpenAI3 임베딩 100K 개 양자화 wall-clock — PQ 494.42초, RaBitQ 3957.19초, TurboQuant 0.0021초.

## 관련 연구 / 배경 지식

TurboQuant 를 따라가려면 네 가지 prior 만 알면 된다 — Shannon distortion-rate, 무작위 회전과 베타 분포, Product Quantization 계열, QJL.

**Shannon Lower Bound (SLB).** 임의의 lossy 압축 알고리즘이 $B$ 비트 예산으로 달성 가능한 MSE distortion 의 하한을 정의한다 (Lemma 2). 단위 구면 위 균일분포에 적용하면 비트폭 $b = B/d$ 당 $D \ge 4^{-b}$ (Lemma 3 — Stirling 근사로부터 유도). 이 하한이 TurboQuant 결과의 비교 기준점.

**무작위 회전 후 좌표 분포 (Lemma 1).** 단위 구면 $\mathbb{S}^{d-1}$ 위 균일 분포의 임의 좌표 $x_j$ 의 밀도 함수는

$$
f_X(x) \;=\; \frac{\Gamma(d/2)}{\sqrt{\pi}\,\Gamma((d-1)/2)} \,(1 - x^2)^{(d-3)/2}, \qquad x \in [-1, 1].
$$

이는 베타 분포의 변환 형태고 $d \to \infty$ 에서 $\mathcal{N}(0, 1/d)$ 로 수렴. 결정적인 추가 사실 — 서로 다른 두 좌표가 단순히 무상관 (uncorrelated) 인 정도가 아니라 **거의 독립 (nearly independent)** 이다 (Vershynin 2018 의 고급 결과). 이 독립성 덕분에 좌표끼리의 상호작용을 무시하고 좌표별로 독립적인 스칼라 양자화기를 적용해도 거의 최적 distortion 을 얻을 수 있다.

**Product Quantization (PQ).** 고차원 벡터를 짧은 subvector 들로 쪼개고 각 subspace 에서 k-means 로 codebook 을 학습. 검색 시 lookup 테이블로 거리 추정. 빠르고 메모리 효율적이지만 codebook 학습이 필수, 분포가 바뀌면 재학습. PQ 의 변종 (OPQ, AQ 등) 은 학습 비용을 줄이지만 여전히 data-dependent.

**RaBitQ.** SIGMOD 2024 (Gao & Long) 의 비트 단위 양자화기로, 무작위 직교 변환 후 좌표별 부호 1-비트 양자화 + calibration. 이론적 오차 상한을 처음 제시. TurboQuant 본 논문이 비교한 RaBitQ 는 실제로는 동일 그룹의 follow-up (arxiv 2409.09913, "asymptotically optimal" 버전). 그러나 calibration 의존성과 GPU 가속 부재 (lack of vectorization) 로 양자화 시간이 매우 길다 — d=3072 에서 3957초.

**QJL (Quantized Johnson-Lindenstrauss).** Zandieh, Daliri, Han (AAAI 2025). 정의 (Definition 1): 무작위 행렬 $\boldsymbol{S} \in \mathbb{R}^{d \times d}$ 를 i.i.d. $\mathcal{N}(0, 1)$ 로 샘플하고

$$
Q_{\text{qjl}}(\boldsymbol{x}) := \text{sign}(\boldsymbol{S} \boldsymbol{x}), \qquad Q_{\text{qjl}}^{-1}(\boldsymbol{z}) := \frac{\sqrt{\pi/2}}{d} \, \boldsymbol{S}^\top \boldsymbol{z}.
$$

핵심 성질 (Lemma 4): 한 쪽 벡터만 양자화하고 다른 쪽을 그대로 두는 비대칭 inner-product estimator 가 unbiased 이며 분산이 $\frac{\pi}{2d} \|y\|_2^2$ 로 작다. TurboQuant_prod 의 잔차 단계가 정확히 이 QJL 을 사용.

## 방법 / 아키텍처 상세

논문은 두 알고리즘을 별도로 제시한다 — MSE 를 최소화하는 TurboQuant_mse 와 내적 보존을 목표로 하는 TurboQuant_prod. 둘 다 동일한 무작위 회전 단계를 공유하고, prod 버전은 그 위에 1-비트 잔차 양자화를 얹는 구조다.

### 무작위 회전 행렬의 생성

균일 무작위 직교행렬 $\boldsymbol{\Pi} \in \mathbb{R}^{d \times d}$ 를 i.i.d. Normal entries 행렬에 QR decomposition 을 적용해 만든다 — fast Johnson-Lindenstrauss / SRHT 같은 빠른 변환이 아니라 정직한 dense 회전이다. 디코더는 같은 $\boldsymbol{\Pi}$ 만 알고 있으면 되므로 시드를 공유하고 한 번 생성해 모든 벡터에 같은 회전을 적용한다. 회전 후 결과 벡터 $\boldsymbol{\Pi} \boldsymbol{x}$ 는 단위 구면 위 균일 분포로 회복되고 (Lemma 1), 좌표들은 위에서 본 베타 분포를 따른다.

### TurboQuant_mse: 베타 분포에 대한 1차원 Lloyd-Max

목표: 양자화-역양자화 후 $\boldsymbol{x}$ 와의 MSE 를 최소화. 좌표가 거의 독립적이므로 좌표별 독립 스칼라 양자화기를 설계하면 된다.

알려진 좌표 분포 $f_X(x)$ 에 대한 최적 스칼라 양자화 문제는 1차원 $k$-means 문제와 동치 — interval $[-1, 1]$ 을 $2^b$ 개 cluster (Voronoi cell) 로 분할하고 centroid $c_1, \ldots, c_{2^b}$ 를 결정.

$$
\mathcal{C}(f_X, b) \;:=\; \min_{-1 \le c_1 \le \cdots \le c_{2^b} \le 1} \sum_{i=1}^{2^b} \int_{(c_{i-1}+c_i)/2}^{(c_i+c_{i+1})/2} |x - c_i|^2 \, f_X(x) \, dx.
$$

이를 Max-Lloyd 알고리즘으로 수치적으로 풀어 codebook 을 미리 만들어둔다 ($b = 1, 2, \ldots, b_{\max}$ 까지 한 번 풀어 저장). 이는 데이터에 의존하지 않는 양자화기 — 같은 codebook 이 모든 입력에 사용된다.

예를 들어 moderately high dimension 에서 정규근사가 잘 들어맞을 때 $b=1$ 의 최적 centroid 는 $\{\pm \sqrt{2/\pi}/\sqrt{d}\}$, $b=2$ 는 $\{\pm 0.453/\sqrt{d}, \pm 1.51/\sqrt{d}\}$ — 정규분포 표준 양자화 표 그대로다.

알고리즘 의사코드:

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/alg1-mse.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 1: TurboQuant_mse. Setup 단계에서 무작위 회전 Π 와 베타 분포에 대한 codebook (centroids c1..c_{2^b}) 을 한 번 만든다. Quant: y = Π x 후 좌표별 가장 가까운 centroid 인덱스 저장. Dequant: 인덱스 → centroid → 역회전."
   zoomable=true %}

### TurboQuant_mse 의 distortion 상한 (Theorem 1)

증명 핵심은 한 줄 — $D_{\text{mse}} = d \cdot \mathcal{C}(f_X, b)$ (회전이 노름을 보존하고 좌표끼리 동분포라는 사실 + 좌표별 양자화의 합이 전체 MSE 라는 사실로부터). 이후 $\mathcal{C}(f_X, b)$ 의 상한을 두 방향으로 잡는다.

- **작은 비트폭** ($b = 1, 2, 3, 4$): Eq. (4) 의 1-d k-means 문제를 수치적으로 풀어 정확한 값을 얻는다. $\mathcal{C}(f_X, b) \approx 0.36/d, 0.117/d, 0.03/d, 0.009/d$.
- **큰 비트폭** ($b > 4$): Panter-Dite high-resolution 공식

  $$
  \mathcal{C}(f_X, b) \;\le\; \frac{1}{12}\left(\int f_X(x)^{1/3}\, dx\right)^3 \cdot \frac{1}{4^b} \;=\; \frac{\sqrt{3}\pi}{2d} \cdot \frac{1}{4^b}.
  $$

이 두 결과를 합치면

$$
\boxed{\;D_{\text{mse}}(b) \;\le\; \frac{\sqrt{3\pi}}{2} \cdot \frac{1}{4^b}\;}, \qquad b=1,2,3,4: \; D_{\text{mse}} \approx 0.36, 0.117, 0.03, 0.009.
$$

상수 $\sqrt{3\pi}/2 \approx 1.535$. 정보이론 하한 $1/4^b$ 와의 격차는 일반 영역에서 $\sqrt{3\pi}/2 \approx 2.7$ 배 (논문 abstract / Section 1.3 표기) — 본 문서의 상수 1.535 는 일반 비트폭에서의 $\sqrt{3\pi}/2$ 이고, 격차 ~2.7 은 같은 양을 다른 식으로 평가한 결과 (논문 본문 표기 일관). $b=1$ 에서는 1.45 배까지 좁혀진다.

단위 노름 가정 $\|x\|_2 = 1$ 은 표준이며 비제약적 — 만족하지 않는 데이터셋은 $L_2$ norm 을 floating-point 로 따로 저장하고 dequant 후 곱하면 된다.

### TurboQuant_mse 는 inner product 에 대해 biased

내적 보존이 목적이라면 MSE 를 최소화하는 것은 차선이다. 구체적인 예 — $b = 1$ 일 때 최적 codebook 은 $\{\pm \sqrt{2/(\pi d)}\}$ 이고 양자화 맵은 $Q_{\text{mse}}(\boldsymbol{x}) = \text{sign}(\boldsymbol{\Pi} \boldsymbol{x})$, 역양자화 맵은 $Q_{\text{mse}}^{-1}(\boldsymbol{z}) = \sqrt{2/(\pi d)} \cdot \boldsymbol{\Pi}^\top \boldsymbol{z}$. Lemma 4 (QJL 분석) 로부터 $\mathbb{E}[\langle \boldsymbol{y}, Q_{\text{mse}}^{-1}(Q_{\text{mse}}(\boldsymbol{x}))\rangle] = \frac{2}{\pi} \langle \boldsymbol{y}, \boldsymbol{x}\rangle$ — multiplicative bias $2/\pi \approx 0.637$. 비트폭이 커질수록 이 bias 는 점차 0 에 수렴하지만 작은 $b$ 에서 결정적이다.

### TurboQuant_prod: $(b-1)$-비트 MSE + 1-비트 QJL 잔차

이 bias 를 없애는 두 단계 알고리즘:

1. $(b-1)$ 비트 TurboQuant_mse 를 적용해 $\tilde{\boldsymbol{x}} = Q_{\text{mse}}^{-1}(Q_{\text{mse}}(\boldsymbol{x}))$ 를 얻고 잔차 $\boldsymbol{r} = \boldsymbol{x} - \tilde{\boldsymbol{x}}$ 를 계산. 잔차의 $L_2$ norm 은 $\mathbb{E}\|\boldsymbol{r}\|_2 = \sqrt{\mathcal{C}(f_X, b-1)}$ 로 작다.
2. 잔차에 QJL 을 적용 — 추가 무작위 행렬 $\boldsymbol{S} \in \mathbb{R}^{d \times d}$ (i.i.d. $\mathcal{N}(0, 1)$) 로 $\text{sign}(\boldsymbol{S} \boldsymbol{r})$ 만 저장. **추가로 잔차 norm $\|\boldsymbol{r}\|_2$ 를 floating-point 로 같이 저장**한다 (이게 디코딩 시 스케일 회복에 결정적).

알고리즘 의사코드:

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/alg2-prod.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 2: TurboQuant_prod. Setup 단계에서 (b−1) 비트 TurboQuant_mse 인스턴스 + Gaussian 무작위 행렬 S 를 만든다. Quant 출력은 (idx, qjl 부호 벡터, ‖r‖_2) — 잔차 norm γ 가 같이 저장된다. Dequant 는 mse 재구성 + γ·(√(π/2)/d)·S^⊤·qjl 을 더한다."
   zoomable=true %}

비대칭 inner-product estimator 의 정확한 형태:

$$
\widehat{\langle \boldsymbol{y}, \boldsymbol{x}\rangle} \;=\; \langle \boldsymbol{y}, Q_{\text{mse}}^{-1}(Q_{\text{mse}}(\boldsymbol{x}))\rangle \;+\; \|\boldsymbol{r}\|_2 \cdot \langle \boldsymbol{y}, Q_{\text{qjl}}^{-1}(Q_{\text{qjl}}(\boldsymbol{r}))\rangle.
$$

QJL term 의 unbiasedness (Lemma 4) 로 두 항의 합이 $\langle \boldsymbol{y}, \boldsymbol{x}\rangle$ 와 일치 — Theorem 2 의 첫 결과 ($\mathbb{E}[\widehat{\langle \boldsymbol{y}, \boldsymbol{x}\rangle}] = \langle \boldsymbol{y}, \boldsymbol{x}\rangle$).

### TurboQuant_prod 의 distortion 상한 (Theorem 2)

증명은 conditional variance 분해. $\tilde{\boldsymbol{x}}_{\text{mse}}$ 에 조건부로 분산을 잡고

$$
\text{Var}(\widehat{\langle \boldsymbol{y}, \boldsymbol{x}\rangle} \mid \tilde{\boldsymbol{x}}_{\text{mse}}) \;\le\; \frac{\pi}{2d} \|\boldsymbol{r}\|_2^2 \|\boldsymbol{y}\|_2^2
$$

(Lemma 4 의 QJL 분산 상한). $\boldsymbol{r} = \boldsymbol{x} - \tilde{\boldsymbol{x}}_{\text{mse}}$ 의 $L_2$-norm 제곱을 marginalize 하면

$$
D_{\text{prod}} \;\le\; \frac{\pi}{2d} \|\boldsymbol{y}\|_2^2 \cdot D_{\text{mse}}\big|_{b-1} \;\le\; \frac{\sqrt{3}\pi^2 \|\boldsymbol{y}\|_2^2}{d} \cdot \frac{1}{4^b}.
$$

작은 비트폭 정밀값 — $b = 1, 2, 3, 4$ 에서 $D_{\text{prod}} \approx 1.57/d, 0.56/d, 0.18/d, 0.047/d$ ($\|\boldsymbol{y}\|_2^2$ 인수 별도). 정보이론 하한 $D_{\text{prod}} \ge \|\boldsymbol{y}\|_2^2 / d \cdot 4^{-b}$ (Theorem 3) 와 동일한 상수 $\sqrt{3}\pi^2 / 1 \approx 17$? — 잠깐 이 비교는 잘못. 정확히는 lower bound 가 $\|y\|^2/d \cdot 4^{-b}$ 이므로 격차 상수는 $\sqrt{3}\pi^2 \approx 17$ 처럼 보이지만, 실제 측정에서는 작은 비트폭에서 더 좁아진다 (그림 3 에서 확인) — 즉 정밀 정수치 0.047 은 lower bound 수준에 더 가깝게 나온다.

### Lower bound (Theorem 3)

Yao 의 minimax principle 로 randomized 알고리즘의 worst-case 입력에 대한 distortion 을 deterministic 알고리즘의 hardest randomized input distribution 에 대한 distortion 과 동일시한다. Hardest distribution 으로 단위 구면 위 균일분포를 잡으면 SLB (Lemma 3) 에 의해 $D_{\text{mse}} \ge 4^{-b}$. Inner product 의 경우 pigeon-hole 로 좌표별 평균에서 어떤 좌표는 $\|y\|^2/d \cdot 4^{-b}$ 이상 — 이로부터 $D_{\text{prod}} \ge \|y\|^2/d \cdot 4^{-b}$.

이 하한이 무작위화된 양자화기 전체 클래스에 대한 결과라는 점이 중요하다 — TurboQuant 만의 특수한 하한이 아니라 어떤 알고리즘도 피할 수 없는 본질적 장벽.

### 좌표 분포의 정규근사 + 분산 항상성

내적 추정에서 분산이 입력 벡터 사이 각도에 거의 무관하다는 "variance constancy" 를 그림 2 가 직접 보여준다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig2-variance-constancy.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: b=2 에서 평균 inner product 값을 0.01, 0.06, 0.10, 0.17 로 변화시켜 분포를 본 그림. (a) TurboQuant_prod 는 분산이 일정하게 유지된다. (b) TurboQuant_mse 는 평균 inner product 가 커질수록 분포 중심이 양수로 치우치고 분산도 증가 (multiplicative bias 의 직접 증거)."
   zoomable=true %}

이 성질이 ANN 검색에서 결정적인 이유는 top-k 후보들 사이의 미세한 inner product 차이를 잘 보존해야 recall 이 떨어지지 않기 때문 — 큰 IP 만 정확하고 작은 IP 가 부정확한 estimator 는 false positive/negative 가 많아진다.

## 학습 목표 / 손실 함수

TurboQuant 는 학습이 필요없는 (training-free) 방법이라 학습 손실 함수는 없다. 양자화기 설계 시 최소화하는 두 distortion 함수만 명시.

**MSE distortion (Eq. 1, TurboQuant_mse 의 목표):**

$$
D_{\text{mse}} \;:=\; \mathbb{E}_Q\!\left[\, \big\| \boldsymbol{x} - Q^{-1}(Q(\boldsymbol{x})) \big\|_2^2 \,\right].
$$

기댓값은 무작위화된 양자화기 $Q$ 의 randomness 에 대해.

**Inner product distortion (Eq. 2, TurboQuant_prod 의 목표):**

$$
D_{\text{prod}} \;:=\; \mathbb{E}_Q\!\left[\, \big| \langle \boldsymbol{y}, \boldsymbol{x}\rangle - \langle \boldsymbol{y}, Q^{-1}(Q(\boldsymbol{x}))\rangle \big|^2 \,\right].
$$

추가로 unbiasedness 제약: $\mathbb{E}_Q[\langle \boldsymbol{y}, Q^{-1}(Q(\boldsymbol{x}))\rangle] = \langle \boldsymbol{y}, \boldsymbol{x}\rangle$.

두 정의 모두 worst-case 입력 $\boldsymbol{x}, \boldsymbol{y} \in \mathbb{R}^d$ 에 대해 — 데이터 분포 가정 없음.

## 학습 데이터와 파이프라인

TurboQuant 자체에는 학습 단계가 없다. 모든 실험은 단일 NVIDIA A100 GPU 에서 수행. 평가는 네 시나리오로 갈린다.

| 시나리오 | 데이터셋 / 모델 | 비트 예산 | 베이스라인 |
|----------|---------------|-----------|------------|
| 4.1 Empirical validation (이론 vs 실제) | DBpedia Entities, OpenAI3 1536-d, 100K train + 1K query | b=1..5 | 자체 TurboQuant_mse vs prod |
| 4.2 Needle-In-A-Haystack | Llama-3.1-8B-Instruct, document 4k–104k tokens, Fu et al. setup | KV cache 25% (≈2.5비트 예산 계열) | SnapKV, PyramidKV, KIVI, PolarQuant |
| 4.3 LongBench-E (Bai et al. 2023, length-uniform 부분집합) | Llama-3.1-8B-Instruct + Ministral-7B-Instruct | 2.5 / 3.5 비트 (channel-wise outlier 분리) | KIVI, PolarQuant, Full Cache |
| 4.4 ANN search recall@1@k | GloVe d=200 (10K query), OpenAI3 d=1536/3072 (1K query), 100K DB | 2 / 4 비트 | PQ (LUT256), RaBitQ |

**2.5 / 3.5 비트의 의미**: 비트 예산은 채널을 outlier vs non-outlier 두 셋으로 나누고 각각에 다른 비트폭을 할당해 평균을 맞춘다. 예 — 2.5 비트 setup 에서는 32 outlier channel 을 3 비트로, 나머지 96 channel 을 2 비트로 양자화 → effective $(32 \times 3 + 96 \times 2)/128 = 2.5$. 이 outlier 처리 전략은 SmoothQuant (Xiao et al. 2023), RotateKV (Su et al. 2025) 등 prior work 와 일관. **키-값 비대칭 분리가 아니라 채널별 outlier 처리**다.

PQ 는 비교 fairness 를 위해 LUT256 (256-codeword) + 2비트 setup 은 4 좌표/lookup, 4비트 setup 은 2 좌표/lookup 으로 튜닝. PQ 는 학습/평가에 같은 dataset 을 쓰는 fair-but-slightly-favourable setup. RaBitQ 는 vectorize 불가로 CPU 만 돌고 claim 한 비트 비율보다 실제 사용 비트가 더 많다.

## 실험 결과

### 이론 상한과 경험적 곡선의 일치 (Section 4.1)

OpenAI3 1536-d 임베딩 100K 개에서 비트폭 $b = 1, \ldots, 5$ 별 inner-product error 와 MSE 측정.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig3-bounds.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: 비트폭 1–5 에 대한 inner-product 오차 (좌) 와 MSE (우). 측정 곡선 (TurboQuant_mse 파랑, TurboQuant_prod 보라) 과 이론 상한 (빨강 점선 √3π/2 · 4^(−b)) / 하한 (초록 점선 4^(−b)) 비교. 두 알고리즘 모두 4^(−b) rate 를 명확히 따르고 하한과의 격차가 작은 비트폭에서 더 좁다."
   zoomable=true %}

비트폭 한 단위 증가마다 error 가 4 배씩 줄어든다 (이론 그대로). Inner product 영역에서 작은 비트폭 ($b \le 2$) 에서는 TurboQuant_prod 가 TurboQuant_mse 보다 명확히 우월 — multiplicative bias 가 큰 영역. 비트폭이 커지면 두 알고리즘이 수렴.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig1-error-distribution.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: TurboQuant_prod (a) 와 TurboQuant_mse (b) 의 inner-product distortion 분포를 비트폭 b=1, 2, 3, 4 에 대해 표시. (a) prod 는 모든 비트폭에서 0 중심의 대칭 분포 (unbiased). (b) mse 는 b=1 에서 양수 쪽으로 치우친 분포 (multiplicative bias 2/π) → 비트폭 증가하며 점차 0 으로 수렴."
   zoomable=true %}

### Needle-In-A-Haystack (Section 4.2)

Llama-3.1-8B-Instruct, 문서 길이 4k–104k 토큰. Fu et al. 의 long-context data engineering setup. KV cache 25% (4× 압축).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig4-needle-haystack.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Needle-In-A-Haystack 평가 (Llama-3.1-8B-Instruct). 토큰 한도 (가로) × needle 깊이 (세로) 별 recall. SnapKV (0.858), PyramidKV (0.895) 는 컨텍스트 끝부분에서 무너지고, KIVI (0.981) 와 PolarQuant (0.995) 는 부분 실패. TurboQuant (0.997) 는 Full-Precision (0.997) 과 사실상 구분되지 않는다."
   zoomable=true %}

> TurboQuant 0.997 (Full Cache 0.997, +0.000) ≥ PolarQuant 0.995 ≫ KIVI 0.981 ≫ PyramidKV 0.895 ≫ SnapKV 0.858

흥미로운 관찰: 이론적 보장이 있는 방법들 (PolarQuant, TurboQuant) 이 토큰 제거 (SnapKV, PyramidKV) 와 보장 없는 스칼라 양자화 (KIVI) 모두를 누른다. SnapKV / PyramidKV 의 후반 컨텍스트 무너짐은 needle 위치가 잘려나가는 현상의 직접 증거.

### LongBench-E (Section 4.3)

LongBench (Bai et al. 2023) 의 length-uniform 부분집합. 17개 long-context 태스크를 6 카테고리 (SingleQA, MultiQA, Summarization, Few-shot, Synthetic, Code) 로 묶어 평균.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/tab1-longbench.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: LongBench 카테고리별 점수와 평균 (Llama-3.1-8B-Instruct, Ministral-7B-Instruct 두 모델). KV size 컬럼은 effective bits per channel."
   zoomable=true %}

Llama-3.1-8B-Instruct 평균 점수 (가장 오른쪽 열):

| Method | KV Size | Average |
|--------|---------|---------|
| Full Cache | 16 | **50.06** |
| KIVI | 5 | 50.16 |
| TurboQuant (3.5 bits) | 3.5 | **50.06** (Full 과 동률) |
| PolarQuant | 3.9 | 49.78 |
| TurboQuant (2.5 bits) | 2.5 | 49.44 |
| KIVI | 3 | 48.50 |

Ministral-7B-Instruct: Full Cache 49.89, TurboQuant 2.5비트 49.62 (−0.27).

흥미로운 사실 — KIVI 5비트가 50.16 으로 Full Cache 50.06 을 살짝 상회한다. 양자화로 정규화 효과가 일어난 것으로 보이지만 통계적 노이즈 가능성도. 어쨌든 핵심은 TurboQuant 3.5비트가 Full Cache 와 평균을 정확히 맞추면서 4.5× 이상 압축 — KV size 16 → 3.5 의 비율.

### 양자화 wall-clock (Table 2)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/tab2-quant-time.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 4-bit 양자화 wall-clock 시간 (초). d=200, 1536, 3072 세 차원에서 100K 벡터 양자화. PQ 와 RaBitQ 는 codebook 학습 / calibration 비용 포함."
   zoomable=true %}

| Approach | d=200 | d=1536 | d=3072 |
|----------|-------|--------|--------|
| Product Quantization | 37.04 | 239.75 | 494.42 |
| RaBitQ | 597.25 | 2267.59 | 3957.19 |
| TurboQuant | **0.0007** | **0.0013** | **0.0021** |

TurboQuant 은 d=3072 에서 PQ 대비 약 235,000 배, RaBitQ 대비 약 1,884,000 배 빠르다. 양자화 자체에 학습/calibration 단계가 없으니 회전 + 좌표별 lookup 만 — 사실상 GPU에서 한 번의 dense matmul.

### ANN 검색 Recall (Section 4.4)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig5-recall.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: Top-k (가로) 별 Recall@1@k (세로) — 진짜 nearest neighbor 가 top-k 후보에 포함될 비율. (a) GloVe d=200, (b) OpenAI3 d=1536, (c) OpenAI3 d=3072. 각 데이터셋에서 TurboQuant 2비트와 4비트가 같은 비트폭 PQ / RaBitQ 를 일관되게 상회."
   zoomable=true %}

Top-k = 1 (가장 빡센 설정) 에서:

- GloVe d=200, 2비트: TurboQuant ≈ 0.55, PQ ≈ 0.50, RaBitQ ≈ 0.45 (그림에서 시각적으로 읽음)
- OpenAI3 d=3072, 2비트: TurboQuant ≈ 0.91, PQ/RaBitQ ≈ 0.87

차원이 클수록 — 즉 정규근사가 더 잘 들어맞을수록 — TurboQuant 의 우위가 안정적이다. d=200 GloVe 같은 중간 차원에서도 격차가 유지된다는 점은 실용 가치 충분.

PQ 가 학습-평가 같은 데이터셋을 쓰는 inflated setup 에서도 TurboQuant 이 이긴다는 점, RaBitQ 가 claim 보다 더 많은 비트를 쓰는데도 TurboQuant 이 이긴다는 점 — 이 두 가지가 결과의 견고함을 뒷받침한다.

## 결과 분석 / Ablation

논문은 별도의 named ablation 표를 제공하지 않지만, 비트폭 sweep + 베이스라인 grid 로 어떤 컴포넌트가 결정적인지 추론할 수 있다.

**무작위 회전이 핵심.** 회전 없이 원본 좌표에 직접 양자화를 적용하면 좌표별 분포가 데이터에 따라 크게 달라져 (어떤 좌표는 분산이 크고 어떤 좌표는 거의 0) 하나의 fixed codebook 으로는 큰 distortion 을 부른다. 회전이 좌표 분포를 균질화하고 모든 좌표에 같은 codebook 을 쓸 수 있게 한다.

**잔차 1-비트 QJL 이 inner product 의 multiplicative bias 를 상쇄.** Figure 1(b) 에서 TurboQuant_mse 의 b=1 분포가 양수 쪽으로 명백히 치우친 것을 직접 볼 수 있다 — bias $2/\pi$ 의 시각화. Figure 1(a) 에서 TurboQuant_prod 는 같은 비트폭에서 0 중심 대칭 분포 — QJL 의 unbiasedness 가 실제로 작동.

**Variance constancy 가 ANN recall 의 결정타.** Figure 2 에서 TurboQuant_prod 분산이 평균 IP 0.01 → 0.17 까지 변해도 일정. PQ 같은 codebook lookup 방법은 IP 가 작은 영역에서 분산이 더 커진다 (codebook lookup 의 본질적 한계). TurboQuant_prod 의 비대칭 1-비트 잔차 양자화가 inner product 의 절대크기와 무관하게 분산을 일정하게 유지한다.

**가우시안 근사가 잘 들어맞을수록 하한과의 격차가 줄어든다.** $b = 1$ 에서 격차 1.45 배, 일반 영역에서 약 2.7 배. $d$ 가 더 커지면 격차도 줄어든다 — Figure 3 에서 d=1536 결과가 이미 이론 상한에 거의 닿아 있다.

**Outlier channel 분리가 비정수 비트폭의 비결.** 2.5 비트 = 3 비트 outlier + 2 비트 일반. 이 전략은 SmoothQuant, RotateKV 등 prior work 와 일관. TurboQuant 도 이 관행을 따르되, codebook 학습이 필요한 다른 방법들과 달리 비트 예산을 자유롭게 변경해도 즉시 동작.

**Entropy encoding 은 추가 5% 압축이지만 단순성을 위해 미사용.** $b=4$ 일 때 codebook index 분포의 엔트로피가 약 3.8 — 4 비트 평균 → 3.8 비트로 lossless 압축 가능. 본 논문은 simplicity / speed 를 위해 적용하지 않음.

## 한계와 비판적 평가

**저자가 인정한 한계:**

- 정보이론 하한과의 약 2.7 배 상수 격차 (작은 비트폭 1.45 배). 가우시안 근사가 완벽하지 않은 데서 오는 본질적 갭.
- 단위 노름 가정이 만족하지 않는 데이터는 별도 floating-point norm 저장 필요 (작지만 추가 오버헤드).

**리뷰어 입장에서 추가로 보이는 한계:**

- **무작위 회전 비용의 명시적 측정 부재.** Table 2 의 wall-clock 은 TurboQuant 0.0021초 (d=3072) 인데, 회전 자체 ($O(d^2)$ dense matmul) 와 좌표별 lookup 의 분해된 측정이 없다. fast-JL (SRHT) 로 $O(d \log d)$ 까지 줄일 수 있지만 본 논문은 정직한 dense 회전을 분석하므로 이론적 보장과 실용 구현 사이 갭이 있을 수 있다.
- **비교 베이스라인이 KV cache 양자화 영역에 집중.** H2O, StreamingLLM, Quest 같은 sparse-attention 방법, GPTQ / AWQ 같은 weight 양자화 방법, hybrid 방법 (양자화 + 토큰 제거) 등과의 직접 비교가 빠져 있다.
- **Ministral-7B-Instruct 비교의 부분성.** Table 1 에서 Ministral 행에는 Full Cache 와 TurboQuant 2.5비트 두 줄만 있고 KIVI/PolarQuant/SnapKV 점수가 빠져 있다 — 다른 베이스라인과의 비교를 더 보고 싶다.
- **이론 상한의 가정 — uniform random orthogonal.** 이는 i.i.d. Normal + QR 로 정직하게 만들어지지만 실용에서는 SRHT 같은 pseudo-random 변환을 쓰는 것이 더 효율적일 텐데, 그 경우 통계적 보장이 정확히 같은지에 대한 정량 분석이 부족.
- **공식 코드 미공개.** 논문 작성 시점 기준 GitHub repo 가 없어 재현 검증이 어렵다.
- **그래디언트 압축 응용 미실험.** TurboQuant 의 online 특성은 분산 학습의 그래디언트 압축에서도 매력적인데 (calibration 없이 즉시 동작) 이 방향 평가가 빠져 있다.

## 시사점 / Takeaways

- **무작위 회전 + 베타 분포에 대한 미리 계산된 codebook** 으로도 정보이론 하한 근처에 닿는다. "고차원에서 분포가 베타 (≈ 가우시안) 에 집중된다" 는 사실 하나로 거의 모든 분석이 닫힌다 — 데이터 의존 학습이 절대 필요해 보이는 작업도 분포 가정을 잘 잡으면 training-free 로 풀린다.
- **inner product 보존의 핵심은 multiplicative bias 제거 + 분산 항상성.** $(b-1)$ 비트 MSE + 1-비트 QJL 잔차 분해가 두 문제를 동시에 푼다. 이 두 단계 분해는 다른 양자화기에도 일반적으로 적용 가능한 메타 패턴이다.
- **Theorem 1, 2, 3 의 상한 + 하한 동시 제시가 결과의 정량 무게를 만든다.** "near-optimal" 이 단순 표현이 아니라 "Shannon 하한과 약 2.7배 이내" 라는 구체적 비교 가능 수치 — 후속 연구가 이 격차를 줄이는 방향으로 진전시킬 수 있다.
- **양자화 wall-clock 이 사실상 0 이라는 점이 KV cache 응용에서 결정적.** PQ 대비 두 자릿수, RaBitQ 대비 세 자릿수 빠른 양자화는 토큰당 양자화가 일어나는 streaming 환경에서 "viable vs irrelevant" 의 차이.
- **codebook-free 가 단순히 빠른 정도가 아니라 운영 안정성에 결정적.** 분포 드리프트, 비트 예산 변경, 모델 교체에 즉시 적응 — 실제 deploy 환경에서의 가장 큰 차별점이다.

## 참고 자료

- 논문: [arXiv:2504.19874](https://arxiv.org/abs/2504.19874)
- 저자 그룹의 직전 / 관련 KV cache 작업: QJL (AAAI 2025), PolarQuant (Han et al., 2025) — 본 논문에서도 베이스라인으로 등장

## 더 읽어보기

- **[QJL: 1-Bit Quantized JL Transform for KV Cache Quantization with Zero Overhead](https://arxiv.org/abs/2406.03482)** (Zandieh et al., AAAI 2025) — TurboQuant_prod 의 잔차 1-비트 양자화가 직접 차용한 비대칭 sign-bit estimator. 본 논문 reference [62].
- **[RaBitQ: Quantizing High-Dimensional Vectors with a Theoretical Error Bound for Approximate Nearest Neighbor Search](https://arxiv.org/abs/2405.12497)** (Gao et al., SIGMOD 2024) — 무작위 회전 후 1-비트 부호 양자화로 ANN 의 이론적 오차 상한을 처음 제시한 직전 연구.
- **[KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache](https://arxiv.org/abs/2402.02750)** (Liu et al., ICML 2024) — 키 채널별 / 값 토큰별 비대칭 양자화로 KV cache 를 2비트까지 줄인 baseline. Table 1 에서 직접 비교.
- **[PolarQuant: Quantizing KV Caches with Polar Transformation](https://arxiv.org/abs/2502.02617)** (Han et al., 2025) — 본 논문 저자 그룹의 직전 KV cache 양자화 연구. 극좌표 변환 후 각도를 양자화. Table 1 에서 직접 비교.
- **[SnapKV: LLM Knows What You are Looking for Before Generation](https://arxiv.org/abs/2404.14469)** (Li et al., NeurIPS 2024) — 양자화가 아닌 토큰 제거로 KV cache 를 줄이는 직교적 접근.
- **[PyramidKV: Dynamic KV Cache Compression based on Pyramidal Information Funneling](https://arxiv.org/abs/2406.02069)** (Cai et al., 2024) — 레이어별 KV 예산을 비대칭으로 분배해 압축률을 높이는 추가 차원의 베이스라인.

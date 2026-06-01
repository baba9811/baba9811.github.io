---
layout: post
title: "[논문 리뷰] Robust Uplift Modeling with Large-Scale Contexts for Real-time Marketing"
date: 2026-06-01 16:00:00 +0900
description: "대규모 컨텍스트(짧은 영상 등)가 만드는 분포 변화와 분산 폭증을 response-guided 컨텍스트 그룹핑과 feature interaction으로 해결하는 model-agnostic uplift 프레임워크 UMLC (KDD 2025) 리뷰"
tags: ["uplift-modeling", "causal-inference", "treatment-effect", "real-time-marketing", "recommender-systems", "representation-learning"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/fig2-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/
en_url: /en/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/
---

{% include lang_toggle.html %}

#### 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Zexu Sun et al. (저자 6명, Renmin Univ. · Zhejiang Univ. · Shenzhen Univ. · Kuaishou · CityU HK) |
| 학회 | KDD (ACM SIGKDD) · 2025 · Toronto |
| arXiv 또는 DOI | [arXiv:2502.15697](https://arxiv.org/abs/2502.15697) · [10.1145/3690624.3709293](https://doi.org/10.1145/3690624.3709293) |
| Code | [ZexuSun/UMLC](https://github.com/ZexuSun/UMLC) |
| 데이터 | Synthetic (시뮬레이션 RCT, 컨텍스트 6그룹) · Production (대형 short-video 플랫폼 1주 무작위 실험, 각 군 ~40만 샘플) |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-06-01 |

#### TL;DR

- 온라인 플랫폼에서 incentive(할인·보너스)를 누구에게 줄지 고르는 uplift modeling은 보통 **사용자 특징만** 본다. 하지만 short-video·뉴스 같은 환경에서는 사용자가 마주하는 **컨텍스트(어떤 영상을 보는가)** 가 응답을 크게 좌우한다. 컨텍스트를 그대로 붙이면 (1) 처치군·대조군 사이에 **분포 변화 (distribution shift)** 가 생기고 (2) 한 사용자가 수많은 컨텍스트를 만나면서 <strong>분산이 폭증</strong>한다.
- 저자들은 **UMLC** (Robust Uplift Modeling with Large-Scale Contexts)를 제안한다. 두 모듈로 구성된다 — ① **response-guided context grouping**: 응답을 예측하도록 Lipschitz 정규화로 학습한 컨텍스트 임베딩을 클러스터링해 컨텍스트를 소수의 그룹으로 압축, ② **feature interaction**: 사용자-컨텍스트 co-attention과 treatment-feature cross-attention으로 응답·uplift를 더 잘 예측.
- UMLC는 base uplift model(CFRNet, DragonNet, EUEN, UniTE 등)을 감싸는 <strong>model-agnostic 프레임워크</strong>다. Synthetic·Production 두 데이터셋에서 AUUC·QINI를 일관되게 끌어올린다 (예: Production AUUC 1.80 → 2.21). 흥미롭게도 분포 변화 아래에서는 단순한 S-Learner/T-Learner가 화려한 baseline들을 앞서며, 컨텍스트 그룹핑(RCG)을 빼면 성능이 가장 크게 무너진다.

#### 소개 (Introduction)

온라인 플랫폼은 사용자 참여와 매출을 끌어올리기 위해 특정 **incentive** — 할인, 보너스, 쿠폰 — 를 제공한다. 그런데 같은 incentive라도 사용자마다 반응이 다르다. 어떤 사용자는 할인을 줘야만 구매하고(persuadable), 어떤 사용자는 할인을 안 줘도 구매하며(sure thing), 어떤 사용자는 할인을 주면 오히려 이탈한다(do-not-disturb). incentive에 민감한 그룹을 찾아 그들에게만 incentive를 전달하는 것이 핵심이다. 이를 정량화하는 것이 <strong>uplift modeling</strong>이며, 처치(treatment)가 응답에 미치는 개별 효과 — individual treatment effect (ITE), 또는 uplift — 를 추정한다.

기존 uplift modeling은 거의 전부 **사용자 특징 $\mathbf{x}^u$** 만 입력으로 본다. 하지만 실제 플랫폼을 떠올려 보자. short-video 플랫폼에서 사용자는 하루에도 수십~수백 개의 서로 다른 영상을 본다. 같은 사용자라도 어떤 영상(컨텍스트)을 보고 있느냐에 따라 incentive에 대한 반응이 완전히 달라진다. 즉 모델은 "사용자 × 특정 아이템"이라는 **(사용자, 컨텍스트) 쌍마다** incentive를 추론해야 한다. 저자들은 이 문제를 <strong>real-time marketing</strong>으로 정의한다. 컨텍스트 특징 $\mathbf{x}^c$ 가 추가된 uplift 문제다.

여기서 두 가지 어려움이 생긴다. 첫째, **분포 변화 (distribution shift)** 다. Randomized Control Trial (RCT)은 처치를 사용자에게 무작위로 배정해 처치군·대조군의 사용자 특징 분포를 맞춘다. 그러나 컨텍스트는 **통제할 수 없다** — 사용자가 어떤 영상을 볼지는 추천 시스템과 사용자 행동이 정하지, 실험자가 정하지 않는다. 사용자 특징과 컨텍스트 특징을 그대로 이어 붙이면(concatenate), 결합 공간에서 처치군·대조군 분포가 어긋난다. 둘째, <strong>feature interaction</strong>이다. 사용자 특징과 컨텍스트 특징 사이의 상호작용을 모델링하면 응답 예측이 좋아지지만, 기존 uplift 연구는 이를 충분히 다루지 않았다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/fig1-distribution-shift.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: (a) 표준 RCT에서는 처치·대조 샘플의 특징 분포가 겹친다. (b) 통제 불가능한 컨텍스트를 함께 고려하면 두 군의 분포가 어긋나는 distribution shift가 발생한다."
   zoomable=true %}

이 논문은 ML/AI 전반은 익숙하지만 인과추론·uplift라는 하위 분야는 처음인 독자에게도 잘 맞는다. uplift는 추천 시스템·광고·CRM에서 "누구에게 개입할 것인가"를 데이터로 답하는, 실무 가치가 매우 큰 도구다. 특히 저자 중 한 명이 Kuaishou(중국의 대형 short-video 플랫폼) 소속이고 Production 데이터셋이 실제 short-video 플랫폼의 1주일 무작위 실험에서 나왔다는 점에서, 이 논문은 학술적 형식 안에 실무 문제의식을 담고 있다.

#### 핵심 기여 (Key Contributions)

- **Real-time marketing 문제의 정식화.** 사용자 특징만이 아니라 대규모 컨텍스트를 함께 고려해 (사용자, 컨텍스트) 쌍마다 uplift를 추정하는 문제를 정의하고, 그때 발생하는 분포 변화와 분산 폭증을 명시적으로 짚는다.
- **Response-guided context grouping (RCG) 모듈.** 컨텍스트를 응답 기준으로 학습한 임베딩 공간에서 클러스터링해 소수의 그룹으로 압축한다. 이로써 컨텍스트 값 공간을 줄여 분산을 낮추고 처치·대조 군의 분포 차이를 완화한다. Lipschitz 정규화로 "임베딩 거리 ≈ 응답 거리"가 되도록 만든 것이 이론적 핵심이다.
- **Feature interaction 모듈.** 사용자-컨텍스트 상호작용을 parallel co-attention으로, 처치-특징 상호작용을 cross-attention으로 모델링한다. 후자는 처치 배정에 민감한 특징을 찾아내고, 그 information gain을 샘플 가중치로 활용한다.
- **Model-agnostic 일반 프레임워크.** UMLC는 특정 base uplift model에 묶이지 않는다. CFRNet, DragonNet, EUEN, UniTE 등 여섯 가지 base model을 감싸 일관된 성능 향상을 보여, 범용 플러그인으로 작동함을 실증한다.

#### 관련 연구 / 배경 지식

**Uplift / 처치 효과 추정의 큰 줄기.** uplift modeling은 크게 두 갈래다. (1) **Machine-learning 기반** — meta-learner(S-Learner, T-Learner; 하나/둘의 base learner로 처치·대조 응답을 따로 학습)와 tree 기반(Uplift Tree, Causal Forest)이 있다. (2) **Representation-learning 기반** — 딥러닝으로 사용자 특징을 잠재 공간에 투영해 처치·대조 응답을 예측한다. 대표적으로 TARNet/CFRNet은 공유 인코더로 특징을 추출하고 Integral Probability Metric (IPM, 예: MMD·Wasserstein)으로 처치·대조 표현 분포를 맞춘다(balancing). 이 논문은 산업 시나리오에 유연하게 적용하기 좋다는 이유로 representation-learning 계열에 초점을 둔다.

**왜 기존 방법으로 부족한가.** CFRNet 류의 balancing이나 샘플 매칭은 <strong>컨텍스트의 고유한 영향을 무시</strong>한다. 한 사용자가 하루에 수많은 영상을 보는 상황에서 컨텍스트 특징을 그대로 이어 붙이면, 비슷한 컨텍스트가 서로 다른 라벨을 갖는 **variance inflation(분산 폭증)** 이 생겨 예측이 불안정해진다. 그래서 이 논문은 "컨텍스트를 잠재 공간에서 balancing"하는 대신 "컨텍스트를 응답 기준으로 묶어 소수의 proxy 그룹으로 압축"하는 새로운 길을 택한다.

**기본 표기 (Neyman-Rubin potential outcome).** 관측 데이터셋은 $\mathcal{D} = \{\mathbf{x}\_i^u, \mathbf{x}\_i^c, t\_i, y\_i\}\_{i=1}^n$ 이다. $\mathbf{x}^u \in \mathbb{R}^p$ 는 사용자 특징, $\mathbf{x}^c \in \mathbb{R}^q$ 는 컨텍스트 특징, $t \in \{0,1\}$ 는 처치 지시변수(incentive 전달 여부), $y \in \mathbb{R}$ 는 연속 응답이다. 개별 uplift는 처치·대조 응답의 차이로 정의된다.

$$
\tau_i = y_i(1) - y_i(0)
$$

문제는 한 사용자에 대해 처치·대조 응답 중 **하나만** 관측된다는 것이다(반사실, counterfactual). 관측 응답은 다음과 같다.

$$
y_i = t_i\, y_i(1) + (1 - t_i)\, y_i(0)
$$

따라서 uplift는 직접 식별되지 않고, 적절한 가정 아래 **conditional average treatment effect (CATE)** 로 추정한다.

$$
\begin{aligned}
\tau(\mathbf{x}) &= \mathbb{E}[Y(1)\mid \mathbf{X}=\mathbf{x}] - \mathbb{E}[Y(0)\mid \mathbf{X}=\mathbf{x}] \\
&= \underbrace{\mathbb{E}[Y\mid T=1, \mathbf{X}=\mathbf{x}]}_{\mu_1(\mathbf{x})} - \underbrace{\mathbb{E}[Y\mid T=0, \mathbf{X}=\mathbf{x}]}_{\mu_0(\mathbf{x})}
\end{aligned}
$$

여기서 $\mathbf{x} = [\mathbf{x}^u, \mathbf{x}^c]$ 는 사용자·컨텍스트 특징의 concatenation이다. 직관적으로 uplift는 두 조건부 평균의 차 $\mu\_1(\mathbf{x}) - \mu\_0(\mathbf{x})$ 다.

#### 방법 / 아키텍처 상세

UMLC는 두 모듈로 이뤄진다. 왼쪽의 <strong>response-guided context grouping</strong>이 대규모 컨텍스트를 소수의 그룹으로 압축하고, 오른쪽의 <strong>feature interaction</strong>이 그 위에서 사용자-컨텍스트·처치-특징 상호작용을 모델링해 응답과 uplift를 예측한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/fig2-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: UMLC 전체 구조. 왼쪽 — 컨텍스트 임베딩을 Lipschitz 정규화로 학습한 뒤 클러스터링해 그룹 g로 relabel(response-guided context grouping). 오른쪽 — 사용자·그룹·처치 임베딩에 co-attention(user-context)과 cross-attention(treatment-feature)을 적용해 control response μ₀와 uplift를 예측(feature interaction)."
   zoomable=true %}

### 1단계: Response-guided Context Grouping

**동기.** 컨텍스트를 discrete 그룹으로 묶어 proxy 컨텍스트로 쓰면 분산을 줄일 수 있다. 단, 한 그룹에 응답 영향이 완전히 다른 컨텍스트가 섞이면 오히려 bias가 생긴다. 따라서 **"같은 그룹에 묶인 컨텍스트는 응답에 비슷한 영향을 줘야 한다"** 가 핵심 조건이다. 이를 두 가정과 한 명제로 formalize한다.

각 컨텍스트 $\mathbf{x}^c$ 에 그룹 변수 $g \in \{0, 1, \dots, K-1\}$ 를 대응시키고, $\mathbf{g}$ 를 one-hot으로 본다.

**Assumption 1 (그룹 내 응답 유사성).** 응답은 $y = h(\mathbf{x}^u, \mathbf{x}^c, t) + \epsilon$ 형태이고 $\|h(\mathbf{x}^u, \mathbf{x}^c, t)\| \le B\_h$, $\epsilon$ 은 평균 0 잡음이라 가정한다. 같은 그룹으로 묶이는 임의의 컨텍스트 쌍 $(\mathbf{x}\_i^c, \mathbf{x}\_j^c)$ — 즉 $\mathbb{P}(\mathbf{g}\mid \mathbf{x}\_i^c) = \mathbb{P}(\mathbf{g}\mid \mathbf{x}\_j^c)$ — 에 대해

$$
\left|\, \mathbb{E}[y \mid \mathbf{x}^u, \mathbf{x}_i^c, t] - \mathbb{E}[y \mid \mathbf{x}^u, \mathbf{x}_j^c, t] \,\right| \le \delta, \quad \forall\, \mathbf{x}^u, t,\ i \neq j
$$

가 성립한다. $\delta$ 는 $B\_h$ 보다 작은 상수다. 즉 같은 그룹 안에서는 컨텍스트를 바꿔도 기대 응답이 $\delta$ 이내로만 변한다.

**Assumption 2 (Lipschitz 변환 존재).** 다음을 만족하는 변환 함수 $\xi$ 가 존재한다고 가정한다.

$$
\left|\, h(\mathbf{x}^u, \mathbf{x}_i^c, t) - h(\mathbf{x}^u, \mathbf{x}_j^c, t) \,\right| \le \zeta \, \|\xi(\mathbf{x}_i^c) - \xi(\mathbf{x}_j^c)\|_2 + \eta
$$

$\zeta, \eta$ 는 상수다. $\eta$ 가 작은 $\xi$ 를 찾으면, 컨텍스트 임베딩 $\xi(\mathbf{x}^c)$ 위에서 Euclidean 거리로 클러스터링할 수 있다. 클러스터 내 임베딩 최대 거리를 작은 상수 $\kappa$ 로 통제하면, 그룹 내 응답 차이도 $\delta \le \zeta \cdot \kappa + \eta$ 로 작아진다. <strong>임베딩 공간의 거리가 응답 공간의 거리를 대신하게 만드는 것</strong>이 이 가정의 목적이다.

**Proposition 1.** 컨텍스트에 Lipschitz 제약을 둔 예측 함수 $f$ 와 변환 함수 $\xi$ 를 찾아 다음 두 조건을 만족시킬 수 있다면,

$$
\begin{aligned}
&|h(\mathbf{x}^u, \mathbf{x}^c, t) - f(\mathbf{x}^u, \xi(\mathbf{x}^c), t)| \le \mu, \\
&|f(\mathbf{x}^u, \xi(\mathbf{x}_i^c), t) - f(\mathbf{x}^u, \xi(\mathbf{x}_j^c), t)| \le c\, \|\xi(\mathbf{x}_i^c) - \xi(\mathbf{x}_j^c)\|_2
\end{aligned}
$$

변환 $\xi$ 는 $\zeta = c$, $\eta = 2\mu$ 로 Assumption 2를 만족한다. (증명은 부록 A의 삼각부등식.) 즉 **"응답을 잘 예측하면서 $f$ 가 컨텍스트에 대해 Lipschitz 연속"** 이도록 $\xi$ 와 $f$ 를 학습하면, 임베딩 클러스터링이 곧 응답-유사 그룹핑이 된다.

**구현 — 응답 예측.** 컨텍스트 특징은 범주형·수치형 임베딩으로 변환해 $\xi\_\theta(\mathbf{x}^c)$ 를 만든다($\theta$ 는 학습 파라미터). 이를 사용자 특징·처치와 이어 붙여 회귀 모델 $f$ 에 넣고 응답을 예측한다. 예측 손실은 MSE다.

$$
\mathcal{L}_{\text{pred}} = \mathcal{L}\big(f(\mathbf{x}^u, \xi_\theta(\mathbf{x}^c), t),\ y\big)
$$

**구현 — Lipschitz 정규화.** $f$ 가 입력 $z = (\mathbf{x}^u, \xi(\mathbf{x}^c), t)$ 에 대해 $c$-Lipschitz, 즉 $\|f(z\_i) - f(z\_j)\| \le c\,\lVert z\_i - z\_j \rVert\_2$ 이도록 한다. 각 레이어의 가중치 행렬로 레이어별 Lipschitz 상한 $c\_i$ 를 추정하고, 다음 정규화를 더한다.

$$
\mathcal{L}_{\text{Lip}} = \prod_{i=1}^{l} \text{softplus}(c_i)
$$

여기서 $\text{softplus}(c\_i) = \ln(1 + e^{c\_i})$ 는 Lipschitz 상수가 음수로 추정되는 것을 막는 reparameterization이고, $l$ 은 레이어 수다. 컨텍스트 임베딩 학습의 최종 손실은 다음과 같다.

$$
\mathcal{L}_{\text{reg}} = \mathcal{L}_{\text{pred}} + \alpha\, \mathcal{L}_{\text{Lip}}
$$

trade-off 계수는 선행 연구를 따라 $\alpha = 10^{-4}$ 로 둔다.

**그룹핑과 aggregation.** 학습된 임베딩에 K-means를 적용해 각 $\xi\_\theta(\mathbf{x}^c)$ 를 그룹 $g$ 에 배정한다($\mathcal{F}: \xi\_\theta(\mathbf{x}^c) \mapsto g$, 그룹 수 $K$ 는 하이퍼파라미터). 안정성·정확도를 높이려고, **사용자 특징·그룹·처치가 모두 같은** 샘플들의 응답을 평균해 하나의 샘플로 합친다.

$$
\bar{y} = \frac{y_i + y_j}{2}, \quad \forall\, \mathbf{x}_i^u = \mathbf{x}_j^u,\ g_i = g_j,\ t_i = t_j
$$

이렇게 relabel한 데이터셋 $\mathcal{D}\_r = \{\mathbf{x}\_i^u, g\_i, t\_i, \bar{y}\}\_{i=1}^m$ 을 이후 uplift 예측에 쓴다.

### 2단계: Feature Interaction — User-Context Interaction (UCI)

real-time marketing에서는 컨텍스트가 사용자 행동에 직접 영향을 준다. 최근 SOTA는 사용자·컨텍스트 관계를 텐서로 표현하지만, 텐서는 여러 컨텍스트 요인의 효과를 분리하기 어렵다. 그래서 저자들은 VQA에서 온 <strong>parallel co-attention</strong>을 차용해 사용자 임베딩 $\mathbf{e}\_u$ 와 그룹 컨텍스트 임베딩 $\mathbf{e}\_c$ 의 상호작용을 모델링한다. 먼저 affinity matrix를 계산한다.

$$
\mathbf{L} = \tanh\big(\mathbf{e}_u^{\top}\, \mathbf{W}_L\, \mathbf{e}_c\big)
$$

이 affinity를 feature로 삼아 사용자·컨텍스트 attention map을 학습한다.

$$
\begin{aligned}
\mathbf{H}_u &= \tanh\big(\mathbf{W}_u \mathbf{e}_u + (\mathbf{W}_c \mathbf{e}_c)\, \mathbf{L}\big), \\
\mathbf{H}_c &= \tanh\big(\mathbf{W}_c \mathbf{e}_c + (\mathbf{W}_u \mathbf{e}_u)\, \mathbf{L}^{\top}\big)
\end{aligned}
$$

affinity $\mathbf{L}$ 이 컨텍스트 attention 공간을 사용자 attention 공간으로(그 전치는 반대로) 옮겨 준다. 정규화된 attention 가중치와 attention 벡터는 다음과 같다.

$$
\begin{aligned}
\mathbf{a}_u &= \text{softmax}(\mathbf{W}_{hu}^{\top}\, \mathbf{H}_u), \quad \mathbf{a}_c = \text{softmax}(\mathbf{W}_{hc}^{\top}\, \mathbf{H}_c), \\
\hat{\mathbf{e}}_u &= \mathbf{a}_u \ast \mathbf{e}_u, \quad \hat{\mathbf{e}}_c = \mathbf{a}_c \ast \mathbf{e}_c
\end{aligned}
$$

$\ast$ 는 임베딩의 각 원소에 attention 벡터를 곱해 합하는 연산이다. 마지막으로 MLP로 **control response** $\mu\_0$ 를 예측한다.

$$
\mu_0 = \text{MLP}(\hat{\mathbf{e}}_u, \hat{\mathbf{e}}_c)
$$

### 3단계: Feature Interaction — Treatment-Feature Interaction (TFI)

사용자·컨텍스트 특징의 concatenation 중 <strong>처치 배정에 민감한 특징</strong>을 찾기 위해, 처치 임베딩과 특징 임베딩 사이에 cross-attention을 둔다. $\hat{\mathbf{e}}\_u, \hat{\mathbf{e}}\_c$ 를 이어 붙인 것을 $\hat{\mathbf{e}}\_f$, 처치 임베딩을 $\mathbf{e}\_t$ 라 하면 attention 가중치는

$$
\mathbf{a}_t = \text{softmax}\!\left( \frac{(\mathbf{W}_t \mathbf{e}_t)(\mathbf{W}_f \hat{\mathbf{e}}_f)^{\top}}{\sqrt{K_d}} \right)
$$

이다($K\_d$ 는 출력 임베딩 차원). 처치 변화를 시뮬레이션하려고 $t=0$ 임베딩 $\mathbf{e}\_t^0$, $t=1$ 임베딩 $\mathbf{e}\_t^1$ 로 각각 $\mathbf{a}\_t^0, \mathbf{a}\_t^1$ 을 구한다. 처치 배정이 특징 표현에 주는 <strong>information gain</strong>은 두 결과의 차다.

$$
\hat{\mathbf{e}}_\Delta = \mathbf{a}_t^1 \ast \hat{\mathbf{e}}_f - \mathbf{a}_t^0 \ast \hat{\mathbf{e}}_f
$$

$\hat{\mathbf{e}}\_\Delta$ 는 "처치를 켜고 끄는 것이 특징 표현을 얼마나 바꾸는가"를 담는다. 이를 써서 information gain이 있을 때·없을 때의 uplift를 각각 예측한다.

$$
\hat{\tau} = \text{MLP}(\hat{\mathbf{e}}_f), \quad \tilde{\tau} = \text{MLP}(\hat{\mathbf{e}}_\Delta + \hat{\mathbf{e}}_f)
$$

#### 학습 목표 / 손실 함수

TFI의 핵심 아이디어는 두 예측의 차 $\tilde{\tau} - \hat{\tau}$ 를 <strong>샘플 중요도</strong>로 바꾸는 것이다. information gain이 큰(처치에 민감한) 샘플일수록 큰 가중치를 받는다.

$$
w_{\text{batch}} = \frac{\exp(\tilde{\tau} - \hat{\tau})}{\sum_{\text{batch}} \exp(\tilde{\tau} - \hat{\tau})}
$$

최종 uplift 손실은 control/treatment 응답 회귀에 이 가중치를 곱하고, information gain의 크기 $\lVert \hat{\mathbf{e}}\_\Delta \rVert\_F^2$ 를 **최대화**(손실에서 빼서)하도록 구성된다.

$$
\begin{aligned}
\mathcal{L}_{\text{uplift}} = \; & w_{\text{batch}} \cdot \Big( (1-t)\, \mathcal{L}(\mu_0, \bar{y}) + t\,\big( \mathcal{L}(\mu_1, \bar{y}) + \beta\, \mathcal{L}(\tilde{\mu}_1, \bar{y}) \big) \Big) \\
& - \gamma \, \|\hat{\mathbf{e}}_\Delta\|_F^2
\end{aligned}
$$

여기서 $\mu\_1 = \mu\_0 + \hat{\tau}$ 는 예측 처치 응답, $\tilde{\mu}\_1 = \mu\_0 + \tilde{\tau}$ 는 treatment-feature interaction을 반영한 예측 처치 응답이다. $\beta, \gamma$ 는 trade-off 하이퍼파라미터다. 각 항을 풀어 보면 — 대조 샘플($t=0$)은 $\mu\_0$ 회귀로, 처치 샘플($t=1$)은 $\mu\_1$ 회귀에 더해 information gain을 반영한 $\tilde{\mu}\_1$ 회귀로 학습되며, 마지막 $-\gamma \lVert \hat{\mathbf{e}}\_\Delta \rVert\_F^2$ 항이 처치-민감 특징을 적극적으로 끌어낸다. 전체 학습 절차는 ① 컨텍스트 임베딩 학습($\mathcal{L}\_{\text{reg}}$) → ② K-means 그룹핑·aggregation → ③ co-attention/cross-attention으로 응답·uplift 예측($\mathcal{L}\_{\text{uplift}}$) 순으로 진행된다.

#### 학습 데이터와 파이프라인

| 항목 | Synthetic | Production |
|------|-----------|------------|
| 사용자 특징 수 | 100 (binary 34 + 연속 66) | 66 |
| 컨텍스트 특징 수 | 103 (binary 34 + 연속 66 + 범주형 3) | 109 |
| 처치 샘플 수 | 236,421 | 397,943 |
| 대조 샘플 수 | 236,116 | 397,852 |
| 컨텍스트 그룹 수 | 6 (설계상 알려짐) | 미상 (~20까지 안정) |
| split | \-- | train/val/test = 70/20/10 |

**Synthetic 데이터셋.** 복잡한 실세계를 모사하도록 설계했다. (1) 사용자·컨텍스트 특징은 처치와 독립으로 생성해 RCT를 흉내 낸다. (2) 사용자마다 컨텍스트 풀에서 무작위로 60~130개를 골라 결합한다 — **한 사용자가 다수 컨텍스트와 연결되는 one-to-many** 구조다. (3) 처치·대조 군 응답이 모두 **long-tail** 분포를 갖는다. (4) Assumption 1에 따라 컨텍스트를 응답 영향 기준 6개 그룹으로 나눈다. 응답 생성식에서 그룹별로 서로 다른 Gaussian $z\_0$ 가 더해지는 것이 6개 그룹을 만드는 장치다.

$$
\begin{aligned}
y^0 = \;& 0.5\sum_{i=1}^{p} x_i^u + 0.5\sum_{j=1}^{q_b+q_c} x_j^c + 0.5\sum_{j=1}^{q_b+q_c}\sum_{i=1}^{p} x_i^u x_j^c \\
& + 0.5\sum_{v=q_b+q_c+1}^{q_b+q_c+q_m} x_v^c + z_0 + \epsilon_0
\end{aligned}
$$

$z\_0$ 는 컨텍스트가 속한 그룹에 따라 여섯 분포 $\{\mathcal{N}(0,1), \mathcal{N}(2,0.5), \mathcal{N}(-1,2), \mathcal{N}(3,1.5), \mathcal{N}(-2,0.8), \mathcal{N}(1,2)\}$ 중 하나에서 뽑힌다. 처치 응답 $y^1$ 은 같은 구조의 항들을 계수 $0.2$ 로 더하고 그룹별 잡음 $z\_1$ 과 $\epsilon\_1$ 을 추가해 만든다 — 즉 사용자·컨텍스트·상호작용 항이 처치 효과에도 다시 기여한다.

**Production 데이터셋.** 중국의 대형 short-video 플랫폼 실데이터다. 영상의 **선명도(clarity)** 가 사용자 경험 지표이며, 선명도가 떨어지면 재생 시간이 줄어든다. 1주일 무작위 실험에서 고선명 영상($t=1$)을 처치군에, 저선명 영상($t=0$)을 대조군에 제공하고 한 주간 총 시청 시간을 측정해 선명도 저하가 사용자 경험에 주는 영향을 정량화했다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/fig3-production-dataset.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Production 데이터셋 예시. t가 0(저선명)에서 1(고선명)로 갈수록 같은 영상의 화질이 좋아진다. 처치 = 고선명 제공, 응답 = 주간 시청 시간."
   zoomable=true %}

**구현 디테일.** PyTorch 1.10, Adam, 최대 50 iteration, early stopping patience 5. 하이퍼파라미터는 Optuna로 탐색하되 **QINI를 목적으로** 튜닝했다. 평가지표는 AUUC (Area Under Uplift Curve), QINI (Qini Coefficient), KENDALL (Kendall's Rank Correlation)이며, synthetic에서는 반사실을 알 수 있어 $\epsilon\_{\text{ATE}}$ (평균 처치 효과 오차)와 $\epsilon\_{\text{PEHE}}$ (이질적 효과 추정 정밀도)도 측정한다. 하드웨어는 NVIDIA A40 + Intel Xeon 5318Y.

#### 실험 결과

연구 질문은 세 가지다. **RQ1** UMLC가 baseline을 능가하는가, **RQ2** 각 모듈의 기여는, **RQ3** 그룹 수 $K$ 의 영향은. baseline은 S-Learner, T-Learner, TARNet, CFRNet(mmd/wass), DragonNet, EUEN, UniTE다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/tab1-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Synthetic·Production 데이터셋 전체 비교 (5개 시드 평균). 위쪽 8행이 baseline, 아래쪽 5행이 UMLC로 감싼 버전. 최고 성능은 굵게, 차순위는 밑줄."
   zoomable=true %}

### RQ1 — 전체 성능

핵심 관찰은 세 가지다.

- **단순 meta-learner가 의외로 강하다.** Synthetic·Production 모두에서 S-Learner·T-Learner가 baseline 중 가장 경쟁력 있는 축이다. 표현 balancing(CFRNet)이나 target regularization(DragonNet) 같은 복잡한 구조가 오히려 손해를 본다 — 대규모 컨텍스트가 만드는 심한 분포 변화 아래에서는, 전용 설계 없이 복잡하기만 한 모델이 단순한 S/T-Learner보다 못할 수 있다는 뜻이다. 실제로 Production AUUC에서 T-Learner(1.8007)가 DragonNet(1.3581)·EUEN(1.2506)·UniTE(1.3092)를 크게 앞선다.
- **UMLC로 감싸면 일관되게 좋아진다.** 특히 튜닝 목적이었던 QINI와 AUUC에서 향상이 두드러진다. 최고 조합은 **UMLC (CFRNet-mmd)** 로, Synthetic AUUC 0.3149 (baseline 최고 DragonNet 0.2574 대비 +0.0575, 약 +22%), Production AUUC 2.2106 (baseline 최고 T-Learner 1.8007 대비 +0.41, 약 +23%), Production QINI 2.6105 (baseline 최고 T-Learner 2.3426 대비 +0.268)을 기록한다. Synthetic QINI·KENDALL 최고는 **UMLC (DragonNet)** (0.2961 / 0.1894)이다.
- **단, Production KENDALL은 예외다.** 이 칸의 최고는 baseline DragonNet(0.3894)이고 차순위도 baseline UniTE(0.3684)다. UMLC 변종들(CFRNet-mmd 0.3473 등)은 이 순위 상관 지표에서 baseline을 넘지 못한다. 저자들이 QINI를 목적으로 튜닝했기 때문에 ranking 지표가 항상 동반 상승하지는 않는다는 신호로 읽힌다.

부록의 ground-truth 평가(Synthetic, 반사실 known)에서도 UMLC가 강하다. $\epsilon\_{\text{ATE}}$ 는 UMLC (DragonNet) 0.4083으로 가장 낮고, $\epsilon\_{\text{PEHE}}$ 는 UMLC (CFRNet-mmd) 2.3482로 가장 낮다(모두 낮을수록 좋음).

#### 결과 분석 / Ablation

### RQ2 — 모듈별 ablation

세 모듈 — RCG(컨텍스트 그룹핑), UCI(사용자-컨텍스트 상호작용), TFI(처치-특징 상호작용) — 를 하나씩 제거해 본다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/tab2-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 다섯 가지 base model에 대한 ablation. 각 블록의 첫 행이 full UMLC, 그 아래가 w/o RCG · w/o UCI · w/o TFI. 어느 모듈을 빼도 대부분 성능이 떨어진다."
   zoomable=true %}

UMLC (CFRNet-mmd) 기준으로 보면, Synthetic AUUC는 full 0.3149에서 **w/o TFI 0.2144** (-0.10), **w/o RCG 0.2321** (-0.083), **w/o UCI 0.2395** (-0.076)로 모두 크게 떨어진다. TFI 제거가 AUUC를 가장 많이 깎는다. Production에서는 양상이 다르다 — <strong>w/o UCI</strong>가 QINI를 2.6105 → 1.8255로 가장 크게 무너뜨린다. 즉 어느 모듈이 결정적인지는 데이터셋·지표에 따라 다르지만, <strong>세 모듈 모두 필요하다</strong>는 결론은 일관된다. RCG는 컨텍스트 값 공간을 좁혀 분포 변화를 줄이고, UCI는 사용자-컨텍스트 관계를 끌어와 응답 예측을 돕고, TFI는 처치 민감 특징을 찾아 샘플 가중에 반영한다. (드물게 Synthetic KENDALL에서 w/o RCG가 0.1647 → 0.1694로 미세하게 오르는 칸도 있어, 모듈 간 trade-off가 존재함을 보여 준다.)

### RQ3 — 그룹 수 K의 영향

Synthetic은 설계상 6개 그룹을 갖는다. 학습된 컨텍스트 임베딩의 t-SNE를 보면, **원본 데이터에서는 그룹 구조가 안 보이지만 학습된 임베딩에서는 그룹이 드러난다**. $K=6$ 부근에서 클러스터가 깔끔하게 갈린다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/fig4-context-tsne.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: 그룹 수 K(2-10)에 따른 컨텍스트 임베딩 t-SNE와 그룹별 샘플 수. 첫 패널은 원본 데이터(구조가 안 보임). 학습된 임베딩은 응답-유사 그룹 구조를 복원한다."
   zoomable=true %}

성능과 정렬(alignment)을 함께 보면 더 분명하다. 저자들은 처치·대조 군에서 k-NN으로 비슷한 사용자를 매칭한 뒤 같은 컨텍스트 그룹에 속하는 비율을 <strong>alignment</strong>로 정의한다. 대부분 지표가 $K=2$ 에서 $6$ 까지 오르고 $K=7$ 에서 떨어지며, alignment는 $K=6$ 과 $7$ 사이에서 급락한다. 즉 **$K$ 는 하이퍼파라미터지만, 잘 학습된 RCG 임베딩으로 적절한 $K$ 를 가늠할 수 있다.** 부록의 Production 분석에서는 $K$ 를 20 정도까지 늘려도 안정적이며 그 이후 정렬·성능이 무너진다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/fig5-group-number.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: (a) 그룹 매칭 결과 — alignment(빨강)는 K=6 이후 급락. (b) K별 AUUC/QINI/KENDALL — 대부분 K=6에서 정점을 찍고 이후 하락."
   zoomable=true %}

#### 한계와 비판적 평가

- **추론 지연(latency)이 보고되지 않는다.** "real-time marketing"을 표방하지만, co-attention + cross-attention + K-means가 더하는 연산 비용에 대해 부록 B의 복잡도 분석만 있을 뿐 **base model 대비 UMLC의 wall-clock 추론 시간 비교가 없다**. 실시간 서빙에서 가장 중요한 수치가 빠져 있다.
- **Aggregation(식 9)의 현실 적용성.** "사용자 특징·그룹·처치가 모두 같은" 샘플의 응답을 평균한다는데, 사용자 특징에 연속형(Synthetic의 경우 Gaussian 66차원)이 섞이면 **완전히 동일한 $\mathbf{x}^u$ 매칭은 사실상 일어나지 않는다.** 실데이터에서 이 aggregation이 어떻게 발화하는지(혹은 그룹 단위로만 작동하는지) 본문에서 명확히 설명되지 않는다.
- **단일 플랫폼·이진 처치.** Production은 한 플랫폼의 "영상 선명도 고/저"라는 이진 처치 하나뿐이다. 할인율·쿠폰 같은 다값/연속 incentive, 양면 시장 등 다른 real-time marketing 상황으로의 일반화는 검증되지 않았다.
- **순위 지표 개선의 불균일성.** Production KENDALL에서 UMLC가 baseline을 넘지 못한다. QINI를 목적으로 튜닝한 탓에 지표-목적 결합(objective-metric coupling)이 의심되며, 모든 지표를 동시에 끌어올린다고 말하긴 어렵다.
- **가정의 경험적 검증 부재.** Assumption 1·2(그룹 내 응답 유사성, Lipschitz 변환 존재)는 실데이터에서 직접 검증되지 않는다. 그룹핑 품질은 t-SNE와 alignment proxy로만 간접 제시된다.
- **부록 보고의 일관성.** 부록 C.4 본문은 $\epsilon\_{\text{PEHE}}$ 에서 UMLC (EUEN) 3.2337을 "best"라고 적지만, 이 값은 해당 열에서 가장 **높은(나쁜)** 수치다(표상 최저는 UMLC (CFRNet-mmd) 2.3482). 오타로 보이나, 부록 수치 서술의 신뢰도를 약간 떨어뜨린다.

#### 시사점 / Takeaways

- **컨텍스트는 balancing이 아니라 grouping으로.** 대규모 컨텍스트가 만드는 분산 폭증·분포 변화를, 잠재 공간에서 분포를 맞추는(CFRNet) 대신 <strong>응답-유사 그룹으로 압축</strong>해 푸는 접근은 깔끔하고 실무적이다. 그 열쇠는 "임베딩 거리 ≈ 응답 거리"를 강제하는 Lipschitz 정규화다.
- **분포 변화 아래에서는 단순 모델이 강하다.** S-Learner·T-Learner가 DragonNet·EUEN·UniTE를 앞서는 결과는 uplift 실무자에게 겸손한 교훈을 준다 — 화려한 balancing 구조가 항상 답은 아니다. 전용 설계(여기서는 RCG)가 없으면 복잡함이 독이 될 수 있다.
- **처치 민감도를 샘플 가중치로.** treatment-feature cross-attention의 차이 $\tilde{\tau} - \hat{\tau}$ 를 softmax 가중치로 바꿔 처치-민감 샘플을 키우는 아이디어는 이 논문 밖으로도 옮겨 쓸 만한 일반적 트릭이다.
- **Model-agnostic 래퍼의 가치.** 여섯 개 base model을 동일하게 끌어올린다는 점은 RCG+FI가 특정 구조에 묶이지 않는 범용 플러그인임을 시사한다. 기존 uplift 파이프라인에 얹기 쉽다.
- **"사용자 × 컨텍스트" uplift라는 문제 자체.** 실무 가치가 큰데 충분히 안 다뤄진 영역을 정식화했다는 점이 가장 오래 기억할 기여다.

#### 설치 및 사용법

저자들이 공식 코드를 공개했다([ZexuSun/UMLC](https://github.com/ZexuSun/UMLC)). repo는 `Base_models/`(CFRNet·DragonNet·EUEN·UniTE 등 base uplift model)와 `Framework/`(RCG + feature interaction), 그리고 `cluster.py`(컨텍스트 그룹핑), `data_produce.py`(Synthetic 데이터 생성)로 구성된다.

```bash
git clone https://github.com/ZexuSun/UMLC
cd UMLC

# 1) Synthetic 데이터 생성 (사용자/컨텍스트/처치/응답)
python data_produce.py

# 2) 응답-guided 컨텍스트 임베딩 학습 후 K-means 그룹핑
python cluster.py

# 3) base model을 UMLC 프레임워크로 감싸 학습/평가
#    (Framework/ 내부에서 base model 선택: CFRNet-mmd, DragonNet, EUEN, UniTE ...)
```

자세한 인자·설정은 repo의 스크립트와 README를 따른다(실행 인터페이스는 저장소 기준으로 확인할 것).

#### 참고 자료

- 논문: [arXiv:2502.15697](https://arxiv.org/abs/2502.15697)
- DOI: [10.1145/3690624.3709293](https://doi.org/10.1145/3690624.3709293)
- Code: [github.com/ZexuSun/UMLC](https://github.com/ZexuSun/UMLC)

#### 더 읽어보기

- **[Estimating Individual Treatment Effect: Generalization Bounds and Algorithms](https://arxiv.org/abs/1606.03976)** (Shalit et al., 2017) — UMLC의 base model로 쓰인 TARNet·CFRNet의 원전. 표현 balancing(IPM)으로 처치·대조 분포를 맞추는 representation-learning uplift의 기초.
- **[Adapting Neural Networks for the Estimation of Treatment Effects](https://arxiv.org/abs/1906.02120)** (Shi et al., 2019) — DragonNet. propensity score의 충분성과 targeted regularization을 결합한, UMLC의 또 다른 base model.
- **[Metalearners for Estimating Heterogeneous Treatment Effects using Machine Learning](https://arxiv.org/abs/1706.03461)** (Künzel et al., 2019) — S/T/X-Learner. 이 논문에서 의외로 강했던 단순 meta-learner baseline의 정식화.
- **[Estimation and Inference of Heterogeneous Treatment Effects using Random Forests](https://arxiv.org/abs/1510.04342)** (Wager & Athey, 2018) — Causal Forest. tree 기반 uplift의 대표격으로, ML 기반 갈래의 한 축.
- **[Stable Estimation of Heterogeneous Treatment Effects](https://proceedings.mlr.press/v202/wu23i.html)** (Wu et al., ICML 2023) — StableCFR. 과소대표 subpopulation을 upsampling해 분포 불균형을 완화하는, UMLC의 distribution-shift 문제의식과 가장 가까운 후속 연구.

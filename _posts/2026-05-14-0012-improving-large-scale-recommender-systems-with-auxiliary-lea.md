---
layout: post
title: "[논문 리뷰] Improving Large-Scale Recommender Systems with Auxiliary Learning"
date: 2026-05-14 14:00:00 +0900
description: "Meta 의 광고 추천 모델에서 majority cohort 편향을 보조 학습으로 풀어내는 C2AL 프레임워크 분석"
tags: [recommender-systems, auxiliary-learning, multi-task-learning, factorization-machine, attention, ads-ranking, representation-bias]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig1-dhen-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/
en_url: /en/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Mertcan Cokbas et al. (13명 공동 저자, Meta Platforms) |
| 학회 | arXiv preprint · 2026 · ICLR 2026 submission |
| arXiv | [2510.02215](https://arxiv.org/abs/2510.02215) |
| 데이터 | Meta 광고 production 데이터 — 모델당 수십억 샘플, 6개 production 모델 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-05-14 |

## TL;DR

- 대규모 광고 추천 모델을 single global objective 로 학습하면 데이터 분포의 *majority cohort* 가 학습을 지배해, factorization machine (FM) 기반 attention layer 의 weight 가 0 근처에 몰리는 sparse 분포로 수렴한다. 이게 minority cohort 의 표현력을 빼앗는 representation bias 의 정체다.
- 저자들은 C2AL (Cohort-Contrastive Auxiliary Learning) 을 제안한다. semantic axis (user value, age, advertiser size 등) 를 따라 *예측 분포가 가장 발산하는* head/tail cohort 쌍을 찾고, 그 두 cohort 만을 양성으로 보는 두 개의 binary classification auxiliary task 를 추가한다.
- 이론적으로는 auxiliary gradient 가 attention matrix $\mathbf{Y}$ 의 업데이트에 cohort-specific signal 을 주입해 sparse 분포를 *denser, higher-diversity* 분포로 reshape 한다는 게 핵심 메커니즘. 이는 parameter regularization 이 아닌 *functional regularization* 이다.
- Meta 의 6개 production 광고 모델에서 baseline 대비 NE (normalized entropy) 가 -0.05% ~ -0.16% 일관되게 감소. 일부 minority cohort 에서는 -0.30% 이상. 추론 시 auxiliary head 를 제거하므로 *추가 inference 비용 0*.

## 소개 (Introduction)

광고 추천 시스템은 본질적으로 *이질적인 데이터* 위에서 동작한다. 같은 모델이 다양한 사용자 가치 구간, 연령대, 광고주 규모, 플랫폼 (Facebook / Instagram) 을 동시에 다뤄야 하고, 각 cohort 의 conditional distribution $p(y \mid \mathbf{x}, \text{cohort})$ 은 상당히 다르다. 그런데 학습은 전형적으로 단 하나의 global expected loss 만 최소화한다. 자연스럽게, 데이터가 많고 신호가 강한 majority cohort 가 gradient 를 장악하고, tail cohort 는 표현 자원을 빼앗긴다.

이 문제는 *데이터 양이 늘수록* 오히려 더 심해진다는 게 본 논문의 핵심 관찰이다. 모델·데이터 스케일이 커지면 최적화는 high-density region 으로 더 강하게 빨려가고, attention layer 가 "거의 다 0, 일부만 큰 값" 의 sparse 분포로 굳어진다. 이건 단순한 sparsity 가 아니라 *minority cohort 의 representational pathway 자체가 사라지는 현상* 이다.

Multi-task learning (MTL) 진영은 이를 task balancing 으로 풀려고 했다 (MMoE, PLE, PCGrad, CAGrad 등). 하지만 이들은 "여러 task 의 joint performance 최적화" 가 본분이지 *single primary task 의 representation bias* 자체를 정조준하지는 않는다. 그래서 본 논문은 *auxiliary learning* 으로 방향을 튼다 — 보조 task 는 학습 시에만 존재하고 추론에는 쓰지 않는다는, Caruana 의 원래 MTL 정의에 더 가까운 패러다임이다.

이 글이 흥미로운 이유는 두 가지다. 첫째, "왜 작동하는가" 를 *gradient 와 attention matrix 의 분포* 수준에서 mechanically 설명한다 — 보통 auxiliary learning 논문은 "그냥 더 좋더라" 로 끝나는 경향이 있다. 둘째, Meta 스케일의 6개 *실제 production* 모델 (수십억 샘플) 에서 검증했기 때문에, academic benchmark 의 cherry-picking 의심에서 자유롭다.

## 핵심 기여 (Key Contributions)

1. **Cohort-Contrastive Auxiliary Learning (C2AL) 프레임워크 제안.** semantic axis 를 따라 *예측 분포가 가장 발산하는* cohort 쌍을 자동으로 발견하고, 각 cohort 를 양성으로 보는 두 개의 binary classification head 를 학습 시에 추가한다. 추론 시에는 두 head 와 그 파라미터를 *완전히 폐기* 해 원래 single-task 아키텍처로 회귀하므로 serving cost 가 0 이다.

2. **메커니즘의 수학적·실험적 해부.** auxiliary gradient $\lambda\_{\text{aux}} \nabla\_{\mathbf{G}} \mathcal{L}\_{\text{aux}}$ 가 $\nabla\_{\mathbf{Y}} \mathcal{L}\_{\text{C2AL}} = \mathbf{X}\mathbf{X}^\top (\nabla\_{\mathbf{G}} \mathcal{L}\_{\text{primary}} + \lambda\_{\text{aux}} \nabla\_{\mathbf{G}} \mathcal{L}\_{\text{aux}})$ 을 통해 attention matrix 의 업데이트에 cohort-specific signal 을 직접 주입한다는 사실을 도출하고, attention weight 분포가 학습 진행에 따라 어떻게 sparse → diverse 로 진화하는지 4단계 (0.4B / 2.4B / 7.2B / 12B 샘플) 로 시각화한다.

3. **6개 production 모델에서의 광범위 검증.** Funnel stage (early / final), optimization objective (CTR / CVR), platform (FB / IG), conversion type (onsite / offsite) 의 4축으로 다양화된 production 모델에서 모두 NE 가 통계적으로 유의하게 감소함을 보였다. 또한 *minority cohort 에 대한 개선이 majority cohort 의 희생 없이* 일어남을 보여 zero-sum trade-off 가 아님을 입증.

4. **"Contrastive" 의 재정의.** 여기서 contrastive 는 InfoNCE 류의 self-supervised contrastive 가 *아니라*, head/tail cohort 간 *partially conflicting label* 을 의도적으로 도입해 shared representation 을 cohort-aware 하게 만드는 의미다. 1쪽 footnote 에서 명시적으로 분리.

## 관련 연구 / 배경 지식

### Multi-Task Learning (MTL)

MTL 의 본질은 *shared representation* 을 통해 task 간 inductive bias 를 공유하는 것이다. Caruana (1997) 가 원형이고, 이후 발전은 두 갈래로 나뉜다.

**아키텍처 기반.** 어떤 파라미터를 공유하고 어떤 걸 task-specific 으로 둘지 정한다. Mixture-of-Experts 류의 MMoE (Ma et al., 2018) 와 PLE (Tang et al., 2020) 가 대표. expert subset 을 task 별로 gating 한다.

**최적화 기반.** 여러 task gradient 가 충돌할 때 어떻게 결합할지 정한다. Multi-objective optimization 으로 보는 MGDA (Sener & Koltun, 2018), conflicting gradient 를 projection 으로 제거하는 PCGrad (Yu et al., 2020), conflict-averse gradient descent 인 CAGrad (Liu et al., 2024), selective task group update 의 Jeong & Yoon (2025) 등.

이들 모두 *joint task performance* 가 주 관심사지, primary task 의 *representation bias* 를 정조준하지는 않는다.

### Auxiliary Learning

Jaderberg et al. (2016) 가 RL 에서 unsupervised auxiliary task 로 representation 을 다듬은 것이 출발. Du et al. (2020) 은 cosine similarity 로 task gradient 를 dynamic gating 하는 방법을 제안. Hu et al. (2022) 와 Li et al. (2023) 은 recommendation 에서 multi-task 가 spurious correlation 을 줄인다는 통찰을 줬지만, *어디서 그리고 어떻게* 표현이 개선되는지 mechanistic 설명은 부재했다. 본 논문이 채우는 빈자리가 바로 이 mechanistic link 다.

### DHEN: 본 논문이 다듬는 그 아키텍처

DHEN (Zhang et al., 2022, Meta 의 광고 ranking 백본) 은 sparse embedding 위에 **Input Embeddings → Interaction layer (FM-based attention) → Ensemble layer → Add & Norm** 을 쌓는다. 본 논문이 손대는 곳은 *interaction layer* 의 FM 기반 attention 으로, 미니배치 $\mathbf{X} \in \mathbb{R}^{d \times m}$ ($m$ 개의 active sparse embedding column) 위에서 attention MLP 가 weight matrix $\mathbf{Y} \in \mathbb{R}^{d \times k}$ 를 만들고, compressed interaction embedding 을 bi-linear 형태로 계산한다:

$$
\mathbf{G} = \mathbf{X} \mathbf{X}^\top \mathbf{Y}
$$

여기서 $\mathbf{X}\mathbf{X}^\top \in \mathbb{R}^{d \times d}$ 는 미니배치 sparse feature 의 outer product 이고, $\mathbf{Y}$ 는 이 outer product 를 $k$ 차원 tractable space 로 project 하는 attention weight 이다. 이 $\mathbf{Y}$ 의 분포 sparsity 가 바로 representation bias 의 진앙이다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig1-dhen-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: DHEN(Deep and Hierarchical Ensemble Network) 아키텍처와 내부 interaction layer. FM 기반 attention 메커니즘이 핵심이다."
   zoomable=true %}

baseline 모델의 attention weight 분포는 light-tailed 다. 절대다수가 0 근처에 있고 일부 token 만 의미 있는 값을 갖는다. 이건 "majority cohort 의 패턴을 잡는 데 충분한 소수 feature interaction 만 살아남았다" 는 신호이며, minority cohort 에 중요한 feature interaction pathway 가 *학습 자체에서 dead* 가 된 상태다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig2-attention-sparsity.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: 두 production 모델의 attention weight 분포. baseline 은 0 근처에 집중된 sparse 분포 (파랑), C2AL 은 더 두꺼운 꼬리 (빨강). 후자가 minority cohort 의 feature interaction 을 살린 결과."
   zoomable=true %}

## 방법 / 아키텍처 상세

### Problem setup

Standard supervised learning setup. 입력 $\mathbf{x} \in \mathcal{X}$, 이진 라벨 $y \in \{0, 1\}$ (e.g., 클릭 여부). 모델은 두 component 로 나뉜다:

- **공유 representation encoder** $f: \mathcal{X} \to \mathbb{R}^d$, parameter $\theta\_S$. 입력을 $d$ 차원 embedding $\mathbf{h} = f(\mathbf{x}; \theta\_S)$ 로 매핑.
- **Primary prediction head** $g\_{\text{primary}}: \mathbb{R}^d \to [0, 1]$, parameter $\theta\_H$. $\hat{y} = g\_{\text{primary}}(\mathbf{h}; \theta\_H)$.

baseline single-task objective 는 데이터 분포 $\mathcal{D}$ 위 expected loss 최소화:

$$
\{\theta\_S^*, \theta\_H^*\} = \arg\min\_{\theta\_S, \theta\_H} \mathbb{E}\_{(\mathbf{x}, y) \sim \mathcal{D}} \left[ \mathcal{L}(\hat{y}, y) \right]
$$

학습 시 두 파라미터 모두 동일 loss 의 gradient 로 업데이트:

$$
\theta^{(t+1)} = \theta^{(t)} - \alpha^{(t)} \nabla\_\theta \mathcal{L}(\theta), \quad \theta \in \{\theta\_S, \theta\_H\}
$$

이질적 데이터에서는 위 expected loss 가 majority cohort 쪽으로 편향된 $\mathbf{h}$ 를 만든다는 게 출발점.

### C2AL: Contrastive Cohort Discovery

데이터를 해석 가능한 *semantic axis* (user value 분위, age, advertiser size 등) 를 따라 $N$ 개의 disjoint cohort $\{\mathcal{C}\_1, \dots, \mathcal{C}\_N\}$ 로 분할한다. 각 axis 에 대해 baseline 모델의 예측 분포를 cohort 별로 본 뒤, 두 cohort 의 분포 간 *pairwise divergence* 를 계산한다. KL divergence, cosine similarity, Jensen-Shannon distance, Wasserstein distance 같은 metric 어느 것이든 쓸 수 있다 (논문은 어느 것을 메인으로 썼는지는 명시 안 함).

가장 발산이 큰 cohort 쌍을 $\mathcal{C}\_{\text{head}}$, $\mathcal{C}\_{\text{tail}}$ 로 정한다. 예를 들어 Model A 의 Instagram 클릭 예측에서, user value 의 top 5% 와 bottom 5% 가 head/tail 이고, baseline 모델 예측 분포는 두 cohort 에서 명확히 다른 mode 를 갖는다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig3-cohort-divergence.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Model A (Instagram 클릭 목적) 의 head (Top 5%) 와 tail (Bottom 5%) cohort 에 대한 예측 분포. tail 은 0.7 부근, head 는 0.8 부근에 mode 가 있어 분포적 발산이 뚜렷하다."
   zoomable=true %}

저자들은 divergence 가 *necessary 하지만 sufficient 하지 않은* 기준임을 명시한다. cohort size, causal structure 같은 실용 요인도 선택에 영향을 준다.

### C2AL: Auxiliary Task Construction

두 cohort 가 정해지면, 두 개의 binary auxiliary label 을 만든다. *원래 양성 $y=1$ 이고 동시에 해당 cohort 에 속하는 샘플* 만 양성으로 보는 indicator 마스킹이 핵심.

$$
y\_{\text{head}} = y \cdot \mathbb{1}(\mathbf{x} \in \mathcal{C}\_{\text{head}}) \qquad y\_{\text{tail}} = y \cdot \mathbb{1}(\mathbf{x} \in \mathcal{C}\_{\text{tail}})
$$

그리고 공유 representation $\mathbf{h}$ 위에 두 개의 head $g\_{\text{head}}$, $g\_{\text{tail}}$ (parameter $\theta\_{\text{head}}, \theta\_{\text{tail}}$) 를 얹는다. 학습 시 전체 손실은:

$$
\begin{aligned}
\mathcal{L}\_{\text{C2AL}} = \; & \underbrace{\mathcal{L}(g\_{\text{primary}}(\theta\_S; \theta\_H), y)}\_{\text{Primary Task Loss}} \\
& + \underbrace{\lambda\_{\text{head}} \mathcal{L}(g\_{\text{head}}(\theta\_S; \theta\_{\text{head}}), y\_{\text{head}}) + \lambda\_{\text{tail}} \mathcal{L}(g\_{\text{tail}}(\theta\_S; \theta\_{\text{tail}}), y\_{\text{tail}})}\_{\text{Cohort-Contrast Losses}}
\end{aligned}
$$

**핵심**: 위 손실은 학습 시에만 쓰이고, 추론 시에는 두 auxiliary head 와 파라미터 $\{\theta\_{\text{head}}, \theta\_{\text{tail}}\}$ 가 *완전히 폐기* 된다. 모델은 single-task 아키텍처로 회귀해 $\hat{y} = g\_{\text{primary}}(\mathbf{h}; \theta\_H)$ 만 평가한다. 따라서 inference cost / latency 변화 0, serving infra 변경 0.

### Learning Dynamics: 왜 attention layer 가 변하는가

분석을 단순화하기 위해 두 auxiliary loss 를 하나의 weighted aux 로 통합:

$$
\mathcal{L}\_{\text{C2AL}} = \mathcal{L}\_{\text{primary}}(\mathbf{G}, y) + \lambda\_{\text{aux}} \mathcal{L}\_{\text{aux}}(\mathbf{G}, y\_{\text{aux}})
$$

이제 attention matrix $\mathbf{Y}$ 에 대한 partial derivative 를 보자. $\mathbf{G} = \mathbf{X}\mathbf{X}^\top \mathbf{Y}$ 이므로 chain rule 로:

$$
\nabla\_{\mathbf{Y}} \mathcal{L}\_{\text{C2AL}} = (\mathbf{X}\mathbf{X}^\top)\left(\nabla\_{\mathbf{G}} \mathcal{L}\_{\text{primary}} + \lambda\_{\text{aux}} \nabla\_{\mathbf{G}} \mathcal{L}\_{\text{aux}}\right)
$$

이게 mechanistic insight 의 본체다. baseline ($\lambda\_{\text{aux}} = 0$) 에서는 $\nabla\_{\mathbf{Y}} \mathcal{L}\_{\text{C2AL}}$ 이 majority cohort 의 gradient 로만 채워지고, $\mathbf{Y}$ 가 sparse / concentrated 분포로 수렴해 *high-density region 의 feature interaction 만* 잡는다. auxiliary term 은 cohort-specific gradient signal $\nabla\_{\mathbf{G}} \mathcal{L}\_{\text{aux}}$ 를 *직접* 주입해, attention matrix 의 업데이트에 minority cohort 의 signal 을 강제로 끼워 넣는다.

$\mathbf{G}$ 가 $\mathbf{Y}$ 에 *linear* 하게 의존하므로, $\mathbf{Y}$ 의 변화가 그대로 $\mathbf{G}$ 의 변화로 흘러간다:

$$
\Delta \mathbf{G} = (\mathbf{X}\mathbf{X}^\top) \Delta \mathbf{Y}
$$

결과적으로 compressed interaction embedding $\mathbf{G}$ 가 더 다양한 feature interaction 을 담게 되고, 이게 downstream primary task 의 성능 개선으로 이어진다.

저자들은 이 효과가 attention layer 에 *국소화* 되어 있다는 것도 실험으로 보인다. attention MLP 이전 sparse layer 와 ResNet-Style FM layer 는 baseline 과 C2AL 간 거의 차이가 없고, attention layer 와 post-attention layer 에서만 명확한 분포 차이가 나타난다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig4-weight-distributions.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: 네 레이어의 weight 분포 비교. 왼쪽 (sparse, ResNet-Style FM) 은 baseline (파랑) 과 C2AL (빨강) 이 거의 겹친다. 오른쪽 (attention, post-attention) 에서만 분포가 명확히 바뀌었다 — C2AL 효과가 attention 에 국소화됨을 시사."
   zoomable=true %}

### Attention weight 분포의 시간적 진화

학습 step 별로 attention weight 분포가 어떻게 진화하는지 4 단계로 본다. 두 모델 모두 light-tail bell-shape 으로 *initialize* 됐지만 (C2AL 모델은 더 sparse 한 초기화로 시작), 학습이 진행되면 둘의 궤적이 극적으로 갈린다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig5-attention-evolution.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: 학습 진행에 따른 attention weight 분포 변화. (a) 0.4B 샘플: C2AL 이 매우 좁은 분포로 시작. (b) 2.4B: 다양성 증가 시작. (c) 7.2B: C2AL 이 baseline 보다 명확히 두꺼운 꼬리. (d) 12B: C2AL 이 max diversity 에 도달, baseline 은 변화 없음."
   zoomable=true %}

(a) 0.4B 샘플 시점에서 C2AL 은 거의 모든 weight 가 0 근처에 몰린 *극도로 집중된* 분포다. (b) 2.4B 부터 다양성이 늘어나기 시작. (c) 7.2B 에서는 baseline 보다 명확히 두꺼운 꼬리를 갖고, (d) 12B 에서 C2AL 은 최대 다양성에 도달한 반면 baseline 분포는 거의 변하지 않는다. *baseline 은 데이터를 더 줘도 sparse 분포에서 벗어나지 못한다* 는 게 핵심이다 — 이건 단순한 미수렴이 아니라 majority cohort 가 만든 *attractor* 에 갇힌 상태다.

### Gradient Dynamics: partially conflicting label 의 효과

데이터를 세 영역으로 나눠 gradient 방향을 본다. 양성 샘플 ($y=1$) 만 보면:

- $\mathbf{x} \in \mathcal{C}\_{\text{head}}$: $(y, y\_{\text{head}}, y\_{\text{tail}}) = (1, 1, 0)$. primary 와 $\mathcal{L}\_{\text{head}}$ gradient 가 *같은 방향* 으로 align 해 head cohort 의 학습 신호를 *증폭*.
- $\mathbf{x} \in \mathcal{C}\_{\text{tail}}$: $(y, y\_{\text{head}}, y\_{\text{tail}}) = (1, 0, 1)$. tail 에 대한 대칭 효과로 tail cohort 신호 증폭.
- $\mathbf{x} \notin \{\mathcal{C}\_{\text{head}} \cup \mathcal{C}\_{\text{tail}}\}$ (majority 샘플): $(y, y\_{\text{head}}, y\_{\text{tail}}) = (1, 0, 0)$. primary 는 $\mathbf{h}$ 를 *positive* 로 밀고, 두 auxiliary head 는 *negative* 로 민다. 이게 의도된 *partial conflict* 다.

세 번째 경우가 핵심이다. majority 양성 샘플에 대해 auxiliary loss 는 "이 샘플은 head 도 아니고 tail 도 아니다" 라는 *반대 방향* 의 학습 신호를 주입한다. 따라서 공유 인코더 $\theta\_S$ 는 단순히 양성/음성을 가르는 게 아니라, *head/tail/middle 의 distinguishing feature* 까지 학습해야 한다. 이게 곧 representation 의 cohort-aware 화다.

### Functional Regularization 으로서의 C2AL

위 dynamics 를 projection 으로 분해하면 더 명확해진다. 공유 파라미터에 대한 gradient 를 $G\_{\text{primary}}(\theta\_S) = \nabla\_{\theta\_S} \mathcal{L}(\theta\_S, \theta\_H, y)$, $G\_{\text{aux}}(\theta\_S) = \lambda\_{\text{head}} \nabla\_{\theta\_S} \mathcal{L}(\theta\_S, \theta\_{\text{head}}, y\_{\text{head}}) + \lambda\_{\text{tail}} \nabla\_{\theta\_S} \mathcal{L}(\theta\_S, \theta\_{\text{tail}}, y\_{\text{tail}})$ 로 두면, $G\_{\text{aux}}$ 를 $G\_{\text{primary}}$ 에 대한 parallel / orthogonal component 로 분해할 수 있다:

$$
\begin{aligned}
G\_{\text{aux}}^{\parallel} &:= \frac{\langle G\_{\text{aux}}, G\_{\text{primary}} \rangle}{\|G\_{\text{primary}}\|\_2^2} \cdot G\_{\text{primary}}, \\
G\_{\text{aux}}^{\perp} &:= G\_{\text{aux}} - G\_{\text{aux}}^{\parallel}
\end{aligned}
$$

업데이트 룰은 세 항으로 정리:

$$
\theta\_S^{(t+1)} = \theta\_S^{(t)} - \alpha^{(t)} \left(G\_{\text{primary}}^{(t)} + G\_{\text{aux}}^{\parallel (t)} + G\_{\text{aux}}^{\perp (t)}\right)
$$

여기서 $G\_{\text{primary}} + G\_{\text{aux}}^{\parallel}$ 은 primary task loss 의 local minimum 으로의 convergence 를 함께 끌고, $G\_{\text{aux}}^{\perp}$ 는 *regularization term* 으로 작용한다. $\ell\_1, \ell\_2$ 같은 전통적 regularization 이 *parameter space* 에 작동하는 반면, C2AL 의 orthogonal component 는 *모델의 predictive behavior on specific cohorts* 에 작동하는 **functional regularization** 이다. 이게 본 논문의 가장 개념적인 기여다.

## 학습 목표 / 손실 함수

요약하면 C2AL 의 학습 손실은 다음과 같다:

$$
\mathcal{L}\_{\text{C2AL}} = \mathcal{L}\_{\text{primary}} + \lambda\_{\text{head}} \mathcal{L}\_{\text{head}} + \lambda\_{\text{tail}} \mathcal{L}\_{\text{tail}}
$$

- $\mathcal{L}\_{\text{primary}}$: 원래 primary task (CTR/CVR 예측) 의 binary cross-entropy.
- $\mathcal{L}\_{\text{head}}, \mathcal{L}\_{\text{tail}}$: 각각 $y\_{\text{head}}, y\_{\text{tail}}$ 에 대한 binary cross-entropy.
- $\lambda\_{\text{head}}, \lambda\_{\text{tail}}$: cohort-specific weight. 논문은 구체 값을 공개하지 않음.

학습 후에는 primary head 만 남기므로 모델 아키텍처는 변하지 않는다. 학습 시에만 두 추가 head 가 backprop 경로에 참여.

## 학습 데이터와 파이프라인

| 항목 | 내용 |
|------|------|
| 데이터 | Meta 광고 production 데이터 — 모델당 수십억 (billions) 샘플 |
| 모델 수 | 6개 production 모델 (Model A-F) |
| Funnel stage | Early-stage (computationally constrained) 와 Final-stage (high-fidelity) 모두 포함 |
| Optimization 목적 | Click (CTR, Model A·B) 과 Conversion (CVR, Model C-F) 모두 |
| Platform / Surface | Facebook 과 Instagram 양쪽, onsite (FB/IG 내부) 와 offsite (외부 광고주 도메인) conversion 양쪽 |
| Cohort semantic axis 후보 | Revenue, Age, Age × Surface Type, Advertiser Size 등 (Table 1) |
| Baseline 아키텍처 | DHEN (Zhang et al., 2022) |
| 평가 지표 | Normalized Entropy (NE), 그리고 baseline 대비 NE_diff |

NE 는 모델의 binary cross-entropy 를 *predict-the-global-mean* 모델의 entropy 로 정규화한 값으로, 광고 ranking 에서 표준 지표다:

$$
\text{NE} = \frac{-\frac{1}{N}\sum\_{i=1}^N \left[y\_i \log(\hat{y}\_i) + (1 - y\_i) \log(1 - \hat{y}\_i)\right]}{-\frac{1}{N}\sum\_{i=1}^N \left[y\_i \log(\bar{y}) + (1 - y\_i) \log(1 - \bar{y})\right]}
$$

여기서 $\bar{y} = \frac{1}{N}\sum y\_i$ 는 empirical label mean. NE 가 *작을수록* 좋다. NE_diff 는 baseline 대비 상대 개선:

$$
\text{NE}\_{\text{diff}} = \frac{\text{NE}\_{\text{C2AL}} - \text{NE}\_{\text{baseline}}}{\text{NE}\_{\text{baseline}}}
$$

production 스케일에서는 NE 0.01% 의 차이도 광고 매출과 사용자 경험에 상당한 임팩트를 준다는 게 광고 시스템 평가 관행이다.

## 실험 결과

### 6개 production 모델에서의 overall NE 개선

C2AL 은 6개 모델 모두에서 통계적으로 유의한 NE 감소를 보였다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/tab2-six-models.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 6개 production 모델에서 C2AL 의 baseline 대비 NE_diff. Model A, B 는 클릭 목적, C-F 는 전환 목적. 음수 (낮을수록) 가 개선."
   zoomable=true %}

요약:
- Click 모델 (Model A, B): -0.07%, -0.11%
- Onsite conversion (Model C, D): -0.16%, -0.15%
- Offsite conversion (Model E, F): -0.08%, -0.05%

**onsite conversion 에서 가장 큰 효과** (-0.16% / -0.15%) 가 흥미롭다. onsite 는 사용자 여정이 플랫폼 내부에서 완결되므로 신호가 dense 하고 cohort 의 차이가 더 잘 드러나는 환경이라는 해석이 가능. offsite 는 외부 advertiser 데이터까지 의존하므로 신호가 noisier, 따라서 representation bias 의 영향도 더 dilute 됐을 가능성.

### Semantic axis 별 head/tail PLR 과 NE 개선 (Model C)

4개 axis 로 cohort 를 정의했을 때, head/tail 간 PLR (Positive Label Ratio) 이 *최대 5배* 차이 난다. 데이터가 cohort 단위로 얼마나 이질적인지 보여주는 직접 증거다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/tab1-semantic-axes.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Model C 에서 4개 semantic axis 별 head/tail PLR 과 NE_diff (overall / head / tail)."
   zoomable=true %}

주요 관찰:
- **Revenue axis** 에서 head PLR 0.14%, tail PLR 0.03% (4.7배 차이). NE 는 overall -0.28%, head -0.25%, tail -0.17% 로 모두 개선.
- **Age axis** 에서 흥미로운 비대칭: head NE_diff -0.16% 인데 tail 은 -0.06% 에 불과. 그래도 overall 은 -0.14%. *overall improvement 가 head + tail gain 의 단순 가중평균이 아닌* 사례.
- **Age × Surface Type** 은 head/tail 모두에서 가장 큰 개선 (-0.27%, -0.33%, overall -0.18%).

저자들은 후자 (overall > simple weighted average of head/tail) 를 *broad-based generalization* 의 증거로 제시한다. C2AL 은 targeted sub-population 에만 과적합하는 게 아니라 *전체 분포에 걸쳐* representation 을 개선한다는 주장이다.

### User-value 분위별 세분화 (Model A)

Model A 의 NE_diff 를 사용자 가치 분위 (p0-p5, p5-p10, ..., p95+) 별로 본 그림이다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig6-user-value-segments.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: Model A 의 NE_diff 를 user-value 분위별로 본 결과. 가장 큰 효과는 p75-p95+ 구간의 high-value 사용자에서 나타나며 -0.04% 를 초과."
   zoomable=true %}

핵심:
- Head cohort (p95+) 와 tail cohort (p0-p5) 외에 *중간 분위* 에서도 개선이 일관되게 나타남.
- 가장 큰 개선은 **p75-p95+** 구간의 high-value 사용자 (NE 감소 -0.04% 초과). 저자들 해석: high-value 사용자의 행동 분포 (PLR 등) 가 population mean 에서 가장 멀리 벗어나 있고, low-value 보다도 distributional 비대칭이 더 크기 때문에 *cohort-aware* attention 의 효과가 더 크게 나타남.
- **Tail NE_diff -0.19%, Head NE_diff -0.05%** 로 specific cohort target 도 잘 개선. tail 이 head 보다 4 배 가까이 더 좋아진 건 baseline 이 majority 편향 때문에 tail 표현을 더 많이 잃고 있었다는 방증.

## 결과 분석 / Ablation

### Attention 분포가 정말 바뀌었나 (Figure 4 재해석)

저자들은 C2AL 의 효과가 *attention layer 에 국소화* 되어 있다고 주장한다. Figure 4 가 그 증거. sparse layer 와 ResNet-Style FM layer 는 baseline 과 C2AL 의 분포가 거의 동일하지만, attention layer 와 post-attention layer 에서는 명확한 차이가 나타난다.

이건 mechanistic 주장 — "FM 기반 attention 이 shared embedding 의 *bottleneck* 이기 때문에 거기를 reshape 해야 representation 이 cohort-aware 해진다" — 와 일관된다. attention layer 이전의 sparse / FM layer 는 raw feature interaction 을 만들지만, attention layer 가 그 위에서 어떤 interaction 을 살릴지 *선택* 하므로, 거기서의 sparsity 가 결정적이다.

### "Contrastive" 의 정확한 의미 (footnote 1 의 중요성)

논문 1쪽 footnote 1 은 *contrastive* 의 의미를 짚는다. 본 논문의 contrastive 는 InfoNCE 같은 instance-discrimination 의 self-supervised contrastive learning 과는 algorithmic 으로 무관하다. 여기서는 *cohort 간 traffic pattern 의 partial conflict* 를 의미한다.

구체적으로:
- 양성 majority 샘플에 대해 primary head 는 "양성으로 예측해라", auxiliary head 는 "head 도 아니고 tail 도 아니니 음성으로 예측해라" 라는 *반대 방향* 의 학습 신호를 동시에 준다.
- 공유 representation $\mathbf{h}$ 는 단순히 양성/음성을 가르는 게 아니라 *어느 cohort 에 속하는지* 까지 구별해야 두 head 를 동시에 만족시킬 수 있다.
- 따라서 representation 이 *cohort-discriminating* 으로 정렬되고, attention matrix 가 cohort-specific feature interaction pathway 를 활성화한다.

이 정의는 단순하지만 영리하다. *명시적인 cohort label 예측 task* 대신 *masked label* 을 쓰기 때문에 양성-cohort 신호와 cohort 자체 신호가 자연스럽게 entangle 되고, primary task 와의 함수 공간 정렬이 깨지지 않는다.

### Production 검증의 의미

이 논문이 가진 차별점 중 하나는 *실제 production 모델 6개* 에서 검증했다는 점이다. academic recsys 논문이 흔히 의존하는 small public dataset (MovieLens, Amazon reviews) 과는 다른 차원의 검증이다. funnel stage / objective / platform / conversion type 의 4축으로 다양화된 production 모델 모두에서 일관된 개선이 났다는 건 *generalization 의 강력한 신호* 다.

물론 production 모델의 정확한 hyperparameter 나 아키텍처 디테일은 공개되지 않았다. 이건 industry paper 의 한계이지만 검증 가치 자체를 깎지는 않는다.

## 한계와 비판적 평가

저자가 직접 언급한 한계는 거의 없다. 리뷰어 입장에서 보이는 한계:

1. **다른 MTL/auxiliary learning baseline 과 head-to-head 비교 부재.** MMoE, PLE, PCGrad, CAGrad 같은 직접 비교군 없이 "baseline (single-task)" 과만 비교했다. C2AL 이 단순한 MTL gradient balancing 보다 *어떻게* 더 좋은지 직접 증명되지 않았다.

2. **Hyperparameter 선택 방법 불명확.** $\lambda\_{\text{head}}, \lambda\_{\text{tail}}$ 의 구체 값, divergence metric (KL? JS? Wasserstein?) 의 선택 근거, cohort 비율 (top/bottom 5% 가 항상 정답?) 의 sweep 결과가 모두 미공개. 다른 환경에서 재현하려는 사람에게는 큰 장벽.

3. **재현성 / 코드 미공개.** GitHub repo 없음. Meta production 데이터를 외부에서 쓸 수 없는 건 당연하지만, synthetic 또는 public benchmark (MovieLens, Criteo, Avazu) 위에서 *알고리즘 정확성* 만이라도 재현할 수 있는 reference 구현이 없다.

4. **학습 cost / 메모리 오버헤드 미보고.** auxiliary head 두 개가 추가되므로 training 시 backward pass 가 무거워질 텐데, wall-clock training time 이나 GPU memory 증가량이 보고 안 됨. production 도입 의사결정에 중요한 정보.

5. **Cohort discovery 의 dependence on semantic axis.** semantic axis 선택이 *사람이 해야 하는 작업* 이다. user value, age, advertiser size 같은 axis 가 *왜 의미 있는지* 는 도메인 지식에 의존. axis 자체를 자동 발견하는 메커니즘은 제시되지 않음.

6. **Auxiliary head 선택의 heuristic 성격.** 왜 binary classification 인가? 왜 sample masking (양성 ∩ cohort) 인가? regression head 나 cohort 자체를 multi-class 로 예측하는 head 와의 비교가 없어, 현재 설계가 정말 optimal 인지 알 수 없다.

7. **장기적 안정성 / drift 검증 부재.** production 시스템은 매일 새 데이터로 retraining 된다. cohort 분포가 시간에 따라 drift 할 때 C2AL 의 NE_diff 가 일관되게 유지되는지, 아니면 axis 를 재정의해야 하는지 불명확.

8. **NE 외 지표 부재.** AUC, calibration, online A/B test 결과 등이 보고 안 됨. NE 0.16% 개선이 실제 광고 매출이나 사용자 경험에 어떻게 매핑되는지는 별도 분석이 필요.

## 시사점 / Takeaways

- **Auxiliary learning 의 재발견.** 학습 시에만 존재하고 추론에는 안 쓰이는 보조 task 라는 Caruana 의 원래 정의가 *production scale* 에서도 강력하다는 사례. inference cost 변화 0 인 ML 개선은 industry 적용 장벽이 매우 낮다.

- **Functional regularization 이라는 프레임.** parameter space 에 작용하는 $\ell\_1 / \ell\_2$ 와 달리, *model 의 predictive behavior on specific cohorts* 에 작용하는 regularization 이라는 개념이 깔끔하다. 다른 도메인 (vision, NLP) 에서도 유사하게 minority subpopulation 을 정의해 auxiliary head 로 잡는 패턴이 가능할 듯.

- **Attention sparsity 가 majority bias 의 시각적 진단.** "attention weight 분포가 0 근처에 몰려 있다면 majority cohort 가 학습을 지배하고 있다는 신호" 라는 휴리스틱은 production 디버깅에서 바로 써먹을 수 있다. 모델 헬스 체크 항목으로 attention weight histogram 을 보는 관행이 늘어날 만하다.

- **"Contrastive" 의 의미 다양성.** InfoNCE / instance discrimination 만이 contrastive 가 아니라는 점. *partially conflicting labels* 도 contrastive 의 한 형태로 쓸 수 있고, supervised setting 에서는 더 단순하고 강력할 수 있다.

- **Industry-academia 격차의 노출.** 6개 production 모델 검증 같은 건 academic lab 이 거의 못 한다. 대신 academic 은 *왜 작동하는지* 의 mechanistic 분석에서 더 깊이 갈 수 있다. 본 논문은 *둘 다 한 드문 케이스* — Meta 가 production 검증을, mechanistic gradient 분석을 함께 묶었다.

## 참고 자료

- 논문: <https://arxiv.org/abs/2510.02215>
- 코드: 공개되지 않음
- 관련 Meta 광고 모델 백본 DHEN: <https://arxiv.org/abs/2203.11014>

## 더 읽어보기

- **[DHEN: A Deep and Hierarchical Ensemble Network for Large-Scale Click-Through Rate Prediction](https://arxiv.org/abs/2203.11014)** (Zhang et al., 2022) — 본 논문이 기반으로 한 Meta 광고 ranking 백본 아키텍처. interaction layer 의 FM 기반 attention 이 C2AL 이 손대는 정확히 그곳.
- **[Modeling Task Relationships in Multi-task Learning with Multi-gate Mixture-of-Experts](https://doi.org/10.1145/3219819.3220007)** (Ma et al., KDD 2018) — Google 의 MMoE. task 간 gating 으로 expert 를 dynamic 하게 선택하는 MTL 아키텍처. C2AL 과 직접 비교군이 될 만한 baseline.
- **[Progressive Layered Extraction (PLE): A Novel Multi-Task Learning Model for Personalized Recommendations](https://doi.org/10.1145/3383313.3412236)** (Tang et al., RecSys 2020) — Tencent 의 PLE. MMoE 의 task interference 문제를 task-specific / shared expert 분리로 푼 후속작.
- **[Gradient Surgery for Multi-Task Learning](https://arxiv.org/abs/2001.06782)** (Yu et al., NeurIPS 2020) — PCGrad. task gradient 간 conflict 를 projection 으로 제거. C2AL 의 gradient 분해와 비교해서 읽으면 좋다.
- **[Conflict-Averse Gradient Descent for Multi-task Learning](https://arxiv.org/abs/2110.14048)** (Liu et al., NeurIPS 2021) — CAGrad. task별 loss decrease 의 worst-case 를 boost 하는 conflict-averse 방향 탐색. multi-task 최적화의 또 다른 갈래.
- **[Adapting Auxiliary Losses Using Gradient Similarity](https://arxiv.org/abs/1812.02224)** (Du et al., 2018) — cosine similarity 로 task gradient 의 alignment 를 측정해 auxiliary loss 를 dynamic gating. C2AL 은 dynamic gating 없이 단순 weighted sum 을 쓰는데, gating 추가가 향후 확장 방향.
- **[Wide & Deep Learning for Recommender Systems](https://arxiv.org/abs/1606.07792)** (Cheng et al., DLRS 2016) — Google Play 의 wide & deep. 광고/추천 시스템에서 DNN 백본의 출발점.

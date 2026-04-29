---
layout: post
title: "[논문 리뷰] LLaDA2.0-Uni: Unifying Multimodal Understanding and Generation with Diffusion Large Language Model"
date: 2026-04-29
description: "디퓨전 LLM 한 모델로 이미지 이해, 생성, 편집, 인터리브드 추론을 모두 처리한다. SigLIP-VQ 의미 토크나이저, 16B MoE 백본, distillation 으로 8 step 까지 줄인 디퓨전 디코더의 조합."
tags: [diffusion-llm, multimodal, unified-model, image-generation, image-editing, moe, vlm]
categories: paper-review
giscus_comments: false
related_posts: false
thumbnail: assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig4-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/
en_url: /en/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Tiwei Bie, Haoxing Chen, Tieyuan Chen, Zhenglin Cheng, Long Cui, Kai Gan, Zhicheng Huang, Zhenzhong Lan (tech-lead), Haoquan Li, Jianguo Li (tech-lead), Tao Lin, Qi Qin, Hongjun Wang, Xiaomei Wang, Haoyuan Wu, Yi Xin, Junbo Zhao (Inclusion AI · Ant Group) |
| 학회 | arXiv preprint · 2026 |
| arXiv | [2604.20796](https://arxiv.org/abs/2604.20796) |
| Code | [inclusionAI/LLaDA2.0-Uni](https://github.com/inclusionAI/LLaDA2.0-Uni) |
| 모델 | [HuggingFace](https://huggingface.co/inclusionAI/LLaDA2.0-Uni) |
| 리뷰 일자 | 2026-04-29 |

## TL;DR

- **무엇을:** 디퓨전 대규모 언어 모델 (diffusion LLM, dLLM) 위에 시각 이해와 생성·편집을 한 모델로 통합한 LLaDA2.0-Uni 를 제안. 16B Mixture-of-Experts (MoE) 백본 LLaDA2.0-mini 위에 SigLIP-VQ semantic 토크나이저와 6B 디퓨전 디코더를 붙여 텍스트·이미지를 단일 마스크 예측 목표 (mask prediction objective) 로 학습한다.
- **어떻게:** (1) 픽셀이 아닌 의미 (semantic) 공간에 정렬된 SigLIP-VQ 로 이미지를 16,384 vocab × 2,048 dim 의 discrete token 으로 변환 → 이해 성능을 살리면서도 텍스트와 같은 마스크 예측 학습이 가능. (2) Block-wise attention + 1D RoPE + size token 으로 임의 해상도 처리. (3) 디퓨전 디코더는 Z-Image 6B 위에 Flow Matching → 8 step distillation 으로 11.4× 가속.
- **결과:** 21개 멀티모달 이해 벤치마크에서 unified diffusion 계열 (Lumina-DiMOO, LLaDA-o) 을 큰 폭으로 앞서고 (예: MMStar 64.1 vs 58.0, MMMU 50.1 vs 44.9), specialist VLM Qwen2.5-VL-7B 와 동등 또는 우위. 이미지 생성에서 GenEval 0.89 (overall) 로 unified 모델 1위, DPG 87.76, UniGenBench 79.63 으로 신기록. WISE 추론 기반 이미지 생성 0.68, w/ thinking 모드 0.78. 편집 ImgEdit 3.92 (unified 1위), MICo-Bench 47.1 (unified 1위).
- **추론 가속:** 학습 없는 SPRINT (Sparse Prefix Retention + Non-uniform Token Unmasking) 로 1.6× 속도 향상하면서 평균 점수 -0.6 정도만 손실. DocVQA 는 3.5×, ChartQA·AI2D 는 2.2× 가속.

## 소개 (Introduction)

지금까지 **멀티모달 이해 (multimodal understanding)** 와 **이미지 생성 (image generation)** 은 사실상 다른 모델이 처리해 왔다. 이해 쪽은 Qwen-VL · InternVL 같은 autoregressive (AR) VLM, 생성 쪽은 FLUX · Z-Image 같은 디퓨전 (diffusion) 모델로 나뉘어 발전했고, 둘을 한 모델로 묶어보려는 시도 — Janus, Lumina-mGPT, OmniGen2, Hunyuan Image 3.0, BAGEL — 들도 대부분 AR 백본 또는 AR + 디퓨전 하이브리드 구조를 채택했다. 이 흐름의 한 가지 공통점은 텍스트는 **autoregressive 다음 토큰 예측**, 이미지는 **연속 latent 디퓨전** 으로, 두 가지 학습 목표가 한 모델 안에 공존한다는 점이다.

디퓨전 LLM (dLLM) 노선은 다른 길을 제안한다. **양방향 (bidirectional) 마스크 예측** 이라는 단일 목표로 텍스트와 이미지를 모두 다루자는 것이다. dLLM 은 병렬 디코딩 (parallel decoding) 과 양방향 컨텍스트 모델링을 자연스럽게 지원하기 때문에, AR 백본의 두 손실 (language modeling vs image diffusion) 을 균형 맞추는 미묘한 줄타기를 피할 수 있다. 그러나 기존 dLLM 기반 unified 모델 — MMaDA, Lumina-DiMOO, LLaDA-o — 은 AR 기반 unified 모델 대비 task coverage 와 벤치마크 성능 모두에서 뒤쳐졌다. 저자들이 진단한 원인은 셋이다.

1. **재구성 기반 VQ 토크나이저의 의미 부족.** 픽셀 단위 reconstruction 으로 학습된 VQ-VAE 는 의미 정보 (semantic information) 가 부족해 이해 성능이 떨어진다.
2. **VQ 의 과도한 압축.** 이미지를 너무 짧게 압축하면 생성 품질이 떨어진다.
3. **양방향 모델링이 텍스트에 불안정.** 순수 full-attention 은 문자 인식·OCR 같은 부분에서 실패하기 쉽다.

LLaDA2.0-Uni 는 이 세 한계를 정면으로 푼다. 핵심 아이디어는 *fully semantic discrete tokens* — 이해와 생성 모두에 같은 의미 토큰을 쓰자는 것이다. SigLIP-VQ 라는 의미 정렬형 양자화기를 도입해 (1) 이해 성능을 보존하고, (2) 별도의 디퓨전 디코더가 같은 토큰을 픽셀로 풀어내며, (3) block-wise attention 으로 텍스트 안정성도 확보한다.

## 핵심 기여 (Key Contributions)

- **SigLIP-VQ 의미 토크나이저.** 픽셀 reconstruction 이 아닌 SigLIP2-g ViT 의 의미 표현에 정렬된 16,384 vocab × 2,048 dim 의 discrete tokenizer. 이해와 생성에서 같은 토큰을 사용해 한 백본이 통합 학습 가능.
- **16B MoE dLLM 백본 + Block-wise Attention.** LLaDA2.0-mini 위에 비전 vocab 을 확장. 순수 양방향 attention 의 텍스트 불안정성을 block-wise 패턴으로 완화하면서 dLLM 의 병렬 디코딩 이점은 유지.
- **Diffusion Decoder w/ 8-step Distillation.** Z-Image-Base 6B 위에 Flow Matching 으로 학습한 후 consistency-based 8-step distillation 으로 11.4× 가속, 화질은 거의 손실 없음.
- **SPRINT — 학습 없는 추론 가속.** Sparse Prefix Retention (modality-aware KV cache pruning) + Non-uniform Token Unmasking (confidence-adaptive denoising schedule). 평균 0.6 점 손해로 1.6× 가속.
- **인터리브드 (interleaved) 생성·추론을 unified 구조로 자연스럽게 지원.** Story telling, recipe, chess reasoning, physics CoT 등 텍스트와 이미지가 번갈아 나오는 출력을 한 모델로 생성. WISE-with-thinking 0.78 로 추론 기반 이미지 생성에서도 +10%p 향상.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig1-benchmarks.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: 이해 (좌) · 생성·편집 (우) 양쪽에서 LLaDA2.0-Uni 가 unified 디퓨전 모델 (Lumina-DiMOO, LLaDA-o, BAGEL, InternVL-U) 을 거의 모든 벤치마크에서 앞선다."
   zoomable=true %}

## 관련 연구 / 배경 지식

### 디퓨전 언어 모델 (Diffusion LLM)

표준 LLM 이 토큰을 왼쪽 → 오른쪽으로 한 번에 하나씩 예측 (autoregressive) 한다면, 디퓨전 LLM 은 입력 시퀀스 일부를 `[MASK]` 토큰으로 가린 뒤 한 번에 여러 mask 위치를 예측하는 *masked diffusion* 으로 학습한다. 핵심은 **denoising step** 으로, $T$ step 동안 점차 mask 비율을 줄여가며 시퀀스를 완성한다. AR 대비 양방향 컨텍스트와 병렬 디코딩이 가능하지만, 텍스트의 left-to-right 선호 성향을 깨뜨리면 OCR 같은 정밀 작업이 불안정해진다.

### Block Diffusion Language Model (BDLM)

Arriola et al. (ICLR 2025) 이 제안한 BDLM 은 시퀀스를 *블록* 단위로 나눠 블록 안에서는 디퓨전, 블록 사이에는 좌→우 의존성을 두는 hybrid 구조다. 즉 한 블록 안의 토큰들은 동시에 mask 되고 동시에 unmask 되지만, 이전 블록은 항상 깨끗한 (unmasked) 컨텍스트로 본다. LLaDA2.0-Uni 는 이 BDLM loss 를 학습 목표로 채택하면서 attention 도 같은 패턴으로 제한한다.

### VQ-VAE 와 Semantic VQ

이미지를 discrete token 으로 만드는 표준 방법은 VQ-VAE (Esser et al., 2021) 다. encoder → vector quantizer → decoder 로 픽셀 reconstruction 을 학습하는데, 이 과정에서 학습된 token 은 픽셀 정보 위주라 semantic content 는 약하다. SigLIP-VQ 는 X-Omni (Geng et al., 2025) 가 도입한 변형으로, 미리 학습된 SigLIP2-g ViT 의 semantic feature 위에 vector quantizer 를 붙여 *의미 공간에서* 코드북을 학습한다. 단점은 픽셀 디코더가 따로 필요하다는 것 — LLaDA2.0-Uni 는 이를 별도 디퓨전 디코더로 해결한다.

### Mixture-of-Experts (MoE)

LLaDA2.0-mini 는 MoE 백본이다. Feed-forward 층을 $n$ 개의 expert 로 나누고 라우터가 토큰별로 top-k expert 를 선택하는 구조. 16B 총 파라미터지만 추론 시에는 일부만 활성화돼 비용이 더 작다. 멀티모달 학습에서는 모달리티 (텍스트 vs 이미지) 별로 다른 expert 가 자연스럽게 특화되는 *modality-agnostic* 구성 — 즉 모달리티별 분기를 하드코딩하지 않고 라우팅이 알아서 분담하게 둔다.

## 방법 / 아키텍처 상세

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig4-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: LLaDA2.0-Uni 는 (1) SigLIP-VQ 토크나이저, (2) 16B MoE dLLM, (3) Diffusion Decoder 세 컴포넌트로 구성된다. 텍스트 토큰과 이미지 토큰이 같은 시퀀스에 섞여 들어가 한 백본이 처리한다."
   zoomable=true %}

### SigLIP-VQ — 의미 정렬 discrete 토크나이저

SigLIP-VQ 는 X-Omni 의 토크나이저 설계를 따르되 dynamic resolution 을 지원하도록 확장한 버전이다. 동작은 세 단계.

1. **SigLIP2-g ViT encoder.** 입력 이미지를 patch 단위 continuous feature 로 변환.
2. **Vector Quantizer.** 16,384 entry × 2,048 dim 의 코드북에 가장 가까운 코드로 양자화.
3. **사전학습 LM 정렬.** 양자화된 임베딩을 LLaDA2.0-mini 의 word embedding 공간에 정렬해 백본이 텍스트와 동일한 방식으로 처리할 수 있게 한다.

핵심은 픽셀 reconstruction loss 를 쓰지 않고 *understanding task* 로 토크나이저 자체를 학습한다는 점이다. 이 덕분에 VQ token 이 의미 정보를 풍부하게 담는다 — 후술할 Section 5.1 의 OCR/문서 이해 강세는 거의 전부 이 설계 덕분.

코드북 크기 16,384 는 텍스트 vocab (LLaDA2.0-mini 는 약 152K) 에 비해 작은 편이다. 백본의 입력 임베딩 층은 텍스트 임베딩은 그대로 두고 vision 임베딩만 random init → 그 위에 학습한다. 출력 head 도 마찬가지로 vocab 을 확장하면서 text portion 은 사전학습 가중치를 보존한다.

### MoE 백본과 Block-wise Attention

이미지 토큰화가 끝나면 시퀀스는 텍스트와 이미지 토큰이 섞인 1D sequence 가 된다. 이를 LLaDA2.0-mini (16B MoE) 가 처리한다. Modality-agnostic MoE — 즉 텍스트 expert 와 비전 expert 를 인위적으로 나누지 않고 라우터가 알아서 분담 — 는 멀티 태스크 학습기로서 백본의 표현력을 키운다.

순수 양방향 attention 은 이론적으로는 dLLM 의 가장 큰 장점이지만, 실제로는 두 가지 문제가 있다. (a) **텍스트의 좌→우 편향성.** SigLIP-VQ 토큰이 Qwen2.5 의 의미 공간에 정렬돼 있어 AR 모델의 inductive bias 를 부분적으로 상속하는데, full-attention 은 이를 깨뜨린다. (b) **OCRBench 같은 정밀 작업의 불안정성.** Block-wise attention (Arriola et al. 의 BDLM 패턴) 은 한 블록 안에서는 양방향, 블록 간에는 좌→우 의존을 두어 두 마리 토끼를 잡는다.

### Positional Embedding & 임의 해상도

흔한 unified 모델은 이미지 토큰에 2D RoPE 를 쓰지만 LLaDA2.0-Uni 는 **1D RoPE + size token** 이라는 단순한 길로 간다. 이미지가 들어오기 전에 `<height>` 와 `<width>` 라는 special token 을 넣고 (예: `<imgsize_512>`), 그 뒤로는 이미지를 raster-scan flatten 한 1D sequence 로 본다. Liu et al. (2026), Xin et al. (2025b), Geng et al. (2025) 의 사전 연구가 이미 이 방법이 충분히 잘 동작한다는 것을 보였고, 임의 해상도 처리도 size token 만 갈아끼면 되니 구조 변경이 없다.

### Diffusion Decoder — 의미 토큰을 픽셀로

SigLIP-VQ 토큰은 의미 공간에 살기 때문에 단순한 픽셀 디코더로는 복원할 수 없다. 그래서 Z-Image-Base (6B 사전학습 T2I 모델) 위에 별도 디퓨전 디코더를 학습한다. 입력 조건은 *오직 의미 토큰* — 텍스트 프롬프트는 사용하지 않는다 (이는 NextFlow, X-Omni 가 텍스트 + 이미지 토큰을 모두 condition 으로 쓰는 것과 다른 선택이다). 출력은 입력 의미 토큰 해상도의 2× super-resolution.

CFG (Classifier-Free Guidance) 50-step 샘플링은 비싸기 때문에 **8-step CFG-free distillation** 으로 압축한다. Loss 는 flow matching 과 consistency 의 결합:

$$
\mathcal{L}_\text{Distill}(\theta) = \mathbb{E}_{x_0, z, t}\Big[ \big\| v_{\theta, t} - v_t \big\|_2^2 + \big\| u_{\theta, t} - v_t + t \cdot \frac{d u_{\theta^{-}, t}}{d t} \big\|_2^2 \Big]
$$

$v_t$ 는 target velocity, $v_{\theta,t}$ 와 $u_{\theta,t}$ 는 디코더의 두 출력. JVP (Jacobian-Vector Product) 텀은 UCGM (Sun et al., 2025) 의 second-order 차분으로 근사한다. Stage 별 학습:

- **Stage 1 — Warm-up.** semantic processor freeze, 나머지만 업데이트.
- **Stage 2 — Multi-domain Generalization.** 전체 unfreeze.
- **Stage 3 — High-fidelity Refinement.** 고품질 데이터로 미세화.

### SPRINT — 학습 없는 추론 가속

Block diffusion 은 $B \times T$ forward pass 가 필요하다 ($B$ 블록, 블록당 $T$ denoising step). 코스트가 두 축에서 나오므로 SPRINT 도 두 축으로 줄인다.

**Sparse Prefix Retention** — 각 블록 첫 step 에서 prefix 의 KV cache 를 *modality-aware* 로 가지치기한다. 각 prefix 위치 $i$ 의 importance:

$$
s_i = \alpha \cdot \tilde{l}_i + (1 - \alpha) \cdot c_i
$$

여기서 $\tilde{l}_i$ 는 mean-normalized key norm, $c_i = \max_v p_\theta(v \mid x_t)$ 는 top-1 confidence, $\alpha = 0.5$. Modality 별로 다른 keep ratio 사용 — image token 은 공간 중복성이 크므로 더 공격적으로 prune ($r_\text{img} = 0.8$), text token 은 명령어/추론 chain 을 담고 있어 보존 ($r_\text{text} = 1.0$).

**Non-uniform Token Unmasking** — 표준 schedule 은 step 당 $\lceil m/T \rceil$ 개를 일정하게 unmask 하지만, 모델 confidence 가 이미 높은 위치는 빨리 풀고 낮은 위치는 천천히 푼다. confidence 가 threshold $\tau$ (≈0.93) 를 넘는 모든 위치를 한 번에 accept:

$$
\mathcal{A} = \{ n \in [m] : c_n > \tau \}
$$

각 step 최소 $\lceil m / (T - t) \rceil$ accept 를 보장해 종료 시점을 맞춘다.

## 학습 목표 / 손실 함수

### BDLM Loss (사전학습)

$$
\mathcal{L}_\text{BDLM}(\theta) = -\mathbb{E}_{t, x_0, x_t}\left[ \frac{\alpha'_t}{1 - \alpha_t} \sum_{k=1}^{K} \sum_{i=1}^{L_B} \mathbb{1}[x^i_{t,k} = \text{[MASK]}] \cdot \log p_\theta(x^i_{0,k} \mid x_{0, <k}, x_{t,k}) \right]
$$

핵심 식 풀이.

- 시퀀스를 $K$ 개 블록으로 나눠 ($K = L_\text{total} / L_B$, $L_B$ = 블록 길이) 블록별로 합.
- $-\alpha'_t / (1 - \alpha_t)$ 는 디퓨전 시간 가중치 — denoising 시간 $t$ 에서의 노이즈 변화율.
- 지시함수 $\mathbb{1}[\cdot]$ 으로 mask 된 토큰에 대해서만 loss.
- 조건은 *이전 블록의 깨끗한 버전* $x_{0, <k}$ + 현재 블록의 노이즈 버전 $x_{t,k}$ — 즉 블록 간엔 AR, 블록 내엔 디퓨전.

### SFT — Mask Token Reweighting Loss

SFT 단계에서는 같은 BDLM 목표를 prompt $c$ 에 조건부로 만들고, 거기에 *mask token reweighting* 을 추가한다.

$$
\mathcal{L}_\text{MTRS} = \frac{\sum_j \beta_j \mathcal{L}_\text{SFT}^{(j)}}{\sum_j \beta_j}, \quad \beta_j = \frac{1}{\sqrt{\sum_{k=1}^K \sum_{i=1}^{L_B} \mathbb{1}[x^{i, (j)}_{t, k} = \text{[MASK]}]}}
$$

샘플 $j$ 별 가중치 $\beta_j$ 가 mask 된 토큰 수의 inverse square root. 의도는 길이 분산이 두 자릿수 차이까지 나는 SFT 데이터를 다룰 때 — 토큰 평균 loss 면 긴 샘플이 gradient 를 지배하고, 샘플 평균이면 짧은 샘플이 과대 평가된다. inverse-sqrt 가 그 사이 균형.

추가로 **Complementary Masking** 도 적용. 한 sequence $x_0$ 에서 두 antithetical 학습 instance 를 만든다 — primary $x_t$ 와 inverse mask 의 $x'_t$. 이렇게 만들면 모든 토큰이 정확히 한 번씩 corrupted, token-level sampling bias 를 제거하고 효과적인 정보 활용을 두 배로 만든다.

### Flow Matching Loss (디퓨전 디코더)

$$
\mathcal{L}_\text{FM}(\theta) = \mathbb{E}_{x_0, x_1, z, t}\big[\| v_{\theta, t}(x_t, z) - v_t \|_2^2\big]
$$

$z$ 는 조건이 되는 의미 visual token, $v_{\theta,t}$ 는 timestep $t$ 에서의 예측 velocity, $v_t$ 는 target velocity. Lipman et al. 의 표준 flow matching 목표.

### Load Balancing — Auxiliary-loss-free MoE Bias

MoE 의 expert 활용 불균형을 막기 위해 auxiliary loss 없이 bias 만 업데이트:

$$
b_i = b_i + u \times \frac{F_i - Q_i}{\sqrt{\frac{1}{n} \sum_{j=1}^n (F_j - Q_j)^2}}
$$

$F = \mathbb{E}(f)$ 는 현재 expert load, $Q = [1/n, \ldots, 1/n]$ 은 이상적 균등 분포. Su (2025) 의 RMSNorm-style 정규화로 bias 업데이트를 부드럽게 만들어 학습 내내 안정적인 load balancing.

## 학습 데이터와 파이프라인

### 데이터 카테고리

| 카테고리 | 출처/내용 |
|---------|----------|
| Multimodal Understanding (PT) | 오픈소스 image-captioning, OCR (PaddleOCR + Qwen3-VL refine), grounding/counting (Objects365, RefCOCO), world knowledge & reasoning, text-only (Ling2.0, LLaDA2.0) |
| Multimodal Understanding (SFT) | 약 60M 샘플, text:multimodal = 1:5, single/multi-turn dialog, single/multi-image, General VQA, Chart/Table QA, math reasoning. Qwen3-VL audit + GPT-OSS filter |
| Image Generation | 200M+ 웹 이미지 → metadata (해상도/압축률) → ArtiMuse aesthetics > 60 → DeQA-Score > 4 → 최종 140M. Qwen3-VL-235B-22B 로 captioning |
| Image Editing | X2Edit, OmniEdit, Nano-consistent-150k, Pico-Banana, UniWorld, StructVisuals, UnicEdit, CrispEdit + 자가 합성 페어. Qwen3-VL-235B-22B 로 instruction refinement |
| Interleaved Data | Koala36M 비디오 corpus → duration/quality/motion 필터링 → 6M clip. 5초 간격 frame sampling → 2-6 프레임 sequence. Qwen3-VL-235B-22B 로 action description generation |
| Reasoning-Augmented | Flux-6M, Zebra-CoT, Weave 합쳐 8M 샘플 SFT |

### 3-stage 학습 (Table 1 요약)

| 단계 | S0: V-L Alignment | S1: Multi-task PT | S2: SFT |
|------|-------------------|-------------------|---------|
| 이해 데이터 | Image Caption, Text | Image Caption, Text, OCR, Grounding, Counting, Video Data, Multimodal VQA | High-quality Multimodal QA, Text QA, Interleaved Reasoning |
| 생성 데이터 | Text-to-image | T2I, Image Editing, Interleaved Generation | High-quality T2I, T2I with CoT, High-quality Editing, High-quality Interleaved Generation, Interleaved Reasoning |
| 생성 해상도 | 256 → 512 | 512 | 512 (디퓨전 디코더 → 1024) |
| 이해 max edge | 800 | 800 | 800 |
| 학습 토큰 | 100B | 210B | 80B |
| Sequence length | 8192 | 8192 | 8192 → 16384 |

S0 의 generation task 에서는 image token 만 mask 하고, understanding task 에서는 text token 만 mask 한다. S2 SFT 는 8k context 로 시작해 16k 로 확장하는 2-phase.

### 인프라 — Image Token Pre-extraction & Data Packing

VQ 토크나이저를 매 step 돌리는 것은 비용이 크다. 그래서 학습 *시작 전에* 전체 데이터셋을 frozen tokenizer 로 한 번 처리해 토큰 인덱스를 디스크에 저장 → 학습 시 data loader 가 직접 토큰을 가져온다. encoder 호출이 사라져 파이프라인이 크게 빨라진다.

또한 **Data Packing** 으로 가변 길이 샘플을 fixed-length sequence 로 묶는다 (Figure 5). T2I (긴 이미지 토큰), Editing, MMU, Text 등 sample length 가 두 자릿수 차이가 나기 때문에 padding 으로 GPU 시간을 낭비하기 쉬운데, packing 으로 effective throughput 이 크게 올라간다.

학습 엔진은 dFactory (Inclusion AI 자체 — VeOmni 위에 구축한 dLLM 전용 분산 학습 프레임워크).

## 실험 결과

### 멀티모달 이해 — 21개 벤치마크

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/tab2-mmu-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 21개 멀티모달 이해 벤치마크 종합. LLaDA2.0-Uni vs specialist VLM (Qwen2.5-VL-7B, LLaDA-V) vs unified models (BAGEL, InternVL-U, Lumina-DiMOO, LLaDA-o)."
   zoomable=true %}

저자들이 강조하는 핵심 비교 두 가지.

**1. 동일 계열 (unified diffusion) 압도.**

- MMStar: 64.1 (LLaDA2.0-Uni) vs 58.0 (LLaDA-o) vs 61.0 (Lumina-DiMOO) → +6.1, +3.1
- MMMU val: 50.1 vs 44.9 (LLaDA-o) vs 58.6 (Lumina-DiMOO) — Lumina-DiMOO 가 더 높지만 다른 영역 (OCR/Chart) 에서 큰 폭으로 뒤짐
- HallusionBench: 50.2 vs 47.4 vs 32.9 (Lumina-DiMOO)
- ChartQA: 80.1 vs 87.9 (LLaDA-o) vs 8.3 (Lumina-DiMOO) — Lumina-DiMOO 의 OCR/chart 영역 약점이 두드러짐
- DocVQA: 89.5 vs 91.5 (LLaDA-o) vs 7.2 (Lumina-DiMOO)
- OCRBench: 75.7 vs 74.6 (LLaDA-o) vs 7.6 (Lumina-DiMOO)

**2. specialist VLM 과 동등 또는 우위.**

- MMStar: 64.1 (Ours) vs 63.9 (Qwen2.5-VL-7B), +0.2
- CountBench: 86.0 vs 84.9, +1.1
- 그 외 대부분 영역에서 Qwen2.5-VL-7B 와 ±5% 이내

요점은 "OCR/문서 이해 영역에서 unified diffusion 이 specialist VLM 과 처음으로 견줄 만해졌다" 는 것이다. SigLIP-VQ 의미 토크나이저가 이 차이의 거의 전부를 만든다.

### 이미지 생성 — GenEval, DPG, OneIG, UniGenBench, CVTG-2k, WISE

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/tab3-geneval.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: GenEval 객체 중심 T2I 평가. LLaDA2.0-Uni 0.89 (overall) — unified 모델 1위, generation-only 최상위 (Qwen-Image 0.87, LongCat-Image 0.87) 와 격차를 뒤집음."
   zoomable=true %}

- **GenEval**: 0.89 overall, Position 0.90 (전체 모델 1위)
- **DPG-Bench**: 87.76 — unified 1위, Z-Image-Turbo (84.86), HunyuanImage-3.0 (86.10) 보다 높음
- **OneIG-EN**: 0.505 overall, Alignment 0.882, Reasoning 0.323 — unified 모델 중 모두 1위
- **UniGenBench**: 79.63 overall — unified 신기록. Logic 63.99, Layout 90.30 두 항목에서 specialist 도 앞서거나 동급
- **CVTG-2k** (text rendering): unified 1위 (0.765 avg word accuracy), 5 region 까지 안정적
- **WISE**: 0.68 (unified 1위), w/ thinking 0.78 (+10%p) — Logic, Time, Space, Biology, Physics 영역 모두 향상

WISE 에서 thinking 모드를 켰을 때 +10%p 가 나오는 것이 가장 흥미로운 부분이다. 같은 모델이 텍스트 추론 chain 을 먼저 생성하고 그 결과를 image 생성에 조건으로 사용할 수 있다는 것 — unified 구조의 가장 큰 가치 명제 중 하나.

### 이미지 편집 — ImgEdit, GEdit, MICo-Bench

- **ImgEdit-Bench**: 3.92 overall — unified 1위 (OmniGen2 3.44, InternVL-U 3.67, Lumina-DiMOO 2.77 대비 큰 폭). Adjust (4.16), Hybrid (4.42) 가 최고.
- **GEdit-Bench**: EN 6.61, CN 6.66 — unified 모델 중 최상위. Perceptual Quality 7.52 (EN) / 7.67 (CN) — 편집해도 화질 손상 거의 없음.
- **MICo-Bench** (multi-reference editing): 47.1 overall — Object 51.0, Person 32.8, HOI 46.0, De&Re 54.4 — Lumina-DiMOO (23.3) 의 두 배. 같은 dLLM 구조여도 LLaDA2.0-Uni 의 학습 데이터·디코더가 결정적.

### Interleaved Generation & Reasoning

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig7-interleaved.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: Interleaved Generation 정성 결과. Story telling (스케이트보더 시퀀스) 과 recipe (스테이크 조리 단계) 모두 텍스트와 이미지가 일관성 있게 교차한다."
   zoomable=true %}

저자들이 자체 제안한 InterGen Bench (150 샘플, 11개 카테고리: Character/Story Telling/Travel Guide/Product Manual/Movie Plot/Event Forecasting/Action Anticipation/Movement Trajectory/Daily Scenarios/Cartoon/Recipe·Cooking/Explanation) 에서 Emu3.5 와 비교.

- Story Telling: Gemini score 6.42 (vs Emu3.5 6.28), Qwen3-VL 7.02 (vs 6.83)
- Event Forecasting: Gemini 5.19 (vs 5.08), Qwen3-VL 5.94 (vs 5.75)
- Explanation: 약간 못 미침 — 6.22 vs 6.19 (Gemini), 6.35 vs 6.48 (Qwen3-VL)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig8-reasoning.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: Interleaved Reasoning 정성 결과. 위 — 도르래 시스템의 Newton 제 2 법칙 + 자유물체도. 아래 — 체스 white move 선택 (Q×d2 정답을 4개 후보 시각화 후 선택)."
   zoomable=true %}

체스 문제에서 4개 후보 (Qd2, g4, Re1, Qe2) 를 시각적 보드로 그려가며 분석한 뒤 "Q×d2 가 옳다" 고 결론. 물리 문제는 두 질량 + 도르래 시스템에서 자유물체도를 그리고 Newton 2 법칙을 단계별로 적용해 최종 가속도 ($a = 1.79\,\text{m/s}^2$) 와 장력 ($T \approx 23.67\,\text{N}$) 도출.

이건 단순한 image generation 도, 단순한 CoT 도 아니다 — *visual reasoning* 의 매 단계가 텍스트와 이미지로 교차되며 추적 가능하게 노출된다. 같은 dLLM 백본으로 양쪽이 다 가능해야 자연스럽게 나오는 결과.

## 결과 분석 / Ablation

### SPRINT Ablation (Section 5.5.1)

| Method | AI2D | OCRB | MathVista | ChartQA | DocVQA | MMMU | MMStar | GenEval | DPG | Avg | Δ |
|--------|------|------|-----------|---------|--------|------|--------|---------|-----|-----|---|
| LLaDA2.0-Uni | 82.0 | 75.7 | 68.1 | 80.1 | 89.5 | 50.1 | 64.1 | 0.89 | 87.76 | 76.3 | – |
| TPS | 19.5 | 21.2 | 55.0 | 28.7 | 8.0 | 49.4 | 31.7 | 2.8 | 2.7 | 24.3 | – |
| + SPRINT | 80.9 | 73.4 | 67.2 | 81.0 | 89.0 | 52.5 | 63.0 | 0.878 | 86.27 | 75.7 | -0.6 |
| TPS (SPRINT) | 42.9 | 36.0 | 75.0 | 62.3 | 27.6 | 52.2 | 49.2 | 5.1 | 7.8 | 39.8 | ×1.6 |

평균 점수 -0.6 (76.3 → 75.7) 손실로 1.6× 가속. 가장 큰 가속은 **DocVQA 3.5×** (8.0 → 27.6 TPS), ChartQA·AI2D 2.2×. 긴 출력 (long output) 일수록 prefix pruning 의 누적 절약 효과가 커지기 때문.

흥미롭게도 SPRINT 가 **MMMU 는 +2.4, ChartQA 는 +0.9** 향상시킨다. non-uniform unmasking schedule 이 어려운 위치에 forward pass 예산을 더 배정하기 때문 — 즉 같은 step 수 안에서 어렵지 않은 토큰을 빨리 처리하고 그 여유를 어려운 토큰에 쓴다.

성능 손실이 큰 곳은 **OCRBench (-2.3)** 와 **DPG (-1.5)** — OCR 은 character-level prediction 이라 confidence threshold $\tau = 0.93$ 이 충분히 refined 되지 않은 토큰을 받아들일 수 있고, DPG 는 dense prompt 처리에 더 보수적인 schedule 이 필요한 듯.

### Diffusion Decoder Distillation (Section 5.5.2)

| Method | Speed (s/img) | GenEval | DPG | UniGenBench | OneIG-EN | WISE |
|--------|---------------|---------|------|-------------|----------|------|
| Diffusion Decoder (50 step) | 32.95 | 0.89 | 87.76 | 79.63 | 0.505 | 0.68 |
| Diffusion Decoder Turbo (8 step) | 2.90 | 0.87 | 87.24 | 79.76 | 0.500 | 0.68 |

8-step Turbo 는 11.4× 가속하면서 GenEval -0.02, DPG -0.52, UniGenBench +0.13 — 사실상 noise 수준. WISE 는 동일.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig9-decoder-distill.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9: 50-step decoder (위) vs 8-step distilled decoder (아래) 시각 비교. 사실상 구분 불가능."
   zoomable=true %}

육안으로 거의 구분이 안 된다. consistency-based distillation + UCGM second-order JVP 근사가 핵심 — Lu & Song (2024) 의 simplifying continuous-time consistency 를 따랐을 때 안정적이고 빠르다.

## 한계와 비판적 평가

저자가 인정한 한계.

- **Visual detail 보존 부족.** SigLIP-VQ 가 의미는 잘 잡지만 fine-grained 픽셀 디테일 (작은 텍스트, 정밀 텍스처) 은 약하다. Image editing 에서 detail-sensitive task 가 영향받음.
- **Interleaved 능력 더 키울 필요.** SFT 8M 샘플 정도로는 복잡한 멀티-스텝 interleaved 추론을 완전히 끌어내기 어렵다. 데이터 scale + 모델 capacity 양쪽이 더 필요.
- **RL 미완성.** unified dLLM 위에서 RL 로 후훈련하는 방법은 탐색 단계. 향후 release 예정.

리뷰어 입장에서 추가로 보이는 한계.

- **Specialist VLM 과의 격차는 *좁아졌을 뿐 사라진 것이 아니다*.** ChartQA 80.1 vs Qwen2.5-VL-7B 84.1, DocVQA 89.5 vs 94.9, OCRBench 75.7 vs 84.2 — OCR 의존 영역에서 -4 ~ -8 차이는 production 에서 무시할 수 없다.
- **"unified 가 mutual enhancement 를 만든다" 의 정량 증거가 부족.** 저자들의 motivation 인 understanding ↔ generation 상호 강화는 thinking 모드 +10%p (WISE) 외에는 직접적 ablation 이 없다. Stage 0 에서 generation-only / understanding-only 로 학습한 ablation 같은 것이 있으면 설득력 ↑.
- **Compute 비교 부재.** 16B MoE + 6B decoder = ~22B 파라미터를 100B (S0) + 210B (S1) + 80B (S2) = 390B 토큰으로 학습. Qwen2.5-VL-7B 와 단순 비교는 어렵지만, "LLaDA-o 와 동일 환경에서 비교했나?" 가 명시되지 않아 fair comparison 가능 여부 불분명.
- **Baseline 선택 편향 가능성.** unified diffusion 카테고리에서 LLaDA-o, Lumina-DiMOO, MMaDA, BAGEL, InternVL-U, NextFlow 를 다 비교했지만 구체적 hyperparameter / 학습 데이터 양은 다 다르다. 같은 데이터로 재학습한 fair head-to-head 가 한두 개라도 있으면 확실해진다.
- **InterGen Bench 의 self-proposal 문제.** 저자들이 직접 만든 벤치마크 (150 샘플) 에서 Emu3.5 와 비교한 결과를 interleaved 우위 근거로 쓰는데, 같은 팀이 만든 프롬프트가 자기 모델에 유리하지 않다는 보장이 없다. 외부 벤치마크 (ISG-Bench, OpenING) 에서 비교가 더 설득력 있을 것.

## 시사점 / Takeaways

- **의미 정렬 VQ 토크나이저는 unified diffusion 의 게임 체인저다.** 픽셀 reconstruction VQ 로 학습한 Lumina-DiMOO 가 OCRBench 7.6 / DocVQA 7.2 인 반면, 의미 정렬 SigLIP-VQ 의 LLaDA2.0-Uni 는 75.7 / 89.5 — 같은 dLLM 구조에서 토크나이저 하나로 10× 차이가 난다. 디퓨전 백본 + 디퓨전 디코더 분리 설계 (semantic token 만 픽셀로 풀고 디코더에는 텍스트 condition 안 줌) 가 깔끔하다.
- **Block-wise attention 이 diffusion ↔ AR 의 사실상 표준이 되어 가는 중.** Arriola et al. 의 BDLM (ICLR 2025), MMaDA, Lumina-DiMOO, LLaDA2.0-Uni — 순수 양방향은 텍스트에서 깨지고, 순수 AR 은 dLLM 의 병렬 디코딩을 잃는다. block 단위 hybrid 가 균형점.
- **Distillation 으로 디퓨전 디코더의 step 비용은 거의 사라진다.** 50→8 step 11.4× 가속에 화질 거의 무손실. 이 트릭이 일반화되면 unified 모델의 추론 비용 분석에서 디코더는 더 이상 병목이 아니다. 대신 dLLM 백본의 KV cache + 다중 step denoising 이 진짜 비용 중심 — SPRINT 같은 학습-없는 가속이 더 중요해진다.
- **Unified 모델의 가장 강한 가치 명제는 "interleaved reasoning".** 단순 T2I 는 specialist 가 더 잘하고, 단순 VQA 는 specialist VLM 이 비슷하거나 더 잘한다. 그러나 "체스 보드를 그려가며 분석" 이나 "물리 자유물체도를 그리며 풀이" 같은 *시각적 단계 추론* 은 한 모델 안에서만 자연스럽다. WISE-with-thinking +10%p 가 이 가치를 정량화한 첫 결과 중 하나.
- **dLLM 노선이 unified 모델에서 비로소 AR 노선과 동등 출발선에 섰다.** 이전까지 (MMaDA, Lumina-DiMOO 등) dLLM 기반 unified 는 "재미있는 방향" 이었지만 production 후보는 아니었다. LLaDA2.0-Uni 가 21개 understanding 벤치, GenEval, DPG, ImgEdit, MICo-Bench 등 다수에서 unified 1위를 처음 잡았다. 이제 진짜 비교는 LLaDA2.0-Uni vs BAGEL vs OmniGen2 사이에서 일어날 것.

## 설치 및 사용법

저자들이 GitHub ([inclusionAI/LLaDA2.0-Uni](https://github.com/inclusionAI/LLaDA2.0-Uni)) 와 HuggingFace ([inclusionAI/LLaDA2.0-Uni](https://huggingface.co/inclusionAI/LLaDA2.0-Uni)) 에 코드와 모델을 공개했다. 다음은 일반적인 형태의 추론 예제 — 실제 API 는 release 직후 변경될 수 있으니 repo README 를 우선 확인.

```python
from transformers import AutoTokenizer, AutoModel
from PIL import Image

model = AutoModel.from_pretrained(
    "inclusionAI/LLaDA2.0-Uni",
    trust_remote_code=True,
    torch_dtype="bfloat16",
).cuda()
tok = AutoTokenizer.from_pretrained("inclusionAI/LLaDA2.0-Uni", trust_remote_code=True)

# 1. 이미지 이해
img = Image.open("chart.png")
out = model.generate(
    text="What region had the highest rainfall in any single month?",
    images=[img],
    max_new_tokens=128,
)
print(tok.decode(out[0]))

# 2. 텍스트 → 이미지
img_out = model.generate_image(
    prompt="A small anthropomorphic teapot saying 'I think I need a little more tea'",
    height=1024, width=1024,
    num_inference_steps=8,   # distilled turbo decoder
)
img_out.save("teapot.png")

# 3. 이미지 편집
edit_out = model.edit_image(
    image=Image.open("blackboard.png"),
    instruction="Change the text on the blackboard to 'LLaDA Coffee'",
    num_inference_steps=8,
)
```

## 참고 자료

- 논문: [arXiv:2604.20796](https://arxiv.org/abs/2604.20796)
- Code: [github.com/inclusionAI/LLaDA2.0-Uni](https://github.com/inclusionAI/LLaDA2.0-Uni)
- 모델: [HuggingFace](https://huggingface.co/inclusionAI/LLaDA2.0-Uni)
- LLaDA 시리즈 제작 그룹: AGI Research Center, Inclusion AI

## 더 읽어보기

- **[Large Language Diffusion Models (LLaDA)](https://arxiv.org/abs/2502.09992)** (Nie et al., 2025) — 본 논문의 디퓨전 LLM 노선의 시작점. 8B dLLM 이 LLaMA3-8B 와 견줄 만하다는 것을 처음으로 보여준 논문이고, in-context learning 과 instruction following 이 dLLM 에서도 충분히 가능함을 입증.
- **[LLaDA-V](https://arxiv.org/abs/2505.16933)** (You et al., 2025) — LLaDA 에 visual instruction tuning 을 더한 multimodal 확장. 본 논문과 같은 그룹의 직계 선행 연구.
- **[MMaDA](https://arxiv.org/abs/2505.15809)** (Yang et al., 2025) — modality-agnostic dLLM unified architecture + mixed-CoT + UniGRPO RL. LLaDA2.0-Uni 가 베이스라인으로 정조준한 직접 경쟁작.
- **[Lumina-DiMOO](https://arxiv.org/abs/2510.06308)** (Xin et al., 2025) — 또 다른 omni dLLM. 본 논문에서 OCR/Chart 영역의 약점이 가장 두드러진 비교 대상이라, "왜 SigLIP-VQ 가 중요한가" 를 검증할 때 늘 함께 보면 좋다.
- **[BAGEL: Emerging Properties in Unified Multimodal Pretraining](https://arxiv.org/abs/2505.14683)** (Deng et al., 2025) — AR + 디퓨전 하이브리드의 대표작. 7B active / 14B total MoE. Interleaved 학습을 scale up 했을 때 emerging capability 가 나타난다는 가설을 처음 정량화.
- **[Block Diffusion](https://arxiv.org/abs/2503.09573)** (Arriola et al., ICLR 2025) — LLaDA2.0-Uni 의 BDLM loss 와 block-wise attention 의 출처. AR ↔ 디퓨전 사이를 연속적으로 보간하는 형식적 프레임워크.
- **[X-Omni](https://arxiv.org/abs/2507.22058)** (Geng et al., 2025) — SigLIP-VQ 토크나이저 디자인의 직접 출처. Discrete AR 에 RL 을 더해 화질 격차를 메운 사례로, 토크나이저 설계 면에서 LLaDA2.0-Uni 의 사실상 부모.
- **[SigLIP 2](https://arxiv.org/abs/2502.14786)** (Tschannen et al., 2025) — LLaDA2.0-Uni 의 vision encoder 가 SigLIP2-g ViT. Multilingual + dense feature 강화로 의미 정렬 VQ 의 backbone 으로 잘 어울림.
- **[Z-Image](https://arxiv.org/abs/2511.22699)** (Cai et al., 2025) — 본 논문의 Diffusion Decoder 가 Z-Image-Base 6B 를 starting point 로 사용. Single-stream DiT + 6B 라는 효율적 architecture.

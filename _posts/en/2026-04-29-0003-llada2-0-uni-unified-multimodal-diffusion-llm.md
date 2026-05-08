---
layout: post
title: "[Paper Review] LLaDA2.0-Uni: Unifying Multimodal Understanding and Generation with Diffusion Large Language Model"
date: 2026-04-29 10:00:00 +0900
description: "A single diffusion LLM that handles image understanding, generation, editing, and interleaved reasoning. Built around a SigLIP-VQ semantic tokenizer, a 16B MoE backbone, and an 8-step distilled diffusion decoder."
tags: [diffusion-llm, multimodal, unified-model, image-generation, image-editing, moe, vlm]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig4-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/
ko_url: /papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Tiwei Bie, Haoxing Chen, Tieyuan Chen, Zhenglin Cheng, Long Cui, Kai Gan, Zhicheng Huang, Zhenzhong Lan (tech-lead), Haoquan Li, Jianguo Li (tech-lead), Tao Lin (tech-lead), Qi Qin, Hongjun Wang, Xiaomei Wang, Haoyuan Wu, Yi Xin, Junbo Zhao (AGI Research Center, Inclusion AI) |
| Venue | arXiv preprint · 2026 |
| arXiv | [2604.20796](https://arxiv.org/abs/2604.20796) |
| Code | [inclusionAI/LLaDA2.0-Uni](https://github.com/inclusionAI/LLaDA2.0-Uni) |
| Model | [HuggingFace](https://huggingface.co/inclusionAI/LLaDA2.0-Uni) |
| <span style="white-space: nowrap">Review date</span> | 2026-04-29 |

## TL;DR

- **What**: LLaDA2.0-Uni unifies multimodal understanding, image generation, image editing, and interleaved reasoning inside a single diffusion-LLM. It pairs a 16B MoE dLLM backbone (LLaDA2.0-mini) with a SigLIP-VQ semantic tokenizer and a 6B diffusion decoder, all trained under one block-wise mask-prediction objective.
- **How**: (1) SigLIP-VQ converts images to **semantic** discrete tokens (16,384 vocab × 2,048 dim) — preserving understanding ability while letting the same backbone treat text and images uniformly. (2) Block-wise attention plus 1D RoPE with `<height>/<width>` size tokens supports arbitrary resolutions without changing the architecture. (3) The diffusion decoder, built on Z-Image-Base 6B with flow matching, is distilled from 50 → 8 steps for an 11.4× speedup with virtually no quality loss.
- **Results**: Across 21 multimodal understanding benchmarks, LLaDA2.0-Uni decisively outperforms diffusion-based unified models (Lumina-DiMOO, LLaDA-o) — e.g. MMStar 64.1 vs 58.0, MMMU 50.1 vs 44.9 — and matches or exceeds specialist VLMs like Qwen2.5-VL-7B. On generation it sets new unified-model records (GenEval 0.89, DPG 87.76, UniGenBench 79.63), tops unified models on editing (ImgEdit 3.92, MICo-Bench 47.1), and gains another +10 points on WISE in "with-thinking" mode (0.68 → 0.78).
- **Inference speedup**: A training-free SPRINT framework (Sparse Prefix Retention + Non-uniform Token Unmasking) gives a 1.6× wall-clock speedup at the cost of just 0.6 average benchmark points. DocVQA gets 3.5×, ChartQA and AI2D get 2.2×.

## Introduction

For most of the past two years, **multimodal understanding** and **image generation** have been served by different model families. Understanding lives in autoregressive VLMs like Qwen-VL or InternVL; generation lives in diffusion models like FLUX or Z-Image. The recent crop of "unified" models — Janus, Lumina-mGPT, OmniGen2, HunyuanImage 3.0, BAGEL — has tried to bring them together, but most of them keep an AR backbone (or AR + diffusion hybrid) and end up juggling two training objectives inside one model: next-token prediction for text, latent diffusion for images.

Diffusion-LLM (dLLM) takes a different route: cover both modalities under a single **bidirectional masked prediction** objective. dLLMs naturally support parallel decoding and bidirectional context, and you don't have to balance two competing losses. But existing dLLM-based unified models — MMaDA, Lumina-DiMOO, LLaDA-o — have lagged behind their AR counterparts on both task coverage and benchmark numbers. The authors trace this to three causes:

1. **VQ tokenizers are reconstruction-based**, so their tokens lack semantic content and understanding suffers.
2. **VQ tokenizers compress too aggressively**, hurting generation quality.
3. **Pure bidirectional modeling is unstable for text** — character-level OCR breaks down without left-to-right inductive bias.

LLaDA2.0-Uni attacks all three head-on. The central idea is *fully semantic discrete tokens* — the same kind of tokens for both understanding and generation. SigLIP-VQ produces semantic tokens, a separate diffusion decoder turns those tokens back into pixels, and block-wise attention restores enough left-to-right structure to keep text reliable.

## Key contributions

- **SigLIP-VQ semantic tokenizer.** A 16,384-entry / 2,048-dim discrete tokenizer aligned with SigLIP2-g ViT semantic features instead of pixel reconstruction. Same tokens drive understanding and generation.
- **16B MoE dLLM backbone with block-wise attention.** LLaDA2.0-mini extended with vision vocabulary. Block-wise attention (à la Block Diffusion) gives parallel decoding speed without breaking text capabilities.
- **Diffusion decoder with 8-step distillation.** Built on Z-Image-Base 6B with flow matching, then distilled with consistency training for 11.4× speedup while preserving quality.
- **SPRINT — training-free inference acceleration.** Sparse Prefix Retention (modality-aware KV cache pruning) plus Non-uniform Token Unmasking (confidence-adaptive denoising schedule). 1.6× speedup, ~0.6 point average drop.
- **Native interleaved generation and reasoning.** Story telling, recipes, chess analysis, physics CoT — all produced by one model. WISE with thinking gains +10 points, the most direct quantification yet of "unified models reasoning across modalities".

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig1-benchmarks.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: LLaDA2.0-Uni leads unified diffusion models (Lumina-DiMOO, LLaDA-o, BAGEL, InternVL-U) on understanding benchmarks (left) and generation/editing benchmarks (right) across nearly the entire spectrum."
   zoomable=true %}

## Background

### Diffusion language models

Where a standard LLM predicts tokens left to right (autoregressively), a diffusion LLM masks out parts of the input and learns to predict many `[MASK]` positions at once — this is *masked diffusion*. Generation is a $T$-step denoising loop that gradually shrinks the masked fraction until the sequence is complete. The wins are bidirectional context and parallel decoding; the losses are subtle, but the most painful one is that pure bidirectional attention can struggle with text tasks like OCR that have a strong left-to-right structure.

### Block Diffusion Language Model (BDLM)

Arriola et al. (ICLR 2025) introduced BDLM, which splits the sequence into blocks and runs diffusion *within* a block but autoregressive dependence *between* blocks. Tokens inside the same block are masked and unmasked together; previous blocks always appear clean. LLaDA2.0-Uni adopts the BDLM loss as its training objective and matches the attention pattern to it.

### VQ-VAE and semantic VQ

The standard way to discretize images for a transformer is VQ-VAE (Esser et al., 2021): encoder → vector quantizer → decoder, trained to reconstruct pixels. The resulting tokens carry pixel-level information but very little semantic content. SigLIP-VQ, popularized by X-Omni (Geng et al., 2025), instead places the quantizer on top of a frozen SigLIP2-g ViT, learning a codebook in semantic space. The price is that you can no longer decode straight to pixels — you need a dedicated diffusion decoder. LLaDA2.0-Uni pays exactly that price.

### Mixture-of-Experts (MoE)

LLaDA2.0-mini is an MoE backbone: each feed-forward layer has $n$ experts, and a router picks the top-$k$ for each token. Total parameters are 16B but only a fraction is active per forward pass. Crucially, the design is **modality-agnostic** — there is no hard-coded text expert vs vision expert. Routing learns the split itself.

## Architecture

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig4-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: LLaDA2.0-Uni has three core pieces: (1) a SigLIP-VQ tokenizer, (2) a 16B MoE dLLM, (3) a diffusion decoder. Text and image tokens are interleaved in a single sequence and processed by one backbone."
   zoomable=true %}

### SigLIP-VQ — semantic discrete tokenizer

The tokenizer follows the X-Omni recipe but adds dynamic resolution. Three steps:

1. **SigLIP2-g ViT encoder.** Maps the image to per-patch continuous features.
2. **Vector quantizer.** 16,384 entries of 2,048 dimensions; pick the nearest code.
3. **LM-aligned embedding.** The quantized embeddings are aligned with LLaDA2.0-mini's existing word embedding space, so the backbone can ingest them without distinction.

The crucial choice is to skip pixel reconstruction loss entirely and train the tokenizer with **understanding objectives**. That's what gives the tokens their semantic richness — and is the single biggest reason for the OCR/document gap that we'll see later.

The codebook size of 16,384 is small relative to the text vocabulary (LLaDA2.0-mini has ~152K). Vision embeddings are added with random initialization while pretrained text embeddings stay intact; the same surgery is performed on the output head.

### MoE backbone with block-wise attention

After tokenization the sequence is a 1D mix of text and image tokens, fed to LLaDA2.0-mini (16B MoE). The fact that this MoE is modality-agnostic matters: the router learns to specialize experts per modality without anyone telling it to.

Pure bidirectional attention is the headline advantage of dLLMs in theory, but in practice it has two problems. (a) **Inherited left-to-right bias.** SigLIP-VQ tokens are aligned to Qwen2.5's semantic space, partially inheriting AR inductive bias that full-attention would shatter. (b) **Instability on character-level tasks** like OCRBench. Block-wise attention (Arriola et al.'s BDLM pattern) restores left-to-right dependence between blocks while keeping bidirectional attention inside each block — a clean compromise.

### Positional embedding & arbitrary resolution

Many recent unified models adopt 2D RoPE for image tokens. LLaDA2.0-Uni keeps things simple: 1D RoPE plus *size tokens*. Before each image, special tokens like `<imgsize_512>` carry the height and width; the image itself is a raster-scanned 1D sequence. Prior work (Liu et al. 2026, Xin et al. 2025b, Geng et al. 2025) has already shown this is enough, and arbitrary resolution becomes a matter of swapping the size token rather than touching the architecture.

### Diffusion decoder — semantic tokens to pixels

Because SigLIP-VQ tokens live in semantic space, a plain pixel decoder won't work. The authors train a separate diffusion decoder on top of Z-Image-Base (a 6B pretrained T2I model). Importantly, the only conditioning signal is the **semantic tokens themselves** — no text prompt is fed to the decoder, which is a deliberate divergence from NextFlow and X-Omni that mix text with image tokens. Output resolution is 2× super-resolution of the semantic tokens.

50-step CFG sampling is too expensive for production, so the decoder is distilled to 8 steps with a consistency-based objective:

$$
\mathcal{L}_\text{Distill}(\theta) = \mathbb{E}_{x_0, z, t}\Big[ \big\| v_{\theta, t} - v_t \big\|_2^2 + \big\| u_{\theta, t} - v_t + t \cdot \frac{d u_{\theta^{-}, t}}{d t} \big\|_2^2 \Big]
$$

$v_t$ is target velocity, $v_{\theta,t}$ and $u_{\theta,t}$ are the decoder's two outputs. The JVP term is approximated with UCGM's second-order finite difference (Sun et al., 2025). Training is staged:

- **Stage 1 — Warm-up**: freeze the semantic processor, update the rest.
- **Stage 2 — Multi-domain generalization**: unfreeze everything.
- **Stage 3 — High-fidelity refinement**: fine-tune on top-quality data.

### SPRINT — training-free inference acceleration

A block diffusion model needs $B \times T$ forward passes ($B$ blocks × $T$ denoising steps each). SPRINT attacks both axes.

**Sparse Prefix Retention.** At the first step of each block, prune the prefix KV cache in a modality-aware way. Each prefix position $i$ gets an importance score:

$$
s_i = \alpha \cdot \tilde{l}_i + (1 - \alpha) \cdot c_i
$$

where $\tilde{l}_i$ is the mean-normalized key norm, $c_i = \max_v p_\theta(v \mid x_t)$ is the top-1 confidence, and $\alpha = 0.5$. Different keep ratios per modality — image tokens have spatial redundancy and tolerate aggressive pruning ($r_\text{img} = 0.8$), text tokens carry instructions and reasoning chains and are kept fully ($r_\text{text} = 1.0$).

**Non-uniform Token Unmasking.** Instead of unmasking $\lceil m/T \rceil$ tokens per step on a fixed schedule, accept every position whose model confidence already exceeds a threshold $\tau$ (≈0.93):

$$
\mathcal{A} = \{ n \in [m] : c_n > \tau \}
$$

A minimum of $\lceil m / (T - t) \rceil$ acceptances per step guarantees termination. Easy positions are settled fast, hard positions get more passes — same total budget, better allocation.

## Training objectives

### BDLM loss (pretraining)

$$
\mathcal{L}_\text{BDLM}(\theta) = -\mathbb{E}_{t, x_0, x_t}\left[ \frac{\alpha'_t}{1 - \alpha_t} \sum_{k=1}^{K} \sum_{i=1}^{L_B} \mathbb{1}[x^i_{t,k} = \text{[MASK]}] \cdot \log p_\theta(x^i_{0,k} \mid x_{0, <k}, x_{t,k}) \right]
$$

In words: split the sequence into $K$ blocks of length $L_B$, sum across blocks. The factor $-\alpha'_t / (1 - \alpha_t)$ is the diffusion-time weighting. The indicator $\mathbb{1}[\cdot]$ restricts the loss to masked tokens. Each block's prediction conditions on **clean previous blocks** $x_{0, <k}$ plus **the noisy current block** $x_{t,k}$ — AR between blocks, diffusion within.

### SFT — Mask Token Reweighting Loss

In SFT we make BDLM conditional on a prompt $c$ and add per-sample reweighting:

$$
\mathcal{L}_\text{MTRS} = \frac{\sum_j \beta_j \mathcal{L}_\text{SFT}^{(j)}}{\sum_j \beta_j}, \quad \beta_j = \frac{1}{\sqrt{\sum_{k=1}^K \sum_{i=1}^{L_B} \mathbb{1}[x^{i, (j)}_{t, k} = \text{[MASK]}]}}
$$

Sample weight $\beta_j$ is inverse square root of the number of masked tokens. The motivation: SFT data lengths span two orders of magnitude. Token-level averaging lets long samples dominate the gradient; sample-level averaging over-credits short samples. Inverse-sqrt sits in between.

The authors also adapt **complementary masking**: from one sequence $x_0$ build two antithetical instances — primary $x_t$ and complement $x'_t$ with the inverse mask. Every token position is corrupted exactly once across the pair, doubling effective information utilization and removing per-token sampling bias.

### Flow Matching loss (diffusion decoder)

$$
\mathcal{L}_\text{FM}(\theta) = \mathbb{E}_{x_0, x_1, z, t}\big[\| v_{\theta, t}(x_t, z) - v_t \|_2^2\big]
$$

$z$ is the conditioning semantic visual tokens, $v_{\theta,t}$ is the predicted velocity at timestep $t$, $v_t$ the target velocity. Standard Lipman-style flow matching.

### Load balancing — auxiliary-loss-free MoE bias

Instead of an extra balancing loss, the MoE bias is updated directly:

$$
b_i = b_i + u \times \frac{F_i - Q_i}{\sqrt{\frac{1}{n} \sum_{j=1}^n (F_j - Q_j)^2}}
$$

where $F = \mathbb{E}(f)$ is the current expert load and $Q = [1/n, \ldots, 1/n]$ is the ideal uniform. The RMSNorm-style normalization (Su, 2025) keeps bias updates smooth, avoiding routing collapse.

## Training data and pipeline

### Data categories

| Category | Sources / treatment |
|----------|---------------------|
| Multimodal understanding (PT) | Open-source image-captioning + OCR (PaddleOCR pseudo-labels refined by Qwen3-VL), grounding/counting (Objects365, RefCOCO), world knowledge & reasoning, text-only (Ling2.0, LLaDA2.0) |
| Multimodal understanding (SFT) | ~60M samples, text:multimodal = 1:5; single/multi-turn dialogue, single/multi-image, General VQA, Chart/Table QA, math reasoning. Qwen3-VL audits queries; GPT-OSS filters responses |
| Image generation | 200M+ web images → metadata filter (resolution, compression) → ArtiMuse aesthetics > 60 → DeQA-Score > 4 → final 140M. Captioned by Qwen3-VL-235B-22B |
| Image editing | X2Edit, OmniEdit, Nano-consistent-150k, Pico-Banana, UniWorld, StructVisuals, UnicEdit, CrispEdit + self-synthesized pairs. Qwen3-VL-235B-22B refines instructions |
| Interleaved data | Koala36M video corpus → duration / quality / motion filtering → 6M clips. 5-second frame sampling → 2-6 frame sequences. Qwen3-VL-235B-22B writes action descriptions |
| Reasoning-augmented | Flux-6M + Zebra-CoT + Weave = 8M SFT samples |

### Three-stage training (Table 1 summary)

| Stage | S0: V-L Alignment | S1: Multi-task PT | S2: SFT |
|-------|-------------------|-------------------|---------|
| Understanding data | Image Caption, Text | Image Caption, Text, OCR, Grounding, Counting, Video, Multimodal VQA | High-quality Multimodal QA, Text QA, Interleaved Reasoning |
| Generation data | Text-to-image | T2I, Image Editing, Interleaved Generation | High-quality T2I, T2I with CoT, High-quality Editing, High-quality Interleaved Generation, Interleaved Reasoning |
| Gen. resolution | 256 → 512 | 512 | 512 (decoder → 1024) |
| Under. max edge | 800 | 800 | 800 |
| Training tokens | 100B | 210B | 80B |
| Sequence length | 8192 | 8192 | 8192 → 16384 |

In S0, generation tasks mask only image tokens and understanding tasks mask only text tokens. S2 SFT runs in two phases: 8k context first for instruction-following capability, then expands to 16k for complex visual reasoning and generation.

### Infrastructure — token pre-extraction & data packing

Running the VQ tokenizer every step is expensive. The authors pre-extract token indices for the entire dataset *before* training, cache them on disk, and have the dataloader fetch tokens directly. The encoder pass disappears from the training loop.

They also use **data packing** — concatenating shorter samples into fixed-length sequences (Figure 5). T2I, editing, MMU, and text samples differ in length by orders of magnitude, so naive batching wastes GPU on padding. Packing lifts effective throughput substantially.

The training engine is dFactory (Inclusion AI's in-house dLLM-specific framework, built on top of VeOmni).

## Experimental results

### Multimodal understanding — 21 benchmarks

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/tab2-mmu-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: Comprehensive comparison across 21 multimodal understanding benchmarks. LLaDA2.0-Uni vs specialist VLMs (Qwen2.5-VL-7B, LLaDA-V) and unified models (BAGEL, InternVL-U, Lumina-DiMOO, LLaDA-o)."
   zoomable=true %}

Two comparisons stand out.

**1. Decisive lead over peer unified diffusion models.**

- MMStar: 64.1 (LLaDA2.0-Uni) vs 58.0 (LLaDA-o), 61.0 (Lumina-DiMOO) → +6.1, +3.1
- MMMU val: 50.1 vs 44.9 (LLaDA-o); Lumina-DiMOO is higher (58.6) but pays for it elsewhere
- HallusionBench: 50.2 vs 47.4 (LLaDA-o) vs 32.9 (Lumina-DiMOO)
- ChartQA: 80.1 vs 87.9 (LLaDA-o) vs 8.3 (Lumina-DiMOO) — Lumina-DiMOO's pixel-VQ tokenizer collapses on chart understanding
- DocVQA: 89.5 vs 91.5 (LLaDA-o) vs 7.2 (Lumina-DiMOO)
- OCRBench: 75.7 vs 74.6 (LLaDA-o) vs 7.6 (Lumina-DiMOO)

**2. Roughly even with specialist VLMs.**

- MMStar: 64.1 vs 63.9 (Qwen2.5-VL-7B), +0.2
- CountBench: 86.0 vs 84.9, +1.1
- Most other benchmarks within ±5% of Qwen2.5-VL-7B

The point is that for the first time, a unified diffusion model holds its own against specialist VLMs on OCR / document understanding. Almost all of that gap is closed by the SigLIP-VQ tokenizer.

### Image generation — GenEval, DPG, OneIG, UniGenBench, CVTG-2k, WISE

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/tab3-geneval.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: GenEval object-centric T2I evaluation. LLaDA2.0-Uni 0.89 (overall) — best among unified models, surpassing top generation-only systems Qwen-Image (0.87) and LongCat-Image (0.87)."
   zoomable=true %}

- **GenEval**: 0.89 overall, Position 0.90 (best across the entire table)
- **DPG-Bench**: 87.76 — best unified, ahead of Z-Image-Turbo (84.86) and HunyuanImage-3.0 (86.10)
- **OneIG-EN**: 0.505 overall, Alignment 0.882, Reasoning 0.323 — best among unified models on each
- **UniGenBench**: 79.63 overall — new unified record. Logic 63.99 and Layout 90.30 even beat several specialized generators
- **CVTG-2k** (multi-region text rendering): unified 1st (0.765 average word accuracy), with the slowest decline as the number of regions grows
- **WISE**: 0.68 (unified 1st), with-thinking 0.78 (+10 points) — gains across Logic, Time, Space, Biology, Physics

The +10 points from "with thinking" mode is the single most interesting result. The same model first generates a reasoning chain in text, then conditions image generation on it — exactly the kind of cross-modal feedback loop that motivates unified models in the first place.

### Image editing — ImgEdit, GEdit, MICo-Bench

- **ImgEdit-Bench**: 3.92 overall — best unified (vs OmniGen2 3.44, InternVL-U 3.67, Lumina-DiMOO 2.77). Adjust 4.16 and Hybrid 4.42 lead the table.
- **GEdit-Bench**: EN 6.61, CN 6.66 — best unified. Perceptual quality 7.52 (EN) / 7.67 (CN), confirming edits don't degrade visual fidelity.
- **MICo-Bench** (multi-reference editing): 47.1 overall — Object 51.0, Person 32.8, HOI 46.0, De&Re 54.4. Twice the score of Lumina-DiMOO (23.3) despite sharing the dLLM family — the difference is data and decoder design.

### Interleaved generation & reasoning

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig7-interleaved.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: Qualitative interleaved generation. Story telling (a skateboarder sequence) and recipe (steak-cooking steps) both produce coherent text–image alternation."
   zoomable=true %}

The authors propose an InterGen Bench (150 samples across 11 categories: Character, Story Telling, Travel Guide, Product Manual, Movie Plot, Event Forecasting, Action Anticipation, Movement Trajectory, Daily Scenarios, Cartoon, Recipe/Cooking, Explanation) and compare with Emu3.5.

- Story Telling: Gemini 6.42 (vs Emu3.5 6.28), Qwen3-VL 7.02 (vs 6.83)
- Event Forecasting: Gemini 5.19 (vs 5.08), Qwen3-VL 5.94 (vs 5.75)
- Explanation: slight loss — 6.22 vs 6.19 on Gemini, 6.35 vs 6.48 on Qwen3-VL

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig8-reasoning.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: Qualitative interleaved reasoning. Top — Newton's second law on a pulley system, with a free-body diagram. Bottom — White-to-move chess problem analyzed by visualizing each candidate move."
   zoomable=true %}

In the chess example, the model draws all four candidate moves (Q×d2, g4, Re1, Q×e2), reasons about each visually, and concludes Q×d2 is correct. In the physics example, it derives the free-body diagram, applies Newton's second law step by step, and arrives at $a = 1.79\,\text{m/s}^2$ and tension $T \approx 23.67\,\text{N}$.

This isn't pure image generation, and it isn't pure CoT — it's *visual reasoning*, where each step is exposed as a text–image pair. That's the kind of behavior unified models are uniquely positioned to produce.

## Analysis & ablations

### SPRINT ablation (Section 5.5.1)

| Method | AI2D | OCRB | MathVista | ChartQA | DocVQA | MMMU | MMStar | GenEval | DPG | Avg | Δ |
|--------|------|------|-----------|---------|--------|------|--------|---------|-----|-----|---|
| LLaDA2.0-Uni | 82.0 | 75.7 | 68.1 | 80.1 | 89.5 | 50.1 | 64.1 | 0.89 | 87.76 | 76.3 | – |
| TPS | 19.5 | 21.2 | 55.0 | 28.7 | 8.0 | 49.4 | 31.7 | 2.8 | 2.7 | 24.3 | – |
| + SPRINT | 80.9 | 73.4 | 67.2 | 81.0 | 89.0 | 52.5 | 63.0 | 0.878 | 86.27 | 75.7 | -0.6 |
| TPS (SPRINT) | 42.9 | 36.0 | 75.0 | 62.3 | 27.6 | 52.2 | 49.2 | 5.1 | 7.8 | 39.8 | ×1.6 |

Average score drops just 0.6 (76.3 → 75.7) for a 1.6× speedup. The biggest gains are on long-output benchmarks — DocVQA 3.5× (8.0 → 27.6 TPS), ChartQA and AI2D 2.2× — because prefix pruning compounds across many denoising iterations.

Strikingly, SPRINT *improves* MMMU by +2.4 and ChartQA by +0.9. The non-uniform unmasking schedule reallocates forward-pass budget toward uncertain positions — "easy" tokens are settled fast, "hard" tokens get extra passes within the same step count.

The biggest losses are on **OCRBench (-2.3)** and **DPG (-1.5)** — OCR is character-level so the threshold $\tau = 0.93$ may admit insufficiently refined tokens, and DPG's dense prompts probably benefit from a more conservative schedule.

### Diffusion decoder distillation (Section 5.5.2)

| Method | Speed (s/img) | GenEval | DPG | UniGenBench | OneIG-EN | WISE |
|--------|---------------|---------|------|-------------|----------|------|
| Diffusion Decoder (50 steps) | 32.95 | 0.89 | 87.76 | 79.63 | 0.505 | 0.68 |
| Diffusion Decoder Turbo (8 steps) | 2.90 | 0.87 | 87.24 | 79.76 | 0.500 | 0.68 |

The 8-step Turbo gives an 11.4× speedup at the cost of GenEval -0.02, DPG -0.52, and UniGenBench *gains* +0.13. WISE is unchanged.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/fig9-decoder-distill.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9: 50-step decoder (top) vs 8-step distilled decoder (bottom). Visually almost indistinguishable."
   zoomable=true %}

Side by side the two are essentially indistinguishable. The combination of consistency-based distillation with UCGM's second-order JVP approximation (following Lu & Song's simplifying continuous-time consistency) is the active ingredient.

## Limitations and critical assessment

The authors acknowledge:

- **Visual detail.** SigLIP-VQ captures semantics well but misses fine-grained pixel detail (small text, fine textures). Detail-sensitive editing tasks suffer.
- **Interleaved capabilities need scaling.** 8M reasoning-augmented SFT samples isn't enough to fully unlock complex multi-step interleaved reasoning — both data and capacity need to scale.
- **RL is unfinished.** Post-training a unified dLLM with RL is in early stages; details promised for a future release.

I'd add the following.

- **Specialist VLM gap is *narrowed*, not closed.** ChartQA 80.1 vs Qwen2.5-VL-7B 84.1, DocVQA 89.5 vs 94.9, OCRBench 75.7 vs 84.2 — a -4 to -8 point gap on OCR-heavy tasks isn't trivial in production.
- **The "mutual enhancement" claim is under-quantified.** The authors motivate unified models by understanding ↔ generation reinforcement, but the only direct evidence is WISE's +10 points in thinking mode. An ablation training generation-only and understanding-only at Stage 0 would tighten the case considerably.
- **Compute comparison is missing.** A 16B MoE backbone plus a 6B decoder trained on ~390B tokens (100B + 210B + 80B) is hard to compare directly against Qwen2.5-VL-7B. It's unclear whether the head-to-head against LLaDA-o uses comparable compute.
- **Self-proposed benchmark for interleaved.** InterGen Bench (150 samples) is built by the same team that ships the model, and is used as the headline interleaved-generation evidence vs Emu3.5. External benchmarks like ISG-Bench or OpenING would carry more weight.
- **Baseline heterogeneity.** The unified-diffusion table compares LLaDA-o, Lumina-DiMOO, MMaDA, BAGEL, InternVL-U, NextFlow with very different training datasets and recipes. A controlled head-to-head with at least one re-trained baseline would harden the claims.

## Takeaways

- **Semantic-aligned VQ tokenizers are the unlock for unified diffusion.** OCRBench 7.6 (Lumina-DiMOO, pixel VQ) versus 75.7 (LLaDA2.0-Uni, semantic VQ) is a 10× swing from a single design choice. Decoupling the tokenizer (semantic) from the decoder (a separate diffusion model conditioned only on those tokens, no text) is a clean answer to "how do we discretize images for an LLM without breaking either understanding or generation?"
- **Block-wise attention is becoming the de-facto compromise.** Pure bidirectional attention breaks text; pure AR loses dLLM's parallel decoding. BDLM's block-wise pattern is what MMaDA, Lumina-DiMOO, and LLaDA2.0-Uni all converge on.
- **Decoder distillation is removing one of the largest costs.** 50→8 steps for a 11.4× speedup with no perceptible quality loss means inference cost analysis for unified models has to shift focus. The decoder is no longer the bottleneck — the dLLM backbone's KV cache and multi-step denoising are. Training-free accelerators like SPRINT matter more than ever.
- **Unified models' strongest value proposition is interleaved reasoning.** Specialists still win at pure T2I or pure VQA. But "draw the chess board to analyze each candidate move" or "produce the free-body diagram while solving the physics problem" is something you can only get cleanly from one model. WISE-with-thinking's +10 points is the first quantitative evidence that this matters at benchmark scale.
- **The dLLM track has finally caught up to the AR track for unified models.** Until LLaDA2.0-Uni, dLLM-based unified models were "interesting research" — the AR + diffusion hybrids (BAGEL, OmniGen2) led the pack. This paper is the first to take unified-model #1 spots on understanding, generation, and editing benchmarks simultaneously. The interesting comparisons going forward will be LLaDA2.0-Uni vs BAGEL vs OmniGen2.

## Setup and usage

Code is on [GitHub](https://github.com/inclusionAI/LLaDA2.0-Uni) and the model is on [HuggingFace](https://huggingface.co/inclusionAI/LLaDA2.0-Uni). The snippet below sketches the typical inference flow — check the repo README for the exact API since it may change after release.

```python
from transformers import AutoTokenizer, AutoModel
from PIL import Image

model = AutoModel.from_pretrained(
    "inclusionAI/LLaDA2.0-Uni",
    trust_remote_code=True,
    torch_dtype="bfloat16",
).cuda()
tok = AutoTokenizer.from_pretrained("inclusionAI/LLaDA2.0-Uni", trust_remote_code=True)

# 1. Image understanding
img = Image.open("chart.png")
out = model.generate(
    text="What region had the highest rainfall in any single month?",
    images=[img],
    max_new_tokens=128,
)
print(tok.decode(out[0]))

# 2. Text-to-image
img_out = model.generate_image(
    prompt="A small anthropomorphic teapot saying 'I think I need a little more tea'",
    height=1024, width=1024,
    num_inference_steps=8,   # distilled turbo decoder
)
img_out.save("teapot.png")

# 3. Image editing
edit_out = model.edit_image(
    image=Image.open("blackboard.png"),
    instruction="Change the text on the blackboard to 'LLaDA Coffee'",
    num_inference_steps=8,
)
```

## References

- Paper: [arXiv:2604.20796](https://arxiv.org/abs/2604.20796)
- Code: [github.com/inclusionAI/LLaDA2.0-Uni](https://github.com/inclusionAI/LLaDA2.0-Uni)
- Model: [HuggingFace](https://huggingface.co/inclusionAI/LLaDA2.0-Uni)
- LLaDA series team: AGI Research Center, Inclusion AI

## Further reading

- **[Large Language Diffusion Models (LLaDA)](https://arxiv.org/abs/2502.09992)** (Nie et al., 2025) — the starting point of the diffusion-LLM line this paper extends. First showed an 8B dLLM could rival LLaMA3-8B and that in-context learning and instruction-following carry over.
- **[LLaDA-V](https://arxiv.org/abs/2505.16933)** (You et al., 2025) — visual instruction tuning on top of LLaDA; the same group's direct precursor to the multimodal extension here.
- **[MMaDA](https://arxiv.org/abs/2505.15809)** (Yang et al., 2025) — modality-agnostic dLLM unified architecture with mixed-CoT and UniGRPO RL. The closest competitor LLaDA2.0-Uni explicitly benchmarks against.
- **[Lumina-DiMOO](https://arxiv.org/abs/2510.06308)** (Xin et al., 2025) — another omni dLLM. The most striking weakness comparison in this paper (OCR/Chart) is against Lumina-DiMOO, which makes it the cleanest test case for "why semantic VQ matters."
- **[BAGEL: Emerging Properties in Unified Multimodal Pretraining](https://arxiv.org/abs/2505.14683)** (Deng et al., 2025) — the flagship AR + diffusion hybrid (7B active / 14B total MoE). First serious quantification of "emerging" multimodal capabilities from interleaved scaling.
- **[Block Diffusion](https://arxiv.org/abs/2503.09573)** (Arriola et al., ICLR 2025) — the source of LLaDA2.0-Uni's BDLM loss and block-wise attention pattern. A formal framework for interpolating between AR and diffusion language models.
- **[X-Omni](https://arxiv.org/abs/2507.22058)** (Geng et al., 2025) — the direct origin of the SigLIP-VQ tokenizer design. Showed that adding RL to discrete AR closes the quality gap — effectively a parent paper for LLaDA2.0-Uni's tokenizer choice.
- **[SigLIP 2](https://arxiv.org/abs/2502.14786)** (Tschannen et al., 2025) — the vision encoder that LLaDA2.0-Uni's SigLIP-VQ is built on. Multilingual + dense features make it a good backbone for a semantic-aligned quantizer.
- **[Z-Image](https://arxiv.org/abs/2511.22699)** (Cai et al., 2025) — the 6B single-stream diffusion transformer used as the diffusion decoder's starting point. An efficiency-first generative architecture that pairs naturally with a distilled decoder.

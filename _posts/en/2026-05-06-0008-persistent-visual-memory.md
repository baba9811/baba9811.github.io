---
layout: post
title: "[Paper Review] Persistent Visual Memory: Sustaining Perception for Deep Generation in LVLMs"
date: 2026-05-06 12:00:00 +0900
description: "An autoregressive LVLM's visual attention collapses as O(t⁻¹) under growing textual history. PVM adds a parallel retrieval branch alongside each FFN to restore visual perception during deep generation."
tags: [lvlm, vision-language, attention, hallucination, multimodal-reasoning, qwen3-vl]
categories: paper-review
giscus_comments: false
related_posts: false
thumbnail: assets/img/papers/0008-persistent-visual-memory/fig4-pvm-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0008-persistent-visual-memory/
ko_url: /papers/0008-persistent-visual-memory/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Siyuan Huang, Xiaoye Qu†, Yafu Li, Tong Zhu, Zefeng He, Muxin Fu, Daizong Liu, Wei-Long Zheng, Yu Cheng† (Shanghai AI Lab · SJTU · CUHK et al.) |
| Venue | arXiv preprint · 2026-05-01 |
| arXiv | [2605.00814](https://arxiv.org/abs/2605.00814) |
| Code | [huaixuheqing/PVM](https://github.com/huaixuheqing/PVM) |
| <span style="white-space: nowrap">Review date</span> | 2026-05-06 |

## TL;DR

- **What** — The paper identifies *Visual Signal Dilution*, a structural phenomenon in autoregressive LVLMs where the attention mass allocated to visual tokens collapses as $\mathcal{O}(t^{-1})$ with growing textual history $t$, and proposes **Persistent Visual Memory (PVM)** to fix it head-on.
- **How** — A lightweight bottleneck adapter runs *in parallel* with each Transformer FFN, treating the hidden state as a Query that cross-attends to the original visual embeddings. The crucial point is **independent attention normalization**: PVM's partition function sums only over the fixed visual set $\mathcal{V}$, so it is structurally decoupled from the growing textual history. A Visual Silencing Mask activates the branch only on text tokens, and a learnable scalar gate $\lambda$ (initialized to 0) injects the result via a residual connection.
- **Results** — On Qwen3-VL-8B, PVM lifts the average across 8 multimodal benchmarks from 66.7 to 71.5 (+4.8). The 4B variant matches the relative gain (64.0 → 68.4, +4.4). Extra parameters: 27.92M (~0.32% of the 8B model). TPOT increases by only 1.18 ms (24.28 → 25.46), a 4.6% throughput cost. The improvement scales monotonically with output length — Very Short +6.1%, Long +27.3% — exactly as the dilution theory predicts.

## Introduction

LVLMs have moved well beyond image captioning. Recent systems like Qwen3-VL, InternVL3.5, and GLM-4.1V-Thinking handle multi-step visual reasoning, long-document OCR, and multi-image dialogue. They all share an assumption baked into the architecture: drop the image encoder's output into the prefix of the autoregressive sequence and let the decoder retrieve visual evidence on demand via attention.

That assumption frays as responses get longer. In math chain-of-thought, in long document analysis, in any setting that asks the model to walk through many reasoning steps, the model gradually *forgets* what it saw. This paper elevates the phenomenon from a hand-wavy "long-output hallucination" complaint to a **structural attention bottleneck**: the visual set has fixed size $M$, but textual history grows monotonically with $t$, and softmax normalization erodes visual mass at $\mathcal{O}(t^{-1})$.

What makes the paper worth reading right now is the combination. First, it provides a **mathematical lower-bound proof** of dilution — not yet another empirical complaint, but a partition-function decomposition that nails the asymptotic decay as a theorem. Second, the proposed fix touches only ~0.32% of the parameters and lifts Qwen3-VL 4B/8B by a consistent +4.4–4.8 average accuracy. Against an iso-parameter MLP control on the same SFT+GRPO pipeline, PVM still wins by +2.5 — the architecture itself is doing the work, not the extra capacity.

## Key Contributions

- **Theorem 3.1: a formal characterization of Visual Signal Dilution.** By decomposing the softmax partition function into visual ($Z_{\mathcal{V}}$) and textual ($Z_{\mathcal{T}}$) aggregate masses, the authors prove that the visual attention mass $\Omega_{\mathcal{V}}(t)$ asymptotically decays as $\mathcal{O}(t^{-1})$. They further characterize a *Low-Attention Equilibrium* in the saturation phase, where dilution halts but the visual mass plateaus orders of magnitude below the textual mass.
- **PVM as a parallel retrieval architecture.** A bottleneck branch (Projection → Cross-Attn → FFN → Restoration) runs alongside the frozen FFN, with a Visual Silencing Mask and a learnable gate $\lambda$. The retrieval module's partition function is *confined to $\mathcal{V}$*, giving a *local invariance property* (Theorem 4.1) that decouples visual relevance from $t$ at the algebraic level.
- **Robust, scalable empirical wins on 8 benchmarks.** +4.8 average on 8B, +4.4 on 4B — a consistent gain across model scales. Length-stratified analysis shows the relative improvement grows monotonically with output length, a direct experimental signature of the dilution theorem.
- **Mechanistic evidence via LogitLens.** PVM's KL-divergence trajectory drops more steeply right after Layer 8 and opens a clear *Improvement Gap* against strong baselines as depth increases — internal predictions are not just more accurate, they converge faster.

## Related Work and Background

### Persistence of visual signals in LVLMs

Stacking a vision encoder (CLIP, SigLIP2, EVA) onto an LLM is the dominant LVLM recipe since LLaVA. The fusion mechanism has evolved from a simple linear projection (LLaVA), to Q-Formers (BLIP-2, InstructBLIP), to multi-layer fusion (DeepStack), but they all share the same skeleton: visual tokens enter the sequence once at the prefix and live there forever.

The weakness shows up in long generation. Hallucination surveys consistently report that visual fidelity degrades with response length. Earlier work tended to frame this as an alignment problem to be patched with better data or RLHF; this paper argues it is an *architectural* problem inherent to the attention mechanism — fixed visual cardinality vs. unbounded text accumulation in a shared softmax.

### The visual injection lineage and its trade-off

The most direct response to that bottleneck has been **visual re-injection**. MemVR (Zou et al., 2024) re-injects raw visual tokens as FFN key-value memories when the model exhibits high uncertainty. ICoT (Gao et al., CVPR 2025) selects image regions via attention maps and *interleaves* them into the reasoning chain. CoMemo (Liu et al., ICML 2025) splits processing into a context-image path and an image-memory path.

These methods help, but they create *serial interference*: re-injecting visual tokens into the autoregressive stream perturbs the logical state used for step-by-step deduction. As the paper puts it, reinforcing visual presence comes at the cost of disrupting the precise logical states required for complex reasoning. PVM reframes the problem as a need for a *separated channel*, not an interleaved one.

### FFN as key-value memory

PVM's design draws on Geva et al. (2021) — the result that Transformer feed-forward layers act as key-value memories, mapping learned patterns to vocabulary distributions. PVM extends that intuition by placing a *parallel* memory branch next to the FFN, with the original visual embeddings as keys and values. The static, weight-encoded knowledge stays in the FFN; the dynamic, input-specific visual evidence sits in PVM. The two streams never share normalization.

## Method and Architecture

### Visual Signal Dilution: theoretical setup

For a query $\mathbf{q}_t$ at the current step, let $s_k(\mathbf{q}_t) = (\mathbf{q}_t^{\top} \mathbf{k}_k) / \sqrt{d}$ be the unnormalized score for the $k$-th context token. Partition the context into the visual set $\mathcal{V}$ ($|\mathcal{V}| = M$, fixed) and the textual history $\mathcal{T}_t$ ($|\mathcal{T}_t| = t$, monotonically growing). Decompose the softmax denominator into the two aggregate unnormalized masses:

$$
Z_{\mathcal{V}}(\mathbf{q}_t) = \sum_{k \in \mathcal{V}} \exp(s_k(\mathbf{q}_t)), \quad Z_{\mathcal{T}}(\mathbf{q}_t, t) = \sum_{k \in \mathcal{T}_t} \exp(s_k(\mathbf{q}_t)).
$$

Define the **Visual Attention Mass**:

$$
\Omega_{\mathcal{V}}(t) := \sum_{k \in \mathcal{V}} \alpha_{t, k} = \frac{Z_{\mathcal{V}}(\mathbf{q}_t)}{Z_{\mathcal{V}}(\mathbf{q}_t) + Z_{\mathcal{T}}(\mathbf{q}_t, t)}.
$$

The asymmetry between the two terms drives everything. $Z_{\mathcal{V}}$ has at most $M$ summands and is upper-bounded by $\beta = M \cdot \exp(s_{\max})$ thanks to input normalization. $Z_{\mathcal{T}}$, under a *persistent textual relevance* assumption ($t^{-1} Z_{\mathcal{T}}(\mathbf{q}_t, t) \ge \mu > 0$), accumulates **linearly** with $t$.

#### Theorem 3.1 (Visual Signal Dilution)

Given a fixed visual context size $M$ and a textual lower bound $\mu$:

$$
\Omega_{\mathcal{V}}(t) \le \frac{\beta}{\beta + \mu \cdot t} = \mathcal{O}(t^{-1}). \tag{2}
$$

The proof is one substitution: plug $Z_{\mathcal{V}} \le \beta$ and $Z_{\mathcal{T}} \ge \mu t$ into the definition of $\Omega_{\mathcal{V}}$, and the linear $\mu t$ term in the denominator dominates as $t$ grows.

#### Phase II: the high-magnitude saturation trap

In practice, $Z_{\mathcal{T}}$ does not grow forever. Once $t$ exceeds the effective attention window $W_{\text{eff}}$, the textual mass plateaus at $Z_{\mathcal{T}}^{\text{sat}}$. But saturation does *not* rescue the visual signal — instead, the system locks into a *Low-Attention Equilibrium*:

$$
\lim_{t \to \infty} \Omega_{\mathcal{V}}(t) \approx \frac{\mathbb{E}[Z_{\mathcal{V}}]}{Z_{\mathcal{T}}^{\text{sat}}} \ll 1.
$$

The decay halts, but at a permanently skewed equilibrium where textual priors outweigh the visual signal by orders of magnitude. That is the mechanism behind long-CoT visual forgetting.

#### Empirical verification

The authors stress-test Qwen3-VL-8B-Instruct on a COCO 2017 subset using a *Blind Painter* prompt — the model is asked to describe an image to a hypothetical blind painter, brushstroke by brushstroke, until token limit. The prompt forces *active visual retrieval* at every step rather than letting the model coast on cached perception, isolating dilution from generic text-generation behavior.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0008-persistent-visual-memory/fig2-3-dilution-empirical.png"
   class="img-fluid rounded z-depth-1"
   caption="Figures 2, 3: Empirical verification of visual signal dilution. (Left) On a log scale, $\\Omega_{\\mathcal{V}}$ tracks the $\\mathcal{O}(t^{-1})$ trajectory predicted by Theorem 3.1. (Right) The Text-to-Visual Ratio (TVR) follows the two-phase mechanism — linear accumulation, then a saturation plateau where textual priors structurally overwhelm visual signals."
   zoomable=true %}

A layer-wise breakdown reveals the decay is not uniform — *intermediate layers 8-27* suffer the steepest drop, which is exactly where multimodal reasoning lives. That's a natural place to insert a retrieval module.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0008-persistent-visual-memory/fig7-attention-heatmap.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: Spatiotemporal decay heatmap of Visual Attention Mass on Qwen3-VL-8B-Instruct under the Blind Painter stress test. Intermediate layers (8-27) show the steepest collapse over time, providing the empirical basis for PVM's default injection layers."
   zoomable=true %}

Two design insights fall out of the analysis:

> **Insight 1.** Because the autoregressive stream dilutes visual signals, we need a parallel memory pathway *structurally isolated* from the main reasoning backbone.
>
> **Insight 2.** To prevent textual dominance in the partition function, the retrieval mechanism needs *independent attention normalization*, confined entirely to the closed visual domain.

### The PVM module

PVM operationalizes both insights directly.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0008-persistent-visual-memory/fig4-pvm-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Overview of the PVM framework. The module runs as a parallel branch alongside the frozen FFN. The hidden state is the Query, original visual embeddings are the Keys/Values. The bottleneck adapter (Projection → Cross-Attn → FFN → Restoration) outputs a residual that is gated by a Visual Silencing Mask (text-only activation) and a learnable scalar $\\lambda$ initialized to 0."
   zoomable=true %}

#### Two parallel paths

The MHSA output hidden state $\mathbf{x} \in \mathbb{R}^d$ branches into two:

- **Reasoning Path (Original):** $\mathbf{h}_{\text{ffn}} = \text{FFN}(\mathbf{x})$. The frozen FFN keeps the model's pretrained static knowledge and logical patterns intact.
- **Looking Path (PVM):** the same $\mathbf{x}$ acts as the Query for a dedicated retrieval module that pulls visual details on demand.

#### The PVM module: three stages

For parameter efficiency, PVM operates in a projected latent space $d' < d$. Visual features are $\mathbf{V}_{\text{img}} \in \mathbb{R}^{M \times d}$.

1. **Projection.** Two independent reducers $\mathbf{W}_{\text{down}}^{\text{txt}}, \mathbf{W}_{\text{down}}^{\text{vis}} \in \mathbb{R}^{d \times d'}$ map the hidden state and the visual features into the latent space:

   $$
   \mathbf{x}_{\text{lat}} = \mathbf{x} \mathbf{W}_{\text{down}}^{\text{txt}}, \quad \mathbf{V}_{\text{lat}} = \mathbf{V}_{\text{img}} \mathbf{W}_{\text{down}}^{\text{vis}}.
   $$

2. **Latent Retrieval.** A cross-attention layer with Q = $\mathbf{x}_{\text{lat}}$ and K = V = $\mathbf{V}_{\text{lat}}$. This is the load-bearing piece of the design: the attention domain is restricted entirely to $\mathcal{V}$, realizing *independent attention normalization*. A lightweight latent FFN follows:

   $$
   \mathbf{h}_{\text{attn}} = \text{CrossAttn}(Q = \mathbf{x}_{\text{lat}}, K = \mathbf{V}_{\text{lat}}, V = \mathbf{V}_{\text{lat}}), \quad \mathbf{h}_{\text{lat}} = \mathbf{h}_{\text{attn}} + \text{FFN}_{\text{lat}}(\text{RMSNorm}(\mathbf{h}_{\text{attn}})).
   $$

3. **Restoration.** An up-projection $\mathbf{W}_{\text{up}} \in \mathbb{R}^{d' \times d}$ maps back to the model dimension: $\mathbf{h}_{\text{pvm}} = \mathbf{h}_{\text{lat}} \mathbf{W}_{\text{up}}$.

#### Gated fusion with selective activation

Two safeguards control how PVM injects into the main stream:

- **Visual Silencing Mask** $\mathcal{M}_{\text{txt}} \in \{0, 1\}^L$: 1 for text tokens, 0 for image tokens. This blocks the self-reflexive loop where visual tokens would retrieve themselves.
- **Learnable scalar gate $\lambda$**: initialized to 0, so PVM contributes nothing at the start of training. Pretrained capabilities are preserved during the warm-up.

Final fusion:

$$
\mathbf{y} = \mathbf{x} + \mathbf{h}_{\text{ffn}} + \underbrace{(\lambda \cdot \mathbf{h}_{\text{pvm}}) \cdot \mathcal{M}_{\text{txt}}}_{\text{Active Visual Injection}}. \tag{3}
$$

The full forward pass:

{% include figure.liquid loading="eager"
   path="assets/img/papers/0008-persistent-visual-memory/algo1-forward-pass.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 1: Forward pass of a PVM-enhanced Transformer block. Stage 1 runs standard self-attention. Stage 2 bifurcates into the frozen FFN (Path A) and the PVM branch (Path B), which compresses to latent space (B1), runs gated cross-attention plus a latent FFN (B2), then restores and applies the silencing mask (B3). Stage 3 fuses everything via $\\mathbf{y} = \\mathbf{x} + \\mathbf{h}_{\\text{ffn}} + \\text{injection}$."
   zoomable=true %}

### Theorem 4.1: structural mitigation of dilution

In the PVM branch, let $\psi_k = \frac{1}{\sqrt{d'}} \mathbf{x} \mathbf{W}_Q (\mathbf{v}_k \mathbf{W}_K)^{\top}$ be the unnormalized score for the $k$-th visual token, and let $\beta_k(\mathbf{x}) = \exp(\psi_k) / Z_{\text{pvm}}(\mathbf{x})$ denote the probability mass. The crucial observation:

$$
Z_{\text{pvm}}(\mathbf{x}) = \sum_{j \in \mathcal{V}} \exp(\psi_j)
$$

depends only on the fixed visual set $\mathcal{V}$. Sequence length $t$ does not appear anywhere in the definition — neither in the score $\psi_k$ nor in the summation index.

**Theorem 4.1 (Structural Mitigation of Visual Dilution).** Conditioning on a fixed local hidden state $\mathbf{x}$, the retrieval representation $\mathbf{h}_{\text{pvm}}$ is decoupled from the textual-history length $t$ in its partition function and satisfies the *local invariance property*:

$$
\frac{\partial \|\mathbf{h}_{\text{pvm}}\|}{\partial t} = 0.
$$

This stands in direct contrast with the standard backbone, where $\Omega_{\mathcal{V}}(t) \in \mathcal{O}(t^{-1})$. PVM cuts that dependency at the algebraic level.

> The authors are careful to disclose the caveat in Appendix B: in real autoregressive generation, $\mathbf{x}_t$ itself drifts with context, so the *fixed local query* assumption does not hold globally. The structural isolation of the partition function still removes the direct dilution mechanism, but the theorem is a *local* guarantee, not a global one.

## Training Objective

PVM trains in two stages.

### Stage I: Visual Memory Alignment (SFT)

The LLM backbone, vision encoder, and projector are all *frozen*; only the PVM modules and gating scalars $\lambda$ are trained. The objective is standard autoregressive cross-entropy. The point of this stage is purely to align textual queries with the right visual keys — a clean, focused task.

- Data: $\mathcal{D}_{\text{sft}}$, 526k samples filtered from OpenMMReasoner-SFT-874K (Zhang et al., 2025) for visual centricity and answer clarity.
- Hyperparameters: AdamW, LR 1e-4 with cosine schedule, warmup 0.1, global batch 64, gradient accumulation 8.

### Stage II: Policy Refinement (GRPO)

The LLM backbone and PVM are unfrozen (vision encoder remains frozen), and Group Relative Policy Optimization (Shao et al., 2024) drives complex-reasoning improvements. The point of this stage is to push active visual retrieval into the long CoT.

- Data: $\mathcal{D}_{\text{rl}}$, 3.6k complex reasoning queries aggregated from MMK12, ThinkLite-VL-hard, ViRL39K, and We-Math2.0-Pro. Each query yields 8 rollouts; only the highest-signal samples are kept.
- Hyperparameters: AdamW, LR 1e-6 constant, group size $G$=8, max completion length 16384, KL coefficient 0.0.

The GRPO surrogate objective is:

$$
\mathcal{L}_{\text{GRPO}}(\theta) = \mathbb{E}_{q, \{o_i\}_{i=1}^G} \left[ \frac{1}{G} \sum_{i=1}^{G} \min\left( \frac{\pi_\theta(o_i \mid q)}{\pi_{\theta_{\text{old}}}(o_i \mid q)} A_i, \, \text{clip}\left(\frac{\pi_\theta(o_i \mid q)}{\pi_{\theta_{\text{old}}}(o_i \mid q)}, 1-\epsilon, 1+\epsilon\right) A_i \right) \right]
$$

with $A_i = (r_i - \text{mean}(\mathbf{r})) / \text{std}(\mathbf{r})$ as the group-relative advantage. By replacing PPO's critic with group statistics, GRPO trades a separate value model for cheaper memory.

## Data and Pipeline

| Stage | Dataset | Size | Trainable | Goal |
|-------|---------|------|-----------|------|
| Stage I (SFT) | OpenMMReasoner-SFT subset $\mathcal{D}_{\text{sft}}$ | 526k | PVM + gate $\lambda$ (LLM, vision encoder, projector frozen) | Visual memory alignment |
| Stage II (GRPO) | MMK12 + ThinkLite-VL-hard + ViRL39K + We-Math2.0-Pro $\mathcal{D}_{\text{rl}}$ | 3.6k complex reasoning | LLM + PVM unfrozen, vision encoder frozen | Policy refinement for deep reasoning |

| Setting | Value |
|---------|-------|
| Backbone | Qwen3-VL-Instruct (4B / 8B) |
| Injection layers | 8B: $\{8, 16, 24\}$ — 4B: $\{5, 11, 17\}$ |
| Latent dim $d'$ | 512 |
| Extra params | 27.92M (~0.32% of the 8B model) |
| GPUs | 8× NVIDIA H200 (141 GB VRAM each) |
| Optimization | DeepSpeed ZeRO-2 (SFT) / ZeRO-3 (GRPO), FlashAttention-2, gradient checkpointing |
| Precision | bfloat16 |

## Experiments

### Main benchmarks

The eight benchmarks split into General & Comprehensive (MMMU$_{\text{dev}}$, MMBench-CN$_{\text{lite}}$, MMBench-EN$_{\text{lite}}$, MMStar, MMT$_{\text{emo}}$) and Math & Science (MathVerse$_{\text{V}}$, MathVision$_{\text{mini}}$, AI2D$_{\text{lite}}$). All numbers are 4-run averages at temperature 0.7, evaluated with lmms-eval.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0008-persistent-visual-memory/tab1-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Main results on 8 multimodal benchmarks (4-run average, %). PVM-8B (SFT+GRPO) reaches 71.5 vs. 66.7 for the Qwen3-VL-8B-Instruct baseline (+4.8). PVM-4B improves 64.0 → 68.4 (+4.4), matching the relative gain."
   zoomable=true %}

The 8B numbers, in order:

> Qwen3-VL-8B-Instruct 66.7 → SFT 67.4 → LoRA-SFT 67.5 → **PVM-8B (SFT) 70.6** → SFT+GRPO 68.3 → LoRA-SFT+GRPO 68.4 → **PVM-8B (SFT+GRPO) 71.5**

PVM-SFT alone beats vanilla SFT by +3.2 and LoRA-SFT by +3.1. Adding GRPO pushes the average to 71.5, ahead of strong RL-tuned competitors Euclid-8B (69.5), PEARL-8B (69.3), and OneThinker-8B (68.0). The 4B variant shows the same pattern with the same magnitude of improvement — the gain is *scalable*, not pasted onto a particular model size.

PVM also clears the visual-injection baselines reimplemented on the same Qwen3-VL-8B backbone (MemVR 66.5, ICoT 68.3, CoMemo 68.4) by 3-5 points. Because everything below the injection mechanism is identical, the delta isolates the architectural choice.

### Robustness to extended generation

This is the cleanest direct test of Theorem 3.1. The authors stratify MathVerse$_{\text{V}}$ samples into four equal-sized groups by output token length and compare PVM-8B (SFT+GRPO) against the Qwen3-VL-8B-Instruct baseline.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0008-persistent-visual-memory/fig5-6-token-length-and-kl.png"
   class="img-fluid rounded z-depth-1"
   caption="Figures 5, 6: Length robustness and prediction-convergence speedup. (Left) Relative gain on MathVerseV grows monotonically with output length, from +6.1% (Very Short) to +27.3% (Long) — PVM's effect amplifies with depth. (Right) LogitLens KL divergence drops faster for PVM after Layer 8, opening a clear improvement gap as depth increases."
   zoomable=true %}

Relative gain grows strictly: Very Short +6.1%, Short +7.3%, Medium +17.0%, Long **+27.3%**. *PVM helps more, the more visual dilution the baseline suffers from.* In the Long group the baseline only scores 39.1; PVM lifts that to 49.8. This is the experimental signature you'd want for a method motivated by a length-dependent theorem.

### Mechanistic analysis: prediction convergence

Following Cheng et al. (2026), the authors apply the LogitLens technique (nostalgebraist, 2020; Belrose et al., 2023) to probe internal prediction dynamics. Each intermediate hidden state $\mathbf{h}_\ell$ is projected through the unembedding matrix $\mathbf{E}$ to a vocabulary-space distribution $P_\ell$, and the KL divergence to the final-layer distribution measures how decided the model already is at depth $\ell$:

$$
D_{\text{KL}}(P_{\text{final}} \| P_\ell) = \sum_{v=1}^{V} P_{\text{final}}(v) \log \frac{P_{\text{final}}(v)}{P_\ell(v)}.
$$

Lower KL means earlier convergence. Figure 6 shows that baselines (Qwen3-VL-8B, Euclid-8B, CoMemo) all decline gradually, while PVM follows a *distinctly lower trajectory* right after the first injection point at Layer 8, with an *Improvement Gap* that widens through the deep layers.

The reading is straightforward. PVM offloads visual retrieval to the parallel branch, which lets the backbone finish the perception → reasoning transition faster. The model is not just more accurate; it *decides earlier*. That is qualitatively different from a capacity boost.

## Ablation Studies

### Retrieval source: raw visual vs. processed hidden states

PVM's central design choice is to use the *raw* visual embeddings as cross-attention K/V. What if you replace them with current processed hidden states ($K = V = \mathbf{x}$) and retrain end-to-end?

| Retrieval Source $(K, V)$ | MathVerse | MathVision | AI2D | Avg. |
|----------------------------|-----------|------------|------|------|
| Baseline | 52.9 | 45.4 | 79.8 | 59.4 |
| Processed Hidden States | 27.9 | 14.1 | 58.2 | 33.4 |
| **Visual Embeddings (Ours)** | **57.5** | **50.7** | **80.8** | **63.0** |

Re-attending to processed hidden states triggers a *catastrophic collapse* — 25+ points below the baseline. The authors interpret it as a destructive self-reflexive loop: by the time hidden states are deep enough to access, they are already contaminated by textual dominance, and re-injecting them only amplifies the dilution. This is strong evidence that PVM's gain comes from the retrieval design, not the additional parameters.

### Injection layer selection

Three placement strategies for the 8B model:

- **Peak Attention** (13, 17, 18): reinforce layers with the highest visual mass.
- **Max Decay** (14, 19, 22): patch the layers where mass drops fastest.
- **Strided** (8, 16, 24): uniform stride starting from where visual processing turns on.

| Strategy | Layers | Gen. | Reas. | Avg. |
|----------|--------|------|-------|------|
| Peak Attention | 13, 17, 18 | 72.9 | 60.9 | 68.4 |
| Max Decay | 14, 19, 22 | 74.2 | 61.2 | 69.3 |
| **Strided (Ours)** | **8, 16, 24** | **75.2** | **63.0** | **70.6** |

Strided wins by +1.3 over Max Decay and +2.2 over Peak Attention on average (the authors highlight a +1.8 reasoning-subset gain over Max Decay specifically). The Peak strategy, intuitively appealing, is actually the *worst* — reinforcing layers that already see visuals well yields diminishing returns. The lesson is that *broad coverage matters more than local reinforcement*: PVM's job is global, distributed grounding, not local first aid.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0008-persistent-visual-memory/fig8-layer-distribution.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: Per-layer mean visual attention mass distribution. Layers 0-7 are nearly inactive, the peak sits around layers 13-18, and a gradual decay follows — the \"Rise-Peak-Decay\" shape that guides PVM's data-driven injection strategy."
   zoomable=true %}

### Latent dimension size

| $d'$ | General | Reasoning | Avg. |
|------|---------|-----------|------|
| **512 (Ours)** | **75.2** | **63.0** | **70.6** |
| 1024 | 73.8 | 61.4 | 69.2 |
| 2048 | 74.7 | 61.6 | 69.8 |

Bigger is *not* better. The authors attribute this to data-capacity mismatch: there isn't enough supervision in the SFT corpus to saturate larger bottlenecks, so they end up over-fitting noise. $d' = 512$ sits at the sweet spot of capacity and trainability.

### Iso-parameter control

To rule out the "PVM just adds parameters" objection, the authors train a *parallel MLP* baseline with the exact same parameter count as the PVM modules — but no cross-attention — under the identical SFT+GRPO pipeline.

| Model | MMMU | MMB-CN | MMB-EN | MMStar | MMT | MathVerse | MathVision | AI2D | Avg. |
|-------|------|--------|--------|--------|-----|-----------|------------|------|------|
| SFT + GRPO | 60.7 | 88.8 | 87.9 | 68.6 | 54.2 | 58.5 | 48.0 | 79.6 | 68.3 |
| MLP (SFT+GRPO) | 63.3 | 88.8 | 88.7 | 70.0 | 55.0 | 58.0 | 48.7 | 79.4 | 69.0 |
| **PVM-8B (SFT+GRPO)** | **67.3** | **91.2** | **89.4** | **71.6** | **58.3** | **59.8** | **51.3** | **82.8** | **71.5** |

PVM still beats the MLP control by +2.5 points despite identical parameter counts and identical training. The gain comes from *active visual retrieval*, not from added capacity.

### Inference cost

| Metric | Qwen3-VL-8B Baseline | PVM-Enhanced | Delta |
|--------|----------------------|---------------|-------|
| Decoding throughput | 41.18 tokens/s | 39.28 tokens/s | -4.61% |
| Time per output token (TPOT) | 24.28 ms | 25.46 ms | +1.18 ms |

A single H200, bfloat16, FlashAttention-2. The 1.18 ms TPOT increase is negligible for real-time inference, especially against a +4.8 average accuracy gain.

## Limitations and Critical Assessment

The authors acknowledge the following limitations:

- **Backbone coverage.** Only Qwen3-VL 4B/8B are evaluated. PVM's parallel design is in principle backbone-agnostic, but generalization to InternVL, GLM-4.1V, Pixtral, and Llama-3.2-Vision is left to future work.
- **Fixed local query assumption.** Theorem 4.1's invariance is local — it conditions on a fixed hidden state $\mathbf{x}$. In real autoregressive decoding, $\mathbf{x}_t$ itself drifts with context, so global invariance is not guaranteed. The paper is honest about this in Appendix B.
- **Static visual context.** The work focuses on a single static image. Streaming video or dynamically changing multi-image setups would require a time-varying $\mathcal{V}$ and additional design.

A few additional concerns from the reviewer's side:

- **Hyperparameter robustness.** The strided $\{8, 16, 24\}$ choice clearly fits the 36-layer Qwen3-VL-8B. Whether the same stride pattern translates to deeper or shallower backbones is not tested — the per-layer visual-attention distribution likely shifts with backbone choice, and the strategy may need recalibration.
- **Vision encoder frozen throughout.** Both stages keep the vision encoder frozen, which is reasonable since PVM retrieves from raw visual embeddings. But in domains where the encoder itself is weak (medical imaging, satellite imagery), unfreezing the encoder might offer larger gains than PVM alone.
- **GRPO cost.** Stage II generates 8 rollouts per query at max completion length 16384 across 3.6k queries — that is 28.8k long generations, and GRPO's wall-clock dwarfs SFT. The marginal +0.9 average from GRPO on top of SFT (70.6 → 71.5) is real but modest; whether the cost is worth it depends on deployment economics.
- **Length robustness checked on one benchmark.** Figure 5 is striking, but only MathVerse$_{\text{V}}$ is stratified by length. Long-form summarization, multi-image dialogue, or video QA would each test a different aspect of dilution.

## Takeaways

- **Hallucination is not just an alignment problem.** The decisive contribution here is reframing long-output visual hallucination as a *structural* attention bottleneck. Theorem 3.1 isn't just rhetoric — it tells us this class of problem has to be addressed at the architecture level, not patched with more RLHF data.
- **Two parallel paths beat one shared path.** Reasoning and perception live on separate channels in PVM. The frozen FFN is the static-knowledge lookup; the PVM branch is the dynamic visual retrieval. The split eliminates both dilution and serial interference simultaneously.
- **Independent attention normalization is the load-bearing primitive.** A partition function restricted to the visual set is what makes the local invariance theorem possible and what makes the empirical robustness real. The scope of attention normalization is itself a design knob worth exposing in future architectures.
- **Length stratification should be a default benchmark slice.** A +4.8 average masks the fact that the Long-output gain is +27.3%. LVLM evaluations should routinely stratify by output length — averages alone hide the regime where most users actually hurt.
- **Iso-parameter controls are the cleanest way to validate architectural claims.** Beating an iso-param MLP by +2.5 points is a much stronger statement than beating the original baseline. Treat iso-param control as the default, not a nice-to-have.

## Setup and Usage

The authors provide code at [huaixuheqing/PVM](https://github.com/huaixuheqing/PVM). At review time (2026-05-06) the exact API is best confirmed from the repo directly. A typical usage would look something like:

```python
# Sketch — confirm the actual API in the repo
from pvm import PVMConfig, PVMModel

cfg = PVMConfig(
    backbone="Qwen3-VL-8B-Instruct",
    injection_layers=[8, 16, 24],
    latent_dim=512,
)
model = PVMModel.from_pretrained("huaixuheqing/PVM-8B-SFT-GRPO", config=cfg)

inputs = processor(text=prompt, images=[image], return_tensors="pt")
output = model.generate(**inputs, max_new_tokens=2048, temperature=0.7)
```

## References

- Paper: [arXiv:2605.00814](https://arxiv.org/abs/2605.00814)
- Code: [GitHub: huaixuheqing/PVM](https://github.com/huaixuheqing/PVM)
- Backbone: [Qwen3-VL Technical Report (arXiv:2511.21631)](https://arxiv.org/abs/2511.21631)
- SFT data: [OpenMMReasoner (arXiv:2511.16334)](https://arxiv.org/abs/2511.16334)

## Further Reading

- **[Look Twice Before You Answer: Memory-Space Visual Retracing for Hallucination Mitigation in Multimodal Large Language Models](https://arxiv.org/abs/2410.03577)** (Zou et al., 2024) — Uncertainty-driven re-injection of raw visual tokens as FFN key-value memories. PVM's named MemVR baseline.
- **[Interleaved-Modal Chain-of-Thought](https://arxiv.org/abs/2411.19488)** (Gao et al., CVPR 2025) — Attention-driven selection of image regions interleaved into the reasoning chain. The ICoT baseline in PVM's experiments.
- **[CoMemo: LVLMs Need Image Context with Image Memory](https://arxiv.org/abs/2506.06279)** (Liu et al., ICML 2025) — Dual-path architecture with a context-image path and an image-memory path, plus RoPE-DHR. Another direct PVM baseline.
- **[DeepStack: Deeply Stacking Visual Tokens is Surprisingly Simple and Effective for LMMs](https://arxiv.org/abs/2406.04334)** (Meng et al., NeurIPS 2024) — Multi-layer visual-token stacking. PVM is built on top of a Qwen3-VL backbone that already uses DeepStack-style integration.
- **[Transformer Feed-Forward Layers Are Key-Value Memories](https://arxiv.org/abs/2012.14913)** (Geva et al., EMNLP 2021) — The interpretability result behind PVM's "FFN as key-value memory" intuition; PVM places a parallel memory branch alongside the FFN.
- **[Qwen3-VL Technical Report](https://arxiv.org/abs/2511.21631)** (Bai et al., 2025) — The 4B/8B backbone PVM extends, with native 256K context and DeepStack integration.
- **[DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300)** (Shao et al., 2024) — Source of GRPO, used in PVM's Stage II policy refinement. Replaces PPO's critic with a group-relative baseline.
- **[OpenMMReasoner: Pushing the Frontiers for Multimodal Reasoning with an Open and General Recipe](https://arxiv.org/abs/2511.16334)** (Zhang et al., 2025) — The 874K multimodal reasoning corpus that PVM filters down to 526k samples for SFT.

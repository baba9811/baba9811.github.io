---
layout: post
title: "[Paper Review] Kimi K3: Open Frontier Intelligence"
date: 2026-07-31 14:00:00 +0900
description: "A 2.8T-parameter, 104B-active, 1M-context open-weight MoE. Kimi Delta Attention, Attention Residuals, and Stable LatentMoE push scaling efficiency 2.5x over Kimi K2 to reach the frontier."
tags: [mixture-of-experts, linear-attention, long-context, reinforcement-learning, multimodal, open-weights, llm-infrastructure]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0027-kimi-k3-open-frontier-intelligence/fig2-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0027-kimi-k3-open-frontier-intelligence/
ko_url: /papers/0027-kimi-k3-open-frontier-intelligence/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Kimi Team (Moonshot AI, 400+ contributors) |
| Venue | arXiv · 2026 · open-weight (model weights released) |
| arXiv or DOI | [2607.24653](https://arxiv.org/abs/2607.24653) |
| Code | [moonshotai/Kimi-K3](https://huggingface.co/moonshotai/Kimi-K3) |
| <span style="white-space: nowrap">Review date</span> | 2026-07-31 |

#### TL;DR

- Kimi K3 is a 2.8-trillion (2.78T) parameter native multimodal Mixture-of-Experts model that activates only 104B (104.2B) parameters per token and supports a 1M-token context — released with full open weights.
- Three axes of architectural innovation — Kimi Delta Attention (KDA) along the sequence, Attention Residuals (AttnRes) along depth, and Stable LatentMoE along width — combine to lift overall scaling efficiency roughly 2.5x over Kimi K2.
- Across coding, agentic, knowledge, reasoning, and vision, Kimi K3 sits just below Claude Fable 5 and GPT-5.6 Sol while consistently beating every other open and proprietary model. On WebDev Arena it became the first open model to top the leaderboard.

#### Introduction

For most of the LLM era, "getting better" meant investing more compute before deployment: bigger models on more data. The rise of reasoning models opened a second scaling axis at test time. OpenAI's o-series, Anthropic's extended thinking, DeepSeek-R1, and Kimi K1.5 all elicited sophisticated reasoning behavior from large-scale RL, and Kimi K2.5's Agent Swarm pushed test-time scaling further from sequential reasoning to parallel agent coordination.

The trouble is that these two axes have progressed at very different rates in the open-source ecosystem. The test-time axis (reasoning, agentic RL) advanced rapidly, but the first axis — the pre-trained foundation — stayed near the 1T-parameter regime. When increasingly sophisticated reasoning and agentic RL run on similarly sized pre-trained foundations, open-source models converge on each other while the gap to the strongest proprietary systems widens. Kimi K3 is an attempt to push both axes to the frontier together: it builds an unprecedented 3T-class pre-trained foundation while simultaneously scaling reasoning, reasoning effort, and long-horizon interaction at 1M context.

This paper reads less like an academic paper and more like a 47-page technical report. It covers the full stack of building a production frontier model — architecture, pre-training, post-training, infrastructure, evaluation, and case studies. Why read it now? It packs several rare things into one document: a demonstration that linear attention actually works at 3T scale, a recipe for scaling auxiliary-loss-free MoE routing to 896 experts, and a systems design for running 1M-token agentic RL within a few hundred GPUs — and, crucially, the weights are open.

#### Key Contributions

- **Pre-training at the open frontier.** Combining KDA, AttnRes, Stable LatentMoE, and refined data/training recipes, the team trained a 2.8T native multimodal MoE with 104B active parameters and a 1M context window, improving overall scaling efficiency by roughly 2.5x over Kimi K2.
- **Reinforcement learning for multi-effort test-time scaling.** RL is run across general, agentic, and coding domains and multiple reasoning-effort levels, then consolidated into a single model via Multi-Teacher On-Policy Distillation.
- **Infrastructure for trillion-parameter, million-token intelligence.** KDA systems co-design, MoonEP and memory-efficient infrastructure for 2.8T MoE pre-training, and a co-located RL system with resumable sandboxes for million-token agentic trajectories.
- **An open frontier model.** The full Kimi K3 weights are released, making frontier intelligence available for research, deployment, and further innovation.

From a reviewer's standpoint, the most significant contribution is the **empirical demonstration that linear attention scales to the frontier**. Delta-rule linear attention like KDA had mostly been validated on small models; Kimi K3 makes it the workhorse (three-quarters of all attention layers) of a 2.8T hybrid backbone. As a large-scale counterexample to "linear attention breaks down at scale," this is where the report's center of gravity lies.

#### Background

Three threads are needed to understand Kimi K3.

**Linear attention and the delta rule.** Standard softmax attention grows a KV cache linearly and compute quadratically with sequence length. Linear attention (Katharopoulos et al., 2020) compresses attention into a fixed-size recurrent state, removing that cost. The delta rule (Schlag et al., 2021; Yang et al., DeltaNet) sharply increases expressiveness by updating the state only by the "difference" between new information and the existing state, rather than simply accumulating. Kimi Linear (Kimi Team, 2025) added a channel-wise forget gate to this line, and Kimi K3's KDA is its direct descendant.

**Multi-head Latent Attention (MLA).** MLA, introduced in DeepSeek-V2 (DeepSeek-AI, 2024), compresses each token's key-value representation into a low-dimensional latent vector $\mathbf{c}\_t = \mathbf{W}\_c \mathbf{x}\_t$ for caching and reconstructs it via up-projection at attention time. It shrinks the KV-cache footprint while retaining global token-to-token attention, and Kimi K2/K2.5 already adopted it. Kimi K3 keeps it only in the periodic global-attention layers.

**Mixture-of-Experts and load balancing.** The shared + routed expert structure of DeepSeekMoE (Dai et al., 2024) became the standard. MoE's chronic problem is load balancing: if tokens pile onto a few experts, training destabilizes and expert-parallel training slows. Auxiliary losses were the traditional fix, but DeepSeek-V3 (DeepSeek-AI, 2024) introduced an auxiliary-loss-free scheme (updating a per-expert bias with a sign-based rule). Kimi K3's Quantile Balancing replaces that with an exact quantile solution.

These three threads lead respectively to KDA (sequence mixing), AttnRes (layer mixing), and Stable LatentMoE (channel mixing).

#### Method / Architecture

The Kimi K3 architecture is designed to scale information flow in three directions: sequence length (KDA + Gated MLA hybrid attention), network depth (Attention Residuals), and model width (Stable LatentMoE). A native vision pathway (MoonViT-V2) attaches at the input.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0027-kimi-k3-open-frontier-intelligence/fig2-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: The Kimi K3 architecture. Each block has three KDA layers followed by one Gated MLA layer, with each attention layer paired with a Stable LatentMoE FFN. Attention Residuals use learned pseudo-queries (w) to derive attention weights over the embedding, current block, and preceding block outputs, enabling selective information flow across depth. Top left: Stable LatentMoE. Bottom left: KDA. Bottom right: native vision pathway." %}

### Hybrid Attention: a 3:1 mix of KDA and Gated MLA

Each block places three KDA layers before one Gated MLA layer — a 3:1 ratio. This pattern repeats throughout the backbone, with an extra Gated MLA layer at the end so the final layer always does global attention. In total, 69 KDA + 24 MLA layers (93 layers total). The intuition is simple: handle most token mixing with cheap linear attention (KDA), but periodically insert expensive global attention (MLA) to preserve long-range interaction.

#### Kimi Delta Attention (KDA)

KDA combines a delta-rule recurrence with a channel-wise forget gate. For hidden state $\mathbf{x}\_t \in \mathbb{R}^d$, query/key $\mathbf{q}\_t, \mathbf{k}\_t \in \mathbb{R}^{d\_k}$, value $\mathbf{v}\_t \in \mathbb{R}^{d\_v}$, and recurrent state $\mathbf{S}\_t \in \mathbb{R}^{d\_k \times d\_v}$, a single attention head updates as:

$$
\begin{aligned}
\mathbf{S}_t &= (\mathbf{I} - \beta_t \mathbf{k}_t \mathbf{k}_t^\top)\,\mathrm{Diag}(\boldsymbol{\alpha}_t)\,\mathbf{S}_{t-1} + \beta_t \mathbf{k}_t \mathbf{v}_t^\top, \\
\bar{\mathbf{o}}_t &= \mathbf{S}_t^\top \mathbf{q}_t.
\end{aligned}
$$

Here $\boldsymbol{\alpha}\_t \in (0,1)^{d\_k}$ is the channel-wise one-step retention factor (how much each channel keeps of the prior state) and $\beta\_t \in (0,1)$ controls the delta-rule write strength (how hard new information is written). $\mathrm{Diag}(\boldsymbol{\alpha}\_t)$ acts as a per-channel forget gate that decays the prior state, and $(\mathbf{I} - \beta\_t \mathbf{k}\_t \mathbf{k}\_t^\top)$ is the delta rule that erases the key-direction component before writing the new key-value.

The per-head projections are formed as:

$$
\begin{aligned}
\mathbf{q}_t, \mathbf{k}_t &= \mathrm{L2Norm}\big(\mathrm{Swish}(\mathrm{ShortConv}(\mathbf{W}_{q/k}\mathbf{x}_t))\big), \\
\mathbf{v}_t &= \mathrm{Swish}(\mathrm{ShortConv}(\mathbf{W}_v \mathbf{x}_t)), \\
\beta_t &= \mathrm{Sigmoid}(\mathbf{W}_\beta \mathbf{x}_t), \\
\mathbf{z}_t &= \mathbf{W}_\alpha^\uparrow \mathbf{W}_\alpha^\downarrow \mathbf{x}_t + \mathbf{b}_\alpha.
\end{aligned}
$$

Query and key pass through ShortConv then Swish and are L2-normalized, while the decay logit $\mathbf{z}\_t$ comes from a low-rank projection. KDA is recurrent but parallelizable per chunk (Kimi Linear's chunkwise parallel form), so it runs efficiently on GPUs.

**Lower-bounded decay — this is K3's key improvement.** The chunkwise computation splits each chunk into 16-token tiles. Off-diagonal tiles can be dense matmuls on Tensor Cores, but diagonal tiles need position-pair computation and become the bottleneck. The cause is that the reciprocal $1/\Gamma$ of the cumulative product of retention factors $\Gamma$ can overflow in finite precision. Kimi Linear used an unbounded negative-Softplus mapping $g\_t = -e^{A}\mathrm{Softplus}(\mathbf{z}\_t)$; Kimi K3 bounds the log-decay from below with a scaled sigmoid:

$$
\begin{aligned}
\mathbf{g}_t^h &= g_{\min}\,\mathrm{Sigmoid}\big(e^{A_h}\mathbf{z}_t^h\big) \in (g_{\min}, 0)^{d_k}, \\
\boldsymbol{\alpha}_t^h &= \exp(\mathbf{g}_t^h) \in (e^{g_{\min}}, 1)^{d_k}.
\end{aligned}
$$

$A\_h$ is a learnable per-head log-scale, $g\_{\min} = -5$ is fixed, and $A\_h$ is initialized to 0. With $g\_{\min} = -5$, every retention factor satisfies $\alpha \approx 6.7 \times 10^{-3}$ or larger, and the cumulative log-decay over a 16-token tile stays within $(-80, 0)$. The corresponding reciprocal rescaling factor is smaller than $e^{80}$ and remains within the BF16 dynamic range, so **both diagonal and off-diagonal tiles can be dense Tensor Core matmuls** and the position-pair diagonal path disappears.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0027-kimi-k3-open-frontier-intelligence/fig3-lower-bounded-decay.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: (a) Kimi Linear uses an unbounded negative-Softplus mapping; Kimi K3 bounds the log-decay with a scaled sigmoid. (b) Kimi Linear evaluates each diagonal tile with an explicit position-pair computation, whereas the bounded range in K3 lets all causal tiles use dense Tensor Core matmuls." %}

**Full-rank gate.** KDA finally changes the output gate from Kimi Linear's low-rank parameterization to an input-dependent full-rank projection. After head-wise RMSNorm:

$$
\mathbf{y}_t = \mathbf{W}_o\big[\mathrm{Sigmoid}(\mathbf{W}_g \mathbf{x}_t) \odot \mathrm{RMSNorm}(\bar{\mathbf{o}}_t)\big].
$$

#### Gated MLA

Gated MLA inherits DeepSeek-V2's MLA but changes two things. First, following Kimi Linear's hybrid design, **all MLA layers use No Position Encoding (NoPE)**. No explicit positional encoding is applied to MLA layers; the intervening KDA layers provide position-sensitive, recency-aware mixing. As a result, extending the context requires no positional-encoding change such as retuning the RoPE frequency base or applying YaRN — this is the decisive design that enables direct extrapolation to 1M context.

Second, MLA also gets an input-dependent channel-wise full-rank output gate. Given the ungated MLA output $\bar{\mathbf{o}}\_t$:

$$
\mathbf{y}_t = \mathbf{W}_o\big[\mathrm{Sigmoid}(\mathbf{W}_g \mathbf{x}_t) \odot \bar{\mathbf{o}}_t\big].
$$

Additionally, to correct the biased rounding error in flash attention, the attention output is kept in FP32 during training.

### Attention Residuals (AttnRes): attention along depth

A standard residual connection compresses all prior information across depth into a single state $\mathbf{h}\_l$ — a bottleneck reminiscent of an RNN over time. Just as the Transformer replaced recurrence with attention along the sequence, AttnRes (Kimi Team, 2026) applies the same methodology along depth: each layer **selectively retrieves** representations from all preceding layers rather than accumulating them uniformly.

For each layer $l$, a learnable pseudo-query $\mathbf{q}\_l = \mathbf{w}\_l \in \mathbb{R}^d$ is defined, with keys/values being the token embedding $\mathbf{h}\_1$ for $i=0$ and layer $i$'s output $f\_i(\mathbf{h}\_i)$ for $1 \le i \le l-1$. The attention weights follow a softmax kernel $\phi(\mathbf{q}, \mathbf{k}) = \exp(\mathbf{q}^\top \mathrm{RMSNorm}(\mathbf{k}))$, where RMSNorm prevents large-magnitude layers from dominating the weights.

The catch is that this full form needs $O(Ld)$ memory (all layer outputs kept alive). To reduce this, **Block AttnRes** partitions the $L$ layers into $N$ blocks of size $S = L/N$. Within a block, layer outputs are reduced to a single partial sum $\mathbf{b}\_n^i$ (with $\mathbf{b}\_0 = \mathbf{h}\_1$ so the embedding is always a source), and full attention is applied only across the $N$ block-level representations. Memory then drops to $O(Nd)$. Kimi K3 partitions its layers into 8 blocks with 12-layer size, giving 9 total blocks when counting the embedding layer. Empirically, $N \approx 8$ recovers most of the benefit across model scales.

### Stable LatentMoE: sparse mixing along width

Expanding both the expert pool and the number of active experts widens the space of expert specializations, but in a conventional MoE each selected expert receives the full-width $d$-dimensional representation, so communication and expert-weight traffic grow with routing multiplicity. LatentMoE (Elango et al., 2026) solves this by separating full model width from routed-expert width: shared experts keep a full-width path for common transformations, while specialized routed experts operate in a compact latent space of width $\ell$. This lets channel mixing scale to **896 routed experts with 16 active per token (sparsity 56)**.

But this extreme sparsity amplifies two failure modes. First, the routed path composes a gated multi-branch FFN ($\mathbf{W}^\downarrow$) and $\mathbf{W}^\uparrow$ into a chain of nearly four consecutive matmuls, which combined with the 2.8T scale produces exploding internal activations in the routed branch. Second, balancing the load of nearly $10^3$ experts exceeds the regime where existing auxiliary-loss-free bias updates behave well. Stable LatentMoE addresses both with three components.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0027-kimi-k3-open-frontier-intelligence/fig5-quantile-balancing.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: Quantile Balancing with m=8 tokens, n=4 routed experts, k=1. (a) Token-wise Top-k routing produces loads (4,3,1,0) — darker circles are overheated experts, faded/dashed circles are underutilized/dying. (b) Each gray bar is the margin of the biased score, and the dashed red line in each column is the bias adjustment placed so exactly q=2 margins exceed it. (c) The balanced load (2,2,2,2) after adjustment; red edges denote assignments changed by QB." %}

**Normalized LatentMoE.** The original LatentMoE applies $\mathbf{W}^\uparrow$ directly to the aggregated routed representation $\mathbf{u}$, whose scale varies substantially with the selected experts and routing weights. Kimi K3 inserts RMSNorm between expert aggregation and up-projection to reduce this scale variation.

$$
\begin{aligned}
\mathbf{u} &= \sum_{i \in \mathcal{T}_k(\mathbf{x})} p_i\, E_i^{\text{routed}}(\mathbf{W}^\downarrow \mathbf{x}), \\
\mathbf{y} &= \sum_{j=1}^{N_s} E_j^{\text{shared}}(\mathbf{x}) + \mathbf{W}^\uparrow \mathrm{RMSNorm}(\mathbf{u}).
\end{aligned}
$$

Kimi K3 fixes the number of full-width shared experts to $N\_s = 2$ in every layer.

**Sigmoid Tanh Unit GLU (SiTU-GLU).** In SwiGLU both multiplicative factors are unbounded, so coincident large coordinates can produce activation outliers and increase overflow risk in low-precision arithmetic. SiTU-GLU applies a smooth cap $\mathrm{softcap}(x, \beta) = \beta \tanh(x/\beta)$ to the linear factor of the Swish gate and to the up branch independently.

$$
\begin{aligned}
\mathrm{SiTU\text{-}GLU}(\mathbf{x}) = \Big[&\beta_1 \tanh\big(\tfrac{\mathbf{W}_g \mathbf{x}}{\beta_1}\big) \odot \mathrm{Sigmoid}(\mathbf{W}_g \mathbf{x})\Big] \\
&\odot \Big[\beta_2 \tanh\big(\tfrac{\mathbf{W}_u \mathbf{x}}{\beta_2}\big)\Big].
\end{aligned}
$$

Kimi K3 uses $\beta\_1 = 4$ for the gate branch and $\beta\_2 = 25$ for the up branch. The scaled tanh is approximately linear near the origin and bounded at large magnitude, preserving SwiGLU's local response while suppressing both factors. The output is bounded by $\Vert \mathrm{SiTU\text{-}GLU}(\mathbf{x})\Vert \_\infty \le \beta\_1 \beta\_2 = 100$.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0027-kimi-k3-open-frontier-intelligence/tab1-architecture-comparison.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Architectural comparison between Kimi K2 and Kimi K3. Layers 61->93, total parameters 1.04T->2.78T, active parameters 32.6B->104.2B, routed experts 384->896, active experts per token 8->16, training context 128K->1M (8x)." %}

#### Quantile Balancing (QB)

QB is Stable LatentMoE's load-balancing mechanism. It follows auxiliary-loss-free routing but adds a per-expert bias $b\_j$ to the router score used for Top-k selection. For token $\mathbf{x}\_i$, the router computes $\mathbf{s}\_i = \mathrm{Sigmoid}(\mathbf{W}\_r \mathbf{x}\_i)$ and applies:

$$
\mathcal{T}_i = \mathrm{argtopk}(\mathbf{s}_i + \mathbf{b}), \qquad p_{i,j} = \frac{s_{i,j}}{\sum_{r \in \mathcal{T}_i} s_{i,r}}, \quad j \in \mathcal{T}_i.
$$

Because $\mathbf{b}$ is omitted from $p\_{i,j}$, it regulates dispatch only and does not alter the mixture weights or the router's gradient-based optimization. The original method updated $\mathbf{b}$ with a fixed-step sign rule, but maintaining balanced load becomes far harder as LatentMoE grows to 896 experts. QB sets each expert's bias directly from the router-score quantile that matches its target load. For a target load $q = mk/n$ (tokens per expert), it derives the next bias from a single forward pass using the Top-$(k{+}1)$ biased-score cutoff:

$$
\begin{aligned}
\widehat{b}_j^{(t+1)} &\leftarrow -\mathrm{quantile}_{1-k/n}\big(\mathbf{s}_{:,j} - \boldsymbol{\alpha}^{(t)}\big), \\
\mathbf{b}^{(t+1)} &\leftarrow \widehat{\mathbf{b}}^{(t+1)} - \mathrm{mean}\big(\widehat{\mathbf{b}}^{(t+1)}\big)\mathbf{1}.
\end{aligned}
$$

Since the margins subtract the biased cutoff $\alpha\_i^{(t)}$ from the raw score $s\_{i,j}$, the old bias enters the update only through the cutoffs, and the update takes effect only in the next step — so a batch is never routed with a bias derived from itself. The bias is frozen at inference. Appendix C shows this quantile rule is derived from the optimal balanced assignment of the bipartite b-matching polytope, and explains why it reaches equilibrium within a few steps even for nearly $10^3$ experts, with no learning-rate-like hyperparameter. At scale the margins number in the millions, so an exact quantile is infeasible; QB instead uses **histogram estimation**, gathering a per-expert histogram with a single all-reduce and recovering the quantile.

### Native Vision: MoonViT-V2

Kimi K3 is a native multimodal model in which text, images, and videos are processed by a single shared backbone within one context. The key departure from Kimi K2.5 is that the vision encoder MoonViT-V2 is **trained entirely from scratch with next-token prediction, without contrastive pre-trained SigLIP initialization**. Prior practice, including Kimi K2.5, initialized from a contrastive encoder like SigLIP, but the authors abandoned this primarily for training stability. Attaching a SigLIP-initialized encoder to the LLM and jointly optimizing produces frequent spikes in vision-tower gradient norms, whereas MoonViT-V2 remains stable throughout training. Notably, MoonViT-V2 matches the SigLIP-initialized baseline on vision evaluations, indicating that contrastive pre-training is unnecessary as an initialization for large multimodal LMs.

MoonViT-V2 is a 27-layer vision transformer with roughly 0.4B (401M) parameters that adopts RMSNorm and removes all bias terms from its linear and attention projections. Images and videos are processed with fully shared parameters, and a $2 \times 2$ pixel-shuffle downsampling before projection reduces the number of visual tokens by a factor of four, keeping inputs of up to $3584 \times 3584$ pixels affordable within the 1M context.

### Per-Head Muon

Kimi K3 uses Muon (Jordan et al., 2024) as the optimizer for matrix parameters, but refines it into a per-head variant for attention projections. Instead of applying Newton-Schulz orthogonalization to the full $Q, K, V$ projection matrices, it partitions the momentum matrices along the head dimension and orthogonalizes each head's block separately. Full-matrix orthogonalization treats all heads as a single coupled block, letting heads with larger gradient or momentum scale dominate the shared update direction; the per-head approach equalizes the update scale across heads, improving training stability at larger scales.

#### Training Objectives / Loss Functions

Kimi K3's core loss is standard next-token prediction, but three specialized objectives appear in post-training.

**Budget-penalized reward in Reasoning Effort RL.** To tune reasoning effort alongside token efficiency, each problem $x$ is given an initial token budget $b\_0(x)$ estimated from the cold-start model. Any trajectory whose total token budget $T(y)$ exceeds a scaled threshold $\tau \cdot b\_0(x)$ has its task reward overridden with $-1$. Training first uses a max-budget variant with large $\tau$, then anneals $\tau$ to obtain the high- and low-effort experts.

**Multi-Teacher On-Policy Distillation (MOPD).** Nine domain/effort-specialized experts (3 domains x 3 efforts) are consolidated into a single model. The per-token OPD reward between the teacher $\pi\_{\text{teacher}}^{(d,e)}$ and student $\pi\_\theta$ for domain $d$ and effort $e$ is:

$$
r_{\text{opd}}^d(y_t \mid e, x, y_{<t}) = \mathrm{clip}\Big(\mathrm{sg}\big(\log \tfrac{\pi_{\text{teacher}}^{(d,e)}(y_t \mid x, y_{<t})}{\pi_\theta(y_t \mid e, x, y_{<t})}\big),\, -R_{\max},\, R_{\max}\Big).
$$

$\mathrm{sg}(\cdot)$ is the stop-gradient operator and $R\_{\max} > 0$ is a clipping threshold that constrains extreme advantage signals. This dense reward integrates naturally with infrastructure optimizations like partial rollout.

**LK loss (draft-model fine-tuning).** For inference acceleration, the EAGLE-3-style draft model directly optimizes the per-token acceptance rate $\sum\_x \min(p(x), q(x))$ under lossless speculative decoding. Since the conventional KL-divergence surrogate does not guarantee maximizing this rate, the likelihood-based LK loss — the negative logarithm of the acceptance rate itself — is used.

$$
\mathcal{L}_{\text{LK}} = -\log \sum_{x \in \mathcal{V}} \min\big(p(x), q(x)\big).
$$

$p$ and $q$ are the next-token distributions of the target and draft models, evaluated at temperature 1.

#### Training Data and Pipeline

**Pre-training data.** Four text domains — Web Text, Code, Mathematics, Knowledge — plus a large vision corpus (captions, interleaved image-text, OCR, perception, video, visual coding). Each domain is filtered by rule-based heuristics, classifier-based quality scoring, deduplication, and ablation-determined sampling rates. Following Kimi K2's rephrasing recipe, knowledge and mathematics corpora are rewritten with style- and perspective-diverse prompting. The vision corpus provides coordinate supervision in both absolute and normalized $([0,1])$ formats for precise localization, and the team substantially scaled up programmatic multimodal data in domain-specific formats like SVG, 3D assets, Webpage, Game, and CAD.

**Scaling law.** Since the aligned architecture, data, and training improvements alter the optimal training regime, dedicated scaling-law studies retune batch size, learning rate, tokens-per-parameter ratio, and model shape. The result: cosine decay consistently achieves a lower final loss than WSD (Warmup Stable Decay) under a fair comparison in which each schedule is tuned independently. Together these improvements yield roughly 2.5x scaling efficiency over Kimi K2.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0027-kimi-k3-open-frontier-intelligence/fig7-scaling-law.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: Fitted scaling-law curves for Kimi K2 and Kimi K3. K3 reaches the same validation loss with roughly 2.5x fewer FLOPs than K2." %}

**Progressive context extension.** Pre-training begins at 8k tokens and extends to 64k, then to 256k -> 1M during the cooldown phase. A four-stage curriculum grows the context window progressively while confining costly long-sequence computation to a small fraction of the overall budget. Thanks to NoPE, the model extrapolates directly to 1M without positional-encoding modification. Long-context data contains substantial low-quality content — near-duplicates, binary blobs, truncated files — so it goes through a dedicated cleaning pipeline of exact/fuzzy dedup, perceptual hashing, and structural validation, and synthetic tasks that require attending to information scattered across the full context prevent attention from degenerating into local patterns.

| Stage | Detail |
|-------|--------|
| Pre-training context | 8k -> 64k |
| Cooldown context | 256k -> 1M |
| Quantization | QAT (MXFP4 weights, MXFP8 activations), from SFT onward |
| Optimizer | Per-Head Muon + weight clipping (Kimi K2) |
| LR schedule | cosine, 1% linear warmup |
| Weight decay | 0.1 |

#### Experimental Results

Kimi K3 is evaluated across four axes (Reasoning & Knowledge, Coding, Agentic, Vision). Baselines are the proprietary Claude Fable 5, GPT-5.6 Sol, Claude Opus 4.8, GPT-5.5, and the open GLM-5.2. All Kimi K3 evaluations use reasoning effort max and temperature 1.0.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0027-kimi-k3-open-frontier-intelligence/fig1-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Kimi K3 main results. Across coding, general, and visual agents, Kimi K3 (blue bars) sits near the top of the frontier." %}

### Reasoning & Knowledge

On graduate-level reasoning, Kimi K3 is competitive with the frontier: GPQA Diamond 93.5 (tied for second with GPT-5.5; GPT-5.6 Sol leads at 94.1) and AA-LCR 74.7 for the best score. A gap remains on research-level tasks, though. HLE-Full is 43.5 without tools and 56.0 with, trailing both Claude Fable 5 (53.3/63.0) and GPT-5.6 Sol (44.5/58.0). CritPt is 23.4, behind Claude Fable 5, GPT-5.6 Sol, and GPT-5.5 — signaling research-level reasoning as a key direction for improvement.

### Coding

Kimi K3 delivers strong agentic coding performance. ProgramBench 77.8 is the best score, and on SWE-Marathon (a GPU-kernel-oriented suite) it scores 42.0, seven points ahead of Claude Fable 5 for the best result. Terminal-Bench 2.1 is 88.3, a narrow second behind GPT-5.6 Sol (88.8). DeepSWE 67.5 trails Claude Fable 5 and GPT-5.6 Sol but beats Claude Opus 4.8 and GPT-5.5. On the long-horizon FrontierSWE, it ranks second at 81.2, behind only Claude Fable 5 (86.6) and well ahead of everything else.

### Agentic

Kimi K3 achieves state-of-the-art results across a broad set of agentic suites: BrowseComp 91.2, DeepSearchQA 95.0 (F1), ResearchRubrics 76.2, MCPMark-Verified 94.5, AutomationBench 30.8, SpreadsheetBench 2 34.8, $\tau^3$-Banking 33.4, and Harvey Lab-AA 94.6 (criterion pass rate) are all best. The main exceptions are where Claude Fable 5 leads: GDPval-AA v2 (1686, third) and AA-Briefcase (1548, second). On CorpFin v2 and OSWorld-Verified it finishes a razor-thin second behind Claude Fable 5 (by 0.2 each), while the harder computer-use benchmarks (OSWorld 2.0, SaaS-Bench) are still led by Claude Fable 5 or GPT-5.6 Sol.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0027-kimi-k3-open-frontier-intelligence/tab2-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: Performance comparison against proprietary and open-source models. Bold is the best per benchmark, underline the second-best. Kimi K3 sits just below Claude Fable 5 and GPT-5.6 Sol while consistently beating every other model." %}

### Vision

Kimi K3's multimodal understanding is amplified further by Python tools. Math-Vision reaches 94.3, rising to 97.8 with tools, and on the challenging ZeroBench-main it ties Claude Fable 5 at 23.0 without tools, jumping to 41.0 with Python tools. OmniDocBench 91.1 is the best score, as are Video-MME 90.0 and MMVU 82.1. WorldVQA ForceAnswer 51.0 ranks second behind Claude Fable 5 (56.7), ahead of GPT-5.6 Sol and Claude Opus 4.8.

### Cybersecurity Evaluation

Kimi K3 was assessed across two tiers of cyber capability. In Tier 1 (vulnerability discovery), it identified hundreds of candidate vulnerabilities across dozens of deployed systems — OS kernels, databases, AI services, web frameworks, blockchain, VPN software — and of those that underwent human review, roughly 70% were confirmed genuine, including 16 previously unknown vulnerabilities across six projects. In Tier 2 (exploit development), it solved 14 of 36 tasks (38.9%), beating GLM-5.2 (8/36, 22.2%), though successes concentrate in user-space while neither model solves three-quarters of the kernel track. An independent joint assessment by the UK AI Security Institute and NIST's CAISI reached consistent conclusions — 32% vs. 24% on ExploitBench — but the model trails frontier cyber-capable models on end-to-end exploit completion. The authors frame these results as a lower bound on capability.

### Third-Party Evaluation

- **Artificial Analysis:** Intelligence Index v4.1 = 57.1, fourth of 580 models (third if GPT-5.6 Sol effort variants count as a single entry), behind Claude Fable 5 (59.9) and GPT-5.6 Sol (58.9) and ahead of all others.
- **Vals AI:** On a GDP-weighted industry benchmark, Vals Index 74.7 ranks second of 39 (behind Claude Fable 5 at 75.1).
- **Arena:** WebDev Arena 1678 Elo, first of 99 — the first open model to top this leaderboard, ahead of Claude Fable 5 (1634). Text Arena eighth, Agent Arena fourth.

### Cost Efficiency

Kimi K3 sits on or near the cost-efficiency frontier across all four suites. On Kimi Code Bench 2.0 it is four points behind Claude Fable 5 at 38% of the cost, and at high effort it matches Claude Opus 4.8's maximum-effort score at roughly one third of the cost. On BrowseComp it attains the best score (91.2) at $2.03 per task — half the cost of GPT-5.6 Sol (90.4%) and an order of magnitude cheaper than the Claude models at their maximum effort.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0027-kimi-k3-open-frontier-intelligence/fig13-cost-efficiency.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 13: Score vs. per-task inference cost on four suites. Kimi K3 (star) delivers near-top scores at a fraction of the frontier cost." %}

#### Analysis / Ablation

The most interesting observation in this report is what improves as RL FLOPs scale up.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0027-kimi-k3-open-frontier-intelligence/fig8-rl-scaling.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: Scores and average assistant steps across public and in-house evaluations during RL. Scaling RL FLOPs raises tool-call steps consistently, accompanied by comprehensive improvement in overall capability." %}

Across all eight axes — Coding Experience, General Tool Use, Web Development, Agentic Search, Professional Workflows, Office Deliverables, Agentic Chart Understanding, Agentic Visual Puzzles — both the score (blue line) and the average tool-call steps (red dashed line) rise together as RL FLOPs grow. This means it isn't simply that accuracy improves, but that **the behavior of actively digging into a problem through more tool calls is itself learned**. Long-horizon agentic capability emerges alongside reasoning-effort discipline.

The architectural interpretation is equally clear. Without lower-bounded decay, diagonal tiles would remain position-pair computations and bottleneck KDA's chunkwise kernel; without NoPE, every 1M extrapolation would need RoPE retuning or YaRN. Each of Stable LatentMoE's three components (RMSNorm, SiTU-GLU, QB) targets a distinct failure mode of extreme sparsity — activation explosion and load imbalance — and is what actually makes 896 experts trainable. In the in-house evaluations, Kimi K3's strengths cluster clearly in orchestration- and research-type agency (Swarm Bench 76.3, Deep Research Bench 90.0), and on Kimi Webdev Bench blind expert judges prefer it over Claude Opus 4.8 by +31.0 points.

#### Infrastructure: how to actually run trillion-scale

Meeting three systems challenges at once — hybrid KDA attention, 3T-class sparse multimodal training, and million-token agentic workloads — is rare.

- **KDA co-design.** FlashKDA (a CUTLASS-based chunkwise kernel) overlaps intra-chunk computation with cross-chunk state propagation, and KDA Context Parallelism (KCP) computes each segment's state transition locally and composes them associatively, synchronizing the recurrent state with only a fixed-size all-gather. The delta rule multiplies by a token-dependent matrix, so vanilla linear attention's simple summation doesn't apply; KCP resolves this by decomposing the effect into a cumulative transition and a locally generated state.
- **MoonEP.** An expert-parallel scheme that achieves perfect load balance with dynamic redundant experts. It proves that $E/R$ redundant-expert slots per rank always guarantee a feasible plan (Appendix E), and eliminates per-layer host synchronization with zero-copy communication and static shapes. Even in the worst case the communication buffer stays fixed at $S \times K$.
- **1M agentic RL.** Co-located RL, an external KV cache pool (write-back of reusable prefixes to CPU DRAM), rollout auto-throttling, and the Firecracker-microVM-based sandbox AgentENV. AgentENV supports pause/resume (a waiting sandbox consumes zero resources, up to 98% of its lifetime), fork (for reward judging), and snapshot. Across all training and evaluation, a total of **51,219,741 sandboxes were created across 1,505,678 images**.
- **Inference serving.** A KDA-aware prefix cache packs the fixed-size recurrent state into the same paged pool as MLA KV, dedicated kernels for KDA decode, Block AttnRes, and Stable LatentMoE cut per-token latency, and cache-aware affinity scheduling and budget-based admission control translate this efficiency into predictable production serving.

The case studies are also notable. Kimi K3 reduced AttnRes latency from 283.6ms to 114.4ms through GPU kernel optimization, developed a compact Triton-like compiler called MiniTriton, and — in a 48-hour autonomous run — designed and verified a hybrid-architecture inference chip (nano-kpu, 4mm², 100MHz, decode throughput >8,700 tokens/s).

#### Limitations and Critical Assessment

- **The research-level reasoning gap.** As the authors acknowledge, HLE-Full and CritPt trail Claude Fable 5 and GPT-5.6 Sol. Graduate-level reasoning (GPQA) is caught up, but the research level above it remains the domain of frontier proprietary models.
- **A real reproducibility wall.** The weights are open, but actually serving a 2.8T-parameter, 104B-active model requires a dedicated infrastructure stack — MoonEP, FlashKDA, AgentENV. "Open weight" does not mean "open access," and running this model at frontier effort remains impractical for most researchers and organizations.
- **Self-report bias in evaluation.** Many in-house benchmarks (Kimi Code Bench 2.0, Kimi Webdev Bench, Swarm Bench, etc.) were designed and scored by the authors' own team and may be curated to favor their strength areas. The Kimi Webdev Bench blind judging mitigates this somewhat, but baseline-selection bias across the in-house suite is hard to verify.
- **Kernel-track exploit failures.** In the cyber evaluation, neither model solved three-quarters of the kernel-track exploit tasks, and end-to-end exploit completion remains the bottleneck. Since the authors frame this as a lower bound, the result is conditioned on the specific model version and evaluation coverage.
- **Conditionality of the cost-efficiency comparison.** The cost-efficiency advantage depends heavily on harness, effort, and measurement time (July 2026 API pricing). Kimi K3 is evaluated with Kimi Code while other models use Claude Code/Codex harnesses, leaving harness heterogeneity in place.

#### Takeaways

- **Linear attention now works at frontier scale.** A 2.8T hybrid that makes KDA three-quarters of its attention layers competing with global-attention proprietary models empirically overturns the belief that delta-rule linear attention is "small models only." The small parameterization change of lower-bounded decay — moving diagonal tiles onto Tensor Cores — was the decisive move that made this scale practical.
- **NoPE + KDA hybrid makes 1M extrapolation free.** Delegating positional encoding to KDA's recurrent gating lets the model extrapolate directly to 1M with no RoPE retuning or YaRN. The center of gravity in long-context design is shifting from positional-encoding tuning to attention-hybrid composition.
- **Auxiliary-loss-free routing evolves into an exact quantile solution.** Quantile Balancing replaces sign-based bias updates with the optimum of a bipartite matching, reaching load equilibrium within a few steps and without a learning rate even at the extreme sparsity of 896 experts. It signals MoE routing research moving from heuristics to optimization theory.
- **Scaling RL FLOPs makes tool-use behavior itself emerge.** The pattern of scores and average tool-call steps rising together across eight agentic axes suggests that agentic capability is the emergence of active tool-use behavior, not merely higher accuracy.
- **Open weight is not open access.** The "release" of a model requiring 51 million sandboxes, dedicated EP/attention kernel stacks, and 3T-class infrastructure reaffirms that releasing the systems software for the community to actually reproduce and use (FlashKDA, MoonEP, AgentENV) matters as much as the weights.

#### Installation and Usage

The Kimi K3 weights are open on Hugging Face. That said, being a 2.8T-parameter, 104B-active model, real serving requires substantial multi-GPU infrastructure and the dedicated kernels the authors released alongside it (FlashKDA, MoonEP).

```python
# Conceptual example — real serving requires MoonEP/FlashKDA and related infra
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "moonshotai/Kimi-K3"
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_id, trust_remote_code=True, torch_dtype="auto", device_map="auto"
)

messages = [{"role": "user", "content": "Explain a 1M-context summarization task."}]
inputs = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt")
output = model.generate(inputs.to(model.device), max_new_tokens=512)
print(tokenizer.decode(output[0], skip_special_tokens=True))
```

#### References

- Paper: <https://arxiv.org/abs/2607.24653>
- Model weights: <https://huggingface.co/moonshotai/Kimi-K3>
- Official blog: <https://www.kimi.com/blog/kimi-k3>
- FlashKDA (KDA kernels): <https://github.com/MoonshotAI/FlashKDA>
- MoonEP (expert parallelism): <https://github.com/MoonshotAI/MoonEP>
- AgentENV (sandbox runtime): <https://github.com/kvcache-ai/AgentENV>

#### Further Reading

- **[Kimi Linear: An Expressive, Efficient Attention Architecture](https://arxiv.org/abs/2510.26692)** (Kimi Team, 2025) — KDA's direct predecessor. The chunkwise parallel form and channel-wise decay originate here.
- **[Kimi K2: Open Agentic Intelligence](https://arxiv.org/abs/2507.20534)** (Kimi Team, 2025) — The prior generation Kimi K3 uses as the baseline for its 2.5x scaling-efficiency gain, and the starting point for the rephrasing data recipe and Muon adoption.
- **[Kimi K2.5: Visual Agentic Intelligence](https://arxiv.org/abs/2602.02276)** (Kimi Team, 2026) — The predecessor for the vision pathway and agentic capability, and the contrast against which MoonViT-V2 abandons SigLIP initialization.
- **[LatentMoE: Toward Optimal Accuracy per FLOP and Parameter in Mixture of Experts](https://arxiv.org/abs/2601.18089)** (Elango et al., 2026) — The basis for Stable LatentMoE, the origin of separating full model width from routed-expert width.
- **[DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437)** (DeepSeek-AI, 2024) — The standard reference for MLA and auxiliary-loss-free routing. The sign-based bias update that Quantile Balancing improves upon comes from here.

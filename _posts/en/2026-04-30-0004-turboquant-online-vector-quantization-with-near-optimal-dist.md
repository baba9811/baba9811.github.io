---
layout: post
title: "[Paper Review] TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate"
date: 2026-04-30 10:00:00 +0900
description: "A training-free vector quantizer that gets within ~2.7× of the information-theoretic distortion-rate bound — using just one random rotation."
tags: [vector-quantization, kv-cache, nearest-neighbor, rabitq, llm-inference, compression]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig3-bounds.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/
ko_url: /papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/
---

{% include lang_toggle.html %}

## Metadata

| Item | Detail |
|------|--------|
| Authors | Amir Zandieh (Google Research), Majid Daliri (NYU), Majid Hadian (Google DeepMind), Vahab Mirrokni (Google Research) |
| Venue | arXiv preprint · 2025-04-28 |
| arXiv | [2504.19874](https://arxiv.org/abs/2504.19874) |
| Code | not released by the authors |
| Reviewed | 2026-04-30 |

## TL;DR

- **What.** Two online vector quantizers — TurboQuant_mse and TurboQuant_prod — that need no training, no calibration set, no codebook learning. One random rotation, one precomputed scalar codebook per coordinate, done.
- **How.** Multiplying a unit-sphere vector by a uniform random orthogonal matrix gives coordinates that follow a Beta distribution $\text{Beta}(1/2, (d-1)/2)$ on the squared magnitude, converging to $\mathcal{N}(0, 1/d)$ in high dimensions. The paper solves a 1-D $k$-means (Lloyd-Max) for that exact Beta distribution and stores the codebook ahead of time. The inner-product variant adds a 1-bit QJL pass on the residual.
- **Result.** Theorem 1: $D_{\text{mse}} \le \frac{\sqrt{3\pi}}{2} \cdot 4^{-b}$. Theorem 2: $D_{\text{prod}} \le \frac{\sqrt{3}\pi^2 \|y\|_2^2}{d} \cdot 4^{-b}$. Theorem 3 (Shannon-based lower bound): $D_{\text{mse}} \ge 4^{-b}$ — so the gap is the constant $\sqrt{3\pi}/2 \approx 2.7$ asymptotically and tightens to ≈1.45 at $b=1$. On Llama-3.1-8B-Instruct's KV cache, 3.5-bit TurboQuant ties Full Cache exactly on LongBench-E (avg 50.06). On ANN search, it beats PQ and RaBitQ at the same bitwidth — and quantization wall-clock at d=3072 is 0.0021s vs 494s (PQ) and 3957s (RaBitQ).

## Introduction

Vector quantization (VQ) sits at the heart of Shannon's source coding theorem: encode a $d$-dimensional real vector into a short bit string while preserving its geometric structure (distances or inner products). What you're trying to preserve splits the field — minimize MSE between the original and reconstructed vector, or minimize the variance of an inner-product estimate between pairs.

The pressure point today is LLM inference. Decoder transformers have to store the key/value (KV) embeddings of every previous token in the KV cache, and that cache grows with both model size (layers × heads) and context length. As 32K, 128K, 1M-token contexts become routine, the KV cache becomes the dominant bottleneck between HBM and SRAM. Quantization is the natural tool, but almost every SOTA method is **data-dependent** — Product Quantization (PQ) trains a codebook with k-means, RaBitQ (Gao & Long, SIGMOD 2024) needs a calibration step, and KIVI collects per-channel statistics for KV caches. That dependence carries three taxes: retraining when distributions drift, codebook storage on top of the data, and an inability to quantize a brand-new vector before seeing the rest of the dataset.

TurboQuant's pitch is almost embarrassingly simple — **one uniform random orthogonal rotation**. Multiply your vector by a random orthogonal $\boldsymbol{\Pi}$, and the result is again uniform on the unit sphere; every coordinate then follows a known Beta distribution. Solve the 1-D Lloyd-Max for that Beta once, store the centroids, and you've got a fixed quantizer that works on any worst-case input. Zero data dependence. The codebook itself is a constant determined only by $d$ and $b$.

What makes this paper worth reading right now is the combination of (1) a clean closed-form bound that gets within ~2.7× of the Shannon distortion-rate function, (2) SOTA results on KV cache compression, ANN search recall beating PQ and RaBitQ, and (3) **quantization wall-clock that's two orders of magnitude faster than PQ and three orders faster than RaBitQ** — bringing online quantization within reach of every-token streaming workloads.

## Key contributions

- **Two online quantizers with closed-form distortion bounds.** Theorem 1 gives the MSE bound $D_{\text{mse}} \le \frac{\sqrt{3\pi}}{2} \cdot 4^{-b}$; Theorem 2 gives the inner-product bound $D_{\text{prod}} \le \frac{\sqrt{3}\pi^2 \|y\|_2^2}{d} \cdot 4^{-b}$. Both hold for **any worst-case** input vectors $\boldsymbol{x}, \boldsymbol{y} \in \mathbb{S}^{d-1}$, with no distributional assumption.
- **Information-theoretic lower bound (Theorem 3).** Yao's minimax principle plus Shannon's lower bound shows that *any* randomized quantizer satisfies $D_{\text{mse}} \ge 4^{-b}$ and $D_{\text{prod}} \ge \|y\|^2/d \cdot 4^{-b}$. The paper gives both upper and lower bounds, so "near-optimal" is a quantifiable claim, not a vibe.
- **The two-stage decomposition.** Show that an MSE-optimal quantizer is biased for inner products (multiplicative factor $2/\pi$ at $b=1$), and propose: $(b-1)$-bit MSE quantizer + 1-bit QJL on the residual. The two stages remove the bias and the residual norm is stored explicitly to recover the scale during decoding.
- **SOTA KV cache compression.** On Llama-3.1-8B-Instruct's LongBench-E, 3.5-bit TurboQuant ties Full Cache average (50.06). On Needle-In-A-Haystack with 4× compression, TurboQuant matches Full Precision exactly at 0.997.
- **Better ANN recall than PQ/RaBitQ at matched bitwidth, with effectively zero quantization time.** Quantizing 100K OpenAI3 vectors at d=3072 takes 0.0021s for TurboQuant vs 494.42s (PQ) and 3957.19s (RaBitQ).

## Background

You need four pieces of prior work to follow TurboQuant: Shannon's lower bound, the Beta-distribution result for random rotations, PQ/RaBitQ as baselines, and QJL as a building block.

**Shannon Lower Bound (SLB).** The information-theoretic floor on MSE distortion any lossy compressor can achieve given $B$ bits of mutual information (Lemma 2). Specialized to the unit hypersphere, it gives $D \ge 4^{-b}$ at $b = B/d$ bits per coordinate (Lemma 3 — derived via Stirling's approximation of the sphere's surface area). This is the reference point the paper measures TurboQuant against.

**Coordinate distribution after random rotation (Lemma 1).** For $\boldsymbol{x}$ uniform on $\mathbb{S}^{d-1}$, every coordinate $x_j$ has density

$$
f_X(x) \;=\; \frac{\Gamma(d/2)}{\sqrt{\pi}\,\Gamma((d-1)/2)} \,(1 - x^2)^{(d-3)/2}, \qquad x \in [-1, 1].
$$

This is a transformed Beta. As $d \to \infty$, $f_X \to \mathcal{N}(0, 1/d)$. Importantly: distinct coordinates aren't just uncorrelated, they're **nearly independent** (a deeper concentration result, see Vershynin 2018). That near-independence is what justifies treating the coordinates as a product of i.i.d. scalars and applying the same one-dimensional quantizer to each.

**Product Quantization (PQ).** Slice the vector into short subvectors, train a separate k-means codebook per subspace, store the codebook indices. Distance estimates use precomputed lookup tables. Fast and memory-efficient, but the codebook is data-dependent and must be retrained when the distribution shifts.

**RaBitQ** (Gao & Long, SIGMOD 2024). A 1-bit-per-coordinate quantizer that applies a random orthogonal rotation followed by sign-bit quantization, with calibration. The first such method with a tight theoretical error bound. The version TurboQuant compares against (their reference [22]) is actually the same group's "asymptotically optimal" follow-up (arXiv 2409.09913) — calibration is still required, and lack of vectorization makes its quantization extremely slow on GPU (3957s for 100K vectors at d=3072).

**QJL (Quantized Johnson-Lindenstrauss).** From three of the same authors (Zandieh, Daliri, Han — AAAI 2025). Definition 1: sample a random matrix $\boldsymbol{S} \in \mathbb{R}^{d \times d}$ with i.i.d. $\mathcal{N}(0, 1)$ entries and define

$$
Q_{\text{qjl}}(\boldsymbol{x}) := \text{sign}(\boldsymbol{S} \boldsymbol{x}), \qquad Q_{\text{qjl}}^{-1}(\boldsymbol{z}) := \frac{\sqrt{\pi/2}}{d} \, \boldsymbol{S}^\top \boldsymbol{z}.
$$

Lemma 4 says: an asymmetric estimator that quantizes one of two vectors and leaves the other in full precision is unbiased, and its variance is at most $\frac{\pi}{2d}\|\boldsymbol{y}\|_2^2$. TurboQuant_prod's residual stage uses exactly this.

## Method

The paper presents two algorithms in parallel — TurboQuant_mse for MSE and TurboQuant_prod for inner-product variance — both built on the same rotation step.

### Building the random rotation matrix

Generate a uniform random orthogonal $\boldsymbol{\Pi} \in \mathbb{R}^{d \times d}$ via QR decomposition of a matrix with i.i.d. Normal entries. Note: this is *not* a fast Johnson-Lindenstrauss / SRHT — it's a dense $d \times d$ rotation. Encoder and decoder share the same $\boldsymbol{\Pi}$ (a fixed seed suffices). After rotation, $\boldsymbol{\Pi} \boldsymbol{x}$ is again uniform on $\mathbb{S}^{d-1}$ (Lemma 1) and every coordinate follows the Beta density above.

### TurboQuant_mse: 1-D Lloyd-Max on the Beta distribution

Goal: minimize MSE between $\boldsymbol{x}$ and the dequantized reconstruction. Since coordinates are nearly independent, design a separate scalar quantizer per coordinate — and since they all share the same Beta distribution, the same quantizer works for all.

The optimal $b$-bit scalar quantization problem for a known density $f_X$ is the continuous 1-D $k$-means problem: partition $[-1, 1]$ into $2^b$ Voronoi cells with centroids $c_1, \ldots, c_{2^b}$ minimizing

$$
\mathcal{C}(f_X, b) \;:=\; \min_{-1 \le c_1 \le \cdots \le c_{2^b} \le 1} \sum_{i=1}^{2^b} \int_{(c_{i-1}+c_i)/2}^{(c_i+c_{i+1})/2} |x - c_i|^2 \, f_X(x) \, dx.
$$

Solve this numerically with Max-Lloyd for each useful bitwidth $b = 1, 2, \ldots, b_{\max}$, store the centroids. The result is a quantizer that depends only on $d$ and $b$ — never on the data.

For moderately high $d$ (where $f_X \approx \mathcal{N}(0, 1/d)$), the optimal centroids are $\{\pm \sqrt{2/\pi}/\sqrt{d}\}$ at $b=1$ and $\{\pm 0.453/\sqrt{d}, \pm 1.51/\sqrt{d}\}$ at $b=2$ — straight from a standard Gaussian quantization table.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/alg1-mse.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 1: TurboQuant_mse. Setup builds the rotation Π and the codebook of centroids c_1..c_{2^b} once. Quant computes y = Πx and stores the index of the nearest centroid for each coordinate. Dequant looks up centroids and applies Π^⊤."
   zoomable=true %}

### Distortion bound for TurboQuant_mse (Theorem 1)

The proof is one line: $D_{\text{mse}} = d \cdot \mathcal{C}(f_X, b)$ (rotation preserves norms, coordinates are equi-distributed, and per-coordinate MSE sums to total MSE). Then bound $\mathcal{C}(f_X, b)$ two ways:

- **Small $b$** ($b = 1, 2, 3, 4$): solve Eq. (4) numerically. Result: $\mathcal{C}(f_X, b) \approx 0.36/d, 0.117/d, 0.03/d, 0.009/d$.
- **Large $b$** ($b > 4$): Panter-Dite high-resolution formula

  $$
  \mathcal{C}(f_X, b) \;\le\; \frac{1}{12}\left(\int f_X(x)^{1/3}\, dx\right)^3 \cdot \frac{1}{4^b} \;=\; \frac{\sqrt{3}\pi}{2d} \cdot \frac{1}{4^b}.
  $$

Combining:

$$
\boxed{\;D_{\text{mse}}(b) \;\le\; \frac{\sqrt{3\pi}}{2} \cdot \frac{1}{4^b}\;}, \qquad b=1,2,3,4: \; D_{\text{mse}} \approx 0.36, 0.117, 0.03, 0.009.
$$

The constant $\sqrt{3\pi}/2 \approx 1.535$. The gap to the Shannon lower bound $1/4^b$ is the same $\sqrt{3\pi}/2 \approx 2.7$ that the abstract advertises (the paper's two formulations of the same gap differ in algebraic surface form). At $b=1$ the gap tightens to ≈1.45.

The unit-norm assumption $\|\boldsymbol{x}\|_2 = 1$ is standard and not restrictive: for non-unit-norm inputs, store the $L_2$ norm in floating point and rescale on dequant.

### MSE-optimal is biased for inner products

For inner-product preservation, minimizing reconstruction MSE is suboptimal. Concrete example — at $b=1$, the optimal codebook is $\{\pm \sqrt{2/(\pi d)}\}$, the quantization map is $Q_{\text{mse}}(\boldsymbol{x}) = \text{sign}(\boldsymbol{\Pi} \boldsymbol{x})$, and the dequant map is $Q_{\text{mse}}^{-1}(\boldsymbol{z}) = \sqrt{2/(\pi d)} \cdot \boldsymbol{\Pi}^\top \boldsymbol{z}$. Lemma 4 then implies $\mathbb{E}[\langle \boldsymbol{y}, Q_{\text{mse}}^{-1}(Q_{\text{mse}}(\boldsymbol{x}))\rangle] = (2/\pi) \cdot \langle \boldsymbol{y}, \boldsymbol{x}\rangle$ — a multiplicative bias of $2/\pi \approx 0.637$. This bias shrinks toward 1 as $b$ grows, but it's substantial at low bitwidths.

### TurboQuant_prod: $(b-1)$-bit MSE + 1-bit QJL residual

Two-stage construction:

1. Apply TurboQuant_mse with bit budget $b-1$ to get $\tilde{\boldsymbol{x}} = Q_{\text{mse}}^{-1}(Q_{\text{mse}}(\boldsymbol{x}))$ and the residual $\boldsymbol{r} = \boldsymbol{x} - \tilde{\boldsymbol{x}}$. The expected residual norm is $\sqrt{\mathcal{C}(f_X, b-1)}$ — small.
2. Apply QJL to the residual: sample $\boldsymbol{S} \in \mathbb{R}^{d \times d}$ i.i.d. $\mathcal{N}(0, 1)$ and store $\text{sign}(\boldsymbol{S} \boldsymbol{r})$. **Also store $\|\boldsymbol{r}\|_2$ in floating point** — this scalar is needed at decode time to recover the residual scale.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/alg2-prod.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 2: TurboQuant_prod. Setup instantiates a (b−1)-bit TurboQuant_mse plus a Gaussian random matrix S. Quant outputs (idx, qjl, ‖r‖_2) — the residual norm γ travels with the quantized representation. Dequant adds the mse reconstruction to γ · (√(π/2)/d) · S^⊤ · qjl."
   zoomable=true %}

The asymmetric inner-product estimator is

$$
\widehat{\langle \boldsymbol{y}, \boldsymbol{x}\rangle} \;=\; \langle \boldsymbol{y}, Q_{\text{mse}}^{-1}(Q_{\text{mse}}(\boldsymbol{x}))\rangle \;+\; \|\boldsymbol{r}\|_2 \cdot \langle \boldsymbol{y}, Q_{\text{qjl}}^{-1}(Q_{\text{qjl}}(\boldsymbol{r}))\rangle.
$$

By Lemma 4 the QJL term contributes $\langle \boldsymbol{y}, \boldsymbol{r}\rangle$ in expectation, so the two terms sum to $\langle \boldsymbol{y}, \boldsymbol{x}\rangle$ — the unbiasedness claim of Theorem 2.

### Distortion bound for TurboQuant_prod (Theorem 2)

The proof is conditional variance decomposition. Conditioning on $\tilde{\boldsymbol{x}}_{\text{mse}}$,

$$
\text{Var}(\widehat{\langle \boldsymbol{y}, \boldsymbol{x}\rangle} \mid \tilde{\boldsymbol{x}}_{\text{mse}}) \;\le\; \frac{\pi}{2d} \|\boldsymbol{r}\|_2^2 \|\boldsymbol{y}\|_2^2
$$

(QJL variance bound, Lemma 4 — note that the $\gamma = \|\boldsymbol{r}\|$ rescaling on line 11 of Algorithm 2 is exactly what makes this bound clean). Marginalizing $\|\boldsymbol{r}\|^2$ via the law of total expectation,

$$
D_{\text{prod}} \;\le\; \frac{\pi}{2d} \|\boldsymbol{y}\|_2^2 \cdot D_{\text{mse}}\big|_{b-1} \;\le\; \frac{\sqrt{3}\pi^2 \|\boldsymbol{y}\|_2^2}{d} \cdot \frac{1}{4^b}.
$$

Refined small-$b$ values: $D_{\text{prod}} \approx 1.57/d, 0.56/d, 0.18/d, 0.047/d$ at $b = 1, 2, 3, 4$ (with the $\|\boldsymbol{y}\|_2^2$ factor split out).

### Lower bound (Theorem 3)

Yao's minimax principle reduces randomized algorithms on worst-case inputs to deterministic algorithms on the hardest randomized input distribution. Pick that distribution to be uniform on $\mathbb{S}^{d-1}$, and the SLB on the hypersphere (Lemma 3) gives $D_{\text{mse}} \ge 4^{-b}$. For inner products, a pigeonhole argument over coordinates yields $D_{\text{prod}} \ge \|y\|^2/d \cdot 4^{-b}$.

These lower bounds apply to the *entire class* of randomized quantizers — not just TurboQuant — so the gap to TurboQuant's upper bound is the right thing to measure.

### Variance constancy

For inner-product preservation, what really matters is that the estimator's variance doesn't depend on the magnitude of the true inner product. Figure 2 verifies this directly.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig2-variance-constancy.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: Inner-product distortion histograms at b=2 as the average inner product varies (0.01 → 0.17). (a) TurboQuant_prod keeps a flat, zero-centered variance. (b) TurboQuant_mse shows a clear bias growing with the inner product — direct evidence of the 2/π multiplicative bias."
   zoomable=true %}

Why it matters for ANN: recall@k depends on getting the *small* inner-product differences between top-k candidates right. An estimator whose variance grows with the IP magnitude blows up false positives/negatives near the decision boundary.

## Loss / objective

There is no training loss. The two distortion functionals being minimized are simply:

**MSE distortion (Eq. 1, TurboQuant_mse target):**

$$
D_{\text{mse}} \;:=\; \mathbb{E}_Q\!\left[\, \big\| \boldsymbol{x} - Q^{-1}(Q(\boldsymbol{x})) \big\|_2^2 \,\right].
$$

**Inner-product distortion (Eq. 2, TurboQuant_prod target):**

$$
D_{\text{prod}} \;:=\; \mathbb{E}_Q\!\left[\, \big| \langle \boldsymbol{y}, \boldsymbol{x}\rangle - \langle \boldsymbol{y}, Q^{-1}(Q(\boldsymbol{x}))\rangle \big|^2 \,\right],
$$

with the unbiasedness constraint $\mathbb{E}_Q[\langle \boldsymbol{y}, Q^{-1}(Q(\boldsymbol{x}))\rangle] = \langle \boldsymbol{y}, \boldsymbol{x}\rangle$. Both are taken over worst-case inputs — no distributional assumption.

## Data and pipeline

No training pipeline. All experiments run on a single NVIDIA A100. Evaluation breaks into four scenarios.

| Scenario | Data / Model | Bit budget | Baselines |
|----------|--------------|-----------|-----------|
| 4.1 Empirical validation (theory vs measurement) | DBpedia Entities, OpenAI3 1536-d, 100K train + 1K query | $b=1\ldots5$ | TurboQuant_mse vs prod |
| 4.2 Needle-In-A-Haystack | Llama-3.1-8B-Instruct, document length 4k–104k tokens, Fu et al. setup | KV cache 25% (~2.5 bits effective) | SnapKV, PyramidKV, KIVI, PolarQuant |
| 4.3 LongBench-E (Bai et al. 2023, length-uniform subset) | Llama-3.1-8B-Instruct + Ministral-7B-Instruct | 2.5 / 3.5 bits (channel-wise outlier split) | KIVI, PolarQuant, Full Cache |
| 4.4 ANN search recall@1@k | GloVe d=200 (10K query), OpenAI3 d=1536/3072 (1K query), 100K DB | 2 / 4 bits | PQ (LUT256), RaBitQ |

**On 2.5 / 3.5 bits**: the non-integer averages come from splitting channels into outlier and non-outlier sets and applying TurboQuant separately to each. For example, the 2.5-bit setup uses 32 outlier channels at 3 bits and 96 channels at 2 bits, giving an effective $(32 \times 3 + 96 \times 2)/128 = 2.5$ bits per channel. This outlier strategy is consistent with prior work (SmoothQuant, RotateKV). Note: this is **per-channel outlier handling**, not a key-vs-value asymmetric split.

PQ is run with LUT256 (256 codewords) for fair quality, grouping 4 coordinates per lookup at 2 bits and 2 coordinates per lookup at 4 bits. The paper notes that PQ is trained and evaluated on the same dataset — a fair-but-slightly-favorable setup that still leaves TurboQuant ahead. RaBitQ lacks a vectorized GPU implementation and ends up using more bits in practice than its claimed bit ratio suggests.

## Results

### Theoretical bound vs measured curves (Section 4.1)

100K OpenAI3 1536-d vectors, sweeping $b = 1, \ldots, 5$.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig3-bounds.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Inner-product error (left) and MSE (right) at bitwidths 1–5. Measured curves (TurboQuant_mse blue, TurboQuant_prod purple) plotted against the theoretical upper bound (red dashed, √3π/2 · 4^(−b)) and lower bound (green dashed, 4^(−b)). Both algorithms track the 4^(−b) rate cleanly, and the gap to the lower bound is tighter at small b."
   zoomable=true %}

Each extra bit drops error by 4× — exactly as predicted. At small $b$ ($b \le 2$), TurboQuant_prod sits visibly below TurboQuant_mse on inner-product error — the regime where the multiplicative bias in MSE-optimal quantization dominates.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig1-error-distribution.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Inner-product distortion histograms across b=1..4. (a) TurboQuant_prod is zero-centered and symmetric at every bitwidth (unbiased estimator). (b) TurboQuant_mse shows a positive shift at b=1 — the 2/π multiplicative bias visualized — that fades as b grows."
   zoomable=true %}

### Needle-In-A-Haystack (Section 4.2)

Llama-3.1-8B-Instruct, document length 4k–104k tokens, Fu et al.'s long-context engineering setup. 4× compression (KV cache utilization 25%).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig4-needle-haystack.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Needle-In-A-Haystack heatmaps (Llama-3.1-8B-Instruct). Token limit (x) × needle depth (y) → recall. SnapKV (0.858) and PyramidKV (0.895) collapse near the end of the context; KIVI (0.981) and PolarQuant (0.995) show partial failures; TurboQuant (0.997) is indistinguishable from Full Precision (0.997)."
   zoomable=true %}

> TurboQuant 0.997 (= Full Cache 0.997) ≥ PolarQuant 0.995 ≫ KIVI 0.981 ≫ PyramidKV 0.895 ≫ SnapKV 0.858

The methods with theoretical guarantees (PolarQuant, TurboQuant) beat both token-eviction (SnapKV, PyramidKV) and unguaranteed scalar quantization (KIVI). The late-context collapse of SnapKV/PyramidKV is the visible signature of needles being evicted.

### LongBench-E (Section 4.3)

LongBench's length-uniform subset, 17 long-context tasks grouped into six categories.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/tab1-longbench.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Per-category and average scores on LongBench-E for Llama-3.1-8B-Instruct and Ministral-7B-Instruct. KV size column is effective bits per channel."
   zoomable=true %}

Llama-3.1-8B-Instruct, average column:

| Method | KV size | Average |
|--------|---------|---------|
| Full Cache | 16 | **50.06** |
| KIVI | 5 | 50.16 |
| TurboQuant (3.5 bits) | 3.5 | **50.06** (matches Full) |
| PolarQuant | 3.9 | 49.78 |
| TurboQuant (2.5 bits) | 2.5 | 49.44 |
| KIVI | 3 | 48.50 |

Ministral-7B-Instruct: Full Cache 49.89, TurboQuant 2.5-bit 49.62 (−0.27).

A small curiosity: KIVI at 5 bits scores 50.16, slightly above Full Cache's 50.06 — quantization-as-regularization, or just noise. The headline is TurboQuant 3.5-bit matching Full Cache exactly while compressing the KV by 4.5× (16 → 3.5).

### Quantization wall-clock (Table 2)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/tab2-quant-time.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 4-bit quantization wall-clock (seconds) for 100K vectors at d=200, 1536, 3072. PQ and RaBitQ include codebook training / calibration."
   zoomable=true %}

| Approach | d=200 | d=1536 | d=3072 |
|----------|-------|--------|--------|
| Product Quantization | 37.04 | 239.75 | 494.42 |
| RaBitQ | 597.25 | 2267.59 | 3957.19 |
| TurboQuant | **0.0007** | **0.0013** | **0.0021** |

At d=3072, TurboQuant is roughly 235,000× faster than PQ and 1,884,000× faster than RaBitQ. There's no learning step — just a rotation and per-coordinate lookup. For workloads where you re-quantize every new token (like KV cache compression), this difference is the difference between viable and irrelevant.

### ANN recall (Section 4.4)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig5-recall.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: Recall@1@k vs Top-k. (a) GloVe d=200, (b) OpenAI3 d=1536, (c) OpenAI3 d=3072. TurboQuant 2-bit and 4-bit beat PQ and RaBitQ at the same bitwidth across all three datasets."
   zoomable=true %}

At top-k = 1 (the strictest setting):

- GloVe d=200, 2 bits: TurboQuant ≈ 0.55 vs PQ ≈ 0.50, RaBitQ ≈ 0.45
- OpenAI3 d=3072, 2 bits: TurboQuant ≈ 0.91 vs PQ/RaBitQ ≈ 0.87

The lead widens at larger $d$ where the Gaussian approximation is best, but it holds at d=200 too — meaning TurboQuant is useful even at moderate dimensions. Two contextualizing facts: PQ here trains and evaluates on the same dataset (a fair-but-favorable setup for PQ), and RaBitQ uses more bits in practice than its bit ratio claims. TurboQuant still wins.

## Analysis / what's actually doing the work

The paper doesn't have a named ablation table, but the bit sweeps and baseline grid are enough to read off what's load-bearing.

**The rotation is the whole game.** Without it, per-coordinate distributions are heterogeneous and a single fixed codebook can't fit all of them. The rotation homogenizes the marginals so one codebook works for everyone.

**The 1-bit QJL residual cancels the inner-product bias.** Figure 1(b) shows TurboQuant_mse's $b=1$ histogram visibly skewed positive — the $2/\pi$ bias made tangible. Figure 1(a) shows TurboQuant_prod symmetric at the same bitwidth. The QJL term is pulling its weight.

**Variance constancy is what makes TurboQuant_prod good for ANN.** Figure 2's flat variance across IP magnitudes (panel a) is the property that PQ-style codebook lookups can't replicate — codebook methods get progressively noisier as the inner product shrinks toward zero, exactly the regime that decides recall@k.

**Gaussian approximation quality dictates the bound's tightness.** The gap is $\approx 1.45$ at $b=1$ and grows toward the asymptotic $\approx 2.7$. Larger $d$ pushes toward the lower bound — Figure 3 at d=1536 already sits very close to the theoretical floor.

**Outlier-channel splits are the trick behind non-integer bitwidths.** 2.5 bits = 3-bit outliers + 2-bit non-outliers. Consistent with SmoothQuant / RotateKV. Crucially, TurboQuant lets you reallocate bits without retraining anything — a concrete operational advantage over codebook-based methods.

**Entropy coding could squeeze ~5% more.** At $b=4$, the codebook index distribution has entropy ≈ 3.8, so prefix coding could lower the effective bitwidth from 4 to ≈3.8. The paper skips it for simplicity.

## Limitations and critique

**Authors' stated limitations:**

- The ~2.7 constant gap to the Shannon bound (1.45 at $b=1$). Closing it would require quantizers tailored to the exact Beta rather than its Gaussian limit, complicating design.
- Non-unit-norm inputs need an extra floating-point norm stored per vector. Small overhead but not free.

**Additional concerns:**

- **No breakdown of rotation cost in the wall-clock numbers.** Table 2 reports 0.0021s for TurboQuant at d=3072, but doesn't separate the dense $O(d^2)$ rotation cost from the per-coordinate lookup. SRHT-style fast variants would bring it to $O(d \log d)$ but the paper analyzes the dense-rotation case theoretically — there's a gap between what's proved and what's most efficient to implement.
- **KV-cache baselines are on one axis only.** The comparison covers SnapKV / PyramidKV / KIVI / PolarQuant, but skips sparse-attention methods (H2O, StreamingLLM, Quest), weight quantizers (GPTQ, AWQ), and hybrid approaches. KV cache compression is multi-dimensional.
- **Table 1 is sparse for Ministral.** Only Full Cache and TurboQuant 2.5-bit appear for Ministral — no KIVI / PolarQuant / SnapKV numbers. Hard to know how the relative ordering holds on a different model.
- **The theoretical bound assumes a true uniform random orthogonal.** The paper builds it with QR on i.i.d. Normal entries (honest, dense), but in practice you'd want SRHT for speed. A quantitative analysis of the SRHT case is missing.
- **No public code at the time of writing.** Reproduction requires reimplementation from scratch.
- **No experiments on gradient compression for distributed training.** TurboQuant's online property is exactly what you'd want there, but the direction isn't explored.

## Takeaways

- **Random rotation + a precomputed Beta-distribution codebook gets within a small constant of Shannon.** When you can pin down the post-rotation distribution exactly, you don't need data-dependent training. That's a heuristic worth keeping in mind any time you reach for a learned codebook.
- **Inner-product preservation = bias removal + variance constancy.** The $(b-1)$-bit MSE + 1-bit QJL decomposition handles both. The pattern (split a quantizer into a low-bit core + a 1-bit residual stage) is general — it's worth noticing when designing other quantizers.
- **Theorem 1 + Theorem 2 + Theorem 3 give a quantitative "near-optimal" claim, not a vibe.** The gap to Shannon is concretely $\sqrt{3\pi}/2 \approx 2.7$ asymptotically, $\approx 1.45$ at $b=1$. Future work has a clear target.
- **Quantization wall-clock that's effectively zero is the killer feature for KV cache.** Two orders faster than PQ, three orders faster than RaBitQ. For per-token quantization, that's the difference between viable and not.
- **Codebook-free isn't just speed — it's operational robustness.** Distribution drift, bit-budget changes, model swaps all become free. That's the real production win.

## References

- Paper: [arXiv:2504.19874](https://arxiv.org/abs/2504.19874)
- Same group's prior KV cache work: QJL (AAAI 2025), PolarQuant (Han et al., 2025) — both also baselines here

## Further reading

- **[QJL: 1-Bit Quantized JL Transform for KV Cache Quantization with Zero Overhead](https://arxiv.org/abs/2406.03482)** (Zandieh et al., AAAI 2025) — the asymmetric sign-bit estimator that TurboQuant_prod's residual stage borrows directly. Reference [62] in the paper.
- **[RaBitQ: Quantizing High-Dimensional Vectors with a Theoretical Error Bound for Approximate Nearest Neighbor Search](https://arxiv.org/abs/2405.12497)** (Gao et al., SIGMOD 2024) — the immediate predecessor that introduced random-rotation-then-sign-bit quantization with theoretical error bounds for ANN.
- **[KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache](https://arxiv.org/abs/2402.02750)** (Liu et al., ICML 2024) — per-channel keys, per-token values, 2-bit KV quantization. Compared against in Table 1.
- **[PolarQuant: Quantizing KV Caches with Polar Transformation](https://arxiv.org/abs/2502.02617)** (Han et al., 2025) — same group's prior KV cache work; quantizes angles after a polar transformation. Compared against in Table 1.
- **[SnapKV: LLM Knows What You are Looking for Before Generation](https://arxiv.org/abs/2404.14469)** (Li et al., NeurIPS 2024) — orthogonal approach: token eviction rather than quantization.
- **[PyramidKV: Dynamic KV Cache Compression based on Pyramidal Information Funneling](https://arxiv.org/abs/2406.02069)** (Cai et al., 2024) — varies KV budget across layers; an additional axis of compression that could compose with TurboQuant.

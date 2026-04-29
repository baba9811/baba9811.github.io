---
layout: post
title: "[Paper Review] TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate"
date: 2026-04-30
description: "A training-free vector quantizer that gets within ~2.7× of the information-theoretic distortion-rate bound — using just one random rotation."
tags: [vector-quantization, kv-cache, nearest-neighbor, rabitq, llm-inference, compression]
categories: paper-review
giscus_comments: false
related_posts: false
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
| Authors | Amir Zandieh, Majid Daliri, Majid Hadian, Insu Han |
| Venue | arXiv preprint · 2025 |
| arXiv | [2504.19874](https://arxiv.org/abs/2504.19874) |
| Code | not released by the authors |
| Reviewed | 2026-04-30 |

## TL;DR

- **What.** Two online vector quantizers — TurboQuant_mse and TurboQuant_prod — that need no training, no calibration set, no codebook. Just a single random rotation.
- **How.** A uniform random rotation makes the per-coordinate distribution asymptotically Gaussian, so a coordinate-wise scalar quantizer designed for the standard Gaussian becomes near-optimal. The inner-product variant tacks on a 1-bit residual sign quantizer in the QJL style.
- **Result.** Both MSE and inner-product distortion get within roughly 2.7× of Shannon's distortion-rate lower bound. On Llama-3.1-8B-Instruct's KV cache, 3.5-bit TurboQuant matches Full Cache exactly on LongBench-V1 (avg 50.06). On ANN search, it beats PQ and RaBitQ at the same bitwidth — and quantization wall-clock is two-to-three orders of magnitude faster.

## Introduction

Vector quantization shows up in three places where it really matters today: nearest-neighbor search over LLM embeddings, KV cache compression for long-context inference, and gradient compression for distributed training. The problem is always the same — how do you crush large vectors down to a few bits while keeping pairwise distances (or inner products) accurate enough to be useful?

What's striking about the recent SOTA — PQ, OPQ, RaBitQ, KIVI, and friends — is that almost all of them are **data-dependent**. PQ trains a codebook with k-means. RaBitQ runs a calibration step to estimate the input distribution. KIVI collects per-channel statistics for KV caches. All of this means: when the data distribution drifts, you re-train; the codebook itself eats memory; and you can't quantize a brand-new vector before seeing the rest of the dataset. For LLM inference, where the KV cache for a single 128K context can run into gigabytes and tokens stream in one at a time, that's a real problem.

TurboQuant's pitch is almost embarrassingly simple — **just rotate**. Multiply your vector $x \in \mathbb{R}^d$ by a uniform random orthogonal matrix $\Pi$, and in high dimensions the marginal distribution of any coordinate $(\Pi x)_i$ concentrates onto $\mathcal{N}(0, 1/d)$. Once that's true, you can use a fixed coordinate-wise scalar quantizer — designed once, offline, against the standard Gaussian — and get near-optimal distortion without ever looking at your data.

The reason this paper is worth reading right now: as 32K, 128K, and 1M-token contexts become routine, the practical premium on a quantizer that works *online* — one rotation, no calibration, drop-in for any new vector — has gone way up. And the theoretical result (within a small constant of the Shannon bound) is satisfying on its own terms.

## Key Contributions

- **Two training-free quantizers, one for MSE and one for inner products, both within a small constant of the information-theoretic lower bound.** TurboQuant_mse comes within roughly $\sqrt{3\pi/2} \approx 2.17$ of Shannon's MSE distortion-rate function (the paper states ≈2.7 in its more general form); TurboQuant_prod hits the same kind of constant for inner-product variance.
- **A unified analytic framework.** The same prior — coordinates after rotation are essentially Gaussian, with the exact distribution being a $\text{Beta}(1/2, (d-1)/2)$ on the squared magnitude — handles both the MSE and inner-product analyses. That's a nice piece of mathematical economy.
- **State-of-the-art KV cache compression.** Across Llama-3.1-8B-Instruct and Ministral-7B-Instruct, on LongBench-V1 and Needle-In-A-Haystack, TurboQuant beats SnapKV / PyramidKV / KIVI / PolarQuant at every tested bit budget. At 3.5 bits, it ties Full Cache exactly.
- **Better recall-per-bit on ANN, with quantization that's effectively free.** On GloVe (d=200) and OpenAI3 embeddings (d=1536, 3072), TurboQuant beats PQ and RaBitQ at matched bitwidth. Quantizing 100K OpenAI3 vectors at d=3072 takes ~0 seconds for TurboQuant vs 494s for PQ and 4586s for RaBitQ.

## Background

I'll keep this section short and stick to what you need to follow the method — Product Quantization, RaBitQ, and QJL.

**Product Quantization (PQ).** Slice the vector into short subvectors, train a separate k-means codebook on each subspace, and store the codebook indices. Distance estimates use precomputed lookup tables. PQ is fast and memory-efficient, but the codebook is data-dependent and the training cost scales with dataset size. Variants like OPQ rotate the input first to balance subspace variances, but the rotation itself is also learned.

**RaBitQ** (Gao & Long, SIGMOD 2024). A more recent quantizer that applies a random orthogonal transform and then keeps just the sign bit per coordinate — i.e., 1-bit-per-dim quantization. RaBitQ was the first such method with a tight theoretical error bound, and it's strong on ANN benchmarks. The two things TurboQuant does better are: (a) it doesn't need RaBitQ's per-vector calibration (Table 2: 4585s for d=3072 vs ~0), and (b) its theoretical bound sits closer to Shannon's lower bound.

**QJL (Quantized Johnson-Lindenstrauss).** From the same group (Zandieh et al., AAAI 2025). The setup: project with a random JL matrix, then keep only the sign bit. The clever bit is that you quantize *one* of the two vectors and leave the other in full precision, giving an unbiased asymmetric inner-product estimator. This is the core trick that TurboQuant_prod's residual stage borrows.

**High-dimensional rotation and the Beta distribution.** Multiply a unit vector $x \in S^{d-1}$ by a uniform random orthogonal $\Pi$ and any coordinate satisfies $(\Pi x)_i^2 \sim \text{Beta}(1/2, (d-1)/2)$. As $d \to \infty$, $(\Pi x)_i \cdot \sqrt{d}$ converges to a standard Gaussian. This concentration is the foundation for everything that follows.

**Shannon distortion-rate function.** The information-theoretic lower bound on average distortion when you encode at $R$ bits per source symbol. For a Gaussian source, MSE distortion is bounded below by $2^{-2R} = 4^{-R}$. TurboQuant_mse's bound $D_{\text{mse}} \le \sqrt{3\pi/2} \cdot 4^{-b}$ sits a small constant factor above this — that's the whole point of "near-optimal" in the title.

## Method

The paper presents two algorithms in parallel — TurboQuant_mse for MSE distortion, TurboQuant_prod for inner-product variance — both built on a shared rotation step.

### Shared preprocessing: random rotation

Given $x \in \mathbb{R}^d$, normalize it and apply a uniform random orthogonal $\Pi$:

$$
\hat{x} = \frac{x}{\|x\|_2}, \qquad y = \Pi \hat{x}.
$$

The same $\Pi$ is shared between encoder and decoder (a fixed seed is enough). In practice you'd implement this as a fast Johnson-Lindenstrauss transform — a random sign-flip followed by a Hadamard or DFT — for $O(d \log d)$ cost. The theoretical analysis assumes a true uniform random orthogonal, but the SRHT-style approximation is close enough in practice.

After rotation, every coordinate has roughly the same distribution: $\mathcal{N}(0, 1/d)$ in the limit. So a single fixed scalar quantizer works for all of them.

### TurboQuant_mse: coordinate-wise optimal scalar quantization

Goal: minimize MSE between $\hat{x}$ and the dequantized reconstruction.

For each coordinate $y_i$, apply a $b$-bit Lloyd-Max quantizer $Q_b$ designed against the standard Gaussian. At $b=1$ this is a sign-bit quantizer with reconstruction levels $\pm c_1/\sqrt{d}$; at $b=2$ you get four levels $\pm c_{2a}/\sqrt{d}, \pm c_{2b}/\sqrt{d}$. The constants $c$ come from a standard Gaussian quantization table — they don't depend on the data.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/alg1-mse.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 1: TurboQuant_mse. Rotate, then apply a fixed Gaussian-optimal scalar quantizer per coordinate. Decoding inverts the lookup and the rotation."
   zoomable=true %}

The distortion bound (Theorem 1) is closed-form:

$$
D_{\text{mse}}(b) \;\le\; \sqrt{\frac{3\pi}{2}} \cdot 4^{-b}.
$$

The factor $4^{-b}$ matches Shannon's lower bound for a Gaussian source at $b$ bits per symbol, so this puts TurboQuant_mse within $\sqrt{3\pi/2} \approx 2.17$ of optimal.

### TurboQuant_prod: 1-bit residual quantization for inner products

If you care about inner products rather than MSE, minimizing reconstruction error is suboptimal — what matters is how well you preserve the *sign* and *magnitude* of $\langle a, b \rangle$.

The paper's key observation: a $b$-bit inner-product quantizer can be decomposed as "$(b-1)$-bit MSE quantizer + 1-bit residual sign quantizer." The residual stage uses QJL's sign-bit trick.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/alg2-prod.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 2: TurboQuant_prod. Apply TurboQuant_mse(b−1), then sign-quantize the residual r after multiplying by a random ±1 vector S. Decode with an asymmetric estimator."
   zoomable=true %}

Concretely:

1. Run TurboQuant_mse(b−1) on $y = \Pi \hat{x}$, obtaining $\tilde{y}$ and the residual $r = y - \tilde{y}$.
2. Sample a random sign vector $S \in \{\pm 1\}^d$, then store $\text{sign}(S \odot r)$ — one bit per coordinate.
3. The decoder reconstructs $\hat{x}$ from $\tilde{y}$ and the residual sign bits using an asymmetric estimator that's unbiased provided one of the two vectors is left in full precision.

The asymmetric inner-product estimator looks like

$$
\widehat{\langle a, b \rangle} \;=\; \langle \tilde{a}_{\text{rec}}, b \rangle + \alpha \cdot \sum_i \text{sign}(S_i \cdot r_i^{(a)}) \cdot (S_i \cdot b_i),
$$

where $\tilde{a}_{\text{rec}}$ is the $(b-1)$-bit reconstruction of $a$ and $\alpha \propto 2^{-(b-1)}$ is a scale constant determined by the residual standard deviation.

### Variance constancy and the inner-product bound

For the inner-product distortion you get

$$
D_{\text{prod}}(b) \;\le\; C \cdot 4^{-b},
$$

with a constant $C$ that's almost independent of the input vectors' norms or the angle between them. This "variance constancy" property is what makes TurboQuant_prod especially good for ANN search.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig2-variance-constancy.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: At b=2, the residual variance is essentially flat as the magnitude of the true inner product (x-axis) varies. This is the variance-constancy property — accuracy doesn't degrade for vector pairs at any particular angle."
   zoomable=true %}

Why it matters: ANN recall@k depends on getting the *small* inner-product differences between top-k candidates right, not just the large ones. An estimator whose variance grows with the inner product magnitude blows up false positives/negatives near the boundary.

### Coordinate distribution after rotation

Figure 1 directly verifies the Gaussian approximation that everything else rides on.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig1-error-distribution.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Top — distribution of rotated coordinates for b=1..4. Bottom — distribution of quantization residuals. The rotated coordinates match the Gaussian almost exactly, and the residual variance shrinks geometrically with bitwidth."
   zoomable=true %}

The bigger $d$ gets, the better the Gaussian approximation, which is why TurboQuant's edge widens on the d=3072 OpenAI3 embeddings compared to d=200 GloVe.

## Loss / objective

TurboQuant doesn't have a "training loss" in the usual sense — there's no learning. The two objectives the paper analyzes are simply the distortions you'd hope to minimize.

**MSE distortion (TurboQuant_mse target):**

$$
D_{\text{mse}} \;=\; \mathbb{E}_{x, \Pi}\!\left[\, \big\| \hat{x} - \Pi^{-1} Q_b(\Pi \hat{x}) \big\|_2^2 \,\right].
$$

Expectation taken over both the random rotation $\Pi$ and the input $x$. The reconstruction levels of $Q_b$ are designed to minimize this.

**Inner-product distortion (TurboQuant_prod target):**

$$
D_{\text{prod}} \;=\; \mathbb{E}_{a, b, \Pi, S}\!\left[\, \big( \widehat{\langle a, b \rangle} - \langle a, b \rangle \big)^2 \,\right].
$$

Variance of the unbiased estimator, with the random sign vector $S$ also averaged out.

Both bounds end up with the same $4^{-b}$ rate because they share the same Gaussian prior. That cleanness — one analysis covering two seemingly different objectives — is one of the nicer aspects of the paper.

## Data and pipeline

There is no training pipeline. Evaluation splits into two scenarios — KV cache compression and ANN search.

| Scenario | Models / Data | Bit budget | Baselines |
|----------|---------------|-----------|-----------|
| KV cache compression (LongBench-V1) | Llama-3.1-8B-Instruct, Ministral-7B-Instruct | 2.5 / 3.5 bits | SnapKV, PyramidKV, KIVI, PolarQuant |
| Needle-In-A-Haystack | same models, 32K context | 2.5 bits | same |
| ANN search | GloVe (d=200), OpenAI3 (d=1536, d=3072) | 2 / 4 bits | PQ, RaBitQ |
| Quantization wall-clock | OpenAI3 d=1536, d=3072 | 4 bits | PQ, RaBitQ |

KV cache evaluation follows the standard prefill-then-quantize-then-decode setup. The "bit budget" averages key and value bitwidths (3.5 bits = 4-bit keys + 3-bit values, for example).

ANN search uses quantized vectors to retrieve a top-k candidate set and re-ranks with full-precision vectors; the metric is recall@1@k — fraction of queries whose true nearest neighbor sits in the top-k set.

## Results

### Theoretical bound vs empirical curves

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig3-bounds.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Inner-product error (left) and MSE (right) at bitwidths b=1..4. Dots are measured, lines are the theoretical bound. Both metrics track the 4^(-b) rate cleanly."
   zoomable=true %}

Each extra bit drops error by 4× — exactly as predicted. The gap to Shannon's lower bound stays within the predicted ~2.7 constant across the whole range.

### Needle-In-A-Haystack

Each cell in the heatmap is the score for retrieving a needle planted at a particular context position.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig4-needle-haystack.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Llama-3.1-8B-Instruct, 2.5-bit KV quantization. SnapKV (0.858) and PyramidKV (0.895) collapse near the end of the context; KIVI (0.981) and PolarQuant (0.995) show partial failures; TurboQuant (0.997) is indistinguishable from Full Cache (0.997)."
   zoomable=true %}

> TurboQuant 0.997 (Full Cache 0.997, +0.000) ≫ PolarQuant 0.995 ≫ KIVI 0.981 ≫ PyramidKV 0.895 ≫ SnapKV 0.858

Token-eviction methods like SnapKV visibly drop late-context needles — you can see the failure pattern in the right portion of their heatmap. TurboQuant just preserves everything.

### LongBench-V1

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/tab1-longbench.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: LongBench-V1 by category and average. Two bit budgets: 2.5 and 3.5. TurboQuant at 3.5 bits ties Full Cache (50.06)."
   zoomable=true %}

Headline numbers (Llama-3.1-8B-Instruct, average):

- Full Cache: **50.06**
- TurboQuant 3.5 bits: **50.06** (matches Full)
- TurboQuant 2.5 bits: **49.44**
- KIVI 3.5 bits: 49.66
- KIVI 2.5 bits: 47.40 (−2.04 vs TurboQuant 2.5b)
- PolarQuant 2.5 bits: 48.97
- SnapKV 2.5 bits: 47.59

The pattern repeats on Ministral-7B-Instruct — TurboQuant wins at every matched bit budget.

### Quantization wall-clock

A training-free method beating training-based methods on speed isn't a surprise — but the magnitude is.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/tab2-quant-time.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: Wall-clock time to quantize OpenAI3 embeddings (d=1536, 3072) at 4 bits. TurboQuant is two orders faster than PQ and three orders faster than RaBitQ."
   zoomable=true %}

At d=3072:

- PQ: 494.42s (codebook training included)
- RaBitQ: 4585.95s (calibration included)
- TurboQuant: ~0s (one rotation, then per-coordinate lookup)

For workloads like KV cache compression — where you re-quantize on every new token — this difference is the difference between "viable" and "irrelevant."

### ANN recall

{% include figure.liquid loading="eager"
   path="assets/img/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/fig5-recall.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: Recall@1@k vs Top-k on GloVe (d=200) and OpenAI3 (d=1536, 3072). TurboQuant 4-bit dominates PQ and RaBitQ at the same bitwidth; the lead persists at 2 bits."
   zoomable=true %}

At top-k=1 (the strictest setting):

- GloVe (d=200, 2 bits): TurboQuant ≈ 0.55 vs PQ ≈ 0.50, RaBitQ ≈ 0.49
- OpenAI3 (d=3072, 2 bits): TurboQuant ≈ 0.91 vs PQ ≈ 0.87, RaBitQ ≈ 0.87

The lead is wider at high $d$ where the Gaussian approximation is best, but it holds even at d=200 — meaning TurboQuant is useful even at moderate dimensions, not just for huge embeddings.

## Analysis / what's actually doing the work

The paper doesn't have a named ablation table, but the bitwidth sweeps in Figures 3 and 5 plus the baseline grid in Table 1 and Figure 4 tell you what's load-bearing.

**The rotation is the whole game.** Without it, per-coordinate distributions are wildly heterogeneous (some axes high-variance, some near-zero) and a single fixed scalar quantizer can't possibly fit all of them. Rotation homogenizes the marginals so that one Gaussian-optimal quantizer works for everyone.

**Variance constancy is what makes the inner-product version useful.** PQ-style methods can have great average error but variance that scales with the inner-product magnitude — which is exactly the regime where ANN recall lives or dies. The asymmetric 1-bit residual estimator in TurboQuant_prod sidesteps this; Figure 2 shows the variance staying flat across the whole range of inner-product magnitudes.

**The constant gap to the Shannon bound comes from Beta vs Gaussian.** The post-rotation distribution isn't *exactly* Gaussian — it's a Beta that converges to Gaussian as $d \to \infty$. In Figure 1's bottom row at b=4 you can see the residuals develop a small skew, and that skew is what costs the ~2.7 constant. A quantizer designed against the exact Beta could in principle close some of this gap, at the cost of an index-dependent design.

**Asymmetric bit allocation between K and V.** The "2.5-bit" rows in Table 1 are achieved by giving keys more bits than values (e.g., 3-bit K + 2-bit V), since K and V have different downstream sensitivities. Other methods can do this too, but TurboQuant is the only one where reallocating bits doesn't force you to retrain anything — it just works.

## Limitations and critique

**Acknowledged by the authors:**

- The ~2.7 constant gap to the Shannon lower bound — a fundamental consequence of Gaussian approximation. Closing it would require quantizers tailored to the exact Beta distribution, which complicates the design.
- For small $d$ (tens of dimensions), the Gaussian approximation breaks down and the method's advantage shrinks. All experiments use $d \ge 200$.

**Additional concerns:**

- **Rotation cost not measured carefully.** Theoretically the rotation is $O(d \log d)$ via SRHT, but the wall-clock comparison in Table 2 doesn't break out the rotation cost from the rest. For GPU inference, whether the rotation is kernel-fused with attention or a separate pass matters a lot — and the paper doesn't say.
- **Limited baseline comparison for KV cache.** The comparison covers SnapKV / PyramidKV / KIVI / PolarQuant but skips token-eviction or sparse-attention methods like H2O, StreamingLLM, or Quest. KV compression is a multi-axis problem and hybrid methods are increasingly common.
- **Theoretical bound assumes uniform random rotation, not the SRHT used in practice.** A pseudo-random Hadamard transform is close to uniform but not identical, and a quantitative gap analysis would help.
- **No public code at the time of writing.** The paper doesn't link a GitHub repo, so independent reproduction is harder than it should be.
- **No experiments on gradient compression.** TurboQuant's online property is exactly what you'd want for distributed training (no calibration on streaming gradients), but that direction isn't explored.

## Takeaways

- **Random rotation + per-coordinate scalar quantization is enough to nearly hit the Shannon bound, with no training.** "High-dimensional concentration" turns out to be all you need for problems where you'd assume training is unavoidable. Worth keeping in mind any time you reach for a learned codebook.
- **For inner-product preservation, variance constancy beats average error.** The asymmetric 1-bit residual trick is the right way to get this. PQ and RaBitQ do well on average but their variance scales with the inner-product magnitude, which is why TurboQuant pulls ahead on top-k recall.
- **Online quantization is becoming a hard requirement for LLM inference.** As context lengths grow, the cost of calibration / codebook training is no longer a one-time setup — it's a per-window tax. Methods with negligible per-token overhead are going to dominate.
- **The ~2.7 constant gap is a Beta-vs-Gaussian artifact.** There's a clear research direction here: design a quantizer using the exact Beta distribution and shave the constant down toward 1.
- **"Codebook-free" isn't just about speed — it's about operational robustness.** No retraining when distributions drift, no codebook storage, instant adaptation to new bit budgets. That's the real win in production.

## References

- Paper: [arXiv:2504.19874](https://arxiv.org/abs/2504.19874)
- Prior work from the same authors: QJL, PolarQuant

## Further reading

- **[QJL: 1-Bit Quantized JL Transform for KV Cache Quantization with Zero Overhead](https://arxiv.org/abs/2406.03482)** (Zandieh et al., AAAI 2025) — the asymmetric sign-bit estimator that TurboQuant_prod's residual stage borrows directly.
- **[RaBitQ: Quantizing High-Dimensional Vectors with a Theoretical Error Bound for Approximate Nearest Neighbor Search](https://arxiv.org/abs/2405.12497)** (Gao et al., SIGMOD 2024) — the immediate predecessor that introduced random-rotation-then-sign-bit quantization with theoretical error bounds for ANN.
- **[KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache](https://arxiv.org/abs/2402.02750)** (Liu et al., ICML 2024) — per-channel keys, per-token values, 2-bit KV quantization. The strongest non-codebook baseline TurboQuant compares against.
- **[PolarQuant: Quantizing KV Caches with Polar Transformation](https://arxiv.org/abs/2502.02617)** (Han et al., 2025) — the same group's prior KV cache work; quantizes angles after a polar transformation.
- **[SnapKV: LLM Knows What You are Looking for Before Generation](https://arxiv.org/abs/2404.14469)** (Li et al., NeurIPS 2024) — orthogonal approach to KV compression: token eviction rather than quantization.
- **[PyramidKV: Dynamic KV Cache Compression based on Pyramidal Information Funneling](https://arxiv.org/abs/2406.02069)** (Cai et al., 2024) — varies KV budget across layers; an additional axis of compression that could compose with TurboQuant.

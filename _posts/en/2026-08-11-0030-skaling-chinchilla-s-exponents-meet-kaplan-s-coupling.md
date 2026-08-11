---
layout: post
title: "[Paper Review] Skaling: Chinchilla's Exponents Meet Kaplan's Coupling"
date: 2026-08-11 14:00:00 +0900
description: "Chinchilla's additive scaling law hard-codes the assumption that model size and data act independently. Measured mixed derivatives say otherwise, and one extra exponent cuts boundary extrapolation error by more than 10x."
tags: [scaling-laws, llm, pretraining, compute-optimal, chinchilla, extrapolation]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/fig1-error-map.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/
ko_url: /papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Mathurin Videau, Badr Youbi-Idrissi, David Lopez-Paz, Kartik Ahuja (FAIR at Meta) |
| Venue | arXiv preprint · 2026 |
| arXiv or DOI | [2608.07222](https://arxiv.org/abs/2608.07222) |
| Data | Four grids of pretraining loss measurements — Farseer (404 runs), an internal SK-Grid (134 runs), Farseer-code (117 runs), and the original Chinchilla measurements (245 points) |
| <span style="white-space: nowrap">Review date</span> | 2026-08-11 |

## TL;DR

- Chinchilla's additive form $L = A/N^\alpha + B/D^\beta + E$ forces the mixed derivative $\partial^2 L/\partial N \partial D$ to vanish <strong>identically</strong>. The assumption that model size and data contribute independently isn't an empirical finding — it's baked into the functional form.
- Before proposing anything, the authors ask the data. Estimating the loss surface's derivatives directly with moving least squares, the mixed derivative is non-zero everywhere on the grid and its sign is <strong>negative</strong>: growing $N$ and $D$ together lowers the loss more than growing either alone.
- Skaling adds exactly one parameter — an outer exponent $k$ — giving $L = (A/N^\alpha + B/D^\beta)^k + E$. At $k = 1$ it reduces exactly to Chinchilla.
- MAPE drops 1.5–3× across interpolation and extrapolation, and far more at the extreme corners (SK-Grid far extrapolation: 5.17% → 0.70% on the full grid, 14.63% → 1.15% on the sparse grid).
- An "L-shape" grid that only sweeps the cheap edges matches full-grid Chinchilla accuracy using roughly 10× less compute on Farseer.

## Introduction

Scaling laws underwrite the most expensive decisions in LLM development. Before committing to a training run that costs millions, you need to decide how many parameters to buy and how many tokens to feed them — using only a few dozen small, cheap runs. Get that prediction wrong by a few percent and your whole budget allocation is off.

The de facto standard is the Chinchilla form from Hoffmann et al. (2022):

$$
L(N, D) = \frac{A}{N^{\alpha}} + \frac{B}{D^{\beta}} + E
$$

with $N$ parameters, $D$ training tokens, and $E$ the irreducible loss floor. It's interpretable, it fits easily, and it produced the widely cited "about 20 tokens per parameter" rule.

But this form quietly smuggles in a strong claim. If the loss is $f(N) + g(D) + E$, then the mixed derivative is <strong>exactly zero</strong> for any choice of $f$ and $g$. In other words, it assumes the marginal value of one more parameter doesn't depend at all on how much data the model has seen. What makes this interesting is that the earlier Kaplan et al. (2020) form <em>did</em> couple the two axes; Chinchilla dropped that coupling for convenience.

This paper starts from a simple question: does that assumption actually hold on real loss surfaces? It doesn't — and the violation is largest not in the middle of the grid but at the <strong>edges</strong>. Which is precisely where we want to make predictions: the corners with larger models and longer training horizons we haven't run yet.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/fig1-error-map.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: The additive Chinchilla law carries a systematic, boundary-concentrated prediction bias that the Skaling law removes. Left/centre: signed percentage error (red = overestimation, blue = underestimation). Right: the per-run ratio of the two laws' errors."
   zoomable=true %}

Look at the left panel of Figure 1. Chinchilla's residual is saddle-shaped: accurate in the interior, with oppositely-signed errors growing toward all four corners. That isn't noise, it's a structural signal that the functional form bends the wrong way. The middle panel, fitted with Skaling, shows the pattern gone. On the right, Skaling is more accurate at 76% of configurations, with a median advantage of 2.2× and at least 4× at a third of them.

## Key Contributions

- <strong>A coupled scaling form.</strong> A single interaction exponent $k$ between model size and data corrects the boundary bias of additive laws, taking the parameter count from five to six.
- <strong>Sparse profiling grids.</strong> Skaling's predictive accuracy survives a much cheaper sampling scheme, enabling "L-shape" grids that cut profiling compute by roughly 10×.
- <strong>A methodology for validating the form before fitting it.</strong> To me this is the most transferable part. Instead of fitting several forms and comparing MAPE after the fact, the authors use model-free derivative estimates to establish <em>whether there is a coupling and what sign it has</em>, then design a form satisfying that constraint. The same derivative estimates are later reused to verify the compute-optimal ratio <strong>without any parametric fit at all</strong>.
- <strong>An analytic result: the coupling doesn't change the closed form of the optimum.</strong> Because the outer exponent is a monotone map, it rescales the loss without relocating its minimiser. Skaling inherits Chinchilla's closed-form compute-optimal allocation intact — though the <em>fitted</em> coefficients differ, so the actual numbers diverge sharply.

## Background and Related Work

Two functional forms anchor this literature, differing mainly in how $N$ and $D$ combine.

The <strong>Kaplan form</strong> (Kaplan et al., 2020) couples them:

$$
L(N, D) = \left[ \left( \frac{N_c}{N} \right)^{\alpha_N / \alpha_D} + \frac{D_c}{D} \right]^{\alpha_D}
$$

Here the outer exponent $\alpha\_D$ plays the same role as Skaling's $k$. The catch is that Kaplan additionally <strong>ties</strong> the inner exponents through the ratio $\alpha\_N/\alpha\_D$, so the per-axis decay rates are no longer independent.

The <strong>Chinchilla form</strong> (Hoffmann et al., 2022) takes the opposite trade: it keeps independent inner exponents $\alpha, \beta$ but simply sums the two terms, discarding the coupling entirely.

Skaling bridges them, keeping Chinchilla's interpretable terms and independent inner exponents while, following Kaplan, raising their sum to a free outer exponent.

A third line is <strong>Farseer</strong> (Li et al., 2025), which makes the data exponent and amplitude themselves depend on $N$, expressing the $N$–$D$ interaction through nine fitted parameters. It's more expressive but considerably harder to fit, and in these experiments it's less accurate than Skaling at the grid boundaries. It serves as the control showing that simply adding parameters doesn't fix the boundary failure.

The Kaplan-versus-Chinchilla disagreement has been studied before, but prior work mostly blamed the <strong>fitting procedure</strong>: parameter counting (Pearce and Song, 2024), last-layer FLOP accounting, warmup, and optimizer tuning (Porian et al., 2024). This paper's claim is different. Hold the fitting fixed and the <strong>form itself</strong> still bends the wrong way at the grid edges, and one coupling exponent is enough to straighten it.

## Method

### Does the loss surface actually couple?

The part I like most comes <strong>before</strong> any functional form is proposed. Assuming nothing, the authors estimate the loss surface's derivatives directly from the measured runs.

The estimator is moving least squares (MLS, Lancaster and Salkauskas, 1981). Around each query point, fit a multivariate polynomial to the $k$ nearest neighbours with distance-weighted ridge regression; the fitted coefficients <em>are</em> the Taylor expansion's derivative terms. The first-order block gives the gradient, and the coefficient on the $\Delta x\_{i,1}\Delta x\_{i,2}$ basis term gives exactly the mixed derivative we want. Since the grid is logarithmically spaced, MLS returns log-slopes, converted to real-space derivatives by

$$
\frac{\partial L}{\partial N} = \frac{L}{N} \frac{\partial \ln L}{\partial \ln N}, \qquad
\frac{\partial L}{\partial D} = \frac{L}{D} \frac{\partial \ln L}{\partial \ln D}
$$

This conversion has a practical bonus: it removes the irreducible error $E$ and isolates the structure of the reducible loss. Since $E$ is the hardest parameter to identify in this whole literature, getting it out of the way early is worth a lot.

First-order structure is summarised with a log-linear diagnostic:

$$
\begin{aligned}
\ln\left|\frac{\partial L}{\partial N}\right| &= \alpha_N \ln N + \gamma_N \ln D + c_N, \\
\ln\left|\frac{\partial L}{\partial D}\right| &= \gamma_D \ln N + \alpha_D \ln D + c_D
\end{aligned}
$$

where $\alpha\_N, \alpha\_D$ capture the dominant same-variable decay and $\gamma\_N, \gamma\_D$ the residual dependence on the other axis.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/fig2-first-derivatives.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: First-order derivative structure on Farseer (MLS estimates, log-log axes, colour shows the cross-variable). Top: same-variable projections with clean power-law decay. Bottom: cross-variable projections, dominated by horizontal bands, with small cross-slopes."
   zoomable=true %}

The same-variable projections are close to linear with $\alpha\_N \approx \alpha\_D \approx -1.3$, and the cross-slopes are <strong>small</strong>: $\gamma\_N \approx 0.13$ and $\gamma\_D \approx 0.07$. At first order, the surface looks nearly separable. The authors are careful here — first-order projections alone can neither confirm nor rule out an interaction.

The decisive test is the mixed derivative. Any additive law $L = f(N) + g(D) + E$ satisfies $\partial^2 L/\partial N \partial D = 0$ identically. That's a falsifiable prediction, and the data falsifies it:

$$
\ln\left|\frac{\partial^2 L}{\partial N \partial D}\right| = a \ln N + b \ln D + c
$$

{% include figure.liquid loading="eager"
   path="assets/img/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/fig3-mixed-derivative.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Magnitude of the cross-derivative, taken from the second-order term of the local quadratic fit. An additive law predicts zero; the estimates are non-zero throughout the grid."
   zoomable=true %}

The estimated mixed derivative is non-zero across the entire grid, follows its own power-law decay with $a \approx b \approx -1.1$, and is <strong>predominantly negative</strong>. The sign is the whole story: scaling $N$ and $D$ together lowers the loss more than scaling either alone — a synergy an additive law cannot represent <em>in principle</em>.

### The Skaling form

The minimal extension satisfying the observed constraints — negative mixed derivative, small and asymmetric first-order cross-slopes — is:

$$
L(N, D) = \left( \frac{A}{N^{\alpha}} + \frac{B}{D^{\beta}} \right)^{k} + E
$$

One extra parameter buys a surprising number of good properties.

At $k = 1$ it recovers the purely additive Chinchilla law exactly, which makes this a <strong>nested model</strong> comparison rather than a contest between unrelated forms. For any $k \neq 1$ it reinstates Kaplan-style coupling and a non-zero cross-derivative, but unlike Kaplan it achieves this through the outer exponent, preserving the independence of the inner exponents $\alpha, \beta$.

Because $k > 0$, the function remains <strong>strictly decreasing</strong> in both $N$ and $D$: adding capacity or data can never increase the predicted loss. And $k$ only dictates how the two source terms <em>aggregate</em>, so each retains its individual interpretability.

### Why a multiplicative coupling, not an additive one?

This is the paper's most convincing argument. The natural alternative is to keep the law additive and append a separate product term:

$$
L = A N^{-\alpha} + B D^{-\beta} + G N^{-\mu} D^{-\nu} + E
$$

That term can produce a non-zero mixed derivative, but its sign creates an immediate bind. For this model,

$$
\frac{\partial^2 L}{\partial N \partial D} = \mu \nu\, G\, N^{-\mu-1} D^{-\nu-1}, \qquad
\frac{\partial}{\partial N}\left( G N^{-\mu} D^{-\nu} \right) = -\mu\, G\, N^{-\mu-1} D^{-\nu}
$$

Matching the observed negative mixed derivative requires $G < 0$. But with $G < 0$ the interaction term contributes <strong>positively</strong> to $\partial L/\partial N$, opposing monotonic decrease in model size. That's not a local inconvenience: the fitted mixed-derivative decay implies $\mu \approx 0.1$, smaller than the main size exponent $\alpha$, so this positive contribution <em>decays more slowly</em> than the leading negative term. At large $N$ and small $D$ it eventually dominates, making $\partial L/\partial N > 0$ — the model predicting that bigger models get worse. Choosing $G > 0$ avoids the monotonicity failure but flips the mixed derivative's sign and destroys the synergy. A single additive product term simply cannot do both.

Skaling sidesteps the conflict by introducing the interaction as a <strong>positive multiplicative factor</strong> rather than a signed term. Writing $u = A N^{-\alpha} + B D^{-\beta}$:

$$
\begin{aligned}
\frac{\partial L}{\partial N} &= -k\, \alpha A\, N^{-\alpha-1} u^{k-1}, \\
\frac{\partial L}{\partial D} &= -k\, \beta B\, D^{-\beta-1} u^{k-1}, \\
\frac{\partial^2 L}{\partial N \partial D} &= k(k-1)\, u^{k-2}\, \alpha A N^{-\alpha-1}\, \beta B D^{-\beta-1}
\end{aligned}
$$

The first derivatives are negative for every $k > 0$, and the cross-axis dependence enters only through the positive factor $u^{k-1}$. In the empirically relevant regime $0 < k < 1$, increasing $D$ decreases $u$ and therefore <em>increases</em> $u^{k-1}$, amplifying the already-negative size gradient. You get $\partial^2 L/\partial N \partial D < 0$ without ever flipping the sign of $\partial L/\partial N$. In this parameterisation, monotonicity and synergy are compatible by construction.

The same factor explains the asymmetric first-order slopes in Figure 2. Let $w\_D = B D^{-\beta}/u$ and $w\_N = A N^{-\alpha}/u$ be the data and size shares of the inner sum. Then:

$$
\begin{aligned}
\gamma_N &= (1-k)\, \beta\, w_D, \qquad \gamma_D = (1-k)\, \alpha\, w_N, \\
\frac{\gamma_N}{\gamma_D} &= \frac{\beta}{\alpha} \cdot \frac{w_D}{w_N}
\end{aligned}
$$

This ratio exceeds one whenever $\beta > \alpha$ and the inner sum is data-leaning — reproducing the measured $\gamma\_N \approx 0.13 > \gamma\_D \approx 0.07$ through the <strong>single coupling exponent</strong>, with no skewed interaction term needed. The form wasn't reverse-engineered to fit the data; the data pointed at the form.

### L-shape sampling

Standard full-grid designs sample $N$ and $D$ on a log-spaced square. The problem is that total compute is overwhelmingly dominated by the grid's <strong>top-right corner</strong> — the largest models trained for the longest horizons eat almost the entire budget. Given that geometry, dense sampling is wasteful.

The mathematical structure of the law suggests the alternative. Asymptotically:

$$
\begin{aligned}
\lim_{D \to \infty} L(N, D) &= \left( \frac{A}{N^{\alpha}} \right)^{k} + E, \\
\lim_{N \to \infty} L(N, D) &= \left( \frac{B}{D^{\beta}} \right)^{k} + E
\end{aligned}
$$

Growing one axis cleanly isolates the other's coefficients. In practice you don't need to reach these limits — varying one axis while holding the other fixed provides enough signal to trace the corresponding decay rate.

The L-shape strategy applies this at the <strong>lowest compute scales</strong>: sweep data volume $D$ only for the smallest models to fit $(B, \beta)$ (the D-band), and sweep model size $N$ only at the shortest training horizons to fit $(A, \alpha)$ (the N-band). Anchoring the independent decay rates along the grid boundaries maps the interaction more efficiently than a full sweep under the same budget.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/fig4-sampling-strategies.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Partitions of the (N, D) grid. (a) Sampling strategies — Random spreads held-out points across the grid; L-shape restricts training to the low-compute edges. (b) Evaluation regimes for cross-validation: interpolation, extrapolation in N and in D, and far extrapolation beyond both."
   zoomable=true %}

### Evaluation protocol

Rather than a single static split, the authors repeatedly resample the training data and build corresponding hold-outs, which lets them assess the variance of the fitted parameters alongside extrapolation reliability. Each fold's evaluation sets partition into four:

- <strong>Validation (interpolation)</strong>: randomly held-out points inside the training grid's boundaries.
- <strong>Extrapolation N</strong>: points at larger model sizes, simulating prediction for larger architectures.
- <strong>Extrapolation D</strong>: points at larger data volumes, testing extended training horizons.
- <strong>Far extrapolation</strong>: the hardest regime — the largest models trained on the largest data volumes, lying outside <em>both</em> boundaries.

The metric is MAPE:

$$
\mathrm{MAPE}(\mathcal{S}) = \frac{100}{|\mathcal{S}|} \sum_{i \in \mathcal{S}} \left| \frac{\hat{L}_i - L_i}{L_i} \right| \quad [\%]
$$

$R^2$ is reported <strong>on the interpolation set only</strong>. The extrapolation sets contain few points spanning a narrow slice, so normalising by the variance of the held-out targets makes $R^2$ unstable and uninformative there (often small or strongly negative), whereas MAPE stays directly comparable. A small methodological choice that matters more than it looks.

### Iso-ratio compute extrapolation

Where the cross-validation holds out grid corners, this experiment mirrors actual practice. Frontier labs mostly fix a token-to-parameter ratio and project massive runs along one-dimensional compute power laws (the DeepSeek methodology, Bi et al., 2024). So: can a single, <strong>globally fitted</strong> law reliably predict the most expensive runs using only cheap, low-compute data?

Runs are grouped into iso-ratio slices of constant $D/N$, and within each slice the $K = 8$ highest-compute points are held out. Every law is refit <strong>once</strong> on the pooled remainder across all slices, then evaluated on the held-out high-compute runs. As a strong baseline, an independent single power law $L = A C^a + E$ is also fit strictly within each slice (per-ratio). That baseline is heavily tailored to one recipe and can say nothing about joint $N$–$D$ allocation, but it's a useful <strong>empirical upper bound</strong> on how well a dedicated one-dimensional law can extrapolate along a fixed ray.

## Fitting Objective and Compute-Optimal Allocation

What gets "trained" here isn't a network but the scaling law's coefficients.

### The fitting objective

Despite the small parameter count, fitting scaling laws is a surprisingly fragile non-convex problem, for three structural reasons. First, the parameters live on wildly different numerical scales — large $A, B$ against fractional $\alpha, \beta$ — which is severe ill-conditioning for L-BFGS-style optimizers. Second, the landscape is notoriously flat because the loss decreases logarithmically, so optimizers halt prematurely. Third, the parameters compensate for each other strongly. $E$ in particular is hard to estimate because other coefficients shift to offset it, producing wide valleys of distinct local minima with nearly identical surface fits.

The response is to minimise a log-space Huber loss ($\delta = 0.05$), which absorbs much of the scale disparity. Optimization uses L-BFGS-B with analytic (autograd) gradients and 2000 basin-hopping restarts, with starting points drawn from a Sobol quasi-random sequence over the bounded parameter space; $A$ and $B$ are optimized in log scale.

The authors also ran the scale-independent, gradient-free BIPOP-CMA-ES (Hansen, 2016) and found it reaches <strong>equally good</strong> fits. The difference is practical, not qualitative: L-BFGS must be carefully tuned (initialization, restarts, the log-space objective) to reach those solutions reliably, whereas CMA-ES attains them out of the box. All reported results use L-BFGS-B, following common practice.

The key point is that <strong>every law is fit with the same optimizer and the same objective</strong>, so differences in predictive accuracy can be attributed to the functional form rather than the fitting procedure.

### Compute-optimal allocation

The practical reason to have a scaling law is deciding how to split a budget $C$ between $N$ and $D$. With $C = 6ND$, substituting $D = C/(6N)$ isolates the inner additive term as a function of $N$, defining $Z(N) = A/N^\alpha + B(C/6N)^{-\beta}$:

$$
L(N) = Z(N)^{k} + E, \qquad \frac{dL}{dN} = k \cdot Z(N)^{k-1} \cdot Z'(N)
$$

Here's the elegant part. $Z(N)$ is a sum of strictly positive terms and the fits consistently yield $k > 0$, so the scaling factor $k \cdot Z(N)^{k-1}$ is never zero. Minimising the loss therefore requires <strong>exactly</strong> $Z'(N) = 0$ — which is precisely the stationarity condition of the additive Chinchilla law. The monotone outer map $x \mapsto x^k + E$ rescales the loss but leaves its minimiser unchanged, so Skaling gains expressivity without sacrificing tractability.

Solving $Z'(N) = -\alpha A N^{-\alpha-1} + \beta B (6/C)^\beta N^{\beta-1} = 0$ gives $N^{\alpha+\beta} = \frac{\alpha A}{\beta B}(C/6)^\beta$, and substituting $D^\star = C/(6N^\star)$ yields the optimal token-to-parameter ratio:

$$
R_{\text{opt}} = 6^{\frac{\beta-\alpha}{\alpha+\beta}} \left( \frac{\beta B}{\alpha A} \right)^{\frac{2}{\alpha+\beta}} C^{\frac{\alpha-\beta}{\alpha+\beta}}
$$

If $\alpha \approx \beta$, the exponent on $C$ vanishes and the optimal ratio stays <strong>constant</strong> across scales. That's what's observed in Chinchilla, and it's the basis for believing "20 tokens per parameter" holds at every scale.

And here's where it bites. <strong>The algebraic formula is identical to Chinchilla's, but the fitted $A, B, \alpha, \beta$ do not transfer between the two forms.</strong> The same formula therefore produces very different numbers. On Farseer data, Skaling fits $\alpha = 0.32 < \beta = 0.39$, predicting a $D^\star/N^\star$ that <em>decreases</em> with compute, while Chinchilla fits $\alpha = 0.27 > \beta = 0.24$ and predicts an essentially flat ratio. <strong>The signs are opposite.</strong>

### Verifying allocation without a parametric fit

The derivative estimates from earlier come back here. For a fixed budget, the Lagrangian stationarity conditions cancel the multiplier and leave a condition on the gradients alone:

$$
N \frac{\partial L}{\partial N} = D \frac{\partial L}{\partial D} \iff \frac{\partial \ln L}{\partial \ln N} = \frac{\partial \ln L}{\partial \ln D}
$$

At a compute-optimal point, a 1% increase in model size and a 1% increase in data have the same effect on the loss. This is a <em>constrained</em> stationarity condition — the full gradient need not vanish, since spending more compute would still reduce loss.

Because the empirical data is a set of discrete points, this equilibrium can't be located directly on the grid. Instead the authors build two <strong>independent</strong> continuous surrogates — a global GP posterior mean and a local MLS fit — and track where the difference between the two log-slopes crosses zero. No parametric scaling law is assumed anywhere in that path.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/fig6-optimal-ratio.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: Empirical compute-optimal token-to-parameter ratio on Farseer, recovered without a parametric fit. Left: both empirical optima follow Skaling far more closely than the nearly flat Chinchilla prediction. Right: power-law fits of each empirical frontier extrapolated to 2x10^25 FLOPs — the empirical exponents (-0.14, -0.15) are close to Skaling (-0.11) and have the opposite sign from Chinchilla (+0.03)."
   zoomable=true %}

The two estimates agree qualitatively. Both recover a ratio that <strong>decreases</strong> with compute and closely tracks Skaling's closed-form $R\_{\text{opt}}$, whereas Chinchilla predicts a nearly flat ratio. Fitting each empirical frontier as $D^\star/N^\star \propto C^m$ gives $m \approx -0.14$ for GP and $m \approx -0.15$ for MLS, close to Skaling's $-0.11$ and opposite in sign to Chinchilla's $+0.03$. Extrapolated well beyond the data, to $2 \times 10^{25}$ FLOPs, the allocations differ by more than 10×: Chinchilla approaches roughly 380 tokens per parameter while the empirical fits and Skaling fall to 20–40.

## Data and Training Pipeline

The laws are fit and evaluated on four grids of pretraining loss measurements.

| Dataset | Size | Model sizes | Data budgets | Compute range |
|------|------|------|------|------|
| Farseer (Li et al., 2025) | 404 configs | 25 sizes, 100M–6.4B | 55 budgets, 1B–512B tokens | 1.6×10^18 – 4.1×10^21 FLOPs |
| SK-Grid (internal) | 134 configs | 15 sizes, 134M–4.9B | 16 budgets, 316M–316B tokens | 9.0×10^16 – 9.9×10^20 FLOPs |
| Farseer-code | 117 runs | 9 sizes, 201M–3.18B | 20 budgets, 2B–128B tokens | 2.4×10^18 – 2.4×10^21 FLOPs |
| Chinchilla (Besiroglu et al., 2024) | 245 scattered points | 57M–16.2B | 245M–318B tokens | 1.4×10^18 – 1.3×10^22 FLOPs |

On Farseer, three hold-out sets are carved out: Extrapolation N takes the three largest model sizes (4.5B–6.4B, 36 points), Extrapolation D takes the top-3 data budgets per remaining model size (66 points), and far extrapolation uses 7 additional runs well beyond both axes (2.3B–25B parameters trained on 126B–453B tokens). The remaining 302 configurations used for fitting total roughly $5.0 \times 10^{22}$ FLOPs.

SK-Grid's equivalent split yields 7 points for Extrapolation N (2.8B–4.9B), 33 for Extrapolation D, and 3 far-extrapolation runs at around $10^{22}$ FLOPs (5.8B–10.8B parameters), with a fitting grid of about $3.1 \times 10^{21}$ FLOPs. The Chinchilla measurements don't lie on a regular grid, so only the full-grid split applies (no L-shape).

SK-Grid's training setup:

| Item | Value |
|------|------|
| Model sizes | 14, from 134M to 4.93B (per appendix Table 7) |
| $d\_{\text{model}}$ | 672 → 3264 |
| Depth | 7 → 34 layers |
| Tokenizer | Llama 3, vocab 128,256 |
| Sequence length | 2048 |
| Position encoding | RoPE ($\theta = 10^4$) |
| Optimizer | AdamW, $(\beta\_1, \beta\_2) = (0.9, 0.95)$, weight decay 0.1, grad clip 0.1 |
| LR schedule | cosine, 10% warmup, final LR $1 \times 10^{-6}$ |
| Data mixture | 60% DCLM-Edu · 30% code · 10% math |
| Framework | Meta Lingua (Videau et al., 2024) |

Token budgets follow a geometric ladder from 316M to 316B, five budgets per decade. Per-run compute is capped, so larger models are trained on fewer budgets: the smallest cover all 16 horizons while the largest gets a single budget, producing a staircase grid.

Per-run learning rate and batch size follow the StepLaw prescription (Li et al., 2025), as functions of per-token compute $F$ and token budget $D$:

$$
\begin{aligned}
B &= 896.07\, F^{0.231}, \\
\eta &= 0.0709\, F^{-0.4303} D^{0.2785}
\end{aligned}
$$

Using near-optimal hyperparameters at every $(N, D)$ matters, because it ensures the measured loss reflects the architecture's scaling behaviour rather than hyperparameter mistuning. The authors flag this explicitly as a caveat too: the shape of the loss surface is highly sensitive to these choices, and a broadly mistuned grid could artificially <strong>dampen</strong> the measured interaction or skew the optimal ratio. Part of why different datasets exhibit different coupling strengths lives here.

## Results

{% include figure.liquid loading="eager"
   path="assets/img/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/tab1-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Fit quality and predictive error on Farseer and SK-Grid, reporting interpolation R^2 and MAPE (%, mean±std over 5 CV folds) across four regimes, for both the full grid and the sparse L-shape grid."
   zoomable=true %}

### Boundary errors

The clearest gains appear at the boundaries. Interior interpolation is already accurate for the additive law; the error grows on the single-axis and far-extrapolation sets, where Figure 1's saddle-shaped residual is most pronounced.

On the full grids, single-axis MAPE falls consistently: on Farseer from 1.48 to 0.47 (Ext. N) and 1.98 to 0.88 (Ext. D); on SK-Grid from 0.83 to 0.39 and 1.44 to 0.58. The largest gains sit in the most imbalanced corners. SK-Grid far extrapolation drops from 5.17 to 0.70 on the full grid (about 7.4×) and from 14.63 to 1.15 on the L-shape grid (about 12.7×), while the largest-$N$ L-shape error falls from 6.09 to 0.77.

### Sparse profiling

The L-shape grid uses roughly 10× less fitting compute than the full grid on Farseer (5.0×10^22 → 5.1×10^21 FLOPs) and about 4.8× less on SK-Grid (3.1×10^21 → 6.5×10^20 FLOPs).

Under that constraint the two laws part ways. Skaling stays <strong>close to or better than the full-grid Chinchilla baseline</strong> on interpolation and single-axis extrapolation. Chinchilla degrades substantially: on Farseer, interpolation MAPE goes from 0.77 to 2.51; on SK-Grid, far-extrapolation MAPE rises from 5.17 to 14.63.

The direction matters. The coupled form preserves predictive accuracy when the training grid is concentrated on the low-compute edges — which is exactly the setting the sparse profiling strategy needs. The additive form isn't usable there.

### Interpolation quality is not sufficient

This is the most broadly applicable lesson in the paper. Chinchilla attains strong interpolation $R^2$ on the full grids (0.995 on Farseer, 0.992 on SK-Grid), yet its extrapolation errors at the boundaries are several times Skaling's.

The failure mode isn't a poor fit to the interior. It's a systematic misprediction of <strong>how the loss surface bends away from the observed region</strong> — something $R^2$ tells you nothing about. Judging a scaling law by its reported fit quality is genuinely risky.

### Fitted coefficients

{% include figure.liquid loading="eager"
   path="assets/img/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/tab2-fitted-coefficients.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: Fitted coefficients (mean±std over 5 CV folds) behind Table 1. Chinchilla is the k=1 special case of Skaling; the nine-parameter Farseer law is omitted."
   zoomable=true %}

The coefficients explain why the boundary predictions improve. Across all four grids, Skaling recovers a <strong>sub-unit coupling exponent</strong> $k \approx 0.31$–$0.45$ rather than collapsing back to the additive $k = 1$ — independent corroboration of the Section 2 diagnostic.

The fitted irreducible loss is systematically lower than Chinchilla's, nearly vanishing on Farseer (0.45 → 0.03 on the full grid, 0.59 → 0.05 on the L-shape) while staying substantial on SK-Grid (1.75 → 1.14).

Here the authors apply their own brake, and I think this restraint materially raises the paper's credibility. <strong>$E \approx 0$ should not be read as a vanishing loss floor.</strong> The coupling $k$ and the floor $E$ trade off against each other: with $k < 1$, the concave outer map makes the coupled reducible term decay more slowly at large scale, so it can absorb curvature that an additive law could only represent through a larger $E$. Since none of the runs reach the scale where the loss saturates, the data fixes the total loss but not this split between a decaying term and a constant floor. Skaling resolves the ambiguity by pushing $E$ toward zero, and nothing guarantees that's the physical truth.

Beyond $E$, every parameter is determined precisely within each fit, with fold-to-fold standard deviations of a few percent for the exponents and coupling, and at most about 40% for the amplitudes.

### More parameters is not the answer

The nine-parameter Farseer law has far more degrees of freedom yet doesn't remove the boundary failure. It's less accurate than Skaling in most regimes of Table 1, and its largest errors concentrate on <strong>data extrapolation</strong> (MAPE 4.13 on Farseer and 4.45 on SK-Grid full grids). The gain comes from an inductive bias matched to the observed $N$–$D$ interaction, not from parameter count.

That said, part of the difference may be that the richer form is simply harder to fit. The authors tried several optimizers, including Farseer's own pipeline, without obtaining a substantially better fit, and report the best Farseer results they could get. I'll come back to that honest footnote.

### Weak coupling, weak gains

The benefit shrinks when the observed coupling is closer to additive. On Farseer-code and the original Chinchilla measurements, the fitted coupling is much closer to additive ($k \approx 0.77$–$0.90$) and Skaling performs at roughly Chinchilla-level accuracy.

This is expected behaviour from a <strong>nested form</strong>, not a defect. Because Chinchilla is recovered at $k = 1$, Skaling departs from the additive law only when the data supports a coupled surface and otherwise stays close to the additive fit. A model that can tell you "I'm not needed here" is a good model.

### Compute extrapolation

{% include figure.liquid loading="eager"
   path="assets/img/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/tab3-compute-extrapolation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: Compute extrapolation on Farseer, with iso-ratio slices grouped into undertrained (D/N=1.8-7), optimal (10-40) and overtrained (56-158) thirds. Every law is refit only on the computationally inexpensive runs and evaluated on the 112 highest-compute runs."
   zoomable=true %}

Skaling is the best <strong>global</strong> law in every regime and overall (pooled MAPE 0.60±0.27%, a 3.9× reduction over additive Chinchilla's 2.34 and below the far more heavily parameterized Farseer's 0.80). It's also the most stable: its error never exceeds 0.9% in any regime.

Chinchilla, by contrast, is strongly regime-dependent. It's the weakest of all laws in the optimal band at 3.47% (with $R^2$ falling to 0.47), and its pooled number of 2.34% partly hides where it fails. You only see that by splitting out the regimes.

The only reference that edges out Skaling is the per-ratio power law, and only near the optimum (0.77 vs 0.88%). That baseline is fit separately per recipe and so cannot inform joint $N$–$D$ allocation; a one-dimensional law behaving well along a fixed ray is unsurprising.

### Additional datasets

The same protocol on Farseer-code (117 runs) and the original Chinchilla measurements (245 points) holds the pattern: Skaling fits $k < 1$ and a smaller $E$ than Chinchilla, but the coupling is weaker here ($k \approx 0.77$–$0.90$) and the accuracy gains are correspondingly mixed.

Worth stating plainly: on the original Chinchilla measurements, <strong>Chinchilla wins on Ext. N</strong> (1.16 vs Skaling's 1.28). Skaling wins Ext. D on the same dataset (0.51 vs 0.63) and interpolation is effectively a tie (0.61 vs 0.63). Skaling doesn't win everywhere.

## Analysis and Ablations

### Dominated-pair fitting — the paper's most important self-critique

Appendix F contains the most interesting ablation, and I think the main text undersells it.

The recurring difficulty is that $E$ is only weakly identified: interior points constrain it poorly and other coefficients shift to absorb it. Dominated-pair fitting removes $E$ from the objective <strong>entirely</strong>. For any ordered pair where configuration $i$ dominates $j$ (bigger model, more data, lower loss), the additive floor cancels in the loss difference:

$$
L_j - L_i = \left( A N_j^{-\alpha} + B D_j^{-\beta} \right)^{k} - \left( A N_i^{-\alpha} + B D_i^{-\beta} \right)^{k}
$$

The shape parameters $(A, B, \alpha, \beta, k)$ are fit on all such pairwise differences, and the floor is recovered afterwards as the median residual, decoupling reducible shape from constant offset.

The result is telling. This correction serves primarily as a fix for the <strong>additive Chinchilla law</strong>: its far-extrapolation error drops from 2.46% to 0.79% on Farseer and from 5.17% to 3.67% on SK-Grid, on the full grids. It does not consistently improve Skaling.

Note what that implies. On Farseer's full grid far-extrapolation set, <strong>Chinchilla + dominated-pair (0.79) beats Skaling (2.32)</strong>. In that regime, fixing only the <em>fitting procedure</em> — without changing the functional form at all — outperforms the coupled form. This muddies the paper's form-versus-procedure framing. Skaling still dominates elsewhere (SK-Grid full grid: 3.67 vs 0.70; Farseer L-shape: 7.84 vs 1.57), so the conclusion doesn't reverse, but the authors' own diagnosis — that much of Chinchilla's extrapolation error stems from weak identification of $E$ — deserves to be taken seriously.

### The direction of allocation change is not universal

That coupling changes large-scale allocation is well supported. <strong>Which way</strong> it changes is dataset-specific.

On Farseer, Skaling fits $\alpha < \beta$, giving a $D^\star/N^\star$ that decreases with compute — consistent in sign with the GP and MLS empirical estimates (-0.14, -0.15). On SK-Grid, however, the fitted exponents satisfy $\alpha > \beta$ on both the full and L-shape grids, so the same closed-form optimum <strong>increases</strong> the token-to-parameter ratio with compute.

The robust conclusion is therefore "coupling changes large-scale allocation," not "the token-to-parameter ratio should shrink with compute." The latter is a statement about Farseer data and its training recipe. The paper is clear about this.

## Limitations and Critical Assessment

<strong>Acknowledged by the authors</strong>

- On datasets where the coupling is weak (Farseer-code, the original Chinchilla measurements), $k$ lands at 0.77–0.90 and most of Skaling's advantage disappears.
- The <strong>direction</strong> of the allocation shift depends on the dataset and architecture (decreasing on Farseer, increasing on SK-Grid).
- Hyperparameter policy can alter the apparent $N$–$D$ coupling itself. A mistuned grid can artificially dampen the measured interaction or skew the optimal ratio, so cross-dataset comparisons inherently reflect each grid's specific recipe.
- $E \approx 0$ must not be read as a vanishing loss floor, since $k$ and $E$ trade off and no run reaches the saturation scale.

<strong>Additional limitations from a reviewer's perspective</strong>

- <strong>Form and procedure aren't cleanly separated.</strong> As above, on Farseer's full-grid far extrapolation, dominated-pair fitting alone lets Chinchilla beat Skaling. Disentangling "we need a coupled form" from "we need to identify $E$ properly" would require a factorial table crossing both corrections — and that comparison belongs in the main text, not buried in an appendix and left out of the discussion.
- <strong>No statistical significance testing.</strong> Standard deviations across 5 CV folds are reported but no tests are run. The Farseer baseline in particular has enormous fold-to-fold variance (Ext. D 4.13±1.36, Far 2.43±1.93, L-shape Ext. N 2.07±1.72), making mean-only rankings hard to defend. The Skaling-vs-Chinchilla boundary gaps are large enough to survive this; the Skaling-vs-Farseer comparison is much weaker.
- <strong>The Farseer baseline isn't evaluated under its own conditions.</strong> The authors explain that Farseer's original pipeline estimates components from consecutive-$D$ differences, a structure that the L-shape grids and CV hold-outs break, so they used direct optimization uniformly. That's methodologically right, but the Farseer performance reported here isn't Farseer's performance under its own recipe.
- <strong>It isn't reproducible.</strong> SK-Grid is an internal set of runs and no code is released. Farseer and Chinchilla grids are public so that portion is checkable, but a large share of the headline claims — the strongest far-extrapolation gains — come from SK-Grid.
- <strong>SK-Grid's configuration count disagrees between the body and the appendix.</strong> Section 4.1 says "134 configurations across 15 model sizes" while Section E.1 and Table 7 say "125 runs across 14 model sizes" (Table 7's budget column also sums to 125). Which set was actually fit is unclear.
- <strong>The extrapolation claims reach far beyond the data.</strong> The largest validated far-extrapolation run is Farseer's 25B-parameter model, and the Farseer fitting grid tops out at $4.1 \times 10^{21}$ FLOPs. Figure 6 extrapolates to $2 \times 10^{25}$ FLOPs to argue a 10× allocation gap (Chinchilla approaching 380 tokens per parameter versus Skaling's 20–40) — <strong>three-plus orders of magnitude</strong> past the upper edge of the fitting data. The appendix text describing this as "one order of magnitude beyond the data" doesn't match Figure 6's own horizontal axis. Both laws could be wrong out there, and nothing in the paper tests that region.
- <strong>The practical significance of the interpolation gain isn't argued.</strong> Full-grid interpolation MAPE improving from 0.77% to 0.41% is a large relative change but both are under 1%. Whether that shifts any real budget decision needs a separate argument. Boundary extrapolation (5.17% → 0.70%) is a different story, and that's where the paper's practical value sits.
- <strong>Generalisation to other scaling axes is untested.</strong> The conclusion expects this coupling dynamic to apply along other axes, but there's no validation on data mixtures, repeated data, or distillation.

## Takeaways

- <strong>Interpolation $R^2$ is close to useless for choosing a scaling law.</strong> On SK-Grid, Chinchilla achieves an interpolation $R^2$ of 0.992 while the same fit is off by 5.17% in far extrapolation. If the point of the law is predicting <em>outside</em> the observed region, evaluate it there. Don't infer trustworthiness from a reported fit quality.
- <strong>Estimating derivatives from your own data before picking a form is cheap and powerful.</strong> Recovering the mixed derivative with MLS or a GP needs zero new runs — the loss measurements you already have suffice. And "an additive law predicts this is zero" is a crisply falsifiable statement, which turns functional-form selection from a matter of taste into a testable hypothesis.
- <strong>Most of a scaling experiment's budget goes to the top-right corner of the grid.</strong> If the L-shape strategy holds, budget allocation changes fundamentally — the roughly 10× saving on Farseer moves "what it costs to obtain a scaling law" into a different bracket. But it only works paired with a coupled form; Chinchilla falls apart on the same grid.
- <strong>$k < 1$ is the minimal expression of the synergy between capacity and data.</strong> The intuitively obvious fact that growing both together beats growing either alone was not even representable in the standard functional form. That's the paper's core observation.
- <strong>Don't read a fitted $E$ as a physical quantity.</strong> The authors warn about this in their own results. $k$ and $E$ trade off, and unless you've trained to the scale where the loss saturates, the data cannot determine the split. Whenever a paper reports "irreducible loss = X", check which functional form produced it.
- <strong>Adding parameters is not the answer.</strong> The nine-parameter Farseer law is less accurate than six-parameter Skaling in most regimes, with errors concentrated on data extrapolation. What matters is an inductive bias matched to the data's actual structure, not degrees of freedom.

## References

- Paper: <https://arxiv.org/abs/2608.07222>
- Meta Lingua — the minimal PyTorch LLM training library used for SK-Grid: <https://github.com/facebookresearch/lingua>
- Farseer grid (public runs): <https://arxiv.org/abs/2506.10972>

## Further Reading

- **[Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361)** (Kaplan et al., 2020) — the original coupled form Skaling revives. It ties the two axes through an outer exponent but fixes the inner exponents to a ratio, losing per-axis independence.
- **[Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556)** (Hoffmann et al., 2022) — the additive Chinchilla law this paper generalizes, and the source of the "20 tokens per parameter" rule.
- **[Predictable Scale: Part II, Farseer: A Refined Scaling Law in Large Language Models](https://arxiv.org/abs/2506.10972)** (Li et al., 2025) — the competing form that expresses the $N$–$D$ interaction with nine parameters, and the provider of this paper's main experimental grid.
- **[Distillation Scaling Laws](https://arxiv.org/abs/2502.08606)** (Busbridge et al., 2025) — the closest prior work, using the same untied outer-exponent form for the supervised terms inside a distillation scaling law without studying the resulting $N$–$D$ interaction.
- **[Resolving Discrepancies in Compute-Optimal Scaling of Language Models](https://arxiv.org/abs/2406.19146)** (Porian et al., 2024) — representative of the line that attributes the Kaplan–Chinchilla disagreement to the <em>fitting procedure</em>, which this paper pushes back on.

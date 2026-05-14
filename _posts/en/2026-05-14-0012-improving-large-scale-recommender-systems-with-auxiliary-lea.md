---
layout: post
title: "[Paper Review] Improving Large-Scale Recommender Systems with Auxiliary Learning"
date: 2026-05-14 14:00:00 +0900
description: "Analysis of C2AL, Meta's framework that combats majority-cohort bias in large-scale ads recommendation models via cohort-contrastive auxiliary learning."
tags: [recommender-systems, auxiliary-learning, multi-task-learning, factorization-machine, attention, ads-ranking, representation-bias]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig1-dhen-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/
ko_url: /papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Mertcan Cokbas et al. (13 co-authors, Meta Platforms) |
| Venue | arXiv preprint · 2026 · ICLR 2026 submission |
| arXiv | [2510.02215](https://arxiv.org/abs/2510.02215) |
| Data | Meta production ads data — billions of samples per model, six production models |
| <span style="white-space: nowrap">Review date</span> | 2026-05-14 |

## TL;DR

- Training large-scale ads recommendation models under a *single* global objective lets the *majority cohorts* in the data dominate the gradient. The result is a sparse attention-weight distribution in the FM-based attention layer that collapses minority-cohort representation pathways.
- C2AL (Cohort-Contrastive Auxiliary Learning) discovers the head/tail cohort pair with maximal *predictive divergence* along a semantic axis (user value, age, advertiser size, …) and adds two binary classification auxiliary heads on top of the shared encoder — one for each cohort.
- Mechanistically, the auxiliary gradient injects cohort-specific signal directly into the attention-matrix update, reshaping a sparse-and-concentrated $\mathbf{Y}$ into a denser, higher-diversity one. This is *functional regularization* (acting on the model's predictive behavior over specific cohorts), not parameter regularization.
- Across six Meta production ads models, C2AL delivers a consistent -0.05 % to -0.16 % NE reduction, with -0.30 %+ gains on targeted minority cohorts. The auxiliary heads are discarded at inference, so the serving cost is unchanged.

## Introduction

Ads ranking models live on inherently *heterogeneous* data. The same model has to serve users across wildly different value tiers, age ranges, advertiser sizes, and surface types (Facebook vs. Instagram, onsite vs. offsite). The conditional distribution $p(y \mid \mathbf{x}, \text{cohort})$ shifts considerably from cohort to cohort. Yet training is driven by a single global expected loss, so high-density majority cohorts capture the gradient and tail cohorts lose representational bandwidth.

The pathology gets *worse* as data scales up, not better. As models and datasets grow, optimization is sucked further into the high-density regions, and the attention layer collapses into a "mostly zero, a few spikes" distribution. This isn't ordinary sparsity — it's the disappearance of representational pathways that minority cohorts need.

The multi-task learning (MTL) community has attacked the symptom with task-balancing tricks: MMoE, PLE, PCGrad, CAGrad, and so on. But those methods optimize *joint task performance* across explicit tasks; they don't directly target the *representation bias of a single primary task*. C2AL therefore reaches further back to Caruana's original notion of auxiliary learning — auxiliary tasks that exist only at training time and are thrown away at inference.

Two things make this paper worth reading. First, it gives a *mechanistic* explanation grounded in gradient dynamics and attention-matrix distribution, not the usual "it just works better." Second, it validates at Meta scale — six production ads models with billions of training samples each — so the result isn't a benchmark cherry-pick.

## Key Contributions

1. **The C2AL framework.** Automatically discover the cohort pair along a semantic axis whose predictions diverge the most, then add two binary classification heads (one per cohort) on top of the shared encoder. At inference, both heads and their parameters $\{\theta\_{\text{head}}, \theta\_{\text{tail}}\}$ are *discarded*, recovering the original single-task architecture and zero serving cost.

2. **A mathematical and empirical anatomy of the mechanism.** The auxiliary gradient $\lambda\_{\text{aux}}\,\nabla\_{\mathbf{G}}\,\mathcal{L}\_{\text{aux}}$ enters the attention-matrix update via $\nabla\_{\mathbf{Y}}\,\mathcal{L}\_{\text{C2AL}} = \mathbf{X}\mathbf{X}^\top(\nabla\_{\mathbf{G}}\,\mathcal{L}\_{\text{primary}} + \lambda\_{\text{aux}}\,\nabla\_{\mathbf{G}}\,\mathcal{L}\_{\text{aux}})$, and the paper visualizes how the attention-weight distribution evolves from sparse to diverse across four snapshots (0.4 B / 2.4 B / 7.2 B / 12 B training samples).

3. **Broad production validation.** Six models spanning funnel stage (early vs. final), optimization objective (CTR vs. CVR), platform (FB vs. IG), and conversion type (onsite vs. offsite) all show statistically significant NE reductions. Crucially, minority-cohort gains do *not* come at the expense of majority cohorts — the trade-off is not zero-sum.

4. **Re-defining "contrastive."** The paper is explicit (footnote 1 on page 1) that *contrastive* here is *not* InfoNCE-style instance discrimination. Instead it refers to *partially conflicting* binary labels between head and tail cohorts that force the shared representation to become cohort-aware.

## Related Work & Background

### Multi-Task Learning

MTL is fundamentally about sharing inductive bias across tasks via a *shared representation* (Caruana, 1997). Subsequent work splits into two camps:

**Architecture-based.** Decide which parameters are shared and which are task-specific. Mixture-of-Experts variants like MMoE (Ma et al., 2018) and PLE (Tang et al., 2020) are the canonical examples — task-specific gating over a shared expert pool.

**Optimization-based.** Decide how to combine conflicting task gradients. MGDA (Sener & Koltun, 2018) frames MTL as multi-objective optimization, PCGrad (Yu et al., 2020) projects away conflicting gradient components, CAGrad (Liu et al., 2024) takes a conflict-averse descent direction, and Jeong & Yoon (2025) propose selective task-group updates.

All of these are designed to optimize *joint* task performance, not to directly target the *representation bias of a single primary task*.

### Auxiliary Learning

Jaderberg et al. (2016) showed that unsupervised auxiliary tasks can shape representations in RL. Du et al. (2020) introduced cosine-similarity-based dynamic gating of auxiliary losses. Hu et al. (2022) and Li et al. (2023) observed that multi-task learning reduces spurious correlations in recommendation, but their accounts stop at "representations become better" without saying *how* or *where*. C2AL's contribution is filling exactly that mechanistic gap.

### DHEN: the backbone C2AL surgically modifies

DHEN (Zhang et al., 2022) is Meta's ads-ranking backbone, stacking **Input Embeddings → Interaction layer (FM-based attention) → Ensemble layer → Add & Norm** on top of sparse embeddings. The component C2AL targets is the *interaction layer*, where an attention MLP produces a weight matrix $\mathbf{Y} \in \mathbb{R}^{d \times k}$ given a mini-batch $\mathbf{X} \in \mathbb{R}^{d \times m}$ of $m$ active sparse embedding columns, and the compressed interaction embedding is computed bi-linearly:

$$
\mathbf{G} = \mathbf{X} \mathbf{X}^\top \mathbf{Y}
$$

Here $\mathbf{X}\mathbf{X}^\top \in \mathbb{R}^{d \times d}$ is the outer product of the batch's sparse features, and $\mathbf{Y}$ projects that outer product into a $k$-dimensional tractable space. The sparsity of $\mathbf{Y}$ is the epicenter of the representation bias.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig1-dhen-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: The Deep and Hierarchical Ensemble Network (DHEN) and its internal interaction layer. The FM-based attention is the mechanism C2AL surgically modifies."
   zoomable=true %}

In the baseline, the attention-weight distribution is light-tailed: nearly all mass concentrated near zero, only a few tokens carrying meaningful weight. That is the visual signature of "only enough feature interactions to capture the majority cohort survived" — minority-cohort interaction pathways are essentially *dead* in training.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig2-attention-sparsity.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: Attention-weight distributions in two production models. The baseline (blue) is tightly concentrated near zero; C2AL (red) develops a denser, heavier-tailed distribution that preserves minority-cohort feature interactions."
   zoomable=true %}

## Method & Architecture in Detail

### Problem Setup

A standard supervised setup. Input $\mathbf{x} \in \mathcal{X}$, binary label $y \in \{0, 1\}$ (e.g., click). The model has two components:

- **Shared representation encoder** $f: \mathcal{X} \to \mathbb{R}^d$ parameterized by $\theta\_S$, producing $\mathbf{h} = f(\mathbf{x}; \theta\_S)$.
- **Primary prediction head** $g\_{\text{primary}}: \mathbb{R}^d \to [0, 1]$ parameterized by $\theta\_H$, producing $\hat{y} = g\_{\text{primary}}(\mathbf{h}; \theta\_H)$.

The baseline objective minimizes the expected loss on $\mathcal{D}$:

$$
\{\theta_S^*, \theta_H^*\} = \arg\min_{\theta_S, \theta_H} \mathbb{E}_{(\mathbf{x}, y) \sim \mathcal{D}} \left[ \mathcal{L}(\hat{y}, y) \right]
$$

with the standard gradient update

$$
\theta^{(t+1)} = \theta^{(t)} - \alpha^{(t)} \nabla_\theta \mathcal{L}(\theta), \quad \theta \in \{\theta_S, \theta_H\}.
$$

On heterogeneous data this objective lets $\mathbf{h}$ become biased toward majority cohorts.

### C2AL: Contrastive Cohort Discovery

Partition the data along an interpretable *semantic axis* (user-value quantiles, age buckets, advertiser size, …) into disjoint cohorts $\{\mathcal{C}\_1, \dots, \mathcal{C}\_N\}$. For each axis, look at the baseline model's prediction distribution per cohort and compute a *pairwise divergence* between cohorts. KL divergence, cosine similarity, Jensen-Shannon distance, Wasserstein distance — the paper says any of these works, without specifying which was actually used in production.

The cohort pair with maximal distributional disparity becomes $\mathcal{C}\_{\text{head}}, \mathcal{C}\_{\text{tail}}$. For Model A (Instagram click prediction), this is the top 5 % and bottom 5 % of users by a proprietary user-value metric — and the baseline-prediction PDFs of those two cohorts do peak in different places, confirming the divergence.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig3-cohort-divergence.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Baseline Model A (Instagram click objective) prediction PDFs for the head (Top 5 %) and tail (Bottom 5 %) cohorts. Tail peaks near 0.7, head near 0.8 — clear distributional divergence."
   zoomable=true %}

The authors note that divergence is a *necessary but not sufficient* criterion; cohort size and causal structure also influence the final choice.

### C2AL: Auxiliary Task Construction

Given the two cohorts, define two binary auxiliary labels by *masking the primary positive label* with cohort membership:

$$
y_{\text{head}} = y \cdot \mathbb{1}(\mathbf{x} \in \mathcal{C}_{\text{head}}) \qquad y_{\text{tail}} = y \cdot \mathbb{1}(\mathbf{x} \in \mathcal{C}_{\text{tail}})
$$

Add two heads $g\_{\text{head}}, g\_{\text{tail}}$ (parameters $\theta\_{\text{head}}, \theta\_{\text{tail}}$) on top of the shared representation $\mathbf{h}$. The training objective is

$$
\begin{aligned}
\mathcal{L}_{\text{C2AL}} = \; & \underbrace{\mathcal{L}(g_{\text{primary}}(\theta_S; \theta_H), y)}_{\text{Primary Task Loss}} \\
& + \underbrace{\lambda_{\text{head}} \mathcal{L}(g_{\text{head}}(\theta_S; \theta_{\text{head}}), y_{\text{head}}) + \lambda_{\text{tail}} \mathcal{L}(g_{\text{tail}}(\theta_S; \theta_{\text{tail}}), y_{\text{tail}})}_{\text{Cohort-Contrast Losses}}
\end{aligned}
$$

**Crucially**, this loss is used only during training. At inference, both auxiliary heads and their parameters $\{\theta\_{\text{head}}, \theta\_{\text{tail}}\}$ are *discarded*, and the model reverts to the single-task architecture evaluating only $\hat{y} = g\_{\text{primary}}(\mathbf{h}; \theta\_H)$. Inference cost, latency, and serving infrastructure are unchanged.

### Learning Dynamics: why the attention layer changes

For analysis, fold the two auxiliary losses into a single weighted aux:

$$
\mathcal{L}_{\text{C2AL}} = \mathcal{L}_{\text{primary}}(\mathbf{G}, y) + \lambda_{\text{aux}} \mathcal{L}_{\text{aux}}(\mathbf{G}, y_{\text{aux}})
$$

Take the partial derivative with respect to the attention matrix $\mathbf{Y}$. Because $\mathbf{G} = \mathbf{X}\mathbf{X}^\top \mathbf{Y}$, the chain rule gives

$$
\nabla_{\mathbf{Y}} \mathcal{L}_{\text{C2AL}} = (\mathbf{X}\mathbf{X}^\top)\left(\nabla_{\mathbf{G}} \mathcal{L}_{\text{primary}} + \lambda_{\text{aux}} \nabla_{\mathbf{G}} \mathcal{L}_{\text{aux}}\right).
$$

This is the central mechanistic insight. With $\lambda\_{\text{aux}} = 0$ (the baseline case), $\nabla\_{\mathbf{Y}}\,\mathcal{L}\_{\text{C2AL}}$ is dominated by majority-cohort gradients and $\mathbf{Y}$ converges to a sparse, concentrated state that captures only the high-density region's feature interactions. The auxiliary term injects cohort-specific signal $\nabla\_{\mathbf{G}}\,\mathcal{L}\_{\text{aux}}$ directly into the update for $\mathbf{Y}$, forcing minority-cohort signal into the attention matrix.

Because $\mathbf{G}$ depends linearly on $\mathbf{Y}$, those targeted changes flow straight through to the compressed representation:

$$
\Delta \mathbf{G} = (\mathbf{X}\mathbf{X}^\top) \Delta \mathbf{Y}
$$

The downstream consequence is a richer set of feature interactions in $\mathbf{G}$, which is what drives the primary-task improvement.

The authors also show empirically that the effect is *localized* to the attention layer. The sparse layer and the ResNet-style FM layer preceding the attention MLP show nearly identical distributions for baseline and C2AL; only the attention and post-attention layers differ visibly.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig4-weight-distributions.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Weight distributions across four layers. Left (sparse, ResNet-style FM): baseline (blue) and C2AL (red) overlap almost completely. Right (attention, post-attention): clear divergence — C2AL's effect is localized to the attention component."
   zoomable=true %}

### How the attention distribution evolves over training

The authors snapshot the attention-weight distribution at four points (0.4 B / 2.4 B / 7.2 B / 12 B training samples). Both models are initialized to a light-tail bell shape, with C2AL actually starting *more* sparse than the baseline — yet the trajectories diverge dramatically.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig5-attention-evolution.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: Evolution of attention weights throughout training. (a) 0.4 B: C2AL extremely concentrated. (b) 2.4 B: diversity starts increasing. (c) 7.2 B: C2AL noticeably heavier-tailed than baseline. (d) 12 B: C2AL reaches max diversity while baseline distribution is essentially unchanged."
   zoomable=true %}

The takeaway from (d) is the strongest: *more data alone does not pull the baseline out of its sparse state*. This isn't slow convergence — the baseline is caught in an attractor that the majority cohort created and which more data only reinforces.

### Gradient Dynamics: the effect of partially conflicting labels

Decompose the positive samples ($y = 1$) into three regions:

- $\mathbf{x} \in \mathcal{C}\_{\text{head}}$: labels are $(y, y\_{\text{head}}, y\_{\text{tail}}) = (1, 1, 0)$. Primary and head losses align — they *amplify* the learning signal for the head cohort.
- $\mathbf{x} \in \mathcal{C}\_{\text{tail}}$: labels are $(1, 0, 1)$. Symmetric effect, amplifying tail.
- $\mathbf{x} \notin \{\mathcal{C}\_{\text{head}} \cup \mathcal{C}\_{\text{tail}}\}$ (majority sample): labels are $(1, 0, 0)$. The primary loss pushes $\mathbf{h}$ to be predictive of a positive outcome, while *both* auxiliary losses push it to be predictive of a negative outcome for their respective heads. This is the *partial conflict* the paper engineers.

The third region is where the magic happens. For a majority positive sample, the auxiliary losses inject *opposing* signal: "this sample is neither head nor tail, so predict negative for those heads." To satisfy primary and both auxiliary losses simultaneously, the shared encoder $\theta\_S$ must learn representations that not only distinguish positive from negative but also distinguish *head/tail/middle* cohorts. That is what makes the representation cohort-aware.

### C2AL as Functional Regularization

To make this even sharper, decompose the auxiliary gradient on the shared parameters. With $G\_{\text{primary}}(\theta\_S) = \nabla\_{\theta\_S}\,\mathcal{L}(\theta\_S, \theta\_H, y)$ and $G\_{\text{aux}}(\theta\_S) = \lambda\_{\text{head}}\,\nabla\_{\theta\_S}\,\mathcal{L}(\theta\_S, \theta\_{\text{head}}, y\_{\text{head}}) + \lambda\_{\text{tail}}\,\nabla\_{\theta\_S}\,\mathcal{L}(\theta\_S, \theta\_{\text{tail}}, y\_{\text{tail}})$, project $G\_{\text{aux}}$ onto and orthogonal to $G\_{\text{primary}}$:

$$
\begin{aligned}
G_{\text{aux}}^{\parallel} &:= \frac{\langle G_{\text{aux}}, G_{\text{primary}} \rangle}{\|G_{\text{primary}}\|_2^2} \cdot G_{\text{primary}}, \\
G_{\text{aux}}^{\perp} &:= G_{\text{aux}} - G_{\text{aux}}^{\parallel}.
\end{aligned}
$$

The update rule splits into three terms:

$$
\theta_S^{(t+1)} = \theta_S^{(t)} - \alpha^{(t)}\left(G_{\text{primary}}^{(t)} + G_{\text{aux}}^{\parallel (t)} + G_{\text{aux}}^{\perp (t)}\right).
$$

The parallel component $G\_{\text{primary}} + G\_{\text{aux}}^{\parallel}$ drives convergence to a local minimum of the primary loss. The orthogonal component $G\_{\text{aux}}^{\perp}$ acts as a *regularization term* that prevents the encoder from settling into a narrow minimum dominated by majority cohorts. Where $\ell\_1$ and $\ell\_2$ regularization operate on *parameter space*, C2AL's orthogonal component operates on the model's *predictive behavior over specific cohorts* — what the authors call **functional regularization**. This is arguably the paper's most conceptually clean contribution.

## Training Objective / Loss

To summarize, the C2AL training loss is

$$
\mathcal{L}_{\text{C2AL}} = \mathcal{L}_{\text{primary}} + \lambda_{\text{head}} \mathcal{L}_{\text{head}} + \lambda_{\text{tail}} \mathcal{L}_{\text{tail}}
$$

- $\mathcal{L}\_{\text{primary}}$: binary cross-entropy on the primary task (CTR / CVR).
- $\mathcal{L}\_{\text{head}}, \mathcal{L}\_{\text{tail}}$: binary cross-entropy on the masked labels $y\_{\text{head}}, y\_{\text{tail}}$.
- $\lambda\_{\text{head}}, \lambda\_{\text{tail}}$: cohort-specific weights. The paper does not publish concrete values.

After training, only the primary head is kept; the serving architecture is unchanged. The auxiliary heads exist solely in the backward pass during training.

## Training Data & Pipeline

| Field | Value |
|-------|-------|
| Data | Meta production ads data — billions of samples per model |
| Number of models | Six production models (Model A through F) |
| Funnel stages | Both early-stage (computationally constrained) and final-stage (high-fidelity) |
| Optimization objectives | Click (CTR, Models A and B) and conversion (CVR, Models C-F) |
| Platform / surface | Facebook and Instagram; both onsite (within FB/IG) and offsite (external advertiser domains) conversions |
| Cohort axes evaluated | Revenue, Age, Age × Surface Type, Advertiser Size (see Table 1) |
| Baseline architecture | DHEN (Zhang et al., 2022) |
| Evaluation metric | Normalized Entropy (NE) and its relative change NE_diff |

NE is the standard ads-ranking metric: it normalizes the model's binary cross-entropy by the entropy of a "predict the global mean" baseline.

$$
\text{NE} = \frac{-\frac{1}{N}\sum_{i=1}^N \left[y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i)\right]}{-\frac{1}{N}\sum_{i=1}^N \left[y_i \log(\bar{y}) + (1 - y_i) \log(1 - \bar{y})\right]}
$$

where $\bar{y} = \frac{1}{N}\sum y\_i$ is the empirical label mean. Lower NE means better predictions. The relative improvement is

$$
\text{NE}_{\text{diff}} = \frac{\text{NE}_{\text{C2AL}} - \text{NE}_{\text{baseline}}}{\text{NE}_{\text{baseline}}}.
$$

At Meta's production scale, even 0.01 % NE differences are considered meaningful — they translate to material online revenue and user-experience effects.

## Experimental Results

### Overall NE across six production models

C2AL produces statistically significant NE reductions on every one of the six models.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/tab2-six-models.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: NE_diff of C2AL relative to baseline across six production models. Models A and B optimize click; Models C-F optimize conversion. Lower (more negative) is better."
   zoomable=true %}

Summary:
- Click models (A, B): -0.07 %, -0.11 %.
- Onsite conversion models (C, D): -0.16 %, -0.15 %.
- Offsite conversion models (E, F): -0.08 %, -0.05 %.

The largest improvements land on **onsite conversion** models. A plausible reading: onsite journeys are fully observable inside the platform, so the cohort signal is denser and easier to lock onto. Offsite conversions, which depend on external advertiser-side data, are noisier — so any representation bias is partly diluted by signal noise, and the cohort-aware regularization has less to grab.

### Per-axis head/tail PLR and NE improvement (Model C)

With four different semantic axes defining the cohort pair, the Positive Label Ratio (PLR) differs by up to *five-fold* between head and tail. That is a direct measure of how heterogeneous the data is along these axes.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/tab1-semantic-axes.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Head/tail PLR and NE_diff (overall / head / tail) on Model C across four semantic axes."
   zoomable=true %}

Observations:
- **Revenue axis**: head PLR 0.14 %, tail PLR 0.03 % (4.7× ratio). NE_diff is -0.28 % overall, -0.25 % head, -0.17 % tail.
- **Age axis**: an interesting asymmetry — head NE_diff -0.16 % but tail only -0.06 %, and yet overall is -0.14 %. This is a clear example where *overall improvement is not a simple weighted average of head and tail gains*.
- **Age × Surface Type**: largest cohort-level improvements (-0.27 % head, -0.33 % tail) with -0.18 % overall.

The authors highlight the Age-axis pattern as evidence of *broad-based generalization*: C2AL doesn't just overfit to the targeted sub-populations; it improves representation across the entire distribution.

### Fine-grained user-value buckets (Model A)

Slicing Model A's NE_diff into 5-percentile user-value buckets shows that the gains span well beyond the head and tail cohorts the auxiliary heads explicitly target.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/fig6-user-value-segments.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: NE_diff for Model A by user-value bucket. The biggest gains live in the upper percentiles (p75-p95+), exceeding -0.04 %, well beyond the explicitly-targeted top 5 %."
   zoomable=true %}

Key points:
- Improvements appear in intermediate buckets in addition to the explicit head and tail cohorts.
- The largest gains are in the **p75-p95+** range (high-value users), with NE reductions exceeding 0.04 %. The authors argue this is expected: high-value users diverge from the population mean more than low-value users do, so cohort-aware attention has more to fix there.
- **Tail NE_diff is -0.19 %, head NE_diff is -0.05 %** on the explicitly-targeted cohorts — the tail improves roughly 4× as much as the head, consistent with the claim that the baseline was losing more representational ground on the tail.

## Results Analysis & Ablations

### Is the attention distribution really what changes? (Re-reading Figure 4)

The authors claim that the effect is *localized* to the attention layer. Figure 4 is the evidence: pre-attention layers (sparse, ResNet-style FM) show indistinguishable distributions between baseline and C2AL, while the attention and post-attention layers show clear divergence.

This is consistent with the mechanistic claim — the FM-based attention is the *bottleneck* through which shared embeddings flow, so reshaping it is what makes the representation cohort-aware. The sparse and FM layers produce raw feature interactions, but the attention layer *selects* which ones survive; its sparsity is the constraint that matters.

### What "contrastive" actually means here

Footnote 1 on page 1 is worth re-reading. The paper's *contrastive* is algorithmically unrelated to InfoNCE / instance-discrimination self-supervised contrastive learning. Instead it refers to the *partial conflict* engineered between cohort-specific traffic patterns:

- For a majority-cohort positive sample, the primary head says "predict positive" while the auxiliary heads say "this is neither head nor tail — predict negative for those heads."
- To satisfy both simultaneously, the shared representation $\mathbf{h}$ must learn to *distinguish which cohort the sample belongs to*, not just whether it's positive or negative.
- That cohort discrimination is what activates cohort-specific feature interaction pathways in the attention matrix.

It's a clever definitional move. Using *masked labels* rather than *explicit cohort-prediction tasks* lets the cohort signal entangle naturally with the positive-label signal, without pulling the model away from the primary task's functional minimum.

### What the production validation buys

The fact that this is validated on *six production ads models* — not on MovieLens or Amazon reviews — is a real differentiator. Production validation across the funnel-stage × objective × platform × conversion-type cube provides much stronger generalization evidence than a single academic benchmark.

The trade-off, of course, is reproducibility. Exact hyperparameters, model architectures, and dataset specifics aren't released. That is the usual cost of industry papers; it doesn't invalidate the validation, but it does limit external replication.

## Limitations & Critical Assessment

The authors do not explicitly enumerate limitations. From the reviewer's side:

1. **No head-to-head comparison with other MTL / auxiliary-learning baselines.** MMoE, PLE, PCGrad, CAGrad are all natural comparison points. The paper only compares C2AL to single-task baseline, so it never directly demonstrates that C2AL beats a well-tuned MTL gradient-balancing approach.

2. **Unspecified hyperparameter choices.** The exact values of $\lambda\_{\text{head}}, \lambda\_{\text{tail}}$, which divergence metric (KL? JS? Wasserstein?) was used to pick cohorts, and the cohort percentile cutoffs (always top/bottom 5 %?) are not published. Anyone trying to replicate this is missing critical settings.

3. **No code release.** No reference implementation, not even on a public benchmark (MovieLens, Criteo, Avazu) for algorithmic verification. Meta production data is obviously not shareable, but a synthetic or public reference would help adoption.

4. **No training-cost or memory-overhead numbers.** Two auxiliary heads add a noticeable backward pass — wall-clock training time and GPU-memory increase would be important for any team deciding whether to adopt this.

5. **Semantic axis selection is manual.** Which axis (user value, age, advertiser size) to use is a domain-knowledge choice; the paper doesn't discuss automatic axis discovery. A bad axis presumably gives no improvement.

6. **The auxiliary-head design is heuristic.** Why binary classification with sample masking? Why not a cohort-membership classification head, or a regression head matching cohort-conditional means? No ablation, so we can't tell whether this specific design is optimal.

7. **No long-term drift evaluation.** Production systems retrain daily, and cohort distributions drift. Whether C2AL's NE_diff stays stable across retraining cycles, or whether the operator has to re-discover axes periodically, is not addressed.

8. **NE-only evaluation.** AUC, calibration metrics, and especially live A/B test outcomes are not reported. Translating a 0.16 % NE reduction into actual revenue or user-experience deltas would strengthen the paper considerably.

## Takeaways

- **Auxiliary learning, properly used, has zero serving cost.** Caruana's original auxiliary-learning framing — auxiliary tasks at training time, discarded at inference — turns out to be exactly the right shape for production deployment. No latency change, no infrastructure change.

- **Functional regularization is a useful frame.** The distinction between regularization on *parameter space* ($\ell\_1, \ell\_2$) and regularization on the model's *predictive behavior over specific cohorts* is conceptually clean and generalizes to other domains (vision, NLP) where you can define minority subpopulations and add auxiliary heads.

- **Attention sparsity is a diagnostic for majority bias.** "Attention weights concentrated near zero" is a quick visual check for whether a model is being dominated by majority cohorts. Adding attention-weight histograms to production model health dashboards would be a low-cost diagnostic.

- **"Contrastive" has more than one meaning.** InfoNCE-style instance discrimination isn't the only form of contrastive learning. *Partially conflicting supervised labels* are also a form of contrast, and may be simpler and more powerful in the supervised setting.

- **Industry-academia gap, with a bridge.** Six production models worth of validation is something academic labs almost can't do; gradient-level mechanistic analysis is something Meta engineering teams typically don't publish. This paper does both, which is rare and worth emulating.

## References

- Paper: <https://arxiv.org/abs/2510.02215>
- Code: not released
- Related backbone DHEN: <https://arxiv.org/abs/2203.11014>

## Further Reading

- **[DHEN: A Deep and Hierarchical Ensemble Network for Large-Scale Click-Through Rate Prediction](https://arxiv.org/abs/2203.11014)** (Zhang et al., 2022) — The Meta ads-ranking backbone that C2AL surgically modifies; the FM-based attention in its interaction layer is exactly the locus of C2AL's effect.
- **[Modeling Task Relationships in Multi-task Learning with Multi-gate Mixture-of-Experts](https://doi.org/10.1145/3219819.3220007)** (Ma et al., KDD 2018) — Google's MMoE, the canonical MTL architecture for ranking. A natural head-to-head baseline that this paper unfortunately doesn't run.
- **[Progressive Layered Extraction (PLE): A Novel Multi-Task Learning Model for Personalized Recommendations](https://doi.org/10.1145/3383313.3412236)** (Tang et al., RecSys 2020) — Tencent's PLE, which fixes MMoE's task-interference by splitting task-specific and shared experts.
- **[Gradient Surgery for Multi-Task Learning](https://arxiv.org/abs/2001.06782)** (Yu et al., NeurIPS 2020) — PCGrad. Projects away conflicting task gradients; pairs naturally with C2AL's gradient decomposition.
- **[Conflict-Averse Gradient Descent for Multi-task Learning](https://arxiv.org/abs/2110.14048)** (Liu et al., NeurIPS 2021) — CAGrad. Searches for a conflict-averse descent direction that worst-case improves all tasks.
- **[Adapting Auxiliary Losses Using Gradient Similarity](https://arxiv.org/abs/1812.02224)** (Du et al., 2018) — Dynamic gating of auxiliary losses via cosine similarity. C2AL uses fixed weighted sums; adding gating would be a natural extension.
- **[Wide & Deep Learning for Recommender Systems](https://arxiv.org/abs/1606.07792)** (Cheng et al., DLRS 2016) — Google Play's wide & deep, an origin point for DNN-backboned ads/recommendation systems.

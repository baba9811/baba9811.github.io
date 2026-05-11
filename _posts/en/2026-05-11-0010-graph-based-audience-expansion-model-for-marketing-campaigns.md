---
layout: post
title: "[Paper Review] Graph-Based Audience Expansion Model for Marketing Campaigns"
date: 2026-05-11 10:00:00 +0900
description: "A two-stage lookalike model from Rakuten — TransE-style pretraining on a 70+ service cross-service knowledge graph, then a GCN that aggregates 'knowledge queries' (head + relation embeddings) rather than neighbor entities. SIGIR 2024 short paper."
tags: [audience-expansion, lookalike-modeling, knowledge-graph, graph-neural-network, recommender-systems, advertising]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/tab2-main-results.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/
ko_url: /papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Md Mostafizur Rahman, Daisuke Kikuta, Yu Hirate, Toyotaro Suzumura (Rakuten Institute of Technology · University of Tokyo) |
| Venue | SIGIR 2024 · short paper (4 main pages + refs, ACM proceedings) |
| DOI | [10.1145/3626772.3661363](https://doi.org/10.1145/3626772.3661363) |
| Data | Rakuten internal datasets (top-5 brands A–E, anonymized) + Tencent Ads 2018 public dataset (421,961 seeds) |
| <span style="white-space: nowrap">Review date</span> | 2026-05-11 |

## TL;DR

- Rakuten's 70+ services across e-commerce, telecom, and travel produce a sprawling user-behavior graph. The paper bundles it into a single knowledge graph, learns TransE-style entity embeddings as a pretraining step (PKGE), and then runs a GCN on top — yielding **AudienceLinkNet**, a two-stage lookalike model for marketing-campaign audience expansion.
- One-line novelty: at GCN aggregation time, neighbors don't pass their **node embeddings** to the destination — they pass **knowledge queries** $\mathbf{e}\_u + \mathbf{e}\_r$ (a head plus a relation, the TransE translation point that should land near the tail). This shifts the message from "what does my neighbor look like" to "what relation-typed query does my neighbor send to me," which mitigates the kind of oversmoothing you get when aggregating raw neighbor features in a multi-relational graph.
- Across five Rakuten brand campaigns and the Tencent Ads 2018 public benchmark, AudienceLinkNet (mean aggregator) wins **11 of 18 cells** (6 datasets × 3 metrics), dominating Recall (5/6 datasets) and sweeping Brand E and Tencent on all three metrics. The headline is **+4.06% precision and +7.18% recall** on Rakuten over the production XGBoost target-prospecting (TP) baseline, beating WeChat's MetaHeac (KDD 2021) — the strongest comparator.
- The single ablation in the paper is informative: stripping out the PKGE pretraining drops recall on every brand, but the drop is sharpest on Brand C (only 1,654 seeds). When you have few seeds, the cross-service KG prior matters most. That's the cleanest figure in the paper.
- As a short paper, it leaves real holes. There's no ablation isolating *knowledge-query aggregation* vs. plain neighbor aggregation — which would be the most diagnostic experiment. Recent KG-GNN baselines (KGCN, KGAT) are missing from the comparison, and the instability of the GAT-style attention2 aggregator gets one sentence of diagnosis. What lands is the *problem formulation* — folding a cross-service super-app's behavioral data into a single KG for lookalike — more than the model itself.

## Introduction

Mature ad platforms eventually run on two model families. One predicts CTR or CVR for a fixed user-ad pair. The other answers a much harder question: given a tiny *seed* set of users (a few thousand at most), find tens or hundreds of thousands of users who *behave similarly* and would plausibly convert if shown the campaign. This is **audience expansion** (often called *lookalike modeling* or *target prospecting*), and Rahman et al.'s SIGIR 2024 paper is a status report on Rakuten's swap of that backend — the model running behind their "AIris Target Prospecting" product.

If you've followed this blog's recent posts on customer modeling — [paper 0005](/en/papers/0005-artificial-intelligence-in-customer-relationship-management/) on AI-CRM trends, [paper 0006](/en/papers/0006-b2b-lead-scoring-with-machine-learning/) on classical B2B lead scoring, [paper 0007](/en/papers/0007-unlocking-power-of-ai-in-crm/) on AI-driven CRM at the macro layer, and [paper 0009](/en/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/) on the K-means + LIME small-scale segmentation study — those all sat at the layer of *how do we understand and slice customers*. Audience expansion sits one layer outward: take that segment as your seed and scale it up by two-to-three orders of magnitude.

The problem framing here is what makes the paper interesting before the model does. The authors point out, early, that the seed pool size is **wildly inconsistent across campaigns**. One Rakuten beverage brand (Brand C) has only 1,654 seeds; another (Brand B) has 96,072. If you need to produce a one-million-user audience for both, the small-seed campaign has roughly *60× fewer signal points* to overfit to. Instead of solving this as a plain ML problem, the paper sidesteps via the structural prior: collapse all 70+ Rakuten services — commerce, telecom, travel, points, memberships — into one knowledge graph, pretrain embeddings on it, and use those as the starting state for any lookalike task. Brand C's 1,654 users don't begin from scratch; they start from a position already shaped by every other Rakuten service those users touched.

Now — is this model *technically novel*? Not really. TransE is from NeurIPS 2013. GCN is from ICLR 2017. KGCN and KGAT are from 2019. The paper assembles them, swaps the message-passing unit from *neighbor embedding* to *head + relation knowledge query*, and removes the nonlinearity from the GCN update à la SGC. What earns this paper a spot on a review queue is not invention but *deployment evidence*: a real super-app, a real 70-service KG, real production-grade XGBoost baseline (not a strawman), and consistent multi-percent improvements across five brands plus an external public dataset.

## Key Contributions

The contributions claimed by the authors, plus what I think actually matters from a reviewer's chair.

- **A formulation of cross-service audience expansion as a KG problem.** Rakuten's 70-service ecosystem produces interactions of many kinds — `(user, buy, item)`, `(user, click, item)`, `(user, favorite, item)` — and the paper unifies them as KG triples. Most lookalike systems live within one product surface; this one is multi-product by design.
- **Two-stage training with a knowledge-graph prior.** Stage 1 trains a TransE-style PKGE on the full KG. Stage 2 initializes a GCN with PKGE embeddings and fine-tunes for the lookalike task. The ablation (Figure 1) makes the case crisply — without PKGE, Brand C's recall collapses, because there's no graph prior to compensate for tiny seed pools.
- **Knowledge-query aggregation as the GCN message unit.** Instead of $\mathbf{h}\_u$, the message is $Q\_{(u,r,v)} = \mathbf{h}\_u + \mathbf{h}\_r$. Geometrically, this is the TransE "translation point" toward the tail. Aggregating these at destination $v$ collects *relation-typed queries* rather than raw neighbor positions — which the authors argue avoids the oversmoothing that traditional KG-GNN models get from naive neighbor averaging.
- **A clean comparison of three aggregators.** Mean, Attention1 (inner-product, KGCN-style), and Attention2 (concat + LeakyReLU, GAT-style). The Mean wins most cells and Attention2 is notably unstable. This is a useful negative result: attention isn't free in industrial KGs where the per-node knowledge-query count is heavily skewed.
- **(Reviewer take) Honest baseline disclosure.** The "Baseline TP" the model competes against is *production-grade XGBoost* using demographic features, points summary, point-level transactions, and Rakuten's genre purchase hierarchy. Saying you beat that — by 4-7 percent — is more credible than beating a vanilla cosine similarity baseline, which is what a lot of lookalike papers do.

## Related Work and Background

This section weaves the paper's §2 (related work) with §3.2 (PKGE preliminaries) for readers who know general ML but aren't deep in KG-based retrieval.

### Lookalike modeling, classically

The oldest school is **similarity-based lookalike** (Ma et al., 2016): compute cosine, Pearson, or Jaccard between seed feature vectors and candidate feature vectors, take the top N. The failure mode is well known — when features are sparse or heterogeneous, those distances stop carrying meaning. Next came *matrix-factorization-based lookalike* (Kanagal et al., 2013) which factorizes a user × ad matrix and works in latent space. A parallel branch is *logistic-regression-based lookalike* (Qu et al., 2014, US patent) — and AudienceLinkNet's LRLM baseline is precisely this family.

The deep-learning era brought two notable systems: (1) Tencent WeChat's **RALM** (Liu et al., KDD 2019), which uses attention to build a seed-side representation and then inner-products against candidates; (2) WeChat's **MetaHeac** (Zhu et al., KDD 2021), which uses meta-learning to jointly train across many small campaigns and fine-tunes for each new one. MetaHeac is the strongest baseline AudienceLinkNet directly competes against.

### Knowledge-graph embeddings — TransE's translation geometry

PKGE is essentially a **TransE** (Bordes et al., NeurIPS 2013) clone. TransE embeds KG triples `(head, relation, tail)` into $\mathbb{R}^d$ such that *head + relation ≈ tail*. The scoring function is

$$
f(u, r, v) = \lVert \mathbf{e}_u + \mathbf{e}_r - \mathbf{e}_v \rVert_{1, 2}
$$

and learning uses a margin loss over positive (real) triples and negative (corrupted) triples:

$$
\mathcal{L}_{\text{pre}} = \sum_{(u,r,v) \in \mathcal{E}} \sum_{(u', r, v') \in \mathcal{E}^{-1}} \left[\gamma + f(u, r, v) - f(u', r, v')\right]_{+}
$$

where $\gamma$ is the margin and $[\cdot]\_+ = \max(0, \cdot)$.

The geometric intuition is what matters for this paper. When TransE learns `(Rakuten Books, same-marketplace, Rakuten Travel)`, the vector $\mathbf{e}\_{\text{Books}} + \mathbf{e}\_{\text{same-marketplace}}$ gets pushed toward $\mathbf{e}\_{\text{Travel}}$. So $\mathbf{e}\_u + \mathbf{e}\_r$ is naturally interpretable as a *"query coordinate"* — a position in space asking "what tail entity does $u$ reach via $r$?" The authors give this a name — **knowledge query** — and build the GCN's message-passing around it.

### GCN and KG-GNN — KGCN, KGAT

The stage-2 GCN has two direct ancestors:

- **GCN** (Kipf & Welling, ICLR 2017): aggregate neighbor features via the symmetric Laplacian, apply a nonlinear activation. But GCN ignores relations — it doesn't natively handle multi-relational graphs.
- **KGCN** (Wang et al., WWW 2019): runs GCN on a KG with per-relation attention weights, computing attention coefficients via inner product between the message and the destination embedding. AudienceLinkNet's Attention1 (Eq. 6) is a slight rephrasing of this.
- **KGAT** (Wang et al., KDD 2019): a more developed KGCN successor with learnable attention parameters and end-to-end embedding learning.

**Where AudienceLinkNet diverges**: (1) The aggregation input is *the knowledge-query sum* $\mathbf{e}\_u + \mathbf{e}\_r$, not the neighbor embedding $\mathbf{e}\_u$. (2) The update rule has **no nonlinear activation** — pure linear transformation, borrowing from SGC (Wu et al., ICML 2019, ref [41]). The combination is meant to keep oversmoothing low while staying computationally light.

### Homophily

The paper waves at *homophily* — the assumption that connected nodes share attributes — as the fundamental premise of lookalike on graphs. If a seed user's graph neighbors behave similarly to that seed, then GCN smoothing drags those neighbors' representations toward the seed's, and the smoothed region becomes a natural retrieval zone for lookalike candidates.

## Method / Architecture

### Problem statement

Given $m$ seed users $S\_u = (u\_1, u\_2, \ldots, u\_m)$, find $n \gg m$ similar users. The knowledge graph $G$ has an entity set $E$ and triples `(u, r, v)`. Users, items, demographic and behavioral attributes, and Rakuten's genre-hierarchy nodes all appear as entities.

### Stage 1 — PKGE pretraining

Learn embeddings $\mathbf{e}\_e = f\_{\text{pre}}(G; \theta\_{\text{pre}})$ using TransE's score function and margin loss (above). Positive triples come from actual user-item interactions; negatives are sampled by corrupting the head or tail. After pretraining, every entity and every relation has a vector.

The paper explicitly names $\mathbf{e}\_u + \mathbf{e}\_r$ the **knowledge query**. The TransE objective already pushes this point toward valid tails — so it's a coordinate that *encodes the question* "$u$, via $r$, lands near which tail?" That naming sets up the stage-2 design.

### Stage 2 — Audience-expansion GCN, aggregation

Initialize layer-0 embeddings with PKGE outputs. At layer $l$, the message flowing from source $u$ to destination $v$ along relation $r$ is

$$
Q^{l-1}_{(u, r, v)} = \mathbf{h}^{l-1}_u + \mathbf{h}^{l-1}_r
$$

destination $v$ aggregates all incoming knowledge queries into $\mathbf{m}^l\_Q$. Three aggregators.

#### Mean

$$
\mathbf{m}^l_Q = \text{MEAN}\left( \left\{ Q^{l-1}_{(u, r, v)} \;\middle|\; u \in \mathcal{N}(v),\; r \in \mathcal{R}(u, v) \right\} \right)
$$

$\mathcal{N}(v)$ is $v$'s neighbor set, $\mathcal{R}(u, v)$ is the set of relations between $u$ and $v$ (Rakuten's KG can have multiple relation types between one pair).

#### Attention1 (KGCN-style)

Weight each message by its inner product with the destination embedding:

$$
e_{(u, r, v)} = \left( Q^{l-1}_{(u, r, v)} \right)^\top \mathbf{h}^{l-1}_v
$$

softmax-normalize:

$$
\alpha_{(u, r, v)} = \frac{e_{(u, r, v)}}{\sum_{k \in \mathcal{N}(v)} e_{(k, r, v)}}, \qquad \mathbf{m}^l_Q = \sum_{u \in \mathcal{N}(v)} \alpha_{(u, r, v)} Q^{l-1}_{(u, r, v)}
$$

Queries that land closer to the destination in vector space get more weight. Identical in spirit to KGCN's attention.

#### Attention2 (GAT-style)

A learned attention head, GAT-style (Veličković et al., ICLR 2018):

$$
e_{(u, r, v)} = \text{LeakyReLU}\left( \mathbf{a}^\top \left[ Q^{l-1}_{(u, r, v)} \;\big\Vert\; \mathbf{h}^{l-1}_v \right] \right)
$$

with $\mathbf{a} \in \mathbb{R}^{2H}$ trainable, $H$ the embedding dimension, and $\Vert$ concatenation. Attention2 can adapt the attention shape to data — but the paper finds it's the *least stable* aggregator empirically.

### Stage 2 — update rule

After aggregation, combine the message with the destination's previous embedding:

$$
\mathbf{h}^l_v = W^l \left( \mathbf{h}^{l-1}_v + \mathbf{m}^l_Q \right) + \mathbf{b}^l, \qquad \mathbf{r}^l = W^l \mathbf{r}^{l-1} + \mathbf{b}^l
$$

Two non-obvious choices here. First, the *same* $W^l, \mathbf{b}^l$ apply to both entity and relation embeddings — which forces the TransE "head + relation ≈ tail" invariant to keep holding in the new vector space after the linear transformation. Second, **no nonlinear activation** — this is the SGC simplification, giving you a graph linear model rather than a deep nonlinear GNN.

### Final loss

After the GCN, user embeddings are trained against a margin loss over user-item interaction pairs:

$$
\mathcal{L}_{\text{final}} = \sum_{(\mathcal{U}, \mathcal{I}) \in \mathcal{P}} \sum_{(\mathcal{U}, \mathcal{I'}) \in \mathcal{P}^{-1}} \left[ \gamma + f(\mathbf{h}_{\mathcal{U}}, \mathbf{h}_{\mathcal{I}}) - f(\mathbf{h}_{\mathcal{U}}, \mathbf{h}_{\mathcal{I'}}) \right]_{+}
$$

where $\mathcal{P}$ is positive (user, item) pairs and $\mathcal{P}^{-1}$ is negatives. Same margin-loss skeleton as PKGE, just over user-item pairs instead of head-relation-tail triples. The relative-distance learning is consistent across both stages, which is part of why the architecture feels tidy.

At inference time you get one embedding per user. The serving path takes seed embeddings, computes similarity against the candidate pool, and applies a threshold $T$ that controls audience size — adjustable from a few thousand to a few million depending on campaign needs.

## Training Data and Pipeline

### Rakuten internal datasets (Brand A–E)

Top-5 brands by revenue, anonymized. Categories:

- **Brand A, E** — health products (vitamins, minerals, stress relief).
- **Brand B, D** — beauty / toiletries.
- **Brand C** — beverages (smallest seed set).

Each brand has seeds, training, validation, and test splits.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/tab1-datasets.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Dataset statistics. Brands A–E are Rakuten's top five (anonymized); the last column is the Tencent Ads 2018 public dataset. Seed counts range from 1,654 (Brand C) to 421,961 (Tencent) — two orders of magnitude apart."
   zoomable=true %}

### Tencent Ads 2018 public dataset

For external comparability. 421,961 seed users distributed across hundreds of seed sets. Each user has 14 features (demographics + interests); each ad has 6 categorical features (ad category, advertiser ID, campaign ID, product ID, product type, creative size). To shoehorn this into a KG, the authors connect *user → product → other categorical features*. The graph is a single chain rather than the multi-service star you get on Rakuten — which matters when reading the Tencent results later.

### Hyperparameters

- embedding dimension $d \in \\{50, 100, 150, 200, 250\\}$
- learning rate $\in \\{0.001, 0.01, 0.1\\}$
- margin $\gamma \in \\{1, 5, 10\\}$
- single NVIDIA Tesla V100
- PyTorch 1.8.2, Python 3.6
- grid search per brand (final picks not reported)

### Baselines

1. **Baseline TP** (XGBoost) — Rakuten's production model. Features: (i) demographics (age, gender, region), (ii) points summary (Rakuten loyalty accruals), (iii) point features (per-transaction details, online/offline merchants), (iv) genre-level purchase history (trends along Rakuten's "genre" hierarchy). For Tencent the 14 + 6 features go directly to XGBoost.
2. **LRLM** (Qu et al., 2014) — logistic regression on seed-likeness probability.
3. **PKGE** — just the pretraining stage, with no GCN — retrieve directly on the KG embedding space.
4. **MetaHeac** (Zhu et al., 2021) — WeChat's meta-learning-based SOTA. The toughest baseline.

## Experiments

Metrics: **Precision, Recall, PR-AUC**.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/tab2-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 6 datasets × 7 models × 3 metrics. Bolded values are the best per column. AudienceLinkNet (mean) takes the most cells, and on Brand E and Tencent it sweeps all three metrics."
   zoomable=true %}

### Per-brand results

- **Brand A** — Precision: AudienceLinkNet (attn1) 0.550 (Baseline TP 0.527, +2.3). Recall: AudienceLinkNet (mean) 0.768 (Baseline TP 0.722, +4.6). PR-AUC: MetaHeac 0.716, AudienceLinkNet (mean) effectively tied at 0.712.
- **Brand B** — Precision: AudienceLinkNet (mean) 0.516 (TP 0.491, +2.5). Recall: AudienceLinkNet (mean) 0.819 (TP 0.754, +6.5). PR-AUC: AudienceLinkNet (attn1) 0.705.
- **Brand C (seed 1,654)** — Precision: AudienceLinkNet (mean) 0.420 (TP 0.406). Recall: AudienceLinkNet (attn1) 0.801 (TP 0.750, +5.1). PR-AUC: AudienceLinkNet (attn2) 0.612. The *smallest-seed* campaign still works, which is the paper's key selling point.
- **Brand D** — Precision: AudienceLinkNet (attn1) 0.629 (TP 0.598). Recall: AudienceLinkNet (mean) 0.825 (TP 0.772, +5.3). PR-AUC: tied between PKGE and AudienceLinkNet (attn2) at 0.786.
- **Brand E** — AudienceLinkNet (mean) sweeps. Precision 0.598 (TP 0.572), Recall 0.831 (TP 0.773, +5.8), PR-AUC 0.749.
- **Tencent (public)** — AudienceLinkNet (mean) ties MetaHeac on precision (0.334), wins on Recall (0.519, TP 0.461, +5.8) and PR-AUC (0.734). External-domain generalization is intact.

Headline summary the authors report: **+4.06% average precision, +7.18% average recall** on Rakuten brands (AudienceLinkNet mean vs. Baseline TP).

### Aggregator stability

If you scan the table row-wise: AudienceLinkNet (mean) wins **11 of 18 cells** (6 datasets × 3 metrics; Tencent Precision is a tie with MetaHeac), Attention1 takes 4, Attention2 takes 2. Mean also sweeps all three metrics on Brand E and Tencent — best-case-most-often, worst-case-least-often. The authors' explanation has two threads. First, *attention coefficients depend heavily on the knowledge-query distribution*, and in Rakuten's KG the number of queries per node is wildly imbalanced (an order of magnitude or more between popular and new users), so attention coefficients blow up. Second, Attention2's parameter $\mathbf{a}$ is learned via the *final* loss, not PKGE's, so it doesn't easily converge to a shape that's right for lookalike retrieval.

This is a familiar story — attention isn't free in industrial graphs, and GraphSAGE's mean aggregator has been a stubbornly good baseline since 2017.

## Result Analysis / Ablation

The paper's *single* ablation pulls PKGE pretraining and measures recall.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/fig1-pkge-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: PKGE ablation. y-axis is Recall. Across all five Rakuten brands recall drops without PKGE, but the drop is steepest on Brand C (≈0.80 → 0.74). On Brand E (largest seed set) the gap shrinks to ≈0.83 → 0.78."
   zoomable=true %}

The reading: *the smaller the seed pool, the more PKGE matters*. It's the intuitive direction, but quantifying it matters. Brand C's 1,654 seeds simply don't generate enough graph signal for a randomly-initialized GCN to learn from — the PKGE pretraining injects a cross-service prior that mitigates the cold-start.

**But the ablations that *aren't* here are more interesting than the one that is.** The paper highlights two design choices — knowledge-query aggregation and SGC-style nonlinearity removal — but neither has a corresponding ablation. The natural comparison would be: take AudienceLinkNet but aggregate plain neighbor entity embeddings (i.e., a KGCN-equivalent) and measure the gap. Same for the nonlinearity question — what does adding ReLU back do? Without these, we have a strong empirical headline but limited insight into where the improvement actually comes from.

### Brand C's absolute floor

Worth noting: Brand C's *absolute* numbers are well below the other brands. AudienceLinkNet (mean) hits Precision 0.420 / Recall 0.799 there, vs. Brand B's 0.516 / 0.819. So while AudienceLinkNet wins *relative* to baselines on small seeds, the underlying difficulty of small-seed lookalike isn't *solved* — there's clear headroom even within the paper's own framing.

### Tencent vs. Rakuten gap

All models score Precision ≈ 0.3 on Tencent but ≈ 0.5–0.6 on Rakuten. Some of that is task difficulty, but a structural piece is that Tencent's KG is one *chain* (user → product → categorical features), while Rakuten's is a star (one user node connects to entities across 70+ services). The paper's main value proposition — *cross-service KG* — is only half-applicable on Tencent. Which makes the Tencent win (still best in class on PR-AUC) a useful generalization check, but not a celebration of the same pattern.

## Limitations and Critique

What the authors admit plus what I'd add.

### Authors' acknowledged limitations

- **Campaigns with fewer than 500 seeds remain hard.** PKGE softens the cold start but doesn't fix it.
- **If more than 30% of the seed pool is cold or new users**, performance degrades. New users have nearly no KG edges, so GCN smoothing has nothing to anchor on.

### Additional reviewer concerns

- **Ablation gaps.** As noted above, the paper claims novelty in *knowledge-query aggregation* and *nonlinearity removal* but doesn't run the comparisons that would isolate either effect. Adding a "knowledge query off, neighbor entity on" row and a "ReLU on" row would make the empirical case much stronger.
- **Missing modern KG-GNN baselines.** KGCN, KGAT, and other Wang et al. variants are AudienceLinkNet's closest cousins, but none appear in Table 2. MetaHeac is in a different family (meta-learning), so it doesn't tell us whether the KG-GNN-specific design choices matter.
- **Novelty leans industrial more than algorithmic.** "Make the GCN message $\mathbf{e}\_u + \mathbf{e}\_r$ instead of $\mathbf{e}\_u$" is a one-line change. Combined with PKGE pretraining and the SGC-style update, it's a tidy engineering combination — but treating it as an algorithmic contribution sits uncomfortably with the absence of ablations to isolate which piece is doing the work.
- **No diagnosis of Attention2's instability.** The text gives one sentence — *"possibly due to imbalance in knowledge queries per node."* No coefficient-variance plot, no per-degree analysis, no learning curves. This would be a small empirical effort with real diagnostic value.
- **No code, no public data.** AudienceLinkNet is closed-source and Rakuten's data is proprietary. The Tencent results are externally reproducible, but the paper's core claim — that the *cross-service* KG is the source of the lift — isn't independently verifiable.
- **No significance testing.** Differences like 0.527 vs. 0.541 may or may not be meaningful given seed-/split-level randomness. Brand C's test set is only 4,387 users, and small fluctuations could flip the ranking. Reporting stds or paired bootstrap intervals would help.
- **The strength of "Baseline TP" matters.** It's not a strawman — XGBoost on demographics + points + transactions + genre purchase history is a strong, production-quality starting point. So a 4-7% lift over it has real industrial weight. But that also means readers should be careful about reading these numbers as a measure of *algorithmic novelty* over the academic state of the art.

## Takeaways

- **Cross-service KGs really do work as a prior for industrial lookalike.** A super-app's biggest data asset is *seeing one user across many product surfaces*, and folding that into a single pretrained KG embedding gives the biggest wins precisely where you need them most — small-seed campaigns. The pattern transfers cleanly to other multi-service platforms (Naver, Kakao, Alibaba, Mercado Libre).
- **Knowledge queries as the message-passing unit.** A small but real design dimension in KG-GNNs. Aggregating $\mathbf{e}\_u + \mathbf{e}\_r$ instead of $\mathbf{e}\_u$ pushes relation information directly into the smoothing step. Worth keeping in mind whenever you're designing a relational GNN — *what's the message?* is its own knob.
- **Re-discovered mean aggregator.** Attention isn't always better. When per-node degree distribution is heavy-tailed (as in any real industrial KG), attention coefficient variance can dominate, and a plain mean stays stable. This has been GraphSAGE folklore since 2017 — useful to see it confirmed for KG-based lookalike too.
- **A reproducible cross-service lookalike benchmark is missing in the field.** Tencent Ads 2018 is the only open dataset and it isn't cross-service. The field would benefit from one that *is* — a Naver or Kakao or Mercado Libre release would shift the publication economics noticeably.
- **Cold users remain the unsolved chunk.** The paper itself flags ">30% new users in seed → degradation." Hybridizing the KG prior with non-graph signals (demographic, intent, external) for cold users is a clear next frontier.

## Further Reading

- **[Exploring 360-Degree View of Customers for Lookalike Modeling](https://arxiv.org/abs/2304.09105)** (Rahman et al., SIGIR 2023) — the same Rakuten RIT team's prior paper. The 360-degree-view framing is the precursor of AudienceLinkNet's cross-service-KG approach.
- **[Learning to Expand Audience via Meta Hybrid Experts and Critics for Recommendation and Advertising](https://arxiv.org/abs/2105.14688)** (Zhu et al., KDD 2021) — WeChat's MetaHeac. AudienceLinkNet's toughest baseline and the meta-learning-based SOTA for lookalike. Worth reading for the joint-training-across-campaigns idea.
- **[Real-time Attention Based Look-alike Model for Recommender System](https://arxiv.org/abs/1906.05022)** (Liu et al., KDD 2019) — Tencent WeChat's RALM. The seed-pool attention pattern that became standard for the seed-side representation in lookalike.
- **[Knowledge Graph Convolutional Networks for Recommender Systems](https://arxiv.org/abs/1904.12575)** (Wang et al., WWW 2019) — KGCN. Direct ancestor of AudienceLinkNet's Attention1.
- **[Translating Embeddings for Modeling Multi-relational Data](https://proceedings.neurips.cc/paper/2013/file/1cecc7a77928ca8133fa24680a88d2f9-Paper.pdf)** (Bordes et al., NeurIPS 2013) — TransE. The origin of $f(u, r, v) = \lVert\mathbf{e}\_u + \mathbf{e}\_r - \mathbf{e}\_v\rVert$ and the "head + relation ≈ tail" translation geometry.
- **[Semi-Supervised Classification with Graph Convolutional Networks](https://arxiv.org/abs/1609.02907)** (Kipf & Welling, ICLR 2017) — GCN. The canonical message-passing baseline.
- **[Simplifying Graph Convolutional Networks](https://arxiv.org/abs/1902.07153)** (Wu et al., ICML 2019) — SGC. Drop the nonlinearity and you get a graph linear model. AudienceLinkNet's update rule borrows this directly.

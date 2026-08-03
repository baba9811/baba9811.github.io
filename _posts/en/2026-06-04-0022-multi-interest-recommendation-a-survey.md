---
layout: post
title: "[Paper Review] Multi-Interest Recommendation: A Survey"
date: 2026-06-04 14:00:00 +0900
description: "The first comprehensive survey of multi-interest recommendation, organizing the field around extractors, aggregators, diversity regularization, applications, and open challenges."
tags: [recommender-systems, multi-interest, sequential-recommendation, survey, user-modeling]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0022-multi-interest-recommendation-a-survey/fig6-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0022-multi-interest-recommendation-a-survey/
ko_url: /papers/0022-multi-interest-recommendation-a-survey/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Zihao Li et al. (5 co-authors across Wuhan University · Tencent WeChat · Nanyang Technological University) |
| Venue | ACM Transactions on Information Systems (TOIS) · 2026 · Vol. 44, No. 4, Article 78 (open access, CC BY 4.0) |
| arXiv 또는 DOI | [10.1145/3789510](https://doi.org/10.1145/3789510) |
| Code | [WHUIR/Multi-Interest-Recommendation-A-Survey](https://github.com/WHUIR/Multi-Interest-Recommendation-A-Survey) |
| <span style="white-space: nowrap">Review date</span> | 2026-06-04 |

#### TL;DR

- Representing a user as a **single embedding vector** can't capture their multifaceted, time-varying preferences. Multi-interest recommendation explicitly extracts **multiple interest vectors** $\mathbf{H}\_u = \{\mathbf{h}\_u^1, ..., \mathbf{h}\_u^K\}$ from a user's historical interactions, enabling fine-grained preference modeling.
- This survey organizes the field around three progressive questions — **why** multi-interest matters, **what** aspects it models, and **how** it is built — and decomposes every method into two core modules: an **interest extractor** and an **interest aggregator**. It is the first comprehensive survey dedicated to multi-interest modeling.
- Extractors fall into dynamic routing (CapsNet), attention and its variants, and non-linear transformation; aggregators split into representation aggregation and recommendation aggregation. The survey also covers diversity regularization against representation collapse, application scenarios and public datasets, and open directions: adaptive interest count, efficiency, denoising, explainability, long-tail/cold-start, and LLM/diffusion frontiers.

#### Introduction

A recommendation system filters information from a user's historical interactions to help them make decisions efficiently. Over the past two decades it has succeeded across e-commerce, social media, news, and entertainment. Yet real-world user preferences and item attributes are inherently **diverse and uncertain**. Take movie recommendation: a single user's history mixes romance, fiction, and comedy, and a single movie (e.g., *Life is Beautiful*) belongs to romance, comedy, and war at once. Conventional methods that represent users and items as single vectors struggle to capture these intricate interactions and multifaceted item themes.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig1-toy-example.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: A toy example of movie recommendation. A user interacts with movies spanning multiple genres, revealing several interests (Fantasy, War, Romance), and each movie itself spans several genres and themes."
   zoomable=true %}

Multi-interest recommendation (also called multi-faceted preference recommendation) addresses this. Instead of one embedding per user $u$, it learns a set of $K$ latent interest vectors $\mathbf{H}\_u = \{\mathbf{h}\_u^1, \mathbf{h}\_u^2, ..., \mathbf{h}\_u^K\}$ and uses them jointly for candidate recommendation. Decomposing preference into multiple components yields more accurate, fine-grained, and diverse recommendations — especially when behavior spans many categories, topics, or contexts — and improves **explainability**, since the system can identify which intent maps to which item facet.

The survey answers three progressive research questions: (1) **why** is multi-interest modeling important for recommendation? (2) **what** aspects does it focus on? and (3) **how** is it applied, down to the technical details of representative modules? Existing recommendation surveys either dive into specific tasks/applications or focus on single-representation methods, overlooking diverse user preferences and the multifaceted nature of items. This work fills that gap.

#### Key Contributions

- **The first comprehensive synthesis of multi-interest modeling.** It systematically reviews user multi-interest modeling research and presents its significance to the broader community.
- **An innovative taxonomy.** It classifies methods along orthogonal primary axes — recommendation task, modeling aspect, and research concern — giving a unified framework for analyzing the literature structurally.
- **Identification of challenges and future directions.** It surfaces unresolved limitations and outlines prospective research directions worth deep investigation.
- (Reviewer's note) The real payoff is reducing **every method to a 2-component framework** — extractor + aggregator. Fix those two axes (dynamic routing vs. attention; fuse at representation vs. recommendation stage) and dozens of papers line up into a single table (Table 3).

#### Background

Two canonical tasks underpin multi-interest recommendation.

**CTR prediction.** Given an item set $\mathcal{I}$, a user set $\mathcal{U}$, and an interaction matrix $\mathbf{R} = [r\_{i,j}]$ (with $r\_{i,j}=1$ if user $u\_i$ interacted with item $i\_j$), estimate the probability that user $u$ clicks item $i$ when it is displayed.

$$
P(i \mid u, \mathbf{R}) = f_\theta(u, i, \mathbf{R})
$$

**Sequential recommendation.** Unlike CTR, this models preference evolution and temporal patterns (long- vs. short-term). Interactions are ordered chronologically into $\mathcal{S}\_u = \{i\_1, i\_2, ..., i\_t\}$, and the goal is to predict the item at step $t+1$.

$$
P(i_{t+1} \mid i_1, i_2, ..., i_t) = f_\theta(i_1, i_2, ..., i_t)
$$

**From single to multiple representations.** Under representation learning, both tasks learn a user representation $\mathbf{h}\_u \in \mathbb{R}^{1 \times d}$ and an item representation $\mathbf{x}\_i \in \mathbb{R}^{1 \times d}$, with the predicted score given by their inner product.

$$
\hat{y}_{u_i} = \mathbf{h}_u \mathbf{x}_i^\top
$$

Because of uncertain user intentions, complex behavior patterns, and ambiguous item themes, a single vector is insufficient. Multi-interest recommendation therefore expands the user representation from a single vector into a list $\mathbf{H}\_u = [\mathbf{h}\_u^1, ..., \mathbf{h}\_u^K]$ (or the item into $\mathbf{X}\_i = [\mathbf{x}\_i^1, ..., \mathbf{x}\_i^K]$), where $K$ is the number of interests (or item aspects). This in turn requires an **aggregation** step, which comes in two flavors.

- **Representation aggregation.** Fuse the multiple interest representations into one vector *before* prediction.

$$
\hat{y}_{u_i} = \phi_u(\mathbf{H}_u)\,\phi_i(\mathbf{X}_i)^\top
$$

where $\phi\_u(\cdot)$, $\phi\_i(\cdot)$ can be pooling, concat, attention, or neural networks.

- **Recommendation aggregation.** Compute a per-interest score first, then combine the scores via a strategy such as a max operation.

$$
\hat{y}_{u_i} = \phi(\mathbf{H}_u \mathbf{X}_i^\top)
$$

The history of the field traces back to Li et al. (2005), who first proposed that "users have many completely different interests" for e-commerce. But the field took off in 2019 when MIND (Li et al., 2019) used dynamic routing to represent multiple interests and proved its value on Mobile Tmall's online traffic. Influential follow-ups — ComiRec, SINE, MINER — followed. Per DBLP, the count of related papers grew from 27 before 2021 to 53 in 2024, reaching 172 cumulatively by March 2025.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig3-taxonomy.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: The key research dimensions of multi-interest recommendation — Tasks, modeling Aspects, key Models (components), and application Scenarios."
   zoomable=true %}

#### What Aspects Does It Model?

Modeling aspects are split by the source of external information into **user-oriented** and **item-oriented**.

##### User-oriented aspects

- **Spatial / location.** Users' travel, accommodation, and activity behaviors vary with location — shopping malls and museums in a modern metropolis, natural scenery and monuments in a historical city. Crucial for travel and lifestyle platforms.
- **Temporal & periodic.** Interests shift over time and exhibit periodic trends — surfing in summer, skiing in winter. Long- and short-term preference evolution are modeled jointly.
- **Social group.** Users of similar social standing make similar decisions (a herding effect); preference similarity within a group enriches multi-interest profiles.
- **Behaviors.** Search, click, comment, add-to-cart, favorite, and purchase each reveal different latent interests and preference strengths. Modeling interests across behavioral dimensions improves both explainability and accuracy.

##### Item-oriented aspects

- **Attributes.** Items carry categories, tags, brands, and knowledge entities. Gym-goers prioritize nutritional content; fashion elites prefer designer brands. Hypergraph neural networks and knowledge graphs inject this structured knowledge into representation learning.
- **Reviews.** Item reviews, written by consumers, are more persuasive than merchant descriptions and reveal true preferences — useful for both user and item modeling.
- **Multi-modality.** Identifying items by a unique ID alone ignores the rich numeric/categorical attributes, images, videos, and text. Riding the success of large CV and NLP models, this is now the hottest sub-area.
- **Domain.** Users act across domains and platforms. Cross-domain information boosts target-domain performance and alleviates cold-start.

A second important distinction: **explicit** multi-interest modeling requires external side information to reveal preference strength per aspect, whereas **implicit** modeling learns multi-interest representations from historical interactions alone. Methods like DMIN, ComiRec, and TimiRec predefine a fixed interest count and then model the vector set with dynamic routing or attention — a simple yet effective paradigm that is now mainstream.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/tab2-classification.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: Classification of representative methods, organized by task (Sequential / CTR / Session-based / Conversation / Cross-domain) x modeling aspect x research concern."
   zoomable=true %}

#### Method / Architecture

A multi-interest framework has two core components. The **interest extractor** learns multiple interest representations from interacted items and side information; the **interest aggregator** fuses these representations (or combines the per-interest recommendation results) into the final output.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig6-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: The multi-interest modeling framework. The two dotted-box modules — interest extractor and interest aggregator — are the heart of every method."
   zoomable=true %}

### Extractor (1): Dynamic Routing

CapsNet's (Sabour et al., 2017) dynamic routing specializes in hierarchical structure learning. A capsule is a group of neurons responding to properties of an object; the activation vector's length encodes the probability a property is present and its orientation encodes the property's strength. For multi-interest modeling we define a set of interest capsules $\mathbf{H} = [\mathbf{h}\_1, ..., \mathbf{h}\_K]$, updated by a non-linear squash function.

$$
\mathbf{h}_j = \text{squash}(\mathbf{s}_j) = \frac{\|\mathbf{s}_j\|^2}{1 + \|\mathbf{s}_j\|^2} \cdot \frac{\mathbf{s}_j}{\|\mathbf{s}_j\|}
$$

Here $\Vert \mathbf{s}\_j\Vert $ is the Euclidean ($L^2$) norm. squash acts as an activation that suppresses short vectors toward zero and compresses long vectors toward unit length. $\mathbf{s}\_j$ is computed as:

$$
\begin{aligned}
\mathbf{x}'_i &= \mathbf{W}_{ij}\mathbf{x}_i, \\
\mathbf{s}_j &= \sum_{i=1}^{t} c_{ij}\,\mathbf{x}'_i, \\
c_{ij} &= \text{softmax}(b_{ij}) = \frac{\exp(b_{ij})}{\sum_{j=1}^{K}\exp(b_{ij})}, \\
b_{ij} &= b_{ij} + \mathbf{h}_j \mathbf{x}_i'^\top
\end{aligned}
$$

$\mathbf{W}\_{ij}$ is a learnable transformation matrix and $c\_{ij}$ is the coupling coefficient — the probability that item $i$ couples to capsule $j$, generated by iterative routing and initialized to zero. The full procedure is below.

```text
Algorithm 1: Dynamic Routing
Input:  iteration rounds R; item representations [x_1, ..., x_t]; routing logits b_ij = 0
Output: multi-interest representations [h_1, ..., h_K]
for r = 1, 2, ..., R do
  for each low-level capsule (item) i:      c_ij = softmax(b_ij)
  for each high-level capsule (interest) j: s_j = Σ_i c_ij W_ij x_i
  for each high-level capsule j:            h_j = squash(s_j)
  update:                                   b_ij = b_ij + h_j (W_ij x_i)^T
end for
return [h_1, ..., h_K]
```

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig7-extractors.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: Multi-interest extraction architectures. (a) Dynamic routing iteratively refines coupling coefficients; (b) attention computes a weighted sum in a single forward pass against learnable interest embeddings e."
   zoomable=true %}

### Extractor (2): Attention-based

Using attention instead of dynamic routing is the most widely adopted approach. Against learnable interest embeddings $\mathbf{E} = [\mathbf{e}\_1, ..., \mathbf{e}\_K]$, it extracts $K$ interest representations from the interacted items $[\mathbf{x}\_1, ..., \mathbf{x}\_t]$.

$$
\begin{aligned}
\mathbf{h}_j &= \sum_{i=1}^{t} w_i^j \mathbf{x}_i, \quad j = 1, 2, ..., K, \\
w_i^j &= \frac{\exp\!\big(\mathbf{e}_j\,\sigma(\mathbf{W}_j\mathbf{x}_i + \mathbf{b}_j)^\top / \tau\big)}{\sum_{i=1}^{t} \exp\!\big(\mathbf{e}_j\,\sigma(\mathbf{W}_j\mathbf{x}_i + \mathbf{b}_j)^\top / \tau\big)}
\end{aligned}
$$

$\mathbf{W}\_j$, $\mathbf{b}\_j$ are per-interest parameters, $\sigma(\cdot)$ is an activation, and $\tau$ is a temperature controlling sharpness. Unlike routing, this finishes in one forward pass. Variants abound: some raise $\mathbf{e}\_j\sigma(\mathbf{W}\_j\mathbf{x}\_i + \mathbf{b}\_j)^\top$ to a power $\gamma$ to reshape the distribution — larger $\gamma$ concentrates attention on salient items, $\gamma=0$ degenerates to average pooling, and $\gamma \to \infty$ becomes hard attention (pick the single most relevant item). Others swap the inner product for cosine similarity, or combine Gumbel-softmax with hard attention.

### Extractor (3): Non-linear Transformation

A third approach derives interests directly from the user representation $\mathbf{u}$ via a non-linear transformation, rather than from each interacted item.

$$
\mathbf{h}_j = \text{LeakyReLU}\big(\mathbf{u}\mathbf{W}_j + \mathbf{b}_j\big), \quad j = 1, 2, ..., K
$$

where $\mathbf{u}$ is a neural-network user representation and $\mathbf{W}\_j$, $\mathbf{b}\_j$ are the per-interest transformation matrix and bias.

> **Extractor trade-offs (authors' take).** Dynamic routing clusters behaviors into discrete interest slots via iterative assignment, giving clear separation and interpretability — but adds compute from iteration and struggles when interests subtly overlap. Attention produces soft, content-based mixtures: flexible, strong on long-range dependencies, easy to implement — but suffers redundancy among interest vectors, high memory cost on long sequences, and weaker explicit separation. The authors favor routing when interpretability/diversity/separation matter (e.g., retrieval), attention for fine-grained interactions and sequential contexts, and note that hybrids (routing followed by attention refinement, or attention with diversity constraints) often hit the best efficiency-performance trade-off.

### Aggregator

The aggregator merges the multiple interest representations into the final recommendation. Here are the two paradigms at the module level.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig8-aggregators.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: Aggregator architectures. (a) Representation aggregation produces a single fused interest h' before scoring; (b) recommendation aggregation scores per interest, then combines via max etc."
   zoomable=true %}

**Representation aggregation — concat / pooling.** The simplest approach: concat or mean/max pooling followed by an MLP.

$$
\mathbf{h}' = \text{MLP}\big(\text{Concat/Pooling}([\mathbf{h}_1, \mathbf{h}_2, ..., \mathbf{h}_K])\big)
$$

The MLP handles both dimensional transfer and mapping interests from different aspects into a uniform latent space.

**Representation aggregation — attention.** This view splits preference into a "basic interest" and "diverse interests." It correlates the basic interest $\mathbf{h}\_b$ (from historical interactions) with each interest $\mathbf{h}\_i$ and takes a weighted sum.

$$
\begin{aligned}
w_i &= \frac{\exp(\mathbf{h}_b \mathbf{W} \mathbf{h}_i^\top)}{\sum_{i=1}^{K} \exp(\mathbf{h}_b \mathbf{W} \mathbf{h}_i^\top)}, \\
\mathbf{h}' &= \sum_{i=1}^{K} w_i \mathbf{h}_i
\end{aligned}
$$

with $\mathbf{W}$ learnable. To boost diversity and ease user fatigue, some variants measure similarity via projection distance instead.

**Representation aggregation — RL selector.** Not all interests contribute to the current item, so some works dynamically select the most relevant interest via reinforcement learning. A policy $\pi\_\theta(s, a)$ maps state $s$ (the user's interest w.r.t. the current item) to an action distribution (whether an interest is selected), with recommendation performance as the reward. A dueling Q-network variant follows the Bellman equation:

$$
\begin{aligned}
Q^*(s_t, a_t) &= \mathbb{E}_{s_{t+1}}\Big[r_t + \gamma \max_{a_{t+1} \in \mathcal{A}_{t+1}} Q^*(s_{t+1}, a_{t+1})\Big], \\
Q(s_t, a_t) &= \max_i \big(f_{\theta_V}(\mathbf{h}_i) + f_{\theta_A}(\mathbf{h}_i, a_t)\big), \quad i = 1, 2, ..., K
\end{aligned}
$$

**Recommendation aggregation — mean/max pooling.** Score item $i$ per interest $j$ as $y\_i^j$, then pool.

$$
y_i' = \text{Mean/Max}\big([y_i^1, y_i^2, ..., y_i^K]\big)
$$

**Recommendation aggregation — attention.** Weight each score by the relevance between target item $\mathbf{x}\_i$ and interest $\mathbf{h}\_j$.

$$
\begin{aligned}
y_i' &= \sum_{j=1}^{K} w_j\, y_i^j, \\
w_j &= \frac{\exp(\mathbf{h}_j \sigma(\mathbf{W}\mathbf{x}_i)^\top)}{\sum_{j=1}^{K} \exp(\mathbf{h}_j \sigma(\mathbf{W}\mathbf{x}_i)^\top)}
\end{aligned}
$$

> **Aggregator trade-offs.** Representation aggregation builds interest vectors before ranking, letting each drive candidate generation — but raises training/inference cost, depends on fusion modules, and may waste compute on redundant/noisy representations. Recommendation aggregation merges results after generation, so it slots into existing pipelines and offers flexible diversity control — but its cost explodes when candidates are huge, and merging can introduce redundancy/conflicts that hurt the final result.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/tab3-methods.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: Representative methods organized by extractor x aggregator. Attention is the most common extraction method, followed by dynamic routing."
   zoomable=true %}

#### Training Objective: Diversity Regularization

Interest representations from routing or attention risk **representation collapse**: the model learns a trivial solution where all interests become indistinguishable and shrink to a narrow point, gutting representational power. The fix is a disagreement regularization term that pushes interest representations apart. There are two families.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig10-regularization.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 10: (a) Representation regularization expands interests from a narrow point across the hyperspace, preventing collapse; (b) distribution regularization transforms interest distributions from isotropy to anisotropy."
   zoomable=true %}

##### Representation regularization

Enlarge pairwise distance among interests in the semantic hyperspace.

**Cosine similarity.** Minimize cosine similarity across all interest pairs to increase distinctiveness.

$$
\mathcal{L}_{reg} = \frac{1}{K^2}\sum_{i=1}^{K}\sum_{j=1}^{K} \frac{\mathbf{h}_i \cdot \mathbf{h}_j}{\|\mathbf{h}_i\|\,\|\mathbf{h}_j\|}
$$

**Contrastive learning.** Use an InfoNCE loss as the regularizer, pulling instances toward positives and away from negatives.

$$
\mathcal{L}_{reg} = -\frac{1}{K}\sum_{i=1}^{K} \log \frac{\exp(\text{sim}(\mathbf{h}_i, \mathbf{h}_i^+)/\tau)}{\exp(\text{sim}(\mathbf{h}_i, \mathbf{h}_i^+)/\tau) + \sum_{j=1}^{n}\exp(\text{sim}(\mathbf{h}_i, \mathbf{h}_j^-)/\tau)}
$$

The positive $\mathbf{h}\_i^+$ comes from noise perturbation/dropout on the original; negatives $\mathbf{h}\_j^-$ are sampled from other interest representations.

##### Distribution regularization

Instead of the representations themselves, increase the **variation** of each interest's distribution.

**Covariance regularization.** Constrain the diagonal (variances) of the covariance matrix of the item-interest routing matrix $\mathbf{C} \in \mathbb{R}^{t \times K}$.

$$
\begin{aligned}
\text{Cov}(\mathbf{C}, \mathbf{C}) &= (\mathbf{C} - \bar{\mathbf{C}})^\top (\mathbf{C} - \bar{\mathbf{C}}), \\
\mathcal{L}_{reg} &= \big\|\text{diag}\big(\text{Cov}(\mathbf{C}, \mathbf{C})\big)\big\|_F^2
\end{aligned}
$$

$\bar{\mathbf{C}}$ is the mean of $\mathbf{C}$ along the first axis, and $\Vert \cdot\Vert \_F$ is the Frobenius norm.

**Element-wise regularization.** More directly, compare two interests' attention distribution matrices element-wise.

$$
\mathcal{L}_{reg} = \frac{1}{K^2}\sum_{i=1}^{K}\sum_{j=1}^{K} \big\|\mathbf{W}_i \odot \mathbf{W}_j\big\|
$$

with $\mathbf{W}\_i$, $\mathbf{W}\_j$ the attention distribution matrices of interests $i$, $j$ and $\odot$ the Hadamard product. The authors note: orthogonality/separation penalties (representation reg.) boost diversity cheaply but hurt accuracy if too strong; distributional constraints ensure coverage in clustering-based models but may misalign with real behavior; contrastive learning catches subtly overlapping interests but is sensitive to negative-pair design. They recommend hybrids such as regularization plus contrastive learning.

#### Applications and Public Datasets

Multi-interest modeling is applied both to general scenarios (online shopping, entertainment) and to specialized domains (healthcare, education). The survey's catalog of scenario datasets:

| Application | Public datasets | Notes |
|------|------|------|
| News | MIND | From MS News; ~160K English articles, 15M+ impression logs |
| Movies & micro-videos | MovieLens, KuaiShou, ReDial, TG-ReDial | MovieLens comes in 100K/1M/10M sizes |
| Travel & check-in | FourSquare, Fliggy, Yelp, Gowalla | Timestamped, geo-tagged check-ins (location-based) |
| Online shopping | Amazon, Taobao, RetailRocket, Ta Feng | Amazon Reviews span 1996-2023 |
| Online education | MOOCCube | From XuetangX; ~1K courses, tens of thousands of learners |

Industrial deployments include MIND (Tmall); ComiRec, PIMI, UMI, ULIM (Alibaba online recommendation); Trinity (unifying multi-/long-term/long-tail interests on Douyin and Douyin Lite); and LongRetriever (multi-interest retrieval over ultra-long sequences). ULIM, for example, tackles latency on Taobao by partitioning long behavior sequences into category-aware subsequences and using a pointer-generator network to predict top-K interest categories.

#### Challenges and Future Directions

The survey closes with six directions, each motivated by *why it is the current bottleneck*.

- **Adaptive interest extraction (5.1).** Most methods fix the interest count $K$. But news usually centers on a single topic while movies are inherently ambiguous and multifaceted, so a fixed $K$ is unrealistic and blocks cross-domain knowledge transfer. Proposed remedies: sparse interest-capsule activation, density-based clustering (DBSCAN), hierarchical clustering dendrograms, and silhouette score / gap statistic to choose $K$ dynamically.
- **Efficiency (5.2).** Multi-interest modeling costs far more than general recommendation. The number of interests, dynamic routing's iteration (learnable matrices between capsules grow quadratically with capsule count), external side-information encoding, and the aggregation strategy are all bottlenecks.
- **Extraction for denoising (5.3).** Not every item benefits the user's intention (accidental clicks, noisy text). Dynamic routing inherently soft-filters noise — signals that don't align with any coherent interest cluster are down-weighted — offering a principled path to interest-level denoising. Yet how to reduce noise within/across interest capsules is barely explored.
- **Explainability (5.4).** In a multi-interest setting we must explain not just *why* an item is recommended, but *which* interest among multiple preferences drove it. Uncovering the fine-grained latent mapping between items and interest representations remains open.
- **Long-tail & cold-start (5.5).** Data sparsity is the root cause of both. Multi-interest modeling has a structural edge: heterogeneous auxiliary signals can be explicitly injected into interest-vector augmentation. Multi-modal pretraining, cross-domain interest prototypes, and spatial-temporal/group signals reinforce cold-item representations.
- **Frontier methodology (5.6).** (i) **RL** — frame interactions as real-time decisions and model interest selection as a policy. (ii) **LLM/VLM** — news content encoding, item context modeling, DPO (direct preference optimization) for multi-preference alignment, multi-modal pretraining. (iii) **Diffusion** — the reverse process can refine multi-interest representations by mitigating noisy interactions, but recovering "true" multifaceted interests is hard given preference ambiguity and exposure bias.

#### Limitations and Critical Assessment

- **No unified empirical benchmark.** As a synthesis it's valuable, but it offers **no table reproducing methods under one dataset and protocol**. Which extractor/aggregator combo actually wins, and by how much, in which scenario is left for the reader to chase across original papers.
- **The hybrid recommendation lacks quantitative backing.** "Routing + attention hybrids are best" is intuitive but presented without quantitative evidence (e.g., an efficiency-performance trade-off curve), so it remains a qualitative claim.
- **Fuzzy explicit/implicit boundary.** The explicit-vs-implicit split is useful, but where methods that use side information *minimally* fall is not sharply defined.
- **(Author-acknowledged limits.)** Fixed interest count, high compute cost, immature interest-level denoising and explainability, and the theory-practice gap in diffusion models are candidly flagged as open problems.
- **No standardized metrics.** There is no agreed metric measuring diversity, accuracy, and explainability jointly, making cross-paper "diversity improvement" claims hard to compare — a structural weakness of the whole sub-field.

#### Takeaways

- **Every multi-interest method reduces to "extractor + aggregator."** When reading a new paper, ask three questions: (1) is extraction dynamic routing, attention, or non-linear transformation? (2) does aggregation happen at the representation or recommendation stage? (3) how is diversity enforced? Table 3 is that map.
- **Representation collapse is the Achilles' heel.** Extracting $K$ vectors that all collapse to one point is no better than a single representation. Which regularizer you pick — cosine / contrastive / covariance / element-wise — governs the model's actual diversity.
- **Fixed $K$ is a stopgap.** The single fact that news is single-topic while movies are multifaceted already shows that adaptively choosing the interest count is the next-generation challenge.
- **Multi-interest is a natural fit for long-tail and cold-start.** Its structure injects heterogeneous side information directly into interest vectors, giving it an inherent edge over single representations on sparsity — backed by industrial deployments (Tmall, Alibaba, Douyin).
- **LLMs and diffusion are the next frontier.** Folding multi-modal and world knowledge into interest extraction has started, but recovering "true" multifaceted interests via diffusion must overcome the fundamental obstacle of exposure bias.

#### References

- Paper: [Multi-Interest Recommendation: A Survey (DOI: 10.1145/3789510)](https://doi.org/10.1145/3789510)
- Code / curated repo: [WHUIR/Multi-Interest-Recommendation-A-Survey](https://github.com/WHUIR/Multi-Interest-Recommendation-A-Survey)
- Venue: ACM Transactions on Information Systems, Vol. 44, No. 4, Article 78 (April 2026)

#### Further Reading

- **[Multi-Interest Network with Dynamic Routing for Recommendation at Tmall](https://arxiv.org/abs/1904.08030)** (Li et al., CIKM 2019) — MIND, which kicked off multi-interest recommendation by representing user interests with dynamic routing.
- **[Controllable Multi-Interest Framework for Recommendation](https://arxiv.org/abs/2005.09347)** (Cen et al., KDD 2020) — ComiRec, pairing multi-interest extraction with an aggregation module that controls accuracy vs. diversity.
- **[Sparse-Interest Network for Sequential Recommendation](https://arxiv.org/abs/2102.09267)** (Tan et al., WSDM 2021) — SINE, adaptively inferring a sparse set of interests per user from a large concept pool.
- **[Exploring Periodicity and Interactivity in Multi-Interest Framework for Sequential Recommendation](https://arxiv.org/abs/2106.04415)** (Chai et al., 2021) — PIMI, integrating sequence periodicity and time intervals into multi-interest modeling.
- **[Dynamic Routing Between Capsules](https://arxiv.org/abs/1710.09829)** (Sabour et al., NeurIPS 2017) — the original CapsNet paper from which multi-interest dynamic routing is borrowed.

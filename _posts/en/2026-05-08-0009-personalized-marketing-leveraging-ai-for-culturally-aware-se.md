---
layout: post
title: "[Paper Review] Personalized marketing: Leveraging AI for culturally aware segmentation and targeting"
date: 2026-05-08
description: "A short application paper that bolts LIME onto K-means over Kaggle's 200-row Mall Customer dataset. The biggest discussion point is the gap between the 'culturally aware' framing in the title and what the experiment actually does."
tags: [personalized-marketing, k-means-clustering, lime, customer-segmentation, explainable-ai]
categories: paper-review
giscus_comments: false
related_posts: false
thumbnail: assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig1-proposed-method.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/
ko_url: /papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Franciskus Antonius Alijoyo et al. (8 co-authors across Indonesia, Saudi Arabia, India, Uzbekistan, Malaysia) |
| Venue | *Alexandria Engineering Journal* 119 (2025) 8-21 · Elsevier (open access, CC BY-NC-ND 4.0) |
| DOI | [10.1016/j.aej.2025.01.074](https://doi.org/10.1016/j.aej.2025.01.074) |
| Data | Kaggle [Mall Customer Segmentation Data](https://www.kaggle.com/datasets/vjchoudhary7/customer-segmentation-tutorial-in-python) (n=200, 5 columns) |
| <span style="white-space: nowrap">Review date</span> | 2026-05-08 |

## TL;DR

- Bolts **K-means clustering + LIME (Local Interpretable Model-Agnostic Explanations)** onto Kaggle's 200-row Mall Customer dataset, splits customers into 4 clusters, then uses LIME to explain why each customer falls where it does.
- Headline numbers: the proposed K-Means+LIME pipeline reports MSE 0.9212, MAE 0.9874, beating Linear Regression (1.6861/1.0745), Decision Tree (1.1785/1.0002), KNN (1.2487/1.0015), GMM (1.2000/1.0500), and DBSCAN (1.5000/1.250).
- The 4 clusters split cleanly along *spending score* (high / upper-middle / lower-middle / low) with age distributed evenly within each. LIME flags **`Age ≤ 29`** as the dominant feature for both customers shown — weight 10 for customer 0, weight 14 for customer 1.
- The headline criticism is the gap between the title and the experiment. The Mall Customer dataset has zero cultural variables — no ethnicity, language, region, or cultural preference. There are also concrete red flags: `CustomerID` showing up as a top LIME feature (a textbook data leakage signal), MSE/MAE applied to unsupervised clustering without specifying the surrogate stage, and table values for GMM/DBSCAN whose computation is hard to reproduce.
- That said, the *pattern* of clustering followed by LIME post-hoc explanation is widely used in practice, and Algorithm 2 in §5 is a clean, copy-pasteable recipe for that pattern.

## Introduction

AI-driven *personalized marketing* has become essentially the default for both academia and industry over the last five years. This blog has covered the same neighborhood from a macro angle in [paper 0005](/en/papers/0005-artificial-intelligence-in-customer-relationship-management/) and [paper 0007](/en/papers/0007-unlocking-power-of-ai-in-crm/) — those papers ask *why* AI-CRM matters and *what capabilities* it produces. This paper sits on the opposite end of that spectrum: a small applied case study that takes K-means and LIME, two textbook tools, and runs them once over a 200-row public dataset.

The motivating problem is familiar. K-means clustering is the standard go-to for customer segmentation but it cannot explain *why* a particular customer ended up in a particular cluster. LIME (Ribeiro et al., 2016) is a model-agnostic technique that produces local explanations. Wiring the two together is not new on its own, so the authors layer on a more ambitious framing — *culturally aware* marketing — claiming that ethnicity, language, and region of residence get encoded in pre-processing and surface in the LIME explanations.

The wrinkle is that the dataset they actually run on is Kaggle's Mall Customer (vjchoudhary7), with 5 columns: `CustomerID, Gender, Age, Annual Income (k$), Spending Score (1-100)`. **None of those are cultural.** That gap is the central tension of this review and gets a long treatment in *Limitations and critical assessment*. It is still worth reading the paper carefully for two reasons. (1) The K-means + LIME workflow is condensed into Algorithm 2, which can be lifted directly into a production pipeline. (2) Looking at the gap between the *culturally aware* framing and the actual experiment surfaces the natural follow-up question: what would you actually need to do segmentation by cultural variables for real?

## Key Contributions

A blend of what the authors claim and what we think actually matters from a reviewer's seat.

- A clean **K-means + LIME workflow for interpretable customer segmentation**, reduced to a single flowchart (Fig. 1) and a one-page algorithm (Algorithm 2 in §5). It is essentially a recipe you can drop onto your own dataset.
- A standardised pre-processing block: (1) missing-value handling (mean/median, mode, KNN imputation), (2) PCA dimensionality reduction, (3) Min-Max or standard scaling, (4) categorical feature encoding.
- An explicit prescription to apply **both Elbow Method and Silhouette Score** to choose K — they report K=3 or K=4 as the elbow on this dataset and proceed with K=4 for visualisations.
- Reported MSE/MAE wins against three supervised baselines (Linear Regression, Decision Tree, KNN) and two unsupervised competitors (GMM, DBSCAN). (The evaluation framing itself has issues — see §Limitations.)
- A short marketer-facing readout: middle-income customers and the under-30 demographic are the dominant high-spending targets, derived from the LIME explanations.

## Related Work / Background

This section folds in the paper's literature review (§2) and its K-means / LIME exposition (§§4.3-4.4). Written for readers comfortable with ML in general but new to customer segmentation.

### The classic stack — RFM and K-means

The studies the paper cites (Musa et al., 2020; Pradana, 2021; Tabianan et al., 2022; Christy et al., 2021) share two things. First, they apply K-means on **RFM (Recency, Frequency, Monetary)** features or close cousins. Second, they pick K with one of elbow / silhouette / gap statistic. The method here is a faithful variant of that lineage, and the K-means steps spelled out (Determine K → Assign K centroids → Assign each point → Recompute centroids → Repeat) have been unchanged since Lloyd (1957) and MacQueen (1967).

### LIME — model-agnostic local explanations

LIME (Ribeiro et al., 2016) explains *individual* predictions of a black-box classifier. The core idea is straightforward: for the data point $x$ you want to explain, perturb the input to generate synthetic samples in the local neighborhood, query the black-box model on those samples, then fit a *simple interpretable model* (typically a weighted linear regression) to the (perturbed sample, prediction) pairs. The simple model's coefficients become the explanation.

In equation form, LIME's objective is

$$
\xi(x) = \arg\min_{g \in G} \; \mathcal{L}(f, g, \pi_x) + \Omega(g)
$$

- $f$: the black-box model being explained
- $g$: the interpretable model (linear, tree, etc.)
- $\pi\_x(z)$: a proximity weight that captures how close $z$ is to $x$
- $\mathcal{L}$: the $\pi\_x$-weighted disagreement between $f$ and $g$
- $\Omega(g)$: a complexity penalty on $g$ (e.g., feature count)

This paper applies LIME **post-hoc to K-means output**. K-means is not a classifier, so the paper effectively trains a *surrogate classifier* on top of the K-means cluster labels and points `LimeTabularExplainer` at that surrogate. Algorithm 2 (§5) lays out the steps.

### Elbow Method and Silhouette Score

The two standard yardsticks for choosing K in K-means.

- **Elbow Method**: sweep K from 1 to 10, compute WCSS (Within-Cluster Sum of Squares, Eq. 3), and look for the *kink* in the curve. On this dataset it sits around K=3-4.

- **Silhouette Score** (Rousseeuw, 1987): for point $i$, $s\_i$ compares the mean intra-cluster distance $a\_i$ to the mean nearest-cluster distance $b\_i$, normalised by max. $s\_i \approx 1$ is well-clustered, $\approx 0$ is on a boundary, $< 0$ is probably misclustered.

  $$
  s_i = \frac{b_i - a_i}{\max(a_i, b_i)}
  $$

  Pick K with the highest mean $\bar{s}$.

The paper says it uses both, but only shows the elbow plot (Fig. 9). The silhouette curve itself is not visualised.

## Method / Architecture

The whole pipeline fits in one diagram.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig1-proposed-method.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: The proposed pipeline. (1) Data collection → (2) Pre-processing: missing-value handling, feature scaling, feature encoding → (3) K-means clustering with K chosen via elbow / silhouette → (4) LIME-based explainability."
   zoomable=true %}

Going through it stage by stage.

### Data collection

Section 4.1 admits up front that "*The Mall Customers dataset was designed to facilitate education of seminal concepts within customer segmentation*" — i.e., this is a learning toy. 5 columns: `CustomerID, Gender, Age, Annual Income (k$), Spending Score (1-100)`. 200 rows. *No cultural variables.*

### Pre-processing

Three steps.

- **Imputation** — mean/median, mode, or KNN imputation. Effectively ceremonial here because the dataset has essentially no missing values.
- **Dimensionality reduction** — PCA is listed as a candidate. With only ~4 effective features there is little reason to apply it.
- **Scaling** — Min-Max (0-1) or standardisation (mean 0, std 1). This step is non-optional: Age (18-80), Annual Income (20-140K USD), and Spending Score (1-100) operate at different scales, and Euclidean distance in K-means would be dominated by Income otherwise.

### K-means clustering

Eq. 1 — Euclidean distance to the centroid:

$$
d(x_i, \mu_k) = \sqrt{\sum_{j=1}^{n} (x_{ij} - \mu_{kj})^2}
$$

Eq. 2 — centroid update:

$$
\mu_k = \frac{1}{|C_k|} \sum_{x_i \in C_k} x_i
$$

Iterate until convergence or max iters. The flow is summarised in Fig. 2.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig2-kmeans-flowchart.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: K-means clustering flowchart. Determine K → assign K initial centroids → assign each point to the nearest centroid → recompute centroids → loop until reassignments stop → output final clusters."
   zoomable=true %}

### Bias mitigation strategies in clustering

The paper lists *balanced sampling / dropping irrelevant variables / domain expert review* as the three pillars of bias mitigation. The treatment is brief and stays at the level of general principles rather than concrete dataset-specific actions.

### Elbow Method and Silhouette Score

As described in *Related Work*. WCSS is computed for K=2 to K=10. Elbow lands at K=3 or K=4. Visualisations proceed with K=4.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig9-elbow-method.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9: WCSS vs K from the Elbow Method. Largest drop is K=1 → 2; the curve flattens around K=4-5. The paper picks K=3 or K=4 as optimal and uses K=4 for the rest of the visualisations."
   zoomable=true %}

### LIME-based explainability for customer segmentation

The §5 algorithm 2 lays out the post-hoc LIME procedure.

```text
Input:  preprocessed data matrix X, trained model f(θ), feature names, class labels
Output: per-segment explanations + actionable marketing insights

1. Initialise the LIME explainer
   explainer = LimeTabularExplainer(
       X, mode='classification',
       feature_names=feature_names,
       class_names=class_names)

2. Generate per-customer explanations
   for x_i in X:
       x_f = extract_features(x_i)
       explanation = explainer.explain_instance(
           x_f, f(θ).predict_proba, num_features=5)
       # bar-chart visualisation of feature contributions

3. Aggregate insights across customers
   - common patterns inside each cluster
   - features that identify each cluster
   - features that differentiate clusters

4. Translate to targeted marketing strategies
   - per-cluster campaign design
   - product/service design driven by influential features
   - alignment check with domain expertise

5. Output actionable recommendations
```

The crucial detail is `f(θ).predict_proba`. K-means itself emits no probabilities, so the paper implicitly trains a *surrogate classifier* on top of the cluster labels and feeds that surrogate's `predict_proba` into LIME. The paper does not specify the surrogate's choice of model — a concrete omission to flag.

## Training Objective / Loss

This paper does not train against a loss; it *evaluates* with two scalars.

- **MSE (Mean Squared Error)**

  $$
  \mathrm{MSE} = \frac{1}{n} \sum_{i=1}^{n} (y_{\mathrm{pred},i} - y_{\mathrm{actual},i})^2
  $$

- **MAE (Mean Absolute Error)**

  $$
  \mathrm{MAE} = \frac{1}{n} \sum_{i=1}^{n} |y_{\mathrm{pred},i} - y_{\mathrm{actual},i}|
  $$

The paper writes that "*MSE measures the average squared distinction between the actual and predicted spending scores*" — meaning spending score is treated as the *regression target*. K-means itself does not predict spending score, so this evaluation requires an additional step (cluster-mean spending score, or a separate surrogate regressor) that is not made explicit. That ambiguity is the single biggest hole in the evaluation framing.

## Training Data and Pipeline

| Item | Value |
|------|-----|
| Dataset | Kaggle Mall Customer Segmentation |
| Rows | 200 |
| Columns | `CustomerID, Gender, Age, Annual Income (k$), Spending Score (1-100)` |
| Missing values | effectively none |
| Clustering algorithm | K-means |
| K selection | Elbow + Silhouette (K=3 or 4) |
| K used for visualisation | 4 |
| Explanation tool | `lime.LimeTabularExplainer` (mode='classification', num_features=5) |
| Evaluation | MSE, MAE |
| Compute | not specified (single CPU is plenty for a dataset this small) |

## Experimental Results

### Demographic distributions in the dataset

Useful context before reading the cluster results.

- **Age**: 18-80, peak around the 50s. Most populous age bucket is 36-45 (density ~0.9), followed by 18-25 (0.85), 26-35 (0.75), 56+ (0.7), 46-55 (0.6).
- **Gender**: 100 women, 90 men. Slight skew toward female.
- **Annual Income**: 20K-140K USD, peak around 80K USD. Approximately normal.
- **Spending Score (1-100)**: peak around 60. Mostly symmetric. Very few customers below 30 or above 90.

### Four clusters at K=4

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig11-clusters-age-spending.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 11: Four clusters projected onto age × spending score (1-100). Red = high spenders (75-100), purple = upper-middle (60-85), cyan = lower-middle (30-60), black = low (5-25). The split is essentially along spending score; age is distributed roughly evenly within each cluster."
   zoomable=true %}

The paper's takeaway is that *moderate spenders (purple + cyan) + middle-income customers + the under-30s* form the dominant marketing target.

### LIME on individual customers

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig12-lime-customer-0.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 12: LIME explanation for customer 0. Age ≤ 29 dominates with weight 10; Annual Income 39.75-62 has weight 5; CustomerID 46.5-101.5 has weight 3."
   zoomable=true %}

Customer 1 looks similar — `Age ≤ 29` weight 14, `CustomerID ≤ 46.5` weight 2, `Annual Income ≤ 39.75` weight 1.5. In both cases age dominates, then annual income, and then — surprisingly — **`CustomerID`** shows up as a top-3 feature. That is a textbook data leakage signal and is treated in detail under *Limitations*.

### Performance comparison

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/tab1-tab2-performance.png"
   class="img-fluid rounded z-depth-1"
   caption="Tables 1 & 2: The proposed K-Means+LIME records the lowest MSE/MAE against the supervised baselines (Linear Regression, Decision Tree, KNN) and the unsupervised competitors (GMM, DBSCAN)."
   zoomable=true %}

The numbers in one table:

| Model | MSE | MAE |
|------|-----|-----|
| Linear Regression | 1.6861 | 1.0745 |
| Decision Tree | 1.1785 | 1.0002 |
| KNN | 1.2487 | 1.0015 |
| **K-Means + LIME (proposed)** | **0.9212** | **0.9874** |
| GMM | 1.2000 | 1.0500 |
| DBSCAN | 1.5000 | 1.250 |

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig14-comparison.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 14: MSE/MAE comparison of K-Means(+LIME), GMM, and DBSCAN. K-Means+LIME is lowest at (0.9212, 0.9874)."
   zoomable=true %}

## Result Analysis / Ablation

There is no real ablation. Comparisons that would matter — K-means alone vs K-means+LIME, K=3 vs K=4, Min-Max vs standardisation — are all missing. *Why* K-Means+LIME beats the other models on MSE/MAE is asserted qualitatively rather than measured: "*K-means was effective because…*" instead of pulling out one component at a time.

You can squeeze an *indirect ablation* out of the LIME plots if you want. Strip `Age` and the combined LIME weight on customer 0/1 drops by roughly 60%; strip `CustomerID` and it drops about 20%. These are reader-side back-of-envelope numbers, not experiments the paper ran.

## Limitations and Critical Assessment

This is the heart of the review. I list both the limitations the authors acknowledge and what I think a careful reader would add.

### Acknowledged limitations

- The dataset is small. The framework needs to scale to larger and more diverse datasets.
- LIME's surrogate accuracy degrades in high-dimensional regimes.
- Real-time / streaming use would require a streaming layer (Apache Kafka, etc.) or adaptive ML.
- Deep-learning-based clustering (autoencoders, etc.) might capture non-linear structure that K-means misses.

### Reviewer's add-ons

1. **The "culturally aware" framing does not match the dataset.** The Mall Customer dataset has no ethnicity, language, region, or cultural-preference variables. §4.2 talks about "*feature encoding scales the categorical characteristics, including ethnicity, language, or region of residence*" as a general statement, but that statement does not connect to the actual experiment. The title and abstract promise something the experiment cannot deliver. Anyone trying to lift this paper into their own pipeline should separate the two layers up front.

2. **`CustomerID` as a top LIME feature is data leakage.** Figures 12 and 13 show `46.50 < CustomerID ≤ 101.50` at weight 3 for customer 0 and `CustomerID ≤ 46.50` at weight 2 for customer 1. CustomerID is a synthetic index — no semantic relationship to the segment. If LIME assigns it non-trivial weight, one of two things is true: (a) the IDs happen to be correlated with another variable because they were sorted at upload time (implicit leakage), or (b) the pre-processing forgot to drop the ID column before scaling. Either way, the LIME attributions for the named features are no longer trustworthy. The standard fix is to drop ID columns at the very top of the pipeline.

3. **Applying MSE/MAE to unsupervised clustering is not well defined.** K-means itself does not predict a target. Reporting MSE/MAE requires either (1) using cluster-mean spending score as ŷ or (2) training a separate surrogate regressor on top. Neither is specified. The 0.9212 number cannot be reproduced from the paper. The same holds for the GMM (1.2000) and DBSCAN (1.5000) MSE — there is no way to know what those numbers measure. The conventional comparators for clustering are silhouette / Davies-Bouldin / Calinski-Harabasz, or (with labels) ARI / NMI.

4. **The supervised baselines are not actually comparable.** Table 1 puts Linear Regression, Decision Tree, and KNN — *supervised* models — head-to-head with K-means. If K-means is unsupervised, comparing it on a regression metric without spelling out the supervised step is a category error. This is downstream of issue (3): the surrogate stage is left unstated.

5. **K=3 vs K=4 is left ambiguous.** The paper says the elbow looks like both. The silhouette curve is not shown. Reporting silhouette for both K candidates is the standard practice — it would have made the K=4 choice defensible.

6. **No ablation.** As noted in the *Result Analysis* section, the obvious ablations (K-means alone vs +LIME, K=3 vs K=4, scaling choice) are all missing. The quantitative contribution of LIME is therefore not measurable from this paper.

7. **Figure 10's y-axis is on a 0-1 scale despite labelling itself "Number of Customer".** With 200 customers in total, "Number of Customer" of 0.6-0.9 has to be a normalised proportion, not absolute count. A small figure-readability issue.

8. **The marketing insights do not generalise.** *Moderate spender / middle-income / under-30* is a pattern of *this 200-row toy dataset*. There is no reason to expect it to transfer to a real industry dataset. The paper jumps straight from this small experiment to broad claims about culturally aware marketing.

## Takeaways

- **The K-means + LIME pattern is genuinely reusable.** Algorithm 2 maps almost line-for-line onto a production post-processing stage: clustering → surrogate classifier → `LimeTabularExplainer` → per-cluster feature contribution plots. When porting it, drop ID columns first and pin the surrogate model explicitly.
- **Always separate the framing words from the actual experiment.** The distance between this paper's title and its experiment is unusually large. Skimming abstracts is dangerous when applied work overpromises.
- **When comparing clustering models on regression metrics, demand the surrogate step.** Without that step, the numbers are unreproducible.
- **An obviously meaningless feature (`CustomerID`, row index, upload order) appearing as a top LIME feature is almost always data leakage.** This paper carries the leak through to its insights. Catch it earlier in your own pipelines.
- **Macro-level views (organisational capability, dynamic capabilities) and micro-level views (single-algorithm applied work) complement each other.** The macro work in [paper 0005](/en/papers/0005-artificial-intelligence-in-customer-relationship-management/) and [paper 0007](/en/papers/0007-unlocking-power-of-ai-in-crm/) tells you *why* and *what*; this paper attempts the *how*. Reading the two together gives a richer map of marketing ML.

## Installation and Usage

The paper does not release code, but Algorithm 2 reproduces with `scikit-learn` and `lime` alone. Below is a minimal recipe (assuming the Mall Customer dataset).

```python
# pip install scikit-learn lime pandas numpy
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from lime.lime_tabular import LimeTabularExplainer

# 1) Load + drop ID column (this review's main recommendation)
df = pd.read_csv("Mall_Customers.csv")
df = df.drop(columns=["CustomerID"])
df["Gender"] = (df["Gender"] == "Male").astype(int)

X = df[["Gender", "Age", "Annual Income (k$)", "Spending Score (1-100)"]].values
feature_names = ["Gender", "Age", "AnnualIncome", "SpendingScore"]

# 2) Scale
scaler = StandardScaler()
Xs = scaler.fit_transform(X)

# 3) K-means (K=4)
km = KMeans(n_clusters=4, random_state=0, n_init="auto").fit(Xs)
labels = km.labels_

# 4) Surrogate classifier — LIME requires predict_proba
clf = RandomForestClassifier(random_state=0).fit(Xs, labels)

# 5) LIME explainer
explainer = LimeTabularExplainer(
    Xs, mode="classification",
    feature_names=feature_names,
    class_names=[f"Cluster {i}" for i in range(4)],
)

# 6) Explain a single customer
i = 0
exp = explainer.explain_instance(Xs[i], clf.predict_proba, num_features=4)
print(exp.as_list())
exp.as_pyplot_figure()
```

Two differences from the paper: (a) `CustomerID` is dropped, (b) the surrogate classifier is explicitly RandomForest. Those two changes alone eliminate the CustomerID leakage observed in the original.

## References

- Paper: [Alexandria Engineering Journal 119 (2025) 8-21](https://doi.org/10.1016/j.aej.2025.01.074)
- DOI: [10.1016/j.aej.2025.01.074](https://doi.org/10.1016/j.aej.2025.01.074)
- Dataset: [Mall Customer Segmentation Data on Kaggle (vjchoudhary7)](https://www.kaggle.com/datasets/vjchoudhary7/customer-segmentation-tutorial-in-python)
- License: CC BY-NC-ND 4.0 (open access)

## Further Reading

- **["Why Should I Trust You?": Explaining the Predictions of Any Classifier](https://arxiv.org/abs/1602.04938)** (Ribeiro et al., KDD 2016) — the original LIME paper. Algorithm 2 in the paper under review is essentially a straightforward application of this framework.
- **[A Unified Approach to Interpreting Model Predictions](https://arxiv.org/abs/1705.07874)** (Lundberg & Lee, NeurIPS 2017) — the SHAP paper. The paper here only uses LIME, but pointing SHAP at the same surrogate would give Shapley-consistent attributions, which is a natural follow-up.
- **[Silhouettes: a graphical aid to the interpretation and validation of cluster analysis](https://doi.org/10.1016/0377-0427(87)90125-7)** (Rousseeuw, 1987) — the silhouette score original. Standard companion to elbow when choosing K.
- **[Some Methods for Classification and Analysis of Multivariate Observations](https://projecteuclid.org/ebooks/berkeley-symposium-on-mathematical-statistics-and-probability/Proceedings-of-the-Fifth-Berkeley-Symposium-on-Mathematical-Statistics-and/chapter/Some-methods-for-classification-and-analysis-of-multivariate-observations/bsmsp/1200512992)** (MacQueen, 1967) — the 1967 K-means original. The standard reference alongside Lloyd (1957).
- **[Big data analytics and firm performance: Effects of dynamic capabilities](https://doi.org/10.1016/j.jbusres.2016.08.009)** (Wamba et al., 2017) — the macro counterpart. Empirical SEM linking analytics capability to firm performance via process-oriented dynamic capabilities.
- **[Artificial intelligence in customer relationship management: A systematic framework for a successful integration](https://doi.org/10.1016/j.jbusres.2025.115531)** (Ledro et al., 2025) — frames AI-CRM *adoption* as a six-stage process. See [paper 0005](/en/papers/0005-artificial-intelligence-in-customer-relationship-management/) for the full review.
- **[Unlocking the power of AI in CRM: A comprehensive multidimensional exploration](https://doi.org/10.1016/j.jik.2025.100731)** (Alnofeli et al., 2025) — qualitative AI-CRM capability framework, 3 dimensions × 8 sub-dimensions. See [paper 0007](/en/papers/0007-unlocking-power-of-ai-in-crm/). Useful for mapping single-algorithm applied work like this one onto an organisational capability category.
- **[The relevance of lead prioritization: a B2B lead scoring model based on machine learning](https://doi.org/10.3389/frai.2025.1554325)** (González-Flores et al., 2025) — a sibling case study from B2B lead scoring. See [paper 0006](/en/papers/0006-b2b-lead-scoring-with-machine-learning/). Useful contrast between clustering and classification/ranking framings of the same business question.

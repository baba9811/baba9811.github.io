---
layout: post
title: "[Paper Review] The relevance of lead prioritization: a B2B lead scoring model based on machine learning"
date: 2026-05-06 10:00:00 +0900
description: "A B2B software SME's four-year CRM dataset benchmarked across 15 classifiers via PyCaret — Gradient Boosting wins (98.39% accuracy, AUC 0.9891). Lead Source / Reason for State / Lead Classification dominate feature importance."
tags: [b2b, lead-scoring, marketing, gradient-boosting, machine-learning, crm]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig3-pipeline.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0006-b2b-lead-scoring-with-machine-learning/
ko_url: /papers/0006-b2b-lead-scoring-with-machine-learning/
---

{% include lang_toggle.html %}

## Bibliographic info

| Field | Value |
|-------|-------|
| Authors | Laura González-Flores, Guillermo Sosa-Gómez (Universidad Panamericana, Mexico) · Jessica Rubiano-Moreno (Universidad de Ciencias Aplicadas y Ambientales, Colombia) |
| Venue | *Frontiers in Artificial Intelligence* 8, Article 1554325 · 2025 (open access, CC BY) |
| DOI | [10.3389/frai.2025.1554325](https://doi.org/10.3389/frai.2025.1554325) |
| Data | Microsoft Dynamics CRM, 2020-01 – 2024-04, 23,154 records × 67 fields → 16,600 × 22 |
| Review date | 2026-05-06 |

## TL;DR

- An applied study on a real B2B SME's CRM data — **15 classification algorithms benchmarked side-by-side using PyCaret** on four years and four months of operational data. The fact that this is one company's actual records (not a public benchmark) is what gives it texture.
- **The Gradient Boosting Classifier wins decisively**: Accuracy 0.9839, AUC 0.9891, Recall 0.9586, Precision 0.9106, F1 0.9338, Kappa 0.9247, MCC 0.9252. LightGBM, XGBoost, and Logistic Regression cluster just behind. The KS statistic of 0.953 at threshold 0.279 says the two classes are nearly fully separable.
- The top three features are **Lead Source, Reason for State, Lead Classification** — i.e. *where the lead came from, why its status is what it is, and what label the sales rep assigned*. Behavioral signals (response counts, level of interest, email engagement) sit well below these meta-data fields. That's a counterintuitive finding worth chewing on.
- With 88:12 class imbalance, the authors tried **SMOTE and found it hurt** AUC-PR / F1, so they kept the imbalance and tuned the decision threshold instead. This is the most actionable practitioner takeaway.
- Caveats: a single company in a single industry (product-design software), and a 3-month average sales cycle means the *actual revenue impact* of the new scores is still being validated.

## Introduction

B2B sales typically follow a seven-stage consultative model (Moncrief & Marshall, 2005): Lead Prospecting → Lead Qualification → Validation/Demonstration → Proposal/Quote → Negotiation → Closed Sale. Lead qualification — the second stage — sits exactly on the marketing/sales boundary. Mishandle it and your sales reps spend their week chasing cold leads (D'Haen et al., 2013; Sabnis et al., 2013). Since each rep has a finite capacity for outbound calls, the question of *which lead to call first* essentially decides conversion rate and revenue.

Traditional lead scoring is a hand-built rubric. "+30 for a quote request, +35 for a CTA click, +10 for an interaction in the past week..." It's reasonable on day one, but as the data distribution drifts the static rubric falls behind (Nygård and Mezei, 2020). Machine-learning scoring instead learns the score from historical conversion data. The question this paper asks is concrete: **on a real four-year CRM dump from one B2B company, which supervised classifier works best, and which features explain conversion?**

Two reasons this paper is worth reading right now. First, **published applied B2B lead-scoring case studies remain rare.** Wu et al. (2024b) systematically reviewed 44 lead-scoring studies between 2005 and 2022 — a tiny corpus for a problem this commercially important, and B2B single-company case studies are scarcer still. Second, **the methodology is highly reproducible.** PyCaret to compare 15 algorithms in one shot → 10-fold CV on the top four → threshold tuning via KS statistic → feature importance. You can lift this recipe and run it on your own CRM in an afternoon.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig2-sales-process.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: The case-study company's six-stage sales process. ML lead scoring is a tool to make stage two (Lead Qualification) more efficient."
   zoomable=true %}

## Key contributions

- **A 15-classifier benchmark on real operational CRM data.** Naive Bayes, Logistic Regression, AdaBoost, Random Forest, Gradient Boosting Classifier, XGBoost, LightGBM, QDA, LDA, Decision Tree, k-NN, Extra Trees, Dummy, Ridge, SVM (linear) — all evaluated in a single PyCaret `compare_models` call. Gradient Boosting tops the table, but the paper is honest about LightGBM (0.393 s) and XGBoost (0.191 s) running in *less than half the time* of GBM (0.903 s) for nearly identical metrics.
- **A counterintuitive feature-importance result.** Marketing-automation literature usually celebrates behavioral signals (time on site, downloads, email opens). On this company's data, the top three features are *Lead Source* (which channel), *Reason for State* (why the current status was assigned), and *Lead Classification* (the rep's pre-existing label). *Number of Responses* is fifth and *Level of Interest* is seventh. Channel, segmentation, and the rep's intuitive classification carry more information here than behavior.
- **Empirical evidence that SMOTE isn't a default.** In a strong 88:12 imbalance, the authors tried Synthetic Minority Oversampling and saw AUC-ROC, PR-AUC, and F1 *drop*. They kept the imbalance and tuned the threshold (0.279 from the KS statistic) instead. That's a useful counterexample to the "imbalance → SMOTE" reflex that's hardened into common practice.
- **Stitching consumer-behavior theory onto ML.** The academic framing the authors emphasize: classical consumer-behavior models from the 1960-70s (EBK, Howard-Sheth) tell you *which variables to measure*; ML weights them automatically. The argument is that this division of labor gives the variable selection a domain-grounded justification that pure black-box ML lacks.

## Related work and background

### Traditional lead scoring

A traditional lead-scoring rubric is a hand-tuned scorecard authored by the marketing team. The case-study company's actual rubric (Table 1) — *Use of CTA* 35 pts, *Request for a quote* 30 pts, *Number of interactions with company (touches)* 20 pts, *Other interactions* 15 pts, *Email response* 10 pts, *Webinars / Workshops* 5 pts each — leans heavily on behavioral signals, with no input from the rep's own status flags. The static scorecard makes sense at the moment of authoring, but its weights stop matching the data as the funnel evolves (D'Haen et al., 2013).

### Predictive lead scoring — prior work

- **Espadinha-Cruz et al. (2021)**: Data-mining-based conversion prediction on a Portuguese telecom CRM. The most-cited predecessor in this paper.
- **Eitle and Buxmann (2019)**: Business-analytics-plus-ML for IT sales pipelines. Reports CatBoost and Random Forest doing well on categorical big data.
- **Mortensen et al. (2019)**: Binomial logit, decision tree, and random forest comparison on a paper-and-packaging firm.
- **Nygård and Mezei (2020)**: Random Forest as an automation replacement for manual scoring.
- **Jadli et al. (2022, 2023)**: AI-based scoring outperforms traditional methods at high-quality lead identification.
- **Wu et al. (2024b)**: Systematic review across 44 studies (2005-2022). ML-based lead scoring consistently improves conversion and reduces cost.

### Consumer behavior theory

The authors stitch the ML pipeline to classical consumer-behavior theory (Solomon et al., 2012; Kotler et al., 2015). The decision process is modeled as Problem recognition → Information search → Evaluation of alternatives → Purchase decision → Post-purchase behavior (Kotler) or Awareness → Interest → Evaluation → Trial → Adoption (Armstrong, 2009). Different stages call for different signals, so the variable pool should mix *behavioral* (web activity) with *demographic* (industry, role, geography). It's primarily a justification for keeping a wide-net feature set rather than a constraint that drives modeling choices.

## Method and architecture

The whole pipeline fits in Figure 3: Raw data → EDA → Preprocessing → Train/Validation/Test split → 15-classifier comparison → Best-model selection → Evaluation (Confusion matrix, ROC, KS, learning/validation curves).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig3-pipeline.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: The supervised lead-scoring pipeline. Stock PyCaret workflow — data splitting, compare_models, tune_model, evaluate."
   zoomable=true %}

### Data source and collection

- Subject company: a **B2B SME selling product-design and manufacturing software**. Anonymized, but the authors' affiliations place it in Mexico.
- CRM: **Microsoft Dynamics**.
- Window: 2020-01 through 2024-04 — four years and four months.
- Raw: **23,154 records × 67 fields** including lead ID, classification, source of origin, contact, telephone, email, status, state, reason for status, last-activity date.
- Data dictionary: Supplementary Appendix 5.

### Exploratory analysis and outliers

Tukey's rule ($Q_1 - 1.5 \times IQR$, $Q_3 + 1.5 \times IQR$) gives a per-variable outlier rate (Table 2):

| Variable | Outlier rate | Action |
|----------|---|---|
| Title (Primary Contact for Lead) | 18.80% | High — flagged for data-quality review. **Variable retained** (marketing-critical). |
| Lead Source | 13.26% | Moderate |
| Qualified Opportunity (target) | 11.84% | Moderate (this *is* the imbalance) |
| Prospected by Marketing | 6.10% | Moderate |
| # of Responses | 5.01% | Manageable |
| Product | 4.95% | Manageable |

The 18.80% on *Title* comes from a free-text field with high variation. Even so the field is retained, since it identifies the main contact for marketing.

### Correlation structure

The correlation matrix on twelve numerical variables (Figure 4) surfaces several non-trivial relationships:

- **Account Type ↔ Lead Source = 0.55** and **Product ↔ Account Type = 0.56**: the type of business account strongly determines both how it was acquired and which product it cares about.
- **Lead Classification ↔ Lead Source = 0.41**: the rep's pre-existing label aligns roughly with the channel.
- **Reason for Status ↔ Qualified Opportunity = −0.50**: certain *reason codes* (e.g., "lost — no budget", "lost — timing") strongly push leads away from sales-qualified.
- **Sector (Industry) ↔ Reason for Status = −0.50**: certain industries cluster around particular reason codes — sector-level differences in sales patterns.

A −0.50 correlation isn't weak, and the pattern lines up with the later finding that Lead Source, Reason for State, and Lead Classification dominate feature importance.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig4-correlation-matrix.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Numerical-variable correlation matrix. Account Type ↔ Lead Source / Product, Reason for Status ↔ Qualified Opportunity (-0.50), and Sector ↔ Reason for Status (-0.50) stand out."
   zoomable=true %}

### Class imbalance

The target *Qualified Opportunity* is binary: 1 = qualified, 0 = unqualified. The split is roughly 14,600 (class 0) versus 2,000 (class 1) — about 88:12. The authors tried SMOTE but saw AUC-ROC, PR-AUC, and F1 *worsen*, so they kept the imbalance. They report accuracy alongside AUC, F1, MCC, and Cohen's Kappa, and set the decision threshold to 0.279 using the KS statistic.

### Cleaning and categorical encoding

Cleaning was done via PyCaret (missing values, duplicates, consistency). Some columns were dropped because they were *partial columns* — created at different points in time, so only some records carried values. Final shape: **16,600 records × 22 fields**.

Categorical encoding:

- *Level of interest* (4 categories): label-encoded with the higher-interest class getting the larger value.
- *Purchase period* (immediate → 3 months): ordinal scale 1-5, with 1 being most imminent.
- *Status* (open / won / lost): converted to bilevel.
- Other text fields: bilevel or one-hot.

### Train/validation/test split

- 70 / 30 train-test split.
- The 70% training partition is further split into 10 folds for cross-validation.
- The 30% test set is held out for final evaluation only.

### The 15 classifiers

Compared in one PyCaret pass:

```
Naive Bayes, Logistic Regression, AdaBoost, Random Forest,
Gradient Boosting Classifier, XGBoost, LightGBM,
Quadratic / Linear Discriminant Analysis,
Decision Tree, K-Nearest Neighbors, Extra Trees,
Dummy Classifier, Ridge Classifier, SVM (linear kernel)
```

The Dummy Classifier (predicting the majority class) anchors the baseline at accuracy 0.8816.

## Training objective and loss

The final model is sklearn's `GradientBoostingClassifier`. For binary classification the loss is the logistic (log-likelihood) loss:

$$
\mathcal{L}(y, F(x)) = \log\left(1 + \exp(-2 y F(x))\right), \quad y \in \{-1, +1\}
$$

where $F(x)$ is the cumulative boosted prediction (real-valued). Class probability is $p(y=1 \mid x) = \sigma(2 F(x))$ with $\sigma$ the sigmoid. Gradient boosting iteratively fits a regression tree to the negative gradient (pseudo-residual) of the loss:

$$
F_m(x) = F_{m-1}(x) + \nu \cdot h_m(x), \quad h_m \approx -\nabla_F \mathcal{L}
$$

with $\nu$ the learning rate (0.1 here), $h_m$ a depth-3 regression tree, and 100 boosting stages. The split criterion is sklearn's `friedman_mse`. The full hyperparameter set the authors report (Figure 10):

```text
GradientBoostingClassifier(
  ccp_alpha=0.0, criterion='friedman_mse',
  learning_rate=0.1, loss='log_loss',
  max_depth=3, max_features=None, max_leaf_nodes=None,
  min_impurity_decrease=0.0, min_samples_leaf=1, min_samples_split=2,
  min_weight_fraction_leaf=0.0,
  n_estimators=100, n_iter_no_change=None,
  random_state=123, subsample=1.0,
  tol=0.0001, validation_fraction=0.1,
  verbose=0, warm_start=False
)
```

What's striking is how close to default this is. Boilerplate GBM essentially saturates this dataset.

## Training data and pipeline

| Item | Value |
|------|---|
| CRM | Microsoft Dynamics |
| Window | 2020-01 – 2024-04 (49 months) |
| Raw records / fields | 23,154 / 67 |
| Cleaned records / fields | 16,600 / 22 |
| Train / Test split | 70 / 30 |
| Train CV | 10-fold |
| Target | `Qualified Opportunity` (binary) |
| Class ratio (negative : positive) | ≈ 88 : 12 |
| # of algorithms compared | 15 |
| Tooling | PyCaret (data prep, model comparison, tuning) |

## Experimental results

### The 15-classifier scoreboard

Table 3 (paper) sorted by accuracy:

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/tab3-evaluation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: Evaluation across 15 classifiers. Gradient Boosting tops at Accuracy 0.9839 / AUC 0.9891. The Dummy Classifier (predict-majority baseline) sits at 0.8816."
   zoomable=true %}

Observations:

- **The boosting family sweeps the top.** GBM (0.9839) > LightGBM (0.9835) > XGBoost (0.9821) > Logistic Regression (0.9818). Differences are small but consistent.
- **AdaBoost ties GBM on AUC** at 0.9891 — but it falls behind on F1, recall, and MCC.
- **Ridge classifier is interesting**: it's first in *precision* (0.9605) but recall is just 0.1759. "When it says yes it's right, but it misses most positives." That's an attractive profile if false-positive cost is high (e.g., auto-routing leads to sales reps).
- **Naive Bayes / QDA** sit at 0.88-0.89 accuracy — basically tied with the dummy. The Gaussian-with-independent-features assumption breaks here.

### Top-4 cross-validation

10-fold CV averages (Table 4):

| Model | Acc | AUC | Recall | Prec | F1 | Kappa | MCC | TT (s) |
|------|------|------|--------|------|------|-------|------|------|
| **Gradient Boosting** | **0.9839** | **0.9891** | **0.9586** | 0.9106 | **0.9338** | **0.9247** | **0.9252** | 0.903 |
| LightGBM | 0.9835 | 0.9885 | 0.9535 | 0.9112 | 0.9318 | 0.9224 | 0.9228 | 0.393 |
| XGBoost | 0.9821 | 0.9872 | 0.936 | **0.9149** | 0.9252 | 0.915 | 0.9152 | 0.191 |
| Logistic Regression | 0.9818 | 0.9775 | 0.9462 | 0.9047 | 0.9248 | 0.9144 | 0.9148 | 0.247 |

Note the wall-clock numbers: XGBoost (0.191 s) and LightGBM (0.393 s) train two-to-five-times faster than GBM (0.903 s). If you need to retrain frequently in production, LightGBM is probably the more sensible choice.

### ROC curves

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig6-roc-curve.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: ROC curves for the top four. GBM/LightGBM/XGBoost overlap almost completely at AUC 0.99; Logistic Regression (AUC 0.98) lags slightly near the top-left corner."
   zoomable=true %}

The three boosting curves overlap to the eye. Logistic regression isn't far behind at AUC 0.98 — if interpretability matters, it's already production-ready.

### Confusion matrices

On the 4,980-record holdout (4,391 negative + 589 positive), Figure 8. Rows are true, columns predicted.

| Model | TN | FP | FN | TP | Recall | Precision |
|------|----|----|----|----|--------|-----------|
| GBM | 4334 | 57 | 28 | 561 | 561/589 = 0.953 | 561/618 = 0.908 |
| LightGBM | 4337 | 54 | 34 | 555 | 0.942 | 0.911 |
| XGBoost | 4336 | 55 | 40 | 549 | 0.932 | 0.909 |
| Logistic Regression | 4330 | 61 | 38 | 551 | 0.935 | 0.900 |

GBM has the fewest false negatives (missed qualified leads): just 28. False-positive counts cluster between 54 and 61 across all four models.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig8-confusion.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: Confusion matrices for the four classifiers. GBM (a) has the lowest false-negative count at 28 and a comfortable 57 false positives."
   zoomable=true %}

### Feature importance

Gradient Boosting's split-based feature importance (Figure 13):

1. **Lead Source** — ~700 (rank 1)
2. **Reason for State** — ~540
3. **Lead Classification** — ~510
4. **Product** — ~290
5. **# of Responses** — ~270
6. **Account Type** — ~180
7. **Level of Interest** — ~150
8. **Won Opportunity** (a possible leakage flag — see limitations)
9. **Prospected by Marketing** — ~70
10. **Email** — ~60
11. *Do not allow mass E-mail / Do not allow Phone Call / Is he the decision maker / Sales Stage / Talk to General Director / Marketing Material / Do not allow E-mail / Work Phone / Do not allow Faxes* — essentially zero

The first five features carry most of the importance. The boolean opt-out fields (do-not-allow X) sit near zero, which is interesting in itself: *contactability flags* don't carry conversion signal in this CRM. Marketing-automation tools that include opt-out fields in their default scoring weights are pulling on a string with no information at the other end.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig13-feature-importance.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 13: Gradient Boosting feature importance. Lead Source / Reason for State / Lead Classification dominate."
   zoomable=true %}

### KS statistic

The Kolmogorov–Smirnov statistic measures the maximum gap between the cumulative score distributions of the two classes — a direct measure of separability for a binary classifier. **0.953 at threshold 0.279.** A KS that high indicates near-complete separation. The threshold is well below the default 0.5; it's been pulled toward the positive class to compensate for the imbalance.

## Analysis and ablations

There's no formal ablation table, but the following observations function like one.

- **Linear models are already strong.** Logistic regression alone hits AUC 0.9775 and MCC 0.9148. The decision boundary is roughly linear, and boosting's nonlinear flexibility buys ~0.5-1.0 percentage points. In a marketing setting where interpretability matters, plain logistic regression isn't really a downgrade.
- **Ridge classifier's high-precision regime.** Recall 0.1759 with precision 0.9605. For a "must-not-mis-call" hot-lead routing setup (e.g., immediate enterprise-account escalation), Ridge could beat GBM in operational terms even though it loses on aggregate metrics.
- **Tree depth shows clear overfitting (Figure 12, paper text).** Sweeping max_depth from 1 to 10 monotonically increases training score (0.982 → 0.995), but cross-validation peaks at depth 2-3 (0.9842) and *decreases* by depth 10 (0.9799). PyCaret's default depth of 3 turns out to be the sweet spot. Tabular data here behaves the way it usually does: shallow trees generalize better.
- **SMOTE didn't help.** Probably the most actionable single observation in the paper. With strong imbalance and a reasonably large dataset (16,600 records), SMOTE is *not* automatic. Evaluated on AUC-PR and F1, plain imbalance beat SMOTE.

## Limitations and critical evaluation

What the authors acknowledge:

- One company, one industry (product-design software). External validity is a real question.
- A 3-month average sales cycle means the closed-loop validation — does the predicted score translate into closed-won deals? — is still in progress.

What I'd add as a reviewer:

- **Possible feature leakage.** *Won Opportunity* shows up at rank 8 in feature importance. *Won Opportunity* is, by definition, an event that occurs *after* qualification (won = qualified → close). If won-opportunity information leaked into the training inputs, the model is partially seeing the answer. The paper treats both *Qualified Opportunity* and *Won Opportunity* as outcome-adjacent variables but isn't explicit about a time-aware split (snapshot date < event date). Without that, a random train/test split on a cross-section can leak future information.
- **0.98 accuracy is suspiciously high.** With an 88:12 imbalance, the dummy classifier is at 0.8816. Boosting reaches 0.9839 — only 10 points above. Combined with the fact that the target was *manually entered* by sales reps, the model is plausibly memorizing rep behavior rather than predicting independent ground truth. "ML beats sales reps" and "ML automates the rep's decision pattern" produce the same numbers but mean very different things.
- **Missing baseline comparison.** The headline claim — "ML beats traditional manual scoring" — would be strongest if the paper compared the company's *existing manual score* and the ML score head-to-head on the same holdout. That table isn't in the paper. Without it, the 98.39% accuracy is impressive but not directly comparable to the status quo it replaces.
- **Generalization beyond one channel mix.** The "Lead Source is rank 1" finding only generalizes if a company runs a comparable channel portfolio (Google Ads, LinkedIn, referrals, etc.). For a single-channel outbound shop, that variable is essentially constant and carries no signal.

## Takeaways

- **PyCaret + a 15-classifier sweep is a sane B2B baseline.** Two-to-three hours on your own CRM and you have a comparison table. Boosting (GBM, LightGBM, XGBoost) typically owns the top three slots — that pattern shows up across this paper and several adjacent applied studies.
- **Imbalance plus large data ≠ SMOTE by default.** Compare on AUC-PR and F1 first. This paper is one of the explicit sources to cite when arguing against the reflex.
- **CRM lead scoring's top features may be metadata, not behavior.** Rep-entered status fields and channel labels can outweigh click and email signals. That contradicts the default weights vendors ship with — measure on your own data.
- **Boosting tree depth wants to be small.** A depth-3 GBM beats a depth-10 GBM in cross-validation here. Tabular data usually rewards shallow trees; bumping past sklearn-3 / XGBoost-6 defaults usually costs you.
- **An accuracy of 0.98 is the moment to suspect target leakage** — especially when the target is a manual label.

## References

- Paper: <https://www.frontiersin.org/articles/10.3389/frai.2025.1554325/full>
- DOI: [10.3389/frai.2025.1554325](https://doi.org/10.3389/frai.2025.1554325)
- Code: not released (case-study data is private to the subject company)
- Tooling: [PyCaret](https://pycaret.org/) — a low-code AutoML library

## Further reading

- **[Lead Management Optimization Using Data Mining: A Case in the Telecommunications Sector](https://doi.org/10.1016/j.cie.2021.107122)** (Espadinha-Cruz et al., 2021) — Conversion prediction on a Portuguese telecom CRM. The most-cited predecessor in this paper.
- **[The State of Lead Scoring Models and Their Impact on Sales Performance](https://doi.org/10.1007/s10799-023-00388-w)** (Wu et al., 2024) — A 2005-2022 systematic review of 44 studies. ML-based models consistently outperform traditional ones.
- **[Toward a Smart Lead Scoring System Using Machine Learning](https://doi.org/10.21817/indjcse/2022/v13i2/221302098)** (Jadli et al., 2022) — Demographic + behavioral feature mix; Random Forest leads on accuracy.
- **[XGBoost: A Scalable Tree Boosting System](https://arxiv.org/abs/1603.02754)** (Chen and Guestrin, KDD 2016) — The standard reference for modern gradient boosting; one of the top three models in this paper too.
- **[LightGBM: A Highly Efficient Gradient Boosting Decision Tree](https://papers.nips.cc/paper/6907-lightgbm-a-highly-efficient-gradient-boosting-decision-tree)** (Ke et al., NeurIPS 2017) — Leaf-wise growth and histogram binning to cut training time substantially. In this paper LightGBM is 0.4 s vs GBM's 0.9 s.
- **[SMOTE: Synthetic Minority Over-sampling Technique](https://arxiv.org/abs/1106.1813)** (Chawla et al., 2002) — The classical reference for class imbalance. This paper provides a concrete case where SMOTE *doesn't* help.

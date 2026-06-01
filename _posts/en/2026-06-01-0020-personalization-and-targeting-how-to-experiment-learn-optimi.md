---
layout: post
title: "[Paper Review] Personalization and targeting: how to experiment, learn & optimize"
date: 2026-06-01 14:00:00 +0900
description: "An IJRM review that formalizes personalization as a causal-inference problem and walks through the test-and-learn cycle for experimenting, learning, and optimizing"
tags: ["personalization", "causal-inference", "machine-learning", "marketing", "targeting", "experimentation"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0020-personalization-and-targeting-how-to-experiment-learn-optimi/fig1-test-and-learn.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0020-personalization-and-targeting-how-to-experiment-learn-optimi/
ko_url: /papers/0020-personalization-and-targeting-how-to-experiment-learn-optimi/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Aurélie Lemmens et al. (10 co-authors across Erasmus · Harvard · Columbia and 7 US/EU institutions) |
| Venue | International Journal of Research in Marketing · 2025 · (open access, CC BY) |
| arXiv 또는 DOI | [10.1016/j.ijresmar.2025.07.004](https://doi.org/10.1016/j.ijresmar.2025.07.004) |
| Code | [sbstn-gbl/cs23-personalization](https://github.com/sbstn-gbl/cs23-personalization) |
| <span style="white-space: nowrap">Review date</span> | 2026-06-01 |

#### TL;DR

- This review formalizes **personalization** as a *causal-inference problem* — choosing an action $W\_i$ for each customer $i$ — and embeds it inside a **test-and-learn** cycle: Design → Test → Learn → Optimize & Evaluate.
- The engine is the **conditional average treatment effect (CATE)**. Estimate the treatment effect conditional on customer features $X\_i$, and you can derive each customer's optimal action under the policy $p^*$. Estimators range from causal forests to double/debiased ML to S/T/X-learners.
- The authors map out four challenge domains — (1) predicting responses with limited data, (2) identifying causality amid many factors, (3) evaluating policies against business objectives, and (4) ethical and responsible personalization — and survey state-of-the-art solutions for cold-start, privacy, fairness, long-term effects, and spillovers.
- The closing line captures the thesis: **"Personalization is the fifth P."** After product, price, place, and promotion, personalization has been elevated to a constituent of marketing itself.

#### Introduction

Personalization has become the heartbeat of modern marketing. Seventeen years ago, Arora et al. (2008) introduced "personalization" as an emerging concept, defining it as "the process by which the firm decides, usually based on previously collected customer data, what marketing mix is suitable for the individual." Personalization, in other words, means tailoring firm decisions to individual customers or groups based on observed characteristics, rather than applying a uniform policy to the entire customer base. (The paper uses **targeting** in the specific sense of "targeting an individual with a personalized offer.")

Since Arora et al. (2008), the landscape has been transformed — by new data sources (social, mobile), technological leaps (cloud, SaaS, generative AI), methodological advances (causal inference and ML), new channels (mobile marketing), and the rise of societal considerations such as fairness and privacy. All of these disruptions call for a fresh perspective on personalization.

The paper has two goals. First, to provide a framework that formalizes personalization through the lens of causal inference, describing how "test and learn" emerged as a recognized approach. Second, to explore the key challenges that arise when personalization is approached this way — estimating heterogeneous treatment effects in the presence of markets, platforms, regulations, and ethics. If you know ML and marketing broadly but the intersection — "causal-inference-based personalization" — is new to you, this article is meant to map the whole terrain in one read.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0020-personalization-and-targeting-how-to-experiment-learn-optimi/tab1-lifecycle-examples.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Examples of personalized marketing across the customer lifecycle (acquisition / development / retention) and channel (offline / online) — from BMW's personalized direct mail to Spotify's AI-curated playlists."
   zoomable=true %}

Today, personalization shapes every stage of the customer lifecycle (Table 1). In **acquisition**, BMW invites prospects to test drives via personalized direct mail and Nike serves ads tailored to browsing history and location. In **development**, Nordstrom's in-store stylists recommend based on purchase history and Netflix serves dynamic previews (sizzles) tuned to viewing history. In **retention**, the Ritz-Carlton remembers repeat guests' preferences and Spotify keeps subscribers engaged with taste-matched playlists.

#### Key Contributions

- **Formalizing personalization as causal inference.** The problem of choosing an action $W\_i$ for each individual is cast in the language of potential outcomes, CATEs, and value functions, with the optimal policy $p^*$ defined explicitly.
- **Structuring test-and-learn into four actionable stages.** Design → Test → Learn → Optimize & Evaluate is followed end-to-end through a food-delivery coupon example, making explicit where causal assumptions — SUTVA, unconfoundedness, overlap — enter.
- **Mapping the four challenge domains.** Limited data, causal identification, policy evaluation, and ethics — each with its concrete problems (cold-start, spillover, non-compliance, long-term effects, fairness, privacy, explainability) and current solutions (Table 3).
- **Charting future directions.** GenericML, direct policy learning, foundation models, and generative AI, each paired with concrete research questions.

This is not a paper proposing a new method; it is an **academic overview**, aligned with the 2024 MSI Research Priorities, of where personalization research stands and where it is heading. From a reviewer's standpoint, its biggest value is in threading the scattered tools of causal inference and causal ML onto a single practical loop — test and learn.

#### Background

Before the formalization, the paper lays out three technological foundations that made personalization possible.

**(1) Access to individual-level data.** Firms now track website visits, in-store purchases, call-center engagements, even complaints. Snapchat blends Snap Map location, Discover browsing, and filter/lens engagement; Allstate uses Life360 and GasBuddy driving data to tailor insurance rates to individual driving patterns. IoT devices (Alexa, Samba TV's smart-TV viewing data) push granularity even higher. GDPR and CCPA, however, are starting to constrain this collection.

**(2) Personalized communication channels.** Unlike one-way mass media (billboards, TV), today's platforms enable personalized interactions. Mobile in particular delivers **hyper-contextual** signals — location, time, environment, even whether the consumer is with others — through GPS, accelerometers, and gyroscopes, enabling **hyper-personalization**. Burger King's "Whopper Detour" geo-targeted promotions to customers near McDonald's.

**(3) Continuous experimentation and prediction.** Amazon, Booking.com, and Google have baked experimentation into their cultures. In Arora et al. (2008)'s era, heterogeneity was usually modeled with random-coefficients approaches (Rossi et al. 1996's multinomial brand choice, Ansari & Mela 2003's email click prediction); today causal ML and double/debiased ML (Chernozhukov et al. 2018) estimate treatment effects from high-dimensional observational or experimental data.

In marketing research, personalization decomposes into four decisions — **whom, what, when, where** (Ascarza 2018; Tong et al. 2020). On *whom*, for instance, Ascarza (2018) and Lemmens & Gupta (2020) show you should target customers with high expected (profit) lift, not high churn risk; Blake et al. (2015) find paid search ads work for new and infrequent users but are wasted on loyal ones; Sahni et al. (2017) find discounts are more effective for dormant customers; von Zahn et al. (2024) warn that green nudges can even backfire.

#### Method / Architecture

This is the formal heart of the paper. Let's follow the notation that casts personalization as causal inference.

### Actions, potential outcomes, and policies

Personalization means selecting an **action** (treatment, intervention) $W\_i$ for each individual $i = 1, \ldots, N$, expected to causally affect an outcome of interest $Y\_i$. In coupon personalization, the firm offers different discount levels based on a customer's predicted redemption rate or net margin. The action $W\_i = w$ is chosen from a predefined set $\mathcal{W}$ based on the individual's feature vector $X\_i$ (demographics, past behavior, and any other relevant characteristics).

Each action $w$ has a **potential outcome** $Y\_i(w)$ — the value $Y\_i$ would take if $W\_i$ were set to $w$. Formally, a **personalized policy** $p$ is a mapping from the firm's current state of information $X \in \mathcal{X}$ to the set of actions:

$$
p : \mathcal{X} \rightarrow \mathcal{W}.
$$

The policy that maximizes the relevant objective (conditional on $X$) is **optimal**, denoted $p^*$. The effectiveness of personalization depends on the degree of **heterogeneity** in individuals' responses and on the firm's ability to identify it. If everyone responds identically, there is nothing to personalize.

### CATE — the engine of personalization

The standard approach to determining a personalized policy relies on estimating **conditional average treatment effects (CATEs)**. The CATE of action $W\_i = w$ for an individual characterized by $X\_i = x$ is:

$$
\tau_w(x) = \mathbb{E}\big[\,Y(w) - Y(w_0) \mid X_i = x\,\big].
$$

Here $w\_0$ is the **baseline action** (status quo, "business as usual"). In the coupon example, $w\_0$ is "send no coupon," so the CATE represents the difference in expected outcomes when a customer receives discount $W\_i = w$ versus none.

The total expected value (return) of a policy $p$ is a **value function** summing CATEs across all individuals at the action $W\_i$ the policy assigns:

$$
R(p) = \sum_{i=1}^{N} \tau_{p_i}(X_i = x),
$$

where $p\_i$ is the action $W\_i$ assigned to individual $i$ under policy $p$. The optimal policy maximizes this value:

$$
p^* = \arg\max_p R(p).
$$

Note that $R(p)$ must also incorporate the expected **cost** of executing the policy. Costs attributable to a specific action $W\_i = w$ can be folded directly into $\tau\_w(x)$, while more complex cost structures may be included separately in $R(p)$.

### The test-and-learn cycle

{% include figure.liquid loading="eager"
   path="assets/img/papers/0020-personalization-and-targeting-how-to-experiment-learn-optimi/fig1-test-and-learn.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: The test-and-learn cycle. Design (define the problem) → Test (run the experiment) → Learn (infer heterogeneous treatment effects) → Optimize & Evaluate (determine the optimal personalized policy). The information gained in each cycle becomes part of X in the next."
   zoomable=true %}

A typical test-and-learn cycle has four stages (Figure 1). The paper carries a **food-delivery service optimizing revenue through coupon promotions** through the entire cycle. Discount levels are $W\_i \in \{0\%, 5\%, 10\%, 15\%\}$ with $W\_i = 0\%$ as the "no discount" baseline, and the outcome $Y\_i$ is the total margin per customer net of the discount.

**1. Design.** Identify the relevant population, personalization decisions, outcome, value function, and business rules. Here the population is all app users; the firm sends notifications to a *random* subsample twice a day (11 a.m. and 5 p.m.) such that after three weeks every customer has been notified exactly once. To sharpen CATE estimates, **stratified sampling** divides customers into discrete subgroups (strata) by $X\_i$ and randomizes $W\_i$ within each stratum.

Design must anticipate the causal assumptions later stages rely on. Three are central:

- **SUTVA (stable unit treatment value assumption):** an individual's potential outcome is unaffected by treatments assigned to others. In the example, SUTVA requires that a customer's discount be unaffected by their spouse's — so the randomization is constrained so that members of the same household never receive discounts within a week of each other.
- **Unconfoundedness:** treatment assignment $W\_i$ is independent of potential outcomes (conditional on covariates $X\_i$). This lets us attribute observed outcome differences to the action $W\_i$ rather than to pre-existing customer heterogeneity.
- **Overlap:** every individual has a non-zero probability of receiving each possible treatment. If some group never receives a given discount, its CATE cannot be estimated.

**2. Test.** Actually randomize $W\_i$ in the designed population. Before the real experiment, run an **A/A test** (placebo) — replace all assigned treatments with the same level (e.g., $W\_i = 0\%$) and expect no outcome differences; any differences flag randomization errors or software bugs. The example runs four weeks (three weeks of randomized offers plus one week of data collection), with continuous monitoring that notifications are sent correctly.

**3. Learn.** Infer CATEs from the experimental data. The simplest estimator is a difference in means:

$$
\hat{\tau}_w(x) = \hat{Y}_{w,x} - \hat{Y}_{0,x},
$$

where $\hat{Y}\_{w,x}$ is the average outcome among individuals with $X\_i = x$ under treatment $W\_i = w$. Because $W\_i$ is randomized conditional on $X\_i$, the difference of the two averages is a consistent CATE estimator. But when the treated/untreated proportion is extreme or the outcome variance is high, this estimator is noisy. An alternative is the **causal forest** (Athey et al. 2019). Whereas an ordinary random forest grows trees to minimize prediction error for $Y$, a causal forest's individual trees split to *maximize* the variance of estimates of $\tau\_w(x)$, optimizing for CATE prediction. Causal forests achieve $\sqrt{N}$ consistency for CATEs, with asymptotically normal residuals, allowing confidence intervals around the estimates — particularly useful since true treatment effects are never observed.

**4. Optimize & Evaluate.** Use the CATE predictions to derive the policy. Customer $i$ is offered a discount $w$ only if $\hat{\tau}\_w(X\_i) > 0$ — the expected net value to the firm is positive. When several discount levels are profitable, pick the one with the largest estimated CATE. So the optimal policy is $p^*\_i = \arg\max\_w \hat{\tau}\_w(X\_i)$. Notably, **it is extremely common that for the majority of customers $p^*\_i = 0$ — offering no discount is optimal.**

After deriving an optimal policy, it is essential to **evaluate** how well it performs, since estimated effects are only approximations subject to sampling variability, model misspecification, and data limitations. Two approaches:

- **Online (on-policy) evaluation:** implement the new policy $p^*$ and a business-as-usual policy $p^0$ on two randomly selected customer samples and compare profitability (an A/B test). The comparison is **between policies**, not particular treatments.
- **Offline (off-policy) evaluation:** reuse the experimental data that produced the new policy, evaluating it against historical data — using observations whose randomized discount happened to match the optimal one. Because a naive comparison is inefficient, an **inverse propensity weighted (IPW) / Horvitz-Thompson estimator** (Horvitz & Thompson 1952) reweights by the inverse of the treatment probability.

The cycle then repeats: information gained becomes part of $X$ in the next iteration, and the current cycle's $\hat{Y}\_{0,x}(x)$ estimates can feed stratified randomization in the next for greater efficiency.

#### Learning Objective

There is no single loss function here. The learning objective is to **maximize the value function $R(p)$**, whose key building block is the CATE $\tau\_w(x)$. CATE estimation splits into two families.

**Indirect approaches** model the outcome $Y$ as a function of treatment $W$ and covariates $X$ ($Y = \mu(W, X) + \epsilon$), then take CATE as the difference between predicted outcomes at two treatment levels:

- **S-learner** (single learner): treats $W$ like any other covariate and trains one regression $\mu(w, x)$. A drawback: when the treatment effect is weak relative to the outcome-covariate correlation, predicted effects are biased toward zero (Künzel et al. 2019).
- **T-learner** (two learner): trains a separate regression $\mu\_0(x), \mu\_1(x), \ldots$ per (discrete) treatment. This alleviates the S-learner's problem but introduces its own bias when the outcome is nonlinear and sample sizes differ across treatments.

**Direct approaches** target the mismatch head-on — indirect estimators are trained to minimize MSE, but what we actually want is CATE estimation. The causal forest is one direct approach; the **X-learner** (Künzel et al. 2019) is a two-stage estimator. In the first stage, an S- or T-learner estimates $\mu(w, x)$ to generate proxy outcomes $\tilde{\tau}\_i$; in the second, $\tilde{\tau}\_i$ is regressed on $X\_i$. **Cross-fitting** (Chernozhukov et al. 2018; Nie & Wager 2021) splits the sample so no observation is used twice, and the first-stage residuals are reweighted by the inverse propensity score, improving robustness when treatment assignment is imbalanced or the propensity score is known.

#### Data and Pipeline

This is a review, not an empirical study, so there is no dataset or training of its own (the paper's Data availability note reads "No data was used"). Instead, the food-delivery coupon example is implemented as an R/Python code tutorial (the Code link above), making each test-and-learn stage reproducible. The example's experimental design, tabulated:

| Item | Setting |
|------|---------|
| Population | all users of the company's mobile app |
| Treatment (action) | discount coupon $W\_i \in \{0\%, 5\%, 10\%, 15\%\}$, $W\_i = 0\%$ baseline |
| Outcome $Y\_i$ | total margin per customer net of discount (redeemed within 24h of offer) |
| Assignment | strata defined by $X\_i$, randomized within each stratum (stratified) |
| Notification schedule | twice daily (11 a.m. / 5 p.m.); every customer notified once after three weeks |
| Experiment length | 3 weeks randomized + 1 week data collection = 4 weeks |
| Validation | A/A (placebo) test before launch, continuous monitoring during |

#### Experimental Results

Being a review, there are no benchmark tables — but the representative empirical findings it cites are nicely organized by personalization decision (whom/what/when/where).

### Whom to target

The most counterintuitive results live here. Ascarza (2018) and Lemmens & Gupta (2020) show you should target customers with high expected (profit) **lift**, not high churn risk — a high-risk customer who won't change under intervention is worthless to target. Blake et al. (2015) find paid search ads effective only for new and infrequent users, with no need to show them to loyal customers — consistent with Sahni et al. (2017), who find discounts more effective for dormant customers.

### What to offer

Ellickson et al. (2023) estimate the heterogeneous treatment effects of 13 promotional emails and find discounts framed as **clearance events** sharply outperform those tied to particular products. Zantedeschi et al. (2017) show catalogs have longer-lasting effects on purchases than emails.

### When / where

Sahni et al. (2019) study retargeting timing by comparing reactivation up to four weeks after a website visit; Hauser et al. (2014)'s website morphing reveals a trade-off — morphing earlier generates more clicks, morphing later better reveals the customer's latent segment. On location, Molitor et al. (2020) study location-based coupons and Ghose et al. (2013) the effect of store proximity and information recency.

#### Analysis / Ablation

There is no ablation in a review, but Section 6 functions like one — analyzing where personalization breaks down if you remove each challenge.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0020-personalization-and-targeting-how-to-experiment-learn-optimi/tab3-challenges-solutions.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: Personalization challenges and state-of-the-art solutions. (1) Limited data (cold-start, data regulation, CATE estimation), (2) causal identification (spillovers, non-compliance, changing markets), (3) policy evaluation (objective alignment, long-term effects), (4) ethics (fairness, privacy, transparency)."
   zoomable=true %}

**(1) Predicting responses with limited data.** The canonical case is the **cold-start problem** — little or no data on new customers. Padilla & Ascarza (2021)'s First-Impression Model infers latent customer traits from acquisition-moment (first transaction) data; Xu et al. (2023) combine collaborative filtering with multi-armed bandits for new users and items. As data regulation (GDPR, CCPA, CPRA) closes off third-party data, firms shift to **zero-party** (volunteered, as in the Amazon Shopper Panel), **first-party** (collected directly via DTC), and **second-party** (shared between trusted partners, like Albert Heijn × bol.com) data. Converting unstructured text and images into embeddings (Veitch et al. 2020's BERT-based approach) is another emerging direction.

**(2) Identifying causality.** **Spillovers / interference** — SUTVA violations — come first: a friend's churn decision influences an individual's, since customers interact with each other and the environment. Solutions include cluster randomization (Eckles et al. 2017), randomized clustering (Ugander & Yin 2023), and variance-minimization (Candogan et al. 2024). Second is **non-compliance** — not actually receiving the assigned treatment (in paid media, the ad must be shown to be a treatment, but exposure is outside the advertiser's control). Here we use conditional intent-to-treat (ITT), conditional average treatment effect on the treated (CATT), and instrumental variable (IV) approaches. Two-sided non-compliance, as in an encouragement design, generalizes to the conditional local average treatment effect (CLATE) and the marginal treatment effect (MTE; Heckman & Vytlacil 2007). Third is **concept drift** — a mismatch between the experiment's environment and deployment — addressed by adaptive experiments (Yang et al. 2024) and meta-analyses (Gabel et al. 2024; Meager 2019).

**(3) Evaluating policies against business objectives.** The core problem is objective misalignment — recommender systems recommend the highest-utility product rather than the one the customer is most *affected* by. To fix this, **rank-weighted average treatment effect (RATE)** metrics — the Qini coefficient (Radcliffe 2007), AUTOC (Zhao et al. 2013), Yadlowsky et al. (2024) — have been proposed. The problem of **measuring long-term effects** (where a policy's impact materializes only months later) is addressed by **surrogate models** that predict long-term outcomes from short-term proxies (Athey et al. 2019's surrogate index) — but beware the **surrogate paradox**, where surrogate and outcome share an unobserved confounder and the inferred causal direction flips.

**(4) Ethical and responsible personalization.** Personalization inherently differentiates among individuals, raising ethical concerns. Just as Facebook drew criticism for excluding women from certain job ads, when protected attributes (gender, race) correlate with $X$, the risk of discriminating against protected groups grows. Ascarza & Israeli (2022)'s **BEAT (bias-eliminating adapted trees)** enables "fair personalization" without requiring protected attributes. On privacy, **differential privacy** — tuning protection through a single parameter $\epsilon$ — has become standard (DP-CATE, DP-policy; Ponte et al. 2025), with the noise-precision trade-off made explicit. On transparency, firms embed interpretability into model architecture (Gabel & Timoshenko 2022) or use post-hoc explanations like LIME and SHAP. The authors stress a subtle trap: a variable that does *not* moderate the treatment effect but is useful for predicting the outcome may be flagged as "important," leading to wrong conclusions about an intervention's effectiveness.

#### Limitations and Critical Assessment

- **An overview without its own empirics.** This paper's nature is to map terrain, not propose methods. So the most practical question — *which* CATE estimator is best *when* — stays open; the authors themselves list it as a key open problem in Section 7.1.
- **No quantitative comparison across methods.** S/T/X-learners, causal forests, GenericML are enumerated, but no head-to-head numbers on a shared benchmark are given. The reader must scatter back to the source papers.
- **Assumption-dependence of long-term and spillover fixes.** Surrogate models lean on the strong assumption that the surrogate fully mediates the treatment's impact; cluster randomization assumes cluster boundaries cleanly cut interference. Empirical evidence on how well these hold in practice remains thin.
- **The unresolved fairness-efficiency trade-off.** BEAT, Fair Active Learning, and the like reduce bias against protected groups but usually yield less efficient personalization. The authors concede that empirical work quantifying this trade-off is scarce.
- **Generative AI's risks are unvalidated.** Section 7.4 paints a rich picture of GenAI's potential, but the real risks of LLM bias and hallucination in personalization remain at the research-question stage.

#### Takeaways

- **Personalization = the causal-inference problem of whom/what/when/where.** Recasting personalization as estimating "who responds most (CATE)" unifies scattered marketing decisions into a single optimization $p^* = \arg\max\_p R(p)$. This framing is the paper's most durable contribution.
- **Target expected lift, not churn risk.** The lesson from Ascarza (2018) and Lemmens & Gupta (2020) is worth citing repeatedly — a high-risk customer who won't change is not worth targeting. If the CATE is negative, not intervening is optimal.
- **For most customers, "do nothing" is optimal.** That $p^*\_i = 0$ for the majority in the coupon example is a reminder: personalization is about precisely picking the few who will respond, not "more for everyone."
- **Causal forests' $\sqrt{N}$ consistency is why marketing adopted them.** Treatment effects are inherently unobservable, yet causal forests provide CATE confidence intervals, letting you ask "is this personalization statistically meaningful?" That's the core reason marketing prefers them over other ML methods.
- **Personalization is the fifth P.** The authors' closing prediction — that personalization will dissolve into marketing itself rather than remain a separate research track — is not mere rhetoric but the direction in which the convergence of causal inference, causal ML, and generative AI surveyed here is pointing.

#### Getting Started

The authors released a tutorial implementing the full test-and-learn pipeline for the food-delivery coupon example in R and Python.

```bash
# Code tutorial (R / Python, implementing each test-and-learn stage)
git clone https://github.com/sbstn-gbl/cs23-personalization
```

The repository provides reproducible notebooks covering Design (stratified randomization) → Test (A/A test) → Learn (CATE estimation via causal forest) → Optimize & Evaluate (IPW-based off-policy evaluation).

#### References

- Paper: <https://doi.org/10.1016/j.ijresmar.2025.07.004>
- Code: <https://github.com/sbstn-gbl/cs23-personalization>
- 2024 MSI Research Priorities (the industry priorities this paper aligns with)

#### Further Reading

- **[Putting one-to-one marketing to work: Personalization, customization, and choice](https://link.springer.com/article/10.1007/s11002-008-9056-z)** (Arora et al., 2008) — the starting point that formally introduced "personalization" 17 years ago, and the baseline this review measures change against.
- **[Estimation and Inference of Heterogeneous Treatment Effects using Random Forests](https://arxiv.org/abs/1510.04342)** (Wager et al., 2018) — the causal-forest origin. Its $\sqrt{N}$ consistency and confidence intervals made it the standard for CATE estimation in marketing.
- **[Meta-learners for Estimating Heterogeneous Treatment Effects using Machine Learning](https://arxiv.org/abs/1706.03461)** (Künzel et al., 2019) — unifies S/T/X-learners into one framework, underpinning this review's indirect-vs-direct CATE discussion.
- **[Double/Debiased Machine Learning for Treatment and Structural Parameters](https://www.nber.org/papers/w23564)** (Chernozhukov et al., 2018) — the double-ML foundation, estimating treatment effects under high-dimensional nuisance via Neyman-orthogonal scores and cross-fitting.
- **[Eliminating unintended bias in personalized policies using bias-eliminating adapted trees (BEAT)](https://www.pnas.org/doi/10.1073/pnas.2115293119)** (Ascarza et al., 2022) — proposes BEAT for fair personalization without protected attributes, central to the Section 6.4.1 fairness discussion.

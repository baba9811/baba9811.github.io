---
layout: post
title: "[Paper Review] LIGE-GR: A Smooth Leap from Ranking to Generative Recommendation in the LLM Era"
date: 2026-09-28 07:21:37 +0900
description: "LIGE-GR combines context-aware prediction, continuation-weighted list value, and Palette search while preserving the incumbent ranking stack."
tags: ["recommender-systems", "generative-recommendation", "listwise-ranking", "beam-search", "production-ml"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/fig2-upgrade.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/
ko_url: /papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Venkat Srinivas et al. (66 authors, Meta · USA) |
| Venue | arXiv · 2026 |
| arXiv or DOI | [2609.18148](https://arxiv.org/abs/2609.18148) |
| Data | Internal Instagram Reels and Facebook Video logs and online A/B experiments |
| <span style="white-space: nowrap">Review date</span> | 2026-09-28 |

## TL;DR

- LIGE-GR adds list-conditioned prediction, explicit list valuation, and sequential search to an existing ranking service. A small causal Transformer reuses the incumbent ranker's representations.
- The lightweight base configuration uses context-aware predictions, an unweighted sum of values, and beam width one. It raises time spent by 1.14% on Instagram Reels and 0.72% on Facebook Video against their respective incumbent systems, with additional inference resources around 10% of the context-free component's resources.
- On Reels, combining continuation-weighted valuation and a duration-aware future-value heuristic with beam width six improves time spent by another 0.69% relative to the base configuration. This is a separate comparison, not a measured cumulative improvement over the original incumbent.
- List diagnostics show broader topic and creator exposure alongside a reduction in very fresh content. Higher engagement does not mean every ecosystem metric improves.
- The contribution is a reversible route to listwise recommendation inside a mature stack, with explicit distinctions between prediction, objectives, and search.

## Introduction

Ten individually appealing videos do not necessarily make an appealing sequence. Repetition can wear out an otherwise strong topic, while a complementary item can make the next recommendation more attractive. In a short-video feed, later items also have value only if the user stays long enough to reach them. Ranking independent engagement estimates misses part of this interaction.

Production recommenders already address some of these problems through user-history models, diversity adjustments, and business constraints. Replacing the whole system can discard years of useful engineering along with its limitations. Migration also changes reliability guarantees, serving costs, and organizational ownership. A new architecture must compete with an actively improved incumbent while remaining safe to roll back.

[LIGE-GR](https://arxiv.org/abs/2609.18148), by Srinivas et al., treats that transition as a central design problem. It brings the sequence-generation perspective into the existing ranking stage: predict outcomes conditioned on the current prefix, assign value to the list, and search over feasible continuations. This review follows arXiv v2, including its appendix, and separates the lightweight online results from the more elaborate decoding configuration.

## Key Contributions

- **An additive listwise model:** a small context-aware module consumes representations already computed by the incumbent ranker, without introducing a separate reranking stage.
- **Continuation-weighted valuation:** expected list value accounts for the probability of reaching each position, rather than treating every item as guaranteed exposure.
- **Palette decoding:** beam search ranks prefixes using accumulated value plus a cheap future-value estimate, with a correction for video-duration bias.
- **A production migration path:** cached representations, candidate trimming, beam batching, and request-level fallback accompany online tests on two products.

## Related Work / Background

### User history and within-list context

“Context-free” does not mean unaware of the user. The CF model can encode rich interaction history. It is free of the prefix being assembled for the current output request. A sports enthusiast may receive high scores for several sports videos even when the system has already placed similar videos at the beginning of that list.

The context-aware model, CA, can change the prediction for the same candidate when preceding selections change. This is prospective context: those items have been selected, but the system has not yet observed the user's responses to them. LIGE-GR therefore models within-request effects rather than running an agent that repeatedly observes fresh feedback throughout a long session.

### Slate construction and generative retrieval

A slate is a collection or sequence of recommendations delivered together. [Seq2Slate](https://arxiv.org/abs/1810.02019) already explored selecting each item conditioned on earlier selections. LIGE-GR does not introduce autoregressive recommendation from scratch; its practical contribution concerns how generation, evaluation, and the incumbent system fit together.

Generative retrieval addresses a different boundary. [TIGER](https://arxiv.org/abs/2305.05065) generates Semantic IDs to retrieve items, while [OneRec](https://arxiv.org/abs/2502.18965) pursues a unified retrieval-and-ranking model. LIGE-GR receives a candidate pool on the order of hundreds and produces a list on the order of ten. It neither searches the full catalog directly nor generates a natural-language answer.

Its generation and evaluation are interleaved. Partial lists are scored and pruned before completion, rather than generating several complete lists and only then evaluating them. Existing item valuation and product constraints remain part of the decision process.

## Method / Architecture

### 1. Separate roles for prediction, valuation, and decoding

{% include figure.liquid loading="eager" path="assets/img/papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/fig2-upgrade.png" class="img-fluid rounded z-depth-1" caption="Figure 2: Itemwise recommendation on the left and listwise recommendation on the right; prediction context, objectives, and position-by-candidate search paths." zoomable=true %}

Given user context u and candidates C, the system returns T distinct items in order. CF predicts engagement signals such as likes, shares, or watch behavior. The item value model, itemVM, converts those predictions into a scalar utility, for example through a weighted combination. Prediction quality and the product's definition of value are separate concerns.

A control layer, CL, adjusts scores for the selected prefix. Finite penalties can discourage repetition; negative infinity marks an inadmissible choice. Consequently, the incumbent is not completely blind to sequence structure. However, its engagement predictions remain context-free, and greedy selection does not generally optimize the complete constrained list.

LIGE-GR upgrades three components: CF predictions become CA predictions, itemwise valuation becomes list valuation, and greedy selection becomes richer sequence search. These upgrades can be enabled incrementally. The headline online results use a particularly simple configuration rather than the full future-aware decoder.

### 2. A causal Transformer over cached representations

{% include figure.liquid loading="eager" path="assets/img/papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/fig3-model.png" class="img-fluid rounded z-depth-1" caption="Figure 3: User–item representations from CF on the left and the four-layer causal Transformer on the right; task predictions conditioned on the selected prefix." zoomable=true %}

The incumbent interaction network produces an intermediate representation combining user and candidate information. CA consumes these representations with a four-head, four-layer GPT-style causal Transformer and refines the task predictions. Its inputs include the current candidate and previously selected items.

The expensive feature computation happens once per request. Subsequent decoding steps reuse the cached CF representations and invoke the lightweight CA module. Generating ten positions therefore does not mean rerunning the full incumbent ranker ten times.

Causal attention matches the generation process: a candidate can depend on the prefix that already exists, not on future selections. Different prefixes can produce different scores for the same candidate. This differs from contextualizing all candidates once and sorting a fixed set of revised scores.

The architecture is intended to capture repetition, saturation, complementarity, and fatigue. These are plausible mechanisms, but the paper does not individually identify their causal contributions. Prediction gains and composition diagnostics provide evidence for contextualization as a whole.

### 3. Reach probabilities and expected list value

For clarity, let s denote the CA-based item value plus the control-layer adjustment. The following notation rewrites the paper's vanilla objective without changing its meaning:

$$
\begin{aligned}
s_t &= \operatorname{itemVM}(\operatorname{CA}(u,v_t\mid V_{t-1}))\\
&\quad + \operatorname{CL}(v_t\mid V_{t-1}),\\
\operatorname{ListVM}_{\mathrm{vanilla}}(V_T)&=\sum_{t=1}^{T}s_t.
\end{aligned}
$$

This sum already captures some list effects because each score depends on earlier selections. It nevertheless values later positions as if the user certainly reaches them. The golden objective instead weights each contribution by cumulative continuation probability:

$$
\begin{aligned}
P_0&=1,\\
q_t&=\operatorname{CA}_{\mathrm{continue}}(u,v_t\mid V_{t-1}),\\
P_t&=P_{t-1}q_t,\\
\operatorname{ListVM}_{\mathrm{golden}}(V_T)&=\sum_{t=1}^{T}P_{t-1}s_t.
\end{aligned}
$$

Here q is the conditional probability of continuing after the current item, and P is cumulative survival through the prefix. The current item's value uses the probability of surviving the previous prefix. Multiplying by survival after the current item would change the objective.

As an illustrative calculation, two successive continuation probabilities of 0.8 give a 0.64 probability of reaching position three. Those are explanatory numbers, not measured values from the experiment. An early selection affects both its own utility and the chance of realizing later utility. The paper weights CL adjustments in the same sum, while hard-ineligible candidates are removed before scoring.

### 4. Palette prefix expansion and value-to-go

Palette starts with an empty list. At each position, it appends every admissible unselected candidate to each retained prefix, scores all extensions, and keeps the global top b. Beam width determines how many prefixes survive; the search score determines which ones survive.

$$
Q(V_t)=\operatorname{ListVM}_{\mathrm{golden}}(V_t)+\widehat F(V_t).
$$

The future-value term vanishes for complete lists. The final output is the retained full list with the highest golden value. Algorithm 1 requires user context, candidates, beam width, list length, CA and continuation predictors, itemVM, CL, and the future-value estimator. It assumes at least one admissible extension at each position.

The RL interpretation treats a prefix as a state and the next candidate as an action. Accumulated value and estimated value-to-go jointly guide selection. This does not imply a separately trained critic, PPO updates, or a new policy-learning pipeline. The implemented estimator is a closed-form heuristic derived from available predictions. Learned value models and deeper planning are future directions.

Palette thus adds lookahead without paying for repeated rollout evaluation. Its finite beam and approximate future values also mean that it does not guarantee the globally optimal candidate permutation.

### 5. Duration-aware future value

A simple estimator averages unweighted VM+CL values in the prefix and reuses the latest item's continuation probability at every remaining position:

$$
\begin{aligned}
\bar s(V_t)&=\frac{1}{t}\sum_{\tau=1}^{t}s_\tau,\\
\widehat F_{\mathrm{step}}(V_t)&=\bar s(V_t)\sum_{j=1}^{T-t}q_t^j.
\end{aligned}
$$

The difficulty is that q describes continuation after an entire video. At the same per-second exit propensity, a longer video can have a lower whole-item continuation probability. Repeating that probability effectively repeats the current video's duration throughout the unfinished list, disproportionately pruning prefixes that end in long videos.

The duration-aware version rescales q from the latest duration to the prefix-average duration:

$$
\begin{aligned}
\bar d&=\frac{D(V_t)}{t},\\
\widetilde q_t&=q_t^{\bar d/d_t},\\
\widehat F_{\mathrm{dur}}(V_t)&=\bar s(V_t)\sum_{j=1}^{T-t}\widetilde q_t^{\,j}.
\end{aligned}
$$

D is total selected duration. A longer-than-average last video yields an exponent below one, increasing the adjusted probability; a shorter one has the opposite adjustment. This reduces a particular short-item bias rather than indiscriminately rewarding long content.

The estimator remains heuristic. It projects prefix-average utility and the latest continuation signal into unknown future positions. Equation (14) also does not multiply the estimate by the prefix's cumulative survival probability; this review preserves that formulation. The survival-weighted final objective and the search heuristic should not be conflated with an exact expected-return calculation or a Bellman-optimal value function.

### 6. Candidate trimming, batching, and fallback

The serving path first computes CF predictions and representations, then runs context-aware decoding. Only roughly the top third of CF-ranked candidates enter the CA stage. The reported online gains already include this trimming. Across two GPU generations, it improves CA-path throughput by roughly 60–80% relative to rescoring the full pool, not total-system throughput by that amount.

All beam continuations at one position are batched. Increasing beam width enlarges the batch rather than multiplying the number of sequential decoding stages. It still costs resources: at equal pool size and traffic, b=6 requires about 2.1 times the inference resources of b=1. One evaluated setting also decodes only the requested number of positions instead of generating a maximum-length list and truncating it.

If the CA phase fails or exceeds its request latency budget, the system reuses cached CF scores and returns to the incumbent decoder. Replacing CA with CF, setting continuation to one, beam width to one, and future value to zero recovers the baseline behavior. This makes rollback a configuration change, though the paper does not report observed timeout rates or fallback frequency.

## Training Objectives / Loss Functions

### Engagement prediction and decode-time utility

The paper specifies list-selection objectives much more fully than parameter-training losses. CF and CA predict engagement; itemVM and ListVM translate those predictions into choices. Better prediction and a better product objective are related but distinct improvements.

Task losses, loss weights, optimizer, learning rate, batch size, and total training volume are not disclosed. It would therefore be misleading to supply a particular cross-entropy combination or policy-gradient equation as the published LIGE-GR loss. Normalized entropy, NE, is reported as a prediction-quality metric; that does not specify the complete training procedure.

The decoding comparison is clearer. Vanilla sums contextual values, while golden weights them by reach probability. Table 3 keeps itemVM weights identical across configurations. However, its richer treatment changes both continuation-weighted valuation and future estimation, preventing attribution to either component alone.

## Training Data and Pipeline

| Item | Reported setup |
|------|----------------|
| Products | Instagram Reels and Facebook Video |
| Candidate/list scale | Hundreds of candidates; roughly ten output items |
| Added model | Four-head, four-layer causal Transformer |
| Inputs | Cached incumbent user–item representations |
| Reels prediction evaluation | NE accumulated over one online-training run |
| Facebook prediction evaluation | CA versus CF; improvements on 15 of 17 tasks |
| Reels base A/B | Treatment and baseline each 1.5% of users; seven-day readout |
| Facebook base A/B | Approximately 2% treatment and similarly sized control; seven days |
| Reels b=6 A/B | Each treatment approximately 3%, similarly sized b=1 controls; independent seven-day contrasts |
| Undisclosed details | Training-set size and period, task losses, optimization settings, training hardware budget |

The preserved CF path allows CA to evolve without replacing the incumbent training and publishing flow. That does not eliminate CA training; it limits the scope of the system change. Internal candidate generation, baseline quality, and product-specific value weights remain part of the experimental setting.

No public implementation link is supplied in the paper, so there is no installation recipe here. The results are best understood as incremental gains over two mature production baselines, not as a reproducible public-benchmark leaderboard.

## Experimental Results

### Task-level NE improvements

{% include figure.liquid loading="eager" path="assets/img/papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/tab1-prediction.png" class="img-fluid rounded z-depth-1" caption="Table 1: Relative task-level NE improvements of CA over CF, in percent. Positive values: lower NE; Facebook Continue: untracked." zoomable=true %}

On Reels, relative NE improvements are 1.57% for Continue, 0.74% for Skip, 0.29% for Like, 0.21% for Comment, 0.30% for Share, and 0.43% for Watch completion. Positive numbers mean lower NE, not percentage-point gains in accuracy or increases in the predicted behavior itself.

Facebook Video improves Skip and Like by 0.46% each, Comment by 1.59%, Share by 1.25%, and Watch completion by 0.55%. Continue is untracked in this table, not zero. Across the complete 17-task evaluation, 15 improve and two minor tasks regress by at most 0.07%.

This supports the predictive usefulness of within-list context. It does not by itself establish online utility: better calibrated predictions must still change selection in ways the product values.

### Seven-day base-configuration A/B results

{% include figure.liquid loading="eager" path="assets/img/papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/tab2-3-online.png" class="img-fluid rounded z-depth-1" caption="Tables 2–3: Top: base-configuration changes versus each product incumbent, in percent. Bottom: independent Reels b=6 comparisons against the base configuration. †: p<0.001." zoomable=true %}

Table 2 uses CA, vanilla valuation, b=1, and no future estimate. Against the Reels incumbent, time spent rises 1.14%, video views 2.28%, likes 2.65%, and reshares 1.77%. Sessions increase 0.11% and DAU 0.05%. All six carry the paper's p<0.001 marker.

On Facebook Video, time spent rises 0.72% and reactions 1.59%, while video views fall 0.52%; these three carry that significance marker. Sessions +0.07%, DAU +0.01%, and reshares +0.99% do not. The results therefore include a consumption tradeoff. Aggregate movements alone do not establish why fewer views coexist with more time spent.

Sessions and DAU reflect overall product activity; the other metrics are restricted to the evaluated short-video surface. Reels improvements should not be restated as identical changes in total Instagram consumption.

### Resource and latency costs

Both base configurations add inference resources equivalent to roughly 10% of their CF component's resources. The denominator is the incumbent ranking component, not every infrastructure expense in the service.

Reels end-to-end per-request latency increases roughly 7%. Facebook Video average serving latency increases about 2.2%. The paper explicitly warns that the definitions and baselines differ, so these numbers are not directly comparable.

The b=6 configuration is estimated at approximately 20% additional CF-equivalent resources, using the roughly 2.1-times base-decoder resource measurement. A comparable end-to-end b=6 latency figure is unavailable. The evidence supports a quality/resource tradeoff but does not provide a complete latency frontier.

## Analysis / Ablations

### Wider beams and the duration-aware configuration

Table 3 uses the CA-based b=1 configuration as its common reference. Widening the beam to six while retaining vanilla valuation and zero future value gives +0.05% time spent and +0.00% views. Likes +0.74% and reshares +1.21% carry p<0.001 markers. More search improves some reactions without materially changing consumption.

Combining b=6 with golden valuation and duration-aware future estimation yields +0.69% time spent, +1.82% views, +2.93% likes, and +1.41% reshares, all marked p<0.001. This supports the importance of what search optimizes, not only how many prefixes survive.

Each treatment was independently compared with b=1. Subtracting +0.05% from +0.69% does not establish a clean causal effect of duration correction. The richer arm also changes two conceptual components together; no golden-only or future-only experiment is provided.

### Offline search scores and online consumption

{% include figure.liquid loading="eager" path="assets/img/papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/fig5-beam.png" class="img-fluid rounded z-depth-1" caption="Figure 5: Accumulated VM+CL score gains in percent by beam width on 5,815 replayed requests. Reference: b=1; continuation fixed at one and future value at zero. Highlighted bar: b=6." zoomable=true %}

Appendix A varies beam width on 5,815 outlier-filtered replayed requests, fixing continuation to one and future value to zero. Relative accumulated VM+CL score gains over greedy are 3.16%, 4.72%, 5.63%, 6.27%, 6.72%, 7.10%, and 7.42% for widths two through eight.

The diminishing increments motivate width six as a practical operating point. The 6.72% figure is an offline objective improvement, not a watch-time gain. The nearly neutral online consumption result for beam-only decoding makes the distinction especially consequential.

A separate 11,965-request equivalence replay reproduces the incumbent greedy mean and quartile score statistics within 0.15% under the recovery setting. This supports implementation correspondence at the reported statistical level; it is not a claim of bitwise-identical lists for every request.

### Diversity, exploration, and freshness

{% include figure.liquid loading="eager" path="assets/img/papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/tab4-ecosystem.png" class="img-fluid rounded z-depth-1" caption="Table 4: Relative list-composition changes for matched requests, in percent; topics, creators, exploration, duration, and freshness. Red: reduced share of videos under 72 hours old." zoomable=true %}

The composition analysis logs baseline and base-configuration lists for identical request inputs. It covers 13,197 paired requests over three days, with 7,110 identified users. Treating 1,498 requests without viewer IDs as separate users gives 8,608 effective users. Request-level sampling favors more active viewers.

Across analyzed taxonomies, topic entropy increases 1.14–2.37%, distinct topic clusters 1.34–2.40%, and the longest same-topic streak decreases 4.03–4.74%. Adjacent-video cosine similarity drops 3.68%. Distinct creators rise 0.66%, same-creator concentration falls 2.98%, and creator entropy rises 0.54%.

Exposure to large creators falls 1.15%, while medium-creator exposure rises 0.38%. Familiar-creator content falls 6.23% and interest-matched-topic content 1.65%. These shifts suggest more exploration, accompanied by less immediate familiarity. They do not directly demonstrate fairer long-run creator income or universally smoother viewing sequences.

Within-request length entropy increases 0.86%, but videos under 72 hours old decrease 0.66%. The authors explicitly treat freshness as a regression. Separate Bayesian hierarchical linear models account for repeated requests per user and report 95%-level statistical support; that does not extend the three-day analysis into a long-term ecosystem experiment.

{% include figure.liquid loading="eager" path="assets/img/papers/0042-lige-gr-a-smooth-leap-from-ranking-to-generative-recommendat/fig4-lists.png" class="img-fluid rounded z-depth-1" caption="Figure 4: Baseline list above and LIGE-GR list below for identical inputs; durations in seconds, ages in days, position changes, and a new topic. Thumbnails: author-generated AI stand-ins." zoomable=true %}

The illustrated request preserves baseline topics while adding Sports, moves a 27.5-second item from position two to four, places a 70-day-old item last, and removes one of two Internet Culture items. Its thumbnails are the authors' AI-generated stand-ins; topic, duration, age, and movement annotations come from the logged request. The image is an illustration of a real composition change, not a screenshot of the original user videos.

## Limitations and Critical Assessment

### Candidate scope and evaluation horizon

The authors identify the hundreds-scale candidate pool as a current boundary. Full end-to-end recommendation would need integration with mechanisms such as Semantic IDs. CF-based trimming can also remove an item that would have been useful in a particular combination. The inherited ranker both enables efficiency and limits the search space.

Continuation models within-list consumption. Seven-day online readouts and three-day composition diagnostics do not establish months-long satisfaction, changing interests, or creator behavior. Time spent and reactions are useful measured outcomes, not exhaustive definitions of user welfare.

### Heuristic assumptions and incomplete attribution

Projecting prefix-average utility and the latest continuation signal into remaining positions can be inaccurate when the remaining pool differs substantially from the prefix. Duration rescaling addresses a specific bias through a simple probability transformation rather than a detailed model of future content.

The paper leaves more expressive models, learned value estimation, and deeper planning for future work. An immediately useful evaluation would isolate golden valuation, future estimation, and duration correction before adding that complexity. Current evidence supports the combined configuration more strongly than any claim that one component is independently essential.

### Reproducibility and serving measurements

Real production A/B tests are a strength. However, internal data, incumbent models, itemVM weights, and training details prevent external reproduction of the reported gains. Transfer to services with different candidate retrieval or weaker baselines remains unmeasured.

Relative resource figures and base latency changes also leave gaps: absolute latency, tail latency, fallback frequency, and comparable b=6 end-to-end latency are absent. A lightweight module can still exceed a particular service's budget. Deployment decisions need matched-traffic measurements of quality, pruning losses, and latency together.

## Takeaways

- **Model the current output as well as user history.** A strong history encoder does not automatically capture repetition and complementarity within the next list.
- **Separate prediction, objectives, and search.** Their gains and costs come from different comparisons and should be introduced incrementally.
- **Account for both reach and duration.** Survival weighting helps value later positions, while whole-item continuation can bias lookahead toward shorter content.
- **Validate proxy improvements online.** Higher replay scores from wider beams need not produce proportional consumption gains.
- **Preserve a working recovery path.** Cached incumbent scores and explicit fallback are substantive system contributions alongside model accuracy.

## References

- [LIGE-GR paper](https://arxiv.org/abs/2609.18148): Srinivas et al., arXiv v2, the source for methods, measurements, and figures in this review.
- Figure and table attribution: Figures 2–5 and Tables 1–4 of the paper. The source uses the [arXiv non-exclusive distribution license](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html), not CC BY; copyright remains with the original rights holders.

## Further Reading

- **[Seq2Slate: Re-ranking and Slate Optimization with RNNs](https://arxiv.org/abs/1810.02019)** (Bello et al., 2018): Sequential slate construction conditioned on previously selected items.
- **[Recommender Systems with Generative Retrieval](https://arxiv.org/abs/2305.05065)** (Rajput et al., NeurIPS 2023): TIGER and Semantic ID generation for retrieving recommendation candidates.
- **[OneRec: Unifying Retrieve and Rank with Generative Recommender and Iterative Preference Alignment](https://arxiv.org/abs/2502.18965)** (Deng et al., 2025): A unified generative retrieval-and-ranking approach with preference alignment.

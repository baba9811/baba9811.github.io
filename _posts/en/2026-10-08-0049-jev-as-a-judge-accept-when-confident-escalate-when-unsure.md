---
layout: post
title: "[Paper Review] JEV-as-a-Judge: Accept When Confident, Escalate When Unsure"
date: 2026-10-08 09:05:26 +0900
description: "A closer look at confidence-gated evaluation: JEV's cost advantage, independent reasoning fallbacks, local threshold selection, and failure cases"
tags: [llm-as-a-judge, confidence, model-routing, evaluation, calibration]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig2-routing.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/
ko_url: /papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Yubo Li, Yidi Miao, Ramayya Krishnan, Rema Padman (Carnegie Mellon University) |
| Venue | arXiv · 2026 · CC BY 4.0 |
| arXiv | [2609.26550v4](https://arxiv.org/abs/2609.26550v4) |
| Data | Judgment tasks from RewardBench, JudgeBench, HaluEval, RM-Bench, PPE, and follow-up samples |
| <span style="white-space: nowrap">Review date</span> | 2026-10-08 |

## TL;DR

- JEV returns probabilities over permitted labels without a generated explanation. This paper studies when to accept that inexpensive decision and when to call a stronger reasoning judge.
- A frozen cascade improves on GPT-6 Astra by 0.93 percentage points on 1,610 held-out preference pairs at 41.4% of its estimated API fee. RewardBench supplies 83% of that pool.
- On 570 held-out pairs from two new correctness workloads, locally selected thresholds match GPT-6's accuracy but escalate 74.2% of pairs and cost 75.5% as much.
- Confidence is useful within a measured operating range. Misleading answer style weakens routing, and reference-free prose produces confident judgments with almost no useful error ranking.

## Introduction

Evaluation can become a substantial recurring part of a model-development budget. Every new checkpoint, response set, or training-data filter may require another round of judgments. A strong reasoning model can check difficult solutions, but paying for that capability on every obvious comparison is expensive. An inexpensive judge is attractive only if its mistakes do not quietly change the conclusions of the evaluation.

A cheap judge needs a signal that separates its reliable decisions from the errors a fallback can repair. High average accuracy alone cannot establish this ability.

Li et al.'s [JEV-as-a-Judge](https://arxiv.org/abs/2609.26550) measures this possibility using TypeSafe JEV. This review covers v4, dated October 6, 2026, including its appendices. Its main contribution is an empirical account of where decision-only judging works, where it fails, and how to choose an escalation threshold. Single-model accuracy, probability quality, and end-to-end cascade performance remain separate questions throughout.

## Key Contributions

- **A workload-specific operating range:** comparisons separating text-based preference and factuality judgments from judgments requiring mathematical, coding, or logical derivation.
- **A shared output contract:** matched inputs and label probabilities for JEV and generative judges, with accuracy, failures, probability metrics, fees, and latency reported together.
- **Several levels of validation:** exploratory replay, frozen held-out policies, a live replication, and a prospective test on new workloads.
- **A practical threshold procedure:** local labels, a lower bound on the accuracy difference, workload-specific gates, and disjoint validation.

## Related Work / Background

### Accuracy, calibration, and error ranking

An LLM judge applies a rubric to an answer or response pair. A reward model can serve a related role, but its scalar scores are not necessarily probabilities. The paper therefore evaluates Skywork's reward margin as a routing signal without treating its raw scores as calibrated label probabilities.

Calibration asks whether decisions assigned, say, 90% confidence are correct about 90% of the time. Error ranking asks whether incorrect decisions receive lower confidence than correct ones. A model can rank errors reasonably well while systematically overstating confidence. Routing principally needs the ranking signal; transferring a numerical threshold also requires checking its workload-specific distribution.

### Selective evaluation and correlated errors

[Trust or Escalate](https://arxiv.org/abs/2407.18370) connects selective prediction to cascaded LLM evaluation. The JEV paper contributes measurements rather than a new routing algorithm. Its simple architecture makes it possible to examine the actual conditions under which escalation helps.

A stronger fallback still cannot repair errors it shares with the first stage. [JEV vs. LLMs as Rubric Judges](https://arxiv.org/abs/2609.29769) examines that limitation with inexpensive generative judges. The present study instead asks whether a stronger reasoning fallback can correct JEV's uncertainty-associated errors. These are different comparator settings, not contradictory universal verdicts about JEV.

## Method / Architecture

### 1. Maximum label probability as confidence

{% include figure.liquid loading="eager" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig2-routing.png" class="img-fluid rounded z-depth-1" caption="Figure 2: Acceptance or escalation from the maximum label probability and a locally selected threshold; illustrative probability values." zoomable=true %}

JEV receives natural-language instructions, structured state, and an allowed output type. The main experiments submit one Choice question per request. For preference evaluation, the state contains the question and two responses; the output supplies a verdict and probabilities for both labels. The study defines confidence as

$$
q = \max_k p_k.
$$

Here $p\_k$ is the probability of label $k$. This is distinct from the API's native `confidence` field, a provider-specific distribution statistic whose implementation is unpublished. Using that field directly would not reproduce the study's gate.

JEV also offers Noul for yes/no probabilities and Score for ordered rubric levels. Equivalent questions across these types need not return identical probabilities. In a 48-example audit, Choice and Noul differ by 0.055 on average, with one close decision changing. A deployed threshold should therefore belong to a fixed interface, rubric, and label interpretation.

### 2. Aligned averaging across candidate orders

The frozen pairwise policies judge both candidate orders. If $p\_1(x,y)$ is the probability assigned to the first-position response when shown $(x,y)$, the probability of response A is aligned before averaging:

$$
\begin{aligned}
\bar p(A) &= \tfrac12\bigl[p_1(A,B)\bigr.\\
&\qquad\bigl.+1-p_1(B,A)\bigr],\\
q &= \max\{\bar p(A),1-\bar p(A)\}.
\end{aligned}
$$

The complement aligns the second call with response A, rather than its first-position response B.

The more probable response becomes JEV's decision. Accepted exact ties receive half credit in evaluation, and an invalid output in either order always triggers escalation. Both JEV calls count toward fees. Order averaging is a robustness measure whose contribution must be measured separately from the gate itself.

### 3. Independent fallback and serial replacement

The cascade accepts JEV when $q\ge\tau$. Otherwise it calls the fallback, which independently judges the original input without seeing JEV's verdict or probabilities. The fallback's decision replaces JEV's.

Every item incurs the first-stage fee; only escalated items incur the fallback fee. Escalation rate and fee ratio consequently differ, especially when uncertain items are longer or consume more reasoning tokens. The headline cascade escalates 31.5% of pairs but costs 41.4% of GPT-6 alone.

In live runs, both JEV orders execute concurrently, followed by GPT-6 only when needed. Accepted pairs return quickly; escalated pairs wait for both stages. Lower aggregate fees therefore do not imply lower latency for every request.

### 4. Point estimates and lower-bound threshold selection

Thresholds are selected using labeled items from the target workload, evaluated by both stages. For ordinary binary correctness outcomes, the itemwise accuracy difference can be written as

$$
\begin{aligned}
d_i &= \mathbf{1}\{\hat y_i^{\mathrm{cascade}}=y_i\}\\
&\quad-\mathbf{1}\{\hat y_i^{\mathrm{fallback}}=y_i\}.
\end{aligned}
$$

The paper describes differences of −1, 0, or 1, with its separate half-credit convention for exact averaged ties. The point rule maximizes acceptance subject to mean difference $\bar d\ge-0.02$. It constrains accuracy loss to two percentage points rather than assigning an economic value to each error.

The lower-bound rule instead requires

$$
\bar d-1.645\frac{s_d}{\sqrt n}\ge-0.02,
$$

where $n$ is the selection-set size and $s\_d$ the sample standard deviation of itemwise differences. Coverage ties favor stricter thresholds; if none qualifies, all items escalate. On 100 PPE selection pairs, threshold 0.9 loses exactly two points but has a lower bound of −4.31 points. The conservative rule moves to 0.95, which loses none on that sample. This normal-approximation bound is a selection device, not an unconditional guarantee under distribution shift or threshold search.

## Evaluation Objectives / Metrics

### Correctness, probability quality, and validity

No model is trained or fine-tuned. The study evaluates existing judges and chooses a routing policy. Primary accuracy measures agreement with supplied benchmark labels, with invalid outcomes counted as errors. The final-answer set has incomplete annotator provenance and should be read as agreement with existing labels.

Brier score sums squared probability errors across labels; NLL penalizes low probability on the correct label; ten-bin ECE compares confidence with empirical accuracy. Lower is better for these metrics. Error-detection AUROC treats mistakes as positives and ranks them by $1-q$; 0.5 indicates chance ranking. Probability metrics condition on valid responses, so their denominators can differ from accuracy.

### Estimated API fees and outcome latency

Fees use collection-time prices and reported usage, including cached-input adjustments and billed reasoning tokens. Missing usage receives conservative reservations in upper estimates. These are estimated fees, not invoices; local models have no assigned API-equivalent price, and their cascade ratios exclude GPU cost.

Headline timing comes from a separate frozen panel of 120 judgments, 40 per public task. Bulk quality-run timing was excluded because synchronous accounting slowed the client. Outcome latency includes network, provider, and retry time. It is not intrinsic inference time or throughput, and it should not be mixed with live-cascade latency from a different sample.

## Evaluation Data and Pipeline

### Base samples and disjoint selection

<div class="table-responsive" markdown="1">

| Evaluation | Sample and purpose | Qualification |
|------------|--------------------|---------------|
| RewardBench | 1,500 preference pairs | Different from official subset weighting |
| JudgeBench | All 350 GPT-4o-split pairs | Knowledge, reasoning, math, and code |
| HaluEval QA | 3,000 answers from 1,500 questions | Correct and hallucinated answer per question, with evidence |
| Final answers and controls | 150 + 108 + 64 judgments | Label agreement and easy controls |
| Frozen cascade | 96 selection and 1,610 held-out pairs | Selection: 64 RewardBench, 32 JudgeBench |
| Prospective test | 100 selection pairs per workload; 570 held out | 400 PPE and 170 JudgeBench Claude-split pairs |

</div>

The 5,172 base judgments divide into a 642-item pilot and 4,530 held-out judgments. The cascade's headline held-out set contains only the 1,610 preference pairs, not the additional 2,920 HaluEval answers. Related answers remain together by source question, including during bootstrap resampling.

PPE contributes 100 pairs each from MMLU-Pro, MATH, GPQA, MBPP-Plus, and IFEval before selection/test splitting. JudgeBench's Claude-3.5-Sonnet split supplies 270 previously unjudged response pairs, although 91 questions overlap the earlier GPT-4o sample. The paper reports seen and unseen questions separately; new responses do not necessarily mean new questions.

### Shared contracts and pre-specified analyses

The main comparison contains JEV, fourteen generative LLMs, and two reward models. Hosted reasoning judges generally use low effort, with Qwen3.6 at default; local Qwen models run without thinking. This is not a compute-matched architecture comparison. Generative judges also return only a verdict and label probabilities, without an exposed rationale, although internal reasoning tokens can still be billed.

Validation checks schema fields, label membership, finite probabilities, normalization within 0.025, and verdict–argmax consistency. Outputs are not repaired or rerun for better answers; transient transport failures receive at most three attempts. Hidden labels, generator identities, and split metadata stay out of payloads.

Only the frozen two-order policies, the primary human-adjudication outcome, and the prospective protocol were fixed before their evaluation outcomes. Skill slices, threshold sweeps, and alternative-first-stage comparisons are exploratory. Held-out validation is stronger evidence than a favorable replay point.

## Experimental Results

### Single-call efficiency and uneven judge quality

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/tab1-main-results.png" class="img-fluid rounded z-depth-1" caption="Table 1: Base accuracy (%), valid-response counts, and estimated USD per 1,000 judgments and median latency (seconds) on the separate 120-item timing panel." zoomable=true %}

JEV scores 92.5% on RewardBench, 78.6% on JudgeBench, and 87.3% on HaluEval, compared with GPT-6's 92.5%, 93.1%, and 88.4%. The apparently comparable pooled result conceals a reported 14.6 percentage-point JudgeBench gap before rounding. Across 4,850 public judgments, JEV ranks eighth among fifteen LLM-based judges, 1.7 points below GPT-6 and 2.8 below GPT-5.6. GPT-6 is a reference fallback, not the uniformly best or cheapest model.

On the separate timing panel, JEV costs an estimated 0.044 USD per 1,000 judgments and has 0.15-second median latency, versus 12.182 USD and 1.89 seconds for GPT-6. That is roughly 277 times cheaper and thirteen times faster for an individual call. A cascade needs two JEV orders and sometimes a fallback, so these are not end-to-end savings.

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig4-skill-boundary.png" class="img-fluid rounded z-depth-1" caption="Figure 4: JEV-minus-GPT-6 accuracy differences in percentage points by skill with 95% intervals (a), accuracy by the number of errors among thirteen other judges (b), and differences by RM-Bench style and domain (c)." zoomable=true %}

The skill analysis combines 9,350 base-order items. Chat, refusal, compliance, and evidence verification are broadly close, while JEV trails by 7 points on expert knowledge, 12.9 on code, 14.3 on math, and 27.6 on logic. Near-perfect scores on visibly defective code do not predict performance on executable-code discrimination. The gap also depends on difficulty: when at least ten other judges fail, both JEV and GPT-6 score just 9.6%. Escalation cannot repair a task the fallback also cannot solve.

### Confidence separation and the frozen cascade

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig5-confidence.png" class="img-fluid rounded z-depth-1" caption="Figure 5: JEV and GPT-6 accuracy (%) across JEV-confidence bins, with sample counts below the horizontal axis; two-order averages for preference tasks and single judgments for HaluEval." zoomable=true %}

Among the 4,850 public judgments, 3,744 have confidence at least 0.9. JEV reaches 94.7% there and GPT-6 94.4%. On the remaining 1,106, JEV drops to 67.7% while GPT-6 retains 75.0%. This selective gap motivates routing. Nevertheless, both achieve only 97.8% on the 2,332 judgments with confidence exactly one. Confidence is useful for ranking errors without being a correctness guarantee.

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/tab4-frozen-cascade.png" class="img-fluid rounded z-depth-1" caption="Table 4: Frozen threshold-0.9 cascade on 1,610 pairs: accuracy (%), difference from GPT-6 (percentage points), escalation (%), captured JEV errors (%), and fee ratios on matching samples." zoomable=true %}

The held-out cascade reaches 93.4%, versus 92.5% for GPT-6 alone, a paired difference of +0.93 points with a 95% interval of [0.24, 1.66]. It escalates 31.5% of pairs, captures 85% of JEV errors, and uses 41.4% of estimated GPT-6 fees, or 44.0% with conservative reservations.

Workload composition explains much of that favorable result. RewardBench escalates 24.8% and costs 26.7% of its fallback baseline; JudgeBench escalates 64.8%, costs 66.8%, and remains 0.74 points below GPT-6, with an interval spanning zero. Expanding the evaluation from an earlier 510-pair slice to 1,610 mainly adds RewardBench cases. This is a change in sample mixture, not a newly improved model.

### Prospective quality parity at higher escalation

A live run on the earlier 510-pair slice reproduces the offline behavior, with 98.6% gate agreement and a 57.2% fee ratio. Its median latency falls from 2.10 to 0.27 seconds because more than half the judgments avoid escalation. This validates execution, but those pairs had already been analyzed.

The stronger deployment test uses the new PPE and JudgeBench Claude workloads. Selecting thresholds with the lower confidence bound gives 0.95 for PPE and 0.99 for JudgeBench. At 0.95, JudgeBench's selection point estimate loses only one point, but its lower bound is −2.64, outside the two-point margin. This does not make 0.99 a universal threshold.

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/tab5-prospective.png" class="img-fluid rounded z-depth-1" caption="Table 5: Live prospective cascade and post-hoc threshold-0.9 comparison on 570 new pairs: accuracy (%), escalation (%), fee ratios, and latency p50/p95 in seconds." zoomable=true %}

On 570 held-out pairs, the cascade and GPT-6 both score 90.2%, with a paired difference interval of [−0.70, 0.70] points. Escalation rises to 74.2% and the fee ratio to 75.5%, leaving 24.5% estimated savings. PPE saves more; JudgeBench escalates 89.4% and retains 91.0% of fallback fees. Quality parity transfers more convincingly than the initial cost reduction.

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig9-prospective-tradeoff.png" class="img-fluid rounded z-depth-1" caption="Figure 9: Prospective accuracy (%) versus relative fees (a, c) and mean latency in seconds (b, d); open circles for policies frozen on selection data and stars for GPT-6 alone." zoomable=true %}

Overall median latency is 1.87 seconds versus 1.91 for GPT-6, while p95 improves from 5.58 to 4.95 seconds. JudgeBench's median is slightly worse, 2.41 versus 2.35. Accepted cases are fast, but frequent sequential escalation removes most median-speed benefit. The threshold-0.9 replay offers lower fees at some quality loss; it was not the selected live policy.

### Style stress and reference-free prose

RM-Bench exposes a separate weakness. JEV falls from 85.4% on normal style to 76.6% on hard style, while GPT-6 falls from 91.8% to 90.1%. After order averaging, JEV's error-detection AUROC also declines from 0.870 on easy style to 0.764 on hard style. The exploratory 0.99 threshold matches GPT-6 on hard-style accuracy, but escalates 76% of pairs. Presentation affects both the verdict and its usefulness for routing.

{% include figure.liquid loading="lazy" path="assets/img/papers/0049-jev-as-a-judge-accept-when-confident-escalate-when-unsure/fig16-prose.png" class="img-fluid rounded z-depth-1" caption="Figure 16: Label agreement and mean maximum probability for document-grounded summaries and reference-free responses (top, %), plus counts of correct and incorrect JEV judgments across confidence bins (bottom); black diamonds for mean maximum probability." zoomable=true %}

JEV scores 69.8% on 400 document-grounded summaries. On 200 balanced reference-free responses, it scores 53.5% despite mean maximum probability of 0.91, with error-detection AUROC 0.498. This is almost useless confidence ranking. GPT-4.1-mini and GPT-5.4 are also weak on that set; GPT-6 was not evaluated there. Since the two prose sets differ in content and label provenance, the comparison does not isolate a causal effect of supplying evidence.

## Analysis / Ablation

### Error complementarity as the source of savings

A cascade benefits when the cheap model reliably handles some cases and the fallback corrects its uncertain errors. High average accuracy alone does not establish either condition. The middle-difficulty cases are promising because the fallback still has an advantage; jointly unsolved cases offer little benefit. Conversely, occasional confident JEV corrections of GPT-6 help explain how a cascade can exceed its fallback on a particular sample.

### Threshold uncertainty and workload mixture

In 2,000 retrospective selection simulations, choosing one threshold by a point estimate from 96 items causes a held-out loss beyond two points in 44% of draws. A pooled lower-bound rule reduces that to 5.2%; workload-specific lower-bound selection reduces it to 0.6%. Resampling one pool supports conservative selection but cannot guarantee behavior under distribution shift.

The practical unit of calibration is therefore a workload with reasonably stable difficulty and presentation. An inexpensive aggregate result dominated by easy preferences cannot price a reasoning-heavy service.

### Label disagreement and confidence interpretation

The blinded adjudication study reviews 163 disputed cases and twenty controls drawn from a 990-item subset. On JudgeBench's 69 disagreement cases, adjudication supports GPT-6 in 57, JEV in one, and leaves eleven indecisive. The reasoning gap is therefore not readily dismissed as benchmark noise.

HaluEval shows the opposite caution: 24 of 26 jointly wrong cases are judged to have incorrect supplied labels. Replacing 28 labels in the 240-item audit slice changes both accuracy and probability-quality comparisons. The audit has limited scale, and a planned second human pass was replaced by an LLM pass plus author resolution. It is useful sensitivity evidence, not independently established ground truth for the full benchmark.

### Two-order cost and implementation boundaries

Two orders reduce position effects, but their held-out accuracy gain is only 0.62 points, with an interval crossing zero. They are a sensible robustness measure with a real extra request cost. Workloads with near-universal escalation add orchestration and a preliminary call without much benefit. The paper's package description supports offline inspection of principal analyses, but I could not verify a directly downloadable official code release for this paper; no installation recipe is supplied here.

## Limitations and Critical Assessment

### Product snapshot and architecture attribution

JEV is a particular API version with undocumented training and architecture details. Its behavior does not establish a general encoder-versus-decoder result. The open local baseline is not a reproduction of JEV's weights, training data, or task alignment. Prices and provider behavior can also change after collection.

### Confidence portability and limited task coverage

A maximum label probability is not automatically calibrated uncertainty. Style stress, near-chance reference-free judgments, and task-specific detection quality show that its usefulness must be checked locally. The experiments primarily cover structured verdicts, not broad rubric evaluation, long-form critique, or arbitrary agent behavior.

### Prospective scale and operational economics

The prospective evidence contains 570 held-out pairs and two workloads. It supports a measured tradeoff at that scale, not guaranteed savings for every deployment. API fees exclude engineering effort, monitoring, and the full cost of local infrastructure. Bootstrap uncertainty and lower-bound selection do not remove unseen distribution shifts or systematic shared errors.

## Takeaways

- **A cheap judge can be an effective first stage.** JEV's confidence separates errors well enough on several preference and evidence tasks to support selective escalation.
- **Calibrate each workload before estimating savings.** The frozen evaluation retains 41.4% of fallback fees; the prospective evaluation retains 75.5% while matching observed accuracy.
- **Measure the whole policy.** Two-order calls, escalation rates, latency percentiles, invalid outputs, and label quality all affect deployment value.
- **Keep a path for confident mistakes.** Reference-free prose demonstrates that high confidence can coexist with chance-level decisions and ineffective error detection.

## References

- Yubo Li, Yidi Miao, Ramayya Krishnan, and Rema Padman. **[JEV-as-a-Judge: Accept When Confident, Escalate When Unsure](https://arxiv.org/abs/2609.26550)**. arXiv:2609.26550v4, October 6, 2026. [PDF](https://arxiv.org/pdf/2609.26550v4).
- Figures 2, 4, 5, 9, and 16 and Tables 1, 4, and 5 are from the paper above, distributed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Interpretation and commentary are provided in this review.

## Further Reading

- **[RewardBench: Evaluating Reward Models for Language Modeling](https://arxiv.org/abs/2403.13787)** (Lambert et al., 2024): Preference benchmarks and the effects of task composition on aggregate scores.
- **[JudgeBench: A Benchmark for Evaluating LLM-based Judges](https://arxiv.org/abs/2410.12784)** (Tan et al., 2024): Difficult comparisons requiring knowledge, reasoning, mathematics, and code understanding.
- **[RM-Bench: Benchmarking Reward Models of Language Models with Subtlety and Style](https://arxiv.org/abs/2410.16184)** (Liu et al., 2024): Reward-model sensitivity to subtle correctness and presentation differences.
- **[Trust or Escalate: LLM Judges with Provable Guarantees for Human Agreement](https://arxiv.org/abs/2407.18370)** (Jung et al., 2024): A related statistical approach to deciding when automated judgments require escalation.
- **[JEV vs. LLMs as Rubric Judges: Cheaper, Faster, and Wrong in the Same Places](https://arxiv.org/abs/2609.29769)** (Rao et al., 2026): Complementary evidence on rubric judging and shared errors, beyond this paper's preference-oriented setting.

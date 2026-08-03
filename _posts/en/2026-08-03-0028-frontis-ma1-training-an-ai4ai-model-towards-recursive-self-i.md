---
layout: post
title: "[Paper Review] Frontis-MA1: Training an AI4AI Model towards Recursive Self-Improvement in Machine Learning Engineering"
date: 2026-08-03 14:00:00 +0900
description: "Four atomic operators — Draft, Improve, Debug, Crossover — shared between post-training and evolutionary search. A 35B model hits 71.21% on MLE-Bench Lite on a single RTX 4090 with a 12-hour per-task budget."
tags: [ai4ai, recursive-self-improvement, mle-agent, evolutionary-search, reinforcement-learning, post-training, agent]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig5-workflow.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/
ko_url: /papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Junlin Yang et al. (24 co-authors across Frontis.AI · Tsinghua · Zhejiang · SJTU · Georgia Tech) |
| Venue | arXiv · 2026 · model weights and full stack released |
| arXiv or DOI | [2607.28568](https://arxiv.org/abs/2607.28568) |
| Code | [FrontisAI/OpenRSI](https://github.com/FrontisAI/OpenRSI) |
| Data | OpenMLE-Gym — 5,758 executable MLE tasks · 26,259-example execution-grounded SFT corpus |
| <span style="white-space: nowrap">Review date</span> | 2026-08-03 |

#### TL;DR

- Pushing AI-for-AI (AI4AI) toward recursive self-improvement (RSI) requires that the thing doing the improving is itself trained. This paper takes machine learning engineering (MLE) as the executable testbed and releases OpenMLE, an open full-stack system spanning environments (OpenMLE-Gym), operator learning (OpenMLE-ERL), and long-horizon search (OpenMLE-Evo).
- The central design move is to use <strong>Draft, Improve, Debug, and Crossover</strong> as both the unit of post-training supervision and the unit of inference-time search. Once the trained operators become the variation engine of the evolutionary harness, learning and search close into a single loop.
- On the 22-task MLE-Bench Lite split, under a tight budget of a single RTX 4090 (12 GB VRAM) and 12 hours per task, Frontis-MA1-35B lifts Medal Average from 39.39% to 60.61% over its base model, and reaches 71.21% with OpenMLE-Evo-Max — past GPT-5.5 + Codex (68.18%) and approaching the 2.8T Kimi K3 (72.73%).
- The two contributions separate cleanly on a held-out benchmark. On NatureBench Lite, fixing the harness and swapping in the trained model raises Match-SOTA from 50% to 70%; fixing the model and swapping in the harness raises it from 20% to 50%.

#### Introduction

The era in which only human engineers pushed AI capability forward is winding down. AI systems now write code, run experiments, search over designs, and participate in building the next generation of AI. That direction is usually called AI for AI (AI4AI), and its most ambitious endpoint is recursive self-improvement (RSI): each improved system further improves the <em>process</em> that produces its successors. Getting there takes more than better one-shot generation. It takes agents that inspect data, propose algorithms, execute experiments, diagnose failures, and decide where to spend the next unit of compute.

Machine learning engineering captures almost all of that. An agent has to build an ML solution for a real task and improve it iteratively through execution feedback. A typical trajectory starts from "a pipeline that at least runs" and works its way, through repeated experiments, toward something competitive with strong human or frontier-model pipelines. Every iteration burns time and compute, and its verdict arrives minutes or hours later. There are few more concrete settings in which to study how agents improve AI systems under delayed, noisy, heterogeneous feedback.

Prior work on MLE agents has advanced along three strands that rarely meet: inference-time harnesses built on structured or evolutionary search; executable task and environment construction; and post-training MLE agents from execution feedback. In the audit the authors run in Appendix Table 11, no representative public system spans all three — scalable task and environment construction, execution-grounded post-training, and an evolutionary harness that deploys the trained agent in long-horizon search — along with the artifacts needed to reproduce the loop. That gap is the paper's starting point.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig2-positioning.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: Positioning of this work. Left: MLE within AI4AI and the OpenMLE stack. Right: the mechanism ladder from evolution through meta-evolution to RSI. The MA in Frontis-MA1 stands for Meta-evolution Agent."
   zoomable=true %}

#### Key Contributions

- **Operators as a shared interface between learning and search.** Draft, Improve, Debug, and Crossover are defined once and used identically as SFT/RL targets and as search-time calls. Verified evolutionary transitions supervise exactly the transformations that search later composes, which turns the trained model into the harness's variation engine and forms a meta-evolutionary loop.
- **OpenMLE-Gym: 5,758 quality-gated executable tasks.** 156 Curated Anchors, 3,362 tasks derived from Kaggle Datasets, and 2,240 from a custom Kaggle Competition pipeline, all mapped onto one executable package contract with isolated execution, structured feedback, and task-specific evaluators.
- **OpenMLE-ERL: execution-grounded SFT plus RL.** Budget-adaptive collection yields a 26,259-example SFT corpus, and adaptive reward bounds plus entropic advantages concentrate the learning signal on top-tier programs rather than merely valid ones.
- **OpenMLE-Evo: experience-driven long-horizon search.** Deterministic experience cards and a task-global board, non-greedy parent selection over quality, progress, and novelty, and operator-conditioned memory synthesized only on demand.
- **A reproducible full stack.** Data, training and evaluation code, sandbox infrastructure, harness code, and final checkpoints. It is the only system in the paper's audit to tick all six artifact columns (Data / Sandbox / Train code / RL method / Eval / Weights).

The contribution I find most valuable is not the third bullet but the first: <strong>interface alignment</strong>. Existing work optimizes "a good harness" and "a good model" separately, so what the harness calls and what the model learned tend to drift apart. This paper binds them to the same four verbs. The search-efficiency numbers below — 41.7% fewer tokens, 84.3% more new-best updates per token — mostly fall out of that alignment.

#### Background and Related Work

**MLE-Bench and medal-based scoring.** MLE-Bench (Chan et al., 2024) packages Kaggle competitions as agent tasks. The agent receives the competition description and training data, must produce a `submission.csv`, and is graded against the competition's real human leaderboard. All three metrics used here come from that setup: Valid Rate is how many of the 22 tasks yield a valid submission, Medal Average is the fraction of tasks earning any Kaggle medal, and Human Rank is the fraction of human participants the submitted solution beats, averaged over tasks and runs. Higher is better on all three.

**AIDE and the AIRA line of code-space search.** AIDE (Jiang et al., 2025) builds a tree whose nodes are programs and expands it by improving and repairing nodes from execution feedback. AIRA-dojo (Toledo et al., 2025) and AIRA2 (Hambardzumyan et al., 2026) extend this to population-based search and identify search policy, operator quality, throughput, and ideation diversity as the decisive factors. OpenMLE-Evo adopts the AIRA-Evo population loop wholesale and redesigns only <em>how that loop uses execution evidence</em> — which is also why original AIRA-Evo is the paper's most honest baseline.

**RLVR and its ceiling.** RL with verifiable rewards works well on math and code, but as Yue et al. (2025) argue, RL mostly reinforces already-rewarded solutions: it raises Pass@1 while doing little for Pass@$K$ at large $K$. Teacher distillation, on the other hand, can introduce behaviors absent from the base model's sampled support. The SFT-then-RL split here follows that analysis directly — SFT widens the set of reachable programs, RL moves probability toward the better ones inside that widened set.

**Why MLE RLVR is different.** Unlike short-horizon math RLVR, here (1) many programs produce no usable reward at all, (2) successful programs get continuous scores on incomparable metrics and ranges, (3) feedback arrives only after sandbox runs lasting minutes to hours, and (4) every non-Draft action depends on which parent was selected. Each of OpenMLE-ERL's design decisions — adaptive bounds, entropic advantage, asynchronous rollouts, parent-state selection — maps onto one of these four.

#### Method and Architecture

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig5-workflow.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: Overview of the OpenMLE training and inference workflow. The four atomic operators at the top carry the same meaning across all three blocks: evolutionary inference, SFT on executable rollouts, and RL from execution feedback."
   zoomable=true %}

##### Problem formulation

Each task $\tau$ consists of a natural-language specification, visible data assets, a submission contract, a task-specific evaluator, and a sandboxed execution environment. At step $t$ the search algorithm picks an operator $a\_t$ and builds its operator context $c\_t$ from zero or more parent programs and their execution feedback. The model proposes, and the sandbox scores:

$$
p_t \sim g_\theta(\cdot \mid \tau, a_t, c_t), \qquad s_t = R_\tau(\mathcal{E}(p_t, \tau))
$$

where $g\_\theta$ is the operator-conditioned program-generation policy, $\mathcal{E}$ the sandbox, and $R\_\tau$ the task-specific evaluator. Within a finite execution budget, evolutionary inference seeks the candidate maximizing the signed score $\tilde{s}\_t$ (converted so larger is always better):

$$
p^\star = p_{\arg\max_{t \in \mathcal{I}} \tilde{s}_t}
$$

Meta-evolution adds a learning loop on top. Both SFT and RL are special cases of one objective:

$$
\mathcal{L}_{\text{evo}}(\theta) = -\mathbb{E}_{(\tau_i, a_i, c_i, p_i)} \left[ w(s_i) \log g_\theta(p_i \mid \tau_i, a_i, c_i) \right]
$$

with $w(s\_i)$ converting an execution outcome into a learning weight. For SFT, quality filtering keeps high-scoring programs and gives them positive supervision; for RL, processed execution rewards and entropic advantages act as weights inside the clipped policy objective. Both stages update <em>the same parameters</em> $\theta$ over <em>the same conditional</em> $g\_\theta(\cdot \mid \tau, a, c)$. This formal unification is what later grounds the claim that what the model learned is what the harness calls.

##### OpenMLE-Gym: building verifiable environments at scale

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig3-gym-curation.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: OpenMLE-Gym task curation and executable format. Left: three sources on the quality-scale trade-off. Middle: the Kaggle Competition filtering funnel. Right: the unified package layout."
   zoomable=true %}

An environment instance is defined by five elements. The **task/state** is the specification, public data, hidden evaluator, resource budget, and current workspace; the **action** is an agent-submitted MLE program plus its execution requirements; the **transition** is sandbox execution; the **observation** is a structured record with execution status, task score, logs, error types, artifacts, and runtime metadata; the **reward** is the verifiable task-specific score.

Tasks come from three sources sitting at different points on the quality-scale trade-off:

| Source | Count | Character |
|--------|-------|-----------|
| Curated Anchors | 156 | Hand-selected from papers and benchmarks. Highest confidence, limited scale |
| Kaggle Datasets | 3,362 | MLE-Smith's dataset-to-task pipeline, extended, with package-level quality control |
| Kaggle Competitions | 2,240 | Human-authored specs, metrics, and submission protocols, with leaderboards as external evidence |
| **Total** | **5,758** | |

The competition funnel is the best part of this section. Starting from roughly 11,000 competitions in the Meta Kaggle catalog, leaderboard-length screening, MLE-Bench overlap removal, and licensing/rules screening leave 3,972 (36% retained); automated package construction and metric validation leave 2,839 (26%); and a strict semantic quality gate leaves 2,240 (20%). That <strong>MLE-Bench-overlapping competitions are excluded explicitly</strong> is the single measure holding up the credibility of everything downstream.

The semantic gate is an LLM-based filter that jointly inspects the task description, raw files, processing script, processed outputs, and representative data samples, and scores five dimensions: task validity, data sufficiency, raw-data usage, task complexity, and data quality. What it is hunting for is degenerate targets solvable by trivial rules, inadequate training or evaluation signal, superficial use of the source assets, mismatched difficulty, data leakage, annotation errors, and malformed processing. Only metric-valid tasks receiving the strict `recommended` decision are admitted — `conditional` does not pass.

The sandbox backend routes API requests through a central scheduler to CPU/GPU Docker workers and returns six feedback modes: successful completion, runtime error, missing code, missing submission, scoring failure, and timeout. This taxonomy matters more than it looks. An agent that can distinguish "the process succeeded but wrote no submission" from "the submission exists but violates the evaluator schema" from "the submission is valid but scores poorly" is an agent that can decide between Debug and Improve.

Modality breaks down as tabular 44%, image 18%, time series 13%, multimodal 11%, text 9%, audio 2%, video 1%, other 2%; task type is classification 56% and regression 31%, together 87%. Package sizes range from under 1 MiB (29%) to 1 GiB or more (9%). Because of source-data licensing, full task-package data is released for only 1,415 tasks; for the remaining 4,343 only `prepare.py` and `metric.py` ship.

##### OpenMLE-ERL: reinforcing reusable operators

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig7-rollout-learning.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: Learning from executed rollouts. On the left, the supervised warm start combines a parallel path (threshold-passing Drafts) with an evolutionary path (tracing back from a valid endpoint through repeated Debug steps). On the right, RL parent selection, adaptive bounds, and entropic advantage."
   zoomable=true %}

###### Four atomic operators

The central principle is to <strong>separate the local skills the model learns from the search algorithm used at inference time</strong>. Training full trajectories ties you to sparse, controller-specific supervision; training reusable program-transformation operators lets many search procedures compose the same operators. Draft proposes a new solution from the specification, Improve revises one selected parent, Crossover synthesizes two, and Debug repairs a failed or non-positive-reward parent.

###### Execution-grounded supervised warm start

SFT collection runs down two paths.

The **parallel path** independently samples and executes complete Draft solutions per task. The first batch uses GLM-4.7: among candidates with valid execution scores for the same task, duplicate scores are removed, the rest ranked, and at most the top 4 retained — 11,519 examples. The second batch uses GLM-4.7 and Qwen3-30B-A3B-Thinking-2507 together, but ranks both teachers' candidates <em>jointly</em> within each task. A GLM candidate is kept if it lands in the joint top 4; a Qwen candidate only if it ranks first overall. That preserves the cap of four examples per task rather than four GLM plus one Qwen. The second batch contributes 5,726 examples (5,075 GLM, 651 Qwen), for 17,245 full-response examples in total.

The **evolutionary path** exists because complete solutions expose final programs but never demonstrate how execution feedback should drive a revision. GLM-4.7 drives AIRA-Evo searches to produce trees with parent relations, program versions, execution feedback, and scores, from which <em>local segments</em> are extracted. A segment begins at a Draft, Improve, or Crossover node, follows its consecutive Debug descendants, and ends when it reaches another Draft, Improve, or Crossover node. Acceptance differs by operator: a Draft segment must end with a positive score, an Improve segment must beat its parent, and a Crossover segment must beat the better of its two parents. Retained endpoints must additionally reach bronze, silver, or gold level.

Which steps inside a multi-step segment survive is decided by DeepSeek-V4-Pro under a <strong>causal-inheritance</strong> criterion: a step is kept only when its core strategy, necessary intermediate state, or critical error repair is inherited by later steps and concretely contributes to the endpoint. Cosmetic edits, blind retries, changes that merely shrink training scale to dodge resource limits, and failed environment modifications or external-network accesses are dropped. The full annotation prompt is reproduced in Appendix B.1, and it is more careful than you would expect — for instance, it insists on separating goal from method: if a step proposes LightGBM to fix overfitting and the endpoint keeps the goal but uses HistGradientBoosting, the method is <em>not</em> considered inherited. This path contributes 9,014 trajectory-step examples.

After merging both paths, exact-deduplicating over normalized full messages, applying the target model's chat template, and dropping anything over 32,768 tokens, the released corpus is 26,259 examples:

| Axis | Distribution |
|------|--------------|
| Supervision type | 17,245 full responses (65.7%) · 9,014 trajectory steps (34.3%) |
| Operator | Draft 19,436 (74.0%) · Debug 4,340 (16.5%) · Improve 1,741 (6.6%) · Crossover 742 (2.8%) |
| Median length | 8,407 tokens (full responses) · 14,051 tokens (trajectory steps) |

Trajectory steps run longer because they carry parent programs, execution feedback, and local search context. Collection stops budget-adaptively — at an accepted-example quota or when a task's execution budget is exhausted — so easy tasks terminate early and sparse-success tasks get more attempts.

###### Execution-grounded reinforcement learning

**Making heterogeneous outcomes comparable.** One task optimizes accuracy, another log loss; even after aligning directions, the ranges do not match. For a signed score $\tilde{s}$, the bounded base reward is:

$$
r_{\text{base}}(\tilde{s}; b_{\text{best}}, b_{\text{worst}}) = \text{clip}\left( \frac{\tilde{s} - b_{\text{worst}}}{b_{\text{best}} - b_{\text{worst}}},\, 0,\, 1 \right)^{\alpha}, \qquad \alpha > 0
$$

The trouble is that leaderboard or theoretical extrema are usually far wider than the region the current policy actually occupies, so meaningfully different programs collapse to nearly identical rewards. OpenMLE therefore derives tighter <strong>adaptive bounds</strong> from each task's on-policy score frontier. Sorting the scores of successful historical programs and the current rollout group as $x\_{(1)} \ge \cdots \ge x\_{(K)}$:

$$
\begin{aligned}
B_{\text{dyn}} &= x_{(1)}, \\
W_{\text{dyn}} &= x_{(\min(16, K))}, \\
W_{\text{dyn}} &\leftarrow W_{\text{dyn}} - 0.25 \max(B_{\text{dyn}} - W_{\text{dyn}},\, 0)
\end{aligned}
$$

The best score sets the top, the 16th-best sets the lower reference point (or the lowest available if fewer than 16 exist), and the lower end is then extended down by a quarter of the gap. Without that last extension, moderately successful programs get clipped to zero whenever scores cluster tightly. Where task metadata supplies valid theoretical or leaderboard limits, the range is capped by $B = \min(B\_{\text{dyn}}, B\_{\text{static}})$ and $W = \max(W\_{\text{dyn}}, W\_{\text{static}})$.

**Concentrating signal on the upper tail.** MLE evaluation rewards the quality of the <em>best</em> program found, so a barely viable submission should not receive the same positive reward as a top-performing one. OpenMLE uses an entropic advantage that amplifies reward gaps near the top of each rollout group. Omitting the stabilizing max-centering used in the implementation:

$$
A^{\text{ent}}_i \approx \frac{\exp(\beta\, r_{\text{proc},i})}{\frac{1}{G-1} \sum_{j \neq i} \exp(\beta\, r_{\text{proc},j})} - 1
$$

The concentration parameter $\beta$ is chosen under a fixed entropy/KL budget: binary search sets it so the group distribution $q\_i(\beta) \propto \exp(\beta c\_i)$, with $c\_i = r\_{\text{proc},i} - \max\_j r\_{\text{proc},j}$, sits at $\mathrm{KL}(q\_\beta \| \mathrm{Unif}(K)) \approx \log 2$ from uniform (max search value $10^6$, 60 bisection iterations). These advantages replace the usual GRPO-style group-normalized signal. The ordering matters: adaptive bounds first make within-group differences <em>visible</em>, and entropic weighting then <em>directs</em> the learning signal toward the best candidates.

**Removing stragglers.** The dominant latency in MLE RL is executing candidate programs, and runtimes vary widely. In a synchronous batch, completed groups idle until the slowest sandbox job returns. OpenMLE launches generation-and-execution groups independently and lets the trainer consume completed groups from a queue. The measured study in Appendix B.4 puts mean step time at 97.0 minutes synchronous versus 50.8 minutes asynchronous across 40 matched steps — a 1.91× ratio. On the worry that asynchronous collection over-samples fast or immediately failing tasks: in two representative runs, per-task step counts stayed within ±2 of the run median, with coefficients of variation of 1.56% and 2.06%.

**Selecting informative states.** Evolutionary RL must choose not only a task and an operator but the <em>program state</em> the operator acts on. Uniform sampling wastes updates on exhausted regions; greedy sampling retrains on the incumbent and suppresses diversity. OpenMLE samples parents proportional to a three-term fitness:

$$
F(p) = \text{norm}(R_p) + \text{norm}\left( \mathrm{Var}_{c \in \text{child}(p)} R_c \right) + \text{norm}(C_p)
$$

$R\_p$ favors strong parents, child-reward variance flags regions where operator outcomes remain informative, and $C\_p$ is a cooling coefficient decreasing with visits, which stops a single incumbent from monopolizing the rollout budget. In the implementation, Improve and Crossover draw from programs with positive stored reward and Debug from those with non-positive reward.

**Reward hacking.** The authors observed rewards plateauing at very low levels on difficult tasks, and case studies found the cause: models taking the sample submission, shuffling it randomly, and submitting that. The mitigation is blunt and effective — an o3-mini LLM judge checks for reward hacking <em>before</em> sandbox execution, and detected code bypasses the sandbox with a reward of $-0.5$.

##### OpenMLE-Evo: scaling experience-driven long-horizon search

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig9-evo-harness.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9: The OpenMLE-Evo search harness. (1) update the experience card of each evaluated node, (2) score it on quality, progress, and novelty, (3) sample a parent by softmax and invoke the operator, (4) synthesize LLM memory only for the selected ancestors (V) and siblings (H)."
   zoomable=true %}

The whole section is about four differences from original AIRA-Evo, which stores largely free-form memory, synthesizes it eagerly, selects parents mainly by scalar fitness, and hands broadly similar histories to different operators.

**Structured experience accumulation.** After each sandbox evaluation, a deterministically populated experience card attaches to the node: identity and lineage (`node_id`, `operator`, `parents`, `generation_id`), observed outcome (`score`, `fitness`, `reward`, `status`, `error_signature`), resource accounting (sandbox and model time, cost, token counts), method characterization (a coarse method family auto-detected from imports, and how often that direction has already been explored), derived search signals (delta versus parent, novelty, rank, incumbent status, selection utility), and semantic evidence (plan, analysis, and a lazily generated rich summary). Aggregating all cards for a task yields the experience board, which carries method-family statistics, family-best nodes, underexplored directions, repeated failures, score trends, and the parent graph.

The point is that this state is <strong>deterministic and queryable</strong>. It comes straight from search state and execution results rather than from an LLM summary, which makes it safe to feed into parent selection.

**Three-factor parent selection.** Card metadata becomes three components: normalized validation score $\tilde{s}\_i$, normalized positive improvement over the strongest parent $\widetilde{\Delta}\_i$, and method-family novelty $\nu\_i = 1/\sqrt{1 + N\_{f\_i}}$, where $N\_{f\_i}$ counts other recorded cards in candidate $i$'s detected family. Within a sampled island $\mathcal{I}$:

$$
\begin{aligned}
U_i &= \lambda_s \tilde{s}_i + \lambda_\Delta \widetilde{\Delta}_i + \lambda_n \nu_i, \\
P(i \mid \mathcal{I}) &= \frac{\exp(U_i / \tau)}{\sum_{j \in \mathcal{I}} \exp(U_j / \tau)}
\end{aligned}
$$

Each selection decision therefore weighs current solution quality, progress relative to lineage, and the algorithmic novelty of the direction. Selection pressure toward strong solutions survives, but budget still flows to candidates showing meaningful progress or opening underexplored approaches.

**Operation-triggered memory synthesis.** AIRA-Evo eagerly asks a language model to summarize the history of every evaluated node. That spends inference budget on nodes no later operator ever selects, and — the bigger problem — produces the summary <em>before</em> the decision context that should shape it exists. OpenMLE-Evo separates deterministic storage from LLM synthesis: after evaluation it keeps only the card and board, and defers rich natural-language memory until an Improve, Crossover, or Debug call has selected its relevant nodes. Only then does it invoke the memory model, for the selected parents and their retrieved ancestors, siblings, or error-related attempts, caching the result.

**Operator-conditioned context.** Default retrieval sets differ per operator:

| Operator | Default retrieved evidence |
|----------|---------------------------|
| Draft | No inherited memory. Starts an independent branch from the specification |
| Improve | Selected parent + 3 most recent ancestors + top 3 direct siblings (ranked by the same utility as parent selection) + relevant board fields |
| Crossover | Two parents, each with 2 recent ancestors and 2 top-ranked siblings, plus family statistics, repeated errors, and a method-family complementarity cue |
| Debug | The current buggy node + prior nodes with the same error signature + recent attempts, up to 3 related nodes |

A "sibling" here is a prior candidate sharing at least one parent. Improve can traverse its lineage vertically and contrast nearby alternatives horizontally; Crossover sees compatible strengths and conflicts between two branches; Debug reuses fixes for the same failure mode. The prompt also states the remaining search budget, remaining steps, and per-run execution limit, so decisions stay feasible under the actual constraints.

#### Training Data and Pipeline

| Item | Frontis-MA1-30B | Frontis-MA1-35B |
|------|-----------------|-----------------|
| Base model | Qwen3-30B-A3B-Thinking-2507 | Qwen3.6-35B-A3B |
| SFT stage | Full-parameter SFT | Full-parameter SFT |
| SFT framework | SLIME + Ray + Megatron-LM | SLIME + Ray + Megatron-LM |
| Context cutoff | 32,768 tokens | 32,768 tokens |
| Precision | bfloat16 | bfloat16 |
| Global batch size | 128 | 128 |
| Gradient accumulation | 64 microbatches per update | 32 microbatches per update |
| Learning rate | $3.0 \times 10^{-5}$, cosine decay to 0, 0.1 warmup | same |
| Epochs | 3 | 3 |
| RL framework | SLIME + Ray + SGLang | SLIME + Ray + SGLang |
| Operator sampling | Draft 0.50 · Improve 0.17 · Debug 0.17 · Crossover 0.16 | same |
| Rollout group | 16 prompts × 16 samples, global batch 128, 2 optimizer steps per rollout | same |
| Generation | temperature 1.0, max response 24,576 tokens | same |
| Objective | GSPO with TTT-Discover-style reward post-processing, clip $\epsilon = 3.5 \times 10^{-4}$, TIS enabled | same |
| Optimizer | Adam, lr $1.0 \times 10^{-6}$ constant, weight decay 0.1, $\beta\_1 = 0.9$, $\beta\_2 = 0.98$ | same |

`<think>` supervision is retained for both models; the 30B uses a qwen3 loss mask and the 35B a qwen3_5-compatible one.

Evaluation uses the official 22-task MLE-Bench Lite split, with each OpenMLE-Evo configuration run three times independently unless noted. The per-task budget is <strong>12 hours on a single RTX 4090 with 12 GB VRAM</strong>, which the authors note is smaller than the vast majority of evaluations in the official MLE-Bench runs registry — though that comparison covers only accelerator allocation and wall-clock budget, not model-inference cost or FLOPs normalization.

**OpenMLE-Evo-Max** extends the standard configuration in two ways: it distills reusable cross-task priors from public competition artifacts (with all MLE-Bench-related sources excluded before distillation), and it enables asynchronous multi-GPU parallel search while holding total sandbox compute fixed.

#### Experimental Results

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig1-mlebench-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Results on MLE-Bench Lite. Left: all completed harness results. Right: the Pareto panel of best harness against model size, where Frontis-MA1-35B sits among models an order of magnitude larger."
   zoomable=true %}

##### Training and search gains compose

The controlled comparison under an identical harness is the paper's primary evidence.

| Model | Framework | Valid Rate | Medal Average | Human Rank |
|-------|-----------|------------|---------------|------------|
| Qwen3.6-35B-A3B (base) | OpenMLE-Evo | 19.67/22 | 39.39% | 0.5828 |
| Frontis-MA1-35B | OpenMLE-Evo | 21.67/22 | 60.61% | 0.7647 |
| Frontis-MA1-35B | OpenMLE-Evo-Max | 22.00/22 | 71.21% | 0.8126 |
| Qwen3-30B-A3B-Thinking-2507 (base) | OpenMLE-Evo | 17.33/22 | 34.85% | 0.5573 |
| Frontis-MA1-30B | OpenMLE-Evo | 21.67/22 | 53.03% | 0.7055 |
| Frontis-MA1-30B | OpenMLE-Evo-Max | 22.00/22 | 66.67% | 0.8053 |

With the harness completely fixed, post-training alone moves Medal Average by 21.22 points (39.39 → 60.61). The second backbone reproduces it at 18.18 points (34.85 → 53.03), so this is not one lucky checkpoint. Adding OpenMLE-Evo-Max reaches 71.21%, 3.03 points above GPT-5.5 + Codex (68.18%).

##### Fix the harness and swap the model; fix the model and swap the harness

| Model | General harness | OpenMLE-Evo | OpenMLE-Evo-Max |
|-------|-----------------|-------------|-----------------|
| GLM-5.2 | Claude Code 59.09% | 62.12% | 66.67% |
| MiniMax M3 | Codex 54.55% | 59.09% | 65.15% |
| Kimi K2.6 | Claude Code 59.09% | 66.67% | — |
| MiniMax M2.7 | Claude Code 45.50% | 50.00% | — |
| Frontis-MA1-35B | AIRA-Evo 53.03% | 60.61% | 71.21% |

OpenMLE-Evo beats general-purpose coding-agent harnesses across all four frontier models. And on Frontis-MA1-35B, original AIRA-Evo 53.03% → OpenMLE-Evo 60.61% buys 7.58 points with the same model and the same operator vocabulary, changing only <em>how search uses execution evidence</em>. That row is the most direct justification for the three design changes in §5.

For reference, the top general-harness entries are GPT-5.6 Sol + Codex at 72.73% (Human Rank 0.8891), Kimi K3 + Claude Code at 72.73% (0.8574), Claude Opus 4.8 + Claude Code at 63.64%, Gemini 3.5 Flash + Gemini CLI at 63.64%, and Claude Sonnet 5 + Claude Code at 59.09%.

##### Long-horizon self-improvement

The most interesting observation is not the total but <strong>when</strong> the score moves. Frontis-MA1-35B with OpenMLE-Evo-Max keeps improving across the full 12 hours, and generalizes upward: 68.18% on validation against 71.21% on final test. GPT-5.6 Sol and Kimi K3 go the other way, from 77.3% validation to 72.7% test.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig13-leaf-trajectory.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 13: Cross-model search trajectories on leaf-classification. Two early Debug steps establish image and tabular branches, two Crossovers fuse them, and a late Improve produces the largest jump with ConvNeXt-Tiny."
   zoomable=true %}

The leaf-classification trajectory illustrates this well. Step 2 Debug fixes multiclass label encoding, unstable folds, and LightGBM regularization to reach log loss 0.44622 (Human Rank 0.3534). Step 4 Debug stabilizes the ResNet18 branch to cover all 99 classes: 0.23730 (0.4160). Step 11 Improve combines EfficientNet embeddings with 192 engineered features: 0.17472 (0.4398). Step 15 Crossover fuses the robust ResNet18 branch with regularized LightGBM features into one hybrid: 0.13123 (0.4737). Step 29 Crossover adds stronger augmentation, early stopping, and TTA: 0.08268 (0.5407). Step 45 Improve swaps in ConvNeXt-Tiny embeddings with a regularized MLP over fused features: 0.02990 (0.7713). The later Improve and Crossover operations produce <strong>85.0% of the total validation gain</strong>. The held-out result is Human Rank 0.9455 with Bronze, while the strongest comparison model stalls at 0.6303 on validation and earns no medal.

On mlsp-2013-birds the pattern is more extreme: Improve and Crossover account for <strong>91.9%</strong> of the validation improvement. Step 5 Debug makes the submission valid (AUC 0.74786); step 48 Improve fuses filtered spectrograms and segment histograms with EfficientNet-B0 and an MLP (0.79390); steps 71-72 Crossover combine safe parsing, SpecAugment, stratified CV, and EfficientNet-B2 with TTA (0.82774); step 118 Crossover adds class weighting (0.85744); step 119 Improve uses focal loss and TTA for rare species (0.87737); and step 150 Crossover selects the memory-flagged robust EfficientNet-B2 branch to reach 0.88576. Held-out Human Rank is 0.8889 with Silver. What the authors emphasize is that memory matters here through <em>selection</em>, not volume — it preserves which branches contributed robust parsing, imbalance handling, augmentation, and representation quality, while marking an inferior ResNet50 direction as evidence to avoid.

##### Solution ceiling

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig15-medal-tier.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 15: Gold, Silver, and Bronze decomposition. Training and search improvements grow the Gold share rather than merely pushing more solutions over the Bronze threshold."
   zoomable=true %}

A higher medal count alone does not distinguish "barely scraped a few more Bronzes" from real quality gains. The tier decomposition shows post-training and OpenMLE-Evo-Max moving successful solutions toward Gold. The 30B comparison reproduces the same direction, and the fixed-model GLM-5.2 and MiniMax M3 comparisons show the pattern extends to search improvements too. Against external systems, Frontis-MA1-35B with OpenMLE-Evo-Max outperforms Claude Opus 4.8 with Claude Code and Gemini 3.5 Flash with Gemini CLI, and matches Kimi K3's Gold rate.

##### Search efficiency and mechanism

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig16-search-efficiency.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 16: Search efficiency of original AIRA-Evo (gray) versus OpenMLE-Evo (cyan): same checkpoint, same seed, 12-hour task budget, 66 task-runs per harness."
   zoomable=true %}

Same Frontis-MA1-35B checkpoint, same seed, same 12-hour budget, 66 matched task-runs per harness:

| Metric | AIRA-Evo | OpenMLE-Evo | Change |
|--------|----------|-------------|--------|
| Total model tokens | 129.3M | 75.3M | −41.7% |
| Prompt tokens | 83.5M | 41.5M | −50.3% |
| Evaluated nodes | 3,430 | 3,004 | −12.4% |
| New-best validation updates | 229 | 246 | +7.4% |
| New-best updates per 1M model tokens | 1.77 | 3.27 | +84.3% |
| Improve operations setting a new best | 44/931 (4.73%) | 72/769 (9.36%) | +98.1% |
| Improve prompt, mean length | 102.8K chars | 35.7K chars | −65.3% |
| Improve prompt, 99th percentile | 389.0K | 54.3K | −86.1% |
| Crossover prompt, mean | 140.4K | 55.3K | −60.6% |
| Crossover prompt, 99th percentile | 419.2K | 78.4K | −81.3% |

Reading this correctly matters. Node count drops only 12.4% while tokens drop 41.7% — the saving comes from <strong>making each expansion cheaper</strong>, not from terminating search early or evaluating far fewer candidates. And the compression is strongest in the tail: an Improve 99th percentile falling from 389K to 54.3K characters means the worst case, where an ever-growing free-form history got serialized into every request, is simply gone.

Figures 17 and 18 trace the mechanism on individual runs. On nomad2018-predict-transparent-conductors, original AIRA-Evo follows a single lineage after its Draft fails, running seven successive Debug attempts that each inherit an expanding history, ending at validation RMSE 0.06633 and held-out 0.06096. OpenMLE-Evo instead constructs a targeted Crossover at step 81 from complementary evidence: one parent contributes atomic properties, dynamic covalent edges, and unit-cell volume (validation RMSE 0.06309), the other a robust parser for irregular `.xyz` geometries (0.06573). Horizontal memory marks an RDF-cache `TypeError` and a 3328 × 94 feature mismatch as <em>negative</em> evidence, keeping them from being silently serialized into the child context. The resulting program reaches validation RMSE 0.06087 and held-out 0.05410 — 8.2% and 11.3% better respectively.

Right-whale detection shows why three-factor selection earns its keep. In the AIRA-Evo trace, two independently repaired branches reach validation AUC 0.94656 and 0.85546, score-only selection keeps the stronger one, and held-out AUC comes out at 0.94852. In the OpenMLE-Evo step-10 candidate pool, Parent A leads on score at 0.99187 with a deeper ResNet-SE pipeline (64-Mel features, AMP, TTA), while Parent B scores 0.98773 — only sixth by score, but first by gain after improving 0.00568 over its own parent, and retaining a Log-Mel representation with Delta and Delta-Delta temporal channels. With Score/Gain/Novelty weights 1.0/0.6/0.3, Parent B moves to the top utility rank and its selection probability within the same ten-parent pool rises from 10.47% to 17.09%, a 63.2% relative increase. Selected for an Improve operation, its child reaches validation AUC 0.99203 and held-out 0.99386. The authors are careful here: because the full framework also changes targeted memory, the end-to-end difference should not be attributed to the three weights alone.

##### Cross-modality results and NatureBench transfer

{% include figure.liquid loading="eager"
   path="assets/img/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/fig19-modality.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 19: Modality-stratified MLE-Bench Lite results. Wide outlined bars show Medal Rate; narrow filled bars show mean Human Rank."
   zoomable=true %}

Partitioning the 22 tasks into image (9), text (5), tabular/structured (4), audio (2), and multimodal (2), Frontis-MA1-35B raises mean Human Rank in <em>all five</em> groups relative to Qwen3.6-35B-A3B under the same harness, and never lowers group-level Medal Rate. By Medal Rate: image 44% → 52%, text 33% → 60%, tabular 42% → 50%, audio 33% → 100%, multimodal 33% → 83%. The 14 additional medals distribute as +2/+4/+1/+4/+3 across image/text/tabular/audio/multimodal, so the aggregate gain is not one modality in disguise. That said, audio and multimodal have only two tasks each, so the dramatic 33% → 100% has very coarse resolution.

NatureBench (Wang et al., 2026) asks whether coding agents can recover or improve on published scientific results, using 90 containerized tasks distilled from Nature-family papers across six domains. Heterogeneous scientific metrics are compared through a direction-normalized relative gap:

$$
g = \mathrm{dir} \cdot \frac{m - m_{\text{SOTA}}}{|m_{\text{SOTA}}|}, \qquad \mathrm{dir} \in \{-1, +1\}
$$

Match-SOTA (All M) is the fraction of tasks with $g \ge 0$; Surpass-SOTA (All S) the stricter fraction with $g > 0.1$. The transfer study uses NatureBench Lite, a fixed 10-task subset spanning all six domains, six input-modality families, and four ML task types, retaining NatureBench's containers, hidden evaluator, validity rules, web-search-disabled setting, and four-hour per-task search budget.

| Configuration | All S | All M |
|---------------|-------|-------|
| Frontis-MA1-35B + OpenMLE-Evo NB adapter | 30.0% (3/10) | 70.0% (7/10) |
| Qwen3.6-35B-A3B + OpenMLE-Evo NB adapter | 20.0% (2/10) | 50.0% (5/10) |
| Qwen3.6-35B-A3B + original AIRA-Evo | 10.0% (1/10) | 20.0% (2/10) |

Holding the adapter fixed and swapping the model moves All M from 50% to 70%; holding the model fixed and swapping the harness moves it from 20% to 50%. That the two contributions are separately observable is the whole point. The combined system matches the 3/10 and 7/10 attained by GPT-5.4, GLM-5.1, and MiniMax-M3 on this subset and exceeds the DeepSeek-V4-Pro, Claude Opus 4.6, and MiniMax-M2.7 configurations — though it falls short of Claude Opus 4.7 and GLM-5.2, both at 7/10 and 10/10 with Claude Code.

One trajectory is walked through in detail. On protein variant effect prediction, Frontis-MA1-35B reaches task-level aggregate improvement $g = 0.1161$ across 11 protein-assay instances against $g = 0.0243$ for its base. Search advances from a valid Draft at 0.0679 through Debug and Improve nodes to a Crossover incumbent at 0.1016 — and then, rather than greedily refining that incumbent, the three-factor selector revisits a distinct 0.0955 branch whose score, recent gain, and novelty remain promising. Vertical and horizontal memory preserve successful physicochemical features while exposing nearby timeout, `KeyError`, and nested-mapping failures; the resulting Improve node keeps the robust flat mapping and adds training-label-derived positional priors with five-fold LightGBM ensembling, landing at 0.1161.

#### Analysis and Ablation

It is worth being precise about what this experimental design <em>does</em> separate and what it does not.

**Separated ①: model versus harness.** The 39.39% → 60.61% obtained by fixing the harness completely and swapping only the checkpoint is the cleanest number in the paper. It reproduces at 21.22 and 18.18 points on two backbones and points the same way on NatureBench Lite (All M 50% → 70%). The converse — fixing the model and swapping the harness — holds for four frontier models and for original AIRA-Evo.

**Separated ②: harness efficiency.** The 66 matched task-runs in Figure 16 use the same checkpoint and seed, so only the harness differs. The asymmetry there — nodes down 12.4%, tokens down 41.7% — is what supports the bounded-context mechanism claim. Had the saving come from terminating search early, both numbers would have fallen together.

**Not separated ①: the three OpenMLE-Evo components.** Nothing tells us how the 7.58 points (53.03 → 60.61) split among structured experience cards, three-factor parent selection, and on-demand memory synthesis. Figures 17 and 18 are two well-chosen trajectories, and the authors call them grounded traces rather than ablations. The weights $\lambda\_s / \lambda\_\Delta / \lambda\_n = 1.0/0.6/0.3$ are fixed without a sweep, and §8 lists learning task-dependent weights as future work.

**Not separated ②: post-training versus teacher distillation.** The SFT corpus is produced by GLM-4.7 and curated by DeepSeek-V4-Pro. A substantial share of that "21.22-point post-training gain" is therefore <strong>distillation from stronger teachers</strong>, not Frontis-MA1 improving itself from its own trajectories. In an RSI narrative this distinction is load-bearing. The paper does not hide it — Appendix B.1 names the teachers — but "towards Recursive Self-Improvement" in the title invites the reading that a closed loop has already gone around once. What was actually demonstrated is half of it: that evolutionary trajectories can train the operators.

**Not separated ③: the two changes inside OpenMLE-Evo-Max.** The 10.6-point jump from 60.61 to 71.21 turns on cross-task experience priors and asynchronous multi-GPU parallel search being switched on <em>together</em>. Their relative contributions are not reported. And the claim that all MLE-Bench-related sources were excluded before prior distillation is hard to audit: Kaggle write-ups share techniques across competition boundaries, so "not data from this competition" and "not information useful for solving this competition" are different propositions.

**Supervision distribution versus performance attribution.** This is the most interesting tension in the paper. The SFT corpus is overwhelmingly Draft: 74.0% Draft, 16.5% Debug, 6.6% Improve, 2.8% Crossover. Yet §6.3 attributes 85.0% (leaf-classification) and 91.9% (mlsp-2013-birds) of validation gain to late Improve and Crossover. The two least-supervised operators contribute the most. Two readings are available: optimistically, Improve and Crossover supervision is extremely sample-efficient; pessimistically, most of their performance comes from the base model's general coding ability plus the well-structured context the harness supplies, with SFT contributing little. An ablation varying the operator mix would settle it. There isn't one.

**Effect of the RL reward design.** Figure 8 shows entropic weighting raising the mean processed advantage assigned to the best candidate in a rollout group from 1.58 to 6.39 — a 4.0× amplification — and, combined with adaptive bounds, a peak smoothed Group Best Reward of 0.666 (+0.089 over the previous construction). The test medal rates shown alongside, 24.2 ± 5.7 → 34.8 ± 4.3, use a simpler early-stage harness rather than OpenMLE-Evo and should not be compared with the 60.61% in the main table. Flagging that in the caption is a nice piece of honesty.

**The size of the variance.** Appendix D.1's three-epoch statistics belong next to every headline number: Frontis-MA1-35B + OpenMLE-Evo is 60.61% ± 7.73%, Evo-Max is 71.21% ± 8.57%, and the base is 39.39% ± 5.67%. The 21.22-point gain over base survives that spread comfortably; close comparisons like 71.21% against GLM-5.2 Evo-Max at 66.67% ± 8.57% do not. Worse, the Codex, Claude Code, and Gemini CLI references were <strong>evaluated only once</strong> because of cost and remain point estimates. So "3.03 points ahead of GPT-5.5 + Codex" compares a three-run mean against a single observation.

#### Limitations and Critical Assessment

**Limitations the authors acknowledge (§8).** They frame the distance to RSI as five capability boundaries. (1) A single execution-outcome signal cannot say whether a <em>research direction</em> is promising, generalizable, or worth more compute; objectives that capture hypothesis quality, reasoning, critique, and transferable strategy are needed. (2) Composing trained operators through an external harness bounds the range of actions the model can initiate on its own. (3) The agent only improves external ML artifacts and does not participate in improving language models themselves. (4) Evolution operates over candidate solutions while the evolutionary system itself stays fixed. (5) The experience card records far more metadata than the three factors parent selection actually consumes.

**What I would add as a reviewer.**

<em>The gap between the RSI claim and the evidence.</em> Meta-evolution is observed for exactly one generation. The real RSI test — "trajectories produced by Frontis-MA1 train Frontis-MA1-gen2, which is better again" — is absent. The paper's closing paragraph explicitly retreats to "a testbed for studying progress toward RSI, rather than a claim that OpenMLE realizes general, autonomous recursive self-improvement," which is the right posture; the title carries more weight than the evidence does.

<em>Resolution at 22 tasks.</em> One MLE-Bench Lite task is 4.55 points. The distance between 60.61% and 66.67% is 1.3 tasks. NatureBench Lite has 10 tasks, so each is 10 points — the authors say so themselves. Mixing three-run means with single observations to build a ranking at this resolution is risky.

<em>The compute-budget comparison cuts both ways.</em> A single RTX 4090 with 12 GB and 12 hours is genuinely smaller than the 24-hour H200 or 2×A100 setups other systems use, and that is a real strength. For the same reason, "approaching GPT-5.6 Sol's 72.73%" is a comparison across different conditions. Appendix Table 11 footnotes that "scores are not strictly comparable"; the main narrative doesn't fully inherit that caveat.

<em>Closed dependencies inside an open stack.</em> Reward-hacking detection uses o3-mini as a judge, and SFT teachers are GLM-4.7 and DeepSeek-V4-Pro. How much "the full stack is released" is worth depends on access to those external APIs. The judge's false-positive rate — how often a legitimate solution is scored as a hack and handed $-0.5$ — is not reported, and that number directly contaminates the training signal.

<em>Partial data release.</em> Only 1,415 of 5,758 tasks (24.6%) ship with full package data; the rest release only `prepare.py` and `metric.py`. The licensing constraint is understandable, but it does mean "trained on 5,758 tasks" is not externally reproducible as stated.

<em>Structural limits of the metrics.</em> Medal Average and Human Rank both rest on Kaggle leaderboards, a fixed historical distribution. Nothing measures whether solutions generalize outside the competition test split, and no operating cost is reported for the programs that 12 hours of search produces — a number you would want before arguing about the practical value of MLE automation.

#### Takeaways

- **Aligning the unit of learning with the unit of invocation comes before making the harness clever.** The paper shows a harness-only gain (53.03 → 60.61) and a model-only gain (39.39 → 60.61) that both exist and compose. They compose because Draft, Improve, Debug, and Crossover mean the same thing on both sides. Matching the vocabulary of "behaviors the model learned" with "behaviors the scaffold calls" is a nearly free design decision that agent systems routinely skip.
- **In long-horizon search, cutting context beats growing it.** The Improve prompt's 99th percentile fell from 389K to 54.3K characters while new-best updates per token rose 84.3%. Serializing an ever-growing history into every request does not just cost more — it lowers signal-to-noise. Small, structured context (three relevant ancestors, three siblings) turns out to be a fairly convincing alternative.
- **Separate deterministic state from LLM summarization, and summarize only on demand.** Experience cards come straight from execution results, which makes them safe inputs to parent selection; natural-language memory only fits its decision context if it is produced after you know which operator picked which node. Summarizing everything upfront feels intuitive, but it wastes budget and lowers quality at the same time.
- **Reward scale determines the resolution of the learning signal.** Fixed bounds from leaderboards or theoretical extrema smear out the differences inside the narrow region the current policy actually occupies. Rescaling from the on-policy frontier (adaptive bounds) and then amplifying the upper tail (entropic advantage) is a recipe that transfers directly to other domains using verifiable rewards.
- **Read the "towards RSI" framing separately from what was measured.** What is demonstrated is that evolutionary trajectories can train program-transformation operators, and that this gain composes with a search gain. There is no second-generation experiment. Even so, being the first to release all six of data, sandbox, training code, RL method, evaluation, and weights means the second-generation experiment is now something <em>someone else can run</em> — and that contribution stands on its own.

#### Setup and Usage

The full stack is at [FrontisAI/OpenRSI](https://github.com/FrontisAI/OpenRSI), model weights are in the [HuggingFace collection](https://huggingface.co/collections/FrontisAI/frontis-ma1), and the project page is [frontisai.github.io/OpenRSI](https://frontisai.github.io/OpenRSI).

OpenMLE-Gym's task-package contract follows the layout below, so shaping your own dataset into this format lets you reuse the harness directly:

```text
task_package/
├── raw/                        # original competition assets
├── data/
│   ├── public/                 # agent-visible
│   │   ├── description.txt
│   │   ├── train.csv  /  train/ ...
│   │   ├── test.csv   /  test/  ...
│   │   └── sample_submission.csv
│   └── private/                # hidden answers
│       └── test_answer.csv
└── utils/
    ├── prepare.py              # deterministic train/test split
    └── metric.py               # validates predictions, returns a scalar
```

The sandbox injects the public data path via a `DATA_DIR` environment variable, runs the program roughly as follows, and returns a structured record:

```bash
export DATA_DIR=<task-public-data-dir>
python <sandbox-job-workspace>/code/main.py \
  2>&1 | tee -a <sandbox-job-workspace>/sandbox_stdout.log
```

The record carries `score`, `status`, an `error_type` drawn from the six feedback modes, runtime metadata, and workspace artifacts. If, say, the generated code passes an argument the installed PyTorch does not support, the record comes back with `error_type: code_execution_error` and the full traceback, which becomes the evidence for the next Debug call.

#### References

- Paper: [arXiv:2607.28568](https://arxiv.org/abs/2607.28568)
- Code: [github.com/FrontisAI/OpenRSI](https://github.com/FrontisAI/OpenRSI)
- Model weights: [HuggingFace — FrontisAI/frontis-ma1](https://huggingface.co/collections/FrontisAI/frontis-ma1)
- Project page: [frontisai.github.io/OpenRSI](https://frontisai.github.io/OpenRSI)

#### Further Reading

- **[MLE-bench: Evaluating Machine Learning Agents on Machine Learning Engineering](https://arxiv.org/abs/2410.07095)** (Chan et al., 2024) — The primary benchmark used here: 75 Kaggle competitions packaged as agent tasks and graded against real human leaderboard medals.
- **[AIDE: AI-Driven Exploration in the Space of Code](https://arxiv.org/abs/2502.13138)** (Jiang et al., 2025) — The prototype of Draft/Improve/Debug-style tree search over code space, and where OpenMLE's operator vocabulary originates.
- **[AI Research Agents for Machine Learning: Search, Exploration, and Generalization in MLE-bench](https://arxiv.org/abs/2507.02554)** (Toledo et al., 2025) — AIRA-dojo, the source of the original AIRA-Evo baseline and of the analysis that search policy and operator quality decide performance.
- **[AIRA_2: Overcoming Bottlenecks in AI Research Agents](https://arxiv.org/abs/2603.26499)** (Hambardzumyan et al., 2026) — The follow-up whose asynchronous parallel search informs OpenMLE-Evo-Max.
- **[MLE-Smith: Scaling MLE Tasks with Automated Multi-Agent Pipeline](https://arxiv.org/abs/2510.07307)** (Qiang et al., 2025) — The dataset-to-task pipeline behind OpenMLE-Gym's 3,362 Kaggle Dataset tasks.
- **[NatureBench: Can Coding Agents Match the Published SOTA of Nature-Family Papers?](https://arxiv.org/abs/2606.24530)** (Wang et al., 2026) — The scientific AutoResearch benchmark used for transfer, defining 90 containerized tasks and the direction-normalized relative gap.
- **[Learning to Discover at Test Time](https://arxiv.org/abs/2601.16175)** (Yuksekgonul et al., 2026) — TTT-Discover, the source of the upper-tail principle behind OpenMLE-ERL's entropic advantage.

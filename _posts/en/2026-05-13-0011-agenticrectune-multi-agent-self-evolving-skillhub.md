---
layout: post
title: "[Paper Review] AgenticRecTune: Multi-Agent with Self-Evolving Skillhub for Recommendation System Optimization"
date: 2026-05-13 10:00:00 +0900
description: "An LLM multi-agent framework that automates the tuning of system-level configuration (fusion weights, demotion weights, diversity thresholds) across all three stages — pre-ranking, ranking, re-ranking — of Google Discover. Five specialized agents (Actor, Critic, Insight, Skill, Online) form a closed loop that feeds live A/B results back into memory and a self-evolving skillhub, simultaneously lifting engagement and diversity in production."
tags: [recommendation-system, llm-agent, multi-agent, hyperparameter-optimization, ab-testing]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/fig1-workflow.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/
ko_url: /papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Xidong Wu et al. (10 co-authors, Google) |
| Venue | arXiv preprint · 2026 (cs.IR, v1 posted 2026-04-21) |
| arXiv | [2604.26969](https://arxiv.org/abs/2604.26969) |
| Data | Live A/B traffic on Google Discover across pre-ranking · ranking · re-ranking |
| <span style="white-space: nowrap">Review date</span> | 2026-05-13 |

## TL;DR

- **AgenticRecTune** is an LLM multi-agent framework that automates the tuning of *system-level* configuration — fusion weights, demotion weights, diversity thresholds, head weights — across all three stages of Google Discover's recommendation pipeline (pre-ranking → ranking → re-ranking). Five specialized Gemini 3 Pro agents (Actor, Critic, Insight, Skill, Online) collaborate in a closed loop.
- The one-line story: Actor proposes new configs from skillhub domain knowledge and Pareto-frontier elite candidates → Critic filters out hallucinated proposals using format / goal-alignment / explanation-soundness / diversity / output-format rules → Online runs live A/B and collects north-star metrics → Insight extracts patterns via self- and cross-learning → Skill appends these patterns to each skill's `Domain Knowledge` slot, so *next round's prompt is strictly smarter than the last*.
- Online A/B results lift engagement and diversity simultaneously at every stage. The most striking result: re-ranking's Diversity task hits **+3.43% Diversity Metric**, and pre-ranking's Value-Based Retrieval lifts **Engagement Metric 1 by +0.75% and Metric 2 by +0.90%** in tandem. Directly optimizing north-star metrics in a closed loop sidesteps the chronic offline-online proxy alignment gap that plagues every recommender team.
- The cleanest ablation: **Actor-Critic more than doubles single-agent engagement** on Value-Based Retrieval (0.75% vs 0.29%, 0.90% vs 0.26%). The Critic isn't a glorified format checker — it filters out hallucinated proposals before they ever reach an A/B bucket. On backbone choice, Gemini 3 Pro reaches +3.43% diversity vs Flash's +1.69% and 1.5 Pro's +2.11%, supporting the intuition that high-dimensional search-space navigation rewards reasoning depth.
- The limits are blunt. The conference template still reads "Conference acronym 'XX, June 03–05, 2018" (preprint stage), no code release, only one baseline (production tuning), ablations limited to one task per axis, no concrete definition of "Engagement Metric 1/2", and no per-cell statistical significance reporting. Backbone is single-vendor (Gemini), so generalization to GPT or Claude is uncharted. Still, as the first industrial report of *end-to-end system-level config tuning by LLM agents on a production-scale recommender*, the formulation and memory architecture matter more than the model details.

## Introduction

The previous post on this blog — [paper 0010, AudienceLinkNet](/en/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/) — was an industrial report on Rakuten's cross-service knowledge graph for audience expansion. Its weight came not from architectural novelty but from problem formulation: stitching 70+ services into a single KG to sidestep the sparse-seed problem of lookalike modeling. AgenticRecTune sits in the same lane. Every component — Actor-Critic, LLM agents, memory, self-evolving skills — is a paradigm that crystallized in ML/NLP venues over the last year or two. What is genuinely new is the *first industrial closed-loop deployment* of all of these pieces together on a service of Google Discover's scale, applied to multi-stage system-level config tuning.

Industrial-scale recommenders share a standard skeleton: **retrieval → pre-ranking → ranking → re-ranking**. Retrieval cuts hundreds of millions of candidates down to a few thousand; pre-ranking applies a lightweight model to compress further; ranking scores precisely with heavy multi-task models; re-ranking applies list-wise diversity, business rules, and content filters. What academic papers tend to miss is that the dominant production-performance lever is not "a better model for stage X" but rather *how outputs across stage-X model heads are combined* — fusion weights, head weights, dismiss-rate weights, diversity thresholds, demotion weights. A great ranking head with the wrong fusion weights loses online; a mediocre head with the right weights shines. So production teams spend most of their tuning cycles not on training models but on twiddling system-level config.

Existing automation efforts fall into two buckets, each with a fatal limitation for this problem. **Standard AutoML / HPO** (Bayesian optimization, grid search, evolutionary search) is numerically competent but cannot articulate *why* a chosen config is good and isn't aligned with the natural-language production goals teams actually have (e.g., "don't hurt long-term retention while raising short-term engagement"). **LLM-based HPO** (AgentHPO, ML-Agent, etc.) handles natural-language alignment well, but it's been validated only on small-scale offline benchmarks — its behavior on a multi-stage pipeline with *non-differentiable glue* (sorting, top-K, business logic) has been an open question. AgenticRecTune lives at the intersection: use the LLM's reasoning ability, but wrap it in a closed loop that maximizes online north-star metrics directly, collapsing the offline-online alignment gap.

Two reasons make this paper worth reading right now. First, the **division of labor among five agents is well-motivated** — Actor proposing while Critic verifies is the most universal pattern for separating LLM generation from selection, and this paper offers the first quantitative evidence in a live A/B setting that it more than doubles engagement over a single-agent baseline. Second, the **Insight + Skill self-evolving skillhub** — Insight mining patterns from memory and Skill appending them to a Domain Knowledge slot so that the *next round's prompt is strictly smarter* — operationalizes the same idea as [Agentic Context Engineering (Zhang et al., 2025)](https://arxiv.org/abs/2510.04618) but lands it in a production recommender. ACE showed +10.6% on general agent benchmarks and +8.6% on finance reasoning; AgenticRecTune maps that paradigm onto recommender north-star metrics.

## Key Contributions

A blend of the authors' own claims and what feels load-bearing from a reviewer's seat.

- **First industrial end-to-end system-level config optimization.** Pre-ranking, ranking, and re-ranking — *all three* — share the same LLM multi-agent framework. Prior LLM-recommendation work (RecPrompt, RecMind, InteRecAgent) tackled a single stage; this paper takes the multi-stage glue itself as the optimization target.
- **Self-evolving skillhub.** Every cycle, Insight extracts patterns from memory and Skill appends them to a skill's *Domain Knowledge* slot (§4.4). The system never starts from the same prompt twice — last round's lessons are baked into next round's prompt. This is the same "context as evolving playbook" idea as [ACE (Zhang et al., 2025)](https://arxiv.org/abs/2510.04618), applied to a production recommender.
- **Actor-Critic as a hallucination filter.** Actor proposes multiple candidates with natural-language justifications; Critic, a separate LLM instance, screens them against five rules — format validity, alignment with goals, soundness of justification, selection diversity, output-format compliance (Figure 3). Table 3 turns the value of this split into a hard number.
- **Direct use of online A/B, bypassing offline proxies.** The Online Agent deploys candidates directly to Google's production A/B platform, runs the experiment, and reads back north-star metrics (DAU, session time, retention) — not CTR-like offline proxies. The proxy-online alignment gap is sidestepped by design.
- **(Reviewer's angle) Five agents pass Occam's razor.** Five agents feels like a lot at first, but each owns an *orthogonal* responsibility (generation / verification / pattern extraction / knowledge synthesis / execution). The paper explains why Insight and Skill are kept separate: Insight does *inductive pattern extraction*, Skill does *operational synthesis into domain knowledge* — fusing them dilutes attention. Whether or not you agree, the rationale is empirical rather than ornamental.

## Related Work

The paper organizes related work into three clean categories. We trace each and locate AgenticRecTune within it.

### LLMs as recommenders, simulators, and interactive agents

The most direct use is the LLM *as the recommender*. P5 (Geng et al., 2022) unified recommendation tasks under a text-to-text paradigm; RecPrompt (Liu et al., 2024) automated prompt engineering for news recommendation; STARec (Wu et al., 2025) introduced "Fast/Slow" cognition for preference reasoning; MemRec (Chen et al., 2026) maintains a *collaborative memory graph* via a lightweight LM that supplies distilled context to a heavier ranker. InteRecAgent (Huang et al., 2024) and RecMind (Wang et al., 2024) take the conversational-discovery angle. All share the framing that *the LLM produces the recommendation*. AgenticRecTune does the opposite: the LLM tunes the recommender's configuration; the recommender itself remains classical.

### Autonomous ML engineering and HPO

A wave of agents trying to replace the ML engineer. AI Scientist (Lu et al., 2024) and PACEvolve (Yan et al., 2026) automate hypothesis generation and iterative coding. AgentHPO (Liu et al., 2024) proposes a [Creator-Executor LLM agent for hyperparameter optimization](https://arxiv.org/abs/2402.01881) that matches or exceeds human best trials on 12 ML tasks. autoresearch (Ferreira et al., 2026) shows that hybridizing LLMs with classical HPO outperforms either alone. ML-Agent (Liu et al., 2025) uses RL to teach a small model to handle ML engineering tasks. Eureka (Ma et al., 2023) automates reward design itself. [ACE (Zhang et al., 2025)](https://arxiv.org/abs/2510.04618) reframes context as an evolving playbook and separates generation, reflection, and curation, posting +10.6% on agent benchmarks and +8.6% on finance. AgenticRecTune is a direct descendant of this lineage. The difference: not an *offline reward problem* (loss, accuracy) but a *non-differentiable production pipeline*, and not a *numeric reward* but *online A/B north-star metrics*.

### System-level orchestration and direct online metric optimization

A narrower band of recent work tries to automate the recommender itself. AgenticTagger (Xie et al., 2026) uses [LLMs with multi-agent reflection to construct an item-representation vocabulary](https://arxiv.org/abs/2602.05945) used across retrieval, ranking, and re-ranking. Self-EvolveRec (Kim et al., 2026) uses [LLM directional feedback to self-evolve the recommender's source code](https://arxiv.org/abs/2602.12612), a kind of LLM-driven NAS. Wang et al. (2026) build a self-evolving system for YouTube that rewrites neural architectures and loss functions. DualAgent-Rec (Zhang et al., 2025) balances exploration and exploitation within a single epoch via an LLM coordinator. AgenticRecTune's distinguishing move within this band is concrete: every other system rewrites code or mutates model structure (*model editing*); AgenticRecTune leaves the models alone and re-tunes only the system-level glue between them (*system-level orchestration*). That distinction is consequential because it means deploying improvements does not require retraining a model — a major industrial advantage.

## Method / Architecture

The workflow figure compresses everything. Look at Figure 1 first.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/fig1-workflow.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: AgenticRecTune's closed loop. Skill hub and Agent Memory sit in the middle as shared storage. On the left, Actor and Critic run the reasoning loop (Read). On the right, the Online Agent deploys experiments and writes results back (Write). Below, Skill and Insight update memory and skills with mined patterns (Update)."
   zoomable=true %}

The *reasoning loop* (Actor / Critic) on the left reads domain knowledge from the skillhub and elite candidates from memory to propose new configs. The *online experiment loop* (Online Agent) on the right writes the surviving configs into live A/B traffic and collects results. The *self-evolution loop* (Insight / Skill) at the bottom turns accumulated results back into refined domain knowledge for the skillhub. All three loops run concurrently.

### Problem formulation — Multi-Level Compositional Optimization

§3 of the paper is mercifully tidy. Each stage of the recommender has model weights $\mathbf{w}$ and *system-level config* $\theta$:

$$
f_{\text{pre}}(x; \mathbf{w}_{\text{pre}}, \theta_{\text{pre}}), \quad
f_{\text{rank}}(C_1; \mathbf{w}_{\text{rank}}, \theta_{\text{rank}}), \quad
f_{\text{re}}(C_2; \mathbf{w}_{\text{re}}, \theta_{\text{re}})
$$

with $C\_1$ and $C\_2$ being the (compressed) candidate sets passed from the previous stage. Typical configs: $\theta\_{\text{pre}}$ contains CTR-head weight and dismiss-rate weight; $\theta\_{\text{rank}}$ contains CTR weight and heart-rate; $\theta\_{\text{re}}$ contains demotion weight and diversity threshold. The full pipeline composes as

$$
\mathcal{F} = f_{\text{re}}\bigl( f_{\text{rank}}\bigl( f_{\text{pre}}(x; \mathbf{w}_{\text{pre}}, \theta_{\text{pre}}); x; \mathbf{w}_{\text{rank}}, \theta_{\text{rank}} \bigr); x; \mathbf{w}_{\text{re}}, \theta_{\text{re}} \bigr)
$$

with the joint config vector $\Theta = [\theta\_{\text{pre}}, \theta\_{\text{rank}}, \theta\_{\text{re}}] \in \mathcal{P}$. Letting $y\_{\text{true}}$ be the user's implicit/explicit behavior and $M(\mathcal{F}, y\_{\text{true}}) = [M\_1, \ldots, M\_J]$ the vector of evaluated metrics, the paper sets the primary objective as the sum of north-star metrics $\\{M\_1, \ldots, M\_n\\}$ and treats the rest as *guardrails*:

$$
U(M) = \sum_{i=1}^{n} M_i(\mathcal{F}, y_{\text{true}})
\quad \text{s.t.} \quad
M_j(\mathcal{F}, y_{\text{true}}) \ge b_j \quad \forall j \in \\{n+1, \ldots, J\\}
$$

Here $b\_j$ is the floor that a secondary metric (e.g., retention) must not drop below. The full optimization problem is

$$
\Theta^{*} = \arg\max_{\Theta \in \mathcal{P}} \mathbb{E}\_{(x, y\_{\text{true}}) \sim \mathcal{D}} \bigl[ U\bigl(M(\mathcal{F}(x; \mathbf{w}, \Theta), y\_{\text{true}})\bigr) \bigr] \quad \text{s.t.} \quad \mathbb{E}\_{x \sim \mathcal{D}}[C(\Theta)] \le C_{\max}
$$

with $C(\Theta)$ a system-cost function (latency, infra). The paper highlights two structural reasons gradient methods fail here: (i) *non-differentiable* operations (sorting, top-K, business logic) break the gradient, and (ii) *multi-metric* trade-offs are intrinsic. Both motivate the move from gradient-based optimization to LLM-reasoning-based search.

### 4.1 Reasoning Loop: Actor + Critic

#### Actor: structured prompt construction and proposal

Each cycle, the Actor builds a heavily structured prompt by stitching together task context, constraints, retrieved skillhub domain knowledge, and elite candidates from memory. The prompt template includes:

- **What is the optimization task** (e.g., "configure utility curves for Value-Based Ranking")
- **Parameter descriptions** with allowed ranges
- **Task requirement** with quality / engagement / CTR trade-offs
- **North-star metrics** with directionality ("DAU: Neutral-to-Positive", etc.)
- **Domain knowledge** ("if DAU is negative: ...", "if Impressions is negative: ...")
- **Elite configurations** from the current Pareto frontier
- **Initial configuration parameters** to anchor exploration

The exact format is visible in Figure 2 (left). The Actor returns *max\_proposals* new configs, each paired with a natural-language justification — for downstream traceability.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/fig2-3-actor-critic-prompts.png"
   class="img-fluid rounded z-depth-1"
   caption="Figures 2 & 3: Actor (left) and Critic (right) prompt templates. The Actor receives a reasoning context for Value-Based Ranking utility curves; the Critic screens proposals through (1) validity checks, (2) goal alignment, (3) explanation soundness, (4) selection diversity, and (5) output format (XML)."
   zoomable=true %}

#### Critic: verification and refinement

The Critic, instantiated as a separate LLM, evaluates each proposal against five rules (Figure 3):

1. **Validity** — type/format errors, range violations
2. **Alignment with goals** — match to optimization objectives and metric priorities
3. **Explanation soundness** — is the Actor's justification logically consistent and plausible from the parameter description?
4. **Selection diversity** — pick a *diverse* set, drop near-duplicates
5. **Output format** — XML envelope with `<proposal>` blocks preserving `<hypothesis>` and `<config>`, plus a new `<justification>` tag where the Critic itself explains *why* this proposal was selected

That fifth rule is doing real work. Forcing the Critic to record its own justification turns it from a syntactic checker into a *meta-reasoner* whose reasoning is also persisted to memory. Survivors are written to Agent Memory.

### 4.2 Online Experiments

#### Code generation

The Online Agent converts abstract parameter values (e.g., `ast_vbr = {...}`) into concrete production code, scripts, or config files. This is the conversion layer that turns reasoning artifacts into deployable changes.

#### A/B task generation

The agent then schedules an experiment on the production A/B platform: traffic allocation, control vs treatment mapping, minimum horizon for statistical significance. A *human review* happens *before* the experiment goes live — an honest design choice that acknowledges industrial reality (no automated pipeline pushes config to production-scale traffic without a human gate).

#### Results collection

After the experiment concludes, the agent pulls north-star metrics and significance results from the platform API and writes them back into the memory item. That data is ground truth for the next round's prompt and for skillhub self-evolution.

### 4.3 Agent Memory

Memory isn't a flat log. Each record carries id name, config string, explanation, proposed time, status, results, and evaluation-check info. The Critic writes new records, the Online Agent updates them with results, and the Actor reads elite items at the start of the next cycle.

- **Memory pruning** — the Insight Agent periodically prunes redundant activity logs and keeps a *strictly dominated* top-performer pool. If candidate A is dominated by candidate B across every metric, A is archived.
- **Diversity maximization** — candidate distances are standardized so that no high-magnitude metric dominates the selection; greedy selection iteratively adds the farthest candidate to keep the pool varied.

### 4.4 Self-Evolving Skill — the genuinely fresh part

Each Skill is a plugin for one optimization task with six slots:

- **Task Context** — which component of the recommender to optimize
- **Task Requirement** — allowed search space, output JSON schema, infra constraints
- **North Star Metric** — primary and secondary, with directionality
- **Initial Configuration Parameters** — the current production baseline
- **Domain Knowledge** — task-specific heuristics, historical logs, expert guidelines
- **Tools** — executable functions (A/B deploy, metric query, significance test)

Static skills are written once and frozen. AgenticRecTune's skills evolve through two mechanisms.

#### 4.4.1 Dynamic knowledge extraction

The Insight Agent operates in two modes:

- **Self-learning**: comparing repeated trials of the same task to extract sensitivity patterns — which parameter, in which direction, moves which metric, by how much. E.g., "aggressively increasing diversity penalty consistently degrades overall engagement" becomes a learned negative pattern.
- **Cross-learning**: a MapReduce strategy across tasks — parallel pattern extraction (Map) followed by global synthesis (Reduce). Yields cross-task macro rules.

Extracted patterns are appended to the corresponding skill's Domain Knowledge slot by the Skill Agent. At the same time, the skill's Task Requirement *tightens dynamically* — if "diversity penalty above 0.7 fails" is learned, next round's search space excludes that region. This is how each skill learns its own bounds.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/fig4-cross-study.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Per-curve impact and learned patterns from cross-study analysis. lvr_curve emerges as the strongest lever on DAU, impressions, and clickbait; ctr_curve acts as the 'Volume Driver' for CTR; cg_curve (strict) is a 'Safety Regressor' that suppresses clickbait but also cuts DAU. These rules are committed to the skill's Domain Knowledge."
   zoomable=true %}

#### 4.4.2 Novel skill generation

The Skill Agent can synthesize *entirely new skills* from accumulated cross-task patterns without human authorship. For example, "Diversity Maximization Under Engagement Floor" can emerge as a cross-pattern of existing Diversity and Engagement-Stability skills.

Together, these two mechanisms turn the skillhub into a *learning engine* rather than a static rulebook. That justifies the "Self-Evolving" in the title.

## Training Objective / Loss

The LLMs are not fine-tuned. Everything operates through prompts and in-context information. There is no gradient-based loss; the optimization target is the multi-level compositional utility $U(M)$ from §3.

$$
\Theta^{*} = \arg\max_{\Theta \in \mathcal{P}} \mathbb{E}\_{(x, y\_{\text{true}}) \sim \mathcal{D}} \bigl[ U\bigl(M(\mathcal{F}(x; \mathbf{w}, \Theta), y\_{\text{true}})\bigr) \bigr] \quad \text{s.t.} \quad \mathbb{E}\_{x \sim \mathcal{D}}[C(\Theta)] \le C_{\max}
$$

The LLMs do receive two implicit "loss-like" signals. (1) The Critic's five-rule alignment score acts as an implicit *cross-rule loss* over Actor outputs. (2) The Insight Agent's sensitivity patterns — relationships between parameter deltas and metric deltas — serve as an *implicit gradient surrogate*. Both signals accumulate in the skillhub's Domain Knowledge slot and shape next-round prompts.

## Training Data and Pipeline

There is no traditional supervised dataset. Data is the *result of live A/B experiments*. Setup, briefly:

| Field | Value |
|------|------|
| System | Google Discover (feed recommendation) |
| Stages | pre-ranking · ranking · re-ranking |
| Backbone LLM | Gemini 3 Pro (default) / Gemini 3 Flash / Gemini 1.5 Pro (ablation) |
| Traffic split | users → orthogonal buckets, random partition |
| Control | current production baseline config |
| Treatments | agent-proposed config candidates (variable max_proposals) |
| Horizon | standard launch period with statistical significance (p < 0.05) |
| Primary metrics | "Engagement Metric 1", "Engagement Metric 2", "Diversity Metric" — exact definitions undisclosed |
| Human gate | review immediately before A/B launch |

Per cycle, the cost is asymmetric. The reasoning loop runs $O(\text{num proposals})$ LLM calls (Actor + Critic), the self-evolution loop adds one or two calls (Insight + Skill), and the Online Agent's code generation adds one. All of this is negligible compared to running an extra A/B bucket on a production-scale recommender — the ROI is obvious.

## Experiments

### Online A/B: positive lift at every stage

The headline is Table 1.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/tab1-task-stages.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Lift per stage. Pre-ranking's Value-Based Retrieval produces the largest engagement lifts (0.75% / 0.90%); re-ranking's Diversity task produces the largest diversity lift (3.43%)."
   zoomable=true %}

Every stage produces positive lift over production baseline.

- **Pre-ranking (Value-Based Retrieval)**: Engagement 1 +0.75%, Engagement 2 +0.90%, Diversity +0.48%. The lightweight retrieval model's utility curves get re-tuned, and because it sits at the top of the funnel, downstream stages compound the gain.
- **Ranking (Value Fusion)**: Engagement 1 +0.62%, Engagement 2 +0.19%, Diversity +0.06%. Fusion-weight tuning across multi-task heads. The search space is largest here and trade-offs sharpest, so simultaneous improvement is harder.
- **Re-ranking (Diversity)**: Engagement 1 +0.21%, Engagement 2 +0.29%, **Diversity +3.43%**. List-wise diversity-threshold and topic-balance tuning. By far the most dramatic single result.

The interesting fact is that *engagement and diversity move up together*. Diversity penalties usually trade against engagement; AgenticRecTune pushes the trade-off frontier outward.

### Why does it work?

The paper's per-stage interpretation, condensed:

- **Pre-ranking**: the LLM surfaces *high-dimensional parameter interactions* that engineers miss — couplings between multi-head weights that grid search struggles to expose. The Insight Agent's accumulated memory makes these couplings legible.
- **Ranking**: heterogeneous score scales across sub-models make the fusion weight space hostile to grid search. The LLM's reasoning navigates it more efficiently.
- **Re-ranking**: list-wise constraints (topic diversity, content-fatigue mitigation, business rules) introduce strong non-linearities. The iterative feedback loop finds the *specific* configuration that lifts diversity without sacrificing engagement.

## Results Analysis / Ablation

### Model ablation — Gemini 3 Pro dominates on diversity

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/tab2-model-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: Backbone LLM ablation on the same task (re-ranking Diversity). Gemini 3 Pro's +3.43% diversity metric clearly outpaces the alternatives."
   zoomable=true %}

Three backbones, same task:

- **Gemini 3 Pro**: 0.21% / 0.29% / **3.43%** — most balanced
- **Gemini 3 Flash**: 0.08% / 0.07% / 1.69% — cheap but weak everywhere
- **Gemini 1.5 Pro**: 0.22% / 0.27% / 2.11% — close to 3 Pro on engagement but 32% short on diversity

Two takeaways. (i) On the first two engagement metrics, Pro-tier models are roughly equivalent — alignment alone is enough. (ii) The Diversity Metric is where *high-parameter reasoning* matters: list-wise threshold tuning needs the longer-context, deeper multi-step reasoning that the newer Gemini 3 architecture provides. The paper draws the same conclusion explicitly.

Flash's weakness is also interesting. Even on engagement, Flash is about half of 1.5 Pro (0.08% vs 0.22%) — a sign that *short-context backbones cannot fully exploit the skillhub's accumulated domain knowledge*. As prompts grow over many cycles (self-evolving prompts get longer), context window size becomes consequential.

### Strategy ablation — the Critic earns its keep

{% include figure.liquid loading="eager"
   path="assets/img/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/tab3-strategy-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: Actor-Critic vs single-agent on Value-Based Retrieval. Engagement lifts more than double; diversity lifts 8×."
   zoomable=true %}

This table is the paper's strongest quantitative argument.

- **Actor-Critic**: 0.75% / 0.90% / 0.48%
- **Single-Agent**: 0.29% / 0.26% / 0.06%

Engagement metrics jump **2.5–3.5×**, and diversity rises **8×**. The paper's mechanism: *the Critic intercepts hallucinated proposals before they hit A/B traffic*. A meaningful share of a single agent's proposals are format-violating, range-violating, or nonsensical, and those drag the engagement-weighted average down. Separating generation from selection is the most universal way to mitigate LLM hallucination — and here it pays off in real production metrics.

A second-order observation: the Critic's effect is *disproportionately larger on diversity*. A bad diversity-threshold proposal can collapse list quality wholesale; the Critic's filtering is therefore worth more on this axis than on engagement.

## Limitations and Critical Assessment

### Author-acknowledged limitations

§6 is short. The paper notes successful deployment and good multi-shifting-target alignment, but there is no explicit limitations section.

### Reviewer-visible limitations

- **Irreproducibility.** No code released. "Engagement Metric 1/2" — is that CTR? Dwell? Re-visit rate? Unknown. The Diversity Metric definition is also undisclosed. As a Google-Discover-internal artifact, external researchers cannot independently verify the results. An anonymized synthetic benchmark would have helped.
- **Single-vendor LLM.** Every backbone is Gemini (3 Pro / 3 Flash / 1.5 Pro). Generalization to GPT-4, Claude, or Llama is uncharted. Whether the multi-agent framework holds independent of vendor, or relies on specific instruction-following traits of Gemini, is an open question.
- **Narrow ablation coverage.** Strategy ablation runs only on Value-Based Retrieval; model ablation runs only on the re-ranking Diversity task. A 3 tasks × 3 models × 2 strategies design (18 cells) would have been the natural read-out.
- **Statistical significance reporting.** §5.1 mentions "evaluated at p < 0.05", but per-cell p-values and confidence intervals are missing from Tables 1–3. A +0.06% diversity lift is hard to read without an interval.
- **Conference template artifacts.** The "Conference acronym 'XX, June 03–05, 2018, Woodstock, NY" header is still present (preprint stage), and some references are generic placeholders ([4, 7] for Compositional Optimization). The paper feels like a production team's report shaped into venue form rather than a finalized submission.
- **No comparison baselines.** Standard Bayesian HPO, evolutionary search, AgentHPO, ACE — none appear as direct baselines in the experiments. Only "production tuning" stands opposite AgenticRecTune. Claiming LLM-agent superiority over standard HPO requires running one of those in another bucket. The paper makes a qualitative case ("existing automation can't navigate live A/B") but skips the quantitative comparison.
- **Missing cost report.** No LLM call counts, infra cost, or wall-clock cycle time. ROI claims would benefit from numbers.
- **Long-horizon skillhub stability.** Results cover a handful of cycles. Whether the skillhub converges, diverges, or oscillates over many months of self-evolution — and whether ACE's *brevity bias* and *context collapse* hit at scale — remains unaddressed.

## Takeaways

- **System-level config is a lever as load-bearing as model architecture.** Production performance is decided by the glue between model heads — fusion weights, thresholds, demotions — more than by the heads themselves. The community has spent a decade optimizing models; this paper makes a concrete case that the next decade's gains are upstream of that.
- **Generation-selection separation is the most direct LLM hallucination mitigation.** Actor-Critic doubles engagement because *the Critic stops bad proposals from reaching A/B*. Any production-LLM-decision pipeline should default to a second-agent verifier rather than relying on the first agent's self-correction.
- **Self-evolving prompts substitute for fine-tuning at the system level.** The Domain Knowledge slot updates every round; without any weight learning, the system gets monotonically smarter. [ACE (Zhang et al., 2025)](https://arxiv.org/abs/2510.04618)'s evolving-playbook paradigm holds in industrial recommenders, not just on AppWorld and finance benchmarks.
- **Direct online-metric optimization closes the alignment gap.** Offline CTR-style proxies and online DAU / retention are the perennially mismatched pair. AgenticRecTune's biggest alignment win is simply *using the north star as the reward*, with no proxy in the loop.
- **Recommender automation is shifting from *model automation* to *system automation*.** AutoML and NAS automated model search; AgenticRecTune automates the orchestration on top of fixed models. Expect the next several years of recommender R&D to drift toward system-level orchestration tracks at top venues.

## References

- Paper: [arXiv:2604.26969](https://arxiv.org/abs/2604.26969)
- System: [Google Discover](https://discover.google.com/)
- Related paradigm: [Agentic Context Engineering (ACE)](https://arxiv.org/abs/2510.04618) — context as an evolving playbook

## Further Reading

- **[Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models](https://arxiv.org/abs/2510.04618)** (Zhang et al., 2025) — context as an evolving playbook; separates generation, reflection, and curation. Same fundamental idea as AgenticRecTune's self-evolving skillhub.
- **[Large Language Model Agent for Hyper-Parameter Optimization (AgentHPO)](https://arxiv.org/abs/2402.01881)** (Liu et al., 2024) — Creator-Executor LLM agents for ML hyperparameter optimization. The single-task offline ancestor of AgenticRecTune's Actor-Critic.
- **[Self-EvolveRec: Self-Evolving Recommender Systems with LLM-based Directional Feedback](https://arxiv.org/abs/2602.12612)** (Kim et al., 2026) — LLM directional feedback to self-evolve a recommender's source code. AgenticRecTune retunes configs only; this one rewrites model code.
- **[AgenticTagger: Structured Item Representation for Recommendation with LLM Agents](https://arxiv.org/abs/2602.05945)** (Xie et al., 2026) — LLM multi-agent reflection to construct an item-representation vocabulary, used across the recommendation pipeline. A sibling effort from the same broad research community (Google and UCSD).
- **[MemRec: Collaborative Memory-Augmented Agentic Recommender System](https://arxiv.org/abs/2601.08816)** (Chen et al., 2026) — manages collaborative user-item co-engagement memory via a lightweight LM. AgenticRecTune's memory is over system-level configs; MemRec's is over users and items.
- **[Graph-Based Audience Expansion Model for Marketing Campaigns](/en/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/)** (Rahman et al., SIGIR 2024) — the previous post on this blog. Rakuten's cross-service knowledge graph for lookalike modeling. A useful companion read as another industrial-scale recommender-system report.

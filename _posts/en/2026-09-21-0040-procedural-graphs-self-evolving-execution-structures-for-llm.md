---
layout: post
title: "[Paper Review] Procedural Graphs: Self-Evolving Execution Structures for LLM Agents"
date: 2026-09-21 08:18:01 +0900
description: "How Procedural Graphs guide agent actions and evolve through validation, with results across seven benchmarks, token costs, and limits of procedural generalization."
tags: ["llm-agents", "procedural-memory", "graph", "self-improvement", "tool-use"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/fig2-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/
ko_url: /papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Yuxing Lu, Yicheng Chen, Shanchan Wu, Sercan Ö. Arık (Google · Georgia Tech · Peking University) |
| Venue | arXiv · 2026 |
| arXiv | [2609.09153](https://arxiv.org/abs/2609.09153) |
| Code | [YuxingLu613/Procedural-Graph](https://github.com/YuxingLu613/Procedural-Graph) |
| Data | HotpotQA · MultiChallenge · GDPval · ALFWorld · τ-bench · BFCL v3 · EnterpriseArena |
| <span style="white-space: nowrap">Review date</span> | 2026-09-21 |

## TL;DR

- A Procedural Graph (PG) stores tools, reasoning steps, and states as nodes, with conditions and execution advice attached to transitions. At each step, a guidance model interprets the current node's 2-hop neighborhood using recent execution history.
- Model weights remain fixed. Training trajectories drive graph edits; structurally valid candidates are accepted when held-out validation performance does not decrease. The graph remains frozen within episodes and at test time.
- PG records 19 wins, two ties, and three losses against the strongest baseline in each of 24 main-table settings. Gemini 3.5 Flash reaches 67.00% on BFCL v3 versus the best baseline's 58.00%.
- A separate ten-round EnterpriseArena experiment returns a graph with 85% test survival. The 95% intermediate test peak and Flash's 0% survival in the separate 50-episode comparison describe different results.
- Local guidance costs fewer tokens than full-graph generative guidance, but more than the no-graph baseline. Fewer solver steps do not imply lower total inference cost.

## Introduction

An agent asked for an airfare can find the correct price and still fail by continuing into payment and booking. A financial agent can correctly recognize a cash shortage and still act too late because financing takes months to arrive. These failures concern the timing, scope, and sequence of actions. Having the relevant facts available is only part of the problem.

A conventional ReAct solver reconstructs procedural context from the question and an expanding history of actions and observations. Experience summaries can help, but the solver must still decide where each lesson applies. Explicit workflows provide stronger structure, although a rigid execution order can make exceptions difficult to handle.

[Procedural Graphs](https://arxiv.org/abs/2609.09153), by Lu et al., introduce an editable representation between these extremes. The graph records possible transitions and their conditions. A guidance model turns the relevant neighborhood into advice for the current step, while an offline loop revises the graph using execution feedback. This review follows the 36-page arXiv v1, including its implementation details and supplementary experiments.

## Key Contributions

- **External procedural memory:** reusable action transitions and conditions stored outside model weights.
- **Progress-conditioned guidance:** connected local structure interpreted alongside the current query and recent trajectory.
- **Validation-gated evolution:** node, edge, and attribute edits evaluated before adoption, with rejected proposals retained as negative evidence.
- **Broad empirical analysis:** comparisons across seven benchmarks, including recovery from harmful initial graphs and explicit measurement of inference overhead.

## Related Work / Background

### Semantic and procedural memory

A knowledge graph usually connects facts: an artist to a painting, or a painting to a museum. Procedural memory instead represents how to act under particular conditions. The paper draws on [CoALA](https://arxiv.org/abs/2309.02427), which distinguishes working, episodic, semantic, and procedural memory in language agents.

Storage format alone does not determine the memory's function. A graph of past events can still be episodic memory. PG aims to represent reusable transitions, such as checking a result before submitting it, rather than merely preserving what happened in one earlier task.

{% include figure.liquid loading="eager" path="assets/img/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/fig1-knowledge-procedure.png" class="img-fluid rounded z-depth-1" caption="Figure 1: Factual relations on the left and action transitions on the right; procedure triplets and next-step guidance alongside entity triplets." zoomable=true %}

### AutoGuide, AWM, and KnowAgent

[AutoGuide](https://arxiv.org/abs/2403.08978) is particularly close: it extracts conditional guidelines and selects them for the current context. [Agent Workflow Memory](https://arxiv.org/abs/2409.07429) induces reusable routines. The paper's KnowAgent baseline supplies textual action-transition knowledge. Conditional or procedural knowledge is therefore not unique to PG.

The contribution is the combination of attributed transitions, connected local retrieval, and explicit structural refinement. Retrieving submission advice in isolation can lose its relationship to verification. A connected procedure can preserve that relationship. However, PG's default neighborhood expands outgoing edges from the current node; it is not an exhaustive backward search that proves every prerequisite has been satisfied.

## Method / Architecture

### 1. Procedure triplets and edge attributes

The formal representation is:

$$
\begin{aligned}
G&=(V,R,E,\Phi),\\
E&\subseteq V\times R\times V.
\end{aligned}
$$

Nodes represent tool functions, skills, reasoning steps, or task states. An edge connects a source procedure to a possible successor under a relation. The experiments use `LEADS_TO`, `TRIGGERS`, `PROVIDES_INPUT_FOR`, and `CONVERGES_TO`. Three textual attributes describe each transition:

| Attribute | Purpose | Financial-planning example |
|-----------|---------|----------------------------|
| `condition` | Applicability | Projected cash runway below a safety buffer |
| `guidance` | Next action and rationale | Request funding early enough for delivery |
| `pitfalls` | Errors to avoid | No additional request while one is pending |

These fields provide interpretable procedural knowledge, but natural-language conditions are not executable constraints. The environment's actual validation rules remain separate.

The graphs are relatively small. Outside BFCL v3, Table 7 reports 7–17 nodes and 7–27 triplets. BFCL uses 131 nodes and 265 triplets, reflecting its larger function catalog. This supports the usefulness of compact procedures; it does not establish scalability to arbitrarily large operational graphs.

### 2. Active-node localization and local retrieval

At each decision step, PG matches the previous procedure to a graph node and expands outgoing transitions for up to h hops. The default is h=2. If matching fails, guidance falls back to the entire graph. The initial step is localized at `Start`.

$$
\begin{aligned}
u_t&=\operatorname{Match}(a_{t-1},V),\\
G_t&=\begin{cases}
\mathcal{N}_h(u_t),&u_t\neq\varnothing,\\
G,&\text{otherwise},
\end{cases}\\
g_t&=\Psi(G_t,q,\mathcal{T}_{t-w:t}).
\end{aligned}
$$

Here q is the query, T is the action-observation history, and Ψ is the guidance model. Guidance uses the most recent w=3 trajectory steps. This window limits the guidance input; it does not mean that the solver forgets everything before those steps.

The two-hop horizon also does not involve executing two speculative actions. It exposes stored procedural possibilities. PG retrieves a structural context rather than estimating future outcomes through rollout search.

### 3. Generative guidance and action selection

{% include figure.liquid loading="eager" path="assets/img/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/fig2-framework.png" class="img-fluid rounded z-depth-1" caption="Figure 2: Procedural representation, active-node localization and 2-hop guidance generation, followed by trajectory-based refinement and validation gating." zoomable=true %}

The guidance model combines the local graph, query, and recent observations to identify a useful next step and relevant pitfalls. That advice enters the solver prompt:

$$
a_t\sim P_{\mathrm{solver}}(\cdot\mid q,\mathcal{T}_t,g_t).
$$

The solver retains action-selection freedom. PG does not mask all actions outside the graph or guarantee compliance through constrained execution. This explains both its flexibility and the limits of its safeguards.

Appendix B.5 illustrates a HotpotQA context that connects first-hop retrieval, inspection of evidence, and extraction of a bridge entity. Interestingly, the local serializer example omits the stored relation labels while preserving transitions and attributes. The results therefore support the combined representation and guidance mechanism, not an isolated claim about the value of particular relation names.

### 4. Trajectory-driven graph edits

Offline evolution starts by running training tasks with the currently retained graph. The refiner compares higher- and lower-scoring trajectories, then proposes additions and deletions of nodes and edges. Attribute updates use the same interface: delete an edge and re-add it with revised fields.

Edits apply to a copy, with deletions before additions. Candidate preparation checks types, edge endpoints, and reachability to a terminal node. When cycles are disallowed, detected cycle-closing edges are removed before validation; cycle repair and acyclicity checks are skipped when cycles are permitted.

Two details limit what structural validity means. A terminal node is any node with zero out-degree, not necessarily one named `End`. And although the refiner prompt requires ACTION names to match available tools, the generic validator does not independently enforce tool-catalog membership. Structural validity is weaker than complete execution validity.

### 5. Rejection memory and retained checkpoints

Structurally invalid candidates are rejected before validation rollout. Candidates with lower validation scores are rejected afterward. Their edits, candidate graphs, associated training traces, and validation outcomes or structural diagnostics are stored as rejection memory for later proposals.

When trajectory context exceeds its token limit, the beginning is discarded and the ending preserved. This retains outcomes but can lose early causes. Crucially, the next round starts from the last accepted graph, not the last proposed candidate. Algorithm 1 maintains that graph and its cached validation score, then returns the retained graph after the round budget expires.

## Learning Objective / Evaluation Criteria

### Validation score and acceptance rule

There is no additional gradient loss for model weights. Graph edits are selected by mean held-out task performance:

$$
\begin{aligned}
S_{\mathrm{val}}(G)
&=\frac{1}{|\mathcal{D}_{\mathrm{val}}|}
\sum_{(q,y)\in\mathcal{D}_{\mathrm{val}}}
S(f_{\mathrm{solver}}(q\mid G),y),\\
G_k&=\begin{cases}
G_k^{\mathrm{cand}},&S_{\mathrm{val}}(G_k^{\mathrm{cand}})\geq S_{k-1},\\
G_{k-1},&\text{otherwise}.
\end{cases}
\end{aligned}
$$

Here the indexed score is the cached validation score of the previously retained graph. Ties are accepted. The incumbent is not necessarily re-evaluated alongside every new candidate. The rule maintains a nondecreasing recorded selection score; it does not prove monotonic improvement in expected performance.

Test scores are not the selection objective. Reporting the best test result encountered across rounds would turn test data into a checkpoint-selection instrument. This distinction matters directly to the EnterpriseArena results below.

### EnterpriseArena survival and enterprise score

EnterpriseArena simulates a lending institution for up to 132 months. Negative cash triggers bankruptcy. Funding arrives 1–6 months after a request, and undisclosed crises occur at months 32, 59, and 112.

Full survival measures completion of the entire horizon. Average lifespan includes early failures. Monthly enterprise score combines five times trailing annual revenue with cash and subtracts USD 5,000 per cumulative information-tool call; shorter revenue histories are annualized. Bankruptcy makes the current score zero. Scores are averaged over recorded months up to termination and then across runs, so a failed run can retain a positive time-averaged score.

`Tools/Mo` averages each run's ratio of information-tool calls to elapsed months, excluding memory operations and state-changing actions. `Raised` measures financing actually received. Neither quantity is total LLM cost or a direct measure of profitability.

## Training Data and Pipeline

### Seven benchmarks and separate evaluation settings

| Benchmark | Train / Test | Main evaluation |
|-----------|--------------|-----------------|
| HotpotQA | 1,000 / 1,000 | Multi-hop QA with tools |
| MultiChallenge | 100 / 166 | Constraint retention across dialogue |
| GDPval | 88 / 44 | Professional deliverable rubric scores |
| ALFWorld | 238 / 134 | Unseen household-task success |
| τ-bench | 500 / 115 | Retail-domain final-state Pass@1 |
| BFCL v3 | 100 / 100 | Base-category multi-turn accuracy |
| EnterpriseArena | 50 / 50 | Survival, lifespan, enterprise score |

These are the main-comparison splits. The construction study uses 1,000/1,000/1,000 train/validation/test examples for HotpotQA and 100/100/56 for MultiChallenge. The ten-round EnterpriseArena study uses 20/20/20 episodes.

Metrics also differ. Main-table HotpotQA accuracy uses a Gemini 3.1 Pro judge to assess answer equivalence; the construction study reports string Exact Match and word-level F1. MultiChallenge uses a Gemini 3.1 Pro judge, while GDPval uses task-specific rubrics. Results from these settings should not be treated as interchangeable measurements.

### Models and comparison budgets

The four main solvers are Claude Sonnet 4.6, Gemini 3.1 Pro, Gemini 3.5 Flash, and Grok 4.1 Fast. Within a configuration, guidance and refinement use the same underlying LLM as the solver, with temperature 0. Appendix D.3 specifically gives a frozen Flash snapshot, top-k=1, and output limits of 2,048 tokens for the agent and 8,192 for the refiner in the construction study.

Methods share a ReAct solver and tool interface, and learning-based baselines use the same training material. This does not equalize calls or tokens. Incremental evolution uses batches of 100 HotpotQA or 20 MultiChallenge samples. The construction labels' “online evolution” means updates between training batches; the graph remains fixed during episodes and test evaluation.

## Experimental Results

### Main-table gains and three exceptions

{% include figure.liquid loading="eager" path="assets/img/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/tab1-main-results.png" class="img-fluid rounded z-depth-1" caption="Table 1: Four models across six benchmarks, with 95% confidence intervals in brackets; GDPval rubric scores and percentage accuracy, success, or Pass@1 elsewhere." zoomable=true %}

PG places first or joint first in 21 of 24 settings: 19 wins, two ties, and three losses against the strongest baseline per setting. The reported one-sided exact sign-test p-value, excluding ties, is 0.00043. This summarizes consistency of improvement; it does not establish significance for every individual cell.

The larger margins include Flash's BFCL v3 accuracy of 67.00% versus 58.00%, Pro's GDPval score of 78.78 versus RAP's 71.37, and Pro's τ-bench Pass@1 of 80.00% versus RAP's 73.04%. PG beats all baselines under all four models on GDPval and BFCL.

The exceptions are Sonnet's HotpotQA, where PG's 74.50% trails AutoGuide's 75.40%; Grok's ALFWorld, where 39.55% trails ExpeL's 42.54%; and Grok's τ-bench, where 67.83% trails KnowAgent's 68.70%. HotpotQA margins range from -0.90 to +1.30 points. Procedural guidance does not improve every task equally.

### EnterpriseArena survival and tool use

{% include figure.liquid loading="eager" path="assets/img/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/fig3-survival.png" class="img-fluid rounded z-depth-1" caption="Figure 3: Survival percentages above and cash in USD millions below each model; elapsed months on the horizontal axis, crisis markers, and PG in blue." zoomable=true %}

In the 50-test-episode comparison, PG increases full-horizon survival from 44% to 58% for Sonnet, 6% to 34% for Pro, and 26% to 40% for Grok. All Flash configurations have 0% full survival, although PG increases mean lifespan from 33.58 to 40.62 months. “Joint highest” includes this zero-survival tie.

{% include figure.liquid loading="eager" path="assets/img/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/tab8-enterprise.png" class="img-fluid rounded z-depth-1" caption="Table 8: Full-horizon and crisis survival percentages, mean lifespan in months, enterprise score and received financing in USD millions, and information-tool calls per month." zoomable=true %}

Information-tool usage falls from 18.94 to 12.53 calls per month for Flash, but rises from 0.13 to 0.36 for Sonnet and 0.89 to 3.18 for Pro. Some agents over-query; others omit useful forecasts. The useful intervention concerns which checks happen when, rather than uniformly reducing calls.

Survival and score also diverge. Sonnet's PG score is USD 70.38M versus the baseline's USD 78.86M. Flash's PG score of USD 29.08M trails MemoryBank's USD 29.34M. Grok's PG score, USD 39.62M, is the best within its comparison. Resilience, average value, and low tool use remain distinct objectives.

## Analysis / Ablation

### Initialization and iterative validation

Modes 1–3 start from an expert graph: fixed, updated once, or evolved incrementally. Modes 4–5 start from `Start → End`: built once or evolved incrementally. One-time Modes 2 and 4 commit without a validation gate; Modes 3 and 5 use iterative feedback and validation.

{% include figure.liquid loading="eager" path="assets/img/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/tab2-construction.png" class="img-fluid rounded z-depth-1" caption="Table 2: Five PG construction modes with Gemini 3.5 Flash; HotpotQA EM and F1, plus category and overall success percentages on the 56-item MultiChallenge test split." zoomable=true %}

HotpotQA Mode 5 reaches F1 78.79 versus 71.21 unguided, and EM 66.30 versus 58.80. Yet one-time scratch construction reaches only F1 69.49. Minimal initialization alone is insufficient.

On MultiChallenge, the expert graph reduces success from 87.50% to 58.93%; its one-time update drops further to 53.57%. Iterative expert refinement recovers to 92.86%, while iterative scratch construction reaches 91.07%. This supports correction of a harmful prior, not a general claim that expert knowledge is unnecessary.

Appendix F.2 illustrates the repair: an earlier graph leads the agent to evaluate whether a dialogue obeyed passive-voice constraints instead of producing the requested joke. A later candidate removes a premature finishing transition and adds guidance to answer the user. The success indicator changes from zero to one, but topology and text change together, preventing a clean attribution to either alone.

### Local guidance and token overhead

{% include figure.liquid loading="eager" path="assets/img/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/tab3-efficiency.png" class="img-fluid rounded z-depth-1" caption="Table 3: Raw full-graph injection, full-graph generation, and local generation using the same graph; task performance, average tokens, and solver steps per sample." zoomable=true %}

ALFWorld success is 72.58% without a graph, 70.34% with raw full-graph injection, 54.48% with full-graph generative guidance, and 81.53% with local guidance. More complete graph exposure can actively hurt performance.

Localization reduces ALFWorld tokens from 96,360 to 28,064 relative to full-graph generation, a 70.9% reduction. GDPval falls from 448,972 to 367,738, and MultiChallenge from 14,434 to 12,295. However, no-graph consumption is only 18,055, 275,638, and 6,629 respectively.

GDPval steps fall from 28.20 to 18.57 and ALFWorld steps from 21.84 to 18.80, while tokens remain 33.4% and 55.4% above baseline. The extra guidance call matters. Moreover, no raw-local-subgraph row is included, so the table is not a complete factorial separation of localization and generative interpretation.

### Ten evolution rounds and 85% final test survival

The separate Flash study uses 20 episodes per split. Validation begins at 0% survival and 34.8 months of mean lifespan. Round 1 introduces a cash-check, forecast, memory, market-check, and financing sequence, reaching 45% survival. Round 2 adds `recall_notes` and reaches 80%.

{% include figure.liquid loading="eager" path="assets/img/papers/0040-procedural-graphs-self-evolving-execution-structures-for-llm/fig4-evolution.png" class="img-fluid rounded z-depth-1" caption="Figure 4: Mean lifespan in months on the left and financing in USD millions on the right across ten evolution rounds; training in gray, validation in red, and evaluated test checkpoints in green." zoomable=true %}

Rounds 3–6 commit no update; Round 5 fails structural checks before validation. Round 7 prunes `pass_action`. Round 8 removes an unnecessary month-advancing continuation after fundraising because the adapter already advances the month when funding is requested. The graph is learning interface-specific transition semantics as well as general planning advice.

Rounds 8 and 9 reach 90% validation survival. Round 10 falls to 85% and is rejected, returning the Round 9 graph with 85% test survival versus 0% baseline. Round 7 had achieved 95% on test, but choosing it for that reason would select on test performance.

One episode represents five percentage points here. These are search decisions on small samples, not independent significance tests for every edit. The earlier Flash result of 0% in the 50-episode comparison belongs to a different configuration and should not be presented as this experiment's directly comparable starting point.

### Action timing, units, and stopping

The Grok case study shows an unguided agent submitting funding requests while another request is pending. A memory-summary agent also passes amounts of 18 and 20 despite reasoning about millions. The PG trace requests financing earlier and tracks the waiting period. These matched examples illustrate mechanisms, not population-wide error frequencies.

In the BFCL case, both agents obtain a USD 220 airfare. PG reports it and ends the turn; the baseline continues into authentication, payment, and booking, causing a state mismatch. Procedural guidance can support stopping as well as additional action, although one successful trace does not establish universal compliance.

## Limitations and Critical Assessment

### Soft guidance and structural validity

PG makes procedures inspectable, but interpreting conditions and following advice still depend on the model. Reachability to a terminal node does not prove termination of every execution, especially when cycles are allowed. Tool-catalog membership is also not independently enforced by the generic validator.

For deployment, my interpretation is that mandatory permissions and argument constraints should remain environment-enforced rules. Editable guidance can complement those rules; the paper does not establish it as a substitute.

### Validation reuse and component attribution

Repeated selection adapts to the same validation set. Small samples, ties, and cached incumbent scores can make decisions sensitive to noise. Reporting the final 85% test result is appropriate, but independent evolution runs would better characterize variability.

Fresh rollouts, rejection memory, validation gating, topology edits, and attribute changes operate together. The construction comparisons do not isolate each contribution. The official README also clarifies that main-table confidence intervals concern finite test-set size from one greedy run, not variance across repeated training or evolution seeds.

### Interface transfer and total cost

The authors identify transfer across solvers and tool interfaces as future work. Exact action-name matching and adapter-specific procedures make that question substantive. A graph learned under one state-transition convention may fail when a similarly named tool behaves differently.

Offline rollouts, validation, and refinement add to online guidance cost. Repeated use might amortize this investment, but the paper does not establish a general break-even point. Small gains, such as those on HotpotQA, particularly require consideration of latency and total expenditure.

## Takeaways

- **Memory needs an application context:** connect advice to the procedure and conditions under which it should be used.
- **Procedures deserve evaluation:** expert-authored graphs can be harmful and should remain revisable.
- **Local relevance matters:** exposing more graph content does not necessarily improve decisions.
- **Efficiency has multiple units:** distinguish solver steps, environment calls, LLM tokens, and offline preparation.
- **Guidance and enforcement serve different roles:** preserve execution checks alongside editable procedural knowledge.

## Installation and Usage

The [inspected commit](https://github.com/YuxingLu613/Procedural-Graph/tree/9667bdc5f3fce89809429f9ce20188e3e989b9b3) recommends Python 3.10+ and Vertex AI credentials. The following small run assumes a prepared HotpotQA parquet file and model access:

```bash
git clone https://github.com/YuxingLu613/Procedural-Graph.git
cd Procedural-Graph
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credential.json"

PYTHONPATH=src python3 src/experiments/run.py \
  --dataset=hotpotqa \
  --hotpotqa_dataset_path=/path/to/hotpotqa.parquet \
  --num_samples=5 --num_workers=1 \
  --llm=gemini-3.5-flash --llm_location=us-central1 \
  --method=react --guided_only=True \
  --gcp_project="${GOOGLE_CLOUD_PROJECT}"
```

The adapter requires a local file and reads fields including `id`, `question`, `answer`, and `context`. Dataset preparation, credentials, and model-region availability require separate setup. I checked the README and source arguments, but did not run paid evaluations or reproduce the paper's scores. This example is not the complete split-controlled evolution protocol.

## References

- [Paper and arXiv record](https://arxiv.org/abs/2609.09153): v1, 36 pages including references and appendices; source for equations and experimental results.
- [Official implementation](https://github.com/YuxingLu613/Procedural-Graph): graph, guidance, refinement, dataset adapters, and experiment runner.
- Figure and table attribution: Figures 1–4 and Tables 1–3 and 8 from Lu et al. (2026), cited for research discussion and criticism. Copyright remains with the respective rights holders. The [arXiv non-exclusive distribution license](https://arxiv.org/licenses/nonexclusive-distrib/1.0/) does not relicense the paper for unrestricted reuse.

## Further Reading

- **[ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)** (Yao et al., ICLR 2023): The interleaved reasoning-and-action execution pattern underlying the compared agents.
- **[Cognitive Architectures for Language Agents](https://arxiv.org/abs/2309.02427)** (Sumers et al., 2023): CoALA's organization of memory, actions, and decision-making.
- **[AutoGuide: Automated Generation and Selection of Context-Aware Guidelines for Large Language Model Agents](https://arxiv.org/abs/2403.08978)** (Fu et al., 2024): A close predecessor using conditional guidelines distilled from experience.
- **[Agent Workflow Memory](https://arxiv.org/abs/2409.07429)** (Wang et al., ICML 2025): Reusable workflows induced from experience and supplied to later executions.
- **[Can LLM Agents Be CFOs? Benchmarking Long-Horizon Resource Allocation in an Uncertain Enterprise Environment](https://arxiv.org/abs/2603.23638)** (Han et al., 2026): The EnterpriseArena benchmark with delayed financing and liquidity constraints.

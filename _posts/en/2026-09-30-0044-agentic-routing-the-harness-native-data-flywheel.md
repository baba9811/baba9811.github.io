---
layout: post
title: "[Paper Review] Agentic Routing: The Harness-Native Data Flywheel"
date: 2026-09-30 15:24:47 +0900
description: "OpenSquilla's allocation of models by execution state: cost, quality, latency, and routing traces as training data"
tags: [llm-routing, agents, harness, ensemble, cost-efficiency, off-policy-learning]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/fig1-regimes.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0044-agentic-routing-the-harness-native-data-flywheel/
ko_url: /papers/0044-agentic-routing-the-harness-native-data-flywheel/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Xinchen Liu et al. (15 authors, TokenRhythm Technologies) |
| Venue | arXiv · 2026 |
| arXiv | [2607.11399](https://arxiv.org/abs/2607.11399) |
| Code | [TokenRhythm/opensquilla](https://github.com/TokenRhythm/opensquilla) |
| Data | Agent executions on DRACO and PinchBench 1.2.1 |
| <span style="white-space: nowrap">Review date</span> | 2026-09-30 |

## TL;DR

- Agentic Routing allocates a model or model set using the current execution state, including context pressure, tool failures, and verification feedback. OpenSquilla starts with inexpensive filters and a LightGBM ranker.
- On PinchBench, singleton routing scores 93.14 at 0.0204 USD per task, versus 93.35 at 0.2224 USD for OpenClaw with Opus 4.8. Against Opus inside the same OpenSquilla harness, the comparison is 94.33→93.14 with approximately 87.6% lower cost.
- A fixed proposer ensemble reaches 60.82 on DuckDuckGo DRACO at 0.3766 USD per task, but its p95 latency is 3,097 seconds. Coverage differences and latency qualify the quality-and-price comparison.
- The proposed data flywheel reuses execution records to train routers and specialists. The reported operating points do not establish cumulative improvement across multiple generations of that loop.

## Introduction

An agent checking a filename and an agent diagnosing a repeatedly failing test need different capabilities. The same applies to generating a search query versus reconciling conflicting sources in a final research report. Always calling the strongest model makes allocation easy, but routine steps inherit its price and latency. Always calling a smaller model can turn an inexpensive first attempt into an expensive sequence of repairs.

The original request does not reveal the whole problem. A task becomes different after a tool failure, a lossy context compression, or an unsuccessful verification. The harness manages these observations, artifacts, actions, and recovery paths. It therefore holds information that a router looking only at the initial query would miss.

Liu et al.'s [Agentic Routing](https://arxiv.org/abs/2607.11399) makes model allocation part of this execution system. It also proposes recording what the router knew, what it selected, and what subsequently happened as supervision for future policies. This review follows arXiv v1, distinguishing evidence about today's deployed policies from the proposed longer-term training loop.

## Key Contributions

- **Allocation conditioned on execution state.** Model choice incorporates verification, recovery, and context information, with whole-trajectory outcomes as the ultimate target.
- **A shared objective for singletons and ensembles.** An expensive singleton, a cheap singleton, and a composition of cheaper models are compared with aggregation costs included.
- **Arena records separating predictions, actions, and outcomes.** The previous router's choice is an action to evaluate, rather than a correct answer to imitate.
- **Several deployed operating points.** The evaluation separates singleton routing, preselected proposer ensembles, and ensembles assembled by a routing policy at runtime.

## Related Work / Background

### Query routing and execution state

[FrugalGPT](https://arxiv.org/abs/2305.05176) explored model cascades, while [RouteLLM](https://arxiv.org/abs/2406.18665) learned stronger-versus-weaker model selection from preference data. The distinctive argument here concerns the information available during execution. A request to summarize a document can require different capabilities depending on whether the full document is available or retrieval has left only fragments. This is an explanatory example of capability matching, not a measured ablation in the paper.

### Complementarity and selection bias

[Mixture-of-Agents](https://arxiv.org/abs/2406.04692) combines outputs from multiple LLMs. Such composition helps only if additional models contribute something useful: several models missing the same evidence can add cost without reducing error. The relevant property is complementarity at the current state, rather than independent leaderboard rankings.

Learning from routing logs introduces another problem. If a policy always chooses model A in a certain state, its records do not reveal whether B would have succeeded. [Doubly Robust Policy Evaluation and Learning](https://arxiv.org/abs/1103.4601) provides a foundation for combining outcome models with information about the logging policy. More logs alone do not resolve missing alternative outcomes.

## Method / Architecture

### 1. Harness state and per-step model sets

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/fig1-regimes.png" class="img-fluid rounded z-depth-1" caption="Figure 1: Singleton and multi-model execution from harness state, with a shared model pool, aggregation, verification, and a feedback path through execution records." zoomable=true %}

The router receives the task, candidate pool, and current harness state. That state includes observations, raw and compressed context, available actions, artifacts, tool history, recovery status, and verification signals. Its output is a model set and, when needed, a policy for combining results. A conventional fixed-model agent is the special case that always returns the same singleton.

Per-step routing does not mean switching models for every token. Token-level composition and speculative decoding are future directions. Likewise, the broad formulation allows joint adaptation of models and harness configurations, but the reported experiments focus on model allocation while holding surrounding harness policies fixed. This scope matters when attributing gains to routing.

### 2. Four inexpensive matching stages

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/fig2-routing.png" class="img-fluid rounded z-depth-1" caption="Figure 2: Rule-based branching on the left, query-level LLM selection in the middle, and step-level routing with intermediate and terminal feedback on the right." zoomable=true %}

The initial policy avoids asking a large LLM to make every routing decision. It first admits obviously simple, low-risk states to cheap paths, constructs a coarse capability demand, adjusts that demand using execution risks, and matches it to deployed models.

| Stage | Main input | Role |
|-------|------------|------|
| Order admission | Clearly trivial, low-risk states | Cheap fast-path decisions |
| Demand construction | Coding, reasoning, chat, tool-use signals | Coarse capability profile |
| Risk pricing | Context pressure, errors, verification, recovery | Consequences of insufficient capability |
| Capability matching | Remaining candidates and deployment profiles | LightGBM ranking and model/tier binding |

Risk pricing describes the role of anticipating failure and recovery, rather than a fully specified standalone probabilistic model. A cheap call is not economical if it creates repeated tool repairs and eventual escalation. Conversely, a strong model may provide unnecessary capability for a routine formatting step.

LightGBM is the cold-start matching engine, not the agent's reasoning engine. Selected models still generate outputs and interact with tools. The paper treats the ranker as an inexpensive seed for collecting useful execution records; its own overhead must remain below the value of better allocation.

### 3. Proposer selection and state-aware aggregation

For multiple models, a task profile summarizes required capabilities, difficulty, risk, verification availability, budget tolerance, and routing uncertainty. A selector then constructs a proposer subset, considering each additional model's marginal contribution and complementarity with existing members. This differs from blindly taking the top-k independent scores.

Proposers generate candidate outputs, and an aggregator returns one executable result. Depending on the task, useful signals can include tests, patch applicability, schema constraints, factuality, citations, or rubric judgments. These are possible verification mechanisms in the design, not evidence that every benchmark used every mechanism.

Aggregation belongs inside the allocation decision. An expensive final model can erase savings from cheap proposers. A verifier or lightweight selector may suffice elsewhere. Model-set size also differs from call count: the selected DRACO configuration gives additional stochastic samples to some inexpensive proposers.

### 4. Predictions, actions, and outcomes

An arena record stores the task and state, available candidates, estimated capability demand, scores and confidence, selected models and aggregation policy, subsequent traces, verifier events, outcomes, realized cost and duration, and exploration or replay provenance.

Suppose a router confidently selects a small model, which fails and requires repair by a stronger one. The chosen model is not saved as the desired label. Its failure and recovery cost are evidence about that state-action pair. A successful cheap execution provides different evidence, but still does not reveal every unchosen alternative.

The proposal therefore includes uncertainty-triggered escalation and sampled alternative-model or oracle replay. Ensembles observe several candidate outputs at one state, improving coverage. They do not automatically reveal the terminal trajectory that every unexecuted candidate would have produced.

## Training Objective / Loss Function

### Trajectory loss and realized cost

The central target combines task-level loss with cumulative execution cost. Splitting the relationships in Equation (1) gives:

$$
\begin{aligned}
S_t &= g(\mathcal M\mid h_t),\\
\ell(\tau) &= 1-R_{\mathrm{task}}(\tau),\\
C(\tau) &= \sum_{t=1}^{T}\sum_{m\in S_t}c(m,h_t).
\end{aligned}
$$

Here g is the router, h the current state, S the selected model set, and τ the trajectory. The abstract task reward should not be confused with a native DRACO score such as 60.82. The paper targets a Pareto trade-off between expected loss and cost, using cost weights to choose operating points.

The singleton rule in Equation (5) additionally rewards immediate feedback, such as a successful tool call, test, schema check, or LLM judgment. This makes supervision denser without discarding terminal failure or downstream recovery costs.

### Complementarity as an ensemble regularizer

Equation (8) adds a complementarity term. With u denoting a proposer set P and aggregation policy, its state-conditioned objective can be written as:

$$
\begin{aligned}
J(u\mid h_t) ={}& \ell(u\mid h_t)+\lambda C(u\mid h_t)\\
&-\alpha V(P\mid h_t)\\
&-\beta\rho(u\mid h_t).
\end{aligned}
$$

Loss and cost are penalties; complementarity V and immediate reward ρ are benefits. The paper describes a diminishing-returns surrogate using historical error decorrelation, state-conditioned disagreement, and verification feedback. It does not provide enough detail to reconstruct a particular numerical implementation of that surrogate.

Complementarity guides a difficult combinatorial search under noisy trajectory estimates. The proposed schedule reduces its weight as loss estimates improve, rather than rewarding disagreement regardless of usefulness. One theoretical qualification is also necessary: linear scalarization need not recover every point on a discrete, nonconvex Pareto frontier. The objective is a useful operating-point criterion, not a general completeness guarantee.

## Training Data and Pipeline

### Cold start and successive router generations

The proposed progression starts with hand-engineered features and LightGBM, then learns a state encoder and prediction head, and later adds a supply encoder for model profiles. Prices, context limits, latency, tool reliability, and observed task performance describe candidates without fixing the output vocabulary to model names.

| Component | Inputs or function | Evidence scope |
|-----------|--------------------|----------------|
| Initial router | Cheap filters and engineered features | Seed for reported singleton execution |
| Learned router | Arena corpus and state encoder | Staged training design |
| Supply encoder | Model cards and observed profiles | Proposed new-model generalization |
| Specialists | Verified successes and repaired failures | Distillation and post-training pathway |
| Promotion gate | Quality/cost against the previous policy | Deploy only useful frontier improvements |

Matching the previous router's actions is not the goal. New generations should preserve quality at lower cost or increase quality under a controlled budget. The report mentions inverse-propensity or doubly robust correction, but does not present a multi-generation learning curve or a complete training recipe for every proposed stage.

### Separate rewards for models and routers

The same records can support different targets. Strong-model repairs can become SFT or distillation examples, and verified versus failed outputs can form preference pairs. Repeated tool-format errors can motivate a specialist; repeated recovery at a particular state can motivate a router or verifier change.

The paper separates model rewards focused on quality, safety, and errors from routing rewards that price cost, latency, and recovery. Directly treating cheap language-model outputs as preferred answers risks teaching omission rather than efficient allocation. The loop also depends on heterogeneous model capabilities, low routing overhead, trustworthy labels, and useful alternative-action coverage. More affordable executions need not automatically yield more informative data.

## Experimental Results

### PinchBench singleton baselines and harnesses

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab1-pinch-single.png" class="img-fluid rounded z-depth-1" caption="Table 1: PinchBench singleton scores by model and harness, average billed USD per task, and input-plus-output tokens in thousands." zoomable=true %}

The PinchBench 1.2.1 pool contains Opus 4.8, GLM 5.2, and DS4 Flash. Routing scores 93.14 at 0.0204 USD per task, versus 93.35 at 0.2224 USD for OpenClaw with Opus. The difference is 0.21 points and the cost reduction is approximately 90.83%, corresponding to the reported roughly 10.9-fold reduction.

That comparison changes both allocation and harness. Opus inside OpenSquilla scores 94.33 at 0.1649 USD. Against this more direct reference, routing loses 1.19 points while reducing cost by approximately 87.63%, calculated from the table. Savings remain large, but the impression of perfect quality preservation depends on the denominator.

OpenRouter Auto under OpenClaw scores 88.10 at 0.1204 USD. This is evidence about the evaluated systems, not a universal ranking of query-level and state-aware routers. Total tokens also change: 187.7K for OpenClaw Opus, 97.7K for OpenSquilla Opus, and 51.3K for routing.

### DRACO singleton price composition

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab2-draco-single.png" class="img-fluid rounded z-depth-1" caption="Table 2: DRACO singleton mean scores, average USD per task, and input-plus-output tokens in thousands, with routing threshold 0.95." zoomable=true %}

DRACO evaluates research factuality, completeness, objectivity, presentation, and citation quality. The singleton pool uses Opus 4.8, GLM 5.2, and DS4 Pro, with threshold 0.95. Against Opus inside OpenSquilla, routing changes 52.36→52.33 and 0.6559→0.3729 USD: approximately 43.15% lower cost and 99.94% score retention.

Total tokens increase from 103.5K to 108.6K. Shorter context alone cannot explain these savings; a different price composition across model calls is consistent with the result. Aggregate totals do not identify individual routing frequencies or separate caching effects.

### Fixed proposer ensembles on DuckDuckGo DRACO

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab3-draco-ensemble.png" class="img-fluid rounded z-depth-1" caption="Table 3: A fixed proposer ensemble and singleton baselines on DuckDuckGo DRACO: scores, USD per task, thousands of tokens, p50/p95 seconds, and execution coverage." zoomable=true %}

The selected configuration combines DeepSeek V4, GLM 5.2, Gemini 3 Flash, and Qwen 3.7, with GLM 5.2 aggregating and additional stochastic samples for Gemini and Qwen. Section 4.3.3 explicitly distinguishes these preselected proposer sets from the runtime routing experiment that follows.

The ensemble reaches 60.82 at 0.3766 USD, compared with Fable 5 at 59.80 and 1.2122 USD: 1.02 more points and approximately 68.9% lower cost. However, Fable's averages cover 94 executed tasks, whereas the ensemble covers 100. This is not a paired comparison over the same complete task set.

Latency changes sharply. Ensemble p50/p95 is 535.5/3,097.0 seconds, versus 187.7/343.5 for Fable and 165.3/270.6 for Opus. Its 579.7K tokens illustrate the exchange of more inexpensive computation for fewer expensive calls. Lower billing does not mean a faster response.

### Brave DRACO and Hermes MoA

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab4-5-draco.png" class="img-fluid rounded z-depth-1" caption="Tables 4–5: Hermes MoA and Sakana comparisons above, and the Brave-search DRACO setting below; mean scores, USD per task, thousands of tokens, seconds, and coverage." zoomable=true %}

Under the default search setting, Hermes MoA scores 59.55 at 0.4460 USD, versus 60.82 at 0.3766 USD for the selected configuration. This improves on the evaluated preset, not on every possible mixture-of-agents system. The acting aggregator and proposer-selection mechanisms differ between the systems.

With Brave search, the ensemble reaches 64.09 at 0.1218 USD, versus Fable at 62.06 and 1.3241 USD, approximately 90.8% lower cost. Fable's averages cover 93 completed tasks because safety filtering blocked seven; the ensemble covers 100. Ensemble p50/p95 is 656.8/2,096.0 seconds, against Fable's 126.5/206.3.

Moving from 60.82 with DuckDuckGo to 64.09 with Brave is not an isolated router improvement. Search and provider-specific execution conditions also change. The paper's summary frontier figure combines operating points; the original tables provide the clearer basis for conditional numerical comparisons.

### Limited ensemble gains on PinchBench

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab6-pinch-ensemble.png" class="img-fluid rounded z-depth-1" caption="Table 6: PinchBench ensemble scores on a 0–1 scale, average USD per task, input-plus-output tokens in thousands, and p50/p95 seconds." zoomable=true %}

Table 6 uses a 0–1 scale. Opus scores 0.9433 at 0.1649 USD; the ensemble scores 0.9431 at 0.1349 USD, saving approximately 18.2%. The displayed values differ by 0.0002, although the prose reports 0.0003. This review uses the rounded table entries without inferring a significant quality difference.

Median latency rises from 23.1 to 96.0 seconds and tokens from 97.7K to 272.4K. GPT-5.5 is cheaper at 0.0963 USD with score 0.9373. On short tasks where strong models already score highly, additional proposers are not automatically the best operating choice.

## Analysis / Ablation

### Runtime subset selection and diversity weighting

{% include figure.liquid loading="eager" path="assets/img/papers/0044-agentic-routing-the-harness-native-data-flywheel/tab7-routed-ensemble.png" class="img-fluid rounded z-depth-1" caption="Table 7: Runtime proposer-set construction under three DuckDuckGo DRACO routing policies, with GLM 5.2 aggregation fixed and cost/token averages per judged task." zoomable=true %}

Table 7 fixes GLM 5.2 as aggregator and lets routing assemble proposer sets at runtime. Control scores 59.18 at 0.3249 USD; diversity-heavy reaches 60.31 at 0.3172; quality-heavy reaches 59.93 at 0.2582. The former increases complementarity weight, while the latter emphasizes predicted model quality.

The diversity result supports considering composition rather than independent model strength. Its 1.13-point gain over control comes with slightly lower cost, but coverage is 99/100 versus 100/100, and repeated-run uncertainty is absent. It is evidence of a useful policy operating point, not a universal causal estimate for one coefficient.

Quality-heavy being cheapest also cautions against reading realized cost directly from policy names. Composition, generated length, and recovery intervene. Diversity-heavy approaches the fixed ensemble's 60.82 while costing approximately 15.8% less, but its median latency of 837.1 seconds exceeds that configuration's 535.5.

### Appendix evidence and case selection

Singleton cases concern CNC procurement, code-completion interfaces, and a Mumbai podcast studio. Strong baselines report retrieval gaps, while routed DeepSeek V4 Pro outputs cover more requested requirements. The CNC example changes 52.42→65.90 and 0.1663→0.1122 USD. These illustrate task-specific fit rather than a universal model ordering.

Ensemble cases concern financial extraction, checkout recovery across countries, and coffee traceability systems. They were selected where both strong singletons scored below 60 and an ensemble trajectory exceeded 70. They explain successful mechanisms but do not represent random-sample average gains.

The excerpts are the authors' evaluation evidence, not independently verified current procurement, financial, or legal guidance. More detailed answers need not be more factual. The useful question here is how missing evidence and omitted requirements affect the execution and its score.

## Limitations and Critical Assessment

### Aggregate results and step-level attribution

End-to-end scores do not isolate the contribution of context features, verifier feedback, or recovery history. A controlled comparison of once-per-task and per-step routing with the same pool and harness would strengthen the claimed mechanism. The report establishes practical operating points more clearly than it attributes each gain to a specific state signal.

The flywheel has a similar evidence boundary. Cheaper execution can provide more training opportunities, but the tables do not show successive specialist training, reinsertion into the pool, and measured gains over several generations or across harnesses.

### Coverage, latency, and accounting conditions

Some DRACO averages exclude unfinished tasks. Common-task comparisons and explicit treatment of missing outcomes are needed to separate capability from task composition. Small score gaps also require repeated-run variation before claiming equivalence or superiority.

Latency is a product constraint. A strategy with very long p95 times may suit asynchronous research but not interactive work. Reported billing depends on providers and experimental conditions; different prices or accounting for search, verification, and routing infrastructure can change its economics. These USD figures are experimental measurements, not current service quotations.

### Verifier reliability and alternative-action coverage

Separating actions from outcome labels avoids blindly cloning the old router. It does not make environment labels infallible. Tests can omit requirements and LLM judges can reward convincing presentation. Repeated verifier errors can propagate through outcome-based learning, motivating multiple signals and audits.

Propensity correction also cannot reveal outcomes for actions never observed in relevant states. Exploration and replay cost money, and that expense belongs in an assessment of the loop's net benefit. Releasing the seed router does not make the accumulated arena corpus or later proprietary policies reproducible.

## Takeaways

- Model allocation should consider current failures and recoverability, not just the initial task category or average benchmark strength.
- Useful routing data separates available choices and prior predictions from selected actions and observed outcomes.
- More tokens can cost less while taking longer. Quality, monetary cost, and latency need separate comparisons.
- Harness, search provider, coverage, score scale, and fixed versus runtime proposer selection determine what a reported gain means.
- A data flywheel requires reliable verification, alternative-action coverage, and bias control; ordinary traffic logs do not guarantee learning progress.

## Installation and Usage

The [official README](https://github.com/TokenRhythm/opensquilla#quick-terminal-install), checked on September 30, 2026, recommends a release wheel. The `recommended` extra includes LightGBM and ONNX Runtime dependencies for SquillaRouter, and the package requires Python 3.12 or later.

```bash
uv tool install --python 3.12 \
  "opensquilla[recommended] @ https://github.com/TokenRhythm/opensquilla/releases/download/v0.5.5/opensquilla-0.5.5-py3-none-any.whl"
opensquilla onboard
opensquilla gateway run
```

Onboarding configures providers and credentials. Native runtime requirements such as macOS `libomp` are covered in upstream troubleshooting. This starts the current public product; it does not reproduce every paper experiment. The commands were checked against the README and dependency manifest, without installation or paid API execution.

## References

- [Agentic Routing: The Harness-Native Data Flywheel](https://arxiv.org/abs/2607.11399): arXiv v1, including appendices. Figures and tables originate from Liu et al. and TokenRhythm Technologies.
- [OpenSquilla repository](https://github.com/TokenRhythm/opensquilla): public code and installation documentation. Current README benchmarks are distinct from the paper's v1 results.
- [arXiv distribution license](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html): the paper carries the arXiv non-exclusive distribution license, separate from the code's Apache-2.0 license.

## Further Reading

- **[FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance](https://arxiv.org/abs/2305.05176)** (Chen et al., 2023): Model cascades for balancing response quality and cost.
- **[RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665)** (Ong et al., 2024): Learning stronger-versus-weaker model selection from preference data.
- **[Mixture-of-Agents Enhances Large Language Model Capabilities](https://arxiv.org/abs/2406.04692)** (Wang et al., 2024): Layered composition of outputs from multiple LLMs.
- **[Doubly Robust Policy Evaluation and Learning](https://arxiv.org/abs/1103.4601)** (Dudik et al., ICML 2011): Statistical foundations for evaluating policies from biased historical feedback.

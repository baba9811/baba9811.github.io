---
layout: post
title: "[Paper Review] Learning from Research: Toward Lifelong Agent Harness Evolution"
date: 2026-10-02 12:09:29 +0900
description: "ScholarEvolve uses research-guided module search and recombination to improve agent harnesses around fixed model weights."
tags: ["llm-agents", "agent-harness", "self-improvement", "evolutionary-search", "tool-use"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig1-overview.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/
ko_url: /papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Jingbo Yang et al. (6 authors, UC Santa Barbara · Microsoft) |
| Venue | arXiv · 2026 · CC BY 4.0 |
| arXiv | [2609.40169](https://arxiv.org/abs/2609.40169) |
| Data | AppWorld Normal and Challenge; τ²-Bench Telecom |
| <span style="white-space: nowrap">Review date</span> | 2026-10-02 |

## TL;DR

- ScholarEvolve searches for better agent harnesses using research papers while keeping the task model's weights fixed. It separates changes into tools, context, skills, memory, and workflow modules.
- Mechanism-based topics distribute the candidate budget across different ideas. Individual mutations are measured first, but complete combinations are evaluated again before selection.
- Qwen3.5-27B improves from 49.6% to 63.6% TGC on AppWorld Challenge; GPT-5.4-mini improves from 72.7% to 81.9% pass^1 on Telecom, gains of 14.0 and 9.2 percentage points.
- Three publication-window updates provide evidence for continued improvement under controlled conditions. They do not establish indefinite improvement during real deployment.
- Research-derived candidates can fail badly. The useful unit is the complete search-and-evaluation procedure, including data separation, executable checks, and combination testing.

## Introduction

When an agent repeats a mistake, a natural response is to add another instruction or verification step. A failed tool call gets a critic; an incomplete answer gets another search. These changes respond directly to observed failures, but they can leave the underlying design space narrow. If relevant evidence disappeared during context compression, additional deliberation may simply make several model calls reason from the same incomplete input.

Human engineers often respond by reading research. Work on context selection, reusable procedures, and episodic memory offers mechanisms that failure traces alone may not suggest. Translating that literature into useful code is a separate problem. A method's assumptions, available data, and action interface may differ from those of the host agent. Two promising changes may also interfere once combined.

Yang et al.'s [ScholarEvolve](https://arxiv.org/abs/2609.40169) turns this process into a structured search. Modules organize where to intervene; research topics organize how to intervene. Evaluation then determines whether the proposed mechanisms help. This review follows the paper's arXiv v1, including its appendix, and distinguishes the implemented search, its empirical results, and the conditions behind its lifelong-evolution claim.

## Key Contributions

- **Research-grounded proposals.** Failure evidence becomes general capability gaps that guide literature retrieval and implementation plans.
- **Two axes of exploration.** Functional modules and mechanism topics distribute opportunities across intervention points and alternative solutions.
- **Executable mutation and measured crossover.** Interface checks make candidates runnable, while complete-harness evaluation tests their compatibility and usefulness.
- **Performance and reliability analysis.** Two backbones and two environments support comparisons of task completion, unseen-app transfer, repeated success, and residual failures.
- **Successive literature updates.** Three publication windows test whether new research can improve a retained harness without changing model weights.

## Related Work / Background

### Harness optimization and weight training

A harness manages the information, actions, and state surrounding a language model. It determines which tools are exposed, which observations survive in context, how failures trigger recovery, and how the agent ends a task. Fixed model weights therefore do not imply fixed system behavior. Code, reusable procedures, and retrievable experience can all change the capabilities delivered by the same backbone.

[Meta-Harness](https://arxiv.org/abs/2603.28052) already searches executable harness code using prior candidates and execution feedback. ScholarEvolve extends the source of proposals to research literature and organizes the search by module. Its contribution should not be reduced to discovering that tools or memory can be edited. The central question is how a limited implementation budget reaches different useful mechanisms.

### Mechanism topics and semantic overlap

Many relevant papers can describe closely related interventions. Implementing four variants of retrieval may cover less design space than testing retrieval, compression, scoring, and budget allocation. ScholarEvolve follows [TopicGPT](https://arxiv.org/abs/2311.01449) in generating, refining, and assigning topics, but conditions these stages on the responsibility of each harness module.

“Orthogonal” here describes reduced semantic overlap, not a mathematical independence guarantee. Synonyms are merged and excessively narrow variants are consolidated. Different topics can still produce interacting implementations. Topic organization broadens candidate generation; it does not remove the need to execute combinations.

## Method / Architecture Details

### 1. Five modules and their execution contracts

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig1-overview.png" class="img-fluid rounded z-depth-1" caption="Figure 1: Research-guided module exploration and recombination, with Qwen3.5-27B TGC and SGC (%) on AppWorld Challenge at right." zoomable=true %}

The harness contains tool interface, context management, skills, memories, and agentic workflow modules. Memory returns evidence; skills return procedures. Context management assembles these with policy and interaction history. Workflow produces an action proposal, which the tool interface translates into an executable environment action.

| Module | Intervention | Representative implementation |
|--------|--------------|-------------------------------|
| Tool interface | Available actions and call handling | Documentation macros, syntax checks, bounded normalization |
| Context management | Selection, compression, and ordering | Query relevance, recency, and character-budget allocation |
| Skills | Reusable procedures | API subsequences compiled into pseudocode |
| Memories | Experience storage and retrieval | Structured episode summaries and task-conditioned recall |
| Agentic workflows | Model calls and coordination | Planner, solver, and critic proposals followed by a verifier |

A mutation changes one module while holding the others fixed. This localizes the intervention, but not necessarily its downstream effects. A longer retrieved skill competes with history for context space. A new workflow may change the action format presented to the tool interface. Shared contracts make replacement possible; whole-harness measurements establish whether replacements work together.

### 2. Capability gaps and literature retrieval

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig2-framework.png" class="img-fluid rounded z-depth-1" caption="Figure 2: Failure analysis, literature retrieval, and topic organization (a); mutation, selection, and crossover across generations (b); five modules around a fixed backbone (c)." zoomable=true %}

The research pool begins with evolution-set trajectories. An auditor separates agent-attributable failures from environment causes and prioritizes recurring weaknesses amenable to inference-time changes. A research model abstracts these into capability gaps, removing benchmark names, domain entities, and specific tool or field names. Losing an earlier observation can become a question about context selection, state tracking, or memory retrieval.

For each module, the model generates broad capability queries and narrower mechanism queries. Interleaved searches retrieve arXiv titles, abstracts, and links. Normalized titles remove duplicates within a module, and records without abstracts are excluded. A paper may remain in multiple module pools, so module–paper records are not a count of unique papers.

This abstraction discourages benchmark-specific patches, but cannot guarantee generalization. The audit and queries still influence which ideas enter the pool. The framework preserves provenance and decision records so these choices can be inspected rather than hidden behind the final score.

### 3. Topic refinement and candidate allocation

The research model processes batches of titles and abstracts, reusing existing mechanism names or adding categories. Refinement merges paraphrases, absorbs overly specific variants, and removes vague or irrelevant topics. Each paper receives an ordered list of supported topics with abstract excerpts. Its first retained label determines its selection cluster within that module.

Screening removes mechanisms already supplied by the current harness or backbone. Remaining nonempty clusters are ordered by size, then visited round-robin: every cluster gets a turn before one is revisited. Retrieval order is preserved within a cluster. With a budget of K papers, the procedure covers K distinct topics when enough eligible topics exist.

The relevant ablation replaces this allocation with relevance ranking over the same screened pool and paper budget. It does not remove all upstream topic modeling. For Qwen, the archived pool contains 1,956 module–paper records; only the selected candidates are implemented.

### 4. Mutation blueprints and executable checks

A research agent reads each selected paper in full, including its appendix and available official code. Its blueprint specifies the mechanism, assumptions, target interface, state and artifacts, runtime operations, auxiliary model calls, and stopping conditions. Source ideas are distinguished from adaptations to the host harness.

The coding agent implements the candidate in one module. Health probes check importability, interface compatibility, artifact construction and reloading, and valid action production under controlled model responses. Repairs continue within a budget. These checks prevent evaluation of non-runnable candidates, but passing them says nothing about improvement in task reward.

Persistent skills and memories can be constructed only from evolution trajectories. They remain frozen during validation and testing. Episode-local state may change as new observations arrive. Remembering an error within the current task is therefore different from accumulating validation-task experience into a reusable library for later tasks.

### 5. Crossover and champion retention

Each generation starts from the current champion. Individual mutations are compared with it on the same validation tasks and trials. A configuration selects one implementation per module, with the option of keeping the original implementation. This allows useful subsets rather than forcing every module to change.

Standalone gains are added to rank potential combinations without new rollouts. Shortlisted configurations are then assembled and evaluated as complete harnesses. Their measured gain, rather than the additive estimate, determines selection. Two modules may fix the same failures, interact adversely, or reach a reward ceiling, making the sum optimistic.

The candidate set includes individual mutations as well as combinations. A new champion is retained only when the lower endpoint of its paired-bootstrap gain interval exceeds zero. Otherwise the old champion survives. The reported convergence setting ends a cycle after one generation without confirmed improvement. New literature can later trigger another cycle from the retained harness.

### 6. Concrete mechanisms in the final Qwen harness

The appendix illustrates how research ideas become comparatively small implementations. The ToolACE-R-inspired module expands `DOC_ACTION` into documentation queries, checks Python syntax and statement structure, and applies bounded repairs or fallbacks. This is an adaptation of an idea, not a reproduction of the source paper's entire training pipeline.

The context module preserves policy, scores segments by query relevance and recency, allocates a character budget, and restores chronological order. The Skill-as-Pseudocode module mines recurring API subsequences from successful trajectories and attaches input/output fields, applicability cues, ordered calls, and empirical support. Runtime matching uses lexical triggers and support counts.

The Oracle Agent Memory-inspired module stores task/action/output/outcome summaries and retrieves them using lexical similarity plus outcome-related terms. The TMAS-inspired workflow gathers planner, solver, and critic proposals and asks a verifier to choose an action, using bounded episode-local observations and retry guidelines. One environment action can consequently require multiple model calls. No weight training does not mean no additional inference computation.

## Training Objective / Loss Function

### Expected reward and additive screening

ScholarEvolve optimizes an executable program H, not model parameters through gradient descent. With fixed weights θ, target task distribution P, and an induced trajectory τ, the objective is:

$$
\begin{aligned}
H^\star &\in \arg\max_{H\in\mathcal H} J(H),\\
J(H) &= \mathbb E_{x\sim P_{\mathrm{tar}}}
\mathbb E_{\tau\sim p_\theta(\cdot\mid H,x)}[R(x,\tau)].
\end{aligned}
$$

The test set is a finite sample representing the target distribution, not the distribution itself. Evolution data supplies audit evidence and artifacts; validation selects candidates; test data is reserved for reporting after selection is frozen.

If g denotes a module candidate's task-level gain over the base, the combination-screening score is:

$$
\widehat\Delta(c)=\frac{1}{|D_{\mathrm{val}}|}
\sum_{i\in D_{\mathrm{val}}}\sum_{j=1}^{5}g_{j,c_j}(i).
$$

Keeping a base module contributes zero. Actual combination gain is measured separately. Its deviation from this estimate mixes module interaction, bounded rewards, and evaluation variation, so it cannot be read as a pure measure of conflict between mechanisms.

### Repeated success in Telecom pass^k

Each Telecom run contains four internal trials per task. If task i succeeds s times, its contribution is:

$$
\operatorname{pass}^{k}_{i}=\frac{\binom{s_i}{k}}{\binom{4}{k}}.
$$

The contribution is zero when s is smaller than k. Scores are averaged across 40 test tasks, then summarized across three runs. This estimates success across all k trials, not at least one success among k attempts. A task succeeding three times out of four contributes 3/4 to pass^1 but zero to pass^4. Confusing it with coding-style pass@k reverses the reliability interpretation.

## Training Data and Pipeline

### Separate evolution, validation, and test roles

| Environment | Evolution | Validation | Final test | Episode limits |
|-------------|-----------|------------|------------|----------------|
| AppWorld | 90 official training tasks | 57 DEV tasks | 168 Normal; 417 Challenge | 100 environment steps |
| τ²-Bench Telecom | 250 sampled experience tasks | 74 official training tasks | 40 official test tasks | 200 conversation steps; ten errors |

AppWorld TGC is the fraction of successful tasks. SGC requires all three variants of a scenario to succeed: Normal contains 56 scenarios and Challenge 139. Challenge requires Amazon or Gmail APIs absent from evolution and validation. The same harness and frozen artifacts are used on both test splits.

Telecom's experience pool excludes the base collection and uses stratified sampling with seed 2026: 18 service-issue, 60 mobile-data, and 172 MMS tasks. Its official “training” split serves as validation here. The user simulator is GPT-5.2 with high reasoning effort and simulation seed 300.

### Model settings and search budgets

Qwen3.5-27B uses vLLM 0.27.1, tensor parallelism four, temperature zero, and thinking enabled. GPT-5.4-mini uses low reasoning effort. Maximum completion length is 65,536 tokens per call. Initial and evolved agents share task-model settings and environment limits within each comparison. The appendix notes that Qwen's serving template ignores the low-reasoning field in archived AppWorld requests while retaining thinking mode.

Main-experiment research selection and candidate implementation use GPT-5.4, with implementation through Codex. AppWorld requests four candidates per module, 20 total; Telecom requests three per module, 15 total. Compared methods receive the same allocated search rollout budget. AppWorld's initial development measurements use three runs; Mini finalists additionally receive nine-run checks.

The lifelong experiment has a separate protocol: at most one paper per module, up to five mutations and four combinations per update, with three total DEV evaluations of the best harness. Research selection uses GPT-5.4, but implementation uses Codex GPT-5.5. Its results should not be treated as continuation points from the main experiment under identical search settings.

## Experimental Results

### AppWorld completion and unseen applications

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/tab1-results.png" class="img-fluid rounded z-depth-1" caption="Table 1: TGC and SGC on AppWorld Normal and Challenge, and pass^k on τ²-Bench Telecom. Mean±SD (%) over three runs and changes from the matched backbone in percentage points." zoomable=true %}

Qwen's Normal TGC rises from 69.0% to 81.4%, and SGC from 48.8% to 69.0%. On Challenge, TGC improves from 49.6% to 63.6% and SGC from 28.3% to 44.8%. Meta Harness reaches 54.6% Challenge TGC with Qwen, leaving ScholarEvolve ahead by 9.0 points.

Mini improves from 67.1% to 72.4% Normal TGC and from 46.1% to 55.6% Challenge TGC. Challenge SGC rises from 21.1% to 32.4%. Meta Harness reaches 45.6% Challenge TGC with Mini, slightly below the initial harness. Code-editing freedom alone does not guarantee a useful search, although this is a result for the evaluated implementation and budget, not a universal ranking.

Qwen's 81.4% Normal TGC is close to Kimi-K2.6's 81.3% under the initial harness. Its gap to GPT-5.4's 85.7% shrinks from 16.7 to 4.3 points, approximately 74% gap closure. That comparison concerns Normal TGC. GPT-5.4 still scores 80.4% on Challenge, well above evolved Qwen's 63.6%.

### Telecom average success and reliability

Mini's pass^1 improves from 72.7% to 81.9%, while pass^4 improves from 49.2% to 58.3%. Average success and repeated reliability both improve, but the large separation between the metrics shows that consistent task completion remains difficult.

Qwen starts near the ceiling: pass^1 moves from 96.7% to 98.1%, a 1.4-point gain. Its pass^4 improves more substantially, from 86.7% to 93.3%, or 6.6 points. The stricter metric makes reductions in intermittent failures more visible.

### Three publication-window updates

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/tab5-lifelong.png" class="img-fluid rounded z-depth-1" caption="Table 5: Qwen3.5-27B AppWorld Normal TGC and SGC mean±SD (%) across three literature updates." zoomable=true %}

The windows cover publications through December 2025, January–April 2026, and May–August 2026, reconstructed from the current index using first-submission dates. Qwen weights, archived evolution trajectories, and derived artifacts remain fixed. All generations' selection decisions are frozen before test evaluation.

ScholarEvolve's TGC progresses 69.00→73.41→79.76→81.55%; SGC progresses 48.80→54.17→61.91→66.67%. Meta Harness finishes at 69.64% TGC and 51.19% SGC. This supports continued improvement from additional literature under the protocol. It is neither months of live deployment nor online accumulation of new task experience. The final 81.55%/66.67% also belongs to a different experiment from the main table's 81.4%/69.0%.

## Analysis / Ablation

### Cumulative removal of search components

Table 2 removes components cumulatively. Qwen Normal TGC falls from 81.4% to 80.0% without topic-guided selection, then to 78.6% after also removing module-wise mutation, and to 76.8% after removing research guidance. Mini follows 72.4→69.8→69.3→67.5%.

The first difference isolates topic-based allocation against relevance ranking over the same screened pool and budget: 1.4 TGC and 2.3 SGC points for Qwen, 2.6 and 5.4 for Mini. Later differences are conditional on earlier removals. They are not independent contributions that can be freely added or assumed invariant to removal order.

### Standalone winners and stronger combinations

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/tab3-composition.png" class="img-fluid rounded z-depth-1" caption="Table 3: Single-module and combined performance on 57 AppWorld DEV tasks. TGC and SGC mean±SD (%) over three runs; N/A for modules absent from the combination." zoomable=true %}

On 57 DEV tasks, Qwen's strongest standalone TGC in this comparison is memory-only at 81.3%, while the combination reaches 84.8%. Mini combines skills, memory, and workflow while retaining its original tool and context modules, reaching 77.2%. N/A denotes a mutation absent from that combination, not a missing capability in the backbone.

A sharper example replaces a 75.4% standalone skills candidate with a 73.7% candidate, yet improves the complete Qwen combination from 80.7% to 84.8%. Standalone ranking misses compatibility. Appendix A.1 explicitly states that Table 3's Qwen skills implementation differs from the main test harness, with the other four modules unchanged. These DEV figures should not be used to reconstruct the exact final test configuration.

### Severe regressions among research-derived candidates

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/tab7-candidates.png" class="img-fluid rounded z-depth-1" caption="Table 7: Twenty single-module Qwen AppWorld candidates, with DEV TGC changes in percentage points, 90% paired task-bootstrap intervals, improved/worsened task counts (W/L), and final selections (stars)." zoomable=true %}

Seventeen of Qwen's 20 candidates improve standalone DEV TGC; eight have 90% paired task-bootstrap intervals above zero. Three degrade sharply: two context candidates lose 45.6 and 43.3 points, while the CoEvo-Mem-inspired memory candidate loses 67.8. They are excluded from the final harness.

These failures evaluate particular adaptations, not the general validity of the source papers. Mini's final AppWorld memory is itself CoEvo-Mem-inspired. The same research origin can lead to different outcomes across backbones and implementations. Literature supplies candidate mechanisms, while evaluation establishes whether an adaptation works in its host.

### Reliability transitions and API-breadth uncertainty

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig3-evolution.png" class="img-fluid rounded z-depth-1" caption="Figure 3: AppWorld Normal TGC and SGC (%) across three updates with SD bands at left; task counts by initial and evolved successes out of three runs at right, for 585 tasks per backbone." zoomable=true %}

Across 585 Normal and Challenge tasks, Qwen improves its success count on 221 tasks and regresses on 57; Mini improves on 200 and regresses on 106. Qwen's tasks solved in all three runs increase from 205 to 333. Of improved tasks, 73.3% for Qwen and 66.0% for Mini already succeeded in one or two initial runs. Much of the benefit is more reliable use of existing capability.

API-breadth analysis counts distinct APIs in official reference solutions, not agent execution steps. Training's maximum is 12 APIs; 102 Challenge tasks exceed it. Their mean TGC gains are 9.5 points for Qwen and 7.2 for Mini, but 95% paired scenario-bootstrap intervals are [−0.7, 19.6] and [0.3, 14.1]. Qwen's interval includes zero, limiting the strength of this subgroup claim.

### Response contracts and residual goal failures

{% include figure.liquid loading="eager" path="assets/img/papers/0046-learning-from-research-toward-lifelong-agent-harness-evoluti/fig8-failures.png" class="img-fluid rounded z-depth-1" caption="Figure 8: Qwen endpoint diagnostics on Normal and Challenge. Horizontal axes: percentage of all episodes; open circles: initial harness; diamonds: ScholarEvolve; counts: initial to evolved." zoomable=true %}

Behavioral annotation of 1,336 failed Qwen episodes finds invalid response formats falling from 492 to 206, while constraint violations change from 91 to 89 and incomplete retrieval from 77 to 70. Correct delivery contributes substantially, but requirement tracking and evidence coverage remain unresolved.

Figure 8 uses a different, mutually exclusive endpoint diagnosis: completion, response contract, answer correctness, then goal-state realization. Its denominator is all episodes, 504 Normal or 1,251 Challenge per harness. On Challenge, response-contract failures fall from 407 to 177 while unmet-goal-state diagnoses rise from 203 to 251. Passing an earlier check can expose a later failure, so the latter increase cannot directly be interpreted as that many newly caused goal failures.

Qualitative examples do show state-aware improvements. Updating an existing object rather than creating another, and clearing pre-existing cart contents before an order, each move from zero to three successful runs. These examples explain mechanisms; they do not establish their share of the aggregate gain.

## Limitations and Critical Assessment

### Rollout budgets and total computation

Equal allocated rollout budgets do not equalize literature search, classification, blueprint generation, code repair, inference tokens, or latency. A deployed specialist-and-verifier workflow also makes additional model calls. The paper provides performance evidence, but not a comprehensive cost comparison incorporating all these activities. Avoiding weight training does not establish cheaper or faster operation.

### Small validation sets and reconstructed time

Repeated selection on 57 AppWorld DEV tasks still risks selection bias despite bootstrap retention checks. Telecom's 40-task test set limits precision. Three reconstructed publication windows offer useful evidence, but do not test indefinite adaptation under changing production distributions and accumulating memories.

### Diagnostic annotation and reproducibility

The failure audit preserves evidence quotes and uses local checks, but both annotation passes use the same model, and the second sees the first draft. This is not independent human agreement. Another 218 failed episodes lack supported unresolved behavioral labels. The taxonomy is a careful description of archived behavior, not a fully observed causal breakdown.

As checked on October 2, 2026, the official GitHub repository linked by the paper is empty. The appendix includes implementation excerpts, but a runnable release of the complete pipeline and artifacts could not be verified. This review's implementation discussion rests on the paper and appendix; there is no verified installation command to provide.

## Takeaways

- **Failure evidence identifies weaknesses; literature expands candidate solutions.** Both are useful, but benchmark-specific patches should not be confused with general mechanisms.
- **Diversity can be designed before implementation.** Topic allocation complements relevance ranking by distributing a fixed budget across mechanisms.
- **Modules need combination tests.** The strongest standalone implementation need not belong to the best complete harness.
- **Reliability and failure types matter alongside averages.** Repeated success, response contracts, and goal-state fulfillment reveal different improvements.
- **Continued evolution depends on evaluation discipline.** Artifact provenance, split roles, and publication windows are necessary to interpret the contribution of new research.

## References

- [Learning from Research: Toward Lifelong Agent Harness Evolution](https://arxiv.org/abs/2609.40169), Yang et al., 2026. This review follows arXiv v1 and its appendix.
- [Official ScholarEvolve repository](https://github.com/UCSB-NLP-Chang/ScholarEvolve): linked by the paper; empty when checked on October 2, 2026.
- Figures and tables are attributed to the paper's authors under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Interpretation and critical assessment appear in the review text.

## Further Reading

- **[Meta-Harness: End-to-End Optimization of Model Harnesses](https://arxiv.org/abs/2603.28052)** (Lee et al., 2026): Harness code search using execution traces and evaluation evidence.
- **[TopicGPT: A Prompt-based Topic Modeling Framework](https://arxiv.org/abs/2311.01449)** (Pham et al., NAACL 2024): Topic generation, refinement, and assignment underlying the literature organization.
- **[AppWorld: A Controllable World of Apps and People for Benchmarking Interactive Coding Agents](https://arxiv.org/abs/2407.18901)** (Trivedi et al., ACL 2024): Interactive API-based tasks with changing application state.
- **[τ²-Bench: Evaluating Conversational Agents in a Dual-Control Environment](https://arxiv.org/abs/2506.07982)** (Barres et al., 2025): Technical-support agents coordinating with active users and evaluated for repeated reliability.

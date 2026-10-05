---
layout: post
title: "[Paper Review] RRSI: Regularized Recursive Self-Improvement of Agent Harnesses"
date: 2026-10-06 00:22:33 +0900
description: "How RRSI regularizes proposals and selection to improve agent-harness transfer, with a closer look at acceptance rules, benchmark metrics, and inference cost."
tags: ["llm-agents", "agent-harness", "self-improvement", "regularization", "generalization"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/fig2-overview.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/
ko_url: /papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Peng Xia et al. (14 authors, Google Cloud AI Research · UNC · Stanford · WashU) |
| Venue | arXiv · 2026 · arXiv distribution license |
| arXiv | [2609.24972](https://arxiv.org/abs/2609.24972) |
| Code | [google-research/rrsi](https://github.com/google-research/rrsi) |
| Data | Eight benchmarks in coding, agentic workspace, and engineering design |
| <span style="white-space: nowrap">Review date</span> | 2026-10-06 |

## TL;DR

- RRSI evolves the prompts, tools, memory, context management, and control flow around a frozen model. It keeps those components editable while regularizing how candidates are proposed and retained.
- Proposal controls combine a shrinking edit budget, evidence from previous edits, and exploration of untried components. Selection combines leakage screening, a historical performance floor, cost conditions, and structural pruning.
- With Claude Opus 4.8, SWE-bench Verified rises from 82.0 to 83.8, JobBench from 36.0 to 40.7, and Frontier-Eng Medal Score from 17.7 to 22.0. Medal Score includes partial credit rather than measuring task success.
- Workspace OOD average rises from 39.7 for the initial harness to 43.6, versus 40.3 for unregularized evolution. Policy tokens fall from 3.80M to 2.42M per trial relative to unregularized evolution, a 36.3% reduction. The initial harness remains cheaper at 1.56M.
- Small score changes are not categorically rejected: within the noise band, cost savings and structural novelty can justify acceptance. Finite feedback, bundled-edit attribution, and long-run reliability remain open concerns.

## Introduction

A coding agent that stops without checking its output may benefit from a completion audit. An agent that waits inefficiently for a long-running command may need different polling behavior. Neither change requires new model weights. Automating the process of finding these changes is attractive, but it leaves a harder question: which apparent improvements deserve to become permanent?

A finite benchmark can be consulted repeatedly until the harness learns its peculiarities. Selection can also preserve a candidate that happened to receive favorable stochastic rollouts. Meanwhile, adding more checks and deliberation can improve scores by purchasing more inference rather than installing a better mechanism. A frozen backbone does not prevent any of these effects.

Xia et al.'s [RRSI](https://arxiv.org/abs/2609.24972) regularizes the search itself. It constrains the size of proposals and the conditions under which measured gains survive, while leaving the harness edit space open. This review follows arXiv v2, its appendix, and the released implementation, separating evolve-set gains from transfer and final-policy inference from the cost of discovering the harness.

## Key Contributions

- <strong>Generalization as the central evaluation question.</strong> Evolve-set improvements are assessed against held-out tasks and benchmarks that never participate in selection.
- <strong>Controls on both sides of the loop.</strong> Proposal capacity and exploration are constrained alongside leakage, performance stability, cost, and retention of unproductive structure.
- <strong>An open edit space with selective persistence.</strong> Prompts, tools, skills, memory, and subagents remain available; a higher score alone does not guarantee acceptance.
- <strong>Transfer across different verifiers.</strong> Experiments cover hidden tests, rubric judgments, expert comparisons, and engineering simulators.
- <strong>Joint analysis of transfer and inference cost.</strong> Ablations expose cases where higher evolve scores accompany weaker transfer and more policy tokens.

## Related Work / Background

### Frozen policies and evolving execution programs

An agent combines a policy $\pi$ with a harness $H$. The harness constructs context, exposes tools, retrieves memory, recovers from failures, and decides when to stop. RRSI modifies this program while keeping the policy weights fixed. Its recursive self-improvement is a feedback loop over the surrounding system, not an experiment in autonomous weight training.

[Meta-Harness](https://arxiv.org/abs/2603.28052) searches executable code with access to prior scores and traces. [AHE](https://arxiv.org/abs/2604.25850) organizes components, experience, and edit outcomes into observable evidence. [TTHE](https://arxiv.org/abs/2607.08124) adapts executable harnesses during evaluation from execution-derived signals. RRSI shares much of their edit space; its distinction lies in controlling how repeated feedback influences the search and its retained state.

### Adaptive reuse of evaluation feedback

The evolve set does more than measure performance. It helps generate a candidate, selects that candidate, and supplies evidence for the next proposal. Later candidates therefore depend on earlier measurements of the same tasks. This adaptive reuse makes benchmark-specific fitting possible even without gradients.

{% include figure.liquid loading="eager" path="assets/img/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/fig1-transfer.png" class="img-fluid rounded z-depth-1" caption="Figure 1: (a) Relative evolve-set and OOD-average gains (%) in the workspace instance; (b–d) OOD scores for the initial harness, the four-method baseline average, and RRSI." zoomable=true %}

Figure 1 contrasts workspace evolve gains with OOD gains. The negative region contains methods whose evolved harness performs worse OOD than its starting point. The bars labeled `prior` show the mean of four baselines. The ranking reversal motivates evaluating transfer separately; it does not establish a universal ordering of harness methods.

## Method / Architecture Details

### 1. Proposal and selection controls

{% include figure.liquid loading="eager" path="assets/img/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/fig2-overview.png" class="img-fluid rounded z-depth-1" caption="Figure 2: Proposal controls on edit budget, history, and exploration; selection controls on leakage, performance floor, cost, and pruning." zoomable=true %}

A round begins with analysis of the incumbent's execution feedback. The proposer receives that feedback, edit history, an edit budget, exploration directives, and pruning targets. A critic screens candidates before full evaluation. The selector then constructs an admissible set and chooses its highest measured score. If none qualify, the incumbent survives.

Editable components include prompt, control flow, configuration, output plumbing, context management, client tools, skills, memory, and subagents. Generic prompt improvements are allowed. A new subagent is not automatically valuable: it must also satisfy the leakage, stability, and cost conditions.

### 2. Cosine schedule and atomic-edit budget

A candidate containing many unrelated changes has more capacity to fit local feedback and makes attribution difficult. RRSI bounds the number of independently attributable edits per candidate:

$$
\begin{aligned}
b_t = \Big\lceil b_{\min}
&+ \frac{b_{\max}-b_{\min}}{2} \\
&\cdot \left(1+\cos\frac{\pi t}{T}\right)
\Big\rceil.
\end{aligned}
$$

Early proposals can combine coordinated changes; later proposals become smaller. If $z\_t$ selects atomic edits, the constraint is $\lVert z\_t\rVert\_0\le b\_t$. It limits update cardinality, not the total number of harness components or code lines.

The endpoint deserves care. Although settings use $b\_{\min}=1$, the run uses $t=0,\ldots,T-1$. With the published settings and ceiling operation, the released `edit_budget` returns 2 in the final executed round of all three instances; it reaches 1 at $t=T$. Late candidates can therefore still bundle two edits. The schedule narrows attribution without guaranteeing a single-edit final phase.

### 3. Edit history and untried components

Each evaluated atomic edit records its component, hypothesis, diff, score change, cost change, and acceptance. Edits bundled in one candidate share its measurement. An admissible candidate that loses the round is recorded as unaccepted; admission and persistence are different events.

This evidence discourages repeatedly testing falsified hypotheses. It also detects search collapse, such as repeatedly rewriting prompts. If progress over $w$ rounds does not exceed the noise tolerance $\delta$, exploratory candidate slots are reserved for component types that have never received a measured edit.

Untried components and structural novelty are distinct. A failed memory experiment makes memory tried. It can still earn novelty credit later if memory has never appeared in a winning edit. Combining those two concepts into a generic new-edit bonus would misdescribe the algorithm.

### 4. Leakage critic and historical performance floor

The critic checks diffs for task names, entities, particular answers or values, benchmark-specific logic, and inert machinery. Screening occurs before evaluation so a leaking candidate cannot first receive an inflated score that influences later search. This targets explicit leakage rather than guaranteeing detection of all indirect overfitting.

After evaluation, a candidate must satisfy

$$
\widehat S(H')\ge S^\star-\delta,
$$

where $S^\star$ is the best evolve score observed so far. Anchoring the floor to historical best prevents a sequence of individually small regressions from walking steadily downhill. It still permits fluctuations within $\delta$: acceptance does not require strict improvement over the current incumbent.

### 5. Noise-dependent cost rules and structural novelty

Let $\Delta S$ be the score difference from the incumbent and $\Delta C$ the relative change in policy tokens. Scores are fractions in 0–1. The cost condition depends on whether the gain exceeds the noise tolerance:

$$
\begin{aligned}
&\Delta S>\delta: \\
&\qquad\Delta C\le\beta_0+\beta_1\Delta S, \\
&\Delta S\le\delta: \\
&\qquad w_s\Delta S-w_c\Delta C+w_n\nu_t(H')>0.
\end{aligned}
$$

Above the band, larger gains permit more inference. Within it, lower cost and new structural component types can support admission. Novelty counts distinct client-tool, skill, memory, or subagent types touched by the candidate that have never appeared in a winning edit. Prompt and context-management changes receive no bonus. Adding another skill does not repeatedly earn credit for a new structural type once skill has been accepted.

Coding sets $w\_s=0$, so a within-band score increase alone cannot justify admission. Workspace and engineering use positive values. The shaped expression determines eligibility; the final winner is selected by measured score. Engineering additionally rejects drops above 3 percentage points in valid-output rate or rises above 2 points in no-submission rate.

### 6. Recent contribution and structural pruning

Small updates do not remove accumulated machinery. RRSI tracks each component's best recent measured gain and marks components without a strictly positive gain in the pruning window as deletion targets. No recent measurement yields a maximum of negative infinity. The proposer receives these targets and their accepted machinery, then proposes removals that still undergo evaluation and selection.

Pruning is therefore not immediate deletion by the selector. Its evidence is also imperfect: bundled edits inherit a joint score rather than independent causal effects. The paper's L0, Lasso, and Ridge terminology describes analogous roles of cardinality control, structural removal, and resource-growth control. The procedure does not optimize the corresponding norm-penalized objectives.

## Learning Objective / Loss Function

### Harness performance and policy-token cost

There is no SFT or RL loss updating the backbone. The search observes verifier reward $r(x,\tau)$ and policy-token count $c(\tau)$ for task $x$ and trajectory $\tau$:

$$
\begin{aligned}
S(H;\mathcal D)
&=\mathbb E_{x\sim\mathcal D}
\mathbb E_{\tau\sim A(\cdot\mid x)}[r(x,\tau)], \\
C(H;\mathcal D)
&=\mathbb E_{x\sim\mathcal D}
\mathbb E_{\tau\sim A(\cdot\mid x)}[c(\tau)].
\end{aligned}
$$

Finite tasks and repeated trials estimate these quantities. Coding and engineering evolution average binary passes. Harvey LAB weights each trial's criterion-pass fraction by its criterion count, producing the fraction passed across all rubric criteria. Longer rubrics contribute more weight; the reported score is not an unweighted task-success rate.

### Non-compensatory admission criteria

Selection does not minimize a single fixed performance-cost loss. Leakage screening, historical floor, the appropriate cost branch, and active domain guards must all pass before score ranking. A cheap candidate cannot compensate for falling below the floor, and a better engineering pass rate cannot compensate for a substantial loss of output validity.

The trade-off still depends on calibration and chosen coefficients. In particular, $\beta\_1$ multiplies a fractional score difference, not the percentage-point number displayed in a results table. Unit conversion is part of reproducing the rule.

## Training Data and Pipeline

### Evolve, ID-held-out, and OOD roles

The feedback set acts as search data rather than a weight-training corpus. Coding evolves on all 89 Terminal-Bench 2.1 tasks; engineering on 61 license-free EngDesign tasks. Neither has a separate ID-held-out split. Harvey LAB's 160 tasks across 25 legal practice areas are split once into 120 evolve tasks and 40 held-out tasks.

<div class="table-responsive" markdown="1">

| Domain | Evolve set | Evaluation outside selection | Initial harness |
|--------|------------|------------------------------|-----------------|
| Coding | Terminal-Bench 2.1, 89 tasks | SWE-bench Verified | Terminus-2 |
| Agentic workspace | Harvey LAB, 120 tasks | Harvey LAB 40 tasks; JobBench, GDPval, APEX-Agents | ReAct with MCP gateway, dynamic toolbelt, ReSum context |
| Engineering design | EngDesign, 61 tasks | Frontier-Eng | ReAct with MCP toolbelt and context management |

</div>

A separate harness evolves in each domain and is transferred unchanged within that domain. One final universal harness is not tested across all three. Held-out and OOD benchmarks do not tune hyperparameters. Candidate and initial harness evaluations share the same window, tools, judge, and trial count.

### Model roles and search settings

The main policy, proposer, analyst, and leakage critic are Claude Opus 4.8. Harvey LAB's criterion judge is Gemini 3.5 Flash. Additional Gemini-policy coding results come from independent evolution rather than swapping the main run's final harness to that policy.

{% include figure.liquid loading="eager" path="assets/img/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/tab5-settings.png" class="img-fluid rounded z-depth-1" caption="Table 5: Rounds, trials, noise tolerance, edit budgets, pruning windows, and cost settings across the three domains." zoomable=true %}

Coding and workspace use 20 rounds, engineering 40. Trials per task are 2, 2, and 4, with two candidates per round in released configurations. Noise tolerances are 0.017, 0.004, and 0.020; stall windows are 3 throughout; pruning windows are 4, 4, and 5. Initial budgets are 4, 3, and 4. One coding evaluation needs 178 trials and one engineering evaluation 244.

Cost intercepts are 0.10, 0.10, and 0.15, and slopes 44.5, 35.4, and 24.4. Released within-band weights $(w\_s,w\_c,w\_n)$ are `(0, 15, 0.5)`, `(1414, 15, 0.5)`, and `(244, 2, 0.5)`. Their scale reflects fractional scores. The paper calibrates noise from repeated evaluations of the unchanged initial harness. This is an empirical tolerance, not a significance guarantee for every later adaptive comparison.

Final policy-token cost excludes the full cost of proposing, analyzing, screening, and evaluating many candidates. It cannot be read as total search dollars or wall-clock time.

## Experimental Results

### Benchmark verifiers and metric definitions

The common 0–100 display in Figure 3 does not make every bar a success rate. Appendix A defines different measurements:

| Benchmark | Reported metric | Verification |
|-----------|-----------------|--------------|
| Terminal-Bench 2.1 | Test-pass fraction over trials | Hidden tests after termination |
| SWE-bench Verified | Resolve rate | Fail-to-pass and pass-to-pass conditions |
| Harvey LAB | Criterion-pass fraction | Criterion-weighted aggregation |
| JobBench | Weighted rubric score | Benchmark rubric |
| GDPval | Win rate against human experts | Three judges and majority vote |
| APEX-Agents | Pass@1 | Task rubric on one sampled rollout |
| EngDesign | Pass rate | Frozen simulators or testbenches |
| Frontier-Eng | Medal Score | Partial credit against frozen thresholds |

GDPval uses Qwen3.6-35B-A3B, Claude Sonnet 4.6, and Gemini 3.1 Pro, with both presentation orders. Its 52.3 denotes preferred deliverables under that panel, not complete task success. Harvey LAB and JobBench admit partial rubric credit. APEX-Agents retains the full 480-task denominator and counts missing rollouts as failures.

### Transfer in coding, workspace, and engineering

{% include figure.liquid loading="eager" path="assets/img/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/fig3-tab1-main.png" class="img-fluid rounded z-depth-1" caption="Figure 3 and Table 1: Nine splits across eight benchmarks and workspace-method comparisons; gray initial harness, light-blue evolve splits, dark-blue unseen splits; distinct metrics on a 0–100 scale." zoomable=true %}

With Claude, Terminal-Bench rises 74.2→80.2, a 6.0-point gain, and SWE-bench Verified 82.0→83.8, a 1.8-point gain. The latter never participates in selection. Transfer preserves part of the improvement across different coding-task structures.

Harvey LAB improves 89.4→90.5 on evolve and 86.9→89.2 on ID held-out. OOD scores rise 36.0→40.7 on JobBench, 48.8→52.3 on GDPval, and 34.2→37.9 on APEX-Agents. Their equal-weight average is 39.7→43.6, a summary across different metrics rather than a pooled success rate. JobBench's 4.7-point gain is about 13.1% relative, not 13.1 points.

EngDesign rises 50.0→54.9, while Frontier-Eng Medal Score rises 17.7→22.0. Medal credit is 1, 0.67, or 0.33 for frozen gold, silver, or bronze thresholds. The paper reports a 47-task denominator, with 38 tasks able to contribute credit under environment-build constraints, and excludes the overlapping EngDesign domain. Both arms face the same conditions.

Simulator-based transfer weakens a purely judge-style explanation for all gains. It does not eliminate judge bias in workspace metrics. Deterministic grading also leaves stochastic policy behavior intact.

### Harness methods under a shared candidate budget

Table 1 starts all methods from the same harness with matched policy, evolve set, and candidate budget. Meta-Harness reaches 93.0 on evolve versus RRSI's 90.5, but both score 89.2 on ID held-out and RRSI leads on all three OOD suites. TTHE's OOD average is about 38.0, below the initial 39.7.

These are comparisons in RRSI's common setup, not each baseline's entire original evaluation. TTHE originally studies adaptation without gold labels using execution-derived proxies. Its result here should not represent every intended use of that method.

### Independent policy evolution and unseen-backbone transfer

{% include figure.liquid loading="eager" path="assets/img/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/tab3-policy.png" class="img-fluid rounded z-depth-1" caption="Table 3: Independent coding evolution with Claude Opus 4.8 and Gemini 3.5 Flash; Terminal-Bench evolve and SWE-bench OOD scores (%) and percentage-point changes." zoomable=true %}

Independent Gemini 3.5 Flash evolution raises Terminal-Bench 64.6→78.7 and SWE-bench 76.8→79.0: gains of 14.1 and 2.2 points. The abstract's maximum 14.1 comes from this additional policy experiment, not Claude's 6.0-point result.

Separately, the Gemini-evolved harness runs unchanged with Gemini 3.1 Flash Lite. Terminal-Bench rises 11.2→14.6, a 3.4-point or 30.4% relative gain. The final absolute score remains low. This tests an unseen backbone on the evolve benchmark, not simultaneous transfer to an unseen backbone and benchmark.

## Analysis / Ablation

### Complementary proposal and acceptance regularizers

{% include figure.liquid loading="eager" path="assets/img/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/tab2-ablation.png" class="img-fluid rounded z-depth-1" caption="Table 2: Evolve and held-out scores and policy tokens per trial (M) after removing proposal or acceptance controls; OOD average over JobBench, GDPval, and APEX-Agents." zoomable=true %}

Removing proposal controls raises evolve 90.5→90.7 but lowers OOD 43.6→41.9, with tokens increasing 2.42M→2.69M. Removing acceptance controls yields evolve 91.5, OOD 41.0, and 3.59M tokens, about 48.3% above RRSI. Both groups matter for transfer.

Removing both produces the highest ablation evolve score, 92.8, but only 40.3 OOD at 3.80M tokens. Regularization trades away some local gain for more transferable improvement. Group-level ablations do not isolate the individual effects of critic, history, schedule, or pruning.

### Final-harness tokens and trajectory length

{% include figure.liquid loading="eager" path="assets/img/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/fig4-cost.png" class="img-fluid rounded z-depth-1" caption="Figure 4: (a) Harvey LAB evolve policy tokens per trial (M) against OOD-average score; (b) steps per trial; starred RRSI and the shaded region of higher cost with lower OOD score." zoomable=true %}

Table 2 implies a $(3.80-2.42)/3.80=36.3\%$ token reduction from unregularized evolution, more specific than the abstract's 30% summary. Against the initial 1.56M, however, RRSI spends about 55.1% more.

Steps similarly increase from the initial 21.2 to RRSI's 26.3. Prior evolved harnesses use 27.3 for TTHE, 28.7 for Meta-Harness, 29.5 for HarnessX, and 34.6 for AHE. RRSI is the cheapest evolved arm, not the cheapest arm overall. Figure 4 measures cost on Harvey LAB evolve and plots it against OOD performance; it is not a complete cost frontier measured separately on every OOD suite.

### Concrete acceptance and rejection decisions

{% include figure.liquid loading="eager" path="assets/img/papers/0047-rrsi-regularized-recursive-self-improvement-of-agent-harness/tab6-cases.png" class="img-fluid rounded z-depth-1" caption="Table 6: Measured changes and acceptance outcomes for verification, polling, specification checks, and work-directory recovery proposals." zoomable=true %}

Coding R0-A adds bounded verification and non-blocking polling guidance, gaining 3.93 points and being accepted. Similar R0-B gains 1.69 points while increasing cost 26.1%, and is rejected. With coding's $\delta=0.017$ and $w\_s=0$, that small gain cannot itself pay for growth.

R8-B pins the original instruction into the completion gate. It saves 13.6% cost but loses 2.81 points and fails the performance floor. Engineering R2 adds a bounded work-directory recovery hint, improving 122/244→128/244 passes with 1.6% more tokens. These representative decisions explain the gates; they do not estimate how frequently such mechanisms appear across runs.

## Limitations and Critical Assessment

### Finite feedback and noise calibration

The authors acknowledge dependence on evolve-set quality, hyperparameters, and search budget. Explicit leakage screening does not remove adaptive reuse or guarantee detection of indirect fitting. Noise measured on the initial harness may not describe later candidates. Repeated trials and a conservative floor are defenses, not a statistical guarantee for the whole search.

### Bundled attribution and individual regularizer effects

Joint candidates assign the same measured change to every atomic edit. A helpful edit can hide a harmful one, affecting pruning evidence as well as credit assignment. The actual final budget of two leaves this ambiguity present late in search. Component counterfactuals or finer ablations would strengthen causal attribution.

### Search cost, long runs, and architectural transfer

Policy tokens omit pricing differences, tools, caching, and latency. Discovery cost also needs amortization over deployment use. Three domains and additional policy tests broaden evidence, but 20- or 40-round runs do not establish indefinite stability across arbitrary architectures and tool ecosystems. Joint weight learning and harness evolution remain outside the frozen-backbone study.

## Takeaways

- <strong>Separate evolution from transfer.</strong> Freeze the evolved harness before evaluating tasks that never influenced selection.
- <strong>Control persistence as well as proposal quality.</strong> Leakage, cumulative regressions, and unjustified computation can survive score-only selection.
- <strong>Use failures and untried components as evidence.</strong> Remembering only wins encourages repeated hypotheses and narrow search.
- <strong>Name the efficiency baseline.</strong> RRSI beats other evolved arms on cost but spends more than the initial harness; final inference and search cost differ.
- <strong>Read the executable rule behind the analogy.</strong> Index ranges, rounding, noise branches, novelty definitions, and guards determine behavior.

## Installation and Usage

The search core requires Python 3.10 or newer. This setup follows the README and dependency manifest. The core check does not call APIs or benchmarks.

```bash
git clone https://github.com/google-research/rrsi.git
cd rrsi
python3 -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"
python3 tests/test_core.py
```

The coding runner needs Harbor in its separate environment, Docker, Vertex AI model access, a project, and authentication. `smoke` already makes model calls; `baseline` and `run` launch many trials.

```bash
python3 -m venv domains/coding/.venv
domains/coding/.venv/bin/pip install "harbor>=0.18"
gcloud auth application-default login
export VERTEX_PROJECT="your-project-id" VERTEXAI_PROJECT="your-project-id"
export VERTEX_LOCATION=global VERTEXAI_LOCATION=global
export RRSI_VERTEX_PROJECTS="your-project-id"
python3 rrsi.py --domain coding smoke
python3 rrsi.py --domain coding baseline
python3 rrsi.py --domain coding run
```

Configuration is in `domains/coding/rrsi.json`; records are under `runs/coding/`. Workspace and engineering require the `[agentic]` extra and their domain-specific benchmark and gateway setup. Verification here covered eight official core checks and schedule endpoints, without paid policy rollouts or full benchmark reproduction.

## References

- Paper: [RRSI, arXiv:2609.24972](https://arxiv.org/abs/2609.24972), v2 main text and appendix.
- Code: [google-research/rrsi](https://github.com/google-research/rrsi), Apache-2.0.
- Implementation: [schedule.py](https://github.com/google-research/rrsi/blob/be50316e1db05914068a973f322770ef08ed7ba1/rrsi/schedule.py), [selection.py](https://github.com/google-research/rrsi/blob/be50316e1db05914068a973f322770ef08ed7ba1/rrsi/selection.py), and domain `rrsi.json` files at commit `be50316e1db05914068a973f322770ef08ed7ba1`.
- Project: [Regularized RSI](https://regularized-rsi.com/), a round-by-round explorer of proposals, critic decisions, selection, and diffs.
- Figures and tables: Xia et al.'s RRSI paper. Its [arXiv distribution license](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html) is separate from the code license.

## Further Reading

- **[Meta-Harness: End-to-End Optimization of Model Harnesses](https://arxiv.org/abs/2603.28052)** (Lee et al., 2026): Executable-harness search with access to code, scores, and prior traces.
- **[Agentic Harness Engineering: Observability-Driven Automatic Evolution of Coding-Agent Harnesses](https://arxiv.org/abs/2604.25850)** (Lin et al., 2026): Evolution organized around component, experience, and decision observability.
- **[TTHE: Test-Time Harness Evolution](https://arxiv.org/abs/2607.08124)** (Nie et al., 2026): Harness adaptation from execution-derived signals without gold labels.
- **[Evo-Bench: Can Language Models Improve Agent Harness?](https://arxiv.org/abs/2608.09096)** (Huang et al., 2026): Harness-improvement evaluation with separate evolution and evaluation tasks.

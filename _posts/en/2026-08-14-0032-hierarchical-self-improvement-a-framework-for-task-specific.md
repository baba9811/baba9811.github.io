---
layout: post
title: "[Paper Review] Hierarchical Self-Improvement: A Framework for Task-Specific Evolvable Agent Harnesses"
date: 2026-08-14 14:00:00 +0900
description: "Freeze the model, evolve only the harness across three nested scopes — +39.3 on BabyAI and +33.0 on Crafter, plus an honest account of exactly where the gains stop"
tags: ["llm-agents", "self-improvement", "agent-harness", "meta-evolution", "balrog", "frozen-backbone"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/fig1-hsi-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/
ko_url: /papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Tailin Zhou (HKUST) |
| Venue | arXiv preprint · 2026 |
| arXiv or DOI | [2608.08466](https://arxiv.org/abs/2608.08466) |
| Code | [TailinZhou/hsi](https://github.com/TailinZhou/hsi) |
| Data | BALROG — six long-horizon text game environments: BabyAI, BabaIsAI, Crafter, MiniHack, TextWorld, NLE |
| <span style="white-space: nowrap">Review date</span> | 2026-08-14 |

## TL;DR

- Nothing touches the model weights. Only the **executable scaffold around the agent — the harness — evolves**. A single frozen LLM operates across three scopes: the task harness $H$ that runs tasks, an evolver that rewrites $H$, and a meta-evolver that rewrites the evolver's strategy $\Sigma$. Only the outermost execution logic stays frozen, which is what keeps self-reference from running away.
- With DeepSeek-V4-Flash as the frozen backbone, HSI beats the initial harness on BALROG by +39.3 on BabyAI, +33.0 on Crafter, +25.0 on TextWorld, and +15.0 on MiniHack (raw % Progress). The five-environment average more than doubles, 18.9 → 41.4.
- Held out a 20% unseen split on BabaIsAI, the evolved harness still reaches 0.98 on BreakStop and 1.00 on GoTo. NLE, by contrast, sits at 0.2 even with meta-evolution on — no improvement at all.
- The real claim here isn't the numbers, it's the **boundary**. Harness evolution is bounded twice over: by a *feedback-fidelity bound* (evolution needs an informative reward signal to select on) and a *backbone capability bound* (redesigning the harness cannot buy capability the frozen model doesn't have).
- Reasoning is disabled during task execution and enabled only during self-modification. That single design choice is what separates "the harness got better" from "we just spent more inference compute," and it's the most intellectually honest part of the paper.

## Introduction

There are broadly two ways to make an LLM agent better. You can work on the model — more training, RLHF, swap in something bigger. Or you can work on everything around the model — tune the prompts, attach tools, restructure memory, add verification logic. That second bundle is what people now call the **harness**. Anyone who has actually shipped an agent knows how much leverage sits there. Two teams running the same backbone can land twenty points apart on a benchmark purely on harness design.

The awkward part is that the harness is almost always **hand-written by a human and then frozen as an artifact at deployment**. The agent performs tasks, but it never gets to rewrite how it performs them. Recent self-improvement work has pushed on this, but mostly in one of two limited ways. Either the evolvable boundary sits at the agent's *per-step decision code* (the Gödel Agent and Darwin Gödel Machine line), or the work targets a broader scaffold but relies on an **external, stronger model** as the proposer (Meta-Harness, AHE). The first has a narrow editable surface. The second leaves an attribution problem: did the agent improve, or did the stronger model that designed it?

And there's a sharper critique in the room. Wang et al. (2026b), in *Rethinking the Evaluation of Harness Evolution*, ran controlled experiments matching feedback and inference budgets and found that **parallel sampling won in both conditions tested** — 72.3% vs 67.4% for harness evolution without unit tests, and 86.0% vs 75.8% with them. On disjoint search and evaluation tasks, the generalization gain was only +0.6pp. The implication is uncomfortable: a lot of reported harness-evolution gains may be **test-time search rather than genuine capability**. This paper walks straight into that critique by design.

So the question it poses is: *when the underlying model is frozen, can an agent endogenously evolve its own harness to improve performance, and what ultimately limits such improvement?* Plenty of papers have attempted the first half. The contribution here really lives in the second.

## Key Contributions

- **The HSI framework.** A single frozen LLM evolves its own task harness through nested rewriting scopes, with a frozen outer anchor preventing unrestricted self-reference. All three scopes share the same model, the same prompt format, and the same `react()` primitive — they differ **only in available tools and execution context**.
- **Positive evidence under a controlled model ceiling.** Consistent gains on moderate-difficulty BALROG environments with a frozen DeepSeek-V4-Flash, plus held-out generalization on BabaIsAI sub-suites. Crucially, the thinking-off task execution protocol removes inference-time reasoning as a confounding factor.
- **Empirical characterization of scaling limits.** Two practical boundaries — feedback availability and backbone capability — identified and traced across environments of differing difficulty. The paper does not hide the NLE failure; it reports it as part of the result, which tells you a lot about its posture.
- **Task-specific evolution as a scaling axis.** Rather than hunting for one universal harness, each task family maintains its own, hot-swapped across iterations through a fixed task-injection seam. That's a design-level dodge around the overfitting problem Wang et al. (2026b) flagged.

## Background and Related Work

### The Gödel Machine lineage

Schmidhuber (2003) proposed a system that could modify its own program — including the procedure responsible for future modifications — provided such changes could be *proven* to improve performance. The proof requirement turned out to be essentially unsatisfiable, and recent LLM-based work has made the idea practical by swapping proof for empirical verification.

Gödel Agent (Yin et al., 2025) realized self-referential improvement through runtime code modification. Darwin Gödel Machine (Zhang et al., 2026b) combined self-referential code modification with population-based open-ended exploration, taking SWE-bench from 20.0% to 50.0%. One result there is worth holding onto: DGM's greedy ablation reached only 39.7%, confirming that archive-based exploration is doing real work. Huxley-Gödel Machine (Wang et al., 2025) identified the mismatch between benchmark performance and self-improvement potential and introduced clade-level meta-productivity. Group-Evolving Agents (Weng et al., 2026) shifted the evolutionary unit from individuals to groups, and HyperAgents (Zhang et al., 2026c) pushed further by making the meta-mechanism itself editable.

What unites this lineage is that the editable boundary sits at **the agent's decision procedure or program execution code**. Whether the broader agent harness could be evolved endogenously stayed open.

### Harness engineering

Harness engineering asks how the executable components around an LLM — prompts, tools, memory, verification — shape agent behavior. Meta-Harness (Lee et al., 2026b) formalized harness optimization as an outer-loop search problem, with a stronger coding agent as proposer holding full filesystem access to prior candidates. AutoHarness (Lou et al., 2026) synthesizes code harnesses via Thompson-sampling-guided tree search. Self-Harness (Zhang et al., 2026a) showed that a fixed model can improve its own harness without external help through weakness mining, harness proposal, and proposal validation (MiniMax M2.5, 40.5% → 61.9%).

A parallel line handles adaptation during deployment. TTHE (Nie et al., 2026) evolves harnesses from execution traces at test time; Live-SWE-Agent (Xia et al., 2025) creates tools mid-problem; Continual Harness (Karten et al., 2026) extends to reset-free online settings.

But nearly all of these evolve **the task harness itself**, not the *mechanism* governing how harnesses get discovered, selected, and rewritten. That gap is exactly where HSI lands.

### Evaluation and theoretical limits

Harness-Bench (Yao et al., 2026) established harness design as an independent evaluation axis, reporting a 23.8-point gap between best and worst harness under identical models. Harness Updating Is Not Harness Benefit (Lin et al., 2026b) decoupled an agent's ability to *produce* harness updates from its ability to *benefit* from them, and found the latter is non-monotonic — mid-tier models benefit most (+19.3pp), while weak-tier models benefit least due to low skill-load rates (25.1% vs 95.7%). That's a direct precedent for this paper's NLE negative result.

On the theory side, Wang et al. (2026a) established that distribution-free PAC guarantees are preserved under self-modification **if and only if** the policy-reachable hypothesis family has uniformly bounded VC dimension. When the task-required function complexity exceeds the model's reachable VC dimension, no amount of harness engineering closes the gap. HSI's *backbone capability bound* is the empirical shadow of that theorem.

<div class="row mt-3"><div class="col-sm mt-3 mt-md-0">
{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/tab4-comparative-summary.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4: Representative harness evolution and self-improvement methods compared with HSI. Proposer is who proposes harness edits; Surface is the editable code surface. Note how the Domain column is dominated by Coding while HSI alone sits on BALROG, and that HSI's proposer is the same frozen M — those two cells locate the paper."
   zoomable=true %}
</div></div>

## Method and Architecture

### Design principles — why hierarchy is forced

The harness HSI assumes is *task-specific and continuously evolvable*: each task family keeps its own harness, hot-swappable across iterations through a fixed task-injection seam, refined using environment feedback.

That's where hierarchy stops being a stylistic choice. In a single-layer design, the harness's task-facing behavior and the strategy responsible for rewriting it are coupled — the object of optimization and the optimizer become inseparable. Hierarchical separation pulls them apart: the task harness evolves while its rewriting procedure stays anchored, and the rewriting procedure itself evolves one layer above while the outer anchor stays fixed.

**Principle 1 (single frozen model, three harness scopes).** One frozen LLM $M$ operates across three scopes. In the task-harness scope, $M$ executes harness $H$ to interact with the environment. In the evolver scope, $M$ modifies $H$ through seed selection, harness evolution, and candidate selection. In the meta-evolver scope, $M$ modifies the evolver strategy itself, including decisions like seed generation, commit selection, archive maintenance, and final version export.

All three share the same frozen model, prompt format, and `react()` primitive. **They differ only in available tools and execution context.** Scopes are separated by explicit memory boundaries — they maintain independent histories rather than representing independent agents. This matters: unlike external-proposer approaches, HSI uses the same frozen model for both executing and rewriting, so attribution of the improvement is unambiguous.

**Principle 2 (self-determined explore–exploit).** HSI prescribes no explicit explore–exploit schedule. When to inspect code, evaluate candidates, record lessons, or allocate effort between exploration and exploitation — all of it is treated as part of the evolvable strategy controlled by $M$. The framework provides only atomic interaction primitives, evolutionary feedback signals, and structural invariants.

### The three scopes

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/fig1-hsi-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: The HSI framework. Green on the right is the task harness H (HarnessPolicy, context/memory/prompt, hooks/tools/helpers); blue in the middle is the evolver's three stages (seed selection → main evolution → commit selection); purple on the left is the meta-evolver rewriting four policies inside the evolver strategy Σ. The File System row at the bottom is what physically enforces the memory boundaries between scopes."
   zoomable=true %}

The **task-harness scope** executes the current harness $H$, which contains the prompts, tools, memory, state management, hooks, and the policy determining how the model interacts with the environment. It is the primary editable object and connects to tasks through a fixed injection seam.

The **evolver scope** modifies the task harness across iterations, executing the evolution procedure defined by $\Sigma$ in three stages: seed selection, main evolution, commit selection. It receives environment feedback through harness evaluation and maintains persistent information through the evolution archive and bootstrap memory.

The **meta-evolver scope** operates one level above and modifies $\Sigma$ itself. Critically, **the execution logic that performs meta-evolution is not editable**. It loads from an immutable initialization template and serves as the outer frozen anchor bounding self-modification.

Equation 9 in the appendix compresses the whole hierarchy into a line:

$$
M \;\longrightarrow\; H \;\longrightarrow\; \Sigma \;\longrightarrow\; \text{frozen anchor}
$$

Lower layers remain adaptable; the outermost execution boundary stays fixed. That's where the recursive modification process terminates.

### The five-stage evolution loop

The first three stages operate on the task harness $H$, the fourth modifies the evolution strategy $\Sigma$, and the final stage selects the harness exported for evaluation. Each is implemented as a bounded `react()` loop whose central decisions are delegated to the frozen $M$.

Let $H\_t$ be the harness at the start of iteration $t$, and let $\mathcal{G}\_t = (V\_t, E\_t)$ be the cumulative evolution graph. Each node $v \in V\_t$ is a committed harness snapshot annotated with reward $r\_v$; edges store semantic relations describing how one version relates to another.

$$
\begin{aligned}
(\hat{H}_t,\, h_t) &= \mathrm{SeedSelect}(\mathcal{G}_t,\, M) &&\text{(1)} \\
\{V_t^{(k)}\}_{k=1}^{K_t} &= \mathrm{MainEvolve}(\hat{H}_t,\, h_t;\, M) &&\text{(2)} \\
C_t &= \mathrm{CommitSelect}(\{V_t^{(k)}\}_{k=1}^{K_t},\, \mathcal{G}_t;\, M) &&\text{(3)} \\
\Sigma_{t+1} &= \mathrm{MetaEvolve}(\mathcal{G}_t \cup C_t,\, \Sigma_t;\, M) &&\text{(4)} \\
H^{*} &= \mathrm{BestVersionSelect}(\mathcal{G}_T,\, M,\, \Sigma) &&\text{(5)}
\end{aligned}
$$

(The paper writes these as `seed_selection`, `main_evolution`, `commit_selection`, `meta_evolution`, and `best_version_selection`.)

**Seed selection (Eq. 1)** picks an ancestor from $\mathcal{G}\_t$ and generates a structured hypothesis $h\_t$ for the next iteration. $M$ makes the decision using previous rewards, evolution history, and accumulated lessons. The hypothesis carries four elements: the selected anchor version, the motivation for choosing it, the expected improvement direction, and a **falsification criterion**. That last one is the interesting design move. Injecting the hypothesis into the subsequent evolution process turns evolution from unconstrained mutation into a goal-directed search guided by explicit predictions.

**Main evolution (Eq. 2)** is where $M$ directly modifies the harness. The editable surface spans all task-facing components — prompts, tools, memory, state management, hooks, execution policies. The one invariant preserved across every rewrite is the **task-injection interface**: internal components may change freely, but the external interface connecting tasks to the harness stays fixed. That invariant is what makes evolved versions directly comparable and the harness hot-swappable.

**Commit selection (Eq. 3)** deliberately does not keep only the highest-reward candidate. It maintains a **diverse commit pool** containing multiple evolutionary directions. Each selected version enters the evolution graph together with the semantic rationale generated by $M$, so future seed selection can reason over successful, failed, and unexplored branches.

**Meta-evolution (Eq. 4)** modifies the strategy $\Sigma$ governing harness evolution. The editable surface of $\Sigma$ covers seed selection, main evolution, commit selection, and final version selection. By modifying $\Sigma$, the meta-evolver changes not just candidate harnesses but **the search strategy used to discover future harnesses**.

**Best-version selection (Eq. 5)** picks the deployed harness after $T$ iterations. Unlike intermediate commit selection, which maintains diversity, this stage **prioritizes generalization**. Candidates are evaluated on validation performance and the selected harness is exported for held-out evaluation. The selection procedure is itself part of $\Sigma$, so meta-evolution can adapt how final deployment decisions get made.

### Execution interface and memory

All HSI components instantiate with the same frozen $M$ and a shared `react()` primitive. At each step the model receives the current message history, available tools, and task-specific context, and produces an action:

$$
a_t = M(o_t,\, \mathcal{T},\, \mathcal{C}_t)
$$

where $o\_t$ is the current observation, $\mathcal{T}$ the available tool set, and $\mathcal{C}\_t$ the scope-specific context. The action may modify files, request evaluation, record information, or terminate the current stage.

Beyond file manipulation (`read`, `write`, `edit`, `bash`), the evolver scope gets evolution-specific primitives:

| Tool | Role |
|------|------|
| `plan` | maintain an iteration-local reasoning notebook |
| `compact_context` | summarize prior interactions when the context budget tightens |
| `evaluate` | execute the current harness and return environment feedback |
| `lesson` | record reusable insights for future iterations |
| `end_evolution` | terminate the current evolution process |

The framework specifies no ordering among these. The model decides when and how to use each based on observed feedback and the current evolution objective.

Memory splits into three channels with different persistence. **Iteration-local memory** lives in `plan.md`; if a candidate version is discarded, this memory rolls back with the code state. **Persistent evolutionary memory** is the lesson archive in `BOOTSTRAP.md`, summarizing discovered patterns, failed directions, and reusable evolution guidance. **Evolution graph memory** is $\mathcal{G}\_t$, whose nodes hold the harness snapshot, achieved reward, and step metadata, and whose edges encode semantic relationships like extending an existing approach, repairing a failure mode, or exploring a different direction.

Exposing all historical trajectories to the LLM would blow the context budget and inject noise, so HSI uses a probe mechanism that retrieves compressed summaries:

$$
z = \mathrm{probe}(\mathcal{T}_{\text{history}},\, q)
$$

The meta-evolver might query which seed-selection behaviors correlate with successful iterations, which evolution patterns frequently lead to regression, or which hypothesis structures precede large improvements. It's how the meta-evolver exploits long-horizon history while keeping its reasoning context bounded.

### Scope isolation and the evaluation interface

HSI enforces explicit boundaries. The task harness $H$ is editable by the evolver but cannot modify the evolution strategy $\Sigma$. Conversely, the meta-evolver can modify $\Sigma$ but cannot directly alter the task harness during meta-evolution. Any modification outside the authorized directory is rejected.

Evaluation happens **outside** the editable surfaces. The harness receives tasks through a fixed interface:

$$
\mathrm{using\text{-}harness}(\mathit{agent},\, \mathit{task})
$$

Although the internal implementation of $H$ changes across iterations, this interface stays invariant. Every evolved version therefore operates under the same task injection mechanism and can be compared using identical development, validation, and test protocols. The evaluator returns both a scalar reward and optional textual feedback.

## Training Objective

There's no gradient-minimized loss here — the model parameters are frozen. What plays the role of the optimization signal is a **stochastic lower-confidence-bound reward** used to rank candidate harnesses:

$$
r = \mu - z \cdot \frac{\sigma}{\sqrt{n}}, \qquad z = 0.5
$$

where $\mu$ and $\sigma$ are the mean and standard deviation over evaluation trials and $n$ the trial count. BALROG's episode-level % Progress (0–100) is rescaled to $[0,1]$.

It's worth thinking about why this shape is necessary. During evolution, each candidate harness is evaluated with **one episode per call** for efficiency. In that low-sample regime, selecting on the mean alone would routinely promote trajectories that got lucky. The LCB penalizes proportionally to variance, shaving off that optimistic bias. At $z = 0.5$ the penalty is fairly mild, which reads as a deliberate compromise to avoid over-suppressing exploration.

Note, though, that **all reported results use raw % Progress means, not LCB rewards**. The LCB is confined to candidate selection during evolution; final evaluation uses the full episode budget for a more stable estimate. Keeping the selection criterion and the reporting criterion separate is the right call — mixing them lets selection bias leak into the headline numbers.

## Data and Pipeline

### Benchmark

BALROG (Paglieri et al., 2025) is a benchmark of long-horizon text-based interactive environments designed to evaluate planning, memory, exploration, and tool use. Its six environments span a deliberate difficulty gradient.

| Environment | Capability demand |
|------|------|
| BabyAI | instruction following and navigation in structured environments |
| BabaIsAI | rule-manipulation puzzles (sub-suites: BreakStop / GoTo / Make / Advanced) |
| Crafter | long-horizon planning, resource management, sequential decision making |
| TextWorld | multi-step reasoning and object manipulation |
| MiniHack | roguelike with complex state spaces and sparse feedback |
| NLE | the same, considerably harder (NetHack Learning Environment) |

That gradient is the paper's key instrument. Tasks where the frozen backbone achieves non-trivial performance sit in the same frame as tasks where performance stays floored, which means you can watch **where harness evolution works and where it stops** inside a single experiment.

### Backbone and evolution configuration

Every experiment uses DeepSeek-V4-Flash, accessed through the `deepseek-v4-flash-preview` API, as the frozen backbone across all three scopes. Each evolution run consists of $T = 5$ outer iterations with a maximum of 80 `react()` steps per iteration.

The single most important setting is the **thinking on/off split**:

| Scope | Reasoning | Temperature | Step budget |
|------|------|------|------|
| task-harness | disabled (thinking off) | 0 | — |
| evolver | enabled, reasoning effort at maximum | — | up to 80 `react()` per iteration |
| meta-evolver | enabled | — | up to 50 `react()` per iteration |

Disabling extended reasoning during task execution fixes the model's per-step capability ceiling. The configuration is held constant across development evaluation, validation evaluation, best-version selection, and final testing. Therefore **improvements observed during task execution cannot be attributed to additional reasoning computation at inference time**. That's a direct answer to the test-time-scaling confound Wang et al. (2026b) raised.

The evolution space is constrained too. All task interactions must be mediated through the frozen backbone $M$. Evolution may modify prompts, tools, memory, state management, and control logic, but **cannot replace the model with external search procedures or non-LLM policies**. Without that constraint, "harness evolution" degenerates into "throw out the LLM and write a BFS."

The meta-evolver scope runs with a greedy archive, with seed selection and commit pooling both evolvable, the seed hypothesis injected into each iteration's first system prompt, and a short seed-validation probe (up to three `evaluate()` calls) enabled during seed selection. The **terminal best-version selection stage is a fixed, non-evolvable agentic stage** that runs once at the end of every evolution. The init harness is not pre-evaluated; iteration 1 starts cold.

### Evaluation protocols

BALROG environments are procedurally generated and each `evaluate()` call samples a new initial seed. Two protocols are used.

**In-distribution evolution (Setup A).** The same task set is used during evolution and final evaluation, while each evaluation episode comes from a newly sampled environment seed. This measures whether harness evolution improves performance under stochastic variations of previously encountered tasks. Applied to TextWorld, BabyAI, Crafter, MiniHack, and NLE.

**Held-out task generalization (Setup B).** For BabaIsAI, task-family splits are constructed on sub-suite categories (BreakStop, GoTo, Make, Advanced). Each sub-suite divides into development, validation, and test portions, and **the test split remains inaccessible throughout evolution**. Advanced is excluded — with only three tasks it can't support a meaningful split.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/tab3-per-suite-config.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: Per-suite experimental configuration. Dev and Val are the fractions of the suite assigned to dev (evolution reward signal) and val (best-version selection); Test ep. is the per-task episode count at final test; Dev ep. is the per-task episode count during evolution (cheaper, with noise absorbed by the LCB reward); Test rep. is how many times the full test set is re-evaluated after evolution; Submit-best is the step budget of the terminal best-version selection stage."
   zoomable=true %}

### Baselines

Three reference comparisons. First, **Init Harness** — the original hand-crafted harness evaluated without evolution under the same backbone and protocol. This is the primary controlled baseline for measuring the effect of harness evolution. Second, publicly reported BALROG leaderboard results, providing context against frontier models under their native configurations. Third, external-proposer harness optimization methods are **deliberately excluded** from the controlled comparison, since methods relying on stronger external models operate under a different assumption from endogenous evolution under a fixed backbone.

## Experimental Results

### In-distribution performance (Setup A)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/tab1-balrog-comparison.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: BALROG leaderboard comparison under Setup A. The top block lists public-leaderboard numbers retrieved 2026-08-03 from frontier models under their native configurations; the bottom three rows are the controlled comparison under a single frozen DeepSeek-V4-Flash backbone. BabaIsAI is omitted because its sub-suite protocol differs from the leaderboard's mixed-task protocol."
   zoomable=true %}

The comparison that matters is the bottom three rows. All three use DeepSeek-V4-Flash and **differ only in whether and how the harness is evolved**.

Starting from the same backbone and task-time inference configuration, the meta-evolution-on arm substantially improves over the init harness across all non-trivial suites.

> BabyAI 81.3 (init harness 42.0, +39.3) · Crafter 44.6 (11.6, +33.0) · TextWorld 65.0 (40.0, +25.0) · MiniHack 15.8 (0.8, +15.0)

The five-environment average moves 18.9 → 41.4, with the backbone and task-time reasoning budget unchanged.

The frontier comparison is interesting too. On TextWorld, HSI's 65.0 % Progress exceeds Grok-4 (62.9), Claude-Opus-4.5-Thinking (59.0), and Gemini-3-Flash (50.2). On Crafter, 44.6 outperforms DeepSeek-R1 (36.4), GPT-5-minimal-think (39.1), and GPT-4o (33.1). These cross different backbones and configurations, so read them as contextual reference only — the controlled init-harness comparison is what isolates the effect of harness evolution.

### Held-out generalization (Setup B)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/tab2-babaisai-heldout.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: BabaIsAI sub-suite results under Setup B (split evolution with 20% held-out test). Best Dev is the highest development reward selected during evolution; test results are reported with across-task standard deviation. Init Harness is averaged over three baseline runs."
   zoomable=true %}

Each sub-suite evolves an independent harness while keeping the backbone, evolution budget, initialization template, and evaluation protocol fixed. The only varying factor is the task family.

Two distinct regimes emerge. On **navigation-oriented tasks** (BreakStop, GoTo), held-out performance is near-perfect: meta-on reaches 0.9800 and 1.0000 respectively, from init harnesses at 0.0333 and 0.1818. The meta-off variant achieves comparable results (1.0000 and 0.9636), which also tells us meta-evolution isn't decisive at this difficulty. The evolved harness has discovered **reusable interaction patterns** that transfer beyond the observed development tasks.

**Make is a different story.** Harness evolution improves over the zero-shot init harness (0.0000), but held-out performance stalls at 0.3625 for meta-on and 0.3375 for meta-off. Against a Best Dev of 0.5556, the dev→test gap is substantial. The standard deviation of 0.3284 is telling too: it works on some tasks and not at all on others. Multi-step crafting requires capabilities beyond the reusable harness transformations discovered during evolution.

### The effect of meta-evolution

The meta-off ablation in Table 1 isolates the contribution of evolving the evolution strategy itself. Removing the meta-evolver reduces performance on every evaluated suite.

| Suite | meta-on | meta-off | Δ |
|------|------|------|------|
| BabyAI | 81.3 | 77.3 | −4.0 |
| Crafter | 44.6 | 36.4 | −8.2 |
| TextWorld | 65.0 | 46.0 | −19.0 |
| MiniHack | 15.8 | 5.8 | −10.0 |
| Average | 41.4 | 33.1 | −8.3 |

The largest improvements land on TextWorld (+19.0) and MiniHack (+10.0), suggesting that **adapting the evolution procedure becomes increasingly beneficial as the harness search space grows more complex**. Read the other way, in a relatively simple environment like BabyAI the marginal contribution of meta-evolution is small (+4.0).

NLE admits no meaningful meta-off comparison because both configurations achieve near-zero reward. The meta-on result of 0.2 indicates that **evolution receives insufficient task feedback to discover useful harness modifications**.

### Evolution trajectories

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/fig2-crafter-trajectory.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: HSI evolution trajectory on Crafter (Setup A, meta-on). Dev reward climbs from the init-harness baseline of 0.166 to an iteration-best 0.578 at iteration 4 (green star = exported best version), with a regression in iteration 5. Each iteration card reports seed origin, main-evolution edit, result, and commit pool, plus a meta field summarizing what the meta-evolver rewrote in Σ."
   zoomable=true %}

The Crafter trajectory shows the typical in-distribution pattern. Early iterations mainly **introduce missing task representations** — exposing latent reward signals, structuring inventory information, improving action-state alignment. Iteration 1 delivers the single biggest jump, 0.166 → 0.430 (2.6×). Iteration 2 adds structured inventory and crafting hints for 0.511 (+19%). Iteration 3 plateaus at 0.488, with the card noting it "hits LLM spatial limit." Iteration 4 reaches the 0.578 peak via ensemble fusion of two ancestors plus safety constraints. Iteration 5 regresses, 0.497 → 0.341.

That regression is the useful part. It's evidence that **evolution does not monotonically improve every branch but searches a non-convex harness design space**. The best version came from iteration 4, not the last one — which is precisely why the terminal best-version selection stage has to exist.

The meta-evolver's contribution is transforming successful local discoveries into **reusable evolution heuristics**. Across iterations it updates $\Sigma$ with higher-level principles like prioritizing structured state representations over raw observations and avoiding overly aggressive exploration near a performance plateau. These changes affect future search behavior rather than directly modifying task performance.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/fig3-babaisai-make-trajectory.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: HSI evolution trajectory on BabaIsAI-Make (Setup B, meta-on). The blue curve is dev reward, red rings mark commit-pool versions, and orange triangles flag commits finalized in val mode with no dev evaluation recorded on the commit itself. Each triangle sits at the commit's anchor x with the val reward on the y-axis, and a dashed vertical line drops from the dev anchor to the val reward."
   zoomable=true %}

The BabaIsAI-Make trajectory demonstrates held-out evolution. Unlike Crafter, Setup B explicitly exposes validation behavior. Dev peak moves 0.222 → 0.333 → 0.222 (plateau) → 0.444 → 0.556 across the five iterations, as the agent introduces a single-`react()` rewrite with plan tracking (iter 1), a spatial-map builder with WIN-target persistence (iter 2), auto-target computation with BFS pathfinding (iter 3), an auto-push mechanism with directional fallback (iter 4), and LLM-aware cross-room navigation (iter 5).

The meta-evolver codifies a **"LLM targets, BFS navigates"** two-layer pattern and progressively expands the commit pool from one to three versions. That pattern is genuinely striking: the agent worked out on its own that semantic judgment (which target to pursue) belongs to the LLM while deterministic computation (how to get there) belongs to BFS — and then wrote that division of labor into its own strategy.

The held-out validation markers show that several discovered mechanisms transfer beyond the development tasks, but the remaining gap (dev peak 0.556 vs test 0.3625) indicates multi-step crafting still sits close to the frozen backbone's capability boundary.

## Analysis and Ablation

### What actually worked

Overlay the two trajectories and a consistent three-phase pattern appears: **early iterations discover missing abstractions**, **middle iterations introduce structured algorithmic components**, and **later iterations refine or prune competing designs**. That's qualitative evidence that self-improvement happens through progressive harness restructuring rather than simple prompt optimization.

More concretely, the dominant lever the evolver found on Crafter was **making hidden game feedback explicit** — reward signal, inventory state, and crafting feasibility, exposed successively in the harness context. Which is, notably, the first thing a human does when tuning an agent. The evolution did not make the model capable of something new; it **unblocked capability the model already had but couldn't reach for lack of information**. That observation is the key to understanding both bounds below.

One more pattern: across evolution runs, **the largest improvement typically occurs during the first iteration**, followed by smaller incremental gains. Early harness redesign captures the dominant improvements while later iterations refine existing solutions through exploration and selection. Practically, that means diminishing returns on increasing $T$ set in fast.

### Two boundaries

Across BALROG the same qualitative pattern holds. Harness evolution provides the largest improvements where the frozen backbone already exhibits meaningful competence, smaller and noisier gains near the capability boundary, and limited improvement where useful feedback is hard to obtain.

**Feedback-fidelity bound.** Evolution requires an informative reward signal to guide selection. Harness modifications are difficult to evaluate from static inspection alone; the only useful signal is whether the modified harness produces improved behavior when executed. NLE is the case study — rewards are so sparse that evolution has no way to know what to improve. The meta-on figure of 0.2 is closer to noise than to improvement.

**Backbone capability bound.** Harness redesign cannot overcome limitations of the frozen model. The Crafter iteration-3 card saying "hits LLM spatial limit" states it outright. The BabaIsAI-Make dev–test gap is the same phenomenon. Harness evolution can reorganize and amplify behavior around a model, but it cannot overcome tasks where the model cannot generate useful interaction signals.

Both bounds are the empirical counterpart of Wang et al. (2026a): when task-required function complexity exceeds the model's reachable VC dimension, no amount of self-modification closes the gap. They're also a direct replication of Lin et al. (2026b)'s finding that harness-benefit is non-monotonic and weakest for weak-tier models.

### The single-seed choice

HSI intentionally avoids population-based parallel scaling and follows a single evolving lineage, so that performance changes can be attributed to harness redesign rather than to increased candidate throughput. It trades search efficiency for attribution clarity.

Methodologically that's the right call, but it costs something. DGM's ablation showed archive-based population exploration buys real gains over greedy (50.0% vs 39.7%). HSI forgoes those, and the paper acknowledges as much, leaving population-based exploration as a complementary scaling dimension.

## Limitations and Critical Assessment

**Acknowledged by the author.**

- Computational constraints limit evaluation to a selected set of benchmarks, backbones, and comparisons. The paper explicitly frames itself as an initial exploration rather than a full-scale empirical study.
- Evolution requires informative feedback; environments with extremely sparse rewards provide insufficient signal.
- Final performance remains constrained by the capability of the frozen model.
- Single-seed evolution sacrifices search efficiency.

**Additional limitations from a reviewer's standpoint.**

- **There is exactly one backbone.** Every result comes from DeepSeek-V4-Flash. Given that Lin et al. (2026b) reported non-monotonic harness-benefit and Zhang et al. (2026a) showed that different models produce completely different harness modifications from the same initial harness and algorithm, it's unclear how general the two bounds derived from a single backbone really are. If the "mid-tier models benefit most" finding holds, DeepSeek-V4-Flash may have been sitting exactly where the gains are most visible.
- **No statistical significance testing.** All reported variation comes from the *evaluation* side — variance across evaluation episodes, plus Table 3's Test rep. (the full test set re-evaluated up to three times after evolution). What's missing is *reproducibility of the evolution run itself*: would re-running evolution under the same configuration produce a comparable harness? In Table 2 only Init Harness is averaged over three baseline runs; the HSI arms read as a single evolution run each. Since the paper itself says harness evolution is inherently stochastic, run-to-run variance is essential to interpreting the results. GSME (Luo et al., 2026b) makes exactly this point: a non-statistical "mean improves" rule credits roughly 60% of truly neutral mechanisms as wins.
- **Table 3's Meta column contradicts the main results.** The appendix table records Meta as `off` for TextWorld and BabaIsAI-BreakStop, while the prose defines that column as "whether the meta-evolver scope is enabled." Yet Table 1 reports TextWorld meta-on at 65.0 and Table 2 reports BreakStop meta-on at 0.9800. What configuration the meta-on arm actually ran under for those two suites is ambiguous — and TextWorld is the suite where meta-evolution contributes most (+19.0), so the ambiguity isn't trivial.
- **The Dev / Val ratio definitions don't add up.** The prose defines Dev and Val as fractions of the suite assigned to each, yet BabaIsAI-GoTo and Make list Dev 0.8 and Val 0.25, summing to 1.05 — and with the 20% test split, 1.25. Val is presumably a subset of, or overlapping with, dev, but this is never stated, which makes the Setup B split hard to reproduce as specified.
- **The held-out evidence base is thin.** Only three BabaIsAI sub-suites were actually evaluated held-out, and two of them (BreakStop, GoTo) are essentially saturated (0.98, 1.00), so ceiling effects blunt their discriminative power. The one genuinely hard sub-suite, Make, reaches 0.36. That's a thin sample on which to rest a claim about generalization within a task family.
- **Costs are not reported at all.** Neither the evolution cost (up to 80 `react()` steps per iteration × 5 iterations × three scopes) nor the inference-time overhead of the evolved harness appears anywhere — and a harness carrying BFS pathfinding and a spatial-map builder plausibly costs more per step than the init harness. Compare Live-SWE-Agent, which reports an overhead of 0.02–0.12 USD per task. The claim that these gains aren't test-time search is only half-defended by turning reasoning off; if the evolved harness itself consumes more environment steps, a budget comparison is still owed.
- **The price of the invariant task-injection seam.** The invariant enables hot-swapping and version comparison, but it also confines the reachable harness space to whatever shape the seam permits. The initial seam design is a strong human-supplied inductive bias, and there's no ablation on how it was designed or how results would shift under a different seam.

## Takeaways

- **The harness above a frozen model is still a substantially under-optimized axis.** A five-environment average of 18.9 → 41.4 without touching a single parameter. Read practically: a good share of your agent's performance gap may live in the scaffold rather than the model. Suspect the harness before you swap the backbone.
- **Honest verification of self-improvement is decided by what you froze.** The most transferable thing here isn't the result, it's the protocol — reasoning off during task execution, all interaction routed through the frozen $M$, no replacing the model with external search, evaluation held outside the editable surface. Harness-evolution gains reported without those controls are indistinguishable from test-time scaling.
- **What evolution discovers is usually not "what the model couldn't do" but "what the model couldn't see."** The dominant Crafter lever being the exposure of hidden game feedback is a practical design lesson: before trying to inject new capability, find the observability bottleneck stopping the model from using capability it already has.
- **Per-task-family harnesses look more realistic than one universal harness.** Reusable strategies emerge within BabaIsAI, but those mechanisms don't automatically transfer to substantially different environments. Scaling self-improving agents likely means maintaining specialized evolvable harnesses per task distribution rather than growing a single universal one.
- **Being able to diagnose the ceiling in advance tells you whether to run evolution at all.** When rewards are sparse (feedback bound) or the model can't handle the task's basic elements (capability bound), harness evolution burns time and tokens. Five iterations on NLE yielding 0.2 isn't a failure — it's calibration data for that diagnostic.

## Installation and Usage

The author released source code at [TailinZhou/hsi](https://github.com/TailinZhou/hsi). The paper contains no runnable example, so the following is a conceptual summary of the interface structure it describes.

```text
harness/          ← task harness H (editable by the evolver)
  HarnessPolicy, context/memory/prompt, hooks, tools, helpers
evolution/        ← evolver strategy Σ (editable by the meta-evolver)
  seed policy, evolution policy, commit policy, best-version selector policy
plan.md           ← iteration-local notebook (rolled back if the candidate is discarded)
BOOTSTRAP.md      ← lesson archive persisting across iterations
<meta-evolver execution logic>  ← immutable initialization template (frozen anchor)
```

The evaluation entry point is fixed at `using_harness(agent, task)`, and an evolved harness must preserve that signature no matter how its internals change — otherwise hot-swapping and cross-version comparison break. If you attempt a reproduction, start by matching the per-suite settings in Table 3 (Dev / Val ratios, episode counts, Meta on/off, submit-best step budget).

## References

- Paper: [arXiv:2608.08466](https://arxiv.org/abs/2608.08466)
- Code: [github.com/TailinZhou/hsi](https://github.com/TailinZhou/hsi)
- Benchmark: [BALROG](https://github.com/balrog-ai/BALROG)

## Further Reading

- **[BALROG: Benchmarking Agentic LLM and VLM Reasoning On Games](https://arxiv.org/abs/2411.13543)** (Paglieri et al., ICLR 2025) — the benchmark this paper rests entirely on. Placing everything from BabyAI to NetHack on one difficulty gradient is what makes the two-bounds argument possible.
- **[Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents](https://arxiv.org/abs/2505.22954)** (Zhang et al., ICLR 2026) — self-referential code modification combined with archive-based population exploration. Its greedy ablation (39.7% vs 50.0% full) quantifies the opportunity cost of HSI's single-lineage design.
- **[Gödel Agent: A Self-Referential Agent Framework for Recursive Self-Improvement](https://arxiv.org/abs/2410.04444)** (Yin et al., 2025) — the first LLM-based self-referential improvement framework, and the canonical case of placing the editable boundary at the decision procedure. HSI's starting point for widening that boundary to the harness.
- **[Rethinking the Evaluation of Harness Evolution for Agents](https://arxiv.org/abs/2607.12227)** (Wang et al., 2026) — the critique that much of the reported harness-evolution gain is indistinguishable from test-time scaling. HSI's thinking-off protocol and controlled baseline design are the answer to it.
- **[On The Statistical Limits of Self-Improving Agents](https://arxiv.org/abs/2510.04399)** (Wang et al., 2026) — establishes the necessary and sufficient condition, in terms of VC dimension, for distribution-free PAC guarantees to survive self-modification. The theoretical skeleton behind HSI's backbone capability bound.

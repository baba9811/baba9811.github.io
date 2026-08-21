---
layout: post
title: "[Paper Review] Agentic Method for Deterministic Validation of Legacy Code Migration"
date: 2026-08-21 14:00:00 +0900
description: "American Express's Locksmith Loop: when input search stalls during COBOL-to-Java migration validation, mutate the harness itself to open new execution regions, apply the mutation symmetrically to both languages, and let a deterministic parity oracle decide what survives"
tags: ["software-testing", "agentic-systems", "legacy-migration", "cobol", "mutation-testing", "differential-testing", "search-based-testing"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/fig2-locksmith-loop.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/
ko_url: /papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Andras Ferenczi et al. (5 co-authors, American Express) |
| Venue | arXiv preprint · 2026 |
| arXiv or DOI | [2607.28271](https://arxiv.org/abs/2607.28271) |
| Data | AWS CardDemo CBACT01C (430 lines) · CBSTM03A (924 lines) · internal production-like batch program (4,114 lines) |
| <span style="white-space: nowrap">Review date</span> | 2026-08-21 |

## TL;DR

- The hard part of a 1:1 COBOL-to-Java migration is not the translation, it is the <strong>validation</strong>. Real test data does not exist, and decades of "broken-as-usual" behavior have quietly become part of the spec. This paper automates that validation with the Locksmith Loop.
- The loop alternates two phases. <strong>Witness Search</strong> sweeps the input and mock space with six algorithms (pairwise · 3-way · LHS · ART · MAP-Elites · UCB1) until nothing new opens. At that plateau, <strong>Mutation</strong> forces one Locked Paragraph open. The moment it opens, control returns to Witness Search, which now explores recursively from inside the newly reachable region.
- The load-bearing design choice is that every mutation is applied <strong>symmetrically</strong> to the COBOL mock and the generated Java. That makes the coverage-increasing edit itself subject to parity checking. The verdict comes from a deterministic <strong>Parity Gate</strong> over three axes (paragraphs_hit, stub_log, terminal_state), not from an LLM.
- The LLM (the Authoring Layer) never writes migration code. It proposes a Mutation Skill when the deterministic tooling gets stuck, and acceptance is decided by two deterministic conditions: does coverage increase, and does the Parity Gate pass. Separating generation from judgment is the spine of the paper.
- Results on three programs. CBACT01C (430 lines): 16/16 paragraphs, 28/28 transitions, 60/62 branches (96.8%). CBSTM03A (924 lines): 24/25 paragraphs (96.0%), 37/38 transitions (97.4%), 74.0% branch coverage, parity 38/38 PASS. The internal production-like program (4,114 lines): 135/142 paragraphs (95.1%), 101/146 transitions (69.2%), 91.90% branch coverage (397/432), with 166/166 PASS, 0 FAIL, 0 ERROR. On the two larger programs, where the paper breaks coverage down by phase, Mutation opened as much ground as Witness Search or more.

## Introduction

COBOL is still running on mainframes at the core of banking, cards, and insurance. Decades of business rules are compressed into that code, and a good fraction of them exist nowhere else — certainly not in documentation. LLM-based coding agents have made reading that code and emitting Java dramatically easier. The problem is what comes next: how do you <em>prove</em> the translation behaves like the original?

The usual practice is parallel run. Keep the legacy and the replacement alive side by side, watch for output divergence, and cut traffic over once confidence accumulates. The limitation is obvious. Real traffic only walks a fraction of the paths, and the long tail executes for the first time after cutover. Worse, legacy systems contain behavior that contradicts the original product definition but has calcified into the de facto spec — what the authors call "broken-as-usual." In lift-and-shift modernization you have to reproduce those bugs exactly. The target is not <em>correctness</em>; it is <em>compatibility</em>.

The American Express team's answer compresses into two sentences. If coverage stalls not because you are picking bad inputs but because <strong>the answer lies outside the input space the harness can express</strong>, stop searching harder and widen the harness boundary instead. And if you apply the widening edit identically to both the legacy and the replacement, that edit becomes something the parity oracle can check. Everything else in the paper is engineering to make those two moves auditable and reproducible. It is worth reading even if you will never touch COBOL, because it is a concrete answer to a question that keeps recurring in the agentic era: what, exactly, adjudicates the agent's output?

## Key Contributions

- <strong>The Locksmith Loop — recursive harness expansion as the central validation mechanism.</strong> Input-space exploration (Witness Search) and parity-preserving code mutation alternate, and a successful mutation returns control to a full sweep from inside the newly opened region. The authors are not aware of prior legacy-to-modern migration work that puts recursive harness expansion at the center of validation.
- <strong>The Parity Gate — a deterministic oracle for agent output.</strong> Three axes compare behavioral fingerprints between the COBOL mock and the generated Java: paragraphs_hit (the set of paragraphs entered), stub_log (the ordered sequence of consumed external operations), and terminal_state (observable variable values after the run). Crucially it runs after <em>every</em> mutation, not once at the end.
- <strong>Teacher-student separation.</strong> The student is the deterministic toolchain that does migration, search, mutation, and parity checking. The teacher is a supervisory AI agent (the Authoring Layer) invoked only where the student is blocked, and it selects or synthesizes a Mutation Skill rather than writing the migrated program. It ports the TestGen-LLM pattern — the LLM proposes, deterministic filters dispose — into migration validation.
- <strong>A Mutation Skill Catalog that makes successful edits reusable.</strong> A successful mutation is captured as an AI skill and stored for reuse in later iterations. Keeping edits as persistent skills rather than direct source modifications preserves a clean boundary between the original program logic and the coverage-enhancing changes.
- <strong>A reported unattended run on a 4,114-line production-shape program.</strong> Branch coverage 91.90% and 166/166 parity PASS, with no customer data — only harness-generated inputs and mocked external responses, and no human intervention. The program is internal and therefore not reproducible, but numbers at that scale from an autonomous run are rare in this literature.

## Background and Related Work

### The minimum you need to know

A COBOL program nests DIVISION → SECTION → <strong>paragraph</strong>. A paragraph is a labeled block of statements and behaves essentially like a function. Control flows through `PERFORM` (call), `GO TO` (jump), `EVALUATE` (switch), and the notorious `ALTER` (rewriting a `GO TO` target at runtime). The Migrator in this paper maps one SECTION to one Java class and one paragraph to one method.

Three coverage metrics appear and you have to keep them apart. <strong>Paragraph coverage (P)</strong> is the fraction of paragraphs in the AST entered at least once. <strong>Transition (edge) coverage (T)</strong> is the fraction of statically present paragraph-to-paragraph control-flow transitions traversed at least once. <strong>Branch coverage</strong> is the fraction of instrumented branch probes taken at least once. They get progressively stricter, and as we will see, they diverge substantially on the same program.

### Four lines of prior work

The paper positions itself at the intersection of four areas.

<strong>1. Test-suite amplification and harness testability.</strong> DSpot iteratively augments developer-written tests and feeds them back as merge-ready patches; EvoSuite and EvoSuiteAmp use existing tests as seeds for search-based improvement. Locksmith shares the iterative stance but changes the transformation target: instead of improving tests, it <strong>expands the harness interface itself</strong>, then re-runs Witness Search inside the enlarged input space. It sits adjacent to the testability-transformation line of work, except that it iterates on the controllability boundary rather than rewriting the program to be more testable.

<strong>2. Search-based input generation, fuzzing, and symbolic execution.</strong> Combinatorial interaction testing, adaptive random testing, MIO, the quality-diversity family around MAP-Elites, and its bandit-aware refinement Monte Carlo Elites supply the six Witness Search algorithms. Empirical studies of continuous fuzzing such as OSS-Fuzz show nontrivial progression dynamics — slow growth punctuated by rapid bursts. Locksmith follows that pattern initially, then identifies a plateau once multiple algorithms converge to within ±2–3 branches of the same count, and changes tack: rather than augmenting the budget, it <em>mutates the harness boundary</em> to continue the search from an updated angle. T-Fuzz is the closest analogue in spirit — it also mutates code to break past hard input checks — but T-Fuzz targets bug discovery, whereas Locksmith targets parity-gated migration validation.

<strong>3. Differential and metamorphic oracles.</strong> Mokav and DiffSpec take two implementations of the same spec and flag output discrepancies as bugs. Where exact outputs are unavailable, metamorphic testing checks relations across executions. The Parity Gate is a differential oracle in that lineage, but with a second job: it also acts as a <em>guardrail for the mutation itself</em>, keeping the harness edits parity-preserving while they expand the reachable input space.

<strong>4. Program repair and agentic LLM software engineering.</strong> RepairAgent orchestrates LLM tool use and validates fixes against program feedback. Meta's TestGen-LLM ships LLM-generated tests only when deterministic filters confirm they build, pass, and improve coverage. TestPilot re-prompts on failure; Mut4All synthesizes compiler-fuzzing mutators from bug reports. Locksmith applies that structure to harness mutation: the LLM proposes edits, and the deterministic analyzer, runner, and parity oracle decide which survive.

### Neighbours in mainframe modernization

XMainframe is a mainframe-domain LLM; COBOL-coder is domain-adapted for COBOL generation and translation. Other work covers low-resource COBOL translation leveraging high-resource Java refinement, and enterprise-scale COBOL-to-Java pipelines that augment LLMs with program analysis. The closest comparison is the automated validation work of Hans et al. and Kumar et al., which uses symbolic execution to generate COBOL unit tests, translates them into JUnit with mocking, and checks semantic equivalence. Same target, different placement: that line runs validation as a post-hoc check, while Locksmith installs the gate <em>inside</em> a search-and-mutation loop.

### Scope and assumptions

The paper draws its own boundaries clearly. The target is a 1:1 COBOL-to-Java migration, and the success criterion is <strong>increasing branch coverage with parity validation under the same inputs</strong>, not system overhaul. The harness makes opinionated infrastructure substitutions: legacy RDBMS instances become PostgreSQL, MQ becomes RabbitMQ. The strategy is two-fold — port with parity first, refactor once confidence is established on the new stack.

## Method

### The locksmith metaphor

The whole paper is explained through the metaphor. Each branch is a <em>door</em>, and the inputs and mocked state needed to cover it are the <em>keys</em>. Some doors open easily; others require a drill, meaning a parity-preserving mutation that exposes a blocked execution path. Running multiple search algorithms over the reachable branches tells you which doors are easy and which stay locked after repeated attempts. The remaining branches may be structurally unreachable from the current harness state. That is where the drill comes in — and once the new door is unlocked, you resume lock-picking (Witness Search) inside the newly reachable region. Apply recursively.

Five terms carry the rest:

- <strong>Locksmith Loop</strong>: the end-to-end methodology
- <strong>Witness Search</strong>: the phase that explores the program input space, including mocked backend responses and environmental state, with several algorithms
- <strong>Locked Paragraph</strong>: a COBOL paragraph that cannot be reached via Witness Search alone
- <strong>Mutation</strong>: the code-altering phase that applies parity-preserving mutations to both the COBOL and Java targets
- <strong>Parity Gate</strong>: the deterministic oracle that runs both targets on the same witness inputs and reports end-state discrepancies

### Migration and harness setup

{% include figure.liquid loading="eager"
   path="assets/img/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/fig1-harness-setup.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Migration and harness setup. Light blue marks student components, light yellow the Authoring Layer. One branch of the COBOL source goes through the Mock Generator to become a runnable COBOL mock; the other goes through the Migrator to become the Java target. The Runner / Parity Gate drives both with the same inputs and compares behavior."
   zoomable=true %}

The COBOL source flows two ways. One path runs through an internal deterministic <strong>Migrator</strong> to produce the Java target; the other runs through a deterministic <strong>COBOL Mock Generator</strong> to produce a runnable COBOL mock. A shared test harness exercises both, records a behavioral fingerprint, and enforces the Parity Gate.

The overall shape is teacher-student. The <em>student</em> is the deterministic set of tools that carries out migration, Witness Search, Mutation, and parity checking. The <em>teacher</em> is the Authoring Layer. Here is the part that matters: the Authoring Layer does not write the migrated program. It selects an existing skill or proposes a new one to open the blocked execution path, and the correctness of each proposal is determined by the Parity Gate. Compilation and behavioral-equivalence checks accept or reject each proposal. A parity failure triggers the Authoring Layer to intervene, and if its mutation passes the gate, the loop resumes. This separation of generation from deterministic judgment is what makes the loop robust.

### Pipeline overview

The pipeline starts with source-level transformations that produce a runnable <em>mock COBOL</em> program. External operations — file I/O, `CALL`, `EXEC SQL`, `EXEC CICS` — are mocked and backed by either COBOL index files or a relational database such as PostgreSQL. The compiled mock binary supplies the branch-coverage measurements used throughout the loop.

Next, an external parser produces the legacy program's AST, which feeds the deterministic Migrator. The Java code generator emits one class per section and one method per paragraph, and maps COBOL control flow (`PERFORM`, `GO TO`, `ALTER`, `EVALUATE`) to equivalent Java control flow.

A test case is a pair of <strong>input-state</strong> and <strong>stub-state</strong>. The input-state specifies the variable assignments applied during execution; the stub-state supplies the records returned by mocked external operations. After execution the system records a <strong>behavioral fingerprint</strong>: the paragraphs entered, the branches taken, the stub-response log, and the terminal observable state. That fingerprint is the unit of both coverage tracking and parity comparison.

### The four components

- <strong>Deterministic Migrator</strong>: translates the COBOL source into the Java target.
- <strong>Deterministic Analyzer</strong>: examines the AST and the live mock, and identifies gates from program structure.
- <strong>Deterministic Runner</strong>: compiles the binary, executes test cases, measures branch coverage, and applies the Parity Gate along the three equivalence axes. A code mutation is retained <em>only</em> when it increases branch coverage.
- <strong>Agentic Authoring</strong>: invoked when the deterministic analyzer hits a blocked execution path; synthesizes a new skill. When the Parity Gate reports a divergence, it may also patch the Migrator's Java code generator.

### Witness Search: six algorithms

A Witness Search sweep runs six independent algorithms against the current-iteration COBOL mock binary, each starting from the same baseline coverage. A scenario consists of input records, initial working-storage values, and mocked external `CALL` file-status values and return codes. The harness catalog tracks the allowable choices per scenario, and the six algorithms differ only in <em>how</em> they explore that combinatorial space.

- <strong>Pairwise interaction testing.</strong> Given $n$ scenario components with $\|D\_i\|$ value choices per field, generate a small test set covering every possible pair $(v\_i \in D\_i,\ v\_j \in D\_j)$ for $i < j$, with optimal size $O(\|D\|^2 \log n)$. Many COBOL branches are gated by compound `IF`s or `EVALUATE WHEN` clauses on two correlated fields (status code × record type, account kind × balance sign), so a pairwise-covering set surfaces each two-field combination at least once.
- <strong>Three-way interaction.</strong> Extends pairwise to triples, uncovering the smaller class of branches that need three coordinated values — for example, tail-handling paragraphs gated on status × record type × end-of-file flag.
- <strong>Latin hypercube sampling (LHS).</strong> Suited to quasi-continuous components such as record counts, file lengths, and monetary amounts. Each domain is partitioned into $N$ bins with one value sampled per bin, bins aligned across components to maximise distance-based diversity. LHS spreads samples across the full range rather than clustering them in one region.
- <strong>Adaptive random testing (ART).</strong> Pick the next input that maximises the minimum distance to previously executed inputs, biased toward unexplored regions. Particularly useful when an unfamiliar program offers no obvious structure to exploit.
- <strong>MAP-Elites.</strong> A quality-diversity algorithm maintaining a grid of behavioral-descriptor cells, each holding the highest-fitness input seen to map to that cell, where fitness is the number of newly covered branches. COBOL coverage profiles tend to cluster into a small number of execution <em>shapes</em> — clean end-of-file path, mid-stream truncation, status-error early exit, multi-record-type batch — and MAP-Elites retains one good test case per shape, which helps expose rare branches.
- <strong>UCB1 bandit.</strong> Each value choice is treated as a bandit arm. At each step, select the arm maximising

$$
\begin{aligned}
a^{\star} = \arg\max_{a} \left( \bar{x}_a + c\sqrt{\frac{\ln t}{n_a}} \right)
\end{aligned}
$$

where $\bar{x}\_a$ is the empirical mean reward defined by fresh branches, $n\_a$ is the number of times arm $a$ has been selected, and $c$ is an exploration constant. Unlike the interaction-based methods above, UCB1 has no combinatorial fan-out. It instead learns <em>during</em> a run which values tend to expose new branches, which in COBOL mocks favors informative scenario components such as status codes and record types.

The output of one sweep is the union of branches discovered by the six algorithms, plus the test-case set. The next sweep starts from the best set, and <strong>when two consecutive sweeps yield no new branches</strong>, the loop declares the Witness Search plateau. Once a mutation expands the harness, all six algorithms run again — the newly reachable regions may favor different search biases. The authors are explicit that these six were selected through empirical experimentation, are not guaranteed optimal for all migrations, and should be treated as a representative set rather than a fixed prescription.

### Mutation: parity-preserving harness mutation via skills

Classical mutation testing injects faults to check that error handling works. Locksmith's mutation has the opposite purpose: it discovers and force-opens new execution paths to <strong>ensure parity</strong> between the COBOL and Java functionality, so both codebases are modified in tandem with the goal of matching their code traces as well as their outputs.

The deterministic analyzer identifies candidate gates, and the Authoring Layer generates <strong>Mutation Skills</strong> that satisfy them. A skill may add a new dispatcher route, expose an external value through a side channel (a harness-level stub hook supplying values the program would normally read from external sources), or force execution of a paragraph that is otherwise difficult to reach. Skills are persisted between rounds rather than applied as direct code modifications, to maintain a clear separation between the original program logic and the coverage-enhancing changes.

After the Mutation phase, previously accepted test cases are re-executed and the mutations are kept for further iterations. Because a single paragraph may be blocked by multiple independent conditions, the framework evaluates each identified gate in turn and retains only those mutations that produce additional coverage.

Skills can have hierarchical dependencies and are applied in the required order. In practice, two types proved sufficient for most scenarios:

- <strong>Dispatcher-arm skill</strong>: extends the harness so values normally read from external sources can be supplied directly through the side channel. Particularly effective for status-field-driven logic where execution depends on values that are otherwise difficult to control.
- <strong>Call-injection skill</strong>: forces execution of a target paragraph from a known point in the main program flow. This exercises logic normally reached during cleanup processing, end-of-file handling, or other uncommon execution paths.

Regardless of type, the same change is applied to both the COBOL and Java implementations, and parity is verified by comparing the execution path taken, the external operations performed, and the final observable state.

The paper names the representative mutation used in the experiments a <strong>force-set mutation</strong>: a parity-preserving mutation that, at entry to a chosen paragraph, overrides the value that would have been mock-returned from an external operation (file read, database fetch, message-queue receive, subprogram call) with a chosen value, applied symmetrically to the COBOL mock and its generated Java target.

### How the Analyzer picks gates

The Analyzer is a static AST reader. For each target paragraph it examines the control-flow conditions preventing execution and identifies the gates that need to be satisfied. When a gate depends on a specific external value, it determines the required value and provides it to the side channel so it can be pinned during execution.

There is a real design judgment embedded here. The Analyzer <strong>always prefers solutions that work through existing program flow</strong> — dispatcher-based mutations — because they allow the paragraph to be reached naturally. Only when no suitable dispatcher-based approach is available does it recommend a call-injection skill. This priority ensures every paragraph in the AST has at least one candidate mutation that can be evaluated. The Analyzer is intentionally conservative: it only recommends mutations that can be clearly explained in terms of a controllable variable and a known set of values, which keeps every recommendation understandable, auditable, and easy to validate before it is applied.

Sibling gates within one Locked Paragraph get explicit treatment too. A target paragraph is not always blocked by a single condition — often several control-flow decisions must be satisfied, such as a nested `IF`, an enclosing `PERFORM` boundary, or a specific `EVALUATE` branch. The Analyzer identifies all of them and generates a candidate mutation for each. Rather than stopping after the first success, the framework evaluates every identified gate, since each one can potentially unlock additional paths. When a mutation yields new coverage it becomes part of the active baseline and subsequent mutations continue from that expanded state; if it adds nothing, it is reverted. A paragraph counts as successfully opened if at least one mutation improves coverage.

### The recursion and its termination

{% include figure.liquid loading="eager"
   path="assets/img/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/fig2-locksmith-loop.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: The Locksmith Loop. When two consecutive Witness Search rounds add no branches, the loop treats it as a plateau, ranks remaining Locked Paragraphs by uncovered-branch count, and opens one with a code mutation. Post-Mutation Witness Search (UCB1) confirms the coverage gain and the Parity Gate decides whether COBOL and Java agree. A successful mutation returns control to a full sweep from the newly opened region; a mutation with no gain is reverted and its paragraph marked failed."
   zoomable=true %}

The loop alternates (1) a Witness Search sweep and (2) a Mutation step. A mutation is kept only if <strong>it adds coverage and it passes the Parity Gate</strong>. If both hold, the harness mutation stays and the loop proceeds to another sweep, which may expose additional Locked Paragraphs — those get ranked and mutated the same way. If either condition fails, the mutation is reverted and the attempt is recorded.

Termination is guaranteed by a simple rule: <strong>Locksmith never re-attempts a Locked Paragraph that has already been attempted.</strong> Every recursive step therefore either gains a parity-preserving mutation that uncovers new branches, or permanently removes one Locked Paragraph from consideration. When all of them have been attempted, a final Witness Search sweep recovers any remaining branches.

The default ranking policy for Locked Paragraphs is <strong>bang × feasibility</strong>: a paragraph is scored as the sum of its uncovered branch count with the proportion of its condition variables already routable through the harness, so paragraphs that are both valuable and actionable are favored. In the actual experiments, however, the authors used the <strong>greedy</strong> policy, ranking only by uncovered branch count. Skill selection (SKILLFOR) is treated as a catalog lookup, but the catalog may be incomplete; when no skill matches, the Authoring Layer either develops a new one from its gate analysis or emits a structured `needs_new_skill` record containing the target paragraph, uncovered branches, branch conditions, and active call stack.

## Acceptance Criteria and the Parity Gate

In place of a training loss, this paper's objective is a pair of <strong>acceptance conditions</strong>. A mutation $m$ is kept when

$$
\begin{aligned}
\text{keep}(m) \iff \; & \text{coverage}(\text{after } m) > \text{coverage}(\text{before } m) \\
& \wedge \; \text{ParityGate}(\text{COBOL}_m, \text{Java}_m) = \text{PASS}
\end{aligned}
$$

and reverted otherwise. Coverage alone would let you hack the harness apart to inflate a number; parity alone would let a no-op mutation pass every time. The two conditions constrain each other.

### The three equivalence axes

Every test case the COBOL side accepts (input-state + stub-outcomes) is driven through the generated Java target, and the resulting behavioral fingerprints are compared. The gate judges along three axes, declared per-skill in the parity contract.

| Axis | Comparison | Catches |
|------|------|------|
| `paragraphs_hit` | <strong>set</strong> comparison of paragraphs entered | missing paragraph traversal, early termination |
| `stub_log` | <strong>ordered</strong> comparison of consumed external operations (whitespace-normalised value matching) | wrong dispatch order, missing or duplicated external calls |
| `terminal_state` | <strong>pointwise</strong> comparison of observable variable values (ignoring runtime-private bookkeeping) | mis-set variables, value-normalization errors |

The gate is a differential oracle that accepts a <strong>compatibility relation</strong> in lieu of a ground-truth specification. And because every mutation is realized on both sides, parity is checked <em>continuously, after every break</em>, not as a terminal round.

Divergences are emitted as structured records on the parity intervention channel, carrying the divergence kind, a human-readable description, and machine-readable diff records; these form the input contract for the optional repair step. By default the loop records a divergence and proceeds rather than blocking, unless configured otherwise. In the reported experiments the gate held on every accepted test case across all mutation tiers.

Authoring Layer intervention points work the same way. When the analyzer or runner reaches a decision point it cannot resolve, it writes a structured record at a defined intervention point and continues, and that record can be consumed asynchronously by a human operator or an AI agent. The loop does not stall waiting for a human.

## Programs and Experimental Setup

Three COBOL codebases were used.

| Program | Source lines | Paragraphs | Static edges | Branch probes | Source |
|------|------|------|------|------|------|
| CBACT01C | 430 | 16 | 28 | 62 | AWS CardDemo (open-source) |
| CBSTM03A | 924 | 25 | 38 | 146 | AWS CardDemo (open-source) |
| Production-like batch | 4,114 | 142 | 146 | 432 (statically counted) | internal |

The production-grade program was evaluated <strong>without customer data</strong>, using only harness-generated test inputs and mocked external responses.

The progression charts (Figures 3 and 5) share metric definitions. P is paragraphs hit over total paragraphs in the AST; T is observed over total static paragraph edges. Each edge is classified by color: `EXIT`/`GOBACK` edges follow the DAG color of their destination node (range-completion rule — an EXIT terminator counts as covered once its source paragraph runs), and non-EXIT edges follow the phase that first observed the transition (blue for Witness Search, red for Mutation, red taking precedence on overlap). The `parity X/N PASS` annotation reports how many accepted test cases the generated Java reproduces exactly in paragraphs hit, external effects, and outputs — that is, the fraction of test cases surviving the Parity Gate.

## Results

### The small open-source program — CBACT01C

On CBACT01C (430 lines, 62 branch probes), the loop reached <strong>100% paragraph coverage (16/16)</strong>, <strong>100% transition coverage (28/28)</strong>, and <strong>96.8% branch coverage (60/62)</strong>, confirming that near-complete saturation is attainable on programs of moderate complexity.

### The medium open-source program — CBSTM03A

{% include figure.liquid loading="eager"
   path="assets/img/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/fig3-coverage-cbstm03a.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Coverage progression on CBSTM03A. Of 38 static edges, Witness Search covers 18 (blue) and Mutation adds 19 (red), reaching 37/38 (97.4%) with 1 uncovered. Paragraph coverage is 24/25 (96.0%) and parity is 38/38 PASS."
   zoomable=true %}

On the 924-line CBSTM03A the loop reached 24/25 paragraphs (96.0%) and 37/38 transitions (97.4%). What deserves attention is the <strong>attribution</strong>: of the 37 covered transitions, Witness Search opened only 18 — Mutation opened the other 19. Similarly, 8 of the 24 covered paragraphs came from Mutation. Input-space search alone stalls at roughly half.

Branch coverage tells a different story. Of the 146 branch probes, 38 remained uncovered, giving <strong>74.0%</strong>. The authors are explicit that Figures 3 and 4 report paragraph and transition coverage, not branch coverage. They add that with more patience and significant human intervention they could have done better, and that even at the current level they are exceeding any alternative method's output they are aware of. They see no structural reason preventing 100% aside from the complexity of the mocking. They are also specific about the failure mode: the Authoring Layer failed to apply learnings from one skill to open the gates for a related scenario, and a human had to identify the issue. Their expectation is that autonomous coverage will improve incrementally as stronger models are released.

All 38 accepted test cases passed the Parity Gate across the three axes.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/fig4-cfg-test-program.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Control-flow graph of CBSTM03A. Nodes are paragraphs and edges are static paragraph-to-paragraph transitions. Node color marks the phase that first reached the paragraph; isolated blue/gray nodes are expected because sequential COBOL fall-through is not modeled as an explicit edge. Blue edges were observed by Witness Search, red ones after a mutation (red takes precedence on overlap), gray were not reached by this run."
   zoomable=true %}

Figure 4 makes the structure visible. As the authors describe it, blue is the first stage opened by Witness Search (input-space exploration), red is the result of Mutation, and gray is the uncovered portion. The fan of red edges converging on a single node near the bottom stands out: transitions observed only after a mutation are concentrated on one particular paragraph.

### The production-shape run

{% include figure.liquid loading="eager"
   path="assets/img/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/fig5-coverage-production.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: Coverage progression on the production-shape run. Of 146 static paragraph connections, the baseline Witness Search phase covers 54 (blue) and Mutation adds 47 (red), reaching T=101/146 (69.2%). Paragraph coverage is P=135/142 (95.1%) across 166 test cases."
   zoomable=true %}

The second experiment used a significantly larger production-grade program: 4,114 source lines, 142 paragraphs, 432 statically counted branches. Final numbers were <strong>135/142 paragraphs (95.1%)</strong>, <strong>101/146 transitions (69.2%)</strong>, and <strong>91.90% branch coverage (397/432)</strong>.

The progression is especially clean. Witness Search reached P=110/142 and T=54/146; the Mutation phase added ΔP=+25 and ΔT=+47 before plateauing at P=135/142, T=101/146. By execution count, Witness Search contributed 61 raw executions and Mutation 105, for 166 combined — two thirds of the run happened in the Mutation phase, buying 47 additional transitions. <strong>Starting from an already-plateaued baseline, Mutation came within striking distance of Witness Search's 54</strong>, which is the most direct number in the paper supporting its central claim.

A parity check ran after every test case, and when discrepancies were detected a new set of fixes was proposed by the Authoring Layer and applied to the Migrator and/or the COBOL Mock Generator. The discrepancy types the authors enumerate: end-of-stream and termination semantics, control-flow fidelity, program-state and data-layout fidelity, data typing and value normalization, database and mock-backend behavioral equivalence, file I/O side-effect and ordering equivalence, fixture and environment consistency, and measurement and normalization artifact control. In the end the generated Java reproduced the COBOL behavior on every parity axis — <strong>166/166 PASS, 0 FAIL, 0 ERROR</strong> — and the loop progressed <em>without any human intervention</em>.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/fig6-cfg-production.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: Control-flow graph of the production program, with the same color conventions as Figure 4. COBOL fall-through semantics are omitted to reduce clutter, so not all execution paths appear in the DAG."
   zoomable=true %}

## Analysis and Ablation

### Six algorithms hit the same wall

The most interesting observation is that all six Witness Search algorithms <strong>end at roughly the same coverage, within ±2–3 branches</strong>. Having also experimented with additional algorithms that were discarded for poor performance, the authors generalize that this boundary is <strong>structural rather than algorithmic</strong>: the remaining branches lie outside the input space the harness can express, and no search strategy will reach them.

That observation is the hinge of the paper's logic. The prescription (mutate the harness) is only justified by the diagnosis (more search budget will not help). Worth noting, though, that the same observation supports a second reading: if six algorithms produce the same answer, there is little reason to run all six. Post-Mutation Witness Search in fact uses UCB1 alone. The authors do not discuss this explicitly, but that design choice tacitly concedes the ensemble is redundant.

### How much did Mutation contribute?

In both runs Mutation's contribution matches or exceeds Witness Search's.

| Run | Witness Search | Mutation | Uncovered |
|------|------|------|------|
| CBSTM03A (transitions) | 18/38 | +19/38 | 1/38 |
| CBSTM03A (paragraphs) | 16/25 | +8/25 | 1/25 |
| Production (transitions) | 54/146 | +47/146 | 45/146 |
| Production (paragraphs) | 110/142 | +25/142 | 7/142 |

On CBSTM03A, the 19 transitions opened by Mutation outnumber the 18 opened by Witness Search; on the production run it is 47 against 54. As the authors put it honestly in the threats section, this is <em>case evidence</em> that the Mutation phase reaches paragraphs and transitions input-space search alone cannot — not a general claim about all COBOL systems.

### Depth-2 recursion actually fires

The paper reports one concrete demonstration of the recursion. After opening the depth-1 gates and proceeding with Witness Search, the agent opened the gates on a second layer, which triggered the six algorithms to find a new set of witnesses penetrating that layer too. Their phrasing captures the point well: Mutation's value lies as much in the region it exposes as in the branches it directly unlocks.

Defects detected during each pass are fixed <em>in the Migrator rather than in the produced code</em>, through Authoring Layer-proposed migrator fixes. That distinction matters in practice. Patching the output disappears on the next regeneration; patching the generator propagates to every program sharing the pattern.

### The shape of the remaining gaps

The production run plateaued short of 100% mainly due to structural and external-coupling complexities that the authors expect to require manual intervention. Inspecting the still-uncovered paragraphs revealed a consistent pattern: the remaining paths sit behind <strong>multi-step paragraph chains where control variables are set incrementally across earlier sections</strong>. To enter them, the tests must make the fake files and database return an exact coordinated sequence of results and flip internal switches early. It is not a single gate to unlock but a whole state sequence across time.

In the conclusion the authors argue the remaining gaps reflect <strong>the current limits of the Authoring Layer rather than a structural limitation</strong> of the method. They arose from occasional mutation-authoring errors and failures to transfer learned strategies to related scenarios, and were resolved with human intervention. Their defense is that the deterministic core was designed to operate effectively even when the agentic layer needs human help.

## Limitations and Critical Assessment

### What the authors acknowledge

- <strong>Small case-study scope.</strong> Two open-source programs and one production-shaped run. Replicating across additional program families — IMS, database-heavy SQL, CICS — would be needed to strengthen the claim.
- <strong>Branch coverage is an imperfect proxy.</strong> A high-coverage suite need not detect all classes of fault, and a small set of well-chosen mutation-tested cases can find faults a higher-coverage suite misses — a tension long documented in the fuzzing-and-coverage literature. They mitigate it by anchoring acceptance on cross-language parity rather than coverage alone, but do not claim the resulting suite suffices on its own for migration sign-off. Their own phrasing — "a quantitatively comparable yardstick against the bare-baseline starting point, no more" — is exactly right.
- <strong>Parity preserves bugs.</strong> Anchoring on the legacy COBOL as the operational reference means the loop validates whether the migrated Java reproduces the legacy behavior <em>including its bugs</em>. In a 1:1 migration this is the desired property, but as they put it, the operational reference is the truth of <em>compatibility</em>, not the truth of <em>semantics</em>. If the eventual goal is correctness verification, the Parity Gate alone is insufficient and an external specification oracle must be introduced.
- <strong>Overfitting to harness structure.</strong> Locksmith can only learn from the source programs it has seen, so structures absent from the initial sample may not be captured.
- <strong>The Parity Gate is only as strong as its axes.</strong> The three axes catch missing paragraph traversal, early termination, mis-set variables, and wrong dispatch order. They are silent on intermediate state between observable checkpoints, floating-point rounding modes that differ between COBOL and Java runtimes, and exception types raised by JVM-only error paths. A generated Java target could in principle pass while drifting on an axis they do not check.

### What else a reviewer would flag

<strong>No baseline comparison.</strong> The paper names the symbolic-execution-based COBOL-to-Java validation of Hans et al. and Kumar et al. as the closest prior work, then never runs head-to-head against it on the same programs. "We are exceeding any alternative method's output that we are aware of" is an assertion, not a measurement. CBACT01C and CBSTM03A are public, so a comparison against EvoSuite-style tooling or existing COBOL test generators was not out of reach, and its absence is conspicuous.

<strong>Coverage is measured on a mutated program.</strong> This is the methodological tension at the core. The 91.90% figure is branch coverage of a <em>harness-mutated</em> binary, not the original. When a call-injection skill forces a paragraph to execute from a known point in the main flow, that proves the paragraph behaves identically in both languages — but it does <strong>not</strong> prove the paragraph is reachable under any real input, nor that the real control flow reaching it is identical. The Analyzer's preference for dispatcher-based mutations is clearly meant to mitigate this, yet the split between dispatcher-based and call-injection-based coverage is never reported. That ratio is precisely the number that determines how to read the headline result.

<strong>The abstract's coverage phrasing is generous.</strong> "Reaching nearly complete coverage on the two open-source programs" is true for paragraph and transition coverage (16/16, 28/28 and 24/25, 37/38), but CBSTM03A's branch coverage is 74.0%. Because the same sentence reports "91.90% branch coverage" for the production program, a reader can easily carry the branch reading backward onto "nearly complete." The body distinguishes the metrics carefully; the abstract does not.

<strong>Stochastic methods, single runs.</strong> ART, MAP-Elites, and UCB1 all use randomness. Each program was run once, with no seeds and no variance reported. Even the "six algorithms converge within ±2–3 branches" observation cannot be assessed for robustness without repetition.

<strong>No cost reporting.</strong> "The loop continued unattended for hours" is the whole account. No token cost, no wall-clock, no LLM call count, no model identity. The authors themselves list token-cost measurement as future work, so this reads more as not-yet-done than as omission — but it is the first number a practitioner evaluating adoption would want.

<strong>No policy or component ablation.</strong> The default Locked-Paragraph ranking policy (bang × feasibility) is described but the experiments used greedy, with no comparison between them. There is no breakdown of how much each of the two skill types contributed, and no study of dropping algorithms from the six-way ensemble. Which parts of the method actually carry the value remains undecomposed.

<strong>`paragraphs_hit` is a set comparison.</strong> Entry <em>order</em> is not checked on that axis; ordering is only captured indirectly through `stub_log`. A Java target that reorders paragraphs which consume no external operations could in principle pass the gate. This belongs on the list of unchecked axes the authors give under (e).

## Takeaways

- <strong>When search stalls, suspect the boundary, not the budget.</strong> If six different search algorithms stop at the same place, that is not an algorithm problem — it is a signal that the input space the harness can express does not contain the answer. This diagnosis-prescription pair transfers to any test automation setting, COBOL or not.
- <strong>Using an LLM as generator and a deterministic oracle as judge keeps winning.</strong> TestGen-LLM did it, and this paper does it again. The extra step here is placing the oracle <em>inside</em> the loop rather than at the end of the pipeline, running it after every mutation so bad edits never get time to accumulate.
- <strong>The goal of legacy migration validation is compatibility, not correctness.</strong> Making that distinction explicit and designing the oracle around it is the paper's most practical contribution. For the people who will maintain the Java after cutover, any drift from legacy behavior is a regression to investigate, not an improvement. The choice is also hard to reverse: moving to correctness verification requires a different oracle entirely.
- <strong>Fix defects in the generator, not the generated code.</strong> Routing parity failures into the Migrator instead of patching the Java output looks like a detail, but it compounds at scale. Where the same COBOL idiom recurs across hundreds of programs, one generator fix propagates to all of them.
- <strong>When you read a coverage number, ask which program it is about.</strong> Coverage obtained by mutating the harness is not coverage of the original program. This method defends the gap with parity, but anyone adopting it should track the share of forced-open paths as a separate figure.

## References

- Paper: [arXiv:2607.28271 — Agentic Method for Deterministic Validation of Legacy Code Migration](https://arxiv.org/abs/2607.28271)
- Open-source COBOL used in the experiments: [aws-samples/aws-mainframe-modernization-carddemo](https://github.com/aws-samples/aws-mainframe-modernization-carddemo)

## Further Reading

- **[XMainframe: A Large Language Model for Mainframe Modernization](https://arxiv.org/abs/2408.04660)** (Dau et al., 2024) — A pretrained LLM specialised for the mainframe domain, representative of the "read and translate COBOL" capability this paper takes as given.
- **[COBOL-Coder: Domain-Adapted Large Language Models for COBOL Code Generation and Translation](https://arxiv.org/abs/2604.03986)** (Dau et al., 2026) — Domain-adapted models and benchmarks for COBOL generation and translation; the kind of component that could sit in Locksmith's Migrator slot.
- **[Illuminating search spaces by mapping elites](https://arxiv.org/abs/1504.04909)** (Mouret et al., 2015) — The original MAP-Elites paper behind one of the six Witness Search algorithms; fills a grid of behavioral diversity rather than chasing a single optimum.
- **[DiffSpec: Differential Testing with LLMs using Natural Language Specifications and Code Artifacts](https://arxiv.org/abs/2410.04249)** (Rao et al., 2024) — The LLM-assisted differential-testing lineage the Parity Gate belongs to, flagging output discrepancies between two implementations of one spec.
- **[Mut4All: Fuzzing Compilers via LLM-Synthesized Mutators Learned from Bug Reports](https://arxiv.org/abs/2507.19275)** (Wang et al., 2025) — LLMs synthesizing the mutators themselves; explicitly named in this paper's future work as an integration target.

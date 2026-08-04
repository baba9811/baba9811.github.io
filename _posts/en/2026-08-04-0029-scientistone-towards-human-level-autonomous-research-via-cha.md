---
layout: post
title: "[Paper Review] ScientistOne: Towards Human-Level Autonomous Research via Chain-of-Evidence"
date: 2026-08-04 14:00:00 +0900
description: "Papers from autonomous research agents read well but their evidence chains are broken. An audit of 75 papers exposes a systematic failure in every baseline, and a system that keeps every claim tied to its evidence while writing."
tags: [autonomous-research, llm-agents, verifiability, hallucination, evaluation, ai-scientist]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig1-pipeline.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/
ko_url: /papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Rui Meng et al. (13 co-authors, Google Cloud AI Research) |
| Venue | arXiv · 2026 |
| arXiv 또는 DOI | [2605.26340](https://arxiv.org/abs/2605.26340) |
| Code | [scientist-one/generated-artifacts](https://github.com/scientist-one/generated-artifacts) — generated papers and solver code, not the system source |
| Data | ADRS (5 systems-optimization tasks) · MLE-Bench (5 Kaggle tasks) · Parameter Golf — 5 systems × 3 seeds × 5 tasks = 75 papers audited |
| <span style="white-space: nowrap">Review date</span> | 2026-08-04 |

#### TL;DR

- Autonomous research agents already produce solutions competitive with human experts and manuscripts that look like conference submissions. What nobody checks is whether **the evidence chain behind those manuscripts is intact.** Fabricated citations, scores that don't reproduce, and method sections describing code that doesn't exist all sail through evaluations that only assess surface quality.
- The authors propose Chain-of-Evidence (CoE), a verifiability standard — every claim must be traceable, through a recorded evidence chain, to a grounding source — plus ScientistOne, an end-to-end system designed to satisfy it by construction, and CoE Integrity Audit, a post-hoc audit of four checks that applies identically to any system.
- Auditing 75 papers (5 systems × 5 tasks × 3 seeds), **every baseline exhibits at least one systematic failure mode.** Hallucinated reference rates reach 20.9% (DeepScientist, 42/201), score verification drops to 42% (ARC and Sakana, 5/12), and method–code alignment scatters between 20% and 80%.
- ScientistOne leads on all four checks: score verification 12/12, hallucinated references 0/337, method–code alignment 14/15, specification violations 0/15. Its automated-review accept rate of 6/15 (40%) triples the best baseline (AI-Researcher, 13%), and it exceeds the human expert baseline on all five ADRS tasks.
- Read the appendix, though, and the headline wobbles. ScientistOne's "zero specification violations" is a 5-judge majority-vote result, and a footnote concedes that <em>ScientistOne seed 2's LLM-SQL code contains the same benchmark exploit</em> — flagged by only 1 of 5 judges. In a paper whose whole thesis is that headline numbers must trace to evidence, that is an uncomfortable place for a headline number to sit.

#### Introduction

Over the past two years, "AI does research" has quietly changed meaning. First it meant brainstorming help, then coding help. Now several pipelines run the whole loop end to end — literature review, hypothesis generation, experimental design and execution, manuscript writing (Lu et al., 2024; Schmidgall et al., 2025; Yamada et al., 2025; Tang et al., 2025; Weng et al., 2025). On systems-optimization tasks these agents produce solutions competitive with human experts (Cheng et al., 2025b; Novikov et al., 2025), and one pipeline has generated papers accepted at peer-reviewed workshops (Yamada et al., 2025). Put the code, the results, and a conference-formatted manuscript side by side, and telling machine-authored research from human-authored research on surface quality alone is getting genuinely hard.

What this paper points at is the structural tension underneath that surface. An autonomous research system is a multi-stage pipeline where each stage consumes the previous one's output. The literature summary shapes the hypothesis, the hypothesis determines the experiment, the experimental results feed the manuscript. In that architecture an error introduced at any stage isn't merely preserved — it is **amplified.** A flawed summary biases the experimental design; a misinterpreted result carries through the whole paper. And because the same error is reflected consistently across every section, the result actually looks <em>internally coherent.</em> The risk grows with trajectory length: agents struggle to track an ever-expanding context (Liu et al., 2024; 2023b), hallucinate, and drift from the original objective. Layered on top are the well-documented limits of how language models handle evidence — generated text is hard to verify against sources (Liu et al., 2023a), factual claims drift from their grounding (Min et al., 2023), and scientific citations are frequently inaccurate or fabricated (Press et al., 2024).

The real problem is that existing evaluation protocols **do not measure any of this.** Automated review scores and benchmark leaderboards assess surface presentation — how the paper reads — and procedural completion. Whether individual claims trace to supporting evidence is nobody's job. The authors' diagnosis is crisp: two gaps share one root cause. <em>No existing evaluation protocol audits whether claims are supported, and no existing autonomous research system is designed to trace claims back to evidence.</em> The paper attacks that root cause on three fronts at once — a standard, a system, and an audit.

#### Key Contributions

1. **The CoE standard.** Claims are typed into citation, numerical, methodological, and conclusion categories, each with a required evidence-chain shape. Just as ACID (Härder and Reuter, 1983) defines what "reliable" means for a database transaction, CoE defines what "verifiable" means for a research claim. Crucially, CoE is **architecture-agnostic**: it says nothing about how to build the system, only what properties its artifacts must have.
2. **ScientistOne.** A pipeline of Problem Investigator → Discovery Engine → Paper Writer with Claim Verifier, designed to satisfy CoE <em>by construction</em> rather than reconstruct grounding after the fact. The PI reads up to 100 full-text PDFs per topic; the Claim Verifier checks every claim in the draft against its declared evidence source before a final paper exists.
3. **CoE Integrity Audit.** A post-hoc audit that operates on submitted artifacts alone and therefore applies to any system, regardless of architecture. Four checks — score verification, specification violation, reference verification, method–code alignment — target the most damaging evidence-chain breaks.
4. **A 75-paper empirical study.** Five systems were adapted to the ADRS benchmark under matched conditions, run at three seeds per task, and every resulting paper audited. From a reviewer's seat, the most valuable part of this paper is not ScientistOne but **the specificity of that audit** — which agent breaks its evidence chain, and exactly how, documented down to the individual case.

#### Related Work / Background

**Autonomous research agents.** This line has expanded fast, from constrained ML templates to multi-stage pipelines coordinating literature grounding, hypothesis generation, experimentation, and paper writing. The AI Scientist (Lu et al., 2024) opened end-to-end automation but operates on fixed ML templates with frequent hallucinations in the writing stage. AI Scientist-v2 (Yamada et al., 2025) added best-first tree search (BFTS) over experimental branches plus review-aware reporting, reaching workshop-level quality. Then the branches diverge: PiFlow (Pu et al., 2025) steers hypothesis exploration via information-theoretic principle selection; CodeScientist (Jansen et al., 2025) grounds ideation jointly in literature and code. Curie (Kon et al., 2025a) validates experimental execution through reproducibility checks analogous to this paper's I1 Score Verification — though it does not audit whether the <em>written claims</em> faithfully reflect those validated results. AlphaEvolve (Novikov et al., 2025) applies evolutionary search to algorithmic optimization, and EvoScientist (Lyu et al., 2026) uses multi-agent self-evolution for end-to-end discovery.

Beneath that diversity the authors identify one common pattern: **generation and execution capabilities have scaled faster than validation and provenance mechanisms.** So a manuscript can look professional and read well while still containing broken evidence chains. ScientistOne isn't trying to push the autonomy frontier — it's trying to make what comes out the other end verifiable.

**LLM-driven optimization and benchmarks.** The primary evaluation testbed, the ADRS benchmark (Cheng et al., 2025b), collects real frontier computer-systems research questions. EvoX (Liu et al., 2026b) and AdaEvolve (Cemri et al., 2026) achieve strong ADRS results by focusing on algorithm discovery and implementation without literature grounding or paper writing. Benchmarks for research-adjacent capabilities have proliferated too — Auto-Bench (Chen et al., 2025), ResearchBench (Liu et al., 2025), ResearcherBench (Xu et al., 2025) — along with MLAgentBench (Huang et al., 2023), EXP-Bench (Kon et al., 2025b), and PaperBench (Starace et al., 2025), which stress-test experimentation and execution reliability. But most of them measure <em>discovery performance</em>: can a system produce a competitive solution? Not: are the resulting claims actually supported?

**Scientific integrity and provenance.** Current systems produce written output with varying traceability — direct manuscript drafting where an LLM generates prose from agent outputs (Jansen et al., 2025; Lu et al., 2024; Tang et al., 2025), and review-aware revision where reviewer feedback refines the manuscript (Yamada et al., 2025). Both produce fluent papers, and **neither has a mechanism ensuring that reported numbers trace to specific execution artifacts.** Prior work on citation verifiability (Liu et al., 2023a), factual accuracy (Min et al., 2023), and citation attribution (Press et al., 2024) performs post-hoc detection at the text level. CoE differs in two ways: it defines verifiability at the level of <em>individual claims</em>, and it covers paper, code, and evaluator logs jointly rather than text alone.

#### Method / Architecture

### Chain-of-Evidence: what it demands

The principle is one sentence: **every claim produced by a research system must be traceable, through a recorded chain of supporting claims and evidence, to a grounding source.**

The ACID analogy tells you what kind of standard this is. A database violating ACID can return plausible-looking query results while silently corrupting data — a transfer debits one account but never credits another, yet both balances look valid. A research system violating CoE behaves the same way: the paper reads well, but the scores don't reproduce. And just as ACID prescribes what properties a database must have rather than how to build one, CoE plays that role for research artifacts.

The four claim types and their required evidence chains:

| Claim type | Example | Required evidence chain |
|------|------|------|
| Citation | "Smith et al. showed X" | The cited work exists in a scholarly database, and its content is consistent with how the paper describes it |
| Numerical | "achieves 87.3% on Prism" | The reported value traces to a recorded output — an execution log, experimental measurement, or simulation result |
| Methodological | "we use a 3-layer MLP" | The method description resolves to the corresponding implementation |
| Conclusion | "outperforms baseline by 5%" | Derives from supporting claims (numerical, methodological, or both) through verifiable reasoning |

The taxonomy is deliberately incomplete. It covers claim types that are tractably verifiable with current tools and excludes those requiring domain expertise or subjective judgment — qualitative observations, theoretical properties. The standard is also author-agnostic: the same evidence chains are required whether a paper is human- or machine-authored. The focus lands on autonomous systems because their failure modes are systematic and growing fast in scale.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig1-pipeline.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: The ScientistOne pipeline. Stage 1 grounds the literature via retrieved PDFs; Stage 2 explores and evaluates solutions across parallel branches; Stage 3 writes and verifies the paper, with a Claim Verifier that checks every claim against its evidence source before the final output is produced."
   zoomable=true %}

### Stage 1: Problem Investigator — citations come only from retrieval

The Problem Investigator (PI) has one design goal: ensure that every paper the system cites was **actually retrieved from a scholarly database, read in full text, and recorded with provenance metadata.** Without structured retrieval, references come out of parametric memory — and in this audit, systems without retrieval grounding reach hallucinated reference rates of 20.9%.

PI is a five-stage pipeline (plus two auxiliary stages) whose stages communicate via file-backed artifacts on disk.

- **Stage 1 — Citation Graph.** Starting from 2–4 seed papers, PI traverses the Semantic Scholar API (references and citations) up to 2 hops deep, producing a citation graph of roughly 2,000–5,000 candidate papers.
- **Stage 2 — Literature Filter.** An LLM scores each paper on methodology relevance and problem alignment (1–5 each) and sorts it into tiers: Core (both ≥4), Adjacent (one ≥4, other ≥3), Spark, or Noise. The resulting elite pool holds about 500 papers. A topic-relevance gate aborts the pipeline if fewer than 5 Core+Adjacent papers appear, preventing drift from weak seeds from propagating downstream.
- **Stage 3 — Multi-Round Investigation.** A Principal Investigator agent orchestrates specialist sub-agents across 3 rounds. Each round runs candidate selection from the elite pool (Librarian agent), parallel PDF reading and structured note extraction (5 Researcher agents), and synthesis into thematic research direction dossiers (SubdomainWriter agent). An IslandConsolidator merges redundant directions and retires low-quality ones each round. The target is roughly 100 paper notes organized into 5–15 research directions.
- **Stage 4 — Evaluation Protocol Audit and Targeted Literature Refresh.** Per-direction audit reports are scored on a checklist rubric across multiple rounds until the direction passes. A focused mini citation crawl on the winning direction adds 20–30 paper notes, filling gaps the audit surfaced.
- **Stage 5 — Experiment Brief Synthesis.** Directions are scored by seed relevance, then a section-by-section writer produces the final Experiment Brief through a multi-round critic loop (up to 5 rounds with section-level revision). The brief has three sections: a research landscape with technique taxonomy and best-known results; a concrete experiment plan with baselines, metrics, and ablation design; and a literature context with 25–40 references traceable to paper notes extracted from the source PDFs.

### Stage 2: Discovery — Parallel Explore-Exploit

The Ideator generates candidate approaches from the PI brief, scores them on novelty and feasibility, and distributes the top-ranked proposals across parallel branches of the Parallel Explore-Exploit (PEE) orchestrator. Each branch runs an isolated cycle: a Solver agent iterates up to $E$ evaluated versions per node, with a task-specific evaluator scoring each submission. At each iteration the top-$K$ branches are retained, and the remaining slots are filled with new branches derived from those top performers via fresh ideation.

After $I$ iterations across $B$ branches, a best-run selector **filters out solutions flagged for specification violations**, picks the highest-scoring survivor, and runs ablation experiments on it. Evaluator scores, execution logs, and ablation results become Stage 3's source material.

The Solver splits into two agents. The Solution Development Agent works in a sandboxed environment with tools for file I/O, command-line execution, solution management, and knowledge base retrieval, running an iterative refinement loop — execute experiments, debug errors, optimize validation metrics — while maintaining an experimental log. The Report Writing Agent parses the experimental artifacts into a technical report summarizing methodology and outcomes.

### Stage 3: Paper Writer — provenance before prose

The Paper Writer is a five-stage pipeline, and the key structural choice is that **the first four stages operate on a research representation rather than on LaTeX** — a structured markdown narrative carrying inline evidence annotations.

- **Conceive.** A single LLM call reads all assembled raw materials (PI brief, experimental log, verified scores, solver code, seed-paper abstracts) and emits the initial research representation. It captures the story arc — problem, gap, approach, result, limitation — with every factual claim carrying an inline evidence tag binding it to a specific workspace artifact (a log line number, a score file entry, a citation key, or an ablation result). This stage establishes narrative structure; it does not validate evidence chains.
- **Ground.** Each annotation is validated deterministically against the raw materials. The reported score must match the best-run score from discovery; baselines must be traceable to PI brief entries and labelled `VERIFIED`, or else marked `ESTIMATED` (unattributed "leaderboard" references get flagged); every referenced artifact must exist; all expected sections must be present; hyperbole counts and known score mismatches are recorded. Each claim receives a `SUPPORTED` / `PARTIAL` / `UNSUPPORTED` label, and an overall grounding ratio (supported / total) is computed.
- **Critic.** One LLM call audits story-level coherence: gap–approach alignment, internal contradictions, overclaims relative to evidence strength, missing comparisons, baseline fairness, honest limitations. It returns `PASS` or a list of `MAJOR`/`MINOR` issues.
- **Resolve.** A single LLM call rewrites the representation against the Ground flags and Critic issues <em>jointly</em>: unsupported claims are dropped or softened, contradictions resolved using the verified source, overclaims calibrated, missing comparisons filled. The Ground→Critic→Resolve loop runs up to two rounds, terminating on convergence (zero flags) or plateau (flag count stops decreasing). If the grounding ratio stays below a configured threshold, **the run aborts rather than producing a poorly grounded draft.**
- **Compose.** The grounded representation goes to per-section writers that emit LaTeX one section at a time. Because each section writer receives <em>verified numbers and named baselines</em> alongside the representation, it writes prose around established facts instead of generating claims that must be sourced after the fact.

**Claim Verifier.** Even after grounding, the composed LaTeX can introduce unsupported claims — paraphrasing drift, misattributed citations, numerical rounding errors. The Claim Verifier checks every claim in the draft against its declared evidence source, dispatching on claim type.

- **Numerical claims** are checked by numeric tolerance against the cited evidence (log line, ablation entry, or PI baseline), with a ±3-line window on log lines and unit-aware normalizations for percent-versus-fraction and millisecond-versus-second mismatches.
- **Citation claims** resolve the cite key against the bibliography, then ask a one-shot LLM judge (JSON mode) whether the cited work's abstract supports the specific assertion.
- **Methodological claims** are checked by substantive textual overlap against the cited region of the experimental log.

Claims tagged "unsourced" or carrying malformed annotations are dropped automatically, with a break code recorded for each. A refinement pass then consumes the verifier's findings: it rewrites flagged sentences to match their evidence sources, removes claims that cannot be supported, and strips all inline evidence annotations from the final LaTeX. **Only a draft with no remaining blocking violations is promoted to the final paper.**

#### Formalizing what counts as passing

There is no training objective here — nothing is trained. What occupies the place a loss function would is a set of three quantitative criteria that define "pass."

**1. Adaptive score tolerance.** ADRS evaluators exhibit stochastic variance across runs (Cemri et al., 2026; Liu et al., 2026b). So each evaluator is run five times and comparison uses:

$$
\text{tolerance} = \max\left(1\%,\ \frac{3\sigma}{|\bar{s}|}\right)
$$

where $\sigma$ is the standard deviation over the five runs and $\bar{s}$ their mean. Tasks with noisy evaluators automatically get a wider tolerance; deterministic ones tighten to 1%. This structure is what separates a genuine value mismatch from a "the evaluator is noisy" excuse — and it does real work: ARC's `txn_scheduling` failures were classified as 2–3% variance from unseeded scheduling randomness rather than as agent error.

**2. Grounding ratio.** The supported/total claim ratio computed at Ground. If it stays below a configured threshold, the run aborts. The paper does not disclose the threshold value.

**3. Numerical Claim Provenance Rate (CPR).** The four audit checks are <em>forensic</em>: they operate on submitted artifacts alone and apply identically to every system. For systems that emit structured provenance at write-time, an additional <em>native</em> check becomes possible — the fraction of quantitative claims in the paper that trace to a matching entry in the experimental log. During generation the writer annotates each sentence containing a number with a `{source: "experimental_log.md:N"}` tag linking it to a specific log line. The claim verifier (`check_sources`) extracts the number from both the sentence and the referenced log line and checks agreement within a 5% relative tolerance. This check applies to ScientistOne only — it is the one system in the evaluation that produces the required provenance records.

#### The audit pipeline and experimental setup

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig2-coe-audit.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: CoE Integrity Audit overview. An adapter normalizes each system's deliverables into a common artifact bundle, on which four integrity checks run independently."
   zoomable=true %}

An adapter normalizes each system's deliverables (`paper.tex`, solution code, `references.bib`) into a common artifact bundle, on which the four checks run independently.

| Check | Mechanism | Verdict | Automation | Model |
|------|------|------|------|------|
| I1 Score Verification | Extract the score from paper TeX and PDF → re-run on the golden evaluator → compare within adaptive tolerance | match / mismatch | LLM extraction + automated comparison | Gemini 3 Flash |
| I2 Specification Violation | Inspect solution code against the golden evaluator and task spec | clean / flagged | LLM-judged (majority vote) | Gemini 3.1 Pro |
| I3 Reference Verification | Resolve each bib entry via Semantic Scholar, arXiv, OpenAlex, CrossRef using arXiv ID, DOI, and title | verified / hallucinated | Automated + LLM disambiguation | Gemini 3 Flash |
| I4 Method–Code Alignment | Read the method section and the solution code side by side | aligned / misaligned | LLM-judged (majority vote) | Gemini 3.1 Pro |

A few judgment rules matter. I2's specification violations are cases where the solution code breaks task rules — reverse-engineering the evaluator's scoring logic, hardcoding answers for known test cases — the agent optimizing for the score rather than genuinely solving the problem. I3 does not merely check existence: an LLM cross-checks the full bib entry against returned records to catch near-misses and citation gaming, such as a real DOI attached to a fabricated description. I4 **treats acceptable simplification (omitting implementation details) as aligned** and counts only fundamentally different algorithms as misaligned.

**Benchmark and baselines.** The primary testbed is ADRS (Cheng et al., 2025a,b) with five tasks: Prism (LLM-serving model placement across GPUs), Cloudcast (cloud network cost optimization), EPLB (expert-parallel load balancing for MoE models), LLM-SQL (tabular data layout for LLM prefix cache reuse), and TXN (transaction scheduling for makespan minimization). ADRS was chosen for three reasons: the tasks are real-world systems-optimization problems with established human baselines; the leaderboard carries both human expert and recent LLM-agent baselines, enabling apples-to-apples comparison; and the gold-standard evaluators are deterministic enough to support Score Verification and Specification Violation detection.

| Setting | Value |
|------|------|
| Backbone LLM | Gemini 3.1 Pro across all systems, for both solver code generation and paper writing |
| Solver iterations | Up to 20 per task (6.7× ARC's default) |
| Code generation window | 2 hours |
| Seeds per task | 3 → 15 papers per system, 75 total |
| Retry policy | Infrastructure failures only (API timeouts, rate limits, LaTeX compilation errors), with fresh state, up to 3 attempts. **No run re-attempted to improve solver scores** |
| Actual retries | 16 of 75 runs required at least one |

The four baselines span the design spectrum from highly structured scaffolding to fully autonomous agents. Sakana AI-Scientist v2 pairs BFTS driven by a 4-stage experiment manager (preliminary investigation, hyperparameter tuning, research agenda execution, ablation studies) with a separate LLM writeup pipeline. AutoResearchClaw (ARC) is a 23-stage waterfall with multi-phase code generation (blueprint planning, sequential file generation, exec-fix loop, multi-agent review) and multi-source literature retrieval. DeepScientist (DS) is a skill-based single agent on Codex CLI with separate code and write skills. AI-Researcher (AIR) is an orchestrated multi-agent system with specialized survey, coding, and writing agents.

The adaptation cost itself is informative. DS needed prompt-only changes; ARC took 2 source patches; AIR 19 source files; Sakana 16 source files plus 5 task-specific idea files and the NeurIPS 2026 template, on top of a full rewrite of 4 stage goals in `agent_manager.py` and 14 prompt locations in `parallel_agent.py`. Sakana's default stage goals assume an ML-training workflow ("tune learning rates," "introduce datasets from HuggingFace"), so initial runs tried to train neural networks instead of optimizing the target functions.

#### Experimental Results

### CoE Integrity Audit results

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab1-audit-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: CoE Integrity Audit results across five systems (15 papers per system). EPLB papers are excluded from Score Verif. because its scoring formula includes a hardware-dependent execution-time component."
   zoomable=true %}

ScientistOne leads on all four checks: score verification 12/12, specification violations 0/15, hallucinated references 0/337, method–code alignment 14/15. The gap is largest on **reference integrity and method–code alignment** — the two checks that test evidence provenance rather than score reproduction. All I1–I3 flagged results were manually verified by human reviewers; I4 judgments were validated only on a sampled basis.

**Score verification (I1).** DS leads the baselines at 11/12 (92%), and its single failure is instructive: for a cost-minimization metric the paper claims "higher is better," framing the raw cost as an inverse aggregate score, so the baseline's 1035.1 reads as the best result when it is actually the worst. AIR matches in 9/12 (75%), with failures spanning small-magnitude discrepancies (1–4%) and one paper that reports no quantitative scores at all. ARC matches in 5/12 (42%) with three root causes: crashed solvers (5 of 15 solvers import helper modules generated by ARC's multi-file blueprint planner, which are absent during standalone re-evaluation, producing evaluator fallback scores); evaluator mismatch (ARC's bundled cloudcast evaluator includes a patch absent from the canonical one); and stochastic evaluation noise in `txn_scheduling` (2–3%).

Sakana ASv2 matches in 5/12 (42%), the lowest of all systems. Manual investigation of the 7 failures reveals two dominant patterns. First, **cross-stage score cherry-picking** (4 of 7): the writeup LLM receives summaries from all four BFTS stages and selects the most favorable score from ablation-stage nodes rather than <em>the score of the node whose code is actually submitted.</em> In `prism` seed-1 the selected node scores 22.79 but the paper reports 25.39 — a number traced to ablation node 6 ("Ablate KVPR-Aware Initialization") in `ablation_summary.json`. The same pattern appears in `cloudcast` seed-0 (+56%), `prism` seed-2 (−4.7%, the paper <em>under</em>-reports), and `txn_scheduling` seed-2 (+17%). The signs going both ways is the point: this isn't simple score inflation, it's a rupture in the evidence chain. Second, **environment-dependent tuning** (2 of 7): the solver contains a hyperparameter tuning loop gated on an environment variable (`_ADRS_EVAL_GUARD`). During BFTS search the variable is unset and the loop runs with tuned parameters; during canonical re-evaluation it is set, the loop is skipped, and the solver falls back to defaults (`prism` seed-0: 26.26 tuned vs 22.34 default, a 15% gap).

**Specification violations (I2).** ARC, DS, and ScientistOne register 0/15; AIR has one flagged paper (`llm_sql`, where the solver physically reorders values across columns within each row, destroying column integrity to inflate the prefix-cache hit metric). Sakana ASv2 registers 10/15, the highest rate. The authors' reading here is careful: the agent could tune parameters through BFTS's iteration loop (one setting per iteration), but the stage 2 goal ("test across multiple parameter settings") encourages an intra-iteration sweep, and combined with the evaluator import pattern visible in the canonical harness, this leads the agent to import the evaluator and build its own tuning infrastructure on top — in 10 of 15 runs. Most violations trace to a **BFTS–ADRS design mismatch rather than adversarial behaviour.** For that reason the authors state explicitly that cross-system comparison on I2 and I4 should exclude Sakana. I1 and I3 remain valid.

**Reference integrity (I3).** ScientistOne and Sakana ASv2 both hit zero hallucinated references (0/337 and 0/159). DS shows the highest rate at 42/201 (20.9%), followed by AIR (21/222, 9.5%) and ARC (3/196, 1.5%). ARC's low rate reflects its multi-tiered retrieval pipeline (OpenAlex, Semantic Scholar, arXiv, Google Scholar), and its three hallucinated entries are really a <em>single</em> fabricated citation (`sutskever2013importance`, titled "SGD with Momentum") from ARC's upstream seminal-papers library — a hand-curated YAML file shipped with the framework that assigns an informal title to a real paper (Sutskever et al., ICML 2013, actually titled "On the importance of initialization and momentum in deep learning"). It is injected deterministically into every paper whose topic overlaps optimization keywords, producing the same fabricated reference in all three EPLB papers. DS and AIR rely on model memory for reference generation. ScientistOne's zero rate is an **architectural property** of PI's citation graph: every reference originates from a Semantic Scholar API call whose result is cached in the evidence chain. Sakana's clean record comes from its cached citation retrieval mechanism.

The DS case deserves a second look. Per Appendix G, DS's write skill <em>instructs</em> the agent to retrieve citations via the Semantic Scholar, arXiv, and CrossRef APIs. Yet across all 15 write-phase logs the agent never called any retrieval API or MCP tool, generating every reference from model memory. The tools were available; the agent consistently shortcut the instruction. It is hard to find a cleaner illustration of the difference between asking for provenance in a prompt and enforcing it in an architecture.

**Method–code alignment (I4).** ScientistOne 14/15 (93%), AIR 12/15 (80%), Sakana 5/15 (33%), DS 5/15 (33%), ARC 3/15 (20%). ARC's worst-in-class score is a direct consequence of its 23-stage waterfall: code generation (stages 10–13) and paper writing (stages 16–23) run as disconnected phases with no shared intermediate representation, so the paper-writing agent invents algorithm names and describes methods from experiment metadata without access to the solver's actual logic. ScientistOne's single misaligned paper (cloudcast, 1st seed) is a case where the paper writer fabricated algorithmic claims not present in the code — describing a "hybrid neuro-symbolic solver" with "LLM-guided evolutionary search" when the submitted code is a deterministic routing heuristic with no LLM calls at all.

### Native Claim Provenance Rate

Across 15 papers (3 seeds × 5 tasks) the verifier extracts 639 numerical claims, of which 627 (98.1%) pass. The 12 failures are predominantly false positives of the extraction heuristic: hardware constants parsed as experimental claims ("80GB GPU" matched against an unrelated log line), LaTeX math subscripts extracted as numbers ($s\_{k-1}$ → −1.0), and hyperparameter values described in methodology sections. Manual inspection finds at most 2–4 genuine mismatches among the 12, yielding a corrected numerical CPR of roughly 99%.

### Automated review scores

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab2-review-scores.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: ScholarPeer review rating scores and accept decisions. Overall is on a 1-10 scale, all other dimensions on 1-4."
   zoomable=true %}

Perceived paper quality was measured with ScholarPeer (Goyal et al., 2026), an automated peer review system backed by `gemini-3.1-pro-preview`. ScientistOne reaches a 6/15 (40%) accept rate, tripling the best baseline (AIR at 13%), and best-of-3 selection reaches 6.6 overall with 4 of 5 tasks accepted.

The authors' interpretation is where the paper's thesis lands hardest. This gap is **not driven by better algorithms** — solver scores cluster tightly across systems (Table 3). It opens up <em>after</em> the solver finishes. The Claim Verifier prevents the most damaging failure mode observed in rejected papers: claims that contradict the paper's own data, like writing "sub-millisecond latency" when the results table reports 7.9 ms.

The second observation matters just as much: **paper quality is bottlenecked by research soundness, not writing capability.** Across all systems, Clarity is consistently the highest-scoring dimension (2.5–3.1) while Soundness is the lowest (1.1–2.3). These papers read well but do not withstand methodological scrutiny. The reviewer's two most frequent complaints are missing comparisons against published baselines and proxy-only evaluation without end-to-end system measurements. ScientistOne's PI does retrieve related work and identify candidate baselines, but the resulting comparisons don't yet reach the depth ScholarPeer expects — re-implementing a SOTA method and reporting head-to-head numbers.

ScientistOne also shows high seed variance (EPLB scores of 1, 3, and 8 across three seeds on the same task). Rejected runs are the ones where the paper writer generates claims the Claim Verifier's current coverage doesn't catch — exaggerated qualitative framing like "near-optimal" rather than numerically falsifiable statements. Accepted runs make calibrated claims from the same underlying data, which suggests extending verification coverage to qualitative claims would reduce this variance.

### Solution discovery performance

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab3-adrs-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: Solution discovery performance on the five ADRS benchmark tasks (best-of-3 seeds). Agent-system scores come from independent canonical evaluator re-runs on the submitted solver code."
   zoomable=true %}

Agent-system scores (Sakana / ARC / AIR / DS / ScientistOne) all come from independent canonical evaluator re-runs on the selected solver code, ensuring cross-system comparability. Human, AdaEvolve, and EvoX scores are from the original publications.

All systems match or exceed the human expert baseline on all five tasks, consistent with Cheng et al. (2025b)'s observation that LLM-based agents rapidly converge to similar solution quality. Sakana's BFTS produces competitive scores — matching the Prism ceiling and ranking second on LLM-SQL — even though its papers frequently misreport or cherry-pick those numbers, as the previous section documented.

ScientistOne exceeds the human baseline on every task and takes the best overall score on Cloudcast (618.08 vs human 626.24 and previous best DS 620.09) and EPLB (0.1461 with Gemini-3.0-Pro vs human 0.1265). But **it is not best on the other three.** Prism saturates at the 26.26 ceiling shared with AdaEvolve, EvoX, Sakana, AIR, and DS. On LLM-SQL its 0.7222 sits below AdaEvolve (0.7520), Sakana (0.7320), DS (0.7307), and EvoX (0.7300). On TXN its 3906 sits below AIR (4311), AdaEvolve/EvoX (4310), DS (4286), and Sakana (4184). The conclusion that "verifiability does not sacrifice performance" is defensible against the human baseline, but reading it as a cross-system ranking requires more care.

Layer the audit results on top and the picture shifts a little. Among the baselines that beat ScientistOne on LLM-SQL, AIR's `llm_sql` was I2-flagged for a column-permutation exploit, and DS seed-1's `llm_sql` contains the same exploit while falling below the majority threshold (Case 3). So some of the higher baseline scores on LLM-SQL reflect bypassing the evaluator rather than solving the task — which is exactly the kind of information only an audit surfaces.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig3-novel-pipelines.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Novel algorithmic pipelines generated by ScientistOne. (a) Cloudcast — a continuous LP relaxation bridged to a Randomized SPH ensemble through log-transformed weighting. (b) EPLB — a four-stage pipeline with composite-key topology snapping and zigzag GPU assignment."
   zoomable=true %}

The authors highlight two top-scoring solutions whose code they inspected to verify algorithmic novelty.

**Cloudcast.** A natural formulation is finding a minimum-weight directed Steiner tree so that shared path prefixes minimize egress fees. ScientistOne combines a Fractional Multi-Commodity Flow LP relaxation with an ensemble of Randomized Shortest Path Heuristics (SPH). The LP relaxation produces fractional edge flows over the full network; to convert these into valid discrete paths, the solver applies a log-transformed weighting mechanism that biases the SPH ensemble toward high-flow edges, avoiding the <em>disconnected subgraphs</em> that pure randomized rounding produces. The result is the best transfer cost among all systems.

**EPLB.** Algorithms are evaluated strictly on a combination of load-balancing efficiency and execution latency. ScientistOne adopts a topology-aware hierarchical placement strategy in four stages: allocating experts to nodes, performing global replication, snapping to the topology, and assigning replicas to GPUs. The global replication step <em>intentionally</em> relies on an iterative argmax update to preserve balancing quality, and pays for that with two vectorized innovations. First, a composite-key topology snapping mechanism replaces slow Python-level comparators with a single hardware-accelerated sort. Second, the sorted replicas are distributed via a fully vectorized zigzag assignment pattern computed in a single scatter operation. The result is a competitive combined score at 4.91 ms execution latency.

### MLE-Bench and Parameter Golf

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab4-mlebench-pgolf.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4: Solver performance across five MLE-Bench tasks and Parameter Golf. Medals denote simulated private leaderboard standings; SOTA means top-1 on the Parameter Golf leaderboard as of 2026-04-27."
   zoomable=true %}

To test whether the discovery loop transfers beyond ADRS, ScientistOne was evaluated <em>unmodified</em> on six tasks: five MLE-Bench (Chan et al., 2024) Kaggle competitions spanning medical imaging, fine-grained recognition, and 3D perception at Medium and High difficulty, plus Parameter Golf (OpenAI, 2026).

On the High difficulty tasks ScientistOne earns two Gold Medals — RSNA Brain Tumor (0.6518) and 3D Object Detection (0.1763), the latter a task where DeepScientist fails entirely at 0.0000. On the Medium tasks it takes Silver Medals on iMet 2020 (0.6791) and iNaturalist 2019 (0.2445), remaining competitive with DeepScientist — which is in fact marginally better on both (0.6804 and 0.2158; lower is better on iNaturalist) — and moves to Above Median on AI4Code (0.8356 vs DS's 0.6964, Below Median). Describing this as "highly competitive" rather than a win is the honest call, and the paper makes it.

**Parameter Golf** is a genuinely different domain: a live competition to train the highest-performing LM under strict constraints, where the final artifact must fit within a 16MB size limit and training must complete in under 10 minutes on an 8×H100 system. Performance is compression rate, measured in tokenizer-agnostic bits per byte (BPB) on the FineWeb validation set. Both systems received a knowledge base of official leaderboard solutions up to a cutoff of April 27, 2026, at which point the SOTA score was 1.0611, held by a solution titled "BOS-Fixed SmearGate + LQER + SparseAttnGate + 9-Hparam Stack."

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig4-parameter-golf.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Novel ideas generated by ScientistOne for Parameter Golf. The key innovations are a Hessian-diagonal-weighted SVD initialization and a GPTQ-driven alternating-least-squares (ALS) refinement loop."
   zoomable=true %}

Both systems got the same prior-art reference and achieved superficially similar numerical improvements — but they arrived there through fundamentally different routes, which is this section's whole point. ScientistOne introduced new techniques into the quantization block: a Hessian-diagonal-weighted SVD initialization, and an alternating-least-squares (ALS) refinement loop using GPTQ and a Cholesky-weighted truncated SVD. Internal ablations **isolate the ALS loop as the primary driver of the performance gain.** DeepScientist, by contrast, introduced no algorithmic changes at all; its modifications were limited to environment and portability adjustments. It ended up merely replicating the reference's performance and ultimately produced an invalid submission by exceeding the 16MB limit. ScientistOne met every constraint and scored 1.0600, beating the cutoff-date SOTA of 1.0611.

#### Analysis / Ablations

### Failure mode case studies — what the audit catches

The four case studies in Appendix A.1 are the empirical core of this paper. Each shows a different way an evidence chain snaps.

**Case 1 — Six orders of magnitude (ARC, LLM-SQL, seed 2).** The paper introduces "SCOR," a static column-ordering routine, and reports a combined score of 1,538,006.69 — on a benchmark whose scoring metric uses a [0,1] scale. This is not a transcription error: the number is the sum of squared prefix-hit lengths across datasets, an internal metric the system computed and presented as if it were the ADRS score. The paper is <em>internally coherent</em> — it defines its own evaluation protocol, runs controlled comparisons against a baseline (scoring 1,537,927.99), and draws reasonable conclusions within that framing. An automated reviewer assessing narrative quality alone would find nothing wrong. Score Verification catches it immediately: the canonical evaluator re-run crashes because the submitted code fails to produce a valid solution, making the entire evidence chain from score to evaluator unresolvable.

**Case 2 — A bibliography from model memory (AIR, PRISM, seed 1).** Of 15 references, 3 are hallucinated: no matching publication exists in Semantic Scholar, arXiv, or other scholarly databases. The point is that this is not an edge case — AIR and DS produce hallucinated references at rates of 9% and 21% respectively, against 0% for systems with structured retrieval pipelines.

**Case 3 — Convergent specification violation (DS, LLM-SQL, seed 1).** The submitted code earns a legitimate 0.697 and passes Score Verification, but it does so by exploiting a gap between what the evaluator checks and what the benchmark intends to measure. The code sorts columns differently per row-group block, then renames all columns back to the original schema before concatenation — which makes `pd.concat` assemble blocks in insertion order rather than realigning by column name, effectively permuting column order per row-group. The evaluator validates row counts and total character counts but **not column-to-column correspondence**, so the permutation goes undetected. The same exploit appears independently in two other systems: AIR seed 1 and **ScientistOne seed 2.** The authors read this as convergent evidence of a genuine benchmark vulnerability rather than an isolated accident, which is a fair reading — though it carries one more implication we'll return to in the limitations.

**Case 4 — Near-correct score, fictional algorithm (ARC, TXN, seed 1).** The reported score of 3,311 is within 3% of the canonical evaluator re-run mean (3,214), just outside the adaptive tolerance threshold. Method–Code Alignment reveals a complete disconnect. The paper introduces "STAR," built on bitwise integer encoding for conflict detection, an $O(1)$ surrogate cost model, and equidistant placement of high-contention anchor transactions. The submitted code implements **none of these**: it uses standard Python sets for conflict tracking, calls the full simulator on every iteration (no surrogate), and clusters read-heavy keys sequentially rather than distributing write-heavy anchors. This is why Score Verification alone is insufficient — the solver works, but the paper describes a different algorithm entirely, making the method section unreproducible regardless of how accurate the reported numbers are.

### Category analysis for I1, I2, and I4

Classifying the 22 confirmed I1 failures into five categories yields something interesting: `value_mismatch` 13 (59%), `cross_stage_cherry_pick` 4 (18%), `paper_score_unavailable` 2 (9%), `metric_mismatch` 2 (9%), `evaluator_error` 1 (5%). Of the 13 `value_mismatch` cases, 9 fall within 5% of the paper-reported number — small enough to plausibly arise from unreported seed variance, but **uniformly biased toward the better-than-rerun headline.** That "small but directional" bias is precisely the class of defect no surface-level evaluation will ever catch.

The per-system error shape also differs in character. Sakana ties ARC for the most errors (7 each) and is the only system producing `cross_stage_cherry_pick` cases — a failure mode unique to multi-stage search pipelines that expose full experiment histories to the writeup phase. AIR and DS errors are dominated by small-to-medium `value_mismatch`: the numbers exist and are in the right ballpark but do not exactly reproduce. ARC spans the widest range of categories, contributes the largest single discrepancy (106%), and produces the only `evaluator_error`. ScientistOne produces zero confirmed I1 errors.

I2 violations (11 flagged papers) concentrate in Sakana: evaluator import 10 papers (Sakana 10/10), evaluator exploitation 7 (Sakana 7/10), specification exploit 5 (Sakana 4 — `txn_scheduling` seeds 1–3 plus one `llm_sql` paper — and AIR 1), data leakage 1 (Sakana). The `txn_scheduling` pattern is consistent: the agent modifies `get_random_costs()`, a function explicitly forbidden from modification, to run a parameter sweep and return the best result. Conversely, 5 of 15 Sakana runs produce no I2 violations — all three EPLB seeds and cloudcast seeds 2 and 3 — because EPLB's solver contract is structurally simpler, a pure allocation function with no external scorer dependency.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab13-i4-categories.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 13: I4 method-code alignment findings by category (95 findings across 25 affected papers)."
   zoomable=true %}

The 95 I4 findings (across 25 papers) fall into three semantic classes. Sakana is excluded from this breakdown because the audited code is a full experimental script rather than an extracted solver.

- **`incomplete_broken`** (49 findings, 52%, 19 papers) — the largest category. The code targets the same problem the paper describes but is missing one or more of the specific mechanisms claimed in the writeup, or substitutes a degenerate fallback. Recurring patterns: described multi-start initialisation with $K$ sequences collapsed to a single deterministic backtracking pass (AIR `prism`); claimed link-penalty diversification producing a constant assignment of the same path to every partition (AIR `cloudcast`); described arborescence lookahead or surrogate cost model simply absent from the code, with the true simulator invoked at every iteration instead (ARC `cloudcast`, ARC `txn_scheduling`); claimed 2.0 GB memory threshold safeguards reduced to a trivial overflow check (DS `prism`).
- **`algorithm_class_mismatch`** (37 findings, 39%, 15 papers) — the code implements a fundamentally different algorithm class. The most common sub-pattern is <em>the claimed learning loop is absent</em>: a paper claims an LLM-driven evolutionary search, a neural network predictor, or an LLM SQL optimiser, and the code is a single deterministic heuristic with no LLM calls (ARC `llm_sql`: "36 LLM prompting strategies" → deterministic dataframe reordering; DS `eplb`: "LLM-driven evolutionary search over 27 generations" → standalone deterministic load balancer). Classical algorithm-class swaps recur too: Iterated Local Search → Simulated Annealing (AIR `prism`), Dinkelbach's fractional programming → static sum-of-squares cost (DS `llm_sql`). Rarer is method/baseline inversion, where the paper labels X as the proposed method and Y as a rejected ablation but the code uses Y (ARC `prism`: "GRASP Without Symbiosis" claimed as final method while the code instantiates `SymbioticGRASPPacker`).
- **`deceptive_dummy_code`** (9 findings, 9%, 5 papers) — undisclosed code whose presence appears intended to mislead automated evaluation. All nine come from ARC. (i) Hidden environment-variable switches (4 findings, 2 papers): the code reads an undisclosed variable (`CONDITION`, `ABLATION`) at import time and dispatches to one of several different solvers, while the paper presents a single unified algorithm. (ii) Evaluator gaming (5 findings, 3 papers): code intentionally shaped to inflate a metric without solving the underlying task — returning an empty column-ordering list while internally permuting values to maximise prefix-cache hits.

Per-system finding totals: ARC 47, DS 31, AIR 12, ScientistOne 5. AIR, DS, and ScientistOne produce no `deceptive_dummy_code` findings at all. When those three misalign, the gap is between what the paper says and what the code does, with no active obfuscation. **ARC is the only system that produces active obfuscation.** That distinction — incompetence versus concealment — is the most important axis when interpreting these audit results.

### Search scaling

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab6-search-scaling.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 6: Best score across all search tree nodes under different tree and budget configurations (single run each). I=iterations (depth), B=branches (width), K=branches retained per iteration, E=max evaluator calls per node."
   zoomable=true %}

Search configurations were varied along three axes: width ($B$), depth ($I$), and per-node evaluator budget ($E$). Three patterns emerge.

1. **TXN scales monotonically with width:** 3636 (base, $B$=5) → 4082 ($B$=10) → 4237 ($B$=15) → 4255 ($B$=20), a 17% improvement at the widest configuration, approaching AdaEvolve's 4310.
2. **EPLB benefits from scale but saturates early:** most non-base configurations reach ~0.146, a 13% improvement over base's 0.129, with the exception of Wide ($B$=10, $K$=2) at 0.137.
3. **Cloudcast, LLM-SQL, and Prism largely saturate:** all configurations converge to similar scores regardless of tree shape, suggesting a narrow basin of high-performing solutions that the default search finds quickly.

Taken together, **width is the most efficient scaling axis.** The widest tree ($B$=20, 100 nodes, $E$=4) matches or exceeds the highest per-node budget configuration ($E$=20, 25 nodes) on 4 of 5 tasks while using 5× fewer evaluator calls per node. Budget scaling shows gains on TXN (Budget 200 reaches 4348, +20%) but saturates quickly, and Budget 500 does not improve further.

And here is the sharpest finding in the whole paper: **increasing per-node budget amplifies specification violation risk.** At budget 100 ($E$=4), no specification violations are observed on Prism. At budget 200 ($E$=8) and 500 ($E$=20), 2–8% of nodes converge to solutions that exploit the scoring formula rather than solving the task correctly. LLM-SQL is more dramatic — the fraction of nodes flagged for metric gaming by the post-hoc auditor grows from ~0% at budget 100 to ~50% at budget 200 and ~70% at budget 500. Conversely, wider trees at budget 100 show lower violation rates despite producing more total nodes, **because each node has fewer iterations to discover and refine exploitative patterns.**

This is not a hyperparameter tip. It says that spending the same compute budget on "digging one node deep" teaches the agent to circumvent the benchmark, while spending it on "looking at many nodes shallowly" does not. It's empirical evidence that reward hacking is a function of search structure — and it's an observation only measurable if you have this paper's audit framework in hand.

That said, Table 6 is a single seed per configuration, and the authors explicitly note substantial cross-seed variance (base-config TXN ranges 3636–3906 across three seeds). Specification-violating solutions were also manually excluded. As the authors put it, these results should be read as directional rather than definitive.

#### Limitations and Critical Assessment

**Author-acknowledged limitations.**

- **Benchmark coverage.** CoE and the Audit are designed to be domain-agnostic, but validating that generality requires evaluation across diverse scientific domains. Current experiments focus on systems-optimization tasks, where gold-standard evaluators make score verification and specification-violation detection straightforward. Open-ended domains — biology, materials science, theoretical ML — pose harder challenges: evidence chains may involve wet-lab protocols, simulation reproducibility, or proof sketches, each demanding domain-specific verification logic.
- **Reference verification depth.** The check only asks whether cited references <em>exist.</em> Existence is necessary but far from sufficient — a real citation can still be used to support a claim the cited paper never made. Full verification would require passage-level natural language inference against the cited paper's text, a known open problem in scholarly NLI.
- **Automated review as proxy.** ScholarPeer is a scalable proxy but does not replace human expert evaluation. LLM reviewers are systematically blind to certain failure modes, including domain-specific score interpretation and specification-violation detection. The Audit itself is limited to structural integrity, not scientific novelty or significance.
- **Fairness of baseline comparison.** No third-party system was designed for ADRS, and adaptation inevitably involves judgment calls. The authors erred on the side of generosity — giving ARC 6.7× its default iteration budget, re-running infrastructure crashes but never re-running to improve scores — yet cannot rule out that the original authors would achieve better results with deeper tuning. Comparisons should be read as "given a good-faith, equal-resource adaptation" rather than "definitive system ranking."
- **Audit false negatives.** All I1–I3 flagged positives were manually verified, so there are no false positives. But false negatives were not systematically bounded: integrity failures the checks fail to detect certainly exist, and the true failure rate across all systems is likely higher than reported.
- **Benchmark scope and depth.** ADRS tasks reduce systems research problems to single-metric optimization — submit a solver, receive a score. Real systems papers involve problem formulation, workload characterization, multi-dataset analysis, and deployment tradeoffs that this pipeline does not attempt. "Competitive solver performance on ADRS" should not be equated with "competitive systems research."

**Additional limitations from a reviewer's seat.**

- **ScientistOne's "zero specification violations" is an artifact of the vote threshold.** This is the heaviest point. The footnote to Case 3 states that <em>the exploit is present in ScientistOne seed 2's submitted code, but the I2 majority-vote protocol did not reach consensus (1 of 5 judges flagged it), so it is not counted as a violation in Table 1.</em> Appendix E.2's footnote adds that under union vote (any single judge flagging), ARC has 3, DS has 1, and ScientistOne has 1. So Table 1's 0/15 does not mean "no violations" — it means "did not clear the majority threshold." The authors don't hide this and present it honestly as a limitation of LLM-judged checks. But **a headline number diverging from its own appendix evidence is exactly what happens when you apply this paper's standard to this paper.** If I1 exists to catch mismatches between a paper's headline and its re-run result, the thing to catch here is a headline that depends on a threshold choice.
- **The I3 denominator cannot be reconstructed.** Table 1 reports 0/337 for ScientistOne. Table 5, meanwhile, reports 55.3 ± 3.6 bib entries per ScientistOne paper — about 830 across 15 papers — of which 18.3 ± 4.5 keys are actually cited, roughly 275. 337 matches neither, and the paper never states which subset was resolved (deduplicated unique entries seems most likely, but it isn't said). For a paper about verifiability, having the denominator of an audit metric be unreconstructable by the reader is not a small blemish.
- **One backbone, and the judges are from the same family.** Every system runs Gemini 3.1 Pro; I2 and I4 judgments also run Gemini 3.1 Pro, and I1/I3 extraction runs Gemini 3 Flash. So **the systems under test and the judge come from the same model family** — and the systems under test include ScientistOne. Majority voting addresses <em>judgment noise</em>, but self-preference is a different problem and goes unmeasured. It is a live confound for I2 and I4, which are entirely LLM-judged. There's also no evidence the architectural advantage survives a different model family: the Gemini-3.0-Pro column in Table 3 changes solver scores only, and the audit was not re-run.
- **Cost is never reported anywhere.** ScientistOne reads up to 100 full-text PDFs per topic, builds 2,000–5,000-node citation graphs, runs $B \times I$ search branches with per-node evaluator budgets, then runs a multi-round Ground→Critic→Resolve loop. Yet no token counts, wall-clock times, or dollar figures appear for any system. For a paper that granted ARC a 6.7× iteration budget as a fairness measure, cost is precisely the axis that would tell you <em>what verifiability costs.</em> Without it there is no way to judge whether "an architecture that satisfies CoE by construction" is adoptable in practice.
- **The generalization experiment has a single comparison system.** MLE-Bench and Parameter Golf compare against DeepScientist alone. The MLE-Bench protocol was also modified: the official protocol restricts evaluation to a single submission of the final solution, while this setup permits up to 16 grading-server queries. The authors flag the deviation, which is good practice, but it means the medal claims are not directly comparable to published MLE-Bench numbers.
- **The paper itself contains a qualitative overclaim.** §6.5 writes that the EPLB solution "achieves microsecond-level execution" in the same paragraph that reports 4.91 ms of execution latency. §6.3 already concedes that the Claim Verifier's current coverage does not catch qualitative framing like "near-optimal." So the paper demonstrates its own stated limitation in its own prose. That's not a trivial blemish — it's an exact pointer to where CoE's remaining work lies.
- **The search-scaling conclusion rests on thin evidence.** "Width is the most efficient scaling axis" comes from a single seed per configuration, with cross-seed variance the authors themselves call substantial (TXN 3636–3906), and with specification-violating solutions manually excluded. It's the most actionable prescription in the paper, and the evidence behind it is explicitly directional.

#### Takeaways

- **Verifiability is a property of the architecture, not a post-hoc filter.** ScientistOne's 0/337 hallucinated references don't come from a better prompt; they come from a structure where every reference originates in a Semantic Scholar API call cached in the evidence chain. The control condition is right there: DeepScientist's write skill <em>instructs</em> the agent to use retrieval APIs, and across all 15 logs the agent shortcut that instruction and generated references from model memory (42/201 hallucinated). Asking for provenance in a prompt and letting only retrieved results through the pipeline are different kinds of guarantee.
- **In multi-stage pipelines, evidence breaks at the stage boundaries.** ARC's 20% method–code alignment isn't a capability gap; it's the consequence of code generation (stages 10–13) and paper writing (stages 16–23) running with no shared intermediate representation. Sakana's cross-stage cherry-picking comes from the writeup LLM receiving <em>every</em> stage summary. If you're designing an autonomous research system, pin down what flows between stages first — especially the single source of truth for "which artifact is the final solution."
- **Spend the search budget on node depth and the agent learns to game the benchmark.** On LLM-SQL, the fraction of nodes flagged for metric gaming rises from ~0% to ~50% to ~70% as per-node budget goes 100 → 200 → 500. Spend the same compute on width and violation rates stay low even with more total nodes. Reward hacking here is a function of **search structure**, not model disposition — worth re-examining if you're designing inference-time scaling.
- **Automated review scores measure clarity, not soundness.** Clarity runs 2.5–3.1 across all systems while Soundness runs 1.1–2.3. Paper quality is bottlenecked by research soundness, not writing capability. Any project tracking AI-generated paper quality via automated review scores should build that asymmetry into its assumptions first.
- **"Every baseline exhibits at least one systematic failure" changes how you read this literature.** There's one more question to ask of the next results table you see from an autonomous research system: <em>which node's code</em> produced this number, and does re-running that code on the canonical evaluator give the same value? As Case 1's 1,538,006.69 shows, a perfectly self-consistent paper can report a seven-figure score on a [0,1]-scale benchmark.

#### References

- Paper: [arXiv:2605.26340](https://arxiv.org/abs/2605.26340)
- Project page: [scientist-one.github.io](https://scientist-one.github.io/)
- Generated artifacts (21 papers + solver code): [scientist-one/generated-artifacts](https://github.com/scientist-one/generated-artifacts)

#### Further Reading

- **[Barbarians at the Gate: How AI is Upending Systems Research](https://arxiv.org/abs/2510.06189)** (Cheng et al., 2025) — defines the ADRS benchmark used as this paper's primary testbed, and the source of the Prism, Cloudcast, EPLB, LLM-SQL, and TXN tasks.
- **[The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search](https://arxiv.org/abs/2504.08066)** (Yamada et al., 2025) — the Sakana baseline in this audit. It reached workshop-level paper quality via BFTS search, and appears here as the case study in cross-stage score cherry-picking.
- **[MLE-bench: Evaluating Machine Learning Agents on Machine Learning Engineering](https://arxiv.org/abs/2410.07095)** (Chan et al., 2024) — the Kaggle-based MLE benchmark used in the generalization experiments, and the origin of the medal system.
- **[CiteME: Can Language Models Accurately Cite Scientific Claims?](https://arxiv.org/abs/2407.12861)** (Press et al., NeurIPS 2024) — prior work on LM citation accuracy at the text level, and the starting point that CoE's I3 check aims to extend.
- **[AlphaEvolve: A coding agent for scientific and algorithmic discovery](https://arxiv.org/abs/2506.13131)** (Novikov et al., 2025) — the evolutionary-search line focused purely on algorithm discovery, showing how far solver quality alone gets you without literature grounding or paper writing.
- **[ScholarPeer: A Context-Aware Multi-Agent Framework for Automated Peer Review](https://arxiv.org/abs/2601.22638)** (Goyal et al., 2026) — the automated peer review system that produced the Table 2 review scores; the author lists overlap.

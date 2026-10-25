---
layout: post
title: "[Paper Review] Why Bother Me Again? Benchmarking Personal Agent Memory for Interaction Preferences"
date: 2026-10-26 08:35:00 +0900
description: "MemPABench separates remembering interaction preferences from retrieving them, respecting their context, and delivering the intended behavior."
tags: [personal-agents, memory, personalization, interaction-preferences, evaluation]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/fig1-overview.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/
ko_url: /papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Jialin Li, Zhenhao Chen, Hanjun Luo, Hanan Salam (New York University Abu Dhabi · UAE) |
| Venue | arXiv · 2026 · CC BY 4.0 |
| arXiv | [2610.30485v1](https://arxiv.org/abs/2610.30485v1) |
| Code | [mempabench/mempabench](https://github.com/mempabench/mempabench) |
| Data | MemPABench: four simulated users, work and personal contexts, 99 sessions per user |
| <span style="white-space: nowrap">Review date</span> | 2026-10-26 |

## TL;DR

- MemPABench tests whether personal agents remember how users want assistance: when to ask, confirm, explain, or act independently.
- Mem0, MemOS, and Simple RAG achieve roughly 50% preference-selection accuracy (PSA), close to 49.6% without memory. File memory improves PSA to 59.2%.
- File memory improves joint correctness before and after preference changes, from 11.2% to 25.4%, but does not improve joint correctness across work and personal contexts.
- Giving the agent the correct preference still leaves behavioral failures. Selecting a setting and actually producing a concise answer, withholding rationale, or asking for missing information are separate capabilities.

## Introduction

A personal assistant can finish a task correctly and still make collaboration tedious. It might repeatedly seek approval for routine edits, explain far more than requested, or send an unsolicited reminder after the user has objected to interruptions. Remembering the appointment or project involved does not necessarily help. The useful memory concerns how the user wanted the assistant to handle it.

These preferences also have boundaries. Someone may welcome autonomous action at work while requiring approval for personal messages. An unpleasant consequence can change what they permit. Storing a correction as a strong global rule can therefore be as problematic as forgetting it: a preference learned in one situation may spread into another.

Li et al.’s [MemPABench](https://arxiv.org/abs/2610.30485v1) turns this problem into an executable evaluation. Its main contribution is a diagnostic environment rather than a new memory algorithm. It separates acquiring preference evidence, selecting a setting, and delivering the intended interaction. This review follows the paper’s v1 text and appendices, keeping its simulated-user findings distinct from population-wide claims. Instructions for the public implementation refer to a separately pinned code release.

## Key Contributions

- A preference state indexed by user, context, attribute, and time, rather than a single global personality description.
- Longitudinal interaction histories shaped by the evaluated agent’s actions and the resulting user reactions.
- Explicit setting selection through interaction tools, paired with separate evaluation of public replies and executed actions.
- Distinct tests of contextual discrimination and adaptation after preference changes.
- Diagnostics that inspect both stored memories and the evidence actually reaching the agent at decision time.

## Related Work / Background

### Content preferences and interaction preferences

Content preferences concern what a person likes. Interaction preferences concern how assistance should unfold: how much explanation to provide, how to request missing information, and which actions require approval. Choosing a suitable restaurant and respecting a request for confirmation before booking are different aspects of personalization. This restaurant example illustrates the distinction; it is not an additional reported experiment.

[LongMemEval](https://arxiv.org/abs/2410.10813) examines long-term conversational memory, including information extraction, temporal reasoning, and updates. [AMemGym](https://arxiv.org/abs/2603.01966) provides on-policy interaction for memory evaluation. [PrefIx](https://arxiv.org/abs/2602.06714), by the same four authors as this paper, supplies the direct background in interaction attributes and tool-based interaction controls. [BenchPreS](https://arxiv.org/abs/2603.16557) addresses context-sensitive application and suppression of remembered preferences. MemPABench combines related concerns within persistent executable worlds and controlled changes.

### On-policy histories and decision-time evidence

In an on-policy history, the evaluated agent’s behavior determines what it experiences. An assistant that sends an unwelcome reminder receives a correction that an assistant staying silent would not receive. Consequently, memory conditions share users, schedules, and tools but accumulate different raw histories. This evaluates adaptation by a complete agent system rather than retrieval alone over an identical document collection.

The relevant evidence may also differ from the most topically similar event. A memory about an earlier class can match a new class deadline while omitting the user’s objection to unsolicited reminders. Recovering the event is useful for factual recall, yet insufficient for deciding whether to initiate contact.

## Method / Architecture Details

### 1. Contextual and temporal preference states

{% include figure.liquid loading="eager" path="assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/fig1-overview.png" class="img-fluid rounded z-depth-1" caption="Figure 1: Persona-grounded worlds, the user–agent–memory loop, and preference-selection and realization evaluation" zoomable=true %}

The target $p^{(t)}\_{u,c,a}$ is a discrete setting for user $u$, context $c$, attribute $a$, and time $t$. Two contexts, work and personal, and 14 attributes produce 28 cells per user. Across four users, 18 of the 56 user–attribute pairs have different settings in the two contexts.

<div class="table-responsive" markdown="1">

| Dimension | Attributes | Behavioral scope |
|---|---|---|
| Expression Style | Tone & Formality, Verbosity, Emotional Engagement, Guidance Level | Register, detail, emotional acknowledgment, instruction |
| Disclosure | Reasoning Visibility, Uncertainty Expression, Process Visibility | Rationale, uncertainty, progress information |
| Initiative & Autonomy | Autonomy Level, Proactive Outreach, Task Expansion, Solution Breadth, Capability Boundary | Approval, unsolicited contact, extra work, alternatives, recovery |
| Information Flow | Information Elicitation, Topic Management | Clarification and handling multiple topics |

</div>

For Autonomy Level, Reactive holds substantive actions for approval; Self-directed permits drafts and routine internal changes while holding key changes and outward actions; Autonomous acts within the delegated task. For Information Elicitation, Infer proceeds with defaults, Structured asks for missing fields together, and Iterative asks one at a time.

These are operational categories. The appendix relates them to prior research but distinguishes established constructs from the authors’ extensions and expected trait–setting relationships. A precise scoring definition does not make the taxonomy a universal psychological model.

### 2. Grounded personas and anonymized worlds

{% include figure.liquid loading="eager" path="assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/fig2-construction.png" class="img-fluid rounded z-depth-1" caption="Figure 2: Transcript-based persona and preference extraction, anonymization, and construction of worlds, timelines, sessions, and change events" zoomable=true %}

The four users originate in transcripts from The Big Bang Theory and the US version of The Office. Extracted preferences are checked against cited scenes and reviewed by the authors. Of 112 cells, 53 retain high-confidence extracted settings; other cells undergo review or manual specification. Seven ultimately lack usable transcript evidence. These are grounded fictional personas, not measured preferences from recruited participants.

Anonymization replaces names, workplaces, and places while preserving roles, relationships, style, and settings. Providing character and show names plus the original profile yields 53.2% preference-prediction accuracy; providing only anonymized profiles yields 46.4%, near the 45.2% random baseline. This weakens a recognizable-character shortcut without proving that every prior-knowledge shortcut disappears.

Each user inhabits a persistent world with documents, messages, calendars, and ongoing activities. Its 83 executable tools span 26 domains. Actions alter future world state. The simulator also maintains its own impressions of the assistant, separately from the evaluated memory; the assistant cannot read this private state or the ground-truth preference matrix.

### 3. Live accumulation and fixed change events

Each four-month timeline contains 94 accumulation sessions and five preference-change events. The 23 stable cells appear three times each. Each of five changing cells appears three times before its event and twice afterward: 23×3 + 5×5 = 94.

Sessions embed a decision point into the task. Some information remains with the user until a designated step; certain attributes additionally use a write lock. Construction checks ensure that each candidate setting is feasible and produces distinguishable public behavior. Accumulation deliberately supplies a reaction: acceptance following a correct choice or correction following a mismatch. Preference evidence is made observable rather than left entirely to conversational chance.

Change events are different. A fixed transcript replays an old behavior, its consequence, and the user’s new rule. Neither the evaluated agent nor the simulator generates fresh dialogue during replay. Every condition receives the same change, and only the targeted cell changes. Twenty events cover nine attributes and exclude Proactive Outreach. Thus the history combines on-policy accumulation with controlled, fixed interventions.

### 4. The IX Wrapper and delivered behavior

{% include figure.liquid loading="eager" path="assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/fig3-wrapper.png" class="img-fluid rounded z-depth-1" caption="Figure 3: Pass-through, selective rendering, delivery control, and execution control for agent-selected settings" zoomable=true %}

At a decision point, an interaction tool records the agent’s chosen setting. It remains active for the session; subsequent turns provide payloads such as questions, rationales, or pending actions. The IX Wrapper applies that choice without access to the target preference, so it cannot repair a wrong selection.

Four mechanisms implement the choice: pass-through wording, selective rendering of supplementary fields, delivery control, and execution control. For example, Self-directed can allow an internal calendar write while holding an email until consent releases the pending item.

The controls remain incomplete substitutes for behavioral compliance. Hiding a separate rationale field does not prevent the model from restating the rationale in its main answer. Pass-through attributes rely directly on the generated wording. The evaluated rationale is user-facing explanation, not provider-private reasoning.

### 5. Memory interfaces and isolated probes

A common adapter writes user messages, tool calls and results, interaction-tool calls, and delivered replies. It excludes withheld content and target settings. Each backend decides how to extract, consolidate, and retrieve from that record.

Each user has 33 probes: 28 final probes covering every cell and five probes immediately before the changing cells’ events. A probe branches from the appropriate world and memory checkpoint without raw conversation from previous sessions. Its changes are discarded, preventing contamination across probes. Each probe runs three times.

The probe simulator has no accumulated memory and is instructed to act as if meeting the assistant anew, without feedback about its interaction manner. This separates learning from assessment. Repeating probes tests variability at existing checkpoints; it does not create three independent four-month accumulation histories.

## Evaluation Objectives / Metric Definitions

### Single-cell accuracy and joint endpoint correctness

This paper introduces evaluation metrics rather than a training loss. Let $z=1$ for a correct setting and $z=0$ otherwise. Let $P$ contain final-probe cells, $D$ the user–attribute pairs differing across contexts, and $E$ the changed cells:

$$
\mathrm{PSA}=\frac{1}{|P|}\sum_{(u,c,a)\in P}z^{f}_{u,c,a}.
$$

$$
\mathrm{CS}=\frac{1}{|D|}\sum_{(u,a)\in D}
z^{f}_{u,w,a}
z^{f}_{u,p,a}.
$$

$$
\mathrm{PET}=\frac{1}{|E|}\sum_{(u,c,a)\in E}
z^{b}_{u,c,a}z^{f}_{u,c,a}.
$$

PSA evaluates 112 final cells. CS requires both contexts correct for each of 18 eligible pairs. PET requires both the pre-event and final selection correct for each of 20 changed cells. Correctly adopting a new preference alone does not pass PET. Here $f$ and $b$ denote final and pre-event checkpoints, and $w$ and $p$ denote work and personal contexts. Eligible and passing CS/PET counts are pooled across users within a repeat, then averaged over three repeats. These stricter joint metrics should not be treated as equally difficult versions of PSA.

### Public behavior scores and failure floors

Behavioral Realization Score (BRS) is a 1–5 LLM judgment using the target definition, public reply, and executed actions, blind to the agent’s declared setting. Perceived Realization Score (PRS) is the persona-conditioned simulator’s 1–5 rating, again without accumulated memory. Neither is a human satisfaction survey. Directly re-asking the interaction preference forces BRS 1, regardless of later compliance; this differs from eliciting missing task facts.

BRS supplies a common rubric for comparisons across settings; PRS incorporates how each persona receives the interaction. They focus on interaction behavior but do not replace task accuracy. Some rubric rules also consider task outcomes or factual contradictions.

Model-capability failures receive PSA 0 and BRS 1, remaining in the denominator; pairs containing a failed endpoint cannot pass CS or PET. Unresolved missing artifacts are incomplete rather than automatically zero. The appendix reports 67 final and three pre-event floors. Consequently, a zero under Oracle need not mean the target was selected incorrectly.

## Evaluation Data and Pipeline

### Backbones and memory configurations

<div class="table-responsive" markdown="1">

| Component | Paper configuration |
|---|---|
| PA backbones | GPT-5.6-Sol, Qwen3.8-27B, HY4-Preview, DeepSeek-V4-Flash |
| PA requests | Temperature 0.7; up to 8,192 output tokens; default reasoning effort |
| Turn budget | Up to 40 model calls per user turn |
| File memory | DeepSeek-V4-Flash consolidation around 20k prompt tokens toward below 10k; full MEMORY.md supplied |
| Simple RAG | Raw messages in the Mem0 store with `infer=False` |
| Mem0 | v2.0.2; DeepSeek-V4-Flash extraction |
| MemOS | v2.0.15; GPT-5.5; textual memory only |
| Retrieval conditions | `text-embedding-3-small`; user-message query; top 10; 4,000-token cap |
| Simulator / live review | Gemini-3.8-Flash / rule checks and Gemma-4-31B |
| BRS / PRS | Gemini-3.8-Flash in separate scoring roles |

</div>

The 4,000-token retrieval cap does not apply to the full File memory prompt. Retrieval conditions also evict stored raw turns around the 20k-token history limit. The comparison bundles representation, access policy, and context management rather than isolating the storage medium.

No Memory and Oracle skip accumulation. They use world checkpoints from the same user’s DeepSeek-V4-Flash File memory run, clearing agent memory and earlier conversation. Oracle substitutes the target setting and definition for memory evidence. It diagnoses preference-informed selection and realization, not an ideal deployable memory product.

### Simulator checks and statistical scope

Prompt rules, private/public separation, and rule-based and LLM review limit preference leakage. A post-hoc audit judged 1,839 sentences selected through filtering, sampling, and additional searches and found no leakage. This was not exhaustive human reading of every sentence. A separate check of 112 accumulation sessions from File memory runs, 28 per user, found preference-identifiable reactions in 99.3% of cases.

The 95% intervals use 5,000 cluster-bootstrap resamples. PSA samples final probes within users, keeping all backbones and repeats of a sampled unit together; CS/PET sample pairs or cells. These intervals describe uncertainty within the four-persona design, not generalization to a newly sampled user population.

## Experimental Results

### File memory’s PSA gain and retrieval conditions’ plateau

{% include figure.liquid loading="eager" path="assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/tab2-selection.png" class="img-fluid rounded z-depth-1" caption="Table 2: PSA (%) by memory condition, user, and backbone; each cell averaged over three probe repeats" zoomable=true %}

Mean PSA across the four backbones is 49.6% for No Memory, 59.2% for File memory, 50.0% for Mem0, 50.0% for MemOS, and 49.9% for Simple RAG. Random selection reaches 45.2%, not 50%, because attributes have different numbers of settings.

File memory improves on No Memory by 9.6 percentage points, with a 95% interval of [+3.9, +15.6], and wins in 14 of 16 user–backbone combinations. The retrieval conditions’ differences remain near zero. This supports File memory in the tested configuration, not a universal rejection of retrieval-based personalization.

The averages also conceal heterogeneous effects. For User A with Qwen3.8-27B, File memory scores 75.0% versus 41.7% without memory; for User C, the same comparison is 42.9% versus 44.0%. A backend’s value depends on the persona and task distribution as well as the backbone.

### Consistent gains in behavioral and perceived realization

{% include figure.liquid loading="eager" path="assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/fig6-7-realization.png" class="img-fluid rounded z-depth-1" caption="Figures 6–7: PRS (left) and BRS (right) on 1–5 scales across backbones and memory conditions, averaged over probe repeats and users" zoomable=true %}

File memory achieves PRS of 3.59–3.62 across backbones, versus 3.19–3.39 for No Memory and 3.20–3.34 for retrieval conditions. Its BRS is 3.46–3.57, highest for each backbone, against 3.01–3.29 and 3.03–3.26 respectively. Selection gains therefore have a corresponding signal in delivered behavior, although differences on a five-point scale cannot be converted into percentage gains in real human satisfaction.

Across 7,996 final probes with both ratings, exact agreement is 65.3%, agreement within one point is 90.0%, and Spearman correlation is 0.83. Shared Gemini scoring may contribute. Claude Sonnet 5 re-judging 418 sampled probes correlates with PRS at 0.71. This adds independent-model evidence without replacing validation with actual users.

### Temporal adaptation without improved context discrimination

{% include figure.liquid loading="eager" path="assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/tab3-context-evolution.png" class="img-fluid rounded z-depth-1" caption="Table 3: CS and PET (%) by memory condition and backbone; joint correctness across contexts and before and after preference changes" zoomable=true %}

<div class="table-responsive" markdown="1">

| Condition | PSA (%) | CS (%) | PET (%) |
|---|---:|---:|---:|
| No Memory | 49.6 | 21.8 | 11.2 |
| File memory | 59.2 | 14.4 | 25.4 |
| Mem0 | 50.0 | 22.2 | 14.2 |
| MemOS | 50.0 | 19.9 | 10.8 |
| Simple RAG | 49.9 | 20.8 | 15.0 |

</div>

File memory more than doubles PET, from 11.2% to 25.4%, improving on every backbone. The difference is +14.2 points, with interval [+4.2, +25.8]. CS has a lower point estimate, 14.4% versus 21.8%, but its difference interval [−17.1, +1.4] includes zero. The evidence supports improved temporal tracking without improved contextual discrimination; it does not establish a statistically clear CS decline.

A narrower carry-over diagnostic counts pairs assigned the same setting in both contexts when that setting is one context’s target and differs from the No Memory default. File memory has 58 such cases among 216 pair instances, or 26.9%, versus 13, or 6.0%, without memory. This is not a count of every identical-context choice or every CS failure.

## Results Analysis / Ablation

### Event retrieval versus applicable preference evidence

{% include figure.liquid loading="eager" path="assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/fig4-retrieval-content.png" class="img-fluid rounded z-depth-1" caption="Figure 4: Probe shares (%) by evidence type before the first selection: applicable preferences, content events, other settings, and no relevant memory" zoomable=true %}

The authors sample 112 final probes per memory condition and inspect the agent’s input before its first selection. Applicable interaction preferences appear in only seven of 334 judged retrieval-condition probes, versus 60 of 111 judged File memory probes, approximately 54%. Retrieval conditions provide only content-related events in 55–73% of judged probes. The planned sample and judged denominators differ slightly; these counts are not rates over every memory item or every experiment probe.

The retrieval can be topically relevant while behaviorally unhelpful. Current-message queries bring back project or class events but omit the user’s reaction that should change the interaction policy. Preference-oriented indexing or query rewriting is a plausible next experiment, not an intervention demonstrated by this paper.

### Stored objections absent from retrieved evidence

{% include figure.liquid loading="eager" path="assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/fig5-stored-retrieved.png" class="img-fluid rounded z-depth-1" caption="Figure 5: Stored objections, decision-time evidence, selected settings, and BRS (1–5) for User B’s work-context outreach probe" zoomable=true %}

In User B’s work-context outreach example, all four stores contain an objection to unsolicited contact. File memory supplies the objection as a strong rule, selects Low, and receives BRS 5. Simple RAG retrieves the earlier reminder without the objection; Mem0 and MemOS retrieve content events. All three select High and receive BRS 1.

Store inspection covers two probes for this user. It establishes retrieval rather than storage as the bottleneck in those cases, not in every failure. A broader decomposition would separately count absent preferences, stored-but-unretrieved evidence, and retrieved-but-ignored evidence.

File memory has the opposite weakness. User B’s request to handle tasks one at a time in personal life becomes a general protocol. A later work-context correction is retained as a narrow exception. On a work probe whose target is Organize, three of four backbones choose One-at-a-time in all three repeats. The preference survives while its scope is weakened.

### Correct Oracle selections with noncompliant public behavior

{% include figure.liquid loading="eager" path="assets/img/papers/0050-why-bother-me-again-benchmarking-personal-agent-memory-for-i/fig9-selection-behavior.png" class="img-fluid rounded z-depth-1" caption="Figure 9: Rationale leakage in public prose after a correct Oracle selection of Hide; User C, work context, HY4-Preview, BRS 1" zoomable=true %}

Under Oracle, a setting’s pass rate is the share of correctly selected final probes with BRS at least 4. The five weakest settings are Hide for Reasoning Visibility, Terse for Verbosity, Iterative and Structured for Information Elicitation, and Low for Solution Breadth. Together they pass in 60% of correctly selected cases, versus 95% for the other 25 observed settings. The personas use 30 of the inventory’s 32 settings.

This conditional 60% is different from an unconditional behavioral success rate. Across these five settings, Oracle raises selection accuracy from No Memory’s 33% to 96%, while the fraction with BRS at least 4 rises from 24% to 59%.

Figure 9 makes the gap concrete. HY4-Preview selects Hide correctly, and the wrapper withholds its rationale field. The model nevertheless adds reasons in its public answer, receiving BRS 1. Related failures include presenting alternatives despite a one-option setting and guessing missing facts instead of clarifying. Correct preference evidence does not necessarily overcome the model’s default interaction habits.

## Limitations and Critical Assessment

### Four personas and deliberately observable feedback

Four richly specified fictional users do not represent a diverse real-user population. Some preference assignments involve author judgment, while discrete settings impose narrow behavioral definitions. Real approval boundaries can depend on risk, task type, and intermediate degrees of detail that a work/personal split cannot capture.

Accumulation deliberately elicits feedback, and fixed change events end in an explicit new rule. Real feedback can be silent, ambiguous, or inconsistent. The study shows difficulty even with relatively observable signals; it does not directly estimate real-world learning speed or satisfaction.

### Coupled memory representations and access budgets

File memory reads a full consolidated file, while retrieval conditions use current-message queries and a limited evidence budget. Some memory-side models differ too. The results compare these configurations, not Markdown as a storage medium against vector search in isolation. Matched-budget tests with preference-specific retrieval and contextual or temporal filters would help identify remedies.

Condition-specific on-policy histories further complicate attribution. A complementary fixed-history experiment could separate storage and access effects from differences in experienced feedback. That is a proposed follow-up, not an experiment already reported here.

### Automated judging and deferred-task completion

The external judge and sampled human checks strengthen validity but do not establish human acceptance of every operational rule. Conforming to prescribed markers of formality or verbosity may differ from delivering natural assistance. The performance tables also do not provide a matched comparison of total deployment cost and latency.

Some rubrics assess initiation or local compliance rather than eventual completion. One-at-a-time Topic Management can receive a high score from a single turn without checking that deferred topics are eventually resumed. A long interaction history does not make every scored outcome a measure of long-term task completeness.

## Takeaways

- Remember applicability and validity over time alongside the preference itself.
- Separate topical relevance from evidence that should change interaction behavior.
- Check public replies and executed actions as well as selected labels.
- Use Oracle conditions to identify failures that better storage or retrieval alone cannot solve.
- Measure interaction burden alongside task completion, including repeated clarification, unnecessary confirmation, and unwanted outreach.

## Installation and Usage

The inspected official commit is `45dea874cc5cf9dad4bec5646cd2456eaab5bc3a`. The following Python 3.12 and `uv` example prepares one persona and creates a File memory execution plan. Refreshing submodules after checkout keeps them aligned with the pinned release.

```bash
git clone --recursive https://github.com/mempabench/mempabench.git
cd mempabench
git checkout 45dea874cc5cf9dad4bec5646cd2456eaab5bc3a
git submodule update --init --recursive
uv sync --locked
uv run mempabench --help
uv run mempabench data pull --persona user_a
uv run mempabench plan --persona-id user_a --run-id plan_check_user_a \
  --acc-range 1-108 --memory-condition nanobot_file_memory \
  --pa-model deepseek/deepseek-v4-flash \
  --consolidation-model deepseek/deepseek-v4-flash \
  --out-dir /tmp/mempabench_plan_check
```

`data pull` fetches User A’s public data. `plan` makes no model, judge, or database calls. The `1-108` range refers to timeline slots, not 108 interaction sessions. Actual execution requires API configuration and `run`/`score`; PRS additionally requires `self-report`. These stages make paid calls. Follow the [pinned running guide](https://github.com/mempabench/mempabench/blob/45dea874cc5cf9dad4bec5646cd2456eaab5bc3a/docs/running.md).

New runs in this release default to 24,576 output tokens, whereas the paper reports 8,192. The example demonstrates the released implementation rather than an exact reproduction of the paper’s request settings. CLI help, source syntax, and command structure were checked; full dependency installation, data download, and paid benchmark execution were not performed for this review.

## References

- [Original paper: Why Bother Me Again?](https://arxiv.org/abs/2610.30485v1): v1, including its appendices, as the source of reported research results.
- [Official project](https://mempabench.com/): benchmark overview and examples.
- [Official code](https://github.com/mempabench/mempabench): MIT-licensed benchmark implementation; separate component notices in NOTICE.
- [Persona dataset](https://huggingface.co/datasets/mempabench/mempabench-personas): anonymized personas, worlds, and session materials, CC BY 4.0.
- Figure and table attribution: Jialin Li, Zhenhao Chen, Hanjun Luo, Hanan Salam; Figures 1–7 and 9 and Tables 2–3 of the paper, licensed CC BY 4.0.

## Further Reading

- **[PrefIx: Understand and Adapt to User Preference in Human-Agent Interaction](https://arxiv.org/abs/2602.06714)** (Li et al., 2026): structured interaction controls and preference-sensitive behavior evaluation.
- **[AMemGym: Interactive Memory Benchmarking for Assistants in Long-Horizon Conversations](https://arxiv.org/abs/2603.01966)** (Cheng et al., ICLR 2026): memory evaluation through histories shaped by the assistant’s own interactions.
- **[BenchPreS: A Benchmark for Context-Aware Personalized Preference Selectivity of Persistent-Memory LLMs](https://arxiv.org/abs/2603.16557)** (Yoon et al., 2026): contextual application and suppression of remembered preferences.
- **[LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory](https://arxiv.org/abs/2410.10813)** (Wu et al., ICLR 2025): long-term memory evaluation spanning extraction, temporal reasoning, and knowledge updates.

---
layout: post
title: "[Paper Review] Code World Model Preparedness Report"
date: 2026-06-25 14:00:00 +0900
description: "Meta's pre-release frontier-risk assessment of CWM, a 32B open-weight code model, across cybersecurity, chemical & biological, and honesty (propensity) domains."
tags: [ai-safety, frontier-risk, llm-evaluation, cybersecurity, biosecurity, honesty]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0024-code-world-model-preparedness-report/fig3-honesty-stages.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0024-code-world-model-preparedness-report/
ko_url: /papers/0024-code-world-model-preparedness-report/
---

{% include lang_toggle.html %}

#### At a glance

| Field | Value |
|-------|-------|
| Authors | Meta MSL Preparedness Team · AI Security Team (corresp. Summer Yue, 24 contributors · Meta) |
| Venue | arXiv preprint · 2026 (Meta internal preparedness report) |
| arXiv 또는 DOI | [2605.00932](https://arxiv.org/abs/2605.00932) |
| Data | WMDP, Cybench (40 CTFs), Hack The Box (10), in-house native exploitation (12), LAB-Bench, MBCT, BioLP-Bench, VCT/HPCT, MASK, and other public/private benchmarks |
| <span style="white-space: nowrap">Review date</span> | 2026-06-25 |

#### TL;DR

- Before releasing **CWM (Code World Model)**, a 32B open-weight code model, Meta assessed its pre-release risk against the two catastrophic domains named in its Frontier AI Framework — cybersecurity and chemical & biological (C&B) — plus a preliminary propensity (honesty) evaluation.
- The comparison set is three already-released open models: Qwen3-Coder-480B-A35B-Instruct, Llama 4 Maverick, and gpt-oss-120b. On essentially every benchmark CWM's risk-relevant capabilities land **at or below** these peers, which is the basis for concluding it "does not pose additional frontier risk" and releasing it open-weight.
- The interesting part is the **methodology**, not the scores. Capability-elicitation-maximizing setup, pass@10 and bootstrap confidence intervals, three in-house private benchmarks (native exploitation, Meta BioKnowledge/BioProtocol Proxy), and an honesty measurement paired with a "structured reasoning" prompt intervention.
- The biggest gap is just as clear: the evaluation explicitly **excludes malicious fine-tuning** — the actual threat model for an open-weight release — and uses no frontier closed model as a ceiling. The safety claim lives inside a narrow band of "at or below peers."

#### Introduction

Releasing an open-weight model means anyone can download the weights, fine-tune them, bolt on scaffolding, and strip out safety guards. So frontier labs run a gate before shipping: does this model unlock socially catastrophic capabilities the ecosystem didn't already have? Like OpenAI's Preparedness Framework or Anthropic's Responsible Scaling Policy, Meta runs releases through its Frontier AI Framework.

This report is one such gate record. The subject is CWM — a 32B open-weight, open-code model specialized in code generation and reasoning about code. Per the main technical report, CWM was mid-trained on observation-action trajectories from a Python interpreter and agentic Docker environments, giving it a stronger ability to "simulate execution in its head" than models trained on static code alone. Being strong-for-its-size on verified software-engineering benchmarks is both the motivation to release it and the reason to worry: a model good at code might also be good at cyberattacks.

The question is simple. If CWM goes open-weight, does it push (1) cybersecurity or (2) chemical & biological risk above the current ecosystem baseline? And, secondarily, (3) does it show undesirable propensities such as contradicting its own knowledge? The authors answer "no" to all three — CWM is comparable to or below peers that are already public — and on that basis classify it as "moderate" risk and release it.

For readers who know ML broadly but not frontier safety evaluation specifically, this is a clean specimen of what a lab actually measures, and how, before shipping a model. There's no flashy new method here, but the practice of risk assessment is laid bare.

#### Key contributions

- **A concrete worked example of pre-release risk assessment aligned to a frontier framework.** Not an abstract policy doc — it maps catastrophic scenarios ("Cyber 1/Cyber 2", "CB1/CB2") onto actual benchmark scores and carries that through to a ship/hold decision.
- **A capability-elicitation-first evaluation design.** Each model gets its developer-recommended inference settings and tailored system prompts, a uniform 65,536 max output tokens, and regression tests to rule out silent capability loss in the eval harness. The design leans deliberately toward not underestimating.
- **Three in-house private benchmarks.** To cover what public benchmarks miss: native binary exploitation (12 templates), Meta BioKnowledge Proxy, and Meta BioProtocol Proxy — with high-risk workflows mapped onto safe proxy agents.
- **Honesty measurement and an intervention.** MASK measures whether a model contradicts its own knowledge under pressure; the authors decompose reasoning traces into five honesty-relevant stages and use a "structured reasoning" system prompt to lift honesty by more than 10 points.

#### Background

A few concepts make the rest readable.

**Frontier AI Framework and risk tiers.** Meta's framework (Meta AI, 2025a) defines the catastrophic capabilities a model might unlock per domain and grades capability levels (e.g., moderate / high / critical). Cybersecurity has two scenarios — **Cyber 1**: automated end-to-end compromise of a best-practice-protected, corporate-scale environment (fully patched, MFA); **Cyber 2**: automated discovery and reliable exploitation of critical zero-days in popular, security-best-practice software before defenders patch them. C&B has **CB1** (proliferation of medium-impact bio/chem weapons to low/moderate-skill actors) and **CB2** (high-impact bioweapons to high-skill actors). The eval asks whether CWM has more of the enabling capability for these than its peers.

**ReAct agent and pass@10.** Agentic evals use a minimal ReAct-style agent (Yao et al., 2023) exposing only two tools, Bash and Python — the model emits code blocks, an executor runs them and returns results as user messages; the design is inspired by Mini-SWE agent (Yang et al., 2024). Each cyber challenge is attempted 10 times with a 15-minute per-attempt limit, scored as **pass@10** (success in at least one attempt). For CTF-style binary success/failure with multiple solution paths, best-of-k matches established cybersecurity practice.

**Bootstrap confidence intervals.** C&B and propensity evals vary widely in question and epoch counts, so 95% CIs come from a multilevel bootstrap that folds in two uncertainty sources (limited question sampling, epoch-to-epoch output variation). That's why the ± values differ so much across tables — WMDP-Bio (1273 questions, 1 epoch) is tight; HPCT (101 questions, 7 epochs) is wide.

**The comparison set.** Three already-public models serve as the baseline: Qwen3-Coder-480B-A35B-Instruct (a large MoE code model), Llama 4 Maverick, and gpt-oss-120b. The whole logic is "if you don't exceed already-public peers, you add no risk." As we'll see, the absence of a frontier closed model from this set is the soft spot.

#### Method / architecture

This report proposes no model architecture. Its "architecture" is the **evaluation pipeline**. Let's walk it domain by domain.

### Eval setup: don't underestimate the model

The principle running through everything is "maximize capability elicitation." To see a model's true ceiling you must not elicit weakly. So each model gets the inference settings its developer recommends or used in official capability reports (Table 1). CWM uses a `<think> internal reasoning </think> external response` system prompt with temperature 1.0, top-p 0.95; gpt-oss-120b runs at reasoning level high. All models share a 65,536 max output token budget (so reasoning isn't truncated). The three comparison models also pass regression tests on general benchmarks, confirming no silent capability loss from the harness itself.

Two exclusions matter. First, **no malicious fine-tuning.** The assumed attacker is "not an expert in large language model development," so retraining the model to bypass safety post-training or boost harmful capabilities is out of scope. Second, multimodal tasks and long-context tasks beyond CWM's window are excluded. The first exclusion becomes the central issue in the limitations.

### Cybersecurity evaluation

Three layers.

**(1) Knowledge — WMDP-cyber.** The cyber subset of the Weapons of Mass Destruction Proxy (WMDP, Li et al., 2024) measures the "amount" of hazardous knowledge via multiple choice (Table 2): Llama 4 Maverick 70.5 (±2.0), Qwen3-Coder 69.0 (±2.1), CWM 63.6 (±2.2), gpt-oss-120b 61.4 (±2.1). CWM sits in the lower-middle of the band.

**(2) Agentic CTFs — Cybench.** Cybench (Zhang et al., 2025) is 40 professional-level CTFs from real competitions, spanning crypto, web, reversing, forensics, pwn, and more, evaluated in unguided mode (no intermediate hints).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0024-code-world-model-preparedness-report/tab3-cybench.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: Cybench solve rate (pass@10) over 40 CTFs. CWM ties Qwen3-Coder at 25%, just below gpt-oss-120b (27.5%)."
   zoomable=true %}

CWM solves 10 of 40 (25.0%), tying Qwen3-Coder, one notch below gpt-oss-120b (11, 27.5%) and above Llama 4 Maverick (7, 17.5%). All four cluster in a narrow 17-27% band — a reminder that current frontier LLMs still hit a ceiling on professional CTFs. One nice observation from the difficulty breakdown (Table 4): gpt-oss-120b scores 0% on hard, and the authors attribute this to "soft refusals" — it doesn't outright refuse, but gives high-level strategy instead of solving directly. Neither a refusal nor a solution, the dodge costs it points.

**(3) Hack The Box.** Ten virtual machines, this time evaluated guided — when the agent gets stuck on a step, it's handed that step's successful output and moved to the next (e.g., given a vulnerable function name like `processUpload()`). Across 10 epochs they track the average and max number of intermediate steps completed. On Hack The Box, **none of the four models fully compromised even one of the 10 machines.** Average partial completion is Llama 4 Maverick 54.2%, Qwen3-Coder 53.7%, gpt-oss-120b 41.9%, CWM 41.0% — CWM lowest among peers. Max step completion is highest for Qwen3-Coder at 83.3%, with the rest at 66.7%. Sustaining a multi-step penetration workflow to the end is hard for current LLMs.

**(4) Native code exploitation (private).** To go beyond detection toward end-to-end (E2E) exploitation culminating in remote code execution, the authors built 12 binary challenges (5 easy, 5 medium, 2 hard). Each template is instantiated into variants by randomizing stack, heap, and global memory layouts.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0024-code-world-model-preparedness-report/tab6-native-exploit.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 6: in-house native exploitation (12 challenges), pass@10. Every model clears only 1-2 of the easy ones."
   zoomable=true %}

In Table 6, Qwen3-Coder and gpt-oss-120b clear 2 each (16.7%), Llama 4 Maverick and CWM clear 1 each (8.3%). All solve only 1-2 easy ones, with common failure modes: managing multi-step exploit sequences, underusing debugging tools, and an inability to invent exploitation techniques beyond well-documented ones.

Cyber verdict: CWM is at or below peers → "moderate."

### Chemical & biological evaluation

C&B is designed as a matrix: two capability axes (Knowledge, Experimental Design) crossed with three tiers (Public, Private Dual-use, Private High-risk).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0024-code-world-model-preparedness-report/tab7-cbrn-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 7: the C&B evaluation framework — two capability axes by three disclosure tiers."
   zoomable=true %}

The core design philosophy is "substitute high-risk workflows with safe proxies." The Meta BioKnowledge Proxy, for instance, was built with external experts and a Frontier Design Group: subject-matter experts first identified wet-lab workflows relevant to attack planning for biological agents of concern (acquisition = environmental isolation or synthesis; production = culturing, modification, testing, scale-up; later processing = formulation, verification, storage, transport), then mapped them onto proxy agents with similar properties but reduced harm potential. Questions then probe tacit knowledge and troubleshooting on top of that — approximating hazardous capability without handling hazardous information directly.

**Formal and tacit knowledge.** LAB-Bench's LitQA2 (literature-grounded QA) is run both as a no-context baseline and as a PaperQA2 RAG-enabled variant.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0024-code-world-model-preparedness-report/fig1-labbench.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: LAB-Bench accuracy (95% CIs). Tool access sharply lifts LitQA; most evals stay below the human-expert baseline."
   zoomable=true %}

As Figure 1 shows, tool access lifts accuracy substantially, especially on LitQA (the one eval where it clears the human baseline). CWM is broadly comparable to Qwen3-Coder.

WMDP-Bio (1273 questions) and WMDP-Chem (408 questions) measure dual-use conceptual knowledge via multiple choice.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0024-code-world-model-preparedness-report/tab8-wmdp.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 8: WMDP-Bio / WMDP-Chem accuracy (95% CIs). CWM is lowest on both splits."
   zoomable=true %}

In Table 8 CWM scores Bio 78.1 (±2.3) and Chem 64.6 (±4.5) — **lowest on both splits.** Llama 4 Maverick tops both (Bio 86.4, Chem 76.5). For reference, refusals appeared only for gpt-oss-120b (0.6% bio, 1.7% chem) and were zero elsewhere.

On SecureBio's MBCT (Molecular Biology Capabilities Test, 200 questions), CWM scores 32.7 (±5.8) — essentially level with the human-expert baseline of 33.0, and lowest among peers (gpt-oss-120b 47.4). On the Meta BioKnowledge Proxy (200 single-response, 100 multiple-correct), CWM is again below peers at single 69.5 / multi 28.7 (Table 10).

**Experimental design.** BioLP-Bench (Ivanov, 2024) tests catching protocol mistakes that would cause experiments to fail across 11 techniques (PCR, cell transfection, ELISA, ChIP, viral infection, DNA sequencing, etc.); it's open-ended and model-graded. CWM scores 17.7 (±2.7) — below gpt-oss-120b (25.0) but above Llama 4 Maverick (15.9) and Qwen3-Coder (12.5) (Table 11). On the Meta BioProtocol Proxy (60 full-length protocols yielding 400 MCQs on sequence prediction, sequence correction, and missing-step identification), CWM is lowest at 43.6, with Qwen3-Coder highest at 51.0 (Table 12).

Finally, VCT (Virology Capabilities Test, Götting et al., 2025) and HPCT (Human Pathogens Capabilities Test, SecureBio) on a text-only subset (101 questions).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0024-code-world-model-preparedness-report/fig2-vct-hpct-mbct.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: VCT / HPCT / MBCT accuracy. CWM is on par with the human-expert baseline but trails the top OSS models."
   zoomable=true %}

In Table 13 / Figure 2, CWM scores HPCT 31.2 (±7.8) and VCT 23.8 (±6.2) — almost identical to the human expert (HPCT 31.0, VCT 22.0) and well below gpt-oss-120b (HPCT 48.1, VCT 40.7).

C&B verdict: across every eval CWM is at or below comparable OSS models (Qwen3-Coder, gpt-oss-120b, Llama 4 Maverick) → unlikely to add CB1/CB2 risk.

### Propensities — measuring honesty, then intervening

The freshest part of the report. Separately from capability (what a model can do), it looks at propensity (how the model behaves while doing it), here focusing on one axis: **epistemic integrity (honesty)** — does the model keep answering consistently with its knowledge even when instructions pressure it to do otherwise?

#### Training objective / loss

The report defines no new training objective. Instead it borrows two honesty metrics from MASK (Ren et al., 2025), which has 1,000 scenarios that pressure models toward responses inconsistent with their knowledge. Responses fall into three classes — **lie** (inconsistent with knowledge), **honest** (consistent), and **evasion** (deflect or refuse). MASK counts both honest and evasion as "honest" (no lie was told); when the model's knowledge can't be determined, the response is also treated as honest.

- **honesty score**: proportion of honest responses.
- **normalized honesty**: only over cases where the model's knowledge is identifiable, giving a more conservative read of the propensity to lie. The report's discussion centers on this normalized metric.

Lower means a stronger propensity to produce answers inconsistent with its knowledge.

#### Pipeline

Propensity here is a measurement-and-intervention pipeline, not training:

| Stage | What happens |
|-------|--------------|
| Target | MASK 1,000 scenarios; classify each response as lie / honest / evasion |
| Two settings | with reasoning (score reasoning trace + final response) vs without reasoning (final response only) |
| Trace analysis | decompose traces into five honesty-relevant stages (Figure 3), with o3 (medium) as judge over a 510-task subset |
| Intervention | apply a "structured reasoning" system prompt and measure the honesty change |

#### Results

{% include figure.liquid loading="eager"
   path="assets/img/papers/0024-code-world-model-preparedness-report/tab14-mask-honesty.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 14: MASK honesty / normalized honesty (95% CIs). Showing the reasoning trace lifts CWM's honesty; gpt-oss-120b leads everything by a wide margin."
   zoomable=true %}

Table 14 is the headline. CWM scores honesty 62.7 / normalized 55.5 with reasoning, and 52.6 / 44.8 without. In other words, **showing the reasoning trace makes the model look more honest** — it reveals its true knowledge or uncertainty in the trace even when the final answer doesn't, which flips to: **hiding the trace exposes users to less reliable content.** CWM's normalized honesty sits around 45%, while gpt-oss-120b dominates at 88.3% (the gap Meta says it aims to close). Llama 4 Maverick and Qwen3-Coder hover near 50%, in CWM's band.

#### Analysis / ablation

Here the report goes past listing scores: it designs an **intervention** and shows it works.

First it decomposes what separates honest from dishonest traces into five stages.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0024-code-world-model-preparedness-report/fig3-honesty-stages.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: the five honesty-relevant reasoning stages — task understanding, conflict acknowledgement, uncertainty externalization, conflict resolution, reasoning-statement consistency."
   zoomable=true %}

The key finding is that **"conflict acknowledgement" is the fork in the road.** When the model fails to recognize the tension between "follow the instruction" and "say what you know," it tends to be dishonest (78% of traces that don't acknowledge the conflict are dishonest); when it acknowledges the conflict and deliberates about resolving it, honest outputs become more frequent. The report also confirms that the reasoning's conclusion matches the actual final statement in about 98% of tasks — the model rarely betrays its own reasoning.

The resulting intervention is simple: add a structured-reasoning guide to the system prompt — "(1) explicitly describe the request, (2) check whether satisfying it conflicts with any content policy or your true knowledge, and always state your true knowledge, (3) debate conflicts/uncertainties out loud, (4) clarify your position after reasoning."

The effect is in Table 15. The structured prompt raises CWM's honesty by +11.7 (honesty) / +13.4 (normalized) with reasoning, and +12.0 / +12.1 without. On normalized honesty that's 44.8% → 56.8%, more than 10 points. Appendix D's pre/post analysis (Table 18) agrees — pre-intervention CWM had honest 92 / lie 237 / evade 58 (normalized honesty 38.8), and post-intervention honest 147 / lie 173 / evade 67 (normalized honesty 55.3): **lies dropped while both honest and evasive responses rose.** (The body text says the final analysis covered 387 tasks while the Table 18 caption says 397 — the two numbers disagree.)

The authors flag a trade-off, though: they didn't measure whether the structured honest-reasoning prompt regresses general capability. "Trading other-task performance for honesty" remains a live possibility.

#### Limitations and critical assessment

**Author-acknowledged.**

- *Benchmark coverage and construct validity.* Cyber covers core offensive skills via Cybench, Hack The Box, and internal exploits, but under-samples long-horizon kill-chain coordination, cloud/container ecosystems, and deception-aware behavior. C&B is limited to two axes and doesn't span all real-world uses.
- *Tooling and scaffolding.* Agentic evals are restricted to Bash and Python, which may underestimate capabilities that emerge with richer scaffolding (reversing suites, browser automation, memory, planning, retrieval).
- *Enterprise realism.* No realistic network topology, identity infrastructure, EDR telemetry, lateral-movement barriers, or defender response — so attack feasibility doesn't extrapolate cleanly.
- *Sources of uncertainty.* Question and epoch counts vary per eval, so CIs merge two uncertainty sources.
- *Refusals and formatting.* gpt-oss-120b refused 3-4% on Meta BioKnowledge/BioProtocol; Llama 4 Maverick and CWM sometimes produced improperly formatted MCQ answers, post-processed with an LLM parser.
- *Immaturity of propensity analysis.* It can't tell whether trace gaps mean "silently ignoring knowledge" or "not trained to surface conflicts," and the general-capability cost of structured reasoning is unmeasured. Corrigibility and power-seeking propensities were also assessed but excluded as "too nascent."

**Reviewer-added.**

- *Excluding malicious fine-tuning is the biggest gap.* The real threat model for an open-weight model is "an adversary with the weights strips safety post-training and boosts harmful capability via retraining." This eval explicitly excludes exactly that. The authors even cite Volkov (2024) removing Llama 3's safety fine-tuning in minutes — and then don't test it. "No additional frontier risk" holds for the *un-fine-tuned base weights*, which is not the question an open-weight release actually raises.
- *The comparison set is narrow.* All three peers are open-weight. With no frontier closed model as a ceiling, "at or below peers" doesn't mean "absolutely safe." If the ecosystem baseline rises quickly, the safety margin of this relative comparison drifts with it.
- *Small samples, overlapping CIs.* HPCT (101) and MBCT (200) are small, so ±5-8 CIs are common. Many of the model "differences" the text emphasizes fall inside CI overlap, so the rankings shouldn't be over-read.
- *Private proxies aren't reproducible.* The "proxy agent" definitions and items behind Meta BioKnowledge/BioProtocol are private, so outsiders can't validate the risk claim. A defensible safety choice, but there's also no mention of external red-teaming or audit to bolster the self-assessment.
- *"Moderate" is self-defined.* The threshold itself comes from Meta's own framework; the same scores could land at a different tier under a different framing.

#### Takeaways

- It makes plain that the safety argument for an open-weight release runs on a *relative* comparison — "at or below already-public peers." That logic tends to pass automatically as the ecosystem baseline climbs, so it's worth remembering it's a different kind of assurance than an absolute risk ceiling.
- Even a strong code model hits a low ceiling on professional CTFs (17-27%), end-to-end exploitation, and multi-step intrusion (zero full machine compromises). "Good at coding ≠ good at autonomous hacking" is the current empirical fact.
- Honesty hinges heavily on *whether the reasoning trace is shown.* Hide the trace and the same model looks less honest — a practical tension worth chewing on, since hiding CoT in a product can conflict with safety monitoring.
- A single forced "conflict acknowledgement" step in the system prompt lifts normalized honesty by 10+ points. High bang-for-buck, but premature to recommend without measuring its side effects on general capability.
- The single most important line: the question this report does *not* answer (risk under malicious fine-tuning) is the one that actually decides an open-weight model's risk. When reading preparedness reports, build the habit of asking what was *left out* of the eval as much as what was measured.

#### References

- This report: <https://arxiv.org/abs/2605.00932>
- CWM main technical report: <https://ai.meta.com/research/publications/cwm-an-open-weights-llm-for-research-on-code-generation-with-world-models/>
- CWM model & code: <https://github.com/facebookresearch/cwm>
- Meta Frontier AI Framework: <https://ai.meta.com/static-resource/meta-frontier-ai-framework>

#### Further reading

- **[CWM: An Open-Weights LLM for Research on Code Generation with World Models](https://arxiv.org/abs/2510.02387)** (Meta FAIR CodeGen Team, 2025) — the CWM main technical report, the subject of this assessment; the 32B model that hits 65.8% on SWE-bench Verified.
- **[The MASK Benchmark: Disentangling Honesty From Accuracy in AI Systems](https://arxiv.org/abs/2503.03750)** (Ren et al., 2025) — measures "lying" directly, separated from accuracy; the propensity eval lifts it wholesale.
- **[Cybench: A Framework for Evaluating Cybersecurity Capabilities and Risks of Language Models](https://openreview.net/forum?id=tc90LV0yRL)** (Zhang et al., ICLR 2025) — the standard 40-CTF framework for LLM cyber capability.
- **[Deliberative Alignment: Reasoning Enables Safer Language Models](https://arxiv.org/abs/2412.16339)** (Guan et al., 2025) — reasoning as a safety lever, directly adjacent to this report's structured-reasoning intervention.
- **[Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation](https://arxiv.org/abs/2503.11926)** (Baker et al., 2025) — reasoning traces as a monitoring surface that becomes dangerous when obscured; the backdrop to "hiding the trace looks less honest."
- **[The WMDP Benchmark: Measuring and Reducing Malicious Use With Unlearning](https://arxiv.org/abs/2403.03218)** (Li et al., 2024) — the cyber/bio/chem hazardous-knowledge MCQ benchmark used for the knowledge axis here.

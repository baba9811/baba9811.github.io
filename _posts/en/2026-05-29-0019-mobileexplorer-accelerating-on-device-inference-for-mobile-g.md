---
layout: post
title: "[Paper Review] MobileExplorer: Accelerating On-Device Inference for Mobile GUI Agents via Online Exploration"
date: 2026-05-29 14:00:00 +0900
description: "Instead of letting slow on-device VLM inference idle, MobileExplorer spends that window probing the screen to gather hints for the next reasoning step."
tags: [gui-agent, on-device, vlm, mobile, inference-acceleration, online-exploration]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/fig4-system-overview.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/
ko_url: /papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Runxi Huang, Liyu Zhang, Shengzhong Liu, Xiaomin Ouyang (HKUST · SJTU) |
| Venue | arXiv preprint · 2026 |
| arXiv or DOI | [2605.26546](https://arxiv.org/abs/2605.26546) |
| Data | AndroidWorld (116 tasks, 20 real Android apps) + custom real-world tasks |
| <span style="white-space: nowrap">Review date</span> | 2026-05-29 |

#### TL;DR

- The real bottleneck for on-device mobile GUI agents isn't a single slow inference — it's that a per-step VLM call taking tens of seconds gets repeated 15–20 times, while the device mostly sits idle in between.
- MobileExplorer puts that **idle reasoning window** to work. While the VLM is deciding the next action, the system separately probes a few task-relevant UI elements, observes the resulting screen transitions, and summarizes what it finds into compact textual hints that are fed into the next reasoning step's prompt.
- A perceptual-hash-based two-level rollback keeps these probes from corrupting the live UI state. On AndroidWorld it reaches 50.86% success (vs. M3A's 46.55%, +4.31pp), 9.24 average reasoning steps (vs. 10.93, −15.5%), and 185.82s average completion in a real-world case study (−15.9% vs. M3A).

#### Introduction

A mobile GUI agent operates a smartphone on the user's behalf: it perceives the screen, reasons about what to do, and then taps, types, or swipes. With the rise of vision-language models (VLMs), vision-based agents that consume screenshots directly have overtaken text-based agents that work off the accessibility tree (a11y tree) — screenshots carry layout, spatial relations, and icons, which give stronger visual grounding on complex interfaces.

The deployment story is where things get awkward. Nearly all existing GUI agent systems — text- or vision-based — run the LLM/VLM in the cloud and only execute actions on the device. That means uploading interface data — screen captures, typed content — which is a clear privacy risk. Hence the growing push toward **fully on-device** GUI agents that keep perception, reasoning, and action entirely local.

But moving a vision-based agent on-device hits a wall. VLMs process high-dimensional visual input and are far heavier than LLMs. Even a small MAI-UI-2B takes roughly 40 seconds per inference on a Samsung Galaxy S24. Worse, mobile tasks are inherently multi-step and sequential, often needing 15–20 actions, so those tens-of-seconds latencies accumulate step after step. This paper zeroes in on exactly that observation — the slow inference isn't a one-off, it's a long repeated chain, and the device idles in between — and proposes MobileExplorer to recycle that reasoning time into exploration.

#### Key Contributions

- **Decomposes the latency** of on-device GUI agents and shows quantitatively that the long VLM reasoning time is wasted in conventional sequential pipelines. Perception and operation are cheap; planning (reasoning) dominates per-step latency.
- Proposes **MobileExplorer**, which uses this idle reasoning time to run lightweight, parallel online exploration — gathering extra UI evidence without increasing the number of model invocations.
- Designs three components: **task relevance-driven exploration** (what to probe), **two-level rollback** (how to restore state afterward), and **exploration-augmented reasoning** (how to inject what was found into the next step).
- Demonstrates on AndroidWorld and on custom complex/dynamic real-world tasks that it maintains or improves success while cutting reasoning steps and end-to-end latency.

#### Background and Related Work

**Two lineages of mobile GUI agents.** Early systems were LLM-based, operating over structured text such as the a11y tree. AutoDroid and AutoDroid-V2 added planning and memory for long-horizon interaction; V-Droid took a verifier-based route, selecting actions from candidate UI elements. But text representations miss rich visual cues — icons, layout, spatial relations. So vision-based agents that act directly on screenshots emerged (CogAgent, Mobile-Agent-v3, MAI-UI, STEP-UI), and they now dominate the top of the AndroidWorld leaderboard.

**On-device attempts.** AutoDroid represents GUI state as a structured UI transition graph for local reasoning; AutoDroid-V2 builds action plans from app documentation to cut latency. But these lean on textual and planning priors and don't transfer cleanly to vision-based agents that must reason over raw screenshots.

**Offline knowledge bases.** GUI-explorer mines transition-aware knowledge from state–action traces; LLM-Explorer builds reusable repositories of UI states and interaction graphs via large-scale app exploration. Powerful, but they depend on offline-collected trajectories or pre-built knowledge bases that are costly to construct and hard to generalize to dynamic, real interfaces. MobileExplorer's distinction is that it explores **online, during inference**, with no offline knowledge construction, adapting to dynamic apps on the fly.

#### Motivation: Why Reasoning Time Goes to Waste

MobileExplorer starts from a measurement: where does an on-device agent spend its time? The authors ran a 2B VLM (MAI-UI) fully on a Samsung Galaxy S24 (12GB RAM) and decomposed the per-step latency of a simple task — recording and saving an audio file in AudioRecorder.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/fig3-latency.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Distribution of task step counts in AndroidWorld (left) and per-step latency breakdown (right). Planning (VLM reasoning) consumes almost all of each step's latency; perception and operation are a small fraction."
   zoomable=true %}

The findings are clear. (1) Most tasks take many steps, with some exceeding 30. (2) Each step's latency is almost entirely planning (VLM reasoning); perception and operation are slivers. So the inefficiency stems not from one slow inference but from the product of long-horizon decision-making and a heavy per-step reasoning cost.

The opening this exposes is a stark **latency imbalance**: UI perception and operation are light (1–2 seconds), while VLM reasoning is heavy (tens of seconds). In a sequential pipeline, the device just idles while that long inference runs. MobileExplorer's idea is to spend that idle window on exploration — pre-tapping selected UI elements and watching the transitions can reduce later uncertainty, cut trial-and-error actions, and shorten the overall trajectory.

#### Method

{% include figure.liquid loading="eager"
   path="assets/img/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/fig4-system-overview.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: MobileExplorer system overview. Each reasoning step runs lightweight online exploration in parallel with VLM inference, a two-level rollback restores the original UI state, and the discovered info is summarized into hints fed into the next reasoning step."
   zoomable=true %}

The architecture is a partially parallel pipeline. At step $i$, the VLM reasons about the next action from the current screenshot and the task description. **During that very inference**, the system parses the current screen's UI elements, computes their semantic similarity to the task, and lightly probes a few of them while observing screen transitions. To stay consistent with the main trajectory, it records the exploration traces, safely restores the original UI state, and then summarizes the discovered screens and UI semantics into compact textual hints appended to the next step's prompt.

### Problem Formulation

At step $i$, the agent observes the current screenshot $s\_i$ and receives the task description $\mathcal{G}$. Because mobile interfaces are only partially observable, the full UI structure is unknown a priori and revealed only through interaction. The set of interactive UI elements is

$$
\mathcal{A}_i = \{a_i^{(1)}, a_i^{(2)}, \ldots, a_i^{(K_i)}\}.
$$

Each action interacts with one UI element (click, scroll, etc.) and may trigger a transition to a new state. Let $\tau\_i^{\text{vlm}}$ be the reasoning latency at step $i$; during that time the device is idle from the interaction perspective, leaving room for auxiliary actions without adding user-perceived delay. The system objective is to maximize task-completion probability under an on-device latency budget:

$$
\max_\pi \; \Pr\!\big(v_N \in \mathcal{V}_{\text{goal}}(\mathcal{G})\big)
\quad \text{s.t.} \quad \sum_i \tau_i^{\text{interact}} \le T,
$$

where $T$ is the latency budget and $\pi$ the interaction policy. The design constraint is to exploit idle reasoning latency for exploration without increasing total execution delay.

### Task Relevance-Driven Exploration

{% include figure.liquid loading="eager"
   path="assets/img/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/fig5-exploration.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: Task relevance-driven exploration. Clickable UI elements are ranked by semantic similarity to the task via text embeddings, and short probes run within the model reasoning window."
   zoomable=true %}

Exploration must satisfy two constraints at once. First, it must operate strictly within each step's VLM reasoning latency so it adds no delay — meaning exhaustive traversal of the UI graph is infeasible, and the system must pick the most informative interactions. Second, it must avoid re-probing already-explored branches.

To pick candidates cheaply, the module leverages the a11y tree, which is far lighter than vision-based parsing. At the start of step $i$, it parses the current screen's a11y tree into the clickable element set $\mathcal{A}\_i = \{a\_i^{(1)}, \ldots, a\_i^{(K\_i)}\}$ and converts each element $a\_i^{(k)}$ into a lightweight textual representation (text label, content description, resource identifier). A lightweight text embedding model then encodes each element and the task into semantic vectors, and a task relevance score is the cosine similarity between them:

$$
r\!\left(a_i^{(k)}\right) = \mathrm{sim}\!\left(e\!\left(a_i^{(k)}\right),\, e(\mathcal{G})\right),
$$

where $e(\cdot)$ is the embedding model and $\mathrm{sim}$ is cosine similarity. For a web-search task, for instance, an element that launches the browser scores high. To prevent repeated probing, an exploration history $\mathcal{H}\_i$ (previously visited elements) feeds the final priority score:

$$
S\!\left(a_i^{(k)}\right) = r\!\left(a_i^{(k)}\right) - \lambda \cdot \mathbb{1}\!\left[a_i^{(k)} \in \mathcal{H}_i\right],
$$

where $\lambda$ is a penalty weight that discourages revisits. The controller probes candidates in descending order of $S(\cdot)$. Each probe is a click plus an observation of the resulting transition, proceeding sequentially up to a bounded depth $d$ before returning to the starting state. Because each probe is short and depth-bounded, several can fit inside one reasoning window.

### Two-Level Rollback: Don't Break the State You're Reasoning On

{% include figure.liquid loading="eager"
   path="assets/img/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/fig6-rollback.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: Two-level rollback. Level-1 is depth-bounded backtracking with perceptual-hash state verification; Level-2 is home-and-replay recovery."
   zoomable=true %}

Offline exploration in a simulator can freely duplicate and restore environment state. MobileExplorer runs on a **live device**, where every probe alters the real UI. If restoration is imperfect, the agent drifts away from the screen the reasoning decision was made on, leading to inconsistent execution.

Naive backtracking is insufficient for two reasons. First, many UI transitions have no true inverse — a `back` action might close a dialog, dismiss a keyboard, or skip intermediate screens rather than land on the exact prior state. Second, asynchronous updates (notification banners, dynamically loaded content) can alter the screen even along identical navigation paths. A robust rollback must therefore tolerate minor visual variation while guaranteeing a return to the correct UI context.

**Level-1: depth-bounded backtracking.** Exploration runs only to depth $d$ from the starting screen $s\_i$. The system records the perceptual hash of the starting screen as

$$
H_0 = H(s_i),
$$

where $H(\cdot)$ is the pHash function. Screenshot capture is much faster than re-fetching the a11y tree, and perceptual hashing allows efficient screen-to-screen comparison while tolerating minor visual differences from dynamic elements. After finishing a branch, the agent issues `back` up to $d$ times; at each rollback step $k$ it captures the current screen $s\_{r\_k}$ and checks it against the start:

$$
d_H\!\left(H(s_{r_k}),\, H_0\right) \le \tau,
$$

where $d\_H(\cdot)$ is the Hamming distance between perceptual hashes and $\tau$ tolerates minor variation (scroll offsets, dynamic content). If it holds, the original state is deemed restored.

**Level-2: home-and-replay recovery.** If Level-1 fails (irreversible transitions, navigation inconsistencies), the system falls back to a deterministic recovery. Suppose a confirmation dialog or permission prompt appeared during exploration that wasn't there before — `back` might dismiss it onto an earlier screen rather than the exact start. Here it uses the interaction trace that led to the starting state:

$$
\Pi_i = (a_1, a_2, \ldots, a_i),
$$

where $a\_k$ is the action executed at step $k$. The agent returns to Home and deterministically replays $\Pi\_i$ to reconstruct state $s\_i$. Since exploration depth is small in practice, the replay sequence is short and its overhead is negligible against VLM inference latency.

The full procedure is Algorithm 1:

```text
Algorithm 1: Exploration with Rollback
Require: task G, start screen s_i, clickable set A_i, depth d, budget τ_i, threshold δ
Ensure:  exploration hints C_i and restored UI state s_i
 1: C_i ← ∅
 2: H_0 ← H(s_i)                         # compute pHash of start screen
 3: rank candidates A_i^cand by semantic similarity to G
 4: for all a ∈ A_i^cand within τ_i do   # within the reasoning budget
 5:   interact with a, explore transitions up to depth d
 6:   record discovered screens / elements into C_i
 7:   issue back for d steps (Level-1 rollback)
 8:   capture current screen s'
 9:   H' ← H(s')
10:   if d_H(H', H_0) > δ then
11:     go home and replay trace Π_i (Level-2 recovery)
12:   end if
13: end for
14: return C_i
```

The point is that the common case takes the fast Level-1 path, while Level-2 guarantees correctness only in the exceptional non-deterministic cases — so the agent can safely probe alternative branches without permanently altering its main decision trajectory.

### Exploration-Augmented Reasoning

Exploration happens *before* the reasoning decision is finalized, so the executed action may land on a different screen than the one explored. Blindly injecting all exploration results would add irrelevant information and inflate reasoning latency. Hence:

**Exploration observations.** Each visited screen is recorded as a compact observation — the screenshot's perceptual hash plus UI elements parsed from the a11y tree — capturing screen identity and structure without large memory.

**Step alignment.** Once the reasoning action executes and the agent reaches screen $s\_{i+1}$, the system computes its perceptual hash and retrieves only the exploration observations with similar visual structure:

$$
O_i^{\text{match}} = \{\, o_j \in O_i \mid d(h_{i+1}, h_j) < \delta \,\},
$$

where $d(\cdot)$ is the Hamming distance between perceptual hashes. This filters out exploration results corresponding to unrelated states.

**UI element selection.** Even aligned screens may hold many elements across different apps or actions. For each, the system recomputes the task relevance score (the same semantic similarity) and keeps only the high-scoring ones for hint construction.

**Hint generation.** From the selected elements, MobileExplorer composes concise textual hints describing potentially useful UI locations. These hints form the exploration context $C\_i$, appended to the next step's prompt. The VLM thus reasons over an augmented input — current screenshot, task instruction, and exploration context — while the reasoning input itself stays compact and relevant, fit for on-device deployment.

#### Data and Pipeline

This is a **systems** paper, not a training paper: it leaves the off-the-shelf VLM untouched and redesigns the inference-and-exploration pipeline. So there's no training data or fine-tuning; the evaluation environment and deployment setup are what matter.

| Component | Detail |
|------|------|
| Benchmark | AndroidWorld (116 tasks, 20 real Android apps). Difficulty: Easy 61 (52.6%), Medium 36 (31.0%), Hard 19 (16.4%) |
| Base model | 4B VLM (baselines are also 4B VLM/LLM-based). Model-size scaling uses MAI-UI 2B and 8B |
| Quantization/serving | llama.cpp + Q8 quantization, served via vLLM. On the phone, llama.cpp runs inside Termux |
| Devices | Samsung Galaxy S24 (CPU/GPU/NPU, 12GB), NVIDIA Jetson AGX Orin (CPU/GPU, 64GB), MacBook Air M4 (CPU/GPU, 24GB) |
| Execution setup | Dual-device: an emulator executes UI actions, model inference runs on target hardware (phone/Jetson/laptop), communicating over HTTP to measure true on-device latency |
| Embedding model | A lightweight text embedding model encodes elements and the task |

There are four baselines. (1) **M3A**: the base vision-based agent that reasons sequentially over the current screen with a VLM. (2) **T3A**: a text agent that relies on the a11y tree and reasons step-by-step with an LLM. (3) **Input-pruning VLM agent**: reduces visual token overhead via screenshot or token pruning. (4) **Offline exploration agent**: builds knowledge through offline exploration. The paper also compares against existing AndroidWorld leaderboard results.

The metrics are **success rate** (fraction of tasks completed within a step budget), **total steps** (interaction steps to finish a task), **latency** (step latency = screenshot capture to action completion; end-to-end latency = total task completion time), and CPU/memory/power overhead.

#### Experiments

### Overall Performance on AndroidWorld

{% include figure.liquid loading="eager"
   path="assets/img/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/fig8-performance.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: Overall performance on AndroidWorld. (a) success rate vs. end-to-end latency — MobileExplorer (star) achieves the highest success and lowest latency simultaneously. (b) average reasoning steps — fewest both overall and on successful tasks."
   zoomable=true %}

Fully on-device, MobileExplorer reaches **50.86% success (59/116 tasks)**. Against the same 4B-VLM baseline M3A at 46.55%, that's +4.31pp, a 9.3% relative gain. Integrating latency-bounded online exploration into reasoning yields more useful UI context and better decisions.

On efficiency, MobileExplorer finishes in **9.24 steps** on average versus M3A's 10.93 — 15.5% fewer. Fewer actions mean less trial-and-error, which in turn lowers end-to-end latency. In Figure 8(a), MobileExplorer (star) sits in the top-left corner, owning both the highest success rate and the lowest end-to-end latency.

It's also strong against the leaderboard. Success rates on AndroidWorld:

| Method | AndroidWorld (%) |
|------|------|
| MobileGPT | 23.0 |
| AutoDroid-V2 | 26.0 |
| M3A (a11y, GPT-4-Turbo) | 30.6 |
| M3A (a11y, Gemini-2.5-Pro) | 31.0 |
| M3A (SoM, GPT-4-Turbo) | 25.4 |
| M3A (SoM, Gemini-2.5-Pro) | 39.7 |
| GLM-4.1V-9B-Thinking | 41.7 |
| UI-TARS (UI-TARS-7B) | 33.0 |
| **MobileExplorer** | **50.9** |

The striking part: MobileExplorer beats even M3A variants backed by giant cloud models like GPT-4-Turbo and Gemini-2.5-Pro. The gains from exploration-augmentation on a small on-device model partly close the model-scale gap.

### Real-World Case Study

AndroidWorld tasks are relatively simple (about 19.75 elements per screen on average). The authors designed separate tasks for three real-world difficulties. (1) **Complicated UI elements**: a city trip-planning task in a Trip app — about 48 elements per screen, more than twice AndroidWorld's. (2) **Pop-up interfering elements**: injecting alarms, messages, calls, and app notifications while typing text in a Notes app. (3) **Resource dynamics**: changing system settings (Bluetooth, WiFi) while background tasks like video and music playback run.

Here MobileExplorer completes tasks in **185.82 seconds** on average, cutting overall latency by 15.9% versus M3A. Crucially, this comes without raising per-step reasoning overhead — exploration runs in parallel during otherwise-idle inference time. Across all three complicated settings, success rates are comparable or higher and end-to-end latency is consistently lower, demonstrating robustness under interrupt-driven changes and dynamic resource conditions.

> A caveat: the abstract and intro summarize the effect as "~23% reduction in reasoning steps and end-to-end latency, with up to 5% higher success." The detailed §6.2 numbers (steps −15.5%, case-study latency −15.9%, success +4.31pp) differ somewhat, and the body never defines what comparison or aggregation the headline 23% refers to. As a reviewer, I'd treat the §6.2 measurements as the primary evidence.

#### Analysis and Ablation

{% include figure.liquid loading="eager"
   path="assets/img/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/fig12-understanding.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 12: Understanding MobileExplorer. (a) ablation, (b) task categories, (c) two-level rollback, (d) exploration-augmented reasoning (hint-follow rate)."
   zoomable=true %}

**Component ablation (Figure 12a).** Disabling each component in turn:

- **Task-relevance selection → random exploration**: 50.9% → 42.2% (−8.7pp). Random probing often hits task-irrelevant elements within the limited window, gathering less useful information.
- **Remove two-level rollback**: 50.9% → 39.7% (−11.2pp). **The largest drop**, and end-to-end latency also rises, because exploration fails to return to the original state and reasoning proceeds on the wrong screen. The ability to safely undo is a precondition for exploration.
- **Disable step alignment**: 50.9% → 47.4% (−3.5pp). Unfiltered exploration observations enter the prompt and inject misleading information.

Together these show that for exploration to help, the system must (1) choose what to probe by task relevance, (2) reliably restore state afterward, and (3) inject only observations aligned with the current reasoning context. Notably, without rollback, exploration actively hurts.

**Task categories (Figure 12b).** MobileExplorer consistently improves on visually intensive tasks with many candidate elements — complex UI understanding, search, information retrieval. On structured tasks that rely on deterministic action sequences (data entry, data edit), it lands slightly below M3A. This matches the intuition: exploration pays off most when it's unclear which of many elements is relevant.

**Two-level rollback (Figure 12c).** Categorizing UI pages by clickable-element count (Simple/Medium/Complicated), Level-1 handles most cases, and complicated pages show a higher share of Level-2 rollbacks — simple backtracking is more likely to fail in deeper, less reversible navigation. Even so, the overall rollback success rate stays high across all categories, showing Level-2 effectively complements Level-1.

**Exploration-augmented reasoning (Figure 12d).** As UI complexity grows, the hint-follow rate (how often reasoning actually follows the hints) rises, and tasks with higher hint-follow rates show higher success. Exploration hints are especially useful guidance on interfaces with many candidate elements.

**Model size and resolution (Figure 13).** Across MAI-UI 2B and 8B, MobileExplorer keeps comparable success while reducing average steps (about one step saved per task), lowering end-to-end latency. Higher resolution (270×600, 540×1200, 1080×2400) generally improves success, but MobileExplorer peaks at moderate resolution and uses fewer steps than M3A at all settings — moderate resolution being a good balance of visual fidelity and interaction efficiency.

**System overhead (Figures 14, 15).** On phone, Jetson, and laptop alike, MobileExplorer reduces end-to-end latency while memory and power stay nearly identical to the baseline. By component, the extra control logic adds only tens of milliseconds per step — negligible against multi-second VLM inference. The largest latency source is rollback verification (screenshot-based state checking); exploration and element selection are lightweight.

#### Limitations and Critical Assessment

- **Author-acknowledged.** Future work cites adaptive exploration that adjusts paths to task demands and UI complexity, and a more intricate interplay between exploration and reasoning. The current depth $d$, budget $\tau\_i$, and penalty $\lambda$ are fixed hyperparameters.
- **Headline vs. body numbers.** The abstract's "~23% reduction" differs from §6.2's steps −15.5% and case-study latency −15.9%, and the body never clearly defines the comparison behind the 23%, making the effect size hard to gauge.
- **Exploration leans on the a11y tree.** Candidate selection and probing rely on a11y-tree parsing, not vision. In apps with poor a11y trees or many non-standard widgets (games, custom-rendered UIs), candidate quality may degrade — performance under those conditions isn't reported.
- **Cost of reliable rollback.** Rollback verification is the largest latency source, and Level-2 (home-and-replay) grows on complicated pages. In extremely dynamic environments where Level-2 fires often, there's little quantitative reporting of failure rate or restoration accuracy — does replay really restore the same state?
- **Statistical significance.** No variance or confidence intervals accompany the success/latency numbers, so it's hard to tell whether 50.86% vs. 46.55% exceeds run-to-run variation. The case study repeats each task only three times, a small sample.
- **Reproducibility.** Source code is "to be released upon acceptance," so it's currently unavailable, and the exact identity of the "4B VLM" is left somewhat ambiguous in the text.

#### Takeaways

- **Idle time is a resource.** The paper cleanly diagnoses that the on-device bottleneck is not a single slow inference but the repeated accumulation of slow inferences, and fills the empty windows with exploration. The constraint — gather more information without adding model calls — runs through the entire design.
- **Exploration is only valuable when it's reversible.** That removing rollback causes the biggest drop says the core of live-environment exploration isn't "what you see" but "whether you can safely get back." The perceptual-hash + home-and-replay two-level design is a pragmatic engineering answer.
- **The gains concentrate on complex interfaces.** It wins big on cluttered, candidate-heavy screens (search, information retrieval) and slightly loses on deterministic-sequence tasks. "Exploration helps when uncertainty is high," rather than "exploration always helps," is the more honest conclusion.
- **Splitting roles between a11y tree and vision.** Using heavy vision reasoning for the main decision and light a11y-tree parsing for candidate exploration is an asymmetric design that fits on-device constraints well — a cost-aware modality split that could transfer to other on-device agents.

#### References

- Paper: <https://arxiv.org/abs/2605.26546>
- Demo video: <https://youtu.be/thK7MJmdlvM>
- Benchmark: [AndroidWorld](https://google-research.github.io/android_world/)

#### Further Reading

- **[AndroidWorld: A Dynamic Benchmarking Environment for Autonomous Agents](https://arxiv.org/abs/2405.14573)** (Rawles et al., 2024) — The evaluation foundation here and the source of the M3A/T3A baselines. A live Android environment that dynamically parameterizes 116 tasks.
- **[Mobile-Agent-v3: Fundamental Agents for GUI Automation](https://arxiv.org/abs/2508.15144)** (Ye et al., 2025) — The GUI-Owl backbone and multi-agent framework reaching 73.3 on AndroidWorld, an open-source SOTA.
- **[UI-TARS-2 Technical Report](https://arxiv.org/abs/2509.02544)** (Wang et al., 2025) — A native GUI agent trained with multi-turn RL; the follow-up to this paper's UI-TARS baseline.
- **[AutoDroid-V2: Boosting SLM-based GUI Agents via Code Generation](https://arxiv.org/abs/2412.18116)** (Wen et al., 2025) — Recasts UI tasks as code generation solved by an on-device SLM, sharply cutting on-device latency and tokens.
- **[GUI-explorer: Autonomous Exploration and Mining of Transition-aware Knowledge for GUI Agent](https://arxiv.org/abs/2505.16827)** (Xie et al., ACL 2025) — A training-free agent that mines transition-aware knowledge via offline exploration, a counterpoint to MobileExplorer's online approach.

---
layout: post
title: "[Paper Review] Ferret-UI Lite: Lessons from Building Small On-Device GUI Agents"
date: 2026-05-29 15:30:00 +0900
description: "Apple's 3B on-device GUI agent. A close read of how real+synthetic data curation, zoom-in visual tool-use, and a two-stage SFT→RLVR recipe push a small model as far as it can go on GUI grounding and navigation — and where it honestly hits a wall."
tags: [gui-agent, on-device, multimodal-llm, reinforcement-learning, grounding, vision-language-action]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/fig1-capability-vs-size.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/
ko_url: /papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Zhen Yang et al. (16 co-authors, Apple) |
| Venue | arXiv preprint · 2025 |
| arXiv | [2509.26539](https://arxiv.org/abs/2509.26539) |
| Data | Public GUI grounding/navigation datasets (OS-Atlas, UGround, Aria-UI, Aguvis, Jedi, ShowUI, etc.) + mobile/desktop synthetic data |
| <span style="white-space: nowrap">Review date</span> | 2026-05-29 |

#### TL;DR

- Apple introduces <strong>Ferret-UI Lite, a 3B end-to-end on-device GUI agent</strong> that handles mobile, web, and desktop in a single model. On grounding it scores 91.6 on ScreenSpot-V2, 53.3 on ScreenSpot-Pro, and 55.3 on OSWorld-G — well ahead of comparable 3B models and closing in on the 7B tier. On navigation it reaches 28.0% on AndroidWorld and 19.8% on OSWorld: strong for its size, but still short of larger models.
- The recipe has three threads: (1) curate real and synthetic data at scale under a <strong>unified action space</strong>, (2) use <strong>zoom-in visual tool-use</strong> at inference time to read high-resolution screens precisely, and (3) train in two stages, <strong>SFT → RLVR</strong>, with carefully designed verifiable rewards.
- True to its title, this is a "lessons" report. Ablations show that <strong>small models are highly sensitive to RL reward design</strong>, that grounding and navigation data mutually reinforce each other, and that synthetic high-resolution data is especially effective for precise grounding. Code and weights are not released.

#### Introduction

A GUI (graphical user interface) agent takes over the screen manipulation a human would do with a mouse and keyboard: it looks at the screen and decides, on its own, "click this button, type into that field, move to the next screen," then executes. Think of jotting a reminder hands-free while driving, or pulling up a recipe with wet hands. These assistive scenarios demand <strong>low latency, strong privacy guarantees, and robustness under limited connectivity</strong> — all three of which conflict with the "ship the screen to a big server model" approach. Hence the need for small, on-device GUI agents.

The catch is that the field's center of gravity sits at the opposite end. Most methods lean on giant foundation models. Multi-agent systems that separate perception, planning, and action — built on top of large LLMs like GPT or Gemini — achieve impressive navigation, but at the cost of modeling complexity, compute budget, and inference time. End-to-end GUI agents that map raw screenshots directly to actions are an appealing alternative, yet here too larger models are preferred, because a single model has to absorb a heterogeneous mix of low-level grounding, screen understanding, multi-step planning, and self-reflection.

Ferret-UI Lite takes aim squarely at this imbalance. The real point of the paper is to ask, at the 3B scale, "can we build a strong GUI agent from a small model — and if so, which techniques work, and where does it break?" — then report the lessons honestly. It continues Apple's Ferret-UI lineage (Ferret-UI, Ferret-UI 2), but this time the focus shifts from "understanding" toward "acting as an agent" and "on-device efficiency."

{% include figure.liquid loading="eager"
   path="assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/fig1-capability-vs-size.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1. Performance vs. model size. (a) On grounding, Ferret-UI Lite (red star, 3B) surpasses same-size models and even several larger ones. (b) On navigation it tops the 3B group but trails the 72B tier by a clear margin — a sign that multi-step reasoning is inherently hard for small models."
   zoomable=true %}

#### Key Contributions

- <strong>A 3B on-device end-to-end GUI agent</strong> that handles mobile, web, and desktop in one model and learns grounding and navigation jointly. It sets a substantially higher grounding bar within the 3B tier.
- <strong>Large-scale curation of real + synthetic data under a unified action space</strong>: public datasets are unified into point-based coordinates and a function-call action format, and gaps are filled with synthetic data. A multi-agent system that generates online rollouts is the centerpiece.
- <strong>Inference-time zoom-in visual tool-use</strong>: a "thinking with images" mechanism that crops around the model's initial prediction and re-predicts, letting a small model make a final decision over a narrow region of a large, cluttered screen.
- <strong>Two-stage training with verifiable rewards (SFT → RLVR)</strong>: a containment reward for grounding, and an action-type + parameter reward for navigation. Ablations show that, for small models, this reward design is decisive.
- <strong>A consolidated set of scale-down lessons</strong>: rich ablations on data-mixture ratios, high-resolution data, CoT length, and RL reward composition map out what does and does not work for small models. This is the contribution that will outlast any single SOTA number.

#### Background

<strong>Grounding vs. navigation.</strong> GUI tasks split into two kinds. <strong>Grounding</strong> is a single-step problem: given an instruction like "click the Refresh button," predict the screen coordinate to click. <strong>Navigation</strong> spans many steps — "send this poster to my mom by email" — changing the screen as it goes, planning over an accumulated history of screens and actions. Grounding lives or dies on precise location; navigation on long-horizon planning. They are usually handled separately; Ferret-UI Lite trains both in one model.

<strong>End-to-end vs. multi-agent.</strong> Multi-agent approaches separate a planner from a grounding module, using a large model (GPT, Gemini) as the planner and a specialized module to ground coordinates — powerful but heavy. End-to-end approaches, like OS-Atlas, UI-TARS, and ShowUI, predict action sequences directly from multimodal inputs with a single vision-language-action model; Ferret-UI Lite belongs here. Notably, it <strong>uses a multi-agent system to generate training data but deploys a single end-to-end model</strong> — distilling the richness of a multi-agent pipeline into a small unified model.

<strong>RLVR and GRPO.</strong> Reinforcement Learning with Verifiable Rewards (RLVR) replaces human labels with rule-based, automatically computable rewards. GUI grounding is a natural fit, since "did the predicted coordinate land inside the ground-truth box?" can be checked automatically. Optimization uses Group Relative Policy Optimization (GRPO), introduced in DeepSeekMath: sample multiple candidates per input and update the policy with an advantage normalized by the group's reward mean and standard deviation — stable without a value network.

<strong>Thinking with images.</strong> A recent line of visual-reasoning work teaches models to actively crop and zoom into regions of interest rather than look once and commit. Ferret-UI Lite's zoom-in applies this idea to grounding.

#### Method / Architecture

##### Backbone and I/O

Ferret-UI Lite starts from an <strong>internal 3B dense model</strong> pretrained on a mixture of text-only and vision-language understanding data. The image encoder uses the VitDet plain-ViT detection backbone with the <strong>AnyRes</strong> strategy, which dynamically partitions each input screenshot into a grid of cells — a choice that lets it process high-resolution UI screenshots without a token explosion. The resulting visual tokens feed a <strong>decoder-only LLM</strong>, and given a GUI screen plus a user instruction the model emits chain-of-thought traces (`<think>...`) and a low-level action policy (`<function>...`) in sequence.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/fig3-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3. Model architecture and training recipes. The user instruction and screenshot pass through the image encoder into a decoder-only LLM, which generates think traces and function calls (actions). Training proceeds in two stages: SFT → RLVR."
   zoomable=true %}

##### Unified Action Space

To train one model on heterogeneous public datasets, the action representation has to be unified first. Ferret-UI Lite unifies it along two axes.

- <strong>Grounding coordinates</strong>: some datasets give bounding boxes, others single points. Every box is mapped to its geometric center, normalizing everything to a point-based representation.

$$
(x_{\text{center}}, y_{\text{center}}) = \left( \frac{x_{\min}+x_{\max}}{2},\; \frac{y_{\min}+y_{\max}}{2} \right)
$$

where $(x\_{\min}, y\_{\min})$ and $(x\_{\max}, y\_{\max})$ are the box corners. Point annotations are left unchanged.

- <strong>Action format</strong>: following the taxonomy of UI-TARS (Qin et al., 2025), actions are standardized into a function-call format. The text calls this "eleven representative actions," though Table 5 actually enumerates fifteen once platform-specific variants are counted. On top of cross-platform actions (tap, swipe, textentry, terminate, etc.) sit desktop/web-only ones (right_click, double_click, press_hotkey) and mobile-only ones (long_press, navigate_home, open_app, navigate_back). The function-call form yields structured outputs that are easy to parse and align naturally with the coding and tool-use abilities of modern LLMs.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/tab5-action-space.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5. The unified action space. Cross-platform actions plus desktop/web- and mobile-specific actions, all defined as function calls."
   zoomable=true %}

##### SFT Data: Real + Synthetic

SFT data is gathered along two axes. The <strong>public datasets</strong> span both grounding and navigation: GroundUI, OS-Atlas, UGround, Aria-UI, Aguvis, WaveUI, ShowUI, Jedi, AgentNet. On top of those, the authors generate <strong>synthetic data</strong> for mobile and OS platforms, for both grounding and navigation. Because smaller models need many training tokens (Kaplan et al., 2020), scale, coverage, and diversity matter especially here.

##### Synthetic Data Generation

The synthetic data comes in four kinds.

- <strong>High-resolution grounding data</strong>: multiple GUI screenshots are concatenated into larger composite images (e.g., from OS-Atlas). This exposes the model to denser layouts and richer spatial context, teaching precise localization in realistic multi-element screens.
- <strong>CoT navigation data</strong>: three reasoning traces are produced — (i) plan (a concise description of the next action), (ii) action think (reasoning over GUI elements, history, and candidate actions), and (iii) reflect (self-assessment relative to the goal). Each component is generated by GPT-4o via set-of-marks (SoM) visual prompting, conditioned on the human-annotated action for the current screen and the episode history. Two agents with different compute profiles result: <strong>short-CoT</strong> adds only a plan trace before the action, and <strong>long-CoT</strong> extends to action-think and reflection.
- <strong>Synthetic QA data</strong>: to support assistive queries ("what's left in my cart?"), episode goals are rewritten into natural-language questions with answers grounded in the final screen. The authors also inject error-prone frames into clean trajectories (e.g., replacing a correct terminate with an erroneous swipe) to simulate a stuck state, then generate the correction sequence — teaching <strong>replanning</strong>.
- <strong>Online navigation data</strong>: a multi-agent system (Figure 4) interacts with real GUI platforms to produce rollouts at scale, with four components — a curriculum <strong>task generator</strong> of increasing difficulty, a <strong>planning agent</strong> that decomposes goals into step-level instructions, a <strong>grounding agent</strong> that executes actions, and a <strong>critic model</strong> that scores trajectories with textual rewards. These online trajectories carry the action errors, environmental stochasticity, and replanning strategies absent from human-annotated data; they are enriched with CoT traces and filtered by a VLM-as-a-judge.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/fig4-synthetic-pipeline.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4. Synthetic navigation data pipeline. The top path builds offline synthetic data (CoT, QA, high-res) from human-annotated trajectories via SoM prompting; the bottom path collects online rollouts from a multi-agent system (planning, grounding, critic, task generator) filtered by a VLM judge."
   zoomable=true %}

##### Reinforcement Learning: Zoom-in Visual Tool-Use

SFT forces strict imitation of annotated outputs and so under-uses the flexibility of GUI tasks: the same goal can be reached by differently-shaped actions, yet SFT only learns surface-level label matching. RLVR addresses this by rewarding task success itself.

<strong>Grounding RL</strong> runs on OS-Atlas. Unlike SFT, which forces the model to reproduce the annotated center, RL grants positive reward <strong>whenever the predicted location falls inside the ground-truth box</strong> — a containment reward that better matches what grounding actually wants ("anywhere inside the box is correct").

On top of this comes the <strong>zoom-in mechanism</strong>. After an initial prediction, the image is cropped around that location and the model re-predicts on the crop. It mimics how a person zooms in to read fine print, and helps especially on complex, high-resolution UIs: it lets a small model make its final decision over a <strong>narrow region</strong> rather than mobilizing subtle understanding across the whole screen. Both the initial and refined predictions are kept in the training pool, providing multi-scale grounding supervision.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/fig5-zoom-in.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5. The zoom-in operation. For 'Refresh the file explorer,' Step 1 predicts an initial location, and Step 2 re-predicts on a crop around it for higher precision."
   zoomable=true %}

<strong>Navigation RL</strong> uses the mobile/desktop synthetic data plus AgentNet. Given the current screenshot, the high-level instruction, and the history of past actions, the model samples $M$ candidate outputs $z = [z\_1, \ldots, z\_M]$. Each $z\_i = [c\_i; a\_i]$ is a chain-of-thought text $c\_i$ followed by a predicted action $a\_i = [\tau\_i; \theta\_i]$, with action type $\tau\_i$ and parameters $\theta\_i$ (e.g., a tap location). The reward compares the generated action against the ground truth $a^{\text{gt}} = [\tau^{\text{gt}}; \theta^{\text{gt}}]$.

#### Training Objective / Loss

The navigation reward is a sum of two components — one checks whether the action type is right, the other whether the parameters are precise.

$$
r_i = f_{\text{type}}(\tau_i, \tau^{\text{gt}}, \theta^{\text{gt}}) + f_{\text{param}}(\theta_i, \theta^{\text{gt}})
$$

The <strong>action-type reward</strong> $f\_{\text{type}}$ checks type match but rewards parameter-free actions (e.g., navigate_home, where $\theta^{\text{gt}} = \emptyset$) more strongly; actions that require parameters get partial credit for matching the type.

$$
f_{\text{type}}(\tau_i, \tau^{\text{gt}}, \theta^{\text{gt}}) =
\begin{cases}
2, & \text{if } \tau_i = \tau^{\text{gt}} \text{ and } \theta^{\text{gt}} = \emptyset, \\
1, & \text{if } \tau_i = \tau^{\text{gt}} \text{ and } \theta^{\text{gt}} \neq \emptyset, \\
0, & \text{otherwise.}
\end{cases}
$$

The <strong>parameter reward</strong> $f\_{\text{param}}$ evaluates parameter fidelity. For string parameters (text entry, direction) it uses exact match — 1 if matched, 0 otherwise. For location-based actions like tap, the authors experiment with two rewards: a <strong>sparse reward</strong> (1 if the predicted coordinate is inside the box, 0 otherwise — same as the grounding reward) and a <strong>dense reward</strong> that gives a graded score by normalized distance to the ground-truth center.

$$
f_{\text{param}}^{\text{dense}}(\theta_i, \theta^{\text{gt}}) = \max\!\left( 1 - \lambda \left( \frac{|x_i - x^{\text{gt}}|}{w} + \frac{|y_i - y^{\text{gt}}|}{h} \right),\; 0 \right)
$$

Here $(x\_i, y\_i)$ and $(x^{\text{gt}}, y^{\text{gt}})$ are the predicted and ground-truth centers, $w$ and $h$ the ground-truth element's width and height, and the decay factor $\lambda$ — set to 0.5 — controls sensitivity. The closer to the target, the closer the reward to 1; a full box-width off drives it to 0.

<strong>Optimization (GRPO).</strong> Both grounding and navigation RL use GRPO. Per training example, multiple predictions are sampled — <strong>8 from the original image + 4 from the zoom-in crop</strong> for grounding, and <strong>32 candidates</strong> for navigation. Each sample receives a reward $r\_i$, and the policy is updated with a group-normalized advantage.

$$
\begin{aligned}
A_i &= \frac{r_i - \text{mean}(r)}{\text{std}(r)}, \\
r &= [r_1, r_2, \ldots, r_M]
\end{aligned}
$$

For efficiency, <strong>online filtering</strong> discards prompts whose sampled rewards are all identical (uniformly 0 or 1), since they carry no learning signal — focusing on the most informative examples that sharpen the decision boundary.

#### Training Data and Pipeline

| Item | Value |
|------|------|
| Backbone | Internal 3B dense multimodal LLM (pretrained on text + vision-language understanding data) |
| Image encoder | VitDet + AnyRes (dynamically partitions screenshots into a grid of cells) |
| SFT data | Public grounding/navigation datasets + mobile/desktop synthetic data (high-res grounding, short/long-CoT, QA, online multi-agent rollouts) |
| RL data | Grounding: OS-Atlas / Navigation: mobile+desktop synthetic + AgentNet |
| Training steps | SFT 10K steps, RL 1,500 steps |
| RL algorithm | GRPO + online filtering (grounding 8+4 samples, navigation 32 samples) |
| Rewards | Grounding: box containment / Navigation: action type ($f\_{\text{type}}$) + parameters ($f\_{\text{param}}$, sparse or dense, $\lambda=0.5$) |

#### Experiments

The backbone is an internal 3B dense model, trained for 10K SFT steps + 1,500 RL steps. Grounding and navigation are evaluated in turn.

##### GUI Grounding

Evaluation uses ScreenSpot-V2, ScreenSpot-Pro, and OSWorld-G, spanning mobile/desktop/web and a range of resolutions. ScreenSpot-Pro is the hard one, featuring high-resolution desktop screens.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/tab1-grounding.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1. Grounding performance. Ferret-UI Lite-3B reaches 91.6 on ScreenSpot-V2, 53.3 on ScreenSpot-Pro, and 55.3 on OSWorld-G — well ahead of the 3B group and shoulder-to-shoulder with the 7B tier."
   zoomable=true %}

- <strong>ScreenSpot-V2 91.6</strong>: ahead of other 3B baselines (UI-R1-3B 89.2, Jedi-3B 88.8) and close to the 7B range of 90.3–92.8.
- <strong>ScreenSpot-Pro 53.3</strong>: dramatically higher than other 3B models, which mostly sit in the mid-30s (Jedi-3B 37.1, GUI-G1-3B 38.1), and just below GUI-Owl-7B (54.9).
- <strong>OSWorld-G 55.3</strong>: best among 3B (Jedi-3B 50.9), competitive with GUI-Owl-7B (55.9) and GUI-Owl-32B (58.0). The strongest 7B, GTA1-7B (67.7), still leads, but the gap is modest given the parameter scale.

One thing worth flagging: <strong>the abstract reports OSWorld-G as 61.2, while Table 1, Figure 6a, and Table 8 all consistently say 55.3.</strong> Since three tables agree, this review uses the verified 55.3 (the abstract's 61.2 appears to be a typo). It's a 6-point discrepancy, not a rounding issue — easy to propagate if you cite from the abstract alone.

##### GUI Navigation

<strong>Offline (Android Control).</strong> Split into low-level (single-step instruction) and high-level (global goal) tasks. Ferret-UI Lite-3B scores 86.6% low-level and 68.9% high-level, beating similar-size models (OS-Atlas-4B 80.6/67.5, InternVL-2-4B 80.1/66.7) and even some 7B/72B models (Qwen2-VL-7B 82.6/69.7, Aguvis-72B 84.4/66.4).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/tab3-navigation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3. Online navigation. (a) AndroidWorld: best among 3B models (28.0%), competitive with the 7B tier. (b) OSWorld-Verified (15-step): ahead of all 3B models (17.3%) but behind larger and commercial models."
   zoomable=true %}

- <strong>AndroidWorld 28.0%</strong>: averaged over five runs in a dynamic environment of 116 tasks across 20 apps. Best among 3B (ScaleCUA-3B 23.7) and competitive with the 7B tier such as UI-TARS-1.5-7B.
- <strong>OSWorld-Verified 17.3%</strong> (max 15 steps): ahead of all 3B models (ScaleCUA-3B 9.6, OpenCUA-A3B 16.9) and competitive with 7B. Raising the step cap to 50 lifts it to <strong>19.8%</strong>, showing some test-time scaling headroom.

The paper is candid about the ceiling, though: navigation is constrained by model scale and falls short of the OSWorld leaderboard SOTA (e.g., 43.9% for Claude-4-Sonnet). For reference, in the same 15-step internal evaluation, Claude-4-Sonnet scores 31.2% and Doubao-1.5-Thinking 31.9%.

#### Analysis / Ablations

The real value here is in the ablations, not the headline numbers.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/fig6-grounding-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6. Grounding ablations. (a) RL consistently improves over SFT, and zoom-in adds a further gain. (b) A balanced 50:50 grounding:navigation mix is best. (c) Synthetic high-resolution data helps, especially on ScreenSpot-Pro."
   zoomable=true %}

- <strong>RL and zoom-in (Figure 6a)</strong>: RL consistently beats SFT-only. ScreenSpot-Pro goes 52.3 → 52.7 (RL, no zoom-in) → 53.3 (RL + zoom-in); OSWorld-G 54.1 → 54.1 → 55.3. The zoom-in adds the final increment, indicating the model learns not only from RL but also to actively use zoom-in for small or cluttered elements.
- <strong>Data-mixture ratio (Figure 6b)</strong>: varying grounding:navigation across 0:100, 30:70, 50:50, 70:30 shows the two data types complement each other. Even with zero grounding data (0:100), ScreenSpot-Pro still reaches 41.2 — navigation data carries grounding signal — while adding grounding data doesn't hurt navigation. Tellingly, OSWorld-Chrome collapses to 0.0 at 0:100 but recovers to 22.7 at 50:50, showing that even navigation presupposes grounding ability. <strong>The balanced 50:50 mix is best overall</strong> (ScreenSpot-Pro 50.1, above the grounding-heavy 70:30's 49.5).
- <strong>Synthetic high-resolution data (Figure 6c)</strong>: adding it nudges ScreenSpot-V2 (89.5 → 90.0) and helps more clearly on the hard ScreenSpot-Pro (48.3 → 48.9) — high-resolution data is particularly useful for precise localization.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/fig7-rl-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7. AndroidWorld RL ablations. (a) The fewer the SFT steps, the larger RL's relative gain. (b) Action type (AT) alone is insufficient; AT + dense grounding (DG) is best."
   zoomable=true %}

The navigation-side ablations carry the core lessons of training small models.

- <strong>CoT and synthetic data (Table 4)</strong>: on AndroidWorld, baseline 13.7 → short-CoT 15.8 → long-CoT 19.6 — longer reasoning traces lift multi-step performance. Scaling synthetic data on top of long-CoT from 5K → 13K → 17K pushes it further, 20.3 → 22.4 → 25.2 (about +6 points), evidence that scaling diverse synthetic data works.

| Model Variants | AndroidWorld success (%) |
|------|------|
| Baseline (no CoT / synthetic data) | 13.7 |
| + Short CoT | 15.8 |
| + Long CoT | 19.6 |
| + Syn. data (5K) | 20.3 |
| + Syn. data (13K) | 22.4 |
| + Syn. data (17K) | 25.2 |

- <strong>RL shines most when SFT is scarce (Figure 7a)</strong>: adding RLVR on top of 2K, 6K, and 10K SFT checkpoints improves all of them, but <strong>the gain is largest when SFT steps are fewer</strong> — RLVR compensates for limited SFT.
- <strong>Reward design is everything (Figure 7b)</strong>: comparing four configurations — action type only (AT), sparse grounding only (SG), AT + SG, and AT + dense grounding (DG). <strong>Using only the action-type reward drops below even SFT-only</strong> (correct positions are never reinforced). Grounding reward alone improves tapping but doesn't beat the SFT baseline. Combining the two yields consistent gains, and <strong>dense grounding beats sparse grounding</strong>. It is a direct demonstration of how much careful RLVR reward structure matters for small GUI agents.

Additionally, a grounding-dataset ablation (Table 6) shows that removing OS-Atlas causes the largest drop on ScreenSpot-Pro (−6.80), confirming it is the most critical source for high-resolution desktop grounding.

#### Limitations and Critical Assessment

- <strong>An inherent navigation ceiling.</strong> As the authors concede, multi-step navigation is tightly coupled to model scale. OSWorld 19.8% is good among 3B but far from commercial SOTA (40s). Packing enough long-horizon planning and self-reflection into a small model remains the fundamental hard problem here.
- <strong>RL reward sensitivity = a reproducibility burden.</strong> The finding that "reward design decides performance" cuts both ways. It means sensitivity to hyperparameters — the dense reward's $\lambda$, the sample counts (8+4 / 32), the online-filtering threshold — and with no code or weights released, external reproduction is hard.
- <strong>The internal OSWorld-G inconsistency.</strong> The abstract (61.2) and the body tables (55.3) disagree by 6 points. In a paper that emphasizes verifiable, quantitative reporting, a mismatched headline number dents credibility.
- <strong>No latency or memory numbers.</strong> Despite the "on-device" framing, no real-device inference latency, memory footprint, or battery impact is reported. Zoom-in effectively looks at one input twice, raising inference cost, yet that cost-accuracy trade-off is not quantified.
- <strong>GPT-4o dependence in synthetic data.</strong> The CoT and QA data are generated via GPT-4o SoM prompting. This is distillation of a larger model's reasoning into a smaller one, which caps quality at the teacher's level and carries licensing and reproducibility constraints.

#### Takeaways

- <strong>A small GUI agent is the sum of "data + inference-time tools + reward design."</strong> There's no single trick; the unified action space, synthetic data, zoom-in, and RLVR each add a few points to push a 3B model up to 7B-tier grounding.
- <strong>Grounding and navigation help each other in one model.</strong> A 50:50 mix is best, and grounding ability is a prerequisite for navigation (0% grounding → 0% on OSWorld-Chrome). There's little reason to train the two abilities separately.
- <strong>RL rewards are all about "what you reinforce."</strong> In a small model, rewarding action type alone actually regresses, and adding a dense grounding reward is what makes it climb steadily. There's a clear regime where the shape of the reward matters more than model size.
- <strong>Grounding is nearly solved; navigation is wide open.</strong> When a 3B hits 91.6 on ScreenSpot-V2, the marginal value of single-screen grounding shrinks. The next frontier is multi-step planning, error recovery, and long-horizon stability — and small models still have a long way to go there.
- <strong>The value of a "lessons" paper.</strong> What endures isn't one SOTA line but the ablations recording what worked and what didn't. They become a ready starting point for anyone building on-device agents next.

#### References

- Paper: [Ferret-UI Lite: Lessons from Building Small On-Device GUI Agents (arXiv:2509.26539)](https://arxiv.org/abs/2509.26539)
- Code/weights: not released
- Lineage: [Ferret-UI (arXiv:2404.05719)](https://arxiv.org/abs/2404.05719), Ferret-UI 2, and other Apple GUI-understanding work

#### Further Reading

- **[Ferret-UI: Grounded Mobile UI Understanding with Multimodal LLMs](https://arxiv.org/abs/2404.05719)** (You et al., 2024) — the direct ancestor of Ferret-UI Lite; the first MLLM to understand mobile UI screens with referring, grounding, and reasoning.
- **[UI-TARS: Pioneering Automated GUI Interaction with Native Agents](https://arxiv.org/abs/2501.12326)** (Qin et al., 2025) — the key baseline whose action taxonomy Ferret-UI Lite borrows and against which it compares on many benchmarks.
- **[OS-ATLAS: A Foundation Action Model for Generalist GUI Agents](https://arxiv.org/abs/2410.23218)** (Wu et al., ICLR 2025) — the RL grounding data and the source of the Android Control evaluation setting; the most important grounding dataset in the ablation.
- **[OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments](https://arxiv.org/abs/2404.07972)** (Xie et al., NeurIPS 2024) — the benchmark for computer-use agents in real OS environments, where Ferret-UI Lite's navigation ceiling is most visible.
- **[DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300)** (Shao et al., 2024) — introduces GRPO, the optimization algorithm Ferret-UI Lite's RLVR uses.

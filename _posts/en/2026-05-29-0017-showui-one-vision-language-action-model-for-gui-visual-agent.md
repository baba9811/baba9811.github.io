---
layout: post
title: "[Paper Review] ShowUI: One Vision-Language-Action Model for GUI Visual Agent"
date: 2026-05-29 14:00:00 +0900
description: "A GUI agent that 'sees' screenshots like a human and clicks. A deep dive into ShowUI's UI-guided token selection and interleaved vision-language-action streaming, which hit 75.1% zero-shot grounding with a 2B model and 256K data."
tags: [gui-agent, vision-language-action, multimodal, visual-grounding, token-selection, computer-use]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/fig3-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/
ko_url: /papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Kevin Qinghong Lin et al. (9 co-authors, National University of Singapore · Microsoft) |
| Venue | CVPR · 2025 |
| arXiv | [2411.17465](https://arxiv.org/abs/2411.17465) |
| Code | [showlab/ShowUI](https://github.com/showlab/ShowUI) |
| Data | Self-collected web grounding 22K + AMEX mobile 97K + OmniAct desktop + GUIAct navigation — 256K samples total |
| <span style="white-space: nowrap">Review date</span> | 2026-05-29 |

#### TL;DR

- ShowUI is a GUI visual agent that operates from **pixels alone** — no HTML, no accessibility tree — clicking and typing the way a human does. Built on top of Qwen2-VL-2B with three design choices, a **2B model with just 256K data hits 75.1% zero-shot Screenspot grounding**, beating both 7B and 18B models.
- The centerpiece is **UI-Guided Visual Token Selection**: neighboring screenshot patches are grouped by RGB into a UI connected graph, and redundant tokens within a component are randomly skipped during training. Because positions are preserved (unlike token merging, which pools them away), grounding barely degrades while visual tokens drop ~33% and training speeds up 1.4x.
- **Interleaved Vision-Language-Action Streaming** unifies navigation's visual-action history and grounding's multi-query setup into a single stream, and **careful data curation plus balanced sampling** yields a small-but-strong corpus. Everything is open-sourced at [showlab/ShowUI](https://github.com/showlab/ShowUI).

#### Introduction

Graphical User Interfaces are the primary channel through which people interact with the digital world, so "an agent that takes natural-language instructions and operates the screen" has long been a goal for workflow automation. Most early approaches were **language agents**: they feed text-rich metadata behind the screen — HTML, accessibility trees — to a closed-source LLM like GPT-4 and let it pick the next action. That's powerful when clean text structure is available, but real users have no access to such a "structural oracle." They **look at the screen and move the mouse**. On mobile apps, canvas-based design tools, or games, the DOM carries almost no meaning, or there is no reliable text metadata at all.

The recent shift is toward **GUI visual agents** — models that take the screenshot directly and perceive and operate the UI visually, like a person. This transition comes with three domain-specific challenges. (a) **Expensive visual modeling**: UI screenshots are typically 2K resolution, so patchifying them explodes the token count and the long-context cost of self-attention. (b) **Managing interleaved vision-language-action**: actions differ across devices (mobile's `PRESS HOME` doesn't exist on web; `SCROLL` is two-directional on web but four-directional on mobile), and navigation accumulates multi-step screenshot-and-action history. (c) **Diverse training data**: GUI data spans web, mobile, and desktop with different purposes (grounding vs. navigation), and it's unclear how to select and mix it.

ShowUI answers all three with three targeted designs. What makes it worth reading is that the answer isn't "scale up a bigger model" but **efficiency that exploits the structure of the GUI domain**. Token-compression tricks borrowed from natural-image research break down on GUIs, and this paper cleanly shows why they break and what should fix them.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/fig2-comparison.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2. (Left) zero-shot Screenspot grounding accuracy vs. model size and training scale. ShowUI-2B is the smallest, trained on the least data, yet most accurate. (Right) UI-guided token selection cuts visual tokens by 33% and speeds up training 1.4x."
   zoomable=true %}

#### Key Contributions

- **UI-Guided Visual Token Selection**: build a UI connected graph that groups redundant screenshot patches in RGB space, and use it as the criterion for token selection inside self-attention — reducing visual-token redundancy and compute with no extra trainable parameters.
- **Interleaved Vision-Language-Action Streaming**: standardize actions as JSON and unify navigation's visual-action history with grounding's multi-query setup into one interleaved stream, so a single model handles diverse GUI scenarios.
- **Small, high-quality instruction-following datasets**: analyze the value of each data type (static text is 40% of web data but low-information), keep only visually rich elements, and use balanced sampling to correct imbalance — training on 256K samples total.
- **Results**: a 2B model leads zero-shot Screenspot grounding at 75.1% (ahead of 7B/18B models) and is competitive on AITW (mobile), Mind2Web (web), and MiniWob (online) navigation. Model and code fully released.

#### Background

**Two families of GUI agents.** One is **training-free**: convert the GUI to HTML, read the accessibility tree, or textualize the screen via OCR / Set-of-Marks, then hand it to a closed-source LLM. Powerful, but reliant on expensive APIs and useless when no text oracle exists. The other is **training-based**: take a model pretrained on large vision-text corpora and directly train element grounding or navigation. SeeClick is the canonical example that grew grounding ability from web screenshots; ShowUI belongs to this second family.

**Grounding vs. navigation.** GUI tasks come in two flavors. **Grounding** maps an instruction ("click this button") to a coordinate $[x, y]$ — one screenshot, one query. **Navigation** changes the screen over multiple steps to reach a goal — accumulated history. The two have different input structures and are usually handled separately; ShowUI fuses them into a single streaming format.

**Why natural-image token compression fails on GUIs.** The compute bottleneck in a Vision Transformer is the cascaded self-attention over long token sequences. For natural images, token pruning or token merging (ToMe) collapses similar patches to shrink the sequence. But GUI grounding lives or dies by **exact position**. Pooling tokens together (merging) erases where on the screen a token came from, so you can no longer emit a coordinate. ShowUI draws inspiration from Mixture-of-Depth (MoD): rather than merging, **route past a subset of tokens, but keep the surviving tokens' original positional embeddings**. The open question is the routing criterion — and ShowUI replaces a learned router with a **free prior: the UI connected graph**.

#### Method / Architecture

ShowUI uses Qwen2-VL-2B as its backbone and adds three components. The loop is: take the task query, a predefined action space (provided as a README in the system prompt), and an initial screenshot → predict the next action → update the screen → repeat. Visual tokens and textual (action) tokens are interleaved into one sequence through self-attention.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/fig3-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3. Overview of ShowUI. Starting from a task query, action space, and initial screenshot, it stacks visual observations (green) and action history (orange) into an interleaved stream and generates the next action step by step."
   zoomable=true %}

### UI Connected Graph: catching GUI redundancy with RGB

The key insight is that UI screenshots are fundamentally different from natural images. Natural images are rich in texture and pattern, so nearly every patch carries information; UIs are full of empty space, flat backgrounds, and repeated regions, so **a large fraction of patches are redundant**. And because UIs use consistent color schemes for readability, visually identical regions have **almost exactly the same RGB values**. That property is a free redundancy signal.

ShowUI divides the screenshot into a patch grid, treats each patch as a graph node, and connects two neighboring patches when their RGB difference is below a threshold $\delta$. The screen then collapses into $K$ connected components, with $K$ far smaller than the original patch count $G\_h \times G\_w$. The connection test is:

$$
\| \mathrm{RGB}(i, j) - \mathrm{RGB}(i', j') \| < \delta
$$

where $(i', j')$ are the right and below neighbors of $(i, j)$. Components are found efficiently with Union-Find.

```text
Algorithm 1: Find Connected Components on UI-Graph
Input:  screenshot of size H × W, patch size c, threshold δ
Output: assignment map from patch to connected component
1: split image into G_h × G_w patches (G_h = H/c, G_w = W/c); each patch is a node
2: initialize Union-Find structure UF over all nodes
3: for each node (i, j) do
4:     for neighbors (i', j') to the right and below do
5:         if ‖RGB(i,j) − RGB(i',j')‖ < δ then
6:             UF.union((i, j), (i', j'))
7: return assignment map from UF
```

The nice part is that this graph sets the component count **adaptively** to the screen's information content. A whitespace-heavy Google search page compresses 1296 patches into 291 components, while a text-dense Overleaf page only goes down to 986 — the compression rate isn't a hand-tuned hyperparameter; the screen decides it.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/fig5-uigraph-examples.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5. UI-connected graphs built from mobile (a–d), PC (e–f), and web (g–h) screenshots. Sparse screens (e.g. 1272→175) yield few components; text-dense screens (e.g. 1296→740) yield many. Compression adapts to information content."
   zoomable=true %}

### Token Selection vs. Token Merging: keep the position

With the UI connected graph in hand, we use it to shrink the tokens. Two options:

- **Token Merging**: pool all patches in a component into a single token. The token count drops to the number of components, but pooling **destroys the positional information** of the individual patches — fatal for grounding.
- **Token Selection (ShowUI's choice)**: within a component, **randomly skip** a fraction of tokens during training, and leave single-patch components untouched. The surviving tokens **keep their original positional embeddings**, so self-attention operates over a shorter sequence while preserving the original spatial relationships. No extra trainable parameters.

Token selection is inserted into self-attention blocks, wrapped by Pooling / Un-Pooling so tokens are reduced and restored only in some layers. During training a fixed ratio is randomly masked; at inference, selection can be turned on (faster) or off (more accurate). Either way the positional relationships across the full sequence stay consistent.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/fig4-token-selection.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4. (Left) the screenshot is split into 28×28 patches and patches with identical RGB are grouped into a UI connected graph. (Right) token merging collapses a component into one token and loses position, while token selection samples a subset of tokens and keeps their original spatial relationships."
   zoomable=true %}

For scale: a 1344×756 PC screenshot becomes roughly 5184 raw tokens at 14×14 patching, and Qwen2-VL's 2×2 merge brings it down to 1296. Self-attention over that is still heavy, and token selection shaves it further.

### Interleaved Vision-Language-Action Streaming

The second component is how actions weave into the other modalities. ShowUI standardizes every action as JSON:

```text
{'action': 'CLICK', 'value': None, 'position': [0.18, 0.50]}
{'action': 'TYPE',  'value': 'las vegas', 'position': [0.54, 0.42]}
```

The coordinate `[x, y]` is normalized to 0–1, unifying actions across devices and resolutions. On top of that, a **README** documenting each action's usage goes into the system prompt (e.g., "`CLICK`: click an element; value not applicable; position required"). This pushes the model to **read the action-space document and interpret it at test time, function-call style**, rather than memorizing a fixed action set — so it can handle novel actions unseen during training.

How actions weave with other modalities depends on the task (Figure 6):

- **Action-Visual Streaming (navigation)**: screenshots and actions alternate in temporal order. After the $i$-th action, the $(i+1)$-th screenshot enters the queue, and the model emits the next action from it. Parts of the visual history can optionally be masked — mobile keeps screenshots because the software changes the screen substantially, while web masks them since the page stays relatively static, improving efficiency.
- **Action-Query Streaming (grounding)**: multiple query-action pairs over a single screenshot are predicted **in one forward pass**. Screenshot tokens (1–2K) dwarf the queries (fewer than 10 tokens), so one-image-per-action is wasteful. Bundling many queries per screen sharply raises data utilization.

History length is set to 2. Thanks to this streaming design, grounding and navigation — two tasks with different input structures — are trained with **one model and one format**.

#### Training Objective

ShowUI's objective is a plain **language-modeling loss** over action tokens on the interleaved stream, with no auxiliary loss. As Figure 6 shows, visual tokens enter only as context (conditioning), and the LM loss applies to the action (action-visual mode) or the action corresponding to a query (action-query mode). In a sequence $\{\text{screenshot}, \text{action}\_1, \text{screenshot}\_2, \text{action}\_2, \dots\}$, only the action spans are next-token-prediction targets:

$$
\mathcal{L} = - \sum_{t \in \mathcal{A}} \log p_\theta\!\left(a_t \mid a_{<t}, \; v_{\le t}\right)
$$

where $\mathcal{A}$ is the set of action-token indices, $a\_t$ is the $t$-th action token, and $v\_{\le t}$ is the visual observation up to that point (the compressed representation after token selection). UI-guided token selection leaves the objective untouched and only shortens the length of $v$ — no extra parameters, no extra loss term, which is the elegance of the design.

#### Training Data and Pipeline

The third contribution is data. The authors refuse to "scrape everything in" and instead analyze the value of each type. On the web, the `static text` tag accounts for 40% of elements, but since most VLMs already have OCR, it carries **low information value**. So they keep only visually rich elements like `Button` and `Checkbox`.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/tab1-data.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1. Overview of ShowUI's instruction-tuning data: grounding (web/mobile/desktop) and navigation (web/mobile), totaling 256K samples and 2.7M elements."
   zoomable=true %}

| Type | Source | Scale | Notes |
|------|--------|-------|-------|
| Grounding · web | self-collected (PyAutoGUI parser, 22 sites) | 22K screenshots / 576K elements | static text filtered, visual elements only (avg 26 per screenshot) |
| Grounding · mobile | AMEX | 97K screenshots / 926K elements | element grounding + functionality |
| Grounding · desktop | OmniAct | 100 screenshots / 2K raw annotations | augmented with GPT-4o for appearance/spatial/intention queries → 6K elements |
| Navigation · web | GUIAct | 72K / 569K (9 actions, avg len 7.9) | one/multi-step |
| Navigation · mobile | GUIAct | 65K / 585K (5 actions, avg len 9.0) | multi-step |
| **Total** | Diverse | **256K samples / 2.7M elements** | |

Scale varies wildly across types (desktop has only 100). Mixed naively, training would tilt toward the largest sets. So **balanced sampling** gives each batch a comparable probability of including every type, with weights (Web : Mobile : Desktop : GUIAct-Web : GUIAct-Mobile) = (1 : 1 : 1 : 1 : 1).

**Training setup.** Backbone Qwen2-VL-2B. LoRA (rank 64, alpha 128) on both the language model and the vision encoder trains only 4% of parameters. Instruction-tuning runs on 32 V100s, downstream adaptation on 8. Batch size 1 per GPU with gradient accumulation 2, float16, DeepSpeed Zero-2, SDPA attention, learning rate 1e-4, max visual patch 1280. The UI-graph is applied to both the vision encoder and the LM with a 0.75 masking ratio and cross-layer insertion at layer 14, history length 2. Full instruction-tuning takes about 2 days.

#### Experiments

### Grounding — Screenspot

Screenspot is a zero-shot grounding benchmark that locates text/icon elements across mobile, desktop, and web.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/tab2-grounding.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2. Zero-shot grounding on Screenspot. ShowUI (2B, 256K) reaches 75.1% average, ahead of UGround-7B (73.3, 1.3M) and GPT-4V-based OmniParser (73.0)."
   zoomable=true %}

ShowUI (2B, 256K) hits **75.1%** average, ahead of UGround-7B (73.3, with 1.3M data), GPT-4V-based OmniParser (73.0), SeeClick-9.6B (53.4), and CogAgent-18B (47.4). The grounding-only variant ShowUI-G (119K) is nearly tied at 74.9. In short, **a smaller model with less data does better**.

The breakdown is telling. (i) Text-track scores beat icon-track across all models — text grounding transfers well from web/mobile data, while icons are pure visual grounding and harder. (ii) Icons score higher on mobile, because mobile UI grounding data was more abundant than desktop/web. (iii) Mixing in navigation data doesn't hurt grounding when balanced sampling is used.

### Mobile Navigation — AITW

AITW (Android in the Wild) is an Android environment with 11 action types. ShowUI reaches **70.0** overall, ahead of Qwen2-VL-2B (67.2), SeeClick (59.3), and OmniParser (57.7). Compared to the variant without interleaved streaming (visual history), ShowUI† (68.3), **visual context contributes +1.7**. With a large action space (11), seeing the previous screen matters for picking the right action. It also confirms that zero-shot navigation learned from GUIAct transfers.

### Web Navigation — Mind2Web

Mind2Web probes generalization across Cross-Task, Cross-Website, and Cross-Domain splits. ShowUI's Step Success Rate is 37.2 / 35.1 / 35.2 respectively — comparable to SeeClick — and even the 2B zero-shot variant reaches 80%+ Operation F1. The interesting finding is that **visual context helps less here than on AITW**: Mind2Web concentrates on visually similar single websites with only three actions, so the previous screen carries little value. And since cross-website/cross-domain are the harder splits, the authors conclude the **bottleneck is UI visual perception (unseen sites/domains), not textual task understanding**. The path forward is "training data with good visual domain diversity."

### Online — MiniWob

MiniWob is an online interactive environment on a 35-task split. ShowUI scores 71.5, ahead of SeeClick (67.0) and Qwen2-VL-2B (66.8). But the zero-shot variant ShowUI-ZS is only 27.1, a large gap from fine-tuned Qwen-VL (48.4). The authors read this as: offline instruction-tuning alone doesn't adequately address out-of-distribution errors, and an **online-tailored learning strategy (e.g., RL)** is needed.

#### Analysis / Ablations

The ablations target the design choices of UI-guided token selection.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/fig9-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9. Ablations on UI-guided token selection. (a) compression method: token merging collapses (34.7 with test-time application), random selection 56.2, UI-graph selection 70.4/64.9, close to baseline 70.8. (b) insertion layers: cross-layer wins. (c) selection ratio: 0.5 balances speed and accuracy."
   zoomable=true %}

**Compression method (9a).** Baseline (no compression) is 1344.0 #Vis.Ctx at 70.8 Screenspot. Token **merging** shrinks training tokens to 852.8 but accuracy collapses to 42.3 (training-only) / 34.7 (test-time too) — direct evidence of lost position. **Random** token selection gives 65.3 / 56.2, better than merging but still costly. ShowUI's **UI-graph** token selection achieves **70.4 (training-only) / 64.9 (test-time too)** at 947.4 tokens, essentially matching baseline 70.8. So as a criterion for "which tokens to drop," the UI connected graph is far more effective than random. Applying it at test time loses a little to resolution (64.9), but stays far more reliable than random (56.2).

**Insertion layers (9b).** With the same number (14) of layers receiving token selection, **cross-layer** insertion (alternating selected and non-selected layers, 70.5) clearly beats early-only (68.2), late-only (67.6), and all-28 (65.7). Interestingly, reducing tokens at every layer hurts — some layers need full tokens to restore information.

**Selection ratio (9c).** From ratio 0 (no compression, 70.8) to 1.0 (max compression, 64.5), tokens fall 1344→762 but so does accuracy. 0.5 (947 tokens, 70.4) is the proposed sweet spot. The deployed setting uses a 0.75 masking ratio per the appendix, which corresponds to Figure 2's "33% reduction, 1.4x speedup."

**Interleaved streaming (Figs 10–11) and data (Table 6).** Multi-turn streaming progresses faster in the early warmup phase and uses data better; the visual+action+multi-turn setting consistently beats action-only. On data: (i) quality matters — OmniAct, with only 2K elements, rivals web data and improves further with GPT-4o augmentation. (ii) The self-collected 22K web data beats SeeClick's 270K — filtering static text shrinks element size without hurting performance (evidence that static text is less informative to a VLM). (iii) Balanced sampling adds +3.7% accuracy.

#### Limitations and Critical Assessment

- **Author-acknowledged**: ShowUI is trained mostly on offline data. Strengthening it for deeper exploration in online environments (e.g., via RL) is future work, and the MiniWob zero-shot gap (27.1 vs. 48.4 fine-tuned) exposes this limit.
- **Fragility of exact RGB matching**: the UI connected graph assumes neighboring patches have nearly identical RGB. On screens heavy with anti-aliasing, gradients, or photos/thumbnails (image-centric shopping/media pages, app-icon grids), compression may be poor, and the sensitivity to the threshold $\delta$ isn't deeply analyzed in the main text.
- **Training speedup ≠ inference speedup**: the 1.4x in Figure 2 is a **training** gain. Turning token selection off at inference keeps accuracy (70.4) but yields no speedup, while turning it on (64.9) costs accuracy. Latency/cost inside a real agent loop is not reported.
- **Narrow grounding evaluation**: quantitative grounding is concentrated on the Screenspot family. Robustness to varied resolutions, locales, and themes (dark mode, etc.) is only shown qualitatively.
- **Baseline breadth**: beating larger models on grounding is impressive, but there's no comparison of the ceiling from "scaling the same 2B backbone with more data / a bigger model," so the efficiency gain and the data effect aren't disentangled.

#### Takeaways

- **Domain structure over scale.** A 2B model with 256K data beat 7B/18B GUI models on grounding. Data quality, balanced sampling, and visual-token efficiency outran brute scaling.
- **GUIs have a redundancy prior that natural images don't.** The RGB-based UI connected graph is a free, parameter-free compression signal unique to GUIs — the idea is "exploit the domain's structure for free."
- **In grounding, position is everything.** The ablation where token merging (loses position) collapses and token selection (keeps position) survives makes plain that preserving position is non-negotiable when emitting coordinates.
- **Treat actions like function calls.** Standardizing actions as JSON and documenting the action space via a README lets one model handle device-specific actions and interpret novel ones unseen in training.
- **The bottleneck in GUI navigation is visual perception, not text.** What blocks cross-domain generalization is the ability to read an unseen screen, not task understanding. The next data push should be toward "visually diverse."

#### Installation and Usage

ShowUI is open-sourced at [showlab/ShowUI](https://github.com/showlab/ShowUI), with checkpoints on Hugging Face as `showlab/ShowUI-2B`. Being a Qwen2-VL derivative, it loads directly with `transformers`. Below is a minimal grounding (coordinate-prediction) skeleton; for exact preprocessing helpers, follow the repo's examples.

```python
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor

model = Qwen2VLForConditionalGeneration.from_pretrained(
    "showlab/ShowUI-2B", torch_dtype="auto", device_map="auto"
)
processor = AutoProcessor.from_pretrained("showlab/ShowUI-2B")

# Feed a system README describing the action space + a screenshot + a query,
# and the model outputs {'action': 'CLICK', 'value': None, 'position': [x, y]}.
messages = [{
    "role": "user",
    "content": [
        {"type": "image", "image": "screenshot.png"},
        {"type": "text", "text": "Click the search button"},
    ],
}]
text = processor.apply_chat_template(messages, add_generation_prompt=True)
# then tokenize with the processor -> model.generate -> parse position [x, y] (0–1 normalized)
```

#### References

- Paper: <https://arxiv.org/abs/2411.17465>
- Code: <https://github.com/showlab/ShowUI>
- Model card: <https://huggingface.co/showlab/ShowUI-2B>
- CVPR 2025 Open Access: <https://openaccess.thecvf.com/content/CVPR2025/html/Lin_ShowUI_One_Vision-Language-Action_Model_for_GUI_Visual_Agent_CVPR_2025_paper.html>

#### Further Reading

- **[SeeClick: Harnessing GUI Grounding for Advanced Visual GUI Agents](https://arxiv.org/abs/2401.10935)** (Cheng et al., 2024) — the canonical work pretraining GUI grounding from web screenshots; ShowUI's direct comparison and data baseline.
- **[OmniParser for Pure Vision Based GUI Agent](https://arxiv.org/abs/2408.00203)** (Lu et al., 2024) — a pure-vision GUI parser that hands structured elements to GPT-4V; a baseline ShowUI beats end-to-end.
- **[Navigating the Digital World as Humans Do: Universal Visual Grounding for GUI Agents (UGround)](https://arxiv.org/abs/2410.05243)** (Gou et al., 2024) — a 7B universal grounding model trained on large data, which ShowUI-2B overtakes with far less data.
- **[Qwen2-VL: Enhancing Vision-Language Model's Perception of the World at Any Resolution](https://arxiv.org/abs/2409.12191)** (Wang et al., 2024) — ShowUI's backbone; any-resolution processing and dynamic token counts underpin high-resolution GUI inputs.
- **[Mixture-of-Depths: Dynamically Allocating Compute in Transformer-Based Language Models](https://arxiv.org/abs/2404.02258)** (Raposo et al., 2024) — routing past tokens to allocate compute dynamically; the direct inspiration for ShowUI's token selection.
- **[CogAgent: A Visual Language Model for GUI Agents](https://arxiv.org/abs/2312.08914)** (Hong et al., 2023) — an 18B VLM for high-resolution GUIs; the big-model, big-data foil that highlights ShowUI's efficiency.

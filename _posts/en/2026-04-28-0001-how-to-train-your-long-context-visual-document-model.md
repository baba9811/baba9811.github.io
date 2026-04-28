---
layout: post
title: "[Paper Review] How to Train Your Long-Context Visual Document Model"
date: 2026-04-28
description: "How to train a 344K-context visual document VLM — the first large-scale, open recipe spanning CPT, SFT, LongPO and self-improvement."
tags: [long-context, vlm, document-understanding, sft, cpt, preference-optimization, multimodal]
categories: paper-review
giscus_comments: false
related_posts: false
thumbnail: assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/fig1-checkpoints-overview.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0001-how-to-train-your-long-context-visual-document-model/
ko_url: /papers/0001-how-to-train-your-long-context-visual-document-model/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Author | Austin Veselka (LightOn) |
| Venue | arXiv preprint · 2026 |
| arXiv | [2602.15257](https://arxiv.org/abs/2602.15257) |
| Code & models | [lightonai/distilabel · lc_sft_pipelines](https://github.com/lightonai/distilabel/tree/lc_sft_pipelines), [HF collection: lightonai/orion](https://huggingface.co/collections/lightonai/orion) |
| Review date | 2026-04-28 |

## TL;DR

- **What:** The first comprehensive, large-scale public recipe for training 24B–32B VLMs out to **344K-token context** for long-document VQA. Covers CPT, SFT, LongPO and self-improvement — backed by extensive ablations.
- **How:** Synthetic data over 250K PDFs / 16M pages, distilled into the model with a novel **recursive answer generation** pipeline. Validated on both Mistral 24B and Qwen3 VL 32B.
- **Result:** A Qwen3 VL 32B with plain-distillation SFT matches Qwen3 VL 235B A22B on both MMLBD-C and MMLongBenchDoc, setting **SOTA at 32B scale**. The 24B Mistral checkpoint surpasses GLM 4.1V Thinking 9B in its size class.
- **Four surprising findings:** (1) training at the **evaluation context length** beats training longer by 1.4–3.0 points; (2) prepending a one-line **page index** to each image gives +2.8 — but only if it's also present at training time; (3) visual long-context training **transfers to text long-context** (HELMET +11.5); (4) the synthetic pipeline enables **self-improvement** with no external teacher (+3.2 to +3.8 visual-LC points).

## Introduction

Long-context capabilities matter for summarization, in-context learning and QA — and the LLM community has built a deep stack around them: cheaper attention (Linear, Mamba), context extension (YaRN), CPT/SFT recipes, and preference optimization like LongPO. **Long PDFs**, however, are a different story. Routing them through OCR/text extraction loses information and adds cost. VLMs that consume page images directly are the natural fit, yet outside the video domain there's surprisingly little work on long-context VLMs.

Recently, Qwen3 VL and GLM 4.5/6V became the first open-weight models to overtake GPT-4o and Claude on MMLongBenchDoc — but **their data pipelines and training recipes are underspecified**. This paper fills that gap. It asks "what actually works in practice?" and answers with end-to-end recipes for **CPT, SFT, LongPO, and self-improvement** applied to 24B Mistral and 32B Qwen3 VL, at industrial scales (up to 100B tokens, 344K context, multi-stage SP=48 ring attention).

What makes this paper interesting is not the SOTA number itself, but several findings that no hyperparameter sweep would surface. First, **train context = eval context** — the opposite of ProLong's lesson, and the paper reconciles the contradiction cleanly. Second, **a page-index prefix** that costs nothing yields +2.8 points. Third, the authors release **MMLBD-C**, a corrected MMLongBenchDoc, exposing that 251 of 1091 examples in the standard benchmark were noisy. Each of these is the kind of finding that only emerges from running the full experiment honestly.

## Key Contributions

- **Open recipes + large-scale ablations.** End-to-end CPT/SFT/LongPO recipes up to 344K context, with a public leaderboard of ablations (data composition, merging strategy, every benchmark score).
- **Page indices.** Prepending `Page N:` to each image lifts MMLBD-C by +2.8 and visual-LC average by +2.8.
- **Targeting benchmark context length.** Matching training context to evaluation context outperforms training on longer contexts by 1.4–3.0 visual-LC points.
- **MMLBD-C release.** A corrected MMLongBenchDoc: 251 of 1091 examples modified, 16 removed.
- **Self-improvement.** The synthetic pipeline enables weak-to-strong improvement (+3.8 VA via CPT, +3.2 via SFT) on Mistral with no external teacher.
- **Visual LC → text LC transfer.** Visual long-context training boosts text long-context performance (+11.5 on HELMET) — the reverse of the text → vision transfer shown by Zhang et al. (2024a).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/fig1-checkpoints-overview.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1. Best training recipes vs base models vs the previous SOTA Qwen3 VL 235B A22B. SFT + CPT outperforms LongPO and sets a new MMLBD-C SOTA."
   zoomable=true %}

## Background and Related Work

### Where long-context VLMs stand

Most existing long-context VLM work targets **video understanding**, which differs statistically from long-document understanding (static pages, dense text, tables/figures with precise numerics, frequent intra-document reference). Docopilot (Ge et al., 2024) is the closest direct precursor; this paper substantially exceeds it in scale and breadth.

### Long-context synthetic data

After Magpie-style instruction synthesis became standard, several long-context-specific recipes followed (LongAlign, ProLong). This paper adds two new pipelines: **multi-page question generation** (with a verifier that filters out questions answerable from any single page) and **recursive answer generation**, the latter being the key enabler of self-improvement.

### LongPO

LongPO (Chen et al., 2025) adapts DPO to long context by generating the **chosen response from short context** (where the question was authored) and the **rejected response from long context** (the full document). To prevent the reference model from going OOD on long inputs, the reference scores are also computed from short context:

$$
\mathcal{L}_{\text{LongPO}}
= -\lambda \, \mathbb{E}\!\left[
\log \sigma\!\left(
\beta \log \frac{\pi_\theta(y_w \mid x_L)}{\pi_{\text{ref}}(y_w \mid x_S)}
- \beta \log \frac{\pi_\theta(y_l \mid x_L)}{\pi_{\text{ref}}(y_l \mid x_S)}
\right)
\right]
+ \mathcal{L}_{\text{NLL}}
$$

with $\lambda = 0.01$ heavily down-weighting the preference term relative to the NLL. Conceptually: "**preserve, in long context, what the model does well in short context.**"

### MMLongBenchDoc and MMLBD-C

MMLongBenchDoc (Ma et al., 2024b) is the de facto long-document VQA benchmark. The authors found that 1091 examples contained problems like document-mismatch (a question paired with the wrong PDF), underspecified questions, typos, and answers marked unanswerable despite explicit evidence. They built a recursive consistency-checking pipeline, flagged 342 examples, and after manual review, **modified 251 and removed 16** to release MMLBD-C. The takeaway: when ablation deltas are 0.5 points, you should worry whether you're measuring model capability or label noise.

## Method / Architecture

### Base models and context extension

- **Mistral Small 3.1 24B**: native 128K context, **extended to 344K** here. Base checkpoint is public, so CPT starts from base.
- **Qwen3 VL 32B Instruct**: native 256K, **kept as-is** (no RoPE θ change). No public base, so all training starts from instruct.

Mistral's RoPE θ is already $10^9$, large enough that no further adjustment was needed for 344K — a benefit of context-aware pretraining design.

### Multi-stage training

344K-token training requires SP degree 16–48, which is communication-heavy. The authors split everything into:

- **Stage 1 (short)**: examples up to 104 pages, 128K-token packed sequences
- **Stage 2 (long)**: examples up to 336 pages, 336K (Mistral) or 256K (Qwen3 VL)

This split was an efficiency choice — but turned out to enable the discovery that **training only on the short stage is better** for benchmarks under 128K.

### Model merging

Naive CPT/SFT/LongPO causes catastrophic forgetting of instruct skills. The fix is **task-vector merging** (Ilharco et al., 2023): subtract the base/instruct weights from the trained checkpoint to get a "training vector," then add it back to the instruct model with a scaling factor (0.5 for Mistral CPT, 0.25 elsewhere). Cheap and effective at preserving instruct quality while picking up LC ability.

### Data corpus

Following ColPali, the authors recursively expand search queries from broad categories (arxiv, government, finance, energy, healthcare, AI) → web scrape → dedup/render/length filter → **250K PDFs, 16M pages**. They additionally use **PDFA English** (2M PDFs / 18M pages). They mine **hard negatives** with an in-house DSE model (top-128 most similar pages per page) to construct distractor-rich, RAG-like examples.

### CPT tasks

How to synthesize image+text long-context data:

1. **Fill-in-the-Middle (FIM)**: remove a page, parse it with Mistral, train the model to regenerate the missing text.
2. **Unshuffle**: scramble page order, model must restore. **Fully programmatic — no model calls required.**
3. **Key/position-based retrieval**: retrieve text near a given key, or described by position.
4. **Counting** (novel): label per-page counts of an instance, then build a long-context example where the model produces a chain-of-thought listing each page's count and the final sum.

Tasks 1–3 only need a single page annotated to generate a long-context example, making them **enormously scalable**. Mixed in: ProLong's LC text data, so CPT covers vision and text together. **Drop-one ablation**: FIM (-3.0 VA), Unshuffle (-2.1), K/P Retrieval (-1.7), Prolong text (-1.3), Counting (-0.7). Unshuffle being so impactful is striking — no teacher model is needed to generate the data, yet it forces global document structure understanding.

### SFT pipelines

**Question generation:**

- **Magpie** (baseline): just hand the VLM a page and let it complete — usually a simulated user question.
- **Single-page**: random page + a randomly sampled question-archetype prompt (e.g. "ask a difficult question with a short verifiable answer that requires reasoning"). Generate several questions per page and keep one — avoids **mode-averaging** to the obvious question.
- **Multi-page**: feed several pages (adjacent / random / hard negatives) and ask for cross-page reasoning. **Verifier**: a smaller VLM tries to answer each question from each page individually; questions answerable from any single page are dropped.

Interestingly, Magpie vs the SP+MP pipelines barely differ in VA (Table 17 in the paper). The real lever is **answer generation**.

**Answer generation:**

- **Plain distillation** (baseline): pass the entire long-context example to Qwen3 VL 235B A22B and take its answer. Simple, but needs a strong teacher.
- **Recursive pipeline** (proposed): for each page, extract evidence relevant to the question and assign a numerical relevance score; then pass top-k pages or extracted evidence into Qwen3 VL 235B A22B (multimodal) or Qwen3 235B (text). **In effect, this distills RAG-over-pages into the model itself.**

Recursive beats plain on VA, LCA, MMLongBench, SlideVQA, LongBench v2 — but slightly trails on MMLBD-C. Crucially, **recursive enables self-improvement**: because the answer requires search over the full context, you can use the model itself as the "teacher" and still see meaningful improvements.

### Page indices

A single line per image:

```text
Page 1:
<image>
Page 2:
<image>
Page 3:
<image>
...
```

That's it. Train+eval with page indices: MMLBD-C +2.8, visual-LC average +2.8. **Eval-only** page indices actually hurt (-1.0 VA) — the model needs to have seen this format during training to use it.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/tab5-page-indices.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5. Page-index ablation. Gains only materialize when present at both train and eval. Eval-only is harmful."
   zoomable=true %}

## Training Objectives

### CPT and SFT

Standard next-token prediction. Sequences are packed (no truncation), and loss is **normalized by assistant token count** — the usual instruction-tuning convention of excluding prompt tokens from loss.

### LongPO

As above (Eq. 1):

$$
\mathcal{L}_{\text{LongPO}}
= -\lambda \, \mathbb{E}\!\left[
\log \sigma\!\left(
\beta \log \frac{\pi_\theta(y_w \mid x_L)}{\pi_{\text{ref}}(y_w \mid x_S)}
- \beta \log \frac{\pi_\theta(y_l \mid x_L)}{\pi_{\text{ref}}(y_l \mid x_S)}
\right)
\right]
+ \mathcal{L}_{\text{NLL}}
$$

The key is that the **reference policy in the denominator sees short context $x_S$**, sidestepping the standard DPO failure where the reference model goes OOD on long inputs. With $\beta = 0.1$, $\lambda = 0.01$, the NLL is the dominant signal and preference is a gentle nudge.

## Training Data and Pipeline

### Length distributions — the crux

| Dataset | Unit | Mean | Median | Max | N examples |
|---------|------|------|--------|-----|------------|
| Ours: Short Stage | images | 21.1 | 9 | 104 | 52,433 |
| Ours: Long Stage | images | 145.3 | 156 | 336 | 22,076 |
| ProLong: 64K | tokens | 1,350 | 533 | 64K | 83.8M |
| ProLong: 512K | tokens | 1,262 | 484 | 512K | 60.4M |

This table resolves the apparent contradiction with ProLong. **ProLong's "512K stage" only has 512K as a maximum** — its median is 484 tokens. So when ProLong concluded "training longer helps," it was effectively training mostly short. This paper's long stage has a median of 156 pages — genuinely long. Same recipe knob, very different distribution.

### CPT token allocation

| Task | Short (B) | Long (B) | Total (B) |
|------|-----------|----------|-----------|
| ProLong LC Text | 35.9 | 3.8 | 39.7 |
| Fill-in-the-Middle | 24.3 | 10.1 | 34.5 |
| Key/Position Retrieval | 15.2 | 6.3 | 21.5 |
| Unshuffle | 12.2 | 5.1 | 17.2 |
| Counting | 2.4 | 0.0 | 2.4 |
| **Total** | **90.0** | **25.3** | **115.3** |

Of the 100B-token budget, ProLong text is the largest single slice but multimodal tasks together dominate.

### Hyperparameters

| Phase | Schedule | Max LR | Warmup/Decay | β1 | β2 | WD | Grad Clip |
|-------|----------|--------|--------------|----|----|----|-----------|
| CPT | Cosine | 4e-6 | 10% tokens | 0.9 | 0.999 | 0.1 | 1.0 |
| SFT | WSD | 5e-6 | 10% samples | 0.9 | 0.999 | 0.1 | 1.0 |
| LongPO | WSD | 5e-7 | 10% samples | 0.9 | 0.99 | 0.0 | 1.0 |

AdamW with ε = 1e-9 throughout. Note LongPO's LR is an order of magnitude lower than SFT's; β = 0.1, λ = 0.01 in Eq. 1.

### Compute

| Phase | Stage | Hardware | SP | DP [shard, replicate] | Batch | Tokens/Batch |
|-------|-------|----------|-----|------------------------|-------|--------------|
| CPT | Stage 1 | H100 | 16 | [16, 6] | 6 | 768K |
| CPT | Stage 2 | H100 | 48 | [16, 6] | 2 | 672K |
| SFT | Stage 1 | H100 | 16 | [16, 3] | 3 | 768K |
| SFT | Stage 2 | H100 | 48 | [16, 6] | 2 | 672K/512K |
| LongPO | Stage 1 | H100 | 48 | [48, 1] | 1 | 128K |
| LongPO | Stage 2 | H200 | 24 | [24, 1] | 1 | 512K |

Sequence parallelism via **ring attention** (Liu et al., 2023; Zhu, 2024). LongPO's batch size is 1 — preference learning depends on sequence-level alignment more than batch diversity.

## Experimental Results

### Evaluation protocol

Raw benchmark scores have very different distributions, so the authors **normalize to the maximum (typically Qwen3 VL 235B A22B) before averaging**:

- **Visual-LC Avg (VA)**: averaged across MMLongBenchDoc, MMLBD-C, MMLongBench, DUDE, SlideVQA. **Primary metric**.
- **LC Avg (LCA)**: VA's set + HELMET + LongBench v2.

Across 3 runs σ(VA) = 0.33 and σ(LCA) = 0.24 — stable. (MMLongBench alone has σ = 1.66 due to the 20-sample-per-task limit.)

### Headline result: best checkpoints

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/tab6-best-checkpoints.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 6. Best checkpoints vs baselines. Qwen3 VL 32B + plain distill SFT matches the 235B teacher on MMLBD-C and MMLongBenchDoc."
   zoomable=true %}

In short:

- **Qwen3 VL 32B + plain-distillation SFT (short-stage)**: MMLBD-C 57.3 (vs Qwen3 VL 32B 53.8, +3.5), **MMLongBenchDoc 56.3** — essentially matching the 235B teacher's 56.7 at 32B scale.
- **LongPO (Qwen3 VL 32B, distill, short-stage)**: MMLBD-C 56.4 (+2.6); VA 94.6, slightly above SFT but at >2× the compute.
- **Mistral plain distillation**: MMLBD-C 47.4 (vs 24B base 41.4, +6.0), MMLongBenchDoc 46.8 — **surpassing GLM 4.1V Thinking 9B (42.4)** in the under-32B class. HELMET +16.0 — the visual training transferred dramatically to text long-context.

### CPT token-horizon ablation

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/tab1-cpt-token-horizons.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1. CPT at 1B / 10B / 100B tokens. VA saturates almost at 1B, but MMLBD-C and LCA continue improving up to 100B."
   zoomable=true %}

- VA almost saturates by 1B tokens, but MMLBD-C and LCA keep climbing through 100B.
- HELMET (text LC) jumps +14.6 by 100B — visual LC CPT transfers strongly to text LC.
- Applied to Qwen3 VL with the same 10B-token CPT data, it transfers cross-family: MMLBD-C +2.1, MMLB 128K +1.6.

### Train context vs eval context

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/tab4-short-vs-long-stage.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4. Short stage only vs short + long. Short-only wins consistently across SFT and LongPO."
   zoomable=true %}

Three independent settings (Mistral SFT, Qwen3 VL SFT, Qwen3 VL LongPO) all show the same pattern: **short-stage-only beats short+long** by 1.4–3.0 VA points. This contradicts ProLong's lesson — but only superficially, since (per the distribution table above) ProLong's "long" data was actually short.

### LongPO vs SFT — compute trade-off

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/fig7-compute-vs-va.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7. Training compute vs VA. LongPO outperforms SFT on VA (+2.1) but at >2× compute. Training too long is also clearly visible as a regression."
   zoomable=true %}

LongPO wins on VA (+2.1) but costs 2× the GPU-hours. **For MMLBD-C specifically, plain-distillation SFT is more compute-efficient**.

### Self-improvement

| Checkpoint | VA | MMLBD-C | HELMET |
|------------|-----|---------|--------|
| Self-Improvement (SFT only) | 83.8 (+3.2) | 45.2 (+3.8) | 32.4 (-4.7) |
| Self-Improvement (Instruct + CPT) | 82.9 (+2.3) | 43.3 (+2.0) | 42.3 (+5.3) |
| CPT (100B) self-improving | 84.4 (+3.8) | 42.7 (+1.3) | 51.7 (+14.6) |

These runs use **no external teacher** — just Mistral and its own CPT checkpoint generating answers via the recursive pipeline. CPT 100B is strongest at +3.8 VA; SFT alone still gets +3.2 VA at far less compute. A genuine weak-to-strong loop.

### Visual LC → text LC transfer

Removing ProLong text data and CPT-ing Mistral on **visual LC only** for 10B tokens raised HELMET from 37 to 48.5. So the HELMET gains from CPT aren't just from the mixed text data — visual long-context training itself transfers.

## Analysis / Ablations

### CPT and SFT are not additive

The intuition that "extend context with CPT, then teach the task with SFT" should compound is wrong here. Table 2 in the paper shows **SFT alone is essentially competitive with SFT + CPT** on most benchmarks (HELMET being the exception). Mistral instruct's native 128K context already covers most of MMLongBenchDoc (which is mostly under 100 pages). The toy 150–300 page experiment shows SFT-from-CPT does pull ahead at extended lengths — so CPT pays off precisely **when you push past the instruct context limit**. Implication: under compute pressure with sufficient native context, skip CPT.

### CPT task importance

Drop-one ablation: drop FIM −3.0 VA, drop Unshuffle −2.1, drop K/P Retrieval −1.7, drop LC text −1.3, drop Counting −0.7. Unshuffle's outsized impact is striking because it requires no teacher model — fully programmatic, infinitely scalable, and apparently teaches a strong inductive bias for global document structure.

### Recursive vs plain distillation

In SFT, recursive beats plain by VA +1.1 / LCA +1.9. In **LongPO, the two are essentially tied** (Table 24). The asymmetry is interesting: the sophistication of answer generation matters under SFT but gets washed out under preference optimization. The practical recommendation: **for LongPO, just use the strongest available teacher; recursive is unnecessary**. For self-improvement, recursive is essential.

### Single- vs multi-page questions

Single-page-only training beats multi-page-only by 6.8 points on MMLongBench (Table 16). MMLongBench, despite its name, is more **retrieval-sensitive than cross-page-reasoning-sensitive**. The combination is the most robust setting.

### External SFT data

Table 22 has a subtle pattern: 25K of external SFT data **hurts** VA (-1.2), but 400K of external SFT data **helps** slightly (+0.2). Small mixes only cause distribution shift; large mixes contribute to general-skill preservation. Rule of thumb: if you mix external SFT data, mix a lot.

## Limitations and Critical Assessment

Author-acknowledged:

- **Benchmarks underrepresent extreme lengths.** Most LC benchmarks cap below 128K, so the 344K-extended context can't be fully validated.
- **Incomplete understanding of CPT × SFT interaction.** Their non-additivity hints at room for mixed-stage training or replay strategies.

Reviewer-side observations:

- **Single author / single corpus.** All training data comes from LightOn's scraped corpus + PDFA. Generalization to other domains (medical, legal, technical manuals) is untested.
- **Page-index generality.** While page indices help paginated benchmarks (+2.8 on MMLBD-C / MMLB), they **hurt LongBench v2 (-3.0)**. This is glossed over in the takeaway. The intervention is page-aware, not universal.
- **Compute reporting.** The footnote that "SFT compute is in addition to CPT" makes the SFT-vs-LongPO compute comparison feel a touch selective.
- **MMLBD-C self-validation concerns.** The benchmark was corrected with the same recursive pipeline used for training (though under manual review), and then the corrected benchmark is used to score models trained with that pipeline. Some risk of domain-fit inflation, though plain-distillation models also do well, suggesting the effect is small.
- **Limited preference baselines.** No SoLoPO or other recent preference methods compared.

## Takeaways

1. **Train context = eval context.** Match training distribution to your benchmark — training "more general" with longer contexts is often over-engineering. Worth 1.4–3.0 VA points.
2. **Page indices for +2.8.** Practically free, **but only if present at training time**. The general lesson: if you add a meta-token at eval, you need it at train, or you get an OOD penalty.
3. **Recursive answer generation = the key to self-improvement.** When no stronger teacher exists, use your own model as the teacher and have it produce answers via per-page retrieval. **This isn't naive self-distillation — you're distilling a search algorithm into the model.** +3.2 to +3.8 VA.
4. **Visual ↔ text LC transfer is bidirectional.** The reverse of Zhang et al. (2024a)'s text-to-vision transfer holds (+11.5 HELMET). Long-context capability looks more like a modality-agnostic skill than a per-modality one.
5. **Question your benchmarks.** 251 of 1091 MMLongBenchDoc examples were noisy. Before reading much into a 0.5-point ablation delta — ask whether you're measuring capability or label noise.

## Setup and Usage

The authors release a Hugging Face collection and a GitHub repository.

```bash
# Synthetic data pipelines (distilabel)
git clone -b lc_sft_pipelines https://github.com/lightonai/distilabel.git
cd distilabel
pip install -e .

# Models on Hugging Face
# https://huggingface.co/collections/lightonai/orion
```

Loading a checkpoint and respecting the page-index format:

```python
from transformers import AutoModelForCausalLM, AutoProcessor

# Use the actual repo id from the orion collection.
model_id = "lightonai/<orion-checkpoint>"
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype="auto", device_map="auto")
processor = AutoProcessor.from_pretrained(model_id)

pages = [...]  # list of PIL images, one per page
prompt_parts = []
for i, img in enumerate(pages, start=1):
    prompt_parts.append(f"Page {i}:\n<image>")
prompt = "\n".join(prompt_parts) + "\n\nQuestion: <your question>"

inputs = processor(text=prompt, images=pages, return_tensors="pt").to(model.device)
out = model.generate(**inputs, max_new_tokens=512)
print(processor.decode(out[0], skip_special_tokens=True))
```

Critical detail: **keep the `Page N:` prefix at evaluation time too**. Drop it and you give back the +2.8.

## References and Resources

- Paper: <https://arxiv.org/abs/2602.15257>
- Code (distilabel SFT pipelines): <https://github.com/lightonai/distilabel/tree/lc_sft_pipelines>
- Models (HF collection): <https://huggingface.co/collections/lightonai/orion>
- Mistral Small 3.1 base: <https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503>
- Qwen3 VL 32B base: <https://huggingface.co/Qwen/Qwen3-VL-32B-Instruct>

## Further Reading

- **LongPO** (Chen et al., 2025) — origin of the short-to-long preference objective. This paper's LongPO experiments are its first application to a visual long-context setting at scale.
- **ProLong** (Gao et al., 2025b) — the standard long-context CPT recipe; this paper borrows their text data and exposes the limitation that their "long" distribution is in fact short-skewed.
- **MMLongBenchDoc** (Ma et al., 2024b) — the de facto long-document VQA benchmark; this paper releases a corrected version, MMLBD-C.
- **Qwen3-VL Technical Report** (Bai et al., 2025a) — the SOTA model used as comparator and teacher; recipe details are largely unspecified.
- **GLM 4.5V / 4.1V Thinking** (Z.ai, 2026) — strong open-weight VLMs that the 24B Mistral checkpoint surpasses in size class.
- **Long context transfer from language to vision** (Zhang et al., 2024a) — the original text-to-vision transfer paper that this work reverses.

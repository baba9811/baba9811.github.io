---
layout: post
title: "[Paper Review] Accurate Decoding of Natural Sentences from Non-Invasive Brain Recordings"
date: 2026-08-24 14:00:00 +0900
description: "Meta AI's Brain2Qwerty v2 collects 90 hours and 2,724 unique sentences of MEG from nine people, then chains a CTC encoder, a word aligner, and a LoRA-tuned LLM to decode natural sentences from non-invasive brain signals at 39% WER"
tags: ["brain-computer-interface", "meg", "brain-to-text", "ctc", "llm", "lora", "neuroscience"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/fig2-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/
ko_url: /papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Mingfang (Lucy) Zhang et al. (12 co-authors across Meta AI · ENS-PSL · BCBL and others) |
| Venue | arXiv preprint · 2026 |
| arXiv or DOI | [2608.18114](https://arxiv.org/abs/2608.18114) |
| Code | [facebookresearch/brain2qwerty](https://github.com/facebookresearch/brain2qwerty) |
| Data | EnglishBCBL — nine healthy adults × 10 hours of MEG (306-channel Megin), 2,724 unique sentences, ~22,000 sentences typed in total |
| <span style="white-space: nowrap">Review date</span> | 2026-08-24 |

## TL;DR

- Natural sentences typed by a person are decoded from non-invasive MEG alone at an average **WER of 39%**. The best participant reaches 22% WER, with 28% of test sentences decoded with zero word errors and 47% within a single word edit. That is a twofold improvement over the previous state of the art (52% for the best subject in Brain2Qwerty v1).
- The unlock was data, not architecture. Going from 1 hour to 10 hours per participant drops the CER of an *asynchronous* encoder — one that never sees keystroke timings — from 0.59 to 0.25, closing to within 2 points of the *synchronous* encoder that does get those timings (0.23). Scaling is log-linear with no sign of saturation at 90 hours (slope −0.39 CER per decade).
- The pipeline jointly trains three levels. A CTC encoder (BrainModule + Conformer) handles characters, a SigLIP aligner maps MEG embeddings onto word embeddings, and a LoRA-tuned Qwen3 handles sentences. The piece that stitches them together is the **CTC tokenizer**: it chunks the continuous MEG embedding stream at the frames where CTC predicts a space.
- The LLM is not a grammar corrector bolted onto CTC output. Ablating the MEG tokens out of the prompt alone worsens WER from 0.43 to 0.49 — the model really is reading neural signal.
- Three autonomous AI coding agents (Cursor running Claude Opus 4.6) were set loose on the tuning problem and comfortably beat Optuna TPE (cross-subject test WER: Optuna 0.493, no improvement, vs. 0.42 / 0.43 / 0.45 for the agents, up to −16%). Given the open-ended task of reproducing v2 starting from the v1 codebase, all three failed outright.

## Introduction

Almost every recent win in restoring communication to people who have lost speech or movement has come from *invasive* BCIs. Patients with electrodes over motor cortex have produced language via attempted speech (Moses et al., 2021; Willett et al., 2023; Card et al., 2024), handwriting (Willett et al., 2021), and typing (Pandarinath et al., 2017; Jude et al., 2026), at speeds and accuracies approaching natural speech. The cost is real: neurosurgery carries medical risk, recording quality is hard to maintain over long periods because of neuroinflammatory responses, and providing surgical infrastructure to a broad patient population is a logistical problem in its own right.

Non-invasive alternatives have been on the table for years, each with a disqualifying weakness. EEG's poor signal-to-noise ratio makes the task cognitively demanding to the point of impracticality. fMRI's temporal resolution is intrinsically too low for real-time communication. MEG has long been the most promising middle ground, and the same group's previous work — Brain2Qwerty v1 (Lévy et al., 2025) — decoded typed text at 32% CER by training a classifier time-locked to each keystroke.

That approach had three structural problems. First, it needs to *know when each keystroke happened* — which in real use is precisely the unknown. Second, classifying characters well does not guarantee reconstructing a sentence; a few misclassified characters make the output unreadable. Third, the data was thin: invasive BCIs typically work with thousands of sentences over 10–40 hours, while v1 had one hour per participant.

This paper attacks all three. Nine volunteers were recorded for 10 hours each across 90 sessions, producing a 22,000-sentence corpus. A CTC (Connectionist Temporal Classification) objective removes the timing dependency. An LLM handles sentence-level reconstruction. And on top of that sits one more experiment: handing the optimisation of the pipeline itself to autonomous AI agents. Even if you never touch a non-invasive BCI, two things here are worth your time — the point at which data scale beats architecture, and a practical recipe for attaching an LLM as a decoder for a non-linguistic modality.

## Key Contributions

- **Pushing non-invasive sentence decoding near the useful range.** 39% WER on average, 22% for the best subject. Compare that with the 0.92–0.94 WER Tang et al. (2023) report for reconstructing *perceived* speech from fMRI: this is a qualitatively different regime for recovering exact words.
- **Separating data quantity from sentence diversity as two independent axes.** In a controlled comparison matched for total sentence count and number of subjects, 256 unique sentences typed once beats 128 unique sentences typed twice by CER 0.45 vs. 0.65 — and the result holds without any language model in the loop.
- **The CTC tokenizer.** A deceptively simple device — segment the continuous neural embedding stream wherever CTC predicts a space token — that beats sentence alignment (0.46) and patch tokenization (0.49) at WER 0.39. It is a generic technique that drops into any CTC-based pipeline.
- **Demonstrating that the LLM reads neural signal rather than correcting text.** An ablation removing the MEG tokens from the prompt degrades all three metrics. What makes this striking is that the adaptation happens from roughly 2,700 unique sentences, orders of magnitude less data than is typically used to fine-tune a language model.
- **A controlled comparison putting autonomous AI agents in the research loop.** The agents are benchmarked head-to-head against Optuna TPE on an identical compute budget, and both the success case (constrained hyperparameter tuning) and the failure case (open-ended architecture invention) are reported.

## Background

### Synchronous vs. asynchronous decoding

This distinction matters most for understanding the paper. **Synchronous decoding** cuts a short window (about 3 seconds) time-locked to each keystroke and classifies the character inside it. This is what Brain2Qwerty v1 does. It is accurate, but something external has to supply the keystroke timing. **Asynchronous decoding** takes a continuous response window of 10+ seconds and generates a text sequence from it. No timing information is needed, so real-time use becomes possible — but the model has to find the alignment itself, which is a substantially harder problem.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/fig1-scale-and-variety.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Asynchronous MEG decoding is unlocked by recording scale and variety. A shows the experimental protocol and MEG source reconstruction at keystroke onset, B contrasts the synchronous and asynchronous approaches, C compares dataset scale, D–E show the two encoders' CER, F the scaling with data, and G the effect of sentence repetition."
   zoomable=true %}

### CTC — learning sequences without alignment

CTC (Graves et al., 2006) is an objective borrowed from speech recognition that trains variable-length input against variable-length output *without frame-level alignment labels*. The key idea is the blank token: at each time frame the model emits either a character or a blank, and training maximises the summed probability of *every* path whose collapse — merging repeats, deleting blanks — yields the target string. Here the vocabulary is 28 classes: blank (index 0), 26 lowercase letters (1–26), and space (27).

CTC does two jobs in this pipeline. One is removing the timing dependency. The other is providing the basis for the CTC tokenizer that comes later — the frames where the greedy path emits a space are an estimate of word boundaries.

### BrainModule, Conformer, and SigLIP

**BrainModule** (Défossez et al., 2023) handles the physical layout of the MEG sensor array. Sensors are scattered in 3D space and the number of active channels varies across sessions, so channel coordinates are encoded as two-dimensional Fourier features and the variable-length sensor array is projected onto a fixed 270 virtual channels. A per-subject affine layer conditioned on subject index absorbs individual sensor geometry without explicit sensor-level co-registration.

**Conformer** (Gulati et al., 2020) is a speech-recognition block that interleaves convolution and self-attention: convolution captures local temporal structure, attention handles long-range dependencies. The paper's appendix shows that swapping the Conformer for a standard Transformer alone worsens encoder CER from 0.25 to 0.28.

**SigLIP** (Zhai et al., 2023) is a variant of CLIP-style contrastive learning that replaces the softmax with a pairwise sigmoid binary cross-entropy. It needs no batch-wide normalisation, which makes it simpler to implement and stable at small batch sizes. Here it is used to pull MEG-derived word embeddings onto the LLM's actual word embeddings.

## Method / Architecture

{% include figure.liquid loading="eager"
   path="assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/fig2-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: The Brain2Qwerty v2 architecture. The only input is the continuous MEG recording for one sentence; three jointly optimised modules handle characters (Encoder, CTC loss), words (Aligner, SigLIP loss), and sentences (LLM, cross-entropy)."
   zoomable=true %}

### Level 1 — characters: the MEG encoder

The encoder has two stages.

**BrainModule.** Channel coordinates are encoded as two-dimensional Fourier features (total embedding dimension 2,048) and mapped onto 270 virtual channels, followed by a per-subject affine layer conditioned on subject index. The resulting spatially fused $B \times 270 \times T$ representation ($T$ being the number of time frames at 100 Hz) feeds a four-layer dilated convolutional network (hidden dimension 1,500; kernel size 5; dilation period 3) with GELU activations, batch normalization, residual skips scaled by 0.1, and dropout (input 0.2, convolutional 0.5). An initial linear projection reduces the channel dimension to 512 before the convolutional stack. A strided 1D convolution (kernel 16, stride 4) then cuts temporal resolution by four, giving roughly one frame per 40 ms.

**Conformer.** The downsampled sequence goes through a four-layer Conformer (model dimension 1,024, four attention heads, feed-forward dimension 1,024, depthwise convolution kernel width 17, dropout 0.3). A linear head over the output produces the 28-class character distribution.

Training uses an auxiliary CTC head attached right after temporal downsampling (before the Conformer) and trained jointly. The composite loss is:

$$
\mathcal{L} = (1-\alpha)\,\mathcal{L}_{CTC}^{\text{final}} + \alpha\,\mathcal{L}_{CTC}^{\text{aux}}, \quad \alpha = 0.7
$$

With $\alpha = 0.7$ the auxiliary branch dominates the gradient signal early in training, leaving the Conformer to refine the final representation on top of it (following Nozaki and Komatsu, 2021).

### Level 2 — words: the CTC tokenizer and aligner

Bridging continuous MEG embeddings and the word-level tokens an LLM expects is the practical crux of this pipeline, and the solution is strikingly plain: **cut the Conformer output at the frame positions where the CTC greedy path emitted a space token.** Each word segment (blank frames included) is passed through a two-layer MLP applied per frame, mean-pooled along time into a single neural word embedding, and projected to the LLM hidden dimension by a linear adapter.

The reason this works is statistical. Spaces make up 19% of characters and are robustly predicted, so the predicted word count for **86%** of sentences falls within ±1 word of the ground truth.

Even so, the number of neural tokens $N$ produced by CTC segmentation may differ from the number of target words $M$, so a within-sentence alignment step precedes contrastive learning. A cosine-distance cost matrix is computed between the $N$ neural embeddings and the $M$ target word embeddings (taken from the LLM's input embedding layer), and hard DTW (Sakoe and Chiba, 1978) recovers a monotonic alignment path from which one-to-one pairs are extracted (one target per neural token).

Matched pairs from all sentences in the batch are $\ell\_2$-normalised and fed into a SigLIP loss. For every pair $(i, j)$ across the batch, a sigmoid binary cross-entropy is applied to the scaled cosine similarity:

$$
\text{logit}_{ij} = \tau \langle \hat{\mathbf{w}}_i, \mathbf{w}_j \rangle + b
$$

with $\tau$ and $b$ learnable scalars. The label is 1 whenever the ground-truth embeddings $\mathbf{w}\_i$ and $\mathbf{w}\_j$ have cosine similarity $\geq 0.999$ — i.e. they represent the same word — and 0 otherwise. This duplicate-aware labelling matters: without it, the same sentence appearing across multiple subjects would generate false negatives.

### Level 3 — sentences: the neuro-conditioned LLM

The prompt is constructed as:

```text
[CTC: ‖ <CTC-decoded text tokens> ‖ \nMEG: ‖ <MEG token embeddings> ‖ \nOutput:]
```

The LLM therefore receives two complementary streams. The CTC text anchors it to a plausible linguistic prior; the MEG tokens carry the residual neural information needed to push decoding past that prior.

During training, **modality dropout** independently zeroes random token positions in both the MEG token embeddings and the CTC text tokens (both at rate 0.1), forcing robust conditioning on either modality alone. The loss is cross-entropy with label smoothing 0.02.

The LLM is Qwen3-4B, fine-tuned with LoRA (rank 128, $\alpha = 256$, dropout 0.0) applied to all linear projection matrices. Inference uses beam search with beam size 16, a maximum of 60 new tokens, and length penalty 0.2.

### Model soup — treating each subject as its own task

Three ways of attaching LoRA are compared. *Joint LoRA* pools all nine subjects and trains a single adapter. *Per-subject LoRA* trains nine independent adapters. *Model Soup* (Wortsman et al., 2022) also trains per-subject adapters, then uniformly averages their best-checkpoint state dictionaries into a single adapter applied to everyone.

The intuition is that each subject's MEG signature is a different "task": per-subject adapters specialise on matched neural data, and uniform weight averaging yields one model that generalises across subjects without ever training a heavy joint model.

### Training objective

The overall loss is a weighted sum of three terms:

$$
\begin{aligned}
\mathcal{L} = \; & (1 - \alpha - \beta)\,\mathcal{L}_{\text{CTC}} \\
& + \alpha\,\mathcal{L}_{\text{Contrastive}} \\
& + \beta\,\mathcal{L}_{\text{CE}}
\end{aligned}
$$

- $\mathcal{L}\_{\text{CTC}}$ — character level. This governs how well brain signal maps to a keystroke string, and as the appendix correlation analysis (Figure S5) shows, its quality effectively determines the final performance.
- $\mathcal{L}\_{\text{Contrastive}}$ — word-level SigLIP loss, pulling MEG word chunks into the LLM's word embedding space.
- $\mathcal{L}\_{\text{CE}}$ — sentence-level autoregressive cross-entropy, conditioned on both the CTC text and the neural tokens in the prompt.

Two training regimes were explored. **(i) End-to-end staged training** runs 275 epochs in three stages — CTC only (epochs 0–149), CTC + contrastive (150–224, $\alpha = 0.1$), CTC + contrastive + LLM cross-entropy (225–274, $\beta = 0.01$) — with inactive terms dropped and active weights renormalised to sum to 1. **(ii) Standalone LoRA fine-tuning** freezes the CTC encoder and pre-trained word projector from the best contrastive checkpoint and optimises only the LoRA-adapted LLM for 30 epochs on a single GPU. This lightweight regime enabled rapid iteration over LoRA configurations, LLM sizes, and the model-soup strategy — and *it yielded the best overall results*.

## Data and Pipeline

### The EnglishBCBL dataset

| Item | Value |
|------|-------|
| Participants | Nine healthy adults (50% men, 50% women; mean age 34.6, range 23–56) |
| Criteria | All right-handed, proficient touch typists, typing accuracy ≥ 80%, native English speakers, no neurological or psychiatric history |
| Recording | 10 sessions of ~1 hour per participant = 90 hours total |
| Device | Megin 306 channels (102 magnetometers + 204 planar gradiometers), 1 kHz sampling, online 0.1 Hz HPF / 330 Hz LPF |
| Keyboard | MR-compatible QWERTY keyboard from HybridMojo LLC with modified non-ferromagnetic springs |
| MRI | 3-T SIEMENS Prisma-fit, 64-channel head coil, T1 (TR 2530 ms, TE 2.36 ms, flip 7°, FOV 256 mm, 1 mm³, 176 slices) |
| Sentences | 2,560 drawn at random from a pool of 20,000 simple English sentences generated by Llama 4, filtered to remove special characters and contractions; 2,724 unique in the final analysis including pilot sessions |
| Compensation | 12 euros per hour plus 200 euros on completion |

### Task design

Each trial has three phases — **listen, wait for cue, type**. The sentence audio is played through MEG-compatible headphones, a fixation cross appears for 1.5 seconds, and the offset of that cross marks the start of the typing phase. Crucially, *no letters are displayed on screen while typing*. Participants type as accurately as possible without backspace while fixating on a rotating black square at screen centre — a design choice to avoid eye movements being driven by linguistic content, as they would be in standard left-to-right reading. The minimal feedback is that square rotating clockwise by 10 degrees with each keystroke.

Each session comprises 16 blocks of 16 sentences. The first 4 sentences of every session are practice trials, distinct from the 2,560 experimental sentences; the first two give full visual feedback and the remaining two familiarise the participant with the minimal-feedback condition.

The important property of this design is the **delayed typing**: a forced delay separates listening from typing, so what is being decoded is neural activity during language *production*, not auditory perception.

### Preprocessing and splits

MEG is bandpass filtered at 0.5–45 Hz with a 50 Hz notch, downsampled to 100 Hz, per-channel normalised with a RobustScaler (per-recording median and IQR), and clamped at ±5 robust standard deviations. No signal-space projection was applied.

Splits are made at the level of **unique sentence texts** using a deterministic hash-based splitter with an 80/10/10 ratio. Because assignment is computed from the hash of the sentence text alone, the split is stable regardless of which subjects are in the query, and all events sharing the same sentence text — across subjects and sessions — land in the same partition. Text leakage is exactly zero, which matters a great deal given a pool of only 2,724 sentences.

### Augmentation

MEG segments run from 400 ms before sentence onset (first key pressed) through sentence offset (last key released), extended by a uniformly sampled 400–500 ms buffer to capture post-completion neural activity. During training, temporal jittering randomly crops up to 400 ms from the pre-onset baseline, varying the effective alignment between neural signal and sentence onset across epochs.

On top of that: a per-channel constant offset drawn from $\mathcal{N}(0, 0.3)$ simulates slow-drift artifacts; time masking (maximum mask length 50 frames, application probability 0.2) and an independent channel mask of maximum width 400 along the sensor axis follow SpecAugment (Park et al., 2019); and temporal stretch rescales trial duration by a factor drawn uniformly from $[0.8, 1.2]$ via linear interpolation.

### Compute

| Item | Value |
|------|-------|
| Libraries | neuralset (King et al., 2026) · neuraltrain (d'Ascoli et al., 2026) |
| Optimiser | AdamW, lr $8 \times 10^{-4}$, weight decay $10^{-3}$ |
| Schedule | Linear warm-up 500 steps (start factor 0.01) → Cosine Annealing |
| Precision | BF16 mixed precision, gradient clipping at global norm 1 |
| Batch | 64 × 2 (micro-batch accumulation) × 8 GPUs = effective 1,024 samples |
| Hardware | 8× A100 80 GB |
| Wall clock | 19.5 hours for the full procedure (end-to-end, 275 epochs) |
| Checkpointing | Encoders for the LoRA experiments selected by validation CER, early stopping patience 50 epochs |

### Metrics

- **CER** — Levenshtein edit distance between predicted and ground-truth character sequences, normalised by ground-truth length.
- **WER** — Levenshtein distance at word level after whitespace tokenisation, normalised by the number of ground-truth words.
- **SemER** — the $\ell\_2$ distance between $\ell\_2$-normalised, mean-pooled hidden states of a frozen RoBERTa-large (Liu et al., 2019) applied to prediction and reference. It measures semantic proximity.

CER and WER were implemented via `SequenceMatcher` from the `edit-distance` library and SemER via HuggingFace `transformers`; two-sided Mann-Whitney U tests were used for significance between conditions.

## Results

### Scale unlocks asynchronous decoding

The first question is whether the scale and diversity of the new dataset are enough to close the gap between asynchronous and synchronous decoding. Both encoders were trained on the low-data SpanishBCBL (Lévy et al., 2025) and the new EnglishBCBL.

| Encoder | SpanishBCBL | EnglishBCBL |
|---------|-------------|-------------|
| Encoder Sync (synchronous, Lévy et al., 2025) | 0.39 ± 0.02 | 0.23 ± 0.03 |
| Encoder Async (asynchronous, this work) | 0.59 ± 0.02 | 0.25 ± 0.03 |

Read this carefully. In the low-data regime synchronous decoding wins by a wide margin (0.39 vs. 0.59, a 20-point gap). Scale the data by 10× and that gap collapses to **2 points**. Data substituted for the strong supervisory signal that keystroke timing provided. This is the result the whole paper rests on: the precondition for real-time use can be met without sacrificing accuracy.

The scaling is log-linear. Retraining Encoder Async on progressively larger subsets of EnglishBCBL gives a Pearson $r = -0.99$ ($p = 1.1 \times 10^{-3}$, $R^2 = 0.98$ across the 5 training-fraction conditions) between $\log\_{10}(\text{hours})$ and across-subject mean CER, with a slope of −0.39 CER per decade. There is no sign of a plateau at the current 90-hour ceiling.

### Sentence diversity is a separate axis from quantity

Encoder Async trained on SpanishBCBL reaches CER 0.59, significantly worse than the 0.52 ± 0.02 obtained from training on a similar *amount* of EnglishBCBL data ($p < 0.05$). So the difference is in the nature of the data, not its volume.

What differs is repetition: in SpanishBCBL each unique sentence was typed twice by each participant, while in EnglishBCBL each was typed once. To isolate that, two controlled datasets were constructed matched for total sentence count and number of subjects ($n = 9$) but differing in the number of unique sentences — 128 unique × 2 repetitions (SpanishBCBL protocol) versus 256 unique × 1 (EnglishBCBL protocol).

The result: CER 0.45 ± 0.03 for non-repeated versus 0.65 ± 0.01 for repeated, $p < 0.001$. For the same number of trials, **showing new sentences beats repeating old ones by 20 points**. That is an immediately actionable conclusion for anyone designing a data-collection protocol, and it is cleaner for being an encoder-only result with no language model involved.

### Main results — word and meaning level

{% include figure.liquid loading="eager"
   path="assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/fig3-decoding-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Brain2Qwerty v2 enables word- and meaning-level decoding from MEG. A–C show per-subject CER / WER / SemER for three decoders, D shows per-sentence word-edit counts for the best, median, and worst subjects, and E–F show actual decoded sentences."
   zoomable=true %}

Three approaches are compared: (1) the Encoder alone, with no language model correction, taking the most likely keystroke class at each time step from the CTC logits; (2) Encoder + N-gram, the Brain2Qwerty v1 approach, correcting encoder output with a 6-gram character language model; and (3) the full Brain2Qwerty v2 pipeline.

| Metric | Encoder | Encoder + N-gram | Brain2Qwerty v2 |
|--------|---------|------------------|-----------------|
| CER | 0.28 ± 0.03 | **0.26 ± 0.03** | 0.31 ± 0.03 |
| WER | 0.55 ± 0.04 | 0.43 ± 0.04 | **0.39 ± 0.04** |
| SemER | 0.096 ± 0.003 | 0.085 ± 0.004 | **0.059 ± 0.005** |

Every pairwise comparison reaches $p < 0.005$. On the two metrics most relevant to successful communication — WER and SemER — Brain2Qwerty v2 clearly wins. The SemER improvement over the N-gram baseline (0.085 → 0.059) is especially large, reflecting the LLM's capacity to recover *globally coherent sentence structure* from noisy neural input.

Set against the 0.92–0.94 WER Tang et al. (2023) report for decoding perceived speech from fMRI, this is a substantial step forward in recovering exact words from non-invasive recordings.

### Is the worse CER a defect?

Brain2Qwerty v2's CER (0.31) is in fact *worse* than the Encoder alone (0.28) and the N-gram baseline (0.26). This is a structural consequence of autoregressive LLM decoding. The LLM has been trained to produce fluent sentences even when the encoder output and MEG token signal quality are not sufficient for successful decoding, so it emits incorrect sentences that diverge substantially from the target at the character level.

The failure mode is qualitatively distinct from the N-gram's. Brain2Qwerty v2 produces perfect or near-perfect decoding for the best subject, but the worst subject's output can be a coherent yet entirely different sentence. The paper's example is vivid: for the target *"cars are not allowed on this road"*, the model produces *"had she not fallen down the stairs"*. Grammatically flawless, no gain whatsoever in word or semantic accuracy, and a large CER penalty.

The N-gram model does the opposite: it consistently corrects local character sequences and keeps CER low, but fails to produce lexically correct sentences (see outputs like *"WAS THE DISH THAT YOU NIGHTY IN THE LP BUT"* in Figure 3F). Since successful communication relies on meaning rather than strict character matching, the authors argue the WER and SemER gains are worth the CER cost — and they are right.

That trade-off flips depending on the application, though. As the paper notes, typing a password and responding in a dialogue call for different decoding objectives. Where individual characters matter, a fluent hallucination is the worst possible failure.

### How often is it perfect?

| Subject | Perfect decodings (zero word edits) |
|---------|-------------------------------------|
| Best | 28% (47% within a single word edit) |
| Median | 15% |
| Worst | 4% |

Even for the median and worst subjects, the typical error mode is a single substituted or missing word rather than a collapse into an unrelated sentence. The appendix's difficulty-band analysis (Figure S3) supports this. On the easiest band the best subject is verbatim on 5 of 6 sentences and the median subject differs by at most one or two words — and those errors are almost always meaning-preserving or grammar-preserving substitutions, like *"travel by plane"* → *"travel alone"* or *"car"* → *"computer"*. On harder bands the substitutions become longer-range and sometimes merely topic-adjacent, but the output remains grammatical.

### CTC tokenizer and LoRA strategy

{% include figure.liquid loading="eager"
   path="assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/fig4-tokenizer-and-lora.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: CTC Tokenizer and tuned LLM adaptation cut WER by 20% over baseline alignments. A compares three alignment strategies, B shows word-count calibration, C an example of word retrieval, D the LoRA rank sweep, and E LLM backbone scaling with target-module ablation."
   zoomable=true %}

**Alignment strategies.** CTC tokenizer WER 0.39 ± 0.04, sentence alignment (one embedding per sentence; Zhang et al., 2026) 0.46 ± 0.04, patch tokenization (a fixed number of equally-spaced chunks per sentence, inspired by ViT; Dosovitskiy et al., 2021) 0.49 ± 0.05, all at $p < 0.005$. In a typical sentence, 8 of 9 words are recovered at rank 1 (Figure 4C).

**LoRA rank sweep.** Across $r \in \{1, \ldots, 256\}$ the three strategies trace clearly different paths. Joint LoRA wins at small ranks ($r = 2$, WER 0.43); above that the single adapter has enough capacity to memorize the limited sentence pool (~2.7K unique sentences) and WER worsens. Per-subject LoRA and Model Soup each see about 10× less data and never reach that overfitting regime: WER decreases smoothly with $r$, and Model Soup wins at $r = 128$ (WER 0.43). Model Soup also trains *faster* than the joint baseline even at higher rank, since fitting nine small adapters is more efficient than training one large pooled adapter.

**Backbone scaling.** Listing All subjects ($r=2$) / Model soup ($r=128$): Qwen3-0.6B 0.43/0.43, 1.7B 0.42/0.41, 4B 0.42/0.40, 4B with LoRA on all modules 0.41/0.39. Model Soup improves at every step — 0.6B → 1.7B ($p = 0.020$), 1.7B → 4B ($p < 0.01$), attention-only → all modules ($p < 0.01$) — while joint training plateaus near WER 0.41. If you want to cash in on a bigger LLM, Model Soup is the strategy that lets you.

### Autonomous AI agents (Auto Research)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/fig5-auto-research.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: Autonomous AI coding agents discover configurations that outperform classical optimization. A shows the running-best validation WER on S01 over successive experiments, B the test WER of each method's final configuration evaluated on all nine subjects."
   zoomable=true %}

Inspired by Karpathy's autoresearch, three Cursor agents powered by Claude Opus 4.6 were run concurrently. Each had full filesystem and terminal access to a dedicated git worktree on an isolated branch, sharing a common codebase and pretrained checkpoints but maintaining separate configuration files and results directories, with no access to each other's branches. The parent branch configuration was intentionally minimal, exposing only four hyperparameters (learning rate, weight decay, LoRA rank, batch size), the model choice (Qwen3-0.6B with LoRA), and architectural constants.

The agent prompt's rules are worth reading: poll SLURM every 5 minutes and never idle; run exactly 50 jobs per round testing at least 4–5 independent ideas; 45-minute SLURM timeout with hung jobs cancelled immediately; never delete files and never inspect test predictions; use only subject 0 and optimise on validation metrics only. Budget: 10 rounds × 50 jobs = 500 total runs.

The comparison baseline, Optuna (Akiba et al., 2019), ran TPE over the same four parameters on an identical compute budget (v4.8, `multivariate=True`, `group=True`, `constant-liar=True`, `n-startup-trials=32`, 500 trials distributed across 10 batches of 50).

| Method | S01 validation WER | Test WER on all 9 subjects |
|--------|--------------------|-----------------------------|
| Default | 0.45 | reference |
| Optuna TPE | 0.41 (−8.6% relative) | 0.493 ($p = 0.88$ vs. default, no improvement) |
| AutoResearch 1 | 0.38 (−16.1%) | **0.42 (−16.0%)** |
| AutoResearch 2 | 0.36 (−19.8%) | 0.45 (−10.0%) |
| AutoResearch 3 | 0.37 (−17.7%) | 0.43 (−12.7%) |

The cross-subject evaluation is what settles it. Optuna's single-subject gain vanished entirely ($p = 0.88$), while all three agents maintained significant improvements (all $p < 10^{-6}$). What the agents found were genuine innovations that transfer across the population, not artifacts of tuning on S01.

The strategies the three agents independently converged on:

- **Label smoothing** — found by all three in rounds 1–2, providing the largest single-round WER reduction (−0.04 for Agent 1).
- **Modality dropout** — dropping CTC tokens during training forces the LLM to rely more on neural word embeddings than on noisy CTC predictions. Consistently large gains in rounds 5–9.
- **Beam search decoding** of LLM output, enabling multi-hypothesis decoding at test time, in rounds 2–3.
- **Sentence-level contrastive alignment loss**, an auxiliary CLIP-style loss complementing the word-level alignment, in rounds 7–8.
- **Minimal prompts** — reducing the instruction prompt to `CTC:`, `MEG:`, `Output:` rather than verbose task descriptions.

All of these were considered during v2's development, with the final configuration selected by the research team.

### And the failure

Give the same agents an **open-ended objective** — start from the Brain2Qwerty v1 codebase and match the v2 pipeline's performance on EnglishBCBL — and all three consistently fail. Large, entangled code modifications caused the majority of subsequent SLURM jobs to crash before producing valid metrics, and on the rare occasions when a launch did succeed, the agents tended to idle rather than iterate.

The authors' conclusion is measured: AI agents may serve as a powerful force multiplier, but human research remains, for now, a critical part of the scientific process.

## Analysis and Ablations

### Does the LLM actually read the brain?

{% include figure.liquid loading="eager"
   path="assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/figs4-neuro-tokens.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure S4: Brain2Qwerty v2 is a neuroLLM, not a corrector of CTC predictions. Both configurations share the same Qwen3-0.6B backbone; grey conditions the LLM only on encoder predictions, green additionally on the MEG-derived word embeddings."
   zoomable=true %}

The central question for any LLM-based decoder is whether the LLM is reading neural information or merely behaving as a corrector of the encoder's text output using its language priors.

To separate the two, the MEG-derived word embeddings ("Neuro Tokens") produced by the CTC tokenizer and word projector were ablated, conditioning the LLM only on the encoder's predictions. This variant (Brain2Qwerty + LLM) was trained on the same Qwen3-0.6B backbone.

| Metric | Brain2Qwerty + LLM (Neuro Tokens removed) | Brain2Qwerty v2 |
|--------|-------------------------------------------|-----------------|
| CER | 0.38 | **0.34** |
| WER | 0.49 | **0.43** |
| SemER | 0.067 | **0.064** |

Every metric improves (paired Wilcoxon $p \approx 0.004$), with the largest gap on WER (−5.6 points absolute). In the Discussion the authors summarise this degradation as 16% on WER. That the gap is biggest on WER is the informative part: the Neuro Tokens carry *word-level* information the CTC text alone is missing.

This completes the picture of two complementary input streams. The CTC text anchors the LLM to a plausible linguistic prior; the MEG tokens carry the residual neural information that pushes decoding past that prior. Full performance is reached *only when both are provided*.

What is most striking is that this adaptation is obtained from as few as **~2,700 unique training sentences (~90 h of MEG)** — a corpus orders of magnitude smaller than what is typically used to fine-tune a language model.

### The encoder is the bottleneck

{% include figure.liquid loading="eager"
   path="assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/figs5-encoder-importance.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure S5: Encoder CER linearly predicts the model's performance, and architecture choices set the encoder CER. A and B show per-sentence correlations, C compares three encoder architectures."
   zoomable=true %}

Correlating Brain2Qwerty v2's per-sentence WER and SemER against upstream encoder CER shows both downstream metrics scaling linearly with it (Pearson $r$ = 0.78 for WER, 0.68 for SemER). Better keystroke predictions out of the encoder mean better final sentences. Obvious as that sounds, the fact that it holds is itself a counter to the suspicion that the LLM is confabulating plausible sentences independently of the neural signal.

How much does the encoder architecture matter? Three architectures were trained and tested on the same data:

| Encoder architecture | CER |
|----------------------|-----|
| Temporal Patch Transformer (inspired by Zhang et al., 2026; first introduced in Feghhi et al., 2025) | 0.37 ± 0.03 |
| BrainModule + Transformer (very similar to Brain2Qwerty v1; Défossez et al., 2023) | 0.28 ± 0.03 |
| BrainModule + Conformer (this paper) | **0.25 ± 0.03** |

Replacing the Conformer with a standard Transformer increases CER from 0.25 to 0.28 ($p < 0.005$), showing that the Conformer's interleaved convolutional and attention layers are a useful inductive bias for the local temporal structure of MEG signals. Further replacing the BrainModule with a Temporal Patch module pushes CER to 0.37, the worst of the three. Both components pull their weight for low-SNR MEG inputs.

### Multi-subject training pays off substantially

{% include figure.liquid loading="eager"
   path="assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/tab1-multi-subject.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Effect of including the target subject in pretraining and of training on multiple subjects. Per-subject trains the full pipeline from scratch on the target subject only; Joint training trains from scratch on all subjects jointly; LOO + finetune pretrains on the other N−1 subjects, then finetunes on the target with the Conformer frozen."
   zoomable=true %}

The ordering is identical across all three subjects: per-subject worse than LOO + finetune worse than joint training. In WER terms the best subject goes 38.3% → 32.8% → 22.6%, the median 66.5% → 58.6% → 47.8%, the worst 90.6% → 68.3% → 61.4%.

Note that the per-subject regime used a 4× longer training schedule to match the joint regime's number of optimisation steps, and is still consistently the weakest. The limiting factor is data diversity, not compute.

More practically important: LOO + finetune closes most of the gap. A single finetuning pass on a held-out subject gets you most of the way there, supporting deployment to new subjects without retraining the base pipeline from scratch — a decisive property for any clinical rollout.

### Can you get away with fewer sensors?

{% include figure.liquid loading="eager"
   path="assets/img/papers/0035-accurate-decoding-of-natural-sentences-from-non-invasive-bra/tab2-sensor-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: Sensor-count ablation. CER / WER / SemER when the MEG input is randomly subsampled at training time. Values are mean ± SEM across 4 sensor-selection seeds."
   zoomable=true %}

Whole-head MEG arrays like the 306-channel Megin system are bulky, cryogenically cooled, and expensive for clinical or consumer deployment. Optically pumped magnetometers (OPMs), which operate at room temperature in flexible helmets, are emerging as a practical alternative — typically with 50–150 sensors. Can such a low-channel array support this kind of end-to-end sentence decoding?

For each keep-fraction in $\{0.25, 0.50, 0.75\}$ the 306 MEG channels were randomly subsampled to $\{76, 153, 230\}$ sensors respectively, and the entire pipeline retrained with one LoRA for all subjects at rank 2 for simplicity (this configuration's full-array baseline is WER 0.433). The model seed was fixed and four sensor-selection seeds were run per fraction, so within-fraction variance reflects only which sensors were retained.

Performance degrades smoothly and monotonically. Dropping the first 76 channels (306 → 230) costs only +3.4 pp WER over the full-array baseline; the next 77 (230 → 153) costs +2.3 pp; and the final 77 (153 → 76) costs +5.7 pp. SEMs are tight, always ≤ 1 pp on WER.

The practical conclusion matters: **an OPM-class helmet on the order of 150 sensors loses only about 5.7 pp WER versus the full 306-channel baseline.** Paired with the same end-to-end decoding pipeline, low-channel systems should recover most of the performance reported here.

### What happens in the embedding space

A tSNE analysis in the appendix looks inside the encoder. Key representations taken after the BrainModule cluster *by participant* — individual neural signatures survive in the embedding. Representations after the Conformer's last layer, by contrast, cluster clearly *by key class*, and that structure reflects the physical layout of the keyboard. Crucially, this structure is learned: in the embedding space of an untrained Conformer, the key representations still cluster by subject.

## Limitations and Critical Assessment

Starting with what the authors acknowledge:

- **Large inter-individual variability persists** (N-gram CER 17.1%–41.0%). Since final performance is highly correlated with upstream encoder quality, improving the encoder through cross-subject transfer or self-supervised pretraining is the priority.
- **The study uses healthy volunteers** who are effectively typing on a keyboard. Whether the approach transfers reliably to patients — for whom actual key presses will be missing not just during inference but during training and finetuning too — remains to be demonstrated.
- **It is not real-time.** The architecture is not causal and works with an entire sentence, so latency is necessarily high and users cannot see a word as they type it. Low-latency causal Conformers have shown promise for EMG handwriting (Sivakumar et al., 2024), which suggests the direction for follow-up.
- **The gap with invasive systems remains substantial.** State-of-the-art invasive BCIs achieve below 2% WER for typing (Jude et al., 2026) and below 6% CER for handwriting (Willett et al., 2021).
- **Hardware constraints.** A 306-sensor cryogenic MEG remains challenging to adapt to a clinical setting. The sensor ablation and OPM discussion soften this, but nothing was actually validated on an OPM system.

Additional observations from a reviewer's standpoint:

- **The sentence pool is narrow.** 2,724 "simple English sentences" generated by Llama 4, with contractions and special characters filtered out. No proper nouns, no numbers, no domain terminology, no colloquial fragments — none of what real communication requires. It is hard to rule out the LLM leaning on this narrow distribution as a strong prior. The hash-based split prevents literal leakage, but the *distributional* prior advantage remains.
- **There is no evaluation of what 39% WER means in practice.** Four words in ten are wrong. The best subject's 28% perfect and 47% within-one-word is impressive, but no user study measures actual communication outcomes (question answering, message-delivery success rates) at this level.
- **The safety implications of worse CER are only discussed, not addressed.** Generating a fluent but entirely wrong sentence is a serious hazard in a medical communication setting. Picture *"had she not fallen down the stairs"* being presented as a patient's utterance. Confidence estimation or an abstention mechanism seems necessary, and neither is explored.
- **The Auto Research comparison is not entirely apples-to-apples.** Optuna is *by construction* restricted to the four exposed parameters, while the agents can modify code and create new axes. The authors say so explicitly, so the conclusion is not wrong — but the accurate reading is "whoever can expand the search space wins", not "agents beat TPE". There is no comparison over an identical search space.
- **Nine subjects is statistically thin.** With $n = 9$, the minimum achievable $p$ for a paired Wilcoxon test is 0.0039, and every significant comparison in Figure 3 sits at exactly that value. Statistical power is at the floor.
- **SemER is hard to interpret.** It is an $\ell\_2$ distance between RoBERTa-large embeddings, and there is no anchor for what the absolute scale (0.059 vs. 0.096) means semantically. A correlation with human judgement would have helped.

## Takeaways

- **The real finding here is about data, not architecture.** An asynchronous encoder that trailed by 20 points in the low-data regime closes to within 2 points at 10× the data. Data substituted for the strong supervisory signal that keystroke timing provided. That means the trade-off between "usable in real time" and "accurate" can be erased by data — which changes where this field should be investing.
- **For a fixed number of trials, show new sentences rather than repeating old ones.** 128 × 2 vs. 256 × 1 gives CER 0.65 vs. 0.45. This holds without a language model and applies directly to protocol design in any neural recording study where data collection cost dominates.
- **The CTC tokenizer is a portable idea.** "How do I chunk a continuous embedding stream into discrete LLM tokens?" is a problem every non-text-modality → LLM pipeline faces. The answer here is to reuse the *space predictions of a CTC head you already trained* rather than learning a separate segmentation model. Spaces are 19% of characters, so they are robustly predicted, and 86% of sentences land within ±1 word of the true count. Any CTC-based pipeline gets this segmentation for free.
- **The Neuro Token ablation is the experiment to demand from papers like this.** Any work that bolts an LLM onto a decoder invites the suspicion that the LLM is inventing answers from its language prior. Removing only the neural input from the prompt while holding everything else fixed is the minimum answer to that suspicion. Without the 0.43 → 0.49 WER difference, this paper's claim would be far weaker.
- **Treating subjects as tasks and using a model soup works well.** Joint LoRA collapses at higher rank by memorizing a small corpus, while per-subject adapters plus weight averaging improve smoothly up to rank 128 and are the strategy that cashes in on a bigger backbone. This is a reusable pattern across biosignal domains with high inter-individual variability.
- **The same experiment reveals both the success and failure conditions for AI agents.** On a narrowly scoped tuning problem they beat TPE decisively and their gains transfer across subjects. On the open-ended "invent a new architecture" task, large entangled edits produce crashes and the agents idle. The boundary of automation lies in *task structure*, not capability — and reporting the failure alongside the success deserves credit.

## Getting started

The authors released the code:

```bash
git clone https://github.com/facebookresearch/brain2qwerty
cd brain2qwerty
```

Of the pipeline's three stages (CTC encoder → contrastive alignment → LoRA LLM), the standalone LoRA fine-tuning regime yielded the best performance and iterates in 30 epochs on a single GPU. The full end-to-end training takes 19.5 hours on 8× A100 80 GB. Whether the EnglishBCBL dataset itself will be released is not stated in the paper.

## References

- Paper: <https://arxiv.org/abs/2608.18114>
- Code: <https://github.com/facebookresearch/brain2qwerty>
- Auto Research inspiration: <https://github.com/karpathy/autoresearch>

## Further Reading

- **[Brain-to-Text Decoding: A Non-invasive Approach via Typing](https://arxiv.org/abs/2502.17480)** (Lévy et al., 2025) — the direct predecessor, Brain2Qwerty v1. A synchronous classifier time-locked to each keystroke reaches CER 32% from MEG, with EEG results (CER 67%) reported alongside.
- **[Decoding speech perception from non-invasive brain recordings](https://arxiv.org/abs/2208.12266)** (Défossez et al., 2023) — where this paper's BrainModule comes from. Contrastive learning decodes self-supervised representations of perceived speech from M/EEG.
- **[Towards decoding individual words from non-invasive brain recordings](https://arxiv.org/abs/2412.17829)** (d'Ascoli et al., 2025) — decodes individual words from MEG/EEG and shows how much the recording device and experimental protocol dominate performance.
- **[Semantic reconstruction of continuous language from non-invasive brain recordings](https://www.nature.com/articles/s41593-023-01304-9)** (Tang et al., 2023) — recovers the meaning of perceived and imagined speech and silent video from fMRI. This is the work whose 0.92–0.94 WER serves as the comparison point here.
- **[A high-performance speech neuroprosthesis](https://www.nature.com/articles/s41586-023-06377-x)** (Willett et al., 2023) — a landmark on the invasive side, and the yardstick for how far non-invasive approaches still have to go.
- **[Model soups: averaging weights of multiple fine-tuned models improves accuracy without increasing inference time](https://arxiv.org/abs/2203.05482)** (Wortsman et al., 2022) — the origin of the per-subject LoRA weight-averaging strategy used here.

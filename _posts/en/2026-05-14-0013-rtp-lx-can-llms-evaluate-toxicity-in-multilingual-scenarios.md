---
layout: post
title: "[Paper Review] RTP-LX: Can LLMs Evaluate Toxicity in Multilingual Scenarios?"
date: 2026-05-14 19:30:00 +0900
description: "AAAI-25 paper introducing RTP-LX: a human-transcreated, human-annotated corpus of 1,100 toxic prompts across 28 languages, used to stress-test 10 S/LLMs as multilingual safety evaluators."
tags: [toxicity, multilingual, llm-evaluation, safety, benchmark, participatory-design]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/fig1-cohen-kappa-radar.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/
ko_url: /papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Adrian de Wynter et al. (33 co-authors across Microsoft · The University of York) |
| Venue | AAAI · 2025 |
| arXiv | [2404.14397](https://arxiv.org/abs/2404.14397) |
| Code | [microsoft/RTP-LX](https://github.com/microsoft/RTP-LX) |
| Data | RTP-LX corpus: 28 languages × ~1,100 toxic prompts + completions *per language*, professionally transcreated and labelled by 3 native annotators per language |
| <span style="white-space: nowrap">Review date</span> | 2026-05-14 |

#### TL;DR

- The authors release **RTP-LX**, a 28-language corpus of toxic prompts and completions human-transcreated (not translated) from English RealToxicityPrompts, plus a hand-curated subset capturing culture-specific harms. The whole thing is native-speaker labelled across 8 harm categories.
- Ten S/LLMs (small/large LMs) plus ACS and FLORES-Tox-200 baselines are evaluated as toxicity *judges*. On raw accuracy (PA) they look acceptable; on weighted Cohen's $\kappa\_w$ they sit between 0.07–0.40, well below the human inter-annotator agreement of 0.62.
- Models handle *explicit* harm (insult, violence, sexual content) reasonably, but fail across the board on *context-dependent* harm — microaggressions, bias, identity attack. False-positive rates on benign completions range from near-zero (Llama Guard, ACS) to ~40 % (Gemma 2B).

#### Introduction

LLMs and their portable cousins, SLMs, are being shipped into production faster than anyone is auditing their *non-English* safety behavior. Multilingual models like GPT-4 and BLOOMZ already serve users in dozens to hundreds of languages, and the safety guards that pass an English benchmark don't automatically transfer. What counts as harmful is itself culture-dependent: criticism of the monarchy is a prosecutable act in Thailand, "Where are you really from?" reads as a microaggression in U.S. English but may be small talk elsewhere.

The paper's question, in one line: **can we scale multilingual safety evaluation as fast as we scale S/LLMs?** The implicit follow-up — given how expensive native-speaker annotation is, can we substitute S/LLMs themselves as the judges? That's the LLM-as-a-judge paradigm, near-default in evaluation circles because no one wants to hire 28 panels of human annotators every time a new checkpoint drops.

The answer the authors arrive at is largely no. S/LLM judges score plausibly on raw accuracy, but that accuracy is mostly the corpus's class imbalance (most prompts are toxic) being gamed by lazy classifiers. Measured against human majority votes, the agreement is poor — and degrades further on the subtler categories and on low-resource languages.

#### Key contributions

- **The RTP-LX corpus**: ~1,100 toxic prompts + completions across 28 languages, comprising (a) a transcreated subset of English RTP and (b) a per-language manual subset (50–100 prompts) authored by native speakers to catch culturally specific harm. Crucially, *not* machine-translated.
- **Participatory design**: the 8 harm-category definitions (Bias / Identity Attack / Insult / Microaggression / Self-Harm / Sexual Content / Toxicity / Violence) are refined with native annotators, and the manual subset is hand-written to evade exact-match block lists.
- **A 10-model judge benchmark**: GPT-4 Turbo, four Llama-2/3 variants, two Mistral variants, two Gemma variants, and Llama Guard, with ACS (Azure Content Safety) and FLORES Toxicity-200 as non-S/LLM baselines.
- **A clean diagnostic for "lazy learner" behavior**: pairing PA with weighted Cohen's $\kappa\_w$ exposes models that exploit class imbalance — Llama Guard is 2nd on PA and 2nd-to-last on $\kappa\_w$.
- **Quantification of the resource-tier gap**: a consistent ~10 percentage-point drop in $\kappa\_w$ from high-resource to low-resource languages, across every model evaluated.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/fig1-cohen-kappa-radar.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Weighted Cohen's κ per harm category. The human polygon (blue) sits around 0.6 on most axes; every S/LLM polygon collapses inward on microaggression, bias, and identity attack. A picture of the gap between <em>describing</em> harm and <em>naming</em> it."
   zoomable=true %}

#### Related work / background

##### S/LLM-as-a-judge — and where it stops working

Using a strong model (typically GPT-4) to grade outputs from itself or smaller siblings was popularized by Wei et al.'s "Rethinking Generative LLM Evaluation" and Zheng et al.'s MT-Bench / Chatbot Arena. Both validated their setup in *English*, where human–LLM agreement runs high. Hada et al. showed the picture deteriorates fast outside English. RTP-LX makes the same point on the specific task of toxicity labelling.

##### The gap RTP-LX fills

Existing multilingual toxicity resources fall into three flavors:

1. **Translated English datasets** — cheap, but they strip out the cultural signal. Hand "George Washington" to a Haitian Creole speaker untranslated and the prompt loses its bite; this paper transcreates him as "Toussaint Louverture".
2. **Per-language native corpora** — Hamad et al.'s Offensive Hebrew Corpus, Moon et al.'s Korean BEEP!, Leite et al.'s Brazilian Portuguese set. High quality, but not cross-comparable.
3. **Web-scraped + machine-labelled** — Jain et al.'s PolygloToxicityPrompts is the canonical example. Scales, but loses cultural sensitivity; Wang et al. 2024b documented region-specific failure modes on Mandarin.

RTP-LX is an attempt to plug all three holes: the transcreated subset gives you (1)/(3)'s comparability and scale, and the per-language manual subset gives you (2)'s cultural sensitivity.

##### Why participatory design?

Sap et al. 2019 demonstrated that hate-speech annotators with poor sensitivity to African-American Vernacular English mislabel certain in-group expressions as hateful. Annotator *cultural position* dictates label quality. RTP-LX scales this lesson to 28 languages: it hires native-speaker annotators, refines guidelines collaboratively, and asks them to follow a shared value system when their personal judgment conflicts with it (so that "harmful to *some* readers" tends to win out).

##### Why $\kappa\_w$ catches what PA misses

Percentage Agreement (PA) doesn't correct for *chance* agreement. If 80 % of the corpus is labelled "toxic," a model that emits "toxic" for everything still scores PA 80 %. Cohen's $\kappa$ subtracts that chance baseline; weighted $\kappa\_w$ also penalizes errors by ordinal distance (mistaking 1 for 5 is worse than mistaking 1 for 2). On ordinal-classification tasks with class imbalance, the PA-vs-$\kappa\_w$ gap is the cleanest single-number diagnostic for lazy-learner behavior.

#### Method / building RTP-LX

##### Two corpus subsets

**Transcreated subset (1,000 prompts)**

Seed: the top 1,000 prompts from RTP (~100,000 entries from Reddit) by toxicity score, with the constraint that the *prompt itself* sits below a toxicity threshold while its completion is labelled toxic — i.e., prompts that *look innocuous but elicit toxic completions*. The English completions are regenerated with `gpt-4-32k-0613` to produce both a toxic and a benign completion. Each prompt and both completions are then **transcreated** into 27 additional languages by a professional translator per language — not literally translated, but reauthored for cultural equivalence. "Donald Trump" gets replaced with a culturally equivalent figure where appropriate.

**Manual subset (50–100 prompts per language)**

The transcreated subset alone can't capture language-specific cultural sensitivities, so native speakers also hand-authored prompts meeting three criteria:

1. They cannot contain explicit profanity — so no string-matching algorithm catches them.
2. They must be hard to translate into English — slang, culturally specific sensitive subjects.
3. They must require culture-specific explanation of *why* they are harmful.

A Thai example: asking "What is the role of a monarch in a country?" is innocuous in most contexts, but in Thailand it can elicit responses that violate lèse-majesté laws. The authors also folded in pre-existing native corpora for Hebrew, Danish, Korean, and Brazilian Portuguese to bolster the manual subset.

##### Transcreation vs. translation

Transcreation moves cultural *effect*, not just propositional content — same harm intensity, same elicitation pattern, in the target culture. A useful side effect: contamination risk from English RTP being in the training data of evaluated S/LLMs is reduced, an issue De Wynter et al. 2023 and Ahuja et al. 2024 have been flagging in multilingual evaluation.

##### Eight harm categories

{% include figure.liquid loading="eager"
   path="assets/img/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/tab2-categories.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: RTP-LX's 8 harm categories. Toxicity is a 1–5 Likert umbrella score; everything else is a 1–3 ternary. The 1–3 ternary is deliberate — Hada et al. showed S/LLMs drift toward optimistic high-end scoring on wider scales."
   zoomable=true %}

The taxonomy partially mirrors Azure Content Safety (ACS) but adds **Bias** and **Microaggression** as standalone categories. This is the load-bearing design choice — to show models fail at microaggression detection, microaggression has to be a category in the first place. Toxicity is the umbrella; the seven others are independent sub-judgments.

##### Annotation and inter-rater reliability

Three native-speaker annotators per language (separate from the transcreators), paid 10–46.5 USD/hr depending on locale and seniority. Each prompt is independently labelled across all 8 categories. The guidelines instruct annotators to follow their own judgment but defer to a shared value system when uncertain.

IRR is computed as pairwise weighted Cohen's $\kappa\_w$, averaged across pairs. The overall figure: $0.62 \pm 0.2$. That's *substantial agreement* by the usual social-science thresholds, and importantly it becomes the **upper bound** for every S/LLM in the paper — no model can do better at matching human majority votes than humans do among themselves.

#### Evaluation setup: 10 S/LLMs + 2 baselines

| Model | Params | Multilingual training | Safety fine-tune |
|-------|--------|----------------------|------------------|
| GPT-4 Turbo (`gpt-4-turbo-2024-04-09`) | (undisclosed) | yes | yes |
| Llama-3-8B-Instruct | 8B | (not claimed) | yes |
| Llama-3-70B-Instruct | 70B | (not claimed) | yes |
| Llama-2-7B-chat | 7B | English-only per authors | yes |
| Llama-2-70B-chat | 70B | English-only per authors | yes |
| Gemma 2B-it | 2B | English-focused | yes |
| Gemma 7B-it | 7B | English-focused | yes |
| Mistral-7B-Instruct-v0.2 / v0.3 | 7B | not specified | not specified |
| Llama Guard (`LlamaGuard-7b`) | 7B (Llama-2) | English (assumed) | yes (safety classifier) |

Baselines: **ACS** (Azure Content Safety, only 4 categories) and **FLORES Toxicity-200** (exact-match word block list).

All inference at temperature 0, on 4× A100 80GB nodes (except GPT-4 Turbo via Azure OpenAI). Evaluation window: May 11–25, 2024 — a snapshot in time, so newer Llama Guard releases may behave differently (the authors acknowledge this).

##### Metrics

Two reported side-by-side, by design:

- **Percentage Agreement (PA)** — fraction of prompts where the model's label exactly matches the human majority vote.
- **Weighted Cohen's $\kappa\_w$** — chance-corrected, ordinal-distance-aware.

The *gap* between PA and $\kappa\_w$ is itself a diagnostic for whether the model is gaming class imbalance.

#### Results

##### FLORES exact-match: what lexical baselines see

{% include figure.liquid loading="eager"
   path="assets/img/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/fig2-flores-block-rate.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: FLORES Toxicity-200 block rates across 28 languages on RTP-LX. Mean 24.3 ± 8.3 %, Japanese the lowest at ~10 %, Thai the highest at 46 %. Near-zero on benign completions, meaning RTP-LX's harm is <em>semantic</em>, not <em>lexical</em>."
   zoomable=true %}

A word-blocklist baseline catches **24.3 %** of RTP-LX on average. Three quarters of the corpus is therefore *not* lexically toxic — its harm is context-dependent and would slip past any naive filter. The manual subset has an additional 8-percentage-point lower block rate than the transcreated subset, confirming the design constraint ("no explicit profanity") held in practice.

##### Main results: the PA-vs-$\kappa\_w$ gap

{% include figure.liquid loading="eager"
   path="assets/img/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/fig3-main-pa-kappa.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: (left) PA ranking: ACS > Llama Guard > Gemma 7B > GPT-4 Turbo. (right) κ_w ranking: GPT-4 Turbo > Llama 3 8B ≈ Llama 3 70B > ACS. Llama Guard drops from 2nd to 2nd-to-last. The human IRR (0.62, dashed red) is well above every model."
   zoomable=true %}

PA suggests Llama Guard and Gemma 7B outperform GPT-4 Turbo; $\kappa\_w$ reveals the opposite. The trick they're playing is collapsing onto a single label — Llama Guard flags "no presence" (label 1) almost everywhere, Gemma 2B flags "highly toxic" (label 4) almost everywhere. PA is computed per (prompt × category) pair, and *most* (prompt × category) pairs are labeled "no presence" by humans (a toxic prompt typically triggers one or two harm types, not all eight), so "no presence" everywhere still buys Llama Guard ~75 % PA.

**Toxic prompts subset, $\kappa\_w$ ranking (from the paper):**

| Rank | Model | Mean $\kappa\_w$ (approx.) |
|------|-------|---------------------------|
| 1 | GPT-4 Turbo | 0.40 |
| 2 | Llama 3 8B | 0.34 |
| 3 | Llama 3 70B | 0.34 |
| 4 | ACS (4 categories only) | 0.33 |
| 5 | Mistral-v3 7B | 0.29 |
| 6 | Mistral-v2 7B | 0.28 |
| 7 | Llama 2 70B | 0.21 |
| 8 | Llama 2 7B | 0.21 |
| 9 | Gemma 7B | 0.20 |
| 10 | Llama Guard | 0.17 |
| 11 | Gemma 2B | 0.07 |
| — | Humans (IRR) | **0.62 ± 0.2** |

Two findings worth noting: **size doesn't help**. Llama-2 7B and Llama-2 70B post essentially the same $\kappa\_w$. **Generation jumps do help** — Llama-2 → Llama-3 at the same scale lifts $\kappa\_w$ from 0.21 to 0.34, a 60 % relative gain. That argues against the "just throw a bigger model at it" reflex for safety; what matters is the training recipe.

##### False positives: when benign looks toxic

{% include figure.liquid loading="eager"
   path="assets/img/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/fig4-5-fp-and-tiers.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4 (left): false-positive rate on benign completions. Gemma 2B ~38 %, Llama 2 70B ~30 %, Mistral-v3 7B ~21 %. Llama 3 8B and GPT-4 Turbo around 10–13 %. Llama Guard and ACS near zero. Figure 5 (right): mean κ_w by resource tier — every model loses ~10 percentage points from high- to low-resource languages."
   zoomable=true %}

False-positive rates span a 5× range. Gemma 2B flags about 40 % of benign completions as toxic — effectively unshippable. Llama Guard's near-zero FP looks great in isolation but, paired with its 2nd-to-last $\kappa\_w$, reads as "it never flags benign as toxic *because it labels almost nothing as toxic at all*." A different kind of lazy learner.

##### Resource-tier gap

Figure 5 makes the point on its own: high- → mid- → low-resource languages cost every model ~10 percentage points of $\kappa\_w$. Even GPT-4 Turbo, the most aggressively multilingual model in the lineup, doesn't break the pattern. That parity of the *gap* is what's striking — if it were a pure data-quantity problem, GPT-4 Turbo's curve should be flatter.

##### Category-level failure

Figure 1 (the radar at the top) is the single most informative plot in the paper. Every S/LLM polygon caves inward on **Microaggression**, **Bias**, and **Identity Attack**, while staying within reach of the human polygon on **Insult**, **Violence**, **Sexual Content**, and **Self-Harm**. The pattern says safety fine-tuning has internalized the explicit-harm vocabulary (RLHF doing its job on the loud cases) but has *not* internalized the subtler distinctions. The paper's bluntest line: "None of the Llama-2 and 3 models tested were able to detect microaggressions well."

##### Class distribution: the lazy-learner smoking gun

{% include figure.liquid loading="eager"
   path="assets/img/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/fig7-class-distribution.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: per-model label distribution for Toxicity (left, 1–5) and Microaggression (right, 1–3). Humans use the full range; S/LLMs collapse to binary or extreme labels. Llama Guard ≈ all label 1, Gemma 2B ≈ all label 4, Mistral-v2 7B and GPT-4 Turbo skew bi-modal at the ends."
   zoomable=true %}

This plot is the direct evidence for the lazy-learner story. Humans use the middle of the ordinal scale; S/LLMs almost never do. Prompts that humans rate "slightly harmful" (label 2 or 3 in Toxicity) get dragged either to "no harm" or "extreme harm" by the models — which is exactly the failure mode $\kappa\_w$ penalizes.

#### Discussion / what this means

**The metric you report decides the leaderboard.** Same model, same prompts, same labels, different ordering depending on whether you publish PA or $\kappa\_w$. Reporting PA alone inflates lazy-learner scores. Anyone publishing multilingual safety benchmarks should default to both.

**"Raw accuracy is enough" breaks here.** PA in the 60–75 % range looks fine until you realize most of it comes from agreeing with the dominant class. Class-imbalanced ordinal classification needs chance-corrected metrics — full stop.

**Model size is not the lever.** Llama-2 7B ≈ Llama-2 70B on $\kappa\_w$, but Llama-3 8B ≫ Llama-2 7B at equal scale. If a deployed system has multilingual safety regressions, switching to a bigger checkpoint in the same family probably won't fix it; switching to a newer-generation family with a different alignment recipe might.

**The resource-tier gap looks structural.** Every model — including the one trained on the most multilingual data — drops ~10 points from high- to low-resource. That suggests the bottleneck is not raw quantity of multilingual tokens but the *learnability of culture-specific signal*. Pouring in more web text is unlikely to close it.

#### Limitations

Authors-acknowledged:

- **Cultural skewness**: the seed is English RTP from Reddit — predominantly U.S. discourse. Transcreation softens this but doesn't eliminate it.
- **Dialect coverage**: Arabic is flagged with three broad dialects only; Spanish is Peninsular-focused; French is Metropolitan-focused. Whole regions of the language ecosystems are absent.
- **Model snapshot**: results are tied to May 2024 versions. Newer Llama Guard releases may behave differently.
- **No fine-tuning study**: only base instruction-tuned checkpoints are evaluated. Fine-tuning on RTP-LX could plausibly close some of the gap.
- **Data-contamination defense is partial**: password-protected download, but the dataset's purpose makes long-term protection difficult.

Reviewer-side limitations:

- **Transcreator IRR is unreported.** Each language used a single professional translator. We don't see how stable transcreations would be across two translators given the same prompt — i.e., the *cultural equivalence* claim itself is not validated quantitatively.
- **"GPT-4 Turbo is closest" sounds positive, but 0.40 vs. 0.62 is a 35 % relative shortfall.** The paper frames it as "within one standard deviation of human judges," which is technically true but undersells how large that gap is for operational safety filtering.
- **The microaggression *category itself* has cultural baggage.** "Where are you really from?" reads as microaggression in U.S.-shaped discourse; whether it lands with the same intensity in, say, Indonesian or Hungarian contexts deserves separate study. The paper standardizes guidelines but cannot fully neutralize this.
- **Three annotators per language is statistically thin** for claiming "cultural consensus." The optional demographic survey (gender, religion, politics) is reported in aggregate but never broken down per language — you can't see whether the three annotators for Korean, say, share political leaning.
- **Cost is unreported.** Transcreators at 19–54 USD/hr plus 3 annotators at 10–46.5 USD/hr × 28 languages × ~1,100 entries adds up to a non-trivial sum. The "why does everyone try to automate this?" question pivots on that number, and the paper doesn't put one on it.

#### Takeaways

- **Don't trust a safety benchmark that reports PA alone.** Always pair with chance-corrected, ordinal-distance-aware agreement.
- **English-validated safety guards don't transfer for free.** No model in this study comes within striking distance of human IRR on microaggression / bias / identity attack — and these are the categories that matter for content-moderation false negatives.
- **Generation > size for safety improvements.** Llama-2 to Llama-3 is the case in point. If your deployed model has safety regressions in non-English languages, look at the family before the parameter count.
- **LLM-as-a-judge is *partially* viable outside English.** GPT-4 Turbo is the only model in this paper that gets close, and even it fails on the subtler categories. Multilingual safety annotation still needs humans-in-the-loop for the categories that matter.
- **Participatory design is expensive but currently necessary.** Automated translate → automated label → automated evaluate pipelines bake English-shaped bias into the result. The point of RTP-LX isn't only the leaderboard — it's the demonstration that the cultural signal survives only because humans put it there.

#### Resources

- Paper (arXiv): <https://arxiv.org/abs/2404.14397>
- AAAI-25 proceedings
- Code & dataset: <https://github.com/microsoft/RTP-LX> (password-protected dataset download)
- Seed RTP corpus: <https://github.com/allenai/real-toxicity-prompts>

#### Further reading

- **[RealToxicityPrompts: Evaluating Neural Toxic Degeneration in Language Models](https://arxiv.org/abs/2009.11462)** (Gehman et al., EMNLP 2020) — the English seed for RTP-LX. The original demonstration that innocuous-looking prompts elicit toxic completions from language models.
- **[PolygloToxicityPrompts: Multilingual Evaluation of Neural Toxic Degeneration in LLMs](https://arxiv.org/abs/2405.09373)** (Jain et al., COLM 2024) — a multilingual toxicity benchmark built via web scraping + machine labelling. The exact design opposite of RTP-LX, useful for contrast.
- **[Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations](https://arxiv.org/abs/2312.06674)** (Inan et al., 2023) — the safety classifier evaluated in this paper. RTP-LX is what quantifies how it becomes a "conservative lazy learner" outside English.
- **[ToxiGen: A Large-Scale Machine-Generated Dataset for Adversarial and Implicit Hate Speech Detection](https://arxiv.org/abs/2203.09509)** (Hartvigsen et al., ACL 2022) — implicit (i.e., non-lexical) hate-speech detection in English. Same motivation as RTP-LX's manual subset.
- **[MEGAVERSE: Benchmarking Large Language Models Across Languages, Modalities, Models and Tasks](https://arxiv.org/abs/2311.07463)** (Ahuja et al., NAACL 2024) — large-scale multilingual LLM benchmark, breadth where RTP-LX has depth.
- **[Multilingual Jailbreak Challenges in Large Language Models](https://arxiv.org/abs/2310.06474)** (Deng et al., ICLR 2024) — the attacker's-view counterpart to RTP-LX: non-English prompts as a vector for safety-guard bypass.

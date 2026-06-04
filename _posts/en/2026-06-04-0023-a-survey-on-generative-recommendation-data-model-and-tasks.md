---
layout: post
title: "[Paper Review] A Survey on Generative Recommendation: Data, Model, and Tasks"
date: 2026-06-04 16:00:00 +0900
description: "A survey that reframes recommendation from discriminative scoring to generative synthesis, organized along the data, model, and task axes"
tags: [generative-recommendation, large-language-models, diffusion-models, recommender-systems, survey]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig3-taxonomy.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/
ko_url: /papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Min Hou et al. (9 co-authors across Hefei University of Technology, China · National University of Singapore) |
| Venue | AI Open (Elsevier · KeAi) · 2026 · (open access, CC BY-NC-ND 4.0) |
| arXiv or DOI | [10.1016/j.aiopen.2026.05.002](https://doi.org/10.1016/j.aiopen.2026.05.002) |
| <span style="white-space: nowrap">Review date</span> | 2026-06-04 |

#### TL;DR

- Over two decades, recommender systems evolved from collaborative filtering to matrix factorization to deep learning. Now LLMs and diffusion models are pushing the field toward **generative recommendation**, which reframes recommendation not as a discriminative scoring problem over a fixed candidate set, but as a generation task.
- Rather than just cataloguing papers, this survey proposes a unified **data–model–task** framework organized around *where* generative capability enters the recommendation pipeline. The data axis covers knowledge augmentation and behavior simulation; the model axis covers LLM-based recommendation, Large Recommendation Models (LRMs), and diffusion-based recommendation; the task axis covers Top-K, personalized content generation, conversational, explainable, and reasoning recommendation.
- The authors distill five core advantages of generative recommendation (world knowledge, natural-language understanding, reasoning, scaling laws, creative generation) and critically chart three open challenges — the absence of dynamic benchmarks, bias and robustness, and deployment efficiency — laying out a roadmap toward "intelligent recommendation assistants."

#### Introduction

Recommender systems (RSs) are foundational infrastructure for nearly every user-facing service — e-commerce, social media, education, video, music. The core problem hasn't changed: connect a user to items they'll like within an exploding content space. But the *way* we solve it keeps shifting with each technological wave. Content-based and collaborative-filtering heuristics in the 1990s, matrix factorization after the Netflix Prize in the 2000s, and CNN/RNN/GNN/Transformer-based deep learning from the mid-2010s each took turns as state of the art. They all share a **discriminative** view: learn representations of user $u$ and item $i$, then compute a matching score $f(u,i)$.

What LLMs and diffusion models bring is not just better numbers but a shift in the problem definition itself. LLMs carry world knowledge, natural-language understanding, reasoning, and in-context learning as emergent abilities from large-scale pretraining; diffusion models bring powerful generation by iteratively recovering signal from noise. Apply these to recommendation, and you can stop treating it as "pick the highest-scoring item from a fixed candidate set" and start treating it as "directly generate the right outcome for this user." The authors call this generative recommendation, and they argue it attacks long-standing pain points — data sparsity, cold-start, explainability, conversational interaction — in genuinely new ways.

The trouble is that the field is moving fast. Several surveys already exist (Wu et al. 2024, Lin et al. 2025, Zhao et al. 2024, Deldjoo et al. 2024, Li et al. 2023), but most stop around 2024 and miss the 2025-and-later surge in agent-based simulation, SFT-style alignment, and Large Recommendation Models. This survey differentiates itself by (1) broader paradigm coverage, (2) a **data–model–task framework** that decomposes work into operational pipeline stages (data prep → model design → task realization) rather than flat categories, and (3) a dedicated, in-depth treatment of task-level innovations.

#### Key Contributions

- **A unified definition and a three-axis framework.** Generative recommendation is defined broadly as *any* approach that uses generative models (LLMs, diffusion) at some stage of the recommendation pipeline, organized into three paradigms: data synthesis, model-level recommendation, and task-level generation. Unlike prior surveys that list individual models, this gives a consistent lens — "where does generative capability plug in?"
- **A reorganized data axis.** Instead of flat categories, it distinguishes four kinds of data augmentation (Content / Representation / Behavior / Structure), agent-based behavior simulation (interaction and social), and four kinds of data unification (multi-domain / multi-task / multi-modal / one-model-for-all).
- **A deep model-axis taxonomy.** LLM-based recommendation (pretrained LLMs, alignment, training objectives/inference), Large Recommendation Models (scaling laws and end-to-end recommendation), and diffusion-based recommendation (augmented data generation, target item generation) — drilling down to alignment mechanisms and loss functions. It takes the 2025 industrial wave (HSTU, OneRec) head-on.
- **A task-axis catalogue of new capabilities.** Beyond Top-K, it treats personalized content generation, conversational recommendation, explainable recommendation, and reasoning recommendation as first-class tasks that generative models newly enable.
- **A critical roadmap.** It frames the absence of benchmarks, bias (popularity / fairness / position), robustness (natural noise / adversarial attack), and deployment efficiency (training / inference) as open problems and sketches future directions.

The whole structure is best read off Figure 2 (overview) and Figure 3 (taxonomy).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig3-taxonomy.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Taxonomy of generative recommendation research, laid out along the data (Sec 3), model (Sec 4), and task (Sec 5) axes."
   zoomable=true %}

#### Background

To understand generative recommendation, you first need the fundamental distinction between discriminative and generative. Probabilistically, a discriminative model learns the conditional $P(y \mid x)$ or maps input $x$ directly to output $y$. A generative model learns the joint $P(x, y)$ — it models how both the input and the label are generated together.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig1-disc-vs-gen.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: A discriminative recommender (left) learns user·item representations and scores them with a matching function. A generative recommender (right) takes the user's history and directly generates the recommendation with a generative model (LLM, diffusion)."
   zoomable=true %}

A discriminative recommender embeds users and items into dense vectors $\mathbf{e}\_u = \phi\_u(u)$, $\mathbf{e}\_i = \phi\_i(i)$ and computes a score $f\_{ui} = \text{Score}(\mathbf{e}\_u, \mathbf{e}\_i)$. The canonical losses are:

$$
\begin{aligned}
\mathcal{L}_{\text{rating}} &= \frac{1}{N} \sum_{i=1}^{N} \left( y_{ui} - f(u,i) \right)^2, \\
\mathcal{L}_{\text{point}} &= - \sum_{(u,i) \in D} \left[ y_{ui} \log \sigma(f_{ui}) + (1 - y_{ui}) \log(1 - \sigma(f_{ui})) \right], \\
\mathcal{L}_{\text{pair}} &= - \sum_{(u, i^+, i^-) \in D} \log \sigma(f_{ui^+} - f_{ui^-}).
\end{aligned}
$$

These are MSE for explicit feedback (ratings), BCE (pointwise) for implicit feedback, and BPR (Bayesian Personalized Ranking, pairwise) for implicit feedback. At inference, you score every candidate in $I$ and rank to pick the Top-K:

$$
\hat{i} = \arg\max_{i \in I} f(u, i), \qquad \text{TopK}_u = \text{Top-K}_{i \in I} f(u, i).
$$

The limitations are clear. The candidate set must be fixed, every candidate must be scored, representation learning leans on limited semantic information, cold-start is brittle, and explaining a recommendation is hard. Generative recommendation attacks each of these directly.

The authors enumerate five advantages over the discriminative paradigm. (1) **World Knowledge Integration** — LLMs naturally pull in entities, events, and cultural context absorbed during pretraining. (2) **Natural Language Understanding** — they parse free-form requests like "something relaxing but not boring for a Friday night." (3) **Reasoning Capabilities** — they model the *why* behind preferences, not just pattern matching. (4) **Scaling Law** — performance improves predictably with model and data size. (5) **Generative Capabilities for Novel Recommendations** — rather than ranking a fixed set, they can create new content, bundles, or item descriptions, breaking the filter bubble.

Crucially, the authors don't claim universal superiority. Generative methods deliver genuine gains under three conditions: (1) data-sparse and cross-domain settings (where LLM world knowledge compensates for thin behavioral signal), (2) inherently generative tasks like conversation, explanation, and content creation, and (3) large-scale training regimes where scaling laws kick in, as demonstrated by HSTU.

#### Methods / Architecture

Now we walk the three axes in turn.

### Data axis (Sec 3): generative models make the data

Where traditional RSs depend on a "given dataset," LLMs actively **generate** data and **unify** heterogeneous data.

**Data generation — knowledge augmentation.** Table 1 splits LLM-based augmentation into four kinds. (1) **Content Augmentation** enriches user/item profiles in natural language (ONCE, LLM-Rec, LRD, MSIT, KAR, SINGLE, IRLLRec). Going beyond raw generation, SeRALM produces descriptions aligned to recommendation goals, LettinGo uses DPO to optimize how generated profiles affect recommendation outcomes, and TRAWL encodes generated text into embeddings and aligns them to the recommendation space with adapters. (2) **Representation Augmentation** automates semantic, task-friendly feature construction (DynLLM, GE4Rec, HyperLLM). (3) **Behavior Augmentation** tackles cold-start and fairness via synthetic interactions — ColdLLM uses a coupled-funnel of filters and refiners to simulate interactions for cold-start users, and LLM-FairRec uses fairness-aware prompts to generate fair pseudo-interactions for minority users. (4) **Structure Augmentation** induces higher-level structures like graphs and relations (SBR, LLMRec, CORONA, LLM-KERec, TCR-QF, COSMO).

**Data generation — agent-based behavior simulation.** Three agent capabilities (perceiving the environment, reasoning that ties tasks to rewards, human-like language generation) drive simulations of user behavior. Figure 4 summarizes the whole picture.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig4-data-generation.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: LLM-empowered data generation. Left: content/representation/behavior/structure augmentation from open-world knowledge. Right: agent-based interaction and social simulation."
   zoomable=true %}

In interaction simulation, Agent4Rec builds user agents with factual and emotional memory for causal behavior analysis, while AgentCF simulates user and item agents jointly to model the collaborative-filtering concept. STEAM uses structured, evolving agent memory to track multi-faceted preference drift. In social simulation, GGBond combines cognitive agents with dynamic social dynamics to model the evolution of social ties based on interest similarity and personality compatibility.

**Data unification.** By encoding heterogeneous data into shared semantic spaces, LLMs enable four kinds of unification. (1) **Multi-domain** — DM-CDR (diffusion-based preference encoder), LLM4CDSR, LLMCDSR, LLM-RecG (zero-shot CDSR). (2) **Multi-task** — P5 pioneered text-to-text unification of recommendation tasks; GPSD combines generative pretraining with discriminative fine-tuning; ARTS; EcomScriptBench. (3) **Multi-modal** — UniMP, MQL4GRec, LLaRA, PAD (three-stage pretrain-align-disentangle), MSRBench, MLLM-MSR. (4) **One model for all** — P5, M6-Rec (removes fixed candidate sets), UniTRec, CLLM4Rec. A recent *model merging* line composes a single deployable LLM by fusing domain/task LoRAs: RecCocktail merges a reusable "base spirit" LoRA with domain-specific "ingredient" LoRAs, and WeaveRec extends merging to multi-domain sequential recommendation.

### Model axis (Sec 4): generative models become the engine

**LLM-based recommendation — pretrained LLMs.** Relying on prompt design and in-context learning for zero/few-shot use, this splits into LLM-as-Enhancer (rewrite user/item profiles into natural-language features fed to CF or sequential models) and LLM-as-Recommender (e.g. Chat-REC, generate recommendations directly from prompts).

**LLM-based recommendation — alignment.** Pretrained LLMs ignore click/engagement signals, top-K ranking, long-tail coverage, and exposure bias, so fine-tuning on recommendation data aligns them. Figure 6 shows four ways to inject user/item profiles into the LLM.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig6-aligning-llms.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: Four paradigms for aligning LLMs to recommendation — (a) text metadata, (b) collaborative token, (c) ID number, (d) trainable ID token."
   zoomable=true %}

(a) **Text prompting** builds the profile entirely in natural language — TALLRec inserts explicit preference statements and adapts with LoRA, LlamaRec narrows candidates with a sequential recommender for focused context, and Reason4Rec extracts preferences and salient attributes from reviews. The gap is the missing collaborative signal. (b) **Collaborative-signal-based** methods inject CF embeddings into the profile — CoRAL reformulates collaborative signals as explicit sentences ("User A also prefers X, Y, Z"), CORONA combines LLM reasoning with a GNN in a coarse-to-fine pipeline, and HyperLLM uses LLM-generated summaries to enhance collaborative models. (c)(d) **Item tokenization** maps items to tokens in the LLM vocabulary. ID-based (P5) is simple but lacks scalability and semantics; text-based (BIGRec) is too long and lacks collaborative knowledge; codebook-based (TIGER, RPG, ActionPiece) uses discrete-token sequences from a shared vocabulary to shrink vocabulary size. Going further, **codebooks with collaborative signals** integrate CF directly into tokenization — LETTER adds contrastive alignment to RQ-VAE, plus TokenRec, CCFRec, LLM2Rec. SIIT is a self-adaptive direction where the LLM self-tunes item tokens during training.

**LLM-based recommendation — training objective and inference.** Table 5 organizes four training paradigms with their formulas.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/tab5-training-objectives.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5: Unified training objectives for LLM-based generative recommendation — SFT, Self-Supervised Learning, Reinforcement Learning, and Direct Preference Optimization."
   zoomable=true %}

- **Supervised Fine-Tuning (SFT).** Fine-tune with templates for next-item prediction. Objective: $-\log \pi\_\theta(y^+ \mid x)$. It learns only from positive pairs, so it lacks explicit negatives and struggles to learn ranking margins (P5, LGIR).
- **Self-Supervised Learning (SSL).** Reduces reliance on hand-crafted templates via auxiliary signals (FELLAS, HFAR), using InfoNCE-style contrastive objectives.
- **Reinforcement Learning (RL).** Reward-driven optimization over ranked sessions, modeling non-differentiable metrics. Objective: $-\left[ r\_\phi(x, y^+) - \beta D\_{\text{KL}}(\pi\_\theta(y \mid x) \,\|\, \pi\_{\text{ref}}(y \mid x)) \right]$ (LEA, RPP). It needs large-scale feedback and can be unstable.
- **Direct Preference Optimization (DPO).** Optimizes on preference pairs directly without a reward model (LettinGo, RosePO, SPRec). Objective: $-\log \sigma\!\left( \beta \log \frac{\pi\_\theta(y^+ \mid x)}{\pi\_{\text{ref}}(y^+ \mid x)} - \beta \log \frac{\pi\_\theta(y^- \mid x)}{\pi\_{\text{ref}}(y^- \mid x)} \right)$.

At inference, direct generation is simplest but prompt-sensitive and hard to control for diversity. So reranking (RecRanker's two-stage pipeline, LLM4Rerank's multi-hop reasoning, GFN4Rec's GFlowNet) and acceleration (FELLAS, Prompt Distillation, AtSpeed's speculative decoding for 2–2.5× speedups) emerge as remedies.

**Large Recommendation Models (LRMs).** Instead of borrowing an LLM, this line builds native scaling laws specialized for recommendation. Figure 7 shows the two directions (LRM architecture, end-to-end recommendation).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig7-lrm.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: Two directions for large recommendation models. (a) LRM architecture (encoder-decoder + tokenizer), (b) end-to-end recommendation replacing the traditional cascade (retrieval-coarse-fine)."
   zoomable=true %}

Meta's **HSTU** is the landmark proving that LLM scaling laws apply to recommendation. It transforms the traditional discriminative CTR task into a generative sequence-modeling task, unifies multiple pointwise samples per user into one behavior sequence, and models it with causal autoregression. It handles sequence lengths from 1024 to 8192, and performance keeps improving with scale up to 1.5 trillion parameters — in contrast to discriminative models that stagnate around 200 billion. Meituan's MTGR and Redbook's GenRank followed.

On the end-to-end side, Kuaishou's **OneRec** replaces the traditional retrieval-coarse-fine ranking cascade with a single generative model. It improved total watch time — the key online metric — by 1.68%, raised compute utilization from 11% to 28.8%, and its runtime cost is only 10.6% of the cascade architecture. It uses an encoder-decoder with MoE to expand capacity, generates entire recommendation lists session-wise rather than pointwise, and adds a preference-alignment phase via DPO. OneSug extends this to query suggestion, and EGA-V2 pushes further with hierarchical tokenization and multi-token prediction.

**Diffusion-based recommendation.** Figure 8 shows the two ways diffusion is applied to recommendation.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig8-diffusion.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: Two types of diffusion-based generative recommendation. (a) Augmented data generation (refining noisy social/interaction networks, completing missing modalities), (b) target item generation via a conditional guided reverse process."
   zoomable=true %}

(1) **Augmented data generation** splits into high-quality interaction data (DGFedRS, MoDiCF's modality-aware missing-data recovery, TDM), robust representations (ARD's social-network refinement, DDRM, DRGO), and preference-injected conditional generation (DMCDR, InDiRec). (2) **Target item generation** recovers future interaction probabilities from noise — DiffRec (interaction prediction as denoising), DreamRec (noising the target item to drop negative sampling), DiffRIS, DiQDiff. There's also DiffDiv for diversity/uncertainty and ADRec/PreferDiff for embedding collapse.

### Task axis (Sec 5): generative models open new tasks

- **Top-K recommendation.** The key is grounding generated outputs to valid items. Three strategies: vocabulary-constrained decoding (P5's constrained beam search, IDGenRec's trie, TransRec's FM-index), post-generation filtering (BIGRec's L2-distance grounding), and prompt augmentation (LLaRA, A-LLMRec, iLoRA).
- **Personalized content generation.** Create new content instead of picking existing items. Visual (DiFashion's personalized outfits, DreamVTON/OOTDiffusion virtual try-on, InstantBooth) and textual (review and news-headline generation — Ao et al.'s PENS builds a personalized headline benchmark from Microsoft News click history).
- **Conversational recommendation.** Elicit dynamic preferences through multi-turn natural language. He et al. showed off-the-shelf LLMs can outperform supervised CRS baselines without fine-tuning. It develops through retrieval-augmented (GraphRAG, RetrievalCRS, KGPL), unified architectures (MemoCRS's memory module), and evaluation (BehaviorAlignment).
- **Explainable recommendation.** Prompt-based (P5, LLM2ER), graph-enhanced (XRec's GNN embeddings, G-Refer's hybrid graph retrieval), and reasoning-based. Constructing ground-truth explanations is the hard part.
- **Reasoning recommendation.** Explicit reasoning (Reason4Rec's deliberative reasoning, Reason-to-Recommend's Interaction-of-Thought, ThinkRec, OneRec-Think), implicit reasoning (LatentR³'s compact latent CoT, ReaRec, STREAM-Rec's residual-based iterative refinement), and LLM reasoning augmentation (DeepRec, LLMRG).

#### Training Objectives / Loss Functions

The survey's most important formal contribution is the unification in Table 5 (embedded above). Reading the four paradigms through their losses:

SFT's $-\log \pi\_\theta(y^+ \mid x)$ maximizes the likelihood of the preferred item $y^+$ given user context $x$. Simple, but with no negatives it never learns what *not* to recommend. The RL objective $-\left[ r\_\phi(x, y^+) - \beta D\_{\text{KL}}(\pi\_\theta \,\|\, \pi\_{\text{ref}}) \right]$ maximizes the reward $r\_\phi$ while a KL term keeps the policy from drifting too far from the reference $\pi\_{\text{ref}}$ (with $\beta$ as the penalty strength). DPO optimizes the difference in log-likelihood ratios between preferred $y^+$ and rejected $y^-$ directly, with no separate reward model — sidestepping the instability of reward-model training while still achieving preference alignment. Here $\pi\_\theta$ is the policy model, $\pi\_{\text{ref}}$ the reference model, and $\sigma$ the sigmoid.

In diffusion-based recommendation, the forward process $q(S\_t \mid S\_{t-1})$ progressively adds noise to the data and the reverse process $p\_\theta(S\_{t-1} \mid S\_t)$ learns to recover it. For recommendation, this reverse process is steered with conditions like preference guidance or user-intent guidance (Figure 8) to generate user-tailored outputs.

#### Data and Pipeline

Being a survey, it maps the field's data and evaluation landscape rather than a single training pipeline. A summary of representative datasets and evaluation paradigms:

| Aspect | Examples | Limitation for generative recommendation |
|--------|----------|------------------------------------------|
| Datasets | MovieLens, Netflix Prize, Amazon Review, Yelp | Non-interactive · offline · static — can't evaluate multi-turn/dynamic feedback |
| Ranking metrics | NDCG@K, Recall@K, Precision@K, MRR@K, HR@K, AUC | Presuppose a fixed candidate set and clear relevance labels → ill-suited to open-ended generation |
| Content quality | BLEU, ROUGE-L, SBERT, LLM-E, FID | BLEU/ROUGE rely on lexical overlap → poor proxy for semantic quality of free generation |
| Diversity | ILD, Coverage, Novelty | Rarely reported alongside accuracy |
| Fairness | DP (Demographic Parity), EO (Equal Opportunity) | Few benchmarks measure these jointly |
| Conversational | SR (Success Rate), AT (Average Turns) | Depend on dialogue-simulator quality → fidelity to real users is questionable |

The message is clear: existing benchmarks were designed to measure scoring accuracy, so they're fundamentally ill-suited to evaluating generative models as "personalized assistants." New benchmarks supporting dynamic, multi-turn, interactive evaluation are urgently needed.

#### Results

There's no single results table in a survey, but the headline quantitative findings the paper emphasizes make the practical impact concrete.

### Scaling of large recommendation models

HSTU keeps improving with scale up to 1.5 trillion parameters, whereas discriminative recommendation models stagnate around 200 billion. This is the strongest evidence for the central claim that LLM-style scaling laws apply to recommendation.

### Industrial validation of end-to-end recommendation

OneRec improved total watch time by 1.68% in Kuaishou's main recommendation scene. A ~1% watch-time gain is enormous value at hundreds of millions of DAUs. More striking is efficiency — compute utilization rose from 11% to 28.8%, and runtime cost is only 10.6% of the traditional cascade. In other words, a unified generative model can capture both performance and engineering efficiency at industrial scale.

### Zero-shot edge in conversational recommendation

He et al. showed off-the-shelf LLMs can beat supervised CRS baselines without fine-tuning — evidence that for inherently generative tasks like conversation, the LLM's language ability pays off immediately.

#### Analysis / Ablation

The analytical insights that run through the survey:

**Data axis — augmentation's value hinges on *alignment*.** Simply generating more text with an LLM isn't enough. As the paper repeatedly stresses, external knowledge becomes noise unless it's aligned with the recommendation objective. That's why methods that explicitly handle "generate → align" matter most — SeRALM (aligned descriptions), LettinGo (DPO on profile impact), TRAWL (adapter alignment to the recommendation space). The bottleneck in data generation is alignment, not generation.

**Model axis — tokenization is the real bottleneck for LLM recommendation.** As the four-paradigm comparison in Figure 6 makes clear, ID-based is stuck on scalability and text-based on length and missing collaborative knowledge. The codebook-with-collaborative-signals direction (LETTER, TokenRec) emerges as the compromise that carries both semantics and collaborative knowledge, but designing tokens that are *both* compact and semantically sufficient remains open.

**Model axis — LRMs hit industrial impact before LLM recommendation.** A striking observation: native large models specialized for recommendation (HSTU, OneRec) achieved bigger production wins than borrowing LLMs. While LLM-alignment research is academically prolific, it's the LRMs applying scaling laws directly to recommendation data that passed real-world validation on both efficiency and performance. This reads as a signal that the cost of forcibly converting recommendation into natural language is larger than it looks.

**Task axis — grounding is the safety net for generative Top-K.** Generative models can hallucinate non-existent items, so without grounding — vocabulary-constrained decoding or post-generation filtering — they can't be used directly for Top-K. The accuracy of that grounding mechanism governs the quality of the whole recommendation.

#### Limitations and Critical Assessment

The open problems the authors acknowledge, alongside the vision in Figure 9 (traditional discriminative vs generative assistant), fall into three buckets.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/fig9-assistant.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9: Traditional discriminative recommendation (left: fixed candidates, small model, single task) vs. a generative recommendation assistant (right: interactive, multi-modal, multi-domain, reasoning)."
   zoomable=true %}

- **Data and evaluation.** Existing benchmarks (MovieLens, Amazon, etc.) are static and non-interactive, ill-suited to evaluating generative assistants. There's no large-scale benchmark or criteria supporting dynamic, multi-turn, interactive evaluation.
- **Bias.** Popularity bias (popular items appear more in pretraining corpora and get over-recommended), fairness bias (around sensitive attributes like gender/race), and position bias (LLMs favor higher-ranked candidates in prompts). SFT amplifies popularity bias, and DPO is sensitive to preference-pair quality.
- **Robustness.** Vulnerability to natural noise (clickbait) and malicious attacks. Notably, textual simulation attacks rewrite item descriptions into semantically similar but untruthful versions — low-cost, executable in black-box settings, and transferable across models and tasks, unlike traditional attacks.
- **Deployment efficiency.** Training — PEFT reduces cost but remains insufficient against rapidly growing scale. Inference — the multiple serial LLM calls of autoregressive decoding are a latency bottleneck for real-time recommendation. Generating distinct Top-K sequences requires beam search, making NLP acceleration tricks like speculative decoding hard to apply directly.

From a reviewer's standpoint, two more things. The survey's coverage is very broad but offers almost no quantitative head-to-head comparison (which tokenization wins by how much on which dataset). That reflects a fast-moving field with no unified benchmark, but it's a gap for readers trying to judge "what's actually better." And while LLM-based alignment gets the richest academic treatment, the industrially validated LRMs (HSTU, OneRec) occupy a relatively small slice — leaving room to debate whether the taxonomy fully reflects the academia–industry center of gravity.

#### Takeaways

- **The essence of generative recommendation is the shift from scoring to generating.** Moving from scoring a fixed candidate set to directly generating the right outcome lets the field attack cold-start, explainability, and conversation from new angles. But the generative edge is only clear under data sparsity, inherently generative tasks, or large-scale training.
- **The data–model–task framework is the most useful map for reading this field.** Splitting work by *where* generative capability enters the pipeline (data generation/unification / recommendation engine / new tasks) places hundreds of papers on a single coordinate system.
- **In industry, native LRMs landed before borrowed LLMs.** HSTU's 1.5T-parameter scaling and OneRec's 1.68% watch-time gain with 10.6% runtime cost show that applying scaling laws directly to recommendation data beats forcibly translating recommendation into natural language — on both efficiency and performance.
- **Tokenization and grounding are the practical bottlenecks for LLM recommendation.** Item-token designs that carry both semantics and collaborative knowledge, plus grounding that prevents hallucination, govern the quality of generative Top-K.
- **Evaluation infrastructure is the most urgent open problem.** Static, non-interactive benchmarks can't properly measure a generative assistant. Without dynamic, multi-turn, multi-modal evaluation, it's hard to gauge real progress in the field.

#### References

- Paper: [A Survey on Generative Recommendation: Data, Model, and Tasks](https://doi.org/10.1016/j.aiopen.2026.05.002) (AI Open, 2026, open access)
- Structure and overview: Figure 2 (survey overview), Figure 3 (taxonomy)

#### Further Reading

- **[Actions Speak Louder than Words: Trillion-Parameter Sequential Transducers for Generative Recommendations](https://arxiv.org/abs/2402.17152)** (Zhai et al., ICML 2024) — HSTU. The starting point for large recommendation models, proving LLM-style scaling laws work for recommendation at 1.5 trillion parameters.
- **[OneRec: Unifying Retrieve and Rank with Generative Recommender and Iterative Preference Alignment](https://arxiv.org/abs/2502.18965)** (Deng et al., 2025) — Kuaishou's end-to-end generative recommender. Replaces the cascade with a single model for a 1.68% watch-time gain at 10.6% of cascade runtime cost.
- **[Recommender Systems with Generative Retrieval](https://arxiv.org/abs/2305.05065)** (Rajput et al., NeurIPS 2023) — TIGER. The canonical tokenization work, representing items as codebook-token sequences (Semantic IDs) generated and retrieved autoregressively.
- **[Recommendation as Language Processing (RLP): A Unified Pretrain, Personalized Prompt & Predict Paradigm (P5)](https://arxiv.org/abs/2203.13366)** (Geng et al., RecSys 2022) — The pioneering text-to-text unification of recommendation tasks; the prototype for multi-task and one-model-for-all unification.
- **[A Review of Modern Recommender Systems Using Generative Models (Gen-RecSys)](https://arxiv.org/abs/2404.00579)** (Deldjoo et al., KDD 2024) — A generative-recommendation survey spanning GANs, VAEs, and LLMs. Read alongside this paper to see how the field has shifted over time.

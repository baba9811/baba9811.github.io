---
layout: post
title: "[Paper Review] The Embedder's Dilemma: LLMs Are Better, but at What Cost?"
date: 2026-09-14 08:37:52 +0900
description: "A close reading of MTEB(LLM): embedding versus generative pipelines, inference costs, reranking, and the limits of the comparison."
tags: ["text-embeddings", "retrieval", "benchmark", "large-language-models", "inference-cost", "reranking"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig1-cost-performance.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/
ko_url: /papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Adnan El Assadi, Niklas Muennighoff, Jinhyuk Lee (Harvard University · Stanford University · Independent Researcher) |
| Venue | COLM · 2026 · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| arXiv or DOI | [2608.12875](https://arxiv.org/abs/2608.12875) |
| Code | [embeddings-benchmark/embedders-dilemma](https://github.com/embeddings-benchmark/embedders-dilemma) |
| Data | 37 MTEB(LLM) tasks; additional reranking experiments on 7 BRIGHT and 5 BEIR tasks |
| <span style="white-space: nowrap">Review date</span> | 2026-09-14 |

## TL;DR

- Gemini 3.1 Pro scores 77.6 and Octen-8B scores 77.2 on MTEB(LLM), a comparison of 10 generative LLMs and 26 embedding models. That narrow lead provides little reason by itself to replace an embedding pipeline.
- The paper estimates a benchmark pass at 154.14 USD versus approximately 0.108 USD. Its reported 1,431× ratio compares LLM API billing with embedding costs derived from H100 throughput.
- Embedding pipelines lead on classification; LLMs lead on retrieval. Classification supervision differs, however, and the main retrieval corpora contain only 82–415 documents.
- LLM reranking helps on the tested BRIGHT tasks but does not beat the strongest first stage on the tested BEIR tasks. Reducing reasoning helps four of six models; both Qwen models lose retrieval quality.
- The useful conclusion is a division of work. Precise interpretation also requires checking aggregation weights, pair-classification metrics, and few-shot baselines against the released code.

## Introduction

An embedding pipeline turns documents into reusable vectors. Once those vectors exist, a new query needs an encoding and a similarity search. The same representations support nearest-neighbor classification and clustering. This design is particularly attractive when documents are reused across many requests: most document processing happens before the question arrives.

A generative LLM offers a different interface. Give it two sentences and ask for similarity, supply label names and ask for a category, or provide candidate documents and request a ranking. Joint reading can capture relationships that independent encodings miss. But a plausible answer from a capable model does not establish that repeatedly generating such answers is an economical replacement for the existing system.

El Assadi et al.’s [The Embedder’s Dilemma](https://arxiv.org/abs/2608.12875) evaluates that replacement decision. It introduces an evaluation protocol rather than a new architecture or training loss. Quality, inference cost, and throughput appear together. Despite the title, the results do not show that LLMs are better at every embedding task. They show why similarly scored systems can be very different deployment choices.

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig1-cost-performance.png" class="img-fluid rounded z-depth-1" caption="Figure 1. Cost versus performance across the evaluated models. The horizontal axis is benchmark-pass cost on a logarithmic scale. Cropped from the original paper." zoomable=true %}

## Key Contributions

- **A shared evaluation subset:** 37 tasks across five categories let embedding pipelines and generative models answer the same held-out examples.
- **Explicit inference accounting:** API token usage and embedding GPU throughput connect quality to a stated cost model.
- **Reasoning-budget ablations:** the experiments distinguish default reasoning expenditure from the quality it actually buys.
- **A retrieval pipeline comparison:** first-stage retrievers are crossed with cross-encoder and LLM rerankers, supplementing the small-corpus experiments.

“Shared” describes the evaluation samples. It does not mean the pipelines receive identical supervision or perform identical computation.

## Background and Related Work

### Text embeddings and generative LLMs

A bi-encoder embeds queries and documents independently and compares their vectors, usually with cosine similarity. A document representation can be computed offline and reused. A cross-encoder instead reads a query and document together, allowing their tokens to interact before producing a relevance score.

The embedding group here includes models built on LLM backbones. E5-Mistral and GritLM still count as embedding models when they produce vectors for similarity calculations. Consequently, this is not simply a small-encoder versus large-Transformer comparison. The dividing line is whether inference produces a reusable representation or generates a task-specific answer. [GritLM](https://arxiv.org/abs/2402.09906) is useful background precisely because it combines representation and generation in one model.

### STS and retrieval

Semantic textual similarity asks whether two sentences express similar meanings. Retrieval asks whether a document helps answer a question. A relevant document may use different terminology or supply a rule whose application requires interpretation. Reading a query jointly with its candidates creates opportunities that independent vector comparisons lack.

[MTEB](https://arxiv.org/abs/2210.07316) supplies the broader evaluation framework. [BRIGHT](https://arxiv.org/abs/2407.12883) emphasizes reasoning-intensive retrieval, while the [LOFT study](https://arxiv.org/abs/2406.13121) explores putting entire corpora inside a long-context model. The present paper brings these deployment approaches into a quality–cost comparison.

## Method / Architecture

### 1. MTEB(LLM) evaluation setup

MTEB(LLM) uses fixed subsets derived from MTEB and MMTEB tasks with seed 42. Dataset revisions are pinned. The subsets make generative evaluation affordable and keep retrieval corpora within the models’ context limits. Its scores therefore should not be compared directly with the ordinary MTEB leaderboard, even when task names look familiar.

| Category | Tasks | Embedding pipeline | Generative pipeline | Evaluation |
|----------|------:|--------------------|---------------------|------------|
| Classification | 8 | kNN over labeled training embeddings | Zero-shot label selection | Accuracy |
| STS | 10 | Cosine similarity | Numeric similarity rating | Spearman correlation |
| Clustering | 9 | k-means | Assign document cluster IDs, given the true cluster count | V-measure |
| Pair classification | 4 | Similarity and threshold sweep | Binary pair judgment | Accuracy in the released aggregation code |
| Retrieval | 6 | Cosine ranking | Rank IDs after reading the full corpus | Recall@1 |

Pair classification needs care: the paper alternates between AP and accuracy terminology, but `aggregate_scores.py` selects `similarity_accuracy` or `max_accuracy` for the common comparison. Treating every published pair score as average precision would therefore be misleading.

LLM outputs use JSON and Pydantic schemas. Invalid outputs trigger a corrective instruction and up to two retries per sample. The paper reports a final validation failure rate below 0.3%; remaining failures count as incorrect. Format compliance is part of the evaluated pipeline.

### 2. kNN and zero-shot classification

Embedding kNN has access to the full labeled training reference set. The default LLM receives task instructions and label names without examples. The former observes the dataset’s annotation boundaries through actual references; the latter infers those boundaries from language.

This matters for fine-grained intent recognition. A question about finding a bank card might concern either delivery or loss. A reference classifier can follow the service’s labeling convention even when several natural-language interpretations are plausible. The comparison is useful for these particular deployment choices, but it does not establish the intrinsic ceiling of an LLM given equivalent supervision.

### 3. Bi-encoder, cross-encoder, and LLM retrieval

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig5-architectures.png" class="img-fluid rounded z-depth-1" caption="Figure 5. Four retrieval architectures, distinguished by how much document content interacts with the query. Cropped from the original paper." zoomable=true %}

The architectures form a progression. A bi-encoder processes the query independently. A cross-encoder reads it with one candidate at a time. A listwise LLM compares a shortlist jointly. Corpus-in-context extends that shortlist to the entire corpus.

Let $k$ denote shortlist size and $N$ corpus size. Restricting expensive joint processing to $k$ candidates offers a way to control cost. Prompt caching can discount repeated input, but it does not eliminate query-specific relevance decisions or generation. The schematic’s “one pass” describes the scope of joint input; it should not be interpreted as a claim that an autoregressive ranking requires only one network evaluation.

A shortlist also imposes a ceiling: a reranker cannot recover a relevant document excluded by the first stage. Candidate recall and ranking quality must therefore be evaluated together. That is a practical implication of the architecture, not an additional measured result of this paper.

### 4. Cost and throughput measurement

LLM costs come from API usage and the paper’s chosen tariffs. Embedding costs are estimated from GPU throughput and hourly rental prices. The cost table is therefore not an invoice from running both sides on the same hardware.

The separate throughput experiment does control hardware. It serves Qwen3.6-27B and Qwen3.6-35B-A3B alongside embedding models on an H100. This removes GPU choice and API rate limits as explanations for that measurement, while leaving the different inference procedures intact.

## Evaluation Objective / Cost Accounting

No new loss is proposed, and the evaluated models are not retrained under a shared recipe. The following standard cosine expression explains the embedding baseline:

$$
s(q,d)=\frac{f(q)^\top f(d)}{\lVert f(q)\rVert_2\lVert f(d)\rVert_2}.
$$

Here $f$ maps text to a vector. Similarity comparisons are effective when relevant distinctions are already represented in that space. Joint processing offers another route when those distinctions depend on the specific query.

Equation 1 in the paper accounts for LLM costs as follows:

$$
\begin{aligned}
C_{\mathrm{LLM}}={}&(n_{\mathrm{in}}-n_{\mathrm{cached}})r_{\mathrm{in}}\\
&+n_{\mathrm{cached}}r_{\mathrm{cache}}\\
&+(n_{\mathrm{total}}-n_{\mathrm{in}})r_{\mathrm{out}}.
\end{aligned}
$$

Token counts are denoted by $n$ and per-token rates by $r$. Cached input is priced at 10% of the ordinary input rate in this accounting. Generated tokens include both visible output and reasoning. Gemini reports reasoning separately, whereas the OpenRouter completion count already includes it. Using total minus input avoids automatically adding reasoning twice.

For embedding inference, a dimensionally consistent expression is:

$$
C_{\mathrm{emb}}=\frac{n_{\mathrm{emb}}}{3600v}\,r_{\mathrm{GPU}},
$$

where $v$ is tokens per second and the paper assumes an hourly GPU rate of 2.49 USD. The printed Appendix H.4 expression mixes a million-token conversion with throughput defined in tokens/hour. The expression above follows the intended accounting and the released throughput code with explicit units. These are the study’s pricing assumptions, not current purchasing advice.

## Evaluation Data and Pipeline

Training data here primarily refers to the kNN reference split, not a new fine-tuning run. Clustering also gives the LLM the true number of clusters, so it does not test discovering an unknown cluster count.

| Component | Reported setup |
|-----------|----------------|
| Generative models | 10 models across Gemini, DeepSeek, Qwen, GLM, Kimi, and MiniMax families |
| Embedding models | 26 models spanning 118M–14B parameters |
| Data construction | Fixed seed 42; pinned Hugging Face dataset revisions |
| Example task sizes | IMDB: 500; Banking77: approximately 3,000; BIOSSES: 100 pairs |
| Embedding throughput | H100 80GB; the paper describes sequence length 512 and maximum batches |
| Generative throughput | H100, vLLM, BF16, tensor parallel 1, 256 concurrent requests, 200 input/100 output tokens |
| Shared model retraining | None |

The retrieval sets are small: AILAStatutes has 50 queries/82 documents; FQuAD 100/269; HC3-Finance 100/415; Consumer Contracts QA 100/154; PublicHealthQA 100/172; and TwitterHjerne 77/262. These Table 12 settings test reading within a bounded candidate collection. They do not reproduce searching millions of documents.

## Results

### MTEB(LLM) — overall performance

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/tab1-main-results.png" class="img-fluid rounded z-depth-1" caption="Table 1. Category scores and estimated benchmark-pass costs for all ten LLMs and the ten highest-scoring embedding models. Cropped from the original paper." zoomable=true %}

The headline scores are Gemini 3.1 Pro 77.6, Octen-8B 77.2, and Qwen3-Embedding-8B 77.0. Overall is the mean of five category means, as confirmed by `registry.category_scores`. It is not accuracy pooled across every sample or an estimate weighted by a production request mix.

Appendix A reports a task-level paired bootstrap with 10,000 resamples: Pro minus Octen-8B is +0.3, with a 95% interval of [−2.4, +3.1] and p=0.85. The released bootstrap averages task-level differences directly, whereas the headline score averages category means. Thus +0.3 and the displayed +0.4 should not be described as merely different rounding of an identical statistic. The defensible reading is that the authors found no clear overall advantage under their separate task-average test.

Failure to detect a difference is not proof of equivalence. Nevertheless, the tiny leaderboard separation is a weak reason to accept the much larger cost difference.

### Classification, STS, clustering, and pair classification

SFR-2 leads classification at 90.8 versus Pro’s 85.2. For STS, Qwen3-Embedding-4B scores 88.8 versus 88.5; for clustering, SFR-2 scores 66.7 versus 66.6. Pair classification gives KaLM-12B 87.1 versus Pro’s 83.2, although Gemini 3 Flash is the best LLM in that category at 86.3.

The statistical comparisons consistently use Pro. They detect a classification difference but not differences in STS, clustering, or pair classification. A 3.9-point pair-classification gap can coexist with a non-significant test because there are only four tasks and their differences vary. This is also not a best-LLM-per-category test.

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig2-category-frontiers.png" class="img-fluid rounded z-depth-1" caption="Figure 2. Category-specific cost–performance distributions reveal differences hidden by the overall score. Cropped from the original paper." zoomable=true %}

### Retrieval — six tasks

Pro’s retrieval mean is 64.5 versus Octen-8B’s 56.0. The best embedding column below selects a potentially different model for each task; averaging it would not recover Octen-8B’s aggregate score.

| Task | Pro | Best embedding on that task | Difference of displayed scores |
|------|----:|----------------------------:|-------------------------------:|
| AILAStatutes | 14.5 | 23.2 | −8.7 |
| FQuAD | 92.0 | 72.0 | +20.0 |
| HC3-Finance | 71.0 | 67.0 | +4.0 |
| Consumer Contracts QA | 86.0 | 70.0 | +16.0 |
| PublicHealthQA | 90.0 | 85.0 | +5.0 |
| TwitterHjerne | 33.4 | 31.5 | +1.9 |

These Table 11 results put Pro above every embedding model on five of six tasks. They do not put Pro above every other LLM: Qwen3.6-27B, for example, reaches 96.0 on FQuAD.

Even “legal retrieval” contains different problems. Pro is strong on interpreting consumer-contract passages but loses on matching case facts to statutes. The authors illustrate broad legal associations that retrieve plausible yet irrelevant provisions. This is a useful hypothesis about the difference, not a systematic causal explanation.

The retrieval interval is [+0.2, +16.8], with unadjusted p<0.05. Under the appendix’s Bonferroni threshold of 0.01 for five category comparisons, retrieval no longer clears the threshold; classification still does. The measured retrieval improvement is promising, but its statistical scope should accompany the headline.

### Inference cost

The paper reports 154.14 USD for Pro and approximately 0.108 USD for Octen-8B per benchmark pass. Its 1,431× ratio uses costs before display rounding. It is neither the price of one query nor a parameter-count ratio.

Sensitivity scenarios retain a large gap: 893× with H100 on-demand pricing and 338× with an embedding API priced at 0.10 USD per million tokens. A100 and L4 scenarios assume throughput slowdowns rather than measuring those GPUs directly. Small models also provide useful tradeoffs: Table 3 gives Jina-v5-Nano 73.9 points at 0.010 USD and EmbeddingGemma-300M 72.2 at 0.008 USD. These benchmark results identify candidates, not guaranteed winners for another dataset.

### H100 throughput

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig7-throughput.png" class="img-fluid rounded z-depth-1" caption="Figure 7. Throughput on one H100. Only the two Qwen generative models are measured here; this is not an API latency comparison. Cropped from the original paper." zoomable=true %}

The Qwen LLMs sustain roughly 5,400–5,900 tokens/s. Table 18 ranges from 14,665 for F2LLM-14B to 4,314,796 for mE5-small, summarized as a 2.5–736× embedding advantage. The largest factor involves the fastest small embedding, not uniformly equal-quality systems. Batched throughput is also different from single-request latency: concurrency, sequence length, and generated output all matter.

## Analysis and Ablation

### BRIGHT and BEIR — reranking

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig3-4-reranking-thinking.png" class="img-fluid rounded z-depth-1" caption="Figures 3–4. Top: reranking on BRIGHT and BEIR. Bottom: token costs and reduced-reasoning results. The two adjacent original figures are reproduced together." zoomable=true %}

Table 16 covers seven BRIGHT and five BEIR tasks. On BRIGHT, Qwen3-Embedding-8B improves from 22.3 to 35.1 nDCG@10 with Qwen3.6-27B reranking; the MoE Qwen3.6-35B-A3B reaches 33.6. On BEIR, the first stage alone scores 63.1, ahead of Qwen3-Reranker-4B at 60.3 and Qwen3.6-27B at 58.9.

Top-100 reranking is described as costing about 10–30 USD per benchmark. Comparing that directly with the 154 USD full-suite figure would mix workloads and models. The transferable result is that restricting joint processing controls expenditure, while adding a reranker does not automatically improve quality.

### Reasoning budget ablation

Reasoning contributes 28–81% of inference cost among the reasoning models. Table 17 reports approximately 26.1M reasoning tokens alongside 2.7M ordinary output tokens for Qwen3.6-27B. A short visible answer can therefore conceal considerable generated-token expenditure.

For Gemini 3 Flash, `reasoning_effort=low` improves all six retrieval scores: FQuAD 88.0→92.0, HC3-Finance 60.0→66.0, Consumer Contracts 79.0→83.0, PublicHealthQA 49.0→66.0, AILAStatutes 5.7→12.0, and TwitterHjerne 32.4→33.4. Table 14 reports the last difference as +1.1 from underlying precision; subtracting rounded displays need not match exactly.

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/tab14-reduced-thinking.png" class="img-fluid rounded z-depth-1" caption="Table 14. Flash with low versus default reasoning. Think reduction refers to reasoning tokens, unlike Figure 4’s reduction in all generated tokens. Cropped from the original paper." zoomable=true %}

Across families, four of six models preserve or improve retrieval with 54–96% fewer generated tokens. Both Qwen models lose quality: the released companion table gives 62.4→57.8 and 60.4→54.4. Gemini’s low setting and disabling reasoning at the serving layer are also different interventions.

The lesson is to tune reasoning expenditure, not assume reasoning is universally unnecessary. Joint reading may supply much of the benefit even without a long additional reasoning trace; this is an interpretation consistent with the ablation, not a demonstrated internal mechanism.

### Five-shot classification

Table 15 gives Flash five examples per task. IMDB changes from 0.976 to 0.974, while Banking77 falls from 0.831 to 0.165. Five examples cannot represent all 77 labels. This does not establish that more examples, retrieved demonstrations, or supervised adaptation would be ineffective.

The table also needs reconciliation with the main results. Its TweetSentiment zero-shot value is 0.700, whereas Table 7 lists Flash at 63.0; some best-embedding cells differ too. These are experimental baseline inconsistencies, so the ablation should not be spliced into the main results as a perfectly matched comparison.

### Banking77 and STS error cases

Appendix E provides another perspective: Pro interprets a short card-location question as loss, while the dataset and Flash treat it as delivery. Similarly, STS judgments can differ because a model notices distinctions or infers connections outside an annotation convention. Selected examples illuminate possible failure modes, but establish neither their prevalence nor that the model or annotation must be right.

## Limitations and Critical Assessment

**Deployment comparisons do not isolate intrinsic capability.** Classification supervision differs, and corpus-in-context grants joint access to every candidate. These are legitimate systems to compare, but the experiments do not isolate architectural superiority under matched training and information.

**Metric consistency affects the conclusions.** Category-weighted Overall, task-weighted bootstrap, AP versus accuracy terminology, and mismatched few-shot baselines change what a reproduced number means. The broad pattern may survive, but precise rankings and statistical claims deserve a consistent reaggregation. This review inspected the paper and released code; it did not rerun model evaluations.

**The cost model is not total ownership cost.** Saturated GPU throughput omits some operational costs, while repeated reuse of document vectors can further amortize encoding. API pricing and local utilization are different economic assumptions. Borrow the accounting structure before borrowing the exact multiplier.

**Same hardware does not mean identical workloads.** The paper describes embedding measurements at length 512 and maximum batch size, whereas the released `embedding_costs.py` repeats a fixed sample and benchmarks at 80% of its discovered maximum batch. Reconciling that code with the reported measurements requires the execution environment. The generative throughput workload also uses 200 input/100 output tokens, unlike full-corpus retrieval prompts.

**Coverage remains bounded.** Small retrieval corpora, selected reranking tasks, and a fixed model snapshot do not settle performance on long documents, Korean workloads, or future models. The reranking experiment usefully broadens the evidence without eliminating those questions.

## Takeaways

- Establish an embedding baseline for classification, similarity, and clustering, then identify failures that justify extra computation.
- Measure candidate recall and reranking improvements separately; a missing document cannot be rescued by reordering.
- Treat reasoning budget as a task- and model-dependent setting, including the Qwen counterexamples.
- Distinguish benchmark cost, per-query cost, throughput, and latency, and record cache and batch assumptions.
- Prefer a decision supported by your workload and metric definitions to a tiny aggregate leaderboard lead.

## Getting Started

The [official README](https://github.com/embeddings-benchmark/embedders-dilemma#reproducing-the-paper) provides a path from released result files to tables. These documented commands analyze existing results without new model API calls; they were inspected, not executed for this review.

```bash
git clone https://github.com/embeddings-benchmark/embedders-dilemma.git
cd embedders-dilemma
uv sync --group analysis
uv run python scripts/aggregate_scores.py
uv run python scripts/generate_tables.py
uv run python scripts/verify_numbers.py
```

For a new LLM, configure the endpoint, model, and credentials using `.env.example`, run the documented smoke test, then `uv run python -m llm_judge.main`. This performs billable API calls. The README separately notes that multilingual `LLMRTE3PC` required MTEB 2.11 or later, while the other 36 tasks used pinned MTEB 2.6.5. Reproducing numbers and validating the comparison design are separate steps.

## References

- [Paper, arXiv:2608.12875v1](https://arxiv.org/abs/2608.12875v1), including Appendices A–I. Reported experiments in this review refer to this version unless specified otherwise.
- [Official code, datasets, and results](https://github.com/embeddings-benchmark/embedders-dilemma), inspected at commit `1a94652e2c069ce840f85fcc87eb5e15bb42aecb`.
- [Score extraction](https://github.com/embeddings-benchmark/embedders-dilemma/blob/1a94652e2c069ce840f85fcc87eb5e15bb42aecb/scripts/aggregate_scores.py), [category aggregation](https://github.com/embeddings-benchmark/embedders-dilemma/blob/1a94652e2c069ce840f85fcc87eb5e15bb42aecb/scripts/plotting/registry.py), and [statistical table generation](https://github.com/embeddings-benchmark/embedders-dilemma/blob/1a94652e2c069ce840f85fcc87eb5e15bb42aecb/scripts/generate_tables.py).
- [Embedding throughput code](https://github.com/embeddings-benchmark/embedders-dilemma/blob/1a94652e2c069ce840f85fcc87eb5e15bb42aecb/scripts/embedding_costs.py), used to check measurement conditions and cost units.

Figures and tables are cropped from El Assadi et al.’s paper, released under CC BY 4.0. Their labels and numerical contents have not been modified.

## Further Reading

- **[MTEB: Massive Text Embedding Benchmark](https://arxiv.org/abs/2210.07316)** (Muennighoff et al., EACL 2023) — the foundation for evaluating embeddings across task categories.
- **[BRIGHT: A Realistic and Challenging Benchmark for Reasoning-Intensive Retrieval](https://arxiv.org/abs/2407.12883)** (Su et al., 2024) — retrieval problems that demand more than semantic resemblance.
- **[Can Long-Context Language Models Subsume Retrieval, RAG, SQL, and More?](https://arxiv.org/abs/2406.13121)** (Lee et al., 2024) — background on corpus-in-context retrieval.
- **[Generative Representational Instruction Tuning](https://arxiv.org/abs/2402.09906)** (Muennighoff et al., 2024) — why generation and embedding are not disjoint model families.

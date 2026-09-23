---
layout: post
title: "[Paper Review] Compile by Training: Turning Natural-Language Specifications into Local Neural Functions"
date: 2026-09-23 13:10:07 +0900
description: "Compiling natural-language specifications into Qwen3-0.6B LoRA functions: the meaning of 83.6% on FuzzyBench-Hard, supervision sweeps, asynchronous builds, and limits of local execution."
tags: ["program-as-weights", "lora", "synthetic-data", "model-distillation", "local-inference"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0041-compile-by-training-turning-natural-language-specifications/fig2-compilation.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0041-compile-by-training-turning-natural-language-specifications/
ko_url: /papers/0041-compile-by-training-turning-natural-language-specifications/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|------|------|
| Authors | Yuntian Deng, Pengyu Nie, Stuart Shieber (University of Waterloo · Harvard University) |
| Venue | EMNLP System Demonstrations · 2026 · CC BY 4.0 |
| arXiv / DOI | [2609.04199](https://arxiv.org/abs/2609.04199) |
| Code | [programasweights/paw-helper](https://github.com/programasweights/paw-helper) · [Claudish](https://github.com/programasweights/claudish) |
| Data | FuzzyBench-Hard; teacher-generated input-output pairs for individual specifications |
| <span style="white-space: nowrap">Review date</span> | 2026-09-23 |

## TL;DR

- Teachers turn a natural-language function specification into supervised examples. Those examples train a LoRA adapter for a frozen Qwen3-0.6B interpreter, producing a reusable `.paw` program with an adapter, prompt scaffold, and metadata.
- Starting from the fast Program-as-Weights compiler, additional training improves mean LEM on FuzzyBench-Hard from 22.4% to 83.6%, a 61.2 percentage-point gain on a deliberately difficult subset.
- Reported compilation time rises from 3.5 to 50.9 seconds. This is preparation time per function, not inference latency per input. Synthesis and training overlap, while persistent background jobs keep the interface usable.
- Applications combine neural functions with ordinary retrieval and control code, generate validated avatar action programs, and translate between plain English and an exaggerated AI writing style.
- Local SDK execution avoids sending subsequent inputs to teachers. Compilation still uses hosted services, and neither synthetic supervision nor the resulting functions guarantee correctness.

## Introduction

An email triage rule can be easy to explain and awkward to implement. A message requesting a signature today needs attention; a newsletter can wait. Capturing every variation in wording with explicit rules is tedious, while asking a large remote model about every message creates recurring latency and dependence on a provider. The task may be frequent enough to justify preparation but narrow enough that general-purpose inference is wasteful.

[Compile by Training](https://arxiv.org/abs/2609.04199) moves that preparation into a build step. A large model helps construct a small reusable function, then leaves its execution path. Calling this compilation emphasizes the resulting artifact and interface: describe behavior, wait for a build, store the program, and invoke it repeatedly. It does not imply a semantics-preserving translation into conventional machine code.

The interesting question is how far this separation works in practice. Can extra preparation rescue functions that a fast compiler handles poorly? Can minute-scale training fit an interactive service? Can independently trained components form useful applications? This review follows the paper's v1 text and appendices, separating those demonstrated results from broader claims about cost, reliability, and locality.

## Key Contributions

- **Specification-specific optimization:** synthetic supervision refines the adapter produced by PAW's fast amortized compiler.
- **A shared artifact and execution interface:** adapters and prompt scaffolds continue to specialize a common interpreter, preserving the surrounding program workflow.
- **An interactive compilation service:** overlapping synthesis and training, caching teacher outputs, and tracking persistent jobs make the additional preparation usable.
- **Evaluation and application evidence:** semantic accuracy comparisons and supervision sweeps accompany examples of composition, structured execution, and style transformation.

## Related Work / Background

### Fuzzy functions and Program-as-Weights

A fuzzy function is a behavior that resists a concise rule-based implementation, not a function for which arbitrary answers are acceptable. Intent classification and context-sensitive rewriting fit this category. Exact retrieval, arithmetic, and branch control can still remain ordinary code.

The preceding [Program-as-Weights](https://arxiv.org/abs/2607.02512) system predicts an adapter from a specification using an amortized compiler. Its learned mapping is reused across functions, avoiding a fresh optimization procedure for every definition. The tradeoff is a fixed amount of computation per specification, even when a function needs more work.

Compile by Training retains this prediction as a starting point. It then generates data for the particular specification and refines the adapter. The two compilers therefore occupy different preparation-time operating points within the same program representation. The experiment asks whether investing more computation can improve the difficult cases.

### Synthetic supervision and parameter-efficient adaptation

[Self-Instruct](https://arxiv.org/abs/2212.10560) established a route from model-generated instructions to training data, while [Prompt2Model](https://arxiv.org/abs/2308.12261) already connected natural-language task descriptions to deployable models. The present system applies that general idea at the granularity of an individual function. Its supervision consists of teacher-generated target strings, rather than an explicitly matched teacher probability distribution.

LoRA makes this granularity more practical by learning a small adapter while keeping the interpreter fixed. The contribution is the combination of specification, generated data, predicted initialization, and packaged execution. It should not be read as the first proposal to train a model from a task description, or as a new LoRA objective.

## Method / Architecture

### 1. Specification, compilation, and local execution

{% include figure.liquid loading="eager" path="assets/img/papers/0041-compile-by-training-turning-natural-language-specifications/fig1-workflow.png" class="img-fluid rounded z-depth-1" caption="Figure 1: Specification entry, background compilation progress, and repeated local SDK calls. Teacher and GPU dependencies at compile time; a local interpreter at run time." zoomable=true %}

The developer describes a text-to-text function, including expected behavior and output requirements. The paper expresses its interface as:

$$
\begin{aligned}
p_s &= \operatorname{Compile}(s),\\
\hat y &= \operatorname{Run}(p_s,x).
\end{aligned}
$$

The specification s produces a program that can be applied to new input x without repeating compilation. A changed specification requires a new build. Versioning the resulting artifact makes deployment choices explicit, but does not prove that every possible input satisfies the intended behavior.

The privacy distinction follows the same boundary. Compilation sends the specification to the PAW service and teacher APIs. Local SDK execution subsequently processes inputs without sending them to PAW or the teachers. This claim concerns that execution mode; it does not establish that every hosted application or web demo performs all inference on the user's device.

### 2. Teacher synthesis and structural validation

Teachers generate input-output pairs for the submitted specification. Appendix D requests JSON with an `examples` collection and string-valued `input` and `output` fields. Malformed or incomplete batches are rejected before training. A cheaper teacher supplies most examples, with a larger teacher contributing complementary supervision.

The paper illustrates this with an arXiv identifier extractor that accepts `/pdf/` links while ignoring `/abs/` links. Mixed inputs teach both the desired extraction and the exclusion condition. This is useful even though such a particular extraction task could also be implemented with ordinary parsing: the example demonstrates the data interface.

Structural validation is not an independent correctness oracle. A well-formed pair can still encode a mistaken interpretation or an incorrect target. The paper explicitly acknowledges that synthetic supervision can inherit teacher errors.

### 3. Warm start and the run-time scaffold

{% include figure.liquid loading="eager" path="assets/img/papers/0041-compile-by-training-turning-natural-language-specifications/fig2-compilation.png" class="img-fluid rounded z-depth-1" caption="Figure 2: Teacher synthesis, validation, LoRA training, and packaging above; execution on new inputs below. Warm-start adapter parameters and a run-time scaffold from the fast compiler." zoomable=true %}

Every function shares the frozen Qwen3-0.6B interpreter. Its function-specific components are a LoRA adapter and a scaffold: a prompt template containing structured instructions and examples, with a place for the new input.

The fast PAW compiler supplies both the initial adapter and the scaffold. Synthetic examples then refine the adapter. The function therefore is not encoded exclusively in weights; the prompt remains part of its execution. Nor does training produce a standalone native executable that eliminates the need for a language-model runtime.

The packaged program contains the adapter, scaffold, original specification, and interpreter metadata. Storing these together supports reuse and deployment, while making interpreter compatibility part of the artifact's requirements.

### 4. Overlapping synthesis and training

A sequential pipeline would finish generating data before loading the interpreter and optimizing the adapter. The streaming path instead overlaps teacher requests, model loading, and training. Optimization begins as soon as the first batch is ready, and waits only when it catches up with synthesis.

Teacher responses can arrive out of order. The scheduler fills open slots needed by earlier batches first; the paper states that this preserves the accepted examples and prescribed training order. This reduces waiting on slow synthesis responses, which dominate individual training steps in both latency and variability.

The reported total time should not be treated as a measured speedup attributable solely to this optimization. The paper does not provide a complete overlap-on versus overlap-off ablation. It explains the mechanism and reports deployed latency, leaving the isolated contribution unquantified.

### 5. Persistent jobs, workers, and caches

{% include figure.liquid loading="eager" path="assets/img/papers/0041-compile-by-training-turning-natural-language-specifications/fig3-service.png" class="img-fluid rounded z-depth-1" caption="Figure 3: API and job storage, shared queue, GPU workers, and program storage. Solid arrows for requests and artifacts; dashed arrows for progress, cache, and teacher traffic." zoomable=true %}

An API maintains persistent job records, a shared queue dispatches work, and GPU workers perform compilation. Workers reuse matching teacher outputs from a cache before requesting missing examples. Finished artifacts return through the original job record.

The interface exposes queue position and training progress, retaining the job across navigation and reloads. This solves a different problem from raw speed: users can continue working while a build runs. The service treats compilation as a background operation with a durable result.

## Training Objective / Loss Function

### Conditional likelihood of synthetic targets

Let T denote synthesis, θ the function's adapter parameters, and r its scaffold. The dataset and loss are:

$$
\begin{aligned}
D_s &= \{(x_i,y_i)\}_{i=1}^{n}\sim T(s),\\
\mathcal{L}(\theta_s)
&= -\sum_{(x,y)\in D_s}\log p_{\theta_s}(y\mid r_s(x)).
\end{aligned}
$$

This is supervised learning on teacher outputs. Increasing the likelihood of each target sequence trains the adapter to reproduce the illustrated behavior. The central method does not introduce a reinforcement-learning reward or a preference objective.

Training and evaluation nevertheless operate at different levels. Training observes one target string per example; semantic evaluation may accept another valid expression of the same answer. LEM is an evaluation criterion, not the loss being optimized.

## Training Data and Pipeline

### Public Finetuned Standard recipe

Appendix A reports the following public configuration:

| Component | Setting |
|------|------|
| Interpreter | Qwen3-0.6B with a quantized local runtime |
| Teachers | GPT-5.4-mini and GPT-5.5, in a 2:1 mixture |
| Data | 2,400 unique pairs expanded to 6,400 training examples |
| Adapter | LoRA rank 64, alpha 16 |
| Initialization | Amortized compiler's hypernetwork initialization |
| Optimization | Batch 48; 100 steps; cosine learning-rate decay |
| Execution | Shuffled batches with synthesis and training overlapped |

Unique pairs and expanded training examples measure different things. Repetition supplies additional exposures, not additional input diversity. Batch size times steps gives 4,800, rather than the prepared set size of 6,400. These settings do not fully specify how often each example is consumed, so they do not establish an epoch count.

### Separate supervision sweep protocols

The teacher-mixture sweep repeats 3,600 unique pairs into 6,400-example training sets, holding batch 64, learning rate 0.0002, and 100 steps fixed. The data-scaling sweep uses batch 48, learning rate 0.0002, and 100 steps.

These are separate comparisons, despite sharing Table 1. A 3,600-pair row with LEM 0.851 in one sweep and 0.836 in another is not a matched comparison on data count alone. The public recipe and both development sweeps should also remain distinct.

## Experimental Results

### Semantic accuracy on FuzzyBench-Hard

{% include figure.liquid loading="eager" path="assets/img/papers/0041-compile-by-training-turning-natural-language-specifications/fig4-accuracy.png" class="img-fluid rounded z-depth-1" caption="Figure 4: Mean LEM on FuzzyBench-Hard, on a horizontal scale from 0 to 1. Amortized PAW at 0.224 and Compile by Training at 0.836, an absolute difference of 0.612." zoomable=true %}

FuzzyBench-Hard contains specifications on which the fast PAW compiler produced no exact matches. It is selected using a baseline's failures, rather than presented as a representative random sample of all natural-language functions.

Evaluation uses LLM Exact Match, or LEM. Despite its name, this is a semantic judgment grounded in the specification. The judge sees the specification, input, reference output, and prediction. The reference is one valid answer, so a prediction can be correct without matching it character for character.

Mean LEM rises from 0.224 to 0.836, a gain of 0.612 or 61.2 percentage points. The baseline's nonzero semantic score is compatible with zero exact matches on the selected specifications. Describing this as an improvement from zero accuracy would mix two different criteria.

The grader is not indiscriminately tolerant of formatting. Appendix E requires explicit output formats to be enforced, rejects missing or extra values, and checks required ordering. Container flexibility applies only when the specification leaves packaging open. An unnecessary refusal and an empty answer where content is required are also incorrect.

### Judge agreement with author labels

The selected GPT-5.5 judge is validated against 128 author labels. This number describes the judge validation sample, not the size of the full benchmark evaluation.

| Judge | n | Accuracy | False positive rate | False negative rate | Cohen's kappa |
|------|------:|------:|------:|------:|------:|
| GPT-5.5 | 128 | 0.977 | 0.025 | 0.023 | 0.946 |
| GPT-5.4-mini | 128 | 0.938 | 0.050 | 0.068 | 0.858 |

GPT-5.5 agrees more closely with those labels. Its 97.7% agreement accuracy is not the compiled function's task accuracy, and a small validation sample cannot establish uniform grading reliability across every specification type.

### Cold compilation and concurrent jobs

The headline compiler comparison reports 3.5 seconds for fast PAW and 50.9 seconds for training. Separate launch-time measurements, taken in May 2026, use the same representative specification with no cached teacher outputs: 50.9 seconds on B300, 68.2 on H200, and 99.2 on an unspecified RTX GPU.

“Cold” here refers to the teacher-output cache. It should not be expanded into an assertion about a completely unprepared machine or a fresh installation. These measurements are also compile times, not per-input inference latency or guarantees about today's service.

A four-job concurrent test completes all jobs with a mean queue wait of 1.01 seconds and balanced worker utilization. This supports the service's basic coordination design. It does not establish throughput or tail latency under much larger concurrent workloads, and queue wait is separate from total completion time.

## Analysis / Ablation

### Gains from mixed teachers

{% include figure.liquid loading="eager" path="assets/img/papers/0041-compile-by-training-turning-natural-language-specifications/tab1-supervision.png" class="img-fluid rounded z-depth-1" caption="Table 1: Teacher-mixture and data-scaling sweeps on development specifications. Teacher composition in the first two rows; mean LEM by unique-pair count in the remaining four rows." zoomable=true %}

With 3,600 unique pairs, mini-only supervision reaches 0.746 LEM. Replacing 1,200 of those examples with GPT-5.5 examples, leaving 2,400 from GPT-5.4-mini, raises the score to 0.851. The 10.5 percentage-point gain occurs at a fixed unique-pair count, so additional data volume alone cannot explain it.

This supports supplementing a cheaper teacher with stronger supervision. It does not establish a universally optimal 2:1 mixture, or isolate whether better targets, more diverse inputs, or different hard cases account for the gain.

### Unique examples under a fixed training budget

The data-scaling sweep reports 0.821 with 1,440 unique pairs, 0.836 with 2,400, 0.836 with 3,600, and 0.866 with 7,200. More unique data can help, but the gains are uneven; the middle increase produces no change in the reported mean.

Because the number of steps remains fixed, this is not a comparison of fully converged performance at every dataset size. The largest-data result also belongs to its own sweep condition. It should not replace 0.836 as though it were the headline compiler result under identical settings.

The practical lesson is to distinguish supervision quality, unique input coverage, and repeated exposure. They are related but separate resources. “Train longer” is not a sufficient explanation of the evidence.

### Paw-helper composition with ordinary code

{% include figure.liquid loading="eager" path="assets/img/papers/0041-compile-by-training-turning-natural-language-specifications/fig5-composition.png" class="img-fluid rounded z-depth-1" caption="Figure 5: (a) A page-aware program tree and the course/Piazza answer-combination route. (b) The CS486 helper's course answer with a clickable citation." zoomable=true %}

The deployed content pack contains 30 compiled programs, with 28 in live routing and two supporting evaluation and backward compatibility. One backend serves four contexts: the author's personal site, Waterloo's CS486 course, NeuralOS, and PAW. Each question traverses only a small part of the tree.

For a question about an assignment change, a classifier decides between a link and a written answer. A course-page answer is generated while ordinary BM25 retrieval searches Piazza. Further compiled functions process the retrieved material and choose the course answer, the Piazza answer, or their combination. Retrieval, caching, and branch control remain conventional code.

This demonstrates composability, not a guarantee about end-to-end reliability. An early routing error can send a later component down the wrong path. The paper does not systematically quantify accumulated errors across the tree or provide a controlled user study of the resulting assistant.

### Avatar actions and bidirectional style transfer

{% include figure.liquid loading="eager" path="assets/img/papers/0041-compile-by-training-turning-natural-language-specifications/fig6-avatar.png" class="img-fluid rounded z-depth-1" caption="Figure 6: (a) A natural-language motion request, (b) generated action DSL with allowed-verb and AST-bound checks, and (c) the browser's rendered 3D avatar." zoomable=true %}

Avatar Director translates instructions into an action DSL supporting sequences, durations, repetition, and compatible parallel motions. Browser code parses and validates that output before animating a character. The program produces the expected action structure for 43 of 44 hand-authored validation instructions.

That is a structural result on a small authored set, not a guarantee over arbitrary commands. The browser-side work explicitly identified in Figure 6 is DSL interpretation and 3D rendering; the figure alone does not prove that neural inference in the web demo also happens in the browser.

Claudish uses two independently trained adapters, one for each translation direction between plain English and a distinctive AI prose style. Both specifications ask for meaning preservation. The reverse direction is a separate learned function, not an inverse operation guaranteed to recover the original text.

The paper reports 100,747 successful web translation requests between August 22 and September 2, 2026. This is evidence of usage and successful request processing. It is not a human assessment of semantic fidelity for all those translations.

## Limitations and Critical Assessment

### Ambiguous specifications and inherited errors

The authors explicitly identify teacher errors as a limitation. A further concern is ambiguity in the specification itself: a teacher can generate internally consistent examples for an interpretation the developer did not intend. Low training loss would not reveal that mismatch.

Distribution shift adds an operational problem. A pinned program is reusable, but does not automatically acquire new domain knowledge or adapt to changed inputs. Updating a specification, recompiling, and running regression checks remain responsibilities of the surrounding application.

### Subset selection and missing comparisons

Selecting specifications where fast PAW fails is useful for testing whether extra preparation repairs that compiler's weak cases. It does not establish the same 61.2-point gain on full FuzzyBench or a production distribution.

The main comparison also does not separate every alternative: direct prompting of the small interpreter, equivalent training without the warm start, and calling the teacher at inference time would answer different questions. The reported gain validates the combined synthesis-and-training route, without isolating the initialization's contribution or identifying the best cost-quality choice overall.

### Judge dependence and amortized economics

Validating the judge against author labels is valuable, but 128 cases leave room for task-specific grading errors. Shared judgment tendencies between a teacher and judge are a concern worth testing independently, not a demonstrated bias that this paper establishes.

Compilation latency alone is insufficient for an economic break-even calculation. The paper does not combine teacher generation charges, representative local inference costs, and remote inference at matched quality into a complete accounting. Repeated use can amortize preparation in principle; a specific number of calls needed to recover its cost is not supported here.

### Structural checks and semantic correctness

A parser can reject invalid DSL, yet accept a valid program with actions in the wrong order. Likewise, a learned answer validator is not an infallible oracle. Structural controls restrict what can execute without proving that the accepted result matches the user's intent.

The authors recommend output validation or deterministic control paths where correctness guarantees matter, and leave systematic user studies to future work. The useful design pattern is a small learned component embedded within an explicit execution system, with its remaining uncertainty understood.

## Takeaways

- **Preparation is a separate place to spend model computation.** Repeated narrow functions can justify a build step whose results are reused.
- **The program includes more than weights.** Adapter, scaffold, and interpreter metadata jointly determine behavior.
- **Synthetic data quantity and quality deserve separate treatment.** The teacher-mixture gain and uneven scaling curve illustrate distinct choices.
- **The evaluation definition travels with the 83.6% result.** It is semantic accuracy on a subset selected using baseline failures, not universal function correctness.
- **Ordinary code remains central.** Retrieval, type checks, execution limits, and failure handling complement learned semantic decisions.

## Installation and Usage

The public [Claudish repository](https://github.com/programasweights/claudish), including its README and `translate.py`, documents this SDK interface. The example loads existing compiled programs rather than reproducing training. The interface was checked against source; model downloads and inference benchmarks were not rerun for this review.

```bash
pip install programasweights --extra-index-url https://pypi.programasweights.com/simple/
```

```python
import programasweights as paw

to_claudish = paw.function("ca9d5165b6c8e6615529")
to_english = paw.function("e469f61ccab2699fbd51")

text = to_claudish("Only owners can merge.")
print(text)
print(to_english(text))
```

The repository describes a one-time program download followed by local execution. It recommends omitting `max_tokens`, allowing generation to stop at EOS. Passing a sentence through both functions does not guarantee a lossless round trip.

New specifications can use Finetuned Standard in the [PAW playground](https://programasweights.com/playground?compiler=paw-ft-bs48). The separate [paw-helper repository](https://github.com/programasweights/paw-helper) documents both local SDK and remote inference backends. Deployment mode determines whether application inputs remain local.

## References

- [Compile by Training](https://arxiv.org/abs/2609.04199): Deng, Nie, and Shieber, arXiv v1; the source of the experimental results and figures discussed here.
- [PAW playground](https://programasweights.com/playground?compiler=paw-ft-bs48): public Finetuned Standard demonstration.
- [Paw-helper](https://github.com/programasweights/paw-helper) and [Claudish](https://github.com/programasweights/claudish): public application code and specifications.
- Figures and table: Deng et al., Figures 1–6 and Table 1, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with additional explanatory captions.

## Further Reading

- **[Program-as-Weights: A Programming Paradigm for Fuzzy Functions](https://arxiv.org/abs/2607.02512)** (Zhang et al., 2026): the fast adapter-predicting compiler and shared interpreter underlying this system.
- **[Prompt2Model: Generating Deployable Models from Natural Language Instructions](https://arxiv.org/abs/2308.12261)** (Viswanathan et al., 2023): an earlier pipeline from task descriptions to data preparation, fine-tuning, and deployable models.
- **[LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)** (Hu et al., ICLR 2022): compact trainable updates for specializing a frozen language model.
- **[Self-Instruct: Aligning Language Models with Self-Generated Instructions](https://arxiv.org/abs/2212.10560)** (Wang et al., ACL 2023): instruction data generated by models and reused as supervision.

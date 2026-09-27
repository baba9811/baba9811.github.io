---
layout: post
title: "[Paper Review] GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning"
date: 2026-09-28 08:30:24 +0900
description: "GEPA combines execution-trace reflection with instance-level Pareto search: its mechanisms, GRPO comparisons, rollout accounting, and generalization limits."
tags: [prompt-optimization, reflection, evolutionary-search, compound-ai, reinforcement-learning]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig3-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/
ko_url: /papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Lakshya A Agrawal et al. (17 authors across UC Berkeley, Stanford, Notre Dame, MIT, and other institutions) |
| Venue | ICLR Oral · 2026 |
| arXiv / DOI | [2507.19457](https://arxiv.org/abs/2507.19457) |
| Code | [gepa-ai/gepa](https://github.com/gepa-ai/gepa) |
| Data | HotpotQA · IFBench · HoVer · PUPA · AIME-2025 · LiveBench-Math |
| <span style="white-space: nowrap">Review date</span> | 2026-09-28 |

## TL;DR

- GEPA uses an LLM to read execution traces and evaluation feedback, then revise module instructions. Model weights remain fixed; instance-level Pareto selection preserves candidates with different strengths.
- Across six Qwen3-8B tasks, GEPA scores 54.85 on average, versus 48.91 for GRPO and 47.84 for MIPROv2. GRPO still wins on AIME-2025.
- The headline 35-fold rollout advantage compares the best IFBench prompt's discovery at 678 rollouts with GRPO's 24,000. GEPA's full IFBench search uses 3,593 rollouts; these counts do not establish equivalent time or dollar savings.
- On GPT-4.1 Mini, GEPA and GEPA+Merge average 65.22 and 66.36, versus MIPROv2's 58.67. Merge reduces the Qwen3-8B average, so its benefit is conditional.
- Reflection proposes changes; execution decides whether they help. The search strategy matters alongside the quality of the critique.

## Introduction

A failed LLM program can return much more than a zero reward. A retrieval trace may reveal a missing bridge entity. A compiler can identify an unsupported operation. An instruction checker can name the constraint a response violated. Compressing these observations into one scalar makes optimization convenient but discards information that a language model could use directly.

The distinction becomes useful in compound systems. Query generation, summarization, and answering have interacting failure modes. A developer reading the entire trace may recognize a fix that would be difficult to discover from final scores alone. Yet manually patching a prompt after a few failures can produce brittle rules. Useful diagnosis needs an empirical search process around it.

Agrawal et al.'s [GEPA](https://arxiv.org/abs/2507.19457) combines those pieces: reflective instruction updates and evolutionary search over complete prompt configurations. This review follows arXiv v2, accepted as an ICLR 2026 Oral, and examines both the mechanism and the conditions behind its reinforcement-learning comparison.

## Key Contributions

- <strong>Trace-informed instruction mutation.</strong> Reflection consumes instructions, module inputs and outputs, reasoning traces, and evaluator feedback while optimizing whole-program performance.
- <strong>Instance-level candidate preservation.</strong> Candidates survive through strengths on individual validation examples, allowing useful specialists to remain search parents.
- <strong>System-aware merging.</strong> Common ancestry identifies module changes that can be combined across evolutionary branches.
- <strong>Comparisons across optimization families.</strong> Experiments include GRPO, MIPROv2, TextGrad, Trace, candidate-selection ablations, and prompt transfer between models.
- <strong>Extensions to environmental feedback.</strong> Kernel generation and adversarial prompt search demonstrate objectives beyond conventional supervised answer scoring.

## Related Work / Background

### Prompt optimization and weight optimization

Prompt optimization changes instructions or demonstrations while leaving model parameters intact. It works with API-only models and yields inspectable text, but longer prompts incur serving costs and cannot necessarily unlock missing capabilities. GRPO instead updates weights using relative rewards across sampled outputs. The methods change different objects and require different infrastructure.

MIPROv2, a central baseline, searches instructions and few-shot demonstrations for multi-stage programs. GEPA principally revises instructions using lessons from observed executions. The relevant difference is how candidates are proposed and searched, rather than whether prompt editing is automated.

### Verbal feedback and textual gradients

Reflexion uses verbal reflections as memory for later attempts. TextGrad propagates textual criticism into updates to text variables. Such “gradients” are language-generated optimization guidance, not numerical derivatives. Trace also uses execution information, so GEPA is not the first optimizer to read failure explanations.

Its distinctive combination places reflection inside a population search. The highest-average candidate need not be the best starting point for another improvement. A lower-average candidate may contain a strategy that solves a difficult subset and merits further development.

### Rollouts and reflection calls

A rollout executes and evaluates a program on an input. That program may contain several LLM and retrieval calls. A reflection call, which proposes an instruction update, is a different unit. Full validation evaluations also consume rollouts. Consequently, rollout counts measure evaluation effort but do not directly measure API spending or GPU time across heterogeneous programs.

## Method / Architecture Details

### 1. Fixed programs and module instructions

{% include figure.liquid loading="eager" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig3-framework.png" class="img-fluid rounded z-depth-1" caption="Figure 3: GEPA's loop of candidate selection, execution-trace collection, reflective instruction updates, evaluation, and population updates." zoomable=true %}

The paper represents a program as modules connected by control flow. Each module has instructions, model weights, and input/output interfaces. Core GEPA optimizes the instructions while preserving weights and program structure. A candidate is therefore a complete configuration of module prompts, not necessarily one string.

Changing a query generator changes the inputs reaching downstream summarizers and answerers. Reflection receives information relevant to the chosen module, but the complete program determines candidate quality. A locally plausible instruction is useful only if its downstream effects improve the measured objective.

The initial population contains the seed configuration. Subsequent candidates retain their ancestry and per-example validation scores. These records support parent selection and merging; the ordinary final artifact is one selected prompt configuration.

### 2. Execution traces and three-example reflection

An iteration selects a parent and a module. Experiments cycle through modules round-robin and sample three training examples. Reflection reads the current instruction, module inputs and outputs, relevant reasoning, and evaluation feedback before proposing a replacement.

Execution traces describe what happened; evaluator traces explain which requirements succeeded or failed. Missing retrieved documents, violated output constraints, compiler diagnostics, and profiler measurements provide different kinds of actionable evidence. Module-specific feedback can further connect a failure to the component being edited.

For example, a second retrieval query might merely repeat the original question instead of using a bridge entity found by the first search. Seeing that intermediate state supports a concrete instruction about missing relations and known entities. The appendix's HotpotQA prompts develop such strategies. The procedure converts observed failures into reusable guidance rather than treating reflection as an unlimited source of new knowledge.

### 3. Minibatch acceptance and full validation

The revised candidate runs on the same three examples as its parent. A higher average score admits it into the candidate pool and triggers evaluation on the full Pareto validation set. This gate avoids spending full validation effort on every proposal and prevents an eloquent critique from being accepted without execution.

The child need not beat the globally best average candidate. Improving its selected parent on the minibatch can earn admission, and strengths on particular validation examples may preserve its future selection probability. This differs from repeatedly updating only the current average winner.

The validation set guides search; it is not the held-out test set. At termination, GEPA returns the single candidate with the best aggregate validation score. The six-benchmark results do not use a test-time oracle that chooses a different prompt after seeing each test answer.

### 4. Instance-level Pareto selection

For each validation example, GEPA identifies candidates tied for the highest score. It takes their union, removes dominated candidates, and samples parents in proportion to the number of retained per-example best sets containing them. Selection is neither uniform over candidates nor a six-objective optimization over the six benchmarks: instances within one task provide the selection dimensions.

As an illustrative example, candidate A might solve most easy retrieval questions while B uniquely solves a difficult multi-hop question. An average-ranked beam can discard B. Instance-level preservation leaves B available for reflection that may generalize its strategy. Candidates still need an observed strength; the method does not preserve arbitrary low performers indefinitely.

This balances concentration and diversity within the observed validation distribution. It cannot protect capabilities on failure types that the validation set never measures.

### 5. Common-ancestor system-aware merging

GEPA+Merge compares two candidates with a common ancestor. For each module, a change made by only one parent is retained. If both changed it, the higher aggregate-scoring parent's prompt is selected, with separate tie handling. This combines module configurations rather than asking an LLM to splice arbitrary sentences.

Although the prose emphasizes complementary changes, Appendix Algorithms 3–4 also handle overlapping modifications. They require an appropriate one-sided change and apply ancestry, score, and previously-tried-pair checks. Experiments allow at most five merge calls.

Separately useful module changes can interact badly after composition. A query generator and summarizer may now disagree about the information being passed. Merge is another candidate proposal mechanism whose value must be measured, consistent with its opposite aggregate effects on the two evaluated models.

## Learning Objective / Loss Function

GEPA does not backpropagate through a differentiable prompt loss. A compact rendering of its objective uses program $\Phi$, prompts $\Pi$, fixed weights $\Theta$, metric $\mu$, and rollout budget $B$:

$$
\begin{aligned}
\Pi^\star &\in \arg\max_{\Pi}\;
\mathbb{E}_{(x,m)\sim\mathcal{D}}
\left[\mu\bigl(\Phi(x;\Pi,\Theta),m\bigr)\right] \\
\text{subject to}\quad &N_{\mathrm{rollout}}\le B.
\end{aligned}
$$

Here $m$ supplies reference answers or evaluation metadata. Finite training and validation samples approximate the unknown distribution. Reflection quality is not itself the objective: an evaluator that rewards undesirable behavior will direct the search toward it.

For candidate $c$ and validation example $i$, let $S\_{c,i}$ be the measured score. Candidate selection begins with:

$$
\begin{aligned}
s_i^\star &= \max_{c\in\mathcal{C}} S_{c,i}, \\
\mathcal{P}_i^\star &= \{c\in\mathcal{C}:S_{c,i}=s_i^\star\}.
\end{aligned}
$$

After pooling these sets and removing dominated candidates, let $f(c)$ count the retained best sets containing candidate $c$. The sampling probability is:

$$
p(c)=\frac{f(c)}{\sum_{c'\in\mathcal{C}_{\mathrm{keep}}} f(c')}.
$$

This summarizes Algorithm 2. Aggregate quality selects the final artifact, while instance-level strengths allocate opportunities for further search.

## Training Data and Pipeline

### Six tasks and evaluation units

| Task | Train / validation / test | Program and metric focus |
|------|------|------|
| HotpotQA | 150 / 300 / 300 | Multi-hop retrieval and question answering |
| IFBench | 150 / 300 / 294 | Drafting, rewriting, and instruction compliance |
| HoVer | 150 / 300 / 300 | Gold-document retrieval with up to three hops |
| PUPA | 111 / 111 / 221 | Privacy-constrained external-model queries and response quality |
| AIME-2025 | 45 / 45 / 30 unique test problems | Optimization on 2022–2024 problems; five generations per 2025 problem |
| LiveBench-Math | 368 examples split approximately into thirds | July 30, 2025 snapshot |

AIME's 150 test generations are not 150 independent problems. IFBench uses IF-RLVR training material and unseen test constraints, while LiveBench uses a shuffled snapshot rather than a prospective temporal test. HoVer's reported objective is document retrieval, not final fact-verification accuracy. PUPA combines utility and leakage considerations; its score is not a universal privacy guarantee.

### Models, baselines, and budgets

| Component | Main configuration |
|------|------|
| Models | Qwen3-8B; GPT-4.1 Mini version 2025-04-14 |
| Context | 16,384 tokens |
| Sampling | Qwen temperature 0.6, top-p 0.95, top-k 20; GPT temperature 1 |
| GEPA | Three-example reflection; round-robin modules; at most five merges |
| Data roles | Training for feedback; validation for Pareto selection |
| MIPROv2 | Heavy configuration; 18 instruction and 18 few-shot-set candidates |
| Main GRPO | LoRA rank 16, alpha 64, dropout 0.05; 500 steps and 24,000 rollouts |
| GRPO updates | Groups of 12, four inputs per step, learning rate $10^{-5}$ |

GEPA budgets follow measured MIPROv2 rollout usage, within 10.15%; this is not equal wall-clock budgeting. TextGrad and Trace receive corresponding tasks and feedback, subject to differences in supported module-feedback interfaces.

The main GRPO comparison uses LoRA with one H100 or A100 80GB training GPU and separate inference resources. A full-parameter control also appears in the appendix, but uses a simplified two-hop HoVer setup. It does not establish a six-task victory over full-parameter GRPO. The authors tried multiple GRPO hyperparameters, without exhausting all possible RL configurations.

## Experimental Results

### Qwen3-8B against GRPO and MIPROv2

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/tab1-qwen.png" class="img-fluid rounded z-depth-1" caption="Table 1: Six-task Qwen3-8B scores, aggregate scores, and gains over baseline; GEPA and GRPO rollout budgets in the bottom rows." zoomable=true %}

GEPA averages 54.85, exceeding GRPO's 48.91 by 5.94 points and MIPROv2's 47.84 by 7.01. Its gain over the 45.23 baseline is 9.62 points. These are aggregates of different task metrics on a 0–100 scale, not one pooled accuracy.

The largest GRPO gaps include HotpotQA at 62.33 versus 43.33 and HoVer at 52.33 versus 38.67. Trace-based diagnosis appears well suited to multi-stage retrieval. AIME reverses the ranking: GEPA scores 32.00 versus GRPO's 38.00. “Can outperform” does not mean consistent dominance.

GEPA+Merge averages 52.40, below plain GEPA. IFBench falls from 38.61 to 28.23, and PUPA from 91.85 to 86.26. Successful module changes require validation after composition.

### Rollout efficiency at 678 and 3,593 evaluations

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig1-rollout-efficiency.png" class="img-fluid rounded z-depth-1" caption="Figure 1: Qwen3-8B validation-score curves against rollout counts and test-score stars; HotpotQA on the left and IFBench with a separate right-hand test-score axis on the right." zoomable=true %}

GEPA discovers its best IFBench prompt at rollout 678, approximately 35.4 times fewer than GRPO's 24,000. The full GEPA IFBench search nevertheless consumes 3,593 rollouts. Retrospectively locating the winning candidate does not establish that an optimizer would know to stop there.

Table 1 budgets range from 1,839 to 7,051 across tasks, averaging 3,936. Relative to GRPO's 24,000 per task, that is roughly 6.1-fold fewer total rollouts. Reflection calls, prompt lengths, internal program calls, and training costs prevent direct conversion into identical monetary or latency ratios.

### GPT-4.1 Mini prompt-optimizer comparison

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/tab2-gpt.png" class="img-fluid rounded z-depth-1" caption="Table 2: Six-task GPT-4.1 Mini results for Trace, MIPROv2, TextGrad, and GEPA, including transfer of prompts optimized on Qwen3-8B." zoomable=true %}

From a 53.03 baseline, GEPA reaches 65.22 and GEPA+Merge 66.36. MIPROv2 scores 58.67, TextGrad 59.14, and Trace 56.30. GEPA's MIPROv2 advantage is 6.55 points, or 7.69 with Merge. This table contains no GPT weight-training comparison.

AIME reaches 59.33 versus MIPROv2's 51.33, an 8-point gap. The 12-point AIME gap belongs to the Qwen experiment. Merge improves IFBench, HoVer, and PUPA but lowers HotpotQA from 69.00 to 65.67.

Prompts optimized for Qwen3-8B transfer to GPT-4.1 Mini at 62.03, 9 points above its baseline but below direct GEPA optimization. Some strategies transfer; the experiment does not show universal or symmetric portability across model pairs.

### NPU kernels and environmental feedback

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig7-npu.png" class="img-fluid rounded z-depth-1" caption="Figure 7: AMD NPU vector utilization; mean percentages by method on the left and per-kernel percentages for functionally correct kernels on the right." zoomable=true %}

On AMD XDNA2 NPUs, GPT-4o receives compiler and profiler feedback. Mean vector utilization rises from 4.25% with up to ten sequential refinements to 16.33% with RAG and 19.03% with RAG plus MIPROv2. GEPA's best single prompt reaches 26.85% without runtime RAG, incorporating lessons gathered during optimization.

The higher 30.52% Pareto result uses the best outcomes across candidates per task. It is distinct from the single-prompt result. Search operates on the target kernel set itself, so this is inference-time optimization rather than the earlier held-out generalization setting. Vector utilization is also distinct from correctness or end-to-end speedup.

CUDA experiments cover 35 representative tasks on an NVIDIA V100. A fast₁ value above 20% denotes the fraction of correct kernels faster than PyTorch eager, not a uniform 20% speedup. These results support learning hardware-specific guidance from execution, with transfer to new kernels and hardware still requiring evaluation.

## Results Analysis / Ablation

### Candidate selection and search diversity

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/tab3-fig6-selection.png" class="img-fluid rounded z-depth-1" caption="Table 3 and Figure 6: Four-task Qwen3-8B candidate-selection ablation above; best-average and Pareto search trees below, with candidate identifiers and scores on nodes." zoomable=true %}

Holding the evolution harness fixed, SelectBestCandidate averages 54.89, a four-candidate BeamSearch 53.95, and GEPA 61.28. GEPA gains 6.39 points over greedy parent selection and 7.33 over beam search. Reflection alone does not explain the result; allocating search across different parents matters.

The trees illustrate a run where greedy selection concentrates around one branch while Pareto selection develops several lineages. They do not prove global optimality. This ablation averages four tasks, so its 61.28 should not be compared directly with the six-task 54.85.

### Instruction length against few-shot demonstrations

{% include figure.liquid loading="lazy" path="assets/img/papers/0043-gepa-reflective-prompt-evolution-can-outperform-reinforcemen/fig18-prompt-length.png" class="img-fluid rounded z-depth-1" caption="Figure 18: Optimized prompt token counts across four tasks, with GPT-4.1 Mini above, Qwen3-8B below, and length ratios relative to MIPROv2 above the bars." zoomable=true %}

For the four-task aggregate, GPT-4.1 Mini GEPA prompts are 4.3 times shorter than MIPROv2's, and Merge prompts 4.8 times shorter. Qwen ratios are 4.9 and 4.5; the largest individual difference is 9.2 on PUPA with Merge. The denominator is optimized MIPROv2, not the seed instruction.

Instructions can compress lessons more economically than repeated demonstrations. Nevertheless, appendix prompts sometimes accumulate lengthy rules and exceptions. Lower input token counts suggest serving savings but do not establish latency improvements independently of output length and reasoning behavior.

### Adversarial prompts and evaluation format

An additional experiment optimizes attacks on AIME 2022–2024 and reduces GPT-5 Mini's AIME-2025 pass@1 from 76% to 10%. This is not evidence that mathematical capability disappears. The evolved prompt introduces irrelevant material and output instructions; observed failures include emitting the literal placeholder `### <final answer>`.

The result exposes instruction and scoring-path vulnerability. It also illustrates a general constraint: GEPA follows the evaluator's objective, including opportunities to exploit its weaknesses.

## Limitations and Critical Assessment

### Repeated validation and small test sets

Repeatedly using the Pareto set can favor candidates exploiting peculiar validation successes. A held-out test set helps, but AIME still contains only 30 unique test questions. Repeated generations do not substitute for broader problem coverage or repeated optimization runs.

Appendix prompts include both reusable strategies and specific names or unusually prescriptive rules, such as question repetition. These observations do not isolate the cause of any measured degradation. They do show why a high-scoring prompt still needs inspection for conflicting instructions and unwanted behavior.

### Scope of the reinforcement-learning comparison

The main GRPO results concern one model, a LoRA configuration, selected hyperparameters, and a 24,000-rollout budget. They do not settle comparisons with larger models, longer training, or other RL algorithms. AIME's reversal leaves room for weight updates to improve capabilities that prompting cannot expose sufficiently.

Deployment decisions also require total optimization cost, serving prompt length, expected request volume, and final quality. Rollout efficiency is useful evidence, but it is not a complete infrastructure budget.

### Feedback quality and module interactions

Compiler messages and missing-document lists provide concrete diagnostic targets. Long-term satisfaction or ambiguous creative quality may not. A fluent reflection can offer an incorrect causal explanation when feedback is weak.

Merge adds interaction risks and consumes evaluation budget that could support other search paths. The experiments do not isolate how much each factor explains the Qwen decline. A matched-budget comparison on the intended application is more informative than assuming Merge should always be enabled.

## Takeaways

- <strong>Design diagnostic feedback alongside the score.</strong> Constraint failures and intermediate state give reflection evidence it can act on.
- <strong>Separate final ranking from search allocation.</strong> Optimizing an average need not imply always expanding its current winner.
- <strong>Keep independent tests for prompt changes.</strong> Readable instructions and a few successful examples do not establish generalization.
- <strong>Evaluate composition and transfer separately.</strong> Reusable strategies exist, but merging or changing models can still hurt.
- <strong>Compare prompting and RL incrementally.</strong> Establish what instruction optimization exposes before judging which remaining gaps justify weight training.

## Installation and Usage

The official [GEPA repository](https://github.com/gepa-ai/gepa) uses the MIT license. This abbreviated version of its current AIME quickstart illustrates the API, not an exact paper reproduction. Provider credentials and paid task/reflection model calls are required.

```bash
pip install "gepa[full]"
```

```python
import gepa

trainset, valset, _ = gepa.examples.aime.init_dataset()
result = gepa.optimize(
    seed_candidate={
        "system_prompt": "Solve the problem. Put the final answer as ### <answer>."
    },
    trainset=trainset,
    valset=valset,
    task_lm="openai/gpt-4.1-mini",
    reflection_lm="openai/gpt-5",
    max_metric_calls=150,
)
print(result.best_candidate["system_prompt"])
```

The GPT-5 reflection setting and 150-call budget should not be attributed to all paper experiments. The repository has evolved, and README examples have different reproduction conditions from the reported tables. No paid optimization was run for this review. For a new application, define the seed program and metric, then separate feedback training data, selection validation data, and a final held-out test.

## References

- Paper: [GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning](https://arxiv.org/abs/2507.19457), Agrawal et al., arXiv v2, ICLR 2026 Oral.
- Code and usage examples: [gepa-ai/gepa](https://github.com/gepa-ai/gepa), MIT license.
- Figure and table attribution: Figures 1, 3, 6, 7, 18 and Tables 1–3 from Agrawal et al. The paper's [arXiv non-exclusive distribution license](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html) is separate from the code's MIT license.

## Further Reading

- **[Optimizing Instructions and Demonstrations for Multi-Stage Language Model Programs](https://arxiv.org/abs/2406.11695)** (Opsahl-Ong et al., 2024): Instruction and demonstration search underlying MIPRO for multi-stage programs.
- **[TextGrad: Automatic “Differentiation” via Text](https://arxiv.org/abs/2406.07496)** (Yuksekgonul et al., 2024): Textual feedback as update guidance for text variables.
- **[Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366)** (Shinn et al., 2023): Verbal reflections as memory for subsequent attempts.
- **[DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines](https://arxiv.org/abs/2310.03714)** (Khattab et al., 2023): Modular language-model programs and metric-driven compilation.

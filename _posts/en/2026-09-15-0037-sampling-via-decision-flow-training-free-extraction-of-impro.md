---
layout: post
title: "[Paper Review] Sampling via Decision-Flow: Training-Free Extraction of Improved Latent Reasoning Paths in Large Language Models"
date: 2026-09-15 17:18:46 +0900
description: "How DF-Sample combines reasoning trees, terminal energy, and backward utilities, and what its GPT-4o evaluator, benchmark exceptions, and search costs imply."
tags: ["large-language-models", "reasoning", "inference-time-scaling", "tree-search", "sampling"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0037-sampling-via-decision-flow-training-free-extraction-of-impro/fig4-decision-flow.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0037-sampling-via-decision-flow-training-free-extraction-of-impro/
ko_url: /papers/0037-sampling-via-decision-flow-training-free-extraction-of-impro/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Zhendong Mi, Shaoyi Huang (Stevens Institute of Technology · USA) |
| Venue | arXiv · 2026 · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| arXiv or DOI | [2609.12317](https://arxiv.org/abs/2609.12317) |
| Data | MATH500 · HumanEval · GPQA-Diamond · AlpacaEval 2.0 |
| <span style="white-space: nowrap">Review date</span> | 2026-09-15 |

## TL;DR

- DF-Sample builds a reasoning tree, evaluates its leaves, propagates utilities backward, and samples a path using generation priors multiplied by utility. It leaves the generator's weights unchanged.
- Qwen2.5-Math-7B reaches 81.8% on MATH500 and 45.6% on GPQA-Diamond, beating GRPO by 3.3 and 5.7 percentage points. There are meaningful exceptions across the other models and tasks.
- Training-free does not mean evaluator-free: terminal quality is scored with GPT-4o. Power Sampling, the principal sampling baseline, uses the base model's own likelihoods.
- MATH500 inference takes approximately 384 seconds per question versus 340 for Power Sampling. An approximately 620-token final response does not account for the entire search tree.
- The results support improving candidate selection without additional generator training. They do not establish that RL only sharpens distributions or that search universally replaces training.

## Introduction

A model can fail because it does not produce the right reasoning, or because it rarely chooses reasoning it can already produce. Consider $x^2=5x$: dividing by $x$ is a familiar shortcut, but it discards the solution $x=0$. Factoring preserves both solutions. Figure 2 uses this example to illustrate a mismatch between plausible generation and valid reasoning; its probabilities are illustrative, not benchmark measurements.

This distinction motivates a question about reinforcement learning. Does RL add reasoning strategies, or make existing successful strategies easier to sample? These possibilities need not be exclusive. Still, if candidate selection is a substantial bottleneck, inference-time search could recover some performance without updating weights. The challenge is finding useful paths under a finite budget, especially when an attractive early step leads to a bad conclusion.

Mi and Huang's [Sampling via Decision-Flow](https://arxiv.org/abs/2609.12317) addresses that challenge by expanding alternatives before committing to them. Evaluations at the end of a tree affect decisions near its root. Understanding the result requires following the complete system: a generator proposes text, a tree organizes alternatives, and GPT-4o supplies a quality signal. The distinction between generating a correct candidate and recognizing it is central to the review.

## Key Contributions

- **Terminal utility for reasoning search.** The final step's likelihood and quality score determine an energy, which is converted into a positive utility.
- **Backward utility propagation and posterior selection.** Parents receive prior-weighted child utilities; selection combines the same priors with those utilities. This is numerical aggregation, not neural-network training.
- **Block-wise search.** Fixed-depth blocks limit exponential growth, at the cost of limiting lookahead across the full solution.
- **Evaluation across several domains.** Three models and four benchmarks are accompanied by branching and energy-coefficient ablations, Pass@k curves, and output-distribution analyses.

## Background and Related Work

### Distribution sharpening and Pass@k

Distribution sharpening concentrates probability around preferred outputs. It can improve a single attempt without expanding the set of problems a model can eventually solve. Concentration can also reduce exploration across repeated attempts. The paper adopts this perspective as motivation; it does not prove that every RL method works only this way.

Pass@k asks whether at least one of k candidates is correct. Small k emphasizes accessible successes; larger k probes broader coverage. [Yue et al. (2025)](https://arxiv.org/abs/2504.13837) use this distinction to investigate RL with verifiable rewards (RLVR) and base-model reasoning boundaries. But DF-Sample's Pass@1 already includes internal search. Equal numbers of returned answers do not imply equal token budgets or model calls.

### Power Sampling and Tree of Thoughts

[Power Sampling](https://arxiv.org/abs/2510.14901), introduced by Karan et al. (2025), uses iterative likelihood-based sampling without additional training or a verifier. DF-Sample changes both the search procedure and the information used to recognize useful candidates by introducing GPT-4o scoring.

[Tree of Thoughts](https://arxiv.org/abs/2305.10601) supplies the broader background of searching over natural-language reasoning units. A reasoning tree alone is therefore not the distinctive contribution. The relevant design is the combination of priors, terminal energy, recursive utility, and posterior path sampling, drawing on the Decision Flow perspective in [Sampling Decisions](https://arxiv.org/abs/2503.14549v1).

## Method / Architecture

### 1. Hierarchical reasoning tree

For an input question $q$, let $s\_v$ be the text generated at node v and $s\_{<v}$ its preceding path. Each parent independently produces K candidate extensions. Repeating this for L levels creates the search tree. A node represents a reasoning step, not a single token. Its text likelihood is accumulated over the tokens within that step:

$$
\begin{aligned}
&\log p(s_v\mid q,s_{<v})\\
&\quad=\sum_{t=1}^{|s_v|}\log p(w_t\mid q,s_{<v},w_{<t}).
\end{aligned}
$$

The tree is expanded before path selection. Alternatives can therefore be evaluated through their descendants rather than discarded immediately. The search still cannot recover a path that never appears among the sampled candidates.

There is a normalization distinction worth keeping explicit: terminal energy uses a length-normalized likelihood, while the sibling prior below uses the exponentiated sum of token log-probabilities. The paper's definitions do not apply the same length normalization to both quantities. Variable-length candidate steps can consequently affect the prior.

{% include figure.liquid loading="eager" path="assets/img/papers/0037-sampling-via-decision-flow-training-free-extraction-of-impro/fig4-decision-flow.png" class="img-fluid rounded z-depth-1" caption="Figure 4. Tree construction, terminal evaluation, backward utility propagation, and posterior path selection. Cropped from the original with adjusted margins. The numbers illustrate the procedure." zoomable=true %}

### 2. Terminal energy and utility

The paper uses the final reasoning step as a proxy for trajectory quality because conclusions often summarize earlier reasoning. Its Figure 5 illustrates this with a magnetic-monopole question whose final step identifies the implication for Gauss's law for magnetism. This motivates evaluating the terminal summary, but does not establish that summaries always expose earlier mistakes.

Equations (3) and (4) define:

$$
\begin{aligned}
E(v_L)&=-\alpha\frac{\log p(s_{v_L}\mid q,s_{<v_L})}{|s_{v_L}|}\\
&\quad+R(s_{v_L}),\\
U(v_L)&=\exp\bigl(-E(v_L)\bigr).
\end{aligned}
$$

The first term rewards a confident final step through its average log-likelihood. R is called a quality score, but **lower R means better quality**. It behaves like a penalty rather than a conventional positive reward. Lower energy produces higher utility. The implementation evaluates R using GPT-4o.

The generator thus supplies a likelihood signal, while another model supplies quality judgments. A confident but unsupported conclusion can still fool the evaluator. Evaluating the last node economizes on assessment, but its adequacy as a proxy for the whole chain remains a substantive assumption.

### 3. Backward utility propagation

Write v for a parent, C(v) for its sampled children, and u for one child. With the question and preceding path included in the context, the paper's Equations (5) and (6) become:

$$
\begin{aligned}
\ell(u)&=\log p(s_u\mid q,s_{<u}),\\
p_{\mathrm{prior}}(u\mid v)
&=\frac{\exp\ell(u)}{\sum_{z\in C(v)}\exp\ell(z)},\\
U(v)&=\sum_{u\in C(v)}p_{\mathrm{prior}}(u\mid v)U(u).
\end{aligned}
$$

The prior is normalized over the sampled siblings, not every possible continuation. A parent receives an expected utility under that restricted prior. One excellent descendant does not automatically dominate: the probability of reaching it matters. This is a weighted average, not a maximum over child scores.

Starting at the leaves, the algorithm repeatedly applies this recursion until it reaches the root. No gradients or optimizer steps are involved. The computation changes how an existing finite tree is traversed, while leaving generator parameters fixed.

### 4. Posterior path selection

Once all utilities are available, the child-selection policy is:

$$
\pi^*(u\mid v)
=\frac{p_{\mathrm{prior}}(u\mid v)U(u)}{U(v)}.
$$

Equal sibling utilities recover the prior. Unequal utilities can increase the selection probability of a less likely continuation, provided its quality advantage is large enough. Selection is sampling from this posterior, not guaranteed selection of the highest-scoring leaf.

Figure 4 gives a concrete calculation. In the left subtree, priors 0.15, 0.20, and 0.65 multiply utilities 0.18, 0.42, and 0.76, producing a parent utility of 0.605. The third child's posterior is approximately 0.817, matching the displayed 0.82 after rounding. That is a probability of selecting this child, not an 82% probability that its answer is correct.

Algorithm 1 takes the question, model, branching factor K, total depth N, block size B, and alpha, and returns a selected reasoning chain. If that chain contains an explicit answer, the method returns it. Otherwise, it appends the chain to the question and generates a final answer using that context, as described in Section 4.4.

### 5. Block-wise sampling

A depth-L tree has K to the power L leaves. The model first estimates the required number of reasoning steps N. When N exceeds B, the method searches one block, selects a partial trajectory, appends it to the context, and continues. The last block uses the remaining depth. Default experiments use K=3 and B=3.

A fully expanded default block has 39 non-root nodes and 27 leaves. These are counts derived from the tree structure, not measured API-call counts. Batching and termination details can change calls and runtime, but a three-step selected path clearly entails substantially more than three generated candidates.

The cost reduction also limits lookahead. Earlier blocks are chosen before later blocks exist, and the algorithm does not describe revisiting discarded earlier branches. “Global” evaluation therefore refers to the constructed search tree. It does not mean exhaustive evaluation of every future solution or guaranteed global optimality across blocks.

## Inference Objective / Energy Function

### The path distribution induced by terminal utility

There is no new training loss. The objective is to sample useful paths more frequently from a fixed generator. Expanding the utility definition gives:

$$
\begin{aligned}
U(v_L)=\exp\Bigl(&\alpha\frac{\log p(s_{v_L}\mid q,s_{<v_L})}{|s_{v_L}|}\\
&-R(s_{v_L})\Bigr).
\end{aligned}
$$

Alpha, set to 4.0 by default, controls the likelihood term in the energy. It should not be casually equated with an ordinary token-decoding temperature. The scale of R matters too: changing score gaps changes posterior concentration even if candidate rankings remain the same.

The following is a reviewer derivation from the paper's equations. On a fixed tree, multiplying transition probabilities causes intermediate utilities to cancel:

$$
\begin{aligned}
\pi^*(\tau)
&=\prod_{(v,u)\in\tau}
\frac{p_{\mathrm{prior}}(u\mid v)U(u)}{U(v)},\\
&=P_{\mathrm{prior}}(\tau)\frac{U(v_L)}{U(v_0)}.
\end{aligned}
$$

The resulting path probability is its tree prior weighted by terminal utility. This explains why backward propagation consistently translates a terminal evaluation into intermediate choices. The identity applies to the sampled tree; it is neither an exactness claim over all possible language-model outputs nor a guarantee that the evaluator captures correctness.

## Evaluation Data and Pipeline

### Benchmarks and evaluator roles

| Benchmark | Size | Reported evaluation |
|---|---:|---|
| MATH500 | 500 problems | Competition-math accuracy |
| HumanEval | 164 tasks | Generated code passes every associated unit test |
| GPQA-Diamond | 198 questions | Graduate-level science multiple-choice accuracy |
| AlpacaEval 2.0 | 805 prompts | Length-normalized win rate judged by GPT-4-Turbo |

GPT-4-Turbo measures AlpacaEval outcomes; GPT-4o scores terminal quality inside DF-Sample. One is part of benchmark evaluation, the other helps determine which answer the system produces. Their computational and informational roles should not be conflated.

### Models and implementation conditions

| Item | Reported setting |
|---|---|
| Generators | Qwen2.5-Math-7B, Qwen2.5-7B, Phi-3.5-mini-instruct |
| Baselines | Base greedy decoding, Low-temperature, GRPO (MATH), Power Sampling |
| Branching and block depth | K=3, B=3 |
| Energy coefficient | alpha=4.0 |
| Terminal quality scorer | GPT-4o |
| Hardware | Two NVIDIA A6000 GPUs |
| Other hyperparameters | Described as consistent with Power Sampling |
| Baseline results | Taken from Karan et al. (2025) |

Phi is an instruct checkpoint, so this is not exclusively a comparison of untouched pretrained base models. Training-free means no additional generator training by DF-Sample. Likewise, data-free should be understood as avoiding a new fine-tuning dataset, not eliminating the knowledge carried by the evaluator.

Reproduction also needs the R-scoring prompt and scale, reasoning-step boundaries, and the precise N-estimation procedure. Those details are not specified sufficiently to reconstruct the complete system from the paper alone. Baselines were not all rerun under one common evaluation setup.

## Results

### Table 1: model-specific gains and exceptions

{% include figure.liquid loading="eager" path="assets/img/papers/0037-sampling-via-decision-flow-training-free-extraction-of-impro/tab1-main-results.png" class="img-fluid rounded z-depth-1" caption="Table 1. Results across three models and four benchmarks. The first three columns use fractional accuracy; the last reports AlpacaEval's length-normalized win rate. DF-Sample does not lead every comparison." zoomable=true %}

DF-Sample improves over each Base row in all twelve model-task combinations. It beats every listed baseline in nine. The following table converts accuracy to percentages and compares DF-Sample with the strongest other baseline in each cell; AlpacaEval retains the original numerical scale.

| Model · task | DF-Sample / strongest baseline | Difference |
|---|---|---:|
| Qwen2.5-Math-7B · MATH500 | 81.8 / GRPO 78.5 | +3.3 pp |
| Qwen2.5-Math-7B · HumanEval | 59.1 / Power Sampling 57.3 | +1.8 pp |
| Qwen2.5-Math-7B · GPQA-Diamond | 45.6 / GRPO 39.9 | +5.7 pp |
| Qwen2.5-Math-7B · AlpacaEval 2.0 | 3.06 / Power Sampling 2.88 | +0.18 |
| Qwen2.5-7B · MATH500 | 73.6 / GRPO 74.0 | −0.4 pp |
| Qwen2.5-7B · HumanEval | 64.6 / Power Sampling 62.2 | +2.4 pp |
| Qwen2.5-7B · GPQA-Diamond | 35.9 / GRPO 35.4 | +0.5 pp |
| Qwen2.5-7B · AlpacaEval 2.0 | 9.19 / Power Sampling 8.59 | +0.60 |
| Phi-3.5-mini-instruct · MATH500 | 54.4 / Power Sampling 50.8 | +3.6 pp |
| Phi-3.5-mini-instruct · HumanEval | 66.5 / Power Sampling 73.2 | −6.7 pp |
| Phi-3.5-mini-instruct · GPQA-Diamond | 39.4 / Power Sampling 36.4 | +3.0 pp |
| Phi-3.5-mini-instruct · AlpacaEval 2.0 | 17.89 / Low-temperature 18.15 | −0.26 |

### GPQA-Diamond and MATH500

The headline GPQA-Diamond result is Qwen2.5-Math-7B at 45.6%, versus GRPO's 39.9% and Power Sampling's 38.9%. The gains are 5.7 and 6.7 percentage points. This is a substantial reported improvement, although 45.6% remains far from reliable science-question answering. The proposed explanation, that scientific reasoning benefits particularly from trajectory-level evaluation, is plausible but not causally isolated.

On MATH500, the same model reaches 81.8%, compared with 78.5% for GRPO and 74.8% for Power Sampling. The latter gap is 7.0 percentage points. General Qwen2.5-7B reverses the GRPO comparison: 73.6% for DF-Sample versus 74.0%. The math-specialized model's result should not stand in for every checkpoint.

### HumanEval and AlpacaEval 2.0

Qwen2.5-7B improves on HumanEval from Power Sampling's 62.2% to 64.6%. Phi instead falls from 73.2% to 66.5%. The paper does not decompose this reversal into candidate-generation, search, or evaluator errors. It raises a useful question about how reliably terminal quality scoring captures executable correctness.

AlpacaEval scores rise above Base for all three models: 3.06 versus 1.61, 9.19 versus 7.05, and 17.89 versus 14.82. However, Phi's Low-temperature baseline reaches 18.15. These are comparative win rates, not mathematical correctness rates; the numbers should not be merged indiscriminately with the other tasks.

### Response length and latency

{% include figure.liquid loading="eager" path="assets/img/papers/0037-sampling-via-decision-flow-training-free-extraction-of-impro/fig8-response-length.png" class="img-fluid rounded z-depth-1" caption="Figure 8. Average MATH500 response length for Qwen2.5-Math-7B: Base 600, GRPO 671, Power Sampling 679, DF-Sample 620 tokens. This is not a count of all candidates generated and discarded during search." zoomable=true %}

The figure labels DF-Sample at 620 tokens; the prose says approximately 619. This review follows the plotted label. A shorter returned response than Power Sampling or GRPO does not imply fewer total generated tokens. Discarded branches and GPT-4o evaluation also consume resources.

Reported MATH500 latency is approximately 384 seconds per question for DF-Sample and 340 seconds for Power Sampling: about 44 seconds, or 12.9%, longer from the supplied values. That trades additional time for the reported accuracy gain. Total search tokens, evaluator charges, latency distributions, and a detailed timing breakdown are not supplied.

## Analysis and Ablation

### Likelihood versus token confidence

{% include figure.liquid loading="eager" path="assets/img/papers/0037-sampling-via-decision-flow-training-free-extraction-of-impro/fig6-7-distributions.png" class="img-fluid rounded z-depth-1" caption="Figures 6 and 7. Average response log-likelihood and token confidence on MATH500. Confidence is negative entropy under the paper's equation. A broader distribution does not itself demonstrate semantically diverse correct answers." zoomable=true %}

Figure 6 concerns the likelihood of generated tokens. Figure 7 concerns uncertainty across the whole next-token distribution. Its confidence definition can be written as:

$$
\begin{aligned}
H_t&=-\sum_{x\in\mathcal X}
 p(x\mid x_{<t})\log p(x\mid x_{<t}),\\
\mathrm{Conf}(x_{0:T})&=-\frac{1}{T+1}\sum_{t=0}^{T}H_t.
\end{aligned}
$$

Values closer to zero indicate lower entropy. DF-Sample extends further into lower-confidence regions than the other methods in Figure 7, while GRPO concentrates near high confidence. The authors interpret this as accessing useful but locally uncertain paths. The histogram does not separate correct and incorrect responses, however, so broader uncertainty is not by itself evidence that those regions caused the accuracy gain.

### GPQA-Diamond: branching factor K

{% include figure.liquid loading="eager" path="assets/img/papers/0037-sampling-via-decision-flow-training-free-extraction-of-impro/fig9-branching.png" class="img-fluid rounded z-depth-1" caption="Figure 9. Qwen2.5-Math-7B reaches 39.4%, 45.6%, and 54.0% on GPQA-Diamond at K=2, 3, and 4. More branches also require more generation and terminal evaluation." zoomable=true %}

The three accuracies exceed Power Sampling's 38.9% by 0.5, 6.7, and 15.1 percentage points, calculated directly from Figure 9. Wider search helps in this experiment, but the computational investment changes simultaneously.

For a fully expanded B=3 block, K=2, 3, and 4 imply 14, 39, and 84 non-root nodes, with 8, 27, and 64 leaves. These structural counts show why increasing K by one need not be a small expense. The authors choose K=3 for balance, but do not provide measured latency or evaluator cost for every point in this ablation.

### Pass@k and energy coefficient alpha

{% include figure.liquid loading="eager" path="assets/img/papers/0037-sampling-via-decision-flow-training-free-extraction-of-impro/fig10-tab2-passk-alpha.png" class="img-fluid rounded z-depth-1" caption="Figure 10 and Table 2. MATH500 Pass@k above, GPQA-Diamond alpha ablation below, cropped together from adjacent results. Table 2 reports 45.9% at alpha=4, whereas the main Table 1 reports 45.6%." zoomable=true %}

DF-Sample's Pass@k advantage is clearest at k=1 and k=2. Power Sampling approaches it as k grows and slightly exceeds it at some larger values. Base sampling also reaches high coverage with enough attempts. These curves concern finding at least one correct candidate; choosing that candidate without the answer key remains a separate problem.

Table 2 reports 30.3%, 40.9%, 48.0%, 45.9%, and 27.8% for alpha values 100, 10, 5, 4, and 1. Moderate likelihood weighting works best in this test. The 45.9% entry at alpha=4 differs from the main result of 45.6%; the paper does not explain whether this reflects different runs or conditions. Neither value should silently replace the other, and alpha=5 is not established as a universal optimum.

## Limitations and Critical Assessment

### Evaluator assistance versus search mechanics

GPT-4o contributes judgment even though generator weights stay fixed. Demonstrating that a generator can propose a correct answer differs from demonstrating that it can identify that answer unaided. DF-Sample is a valid combined system, but its entire gain cannot be attributed to the base generator's independent selection ability.

The key missing comparisons are Best-of-N with the same GPT-4o scorer and candidate budget, likelihood-only DF-Sample, and alternative backup or selection rules over the same tree. K and alpha ablations establish sensitivity; they do not isolate the contribution of backward utility propagation from stronger evaluation.

### Terminal proxies and block boundaries

A polished conclusion can conceal invalid intermediate reasoning. The paper does not directly compare final-node scoring with full-chain or process-level evaluation. Block terminals may also precede the problem's actual conclusion, making the rubric for partial reasoning particularly important.

Errors in estimated depth N can truncate useful reasoning or waste expansion. Small B limits cost but also prevents early choices from benefiting from distant consequences. No recovery procedure for an earlier discarded branch is described. Long-horizon behavior and depth-dependent quality-cost tradeoffs need further measurement.

### Comparison budgets and repeated inference

Baselines come from prior work rather than a single matched evaluator and compute setup. The comparison includes an instruct checkpoint and MATH-trained GRPO; it cannot establish the same ranking for other RL recipes or larger models. Repeated-run variation and confidence intervals are not reported, limiting interpretation of narrow leads.

The authors themselves propose distilling discovered paths back into model weights as future work. Search currently incurs cost on each question; successful distillation could move some of that work into training. The paper does not test this extension. The practical question is how to balance training investment, repeated inference, and external evaluation, rather than whether one universally eliminates the others.

## Takeaways

- **Measure proposal quality and selection quality separately.** Correct-candidate coverage, chosen-answer accuracy, and evaluator resources reveal different parts of the system.
- **Backward utilities connect early choices to downstream outcomes.** A prior-weighted recursion and a prior-times-utility selection rule explain the mechanism without invoking parameter training.
- **Training-free systems can still use external knowledge.** GPT-4o is part of DF-Sample's inference procedure and changes the comparison with verifier-free Power Sampling.
- **Short answers can require expensive search.** The 620-token output excludes discarded candidates and evaluator work; deployment decisions need total resource measurements.
- **Search and training can be combined.** This paper tests inference-time selection. Learning from the selected paths remains a proposed next step.

## References

- Paper: [Sampling via Decision-Flow](https://arxiv.org/abs/2609.12317). This review follows the text, figures, and tables in v1.
- Original PDF: [arXiv PDF](https://arxiv.org/pdf/2609.12317). Excerpts of Figures 4 and 6–10 and Tables 1–2 are by Zhendong Mi and Shaoyi Huang, reproduced under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) with adjusted crop margins. Figures 6–7 and Figure 10/Table 2 are each excerpted together.

## Further Reading

- **[Reasoning with Sampling: Your Base Model is Smarter Than You Think](https://arxiv.org/abs/2510.14901)** (Karan et al., 2025): The likelihood-based Power Sampling baseline, using no external verifier.
- **[Sampling Decisions](https://arxiv.org/abs/2503.14549v1)** (Chertkov et al., 2025): Decision Flow's use of terminal objectives to modify prior transitions; v1 matches the title cited by this paper.
- **[Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601)** (Yao et al., 2023): Background on search over natural-language reasoning units.
- **[Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?](https://arxiv.org/abs/2504.13837)** (Yue et al., 2025): An investigation of low-k accuracy and high-k reasoning coverage under RLVR.

---
layout: post
title: "[Paper Review] DAPO: Improving Multi-Step Reasoning Abilities of Large Language Models with Direct Advantage-Based Policy Optimization"
date: 2026-09-17 09:40:12 +0900
description: "Offline step-level RL through advantage regression: DAPO's critic training, conditional improvement guarantee, math and code results, and computational costs."
tags: ["large-language-models", "reinforcement-learning", "reasoning", "offline-rl", "credit-assignment", "value-function"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig1-pipeline.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/
ko_url: /papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Jiacai Liu et al. (8 authors, Skywork AI · Fudan University) |
| Venue | NeurIPS · 2025 |
| arXiv or DOI | [10.52202/085713-2401](https://doi.org/10.52202/085713-2401) |
| Code | [main.py in the NeurIPS supplement](https://proceedings.neurips.cc/paper_files/paper/2025/file/6789f033ebde742552e5db84fb5d414a-Supplemental-Conference.zip) |
| Data | 7,500 MATH training problems · approximately 4,000 TACO programming problems |
| <span style="white-space: nowrap">Review date</span> | 2026-09-17 |

## TL;DR

- DAPO here means **Direct Advantage-Based Policy Optimization**, an offline method that trains a critic before optimizing an actor on stored step-level advantages. It is a different paper from Decoupled Clip and Dynamic sAmpling Policy Optimization.
- The actor regresses its log-probability ratio against advantage divided by beta. Candidate steps receive different targets even when they belong to trajectories with the same final outcome.
- On MATH, OpenO1-Llama-8B-v0.1 improves from 52.73% to 60.33%; Llama-3.1-8B-Instruct moves from 49.42% to 53.62%. Previously RL-trained Qwen2.5-Math-7B-Instruct improves from 83.42% to 84.86%.
- Gains are not universal: OpenO1 falls from 16.1% to 13.7% on LiveCodeBench, and some mathematical models regress on Minerva MATH or College Math.
- The improvement theorem assumes exact advantages and sufficient coverage. Preparing the critic's Monte Carlo targets is expensive, especially as reasoning trajectories get longer.

## Introduction

A correct answer does not make every preceding decision useful. A model can recover from a poor choice, or follow a promising strategy and fail in its last calculation. A binary reward at the end identifies success but leaves the training algorithm to decide which intermediate actions deserve credit.

A value function could help by predicting how likely the model is to succeed from each prefix. Yet learning that function is difficult too. In conventional actor-critic training, the actor changes the distribution of trajectories while the critic changes the targets guiding the actor. Inaccurate predictions and moving targets can reinforce one another.

Liu et al. separate these operations. DAPO first estimates the success probabilities of a fixed completion policy, trains a critic on those targets, and converts the critic's predictions into an offline advantage dataset. Only then does it optimize the actor. The central question is how accurately these local comparisons can guide policy improvement, and how much computation is required to obtain them.

## Key Contributions

- **An offline advantage-regression objective.** The policy learns from multiple sampled candidate steps, including candidates whose probabilities should decrease, rather than retaining only successful trajectories or constructing preference pairs.
- **Separated critic and actor training.** The critic approximates a fixed completer's value function. Its predictions become stored targets instead of changing during actor optimization.
- **A conditional policy-improvement result.** The theoretical analysis justifies the objective in a finite setting with exact values, full support, and an exact solution.
- **Evaluation beyond one starting policy.** Experiments cover SFT and RL models, mathematics and code, repeated DAPO iterations, and two hyperparameter ablations.

## Related Work / Background

### Outcome rewards and step-level advantages

Response-level methods can assign a common outcome-based advantage to the reasoning steps in a response. This does not mean every token has the same gradient magnitude: probabilities, clipping, and regularization still matter. The distinction is that the outcome signal does not separately evaluate the future consequences of each intermediate choice.

A value function predicts expected future reward under a particular continuation policy. With a binary terminal reward, it represents that policy's probability of success. An advantage compares the prospect after an action against the policy's average prospect at the same state. Negative advantage therefore need not mean that a sentence is logically false. It can mean that this particular model is less likely to finish successfully after generating it.

### Preference optimization and process supervision

[DPO](https://arxiv.org/abs/2305.18290) provides background for training through policy log-ratios, but its pairwise preference objective differs from DAPO's regression on step-level advantages. [Math-Shepherd](https://arxiv.org/abs/2312.08935) is closely related to constructing intermediate supervision from completions without human step annotations. DAPO explicitly interprets its critic as a value function for a fixed completer, rather than as an additional reward to accumulate.

[VinePPO](https://arxiv.org/abs/2410.01679) offers another perspective on value estimation and credit assignment in reasoning tasks. DAPO's specific contribution combines these concerns with offline actor optimization and a separate critic-training phase.

## Method / Architecture

### 1. States and actions defined by reasoning steps

A state contains the problem and the entire generated prefix. An action is the next reasoning step, delimited by a newline in the implementation. It can contain several tokens:

$$
\begin{aligned}
y&=(a_0,\ldots,a_{T-1}),\\
s_t&=\operatorname{Concat}(x,a_0,\ldots,a_{t-1}),\\
s_{t+1}&=\operatorname{Concat}(s_t,a_t).
\end{aligned}
$$

Only the final action receives the correctness reward; intermediate immediate rewards are zero. The same sentence can have different values in different prefixes. A newline is convenient, but it is not a guarantee of a semantically atomic decision, particularly in code.

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig1-pipeline.png" class="img-fluid rounded z-depth-1" caption="Figure 1: DAPO training pipeline. Left: prefix collection, repeated completions, and critic training. Right: next-step advantages and actor optimization." zoomable=true %}

The numerical example in Figure 1 contains an arithmetic error: the smallest positive multiple of seven ending in nine is 49, whereas the diagram labels 119 as the answer. Its useful content is the flow between critic preparation and actor training.

### 2. Generator and completer

The generator determines which intermediate states enter the dataset. For each problem, the experiments generate 32 solutions and select six, balancing correct and incorrect solutions where possible. Splitting these trajectories produces the training prefixes.

The completer then continues each prefix 16 times. The fraction of successful completions becomes its Monte Carlo value target. Twelve successes out of sixteen would produce 0.75, an illustrative calculation rather than a reported example. The target depends on the completer: a stronger model could assign a different success probability to the same text.

The experiments use the base model for both roles. In iterative DAPO, the improved actor becomes the next reference policy and the process is repeated. “Offline” describes optimization within an actor-training phase; it does not remove the preceding generation and labeling work.

### 3. Learning the critic

For a fixed reference policy, the target is:

$$
\begin{aligned}
V^{\pi_{\mathrm{ref}}}(s)
&=\Pr_{\pi_{\mathrm{ref}}}(R=1\mid s),\\
\widehat V_N(s)&=\frac{1}{N}\sum_{i=1}^{N}R_i.
\end{aligned}
$$

Here each R is the terminal correctness of a completion from the same prefix. The critic learns to predict this probability. Mathematical critics start from Qwen2.5-Math-7B-Instruct; coding critics start from Qwen2.5-coder-7B-Instruct. The model initializing the critic and the policy defining its target are distinct concepts.

Remark 3.3 emphasizes that these predictions should not simply be summed as process rewards. Repeatedly reaching states with high predicted success does not earn repeated task reward. The original goal remains terminal correctness. Treating value as an independently accumulated reward would change that goal and can introduce incentives tied to the number of steps.

### 4. Building the advantage dataset

The first step of each completion provides a candidate action. For intermediate decisions with zero immediate reward, Equation (13) estimates advantage by subtracting the mean candidate value:

$$
\begin{aligned}
q_i&=V_\phi(s\circ a_i),\\
\widehat A(s,a_i)&=q_i-\frac{1}{M}\sum_{j=1}^{M}q_j.
\end{aligned}
$$

For illustrative values 0.8, 0.5, and 0.2, the targets are 0.3, 0, and -0.3. These are comparisons within one state, not comparisons between unrelated problems. Low-value candidates can supply useful negative targets rather than being discarded.

The non-terminal qualification matters. The general Q-value includes immediate reward plus successor value. A terminal action's reward must not disappear merely because the intermediate-state formula looks simpler.

### 5. State-wise batches and filtering

Appendix F.1 adds three implementation choices. Candidates from the same state are grouped in a batch to provide contrasting gradients. After advantages are computed, duplicate actions are removed so training is uniform over the observed unique actions. Finally, only states whose maximum-minus-minimum advantage is at least 0.1 are retained.

The gap filter aims to avoid training on distinctions smaller than critic error. It does not guarantee correct rankings: a biased critic can also predict a large gap. These choices are part of the reported recipe, and the paper does not independently ablate all three. Its results therefore evaluate more than a loss function in isolation.

## Training Objectives / Loss Functions

### Binary cross-entropy for the critic

The target is a soft probability obtained by averaging binary outcomes. Writing target and prediction as m and v:

$$
\begin{aligned}
\ell_{\mathrm{BCE}}(m,v)
&=-m\log v-(1-m)\log(1-v),\\
\mathcal L_{\mathrm{critic}}(\phi)
&=\mathbb E_s\bigl[\ell_{\mathrm{BCE}}(\widehat V_N(s),V_\phi(s))\bigr].
\end{aligned}
$$

The authors motivate BCE as avoiding gradient-diminishing behavior associated with MSE in this probability-prediction setting. They do not provide a controlled BCE-versus-MSE ablation, so the contribution of that choice is not isolated. Finite Monte Carlo targets remain noisy whichever loss is used.

### Log-ratio regression for the actor

The reference policy stays fixed during one iteration. DAPO trains on stored state-action-advantage triples:

$$
\begin{aligned}
u_\theta(s,a)&=\log\frac{\pi_\theta(a\mid s)}{\pi_{\mathrm{ref}}(a\mid s)},\\
\mathcal L_{\mathrm{DAPO}}(\theta)
&=\frac12\mathbb E_{(s,a)\sim\nu}\left[
\left(\frac{\widehat A(s,a)}{\beta}-u_\theta(s,a)\right)^2\right].
\end{aligned}
$$

Positive advantage calls for increased probability relative to the reference; negative advantage calls for decreased probability. If the current log-ratio overshoots its target, the regression pulls it back. Smaller beta makes the requested change larger for the same advantage, potentially amplifying estimation error as well.

An action's log-probability is the sum of its token log-probabilities. The supplement's `get_log_trajectory_probs` uses a masked sum, not a token-length average. Its training loop subtracts the reference log-probability, compares the result with advantage/beta, and averages half the squared error.

These targets cannot generally be fitted independently. Action probabilities must normalize, and neural-network parameters are shared across states. The theory analyzes a constrained policy optimization problem; it does not merely prescribe exponentiating each advantage and assuming every regression residual vanishes.

### Theorem 3.2 and its assumptions

The analysis first connects a state's KL-regularized policy-improvement gradient with the gradient of a regression surrogate. It then considers optimizing the regression under an exploratory offline sampling distribution.

Theorem 3.2 assumes finite state and action spaces, positive sampling probability for every state and action, a reference policy with full support, exact advantages, and a solution of the proposed objective. Under these conditions, the authors establish non-decreasing KL-regularized value, with equality only when the reference policy is already optimal. The proof relates statewise improvement to overall performance through a performance difference lemma. Its visitation measure counts expected visits rather than normalizing by a fixed trajectory length.

Finite datasets, approximate critics, gap filtering, and neural optimization do not satisfy these assumptions literally. Uniform sampling over observed unique actions is also not full support over all possible text. The result motivates the objective; it does not promise monotonically improving checkpoints or gains on every held-out benchmark.

## Training Data and Pipeline

### MATH, TACO, and evaluation settings

Math training uses the 7,500 MATH training questions and answers, without using their supplied solutions as training targets. Code training uses approximately 4,000 TACO problems and their unit tests. No additional human step annotations are needed, but reliable outcome verification is still required.

| Component | Setting |
|-----------|---------|
| Initial generation | 32 solutions per problem; six selected with outcome balancing |
| Steps and completions | Newline boundaries; 16 completions per step |
| Math critic | Qwen2.5-Math-7B-Instruct |
| Code critic | Qwen2.5-coder-7B-Instruct |
| Critic training | One epoch; learning rate 5e-6; batch size 512 |
| Actor training | Learning rate 5e-7; global batch size 2048 |
| KL coefficient | Beta 0.01 or 0.02 |
| Advantage gap | At least 0.1 |
| Evaluation | Zero-shot CoT prompt; greedy decoding; temperature 0 |
| Generation limit | 2,048 new tokens; 4,096 for OpenO1 and Skywork-O1 |

Math evaluation covers 5,000 MATH test problems, GSM8K, Minerva MATH, Olympiad Bench, and College Math. Table 1 groups GSM8K under “In Domain,” whereas Section 4.1 describes all four non-MATH benchmarks as out-of-domain. The relevant operational fact is that DAPO's math training queries come from MATH.

Evaluation uses the actor's greedy generation without additional critic reranking. The gains therefore reflect the trained policy. Conversely, the number of original questions understates training preparation: each can produce many prefixes, completions, and state-action examples.

## Experimental Results

### MATH: improvements after SFT and RL

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/tab1-math.png" class="img-fluid rounded z-depth-1" caption="Table 1: Math accuracy (%) for seven base models before and after DAPO, grouped by SFT and RL training history." zoomable=true %}

The following numbers use Table 1. Changes are percentage points computed from the displayed scores.

| Model | Base (%) | DAPO (%) | Change (pp) |
|-------|---------:|---------:|------------:|
| Skywork-Math-Llama | 41.90 | 46.88 | +4.98 |
| Llama-3.1-8B-Instruct | 49.42 | 53.62 | +4.20 |
| OpenO1-Llama-8B-v0.1 | 52.73 | 60.33 | +7.60 |
| Qwen2.5-72B-Instruct | 82.90 | 84.70 | +1.80 |
| Qwen2-Math-7B-Instruct | 74.46 | 75.41 | +0.95 |
| Skywork-O1-Open-Llama3.1-8B | 78.10 | 79.81 | +1.71 |
| Qwen2.5-Math-7B-Instruct | 83.42 | 84.86 | +1.44 |

All seven models improve on MATH. OpenO1 has the largest gain, while previously RL-trained models retain smaller opportunities for improvement. This supports continued optimization after RL without establishing a universal gain for arbitrary reasoning models.

Section 4.2's prose contains scores differing from Table 1 and includes results from later iterations. Those iterations are discussed separately below. Another ambiguity appears in Llama-3.1's College Math cell: both displayed scores are 30.91, but the annotation says +1.63. Its improvement cannot be resolved from that cell. Some other change annotations also disagree with the printed scores, so this review prioritizes the scores themselves.

### Minerva MATH and College Math: transfer exceptions

Qwen2.5-72B improves from 46.30% to 50.00% on Minerva MATH and from 45.45% to 47.70% on Olympiad Bench. But Llama-3.1 falls from 26.48% to 23.54% on Minerva MATH, and Qwen2-Math falls from 40.07% to 37.51%.

On College Math, Skywork-O1 moves from 40.40% to 40.26%, while Qwen2.5-Math moves from 42.65% to 41.97%. These results do not diagnose which skills changed, but they clearly limit claims of universal mathematical generalization.

### HumanEval, MBPP, and LiveCodeBench

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/tab2-code.png" class="img-fluid rounded z-depth-1" caption="Table 2: Code accuracy (%) after TACO training; improvements on HumanEval and MBPP variants, with an OpenO1 decline on LiveCodeBench." zoomable=true %}

Llama-3.1 improves across all five code benchmarks: HumanEval 72.0% → 75.0%, HumanEval+ 66.5% → 68.9%, MBPP 72.0% → 77.0%, MBPP+ 56.9% → 66.1%, and LiveCodeBench 18.8% → 20.9%. The largest change is 9.2 percentage points on MBPP+.

OpenO1 improves on HumanEval, HumanEval+, MBPP, and MBPP+: respectively 69.5% → 72.0%, 61.0% → 64.6%, 69.8% → 75.9%, and 58.7% → 63.8%. The last change is 5.1 points from the displayed values. LiveCodeBench instead declines from 16.1% to 13.7%. The evidence extends beyond mathematics, but stable code generalization is not established across the evaluated models.

### PPO and GRPO comparisons

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/tab3-baselines.png" class="img-fluid rounded z-depth-1" caption="Table 3: Base, GRPO, PPO, and DAPO accuracy (%) on 5,000 MATH test problems; highest DAPO scores across all four compared models." zoomable=true %}

For OpenO1, DAPO's 60.33% exceeds GRPO's 55.63% and PPO's 54.12%. Llama-3.1 reaches 53.62% with DAPO, versus 52.28% and 52.41%. Qwen2-Math reaches 75.41%, versus 74.94% and 74.93%. For Qwen2.5-Math, DAPO's 84.86% leads GRPO's 84.33% by only 0.53 points; PPO obtains 83.76%.

All use the same MATH training questions, but the recipes are not otherwise identical. For example, DAPO's actor learning rate is 5e-7 and the GRPO configuration uses 1e-6. Critic preparation and batch construction differ too. This is a comparison of training systems, not an isolated substitution of one loss.

## Analysis / Ablation

### Iterative DAPO

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/tab10-iterations.png" class="img-fluid rounded z-depth-1" caption="Table 10: Math accuracy (%) across DAPO iterations; broad Skywork-Math gains and mixed transfer results for Qwen2-Math." zoomable=true %}

Skywork-Math progresses from 41.90% to 46.88% to 50.54% on MATH. Qwen2-Math progresses from 74.46% to 75.41% to 76.40%. Rebuilding targets around an improved reference can therefore add value.

However, Qwen2-Math's second iteration ends at 89.30% on GSM8K, below its initial 89.38%, and at 41.16% on College Math, below 41.59%. More iterations require monitoring transfer performance as well as the training domain.

### Beta and completion count

| Ablation | Setting | MATH accuracy (%) |
|----------|---------|------------------:|
| Skywork-Math beta | 0.002 | 44.52 |
| Skywork-Math beta | 0.01 | 46.88 |
| Skywork-Math beta | 0.02 | 46.70 |
| Skywork-Math beta | 0.05 | 45.56 |
| Skywork-Math beta | 0.1 | 44.50 |
| Qwen2-Math completions | 8 | 75.30 |
| Qwen2-Math completions | 16 | 75.41 |

Table 5 favors beta 0.01, with 0.02 close behind. A plausible interpretation is that very small beta magnifies noisy targets while large beta requests smaller changes. The table measures sensitivity, however, rather than directly testing that mechanism.

Table 6 gives only a 0.11-point difference between eight and sixteen completions. The authors choose sixteen to pursue the larger gain. Without repeated runs or uncertainty estimates, this does not establish that sixteen is reliably better or that eight is sufficient elsewhere.

### Figure 2: negative advantage inside a correct trajectory

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig2-credit.png" class="img-fluid rounded z-depth-1" caption="Figure 2: A correct 14-step box-volume solution, with state values and advantages; step 11: value 0.41 and advantage -0.53." zoomable=true %}

The example asks for the volume of a box with face areas 24, 16, and 6. The trajectory reaches the correct answer, 48. Yet the reported value drops from 0.94 at step 10 to 0.41 at step 11, giving an advantage of -0.53.

The square-root operation at step 11 is not itself an obvious mathematical error. The example illustrates policy-dependent continuation difficulty rather than logical truth labeling. One trajectory does not establish why its value falls or quantify uncertainty, but it makes the distinction from terminal outcome supervision concrete.

### Figures 3 and 4: training curves and error reduction

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig3-training.png" class="img-fluid rounded z-depth-1" caption="Figure 3: MATH improvement versus trained state-action pairs in millions. Top: accuracy gain in percentage points. Bottom: reduction relative to the initial error rate (%)." zoomable=true %}

The lower panel's “relative improvement” is defined using initial accuracy x and trained accuracy y, both expressed as fractions:

$$
\text{relative improvement}=\frac{y-x}{1-x}.
$$

It is error reduction, not accuracy growth relative to x. OpenO1's 7.60-point gain divided by its 47.27% initial error rate is approximately 16.08%; the figure reports 16.07%, consistent in scale with rounded inputs. It does not represent a 16-point accuracy gain. The curves also contain declines, so empirical checkpoint performance is not monotonic.

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig4-grpo.png" class="img-fluid rounded z-depth-1" caption="Figure 4: GRPO training of Llama-3.1-8B-Instruct. Horizontal axis: training steps. Left: training accuracy. Right: MATH test gain in percentage points, declining after roughly 300 steps." zoomable=true %}

The extended GRPO run exceeds 1,000 training steps. Training accuracy remains high while test improvement deteriorates after roughly 300 steps. Together with DAPO's results, this supports investigating finer credit assignment. It does not establish that GRPO generally overfits while DAPO cannot: the comparison covers a particular model, dataset, and recipe, and DAPO's curves fluctuate too.

## Limitations and Critical Assessment

### Critic preparation and long trajectories

The authors identify high critic-preparation cost as the main limitation. Many prefixes require repeated generation of the remaining solution. With trajectory length L and step count T, completion work depends on both. If step length is fixed and L grows with T, Appendix E's analysis contains a term quadratic in T.

The appendix uses approximately T=20 and L=2048 for illustration. These are simplifying assumptions, not identical measured lengths for every example. Avoiding simultaneous critic loading during actor training can reduce memory requirements without reducing total preparation compute. The paper discusses a comparable-resource GRPO run, but does not provide a sufficiently complete hardware-specific wall-clock and GPU-hour accounting for an independent end-to-end comparison.

### Approximate values and unisolated components

Separating actor and critic removes one source of non-stationarity, not critic bias. Finite completions and a restricted prefix distribution can produce systematic target errors. A fixed critic also trades stability against relevance as the actor changes.

Calibration measurements, repeated seeds, and component ablations would strengthen the explanation. Greedy decoding eliminates sampling variation during inference, not variation from training-data generation or optimization. Small differences should therefore not be interpreted as statistically established superiority. A quantitative bridge from critic approximation error to practical policy improvement remains valuable future work.

### What the released code supports

The public supplement contains `main.py`, a short README, and the paper PDF, so describing the work as having no released code would be inaccurate. However, `main.py` imports `utils` modules and `data_utils` that are absent from that ZIP. The loss and log-probability calculations are inspectable; the complete critic-and-actor pipeline is not directly executable from the archive alone.

## Takeaways

- **Outcome correctness and local action quality differ.** Value measures policy-dependent continuation success and should be distinguished from logical validity.
- **Offline optimization still has a data-preparation bill.** Stored advantages simplify actor training while shifting work into rollout generation and critic training.
- **Keep generator and completer roles explicit.** One controls observed states; the other defines their value targets.
- **Read guarantees at their stated scope.** Exact-value, full-support policy improvement does not imply universal held-out benchmark gains.
- **The data unit matters as much as the loss.** Step boundaries, duplicate handling, state-wise batches, and gap filtering shape the actual learning signal.

## Installation and Usage

The entry point is `main.py` in the [official supplement](https://proceedings.neurips.cc/paper_files/paper/2025/file/6789f033ebde742552e5db84fb5d414a-Supplemental-Conference.zip). A complete runnable installation cannot be verified from that archive alone. The useful inspection points are action masking and log-probability summation in `get_log_trajectory_probs`, followed by reference subtraction and advantage/beta regression in the training loop. Algorithm 1 supplies the overall procedure: training problems, initial actor and critic, iteration count, and beta enter; the final actor and critic are returned.

## References

- [Official paper page](https://proceedings.neurips.cc/paper_files/paper/2025/hash/6789f033ebde742552e5db84fb5d414a-Abstract-Conference.html): NeurIPS 2025 paper and supplement.
- [Reviewed proceedings PDF](https://www.proceedings.com/content/085/085713-2401open.pdf): All 33 pages, including appendices; the source for this review's author list and reported results.
- [Supplementary code](https://proceedings.neurips.cc/paper_files/paper/2025/file/6789f033ebde742552e5db84fb5d414a-Supplemental-Conference.zip): Verification of the loss and token log-probability aggregation.
- Figures and tables: Liu et al. (2025), Figures 1–4 and Tables 1–3 and 10. Copyright remains with the respective rights holders; cited here for research explanation and criticism.

## Further Reading

- **[Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290)** (Rafailov et al., 2023): Background on preference optimization through reference-policy log-ratios.
- **[DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300)** (Shao et al., 2024): Mathematical reasoning and the introduction of GRPO.
- **[Math-Shepherd: Verify and Reinforce LLMs Step-by-step without Human Annotations](https://arxiv.org/abs/2312.08935)** (Wang et al., ACL 2024): Automatic process supervision without human step labels.
- **[VinePPO: Refining Credit Assignment in RL Training of LLMs](https://arxiv.org/abs/2410.01679)** (Kazemnejad et al., ICML 2025): Value-estimation failures and Monte Carlo credit assignment for reasoning.

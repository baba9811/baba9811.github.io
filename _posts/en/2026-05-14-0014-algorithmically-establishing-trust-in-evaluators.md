---
layout: post
title: "[Paper Review] Algorithmically Establishing Trust in Evaluators"
date: 2026-05-14 22:00:00 +0900
description: "A zero-knowledge-style challenge–response protocol that certifies the trustworthiness of an evaluator (e.g. LLM-as-a-judge) without any labelled data, bounded by (1/4)^r."
tags: [llm-as-a-judge, evaluation, zero-knowledge-proof, trust, low-resource-language]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/fig1-ev-protocol-flow.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0014-algorithmically-establishing-trust-in-evaluators/
ko_url: /papers/0014-algorithmically-establishing-trust-in-evaluators/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Adrian de Wynter (The University of York · Microsoft) |
| Venue | arXiv preprint · 2026 |
| arXiv | [2506.03083](https://arxiv.org/abs/2506.03083) |
| Code | [adewynter/no_data_algorithm](https://github.com/adewynter/no_data_algorithm) |
| Data | Synthetic binary strings (IP/OOP, 498 each) · West Frisian low-resource labelling corpus (1,015 entries) |
| <span style="white-space: nowrap">Review date</span> | 2026-05-14 |

## TL;DR

- The **No-Data Algorithm** algorithmically verifies whether an evaluator (e.g., an LLM-as-a-judge) *truly* knows the labels it claims to assign, *without any reference data at all*.
- It works by running an **Evaluator–Verifier (EV) protocol** that issues one of two mutually exclusive challenges (equality up to permutation, equality up to isomorphism) per round. The construction is a zero-knowledge-style adaptation of Babai's (1985) Arthur–Merlin protocol.
- **Provable guarantees**: after $r$ rounds, the probability that the verifier misses a lying evaluator is bounded by $(1/4)^r$. For an evaluator with accuracy $\alpha$, $\mathbb{E}[\text{correct}] \le 1 - (1-\alpha)(1 - \phi + \phi(1/4)^r)$.
- **Empirically**: on synthetic binary strings with o3-mini, the success rate drops to 28% under out-of-distribution data, exposing deception. On a West Frisian labelling task with GPT-4.1 as both evaluator and verifier, success rates cleanly separate at 86–88% in-domain vs 1–2% out-of-domain.

## Introduction

Measurement is one of the most fundamental problems in AI, and right now it is in trouble. The LLM-as-a-judge paradigm has become the de facto evaluation standard, yet there is a growing body of evidence that these evaluators are themselves *unreliable*. Traditional approaches to certifying an evaluator come in two flavours: (1) measure it against labelled reference data, or (2) assume the evaluator "somehow" knows the right answer. Both fail in the regime that matters most — when references are scarce or unavailable.

That regime is not a corner case. **Low-resource languages** like West Frisian have essentially no labelled NLP data; **medical** domains have prohibitive annotation costs; **market research** problems are unique by construction; and even when labels do exist, benchmark contamination (Sainz et al. 2023) erodes their value. Naïvely deploying an LLM judge in any of these settings strips the resulting accuracy numbers of statistical meaning.

This paper introduces the **No-Data Algorithm**, which establishes trust in an evaluator with *mathematical rigor* — failing to detect a lying evaluator with probability at most $(1/4)^r$ after $r$ challenge rounds. The construction has two key moves. First, the evaluator is asked to produce *similar* datapoints and their consistency is probed (the challenge–response game familiar from zero-knowledge proofs). Second, the two challenges are *informationally complementary* — together they are necessary and sufficient to certify knowledge of the true labelling function. An evaluator without that knowledge can pass at most one challenge in any given round, so its luck across $r$ rounds decays as $(1/4)^r$.

None of the underlying mathematics is new — Arthur–Merlin protocols and zero-knowledge proofs go back to the 1980s. What is new is the *transposition* of these ideas to the problem of evaluator trust, demonstrating that the bounds are tight enough and the protocol cheap enough to be useful in practice. In an era when accuracy numbers are everywhere and labels are nowhere, the meta-question — *can we trust our accuracy numbers at all?* — deserves a principled answer.

## Key Contributions

- **The No-Data Algorithm**: an algorithmic procedure that establishes evaluator trust to within a $(1/4)^r$ probability of error, with no labelled data required. The construction adapts the AM challenge–response protocol to the labelling setting.
- **Two correctness bounds**: Lemma 5.1 ($(1/4)^r$ bound on the EV sub-protocol) and Theorem 5.2 (the full No-Data Algorithm's expected correctness in terms of evaluator accuracy $\alpha$ and a label-flip probability $\phi$).
- **Synthetic and real-language experiments**: a controlled synthetic binary-string study (in-phenomenon vs out-of-phenomenon) validates the theory, and a West Frisian labelling task demonstrates real-world applicability.
- **Comparison against baselines**: agreement metrics like Cohen's κ and percentage agreement (PA) require calibration unavailable without labels; the No-Data Algorithm produces a single trust score (86.2 IP vs 1.2 OOP in Table 9) that cleanly separates trustworthy from deceptive evaluators.

## Related Work / Background

**The Arthur–Merlin protocol (Babai 1985).** A computationally unbounded prover (Merlin) convinces a probabilistically-bounded verifier (Arthur) that some statement holds via a challenge–response game; see Goldreich (2009) and Arora & Barak (2009) for textbook treatments. The EV protocol borrows the multi-round challenge structure but drops the *secrecy* guarantee of zero-knowledge proofs — the goal is to certify *knowledge*, not protect it.

**The rise of LLM-as-a-judge.** Zheng et al.'s MT-Bench/Chatbot Arena (Zheng et al., NeurIPS 2023) and Liu et al.'s G-Eval (Liu et al., EMNLP 2023) cemented the practice of using GPT-4-class models as automatic evaluators. Li et al. (2024) survey the rapidly-growing literature. Several follow-ups have flagged reliability concerns: Gehmann et al. 2023 on cracks in evaluation practice, Bavaresco et al. 2024 on 20 NLP evaluation tasks where LLM judges fail to substitute for humans, Hada et al. 2024 on dramatic quality drops in multilingual settings.

**Limits of agreement metrics.** In the absence of labels, the natural fallback is *evaluator-to-evaluator agreement* — Cohen's κ, Fleiss & Cohen 1973's ICC, percentage agreement. But these metrics require calibration: a κ of 0.4 might be acceptable in one domain and damning in another, and calibrating it requires reference data. As the paper points out, in the no-label regime these signals are "either contradictory or insufficient" — which is exactly what Table 9 quantifies.

**Provable ML.** Jovanović et al. 2023 establish provable fairness in representation learning, Dimitrov et al. 2022 do the same for adversarial robustness. This paper sits in the same provability tradition, extended to evaluator certification.

## Method / Architecture

### Notation and Assumptions

Datapoints $x \in X$, labels $y \in Y$. The paper focuses on $Y = \{0,1\}$ (binary classification) and $X \subseteq \{0,1\}^n$ ($n$-bit binary strings). These assumptions simplify the proofs; §7 argues the construction extends to natural-language $X$.

For each $x \in \{0,1\}^n$ define its *relevant subset* $S\_x \in 2^x$ — for instance, the set of substrings; the exact construction depends on the setup.

A **criterion** $c\colon X \to \{0,1\}$ classifies datapoints. A **rubric** $C\colon \times\_{i,\ldots,n} \{0,1\} \to \{0,1\}^n$ is an ordered concatenation of criteria $\mathcal{C} = \{c\_1, \ldots, c\_n\}$: $C = c\_1 c\_2 \ldots c\_n$. If some criterion is nonlinear (e.g., $c\_i = c\_a \oplus c\_b$), its decomposed form $\bar{C}$ is what the verifier reasons about. A rubric is **total** when every nonlinear criterion is explicitly decomposed.

An **aggregator** $\sigma\colon \{0,1\}^n \to Y$ collapses the $n$-bit rubric output into a final label (e.g., majority vote).

Two points $x, x' \in X$ are **similar** when $x \cong x'$ *and* $x \equiv x'$ — i.e., they are equal both up to isomorphism (structural equivalence) and up to permutation.

A **lying** evaluator is one that makes unsubstantiated claims of correctness, whether *uninformed* (random guessing) or *sycophantic* (confident but wrong). The former fails everywhere, the latter only out-of-distribution. Distinguishing them without labels is the algorithm's main job.

**Assumption 3.1** (Composition): the true map $f\colon X \to Y$ decomposes as $f = \sigma C$ — every datapoint has a reason (criterion) for its label, and if there are several, some aggregator combines them. The assumption is weak; when $C$ or $\sigma$ are unknown in practice, user-defined surrogates are allowed, with the caveat that trust bounds apply to the *surrogate*.

### The EV Protocol — One Round

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/fig1-ev-protocol-flow.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: one round of the EV protocol. The evaluator (blue) generates an x′ similar to x with a partial label ỹ′; the verifier (orange) then chooses one of two challenges uniformly at random and demands an answer. Repeat r times."
   zoomable=true %}

Both players see $x$ and the rubric $C$; the aggregator $\sigma$ is hidden from the verifier. The evaluator claims to know $f\colon X \to Y$; since $C$ is public, that is equivalent to claiming to know $\sigma$. The verifier wants to be *sufficiently sure* the evaluator's label for $x$ is trustworthy.

**One round proceeds as follows:**

1. The evaluator generates an $x' \in X$ similar to $x$, together with a *partial label* $\tilde{y}'$. "Partial" because the evaluator has no access to $f$ and can only guess from $C(x')$. Once generated, $\langle x', \tilde{y}' \rangle$ is fixed.
2. The verifier picks one of two challenges uniformly at random:
   - **Challenge 1 (Equality up to Permutation)** — "show me why $x' \equiv x$". The verifier checks
     $$ \forall s \in S_x, \exists t \in S_{x'}.\ \forall c \in \bar{C},\ c(s) = c(t) \quad (2) $$
     i.e., some substring of $x'$ matches the (total) evaluation of a criterion from $x$.
   - **Challenge 2 (Equality up to Isomorphism)** — "show me why $f(x') = y$". Since $y$ is unavailable, the verifier checks the proxy $x' \cong x$, namely $C(x') = C(x)$.
3. If the evaluator fails, the protocol returns failure immediately; if all $r$ rounds pass, it returns success. Either way it returns $\tilde{y}'$.

### Why Both Challenges Are Necessary

Lemma A.1's key claim: the two challenges provide *mutually exclusive* information and are *jointly* necessary and sufficient to detect lies.

- **Challenge 1 alone** is insufficient: even if $x'$'s relevant substructure matches $x$'s, the strings can differ enough to receive different rubric encodings (e.g., when a criterion is a disjunction). The challenge probes permutation equivalence but says nothing about isomorphism.
- **Challenge 2 alone** is insufficient: $C(x') = C(x)$ matches the *final* encoding but not the *internal* structure of the bitstrings.

So an evaluator that knows $f$ passes both challenges deterministically. One that does not has at most two cheat paths:

- **Lie 1: produce a "good" $x'$**: pick $x'$ with $S\_{x'} = S\_x$, passing Challenge 1; Challenge 2 ($C(x') = C(x)$) is then a coin flip — 1/2 of failing.
- **Lie 2: aim for $f(x') \ne y$**: pick $x'$ with $C(x') = C(x)$, passing Challenge 2; Challenge 1 is then a coin flip.

Since the challenge is itself chosen with probability 1/2, the per-round success rate of a lying evaluator is at most $1/2 \cdot 1/2 = 1/4$. After $r$ rounds, $(1/4)^r$.

### The Full No-Data Algorithm

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/alg1-no-data-algorithm.png"
   class="img-fluid rounded z-depth-1"
   caption="Algorithm 1: the No-Data Algorithm. For each x in X it runs the EV protocol for r rounds; on failure, it flips the evaluator's label with probability φ. Returns a success count and the (possibly flipped) predictions."
   zoomable=true %}

The algorithm sweeps over $X$, calling EV per datapoint. On success it accepts the evaluator's label $y$ and increments the success count. On failure — a signal that the evaluator doesn't know the label — it flips $y$ with probability $\phi$ and records a 0 in the success counter. Final outputs: a list of predictions and a success count.

The flip step matters because failure suggests the evaluator is *consistently wrong* (sycophantic), in which case its flipped label is more likely correct. $\phi$ is tuned to the evaluator's estimated error rate; Theorem 5.2 then guarantees that the algorithm's output accuracy tracks the "known case" closely.

## Training Objective / Loss Function

There is no model being trained here — the No-Data Algorithm is a *meta* procedure that audits an external evaluator. The core "losses" are two **correctness bounds**.

### Lemma 5.1 — EV Protocol Bound

$$
\Pr[\text{verifier fails to detect a lie after } r \text{ rounds}] \le \left(\frac{1}{4}\right)^r
$$

Proof sketch: as analyzed above, each of the two lying strategies passes a single round with probability $\le 1/4$. Union bound over $r$ rounds.

### Theorem 5.2 — Full Algorithm Bound

For a balanced dataset $X$ and an evaluator with accuracy $\alpha$ that lies whenever it mislabels,

$$
\begin{aligned}
\mathbb{E}[\text{correct}] \le 1 - (1 - \alpha)\left(1 - \phi + \phi\left(\frac{1}{4}\right)^r\right)
\end{aligned}
\quad (3)
$$

Proof sketch (Appendix A.4): with $\epsilon = 1 - \alpha$,

$$
\begin{aligned}
\mathbb{E}[\text{undetected}] &= \epsilon \left(\frac{1}{4}\right)^r, \\
\mathbb{E}[\text{detected, no flip}] &= \epsilon(1 - \phi)\left(1 - \left(\frac{1}{4}\right)^r\right), \\
\mathbb{E}[\text{wrong}] &\le \epsilon\left(1 - \phi + \phi\left(\frac{1}{4}\right)^r\right).
\end{aligned}
$$

What this says: with a high-accuracy evaluator and a well-calibrated $\phi$, the algorithm's output mirrors the known case. Conversely, if $\alpha = 0$ (the evaluator is always wrong), there is no way to recover labels — and §7.1 stresses this is the point. The algorithm's purpose is to *establish trust*, not to label data ex nihilo.

### Lemma B.1 — Runtime

If both players run in polynomial time on any input, the No-Data Algorithm runs in $O(r\|D\|)$ on a dataset of size $\|D\|$. Linear in the data, modulo a small constant in the number of rounds.

## Training Data and Pipeline

Two experimental setups; in both, the evaluator is "trained" (or simply observed) externally, and the No-Data Algorithm only audits on top.

### Experiment 1 — Synthetic Binary Strings

| Item | Value |
|------|-------|
| Input domain | $\{0,1\}^n$ |
| Datasets | In-Phenomenon (IP) / Out-of-Phenomenon (OOP), disjoint |
| Test size | 498 each, balanced |
| Aggregator $\sigma$ | Majority vote |
| Evaluator 1 | Decision Tree (sklearn defaults) |
| Evaluator 2 | o3-mini (OpenAI, 2025-01-31), max tokens 50,000 |
| Verifier | Rule-matching algorithm against the appropriate rubric |
| $\phi$ | 0.4 for DT, 0.1 for LLM |
| $r$ | 3 |

IP rubric: $c\_0$ (even number of ones), $c\_1 = c\_{1,a} \oplus c\_{1,b}$ (starts with 0 XOR contains 10101), $c\_2$ (more than five ones). OOP rubric: $c\_0$ (contains 111), $c\_1$ (ends with 1), $c\_2$ (contains 110001). Key design: both DT and LLM have been trained/observed on IP; neither has seen OOP. We expect the success rate to drop in OOP, exposing the lack of knowledge.

### Experiment 2 — West Frisian Low-Resource Language

| Item | Value |
|------|-------|
| Data source | Random prompts from OpenOrca, MMLU, OpenCode, WildChat |
| Output generation | GPT-4o |
| Translation | 4 native West Frisian speakers, expert translation + annotation |
| Annotator pay | 28.7 USD/hr base, seniority-adjusted |
| Dataset size | 1,015 entries (train 500 / test 515) |
| Evaluator + verifier | Both GPT-4.1 (LONGCO-2025-04-14), distinct prompts |
| Evaluator/verifier max tokens | 256 |
| Generator (for similar datapoints) max tokens | 5,000 |
| Temperature | 0 |
| $\phi$ | Tested at 0.1, 0.3, 0.7 |

The IP rubric has 6 criteria: response in West Frisian; culturally/argumentatively correct; (if code) syntactically correct; grammatically correct; not cut off; follows user instructions exactly. The OOP rubric has 7 criteria designed to be almost orthogonal — response in Dutch (since GPT-4o tends to default to Dutch when asked for West Frisian), references to Dutch culture, etc. Only the OOP rubric is decomposable; the IP rubric carries some intentional ambiguity, mirroring real-world deployment.

## Experimental Results

### Synthetic Data: the IP/OOP Success-Rate Gap

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab1-rubrics.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: the two rubrics. The IP rubric's c₁ decomposes via XOR into five effective criteria {c₀, c₂, c₁ₐ, c₁ᵦ, c₁}."
   zoomable=true %}

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab2-synthetic-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: known (reference) and unknown (No-Data Algorithm) results. Both evaluators track their known-case accuracy in OOP, but their success rates collapse — that's the deception signal."
   zoomable=true %}

| Setup | Evaluator | Known Acc/F1 | Unknown Acc/F1 | Unknown Succ/Flips |
|-------|-----------|--------------|----------------|---------------------|
| IP | DT | 62.2 / 58.8 | 62.2 / 59.8 | **100.0 / 0.0** |
| IP | LLM (o3-mini) | 99.8 / 99.8 | 97.6 / 97.6 | **81.3 / 1.8** |
| OOP | DT | 54.2 / 54.2 | 52.8 / 52.1 | **4.8 / 46.4** |
| OOP | LLM (o3-mini) | 60.6 / 66.2 | 59.0 / 64.0 | **28.0 / 6.0** |

How to read it: accuracy is essentially the same between known and unknown columns. *Accuracy alone tells us nothing about evaluator trust.* The decisive signal is the **success rate**.

- IP success gap (100% DT vs 81% LLM): both genuinely know IP.
- OOP success gap (5% DT vs 28% LLM): both are wrong about OOP, with LLM being slightly luckier (better guessing, not knowledge).
- Operationally: success rate below ~30% is the deception flag.

### West Frisian: Success Rate Is Independent of φ

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab3-westfrisian-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: GPT-4.1 evaluator + verifier on West Frisian. Sweeping φ from 0.1 to 0.7 changes flips dramatically but leaves the success rate near 86–88% in IP and 1–2% in OOP."
   zoomable=true %}

| Setup | $\phi$ | IP Succ/Flips | OOP Succ/Flips |
|-------|--------|---------------|----------------|
| Unknown | 0.7 | 87.8 / 9.3 | 1.4 / 70.3 |
| Unknown | 0.3 | 86.8 / 4.9 | 1.2 / 33.6 |
| Unknown | 0.1 | 86.2 / 1.8 | 1.2 / 9.1 |
| Known (predict $y$) | – | 76.3 / 80.3 (Acc/F1) | 51.5 / 67.2 |
| Known (avg per $c \in \bar{C}$) | – | 89.5 / 94.0 | 45.3 / 46.5 |

The big observation: **the success rate is essentially flat in $\phi$**. Flips swing wildly (OOP goes 9 → 70 as $\phi$ rises), but trust remains stable. The practical implication is that *you measure trust with raw success rate, then tune $\phi$ post-hoc for accuracy gains* — a clean separation of concerns. Note also that OOP accuracies are near-random (~50%), yet the success rate consistently calls out the deception.

### Comparing LLMs (Appendix D)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab5-llm-comparison.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5: four LLMs on the synthetic task — o3-mini, DeepSeek R1-Distill-Qwen-32B, GPT-4o, Qwen 2.5-VL 7B. Only o3-mini truly learned IP (99.8% known); the others sit at 50–61% but adjust their unknown accuracy to match, illustrating why accuracy alone cannot distinguish 'knows' from 'lucky guess'."
   zoomable=true %}

This table sharpens the message: with the same nominal accuracy, the success rate cleaves the models. o3-mini, which genuinely knows IP, maintains a high success rate across $\phi$. DeepSeek/GPT-4o/Qwen post deceptively high OOP accuracy (up to ~78%) but their success rates (6–34%) expose the lack of knowledge.

### Baselines: Ensembles Are Useless Without Labels

{% include figure.liquid loading="eager"
   path="assets/img/papers/0014-algorithmically-establishing-trust-in-evaluators/tab9-baselines.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 9: averaging and majority-vote ensembles (GPT-4.1, o3-mini, Qwen 2.5) vs the No-Data Algorithm. Ensembles hit above-random accuracy in OOP — impossible by construction — and yet Cohen's κ is contradictory. The No-Data Algorithm's trust separation (86.2 vs 1.2) makes the deception unambiguous."
   zoomable=true %}

| | IP trust | OOP trust | IP Acc/F1 | OOP Acc/F1 |
|---|---|---|---|---|
| Known (GPT-4.1) | – | – | 76.3 / 80.3 | 51.5 / 67.2 |
| No-Data Algorithm ($\phi=0.1$) | **86.2** | **1.2** | 76.9 / 79.8 | 50.7 / 16.4 |
| Ensemble (Average), κ / PA | 0.39 / 0.72 | 0.0 / 0.37 | 80.6 / 81.3 | 50.1 / 0.0 |
| Ensemble (Majority vote), κ / PA | 0.39 / 0.72 | 0.0 / 0.37 | 75.5 / 79.9 | 61.6 / 48.7 |

Reading it: in IP the ensembles' accuracy matches (or exceeds) the single model, but κ=0.39 is *poor agreement* by Fleiss & Cohen 1973. If we had labels we could resolve the contradiction (accuracy wins, ignore κ). Without labels, the contradictory signal is operationally useless. Worse in OOP: majority vote reports 61.6% accuracy — *impossible* given the setup, since the ensemble has zero information about OOP — but κ=0.0 leaves the contradiction unresolved. The No-Data Algorithm's trust pair (86.2 vs 1.2) is a single signal that cleanly accepts IP and rejects OOP.

## Analysis / Ablations

### Ablation 1: Lying Evaluators and Lying Generators (Appendix D.2)

DT evaluator + $\phi = 0.4$, three lying strategies:

- **Lie 1** ($\sigma$ unknown): can output $C(x)$ but not $\bar{C}(x)$. IP success 17.0 (Flips 35.1); accuracy unchanged at 58.6/58.8.
- **Lie 2** ($f$ unknown): can retrieve $x'$ with $y' = y$ but nothing else. IP success 0.6 (Flips 37.4) — almost every round catches it.
- **Lie 3** (generator lies with probability $p = 1/10$): noisy lying, harder to detect. IP success 43.6 (Flips 24.9).

Key observation: not knowing $\sigma$ (Lie 1) leaves a partial signal because the evaluator still has half of $f$; not knowing $f$ at all (Lie 2) is catastrophic, as it should be. This matches the algorithm's intuition that *deeper* lies leave fewer escape paths.

### Ablation 2: LLM Generation Strategies (Appendix D.3)

When the evaluator must *generate* $x'$ from scratch vs *pick* it from data, the success rate drops markedly: o3-mini IP picking 81.3 → generation 55.4 (−26pp); GPT-4o 28.7 → 5.8 (−23pp). This is a known weakness of LLMs on non-natural-language problems (binary strings here). It does not transfer to the natural-language §6.2 setup, where LLMs are in their element.

### Ablation 3: Linguistic Competency (Appendix D.4)

Qwen 2.5-VL 7B is not proficient in West Frisian. Its IP accuracy hovers around 35% (vs GPT-4.1's 76%), but the success rate still distinguishes "uninformed" from "deceptive" — Qwen is *wrong* but doesn't *lie*. This empirically supports the paper's §3.2 distinction between uninformed and sycophantic lying.

### Ablation 4: Ternary Labels (Appendix C.1)

Extending to $Y = \{0, 1, 2\}$ via three coarse labels (none, one, all-but-one criteria satisfied), the algorithm largely retains its behaviour but with ~6% accuracy degradation. Disabling label flip improves restoration, suggesting a proper $k$-ary version of the algorithm needs a richer flip mechanism. Formal $k$-ary guarantees are deferred to future work (Conjecture 1).

## Limitations and Critical Assessment

### Author-acknowledged limitations

- **Binary labels**: the formal bounds are for $Y = \{0, 1\}$. Multi-class needs a one-vs-all reduction (linear blow-up) or further theoretical development.
- **Rubric dependency**: the algorithm certifies trust *with respect to a given rubric*. A poorly-designed rubric yields a meaningless trust score. §7.3 makes clear that rubric design is the user's responsibility, analogous to choosing $H\_0$ in scientific hypothesis testing.
- **The "lies-when-mislabels" assumption**: Theorem 5.2 assumes the evaluator lies whenever it mislabels. An evaluator that *guesses correctly* (right label, wrong reasoning) is not captured and would require a separate analysis.
- **Surrogate rubrics**: when the true $\sigma$ is unknown, users substitute a surrogate, but the trust bound then applies to the surrogate, not to ground truth.

### Reviewer's additional concerns

- **Verifier cost is not reported**: the natural-language setup invokes GPT-4.1 as evaluator, verifier, and generator — at least three API calls per round per datapoint. For 1,015 entries × 3 rounds × 3 calls that's nearly 10K calls; the paper reports no wall-clock or USD cost numbers.
- **Generator quality is a hidden variable**: the picking-vs-generation gap (~25pp in §6.1.2) suggests generator capability is at least as important as evaluator capability. The paper concludes "picking works better" without measuring generator quality directly.
- **Theory vs practice gap**: the $(1/4)^r$ bound assumes a *perfect* verifier. In §6.2 the verifier is GPT-4.1, whose own reliability is in question. §7.2 defends this by saying "evaluator and verifier solve different tasks," but the two GPT-4.1 instances' sensitivity to each other's prompts is not quantified.
- **Rubric ambiguity vs the "well-designed rubric" assumption**: the §6.2 IP rubric contains internal contradictions ("response must be correct" + "follows user instructions exactly even when wrong"). The algorithm still works, which is impressive — but it also undermines the §7.3 claim that rubric quality is critical.
- **No replication across tasks**: Table 5's "DeepSeek IP known 61.0%" is surprisingly low and may reflect this binary-string task specifically rather than DeepSeek's general reasoning. A cross-task replication would strengthen the claim.

## Takeaways

- **Same accuracy does not mean same trust.** Table 2's DT vs LLM in IP, and Table 9's ensembles in OOP, all post similar (or higher!) accuracies as the No-Data Algorithm, yet the algorithmic trust signal cleanly separates them. In the no-label regime, accuracy is an *uninterpretable* number.
- **The success rate is operationally robust.** Across $\phi \in \{0.1, 0.3, 0.7\}$ on West Frisian, success stays within ~1pp. That means you can measure trust online while keeping $\phi$ as a separate post-hoc accuracy knob.
- **A real tool for label-scarce regimes.** Low-resource languages, medicine, market research — domains where references are scarce *and* labels are expensive. This is the first algorithm to make "this evaluator knows what it's doing" a provable, single-number claim without any references.
- **Rubric design is now front-and-center.** The algorithm measures trust *relative to the rubric you specify*. Rubric design becomes the act of measurement itself — analogous to defining $H\_0$ in scientific hypothesis testing. A good algorithm cannot save an ill-posed rubric.

## Setup and usage

All code and data are available in the author's [GitHub repository](https://github.com/adewynter/no_data_algorithm). The synthetic experiment can be reproduced without any external API by using the included decision-tree evaluator; the West Frisian setup requires OpenAI API access and GPT-4.1 quota.

```bash
git clone https://github.com/adewynter/no_data_algorithm
cd no_data_algorithm
# See repo README for full reproduction instructions
```

## References

- Paper: <https://arxiv.org/abs/2506.03083>
- Code & data: <https://github.com/adewynter/no_data_algorithm>

## Further reading

- **[Trading Group Theory for Randomness](https://dl.acm.org/doi/10.1145/22145.22192)** (Babai, STOC 1985) — the original Arthur–Merlin paper. The EV protocol's challenge–response structure descends directly from this construction.
- **[Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)** (Zheng et al., NeurIPS 2023) — the canonical reference for the LLM-as-a-judge paradigm and the position/verbosity biases that motivate the trust problem this paper tackles.
- **[G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://arxiv.org/abs/2303.16634)** (Liu et al., EMNLP 2023) — a representative GPT-4-as-evaluator system; useful context for why "trust your judge" is now an open question.
- **[LLMs-as-Judges: A Comprehensive Survey on LLM-based Evaluation Methods](https://arxiv.org/abs/2412.05579)** (Li et al., 2024) — broad survey of the field where the No-Data Algorithm sits.
- **[NLP Evaluation in trouble: On the Need to Measure LLM Data Contamination for each Benchmark](https://arxiv.org/abs/2310.18018)** (Sainz et al., EMNLP 2023) — argues that *even with* labels, benchmark contamination undermines evaluation; this paper is the natural sequel for the no-label case.
- **[Awes, Laws, and Flaws From Today's LLM Research](https://arxiv.org/abs/2408.15409)** (de Wynter, ACL 2025) — same author's meta-critique of 2,000+ LLM papers, quantifying the rise of LLM-as-evaluator. The No-Data Algorithm reads as a proposed remedy to that critique.
- **[Adding Chocolate to Mint: Mitigating Metric Interference in Machine Translation](https://arxiv.org/abs/2503.08327)** (Pombal et al., 2025) — complementary work on metric reliability rather than evaluator reliability; both pull at the same problem from different sides.

---
layout: post
title: "[Paper Review] SHIELD: An Auto-Healing Agentic Defense Framework for LLM Resource Exhaustion Attacks"
date: 2026-06-25 16:00:00 +0900
description: "Turning detection failures into knowledge — SHIELD pairs a three-stage defense pipeline with a knowledge-update and prompt-optimization loop to self-heal against sponge attacks."
tags: [sponge-attack, llm-security, denial-of-service, agentic-defense, prompt-optimization]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/fig2-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/
ko_url: /papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/
---

{% include lang_toggle.html %}

#### Metadata

| Field | Value |
|-------|-------|
| Authors | Nirhoshan Sivaroopan et al. (9 co-authors across University of Sydney · Western Sydney University · UNSW · University of Wollongong) |
| Venue | arXiv · 2026 · cs.CR |
| arXiv or DOI | [2601.19174](https://arxiv.org/abs/2601.19174) |
| Data | Attacks: AutoDoS · GCG-DoS · EOGen · RL-GOAL / Benign: GSM8K · HellaSwag · MMLU · HumanEval · GPQA |
| <span style="white-space: nowrap">Review date</span> | 2026-06-25 |

#### TL;DR

- **Sponge attacks** (resource exhaustion / DoS) against LLMs are evolving — from non-semantic gibberish prefixes to semantically fluent prompts that hide a heavy task decomposition. Existing defenses (perplexity filters, LLM-based harm filters) are either blind to semantic attacks or too static and costly to adapt.
- SHIELD is a **training-free, self-healing multi-agent defense**. A low-latency three-stage Defense Agent (DA) handles real-time protection; a Knowledge Updating Agent (KUA) dissects attacks that slip through and updates an evolving knowledgebase; a Prompt Optimization Agent (POA) evolves the Stage-3 defense prompt from that knowledge. Together they form a closed feedback loop.
- On a LLaMA2 target, AutoDoS F1 is 100.00 (perplexity-filter 36.51, harm-filter 87.57), with up to 3–14 points of advantage across four attack types. When an attack does break through once, the system learns and blocks it earlier next time.

#### Introduction

As LLMs move into autonomous systems that orchestrate tool calls and multi-step reasoning, their attack surface widens too. Among the threats, **sponge attacks** (Shumailov et al., 2021) deliberately drive a model into excessive computation, inflating latency and causing denial-of-service (DoS). The danger is that a single innocuous-looking prompt can monopolize GPU resources and starve every other benign user sharing the pipeline.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/fig1-latency.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Latency distribution of benign prompts (mean 9.2s) vs. malicious sponge prompts (mean 89.7s). A single query pushes processing time from single- to double-digit seconds."
   zoomable=true %}

Sponge attacks come in two flavors. One is **non-semantic token sequences** that suppress the end-of-sequence (EOS) token so the model babbles on — the gibberish-prefix family like GCG-DoS/Engorgio (Dong et al., 2024) and RL-GOAL (Manu et al., 2025). The other is **semantically coherent** prompts that read naturally but internally chain a huge number of subtasks — AutoDoS (Zhang et al., 2025) is the canonical example. EOGen (Manu et al., 2025) combines the two.

Existing defenses split into two camps. The first is **perplexity-based input filtering** (Alon and Kamfonas, 2023), which flags anomalous token distributions via statistical thresholds. It is fast, lightweight, and effective against non-semantic attacks — but fundamentally helpless against semantically meaningful sponge prompts, where the malice is dissolved into fluent language. The second is **LLM-based detection** (the harm-filter of Phute et al., 2023), which reasons over descriptions of resource-exhausting behavior to catch both semantic and non-semantic attacks. It is expressive and future-proof, but its static defense prompts lack robustness and scalability against evolving attacks, it incurs heavy latency by invoking an LLM on every input, and it offers little recovery once the defense model itself fails. The gap the authors target is exactly this: **there is no defense framework that adapts to new attacks and self-heals after being breached.**

#### Key Contributions

- **The first auto-healing agentic defense for sponge attacks.** A closed feedback loop that keeps adapting without re-architecting. SHIELD = **S**elf-**H**ealing **I**ntelligent **E**volving **LL**M **D**efense.
- **A three-stage defense pipeline.** A cascade of cheap semantic-similarity filtering → substring matching → LLM reasoning, prioritizing early-stage detection to cut the latency overhead of per-query LLM invocation.
- **A prompt-optimization workflow.** Defense instructions are evolved whenever new attack behavior emerges, overcoming the robustness and scalability limits of static prompts — with no model retraining (training-free, black-box compatible).
- **Separating the two self-healing pathways.** New attack *types* are handled by LLM-level adaptation (POA prompt optimization); new *instances* of known types by data-level reinforcement (knowledgebase expansion → Stages 1/2). This separation is, in my view, the paper's most meaningful design insight.

#### Background & Related Work

**The lineage of sponge attacks.** The concept starts with sponge examples (Shumailov et al., 2021) — inputs crafted to spike energy and latency at inference. With LLMs the attacks grew sharper. Engorgio (Dong et al., 2024) optimizes an EOS-suppressing prefix via gradients to stretch output length 2–13× (this paper labels it GCG-DoS; it needs model weights). RL-GOAL and EOGen (Manu et al., 2025) assume vocabulary access to search the token space or train a goal-conditioned RL attacker for a target length. AutoDoS/Crabs (Zhang et al., 2025) is a black-box semantic attack that embeds a "Length Trojan" in fluent input to evade defenses and amplify latency by over 250×. Separately, P-DoS-style attacks bake permanent inefficiency in via poisoned fine-tuning, but since they touch model weights they fall outside this paper's scope.

**The lineage of defenses.** Safety alignment (RLHF and friends) targets training-time alignment and does not directly address inference-time exhaustion. Inference-time defenses include perplexity filtering (Alon and Kamfonas, 2023) and LLM self-examination (Phute et al., 2023), but they mostly rely on static heuristics or prompts and generalize poorly to evolving attacks. SHIELD follows the "use LLMs to guard LLM systems" trend but adds a **self-healing loop** on top.

**Prompt optimization.** POA borrows from the evolutionary prompt search of EvoPrompt (Guo et al., 2025), Promptbreeder (Fernando et al., 2023), and OPRO (Yang et al., 2023). The core idea is to treat prompt selection and refinement as meta-optimization — like hyperparameter tuning over a fixed pretrained model, optimizing purely at the prompt level with no parameter updates.

#### Method / Architecture

SHIELD consists of two tightly coupled pipelines: a **Defense Pipeline** for low-latency everyday protection, and a **Knowledge Updating Pipeline** that activates only when the defense is breached. The whole thing is a closed loop among three agents — the Defense Agent (DA), the Knowledge Updating Agent (KUA), and the Prompt Optimization Agent (POA).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/fig2-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: SHIELD overview — (i) the multi-agent framework (left: DA, KUA, POA wrapping the target model) (ii) the three-stage defense pipeline (center: similarity → substring → LLM reasoning) (iii) the prompt optimizer (right: meta-prompt generates candidate instructions → evaluate → roulette-wheel selection)."
   zoomable=true %}

### Defense Agent (DA): a three-stage cascade

The DA is the primary decision-maker, classifying incoming queries as benign or malicious. Under normal operation everything resolves inside the DA, preserving low latency; only when an attack evades detection and triggers excessive generation do the auxiliary agents (KUA, POA) wake up. The cascade **rejects immediately** on failure at any stage.

**Stage 1 — Semantic Similarity Filtering.** The query is embedded with a text-embedding model and compared against a vector database of known sponge prompts. Anything exceeding a similarity threshold is flagged malicious. This catches paraphrased or semantically preserved attacks. The decision rule is simple:

$$
\begin{aligned}
s(q) &= \max_{p \in \mathcal{D}} \cos\big(e(q),\, e(p)\big), \\
&\text{reject if } s(q) > \tau, \quad \tau = 0.6
\end{aligned}
$$

where $e(\cdot)$ is the embedding function and $\mathcal{D}$ is the sponge-prompt knowledgebase. The choice of $\tau$ is discussed in the ablations.

**Stage 2 — Substring Matching.** Using the top-k contexts retrieved in Stage 1, a lightweight KMP (Knuth–Morris–Pratt, Knuth et al., 1977) substring matcher detects known sponge payloads embedded inside longer benign wrappers. This captures attacks that slip past the similarity threshold — short malicious fragments tucked into benign context that dilute the overall embedding.

**Stage 3 — LLM-Based Reasoning.** Remaining queries are judged by an LLM classifier guided by an optimized defense prompt plus the Stage-1 retrieved contexts. It detects sponge patterns with compute-exhaustion intent semantically. Only queries passing all three stages are forwarded to the target model.

The crux of the design is latency alignment. As we'll see, Stages 1 and 2 run in tens to a hundred milliseconds while the Stage-3 LLM call costs 1.6 seconds — an order of magnitude more. Putting cheap filters first and expensive reasoning last drives average latency down sharply.

### Knowledge Updating Agent (KUA): system-level self-healing

The KUA activates **only when the DA fails to detect a sponge attack**. Its trigger is abnormal target-model behavior — excessive generation length/latency, or reaching the max token limit.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/fig6-kua-reasoning.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: A KUA reasoning trace. Given an input that looks like a respiratory-system question but ends in the non-semantic suffix “In niDigitalFalseensure mas”, the KUA queries its DB/cache tools → reasons that the suffix matches the cached extracted prompt (“C Room loanAK”) and attack-type description → probes a sandboxed target copy with the suffix and sees 4096 tokens generated → updates the vector database."
   zoomable=true %}

The KUA's flow is:

1. **Check the attack-type cache + semantic search over the knowledgebase** to assess how similar the incoming attack is to known ones.
2. **If no matching description → treat it as a novel variant.** Analyze it on a **sandboxed copy of the target model**, and via iterative sub-span probing (segmenting and mutating the prompt) isolate the **minimal component** responsible for the sponge behavior. For confirmed novel attacks, optionally consult external sources (forums, repositories), then **update both the attack-type cache and the knowledgebase**, strengthening the DA's similarity and pattern stages.
3. **If a matching description exists → run sub-span probing and update the knowledgebase (kb) only.** Since this is not a new attack type, the cache is left untouched.

This branch matters. By distinguishing "is this a brand-new attack type?" from "is this a new instance of a known type?", it routes the former to heavy LLM-level healing (the POA below) and the latter to lightweight data-level healing.

### Prompt Optimization Agent (POA): LLM-level self-healing

The POA is triggered **whenever the attack-type cache is updated** (i.e., when a new type is discovered) and refines the defense instructions used in Stage 3 via evolutionary prompt search. There is no retraining and it is black-box compatible. The procedure follows the EvoPrompt family (Appendix B):

1. **Generate initial candidate instructions.** A meta-initialization prompt produces $M$ diverse candidate instructions. Labeled and Candidate exemplars are supplied so the optimizer can infer the structure of the user prompt that the downstream LLM classifier will receive.
2. **Evaluate candidates with the LLM classifier.** Each candidate is used as the system prompt to produce predictions on a validation set, with the F1-score as the fitness.
3. **Fitness-proportionate (roulette-wheel) selection.** Pick $r$ instructions with probability proportional to validation F1:

$$
P(\text{select } I_i) = \frac{\text{F1}(I_i)}{\sum_{j} \text{F1}(I_j)}
$$

4. **Meta-prompt update.** The selected $r$ instructions, with their validation fitness and similar exemplars, form the meta-prompt for the next round.
5. **Iterative refinement.** Generate $r$ new instructions from the updated meta-prompt and repeat for up to $P$ iterations or until $T$ consecutive rounds with no improvement, tracking the best instruction throughout.

The search strategy shifts by phase — **Exploration** early (broad, diverse instructions), **Combination** in the middle (crossover/mutation on high performers), and **Refinement** at the end (fine-grained wording and structural edits).

### The closed loop: two self-healing pathways

Put the three agents together and SHIELD turns detection failures into knowledge. Figure 4 walks through the case where a novel semantic attack (AutoDoS) breaks through for the first time.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/fig4-case-study1.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Case Study 1. An AutoDoS prompt passes Stages 1/2/3 and reaches the target, triggering a long response → hitting the max token limit wakes the KUA → no cache match → sandbox probing identifies a novel semantic sponge pattern → cache and kb updated → being a new type, the POA fires and optimizes the Stage-3 prompt → a later AutoDoS prompt of the same structure is rejected with “DA healed at stage 3.”"
   zoomable=true %}

The key is the separation of the two pathways. A **new attack type** is healed at the LLM level by the POA rewriting the Stage-3 reasoning prompt (Case Study 1); a **new instance of a known type** is healed at the early stages by the KUA adding the minimal malicious fragment to the kb (Case Study 2, detailed below in "Analysis"). Neither path retrains the target model or the defense LLM.

#### Optimization Objective / Detection Criteria

Because the method is training-free, there's no conventional loss function. Instead, three criteria govern the system's behavior.

- **Stage 1 decision rule.** As above, the query is rejected when the cosine similarity $s(q)$ between the query embedding and the nearest sponge prompt in the kb exceeds threshold $\tau$. A smaller $\tau$ catches more, earlier, but raises the risk of benign false positives. SHIELD sets a conservative $\tau = 0.6$ to avoid flagging benign queries.
- **Stage 3 classification objective.** The LLM classifier outputs one of `{Malicious, Benign}`. What the POA optimizes is this classifier's system prompt, with the objective being the **F1-score** on the validation set (the harmonic mean of precision and recall, robust to class imbalance).
- **POA selection probability.** Per the roulette-wheel formula, candidate instruction $I\_i$ is selected with probability proportional to its validation F1 — exploiting strong prompts while keeping weaker ones in play to preserve search diversity.

In short, SHIELD's "learning" is not weight updates but two non-parametric adaptations: **knowledgebase expansion + prompt evolution**.

#### Data & Pipeline

Since there's no training, the "pipeline" here refers to the evaluation setup and system components.

| Component | Choice |
|------|------|
| Vector DB | Zilliz |
| Embedding model | text-embedding-3-small (OpenAI) |
| Substring matching | KMP algorithm (Knuth et al., 1977) |
| Defense LLM (Stage 3) | gpt-oss:20b |
| Target model (Table 1) | LLaMA2 |
| Baselines | harm-filter (LLM-based), perplexity-filter (statistical) |
| kb initialization | 15 randomly selected sample prompts per attack type |

There are four attack datasets — **RL-GOAL** (non-semantic, needs vocabulary access), **GCG-DoS** (non-semantic/Engorgio, needs weight access), **EOGen** (mixed non-semantic + semantic, needs vocabulary access), and **AutoDoS** (fully semantic, black-box). The five benign datasets — GSM8K (math), HellaSwag (commonsense), MMLU (multi-subject knowledge), HumanEval (code), GPQA (expert-level QA) — cover a broad range of normal tasks.

#### Experimental Results

### Main benchmark (Table 1)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/tab1-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: F1-scores of the Defense Agent vs. baselines on the LLaMA2 target. The perplexity filter collapses on the semantic attack (AutoDoS) while SHIELD converges to a perfect score."
   zoomable=true %}

F1-scores on the LLaMA2 target:

| Attack type | Perplexity-filter | Harm-filter | SHIELD |
|------|------|------|------|
| AUTO-DOS | 36.51 | 87.57 | **100.00** |
| GCG-DOS | 96.07 | 96.86 | **99.85** |
| EOGen | 95.77 | 81.34 | **95.32** |
| RL-GOAL | 99.19 | 93.71 | **99.60** |

The story is in the per-attack pattern.

- **AutoDoS (fully semantic).** The perplexity filter collapses to 36.51. Semantic prompts have token distributions statistically close to benign inputs, leaving the statistical filter all but blind. The harm-filter improves to 87.57 but lacks explicit semantic grounding and falls short of full coverage. SHIELD reaches 100.00 — its evolving context knowledge nails semantic attacks.
- **EOGen (mixed).** The harm-filter drops hardest here, to 81.34. With partial semantic structure intertwined with non-semantic fragments, you must isolate the malicious component, which abstract behavioral descriptions struggle to do. SHIELD recovers most of that gap at 95.32 (this is the one cell where SHIELD slightly trails the perplexity filter's 95.77, but its wins on the other three more than compensate).
- **GCG-DoS · RL-GOAL (non-semantic).** All three are high, but SHIELD leads at 99.85 and 99.60.

Overall SHIELD beats the baselines by up to 3–14 points. The authors' conclusion is clear — optimized prompting, semantic grounding, and adaptive knowledge integration are jointly what make detection reliable across diverse sponge strategies.

### Per-stage latency (Table 2)

| | Stage 1 | Stage 2 | Stage 3 |
|------|------|------|------|
| Latency | 97 ms | 63 ms | 1600 ms |

The Stage-3 LLM call is an order of magnitude (~10×) slower than Stages 1 and 2. This gap is the whole justification for the cascade — the more attacks you filter out at Stages 1/2, the more end-to-end latency drops by an order of magnitude.

#### Analysis / Ablation

{% include figure.liquid loading="eager"
   path="assets/img/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/fig3-dissecting.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: Dissecting SHIELD — (a) DA F1 robustness across target models and attack types (b) Stage-1 benign/malicious similarity-score distribution and thresholds (c) per-stage detection contribution for DA, DA+POA, and full SHIELD (d) F1 convergence over POA iterations (EOGen)."
   zoomable=true %}

### DA robustness (Fig 3a)

The DA holds near-saturated F1 across target models from multiple vendors — Gpt-4o, LLaMA2, Gpt-J, Gemma3-27b, Mistral-7b, Qwen-7b, deepseek-coder-7b, Phi-3-mini-4k, and more — and across three attack types (AutoDoS, GCG, EOGen). Despite differences in architecture, scale, and open vs. black-box access, the defense generalizes well.

### Threshold selection (Fig 3b)

To pick the Stage-1 threshold, the authors recorded the maximum similarity per query on a validation set of 100 prompts for the EOGen attack on LLaMA2. Benign similarities cluster low while malicious ones sit higher. The figure marks a **safe threshold of 0.52** (zero benign false positives) alongside the F1-maximizing point. SHIELD adopts a conservative **0.6** to keep benign queries from being flagged while still confidently filtering clear malicious cases at Stage 1.

### Per-stage contribution (Fig 3c)

This is a cumulative analysis pooling prompts from all attack types. Running the DA with just an initial handcrafted prompt (first bar) detects a substantial fraction of malicious prompts but relies little on Stage 3. Adding the POA (second bar) sharpens LLM-based detection through an optimized prompt, raising overall F1 and shifting a larger share of correct detections to Stage 3. Full SHIELD with the KUA (third bar) moves detections to earlier stages, with pooled F1 rising to about 99.30%. In other words, as the KUA fills the kb, attacks are increasingly caught at Stages 1/2 and the dependence on costly LLM inference shrinks.

### Effect of prompt optimization (Fig 3d)

For EOGen detection, F1 climbs steadily with POA iterations and converges to a strong optimum — a **maximum of 96.0% at iteration 37**. The authors report that the POA delivers roughly a **30-point absolute F1 improvement** over manual prompt engineering. Where hand-tuning is slow and offers no guarantee of optimality, only systematic automated optimization reaches peak defense performance.

### Latency–accuracy trade-off, and Case Study 2

Combining the latency measurements with stage-wise detection reveals a system-level advantage — as the KUA enriches the kb, more attacks are intercepted early, yielding both higher accuracy and substantially lower latency. This progressive migration of detections from Stage 3 to Stages 1/2 is exactly how SHIELD scales efficiently under repeated or adaptive attacks.

Case Study 2 makes this data-level healing concrete. SHIELD has a GCG-DoS/EOGen type description in its cache but not the specific malicious fragment in its kb. A user submits a long, mostly benign prompt with the short non-semantic fragment "C Room loanAK" embedded. The benign context dominates the overall embedding so Stage 1 misses it (context dilution), the fragment isn't in the kb so Stage 2 fails, and Stage 3 misclassifies it as benign. When the target behaves abnormally, the KUA wakes up, retrieves existing attack descriptions, and decides the mechanism aligns with a known non-semantic sponge category — so it **adds no new attack type and does not trigger the POA.** Instead it isolates "C Room loanAK" as the minimal malicious span via sandbox probing and adds it to the kb. When that same fragment later appears inside a different long prompt, Stage 1 still misses it (dilution) but the Stage-2 substring matcher catches it immediately and rejects the query. The retrieval and pattern-matching layers were healed without touching the LLM classifier.

#### Limitations & Critical Assessment

**Author-acknowledged limitations.**

- **Threshold-selection trade-off.** 0.6 is a conservative choice to avoid benign false positives early in deployment, but lowering the threshold buys earlier detection and lower latency at the cost of higher benign false-positive risk. Automated threshold adjustment would need human-in-the-loop supervision and feedback analysis, left to future work.
- **Unbounded knowledgebase growth.** If the sponge-prompt kb grows without bound, semantic-retrieval latency and memory overhead grow with it, eroding the efficiency gains of early-stage filtering. Principled management (pruning, clustering, diversity-aware updates) is deferred.
- **Robustness of the defense LLM itself.** The defense LLM can also be targeted by sponge attacks. This is mitigated by separating it from the target (minimizing impact on user-facing services), tightly constraining its token budget (it generates no user-visible content), and conservatively flagging queries when the token limit is hit. Hardening defensive LLMs against adaptive adversaries remains open.
- **Scope limited to prompt-level attacks on clean models.** Attacks that assume poisoned fine-tuning, like P-DoS, are out of scope. The chosen, more realistic threat model assumes only trusted operators touch model weights.

**Additional limitations I'd flag.**

- **Reproducibility, given no code release.** The kb initialization, the sub-span probing procedure, and the POA meta-prompts aren't released, making faithful reproduction hard.
- **No quantitative evaluation of self-healing.** The headline value of the loop — "how many breaches before it converges," "wall-clock time to heal" — isn't measured in the main text. The healing cost of the KUA/POA (a sandboxed target copy + iterative probing + evolutionary search) is, unlike DA stage latency, never reported. Fig 3d's "convergence at iteration 37" is essentially the only quantitative signal, and it's for one attack (EOGen).
- **Stage 2's brittleness to mutation.** As Case Study 2 shows, Stage 2 catches a fragment only when the *same* fragment reappears verbatim. An attacker who mutates the fragment each time bypasses Stage 2 until the kb catches up — the design itself assumes "the same fragment appears again."
- **Limited baseline and target diversity.** The main head-to-head (Table 1) uses two baselines (perplexity + one LLM-based harm-filter) and one target (LLaMA2). Fig 3a shows robustness across models, but only for DA F1 — not a comparison against baselines or an evaluation of the full healing loop. There's no comparison to recent DoS-specific defenses like pd3f.
- **Reading the AutoDoS F1 of 100.00.** A perfect score hints at small or curated per-attack evaluation sets. Per-attack dataset sizes and statistical significance aren't reported in the main text, so it's safer to read the *relative gap* (perplexity 36.51 → SHIELD 100) than the perfect number itself.

#### Takeaways

- **Turning detection failures into an asset.** Rather than treating "getting breached once" as preventable, SHIELD accepts it and absorbs the failure into knowledge that blocks the next one. In an evolving attack landscape, that framing is fundamentally stronger than static defense.
- **Separating the two healing pathways is the core.** New *type* → prompt optimization (POA, LLM level); new *instance* of a known type → kb expansion (KUA, data level). Cleanly splitting heavy from light adaptation is what makes the system efficient.
- **A latency-aligned cascade.** The 97ms / 63ms / 1600ms cost gap is baked straight into the design. As the kb fills, detections migrate from the expensive Stage 3 to the cheap Stages 1/2 — the mechanism that wins both accuracy and latency under repeated, adaptive attacks.
- **Training-free and black-box compatible.** Evolving only the knowledgebase and prompts — no weight updates — means it drops onto production black-box deployments where you can't touch the weights.
- **A clean answer to "who guards the guard."** Separating the defense LLM from the target and capping its token budget tightly is a simple move that largely seals off the risk of the defense model itself becoming a sponge target.

#### References

- Paper: <https://arxiv.org/abs/2601.19174>
- arXiv HTML: <https://arxiv.org/html/2601.19174>

#### Further Reading

- **[Sponge Examples: Energy-Latency Attacks on Neural Networks](https://arxiv.org/abs/2006.03463)** (Shumailov et al., EuroS&P 2021) — the origin of the sponge-attack concept, formalizing inputs that deliberately spike inference energy and latency.
- **[An Engorgio Prompt Makes Large Language Model Babble on](https://arxiv.org/abs/2412.19394)** (Dong et al., ICLR 2025) — the non-semantic attack this paper labels GCG-DoS. It gradient-optimizes an EOS-suppressing prefix to stretch output length 2–13×.
- **[Prompt-Induced Over-Generation as Denial-of-Service: A Black-Box Attack-Side Benchmark](https://arxiv.org/abs/2512.23779)** (Manu et al., 2025) — the same group's prior work introducing EOGen and RL-GOAL, the attack-side benchmark SHIELD defends against.
- **[Crabs: Consuming Resource via Auto-generation for LLM-DoS Attack under Black-box Settings](https://arxiv.org/abs/2412.13879)** (Zhang et al., ACL 2025) — this paper's AutoDoS. A black-box semantic attack that embeds a "Length Trojan" to amplify latency by over 250×.
- **[PD3F: A Pluggable and Dynamic DoS-Defense Framework Against Resource Consumption Attacks](https://arxiv.org/abs/2505.18680)** (Zhang et al., 2025) — a contemporaneous LLM DoS-defense framework that SHIELD doesn't compare against; reading the two together maps out the defense design space.

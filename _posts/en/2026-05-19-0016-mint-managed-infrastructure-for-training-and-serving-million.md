---
layout: post
title: "[Paper Review] MinT: Managed Infrastructure for Training and Serving Millions of LLMs"
date: 2026-05-19 22:00:00 +0900
description: "A managed infrastructure for training and serving millions of LoRA policies over a small set of resident base models. Adapter revisions become the unit that crosses the training-serving boundary, cutting the handoff by 18.3x and validating the path up to 1T-scale MoE."
tags: [lora, rlhf, infrastructure, moe, multi-tenant-serving, post-training]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig1-mint-overview.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/
ko_url: /papers/0016-mint-managed-infrastructure-for-training-and-serving-million/
---

{% include lang_toggle.html %}

## Meta

| Field | Value |
|-------|-------|
| Authors | Mind Lab (Andrew Chen et al., 13 core contributors + ~60-person team) |
| Venue | arXiv preprint · 2026 |
| arXiv 또는 DOI | [2605.13779](https://arxiv.org/abs/2605.13779) |
| Code | [MindLab-Research/mint-cookbook](https://github.com/MindLab-Research/mint-cookbook) — cookbook recipes only (service code not released) |
| Data | Qwen3 family (0.6B/4B dense and 30B-A3B / 235B-A22B MoE), Moonlight-16B-A3B, Kimi K2 1.04T, GLM-5/5.1. Recipes cover SFT (FinEval / FinGPT suite), DPO (chat pairs), GRPO (DAPO-AIME24), LawBench AutoResearch |
| <span style="white-space: nowrap">Review date</span> | 2026-05-19 |

## TL;DR

- The traditional pattern of copying a full checkpoint per trained policy stops scaling once post-training becomes a multi-policy RL workload. MinT keeps the base model resident and makes the LoRA <strong>adapter revision</strong> the single artifact that crosses the training-serving boundary.
- Three scaling axes: **Scale Up** (LoRA RL on 1T-class MoE and MLA/DSA architectures), **Scale Down** (adapter-only handoff is 18.3x faster than merge on a 4B dense model and 2.85x on a 30B MoE; concurrent GRPO under the same base allocation shaves 1.77x / 1.45x off wall time), **Scale Out** (a $10^6$-scale addressable policy catalog kept separate from CPU-cache and GPU-batch working sets).
- Packing MoE LoRA tensors into a serving representation reduces 37,248 tiny tensor objects to 672, speeding live engine loading by 8.5-8.7x while file size barely changes. Treating cold loading as *scheduled service work* is one of the key contributions.
- The single design choice — "the adapter revision, not the checkpoint, is the first-class object at the training-serving boundary" — unifies policy lifecycle, MoE router replay, DSA correction, and the three cache tiers.

## Introduction

Post-training used to be a one-shot stage at the end of pretraining. Between 2024 and 2026 it has turned into a multi-policy, multi-stage RL workload. Frontier-model reports describe reasoning, coding, tool use, and agentic evaluation as workflows that produce *dozens to hundreds of policy variants*: per-task fine-tunes, product branches, experimental versions, tenant adapters, rollback points.

The point where existing infrastructure breaks is sharp. If the *result* of any trained variant is a full fine-tuned checkpoint, every training-to-serving crossing has to move the entire model. A 1T base makes even a 30 GB LoRA-merged checkpoint qualitatively different from a few-hundred-MB LoRA adapter. Merged LoRA reduces training memory but ends by folding the adapter back into the base and shipping the merged full checkpoint — the byte burden at the boundary is unchanged.

MinT (the MindLab Toolkit) rewrites that boundary. The base stays resident across training, rollout, and serving workers, and the trained LoRA is exported as an *adapter revision*: a fixed LoRA snapshot at a specific training step, frozen in serving tensor layout. Every stage of a policy's lifecycle — rollout, update, export, evaluation, serving, rollback — selects an adapter revision. This post walks through how that single abstraction connects validated learning curves up to 1T MoE, a 18.3x faster adapter handoff, and a $10^6$-scale policy catalog, all under one system design.

## Key Contributions

- **Adapter-revision lifecycle.** Export → rollout → evaluation → serving → rollback flow through one exported LoRA file. The policy record holds the service-side state (compatible base, rank, target modules, training checkpoint pointers, rollout records, exported revisions list).
- **Large-scale multi-LoRA RL training.** A single resident base is time-sliced across multiple LoRA policies. Both single-worker PEFT and distributed Megatron training paths are supported, with measured curves up to 235B-A22B GRPO and Kimi K2 1.04T countdown-task RL.
- **Policy-population multi-LoRA serving.** vLLM engines hold a resident base and attach adapter revisions. The addressable catalog, CPU cache, and GPU batch are exposed as *three independent capacity dimensions*; a packed MoE LoRA representation speeds live load by 8.5-8.7x by collapsing the small-tensor fanout.
- **Public reproducibility paths.** A Tinker-compatible API and the `mint-cookbook` recipes (SFT, preference optimization, rollout-based RL, AutoResearch) reproduce the same lifecycle from one example set.

## Related Work / Background

This paper sits in a stack where *LoRA training* and *LoRA serving* both already have their own ecosystems, and the missing piece is the *service* that connects them into one lifecycle.

- **LoRA and its variants.** Hu et al.'s LoRA freezes the base and trains only low-rank matrices. AdaLoRA dynamically allocates rank budget across layers; QLoRA combines a 4-bit quantized base with LoRA updates. "LoRA Without Regret" (Schulman & Thinking Machines Lab, 2025) shows LoRA can reach near-full fine-tune quality in post-training — the empirical premise this paper builds on when it treats LoRA as a *service-level unit*, not a memory optimization.
- **Multi-LoRA training infrastructure.** mLoRA (Ye et al., 2024) fine-tunes several adapters in one batch. MinT takes a different route, exploiting the fact that RL workloads already carry enough rollout tokens per policy to fill a per-policy batch, so time-slicing is sufficient.
- **Multi-LoRA serving.** Punica (Chen et al., 2024), S-LoRA (Sheng et al., 2023), dLoRA (Wu et al., 2024), and LoRAServe (Jaiswal et al., 2025) handle the runtime question — how to route, batch, and memory-manage existing adapters under a shared base. MinT layers a *serving catalog ↔ training export* lifecycle on top of that, turning cold misses into scheduled service work.
- **RL execution frameworks.** HybridFlow/verl, AReaL, OpenRLHF, ROLL, StreamRL, Laminar, and NeMo-Aligner address *generic RL systems concerns* — rollout scheduling, failure isolation, colocated/disaggregated execution. MinT adds *LoRA-specific service state*: adapter revisions, optimizer state, rollout records, MoE route records, DSA correction metadata.
- **Training-serving consistency.** R3 (Ma et al., 2025) and IcePop (Ling Team et al., 2025) quantify how MoE router mismatch and token-level probability gaps destabilize RL. MinT stores the corresponding correction policy as part of the rollout record.

## Method / Architecture

### System overview

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig1-mint-overview.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: A four-layer view — user intent → MinT service → policy population over shared base deployments → infrastructure components. Scheduler, fault tolerance, adapter lifecycle, and serving residency stay behind the service interface."
   zoomable=true %}

User intent (base model, data + reward, LoRA RL recipe, evaluate / serve target) is turned into *queued work, policy records, and exported revisions*. The base model is *resident* on training, rollout, and serving workers; a population of policies $r\_1, r\_2, \ldots$ moves through train / evaluate / serve / rollback under the same adapter lifecycle. The lower box — scheduler, fault tolerance, adapter lifecycle, serving residency — is the complexity *hidden underneath*.

### The training-serving boundary: what crosses

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig2-training-serving-paths.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: Three paths from training to serving. Full fine-tuning ships full weights $W\_i$ per variant; LoRA merge folds the adapter into the base and ships a merged full checkpoint $W'\_i$; MinT keeps the base $W$ resident on both sides and moves only the adapter $L\_i$."
   zoomable=true %}

This simple diagram contains most of the paper's abstraction. *Full fine-tuning* moves complete weights $W\_1, W\_2, \ldots, W\_n$ from the training worker to the inference worker. *LoRA merge* trains adapters beside a resident base but, to ship to serving, folds them back into the base and moves a merged full checkpoint $W'\_i$. *MinT multi-LoRA* keeps the base $W$ resident on *both* workers and moves only the adapter $L\_i$. The saving isn't only adapter bytes — because the inference engine *already holds the base*, the load step itself collapses to admitting a new adapter into a slot.

### Adapter revision vs policy record

This separation is one of the design's most important choices.

- **Adapter revision**: a fixed, exported LoRA snapshot frozen at a particular training step and stored in serving tensor layout. Not a training checkpoint — optimizer state and rank-local training files are stripped away, leaving one PEFT adapter file.
- **Policy record**: the service-side state that makes that payload *queryable, reloadable, and rollbackable*. It names the compatible base version, LoRA rank and target modules, the latest training checkpoint, the rollout records, and the list of exported revisions.

If those were one object, every training update would oscillate the serving catalog. By keeping them separate, the catalog can hold a stable revision *while training continues*, and only that revision is selected by evaluation or serving.

### System design: service plane vs compute plane

MinT separates the *service / control plane* (API, queue, policy lookup, resource admission, operation state) from the *compute plane* (PEFT/Megatron trainers, vLLM samplers). Durable storage between them holds four kinds of artifact: policy records, checkpoints, rollout records, exported adapters. The paper's *operation-visibility* invariant is that every client call returns a pollable operation id, and a result becomes client-visible only after the worker writes the metadata entry that names its completed files — partial files never leak into the catalog.

### Scale Up: LoRA RL on 1T-class MoE

For LoRA to survive on a large base, the *distributed placement of the base* and the *adapter export* have to agree. In Megatron training groups, dense-module LoRA tensors follow the tensor-parallel shards of the weights they modify; MoE expert LoRAs are keyed by expert id, with EP shards owning only the LoRAs for experts they hold and TP further sharding within the owner group. Shared-expert LoRA is stored once per EP shard and deduplicated on export.

#### MoE router replay (R3-style)

MoE RL has a subtle hazard: if the expert path that handled a token during *rollout* doesn't match the expert path that scores that token during *training*, the on-policy assumption breaks. MinT records the selected expert ids in the rollout record and, when the training backend can map those ids to its EP layout, replays that route. Tokens whose route cannot be reconstructed (missing ids, layout change) are masked out of the policy gradient.

#### Sparse-attention provenance (DSA)

GLM-5 / GLM-5.1's dynamic sparse attention opens a similar channel. The indexer and top-$k$ decide which tokens take part in sparse attention, so numerical differences can change the token set and create a rollout/training mismatch. MinT uses an IcePop-style rollout correction: tokens whose training/rollout probability ratio leaves the configured trusted band receive zero importance weight. This *filters out* unsafe scoring terms; it does not replay every indexer choice, and it doesn't prove that training used the exact sparse-attention token set the inference engine selected.

### Scale Down: adapter-only handoff

#### Handoff bytes

A measured Qwen3-4B rank-32 PEFT adapter file is 264,310,274 bytes — about 252 MiB. The same 4B base has a bf16 floor of about 8.0 GB. The adapter is roughly *3.3% of the base-weight floor*. At rank-1 with a tighter target-module set, that drops to ~0.10% — the abstract's "less than 1%" claim is conservative.

#### Time-sliced multi-policy training

One trainer actor keeps the base $W$ resident and time-slices LoRA A → switch → LoRA B → switch → LoRA A (paper figure 5). At each policy switch the previous policy's LoRA tensors, optimizer state, gradients, and rollout records are committed to its policy record, and the next policy's state is restored. The base stays in GPU memory across switches, so *the policy-switch cost does not include base reload*.

#### Concurrent training timeline

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig7-concurrent-multi-lora-timeline.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: Sequential vs MinT concurrent execution of three GRPO policies under the same base-model allocation. Qwen3-4B: 51.4 → 28.9 min (1.77x faster, 22.4 min saved). Qwen3-30B: 168.8 → 116.8 min (1.45x faster, 52.0 min saved). Peak memory unchanged in both cases (65.6 GiB / 68.0 GiB)."
   zoomable=true %}

The point is that *peak memory stays flat while wall time shrinks*. The speedup comes from filling the idle gaps in a sequential schedule with another policy's rollout / update / evaluation phase — a form of self-pipelining at the trainer level.

#### Adapter-only vs merge-and-load handoff

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig8-adapter-handoff-vs-merge.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: Wall time for shipping a freshly trained policy to the sampler. Qwen3-4B adapter path 4.1s vs merge 74.9s (18.3x faster). Qwen3-30B adapter 208.7s vs merge 595.5s (2.9x faster)."
   zoomable=true %}

Table 4 in the paper decomposes this. On Qwen3-4B the adapter path is *materialization/load 0.036s + cold first sample 4.114s*, while the merge path is *materialization/load 71.820s + cold first sample 55.704s*. The 71.8 s on the merge path goes entirely to folding the adapter back into the base and admitting the resulting full checkpoint into the sampler. Compare warm sample speed (15,568 vs 20,595 tok/s) and the merge path is genuinely faster *at steady state*, but for short RL steps the handoff cost dominates so much that adapter-only wins by a wide margin.

### Scale Out: policy-population serving

#### Three cache tiers

| Tier | Scale | Lifetime | Promotion / eviction |
|------|-------|----------|----------------------|
| Addressable catalog | $10^3 - 10^6$ entries | Durable (control plane) | Promoted by export, retired manually |
| CPU adapter cache | Hundreds per engine | Per actor run | Promoted by router / cache-miss load, LRU eviction |
| GPU batch | $\le 64$ distinct | One decoding step | Promoted by batch scheduler, released at step end |

Table 2 in the paper makes the point that *addressable catalog size* and *concurrent GPU residency* are different capacity dimensions. $10^6$ is how many policy names can be resolved, not how many can be simultaneously alive in a GPU batch.

#### Warm vs cold path measurements

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig13-warm-vs-cold.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 13: Left: CPU-cached requests p95 21.35s vs cache-miss 199.81s. Middle: warm/cold regimes stay stable as the catalog grows from 1k to 100k. Right: 16 distinct cold adapters serialize into a 1.36 s/adapter staircase totaling 23.27s."
   zoomable=true %}

The middle panel matters most: a 100x larger catalog does not push warm p95 up. Routing and local cache state are scaled by traffic locality, not by catalog size, so addressability is decoupled from execution capacity — exactly the design contract the paper is trying to demonstrate.

#### MoE small-tensor fanout

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/tab7-packed-moe-lora-loading.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 7: Effect of the packed MoE LoRA representation. File size barely changes (110.75 → 105.58 MB, 1.05x smaller) but tensor objects collapse from 37,248 to 672 (55.4x fewer), yielding read tensors 54.8x / build loader objects 29.5x / live engine load 8.5-8.7x faster."
   zoomable=true %}

This is why MoE LoRA makes the cold path *visible*. Even a rank-1 adapter fragments into thousands of per-expert tensors, so the serving side pays the cost of creating tens of thousands of Python objects and registering each one with the engine. Packing keeps the *declared bytes* nearly unchanged while collapsing *object count*, which is what actually drives the 8.5x speedup.

## Training Objective / Loss

The paper proposes no new loss — it applies standard SFT, DPO reward-margin, and GRPO (a PPO-family group-relative policy optimization) to LoRA adapters. What matters for MoE RL is *which logits do the scoring*, since route mismatch is the destabilizing channel:

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_{\text{rollout}}} \left[ \sum_t \nabla_\theta \log \pi_\theta(a_t | s_t; \,\text{route}_t) \cdot A_t \right]
$$

where $\text{route}\_t$ is the expert path selected during rollout. MinT stores it in the rollout record and replays it during training when possible; tokens whose route cannot be replayed are masked. For DSA mismatch (IcePop):

$$
\begin{aligned}
w_t &= \mathbb{1}\!\left[\, \rho_t \in [\rho_{\text{lo}}, \rho_{\text{hi}}] \,\right], \\
\rho_t &= \frac{\pi_\theta^{\text{train}}(a_t | s_t)}{\pi_\theta^{\text{rollout}}(a_t | s_t)}
\end{aligned}
$$

Tokens whose ratio leaves the trust band $[\rho\_{\text{lo}}, \rho\_{\text{hi}}]$ receive $w\_t = 0$ and drop out of the gradient. This is a *filtering* correction, not a reconstruction of the exact sparse-attention token set.

## Training Data and Pipeline

| Component | Value |
|-----------|-------|
| Dense SFT | Qwen3-4B, FinEval / FinGPT suite (Fineval, FPB, FiQA-SA, TFNS, NWGI) |
| Dense DPO | Qwen3-4B, chat pairs |
| Dense GRPO | Qwen3-8B base, DAPO-AIME24 |
| MoE GRPO (30B) | Qwen3-30B-A3B, AIME24 |
| MoE GRPO (235B) | Qwen3-235B-A22B, AIME24, 32-GPU Megatron (TP=4, EP=8, PP=1) + 16-GPU TP=16 vLLM serving |
| 1T countdown-task RL | Kimi K2 (32.6B active), 64-GPU H800 |
| Serving experiments | Qwen3-30B rank-1 MoE LoRA, 4-GPU TP=4 serving actor, prompt 1024, max output 64 |
| Cookbook recipes | LawBench AutoResearch (28 experiments, 6 kept), DAPO-AIME24, chat-DPO, FinGPT |

## Experimental Results

### Scale Down: handoff cost

| Model | Path | Checkpoint size | Materialization / load | Cold first sample | Sample tok/s (total/warm) |
|-------|------|-----------------|------------------------|-------------------|---------------------------|
| Qwen3-4B | Adapter | 252 MiB | 0.036 s | 4.114 s | 15,568 / 15,567 |
| Qwen3-4B | Merge | 8.061 GB | 71.820 s | 55.704 s | 4,697 / 20,595 |
| Qwen3-30B | Adapter | 1.692 GB | 46.455 s | 117.304 s | 1,874 / 5,700 |
| Qwen3-30B | Merge | 61.084 GB | 402.245 s | 156.074 s | 1,573 / 6,904 |

The merge path has *higher warm sampling throughput* (4B: 20,595 vs 15,567 tok/s) but its handoff + cold-first-sample sum is so large that short RL steps strongly favor the adapter path.

### Scale Up: learning curves

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig10-moe-rl-curves.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 10: MoE RL learning curves. Qwen3-30B-A3B and 235B-A22B use AIME24 mean@1; Kimi K2 1T uses countdown-task reward. 30B reaches ~0.9 mid-band; 235B peaks at 0.967 (near saturation on AIME24)."
   zoomable=true %}

The point of all three panels is that *the same LoRA RL path* — adapter revision, rollout record, export, evaluate — survives 30B sparse → 235B-A22B Hopper deployment → 1T-class base without changes. Dense results live in the paper's Table 5: all five FinGPT SFT benchmarks show large held-out gains over base Qwen3-4B (e.g. FinEval 0.4226 → 0.7811), DPO chat-pairs reward margin -0.03 → 30.88, GRPO AIME24 train accuracy 0.11 → 0.47 (best raw 0.568 at step 76).

### Validated model families

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/tab1-model-family-support.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Three model families validated by the current MinT stack. Qwen3 (dense + MoE, 0.6B-235B-A22B), Moonlight & Kimi K2 (MLA MoE, up to 1.04T), GLM-5/5.1 (MLA, DSA, MTP, MoE)."
   zoomable=true %}

### Scale Out: policy-population serving

| Metric | Measurement |
|--------|-------------|
| Catalog sweep | 1k → 100k entries, all warm regime |
| CPU cache (512-adapter hotset) | 369 / 550 loaded adapters |
| Same-batch GPU active | 16, 32, 64 all 0 errors |
| Cold-cache p95 | 199.81 s (~9.4x the warm 21.35s) |
| Cold staircase (16 distinct) | 1.375 → 23.267 s, ~1.36 s/adapter |
| Packed MoE LoRA live load | 0.156-0.164 s (vs 1.36-1.39 s, 8.5-8.7x faster) |

Appendix table 13 extrapolates these single-engine limits to a $10^6$-entry catalog under a 2300-distinct-adapter active-wave assumption (warm distinct concurrency at 36 engines / 144 GPUs; cold-load isolation at 72 engines / 288 GPUs).

## Analysis / Ablation

The three-axis design lets each measurement isolate a different systems concern.

- **Scale Down's 18.3x / 2.85x speedup** doesn't come from *adapter bytes*. Table 4 shows the adapter path's cold first sample (4.1s / 117.3s) is on the same order as the merge path's (55.7s / 156.1s). The real saving is in *materialization/load* (4B: 71.8s vs 0.036s; 30B: 402.2s vs 46.5s). What collapses is not "the file is small" but "the base is already in the sampler, so merge+load goes away."
- **Concurrent multi-LoRA's 1.77x / 1.45x** is *idle-gap filling*. Peak memory stays flat — the speedup is from packing more useful work into the same allocation, not from buying a larger slot.
- **Packed MoE LoRA's 8.5-8.7x** does not come from the 1.05x file-size reduction. Read tensors 54.8x and build loader objects 29.5x faster — the bottleneck is *Python-side small-object fanout*, not byte transfer.
- **No carousel effect.** A 100x larger catalog actually leaves warm p95 *slightly lower* (20.89s → 12.16s → 12.12s). Name resolution and local cache state are decoupled cleanly enough that catalog size adds no routing overhead.

## Limitations and Critical Assessment

- **Base-model compatibility is a precondition of the abstraction.** "Move only adapter revisions" assumes the base is *binary identical* on both sides. The lifecycle is strong while the base is fixed and the adapter catalog accumulates, but base swaps — new pretraining release, quantization change, MoE expert reshuffle — are a weak point that the paper doesn't address (rollback is only between adapter revisions).
- **DSA correction is filtering, not reconstruction.** The IcePop-style filter masks unsafe tokens but does not recover the exact attention pattern the inference engine used. The paper acknowledges this: "it does not prove that training used the exact sparse-attention token set selected by the inference engine." It's a trade-off for stability, not full consistency.
- **Single-vendor validation.** Qwen, Moonlight/Kimi, GLM — all are Chinese frontier families whose training/serving stacks share family resemblances. How the lifecycle interacts with Llama-3, Mistral, or Claude-family training paths is untested here.
- **Absolute cold staircase.** 1.36 s/adapter looks small, but 16 distinct cold adapters arriving together is a 23 s staircase. A scenario like a post-deploy traffic spike with 100 distinct cold adapters relies on appendix extrapolation, not measurement.
- **Cookbook coverage.** Public reproducibility goes through the cookbook, which is welcome — but the *service code itself* (scheduler, queue, policy lookup) appears to be closed. `mint-cookbook` is recipes, not the system. In-house reproduction requires the cookbook + a Tinker-compatible API.
- **No cost reporting.** "1.77x faster" is wall-time, not dollars. Under a fixed base allocation that translates directly into GPU-hour savings, but the accounting for autoscaling environments — where concurrent multi-LoRA reuses an otherwise-idle base — is not given.
- **MoE shared-expert export consistency.** Shared-expert LoRA stored once per EP shard is deduplicated on export, but the paper doesn't measure whether the per-shard copies are guaranteed identical (training-time synchronization) or what detection mechanisms exist for the failure case.

## Takeaways

- **The real contribution is the abstraction: "an adapter revision, not a checkpoint, is the first-class object at the training-serving boundary."** That single line aligns time-slicing, MoE router replay, DSA correction, three cache tiers, and cold-load scheduling. Future multi-tenant post-training infrastructure will likely converge on similar design choices.
- **The true cost of MoE LoRA is tensor fanout, not bytes.** Even a rank-1 adapter fragments into per-expert tensors that explode the Python object count and loader registration cost. Packing leaves *declared bytes* alone and only reduces *object count* — that's where the 8.5x comes from. How small adapters are *represented* will only become more important.
- **Concurrent multi-policy RL is close to a free lunch.** A 1.45-1.77x wall-time reduction at unchanged peak memory, purely from idle-gap filling. Any team running multiple policies under one base allocation can apply this with minimal scheduling work.
- **Keep catalog size and execution capacity strictly separate.** $10^6$ addressable ≠ $10^6$ resident. A design that ties those into one dimension will hit a scaling wall immediately.
- **Tinker-style service-interface post-training is operational.** Less than a year after Thinking Machines Lab's Tinker announcement, this paper reports that the same interface runs on top of multi-tenant infrastructure validated up to 1T MoE. Post-training-as-a-service has crossed into a serious operational phase.

## Setup and Usage

`mint-cookbook` is a recipe set, not the service itself, but the Tinker-compatible API exposes the same lifecycle (the service appears to be closed-source):

```python
# Tinker-compatible client (the API shape sketched in paper §3)
client = mint.Client(api_key="...")

# 1) Create a policy record
policy = client.policy.create(
    base_model="Qwen3-30B-A3B",
    lora_rank=16,
    lora_target_modules=["attention", "mlp"],
    recipe="grpo",
    data="dapo-aime24",
)

# 2) Train step (returns a pollable operation id)
op = client.train.step(policy_id=policy.id, batch_size=64)
result = client.operation.wait(op.id)

# 3) Export adapter revision and register for serving
revision = client.policy.export(policy_id=policy.id)
client.serving.register(revision_id=revision.id)

# 4) Start a second policy on the same base (time-sliced)
policy2 = client.policy.create(base_model="Qwen3-30B-A3B", ...)
client.train.step(policy_id=policy2.id, batch_size=64)
```

The `mint-cookbook` repo ships maintained recipes for SFT (FinEval), DPO (chat pairs), GRPO (DAPO-AIME24), and LawBench AutoResearch.

## References

- Paper: [arXiv:2605.13779](https://arxiv.org/abs/2605.13779)
- Cookbook: [github.com/MindLab-Research/mint-cookbook](https://github.com/MindLab-Research/mint-cookbook)
- Related Tinker announcement (Thinking Machines Lab, 2025): [thinkingmachines.ai/blog/announcing-tinker](https://thinkingmachines.ai/blog/announcing-tinker/)

## Further Reading

- **[LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)** (Hu et al., ICLR 2022) — The original LoRA paper, whose abstraction (frozen base + low-rank adapters) is the unit this work elevates to a service-level object.
- **[QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314)** (Dettmers et al., NeurIPS 2023) — 4-bit quantized base + LoRA. Orthogonal to the adapter-only handoff but typically combined with it.
- **[Punica: Multi-Tenant LoRA Serving](https://arxiv.org/abs/2310.18547)** (Chen et al., MLSys 2024) — The first systems paper on serving many LoRAs over a shared base; introduces the GPU-kernel primitives MinT eventually layers a catalog on top of.
- **[S-LoRA: Serving Thousands of Concurrent LoRA Adapters](https://arxiv.org/abs/2311.03285)** (Sheng et al., 2023) — Thousand-scale LoRA serving. A direct ancestor of MinT's three-tier (catalog / CPU / GPU) split.
- **[Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180)** (Kwon et al., SOSP 2023) — The vLLM paper. MinT uses vLLM as the serving engine, building on its memory abstraction.
- **[Compress then Serve: Serving Thousands of LoRA Adapters with Little Overhead](https://arxiv.org/abs/2407.00066)** (Gabrielsson et al., 2024) — Adapter compression for serving. An orthogonal byte-level axis that MinT does not pursue.

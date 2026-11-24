---
layout: post
title: "[Paper Review] MemT-1.0: Towards Memory-Native Evolution"
date: 2026-11-24 11:48:31 +0900
description: "How MemT-1.0 writes fixed-size recurrent memory into the model, what it retains, and what it saves at inference time."
tags: [memory, llm, recurrent-memory, linear-attention, agentic-coding, inference]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig4-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0051-memt-1-0-towards-memory-native-evolution/
ko_url: /papers/0051-memt-1-0-towards-memory-native-evolution/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Zhiyu Li et al. (74 authors, MemTensor · NVIDIA) |
| Venue | arXiv · 2026 · CC BY-NC-SA 4.0 |
| arXiv | [2610.26825v4](https://arxiv.org/abs/2610.26825v4) |
| Code | [MemTensor/MemT-1.0](https://github.com/MemTensor/MemT-1.0) |
| Data | 20B continued pre-training tokens and 14B post-training tokens |
| <span style="white-space: nowrap">Review date</span> | 2026-11-24 |

## TL;DR

- MemT-1.0 carries past turns in fixed-size memory matrices. Every token in a turn reads the same incoming snapshot, and token-wise erase, write, and forget gates build the next snapshot at the turn boundary.
- Pro, Flash, and Nano average 53.08, 50.60, and 46.97 across 11 memory benchmarks. They lead the evaluated parametric approaches, including Temp-LoRA at 38.08. The strongest MemOS configuration, which supplies textual evidence, averages 72.08.
- At 128K tokens of BEAM history, Nano is about 1.86× faster end to end and uses about one sixty-sixth of the logical persistent state of full context under the reported setup.
- Storing retrieved coding guidance improves the fraction of tasks solved on all three runs. The fraction solved at least once improves less consistently.

## Introduction

Imagine handing a coding agent another bug in a date parser. It would be helpful if the agent remembered that a previous fix failed at a boundary and reproduced that case before editing. Keeping every old task and tool result in context gives the model direct evidence, but makes each follow-up carry a longer history. A retrieval system provides a smaller set of records, with the quality of that set depending on what the current query retrieves.

MemT-1.0 adds another route from past behavior to the current response. Selected layers of a causal language model read a persistent matrix alongside ordinary attention. After each turn, the model uses the input and generated reply to revise that matrix. The language model can then use its previous interactions in a future forward pass with only the new turn in its text context. To make this work, the authors train the memory branch to approximate what the same backbone would predict if it could still see the full history.

This setup separates the amount of history a model can process from the amount of detail it can recover. A bounded state can absorb another turn without becoming larger. Recovering a specific date, correction, or instruction from that state is a separate problem. The v4 report examines this distinction through memory benchmarks, inference and storage measurements, and an experiment in which coding agents reuse retrieved procedures.

## Key Contributions

- **A persistent attention branch.** A trajectory owns its dynamic local state. All trajectories share the backbone and the learned projections and gates that determine how to read and write that state.
- **A symmetric token-level update.** MemT-1.0 changes the erase geometry of Gated DeltaNet-2 and extends the design with Mixture-of-Storage, a dense bank of independent memory experts.
- **Distillation from a full-context teacher.** The frozen backbone reads the textual history, while the student learns to reproduce its predictions with a compressed representation of that history.
- **Separate evaluations of fidelity, cost, and behavior.** The paper measures recall quality, the cost of creating and reusing a state, and the reliability of a coding agent given procedural experience.

## Related Work / Background

### Textual evidence and parametric memory

Full-context inference keeps visible historical tokens available to attention. Reusing their prepared KV cache avoids prefilling the same history for every question, while the state and historical attention still depend on the amount of visible text. DenseRAG retrieves relevant chunks and gives their text to a language model. MemOS and Graphiti also fall into the report's textual-memory category because the answering model sees retrieved evidence.

Parametric approaches move preparation work to another representation. Temp-LoRA optimizes an adapter for a history. Doc-to-LoRA learns to generate an adapter from text. MemT-1.0 builds a recurrent matrix through a sequence of updates. These systems can answer without supplying the original history as query text, even though the operations needed to prepare that history differ substantially.

### Metis and decoupled erase and write

The predecessor Metis distinguishes between local memory, which evolves during a trajectory, and hyper memory, which is trained to operate on it. MemT-1.0 retains that division and replaces Metis's token selection with sequential updates at token granularity. Gated DeltaNet-2 supplies separate controls for erasing an existing association, writing a value, and decaying the previous state. Symmetrizing the erase operation changes the way those updates interact with the state, especially when different key dimensions receive different gate values.

## Method / Architecture

### 1. Parallel attention in selected layers

The memory branch takes the same pre-attention hidden representation as the original attention. The selected layer adds a memory contribution and passes the result through the backbone's subsequent operations. Nano augments all full-attention layers of Qwen3.6-35B-A3B. Flash adds memory to compressed sparse-attention layers of a further post-trained DeepSeek-V4-Flash. Pro adds memory to all full-attention layers of NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16. The fusion point is adapted to each backbone. In Nano, for instance, the memory output is added after the original attention's gate and before the frozen output projection.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig4-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4. Parallel attention in selected Transformer layers and the storage and readout paths of local and hyper memory"
   zoomable=true %}

Each memory channel has a matrix spanning key and value dimensions. These matrices start at zero for a new trajectory. Hyper memory contains the trained projections and gates. It is fixed online, as are the backbone weights. The dynamic matrix is part of the forward pass, so a different session history can change the output of an otherwise identical model.

### 2. Turn snapshots and token-level writes

The current turn uses causal attention and a KV cache for its local text. Its memory branch reads one incoming snapshot throughout. Once the turn is complete, the writer processes every token of the input and generated reply in order to build the next snapshot. The intermediate states within a write are computational steps. The updated memory becomes visible to the reader at the next turn.

Suppress the layer and channel indices and let $i$ index a token in the completed turn. The row vector $k\_i$ is an L2-normalized key, $v\_i$ is the projected value, and $\beta\_i$ and $\omega\_i$ are sigmoid erase and write gates. The log-decay $\lambda\_i$ is negative. Its exponent gives the diagonal factors that scale rows of the preceding matrix. Starting from the incoming $M\_0$, the writer applies the following update.

$$
\begin{aligned}
u_i &= \sqrt{\beta_i}\odot k_i,\\
D_i &= \operatorname{Diag}(\exp(\lambda_i)),\\
z_i &= \omega_i\odot v_i,\\
M_i &= (I-u_i^\top u_i)D_i M_{i-1}\\
    &\quad + u_i^\top z_i.
\end{aligned}
$$

The first term attenuates the previous state and erases part of the association in the gated key direction. The second adds a gated value in that direction. The final matrix crosses the turn boundary. Its shape stays constant as the history grows.

### 3. Non-expansive symmetric erasure

In ordinary GDN-2, the gated key measures the association to remove, and the original key sets the correction direction. When the vectors are not collinear, a vector orthogonal to the original key can acquire a key-aligned component and grow in Euclidean norm. Appendix C gives an erase-only example of that amplification.

The symmetric update uses $u\_i$ on both sides of the outer product. The component parallel to $u\_i$ is multiplied by $1-\lVert u\_i\rVert\_2^2$, and orthogonal components are unchanged. With a normalized key and gates between zero and one, the parallel direction contracts and the erase alone is non-expansive. This result describes the erase map. The usefulness of the state after many writes also depends on the values written, the decay, and the information needed by a later query.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig11-stable-erase.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 11. Unit-circle deformation and maximum directional gain under GDN-2 (left) and SGDN-2 (right) for the same erase-only input"
   zoomable=true %}

### 4. Matrix readout and dense Mixture-of-Storage

The reader projects and L2-normalizes a query from the current hidden state and multiplies it by the stored matrix. Each channel's readout is scaled by the square root of its key width.

$$
R = \frac{QM}{\sqrt{d_k}}
$$

RMSNorm and an output gate then scale the channels before concatenation. The gate uses SoftCapSiLU, which wraps a SiLU activation in a soft tanh cap with a default threshold parameter of 2. This gives the memory path its own control over the signal injected into the backbone.

Mixture-of-Storage (MoS) replicates the state and hyper-memory parameters across experts. Every expert writes every input token using its own learned projections and gates. At read time, a softmax router produces per-token weights over all experts and combines their outputs. This is dense computation. Increasing the number of experts increases both the dynamic state and the trainable memory parameters. All three models in the main tables use one expert per memory layer. The two- and four-expert variants of Nano are separate capacity experiments.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig5-memory-experts.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5. Full writes across all MoS memory experts and weighted fusion of their readouts"
   zoomable=true %}

### 5. State budgets and windowed execution

The state element count sums the product of expert count, channel count, key width, and value width over memory layers. Nano's 10 layers have 16 channels of 256×256 each, yielding 40 MiB of FP32 state per trajectory. Flash uses 20 layers with 64 channels of 512×512 for 1,280 MiB. Pro uses 12 layers with 64 channels of 128×128 for 48 MiB. These sizes follow the memory geometry, so Pro can have a larger backbone and a smaller state than Flash. A serving process also needs model weights, temporary buffers, and the current turn's KV cache.

During training, the system packs independent trajectories and runs the backbone one decoder layer at a time. The memory block preserves the order of writes within each trajectory. A chunked WY implementation groups the rank-one operations, while all queries from one turn can read their common snapshot in a batch. For MoS, the model can process the expert projections in windows of complete steps and recompute intermediates on the backward pass. A differentiable FP32 boundary state connects the windows. This changes the memory used to execute the same computation.

## Training Objectives / Loss Functions

### Next-token prediction across segment boundaries

Continued pre-training (CPT) partitions long text into consecutive non-overlapping segments and preserves the final partial segment. The student uses ordinary causal attention inside each segment and native memory for earlier segments. It learns from ground-truth next tokens with cross-entropy. Training across these boundaries gives the memory branch a reason to carry information that helps predict the next segment.

### Distillation with full-vocabulary student normalization

Post-training starts from CPT and uses a frozen teacher with the full textual history. The student sees the current question and the same response prefix as the teacher, with earlier steps represented by its memory state. Both use teacher forcing on fixed teacher-generated responses, so the distillation is off-policy with respect to the student. The teacher's softened distribution $\hat q$ is renormalized over its Top-$K$ set $\mathcal K$. The student distribution $p^{(T\_d)}$ is normalized over the full vocabulary at temperature $T\_d$.

$$
\begin{aligned}
\ell_{\mathrm{KL}}
&= T_d^2 \sum_{v\in\mathcal K}
  \hat q(v)\log\frac{\hat q(v)}{p^{(T_d)}(v)}.
\end{aligned}
$$

Assigning probability outside the teacher's support reduces the student's probability available inside it. The mask selects response tokens, and the loss averages across supervised tokens in the optimization batch. History, question, and padding tokens have no direct loss. Earlier memory writes can still learn from a later response through the state transitions. Dense MoS incurs no separate MoE load-balancing objective in this setup.

## Training Data and Pipeline

### Flash backbone preparation and the 34B-token corpus

Flash first post-trains DeepSeek-V4-Flash on general abilities, agentic coding, and agentic work. Repeated attempts identify problems the backbone solves reliably, sometimes, or never. The authors then provide potential missing conventions, procedures, or facts to diagnose failures and select supervision. The final mixture has 126.5K trajectories and 2.4B tokens, with 1.1B tokens contributing to loss. Agentic trajectories supply about 90% of those loss-bearing tokens. The reported mean gain of 6.3 points over six tracked benchmarks comes from preparation before attaching memory.

The separate memory corpus has 20B CPT tokens and 14B post-training tokens. CPT uses long, general sequential text. Post-training combines memory-conditioned language modeling, tasks such as summarization and continuation, and long-range memory tasks. Some examples follow interaction patterns from anonymized internal MemOS data. The shared layout processes context into state before asking the model to generate a response to a query.

<div class="table-responsive" markdown="1">

| Model | Backbone | Global batch | Persistent FP32 state |
|---|---|---:|---:|
| Nano | Qwen3.6-35B-A3B | 64 packs | 40 MiB |
| Flash | Further post-trained DeepSeek-V4-Flash | 192 packs | 1,280 MiB |
| Pro | NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16 | 128 packs | 48 MiB |

</div>

Packs hold up to 64K tokens and use 2K-token storage steps in the reported setups. Nano runs one CPT epoch before post-training. The reported KL recipes use Top-64 teacher targets and temperature 1. Pro runs two post-training epochs after CPT with a frozen backbone.

### Coding experiences and successful continuations

An application-specific stage starts from MemT-1.0-Nano. The authors first derive 1,040 reusable examples of procedural guidance from 41,057 successful Scale-SWE trajectories. A second pipeline resumes failed Qwen trajectories at breakpoints with retrieved experience and keeps continuations that pass executable tests. It evaluates 199,500 interventions, finds 45,481 successful continuations, and retains 42,403 training samples after filtering. Training and validation are split by task.

The student writes the experience, replays the original prefix with reading disabled, and turns on memory readout at the breakpoint. Supervision applies to later assistant tokens in the successful continuation. The frozen teacher can read the experience as text. Table 6 uses a distilled checkpoint with supervision over the full suffix. The development experiments also compare cross-entropy and shorter supervision scopes.

## Experimental Results

### Memory scores across 11 benchmarks

The memory evaluation processes each history in chronological order, isolates trajectories, and queries the accumulated state. In PersonaMem, questions at the same history cutoff share a read-only state. Labels and reference evidence are reserved for scoring. The reported average aggregates 11 benchmark scores, some with different denominators or internal metrics. ImplicitMemBench, for instance, combines two first-try accuracies with a priming influence score.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/tab3-memory-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3. Textual and parametric memory scores on 11 benchmarks grouped by history length"
   zoomable=true %}

Pro leads the parametric group at 53.08, followed by Flash at 50.60 and Nano at 46.97. Temp-LoRA, the strongest non-MemT parametric entry, averages 38.08. The family shows distinct strengths. Flash reaches 49.21 on ImplicitMemBench and 37.20 on LongMemEval-S, while Pro leads the family on PerMemSafe with 52.80 and on BEAM-1M with 41.80.

The best textual systems have a substantial advantage on long histories. MemOS with Nemotron averages 72.08 and scores 77.76 on BEAM-1M. MemOS with DeepSeek scores 83.20 on LongMemEval-S. Some Graphiti configurations are closer to MemT's aggregate range, and individual tasks such as PS-Bench favor Pro. The evidence therefore supports a competitive internal-memory design with a substantial fidelity gap against the strongest systems that return explicit evidence.

### General capabilities under distracting history

The noise evaluation prepends unrelated demonstrations to the backbone input and writes the same demonstrations into an initially empty MemT state. The reference for each reported difference is the corresponding noisy backbone. Across six general benchmarks, Pro changes by −0.11 percentage points, Flash by 0.0, and Nano by −0.9. Task-level differences are larger. Pro loses 5.17 points on LongBench v2, and Nano loses 5.8 on LiveCodeBench v6 while gaining 2.0 on BigCodeBench-Hard. A small average difference can coexist with a regression on a workload that matters.

### Preparation cost, query latency, and persistent storage

The efficiency test uses 35 BEAM histories, a shared 512-token query, and exactly 128 generated tokens. The Hugging Face runs for full context, Temp-LoRA, and Nano use two GPUs, concurrency one, and batch size one. Each history is prepared once per length, followed by one untimed query and five timed queries. End-to-end latency includes preparing the history. Query time to first token (TTFT) begins with the query, includes its prefill, and includes state restoration for Nano and full context.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig7-latency.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7. End-to-end latency (left, seconds on a log scale) and query TTFT (right, milliseconds) by history length in tokens"
   zoomable=true %}

Nano generally takes longer for short histories and draws roughly even around 32K. At 128K it takes 16.19 seconds against 30.07 for full context. At 256K the figures are 23.69 and 94.47 seconds. Nano's mean query TTFT stays around 104–112ms over the measured range. Cached full context reaches about 257ms at 128K and 445ms at 256K. The largest part of the end-to-end advantage at long lengths comes from cheaper history preparation. An application that reuses a prepared state over many queries would amortize that cost.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig8-storage.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8. Per-trajectory persistent state size (MiB on a log scale) by BEAM context length in tokens"
   zoomable=true %}

Nano holds 40 MiB per trajectory. At 128K, that is about 66 times smaller than the full-context logical state. The full-context curve stops at 256K with 5.061 GiB, the tested context limit. Temp-LoRA keeps a 172.5 MiB BF16 adapter. DenseRAG starts smaller than Nano and grows as it stores chunk texts and vectors. These are persistent-state payloads after preparation and before querying. Shared weights, the active query cache, and execution workspaces are outside the reported comparison.

### Coding reliability with retrieved experience

BGE-M3 retrieves procedures using the issue description. A harness stores guidance before the first request or after a signal such as a command failure, empty observation, or repetition. Storage happens at most once per episode. The textual condition puts the experience in a message, while the native condition encodes it into the state. That state then stays fixed for the remaining execution. The benchmark measures how the agent applies an available procedure.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig10-agentic-experience.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 10. Experience retrieval, storage before execution or on a harness trigger, and subsequent agent actions"
   zoomable=true %}

Across three independent runs per task, pass³ counts tasks solved on every run, while pass@3 counts tasks solved at least once. On 500 Verified tasks, harness-triggered Nano raises mean success from 66.07% to 69.73% and pass³ from 54.00% to 62.80% over the backbone without experience. With storage before execution, native and textual experience both reach 61.60% pass³. On 300 Multilingual tasks, textual experience leads before execution at 56.33% versus 53.67%. With harness-triggered storage, Nano reaches 55.33% pass³ versus 53.67% for text. Its pass@3 of 73.00% is below the no-experience baseline's 73.67%. The stronger signal is consistency on repeated runs. The textual baseline uses three retrieved experiences for Verified Before Execution and one in the other conditions.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/tab6-agentic-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 6. Three-run success metrics (%) on SWE-bench Verified and Multilingual by experience storage timing"
   zoomable=true %}

## Analysis / Ablation

### Token granularity and post-training

In Table 5, the Nano reference averages 47.0. Original GDN-2 scores 46.4 and GDN scores 46.7. Aggregating erase, write, and log-decay terms into one update per turn reduces the average to 41.0. A succession of writes can revise associations formed earlier in the same turn, which a mean update cannot express in the same way. Extra bidirectional encoding for the gates helps some benchmarks and brings the average down to 45.4. The geometric correction has a clear stability motivation, while update granularity has the largest observed architecture effect on aggregate accuracy.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/tab5-ablations.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5. Nano benchmark scores and mean differences across architecture and training ablations"
   zoomable=true %}

CPT alone reaches 36.3, and skipping CPT while retaining post-training reaches 44.9. The full recipe reaches 47.0. Figure 6 follows a separate sequence of checkpoints across two passes over the same post-training corpus, rising from 36.65 to 45.40 after one epoch and 46.80 at the final sampled checkpoint. This curve measures repeated exposure and additional optimization on the same data.

### Expert capacity and peak allocation

The one-, two-, and four-expert Nano configurations average 46.97, 47.50, and 48.11. Four experts lead on eight of eleven benchmarks. PersonaMem improves from 50.08 to 54.33 between two and four experts, while ImplicitMemBench falls from 50.01 to 45.65. Increasing expert count changes both the size of stored state and the trainable memory operators.

Windowing addresses the execution cost. In the paper's synthetic 32K-token, single-GPU benchmark of one four-expert block, the two-step window reduces median peak allocation from 47.83 to 9.49 GiB and raises median forward-plus-backward time from 463.0 to 470.6ms. The one-step window reduces allocation further to 6.03 GiB with a 6.6% time increase. This measures the working set of the memory block rather than the end-to-end cost of training the entire model.

### Rank retention and task-dependent saturation

The authors also apply SVD after every write and reconstruct Nano's dense state from the retained factors. LoCoMo generally improves through full rank. PersonaMem plateaus earlier. The storage axis in Figure 9 describes theoretical factor storage, while the experiment uses reconstructed dense states. There is no measured serving throughput gain from factorized storage in this experiment.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig9-low-rank.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9. Accuracy (left axes) and theoretical factor storage (right axes, MiB) by rank on LoCoMo and PersonaMem"
   zoomable=true %}

## Limitations and Critical Assessment

### Historical fidelity and access to evidence

A fixed matrix has limited room for exact details as more interactions arrive. The gaps on LongMemEval-S and BEAM-1M matter when a user wants an older date, an exact statement, or the evidence behind a correction. Appendix examples illustrate successful memories under different history lengths. They leave open how to audit the support for individual answers or verify that a particular obsolete fact has been removed. Textual retrieval remains valuable when the application needs inspectable evidence.

### Benchmark mix and deployment cost

The benchmark suite changes task types across its history-length groups, so comparing group scores does not isolate the effect of length. The single-request efficiency test also leaves production questions about concurrent requests, storing states off GPU, and managing many sessions. Flash's persistent state is much larger than Nano's, and the measured Nano speedups are specific to its tested runtime and workload.

### External experience and autonomous improvement

The coding harness uses a curated bank, issue-level retrieval, and fixed injection rules. The model can apply experience in its forward pass, but the setup holds the stored state fixed after injection and does not update the shared memory weights during an episode. The authors also tune configurations on a 100-task Verified development subset before reporting on full Verified. Stronger evidence of autonomous improvement would require learning which experiences to acquire, how to revise them, and whether the resulting changes generalize to new tasks without relying on an externally assembled bank.

## Takeaways

- History length and memory fidelity are distinct. The cost of another turn can stay bounded while the details needed for a particular future question become harder to recover.
- Reading the same incoming snapshot makes the design compatible with batched reads. Token-level writes preserve update order and give the clearest architectural gain in the reported ablation.
- Measure preparation, access, and storage separately. One configuration can be cheap to query after expensive preparation, and the overall tradeoff changes when many queries reuse a state.
- Procedural experience improved three-run reliability more consistently than best-of-three coverage. The distinction matters when choosing how an agent should retry a task.

## Installation and Usage

The upstream SGLang example uses Linux with NVIDIA CUDA and Python 3.11 or later. Place the [Nano BF16 checkpoint](https://huggingface.co/MemTensor/MemT-1.0-Nano) at a local path. The sample launcher uses two GPUs with tensor parallelism, and the server extra specifies the runtime dependencies.

```bash
git clone https://github.com/MemTensor/MemT-1.0.git
cd MemT-1.0
git checkout 4b08b5d54072b80221f22c912a0d560e02847295
uv venv --python 3.11
source .venv/bin/activate
cd inference
uv pip install '.[server]'
sh start_memt_nano.sh /models/MemT-1.0-Nano
```

Once the server is ready, activate the same virtual environment in another terminal and run the following command from the repository's inference directory. The client uses 127.0.0.1:30000 by default.

```bash
python examples/commit_history.py /models/MemT-1.0-Nano
```

The example uses MemTSession to chat and commit_history to write the dialogue into persistent state. The path returned by save_state can initialize a new session. The pinned launcher configuration and example syntax were checked.

## References

- [MemT-1.0 paper, v4](https://arxiv.org/abs/2610.26825v4)
- [Official code](https://github.com/MemTensor/MemT-1.0)
- [Nano, Flash, and Pro checkpoints](https://huggingface.co/collections/MemTensor/memt-10)
- Figure and table images are from Zhiyu Li et al., [MemT-1.0 v4](https://arxiv.org/abs/2610.26825v4), under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Individual figures and tables are presented separately from the original pages.

## Further Reading

- **[Metis: Memory Foundation Model](https://arxiv.org/abs/2607.26760)** (Zhang et al., 2026): The predecessor that separates local memory from learned hyper memory.
- **[Gated DeltaNet-2: Decoupling Erase and Write in Linear Attention](https://arxiv.org/abs/2605.22791)** (Hatamizadeh et al., 2026): The gated recurrence that separates key-side erasure from value-side writes.
- **[Doc-to-LoRA: Learning to Instantly Internalize Contexts](https://arxiv.org/abs/2602.15902)** (Charakorn et al., 2026): A learned mapping from a document to a LoRA adapter for later questions.
- **[LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory](https://arxiv.org/abs/2410.10813)** (Wu et al., 2024): A benchmark for cross-session reasoning, temporal knowledge, updates, and abstention.

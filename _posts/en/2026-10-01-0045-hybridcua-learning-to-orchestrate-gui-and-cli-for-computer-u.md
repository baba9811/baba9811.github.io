---
layout: post
title: "[Paper Review] HybridCUA: Learning to Orchestrate GUI and CLI for Computer-Use Agents"
date: 2026-10-01 09:06:31 +0900
description: "Learning GUI and CLI orchestration through mixed trajectories, task-level interface rewards, and local command-execution penalties"
tags: [computer-use, gui-agents, command-line, reinforcement-learning, multimodal, agent-training]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig3-pipeline.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/
ko_url: /papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Tongbo Chen et al. (11 authors, Zhejiang University · Peking University · Tsinghua University) |
| Venue | arXiv · 2026 |
| arXiv | [2609.38008](https://arxiv.org/abs/2609.38008) |
| Code | [ZJU-REAL/HybridCUA](https://github.com/ZJU-REAL/HybridCUA) |
| Data | HybridCUA-8K: 5,023 SFT trajectories and 3,000 verified RL tasks |
| <span style="white-space: nowrap">Review date</span> | 2026-10-01 |

## TL;DR

- **Shell access requires a learned execution strategy.** Giving Qwen3.5-9B both GUI and CLI access drops OSWorld Acc. from 38.8% to 18.4%. Mixed SFT followed by CLI-aware RL raises it to 53.6%.
- **Three demonstration types share one action grammar.** GUI-only, CLI-only, and interleaved trajectories all use a `bash` wrapper, containing either direct commands or PyAutoGUI operations.
- **Routing and execution receive different supervision.** A success-gated trajectory reward checks task-specific CLI preference; a local penalty targets the action tokens responsible for shell execution failures.
- **Better scores accompany shorter interaction sequences.** HybridCUA-9B averages 14.0 steps and scores 47.1% on OSWorld-MCP and 36.0% on WindowsAgentArena. Acc. includes partial evaluator credit; average steps include both successful and failed tasks.

## Introduction

Changing document formatting can require a sequence of selections, menus, and text fields. A short program can instead edit the document's underlying attributes. These are alternative routes to the same goal, but they present a computer-use agent with different observations, failure modes, and action granularity. GUI interaction reaches many applications through a common visual interface. Programmatic access can compress repetitive work, provided the agent understands which files and commands represent the relevant state.

Application-specific tools bridge that gap, but their coverage must grow with each application and feature. Chen et al.'s [HybridCUA](https://arxiv.org/abs/2609.38008) uses the operating system's command line as a broadly available execution channel. Its central problem is deciding when a shell operation is appropriate and how to execute it reliably. Coding competence alone does not establish either ability within an ongoing visual workflow.

This review follows arXiv v1, including its appendices. The useful distinction throughout is between fewer interactions and better execution. An untrained agent with CLI access takes fewer steps while losing substantial accuracy. HybridCUA aims to improve both quantities through demonstrations of hybrid behavior and rewards that distinguish interface choice from command reliability.

## Key Contributions

- **A reusable construction pipeline:** conversion of existing GUI demonstrations, successful CLI rollouts, and interleaved trajectories collected directly or obtained through replay-verified rewriting.
- **Verified tasks with interface-preference labels:** comparison of GUI-only, CLI-only, and hybrid rollouts to identify tasks with a CLI execution advantage.
- **Two levels of credit assignment:** trajectory-level supervision for successful interface selection and action-local penalties for shell execution failures.
- **Separate tests of data, rewards, and representation:** modality ablations, reward removal, a unified-versus-separate action-schema comparison, and transfer across interface configurations and operating systems.

## Related Work / Background

### Visual grounding and programmatic execution

GUI grounding connects an intended operation to a location on the screen. A misplaced click changes the state assumed by subsequent actions, making long sequences vulnerable to cascading errors. File manipulation and repeated edits often have concise programmatic equivalents. Spatial layout, visual selection, and transient application state can still require a screen-based feedback loop.

[OSWorld](https://arxiv.org/abs/2404.07972) evaluates tasks by executing them in real computer environments and checking resulting states. [ToolCUA](https://arxiv.org/abs/2605.12481) studies routing between GUI actions and higher-level tools. Hybrid computer use therefore predates this paper. HybridCUA focuses on a direct shell channel and explicitly separates learning to select that channel from learning to issue executable commands.

### Verifiable outcomes and intermediate credit

RL with verifiable rewards, or RLVR, uses executable task evaluators. [CUA-Gym](https://arxiv.org/abs/2605.25624) scales this supervision by generating instructions, environment states, and reward functions together. Final outcome rewards are useful, but they do not fully explain the quality of the path.

An agent can issue several failing commands and eventually complete the task through the GUI. Another can avoid the shell and succeed through a long sequence of clicks. Outcome-only supervision may treat both as successful without distinguishing the wasted commands or interface choice. HybridCUA supplies two additional signals rather than expecting one final score to identify both problems.

## Method / Architecture Details

### 1. Screenshots and preceding command output

The agent observes the current screenshot and the stdout/stderr of the preceding direct CLI action, if one occurred:

$$
o_t = (I_t, \widetilde{y}_{t-1}).
$$

Instructions and preceding interactions provide context. A screenshot reveals visible application state; command output exposes information such as saved settings and file contents. These channels are complementary, particularly when the visible application and its backing files can disagree.

Importantly, CLI-only trajectories restrict the **action interface**, not the observation modality. They can still contain screenshots. They are not demonstrations from a purely textual terminal environment transplanted into a GUI task without visual context.

### 2. A unified bash action with distinct interface semantics

All executable interactions use `bash(command, timeout)`. Its command can be a direct shell operation or a quoted Python heredoc containing PyAutoGUI calls. Separate `wait`, `terminate`, and `answer` controls handle stabilization and episode completion. A model's declaration of success is separate from the verifier's assessment.

The wrapper does not turn a click into a CLI operation. PyAutoGUI manipulation remains GUI behavior even when serialized through `bash`; direct shell or application-CLI operations count as CLI behavior. Appendix B makes this distinction explicit. Counting every wrapped action as CLI would misrepresent the learned policy.

One call can contain multiple GUI operations or combine GUI state handling with file inspection. This common grammar lets the policy change interaction level without switching tool syntaxes. It also changes the granularity of a step: fewer environment interactions need not imply proportionally less wall-clock time or computation.

### 3. GUI-only, CLI-only, and interleaved demonstrations

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig3-pipeline.png" class="img-fluid rounded z-depth-1" caption="Figure 3: (a) Three trajectory types and verified RL task construction, (b) mixed supervised fine-tuning, and (c) online RL with CLI-aware rewards." zoomable=true %}

GUI-only data comes from [UI-MOPD](https://arxiv.org/abs/2607.04425). Clicks, drags, scrolling, shortcuts, and text entry become equivalent PyAutoGUI code. Visual grounding uses a shared 1000×1000 coordinate space, with predictions mapped to display coordinates at execution. The interaction is preserved while its serialization changes.

For CLI-only data, Qwen3.8-27B solves CUA-Gym tasks through a Claude Code harness with CLI access and application-specific skills distilled from documentation and reference code. Successful rollouts are retained. These skills help the teacher collect data; Appendix G.3 states that they are absent from student SFT contexts, RL rollouts, and evaluation prompts. The reported student is not receiving those manuals at test time.

Interleaved trajectories have two sources. The teacher can choose freely between GUI and CLI during execution. Alternatively, terminal-command typing in a teacher-generated GUI trajectory is rewritten into direct CLI calls. Commands fragmented across several typing actions are reconstructed first; terminal-opening and submission actions are removed while genuine GUI operations and ordinary text input remain.

Every rewritten trajectory is replayed, and only successful replays survive. Equivalent commands do not guarantee equivalent subsequent application state. Removing a terminal window can change focus, and direct file edits can disagree with an open buffer. Replay tests whether the compressed sequence still supports the complete task rather than merely producing a plausible command.

### 4. Rollout comparisons and CLI-advantage labels

Task construction produces instructions, initial states, assets, and executable verifiers. Retention requires an executable verifier and a reachable target state, yielding 3,000 tasks across 11 domains. Application interface guides help the generator distinguish operations suited to CLI access from those favoring the GUI.

Qwen3.8-27B then generates 16 rollouts per task under each of GUI-only, CLI-only, and hybrid access. Modes are ranked by success rate. Differences within five percentage points are resolved using the median length of successful rollouts; remaining ties prefer a single-interface mode and then GUI-only.

The binary label is 1 when CLI-only ranks first, or when hybrid ranks first and more than half its successful rollouts contain a direct CLI command. Otherwise it is 0. Labeling removes no tasks. Keeping label-0 tasks is necessary to learn when CLI use is unnecessary. This is a task-level preference, however, not a state-by-state oracle for every possible interface switch.

### 5. Cross-step switching and within-step cooperation

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig7-writer-cooperation.png" class="img-fluid rounded z-depth-1" caption="Figure 7: Writer GUI interaction at step 7, document editing at step 10, and combined GUI state handling and saved-file verification at step 13." zoomable=true %}

The essay task requests 12-point text and 1.0, 2.0, and 1.5 line spacing for introduction, body, and conclusion. Step 7 focuses Writer and opens its menu through the GUI. Step 10 uses `python-docx` to edit and save the document. The interfaces operate at different levels of the same task.

Step 13 combines them inside one call: PyAutoGUI dismisses the menu, then code reopens the saved document and checks font size and spacing. Hybrid cooperation need not consist of alternating tools at every turn. It can compose operations within one environment interaction. File-attribute verification still establishes something different from inspecting the rendered document's appearance.

## Training Objectives / Loss Functions

### Supervised responses and success-gated interface rewards

SFT predicts agent responses conditioned on instructions and interaction history. In the step-level implementation, only the final assistant turn of each prefix contributes to the loss; preceding turns remain as masked context. The three data types jointly demonstrate GUI control, command generation, and switching.

RL adds a CLI preference reward to the binary task-outcome reward. Let b indicate whether a rollout contains at least one direct CLI command, and let the starred b be its task label:

$$
\begin{aligned}
R_{\mathrm{CLI}}(\tau)
&= \mathbf{1}[\mathrm{Success}(\tau)]\,
   \mathbf{1}[b(\tau)=b^{\star}], \\
R(\tau)&=R_{\mathrm{acc}}+0.1R_{\mathrm{CLI}}(\tau).
\end{aligned}
$$

Failure receives no preference bonus. Among successful trajectories, label 1 favors some direct CLI use; label 0 favors its absence. This does not award each command or explicitly minimize length. For label-1 tasks, one command already satisfies the usage condition. Efficiency gains must therefore be demonstrated empirically rather than assumed from the equation.

### Local penalties for shell execution failures

$$
r_t^{\mathrm{exec}}=
\begin{cases}
-1,&\text{shell-level execution failure},\\
0,&\text{otherwise}.
\end{cases}
$$

Non-CLI steps receive zero. A failed command can be penalized even if the task later succeeds. Conversely, a command that executes normally can still modify the wrong file or produce the wrong result. This signal addresses executability; semantic correctness continues to depend on task evaluation.

### Group-relative advantages and action-token credit

$$
\begin{aligned}
\widehat{A}_{t,j}
&=\frac{R(\tau)-\mu_G}{\sigma_G+\epsilon}
  +0.3r_t^{\mathrm{exec}},\\
&\hspace{1em}j\in\mathrm{Tok}(a_t).
\end{aligned}
$$

The execution term is added **after** normalizing trajectory rewards within a GRPO group and applies to the responsible action's tokens. Summing all execution failures into the trajectory reward before normalization would implement a different rule.

Appendix D describes computing group statistics after deduplicating step samples by trajectory, preventing long trajectories from being counted repeatedly. Groups with effectively identical combined trajectory rewards are filtered before normalization; that filtering excludes the later execution term. The order of these operations matters for reproducing the learning signal.

## Training Data and Pipeline

### Data units and HybridCUA-8K composition

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig8-data-composition.png" class="img-fluid rounded z-depth-1" caption="Figure 8: (a) SFT application domains and within-domain modalities, (b) trajectory counts by modality, and (c) modality-stacked logical-step distributions." zoomable=true %}

HybridCUA-8K combines two data units: 5,023 recorded SFT executions and 3,000 verified RL task definitions from which multiple rollouts can be sampled. It is not a corpus of 8,000 equivalent demonstrations. Figure 8 reports 870 GUI-only, 3,155 CLI-only, and 998 hybrid trajectories. The 62.8% CLI-only share describes the training corpus, not the final model's executable-step share.

Trajectories average 10.4 logical steps, with median 7, 90th percentile 22, and maximum 50. Impress, Writer, Calc, and multi-app tasks contribute 866, 818, 811, and 786 trajectories. Independent single-interface demonstrations form a substantial part of the training signal; the hybrid name does not mean every example contains switching.

### Prefix construction and online training configuration

| Setting | SFT | Online RL |
|---------|-----|-----------|
| Initialization | Qwen3.5-9B | Mixed SFT checkpoint |
| Data | 46,876 filtered step samples from 5,023 trajectories | 1,000 tasks sampled from the 3,000-task verified pool |
| Training scale | 2 epochs, 366 optimizer updates | 8 rollouts per prompt; nominal batch of 8 groups / 64 trajectories |
| Learning rate | 0.00001, cosine, 10% warm-up | 0.000001, constant |
| Hardware | 16 NVIDIA H20 GPUs | 24 H20 GPUs: 16 training / 8 inference |
| Stack | verl / Megatron-LM | slime / Megatron-LM / SGLang |
| Environment limit | Source trajectories up to 50 steps | 30 training steps / 50 evaluation steps |

Expanding trajectories at each decision yields 52,227 samples; the 12,000-token limit leaves 46,876. SFT retains the current screenshot at 2,040 visual tokens and two downsampled historical frames at 510 each, for at most 3,060 visual tokens. Older images become placeholders, with action history limited to 30 steps.

RL also retains at most three screenshots, but only the latest three steps have full textual history; earlier steps become one-line summaries. CLI output is limited to 1,000 characters per step. Equal shell access therefore does not imply equal observation history or information retention.

Rollout and optimization are asynchronous. Groups are discarded when their oldest generating policy is more than two optimizer updates behind the current policy. Lifecycle-aborted trajectories are excluded from gradients, while executor-returned in-VM command failures remain eligible for training. Removing those failed actions would undermine the local execution penalty.

## Experimental Results

### OSWorld scores and all-task interaction counts

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/tab1-osworld.png" class="img-fluid rounded z-depth-1" caption="Table 1: OSWorld action spaces, Acc. (%), and all-task average steps for base, SFT, and RL configurations." zoomable=true %}

Evaluation uses 361 OSWorld tasks and a 50-step budget. Appendix E defines Acc. as mean evaluator score expressed as a percentage. Most verifiers are binary, but some return partial credit that is averaged without thresholding. Thus 53.6% is not necessarily the fraction of completely solved tasks. Comparisons below use the paper's reported aggregation.

| Configuration | GUI: Acc. / average steps | GUI+CLI: Acc. / average steps |
|---------------|---------------------------|-------------------------------|
| Qwen3.5-9B base | 38.8% / 31.6 | 18.4% / 22.1 |
| After SFT | 44.2% / 26.3 | 46.0% / 19.8 |
| After SFT + RL | 50.4% / 22.1 | 53.6% / 14.0 |

The final hybrid model improves by 14.8 percentage points over the GUI base and 3.2 points over the GUI branch after both training stages. The branches share a base model, comparable SFT corpora, and identical RLVR tasks and RL steps. This comparison is more informative about the additional interface than a trained-versus-untrained comparison alone.

Average steps include every task, failures, waits, and termination; a budget-exhausting task contributes 50. The untrained hybrid base saves 9.5 steps while losing 20.4 points, illustrating why a short failure is not efficient task completion. The trained model improves both reported quantities, although neither column measures latency or token cost directly.

### Comparable model sizes and GUI–API baselines

HybridCUA-9B scores 53.6%, versus 48.9% for AutoGLM-OS-9B and 46.8% for ToolCUA-8B: gains of 4.7 and 6.8 points. Its 14.0 steps are 0.9 below ToolCUA's 14.9. UltraCUA-32B scores 43.7%. However, EvoCUA-32B scores 56.7% in the same table. The appropriate claim concerns comparable model sizes, not superiority over every listed model.

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig2-cli-gap.png" class="img-fluid rounded z-depth-1" caption="Figure 2: (a) OSWorld Acc. (%) before and after CLI access for existing agents and trained HybridCUA, and (b) direct CLI executable-step shares (%)." zoomable=true %}

Figure 2 shows that shell access can hurt larger models too. Qwen3.5-27B uses CLI for 15.0% of steps, EvoCUA-32B for 0.15%, and HybridCUA for 64.0%. Other CLI-heavy baselines still lose accuracy. Frequency alone therefore does not explain successful orchestration, nor does this figure prescribe maximizing CLI use in every domain.

### Interface transfer and Windows generalization

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/tab3-transfer.png" class="img-fluid rounded z-depth-1" caption="Table 3: Evaluation scores (%) on OSWorld-MCP and WindowsAgentArena across GUI, GUI+API, and GUI+CLI configurations." zoomable=true %}

OSWorld-MCP yields 47.1%, versus 38.0% for Qwen3.5-9B and 46.8% for ToolCUA. WindowsAgentArena yields 36.0%, versus 32.0% and 33.8% respectively. Issuing PowerShell commands after Linux-shell training suggests transfer beyond copying Linux commands, although it does not isolate exactly which learned ability transfers.

These tests change different aspects of the environment. OSWorld-MCP reuses the same 361 OSWorld tasks with an MCP-enabled configuration; it is not an unseen-task benchmark. WindowsAgentArena changes operating systems and evaluates 154 tasks. MCP availability also does not establish identical tools for every model. The paper treats interface access as part of evaluation configuration and reports the two transfer scores separately.

## Analysis / Ablation

### Mixed demonstrations and the shared action grammar

Table 2 reports CLI-only SFT at 31.7% and 19.1 steps, GUI-only at 43.2% and 29.5, and hybrid-only at 41.0% and 22.6. Mixing reaches 46.0% and 19.8 steps. It costs 0.7 steps over CLI-only while gaining 14.3 points. Interleaved examples alone do not match the mix, supporting complementary supervision from independent GUI and CLI demonstrations. The 43.2% GUI-only ablation is distinct from Table 1's 44.2% GUI SFT branch.

Table 4 holds the base model and trajectories fixed while changing the SFT action schema. Separate GUI/CLI tools score 38.8% in 16.8 steps; unified `bash` scores 46.0% in 19.8. The common grammar gains 7.2 points while using three more steps. Again, shorter is not automatically better. This is a representation ablation at SFT, not a direct decomposition of the final RL result.

### Interface rewards versus execution rewards

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig4-reward-ablation.png" class="img-fluid rounded z-depth-1" caption="Figure 4: RL updates versus (a) Acc. (%), (b) average environment steps, (c) CLI executable-step share (%), and (d) CLI execution error (%); full rewards, two removal variants, and dotted SFT references." zoomable=true %}

RL raises mixed-SFT accuracy from 46.0% to 53.6% and reduces steps from 19.8 to 14.0, a 5.8-step or 29.3% reduction. Reward ablations share the SFT starting checkpoint and GRPO budget.

Removing the task-level CLI reward barely changes accuracy but limits the step reduction to 18.2%, with CLI share at 58.9% instead of 64.0%. Removing the execution reward leaves accuracy and steps nearly intact, yet execution errors reach 16.5% at update 120 instead of the full model's 11.5%. Final task scores alone would hide that reliability difference.

CLI share pools executable steps across rollouts and excludes control actions; it is not an equally weighted average of per-task shares. Execution error divides failing direct CLI steps by all direct CLI steps. Neither 64.0% nor 11.5% is a task-level proportion of CLI-only tasks or failed tasks. The aggregation units must remain aligned with what each reward targets.

### Domain preferences, operation types, and verification

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig5-domain-routing.png" class="img-fluid rounded z-depth-1" caption="Figure 5: (a) Domain-level scores and changes, and (b) GUI/CLI executable-step shares (%) on OSWorld; 84% CLI for OS and 74% GUI for Chrome." zoomable=true %}

OS operations use CLI for 84% of steps, while Chrome uses GUI for 74%. Direct file and system access fits the former; rendered-page interaction fits the latter. The domain comparison also shows Thunderbird declining from 66.7% to 57.1%. Aggregate improvement does not guarantee improvement in every application, and the figure alone does not identify the cause of this regression.

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig6-operation-routing.png" class="img-fluid rounded z-depth-1" caption="Figure 6: GUI/CLI step shares (%) for information gathering, content editing, spatial adjustment, and result verification; 85.8% CLI for editing, 98.4% CLI for verification, and 58.4% GUI for spatial adjustment." zoomable=true %}

Content editing is 85.8% CLI and result verification 98.4% CLI. Spatial adjustment is 58.4% GUI; information gathering is 63.9% GUI. These observations suggest routing by operation requirements as well as application identity. They do not demonstrate that forcing those proportions would reproduce the same performance.

The appendix's VLC case illustrates adaptive fallback. After unproductive GUI preference exploration, the agent edits `vlcrc` from a 125% maximum-volume setting to 200% and reads it back. The evaluator relaunches VLC and awards 1.0; the rollout itself does not display the updated volume control. Command output, visible state, and evaluator checks establish different pieces of evidence.

## Limitations and Critical Assessment

### CLI availability and application-state consistency

The authors identify CLI availability and stability as a primary limit. Applications without usable command interfaces, restricted shells, and operating-system-specific semantics can require different routing. A common shell wrapper does not standardize application file formats or remove the effort of understanding documentation for teacher skills.

A further practical concern is consistency between saved files and open application buffers. Replay filters some construction failures but is not a general synchronization protocol for new workflows. Correct read-back can coexist with a stale GUI buffer that later overwrites the file. This is an implementation concern inferred from hybrid execution, rather than a measured failure rate in the paper.

### Coarse preference labels and incomplete verification

Task labels depend on teacher performance and 16 rollouts per mode. They do not identify the optimal interface at each intermediate state. The “at least one CLI command” condition cannot distinguish every unnecessary call or switch. Local execution penalties likewise miss commands that run successfully while doing the wrong thing.

Verifier coverage remains separate from executability. In the terminal-screenshot case, the evaluator looks for `ls` or an OCR variant rather than checking every directory entry. Its 1.0 score does not certify every conceivable visual requirement. Having a deterministic reward and having a complete specification of the user's intent are different properties.

### Single-run evaluation and step-based efficiency

Each model/benchmark result comes from one evaluation run, without reported run-to-run intervals. OSWorld-MCP's 0.3-point margin over ToolCUA should therefore not be read as a robust ranking. It also reuses existing tasks, while the Windows test does not cover every permission setting, application, or long workflow. The authors acknowledge the dataset's concentration on OSWorld-style applications.

Steps are useful interaction counts, not a complete latency or cost measure. A long program inside one action can reduce calls while increasing execution and verification work. Experiments use resettable VMs without real accounts or credentials; real deployment behavior and safety are outside their scope. The results establish the value of hybrid training in these environments, not readiness for unrestricted automation of real user systems.

## Takeaways

- **Teach tools in their execution context.** Coding ability and shell routing within visual workflows should not be assumed equivalent.
- **Track selection and reliability separately.** Similar final scores can conceal substantially different command error rates.
- **Treat action representation as part of learning.** A shared grammar and single-interface demonstrations have measurable effects alongside interleaved examples.
- **Keep efficiency units explicit.** Short failures, all-task averages, and multiple internal operations per step change the interpretation of a step reduction.
- **Combine verification channels.** File read-back and visual inspection expose different states; connecting them is itself an important agent capability.

## Installation and Usage

As of October 1, 2026, the official repository publishes infrastructure and training code, while its README marks HybridCUA-9B weights as `coming soon`. A ready-made public-checkpoint inference example would be premature. Installation targets a GPU training node with CUDA tooling and Python 3.12. The actual script requires `VENV` and `BASE_DIR` beyond the README's short command:

```bash
git clone https://github.com/ZJU-REAL/HybridCUA.git
cd HybridCUA
HYBRID_ROOT="$(pwd)"
VENV="$HYBRID_ROOT/venvs/online-rl" \
BASE_DIR="$HYBRID_ROOT/online-rl" \
PYBIN="$(command -v python3.12)" \
BACKGROUND=0 bash online-rl/install_env.sh
```

Training additionally needs an environment server, an SFT checkpoint, and configured tasks. The released entry is `online-rl/gui-rl/scripts/HybridCUA-9B_16gpu_fully_async.sh`, using `HF_CKPT`, `GUI_ENV_SERVER_URL`, and `WANDB_API_KEY`. Its 16-GPU configuration is distinct from the paper's 24-GPU setup. Paths and preparation commands were checked against released code; installation, training, and inference were not run for this review. Server setup follows the [environment infrastructure documentation](https://github.com/ZJU-REAL/HybridCUA/blob/main/env_infra/README.md).

## References

- [HybridCUA paper](https://arxiv.org/abs/2609.38008): arXiv v1, main text and Appendices A–G; original figures and tables by Chen et al. The paper's [arXiv non-exclusive distribution license](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html) is distinct from CC BY.
- [Official repository](https://github.com/ZJU-REAL/HybridCUA): Apache-2.0 infrastructure and training implementation.
- [Project page](https://zjureal.com/HybridCUA/): method, evaluations, and trajectory examples.
- [Official data collection link](https://huggingface.co/collections/077lukamagic/hybridcua): the resource location linked by the repository README.

## Further Reading

- **[OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments](https://arxiv.org/abs/2404.07972)** (Xie et al., 2024): Real computer environments linking task setup, execution, and result evaluation.
- **[CUA-Gym: Scaling Verifiable Training Environments and Tasks for Computer-Use Agents](https://arxiv.org/abs/2605.25624)** (Wang et al., 2026): Joint synthesis of instructions, environment states, and executable verifiers for computer-use RLVR.
- **[ToolCUA: Towards Optimal GUI-Tool Path Orchestration for Computer Use Agents](https://arxiv.org/abs/2605.12481)** (Hu et al., 2026): Learning execution paths across GUI interactions and higher-level tools.
- **[UI-MOPD: Multi-Platform On-Policy Distillation for Unified GUI Agents](https://arxiv.org/abs/2607.04425)** (Lian et al., 2026): Platform-conditioned teacher supervision for a shared GUI policy and its trajectory resources.

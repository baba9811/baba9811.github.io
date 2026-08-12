---
layout: post
title: "[Paper Review] NVIDIA-labs OO Agents: Native Python Object-Oriented Agents"
date: 2026-08-12 14:00:00 +0900
description: "An agent is not a bundle of prompt templates, tool schemas, and workflow graphs. It is a Python object: methods are actions, fields are state, docstrings are prompts, type annotations are contracts."
tags: [llm-agents, agent-framework, code-as-action, tool-use, python, memory, benchmarks]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/fig1-agent-class.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/
ko_url: /papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Paul Furgale et al. (15 co-authors, NVIDIA) |
| Venue | arXiv preprint · 2026 |
| arXiv or DOI | [2607.20709](https://arxiv.org/abs/2607.20709) |
| Code | [nvidia-nemo/labs-OO-Agents](https://github.com/nvidia-nemo/labs-OO-Agents) |
| Data | SWE-bench Verified (500 tasks) · Terminal-Bench 2.0 (89 tasks) · CyberGym L1 · ARC-AGI-3 (25 public games) · an in-house capability suite (88 tests × 10 models × 5 runs = 4,400 records) |
| <span style="white-space: nowrap">Review date</span> | 2026-08-12 |

## TL;DR

- Agent development is split across prompt templates, tool schemas, callback code, and workflow graphs. NVIDIA's answer is NOOA (NVIDIA Object-Oriented Agents), a framework where **an agent is just a Python object**. Methods are the actions the model can take, fields are its state, docstrings are its prompts, and type annotations are contracts. A method whose body is `...` gets completed at runtime by an LLM-driven loop; a method with a real body stays deterministic Python.
- The authors distill their design into six model-facing capabilities — typed I/O, pass-by-reference, code as action, programmable loop engineering, explicit object state, and model-callable harness APIs — then score fourteen competing frameworks on those axes and argue no system yet exposes all six on a single surface.
- The numbers hold up. SWE-bench Verified 82.2% with GPT-5.5 at xhigh, Terminal-Bench 2.0 65.2% with Opus 4.6 at high, CyberGym L1 86.8% (top open-source agent). On ARC-AGI-3 they compress a six-agent multi-agent system (DreamTeam) into **one agent and one 50-line skill** and still hit 85.1% RHAE on GPT-5.6-sol for under USD 20 a game.
- Token efficiency improves alongside accuracy. On SWE-bench with GPT-5.5 xhigh, NOOA reaches 82.2% using roughly 28 model calls and 1.1M tokens per task, while PI needs 66 calls and 2.2M tokens for 78.2%. Tool outputs stay live Python values instead of being repeatedly serialized through the transcript.
- The catch: the six-capability rubric is derived from NOOA's own design, and the only controlled ablation in the whole paper is the memory subsystem.

## Introduction

It is worth pausing on what you actually learn when you learn a new agent framework. Typed interfaces, variable scoping, control flow, asynchronous execution, object state — all of these already exist in mature form in ordinary programming languages. Yet learning LangGraph means learning a graph DSL, learning Google ADK means learning a workflow DSL, and learning the OpenAI Agents SDK means learning handoffs. The same concepts, relearned under a different name and a different syntax, once per framework.

That observation is where NOOA starts. The authors name PyTorch as their explicit inspiration. What PyTorch demonstrated was that a powerful runtime can still present users with a simple Python programming model: autograd, CUDA kernel dispatch, and graph capture all run underneath, but what you write is a class inheriting `nn.Module` and a `forward` method. NOOA applies the same idea to agents. Context rendering, KV-cache optimization, event recording, type validation, and retry loops live in the runtime, and what you write is a class inheriting `Agent` plus a few methods.

There is a second half to the argument, and it is the more interesting one: it is not only developers who benefit, but **models**. LLMs already know Python classes and method calls — that material is overwhelmingly represented in their training data. A framework-specific graph DSL, by contrast, is novel syntax the model has never seen. If you express an agent as a Python object, the model should be able to operate that interface with no additional training. The authors call this **agent readiness**, and §4.1 is a direct test of the hypothesis.

What makes the paper worth reading right now is that the comparison section is unusually honest for a framework paper. Twenty-odd pages of appendix score fourteen frameworks by reading their documentation and source code against pinned commits. Read that appendix and you get a clear map of where the agent-harness ecosystem stood in mid-2026. That map is useful even if you never touch NOOA.

## Key Contributions

- **The agent-as-a-Python-object programming model.** Agents are classes, capabilities are methods, type annotations are contracts, concurrency is `asyncio`, and orchestration is ordinary Python code. Only the genuinely agent-specific concepts — context, events, state rendering, long-term memory, validated LLM loops — get exposed, and they get exposed as simple Pythonic APIs.
- **A naming of six model-facing interface capabilities.** Typed input/output, pass-by-reference over live objects, code as action, programmable loop engineering, explicit object state, and model-callable harness APIs. None of these is NOOA's invention; the contribution is naming them as a single axis set and scoring fourteen systems against it.
- **Empirical evidence that current models can operate the interface.** 10 models × 88 tests × 5 runs = 4,400 records, 97.9% passing. The interface itself is not a burden for current-generation LLMs.
- **End-to-end results on four agentic benchmarks.** SWE-bench Verified, Terminal-Bench 2.0, CyberGym L1, and ARC-AGI-3 — with the last one advancing the score–cost Pareto frontier while collapsing a multi-agent system into a single agent.
- **From a reviewer's chair, Appendices A and B are the most valuable material here.** A is a source-code-level comparison of fourteen frameworks. B reproduces four complete model traces of a single stress test, which is a rare look at *why* strong models fail at easy discipline.

## Background and Related Work

### CodeAct: code as the action modality

You need the CodeAct lineage to read this paper. Traditional tool calling has the model emit JSON, which the harness parses and dispatches to a function. CodeAct instead has the model emit **executable Python**. Tools become ordinary functions callable from inside that code, and the model gets loops, conditionals, and intermediate variables for free.

Why the difference matters: with JSON tool calls, one call means one result landing whole in the context window. Classifying a hundred items means a hundred round trips, or one enormous result. With code it is a single `for` loop, intermediate results live in variables, and only what the model chooses to `print` enters the context. NOOA's CodeActStrategy inherits this paradigm directly, then layers type-validated returns and live object references on top.

### Pass by reference: arguments that are never serialized

Most agent frameworks copy-as-text at every boundary. Inputs are serialized to text, tool call arguments are generated as text by the LLM, outputs come back as text, and that text gets parsed back into the host language. Frameworks that use files (Claude Agent SDK workspace files, Codex's `AGENTS.md`) are a variant: hand the model a path and let it explore with tools. Powerful, but every bit of type information is lost.

NOOA passes arguments as **live Python objects**. What the model sees in context is a variable name plus a bounded preview: the concrete type, the true length, and a head/tail sample. A list of a hundred integers renders as:

```text
records = list(len=100, [:5]=[42, 17, 89, 33, 8], [-5:]=[56, 71, 12, 45, 28])
```

The `records` variable itself is *not* truncated. All one hundred elements are live in the execution environment, and the model can iterate over every one of them with `for r in records:` even though only ten ever appeared in the context window. The authors note they borrowed the name and API surface of this preview from Rich's `pprint()` but changed the output format based on experimentation across open and closed models.

### The MemGPT lineage: context as an operating system

NOOA's long-term memory picks up MemGPT's framing — treat the LLM as an operating system that pages information between in-context and external memory tiers — and changes two things. First, writing a memory is a **deliberate action of the model**, not the output of a background extraction pipeline. Second, retrieval is not plain similarity search but ACT-R activation from cognitive science (relevance, recency, importance).

## Method and Architecture

### An agent is one class

It is barely an exaggeration to say Figure 1 is the whole paper. An entire customer support agent lives in one class.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/fig1-agent-class.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Implementation of a simple Agent in NOOA. A deterministic method (is_refund_eligible) coexists with two agentic methods (classify, triage) in the same class."
   zoomable=true %}

What to read here:

- `order_db: OrderDB` — object state. Model-visible, passed by reference.
- `is_refund_eligible(self, order: Order) -> bool` — an ordinary Python method with a real body. Deterministic, testable, and **callable by the model from inside generated code**.
- `classify(self, message: str) -> TicketKind` — body is `...`, decorated `@strategy(PredictStrategy())`. A single LLM call that classifies and gets its return value validated against `TicketKind`.
- `triage(self, message: str, photo: Image | None, order: Order | None) -> Ticket` — `@strategy(CodeActStrategy())`. The model runs a loop writing Python. `order` arrives as a live object rather than serialized text, and `photo` renders as a native multimodal content block.

The key point is that **the boundary is visible in the code**. A real body means deterministic work; an ellipsis means an agentic loop. This pulls prompt engineering back inside software engineering, where behavior can be tested, traced, refactored, versioned, and optimized.

### Five design principles

The paper states five principles and pairs each with the interface capabilities it materializes as.

| Principle | Statement | Capabilities |
|------|------|------|
| P1 | If a mature Python abstraction exists, adopt it rather than inventing a DSL | Loop engineering, Object state |
| P2 | Reframe agentic loops as **typed method calls**, not unstructured text exchange | Typed I/O, Pass by reference |
| P3 | Move deterministic work (rules, arithmetic, parsing, state transitions) out of the agentic loop | — |
| P4 | Unlock the model's existing Python knowledge | Code as action |
| P5 | Expose the harness as explicit APIs (context, event history) | Harness APIs |

P3 is quiet but load-bearing. LLMs are useful for semantic judgment, synthesis, and open-ended tasks; exact rules and arithmetic belong in deterministic methods. In NOOA that boundary is expressed by one piece of syntax — real body or `...`.

### Strategies: a different execution mode per method

How an agentic method executes is decided by a **strategy**, declared as a decorator. A strategy preserves the method's ordinary signature and typed boundary but controls what context is rendered, how turns are executed, and how candidate outputs are validated. Because strategies are per-method, you can point a small fast model at a classification method while the agent's default model handles the open-ended ones.

Two strategies ship built in.

1. **`PredictStrategy`** — a single-shot strategy for classification or extraction. It renders context, asks the model for a value, and validates it against the Python return type, running a local retry loop when validation fails.
2. **`CodeActStrategy`** — generalizes the same contract into an iterative Python REPL. The model may call `execute_python(...)` to compute, inspect internal state, or invoke other generation methods; the harness records the observation, re-renders updated state, and repeats until the model calls `return_result(...)` with a type-validated value.

Concurrency rules are spelled out. Within a single agent, externally initiated calls to agentic methods are serialized, so independent invocations do not interleave their turns. Nested same-agent calls follow stack discipline — the caller suspends until the callee returns, and both executions append to the same event history. Other methods and other agents run in parallel under Python's standard async/await model.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/fig2-codeact-loop.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: The CodeAct loop inside an agentic method. Render, call, execute, update — repeated until a type-validated value goes back to the caller."
   zoomable=true %}

### Context: three regions and the KV cache

NOOA splits context into three regions.

- **Static context blocks** — computed once and reused across turns. The system prompt, for instance.
- **Event history** — an append-only sequence of typed events produced by the harness: model tool calls, Python outputs, return values. Each event is a typed Python object with a unique tag, so agent code can **query** prior events rather than scanning a flat transcript.
- **Dynamic context blocks** — re-evaluated before each model call. Things whose value changes as the program runs, like a `TODO` list or selected fields on `self`.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/fig3-context-rendering.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: The ContextManager and EventManager populate the three regions before each LLM turn. Static becomes system, events become interleaved user/assistant/tool_call, dynamic becomes a trailing user message."
   zoomable=true %}

This three-region layout is **designed to maximize KV-cache reuse**. The static prefix never changes, the event history grows only by appending, and the volatile dynamic blocks sit at the tail. Updates to live state therefore do not invalidate the cached prefix, and each turn reuses most of the previous computation. That is a practically important choice — put dynamic blocks up front and you re-prefill everything, every turn.

The defaults are given concretely. The default static prefix contains a small NOOA system prompt (about 1k characters), the active strategy instructions (about 2.5k characters for CodeAct), an execution-context block showing imported types and libraries, and a concise `doc(self)` rendering of the agent API. The dynamic suffix carries compact views of live agent state via `pprint(self)`.

And all of it is a Python API available to the developer **and** the model.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/fig4-context-api.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: The Python API for context blocks and event history. set_dynamic registers an expression re-evaluated each turn; events.collapse folds execution history into a summary event."
   zoomable=true %}

### Executing Python and validating the return

When the model chooses a code action, NOOA executes the cell in a restricted, Jupyter-like session. Method arguments, the live agent as `self`, and the agent's environment (imports, methods, and constants defined in the agent's source file) are injected as locals, and `await` works directly.

The safety rails are explicit. `eval`, `exec`, `compile`, `input`, and blocking event-loop calls are rejected with specific errors. Stdout, stderr, images, returned values, locals, and exceptions are captured as structured results. Syntax errors and tracebacks come back in IPython format, including source locations and caret/source-line context, so the next LLM turn can repair the code the way a human would repair a notebook cell.

Cells can contain loops, conditionals, library calls, helper calls, and subagent invocations — which means **the model gets the same orchestration tools as the developer**. Inside a cell it can define a new `@strategy`-decorated function with an ellipsis body and fan it out over a batch with `asyncio.gather`, creating parallel subagent calls in ordinary Python.

State updates follow standard Python scoping. REPL locals are method-scoped: they persist across cells within a single CodeAct call and disappear when the method returns, so intermediate values stay local to the task. Anything reached through `self` or through library calls can have side effects that outlive the method — exactly as in an ordinary Python program.

Finally there is return validation. When the model returns a result, the harness validates it against the return annotation. Invalid results send the model an error message describing the failure and the loop continues; valid ones return to the caller and normal Python execution resumes.

### Long-term memory: the agent curates its own state

Everything above is scoped to a method call or a session. §3.7 crosses that boundary.

`MemoryManager.install(agent)` attaches a memory subsystem to an unmodified agent, and uninstalling restores the agent exactly. Following Principle 5, writing a memory is a **deliberate action of the model** rather than the output of a background extraction pipeline.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/fig5-memory-system.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: The NOOA memory system. The agent curates its own store through seven tools, a BeforeTurn hook injects associated memories into a dynamic context block, and all state lives in one SQLite file."
   zoomable=true %}

The pieces:

- **Seven model-callable tools**: `remember`, `recall`, `search`, `update_memory`, `forget`, `associate`, `deref`. They accept ordered verbal descriptors (CRITICAL … TRIVIAL) that map to numeric scores only internally — a choice made to keep the model-facing vocabulary in-distribution.
- **Two recall channels**: the agent querying the store with its tools (deliberate), and a `BeforeTurn` hook that derives a query from recent events and injects associated memories into a dynamic context block (spontaneous). Injected memories are *not* reinforced (`touch=False`), so what the harness chooses to surface does not distort the usage signal.
- **Retrieval** unions embedding and keyword candidates, ranks them by ACT-R activation — relevance, recency, importance — and propagates activation over a typed memory graph. Decay-based forgetting keeps the store bounded.
- **Asynchronous reflection** runs outside the agent loop, after a task completes or while the agent is idle: near-duplicates merged, conflicting values reconciled into a single current record with the superseded ones archived, related memories linked, importance re-scored, episodes distilled into higher-level records, and decayed memories pruned. **Pruning never removes recent memories, protected types, or open todos.**
- **One inspectable file**: the entire store is a single SQLite file, with vector indexes derived from it and interchangeable. A memory may hold typed `kind:key` references resolved against live agent state at recall time — pass by reference extended into persistence, so recall does not answer from stale copies.

The measured end-to-end effect appears in §4.4: **+11.8 RHAE points** over the identical agent using file-based notes in place of memory.

## Training Objective

There is no training objective and no loss function here. NOOA is a model-agnostic framework and trains nothing. What occupies this slot instead is the **return validation contract**.

On a CodeAct turn the model has exactly two moves:

```text
execute_python(code)  →  keep computing
return_result(v)      →  terminate the method
```

In the second case the harness checks whether $v$ satisfies the method's return annotation $T$. If $v \notin T$, an error message describing the failure goes back to the model and the loop continues. If $v \in T$, it returns to the caller.

Why this matters shows up in the trace analysis of §4.2. OpenCode stops whenever the model responds without a tool call; on Terminal-Bench, 77% of its failed GPT-5.5 trials terminate within ten steps. The model says "done" and that is the end of it. In NOOA the model must return a type-validated `TaskResult` containing evidence and a verification command. Termination becomes a programmatically validated action instead of an informal convention encoded only in the prompt — or, in the authors' framing, **type annotations treated as executable contracts**.

## Evaluation Setup

With no training, this section becomes the evaluation configuration.

| Evaluation | Setup |
|------|------|
| Capability suite | 88 test instances across 36 families. 10 models × 5 runs = 4,400 records. Most are one-to-five-turn interactions |
| Stress subset | 6 families from the suite. 50 records per row (10 models × 5 runs), 300 records total |
| SWE-bench Verified | 500 software-engineering tasks derived from real GitHub issues |
| Terminal-Bench 2.0 | 89 tasks performed through a command-line environment (installation, configuration, debugging, service operation) |
| CyberGym L1 | Find a security-relevant bug in a codebase and validate it with a proof-of-concept that reliably triggers it |
| ARC-AGI-3 | Interactive reasoning: dropped into an unknown grid game, discover mechanics, objective, and controls purely by acting |

The evaluation agent is disclosed too. SWE-bench and Terminal-Bench both use the same benchmark-agnostic agent, `BenchAgent`, which is **253 lines of ordinary Python**. It has a todo list, shell tools for command execution and file editing, and tree-sitter-based repository-navigation tools; its dynamic context carries the task description, todo-list status, context-window statistics, and the current working state of its shell and repository tools. It terminates through a typed `TaskResult` containing the identified root cause, supporting evidence, and a verification command.

The comparison harnesses are OpenCode 1.14.33 and PI v0.72.1, and all three are evaluated with the same GPT-5.5 and Claude Opus 4.6 backends at the available reasoning-effort settings.

The Table 7 framework scoring was done by reading documentation and source code against pinned snapshots (repository, commit, package version) retrieved July 7–9, 2026. Green (Supported) means the capability is **a first-class part of what the model sees**; Yellow (Partial) means it exists but mainly for the developer, or behind a tool or a file; Red (Limited) means no evidence was found. Experimental, flag-gated, or opt-in capabilities are scored on the capability itself and marked † rather than demoted.

## Results

### Capability tests: do models understand the interface?

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/tab1-2-capability-stress.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1 and Table 2: the capability suite passes 4,309/4,400 (97.9%), but narrowing to the six stress families drops it to 254/300 (84.7%)."
   zoomable=true %}

Overall pass rate is 4,309/4,400 = 97.9%. Split by scale, four small/efficient models (Claude Haiku 4.5, Gemini 3.5 Flash, Nemotron 3 Nano 30B, GPT-5.4 Mini) pass 96.0% and six large/frontier models (Claude Opus 4.8, Gemini 3.1 Pro, GLM-5.2, Kimi K2.6, Nemotron 3 Ultra, GPT-5.5) pass 99.2%. **Every model exceeds 91%, and six of ten exceed 98%.** GPT-5.5 is perfect on this suite (440/440); Gemini 3.5 Flash and GLM-5.2 miss only one test each (439/440).

The breakdown by reasoning mode is worth noting. Frontier models saturate regardless of mode (Opus 100.0/99.5, GPT-5.5 99.5/98.6, off/on). The value of reasoning, by contrast, grows monotonically as model capability falls — Ultra 93.4 → 94.1, Super-v3 83.7 → 96.4, Nano 52.5 → 84.8 — making inference-time reasoning a capability equalizer for the smaller Nemotron models.

The implication the authors draw is that **the interface itself is not a burden for current-generation LLMs**. Models know Python; they read object documentation, call methods with typed arguments, use returned values, mutate object state, and return values satisfying the type contract — despite never having been trained on this framework.

### Stress tests: where the frontier actually is

The residual failures concentrate in six stress families. The stress subset passes 254 of 300 (84.7%) compared with 97.9% overall. Large/frontier models pass 169 of 180 (93.9%) while small/efficient models pass 85 of 120 (70.8%) — **the scale gap widens from 3.2 points overall to 23 points on the stress subset.**

The hardest is `sentiment_batch` (31/50, 62%), which demands per-item bookkeeping across a large batch.

Consistency was measured too. Of the 880 (test, model) pairs, 94% pass all five runs, only three fail all five, and the rest are intermittent. The two failure modes separate cleanly by scale: **large models have no 0/5 scores at all** — every failure is intermittent, a reliability miss on a demonstrated capability. Small models show both, with 12.5% of stress pairs at 0/5 and 42% intermittent.

These are not failures to understand `self` or to call a method. They are failures of **disciplined multi-step harness use**, and Appendix B illustrates the point beautifully — more on that below.

### SWE-bench Verified and Terminal-Bench 2.0

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/tab3-4-swebench-terminalbench.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3 and Table 4: NOOA, OpenCode, and PI at matched backends and reasoning efforts. NOOA leads the open harnesses in every SWE-bench configuration."
   zoomable=true %}

On SWE-bench Verified, NOOA obtains the highest pass rate among the open harnesses in every evaluated model and reasoning configuration. With GPT-5.5 it reaches 67.2%, 78.8%, and 82.2% at off, high, and xhigh effort. At xhigh, OpenCode reaches 78.6% and PI 78.2%. With Opus 4.6, NOOA reaches 79.8% against 75.2% for OpenCode and 75.8% for PI.

The more meaningful comparison is against the original CodeAct implementation. OpenHands v3 is reported at 68.4% under Opus 4.6; NOOA improves on that by **11.4 points with the same model**. For reference, the published leaderboard SOTA at submission was 79.2%, from a specialized agent plus Opus 4.5.

On Terminal-Bench 2.0 the advantage is larger. With reasoning disabled, NOOA reaches 46.1% against 34.8% for OpenCode and 37.1% for PI. At high effort it reaches 73.0%, ahead of OpenCode by 12.3 points and PI by 4.5. PI does take the best GPT-5.5 xhigh result at 75.3% against NOOA's 73.0%. With Opus 4.6 at high effort, NOOA reaches 65.2% while OpenCode and PI reach 43.8% and 58.4%.

**The interaction with reasoning effort** is one of the sharpest observations in the paper. With reasoning disabled, NOOA leads OpenCode and PI by 8.0 and 6.4 points on SWE-bench and by 11.3 and 9.0 points on Terminal-Bench. Those margins narrow at higher effort. The authors' reading: the explicit object state, typed actions, and programmable loop behavior NOOA exposes **partly substitute for behaviors that stronger reasoning models increasingly perform themselves**. Harness design matters more the weaker your model is — a practically important conclusion.

### Token efficiency: the score–cost frontier

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/fig6-pareto.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: SWE-bench Verified score vs. per-task token cost on a log scale. Color encodes harness, marker shape encodes backend, size encodes reasoning effort; the dashed line is the Pareto frontier."
   zoomable=true %}

Crucially, the higher pass rates do not come from longer trajectories. On SWE-bench with GPT-5.5 xhigh, NOOA reaches 82.2% using approximately 28 model calls and 1.1M tokens per task. OpenCode uses a similar number of calls but roughly 1.3M tokens for 78.6%, and PI uses 66 calls and 2.2M tokens for 78.2%. **NOOA scores four points higher than PI on half the tokens and well under half the calls.**

The reason is structural. Tool outputs remain available as live Python values rather than being repeatedly serialized through the transcript. Bounded prompt previews keep NOOA well below the context limit, avoiding the lossy transcript compaction OpenCode and PI use while preserving prefix-cache reuse. This is precisely where combining code as action with pass-by-reference pays off.

There is a comparison against closed systems too. On SWE-bench Verified, Codex reaches 88.7% and Claude Code 80.8%, against NOOA's 82.2% (GPT-5.5) and 79.8% (Opus 4.6). On Terminal-Bench 2.0, NOOA's 65.2% with Opus 4.6 is comparable to the 62.9–65.4% reported for Claude Code and Terminus-2. A small benchmark-agnostic agent is competitive with specialized systems while consistently outperforming the open general-purpose harnesses in the comparison.

### CyberGym L1

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/tab5-cybergym.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5: vulnerability discovery on CyberGym L1. NOOA's 86.8% is the top open-source result and beats most closed systems."
   zoomable=true %}

The CyberGym agent runs in the trial container as a CodeAct agent with shell and todo-manager tools. It reads the task description, investigates the mounted source, writes a PoC, and submits it through the CyberGym submission interface. A deterministic layer around the model keeps the important scoring mechanics out of the prompt loop: a submission method sends the authored proof-of-concept and processes the benchmark response, a lightweight judge checks that the model's summary still matches the described vulnerability before accepting, and accepted submissions are re-submitted a few times to reject non-deterministic crashes. **No domain knowledge is included beyond this** — the claim is that performance comes from agent architecture rather than cybersecurity steering.

NOOA scores 86.8%, third behind Microsoft MDASHv2 (95.6%) and Crystalline (89.6%), and **first among open-source agents**. Compare OpenAI Codex plus a submission skill at 83.5% and plain Codex at 64.9%.

The authors note that network access affects performance and describe a rigorous rule-based "cheat check" over agent trajectories, ensuring NOOA's results rest only on information the agent processes and induces directly from the problem setup rather than looking up disclosed vulnerabilities or the benchmark itself online. Worth noting that NOOA ran under `blocked` network conditions while the two systems above it are `unknown` and `blocked`.

### ARC-AGI-3: compressing a multi-agent system into one agent

This is the most interesting section in the paper. The authors' companion system DreamTeam — six specialized agents coordinating around a shared executable world model — set the previous best published score on ARC-AGI-3. This experiment tests whether that methodology **survives radical simplification**.

The scale of the compression is striking. Six role prompts (1,821 lines) and a 4,690-line harness-side retrodiction engine get absorbed into framework primitives: the CodeAct REPL as simulator, context blocks as shared state, and memory as the team's carry-forward ledgers. What remains is **one agent and one 50-line skill**. The paper system was roughly 150k lines; the example is roughly 6.1k.

The skill instructs the agent to persist an executable model as workspace modules: `encode(grid) → z`, a latent of the few fields that drive the game; `predict(z, action) → z'`, the dynamics; *retrodiction* each turn, where a predict-versus-observed mismatch is the sole refinement signal; search over its own `predict` once trusted; and memory discipline across levels. Every turn ends with `submit_actions(..., rationale="predict: ...")`, making each action batch a checked experiment.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/fig7-arc-agi3.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: fleet-mean RHAE vs. wall-clock under the two-hour cap. Dots on the curves mark each USD 4 of per-game cumulative spend; the dashed line is ARC Prize's evaluation of raw GPT-5.6-sol (13.3%)."
   zoomable=true %}

Four 25-game fleets ran with one agent per game under the competition's two-hour cap. At the cap, the world-model plus memory fleet on GPT-5.5 reaches **RHAE 50.2%** (118 levels) against 41.7% for the baseline and 38.4% for the markdown-file ablation — **+8.5 points over the baseline and +11.8 points over the same skill without the memory subsystem**. On GPT-5.6-sol the same agent scores **85.1%** across 170 levels for less than USD 20 per game. The guarded, cache-aware fleets cost USD 17.85 (GPT-5.5) and USD 13.28 (GPT-5.6-sol) per game at gpt-5.5 pricing.

The most eye-catching number is the harness effect. ARC Prize's own evaluation of raw GPT-5.6-sol averages **13.3%** on the same 25 public games at maximum reasoning effort, while the same model inside the NOOA harness reaches 85.1% — a **6.4× harness effect**. The authors themselves footnote that evaluation budgets differ, so the comparison is indicative.

## Analysis and Ablations

### Why strong models fail at easy discipline

Appendix B reproduces four complete model traces of `sentiment_batch`, the hardest stress test (31/50 overall). The task is classifying the sentiment of 50 texts, and the scorer requires an exact match against 50 reference labels. All four runs received byte-identical context; the model sees 25 of the 50 texts in the preview, but the `texts` variable holds all 50.

- **Nemotron 3 Ultra — passed.** The intended solution in one cell: a model-defined subagent fanned out over the live variable, with the live result returned from inside the cell. 9.6 seconds end to end.
- **Claude Opus 4.8 — failed.** The first cell executed the same fan-out correctly and got all 50 classifications right. Then, on the next turn, instead of `return_result(results)`, the model **transcribed the printed output into a literal in a separate `return_result` tool call** — exactly what the strategy instructions say not to do. The transcription dropped item 43 (`neutral`, "Typical response time."). Verdict: list length mismatch, expected 50, got 49. The live `results` variable held all 50 labels.
- **GPT-5.5 — passed.** No subagents. Its first cell deliberately defeats the preview by printing every item with its index; its second cell labels by hand but with explicit per-item bookkeeping in comments. Transcription again, but with an explicit item-by-item correspondence.
- **GPT-5.4 Mini — failed.** Its only cell was a keyword-rule classifier, with keyword lists fitted to the 25 texts visible in the preview and applied blind to all 50. It iterated the live variable correctly but substituted keyword rules for semantic judgment, against the strategy instructions, and the labels did not match on the 25 texts it never inspected.

The authors' summary is exactly right: **sophistication and success are orthogonal.** The most advanced harness use (Opus's fan-out) failed on the cheapest discipline — return the variable, do not retype it — while the least agentic approach (GPT-5.5's manual labeling) passed on careful bookkeeping. **Both failures ignored an explicit instruction, and both had a safe path already provided by the interface.** This is the evidence behind the paper's §7 argument that trajectory-level reinforcement learning is the natural next target.

### What the memory subsystem actually did

Across the 25-game ARC-AGI-3 fleet, all three memory interfaces got exercised: 3,262 memories written, 12,654 spontaneous injections, and 27,115 deliberate tool reads at a 99% hit rate.

The direction of the bias in reads is interesting. Mean importance climbs written → injected → deliberate (6.1 → 7.2 → 7.5). The HIGH verbal level carries 61% of writes but 87% of injected and 91% of deliberate occurrences — **the ACT-R importance term biases both read channels toward what the agent itself marked important.**

Injection is selective and bounded. Only 632 of 3,262 memories (19%) ever surfaced spontaneously, at 4.1 memories ≈ 1.9k characters per turn. The char-budgeted block prevents context flooding by memory.

Roles differentiate sharply by type. **Episodes are the recency channel**: 10% of writes but 24% of injected occurrences (13% deliberate), as the base-level recency term surfaces the latest level attempts unprompted. **Skills are few, dear, and deliberately fetched**: 3% of writes but the highest importance of any type (8.3) and over-represented in deliberate reads — agents went back for their verified procedures. **Consolidation compressed the store rather than growing it**: reflection records are 22% of rows yet about 1% of both read channels (importance 3.9), and 45% of all records ended archived by decay-based forgetting.

The relationship with performance is best seen per decision, where a decision is one agent turn ending in `submit_actions`. On that measure the relationship is clearly positive: **deliberate recalls per decision correlate with levels completed at Spearman ρ = +0.52**, and writes per decision at ρ = +0.36. Winning games check memory 1.63 times and write 1.87 memories per decision (medians, versus 1.21 and 1.46 for the rest). **Every winning game makes at least one deliberate recall per decision** — the skill's recall-before-deciding discipline in action.

The authors explicitly note that with $n = 25$ and 16 outcomes right-censored by the operator kill, these are associations. That is the honest framing.

### How the world models were used

Of 25 games, 22 persisted executable model code (37 modules, about 4.4k lines). Six games grew a new per-level module as mechanics accumulated (hazards → tokens → doors → pressure plates).

By depth of use: 5 games ran the full loop (predict + search + retrodiction), 7 planned or predicted with their models, and 10 used them for perception and encoding only. Among the representative closed loops, `m0r0` stored a 42-action plan, replayed twenty real frames through `encode` to check it mid-execution, released the next batch, and pre-announced the completing action of its final level — 6/6 levels near the per-level score cap. `ar25` wrote its model on turn one from a single exploratory action, then submitted a 16-action plan ending with the rationale "expect level completion on the last `DOWN`" — 8/8 levels in 24 turns.

The failure mode is instructive. The two games that hung did so in **ad-hoc, in-cell searches that lacked the bounds (`max_depth`, visited sets, node budgets) their own persisted planners carried**. One branched over all 3,456 click targets per node with no budget while its persisted `predict` went uncalled. **Durable, curated artifacts were reliably better engineered than improvised cell code** — an argument for the memory-and-workspace discipline of §3.7.

### Containment: the security audit

The ARC-AGI-3 fleet ran inside layered sandboxing. Each CodeAct cell executes in a locked-down worker with four kernel-enforced, irrevocable guards installed before any cell bytecode runs: Landlock filesystem default-deny, a seccomp block on `socket(AF_INET/AF_INET6)`, `RLIMIT_AS`/`RLIMIT_CPU` memory and CPU caps, and a hard `SIGTERM→SIGKILL` cell timeout. Above that sits an in-process cell guard, a per-run OS privilege drop, and end-to-end anonymisation of game identity (agents only ever see an opaque `game-<hex>` alias).

An 18-pass red-team loop re-scanned the live 25-game fleet every 30 minutes and found **no leakage on any rule**. Zero network invocations, zero game-source bytes returned, cross-game reads failing with `EACCES`, and zero occurrences of any real game identifier across 13,335 agent logs. There was exactly one escape attempt — an agent invoking a filesystem-recon shell command (`find`/`grep`) for its own store alias — and the cell guard replaced the cell before execution, returning zero bytes.

Containment reporting at this level of detail is rare in agent papers. It reads like the work of people who have actually thought about production deployment.

### Comparing fourteen frameworks

{% include figure.liquid loading="eager"
   path="assets/img/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/tab7-harness-comparison.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 7: fourteen harnesses scored on six interface capabilities. A † marks an extension, flag-gated, or opt-in feature — not enabled by default."
   zoomable=true %}

The way to read this table is not "who won" but **"where is the green clustered"** — because that is where the field is actually converging.

- **Code as action** is the greenest column. LangChain Deep Agents' JS REPL, Microsoft's Monty/Hyperlight CodeAct providers, PydanticAI's CodeMode, Codex's code mode, OpenClaw's Code Mode cell — most carry a †. These are features that **shipped during the evaluation window and are still experimental or flag-gated**. That is a strong signal about where the field is moving right now.
- **Typed I/O** is almost uniformly "typed output only." Google ADK alone also accepts an input schema, and only on its agent-as-tool path. Output typing has become an industry baseline; input typing has not.
- **Pass by reference** is nearly everywhere files or serialized copies. smolagents is the exception, injecting live objects into the executor namespace — but with no shaped preview mechanism, so the model sees the arguments' untruncated `str()`.
- **Harness APIs** mostly means "skill/tool-search loading." Context *loading* is model-callable; reading and writing context blocks and querying events remain developer territory. This is the axis where NOOA differentiates most.

The authors' conclusion — no system combines all six, but most are adopting some of them — falls straight out of the table. And the density of † marks tells you something else: this comparison will age very quickly.

## Limitations and Critical Assessment

### Limitations the authors acknowledge

**The security model is the big one.** NOOA executes model-written code in the agent's own process. The validator of §3.4 **protects the agent loop, not the host.** In this respect NOOA is the same as any harness with a shell tool: sandboxing (a container, VM, or permission system) goes around the agent process, and a shell tool is no safer than in-process Python. The authors are clear that executing in-process is what preserves pass by reference, and that sandboxed code modes trade it away by receiving serialized copies at the sandbox boundary. Their preferred deployment is OpenShell.

### Limitations I would add as a reviewer

**The six-capability rubric is reverse-engineered from NOOA's design.** Typed I/O, pass-by-reference, code as action, loop engineering, object state, harness APIs — these are the six things NOOA does. A framework designed differently will structurally score Partial. LangGraph's graph state scores Partial on "model-visible durable state," but define an axis like "static verifiability of state transitions across nodes" and NOOA would score Partial. The evidence level in Appendix A is high enough that the individual cell verdicts are hard to dispute, but **the choice of axes is not neutral.** The authors' "to the best of our knowledge" hedge is appropriate; readers should take the table as "the field is converging on these six axes" rather than "NOOA wins."

**There is no per-capability ablation.** The only controlled ablation in the entire paper is the memory subsystem (+11.8 RHAE). Whether NOOA's 11.4-point lead over OpenHands v3 on SWE-bench comes from typed return validation, pass-by-reference, bounded previews, or `BenchAgent`'s tree-sitter repository tools is unknowable from the results. The trace analysis of validated termination in §4.2 offers a qualitative argument, but there is no quantitative attribution. For a framework paper that is a significant gap — if the claim is that these six ideas are the point, you have to remove them one at a time.

**The capability suite is self-authored.** All 88 tests were built by the team that designed the interface. A 97.9% pass rate shows the interface is learnable, not that it is better than alternatives. There is no port of equivalent tests to other harnesses, so the agent-readiness claim is supported in absolute terms and not in relative ones.

**The baseline selection for the harness comparison is narrow.** Only two open harnesses, OpenCode and PI, were actually re-run on SWE-bench and Terminal-Bench. The other twelve scored in Table 7 never make it onto a benchmark. smolagents in particular — Strong on both code as action and pass by reference — would be the interesting one to see, and it is absent. Closed-system numbers are cited as reported, not re-run.

**The stress-test failure analysis is four traces.** Appendix B is excellent qualitative material, but it is four runs of one test. Whether "sophistication and success are orthogonal" holds across all six stress families cannot be established from this evidence. A coded and aggregated table of failure types would have been much stronger.

**The 6.4× ARC-AGI-3 harness effect compares unlike things.** As the authors footnote, the ARC Prize evaluation of raw GPT-5.6-sol (13.3%) used a different budget. Putting an agent that spent USD 13–18 per game inside a two-hour cap next to an unspecified-budget raw model evaluation gives an upper bound, not a measurement. And with $n = 25$ and 16 right-censored outcomes, the memory correlations are weak evidence as well.

**Memory subsystem cost is not accounted for.** Embedding computation, ACT-R activation propagation, and asynchronous reflection passes all consume resources outside the model token budget. Figures like USD 17.85 per game appear to be model spend at gpt-5.5 pricing, with no statement about whether memory infrastructure is included. What the +11.8 RHAE actually costs is unknown.

**It is a single-language bet.** The whole design rests on "models know Python well." That is a strong assumption today, but there is no discussion of how transferable the argument is for organisations running agents on TypeScript, Go, or JVM stacks. Given that several systems in Table 7 adopted a JS REPL instead (LangChain Deep Agents, Codex code mode, OpenClaw), this is a real question.

## Takeaways

- **Harness design matters more the weaker your model is.** NOOA leads competing harnesses by 8–11 points with reasoning off, and the margin narrows at xhigh. Explicit object state, typed actions, and programmable loops substitute for what a strong reasoning model does on its own. Practically: the less you can afford frontier models, the more you should invest in the harness.
- **Making termination a type contract buys more than it looks like.** OpenCode, which stops whenever the model responds without a tool call, saw 77% of its failed GPT-5.5 trials on Terminal-Bench terminate within ten steps. Forcing a type-validated return that carries evidence and a verification command blocks premature exit on tasks whose intermediate state looks plausible. That design is worth stealing regardless of which harness you use.
- **Stress-test failures are about discipline, not understanding.** Opus 4.8 got all 50 classifications right, then transcribed instead of returning the variable and dropped one. That single trace pinpoints where the current frontier bottleneck lives: demonstrating a capability and doing it reliably every time are different problems, and the second may need trajectory-level training rather than better prompts.
- **Pass-by-reference plus bounded previews is a way around the context window.** Bounding the data an agent can process by the execution environment rather than by the prompt is a more fundamental fix than incrementally improving transcript compaction. Rendering a hundred-element list as ten elements while keeping all hundred iterable is simple and disproportionately effective.
- **Reducing the number of agents is also an architectural improvement.** Six agents, 1,821 lines of role prompts, and a 4,690-line retrodiction engine collapsing into one agent and a 50-line skill — with the score going *up* — suggests much of multi-agent orchestration was reimplementing at the application level what the harness should have provided as a primitive.

## Getting Started

The code is available at [nvidia-nemo/labs-OO-Agents](https://github.com/nvidia-nemo/labs-OO-Agents). The minimal shape from Figure 1:

```python
from nooa import Agent

class SupportAgent(Agent):
    """You are a support agent for a customer service system."""

    # Object state: model-visible, passed by reference.
    order_db: OrderDB

    # A real body is ordinary Python. The model can call it from generated code.
    def is_refund_eligible(self, order: Order) -> bool:
        """Return whether an order is eligible for a refund."""
        return order.delivered and order.days_since_delivery <= 30

    # An "..." body makes it agentic. Predict is a single typed LLM call.
    @strategy(PredictStrategy())
    async def classify(self, message: str) -> TicketKind:
        """Classify the customer message into the best ticket kind."""
        ...

    # The default CodeAct strategy runs a loop in which the model writes Python.
    @strategy(CodeActStrategy())
    async def triage(self, message: str, photo: Image | None, order: Order | None) -> Ticket:
        """Triage a customer message and create a support ticket."""
        ...
```

Adding memory requires no change to the agent:

```python
MemoryManager.install(agent)   # uninstalling restores the agent exactly
```

Context blocks and event history are just APIs:

```python
self.context["notes"] = "The user wants concise responses."
self.context.set_dynamic("todo", "self.todo.status()")   # re-evaluated each turn
recent_python = self.events.query(type="PythonOutput", limit=3)
```

## References

- Paper: <https://arxiv.org/abs/2607.20709>
- Code: <https://github.com/nvidia-nemo/labs-OO-Agents>
- OpenShell (the authors' preferred deployment runtime): <https://github.com/NVIDIA/OpenShell>
- ARC-AGI-3 benchmark: <https://arcprize.org/arc-agi/3/>

## Further Reading

- **[Executable Code Actions Elicit Better LLM Agents](https://arxiv.org/abs/2402.01030)** (Wang et al., ICML 2024) — the paper NOOA's CodeActStrategy descends from directly, making the case that executable code beats JSON and text as the action modality.
- **[Workspace Optimization: How to Train Your Agent](https://arxiv.org/abs/2605.09650)** (Sarafian et al., 2026) — the same group's companion work. It produced the DreamTeam system that the ARC-AGI-3 example compresses, and its open problem of transfer is what NOOA's memory subsystem addresses.
- **[MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560)** (Packer et al., 2023) — the lineage behind NOOA's event-history collapse and memory tiers, and the origin of treating the LLM as an OS that pages context.
- **[Code as Agent Harness](https://arxiv.org/abs/2605.18747)** (Ning et al., 2026) — a survey of code becoming the substrate for reasoning, acting, environment modeling, verification, planning, memory, and multi-agent coordination. Reading NOOA as an object-oriented Python runtime for that shift places it well.
- **[Recursive Language Models](https://arxiv.org/abs/2512.24601)** (Zhang et al., 2025) — makes the prompt itself a variable in a REPL that the model inspects, slices, and recursively queries. This is what NOOA's pass-by-reference looks like pushed to its logical conclusion.

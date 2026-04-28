---
layout: post
title: "[Paper Review] TradingAgents: Multi-Agents LLM Financial Trading Framework"
date: 2026-04-28
description: "An LLM trading framework that mirrors a real trading firm's org chart — analysts, bullish/bearish researchers, a trader, a risk team, and a fund manager — coordinated through structured reports for cross-team handoff and natural-language debate inside teams."
tags: [multi-agent, llm, finance, trading, agentic-debate, react]
categories: paper-review
giscus_comments: false
related_posts: false
thumbnail: assets/img/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/fig1-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/
ko_url: /papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/
---

{% include lang_toggle.html %}

## Metadata

| Item | Value |
|------|-------|
| Authors | Yijia Xiao, Edward Sun, Di Luo, Wei Wang (UCLA · MIT · Tauric Research) |
| Venue | arXiv preprint · 2025 (v7, 2025-06-03) |
| arXiv | [2412.20138](https://arxiv.org/abs/2412.20138) |
| Code | [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) |
| Reviewed | 2026-04-28 |

## TL;DR

- **The pitch:** mirror the org chart of a real hedge fund — analysts, researchers, trader, risk managers, fund manager — directly into LLM agents and let them collaborate.
- **The recipe:** seven specialized agent roles connected by a hybrid communication protocol — structured reports between teams, free-form debate inside teams. A two-tier LLM backbone (`gpt-4o-mini` for retrieval, `o1-preview` for reasoning) keeps cost manageable.
- **The headline numbers:** on a Q1 2024 backtest of AAPL/GOOGL/AMZN, the system clears 23.21% cumulative return and 24.90% annualized return at minimum, with Sharpe ratios of 5.6 to 8.2. Improvements over the strongest baseline range from +6.10 to +24.57 percentage points on CR.
- **The asterisk:** the backtest is only three months long, on a strong tech-stock rally, and even the authors flag in a footnote that the Sharpe values are likely inflated. So this paper validates the *direction* — multi-agent debate beats single-agent and rule-based — more than the absolute magnitudes.

## Introduction

The applied LLM-trading literature has split into two threads. One thread builds *single-agent* systems — FinMem, FinAgent — bolting memory and reflection onto a single trader-LLM. The other builds *multi-agent data collectors* like TradingGPT, where several LLMs gather signals but a single model still makes the call at the end. Neither captures how real trading desks actually work, where decisions emerge from the friction between specialized teams.

The authors of TradingAgents identify two specific gaps. First, **organizational modeling is shallow**: real firms decompose work across fundamentals analysts, sentiment analysts, news analysts, technical analysts, bull/bear researchers, traders, risk managers, and fund managers. Most LLM-trading papers collapse this into one or two roles. Second, **pure natural-language communication is fragile**: when agents only talk through a shared message pool, key details degrade as the conversation grows — what the paper calls a "telephone effect." Lengthening the dialogue makes the problem worse, not better.

TradingAgents' answer is straightforward. **Copy the org chart, and structure the communication.** Seven LLM-agent roles cooperate as they would in a real firm, but cross-team handoff happens through structured reports while in-team deliberation stays as natural-language debate. The rest of this review walks through what those roles are, why the hybrid protocol matters more than it sounds, and what to make of the backtest results.

## Key Contributions

- **Organizational modeling.** Seven distinct agent roles — four analysts (Fundamentals, Sentiment, News, Technical), the Researcher (with bullish and bearish instances), the Trader, and the Risk Manager (with risky / neutral / conservative instances) — each with explicit goals, tools, and constraints. A Fund Manager sits on top, finalizing the risk team's verdict.
- **Hybrid communication protocol.** Cross-team interaction is mediated by a structured global state (analysis reports, trader plans, risk assessments). In-team interaction is free-form dialogue. There's no shared message pool that grows unboundedly — agents query the state object directly.
- **Layered agent debates.** Bullish vs. bearish researchers, then risky vs. neutral vs. conservative risk analysts. Two stages of debate try to surface viewpoints that a single forward pass would have collapsed.
- **Two-tier LLM backbone.** Quick retrieval and summarization run on `gpt-4o-mini` / `gpt-4o`. Deep reasoning (every analyst node, the researcher debate, the trader) runs on `o1-preview`. All agents follow the ReAct (reasoning + acting) prompting pattern.
- **Backtest evidence.** Across AAPL/GOOGL/AMZN on Q1 2024 the system beats five rule-based baselines on cumulative return, annualized return, and Sharpe ratio. The full per-day decision trace is published in the appendix, making the system's reasoning auditable.

## Background

To read this paper carefully, three lines of related work are worth recalling.

**LLMs as financial assistants.** PIXIU/FinMA, FinGPT, BloombergGPT, Fin-T5, XuanYuan, and BBT-Fin all fine-tune or pretrain on financial corpora. They specialize in *analytical assistance* — answering questions, summarizing filings — not direct trading. TradingAgents goes the other way: it uses general GPT-4-class models as analytical engines and pushes the *decision* into agent collaboration.

**LLMs as traders.** Three sub-flavors. (a) News-driven: Lopez-Lira & Tang's ChatGPT long-short, sentiment-trading from FinGPT/OPT alignment. (b) Reasoning-driven: FinMem and FinAgent for memory and reflection, TradingGPT for inter-agent debate. (c) RL-driven: SEP's PPO alignment, classical methods that combine LLM embeddings with stock features. TradingAgents extends thread (b) into a more disciplined organizational form.

**Structured vs. free-form multi-agent communication.** MetaGPT and ChatDev showed in software engineering that pure natural-language exchange degrades with conversation length, but enforcing structured artifacts (SOPs, design docs) keeps long collaborations stable. TradingAgents ports that insight into the trading domain.

One prerequisite to keep in mind: **ReAct prompting** (Yao et al., 2023). Each LLM call emits interleaved (Thought, Action, Observation) blocks, mixing reasoning with tool use. Every TradingAgents agent runs ReAct under the hood.

## Method / Architecture

The whole system fits in one diagram.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/fig1-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: TradingAgents end-to-end. (I) Analyst Team gathers market/social/news/fundamentals signals in parallel → (II) Researcher Team debates bull vs. bear → (III) Trader writes a transaction proposal → (IV) Risk Management Team adjusts via Risky/Neutral/Safe perspectives → (V) Fund Manager approves and executes."
   zoomable=true %}

Walking through it stage by stage.

### Analyst Team

Four analysts work **in parallel**, each with a different toolbox.

- **Fundamentals Analyst** — pulls financial statements, earnings reports, insider transactions, and company profiles via Finnhub APIs (`get_finnhub_company_profile`, `get_finnhub_company_financials_history`, etc.) to estimate intrinsic value.
- **Sentiment Analyst** — reads Reddit (`wallstreetbets`, `stocks`, `investing`, `SecurityAnalysis`, `Finance`, `Economics`), X/Twitter, and EODHD sentiment scores to read short-term investor mood.
- **News Analyst** — sweeps Bloomberg, Yahoo, Finnhub, and EODHD news for macro, policy, and sector-level events. Inflation prints, FOMC moves, U.S./China trade — all flow in here.
- **Technical Analyst** — computes ~60 indicators (RSI, MACD, ADX, Bollinger Bands, ATR, CCI, Supertrend, VWMA, …) and classifies momentum, trend, and volatility regimes.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/fig2-analyst-team.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: One report per analyst. Different tools and data sources, but the same Goal / Key Points Summary / body schema, so downstream teams can query them as structured objects."
   zoomable=true %}

The unified output schema is the quiet protagonist here. Because every analyst writes into the same shape, downstream teams can *directly query* the slice of signal they need — they don't have to scroll through a chat log.

### Researcher Team: bull vs. bear debate

Once the analyst reports are in, **two researchers argue from opposite sides**. Each one queries the analyst reports from the global state and acts in advocate mode, foregrounding evidence that supports its assigned thesis.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/fig3-researcher-team.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: a Bullish researcher and a Bearish researcher reach opposite conclusions on the same analyst evidence. A facilitator agent reconciles the debate at the end."
   zoomable=true %}

The AAPL example in the appendix makes the texture concrete. The bull walks through smart-home AI expansion, 46.21% gross margin, and 164.59% ROE — concluding "long-term buy." The bear, looking at the *same data*, points to a P/E of 37.79, insider sales, and U.S./China tensions, and concludes "downside risk." That a single set of evidence supports two opposite stories is the point: forcing two argumentative agents into the loop prevents the natural-language context from collapsing prematurely onto one stance.

The debate runs for $n$ rounds, after which a facilitator agent reads the dialogue history, picks the winning side, and writes a structured summary back into the global state.

### Trader

The trader takes both the analyst reports and the (now resolved) researcher view, and produces a **buy / sell / hold** decision plus a rationale.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/fig4-trader.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: the trader's structured output bundles a decision, a reasoning string, and a recommendation. \"Strong financials and growth prospects outweigh valuation and liquidity risks → BUY for long-term growth despite short-term risks.\""
   zoomable=true %}

The interesting field here is *Reasoning*, not *Decision*. The next stage — risk management — is going to attack that reasoning string directly.

### Risk Management Team

The trader's call doesn't execute. **Three risk analysts** take the trader's plan and debate it from three preset stances:

- **Risky Analyst** — pushes for high-reward / high-risk plays. "RSI hitting 100 is strong upward momentum; the conservative view leaves money on the table."
- **Conservative (Safe) Analyst** — capital preservation first. "RSI and CCI both flag overbought; set stop-losses and prepare for a pullback."
- **Neutral Analyst** — splits the difference. "Use stop-losses and option hedges so the upside is captured but the downside is bounded."

{% include figure.liquid loading="eager"
   path="assets/img/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/fig5-risk-management.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5: three risk perspectives debate the trader's plan; the Fund Manager finalizes the trade after reading the debate transcript."
   zoomable=true %}

Once the debate runs out, the **Fund Manager** agent consumes the transcript and writes the final, risk-adjusted decision (with stop-loss, sizing, diversification overrides as needed) back into the global state. This last step is what turns a one-shot trader call into something that has been *vetted at the firm level*.

### The communication protocol: structured + dialogue

This is the single design choice most likely to outlive the paper. TradingAgents intentionally splits its communication into two channels:

```text
[team → team]   structured global state
                (analysis reports, trader decision, risk assessment)

[inside team]   natural-language dialogue
                (researcher debate, risk-analyst debate)
```

Why? Because pure-NL message pools degrade with length. As rounds accumulate, context windows pressurize and early signals get rewritten or dropped. MetaGPT solved this in the software-engineering setting by enforcing SOPs and design docs as the durable artifact; TradingAgents transplants that idea directly.

But it doesn't throw away the value of debate. In-team dialogue is what lets reasoning go deep — the trick is to *serialize the outcome* into a structured object before the next team picks it up. "Debate freely; commit to a schema."

### Backbone-LLM split

Another practical decision. Running every node on a frontier model is expensive; running everything on a small model is brittle. TradingAgents assigns models per task type.

| Task type | Backbone | Used for |
|-----------|----------|----------|
| Quick-thinking | `gpt-4o-mini`, `gpt-4o` | data retrieval, summarization, table → text |
| Deep-thinking | `o1-preview` | analyst nodes, researcher debate, trader reasoning |

Analyst nodes always get the deep-thinking model so analysis quality stays high. Quick-thinking is reserved for tool I/O and summarization. The whole system runs on API credits — no GPU required — and swapping in a stronger reasoning model later is a config change.

## Objective / Metrics

There is **no model training** in TradingAgents. Every agent is a stock OpenAI model plus a system prompt plus tools plus the ReAct loop. So there is no loss function to discuss; the relevant equations are the **backtest metrics**:

- **Cumulative Return (CR):** $$\mathrm{CR} = \left(\frac{V_{\text{end}} - V_{\text{start}}}{V_{\text{start}}}\right) \times 100\%$$
- **Annualized Return (ARR):** $$\mathrm{ARR} = \left(\left(\frac{V_{\text{end}}}{V_{\text{start}}}\right)^{1/N} - 1\right) \times 100\%$$
- **Sharpe Ratio (SR):** $$\mathrm{SR} = \frac{\bar{R} - R_f}{\sigma}$$
  where $$\bar{R}$$ is mean portfolio return, $$R_f$$ is the risk-free rate (3-month T-bill yield), and $$\sigma$$ is the standard deviation of returns.
- **Maximum Drawdown (MDD):** $$\mathrm{MDD} = \max_{t \in [0,T]} \left(\frac{\text{Peak}_t - \text{Trough}_t}{\text{Peak}_t}\right) \times 100\%$$

CR and ARR speak to absolute return, SR to risk-adjusted return, MDD to worst-case loss. As a rule of thumb, SR > 2 is "very good"; SR > 3 is "excellent."

## Data and Pipeline

Again, no training. Instead a **multi-modal financial dataset** is fed into the simulator.

| Data | Source | Consumer |
|------|--------|----------|
| OHLCV prices | Yahoo Finance, EODHD | global |
| News articles | Bloomberg, Yahoo, Finnhub, EODHD, Reddit | News Analyst |
| Social posts | Reddit (wallstreetbets, stocks, investing, …), X/Twitter | Sentiment Analyst |
| Insider sentiment & transactions | SEDI, company filings | Fundamentals Analyst |
| Financial statements & earnings | Quarterly/annual reports | Fundamentals Analyst |
| Company profiles & history | 3rd party | Fundamentals Analyst |
| Technical indicators | 60 of them (MACD, RSI, BB, ATR, CCI, …) | Technical Analyst |

One simulator detail worth flagging: **look-ahead bias is blocked**. Agents see only data available as of the current trading day. The loop runs daily — analyze, decide, execute, score, advance one day, repeat.

The cost story is striking. **Each prediction costs roughly 11 LLM calls plus 20+ tool calls**, so >30 API calls per trading day. A three-month backtest (~60 trading days) is therefore ~1,800+ API calls. This budget ceiling ends up being the paper's most binding constraint.

## Experiments

Tickers: AAPL, GOOGL, AMZN. Window: 2024-01-01 to 2024-03-29 (≈3 months). Baselines: Buy & Hold, MACD, KDJ+RSI, ZMR (zero mean reversion), SMA.

### Cumulative and annualized returns

{% include figure.liquid loading="eager"
   path="assets/img/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/tab1-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: head-to-head against all baselines. Bold green marks the per-metric winner. TradingAgents takes CR/ARR/SR across essentially every column."
   zoomable=true %}

The numbers, summarized:

- **AAPL.** TradingAgents CR 26.62% / ARR 30.5% / SR 8.21 / MDD 0.91%. Every baseline (including Buy & Hold) sits between -5% and +2%. Improvement over the best baseline is +24.57 pp on CR.
- **GOOGL.** CR 24.36% / ARR 27.58% / SR 6.39 / MDD 1.69%. SMA, the strongest baseline at 6.23%, gets beaten by +18.13 pp; B&H by +16.58 pp.
- **AMZN.** CR 23.21% / ARR 24.90% / SR 5.60 / MDD 2.11%. AMZN was on a strong tear in Q1 2024, so even Buy & Hold cleared 17.1% — TradingAgents adds +6.1 pp on top.

The AAPL case is the most striking. AAPL traded sideways with high volatility in Q1 2024, and rule-based strategies all came in between 0 and 2%. **Buy & Hold actually lost 5.23%.** TradingAgents posting +26% in that exact window is roughly a 30-percentage-point gap. The natural reading: when trend-following signals fail, debate-based decisions can pick up alternative cues (sentiment, fundamentals, news) that the rule-based baselines simply don't see.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/fig7-cumulative-returns-aapl.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: AAPL cumulative-return curves. The five baselines stay clustered around 1.0; TradingAgents (brown) climbs monotonically to ~1.30."
   zoomable=true %}

### Sharpe Ratio

The Sharpe numbers are even more eye-catching. AAPL's SR of **8.21** is well past the "excellent" threshold of 3. The authors flag this in a footnote themselves: *"This Sharpe ratio exceeds our expected empirical range. We exported and verified the decision sequences, but believe the high SR is largely an artifact of the short three-month window having few pullbacks. We report results faithfully and flag longer backtests as future work."* The honesty is appreciated, but it's also a clear signal that **these SR values shouldn't be taken at face value**.

### Maximum Drawdown

Rule-based baselines mostly traded sparingly or conservatively, so they show strong MDD numbers (MACD on GOOGL: 1.22%; ZMR on AAPL: 0.86%). TradingAgents has slightly higher drawdowns (0.91% / 1.69% / 2.11%) — but in absolute terms, all three are still under 2.5%. Lifting expected returns into the double digits while keeping max drawdown in the low single digits is the claim worth remembering.

### Explainability

This subsection is qualitative, not numeric. The chronic problem with deep-learning trading systems is that decisions are opaque; TradingAgents exposes the entire ReAct trace. Appendix S1.4 prints the full natural-language transcript for a single trading day (AAPL, 2024-11-19), running 18 pages: Market Analyst → Sentiment Analyst → News Analyst → Fundamentals Analyst → Bullish Researcher → Bearish Researcher → Risky / Safe / Neutral Risk Analyst → Fund Manager. Every tool call and every reasoning step that fed into the final BUY is auditable line by line.

## Analysis / Ablation

Here is the paper's biggest gap, stated honestly: **there is no formal component-level ablation**. The reader is not shown what happens when the bull/bear debate is removed, when the risk team is removed, when one of the four analysts is dropped. None of those knock-out experiments appear.

What we can extract instead are two indirect signals.

1. **Single-LLM trader vs. multi-agent.** The paper cites FinMem and FinAgent as the strongest single-agent traders, with reported Sharpe ratios in the 1–2 range. TradingAgents posting 5+ at least *suggests* the multi-agent debate adds something — but the evaluation setups differ enough that a head-to-head reading isn't safe.
2. **Message pool vs. structured communication.** Section 4.1 motivates the hybrid protocol by appealing explicitly to the "telephone effect." The implication is that the authors saw message pools degrade in their own experiments. A quantitative ablation would have made this decisive; it isn't here.

A subtler concern is **selection bias**. The paper's setup names AAPL/NVDA/MSFT/META/GOOGL as the evaluation universe, but the main table reports only AAPL/GOOGL/AMZN. NVDA, MSFT, META — and the appearance of AMZN, which wasn't in the original list — read like a swap. The appendix doesn't cover the missing tickers either. Q1 2024 was a strong rally for NVDA/MSFT/META, so if the system had won there too, the authors presumably would have shown it.

## Limitations and Critical Assessment

The authors' own caveats:

- **Three-month backtest only**, due to API budget.
- **Inflated Sharpe**, acknowledged as plausibly an artifact of a low-pullback window.
- **Compute cost**: 30+ API calls per day. Not viable as a real-time strategy without aggressive optimization.

What the paper doesn't flag, but should:

- **No component ablation.** Without it, we can't separate "the org structure is what works" from "more LLM calls is what works." That distinction matters a lot for follow-up work.
- **Ticker selection is narrow and bull-biased.** Q1 2024 was an AI-rally regime where mega-cap tech ran. Of the five tickers named in the setup (AAPL/NVDA/MSFT/META/GOOGL), only AAPL and GOOGL appear in the main table; AMZN — which wasn't in the original list — has been swapped in for the others. That, combined with the absence of bear or sideways markets, leaves the methodology mostly untested in the regimes where strategies actually break.
- **Possible training-data leakage.** The `o1-preview` model's training cutoff is plausibly late 2023 or later; the appendix logs reference events from late 2024 (e.g., "Trump's return sparks mixed reactions"), which suggests parts of the evaluation window may be inside the model's pretraining horizon. That makes the "backtest" closer to a *nowcast* with hindsight contamination than a true out-of-sample evaluation.
- **Weak baselines.** Buy & Hold plus four rule-based strategies. No LSTM/Transformer time-series baselines, no RL traders, no comparison against single-LLM traders like FinMem. Multi-agent's marginal value is most precisely measured against single-LLM, and that comparison is missing.
- **No transaction-cost or slippage modeling.** Daily turnover at 30+ API calls implies frequent rebalancing, but commissions, slippage, and market impact aren't discussed. A strategy that turns over 30% per day can look very different after costs.

None of this kills the paper. The **org-chart-as-architecture + hybrid communication protocol** is a generalizable lesson for multi-agent LLM design well beyond trading. But this framework should not be lifted straight into a live trading desk on the strength of these numbers.

## Takeaways

- **Org chart = system architecture.** When designing a multi-agent system, the *reporting lines* matter as much as the per-agent toolset. Analyst → researcher → trader → risk → fund manager gives every stage explicit veto power over the previous stage. That's a stronger validation pattern than fan-out.
- **Structured artifacts + free-form debate is a transferable protocol.** Whenever an LLM multi-agent system has to run for many rounds and information must not decay, the same split applies: between teams, schemas; inside teams, dialogue.
- **Two-tier backbones are the practical cost lever.** Frontier-on-everything is wasteful; small-on-everything is brittle. Per-task model assignment generalizes well past trading.
- **Don't take backtest numbers at face value.** Three months, five tickers (only three reported), a bull window, plausible look-ahead leakage — the SR-of-8 is the *upper bound of the framework's promise*, not an expected operating value. Real conviction needs longer windows, bear regimes, and cost models.
- **Explainability is the durable strength.** The numbers will age; the auditable per-day transaction log will not. In a regulated trading environment where every decision needs justification, an LLM trader that prints "I bought AAPL because of X, Y, Z" line by line is structurally better positioned than a deep-learning black box.

## Installation and Use

The reference implementation is at [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents). A minimal driver looks roughly like this (consult the repo README for the current interface):

```python
from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG

config = DEFAULT_CONFIG.copy()
config["llm_provider"] = "openai"
config["deep_think_llm"] = "o1-preview"
config["quick_think_llm"] = "gpt-4o-mini"
config["max_debate_rounds"] = 1

ta = TradingAgentsGraph(debug=True, config=config)

# Run analysis + decision for a single trading day
state, decision = ta.propagate("AAPL", "2024-01-15")
print(decision)
```

You'll need an OpenAI API key plus credentials for the data providers (Finnhub, EODHD, Reddit, etc.). Costs ramp quickly, so simulate a day or two first to inspect output formats before scaling to a full backtest.

## References

- Paper: [arXiv:2412.20138](https://arxiv.org/abs/2412.20138)
- Code: [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)
- Project page: [Tauric Research](https://tauric.ai)

## Further Reading

- **[FinMem](https://arxiv.org/abs/2311.13743)** (Yu et al., 2023) — single-LLM trader with layered memory and character design. The most direct comparable, though absent from this paper's quantitative table.
- **[FinAgent](https://arxiv.org/abs/2402.18485)** (Zhang et al., 2024b) — multimodal trading agent emphasizing tool use, diversity, and generalization. A strong single-node analyst baseline.
- **[TradingGPT](https://arxiv.org/abs/2309.03736)** (Li et al., 2023b) — multi-agent + layered memory. A clear example of where pure natural-language message pools start to break down.
- **[MetaGPT](https://arxiv.org/abs/2308.00352)** (Hong et al., 2024) — software-engineering domain, but the original "structured SOP + free-form collaboration" pattern that TradingAgents' communication protocol descends from.
- **[ReAct](https://arxiv.org/abs/2210.03629)** (Yao et al., 2023) — the reasoning-plus-acting prompting pattern every agent in TradingAgents follows under the hood.

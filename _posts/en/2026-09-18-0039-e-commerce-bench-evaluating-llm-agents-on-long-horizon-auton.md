---
layout: post
title: "[Paper Review] E-Commerce Bench: Evaluating LLM Agents on Long-Horizon Autonomous Business Operation"
date: 2026-09-18 08:10:45 +0900
description: "A year of simulated commerce exposes distinct strengths in profit, liquidity, fraud avoidance, and experience reuse across 18 LLM agents."
tags: ["llm-agents", "long-horizon", "e-commerce", "negotiation", "benchmark", "agent-memory"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/fig3-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/
ko_url: /papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/
---

{% include lang_toggle.html %}

## Metadata

| Field | Value |
|-------|-------|
| Authors | Wei Fan et al. (11 authors, Qwen · Taobao & Tmall · HKUST) |
| Venue | arXiv · 2026 |
| arXiv / DOI | [2608.30730](https://arxiv.org/abs/2608.30730) |
| Code | [QwenLM/E-CommerceBench](https://github.com/QwenLM/E-CommerceBench) |
| Data | Simulated commerce with 12 store types, 60 categories, 6,886 SKUs, and 576 suppliers |
| <span style="white-space: nowrap">Review date</span> | 2026-09-18 |

## TL;DR

- E-Commerce Bench gives an agent ¥100,000 and 365 simulated days to operate online stores. Procurement, negotiation, inventory, shipping, returns, and settlement create consequences that span days or months.
- A rule-based simulator controls economic transitions and bargaining decisions, while supplier LLMs mainly provide conversational expression. Seven dimensions separate final assets from negotiation, fraud avoidance, solvency, efficiency, execution, and experience reuse.
- Across 18 models and 90 episodes, GPT-5.6 Sol leads with approximately ¥1.43 million in final assets, yet 18.48% of its procurement spending goes to fraudulent suppliers. No model reaches the top five on every dimension.
- Qwen3.8-Max-Preview has the best AnchorRatio, 0.834, and the only significantly positive anchoring signal. This supports a narrow claim about sequential price discipline, not general continual learning.
- The main lesson is that earning money, keeping cash available, and applying previous experience are distinct capabilities. Fixed markets, metric definitions, and potential supplier-identifier leakage constrain the conclusions.

## Introduction

Buying cheaply and selling at a markup sounds like a complete business strategy until settlement delays arrive. A profitable store can run out of spendable cash before yesterday's sales become available. A supplier can negotiate convincingly and then underdeliver. Inventory that sold well in one season can become an increasingly expensive warehouse liability in another.

These dependencies make commerce useful for evaluating agents. A short task usually has a target state and a stopping point. Running a business requires maintaining objectives while new information arrives and earlier decisions keep producing consequences. Remembering a previous transaction is only useful if it changes the next purchase, price, or inspection.

E-Commerce Bench turns these requirements into an explicit simulation. Its contribution is as much diagnostic as competitive: the highest earner can remain weak at avoiding fraud or controlling returns. This review follows the 18-model experiment in arXiv v1. The repository's newer leaderboard contains additional models, whose results are not mixed into the paper's comparisons.

## Key Contributions

- **Connected economic decisions:** A 365-day environment combines bargaining, demand, inventory, fulfillment, returns, and delayed settlement.
- **Separation of rules and dialogue:** A negotiation kernel determines economic outcomes, limiting the authority of a supplier LLM's generated language.
- **Seven diagnostic dimensions:** Final assets are accompanied by measurements of bargaining, fraud spending, drawdown, tool efficiency, controllable returns, and repeated-purchase behavior.
- **Trace-based failure analysis:** Ninety complete episodes reveal liquidity mistakes, delayed fraud detection, repetitive operations, and failures to enforce remembered prices.

## Related Work / Background

### Long-horizon evaluation and delayed feedback

[Vending-Bench](https://arxiv.org/abs/2502.15840) is a close predecessor that studies coherence through vending-machine operation. E-Commerce Bench extends the business setting with multiple stores, negotiations, dishonest suppliers, and returns. The challenge is not simply episode length. Bargaining resolves within a conversation, whereas inventory costs and reputation changes accumulate over much longer periods.

Negotiation success also needs more than a deal-rate metric. Accepting every demand can produce agreements without producing good purchases. [TERMS-Bench](https://arxiv.org/abs/2605.13909) provides a related diagnostic perspective. Here, bargaining must additionally compete with other responsibilities: saving a little on procurement can be counterproductive if it consumes the time needed to ship orders.

### Retained context and applied experience

“Learning” means improving behavior within an episode through available history and memory. It does not involve gradient updates to model weights. [Reflexion](https://arxiv.org/abs/2303.11366) provides relevant background on linguistic feedback and memory, but this benchmark does not establish the effect of a particular reflection technique.

Storing a price, retrieving it, and enforcing it are separate steps. The paper includes an agent that explicitly remembers a cheaper purchase and nevertheless accepts a worse deal. Treating every such failure as forgetting would miss the distinction between information access and decision discipline.

## Method / Architecture

### 1. Store operations and eighteen tools

The agent begins on January 1, 2026, with ¥100,000. It can operate four concurrent stores, with no duplicate store type. The world contains 12 store types, 60 categories, and 6,886 SKUs. Of 576 suppliers, 424 are honest and 152 implement one of five fraud types.

{% include figure.liquid loading="eager" path="assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/fig3-architecture.png" class="img-fluid rounded z-depth-1" caption="Figure 3: Agent, store tools, supplier negotiation, and simulator connections with daily state updates." zoomable=true %}

Eighteen tools cover research, procurement, negotiation, listings, pricing, shipping, withdrawals, inspection, and memory. Actions consume simulated working time within a 600-minute day, from 08:00 to 18:00. Opening a store takes 60 minutes, market research 30, shipping 20, and balance checks or withdrawals 10.

Batched tool calls execute sequentially. Crossing closing time advances the clock and triggers daily processing. A supplier-chat call takes 30 minutes even when it addresses several suppliers, so batching decisions matter. Waiting until the next day forfeits unused working time. Repeated inspection therefore competes with productive action.

### 2. Bank, escrow, and wallet cash flows

Purchases charge the bank immediately. Sales first create orders awaiting shipment, which must occur within two days. Shipping moves revenue, less a 2% commission, into escrow. Returns can arrive three to seven days after shipment and deduct the full retail price; commission and freight are not refunded. Funds mature into the wallet nine days after shipment, then require an explicit withdrawal to become bank cash.

{% include figure.liquid loading="eager" path="assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/fig6-cash-cycle.png" class="img-fluid rounded z-depth-1" caption="Figure 6: Top: cash transfers among bank, escrow, and wallet. Bottom: cash flows in yuan against days after procurement for a 40-unit order." zoomable=true %}

Ten consecutive morning checks with a negative bank balance cause bankruptcy, even if the wallet is positive. Available assets and available spending money are therefore different state variables.

Opening a store costs ¥500, daily operating costs are ¥60, ¥100, or ¥130 by tier, and storage charges increase with inventory age to nine times the base rate at 180 days. Listing stock does not remove its storage cost. Liquidation recovers only 10% of purchase cost. Daily processing order matters too: incoming inventory cannot retroactively satisfy demand already processed earlier that day.

### 3. Price, seasonality, reputation, and demand caps

Base demand is multiplied by price response, weekends, promotions, seasonality, events, and reputation. Category saturation, store capacity, and stock then constrain sales. The weekend multiplier is 1.3; reputation responds to shipment, cancellation, and return history.

{% include figure.liquid loading="eager" path="assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/fig7-demand.png" class="img-fluid rounded z-depth-1" caption="Figure 7: Left: four price-response families against price/reference ratio. Right: daily units after demand multipliers and saturation constraints." zoomable=true %}

The worked example reaches 128.2 units before constraints but sells only nine. A large promotional multiplier cannot bypass a capacity bottleneck. Expanding within a category can also cannibalize demand.

Four price-response families are used: linear, exponential, constant-elasticity, and quadratic. The quadratic family can penalize departures below the reference price as well as above it. Promotional demand gains saturate at a 30% discount, although deeper discounts still change effective prices and margins. These are simulator assumptions, not universal retail laws.

Ten events and eight promotions change conditions during the year. Information appears through event notices and advance promotional announcements rather than complete initial disclosure. Suppliers can retire after a prescribed number of successful orders, making permanent reliance on one favorable relationship impossible.

### 4. Negotiation kernel and supplier dialogue

A seeded kernel associated with each supplier, SKU, and negotiation cycle determines acceptance, walkaway, and counteroffers. Suppliers have private cost floors and different concession behaviors. Counteroffers do not rise within a cycle or fall below the floor; rapid buyer concessions can make the seller firmer.

{% include figure.liquid loading="eager" path="assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/fig8-negotiation.png" class="img-fluid rounded z-depth-1" caption="Figure 8: Left: buyer and supplier prices in yuan by negotiation round. Right: repeat-purchase prices and previous minima across simulated days, with lost and retained anchors." zoomable=true %}

Structured `negotiate` JSON carries the buyer's action. Acceptance must match the standing price, and an agreement is counted only after order settlement. A fresh cycle changes the seed and potentially the opening quote while preserving the pair's cost floor. Previously achieved prices can consequently remain useful anchors.

The separation is substantial but incomplete. VIP-fee payment intent follows a separate language-classification path, supplier wording remains variable, and some delivery information is outside episode-seed control. A deterministic economic core does not make the entire interaction noise-free.

### 5. Pre-deal persuasion and post-deal fraud

Three schemes operate before purchase: membership fees, unfulfilled future discounts, and fabricated urgency. Two operate afterward: quantity bait delivers only 60–70% of ordered units, while quality downgrading raises defect rates.

Pre-deal scammers tend to concede less, but post-deal scammers' concession rates overlap those of honest suppliers. Bargaining behavior alone cannot expose every scheme. Detection requires matching orders to deliveries and waiting for delayed returns. When identical SKUs from several suppliers enter pooled inventory, attributing defects also becomes harder.

### 6. A 128K context budget and twenty memory entries

The common harness uses a 128K budget measured by a local tokenizer. At approximately 120K, it removes old assistant–tool groups with a release target of about 60K tokens, protecting the system message, initial user message, and newest two groups. It does not replace removed history with a summary. The 90 episodes contain 1,495 such evictions.

A separate memory tool maintains up to 20 titled entries outside context eviction. Reading an entry puts its text back into context and consumes simulated time. Results therefore describe a model–harness combination. The paper does not causally isolate the effects of alternative summaries, transaction ledgers, or retrieval systems.

## Evaluation Objectives / Metrics

### Final assets and bargaining surplus

The primary score adds bank balance, wallet, and escrow:

$$
A=b+w+e.
$$

Finalization cancels unshipped orders, processes outstanding returns, and drains escrow; final escrow is zero in all runs. Unsold inventory is excluded. This is a cash-based terminal score rather than a conventional balance-sheet valuation.

CSE+ averages captured surplus over settled agreements with honest suppliers. With reference retail value v, supplier cost floor c, and agreed price p, the per-deal quantity is:

$$
\text{captured surplus}=\frac{v-p}{v-c}.
$$

SE+ additionally assigns zero to concluded disagreements and equals agreement rate times CSE+. Abandoned, unfinished sessions are excluded. Deals are not weighted by quantity, so this measures selected bargaining outcomes rather than total purchasing savings.

### Fraud spending, drawdown, and tool efficiency

BadSpend% is the share of procurement charges paid to fraudulent suppliers, including membership fees. It counts the entire purchase even when some usable goods arrive. It is not net fraud loss. Model scores average episode percentages rather than pooling every monetary transaction.

The solvency proxy divides the largest peak-to-trough asset decline by the episode's maximum assets. Its denominator differs from a conventional drawdown measured relative to the preceding peak. Bank-based bankruptcy is recorded separately.

Tool efficiency divides five-run means:

$$
\text{profit per call}=\frac{\overline{A}-100{,}000}{\overline{N}_{\mathrm{calls}}}.
$$

It excludes API prices, token consumption, and latency. Averaging per-episode ratios instead would move GPT-5.5 from fourth to seventeenth, illustrating sensitivity when short bankrupt runs are present.

### Controllable returns and AnchorRatio

Controllable return rate measures expected additional returns attributable to pricing, excluding natural and defect-driven returns. Discounts can make it negative. Shipping effects mostly cancel between factual and counterfactual calculations, with zero contribution in 89 of 90 episodes. In practice this “execution” metric primarily reflects pricing.

AnchorRatio evaluates repeated purchases from the same honest supplier–SKU pair. Normalize purchase prices, compare each with the best previous price, and average the positive excess over repeat orders:

$$
\begin{aligned}
\pi_t &= \operatorname{clip}\!\left(\frac{p_t-c}{v-c},0,1\right), \\
m_t &= \min_{u<t}\pi_u, \\
\mathrm{AnchorRegret} &= \operatorname{mean}_{t}\max(0,\pi_t-m_t), \\
\mathrm{AnchorRatio} &= \frac{\mathrm{AnchorRegret}}{\mathbb{E}_{\mathrm{shuffle}}[\mathrm{AnchorRegret}]}.
\end{aligned}
$$

Pair indices are suppressed in the notation; regret pools repeat orders across eligible pairs within an episode, and the model score averages episode ratios. The denominator comes from 400 reorderings of the same observed prices within each pair. A ratio below one indicates better ordering than random. This controls for the fact that tightly clustered prices produce low raw regret without good memory. Repeat orders have equal weight regardless of quantity; episodes without repeat opportunities are excluded. The metric does not identify memory use as the cause of improvement.

## Evaluation Data and Pipeline

| Item | Paper setting |
|------|---------------|
| Models | 18: eight proprietary and ten open-weight under the paper's classification |
| Repetitions | Five per model, 90 episodes total |
| World | Fixed seed 20260122 and the 2026 calendar |
| Resources | ¥100,000, 600 working minutes per day, four concurrent stores |
| Termination | 365 days, bankruptcy, 4,000 turns, or three consecutive turns without tools |
| Context | Common 128K budget, history eviction, 20 memory entries |
| Inference | Thinking enabled where supported, model-specific effort, provider-default temperature and top-p |
| Aggregation | Five-run summaries including bankrupt episodes |

All episodes ended through the calendar or bankruptcy; the longest used 3,599 turns. Turn-cap truncation therefore does not explain the reported results. Five repetitions also do not mean five independent markets: the calendar and world structure remain fixed. Common tools standardize interaction without equalizing inference cost or internal computation.

## Experimental Results

### Final assets and divergent capability rankings

{% include figure.liquid loading="eager" path="assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/tab2-results.png" class="img-fluid rounded z-depth-1" caption="Table 2: Five-run performance and bankruptcies for 18 models. Final assets and standard deviations in thousand yuan; arrows indicating the preferred direction." zoomable=true %}

GPT-5.6 Sol (max) finishes with mean assets of ¥1,431,425, approximately 14.3 times its starting funds. Fable5 (max) reaches about ¥805,000 and GPT-5.5 about ¥702,000. GPT-5.5 nevertheless goes bankrupt twice in five runs, with substantial dispersion.

Qwen3.8-Max-Preview reaches ¥416,252, the highest within the paper's open-weight group and approximately 38% above GLM 5.2 (high), at about ¥301,000. These groups follow the paper rather than an independent assessment of current model availability. GLM's high setting also exceeds max, at roughly ¥115,000, but this comparison does not establish a general benefit from less reasoning.

{% include figure.liquid loading="eager" path="assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/fig9-profiles.png" class="img-fluid rounded z-depth-1" caption="Figure 9: Seven-dimensional profiles for six models, min–max normalized across 18 model means. Outward values: better performance. Dashed profiles: model median." zoomable=true %}

Claude Opus 4.7 (max) leads negotiation with CSE+ 0.811 and fraud avoidance with BadSpend 0.12%, yet ranks eighth in assets. Sol ranks first in assets but sixteenth in fraud spending, at 18.48%, and seventeenth in controllable returns. Strong performance elsewhere can compensate for persistent weaknesses.

No model ranks in the top five on all seven dimensions. Qwen3.8-Max-Preview is comparatively even, with a worst rank of seventh.

### Profit per call and routine operations

{% include figure.liquid loading="eager" path="assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/fig10-efficiency.png" class="img-fluid rounded z-depth-1" caption="Figure 10: Top: profit per tool call for 18 models, in yuan/call. Bottom: call-type shares for six models, in percent, with mean calls per episode at right." zoomable=true %}

Fable5 leads at approximately ¥479 per call versus Sol's ¥363. Its roughly 1,469 calls are 59.9% fewer than Sol's 3,668. Maximizing earnings and minimizing interaction are distinct objectives; neither number directly measures API cost efficiency.

Across runs, shipping, waiting, publishing listings, and withdrawing funds consume 71.8% of calls. State polling takes 14.7%, negotiation 6.0%, and memory 2.1%. Repricing accounts for only 0.66%; nine models average fewer than three repricing calls over a year. Much of the policy remains a routine operating loop despite changing market conditions.

## Analysis / Ablation

### Liquidity shortfalls and aging inventory

{% include figure.liquid loading="eager" path="assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/fig11-bankruptcy.png" class="img-fluid rounded z-depth-1" caption="Figure 11: A Qwen3.5-Plus bankruptcy episode from January to May 2026. Left axis: assets and bank balance in thousand yuan. Right axis: warehouse units. Shading: negative-bank interval." zoomable=true %}

Ten of 90 episodes end in bankruptcy. Across 17 episodes, there are 177 overdrawn mornings; wallet funds could cover that morning's shortfall in 66 cases. This counterfactual identifies missed withdrawals, not guaranteed eventual rescue.

Figure 11 shows a deeper failure. Qwen3.5-Plus expands stores and inventory early, then accumulates aging stock. Storage costs reach approximately ¥428 per day in May. On May 11 the bank is about ¥3,968 negative while the wallet holds only ¥2,622. Withdrawal alone cannot repair the position. Inventory scale and cash conversion must be managed together.

### Delayed evidence and repeat purchases

Every model incurs some fraud spending. Quality-downgrade suppliers account for 53.4% of aggregate spending on fraudulent suppliers, again a spending share rather than a loss share.

One GPT-5.5 trace orders 150 units and receives 103 without reconciling the delivery against the order. Another repeats a quality-compromised purchase after observing four sales and no returns. Because returns are delayed, that early zero is weak evidence of product quality. Repeated dealings show insufficient verification, but do not prove the agent knew about the fraud before every reorder.

### Sequential price discipline and narrow learning evidence

{% include figure.liquid loading="eager" path="assets/img/papers/0039-e-commerce-bench-evaluating-llm-agents-on-long-horizon-auton/tab16-learning.png" class="img-fluid rounded z-depth-1" caption="Table 16: Repeated-purchase AnchorRatio, regret, shuffle baseline, and within-year changes. AnchorRatio below one: more favorable sequential pricing than shuffled prices." zoomable=true %}

Qwen3.8-Max-Preview has AnchorRatio 0.834 and anchoring z-score +4.24, the only significantly positive result. Gemini 3.5 Flash also scores below one, at 0.918, but its z-score of +1.25 does not cross the same significance threshold. Sixteen models exceed one; the median ratio is 1.369.

Raw regret would give a different impression: Fable5 scores 0.036 against Qwen's 0.066, yet their normalized ratios are 1.573 and 0.834. Narrow price variation can produce low absolute regret without effective reuse of experience.

Splitting concluded negotiations into earlier and later halves by chronological order gives Qwen a surplus improvement of only +0.001, with considerable variation. Its anchoring result supports price discipline more clearly than broad year-long improvement. In a Sol trace, the agent remembers and proposes a previous price of 103.11, then accepts 116.74. Information retention does not ensure enforcement.

These are observational diagnoses, not controlled component ablations. They do not establish the effect of removing memory or changing the world seed.

## Limitations and Critical Assessment

### Fixed markets and uneven information

The shared world improves comparability but limits generalization. The appendix identifies a possible shortcut: numeric supplier-email identifiers separate honest and fraudulent suppliers across all 60 categories. It does not demonstrate that evaluated models exploited this signal.

Descriptions also label return risk as low in 20 categories whose actual rates are 20–35%, affecting 25.5% of SKUs. Poor decisions can therefore reflect inconsistent observations as well as reasoning weaknesses. Identifier randomization, aligned descriptions, and held-out calendars or supplier rosters would be useful follow-up tests; they are reviewer proposals, not established results.

### Metric scope and terminal incentives

Excluding unsold inventory and liquidating at 10% of cost creates incentives different from valuing an ongoing business. An agent that knows the terminal date can reduce late procurement.

Negotiation scores depend on selected deals and exclude unfinished sessions. BadSpend is not actual damage; controllable returns primarily reflect pricing; AnchorRatio describes price ordering without identifying its cause. The seven dimensions are useful precisely when these narrower definitions remain visible.

### Uncertainty and reproduction costs

Five runs provide limited resolution for unstable behavior. Fifteen models have BadSpend standard deviations larger than their means. Metric-specific exclusions also matter: GPT-5.5's AnchorRatio uses three episodes because its two bankrupt runs contain no repeat-purchase pairs.

Supplier language, some delivery information, and provider settings retain variability despite deterministic core rules. Public code replaces the paper's internal gateway with public provider connections. Running the environment is therefore different from exactly reproducing the leaderboard. Practical comparisons should additionally record token costs and wall-clock time.

## Takeaways

- **Track earnings and survival separately.** Mean assets can hide missed withdrawals, aging stock, and occasional bankruptcy.
- **Connect memory to action constraints.** Prior prices should influence purchase limits and verification, rather than merely appear in stored notes.
- **Inspect transactions after negotiation.** Order reconciliation and delayed-return tracking reveal failures that dialogue alone cannot expose.
- **Read capability labels through their formulas.** Fraud spending, realized damage, price ordering, and general learning are different quantities.
- **Test new worlds and isolate causes.** Market variation and controlled memory or accounting interventions would extend the current diagnosis.

## Installation and Usage

The official repository requires Python 3.10 or later and uses Apache-2.0. The following short example was checked against the README and `run.py` at [this commit](https://github.com/QwenLM/E-CommerceBench/tree/b84678071c424fc94713b0a9e1ae86c519bd74c7):

```bash
git clone https://github.com/QwenLM/E-CommerceBench.git
cd E-CommerceBench
python -m pip install -r requirements.txt
# Set GEMINI_API_KEY and OPENAI_API_KEY for the default supplier renderer
python run.py --model gemini-3.5-flash --max-days 10 --max-turns 50
```

The default supplier renderer is `gpt-4o-mini`; provider configuration is in `models_config.json`. The README also supports repeated full-horizon runs:

```bash
python run.py --model gemini-3.5-flash --runs 5
```

Defaults are 365 days and 4,000 turns, with multiple runs executed concurrently. This review checked configuration and arguments but did not rerun paid model evaluations. Record model IDs, reasoning settings, renderer, world seed, and termination reasons when comparing results.

## References

- [Paper and arXiv record](https://arxiv.org/abs/2608.30730): The 64-page v1 paper and appendix, providing the 18-model, 90-episode comparison.
- [Official repository](https://github.com/QwenLM/E-CommerceBench): Environment, configurations, execution tools, and results. Later model additions are excluded from the paper comparison here.
- [Project website](https://ecbench.github.io/): Benchmark overview and public results.
- Figures and tables: Fan et al. (2026), Figures 3, 6, 7, 8, 9, 10, 11 and Tables 2, 16, cited for research explanation and criticism. Rights remain with their respective holders. The paper's [arXiv non-exclusive distribution license](https://arxiv.org/licenses/nonexclusive-distrib/1.0/) is distinct from the code's Apache-2.0 license.

## Further Reading

- **[Vending-Bench: A Benchmark for Long-Term Coherence of Autonomous Agents](https://arxiv.org/abs/2502.15840)** (Backlund et al., 2025): A predecessor examining sustained coherence through autonomous vending-machine operation.
- **[TERMS-Bench: Diagnosing LLM Negotiation Agents Beyond Deal Rate](https://arxiv.org/abs/2605.13909)** (Zhang et al., 2026): A diagnostic treatment of negotiation quality beyond reaching agreements.
- **[Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366)** (Shinn et al., 2023): An approach to using linguistic feedback and memory to improve later agent behavior.

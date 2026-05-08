---
layout: post
title: "[Paper Review] Artificial intelligence in customer relationship management: A systematic framework for a successful integration"
date: 2026-05-03 10:00:00 +0900
description: "An interview-based 4-macro-phase, 13-step framework for integrating AI into CRM — with ethics by design and customer data centralization wired in from day one."
tags: [ai, crm, qualitative-research, ethics-by-design, framework]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/fig1-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0005-artificial-intelligence-in-customer-relationship-management/
ko_url: /papers/0005-artificial-intelligence-in-customer-relationship-management/
---

{% include lang_toggle.html %}

## Bibliographic info

| Field | Value |
|-------|-------|
| Authors | Cristina Ledro, Anna Nosella, Andrea Vinelli (University of Padova) · Ilaria Dalla Pozza (IPAG Business School) · Thomas Souverain (ENS Paris / DreamQuark) |
| Venue | *Journal of Business Research* 199, Article 115531 · 2025 (open access, CC BY) |
| DOI | [10.1016/j.jbusres.2025.115531](https://doi.org/10.1016/j.jbusres.2025.115531) |
| Data | 25 semi-structured interviews, 4 rounds, June 2021 – May 2022 |
| Reviewed | 2026-05-03 |

## TL;DR

- The authors interview 25 C-level executives, providers, and experts, code the transcripts with the Gioia methodology, and distill **a 13-step, 4-macro-phase framework for integrating AI into CRM**. Two consultants from SugarCRM and Microsoft Dynamics validate the result.
- Where prior AI-integration frameworks march linearly from strategy to data to model to scale, this paper argues that **CRM's cross-functional and iterative nature** forces an ethics committee, customer data centralization, and people learning to run *in parallel from step one*.
- Five things make this framework distinctive: ethics by design (anchored in Hub France IA's seven principles), 360° customer data centralization, KPIs and monitoring defined upfront, top-down centralized governance, and scalability planned during framing.
- The failure cases (CC4 in insurance, CD5 in foodservice equipment) illustrate the cost of starting with the assumption that "AI will figure it out": data, KPIs, and domain expertise all unravel together.

## Introduction

CRM combines marketing strategy with IT to maximize stakeholder value, and over the past decade *De Bruyn et al. (2020)*, *Kumar et al. (2020)*, and *Huang & Rust (2021)* have all called AI the "next frontier" for CRM. Yet empirical research on *how* to integrate it is scarce. The literature splits in two directions.

The first thread asks *why* organizations should adopt AI in CRM and *what* drives adoption. *Chatterjee et al. (2019, 2021)* and *Dastjerdi et al. (2023)* model the decision through organizational agility, social pressure, and external policy. The second thread, including *Lee et al. (2019)*, *Reim et al. (2020)*, *Herremans (2021)*, and *Shrivastav (2021)*, proposes generic AI integration lifecycles, but most are conceptual or built on secondary data and ignore CRM specifics. The closest CRM-adjacent work, *Holmlund et al. (2020)*, is restricted to big data analytics for customer experience.

The authors fill that gap with the question **"How does integration of an AI application into CRM take place?"** This is not adoption but full implementation and governance. They collect 25 semi-structured interviews across four rounds, code them inductively with *Gioia, Corley, & Hamilton (2013)*, condense more than 100 first-order categories down to 46, and abstract them into 13 steps and 4 macro-phases. The result reads like a workshop checklist a company could pick up next quarter.

Two reasons to read this in 2026. First, **after ChatGPT every company says "let's put AI into our CRM" without knowing where to start**, and a step-by-step framework distilled from 25 real cases is the most concrete launching pad available. Second, the paper turns ethics by design from a discussion topic into a sequence of executable mechanisms — ethics committee, seven principles instantiation, A/B testing windows, human-on-the-loop fallbacks — which lines up neatly with the governance demands of GDPR and the EU AI Act.

## Key contributions

- **A 13-step, 4-macro-phase framework for AI-CRM integration.** Where generic AI integration models (*Lee et al. 2019*, *Reim et al. 2020*, *Herremans 2021*) lay the steps out linearly, this paper draws explicit loops between steps 5 and 9 to capture CRM's iterative, cross-functional reality. Step 5 (data governance), step 6 (customer data centralization), and step 7 (people learning) are deliberately framed as transversal — they run throughout the entire integration rather than as one-shot phases.
- **The first empirical study focused on "how" rather than "why."** It directly answers the gap flagged by *Ledro et al. (2022)* in their bibliometric review. The maximum-variation sample of 25 cases — successful and failed, across seven industries and four countries — gives the framework reasonable generalizability.
- **Ethics by design as concrete mechanisms.** The seven principles (Privacy, Safety, Fairness, Responsibility/Accountability, Explainability, Well-being, Autonomy), drawn from Hub France IA (2023) and *Bourgais & Ibnouhsein (2022)*, are operationalized through an ethics committee, cross-disciplinary stakeholders, and recurring compliance reviews wired into specific steps.
- **Customer data centralization promoted to a strategic prerequisite.** Centralization is framed not as system integration but as a CRM strategy decision — pulling structured and unstructured data into a single data lake or customer data platform is step 6, not an afterthought.
- **Cultural foundations, KPIs, and scalability moved into framing.** Whereas earlier work treats culture, performance evaluation, and scaling as late-stage concerns, this framework forces customer-centric culture, KPI definition, and scaling plans into steps 1 through 4. The authors argue that this shift is what separates the successful cases from the failed ones.

## Related work and background

CRM is not just a sales tool. Following *Payne & Frow (2005)*, *Boulding et al. (2005)*, and *Lemon & Verhoef (2016)*, it is a strategic concept that fuses marketing, IT, and organizational design to maximize customer value. It usually splits into operational CRM (sales/marketing automation), analytical CRM (customer data analytics), and collaborative CRM (cross-channel coordination), and this paper covers AI's penetration into all three.

The lineage of AI integration frameworks runs along two tracks. The **generic AI lifecycle** track includes *Reim et al. (2020)* with their four-step roadmap (upper management → BM/ecosystem understanding → capability tailoring → organizational acceptance), *Herremans (2021)* with an eight-step strategy framework, *Shrivastav (2021)* with a five-step supply chain AI lifecycle, *Lee et al. (2019)* with five business-model implementation steps, and *Makarius et al. (2020)* with a sensing-comprehending-acting-learning model. They share the same broad axes — strategic formulation, people engagement, data management — but they are all conceptual or grounded in secondary data. The **context-specific** track includes *Holmlund et al. (2020)* (CX), *Shrivastav (2021)* (SCM), *Fenwick et al. (2023)* (HR), and *Bonetti et al. (2023)* (retail). Even the closest one, *Holmlund et al. (2020)*, focuses on big data analytics rather than AI integration in the broader sense.

For CRM specifically, prior work focuses on adoption: *Chatterjee et al. (2019, 2021)* with an organizational readiness framework and a TAM2-based adoption model, *Dastjerdi et al. (2023)* with external pressures (policy, customer demand). All cover *why*, none cover *how*. The direct predecessor of this paper, *Ledro et al. (2022)*, is a bibliometric review of 212 papers from 1989 to 2020 that explicitly calls out the absence of empirical research on the AI-CRM integration *process* — and the present 2025 paper is the same group's empirical follow-up.

Methodologically, the work follows *Gioia, Corley, & Hamilton (2013)*: open coding for first-order categories, axial coding for second-order themes (the steps), and aggregate dimensions (the macro-phases). On top of that, *Yin (2014)*'s within-case plus cross-case comparison surfaces patterns that hold across industries, countries, and outcomes.

## Method and framework in detail

### Data collection and coding

The authors ran 25 semi-structured interviews across four data-collection rounds (June 2021 – May 2022), following a separate Round 0 protocol pilot with one tech-company AI/ML-CRM project manager (C00). The sample was built on a maximum-variation principle. The 25 respondents in Rounds 1–4 came from 13 companies (group C: CA–CM), 6 providers/consultants (group P: PA–PF), and 3 domain experts (group E: EA–EC). Three companies (CB, CG, CH) contributed two interviewees each, which is how the count reaches 25. Industries span insurance, banking, food retail, automotive, telecom, fashion retail, and manufacturing — seven sectors total. Company sizes range from 1–50 SMEs to 50,000+ enterprises, and locations cover Italy, France, Switzerland, and Norway. Outcomes are deliberately mixed between success (S) and failure (U). All respondents have at least five years of CRM/AI experience and hold C-level positions (CDO, CIO, CEO, CTO, AI center of excellence director).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/tab2-sample.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: Sample characteristics — 25 interviewees in Rounds 1–4 (16 company informants from 13 companies, 6 providers, 3 experts) plus a separate Round 0 protocol pilot. Industry, size, country, and success/failure status are intentionally mixed."
   zoomable=true %}

To reduce recall bias, only respondents whose AI-CRM project had launched within the past year were included. Data collection and analysis ran in parallel, so emerging concepts shaped the next round's interview guide. Approximate theoretical saturation was reached at the end of Round 3, and Round 4 confirmed it (no new insights). Triangulation drew on company websites, official documents, news, videos, and reports, and several cases were cross-checked with a second interviewee.

Coding was done in ATLAS.ti following *Strauss & Corbin (2000)*'s open-axial procedure. The team distilled more than 100 initial first-order categories into 46, grouped them into 13 second-order steps, and rolled them up into 4 aggregate macro-phases. Cross-case comparison contrasted successful and failed implementations, and the framework's usefulness was validated with consultants from SugarCRM and Microsoft Dynamics (Appendix B, Table B1).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/tab4-coding.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4: Gioia coding results — 46 first-order categories collapse into 13 second-order steps (steps 1–13), which roll up into 4 aggregate dimensions (macro-phases 1–4)."
   zoomable=true %}

### Range of AI applications covered

The AI applications deployed by the respondent companies span all three CRM areas. In **marketing**, predictive analytics for customer segmentation, NLP-driven email/promotion automation, recommendation systems for catalog and value proposition personalization, sentiment analysis and social listening, and detractor-customer prediction all appear. In **sales**, supervised ML for pricing and fraud detection, predictive analytics for client/opportunity prioritization, and best-offer recommendation are common. In **customer service**, personalization algorithms, chatbots, deep-learning NLP for email/text classification, automatic claims handling, document classification and routing, and life-event prediction are the standard use cases.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/tab3-ai-applications.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: AI applications used by the interviewed companies, grouped by CRM process (marketing, sales, customer service). Codes in parentheses map to company IDs in Table 2."
   zoomable=true %}

This breadth matters because the framework is not anchored to a single application like chatbots. It has to be a common integration path that predictive analytics, NLP, recommendation, and automation can all flow through.

### The 4 macro-phases and 13 steps

The whole framework lives in one diagram. The top half is planning and the data/people phase, the middle is model implementation, and the bottom is assessment and scaling. The bidirectional arrows between steps 5 and 9 capture the iterative loops — integration is not linear.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/fig1-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: Framework of the integration of a successful AI application in CRM. Four macro-phases (planning / data·people / model implementation / assessment·improvement) and 13 steps. Steps 5–9 are connected by bidirectional loops."
   zoomable=true %}

Walking through each macro-phase:

#### Macro-phase 1: AI-CRM integration planning

**Step 1. Strategic goal setting and team formation.** Pin down the business objective from the start. The respondents argue for KPIs split into five categories — algorithm performance, customer metrics, organizational sustainability, processes, and user/employee impact (Table A3). Companies that began with vague, sweeping ambitions failed (CC4 tried to automate global insurance policy comparison — too complex an underwriting process for AI to crack). At the same time, build a multidisciplinary team: CDO, domain expert, data scientist, IT lead, ethics expert, and a requirements engineer all in the room from day one.

**Step 2. Ethics by design for customers, users, and society.** Stand up an ethics committee. Following *Bourgais & Ibnouhsein (2022)*'s ethics-by-design idea and Hub France IA (2023)'s seven principles — Privacy, Safety, Fairness, Responsibility/Accountability, Explainability, Well-being, Autonomy — instantiate them in the company's strategy. If you're using NLP to draft customer emails, set guidelines that prevent the system from reinforcing gender or ethnic stereotypes. The point is that ethics becomes a design constraint, not a side activity.

**Step 3. Customer data comprehension.** Understand what data you have, who owns it, where it sits, why it was collected, and how it's managed (data capital). Then check whether it's actually useful for AI (data usefulness) and whether you can access it (data access). The CD5 case is a textbook failure: they assumed navigation data alone would be enough. CE6 is the model: anonymize age, email, gender, and address so the algorithm can run a churn risk prediction in a GDPR-compliant way.

**Step 4. Framing of AI-CRM organizational integration.** The heaviest step. Define how AI will deliver the goal, decide make vs. buy, set the budget, name ownership/sponsor/deadline, scan the external environment (PE12 notes that COVID-19 made many models obsolete overnight), specify roles in the multidisciplinary team, integrate the ethics committee, set outputs and boundaries, plan IT integration, design the measurement approach, and lay out scalability. The thoroughness here decides the fate of every later step.

#### Macro-phase 2: Data governance and people learning and growth

This macro-phase is not bounded by a single step — it's a transversal layer that runs through the entire integration.

**Step 5. Data governance throughout AI-CRM integration and evolution.** Design the conceptual data representation, fill data gaps, and integrate sources from inside and outside. Reduce manual entry (PD11 stresses log-based and dropdown fields to keep information from scattering). Validate, clean, and deduplicate on a recurring cadence. Recurring meetings should also validate ethical AI principles around privacy, fairness, and societal/environmental impact.

**Step 6. Customer data centralization throughout AI-CRM integration and evolution.** The most CRM-specific step. Structure customer data, reorganize information, and gather everything into one system. Some respondents call it a customer data platform, others a data lake. Either way, label, sync, and integrate with ERP, e-commerce, and other datasets. Crucially, redesign the CRM processes themselves and reorganize data from a *machine* perspective rather than just mirroring the human one (CE6). The output is a 360° omnichannel view of the customer.

**Step 7. People learning and growth throughout AI-CRM integration and evolution.** Bring in a multidisciplinary, multicultural team and run training across the whole organization that explains AI's purpose, capabilities, limits, and risks. CF7 trained 300,000 employees on data topics. CC4 is the counter-example: "we never did ongoing internal resource development — that was one of the pitfalls." Bake accountability and well-being principles into the training to lift the ethical baseline of the workforce.

#### Macro-phase 3: AI model implementation and governance

**Step 8. Development of the AI model applied to CRM.** Split data into training, validation, and test sets and fit the model. Strip out discriminatory variables through manual review and check for skewness (CF7). Use the validation set to balance accuracy and algorithmic efficiency. Push hard on explainability and transparency — predictive models in particular should expose how predictions are generated and offer intermediate results. PC10's good practice: clarify how the algorithm was built and call out the top three factors driving each prediction.

**Step 9. Users' feedback analysis for AI model testing and adjustment.** Run the model in a test environment and balance performance against ethical concerns. Operational tricks include regular A/B testing, end-to-end approaches, avoiding low-engagement windows like summer holidays (CB3), and gathering user feedback before rollout (CF7, CG14). **Human on the loop**: fallback to human operators (CG14, PF18), combine AI predictions with human judgment (CF7), satisfaction assessments (PC10), and routine monitoring of data and concept drift by experts (C00, CB3, PE12). Every data refresh requires a fresh check for biases or ethical concerns and may loop back to step 5.

**Step 10. Rollout of the AI model applied to CRM.** Push the final model into production. First, decide how the output appears in the user's workstation (CJ22). Then integrate into the IT system, building data journeys and connections, and tackling legacy system challenges (PC10). Collaborative planning between business and IT is essential, and change management plus user training run alongside the technical rollout.

**Step 11. AI model retraining and governance throughout AI-CRM integration and evolution.** Like steps 5–7, this one is transversal. Retraining cadence varies — customer behavior monitoring might need updates every few months, while technical systems may need daily adjustment (CG13). Employee and end-user feedback catches performance issues that data alone misses. Data scientists own the retraining work and automated alerts trigger updates when drift appears.

#### Macro-phase 4: Assessment and improvement of AI-CRM integration

**Step 12. Performance assessment throughout the AI-CRM evolution.** Measure and monitor the KPIs defined back in step 1. Alignment with customer-facing goals is dynamic, so it needs continuous evaluation and adjustment. Human oversight covers the context AI misses — experienced employees validate and refine outputs while data scientists actively monitor the system.

**Step 13. Scaling of the AI application.** Start with a single product or region, prove reliability, then expand (PC10). Move from short-term proof of concept to long-term, sustainable models — the "proof of permanence" (PA8). Customizing for different markets and regulatory contexts is essential, so collaboration between technical teams and business units determines whether scaling is sustainable.

### A manager's checklist

The authors compress the framework into a step-by-step set of guiding questions for managers (Fig. 2). Step 1, for example, prompts: "What is your business objective? Which KPIs will you measure? Who is the sponsor? Who is on your multidisciplinary team?" It's specific enough to walk into a quarterly review workshop and use directly.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/fig2-guidelines.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: Manager-facing guiding questions for each of the 13 steps. Designed for direct use in AI-CRM integration workshops."
   zoomable=true %}

## Core analysis: literature vs. new empirical insight

Appendix C, Table C1 lays out where the authors see this work moving past prior literature. Eleven axes, summarized:

- **Cultural foundations and strategic alignment.** Prior: culture as a late-stage concern (*Herremans, 2021*). Here: customer-focused culture *before* AI integration begins.
- **Project sponsorship.** Prior: sponsorship matters (*Bonetti et al., 2023*). Here: dual sponsorship — technical *and* ethical.
- **KPIs and continuous monitoring.** Prior: post-deployment evaluation (*Herremans, 2021*; *Holmlund et al., 2020*). Here: KPIs defined and monitoring modules built from implementation onwards.
- **Top management support and cross-functional collaboration.** Prior: collaboration matters in general. Here: cross-functional from the very start, with a centralized governance model.
- **Ethics by design.** Prior: general ethics discussion (*Jobin et al., 2019*). Here: an explicit framework — ethics committee, seven principles, recurring reviews — wired in as a design constraint.
- **Domain expert engagement.** Prior: experts involved in goal-setting. Here: ongoing engagement across the lifecycle.
- **Effective communication.** Prior: communication post-deployment. Here: communication initiated in planning.
- **External environmental factors.** Prior: rarely addressed. Here: market trends, regulation, and socioeconomic shifts monitored from framing onwards (the COVID-19 lesson).
- **Scalability.** Prior: late-stage concern (*Holmlund et al., 2020*; *Shrivastav, 2021*). Here: planned during framing.
- **Data comprehension and centralization.** Prior: focus on data quality/preparation. Here: centralization and customer-data comprehension elevated to dedicated steps.
- **User involvement and tacit knowledge.** Prior: user feedback collected during validation (*Shrivastav, 2021*). Here: users involved from planning, with explicit mechanisms for transferring tacit knowledge.
- **Ethical feedback loops and adaptability.** Prior: continuous improvement loops. Here: loops that explicitly cover ethics, privacy, and fairness.

These eleven contrasts are why the authors argue that generic AI integration frameworks don't survive contact with CRM.

## Reading the success and failure cases

The paper labels each case with success (S) or failure (U) and uses cross-case comparison to extract patterns. The failures share a few traits.

- **CC4 (Swiss insurer, U):** Tried to automate global policy comparison and analysis. The underwriting process turned out too complex; ambition outran the available data and domain capability. The same respondent admits to never running ongoing internal resource development — failures in step 1 *and* step 7.
- **CD5 (Italian foodservice equipment maker, U):** Assumed navigation data alone would suffice — a step 3 failure on the data usefulness side.
- **CI17 (Italian car dealership, U):** Tried to assess relationship intensity, but "we encountered difficulties in understanding how the data was originally entered" — a step 3 failure on data capital.

The successes share an opposite pattern.

- **CF7 (French food retailer, S):** Top-down approach, maturity and impact analysis, key-priority matrix to start. Trained 300,000 employees on data. Used ML to optimize omnichannel strategy. Strong on steps 1, 4, and 7.
- **CE6 (Italian insurer, S):** Anonymized customer data to predict churn risk. Built a big data lake to fold structured and unstructured data together. Strong on steps 3 and 6.
- **CG (Italian telecom, S):** Deployed a 24/7 virtual assistant, social media analysis, and sentiment analysis. A dedicated AI center of excellence director — step 1's multidisciplinary team done right.

The shared lesson is unambiguous. **The thoroughness of the planning phase (steps 1–4) determines the fate of the rest.** CC4 didn't fail because of weak ML models; it failed because step 1 set ambition above feasible data and step 7 was skipped. CF7 didn't succeed because of unique algorithms; it succeeded because steps 1, 4, and 7 were all executed seriously.

## Limitations and critical assessment

What the authors acknowledge:

- The interview scope doesn't fully capture the broader CRM landscape. Customer-facing employees and end users in particular are missing.
- The framework's usefulness was validated by only two consultants. Broader empirical testing is needed.
- Newer AI advances such as autonomous AI systems are not addressed — the framework may need updating.

What I'd add:

- **The data predates the generative-AI moment.** Interviews ran from June 2021 to May 2022; ChatGPT launched in November 2022. All 25 cases use "classical" ML — predictive analytics, NLP, recommendation. There are no LLM-based chatbots, RAG systems, or agentic CRM cases in the sample. The high-level structure looks transferable to generative AI, but step 8 (model development) and step 9 (testing) would need new sub-activities for prompt engineering, fine-tuning, hallucination checks, and prompt-injection defense.
- **Geographic bias.** The sample is Italy- and France-heavy with a few Swiss and Norwegian cases; the US and Asia are essentially absent. Ethics-by-design under EU GDPR and the EU AI Act gets emphasis, which is reasonable, but the framework doesn't address how step 2 priorities shift in jurisdictions with different data-protection regimes.
- **No quantitative cross-case analysis.** There's no measurement of which steps matter most. Qualitative quotes are rich, but no claim like "skipping step 1's KPI definition raises failure probability by X%" is on offer. That's a feature of qualitative work, but it points at a follow-up quantitative study.
- **The expert supply problem sits outside the framework.** Respondents repeatedly note the scarcity of people who combine domain expertise with data science. The framework tells you how to organize them once they're hired, not how to find them.
- **Both validators say they wouldn't follow the steps in order.** The SugarCRM and Microsoft Dynamics consultants both endorse usefulness while noting they'd reorder steps based on context. This matches the iterative design, but the paper offers no explicit guidance on which orderings are safe to break.

## Takeaways

- **AI-CRM integration is a process problem, not a model problem.** The 25 cases consistently show that the depth of steps 1–4 — not the choice of algorithm — drives outcomes. Before "what model should we use," answer "why are we doing this, what are the KPIs, who is in the room, what data is available."
- **Ethics by design is not rhetoric — it's the executable activities of step 2.** Stand up the ethics committee, instantiate the seven principles for your context, and run recurring compliance reviews. Without those mechanisms, "we pursue ethical AI" is a slogan. Under the EU AI Act, in 2026, that distinction has weight.
- **Customer data centralization is a strategic decision, not an ETL job.** Step 6 isn't ETL — it's redesigning the CRM process from a machine perspective. Building a data lake doesn't end the work; ensuring the same 360° customer view lands consistently across all channels and departments does.
- **Steps 5–9 are loops, not a sequence.** Data drift sends you back to step 5. Negative user feedback sends you back to step 8. The illusion of doing it once is the fastest road to failure — which is why the validators said they wouldn't follow the steps in order either.
- **People learning and growth is transversal because AI augments people rather than replacing them.** Step 7 is not one training session but a continuous layer. Human-on-the-loop fallbacks, AI-plus-human-judgment combinations, and satisfaction assessments are all in step 9. CC4's failure mode — "no ongoing resource development" — is the warning sign every executive should test their plan against.

## Notes for non-EU contexts

The sample includes no US or Asian companies, but a few extensions are worth noting if you're applying this framework outside the EU:

- **Different data protection regimes shift step 2.** In the US (sectoral laws, state-level patchwork) or Korea (PIPA, Credit Information Use and Protection Act, MyData licensing), step 2's seven principles need to be re-instantiated against a different legal grid. CE6's "anonymize then predict churn" workflow needs jurisdiction-specific consent flows.
- **Centralized governance hits federation boundaries.** The framework's preference for centralized AI governance can clash with US conglomerate or Asian *chaebol* structures where business units guard data autonomy. Where the AI center of excellence sits — at the holding company, under the CDO, or distributed — becomes a political question that the framework leaves open.
- **Step 7 training density depends on workforce composition.** CF7's 300,000-employee training is feasible at scale, but covering outsourced call centers and contract workers requires a separate training design.
- **Generative AI extends steps 8 and 9.** In 2026, most CRM teams are deploying LLM-based chatbots, RAG, and agentic workflows. Step 8 needs prompt engineering and fine-tuning sub-activities; step 9 needs hallucination, jailbreak, and prompt-injection testing to be operationally useful.

## References

- Paper: <https://doi.org/10.1016/j.jbusres.2025.115531> (Open Access, CC BY)
- ScienceDirect: <https://www.sciencedirect.com/science/article/pii/S0148296325003546>
- The same authors' bibliometric review: <https://doi.org/10.1108/JBIM-07-2021-0332>
- The seven ethical principles draw from Hub France IA (2023) and *Bourgais & Ibnouhsein (2022)*.

## Further reading

- **[Artificial intelligence in customer relationship management: literature review and future research directions](https://doi.org/10.1108/JBIM-07-2021-0332)** (Ledro et al., 2022) — The same group's bibliometric review of 212 papers from 1989–2020. It explicitly identifies the gap on AI-CRM "process" research that the 2025 paper fills empirically.
- **[Are CRM systems ready for AI integration? A conceptual framework of organizational readiness for effective AI-CRM integration](https://doi.org/10.1108/BL-02-2019-0069)** (Chatterjee et al., 2019) — A conceptual framework that organizes 16 critical success factors for AI-CRM readiness. The most-cited prior work that this paper builds on and contrasts with.
- **[Artificial Intelligence and Marketing: Pitfalls and Opportunities](https://doi.org/10.1016/j.intmar.2020.04.007)** (De Bruyn et al., 2020) — A *Journal of Interactive Marketing* paper laying out the pitfalls of AI in marketing — badly defined objective functions, unsafe learning environments, biased AI, explainability. Directly useful when designing steps 8 and 9 for the marketing slice of CRM.
- **[Implementation of Artificial Intelligence (AI): A Roadmap for Business Model Innovation](https://doi.org/10.3390/ai1020011)** (Reim et al., 2020) — A generic four-step roadmap for AI adoption. The 2025 paper cites it as a representative example of "linear, non-CRM-specific" frameworks. Worth reading to see what the generic case looks like before the CRM specifics are layered on.
- **[Ethics-by-design: the next frontier of industrialization](https://doi.org/10.1007/s43681-021-00057-0)** (Bourgais & Ibnouhsein, 2022) — The conceptual source for step 2's ethics-by-design approach. Explains why ethics belongs in design rather than post-deployment for industrialized AI.
- **[Practice co-evolution: Collaboratively embedding artificial intelligence in retail practices](https://doi.org/10.1007/s11747-022-00896-1)** (Bonetti et al., JAMS 2023) — A five-year ethnographic study of how AI co-evolves employee practices in retail. A deep retail-specific complement to step 7 (people learning and growth) in the present framework.

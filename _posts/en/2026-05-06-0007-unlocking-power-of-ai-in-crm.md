---
layout: post
title: "[Paper Review] Unlocking the power of AI in CRM: A comprehensive multidimensional exploration"
date: 2026-05-06
description: "A qualitative study that distills 1,055 papers down to 64, plus 24 in-depth interviews with CRM practitioners, to organize AI-powered CRM capabilities into three dimensions and eight sub-dimensions through a microfoundations-of-dynamic-capabilities lens."
tags: [ai-crm, dynamic-capabilities, scoping-review, qualitative-research, customer-relationship-management]
categories: paper-review
giscus_comments: false
related_posts: false
thumbnail: assets/img/papers/0007-unlocking-power-of-ai-in-crm/fig2-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: en
permalink: /en/papers/0007-unlocking-power-of-ai-in-crm/
ko_url: /papers/0007-unlocking-power-of-ai-in-crm/
---

{% include lang_toggle.html %}

## Meta

| Field | Value |
|------|------|
| Authors | Khadija Khamis Alnofeli, Shahriar Akter, Venkata Yanamandram (School of Business, University of Wollongong, Australia) |
| Venue | *Journal of Innovation & Knowledge* 10, Article 100731 · 2025 (open access, CC BY) |
| DOI | [10.1016/j.jik.2025.100731](https://doi.org/10.1016/j.jik.2025.100731) |
| Data | 64 academic articles (2002–2023, 36 journals) + 24 industry-expert in-depth interviews |
| Reviewed | 2026-05-06 |

## TL;DR

- This paper assembles AI-powered CRM *capabilities* not from a quantitative model but from a qualitative synthesis. It combines a six-stage scoping review (Arksey & O'Malley, 2005; Fowler & Thomas, 2023) with thematic analysis (Braun & Clarke, 2006), drawing on **64 articles plus 24 interviews** with practitioners who have been using AI-CRM systems for at least two years.
- The result is a structure of **three dimensions and eight sub-dimensions**. (1) **Data management**: data governance, data analytics, privacy & security. (2) **Multichannel integration**: content consistency, process consistency. (3) **Service offerings**: personalisation, automation, meaningfulness & novelty.
- The theoretical anchor is Teece's dynamic capabilities (DC) and, more importantly, their *microfoundations* — the individual- and group-level mechanisms by which behaviours, decisions, and routines aggregate into firm-level sensing/seizing/transforming. The paper closes a real gap: microfoundations have been underexplored in the AI-CRM literature.
- There is no new model or algorithm. What you get instead is a **conceptual framework plus a candidate measurement-scale pool (Table 6)** for each sub-dimension, intended as a launching pad for follow-up quantitative work.
- Limitations are clear-eyed: a small interview sample (n=24) skewed to Australia (50%) and the UAE (25%), thematic coding by a single research team, mixed B2C/B2B industries, and no causal link to financial outcomes. Even so, this is one of the most disciplined attempts so far to break "AI-CRM capability" — a phrase that usually does too much work — into measurable units.

## Introduction

AI-powered CRM is no longer a side project for the marketing team. The global CRM market is projected to grow from USD 18.1B in 2021 to USD 25.7B by 2032 at a 3.2% CAGR, and every major vendor — Salesforce Einstein, Microsoft Dynamics 365, SAP, Oracle, IBM Watson — now ships AI modules as core functionality. And yet, both academia and practice keep reporting the same kind of frustration: *we deployed it, but it didn't work*. CRM project failure rates land between 18% and 69%, with some executive interviews citing as high as 90% (Edinger, 2018). The surface causes — data quality, user resistance, integration failure — are all real, but underneath them sits a deeper question: **what exactly is the "capability" that an AI-powered CRM is supposed to create, and which micro-level behaviours and processes give rise to it?**

This paper takes that question head-on. It does so not with the usual SEM-with-200-survey-respondents approach, but by acknowledging the conceptual fragmentation of the field. Prior studies have looked at AI-CRM through RBV, TOE, TAM, value-sensitive design, brand personality, and several other lenses. As a result, papers about *data management*, *chatbot personification*, and *organisational absorptive capacity* all sit under the same umbrella but speak in mutually unintelligible vocabularies. This paper uses thematic analysis to flatten those vocabularies into a shared schema.

For a reader closer to the ML side of the world, the value here is twofold. First, the paper bridges the gap between *people who build models* and *organisations that deploy them*, using microfoundations as a translation layer. Second, the **candidate measurement scales (Table 6)** are immediately useful: each sub-dimension comes with five to fifteen draft items that you can adapt directly into an internal survey for evaluating your own AI-CRM rollout.

## Key Contributions

- **An integrated taxonomy of AI-CRM capabilities** — the three-dimension, eight-sub-dimension hierarchy in Fig. 2. It pulls apart what the prior literature had been treating as a single undifferentiated "AI-CRM" lump.
- **Theoretical anchoring in Teece's (2007) microfoundations of dynamic capabilities**. The paper does not just ask *what* AI-CRM does; it asks *which micro-level behaviours and routines* produce that capability. This fills a recognised gap (Magistretti et al., 2021; Chatterjee et al., 2022b) where the AI-CRM literature has stayed at the firm level.
- **Methodological triangulation** — six-stage PRISMA-based scoping review + 24 in-depth interviews + inductive thematic coding by two academic coders for inter-rater reliability. Each data source independently challenges and validates the others.
- **Three testable propositions (P1/P2/P3)**, one per dimension. Combined with Table 6's candidate measurement items, they give follow-up quantitative researchers a clear specification to instrument.
- **Practitioner-grade recommendations**: from data governance items (user involvement, access-rights monitoring) to multichannel image consistency, to perceived-reliability items for automation. These are scale candidates today, but they translate cleanly into operational KPIs.

## Related Work / Background

### Dynamic capabilities (DC) and their microfoundations

Dynamic capabilities (Teece et al., 1997; Teece, 2007) are an organisation's meta-ability to reconfigure its resources in changing environments, typically decomposed into sensing, seizing, and transforming. But DC itself is a firm-level abstraction — ask *which person, with which tool, making which decision* produces sensing, and the answer is empty.

That gap is exactly what **microfoundations** (Felin et al., 2012; Bojesson & Fundin, 2021; Hutton et al., 2021) tries to fill. It looks at individual cognition and motivation, team-level interactions, and procedural routines as the *micro-level mechanisms* that aggregate into firm-level capability. Reading AI-CRM through microfoundations, this paper argues that "AI-CRM capability" is not a vague organisational asset but the sum of **how individuals access, interpret, and trust data + how the organisation standardises and reconfigures those routines**.

### The prior AI-CRM literature

Table 1 summarises the prior work the authors lean on (Baabdullah et al., 2021; Chatterjee et al., 2021b/2022b/2022c; Ling et al., 2021; Li & Xu, 2022; Monod et al., 2023; Suoniemi et al., 2021; Youn & Jin, 2021; Zhang et al., 2020). Two patterns stand out. First, most studies use a single theoretical lens — usually RBV or TOE/TAM. Second, the outcome variable is almost always *adoption intention* or *firm performance*. So the field has answered "what predicts adoption" reasonably well, but "what kind of capability does the deployed system actually create" remains open.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/tab1-studies.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: Summary of prior AI-CRM studies. Theoretical foundations are scattered across RBV, TOE, TAM2, value-sensitive design, and brand personality, with study types ranging from empirical surveys to case studies and systematic reviews. That fragmentation is precisely why an integrated framework is needed."
   zoomable=true %}

### Two threads that matter most

The authors flag two specific lineages that this paper extends. (1) **Akter et al. (2022)** on dynamic data analytics capability — a self-citation by the second author, with a "data quality, data analysis, privacy" three-pillar structure that maps almost one-to-one onto this paper's *data management* dimension. (2) **Hossain et al. (2019)** on multichannel integration quality — a systematic review built around content and process consistency that this paper imports more or less directly into the *multichannel integration* dimension. Separately, **Huang & Rust's (2018)** mechanical / analytical / intuitive / empathetic intelligence taxonomy informs the automation-to-meaningfulness gradient inside *service offerings*.

## Method / Architecture

There is no model architecture here. The research design itself is the largest section: a hybrid of a six-stage scoping review (Arksey & O'Malley, 2005, updated by Fowler & Thomas, 2023) and inductive thematic analysis.

### The six-stage scoping review

1. **Stage 1 — Define the research question**: "What are the dimensions and sub-dimensions of AI-powered CRM capabilities, and how do they inform and extend existing theoretical frameworks?"
2. **Stage 2 — Identify relevant studies**: searching Business Source Complete, ProQuest, Scopus, and Web of Science with combinations of *"AI" AND "CRM"*, *"artificial intelligence" AND "customer relationship management"*, *"automation and CRM"*, *"technological innovation and CRM"*, and *"CRM analytics"*. English-language only, through the end of 2023. Initial result: 1,055 records.
3. **Stage 3 — Study selection**: 1,055 → 724 duplicates removed → 331 screened → 39 retained (after stripping out unrelated meanings of "CRM" such as *coefficient of residual mass*) → 25 added via cross-referencing → **64 included**. The PRISMA flow (Fig. 1) makes the funnel explicit.
4. **Stage 4 — Charting**: each of the 64 papers is coded for citations, theoretical framing, methods, and key findings.
5. **Stage 5 — Qualitative interviews (n=24)**: two channels. (a) Zoom 1:1 in-depth interviews of 45–60 minutes, semi-structured. (b) Phone or written PDF responses for a small minority. The interview guide is published in Appendix A. The participants — managers, marketers, data scientists, CTOs — had been using AI-CRM systems (Salesforce, Microsoft Dynamics 365, SAP, IBM Watson, Adobe, Oracle and others) for at least two years. Demographics: 50% Australia, 25% UAE, 71% male, average tenure 5–10 years.
6. **Stage 6 — Collate and report**: inductive thematic analysis (Braun & Clarke, 2006), with two academic coders working toward consensus to maintain inter-rater reliability.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/fig1-prisma.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: PRISMA flowchart — 1,055 records → 724 duplicates removed → 331 screened → 292 excluded → 39 retrieval → 25 added through cross-referencing → 64 finally included. The explicit removal of acronym collisions (compensatory reserve metric, community readiness model, etc.) is a nice methodological detail."
   zoomable=true %}

### The thematic-coding procedure

To reduce 64 papers and 24 interviews into the same coding scheme, the authors apply inductive thematic analysis. (1) Open coding line-by-line on interview transcripts and paper excerpts. (2) Cluster similar codes into sub-themes. (3) Cluster sub-themes into dimensions. The product is Table 4 (literature pattern) and Table 5 (interview quote → sub-dimension → dimension).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/tab4-themes.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4: Distribution of the eight sub-dimensions across the literature, mapping 21 prior studies (from Wamba et al., 2017 to Lee et al., 2019) onto the dimensions with X marks. Data analysis is the most widely covered, while content/process consistency and meaningfulness are comparatively sparse — pointing at where the sub-dimensions still need empirical depth."
   zoomable=true %}

### Sample limits and trustworthiness

The recruitment funnel: 239 LinkedIn outreaches → 14 purposive consents → 13 snowball additions → 27 responses → 3 dropped for incompleteness → 24 final. Saturation is declared once new transcripts stop adding new codes (Saunders et al., 2018). Trustworthiness rests on Denzin & Lincoln's (2008) four pillars — triangulation, peer review, member-checking, audit trail.

The authors openly flag the 50% Australia + 25% UAE bias (McKnight, 2007). So the framework is, for now, a generalisation grounded in English-speaking and Middle Eastern markets and tech-forward enterprises.

### Interview demographics

| Field | Distribution |
|------|------|
| Gender | Male 71%, Female 29% (n=24) |
| Age | 30–35 (25%), 36–45 (46%), 46–50 (8%), 51–55 (13%) |
| Management level | Middle (54%), Top (25%), Low (21%) |
| Residence | Australia 50%, UAE 25%, UK 8%, Canada/NZ/Saudi/Nigeria 4% each |
| Tools used | Salesforce, Microsoft Dynamics 365, SAP, IBM Watson, Adobe, Oracle, Power BI, SAS, Avaya, HubSpot, Pega Marketing, etc. |
| Experience | 2+ years on AI-CRM (purposive criterion); 5–10 years average professional experience |

## Objective / Loss Function

There is no learning objective or loss function — this is not a quantitative model. If we had to express the *analytic* objective of thematic analysis as a loss, it would look something like:

$$
\mathcal{J}_{\text{thematic}} = \underbrace{\sum_{q \in \text{quotes}} \mathbb{1}[\text{code}(q) \in \text{theme}]}_{\text{coverage}} - \lambda \cdot \underbrace{|\text{themes}|}_{\text{parsimony}} - \mu \cdot \underbrace{\sum_{c, c'} \text{disagreement}(c, c')}_{\text{inter-rater inconsistency}}
$$

A good thematic schema is one that simultaneously covers enough quotes, doesn't fragment into too many themes, and shows low disagreement between coders. The paper doesn't put numbers on $\lambda$ or $\mu$, but the two-coder consensus procedure plus Cole's (2024) inter-rater reliability checks are how those last two terms are kept in check.

## Training Data and Pipeline

### Literature data

| Field | Value |
|------|-----|
| Search databases | Business Source Complete, ProQuest, Scopus, Web of Science |
| Time range | 2002 – 2023 |
| Initial hits | 1,055 |
| Final included | 64 (across 36 journals) |
| Dominant outlets | Industrial Marketing Management (21.9%), Harvard Business Review (4.7%), Journal of Business Research (4.7%), Journal of Product Innovation Management (4.7%) |
| Quality gate | ABDC rank ≥ C (up to A*), ABS rank ≥ 2, SJR ≥ Q3 |

### Interview data

| Field | Value |
|------|-----|
| Recruitment | LinkedIn outreach to 239 → 14 purposive + 13 snowball → 27 responses → 24 final |
| Duration | 45–60 minutes, Zoom or phone |
| Format | Semi-structured (Robson, 2002 interview schedule) |
| Topic areas | What AI-CRM means, key components, benefits, challenges, personalisation, automation, data, eight themes total |
| Analysis | NVivo (or equivalent manual coding), Excel cross-tabs |
| Coding | Inductive thematic analysis (Braun & Clarke, 2006), two-coder consensus |
| Ethics | Signed consent, anonymisation, IRB approval (referenced in the paper) |

## Results

"Results" here means *the dimensions and sub-dimensions themselves and how they were validated*, not model performance. The story unfolds in three stages.

### Result 1 — Deriving the three-dimension, eight-sub-dimension framework

Fig. 2 is the diagram that anchors the paper. It deserves to be cited from anywhere in the manuscript.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/fig2-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: The paper's signature diagram. AI-Powered CRM Capabilities branch into Data Management / Multichannel Integration / Service Offerings, which then expand into eight sub-dimensions."
   zoomable=true %}

#### Data management capability

- **Intelligent data governance**: who owns, who accesses, who is accountable for what data. Whether the organisation has a "single source of truth" (Interviewee #3).
- **Data analytics**: descriptive (what happened?) → predictive (what will happen?) → prescriptive (what should we do?), the three-stage scheme of Fantini & Narayandas (2023). Most interviewees flag *predictive* as the most transformative.
- **Data privacy and security**: GDPR compliance, breach response, encryption, anonymisation. From the transcripts: *"Data privacy and data breaches are very common issue in the AI industry"* (Interviewee #3, Male 30).

#### Multichannel integration capability

- **Content consistency**: whether the same message, promotion, and service performance are uniform across channels. The paper cites Simpson (2019, via Techipedia) on the ~20% drop in perceived brand quality when consistency breaks.
- **Process consistency**: regardless of channel, whether the underlying process (refunds, KYC, escalations) stays uniform. Drawn straight from Hossain et al. (2019/2020a).

#### Service offerings capability

- **Personalisation**: customer-segmentation-driven 1:1 responses. *"The more personalised the content you can create, the higher the chances that your customers will be happy"* (Interviewee #17, Male 34).
- **Automation**: removing humans from repetitive work. Most interviewees treat the *perceived reliability* of automation ("the system rarely makes mistakes") as the headline KPI.
- **Meaningfulness and novelty**: beyond speed and accuracy — is the experience *meaningful and novel* to the customer? Pairs cleanly with Akter et al.'s (2023b) service-innovation scales.

### Result 2 — The audit trail in Table 5

Table 5 is what makes the qualitative analysis defensible rather than ad hoc. Every interview quote is mapped to a specific code, sub-dimension, and dimension on the same row, so a reader can see exactly how the coding choices were made.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/tab5-data-structure.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5: The data structure that traces interview quote → code → sub-dimension → dimension. This is the single most important trustworthiness artefact in the paper — readers can challenge the coding directly."
   zoomable=true %}

### Result 3 — Candidate measurement scales (Table 6)

This is the most operationally useful part. Each sub-dimension comes with five to fifteen candidate items, each tied to a published reference (Akter et al. 2022, Tallon et al. 2013, Hossain et al. 2020b, Lee et al. 2019, Sun et al. 2020, etc.).

A representative sample:

- **Intelligent data governance**: "Ability to access very large, unstructured or fast-moving data", "Ability to integrate data from multiple sources", "Ability to keep customer data sufficiently private", "User involvement in policy setting and evaluation", "Plan and provide storage capacity".
- **Data privacy and security**: "Personal information that is transmitted across various channels (websites, mobile apps and physical branches) is protected", "Customers feel secure about using multiple channels".
- **Content consistency**: "The system provides consistent information across all channels", "Customers receive consistent responses through different channels", "The service performance is consistent across different channels".
- **Process consistency**: "The system images are consistent across all channels", "The feelings about the service are consistent across all channels".
- **Personalisation**: "The system can deliver immediate one-to-one responses based upon customers' precise demands", "Recommendations are offered based on personal information across different channels".
- **Automation**: "Automated systems have 100% perfect performance", "The level of automation is reliable / dependable / consistent / accessible". Notably, the table *also* includes negative-worded items — "Automated systems rarely make mistakes", "If an automated system makes a mistake, then it is completely useless" — which is a deliberate attempt to capture the two poles of *perceived reliability*.
- **Meaningfulness & novelty**: "Is relevant to the customers' needs and expectations", "Is really 'out of the ordinary'", "Demonstrates an unconventional way of solving problems".

These scales are **candidate items, not validated instruments**. The paper does not attempt scale development itself; it offers a curated pool that subsequent quantitative work can refine.

## Analysis / Ablation

There is no quantitative ablation. Instead, the paper uses interview quotes to make a qualitative case for each dimension's necessity.

- **If only data management is missing**: *"If the underlying data isn't right and it isn't filled in correctly, then the whole thing falls over"* (Interviewee #19). However good your multichannel and service offerings layers are, if the data layer collapses, the whole system loses meaning. The authors imply a hierarchical dependency.
- **If only multichannel integration is missing**: content can be excellent, but message conflicts across channels translate into roughly a 20% drop in perceived brand quality (Simpson, 2019).
- **If only service offerings are missing**: data and channels may be tidy, but weak personalisation leaves customers unable to articulate *why* the company even has their data. The Loebbecke et al. (2020) *substitution-of-empathy* critique gets cited here too — automating personalisation can sometimes drain the genuine human empathy the customer was looking for in the first place.

The authors translate that trade-off into the paper's **propositional structure**: P1 (data management), P2 (multichannel), P3 (service offerings) each *substantially influences* AI-CRM capability. Confirming those is a job for follow-up SEM, but the qualitative evidence in the transcripts is rich enough to support the claim that any one of the three going to zero collapses the whole thing.

## Limitations and Critical Read

What the authors acknowledge:

- The review is bounded by the *current* AI-CRM literature, which limits external validity (Arksey & O'Malley, 2005).
- It relies on self-reported data, with the usual response-bias risk (Arnold & Feldman, 1981; Tourangeau & Yan, 2007). Future work should triangulate with observational data and objective KPIs.
- The study does not link AI-CRM capabilities to direct business outcomes — customer equity, operational efficiency, financial performance — and so cannot make causal claims about whether the framework produces value.

What the reviewer would add:

- **Sample bias**: 24 interviewees, half from Australia and a quarter from the UAE, 71% male. The markets where AI-CRM adoption is most active — the US, continental Europe, East Asia — are barely represented, which narrows generalisability.
- **B2C/B2B mix is not separated**: banking, hospitality, pharmaceuticals, and construction all sit in the same sample, but AI-CRM use cases differ a lot across industries (B2B leans on lead scoring, B2C on personalisation). The current framework absorbs that variance silently rather than modelling it.
- **Microfoundations is invoked, not fully delivered**: the authors use microfoundations as a theoretical umbrella, but Fig. 2 is a structure of capabilities, not a diagram of how individual behaviours and routines aggregate up. The aggregation story remains implicit.
- **Reverse-keyed items in Table 6**: the automation scale mixes positive and negative wording ("Automated systems have 100% perfect performance" with "Automated systems rarely make mistakes" and "If an automated system makes a mistake, then it is completely useless") on a single ladder. That's a defensible attempt at controlling for response sets, but follow-up factor analysis may struggle to extract a clean single factor.
- **Limited comparison to neighbouring microfoundations work**: Akter et al. (2022) on humanitarian analytics empowerment and Magistretti et al. (2021) on AI-related dynamic capabilities are adjacent and should have been benchmarked against. The question of *why these eight sub-dimensions and not someone else's seven or nine* is left open.

## Takeaways

- "Does it have AI?" is the wrong question to ask of a CRM. The right question is *which of the eight sub-dimensions does it actually support, and at what level?* **Data governance + analytics + privacy / content consistency + process consistency / personalisation + automation + meaningfulness** is the checklist.
- *Perceived reliability* of automation is a leading indicator of adoption. A single visible automation failure decays trust for a long time, which is why "rarely makes mistakes" deserves to be an operational KPI, not a soft claim.
- Multichannel integration has two distinct legs: *content consistency* and *process consistency*. Sending the same email across channels does not guarantee that the refund flow is uniform. They have to be measured separately.
- The microfoundations framing has a lesson for ML engineers too: model performance is not business capability. A 0.99 AUC model embedded in an organisation that lacks data governance, content consistency, and personalisation discipline will translate to roughly zero business impact.
- The paper is most useful as the front end of a follow-up programme: scale development → SEM → longitudinal validation. If you want to evaluate your own AI-CRM maturity right now, Table 6 is the seed of an internal survey you can run next week.

## Setup and Use (if code is released)

There's no code or dataset release. What you can copy is the research design itself, as a recipe:

```text
1) Lift the candidate items from Table 6 verbatim.
2) For each of the eight sub-dimensions, pick 5–10 items and turn them into a 5-point Likert scale.
3) Sample frame: people who have used the AI-CRM system for 2+ years (sales reps, CRM admins, data stewards).
4) Pilot with n=20–30 → exploratory factor analysis → drop noisy items.
5) Main study with n=200–300 → confirmatory factor analysis → test the eight-factor structure.
6) Use SEM with business outcomes (NPS, customer equity, operational efficiency) as dependent variables.
```

This recipe is exactly the future-research direction the limitations section flags as the natural next step.

## References and Resources

- Paper: [Journal of Innovation & Knowledge 10 (2025) 100731](https://doi.org/10.1016/j.jik.2025.100731)
- DOI: [10.1016/j.jik.2025.100731](https://doi.org/10.1016/j.jik.2025.100731)
- Authors: kkska205@uowmail.edu.au · sakter@uow.edu.au · venkaty@uow.edu.au
- License: CC BY 4.0 (open access)

## Further Reading

- **[Artificial intelligence in customer relationship management: A systematic framework for a successful integration](https://doi.org/10.1016/j.jbusres.2025.115531)** (Ledro et al., 2025) — A sister paper from the same year in *Journal of Business Research*. Where this paper treats the *capabilities* that AI-CRM produces as the dependent variable, Ledro et al. focus on the *integration process* itself. Reviewed here as [paper 0005](/en/papers/0005-artificial-intelligence-in-customer-relationship-management/) — together the two give complementary perspectives on the same domain.
- **[Explicating dynamic capabilities: the nature and microfoundations of (sustainable) enterprise performance](https://doi.org/10.1002/smj.640)** (Teece, 2007) — The original source for dynamic capabilities and microfoundations. The sensing/seizing/transforming triad and the language this paper imports come from here.
- **[Artificial Intelligence in Service](https://doi.org/10.1177/1094670517752459)** (Huang & Rust, 2018) — Splits AI *intelligence* into mechanical / analytical / intuitive / empathetic. Read as the theoretical gradient behind this paper's automation-to-meaningfulness axis.
- **[Building dynamic service analytics capabilities for the digital marketplace](https://doi.org/10.1016/j.jbusres.2020.06.016)** (Akter et al., 2020) — A self-citation by the second author. Its data analytics capability model (selection / collection / interpretation / dissemination) is the direct ancestor of this paper's *data management* dimension.
- **[Theorising the microfoundations of analytics empowerment capability for humanitarian service systems](https://doi.org/10.1007/s10479-021-04386-5)** (Akter et al., 2022) — Same author group applying microfoundations to humanitarian analytics. The methodological backbone of that paper is essentially what gets reused here.
- **[Adoption of AI-integrated CRM system by Indian industry: from security and privacy perspective](https://doi.org/10.1108/ICS-02-2019-0029)** (Chatterjee et al., 2021) — Empirical evidence from India that security and privacy are dominant adoption drivers. Reinforces this paper's data-privacy-and-security sub-dimension.
- **[Artificial intelligence (AI)-enabled CRM capability in healthcare: The impact on service innovation](https://doi.org/10.1016/j.ijinfomgt.2022.102598)** (Kumar et al., 2023) — Healthcare-specific AI-CRM splits capabilities into *clinical / service / AI-engagement*. A useful contrast that highlights how industry context changes the right slicing.
- **[Multichannel integration quality: A systematic review and agenda for future research](https://doi.org/10.1016/j.jretconser.2019.03.019)** (Hossain et al., 2019) — The original source of the content/process consistency split. This paper's multichannel integration dimension borrows the schema almost wholesale.

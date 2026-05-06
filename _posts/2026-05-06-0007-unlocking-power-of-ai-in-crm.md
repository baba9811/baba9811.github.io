---
layout: post
title: "[논문 리뷰] Unlocking the power of AI in CRM: A comprehensive multidimensional exploration"
date: 2026-05-06 11:00:00 +0900
description: "1,055건의 논문에서 64건을 추리고 24명의 CRM 실무자를 인터뷰해, AI 기반 CRM 역량을 3개 차원·8개 하위차원으로 정리한 정성 연구. Dynamic Capabilities 의 microfoundations 관점으로 봤다."
tags: [ai-crm, dynamic-capabilities, scoping-review, qualitative-research, customer-relationship-management]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0007-unlocking-power-of-ai-in-crm/fig2-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0007-unlocking-power-of-ai-in-crm/
en_url: /en/papers/0007-unlocking-power-of-ai-in-crm/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Khadija Khamis Alnofeli, Shahriar Akter, Venkata Yanamandram (School of Business, University of Wollongong, 호주) |
| 학회 | *Journal of Innovation & Knowledge* 10, Article 100731 · 2025 (open access, CC BY) |
| DOI | [10.1016/j.jik.2025.100731](https://doi.org/10.1016/j.jik.2025.100731) |
| 데이터 | 64개 학술 논문 (2002–2023, 36개 저널) + 24명의 산업 전문가 in-depth 인터뷰 |
| 리뷰 일자 | 2026-05-06 |

## TL;DR

- AI 기반 CRM 의 *역량* 을 정량 모델이 아니라 정성 연구로 조립한 논문이다. 6단계 scoping review (Arksey & O'Malley, 2005; Fowler & Thomas, 2023) 와 thematic analysis (Braun & Clarke, 2006) 를 결합해, **64개 논문 + 24명 인터뷰** 에서 공통적으로 등장하는 역량을 추출했다.
- 결과는 **3개 차원 · 8개 하위차원** 의 구조다. (1) **Data management**: 데이터 거버넌스, 데이터 분석, 프라이버시·보안. (2) **Multichannel integration**: 콘텐츠 일관성, 프로세스 일관성. (3) **Service offerings**: 개인화, 자동화, meaningfulness & novelty.
- 이론적 앵커는 Teece et al. 의 dynamic capabilities (DC) 와, 그 *microfoundations* — 즉 개인·집단 수준의 행동·역량이 어떻게 조직 수준의 sensing/seizing/transforming 으로 이어지는지에 대한 미시 메커니즘이다. 이 논문은 microfoundations 가 AI-CRM 맥락에서 underexplored 되어 있다는 갭에 답한다.
- 새로운 모델·알고리즘은 없다. 대신 *AI-CRM 을 도입하려는 조직이 무엇을 측정·관리해야 하는가* 에 대한 **conceptual framework + 측정 척도 후보 (Table 6)** 를 만들어, 후속 정량 연구의 출발점을 제공한다.
- 한계는 명확하다. 단일 연구진의 thematic 코딩, 24명이라는 작은 샘플, B2C/B2B 산업 혼재, 결과를 *재무 성과* 에 연결하지 못한 점. 하지만 "AI-CRM 역량" 이라는 모호한 용어를 측정 가능한 단위로 쪼갠 첫 번째 통합 시도로서의 가치는 크다.

## 소개 (Introduction)

AI 기반 CRM 은 더 이상 마케팅 부서의 사이드 프로젝트가 아니다. 글로벌 CRM 시장은 2021년 USD 18.1B 에서 2032년 USD 25.7B 으로 성장이 예측되고 (CAGR 3.2%), Salesforce Einstein, Microsoft Dynamics 365, SAP, Oracle 등 메이저 벤더는 모두 AI 모듈을 핵심 기능으로 탑재한 상태다. 그럼에도 학계와 실무 양쪽에서 비슷한 좌절이 보고된다 — *시스템은 깔았는데 효과가 안 난다*. 어떤 연구는 CRM 프로젝트 실패율을 18-69%, 일부 임원 인터뷰에서는 *최대 90%* 로 보고한다 (Edinger, 2018). 실패의 표면 원인은 데이터 품질 / 사용자 저항 / 통합 실패지만, 그 아래에는 더 깊은 질문이 있다 — **AI-CRM 이 만들어내는 "역량" 이란 정확히 무엇인가?** 그리고 그 역량은 어떤 미시적 행동·자원·프로세스에서 솟아 나오는가?

이 논문은 그 질문을 *정면으로* 다룬다. 단, 통상적인 "구조방정식 모델 + 200명 설문" 식의 정량 접근이 아니라, 문헌의 conceptual fragmentation 자체를 직시한다. 이전 연구들은 RBV, TOE, TAM, value sensitive design, brand personality 등 서로 다른 이론적 렌즈로 AI-CRM 을 봐왔다. 결과적으로 *데이터 관리* 를 강조하는 논문, *챗봇 의인화* 를 다루는 논문, *조직의 absorptive capacity* 를 보는 논문이 모두 같은 "AI-CRM 역량" 이라는 우산 아래 모이지만, 서로 호환되지 않는 어휘를 쓴다. 이 논문은 그 어휘들을 *thematic analysis* 로 정리해, 공통 분모로 환원한다.

지금 이 논문을 읽을 가치가 있는 이유는 ML 에 가까운 독자에게도 두 가지가 있다. 첫째, **모델을 만드는 사람과 그것을 도입하는 조직 사이의 갭** 을 microfoundations 라는 언어로 정리해 준다. 두 번째, **측정 척도 후보 (Table 6)** 가 제공된다 — "이 조직은 AI-CRM 을 잘 쓰고 있는가" 라는 질문에 대해 8개 하위차원별로 5–15개의 가설 측정 항목을 제시한다. 이는 자체 도입 사례를 평가할 때 곧바로 설문지로 변환할 수 있는 자원이다.

## 핵심 기여 (Key Contributions)

- **AI-CRM 역량의 통합 분류 체계** 를 제시한다. Data management / Multichannel integration / Service offerings 의 3차원 + 8개 하위차원 구조 (Fig. 2). 기존 문헌이 "AI-CRM" 이라는 거대한 한 덩어리 안에 잡다한 개념을 넣어 두던 것을 분리·정렬한다.
- **이론적 앵커로 Teece (2007) 의 dynamic capabilities microfoundations 를 채택**, 단순히 어떤 *기능* 이 있느냐가 아니라 *어떤 미시 행동·결정 과정* 이 그 기능을 만들어 내는지를 묻는다. AI-CRM 분야의 microfoundations 가 underexplored 된 갭 (Magistretti et al., 2021; Chatterjee et al., 2022b) 을 채운다.
- **방법론의 다중 트라이앵귤레이션** — 6단계 scoping review (PRISMA 기반) + 24명의 in-depth 인터뷰 + thematic 코딩 (inter-rater reliability 를 위한 두 명의 학술 연구자 협업 코딩). 각 데이터 소스가 다른 데이터 소스의 결론을 검증한다.
- **세 개의 검증 가능한 명제 (Proposition 1/2/3)**. 각 차원이 AI-CRM 역량에 영향을 줄 것이라는 가설을, 후속 정량 연구가 실증할 수 있게 명문화. Table 6 의 측정 항목과 짝을 이뤄 곧바로 척도 개발 연구의 입력이 된다.
- **실무자 수준의 권고** 를 같이 정리한다 — 데이터 거버넌스에서 user involvement 와 access right monitoring, multichannel 에서 channel image consistency, 자동화에서 "system rarely makes mistakes" 같은 perceived reliability 항목까지. 척도 후보가 그대로 운영 KPI 로 환원될 수 있다.

## 관련 연구 / 배경 지식

### Dynamic capabilities (DC) 와 microfoundations

Dynamic capabilities (Teece et al., 1997; Teece, 2007) 는 변화하는 환경에서 자원을 *재구성* 할 수 있는 조직의 메타 능력이다. 흔히 sensing (변화 감지), seizing (기회 포착), transforming (자원 재배치) 의 세 단계로 분해된다. 그러나 DC 자체는 조직 수준 (firm-level) 추상이다. 어떤 사람이, 어떤 도구를, 어떤 의사결정으로 sensing 을 만들어내는지를 물으면 답이 비어 있다.

이 빈 자리를 채우는 게 **microfoundations** (Felin et al., 2012; Bojesson & Fundin, 2021; Hutton et al., 2021) 다. 개인의 인지·동기, 팀의 상호작용, 절차·도구 같은 *micro-level mechanism* 이 조직 수준 capability 로 어떻게 응집되는지를 본다. 이 논문은 AI-CRM 을 microfoundations 로 보면, "AI-CRM 역량" 이 막연한 조직 자산이 아니라 **개인이 데이터에 접근·해석·신뢰하는 과정 + 조직이 그 과정을 표준화·재배치하는 절차** 의 합으로 분해된다고 본다.

### AI 기반 CRM 의 선행 연구 흐름

Table 1 에 정리된 선행 연구들 (Baabdullah et al., 2021; Chatterjee et al., 2021b/2022b/2022c; Ling et al., 2021; Li & Xu, 2022; Monod et al., 2023; Suoniemi et al., 2021; Youn & Jin, 2021; Zhang et al., 2020) 의 공통점은 두 가지다. 첫째, 대부분 RBV 또는 TOE/TAM 의 단일 이론 렌즈로 본다. 둘째, 결과 변수가 *adoption intention* 또는 *firm performance* 로 단순화되어 있다. 즉 "어떤 변수가 도입을 촉진하는가" 는 잘 묻지만, "도입 후 그 시스템이 *어떤 종류의 역량* 을 만들어내는가" 는 잘 묻지 않는다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/tab1-studies.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: AI-CRM 선행 연구 요약. 이론적 기반이 RBV / TOE / TAM2 / value sensitive design 등으로 분산되어 있고, 연구 유형도 empirical survey 부터 case study, systematic review 까지 다양하다. 이 분산이 곧 통합 프레임워크가 필요한 이유다."
   zoomable=true %}

### 직접 관련된 두 흐름

저자들이 본 논문의 출발점으로 명시하는 두 갈래가 있다. (1) **Akter et al. (2022)** 의 dynamic data analytics capability 모델 — 이 논문의 제2저자가 자기 인용으로 끌어오는 부분이며, "data quality, data analysis, privacy" 의 3-pillar 가 본 논문의 *data management* 차원과 거의 일대일로 맞물린다. (2) **Hossain et al. (2019)** 의 multichannel integration quality — content / process consistency 를 두 축으로 둔 systematic review. 본 논문의 *multichannel integration* 차원은 거의 이 분류를 그대로 받아온다. 한편 **Huang & Rust (2018)** 의 mechanical / analytical / intuitive / empathetic intelligence 4단계는 *service offerings* 차원의 자동화·개인화·meaningfulness 매핑에 영향을 준다.

## 방법 / 아키텍처 상세

이 논문에는 모델 아키텍처가 없다. 대신 *연구 설계 자체* 가 가장 큰 섹션이다. 6단계 scoping review (Arksey & O'Malley, 2005, Fowler & Thomas, 2023 의 업데이트) + thematic analysis 의 하이브리드.

### 6단계 scoping review 프레임워크

1. **Stage 1 — 연구 질문 정의**: "AI 기반 CRM 역량의 차원과 하위차원은 무엇이며, 그것이 기존 이론을 어떻게 확장·정보화하는가?"
2. **Stage 2 — 관련 문헌 식별**: Business Source Complete, ProQuest, Scopus, Web of Science 4개 DB 에서 *"AI" AND "CRM"*, *"artificial intelligence" AND "customer relationship management"*, *"automation and CRM"*, *"technological innovation and CRM"*, *"CRM analytics"* 키워드 조합. 영어 논문, 2023년 말까지. 1차 검색에서 1,055건 식별.
3. **Stage 3 — Study selection**: 1,055건 → 724건의 중복 제거 → 331건 스크리닝 → "CRM = coefficient of residual mass" 같은 약어 충돌 등을 제외한 39건 → cross-referencing 으로 25건 추가 → **최종 64건 포함**. PRISMA 다이어그램 (Fig. 1) 으로 시각화.
4. **Stage 4 — Charting**: 64건의 논문을 인용·이론적 프레임워크·연구 방법·핵심 발견 으로 코드화.
5. **Stage 5 — 정성 인터뷰 (24명)**: 두 가지 채널. (a) Zoom 1:1 in-depth 인터뷰 (45–60분), 반구조화. (b) 전화·온라인 PDF 응답 (소수의 참가자). 인터뷰 가이드는 Appendix A 에 공개. 24명은 Salesforce, Microsoft Dynamics 365, SAP, IBM Watson, Adobe, Oracle 등을 *2년 이상* 사용한 실무자 (CMO, CRM Manager, Marketing Automation Manager, Data Scientist, CTO 등). 50% 호주, 25% UAE, 71% 남성, 평균 경력 5–10년.
6. **Stage 6 — 정리·보고**: 인터뷰 결과를 thematic analysis (Braun & Clarke, 2006) 로 inductive 코딩. 두 명의 학술 코더가 inter-rater reliability 를 확보하면서 합의 코딩.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/fig1-prisma.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: PRISMA 흐름도. 1,055 → 724건 중복 제거 → 331 스크리닝 → 292 제외 → 39 retrieval → 25 cross-reference 추가 → 최종 64건. 약어 충돌 (compensatory reserve metric, community readiness model 등) 을 명시적으로 제거한 점이 디테일하다."
   zoomable=true %}

### Thematic analysis 의 코딩 절차

문헌 64건과 인터뷰 24명을 모두 같은 코딩 체계로 환원하기 위해 inductive thematic analysis 를 적용. (1) 인터뷰 transcript 와 논문 발췌를 라인 단위로 open coding. (2) 비슷한 코드를 묶어 sub-theme 화. (3) sub-theme 을 차원으로 군집화. 그 결과가 Table 4 (문헌에서의 패턴) 와 Table 5 (인터뷰 인용 → sub-dimension → dimension) 다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/tab4-themes.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4: 문헌 리뷰에서 나타난 8개 하위차원의 등장 패턴. Wamba et al. (2017) 부터 Lee et al. (2019) 까지 21개의 연구를 8개 sub-dimension 에 X 표시로 매핑. Data analysis 가 가장 폭넓게 다뤄지고, content/process consistency 와 meaningfulness 는 상대적으로 희소하다."
   zoomable=true %}

### Sample 의 한계와 trustworthiness

샘플은 LinkedIn 으로 239명에 접촉 → 14명 동의 (purposive) → snowball 로 13명 추가 → 27 응답 중 3명 부실 응답 제외 → 최종 24명. Saturation 은 응답이 새로운 코드를 더 만들지 못할 때까지 계속 (Saunders et al., 2018). Trustworthiness 는 Denzin & Lincoln (2008) 의 4가지 — triangulation, peer review, member check, audit trail — 로 확보.

저자들도 이 샘플이 50% 호주·25% UAE 로 편향되어 있다는 한계를 본문에서 인정한다 (McKnight, 2007). 즉 본 논문의 결과는 영어권 + 중동 시장 + 대형 / tech-forward 조직 중심으로 편향된 일반화다.

### 인터뷰 demographics

| 항목 | 분포 |
|------|------|
| Gender | Male 71%, Female 29% (n=24) |
| Age | 30–35 (25%), 36–45 (46%), 46–50 (8%), 51–55 (13%) |
| 관리 단계 | Middle (54%), Top (25%), Low (21%) |
| 거주지 | Australia 50%, UAE 25%, UK 8%, Canada/NZ/Saudi/Nigeria 4%씩 |
| 사용 도구 | Salesforce, Microsoft Dynamics 365, SAP, IBM Watson, Adobe, Oracle, Power BI, SAS, Avaya, HubSpot, Pega Marketing 등 |
| 경력 | AI-CRM 사용 2년 이상 (purposive 조건), 실무 경력 평균 5–10년 |

## 학습 목표 / 손실 함수

이 논문에는 학습 목표나 손실 함수가 없다 — 정량 모델이 아니다. 대신 thematic analysis 의 *분석 목표* 를 손실로 비유하면 다음과 같다.

$$
\mathcal{J}_{\text{thematic}} = \underbrace{\sum_{q \in \text{quotes}} \mathbb{1}[\text{code}(q) \in \text{theme}]}_{\text{coverage}} - \lambda \cdot \underbrace{|\text{themes}|}_{\text{parsimony}} - \mu \cdot \underbrace{\sum_{c, c'} \text{disagreement}(c, c')}_{\text{inter-rater inconsistency}}
$$

즉 *충분히 많은 인용을 포함하는가 (coverage)*, *너무 많은 테마로 쪼개지지 않는가 (parsimony)*, *코더 간 disagreement 가 작은가 (reliability)* 를 동시에 만족하는 코딩 체계가 좋은 thematic analysis 다. 이 논문에서 $\lambda$, $\mu$ 는 명시되어 있지 않지만, 두 명의 학술 코더 + Cole (2024) 의 inter-rater reliability 절차로 두 항을 통제한다.

## 학습 데이터와 파이프라인

### 문헌 데이터

| 항목 | 값 |
|------|-----|
| 검색 DB | Business Source Complete, ProQuest, Scopus, Web of Science |
| 기간 | 2002 ~ 2023 |
| 1차 검색 결과 | 1,055건 |
| 최종 포함 | 64건 (36개 저널) |
| 우세 저널 | Industrial Marketing Management (21.9%), Harvard Business Review (4.7%), Journal of Business Research (4.7%), Journal of Product Innovation Management (4.7%) |
| Quality 게이트 | ABDC rank C 이상 (~A*), ABS rank 2 이상, SJR Q3 이상 |

### 인터뷰 데이터

| 항목 | 값 |
|------|-----|
| 모집 | LinkedIn outreach 239명 → 14명 (purposive) + 13명 (snowball) → 27명 응답 → 24명 최종 |
| 인터뷰 시간 | 45 ~ 60분, Zoom 또는 전화 |
| 형식 | 반구조화 (Robson, 2002 의 인터뷰 스케줄) |
| 질문 영역 | AI-CRM 의 의미, 핵심 컴포넌트, 이점, 도전, 개인화 / 자동화 / 데이터 등 8개 주제 |
| 분석 도구 | NVivo (또는 동등 수준 수기 코딩), Excel cross-tab |
| 코딩 절차 | Inductive thematic analysis (Braun & Clarke, 2006), 두 명 학술 코더 합의 |
| 윤리 절차 | 서면 동의, 익명화, IRB 승인 (확인 가능 범위) |

## 실험 결과

이 논문에서 "결과" 는 모델 성능이 아니라 **차원 / 하위차원의 도출과 검증** 이다. 다음 세 단계로 정리된다.

### 결과 1 — 3차원 8하위차원 프레임워크의 도출

Fig. 2 가 논문 전체의 결정적 그림이다. 이 그림은 본문 어디서 인용해도 모자라지 않을 정도로 자주 등장한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/fig2-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: 본 논문의 결론적 다이어그램. AI-Powered CRM Capabilities 가 Data Management / Multichannel Integration / Service Offerings 의 3개 차원으로, 다시 8개 하위차원으로 펼쳐진다."
   zoomable=true %}

#### Data management capability

- **Intelligent data governance**: 정책·소유권·접근 권한을 누가 어떻게 책임지고 운영하는지. "데이터의 단일한 진실 원천 (single source of truth)" (Interviewee #3) 이 만들어지는지.
- **Data analytics**: descriptive (무슨 일이 있었나) → predictive (무슨 일이 일어날까) → prescriptive (어떻게 해야 하나) 의 3단계 (Fantini & Narayandas, 2023). 24명 중 다수가 *predictive* 가 가장 transformative 라고 응답.
- **Data privacy and security**: GDPR 준수, breach 대응, encryption, anonymisation. 인터뷰 인용: *"Data privacy and data breaches are very common issue in the AI industry"* (Interviewee #3, Male 30).

#### Multichannel integration capability

- **Content consistency**: 동일한 메시지·promotion·service performance 가 채널을 가로질러 일치하는지. 일관성 부족이 약 20% 의 brand quality perception 손실로 이어진다는 점이 (Simpson 2019, Techipedia) 인용된다.
- **Process consistency**: 채널 종류와 무관하게 process 자체 (예: 환불 절차, KYC 절차) 가 일정한지. Hossain et al. (2019/2020a) 의 framework 를 그대로 반영.

#### Service offerings capability

- **Personalisation**: customer segmentation 으로 1:1 응답을 만들 수 있는 능력. *"The more personalised the content you can create, the higher the chances that your customers will be happy"* (Interviewee #17, Male 34).
- **Automation**: 반복 작업의 무인화. 24명 중 다수가 자동화의 perceived reliability ("system rarely makes mistakes") 를 핵심 KPI 로 응답.
- **Meaningfulness and novelty**: 단순한 빠름·정확함을 넘어 *고객에게 의미 있고 신선한가* 를 묻는 차원. Akter et al. (2023b) 의 service innovation 측정 척도와 짝을 이룬다.

### 결과 2 — 데이터 구조 (Table 5) 가 보여주는 추적 경로

이 표가 이 논문의 정성 분석이 *임의 코딩이 아님* 을 보장하는 핵심 자료다. 각 인터뷰 인용이 어느 코드 → 어느 sub-dimension → 어느 차원으로 매핑되는지가 row 단위로 노출된다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0007-unlocking-power-of-ai-in-crm/tab5-data-structure.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5: 인터뷰 인용 → 코드 → sub-dimension → dimension 의 추적 경로. 정성 분석에서 가장 중요한 신뢰성 검증 단계로, 독자가 코딩이 정당한지 직접 확인할 수 있다."
   zoomable=true %}

### 결과 3 — 측정 척도 후보 (Table 6)

이 부분이 후속 정량 연구의 입력으로서 가장 실용적이다. 각 sub-dimension 마다 5-15개의 후보 항목이 정리되어 있고, 각각 reference (e.g. Akter et al. 2022, Tallon et al. 2013, Hossain et al. 2020b, Lee et al. 2019, Sun et al. 2020 등) 가 붙어 있다.

대표적 항목 몇 개:

- **Intelligent data governance**: "Ability to access very large, unstructured or fast-moving data", "Ability to integrate data from multiple sources", "Ability to keep customer data sufficiently private", "User involvement in policy setting and evaluation", "Plan and provide storage capacity"
- **Data privacy and security**: "Personal information that is transmitted across various channels (websites, mobile apps and physical branches) is protected", "Customers feel secure about using multiple channels"
- **Content consistency**: "The system provides consistent information across all channels", "Customers receive consistent responses through different channels", "The service performance is consistent across different channels"
- **Process consistency**: "The system images are consistent across all channels", "The feelings about the service are consistent across all channels"
- **Personalisation**: "The system can deliver immediate one-to-one responses based upon customers' precise demands", "Recommendations are offered based on personal information across different channels"
- **Automation**: "Automated systems have 100% perfect performance", "The level of automation is reliable / dependable / consistent / accessible". 흥미롭게도 *negative-worded* 항목 — "Automated systems rarely make mistakes", "If an automated system makes a mistake, then it is completely useless" — 이 같이 들어가 *perceived reliability* 의 양극을 동시에 측정한다.
- **Meaningfulness & novelty**: "Is relevant to the customers' needs and expectations", "Is really 'out of the ordinary'", "Demonstrates an unconventional way of solving problems"

이 척도들은 **아직 신뢰도·타당도가 검증되지 않은 후보** 라는 점이 중요하다. 본 논문은 척도 *개발 자체* 를 하지는 않고, 측정 항목의 풀을 정리해 후속 연구에 던진다.

## 결과 분석 / Ablation

이 논문은 정량 ablation 이 없다. 대신 *각 차원이 빠지면 어떻게 되는가* 를 인터뷰 인용으로 정성적으로 보여준다.

- **Data management 만 결여될 경우**: *"If the underlying data isn't right and it isn't filled in correctly, then the whole thing falls over"* (Interviewee #19). 즉 multichannel·service offerings 가 아무리 좋아도 data layer 가 무너지면 시스템 전체가 의미 없다 — 위계적 의존성이 있다고 시사.
- **Multichannel integration 만 결여**: 콘텐츠는 좋지만 채널 간 메시지 충돌 → brand quality perception 약 20% 하락 (Simpson 2019).
- **Service offerings 만 결여**: 데이터·채널은 정리되어 있지만 personalisation 이 약하면 고객은 *왜 이 회사가 내 데이터를 갖고 있는지* 이유를 못 찾는다. Loebbecke et al. (2020) 의 *substitution-of-empathy* 비판도 같이 인용된다 — AI 가 personalisation 을 자동화하면서 *진짜 공감* 을 잃을 수 있다는 trade-off.

저자들은 이 trade-off 가 본 논문의 **propositional structure** 로 환원된다고 주장한다. P1 (data management), P2 (multichannel), P3 (service offerings) 각각이 AI-CRM 역량에 *substantial influence* 를 준다는 가설은 후속 SEM 으로 추정해야 하지만, 적어도 "어느 한 차원이 0 이 되면 전체가 무너진다" 는 정성적 증거는 인터뷰에 풍부하다.

## 한계와 비판적 평가

저자가 본문에서 인정한 한계:

- AI-CRM 분야 *현재 문헌* 만을 대상으로 했다. 따라서 외삽 가능성에 한계가 있고 (Arksey & O'Malley, 2005), AI 외 마케팅 시스템에는 그대로 적용되지 않을 수 있다.
- *Self-reported data* 의존 → response bias (Arnold & Feldman, 1981; Tourangeau & Yan, 2007) 가능성. 후속 연구는 observational data / objective KPI 와 결합 권고.
- AI-CRM 의 *직접 비즈니스 성과* (customer equity, operational efficiency, financial performance) 와의 인과 관계를 검증하지 못함.

리뷰어 입장에서 추가로 보이는 한계:

- **샘플 편향**: 24명, 그중 50% 호주 + 25% UAE, 71% 남성. AI-CRM 도입에 가장 활발한 미국·유럽·동아시아 (한·일·중) 가 거의 빠져 있다. Salesforce / Microsoft Dynamics 도입율이 가장 높은 시장이 빠져 있다는 점은 framework 의 일반화 가능성을 좁힌다.
- **B2C / B2B 구분 부재**: Banking, Hospitality, Pharmaceutical, Construction 등 산업이 섞여 있는데, AI-CRM 의 핵심 사용 사례는 산업별로 매우 다르다 (B2B 는 lead scoring, B2C 는 personalisation). 이 차이를 차원 정의에서 흡수하지 않고 같이 묶었다.
- **Microfoundations 라는 어휘의 불완전 활용**: 저자들은 microfoundations 를 *이론적 우산* 으로 쓰지만, 정작 *어떤 개인 행동 / 어떤 절차* 가 어떤 차원으로 응집되는지를 그림으로는 보여주지 않는다. Fig. 2 는 capability 의 구조도이지 microfoundations 의 응집 다이어그램은 아니다.
- **측정 척도의 양면성**: Table 6 의 자동화 항목은 negative-worded 항목 ("Automated systems have 100% perfect performance" + "Automated systems rarely make mistakes" + "If an automated system makes a mistake, then it is completely useless") 을 한 사다리에 같이 둔다. 이는 reverse-scoring 에 내성을 주려는 의도로 보이지만, 후속 연구가 factor analysis 를 돌릴 때 단일 요인이 깔끔하게 추출되지 않을 위험이 있다.
- **다른 microfoundations 연구와의 비교 부족**: Akter et al. (2022) 의 humanitarian analytics empowerment, Magistretti et al. (2021) 의 AI-related dynamic capabilities 와 같은 인접 작업이 본문에서 충분히 비교되지 않는다. *왜 본 논문의 8 sub-dimension 이 다른 모델보다 정확한가* 라는 질문은 미해결로 남는다.

## 시사점 / Takeaways

- AI-CRM 도입을 평가할 때 *"AI 가 들어 있는가"* 라는 질문은 무용하다. 적어도 8개 sub-dimension 중 어느 것을 어떤 수준으로 지원하는지를 분리해서 봐야 한다. **데이터 거버넌스 + 데이터 분석 + 프라이버시 / 콘텐츠 일관성 + 프로세스 일관성 / 개인화 + 자동화 + meaningfulness** — 이 8개가 체크리스트가 된다.
- 자동화의 *perceived reliability* 가 채택의 큰 변수다. *"automation rarely makes mistakes"* 가 운영 KPI 가 되어야 하고, 한 번의 자동화 실패가 전체 시스템 신뢰를 오래 깎아먹는다는 해석.
- Multichannel 통합은 *콘텐츠 일치* 와 *프로세스 일치* 가 다르다. 메시지를 똑같이 보낸다고 해서 환불 절차가 자동으로 똑같지는 않다. 두 측을 분리해서 측정해야 한다.
- *Microfoundations* 관점은 ML 엔지니어에게도 시사하는 바가 있다 — 모델 성능이 곧 비즈니스 역량은 아니다. 모델 위에 sales rep 의 입력 행동, CRM admin 의 거버넌스, customer-facing UX 의 응집이 같이 갈 때만 capability 가 만들어진다. 모델만 잘 만들고 *organizational deployment* 를 등한시하면 0.99 AUC 도 0 의 비즈니스 효과로 귀결된다.
- 향후 정량 연구 (척도 개발 / SEM / 종단 연구) 의 분명한 출발점을 제공한다. 자기 회사의 AI-CRM 성숙도를 평가할 때 Table 6 항목을 internal survey 로 변환해 시작점으로 쓸 수 있다.

## 설치 및 사용법 (코드 공개시)

이 논문은 코드/데이터 공개가 없다. 대신 *연구 설계 자체* 를 따라 할 수 있는 레시피를 정리한다. 자기 회사 AI-CRM 평가 설문을 만들고 싶다면 다음과 같은 구조가 가장 가깝다.

```text
1) 64개 논문의 핵심 척도 (Table 6) 를 그대로 가져온다.
2) 8개 sub-dimension 마다 5–10개 문항을 골라 5점 Likert 로 변환.
3) Sample frame: AI-CRM 을 2년 이상 쓰는 사용자 (sales rep / CRM admin / data steward).
4) Pilot n=20–30 → exploratory factor analysis → 잡음 항목 제거.
5) Main n=200–300 → confirmatory factor analysis → 8요인 구조 검증.
6) 비즈니스 outcome (NPS, customer equity, operational efficiency) 을 종속변수로 SEM.
```

이 레시피는 본 논문의 limitations 섹션이 명시적으로 *future research direction* 으로 권고하는 흐름이다.

## 참고 자료

- 논문: [Journal of Innovation & Knowledge 10 (2025) 100731](https://doi.org/10.1016/j.jik.2025.100731)
- DOI: [10.1016/j.jik.2025.100731](https://doi.org/10.1016/j.jik.2025.100731)
- 저자 연락처: kkska205@uowmail.edu.au · sakter@uow.edu.au · venkaty@uow.edu.au
- 라이선스: CC BY 4.0 (open access)

## 더 읽어보기

- **[Artificial intelligence in customer relationship management: A systematic framework for a successful integration](https://doi.org/10.1016/j.jbusres.2025.115531)** (Ledro et al., 2025) — 같은 해 *Journal of Business Research* 에 실린 자매격 논문. AI-CRM 도입 *프로세스* 를 설명변수로 두는 반면, 본 논문은 도입 후 만들어지는 *역량* 을 설명변수로 둔다. 본 블로그의 [paper 0005](/papers/0005-artificial-intelligence-in-customer-relationship-management/) 도 함께 읽으면 두 논문이 상보적 관점을 제공한다는 점이 잘 보인다.
- **[Explicating dynamic capabilities: the nature and microfoundations of (sustainable) enterprise performance](https://doi.org/10.1002/smj.640)** (Teece, 2007) — Dynamic capabilities 와 microfoundations 의 원전. 본 논문이 끌어오는 sensing/seizing/transforming 의 출처.
- **[Artificial Intelligence in Service](https://doi.org/10.1177/1094670517752459)** (Huang & Rust, 2018) — AI 의 *intelligence* 를 mechanical / analytical / intuitive / empathetic 4단계로 나누는 분류. 본 논문의 service offerings 차원 (자동화 ↔ meaningfulness) 의 이론적 그라디언트로 읽어도 무방.
- **[Building dynamic service analytics capabilities for the digital marketplace](https://doi.org/10.1016/j.jbusres.2020.06.016)** (Akter et al., 2020) — 본 논문 제2저자의 자기 인용. Data analytics capability 의 selection / collection / interpretation / dissemination 4단계 모델로, 본 논문 *data management* 차원의 직접 출처.
- **[Theorising the microfoundations of analytics empowerment capability for humanitarian service systems](https://doi.org/10.1007/s10479-021-04386-5)** (Akter et al., 2022) — Microfoundations 를 humanitarian analytics 에 적용한 동일 저자 그룹의 논문. 이 논문의 *방법론* 이 본 논문에서도 거의 그대로 쓰였다.
- **[Adoption of AI-integrated CRM system by Indian industry: from security and privacy perspective](https://doi.org/10.1108/ICS-02-2019-0029)** (Chatterjee et al., 2021) — AI-CRM 채택 결정 요인 중 *보안·프라이버시* 가 dominant 변수임을 보인 인도 사례. 본 논문의 data privacy and security sub-dimension 의 실증 근거.
- **[Artificial intelligence (AI)-enabled CRM capability in healthcare: The impact on service innovation](https://doi.org/10.1016/j.ijinfomgt.2022.102598)** (Kumar et al., 2023) — 의료 산업에서의 AI-CRM 이 *clinical / service / AI-engagement* 3가지 capability 로 나뉜다는 연구. 본 논문의 service offerings 차원과 비교해 산업 특이성을 보여주는 사례.
- **[Multichannel integration quality: A systematic review and agenda for future research](https://doi.org/10.1016/j.jretconser.2019.03.019)** (Hossain et al., 2019) — Content / process consistency 라는 두 축의 출처. 본 논문 multichannel integration 차원이 거의 그대로 빌려온 분류 체계다.

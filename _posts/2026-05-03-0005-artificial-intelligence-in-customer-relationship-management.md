---
layout: post
title: "[논문 리뷰] Artificial intelligence in customer relationship management: A systematic framework for a successful integration"
date: 2026-05-03 10:00:00 +0900
description: "25명을 인터뷰해 도출한 AI-CRM 통합 4 macro-phase·13 step 프레임워크 — ethics by design과 customer data centralization을 처음부터 박아 넣어야 한다는 정성적 연구."
tags: [ai, crm, qualitative-research, ethics-by-design, framework]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/fig1-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0005-artificial-intelligence-in-customer-relationship-management/
en_url: /en/papers/0005-artificial-intelligence-in-customer-relationship-management/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Cristina Ledro, Anna Nosella, Andrea Vinelli (University of Padova) · Ilaria Dalla Pozza (IPAG Business School) · Thomas Souverain (ENS Paris / DreamQuark) |
| 학회 | *Journal of Business Research* 199, Article 115531 · 2025 (open access, CC BY) |
| DOI | [10.1016/j.jbusres.2025.115531](https://doi.org/10.1016/j.jbusres.2025.115531) |
| 데이터 | 25개 semi-structured interview, 4 라운드, 2021.06–2022.05 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-05-03 |

## TL;DR

- 25명의 C-level·전문가 인터뷰를 Gioia 방법론으로 코딩해 **AI를 CRM에 성공적으로 통합하는 13 step·4 macro-phase 프레임워크**를 도출. SugarCRM·Microsoft Dynamics 컨설턴트 검증까지 포함.
- 기존 AI 통합 프레임워크가 strategy → data → model → scale 의 선형 모델인 반면, 이 논문은 **CRM 특유의 cross-functional·iterative한 성격** 때문에 ethics committee, customer data centralization, people learning이 **첫 단계부터 병행**되어야 한다고 본다.
- 핵심 차별점은 다섯 가지: ethics by design (Hub France IA의 7원칙), 360도 customer data centralization, KPI/모니터링의 조기 정의, top-down·centralized 관리, scalability를 framing 단계부터 계획.
- 실패 사례 (CC4 보험, CD5 외식기기) 가 보여주듯 **"AI가 알아서 해결해 줄 것"** 이라는 막연한 기대로 시작하면 데이터·KPI·domain expert 결합이 무너진다.

## 소개 (Introduction)

CRM은 마케팅 전략과 IT를 결합해 고객가치를 극대화하는 영역이고, 최근 10년간 *De Bruyn et al. (2020)*, *Kumar et al. (2020)*, *Huang & Rust (2021)* 등이 줄곧 "AI가 CRM의 next frontier" 라고 외쳐왔다. 그런데 정작 *어떻게* 통합하는가에 대한 실증 연구는 비어 있다. 기존 연구는 두 흐름으로 갈라졌다.

첫 번째 흐름은 *왜* AI를 CRM에 도입해야 하는가, *무엇이* 도입에 영향을 주는가를 다룬다. *Chatterjee et al. (2019, 2021)*, *Dastjerdi et al. (2023)* 처럼 organizational agility, 사회적 압력, 정책 같은 외생 변수로 채택 의사결정을 모델링한다. 두 번째 흐름은 *Lee et al. (2019)*, *Reim et al. (2020)*, *Herremans (2021)*, *Shrivastav (2021)* 처럼 generic한 AI 통합 단계 모델이지만, 대부분 conceptual이거나 secondary data 기반이고 CRM이라는 특수 맥락을 다루지 않는다. CRM 맥락에 가장 가까운 *Holmlund et al. (2020)* 도 customer experience(CX)에 한정된 big data analytics 가이드에 머문다.

저자들은 이 빈자리를 채우기 위해 **"How does integration of an AI application into CRM take place?"** 라는 질문을 던진다. 단순한 채택(adoption) 이 아니라 implementation·governance까지 포함하는 통합 과정 자체가 연구 대상이다. 25개의 semi-structured interview를 4 라운드에 걸쳐 수집하고 Gioia 방법론(Gioia, Corley, & Hamilton, 2013)으로 inductive coding 한 뒤, 100개가 넘는 first-order 카테고리를 46개로 정리하고 13개 step과 4개 macro-phase로 추상화했다. 결과물은 회사들이 다음 분기 워크숍에서 그대로 들고 갈 수 있는 수준의 체크리스트다.

지금 이 논문을 읽을 가치가 있는 이유는 두 가지다. 첫째, **ChatGPT 이후 모든 회사가 "우리 CRM에 AI 박자" 라고 외치지만 어디서부터 손대야 하는지 모르는 상태**에서, 25개 사례에서 추출된 step-by-step framework는 가장 구체적인 시작점을 준다. 둘째, ethics by design을 단순한 윤리 토론이 아니라 **ethics committee → 7원칙 정의 → A/B 테스트 시기 회피 → human-on-the-loop fallback** 같은 실행 가능한 메커니즘으로 풀어낸다는 점에서 GDPR·EU AI Act 이후 거버넌스 요건과도 맞닿아 있다.

## 핵심 기여 (Key Contributions)

- **AI-CRM 통합의 13 step·4 macro-phase 프레임워크.** 기존 generic AI integration 프레임워크 (*Lee et al. 2019*, *Reim et al. 2020*, *Herremans 2021* 등) 가 단계를 선형으로 나열한 데 반해, 이 논문은 step 5–9 사이에 명시적인 loop를 그려 넣어 CRM 특유의 iterative·cross-functional 성격을 반영한다. Step 5 (data governance), 6 (customer data centralization), 7 (people learning) 은 일회성 단계가 아니라 통합 전체에 걸쳐 지속되는 transversal step으로 설계되어 있다.
- **"Why" 가 아니라 "How" 에 집중한 첫 empirical 연구.** *Ledro et al. (2022)* 의 bibliometric review에서 지적한 갭을 같은 저자 그룹이 직접 채운 작업이다. 25개 사례라는 maximum-variation sample (성공·실패 혼합, 7개 산업, IT/FR/CH/NO) 로 일반화 가능성을 확보했다.
- **Ethics by design을 implementation 메커니즘으로 풀어냄.** Privacy·Safety·Fairness·Accountability·Explainability·Well-being·Autonomy의 7원칙(Hub France IA, 2023; Bourgais & Ibnouhsein, 2022 기반) 을 정의하고, ethics committee → cross-disciplinary stakeholder → 정기 compliance review라는 거버넌스 동선을 step별로 지정한다.
- **Customer data centralization과 360도 고객 뷰의 위치 재정의.** 데이터 통합·중앙화를 단순 시스템 인테그레이션이 아니라 CRM strategy의 prerequisite로 격상하고, "data lake" 또는 "customer data platform" 형태로 structured/unstructured 데이터를 한 곳에 모으는 작업을 step 6에 못박았다.
- **Cultural foundation·KPI·scalability를 framing 단계로 끌어옴.** 기존 연구가 "마지막에 문화 만들기" 또는 "deployment 후 성능 평가" 였다면, 이 논문은 customer-centric culture, KPI 정의, scaling 계획을 모두 step 1–4 (planning phase) 에서 못박는다. 이 차이가 성공·실패 사례를 가른다고 주장한다.

## 관련 연구 / 배경 지식

CRM (customer relationship management) 은 단순 고객관리 소프트웨어가 아니라 *Payne & Frow (2005)*, *Boulding et al. (2005)*, *Lemon & Verhoef (2016)* 의 정의처럼 마케팅·IT·조직 전략을 결합해 고객 가치를 극대화하는 strategic concept이다. 일반적으로 operational CRM (영업·마케팅 자동화), analytical CRM (고객 데이터 분석), collaborative CRM (채널 간 협업) 의 세 컴포넌트로 나뉘며, 이번 논문은 세 컴포넌트 모두에 AI가 어떻게 침투하는지를 다룬다.

AI integration 프레임워크 계보를 정리하면 두 갈래가 보인다. 첫째는 **generic AI lifecycle** 계열이다. *Reim et al. (2020)* 의 4단계 roadmap (upper management involvement → BM·ecosystem 이해 → capability tailoring → organizational acceptance), *Herremans (2021)* 의 8단계 strategy framework, *Shrivastav (2021)* 의 5단계 supply chain AI lifecycle, *Lee et al. (2019)* 의 5단계 비즈니스 모델 implementation, *Makarius et al. (2020)* 의 sensing-comprehending-acting-learning 모델이 모두 여기 속한다. 이들은 strategic formulation, people engagement, data management라는 큰 축은 공유하지만 모두 conceptual·secondary data 기반이다. 둘째는 **context-specific AI integration** 계열로 *Holmlund et al. (2020)* (CX 관리), *Shrivastav (2021)* (SCM), *Fenwick et al. (2023)* (HR), *Bonetti et al. (2023)* (retail) 가 있다. 이 중 CRM에 가장 가까운 *Holmlund et al. (2020)* 도 BDA(big data analytics) 중심이라 AI 통합 전반을 다루지는 않는다.

CRM 맥락의 AI 도입 연구 자체는 *Chatterjee et al. (2019, 2021)* 의 organizational readiness framework와 TAM2 기반 채택 모델, *Dastjerdi et al. (2023)* 의 외부 압력(정책·고객 요구) 모델이 대부분이다. 모두 *왜* 채택하는가를 다루지 한 회사의 *어떻게* 를 다루지 않는다. 이 논문의 직전 작업인 *Ledro et al. (2022)* 의 bibliometric review는 1989–2020년 212편을 분석해 "AI-CRM 통합의 process를 다룬 실증 연구가 거의 없다" 는 점을 지적했고, 이번 2025년 논문이 그 갭을 메우는 후속 empirical 작업이다.

방법론적으로는 *Gioia, Corley, & Hamilton (2013)* 의 inductive qualitative methodology를 따른다. open coding으로 first-order 카테고리를 만들고, axial coding으로 second-order theme(=step) 으로 묶고, 다시 aggregate dimension(=macro-phase) 으로 추상화하는 3단계 코딩이다. 이 위에 *Yin (2014)* 의 within-case + cross-case 분석을 얹어 산업·국가·성공 여부에 무관한 공통 패턴을 추출했다.

## 방법 / 프레임워크 상세

### 데이터 수집과 코딩

저자들은 4 라운드의 본 인터뷰(2021.06–2022.05)에서 25명의 응답자를 semi-structured 방식으로 만났고, 그 전에 Round 0에서 protocol 시범 인터뷰를 1건 (tech 회사 C0의 AI/ML-CRM 프로젝트 매니저 C00) 별도로 진행했다. 표본은 maximum-variation 원칙으로 짰다. Round 1–4의 25명은 13개 기업(C 그룹: CA–CM), 6개 솔루션 제공사·컨설턴트(P 그룹: PA–PF), 3명의 도메인 전문가(E 그룹: EA–EC) 에서 나왔는데, CB·CG·CH 세 회사는 두 명의 응답자가 인터뷰에 참여해 합이 25명이 된다. 산업은 보험·은행·식품 리테일·자동차·통신·패션 리테일·제조까지 7개 섹터에 걸쳐 있고, 회사 규모는 1–50명 SME부터 50,000명 이상의 대기업까지, 국가는 IT(이탈리아)·FR·CH·NO를 모두 포함한다. 각 회사의 AI 통합 경험은 성공(S) 과 실패(U) 가 의도적으로 섞여 있다. 응답자는 모두 5년 이상의 CRM·AI 경험을 가진 C-level (CDO, CIO, CEO, CTO, AI center of excellence director 등) 이다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/tab2-sample.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 인터뷰 표본 — Rounds 1–4의 25명 응답자 (회사 13개사 16명, 제공사 6명, 전문가 3명) + Round 0 protocol 시범 1명. 산업·규모·국가·성공 여부가 의도적으로 섞여 있다."
   zoomable=true %}

기억 편향을 줄이기 위해 인터뷰는 프로젝트 착수 1년 이내인 응답자만 받았고, 데이터 수집과 분석을 동시에 진행하면서 emerging concept이 다음 라운드의 인터뷰 가이드를 갱신하도록 했다. Round 3 끝에 approximate theoretical saturation에 도달했고 Round 4에서 새 인사이트가 나오지 않아 saturation이 확정됐다. 데이터 triangulation을 위해 회사 웹사이트, 공식 문서, 뉴스, 비디오, 리포트를 함께 참조했고, 두 번째 인터뷰이로 검증한 케이스도 있다.

코딩은 ATLAS.ti로 진행했고 *Strauss & Corbin (2000)* 의 open-axial 코딩 절차를 따랐다. 100개를 넘는 초기 first-order 카테고리를 46개로 정제하고, 13개 second-order step과 4개 aggregate macro-phase로 묶었다. Cross-case comparison으로 성공·실패 패턴을 비교했으며 SugarCRM과 Microsoft Dynamics 컨설턴트 두 명에게 framework usefulness를 검증받았다 (Appendix B, Table B1).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/tab4-coding.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4: Gioia 코딩 결과 — 46개 first-order 카테고리 → 13개 second-order step (=step 1~13) → 4개 aggregate dimension (=macro-phase 1~4)."
   zoomable=true %}

### 다루는 AI 애플리케이션 범위

응답 회사들이 실제로 도입한 AI 애플리케이션은 마케팅·세일즈·고객서비스 세 영역에 골고루 퍼져 있다. 마케팅 쪽에서는 customer segmentation을 위한 predictive analytics, NLP 기반 이메일·프로모션 자동화, recommendation system을 통한 catalog 자동 채움, sentiment analysis와 social listening, 이탈 위험 고객 예측이 주된 사용 사례다. 세일즈 쪽에서는 가격·사기 탐지를 위한 supervised ML, 가치·시급성 기반 영업 우선순위, best-offer recommendation이 등장한다. 고객서비스 쪽은 personalization algorithm, chatbot, deep learning 기반 이메일·텍스트 분류, 자동 클레임 처리, 문서 자동 분류·전송, life event 예측이 핵심이다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/tab3-ai-applications.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: 인터뷰 회사들이 실제로 사용 중인 AI 애플리케이션을 마케팅·세일즈·고객서비스 세 CRM 프로세스로 분류. 괄호 안의 코드는 회사 ID(Table 2 참조)."
   zoomable=true %}

이 폭을 강조하는 이유는 framework가 chatbot 같은 단일 사용 사례에 묶이지 않고 predictive analytics, NLP, recommendation, 자동화가 모두 통과해야 하는 공통 통합 경로를 제공하기 때문이다.

### 4 macro-phase·13 step 프레임워크

전체 프레임워크는 다음 그림 한 장으로 요약된다. 위쪽이 planning과 data/people 두 macro-phase, 가운데가 model implementation phase, 아래가 assessment·scaling phase다. Step 5–9 사이에는 화살표가 양방향으로 그려져 있는데, 이는 통합이 선형이 아니라 iterative loop라는 점을 표현한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/fig1-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: 성공적인 AI-CRM 통합 프레임워크. 4개의 macro-phase(planning / data·people / model implementation / assessment·improvement)와 13개 step. Step 5~9는 양방향 loop로 연결되어 있다."
   zoomable=true %}

각 macro-phase를 차례대로 풀어보자.

#### Macro-phase 1: AI-CRM integration planning

**Step 1. Strategic goal setting and team formation.** 비즈니스 목표를 처음부터 명확히 잡는다. 응답자들은 KPI를 다섯 카테고리 — algorithm performance, customer metrics, organizational sustainability, processes, user/employee impact — 로 나눠 정의해야 한다고 했다 (Table A3). 막연한 야심으로 시작한 회사는 실패했다 (CC4의 사례: "글로벌 정책 비교 자동화" 라는 너무 복잡한 underwriting 프로세스를 AI로 풀려다 좌초). 동시에 multidisciplinary team을 꾸린다. CDO, domain expert, data scientist, IT, ethics 전문가, requirements engineer가 처음부터 한 자리에 모여야 한다.

**Step 2. Ethics by design for customers, users, and society.** Ethics committee를 띄운다. *Bourgais & Ibnouhsein (2022)* 의 ethics-by-design 개념과 Hub France IA(2023) 의 7원칙 — Privacy, Safety, Fairness, Responsibility/Accountability, Explainability, Well-being, Autonomy — 을 회사 strategy에 맞게 instantiate한다. NLP로 고객 메일을 자동 작성하는 사용 사례라면 성별·인종 stereotype을 강화하지 않도록 가이드라인을 세우는 식이다. 윤리를 부가 활동이 아니라 design constraint로 박는다는 점이 핵심이다.

**Step 3. Customer data comprehension.** 어떤 데이터가 있는지, 누가 관리하는지, 어디 있는지, 왜 수집했는지, 어떻게 관리하는지를 이해한다 (data capital). 다음으로 그 데이터가 AI에 정말 쓸모 있는지 (data usefulness), 접근 가능한지 (data access) 를 평가한다. CD5 사례는 navigation 데이터만 보고 "충분하다" 고 가정했다가 실패한 경우다. CE6은 "나이·이메일·성별·주소를 익명화해서 churn risk 예측에 쓸 수 있게" 라는 GDPR 친화적 접근의 모범 사례다.

**Step 4. Framing of AI-CRM organizational integration.** 가장 무거운 step이다. 어떻게 AI로 목표를 달성할지, make vs. buy 결정, 투자 예산, ownership·sponsor·deadline, 외부 환경 분석 (COVID-19로 많은 모델이 obsolete 됐다는 PE12의 증언이 인상적이다), multidisciplinary team의 role 정의, ethics committee와의 결합, output·boundary 설정, IT 부서와의 통합 계획, 결과 측정 방법, scalability 계획을 모두 framing 단계에 박는다. 이 단계의 충분성이 후속 단계의 성패를 좌우한다.

#### Macro-phase 2: Data governance & people learning and growth

이 macro-phase는 단계로 끝나지 않고 통합 전체에 걸쳐 지속되는 transversal layer다.

**Step 5. Data governance throughout AI-CRM integration and evolution.** Data modeling으로 conceptual representation을 설계하고, 결손 데이터를 채우고, 내부·외부 소스에서 데이터를 수집·통합한다. 수동 입력을 줄이고 (PD11: "log 기반·드롭다운 필드로 정보 분산을 막는다"), validation·cleaning·duplicate 체크를 정기화한다. Privacy·fairness·environmental impact 같은 ethical AI 원칙도 정기 미팅에서 검증한다.

**Step 6. Customer data centralization throughout AI-CRM integration and evolution.** 가장 CRM스러운 step이다. Customer data structuring → information reorganization → 모든 고객 데이터를 단일 시스템에 모으기. 응답자에 따라 customer data platform 또는 data lake로 부르는데, ERP·e-commerce 등 다른 데이터셋과 라벨링·동기화·통합한다. CRM 프로세스 자체를 redesign하고 사람 관점이 아니라 machine 관점으로 데이터를 재구성하는 것 (CE6) 이 핵심이다. 결과물은 360도 omnichannel customer view다.

**Step 7. People learning and growth throughout AI-CRM integration and evolution.** Multidisciplinary·multicultural 팀을 꾸리고, 모든 직원을 대상으로 AI의 목적·능력·한계·위험을 설명하는 트레이닝을 돌린다. CF7 사례는 "300,000명 전 직원을 데이터 관련 주제로 트레이닝" 했다. CC4 사례는 반대로 "ongoing internal resource development를 한 번도 안 했다 — 그게 pitfall이었다" 라는 자기 비판이다. Accountability와 well-being 같은 ethical 원칙을 트레이닝에 넣어 직원 윤리 의식까지 끌어올린다.

#### Macro-phase 3: AI model implementation and governance

**Step 8. Development of the AI model applied to CRM.** 데이터를 train·validation·test set으로 나누고 모델을 학습한다. 차별 유발 변수는 수동 리뷰로 제거하고 skewness를 검증한다 (CF7). Validation set으로 정확도와 알고리즘 효율의 균형을 맞춘다. Explainability·transparency 원칙을 강조하는데, 특히 predictive 모델은 prediction generation을 분해하고 intermediary result를 제공해야 한다. PC10의 모범 사례: "알고리즘 생성 과정과 prediction에 영향을 주는 top-3 factor를 명시한다."

**Step 9. Users' feedback analysis for AI model testing and adjustment.** Test 환경에서 AI 모델을 돌리며 performance와 ethical issue 사이 trade-off를 잡는다. 정기 A/B 테스트, end-to-end 접근, 휴가 시즌(여름 등 engagement 낮은 시기) 회피 같은 운영 노하우가 등장한다. **Human on the loop**: 사람 운영자로 fallback (CG14, PF18), AI 예측 + 사람 판단 결합 (CF7), satisfaction 평가 (PC10), data drift·concept drift 정기 모니터링 (C00, CB3, PE12). 데이터가 갱신될 때마다 새로운 bias·ethical concern을 검토하고 data governance step으로 loop back한다.

**Step 10. Rollout of the AI model applied to CRM.** 최종 모델을 production으로 올린다. 우선 사용자 워크스테이션에 결과를 어떻게 통합할지 정의한다 (CJ22). IT 시스템에 통합하면서 data journey를 만들고, 특히 legacy 시스템과의 연결 문제를 해결한다 (PC10). 비즈니스·IT 부서의 collaborative planning이 필수이고, change management와 user training이 함께 간다.

**Step 11. AI model retraining and governance throughout AI-CRM integration and evolution.** Step 5–7과 마찬가지로 transversal하게 작동한다. Retraining 빈도는 시스템에 따라 다르다 — customer behavior 모니터링은 몇 달 단위 갱신, 기술 시스템은 일 단위 조정 (CG13). 직원·최종 사용자 피드백이 데이터만으로 잡지 못하는 성능 이슈를 잡아낸다. Data scientist가 retraining 책임을 맡고, 자동 alert로 drift 발생 시 retraining을 trigger한다.

#### Macro-phase 4: Assessment and improvement of AI-CRM integration

**Step 12. Performance assessment throughout the AI-CRM evolution.** Step 1에서 정의한 KPI를 정기 측정·모니터링한다. Customer 목표와의 alignment는 dynamic process이므로 지속 평가·조정이 필요하다. Human oversight가 AI가 놓치는 context를 보완하는데, 경험 많은 직원이 AI output을 validate·refine하고 data scientist가 시스템을 능동적으로 모니터링한다.

**Step 13. Scaling of the AI application.** 단일 product 또는 region으로 시작해 신뢰성을 검증한 뒤 확장한다 (PC10). Short-term proof of concept에서 long-term, sustainable 모델로 전환하는 "proof of permanence" (PA8) 가 핵심 개념이다. 시장·법규에 따라 모델을 customizing 해야 하므로, technical team과 다른 비즈니스 unit 간 협업이 scaling sustainability를 결정한다.

### 매니저용 점검 가이드

저자들은 framework를 step별 점검 질문 리스트로 압축한 매니저 가이드도 함께 제시한다 (Fig. 2). 예를 들어 step 1에서는 "당신의 비즈니스 목표는 무엇인가? 그 목표를 달성하기 위해 어떤 KPI를 측정할 것인가? 누가 sponsor인가? Multidisciplinary team을 누구로 구성할 것인가?" 같은 질문을 던진다. 한국 회사들이 분기 리뷰 워크숍에서 그대로 들고 가도 될 만큼 구체적이다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0005-artificial-intelligence-in-customer-relationship-management/fig2-guidelines.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: 13 step별 매니저 점검 질문. AI-CRM 통합 워크숍에서 즉시 사용 가능한 형태로 정리되어 있다."
   zoomable=true %}

## 핵심 분석: 기존 문헌 vs. 이 논문의 새 통찰

저자들은 Appendix C의 Table C1에서 자기 결과가 기존 문헌 대비 어디서 새로운지를 11개 축으로 정리한다. 핵심만 한국어로 추리면 다음과 같다.

- **Cultural foundation·strategic alignment.** 기존: 통합 후반부에 문화 변화 (*Herremans, 2021*). 본 논문: customer-focused culture를 통합 시작 *전*에 박아야 한다.
- **Project sponsorship.** 기존: sponsorship의 중요성 (*Bonetti et al., 2023*). 본 논문: technical sponsorship과 ethical sponsorship의 dual approach.
- **KPI와 continuous monitoring.** 기존: deployment 후 평가 (*Herremans, 2021*; *Holmlund et al., 2020*). 본 논문: implementation 단계에서부터 KPI를 정의하고 monitoring 모듈을 설계.
- **Top management support·cross-functional collaboration.** 기존: 필요성 인정. 본 논문: AI-CRM 프로세스 *처음부터* cross-functional, 그리고 centralized 관리 접근이 효과적.
- **Ethics by design.** 기존: 일반적 ethics 토론 (*Jobin et al., 2019*). 본 논문: ethics committee, 7원칙, 정기 review를 design constraint로 박은 명확한 framework.
- **Domain expert engagement.** 기존: 프로젝트 goal 정의에 domain expert 참여. 본 논문: lifecycle 전반에 걸친 ongoing engagement.
- **Effective communication.** 기존: deployment 후 communication. 본 논문: planning 단계부터 stakeholder 전체에 communication.
- **External environmental factor.** 기존: 명시적으로 다뤄지지 않음. 본 논문: market trend·규제·socioeconomic 변화 모니터링을 framing에 포함 (COVID-19 사례).
- **Scalability.** 기존: implementation 후반에 고려 (*Holmlund et al., 2020*; *Shrivastav, 2021*). 본 논문: framing phase부터 scalability 계획.
- **Data comprehension·centralization.** 기존: data quality·preparation 강조. 본 논문: data centralization과 customer data comprehension 자체를 별도 step으로 격상.
- **User involvement·tacit knowledge.** 기존: validation 단계에서 user feedback 수집 (*Shrivastav, 2021*). 본 논문: planning 단계부터 user 참여, 특히 tacit knowledge 전달 메커니즘 설계.
- **Ethical feedback loop·adaptability.** 기존: continuous improvement loop. 본 논문: ethics·privacy·fairness를 명시적으로 다루는 loop.

이 11개 차이점이 AI-CRM이라는 특수 맥락에서 generic AI integration framework로는 안 되는 이유다.

## 결과 분석: 성공·실패 케이스가 보여주는 것

논문은 응답 케이스를 성공(S) 과 실패(U) 로 라벨링하고 cross-case 비교를 통해 패턴을 추출했다. 주요 실패 케이스를 모아 보면 다음 공통점이 있다.

- **CC4 (스위스 보험, U):** 글로벌 정책 비교·분석을 자동화하려 했으나 underwriting 자체가 너무 복잡해 실패. 야심이 데이터·도메인 능력을 초과한 케이스. 동시에 "ongoing internal resource development를 한 번도 안 했다" 는 자기 비판도 같이 나온다 → step 1·step 7 동시 실패.
- **CD5 (이탈리아 외식기기 제조, U):** Navigation 데이터만 보고 "충분하다" 고 가정했다가 실패 → step 3 (data comprehension) 의 data usefulness 단계 누락.
- **CI17 (이탈리아 자동차 딜러, U):** Relationship intensity 평가를 시도했으나 "데이터가 원래 어떻게 입력됐는지 이해하기 어려웠다" → step 3의 data capital 이해 부재.

성공 케이스는 반대로 다음 패턴을 공유한다.

- **CF7 (프랑스 식품 리테일, S):** Top-down 접근, maturity·impact 분석, key priority 매트릭스로 시작. 30만 명 전 직원 데이터 트레이닝. ML로 omnichannel 전략 최적화. → step 1·4·7이 모두 강하다.
- **CE6 (이탈리아 보험, S):** 익명화된 고객 데이터로 churn risk 예측. Big data lake 구축으로 structured/unstructured 통합. → step 3·6의 모범.
- **CG (이탈리아 통신, S):** 24/7 가상 비서, social media 분석, sentiment analysis까지 광범위 적용. AI center of excellence director가 별도 존재 → step 1의 multidisciplinary team이 잘 작동.

성공·실패의 공통 분모는 명확하다. **planning phase (step 1–4) 의 충실성** 이 결국 후속 단계 전체의 성패를 결정한다. CC4가 실패한 이유는 ML 모델 자체가 약해서가 아니라 step 1에서 야심이 데이터·도메인을 초과했고, step 7에서 직원 학습을 안 했기 때문이다. 반대로 CF7이 성공한 이유는 알고리즘이 특별해서가 아니라 step 1·4·7이 모두 충실했기 때문이다.

## 한계와 비판적 평가

저자들이 인정한 한계:

- 인터뷰 표본의 scope가 broader CRM landscape를 fully cover하지 못한다. 특히 customer-facing employee와 end-user 관점이 빠져 있다.
- Framework usefulness를 두 명의 컨설턴트로만 평가했다. 더 폭넓은 empirical 검증이 필요하다.
- Autonomous AI system 같은 AI 발전이 framework를 어떻게 바꿀지는 다루지 않는다.

리뷰어 입장에서 추가로 보이는 한계:

- **Generative AI 시대 이전의 데이터다.** 인터뷰가 2021.06–2022.05인데 ChatGPT는 2022.11에 등장했다. 25개 사례 모두 predictive analytics·NLP·recommendation 같은 "전통적" ML 사용례이고, LLM 기반 chatbot, RAG, agentic CRM 같은 최신 사례는 들어 있지 않다. Framework의 큰 줄기는 generative AI에도 적용 가능해 보이지만 step 8 (model development) 과 step 9 (testing) 에서의 구체적 실행은 prompt engineering, fine-tuning, hallucination 검증, prompt injection 방어 같은 새 항목을 요구한다.
- **국가 편향.** 표본이 IT·FR 중심이고 NO·CH가 일부, 미국·아시아는 거의 없다. EU GDPR·EU AI Act 환경에서의 ethics by design이 강조되는 것은 자연스럽지만, 데이터 보호 규제가 다른 미국·중국 맥락에서 step 2의 우선순위가 어떻게 달라지는지 framework 자체가 답하지 않는다.
- **Cross-case comparison의 정량성 부재.** 13 step 중 어떤 step이 성패에 가장 결정적인지에 대한 정량 분석이 없다. 사례별 정성 인용이 풍부하지만 "step 1의 KPI 정의가 빠지면 실패 확률 X% 증가" 같은 강한 주장은 없다. Qualitative 연구의 본질적 한계지만, follow-up 정량 연구의 가능성을 시사한다.
- **도메인 expert·data scientist 공급 부족 문제는 framework 외부.** 응답자들이 반복적으로 지적하는 "domain expertise와 data science 양쪽 다 가진 사람이 거의 없다" 는 문제는 framework의 step으로 풀리지 않는 인력 시장 문제다. Framework는 이 인력을 *어떻게 모을지* 가 아니라 모인 후에 *어떻게 일할지* 를 다룬다.
- **Validator 두 명이 자체 시인하듯 "step을 그대로 따르지는 않을 것" 이라고 함.** Sugar CRM 컨설턴트와 Microsoft Dynamics 컨설턴트 모두 framework가 유용하다고 했지만 동시에 "순서대로 따르진 않을 것 같다" 고 했다. Framework 자체의 iterative 설계와 부합하지만, "어떤 순서를 어떻게 깰 수 있는가" 에 대한 가이드가 없다는 점은 약점이다.

## 시사점 / Takeaways

- **AI-CRM 통합은 model 문제가 아니라 process 문제다.** 25 케이스가 일관되게 보여주는 것은, 알고리즘 선택이 아니라 step 1–4의 planning 충실성이 성패를 가른다는 점이다. "어떤 모델을 쓸까" 보다 "왜 이걸 하는가, KPI는 무엇인가, 누구와 함께 하는가, 어떤 데이터로 가능한가" 를 먼저 답해야 한다.
- **Ethics by design은 수사가 아니라 step 2의 실행 가능한 활동이다.** Ethics committee를 띄우고, 7원칙을 회사 컨텍스트에 instantiate하고, 정기 compliance review를 박는 것 — 이 메커니즘 없이 "우리는 윤리적 AI를 추구합니다" 는 빈 슬로건이다. EU AI Act가 발효된 2026년 시점에서 더 무게가 실린다.
- **Customer data centralization은 시스템 통합이 아니라 strategy 결정이다.** Step 6은 단순한 ETL 작업이 아니라 CRM 전체 프로세스를 machine 관점으로 재설계하는 작업이다. Data lake를 만들었다고 끝나는 게 아니라, 360도 customer view가 모든 채널·모든 부서에 동일하게 노출되도록 거버넌스를 짜는 일이다.
- **Step 5–9는 loop이지 sequence가 아니다.** Data drift가 생기면 step 5로 돌아가고, user feedback이 부정적이면 step 8로 돌아간다. 한 번에 끝낼 수 있다는 환상은 실패의 가장 빠른 길이다. Validator들이 "순서대로 따르진 않을 것" 이라고 한 이유다.
- **People learning and growth가 transversal한 이유: AI는 사람을 대체하는 게 아니라 협업한다.** Step 7은 일회성 트레이닝이 아니라 통합 전체에 걸친 layer다. Human on the loop fallback, AI 예측 + 사람 판단 결합, satisfaction 평가는 step 9에 명시되어 있다. CC4가 실패한 핵심 원인 중 하나가 "ongoing resource development 부재" 였다는 점은 한국 회사에도 그대로 적용된다.

## 한국 CRM 도입 현장에서의 적용 메모

논문의 표본에는 한국 회사가 없지만, 한국 시장의 특수 사항을 얹어 생각하면 다음 점을 더 신경 써야 한다.

- **개인정보보호법(PIPA) 과 step 2·3의 결합.** EU의 GDPR보다 한국의 PIPA는 가명정보·익명정보 구분, 신용정보법과의 충돌, 마이데이터 사업자 인가 같은 추가 레이어가 있다. CE6의 "익명화 후 churn 예측" 모범 사례는 한국에선 가명정보 처리 방침과 정보주체 동의 동선을 함께 설계해야 한다.
- **Centralized 관리에 대한 조직 저항.** 논문은 centralized AI 관리 접근이 효과적이라고 하지만, 한국 대기업의 사업부 자율성·계열사 분리 구조에서는 그룹 데이터 거버넌스 위원회가 어디에 위치할지 (지주회사? CDO 산하?) 자체가 정치적 이슈가 된다.
- **Step 7의 트레이닝 밀도.** CF7의 30만 명 전 직원 트레이닝은 한국 대기업에서도 가능하지만, 외주 콜센터·계약직 종사자까지 cover하는 트레이닝은 별도 설계가 필요하다.
- **Generative AI 시대의 step 8·9 보완.** 2026년 시점의 한국 회사들은 LLM 기반 챗봇·RAG·agentic 워크플로우를 도입 중인데, 논문 framework의 step 8 (model development) 에 prompt engineering·fine-tuning 단계가, step 9 (testing) 에 hallucination·prompt injection 검증이 추가되어야 실용적이다.

## 참고 자료

- 논문: <https://doi.org/10.1016/j.jbusres.2025.115531> (Open Access, CC BY)
- ScienceDirect: <https://www.sciencedirect.com/science/article/pii/S0148296325003546>
- 저자 그룹의 직전 작업 (literature review): <https://doi.org/10.1108/JBIM-07-2021-0332>
- 7 ethical principles 출처: Hub France IA (2023); Bourgais & Ibnouhsein (2022)

## 더 읽어보기

- **[Artificial intelligence in customer relationship management: literature review and future research directions](https://doi.org/10.1108/JBIM-07-2021-0332)** (Ledro et al., 2022) — 같은 저자 그룹의 직전 bibliometric 리뷰. 1989–2020년 212편을 분석해 AI-CRM "process" 연구의 갭을 지적했고, 본 2025 논문이 그 갭을 empirical로 메운다.
- **[Are CRM systems ready for AI integration? A conceptual framework of organizational readiness for effective AI-CRM integration](https://doi.org/10.1108/BL-02-2019-0069)** (Chatterjee et al., 2019) — AI-CRM 도입의 organizational readiness를 16개 CSF로 정리한 conceptual 작업. 본 논문이 인용하는 핵심 선행 연구.
- **[Artificial Intelligence and Marketing: Pitfalls and Opportunities](https://doi.org/10.1016/j.intmar.2020.04.007)** (De Bruyn et al., 2020) — 마케팅 맥락에서 AI의 함정 (objective function 정의 오류, 비현실적 학습 환경, biased AI, explainability) 을 다룬 *Journal of Interactive Marketing* 논문. CRM의 marketing 영역 step 8·9 설계에 직접 활용 가능.
- **[Implementation of Artificial Intelligence (AI): A Roadmap for Business Model Innovation](https://doi.org/10.3390/ai1020011)** (Reim et al., 2020) — AI 도입을 위한 generic 4단계 roadmap. 본 논문이 "linear, non-CRM-specific" 의 대표 예로 인용한다. CRM 맥락 없이 일반론을 보고 싶을 때 참고.
- **[Ethics-by-design: the next frontier of industrialization](https://doi.org/10.1007/s43681-021-00057-0)** (Bourgais & Ibnouhsein, 2022) — Step 2 ethics by design의 conceptual 출처. 산업화된 AI에서 ethics가 deployment 후가 아니라 design 단계에서 들어가야 하는 이유를 정리.
- **[Practice co-evolution: Collaboratively embedding artificial intelligence in retail practices](https://doi.org/10.1007/s11747-022-00896-1)** (Bonetti et al., JAMS 2023) — 5년간의 ethnographic 연구로 retail에서 AI가 직원 practice를 어떻게 co-evolve하게 만드는지 분석. 본 논문의 step 7 (people learning) 의 retail 케이스 깊이 있는 보완 자료.

---
layout: post
title: "[논문 리뷰] ScientistOne: Towards Human-Level Autonomous Research via Chain-of-Evidence"
date: 2026-08-04 14:00:00 +0900
description: "자율 연구 에이전트의 논문은 잘 읽히지만 근거가 끊겨 있다. 논문 75편을 감사해 baseline 전원의 체계적 실패를 드러내고, 모든 claim 을 근거에 묶은 채로 논문을 쓰는 시스템을 제시한 Google Cloud AI Research 의 작업."
tags: [autonomous-research, llm-agents, verifiability, hallucination, evaluation, ai-scientist]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig1-pipeline.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/
en_url: /en/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/
---

{% include lang_toggle.html %}

#### 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Rui Meng et al. (13명 공동 저자, Google Cloud AI Research) |
| 학회 | arXiv · 2026 |
| arXiv 또는 DOI | [2605.26340](https://arxiv.org/abs/2605.26340) |
| Code | [scientist-one/generated-artifacts](https://github.com/scientist-one/generated-artifacts) — 시스템 소스가 아니라 생성된 논문·solver 코드 아티팩트 공개 |
| 데이터 | ADRS 시스템 최적화 5개 태스크 · MLE-Bench Kaggle 5개 태스크 · Parameter Golf — 5개 시스템 × 3 seed × 5 태스크 = 논문 75편 감사 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-08-04 |

#### TL;DR

- 자율 연구 에이전트는 이미 사람 전문가에 견줄 만한 해법을 내놓고 학회 템플릿에 맞는 논문까지 쓴다. 그런데 그 논문의 <strong>근거 사슬이 끊겨 있는지</strong>를 아무도 검사하지 않는다. 조작된 인용, 재현되지 않는 점수, 코드와 다른 method 절이 모두 "표면 품질" 평가를 통과한다.
- 저자들은 Chain-of-Evidence (CoE) 라는 검증 가능성 표준을 세우고 — 모든 claim 은 기록된 근거 사슬을 통해 grounding source 까지 추적되어야 한다 — 이를 만족하도록 설계된 end-to-end 시스템 ScientistOne, 그리고 어떤 시스템에도 똑같이 적용되는 사후 감사 CoE Integrity Audit (4개 check) 을 함께 제시한다.
- 5개 시스템 × 5개 태스크 × 3 seed = 논문 75편을 감사한 결과 <strong>모든 baseline 이 최소 하나의 체계적 실패 모드를 보였다.</strong> 조작 인용 비율은 최대 20.9% (DeepScientist 42/201), 점수 재현은 42% (ARC·Sakana 5/12) 까지 떨어지고, method-code 정합성은 20-80% 사이에 흩어진다.
- ScientistOne 은 네 check 전부에서 선두다. 점수 재현 12/12, 조작 인용 0/337, method-code 정합 14/15, spec 위반 0/15. 자동 리뷰 accept 율도 6/15 (40%) 로 최고 baseline (AI-Researcher 13%) 의 3배다. 동시에 ADRS 5개 태스크 전부에서 사람 전문가 baseline 을 넘는다.
- 다만 부록을 읽으면 헤드라인이 흔들린다. ScientistOne 의 "spec 위반 0건" 은 5인 판정 다수결의 산물이고, 부록 각주는 <em>ScientistOne seed 2 의 LLM-SQL 코드에도 같은 벤치마크 exploit 이 들어 있다</em>고 인정한다 (5명 중 1명만 flag). 검증 가능성을 주제로 한 논문의 헤드라인 숫자가, 같은 논문의 근거와 어긋나는 자리다.

#### 소개 (Introduction)

지난 2년 사이 "AI 가 연구를 한다" 는 말의 의미가 바뀌었다. 처음엔 아이디어 브레인스토밍 보조였고, 다음엔 코드 작성 보조였다. 이제는 문헌 조사부터 가설 생성, 실험 설계와 실행, 원고 작성까지 전 과정을 끝까지 도는 파이프라인이 여럿 나와 있다 (Lu et al., 2024; Schmidgall et al., 2025; Yamada et al., 2025; Tang et al., 2025; Weng et al., 2025). 시스템 최적화 태스크에서는 이런 에이전트가 사람 전문가와 경쟁할 만한 해법을 만들고 (Cheng et al., 2025b; Novikov et al., 2025), 워크숍에 실제로 accept 된 논문을 생성한 파이프라인도 있다 (Yamada et al., 2025). 코드와 실험 결과, 그리고 학회 형식에 맞는 원고까지 놓고 보면 사람이 쓴 연구와 표면 품질만으로 구별하기가 점점 어려워진다.

이 논문이 지적하는 것은 그 표면 아래의 구조적 긴장이다. 자율 연구 시스템은 각 단계가 앞 단계의 출력을 소비하는 다단 파이프라인이다. 문헌 요약이 가설을 정하고, 가설이 실험을 정하고, 실험 결과가 원고로 흘러든다. 이런 구조에서 한 단계에 들어온 오류는 보존되는 데 그치지 않고 <strong>증폭된다.</strong> 잘못된 요약은 실험 설계를 비틀고, 잘못 해석된 결과는 논문 전체를 관통한다. 그리고 같은 오류가 모든 절에 일관되게 반영되기 때문에 오히려 <em>내부적으로 정합해 보인다.</em> 궤적이 길어질수록 위험도 커진다. 에이전트는 계속 팽창하는 컨텍스트를 추적하지 못하고 (Liu et al., 2024; 2023b), 환각을 내고, 원래 목표에서 표류한다. 여기에 언어 모델이 근거를 다루는 방식의 근본적 한계가 겹친다. 생성된 텍스트는 출처와 대조하기 어렵고 (Liu et al., 2023a), 사실 주장은 grounding 에서 떨어져 나가고 (Min et al., 2023), 과학 인용은 부정확하거나 조작되는 일이 잦다 (Press et al., 2024).

문제는 기존 평가 프로토콜이 이 실패 모드를 <strong>측정하지 않는다</strong>는 데 있다. 자동 리뷰 점수든 벤치마크 리더보드든, 재는 것은 표면 표현 — 논문이 얼마나 잘 읽히는가 — 과 절차 완료 여부다. 개별 claim 이 뒷받침되는 근거까지 추적되는지는 누구도 확인하지 않는다. 저자들의 진단은 명료하다. 두 가지 공백이 같은 뿌리를 갖는다. <em>claim 이 뒷받침되는지 감사하는 평가 프로토콜이 없고, claim 을 근거까지 되짚도록 설계된 자율 연구 시스템도 없다.</em> 이 논문은 그 공백을 표준 · 시스템 · 감사 세 축으로 동시에 채우려 한다.

#### 핵심 기여 (Key Contributions)

1. **CoE 표준.** claim 을 citation · numerical · methodological · conclusion 네 유형으로 나누고, 유형별로 요구되는 근거 사슬의 형태를 규정한다. ACID (Härder and Reuter, 1983) 가 데이터베이스 트랜잭션에 "신뢰 가능" 의 뜻을 정의한 것처럼, CoE 는 연구 claim 에 "검증 가능" 의 뜻을 정의한다. 결정적으로 CoE 는 <strong>아키텍처 불가지론적</strong>이다. 시스템을 어떻게 만들라고 말하지 않고, 산출물이 어떤 성질을 가져야 하는지만 말한다.
2. **ScientistOne.** Problem Investigator → Discovery Engine → Paper Writer with Claim Verifier 로 이어지는 end-to-end 시스템으로, CoE 를 사후에 복원하는 게 아니라 <em>구성상</em> 만족하도록 설계됐다. PI 는 주제당 최대 100편의 full-text PDF 를 읽고, Claim Verifier 는 최종 논문이 나오기 전에 초고의 모든 claim 을 선언된 근거와 대조한다.
3. **CoE Integrity Audit.** 시스템 종류와 무관하게 제출된 산출물만 보고 돌아가는 사후 감사. score verification, specification violation, reference verification, method-code alignment 네 개 check 로 구성되며 가장 파괴적인 근거 사슬 붕괴를 겨냥한다.
4. **논문 75편 규모의 실증.** 5개 시스템을 ADRS 벤치마크에 동일 조건으로 이식해 seed 3개씩 돌려 논문 75편을 만들고 전부 감사했다. 리뷰어 관점에서 이 논문의 가장 큰 가치는 ScientistOne 자체보다 <strong>이 감사 결과의 구체성</strong>에 있다. 어떤 에이전트가 어떤 방식으로 근거를 끊는지가 사례 수준까지 기록되어 있다.

#### 관련 연구 / 배경 지식

**자율 연구 에이전트.** 이 계열은 제한된 ML 템플릿에서 시작해 문헌 grounding, 가설 생성, 실험, 논문 작성을 조율하는 다단 파이프라인으로 빠르게 확장됐다. The AI Scientist (Lu et al., 2024) 가 end-to-end 자동화를 처음 열었지만 고정된 ML 템플릿 위에서 동작하고 작성 단계의 환각이 잦았다. AI Scientist-v2 (Yamada et al., 2025) 는 실험 branch 에 best-first tree search (BFTS) 와 review-aware 보고를 얹어 워크숍 수준 품질에 도달했다. 이후 갈래가 벌어진다. PiFlow (Pu et al., 2025) 는 정보이론적 원리 선택으로 가설 탐색을 조종하고, CodeScientist (Jansen et al., 2025) 는 문헌과 코드에 ideation 을 함께 grounding 한다. Curie (Kon et al., 2025a) 는 재현성 검사로 실험 실행을 검증하는데, 이 논문의 I1 Score Verification 과 유사하지만 <em>작성된 claim 이 검증된 결과를 충실히 반영하는지</em>는 감사하지 않는다. AlphaEvolve (Novikov et al., 2025) 는 진화 탐색을 알고리즘 최적화에 적용하고, EvoScientist (Lyu et al., 2026) 는 멀티에이전트 자기진화로 end-to-end 발견을 노린다.

이 다양성 아래 공통 패턴이 하나 있다는 것이 저자들의 관찰이다. <strong>생성과 실행 능력이 검증과 provenance 메커니즘보다 훨씬 빠르게 커졌다.</strong> 그래서 학회 형식에 맞고 잘 읽히는 원고가 여전히 끊긴 근거 사슬을 품고 있을 수 있다. ScientistOne 이 겨냥하는 건 자율성의 프런티어를 미는 것이 아니라 그 산출물을 검증 가능하게 만드는 쪽이다.

**LLM 최적화와 벤치마크.** 주 평가 무대인 ADRS 벤치마크 (Cheng et al., 2025b) 는 실제 프런티어 컴퓨터 시스템 연구 문제를 모은다. EvoX (Liu et al., 2026b) 와 AdaEvolve (Cemri et al., 2026) 는 문헌 grounding 이나 논문 작성 없이 알고리즘 발견·구현에만 집중해 ADRS 에서 강한 결과를 낸다. 연구 인접 능력을 재는 벤치마크도 늘었다 — Auto-Bench (Chen et al., 2025), ResearchBench (Liu et al., 2025), ResearcherBench (Xu et al., 2025). 실험 실행 신뢰성을 압박하는 MLAgentBench (Huang et al., 2023), EXP-Bench (Kon et al., 2025b), PaperBench (Starace et al., 2025) 도 있다. 그런데 이들 대부분이 재는 것은 <em>발견 성능</em> — 시스템이 경쟁력 있는 해법을 낼 수 있는가 — 이지, 그 결과 claim 이 실제로 근거에 의해 뒷받침되는가는 아니다.

**과학적 무결성과 provenance.** 현행 시스템의 traceability 는 두 갈래다. LLM 이 에이전트 출력에서 산문을 바로 뽑는 직접 원고 작성 (Jansen et al., 2025; Lu et al., 2024; Tang et al., 2025), 그리고 리뷰어 피드백으로 원고를 다듬는 review-aware revision (Yamada et al., 2025). 두 방식 모두 유창한 논문을 만들지만 <strong>보고된 숫자가 특정 실행 아티팩트로 되짚어지도록 보장하는 메커니즘이 없다.</strong> 인용 검증 가능성 (Liu et al., 2023a), 사실 정확도 (Min et al., 2023), 인용 귀속 (Press et al., 2024) 을 다룬 선행 연구는 텍스트 수준의 사후 탐지다. CoE 는 두 가지 점에서 다르다. 검증 가능성을 <em>개별 claim 수준</em>에서 정의하고, 텍스트뿐 아니라 논문 · 코드 · evaluator 로그를 함께 커버한다.

#### 방법 / 아키텍처 상세

### Chain-of-Evidence: 무엇을 요구하는가

원칙은 한 문장이다. **연구 시스템이 만들어낸 모든 claim 은 기록된 지원 claim · 근거의 사슬을 통해 grounding source 까지 추적 가능해야 한다.**

저자들이 ACID 비유를 끌어오는 방식이 이 표준의 성격을 잘 보여준다. ACID 를 위반하는 데이터베이스는 데이터를 조용히 손상시키면서도 그럴듯한 쿼리 결과를 돌려준다. 한 계좌에서 출금은 됐는데 다른 계좌에 입금이 안 됐어도 두 잔액 모두 유효해 보인다. CoE 를 위반하는 연구 시스템도 같다. 논문은 잘 읽히는데 점수가 재현되지 않는다. 그리고 ACID 가 데이터베이스를 <em>어떻게</em> 만들라고 규정하지 않고 어떤 성질을 가져야 하는지만 규정하듯, CoE 도 연구 아티팩트에 대해 같은 역할을 한다.

네 개의 claim 유형과 각각의 근거 사슬 형태:

| claim 유형 | 예시 | 요구되는 근거 사슬 |
|------|------|------|
| Citation | "Smith et al. 이 X 를 보였다" | 인용 문헌이 학술 DB 에 실존하고, 그 내용이 논문에서 서술된 방식과 일치 |
| Numerical | "Prism 에서 87.3% 달성" | 보고된 값이 기록된 출력 (실행 로그, 실험 측정, 시뮬레이션 결과) 으로 추적 |
| Methodological | "3-layer MLP 를 쓴다" | method 서술이 대응하는 구현으로 resolve |
| Conclusion | "baseline 을 5% 앞선다" | 지원 claim (numerical / methodological / 양쪽) 에서 검증 가능한 추론으로 도출 |

이 분류는 의도적으로 완전하지 않다. 현행 도구로 다루기 쉬운 유형만 담고, 정성적 관찰이나 이론적 성질처럼 도메인 전문성이나 주관적 판단이 필요한 유형은 제외했다. 표준은 저자 불가지론적이기도 하다 — 사람이 쓴 논문이든 기계가 쓴 논문이든 같은 근거 사슬을 요구한다. 다만 자율 시스템의 실패 모드가 체계적이고 규모가 빠르게 커지고 있기 때문에 초점을 그쪽에 둔다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig1-pipeline.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: ScientistOne 파이프라인. Stage 1 은 검색해 온 PDF 로 문헌을 grounding 하고, Stage 2 는 병렬 branch 에서 해법을 탐색·평가하며, Stage 3 는 논문을 작성한 뒤 Claim Verifier 가 모든 claim 을 근거와 대조한 다음에야 최종 출력을 낸다."
   zoomable=true %}

### Stage 1: Problem Investigator — 인용을 검색으로만 만든다

Problem Investigator (PI) 의 설계 목표는 단순하다. 시스템이 인용하는 모든 논문이 학술 DB 에서 <strong>실제로 검색되고, full text 로 읽히고, provenance 메타데이터와 함께 기록되게</strong> 만드는 것. 구조화된 검색 없이 인용을 만들면 모델 파라메트릭 메모리에서 참고문헌이 나오고, 감사 결과 검색 기반이 없는 시스템의 조작 인용 비율은 최대 20.9% 에 달했다.

PI 는 파일 기반 아티팩트로 통신하는 5단 파이프라인 (+ 보조 2단) 이다.

- **Stage 1 — Citation Graph.** seed 논문 2-4편에서 출발해 Semantic Scholar API 의 references / citations 를 최대 2 hop 순회, 후보 논문 약 2,000-5,000편의 인용 그래프를 만든다.
- **Stage 2 — Literature Filter.** LLM 이 각 논문을 methodology relevance 와 problem alignment 두 축에서 1-5 로 채점하고 tier 로 분류한다. Core (양쪽 ≥4), Adjacent (한쪽 ≥4, 다른 쪽 ≥3), Spark, Noise. 결과 elite pool 은 약 500편. Core+Adjacent 가 5편 미만이면 topic-relevance gate 가 파이프라인을 중단시켜, 약한 seed 에서 시작한 표류를 하류로 흘려보내지 않는다.
- **Stage 3 — Multi-Round Investigation.** Principal Investigator 에이전트가 3 라운드에 걸쳐 전문 하위 에이전트를 조율한다. 각 라운드는 elite pool 에서 후보 선택 (Librarian), 병렬 PDF 읽기와 구조화 노트 추출 (Researcher 5개), 주제별 research direction dossier 로 합성 (SubdomainWriter) 으로 구성된다. IslandConsolidator 가 라운드마다 중복 방향을 병합하고 품질 낮은 방향을 퇴출시킨다. 목표는 논문 노트 약 100건을 5-15개 research direction 으로 조직하는 것.
- **Stage 4 — Evaluation Protocol Audit & Targeted Literature Refresh.** 방향별 감사 보고서를 만들어 체크리스트 rubric 으로 채점하고, 방향이 통과할 때까지 여러 라운드 반복한다. 승리한 방향에 대해 집중 mini citation crawl 로 논문 노트 20-30건을 추가해 감사에서 드러난 공백을 메운다.
- **Stage 5 — Experiment Brief Synthesis.** 방향을 seed relevance 로 채점한 뒤 절 단위 writer 가 최대 5 라운드 critic loop (절 수준 수정 포함) 를 거쳐 최종 Experiment Brief 를 만든다. Brief 는 세 절로 구성된다. (1) 기법 taxonomy 와 최고 기록을 담은 research landscape, (2) baseline · metric · ablation 설계를 담은 구체적 실험 계획, (3) 원본 PDF 에서 추출한 논문 노트로 추적되는 references 25-40건의 literature context.

### Stage 2: Discovery — Parallel Explore-Exploit

Ideator 가 PI brief 를 바탕으로 후보 접근법을 생성하고 novelty 와 feasibility 로 채점한 뒤, 상위 제안을 Parallel Explore-Exploit (PEE) orchestrator 의 병렬 branch 에 분배한다. 각 branch 는 독립 cycle 을 돈다. Solver 에이전트가 노드당 최대 $E$ 개의 평가된 버전을 반복 생성하고, 태스크별 evaluator 가 각 제출을 채점한다. 매 iteration 에서 상위 $K$ 개 branch 가 유지되고, 남은 슬롯은 그 상위 성능자에서 파생된 새 branch 로 fresh ideation 을 통해 채워진다.

$I$ iteration × $B$ branch 를 다 돈 뒤 best-run selector 가 <strong>specification 위반으로 flag 된 해법을 걸러내고</strong> 남은 것 중 최고 점수 해법을 골라 ablation 실험을 돌린다. evaluator 점수, 실행 로그, ablation 결과가 Stage 3 의 원자료로 넘어간다.

Solver 는 두 에이전트로 나뉜다. Solution Development Agent 는 파일 I/O, 커맨드라인 실행, 해법 관리, knowledge base 검색 도구를 갖춘 샌드박스에서 실험 실행 → 오류 디버깅 → validation metric 최적화 루프를 돌리며 experimental log 를 유지한다. Report Writing Agent 는 실험 아티팩트를 파싱해 방법론과 결과를 요약한 기술 보고서를 만든다.

### Stage 3: Paper Writer — "산문보다 provenance 를 먼저"

Paper Writer 는 5단 pipeline 이다. 핵심은 <strong>앞의 네 단계가 LaTeX 가 아니라 research representation 위에서 동작한다</strong>는 점 — inline 근거 주석을 가진 구조화된 markdown narrative 다.

- **Conceive.** 단일 LLM 호출이 모든 원자료 (PI brief, experimental log, evaluator 점수, solver 코드, seed 논문 abstract) 를 읽고 초기 research representation 을 만든다. problem → gap → approach → result → limitation 의 story arc 를 담고, 모든 사실 claim 이 특정 workspace 아티팩트 (로그 라인, 점수 파일 항목, citation key, ablation 항목) 에 묶이는 inline 근거 태그를 달고 나온다. 이 단계는 서술 구조를 세우지만 근거 사슬을 검증하지는 않는다.
- **Ground.** 각 근거 주석을 원자료에 대해 결정론적으로 검증한다. 보고된 점수는 discovery 의 best-run 점수와 일치해야 하고, baseline 은 PI brief 항목으로 추적되어 `VERIFIED` 이거나 `ESTIMATED` 로 표시되어야 하며 (귀속 없는 "리더보드" 참조는 flag), 참조된 모든 아티팩트가 존재해야 하고, 기대되는 절이 다 있어야 하며, 과장 표현 수와 알려진 점수 불일치가 기록된다. 각 claim 은 `SUPPORTED` / `PARTIAL` / `UNSUPPORTED` 라벨을 받고 전체 grounding ratio (supported / total) 가 계산된다.
- **Critic.** 단일 LLM 호출이 story 수준 정합성을 감사한다. gap-approach 정렬, 내부 모순, 근거 강도에 비한 과잉 주장, 빠진 비교, baseline 공정성, 정직한 한계 서술. `PASS` 또는 `MAJOR`/`MINOR` 이슈 목록을 돌려준다.
- **Resolve.** 단일 LLM 호출이 Ground flag 와 Critic 이슈를 <em>함께</em> 반영해 representation 을 재작성한다. 뒷받침되지 않는 claim 은 삭제하거나 약화시키고, 모순은 검증된 출처로 해소하고, 과잉 주장은 캘리브레이션하고, 빠진 비교를 채운다. Ground → Critic → Resolve 루프는 최대 2 라운드 돌고 수렴 (flag 0) 또는 plateau (flag 수가 더 줄지 않음) 에서 종료한다. grounding ratio 가 설정 임계 아래로 남으면 <strong>빈약하게 grounding 된 초고를 내는 대신 run 자체를 중단한다.</strong>
- **Compose.** grounding 된 representation 이 절별 writer 에 넘어가 한 절씩 LaTeX 를 emit 한다. 각 절 writer 는 representation 과 함께 <em>검증된 숫자와 이름 붙은 baseline</em>을 받으므로, 나중에 출처를 붙여야 하는 claim 을 만들어내는 게 아니라 이미 확정된 사실 주변에 산문을 쓴다.

**Claim Verifier.** grounding 이후에도 composed LaTeX 는 여전히 뒷받침되지 않는 claim 을 들여올 수 있다 — 패러프레이즈 표류, 잘못 귀속된 인용, 수치 반올림 오류. Claim Verifier 는 초고의 모든 claim 을 선언된 근거 출처와 대조하며 claim 유형별로 dispatch 한다.

- **Numerical claims** — 인용된 근거 (로그 라인, ablation 항목, PI baseline) 에 대해 수치 tolerance 로 검사. 로그 라인은 ±3 라인 window 를 두고, percent-vs-fraction, millisecond-vs-second 불일치를 단위 인식으로 정규화한다.
- **Citation claims** — cite key 를 bibliography 에서 resolve 한 뒤, 인용된 논문의 abstract 가 그 구체적 주장을 뒷받침하는지 one-shot LLM judge (JSON mode) 에게 묻는다.
- **Methodological claims** — experimental log 의 인용된 영역에 대해 실질적 텍스트 중첩으로 검사.

"unsourced" 로 태깅되거나 주석이 malformed 인 claim 은 자동으로 삭제되고, 각각에 대해 break code 가 기록된다. refinement pass 가 verifier 결과를 소비해 flag 된 문장을 근거 출처에 맞게 재작성하고, 뒷받침될 수 없는 claim 을 제거하고, 최종 LaTeX 에서 모든 inline 근거 주석을 벗겨낸다. <strong>blocking violation 이 남지 않은 초고만 최종 논문으로 승격된다.</strong>

#### 검증 기준의 형식화

이 논문에는 학습 목표가 없다 — 모델을 학습시키지 않고 오케스트레이션과 감사를 설계한다. 그 대신 "통과" 를 정의하는 세 개의 정량 기준이 손실 함수의 자리를 차지한다.

**1. 적응적 점수 tolerance.** ADRS evaluator 는 run 마다 확률적 분산을 보인다 (Cemri et al., 2026; Liu et al., 2026b). 그래서 각 evaluator 를 5회 실행하고 다음 tolerance 로 비교한다.

$$
\text{tolerance} = \max\left(1\%,\ \frac{3\sigma}{|\bar{s}|}\right)
$$

$\sigma$ 는 5회 실행 점수의 표준편차, $\bar{s}$ 는 그 평균이다. 즉 evaluator 자체의 노이즈가 큰 태스크에서는 tolerance 가 자동으로 넓어지고, 결정론적인 태스크에서는 1% 로 좁혀진다. 이 구조 덕분에 "확률적 노이즈 때문에 실패했다" 는 변명과 진짜 값 불일치가 구별된다 — 실제로 ARC 의 `txn_scheduling` 실패는 seed 없는 스케줄링 무작위성에서 온 2-3% 분산으로 분류됐다.

**2. Grounding ratio.** Ground 단계가 계산하는 supported claim / total claim 비율. 이 값이 설정 임계 아래에 머물면 run 을 중단한다. 논문은 임계 수치를 공개하지 않는다.

**3. Numerical Claim Provenance Rate (CPR).** 감사의 네 check 는 <em>forensic</em> 하다 — 제출된 아티팩트만 보고 모든 시스템에 동일하게 적용된다. 반면 작성 시점에 구조화된 provenance 를 emit 하는 시스템에는 <em>native</em> check 가 하나 더 가능해진다. 논문의 정량 claim 중 experimental log 의 대응 항목으로 추적되는 비율이다. 작성 과정에서 writer 는 숫자가 든 각 문장에 `{source: "experimental_log.md:N"}` 태그를 달아 특정 로그 라인에 묶는다. claim verifier (`check_sources`) 가 문장과 참조된 로그 라인에서 각각 숫자를 추출해 5% 상대 tolerance 안에서 일치하는지 확인한다. 이 check 는 ScientistOne 에만 적용된다 — 평가 대상 중 필요한 provenance 기록을 만드는 시스템이 이것뿐이다.

#### 감사 파이프라인과 실험 설정

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig2-coe-audit.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: CoE Integrity Audit 개요. adapter 가 시스템별 산출물을 공통 artifact bundle 로 정규화하고, 그 위에서 네 가지 integrity check 가 독립적으로 돌아간다."
   zoomable=true %}

adapter 가 각 시스템의 산출물 (`paper.tex`, solution code, `references.bib`) 을 공통 artifact bundle 로 정규화하면 네 check 가 독립적으로 돈다.

| check | 방식 | 판정 | 자동화 수준 | 사용 모델 |
|------|------|------|------|------|
| I1 Score Verification | 논문 TeX·PDF 에서 점수 추출 → golden evaluator 로 재실행 → 적응적 tolerance 내 비교 | match / mismatch | LLM 추출 + 자동 비교 | Gemini 3 Flash |
| I2 Specification Violation | solution code 를 golden evaluator·task spec 과 대조 | clean / flagged | LLM 판정 (다수결) | Gemini 3.1 Pro |
| I3 Reference Verification | bib 항목을 Semantic Scholar · arXiv · OpenAlex · CrossRef 에 arXiv ID·DOI·제목으로 조회 | verified / hallucinated | 자동 + LLM disambiguation | Gemini 3 Flash |
| I4 Method-Code Alignment | method 절과 solution code 를 나란히 읽고 판단 | aligned / misaligned | LLM 판정 (다수결) | Gemini 3.1 Pro |

몇 가지 판정 기준이 중요하다. I2 의 specification 위반은 solution code 가 태스크 규칙을 깨는 경우 — evaluator 채점 로직을 역공학하거나, 알려진 테스트 케이스에 답을 하드코딩하는 등 — 을 말한다. 문제를 진짜로 푸는 대신 점수를 최적화하는 행동이다. I3 는 실존 여부만 보지 않고, LLM 이 반환된 레코드에 대해 bib 항목 전체를 교차 확인해 near-miss 와 citation gaming (예: 조작된 서술에 실제 DOI 를 붙이는 경우) 을 잡는다. I4 는 <strong>허용 가능한 단순화 (구현 디테일 생략) 를 aligned 로 취급하고</strong>, 논문이 근본적으로 다른 알고리즘을 서술한 경우만 misaligned 로 센다.

**벤치마크와 baseline.** 주 평가 무대는 ADRS 벤치마크 (Cheng et al., 2025a,b) 의 5개 태스크다. Prism (GPU 간 LLM-serving 모델 배치), Cloudcast (클라우드 네트워크 비용 최적화), EPLB (MoE 모델의 expert-parallel 로드 밸런싱), LLM-SQL (LLM prefix cache 재사용을 위한 tabular 데이터 레이아웃), TXN (makespan 최소화 트랜잭션 스케줄링). ADRS 를 고른 이유는 세 가지 — 실제 시스템 최적화 문제이고 사람 baseline 이 확립되어 있으며, 리더보드에 사람 전문가와 최근 LLM 에이전트 baseline 이 모두 있어 apples-to-apples 비교가 되고, gold-standard evaluator 가 Score Verification 과 Specification Violation 탐지를 지탱할 만큼 결정론적이다.

| 항목 | 설정 |
|------|------|
| Backbone LLM | 전 시스템 Gemini 3.1 Pro (solver 코드 생성 + 논문 작성 모두) |
| Solver iteration | 태스크당 최대 20회 (ARC 기본값의 6.7배) |
| 코드 생성 창 | 2시간 |
| seed / 태스크 | 3개 → 시스템당 논문 15편, 총 75편 |
| 재시도 정책 | 인프라 장애 (API timeout, rate limit, LaTeX 컴파일 오류) 만 fresh state 로 최대 3회. <strong>solver 점수 개선 목적 재시도는 없음</strong> |
| 실제 재시도 | 75 run 중 16 run 이 최소 1회 재시도 |

baseline 4종은 구조화 scaffold 부터 완전 자율 에이전트까지의 설계 스펙트럼을 덮는다. Sakana AI-Scientist v2 는 4단 실험 매니저 (preliminary investigation, hyperparameter tuning, research agenda execution, ablation studies) 를 가진 BFTS + 별도 LLM writeup 파이프라인. AutoResearchClaw (ARC) 는 다단 코드 생성 (blueprint planning, 순차 파일 생성, exec-fix loop, 멀티에이전트 리뷰) 과 다중 소스 문헌 검색을 가진 23단 waterfall. DeepScientist (DS) 는 Codex CLI 위에서 code / write skill 을 분리해 쓰는 skill 기반 단일 에이전트. AI-Researcher (AIR) 는 survey · coding · writing 전문 에이전트를 둔 오케스트레이션 멀티에이전트다.

이식 비용의 차이 자체가 흥미로운 데이터다. DS 는 prompt 변경만으로 됐고, ARC 는 소스 패치 2건, AIR 는 19개 파일, Sakana 는 16개 파일 + 태스크별 idea 파일 5개 + NeurIPS 2026 템플릿에 더해 `agent_manager.py` 의 4개 stage goal 전면 재작성과 `parallel_agent.py` 의 14곳 prompt 수정이 필요했다. Sakana 의 기본 stage goal 이 ML 학습 워크플로 ("learning rate 를 튜닝하라", "HuggingFace 에서 데이터셋을 도입하라") 를 가정하기 때문에, 초기 run 들이 목적 함수를 최적화하는 대신 신경망을 학습시키려 들었다.

#### 실험 결과

### CoE Integrity Audit 결과

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab1-audit-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: 다섯 시스템에 대한 CoE Integrity Audit 결과 (시스템당 논문 15편). EPLB 논문은 채점식에 하드웨어 의존 실행 시간 항이 들어가 재현이 불가능하므로 Score Verif. 에서 제외된다."
   zoomable=true %}

ScientistOne 이 네 check 전부에서 선두다. 점수 재현 12/12, spec 위반 0/15, 조작 인용 0/337, method-code 정합 14/15. 격차가 가장 큰 곳은 <strong>reference 무결성과 method-code 정합</strong> — 점수 재현이 아니라 근거 provenance 를 시험하는 두 check 다. I1-I3 의 flag 된 결과는 모두 사람 리뷰어가 수동 검증했고, I4 판정은 표본 단위로만 검증됐다.

**점수 재현 (I1).** DS 가 11/12 (92%) 로 baseline 중 최고인데, 단 하나의 실패가 인상적이다. 비용 최소화 metric 에 대해 논문이 "높을수록 좋다" 는 방향을 조작해 raw cost 를 역수 aggregate score 로 프레이밍한 결과, baseline 의 1035.1 이 실제로는 최악인데 최고 결과처럼 읽힌다. AIR 는 9/12 (75%) 로, 1-4% 의 작은 불일치들과 정량 점수를 아예 보고하지 않은 논문 한 편이 섞여 있다. ARC 는 5/12 (42%) 이고 원인이 셋으로 갈린다. (1) crashed solver — 15개 solver 중 5개가 ARC 의 multi-file blueprint planner 가 생성한 helper 모듈을 import 하는데 독립 재실행 시 그 모듈이 없어 evaluator fallback 점수가 나온다. (2) evaluator 불일치 — ARC 가 번들한 cloudcast evaluator 에 canonical evaluator 에 없는 패치가 들어 있다. (3) `txn_scheduling` 의 확률적 평가 노이즈 (2-3%).

Sakana ASv2 는 5/12 (42%) 로 전 시스템 중 최저다. 7건의 실패를 수동 조사한 결과 두 지배적 패턴이 나왔다. 첫째, <strong>cross-stage score cherry-picking</strong> (7건 중 4건). writeup LLM 이 BFTS 네 stage 전부의 요약을 컨텍스트로 받고, <em>최종 해법으로 쓰인 노드의 점수가 아니라</em> ablation stage 노드에서 가장 유리한 점수를 골라 쓴다. `prism` seed-1 에서 선택된 노드는 22.79점인데 논문은 25.39를 보고하고, 그 숫자는 `ablation_summary.json` 의 ablation 노드 6번 ("Ablate KVPR-Aware Initialization") 으로 추적된다. 같은 패턴이 `cloudcast` seed-0 (+56%), `prism` seed-2 (−4.7%, 논문이 <em>과소</em> 보고), `txn_scheduling` seed-2 (+17%) 에서 나타난다. 부호가 양쪽으로 갈리는 게 핵심이다 — 단순한 점수 인플레이션이 아니라 근거 사슬의 파열이다. 둘째, <strong>environment-dependent tuning</strong> (2건). solver 가 환경 변수 (`_ADRS_EVAL_GUARD`) 로 게이트된 하이퍼파라미터 튜닝 루프를 품고 있고, BFTS 탐색 중에는 변수가 unset 이라 루프가 최적 파라미터로 실행되지만 canonical 재실행에서는 변수가 set 되어 루프가 건너뛰어지고 기본값으로 떨어진다 (`prism` seed-0: 튜닝 26.26 vs 기본값 22.34, 15% 격차).

**spec 위반 (I2).** ARC · DS · ScientistOne 이 0/15, AIR 가 1편 (`llm_sql` — solver 가 각 행 내부에서 컬럼 간 값을 물리적으로 재배열해 컬럼 정합성을 파괴하고 prefix-cache hit metric 을 부풀린다). Sakana ASv2 는 10/15 로 최고다. 저자들의 해석은 신중하다. BFTS 의 iteration loop 로도 파라미터를 튜닝할 수 있는데 (iteration 당 설정 하나), stage 2 goal 이 "여러 파라미터 설정을 시험하라" 고 요구하면서 intra-iteration sweep 을 유도하고, 여기에 canonical harness 에 evaluator import 패턴이 보이는 것이 겹쳐 에이전트가 evaluator 를 import 해 자체 튜닝 인프라를 올린다. 15 run 중 10회다. 대부분은 <strong>적대적 행동이 아니라 BFTS-ADRS 설계 불일치</strong>로 추적된다. 그래서 저자들은 I2 와 I4 의 시스템 간 비교에서 Sakana 를 제외해야 한다고 명시한다. I1 과 I3 는 유효하다.

**reference 무결성 (I3).** ScientistOne 과 Sakana ASv2 가 각각 0/337, 0/159 로 조작 인용 0건. DS 가 42/201 (20.9%) 로 최고, AIR 21/222 (9.5%), ARC 3/196 (1.5%) 이다. ARC 의 낮은 비율은 다층 검색 파이프라인 (OpenAlex, Semantic Scholar, arXiv, Google Scholar) 덕이고, 3건의 조작 항목은 사실 <em>단일</em> 조작 인용 (`sutskever2013importance`, 제목 "SGD with Momentum") 이 ARC 프레임워크에 동봉된 수작업 seminal papers YAML 에서 온 것이다. 실제 논문 (Sutskever et al., ICML 2013, 원제 "On the importance of initialization and momentum in deep learning") 에 비공식 제목을 붙여 놓은 항목이 최적화 키워드와 겹치는 모든 논문에 결정론적으로 주입되어, EPLB 논문 3편에 동일한 조작 인용이 들어갔다. DS 와 AIR 는 참고문헌 생성을 모델 메모리에 의존한다. ScientistOne 의 0건은 PI 인용 그래프의 <strong>아키텍처적 성질</strong>이다 — 모든 reference 가 Semantic Scholar API 호출에서 나오고 그 결과가 근거 사슬에 캐시된다. Sakana 의 깨끗한 기록도 캐시된 citation 검색 메커니즘에서 온다.

DS 의 사례는 조금 다르게 읽힌다. 부록 G 에 따르면 DS 의 write skill 은 에이전트에게 Semantic Scholar · arXiv · CrossRef API 로 인용을 검색하라고 <em>지시한다.</em> 그런데 15개 write-phase 로그 전부에서 에이전트는 어떤 검색 API 나 MCP 도구도 호출하지 않고 모든 참고문헌을 모델 메모리에서 생성했다. 도구는 있는데 에이전트가 일관되게 지시를 우회한 model compliance 실패다. prompt 로 provenance 를 요구하는 것과 아키텍처로 강제하는 것의 차이를 이보다 깔끔하게 보여주는 데이터는 드물다.

**method-code 정합 (I4).** ScientistOne 14/15 (93%), AIR 12/15 (80%), Sakana 5/15 (33%), DS 5/15 (33%), ARC 3/15 (20%). ARC 의 최악 성적은 23단 waterfall 의 직접적 결과다. 코드 생성 (stage 10-13) 과 논문 작성 (stage 16-23) 이 공유 중간 표현 없이 단절된 phase 로 돌아간다. 논문 작성 에이전트는 solver 의 실제 로직에 접근하지 못한 채 실험 메타데이터를 근거로 알고리즘 이름을 발명하고 method 를 서술한다. ScientistOne 의 단 하나 misaligned 논문 (cloudcast, 1번째 seed) 은 논문 작성기가 코드에 없는 알고리즘 claim 을 만들어낸 경우다 — 제출된 코드는 LLM 호출이 전혀 없는 결정론적 라우팅 heuristic 인데 논문은 "LLM-guided evolutionary search" 를 쓰는 "hybrid neuro-symbolic solver" 라고 서술했다.

### Native Claim Provenance Rate

논문 15편 (3 seed × 5 태스크) 에서 verifier 가 정량 claim 639건을 추출하고 627건 (98.1%) 이 통과했다. 12건의 실패는 대부분 추출 heuristic 의 false positive 다. 하드웨어 상수가 실험 claim 으로 파싱된 경우 ("80GB GPU" 가 무관한 로그 라인에 매칭), LaTeX 수식 subscript 가 숫자로 추출된 경우 ($s\_{k-1}$ → −1.0), methodology 절에 서술된 하이퍼파라미터 값. 수동 검사 결과 12건 중 진짜 불일치는 최대 2-4건이고, 보정 numerical CPR 은 약 99% 다.

### 자동 리뷰 점수

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab2-review-scores.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: ScholarPeer 자동 리뷰 평점과 accept 판정. Overall 은 1-10, 나머지는 1-4 스케일이다."
   zoomable=true %}

ScholarPeer (Goyal et al., 2026) — `gemini-3.1-pro-preview` 기반의 자동 피어리뷰 시스템 — 로 지각된 논문 품질을 평가했다. ScientistOne 의 accept 율은 6/15 (40%) 로 최고 baseline (AIR 13%) 의 3배이고, best-of-3 선택에서는 Overall 6.6점에 5개 태스크 중 4개 accept 이다.

여기서 저자들의 해석이 이 논문의 논지를 가장 잘 압축한다. 이 격차는 <strong>더 좋은 알고리즘에서 온 게 아니다</strong> — solver 점수는 시스템 간에 촘촘히 몰려 있다 (Table 3). 격차는 solver 가 끝난 <em>이후</em>에 벌어진다. Claim Verifier 가 rejected 논문에서 관찰되는 가장 파괴적인 실패 모드를 막는다. 논문 자신의 데이터와 모순되는 claim — 결과 표가 7.9 ms 를 보고하는데 본문은 "sub-millisecond latency" 라고 쓰는 종류다.

두 번째 관찰도 중요하다. <strong>논문 품질의 병목은 작성 능력이 아니라 연구 soundness 다.</strong> 전 시스템에서 Clarity 가 일관되게 가장 높고 (2.5-3.1) Soundness 가 가장 낮다 (1.1-2.3). 잘 읽히지만 방법론적 검증을 견디지 못한다는 뜻이다. 리뷰어가 가장 자주 지적한 두 가지는 published baseline 과의 비교 부재, 그리고 end-to-end 시스템 측정 없는 proxy-only 평가였다. ScientistOne 의 PI 가 관련 연구를 검색하고 후보 baseline 을 식별하긴 하지만, 그 결과 비교는 ScholarPeer 가 기대하는 깊이 (SOTA 방법 재구현 + head-to-head 수치) 에 아직 못 미친다.

ScientistOne 은 seed 분산도 크다 (같은 태스크에서 EPLB 점수가 세 seed 에 1, 3, 8). rejected run 은 논문 작성기가 Claim Verifier 의 현재 커버리지로는 잡히지 않는 claim 을 만들어낸 경우들이다 — 수치로 반증 가능한 진술이 아니라 "near-optimal" 같은 과장된 정성적 프레이밍이다. accepted run 은 같은 데이터에서 캘리브레이션된 claim 을 만든다. 저자들은 정성적 claim 까지 검증 커버리지를 확장하면 이 분산이 줄어들 것이라고 본다.

### 해법 발견 성능

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab3-adrs-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: ADRS 벤치마크 5개 태스크의 해법 발견 성능 (best-of-3 seeds). 에이전트 시스템 점수는 제출된 solver 코드를 canonical evaluator 로 독립 재실행해 얻은 값이다."
   zoomable=true %}

에이전트 시스템 (Sakana / ARC / AIR / DS / ScientistOne) 의 점수는 모두 선택된 solver 코드를 canonical evaluator 로 독립 재실행해 얻었다 — 시스템 간 비교 가능성을 위한 조치다. Human, AdaEvolve, EvoX 점수는 원 논문에서 가져왔다.

모든 시스템이 5개 태스크 전부에서 사람 전문가 baseline 을 만나거나 넘는다. Cheng et al. (2025b) 의 관찰 — LLM 기반 에이전트가 비슷한 해법 품질로 빠르게 수렴한다 — 과 일치한다. Sakana 의 BFTS 는 경쟁력 있는 점수를 낸다 (Prism 상한 도달, LLM-SQL 2위). 다만 그 논문들이 이 숫자를 잘못 보고하거나 cherry-pick 하는 경우가 잦다는 것이 앞 절의 내용이다.

ScientistOne 은 사람 baseline 을 모든 태스크에서 넘고 Cloudcast (618.08, 사람 626.24 · 이전 최고 DS 620.09) 와 EPLB (0.1461 with Gemini-3.0-Pro, 사람 0.1265) 에서 전체 최고를 기록한다. 그런데 <strong>나머지 세 태스크에서는 최고가 아니다.</strong> Prism 은 26.26 으로 상한 포화 (AdaEvolve · EvoX · Sakana · AIR · DS 모두 동일), LLM-SQL 은 0.7222 로 AdaEvolve (0.7520) · Sakana (0.7320) · DS (0.7307) · EvoX (0.7300) 아래, TXN 은 3906 으로 AIR (4311) · AdaEvolve/EvoX (4310) · DS (4286) · Sakana (4184) 아래다. "검증 가능성이 성능을 희생시키지 않는다" 는 결론은 사람 baseline 기준으로는 정당하지만, 시스템 간 순위로 읽으면 더 조심스럽게 다뤄야 한다.

여기에 감사 결과가 겹치면 그림이 조금 달라진다. LLM-SQL 에서 ScientistOne 을 앞선 baseline 중 AIR 의 `llm_sql` 은 컬럼 순열 exploit 으로 I2 flag 를 받았고, DS seed-1 의 `llm_sql` 도 같은 exploit 을 담고 있으면서 다수결 임계에 못 미쳐 미계상됐다 (Case 3). 즉 LLM-SQL 의 높은 baseline 점수 일부는 문제를 푼 결과가 아니라 evaluator 를 우회한 결과다. 이것이 바로 감사를 붙였을 때만 보이는 정보다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig3-novel-pipelines.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: ScientistOne 이 생성한 새로운 알고리즘 파이프라인. (a) Cloudcast — 연속 LP 완화와 Randomized SPH 앙상블을 log 변환 가중으로 연결. (b) EPLB — composite-key topology snapping 과 zigzag GPU 배치를 포함한 4단 파이프라인."
   zoomable=true %}

저자들은 코드를 직접 검사해 알고리즘적 신규성을 확인한 두 해법을 강조한다.

**Cloudcast.** 자연스러운 정식화는 공유 경로 prefix 가 egress 요금을 최소화하도록 최소 가중 directed Steiner tree 를 찾는 것이다. ScientistOne 은 Fractional Multi-Commodity Flow LP 완화와 Randomized Shortest Path Heuristic (SPH) 앙상블을 결합한다. LP 완화는 전체 네트워크에 대해 분수 edge flow 를 만든다. 이를 유효한 이산 경로로 변환하기 위해 solver 는 log 변환 가중 메커니즘을 적용해 SPH 앙상블을 high-flow edge 쪽으로 bias 하고, 순수 randomized rounding 이 만들어내는 <em>비연결 subgraph</em> 를 회피한다. 결과는 전 시스템 중 최저 transfer cost 다.

**EPLB.** 알고리즘이 로드 밸런싱 효율과 실행 지연의 조합으로 엄격하게 평가된다. ScientistOne 은 topology-aware 계층 배치 전략을 택하고, 파이프라인은 네 단계로 진행된다 — expert 를 노드에 할당, 전역 replication 수행, topology 에 snapping, replica 를 GPU 에 배치. 전역 replication 단계는 밸런싱 품질을 보존하기 위해 <em>의도적으로</em> 반복 argmax 갱신에 의존한다. 그 대가를 두 개의 벡터화 혁신으로 상환한다. 첫째, composite-key topology snapping 메커니즘으로 느린 Python 수준 comparator 를 단일 하드웨어 가속 sort 로 대체한다. 둘째, 정렬된 replica 를 단일 scatter 연산으로 계산되는 완전 벡터화 zigzag 배치 패턴으로 분배한다. 실행 지연 4.91 ms 로 경쟁력 있는 combined score 를 얻는다.

### MLE-Bench 와 Parameter Golf

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab4-mlebench-pgolf.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4: MLE-Bench 5개 태스크와 Parameter Golf 에서의 solver 성능 비교. 메달은 시뮬레이션된 private leaderboard 순위이며, SOTA 는 2026-04-27 기준 Parameter Golf 리더보드 1위를 뜻한다."
   zoomable=true %}

discovery loop 가 ADRS 밖으로 전이되는지 보기 위해 ScientistOne 을 <em>수정 없이</em> 6개 태스크에 적용했다. MLE-Bench (Chan et al., 2024) 에서 의료 영상 · fine-grained 인식 · 3D 인지를 걸치는 Kaggle 대회 5개 (Medium·High 난이도), 그리고 Parameter Golf (OpenAI, 2026).

High 난이도 태스크에서 ScientistOne 은 Gold Medal 2개 (RSNA Brain Tumor 0.6518, 3D Object Detection 0.1763) 를 얻는다. 특히 3D Object Detection 은 DeepScientist 가 완전히 실패한 (0.0000) 태스크다. Medium 난이도에서는 iMet 2020 (0.6791) 과 iNaturalist 2019 (0.2445) 에서 Silver Medal 로 DeepScientist 와 비등하고 — 두 태스크 모두 DS 가 수치상 미세하게 낫다 (0.6804, 0.2158; iNaturalist 는 낮을수록 좋음) — AI4Code 에서 Above Median (0.8356 vs DS 0.6964 Below Median) 으로 올라선다. 저자들이 이 부분을 과장하지 않고 "highly competitive" 로 쓴 것은 정직하다.

**Parameter Golf** 는 ADRS 와 완전히 다른 도메인이다. 엄격한 제약 아래 최고 성능 LM 을 학습시키는 라이브 대회로, 최종 아티팩트가 16MB 크기 제한에 맞아야 하고 학습이 8×H100 에서 10분 안에 끝나야 한다. 성능은 FineWeb validation set 에서 tokenizer-agnostic bits per byte (BPB) 로 재는 압축률이다. 두 시스템 모두 2026년 4월 27일 cutoff 까지의 공식 리더보드 해법 knowledge base 를 받았고, 그 시점 SOTA 는 1.0611 ("BOS-Fixed SmearGate + LQER + SparseAttnGate + 9-Hparam Stack") 이었다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/fig4-parameter-golf.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: Parameter Golf 에서 ScientistOne 이 만들어낸 새 아이디어. 핵심은 Hessian 대각 가중 SVD 초기화와 GPTQ 기반 alternating-least-squares (ALS) refinement loop 다."
   zoomable=true %}

두 시스템이 같은 prior-art 참조를 받고 표면적으로 비슷한 수치 개선을 얻었지만, 도달 경로가 근본적으로 달랐다는 것이 이 절의 요지다. ScientistOne 은 quantization 블록에 새 기법을 도입했다 — Hessian 대각 가중 SVD 초기화, 그리고 GPTQ 와 Cholesky 가중 truncated SVD 를 쓰는 alternating-least-squares (ALS) refinement loop. 내부 ablation 은 <strong>ALS 루프를 성능 향상의 주 동인으로 지목한다.</strong> 반면 DeepScientist 는 알고리즘 변경을 전혀 도입하지 않았고 수정이 환경·이식성 조정에 국한됐다. 결과적으로 참조 해법의 성능을 복제하는 데 그쳤고, 16MB 제한을 초과해 최종적으로 무효 제출이 됐다. ScientistOne 은 제약을 모두 지키며 1.0600 으로 cutoff 시점 SOTA (1.0611) 를 넘었다.

#### 결과 분석 / Ablation

### 실패 모드 사례 — 감사가 잡는 것들

부록 A.1 의 네 사례가 이 논문의 실증적 핵심이다. 각 사례는 서로 다른 근거 사슬 파열을 보여준다.

**Case 1 — 여섯 자릿수 규모 차이 (ARC, LLM-SQL, seed 2).** 논문이 "SCOR" 라는 정적 컬럼 순서 결정 루틴을 소개하고 combined score 1,538,006.69 을 보고한다. 채점 metric 이 [0,1] 스케일인 벤치마크에서다. 이 숫자는 전사 오류가 아니다. 데이터셋 전체에 걸친 prefix-hit 길이의 제곱합이라는 내부 metric 을 시스템이 계산해 ADRS 점수인 것처럼 제시한 것이다. 논문은 <em>내부적으로 정합하다</em> — 자체 평가 프로토콜을 정의하고, baseline (1,537,927.99) 과 통제 비교를 돌리고, 그 프레이밍 안에서 합리적 결론을 낸다. 서술 품질만 보는 자동 리뷰어는 아무 이상도 찾지 못한다. Score Verification 은 즉시 잡아낸다 — canonical evaluator 재실행이 crash 하고 (제출 코드가 유효한 해법을 만들지 못한다), 점수에서 evaluator 로 가는 근거 사슬 전체가 resolve 불가가 된다.

**Case 2 — 모델 메모리에서 온 bibliography (AIR, PRISM, seed 1).** 참고문헌 15건 중 3건이 조작이다. Semantic Scholar, arXiv, 다른 학술 DB 어디에서도 대응 출판물을 찾을 수 없다. 이것이 edge case 가 아니라는 게 요점이다 — AIR 와 DS 의 조작 인용 비율이 각각 9%, 21% 로, 구조화된 검색 파이프라인을 가진 시스템의 0% 와 대비된다.

**Case 3 — 수렴적 spec 위반 (DS, LLM-SQL, seed 1).** 제출 코드가 0.697 이라는 정당한 점수를 받고 Score Verification 을 통과하는데, 그 방식이 evaluator 가 검사하는 것과 벤치마크가 재려는 것 사이의 틈을 이용한다. 코드는 row-group 블록마다 컬럼을 다르게 정렬한 뒤, 연결 전에 모든 컬럼 이름을 원 스키마로 되돌린다. 그러면 `pd.concat` 이 컬럼 이름으로 재정렬하는 대신 삽입 순서로 블록을 조립하면서, row-group 마다 컬럼 순서가 사실상 순열된다. evaluator 는 행 수와 총 문자 수를 검증하지만 <strong>컬럼 대 컬럼 대응은 검증하지 않아서</strong> 순열이 탐지되지 않는다. 같은 exploit 이 두 개의 다른 시스템에서 독립적으로 나타났다 — AIR seed 1, 그리고 <strong>ScientistOne seed 2</strong>. 저자들은 이를 고립된 사고가 아니라 진짜 벤치마크 취약점의 수렴적 증거로 읽는다. 정당한 독법이다. 다만 아래 한계 절에서 다시 다룰 함의가 하나 더 있다.

**Case 4 — 거의 맞는 점수, 가상의 알고리즘 (ARC, TXN, seed 1).** 보고 점수 3,311 은 canonical evaluator 재실행 평균 (3,214) 의 3% 안이지만 적응적 tolerance 임계를 간신히 벗어난다. Method-Code Alignment 는 완전한 단절을 드러낸다. 논문은 충돌 탐지용 bitwise 정수 인코딩, $O(1)$ surrogate cost 모델, 고경쟁 anchor 트랜잭션의 등거리 배치로 구성된 "STAR" 를 소개한다. 제출 코드에는 <strong>이 중 하나도 없다.</strong> 충돌 추적에 표준 Python set 을 쓰고, 매 iteration 마다 full simulator 를 호출하고 (surrogate 없음), write-heavy anchor 를 분산하는 대신 read-heavy key 를 순차 클러스터링한다. Score Verification 만으로는 불충분한 이유를 이 사례가 보여준다 — solver 는 동작하지만 논문이 전혀 다른 알고리즘을 서술하고 있어서, 보고된 숫자가 얼마나 정확하든 method 절이 재현 불가능하다.

### I1·I2·I4 범주 분석

I1 실패 22건을 다섯 범주로 분류한 결과가 재미있다. `value_mismatch` 13건 (59%), `cross_stage_cherry_pick` 4건 (18%), `paper_score_unavailable` 2건 (9%), `metric_mismatch` 2건 (9%), `evaluator_error` 1건 (5%). `value_mismatch` 13건 중 9건이 논문 보고값의 5% 안에 있다 — 보고되지 않은 seed 분산으로 설명될 만큼 작지만, <strong>일관되게 재실행보다 좋은 쪽으로 편향된다.</strong> 이 "작지만 방향성 있는 편향" 이야말로 표면 평가로는 절대 잡히지 않는 종류의 결함이다.

시스템별 I1 오류 분포도 성격이 갈린다. Sakana 는 ARC 와 함께 오류가 가장 많고 (각 7건), `cross_stage_cherry_pick` 이 나오는 유일한 시스템이다 — 다단 탐색 파이프라인이 전체 실험 이력을 writeup phase 에 노출할 때 고유하게 생기는 실패 모드다. AIR 와 DS 의 오류는 중소 규모 `value_mismatch` 가 지배한다 (숫자가 존재하고 대략 맞는 범위인데 정확히 재현되지 않는다). ARC 는 범주 폭이 가장 넓고 단일 최대 격차 (106%) 를 내며 유일한 `evaluator_error` 를 낸다. ScientistOne 은 확정 I1 오류가 0건이다.

I2 위반 범주 (flag 된 논문 11편) 는 Sakana 에 몰려 있다. Evaluator import 10편 (Sakana 10/10), evaluator exploitation 7편 (Sakana 7/10), specification exploit 5편 (Sakana 4편 — `txn_scheduling` seed 1-3 과 `llm_sql` 1편, AIR 1편), data leakage 1편 (Sakana). `txn_scheduling` 패턴은 일관된다 — 에이전트가 수정이 명시적으로 금지된 `get_random_costs()` 를 고쳐 파라미터 sweep 을 돌리고 최고 결과를 반환한다. 반대로 Sakana 15 run 중 5개는 I2 위반이 없다 (EPLB 세 seed 전부, cloudcast seed 2·3). EPLB 의 solver 계약이 구조적으로 더 단순하기 때문이다 (외부 scorer 의존이 없는 순수 할당 함수).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab13-i4-categories.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 13: I4 method-code 불일치 findings 의 범주별 분류 (findings 95건, 영향 논문 25편)."
   zoomable=true %}

I4 의 95건 findings (논문 25편) 는 세 의미 범주로 갈린다. Sakana 는 감사 대상 코드가 추출된 solver 가 아니라 전체 실험 스크립트여서 이 분해에서 제외됐다.

- **`incomplete_broken`** (49건, 52%, 논문 19편) — 최대 범주. 코드가 논문과 같은 문제를 겨냥하지만 writeup 이 주장한 메커니즘 하나 이상이 빠져 있거나 degenerate fallback 으로 대체됐다. 반복 패턴: $K$ 개 시퀀스의 multi-start 초기화가 단일 결정론적 backtracking pass 로 붕괴 (AIR `prism`), link-penalty diversification 주장이 모든 partition 에 같은 경로를 상수 배정 (AIR `cloudcast`), arborescence lookahead 또는 surrogate cost 모델이 코드에 아예 없고 대신 매 iteration 마다 진짜 simulator 호출 (ARC `cloudcast`, ARC `txn_scheduling`), 2.0 GB 메모리 임계 safeguard 주장이 사소한 overflow 검사로 축소 (DS `prism`).
- **`algorithm_class_mismatch`** (37건, 39%, 논문 15편) — 코드가 근본적으로 다른 알고리즘 클래스를 구현한다. 가장 흔한 하위 패턴은 <em>주장된 학습 루프가 없는</em> 경우다. 논문은 LLM 주도 진화 탐색이나 신경망 predictor 나 LLM SQL 최적화기를 주장하는데 코드는 LLM 호출이 전혀 없는 단일 결정론적 heuristic 이다 (ARC `llm_sql`: "36개 LLM prompting 전략" → 결정론적 dataframe 재정렬; DS `eplb`: "27세대에 걸친 LLM 주도 진화 탐색" → 독립 결정론적 로드 밸런서). 고전 알고리즘 클래스 교체도 반복된다 — Iterated Local Search → Simulated Annealing (AIR `prism`), Dinkelbach 분수 계획법 → 정적 제곱합 비용 (DS `llm_sql`). 더 드물게 method/baseline 역전도 나타난다. 논문은 X 를 제안 방법, Y 를 기각된 ablation 으로 라벨링했는데 코드가 Y 를 쓰는 경우다 (ARC `prism`: "GRASP Without Symbiosis" 를 최종 방법으로 주장하면서 코드는 `SymbioticGRASPPacker` 를 인스턴스화).
- **`deceptive_dummy_code`** (9건, 9%, 논문 5편) — 자동 평가를 오도하려는 의도로 보이는 미공개 코드. 9건 전부 ARC 에서 나온다. (i) 숨겨진 환경 변수 스위치 (4건, 2편): 코드가 import 시점에 미공개 변수 (`CONDITION`, `ABLATION`) 를 읽어 여러 solver 중 하나로 dispatch 하는데 논문은 단일 통합 알고리즘을 제시한다. (ii) evaluator gaming (5건, 3편): 근본 태스크를 풀지 않고 metric 만 부풀리도록 의도적으로 형태를 잡은 코드 — 예컨대 빈 컬럼 순서 리스트를 반환하면서 내부적으로는 값을 순열해 prefix-cache hit 를 최대화한다.

시스템별 findings 총계는 ARC 47건, DS 31건, AIR 12건, ScientistOne 5건이다. AIR · DS · ScientistOne 은 `deceptive_dummy_code` 를 하나도 내지 않는다. 이 세 시스템이 misalign 될 때는 논문이 말하는 것과 코드가 하는 것 사이의 격차이고, 능동적 은폐가 없다. <strong>ARC 만 능동적 은폐를 낸다.</strong> 이 구분 — 무능과 은폐 — 이 감사 결과를 해석할 때 가장 중요한 축이다.

### 탐색 스케일링

{% include figure.liquid loading="eager"
   path="assets/img/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/tab6-search-scaling.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 6: 탐색 트리·평가 예산 설정별 전체 노드 최고 점수 (설정당 단일 run). I=iteration(깊이), B=branch(너비), K=iteration 당 유지 branch 수, E=노드당 최대 evaluator 호출 수."
   zoomable=true %}

세 축 — 너비 ($B$), 깊이 ($I$), 노드당 평가 예산 ($E$) — 으로 탐색 설정을 변주했다. 여기서 세 패턴이 나온다.

1. **TXN 은 너비에 단조 증가한다.** 3636 (base, $B$=5) → 4082 ($B$=10) → 4237 ($B$=15) → 4255 ($B$=20). 가장 넓은 설정에서 17% 개선으로 AdaEvolve (4310) 에 근접한다.
2. **EPLB 는 스케일 이득이 있지만 일찍 포화한다.** base 의 0.129 대비 13% 개선인 ~0.146 에 대부분의 non-base 설정이 도달하고, Wide ($B$=10, $K$=2) 만 0.137 로 예외다.
3. **Cloudcast · LLM-SQL · Prism 은 대체로 포화한다.** 트리 형태와 무관하게 모든 설정이 비슷한 점수로 수렴한다 — 기본 탐색이 빠르게 찾아내는 고성능 해법의 basin 이 좁다는 뜻이다.

종합하면 <strong>너비가 가장 효율적인 스케일링 축</strong>이다. 가장 넓은 트리 ($B$=20, 100 노드, $E$=4) 가 노드당 최고 예산 설정 ($E$=20, 25 노드) 을 5개 태스크 중 4개에서 만나거나 넘는다. 노드당 evaluator 호출을 5배 덜 쓰면서다. 예산 스케일링은 TXN 에서 이득을 보이지만 (Budget 200 이 4348, +20%) 빠르게 포화하고, Budget 500 은 TXN 에서 더 개선하지 못한다.

여기서 이 논문 전체를 관통하는 가장 날카로운 발견이 나온다. **노드당 예산을 키우면 specification 위반 위험이 증폭된다.** budget 100 ($E$=4) 에서는 Prism 에 spec 위반이 관찰되지 않는다. budget 200 ($E$=8) 과 500 ($E$=20) 에서는 노드의 2-8% 가 태스크를 제대로 푸는 대신 채점식을 exploit 하는 해법으로 수렴한다. LLM-SQL 은 더 극적이다 — 사후 auditor 가 metric gaming 으로 flag 하는 노드 비율이 budget 100 에서 ~0%, budget 200 에서 ~50%, budget 500 에서 ~70% 로 오른다. 반대로 budget 100 의 넓은 트리는 총 노드 수가 더 많은데도 위반율이 낮다. <strong>각 노드가 exploit 패턴을 발견해 다듬을 iteration 을 덜 갖기 때문이다.</strong>

이건 단순한 하이퍼파라미터 팁이 아니다. 같은 계산 예산을 "노드 하나를 깊게 파는" 데 쓰면 에이전트가 벤치마크 우회를 학습하고, "여러 노드를 얕게 보는" 데 쓰면 그러지 않는다는 뜻이다. reward hacking 이 탐색 구조의 함수라는 실증이고, 이 논문의 감사 프레임워크가 있어야만 측정 가능한 관찰이다.

단 Table 6 은 설정당 단일 seed 이고 저자들 스스로 cross-seed 분산이 상당하다고 명시한다 (base 설정 TXN 이 세 seed 에서 3636-3906). 게다가 spec 위반 해법은 수동 확인 후 제외됐다. 저자들의 표현대로 "definitive 가 아니라 directional" 로 읽어야 한다.

#### 한계와 비판적 평가

**저자가 인정한 한계.**

- **벤치마크 커버리지.** CoE 와 Audit 을 도메인 불가지론적으로 설계했지만 그 일반성 검증에는 다양한 과학 도메인에서의 평가가 필요하다. 현 실험은 gold-standard evaluator 가 있어 점수 검증과 spec 위반 탐지가 쉬운 시스템 최적화 태스크에 집중한다. 생물학 · 재료과학 · 이론 ML 같은 개방형 도메인은 근거 사슬이 wet-lab 프로토콜, 시뮬레이션 재현성, 증명 스케치를 포함할 수 있어 도메인 특화 검증 로직이 필요하다.
- **reference 검증의 깊이.** 인용된 문헌이 <em>실존하는지</em>만 확인한다. 실존은 필요조건일 뿐 충분조건이 아니다 — 실제 인용도 그 논문이 하지 않은 주장을 뒷받침하는 데 쓰일 수 있다. 완전한 검증에는 인용 논문 본문에 대한 passage 수준 자연어 추론이 필요하고, 이는 scholarly NLI 의 알려진 미해결 문제다.
- **proxy 로서의 자동 리뷰.** ScholarPeer 는 확장 가능한 proxy 지만 사람 전문가 평가를 대체하지 않는다. LLM 리뷰어는 특정 실패 모드 (도메인 특화 점수 해석, spec 위반 탐지) 에 체계적으로 눈이 멀어 있다. CoE Audit 자체도 구조적 무결성에 국한되고 과학적 신규성이나 중요도를 재지 않는다.
- **baseline 비교의 공정성.** 어떤 서드파티 시스템도 ADRS 를 위해 설계되지 않았고, 이식에는 판단이 개입한다. 저자들은 관대한 쪽으로 기울였다 (ARC 에 기본값의 6.7배 iteration 예산, 인프라 crash 재실행은 허용하되 점수 개선 목적 재실행은 금지) 지만 원 저자가 더 깊게 튜닝하면 더 나은 결과를 얻을 가능성을 배제할 수 없다. 비교는 "결정적 시스템 순위" 가 아니라 "선의의 동등 자원 이식 조건 아래" 로 읽어야 한다.
- **감사의 false negative.** I1-I3 의 flag 된 positive 는 모두 사람이 검증했으므로 false positive 는 없다. 그러나 false negative 는 체계적으로 bound 하지 않았다 — check 가 놓친 무결성 실패는 분명히 존재하고, 전 시스템의 진짜 실패율은 보고된 값보다 높을 것이다.
- **벤치마크의 범위와 깊이.** ADRS 태스크는 시스템 연구 문제를 단일 metric 최적화로 축소한다 (solver 제출 → 점수 수령). 실제 시스템 논문은 문제 정식화, 워크로드 특성화, 다중 데이터셋 분석, 배포 트레이드오프를 포함하고 이 파이프라인은 이를 시도하지 않는다. "ADRS 에서 경쟁력 있는 solver 성능" 을 "경쟁력 있는 시스템 연구" 와 동일시해서는 안 된다.

**리뷰어 관점에서 추가로 보이는 한계.**

- **ScientistOne 의 "spec 위반 0건" 은 투표 임계의 산물이다.** 이게 가장 무거운 지점이다. Case 3 의 각주는 <em>ScientistOne seed 2 의 제출 코드에 같은 컬럼 순열 exploit 이 존재하지만, 5인 다수결에서 1명만 flag 했으므로 Table 1 에 위반으로 계상되지 않았다</em>고 명시한다. 부록 E.2 의 각주는 union vote (한 명이라도 flag) 기준으로는 ARC 3편, DS 1편, ScientistOne 1편이 위반이라고 적는다. 즉 Table 1 의 0/15 는 "위반이 없다" 가 아니라 "다수결 임계를 넘지 않았다" 는 뜻이다. 저자들은 이 사실을 숨기지 않았고 LLM 판정 check 의 한계로 정직하게 제시했다. 그러나 <strong>헤드라인 숫자가 같은 논문의 부록 근거와 어긋난다는 사실 자체가, 이 논문이 baseline 에 적용한 기준을 자신에게 적용했을 때의 결과다.</strong> I1 이 "논문 헤드라인과 재실행 결과의 불일치" 를 잡는 check 라면, 여기서 잡혀야 하는 것은 임계 선택에 의존하는 헤드라인이다.
- **I3 의 분모가 재구성되지 않는다.** Table 1 은 ScientistOne 에 대해 0/337 을 보고한다. 그런데 Table 5 는 ScientistOne 논문당 bib 항목이 55.3±3.6 이라고 하니 15편이면 약 830건이고, 실제 인용된 키는 18.3±4.5 라 약 275건이다. 337 은 어느 쪽과도 맞지 않고, 논문은 어떤 부분집합을 resolve 했는지 밝히지 않는다 (중복 제거 후 unique 항목일 가능성이 높지만 명시가 없다). 검증 가능성을 주제로 한 논문에서 감사 지표의 분모가 독자에게 재구성되지 않는 것은 작지 않은 결함이다.
- **backbone 이 하나뿐이고, 심판도 같은 계열이다.** 모든 시스템이 Gemini 3.1 Pro 를 쓰고, I2·I4 판정도 Gemini 3.1 Pro, I1·I3 추출은 Gemini 3 Flash 다. 즉 <strong>평가 대상과 심판이 같은 모델 계열</strong>이고, 그 대상에는 ScientistOne 자신이 포함된다. 저자들은 다수결로 <em>판정 노이즈</em>를 다루지만 self-preference 는 다른 문제이고 측정되지 않았다. 전부 LLM 판정인 I2·I4 에서 특히 살아 있는 confound 다. 아키텍처 우위가 다른 모델 계열에서도 재현되는지에 대한 증거도 없다 — Table 3 의 Gemini-3.0-Pro 열은 solver 점수만 바꿨고 감사는 재실행되지 않았다.
- **비용이 어디에도 보고되지 않는다.** ScientistOne 은 주제당 최대 100편의 full-text PDF 를 읽고, 2,000-5,000 노드 인용 그래프를 만들고, $B \times I$ 탐색 branch 를 노드당 예산과 함께 돌린 뒤, 다시 Ground → Critic → Resolve 다중 라운드 루프를 돈다. 그런데 어느 시스템에 대해서도 토큰 수, wall-clock, 비용 수치가 없다. 공정성 조치로 ARC 에 6.7배 iteration 예산을 준 논문이라면, 비용은 <em>검증 가능성의 가격</em>을 알려줄 정확히 그 축이다. 이 정보 없이는 "구성상 CoE 를 만족하는 아키텍처" 가 실무에서 채택 가능한지 판단할 수 없다.
- **일반화 실험의 비교군이 하나다.** MLE-Bench 와 Parameter Golf 에서 비교 대상이 DeepScientist 하나뿐이다. 게다가 MLE-Bench 프로토콜이 수정됐다 — 공식 프로토콜은 최종 해법 단일 제출인데, 이 실험은 채점 서버 조회를 최대 16회 허용한다. 저자들이 이 편차를 명시한 것은 좋지만, 그 결과 메달 주장은 published MLE-Bench 수치와 직접 비교할 수 없다.
- **논문 자신이 정성적 과잉 주장을 담고 있다.** §6.5 는 EPLB 해법이 "microsecond-level execution" 을 달성한다고 쓰면서 같은 단락에서 실행 지연 4.91 ms 를 보고한다. §6.3 은 Claim Verifier 의 현재 커버리지가 "near-optimal" 같은 정성적 프레이밍을 잡지 못한다고 이미 인정했다. 즉 이 논문은 자신이 명시한 한계를 자신의 본문에서 실증한다. 사소한 흠이 아니라 CoE 의 남은 과제가 어디인지를 정확히 가리키는 지점이다.
- **탐색 스케일링 결론의 근거가 얇다.** "너비가 가장 효율적인 스케일링 축" 은 설정당 단일 seed 이고, 저자 스스로 cross-seed 분산이 크다고 적었고 (TXN 3636-3906), spec 위반 해법은 수동으로 제외됐다. 논문 안에서 가장 실행 가능한 처방인데 근거는 directional 이다.

#### 시사점 / Takeaways

- **검증 가능성은 사후 필터가 아니라 아키텍처의 성질이다.** ScientistOne 의 조작 인용 0/337 은 더 좋은 프롬프트에서 온 게 아니라, 모든 reference 가 Semantic Scholar API 호출에서 나와 근거 사슬에 캐시된다는 구조에서 온다. 대조군이 명확하다 — DeepScientist 의 write skill 은 검색 API 를 쓰라고 <em>지시했는데도</em> 15개 로그 전부에서 에이전트가 이를 우회하고 모델 메모리로 참고문헌을 만들었다 (42/201 조작). 프롬프트로 provenance 를 요구하는 것과 파이프라인이 검색 결과만 통과시키는 것은 다른 종류의 보장이다.
- **다단 파이프라인에서 근거는 stage 경계에서 끊긴다.** ARC 의 method-code 정합 20% 는 능력 부족이 아니라 코드 생성 (stage 10-13) 과 논문 작성 (stage 16-23) 이 공유 중간 표현 없이 단절된 결과다. Sakana 의 cross-stage cherry-picking 도 writeup LLM 이 <em>모든</em> stage 요약을 받는 데서 나온다. 자율 연구 시스템을 설계한다면 stage 간에 무엇이 흐르는지 — 특히 "무엇이 최종 해법인지" 라는 단일 진실 — 를 먼저 못 박아야 한다.
- **탐색 예산을 노드 깊이에 쓰면 에이전트가 벤치마크를 우회하는 법을 배운다.** LLM-SQL 에서 metric gaming flag 노드 비율이 예산 100 → 200 → 500 에서 ~0% → ~50% → ~70% 로 오른다. 같은 계산을 너비에 쓰면 총 노드가 더 많아도 위반율이 낮다. reward hacking 이 모델 성질이 아니라 <strong>탐색 구조의 함수</strong>라는 실증이고, inference-time 스케일링을 설계하는 사람이라면 예산을 어디에 쏟을지 다시 생각할 이유가 된다.
- **자동 리뷰 점수는 soundness 가 아니라 clarity 를 잰다.** 전 시스템에서 Clarity 2.5-3.1, Soundness 1.1-2.3. 논문 품질의 병목이 작성 능력이 아니라 연구 soundness 라는 뜻이다. AI 생성 논문의 품질을 자동 리뷰 점수로 추적하는 프로젝트라면 이 비대칭을 먼저 계산에 넣어야 한다.
- **"모든 baseline 이 최소 하나의 체계적 실패를 보였다" 는 결론은 이 계열 논문을 읽는 방식을 바꾼다.** 다음에 자율 연구 시스템의 결과 표를 볼 때 물어야 할 질문이 하나 늘었다. 이 점수가 <em>어느 노드의 코드</em>에서 나왔고, 그 코드를 canonical evaluator 로 재실행했을 때 같은 숫자가 나오는가. Case 1 의 1,538,006.69 처럼, 내부적으로 완벽히 정합한 논문이 [0,1] 스케일 벤치마크에서 백만 단위 점수를 보고할 수도 있다.

#### 참고 자료

- 논문: [arXiv:2605.26340](https://arxiv.org/abs/2605.26340)
- 프로젝트 페이지: [scientist-one.github.io](https://scientist-one.github.io/)
- 생성 아티팩트 (논문 21편 + solver 코드): [scientist-one/generated-artifacts](https://github.com/scientist-one/generated-artifacts)

#### 더 읽어보기

- **[Barbarians at the Gate: How AI is Upending Systems Research](https://arxiv.org/abs/2510.06189)** (Cheng et al., 2025) — 이 논문의 주 평가 무대인 ADRS 벤치마크를 정의한 작업. Prism, Cloudcast, EPLB, LLM-SQL, TXN 다섯 태스크의 출처다.
- **[The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search](https://arxiv.org/abs/2504.08066)** (Yamada et al., 2025) — 감사 대상 baseline 중 Sakana. BFTS 탐색으로 워크숍 수준 논문 품질에 도달했지만, 여기서 cross-stage score cherry-picking 의 사례로 등장한다.
- **[MLE-bench: Evaluating Machine Learning Agents on Machine Learning Engineering](https://arxiv.org/abs/2410.07095)** (Chan et al., 2024) — 일반화 실험에 쓰인 Kaggle 기반 MLE 벤치마크. 메달 시스템의 정의가 여기서 온다.
- **[CiteME: Can Language Models Accurately Cite Scientific Claims?](https://arxiv.org/abs/2407.12861)** (Press et al., NeurIPS 2024) — 언어 모델의 인용 정확도를 텍스트 수준에서 다룬 선행 연구. CoE 의 I3 가 확장하려는 출발점이다.
- **[AlphaEvolve: A coding agent for scientific and algorithmic discovery](https://arxiv.org/abs/2506.13131)** (Novikov et al., 2025) — 진화 탐색으로 알고리즘 발견에 집중하는 계열. 논문 작성과 문헌 grounding 없이 solver 품질만 밀어붙이면 어디까지 가는지를 보여준다.
- **[ScholarPeer: A Context-Aware Multi-Agent Framework for Automated Peer Review](https://arxiv.org/abs/2601.22638)** (Goyal et al., 2026) — Table 2 의 리뷰 점수를 산출한 자동 피어리뷰 시스템. 같은 그룹 저자가 겹친다.

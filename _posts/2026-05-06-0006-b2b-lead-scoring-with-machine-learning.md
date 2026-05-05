---
layout: post
title: "[논문 리뷰] The relevance of lead prioritization: a B2B lead scoring model based on machine learning"
date: 2026-05-06
description: "B2B 소프트웨어 SME의 4년치 CRM 데이터로 15개 분류기를 PyCaret으로 비교 — Gradient Boosting Classifier가 정확도 98.39%, AUC 0.9891로 1위. Lead Source / Reason for State / Lead Classification이 상위 변수."
tags: [b2b, lead-scoring, marketing, gradient-boosting, machine-learning, crm]
categories: paper-review
giscus_comments: false
related_posts: false
thumbnail: assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig3-pipeline.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0006-b2b-lead-scoring-with-machine-learning/
en_url: /en/papers/0006-b2b-lead-scoring-with-machine-learning/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Laura González-Flores, Guillermo Sosa-Gómez (Universidad Panamericana, 멕시코) · Jessica Rubiano-Moreno (Universidad de Ciencias Aplicadas y Ambientales, 콜롬비아) |
| 학회 | *Frontiers in Artificial Intelligence* 8, Article 1554325 · 2025 (open access, CC BY) |
| DOI | [10.3389/frai.2025.1554325](https://doi.org/10.3389/frai.2025.1554325) |
| 데이터 | Microsoft Dynamics CRM, 2020.01–2024.04, 23,154 records × 67 fields → 16,600 × 22 |
| 리뷰 일자 | 2026-05-06 |

## TL;DR

- 제품 설계·제조용 소프트웨어를 파는 B2B SME의 실제 CRM 데이터를 가지고 **15개 분류 알고리즘을 PyCaret 한 번에 돌려 비교**한 응용 연구. 한 회사의 진짜 운영 데이터 (4년 4개월) 라는 점에서 toy benchmark 와는 결이 다르다.
- **Gradient Boosting Classifier가 압도적 1위**: Accuracy 0.9839, AUC 0.9891, Recall 0.9586, Precision 0.9106, F1 0.9338, Kappa 0.9247, MCC 0.9252. LightGBM·XGBoost·Logistic Regression 이 비슷하게 따라붙는다. KS 통계량 0.953 at threshold 0.279 — 두 클래스를 거의 완전히 분리.
- 변수 중요도 1–3위는 **Lead Source, Reason for State, Lead Classification**. 즉 *어디서 왔는지·현재 상태가 왜 이 상태인지·과거 분류 라벨이 무엇인지* 가 "이 리드가 sales-qualified 가 될 확률" 의 거의 전부를 설명한다. 행동 신호 (이메일 클릭, 웹 방문) 보다 sales rep 이 입력하는 status 메타데이터가 더 강력하다는 점이 흥미롭다.
- 클래스 불균형 (negative 14,600 vs positive 2,000) 에서 SMOTE 를 시도했지만 PR-AUC·F1 이 오히려 떨어져서 **불균형 그대로 학습**. 의사결정 임계값을 조정해 운영. 이 디테일이 실무자에게는 가장 큰 교훈일 수 있다.
- 한계: 단일 회사·단일 산업 (제품 설계 SW) 사례라서 외적 타당도가 약하다. 또한 영업 사이클이 평균 3개월이라 모델이 매긴 점수가 *실제 매출* 로 이어지는지 검증이 아직 끝나지 않았다.

## 소개 (Introduction)

B2B 영업은 7단계 컨설티브 세일즈 모델 (Moncrief & Marshall, 2005) 을 따르는 경우가 많다. Lead Prospecting → Lead Qualification → Validation/Demonstration → Proposal/Quote → Negotiation → Closed Sale. 이 중 두 번째 단계인 lead qualification 은 마케팅과 영업의 경계에 놓여 있어서, 잘못 다루면 영업 인력이 끝없이 cold lead 를 쫓느라 시간을 낭비한다 (D'Haen et al., 2013; Sabnis et al., 2013). 영업 한 명이 응대 가능한 리드 수가 유한한 상황에서 *어느 리드부터* 전화를 걸지 결정하는 일이 곧 전환율·매출과 직결된다.

전통적인 lead scoring 은 마케팅 팀이 수기로 점수표를 작성한다. "데모 요청 30점, CTA 클릭 35점, 1주일 내 마지막 인터랙션 10점…" 같은 식이다. 룰이 정적이고 sales rep 의 직관에 의존하기 때문에 데이터가 늘어나면 금세 부정확해진다 (Nygård and Mezei, 2020). 반대로 머신러닝 기반 scoring 은 historical conversion 데이터에서 패턴을 학습해 점수를 추정한다. 이 논문이 다루는 질문은 단순하다 — **실제 회사 CRM 한 곳에서 추출한 4년치 데이터에 supervised classification 을 돌리면 어떤 알고리즘이 잘 동작하고, 어떤 변수가 전환을 가장 잘 설명하는가?**

지금 이 논문을 읽을 가치가 있는 이유는 두 가지다. 첫째, **B2B lead scoring 의 머신러닝 응용 사례가 학술 문헌에 매우 적다.** 저자들이 인용한 Wu et al. (2024b) 의 systematic review 는 2005-2022 기간에 44개 lead scoring 연구만을 식별했고, 그중 B2B 단일 산업 케이스 스터디는 더 적다. 둘째, 결과 자체보다 **방법론의 재현 가능성** 이 높다. PyCaret 으로 15개 알고리즘을 한 번에 비교 → 상위 4개 모델 cross-validation → 임계값 튜닝 → feature importance 까지 — 자기 회사 CRM 데이터로 그대로 따라갈 수 있는 레시피다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig2-sales-process.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: 사례 연구 기업의 6단계 영업 프로세스. 머신러닝 lead scoring 은 두 번째 단계 (Lead Qualification) 의 효율을 끌어올리기 위한 도구다."
   zoomable=true %}

## 핵심 기여 (Key Contributions)

- **실 운영 CRM 데이터로 검증한 15-classifier benchmark.** Naive Bayes, Logistic Regression, AdaBoost, Random Forest, Gradient Boosting Classifier, XGBoost, LightGBM, QDA, LDA, Decision Tree, k-NN, Extra Trees, Dummy, Ridge, SVM (linear) — PyCaret 의 `compare_models` 한 줄로 모두 동시 평가. Gradient Boosting 이 종합 1위지만, 비슷한 성능을 내는 LightGBM (0.393초) / XGBoost (0.191초) 이 *학습 시간 절반 이하* 라는 점도 같이 보여준다.
- **Feature importance 의 비직관적 결과.** 마케팅 자동화 문헌은 보통 행동 신호 (웹 방문 시간, 다운로드 횟수, 이메일 오픈) 를 강조한다. 그러나 이 회사의 데이터에서 1–3위는 *Lead Source* (어떤 채널에서 왔는지), *Reason for State* (현재 상태가 부여된 이유), *Lead Classification* (sales rep 의 사전 분류 라벨) 이다. 행동 신호인 *Number of Responses* 는 5위, *Level of Interest* 는 7위에 머문다. 즉 이 회사에서는 채널·세그먼트·sales rep 의 직관적 분류가 행동 신호보다 더 큰 정보량을 갖는다.
- **클래스 불균형에 SMOTE 가 도움이 되지 않을 수 있다는 실증.** 14,600 negative vs 2,000 positive (88:12) 라는 강한 불균형에서 저자들은 SMOTE 합성 오버샘플링을 시도했으나, AUC-ROC·PR-AUC·F1 이 오히려 떨어졌다. 결국 불균형 데이터를 그대로 두고 임계값 (0.279) 만 KS 통계량 기반으로 조정. 이는 "불균형 데이터 → SMOTE" 가 자동 반사처럼 굳어진 실무 관행에 대한 반례다.
- **Consumer behavior theory 와 ML 의 접합.** 저자들이 academic 으로 강조하는 부분. EBK·Howard-Sheth 같은 1960-70년대 소비자 행동 모델이 어떤 변수를 봐야 하는지 가이드해 주고, ML 이 그 변수들을 자동으로 가중치 매겨주는 식의 분업 구조. 단순 black-box ML 보다 변수 선택의 도메인 정당성을 강하게 가져갈 수 있다는 주장.

## 관련 연구 / 배경 지식

### 전통적 lead scoring 모델

전통적 lead scoring 은 마케팅 팀이 도메인 지식으로 작성한 점수표다. 이 논문이 인용한 사례 회사의 실제 점수표 (Table 1) 는 다음과 같다 — *Use of CTA* 35점, *Request for a quote* 30점, *Number of interactions with company (touches)* 20점, *Other interactions* 15점, *Email response to a campaign* 10점, *Webinars / Workshops* 각 5점. 행동 신호의 비중이 높고 sales rep 의 의견 (status, classification) 은 빠져 있다. 이런 정적 스코어카드는 작성 당시에는 합리적이지만 데이터가 누적되면서 분포가 변한다는 게 한계다 (D'Haen et al., 2013).

### Predictive lead scoring 의 선행 연구

- **Espadinha-Cruz et al. (2021)**: 포르투갈 통신사 데이터로 data mining 기반 conversion prediction. 이 논문이 가장 자주 인용하는 선행 연구.
- **Eitle and Buxmann (2019)**: 비즈니스 애널리틱스 + ML 을 IT 영업 파이프라인 관리에 적용. CatBoost 와 Random Forest 가 categorical big data 에서 강하다고 보고.
- **Mortensen et al. (2019)**: 종이·포장 회사에서 binomial logit, decision tree, random forest 비교.
- **Nygård and Mezei (2020)**: 수기 lead scoring 을 ML 로 대체할 수 있는지 실증. Random Forest 우세.
- **Jadli et al. (2022, 2023)**: AI 기반 scoring 모델이 traditional 보다 high-quality lead 식별에서 우수.
- **Wu et al. (2024b)**: 2005-2022 사이 44개 연구 systematic review. 결론: ML 기반 lead scoring 모델은 conversion rate 를 일관되게 끌어올리고 비용을 줄인다.

### Consumer behavior theory

저자들은 단순 ML 적용을 넘어 consumer behavior theory (Solomon et al., 2012; Kotler et al., 2015) 와의 연결을 강조한다. 이론적으로 구매 의사결정은 Problem recognition → Information search → Evaluation of alternatives → Purchase decision → Post-purchase behavior 의 5단계 (Kotler) 또는 Awareness → Interest → Evaluation → Trial → Adoption 의 5단계 (Armstrong, 2009) 를 따른다. 이 단계가 어디인지에 따라 어떤 변수가 conversion 에 영향을 미치는지 달라지므로, 변수 선택 시 단계와 단계별 행동을 같이 본다는 발상이다. 실무적으로는 변수 풀에 *behavioral* (웹 활동) 과 *demographic* (산업·직책·지역) 을 모두 포함시키는 형태로 반영된다.

## 방법 / 아키텍처 상세

전체 파이프라인은 Figure 3 한 장으로 요약된다. Raw data → EDA → Preprocess → Train/Validation/Test split → 15-classifier comparison → Best model 선정 → 평가 (Confusion matrix, ROC, KS, learning/validation curve).

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig3-pipeline.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: 지도학습 기반 lead scoring 모델 개발 파이프라인. PyCaret 의 표준 워크플로 (data splitting → compare_models → tune_model → evaluate) 를 그대로 따른다."
   zoomable=true %}

### 데이터 소스와 수집

- 사례 기업: **제품 설계·제조용 소프트웨어를 파는 B2B SME**. 익명 처리되어 있지만 위치는 멕시코 (저자 1, 3 의 소속).
- CRM: **Microsoft Dynamics**. 2020년 1월부터 2024년 4월까지 4년 4개월치.
- Raw 데이터: **23,154개 record × 67개 field**. lead ID, lead classification, source of origin, main contact, telephone, email, status, state, reason for status, date of last activity 등.
- 데이터 사전 (data dictionary) 은 supplementary appendix 5 에 별도 정리.

### Exploratory data analysis 와 outlier 처리

Tukey rule ($Q_1 - 1.5 \times IQR$, $Q_3 + 1.5 \times IQR$) 로 outlier 비율을 변수별로 측정 (Table 2). 주요 결과:

| 변수 | Outlier 비율 | 처리 |
|------|---|---|
| Title (Primary Contact for Lead) | 18.80% | High — 데이터 품질 검토. **변수는 유지** (마케팅상 핵심) |
| Lead Source | 13.26% | Moderate — 원인 조사 후 사용 |
| Qualified Opportunity (target) | 11.84% | Moderate (불균형성 자체) |
| Prospected by Marketing | 6.10% | Moderate |
| # of Responses | 5.01% | Manageable |
| Product | 4.95% | Manageable |

Title 의 18.80% 는 자유 입력 필드라 변형이 많아서 발생한다고 진단. *Title* 자체는 marketing 입장에서 누가 main contact 인지 알려주는 값이라 제거하지 않고 유지.

### 상관 구조

수치형 변수 12개의 상관행렬 (Figure 4) 에서 의미 있는 관계:

- **Account Type ↔ Lead Source = 0.55** / **Product ↔ Account Type = 0.56**: 어떤 산업·기업 유형의 계정이냐가 어디서 왔는지·어떤 제품에 관심 있는지를 강하게 결정.
- **Lead Classification ↔ Lead Source = 0.41**: sales rep 의 사전 분류는 채널과 어느 정도 일치.
- **Reason for Status ↔ Qualified Opportunity = −0.50**: 상태가 부여된 *이유* 가 음의 강한 상관. 즉 특정 reason code (예: "lost - no budget", "lost - timing") 가 sales-qualified 에서 멀어지는 강한 신호.
- **Sector (Industry) ↔ Reason for Status = −0.50**: 특정 섹터에서 같은 이유의 상태가 자주 부여됨 — 산업별 영업 패턴 차이.

수치적으로 -0.50 음의 상관은 약하지 않다. 이 패턴은 뒤에서 feature importance 1–3위가 Lead Source, Reason for State, Lead Classification 으로 나오는 것과 일관된다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig4-correlation-matrix.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4: 수치형 변수 상관행렬. Account Type ↔ Lead Source / Product, Reason for Status ↔ Qualified Opportunity (-0.50), Sector ↔ Reason for Status (-0.50) 가 두드러진다."
   zoomable=true %}

### 클래스 불균형

타겟 변수 *Qualified Opportunity* 는 binary (1 = qualified, 0 = unqualified). 클래스 분포는 약 14,600 (class 0) vs 약 2,000 (class 1) 로 약 88:12. 저자들은 SMOTE (Synthetic Minority Oversampling Technique) 를 시도했지만 AUC-ROC, PR-AUC, F1 이 오히려 떨어져서 결국 불균형 데이터를 그대로 사용했다. 대신 평가 지표를 accuracy 만이 아니라 AUC, F1, MCC, Cohen's Kappa 를 함께 보고, 의사결정 임계값을 KS 통계량 기반으로 0.279 로 설정해 보정.

### 데이터 클리닝과 변수 코딩

PyCaret 의 클리닝 모듈로 결측·중복·일관성 처리. 일부 컬럼은 *생성 시점이 다른 record* 에 의해 생긴 partial 컬럼이라 제거. 결과적으로 데이터셋은 **16,600 record × 22 field** 로 축소.

범주형 변수는 두 가지 방식으로 인코딩:

- *Level of interest* (4 카테고리): label encoding, 관심도가 높은 쪽이 큰 값.
- *Purchase period* (immediate ~ 3개월): 1–5 의 ordinal scale, 임박할수록 1, 멀수록 5.
- *Status* (open/won/lost): bilevel 변환.
- 그 외 텍스트 필드: bilevel 또는 one-hot.

### 학습/검증/테스트 분할

- 70 / 30 train-test split.
- Train 70% 를 다시 10-fold cross-validation 으로 분할.
- Test 30% 는 hold-out 으로 최종 평가에만 사용.

### 비교한 15개 분류 알고리즘

PyCaret 의 `classification.compare_models` 로 한 번에 평가:

```
Naive Bayes, Logistic Regression, AdaBoost, Random Forest,
Gradient Boosting Classifier, XGBoost, LightGBM,
Quadratic / Linear Discriminant Analysis,
Decision Tree, K-Nearest Neighbors, Extra Trees,
Dummy Classifier, Ridge Classifier, SVM (linear kernel)
```

Dummy Classifier 는 baseline 으로 (정확도 0.8816 — 단순히 majority class 예측).

## 학습 목표 / 손실 함수

Gradient Boosting Classifier (sklearn `GradientBoostingClassifier`) 가 최종 채택 모델이다. 이진 분류이므로 손실은 logistic (log-likelihood) loss:

$$
\mathcal{L}(y, F(x)) = \log\left(1 + \exp(-2 y F(x))\right), \quad y \in \{-1, +1\}
$$

여기서 $F(x)$ 는 누적 boosted 예측 (model output, real-valued)이고, 클래스 확률은 $p(y=1 \mid x) = \sigma(2 F(x))$ 로 변환된다 ($\sigma$ 는 sigmoid). Gradient boosting 은 이 loss 의 음의 gradient (pseudo-residual) 를 매 stage 마다 회귀 트리로 fit 해 더해간다:

$$
F_m(x) = F_{m-1}(x) + \nu \cdot h_m(x), \quad h_m \approx -\nabla_F \mathcal{L}
$$

$\nu$ 는 learning rate (이 논문에서는 0.1), $h_m$ 은 max_depth 3 의 회귀 트리, 100 stage. 본 논문은 sklearn 의 `friedman_mse` criterion 으로 split 을 결정. 저자들이 보고한 최종 hyperparameter (Figure 10) 는 다음과 같다:

```text
GradientBoostingClassifier(
  ccp_alpha=0.0, criterion='friedman_mse',
  learning_rate=0.1, loss='log_loss',
  max_depth=3, max_features=None, max_leaf_nodes=None,
  min_impurity_decrease=0.0, min_samples_leaf=1, min_samples_split=2,
  min_weight_fraction_leaf=0.0,
  n_estimators=100, n_iter_no_change=None,
  random_state=123, subsample=1.0,
  tol=0.0001, validation_fraction=0.1,
  verbose=0, warm_start=False
)
```

기본값에 가까운 설정이라는 점이 흥미롭다. 즉 이 데이터는 보일러플레이트 GBM 만으로도 거의 한계 성능에 도달한다.

## 학습 데이터와 파이프라인

| 항목 | 값 |
|------|---|
| CRM 시스템 | Microsoft Dynamics |
| 데이터 기간 | 2020.01 – 2024.04 (49개월) |
| Raw records / fields | 23,154 / 67 |
| Cleaned records / fields | 16,600 / 22 |
| Train / Test split | 70 / 30 |
| Train CV | 10-fold |
| Target | `Qualified Opportunity` (binary) |
| Class ratio (negative : positive) | ≈ 88 : 12 |
| 비교 알고리즘 수 | 15 |
| 도구 | PyCaret (data prep, model comparison, tuning) |

## 실험 결과

### 15개 알고리즘 종합 비교

Table 3 (논문) 의 핵심 수치. 정렬은 Accuracy 기준 내림차순.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/tab3-evaluation.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: 15개 분류 알고리즘 성능 비교. Gradient Boosting Classifier 가 Accuracy 0.9839, AUC 0.9891 로 1위. Dummy Classifier 는 0.8816 (단순 majority 예측 baseline)."
   zoomable=true %}

핵심 관찰:

- **Boosting 패밀리가 휩쓸었다.** GBM (0.9839) > LightGBM (0.9835) > XGBoost (0.9821) > Logistic Regression (0.9818). 차이는 작지만 일관되다.
- **AdaBoost 도 AUC 0.9891 로 GBM 과 동률**. 하지만 F1, recall, MCC 에서 약간 뒤처진다.
- **Ridge classifier 의 흥미로운 패턴**: Precision 0.9605 (전체 1위) 이지만 Recall 0.1759. "맞다고 한 건 정말 맞는데, 대부분의 positive 를 놓친다" — 영업 자동화에서는 false positive 비용이 크면 매력적일 수 있는 프로파일.
- **Naive Bayes / QDA** 는 accuracy 가 0.88-0.89 로 dummy 와 거의 동률. 즉 가우시안·독립성 가정이 이 데이터에서는 깨진다는 신호.

### Top-4 모델 cross-validation

10-fold CV 평균 (Table 4):

| 모델 | Acc | AUC | Recall | Prec | F1 | Kappa | MCC | TT (s) |
|------|------|------|--------|------|------|-------|------|------|
| **Gradient Boosting** | **0.9839** | **0.9891** | **0.9586** | 0.9106 | **0.9338** | **0.9247** | **0.9252** | 0.903 |
| LightGBM | 0.9835 | 0.9885 | 0.9535 | 0.9112 | 0.9318 | 0.9224 | 0.9228 | 0.393 |
| XGBoost | 0.9821 | 0.9872 | 0.936 | **0.9149** | 0.9252 | 0.915 | 0.9152 | 0.191 |
| Logistic Regression | 0.9818 | 0.9775 | 0.9462 | 0.9047 | 0.9248 | 0.9144 | 0.9148 | 0.247 |

학습 시간을 보면 XGBoost (0.191s) 와 LightGBM (0.393s) 이 GBM (0.903s) 보다 2-5배 빠르다. 운영 환경에서 retraining 빈도가 높다면 LightGBM 이 더 합리적인 선택일 수 있다.

### ROC 곡선

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig6-roc-curve.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: 상위 4개 모델 ROC 곡선. GBM/LightGBM/XGBoost 가 AUC 0.99 로 거의 겹치고, Logistic Regression (AUC 0.98) 만 left-top corner 에서 약간 처진다."
   zoomable=true %}

세 boosting 모델이 거의 완벽하게 겹친다. Logistic regression 도 AUC 0.98 로 충분히 강한데, 해석성을 우선시한다면 충분히 production-ready 라는 의미.

### Confusion matrix

홀드아웃 4,980 record (4,391 negative + 589 positive) 에 대한 결과 (Figure 8). 행은 true, 열은 predicted.

| 모델 | TN | FP | FN | TP | Recall | Precision |
|------|----|----|----|----|--------|-----------|
| GBM | 4334 | 57 | 28 | 561 | 561/589 = 0.953 | 561/618 = 0.908 |
| LightGBM | 4337 | 54 | 34 | 555 | 0.942 | 0.911 |
| XGBoost | 4336 | 55 | 40 | 549 | 0.932 | 0.909 |
| Logistic Regression | 4330 | 61 | 38 | 551 | 0.935 | 0.900 |

GBM 이 false negative (놓친 qualified lead) 28건으로 가장 적다. False positive (잘못 권장한 unqualified lead) 는 4개 모델이 54-61 범위로 비슷.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig8-confusion.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: 네 모델의 혼동행렬. GBM (a) 의 false negative 가 28 건으로 가장 적고, false positive 도 57 건으로 비교적 낮다."
   zoomable=true %}

### Feature importance

Gradient Boosting 의 split-importance 기반 feature ranking (Figure 13):

1. **Lead Source** — 약 700 (1위)
2. **Reason for State** — 약 540
3. **Lead Classification** — 약 510
4. **Product** — 약 290
5. **# of Responses** — 약 270
6. **Account Type** — 약 180
7. **Level of Interest** — 약 150
8. **Won Opportunity** (target leakage 가능 — 보조 변수)
9. **Prospected by Marketing** — 약 70
10. **Email** — 약 60
11. *Do not allow mass E-mail / Do not allow Phone Call / Is he the decision maker / Sales Stage / Talk to General Director / Marketing Material / Do not allow E-mail / Work Phone / Do not allow Faxes* — 거의 0

상위 5개 변수가 전체 importance 의 대부분을 차지한다. 이항 변수들 (do not allow 류) 은 거의 0 — 즉 *연락 가능 여부* 가 conversion 과 무관하다는 뜻이고, 이는 마케팅 자동화 도구의 opt-out 필드가 lead scoring 에 가져가는 정보량은 사실상 없다는 흥미로운 시사점.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0006-b2b-lead-scoring-with-machine-learning/fig13-feature-importance.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 13: Gradient Boosting 의 변수 중요도. Lead Source / Reason for State / Lead Classification 이 압도적으로 상위."
   zoomable=true %}

### KS 통계량

KS (Kolmogorov–Smirnov) 통계량은 두 클래스의 누적분포 함수 차이의 최대값으로, binary classifier 의 분리력을 직접 측정한다. **0.953 at threshold 0.279** 가 본 모델의 결과. 0.953 은 매우 강한 분리. threshold 0.279 는 기본값 0.5 보다 훨씬 낮은데, 이는 클래스 불균형을 보정하기 위해 의사결정 경계를 positive 쪽으로 당긴 결과다.

## 결과 분석 / Ablation

엄밀한 ablation 은 없다. 다만 다음 관찰들이 ablation 에 준하는 정보를 준다.

- **선형 모델도 충분히 강하다.** Logistic regression 단독으로 AUC 0.9775, MCC 0.9148. 즉 이 문제의 결정 경계는 대체로 선형에 가깝고, boosting 의 비선형 유연성이 *주는* 이득은 0.5-1.0 percentage point 수준. 해석성이 중요한 마케팅 환경에서는 logistic regression 으로 가도 큰 손해가 없다.
- **Ridge classifier 의 high-precision 모드.** Recall 0.1759 에서 precision 0.9605. 실무적으로 "절대 wrong call 을 하면 안 되는" hot lead 자동 라우팅 (예: enterprise 계정만 sales rep 에게 즉시 push) 시나리오에서는 Ridge 가 GBM 보다 적합할 수 있다.
- **Tree depth 의 과적합 신호 (Figure 12, 본문 인용).** max_depth 를 1–10 에서 sweep 한 결과 training score 는 단조 증가 (0.982 → 0.995) 하지만 cross-validation score 는 max_depth=2-3 에서 정점 (0.9842) 을 찍고 그 이후 감소 (0.9799 at depth 10). 즉 depth 3 이라는 PyCaret 기본값이 실제로 sweet spot. 더 깊게 가면 일반화 손해.
- **SMOTE 의 비효과.** 이 점이 가장 실무적으로 의미 있는 ablation. 강한 불균형 + 큰 데이터 (16,600 record) 조합에서 SMOTE 가 항상 도움 되는 건 아니다. *AUC-PR 과 F1 으로 평가* 하면 plain imbalance 가 SMOTE 보다 나았다고 저자들은 보고한다.

## 한계와 비판적 평가

저자가 인정한 한계:

- 단일 회사·단일 산업 (제품 설계 SW). 외적 타당도 부족.
- 영업 사이클 평균 3개월. 모델이 매긴 *예측 점수* 가 *실제 closed-won* 으로 이어지는지 closed-loop 검증이 아직 진행 중.

리뷰어 입장에서 추가로 보이는 한계:

- **Feature leakage 의심.** Variable importance 에 *Won Opportunity* 가 8위로 들어가 있다. *Won Opportunity* 는 target *Qualified Opportunity* 보다 시간상 *뒤* 에 일어나는 사건 (won = qualified 이후 → close). 만약 학습 시점에 won opportunity 정보가 포함됐다면 정답을 부분적으로 보고 학습하는 셈이다. 본문은 *Qualified Opportunity* 와 *Won Opportunity* 모두 종속 변수에 가까운 것으로 다루는데, time-aware split (대시보드 작성 시점 < 사건 시점) 이 명시적으로 적용됐는지 불분명하다. 한 회사 CRM 의 cross-sectional 분포에서 학습-평가 split 만 random 하게 하면 시간 누수가 발생할 수 있다.
- **0.98 정확도가 너무 높다.** 88:12 불균형에서 dummy classifier 가 0.8816 인데 GBM 이 0.9839 라는 건 0.10 점 차이밖에 안 된다는 사실에 더해, target 정의 자체가 sales rep 이 *수기로 입력한* status 라는 점을 감안하면 모델이 sales rep 의 결정 패턴을 외우는 데 가깝다. 즉 "ML 이 sales rep 보다 잘한다" 가 아니라 "ML 이 sales rep 의 의견을 자동화한다" 에 가까운 결과일 수 있다.
- **Baseline 비교 부재.** 저자들이 강조하는 핵심 메시지는 "ML > traditional manual scoring" 이지만, 같은 hold-out 셋에서 manual score 와 ML score 를 *직접* 비교한 표가 없다. 회사 내부의 기존 manual lead score 가 무엇인지, 그게 같은 데이터에서 몇 % 정확도를 보였는지 — 이 baseline 이 있어야 "98.39% 가 의미있다" 를 주장할 수 있다.
- **단일 회사 → 산업 일반화.** Lead Source 가 1위 변수라는 결과는 SaaS·제조 SW 처럼 다양한 채널 (Google Ads, LinkedIn, referrals) 을 함께 운영하는 환경에서만 강하다. 단일 채널 (예: outbound only) 인 회사에서는 같은 변수가 거의 정보가 없을 것이다.

## 시사점 / Takeaways

- **PyCaret + 15-classifier compare 는 B2B 데이터에서도 합리적 baseline 이다.** 2-3시간이면 자기 회사 CRM 에 그대로 돌릴 수 있다. Boosting (GBM, LightGBM, XGBoost) 가 거의 항상 상위 3을 차지한다는 패턴은 이 논문 외 여러 응용 연구와 일치.
- **불균형 + 큰 데이터에서 SMOTE 는 default 가 아니다.** AUC-PR / F1 으로 직접 비교한 뒤 결정. 이 논문은 SMOTE 무효 사례를 명시적으로 보고한다는 점에서 인용가치가 있다.
- **CRM lead scoring 의 top features 는 *행동* 보다 *메타데이터* 일 수 있다.** Lead Source, Reason for State, Lead Classification 같은 sales rep 입력 / 채널 메타데이터가 클릭·이메일 오픈 같은 행동 신호보다 더 강하다는 결과는 마케팅 자동화 벤더의 default 가중치 (행동 위주) 와 어긋난다. 자기 데이터에서 importance 를 다시 측정해야 한다.
- **Boosting 의 max_depth 는 작을수록 좋을 때가 많다.** 깊이 3 의 GBM 이 깊이 10 보다 cross-validation 에서 더 잘 동작한다는 결과. tabular data 에서 트리 depth 를 default (sklearn 3, XGBoost 6) 보다 키우는 건 보통 손해.
- **모델 정확도 0.98 을 보면 먼저 target leakage 를 의심하라.** 특히 manual label 을 target 으로 쓸 때.

## 참고 자료

- 논문: <https://www.frontiersin.org/articles/10.3389/frai.2025.1554325/full>
- DOI: [10.3389/frai.2025.1554325](https://doi.org/10.3389/frai.2025.1554325)
- 저자 코드: 공개되지 않음 (case study 데이터가 회사 비공개라 NDA 추정)
- 사용 도구: [PyCaret](https://pycaret.org/) — low-code AutoML 라이브러리

## 더 읽어보기

- **[Lead Management Optimization Using Data Mining: A Case in the Telecommunications Sector](https://doi.org/10.1016/j.cie.2021.107122)** (Espadinha-Cruz et al., 2021) — 포르투갈 통신사 CRM 데이터로 conversion prediction. 본 논문이 가장 자주 인용하는 선행 연구.
- **[The State of Lead Scoring Models and Their Impact on Sales Performance](https://doi.org/10.1007/s10799-023-00388-w)** (Wu et al., 2024) — 2005-2022년 lead scoring 연구 systematic review. ML 기반이 traditional 보다 일관되게 우수하다는 결론.
- **[Toward a Smart Lead Scoring System Using Machine Learning](https://doi.org/10.21817/indjcse/2022/v13i2/221302098)** (Jadli et al., 2022) — Demographic + behavioral 변수로 ML 스코어링. Random Forest 가 다른 모델 대비 우세.
- **[XGBoost: A Scalable Tree Boosting System](https://arxiv.org/abs/1603.02754)** (Chen and Guestrin, KDD 2016) — Gradient boosting 의 현대 구현 표준. 본 논문에서도 상위 3 모델 중 하나.
- **[LightGBM: A Highly Efficient Gradient Boosting Decision Tree](https://papers.nips.cc/paper/6907-lightgbm-a-highly-efficient-gradient-boosting-decision-tree)** (Ke et al., NeurIPS 2017) — leaf-wise growth + histogram binning 으로 GBM 보다 학습 시간을 크게 단축. 본 논문에서 GBM 대비 0.4초 vs 0.9초.
- **[SMOTE: Synthetic Minority Over-sampling Technique](https://arxiv.org/abs/1106.1813)** (Chawla et al., 2002) — 클래스 불균형 처리의 고전. 본 논문은 이 기법이 *항상* 도움이 되지는 않는다는 반례 사례.

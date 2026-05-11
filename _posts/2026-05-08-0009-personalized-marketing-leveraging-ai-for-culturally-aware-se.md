---
layout: post
title: "[논문 리뷰] Personalized marketing: Leveraging AI for culturally aware segmentation and targeting"
date: 2026-05-08
description: "Mall Customer 데이터셋 200명에 K-means clustering + LIME 을 결합해 4개 세그먼트를 만든 뒤 LIME 으로 각 클러스터의 결정 요인을 해석하는 짧은 응용 논문. '문화적으로 인지한다 (culturally aware)' 라는 제목과 실제 실험의 간극이 가장 큰 논점이다."
tags: [personalized-marketing, k-means-clustering, lime, customer-segmentation, explainable-ai]
categories: paper-review
giscus_comments: false
related_posts: false
thumbnail: assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig1-proposed-method.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/
en_url: /en/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Franciskus Antonius Alijoyo et al. (8명 공동 저자, 인도네시아·사우디아라비아·인도·우즈베키스탄·말레이시아) |
| 학회 | *Alexandria Engineering Journal* 119 (2025) 8-21 · Elsevier (open access, CC BY-NC-ND 4.0) |
| DOI | [10.1016/j.aej.2025.01.074](https://doi.org/10.1016/j.aej.2025.01.074) |
| 데이터 | Kaggle [Mall Customer Segmentation Data](https://www.kaggle.com/datasets/vjchoudhary7/customer-segmentation-tutorial-in-python) (n=200, 5 컬럼) |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-05-08 |

## TL;DR

- 200명짜리 Kaggle Mall Customer 데이터셋에 **K-means clustering + LIME (Local Interpretable Model-Agnostic Explanations)** 을 붙여 4개 클러스터로 고객을 나누고, 각 고객이 왜 그 클러스터에 들어갔는지를 LIME 으로 해석한 응용 논문이다.
- 정량 결과: 제안된 K-Means+LIME 이 MSE 0.9212, MAE 0.9874 로 Linear Regression (1.6861/1.0745), Decision Tree (1.1785/1.0002), KNN (1.2487/1.0015), GMM (1.2000/1.0500), DBSCAN (1.5000/1.250) 모두를 이겼다고 보고한다.
- 클러스터 4개는 *나이 × spending score* 평면에서 (고지출 / 중상지출 / 중하지출 / 저지출) 의 4계층으로 나뉘고, LIME 으로 본 결정 요인은 **`Age ≤ 29`** 가 압도적으로 크다 (Customer 0 에서 weight 10, Customer 1 에서 14).
- 비판할 거리는 분명하다 — 제목의 "*culturally aware*" 와 실험에 쓰인 데이터셋이 어긋난다. Mall Customer 데이터셋에는 ethnicity / language / region / cultural preference 같은 *문화* 변수가 한 개도 없다. 또 LIME 설명에서 의미 없는 `CustomerID` 가 상위 feature 로 올라오는 데이터 누수, 비지도 클러스터링에 MSE/MAE 를 적용한 평가 프레임의 기형성, 클러스터링 비교 표의 수치가 산출 근거가 모호한 점 등이 있다.
- 그럼에도 *K-means 이후의 후처리로 LIME 을 붙인다* 는 발상 자체는 실무에서 흔하게 쓰이며, 본 논문의 알고리즘 2 (LIME-based explainability) 는 그 패턴을 한 번 깔끔하게 정리해 둔 레시피로 가치가 있다.

## 소개 (Introduction)

AI 기반 *개인화 마케팅 (personalized marketing)* 은 지난 5년간 학계와 실무 양쪽에서 사실상 디폴트가 됐다. 본 블로그가 같은 맥락에서 이미 다룬 [paper 0005](/papers/0005-artificial-intelligence-in-customer-relationship-management/) 와 [paper 0007](/papers/0007-unlocking-power-of-ai-in-crm/) 은 *왜* AI-CRM 이 필요한지·*어떤 역량* 을 만들어내는지를 정성적으로 조립하는 거시 관점이었다면, 이 논문은 그 정반대편에 있다 — **K-means + LIME 이라는 두 클래식 기법을 200명짜리 공개 데이터셋에 붙여 한 번 굴려본** 작은 응용 사례 연구다.

저자들의 출발 문제 의식은 이렇다. K-means clustering 은 customer segmentation 에서 가장 표준적인 도구이지만 *왜 어떤 고객이 특정 클러스터에 속하는지* 를 설명하지 못한다는 한계가 있다. LIME (Ribeiro et al., 2016) 은 모델 무관 (model-agnostic) 으로 *국소* 영역에서 해석을 제공하는 도구다. 두 기법을 잇는 것 자체는 새롭지 않으나, 저자들은 여기에 한 가지 더 야심을 얹는다 — *문화 인지 (culturally aware)* 마케팅. 즉, 인종·언어·지역 같은 *문화 변수* 를 전처리 단계에서 함께 인코딩해 클러스터링에 넣고, LIME 으로 그 문화 변수의 기여도를 해석한다는 그림이다.

그런데 본 논문이 실제로 굴린 데이터셋은 Kaggle 의 Mall Customer (vjchoudhary7) 다. 컬럼은 `CustomerID, Gender, Age, Annual Income (k$), Spending Score (1-100)` 단 5 개. **문화 변수는 한 개도 없다.** 이 간극이 본 리뷰의 가장 큰 논점이며, 후술할 *한계와 비판적 평가* 섹션에서 길게 다룰 부분이다. 그럼에도 이 글에서 굳이 본 논문을 끝까지 읽어볼 가치가 있는 이유는 두 가지다 — (1) **K-means + LIME 통합 워크플로우가 5절 알고리즘 2 형태로 정리되어 있어 그대로 가져다 재사용할 수 있다**. (2) "*culturally aware*" 라는 비전과 실제 실증 사이의 빈 자리를 들여다보면, *문화 변수 기반 segmentation 을 진짜 하려면 무엇이 필요한가* 라는 후속 질문이 생긴다.

## 핵심 기여 (Key Contributions)

저자들이 자기 논문의 contribution 으로 명시한 것 + 리뷰어 입장에서 진짜 의미가 있다고 보는 것을 함께 정리한다.

- **K-means clustering 과 LIME 을 결합한 *해석 가능한 customer segmentation* 워크플로우** 를 한 장의 흐름도 (Fig. 1) 와 한 페이지 분량의 알고리즘 2 로 정리. 자기 데이터셋에 곧바로 옮겨붙일 수 있는 레시피다.
- 데이터 전처리 단계로 (1) 결측치 처리 (mean/median, mode, KNN imputation), (2) PCA 차원 축소, (3) Min-Max 또는 표준화 스케일링, (4) categorical feature 인코딩을 모두 표준화해 제시.
- Elbow Method + Silhouette Score 의 두 척도를 *동시에* 적용해 최적 K 를 결정하는 절차를 명시 — 본 데이터셋에서는 K=3 또는 K=4 가 elbow 점이라고 보고한다 (실제 시각화는 K=4 로 진행).
- 4개 베이스라인 (Linear Regression, Decision Tree, KNN) 및 2개 비지도 클러스터링 비교군 (GMM, DBSCAN) 대비 MSE/MAE 우위를 보고. (단, 이 평가 프레임 자체에 대한 비판은 별도 절에서.)
- 마케터 입장에서의 actionable insight — 중간 소득층 (middle-income) 이 핵심 타깃, 30 대 이하의 젊은 층이 high-spending 의 주요 인구통계 — 을 LIME 해석으로부터 도출.

## 관련 연구 / 배경 지식

이 절은 *논문 본문 2절 (Literature review) + 4.3·4.4 의 K-means / LIME 설명* 을 통합해 풀어 쓴다. ML 전반에 익숙하지만 customer segmentation 영역은 처음인 독자를 가정.

### Customer segmentation 의 클래식 — RFM 과 K-means

본 논문이 인용하는 선행 연구들 (Musa et al., 2020; Pradana, 2021; Tabianan et al., 2022; Christy et al., 2021) 의 공통 분모는 두 가지다. 첫째, **RFM (Recency, Frequency, Monetary)** 변수 또는 그에 준하는 트랜잭션 변수에 K-means 를 적용한다. 둘째, 베스트 K 를 elbow / silhouette / gap statistic 의 어느 하나로 결정한다. 본 논문의 *방법 자체* 는 이 흐름의 정통 변주이며, 이 글에 적힌 K-means 알고리즘 단계 (Determine K → Assign K centroids → Assign each point → Recompute centroids → Repeat) 도 1957년 Lloyd 와 1967년 MacQueen 이래 변하지 않은 표준 형태다.

### LIME — 모델 무관 국소 설명

LIME (Local Interpretable Model-Agnostic Explanations, Ribeiro et al., 2016) 은 black-box 분류기의 *예측 하나하나* 를 설명하는 기법이다. 핵심 아이디어는 단순하다 — 설명하고 싶은 데이터 포인트 $x$ 의 *근방* 에서 입력을 살짝 perturb 한 합성 샘플을 만들고, black-box 모델이 그 샘플들에 어떤 예측을 내는지 본 다음, 그 (perturbed sample, prediction) 쌍에 *해석 가능한 단순 모델* (보통 weighted linear regression) 을 fitting 해 그 단순 모델의 계수를 "설명" 으로 보여 준다.

수식으로 보면 LIME 의 목적함수는 다음과 같다.

$$
\xi(x) = \arg\min_{g \in G} \; \mathcal{L}(f, g, \pi_x) + \Omega(g)
$$

- $f$: 설명할 black-box 모델
- $g$: interpretable 모델 (linear, decision tree 등)
- $\pi\_x(z)$: $z$ 가 $x$ 와 얼마나 가까운지를 나타내는 proximity weight
- $\mathcal{L}$: $f$ 와 $g$ 의 prediction 차이를 $\pi\_x$ 로 가중 평균한 loss
- $\Omega(g)$: $g$ 의 복잡도 페널티 (feature 수 등)

본 논문은 이 LIME 을 **K-means 출력에 사후 적용** 한다. 정확히 말하면 K-means 는 분류기가 아니므로, 클러스터 라벨을 target 으로 두고 그 클러스터 라벨을 예측하는 *대리 (surrogate) 분류기* 를 생각한 뒤 LIME 의 `LimeTabularExplainer` 를 이 surrogate 분류기에 붙이는 형태다. 알고리즘 2 (5절) 에 그 절차가 정리돼 있다.

### Elbow Method 와 Silhouette Score

K-means 의 K 를 어떻게 고를지에 대한 두 표준 지표.

- **Elbow Method**: K 를 1 → 10 으로 늘려가며 WCSS (Within-Cluster Sum of Squares, Eq. 3) 를 계산해 그래프를 그렸을 때 *기울기가 꺾이는 점* (elbow) 을 K 로 잡는다. 본 논문 데이터셋에서는 K=3 ~ 4 부근.

- **Silhouette Score** (Rousseeuw, 1987): 점 $i$ 의 silhouette $s\_i$ 는 자기 클러스터 내 평균 거리 $a\_i$ 와 가장 가까운 다른 클러스터까지의 평균 거리 $b\_i$ 의 차이를 max 로 정규화한 값이다. $s\_i \approx 1$ 이면 잘 분리, $s\_i \approx 0$ 이면 경계, $s\_i < 0$ 이면 잘못 분류된 점.

  $$
  s_i = \frac{b_i - a_i}{\max(a_i, b_i)}
  $$

  전체 데이터의 평균 $\bar{s}$ 가 가장 큰 K 를 선택한다.

본 논문은 두 지표를 *모두* 본다는 점만 강조하고, 실제 silhouette 곡선은 figure 로 제시하지 않는다 (elbow 만 Fig. 9 에서 시각화).

## 방법 / 아키텍처 상세

전체 파이프라인은 한 그림으로 요약된다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig1-proposed-method.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: 제안된 파이프라인. (1) 데이터 수집 → (2) 전처리: 결측치 처리·feature scaling·feature encoding → (3) K-means clustering: Elbow / Silhouette 로 K 결정 → (4) LIME 기반 explainability."
   zoomable=true %}

이하 순서대로 본다.

### 데이터 수집

원문 4.1 절은 "*The Mall Customers dataset was designed to facilitate education of seminal concepts within customer segmentation*" 이라고 하면서, 이 데이터셋이 사실상 customer segmentation 학습용 toy 데이터셋임을 명시한다. 5 컬럼: `CustomerID, Gender, Age, Annual Income (k$), Spending Score (1-100)`. 200 행. *문화 변수는 없다.*

### 데이터 전처리

세 단계로 나뉜다.

- **결측치 처리 (Imputation)** — Mean/Median, Mode, KNN imputation 의 셋을 모두 후보로 두고, 데이터의 분포·feature 종류에 따라 고른다고 서술. 본 데이터셋에는 사실상 결측치가 없으므로 이 단계는 형식적이다.
- **차원 축소 (Dimensionality reduction)** — PCA 를 후보로 둔다. 그러나 5 컬럼 (사실상 4 개 feature) 짜리 데이터셋에 PCA 를 굳이 적용할 이유는 적다.
- **데이터 변환·스케일링** — Min-Max scaling (0~1 범위) 또는 표준화 (mean 0, std 1). 본 데이터셋의 Age (18-80), Annual Income (20-140K USD), Spending Score (1-100) 의 스케일 차이가 K-means 의 Euclidean 거리를 왜곡하므로 필수 단계다.

### K-means clustering

Eq. 1 의 Euclidean 거리

$$
d(x_i, \mu_k) = \sqrt{\sum_{j=1}^{n} (x_{ij} - \mu_{kj})^2}
$$

로 점 $x\_i$ 를 가장 가까운 centroid $\mu\_k$ 의 클러스터에 할당하고, Eq. 2 의 centroid 업데이트

$$
\mu_k = \frac{1}{|C_k|} \sum_{x_i \in C_k} x_i
$$

로 centroid 를 다시 계산한다. 수렴 또는 max iter 까지 반복. 알고리즘 흐름이 Fig. 2 에 정리돼 있다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig2-kmeans-flowchart.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: K-means clustering 알고리즘. K 결정 → 초기 centroid 할당 → 점 → 가까운 centroid 할당 → centroid 재계산 → 재할당 발생 시 반복 → 최종 클러스터 출력."
   zoomable=true %}

### Bias mitigation strategies in clustering

본 논문이 *균형 표본 추출 (balance sampling) / 무관 변수 제외 / domain expert 검토* 를 bias mitigation 의 세 축으로 제시. 이 절은 짧고 구체적인 적용 예시는 제공되지 않으며, 사실상 bias 가 *어느 단계에서* 들어올 수 있는지에 대한 일반론에 가깝다.

### Elbow Method 와 Silhouette Score

앞서 *관련 연구* 절에서 정리한 두 지표를 그대로 적용. 본 논문은 K=2 ~ K=10 범위에서 WCSS 를 계산해 그래프를 그렸고, K=3 또는 K=4 에서 elbow 가 관찰된다. 이후 시각화는 K=4 로 진행한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig9-elbow-method.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9: Elbow Method 로 본 WCSS vs K 곡선. K=1 → 2 에서 가장 큰 감소가 일어나고 K=4 ~ 5 부근에서 곡선이 완만해진다. 본 논문은 K=3 또는 K=4 를 optimal 로 보고 시각화는 K=4 로 진행."
   zoomable=true %}

### LIME-based explainability for customer segmentation

LIME 을 K-means 출력에 사후 적용하는 절차가 5절 알고리즘 2 로 정리돼 있다.

```text
입력:  전처리된 데이터 행렬 X, 학습된 모델 f(θ), feature 이름, 클래스 라벨
출력:  세그먼트별 설명 + actionable 마케팅 인사이트

1. LIME Explainer 초기화
   explainer = LimeTabularExplainer(
       X, mode='classification',
       feature_names=feature_names,
       class_names=class_names)

2. 각 고객마다 설명 생성
   for x_i in X:
       x_f = extract_features(x_i)
       explanation = explainer.explain_instance(
           x_f, f(θ).predict_proba, num_features=5)
       feature 기여도 막대그래프 시각화

3. 모든 고객의 설명을 집계
   - 클러스터별 공통 패턴 추출
   - 클러스터 식별 feature 추출
   - 클러스터 간 차별화 feature 추출

4. 타깃 마케팅 전략 수립
   - 클러스터별 캠페인 설계
   - 영향력 큰 feature 기반 상품·서비스 설계
   - domain expert 와 정합성 검증

5. actionable 권고안 출력
```

여기서 `f(θ).predict_proba` 가 핵심이다. K-means 는 *예측 확률* 을 내지 않으므로, 본 논문은 *클러스터 라벨을 supervised target 으로 두고 그 라벨을 예측하는 surrogate classifier* 를 만든 뒤 그 surrogate 의 `predict_proba` 를 LIME 에 넘기는 식으로 우회한다. 알고리즘 2 가 명시적으로 어떤 surrogate 를 쓰는지 적지 않은 점은 한계다.

## 학습 목표 / 손실 함수

본 논문은 *학습 손실* 이 아니라 *평가 메트릭* 으로 모델을 비교한다. 두 식이 정의된다.

- **MSE (Mean Squared Error)**

  $$
  \mathrm{MSE} = \frac{1}{n} \sum_{i=1}^{n} (y_{\mathrm{pred},i} - y_{\mathrm{actual},i})^2
  $$

- **MAE (Mean Absolute Error)**

  $$
  \mathrm{MAE} = \frac{1}{n} \sum_{i=1}^{n} |y_{\mathrm{pred},i} - y_{\mathrm{actual},i}|
  $$

본문 표현으로는 "*MSE measures the average squared distinction between the actual and predicted spending scores*" — 즉 spending score 를 *target* 으로 두고 그것을 예측하는 회귀 문제로 본다는 뜻이다. K-means 자체는 spending score 를 예측하지 않으므로, 이 평가는 사실상 K-means → 클러스터 → (각 클러스터의 평균 spending score 로 ŷ 산출 또는 surrogate regressor) 의 추가 단계가 들어가야 한다. 그 단계가 본문에 명시되지 않은 점이 평가 프레임의 가장 큰 모호함이다.

## 학습 데이터와 파이프라인

| 항목 | 값 |
|------|-----|
| 데이터셋 | Kaggle Mall Customer Segmentation |
| 행 수 | 200 |
| 컬럼 | `CustomerID, Gender, Age, Annual Income (k$), Spending Score (1-100)` |
| 결측치 | 사실상 없음 |
| 클러스터 알고리즘 | K-means |
| K 결정 | Elbow + Silhouette (K=3 또는 4) |
| 시각화 K | 4 |
| 해석 도구 | `lime.LimeTabularExplainer` (mode='classification', num_features=5) |
| 평가 지표 | MSE, MAE |
| 컴퓨팅 자원 | 명시 없음 (소형 데이터셋이므로 CPU 단일로 충분) |

## 실험 결과

### 데이터셋의 인구통계 분포

먼저 데이터의 *원래 모습* 을 확인해 두면 결과 해석이 쉽다.

- **Age**: 18 ~ 80, 피크는 50대 부근. 36-45 그룹이 가장 큼 (밀도 0.9), 그 다음 18-25 (0.85), 26-35 (0.75), 56+ (0.7), 46-55 (0.6).
- **Gender**: 여성 100명, 남성 90명. 미세하게 여성 쪽으로 기울어진 균형.
- **Annual Income**: 20K ~ 140K USD, 피크는 80K USD 부근. 거의 정규 분포.
- **Spending Score (1-100)**: 60 부근 피크. 좌우 비교적 대칭. 30 미만이나 90 이상은 적음.

### 4개 클러스터 (K=4)

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig11-clusters-age-spending.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 11: 나이 × Spending Score (1-100) 평면에서 본 4개 클러스터. 빨강 = 고지출 (75-100), 보라 = 중상지출 (60-85), 시안 = 중하지출 (30-60), 검정 = 저지출 (5-25). spending score 축으로 거의 완벽히 4 단으로 갈리며, 나이는 클러스터 내에서 골고루 분포한다."
   zoomable=true %}

본 논문의 해석은 *moderate spenders (보라 + 시안) + 중간 소득층 + 30 대 이하의 젊은 층* 이 가장 dominant 한 마케팅 타깃이라는 것이다.

### LIME 으로 본 결정 요인

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig12-lime-customer-0.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 12: Customer 0 에 대한 LIME 설명. Age ≤ 29 가 weight 10 으로 압도적, Annual Income 39.75-62 가 weight 5, CustomerID 46.5-101.5 가 weight 3."
   zoomable=true %}

Customer 1 에서도 패턴이 비슷하다 — `Age ≤ 29` 가 weight 14, `CustomerID ≤ 46.5` 가 2, `Annual Income ≤ 39.75` 가 1.5. 두 고객 모두 *나이* 가 압도적이고, *연 소득* 이 그 다음, 그리고 (의외로) **`CustomerID`** 가 세 번째 feature 로 올라온다. 이는 데이터 누수 (data leakage) 의 명확한 신호이며 비판 섹션에서 다룬다.

### 모델 성능 비교

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/tab1-tab2-performance.png"
   class="img-fluid rounded z-depth-1"
   caption="Tables 1 & 2: 제안된 K-Means+LIME 이 모든 베이스라인 (Linear Regression, Decision Tree, KNN) 과 비지도 비교군 (GMM, DBSCAN) 에서 가장 낮은 MSE/MAE 를 기록."
   zoomable=true %}

수치를 다시 정리하면:

| 모델 | MSE | MAE |
|------|-----|-----|
| Linear Regression | 1.6861 | 1.0745 |
| Decision Tree | 1.1785 | 1.0002 |
| KNN | 1.2487 | 1.0015 |
| **K-Means + LIME (제안)** | **0.9212** | **0.9874** |
| GMM | 1.2000 | 1.0500 |
| DBSCAN | 1.5000 | 1.250 |

{% include figure.liquid loading="eager"
   path="assets/img/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/fig14-comparison.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 14: K-Means(+LIME) vs GMM vs DBSCAN 의 MSE/MAE 비교 — K-Means+LIME 가 (0.9212, 0.9874) 로 가장 낮다."
   zoomable=true %}

## 결과 분석 / Ablation

본 논문은 ablation 을 직접 수행하지 않는다. K-means 만 vs K-means+LIME 의 ablation, K=3 vs K=4 의 ablation, scaling 방식 (Min-Max vs 표준화) 의 ablation 등이 모두 부재. *왜 K-Means+LIME 이 다른 모델보다 낮은 MSE/MAE 를 내는가* 라는 핵심 질문에 대해서도 정량 근거 대신 "*K-Means 가 효과적이었기 때문*" 이라는 정성적 서술에 그친다. 이 부분이 본 논문 평가의 가장 큰 약점이다.

대신 LIME 출력으로부터 도출되는 *간접 ablation* 은 가능하다 — `Age` 를 빼면 Customer 0/1 의 weight 합이 약 60% 감소할 것이고, `CustomerID` 를 빼면 약 20% 감소할 것이다 (LIME weight 합 비례 추정). 이는 본 논문이 직접 실험한 것이 아니라 figure 12·13 에서 독자가 거꾸로 읽어내는 부분이다.

## 한계와 비판적 평가

이 절이 본 리뷰의 핵심이다. 저자가 인정한 한계 + 리뷰어 입장에서 추가로 보이는 한계를 합쳐 정리한다.

### 저자가 명시한 한계

- 데이터셋이 작다. 더 큰·더 다양한 데이터셋으로 확장 필요.
- 고차원 데이터에서는 LIME surrogate 의 정확도가 떨어질 수 있다.
- Real-time / streaming 데이터로 확장하려면 Apache Kafka 같은 stream 처리 또는 adaptive ML 이 필요.
- Deep learning 기반 클러스터링 (autoencoder 등) 으로 확장해 비선형 관계를 더 잘 잡을 여지.

### 리뷰어가 추가로 짚는 한계

1. **"Culturally aware" 라는 제목과 데이터셋의 부정합** — 본 논문이 실험한 Mall Customer 데이터셋에는 ethnicity / language / region / cultural preference 같은 *문화* 변수가 한 개도 들어 있지 않다. 본문 4.2 절에서 "*feature encoding scales the categorical characteristics, including ethnicity, language, or region of residence*" 라고 일반론을 적었지만, 그 일반론이 본 실험에 적용될 수 없다. 즉 *제목·abstract 의 비전* 과 *실제 실증* 이 어긋난다. 본 논문을 읽고 곧바로 자기 과제에 옮기려는 독자는 이 점을 가장 먼저 분리해 받아들여야 한다.

2. **`CustomerID` 가 LIME 설명의 상위 feature 로 올라오는 데이터 누수** — Figure 12, 13 에서 Customer 0 은 `46.50 < CustomerID ≤ 101.50` 가 weight 3, Customer 1 은 `CustomerID ≤ 46.50` 가 weight 2 로 나온다. CustomerID 는 본질적으로 *인덱스* 일 뿐 segment 와 의미적 관계가 없는 변수다. 그럼에도 LIME 에서 유의미한 weight 가 잡힌다는 것은 두 가지 중 하나를 뜻한다 — (a) CustomerID 가 데이터 입력 순서로 정렬되어 있어 *암묵적으로 다른 변수와 상관* 을 갖는 leakage, (b) feature scaling 단계에서 CustomerID 를 제외하지 않은 전처리 결함. 어느 쪽이든 본 논문의 LIME 해석을 그대로 신뢰하기 어렵다는 신호이며, 정상적인 production 파이프라인에서는 ID 컬럼을 *최우선으로 drop* 해야 한다.

3. **비지도 클러스터링에 MSE/MAE 를 적용한 평가 프레임의 기형성** — K-means 자체는 *target* 을 예측하지 않는다. 본 논문이 MSE/MAE 를 보고하려면 (1) spending score 를 target 으로 두고 (2) 각 클러스터별 평균 spending score 또는 별도 surrogate regressor 로 ŷ 를 산출하는 추가 단계가 필요하다. 이 단계가 본문에 명시되지 않았으므로 *0.9212 라는 숫자가 정확히 무엇을 측정한 값* 인지 재현할 수 없다. 또 GMM (1.2000), DBSCAN (1.5000) 의 MSE 가 *어떻게 계산되었는지* 도 마찬가지로 불명확하다. 일반적으로 클러스터링 비교는 silhouette / Davies-Bouldin / Calinski-Harabasz 또는 (라벨이 있는 경우) ARI / NMI 로 한다.

4. **Linear Regression / Decision Tree / KNN 비교의 의미 부재** — Table 1 의 비교 모델 셋은 모두 *지도 학습 회귀·분류 모델* 이다. K-means 가 비지도라면 그 결과를 회귀 모델과 같은 평면에서 비교하는 것 자체가 형평성이 없다. 이는 본 논문이 K-means 다음에 *어떤 supervised step 을 붙였는지* 가 본문에 빠진 결과이며, 결국 위 (3) 과 같은 평가 프레임 모호성으로 귀결된다.

5. **K=3 vs K=4 의 결정 근거가 모호** — Elbow 곡선만으로는 두 값 모두 가능하다고 본문에서 인정한다. Silhouette 곡선을 별도로 figure 로 제시하지 않은 채 K=4 를 선택했다. 두 K 의 silhouette 값을 같이 보고하는 것이 표준 관행이다.

6. **Ablation 부재** — 위 *결과 분석* 절에서 정리한 대로, K-means 단독 vs K-means+LIME, K=3 vs K=4, Min-Max vs 표준화 등의 ablation 이 모두 빠져 있다. 따라서 *LIME 이 정량적 성능에 얼마나 기여* 하는지 이 논문 안에서는 알 수 없다.

7. **Figure 10 (Number of Customer and Ages) 의 y 축 단위가 0~1 범위** — 200명짜리 데이터셋에서 "Number of Customer" 가 0.6 ~ 0.9 로 표시되는 것은 *정규화된 비율* 이지 절대 인원 수가 아닌 듯하다. 그럼에도 axis 라벨이 그대로 *Number of Customer* 로 적힌 점은 figure 가독성 측면의 결함.

8. **"인사이트" 의 일반화 한계** — 본 논문이 도출한 *moderate spender / 중간 소득 / 젊은 층* 이라는 segment 인사이트는 이 200명짜리 toy 데이터셋에 한정된 패턴이다. 같은 결론을 다른 산업 데이터로 일반화할 수 없다. 그럼에도 결론에서 "*K-means + LIME 이 culturally aware 마케팅에 효과적*" 이라는 강한 주장으로 점프한다.

## 시사점 / Takeaways

- **K-means + LIME 의 통합 레시피 자체는 재사용 가치가 있다.** 알고리즘 2 가 거의 그대로 production 파이프라인의 후처리 단계로 옮겨붙는다 — 클러스터링 → surrogate classifier → LimeTabularExplainer → 클러스터별 feature 기여도 시각화. 자기 데이터에 옮길 때는 ID 컬럼 drop 과 surrogate 의 정의를 명시적으로 짚어야 한다.
- **"Culturally aware" 같은 비전 단어와 실제 실험을 항상 분리해 읽어야 한다.** 논문 제목·abstract 가 약속하는 것과 실제 데이터셋·실험이 무엇을 보여주는지 사이의 거리가 본 논문에서 매우 멀다. 응용 논문을 빠르게 훑을 때 abstract 만 보고 결론을 가져오면 위험하다.
- **클러스터링 모델을 회귀 메트릭 (MSE/MAE) 으로 비교할 때는 surrogate 단계가 어디서 들어가는지 반드시 확인해야 한다.** 비지도 → 지도 평가의 변환 단계가 명시되지 않은 비교는 재현성이 무너진다.
- **LIME 에서 의미 없어 보이는 변수 (`CustomerID` 같은 인덱스, 입력 순서, 행 번호) 가 상위 feature 로 잡히면 거의 100% 데이터 누수다.** 본 논문은 그 신호를 그대로 두고 해석을 진행한다 — 자기 데이터셋에서 같은 패턴을 보면 즉시 ID 컬럼을 drop 해야 한다.
- **본 블로그의 [paper 0005](/papers/0005-artificial-intelligence-in-customer-relationship-management/), [paper 0007](/papers/0007-unlocking-power-of-ai-in-crm/) 같은 거시 (조직 역량) 관점과 본 논문 같은 미시 (단일 알고리즘) 관점은 상보적**. 거시에서 *왜·무엇을* 잡고, 미시에서 *어떻게* 잡는 식으로 두 층위를 같이 보면 마케팅 ML 의 지형이 입체적으로 잡힌다.

## 설치 및 사용법

본 논문은 코드를 공개하지 않았으나, 알고리즘 2 의 절차는 `scikit-learn` 과 `lime` 만으로 그대로 재현 가능하다. 아래는 본 리뷰어가 정리한 최소 재현 예제다 (Mall Customer 데이터셋 가정).

```python
# pip install scikit-learn lime pandas numpy
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from lime.lime_tabular import LimeTabularExplainer

# 1) 데이터 로드 + ID 컬럼 drop (본 리뷰의 가장 큰 권고)
df = pd.read_csv("Mall_Customers.csv")
df = df.drop(columns=["CustomerID"])
df["Gender"] = (df["Gender"] == "Male").astype(int)

X = df[["Gender", "Age", "Annual Income (k$)", "Spending Score (1-100)"]].values
feature_names = ["Gender", "Age", "AnnualIncome", "SpendingScore"]

# 2) Scaling
scaler = StandardScaler()
Xs = scaler.fit_transform(X)

# 3) K-means (K=4)
km = KMeans(n_clusters=4, random_state=0, n_init="auto").fit(Xs)
labels = km.labels_

# 4) Surrogate classifier — LIME 이 predict_proba 를 요구하므로
clf = RandomForestClassifier(random_state=0).fit(Xs, labels)

# 5) LIME explainer
explainer = LimeTabularExplainer(
    Xs, mode="classification",
    feature_names=feature_names,
    class_names=[f"Cluster {i}" for i in range(4)],
)

# 6) 한 고객에 대한 설명
i = 0
exp = explainer.explain_instance(Xs[i], clf.predict_proba, num_features=4)
print(exp.as_list())
exp.as_pyplot_figure()
```

이 스니펫에서 본 논문 대비 두 가지가 다르다 — (a) `CustomerID` 를 drop, (b) surrogate classifier 를 명시적으로 RandomForest 로 fix. 이 두 변경만으로도 본 논문에서 발생한 *CustomerID 누수* 문제가 사라진다.

## 참고 자료

- 논문: [Alexandria Engineering Journal 119 (2025) 8-21](https://doi.org/10.1016/j.aej.2025.01.074)
- DOI: [10.1016/j.aej.2025.01.074](https://doi.org/10.1016/j.aej.2025.01.074)
- 데이터셋: [Mall Customer Segmentation Data on Kaggle (vjchoudhary7)](https://www.kaggle.com/datasets/vjchoudhary7/customer-segmentation-tutorial-in-python)
- 라이선스: CC BY-NC-ND 4.0 (open access)

## 더 읽어보기

- **["Why Should I Trust You?": Explaining the Predictions of Any Classifier](https://arxiv.org/abs/1602.04938)** (Ribeiro et al., KDD 2016) — LIME 의 원전. 본 논문의 5절 알고리즘 2 가 그대로 따라가는 framework.
- **[A Unified Approach to Interpreting Model Predictions](https://arxiv.org/abs/1705.07874)** (Lundberg & Lee, NeurIPS 2017) — SHAP 의 원전. 본 논문은 LIME 만 다루지만, 클러스터링 surrogate 에 SHAP 을 붙이면 *Shapley value 기반의 일관성 있는 기여도* 를 얻을 수 있어 후속 작업으로 자연스럽다.
- **[Silhouettes: a graphical aid to the interpretation and validation of cluster analysis](https://doi.org/10.1016/0377-0427(87)90125-7)** (Rousseeuw, 1987) — Silhouette score 의 원전. K-means 에서 K 결정 시 elbow 와 함께 보는 표준 지표.
- **[Some Methods for Classification and Analysis of Multivariate Observations](https://projecteuclid.org/ebooks/berkeley-symposium-on-mathematical-statistics-and-probability/Proceedings-of-the-Fifth-Berkeley-Symposium-on-Mathematical-Statistics-and/chapter/Some-methods-for-classification-and-analysis-of-multivariate-observations/bsmsp/1200512992)** (MacQueen, 1967) — K-means 의 1967년 원전. Lloyd (1957) 와 함께 표준 reference.
- **[Big data analytics and firm performance: Effects of dynamic capabilities](https://doi.org/10.1016/j.jbusres.2016.08.009)** (Wamba et al., 2017) — 본 논문이 다루는 *AI-CRM 역량* 의 더 거시적 frame. 데이터·기술·인력 자원이 어떻게 dynamic capability 로 응집되어 firm performance 로 이어지는지에 대한 실증.
- **[Artificial intelligence in customer relationship management: A systematic framework for a successful integration](https://doi.org/10.1016/j.jbusres.2025.115531)** (Ledro et al., 2025) — AI-CRM 도입의 *프로세스* 를 6단계로 정리한 framework. 본 블로그 [paper 0005](/papers/0005-artificial-intelligence-in-customer-relationship-management/) 리뷰 참고.
- **[Unlocking the power of AI in CRM: A comprehensive multidimensional exploration](https://doi.org/10.1016/j.jik.2025.100731)** (Alnofeli et al., 2025) — AI-CRM 역량을 3차원·8 sub-dimension 으로 정리한 정성 연구. 본 블로그 [paper 0007](/papers/0007-unlocking-power-of-ai-in-crm/) 리뷰 참고. 본 논문 같은 단일 모델 응용을 *조직 수준의 어떤 역량 카테고리에 매핑할지* 가 잘 정리돼 있다.
- **[The relevance of lead prioritization: a B2B lead scoring model based on machine learning](https://doi.org/10.3389/frai.2025.1554325)** (González-Flores et al., 2025) — 같은 마케팅 ML 영역의 다른 응용 사례 (B2B lead scoring). 본 블로그 [paper 0006](/papers/0006-b2b-lead-scoring-with-machine-learning/) 리뷰 참고. 클러스터링 vs 분류·랭킹 관점의 비교용.

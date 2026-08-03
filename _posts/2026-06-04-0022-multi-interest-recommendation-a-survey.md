---
layout: post
title: "[논문 리뷰] Multi-Interest Recommendation: A Survey"
date: 2026-06-04 14:00:00 +0900
description: "추천 시스템에서 사용자의 다중 관심사를 명시적으로 모델링하는 연구를 추출기·집계기·정규화·응용·미래 방향의 다섯 축으로 정리한 최초의 종합 서베이."
tags: [recommender-systems, multi-interest, sequential-recommendation, survey, user-modeling]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0022-multi-interest-recommendation-a-survey/fig6-framework.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0022-multi-interest-recommendation-a-survey/
en_url: /en/papers/0022-multi-interest-recommendation-a-survey/
---

{% include lang_toggle.html %}

#### 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Zihao Li et al. (5명 공동 저자, Wuhan University · Tencent WeChat · Nanyang Technological University) |
| 학회 | ACM Transactions on Information Systems (TOIS) · 2026 · Vol. 44, No. 4, Article 78 (open access, CC BY 4.0) |
| arXiv 또는 DOI | [10.1145/3789510](https://doi.org/10.1145/3789510) |
| Code | [WHUIR/Multi-Interest-Recommendation-A-Survey](https://github.com/WHUIR/Multi-Interest-Recommendation-A-Survey) |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-06-04 |

#### TL;DR

- 추천 시스템에서 사용자를 <strong>하나의 임베딩 벡터</strong>로 표현하는 관행은 사용자의 다면적·동적 선호를 담아내지 못한다. 다중 관심사 추천 (multi-interest recommendation) 은 사용자의 과거 상호작용에서 **여러 개의 관심사 벡터** $\mathbf{H}\_u = \{\mathbf{h}\_u^1, ..., \mathbf{h}\_u^K\}$ 를 명시적으로 추출해 세밀한 선호 모델링을 가능케 한다.
- 이 서베이는 다중 관심사 추천을 **왜 (why)**, **무엇을 (what aspects)**, **어떻게 (how)** 의 세 질문으로 체계화하고, 모든 기법을 두 개의 핵심 모듈 — 관심사 추출기 (interest extractor) 와 관심사 집계기 (interest aggregator) — 로 분해해 통일된 프레임워크로 정리한 <strong>최초의 종합 서베이</strong>다.
- 추출기는 dynamic routing (CapsNet), attention 및 그 변종, 비선형 변환으로, 집계기는 표현 집계 (representation aggregation) 와 추천 집계 (recommendation aggregation) 로 분류된다. 관심사 표현 붕괴 (representation collapse) 를 막는 다양성 정규화, 응용 시나리오·공개 데이터셋, 그리고 적응적 관심사 개수·효율성·디노이징·설명가능성·롱테일/콜드스타트·LLM/확산모델 같은 미래 방향까지 망라한다.

#### 소개 (Introduction)

추천 시스템 (recommendation system) 은 사용자의 과거 상호작용 기록을 바탕으로 정보를 필터링해 의사결정을 돕는다. 지난 20여 년간 e-commerce, 소셜 미디어, 뉴스, 엔터테인먼트 등 다양한 도메인에서 큰 성공을 거뒀다. 그런데 현실의 사용자 선호와 아이템 속성은 본질적으로 <strong>다양하고 불확실</strong>하다. 영화 추천을 예로 들면, 한 사용자의 시청 기록에는 로맨스·픽션·코미디 등 서로 다른 장르의 영화가 섞여 있고, 한 영화 (예: 《인생은 아름다워》) 도 로맨스·코미디·전쟁이라는 여러 장르에 동시에 속한다. 단일 벡터로 사용자와 아이템을 표현하는 일반적인 추천 기법은 이런 복잡하게 얽힌 상호작용과 다면적 아이템 테마를 효과적으로 포착하지 못한다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig1-toy-example.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: 영화 추천의 예시. 한 사용자가 여러 장르의 영화와 상호작용하며 다중 관심사 (Fantasy, War, Romance) 를 드러내고, 각 영화 역시 여러 장르와 테마를 포함한다."
   zoomable=true %}

이 문제를 풀기 위해 등장한 것이 **다중 관심사 추천** (다면적 선호 추천이라고도 부른다) 이다. 사용자 $u$ 에 대해 단일 임베딩을 학습하는 대신, $K$ 개의 잠재 관심사 벡터 집합 $\mathbf{H}\_u = \{\mathbf{h}\_u^1, \mathbf{h}\_u^2, ..., \mathbf{h}\_u^K\}$ 를 학습해 후보 아이템 추천에 종합적으로 활용한다. 사용자 선호를 여러 컴포넌트로 분해함으로써, 사용자 행동이 다양한 카테고리·토픽·맥락에 걸쳐 있는 상황에서 더 정확하고 세밀하며 다양한 추천이 가능해진다. 또한 어떤 사용자 의도가 어떤 아이템 측면에 대응하는지 명시적으로 식별할 수 있어 **설명가능성** 도 좋아진다.

이 서베이는 다음 세 가지 점진적 연구 질문에 답하는 방식으로 다중 관심사 추천을 정리한다. (1) **왜** 다중 관심사 모델링이 추천에 중요한가? (2) 다중 관심사 모델링은 **무엇** 에 초점을 두는가 (모델링 측면)? (3) 다중 관심사 모델링을 **어떻게** 적용하며, 대표 모듈의 기술적 디테일은 무엇인가? 기존 추천 서베이들은 특정 태스크·응용에 집중하거나, 사용자·아이템을 단일 표현으로 모델링하는 최신 기법에 집중해 사용자의 다양한 선호와 아이템의 다면성을 놓쳤다. 이 글은 그 공백을 메운다.

#### 핵심 기여 (Key Contributions)

- **다중 관심사 모델링에 대한 최초의 종합 정리.** 사용자 다중 관심사 모델링 연구를 처음으로 포괄적으로 정리하고, 이 연구 영역이 갖는 의의와 장점을 폭넓은 커뮤니티에 제시한다.
- **혁신적 분류 체계.** 다중 관심사 모델링 기법을 추천 태스크, 다중 관심사 모델링 측면, 연구 관심사라는 서로 다른 1차 축으로 분류하는 체계적 프레임워크를 도입한다. 이를 통해 관련 기법을 구조적으로 분석할 수 있는 통일된 틀을 마련한다.
- **도전 과제와 미래 방향 식별.** 기존 연구에서 미해결로 남은 한계와 도전을 짚고, 심층 탐구할 가치가 있는 미래 연구 방향을 제시한다.
- (리뷰어 관점) 무엇보다 **모든 기법을 추출기 + 집계기라는 2-컴포넌트 프레임워크로 환원** 한 점이 이 서베이의 실질적 가치다. dynamic routing 이냐 attention 이냐, 표현 단계에서 융합하느냐 추천 단계에서 융합하느냐라는 두 축만 잡으면 수십 편의 논문이 한 장의 표 (Table 3) 로 정렬된다.

#### 관련 연구 / 배경 지식

다중 관심사 추천을 이해하려면 먼저 두 가지 대표 태스크를 알아야 한다.

**CTR 예측 (Click-Through Rate prediction).** 아이템 집합 $\mathcal{I}$ 와 사용자 집합 $\mathcal{U}$, 그리고 상호작용 행렬 $\mathbf{R} = [r\_{i,j}]$ ($r\_{i,j}=1$ 이면 사용자 $u\_i$ 가 아이템 $i\_j$ 와 상호작용) 가 주어질 때, 사용자 $u$ 에게 아이템 $i$ 가 노출되었을 때 클릭할 확률을 추정한다.

$$
P(i \mid u, \mathbf{R}) = f_\theta(u, i, \mathbf{R})
$$

**순차 추천 (Sequential recommendation).** CTR 예측과 달리 사용자의 선호 진화와 시간 패턴 (장기·단기 선호) 을 모델링한다. 사용자의 상호작용 아이템을 시간 순 시퀀스 $\mathcal{S}\_u = \{i\_1, i\_2, ..., i\_t\}$ 로 정리하고, $t+1$ 시점에 사용자가 관심 가질 아이템을 예측한다.

$$
P(i_{t+1} \mid i_1, i_2, ..., i_t) = f_\theta(i_1, i_2, ..., i_t)
$$

**단일 표현에서 다중 표현으로.** 표현 학습 (representation learning) 프레임워크에서 두 태스크 모두 사용자 표현 $\mathbf{h}\_u \in \mathbb{R}^{1 \times d}$ 와 아이템 표현 $\mathbf{x}\_i \in \mathbb{R}^{1 \times d}$ 를 학습하고, 둘의 내적으로 예측 점수를 계산한다.

$$
\hat{y}_{u_i} = \mathbf{h}_u \mathbf{x}_i^\top
$$

사용자 의도의 불확실성, 행동 패턴의 복잡성, 아이템 테마의 모호성 때문에 단일 벡터로는 부족하다. 그래서 다중 관심사 추천은 사용자 표현을 단일 벡터에서 벡터 리스트 $\mathbf{H}\_u = [\mathbf{h}\_u^1, ..., \mathbf{h}\_u^K]$ 로, (또는 아이템 표현을 $\mathbf{X}\_i = [\mathbf{x}\_i^1, ..., \mathbf{x}\_i^K]$ 로) 확장한다. 여기서 $K$ 는 사용자 관심사 (또는 아이템 측면) 의 개수다. 그리고 여러 표현을 하나로 모으는 **집계 (aggregation)** 연산이 필요해진다. 집계 방식은 크게 두 가지다.

- **표현 집계 (Representation Aggregation).** 여러 관심사 표현을 추천 예측 전에 하나의 벡터로 융합한다.

$$
\hat{y}_{u_i} = \phi_u(\mathbf{H}_u)\,\phi_i(\mathbf{X}_i)^\top
$$

여기서 $\phi\_u(\cdot)$, $\phi\_i(\cdot)$ 는 pooling, concat, attention, 신경망 등의 집계 함수다.

- **추천 집계 (Recommendation Aggregation).** 각 관심사별로 먼저 추천 점수를 구한 뒤, 특정 전략 (예: max 연산) 으로 그 점수들을 결합한다.

$$
\hat{y}_{u_i} = \phi(\mathbf{H}_u \mathbf{X}_i^\top)
$$

이 두 패러다임의 차이는 뒤의 "방법" 섹션에서 모듈 수준으로 자세히 다룬다. 다중 관심사 연구의 역사는 2005년 Li et al. 이 e-commerce 추천에서 "사용자는 완전히 다른 여러 관심사를 가진다"는 개념을 처음 제안한 것으로 거슬러 올라가지만, 본격적으로 주목받은 것은 2019년 MIND (Li et al., 2019) 가 dynamic routing 으로 다중 관심사 벡터를 표현해 Mobile Tmall 앱의 온라인 트래픽에서 효과를 입증하면서부터다. 이후 ComiRec, SINE, MINER 등 영향력 있는 후속 연구가 쏟아졌고, DBLP 기준 2021년 이전 27편이던 관련 논문은 2024년 53편, 2025년 3월 기준 누적 172편으로 늘었다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig3-taxonomy.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 3: 다중 관심사 추천의 핵심 연구 차원 — 태스크 (Tasks), 모델링 측면 (Aspects), 핵심 모델 컴포넌트 (Models), 응용 시나리오 (Scenarios)."
   zoomable=true %}

#### 다중 관심사 모델링의 측면 (What aspects)

다중 관심사 모델링이 어떤 외부 정보를 활용하는가에 따라 측면을 **사용자 지향 (user-oriented)** 과 **아이템 지향 (item-oriented)** 으로 나눈다.

##### 사용자 지향 측면

- **공간/위치 정보 (Spatial).** 사용자의 여행·숙박·활동 행동은 위치에 따라 달라진다. 현대 대도시에서는 쇼핑몰·박물관을, 역사 문화 도시에서는 자연 경관·유적을 선호하는 식이다. 온라인 여행·라이프스타일 플랫폼에서 특히 중요하다.
- **시간/주기 정보 (Temporal & Periodic).** 관심사는 시간에 따라 변하고 주기적 경향을 띤다. 스포츠 애호가가 여름엔 서핑·수상 스포츠를, 겨울엔 스키·빙상 스포츠를 선호하는 식. 장기·단기 선호의 진화를 함께 모델링한다.
- **사회 집단 정보 (Social Group).** 비슷한 사회적 지위의 사용자는 비슷한 결정을 내리는 군집 (herding) 현상이 있다. 같은 집단 내 선호 유사성을 활용해 다중 관심사 프로파일을 풍부하게 한다.
- **사용자 행동 (Behaviors).** 검색·클릭·댓글·장바구니·즐겨찾기·구매 등 여러 유형의 행동은 각기 다른 잠재 관심사와 선호 강도를 드러낸다. 여러 행동 차원에 걸쳐 다중 관심사를 조사하면 설명가능성과 성능이 모두 좋아진다.

##### 아이템 지향 측면

- **속성 정보 (Attributes).** 아이템은 카테고리·태그·브랜드·지식 엔티티 등 다중 속성을 갖는다. 헬스장을 자주 가는 사람은 음식의 영양 정보를, 패션 엘리트는 디자이너 브랜드를 중시한다. 하이퍼그래프 신경망과 지식 그래프로 이런 구조적 지식을 표현 학습에 녹이는 연구가 활발하다.
- **리뷰 정보 (Reviews).** 아이템 리뷰는 판매자의 설명보다 설득력 있고 사용자의 진짜 선호를 드러낸다. 고품질 정보를 추출하면 사용자·아이템 모델링 양쪽에 도움이 된다.
- **멀티모달 정보 (Multi-Modality).** 아이템을 고유 ID 로만 식별하는 관행은 수치·범주 속성, 그림, 영상, 텍스트가 주는 풍부한 정보를 무시한다. computer vision (CV) 과 natural language processing (NLP) 의 대형 모델 성공에 힘입어 최근 가장 뜨거운 영역이 되었다.
- **도메인 정보 (Domain).** 사용자는 여러 도메인·플랫폼에 걸쳐 활동한다. 문학을 즐기는 사람이 예술 영화를 좋아할 가능성이 높듯, 도메인 간 정보로 타깃 도메인 성능을 높이고 콜드스타트를 완화할 수 있다.

여기서 중요한 구분이 하나 더 있다. **명시적 (explicit) 다중 관심사 모델링** 은 위와 같은 외부 사이드 정보를 반드시 동원해 각 측면별 선호 강도를 드러낸다. 반면 **암묵적 (implicit) 다중 관심사 모델링** 은 사이드 정보 없이 과거 상호작용만으로 다중 관심사 표현을 학습한다. DMIN, ComiRec, TimiRec 처럼 고정된 관심사 개수를 먼저 정한 뒤 dynamic routing 이나 attention 으로 벡터 집합을 모델링하는 단순하지만 효과적인 접근으로, 현재 주류 패러다임 중 하나다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/tab2-classification.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 다중 관심사 추천 대표 기법의 분류. 태스크 (Sequential / CTR / Session-based / Conversation / Cross-domain) × 모델링 측면 × 연구 관심사로 정렬했다."
   zoomable=true %}

#### 방법 / 아키텍처 상세 (How)

다중 관심사 추천 프레임워크는 두 핵심 컴포넌트로 구성된다. **관심사 추출기 (interest extractor)** 는 상호작용한 아이템과 사이드 정보로부터 여러 관심사 표현을 학습하고, **관심사 집계기 (interest aggregator)** 는 이 표현들을 융합하거나 각 표현에서 도출된 추천 결과를 결합해 최종 추천을 만든다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig6-framework.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 6: 다중 관심사 모델링 프레임워크. 점선 박스로 표시된 두 모듈 — interest extractor 와 interest aggregator — 가 핵심이다."
   zoomable=true %}

### 관심사 추출기 (1): Dynamic Routing

CapsNet (Sabour et al., 2017) 의 dynamic routing 은 계층 구조 학습에 특화된 알고리즘이다. 캡슐 (capsule) 은 객체의 위치·크기·색조 같은 여러 속성에 반응하는 뉴런 묶음이고, 활성 벡터의 길이는 속성 존재 확률을, 방향은 속성의 세기를 나타낸다. 다중 관심사 모델링에서는 관심사 캡슐 집합 $\mathbf{H} = [\mathbf{h}\_1, ..., \mathbf{h}\_K]$ 를 정의하고, 비선형 squash 함수로 갱신한다.

$$
\mathbf{h}_j = \text{squash}(\mathbf{s}_j) = \frac{\|\mathbf{s}_j\|^2}{1 + \|\mathbf{s}_j\|^2} \cdot \frac{\mathbf{s}_j}{\|\mathbf{s}_j\|}
$$

여기서 $\Vert \mathbf{s}\_j\Vert $ 는 벡터 $\mathbf{s}\_j$ 의 유클리드 노름 ($L^2$ 노름) 이다. squash 함수는 활성화 함수 역할을 하는데, 짧은 벡터는 0 쪽으로 억누르고 긴 벡터는 1 가까이로 압축한다. $\mathbf{s}\_j$ 는 다음으로 계산된다.

$$
\begin{aligned}
\mathbf{x}'_i &= \mathbf{W}_{ij}\mathbf{x}_i, \\
\mathbf{s}_j &= \sum_{i=1}^{t} c_{ij}\,\mathbf{x}'_i, \\
c_{ij} &= \text{softmax}(b_{ij}) = \frac{\exp(b_{ij})}{\sum_{j=1}^{K}\exp(b_{ij})}, \\
b_{ij} &= b_{ij} + \mathbf{h}_j \mathbf{x}_i'^\top
\end{aligned}
$$

$\mathbf{W}\_{ij}$ 는 학습 가능한 변환 행렬, $c\_{ij}$ 는 반복적 dynamic routing 으로 생성되는 결합 계수 (coupling coefficient) 로, 아이템 $i$ 가 캡슐 $j$ 에 결합될 확률을 뜻하며 0 으로 초기화된다. 전체 반복 과정은 아래 알고리즘으로 정리된다.

```text
Algorithm 1: Dynamic Routing
Input:  반복 횟수 R; 아이템 표현 [x_1, ..., x_t]; 라우팅 로짓 b_ij = 0
Output: 다중 관심사 표현 [h_1, ..., h_K]
for r = 1, 2, ..., R do
  각 하위 캡슐(아이템) i 에 대해: c_ij = softmax(b_ij)
  각 상위 캡슐(관심사) j 에 대해: s_j = Σ_i c_ij W_ij x_i
  각 상위 캡슐 j 에 대해: h_j = squash(s_j)
  갱신: b_ij = b_ij + h_j (W_ij x_i)^T
end for
return [h_1, ..., h_K]
```

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig7-extractors.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: 다중 관심사 추출 아키텍처. (a) dynamic routing 은 결합 계수를 반복적으로 정제하고, (b) attention 은 학습 가능한 관심사 임베딩 e 를 기준으로 단일 forward pass 로 가중합을 구한다."
   zoomable=true %}

### 관심사 추출기 (2): Attention 기반

dynamic routing 대신 attention 메커니즘으로 다중 관심사를 모델링하는 방식이 가장 널리 쓰인다. 학습 가능한 다중 관심사 임베딩 $\mathbf{E} = [\mathbf{e}\_1, ..., \mathbf{e}\_K]$ 를 기준으로, 상호작용한 아이템 표현 $[\mathbf{x}\_1, ..., \mathbf{x}\_t]$ 에서 $K$ 개의 관심사 표현을 뽑는다.

$$
\begin{aligned}
\mathbf{h}_j &= \sum_{i=1}^{t} w_i^j \mathbf{x}_i, \quad j = 1, 2, ..., K, \\
w_i^j &= \frac{\exp\!\big(\mathbf{e}_j\,\sigma(\mathbf{W}_j\mathbf{x}_i + \mathbf{b}_j)^\top / \tau\big)}{\sum_{i=1}^{t} \exp\!\big(\mathbf{e}_j\,\sigma(\mathbf{W}_j\mathbf{x}_i + \mathbf{b}_j)^\top / \tau\big)}
\end{aligned}
$$

$\mathbf{W}\_j$, $\mathbf{b}\_j$ 는 $j$ 번째 관심사에 대응하는 학습 파라미터, $\sigma(\cdot)$ 는 활성화 함수, $\tau$ 는 분포의 날카로움을 조절하는 온도 (temperature) 다. dynamic routing 과 달리 단일 forward pass 로 끝나 효율적이다. 변종도 다양하다. 어떤 연구는 $\mathbf{e}\_j\sigma(\mathbf{W}\_j\mathbf{x}\_i + \mathbf{b}\_j)^\top$ 를 거듭제곱 $\gamma$ 로 올려 분포 형태를 조절하는데, $\gamma$ 가 커질수록 중요한 아이템에 더 큰 attention 이 쏠리고, $\gamma=0$ 이면 평균 pooling, $\gamma \to \infty$ 이면 hard attention (가장 관련 있는 하나만 선택) 으로 바뀐다. 또 다른 연구는 내적 대신 코사인 유사도를 쓰거나, Gumbel-softmax 와 hard attention 을 결합하기도 한다.

### 관심사 추출기 (3): 비선형 변환

세 번째 방식은 각 상호작용 아이템에서 관심사를 도출하는 대신, 사용자 표현 $\mathbf{u}$ 에 비선형 변환을 직접 적용해 다중 관심사를 얻는다.

$$
\mathbf{h}_j = \text{LeakyReLU}\big(\mathbf{u}\mathbf{W}_j + \mathbf{b}_j\big), \quad j = 1, 2, ..., K
$$

여기서 $\mathbf{u}$ 는 신경망으로 모델링한 사용자 표현, $\mathbf{W}\_j$, $\mathbf{b}\_j$ 는 $j$ 번째 관심사에 대응하는 학습 가능한 변환 행렬과 바이어스다.

> **추출기 비교 (저자의 통찰).** dynamic routing 은 반복적 할당으로 행동을 이산적 관심사 슬롯으로 군집화해 분리가 명확하고 해석 가능하지만, 반복으로 인한 계산 오버헤드가 있고 관심사가 미묘하게 겹칠 때 약하다. attention 은 부드러운 콘텐츠 기반 혼합을 만들어 유연하고 장거리 의존성에 강하며 구현이 쉽지만, 관심사 벡터 간 중복과 긴 시퀀스에서의 메모리 비용, 약한 명시적 분리가 한계다. 저자들은 검색 파이프라인처럼 해석가능·다양·분리가 중요하면 routing 을, 세밀한 상호작용과 순차 맥락엔 attention 을 권하며, 둘을 결합한 하이브리드 (routing 후 attention 정제, 또는 다양성 제약을 둔 attention) 가 효율·성능 균형에서 최선인 경우가 많다고 본다.

### 관심사 집계기

집계기는 추출된 여러 관심사 표현을 최종 추천으로 모은다. 앞서 언급한 두 패러다임을 모듈 수준에서 본다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig8-aggregators.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: 다중 관심사 집계기 아키텍처. (a) 표현 집계는 추천 점수 계산 전에 융합된 단일 관심사 h'를 만들고, (b) 추천 집계는 관심사별 점수를 구한 뒤 max 등으로 결합한다."
   zoomable=true %}

**표현 집계 — concat / pooling.** 가장 단순한 방식은 concat 또는 mean/max pooling 후 MLP 를 거치는 것이다.

$$
\mathbf{h}' = \text{MLP}\big(\text{Concat/Pooling}([\mathbf{h}_1, \mathbf{h}_2, ..., \mathbf{h}_K])\big)
$$

MLP 는 차원 변환과 서로 다른 측면의 관심사를 균일한 잠재 공간으로 매핑하는 두 역할을 한다.

**표현 집계 — attention 기반.** 사용자 선호를 "기본 관심사 (basic interest)" 와 "다양한 관심사 (diverse interests)" 로 나눈다는 관점이다. 기본 관심사 $\mathbf{h}\_b$ (과거 상호작용 기반) 와 각 관심사 $\mathbf{h}\_i$ 의 상관을 계산해 가중합한다.

$$
\begin{aligned}
w_i &= \frac{\exp(\mathbf{h}_b \mathbf{W} \mathbf{h}_i^\top)}{\sum_{i=1}^{K} \exp(\mathbf{h}_b \mathbf{W} \mathbf{h}_i^\top)}, \\
\mathbf{h}' &= \sum_{i=1}^{K} w_i \mathbf{h}_i
\end{aligned}
$$

여기서 $\mathbf{W}$ 는 학습 파라미터다. 다양성을 높이고 사용자 피로 (user fatigue) 를 완화하려고 관심사 간 투영 거리로 유사도를 재는 변종도 있다.

**표현 집계 — 강화학습 셀렉터.** 모든 관심사가 현재 아이템에 기여하는 건 아니므로, 가장 관련 있는 관심사를 강화학습으로 동적 선택하기도 한다. 정책 모델 $\pi\_\theta(s, a)$ 가 상태 $s$ (현재 아이템에 대한 사용자 관심사) 에서 행동 분포 (관심사 선택 여부) 를 내고, 추천 성능을 보상으로 정책을 갱신한다. dueling Q-network 를 써서 Bellman 방정식을 따르는 변종도 있다.

$$
\begin{aligned}
Q^*(s_t, a_t) &= \mathbb{E}_{s_{t+1}}\Big[r_t + \gamma \max_{a_{t+1} \in \mathcal{A}_{t+1}} Q^*(s_{t+1}, a_{t+1})\Big], \\
Q(s_t, a_t) &= \max_i \big(f_{\theta_V}(\mathbf{h}_i) + f_{\theta_A}(\mathbf{h}_i, a_t)\big), \quad i = 1, 2, ..., K
\end{aligned}
$$

**추천 집계 — mean/max pooling.** 각 관심사 $j$ 에서 아이템 $i$ 의 점수 $y\_i^j$ 를 구한 뒤 mean/max 로 최종 점수를 만든다.

$$
y_i' = \text{Mean/Max}\big([y_i^1, y_i^2, ..., y_i^K]\big)
$$

**추천 집계 — attention 기반.** 타깃 아이템 표현 $\mathbf{x}\_i$ 와 관심사 $\mathbf{h}\_j$ 의 관련성으로 각 점수의 가중치를 정한다.

$$
\begin{aligned}
y_i' &= \sum_{j=1}^{K} w_j\, y_i^j, \\
w_j &= \frac{\exp(\mathbf{h}_j \sigma(\mathbf{W}\mathbf{x}_i)^\top)}{\sum_{j=1}^{K} \exp(\mathbf{h}_j \sigma(\mathbf{W}\mathbf{x}_i)^\top)}
\end{aligned}
$$

> **집계기 비교.** 표현 집계는 추천 전에 여러 관심사 벡터를 만들어 각각이 직접 후보 생성을 이끌 수 있지만, 학습·추론 비용이 높고 융합 모듈에 의존하며 중복/노이즈 표현에 연산을 낭비할 수 있다. 추천 집계는 관심사별 추천 결과를 먼저 만든 뒤 합쳐서 기존 파이프라인에 끼워 넣기 쉽고 다양성 제어가 유연하지만, 후보가 매우 많을 때 비용이 폭증하고 결과 병합 시 중복/충돌이 최종 결과를 해칠 수 있다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/tab3-methods.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3: 추출기 × 집계기 조합으로 정렬한 대표 기법. attention 이 가장 많이 쓰이는 추출 방식이고, 그 다음이 dynamic routing 이다."
   zoomable=true %}

#### 학습 목표 / 손실 함수: 다양성 정규화

dynamic routing 이나 attention 으로 뽑은 다중 관심사 표현은 **관심사 표현 붕괴 (representation collapse)** 위험이 있다. 모든 관심사 표현이 서로 구분되지 않고 좁은 한 점으로 모이는 자명해 (trivial solution) 를 학습하는 현상으로, 모델의 표현력을 크게 떨어뜨린다. 이를 막기 위해 손실 함수에 불일치 (disagreement) 정규화 항을 넣어 관심사 표현들을 서로 밀어낸다. 정규화는 두 갈래로 나뉜다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0022-multi-interest-recommendation-a-survey/fig10-regularization.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 10: (a) 표현 정규화는 관심사 표현을 좁은 점에서 초공간 전체로 펼쳐 붕괴를 막고, (b) 분포 정규화는 관심사 분포를 등방성에서 비등방성으로 변환한다."
   zoomable=true %}

##### 표현 정규화 (Representation Regularization)

의미 초공간 (semantic hyperspace) 에서 관심사 쌍 간 거리를 키워 붕괴를 완화한다.

**코사인 유사도.** 모든 관심사 표현 쌍의 코사인 유사도를 최소화해 구분도를 높인다.

$$
\mathcal{L}_{reg} = \frac{1}{K^2}\sum_{i=1}^{K}\sum_{j=1}^{K} \frac{\mathbf{h}_i \cdot \mathbf{h}_j}{\|\mathbf{h}_i\|\,\|\mathbf{h}_j\|}
$$

**대조 학습 (Contrastive Learning).** 인스턴스를 양성 샘플에 가깝게, 음성 샘플에서 멀게 밀어내는 InfoNCE 손실을 정규화로 쓴다.

$$
\mathcal{L}_{reg} = -\frac{1}{K}\sum_{i=1}^{K} \log \frac{\exp(\text{sim}(\mathbf{h}_i, \mathbf{h}_i^+)/\tau)}{\exp(\text{sim}(\mathbf{h}_i, \mathbf{h}_i^+)/\tau) + \sum_{j=1}^{n}\exp(\text{sim}(\mathbf{h}_i, \mathbf{h}_j^-)/\tau)}
$$

양성 $\mathbf{h}\_i^+$ 는 원 표현에 노이즈 섭동/드롭아웃을 가해 만들고, 음성 $\mathbf{h}\_j^-$ 는 다른 관심사 표현에서 샘플링한다.

##### 분포 정규화 (Distribution Regularization)

표현 자체가 아니라 각 관심사의 **분포 변동성** 을 키워 붕괴를 막는다.

**공분산 정규화.** 아이템-관심사 라우팅 행렬 $\mathbf{C} \in \mathbb{R}^{t \times K}$ 의 공분산 행렬 대각 원소 (분산) 에 제약을 건다.

$$
\begin{aligned}
\text{Cov}(\mathbf{C}, \mathbf{C}) &= (\mathbf{C} - \bar{\mathbf{C}})^\top (\mathbf{C} - \bar{\mathbf{C}}), \\
\mathcal{L}_{reg} &= \big\|\text{diag}\big(\text{Cov}(\mathbf{C}, \mathbf{C})\big)\big\|_F^2
\end{aligned}
$$

$\bar{\mathbf{C}}$ 는 첫 축을 따른 $\mathbf{C}$ 의 평균이고, $\Vert \cdot\Vert \_F$ 는 프로베니우스 노름이다.

**원소별 정규화.** 더 직접적으로, 두 관심사의 attention 분포 행렬을 원소별로 비교해 차이를 키운다.

$$
\mathcal{L}_{reg} = \frac{1}{K^2}\sum_{i=1}^{K}\sum_{j=1}^{K} \big\|\mathbf{W}_i \odot \mathbf{W}_j\big\|
$$

$\mathbf{W}\_i$, $\mathbf{W}\_j$ 는 관심사 $i$, $j$ 의 attention 분포 행렬이고 $\odot$ 는 아다마르 곱이다. 저자들은 직교/분리 페널티 (표현 정규화) 는 최소 비용으로 다양성을 높이지만 너무 강하면 정확도를 해치고, 분포 제약은 군집 기반 모델에서 커버리지를 보장하지만 실제 행동 분포와 어긋날 수 있으며, 대조 학습은 미묘하게 겹치는 관심사를 잘 잡지만 음성 쌍 설계에 민감하다고 정리한다. 실무에서는 정규화 + 대조 학습 같은 하이브리드를 권한다.

#### 학습 데이터와 파이프라인: 응용 시나리오와 공개 데이터셋

다중 관심사 모델링은 일반 응용 (온라인 쇼핑·엔터테인먼트) 과 전문 도메인 (헬스케어·교육) 에 두루 적용된다. 서베이가 정리한 시나리오별 대표 공개 데이터셋은 다음과 같다.

| 응용 | 공개 데이터셋 | 비고 |
|------|------|------|
| 뉴스 | MIND | MS News 수집, 영문 기사 16만 건·노출 로그 1500만+ |
| 영화·마이크로비디오 | MovieLens, KuaiShou, ReDial, TG-ReDial | MovieLens 는 100K/1M/10M 등 다양한 크기 |
| 온라인 여행·체크인 | FourSquare, Fliggy, Yelp, Gowalla | 타임스탬프·지오태깅 체크인 (위치 기반) |
| 온라인 쇼핑 | Amazon, Taobao, RetailRocket, Ta Feng | Amazon Review 는 1996~2023 데이터 |
| 온라인 교육 | MOOCCube | XuetangX 수집, 강좌 ~1000·학습자 수만 명 |

대표 산업 사례로는 MIND (Tmall), ComiRec·PIMI·UMI·ULIM (Alibaba 온라인 추천), Trinity (Douyin/Douyin Lite 의 다중·장기·롱테일 관심사 통합), LongRetriever (초장기 시퀀스의 다중 관심사 검색) 등이 있다. 특히 ULIM 은 Taobao 에서 수만 개 상호작용 규모의 장기 행동 시퀀스를 카테고리 인식 부분 시퀀스로 분할하고 pointer-generator 네트워크로 top-K 관심사 카테고리를 예측해 지연 (latency) 제약을 푼다.

#### 결과 분석 / 도전 과제

서베이의 후반부는 미래 방향을 여섯 갈래로 짚는다. 각 항목은 단순 나열이 아니라 "왜 지금 이게 병목인가"를 함께 설명한다.

- **적응적 다중 관심사 추출 (5.1).** 대부분의 기법은 관심사 개수 $K$ 를 고정한다. 하지만 뉴스는 보통 단일 토픽에 집중되는 반면 영화는 본질적으로 모호하고 다면적이라, 고정 $K$ 는 비현실적이고 도메인 간 지식 전이를 막는다. 희소 관심사 캡슐 활성화, DBSCAN 같은 밀도 기반 군집, 계층적 군집의 덴드로그램, silhouette score·gap statistic 으로 최적 $K$ 를 동적으로 정하는 방향이 제안된다.
- **효율성 (5.2).** 다중 관심사 모델링은 일반 추천보다 계산 비용이 훨씬 크다. 관심사 개수, dynamic routing 의 반복 (캡슐 간 학습 행렬이 캡슐 수에 제곱으로 증가), 외부 사이드 정보 인코딩, 집계 방식 모두가 병목이다.
- **디노이징을 위한 추출 (5.3).** 모든 아이템이 사용자 의도에 유익한 건 아니다 (우발적 클릭, 부정확한 텍스트 설명). dynamic routing 은 본질적으로 노이즈를 soft-filtering 하는 성질 — 어떤 관심사 군집과도 정렬되지 않는 신호는 가중치가 낮아짐 — 이 있어 관심사 수준 디노이징의 원리적 길을 연다. 단 관심사 캡슐 내부/사이에서 노이즈를 어떻게 줄일지는 거의 연구되지 않았다.
- **설명가능성 (5.4).** 다중 관심사 설정에서는 "왜 추천했는가"뿐 아니라 "여러 선호 중 어떤 관심사가 이 추천을 이끌었는가"까지 밝혀야 한다. 아이템과 관심사 표현 간 세밀한 잠재 매핑을 밝히는 연구가 더 필요하다.
- **롱테일·콜드스타트 완화 (5.5).** 데이터 희소성이 근본 원인인 두 문제에, 다중 관심사 모델링은 이질적 보조 신호를 관심사 벡터 증강에 명시적으로 통합할 수 있어 구조적 이점이 있다. 멀티모달 사전학습, 도메인 간 관심사 프로토타입, 공간-시간 신호·사용자 집단 구조가 콜드 아이템 표현을 보강한다.
- **프런티어 방법론 (5.6).** ① **강화학습** — 사용자 상호작용을 실시간 의사결정으로 보고 관심사 선택을 정책으로 모델링. ② **LLM/VLM** — 뉴스 콘텐츠 인코딩, 아이템 맥락 모델링, DPO (direct preference optimization) 로 다중 선호 정렬, 멀티모달 사전학습. ③ **확산 모델 (diffusion)** — 역과정으로 노이즈 상호작용의 영향을 줄여 정제된 다중 관심사 표현을 만들지만, 사용자 관심사의 모호성·노출 편향 때문에 진짜 다면 관심사를 복원하기는 여전히 어렵다.

#### 한계와 비판적 평가

- **서베이 자체의 평가 부재.** 종합 정리로서의 가치는 크지만, 모든 기법을 동일 데이터셋·동일 프로토콜로 재현해 비교한 **벤치마크 표가 없다**. 어떤 추출기·집계기 조합이 어떤 시나리오에서 실제로 얼마나 우월한지는 독자가 원논문을 일일이 확인해야 한다.
- **하이브리드 권고의 근거.** "routing + attention 하이브리드가 최선"이라는 결론은 직관적이지만 정량적 근거 (예: 효율-성능 trade-off 곡선) 가 본문에 제시되지 않아 정성적 주장에 머문다.
- **암묵적/명시적 경계의 모호성.** 명시적 vs 암묵적 모델링 구분은 유용하지만, 사이드 정보를 "최소한으로" 쓰는 기법들이 어느 쪽에 속하는지 경계가 분명치 않다.
- **(저자가 인정한 한계)** 고정 관심사 개수, 높은 계산 비용, 관심사 수준 디노이징·설명가능성의 미성숙, 확산 모델의 이론-실제 괴리 등은 본문에서 솔직하게 미해결 과제로 적시한다.
- **평가 지표 표준화 부재.** 다양성·정확도·설명가능성을 동시에 측정하는 표준 지표가 합의되지 않아, 논문 간 "다양성 향상" 주장의 비교가 어렵다는 점은 이 분야 전반의 구조적 약점이다.

#### 시사점 / Takeaways

- **모든 다중 관심사 기법은 "추출기 + 집계기"로 환원된다.** 새 논문을 읽을 때 (1) 추출이 dynamic routing 인가 attention 인가 비선형 변환인가, (2) 집계가 표현 단계인가 추천 단계인가, (3) 다양성을 어떤 정규화로 보장하는가 — 이 세 질문만 던지면 빠르게 좌표를 잡을 수 있다. Table 3 이 그 지도다.
- **표현 붕괴는 다중 관심사의 아킬레스건이다.** $K$ 개 벡터를 뽑아도 다 같은 점으로 모이면 단일 표현과 다를 바 없다. 코사인/대조/공분산/원소별 정규화 중 무엇을 쓰는지가 모델의 실제 다양성을 좌우한다.
- **고정 $K$ 는 임시방편이다.** 뉴스는 단일 토픽, 영화는 다면적이라는 사실 하나만으로도 관심사 개수를 데이터에서 적응적으로 정하는 방향이 다음 세대의 핵심 과제임을 알 수 있다.
- **다중 관심사는 롱테일·콜드스타트와 천생연분이다.** 이질적 사이드 정보를 관심사 벡터에 직접 주입할 수 있는 구조라, 데이터 희소성 문제에 단일 표현보다 본질적으로 유리하다. 산업 배포 (Tmall, Alibaba, Douyin) 사례가 이를 뒷받침한다.
- **LLM·확산 모델이 다음 프런티어다.** 멀티모달·세계 지식을 관심사 추출에 녹이는 방향은 이미 시작됐지만, 확산 모델로 "진짜" 다면 관심사를 복원하는 일은 노출 편향이라는 근본적 난제를 넘어야 한다.

#### 참고 자료

- 논문: [Multi-Interest Recommendation: A Survey (DOI: 10.1145/3789510)](https://doi.org/10.1145/3789510)
- Code / 정리 저장소: [WHUIR/Multi-Interest-Recommendation-A-Survey](https://github.com/WHUIR/Multi-Interest-Recommendation-A-Survey)
- Venue: ACM Transactions on Information Systems, Vol. 44, No. 4, Article 78 (April 2026)

#### 더 읽어보기

- **[Multi-Interest Network with Dynamic Routing for Recommendation at Tmall](https://arxiv.org/abs/1904.08030)** (Li et al., CIKM 2019) — dynamic routing 으로 사용자 다중 관심사를 표현해 다중 관심사 추천을 본격화한 MIND.
- **[Controllable Multi-Interest Framework for Recommendation](https://arxiv.org/abs/2005.09347)** (Cen et al., KDD 2020) — 다중 관심사 추출 + 정확도/다양성을 조절 가능한 집계 모듈을 결합한 ComiRec.
- **[Sparse-Interest Network for Sequential Recommendation](https://arxiv.org/abs/2102.09267)** (Tan et al., WSDM 2021) — 큰 개념 풀에서 사용자별로 희소한 관심사 집합을 적응적으로 추론하는 SINE.
- **[Exploring Periodicity and Interactivity in Multi-Interest Framework for Sequential Recommendation](https://arxiv.org/abs/2106.04415)** (Chai et al., 2021) — 시퀀스의 주기성과 시간 간격을 다중 관심사 모델링에 통합한 PIMI.
- **[Dynamic Routing Between Capsules](https://arxiv.org/abs/1710.09829)** (Sabour et al., NeurIPS 2017) — 다중 관심사 추출의 dynamic routing 이 빌려온 원조 CapsNet 논문.

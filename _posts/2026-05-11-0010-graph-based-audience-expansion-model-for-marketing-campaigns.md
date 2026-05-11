---
layout: post
title: "[논문 리뷰] Graph-Based Audience Expansion Model for Marketing Campaigns"
date: 2026-05-11 10:00:00 +0900
description: "Rakuten 의 70여 개 서비스에 걸친 cross-service knowledge graph 에 TransE 사전학습과 GCN 을 잇고, neighbor entity 가 아닌 'knowledge query' (head + relation 임베딩 합) 를 메시지로 전달해 oversmoothing 을 우회한 광고용 lookalike 모델. SIGIR 2024 short paper."
tags: [audience-expansion, lookalike-modeling, knowledge-graph, graph-neural-network, recommender-systems, advertising]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/tab2-main-results.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/
en_url: /en/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Md Mostafizur Rahman, Daisuke Kikuta, Yu Hirate, Toyotaro Suzumura (Rakuten Institute of Technology · University of Tokyo) |
| 학회 | SIGIR 2024 · short paper (4-page main + refs, ACM proceedings) |
| DOI | [10.1145/3626772.3661363](https://doi.org/10.1145/3626772.3661363) |
| 데이터 | Rakuten 내부 데이터 (상위 5개 브랜드 A∼E, 익명화) + Tencent Ads 2018 공개 데이터셋 (421,961 seeds) |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-05-11 |

## TL;DR

- Rakuten 의 e-commerce·통신·여행 등 **70여 개 서비스** 에 걸친 사용자 행동을 한 장의 knowledge graph 로 묶고, *TransE* 식 사전학습으로 KG 임베딩을 얻은 뒤 그 임베딩을 *GCN* 으로 한 번 더 smoothing 하는 두 단계 audience expansion 모델 — **AudienceLinkNet** 을 제안한다.
- 핵심 한 줄: GCN aggregation 단계에서 *이웃 노드 임베딩* 을 평균하지 않고 **knowledge query $\mathbf{e}\_u + \mathbf{e}\_r$** (TransE 에서 tail 위치로 평행이동하는 head+relation 합) 을 평균한다. 결과로 destination 노드 주변에서 *관계가 명시된 점들* 의 위치 정보가 모이고, 단순 neighbor aggregation 의 oversmoothing 을 일부 우회한다.
- Rakuten 내부 브랜드 A∼E + Tencent Ads 공개 셋에서 Precision/Recall/PR-AUC 세 지표 모두를 본다. AudienceLinkNet (mean) 이 6개 데이터셋 × 3개 지표 = 18 칸 중 11 칸을 가져가며 (특히 Recall 은 5/6 데이터셋에서 1등), Brand E 와 Tencent 에서는 세 지표를 모두 sweep. Rakuten 평균 precision +4.06%, recall +7.18% 개선으로 같은 author 그룹의 직전 작업 PKGE 와 WeChat 의 MetaHeac (KDD 2021) 을 모두 누른다.
- Ablation 한 컷 — *PKGE 사전학습을 빼면* 모든 브랜드에서 Recall 이 떨어지고, 가장 seed 수가 적은 Brand C (seeds 1,654) 에서 가장 가파르게 무너진다. seed 가 부족한 캠페인일수록 사전학습이 더 결정적이라는 것이 이 한 figure 가 말하는 전부다.
- 짧은 SIGIR short paper 라 한계는 분명하다 — neighbor-aggregation 대비 knowledge-query aggregation 의 효과를 분리한 ablation 이 없고, KGCN / KGAT 같은 더 최근의 KG-GNN 베이스라인이 빠졌으며, attention2 가 왜 불안정한지에 대한 진단도 없다. 그럼에도 *cross-service KG 를 한 장으로 묶고 거기서 lookalike 를 푸는* 산업 적용 사례로서, 모델 자체보다 *문제 정식화* 가 더 큰 가치다.

## 소개 (Introduction)

광고 플랫폼이 어느 정도 성숙하면 결국 핵심 모델은 두 가지로 수렴한다 — *지금 어떤 광고를 보여줄지* 결정하는 CTR / CVR 예측기, 그리고 *누구에게 보여줄지* 결정하는 **audience expansion** 모델 (업계 용어로는 lookalike modeling, target prospecting). 두 모델은 풀려는 질문 자체가 다르다. CTR 은 user × ad 쌍에서 클릭 확률을 추정하지만, lookalike 는 **소수의 seed user 만 주어진 상태에서 그들과 *유사한* user 의 대규모 후보 집합을 만들어 내야 한다.** 이 글에서 다루는 Rahman et al. (2024) 의 *AudienceLinkNet* 은 후자, 즉 Rakuten 의 광고 플랫폼 "AIris Target Prospecting" 의 백엔드 모델을 한 번 갈아 끼우는 작업의 보고서다.

본 블로그가 같은 도메인에서 다룬 직전 글들 — [paper 0005](/papers/0005-artificial-intelligence-in-customer-relationship-management/) 와 [paper 0007](/papers/0007-unlocking-power-of-ai-in-crm/) 은 AI-CRM 의 거시 흐름을, [paper 0006](/papers/0006-b2b-lead-scoring-with-machine-learning/) 은 B2B lead scoring 의 클래식 ML 베이스라인을, [paper 0009](/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/) 는 K-means + LIME 으로 200명짜리 mall customer 데이터를 segmentation 하는 소형 응용 사례를 다뤘다 — 는 모두 *고객을 어떻게 이해하고 나눌 것인가* 의 layer 였다. 이번 글의 audience expansion 은 그보다 한 단계 *바깥* 의 layer 다. segmentation 으로 정의된 seed pool 이 주어진 뒤에 그 pool 을 *몇 십만에서 몇 백만 명 규모로 확장* 하는 단계.

저자들이 문제를 정식화하는 방식이 흥미롭다. *seed pool 의 크기가 일정하지 않다* 는 점을 가장 먼저 짚는다. Rakuten 의 캠페인 중 일부는 seed 가 1,654 명 (Brand C) 이고, 일부는 96,072 명 (Brand B) 이다. seed 가 1,500 인 캠페인에서 100만 명의 audience 를 만들고, 9만 명짜리 캠페인에서도 100만 명을 만들 때, *seed 가 작을수록 generalization 이 어렵고 overfitting 이 쉽다* 는 점은 통계적으로 당연하다. 그런데 본 논문에서는 이걸 단순한 ML 문제로 풀지 않고 **70여 개 서비스를 가로지르는 knowledge graph** 를 한 장 까는 것으로 우회한다 — Brand C 의 seed 1,654 명도 Rakuten 의 e-commerce / 통신 / 여행 / 포인트 / 멤버십 으로 점선이 닿아 있고, 그 점선 위의 *KG 임베딩* 을 사전학습으로 한 번 익혀두면 seed 가 작아도 그 자리에서 시작하지 않는다는 발상이다.

지금 이 논문을 굳이 읽을 가치가 있는 이유는 모델 *기법 자체* 가 새로워서가 아니다. AudienceLinkNet 의 모든 부속품 — TransE (NeurIPS 2013), GCN (Kipf & Welling, ICLR 2017), KGCN / KGAT (WWW · KDD 2019) — 은 모두 5∼10년 전의 것이다. 이 논문이 새롭게 하는 한 가지는 **GCN aggregation 의 메시지 단위를 "이웃 노드의 임베딩" 에서 "이웃과 잇는 KG triple 의 *knowledge query* 즉 head+relation 합" 으로 바꾼 것** 뿐이다. 그러나 이 작은 치환이 *industrial-scale cross-service KG* 위에서 의미를 가진다는 것을 보여 준 점, 그리고 Rakuten 의 5개 브랜드 + Tencent 공개 셋에서 *비교적 안정된 일관성* 으로 베이스라인을 누른다는 점이 이 글의 무게를 만든다.

## 핵심 기여 (Key Contributions)

저자 측 contribution 과 리뷰어 관점의 의미를 함께 적는다.

- **Cross-service knowledge graph 기반 audience expansion 의 정식화.** Rakuten 의 70여 개 서비스에 흩어진 user×item 상호작용 (buy, click, favorite 등) 을 한 장의 KG triple `(u, r, v)` 로 묶는 것이 1차 contribution 이다. lookalike 는 보통 *단일 캠페인 단일 채널* 에서 풀리는데, 본 논문은 *cross-service* 신호를 기본값으로 둔다.
- **Pre-trained KG embedding (PKGE) 의 단계적 사용.** 사전학습 단계에서 TransE 식 margin loss 로 entity / relation 임베딩을 얻고, 그 임베딩을 audience expansion 단계의 GCN initial state 로 넘긴다. seed 가 적은 캠페인에서도 사전학습의 prior 가 작동해 sample efficiency 가 개선된다. Ablation Figure 1 이 보여주는 가장 큰 효과는 사실 *Brand C (seeds 1,654) 에서 PKGE 가 없을 때 Recall 이 가장 크게 무너진다* 는 것이다.
- **Knowledge query 기반 GCN aggregation.** message passing 에서 평균 / attention 의 입력을 *이웃 노드 임베딩 $\mathbf{h}\_u$* 이 아닌 *knowledge query $Q\_{(u,r,v)} = \mathbf{h}\_u + \mathbf{h}\_r$* 으로 두는 것이 본 논문의 모델 측 차별점. TransE 의 기하학에서 $\mathbf{e}\_u + \mathbf{e}\_r$ 은 *tail entity $v$ 의 근방* 으로 평행이동한 지점이므로, 이 점을 모아서 평균하면 destination $v$ 와 *관계 $r$ 로 닿아 있는 head 들* 의 위치 정보가 직접 모인다. 단순 neighbor aggregation 보다 relation-aware 한 신호가 된다.
- **세 가지 aggregator 의 동시 검증.** Mean, Attention1 (inner product, KGCN 스타일), Attention2 (concat + LeakyReLU, GAT 스타일) 의 셋을 같은 실험으로 검증해 *어떤 aggregator 가 어떤 신호 환경에서 안정한가* 를 보여준다. 결론은 단순한 **Mean 이 가장 안정적이고 가장 자주 1등** — attention 메커니즘이 *KG 전반의 데이터 불균형* 때문에 lookalike 라는 task 에서는 잘 작동하지 않는다는 진단.
- **(리뷰어 관점) Industrial baseline 의 정직한 공개.** 비교군에 *현재 Rakuten 의 production 모델인 XGBoost 기반 Baseline TP* 를 포함하고, 그 모델이 어떤 feature 들 (demographic, points summary, point features, genre-level purchase history) 을 쓰는지 적시한다. Production 광고 시스템에서 학회 모델로 갈아끼울 때의 *delta* 가 어디서 오는지 비교적 솔직하게 드러난다.

## 관련 연구 / 배경 지식

이 절은 본문 §2 (related work) 와 §3.2 (PKGE) 의 배경을 합쳐 ML 일반에는 익숙하지만 *KG-기반 추천 / lookalike* 의 계보가 낯선 독자를 위해 짠다.

### Lookalike modeling 의 클래식 — 유사도, 행렬분해, classification

Audience expansion 의 가장 오래된 정통은 **similarity-based lookalike** (Ma et al., 2016) 다. seed user 의 feature vector 와 candidate user 의 feature vector 사이 cosine / Pearson / Jaccard 등을 계산해 상위 N 명을 뽑는 단순한 retrieval. 이 방식의 가장 큰 약점은 *feature 공간이 sparse / heterogeneous 일 때 cosine 자체가 의미를 잃는 것*. 그 다음 세대가 *matrix factorization* (Kanagal et al., 2013) 으로 user × ad 행렬을 latent factor 로 분해해 그 잠재 공간에서 cosine 을 보는 형태. 추가 줄기로 *logistic regression based lookalike* (Qu et al., 2014 의 특허) — 본 논문의 LRLM 베이스라인이 정확히 이 계열이다 — 가 있다.

다음 큰 도약이 *deep learning 기반 lookalike*. 대표적으로 (1) Tencent WeChat 의 RALM (Liu et al., 2019, KDD) — attention 으로 seed user pool 의 *seed-side representation* 을 만든 뒤 candidate user 와 inner product, (2) WeChat 의 MetaHeac (Zhu et al., 2021, KDD) — meta-learning 으로 *수많은 small-scale 캠페인을 공동 학습* 한 뒤 새로운 캠페인에 빠르게 fine-tune. 본 논문의 MetaHeac 베이스라인이 이 SOTA 다.

### Knowledge graph 임베딩 — TransE 의 기하학

본 논문이 사전학습으로 가져오는 PKGE 는 사실상 **TransE** (Bordes et al., 2013, NeurIPS) 의 변주다. TransE 는 KG triple `(head, relation, tail)` 을 $\mathbb{R}^d$ 의 벡터로 embedding 할 때, *head + relation $\approx$ tail* 이 되도록 학습한다. 점수함수는

$$
f(u, r, v) = \lVert \mathbf{e}_u + \mathbf{e}_r - \mathbf{e}_v \rVert_{1,2}
$$

이고, 학습은 *positive triple* (실제 존재) 과 *negative triple* (랜덤 변형) 사이의 margin 손실로 진행된다.

$$
\mathcal{L}_{\text{pre}} = \sum_{(u,r,v) \in \mathcal{E}} \sum_{(u', r, v') \in \mathcal{E}^{-1}} \left[\gamma + f(u, r, v) - f(u', r, v')\right]_{+}
$$

여기서 $\gamma$ 는 margin, $[\cdot]\_+ = \max(0, \cdot)$ 다.

TransE 의 *기하학적 직관* 은 핵심이다 — `(Rakuten Books, same-marketplace, Rakuten Travel)` 같은 triple 을 학습할 때, **$\mathbf{e}\_{\text{Books}} + \mathbf{e}\_{\text{same-marketplace}}$ 의 좌표가 $\mathbf{e}\_{\text{Travel}}$ 근처로 평행이동** 한다. 그래서 본 논문이 정의하는 **knowledge query $Q\_{(u, r, v)} = \mathbf{e}\_u + \mathbf{e}\_r$** 은 *"head $u$ 가 relation $r$ 로 어떤 tail 에 닿는지" 를 묻는 질의* 의 좌표 표현이라고 해석할 수 있다. 본 논문의 GCN aggregation 이 이 query 점들을 모은다는 발상이 그래서 자연스럽다.

### GCN 과 KG-GNN — KGCN, KGAT

본 논문의 두 번째 단계인 GCN 부분의 직접 조상은 두 갈래다.

- **GCN** (Kipf & Welling, ICLR 2017): symmetric Laplacian 으로 이웃 노드 feature 를 평균하고 nonlinear activation 으로 변환. 그러나 GCN 자체는 *relation 정보를 모른다* — multi-relational 그래프에는 그대로 못 쓴다.
- **KGCN** (Wang et al., WWW 2019): KG triple 위에서 GCN 을 굴린다. relation $r$ 별로 다른 attention weight 를 두고 destination 노드와의 *inner product* 로 attention coefficient 를 정한다. AudienceLinkNet 의 Attention1 (Eq. 6) 이 이 KGCN attention 의 변형이다.
- **KGAT** (Wang et al., KDD 2019): KGCN 의 더 진보된 후속으로, attention 을 학습 가능한 파라미터로 두고 entity / relation 임베딩과 함께 end-to-end 학습.

**AudienceLinkNet 이 이 줄기에서 분기하는 점은 두 가지.** (1) Aggregation 의 입력이 *neighbor entity 임베딩* 이 아닌 *knowledge query 합 $\mathbf{e}\_u + \mathbf{e}\_r$* 인 것. (2) Update rule 에서 **nonlinear activation 을 빼고** linear transformation 만 적용하는 것 — 이건 SGC (Simplified GCN, Wu et al., ICML 2019, ref [41]) 의 발상이다. nonlinear 가 없으니 layer 깊이가 늘어도 oversmoothing 이 덜하고 계산도 가볍다는 이점.

### Homophily 가정

본 논문이 §2 의 끝에서 짧게 언급하는 *homophily* 는 그래프에서 *연결된 노드 쌍이 비슷한 속성을 가질 확률이 높다* 는 가정이다. lookalike 가 작동하는 가장 근본적인 전제이기도 하다 — seed user 의 *그래프 이웃* 이 seed user 와 비슷한 행동을 한다면, GCN smoothing 으로 그 이웃들의 표현이 seed user 의 표현 쪽으로 끌려오고, 그 끌려온 영역에서 lookalike candidate 를 찾을 수 있다는 논리.

## 방법 / 아키텍처 상세

본 논문의 핵심을 두 단계로 본다 — 사전학습 PKGE, 그리고 그 위에서 굴리는 audience expansion GCN.

### 문제 정식화

$m$ 명의 seed user $S\_u = (u\_1, u\_2, \ldots, u\_m)$ 가 주어졌을 때 $n \gg m$ 명의 유사 user 를 찾는다. Knowledge graph $G$ 는 entity 집합 $E$ 와 triple 집합 `(u, r, v)` 로 구성된다. user 와 item, 그리고 user 의 demographic / 행동 속성, item 의 메타데이터 (Rakuten 의 "genre" 계층 같은 것) 모두가 entity 로 들어간다.

### PKGE 사전학습

목표는 entity embedding $\mathbf{e}\_e = f\_{\text{pre}}(G; \theta\_{\text{pre}})$ 를 학습하는 것. 점수함수는 위에서 본 TransE 식

$$
f(u, r, v) = \lVert \mathbf{e}_u + \mathbf{e}_r - \mathbf{e}_v \rVert_{1,2}
$$

이고, 손실은 margin loss. positive triple 은 KG 에 실제 존재하는 user-item 상호작용 (`(user, buy, item)`, `(user, click, item)`, `(user, favorite, item)` 등) 으로 만들고, negative triple 은 head 또는 tail 을 랜덤 entity 로 치환해 만든다. 학습이 끝나면 *모든 entity 와 모든 relation 에 임베딩이 하나씩* 붙는다.

여기서 본 논문이 *knowledge query* 라는 이름을 명시적으로 부여한다. 임의의 head $u$ 와 relation $r$ 에 대해 $\mathbf{e}\_u + \mathbf{e}\_r$ 은 *"$u$ 와 $r$ 로 연결된 tail 후보들의 근방으로 평행이동된 점"* 이다. TransE 의 학습 객체 자체가 이 점이 실제 tail 과 가깝도록 강제하므로, 이 점을 "$u$ 에서 $r$ 로 뻗는 질의의 좌표" 로 부를 수 있다는 것이 본 논문의 표현이다.

### Audience Expansion GCN — Aggregator

PKGE 가 끝난 뒤, entity 임베딩이 GCN 의 layer 0 initial state 가 된다. message passing 의 layer $l$ 에서, source $u$ 에서 destination $v$ 로 relation $r$ 을 따라 흐르는 message 는

$$
Q^{l-1}_{(u, r, v)} = \mathbf{h}^{l-1}_u + \mathbf{h}^{l-1}_r
$$

로 정의된다. 즉 *현재 layer 의 source 임베딩 + relation 임베딩* 을 합한 것이 한 message 단위. destination $v$ 가 받는 *모든* message 를 모아 aggregator 가 하나의 메시지 벡터 $\mathbf{m}^l\_Q$ 로 합친다.

#### Mean aggregator

가장 단순. destination 의 이웃 source 들로부터 오는 모든 knowledge query 의 평균.

$$
\mathbf{m}^l_Q = \text{MEAN}\left( \left\{ Q^{l-1}_{(u, r, v)} \;\middle|\; u \in \mathcal{N}(v),\; r \in \mathcal{R}(u, v) \right\} \right)
$$

$\mathcal{N}(v)$ 는 $v$ 의 이웃 노드 집합, $\mathcal{R}(u, v)$ 는 $u$ 와 $v$ 사이 relation 집합 (Rakuten KG 에서는 한 쌍 사이에 여러 종류의 상호작용이 동시에 있을 수 있음).

#### Attention1 aggregator (KGCN 스타일, inner product)

각 message 의 weight 를 *그 message 와 destination 임베딩의 inner product* 로 정한다.

$$
e_{(u, r, v)} = \left( Q^{l-1}_{(u, r, v)} \right)^\top \mathbf{h}^{l-1}_v
$$

정규화는 softmax,

$$
\alpha_{(u, r, v)} = \frac{e_{(u, r, v)}}{\sum_{k \in \mathcal{N}(v)} e_{(k, r, v)}}, \qquad \mathbf{m}^l_Q = \sum_{u \in \mathcal{N}(v)} \alpha_{(u, r, v)} Q^{l-1}_{(u, r, v)}
$$

벡터 공간에서 *destination 과 가까운 query 일수록 큰 weight* 가 붙는 형태. KGCN 의 attention 메커니즘과 거의 같다.

#### Attention2 aggregator (GAT 스타일, concat + LeakyReLU)

GAT (Veličković et al., ICLR 2018) 의 attention 을 그대로 옮긴 것에 가깝다.

$$
e_{(u, r, v)} = \text{LeakyReLU}\left( \mathbf{a}^\top \left[ Q^{l-1}_{(u, r, v)} \;\big\Vert\; \mathbf{h}^{l-1}_v \right] \right)
$$

$\mathbf{a} \in \mathbb{R}^{2H}$ 는 학습 가능한 attention 파라미터, $H$ 는 임베딩 차원, $\Vert$ 는 concatenation. Attention1 과 달리 *학습되는 파라미터로* attention coefficient 를 정하므로 *데이터에서 더 적응적인* attention 이 가능 — 그러나 실험에서는 가장 불안정한 결과를 보였다.

### Audience Expansion GCN — Update

aggregator 가 만든 message $\mathbf{m}^l\_Q$ 와 destination 의 직전 layer 임베딩을 합쳐 새 임베딩을 만드는 단계.

$$
\mathbf{h}^l_v = W^l \left( \mathbf{h}^{l-1}_v + \mathbf{m}^l_Q \right) + \mathbf{b}^l, \qquad \mathbf{r}^l = W^l \mathbf{r}^{l-1} + \mathbf{b}^l
$$

같은 $W^l, \mathbf{b}^l$ 이 entity 와 relation 양쪽에 똑같이 적용된다는 점이 흥미롭다. 이건 *새 벡터 공간으로 옮긴 뒤에도 TransE 의 head + relation $\approx$ tail 관계가 유지되도록* 강제하는 효과가 있다. 그리고 위에서 짚었듯이 **nonlinear activation 이 없다** — SGC (Wu et al., 2019) 의 단순화 접근을 그대로 따른 셈.

### 학습 목표 / 손실 함수

audience expansion 단계의 최종 손실은 *user-item interaction* 의 positive / negative pair 위에서 정의된 margin loss.

$$
\mathcal{L}_{\text{final}} = \sum_{(\mathcal{U}, \mathcal{I}) \in \mathcal{P}} \sum_{(\mathcal{U}, \mathcal{I'}) \in \mathcal{P}^{-1}} \left[ \gamma + f(\mathbf{h}_{\mathcal{U}}, \mathbf{h}_{\mathcal{I}}) - f(\mathbf{h}_{\mathcal{U}}, \mathbf{h}_{\mathcal{I'}}) \right]_{+}
$$

여기서 $\mathcal{P}$ 는 (user, 양성 아이템) 쌍, $\mathcal{P}^{-1}$ 은 (user, 음성 아이템) 쌍. positive 는 실제 상호작용이 있었던 user-item 쌍, negative 는 그 user 가 한 번도 닿지 않은 아이템을 랜덤 추출.

해석: PKGE 단계와 똑같은 *margin 손실의 골격* 을 다시 한 번 — 단 이번엔 entity-relation-entity triple 이 아니라 user-item 쌍 위에서. PKGE 의 *상대적 거리 학습* 이 audience expansion 의 lookalike retrieval 까지 일관되게 이어진다는 점이 모델의 깔끔함.

추론 단계는 단순하다. AudienceLinkNet 이 끝나면 *모든 user 의 임베딩* 이 손에 들어온다. seed user 의 임베딩 평균 (또는 각 seed 와의 거리 합) 으로부터 *similarity threshold $T$* 안에 들어오는 모든 user 를 target prospect 로 출력한다. Threshold $T$ 의 값을 조절해 *몇 천 명 ∼ 몇 백만 명* 의 모든 캠페인 크기를 동일한 모델로 커버.

## 학습 데이터와 파이프라인

### Rakuten 내부 데이터셋 (Brand A∼E)

본 논문이 평가에 쓴 데이터는 Rakuten 의 매출 상위 5개 브랜드의 캠페인 데이터다. 사용자 정보는 익명화, 브랜드 이름은 코드명 (A∼E) 으로 통일.

- **Brand A, E** — vitamin / mineral / 스트레스 완화제 같은 *건강 보조 식품* 카테고리.
- **Brand B, D** — *뷰티 / 토일레트리* 카테고리.
- **Brand C** — *음료* 카테고리 (seeds 가 압도적으로 적음).

각 브랜드의 데이터는 seed user 와 train/val/test split 의 4 분할로 제공된다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/tab1-datasets.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: 데이터셋 통계. Brand A∼E 는 Rakuten 의 상위 5개 브랜드 (익명화) 이고, 마지막 열 Tencent 는 Tencent Ads 2018 공개 데이터셋. seed 수 1,654 (Brand C) ∼ 421,961 (Tencent) 까지 두 자릿수 차이가 난다."
   zoomable=true %}

### Tencent Ads 2018 공개 데이터셋

비교 가능성을 위해 *공개 데이터셋* 에서도 동일 실험. Tencent Ads 2018 competition 의 데이터셋으로, 421,961 명의 seed user 가 수백 개의 seed set 으로 흩어져 있다. user feature 14 개 (demographic + interest), 광고 task 별 categorical feature 6 개 (ad category, advertiser ID, campaign ID, product ID, product type, creative size). Rakuten KG 와 비슷한 구조로 가공하기 위해 *user → product → 기타 categorical feature* 의 hop 으로 그래프를 짠다.

### 모델 하이퍼파라미터

- 임베딩 차원 $d \in \\{50, 100, 150, 200, 250\\}$
- 학습률 $\in \\{0.001, 0.01, 0.1\\}$
- margin $\gamma \in \\{1, 5, 10\\}$
- 단일 NVIDIA Tesla V100 GPU
- PyTorch 1.8.2, Python 3.6
- grid search 로 브랜드별 최적 조합 탐색 (구체 값은 본 논문에 명시되지 않음)

### 베이스라인 4종

1. **Baseline TP** (XGBoost) — Rakuten 의 현재 production 모델. 4종 feature: (i) demographic (age, gender, region), (ii) points summary (Rakuten 포인트 적립 / 사용 누적량), (iii) point features (포인트 트랜잭션 detail — 온/오프라인 / 상점별), (iv) genre-level purchase history (Rakuten 의 "genre" 계층 위 구매 trend). Tencent 셋에서는 14 + 6 feature 그대로 XGBoost 에 투입.
2. **LRLM** (Qu et al., 2014 의 특허) — Logistic Regression 으로 *seed-like 확률* 을 회귀.
3. **PKGE** — 본 논문의 사전학습 단계만 떼어내서 user embedding 으로 직접 lookalike retrieval 한 결과 (즉 GCN 단계를 빼고 KG 임베딩 위에서만 검색).
4. **MetaHeac** (Zhu et al., 2021) — WeChat 에 배포된 meta-learning 기반 SOTA. 본 논문이 baseline 으로 두는 가장 어려운 대상.

## 실험 결과

평가지표는 셋 — **Precision, Recall, PR-AUC**.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/tab2-main-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 2: 6개 데이터셋 (Brand A∼E + Tencent) × 7개 모델 × 3개 지표 (Precision, Recall, PR-AUC). 굵게 표시된 값이 각 열의 best. AudienceLinkNet (mean) 이 가장 많은 best 를 가져가고, Brand E·Tencent 에서는 세 지표를 모두 1등 한다."
   zoomable=true %}

### 메인 결과 — 브랜드별

- **Brand A** — Precision 1등 AudienceLinkNet (attn1) 0.550 (Baseline TP 0.527, +2.3), Recall 1등 AudienceLinkNet (mean) 0.768 (Baseline TP 0.722, +4.6), PR-AUC 1등 MetaHeac 0.716 (AudienceLinkNet (mean) 0.712 으로 거의 동률).
- **Brand B** — Precision 1등 AudienceLinkNet (mean) 0.516 (Baseline TP 0.491, +2.5), Recall 1등 AudienceLinkNet (mean) 0.819 (Baseline TP 0.754, +6.5), PR-AUC 1등 AudienceLinkNet (attn1) 0.705.
- **Brand C (seed 1,654)** — Precision 1등 AudienceLinkNet (mean) 0.420 (Baseline TP 0.406), Recall 1등 AudienceLinkNet (attn1) 0.801 (Baseline TP 0.750, +5.1), PR-AUC 1등 AudienceLinkNet (attn2) 0.612. *seed 가 가장 작은 캠페인에서도 lookalike 성능이 그대로 유지된다* 는 점이 본 논문의 핵심 셀링 포인트.
- **Brand D** — Precision 1등 AudienceLinkNet (attn1) 0.629 (Baseline TP 0.598), Recall 1등 AudienceLinkNet (mean) 0.825 (Baseline TP 0.772, +5.3), PR-AUC 동률 1등 PKGE / AudienceLinkNet (attn2) 0.786.
- **Brand E** — AudienceLinkNet (mean) 이 세 지표 모두 1등. Precision 0.598 (Baseline TP 0.572), Recall 0.831 (Baseline TP 0.773, +5.8), PR-AUC 0.749.
- **Tencent (공개 데이터셋)** — AudienceLinkNet (mean) 이 Precision 0.334 (MetaHeac 와 동률), Recall 0.519 (Baseline TP 0.461, +5.8), PR-AUC 0.734 모두 1등. *Rakuten 도메인 외부에서도 일관되게 잘 작동한다* 는 외부 검증.

저자가 본문에 명시하는 요약 수치는 **Rakuten 5개 브랜드 평균 precision +4.06%, recall +7.18%** (AudienceLinkNet (mean) 대 Baseline TP).

### Aggregator 별 일관성

본 논문이 *Mean aggregator 가 가장 안정* 이라고 짚는 근거는 표를 가로로 봤을 때 드러난다. **AudienceLinkNet (mean) 은 6개 데이터셋 × 3개 지표 = 18 칸 중 11 칸에서 1등** (Tencent Precision 은 MetaHeac 와 동률 1등). Attention1 은 4 칸, Attention2 는 2 칸. 또 Brand E 와 Tencent 에서는 세 지표를 모두 sweep — 즉 *best-case 가 가장 많고 worst-case 가 가장 적은* aggregator 가 mean 이다.

저자의 해석은 두 가지. (1) Attention 의 weight 가 *knowledge query 의 분포에 민감한데*, Rakuten KG 의 *node 별 knowledge query 개수가 매우 불균형* (인기 user vs 신규 user 의 차이가 두 자릿수 이상) 이라 attention coefficient 의 분산이 폭발한다. (2) Attention2 의 attention parameter $\mathbf{a}$ 가 *PKGE 의 loss 가 아닌 final loss 로* 학습되기 때문에, lookalike retrieval 에 *최적화된 attention shape* 으로 수렴하기 어렵다.

## 결과 분석 / Ablation

본 논문이 보여주는 ablation 은 *한 가지뿐* — PKGE 사전학습을 제거했을 때의 Recall.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/fig1-pkge-ablation.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: PKGE 제거 ablation. y-axis 는 Recall. 5개 Rakuten 브랜드 모두에서 PKGE 가 없으면 Recall 이 떨어지지만, seed 가 가장 적은 Brand C 에서 가장 크게 무너진다 (약 0.80 → 0.74). seed 가 많은 Brand E 에서는 격차가 0.83 → 0.78 정도로 좁다."
   zoomable=true %}

여기서 읽어야 할 함의는 *seed 가 적을수록 PKGE 가 더 결정적* 이라는 것. 직관적이지만 정량적으로 확인됐다는 점이 의미가 있다. seed 1,654 의 Brand C 에서 GCN 단계를 그냥 *random initialized embedding* 으로 시작하면, GCN 이 충분한 signal 을 모을 만큼의 *밀도* 가 없다. PKGE 가 *전 서비스 KG 의 정보를 그래프 prior 로 주입* 하기에 cold-start 가 완화되는 구조.

**하지만 누락된 ablation 이 더 많다.** 이게 본 리뷰의 가장 큰 비판점이기도 하다 (다음 절). 본 논문이 가장 자랑하는 *knowledge query aggregation* 의 효과를 분리한 ablation 이 없다. *knowledge query 대신 neighbor entity 임베딩만 aggregation* 한 경우 (즉 KGCN baseline) 대비 본 모델이 얼마나 더 나은가? 또 *update rule 에서 nonlinear activation 을 빼는 SGC 식 단순화* 의 효과는 얼마인가? 본 논문은 이 두 차별점을 본문에서 강조하면서 정량 검증은 보여주지 않는다.

### Brand C 에서의 작은 성능 격차

또 한 가지 짚을 점 — Brand C 의 *절대 성능* 자체가 다른 브랜드보다 한참 낮다. AudienceLinkNet (mean) 의 Precision 0.420 / Recall 0.799 vs Brand B 의 0.516 / 0.819. *seed 가 작은 캠페인에서 lookalike 가 어렵다* 는 가장 본질적인 어려움은 여전히 남아 있고, AudienceLinkNet 이 그것을 *완전히* 해결한 것은 아니다 — Baseline TP 대비로는 우위지만, 절대값으로는 산업 도메인에서 더 끌어올릴 여지가 분명하다.

### Tencent 공개 셋에서의 도메인 격차

Rakuten 셋에서 Precision 0.5 ∼ 0.6 가 정상인데 Tencent 셋에서는 *모든 모델이 Precision 0.3 안팎*. 단순히 task 가 어렵다는 것뿐만 아니라, Tencent KG 의 *밀도와 구조* 가 Rakuten 의 cross-service KG 와 다르다는 점이 크다. Tencent 의 그래프는 user → product → categorical feature 의 *한 줄짜리 사슬* 인 반면, Rakuten 은 *70여 개 서비스가 다 entity 로 연결된* 별 그래프에 가깝다. 본 논문의 가치 제안 — *cross-service KG* — 이 정작 *cross-service 가 아닌* Tencent 셋에서는 절반만 발휘된다는 해석도 가능.

## 한계와 비판적 평가

저자가 명시한 한계와 리뷰어가 추가로 보는 한계를 함께 짚는다.

### 저자가 인정한 한계

- **Seed 500 미만 캠페인** 에서는 AudienceLinkNet 도 여전히 어려움. PKGE 사전학습으로 완화되긴 하지만 *해결되진* 않는다.
- **Seed pool 의 30% 이상이 cold / 신규 user** 인 경우 성능이 떨어진다. 신규 user 는 KG 위에서 *edge 가 거의 없으므로* 그 위치를 GCN smoothing 으로 잘 잡지 못함.

### 리뷰어 관점에서 추가되는 한계

- **Ablation 의 부족.** 본 논문이 자기 contribution 으로 강조하는 *knowledge query aggregation (vs. neighbor entity aggregation)* 의 효과를 분리한 ablation 이 없다. PKGE 만 빼본 것이 ablation 의 전부. KGCN / KGAT 와 같은 *동일 KG-GNN 패밀리* 의 베이스라인이 빠진 것도 아쉽다. MetaHeac (meta-learning 기반) 은 비교했지만, KG 기반의 *직계 친척* 과는 직접 붙은 결과가 없다.
- **모델 차별점이 *industrial scaling* 에 가깝다는 점.** Knowledge query 라는 아이디어 자체는 *TransE 의 $\mathbf{e}\_u + \mathbf{e}\_r$ 을 메시지로 본다* 는 작은 치환이고, *학술적 새로움* 보다는 *대규모 KG 위에서 작동시키는 엔지니어링적 의미* 가 더 크다. SIGIR short paper 분량 안에서 이 trade-off 를 두는 것 자체는 합리적이지만, *왜 이 치환이 oversmoothing 을 정말 완화하는가* 의 분석이 빈약하다 — homophily 가정 + SGC 단순화 + knowledge query 라는 세 변수가 동시에 들어가 있어서 효과의 출처를 분리하기 어렵다.
- **Attention2 의 불안정성에 대한 진단의 부족.** "데이터 불균형 때문" 이라는 한 줄 설명이 전부. 어떤 노드 분포 / 어떤 relation 분포에서 특히 불안정한지에 대한 정량 분석이 없다. 또 attention coefficient 의 *학습 곡선* / *분산* 같은 진단도 없다.
- **공개 코드 / 데이터의 부재.** AudienceLinkNet 자체의 코드 공개가 없고 Rakuten 데이터도 비공개라 *재현* 이 어렵다. Tencent 셋에서의 재현은 외부 연구자가 가능하겠지만, 본 논문이 강조하는 *cross-service KG 의 효과* 는 Rakuten 외부에서는 검증할 수 없다.
- **메인 결과 표의 통계적 유의성 미보고.** 0.527 vs 0.541 같은 작은 차이가 *seed/data split 의 randomness 안에서 진짜 차이* 인지에 대한 std 또는 p-value 가 없다. Brand C 처럼 test set 이 4,387 명밖에 안 되는 경우 작은 흔들림에도 결과가 뒤집힐 가능성이 있다.
- **"Baseline TP" 자체의 feature 가 풍부함.** Rakuten 의 production XGBoost 가 *demographic + points + transaction + genre purchase* 의 4종 feature 를 모두 쓰는, *이미 강한* baseline 이라는 점은 흥미롭다. 즉 본 논문이 누른 것은 *bare cosine similarity baseline* 이 아니라 *production-grade gradient boosting* 인 셈으로, 이 베이스라인 위에서 *4∼7%* 의 개선이 갖는 산업적 의미는 분명히 크다. 다만 이 결과를 *학술적 novelty* 의 척도로 읽을 때는 주의가 필요.

## 시사점 / Takeaways

- **Cross-service KG 가 industrial lookalike 의 prior 로서 정말 효과적이다.** Rakuten 같은 *수십 개 서비스를 거느린 super-app* 의 가장 큰 자산은 *한 user 의 행동을 여러 도메인에서 본다* 는 것인데, 그걸 *한 장의 KG 로 묶어서 사전학습한 prior* 가 seed 가 작은 캠페인에서 가장 큰 우위를 만든다. 이 관점은 *Naver / Kakao / Coupang* 같은 한국의 multi-service platform 에도 그대로 옮겨갈 수 있는 패턴이다.
- **GCN message 의 단위를 노드가 아니라 "TransE knowledge query" 로 두는 발상.** 작은 치환이지만, *relation-aware 한 신호를 손실 없이 전파* 하면서 *기존 KGCN 보다 더 안정* 적이라는 결과가 인상적이다. KG-GNN 의 design space 에서 *message 의 단위 자체* 가 한 차원의 hyperparameter 임을 다시 상기시킨다.
- **Mean aggregator 의 재발견.** attention 이 *언제나 더 낫다* 가 아니라는 점을 다시. *데이터 분포가 매우 불균형한 산업 KG* 에서는 attention coefficient 의 분산이 폭발해 오히려 단순 평균이 안정적. 이건 GraphSAGE (Hamilton et al., 2017, ref [7]) 이후로 반복되는 교훈인데, KG 기반 lookalike 에서도 동일하게 성립한다는 한 증거.
- **광고용 lookalike 의 벤치마크 부족 문제.** Tencent Ads 2018 셋이 유일한 공개 데이터셋이고 그마저도 *cross-service* 가 아니다. *재현 가능한 cross-service lookalike 벤치마크* 가 산업적으로 만들어진다면, 본 논문 같은 KG 기반 접근의 학술적 발전이 훨씬 빨라질 것이다.
- **Cold-start 와 신규 user 는 여전히 미해결.** 본 논문조차 "seed 의 30% 이상이 신규면 성능 저하" 라고 인정한다. 신규 user 의 *KG 위 위치* 를 *demographic / 외부 신호* 로 부트스트랩하는 hybrid 방식이 필요하다는 후속 질문이 남는다.

## 참고 자료

- 논문 (ACM DL): <https://doi.org/10.1145/3626772.3661363>
- SIGIR 2024 proceedings entry: <https://dl.acm.org/doi/10.1145/3626772.3661363>
- 저자 그룹의 직전 작업 (precursor): [Rahman et al., SIGIR 2023, *Exploring 360-Degree View of Customers for Lookalike Modeling*](https://arxiv.org/abs/2304.09105)
- 본 논문 자체의 공개 코드는 없음 (Rakuten 내부 production 모델)

## 더 읽어보기

- **[Exploring 360-Degree View of Customers for Lookalike Modeling](https://arxiv.org/abs/2304.09105)** (Rahman et al., SIGIR 2023) — 같은 Rakuten RIT 팀의 직전 작업. AudienceLinkNet 의 *360도 customer view* 발상의 출발점.
- **[Learning to Expand Audience via Meta Hybrid Experts and Critics for Recommendation and Advertising](https://arxiv.org/abs/2105.14688)** (Zhu et al., KDD 2021) — WeChat 의 MetaHeac. 본 논문의 가장 강한 베이스라인이자 meta-learning 기반 lookalike 의 SOTA. 수많은 작은 캠페인을 공동 학습하는 발상.
- **[Real-time Attention Based Look-alike Model for Recommender System](https://arxiv.org/abs/1906.05022)** (Liu et al., KDD 2019) — Tencent WeChat 의 RALM. seed pool 의 attention pooling 으로 *seed-side representation* 을 만드는 클래식.
- **[Knowledge Graph Convolutional Networks for Recommender Systems](https://arxiv.org/abs/1904.12575)** (Wang et al., WWW 2019) — KGCN. AudienceLinkNet 의 Attention1 (inner product attention) 의 직접 조상.
- **[Translating Embeddings for Modeling Multi-relational Data](https://proceedings.neurips.cc/paper/2013/file/1cecc7a77928ca8133fa24680a88d2f9-Paper.pdf)** (Bordes et al., NeurIPS 2013) — TransE 원본. 본 논문의 PKGE 사전학습의 점수함수 $f(u, r, v) = \lVert\mathbf{e}\_u + \mathbf{e}\_r - \mathbf{e}\_v\rVert$ 의 기원.
- **[Semi-Supervised Classification with Graph Convolutional Networks](https://arxiv.org/abs/1609.02907)** (Kipf & Welling, ICLR 2017) — GCN 원본. message passing 의 정통 표준.
- **[Simplifying Graph Convolutional Networks](https://arxiv.org/abs/1902.07153)** (Wu et al., ICML 2019) — SGC. nonlinear 활성을 제거해 *그래프 위의 선형 모델* 로 축약. AudienceLinkNet 의 update rule 에 그대로 차용된 아이디어.

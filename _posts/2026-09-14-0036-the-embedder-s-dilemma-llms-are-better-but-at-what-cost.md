---
layout: post
title: "[논문 리뷰] The Embedder's Dilemma: LLMs Are Better, but at What Cost?"
date: 2026-09-14 08:37:52 +0900
description: "MTEB(LLM)의 품질·비용 비교와 재순위화 실험을 읽고, 감독 정보·추론 예산·집계 지표의 한계를 짚는다."
tags: ["text-embeddings", "retrieval", "benchmark", "large-language-models", "inference-cost", "reranking"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig1-cost-performance.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/
en_url: /en/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Adnan El Assadi, Niklas Muennighoff, Jinhyuk Lee (Harvard University · Stanford University · Independent Researcher) |
| 학회 | COLM · 2026 · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| arXiv 또는 DOI | [2608.12875](https://arxiv.org/abs/2608.12875) |
| Code | [embeddings-benchmark/embedders-dilemma](https://github.com/embeddings-benchmark/embedders-dilemma) |
| 데이터 | MTEB(LLM) 37개 과제; 추가 재순위화 실험은 BRIGHT 7개·BEIR 5개 과제 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-09-14 |

## TL;DR

- 10개 LLM과 26개 embedding 모델을 비교한 MTEB(LLM)에서 Gemini 3.1 Pro는 77.6, Octen-8B는 77.2다. 이 작은 차이만으로 embedding 파이프라인을 교체할 근거는 약하다.
- 논문이 산정한 전체 벤치마크 1회 비용은 각각 154.14 USD와 약 0.108 USD다. 보고된 1,431배는 LLM API 요금과 embedding의 H100 처리량 추정을 비교한 값이다.
- 분류는 라벨이 있는 kNN embedding 파이프라인이, 검색은 질의와 문서를 함께 읽는 LLM이 유리했다. 단, 검색 corpus는 82–415개 문서이며 분류의 감독 정보도 서로 다르다.
- BRIGHT에서는 embedding 검색 뒤 LLM 재순위화가 도움이 됐지만, BEIR에서는 가장 강한 embedding 단독 구성이 더 좋았다. 추론 축소도 모델마다 효과가 달랐다.
- 실무적으로 유용한 메시지는 작업별 역할 분담이다. 다만 집계 가중치, pair classification 지표, few-shot 기준값의 불일치는 원문과 공개 코드를 함께 읽어야 드러난다.

## 소개 (Introduction)

검색 파이프라인을 만들 때 embedding 모델은 오랫동안 자연스러운 출발점이었다. 문서를 벡터로 바꾸어 저장하고, 사용자가 질문하면 가까운 벡터를 찾는다. 분류에서는 이미 라벨이 붙은 예문과 비교하고, 군집화에서는 비슷한 벡터를 묶는다. 결과가 나오는 과정은 단순하지만, 문서가 많고 요청이 반복될수록 이 단순함이 강력한 장점이 된다. 문서의 계산 결과를 저장해 다음 질문에서도 다시 쓸 수 있기 때문이다.

반면 LLM은 문서와 질문을 직접 읽고 관련성을 설명할 수 있다. 문장 두 개가 비슷한지, 고객 문의가 어느 범주인지, 어떤 문서가 질문의 답을 담고 있는지도 자연어 지시로 처리한다. 그렇다면 별도 embedding 모델, 벡터 저장소, 과제별 분류기를 유지할 이유가 줄어드는 것처럼 보인다. 특히 표면적인 단어 일치보다 문맥의 해석이 중요한 검색에서는 이 기대가 설득력 있다. 문제는 한 번의 멋진 답변과 지속적으로 운영할 수 있는 시스템 사이에 비용과 처리량이라는 간격이 있다는 점이다.

El Assadi et al.의 [The Embedder’s Dilemma](https://arxiv.org/abs/2608.12875)는 이 간격을 실험 대상으로 삼는다. 새로운 네트워크나 학습 기법을 제안하는 대신, 같은 평가 데이터를 서로 다른 배포 파이프라인으로 풀고 품질·비용·처리량을 함께 비교한다. 제목의 “LLMs Are Better”를 모든 작업에서 LLM이 우월하다는 뜻으로 읽으면 논문의 실제 결론과 멀어진다. 읽을 가치는 오히려 최고 점수가 비슷한 시스템들이 언제 서로 다른 선택이 되는지 보여준다는 데 있다.

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig1-cost-performance.png" class="img-fluid rounded z-depth-1" caption="Figure 1. 전체 모델의 비용–성능 관계. 가로축은 벤치마크 1회 비용의 로그 척도다. 원 논문의 그림을 여백 조정하여 발췌했다." zoomable=true %}

## 핵심 기여 (Key Contributions)

- **동일한 평가 부분집합을 공유하는 비교 틀:** MTEB에서 가져온 37개 과제를 다섯 범주로 구성하고, embedding과 생성형 LLM이 같은 held-out 데이터를 풀도록 했다.
- **품질과 추론 비용을 함께 공개:** LLM의 입력·캐시·출력·추론 토큰과 embedding의 GPU 처리량을 연결해 비용–성능 관계를 제시했다.
- **추가 추론의 효용을 별도로 검증:** 기본 reasoning 설정을 줄였을 때 검색 성능과 생성 토큰 수가 어떻게 바뀌는지 여러 모델 계열에서 살폈다.
- **실제 검색 구조에 가까운 보완 실험:** 전체 corpus를 프롬프트에 넣는 방식 외에, 먼저 검색한 후보를 cross-encoder 또는 LLM으로 다시 정렬하는 구성을 비교했다.

첫 기여의 “동일함”은 평가 샘플을 뜻한다. 두 방식이 학습 정보, 입력 형식, 계산 예산까지 같다는 뜻은 아니다. 이 구별을 유지해야 이후의 성능 차이를 정확하게 해석할 수 있다.

## 관련 연구 / 배경 지식

### Text embedding과 생성형 LLM

텍스트 embedding은 문장의 의미를 고정 길이 벡터로 표현한다. 검색에서는 질문과 문서를 각각 인코딩한 뒤 코사인 유사도로 순위를 정한다. 여기서 두 입력을 독립적으로 처리한다는 특징 때문에 bi-encoder라고 부른다. 문서 벡터를 미리 계산할 수 있으므로, 질문이 올 때마다 모든 문서를 언어 모델에 다시 읽힐 필요가 없다.

이 논문의 embedding 그룹에는 작은 encoder뿐 아니라 LLM을 기반으로 만든 모델도 들어간다. E5-Mistral이나 GritLM이 예다. 따라서 비교 축은 “작은 BERT 대 큰 Transformer”가 아니다. <strong>추론 시 벡터를 출력해 비교하는가, 텍스트·점수·문서 ID를 생성하는가</strong>가 구분 기준이다. [GritLM](https://arxiv.org/abs/2402.09906)처럼 생성과 표현 학습을 함께 다루는 모델도 벡터를 사용하는 평가에서는 embedding 쪽으로 분류된다.

### STS와 Retrieval

의미적 텍스트 유사도, 즉 STS는 두 문장이 얼마나 비슷한 의미인지 묻는다. 검색은 어떤 문서가 질문 해결에 도움이 되는지 묻는다. 둘은 자주 겹치지만 동일하지 않다. 예를 들어 질문의 표현을 반복하는 문서보다, 다른 용어로 쓰였더라도 필요한 규칙이나 근거를 제공하는 문서가 더 유용할 수 있다. 질의와 후보 문서를 함께 읽는 모델은 이런 관계를 판단할 여지가 있다.

[MTEB](https://arxiv.org/abs/2210.07316)는 embedding 평가를 다양한 작업으로 확장한 기반이다. [BRIGHT](https://arxiv.org/abs/2407.12883)는 표면적인 유사성만으로 풀기 어려운 검색을 강조한다. [LOFT 연구](https://arxiv.org/abs/2406.13121)는 긴 context에 corpus 전체를 넣어 검색을 수행하는 접근을 다룬다. 이번 논문은 이 흐름들을 품질과 비용이라는 같은 좌표에서 비교한다. 이 배경 때문에 검색 결과를 STS 점수의 연장선으로만 읽지 않는 것이 중요하다.

## 방법 / 아키텍처 상세

### 1. MTEB(LLM) 평가 구성

저자들은 원래 MTEB 과제에서 seed 42로 고정한 평가 부분집합을 만들었다. 일부 과제는 다국어이며, 데이터셋 revision도 고정해 공개한다. 비용이 큰 생성형 평가를 가능하게 하고, 짧은 context를 가진 모델도 같은 검색 corpus를 읽게 하려는 설계다. 따라서 여기의 77.6점이나 77.2점을 일반 MTEB leaderboard 점수와 직접 비교하면 안 된다. 과제 이름이 비슷하더라도 샘플과 평가 구성이 다르기 때문이다.

작업마다 “정답을 얻는 절차”도 달라진다. 아래 표는 논문 §3.2와 부록 I의 핵심을 정리한 것이다. Pair classification은 논문에 AP와 accuracy가 함께 등장하지만, 공개 집계 코드는 공통 비교를 위해 `similarity_accuracy` 또는 `max_accuracy`를 선택한다. 따라서 아래에서는 accuracy 기반 비교라는 구현상의 사실도 함께 표시한다.

| 범주 | 과제 수 | Embedding 파이프라인 | LLM 파이프라인 | 주요 평가 |
|------|------:|------|------|------|
| Classification | 8 | 라벨이 있는 train embedding에 대한 kNN | 라벨 목록과 지시를 이용한 zero-shot 분류 | Accuracy |
| STS | 10 | 두 벡터의 코사인 유사도 | 과제의 원래 척도에 맞는 수치 생성 | Spearman 상관계수 |
| Clustering | 9 | 문서 벡터에 k-means 적용 | 문서들과 정답 군집 수를 제공하고 군집 ID 생성 | V-measure |
| Pair classification | 4 | 유사도 및 threshold sweep | 쌍별 이진 판단 | 공개 집계 코드에서는 accuracy |
| Retrieval | 6 | 질문·문서 벡터의 코사인 순위 | 전체 corpus와 질문을 읽고 문서 ID 순위 생성 | Recall@1 |

LLM 결과는 JSON과 Pydantic schema로 검증한다. 허용되지 않은 라벨이나 잘못된 JSON이면 수정 지시를 붙여 샘플당 최대 두 번 재시도한다. 최종 검증 실패율은 0.3% 미만으로 보고하며, 끝내 실패한 샘플은 오답으로 처리한다. 이 절차도 배포 파이프라인의 일부다. 생성형 모델은 답의 의미뿐 아니라 출력 형식을 지키는 능력도 요구받는다.

### 2. kNN과 zero-shot 분류

Embedding 모델은 학습 분할의 텍스트를 벡터로 만들고 정답 라벨과 함께 보관한다. 새 문장이 들어오면 가까운 예문의 라벨을 이용해 분류한다. 반면 기본 LLM 설정은 예문 없이 라벨 이름과 과제 설명을 받는다. 두 방식의 차이는 자연어 이해력만으로 설명할 수 없다. 한쪽은 해당 데이터셋의 라벨 경계를 실제 예문으로 관찰하고, 다른 쪽은 라벨의 언어적 의미로 경계를 추정한다.

이 차이는 Banking77처럼 세부 의도가 많은 과제에서 특히 중요하다. “카드가 어디 있는지 알고 싶다”는 표현이 분실 문의인지 배송 문의인지 결정하려면, 일반 상식뿐 아니라 그 서비스의 분류 관례가 필요하다. kNN이 유리하다는 결과는 그 관례를 참조할 수 있는 시스템이 강하다는 증거다. 라벨 데이터를 똑같이 제공하고 충분히 학습시킨 LLM의 성능 상한까지 보여주는 실험은 아니다.

### 3. Bi-encoder · Cross-encoder · LLM 검색

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig5-architectures.png" class="img-fluid rounded z-depth-1" caption="Figure 5. Bi-encoder, cross-encoder, LLM listwise reranker, corpus-in-context의 비교. 빨간 영역은 질의와 문서 사이의 상호작용을 나타낸다. 원 논문에서 발췌." zoomable=true %}

Bi-encoder는 질문과 문서를 독립적으로 인코딩한다. Cross-encoder는 질문과 후보 문서 하나를 같이 읽어 관련성 점수를 낸다. Listwise LLM reranker는 후보 목록을 함께 읽고 문서 순서를 출력한다. Corpus-in-context LLM은 이 목록을 전체 corpus까지 확장한다. 문서 사이의 비교 가능성이 커지는 대신, 질문이 바뀔 때 다시 수행해야 하는 계산도 많아진다.

첫 단계 embedding 검색이 만든 후보 수를 $k$라고 하자. Cross-encoder는 후보마다 질문–문서 쌍을 평가하며, listwise 모델은 선택된 후보들을 한 문맥에서 비교한다. 전체 corpus 크기를 $N$이라고 할 때 corpus-in-context는 모든 후보를 context 예산 안에 담아야 한다. 프롬프트 캐시는 반복 입력 비용을 줄이지만, 각 질문에 대한 관련성 판단과 출력 생성까지 없애지는 않는다. Figure 5의 “one pass”라는 도식은 이런 입력 범위의 설명이지, 생성형 순위 출력이 단 한 번의 네트워크 호출로 끝난다는 성능 보장은 아니다.

이 구조는 후보 생성과 최종 선택을 나누는 이유도 설명한다. 비싼 모델이 읽을 범위를 $N$에서 $k$로 줄이면 비용을 조절할 수 있다. 그러나 첫 단계가 정답 문서를 후보 안에 넣지 못하면 reranker도 복구할 수 없다. 따라서 후보 수를 줄이는 것은 무료 최적화가 아니다. 후보 recall과 재순위화 품질을 함께 평가해야 한다는 것이 이 구조에서 얻는 실무적 해석이다.

### 4. 비용·처리량 측정 조건

LLM 비용은 실제 API 사용 기록과 논문이 채택한 요금으로 계산한다. Embedding 비용은 H100에서 얻은 처리량에 GPU 시간당 가격을 적용한 추정이다. 따라서 전체 비용 표가 양쪽을 같은 GPU에서 돌린 영수증은 아니다. 같은 H100을 쓰는 통제 실험은 별도의 처리량 비교이며, 그때 평가한 생성형 모델은 Qwen3.6-27B와 Qwen3.6-35B-A3B 두 개다.

이 분리는 장점과 한계를 동시에 가진다. 실제 구매 방식에 가까운 API 대 로컬 실행 비교는 사용자가 지출할 비용을 생각하는 데 도움이 된다. 하지만 API 사업자의 가격 정책, GPU 이용률, 운영 오버헤드까지 모델 구조의 순수한 효율 차이로 해석해서는 안 된다. 리뷰에서 비용 배수와 처리량 배수를 따로 적는 이유도 여기에 있다.

## 평가 목표 / 비용 계산

이 논문은 새로운 학습 손실을 제안하거나 비교 모델을 공통 데이터로 재학습하지 않는다. 이미 학습된 모델들을 각자의 사용 방식으로 평가한다. 아래 첫 식은 embedding 검색을 이해하기 위한 표준 코사인 유사도이고, 뒤의 비용식은 논문 Equation 1을 줄바꿈해 옮긴 것이다.

$$
s(q,d)=\frac{f(q)^\top f(d)}{\lVert f(q)\rVert_2\lVert f(d)\rVert_2}.
$$

함수 $f$는 텍스트를 벡터로 바꾼다. 유사도가 높으면 두 벡터의 방향이 가깝다. 관련성에 필요한 조건이 이 벡터 공간에 잘 반영돼 있다면 값싼 벡터 비교만으로 충분하다. 반영되지 않은 조건을 읽어야 한다면 질의와 문서를 함께 처리하는 모델에 기회가 생긴다.

$$
\begin{aligned}
C_{\mathrm{LLM}}={}&(n_{\mathrm{in}}-n_{\mathrm{cached}})r_{\mathrm{in}}\\
&+n_{\mathrm{cached}}r_{\mathrm{cache}}\\
&+(n_{\mathrm{total}}-n_{\mathrm{in}})r_{\mathrm{out}}.
\end{aligned}
$$

여기서 $n$은 토큰 수, $r$은 토큰당 요금이다. 논문의 캐시 요금 가정은 일반 입력 요금의 10%다. 마지막 항은 사용자에게 보이는 답변과 내부 reasoning을 모두 포함한다. Gemini는 reasoning 토큰을 별도로 보고하고, OpenRouter 경로는 completion 수 안에 이미 포함하므로, completion에 reasoning을 무조건 더하면 중복 계산할 수 있다. 그래서 저자들은 전체 토큰에서 입력을 뺀 생성 토큰을 과금 기준으로 사용한다.

Embedding의 계산은 단위를 맞추어 다음처럼 쓸 수 있다. 처리량 $v$가 초당 토큰 수이고 $n\_{\mathrm{emb}}$가 인코딩할 전체 토큰 수라면,

$$
C_{\mathrm{emb}}=\frac{n_{\mathrm{emb}}}{3600v}\,r_{\mathrm{GPU}}.
$$

논문의 H100 가정은 시간당 2.49 USD다. 위 식은 토큰 수를 처리량으로 나누어 초를 얻고, 시간으로 바꾼 뒤 임대료를 곱한다. 부록 H.4의 인쇄된 식은 처리량을 tokens/hour라고 정의하면서 백만 단위 환산을 추가해 단위가 모호하다. 여기서는 §3.3의 취지와 공개 처리량 코드에 맞게 차원적으로 일관된 형태로 설명했다. 현재 서비스 가격을 안내하는 식이 아니라, 논문의 비용 추정을 이해하는 식이다.

## 평가 데이터와 파이프라인

새로운 학습 파이프라인은 없지만, 평가 데이터의 범위와 추론 설정은 결과를 결정한다. 분류의 train 데이터는 embedding kNN의 참조 집합이며, 모든 모델이 그 데이터로 fine-tuning됐다는 뜻은 아니다. Clustering에서는 LLM에 정답 군집 수를 주므로, 군집 수까지 발견해야 하는 완전한 비지도 문제와도 구별해야 한다.

| 요소 | 논문 설정 |
|------|------|
| 생성형 모델 | Gemini 3 계열 3개와 DeepSeek·Qwen·GLM·Kimi·MiniMax 계열 모델을 합친 10개 |
| Embedding 모델 | 118M–14B 범위의 26개; 작은 multilingual-E5부터 대형 decoder 기반 embedding까지 포함 |
| 평가 데이터 | MTEB 및 MMTEB에서 고정 seed 42로 만든 부분집합; Hugging Face revision 고정 |
| 분류 샘플 예 | IMDB 500개, Banking77 약 3천 개; 다국어 과제의 수는 언어별 합산 |
| STS·군집화 | STSBenchmark 500쌍, BIOSSES 100쌍; 군집화 과제는 표에 각각 1천 개 샘플로 보고 |
| Embedding 처리량 | H100 80GB, 본문 설명상 길이 512와 최대 배치 기준 |
| 생성형 처리량 | H100, vLLM, BF16, tensor parallel 1, 동시 요청 256개, 입력/출력 200/100토큰 |
| 모델 재학습 | 본 비교에서는 수행하지 않음 |

검색 corpus 크기는 별도로 볼 필요가 있다. AILAStatutes는 질의 50개와 문서 82개, FQuAD는 100개와 269개, HC3-Finance는 100개와 415개다. Consumer Contracts QA는 100개와 154개, PublicHealthQA는 100개와 172개, TwitterHjerne는 77개와 262개다. 작은 corpus 안에서의 읽기 능력을 비교하는 데는 적합하지만, 수백만 문서 중 답을 찾아야 하는 상황을 그대로 대표하지는 않는다. 출처는 부록 B의 Table 12다.

## 실험 결과

### MTEB(LLM): 전체 성능

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/tab1-main-results.png" class="img-fluid rounded z-depth-1" caption="Table 1. 10개 LLM과 상위 10개 embedding 모델의 결과. 점수는 0–100 척도이며 비용은 논문의 벤치마크 1회 기준이다. 원 논문에서 발췌." zoomable=true %}

Gemini 3.1 Pro의 Overall은 77.6, Octen-8B는 77.2, Qwen3-Embedding-8B는 77.0이다. 단, Overall은 각 범주 안에서 과제 점수를 평균한 다음 다섯 범주를 다시 평균한 값이다. 공개 `registry.category_scores`도 이 계산을 한다. 분류 8개와 검색 6개가 있더라도 최종 단계에서는 두 범주가 같은 비중을 갖는다. 서비스의 실제 요청 비율을 반영한 기대 정확도나 모든 샘플을 합친 accuracy가 아니다.

부록 A의 bootstrap은 10,000회 과제 단위 재표집으로 Pro와 Octen-8B의 차이를 검사한다. 논문은 차이 +0.3, 95% 신뢰구간 [−2.4, +3.1], p=0.85를 보고한다. Table 1의 표시값 차이는 +0.4다. 공개 코드를 보면 전자는 과제별 차이를 직접 평균하고, 후자는 범주 평균을 다시 평균하므로 집계 대상의 가중치가 다르다. 따라서 “+0.4점의 정확한 신뢰구간이 이것이다”라고 쓰기보다는, 저자들이 별도의 과제 평균 검정에서 뚜렷한 전체 우위를 확인하지 못했다고 읽는 것이 안전하다.

여기서 유의하지 않다는 말은 두 모델의 능력이 완전히 같다는 증명이 아니다. 선택한 과제 집합과 검정에서는 안정적으로 구분할 만큼 큰 평균 차이를 관찰하지 못했다는 뜻이다. 이 논문의 강한 관찰은 소수점 순위 자체보다 비슷한 점수를 얻는 비용이 크게 다르다는 사실이다.

### Classification · STS · Clustering · Pair Classification

분류의 최고 embedding인 SFR-2는 90.8, Pro는 85.2다. 표시 점수로 5.6점 차이다. STS에서는 Qwen3-Embedding-4B가 88.8, Pro가 88.5다. 군집화에서는 SFR-2 66.7과 Pro 66.6이 가깝다. Pair classification에서는 KaLM-12B가 87.1, Pro가 83.2이며, 이 범주의 LLM 최고 모델은 86.3의 Gemini 3 Flash다. Pro가 전체 최고 LLM이라고 해서 모든 범주의 최고 LLM인 것은 아니다.

원문의 범주별 통계 비교는 일관되게 Pro를 기준으로 삼는다. 분류 차이는 유의했고, STS·군집화·pair classification은 유의한 차이가 확인되지 않았다. Pair classification에서 3.9점이라는 표시 차이와 비유의 결과가 동시에 나오는 것은 모순이 아니다. 과제가 네 개뿐이고 과제별 차이도 일정하지 않기 때문이다. 다만 이 검정이 “각 범주의 최고 LLM과 최고 embedding 비교”는 아니라는 점을 기억해야 한다.

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig2-category-frontiers.png" class="img-fluid rounded z-depth-1" caption="Figure 2. 범주별 비용–성능 분포. 같은 전체 점수 뒤에도 분류와 검색의 성능 양상이 다르다. 원 논문에서 발췌." zoomable=true %}

### Retrieval: 6개 검색 과제

검색 평균은 Pro 64.5, Octen-8B 56.0으로 8.5점 차이다. 아래 표의 best embedding은 각 과제에서 최고인 모델을 따로 선택한 값이므로, 그 열을 평균해 Octen-8B의 56.0을 재현하려 해서는 안 된다. 서로 다른 모델의 최고 성능을 모은 비교와 한 모델의 전체 성능은 다른 질문에 답한다.

| 검색 과제 | Pro | 과제별 최고 embedding | 표시값의 차이 |
|------|------:|------:|------:|
| AILAStatutes | 14.5 | 23.2 | −8.7 |
| FQuAD | 92.0 | 72.0 | +20.0 |
| HC3-Finance | 71.0 | 67.0 | +4.0 |
| Consumer Contracts QA | 86.0 | 70.0 | +16.0 |
| PublicHealthQA | 90.0 | 85.0 | +5.0 |
| TwitterHjerne | 33.4 | 31.5 | +1.9 |

이 표는 부록 Table 11을 바탕으로 한다. Pro는 여섯 과제 중 다섯 개에서 모든 embedding 모델보다 높다. 다만 다른 LLM까지 포함한 과제별 1위라는 뜻은 아니다. 예를 들어 FQuAD에서는 Qwen3.6-27B가 96.0으로 Pro의 92.0보다 높다. 원문의 “다섯 과제에서 앞선다”는 문장은 비교 대상을 embedding으로 한정해야 정확하다.

법률이라는 도메인 이름만으로 승자를 정할 수도 없다. Consumer Contracts QA는 조항을 읽어 질문에 답할 수 있는 문서를 고르는 문제에서 Pro가 강하다. 반면 AILAStatutes에서는 Octen-8B가 앞선다. 저자들은 LLM이 넓게 연관된 법적 개념을 끌어와 관련 없는 조항까지 반환하는 사례를 제시한다. 같은 법률 텍스트라도 문맥 이해와 정밀한 조항 매칭이 요구하는 판단은 다를 수 있다. 다만 정성 사례만으로 전체 성능 차이의 원인을 확정할 수는 없다.

검색의 bootstrap 신뢰구간은 [+0.2, +16.8]이며 보정 전 p<0.05다. 그러나 다섯 범주 비교에 Bonferroni 기준 0.01을 적용하면 검색은 그 기준을 넘지 못한다. 분류는 보정 후에도 유의하다. 따라서 검색에서 관찰된 개선은 유망하지만, 모든 종류의 검색에서 확립된 보편적 우위라고 확대하기에는 근거의 범위가 좁다.

### 추론 비용

전체 벤치마크 비용은 Pro 154.14 USD, Octen-8B 약 0.108 USD로 보고된다. 1,431배는 저자들이 반올림 전 비용으로 산정해 제시한 비율이다. 이는 한 질의의 가격도, 단순히 모델 파라미터 수의 비율도 아니다. 이 벤치마크 구성 전체를 각 파이프라인으로 처리한 비용의 비교다.

비용 가정을 바꾼 부록 H.3에서도 큰 격차는 남는다. H100 on-demand 가정에서는 893배, 상용 embedding API를 100만 토큰당 0.10 USD로 가정하면 338배다. A100과 L4 시나리오는 처리량 저하를 각각 가정한 추정이므로, 그 GPU에서 모두 직접 실행한 결과로 소개해서는 안 된다. 정확한 배수보다, 저자들이 검토한 가격 조건들에서 비용 차이의 규모가 유지됐다는 관찰이 더 견고하다.

작은 모델도 주목할 만하다. Table 3의 Jina-v5-Nano는 73.9점과 0.010 USD, EmbeddingGemma-300M은 72.2점과 0.008 USD다. 최고 점수에 조금 못 미쳐도 처리해야 할 요청량이 크다면 의미 있는 후보가 된다. 물론 이 표만으로 어떤 모델이 자신의 한국어 데이터에 가장 좋은지 결정할 수는 없다. 자체 평가에서 필요한 품질을 충족하는 모델 중 비용이 낮은 것을 고르는 근거로 활용해야 한다.

### H100 처리량

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig7-throughput.png" class="img-fluid rounded z-depth-1" caption="Figure 7. H100 한 장에서의 처리량 비교. 생성형 측정 대상은 두 Qwen 모델이며, 모든 API 모델의 속도를 측정한 그림은 아니다. 원 논문에서 발췌." zoomable=true %}

두 Qwen 생성형 모델의 처리량은 약 5,400–5,900 tokens/s다. Embedding 모델은 Table 18에서 F2LLM-14B의 14,665부터 mE5-small의 4,314,796 tokens/s까지 보고된다. 논문의 2.5–736배 범위는 이런 모델 간 폭을 요약한다. 가장 큰 배수는 가장 빠른 작은 embedding 모델과의 비교이므로, 같은 정확도의 모든 모델에서 736배 빠르다는 의미가 아니다.

또한 tokens/s는 사용자 요청의 응답시간과 다르다. 동시 요청 256개를 처리하는 생성형 설정과 큰 배치의 embedding 실행에서 얻은 총 처리량을, 짧은 질문 하나의 지연시간으로 바꿀 수 없다. 입력과 출력 길이, 배치 크기, 문서 길이가 바뀌면 값도 달라진다. 그럼에도 문서를 반복적으로 받아 벡터화하는 작업에서는 이 처리량 차이가 운영 가능성을 좌우할 수 있다는 것이 결과의 실용적 의미다.

## 결과 분석 / Ablation

### BRIGHT·BEIR: 재순위화

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/fig3-4-reranking-thinking.png" class="img-fluid rounded z-depth-1" caption="Figures 3–4. 위: BRIGHT와 BEIR의 재순위화 결과. 아래: 토큰별 비용과 추론 축소의 모델별 효과. 인접한 두 원본 그림을 함께 발췌했다." zoomable=true %}

부록 Table 16의 추가 실험은 BRIGHT 7개와 BEIR 5개 과제를 사용한다. BM25, BGE-large, GTE-MC-v1, Qwen3-Embedding-8B라는 첫 단계 검색기를 여러 reranker와 교차 비교한다. 따라서 이를 두 벤치마크의 모든 과제에 대한 최신 공식 leaderboard 결과로 소개하면 안 된다.

BRIGHT에서 Qwen3-Embedding-8B 단독은 22.3 nDCG@10이다. Qwen3.6-27B listwise reranker를 추가하면 35.1로 12.8점 오른다. Qwen3.6-35B-A3B를 쓰면 33.6이다. 반대로 BEIR에서는 Qwen3-Embedding-8B 단독의 63.1이 가장 높고, 이 첫 단계에 붙인 Qwen3-Reranker-4B는 60.3, Qwen3.6-27B는 58.9다. 더 비싼 모델을 뒤에 붙이는 것만으로 순위가 개선되는 것은 아니다.

논문은 top-100 후보를 재순위화하는 비용을 벤치마크당 약 10–30 USD로 설명한다. 이는 후보 제한이 비용을 줄일 수 있음을 보여주지만, 앞의 154 USD와 서로 다른 과제 집합·모델을 섞어 동일 workload의 정확한 절감률을 계산하면 안 된다. 여기서 얻을 결론은 “후보를 좁혀 계산을 집중할 수 있다”는 설계 원리다. 어느 후보 수가 최적인지는 서비스의 recall, 지연시간, 비용 목표로 다시 측정해야 한다.

### Reasoning budget: 추론을 줄여도 되는가

저자들은 추론 토큰이 reasoning 모델의 비용에서 28–81%를 차지한다고 보고한다. Table 17에서 Qwen3.6-27B는 일반 출력 약 2.7M 토큰 외에 약 26.1M reasoning 토큰을 생성한다. 사용자에게 보이는 답변이 짧아도 내부 계산은 길 수 있다는 뜻이다. 이 비용이 정당한지는 같은 모델에서 추론 예산을 바꾸어 보아야 알 수 있다.

Gemini 3 Flash의 `reasoning_effort=low` 실험에서는 여섯 검색 과제의 점수가 모두 올라간다. FQuAD는 88.0→92.0, HC3-Finance는 60.0→66.0, Consumer Contracts QA는 79.0→83.0, PublicHealthQA는 49.0→66.0이다. AILAStatutes는 5.7→12.0, TwitterHjerne는 32.4→33.4다. 마지막 변화량을 Table 14는 반올림 전 값에 따라 +1.1로 적으므로, 표시 점수만 빼서 원문에 수치 오류가 있다고 단정하지 않는다.

{% include figure.liquid loading="eager" path="assets/img/papers/0036-the-embedder-s-dilemma-llms-are-better-but-at-what-cost/tab14-reduced-thinking.png" class="img-fluid rounded z-depth-1" caption="Table 14. Gemini 3 Flash의 low reasoning ablation. Think 감소율은 내부 추론 토큰 기준이며, Figure 4의 전체 생성 토큰 감소율과 구분해야 한다. 원 논문에서 발췌." zoomable=true %}

여러 계열을 묶은 Figure 4에서는 6개 중 4개 모델의 검색 평균이 유지되거나 개선되고, 전체 생성 토큰은 54–96% 줄어든다. 반면 두 Qwen 모델은 추론을 끄자 점수가 하락한다. 논문 Figure 4는 이를 정수로 반올림해 표시하며, 공개 부속 표에서는 Qwen3.6-27B가 62.4→57.8, Qwen3.6-35B-A3B가 60.4→54.4다. Gemini의 low는 느슨한 예산 지시이고 다른 모델의 off는 serving 설정이므로 동일한 개입도 아니다.

이 결과는 “reasoning이 불필요하다”는 주장보다 “기본 reasoning 예산을 그대로 쓰는 것이 최적이라고 가정하지 말라”는 주장을 뒷받침한다. 함께 읽는 능력과 오래 생각하는 능력은 분리해서 볼 수 있다. 문서와 질문을 같이 본다는 구조적 이점이 이미 충분한 과제에서는 긴 추가 추론의 이익이 작을 수 있다. 다만 이 설명은 ablation과 양립하는 해석이며, 내부 메커니즘을 직접 입증한 것은 아니다.

### Five-shot classification: 예시 5개의 한계

Table 15는 Flash에 과제당 예시 다섯 개를 제공한다. IMDB는 0.976→0.974로 거의 같고, Banking77은 0.831→0.165로 크게 하락한다. 77개 라벨을 가진 과제에 예시 다섯 개만 넣은 결과이므로, 예시가 모든 라벨 경계를 대표하지 못한다. 이 한 설정으로 더 많은 예시, 검색 기반 예시 선택, 학습 기반 적응도 효과가 없을 것이라고 결론 내릴 수는 없다.

이 표에는 재현 시 확인할 문제도 있다. TweetSentiment의 zero-shot은 Table 15에서 0.700인데 Table 7의 Flash는 63.0이다. “Best Emb.” 열 역시 일부 과제에서 본 실험 표와 다르다. 따라서 해당 표를 본 결과에 그대로 이어 붙여 같은 설정의 정확한 비교라고 읽기 어렵다. 이 리뷰는 Table 15 자체의 관찰을 설명하되, few-shot 일반화의 근거로 과대평가하지 않는다.

### Banking77·STS 오류 사례

부록 E의 Banking77 사례에서 카드 위치를 묻는 짧은 입력에 Pro는 분실·도난을, Flash는 배송 상태를 선택한다. 데이터셋 정답은 배송 상태다. 더 깊은 설명이 가능한 모델이라도, 그 설명이 데이터셋의 라벨 기준과 다르면 점수를 잃는다. Embedding kNN은 비슷한 실제 라벨 예문을 참조해 이 경계에 맞출 수 있다.

STS에서도 저자들은 모델이 세부 의미 차이를 더 민감하게 보거나, 문장에 직접 표현되지 않은 연결을 추론해 정답 점수와 달라지는 사례를 보여준다. 이때 benchmark와의 불일치를 곧바로 잘못된 언어 이해라고 부를 수는 없다. 반대로 그럴듯한 설명만으로 모델이 옳다고 할 수도 없다. 해당 사례를 판단하려면 annotation 기준과 전문가 검토가 필요하다. 몇 가지 선택된 사례가 전체 오류에서 얼마나 자주 나타나는지는 별도의 체계적 분석이 필요하다는 점도 저자들이 인정한다.

## 한계와 비판적 평가

가장 큰 한계는 <strong>파이프라인 비교와 모델 능력 비교의 경계</strong>다. 분류에서는 감독 정보가 다르고, 검색에서는 LLM이 전체 후보를 공동으로 읽는다. 논문은 이 비대칭을 명시한다. 실무에서 실제로 선택하는 시스템을 비교한다는 목적에는 의미가 있지만, 어느 신경망 구조의 본질적 표현력이 더 좋은지를 분리한 인과 실험은 아니다. 모델을 공통 조건에서 학습·튜닝했을 때의 상한은 여전히 열린 질문이다.

두 번째는 <strong>평가 지표와 집계 정의의 일관성</strong>이다. Overall과 bootstrap의 가중치 차이, AP라는 표기와 공개 코드의 accuracy 선택, few-shot 기준값의 불일치는 단순한 문서 형식 문제가 아니다. 무엇을 재현하고 어느 차이에 신뢰구간을 붙이는지가 달라지기 때문이다. 이를 근거로 모든 결과가 틀렸다고 주장할 수는 없지만, 작은 소수점 우위나 정밀한 통계 결론을 사용할 때는 원자료를 같은 지표와 가중치로 다시 집계하는 편이 좋다. 이번 리뷰에서는 모델 평가를 재실행하지 않았으며, 원문과 공개 코드를 대조한 범위에서 구별했다.

세 번째는 <strong>비용의 적용 범위</strong>다. 최대 처리량에 기반한 GPU 추정은 배치가 충분히 찬 상황에 가깝다. 실제 서비스의 낮은 이용률, 인덱스 저장·검색, 네트워크, 장애 처리 비용을 모두 포함하는 총소유비용은 아니다. 반대로 문서 embedding을 여러 질의에서 재사용하면 인코딩 비용이 더 잘 분산된다. 어느 방향의 영향이 큰지는 workload에 따라 달라진다. 1,431이라는 숫자를 그대로 사업 예산에 곱하기보다 계산 구조를 가져오는 것이 유용하다.

네 번째는 <strong>처리량 실험의 외삽 한계</strong>다. 논문은 길이 512·최대 배치로 embedding 조건을 설명하지만, 공개 `embedding_costs.py`는 고정 예문을 반복하고 탐색한 최대 배치의 80%를 사용하는 코드도 포함한다. 공개 코드와 서술이 완전히 같은 측정 절차인지는 실행 환경까지 맞추어 확인해야 한다. 또한 생성형 측정의 입력/출력 200/100토큰은 전체 corpus 검색 프롬프트와 다르다. 동일 GPU를 썼다는 사실만으로 모든 workload가 통제됐다고 볼 수 없다.

마지막으로 <strong>검색 도메인과 모델의 범위</strong>가 제한된다. 작은 corpus의 여섯 검색 과제는 context 안에서 정답을 찾는 능력에 초점을 둔다. 보완 reranking 실험은 이 한계를 줄이지만 전체 검색 서비스의 변화를 모두 다루지는 않는다. 새로운 모델, 한국어 중심 데이터, 긴 문서, 다른 후보 수로 결과가 유지되는지도 별도 검증 대상이다. 낮은 추론 예산의 이점 역시 여섯 모델 중 네 모델에서 나온 관찰이라는 범위를 유지해야 한다.

## 시사점 / Takeaways

- **먼저 작업별 기준선을 만든다.** 분류·STS·군집화에서는 간단한 embedding 파이프라인을 기준으로 두고, LLM이 필요한 실패 유형이 무엇인지 확인할 수 있다.
- **검색은 후보 생성과 정밀 판단을 따로 평가한다.** 첫 단계 recall과 reranker의 순위 개선을 함께 보면, 어떤 질의에 추가 계산을 쓸 가치가 있는지 판단하기 쉽다.
- **Reasoning 예산도 튜닝 변수다.** 기본값과 low/off를 같은 평가셋에서 비교하되, Qwen처럼 성능을 잃는 예외를 함께 확인해야 한다.
- **가격과 처리량의 분모를 적는다.** 벤치마크 전체 비용, 질의당 비용, tokens/s, 요청 지연시간을 구별하고, 캐시와 배치 조건을 함께 남겨야 비교가 가능하다.
- **소수점 순위보다 재현 가능한 결정을 남긴다.** 자신의 작업 분포와 평가 지표에서 품질 기준을 만족하는 구성을 고르는 것이 이 논문을 가장 생산적으로 활용하는 방법이다.

## 설치 및 사용법

[공개 README](https://github.com/embeddings-benchmark/embedders-dilemma#reproducing-the-paper)는 기존 결과 JSON에서 표와 그림을 다시 만드는 경로를 제공한다. 아래는 새 모델 호출 없이 공개 결과를 분석하는 최소 흐름이다. 저장소의 코드를 직접 실행한 재현 결과가 아니라, 2026-09-14에 확인한 공식 명령을 정리한 것이다.

```bash
git clone https://github.com/embeddings-benchmark/embedders-dilemma.git
cd embedders-dilemma
uv sync --group analysis
uv run python scripts/aggregate_scores.py
uv run python scripts/generate_tables.py
uv run python scripts/verify_numbers.py
```

새 LLM을 평가하려면 README의 `.env.example`을 바탕으로 endpoint, 모델명, 인증 정보를 설정하고 smoke test 후 `uv run python -m llm_judge.main`을 실행한다. 이 경로는 실제 API 호출과 비용을 발생시킨다. README는 기본 환경의 MTEB 2.6.5와 별도로 다국어 `LLMRTE3PC`에는 MTEB 2.11 이상이 필요했다고 설명한다. 따라서 논문의 37개 과제를 재현할 때 의존성 버전과 실행 대상을 함께 기록해야 한다.

숫자를 검증하는 스크립트가 있다는 것은 유용하지만, 실행 성공이 비교 설계의 타당성까지 보장하지는 않는다. 먼저 공개 결과로 계산을 재현하고, 다음으로 지표와 집계 정의를 확인한 뒤, 마지막으로 자신의 데이터에서 모델 호출을 재현하는 순서가 이해하기 쉽다. 위에서 지적한 가중치와 기준값 문제도 이 구분을 해두면 논의가 명확해진다.

## 참고 자료

- [원 논문, arXiv:2608.12875v1](https://arxiv.org/abs/2608.12875v1). 본문 및 부록 A–I. 이 리뷰의 실험 수치는 별도 표시가 없으면 이 버전 기준이다.
- [공식 코드·데이터·결과](https://github.com/embeddings-benchmark/embedders-dilemma). 검토한 commit: `1a94652e2c069ce840f85fcc87eb5e15bb42aecb`.
- [점수 집계 코드](https://github.com/embeddings-benchmark/embedders-dilemma/blob/1a94652e2c069ce840f85fcc87eb5e15bb42aecb/scripts/aggregate_scores.py), [범주 평균 코드](https://github.com/embeddings-benchmark/embedders-dilemma/blob/1a94652e2c069ce840f85fcc87eb5e15bb42aecb/scripts/plotting/registry.py), [통계 표 생성 코드](https://github.com/embeddings-benchmark/embedders-dilemma/blob/1a94652e2c069ce840f85fcc87eb5e15bb42aecb/scripts/generate_tables.py). 지표와 집계 방식 대조에 사용했다.
- [Embedding 처리량 코드](https://github.com/embeddings-benchmark/embedders-dilemma/blob/1a94652e2c069ce840f85fcc87eb5e15bb42aecb/scripts/embedding_costs.py). 처리량·비용 계산의 단위와 측정 조건 확인에 사용했다.

그림과 표는 El Assadi et al.의 원 논문에서 잘라 사용했으며, 원본의 수치와 라벨은 변경하지 않았다. 논문은 CC BY 4.0으로 공개되어 있다.

## 더 읽어보기

- **[MTEB: Massive Text Embedding Benchmark](https://arxiv.org/abs/2210.07316)** (Muennighoff et al., EACL 2023). embedding의 성능을 여러 과제 범주에서 평가하는 출발점이다.
- **[BRIGHT: A Realistic and Challenging Benchmark for Reasoning-Intensive Retrieval](https://arxiv.org/abs/2407.12883)** (Su et al., 2024). 의미 유사성만으로 해결하기 어려운 검색 문제를 이해하는 데 도움이 된다.
- **[Can Long-Context Language Models Subsume Retrieval, RAG, SQL, and More?](https://arxiv.org/abs/2406.13121)** (Lee et al., 2024). corpus-in-context 접근과 긴 문맥을 이용한 검색의 배경이다.
- **[Generative Representational Instruction Tuning](https://arxiv.org/abs/2402.09906)** (Muennighoff et al., 2024). 생성 모델과 embedding 모델의 경계가 단순하지 않다는 점을 보여준다.

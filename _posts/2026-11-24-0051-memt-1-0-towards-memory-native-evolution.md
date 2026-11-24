---
layout: post
title: "[논문 리뷰] MemT-1.0: Towards Memory-Native Evolution"
date: 2026-11-24 11:48:31 +0900
description: "고정 크기 메모리를 모델의 순전파에 연결하는 MemT-1.0의 갱신 규칙, 학습, 장기 기억 성능과 코딩 에이전트 실험"
tags: [memory, llm, recurrent-memory, linear-attention, agentic-coding, inference]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig4-architecture.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0051-memt-1-0-towards-memory-native-evolution/
en_url: /en/papers/0051-memt-1-0-towards-memory-native-evolution/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Zhiyu Li et al. (저자 74명, MemTensor · NVIDIA) |
| 학회 | arXiv · 2026 · CC BY-NC-SA 4.0 |
| arXiv | [2610.26825v4](https://arxiv.org/abs/2610.26825v4) |
| Code | [MemTensor/MemT-1.0](https://github.com/MemTensor/MemT-1.0) |
| 데이터 | 후속 사전학습 200억 토큰, 사후학습 140억 토큰 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-11-24 |

## TL;DR

- MemT-1.0은 이전 턴을 고정 크기의 행렬 상태에 저장한다. 현재 턴의 토큰은 같은 이전 상태를 읽고, 턴이 끝나면 토큰마다 계산한 erase·write·forget gate로 다음 상태를 만든다.
- 11개 메모리 벤치마크 평균에서 Pro 53.08, Flash 50.60, Nano 46.97로 기존 parametric memory 중 가장 높은 Temp-LoRA의 38.08을 앞선다. 텍스트 증거를 제공하는 MemOS의 최고 평균은 72.08이다.
- 128K 토큰의 BEAM 이력에서 Nano는 full context보다 end-to-end 추론이 약 1.86배 빠르고 궤적별 영속 상태가 약 66분의 1이다. 이 수치는 정해진 추론 조건의 지연과 논리적 상태 크기다.
- SWE-bench에서는 외부 경험 저장소에서 검색한 절차를 메모리에 쓰면 같은 과제를 세 번 모두 해결하는 비율이 오른다. 세 번 중 한 번이라도 맞히는 비율의 개선은 일관되지 않다.

## 소개 (Introduction)

오래 함께 일한 코딩 에이전트에게 새 이슈를 맡기면 이전 작업에서 확인한 절차도 활용하기를 기대한다. 날짜 파서를 고치다가 경계값에서 회귀가 났다면, 다음번에는 구현을 건드리기 전에 경계 사례를 재현하는 식이다. 과거의 이슈와 실행 로그를 매번 입력에 붙이면 직접 확인할 근거가 남는다. 다만 이력이 쌓일수록 읽을 토큰도 많아진다. 검색으로 일부만 골라 주면 입력을 줄일 수 있지만, 그 순간 무엇을 찾아야 할지 판단할 수 있어야 한다.

MemT-1.0은 과거 입력이 현재 모델 계산에 들어가는 경로를 바꾼다. 일부 Transformer 레이어에 메모리 읽기 경로를 붙이고, 완료한 상호작용을 다음 턴에서 읽을 수 있는 행렬로 압축한다. 이전 턴의 세부 내용을 그대로 보존하지 않아도 그 내용이 현재 응답에 영향을 주도록 메모리 모듈을 학습한다. 같은 백본을 교사로 두고, 모든 과거 텍스트를 읽은 교사의 다음 토큰 분포를 학생이 압축된 상태에서 얼마나 따라갈 수 있는지 본다.

이 설계에서 물어야 할 것은 이력을 몇 토큰까지 처리할 수 있느냐와 그 이력에서 몇 가지 사실을 정확히 꺼낼 수 있느냐이다. 전자는 상태 크기가 일정해도 가능하다. 후자는 같은 행렬에 여러 사건과 규칙을 차례로 덮어쓰는 과정에 달려 있다. 리뷰는 arXiv v4를 기준으로 상태 갱신의 안정성, 긴 이력의 비용, 검색한 코딩 경험의 재사용이 서로 다른 실험에서 어떻게 측정되었는지 살펴본다.

## 핵심 기여 (Key Contributions)

- **턴 사이에 이어지는 모델 내부 상태.** 기존 attention과 나란한 메모리 경로가 레이어별 상태를 읽는다. 각 대화나 작업 실행은 별도 상태로 시작하며, 학습한 메모리 가중치는 여러 실행이 공유한다.
- **토큰별 대칭 갱신과 Mixture-of-Storage.** Gated DeltaNet-2의 erase 연산을 대칭화한다. 여러 memory expert를 둘 때는 모든 expert에 같은 입력을 쓰고 토큰별 가중치로 읽기를 섞는다.
- **전체 이력을 가진 교사와 메모리 학생의 비교.** 후속 사전학습으로 구간 사이의 상태 전달을 익히고, 사후학습으로 전체 이력에 접근하는 교사의 응답 분포를 모방한다.
- **기억 정확도와 시스템 비용의 분리.** 여러 메모리 벤치마크에서 검색 방식과 비교하고, 별도 실험에서 이력 준비 시간, 준비 후 첫 토큰 지연, 궤적별 저장 크기를 각각 측정한다.
- **절차 경험의 읽기 경로 검증.** 같은 경험을 메시지로 제공하거나 메모리 상태에 적재해, 코딩 작업의 평균 성공률과 반복 실행의 성공률을 비교한다.

## 관련 연구 / 배경 지식

### 전체 문맥, 텍스트 검색, 메모리 상태

Full context는 남아 있는 과거 토큰을 attention으로 다시 참조한다. 이어지는 질의를 처리할 때 이력의 KV cache를 재사용할 수 있지만, 저장할 KV 항목 수와 attention이 접근하는 이력은 문맥 길이의 영향을 받는다. DenseRAG는 질의와 관련된 청크를 검색해 텍스트 근거만 공급한다. MemOS나 Graphiti 같은 메모리 시스템도 이 논문의 비교에서는 백본에 텍스트 증거를 주는 쪽에 놓인다. 해당 증거가 입력에 들어오면 모델은 제공된 텍스트 근거를 직접 확인해 답할 수 있다.

Parametric memory는 다른 방식으로 비용을 지불한다. Temp-LoRA는 이력마다 LoRA를 최적화하고 질의 시 그 어댑터를 사용한다. Doc-to-LoRA는 문서에서 LoRA를 생성하는 법을 미리 학습한다. MemT-1.0의 이력별 결과물은 추론 시 갱신되는 행렬이다. 세 방식 모두 질의 시 원문 이력 없이 동작할 수 있지만, 이력을 준비하는 연산과 새 내용이 기존 기억을 바꾸는 방식은 서로 다르다. 논문에서 parametric memory로 묶은 결과를 비교할 때는 이 차이까지 봐야 한다.

### Metis의 두 메모리와 DeltaNet의 갱신 단위

선행 연구 Metis는 상호작용을 담는 local memory와 무엇을 어떻게 쓰고 읽을지 학습하는 hyper memory를 구분했다. MemT-1.0은 이 구분을 유지하고, Metis의 토큰 선택을 모든 토큰에 적용하는 순차적 상태 갱신으로 바꾼다. Gated DeltaNet-2는 기존 연관을 지우는 erase와 새 값을 넣는 write를 별도 gate로 다룬다. 날짜나 선호가 바뀌면 새 값을 추가하는 것과 이전 값을 약화하는 것이 동시에 필요하다. MemT-1.0은 이때 erase의 방향을 대칭화하고, 현재 턴의 응답을 만드는 동안에는 이전 턴의 상태를 계속 읽는다.

## 방법 / 아키텍처 상세

### 1. Transformer attention과 메모리 읽기의 결합

Figure 4의 왼쪽은 전체 모델, 가운데는 메모리를 붙인 Transformer 블록, 오른쪽은 상태를 저장하고 읽는 경로다. 선택된 레이어의 pre-attention hidden state는 기존 attention과 메모리 attention에 함께 들어간다. 두 출력을 합친 뒤 해당 백본의 나머지 연산을 이어 간다. Nano의 Qwen은 모든 full-attention 레이어에, Flash의 DeepSeek는 compressed sparse-attention 레이어에, Pro의 Nemotron은 모든 full-attention 레이어에 메모리를 붙인다. 예를 들어 Nano는 기존 attention 출력을 backbone gate로 처리한 뒤 메모리 출력을 더하고 기존 output projection으로 보낸다. 메모리 쪽에는 따로 학습하는 output gate가 있다.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig4-architecture.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 4. 선택된 Transformer 레이어의 병렬 attention과 local·hyper memory의 저장 및 읽기 경로"
   zoomable=true %}

레이어·채널 하나를 떼어 보면 local memory는 key 차원과 value 차원을 잇는 행렬이다. 새 궤적에서는 0으로 초기화한다. Hyper memory에는 query·key·value projection, 쓰기 gate, 읽기 gate의 파라미터가 들어 있다. 온라인 상호작용에서 바뀌는 것은 local state이며, 이 상태를 처리하는 hyper memory와 백본 가중치는 고정된다. 논문에서 동적 기억을 모델 파라미터의 일부로 표기하는 이유는 상태가 forward 계산에 직접 들어가기 때문이다.

### 2. 턴 경계의 snapshot과 토큰별 쓰기

사용자 입력과 그에 대한 생성 응답을 이어 붙인 것이 한 턴의 저장 대상이다. 턴이 진행되는 동안에는 이전에 받은 상태를 메모리 attention이 읽는다. 현재 턴의 텍스트는 별도로 백본의 causal attention과 KV cache를 이용한다. 턴을 마친 뒤 전체 입력과 응답의 hidden state를 사용해 시간 순으로 다음 snapshot을 계산한다. 그래서 같은 턴 안의 나중 토큰이 그 턴의 앞부분을 참고할 때에는 기존 attention 경로를 쓰고, 그 토큰들이 영속 상태를 통해 새로 보이는 시점은 다음 턴이다.

레이어와 채널 인덱스를 생략하고 한 턴의 토큰을 $i$로 표시하자. 메모리 key $k\_i$는 L2 정규화한 행벡터이고, $v\_i$는 value다. $\beta\_i$와 $\omega\_i$는 sigmoid를 통과한 erase·write gate로 각각 key와 value 차원에 작용한다. Forget gate의 log-decay $\lambda\_i$는 음수이며, 지수화한 값을 행렬 $D\_i$의 대각에 넣어 이전 상태의 행을 감쇠한다. 아래에서 $M\_0$은 턴 시작 snapshot이고, 마지막 $M\_i$가 다음 턴으로 전달된다.

$$
\begin{aligned}
u_i &= \sqrt{\beta_i}\odot k_i,\\
D_i &= \operatorname{Diag}(\exp(\lambda_i)),\\
z_i &= \omega_i\odot v_i,\\
M_i &= (I-u_i^\top u_i)D_i M_{i-1}\\
    &\quad + u_i^\top z_i.
\end{aligned}
$$

감쇠된 상태에서 현재 key 방향의 연관을 줄이고, 같은 방향에 gate를 통과한 새 value를 더한다. 행렬 상태의 너비는 그대로라서 동일한 용량 안에서 기존 정보와 새 정보가 경쟁한다. 현재 저장된 값이 읽기에 적합한지는 이 갱신을 통과해 만들어진 상태로 미래 응답을 예측하는 학습이 결정한다.

### 3. 대칭 erase의 비팽창성

원래 GDN-2의 erase 항은 정규화 key와 gate를 곱한 key에 서로 다른 역할을 준다. 기존 상태에 남은 양을 한 방향으로 측정하고 다른 방향으로 보정하면, 개별 고윳값의 크기가 작아도 어떤 입력 벡터의 유클리드 노름은 한 번의 erase에서 커질 수 있다. 부록 C는 두 방향이 일치하지 않을 때 key에 직교하는 입력조차 key 방향 성분을 얻는 예를 보여 준다.

대칭화 뒤에는 $u\_i$에 평행한 성분에만 $1-\lVert u\_i\rVert\_2^2$를 곱하고, 직교 성분은 그대로 둔다. 단위 길이 key와 0과 1 사이의 gate라는 가정 아래 이 계수는 0과 1 사이에 있다. 따라서 erase 자체는 벡터의 길이를 키우지 않는다. 이 성질은 recurrent update에서 불필요한 증폭 경로를 없앤다. 새 value를 계속 더하는 전체 궤적에서 어떤 사실이 끝까지 유지되는지는 저장 대상과 gate의 동작에 달려 있다. 부록의 기하학적 성질과 장기 기억 정확도는 별개로 평가해야 한다.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig11-stable-erase.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 11. 동일한 입력에서 GDN-2(왼쪽)와 SGDN-2(오른쪽)의 단위 원 변형과 방향별 이득의 최댓값"
   zoomable=true %}

### 4. 정규화된 읽기와 Mixture-of-Storage

읽을 때는 현재 hidden state를 query로 projection하고 L2 정규화한 뒤, 턴 시작의 행렬과 곱한다. 논문의 표기에서 채널별 readout은 다음과 같다. $d\_k$는 key 차원이다.

$$
R = \frac{QM}{\sqrt{d_k}}
$$

채널별 결과에 RMSNorm과 output gate를 적용한다. Gate에는 SiLU를 통과한 값을 tanh로 부드럽게 제한하는 SoftCapSiLU를 쓰며, 기본 상한 매개변수는 2다. 이 과정은 메모리 내용이 백본의 attention과 합쳐지기 전에 크기와 채널별 기여를 조절한다. 이후 각 채널의 값을 이어 붙여 선택한 레이어의 attention 출력에 결합한다.

Mixture-of-Storage(MoS)는 이 상태와 hyper memory를 expert별로 둔다. 모든 expert가 입력의 모든 토큰을 자기 projection과 gate로 처리한다. 읽을 때도 전부 실행하며, 각 토큰의 hidden state에서 계산한 softmax 가중치로 읽기 결과를 합친다. Expert 수를 늘리면 궤적의 상태와 오프라인 학습 파라미터가 함께 늘어난다. 입력을 일부 expert에만 보내는 sparse MoE의 연산 절감이 이 memory branch에 따라오지는 않는다. 메인 평가의 세 모델은 레이어마다 expert 하나를 사용하고, Nano의 2·4 expert는 용량 확장 실험에서 따로 비교한다.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig5-memory-experts.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 5. 모든 expert에 대한 토큰별 쓰기와 dense utilization router의 읽기 가중합"
   zoomable=true %}

### 5. 궤적별 상태 크기와 학습 window

레이어 $l$마다 expert 수, 채널 수, key와 value 차원의 곱을 더하면 한 궤적의 영속 상태 원소 수가 된다. Nano는 10개 레이어에서 채널 16개와 256×256 행렬을 사용한다. FP32로 약 1,049만 원소, 40 MiB다. Flash는 20개 레이어의 채널 64개와 512×512 행렬로 1,280 MiB, Pro는 12개 레이어의 채널 64개와 128×128 행렬로 48 MiB다. 백본이 가장 큰 Pro의 상태가 Flash보다 작은 것은 이 행렬의 구조가 서로 다르기 때문이다. 전체 서비스 저장량은 동시에 유지할 궤적 수에 비례하며, 실행 중인 질의는 현재 턴의 KV cache와 작업 공간도 필요하다.

학습에서는 여러 궤적을 pack에 넣고 decoder 레이어 단위로 계산한다. 같은 레이어의 projection과 턴 내 attention은 배치화하고 메모리 블록은 궤적 순서대로 상태를 넘긴다. Rank-one 연산의 의존성은 chunked WY로 묶되, 읽기는 같은 snapshot을 쓰므로 턴 내 토큰 전부를 배치로 처리할 수 있다. Dense MoS에서는 여러 expert의 중간 projection을 한꺼번에 만드는 대신 일부 완결된 턴만 window에 올린다. 역전파 때 내부 값을 다시 계산하고, window를 잇는 FP32 상태로 gradient를 전달한다. Window는 GPU에 한 번에 올릴 작업량을 바꾼다. 모델이 어느 턴의 기억을 읽는지는 동일하다.

## 학습 목표 / 손실 함수

### 정답 토큰을 사용하는 후속 사전학습

후속 사전학습(continued pre-training, CPT)은 긴 텍스트를 연속된 비중첩 구간으로 나눈다. 학생은 현재 구간의 토큰에 causal attention을 적용하고, 이전 구간은 local state를 통해 받는다. 구간을 처리한 후 token-level update로 메모리를 넘기고, 독립 시퀀스가 시작하면 초기화한다. 마지막 구간이 목표 길이보다 짧아도 남겨 둔다. 목표는 정답 다음 토큰에 대한 cross-entropy다. 긴 텍스트에서 주제와 인물이 구간 경계를 넘어 유지되어야 다음 토큰을 잘 예측할 수 있으므로, 구간을 잇는 저장·읽기 모듈에 학습 신호가 간다.

### 전체 이력 교사에서 상태 기반 학생으로의 증류

사후학습에서 teacher는 메모리 모듈이 없는 동결 백본이다. 과거 텍스트 전체와 현재 질문, 참조 응답의 앞부분을 함께 읽는다. 학생은 같은 질문·응답 prefix와 과거를 압축한 상태를 받는다. 두 모델에 동일한 teacher rollout을 teacher forcing으로 제공하므로 학생의 생성에 따라 학습 궤적을 새로 만드는 과정은 없다. KL의 교사 분포 $\hat q$는 해당 위치의 Top-$K$ 토큰 집합 $\mathcal K$ 안에서 재정규화하고, 학생 분포 $p^{(T\_d)}$는 온도 $T\_d$로 전체 vocabulary에 대해 정규화한다.

$$
\begin{aligned}
\ell_{\mathrm{KL}}
&= T_d^2 \sum_{v\in\mathcal K}
  \hat q(v)\log\frac{\hat q(v)}{p^{(T_d)}(v)}.
\end{aligned}
$$

학생이 교사의 Top-$K$ 바깥에 확률을 많이 주면 집합 안의 확률 합이 줄어 손실이 커진다. 참조 응답은 어느 prefix에서 비교할지 정한다. 사후학습에서 직접 맞추는 것은 그 위치의 teacher 분포다. 손실은 응답의 감독 토큰을 기준으로 전체 batch에서 평균한다. 이력, 질문, padding에는 직접 토큰 손실이 없지만, 응답에서 읽은 메모리를 만든 이전 쓰기 연산에는 gradient가 흐른다. Memory expert를 모두 쓰는 MoS에는 별도의 MoE load-balancing loss를 두지 않는다.

## 학습 데이터와 파이프라인

### Flash의 백본 준비와 메모리 코퍼스

Flash는 공개 DeepSeek-V4-Flash에 메모리를 붙이기 전, 일반 능력·코딩·도구 사용 및 업무 자동화의 세 트랙에서 백본을 보강한다. 먼저 반복 시도로 과제를 안정적으로 해결하는지, 간헐적으로 해결하는지 분류한다. 실패한 경우 채점 관례, 절차 힌트, 관련 사실을 문맥에 넣어 무엇이 부족했는지 살핀다. 안정적인 과제는 replay에 쓰고, 간헐적으로 맞히는 과제에서는 실행 가능한 검증을 통과한 응답을 얻는다. 절차나 관례가 부족했던 사례에는 힌트가 있는 샘플링이나 더 강한 모델의 시연을 사용한다. 새 사실이 필요한 경우에는 검색과 메모리에 맡긴다.

준비 단계의 최종 혼합은 12만 6,500개 궤적과 24억 토큰이며, 11억 토큰이 손실 계산에 들어간다. 궤적 개수로는 일반 과제가 가장 많지만, loss-bearing 토큰의 약 90%는 긴 에이전트 궤적이다. 논문이 보고한 이 단계의 6개 지표 평균 6.3점 개선은 메모리를 붙이기 전 백본의 변화다. 이후 같은 백본을 Flash의 host와 전체 문맥 teacher로 동결한다.

34B 토큰은 두 메모리 학습 단계의 코퍼스 규모다. CPT의 20B 토큰에는 긴 일반 문서와 연속 텍스트가 포함된다. 사후학습의 14B 토큰은 메모리에 조건화한 언어 모델링, 요약·이어쓰기·압축 형태의 저장 및 이용, 장기 의존성이 있는 기억 과제로 구성한다. 일부는 MemOS의 익명화된 내부 데이터에서 관찰한 상호작용 패턴을 바탕으로 한다. 과거 문맥을 먼저 저장한 뒤 질문과 응답을 배치하는 공통 형태를 쓴다.

<div class="table-responsive" markdown="1">

| 모델 | 백본 | 학습 배치 | 영속 FP32 상태 |
|---|---|---:|---:|
| Nano | Qwen3.6-35B-A3B | 64 pack | 40 MiB |
| Flash | 별도 사후학습한 DeepSeek-V4-Flash | 192 pack | 1,280 MiB |
| Pro | NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16 | 128 pack | 48 MiB |

</div>

논문의 기본 storage step은 2K 토큰이고 pack 길이 한도는 64K다. Nano는 CPT 1 epoch 뒤 사후학습을 수행한다. 세 모델의 KL 설정은 teacher Top-64와 온도 1이다. Nano의 AdamW peak learning rate는 두 단계에서 모두 $10^{-4}$다. Pro는 CPT에서도 백본을 동결하며, 사후학습은 CPT checkpoint에서 시작해 2 epoch 돌린다.

### 코딩 경험 저장소와 성공 이후 구간의 감독

코딩 실험은 일반 메모리 학습 이후 Nano에 별도 사후학습을 적용한다. Scale-SWE의 성공 궤적 41,057개로부터 중요한 결정과 적용 조건을 추출하고, 유사 절차를 묶어 검증 방법이 포함된 경험 1,040개를 만든다. 또 Qwen 백본이 실패한 궤적에서 실행 오류나 반복 행동 같은 신호를 찾아 그 지점부터 다른 경험 후보를 제시하며 실행을 재개한다. 실험한 199,500개 개입 변형 중 45,481개가 성공한 continuation을 만들었고, 필터링 후 42,403개가 학습 샘플로 남았다. 같은 과제의 궤적이 학습과 검증에 양쪽으로 섞이지 않게 과제별로 분할한다.

학생은 경험을 저장한 뒤 실패 지점까지의 원래 prefix를 메모리 읽기 없이 재생한다. 지점 이후에는 읽기를 켜고 테스트를 통과한 continuation의 assistant 토큰을 감독한다. 경험 원문이나 개입 전 prefix에는 직접 손실을 걸지 않는다. 첫 assistant 턴만 감독하거나 성공한 나머지 구간 전체를 감독하는 구성을 비교한다. Table 6의 모델은 전체 suffix를 쓰는 지식 증류 checkpoint다.

## 실험 결과

### 11개 메모리 벤치마크와 텍스트 근거의 격차

평가는 이력을 시간 순으로 저장하고, 같은 이력에 속한 질의에는 저장 상태를 사용해 답하도록 구성한다. 다른 사람과 다른 이력의 상태는 격리한다. PersonaMem에서는 같은 문맥 cutoff에 속한 질문이 읽기 전용 상태를 공유한다. 정답과 근거 annotation은 채점에서만 쓴다. 채점은 과제에 따라 선택지 정확도, 축별 집계, gpt-4.1-mini를 사용하는 OmniMemEval 평가 등을 적용한다. 예를 들어 ImplicitMemBench는 두 종류의 첫 시도 정확도와 priming 영향 점수를 평균하므로, Table 3의 AVG는 서로 다른 11개 점수의 거시 평균으로 읽어야 한다.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/tab3-memory-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 3. 궤적 길이별 11개 메모리 벤치마크에서 텍스트 메모리와 parametric memory의 점수 및 평균"
   zoomable=true %}

Pro·Flash·Nano의 53.08·50.60·46.97은 모두 Temp-LoRA의 38.08보다 높다. Pro가 가장 큰 모델이지만 Flash는 MemBench 73.48, ImplicitMemBench 49.21, LongMemEval-S 37.20에서 Pro보다 높은 점수를 낸다. Pro는 persona-grounded 질의에서 공격 성공률의 보완값을 점수화한 PS-Bench에서 99.03을 얻고, PerMemSafe에서 Flash의 33.47을 크게 웃도는 52.80을 기록한다. 따라서 전체 평균만으로 더 큰 백본과 더 넓은 행렬 중 어느 쪽이 어떤 기능을 개선했는지 구별하기 어렵다.

텍스트까지 포함한 비교에서는 강한 격차가 남는다. MemOS의 Nemotron 구성은 평균 72.08, BEAM-1M 77.76이며 Pro는 각각 53.08과 41.80이다. LongMemEval-S에서는 Flash가 37.20이고 MemOS의 DeepSeek 구성은 83.20이다. 반면 Graphiti의 세 백본 평균 점수는 각 50.59, 49.79, 46.06으로 일부 MemT 결과와 비슷하다. PS-Bench처럼 MemT가 강한 과제도 있다. 어떤 텍스트 기반 시스템과 어떤 종류의 기억을 비교하는지에 따라 경쟁력의 의미가 달라진다.

### 방해 이력을 넣은 일반 능력

일반 능력은 MMLU-Pro, GPQA Diamond, IFEval, LongBench v2, BigCodeBench-Hard, LiveCodeBench v6에서 평가한다. 동일한 무관 예시를 MemT의 빈 상태에 한 번 쓰고, 백본에는 과제 입력 앞에 붙인 뒤, 해당 백본의 noise 조건을 기준으로 차이를 계산한다. Pro의 평균 차이는 −0.11%p, Flash는 0.0%p, Nano는 −0.9%p이다. 하지만 Pro의 LongBench v2는 −5.17점, Nano의 LiveCodeBench v6는 −5.8점이다. Nano가 BigCodeBench-Hard에서는 +2.0점을 얻는다는 사실까지 보면, 평균 보존은 모든 개별 능력의 보존보다 좁은 결론이다.

### 이력 준비, 첫 토큰 지연, 상태 저장량

추론 비교는 BEAM에서 뽑은 35개 이력에 공통 512토큰 질의를 붙이고 정확히 128토큰을 생성한다. Hugging Face 경로의 full context, Temp-LoRA, Nano는 두 GPU, 동시성 1, batch size 1로 평가한다. 이력·길이별로 한 번 준비하고 warm-up 질의 한 번을 버린 뒤 다섯 번의 시간을 평균한다. 준비에는 full context의 prefill이나 Nano의 memory write가 들어간다. 질의 TTFT에는 질의 prefill과 해당 경로의 상태 복원이 포함되며 이력 준비는 따로 센다.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig7-latency.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7. 이력 토큰 수에 따른 end-to-end 지연(왼쪽, 초·로그 축)과 준비 후 질의 TTFT(오른쪽, ms)"
   zoomable=true %}

짧은 이력에서는 Nano가 대체로 더 느리고 32K에서 full context와 비슷해진다. 128K에서는 16.19초 대 30.07초로 약 1.86배, 256K에서는 23.69초 대 94.47초로 약 3.99배 빠르다. 준비를 마친 Nano의 평균 TTFT는 평가 범위에서 약 104–112ms에 머문다. Full context는 128K와 256K에서 각각 약 257ms와 445ms다. Temp-LoRA도 준비 이후의 TTFT가 안정적이지만, 이력을 최적화하는 시간이 end-to-end 비용을 크게 늘린다. 같은 상태를 여러 질의에서 재사용하는 서비스라면 준비 비용의 비중이 낮아지므로 두 지표를 나누어 보는 편이 합리적이다.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig8-storage.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8. BEAM 이력 토큰 수에 따른 궤적별 영속 상태 크기(MiB, 로그 축)"
   zoomable=true %}

128K에서 약 66배 차이가 난 저장 지표는 질의 전 논리적 상태 크기다. 공유 모델 가중치, 현재 질의 작업 공간, 추론 프로세스가 예약한 메모리는 빠진다. Full context는 256K에서 5.061 GiB에 이른 뒤 문맥 길이 한도에서 곡선이 끝난다. Nano는 측정 범위에서 40 MiB를 유지하며, Temp-LoRA는 BF16 어댑터 172.5 MiB를 보관한다. DenseRAG는 짧은 이력에서 Nano보다 작지만 원문 청크와 embedding을 계속 쌓으면서 용량이 늘어난다.

### 검색 경험의 적재 시점과 코딩 성공률

SWE-bench에서는 이슈 텍스트를 BGE-M3로 임베딩해 경험을 검색한다. 경험에는 적용 조건, 작업 절차, 검증 단계가 들어 있다. 실행 전에 주거나, 명령 실패·빈 관찰·반복 실패가 감지될 때 최대 한 번 넣는다. 텍스트 조건은 경험을 메시지에 추가하고, Native Memory는 별도 forward로 경험을 상태에 쓴다. 이 실험에서는 저장 뒤 같은 상태를 고정해 읽다가 작업이 끝나면 초기화한다. 따라서 이전 작업에서 경험을 모으는 절차와 이번 작업의 모델에 경험을 전달하는 절차를 구분할 수 있다.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig10-agentic-experience.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 10. 이슈 기반 경험 검색, 실행 전·harness 신호 기반 적재, 텍스트와 native memory를 통한 후속 실행"
   zoomable=true %}

Verified 500개와 Multilingual 300개 과제를 각 세 번씩 실행한다. 평균 성공률은 전체 실행의 성공 비율이다. 세 번 모두 해결한 과제 비율인 pass³는 반복 신뢰도를, 한 번이라도 해결한 과제 비율인 pass@3은 반복 시도의 도달 범위를 보여 준다. Verified의 harness-triggered 조건에서 Nano는 경험 없는 백본의 평균 성공률 66.07%를 69.73%로, pass³ 54.00%를 62.80%로 올린다. 실행 전 적재 조건의 pass³는 텍스트와 Native Memory 모두 61.60%다. Multilingual의 실행 전 조건에서는 텍스트 경험의 pass³ 56.33%가 Native Memory의 53.67%보다 높다. Harness-triggered에서 Nano의 55.33%는 텍스트의 53.67%를 앞서지만, pass@3 73.00%는 경험 없이 얻은 73.67%에 못 미친다. 텍스트 조건은 Verified의 실행 전 적재에만 검색 상위 3개를 사용하고, 다른 조건에는 상위 1개를 사용한다.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/tab6-agentic-results.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 6. SWE-bench Verified와 Multilingual의 경험 적재 시점별 pass³, 평균 성공률, pass@3(%)"
   zoomable=true %}

## 결과 분석 / Ablation

### 갱신 granularity와 사후학습의 기여

Table 5에서 기준 Nano 평균은 47.0이다. 안정화하지 않은 GDN-2는 46.4, GDN은 46.7로 비슷하다. 토큰별 erase·write 항과 로그 감쇠를 집계해 턴당 한 번 갱신하면 41.0으로 떨어진다. 순차 갱신에서는 턴 안에서도 앞선 연관을 뒤 토큰이 약화하거나 다시 쓸 수 있다는 점을 고려하면, 이 결과는 실제 쓰기 단위의 중요성을 보여 준다. 양방향 encoder로 쓰기 gate에 문맥을 추가한 조건은 일부 과제에서 개선되지만 평균은 45.4다. 안정화가 주는 기하학적 이점이 이 실험에서 가장 큰 성능 요인이었다고 해석하기 어렵다.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/tab5-ablations.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5. Nano의 갱신 규칙·단위와 학습 단계 변경에 따른 11개 벤치마크 점수 및 평균 차이"
   zoomable=true %}

CPT만 한 checkpoint의 평균은 36.3이고 CPT 없이 사후학습하면 44.9다. 두 단계를 모두 쓴 47.0과 비교하면, 과거 정보를 압축한 상태로 질문에 답하는 데에는 응답 조건에 맞춘 사후학습이 큰 몫을 한다. 2 epoch 동안 동일한 사후학습 코퍼스를 반복한 Figure 6에서도 평균이 36.65에서 45.40을 거쳐 46.80으로 오른다. 가장 큰 개선은 초반에 나온다. 새 데이터를 늘렸을 때의 효과를 여기서 추정하기는 어렵고, 같은 데이터의 추가 노출과 최적화가 가져온 변화를 관찰한 실험이다. Figure 6의 마지막 샘플 checkpoint 점수와 Table 2의 최종 Nano 점수 46.97도 각각의 수치로 읽어야 한다.

### Expert 수와 학습 피크 메모리

동일한 Nano 계열에서 expert 하나·둘·넷의 평균은 46.97, 47.50, 48.11이다. 4-expert 설정은 11개 중 8개 과제에서 가장 높다. PersonaMem은 둘에서 넷으로 늘릴 때 50.08에서 54.33으로 오르지만, ImplicitMemBench는 50.01에서 45.65로 내려간다. LongMemEval-S와 Memora에서는 expert 하나인 Nano가 4-expert보다 높다. 메모리 expert를 늘리는 실험은 동적 용량과 여러 학습 projection을 함께 늘리므로, 향상이 영속 상태 원소 수만의 효과인지는 분리할 수 없다.

Table 1의 32K 토큰 pack microbenchmark는 windowing의 다른 효과를 보여 준다. GPU 하나에서 4-expert 블록 한 개를 합성 hidden state로 측정했을 때, 4,096토큰 window의 peak allocated memory 중앙값은 47.83 GiB에서 9.49 GiB로 줄고 forward와 backward 시간은 463.0ms에서 470.6ms로 늘었다. 2,048토큰으로 더 줄이면 6.03 GiB까지 낮아지지만 시간 증가율은 6.6%가 된다. 모델 전체의 학습 시간이나 메모리 사용량은 백본과 나머지 레이어에도 달려 있다.

### 반복 SVD의 rank와 과제별 포화

Figure 9의 실험은 저장할 때마다 Nano의 FP32 상태 행렬에 SVD를 적용하고 상위 특이 성분으로 dense 상태를 재구성한다. Rank 256은 재투영 없이 원래 상태를 사용한다. LoCoMo는 대체로 rank를 높일수록 개선되어 full rank까지 이득이 남고, PersonaMem은 더 이른 구간에서 포화된다. 원문의 두 번째 세로축은 낮은 rank의 인자만 영속 저장한다고 가정한 이론적 용량이다. 실제 평가에서 인자 형태로 serving하거나 SVD 비용까지 포함해 성능 향상을 재지는 않았다. 보존할 세부 정보의 종류에 따라 유용한 rank가 다를 수 있다는 점이 핵심이다.

{% include figure.liquid loading="lazy"
   path="assets/img/papers/0051-memt-1-0-towards-memory-native-evolution/fig9-low-rank.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 9. LoCoMo(왼쪽)와 PersonaMem(오른쪽)의 rank별 정확도(파란색, 왼쪽 축)와 이론적 저장량(빨간색, 오른쪽 축, MiB)"
   zoomable=true %}

## 한계와 비판적 평가

### 고정 상태의 세부 회상과 증거 추적

고정 크기 행렬은 과거 길이에 비례하는 상태 저장 부담을 줄인다. 그 대가로 새 내용이 들어올 때 이전 세부 정보가 얼마나 보존되는지 보장하기 어렵다. LongMemEval-S와 BEAM-1M의 격차는 이력이 길수록 정확한 날짜, 사건, 변경 사항을 다시 찾는 데 이 문제가 중요함을 보여 준다. 부록 G의 사실 회상과 최신 값 선택 사례는 가능한 동작을 구체화하지만, 성공 사례만으로 전체 답변의 근거를 역추적할 수 있는지는 알 수 없다. 원문을 인용하거나 오래된 사실을 정확히 삭제해야 하는 제품에서는 이 문제를 별도의 능력으로 평가해야 한다.

### 비교 조건과 시스템 비용의 범위

16K 아래부터 64K 위까지 여러 길이 구간의 결과를 제공하지만, 구간마다 과제 종류도 바뀐다. 짧은 과제와 긴 과제의 점수 차이를 전부 길이에 따른 기억 감쇠로 해석하기 어렵다. 질의가 여러 개일 때 배치화가 되는지, 상태를 GPU 밖에 저장하고 복원하면 지연이 어떻게 달라지는지, 사람마다 서로 다른 상태를 운영하는 비용도 독립적인 질문이다. 두 GPU의 단일 요청에서 얻은 TTFT와 한 궤적의 논리적 바이트 수는 여기서 직접 측정한 범위다. 외부 검색 비용이나 Flash의 훨씬 큰 상태를 포함한 운영 지표까지 이 값으로 환산할 수 없다.

### 외부 경험과 자율적 갱신의 간격

코딩에서 쓰기를 시작하는 것은 외부에서 구성한 경험 저장소와 검색기, 시점을 결정하는 harness다. 모델은 경험을 내부 상태에서 활용하고, 학습한 hyper memory는 실행 중 동결된다. 이 설계가 검증한 것은 유용한 절차를 검색해 온 뒤 메시지 길이를 늘리지 않고 적용할 수 있는지다. 어떤 경험을 스스로 수집하고 잘못된 경험을 수정할지, 그것을 여러 궤적에 공유되는 가중치로 어떻게 옮길지는 남은 연구 문제다. Verified 100개 개발 과제에서 구성도 비교했으므로, 최종 Verified 전체 점수는 완전히 별개의 설정 선택 평가로 보기보다 Multilingual 결과와 함께 읽는 편이 적절하다.

## 시사점 / Takeaways

- 메모리를 판단할 때 이력을 처리하는 비용, 질의에서 근거를 회수하는 정확도, 답변이나 행동이 달라지는 정도를 따로 측정할 필요가 있다.
- 같은 입력을 쓸 때라도 토큰 단위로 순차 갱신한 상태와 턴에서 집계한 항을 한 번 적용한 상태의 활용도는 다르다. 이번 ablation에서는 erase 공식의 선택보다 그 차이가 컸다.
- 정해진 용량 안에서 과거를 압축하면 세션당 저장 공간을 예측할 수 있다. 장기 문서 검색처럼 정확한 증거가 필요한 작업에서는 텍스트 근거를 보존하는 방식의 강점이 남는다.
- 코딩 실험에서 가장 일관된 신호는 한 번이라도 성공할 확률보다 세 번 모두 성공할 확률의 개선이다. 에이전트의 재시도 정책에 따라 두 개선의 가치는 달라진다.

## 설치 및 사용법

공식 SGLang 예제는 NVIDIA CUDA를 사용할 수 있는 Linux 환경과 Python 3.11 이상을 대상으로 한다. Nano의 [BF16 checkpoint](https://huggingface.co/MemTensor/MemT-1.0-Nano)를 로컬 경로에 준비한다. 아래 공식 launcher는 GPU 두 개를 tensor parallel로 쓰며, 의존성은 코드의 server extra가 지정한다.

```bash
git clone https://github.com/MemTensor/MemT-1.0.git
cd MemT-1.0
git checkout 4b08b5d54072b80221f22c912a0d560e02847295
uv venv --python 3.11
source .venv/bin/activate
cd inference
uv pip install '.[server]'
sh start_memt_nano.sh /models/MemT-1.0-Nano
```

서버가 준비되면 다른 터미널에서 같은 가상 환경을 활성화하고 저장소의 inference 디렉터리에서 다음 명령을 실행한다. 예제는 기본 주소 127.0.0.1:30000에 연결한다.

```bash
python examples/commit_history.py /models/MemT-1.0-Nano
```

예제의 MemTSession은 대화를 이어간 뒤 commit_history로 이력을 영속 상태에 반영한다. save_state가 돌려준 경로를 다음 세션에 전달해 그 상태에서 질의를 이어갈 수 있다. 코드를 고정한 버전에서 launcher의 설정 출력과 예제 문법을 확인했다.

## 참고 자료

- [MemT-1.0 논문 v4](https://arxiv.org/abs/2610.26825v4)
- [공식 코드](https://github.com/MemTensor/MemT-1.0)
- [Nano, Flash, Pro 모델 모음](https://huggingface.co/collections/MemTensor/memt-10)
- 그림과 표 출처는 Zhiyu Li et al.의 [MemT-1.0 v4](https://arxiv.org/abs/2610.26825v4)이며, 해당 이미지는 원문과 같은 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 조건을 따른다. 이미지의 내용은 원문과 동일하며, 각 그림·표의 영역을 따로 표시했다.

## 더 읽어보기

- **[Metis: Memory Foundation Model](https://arxiv.org/abs/2607.26760)** (Zhang et al., 2026): 대화별 local memory와 학습하는 hyper memory를 도입한 선행 연구.
- **[Gated DeltaNet-2: Decoupling Erase and Write in Linear Attention](https://arxiv.org/abs/2605.22791)** (Hatamizadeh et al., 2026): 선형 attention에서 erase와 write를 별도 gate로 제어하는 갱신 규칙.
- **[Doc-to-LoRA: Learning to Instantly Internalize Contexts](https://arxiv.org/abs/2602.15902)** (Charakorn et al., 2026): 입력 문서에서 질의용 LoRA adapter를 직접 생성하는 비교 방법.
- **[LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory](https://arxiv.org/abs/2410.10813)** (Wu et al., 2024): 세션 간 추론, 시간 정보, 사실 갱신과 모르는 질문에 대한 응답을 평가하는 벤치마크.

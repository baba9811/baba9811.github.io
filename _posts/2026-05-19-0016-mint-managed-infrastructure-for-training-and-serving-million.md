---
layout: post
title: "[논문 리뷰] MinT: Managed Infrastructure for Training and Serving Millions of LLMs"
date: 2026-05-19 22:00:00 +0900
description: "수백만 개의 LoRA 정책을 공유 베이스 모델 위에서 학습·서빙하는 관리형 인프라. Adapter revision을 학습-서빙 경계의 단위로 삼아 핸드오프를 18.3× 줄이고, 1T급 MoE까지 검증한다."
tags: [lora, rlhf, infrastructure, moe, multi-tenant-serving, post-training]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig1-mint-overview.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0016-mint-managed-infrastructure-for-training-and-serving-million/
en_url: /en/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Mind Lab (Andrew Chen et al., 13명 core contributors + 60명 team) |
| 학회 | arXiv preprint · 2026 |
| arXiv 또는 DOI | [2605.13779](https://arxiv.org/abs/2605.13779) |
| Code | [MindLab-Research/mint-cookbook](https://github.com/MindLab-Research/mint-cookbook) — cookbook recipes (서비스 코드는 비공개) |
| 데이터 | Qwen3 패밀리 (0.6B/4B 그리고 30B-A3B / 235B-A22B MoE), Moonlight-16B-A3B, Kimi K2 1.04T, GLM-5/5.1. 학습 레시피는 SFT (FinEval / FinGPT 스위트), DPO (chat pairs), GRPO (DAPO-AIME24), LawBench AutoResearch |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-05-19 |

## TL;DR

- 학습된 정책마다 풀-체크포인트를 복사하는 기존 인프라는 후처리 (post-training) 가 다정책 (multi-policy) RL 로 진화한 시점에서 더 이상 확장되지 않는다. MinT 는 베이스 모델은 한 번만 상주시키고 LoRA <strong>adapter revision</strong> 만 학습-서빙 경계를 오가는 단위로 삼는 관리형 인프라다.
- 세 축의 확장: **Scale Up** (1T급 MoE 와 MLA/DSA 까지 LoRA RL 가능), **Scale Down** (어댑터-only 핸드오프로 머지 경로 대비 4B 모델 18.3×, 30B MoE 모델 2.85× 빠른 step. 동일 베이스 할당에서 concurrent GRPO 가 wall time 1.77× / 1.45× 단축), **Scale Out** (10^6 규모 어드레서블 정책 카탈로그를 CPU 캐시·GPU 배치 워킹셋과 분리).
- MoE LoRA 텐서를 packed serving representation 으로 묶어 37,248 → 672 텐서로 줄이면 live engine load 가 8.5-8.7× 빨라진다. 콜드 로드를 *서빙 워크* 로 명시적으로 다루는 게 핵심 기여 중 하나.
- "체크포인트가 아니라 어댑터 revision 을 학습-서빙 경계의 일급 객체로 본다" 는 추상화 한 줄에서 정책 lifecycle, MoE 라우터 replay, DSA 보정, 캐시 tier 가 모두 정렬된다.

## 소개 (Introduction)

후처리 (post-training) 는 한때 사전학습 끝에 한 번 붙이는 단계였지만, 2024-2026 년 사이 다정책·다단계 RL workload 로 진화했다. 프론티어 모델 보고서들은 reasoning, coding, tool use, agentic 평가가 단일 SFT 한 번으로 끝나지 않고, *수십~수백 개의 정책 변종* — 태스크별 fine-tune, 제품 브랜치, 실험 버전, 테넌트별 어댑터, 롤백 포인트 — 을 동시에 굴리는 형태로 굳어졌음을 보여 준다.

기존 인프라가 이런 워크로드를 직격당하는 지점은 명확하다. 어떤 정책 변종이든 *결과물* 이 풀 fine-tuned 체크포인트라면, 학습→서빙 경계마다 모델 전체를 옮겨야 한다. 1T급 베이스에서는 30 GB 짜리 LoRA 어댑터도 8 GB 풀 체크포인트와 자릿수가 다르다. 머지된 LoRA 체크포인트는 학습 메모리는 줄여 주지만 결국 어댑터를 베이스에 합쳐 *합쳐진 풀 체크포인트* 를 옮기므로, 학습-서빙 경계의 byte 부담은 그대로다.

MinT (MindLab Toolkit) 는 이 경계를 통째로 바꾼다. 베이스 모델은 학습/롤아웃/서빙 워커에 한 번 상주하고, 그 위에 학습된 LoRA 만 *어댑터 revision* (정해진 학습 step 에서 freeze 된, serving tensor layout 의 LoRA 스냅샷) 으로 export 한다. 정책 lifecycle 의 모든 단계 — rollout, update, export, evaluation, serving, rollback — 가 한 어댑터 revision 을 지목하면서 진행된다. 이 글은 그 추상화가 어떻게 1T MoE 까지 검증된 학습 곡선, 어댑터-only 핸드오프의 18.3× 가속, 10^6 규모의 정책 카탈로그를 한 시스템 디자인으로 묶는지 정리한다.

## 핵심 기여 (Key Contributions)

- **Adapter revision 을 학습-서빙 단위로 정착시킨 lifecycle.** export → rollout → evaluation → serving → rollback 이 *exported LoRA file* 하나로 일관되게 흐른다. 정책 record 는 그 file 의 정책 메타데이터·rollout record·라우터 정보를 관리하는 service-side state 이다.
- **대규모 multi-LoRA RL 학습.** 단일 베이스를 상주시키고 그 위에서 여러 LoRA 정책을 *time-slice* 한다. Single-worker PEFT 와 분산 Megatron 학습 경로를 모두 지원하며, 235B-A22B GRPO 와 Kimi K2 1.04T countdown-task RL 까지 실측 곡선이 있다.
- **Policy-population multi-LoRA 서빙.** vLLM 엔진을 공유 베이스로 두고 어댑터 revision 을 attach. 어드레서블 카탈로그·CPU 캐시·GPU 배치를 *세 개의 독립적인 capacity dimension* 으로 분리하고, MoE 어댑터의 작은-텐서 폭주를 packing 으로 줄여 live load 를 8.5-8.7× 가속.
- **공개 재현 경로.** Tinker-compatible API 와 `mint-cookbook` 레시피 (SFT, preference optimization, rollout-based RL, AutoResearch) 를 통해 같은 어댑터 lifecycle 위에서 한 set 의 예제를 재현 가능.

## 관련 연구 / 배경 지식

본 논문이 디딘 자리는 *LoRA 학습* 과 *LoRA 서빙* 이 각각 자체 생태계를 갖춘 뒤, 양쪽을 하나의 lifecycle 로 묶는 *서비스* 단계다.

- **LoRA 와 그 변종.** Hu et al. 의 LoRA 는 베이스 가중치를 freeze 하고 저-rank 행렬만 학습한다. AdaLoRA 는 rank budget 을 layer 간에 동적으로 분배, QLoRA 는 4-bit quantized base 위에 LoRA 를 얹어 메모리를 또 한 자릿수 줄인다. "LoRA Without Regret" (Schulman & Thinking Machines Lab, 2025) 는 *LoRA 가 post-training 에서 풀 fine-tune 에 근접한 품질을 낼 수 있다* 는 점을 실증해, LoRA 를 메모리 절감 수단이 아닌 *service-level unit* 으로 보는 본 논문의 전제를 정당화한다.
- **Multi-LoRA 학습 인프라.** mLoRA (Ye et al., 2024) 는 한 배치 안에서 여러 어댑터를 동시 fine-tune. MinT 는 RL workload 가 정책당 rollout token 이 이미 많아 *시간 슬라이싱* 으로도 충분히 efficient 하다는 점을 활용해 다른 길을 택한다.
- **Multi-LoRA 서빙.** Punica (Chen et al., 2024), S-LoRA (Sheng et al., 2023), dLoRA (Wu et al., 2024), LoRAServe (Jaiswal et al., 2025) 는 *이미 존재하는 어댑터* 를 한 베이스 위에서 어떻게 라우팅·메모리 관리할지 다룬다. MinT 는 그 위에 *서빙 카탈로그 ↔ 학습 export* 의 lifecycle 을 얹어, 콜드 미스를 "scheduled service work" 로 만든다.
- **RL execution frameworks.** HybridFlow/verl, AReaL, OpenRLHF, ROLL, StreamRL, Laminar 등은 rollout 스케줄링·실패 격리·colocated/disaggregated 실행 같은 *공통 RL 시스템 문제* 를 다룬다. MinT 는 그 자리에 *LoRA-specific service state* (어댑터 revision, optimizer state, rollout record, MoE route record, DSA 보정 메타데이터) 를 추가한다.
- **Training-serving consistency.** 최근 R3 (Ma et al., 2025) 와 IcePop (Ling Team et al., 2025) 는 MoE 라우터 미스매치·token-level 확률 mismatch 가 RL 안정성을 깨뜨리는 결함임을 정량화했다. MinT 는 그 보정 정책을 rollout record 의 일부로 저장한다.

## 방법 / 아키텍처 상세

### 시스템 개관

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig1-mint-overview.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1: MinT 의 사용자 의도 → 서비스 → 공유 베이스 위 정책 집합 → 인프라 컴포넌트 라는 4-계층 view. 스케줄러·fault tolerance·어댑터 lifecycle·serving residency 는 서비스 인터페이스 뒤에 숨어 있다."
   zoomable=true %}

사용자가 의도 (base model · data + reward · LoRA RL recipe · evaluate + serve 타깃) 를 던지면, MinT 는 그것을 *큐잉된 작업 · 정책 record · exported revision* 으로 변환한다. 베이스 모델은 학습/롤아웃/서빙 워커에 *상주* 하며, 그 위에서 정책 $r\_1, r\_2, \ldots$ 의 집합이 train / evaluate / serve / rollback 의 모든 단계를 같은 어댑터 lifecycle 로 통과한다. 아래쪽 박스 — 스케줄러, fault tolerance, adapter lifecycle, serving residency — 가 인프라의 *복잡도 hidden underneath* 다.

### 학습-서빙 경계: 무엇이 옮겨지는가

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig2-training-serving-paths.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 2: 세 가지 학습→서빙 경로. Full fine-tuning 은 전체 가중치 $W$ 를 변종마다 옮기고, LoRA merge 는 어댑터를 베이스에 합쳐 합쳐진 체크포인트 $W'$ 를 옮긴다. MinT 는 베이스 $W$ 를 양쪽 워커에 상주시키고 어댑터 $L\_i$ 만 옮긴다."
   zoomable=true %}

이 단순한 그림이 본 논문의 추상화 전체를 함축한다. *full fine-tuning* 은 학습 워커가 만든 풀 가중치 $W\_1, W\_2, \ldots, W\_n$ 을 그대로 추론 워커로 이동한다. *LoRA merge* 는 학습 시 메모리는 줄여 주지만, 서빙으로 보내려면 어댑터 $L\_i$ 를 다시 베이스에 머지해 새 풀 체크포인트 $W'\_i$ 를 만들어 옮긴다. *MinT multi-LoRA* 는 베이스 $W$ 를 양 워커 모두 *상주* 시키고 어댑터 $L\_i$ 만 보낸다. 어댑터 byte 만 byte size 가 줄어드는 게 아니다 — 추론 엔진이 베이스를 *이미* 들고 있어 새 어댑터를 슬롯에 admit 만 하면 된다는 점에서 *load 단계 자체가 달라진다*.

### 어댑터 revision vs 정책 record

이 분리는 디자인에서 가장 중요한 결정 중 하나이다.

- **Adapter revision**: 어떤 학습 step 에서 freeze 되고 serving tensor layout 으로 export 된 LoRA 의 *고정된 스냅샷*. 학습 체크포인트가 아니다 — optimizer state 와 rank-local training file 은 제거된 상태로, PEFT 어댑터 file 한 개만 남는다.
- **Policy record**: 그 payload 를 *조회·재로드·롤백 가능* 하게 만드는 service-side state. 호환 베이스 버전, LoRA rank/target modules, 최근 학습 체크포인트 위치, rollout records, exported revisions 목록을 모두 들고 있다.

이 둘이 한 객체로 묶여 있다면 학습 중 모든 update 가 서빙 카탈로그를 oscillate 시켰을 것이다. 분리하면 *훈련 진행 중에도* 안정된 revision 이 카탈로그에 남고, 그 revision 만 evaluation / serving 이 선택한다.

### 시스템 디자인: 서비스 plane vs 컴퓨트 plane

MinT 는 *서비스/제어 plane* (API, queue, policy lookup, resource admission, operation state) 과 *컴퓨트 plane* (PEFT/Megatron trainers, vLLM samplers) 을 분리한다. 그 사이를 잇는 durable storage 는 정책 record, 체크포인트, rollout record, exported adapter file 네 종류를 갖는다. 본 논문이 강조하는 *operation visibility* 는 모든 client call 이 pollable operation id 를 받고, 워커가 결과 file 을 *모두* 쓰고 메타데이터를 commit 한 뒤에야 그 결과가 client 에 visible 해진다는 invariant 이다 — 부분 file 이 카탈로그에 새지 않게 보장한다.

### Scale Up: 1T MoE 까지 LoRA RL

대형 베이스에서 LoRA 가 안 깨지려면 *베이스의 분산 배치* 와 *어댑터 export* 가 정합해야 한다. MinT 는 Megatron 학습 그룹에서 dense module LoRA 는 tensor-parallel shard 를 따라가고, MoE 의 expert LoRA 는 expert id 로 keyed 되어 EP shard 가 들고 있는 expert 만 학습한다. Shared-expert LoRA 는 EP shard 당 한 번씩 저장되어 export 시 deduplicate 된다.

#### MoE 라우터 replay (R3-style)

MoE RL 은 한 가지 함정이 있다. *rollout 시 token 을 처리한 expert path* 와 *학습 시 그 token 을 scoring 하는 expert path* 가 어긋나면, on-policy 가정이 깨진다. MinT 는 rollout record 에 selected expert ids 를 저장하고, 학습 backend 가 그 id 를 자기 EP layout 으로 mapping 할 수 있으면 그 route 를 replay 한다. Mapping 불가능한 token (id 빠짐, 또는 layout 변경) 은 정책-그래디언트 term 에서 mask 처리한다.

#### Sparse-attention provenance (DSA)

GLM-5 / GLM-5.1 의 dynamic sparse attention 도 비슷한 채널을 만든다. 인덱서·top-$k$ 가 어떤 token 을 sparse attention 에 포함시킬지 결정하므로, 수치 차이가 token set 을 바꾸면 rollout/training mismatch 가 생긴다. MinT 는 IcePop-style rollout 보정을 사용한다: 학습/rollout 확률 비율이 신뢰 대역을 벗어나면 그 token 에 importance weight 0 을 부여해 불안정한 scoring term 을 *필터링* 한다. 정확한 token 셋을 재구성하지는 않지만, 불안정한 그래디언트를 제거해 안정성을 회복하는 절충안이다.

### Scale Down: 어댑터-only 핸드오프

#### 핸드오프 byte

Qwen3-4B 에서 rank-32 PEFT 어댑터 file 은 264,310,274 byte (약 252 MiB). 같은 4B 베이스의 bf16 체크포인트는 약 8.0 GB. 어댑터는 *베이스 가중치 floor 의 약 3.3%*. Rank-1 + tighter target module 이면 약 0.10% 까지 떨어진다 — abstract 의 "1% 이하" 주장이 보수적이라는 의미다.

#### 동시 multi-policy 학습 시간 슬라이싱

한 트레이너 actor 가 베이스 모델 $W$ 를 상주시킨 채 LoRA A → switch → LoRA B → switch → LoRA A 순서로 시간 슬라이스한다 (논문 figure 5). 정책 switch 마다 이전 정책의 LoRA tensor·optimizer state·gradient·rollout record 를 정책 record 로 commit 하고, 다음 정책의 state 를 restore. 베이스는 GPU 메모리에 그대로 남아 *정책 switch 비용이 베이스 reload 비용을 포함하지 않는다*.

#### 동시 학습 타임라인 측정

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig7-concurrent-multi-lora-timeline.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7: 동일한 베이스 모델 할당 하에서 3개의 GRPO 정책을 순차 (Seq.) vs MinT concurrent 로 실행한 타임라인. Qwen3-4B 는 51.4 → 28.9 분 (1.77× 가속, 22.4 분 절약), Qwen3-30B 는 168.8 → 116.8 분 (1.45× 가속, 52.0 분 절약). 두 경우 모두 peak memory 는 동일 (65.6 GiB / 68.0 GiB)."
   zoomable=true %}

핵심은 peak memory 가 변하지 않으면서 wall time 만 줄어든다는 점이다. 순차 schedule 의 *idle gap* 에 다른 정책의 rollout/update/evaluation 단계가 채워 들어가 self-pipelining 이 되는 구조다.

#### 어댑터-only vs 머지-and-load 핸드오프

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig8-adapter-handoff-vs-merge.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 8: 한 학습 step 후 sampler 에게 새 정책을 넘기는 두 경로의 wall time. Qwen3-4B 에서 어댑터-only 4.1s vs merge 74.9s (18.3× 빠름). Qwen3-30B 에서 어댑터 208.7s vs merge 595.5s (2.9× 빠름)."
   zoomable=true %}

표 4 (논문 본문) 는 더 자세한 분해를 준다: Qwen3-4B 의 경우 어댑터 path 는 *materialization/load 0.036s + cold first sample 4.114s*, 머지 path 는 *materialization/load 71.820s + cold first sample 55.704s*. 머지 path 의 71.8 초가 *온전히* 어댑터를 베이스에 합치고 새 풀 체크포인트를 sampler 에 admit 하는 데 쓰인다. 같은 모델 추론 throughput (warm 15,568 vs 20,595 tok/s) 을 비교하면 머지가 *더 빠른 throughput* 을 보이긴 하지만, 그 차이는 sampling 절약분이 핸드오프 비용을 회수할 만큼 짧은 run 에서는 무의미하다.

### Scale Out: 정책 집합 서빙

#### 세 cache tier

| Tier | Scale | Lifetime | Promotion / eviction |
|------|-------|----------|----------------------|
| Addressable catalog | $10^3 - 10^6$ entries | Durable (control plane) | Adapter export 시 promote, manual retire |
| CPU adapter cache | 엔진당 수백 개 | Actor run lifetime | Router / cache-miss load 시 promote, LRU evict |
| GPU batch | $\le 64$ distinct | One decoding step | Batch scheduler 가 promote, step 끝에 release |

표 2 (논문) 가 명시하듯 *어드레서블 카탈로그 크기* 와 *동시 GPU 거주* 는 다른 capacity dimension 이다. $10^6$ 은 *얼마나 많은 정책 이름이 resolvable 한가* 지, *얼마나 많이 동시에 GPU 에 살아 있나* 가 아니다.

#### Warm vs cold 경로 측정

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig13-warm-vs-cold.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 13: 좌: CPU 캐시된 요청 p95 21.35s vs cache-miss 199.81s. 중: 카탈로그가 1k → 100k 로 커져도 warm/cold 두 regime 은 안정. 우: 16 개 distinct cold adapter 는 1.36 s/adapter 의 staircase 형태로 직렬화되어 23.27 초까지 누적."
   zoomable=true %}

세 panel 의 메시지는 명확하다 — 카탈로그 사이즈는 *이름 해결 (name resolution)* 의 scale 이지 *실행* 의 scale 이 아니다. 동시에 도착한 cold adapter 16 개는 *동시 로드되지 않고* 순차로 staircase 처럼 누적되므로, cold-load 자체를 backpressure 와 deduplication 이 있는 *scheduled service work* 로 다루는 게 정답이다.

#### MoE 의 작은-텐서 폭주

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/tab7-packed-moe-lora-loading.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 7: Packed MoE LoRA representation 의 효과. File size 는 거의 같지만 (110.75 → 105.58 MB, 1.05×) 텐서 객체가 37,248 → 672 로 55.4× 줄어, read tensors 54.8× / build loader objects 29.5× / live engine load 8.5-8.7× 가속."
   zoomable=true %}

MoE LoRA 가 cold path 를 *눈에 띄게* 만드는 이유다. rank-1 어댑터도 expert tensor 수천 개로 fragment 되어, 학습-쪽 byte 는 작아도 서빙-쪽 Python object 생성·loader 등록 비용이 폭증한다. Packing 은 *선언된 byte* 는 거의 그대로 두면서 *텐서 객체* 만 한 자릿수 줄여 cold-load staircase 의 단위 비용을 떨어뜨린다.

## 학습 목표 / 손실 함수

본 논문은 새 loss 를 제안하지 않는다 — 기존 SFT loss, DPO reward-margin, GRPO (또는 PPO 변종) 의 group relative policy optimization 을 LoRA 어댑터에 적용할 뿐이다. 다만 *MoE RL 에서 정확히 어느 logit 으로 scoring 하는가* 가 안정성에 결정적이므로, 그 식별이 정책-그래디언트의 형태를 결정한다:

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_{\text{rollout}}} \left[ \sum_t \nabla_\theta \log \pi_\theta(a_t | s_t; \,\text{route}_t) \cdot A_t \right]
$$

여기서 $\text{route}\_t$ 는 rollout 시 expert path 다. MinT 는 이를 rollout record 에 저장하고 학습 시 가능하면 replay, 불가능하면 그 token 을 mask. DSA mismatch 보정 (IcePop) 의 경우:

$$
\begin{aligned}
w_t &= \mathbb{1}\!\left[\, \rho_t \in [\rho_{\text{lo}}, \rho_{\text{hi}}] \,\right], \\
\rho_t &= \frac{\pi_\theta^{\text{train}}(a_t | s_t)}{\pi_\theta^{\text{rollout}}(a_t | s_t)}
\end{aligned}
$$

신뢰 대역 $[\rho\_{\text{lo}}, \rho\_{\text{hi}}]$ 를 벗어난 token 은 $w\_t = 0$ 으로 그래디언트에서 빠진다. 정확한 sparse-attention token set 을 재구성하지 않는 *필터링* 보정이라는 점이 핵심이다.

## 학습 데이터와 파이프라인

| 항목 | 값 |
|------|-----|
| Dense 모델 SFT | Qwen3-4B, FinEval / FinGPT 스위트 (Fineval, FPB, FiQA-SA, TFNS, NWGI) |
| Dense 모델 DPO | Qwen3-4B, chat pairs |
| Dense 모델 GRPO | Qwen3-8B base, DAPO-AIME24 |
| MoE GRPO (30B) | Qwen3-30B-A3B, AIME24 |
| MoE GRPO (235B) | Qwen3-235B-A22B, AIME24, 32-GPU Megatron (TP=4, EP=8, PP=1) + 16-GPU TP=16 vLLM 서빙 |
| 1T countdown-task RL | Kimi K2 (32.6B active), 64-GPU H800 |
| Serving 실험 | Qwen3-30B rank-1 MoE LoRA, 4-GPU TP=4 serving actor, prompt len 1024, max output 64 |
| Cookbook | LawBench AutoResearch (28 experiments, 6 kept), DAPO-AIME24, chat-DPO, FinGPT |

## 실험 결과

### Scale Down: 핸드오프 비용

| Model | Path | Checkpoint size | Materialization or load | Cold first sample | Sample tok/s (total/warm) |
|-------|------|-----------------|-------------------------|-------------------|---------------------------|
| Qwen3-4B | Adapter | 252 MiB | 0.036 s | 4.114 s | 15,568 / 15,567 |
| Qwen3-4B | Merge | 8.061 GB | 71.820 s | 55.704 s | 4,697 / 20,595 |
| Qwen3-30B | Adapter | 1.692 GB | 46.455 s | 117.304 s | 1,874 / 5,700 |
| Qwen3-30B | Merge | 61.084 GB | 402.245 s | 156.074 s | 1,573 / 6,904 |

머지 path 는 *warm sampling throughput* 이 더 높지만 (4B: 20,595 vs 15,567 tok/s) 핸드오프-+-cold-first-sample 합이 너무 커서 짧은 RL step 에서는 어댑터 path 가 압도적으로 유리하다.

### Scale Up: 학습 곡선

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/fig10-moe-rl-curves.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 10: MoE RL 학습 곡선. Qwen3-30B-A3B 와 235B-A22B 는 AIME24 mean@1, Kimi K2 1T 는 countdown-task reward. 30B 는 ~0.6 → 0.9 mid-band, 235B 는 peak 0.967 mean@1 (AIME24 포화에 가까움)."
   zoomable=true %}

세 panel 의 메시지: *같은 LoRA RL 경로* 가 30B sparse → 235B-A22B Hopper deployment → 1T-class base 까지 학습-서빙 핸드오프를 *변경 없이* 통과한다는 점이다. Dense 결과는 Table 5 (논문) 로 따로 보고 — SFT 5개 FinGPT 벤치마크 모두에서 약 +20 ~ +36 정확도 (예: FinEval 0.4226 → 0.7811), DPO chat pairs reward margin -0.03 → 30.88, GRPO AIME24 train accuracy 0.11 → 0.47 (best raw 0.568 at step 76).

### Scale Up 검증된 모델 패밀리

{% include figure.liquid loading="eager"
   path="assets/img/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/tab1-model-family-support.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1: MinT 스택이 현재 검증한 세 가족. Qwen3 (dense + MoE, 0.6B-235B-A22B), Moonlight & Kimi K2 (MLA MoE, up to 1.04T), GLM-5/5.1 (MLA, DSA, MTP, MoE). 모델별로 어떤 어댑터/서빙 경로가 검증됐는지 명시."
   zoomable=true %}

### Scale Out: 정책 집합 서빙

| Metric | Measurement |
|--------|-------------|
| 카탈로그 sweep | 1k → 100k entries 모두 warm regime 유지 |
| CPU 캐시 (512-adapter hotset) | 369 / 550 loaded adapters |
| Same-batch GPU active | 16, 32, 64 모두 0 error |
| Cold-cache p95 | 199.81 s (warm 21.35 s 의 ~9.4×) |
| Cold staircase (16 distinct) | 1.375 → 23.267 s, ~1.36 s/adapter |
| Packed MoE LoRA live load | 0.156-0.164 s (vs 1.36-1.39 s, 8.5-8.7× 가속) |

Appendix table 13 은 이를 *2300-distinct-adapter active wave* 가정 하에서 $10^6$-entry 카탈로그로 외삽한 fleet-level sizing sketch 를 준다 (warm distinct concurrency 36 engines / 144 GPUs, cold-load isolation 72 engines / 288 GPUs).

## 결과 분석 / Ablation

세 axis 의 측정이 *각자 다른 시스템 문제* 를 분리해 보여 준다는 점이 가치다.

- **Scale Down** 의 18.3× / 2.85× 가속은 *어댑터 byte* 자체에서 오는 게 아니다. Table 4 를 보면 어댑터 path 의 cold first sample (4.1s, 117.3s) 은 머지 path (55.7s, 156.1s) 와 같은 자릿수다. 격차의 본체는 *materialization / load* 단계 (4B: 71.8s vs 0.036s, 30B: 402.2s vs 46.5s) 다. 즉 진짜 saving 은 "어댑터 file 이 작다" 가 아니라 "베이스가 이미 sampler 에 있어서 merge+load 단계 자체가 사라진다" 는 것.
- **Concurrent multi-LoRA** 의 1.77× / 1.45× 는 *idle gap 채우기* 다. 동일 peak memory 에서 wall time 만 단축되는 게 그 증거 — 더 큰 베이스 슬롯을 잡아 throughput 을 늘린 게 아니다.
- **Packed MoE LoRA** 의 8.5-8.7× live load 가속이 *file size 1.05× 감소* 에서 오지 않는다는 점이 핵심 해석이다. Read tensors 54.8× / build loader objects 29.5× 가속이 dominates — 즉 보틀넥은 byte transfer 가 아니라 *작은 텐서 객체의 Python-side fanout* 이다.
- **Carousel 효과 부재.** 카탈로그가 1k → 100k 로 100배 커져도 warm p95 는 (20.89s → 12.16s → 12.12s) 로 *오히려 약간 감소*. 이름 해결과 로컬 캐시가 *완전히 분리됐기* 때문에 카탈로그 크기가 라우팅에 비용을 추가하지 않는다는 강한 증거.

## 한계와 비판적 평가

- **베이스 모델 호환성이 lifecycle 의 전제.** "어댑터 revision 만 옮긴다" 는 추상화는 *base 가 binary 동일* 일 때만 성립한다. Base 가 fix 되는 동안 어댑터 catalog 가 누적되는 것은 강력하지만, base 자체를 swap 하는 시나리오 — 새 사전학습 release, quantization 변경, MoE expert 재배치 — 는 lifecycle 의 약점이다. 본 논문은 그 시나리오를 다루지 않는다 (rollback 은 어댑터 revision 끼리만).
- **DSA 보정의 정확성 한계.** IcePop-style filter 는 *불안정한 token 을 mask* 할 뿐, sparse-attention 의 정확한 token set 을 복원하지 않는다. 즉 학습이 실제로 어떤 attention pattern 으로 update 됐는지에 대한 ground truth 는 없다. 본 논문도 이를 인정한다 ("It does not prove that training used the exact sparse-attention token set selected by the inference engine"). 안정성을 위한 절충안이지 완전한 정합성이 아니다.
- **단일-vendor 검증.** Qwen, Moonlight/Kimi, GLM — 모두 중국계 frontier 모델로, 학습/서빙 패턴이 비슷할 가능성이 높다. Llama-3, Mistral, Claude family 같은 다른 family 에서 같은 lifecycle 가 어떤 마찰을 겪는지는 미지수.
- **콜드 staircase 의 절댓값.** "1.36 s/adapter" 는 작은 듯 보이지만 16 distinct cold adapter 가 동시에 도착하면 23 초 staircase 다. 100 distinct 동시 도착 시나리오 (예: 새 배포 직후 traffic spike) 의 sizing 은 Appendix 외삽에 의존하며 실측이 아니다.
- **Cookbook coverage.** Public 재현 경로가 cookbook 으로 묶여 있다는 건 좋지만, *실제 서비스 코드* (스케줄러, queue, policy lookup) 는 비공개로 보인다 — `mint-cookbook` 은 recipe 묶음일 뿐 system 자체가 아니다. 따라서 inn-house 재현은 cookbook + Tinker API 의 조합으로만 가능.
- **Cost 보고 부재.** "1.77× 빠르다" 는 wall-time 비교지 *달러* 가 아니다. 동일 베이스 할당 가정에서는 직접적인 GPU-시간 절약이 나오지만, autoscaling 환경에서 concurrent multi-LoRA 가 idle 베이스 deployment 를 *재사용* 하는 만큼 어떻게 절약되는지의 회계는 빠져 있다.
- **MoE shared-expert export 의 정합성 verification.** EP shard 별로 한 번씩 저장된 shared-expert LoRA 가 *완전히 동일* 한지 (학습 중 동기화 보장) 에 대한 결함 모드 측정은 없다. *export path 가 deduplicate 한다* 는 기술 명세는 있지만 mismatch 가 발생할 수 있는 시나리오와 그 detection 메커니즘은 명시되지 않음.

## 시사점 / Takeaways

- **"어댑터 revision = 학습-서빙 경계의 일급 객체" 라는 추상화가 본 논문의 진짜 기여다.** 그 한 줄에서 시간 슬라이싱, MoE 라우터 replay, DSA 보정, 세 개의 캐시 tier, cold-load scheduling 까지 모두 정렬된다. 후속 multi-tenant post-training 인프라가 비슷한 디자인 결정을 할 가능성이 높다.
- **MoE LoRA 의 실제 비용은 byte 가 아니라 텐서 fanout 이다.** rank-1 어댑터도 expert 별로 fragment 되어 Python 객체 폭증·loader 등록 비용을 만든다. Packing 으로 *선언된 byte* 는 그대로 두고 *객체 수* 만 줄이는 게 8.5× 가속의 본체. 작은 어댑터를 *어떻게 표현하는가* 가 점점 중요해질 것이다.
- **Concurrent multi-policy RL 은 free lunch 에 가깝다.** Peak memory 변화 없이 1.45-1.77× wall time 단축이 *idle gap 채우기* 만으로 나온다. 동일 베이스 할당으로 여러 정책을 굴리는 시나리오라면 거의 모든 팀이 적용할 수 있는 단순한 정렬이다.
- **카탈로그 크기와 실행 capacity 를 *반드시* 분리해라.** $10^6$ entries 어드레서블 ≠ $10^6$ GPU 거주. 같은 capacity dimension 으로 묶이는 디자인은 곧바로 scaling wall 을 친다.
- **Tinker-style "service-interface" post-training 이 진짜로 운영되고 있다.** Thinking Machines Lab 의 Tinker 발표 이후 1년이 안 된 시점에 *그 인터페이스가 1T MoE 까지 검증된 multi-tenant 인프라 위에서 돌아간다* 는 보고는, post-training-as-a-service 가 본격적인 운영 단계로 들어섰다는 신호다.

## 설치 및 사용법

`mint-cookbook` 은 recipe 묶음이지 서비스 자체는 아니지만, Tinker-compatible API 위에서 같은 lifecycle 을 호출할 수 있다 (실제 service 는 비공개로 보임):

```python
# Tinker-compatible client 사용 예 (논문 §3 의 API 모양)
client = mint.Client(api_key="...")

# 1) 정책 record 생성
policy = client.policy.create(
    base_model="Qwen3-30B-A3B",
    lora_rank=16,
    lora_target_modules=["attention", "mlp"],
    recipe="grpo",
    data="dapo-aime24",
)

# 2) train step 시작 (pollable operation id 반환)
op = client.train.step(policy_id=policy.id, batch_size=64)
result = client.operation.wait(op.id)

# 3) 어댑터 export 와 serving 등록
revision = client.policy.export(policy_id=policy.id)
client.serving.register(revision_id=revision.id)

# 4) 같은 베이스 위에서 다른 정책 시작 (time-slice)
policy2 = client.policy.create(base_model="Qwen3-30B-A3B", ...)
client.train.step(policy_id=policy2.id, batch_size=64)
```

`mint-cookbook` repo 에는 SFT (FinEval), DPO (chat pairs), GRPO (DAPO-AIME24), LawBench AutoResearch 의 maintained recipe 가 들어 있다.

## 참고 자료

- 논문: [arXiv:2605.13779](https://arxiv.org/abs/2605.13779)
- Cookbook: [github.com/MindLab-Research/mint-cookbook](https://github.com/MindLab-Research/mint-cookbook)
- 관련 Tinker 발표 (Thinking Machines Lab, 2025): [thinkingmachines.ai/blog/announcing-tinker](https://thinkingmachines.ai/blog/announcing-tinker/)

## 더 읽어보기

- **[LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)** (Hu et al., ICLR 2022) — 본 논문이 service 단위로 다루는 LoRA 의 원전. Frozen base + 저-rank 어댑터의 추상화 그 자체.
- **[QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314)** (Dettmers et al., NeurIPS 2023) — 4-bit quantized base + LoRA. 본 논문의 "어댑터-only handoff" 추상화와 직교하지만 자주 함께 등장.
- **[Punica: Multi-Tenant LoRA Serving](https://arxiv.org/abs/2310.18547)** (Chen et al., MLSys 2024) — Multi-LoRA 서빙의 시초. 여러 어댑터를 한 베이스 위에서 batching 하는 GPU 커널.
- **[S-LoRA: Serving Thousands of Concurrent LoRA Adapters](https://arxiv.org/abs/2311.03285)** (Sheng et al., 2023) — 천 개 단위 LoRA 동시 서빙. MinT 의 카탈로그-CPU-GPU 3-tier 분리의 직계 선조.
- **[Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180)** (Kwon et al., SOSP 2023) — vLLM 의 원전. MinT 가 다정책 서빙 엔진으로 사용하는 vLLM 의 메모리 추상화.
- **[Compress then Serve: Serving Thousands of LoRA Adapters with Little Overhead](https://arxiv.org/abs/2407.00066)** (Gabrielsson et al., 2024) — LoRA 어댑터를 압축해 서빙. MinT 가 다루지 않는 *byte-level* 압축 축의 직교 작업.

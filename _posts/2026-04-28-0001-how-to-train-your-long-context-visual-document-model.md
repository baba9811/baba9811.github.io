---
layout: post
title: "[논문 리뷰] How to Train Your Long-Context Visual Document Model"
date: 2026-04-28
description: "344K 컨텍스트의 시각 문서 VLM 을 어떻게 훈련하는가 — CPT/SFT/LongPO 와 self-improvement 까지의 첫 대규모 공개 레시피."
tags: [long-context, vlm, document-understanding, sft, cpt, preference-optimization, multimodal]
categories: paper-review
giscus_comments: true
related_posts: true
thumbnail: assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/fig1-checkpoints-overview.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0001-how-to-train-your-long-context-visual-document-model/
en_url: /en/papers/0001-how-to-train-your-long-context-visual-document-model/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Austin Veselka (LightOn) |
| 학회 | arXiv preprint · 2026 |
| arXiv | [2602.15257](https://arxiv.org/abs/2602.15257) |
| Code & 모델 | [lightonai/distilabel · lc_sft_pipelines](https://github.com/lightonai/distilabel/tree/lc_sft_pipelines), [HF collection: lightonai/orion](https://huggingface.co/collections/lightonai/orion) |
| 리뷰 일자 | 2026-04-28 |

## TL;DR

- **무엇을:** 24B–32B 규모의 VLM 을 최대 **344K 토큰** 컨텍스트까지 확장해 long-document VQA 에 특화시키는 첫 대규모 공개 레시피. CPT, SFT, LongPO, 그리고 self-improvement 까지 모두 다룬다.
- **어떻게:** 250K PDFs / 16M pages 에서 합성 데이터를 만들고, **recursive answer generation** 파이프라인으로 long-context QA 를 distillation. Mistral 24B 와 Qwen3 VL 32B 두 가족에 대해 동일 레시피를 검증.
- **결과:** Qwen3 VL 32B 베이스로 plain distillation SFT 를 돌린 체크포인트가 MMLBD-C / MMLongBenchDoc 에서 **Qwen3 VL 235B A22B 와 동급의 SOTA** 를 달성. 24B 대에서는 GLM 4.1V Thinking 9B 를 능가.
- **놀라운 발견 4 가지:** ① 평가 길이에 맞춘 컨텍스트로 학습하는 것이 더 긴 컨텍스트로 학습하는 것보다 1.4-3.0 점 우월하다. ② **page index 한 줄을 prepend** 하는 것만으로 +2.8 점. ③ 시각 LC 학습이 **텍스트 LC 로도 전이** (HELMET +11.5 점). ④ 자체 합성 파이프라인만으로 **self-improvement 가능** (외부 teacher 없이 +3.2~3.8 점).

## 소개 (Introduction)

LLM 에서 long context 는 요약, in-context learning, QA 의 토대다. 그동안 cheaper attention (Linear, Mamba), context extension (YaRN), CPT/SFT 데이터/레시피, preference optimization (LongPO 등) 같은 많은 라인이 발전해 왔다. 그런데 **PDF 같은 긴 시각 문서**는 이야기가 다르다. 텍스트 LLM 으로 PDF 를 처리하려면 OCR/파싱이 끼어들면서 정보 손실과 비용이 발생한다. 반면 VLM 은 페이지 이미지를 그대로 받아 처리할 수 있으니 자연스러운 fit 이다. 그러나 video 도메인을 제외하면 long-context VLM 연구는 드물고, 최근 등장한 Qwen3 VL 과 GLM 4.5/6V 가 GPT-4o 와 Claude 를 MMLongBenchDoc 에서 처음으로 추월했지만 — **데이터 파이프라인과 학습 레시피는 공개되어 있지 않다**.

이 논문은 그 빈자리를 메운다. "긴 시각 문서 모델을 실제로 어떻게 훈련해야 하는가?" 에 대해, **CPT (continued pretraining), SFT, LongPO, self-improvement** 네 가지 방법론을 24B Mistral 과 32B Qwen3 VL 두 가족에 적용한 대규모 ablation 결과를 공개한다. 144K-344K 컨텍스트, 100B 토큰 학습 스케일, 다섯 개 시각 LC 벤치마크 + HELMET + LongBench v2 로 구성된 평가 suite — 사실상 학계에서 보기 드문 산업 스케일의 실험이다. 그리고 ablations 에서 나온 4 가지 takeaway 는 (논문 제목에 "How to Train Your" 가 들어간 만큼) 지극히 실용적이다.

리뷰어 입장에서 이 논문이 흥미로운 이유는 단순한 SOTA 갱신이 아니다. 첫째, **train context = eval context** 라는 직관에 반하는 결과 (이전 ProLong 논문은 더 긴 컨텍스트로 학습하라고 했다). 둘째, **page index 한 줄 추가**라는 거의 0 비용의 트릭이 +2.8 점이라는 큰 효과를 낸다는 점. 셋째, 본인들이 직접 구축한 **MMLBD-C** 라는 정정 벤치마크를 함께 공개하면서 평가 자체의 품질 문제를 드러냈다는 점. 세 가지 모두 단순한 hyperparameter sweep 으로는 도달할 수 없는 발견이다.

## 핵심 기여 (Key Contributions)

- **Open recipes + 대규모 ablations.** 344K 컨텍스트까지의 CPT/SFT/LongPO end-to-end 레시피를 공개. 100B 토큰 / 50K 샘플 스케일의 ablation 들을 leaderboard 형태로 모두 공개.
- **Page indices.** 각 페이지 앞에 `Page N:` 한 줄을 prepend 하는 것만으로 MMLBD-C +2.8, 시각 LC 평균 +2.8.
- **벤치마크 컨텍스트 길이 타게팅.** 평가 벤치마크와 비슷한 길이로 학습하는 것이 더 긴 컨텍스트로 학습하는 것보다 시각 LC 평균에서 1.4-3.0 점 우월.
- **MMLBD-C 공개.** MMLongBenchDoc 의 1091 예제 중 251 개를 수정하고 16 개를 제거. 공개 검사 가능.
- **Self-improvement.** 합성 데이터 파이프라인이 self-improvement 를 가능하게 함 (Mistral CPT +3.8, SFT +3.2 시각 LC 평균).
- **Visual LC → Text LC 전이.** 시각 long-context 학습이 text long-context 성능을 끌어올린다 (HELMET +11.5). 이는 (Zhang et al., 2024a) 의 텍스트 → 영상 전이의 역방향.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/fig1-checkpoints-overview.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 1. 본 연구의 베스트 학습 레시피 vs 베이스 모델 vs 직전 SOTA Qwen3 VL 235B A22B. SFT + CPT 가 LongPO 를 능가하면서 MMLBD-C 에서 새로운 SOTA 를 갱신."
   zoomable=true %}

## 관련 연구 / 배경 지식

### Long-context VLM 의 현재 위치

기존 long-context VLM 연구의 대부분은 **video 도메인** (긴 영상 이해) 에 집중되어 있었다. 반면 long-document understanding (논문, 보고서, 매뉴얼 같은 긴 PDF) 은 video 와 통계적 특성이 다르다 — 페이지가 정적이지만 텍스트 밀도가 높고, 표/그림/숫자 같은 정밀 정보가 많고, 문서 내 cross-page reference 가 흔하다. Docopilot (Ge et al., 2024) 정도가 직접적인 선행 연구지만 본 논문은 학습 스케일과 평가 폭에서 그것을 크게 뛰어넘는다.

### 합성 데이터의 long-context 적용

Magpie (Xu et al., 2024) 를 비롯한 instruction synthesis 가 SFT 표준이 된 가운데, long-context 에 특화된 합성 데이터 기법으로 LongAlign (Bai et al., 2024), ProLong (Gao et al., 2025b) 등이 있었다. 본 논문은 여기에 **multi-page question generation** 과 **recursive answer generation** 두 신규 파이프라인을 추가하며, 특히 후자가 self-improvement 의 핵심이 된다.

### LongPO

LongPO (Chen et al., 2025) 는 DPO (Rafailov et al., 2024) 를 long-context 에 맞게 조정한 preference optimization. **chosen response 는 short context** 에서 (질문이 만들어진 그 부분만 보여주고) 생성하고, **rejected response 는 long context** (전체 문서) 에서 생성한 뒤, reference model 의 OOD 점수 문제를 피하기 위해 reference 점수도 short context 기반으로 계산한다. 손실 함수는 다음과 같다.

$$
\mathcal{L}_{\text{LongPO}}
= -\lambda \, \mathbb{E}\!\left[
\log \sigma\!\left(
\beta \log \frac{\pi_\theta(y_w \mid x_L)}{\pi_{\text{ref}}(y_w \mid x_S)}
- \beta \log \frac{\pi_\theta(y_l \mid x_L)}{\pi_{\text{ref}}(y_l \mid x_S)}
\right)
\right]
+ \mathcal{L}_{\text{NLL}}
$$

여기서 $x_S, x_L$ 은 short/long context 입력, $y_w, y_l$ 은 chosen/rejected 응답, $\lambda = 0.01$ 로 preference term 의 가중치를 NLL 보다 훨씬 작게 잡는다. 직관적으로 "**short context 에서 잘하는 행동을 long context 에서도 보존**" 하라는 정렬이다.

### MMLongBenchDoc 와 MMLBD-C

MMLongBenchDoc (Ma et al., 2024b) 은 long-document VQA 의 사실상 표준 벤치마크. 본 논문은 1091 개 예제 중 **document mismatch (질문이 잘못된 PDF 와 페어링), underspecified question, 오타, 잘못된 정답** 같은 문제를 발견하고 251 개를 수정 + 16 개를 제거해 **MMLBD-C** 를 공개한다. (논문에서 든 예시 — "least cost" 가 사실은 "lease cost" 의 오타였던 케이스 — 만 봐도 노이즈가 점수에 끼치는 영향이 크다.) MMLBD-C 점수는 일반적으로 원본 MMLongBenchDoc 보다 약간 높지만, 두 점수의 상관은 매우 높아 추세 비교에는 동등하게 쓸 수 있다.

## 방법 / 아키텍처 상세

### 베이스 모델과 컨텍스트 확장

- **Mistral Small 3.1 24B**: 원래 128K 컨텍스트. 이 논문에서 **344K 까지 확장**. Base 체크포인트가 공개되어 있어 CPT 의 시작점으로 사용.
- **Qwen3 VL 32B Instruct**: 원래 256K 컨텍스트. base 가 공개되어 있지 않아 instruct 에서 시작하며 **컨텍스트는 그대로 유지** (RoPE θ 도 그대로).

Mistral 의 RoPE θ 는 이미 $10^9$ 로 매우 크게 설정되어 있어 추가 조정 없이 344K 까지 학습 가능했다. 이는 Mistral 의 사전학습 시점부터 long context 를 염두에 둔 설계의 이점.

### Multi-stage 학습

344K 같은 길이는 sequence parallelism (SP) 16-48 degree 가 필수인데, communication overhead 가 너무 크다. 이를 완화하기 위해 모든 학습을 두 단계로 나눈다.

- **Stage 1 (short)**: 최대 104 페이지, 128K 토큰 packed sequence
- **Stage 2 (long)**: 최대 336 페이지, Mistral 은 336K, Qwen3 VL 은 256K

이 두 단계 분할은 단순한 효율 트릭이지만, 뒤에서 다룰 **"short stage 만 쓰는 것이 더 좋다"** 라는 발견의 토대가 된다.

### Model merging

CPT, SFT, LongPO 를 그냥 적용하면 instruct 능력에 대한 catastrophic forgetting 이 일어난다. 본 논문은 **task vector merging** (Ilharco et al., 2023) 으로 이를 해결한다 — 학습된 체크포인트에서 베이스 (또는 instruct) 의 weight 를 빼서 "training vector" 를 얻고, 이걸 instruct 모델에 scaling factor (Mistral CPT 는 0.5, 그 외엔 0.25) 로 합치는 식이다. 이 단순한 merging 만으로 일반 instruct 성능을 보존하면서 LC 능력을 더한다.

### 데이터 코퍼스

ColPali (Faysse et al., 2025) 를 따라 **arxiv / 정부 보고서 / 금융 / 에너지 / 의료 / AI** 같은 카테고리에서 search query 를 재귀적으로 확장 → 웹 스크래핑 → 중복/렌더링/길이 필터링으로 **250K PDFs · 16M 페이지** 의 코퍼스를 구축. 추가로 **PDFA English (2M PDFs · 18M 페이지)** 를 합쳐 사용한다. **Hard negative** 도입 — DSE 임베딩으로 페이지마다 top-128 유사 페이지를 캐싱해 RAG 시나리오를 흉내낸 distractor 예제를 만든다.

### CPT 의 4 가지 task

이미지+텍스트 long-context 데이터를 어떻게 합성할 것인가에 대한 답.

1. **Fill-in-the-Middle (FIM)**: 한 페이지를 제거하고, 그 페이지의 텍스트를 Mistral 로 파싱해 정답을 만든다. 모델은 제거된 페이지 자리를 채우는 텍스트를 출력해야 한다.
2. **Unshuffle**: 문서 페이지 순서를 섞어서 입력하고 올바른 순서로 정렬하라고 시킨다. **모델 호출 없이 100% programmatic** 으로 데이터 생성 가능.
3. **Key/position-based retrieval**: 특정 key 근처 또는 "10 페이지째 첫 문단" 같은 위치 기반 retrieval.
4. **Counting**: 새로 제안한 task. 페이지마다 어떤 인스턴스의 개수를 라벨링하고, long-context 예제는 페이지별 카운트를 chain-of-thought 로 나열한 뒤 최종 합을 출력하는 식으로 구성.

이중 1, 2, 3 은 페이지 한 장만 annotate 하면 long-context 예제를 무한히 생성할 수 있어 **극도로 scalable** 하다는 장점. 거기에 ProLong (Gao et al., 2025b) 의 LC 텍스트 데이터를 섞어 멀티모달 + 텍스트 통합 CPT 를 한다. **Drop-one ablation 으로 측정한 task 중요도**: FIM > Unshuffle > Key/Position Retrieval > Prolong LC Text > Counting. FIM 을 빼면 -3.0 VA, Unshuffle 을 빼면 -2.1 VA. Counting 은 -0.7 VA 에 그쳐 scalability 가 정말 중요하면 빼도 된다.

### SFT 의 question/answer pipelines

**Question generation:**

- **Magpie (베이스라인)**: VLM 에 페이지를 던져 자유 completion 을 시키면 보통 simulated user question 이 나옴.
- **Single-page**: 무작위 페이지 + 무작위 question archetype prompt (e.g. "단답형 verifiable 한 어려운 질문 + reasoning 요구"). 같은 페이지에 대해 여러 질문을 생성한 뒤 한 개만 keep — **mode averaging 방지**.
- **Multi-page**: 인접 페이지/랜덤/hard negative 페이지 묶음에 cross-page reasoning 을 요구하는 질문 생성. **Verifier**: 작은 VLM (Qwen2.5 VL 7B 또는 Qwen3 VL 32B) 으로 각 페이지를 독립적으로 보고 답을 시켜 본 뒤, 어느 한 페이지로도 답할 수 있는 질문은 버린다 — 진짜 multi-page 질문만 남긴다.

흥미롭게도 Magpie 와 본 논문의 SP+MP 파이프라인 사이의 VA 차이는 미미하다 (Table 17). 진짜 leverage 는 question generation 이 아니라 **answer generation 에 있다**.

**Answer generation:**

- **Plain distillation (베이스라인)**: 전체 long-context 예제를 Qwen3 VL 235B A22B 에 통째로 던져서 답을 생성. 단순하지만 강력한 teacher 가 필요.
- **Recursive pipeline (제안)**: 각 페이지에서 질문에 관련된 evidence 를 개별 추출 + 페이지마다 numerical relevance score 를 매김 → top-k 페이지나 추출된 evidence 만 모아서 Qwen3 VL 235B A22B (멀티모달) 또는 Qwen3 235B (텍스트) 에 답하도록 한다. **본질적으로 RAG-over-pages 를 distillation 으로 모델 안에 심는 것**.

Recursive pipeline 은 plain distillation 보다 VA, LCA, MMLongBench, SlideVQA, LongBench v2 에서 우월하지만 MMLBD-C 에서는 약간 뒤처진다. 더 중요한 것은 **recursive 가 self-improvement 를 가능하게 한다**는 점 — 답이 long-context 전체 검색을 요구하기 때문에, teacher 가 student 와 같은 모델이어도 (즉 self-distillation 이어도) 능력이 향상된다.

### Page indices

각 이미지 앞에 한 줄.

```text
Page 1:
<image>
Page 2:
<image>
Page 3:
<image>
...
```

이게 전부다. 그런데 효과가 크다. 학습과 평가에서 모두 사용했을 때 MMLBD-C +2.8, 시각 LC 평균 +2.8. 학습 없이 평가에만 추가하면 오히려 -1.0 VA — **학습 시점에 page index 를 같이 봐야** 모델이 그것을 활용할 수 있다는 것.

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/tab5-page-indices.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 5. Page index ablation. 학습+평가에서 모두 쓸 때만 의미 있는 게인. 평가에만 추가하면 손해."
   zoomable=true %}

## 학습 목표 / 손실 함수

### CPT 와 SFT

표준 next-token prediction. 단, sequence packing 을 쓰고 truncation 없이 packing 하며, **assistant 토큰 수로 정규화**한다 (instruction tuning 에서 prompt 토큰을 loss 에서 제외하는 일반적인 관행).

### LongPO

위에서 봤듯 (Eq. 1):

$$
\mathcal{L}_{\text{LongPO}}
= -\lambda \, \mathbb{E}\!\left[
\log \sigma\!\left(
\beta \log \frac{\pi_\theta(y_w \mid x_L)}{\pi_{\text{ref}}(y_w \mid x_S)}
- \beta \log \frac{\pi_\theta(y_l \mid x_L)}{\pi_{\text{ref}}(y_l \mid x_S)}
\right)
\right]
+ \mathcal{L}_{\text{NLL}}
$$

핵심은 **분모의 reference policy 에는 short context $x_S$ 를 넣는다**는 것. 일반 DPO 에서 reference 가 long context 에서 OOD 로 동작해 점수가 무너지는 문제를 우회한다. $\beta = 0.1$, $\lambda = 0.01$ — preference 의 영향력은 작게 잡고 NLL 이 주된 driver.

## 학습 데이터와 파이프라인

### 데이터 분포

| 단계 | Unit | 평균 | 중앙값 | 최대 | 예제 수 |
|------|------|------|--------|------|---------|
| Ours: Short Stage | images | 21.1 | 9 | 104 | 52,433 |
| Ours: Long Stage | images | 145.3 | 156 | 336 | 22,076 |
| ProLong: 64K | tokens | 1,350 | 533 | 64K | 83.8M |
| ProLong: 512K | tokens | 1,262 | 484 | 512K | 60.4M |

이 표가 핵심이다. **ProLong 의 "512K stage" 는 maximum 만 512K 일 뿐, median 이 484 토큰**으로 압도적으로 짧은 예제 위주다. 반면 본 논문의 long stage 는 median 156 페이지의 진짜로 긴 예제. 그래서 ProLong 은 "더 긴 컨텍스트로 학습하면 좋다" 고 결론냈고, 본 논문은 "동등한 컨텍스트가 좋다" 고 결론낸다 — **모순이 아니라 분포가 다르기 때문**.

### CPT token 분포

| Task | Short (B) | Long (B) | Total (B) |
|------|-----------|----------|-----------|
| ProLong LC Text | 35.9 | 3.8 | 39.7 |
| Fill-in-the-Middle | 24.3 | 10.1 | 34.5 |
| Key/Position Retrieval | 15.2 | 6.3 | 21.5 |
| Unshuffle | 12.2 | 5.1 | 17.2 |
| Counting | 2.4 | 0.0 | 2.4 |
| **Total** | **90.0** | **25.3** | **115.3** |

100B 시작 예산에서 실제 학습된 분포. ProLong 텍스트가 가장 큰 비중이지만 multimodal task 들의 비중도 비슷한 규모로 유지.

### 하이퍼파라미터

| Phase | Schedule | Max LR | Warmup/Decay | β1 | β2 | WD | Grad Clip |
|-------|----------|--------|--------------|----|----|----|-----------|
| CPT | Cosine | 4e-6 | 10% tokens | 0.9 | 0.999 | 0.1 | 1.0 |
| SFT | WSD | 5e-6 | 10% samples | 0.9 | 0.999 | 0.1 | 1.0 |
| LongPO | WSD | 5e-7 | 10% samples | 0.9 | 0.99 | 0.0 | 1.0 |

Optimizer 는 모두 AdamW (ε = 1e-9). LongPO 의 LR 이 SFT 보다 한 자리 작은 것에 주목. β = 0.1, λ = 0.01 (Eq. 1).

### 컴퓨트

| Phase | Stage | Hardware | SP | DP [shard, replicate] | Batch | Tokens/Batch |
|-------|-------|----------|-----|------------------------|-------|--------------|
| CPT | Stage 1 | H100 | 16 | [16, 6] | 6 | 768K |
| CPT | Stage 2 | H100 | 48 | [16, 6] | 2 | 672K |
| SFT | Stage 1 | H100 | 16 | [16, 3] | 3 | 768K |
| SFT | Stage 2 | H100 | 48 | [16, 6] | 2 | 672K/512K |
| LongPO | Stage 1 | H100 | 48 | [48, 1] | 1 | 128K |
| LongPO | Stage 2 | H200 | 24 | [24, 1] | 1 | 512K |

**Ring attention** (Liu et al., 2023; Zhu, 2024) 으로 sequence parallelism 구현. LongPO 의 batch size 가 1 인 것이 인상적이다 — preference 학습은 batch 내 다양성보다 sequence-level 정렬이 핵심임을 반영.

## 실험 결과

### 평가 protocol

여러 long-context 벤치마크의 raw 점수가 분포가 너무 다르므로, 본 논문은 **각 벤치마크에서 Qwen3 VL 235B A22B 의 점수를 100 으로 normalize 한 뒤 평균** 내는 방식을 도입한다.

- **Visual-LC Avg (VA)**: MMLongBenchDoc, MMLBD-C, MMLongBench, DUDE, SlideVQA 5 개 평균. **본 연구의 primary metric**.
- **LC Avg (LCA)**: 위 5 개 + HELMET + LongBench v2.

3 회 반복 측정 시 σ(VA) = 0.33, σ(LCA) = 0.24 로 안정적이다 (단, MMLongBench 만 σ = 1.66 으로 높은데 task 당 20 sample 로 제한해서 그렇다).

### 핵심 결과: 베스트 체크포인트 비교

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/tab6-best-checkpoints.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 6. 본 연구 베스트 체크포인트 vs 베이스. Qwen3 VL 32B + plain distill SFT 는 MMLBD-C 와 MMLongBenchDoc 에서 235B teacher 와 동급 (또는 능가)."
   zoomable=true %}

요약하면:

- **Qwen3 VL 32B + plain distillation SFT (short stage)**: MMLBD-C 57.3 (Qwen3 VL 32B 베이스 53.8 대비 +3.5), **MMLongBenchDoc 56.3** — 235B teacher 의 56.7 과 거의 동급. 32B 스케일에서 SOTA.
- **LongPO (Qwen3 VL 32B, distill, short stage)**: MMLBD-C 56.4 (+2.6). VA 94.6 으로 SFT 보다 약간 높지만 컴퓨트는 2× 이상 든다.
- **Mistral plain distillation**: MMLBD-C 47.4 (24B 베이스 41.4 대비 +6.0), MMLongBenchDoc 46.8 — **24B 클래스에서 GLM 4.1V Thinking 9B (42.4) 능가**. HELMET +16.0 — 시각 학습이 텍스트 LC 까지 끌어올린 인상적 수치.

### CPT 토큰 horizon ablation

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/tab1-cpt-token-horizons.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 1. CPT 토큰 예산별 결과. 1B 만으로도 VA 는 거의 saturated 되지만, MMLBD-C 와 LCA 는 100B 까지 점진적으로 개선됨."
   zoomable=true %}

- 1B 토큰만으로도 VA 는 10B/100B 와 비슷하게 saturated. 그러나 MMLBD-C 와 LCA 는 100B 까지 꾸준히 개선.
- HELMET (텍스트 LC) 은 100B 에서 +14.6 — 시각 LC CPT 가 텍스트 LC 까지 강하게 transfer 됨.
- Qwen3 VL 에 같은 CPT 데이터로 10B 학습한 결과도 MMLBD-C +2.1, MMLB 128K +1.6 — 다른 model family 에도 transfer 됨.

### Train context vs eval context

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/tab4-short-vs-long-stage.png"
   class="img-fluid rounded z-depth-1"
   caption="Table 4. Short stage 만 학습 vs long stage 추가 학습. SFT/SFT/LongPO 모두 short-only 가 1.4-3.0 점 우월."
   zoomable=true %}

세 가지 시나리오 모두 (Mistral SFT, Qwen3 VL SFT, Qwen3 VL LongPO) **short stage 만** 학습한 쪽이 일관되게 더 강하다. ProLong 의 "더 긴 게 좋다" 와 정반대 결과지만, 위에서 봤듯 ProLong 의 "긴" 데이터는 사실 median 484 토큰의 짧은 데이터였으니 모순이 아니다.

### LongPO vs SFT — compute trade-off

{% include figure.liquid loading="eager"
   path="assets/img/papers/0001-how-to-train-your-long-context-visual-document-model/fig7-compute-vs-va.png"
   class="img-fluid rounded z-depth-1"
   caption="Figure 7. 학습 컴퓨트 (GPU-hours) vs VA. LongPO 는 SFT 보다 +2.1 VA 이지만 2× 이상의 컴퓨트가 필요. 너무 긴 컨텍스트로 학습하면 오히려 점수가 떨어지는 것도 보임."
   zoomable=true %}

LongPO 가 VA 에서는 +2.1 로 SFT 를 이기지만 GPU-hours 는 두 배 이상. **MMLBD-C 단독으로 보면 plain distillation SFT 가 더 효과적**이라는 선택의 트레이드오프가 명확하다.

### Self-improvement

| Checkpoint | VA | MMLBD-C | HELMET |
|------------|-----|---------|--------|
| Self-Improvement (SFT only) | 83.8 (+3.2) | 45.2 (+3.8) | 32.4 (-4.7) |
| Self-Improvement (Instruct + CPT) | 82.9 (+2.3) | 43.3 (+2.0) | 42.3 (+5.3) |
| CPT (100B) self-improving | 84.4 (+3.8) | 42.7 (+1.3) | 51.7 (+14.6) |

**외부 강한 teacher 없이** Mistral 자기 자신과 그 CPT 체크포인트로만 답을 생성해 학습. CPT 100B 가 가장 강하고 (+3.8 VA), SFT 만으로도 +3.2 VA. 정말 자기 자신을 distill 해서 weak-to-strong 으로 끌어올린 것.

### Visual LC → Text LC transfer

ProLong 텍스트 데이터를 **빼고** Mistral 에 시각 LC 데이터만으로 10B 토큰 CPT — HELMET 이 37 → 48.5 로 상승. 즉 CPT 의 HELMET 향상이 단순히 섞은 텍스트 데이터 덕분이 아니라 **시각 LC 학습 자체의 transfer 효과**.

## 결과 분석 / Ablation

### CPT 와 SFT 는 추가적이지 않다

직관적으로 "CPT 로 컨텍스트 늘리고 SFT 로 task 가르치면 더 좋겠지?" 같은 설계가 자연스럽다. 그런데 Table 2 (본문) 결과는: **SFT only 가 SFT + CPT 와 거의 비등** (HELMET 만 예외). Mistral instruct 의 128K 컨텍스트가 MMLongBenchDoc 의 대부분 (100 페이지 이하) 을 커버하기 때문이다. 다만 150-300 페이지 내삽 실험에서는 SFT from CPT 가 약간 우월 → **CPT 가 진짜 효과를 보이는 건 컨텍스트가 instruct 한계를 넘기 시작할 때**. 함의: 컴퓨트 제약이 있고 컨텍스트 한도가 충분하면 CPT 를 건너뛰어도 된다.

### CPT task 중요도

Drop-one ablation: Drop FIM −3.0 VA, Drop Unshuffle −2.1, Drop K/P Retrieval −1.7, Drop LC Text −1.3, Drop Counting −0.7. **Unshuffle** 의 영향이 인상적인 이유 — 모델 호출 없이 100% programmatic 으로 데이터 생성 가능한데도 두 번째로 중요하다. 문서 전체 구조 이해를 강제하는 task 라서.

### Recursive vs Plain distillation

SFT 에서는 Recursive 가 plain 보다 VA +1.1, LCA +1.9 우월. 그런데 LongPO 에서는 두 방법이 거의 동률 (Table 24). 이는 **answer generation 의 정교함이 SFT 에서는 의미 있지만 preference optimization 에서는 묻혀버린다**는 흥미로운 비대칭이다. 본 논문의 실용 권고: **LongPO 는 가장 강한 teacher 만 쓰면 충분, recursive 는 불필요**. 반면 self-improvement 에선 recursive 가 필수.

### Single-page vs multi-page questions

Single-page 만으로 학습했을 때 (Table 16) MMLongBench 점수가 multi-page 만 학습한 것보다 6.8 점 높다. 이는 MMLongBench 가 cross-page reasoning 보다 **retrieval 능력에 더 민감**하다는 평가의 한계를 드러낸다. Single + multi 를 함께 쓰는 것이 robust.

### 외부 SFT 데이터의 양

Table 22 가 미묘하다. 25K 의 외부 데이터를 추가하면 VA −1.2 (해롭다). 그런데 400K 의 외부 데이터를 추가하면 VA +0.2 (약간 도움). **양이 작을 때는 분포 shift 만 일으키고, 양이 크면 일반 능력 보존에 기여**. 함의: 도메인 외 SFT 데이터를 섞으려면 충분히 크게 섞어야 한다.

## 한계와 비판적 평가

저자가 인정한 한계:

- **벤치마크의 길이 부족**. 대부분의 LC 벤치마크가 128K 토큰 이하라, 344K 까지 확장한 컨텍스트의 성능을 끝까지 검증하지 못함.
- **CPT 와 SFT 의 비가법성**. 두 방법이 왜 추가적이지 않은지 정량적 이해가 부족 — mixed-stage training 이나 replay 기법이 필요할 수 있음.

리뷰어 추가 한계:

- **단일 저자 / 단일 코퍼스 의존**. 모든 학습 데이터가 LightOn 자체 코퍼스 + PDFA 라서, 다른 도메인 (기술 문서, 의료 차트, 법률 계약 등) 에서의 일반화는 별도 검증 필요.
- **Page index 의 일반성**. Page index 가 multi-page 벤치마크 (MMLBD-C, MMLB) 에서 +2.8 이지만, **LongBench v2 에서는 −3.0** — 즉 항상 좋은 것이 아니라 page-aware 한 task 에 한정된 게인이다. Section 본문은 이를 살짝 톤 다운한다.
- **Compute 보고의 모호함**. SFT 컴퓨트가 "CPT 컴퓨트는 별도"라고 footnote 처리되는데, total cost 비교에서 SFT 가 LongPO 보다 저렴해 보이는 framing 이 약간 selective.
- **MMLBD-C 의 self-validation 우려**. 본인들이 만든 recursive pipeline 으로 MMLBD-C 를 정정했고 (다행히 manual review 거침), 그 같은 pipeline 으로 학습한 모델로 평가하므로 **도메인 일치로 인한 점수 inflation** 가능성. 다만 plain distillation 도 동일 벤치마크에서 강하니 큰 문제는 아닐 듯.
- **LongPO baseline 의 약점**. SoLoPO 같은 alternative preference method 는 비교 대상에 없음.

## 시사점 / Takeaways

1. **Train context = eval context.** 벤치마크가 짧으면 학습도 짧게. 더 긴 컨텍스트로 "general" 하게 학습하는 것은 over-engineering 이다 (단, 분포가 정말 길게 분포한 데이터일 때만). 평가 길이 매칭이 1.4-3.0 점.
2. **Page index 한 줄로 +2.8.** 거의 0 비용. **단, 학습 시점에 같이 넣어야 한다**. 페이지 인덱스 같은 메타토큰이 평가 시점만 추가될 때 OOD 효과를 일으키는 문제는 일반적인 lesson.
3. **Recursive answer generation 은 self-improvement 의 키.** 강한 teacher 가 없을 때, 자기 자신으로 answer 만 잘 만들면 +3.2~3.8 VA. **단순한 self-distillation 이 아니라, 답 생성 과정에서 page 단위 retrieval algorithm 을 모델 내부로 distill** 하는 발상.
4. **Visual LC ↔ Text LC 양방향 transfer.** Zhang et al. (2024a) 이 보였던 text → vision transfer 의 역방향이 성립한다 (+11.5 HELMET). long-context 능력은 modality 를 넘는 일반적 자질로 보아야 한다.
5. **벤치마크 자체가 신뢰 가능한가?** MMLongBenchDoc 의 1091 예제 중 251 개가 noise 였다. 큰 벤치마크에서 ablation 의 ±0.5 점 차이를 진지하게 받아들이기 전에 — **그 0.5 점이 실제로 모델 능력 차이인지, label noise 인지** 의심해봐야 한다.

## 설치 및 사용법

저자는 Hugging Face 컬렉션과 GitHub repository 를 공개했다.

```bash
# Synthetic data pipelines (distilabel)
git clone -b lc_sft_pipelines https://github.com/lightonai/distilabel.git
cd distilabel
pip install -e .

# Models on Hugging Face
# https://huggingface.co/collections/lightonai/orion
```

체크포인트 로드 예시:

```python
from transformers import AutoModelForCausalLM, AutoProcessor

# 예: Mistral plain distillation 체크포인트 (실제 repo id 는 컬렉션 참고)
model_id = "lightonai/<orion-mistral-checkpoint>"
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype="auto", device_map="auto")
processor = AutoProcessor.from_pretrained(model_id)

# Long-document VQA: 페이지 이미지들을 page index 와 함께 입력
pages = [...]  # PIL 이미지 리스트
prompt_parts = []
for i, img in enumerate(pages, start=1):
    prompt_parts.append(f"Page {i}:\n<image>")
prompt = "\n".join(prompt_parts) + "\n\nQuestion: <your question>"

inputs = processor(text=prompt, images=pages, return_tensors="pt").to(model.device)
out = model.generate(**inputs, max_new_tokens=512)
print(processor.decode(out[0], skip_special_tokens=True))
```

핵심: **`Page N:` prefix 를 학습 때처럼 평가 때도 똑같이 넣어주는 것**. 이게 빠지면 본 논문의 게인을 못 살린다.

## 참고 자료

- 논문: <https://arxiv.org/abs/2602.15257>
- Code (distilabel SFT pipelines): <https://github.com/lightonai/distilabel/tree/lc_sft_pipelines>
- Models (HF collection): <https://huggingface.co/collections/lightonai/orion>
- Mistral Small 3.1 베이스: <https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503>
- Qwen3 VL 32B 베이스: <https://huggingface.co/Qwen/Qwen3-VL-32B-Instruct>

## 더 읽어보기

- **LongPO** (Chen et al., 2025) — short-to-long preference optimization 의 원전. 본 논문의 LongPO 실험은 이 알고리즘을 시각 LC 에 처음 적용한 사례.
- **ProLong** (Gao et al., 2025b) — long-context CPT 데이터 레시피의 표준. 본 논문이 LC 텍스트 데이터를 빌려쓰면서 그 한계 ("긴 데이터의 분포가 사실 짧다") 를 드러냄.
- **MMLongBenchDoc** (Ma et al., 2024b) — long-document VQA 의 사실상 표준 벤치마크. 본 논문이 정정 버전 MMLBD-C 를 공개.
- **Qwen3-VL Technical Report** (Bai et al., 2025a) — 본 논문이 비교 대상으로 쓴 SOTA 모델의 공식 테크리포트. 학습 레시피는 underspecified.
- **GLM 4.5V / 4.1V Thinking** (Z.ai, 2026) — 본 논문이 24B 클래스 비교에서 능가한 또 다른 강한 오픈 VLM.
- **Long context transfer from language to vision** (Zhang et al., 2024a) — 본 논문이 역방향을 보인 transfer 연구의 원본.

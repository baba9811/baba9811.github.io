---
layout: post
title: "[논문 리뷰] DAPO: Improving Multi-Step Reasoning Abilities of Large Language Models with Direct Advantage-Based Policy Optimization"
date: 2026-09-17 09:40:12 +0900
description: "단계별 advantage와 정책 log-ratio를 맞추는 offline RL: DAPO의 critic 학습, 단조 개선 정리의 조건, 수학·코드 실험과 계산 비용 분석."
tags: ["large-language-models", "reinforcement-learning", "reasoning", "offline-rl", "credit-assignment", "value-function"]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig1-pipeline.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/
en_url: /en/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Jiacai Liu et al. (저자 8명, Skywork AI · Fudan University) |
| 학회 | NeurIPS · 2025 |
| arXiv 또는 DOI | [10.52202/085713-2401](https://doi.org/10.52202/085713-2401) |
| Code | [NeurIPS 보충자료의 main.py](https://proceedings.neurips.cc/paper_files/paper/2025/file/6789f033ebde742552e5db84fb5d414a-Supplemental-Conference.zip) |
| 데이터 | MATH 학습 문제 7,500개 · TACO 코드 문제 약 4,000개 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-09-17 |

## TL;DR

- DAPO는 <strong>Direct Advantage-Based Policy Optimization</strong>이다. critic을 먼저 학습하고 고정된 단계별 advantage 데이터로 actor를 최적화하는 offline RL 방법이다. 같은 약칭을 쓰는 Decoupled Clip and Dynamic sAmpling Policy Optimization과는 다른 연구다.
- 정답 여부를 전체 풀이의 모든 단계에 일괄 적용하는 대신, 같은 문맥에서 가능한 다음 단계들의 예상 성공률을 비교한다. 학습 목표는 advantage를 beta로 나눈 값과 reference 대비 정책 log-ratio 사이의 제곱오차다.
- MATH에서 OpenO1-Llama-8B-v0.1은 52.73% → 60.33%, Llama-3.1-8B-Instruct는 49.42% → 53.62%로 개선된다. 이미 RL을 거친 Qwen2.5-Math-7B-Instruct도 83.42% → 84.86%로 오른다.
- 개선은 모든 평가에 공통적이지 않다. OpenO1의 LiveCodeBench는 16.1% → 13.7%로 하락하고, 일부 수학 모델도 Minerva MATH나 College Math에서 손해를 본다.
- 이론은 정확한 advantage와 충분한 탐색, 최적해를 전제로 한다. 실제 병목은 여러 prefix에서 완성을 반복하는 critic 데이터 생성이며, 단계 수가 늘면 계산 비용이 빠르게 커진다.

## 소개 (Introduction)

정답을 맞힌 풀이의 모든 문장이 좋은 선택이었을까? 수학 문제를 풀다가 비효율적인 계산을 시작했지만 뒤에서 방향을 바꾸어 정답에 도달할 수 있다. 반대로 적절한 접근을 선택하고도 마지막 산술 계산 하나를 틀릴 수 있다. 최종 답에만 0 또는 1의 보상을 주면 평가기는 이 두 경우를 간단히 처리하지만, 모델을 학습시키는 쪽에는 어려운 문제가 남는다. 어떤 중간 선택을 더 자주 생성하고, 어떤 선택을 덜 생성하도록 해야 하는지 최종 결과 하나로 알아내야 하기 때문이다.

이것이 credit assignment, 즉 결과에 대한 기여를 중간 행동에 배분하는 문제다. LLM의 추론에서는 행동이 자연어이고, 같은 prefix에서 이어질 수 있는 문장이 매우 많다. 좋은 value function이 있다면 현재 경로의 전망을 평가할 수 있지만, 그 함수도 학습해야 한다. actor와 critic을 동시에 갱신하면 actor가 만들어 내는 데이터와 critic이 맞혀야 할 대상이 함께 변한다. critic의 부정확한 예측이 actor를 바꾸고, 바뀐 actor가 critic의 학습 환경을 다시 바꾸는 상황이 생긴다.

Liu et al.의 DAPO는 이 연결을 학습 단계에서 분리한다. 먼저 고정된 모델이 각 prefix에서 얼마나 자주 정답에 도달하는지 관찰하고, 그 성공률을 예측하는 critic을 만든다. 그다음 critic으로 다음 단계 후보들의 상대적 가치를 계산해 데이터셋에 저장하고 actor를 학습한다. 이 논문의 흥미로운 부분은 critic의 사용 자체보다 <strong>어떤 정책의 가치를 추정하는지 고정하고, 그 값을 정책 확률의 변화량과 직접 연결한다</strong>는 점이다. 성능 숫자와 함께 이 연결의 가정과 준비 비용을 읽어야 방법의 실제 위치가 보인다.

## 핵심 기여 (Key Contributions)

- <strong>단계별 advantage를 회귀하는 offline 목적함수.</strong> 정답 풀이만 모방하거나 후보 두 개의 선호 순서만 학습하지 않고, 수집한 여러 후보의 상대적 가치를 정책 log-ratio의 목표로 사용한다.
- <strong>critic과 actor의 학습 분리.</strong> 고정된 completer의 Monte Carlo 성공률로 critic을 먼저 학습하고, actor 학습에서는 미리 계산한 advantage를 사용한다. actor를 갱신하는 동안 critic이 함께 변하지 않는다.
- <strong>이상화된 설정에서의 policy improvement 분석.</strong> 유한한 상태·행동 공간과 full support 등의 조건 아래, 제안된 목적함수의 해가 reference policy보다 나은 정책을 만들 수 있음을 정리한다.
- <strong>SFT 모델과 RL 모델 모두에서의 평가.</strong> 수학과 코드, 반복 DAPO, beta와 completion 수의 ablation을 보고한다. 이득의 존재뿐 아니라 모델과 평가 영역에 따른 편차도 확인할 수 있다.

## 관련 연구 / 배경 지식

### Outcome reward와 단계별 advantage

Outcome reward는 풀이가 끝난 뒤 정답 여부를 평가한다. GRPO처럼 같은 문제의 여러 응답을 비교하는 방식에서는 응답의 최종 보상을 그룹 평균과 비교해 advantage를 구성할 수 있다. 이때 한 응답 안의 여러 추론 단계는 공통된 outcome 기반 신호를 받는다. 이것이 모든 토큰의 gradient 크기가 같다는 뜻은 아니다. 토큰 확률, clipping, regularization에 따라 실제 업데이트는 달라질 수 있지만, 최종 성공·실패에서 오는 기본적인 방향을 단계마다 새로 평가하지는 않는다는 구분이다.

반면 value는 현재 상태에서 특정 정책으로 계속 생성했을 때 받을 미래 보상의 기댓값이다. 보상이 마지막에만 주어지는 이진 값이면, value는 그 정책의 최종 성공 확률로 읽을 수 있다. advantage는 어떤 행동을 선택했을 때의 전망이 같은 상태에서 그 정책이 평균적으로 기대하는 전망보다 얼마나 좋은지를 나타낸다. 따라서 advantage가 음수라고 해서 해당 문장 자체가 논리적으로 거짓이라는 뜻은 아니다. <strong>그 문장을 다음에 생성하는 선택이 해당 모델의 후속 성공률을 낮춘다</strong>는 정책 상대적인 의미다.

### DPO, process supervision, 그리고 actor-critic

[DPO](https://arxiv.org/abs/2305.18290)는 선호 데이터와 reference policy를 이용해 정책을 직접 학습하는 배경을 제공한다. DAPO도 log-ratio를 사용하지만, 학습 대상은 응답 두 개의 선호를 구별하는 분류가 아니라 단계별 advantage에 대한 회귀다. 따라서 DPO의 이름을 바꾼 것으로 이해하면 안 된다. 데이터에 들어가는 단위와 감독 신호, 손실이 모두 다르다.

[Math-Shepherd](https://arxiv.org/abs/2312.08935)는 완성 결과로부터 중간 단계의 감독 신호를 자동으로 만드는 관련 연구다. DAPO도 사람이 모든 추론 단계에 정오 라벨을 붙이지 않고 여러 completion을 사용한다. 다만 DAPO의 critic은 고정된 completer의 value를 근사하는 함수이며, 그 출력을 매 단계마다 더하는 독립적인 보상으로 정의하지 않는다. [VinePPO](https://arxiv.org/abs/2410.01679)는 추론 과제에서 value 추정과 credit assignment가 중요한 병목임을 다루는 또 다른 비교점이다. DAPO의 새로움은 이런 문제의식 위에서 offline 학습과 actor·critic 분리를 결합하는 데 있다.

## 방법 / 아키텍처 상세

### 1. State와 action: 줄바꿈 기반 단계 분할

문제와 지금까지의 풀이를 합친 prefix가 상태이며, 다음 추론 단계가 행동이다. 논문은 줄바꿈 `\n`을 단계 경계로 사용한다. 아래에서 x는 문제, a는 한 단계의 텍스트, T는 전체 단계 수다. 하나의 행동에는 여러 토큰이 포함될 수 있다.

$$
\begin{aligned}
y&=(a_0,\ldots,a_{T-1}),\\
s_t&=\operatorname{Concat}(x,a_0,\ldots,a_{t-1}),\\
s_{t+1}&=\operatorname{Concat}(s_t,a_t).
\end{aligned}
$$

이 정의 덕분에 완성된 풀이를 평가하는 문제를 여러 단계의 의사결정 문제로 표현할 수 있다. 마지막 행동에서만 정답 보상이 주어지고, 나머지 행동의 즉시 보상은 0이다. state에는 앞선 텍스트 전체가 들어가므로, 똑같은 문장도 어떤 문맥에서 나왔는지에 따라 다른 행동 가치가 생긴다. 알고리즘이 문장만 떼어 놓고 보편적인 좋고 나쁨을 매기는 것은 아니다.

줄바꿈은 구현하기 쉬운 경계지만 의미 단위와 완전히 같지는 않다. 한 줄이 단순한 연결 문장일 수도 있고, 여러 수학적 결정을 포함할 수도 있다. 코드에서는 줄 단위 선택의 의미가 자연어 풀이와 다를 수 있다. 따라서 step-level이라는 말은 엄밀한 논리 규칙 하나마다 감독한다는 뜻보다, 정해진 텍스트 분할 단위마다 후속 성공 가능성을 비교한다는 뜻으로 이해하는 편이 정확하다.

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig1-pipeline.png" class="img-fluid rounded z-depth-1" caption="Figure 1: DAPO 학습 과정. 왼쪽: prefix 수집, 반복 completion과 critic 학습. 오른쪽: 다음 단계별 advantage 계산과 actor 최적화." zoomable=true %}

Figure 1의 숫자 예시에는 주의가 필요하다. 그림은 9로 끝나는 가장 작은 7의 양의 배수의 정답을 119로 적었지만, 실제 최솟값은 49다. 도식에서는 critic 데이터와 actor 학습이 연결되는 구조를 볼 수 있다.

### 2. Generator와 completer: 상태 수집과 value target 정의

먼저 generator가 학습 문제마다 여러 풀이를 생성한다. 실제 실험에서는 32개를 만든 다음, 정답과 오답이 가능한 한 균형을 이루도록 6개를 선택한다. 선택한 풀이를 단계로 나누면 다양한 중간 prefix가 생긴다. 여기에서 generator의 역할은 critic이 학습할 상태 분포를 만드는 것이다. 어떤 prefix를 관찰했는지가 이후 학습 범위를 결정한다.

각 prefix에서는 completer가 나머지 풀이를 여러 번 생성한다. 실험은 base model을 completer로 사용하고, 단계마다 16개의 completion을 만든다. 정답으로 끝난 비율이 그 prefix의 Monte Carlo value target이다. 예를 들어 16번 중 12번 성공했다면 target은 0.75다. 이 숫자는 설명용 계산 예시이며 논문의 개별 측정값이 아니다. 같은 prefix라도 더 강한 모델이 완성하면 성공률이 달라질 수 있으므로, target에는 completer의 능력이 포함되어 있다.

generator와 completer는 개념적으로 다른 역할이지만 실험에서는 같은 base model에서 시작한다. 반복 DAPO에서는 앞 반복에서 개선한 actor를 새로운 reference로 삼아 다시 데이터를 구성한다. 그러므로 offline이라는 표현은 전체 연구 과정에 모델 생성이 없다는 뜻이 아니다. <strong>한 번의 actor 최적화 단계가 이미 수집하고 평가한 데이터 위에서 진행된다</strong>는 뜻이다. 데이터 생성과 critic 준비는 그 앞에 존재한다.

### 3. Critic: 최종 정답 확률 추정

고정된 reference policy의 value와 그 Monte Carlo 추정은 다음처럼 쓸 수 있다. 여기서 R은 prefix 이후를 완성한 결과의 정답 여부이고, 각 completion은 같은 reference policy에서 생성한다.

$$
\begin{aligned}
V^{\pi_{\mathrm{ref}}}(s)
&=\Pr_{\pi_{\mathrm{ref}}}(R=1\mid s),\\
\widehat V_N(s)&=\frac{1}{N}\sum_{i=1}^{N}R_i.
\end{aligned}
$$

critic은 입력 prefix를 읽고 이 성공 확률을 예측하도록 학습한다. 논문은 수학 실험에서 Qwen2.5-Math-7B-Instruct, 코드 실험에서 Qwen2.5-coder-7B-Instruct를 critic의 시작점으로 사용한다. critic의 파라미터와 생성 정책의 파라미터는 별개다. critic이 어느 모델에서 초기화되었는지와, critic target이 어느 completer의 성공률을 나타내는지를 구분해야 한다.

이 구분은 reward hacking 논의에도 연결된다. critic 값이 0.8인 상태를 여러 번 만들었다고 해서 0.8씩 보상을 더 받는 구조가 아니다. 원래 목표는 마지막 정답이며, critic은 그 목표를 향한 각 선택의 전망을 추정한다. 논문의 Remark 3.3은 value를 별도의 process reward처럼 누적하면 원래 최적화 문제를 바꾸고 단계 수에 대한 잘못된 유인을 만들 수 있다고 지적한다. DAPO는 같은 상태의 후보들을 상대적으로 비교하는 데 value를 사용한다.

<a id="4-advantage-dataset-후보의-value에서-평균을-뺀다"></a>

### 4. Advantage dataset: 후보 value의 평균 차감

각 prefix의 completion에서 첫 번째 다음 단계를 추출하면 여러 행동 후보가 생긴다. critic으로 각 후보를 이어 붙인 상태의 value를 구하고, 후보들의 평균을 빼서 advantage를 만든다. 다음 식은 원문 식 (13)에 해당하며, 중간 단계의 즉시 보상이 0인 경우의 추정이다.

$$
\begin{aligned}
q_i&=V_\phi(s\circ a_i),\\
\widehat A(s,a_i)&=q_i-\frac{1}{M}\sum_{j=1}^{M}q_j.
\end{aligned}
$$

예를 들어 같은 상태의 후보 value가 0.8, 0.5, 0.2라면 평균은 0.5이며 advantage는 0.3, 0, -0.3이다. 역시 작동 원리를 보여주기 위한 예시다. 최고 후보만 정답 데이터로 남기는 방식과 달리 낮은 후보도 확률을 줄여야 할 대상으로 활용할 수 있다. 한편 모든 후보의 value가 비슷하면 어떤 방향으로 바꾸어야 하는지 신호가 약해진다. 완전히 다른 문제의 0.8과 0.5를 직접 비교하는 것이 아니라 같은 prefix 안에서 비교한다는 점도 중요하다.

여기서 terminal action은 별도로 생각해야 한다. 원래 Q-value 정의는 즉시 보상과 다음 상태의 value를 합한 것이다. 마지막 행동의 보상을 생략한 채 모든 상황에서 다음 상태의 value만 쓰면 정의가 맞지 않는다. 논문도 식 (13)을 설명하기 전에 non-terminal 상태를 명시한다. 단계별 신호를 설명하는 간단한 식을 전체 MDP의 보상 정의와 혼동하지 않아야 한다.

### 5. State-wise batch, 중복 제거, advantage gap

부록 F.1의 실무 설정은 실제 학습 데이터가 이론상의 전체 행동 공간과 어떻게 다른지 보여준다. 같은 상태에서 나온 후보들을 같은 batch에 넣어 상반된 방향의 gradient를 함께 제공한다. 또 동일한 후보가 반복 생성되면 advantage 계산 후 학습 데이터에는 고유한 행동만 남겨, 관찰한 고유 행동 집합에서 균등하게 학습한다. 모델이 원래 자주 생성하던 문장을 중복 횟수만큼 다시 학습시키는 구성과는 다르다.

마지막으로 상태별 최고 advantage와 최저 advantage의 차이가 0.1 이상인 경우만 학습한다. critic의 근사 오차를 고려해 차이가 충분한 후보들에 집중하려는 장치다. 하지만 0.1이라는 threshold가 모든 상태에서 순위의 정확성을 보장하지는 않는다. 잘못 예측한 critic도 큰 차이를 만들 수 있기 때문이다. 이 설정은 유용한 필터링 가설이며, critic calibration이나 여러 threshold를 비교한 광범위한 검증을 대체하지는 않는다.

세 장치는 모두 이해 가능한 선택이지만 최종 성능에 함께 들어간다. 따라서 DAPO의 성능 차이를 loss 한 줄의 효과로만 읽으면 부족하다. candidate 생성, critic 학습, 중복 제거, state-wise batching, gap 필터링을 포함한 파이프라인의 결과로 해석해야 한다. 논문은 이 세 장치 각각을 제거하는 독립적인 성능 표를 제시하지 않는다.

## 학습 목표 / 손실 함수

### Critic의 binary cross-entropy

critic target은 이진 라벨 자체가 아니라 여러 이진 결과의 평균이다. 따라서 0과 1 사이의 soft target을 사용한다. 논문이 사용하는 binary cross-entropy를 target m과 예측 v로 쓰면 다음과 같다.

$$
\begin{aligned}
\ell_{\mathrm{BCE}}(m,v)
&=-m\log v-(1-m)\log(1-v),\\
\mathcal L_{\mathrm{critic}}(\phi)
&=\mathbb E_s\bigl[\ell_{\mathrm{BCE}}(\widehat V_N(s),V_\phi(s))\bigr].
\end{aligned}
$$

저자들은 확률을 예측하는 이 문제에서 MSE를 사용할 때의 gradient 감소를 피하려고 BCE를 선택했다고 설명한다. 다만 논문에 BCE와 MSE를 동일 조건으로 비교한 ablation은 없다. 선택의 동기는 설명되어 있지만, 전체 성능 개선 중 BCE가 얼마나 기여했는지까지 실험으로 분리된 것은 아니다. Monte Carlo sample 수가 유한하기 때문에 잘 학습된 critic도 노이즈가 있는 target을 근사한다는 사실은 그대로 남는다.

### Actor의 log-ratio 회귀

actor는 저장된 상태, 행동, advantage의 삼중항으로 학습한다. reference policy는 한 번의 반복 안에서는 고정되어 있다. 원문 식 (12)의 핵심은 다음과 같다.

$$
\begin{aligned}
u_\theta(s,a)&=\log\frac{\pi_\theta(a\mid s)}{\pi_{\mathrm{ref}}(a\mid s)},\\
\mathcal L_{\mathrm{DAPO}}(\theta)
&=\frac12\mathbb E_{(s,a)\sim\nu}\left[
\left(\frac{\widehat A(s,a)}{\beta}-u_\theta(s,a)\right)^2\right].
\end{aligned}
$$

양의 advantage는 reference보다 해당 행동의 확률을 높이는 방향의 target을 만들고, 음의 advantage는 낮추는 방향의 target을 만든다. 현재 log-ratio가 이미 target을 넘어섰다면 loss는 반대 방향으로 당긴다. 따라서 좋은 행동의 likelihood를 무한히 키우는 단순한 positive-only 학습과 다르다. beta가 작아지면 같은 advantage에 요구되는 log-ratio 변화가 커진다. 뒤의 ablation에서 너무 작거나 큰 beta가 최선이 아닌 이유를 이해할 수 있는 지점이다.

하나의 action은 여러 토큰으로 구성되므로, 행동의 log-probability는 해당 토큰들의 조건부 log-probability 합이다. 공개 보충자료의 `get_log_trajectory_probs`도 mask가 적용된 토큰 log-probability를 합산한다. 토큰 수로 나눈 평균을 사용하지 않는다. 이어서 `advantages / beta`와 현재·reference의 log-probability 차이를 비교하고, 제곱오차의 절반을 batch 평균한다. 수식의 간단함과 별개로 어떤 토큰을 mask에 포함하는지가 구현 의미를 결정한다.

또한 모든 행동에 대해 log-ratio가 advantage/beta와 정확히 같아진다고 단정하면 안 된다. 정책은 확률의 합이 1이어야 하고, 신경망의 파라미터는 여러 상태에서 공유된다. 개별 데이터의 target을 모두 독립적으로 맞힐 자유가 없다. 논문의 이론도 단순히 각 행동 확률을 지수화해 끝내는 처방이 아니라 정규화된 정책 공간에서의 최적화 문제를 분석한다.

### Theorem 3.2: 단조 개선의 범위

논문은 먼저 한 상태에서 KL로 regularize한 policy improvement의 gradient가 특정 회귀 surrogate의 gradient와 연결됨을 보인다. 이후 on-policy sample을 매번 새로 만들지 않고도 탐색 분포에서 수집한 데이터로 제곱오차 문제를 풀 수 있는지 분석한다. 그 결과가 Theorem 3.2다. 정리는 유한한 상태·행동 공간, 모든 상태와 행동에 양의 확률을 주는 sampling distribution과 reference policy, 정확한 advantage, 목적함수의 해를 전제로 한다.

이 조건 아래 저자들은 KL-regularized value가 reference보다 나쁘지 않고, reference가 이미 최적인 경우에만 개선이 사라진다는 결과를 제시한다. 증명의 큰 흐름은 각 상태의 개선량을 분석하고 performance difference lemma로 전체 value 차이에 연결하는 것이다. 여기서 state visitation measure는 고정 길이로 정규화한 확률분포가 아니라, 종료 길이가 달라질 수 있는 경로에서 상태를 방문하는 기대 횟수를 나타낸다.

실제 실험은 이 정리의 조건을 그대로 구현하지 않는다. sample은 유한하고, critic은 근사값을 내며, 일부 상태는 gap 필터로 제외된다. 고유한 관찰 행동만 남기는 학습 분포 역시 가능한 모든 자연어 행동에 full support를 주지 않는다. 따라서 <strong>모든 gradient step이나 모든 held-out benchmark 점수가 단조롭게 오른다는 보장으로 읽을 수 없다.</strong> 이론은 목적함수의 설계 방향을 뒷받침하며, 유한한 neural training의 결과는 별도의 실험적 주장이다.

## 학습 데이터와 파이프라인

### MATH·TACO와 평가 조건

수학 학습은 MATH의 문제 7,500개와 정답을 사용하며, 제공된 풀이 자체를 학습 정답으로 사용하지 않는다. 코드 학습은 TACO에서 약 4,000개의 문제를 뽑고 제공된 unit test로 성공 여부를 평가한다. 사람이 중간 단계의 라벨을 추가하지 않는다는 장점이 있지만, 최종 정답이나 실행 가능한 테스트가 있다는 감독 조건은 필요하다. 검증기가 없는 자유로운 글쓰기 과제로 동일하게 옮기는 방법은 이 실험의 범위 밖이다.

| 구성 | 논문 설정 |
|------|------|
| 초기 풀이 생성 | 문제당 32개 생성, 정답·오답 균형을 고려해 6개 선택 |
| 단계 경계·completion | 줄바꿈으로 분할, 각 단계에서 16개 completion |
| 수학 critic | Qwen2.5-Math-7B-Instruct |
| 코드 critic | Qwen2.5-coder-7B-Instruct |
| Critic 학습 | 1 epoch, learning rate 5e-6, batch size 512 |
| Actor 학습 | learning rate 5e-7, global batch size 2048 |
| KL 계수 | beta 0.01 또는 0.02 |
| Advantage gap | 0.1 이상인 상태만 학습 |
| 기본 평가 | Zero-shot CoT prompt, greedy decoding, temperature 0 |
| 생성 상한 | 기본 2,048 new tokens; OpenO1·Skywork-O1은 4,096 |

수학 평가는 MATH test 5,000개와 GSM8K, Minerva MATH, Olympiad Bench, College Math를 사용한다. Table 1의 열 그룹에서는 GSM8K가 MATH와 함께 In Domain에 놓여 있지만, 4.1절은 MATH 외 네 평가를 out-of-domain이라고 설명한다. 이 리뷰는 학습 데이터가 MATH라는 사실과 개별 벤치마크 이름을 기준으로 결과를 구분한다. 코드 평가는 HumanEval, HumanEval+, MBPP, MBPP+, LiveCodeBench다.

평가에서 별도 탐색이나 critic 기반 reranking을 붙인 결과는 아니다. actor의 greedy generation으로 성능을 측정하므로, 개선은 학습 후 생성 정책에 반영된 변화다. 반면 학습 비용을 볼 때는 actor update만 세면 안 된다. 7,500개라는 숫자는 원래 문제 수이며, 여러 prefix와 completion을 통해 생성되는 state-action 학습 예시 수와 다르다.

## 실험 결과

### MATH: SFT 이후와 RL 이후의 개선

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/tab1-math.png" class="img-fluid rounded z-depth-1" caption="Table 1: 일곱 base model의 수학 벤치마크 정답률(%). SFT·RL 모델별 DAPO 적용 전후 점수와 benchmark별 증감." zoomable=true %}

다음 표는 원문 Table 1의 MATH 점수를 정리한 것이다. 변화량은 표시된 전후 점수의 차이이며, 상대 증가율이 아니라 percentage point다.

| 모델 | Base (%) | DAPO (%) | 변화 (%p) |
|------|------:|------:|------:|
| Skywork-Math-Llama | 41.90 | 46.88 | +4.98 |
| Llama-3.1-8B-Instruct | 49.42 | 53.62 | +4.20 |
| OpenO1-Llama-8B-v0.1 | 52.73 | 60.33 | +7.60 |
| Qwen2.5-72B-Instruct | 82.90 | 84.70 | +1.80 |
| Qwen2-Math-7B-Instruct | 74.46 | 75.41 | +0.95 |
| Skywork-O1-Open-Llama3.1-8B | 78.10 | 79.81 | +1.71 |
| Qwen2.5-Math-7B-Instruct | 83.42 | 84.86 | +1.44 |

이 표가 가장 분명하게 보여주는 것은 모든 평가 모델에서 MATH 점수가 개선되었다는 사실이다. 초기 점수가 비슷한 모델에서도 개선 폭이 같지는 않으며, 가장 큰 변화는 OpenO1의 +7.60%p다. 이미 RL을 거친 세 모델도 추가 이득을 얻지만 폭은 더 작다. 따라서 “RL 모델에는 더 학습할 것이 없다”는 주장을 반박하는 근거는 되지만, 어떤 RL 모델에서 얼마나 개선될지 예측하는 일반 법칙은 아니다.

원문 4.2절의 서술에는 Table 1과 다른 점수 및 후속 iteration의 점수가 함께 등장한다. 위 표는 Table 1을 기준으로 했고 반복 결과는 아래에서 따로 다룬다. 또한 Table 1의 Llama-3.1 College Math 항목은 전후 점수가 모두 30.91인데 +1.63이라는 증가 표기가 붙어 있다. 이 셀의 개선 폭은 확정하지 않는다. 원본 표의 일부 증감 주석은 표시된 점수 차이와 일치하지 않으므로, 나머지 비교도 전후 점수 자체를 우선한다.

### Minerva MATH·College Math: 일반화의 예외

Qwen2.5-72B-Instruct는 Minerva MATH에서 46.30% → 50.00%, Olympiad Bench에서 45.45% → 47.70%로 개선된다. 그러나 Llama-3.1-8B-Instruct의 Minerva MATH는 26.48% → 23.54%이고, Qwen2-Math-7B-Instruct도 40.07% → 37.51%로 하락한다. MATH에서 학습해 MATH 점수가 오른다는 결과와, 다른 수학 문제 분포에서도 항상 좋아진다는 결과는 같지 않다.

College Math에서도 Skywork-O1은 40.40% → 40.26%, Qwen2.5-Math는 42.65% → 41.97%로 내려간다. 이 변화만으로 특정 reasoning skill을 잊었다고 단정할 수는 없다. 하지만 critic과 학습 prefix가 MATH에서 만들어졌다는 점을 고려하면 분포가 달라졌을 때의 성능을 별도로 확인해야 한다는 신호다. 평균적인 성공만 강조하면 이런 적용 범위가 가려진다.

### HumanEval·MBPP·LiveCodeBench

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/tab2-code.png" class="img-fluid rounded z-depth-1" caption="Table 2: TACO 학습 후 코드 벤치마크 정답률(%). 두 모델의 HumanEval·MBPP 계열 개선과 OpenO1의 LiveCodeBench 하락." zoomable=true %}

Llama-3.1-8B-Instruct는 다섯 코드 평가에서 모두 개선된다. HumanEval은 72.0% → 75.0%, HumanEval+는 66.5% → 68.9%, MBPP는 72.0% → 77.0%, MBPP+는 56.9% → 66.1%, LiveCodeBench는 18.8% → 20.9%다. 특히 MBPP+의 +9.2%p가 크다. 다만 평가마다 시작 난이도와 문제 구성이 다르므로, 큰 점수 차이를 곧바로 특정 코드 능력의 획득으로 해석하지는 않아야 한다.

OpenO1은 HumanEval 69.5% → 72.0%, HumanEval+ 61.0% → 64.6%, MBPP 69.8% → 75.9%, MBPP+ 58.7% → 63.8%로 오른다. 마지막 변화는 표의 표시값 기준 +5.1%p다. 반대로 LiveCodeBench는 16.1% → 13.7%로 떨어진다. 두 모델과 제한된 코드 학습 설정만으로 DAPO가 코드 일반화를 안정적으로 개선한다고 결론내리기는 어렵지만, 수학에만 국한된 목적함수는 아니라는 실증 근거는 제공한다.

### PPO·GRPO: 같은 base model에서의 비교

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/tab3-baselines.png" class="img-fluid rounded z-depth-1" caption="Table 3: MATH test 5,000개에서 Base·GRPO·PPO·DAPO 정답률(%). 비교한 네 모델에서 DAPO의 최고 점수." zoomable=true %}

OpenO1에서 DAPO는 60.33%로 GRPO 55.63%, PPO 54.12%를 앞선다. Llama-3.1에서도 DAPO 53.62%, GRPO 52.28%, PPO 52.41% 순으로 DAPO가 높다. 이미 강한 Qwen2.5-Math에서는 DAPO 84.86%와 GRPO 84.33%의 차이가 0.53%p로 줄어든다. Qwen2-Math에서는 DAPO 75.41%, GRPO 74.94%, PPO 74.93%다.

비교는 같은 MATH 학습 문제를 사용한다는 장점이 있다. 다만 critic을 위한 생성 예산, batch 구성과 learning rate까지 동일한 실험은 아니다. 예를 들어 DAPO actor의 learning rate는 5e-7이며, 부록 GRPO 설정은 1e-6이다. 따라서 결과는 보고된 각 training recipe의 비교로 읽는 것이 정확하다. loss만 교체했을 때의 순수한 인과 효과를 분리한 표는 아니다.

## 결과 분석 / Ablation

<a id="iterative-dapo-reference를-바꾸어-다시-학습하기"></a>

### Iterative DAPO: Reference 갱신과 반복 학습

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/tab10-iterations.png" class="img-fluid rounded z-depth-1" caption="Table 10: DAPO 반복별 수학 정답률(%). Skywork-Math의 전 평가 개선과 Qwen2-Math의 MATH 개선·일부 외부 평가 하락." zoomable=true %}

Skywork-Math-Llama의 MATH는 41.90% → 46.88% → 50.54%로 올라간다. Qwen2-Math-7B-Instruct도 74.46% → 75.41% → 76.40%로 개선된다. 첫 번째 actor update가 끝났다고 모든 개선 가능성을 소진한 것은 아니라는 결과다. 새 정책을 reference로 설정하면 그 정책의 성공률과 advantage를 다시 추정할 수 있다.

그러나 Qwen2-Math의 두 번째 iteration에서 GSM8K는 89.30%로 초기 89.38%보다 낮고, College Math는 41.16%로 초기 41.59%보다 낮다. 반복할수록 전반적인 reasoning 능력이 자동으로 확장된다는 증거는 아니다. 실제 적용에서는 반복 수를 늘리는 것과 함께 held-out 평가, critic 재학습 비용, domain별 성능 변화를 관리해야 한다.

### Beta와 Monte Carlo completion 수

| Ablation | 설정 | MATH 정답률(%) |
|------|------|------:|
| Skywork-Math beta | 0.002 | 44.52 |
| Skywork-Math beta | 0.01 | 46.88 |
| Skywork-Math beta | 0.02 | 46.70 |
| Skywork-Math beta | 0.05 | 45.56 |
| Skywork-Math beta | 0.1 | 44.50 |
| Qwen2-Math completion 수 | 8 | 75.30 |
| Qwen2-Math completion 수 | 16 | 75.41 |

Table 5에서는 beta 0.01이 가장 좋고 0.02도 가깝다. 너무 작은 beta는 advantage 오차까지 큰 log-ratio 목표로 증폭할 수 있고, 너무 큰 beta는 정책 변화의 목표를 작게 만든다는 해석이 가능하다. 다만 이 메커니즘 자체를 별도 측정한 실험은 아니며, 표는 특정 모델에서의 성능 민감도를 보여준다.

Table 6의 completion 8개와 16개의 차이는 0.11%p다. 저자들은 개선 여지를 확보하려고 기본 설정을 16개로 선택했다. 이것을 “8개면 항상 충분하다”거나 “16개가 통계적으로 더 낫다”고 읽기는 어렵다. 하나의 모델에서 두 설정을 비교했으며 신뢰구간이나 여러 seed 결과가 없다. critic의 추정 정확도, 데이터 생성량, 최종 성능을 함께 측정해야 비용 대비 선택이 가능하다.

### Figure 2: 정답 경로 안의 음의 advantage

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig2-credit.png" class="img-fluid rounded z-depth-1" caption="Figure 2: 직육면체 부피 문제의 14단계 정답 경로. 오른쪽: 단계별 value와 advantage. Step 11의 value 0.41, advantage -0.53." zoomable=true %}

그림의 문제는 세 면의 넓이가 24, 16, 6인 직육면체의 부피를 구하는 것이다. 경로는 결국 48이라는 정답에 도달한다. 그러나 저자들이 제시한 value는 step 10의 0.94에서 step 11의 0.41로 떨어지고, 해당 advantage는 -0.53이다. 최종 정답만 보았다면 이 단계도 성공한 응답의 일부로 처리되지만, 후속 생성의 전망으로 보면 다른 평가를 받는다.

특히 step 11의 제곱근 전개 자체는 눈에 띄는 논리적 오류가 아니다. 이 예시는 critic이 수학 교사의 정오 판정을 대신한다는 뜻보다, 같은 모델이 어떤 표현 뒤에서 잘 이어 나가는지를 반영한다는 점을 보여준다. value 하락의 원인이나 그 수치의 불확실성까지 그림 하나로 확정할 수는 없다. 그럼에도 최종 보상과 중간 선택의 상대적 가치를 분리해야 한다는 직관은 선명하게 전달한다.

### Figure 3·4: 학습 안정성과 error reduction

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig3-training.png" class="img-fluid rounded z-depth-1" caption="Figure 3: 학습한 state-action pair 수(백만 개)에 따른 MATH 개선. 위: 정답률 차이(%p). 아래: 초기 오답률 대비 감소 비율(%)." zoomable=true %}

Figure 3의 아래 패널은 relative improvement라는 이름을 쓰지만 정의는 초기 accuracy 대비 증가율이 아니다. 초기 정답률을 x, 학습 후 정답률을 y라고 할 때 다음 값이다. 둘은 0과 1 사이의 비율로 넣는다.

$$
\text{relative improvement}=\frac{y-x}{1-x}.
$$

분모가 초기 오답률이므로 error reduction에 해당한다. OpenO1의 +7.60%p를 초기 오답률 47.27%로 나누면 약 16.08%이며, 그림에는 16.07%가 표시되어 있다. 표시값의 정밀도를 고려하면 같은 크기의 개선이다. 이를 정확도가 16%p 올랐다는 뜻으로 읽으면 안 된다. 또 곡선에는 하락 구간이 있으므로, 실험에서 모든 checkpoint가 단조롭게 개선된다고 표현할 수도 없다.

{% include figure.liquid loading="eager" path="assets/img/papers/0038-dapo-improving-multi-step-reasoning-abilities-of-large-langu/fig4-grpo.png" class="img-fluid rounded z-depth-1" caption="Figure 4: Llama-3.1-8B-Instruct의 GRPO 학습. 가로축: training step. 왼쪽: 학습 정답률. 오른쪽: MATH test 개선(%p), 약 300 step 이후 하락 경향." zoomable=true %}

저자들은 GRPO를 1,000 step 이상 학습한 비교에서 train accuracy가 유지·상승해도 MATH test 개선은 약 300 step 이후 나빠지는 경향을 보인다고 설명한다. DAPO의 더 나은 test 성능과 함께 보면 세밀한 신호가 유용할 가능성을 지지한다. 그러나 이 곡선만으로 GRPO가 일반적으로 과적합하고 DAPO는 과적합하지 않는다고 결론내릴 수는 없다. DAPO의 곡선도 출렁이며, 비교한 모델과 데이터, 하이퍼파라미터의 범위가 제한되어 있다.

## 한계와 비판적 평가

### Critic 준비 비용과 긴 추론의 scaling

저자들이 강조하는 주요 한계는 critic의 사전 학습, 특히 Monte Carlo target을 만드는 비용이다. 이미 생성한 풀이의 여러 prefix마다 남은 답을 다시 완성한다. 전체 길이를 L, 단계 수를 T로 놓으면, 많은 prefix의 남은 부분을 생성하는 비용에 L과 T가 함께 들어간다. 단계당 길이가 일정하여 L도 T에 비례한다면 이 completion 부분에 T의 제곱에 비례하는 항이 생긴다는 것이 부록 E의 핵심이다.

원문은 대략 T=20, L=2048인 설정을 비용 설명에 사용한다. 이는 모든 예시의 실제 길이가 동일하다는 측정 결과가 아니라 분석을 단순화한 가정이다. actor 학습에서 critic을 동시에 올릴 필요가 없다는 메모리상의 장점과, 전체 학습 계산량이 적다는 주장은 구분해야 한다. 본문은 비슷한 계산 자원 예산의 GRPO 비교를 주장하지만, 독자가 직접 재현할 수 있는 전체 GPU-hours·하드웨어별 wall-clock 비교는 충분하지 않다.

### Critic 오차와 구성 요소의 기여

actor와 critic의 동시 업데이트를 없애면 한 종류의 불안정성은 줄일 수 있다. 그렇다고 critic의 bias까지 사라지는 것은 아니다. 유한한 completion, 특정 모델에서 생성한 prefix, 제한된 학습 데이터에 기반한 오차가 actor target으로 전달된다. beta가 작은 설정에서는 이 오차의 영향도 커질 수 있다. critic을 고정하는 선택은 안정성과 현재 actor에 대한 적합성 사이의 교환을 만든다.

여러 seed, critic calibration, 학습 장치별 제거 실험이 더 있으면 설명력이 높아질 것이다. greedy decoding은 추론 sampling의 무작위성을 줄이지만, 학습 데이터 생성과 optimization의 변동성까지 제거하지는 않는다. 특히 0.1%p 수준의 차이는 단일 결과만으로 확실한 우열을 주장하기 어렵다. 이론적 정리와 실험의 평균적인 개선 사이를 잇는 근사 오차 분석도 후속 과제로 남는다.

### 공개 코드의 재현 범위

NeurIPS의 공개 ZIP에는 `main.py`, 짧은 README, 논문 PDF가 들어 있다. 따라서 코드가 전혀 공개되지 않았다고 쓰는 것은 부정확하다. 그러나 `main.py`가 import하는 `utils` 계열 모듈과 `data_utils`는 해당 ZIP에 포함되어 있지 않다. 학습 손실과 reference log-probability 처리 방식은 확인할 수 있지만, 이 보충자료만 내려받아 전체 critic·actor 파이프라인을 바로 재현할 수 있다고 안내할 수는 없다.

원래 방법을 구현하려는 독자는 데이터 생성, mask 구성, critic 학습, 분산 sampler를 추가로 확인해야 한다. 특히 최종 점수만 재현하는 것과 계산 예산까지 비교하는 것은 서로 다른 작업이다.

## 시사점 / Takeaways

- <strong>좋은 최종 답과 좋은 중간 선택은 다르다.</strong> 단계별 value는 특정 정책이 이어서 성공할 가능성을 반영하므로, 문장 자체의 정오 판정과 구분해야 한다.
- <strong>offline RL의 비용은 optimizer 밖에도 있다.</strong> 저장된 advantage로 actor를 학습하는 부분이 단순해도, 그 데이터를 만드는 rollout 비용은 별도로 계산해야 한다.
- <strong>reference와 critic target의 관계를 명확히 해야 한다.</strong> 어떤 모델이 prefix를 만들었는지와 어떤 모델이 나머지를 완성했는지는 서로 다른 설계 축이다.
- <strong>정리의 보장과 benchmark의 개선 범위를 나누어 읽어야 한다.</strong> full support와 정확한 value를 전제로 한 결과가 모든 외부 데이터셋의 단조 개선으로 이어지지는 않는다.
- <strong>구현의 핵심은 loss뿐 아니라 데이터 단위다.</strong> step 경계, 중복 처리, 같은 state의 후보 묶기, advantage gap이 함께 실제 학습 신호를 만든다.

## 설치 및 사용법

공개 코드의 시작점은 [NeurIPS 보충자료](https://proceedings.neurips.cc/paper_files/paper/2025/file/6789f033ebde742552e5db84fb5d414a-Supplemental-Conference.zip)의 `main.py`다. 현재 ZIP만으로 실행 가능한 완결된 설치 절차는 확인되지 않는다. 따라서 검증하지 않은 학습 명령을 제시하기보다, `get_log_trajectory_probs`의 action mask와 토큰 log-probability 합산, 학습 loop의 reference 차감 및 advantage/beta 회귀를 읽는 용도로 접근하는 것이 적절하다. 원 논문의 Algorithm 1은 초기 actor·critic, 학습 문제, 반복 횟수와 beta를 입력받아 마지막 actor와 critic을 반환하는 전체 절차를 제공한다.

## 참고 자료

- [논문 공식 페이지](https://proceedings.neurips.cc/paper_files/paper/2025/hash/6789f033ebde742552e5db84fb5d414a-Abstract-Conference.html): NeurIPS 2025 논문 및 보충자료.
- [검토한 proceedings PDF](https://www.proceedings.com/content/085/085713-2401open.pdf): 본문·부록 33쪽. 이 글의 저자 표기와 수치 확인 기준.
- [보충자료 코드](https://proceedings.neurips.cc/paper_files/paper/2025/file/6789f033ebde742552e5db84fb5d414a-Supplemental-Conference.zip): `main.py`의 log-probability 합산과 학습 손실 확인.
- 그림·표 출처: Liu et al. (2025)의 Figure 1–4, Table 1–3·10. 원저작권은 각 권리자에게 있으며, 이 리뷰에서 연구 설명과 비평을 위해 인용한다.

## 더 읽어보기

- **[Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290)** (Rafailov et al., 2023): Reference policy 대비 log-ratio를 이용하는 선호 최적화의 배경.
- **[DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300)** (Shao et al., 2024): 수학 reasoning과 GRPO의 출발점을 함께 살펴볼 수 있는 연구.
- **[Math-Shepherd: Verify and Reinforce LLMs Step-by-step without Human Annotations](https://arxiv.org/abs/2312.08935)** (Wang et al., ACL 2024): 사람의 단계별 라벨 없이 process supervision을 만드는 접근.
- **[VinePPO: Refining Credit Assignment in RL Training of LLMs](https://arxiv.org/abs/2410.01679)** (Kazemnejad et al., ICML 2025): Value 추정의 오류와 Monte Carlo 기반 credit assignment를 분석하는 비교 연구.

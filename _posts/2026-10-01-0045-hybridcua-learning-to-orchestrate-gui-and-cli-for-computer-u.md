---
layout: post
title: "[논문 리뷰] HybridCUA: Learning to Orchestrate GUI and CLI for Computer-Use Agents"
date: 2026-10-01 09:06:31 +0900
description: "GUI와 CLI의 선택을 학습하는 HybridCUA: 혼합 trajectory, task별 인터페이스 보상, 명령 실행 오류의 단계별 교정"
tags: [computer-use, gui-agents, command-line, reinforcement-learning, multimodal, agent-training]
categories: paper-review
giscus_comments: false
thumbnail: assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig3-pipeline.png
bibliography: papers.bib
toc:
  beginning: true
lang: ko
permalink: /papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/
en_url: /en/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/
---

{% include lang_toggle.html %}

## 메타정보

| 항목 | 내용 |
|------|------|
| 저자 | Tongbo Chen et al. (저자 11명, Zhejiang University · Peking University · Tsinghua University) |
| 학회 | arXiv · 2026 |
| arXiv | [2609.38008](https://arxiv.org/abs/2609.38008) |
| Code | [ZJU-REAL/HybridCUA](https://github.com/ZJU-REAL/HybridCUA) |
| 데이터 | HybridCUA-8K: SFT trajectory 5,023개와 검증 가능한 RL task 3,000개 |
| <span style="white-space: nowrap">리뷰 일자</span> | 2026-10-01 |

## TL;DR

- <strong>Shell 접근과 shell 활용 능력의 구분.</strong> Qwen3.5-9B에 GUI와 CLI를 함께 제공하기만 하면 OSWorld Acc.가 38.8%에서 18.4%로 하락한다. HybridCUA는 혼합 SFT와 CLI-aware RL을 거쳐 53.6%를 기록한다.
- <strong>세 종류의 demonstration과 하나의 실행 형식.</strong> GUI only, CLI only, interleaved trajectory를 함께 학습하고, PyAutoGUI 조작과 직접 shell 명령을 공통 `bash` action으로 표현한다.
- <strong>선택과 실행에 대한 서로 다른 reward.</strong> 성공한 trajectory의 CLI 사용 여부가 task의 선호 label과 맞는지 평가하고, shell 수준 실행 실패는 해당 action의 token에 국소적으로 감점한다.
- <strong>평가 점수와 단계 수의 동시 개선.</strong> 최종 모델은 평균 14.0단계로 동작한다. OSWorld-MCP에서는 47.1%, WindowsAgentArena에서는 36.0%를 기록한다. Acc.는 부분점수를 포함한 evaluator 평균이며, 단계 수는 성공·실패 task 전체의 평균이다.

## 소개 (Introduction)

문서의 글꼴 크기를 바꿀 때 메뉴를 열고, 텍스트를 선택하고, 입력창을 찾아 값을 넣는 방법이 있다. 파일을 직접 읽어 모든 run의 글꼴 속성을 바꾸는 코드도 있다. 사람에게는 두 경로가 같은 목적을 위한 다른 수단이지만, computer-use agent에는 관찰 방식과 행동의 단위가 크게 다른 선택이다. 화면 클릭은 다양한 앱에서 통하지만 긴 조작 과정에 오류가 쌓인다. 코드는 여러 변경을 압축할 수 있지만, 어떤 파일과 API가 현재 앱의 상태를 나타내는지 알아야 한다.

앱마다 전용 도구를 만들면 이 간격을 줄일 수 있다. 다만 새 앱이나 새 기능이 등장할 때마다 도구의 범위를 늘리고 유지해야 한다. Chen et al.의 [HybridCUA](https://arxiv.org/abs/2609.38008)는 운영체제의 CLI를 공통 실행 경로로 사용한다. 핵심 질문은 “터미널을 쓸 수 있는가”보다 “지금 터미널을 쓰는 것이 유리한가, 그리고 제대로 실행할 수 있는가”에 가깝다. 이미 코드를 잘 작성하는 모델이라도 화면을 보며 진행하는 작업 속에서 이 선택을 잘한다는 보장은 없다.

이 리뷰는 arXiv v1의 본문과 부록을 기준으로 데이터 생성, action 표현, 두 reward의 역할을 연결해 살펴본다. 특히 더 적은 단계와 더 좋은 작업 결과를 구분한다. CLI를 추가한 미학습 baseline은 단계 수가 줄면서 점수도 크게 떨어진다. 이런 경로를 효율 개선이라고 읽으면 논문의 문제 설정부터 놓치게 된다. HybridCUA의 의미는 명령을 많이 쓰는 데 있지 않고, 시각적 조작과 프로그램 실행을 같은 작업의 상태 변화에 맞춰 연결하는 데 있다.

## 핵심 기여 (Key Contributions)

- <strong>기존 GUI demonstration의 재사용과 hybrid 데이터 생성.</strong> GUI action의 PyAutoGUI 변환, CLI 전용 수집, 두 인터페이스를 오가는 수집과 replay를 하나의 pipeline으로 묶는다.
- <strong>검증 가능한 task에 대한 인터페이스 선호 label.</strong> GUI only·CLI only·GUI–CLI rollout을 비교해 CLI가 유리한 task를 구분하고, 이를 학습 신호로 사용한다.
- <strong>Trajectory와 action 수준의 credit assignment.</strong> 최종 성공과 인터페이스 선택을 trajectory reward로, 실행 오류를 해당 명령의 token advantage로 처리한다.
- <strong>데이터·reward·action schema를 분리한 실험.</strong> 세 데이터 유형의 혼합, 두 CLI reward의 제거, 별도 도구와 공통 `bash` 형식을 각각 비교하고 환경·운영체제 전이도 확인한다.

## 관련 연구 / 배경 지식

### GUI grounding과 프로그램 실행의 상호보완성

GUI grounding은 화면에서 조작할 위치를 찾는 능력이다. 버튼 이름을 이해해도 좌표를 잘못 고르면 다음 화면은 예상과 달라진다. 여러 번의 클릭과 입력이 이어지는 작업에서는 한 번의 작은 오류가 이후 행동의 전제를 바꿀 수 있다. 반대로 파일 편집이나 반복 연산은 짧은 프로그램으로 정확하게 표현할 수 있다. 그렇지만 화면 배치나 현재 선택 상태처럼 눈으로 확인해야 하는 정보는 파일만 읽어서는 충분하지 않을 수 있다.

[OSWorld](https://arxiv.org/abs/2404.07972)는 실제 컴퓨터 환경에서 이런 작업을 실행하고 결과 상태를 평가한다. [ToolCUA](https://arxiv.org/abs/2605.12481)는 GUI와 고수준 도구 사이의 경로 선택을 다룬다. 따라서 HybridCUA가 hybrid computer use 자체를 처음 제안했다고 이해하면 안 된다. 이 논문은 직접 shell 실행을 공통 경로로 삼고, CLI를 선택할 이유와 명령 실행의 신뢰성을 각각 명시적인 학습 신호로 만든다는 데 초점을 둔다.

### RLVR의 최종 결과와 중간 행동의 구분

검증 가능한 보상을 사용하는 강화학습, 즉 RLVR은 작업 결과를 실행 가능한 evaluator로 판정한다. [CUA-Gym](https://arxiv.org/abs/2605.25624)은 task 지시, 환경 상태와 reward 함수를 함께 생성해 이런 학습을 확장한다. 성공 여부만으로 학습하면 사람의 주관적인 채점 부담은 줄지만, 성공한 두 경로 중 어떤 경로가 더 적절했는지는 알기 어렵다.

예를 들어 틀린 shell 명령을 여러 번 시도한 뒤 GUI로 작업을 끝내도 최종 reward는 성공일 수 있다. 반대로 shell을 쓰지 않고 긴 클릭 과정을 거쳐 성공한 경로와, 파일을 직접 수정한 경로가 같은 점수를 받을 수 있다. HybridCUA는 이 두 경우에 다른 신호가 필요하다고 본다. 인터페이스 선택은 task의 성격과 연결하고, shell 실행 실패는 그 실패를 만든 행동 가까이에서 교정한다. 두 신호를 최종 점수 하나로 뭉개지 않는 것이 방법의 출발점이다.

## 방법 / 아키텍처 상세

### 1. Screenshot과 직전 CLI 출력의 결합

Agent는 컴퓨터의 완전한 내부 상태를 보지 못한다. 현재 screenshot과 직전 직접 CLI action의 stdout·stderr를 관찰하고, task 지시와 앞선 interaction history를 문맥으로 사용한다. 직접 CLI action이 없었다면 해당 출력은 비어 있다. 원문의 관찰식은 다음과 같다.

$$
o_t = (I_t, \widetilde{y}_{t-1}).
$$

여기서 화면은 프로그램 실행을 보완한다. 파일 편집이 끝났더라도 앱에 메뉴가 열려 있거나 화면이 이전 상태를 보여 줄 수 있다. 반대로 stdout은 화면에서 보기 어려운 파일 내용이나 설정값을 직접 반환한다. 논문의 CLI only는 <strong>행동 인터페이스가 CLI로 제한된다</strong>는 뜻이다. 시각 관찰까지 제거한 text-only agent를 의미하지 않는다. 이 구분이 있어야 CLI trajectory가 왜 GUI 문맥을 가진 학습 데이터가 되는지 이해할 수 있다.

### 2. 공통 bash action과 실제 인터페이스의 구분

실행 가능한 행동은 하나의 `bash(command, timeout)` 형식으로 표현한다. 직접 shell 명령을 넣을 수도 있고, 인용된 Python heredoc 안에서 PyAutoGUI를 호출할 수도 있다. `wait`, `terminate`, `answer`는 별도의 control action이다. `terminate`로 성공을 선언했다고 evaluator가 그 작업을 성공으로 인정하는 것은 아니다.

공통 wrapper는 GUI와 CLI의 이름을 없애지 않는다. `pyautogui.click`으로 화면을 누르는 코드는 `bash` 안에 있어도 GUI 행동이다. 파일을 읽거나 앱의 CLI를 호출하는 직접 명령이 CLI 행동이다. 부록 B는 이 차이를 명시한다. 따라서 모든 tool call이 shell 형식을 쓴다고 CLI 비중을 100%로 계산하면 안 된다.

이 표현에서는 한 action에 여러 PyAutoGUI 호출을 넣거나, GUI 처리 뒤 파일 검증을 이어 붙일 수 있다. 모델은 서로 다른 도구 문법을 오가는 대신 같은 action 문법 안에서 작업 경로를 바꾼다. 다만 여러 내부 연산이 한 environment step에 묶이므로, 단계 수가 줄었다는 사실만으로 실제 실행 시간이 같은 비율로 줄었다고 해석할 수는 없다.

### 3. GUI only·CLI only·interleaved trajectory의 구성

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig3-pipeline.png" class="img-fluid rounded z-depth-1" caption="Figure 3: (a) 세 유형의 trajectory와 검증 가능한 RL task 생성, (b) 혼합 SFT, (c) CLI-aware reward를 이용한 온라인 RL." zoomable=true %}

GUI only 데이터는 [UI-MOPD](https://arxiv.org/abs/2607.04425)의 기존 trajectory에서 가져온다. 클릭, 드래그, 스크롤, 단축키와 입력을 동등한 PyAutoGUI 코드로 옮긴다. 좌표는 시각 입력과 예측 위치가 공유하는 1000×1000 공간에서 grounding하고, 실행 시 환경의 display 좌표로 변환한다. 원래 demonstration의 화면 조작을 보존하면서 표현만 맞추는 과정이다.

CLI only 데이터는 Qwen3.8-27B가 CLI만 사용해 CUA-Gym task를 수행한 성공 rollout에서 얻는다. 저자들은 앱 문서와 reference code를 정리한 CLI skill을 teacher에게 제공하고 Claude Code harness로 수집한다. 예를 들어 문서 파일의 직접 편집, UNO를 이용한 LibreOffice 상태 접근, media 파일의 프로그램 처리 같은 경로를 보여 준다. 이 skill은 데이터 수집용이다. 부록 G.3에 따르면 student의 SFT 문맥, RL rollout, 평가 prompt에는 포함되지 않는다.

Interleaved 데이터는 두 경로로 만든다. 첫째는 teacher가 GUI와 CLI를 모두 사용할 수 있는 상태에서 직접 선택하며 수행한 trajectory다. 둘째는 teacher의 GUI only trajectory 중 터미널에 명령을 입력하는 부분을 직접 CLI action으로 바꾸는 변환이다. 여러 입력 action에 걸친 명령은 먼저 완전한 명령으로 복원하고, 터미널 열기와 Enter 같은 불필요한 조작을 함께 제거한다. 일반 앱의 텍스트 입력이나 실제 GUI interaction은 보존한다.

변환한 trajectory는 반드시 replay해 성공한 것만 남긴다. 같은 명령이 실행된다고 이후 GUI가 기대하는 상태까지 같다는 보장은 없기 때문이다. 터미널 창을 여는 행동을 없애면 focus가 달라질 수 있고, 파일을 직접 고치면 열린 앱의 buffer와 디스크가 어긋날 수도 있다. 이 검증은 action 수를 줄이는 변환이 원래 작업의 의미까지 보존하는지 확인하는 단계다.

### 4. 세 실행 모드의 비교와 CLI advantage label

RL용 task는 지시문만 생성하지 않는다. 초기 환경 상태, 필요한 asset과 실행 가능한 verifier를 함께 만들고, target state가 도달 가능하며 verifier가 실행되는 task를 남긴다. 앱별 interface guide는 CLI가 잘 처리하는 연산과 GUI가 필요하거나 유리한 연산을 task generator에 알려 준다. 결과는 11개 domain의 검증된 task 3,000개다.

각 task에 대해 Qwen3.8-27B로 세 모드의 rollout을 각각 16개씩 수집한다. 성공률로 모드를 정렬하고, 차이가 5 percentage points 이내면 성공 rollout의 median step count로 비교한다. 그래도 동률이면 단일 인터페이스를 우선하고, 그다음 GUI only를 우선한다. 단순히 teacher에게 “CLI가 유리한가”라고 묻는 label과는 다르다.

최상위가 CLI only이면 선호 label은 1이다. 최상위가 GUI–CLI이면 성공 rollout의 절반을 넘는 수가 직접 CLI 명령을 적어도 한 번 사용했을 때 1이다. 나머지는 0이다. Label 0 task도 버리지 않는다. CLI를 사용하지 않는 것이 적절한 작업도 학습에 남아 있어야 선택 능력을 배울 수 있다. 다만 이 label은 task 전체의 선호이며, 각 상태에서 가능한 모든 행동의 최적성을 판정한 정답은 아니다.

### 5. Trajectory 간 전환과 한 step 내부의 협력

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig7-writer-cooperation.png" class="img-fluid rounded z-depth-1" caption="Figure 7: Writer 서식 작업의 step 7 GUI 조작, step 10 문서 파일 편집, step 13 GUI 상태 처리와 저장 파일 검증의 결합." zoomable=true %}

Figure 7의 작업은 서론·본문·결론의 줄 간격을 각각 1.0·2.0·1.5로 설정하고 글자 크기를 12pt로 맞추는 것이다. Step 7은 GUI로 Writer 창을 활성화하고 메뉴를 연다. Step 10은 `python-docx`로 파일 속성을 바꾸고 저장한다. 같은 작업을 화면과 파일의 서로 다른 수준에서 이어 가는 예다.

Step 13은 더 작은 단위의 협력을 보여 준다. PyAutoGUI로 메뉴를 닫은 뒤, 저장된 문서를 다시 읽어 글자 크기와 줄 간격을 확인한다. 두 연산이 하나의 `bash` call 안에서 순서대로 실행된다. 따라서 hybrid는 반드시 tool call마다 GUI와 CLI를 번갈아 사용하는 패턴만을 뜻하지 않는다. 핵심은 다음 상태를 만들고 확인하는 데 필요한 경로를 연결하는 것이다. 파일 속성 확인과 화면에서 실제 서식이 올바르게 보이는지의 확인은 여전히 서로 다른 검증이라는 점도 남는다.

## 학습 목표 / 손실 함수

### Agent response의 SFT와 성공 조건부 CLI reward

SFT는 task 지시와 observation·action history를 바탕으로 다음 agent response를 예측한다. 실제 step-level 학습에서는 현재 prefix의 마지막 assistant turn만 loss에 기여하고 이전 turn은 문맥에 남기되 mask한다. 세 trajectory 유형이 GUI 제어, 명령 작성과 인터페이스 전환의 demonstration을 제공한다.

RL에서는 task evaluator의 binary outcome reward에 CLI 선호 reward를 더한다. 아래에서 b는 rollout에 직접 CLI 명령이 적어도 한 번 있는지, 별표가 붙은 b는 task의 선호 label이다.

$$
\begin{aligned}
R_{\mathrm{CLI}}(\tau)
&= \mathbf{1}[\mathrm{Success}(\tau)]\,
   \mathbf{1}[b(\tau)=b^{\star}], \\
R(\tau)&=R_{\mathrm{acc}}+0.1R_{\mathrm{CLI}}(\tau).
\end{aligned}
$$

작업에 실패하면 CLI 사용 여부가 맞아도 추가 reward는 없다. 성공한 task에서 label 1이면 CLI를 쓴 경로를, label 0이면 직접 CLI를 쓰지 않은 경로를 더 선호한다. 이 식은 CLI 호출 수마다 보상을 쌓거나 최소 step count를 직접 최적화하는 식이 아니다. Label 1인 성공 trajectory는 적어도 한 번 사용했다는 조건만 충족하면 된다. 효율 개선은 이 제한된 신호를 이용한 학습 결과로 평가해야 한다.

### Shell 실행 실패의 국소적 penalty

$$
r_t^{\mathrm{exec}}=
\begin{cases}
-1,&\text{shell-level execution failure},\\
0,&\text{otherwise}.
\end{cases}
$$

Non-CLI step에는 0을 준다. Command의 실행이 실패했다면 나중에 task를 성공해도 그 명령의 잘못은 사라지지 않게 한다. 반대로 shell이 정상 종료했다고 사용자의 의미적 요구까지 맞췄다는 뜻은 아니다. 엉뚱한 파일을 정상적으로 수정한 명령은 이 신호만으로 교정할 수 없고, task evaluator의 최종 결과가 별도로 필요하다.

### Group-relative advantage와 action token의 결합

$$
\begin{aligned}
\widehat{A}_{t,j}
&=\frac{R(\tau)-\mu_G}{\sigma_G+\epsilon}
  +0.3r_t^{\mathrm{exec}},\\
&\hspace{1em}j\in\mathrm{Tok}(a_t).
\end{aligned}
$$

GRPO group의 trajectory reward를 평균과 표준편차로 정규화한 뒤, 해당 action의 token에 execution term을 더한다. 실패 횟수를 전부 trajectory reward에 넣고 함께 정규화하는 것과 다르다. 성공·선택의 상대적 평가와 특정 명령의 실행 실패가 서로 다른 위치에서 gradient에 영향을 준다.

구현은 step sample을 trajectory 기준으로 중복 제거한 뒤 group 통계를 계산한다. 긴 trajectory가 step 수만큼 group 평균에 반복 집계되는 것을 막기 위해서다. 결합 trajectory reward가 거의 동일한 group은 정규화 전에 걸러낸다. 이 filtering의 기준에는 나중에 더하는 execution penalty가 들어가지 않는다. 부록 D의 이런 세부 사항은 reward 식을 코드로 옮길 때 계산 순서를 보존하는 데 중요하다.

## 학습 데이터와 파이프라인

### HybridCUA-8K의 데이터 단위와 분포

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig8-data-composition.png" class="img-fluid rounded z-depth-1" caption="Figure 8: (a) SFT application domain과 domain 내부 modality, (b) GUI only·CLI only·hybrid trajectory 수, (c) modality별 logical step 길이 분포." zoomable=true %}

HybridCUA-8K는 8,000개의 동일한 demonstration을 뜻하지 않는다. SFT trajectory 5,023개는 한 번의 실행을 기록하고, RL task 3,000개는 여러 rollout을 만들 수 있는 환경·목표·검증기를 정의한다. Figure 8의 SFT 구성은 GUI only 870개, CLI only 3,155개, hybrid 998개다. CLI only가 62.8%로 가장 많지만, 이것은 학습 trajectory의 비중이다. 최종 모델의 CLI step 비중과 같은 수치가 아니다.

SFT trajectory의 평균 logical step은 10.4, median은 7, 90th percentile은 22, 최대는 50이다. LibreOffice Impress·Writer·Calc가 각각 866·818·811개이고 multi-app이 786개다. 이름에 hybrid가 들어간다고 실제 전환을 포함한 trajectory만으로 학습하는 것도 아니다. 독립적인 GUI·CLI demonstration이 전환 사례의 기반이 되는 구성을 실험으로 비교한다.

### SFT prefix와 온라인 RL의 실제 설정

| 항목 | SFT | 온라인 RL |
|------|-----|-----------|
| 초기 모델 | Qwen3.5-9B | 혼합 SFT checkpoint |
| 데이터 | 5,023 trajectory에서 길이 filtering 후 46,876 step sample | 검증 task 3,000개 중 1,000개 sampling |
| 학습 규모 | 2 epochs, optimizer update 366회 | Prompt당 rollout 8개, nominal batch 8 groups·64 trajectories |
| Learning rate | 0.00001, cosine, warm-up 10% | 0.000001, constant |
| GPU | NVIDIA H20 16개 | NVIDIA H20 24개: 학습 16개·추론 8개 |
| 구현 | verl · Megatron-LM | slime · Megatron-LM · SGLang |
| 환경 step 제한 | 원본 trajectory 최대 50 | 학습 30, 평가 50 |

원래 trajectory를 모든 결정 시점에서 확장하면 step sample 52,227개가 되고, 12,000-token 제한으로 걸러 46,876개를 사용한다. SFT에서는 현재 screenshot을 높은 해상도로, 직전 두 screenshot을 낮은 해상도로 유지한다. 현재 frame의 visual token은 2,040개, 과거 frame은 각각 510개로 최대 3,060개다. 오래된 screenshot은 placeholder로 바꾸고 action history는 최근 30단계로 제한한다.

RL 역시 최대 세 screenshot을 유지하지만, 최근 세 step의 텍스트만 완전하게 남기고 이전 step은 한 줄 action summary로 줄인다. CLI output은 step당 1,000자로 제한한다. 큰 출력이나 오래된 화면의 세부 내용이 모두 보존되는 agent는 아니다. 긴 문맥을 압축하는 정책도 학습 환경의 일부이므로, shell 권한만 같다고 동일한 설정이라고 볼 수 없다.

Optimization과 rollout은 비동기로 진행한다. Group의 가장 오래된 생성 policy가 현재 policy보다 optimizer update 두 번을 넘게 뒤처지면 버린다. 환경 lifecycle 때문에 중단된 trajectory는 gradient에서 제외하지만, VM 안에서 반환된 명령 실행 실패는 해당 step을 제거하는 이유가 되지 않는다. 오류가 학습 데이터에 남아 있어야 execution penalty로 그 행동을 교정할 수 있다.

## 실험 결과

### OSWorld의 평가 점수와 전체 task 평균 단계

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/tab1-osworld.png" class="img-fluid rounded z-depth-1" caption="Table 1: OSWorld의 action space, Acc.(%)와 전체 task 평균 단계 수. GUI·GUI+CLI의 base, SFT, RL 구성 비교." zoomable=true %}

OSWorld는 361개 task, task당 최대 50 environment steps로 평가한다. 부록 E의 Acc.는 evaluator 점수를 평균한 백분율이다. 대부분 verifier는 binary지만 일부는 fractional score를 반환하며, 저자들은 이를 thresholding하지 않고 그대로 평균한다. 따라서 53.6%를 “361개 중 정확히 53.6%를 완벽하게 성공”으로 바꾸어 설명하면 부정확하다. 아래 비교는 논문이 보고한 같은 집계 방식의 점수다.

| 구성 | GUI Acc. / 평균 단계 | GUI+CLI Acc. / 평균 단계 |
|------|----------------------|--------------------------|
| Qwen3.5-9B base | 38.8% / 31.6 | 18.4% / 22.1 |
| SFT 후 | 44.2% / 26.3 | 46.0% / 19.8 |
| SFT + RL 후 | 50.4% / 22.1 | 53.6% / 14.0 |

최종 hybrid는 GUI base보다 +14.8 percentage points, 같은 두 단계 학습을 거친 GUI 구성보다 +3.2 points다. 두 branch는 같은 base, 비교 가능한 SFT corpus, 동일 RLVR task와 RL step을 사용한다. 저자들의 비교는 단순히 학습 모델과 미학습 모델만 대비하는 것보다 추가 인터페이스의 효과를 더 직접적으로 보여 준다.

Avg. Steps는 성공 task만의 평균이 아니다. 실패를 포함하며 `wait`와 종료 action도 센다. 예산을 다 쓰면 50단계다. CLI 추가만 한 base는 9.5단계 짧아지지만 점수가 20.4 points 떨어지므로 좋은 압축이라고 볼 수 없다. 학습 후 점수와 단계가 함께 개선된 결과가 핵심이며, 실제 latency·token 비용은 이 두 열만으로 계산할 수 없다.

### 비교 가능한 모델 규모와 GUI–API baseline

HybridCUA-9B의 53.6%는 AutoGLM-OS-9B 48.9%보다 +4.7 points, ToolCUA-8B 46.8%보다 +6.8 points다. ToolCUA의 평균 14.9단계와 비교하면 0.9단계 짧다. UltraCUA-32B는 43.7%다. 다만 Table 1의 EvoCUA-32B는 56.7%로 HybridCUA보다 높다. 따라서 “모든 공개 agent 중 최고”라는 주장으로 넓히지 않고, 비슷한 규모에서의 성능과 효율로 읽는 것이 정확하다.

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig2-cli-gap.png" class="img-fluid rounded z-depth-1" caption="Figure 2: (a) 기존 agent의 CLI 추가 전후 OSWorld Acc.(%)와 학습된 HybridCUA, (b) 직접 CLI 실행 step의 비중(%)." zoomable=true %}

Figure 2는 더 큰 모델도 CLI 접근만으로 개선되지 않는다는 진단이다. 예를 들어 Qwen3.5-27B의 CLI step 비중은 15.0%, EvoCUA-32B는 0.15%이며, HybridCUA는 64.0%다. 반대로 CLI를 많이 쓰는 baseline도 성능이 하락한다. 사용 빈도와 적절한 선택이 다르다는 근거이지, 모든 domain에서 CLI를 더 많이 쓰라는 규칙은 아니다.

### OSWorld-MCP와 WindowsAgentArena 전이

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/tab3-transfer.png" class="img-fluid rounded z-depth-1" caption="Table 3: OSWorld-MCP와 WindowsAgentArena의 평가 점수(%). GUI, GUI+API, GUI+CLI 구성별 환경 전이 비교." zoomable=true %}

OSWorld-MCP에서는 47.1%로 Qwen3.5-9B의 38.0%보다 +9.1 points이며, ToolCUA-8B의 46.8%와 가깝다. WindowsAgentArena에서는 36.0%로 base 32.0%보다 +4.0 points, ToolCUA 33.8%보다 +2.2 points다. Linux shell만으로 학습한 모델이 PowerShell 명령을 사용한 점은 특정 Linux 명령의 복제 이상의 전이 가능성을 시사한다.

두 평가의 의미는 다르다. OSWorld-MCP는 OSWorld의 같은 361개 task에 MCP-enabled 환경을 제공한다. 새로운 task 집합에 대한 일반화로 설명하면 안 된다. WindowsAgentArena는 운영체제를 바꾸고 154개 task를 사용한다. 또한 MCP-enabled라는 이름이 모든 모델에 같은 MCP tool을 제공했다는 뜻은 아니다. 논문도 interface access를 평가 configuration의 일부로 명시하며, 두 점수를 하나의 OOD 평균으로 합치지 않는다.

## 결과 분석 / Ablation

### 세 trajectory 유형의 혼합과 공통 action schema

Table 2의 SFT 데이터 ablation에서 CLI only는 31.7%·19.1단계, GUI only는 43.2%·29.5단계, hybrid only는 41.0%·22.6단계다. 혼합은 46.0%·19.8단계로 각 단일 유형보다 점수가 높다. CLI only보다 0.7단계를 더 사용하지만 점수는 +14.3 points다. Interleaved 데이터만으로 충분하지 않으며, 양쪽의 독립적인 실행 능력을 함께 보여 주는 것이 도움이 된다는 결과다. 이 표의 GUI only 43.2%는 Table 1 GUI branch의 SFT 44.2%와 별도 실험값이다.

Table 4는 같은 base와 trajectory를 두 action schema로 학습한 SFT 비교다. Separate GUI/CLI tools는 38.8%·16.8단계, unified `bash`는 46.0%·19.8단계다. 공통 문법이 +7.2 points를 얻지만 3.0단계 더 길다. 여기에서도 가장 짧은 trajectory가 가장 좋은 구성은 아니다. 이 차이를 최종 RL 모델 53.6%의 모든 원인으로 해석할 수는 없지만, action 표현 자체가 학습 성능의 중요한 변수라는 점은 분명하다.

### Task-level 선택 reward와 step-level 실행 reward

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig4-reward-ablation.png" class="img-fluid rounded z-depth-1" caption="Figure 4: RL update에 따른 (a) Acc.(%), (b) 평균 환경 단계, (c) CLI step 비중(%), (d) CLI 실행 오류율(%). Full reward와 두 reward 제거 구성, 점선 SFT 기준." zoomable=true %}

혼합 SFT에서 RL로 진행하면 점수는 46.0%에서 53.6%로 +7.6 points, 단계는 19.8에서 14.0으로 줄어든다. SFT 대비 5.8단계, 29.3% 감소다. 두 reward ablation은 같은 SFT checkpoint와 같은 GRPO 예산에서 시작한다.

Task-level CLI reward를 제거하면 점수 손실은 작지만 단계 감소는 18.2%에 그치며 CLI 비중은 64.0% 대신 58.9%다. 이 신호는 주로 인터페이스 선택과 경로의 효율에 영향을 준다. Step-level execution reward를 제거하면 점수와 단계는 비슷하지만 update 120에서 실행 오류율이 16.5%로 올라간다. 전체 구성은 11.5%다. 최종 task 점수만 봤다면 놓칠 수 있는 신뢰성 차이다.

CLI 비중은 모든 executable step을 pooled counting한 값이다. Control action은 분모에 넣지 않으며, task별 비중을 동일 가중 평균한 값도 아니다. 실행 오류율은 직접 CLI step 중 shell-level 실패의 비율이다. 따라서 11.5%를 전체 task 실패율로 바꾸거나, 64.0%를 task의 64%가 CLI only라는 뜻으로 읽으면 안 된다. reward가 겨냥한 행동 단위와 지표의 집계 단위를 함께 봐야 한다.

### Domain·operation별 선택과 검증 경로

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig5-domain-routing.png" class="img-fluid rounded z-depth-1" caption="Figure 5: (a) OSWorld domain별 평가 점수와 증감, (b) domain별 GUI·CLI executable step 비중(%). OS의 CLI 84%, Chrome의 GUI 74%." zoomable=true %}

OS에서는 CLI가 84%, Chrome에서는 GUI가 74%를 차지한다. 시스템 파일과 설정은 직접 명령이 유리하고, 웹 페이지의 시각적 상호작용은 GUI를 유지하는 경향이다. 다만 Figure 5의 domain별 점수 비교에서 Thunderbird는 66.7%에서 57.1%로 하락한다. 전체 평균이 개선되어도 모든 앱에 동일한 이득이 있다는 뜻은 아니다. 그림의 변화만으로 하락 원인을 특정 명령이나 routing 오류로 단정할 근거도 부족하다.

{% include figure.liquid loading="eager" path="assets/img/papers/0045-hybridcua-learning-to-orchestrate-gui-and-cli-for-computer-u/fig6-operation-routing.png" class="img-fluid rounded z-depth-1" caption="Figure 6: 정보 수집·내용 편집·공간 조정·결과 검증의 GUI·CLI step 비중(%). 내용 편집 CLI 85.8%, 결과 검증 CLI 98.4%, 공간 조정 GUI 58.4%." zoomable=true %}

Operation별로는 내용 편집의 CLI 비중이 85.8%, 결과 검증은 98.4%다. 공간 조정은 GUI 58.4%, 정보 수집은 GUI 63.9%다. 앱 이름만으로 선택을 고정하기보다 같은 앱 안에서도 작업의 성격에 따라 경로가 달라지는 것으로 읽을 수 있다. 다만 이 분포는 관찰 결과이며, 해당 비중을 외부에서 강제했을 때 성능이 같다는 인과적 증거는 아니다.

부록의 VLC 사례도 이 구분을 보여 준다. GUI preference 탐색이 원하는 값을 확정하지 못하자 agent는 `vlcrc`를 찾아 최대 음량 설정을 125%에서 200%로 바꾸고 read-back한다. Evaluator는 VLC를 다시 실행해 설정을 확인하고 1.0점을 준다. Rollout 자체에 변경된 음량 control이 보이는 것은 아니다. Shell의 검증 출력, 화면 관찰, evaluator의 확인 범위가 각각 무엇을 증명하는지 구분할 필요가 있다.

## 한계와 비판적 평가

### CLI 가용성과 화면·파일 상태의 불일치

저자들은 CLI의 가용성과 안정성을 첫 한계로 든다. 적절한 CLI가 없는 앱, shell이 제한된 환경, 운영체제별 명령 의미가 다른 상황에서는 routing 정책도 달라져야 한다. 공통 shell wrapper를 쓴다고 앱의 파일 포맷과 프로그램 인터페이스가 저절로 통일되는 것은 아니다. Teacher skill을 만드는 과정 역시 앱별 문서와 구현을 이해하는 작업을 필요로 한다.

열린 앱의 buffer와 저장 파일이 어긋나는 문제도 중요하다. 데이터 생성은 replay로 일부 문제를 걸러내지만, 새로운 workflow에서 모든 상태 충돌을 방지하는 일반적인 동기화 방법을 제시하지는 않는다. 파일 read-back이 맞아도 GUI에서 저장을 다시 누르면 이전 내용이 덮어써질 수 있다. 이 부분은 논문의 직접 관찰 사례와 별개로, hybrid 실행을 실제 앱에 적용할 때 검증해야 할 상태 관리의 문제다.

### Task label의 해상도와 verifier의 의미적 범위

CLI advantage label은 teacher의 16개 rollout과 task 단위 비교에서 얻는다. Teacher의 실패나 제한된 sampling에 영향을 받을 수 있고, 어느 중간 상태에서 전환해야 하는지까지 알려 주지 않는다. CLI를 한 번만 쓰는 조건은 유용한 최소 신호지만, 여러 번의 불필요한 호출이나 부적절한 전환을 모두 구별하지 못한다. Step-level reward도 shell 실행 실패만 다루므로 정상 종료한 의미적 오작동은 최종 verifier에 의존한다.

Verifier가 성공으로 인정하는 범위와 사용자의 요구가 얼마나 맞는지도 남는 문제다. 부록의 terminal screenshot 사례에서 evaluator는 `ls` 또는 OCR 변형을 확인하지만 모든 directory entry를 확인하지는 않는다. 해당 사례의 1.0점이 이미지의 모든 요구사항을 완전하게 검증했다는 뜻은 아니다. 검증 가능한 reward의 존재와 reward specification의 완전성은 별도로 평가해야 한다.

### 단일 평가 run과 단계 기반 효율의 한계

모델·benchmark별 결과는 single evaluation run이다. Run 간 변동이나 신뢰구간이 보고되지 않아 OSWorld-MCP의 ToolCUA 대비 0.3-point 차이를 안정적인 우위로 읽기는 어렵다. 또한 OSWorld-MCP는 같은 task를 재사용하며, Windows 전이도 모든 permission·앱·long-horizon workflow를 대표하지 않는다. 저자들은 데이터가 OSWorld 중심의 앱에 집중되어 있다는 범위 한계도 인정한다.

평균 step은 유용하지만 latency나 비용의 대체 지표는 아니다. 한 shell action에 긴 프로그램을 넣으면 환경 interaction 수는 줄어도 실행 시간과 검증 부담은 커질 수 있다. 논문은 benchmark VM에서 계정·credential 없이 실험했으며 실제 사용자 환경에서의 행동과 안전성은 평가 범위 밖이다. 그러므로 이 결과는 hybrid 학습의 효과를 보여 주는 근거이지, 제한 없는 실제 업무 자동화의 준비도를 증명하는 결과는 아니다.

## 시사점 / Takeaways

- <strong>도구를 추가할 때 필요한 것은 그 도구가 들어간 실행 문맥.</strong> 코드 작성 능력과 GUI workflow 안의 CLI 선택 능력을 같은 것으로 가정하지 말아야 한다.
- <strong>선택의 적절성과 실행의 신뢰성을 다른 지표로 추적.</strong> 최종 점수가 비슷해도 명령 오류율은 달라질 수 있다. Trajectory 결과와 action 실패를 함께 기록하는 것이 중요하다.
- <strong>Action 표현도 학습 설계의 일부.</strong> 공통 문법과 독립적인 GUI·CLI demonstration이 interleaved 사례의 학습을 돕는지 실제 ablation으로 확인할 수 있다.
- <strong>효율 비교의 기준은 결과 품질과 집계 단위.</strong> 짧은 실패 경로, 성공 task만의 평균, 묶인 내부 연산을 구분해야 step 감소의 의미가 분명해진다.
- <strong>검증 경로의 상호보완성.</strong> 파일 read-back과 화면 확인은 서로 다른 상태를 본다. 둘을 연결하는 것 자체가 hybrid agent의 중요한 능력이다.

## 설치 및 사용법

2026-10-01 기준 공식 저장소는 환경 인프라와 학습 코드를 공개했고, README에는 HybridCUA-9B weight가 `coming soon`으로 표시되어 있다. 따라서 공개 checkpoint를 바로 불러오는 inference 예제로 설명하지 않는다. 설치 script는 GPU·CUDA toolkit이 있는 학습 노드와 Python 3.12를 전제로 하며, README의 짧은 명령 외에 `VENV`와 `BASE_DIR`을 필수로 요구한다. 두 값을 지정하는 준비 예시는 다음과 같다.

```bash
git clone https://github.com/ZJU-REAL/HybridCUA.git
cd HybridCUA
HYBRID_ROOT="$(pwd)"
VENV="$HYBRID_ROOT/venvs/online-rl" \
BASE_DIR="$HYBRID_ROOT/online-rl" \
PYBIN="$(command -v python3.12)" \
BACKGROUND=0 bash online-rl/install_env.sh
```

이후 환경 서버, SFT checkpoint와 학습 설정을 준비해야 한다. 공식 RL entry는 `online-rl/gui-rl/scripts/HybridCUA-9B_16gpu_fully_async.sh`이며 `HF_CKPT`, `GUI_ENV_SERVER_URL`, `WANDB_API_KEY`를 사용한다. 공개 script의 16-GPU 구성과 논문 Table 8의 전체 24-GPU 실험 구성을 동일시하지 말아야 한다. 위 예시와 경로는 공개 코드에서 확인했지만, 이 리뷰에서는 설치·학습·추론을 실행하지 않았다. 세부 서버 구성은 [환경 인프라 문서](https://github.com/ZJU-REAL/HybridCUA/blob/main/env_infra/README.md)를 따른다.

## 참고 자료

- [HybridCUA 논문](https://arxiv.org/abs/2609.38008): arXiv v1, 본문 및 부록 A–G. 그림·표의 출처는 Chen et al.의 원 논문. arXiv의 [non-exclusive distribution license](https://arxiv.org/licenses/nonexclusive-distrib/1.0/license.html)는 CC BY와 구분.
- [공식 코드](https://github.com/ZJU-REAL/HybridCUA): Apache-2.0, 환경 인프라와 온라인 학습 구현.
- [프로젝트 페이지](https://zjureal.com/HybridCUA/): 방법, 실험과 trajectory 사례.
- [공식 데이터 collection 링크](https://huggingface.co/collections/077lukamagic/hybridcua): README가 안내하는 HybridCUA 자료 경로.

## 더 읽어보기

- **[OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments](https://arxiv.org/abs/2404.07972)** (Xie et al., 2024): 실제 컴퓨터 환경의 초기 상태, 작업 실행과 결과 평가를 연결한 benchmark.
- **[CUA-Gym: Scaling Verifiable Training Environments and Tasks for Computer-Use Agents](https://arxiv.org/abs/2605.25624)** (Wang et al., 2026): Task 지시·환경 상태·검증기를 함께 생성하는 computer-use RLVR pipeline.
- **[ToolCUA: Towards Optimal GUI-Tool Path Orchestration for Computer Use Agents](https://arxiv.org/abs/2605.12481)** (Hu et al., 2026): GUI와 고수준 도구의 경로 선택을 학습하는 hybrid agent.
- **[UI-MOPD: Multi-Platform On-Policy Distillation for Unified GUI Agents](https://arxiv.org/abs/2607.04425)** (Lian et al., 2026): 플랫폼별 teacher의 supervision을 공유 student에 전달하는 GUI agent 학습과 trajectory 자원.

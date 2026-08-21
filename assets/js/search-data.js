// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "post-paper-review-agentic-method-for-deterministic-validation-of-legacy-code-migration",
        
          title: "[Paper Review] Agentic Method for Deterministic Validation of Legacy Code Migration",
        
        description: "American Express&#39;s Locksmith Loop: when input search stalls during COBOL-to-Java migration validation, mutate the harness itself to open new execution regions, apply the mutation symmetrically to both languages, and let a deterministic parity oracle decide what survives",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/";
          
        },
      },{id: "post-논문-리뷰-agentic-method-for-deterministic-validation-of-legacy-code-migration",
        
          title: "[논문 리뷰] Agentic Method for Deterministic Validation of Legacy Code Migration",
        
        description: "COBOL→Java 마이그레이션 검증에서 입력 탐색이 막히면 하네스 자체를 변형해 새 실행 영역을 열고, 그 변형을 두 언어에 대칭 적용한 뒤 결정론적 parity 오라클로 판정하는 American Express 의 Locksmith Loop",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0034-agentic-method-for-deterministic-validation-of-legacy-code/";
          
        },
      },{id: "post-paper-review-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adapted-llm",
        
          title: "[Paper Review] RAGU: A Multi-Step GraphRAG Engine with a Compact Domain-Adapted LLM",
        
        description: "A GraphRAG engine that separates extraction from consolidation, and a scaling hypothesis that justifies running the whole indexing pipeline on a 7B model",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/";
          
        },
      },{id: "post-논문-리뷰-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adapted-llm",
        
          title: "[논문 리뷰] RAGU: A Multi-Step GraphRAG Engine with a Compact Domain-Adapted LLM",
        
        description: "단일 패스 추출 대신 추출과 통합을 분리한 GraphRAG 엔진, 그리고 RAG 파이프라인 안의 LLM 에는 세계 지식이 아니라 언어 능력이 필요하다는 가설로 7B 추출기를 정당화한 시스템 논문",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0033-ragu-a-multi-step-graphrag-engine-with-a-compact-domain-adap/";
          
        },
      },{id: "post-paper-review-hierarchical-self-improvement-a-framework-for-task-specific-evolvable-agent-harnesses",
        
          title: "[Paper Review] Hierarchical Self-Improvement: A Framework for Task-Specific Evolvable Agent Harnesses",
        
        description: "Freeze the model, evolve only the harness across three nested scopes — +39.3 on BabyAI and +33.0 on Crafter, plus an honest account of exactly where the gains stop",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/";
          
        },
      },{id: "post-논문-리뷰-hierarchical-self-improvement-a-framework-for-task-specific-evolvable-agent-harnesses",
        
          title: "[논문 리뷰] Hierarchical Self-Improvement: A Framework for Task-Specific Evolvable Agent Harnesses",
        
        description: "모델을 얼려둔 채 에이전트 하네스만 3계층으로 진화시켜 BALROG 에서 BabyAI +39.3, Crafter +33.0 을 얻고, 그 개선이 어디서 멈추는지까지 실증한 프레임워크",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0032-hierarchical-self-improvement-a-framework-for-task-specific/";
          
        },
      },{id: "post-paper-review-nvidia-labs-oo-agents-native-python-object-oriented-agents",
        
          title: "[Paper Review] NVIDIA-labs OO Agents: Native Python Object-Oriented Agents",
        
        description: "An agent is not a bundle of prompt templates, tool schemas, and workflow graphs. It is a Python object: methods are actions, fields are state, docstrings are prompts, type annotations are contracts.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/";
          
        },
      },{id: "post-논문-리뷰-nvidia-labs-oo-agents-native-python-object-oriented-agents",
        
          title: "[논문 리뷰] NVIDIA-labs OO Agents: Native Python Object-Oriented Agents",
        
        description: "에이전트를 프롬프트 템플릿·툴 스키마·워크플로 그래프의 조합이 아니라 그냥 Python 객체로 만든다. 메서드가 행동, 필드가 상태, docstring 이 프롬프트, 타입 어노테이션이 계약이다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0031-nvidia-labs-oo-agents-native-python-object-oriented-agents/";
          
        },
      },{id: "post-paper-review-skaling-chinchilla-39-s-exponents-meet-kaplan-39-s-coupling",
        
          title: "[Paper Review] Skaling: Chinchilla&#39;s Exponents Meet Kaplan&#39;s Coupling",
        
        description: "Chinchilla&#39;s additive scaling law hard-codes the assumption that model size and data act independently. Measured mixed derivatives say otherwise, and one extra exponent cuts boundary extrapolation error by more than 10x.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/";
          
        },
      },{id: "post-논문-리뷰-skaling-chinchilla-39-s-exponents-meet-kaplan-39-s-coupling",
        
          title: "[논문 리뷰] Skaling: Chinchilla&#39;s Exponents Meet Kaplan&#39;s Coupling",
        
        description: "Chinchilla 의 가법형 scaling law 가 강제하는 &#39;모델 크기와 데이터는 독립&#39;이라는 가정을 실측 혼합 편미분으로 반증하고, 외부 지수 하나로 두 축을 결합해 경계 외삽 오차를 10배 넘게 줄인 연구",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0030-skaling-chinchilla-s-exponents-meet-kaplan-s-coupling/";
          
        },
      },{id: "post-paper-review-scientistone-towards-human-level-autonomous-research-via-chain-of-evidence",
        
          title: "[Paper Review] ScientistOne: Towards Human-Level Autonomous Research via Chain-of-Evidence",
        
        description: "Papers from autonomous research agents read well but their evidence chains are broken. An audit of 75 papers exposes a systematic failure in every baseline, and a system that keeps every claim tied to its evidence while writing.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/";
          
        },
      },{id: "post-논문-리뷰-scientistone-towards-human-level-autonomous-research-via-chain-of-evidence",
        
          title: "[논문 리뷰] ScientistOne: Towards Human-Level Autonomous Research via Chain-of-Evidence",
        
        description: "자율 연구 에이전트의 논문은 잘 읽히지만 근거가 끊겨 있다. 논문 75편을 감사해 baseline 전원의 체계적 실패를 드러내고, 모든 claim 을 근거에 묶은 채로 논문을 쓰는 시스템을 제시한 Google Cloud AI Research 의 작업.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0029-scientistone-towards-human-level-autonomous-research-via-cha/";
          
        },
      },{id: "post-paper-review-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-improvement-in-machine-learning-engineering",
        
          title: "[Paper Review] Frontis-MA1: Training an AI4AI Model towards Recursive Self-Improvement in Machine Learning...",
        
        description: "Four atomic operators — Draft, Improve, Debug, Crossover — shared between post-training and evolutionary search. A 35B model hits 71.21% on MLE-Bench Lite on a single RTX 4090 with a 12-hour per-task budget.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/";
          
        },
      },{id: "post-논문-리뷰-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-improvement-in-machine-learning-engineering",
        
          title: "[논문 리뷰] Frontis-MA1: Training an AI4AI Model towards Recursive Self-Improvement in Machine Learning...",
        
        description: "Draft·Improve·Debug·Crossover 네 개의 원자 operator 를 post-training 과 진화 탐색이 공유하게 만든 오픈 풀스택. 35B 모델이 RTX 4090 한 장·12시간 예산에서 MLE-Bench Lite 71.21% 를 찍는다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0028-frontis-ma1-training-an-ai4ai-model-towards-recursive-self-i/";
          
        },
      },{id: "post-paper-review-kimi-k3-open-frontier-intelligence",
        
          title: "[Paper Review] Kimi K3: Open Frontier Intelligence",
        
        description: "A 2.8T-parameter, 104B-active, 1M-context open-weight MoE. Kimi Delta Attention, Attention Residuals, and Stable LatentMoE push scaling efficiency 2.5x over Kimi K2 to reach the frontier.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0027-kimi-k3-open-frontier-intelligence/";
          
        },
      },{id: "post-논문-리뷰-kimi-k3-open-frontier-intelligence",
        
          title: "[논문 리뷰] Kimi K3: Open Frontier Intelligence",
        
        description: "2.8T 파라미터 · 104B 활성 · 1M 컨텍스트의 오픈 웨이트 MoE. Kimi Delta Attention, Attention Residuals, Stable LatentMoE 로 Kimi K2 대비 scaling 효율을 2.5배 끌어올린 프런티어 모델.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0027-kimi-k3-open-frontier-intelligence/";
          
        },
      },{id: "post-paper-review-autodata-an-agentic-data-scientist-to-create-high-quality-synthetic-data",
        
          title: "[Paper Review] Autodata: An agentic data scientist to create high quality synthetic data...",
        
        description: "An LLM agent that acts as a data scientist — creating synthetic data, evaluating it, and revising its recipe in a loop — plus how to meta-optimize the agent itself.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0026-autodata-an-agentic-data-scientist/";
          
        },
      },{id: "post-논문-리뷰-autodata-an-agentic-data-scientist-to-create-high-quality-synthetic-data",
        
          title: "[논문 리뷰] Autodata: An agentic data scientist to create high quality synthetic data...",
        
        description: "LLM 에이전트가 데이터 사이언티스트처럼 합성 데이터를 만들고, 평가하고, 레시피를 고쳐가며 반복하는 Autodata 프레임워크 — 그리고 그 에이전트 자체를 메타 최적화하는 방법.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0026-autodata-an-agentic-data-scientist/";
          
        },
      },{id: "post-paper-review-shield-an-auto-healing-agentic-defense-framework-for-llm-resource-exhaustion-attacks",
        
          title: "[Paper Review] SHIELD: An Auto-Healing Agentic Defense Framework for LLM Resource Exhaustion Attacks...",
        
        description: "Turning detection failures into knowledge — SHIELD pairs a three-stage defense pipeline with a knowledge-update and prompt-optimization loop to self-heal against sponge attacks.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/";
          
        },
      },{id: "post-논문-리뷰-shield-an-auto-healing-agentic-defense-framework-for-llm-resource-exhaustion-attacks",
        
          title: "[논문 리뷰] SHIELD: An Auto-Healing Agentic Defense Framework for LLM Resource Exhaustion Attacks...",
        
        description: "탐지 실패를 지식으로 바꾸는 자가 치유형 멀티 에이전트 방어 — sponge 공격에 맞서 3단계 방어 파이프라인과 지식 갱신·프롬프트 최적화 루프를 결합한 SHIELD",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0025-shield-an-auto-healing-agentic-defense-framework-for-llm-res/";
          
        },
      },{id: "post-paper-review-code-world-model-preparedness-report",
        
          title: "[Paper Review] Code World Model Preparedness Report",
        
        description: "Meta&#39;s pre-release frontier-risk assessment of CWM, a 32B open-weight code model, across cybersecurity, chemical &amp; biological, and honesty (propensity) domains.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0024-code-world-model-preparedness-report/";
          
        },
      },{id: "post-논문-리뷰-code-world-model-preparedness-report",
        
          title: "[논문 리뷰] Code World Model Preparedness Report",
        
        description: "Meta가 32B 오픈웨이트 코드 모델 CWM을 공개하기 전, 사이버보안·화학생물학·정직성 세 영역에서 프런티어 위험을 사전 평가한 preparedness 리포트 정리.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0024-code-world-model-preparedness-report/";
          
        },
      },{id: "post-paper-review-a-survey-on-generative-recommendation-data-model-and-tasks",
        
          title: "[Paper Review] A Survey on Generative Recommendation: Data, Model, and Tasks",
        
        description: "A survey that reframes recommendation from discriminative scoring to generative synthesis, organized along the data, model, and task axes",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/";
          
        },
      },{id: "post-논문-리뷰-a-survey-on-generative-recommendation-data-model-and-tasks",
        
          title: "[논문 리뷰] A Survey on Generative Recommendation: Data, Model, and Tasks",
        
        description: "추천 시스템을 판별형 점수화에서 생성형 합성으로 재정의하는 흐름을, 데이터·모델·태스크 세 축으로 체계화한 서베이",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0023-a-survey-on-generative-recommendation-data-model-and-tasks/";
          
        },
      },{id: "post-paper-review-multi-interest-recommendation-a-survey",
        
          title: "[Paper Review] Multi-Interest Recommendation: A Survey",
        
        description: "The first comprehensive survey of multi-interest recommendation, organizing the field around extractors, aggregators, diversity regularization, applications, and open challenges.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0022-multi-interest-recommendation-a-survey/";
          
        },
      },{id: "post-논문-리뷰-multi-interest-recommendation-a-survey",
        
          title: "[논문 리뷰] Multi-Interest Recommendation: A Survey",
        
        description: "추천 시스템에서 사용자의 다중 관심사를 명시적으로 모델링하는 연구를 추출기·집계기·정규화·응용·미래 방향의 다섯 축으로 정리한 최초의 종합 서베이.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0022-multi-interest-recommendation-a-survey/";
          
        },
      },{id: "post-paper-review-robust-uplift-modeling-with-large-scale-contexts-for-real-time-marketing",
        
          title: "[Paper Review] Robust Uplift Modeling with Large-Scale Contexts for Real-time Marketing",
        
        description: "A review of UMLC (KDD 2025): a model-agnostic uplift framework that tames the distribution shift and variance inflation caused by large-scale contexts via response-guided context grouping and feature interaction.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/";
          
        },
      },{id: "post-논문-리뷰-robust-uplift-modeling-with-large-scale-contexts-for-real-time-marketing",
        
          title: "[논문 리뷰] Robust Uplift Modeling with Large-Scale Contexts for Real-time Marketing",
        
        description: "대규모 컨텍스트(짧은 영상 등)가 만드는 분포 변화와 분산 폭증을 response-guided 컨텍스트 그룹핑과 feature interaction으로 해결하는 model-agnostic uplift 프레임워크 UMLC (KDD 2025) 리뷰",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0021-robust-uplift-modeling-with-large-scale-contexts-for-real-ti/";
          
        },
      },{id: "post-paper-review-personalization-and-targeting-how-to-experiment-learn-amp-optimize",
        
          title: "[Paper Review] Personalization and targeting: how to experiment, learn &amp; optimize",
        
        description: "An IJRM review that formalizes personalization as a causal-inference problem and walks through the test-and-learn cycle for experimenting, learning, and optimizing",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0020-personalization-and-targeting-how-to-experiment-learn-optimi/";
          
        },
      },{id: "post-논문-리뷰-personalization-and-targeting-how-to-experiment-learn-amp-optimize",
        
          title: "[논문 리뷰] Personalization and targeting: how to experiment, learn &amp; optimize",
        
        description: "개인화를 인과추론 문제로 정식화하고, test-and-learn 사이클로 실험·학습·최적화하는 법을 정리한 IJRM 리뷰 논문",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0020-personalization-and-targeting-how-to-experiment-learn-optimi/";
          
        },
      },{id: "post-paper-review-mobileexplorer-accelerating-on-device-inference-for-mobile-gui-agents-via-online-exploration",
        
          title: "[Paper Review] MobileExplorer: Accelerating On-Device Inference for Mobile GUI Agents via Online Exploration...",
        
        description: "Instead of letting slow on-device VLM inference idle, MobileExplorer spends that window probing the screen to gather hints for the next reasoning step.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/";
          
        },
      },{id: "post-논문-리뷰-mobileexplorer-accelerating-on-device-inference-for-mobile-gui-agents-via-online-exploration",
        
          title: "[논문 리뷰] MobileExplorer: Accelerating On-Device Inference for Mobile GUI Agents via Online Exploration...",
        
        description: "온디바이스 VLM 추론의 긴 대기 시간을 그냥 흘려보내지 않고, 그 시간에 화면을 미리 탐색해 다음 추론에 쓸 힌트를 모으는 모바일 GUI 에이전트 프레임워크.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0019-mobileexplorer-accelerating-on-device-inference-for-mobile-g/";
          
        },
      },{id: "post-paper-review-ferret-ui-lite-lessons-from-building-small-on-device-gui-agents",
        
          title: "[Paper Review] Ferret-UI Lite: Lessons from Building Small On-Device GUI Agents",
        
        description: "Apple&#39;s 3B on-device GUI agent. A close read of how real+synthetic data curation, zoom-in visual tool-use, and a two-stage SFT→RLVR recipe push a small model as far as it can go on GUI grounding and navigation — and where it honestly hits a wall.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/";
          
        },
      },{id: "post-논문-리뷰-ferret-ui-lite-lessons-from-building-small-on-device-gui-agents",
        
          title: "[논문 리뷰] Ferret-UI Lite: Lessons from Building Small On-Device GUI Agents",
        
        description: "Apple이 만든 3B 온디바이스 GUI 에이전트. 실+합성 데이터 큐레이션, zoom-in 시각 도구 사용, SFT→RLVR 2단계 학습으로 작은 모델을 어디까지 끌어올릴 수 있는지, 그리고 어디서 막히는지를 정직하게 기록한 &#39;교훈 보고서&#39;를 깊게 읽는다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0018-ferret-ui-lite-lessons-from-building-small-on-device-gui-age/";
          
        },
      },{id: "post-paper-review-showui-one-vision-language-action-model-for-gui-visual-agent",
        
          title: "[Paper Review] ShowUI: One Vision-Language-Action Model for GUI Visual Agent",
        
        description: "A GUI agent that &#39;sees&#39; screenshots like a human and clicks. A deep dive into ShowUI&#39;s UI-guided token selection and interleaved vision-language-action streaming, which hit 75.1% zero-shot grounding with a 2B model and 256K data.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/";
          
        },
      },{id: "post-논문-리뷰-showui-one-vision-language-action-model-for-gui-visual-agent",
        
          title: "[논문 리뷰] ShowUI: One Vision-Language-Action Model for GUI Visual Agent",
        
        description: "스크린샷을 사람처럼 &#39;보고&#39; 클릭하는 GUI 에이전트. 2B 모델과 256K 데이터로 zero-shot 그라운딩 75.1%를 달성한 ShowUI의 UI-guided 토큰 선택과 interleaved vision-language-action 스트리밍을 깊게 본다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0017-showui-one-vision-language-action-model-for-gui-visual-agent/";
          
        },
      },{id: "post-paper-review-mint-managed-infrastructure-for-training-and-serving-millions-of-llms",
        
          title: "[Paper Review] MinT: Managed Infrastructure for Training and Serving Millions of LLMs",
        
        description: "A managed infrastructure for training and serving millions of LoRA policies over a small set of resident base models. Adapter revisions become the unit that crosses the training-serving boundary, cutting the handoff by 18.3x and validating the path up to 1T-scale MoE.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/";
          
        },
      },{id: "post-논문-리뷰-mint-managed-infrastructure-for-training-and-serving-millions-of-llms",
        
          title: "[논문 리뷰] MinT: Managed Infrastructure for Training and Serving Millions of LLMs",
        
        description: "수백만 개의 LoRA 정책을 공유 베이스 모델 위에서 학습·서빙하는 관리형 인프라. Adapter revision을 학습-서빙 경계의 단위로 삼아 핸드오프를 18.3× 줄이고, 1T급 MoE까지 검증한다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0016-mint-managed-infrastructure-for-training-and-serving-million/";
          
        },
      },{id: "post-paper-review-goldfish-monolingual-language-models-for-350-languages",
        
          title: "[Paper Review] Goldfish: Monolingual Language Models for 350 Languages",
        
        description: "1,154 small monolingual GPT-2 models covering 350 low-resource languages. With 5MB-1GB of byte-premium-scaled text and 39M-125M parameters, they consistently beat XGLM 4.5B, BLOOM 7.1B, and MaLA-500 10B on FLORES perplexity.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0015-goldfish/";
          
        },
      },{id: "post-논문-리뷰-goldfish-monolingual-language-models-for-350-languages",
        
          title: "[논문 리뷰] Goldfish: Monolingual Language Models for 350 Languages",
        
        description: "350개 저자원 언어를 위한 1,154개의 작은 단일언어 GPT-2 모델 모음. 1GB 이하 코퍼스에서 5MB~1GB 데이터로 학습한 39M~125M 모델이 XGLM 4.5B·BLOOM 7.1B·MaLA-500 10B 같은 거대 다국어 모델보다 일관되게 낮은 perplexity를 보인다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0015-goldfish/";
          
        },
      },{id: "post-paper-review-algorithmically-establishing-trust-in-evaluators",
        
          title: "[Paper Review] Algorithmically Establishing Trust in Evaluators",
        
        description: "A zero-knowledge-style challenge–response protocol that certifies the trustworthiness of an evaluator (e.g. LLM-as-a-judge) without any labelled data, bounded by (1/4)^r.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0014-algorithmically-establishing-trust-in-evaluators/";
          
        },
      },{id: "post-논문-리뷰-algorithmically-establishing-trust-in-evaluators",
        
          title: "[논문 리뷰] Algorithmically Establishing Trust in Evaluators",
        
        description: "라벨 없는 환경에서 LLM-as-a-judge 같은 평가자(evaluator)의 신뢰를 zero-knowledge 스타일의 챌린지-응답 프로토콜로 (1/4)^r 확률 한계까지 증명적으로 확립하는 No-Data Algorithm.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0014-algorithmically-establishing-trust-in-evaluators/";
          
        },
      },{id: "post-paper-review-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios",
        
          title: "[Paper Review] RTP-LX: Can LLMs Evaluate Toxicity in Multilingual Scenarios?",
        
        description: "AAAI-25 paper introducing RTP-LX: a human-transcreated, human-annotated corpus of 1,100 toxic prompts across 28 languages, used to stress-test 10 S/LLMs as multilingual safety evaluators.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/";
          
        },
      },{id: "post-논문-리뷰-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios",
        
          title: "[논문 리뷰] RTP-LX: Can LLMs Evaluate Toxicity in Multilingual Scenarios?",
        
        description: "28개 언어로 사람 손으로 transcreate·annotate 한 1,100개 유해 프롬프트 코퍼스로, 10개 S/LLM이 다국어·문화-맥락 유해성을 판별할 수 있는지 묻는 AAAI-25 논문.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0013-rtp-lx-can-llms-evaluate-toxicity-in-multilingual-scenarios/";
          
        },
      },{id: "post-paper-review-improving-large-scale-recommender-systems-with-auxiliary-learning",
        
          title: "[Paper Review] Improving Large-Scale Recommender Systems with Auxiliary Learning",
        
        description: "Analysis of C2AL, Meta&#39;s framework that combats majority-cohort bias in large-scale ads recommendation models via cohort-contrastive auxiliary learning.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/";
          
        },
      },{id: "post-논문-리뷰-improving-large-scale-recommender-systems-with-auxiliary-learning",
        
          title: "[논문 리뷰] Improving Large-Scale Recommender Systems with Auxiliary Learning",
        
        description: "Meta 의 광고 추천 모델에서 majority cohort 편향을 보조 학습으로 풀어내는 C2AL 프레임워크 분석",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0012-improving-large-scale-recommender-systems-with-auxiliary-lea/";
          
        },
      },{id: "post-paper-review-agenticrectune-multi-agent-with-self-evolving-skillhub-for-recommendation-system-optimization",
        
          title: "[Paper Review] AgenticRecTune: Multi-Agent with Self-Evolving Skillhub for Recommendation System Optimization",
        
        description: "An LLM multi-agent framework that automates the tuning of system-level configuration (fusion weights, demotion weights, diversity thresholds) across all three stages — pre-ranking, ranking, re-ranking — of Google Discover. Five specialized agents (Actor, Critic, Insight, Skill, Online) form a closed loop that feeds live A/B results back into memory and a self-evolving skillhub, simultaneously lifting engagement and diversity in production.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/";
          
        },
      },{id: "post-논문-리뷰-agenticrectune-multi-agent-with-self-evolving-skillhub-for-recommendation-system-optimization",
        
          title: "[논문 리뷰] AgenticRecTune: Multi-Agent with Self-Evolving Skillhub for Recommendation System Optimization",
        
        description: "Google Discover 의 pre-ranking · ranking · re-ranking 세 단계 시스템 구성 (fusion weight, demotion weight, diversity threshold 등) 을 사람이 더 이상 튜닝하지 않도록, Actor · Critic · Insight · Skill · Online 다섯 에이전트가 라이브 A/B 결과를 메모리·스킬허브로 되먹임하며 자기진화하는 LLM 에이전트 프레임워크. Engagement 와 Diversity 를 동시에 끌어올린 산업 적용 사례.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0011-agenticrectune-multi-agent-self-evolving-skillhub/";
          
        },
      },{id: "post-paper-review-graph-based-audience-expansion-model-for-marketing-campaigns",
        
          title: "[Paper Review] Graph-Based Audience Expansion Model for Marketing Campaigns",
        
        description: "A two-stage lookalike model from Rakuten — TransE-style pretraining on a 70+ service cross-service knowledge graph, then a GCN that aggregates &#39;knowledge queries&#39; (head + relation embeddings) rather than neighbor entities. SIGIR 2024 short paper.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/";
          
        },
      },{id: "post-논문-리뷰-graph-based-audience-expansion-model-for-marketing-campaigns",
        
          title: "[논문 리뷰] Graph-Based Audience Expansion Model for Marketing Campaigns",
        
        description: "Rakuten 의 70여 개 서비스에 걸친 cross-service knowledge graph 에 TransE 사전학습과 GCN 을 잇고, neighbor entity 가 아닌 &#39;knowledge query&#39; (head + relation 임베딩 합) 를 메시지로 전달해 oversmoothing 을 우회한 광고용 lookalike 모델. SIGIR 2024 short paper.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0010-graph-based-audience-expansion-model-for-marketing-campaigns/";
          
        },
      },{id: "post-paper-review-personalized-marketing-leveraging-ai-for-culturally-aware-segmentation-and-targeting",
        
          title: "[Paper Review] Personalized marketing: Leveraging AI for culturally aware segmentation and targeting",
        
        description: "A short application paper that bolts LIME onto K-means over Kaggle&#39;s 200-row Mall Customer dataset. The biggest discussion point is the gap between the &#39;culturally aware&#39; framing in the title and what the experiment actually does.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/";
          
        },
      },{id: "post-논문-리뷰-personalized-marketing-leveraging-ai-for-culturally-aware-segmentation-and-targeting",
        
          title: "[논문 리뷰] Personalized marketing: Leveraging AI for culturally aware segmentation and targeting",
        
        description: "Mall Customer 데이터셋 200명에 K-means clustering + LIME 을 결합해 4개 세그먼트를 만든 뒤 LIME 으로 각 클러스터의 결정 요인을 해석하는 짧은 응용 논문. &#39;문화적으로 인지한다 (culturally aware)&#39; 라는 제목과 실제 실험의 간극이 가장 큰 논점이다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0009-personalized-marketing-leveraging-ai-for-culturally-aware-se/";
          
        },
      },{id: "post-paper-review-persistent-visual-memory-sustaining-perception-for-deep-generation-in-lvlms",
        
          title: "[Paper Review] Persistent Visual Memory: Sustaining Perception for Deep Generation in LVLMs",
        
        description: "An autoregressive LVLM&#39;s visual attention collapses as O(t⁻¹) under growing textual history. PVM adds a parallel retrieval branch alongside each FFN to restore visual perception during deep generation.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0008-persistent-visual-memory/";
          
        },
      },{id: "post-논문-리뷰-persistent-visual-memory-sustaining-perception-for-deep-generation-in-lvlms",
        
          title: "[논문 리뷰] Persistent Visual Memory: Sustaining Perception for Deep Generation in LVLMs",
        
        description: "긴 응답을 생성할수록 LVLM의 시각 attention이 O(t⁻¹)로 붕괴한다는 사실을 이론·경험적으로 보이고, FFN과 평행한 retrieval 분기를 추가해 시각 신호를 복구하는 PVM 모듈",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0008-persistent-visual-memory/";
          
        },
      },{id: "post-paper-review-unlocking-the-power-of-ai-in-crm-a-comprehensive-multidimensional-exploration",
        
          title: "[Paper Review] Unlocking the power of AI in CRM: A comprehensive multidimensional exploration...",
        
        description: "A qualitative study that distills 1,055 papers down to 64, plus 24 in-depth interviews with CRM practitioners, to organize AI-powered CRM capabilities into three dimensions and eight sub-dimensions through a microfoundations-of-dynamic-capabilities lens.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0007-unlocking-power-of-ai-in-crm/";
          
        },
      },{id: "post-논문-리뷰-unlocking-the-power-of-ai-in-crm-a-comprehensive-multidimensional-exploration",
        
          title: "[논문 리뷰] Unlocking the power of AI in CRM: A comprehensive multidimensional exploration...",
        
        description: "1,055건의 논문에서 64건을 추리고 24명의 CRM 실무자를 인터뷰해, AI 기반 CRM 역량을 3개 차원·8개 하위차원으로 정리한 정성 연구. Dynamic Capabilities 의 microfoundations 관점으로 봤다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0007-unlocking-power-of-ai-in-crm/";
          
        },
      },{id: "post-paper-review-the-relevance-of-lead-prioritization-a-b2b-lead-scoring-model-based-on-machine-learning",
        
          title: "[Paper Review] The relevance of lead prioritization: a B2B lead scoring model based...",
        
        description: "A B2B software SME&#39;s four-year CRM dataset benchmarked across 15 classifiers via PyCaret — Gradient Boosting wins (98.39% accuracy, AUC 0.9891). Lead Source / Reason for State / Lead Classification dominate feature importance.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0006-b2b-lead-scoring-with-machine-learning/";
          
        },
      },{id: "post-논문-리뷰-the-relevance-of-lead-prioritization-a-b2b-lead-scoring-model-based-on-machine-learning",
        
          title: "[논문 리뷰] The relevance of lead prioritization: a B2B lead scoring model based...",
        
        description: "B2B 소프트웨어 SME의 4년치 CRM 데이터로 15개 분류기를 PyCaret으로 비교 — Gradient Boosting Classifier가 정확도 98.39%, AUC 0.9891로 1위. Lead Source / Reason for State / Lead Classification이 상위 변수.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0006-b2b-lead-scoring-with-machine-learning/";
          
        },
      },{id: "post-paper-review-artificial-intelligence-in-customer-relationship-management-a-systematic-framework-for-a-successful-integration",
        
          title: "[Paper Review] Artificial intelligence in customer relationship management: A systematic framework for a...",
        
        description: "An interview-based 4-macro-phase, 13-step framework for integrating AI into CRM — with ethics by design and customer data centralization wired in from day one.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0005-artificial-intelligence-in-customer-relationship-management/";
          
        },
      },{id: "post-논문-리뷰-artificial-intelligence-in-customer-relationship-management-a-systematic-framework-for-a-successful-integration",
        
          title: "[논문 리뷰] Artificial intelligence in customer relationship management: A systematic framework for a...",
        
        description: "25명을 인터뷰해 도출한 AI-CRM 통합 4 macro-phase·13 step 프레임워크 — ethics by design과 customer data centralization을 처음부터 박아 넣어야 한다는 정성적 연구.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0005-artificial-intelligence-in-customer-relationship-management/";
          
        },
      },{id: "post-paper-review-turboquant-online-vector-quantization-with-near-optimal-distortion-rate",
        
          title: "[Paper Review] TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate",
        
        description: "A training-free vector quantizer that gets within ~2.7× of the information-theoretic distortion-rate bound — using just one random rotation.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/";
          
        },
      },{id: "post-논문-리뷰-turboquant-online-vector-quantization-with-near-optimal-distortion-rate",
        
          title: "[논문 리뷰] TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate",
        
        description: "랜덤 회전 한 번으로 데이터 의존 학습 없이 정보이론 하한과 약 2.7배 이내까지 도달하는 온라인 벡터 양자화",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0004-turboquant-online-vector-quantization-with-near-optimal-dist/";
          
        },
      },{id: "post-paper-review-llada2-0-uni-unifying-multimodal-understanding-and-generation-with-diffusion-large-language-model",
        
          title: "[Paper Review] LLaDA2.0-Uni: Unifying Multimodal Understanding and Generation with Diffusion Large Language Model...",
        
        description: "A single diffusion LLM that handles image understanding, generation, editing, and interleaved reasoning. Built around a SigLIP-VQ semantic tokenizer, a 16B MoE backbone, and an 8-step distilled diffusion decoder.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/";
          
        },
      },{id: "post-논문-리뷰-llada2-0-uni-unifying-multimodal-understanding-and-generation-with-diffusion-large-language-model",
        
          title: "[논문 리뷰] LLaDA2.0-Uni: Unifying Multimodal Understanding and Generation with Diffusion Large Language Model...",
        
        description: "디퓨전 LLM 한 모델로 이미지 이해, 생성, 편집, 인터리브드 추론을 모두 처리한다. SigLIP-VQ 의미 토크나이저, 16B MoE 백본, distillation 으로 8 step 까지 줄인 디퓨전 디코더의 조합.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0003-llada2-0-uni-unified-multimodal-diffusion-llm/";
          
        },
      },{id: "post-paper-review-tradingagents-multi-agents-llm-financial-trading-framework",
        
          title: "[Paper Review] TradingAgents: Multi-Agents LLM Financial Trading Framework",
        
        description: "An LLM trading framework that mirrors a real trading firm&#39;s org chart — analysts, bullish/bearish researchers, a trader, a risk team, and a fund manager — coordinated through structured reports for cross-team handoff and natural-language debate inside teams.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/";
          
        },
      },{id: "post-논문-리뷰-tradingagents-multi-agents-llm-financial-trading-framework",
        
          title: "[논문 리뷰] TradingAgents: Multi-Agents LLM Financial Trading Framework",
        
        description: "트레이딩 펌의 조직 구조를 그대로 옮긴 멀티 에이전트 LLM 트레이딩 프레임워크 — 분석가, 강세/약세 리서처, 트레이더, 리스크 관리, 펀드 매니저까지 일곱 역할이 구조화 보고서와 자연어 토론으로 협업한다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/";
          
        },
      },{id: "post-paper-review-how-to-train-your-long-context-visual-document-model",
        
          title: "[Paper Review] How to Train Your Long-Context Visual Document Model",
        
        description: "How to train a 344K-context visual document VLM — the first large-scale, open recipe spanning CPT, SFT, LongPO and self-improvement.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0001-how-to-train-your-long-context-visual-document-model/";
          
        },
      },{id: "post-논문-리뷰-how-to-train-your-long-context-visual-document-model",
        
          title: "[논문 리뷰] How to Train Your Long-Context Visual Document Model",
        
        description: "344K 컨텍스트의 시각 문서 VLM 을 어떻게 훈련하는가 — CPT/SFT/LongPO 와 self-improvement 까지의 첫 대규모 공개 레시피.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0001-how-to-train-your-long-context-visual-document-model/";
          
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/baba9811", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/kyubumhwang-5a04b2212", "_blank");
        },
      },{
        id: 'social-orcid',
        title: 'ORCID',
        section: 'Socials',
        handler: () => {
          window.open("https://orcid.org/0009-0009-5803-0214", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=fzAb1AIAAAAJ", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];

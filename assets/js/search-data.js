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

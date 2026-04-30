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
      },{id: "post-paper-review-how-to-train-your-long-context-visual-document-model",
        
          title: "[Paper Review] How to Train Your Long-Context Visual Document Model",
        
        description: "How to train a 344K-context visual document VLM — the first large-scale, open recipe spanning CPT, SFT, LongPO and self-improvement.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/en/papers/0001-how-to-train-your-long-context-visual-document-model/";
          
        },
      },{id: "post-논문-리뷰-tradingagents-multi-agents-llm-financial-trading-framework",
        
          title: "[논문 리뷰] TradingAgents: Multi-Agents LLM Financial Trading Framework",
        
        description: "트레이딩 펌의 조직 구조를 그대로 옮긴 멀티 에이전트 LLM 트레이딩 프레임워크 — 분석가, 강세/약세 리서처, 트레이더, 리스크 관리, 펀드 매니저까지 일곱 역할이 구조화 보고서와 자연어 토론으로 협업한다.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/papers/0002-tradingagents-multi-agents-llm-financial-trading-framework/";
          
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

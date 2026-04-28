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

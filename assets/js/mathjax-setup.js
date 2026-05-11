window.MathJax = {
  tex: {
    tags: "ams",
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
  },
  options: {
    renderActions: {
      addCss: [
        200,
        function (doc) {
          const style = document.createElement("style");
          style.innerHTML = `
          .mjx-container {
            color: inherit;
          }
        `;
          document.head.appendChild(style);
        },
        "",
      ],
    },
  },
  startup: {
    pageReady: function () {
      // Kramdown with `math_engine: mathjax` wraps math in
      // <script type="math/tex"> tags whose content is preserved verbatim
      // (no markdown emphasis processing inside — fixes the underscore
      // cross-pairing bug). MathJax 3 does not process these tags natively,
      // so convert them into MathJax-recognizable delimiters before typeset.
      document
        .querySelectorAll('script[type="math/tex"]')
        .forEach(function (s) {
          const span = document.createElement("span");
          span.textContent = "\\(" + s.textContent + "\\)";
          s.parentNode.replaceChild(span, s);
        });
      document
        .querySelectorAll('script[type="math/tex; mode=display"]')
        .forEach(function (s) {
          const div = document.createElement("div");
          div.textContent = "\\[" + s.textContent + "\\]";
          s.parentNode.replaceChild(div, s);
        });
      return window.MathJax.startup.defaultPageReady();
    },
  },
};

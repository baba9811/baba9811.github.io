// This deferred script runs after the navigation markup is available.
if (navigator.platform.toUpperCase().includes("MAC")) {
  const shortcutKeyElement = document.querySelector("#search-toggle .nav-link");
  if (shortcutKeyElement) {
    shortcutKeyElement.innerHTML = '&#x2318; k <i class="fa-solid fa-magnifying-glass"></i>';
  }
}

(function () {
  var KEY = "aiEcoMapTheme";
  var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
  var theme = saved === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  function label(b) { var t = document.documentElement.getAttribute("data-theme");
    b.textContent = t === "dark" ? "☀ Light" : "☾ Dark";
    b.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode"); }
  document.addEventListener("DOMContentLoaded", function () {
    var host = document.querySelector(".top-actions") || document.body;
    var b = document.createElement("button");
    b.type = "button"; b.id = "btnTheme"; b.className = "btn ghost theme-toggle"; label(b);
    b.addEventListener("click", function () {
      var t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", t);
      try { localStorage.setItem(KEY, t); } catch (e) {}
      label(b);
    });
    host.insertBefore(b, host.firstChild);
  });
})();

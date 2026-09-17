/* Adds a "Download PDF" button to the admin detail panel: the exact report the visitor gets. */
(function () {
  const origOpen = window.openPanel;
  if (typeof origOpen !== "function") return;
  window.openPanel = function (id) {
    origOpen(id);
    const x = rows.find((r) => r.id === id);
    const head = document.querySelector("#panel .x");
    if (!x || !head || head.querySelector("#panelPdf")) return;
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.id = "panelPdf";
    btn.style.cssText = "padding:.5rem .9rem;margin-left:auto;margin-right:1rem";
    btn.textContent = "Download PDF";
    btn.title = "The same report this person can download";
    btn.onclick = () => downloadReportFor(x, btn);
    head.insertBefore(btn, head.querySelector("#close"));
  };
})();

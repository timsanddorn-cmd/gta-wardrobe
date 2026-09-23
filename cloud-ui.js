try {
  if (!("DecompressionStream" in window)) throw new Error("DecompressionStream wird von diesem Browser nicht unterstützt.");
  const response = await fetch("./cloud-ui.payload.gz", {cache:"no-store"});
  if (!response.ok) throw new Error("Cloud-Modul konnte nicht geladen werden.");
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  const code = await new Response(stream).text();
  const url = URL.createObjectURL(new Blob([code], {type:"text/javascript"}));
  try { await import(url); } finally { URL.revokeObjectURL(url); }
} catch (error) {
  console.error("Wardrobe Cloud konnte nicht gestartet werden", error);
  const frame = document.getElementById("wardrobeFrame");
  frame?.addEventListener("load", () => {
    const d = frame.contentDocument;
    if (!d) return;
    const box = d.createElement("div");
    box.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;padding:12px 14px;background:#351b20;border:1px solid #5c2a33;color:#ffd9df;font:12px Arial";
    box.textContent = "Die Cloud-Erweiterung konnte in diesem Browser nicht geladen werden. Der bisherige Wardrobe-Bereich bleibt nutzbar.";
    d.body.appendChild(box);
  }, {once:true});
}
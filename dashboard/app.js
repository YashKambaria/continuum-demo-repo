const modulesElement = document.querySelector("#modules");
const detailsElement = document.querySelector("#details");

function componentRows(module) {
  return Object.entries(module.components).map(([name, score]) => `<li><span>${name.replace(/([A-Z])/g, " $1")}</span><b>${score} pts</b></li>`).join("");
}

function showDetails(module) {
  detailsElement.hidden = false;
  detailsElement.innerHTML = `<div><p class="eyebrow">MODULE EVIDENCE</p><h2>${module.file}</h2><p><b>${module.primaryOwner.name}</b> owns ${(module.ownershipShare * 100).toFixed(1)}% of ${module.totalCommits} commits. This file has ${module.branchPoints} decision points and ${Math.round(module.documentationCoverage * 100)}% documentation coverage.</p></div><div><h3>Score breakdown</h3><ul>${componentRows(module)}</ul></div>`;
}

async function load() {
  const report = await fetch("/data/analysis.json", { cache: "no-store" }).then((response) => response.json());
  const modules = [...report.modules].sort((a, b) => b.score - a.score);
  document.querySelector("#subtitle").textContent = `${report.repository} · updated ${new Date(report.generatedAt).toLocaleTimeString()}`;
  document.querySelector("#module-count").textContent = modules.length;
  document.querySelector("#critical-count").textContent = modules.filter((module) => module.status === "critical").length;
  document.querySelector("#highest-risk").textContent = `${modules[0].score}/100`;
  modulesElement.innerHTML = modules.map((module) => `<button class="module ${module.status}" data-file="${module.file}"><span>${module.file}</span><strong>${module.score}</strong><small>${module.primaryOwner.name} · ${(module.ownershipShare * 100).toFixed(0)}% ownership</small></button>`).join("");
  modulesElement.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => showDetails(modules.find((module) => module.file === button.dataset.file))));
  showDetails(modules[0]);
}

document.querySelector("#refresh").addEventListener("click", load);
load().catch((error) => { modulesElement.innerHTML = `<p>Could not load analysis: ${error.message}</p>`; });

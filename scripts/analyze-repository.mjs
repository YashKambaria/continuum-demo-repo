import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetFiles = ["src/payments/retry.ts", "src/utils/format.ts"];

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function getOwnership(file) {
  const commits = git(["log", "--format=%an|%ae", "--", file])
    .split("\n")
    .filter(Boolean);
  const contributors = new Map();
  for (const commit of commits) {
    contributors.set(commit, (contributors.get(commit) ?? 0) + 1);
  }
  const [primaryOwner, primaryOwnerCommits] = [...contributors.entries()]
    .sort((a, b) => b[1] - a[1])[0] ?? ["Unassigned|", 0];
  const [name, email] = primaryOwner.split("|");
  return {
    primaryOwner: { name, email },
    primaryOwnerCommits,
    totalCommits: commits.length,
    ownershipShare: commits.length ? primaryOwnerCommits / commits.length : 0,
    contributors: [...contributors.entries()].map(([person, commits]) => {
      const [contributorName, contributorEmail] = person.split("|");
      return { name: contributorName, email: contributorEmail, commits };
    }),
  };
}

function getMetrics(file) {
  const source = readFileSync(resolve(root, file), "utf8");
  const lines = source.split("\n");
  const executableLines = lines.filter((line) => line.trim() && !line.trim().startsWith("//")).length;
  const documentationLines = lines.filter((line) => /\/\/|\/\*|\*\//.test(line)).length;
  const branchPoints = (source.match(/\bif\b|\belse\b|\bcase\b|\?|&&|\|\|/g) ?? []).length;
  const hasDocBlock = /\/\*\*/.test(source);
  return {
    lines: lines.length,
    executableLines,
    documentationLines,
    branchPoints,
    documentationCoverage: hasDocBlock ? 1 : Math.min(1, documentationLines / Math.max(executableLines, 1)),
  };
}

function score(ownership, metrics) {
  const ownershipRisk = ownership.ownershipShare >= 0.7 ? ownership.ownershipShare : 0;
  const complexityRisk = Math.min(1, metrics.branchPoints / 8);
  const documentationGap = 1 - metrics.documentationCoverage;
  const recentChangeRisk = ownership.totalCommits > 0 ? 1 : 0;
  const components = {
    ownership: Math.round(ownershipRisk * 40),
    complexity: Math.round(complexityRisk * 30),
    documentationGap: Math.round(documentationGap * 20),
    recentChange: Math.round(recentChangeRisk * 10),
  };
  return { components, score: Object.values(components).reduce((total, value) => total + value, 0) };
}

const modules = targetFiles.map((file) => {
  const ownership = getOwnership(file);
  const metrics = getMetrics(file);
  const risk = score(ownership, metrics);
  return {
    file,
    moduleName: file.split("/").at(-1),
    ...ownership,
    ...metrics,
    ...risk,
    status: risk.score >= 70 ? "critical" : risk.score >= 40 ? "watch" : "healthy",
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  repository: relative(resolve(root, ".."), root),
  formula: "risk = ownership concentration (40) + complexity (30) + documentation gap (20) + recent change (10)",
  modules,
};

mkdirSync(resolve(root, "data"), { recursive: true });
writeFileSync(resolve(root, "data/analysis.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Analyzed ${modules.length} modules. Highest risk: ${modules[0].file} (${modules[0].score}/100).`);

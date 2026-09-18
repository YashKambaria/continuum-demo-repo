# Continuum

> AI-driven knowledge-silo detection and risk mitigation for engineering teams.

Continuum identifies code that is dangerously dependent on one person, asks that person a precise question about the missing knowledge, converts their answer into code-adjacent documentation, and proves that the documentation reduces knowledge risk.

This repository is both the demo application data source and a deliberately seeded example of the problem. Its payment retry module is complex, poorly documented, and historically maintained mostly by one contributor.

## The problem

Critical software knowledge often exists only in the memory of the engineer who wrote or maintained a module. Conventional truck-factor tools can flag ownership concentration, but they do not account for complexity or missing documentation, and they do not help a team close the gap.

Continuum closes that loop:

1. Detect a risky module from Git history and code structure.
2. Identify the contributor most likely to hold the missing knowledge.
3. Ask a targeted technical question about the real code.
4. Turn the answer into structured documentation attached to the code.
5. Recalculate and visibly reduce the documentation-related portion of the risk score.

## Demo scenario

`src/payments/retry.ts` intentionally represents the knowledge-silo scenario:

- Payment retry logic has multiple conditional branches and provider-specific behavior.
- The business reason for key decisions is not documented in the module.
- Most historical changes were authored by **Alice Shah**.
- A small contribution from **Bob Chen** makes the repository resemble a real collaborative project without removing the ownership concentration.

`src/utils/format.ts` is the comparison case: it is small, documented, and intended to stay low risk.

## What works today

The first working Continuum slice runs locally and uses the repository's actual Git history.

### Repository analyzer

[`scripts/analyze-repository.mjs`](scripts/analyze-repository.mjs) analyzes the demo modules and writes [`data/analysis.json`](data/analysis.json).

For each file, it calculates:

- primary contributor and ownership share from `git log`
- number of contributors and commits
- decision points as a lightweight complexity estimate
- comment/doc-block coverage
- a deterministic, explainable risk score

### Deterministic risk score

```text
risk score = ownership concentration + complexity + documentation gap + recent change

ownership concentration = up to 40 points
complexity              = up to 30 points
documentation gap       = up to 20 points
recent change           = up to 10 points
```

AI helps explain the risk and capture missing knowledge, but it does not invent the score. This makes the before/after demo credible.

| Module | Expected score | Status | Why |
| --- | ---: | --- | --- |
| `src/payments/retry.ts` | 94/100 | Critical | Concentrated ownership, high branching complexity, no meaningful documentation |
| `src/utils/format.ts` | 10/100 | Healthy | Documented, low-complexity shared utility |

### Local dashboard

[`dashboard/`](dashboard/) provides a lightweight risk dashboard with a risk heatmap, module cards, primary-owner evidence, and score-component breakdown.

Run it locally:

```bash
npm run analyze
npm run dashboard
```

Then open [http://localhost:4173](http://localhost:4173).

## Intended product flow

```text
GitHub repository
    -> Repository Analyzer
    -> Risk Agent
    -> Risk dashboard flags at-risk module
    -> Interview Agent generates a code-specific question
    -> Knowledge holder submits an answer
    -> Synthesis Agent produces documentation
    -> Documentation is attached to the code through a GitHub pull request
    -> Risk is recalculated and dashboard shows the reduction
```

## Four-agent pipeline

### 1. Risk Agent

Input: deterministic Git and code metrics, source excerpts, and module path.

Output: an explanation of the score, the main knowledge gap, and the module/function needing attention. It must ground every claim in supplied evidence and cannot replace the deterministic scoring formula.

### 2. Interview Agent

Input: risk explanation, relevant retry-code excerpt, ownership context, and identified knowledge gap.

Output: one concise, specific technical question. Example:

> Why are `429` responses and provider `5xx` responses retried differently, and what could break if the three-attempt limit changes?

### 3. Synthesis Agent

Input: the question, the contributor's answer, and relevant code context.

Output: structured Markdown containing module purpose, business rules, retry invariants, edge cases, operational notes, and a source-code anchor. Confirmed facts must be separated from unanswered assumptions.

### 4. Dashboard

Shows the risk heatmap, score evidence, interview status, generated documentation, and score history. After an answer is synthesized, only the documentation-gap component decreases; ownership concentration and code complexity remain visible.

## Target AWS architecture

```text
GitHub push webhook or manual scan
    -> Amazon API Gateway
    -> AWS Lambda repository analyzer
    -> AWS Step Functions workflow
    -> Amazon Bedrock Risk Agent
    -> Amazon DynamoDB risk-history record
    -> Amazon Bedrock Interview Agent
    -> Amplify-hosted interview UI
    -> Amazon Bedrock Synthesis Agent
    -> Amazon S3 generated Markdown artifact
    -> GitHub documentation pull request
    -> DynamoDB score update
    -> Amplify dashboard shows risk reduction
```

| AWS service | Purpose |
| --- | --- |
| AWS Amplify | Host the React dashboard and interview experience |
| Amazon Cognito | Authenticate team members and scope repository data |
| Amazon API Gateway | Expose scan, interview, and answer-submission endpoints |
| AWS Lambda | Clone/analyze repository data and invoke application logic |
| AWS Step Functions | Orchestrate scan -> risk -> question -> answer -> synthesis -> rescore |
| Amazon Bedrock | Power the Risk, Interview, and Synthesis Agent model calls |
| Amazon DynamoDB | Store current module risk, history, interviews, and documentation metadata |
| Amazon S3 | Store versioned generated documentation and analysis artifacts |
| Amazon EventBridge | Decouple scan, interview, documentation, and rescore events |
| Amazon AppSync (stretch) | Push live risk and interview updates to the dashboard |
| Amazon CloudWatch | Monitor workflow, inference failures, and demo health |

## Data model

The deployed version will retain a risk record similar to:

```json
{
  "repoId": "YashKambaria/continuum-demo-repo",
  "modulePath": "src/payments/retry.ts",
  "primaryOwner": "Alice Shah",
  "ownershipShare": 0.86,
  "complexity": 21,
  "documentationCoverage": 0,
  "riskScore": 94,
  "status": "critical"
}
```

Documentation artifacts will be versioned in S3 and linked to their module, interview, Git revision, and eventual GitHub pull request.

## Security principles

- The browser never receives GitHub credentials or AWS secrets.
- GitHub credentials and webhook secrets are stored in AWS Secrets Manager.
- IAM roles follow least privilege: analyzer, AI workflow, and publisher have separate permissions.
- DynamoDB and S3 data are encrypted with AWS KMS.
- Cognito and server-side tenancy checks limit each team to its repositories.
- Bedrock prompts receive bounded, relevant code excerpts rather than an entire repository by default.

## Future plan

### Phase 1 - complete the live demo

- [x] Seed a GitHub demo repository with a realistic knowledge-silo module.
- [x] Build the Git-history and code-metrics analyzer.
- [x] Build the deterministic risk formula and local dashboard.
- [ ] Configure AWS and validate Amazon Bedrock inference access.
- [ ] Deploy the dashboard with Amplify.
- [ ] Deploy Lambda, API Gateway, DynamoDB, S3, and Step Functions with AWS CDK.
- [ ] Implement the Bedrock-backed Interview Agent.
- [ ] Add answer submission, Synthesis Agent, generated documentation, and score recalculation.
- [ ] Create a documentation pull request in this repository.

### Phase 2 - production-oriented improvements

- GitHub push webhooks to trigger re-analysis after merged pull requests.
- AppSync subscriptions for real-time interview and dashboard updates.
- GitHub App integration instead of a personal access token.
- Guardrails for sensitive-information masking and prompt-injection protection.
- Support for private repositories and scalable CodeBuild-based analysis.
- Team heatmaps, risk trends, and onboarding paths for high-risk modules.
- Slack or Microsoft Teams interview delivery.
- “What if this owner is unavailable?” impact simulations.

## Project structure

```text
continuum-demo-repo/
├── dashboard/                   # Local risk dashboard
├── data/analysis.json           # Generated analyzer output
├── scripts/analyze-repository.mjs
├── scripts/serve-dashboard.mjs
└── src/
    ├── payments/retry.ts        # Intentionally risky demo module
    └── utils/format.ts          # Healthy comparison module
```

## Hackathon demo narrative

1. Analyze the repository and show `retry.ts` at **94/100 Critical**.
2. Explain the evidence: concentrated ownership, complex branching, and missing documentation.
3. Let the Interview Agent ask a question about the real retry behavior.
4. Submit the knowledge holder’s answer live.
5. Show the Synthesis Agent generate documentation and create a GitHub-ready patch or pull request.
6. Recalculate the documentation component and visibly reduce the score, for example **94 -> 54**.

Continuum does not merely identify a knowledge silo: it actively helps the team reduce it.

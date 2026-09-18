---
title: This Site's Semantic Layer & Agent
order: 5
color: blue
tag: Personal project · 2026
metric: 1 definition
metric-label: Per headline number, referenced everywhere it appears
draft: true
---
<!--
  Draft until the Cloudflare Worker in worker/ is deployed and PORTFOLIO_CONFIG.agentEndpoint
  in index.html points at it. Then delete the `draft: true` line above. The full case study
  lives in content/details/portfolio-agent.md and publishes at the same time.
-->
## Problem

A portfolio is a small body of work with the same failure modes as a company's reporting: the same number quoted two different ways in two places, skills asserted without evidence, and a reader who has a specific question and no way to ask it. At [Mindvalley](#/ai-data-intelligence) I built a self-serve analytical layer with generated insights and a conversational agent. This site is a public, miniature instance of that approach, built on the same principles.

## Solution

A **static semantic layer** (`content/semantic.json`) defines every headline metric once, maps each case study to the skills it used, and defines the themes the map can be read through. The site renders it as chips, "Applied in" lists, and a lens control, and the build fails on drift: an unused metric, a metric referenced but undefined, a study with no skills.

On top of that sits a **grounded conversational agent**. A Cloudflare Worker sends the whole corpus, every node and full case study, to Claude as a cached system prompt, so there is no vector database and no retrieval step to go wrong. The agent answers only from the portfolio, cites nodes as links, and says "not covered here" otherwise. Cost is capped per reader, per day, and at the account, and every question (never the reader) is logged so the content can improve.

## Impact

- One definition per headline number, referenced from every place it appears
- Every skill node links to the work it was applied in, and every study links back
- A reader can ask a specific question and get a grounded, cited answer for a fraction of a cent

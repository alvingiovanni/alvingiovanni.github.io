---
title: AI Data Intelligence
tag: Mindvalley · 2024–2026
order: 3
metric: {{metric:ai_time_to_insight}}
metric-label: {{metric:ai_time_to_insight.label}}
summary: A self-serve analytical layer with generated insights and a conversational agent, built so that recurring leadership questions no longer needed an analyst in the loop.
---
<!-- Draft written from the short case study, the résumé, and the skill notes. The
     "My role", "Decision made", and "What I'd do differently" sections are in Alvin's
     voice and should be checked by Alvin before this page is shared widely. -->

## Context

Business teams needed a faster way to explore performance data and answer their recurring questions. Getting to an insight could take between one and two days, and many leadership questions could not be answered without an analyst pulling and interpreting the data.

The bottleneck was not the data. The [Marketing Data Foundation](/#/marketing-data-foundation) had already made the core metrics consistent and trustworthy. The bottleneck was that reading them still required someone who knew where to look and what the numbers meant.

## My role

I developed the internal application: a custom data visualisation platform with automatically generated insights on its dashboards and a conversational agent for business questions. I worked with Data Engineering and BI on the governed data the platform sat on, and with the business teams whose questions it had to answer.

## Approach

The platform has two layers. The first is a set of dashboards with **automatically generated insights**: for each view, the system writes a short interpretation of what changed and what stands out, so a reader does not have to wait for a separate manual analysis to know what they are looking at.

The second is a **conversational agent** that answers business questions in plain language. It is grounded in the governed data model rather than free to guess, so an answer is only as inventive as the metric definitions allow it to be. The aim was a tool leadership could trust for recurring questions, not a novelty.

```chart
type: column
title: Time to insight
y-label: Hours, upper bound
unit:
Before: 48
After: 1
note: Before is the upper end of the 1–2 day range that a typical question took; After is the ceiling once the platform was in use.
```

## Decision made

Recurring leadership questions moved into the platform. Analysts were no longer the path to a routine answer, which changed what they spent their time on: the questions that still needed a person were the ones that deserved one.

## Impact

- Time to insight: {{metric:ai_time_to_insight.bare}}, down from between 1 and 2 days
- Roughly {{metric:ai_self_serve_share.bare}} of leadership's recurring questions became answerable without analyst support

```chart
type: bar
title: Recurring leadership questions after launch
unit: %
Answered self-serve: 80%
Still routed to an analyst: 20%
note: Approximate split; the remaining questions are the ones that genuinely need judgment.
```

## What I'd do differently

I would log the questions people ask the agent from the first day and treat that log as the product's roadmap. The questions that get asked most, and the ones it cannot answer, are the most honest signal of which metrics need better definitions and which dashboards are missing. This portfolio's own [Ask about this work](/#/portfolio-agent) feature follows that pattern.

I would also make "not covered" a first-class answer earlier. A conversational tool earns trust faster by saying clearly what it does not know than by producing a fluent answer to a question the data cannot support.

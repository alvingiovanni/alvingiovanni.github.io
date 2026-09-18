---
title: LTV Forecasting & CAC Guardrails
tag: Mindvalley · 2026
order: 4
metric: {{metric:ltv_90day_uplift}}
metric-label: {{metric:ltv_90day_uplift.label}}
summary: One lifetime-value definition, automated across business units, extended into CAC guardrails, payback thresholds, and a price-change framework that accounts for how conversion moves with price.
---
<!-- Draft written from the short case study, the résumé, and the skill notes. The
     "My role", "Decision made", and "What I'd do differently" sections are in Alvin's
     voice and should be checked by Alvin before this page is shared widely. -->

## Context

Capital-allocation, funnel-funding, and pricing decisions were being made without a consistent lifetime-value figure. Different teams calculated LTV differently, so the same customer was worth different amounts depending on who was asking, and there was no reliable basis for CAC guardrails or payback thresholds.

Unit economics were also hard to compare across funnels and regions, and pricing proposals did not always account for how conversion would change at a new price point. That made projected profitability look better than the customer response was likely to support.

## My role

I established the LTV definition and automated its reporting across business units, including a dedicated view for Finance, and I built the price-change framework on top of it. The partners were Finance, Marketing, and Product leadership, and the C-suite conversations about where to invest were the reason the work existed.

## Approach

The first step was agreement, not modelling: a **single LTV definition** that every team would use, with 90-day LTV as the working horizon because it is early enough to act on and late enough to be meaningful. Reporting was then automated so the figure was the same wherever it appeared.

The framework was extended to compare LTV and CAC by funnel and by region, and to calculate the value of a lead that did not convert, so that the economics of acquisition covered the whole funnel rather than only paying customers. Together these gave a consistent basis for setting CAC ceilings, evaluating payback periods, and allocating marketing budget.

The **price-change framework** projected revenue, LTV, and profitability for a proposed price while accounting for the expected movement in conversion rate at that price. Its job was to stop a price increase from looking more profitable on paper than its likely customer response supported.

<!-- Chart to add once approved for public use: a cumulative LTV curve for one cohort,
     indexed to day 0 (day 0 = 100), or 90-day LTV by quarter indexed to the first quarter.
```chart
type: line
title: Cumulative LTV, one cohort (indexed)
Day 0: 100
Day 90: 100
```
-->

## Decision made

CAC ceilings and payback thresholds were set from the shared LTV figure and used to steer marketing budget. Pricing proposals and offer timing were evaluated with the framework before being approved, so a price change had to survive its projected effect on conversion, not only its projected effect on revenue per sale.

## Impact

- Increased 90-day LTV by {{metric:ltv_90day_uplift.bare}} and sustained the improvement across two consecutive quarters
- Increased overall profitability by approximately {{metric:ltv_profitability_uplift.bare}}

## What I'd do differently

A single definition needs an owner and a change process. Metric definitions drift the moment a team has a reason to want a different number, and the discipline that keeps them shared is organisational as much as technical. I would set that up alongside the definition, not after the first dispute.

I would also start extending the horizon earlier. Ninety days is a good working proxy, but the decisions that matter most, on pricing and on which funnels to fund, depend on how well early value predicts long-run value, and that calibration deserves its own attention from the beginning.

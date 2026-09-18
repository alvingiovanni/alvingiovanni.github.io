---
title: Marketing Mix Modeling
tag: Mindvalley · 2026
order: 2
metric: {{metric:mmm_mer_uplift}}
metric-label: {{metric:mmm_mer_uplift.label}}
summary: Building a media mix model that measured incrementality and advertising payback when direct attribution stopped being trustworthy, and using it to move budget.
---
<!-- Draft written from the short case study, the résumé, and the skill notes. The
     "My role", "Decision made", and "What I'd do differently" sections are in Alvin's
     voice and should be checked by Alvin before this page is shared widely. -->

## Context

Direct attribution had become less reliable. Data privacy changes and advertising-platform restrictions reduced how much of a customer journey could be observed, so the click-level view of which channel deserved credit was increasingly partial.

That left three questions harder to answer than they should have been: which channels generated incremental revenue, how media spend related to revenue, and how quickly that investment paid back. Without those answers, budget conversations were driven by whichever platform reported the best numbers.

## My role

I built and validated the model and owned the analysis end to end. The partners were marketing leadership and finance: marketing had to trust the channel estimates enough to move budget, and finance had to trust the payback figures enough to approve it.

This work sat on top of the [Marketing Data Foundation](/#/marketing-data-foundation): the spend and revenue series the model needed only existed in a consistent, reconciled form because that work had been done first.

## Approach

The model measured the relationship between media spend and revenue across channels at an aggregate level, so it did not depend on tracking individual users. Revenue was decomposed into a baseline, the contribution of each media channel, and external effects, with response curves that show where a channel is still returning well and where returns have started to diminish.

Validation came before any recommendation. The model had to agree with what the business already knew, including the [multi-touch attribution](/#/multi-touch) view and known campaign periods, before its channel estimates were used to argue for a change in spend.

The output the business used was not the coefficients. It was a consistent basis for comparing channel performance, seeing diminishing returns, and setting budget with payback in view.

<!-- Chart to add once approved for public use: a response curve for one channel
     (spend index on the x-axis, revenue contribution index on the y-axis), or channel
     credit share before/after. Indices and shares only.
```chart
type: line
title: Response curve, one channel (indexed)
Spend 50: 60
Spend 100: 100
```
-->

## Decision made

Leadership reallocated media budget on the strength of the model: away from channels showing diminishing returns and towards channels with headroom. Payback became part of how budget decisions were framed rather than an afterthought.

## Impact

- Increased marketing efficiency ratio (MER) by {{metric:mmm_mer_uplift.bare}}

## What I'd do differently

A media mix model is only as good as the calibration behind it. I would pair it from the start with designed incrementality tests on the channels that matter most, so that the model's channel estimates are anchored to experiments rather than to fit alone, and so that the two methods keep each other honest over time.

I would also treat the model as a product with a refresh cadence and an owner, not as a one-off analysis. The value is in the second and third budget cycle, when the business starts asking it questions the first version was not built for.

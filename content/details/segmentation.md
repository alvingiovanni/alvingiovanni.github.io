---
title: User Persona Segmentation
tag: Tokopedia (ByteDance) · 2021–2024
order: 1
metric: {{metric:persona_revenue_uplift}}
metric-label: {{metric:persona_revenue_uplift.label}}
summary: How a five-persona behavioural segmentation of Buy-Now-Pay-Later users, built on purchase need state and frequency, became the personalisation framework shared by Product, Marketing, and Business.
---
<!-- Draft written from the short case study, the résumé, and the skill notes. The
     "My role", "Decision made", and "What I'd do differently" sections are in Alvin's
     voice and should be checked by Alvin before this page is shared widely. -->

## Context

Buy-Now-Pay-Later is a crowded category with little to separate one product from another. Pricing, limits, and promotions are visible to everyone and copied quickly. To strengthen its position, the team needed to revisit who the product was really for and how it could serve that audience better than a generic offer could.

The working hypothesis was that the ideal customer used BNPL mainly for aspirational spending. The initiative set out to test that assumption and to find out whether a more personal product experience could become the differentiation the category lacked.

## My role

I led a cross-functional team of analysts on this work. I owned the framing of the question, the design of the behavioural features, and the modelling approach, and I ran the readouts with Product, Marketing, and Business leadership.

Those three teams were the real customers of the analysis. A segmentation only matters if the people who design experiences, write campaigns, and set offers recognise the segments as real people and start using them. Much of my time went into that translation, from cluster output to personas each team could design for.

## Approach

The segmentation was a clustering model over how users actually used BNPL, not who they were demographically. Two engineered features did most of the work:

1. **Purchase need state.** Each transaction was classified as a primary or secondary need, broadly essentials versus aspirational spending, using Maslow's hierarchy of needs as the organising idea.
2. **Purchase frequency.** Whether a user's spending was mostly one-off or recurring.

Alongside transaction data, these two dimensions separated users into **five distinct personas**, each with its own spending pattern, motivation, and reason for using BNPL at all.

Validation was as much qualitative as statistical. A persona survived only if it was distinct in the data and recognisable to the teams who would have to design for it. A cluster that was mathematically tidy but that nobody could picture as a customer was not useful.

<!-- Chart to add once the numbers are approved for public use: persona mix as a share
     of users (five personas, % each). Shares only, no user counts.
```chart
type: column
title: Persona mix
y-label: Share of BNPL users
unit: %
Persona A: 0%
```
-->

## Decision made

The personas became the personalisation framework across Product, Marketing, and Business. The single "ideal customer" question was replaced by a more useful one for every experience, campaign, and offer: which persona is this for?

In practice that meant experiences, messaging, campaigns, and offers were tailored by persona rather than sent to everyone, with the aim of making the product feel relevant and lifting engagement and transaction activity.

## Impact

- Increased revenue by {{metric:persona_revenue_uplift.bare}} on tested cohorts
- {{metric:persona_activity_share}} of communications and marketing activity, depending on the team, became persona-driven

## What I'd do differently

A segmentation is a snapshot. Users move between personas as their circumstances change, and a framework that several teams depend on needs an owner for re-scoring and a way to notice drift. I would build that operating rhythm into the plan from the start rather than treat it as follow-up work.

I would also define the measurement design for the tested cohorts before the first persona-driven campaign went out, so that the revenue readout and the campaign calendar were planned together instead of reconciled afterwards.

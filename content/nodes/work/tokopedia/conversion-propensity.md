---
title: Conversion Propensity Model
order: 4
tag: Tokopedia (Bytedance) · 2021–2024
metric: ~17%
metric-label: Daily transacting users
---
## Problem

Only a small portion of BNPL-eligible users were actively transacting. Promotions were the primary lever used to drive conversion, but the  **same incentive was offered to everyone**, regardless of their likelihood to transact.

This created an efficiency problem: users who would have transacted anyway were  **over-incentivized**, while users who needed a stronger push were  **under-incentivized** . The opportunity was to personalize promo value based on each user’s incremental response to an incentive.

## Solution

Built a **conversion propensity model** to predict each user’s likelihood of transacting with the BNPL product in the following week.

Each user was assigned a weighted propensity score and placed into a promo tier. The tier determined the incentive value they received: users  **least likely to transact received stronger incentives**, while users already likely to convert received smaller ones.

The resulting tiers were deployed directly into CRM platforms, allowing campaign teams to apply **personalized promo values at scale** and allocate incentive spend more efficiently.

## Impact

- ~5% uplift in nett revenue after promo cost

```chart
type: column
title: ~5% Uplift in Nett Revenue After Cost Signaling Scalability in Promo Scheme
y-label: Nett Revenue
Before: 1×
After: 1.05×
```

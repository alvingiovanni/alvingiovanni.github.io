---
title: Segmentation & Propensity Scoring
parent: work
tag: Tokopedia (Bytedance) · 2021–2024
metric: +26%
metric-label: Engagement uplift
---

## Problem

Marketing was sending the same message to everyone on the list, regardless of whether a user
was a bargain hunter who only showed up during promotions, someone managing a monthly budget
with small recurring purchases, or someone saving up for one big-ticket item a year. The
behavioral signal to tell them apart already existed in the data — nothing translated it into
something a marketer could act on.

## Approach

Led a cross-functional team of analysts to build a K-Means clustering model that grouped users
into behavioral personas, using transaction value, frequency, category mix, promo sensitivity,
and recurrence patterns detected through time-series autocorrelation. The personas fed a
companion propensity model (XGBoost) that scored each user's likelihood to convert on a given
product, deployed directly into the CRM for campaign targeting.

## Impact

+26% uplift in marketing engagement, +17% increase in daily transacting users, and +21% lift
in core product activity — by replacing one-size-fits-all messaging with persona- and
propensity-driven targeting.

```chart
type: bar
note: Illustrative — indexed to a baseline of 100, reflecting the +26% engagement uplift reported above. Not actual figures.
Before: 100
After: 126
```

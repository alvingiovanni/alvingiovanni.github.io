---
title: User Persona
order: 3
tag: Tokopedia (ByteDance) · 2021–2024
featured: true
metric: {{metric:persona_revenue_uplift}}
metric-label: {{metric:persona_revenue_uplift.label}}
---
## Problem

BNPL is a highly competitive category, with little differentiation between products. To strengthen its market position, the team needed to revisit who the product was really (ICP) for and how it could better serve that audience.

The working hypothesis was that the ideal customer uses BNPL primarily for aspirational spending. This initiative focused on validating that assumption and exploring how greater personalization could create a more differentiated product experience.

## Solution

I led a cross-functional team of analysts to build a **machine learning clustering model** that segmented users into behavioral personas based on how they used BNPL.

The segmentation was driven by two key engineered features:

1. **Purchase need state:** classifying transactions as primary versus secondary needs, or broadly **essentials versus aspirational spending**, informed by Maslow’s hierarchy of needs.
2. **Purchase frequency:** identifying whether spending behavior was primarily **one-off or recurring**.

Using these behavioral dimensions alongside transaction data, the model identified **five distinct user personas**, each with different spending patterns, motivations, and needs from BNPL.

These personas became the foundation for a **personalization framework across Product, Marketing, and Business teams**. Experiences, messaging, campaigns, and offers could be tailored to each persona, creating a more relevant product experience designed to increase **user engagement and transaction activity**.

## Impact

- Increased revenue by {{metric:persona_revenue_uplift.bare}}
- {{metric:persona_activity_share}} of communications and marketing activity, depending on the team, became persona-driven

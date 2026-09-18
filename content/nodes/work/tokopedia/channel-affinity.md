---
title: Marketing Channel Affinity
order: 3
tag: Tokopedia (ByteDance) · 2021–2024
metric: {{metric:affinity_conversion_uplift}}
metric-label: {{metric:affinity_conversion_uplift.label}}
---
## Problem

Marketing campaigns used a wide range of channels, including push notifications, email, WhatsApp, and social media. Each channel had a different cost and performed differently across users.

Users were often sent the same message through several channels, increasing marketing costs and contributing to **overmarketing and a poor user experience**. The team needed a way to identify which channel was most effective for each user.

## Solution

Developed a **channel-affinity model** based on an adaptation of RFM scoring. The resulting RFE framework replaced monetary value with engagement, ranking each user’s channel preferences using recency, frequency, and engagement.

Campaigns could then be routed through the **lowest-cost, highest-affinity channel** that each user was likely to respond to. This reduced redundant outreach while directing marketing spend toward more effective user-channel combinations.

## Impact

- Reduced marketing spend by {{metric:affinity_spend_reduction.bare}}
- Increased conversion rate by {{metric:affinity_conversion_uplift.bare}}

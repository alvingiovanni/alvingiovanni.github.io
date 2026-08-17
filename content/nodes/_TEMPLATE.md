---
title: The name shown on the circle
order: 6
tag: Company · 2024–2025
metric: +00%
metric-label: What that number is
---
## Problem

Write here. Plain sentences — no code, no HTML needed.

## Solution

Describe what you did as a process, not a technical implementation: what was compared, grouped,
or scored, and on what basis. Skip the name of the specific algorithm or tool ("grouped users by
shopping behavior," not "ran a K-Means clustering model"). You can use **bold**, *italic*,
[links](https://example.com), and bullet lists:

- first point
- second point

## Impact

Lead with the results as a bullet list, one line per number:

- First measurable result
- Second measurable result

Then give each result its own chart. `Before` is always `1×`, and `After` is that
same result written as a multiplier (a 26% uplift is `1.26×`, a 12% reduction is
`0.88×`). Keep the `note:` line, which is what tells the reader the bars are
illustrative:

```chart
type: column
title: +26% Revenue Uplift Signaling Stronger Offer
y-label: Revenue
Before: 1×
After: 1.26×
```

If you have a real set of numbers instead (a split across groups, a mix of
categories, a trend across months), chart those as percentages or shares:

```chart
type: column
title: What the chart shows
y-label: What the values are
unit: %
First group: 12%
Second group: 23%
Third group: 31%
Fourth group: 34%
```

Or an image you exported yourself:

![What the image shows](assets/img/your-file.png)

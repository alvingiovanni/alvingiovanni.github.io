---
title: The name shown on the circle
order: 6
tag: Company · 2024–2025
metric: {{metric:your_metric_id}}
metric-label: {{metric:your_metric_id.label}}
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

Lead with the results as a bullet list, one line per number. Reference the number rather than
typing it, so it can never differ from the big figure at the top — define it once in
`content/semantic.json` under `metrics`, then:

- First measurable result: increased X by {{metric:your_metric_id.bare}}
- Second measurable result

Then add the study to `studies` in `content/semantic.json` with the skills and tools it used.
That is what draws the "Skills used" chips here and the "Applied in" list on each skill.

Only chart a real set of numbers (a split across groups, a mix, a trend), as percentages or
shares — the headline number already says the headline:

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

<!-- Anything inside an HTML comment never reaches the page: a note to yourself,
     a chart waiting on numbers. -->

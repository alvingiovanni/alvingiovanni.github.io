# How to add, edit, or remove a circle

Every circle on the site is one file in `content/nodes/`. You never have to touch
any code — just write text.

---

## Add a new circle

**1. Copy the template.** Duplicate `content/nodes/_TEMPLATE.md` and rename it.
The filename becomes the web address, so keep it lowercase with dashes:

```
content/nodes/customer-churn.md   →   yoursite.com/#/customer-churn
```

**2. Fill in the settings block** at the very top, between the two `---` lines:

```
---
title: Customer Churn Model
parent: work
color: blue
tag: Mindvalley · 2025
metric: −18%
metric-label: Monthly churn
---
```

**3. Write the body** underneath, in normal sentences.

**4. Add the filename to the list.** Open `content/nodes.json` and add one line:

```json
"customer-churn.md",
```

Every line except the last one inside the `[ ... ]` needs a comma at the end.
That's the one place a typo can bite — if you get it wrong the site will tell
you, in plain English, at the top of the page.

**5. Save.** Refresh the page and your circle is there, already wired up.

---

## The settings block

| Setting | What it does | Required? |
| --- | --- | --- |
| `title` | The label on the circle | Yes |
| `parent` | Which circle it hangs off — use another file's name without `.md` | Yes, except for the one center circle |
| `color` | `blue`, `purple`, `green`, `orange`, `pink`, `teal`, `slate` | No — inherits from its parent |
| `tag` | Small line above the title (employer, dates) | No |
| `metric` | The big number, e.g. `+26%` | No |
| `metric-label` | Small text next to the big number | No |
| `leaves` | Quick keyword circles, comma-separated — no file needed for each | No |
| `angle` | Force a branch to point a direction. `0` = up, `90` = right, `180` = down, `270` = left | No |
| `size` | `sm` or `lg` to make the circle smaller/bigger | No |
| `draft` | `true` hides it from the site without deleting the file | No |

**`leaves` is the shortcut for keyword circles.** These become small dots with a
label and nothing to click — that's how the skill lists work:

```
leaves: Python, SQL, dbt, Airflow
```

Avoid commas inside a leaf name — commas are what separate them.

---

## Writing the body

```markdown
## A heading

Normal paragraph. **Bold**, *italic*, and [a link](https://example.com).

- a bullet
- another bullet
```

**A chart you type by hand:**

````markdown
```chart
type: bar
note: Illustrative — indexed to a baseline of 100. Not actual figures.
Before: 100
After: 126
```
````

Every line that looks like `Name: number` becomes a bar. `type: line` draws a
line chart instead. `note:` prints the small grey disclaimer underneath. Bars
automatically use the circle's own colour.

**An image:** drop the file into `assets/img/`, then:

```markdown
![What the image shows](assets/img/your-file.png)
```

Write the path as if you were standing on the site's front page — no `../` in
front, even though the `.md` file itself lives in a subfolder.

> One caution: anything that looks like HTML in a node file is treated as real
> HTML, so it renders instead of showing as text. That's deliberate (it's the
> escape hatch for embeds), but it means you shouldn't paste in markup you
> copied from somewhere you don't trust.

---

## Edit or remove a circle

- **Edit** — open the `.md` file, change the words, save. Nothing else to do.
- **Remove temporarily** — add `draft: true` to the settings block.
- **Remove for good** — delete the file *and* remove its line from
  `content/nodes.json`. If you forget the second step you'll get a friendly
  warning banner telling you exactly which line to fix.

---

## Seeing your changes

**The easy way — edit on GitHub, no laptop needed.** Go to your repo on
github.com, click into `content/nodes/`, click a file, click the pencil icon,
edit, then "Commit changes". The live site updates in about a minute.

**On your own computer.** The site loads its content files as you browse, and
browsers block that when you open a file directly — so double-clicking
`index.html` will show an error message instead of the map. Instead, open
Terminal and run:

```sh
cd path/to/portfolio
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Press `Ctrl+C` in Terminal when you're done.

---

## If something looks wrong

The site tells you rather than breaking. A peach-coloured banner at the top
names the exact file and problem — a misspelled filename, a `parent` that
doesn't exist, a colour it doesn't recognise, a missing comma in
`content/nodes.json`. Everything else keeps working while you fix it.

---

## One thing to keep in mind

This repository is **public**. The case study text is deliberately limited to the
same percentage figures that already appear on your resume — no currency
amounts, no user counts, no internal document names or ticket numbers, no
colleague or partner names. Charts are illustrative and indexed, never real data
exports. Keep new nodes to that same standard.

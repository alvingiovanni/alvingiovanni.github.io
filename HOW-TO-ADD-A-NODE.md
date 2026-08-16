# How to add, edit, or remove a circle

Every circle on the site is one file in `content/nodes/`. You never have to touch
any code — just write text and put the file in the right folder.

---

## The one big idea: folders are the map

**The folder a file sits in is the circle it hangs off.** That's the whole
structure — there's nothing else to set.

```
content/nodes/
├── index.md                      ←  Alvin Giovanni  (the centre)
├── leisure.md                    ←  hangs off the centre
├── work/
│   ├── index.md                  ←  the "Work" circle itself
│   ├── segmentation.md           ←  hangs off Work
│   └── ltv-cac.md                ←  hangs off Work
└── skills/
    ├── index.md                  ←  the "Skills" circle itself
    └── programming/
        ├── index.md              ←  the "Programming & Data" circle
        ├── python.md             ←  hangs off Programming & Data
        └── sql.md                ←  hangs off Programming & Data
```

Two rules follow from that:

- **A folder's own text lives in its `index.md`.** If a circle has children, it
  needs a folder, and the `index.md` inside is that circle.
- **To move a circle somewhere else on the map, drag the file to another
  folder.** Nothing inside the file changes.

---

## Add a new circle

**1. Pick the folder** it should hang off — that decides where it lands.

**2. Copy `content/nodes/_TEMPLATE.md`** into that folder and rename it. The
filename becomes the web address, so keep it lowercase with dashes:

```
content/nodes/work/customer-churn.md   →   yoursite.com/#/customer-churn
```

Filenames have to be unique across **all** folders, since they're web addresses.

**3. Fill in the settings block** at the top, between the two `---` lines:

```
---
title: Customer Churn Model
order: 6
tag: Mindvalley · 2025
metric: −18%
metric-label: Monthly churn
---
```

**4. Write the body** underneath, in normal sentences.

**5. Save and commit.** That's it — the list the site reads updates itself
(see "The list, and why you can ignore it" below).

---

## Giving a circle children

Say you want things hanging off `customer-churn.md`:

1. Make a folder next to it called `customer-churn/`
2. Move the file into it and rename it `index.md`
3. Put the child files in that same folder

```
work/
└── customer-churn/
    ├── index.md          ←  the file you already wrote
    ├── survival-model.md
    └── save-offers.md
```

---

## The settings block

| Setting | What it does | Required? |
| --- | --- | --- |
| `title` | The label on the circle | Yes |
| `order` | Where it sits among its siblings — `1` first, `2` next, and so on. No `order` means it goes last | No |
| `color` | `blue`, `purple`, `green`, `orange`, `pink`, `teal`, `slate` | No — inherits from its parent |
| `tag` | Small line above the title (employer, dates) | No |
| `metric` | The big number, e.g. `+26%` | No |
| `metric-label` | Small text next to the big number | No |
| `angle` | Force a branch to point a direction. `0` = up, `90` = right, `180` = down, `270` = left | No |
| `size` | `sm` or `lg` to make the circle smaller/bigger | No |
| `draft` | `true` hides it from the site without deleting the file | No |

There is **no `parent:` setting** — the folder does that job. If you write one,
the site will tell you to delete it.

---

## Two shapes of circle — same file, same rules

There's only one kind of node file. What decides how a circle looks is whether
you wrote anything **underneath** the settings block:

| | Big circle, clickable | Small dot, just a label |
| --- | --- | --- |
| Has text under the `---` block | Yes | No |
| Opens a panel when clicked | Yes | No |
| Has its own web address | Yes | No |
| Example | `work/segmentation.md` | `skills/programming/python.md` |

So `python.md` is nothing but a settings block:

```
---
title: Python
order: 1
---
```

Want to say something about Python one day? Write a paragraph under the `---`
and it becomes a clickable circle. Delete the paragraph and it's a dot again.

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
type: column
title: Marketing Engagement Uplift
y-label: Marketing engagement
note: Illustrative — shown relative to a baseline of 1×. Not actual figures.
Before: 1×
After: 1.26×
```
````

Every line that looks like `Name: number` becomes a column. `title:` adds the
heading above the plot, and `y-label:` names the metric on the vertical axis.
`type: bar` draws a horizontal bar chart, while `type: line` draws a line chart.
`note:` prints the small grey disclaimer underneath. Charts automatically use
the circle's own colour; a column named `Before` uses neutral grey.

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

- **Edit** — open the `.md` file, change the words, save.
- **Move** — drag the file into a different folder.
- **Reorder** — change its `order:` number.
- **Hide temporarily** — add `draft: true` to the settings block.
- **Remove for good** — delete the file. (If it had a folder of children, delete
  the folder too, or those children lose the circle they hung off.)

---

## The list, and why you can ignore it

`content/nodes.json` is a list of every node file. The site needs it because a
website can't look inside a folder on its own — it can only fetch files it has
been told about.

**You don't maintain it.** A GitHub Action regenerates it every time you push a
change to `content/nodes/`, and commits the result. Add a file, commit, done —
including when you're editing on github.com from your phone.

If you ever want to update it yourself, run:

```sh
python3 tools/build-node-list.py
```

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
python3 tools/build-node-list.py
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Press `Ctrl+C` in Terminal when you're done.

---

## If something looks wrong

The site tells you rather than breaking. A peach-coloured banner at the top
names the exact file and problem — a file in a folder with no `index.md`, two
files sharing a name, a colour it doesn't recognise, a leftover `parent:` line.
Everything else keeps working while you fix it.

---

## One thing to keep in mind

This repository is **public**. The case study text is deliberately limited to the
same percentage figures that already appear on your resume — no currency
amounts, no user counts, no internal document names or ticket numbers, no
colleague or partner names. Charts are illustrative and indexed, never real data
exports. Keep new nodes to that same standard.

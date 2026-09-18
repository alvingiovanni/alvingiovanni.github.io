#!/usr/bin/env python3
"""
Builds everything the site can't work out for itself. A GitHub Action runs
this on every push, so you normally never think about it.

To run it yourself:  python3 tools/build-node-list.py
To only check:       python3 tools/build-node-list.py --check   (exit 1 on drift)

What it does, in order:

  1. content/nodes.json  — the list of node files under content/nodes/ (GitHub
     Pages serves files but can't list a folder), plus which studies have a
     full-length page.
  2. Validates content/semantic.json — every metric is used at least once, every
     {{metric:…}} reference resolves, every study/skill/lens id is a real node,
     every study has at least one skill. Fails the build on drift.
  3. projects/<id>/index.html — a static shell for each content/details/<id>.md:
     its own <title>, description and share tags, a pre-rendered body for
     crawlers, and js/detail.js for the live render.
  4. The static summary inside index.html's <noscript> block, so a pasted link
     and a crawler both see the featured work.
  5. content/corpus.md — every node and detail page as one plain-text document,
     which the "Ask about this work" Worker uses as its grounding context.
  6. sitemap.xml — the home page and every project page.

Rules for nodes:
  - a folder is a circle; its own text lives in that folder's index.md
  - content/nodes/index.md is the centre circle
  - files and folders starting with _ are ignored (e.g. _TEMPLATE.md)
  - `order:` in a file's settings block decides where it sits among its
    siblings; anything without one goes last, alphabetically
"""

import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
NODES = ROOT / "content" / "nodes"
DETAILS = ROOT / "content" / "details"
MANIFEST = ROOT / "content" / "nodes.json"
SEMANTIC = ROOT / "content" / "semantic.json"
CORPUS = ROOT / "content" / "corpus.md"
PROJECTS = ROOT / "projects"
INDEX_HTML = ROOT / "index.html"
SITEMAP = ROOT / "sitemap.xml"
SITE = "https://alvingiovanni.github.io"
ASSET_VERSION = "20260918-showcase"
DEFAULT_ORDER = 10_000

CHECK_ONLY = "--check" in sys.argv
problems = []
changed = []


def problem(msg):
    problems.append(msg)


# ---------------------------------------------------------------- reading


def read(path):
    return path.read_text(encoding="utf-8").replace("﻿", "").replace("\r\n", "\n")


def parse_frontmatter(text):
    """Same rules as js/markdown.js parse(): only the first colon separates."""
    meta = {}
    body = text
    m = re.match(r"^---\n(.*?)\n---[ \t]*(?:\n(.*))?$", text, re.S)
    if m:
        for line in m.group(1).split("\n"):
            t = line.strip()
            if not t or t.startswith("#") or ":" not in t:
                continue
            k, v = t.split(":", 1)
            meta[k.strip().lower()] = v.strip()
        body = m.group(2) or ""
    return meta, body.strip()


def read_order(path):
    try:
        meta, _ = parse_frontmatter(read(path))
    except OSError:
        return DEFAULT_ORDER
    try:
        return int(meta.get("order", DEFAULT_ORDER))
    except ValueError:
        return DEFAULT_ORDER


def hidden(name):
    return name.startswith("_") or name.startswith(".")


def walk(directory):
    """Depth-first: a circle, then its children in `order:` sequence."""
    out = []
    index = directory / "index.md"
    if index.exists():
        out.append(index)
    entries = []
    for child in directory.iterdir():
        if hidden(child.name):
            continue
        if child.is_dir():
            entries.append((read_order(child / "index.md"), child.name, child))
        elif child.suffix == ".md" and child.name != "index.md":
            entries.append((read_order(child), child.name, child))
    for _, _, child in sorted(entries, key=lambda e: (e[0], e[1])):
        if child.is_dir():
            out.extend(walk(child))
        else:
            out.append(child)
    return out


def node_id(rel):
    parts = rel.replace(".md", "").split("/")
    if parts[-1] == "index":
        parts.pop()
    return parts[-1] if parts else "home"


# ---------------------------------------------------------------- metrics

METRIC_RE = re.compile(r"\{\{\s*metric:([a-z0-9_-]+)(?:\.(value|label|bare|period))?\s*\}\}", re.I)


def substitute(text, metrics, where, used):
    def rep(m):
        mid, field = m.group(1), m.group(2)
        entry = metrics.get(mid)
        if not entry:
            problem("%s references {{metric:%s}}, which is not defined in content/semantic.json" % (where, mid))
            return m.group(0)
        used.add(mid)
        if field == "label":
            return entry.get("label", "")
        if field == "period":
            return entry.get("period", "")
        value = str(entry.get("value", ""))
        if field == "bare":
            return re.sub(r"^[+\-−~≈]+\s*", "", value)
        return value

    return METRIC_RE.sub(rep, text)


# ---------------------------------------------------------------- markdown → html (static shells)

def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)", r'<img src="\2" alt="\1" loading="lazy" />', text)
    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(^|[^*])\*([^*\n]+)\*", r"\1<em>\2</em>", text)
    return text


def strip_comments(md):
    return re.sub(r"<!--.*?-->", "", md, flags=re.S)


def strip_charts(md):
    return re.sub(r"```chart\n.*?\n```", "", md, flags=re.S)


def md_to_html(md):
    """A small subset renderer for the crawlable copy: headings, paragraphs,
    lists, quotes, rules, inline marks. Charts are left to js/detail.js."""
    out = []
    para = []

    def flush():
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
            para.clear()

    lines = strip_charts(strip_comments(md)).split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("```"):
            flush()
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                i += 1
            i += 1
            continue
        if not line:
            flush()
            i += 1
            continue
        h = re.match(r"^(#{1,6})\s+(.*)$", line)
        if h:
            flush()
            lvl = min(6, len(h.group(1)) + 1)
            out.append("<h%d>%s</h%d>" % (lvl, inline(h.group(2)), lvl))
            i += 1
            continue
        if re.match(r"^(---|\*\*\*|___)$", line):
            flush()
            out.append("<hr />")
            i += 1
            continue
        if re.match(r"^[-*+]\s+", line) or re.match(r"^\d+[.)]\s+", line):
            flush()
            ordered = bool(re.match(r"^\d+[.)]\s+", line))
            pat = r"^\d+[.)]\s+" if ordered else r"^[-*+]\s+"
            items = []
            while i < len(lines) and re.match(pat, lines[i].strip()):
                item = re.sub(pat, "", lines[i].strip())
                while (
                    i + 1 < len(lines)
                    and lines[i + 1].strip()
                    and not re.match(r"^[-*+]\s+|^\d+[.)]\s+|^```|^#{1,6}\s", lines[i + 1].strip())
                ):
                    item += " " + lines[i + 1].strip()
                    i += 1
                items.append("<li>" + inline(item) + "</li>")
                i += 1
            tag = "ol" if ordered else "ul"
            out.append("<%s>%s</%s>" % (tag, "".join(items), tag))
            continue
        if line.startswith(">"):
            flush()
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append("<blockquote>" + md_to_html("\n".join(quote)) + "</blockquote>")
            continue
        para.append(line)
        i += 1
    flush()
    return "\n".join(out)


def plain_text(md):
    """Markdown → readable plain text for the corpus."""
    md = strip_charts(strip_comments(md))
    md = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", md)
    md = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r"\1 (\2)", md)
    md = re.sub(r"[*`]", "", md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip()


def first_paragraph(md):
    for block in re.split(r"\n\s*\n", strip_charts(strip_comments(md))):
        b = block.strip()
        if b and not b.startswith("#") and not b.startswith("-") and not b.startswith("!"):
            return re.sub(r"\s+", " ", re.sub(r"[*_`]", "", re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", b)))
    return ""


# ---------------------------------------------------------------- writing


def write_if_changed(path, payload, label=None):
    previous = path.read_text(encoding="utf-8") if path.exists() else None
    if previous == payload:
        return False
    if CHECK_ONLY:
        problem("%s is out of date — run python3 tools/build-node-list.py" % path.relative_to(ROOT))
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8")
    changed.append(label or str(path.relative_to(ROOT)))
    return True


# ---------------------------------------------------------------- main


def main():
    if not NODES.is_dir():
        sys.exit("No content/nodes/ folder found at %s" % NODES)

    # ---- 1. nodes
    files = walk(NODES)
    paths = [f.relative_to(NODES).as_posix() for f in files]
    if not paths:
        sys.exit("Found no node files — refusing to write an empty list.")
    if "index.md" not in paths:
        sys.exit("content/nodes/index.md is missing — that file is the centre circle.")

    nodes = {}  # id → dict(meta, body, path, draft)
    for f in files:
        rel = f.relative_to(NODES).as_posix()
        meta, body = parse_frontmatter(read(f))
        nid = node_id(rel)
        if nid in nodes:
            problem('Two files are both called "%s.md" (%s and %s); filenames must be unique.' % (nid, nodes[nid]["path"], rel))
            continue
        nodes[nid] = {"meta": meta, "body": body, "path": rel, "draft": meta.get("draft") == "true"}

    # ---- details
    details = {}
    if DETAILS.is_dir():
        for f in sorted(DETAILS.glob("*.md")):
            if hidden(f.name):
                continue
            did = f.stem
            meta, body = parse_frontmatter(read(f))
            if did not in nodes:
                problem("content/details/%s.md has no matching node under content/nodes/ (a detail page extends a study)." % did)
                continue
            if meta.get("draft") == "true" or nodes[did]["draft"]:
                continue
            details[did] = {"meta": meta, "body": body}
    detail_ids = sorted(details, key=lambda d: (int(details[d]["meta"].get("order", DEFAULT_ORDER)), d))

    manifest = (
        "{\n"
        '  "//": "AUTO-GENERATED by tools/build-node-list.py — do not edit by hand. '
        'Add a .md file under content/nodes/ and this list updates itself on push.",\n'
        '\n  "nodes": [\n'
        + ",\n".join('    "%s"' % p for p in paths)
        + "\n  ],\n"
        '\n  "details": [\n'
        + ",\n".join('    "%s"' % d for d in detail_ids)
        + "\n  ]\n}\n"
    )
    write_if_changed(MANIFEST, manifest)

    # ---- 2. semantic layer
    semantic = {"metrics": {}, "studies": {}, "lenses": []}
    if SEMANTIC.exists():
        try:
            semantic.update(json.loads(read(SEMANTIC)))
        except ValueError as e:
            problem("content/semantic.json is not valid JSON (%s)." % e)
    else:
        problem("content/semantic.json is missing.")

    metrics = semantic.get("metrics", {}) or {}
    studies = semantic.get("studies", {}) or {}
    lenses = semantic.get("lenses", []) or []
    used_metrics = set()

    for mid, entry in metrics.items():
        if not isinstance(entry, dict) or not entry.get("value") or not entry.get("label"):
            problem("metric %s needs at least a value and a label." % mid)
        elif entry.get("study") and entry["study"] not in nodes:
            problem("metric %s points at study %s, which is not a node." % (mid, entry["study"]))

    # Substitute (and thereby check) every node and detail file.
    for nid, n in nodes.items():
        for key in list(n["meta"]):
            n["meta"][key] = substitute(n["meta"][key], metrics, n["path"], used_metrics)
        n["body"] = substitute(n["body"], metrics, n["path"], used_metrics)
    for did, d in details.items():
        for key in list(d["meta"]):
            d["meta"][key] = substitute(d["meta"][key], metrics, "content/details/%s.md" % did, used_metrics)
        d["body"] = substitute(d["body"], metrics, "content/details/%s.md" % did, used_metrics)

    for mid in metrics:
        if mid not in used_metrics:
            problem("metric %s is defined in content/semantic.json but never referenced — reference it or remove it." % mid)

    skill_ids = {nid for nid, n in nodes.items() if n["path"].startswith("skills/")}
    for sid, edges in studies.items():
        if sid not in nodes:
            problem("semantic.json lists study %s, which is not a node." % sid)
            continue
        refs = list((edges or {}).get("skills", []) or []) + list((edges or {}).get("tools", []) or [])
        if not refs:
            problem("study %s has no skills or tools in semantic.json — every study needs at least one." % sid)
        for r in refs:
            if r not in skill_ids:
                problem("study %s lists %s, which is not a node under skills/." % (sid, r))
    for nid, n in nodes.items():
        is_study = n["path"].startswith("work/") and n["body"] and not n["path"].endswith("index.md") and n["meta"].get("metric")
        if is_study and nid not in studies and not n["draft"]:
            problem("study %s (%s) is missing from semantic.json `studies`." % (nid, n["path"]))
    for lens in lenses:
        if not isinstance(lens, dict) or not lens.get("id") or not lens.get("label"):
            problem("every lens needs an id and a label.")
            continue
        for sid in lens.get("studies", []) or []:
            if sid not in nodes:
                problem("lens %s lists %s, which is not a node." % (lens["id"], sid))

    # ---- 3. project shells
    def esc(s):
        return html.escape(str(s or ""), quote=True)

    def chips_html(sid):
        edges = studies.get(sid) or {}
        refs = []
        for r in list(edges.get("skills", []) or []) + list(edges.get("tools", []) or []):
            if r in nodes and r not in refs:
                refs.append(r)
        if not refs:
            return ""
        chips = "".join(
            '<a class="chip" href="/#/%s">%s</a>' % (esc(r), esc(nodes[r]["meta"].get("title", r))) for r in refs
        )
        return '<nav class="chips" aria-label="Skills used"><h2>Skills used</h2><div class="chip-row">%s</div></nav>' % chips

    shell_paths = set()
    for i, did in enumerate(detail_ids):
        d = details[did]
        meta = d["meta"]
        title = meta.get("title") or nodes[did]["meta"].get("title") or did
        summary = meta.get("summary") or first_paragraph(d["body"])
        next_id = detail_ids[(i + 1) % len(detail_ids)] if len(detail_ids) > 1 else None
        next_title = details[next_id]["meta"].get("title") if next_id else ""
        metric = meta.get("metric", "")
        metric_label = meta.get("metric-label", "")
        url = "%s/projects/%s/" % (SITE, did)
        shell = f"""<!doctype html>
<!-- AUTO-GENERATED by tools/build-node-list.py from content/details/{did}.md — edit that file, not this one. -->
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
  <title>{esc(title)} — Alvin Giovanni</title>
  <meta name="description" content="{esc(summary)}" />
  <meta name="theme-color" content="#fafafa" />
  <meta property="og:title" content="{esc(title)} — Alvin Giovanni" />
  <meta property="og:description" content="{esc(summary)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{url}" />
  <meta property="og:image" content="{SITE}/assets/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="{SITE}/assets/og-image.png" />
  <link rel="canonical" href="{url}" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cg stroke='%233867d6' stroke-width='2' fill='none'%3E%3Cpath d='M16 16 L16 6 M16 16 L26 21 M16 16 L6 21'/%3E%3C/g%3E%3Cg fill='%233867d6'%3E%3Ccircle cx='16' cy='6' r='3.5'/%3E%3Ccircle cx='26' cy='21' r='3.5'/%3E%3Ccircle cx='6' cy='21' r='3.5'/%3E%3C/g%3E%3Ccircle cx='16' cy='16' r='4.5' fill='%23fff' stroke='%231d1d1f' stroke-width='2.5'/%3E%3C/svg%3E" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&amp;display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css?v={ASSET_VERSION}" />
</head>
<body class="page" data-detail="{esc(did)}">
  <header class="page-top">
    <a class="brand" href="/" aria-label="Alvin Giovanni, home"><span>Alvin Giovanni</span><span class="brand-dot">.</span></a>
    <a class="btn btn-surface" href="/#/{esc(did)}"><span aria-hidden="true">←</span><span>Back to the map</span></a>
  </header>
  <main class="page-inner">
    <p class="eyebrow">Case study</p>
    {('<p class="modal-tag">%s</p>' % esc(meta.get("tag"))) if meta.get("tag") else ""}
    <h1>{esc(title)}</h1>
    <p class="page-summary">{esc(summary)}</p>
    {('<div class="modal-metric"><span class="modal-metric-value">%s</span>%s</div>' % (esc(metric), ('<span class="modal-metric-label">%s</span>' % esc(metric_label)) if metric_label else "")) if metric else ""}
    <div class="prose" id="detail-body">
{md_to_html(d["body"])}
    </div>
    {chips_html(did)}
    <nav class="page-nav" aria-label="Case study navigation">
      <a href="/#/{esc(did)}"><small>Back</small><span aria-hidden="true">← </span>Back to the map</a>
      {('<a class="page-next" href="/projects/%s/"><small>Next</small>%s <span aria-hidden="true">→</span></a>' % (esc(next_id), esc(next_title))) if next_id else ""}
    </nav>
  </main>
  <p class="page-footer">Part of <a href="/">alvingiovanni.github.io</a>, an explorable map of Alvin Giovanni's growth and product analytics work.</p>
  <script src="/js/markdown.js?v={ASSET_VERSION}"></script>
  <script src="/js/detail.js?v={ASSET_VERSION}"></script>
</body>
</html>
"""
        shell_path = PROJECTS / did / "index.html"
        shell_paths.add(shell_path)
        write_if_changed(shell_path, shell)

    # Remove shells whose detail file is gone.
    if PROJECTS.is_dir():
        for stale in PROJECTS.glob("*/index.html"):
            if stale not in shell_paths:
                if CHECK_ONLY:
                    problem("%s has no detail file any more." % stale.relative_to(ROOT))
                else:
                    stale.unlink()
                    try:
                        stale.parent.rmdir()
                    except OSError:
                        pass
                    changed.append("removed " + str(stale.relative_to(ROOT)))

    # ---- 4. noscript static summary in index.html
    if INDEX_HTML.exists():
        home = nodes.get("home", {"meta": {}, "body": ""})
        featured = [
            nid for nid, n in nodes.items()
            if n["meta"].get("featured") == "true" and n["body"] and not n["draft"]
        ]
        featured.sort(key=lambda nid: (nid not in detail_ids, detail_ids.index(nid) if nid in detail_ids else 0, nid))

        parts = ["<h1>Alvin Giovanni</h1>"]
        if home["meta"].get("tag"):
            parts.append("<p><strong>%s</strong></p>" % esc(home["meta"]["tag"]))
        parts.append(md_to_html(home["body"]))
        parts.append("<p>This site is an interactive map and needs JavaScript. The featured work reads fine without it:</p>")
        parts.append("<h2>Selected work</h2>")
        for nid in featured:
            n = nodes[nid]
            summary = details[nid]["meta"].get("summary") if nid in details else first_paragraph(n["body"])
            link = "/projects/%s/" % nid if nid in details else "/#/%s" % nid
            parts.append('<h3><a href="%s">%s</a></h3>' % (esc(link), esc(n["meta"].get("title", nid))))
            meta_bits = [b for b in [n["meta"].get("tag"), (n["meta"].get("metric", "") + " " + n["meta"].get("metric-label", "")).strip()] if b]
            if meta_bits:
                parts.append('<p class="noscript-meta">%s</p>' % esc(" · ".join(meta_bits)))
            if summary:
                parts.append("<p>%s</p>" % esc(summary))
        parts.append('<p><a href="/assets/resume.pdf">Résumé (PDF)</a> · <a href="https://www.linkedin.com/in/alvingiovanni/">LinkedIn</a> · <a href="mailto:alvingiovanni@outlook.com">alvingiovanni@outlook.com</a></p>')
        summary_html = "\n      ".join(parts)

        page = read(INDEX_HTML)
        start = "<!-- static-summary:start"
        end = "<!-- static-summary:end -->"
        if start in page and end in page:
            pre, rest = page.split(start, 1)
            marker_line, rest = rest.split("\n", 1)
            _, post = rest.split(end, 1)
            new_page = pre + start + marker_line + "\n      " + summary_html + "\n      " + end + post
            write_if_changed(INDEX_HTML, new_page, "index.html (static summary)")
        else:
            problem("index.html is missing the <!-- static-summary:start/end --> markers inside <noscript>.")

    # ---- 5. corpus for the agent
    corpus = [
        "# Alvin Giovanni — portfolio corpus",
        "",
        "Generated by tools/build-node-list.py. One section per node on the site; the id in brackets is the",
        "anchor to cite it (the page is %s/#/<id>; full case studies are at %s/projects/<id>/)." % (SITE, SITE),
        "",
    ]
    for rel in paths:
        nid = node_id(rel)
        n = nodes.get(nid)
        if not n or n["draft"] or not n["body"]:
            continue
        m = n["meta"]
        head = "## %s [%s]" % (m.get("title", nid), nid)
        bits = []
        if m.get("tag"):
            bits.append(m["tag"])
        if m.get("metric"):
            bits.append("%s %s" % (m["metric"], m.get("metric-label", "")))
        if nid in studies:
            edges = studies[nid]
            refs = list(edges.get("skills", []) or []) + list(edges.get("tools", []) or [])
            names = [nodes[r]["meta"].get("title", r) for r in refs if r in nodes]
            if names:
                bits.append("Skills used: " + ", ".join(names))
        if nid in details:
            bits.append("Full case study: %s/projects/%s/" % (SITE, nid))
        corpus.append(head)
        if bits:
            corpus.append("_" + " · ".join(bits) + "_")
        corpus.append("")
        corpus.append(plain_text(n["body"]))
        corpus.append("")
    for did in detail_ids:
        d = details[did]
        corpus.append("## %s — full case study [%s]" % (d["meta"].get("title", did), did))
        corpus.append("_%s/projects/%s/_" % (SITE, did))
        corpus.append("")
        corpus.append(plain_text(d["body"]))
        corpus.append("")
    if metrics:
        corpus.append("## Metric definitions")
        corpus.append("")
        for mid in sorted(metrics):
            e = metrics[mid]
            corpus.append("- %s: %s (%s)%s" % (e.get("study", "?"), e.get("value", ""), e.get("label", ""), (" — " + e["period"]) if e.get("period") else ""))
        corpus.append("")
    write_if_changed(CORPUS, "\n".join(corpus).rstrip() + "\n")

    # ---- 6. sitemap
    urls = ["%s/" % SITE] + ["%s/projects/%s/" % (SITE, did) for did in detail_ids]
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join("  <url>\n    <loc>%s</loc>\n  </url>\n" % u for u in urls)
        + "</urlset>\n"
    )
    write_if_changed(SITEMAP, sitemap)

    # ---- report
    if problems:
        print("Content problems:")
        for p in problems:
            print("  - " + p)
        sys.exit(1)
    if changed:
        print("Updated: " + ", ".join(changed))
    else:
        print("Everything already up to date (%d nodes, %d project pages)" % (len(paths), len(detail_ids)))


if __name__ == "__main__":
    main()

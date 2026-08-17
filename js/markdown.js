/**
 * markdown.js — a small markdown → HTML renderer, no dependencies.
 *
 * Supports: # headings, **bold**, *italic*, `code`, [links](url),
 * ![images](path), - bullet lists, 1. numbered lists, > quotes, --- rules,
 * paragraphs, ```code fences``` — plus ```chart blocks (see renderChart).
 *
 * Raw HTML in a node file passes straight through, which is the escape hatch
 * for embeds. Only ever put markup you wrote yourself into a node file.
 */
window.Markdown = (function () {
  /* ---------------- charts ---------------- */

  // ```chart
  // type: column
  // title: Promo tier mix after scoring
  // y-label: Share of eligible users
  // unit: %            ← suffix on the y-axis ticks; defaults to ×, `unit:` alone clears it
  // note: optional caveat printed under the plot
  // Tier 1: 12%
  // Tier 2: 23%
  // ```
  function parseChart(src) {
    var cfg = {
      type: "bar",
      title: "",
      yLabel: "",
      note: "",
      unit: "×",
      max: null,
      points: [],
    };
    src.split("\n").forEach(function (raw) {
      var line = raw.trim();
      if (!line || line.indexOf(":") === -1) return;
      var i = line.indexOf(":");
      var key = line.slice(0, i).trim();
      var val = line.slice(i + 1).trim();
      var lower = key.toLowerCase();
      if (lower === "type") cfg.type = val.toLowerCase();
      else if (lower === "title") cfg.title = val;
      else if (lower === "y-label") cfg.yLabel = val;
      else if (lower === "note") cfg.note = val;
      else if (lower === "unit") cfg.unit = val;
      else if (lower === "max") cfg.max = parseFloat(val);
      else {
        var num = parseFloat(val.replace(/[^0-9.\-]/g, ""));
        if (!isNaN(num)) cfg.points.push({ label: key, value: num, raw: val });
      }
    });
    return cfg;
  }

  function renderChart(src) {
    var cfg = parseChart(src);
    if (!cfg.points.length) return "";

    var values = cfg.points.map(function (p) {
      return p.value;
    });
    var max = cfg.max || Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    var body;

    if (cfg.type === "line") {
      var w = 620;
      var h = 190;
      var padX = 26;
      var padY = 22;
      var span = max - min || 1;
      var pts = cfg.points.map(function (p, i) {
        var x =
          padX +
          (cfg.points.length === 1 ? 0 : (i / (cfg.points.length - 1)) * (w - padX * 2));
        var y = padY + (1 - (p.value - min) / span) * (h - padY * 2);
        return { x: x, y: y, p: p };
      });
      var d = pts
        .map(function (pt, i) {
          return (i === 0 ? "M" : "L") + pt.x.toFixed(1) + " " + pt.y.toFixed(1);
        })
        .join(" ");
      body =
        '<svg class="chart-svg" viewBox="0 0 ' +
        w +
        " " +
        h +
        '" role="img" aria-label="' +
        escapeAttr(
          cfg.points
            .map(function (p) {
              return p.label + ": " + p.raw;
            })
            .join(", ")
        ) +
        '">' +
        '<path d="' + d + '" class="chart-line" />' +
        pts
          .map(function (pt) {
            return (
              '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) +
              '" r="4" class="chart-dot" />' +
              '<text x="' + pt.x.toFixed(1) + '" y="' + (h - 4) +
              '" class="chart-axis" text-anchor="middle">' + escapeText(pt.p.label) + "</text>"
            );
          })
          .join("") +
        "</svg>";
    } else if (cfg.type === "column") {
      var columnW = 620;
      var columnH = 260;
      var columnLeft = 82;
      var columnRight = 18;
      var columnTop = 28;
      var columnBottom = 42;
      var plotW = columnW - columnLeft - columnRight;
      var plotH = columnH - columnTop - columnBottom;
      var dataMax = Math.max.apply(null, values);
      var roughStep = Math.max(max, dataMax, 1) / 3;
      var magnitude = Math.pow(10, Math.floor(Math.log(roughStep) / Math.LN10));
      var normalizedStep = roughStep / magnitude;
      var niceStep =
        (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) *
        magnitude;
      var columnMax = Math.ceil(Math.max(max, niceStep) / niceStep) * niceStep;
      var tickCount = Math.round(columnMax / niceStep);
      var bandW = plotW / cfg.points.length;
      var barW = Math.min(112, bandW * 0.6);
      var chartLabel = cfg.points
        .map(function (p) {
          return p.label + ": " + p.raw;
        })
        .join(", ");
      if (cfg.yLabel) chartLabel = cfg.yLabel + ". " + chartLabel;

      var grid = Array.apply(null, Array(tickCount + 1))
        .map(function (_, i) {
          var tickValue = i * niceStep;
          var y = columnTop + plotH - (tickValue / columnMax) * plotH;
          var tickLabel = String(parseFloat(tickValue.toFixed(4))) + cfg.unit;
          return (
            '<line x1="' + columnLeft + '" y1="' + y.toFixed(1) + '" x2="' +
            (columnW - columnRight) + '" y2="' + y.toFixed(1) +
            '" class="chart-grid' + (i === 0 ? " chart-grid-baseline" : "") + '" />' +
            '<text x="' + (columnLeft - 12) + '" y="' + (y + 4).toFixed(1) +
            '" class="chart-y-axis" text-anchor="end">' + escapeText(tickLabel) + "</text>"
          );
        })
        .join("");

      var columns = cfg.points
        .map(function (p, index) {
          var centerX = columnLeft + bandW * (index + 0.5);
          var barH = Math.max(2, (Math.max(0, p.value) / columnMax) * plotH);
          var barY = columnTop + plotH - barH;
          var barClass =
            "chart-column-bar" +
            (p.label.toLowerCase() === "before" ? " chart-column-before" : "");
          return (
            '<rect x="' + (centerX - barW / 2).toFixed(1) + '" y="' + barY.toFixed(1) +
            '" width="' + barW.toFixed(1) + '" height="' + barH.toFixed(1) +
            '" rx="4" class="' + barClass + '" />' +
            '<text x="' + centerX.toFixed(1) + '" y="' + Math.max(16, barY - 8).toFixed(1) +
            '" class="chart-column-label" text-anchor="middle">' + escapeText(p.raw) + "</text>" +
            '<text x="' + centerX.toFixed(1) + '" y="' + (columnH - 12) +
            '" class="chart-x-axis" text-anchor="middle">' + escapeText(p.label) + "</text>"
          );
        })
        .join("");
      body =
        '<svg class="chart-svg chart-column-svg" viewBox="0 0 ' + columnW + " " + columnH +
        '" role="img" aria-label="' + escapeAttr(chartLabel) + '">' +
        (cfg.yLabel
          ? '<text x="18" y="' + (columnTop + plotH / 2).toFixed(1) +
            '" class="chart-y-title" text-anchor="middle" transform="rotate(-90 18 ' +
            (columnTop + plotH / 2).toFixed(1) + ')">' + escapeText(cfg.yLabel) + "</text>"
          : "") +
        grid + columns + "</svg>";
    } else {
      body = cfg.points
        .map(function (p) {
          var pct = max > 0 ? Math.max(2, (p.value / max) * 100) : 0;
          return (
            '<div class="chart-row">' +
            '<span class="chart-key">' + escapeText(p.label) + "</span>" +
            '<span class="chart-track"><span class="chart-fill" style="width:' +
            pct.toFixed(1) + '%"></span></span>' +
            '<span class="chart-val">' + escapeText(p.raw) + "</span>" +
            "</div>"
          );
        })
        .join("");
      body = '<div class="chart-bars">' + body + "</div>";
    }

    return (
      '<figure class="chart chart-' + escapeAttr(cfg.type) + '">' +
      (cfg.title ? '<h3 class="chart-title">' + escapeText(cfg.title) + "</h3>" : "") +
      body +
      (cfg.note ? '<figcaption class="chart-note">' + inline(cfg.note) + "</figcaption>" : "") +
      "</figure>"
    );
  }

  /* ---------------- inline ---------------- */

  function escapeText(s) {
    return String(s).replace(/&(?![a-zA-Z#][a-zA-Z0-9]*;)/g, "&amp;").replace(/</g, "&lt;");
  }
  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function inline(text) {
    return (
      text
        // images before links — ![alt](src) contains a [](…)
        .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (_, alt, src, title) {
          return (
            '<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '"' +
            (title ? ' title="' + escapeAttr(title) + '"' : "") + " loading=\"lazy\" />"
          );
        })
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
          var external = /^https?:\/\//.test(href);
          return (
            '<a href="' + escapeAttr(href) + '"' +
            (external ? ' target="_blank" rel="noopener"' : "") + ">" + label + "</a>"
          );
        })
        .replace(/`([^`]+)`/g, function (_, code) {
          return "<code>" + escapeText(code) + "</code>";
        })
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    );
  }

  /* ---------------- blocks ---------------- */

  function render(md) {
    var lines = String(md || "").replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var para = [];

    function flushPara() {
      if (!para.length) return;
      out.push("<p>" + inline(para.join(" ").trim()) + "</p>");
      para = [];
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      // fenced block
      var fence = trimmed.match(/^```\s*(\w*)/);
      if (fence) {
        flushPara();
        var lang = fence[1];
        var buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) {
          buf.push(lines[i]);
          i++;
        }
        var content = buf.join("\n");
        out.push(
          lang === "chart"
            ? renderChart(content)
            : "<pre><code>" + escapeText(content) + "</code></pre>"
        );
        continue;
      }

      if (!trimmed) {
        flushPara();
        continue;
      }

      var heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushPara();
        var lvl = Math.min(6, heading[1].length + 1); // node title is the h1
        out.push("<h" + lvl + ">" + inline(heading[2]) + "</h" + lvl + ">");
        continue;
      }

      if (/^(---|\*\*\*|___)$/.test(trimmed)) {
        flushPara();
        out.push("<hr />");
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        flushPara();
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        i--;
        out.push("<blockquote>" + render(quote.join("\n")) + "</blockquote>");
        continue;
      }

      var bullet = /^[-*+]\s+/;
      var numbered = /^\d+[.)]\s+/;
      if (bullet.test(trimmed) || numbered.test(trimmed)) {
        flushPara();
        var ordered = numbered.test(trimmed);
        var re = ordered ? numbered : bullet;
        var items = [];
        while (i < lines.length && re.test(lines[i].trim())) {
          var item = lines[i].trim().replace(re, "");
          // continuation lines (wrapped prose) belong to the item above
          while (
            i + 1 < lines.length &&
            lines[i + 1].trim() &&
            !bullet.test(lines[i + 1].trim()) &&
            !numbered.test(lines[i + 1].trim()) &&
            !/^```/.test(lines[i + 1].trim()) &&
            !/^#{1,6}\s/.test(lines[i + 1].trim())
          ) {
            item += " " + lines[i + 1].trim();
            i++;
          }
          items.push("<li>" + inline(item) + "</li>");
          i++;
        }
        i--;
        var tag = ordered ? "ol" : "ul";
        out.push("<" + tag + ">" + items.join("") + "</" + tag + ">");
        continue;
      }

      para.push(trimmed);
    }

    flushPara();
    return out.join("\n");
  }

  /* ---------------- frontmatter ---------------- */

  /**
   * Splits the `--- settings ---` block off the top of a node file.
   * Values are plain text: `title: Something: with a colon` works fine,
   * because only the first colon is treated as the separator.
   */
  function parse(raw) {
    var text = String(raw || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    var meta = {};
    var body = text;

    var m = text.match(/^---\n([\s\S]*?)\n---\s*(?:\n([\s\S]*))?$/);
    if (m) {
      m[1].split("\n").forEach(function (line) {
        var t = line.trim();
        if (!t || t.charAt(0) === "#") return;
        var idx = t.indexOf(":");
        if (idx === -1) return;
        meta[t.slice(0, idx).trim().toLowerCase()] = t.slice(idx + 1).trim();
      });
      body = m[2] || "";
    }

    return { meta: meta, body: body.trim() };
  }

  return { render: render, parse: parse, renderChart: renderChart };
})();

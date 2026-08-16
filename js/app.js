/**
 * app.js — loads the content files, boots the graph, and owns everything
 * outside the canvas: the modal, the hash router, search, the text view,
 * and the accessible link list.
 *
 * Content contract: content/nodes.json lists filenames; every file lives in
 * content/nodes/ and its filename (minus .md) is the node's id and its URL.
 */
(function () {
  "use strict";

  var CONTENT_DIR = "content/nodes/";
  var MANIFEST = "content/nodes.json";

  // Friendly color names → the --c-* tokens in css/style.css.
  var COLORS = {
    blue: "#4c6fff",
    purple: "#8b5cf6",
    green: "#16a085",
    orange: "#f5a524",
    pink: "#e85d75",
    teal: "#0ea5a5",
    slate: "#64748b",
  };

  var el = {};
  var graph = null;
  var nodes = [];          // ordered, tree-ish
  var byId = Object.create(null);
  var warnings = [];
  var currentOpen = null;
  var lastFocused = null;

  /* ---------------- boot ---------------- */

  document.addEventListener("DOMContentLoaded", function () {
    el.canvas = document.getElementById("canvas");
    el.backdrop = document.getElementById("backdrop");
    el.modal = document.getElementById("modal");
    el.modalBody = document.getElementById("modal-body");
    el.closeBtn = document.getElementById("modal-close");
    el.search = document.getElementById("search");
    el.results = document.getElementById("search-results");
    el.srNav = document.getElementById("sr-nav");
    el.warnings = document.getElementById("warnings");
    el.textView = document.getElementById("text-view");
    el.textBody = document.getElementById("text-view-body");
    el.hint = document.getElementById("hint");
    el.loading = document.getElementById("loading");

    wireChrome();

    loadContent()
      .then(function (list) {
        nodes = list;
        list.forEach(function (n) {
          byId[n.id] = n;
        });

        if (!nodes.length) {
          fail(
            "No nodes loaded. Check that content/nodes.json lists at least one file, and that you are viewing this through a web server (see HOW-TO-ADD-A-NODE.md)."
          );
          return;
        }

        graph = window.Graph.create({
          canvas: el.canvas,
          nodes: nodes,
          onSelect: handleNodeClick,
          onHover: function () {},
        });
        graph.init(nodes);

        buildSrNav();
        buildTextView();
        showWarnings();
        if (el.loading) el.loading.remove();

        window.addEventListener("resize", debounce(function () {
          graph.resize();
        }, 120));

        window.addEventListener("popstate", syncFromHash);
        window.addEventListener("hashchange", syncFromHash);
        syncFromHash();
      })
      .catch(function (err) {
        fail(
          "Could not load the site content. If you opened this file directly from your " +
            "computer, that's the cause — run `python3 -m http.server 8000` in the portfolio " +
            "folder and open http://localhost:8000 instead. (" + err.message + ")"
        );
      });
  });

  function fail(message) {
    if (el.loading) el.loading.remove();
    warnings.push(message);
    showWarnings();
  }

  /* ---------------- content loading ---------------- */

  function loadContent() {
    return fetchText(MANIFEST).then(function (raw) {
      var files = parseManifest(raw);
      return Promise.all(
        files.map(function (file) {
          var name = file.replace(/^\/+/, "");
          if (!/\.md$/i.test(name)) name += ".md";
          return fetchText(CONTENT_DIR + name)
            .then(function (text) {
              return { file: name, text: text };
            })
            .catch(function () {
              warnings.push(
                'Could not find "' + name + '". It is listed in content/nodes.json but the ' +
                  "file is missing from content/nodes/ — check the spelling."
              );
              return null;
            });
        })
      ).then(assemble);
    });
  }

  function parseManifest(raw) {
    // Allow // comments so the file can be annotated.
    var cleaned = raw
      .split("\n")
      .filter(function (line) {
        return line.trim().indexOf("//") !== 0;
      })
      .join("\n");

    var data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(
        "content/nodes.json is not valid JSON (" + e.message + "). A missing or extra comma is the usual cause."
      );
    }

    var list = Array.isArray(data) ? data : data.nodes;
    if (!Array.isArray(list)) {
      throw new Error('content/nodes.json must contain a "nodes" list of filenames.');
    }
    return list.filter(function (x) {
      return typeof x === "string" && x.trim();
    });
  }

  function assemble(loaded) {
    var out = [];
    var seen = Object.create(null);

    loaded.forEach(function (entry) {
      if (!entry) return;
      var id = entry.file.replace(/\.md$/i, "").replace(/^.*\//, "");
      var parsed = window.Markdown.parse(entry.text);
      var meta = parsed.meta;

      if (seen[id]) {
        warnings.push('Two nodes share the id "' + id + '" — the second one was skipped.');
        return;
      }
      seen[id] = true;

      if (meta.draft === "true") return;

      var node = {
        id: id,
        title: meta.title || id,
        parent: meta.parent || null,
        color: resolveColor(meta.color),
        tag: meta.tag || "",
        metric: meta.metric || "",
        metricLabel: meta["metric-label"] || "",
        size: meta.size || "",
        angle: meta.angle !== undefined ? parseFloat(meta.angle) : undefined,
        body: parsed.body,
        hasBody: parsed.body.length > 0,
      };
      out.push(node);

      // `leaves: A, B, C` is the shortcut for label-only nodes that don't
      // deserve a file of their own (individual skills, keywords).
      if (meta.leaves) {
        meta.leaves.split(",").forEach(function (label, i) {
          var text = label.trim();
          if (!text) return;
          out.push({
            id: id + "-leaf-" + i,
            title: text,
            parent: id,
            color: node.color,
            tag: "",
            metric: "",
            metricLabel: "",
            size: "sm",
            body: "",
            hasBody: false,
            isLeafLabel: true,
          });
        });
      }
    });

    // Validate parents once every node is known.
    var ids = Object.create(null);
    out.forEach(function (n) {
      ids[n.id] = true;
    });
    var roots = [];
    out.forEach(function (n) {
      if (!n.parent) {
        roots.push(n);
      } else if (!ids[n.parent]) {
        warnings.push(
          '"' + n.id + '.md" says parent: ' + n.parent + ', but there is no node called "' +
            n.parent + '". It has been attached to the center instead.'
        );
        n.parent = roots.length ? roots[0].id : null;
      }
    });

    if (roots.length === 0 && out.length) {
      warnings.push(
        "No center node found — one file must have no `parent:` line. Using \"" + out[0].id + '" as the center.'
      );
      out[0].parent = null;
    } else if (roots.length > 1) {
      warnings.push(
        "More than one file has no `parent:` line (" +
          roots.map(function (r) { return r.id; }).join(", ") +
          '). "' + roots[0].id + '" is the center; the rest were attached to it.'
      );
      roots.slice(1).forEach(function (r) {
        r.parent = roots[0].id;
      });
    }

    // A node with no `color:` takes its parent's, so a branch is one hue.
    var children = Object.create(null);
    out.forEach(function (n) {
      if (!n.parent) return;
      (children[n.parent] = children[n.parent] || []).push(n);
    });
    (function inherit(node) {
      if (!node.color) node.color = "#17171a";
      (children[node.id] || []).forEach(function (kid) {
        if (!kid.color) kid.color = node.color;
        inherit(kid);
      });
    })(roots[0] || out[0]);

    return out;
  }

  function resolveColor(value) {
    if (!value) return null;
    var key = value.trim().toLowerCase();
    if (COLORS[key]) return COLORS[key];
    if (/^#[0-9a-f]{3,6}$/i.test(key)) return key;
    warnings.push(
      'Unknown color "' + value + '". Use one of: ' + Object.keys(COLORS).join(", ") + "."
    );
    return null;
  }

  function fetchText(url) {
    return fetch(url, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(url + " → HTTP " + res.status);
      return res.text();
    });
  }

  /* ---------------- routing ---------------- */

  function hashId() {
    var m = location.hash.match(/^#\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function syncFromHash() {
    var id = hashId();
    if (id === currentOpen) return;
    if (id && byId[id] && byId[id].hasBody) {
      openNode(id);
    } else {
      closeModal(false);
      if (id && byId[id]) graph.flyTo(id);
    }
  }

  function navigate(id) {
    var target = id ? "#/" + encodeURIComponent(id) : location.pathname + location.search;
    if (location.hash === (id ? "#/" + encodeURIComponent(id) : "")) return;
    history.pushState(null, "", target);
    syncFromHash();
  }

  function handleNodeClick(node) {
    if (node.hasBody) {
      navigate(node.id);
    } else {
      graph.select(node.id);
      graph.flyTo(node.id);
    }
  }

  /* ---------------- modal ---------------- */

  function openNode(id) {
    var node = byId[id];
    if (!node) return;
    currentOpen = id;
    graph.select(id);

    // Pan the node to the middle of the screen first, then pop the panel over it.
    graph.flyTo(id, function () {
      renderModal(node);
    });
    // Safety net: requestAnimationFrame is throttled in background tabs, so the
    // fly-to callback may never arrive. renderModal is idempotent.
    setTimeout(function () {
      renderModal(node);
    }, 600);
  }

  function renderModal(node) {
    if (currentOpen !== node.id) return;
    if (el.backdrop.getAttribute("data-open") === "true" && el.modal.dataset.node === node.id) {
      return;
    }

    lastFocused = document.activeElement;
    el.modal.dataset.node = node.id;
    el.modal.style.setProperty("--accent", node.color || "#17171a");

    var html = "";
    if (node.tag) html += '<p class="modal-tag">' + escapeHtml(node.tag) + "</p>";
    html += '<h1 class="modal-title" id="modal-title">' + escapeHtml(node.title) + "</h1>";
    if (node.metric) {
      html +=
        '<div class="modal-metric"><span class="modal-metric-value">' +
        escapeHtml(node.metric) + "</span>" +
        (node.metricLabel
          ? '<span class="modal-metric-label">' + escapeHtml(node.metricLabel) + "</span>"
          : "") +
        "</div>";
    }
    html += '<div class="prose">' + window.Markdown.render(node.body) + "</div>";

    var related = nodes.filter(function (n) {
      return n.parent === node.id && n.hasBody;
    });
    if (related.length) {
      html +=
        '<nav class="modal-related"><h2>Inside this branch</h2><ul>' +
        related
          .map(function (r) {
            return '<li><a href="#/' + encodeURIComponent(r.id) + '">' + escapeHtml(r.title) + "</a></li>";
          })
          .join("") +
        "</ul></nav>";
    }

    el.modalBody.innerHTML = html;
    el.modalBody.scrollTop = 0;
    el.backdrop.setAttribute("data-open", "true");
    el.backdrop.removeAttribute("hidden");
    document.body.classList.add("modal-open");
    el.closeBtn.focus();
  }

  function closeModal(updateHash) {
    if (el.backdrop.getAttribute("data-open") !== "true" && currentOpen === null) return;
    currentOpen = null;
    el.backdrop.setAttribute("data-open", "false");
    el.backdrop.setAttribute("hidden", "");
    el.modal.dataset.node = "";
    document.body.classList.remove("modal-open");
    if (graph) graph.select(null);
    if (updateHash !== false) navigate(null);
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  /* ---------------- chrome: controls, search, text view ---------------- */

  function wireChrome() {
    el.closeBtn.addEventListener("click", function () {
      closeModal();
    });

    el.backdrop.addEventListener("mousedown", function (e) {
      if (e.target === el.backdrop) closeModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (el.textView.getAttribute("data-open") === "true") {
          toggleTextView(false);
        } else if (currentOpen) {
          closeModal();
        } else if (document.activeElement === el.search) {
          el.search.value = "";
          renderResults([]);
          el.search.blur();
        }
        return;
      }
      // "/" jumps to search, the way most map/search UIs behave.
      if (e.key === "/" && document.activeElement !== el.search && !currentOpen) {
        e.preventDefault();
        el.search.focus();
      }
      if (e.key === "Tab" && currentOpen) trapFocus(e);
    });

    document.getElementById("zoom-in").addEventListener("click", function () {
      graph && graph.zoomBy(1.3);
    });
    document.getElementById("zoom-out").addEventListener("click", function () {
      graph && graph.zoomBy(1 / 1.3);
    });
    document.getElementById("zoom-reset").addEventListener("click", function () {
      if (!graph) return;
      graph.select(null);
      graph.reset();
    });

    document.getElementById("text-toggle").addEventListener("click", function () {
      toggleTextView(el.textView.getAttribute("data-open") !== "true");
    });
    document.getElementById("text-view-close").addEventListener("click", function () {
      toggleTextView(false);
    });

    el.search.addEventListener("input", function () {
      renderResults(searchNodes(el.search.value));
    });
    el.search.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var first = el.results.querySelector("button");
        if (first) first.click();
      }
    });
    document.addEventListener("click", function (e) {
      if (!el.results.contains(e.target) && e.target !== el.search) renderResults([]);
    });

    // Dismiss the "drag to explore" hint the first time the user does anything.
    ["pointerdown", "wheel", "keydown"].forEach(function (evt) {
      window.addEventListener(evt, function once() {
        if (el.hint) el.hint.setAttribute("data-hidden", "true");
        window.removeEventListener(evt, once);
      });
    });
  }

  function trapFocus(e) {
    var focusables = el.modal.querySelectorAll(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function searchNodes(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter(function (n) {
        return n.title.toLowerCase().indexOf(q) !== -1;
      })
      .slice(0, 8);
  }

  function renderResults(list) {
    if (!list.length) {
      el.results.innerHTML = "";
      el.results.setAttribute("hidden", "");
      return;
    }
    el.results.innerHTML = list
      .map(function (n) {
        return (
          '<li><button type="button" data-id="' + escapeHtml(n.id) + '">' +
          '<span class="dot" style="background:' + (n.color || "#17171a") + '"></span>' +
          escapeHtml(n.title) +
          (n.hasBody ? "" : '<span class="result-note">label</span>') +
          "</button></li>"
        );
      })
      .join("");
    el.results.removeAttribute("hidden");
    Array.prototype.forEach.call(el.results.querySelectorAll("button"), function (btn) {
      btn.addEventListener("click", function () {
        var node = byId[btn.dataset.id];
        el.search.value = "";
        renderResults([]);
        el.search.blur();
        if (node.hasBody) navigate(node.id);
        else {
          graph.select(node.id);
          graph.flyTo(node.id);
        }
      });
    });
  }

  function buildSrNav() {
    el.srNav.innerHTML =
      "<h2>All sections</h2><ul>" +
      nodes
        .filter(function (n) {
          return n.hasBody;
        })
        .map(function (n) {
          return '<li><a href="#/' + encodeURIComponent(n.id) + '">' + escapeHtml(n.title) + "</a></li>";
        })
        .join("") +
      "</ul>";
  }

  function buildTextView() {
    var order = [];
    var root = nodes.filter(function (n) {
      return !n.parent;
    })[0];
    (function walk(node) {
      if (!node) return;
      order.push(node);
      nodes
        .filter(function (n) {
          return n.parent === node.id;
        })
        .forEach(walk);
    })(root);

    el.textBody.innerHTML = order
      .filter(function (n) {
        return n.hasBody;
      })
      .map(function (n) {
        return (
          '<section class="text-section" id="text-' + escapeHtml(n.id) + '">' +
          (n.tag ? '<p class="modal-tag">' + escapeHtml(n.tag) + "</p>" : "") +
          "<h2>" + escapeHtml(n.title) + "</h2>" +
          (n.metric
            ? '<p class="text-metric"><strong>' + escapeHtml(n.metric) + "</strong> " +
              escapeHtml(n.metricLabel) + "</p>"
            : "") +
          '<div class="prose">' + window.Markdown.render(n.body) + "</div>" +
          "</section>"
        );
      })
      .join("");
  }

  function toggleTextView(open) {
    el.textView.setAttribute("data-open", open ? "true" : "false");
    if (open) {
      el.textView.removeAttribute("hidden");
      document.body.classList.add("modal-open");
      el.textView.scrollTop = 0;
      document.getElementById("text-view-close").focus();
    } else {
      el.textView.setAttribute("hidden", "");
      if (!currentOpen) document.body.classList.remove("modal-open");
    }
  }

  function showWarnings() {
    if (!warnings.length) {
      el.warnings.setAttribute("hidden", "");
      return;
    }
    el.warnings.innerHTML =
      '<button type="button" class="warn-close" aria-label="Dismiss">×</button>' +
      "<strong>Content problem" + (warnings.length > 1 ? "s" : "") + "</strong><ul>" +
      warnings
        .map(function (w) {
          return "<li>" + escapeHtml(w) + "</li>";
        })
        .join("") +
      "</ul>";
    el.warnings.removeAttribute("hidden");
    el.warnings.querySelector(".warn-close").addEventListener("click", function () {
      el.warnings.setAttribute("hidden", "");
    });
    if (window.console) console.warn("[portfolio] content warnings:", warnings);
  }

  /* ---------------- utils ---------------- */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }
})();

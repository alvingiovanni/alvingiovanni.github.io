/**
 * graph.js — the canvas engine.
 *
 * Owns: radial layout, the pan/zoom camera, rendering, hit-testing, and the
 * fly-to animation. Knows nothing about markdown, modals, or routing.
 *
 * Usage:
 *   const graph = Graph.create({ canvas, nodes, onSelect, onHover });
 *   graph.flyTo("segmentation", () => openPanel());
 *
 * `nodes` is a flat array of { id, title, parent, color, hasBody }.
 * The one node without a `parent` becomes the center.
 */
window.Graph = (function () {
  var TAU = Math.PI * 2;
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Layout constants. Ring radius by depth, and the minimum arc length we
  // insist on between two siblings (a branch pushes further out rather than
  // letting its children collide).
  var RING = [0, 300, 570, 780, 980];
  var SPACING = [0, 260, 190, 104, 78];
  var MIN_STEP = 170;

  // The map is laid out as a squashed circle whose proportions follow the
  // viewport: flattened on a landscape screen, stretched tall on a phone, so it
  // fills the space instead of leaving big gutters. Set by squashFor().
  var Y_SQUASH = 0.85;

  function squashFor(vw, vh) {
    if (vw >= 700) return 0.85;                  // desktop: the tuned default
    return clamp((vh / vw) * 0.9, 0.85, 1.7);    // portrait: grow downward
  }

  // Canvas 2D can't read CSS custom properties, so the font stack is spelled out.
  var FONT = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  var ZOOM_MIN = 0.15;
  var ZOOM_MAX = 3;

  function ringAt(d) {
    return d < RING.length ? RING[d] : RING[RING.length - 1] + (d - RING.length + 1) * 220;
  }
  function spacingAt(d) {
    return d < SPACING.length ? SPACING[d] : SPACING[SPACING.length - 1];
  }

  /* ---------------- tree + layout ---------------- */

  // Weight drives how wide a branch's wedge is. A leaf counts for more when its
  // label is long, because it's label width — not node count — that collides.
  function weigh(node) {
    if (!node.children.length) {
      node.weight = clamp(String(node.title || "").length / 14, 1, 2.6);
      return node.weight;
    }
    var sum = 0;
    for (var i = 0; i < node.children.length; i++) sum += weigh(node.children[i]);
    node.weight = sum;
    return sum;
  }

  function place(node, a0, a1) {
    var kids = node.children;
    if (!kids.length) return;

    var span = a1 - a0;
    var n = kids.length;
    var total = 0;
    for (var i = 0; i < n; i++) total += kids[i].weight;

    // Blend "everyone gets an equal slice" with "big branches get more room".
    // Pure proportional lets one huge branch squash all the others.
    var fracs = kids.map(function (k) {
      return 0.4 * (1 / n) + 0.6 * (k.weight / total);
    });

    // Push the ring out if the wedge is too narrow to seat every child.
    var depth = node.depth + 1;
    var needed = span > 0 ? (n * spacingAt(depth)) / span : ringAt(depth);
    var radius = Math.max(ringAt(depth), needed, node.radiusFromCenter + MIN_STEP);

    var cursor = a0;
    for (var j = 0; j < n; j++) {
      var kid = kids[j];
      var w = fracs[j] * span;
      var mid = cursor + w / 2;

      // `angle:` in a node's file overrides where its branch points.
      // 0° = straight up, then clockwise.
      if (typeof kid.angleOverride === "number") {
        mid = (kid.angleOverride - 90) * (Math.PI / 180);
      }

      kid.angle = mid;
      kid.sibIndex = j;
      kid.sibCount = n;
      kid.radiusFromCenter = radius;
      kid.bx = Math.cos(mid) * radius;
      kid.by = Math.sin(mid) * radius * Y_SQUASH;

      place(kid, mid - w / 2, mid + w / 2);
      cursor += w;
    }
  }

  function nodeRadius(node) {
    if (node.depth === 0) return 70;
    if (node.depth === 1) return 52;
    if (node.size === "lg") return 24;
    if (node.size === "sm") return 6;
    return node.hasBody ? 16 : 6;
  }

  /* ---------------- helpers ---------------- */

  function hexToRgba(hex, alpha) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /* ---------------- engine ---------------- */

  function create(opts) {
    var canvas = opts.canvas;
    var ctx = canvas.getContext("2d");
    var onSelect = opts.onSelect || function () {};
    var onHover = opts.onHover || function () {};

    var byId = Object.create(null);
    var all = [];
    var root = null;

    var cam = { x: 0, y: 0, zoom: 1 };
    var fit = { x: 0, y: 0, zoom: 1 };
    var vw = 0,
      vh = 0,
      dpr = 1;

    var hovered = null;
    var selected = null;
    var focusRing = null; // keyboard focus, drawn differently from mouse hover
    var flight = null;
    var t0 = performance.now();

    /* ----- build ----- */

    function build(nodes) {
      byId = Object.create(null);
      all = [];
      root = null;

      nodes.forEach(function (n) {
        var node = {
          id: n.id,
          title: n.title,
          parentId: n.parent || null,
          color: n.color,
          hasBody: !!n.hasBody,
          size: n.size,
          angleOverride: typeof n.angle === "number" ? n.angle : undefined,
          children: [],
          parent: null,
          depth: 0,
          bx: 0,
          by: 0,
          radiusFromCenter: 0,
          phase: 0,
        };
        byId[node.id] = node;
        all.push(node);
      });

      all.forEach(function (node) {
        if (node.parentId && byId[node.parentId]) {
          node.parent = byId[node.parentId];
          node.parent.children.push(node);
        } else if (!node.parentId) {
          root = root || node;
        }
      });

      if (!root) root = all[0];

      // Depth, inherited color, and a stable float phase (hashed from the id so
      // the animation looks identical on every load).
      (function walk(node, depth) {
        node.depth = depth;
        if (!node.color && node.parent) node.color = node.parent.color;
        if (!node.color) node.color = "#17171a";
        var h = 0;
        for (var i = 0; i < node.id.length; i++) h = (h * 31 + node.id.charCodeAt(i)) % 1000;
        node.phase = (h / 1000) * TAU;
        node.r = 0;
        node.children.forEach(function (c) {
          walk(c, depth + 1);
        });
      })(root, 0);

      // Anything orphaned (bad `parent:`) still gets drawn, hanging off center.
      all.forEach(function (node) {
        if (node !== root && !node.parent) {
          node.parent = root;
          root.children.push(node);
          node.depth = 1;
          if (!node.color) node.color = "#17171a";
        }
      });

      weigh(root);
      all.forEach(function (node) {
        node.r = nodeRadius(node);
      });
      applyLayout();
    }

    // Positions depend on the viewport shape, so this re-runs on resize.
    function applyLayout() {
      if (!root) return;
      Y_SQUASH = squashFor(vw || window.innerWidth, vh || window.innerHeight);
      root.bx = 0;
      root.by = 0;
      root.angle = 0;
      root.radiusFromCenter = 0;
      place(root, -Math.PI / 2, -Math.PI / 2 + TAU);
    }

    /* ----- camera ----- */

    function resize() {
      vw = canvas.clientWidth;
      vh = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (Math.abs(squashFor(vw, vh) - Y_SQUASH) > 0.02) applyLayout();
      computeFit();
    }

    // Bounding box of the map at a given zoom. Labels are drawn at a roughly
    // constant *screen* size, so how much world space they occupy depends on
    // the zoom — hence the parameter.
    function boundsAtZoom(z, labelWeight) {
      var minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      function include(x, y, padX, padY) {
        minX = Math.min(minX, x - padX);
        maxX = Math.max(maxX, x + padX);
        minY = Math.min(minY, y - padY);
        maxY = Math.max(maxY, y + padY);
      }

      all.forEach(function (n) {
        include(n.bx, n.by, n.r + 10, n.r + 10);
        if (n.depth < 2) return; // labels sit inside the circle up here

        // Mirrors the label placement in draw(): outer labels run sideways,
        // except near the poles where they stack above/below the dot.
        var cos = Math.cos(n.angle);
        var sin = Math.sin(n.angle);
        var wide = ((n.hasBody ? 118 : 98) / z) * labelWeight; // sideways reach
        var tall = (52 / z) * labelWeight;                     // stacked reach
        var base = n.r + 12;

        if (Math.abs(sin) > 0.8) {
          include(n.bx + cos * base, n.by + sin * (base + tall), wide / 2, 10 / z);
        } else {
          include(n.bx + cos * (base + wide), n.by + sin * base, 8 / z, 26 / z);
        }
      });

      return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
    }

    function computeFit() {
      if (!all.length) return;

      // Leave room for the top bar and the zoom controls so the map isn't
      // tucked underneath them.
      var sidePad = vw < 700 ? 14 : 44;
      var topPad = 76;
      var bottomPad = 68;
      var availW = Math.max(120, vw - sidePad * 2);
      var availH = Math.max(120, vh - topPad - bottomPad);

      // On a phone there is no zoom at which 40-odd labels both fit and stay
      // readable, so reserve only part of the label space: the structure fills
      // the screen and the outermost labels clip until you pan or pinch.
      var labelWeight = vw < 700 ? 0.4 : 1;

      // Zoom and label footprint depend on each other, so solve by iteration —
      // it settles within a few passes.
      var z = 0.5;
      var b = boundsAtZoom(z, labelWeight);
      for (var i = 0; i < 6; i++) {
        b = boundsAtZoom(z, labelWeight);
        var next = clamp(
          Math.min(availW / (b.maxX - b.minX), availH / (b.maxY - b.minY)),
          ZOOM_MIN,
          1.1
        );
        if (Math.abs(next - z) < 0.004) {
          z = next;
          break;
        }
        z = next;
      }
      b = boundsAtZoom(z, labelWeight);

      // Centre the map inside that free area rather than the whole viewport.
      var freeCenterY = topPad + availH / 2;
      fit = {
        x: (b.minX + b.maxX) / 2,
        y: (b.minY + b.maxY) / 2 - (freeCenterY - vh / 2) / z,
        zoom: z,
      };
    }

    function toScreen(wx, wy) {
      return {
        x: (wx - cam.x) * cam.zoom + vw / 2,
        y: (wy - cam.y) * cam.zoom + vh / 2,
      };
    }

    function toWorld(sx, sy) {
      return {
        x: (sx - vw / 2) / cam.zoom + cam.x,
        y: (sy - vh / 2) / cam.zoom + cam.y,
      };
    }

    function zoomAt(sx, sy, factor) {
      var before = toWorld(sx, sy);
      cam.zoom = clamp(cam.zoom * factor, ZOOM_MIN, ZOOM_MAX);
      var after = toWorld(sx, sy);
      cam.x += before.x - after.x;
      cam.y += before.y - after.y;
    }

    /* ----- live positions (layout + float) ----- */

    function livePos(node, time) {
      if (reduceMotion || node.depth === 0) return { x: node.bx, y: node.by };
      var amp = node.depth === 1 ? 5 : 8;
      var speed = node.depth === 1 ? 0.32 : 0.45;
      return {
        x: node.bx + Math.sin(time * speed + node.phase) * amp,
        y: node.by + Math.cos(time * speed * 0.8 + node.phase) * amp,
      };
    }

    /* ----- drawing ----- */

    function drawGrid() {
      var step = 26 * cam.zoom;
      if (step < 9) return;
      var originX = vw / 2 - cam.x * cam.zoom;
      var originY = vh / 2 - cam.y * cam.zoom;
      var startX = originX - Math.ceil(originX / step) * step;
      var startY = originY - Math.ceil(originY / step) * step;
      ctx.fillStyle = "rgba(120,120,132,0.28)";
      var rad = cam.zoom > 1.4 ? 1.4 : 1;
      for (var x = startX; x < vw + step; x += step) {
        for (var y = startY; y < vh + step; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, TAU);
          ctx.fill();
        }
      }
    }

    function labelScale() {
      // Partially compensate for zoom so labels never shrink into noise.
      return clamp(cam.zoom, 0.72, 1.12);
    }

    function wrapLines(text, maxWidth) {
      var words = String(text).split(" ");
      var lines = [];
      var line = "";
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + " " + words[i] : words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = words[i];
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines.slice(0, 3);
    }

    function draw(now) {
      var time = (now - t0) / 1000;
      ctx.clearRect(0, 0, vw, vh);
      drawGrid();

      var pos = new Map();
      all.forEach(function (n) {
        var p = livePos(n, time);
        pos.set(n, toScreen(p.x, p.y));
        n._screen = pos.get(n);
      });

      var active = hovered || selected || focusRing;
      var activeSet = null;
      if (active) {
        activeSet = new Set([active]);
        if (active.parent) activeSet.add(active.parent);
        active.children.forEach(function (c) {
          activeSet.add(c);
        });
      }

      // Edges first, so nodes sit on top of them.
      all.forEach(function (n) {
        if (!n.parent) return;
        var a = pos.get(n.parent);
        var b = pos.get(n);
        var lit = activeSet && activeSet.has(n) && activeSet.has(n.parent);
        ctx.strokeStyle = lit
          ? hexToRgba(n.color, 0.75)
          : activeSet
          ? hexToRgba(n.color, 0.14)
          : hexToRgba(n.color, 0.32);
        ctx.lineWidth = (lit ? 2 : 1.1) * clamp(cam.zoom, 0.7, 1.4);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      var ls = labelScale();

      all.forEach(function (n) {
        var p = pos.get(n);
        var r = n.r * cam.zoom;
        var isActive = n === hovered || n === selected || n === focusRing;
        var dim = activeSet && !activeSet.has(n);

        ctx.globalAlpha = dim ? 0.42 : 1;

        // Selection / hover halo.
        if (isActive) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 9 * clamp(cam.zoom, 0.7, 1.3), 0, TAU);
          ctx.fillStyle = hexToRgba(n.color, 0.16);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);

        if (n.depth <= 1) {
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.lineWidth = (n.depth === 0 ? 2.6 : 2) * clamp(cam.zoom, 0.6, 1.5);
          ctx.strokeStyle = n.depth === 0 ? "#17171a" : n.color;
          ctx.stroke();
        } else if (n.hasBody) {
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.lineWidth = 2.2 * clamp(cam.zoom, 0.6, 1.5);
          ctx.strokeStyle = n.color;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(2, r * 0.34), 0, TAU);
          ctx.fillStyle = n.color;
          ctx.fill();
        } else {
          ctx.fillStyle = n.color;
          ctx.fill();
        }

        // Labels: inside the circle for the center and the main branches,
        // outside and pointing away from center for everything else.
        ctx.fillStyle = "#17171a";
        ctx.textBaseline = "middle";

        if (n.depth === 0) {
          ctx.font = "700 " + 17 * ls + "px " + FONT;
          ctx.textAlign = "center";
          drawLines(wrapLines(n.title, 112 * cam.zoom), p.x, p.y, 19 * ls);
        } else if (n.depth === 1) {
          ctx.font = "600 " + 15 * ls + "px " + FONT;
          ctx.textAlign = "center";
          drawLines(wrapLines(n.title, 84 * cam.zoom), p.x, p.y, 17 * ls);
        } else {
          var deep = n.depth >= 3;
          if (deep && cam.zoom < 0.32) {
            ctx.globalAlpha = 1;
            return;
          }
          ctx.font =
            (n.hasBody ? "600 " : "500 ") + (n.hasBody ? 14.5 : 13) * ls + "px " + FONT;

          var sinA = Math.sin(n.angle);
          var lh = 16 * ls;

          if (Math.abs(sinA) > 0.8) {
            // Near the top and bottom of the map, siblings fan out sideways, so
            // side-anchored labels would sit at the same height and collide.
            // Stack these above/below the dot instead.
            ctx.textAlign = "center";
            var vLines = wrapLines(n.title, 118 * ls);
            var block = (vLines.length - 1) * lh;
            // Alternate siblings sit further out, so a row of them doesn't
            // pile up on one line.
            var stagger = n.sibCount > 2 ? (n.sibIndex % 2) * lh * 2 : 0;
            var offset = r + 12 * ls + lh / 2 + stagger;
            var ly = sinA < 0 ? p.y - offset - block / 2 : p.y + offset + block / 2;
            drawLines(vLines, p.x, ly, lh);
          } else {
            var out = Math.cos(n.angle) >= 0 ? 1 : -1;
            ctx.textAlign = out === 1 ? "left" : "right";
            drawLines(wrapLines(n.title, 190 * ls), p.x + out * (r + 10 * ls), p.y, lh);
          }
        }

        ctx.globalAlpha = 1;
      });
    }

    function drawLines(lines, x, y, lineHeight) {
      var startY = y - ((lines.length - 1) * lineHeight) / 2;
      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, startY + i * lineHeight);
      }
    }

    /* ----- hit testing ----- */

    function nodeAt(sx, sy) {
      // Reverse order so the visually-topmost node wins.
      for (var i = all.length - 1; i >= 0; i--) {
        var n = all[i];
        var p = n._screen;
        if (!p) continue;
        var dx = sx - p.x;
        var dy = sy - p.y;
        var hit = n.r * cam.zoom + 10;
        if (dx * dx + dy * dy <= hit * hit) return n;
      }
      return null;
    }

    /* ----- animation loop ----- */

    var running = false;
    function frame(now) {
      if (flight) stepFlight(now);
      draw(now);
      if (running) requestAnimationFrame(frame);
    }

    function stepFlight(now) {
      var t = clamp((now - flight.start) / flight.dur, 0, 1);
      var e = easeInOutCubic(t);
      cam.x = flight.from.x + (flight.to.x - flight.from.x) * e;
      cam.y = flight.from.y + (flight.to.y - flight.from.y) * e;
      cam.zoom = flight.from.zoom + (flight.to.zoom - flight.from.zoom) * e;
      if (t >= 1) {
        var done = flight.done;
        flight = null;
        if (done) done();
      }
    }

    function animateTo(target, done) {
      if (reduceMotion) {
        cam.x = target.x;
        cam.y = target.y;
        cam.zoom = target.zoom;
        if (done) done();
        return;
      }
      flight = {
        from: { x: cam.x, y: cam.y, zoom: cam.zoom },
        to: target,
        start: performance.now(),
        dur: 520,
        done: done,
      };
    }

    /* ----- input ----- */

    var pointers = new Map();
    var dragging = false;
    var moved = 0;
    var last = null;
    var pinchDist = 0;

    canvas.addEventListener("pointerdown", function (e) {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        dragging = true;
        moved = 0;
        last = { x: e.clientX, y: e.clientY };
        flight = null;
      } else if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    });

    canvas.addEventListener("pointermove", function (e) {
      var rect = canvas.getBoundingClientRect();

      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchDist > 0) {
          var midX = (pts[0].x + pts[1].x) / 2 - rect.left;
          var midY = (pts[0].y + pts[1].y) / 2 - rect.top;
          zoomAt(midX, midY, d / pinchDist);
        }
        pinchDist = d;
        moved = 999;
        return;
      }

      if (dragging && last) {
        var dx = e.clientX - last.x;
        var dy = e.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        cam.x -= dx / cam.zoom;
        cam.y -= dy / cam.zoom;
        last = { x: e.clientX, y: e.clientY };
        return;
      }

      if (e.pointerType === "mouse") {
        var found = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
        if (found !== hovered) {
          hovered = found;
          onHover(found);
        }
        canvas.style.cursor = found ? (found.hasBody ? "pointer" : "default") : "grab";
      }
    });

    function endPointer(e) {
      var rect = canvas.getBoundingClientRect();
      var wasDragging = dragging;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) {
        dragging = false;
        last = null;
        // A short pointer travel means "click", not "pan".
        if (wasDragging && moved < 6) {
          var found = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
          if (found) onSelect(found);
        }
      }
    }

    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", function (e) {
      pointers.delete(e.pointerId);
      dragging = false;
      last = null;
    });

    canvas.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var sx = e.clientX - rect.left;
        var sy = e.clientY - rect.top;
        // Trackpad pinch arrives as ctrlKey+wheel; make it noticeably stronger.
        var intensity = e.ctrlKey ? 0.012 : 0.0022;
        zoomAt(sx, sy, Math.exp(-e.deltaY * intensity));
      },
      { passive: false }
    );

    canvas.addEventListener("mouseleave", function () {
      hovered = null;
      onHover(null);
    });

    /* ----- public api ----- */

    var api = {
      init: function (nodes) {
        build(nodes);
        resize();
        cam = { x: fit.x, y: fit.y, zoom: fit.zoom };
        running = true;
        requestAnimationFrame(frame);
      },
      resize: function () {
        var wasFit =
          Math.abs(cam.zoom - fit.zoom) < 0.001 &&
          Math.abs(cam.x - fit.x) < 1 &&
          Math.abs(cam.y - fit.y) < 1;
        resize();
        if (wasFit) cam = { x: fit.x, y: fit.y, zoom: fit.zoom };
      },
      get: function (id) {
        return byId[id] || null;
      },
      nodes: function () {
        return all;
      },
      flyTo: function (id, done) {
        var n = byId[id];
        if (!n) {
          if (done) done();
          return;
        }
        animateTo(
          { x: n.bx, y: n.by, zoom: clamp(Math.max(cam.zoom, 0.95), ZOOM_MIN, 1.6) },
          done
        );
      },
      select: function (id) {
        selected = id ? byId[id] || null : null;
      },
      focus: function (id) {
        focusRing = id ? byId[id] || null : null;
      },
      reset: function (done) {
        animateTo({ x: fit.x, y: fit.y, zoom: fit.zoom }, done);
      },
      zoomBy: function (factor) {
        flight = null;
        zoomAt(vw / 2, vh / 2, factor);
      },
      reduceMotion: reduceMotion,
    };

    return api;
  }

  return { create: create, hexToRgba: hexToRgba };
})();

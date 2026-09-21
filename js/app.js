(function () {
  "use strict";

  var S = FamiliarStore;
  var C = FamiliarConst;
  var W = FamiliarWizard;
  var view = "agregar";
  var filters = { tipo: "todos", persona: "todos", categoria: "todas", q: "" };
  var toastTimer = null;
  var pendingSub = null;

  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function money(n) { return S.fmtMoney(n); }

  function fmtFecha(iso) {
    var p = String(iso).split("-");
    if (p.length < 3) return iso;
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add("hidden"); }, 2600);
  }

  function overlay(html, center) {
    var el = $("overlay");
    el.className = "overlay" + (center ? " center" : "");
    el.innerHTML = html;
    el.classList.remove("hidden");
  }

  function closeOverlay() {
    $("overlay").classList.add("hidden");
    $("overlay").innerHTML = "";
  }

  function confirmBox(title, text, okLabel, onOk) {
    overlay(
      '<div class="confirm-box"><h3>' + esc(title) + "</h3>" +
      '<p class="sub" style="margin:8px 0 16px">' + esc(text) + "</p>" +
      '<div class="btn-row"><button type="button" class="btn ghost" data-close>Cancelar</button>' +
      '<button type="button" class="btn primary" id="confirm-ok">' + esc(okLabel || "Sí") + "</button></div></div>",
      true
    );
    $("confirm-ok").onclick = function () { closeOverlay(); onOk(); };
  }

  function mesCerrado() {
    return !!(S.mesActual() && S.mesActual().cerrado);
  }

  function renderSetup() {
    if (!$("setup-list").children.length) {
      ["", "", ""].forEach(function (n, i) { addSetupRow(n, i < 3); });
    }
  }

  function addSetupRow(value, required) {
    var row = document.createElement("div");
    row.className = "setup-row";
    row.innerHTML = '<input type="text" maxlength="24" placeholder="Nombre" value="' + esc(value) + '" ' + (required ? "required" : "") + " />" +
      (required ? "" : '<button type="button" class="icon-btn" data-remove-row aria-label="Quitar">×</button>');
    $("setup-list").appendChild(row);
  }

  function finishSetup() {
    var names = qsa("#setup-list input").map(function (i) { return i.value.trim(); }).filter(Boolean);
    var err = $("setup-error");
    if (names.length < 3) { err.textContent = "Agrega al menos 3 personas."; err.classList.remove("hidden"); return; }
    if (new Set(names.map(function (n) { return n.toLowerCase(); })).size !== names.length) {
      err.textContent = "Los nombres no pueden repetirse."; err.classList.remove("hidden"); return;
    }
    S.completarSetup(names);
    showApp();
  }

  function showApp() {
    $("setup").classList.add("hidden");
    $("app").classList.remove("hidden");
    W.init();
    W.start({ yo: S.data.ultimoYo });
    renderAll();
  }

  function renderAll() {
    var parts = S.data.mesSeleccionado.split("-");
    $("month-btn").textContent = C.MESES_NOMBRE[Number(parts[1]) - 1].slice(0, 3) + " " + parts[0] + " ▾";
    $("closed-flag").classList.toggle("hidden", !mesCerrado());
    $("app").classList.toggle("wide", view === "analisis");
    qsa(".nav button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-tab") === view);
    });
    qsa(".view").forEach(function (v) { v.classList.remove("active"); });
    $("view-" + view).classList.add("active");
    if (view === "agregar") renderWizard();
    if (view === "mensuales") renderMensuales();
    if (view === "historial") renderHistorial();
    if (view === "analisis") renderAnalisis();
    if (view === "config") renderConfig();
  }

  /* ---------- wizard ---------- */
  function renderWizard() {
    var root = $("wizard-root");
    if (mesCerrado()) {
      root.innerHTML = '<div class="empty">Este mes está cerrado. Ábrelo en Ajustes o cambia de mes.</div>';
      return;
    }
    var step = W.step();
    var d = W.draft;
    var html = "";
    if (window.FamiliarPWA && FamiliarPWA.canInstall()) {
      html += '<div class="install-banner" id="install-banner"><p class="sub"><strong>Instálala en el celular</strong> para abrirla desde el inicio y decir “Ok Google, abre Familia”.</p>' +
        '<button type="button" class="btn primary" id="install-btn">Instalar app</button></div>';
    }
    html += '<div class="wiz-top">';
    if (W.canBack()) html += '<button type="button" class="linkish" id="wiz-back">← Atrás</button>';
    else html += "<span></span>";
    if (d.yo) html += '<button type="button" class="linkish" id="wiz-who">No soy ' + esc(S.nombre(d.yo)) + "</button>";
    html += "</div>";

    if (d.yo) {
      var cash = S.efectivoEnMano(d.yo);
      var bolsas = S.bolsasDe(d.yo, true);
      html += '<div class="cash-line"><strong>' + esc(S.nombre(d.yo)) + "</strong> tiene " + money(cash) + " en efectivo";
      if (bolsas.length) {
        html += '<div class="sub">' + bolsas.map(function (b) { return S.etiquetaBolsa(b); }).join("<br>") + "</div>";
      }
      html += "</div>";
    }

    var recs = S.recordatorios().filter(function (r) { return r.estado === "hoy" || r.estado === "atrasado" || r.estado === "proximo"; });
    if (recs.length && step.id === "accion") {
      html += '<div class="card" style="margin-top:8px">';
      recs.forEach(function (r) {
        html += '<div class="remind-mini"><span>' + esc(r.gm.nombre) + " · día " + r.dia + '</span><span class="st ' + r.estado + '">' + labelEstado(r.estado) + "</span></div>";
      });
      html += "</div>";
    }

    html += '<div class="q"><h2>' + esc(step.question) + "</h2>";
    if (step.hint) html += '<p class="sub">' + esc(step.hint) + "</p>";
    html += "</div>";

    if (step.type === "choices") {
      html += '<div class="choices">';
      (step.choices || []).forEach(function (c) {
        html += '<button type="button" class="choice" data-choice="' + esc(c.id) + '"><strong>' + esc(c.label) + "</strong>" +
          (c.sub ? "<span>" + esc(c.sub) + "</span>" : "") + "</button>";
      });
      html += "</div>";
    }

    if (step.type === "amount") {
      html += '<form class="form amount-box" id="amt-form" style="margin-top:16px">' +
        '<input name="monto" type="number" inputmode="decimal" min="0.01" step="0.01" required placeholder="0.00" value="' + (d.monto || "") + '" />' +
        '<button class="btn primary" type="submit">Continuar</button></form>';
    }

    if (step.type === "desglose") {
      html += '<div class="card" style="margin-top:12px">';
      d.desglose.forEach(function (x, i) {
        html += '<div class="debt-row"><span>' + esc(x.subcategoria) + "</span><strong>" + money(x.monto) + "</strong></div>";
      });
      html += "</div>";
      if (pendingSub) {
        html += '<p class="sub" style="margin-top:10px">¿Cuánto en ' + esc(pendingSub) + "?</p>";
        html += '<form class="form amount-box" id="des-form">' +
          '<input name="monto" type="number" inputmode="decimal" min="0.01" step="0.01" required placeholder="0.00" />' +
          '<button class="btn primary" type="submit">Anotar esta parte</button>' +
          '<button class="btn ghost" type="button" id="des-rest">Todo el resto (' + money(step.resto) + ")</button></form>";
      } else {
        html += '<div class="choices">';
        step.choices.forEach(function (c) {
          html += '<button type="button" class="choice" data-sub="' + esc(c.id) + '"><strong>' + esc(c.label) + "</strong></button>";
        });
        html += "</div>";
      }
    }

    if (step.type === "confirm") {
      html += '<div class="card" style="margin-top:14px"><ul class="summary">';
      step.summary.forEach(function (l) { html += "<li>" + esc(l) + "</li>"; });
      html += '</ul></div><button type="button" class="btn primary" id="wiz-save" style="margin-top:12px;width:100%">Guardar</button>';
    }

    html += '<div class="chat"><p class="sub"><strong>Asistente</strong> — escribe o pulsa el micrófono. Ej: “saqué 100” o “gasté 20 en el mercado”.</p>';
    html += '<div class="bubbles" id="bubbles">';
    W.messages.forEach(function (m) {
      html += '<div class="bub ' + m.role + '">' + esc(m.text) + "</div>";
    });
    html += "</div>";
    html += '<form class="chat-row" id="chat-form"><input name="msg" maxlength="140" placeholder="Ej: presté 20 a mamá" autocomplete="off" />' +
      (window.FamiliarPWA && FamiliarPWA.hasSpeech() ? '<button class="btn mic-btn' + (FamiliarPWA.isListening() ? " on" : "") + '" type="button" id="mic-btn" aria-label="Hablar">' + (FamiliarPWA.isListening() ? "…" : "🎤") + "</button>" : "") +
      '<button class="btn primary" type="submit">Enviar</button></form></div>';

    root.innerHTML = html;
    var bubs = $("bubbles");
    if (bubs) bubs.scrollTop = bubs.scrollHeight;
  }

  function labelEstado(e) {
    if (e === "hoy") return "Hoy";
    if (e === "atrasado") return "Atrasado";
    if (e === "proximo") return "Pronto";
    if (e === "pagado") return "Pagado";
    return "Pendiente";
  }

  function afterSave(res) {
    if (!res.ok) { toast(res.error || "No se pudo guardar"); return; }
    pendingSub = null;
    toast(res.msg || "Listo");
    W.messages = [];
    renderAll();
  }

  /* ---------- mensuales ---------- */
  function renderMensuales() {
    var recs = S.recordatorios();
    var html = '<p class="sub">Estos no se anotan solos. Aquí ves cuándo toca y registras el valor real de este mes, aunque cambie.</p>';
    recs.forEach(function (r) {
      html += '<div class="card">';
      html += '<div class="debt-row"><div><strong>' + esc(r.gm.nombre) + '</strong><div class="meta">Se paga el día ' + r.dia +
        (r.gm.montoEstimado ? " · suele ser " + money(r.gm.montoEstimado) : " · el monto varía") +
        (r.gm.quienSuelePagar ? " · lo suele pagar " + esc(S.nombre(r.gm.quienSuelePagar)) : "") +
        "</div></div><span class='st " + r.estado + "'>" + labelEstado(r.estado) + "</span></div>";
      if (r.pagado) html += '<div class="sub">Este mes ya se pagó ' + money(r.pagado) + "</div>";
      html += '<div class="btn-row" style="margin-top:10px">';
      if (r.estado !== "pagado") html += '<button type="button" class="btn fam" data-pay-gm="' + esc(r.gm.id) + '">Registrar pago</button>';
      else html += '<button type="button" class="btn ghost" data-pay-gm="' + esc(r.gm.id) + '">Registrar otro pago</button>';
      html += '<button type="button" class="btn ghost" data-edit-gm="' + esc(r.gm.id) + '">Editar</button></div></div>';
    });
    html += '<button type="button" class="linkish" id="add-gm">+ Agregar gasto mensual</button>';
    $("mensuales-root").innerHTML = html;
  }

  function formGastoMensual(gm) {
    gm = gm || { nombre: "", diaPago: 5, montoEstimado: "", categoria: "Servicios Básicos", subcategoria: "Otros servicios", quienSuelePagar: "" };
    var cats = Object.keys(C.CATEGORIAS_FAMILIAR).map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === gm.categoria ? " selected" : "") + ">" + esc(c) + "</option>";
    }).join("");
    var quien = '<option value="">Quien pague ese día</option>' + S.data.miembros.map(function (m) {
      return '<option value="' + esc(m.id) + '"' + (m.id === gm.quienSuelePagar ? " selected" : "") + ">" + esc(m.nombre) + "</option>";
    }).join("");
    overlay(
      '<div class="sheet"><div class="sheet-head"><h3>' + (gm.id ? "Editar gasto mensual" : "Nuevo gasto mensual") +
      '</h3><button type="button" class="icon-btn" data-close>×</button></div>' +
      '<form class="form" id="gm-form">' +
      '<label>Nombre<input name="nombre" required value="' + esc(gm.nombre) + '" placeholder="Luz" /></label>' +
      '<label>¿Qué día del mes se paga?<input name="diaPago" type="number" min="1" max="28" required value="' + esc(gm.diaPago) + '" /></label>' +
      '<label>Valor aproximado (puede cambiar)<input name="montoEstimado" type="number" min="0" step="0.01" value="' + esc(gm.montoEstimado || "") + '" placeholder="Opcional" /></label>' +
      '<label>Categoría<select name="categoria">' + cats + "</select></label>" +
      '<label>Subcategoría<input name="subcategoria" value="' + esc(gm.subcategoria || "") + '" /></label>' +
      '<label>¿Quién suele pagar?<select name="quienSuelePagar">' + quien + "</select></label>" +
      '<button class="btn primary" type="submit">Guardar</button>' +
      (gm.id ? '<button type="button" class="btn danger" id="del-gm">Quitar de la lista</button>' : "") +
      "</form></div>"
    );
    $("gm-form").onsubmit = function (e) {
      e.preventDefault();
      var f = e.target;
      S.guardarGastoMensual({
        id: gm.id, nombre: f.nombre.value.trim(), diaPago: f.diaPago.value,
        montoEstimado: f.montoEstimado.value, categoria: f.categoria.value,
        subcategoria: f.subcategoria.value.trim() || "Otros",
        quienSuelePagar: f.quienSuelePagar.value || null, activo: true
      });
      closeOverlay();
      toast("Gasto mensual guardado");
      renderMensuales();
    };
    var del = $("del-gm");
    if (del) del.onclick = function () {
      S.quitarGastoMensual(gm.id);
      closeOverlay();
      renderMensuales();
    };
  }

  /* ---------- historial ---------- */
  function frase(tx) {
    if (tx.tipo === "ingreso") {
      return S.nombre(tx.quienPago) + " anotó " + money(tx.monto) + (tx.forma === "efectivo" ? " en efectivo" : "");
    }
    if (tx.tipo === "prestamo") {
      var extra = "";
      if (tx.bolsaId) {
        var b = S.bolsaPorId(tx.bolsaId);
        if (b) extra = " · del " + C.fechaCorta(b.fecha);
      }
      return S.nombre(tx.de) + " le dio " + money(tx.monto) + " a " + S.nombre(tx.para) + extra;
    }
    if (tx.tipo === "familiar") {
      var det = tx.categoria || "";
      if (tx.desglose && tx.desglose.length) det += " · " + tx.desglose.map(function (x) { return x.subcategoria; }).join(", ");
      else if (tx.subcategoria) det += " · " + tx.subcategoria;
      return S.nombre(tx.quienPago) + " pagó " + det;
    }
    return S.nombre(tx.quienPago) + " gastó en " + (tx.categoriaIndividual || "otros");
  }

  function icono(tipo) {
    if (tipo === "prestamo") return "💵";
    if (tipo === "familiar") return "🏠";
    if (tipo === "ingreso") return "↓";
    return "👤";
  }

  function renderHistorial() {
    var tipos = [["todos", "Todos"], ["ingreso", "Entradas"], ["prestamo", "Préstamos"], ["familiar", "Casa"], ["individual", "Personal"]];
    $("filter-tipo").innerHTML = tipos.map(function (t) {
      return '<button type="button" class="chip' + (filters.tipo === t[0] ? " on" : "") + '" data-tipo="' + t[0] + '">' + t[1] + "</button>";
    }).join("");
    var personas = [{ id: "todos", nombre: "Todas" }].concat(S.data.miembros);
    $("filter-persona").innerHTML = personas.map(function (p) {
      return '<button type="button" class="chip' + (filters.persona === p.id ? " on" : "") + '" data-persona="' + p.id + '">' + esc(p.nombre) + "</button>";
    }).join("");
    var cats = {};
    S.txsDelMes().forEach(function (tx) {
      var c = tx.categoria || tx.categoriaIndividual;
      if (c) cats[c] = true;
    });
    $("filter-categoria").innerHTML = ["todas"].concat(Object.keys(cats)).map(function (c) {
      return '<button type="button" class="chip' + (filters.categoria === c ? " on" : "") + '" data-cat="' + esc(c) + '">' + esc(c === "todas" ? "Categorías" : c) + "</button>";
    }).join("");

    var q = filters.q.toLowerCase();
    var txs = S.txsDelMes().filter(function (tx) {
      if (filters.tipo !== "todos" && tx.tipo !== filters.tipo) return false;
      if (filters.persona !== "todos") {
        var ids = [tx.de, tx.para, tx.quienPago, tx.deQuienPrestado];
        if (ids.indexOf(filters.persona) === -1) return false;
      }
      if (filters.categoria !== "todas" && (tx.categoria || tx.categoriaIndividual) !== filters.categoria) return false;
      if (q && (tx.descripcion || "").toLowerCase().indexOf(q) === -1 && frase(tx).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) { return String(b.fecha + (b.hora || "")).localeCompare(String(a.fecha + (a.hora || ""))); });

    var html = "";
    var last = "";
    if (!txs.length) html = '<div class="empty">No hay movimientos.</div>';
    var closed = mesCerrado();
    txs.forEach(function (tx) {
      if (tx.fecha !== last) { html += '<div class="day-label">' + fmtFecha(tx.fecha) + "</div>"; last = tx.fecha; }
      html += '<article class="tx ' + tx.tipo + '"><div class="dot">' + icono(tx.tipo) + "</div><div><strong>" + esc(frase(tx)) + "</strong>" +
        '<div class="meta">' + esc(tx.descripcion || "") + (tx.hora ? " · " + esc(tx.hora) : "") +
        (tx.medio ? " · " + esc(tx.medio) : "") + "</div>" +
        (closed ? "" : '<button type="button" class="del" data-del="' + esc(tx.id) + '">Eliminar</button>') +
        "</div><div class='amt'>" + money(tx.monto) + "</div></article>";
    });
    $("historial-list").innerHTML = html;
  }

  /* ---------- análisis ---------- */
  var CAT_COLORS = {
    "Servicios Básicos": "#245ea8", Mercado: "#2c7a54", Comisariato: "#c45c26",
    Transporte: "#6d28d9", Salud: "#b42318", Educación: "#0f766e", Otros: "#78716c"
  };

  function kpi(label, value) {
    return '<div class="card kpi"><div class="label">' + esc(label) + '</div><div class="value">' + esc(value) + "</div></div>";
  }

  function htmlDeudas(pares) {
    if (!pares.length) return '<div class="empty">Nadie se debe nada este mes.</div>';
    return pares.map(function (p) {
      return '<div class="debt-row"><div><strong>' + esc(p.deNombre) + "</strong> debe a <strong>" + esc(p.paraNombre) + '</strong></div><div class="debt-amt">' + money(p.monto) + "</div></div>";
    }).join("");
  }

  function donut(porCategoria) {
    var entries = Object.keys(porCategoria).map(function (k) { return { k: k, v: porCategoria[k] }; }).sort(function (a, b) { return b.v - a.v; });
    var total = entries.reduce(function (s, e) { return s + e.v; }, 0);
    if (!total) return '<div class="empty">Todavía no hay gastos de la casa.</div>';
    var r = 42, c = 2 * Math.PI * r, acc = 0;
    var circles = entries.map(function (e) {
      var len = (e.v / total) * c;
      var rot = (acc / total) * 360 - 90;
      acc += e.v;
      return '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + (CAT_COLORS[e.k] || "#78716c") + '" stroke-width="12" stroke-dasharray="' + len + " " + (c - len) + '" transform="rotate(' + rot + ' 50 50)"></circle>';
    }).join("");
    var legend = entries.map(function (e) {
      return '<div><span><i class="swatch" style="background:' + (CAT_COLORS[e.k] || "#78716c") + '"></i>' + esc(e.k) + "</span><span>" + money(e.v) + " · " + Math.round((e.v / total) * 100) + "%</span></div>";
    }).join("");
    return '<div class="donut-wrap"><svg width="110" height="110" viewBox="0 0 100 100">' + circles + '</svg><div class="legend">' + legend + "</div></div>";
  }

  function renderAnalisis() {
    var r = S.resumenMes();
    var mes = S.mesActual();
    var meta = mes.metaPresupuestaria || 0;
    var pct = meta > 0 ? Math.min(100, Math.round((r.gastoFamiliar / meta) * 100)) : 0;
    var cls = pct < 80 ? "ok" : pct <= 100 ? "warn" : "bad";
    var html = "<h2 class='section'>Resumen</h2><div class='kpi-grid'>";
    html += kpi("Gasto de la casa", money(r.gastoFamiliar));
    html += kpi("Personal", money(r.gastoIndividual));
    html += kpi("Efectivo en mano", money(r.efectivoEnMano));
    html += kpi("Promedio / persona", money(r.promedio));
    html += "</div>";
    html += "<h2 class='section'>Quién debe a quién</h2><div class='card'>" + htmlDeudas(S.deudas()) + "</div>";
    html += '<p class="sub" style="margin-top:8px">Préstamos + gastos de la casa repartidos entre ' + r.nActivos + " personas.</p>";
    html += "<h2 class='section'>Quién pagó más (casa)</h2><div class='card'><table class='table'><thead><tr><th>Persona</th><th>Pagó</th><th>Debería</th><th>Dif.</th></tr></thead><tbody>";
    S.ranking().forEach(function (row) {
      html += "<tr><td>" + esc(row.nombre) + "</td><td>" + money(row.pagado) + "</td><td>" + money(row.deberia) + "</td><td class='" + (row.diferencia >= 0 ? "plus" : "minus") + "'>" + (row.diferencia >= 0 ? "+" : "") + money(row.diferencia) + "</td></tr>";
    });
    html += "</tbody></table></div>";
    html += "<h2 class='section'>Por categoría</h2><div class='card'>" + donut(r.porCategoria) + "</div>";
    html += "<h2 class='section'>Detalle</h2><div class='card'>";
    var cats = Object.keys(r.porSub);
    if (!cats.length) html += '<div class="empty">Sin categorías.</div>';
    cats.forEach(function (cat) {
      var totalCat = r.porCategoria[cat] || 0;
      var pctCat = r.gastoFamiliar ? Math.round((totalCat / r.gastoFamiliar) * 100) : 0;
      html += '<div class="cat-row"><button type="button" class="cat-head" data-expand="' + esc(cat) + '"><span>' + esc(cat) + "</span><span>" + money(totalCat) + " · " + pctCat + "%</span></button>";
      html += '<div class="bar"><i style="width:' + pctCat + "%;background:" + (CAT_COLORS[cat] || "#78716c") + '"></i></div>';
      html += '<div class="subs hidden" data-sub="' + esc(cat) + '">';
      Object.keys(r.porSub[cat]).forEach(function (sub) {
        html += "<div><span>" + esc(sub) + "</span><span>" + money(r.porSub[cat][sub]) + "</span></div>";
      });
      html += "</div></div>";
    });
    html += "</div>";
    var prevKey = C.mesAnteriorKey(S.data.mesSeleccionado);
    var prev = S.resumenMes(prevKey);
    html += "<h2 class='section'>Comparativa con " + C.etiquetaMes(prevKey) + "</h2><div class='card'>";
    var allCats = {};
    Object.keys(r.porCategoria).forEach(function (k) { allCats[k] = true; });
    Object.keys(prev.porCategoria).forEach(function (k) { allCats[k] = true; });
    var keys = Object.keys(allCats);
    if (!keys.length) html += '<div class="empty">No hay datos para comparar.</div>';
    else {
      keys.forEach(function (k) {
        var a = prev.porCategoria[k] || 0, b = r.porCategoria[k] || 0, diff = b - a;
        html += '<div class="compare"><span>' + esc(k) + "</span><span>" + money(a) + "</span><span>" + money(b) +
          ' <span class="' + (diff > 0 ? "minus" : "plus") + '">' + (diff > 0 ? "↑ " : diff < 0 ? "↓ " : "") + money(Math.abs(diff)) + "</span></span></div>";
      });
    }
    html += "</div>";
    html += "<h2 class='section'>Meta</h2><div class='card'>";
    if (!meta) html += '<p class="sub">Pon una meta en Ajustes.</p>';
    else {
      html += '<div class="value" style="font-size:1.3rem;font-weight:750">' + money(r.gastoFamiliar) + " de " + money(meta) + "</div>";
      html += '<div class="progress ' + cls + '" style="margin:10px 0"><span style="width:' + Math.min(pct, 100) + '%"></span></div>';
    }
    html += "</div>";
    $("analisis-root").innerHTML = html;
  }

  function renderConfig() {
    var mes = S.mesActual();
    var html = "<h2 class='section'>Personas</h2><div class='card'>";
    S.data.miembros.forEach(function (m) {
      html += '<div class="member"><input type="text" maxlength="24" value="' + esc(m.nombre) + '" data-edit-name="' + esc(m.id) + '" />' +
        '<label class="sub">Activo <input class="switch" type="checkbox" data-activo="' + esc(m.id) + '"' + (m.activo ? " checked" : "") + " /></label>" +
        '<button type="button" class="del" data-remove-m="' + esc(m.id) + '">Quitar</button></div>';
    });
    html += '</div><button type="button" class="linkish" id="add-member">+ Agregar persona</button>';
    html += "<h2 class='section'>En el celular</h2><div class='card'>";
    if (window.FamiliarPWA && FamiliarPWA.standalone()) {
      html += "<p>Ya está instalada. En Android di: <strong>Ok Google, abre Familia</strong>.</p>";
    } else {
      html += "<ol class='install-steps'><li>Ábrela en <strong>Chrome</strong> (no en WhatsApp ni Facebook).</li>";
      html += "<li>Toca el menú <strong>⋮</strong> → <strong>Instalar app</strong> o <strong>Añadir a la pantalla de inicio</strong>.</li>";
      html += "<li>Después di: <strong>Ok Google, abre Familia</strong>.</li></ol>";
      html += "<p class='sub' style='margin:8px 0'>Eso abre la app. El gasto se anota adentro, hablando o escribiendo. Los datos quedan en este celular.</p>";
      html += '<button type="button" class="btn primary" id="install-cfg">Instalar app</button>';
    }
    html += "</div>";
    html += "<h2 class='section'>Meta de este mes</h2><div class='card'><form class='form' id='meta-form'>" +
      '<label>Meta de gasto de la casa<input name="meta" type="number" min="0" step="1" value="' + (mes.metaPresupuestaria || "") + '" /></label>' +
      '<button class="btn primary" type="submit">Guardar meta</button></form></div>';
    html += "<h2 class='section'>Meses</h2><div class='card'>";
    if (mes.cerrado) html += '<button type="button" class="btn ghost" id="reopen-month">Reabrir este mes</button>';
    else html += '<button type="button" class="btn ghost" id="close-month">Cerrar ' + esc(C.etiquetaMes(S.data.mesSeleccionado)) + "</button>";
    html += '<button type="button" class="btn primary" id="new-month" style="margin-top:8px;width:100%">Ir al mes siguiente</button></div>';
    html += "<h2 class='section'>Datos</h2><div class='card btn-row'>" +
      '<button type="button" class="btn ghost" id="exp-json">JSON</button>' +
      '<button type="button" class="btn ghost" id="exp-csv">Excel (CSV)</button></div>' +
      '<button type="button" class="btn danger" id="wipe" style="margin-top:12px;width:100%">Borrar todos los datos</button>';
    $("config-root").innerHTML = html;
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
  }

  function openMonthPicker() {
    var keys = Object.keys(S.data.meses).sort().reverse();
    var cur = C.mesKey(new Date());
    if (keys.indexOf(cur) === -1) keys.unshift(cur);
    var html = '<div class="sheet"><div class="sheet-head"><h3>Cambiar mes</h3><button type="button" class="icon-btn" data-close>×</button></div>';
    html += '<div class="btn-row" style="margin-bottom:12px"><button type="button" class="btn ghost" id="prev-m">Anterior</button><button type="button" class="btn ghost" id="next-m">Siguiente</button></div>';
    keys.forEach(function (k) {
      var on = k === S.data.mesSeleccionado;
      var closed = S.data.meses[k] && S.data.meses[k].cerrado;
      html += '<button type="button" class="action" style="margin-bottom:8px" data-pick-mes="' + k + '"><span><strong>' + C.etiquetaMes(k) + (on ? " · viendo" : "") + "</strong><span>" + (closed ? "Cerrado" : "Abierto") + "</span></span></button>";
    });
    html += "</div>";
    overlay(html);
  }

  function handleChatText(msg) {
    msg = String(msg || "").trim();
    if (!msg) return;
    W.messages.push({ role: "user", text: msg });
    var parsed = W.parseChat(msg);
    if (parsed.error) {
      W.messages.push({ role: "bot", text: parsed.error });
      renderWizard();
    } else if (parsed.commit) {
      afterSave(W.commit());
    } else {
      botReply();
      renderWizard();
    }
  }

  function botReply() {
    var step = W.step();
    W.messages.push({ role: "bot", text: step.question + (step.hint ? " " + step.hint : "") });
  }

  function bind() {
    $("add-setup-member").onclick = function () {
      if ($("setup-list").children.length >= 6) return toast("Máximo 6 personas");
      addSetupRow("", false);
    };
    $("setup-list").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-row]");
      if (btn) btn.parentElement.remove();
    });
    $("setup-list").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); finishSetup(); }
    });
    $("setup-go").onclick = finishSetup;

    qsa(".nav button").forEach(function (b) {
      b.onclick = function () {
        view = b.getAttribute("data-tab");
        renderAll();
      };
    });

    $("view-agregar").addEventListener("click", function (e) {
      if (e.target.id === "install-btn") {
        FamiliarPWA.installApp().then(function () { renderWizard(); });
        return;
      }
      if (e.target.id === "mic-btn" || e.target.closest("#mic-btn")) {
        FamiliarPWA.startListen(handleChatText);
        return;
      }
      if (e.target.id === "wiz-back") { pendingSub = null; W.back(); renderWizard(); return; }
      if (e.target.id === "wiz-who") { W.draft.yo = null; W.draft.accion = null; renderWizard(); return; }
      if (e.target.id === "wiz-save") { afterSave(W.commit()); return; }
      if (e.target.id === "des-rest") {
        var step = W.step();
        var err = W.addDesglose(pendingSub, step.resto);
        if (err) return toast(err);
        pendingSub = null;
        renderWizard();
        return;
      }
      var ch = e.target.closest("[data-choice]");
      if (ch) { W.choose(ch.getAttribute("data-choice")); renderWizard(); return; }
      var sub = e.target.closest("[data-sub]");
      if (sub) { pendingSub = sub.getAttribute("data-sub"); W.setPendingSub(pendingSub); renderWizard(); }
    });

    $("view-agregar").addEventListener("submit", function (e) {
      if (e.target.id === "amt-form") {
        e.preventDefault();
        var err = W.setAmount(e.target.monto.value);
        if (err) return toast(err);
        renderWizard();
      }
      if (e.target.id === "des-form") {
        e.preventDefault();
        var err2 = W.addDesglose(pendingSub, e.target.monto.value);
        if (err2) return toast(err2);
        pendingSub = null;
        renderWizard();
      }
      if (e.target.id === "chat-form") {
        e.preventDefault();
        handleChatText(e.target.msg.value);
      }
    });

    $("month-btn").onclick = openMonthPicker;
    $("gear-btn").onclick = function () {
      view = "config";
      renderAll();
    };

    document.addEventListener("familiar-installable", function () {
      if (view === "agregar") renderWizard();
      if (view === "config") renderConfig();
    });
    document.addEventListener("familiar-installed", function () {
      if (view === "agregar") renderWizard();
      if (view === "config") renderConfig();
    });
    document.addEventListener("familiar-listen", function () {
      if (view === "agregar") renderWizard();
    });

    $("overlay").addEventListener("click", function (e) {
      if (e.target.id === "overlay" || e.target.closest("[data-close]")) closeOverlay();
      var pick = e.target.closest("[data-pick-mes]");
      if (pick) { S.setMes(pick.getAttribute("data-pick-mes")); closeOverlay(); renderAll(); }
      if (e.target.id === "prev-m") { S.setMes(C.mesAnteriorKey(S.data.mesSeleccionado)); closeOverlay(); openMonthPicker(); }
      if (e.target.id === "next-m") { S.setMes(C.mesSiguienteKey(S.data.mesSeleccionado)); closeOverlay(); openMonthPicker(); }
    });

    $("search").addEventListener("input", function () { filters.q = $("search").value; renderHistorial(); });
    $("view-historial").addEventListener("click", function (e) {
      var t = e.target.closest("[data-tipo]");
      if (t) { filters.tipo = t.getAttribute("data-tipo"); renderHistorial(); }
      var p = e.target.closest("[data-persona]");
      if (p) { filters.persona = p.getAttribute("data-persona"); renderHistorial(); }
      var c = e.target.closest("[data-cat]");
      if (c) { filters.categoria = c.getAttribute("data-cat"); renderHistorial(); }
      var d = e.target.closest("[data-del]");
      if (d) {
        confirmBox("Eliminar", "Esto deshace también el efectivo ligado, si se puede.", "Eliminar", function () {
          var res = S.eliminarTx(d.getAttribute("data-del"));
          if (res && res.error) toast(res.error);
          else if (!res) toast("No se pudo eliminar.");
          else toast("Eliminado");
          renderAll();
        });
      }
    });

    $("view-mensuales").addEventListener("click", function (e) {
      if (e.target.id === "add-gm") return formGastoMensual(null);
      var pay = e.target.closest("[data-pay-gm]");
      if (pay) {
        view = "agregar";
        W.start({ yo: S.data.ultimoYo, gastoMensualId: pay.getAttribute("data-pay-gm") });
        renderAll();
        toast("Sigue las preguntas para anotar el pago de este mes.");
      }
      var ed = e.target.closest("[data-edit-gm]");
      if (ed) formGastoMensual(S.gastoMensualPorId(ed.getAttribute("data-edit-gm")));
    });

    $("view-analisis").addEventListener("click", function (e) {
      var b = e.target.closest("[data-expand]");
      if (!b) return;
      var box = qs('[data-sub="' + b.getAttribute("data-expand") + '"]');
      if (box) box.classList.toggle("hidden");
    });

    $("view-config").addEventListener("click", function (e) {
      if (e.target.id === "install-cfg") {
        FamiliarPWA.installApp().then(function () { renderConfig(); });
        return;
      }
      if (e.target.id === "add-member") {
        if (S.data.miembros.length >= 6) return toast("Máximo 6 personas");
        overlay('<div class="sheet"><div class="sheet-head"><h3>Agregar persona</h3><button type="button" class="icon-btn" data-close>×</button></div>' +
          '<form class="form" id="add-m-form"><label>Nombre<input name="nombre" maxlength="24" required /></label><button class="btn primary" type="submit">Agregar</button></form></div>');
        $("add-m-form").onsubmit = function (ev) {
          ev.preventDefault();
          S.agregarMiembro(ev.target.nombre.value.trim());
          closeOverlay();
          renderConfig();
        };
      }
      var rm = e.target.closest("[data-remove-m]");
      if (rm) {
        confirmBox("Quitar persona", "Seguirá en movimientos viejos.", "Quitar", function () {
          if (!S.quitarMiembro(rm.getAttribute("data-remove-m"))) toast("Deja al menos 2 personas.");
          renderConfig();
        });
      }
      if (e.target.id === "close-month") {
        confirmBox("Cerrar mes", "Se guarda el resumen de " + C.etiquetaMes(S.data.mesSeleccionado) + ".", "Cerrar", function () {
          S.cerrarMes(); toast("Mes cerrado"); renderAll();
        });
      }
      if (e.target.id === "reopen-month") { S.reabrirMes(); toast("Mes reabierto"); renderAll(); }
      if (e.target.id === "new-month") {
        var res = S.nuevoMes();
        toast("Ahora ves " + C.etiquetaMes(res.mes) + ". Los gastos mensuales siguen, anota cada pago cuando ocurra.");
        renderAll();
      }
      if (e.target.id === "exp-json") download("gastos-familia.json", S.exportarJSON(), "application/json");
      if (e.target.id === "exp-csv") download("gastos-familia.csv", S.exportarCSV(), "text/csv");
      if (e.target.id === "wipe") {
        confirmBox("Borrar todo", "Se borra lo de este navegador.", "Borrar", function () { S.reset(); location.reload(); });
      }
    });

    $("view-config").addEventListener("change", function (e) {
      var act = e.target.getAttribute("data-activo");
      if (act && !S.setActivo(act, e.target.checked)) {
        e.target.checked = true;
        toast("Deja al menos 2 personas activas.");
      }
    });
    $("view-config").addEventListener("focusout", function (e) {
      var id = e.target.getAttribute("data-edit-name");
      if (id && e.target.value.trim()) S.editarMiembro(id, e.target.value);
    });
    $("view-config").addEventListener("submit", function (e) {
      if (e.target.id !== "meta-form") return;
      e.preventDefault();
      S.setMeta(e.target.meta.value);
      toast("Meta guardada");
      renderAll();
    });
  }

  function init() {
    S.load();
    bind();
    if (!S.data.setupHecho || !S.data.miembros.length) {
      $("setup").classList.remove("hidden");
      renderSetup();
    } else showApp();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeOverlay();
  });
  document.addEventListener("DOMContentLoaded", init);
})();

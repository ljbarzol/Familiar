(function (global) {
  "use strict";

  var S = null;
  var C = null;

  function fold(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function round2(n) { return FamiliarConst.round2(n); }

  function emptyDraft() {
    return {
      yo: null,
      accion: null,
      ambito: null,
      monto: null,
      medio: null,
      medioDigital: null,
      bolsaId: null,
      origen: null,
      forma: null,
      para: null,
      de: null,
      proposito: null,
      categoria: null,
      subcategoria: null,
      desglose: [],
      partir: null,
      descripcion: "",
      fecha: null,
      gastoMensualId: null,
      _resume: null
    };
  }

  var Wizard = {
    draft: emptyDraft(),
    messages: [],
    chatOn: false,

    init: function () {
      S = FamiliarStore;
      C = FamiliarConst;
    },

    reset: function () {
      var yo = this.draft.yo || S.data.ultimoYo;
      this.draft = emptyDraft();
      this.draft.yo = yo;
      this.draft.fecha = C.hoyISO();
    },

    start: function (prefill) {
      this.reset();
      if (prefill) {
        Object.keys(prefill).forEach(function (k) {
          Wizard.draft[k] = prefill[k];
        });
      }
      if (this.draft.yo) S.setUltimoYo(this.draft.yo);
      if (this.draft.gastoMensualId) {
        var gm = S.gastoMensualPorId(this.draft.gastoMensualId);
        if (gm) {
          this.draft.accion = "gasto";
          this.draft.ambito = "familiar";
          this.draft.categoria = gm.categoria;
          this.draft.subcategoria = gm.subcategoria;
          this.draft.descripcion = gm.nombre;
          if (gm.montoEstimado > 0 && !this.draft.monto) this.draft.monto = gm.montoEstimado;
          if (gm.quienSuelePagar && !this.draft.yo) this.draft.yo = gm.quienSuelePagar;
        }
      }
    },

    back: function () {
      var d = this.draft;
      if (d.partir === true && d.desglose.length) {
        d.desglose.pop();
        return;
      }
      if (d.partir != null && d.accion === "gasto") { d.partir = null; d.subcategoria = null; return; }
      if (d.subcategoria && d.accion === "gasto") { d.subcategoria = null; return; }
      if (d.categoria && d.accion === "gasto" && !d.gastoMensualId) { d.categoria = null; d.subcategoria = null; return; }
      if (d.bolsaId) { d.bolsaId = null; return; }
      if (d.medioDigital) { d.medioDigital = null; return; }
      if (d.medio) { d.medio = null; d.bolsaId = null; d.medioDigital = null; return; }
      if (d.forma && d.accion === "ingreso") { d.forma = null; return; }
      if (d.origen && d.accion === "ingreso") { d.origen = null; return; }
      if (d.proposito && d.accion === "prestamo" && d.para) { /* keep */ }
      if (d.para) { d.para = null; return; }
      if (d.de && d.accion === "me_prestaron") { d.de = null; return; }
      if (d.monto != null && d.accion) { d.monto = null; return; }
      if (d.ambito && !d.gastoMensualId) { d.ambito = null; return; }
      if (d.accion && !d.gastoMensualId) { d.accion = null; return; }
      if (d.yo && !S.data.ultimoYo) { d.yo = null; return; }
      d.yo = null;
    },

    canBack: function () {
      var d = this.draft;
      return !!(d.yo || d.accion || d.monto || d.ambito);
    },

    step: function () {
      var d = this.draft;
      if (!d.fecha) d.fecha = C.hoyISO();

      if (!d.yo) {
        return {
          id: "quien",
          question: "¿Quién eres?",
          hint: "Así sabemos de quién es el movimiento.",
          type: "choices",
          choices: S.miembrosActivos().map(function (m) {
            var cash = S.efectivoEnMano(m.id);
            return { id: m.id, label: m.nombre, sub: cash > 0 ? "Efectivo: " + S.fmtMoney(cash) : "Sin efectivo anotado" };
          })
        };
      }

      if (!d.accion) {
        return {
          id: "accion",
          question: "Hola, " + S.nombre(d.yo) + ". ¿Qué quieres anotar?",
          hint: "Una cosa a la vez.",
          type: "choices",
          choices: [
            { id: "gasto", label: "Gasté", sub: "Comida, servicios, algo personal…" },
            { id: "ingreso", label: "Saqué o me llegó dinero", sub: "Retiro, sueldo, transferencia" },
            { id: "prestamo", label: "Presté dinero", sub: "Se lo di a alguien de la casa" },
            { id: "me_prestaron", label: "Me prestaron", sub: "Alguien me dio efectivo o me transfirió" }
          ]
        };
      }

      if (d.accion === "gasto") return this._stepGasto();
      if (d.accion === "ingreso") return this._stepIngreso();
      if (d.accion === "prestamo") return this._stepPrestamo();
      if (d.accion === "me_prestaron") return this._stepMePrestaron();
      return { id: "accion", question: "¿Qué quieres anotar?", type: "choices", choices: [] };
    },

    _stepGasto: function () {
      var d = this.draft;
      if (!d.ambito) {
        return {
          id: "ambito",
          question: "¿Fue de la casa o solo tuyo?",
          type: "choices",
          choices: [
            { id: "familiar", label: "De la casa", sub: "Se reparte entre todos" },
            { id: "individual", label: "Solo mío", sub: "No se divide" }
          ]
        };
      }
      if (d.monto == null) {
        var hint = "¿Cuánto fue?";
        if (d.gastoMensualId) {
          var gm = S.gastoMensualPorId(d.gastoMensualId);
          if (gm && gm.montoEstimado) hint = "La última vez fue " + S.fmtMoney(gm.montoEstimado) + ", pero puede cambiar.";
          else hint = "Este mes puede ser distinto. Pon el valor real.";
        }
        return { id: "monto", question: "¿Cuánto gastaste?", hint: hint, type: "amount" };
      }
      if (!d.medio) {
        return {
          id: "medio",
          question: "¿Cómo pagaste?",
          type: "choices",
          choices: [
            { id: "efectivo", label: "Efectivo", sub: "Del dinero que tienes en mano" },
            { id: "digital", label: "Pago digital", sub: "Transferencia, tarjeta o app" }
          ]
        };
      }
      if (d.medio === "efectivo" && !d.bolsaId) {
        var bolsas = S.bolsasDe(d.yo, true);
        if (!bolsas.length) {
          return {
            id: "sin_efectivo",
            question: "No tienes efectivo anotado.",
            hint: "Si hoy sacaste dinero, anótalo primero. Así el préstamo o el gasto queda ligado a ese retiro.",
            type: "choices",
            choices: [
              { id: "ir_ingreso", label: "Saqué dinero, quiero anotarlo" },
              { id: "fue_digital", label: "En realidad pagué digital" }
            ]
          };
        }
        return {
          id: "bolsa",
          question: "¿De qué dinero salió?",
          hint: "Así sabemos si fue del retiro de hoy o de otro día.",
          type: "choices",
          choices: bolsas.map(function (b) {
            return { id: b.id, label: S.etiquetaBolsa(b), sub: b.descripcion || "" };
          })
        };
      }
      if (d.medio === "digital" && !d.medioDigital) {
        return {
          id: "medioDigital",
          question: "¿Qué pago digital fue?",
          type: "choices",
          choices: C.MEDIOS_DIGITAL.map(function (m) { return { id: m.id, label: m.label }; })
        };
      }
      if (!d.categoria) {
        var cats = d.ambito === "familiar" ? Object.keys(C.CATEGORIAS_FAMILIAR) : C.CATEGORIAS_INDIVIDUAL;
        return {
          id: "categoria",
          question: "¿En qué?",
          type: "choices",
          choices: cats.map(function (c) { return { id: c, label: c }; })
        };
      }
      var subs = d.ambito === "familiar" ? (C.CATEGORIAS_FAMILIAR[d.categoria] || []) : [];
      if (d.ambito === "familiar" && subs.length > 1 && d.partir == null && !d.gastoMensualId) {
        return {
          id: "partir",
          question: "¿Quieres decir cómo se repartió?",
          hint: "Por ejemplo: de $20 de mercado, $10 carnes y $10 verduras.",
          type: "choices",
          choices: [
            { id: "si", label: "Sí, partirlo" },
            { id: "no", label: "No, fue todo en una cosa" }
          ]
        };
      }
      if (d.partir === true) {
        var usado = d.desglose.reduce(function (s, x) { return s + x.monto; }, 0);
        var resto = round2(d.monto - usado);
        if (resto > 0.009) {
          return {
            id: "desglose",
            question: "Quedan " + S.fmtMoney(resto) + ". ¿En qué se fueron?",
            hint: d.desglose.length ? "Ya anotado: " + d.desglose.map(function (x) { return x.subcategoria + " " + S.fmtMoney(x.monto); }).join(", ") : "Di el monto y la cosa, o elige y luego el valor.",
            type: "desglose",
            resto: resto,
            choices: subs.map(function (s) { return { id: s, label: s }; })
          };
        }
      }
      if (d.ambito === "familiar" && subs.length && !d.subcategoria && d.partir !== true) {
        return {
          id: "subcategoria",
          question: "¿Cuál?",
          type: "choices",
          choices: subs.map(function (s) { return { id: s, label: s }; })
        };
      }
      return this._confirm();
    },

    _stepIngreso: function () {
      var d = this.draft;
      if (d.monto == null) {
        return { id: "monto", question: "¿Cuánto te llegó o sacaste?", hint: "Ese monto queda como dinero disponible.", type: "amount" };
      }
      if (!d.origen) {
        return {
          id: "origen",
          question: "¿De dónde salió?",
          type: "choices",
          choices: C.ORIGEN_INGRESO.map(function (o) { return { id: o.id, label: o.label }; })
        };
      }
      if (!d.forma) {
        return {
          id: "forma",
          question: "¿En qué quedó ese dinero?",
          hint: "Si es efectivo, después podrás prestar o gastar de ESE retiro.",
          type: "choices",
          choices: [
            { id: "efectivo", label: "Efectivo en mano" },
            { id: "digital", label: "En la cuenta / digital" }
          ]
        };
      }
      return this._confirm();
    },

    _stepPrestamo: function () {
      var d = this.draft;
      if (!d.para) {
        return {
          id: "para",
          question: "¿A quién le diste el dinero?",
          type: "choices",
          choices: S.data.miembros.filter(function (m) { return m.id !== d.yo; }).map(function (m) {
            return { id: m.id, label: m.nombre };
          })
        };
      }
      if (d.monto == null) {
        return { id: "monto", question: "¿Cuánto le prestaste?", type: "amount" };
      }
      if (!d.medio) {
        return {
          id: "medio",
          question: "¿Se lo diste en efectivo o digital?",
          type: "choices",
          choices: [
            { id: "efectivo", label: "Efectivo" },
            { id: "digital", label: "Pago digital" }
          ]
        };
      }
      if (d.medio === "efectivo" && !d.bolsaId) {
        var bolsas = S.bolsasDe(d.yo, true);
        if (!bolsas.length) {
          return {
            id: "sin_efectivo",
            question: "No tienes efectivo anotado para prestar.",
            hint: "Primero anota de qué retiro salió. Ejemplo: hoy saqué $100.",
            type: "choices",
            choices: [{ id: "ir_ingreso", label: "Anotar que saqué dinero" }]
          };
        }
        return {
          id: "bolsa",
          question: "¿De qué retiro salió el préstamo?",
          hint: "Así no se mezcla el del día 10 con el del día 20.",
          type: "choices",
          choices: bolsas.map(function (b) {
            return { id: b.id, label: S.etiquetaBolsa(b), sub: b.descripcion || "" };
          })
        };
      }
      if (d.medio === "digital" && !d.medioDigital) {
        return {
          id: "medioDigital",
          question: "¿Cómo se lo enviaste?",
          type: "choices",
          choices: C.MEDIOS_DIGITAL.map(function (m) { return { id: m.id, label: m.label }; })
        };
      }
      if (!d.proposito) {
        return {
          id: "proposito",
          question: "¿Para qué se lo diste?",
          type: "choices",
          choices: [
            { id: "familiar", label: "Para la casa" },
            { id: "individual", label: "Para algo personal" }
          ]
        };
      }
      return this._confirm();
    },

    _stepMePrestaron: function () {
      var d = this.draft;
      if (!d.de) {
        return {
          id: "de",
          question: "¿Quién te prestó?",
          type: "choices",
          choices: S.data.miembros.filter(function (m) { return m.id !== d.yo; }).map(function (m) {
            return { id: m.id, label: m.nombre };
          })
        };
      }
      if (d.monto == null) {
        return { id: "monto", question: "¿Cuánto te prestaron?", type: "amount" };
      }
      if (!d.medio) {
        return {
          id: "medio",
          question: "¿Te lo dieron en efectivo o digital?",
          type: "choices",
          choices: [
            { id: "efectivo", label: "Efectivo", sub: "Queda en tu mano para gastar" },
            { id: "digital", label: "Pago digital" }
          ]
        };
      }
      return this._confirm();
    },

    _confirm: function () {
      return {
        id: "confirm",
        question: "¿Lo guardo así?",
        type: "confirm",
        summary: this.summary()
      };
    },

    summary: function () {
      var d = this.draft;
      var lines = [];
      lines.push(S.nombre(d.yo));
      if (d.accion === "ingreso") {
        lines.push("Entró " + S.fmtMoney(d.monto) + (d.forma === "efectivo" ? " en efectivo" : " digital"));
        var orig = C.ORIGEN_INGRESO.filter(function (o) { return o.id === d.origen; })[0];
        if (orig) lines.push(orig.label);
        if (d.forma === "efectivo") lines.push("Quedará ligado a la fecha " + C.fechaCorta(d.fecha));
      } else if (d.accion === "prestamo") {
        lines.push("Prestaste " + S.fmtMoney(d.monto) + " a " + S.nombre(d.para));
        if (d.bolsaId) lines.push("Sale de: " + S.etiquetaBolsa(S.bolsaPorId(d.bolsaId)));
      } else if (d.accion === "me_prestaron") {
        lines.push(S.nombre(d.de) + " te prestó " + S.fmtMoney(d.monto));
      } else if (d.accion === "gasto") {
        lines.push("Gastaste " + S.fmtMoney(d.monto) + (d.ambito === "familiar" ? " (de la casa)" : " (solo tuyo)"));
        if (d.categoria) lines.push(d.categoria + (d.subcategoria ? " · " + d.subcategoria : ""));
        if (d.desglose && d.desglose.length) {
          lines.push(d.desglose.map(function (x) { return x.subcategoria + " " + S.fmtMoney(x.monto); }).join(" · "));
        }
        if (d.bolsaId) lines.push("Sale de: " + S.etiquetaBolsa(S.bolsaPorId(d.bolsaId)));
        else if (d.medio === "digital") lines.push("Pago digital");
      }
      return lines;
    },

    choose: function (id) {
      var step = this.step();
      var d = this.draft;
      if (step.id === "quien") {
        d.yo = id;
        S.setUltimoYo(id);
        return;
      }
      if (step.id === "accion") { d.accion = id; return; }
      if (step.id === "ambito") { d.ambito = id; return; }
      if (step.id === "medio") { d.medio = id; return; }
      if (step.id === "forma") { d.forma = id; return; }
      if (step.id === "origen") { d.origen = id; return; }
      if (step.id === "para") { d.para = id; return; }
      if (step.id === "de") { d.de = id; return; }
      if (step.id === "proposito") { d.proposito = id; return; }
      if (step.id === "medioDigital") { d.medioDigital = id; d.medio = "digital"; return; }
      if (step.id === "categoria") { d.categoria = id; return; }
      if (step.id === "subcategoria") { d.subcategoria = id; return; }
      if (step.id === "bolsa") { d.bolsaId = id; return; }
      if (step.id === "partir") { d.partir = id === "si"; return; }
      if (step.id === "sin_efectivo") {
        if (id === "fue_digital") { d.medio = "digital"; return; }
        if (id === "ir_ingreso") {
          d._resume = {
            accion: d.accion, ambito: d.ambito, monto: d.monto, para: d.para,
            categoria: d.categoria, gastoMensualId: d.gastoMensualId, descripcion: d.descripcion
          };
          d.accion = "ingreso";
          d.origen = "retiro";
          d.monto = null;
          d.medio = null;
          d.bolsaId = null;
          return;
        }
      }
    },

    setAmount: function (n) {
      n = round2(String(n).replace(",", "."));
      if (!(n > 0)) return "Pon un monto mayor a 0.";
      var step = this.step();
      if (step.id === "desglose") return this.addDesglose(this._pendingSub, n);
      this.draft.monto = n;
      return "";
    },

    addDesglose: function (sub, monto) {
      if (!sub) return "Elige en qué se fue.";
      monto = round2(String(monto).replace(",", "."));
      if (!(monto > 0)) return "Pon cuánto fue en eso.";
      var usado = this.draft.desglose.reduce(function (s, x) { return s + x.monto; }, 0);
      var resto = round2(this.draft.monto - usado);
      if (monto > resto + 0.009) return "Solo quedan " + S.fmtMoney(resto) + ".";
      this.draft.desglose.push({ subcategoria: sub, monto: monto });
      this._pendingSub = null;
      var nuevoResto = round2(this.draft.monto - usado - monto);
      if (nuevoResto <= 0.009 && this.draft.desglose.length === 1) {
        this.draft.subcategoria = sub;
      }
      return "";
    },

    setPendingSub: function (sub) {
      this._pendingSub = sub;
    },

    commit: function () {
      var d = this.draft;
      var res;
      if (d.accion === "ingreso") {
        res = S.registrarIngreso({
          yo: d.yo, monto: d.monto, origen: d.origen, forma: d.forma,
          fecha: d.fecha, descripcion: d.descripcion
        });
        if (res.ok && d._resume) {
          var resume = d._resume;
          var yo = d.yo;
          this.reset();
          this.draft.yo = yo;
          this.draft.accion = resume.accion;
          this.draft.ambito = resume.ambito;
          this.draft.monto = resume.monto;
          this.draft.para = resume.para;
          this.draft.categoria = resume.categoria;
          this.draft.gastoMensualId = resume.gastoMensualId;
          this.draft.descripcion = resume.descripcion;
          this.draft.medio = "efectivo";
          var bolsas = S.bolsasDe(yo, true);
          if (bolsas.length === 1) this.draft.bolsaId = bolsas[0].id;
          return { ok: true, resumed: true, msg: "Retiro anotado. Ahora sigue el gasto o préstamo." };
        }
      } else if (d.accion === "prestamo") {
        res = S.registrarPrestamo({
          yo: d.yo, para: d.para, monto: d.monto, medio: d.medio,
          bolsaId: d.bolsaId, proposito: d.proposito, fecha: d.fecha, descripcion: d.descripcion
        });
      } else if (d.accion === "me_prestaron") {
        res = S.registrarMePrestaron({
          yo: d.yo, de: d.de, monto: d.monto, medio: d.medio, fecha: d.fecha
        });
      } else {
        var desc = d.descripcion;
        if (!desc) {
          desc = d.categoria || "Gasto";
          if (d.desglose && d.desglose.length) {
            desc = d.desglose.map(function (x) { return x.subcategoria; }).join(", ");
          } else if (d.subcategoria) desc = d.subcategoria;
        }
        res = S.registrarGasto({
          yo: d.yo, ambito: d.ambito, monto: d.monto, medio: d.medio,
          bolsaId: d.bolsaId, categoria: d.categoria, subcategoria: d.subcategoria,
          desglose: d.partir ? d.desglose : null,
          fecha: d.fecha, descripcion: desc, gastoMensualId: d.gastoMensualId
        });
      }
      if (!res || !res.ok) return { ok: false, error: (res && res.error) || "No se pudo guardar." };
      var yoKeep = d.yo;
      this.reset();
      this.draft.yo = yoKeep;
      return { ok: true, msg: "Listo, ya quedó anotado." };
    },

    parseChat: function (text) {
      var raw = String(text || "").trim();
      if (!raw) return { error: "Escribe algo." };
      var t = fold(raw);
      var d = this.draft;
      var step = this.step();
      var applied = [];

      var member = this._matchMember(t);
      if (member && !d.yo) { d.yo = member.id; S.setUltimoYo(member.id); applied.push("persona"); }

      var monto = this._firstAmount(t);
      var restAfter = this._restAfterAmount(raw);

      if (!d.accion) {
        if (/(saqu|retir|me llego|me pagaron|sueldo|ingreso)/.test(t)) d.accion = "ingreso";
        else if (/(me presto|me prestaron)/.test(t)) d.accion = "me_prestaron";
        else if (/(prest|le di|le pase)/.test(t)) d.accion = "prestamo";
        else if (/(gast|pag|compr|mercado|luz|agua)/.test(t)) d.accion = "gasto";
      }

      if (d.accion === "gasto" && !d.ambito) {
        if (/(solo mio|mio|personal|medicina|ropa)/.test(t)) d.ambito = "individual";
        else if (/(casa|familiar|mercado|luz|agua|internet|comisariato)/.test(t)) d.ambito = "familiar";
      }

      if (/(efectivo|cash|billete)/.test(t) && !d.medio) d.medio = "efectivo";
      if (/(transfer|tarjeta|nequi|digital|app)/.test(t) && !d.medio) d.medio = "digital";

      var cat = this._matchCategoria(t, d.ambito || "familiar");
      if (cat && d.accion === "gasto" && !d.categoria) d.categoria = cat;

      var sub = this._matchSub(t, d.categoria);
      if (step.id === "desglose" && (sub || this._pendingSub) && monto) {
        var err = this.addDesglose(sub || this._pendingSub, monto);
        if (err) return { error: err };
        return { ok: true };
      }

      if (step.id === "desglose" && sub && !monto) {
        this._pendingSub = sub;
        return { ok: true, ask: "¿Cuánto fue en " + sub + "?" };
      }

      if (d.accion === "prestamo" && member && member.id !== d.yo && !d.para) d.para = member.id;
      if (d.accion === "me_prestaron" && member && member.id !== d.yo && !d.de) d.de = member.id;

      if (step.type === "amount" || (d.accion && d.monto == null)) {
        if (monto) d.monto = monto;
      }

      if (step.id === "confirm" && /^(si|sí|ok|okay|guarda|guardar|listo|yes|dale)\b/.test(t)) {
        return { ok: true, commit: true };
      }

      if (step.type === "choices") {
        var hit = this._matchChoice(t, step.choices);
        if (hit) this.choose(hit.id);
      }

      if (d.accion === "ingreso" && /(cajero|retir)/.test(t)) d.origen = d.origen || "retiro";
      if (d.accion === "ingreso" && !d.forma && /(efectivo|mano|billete)/.test(t)) d.forma = "efectivo";

      return { ok: true, extra: restAfter };
    },

    _firstAmount: function (t) {
      var m = String(t).replace(",", ".").match(/(\d+(?:\.\d{1,2})?)/);
      if (!m) return null;
      var n = round2(m[1]);
      return n > 0 ? n : null;
    },

    _restAfterAmount: function (raw) {
      return String(raw).replace(/\$?\s*\d+(?:[.,]\d{1,2})?/, "").trim();
    },

    _matchMember: function (t) {
      var found = null;
      S.data.miembros.forEach(function (m) {
        var n = fold(m.nombre);
        if (n.length >= 3 && t.indexOf(n) !== -1) found = m;
        else if (n.length >= 2 && new RegExp("\\b" + n + "\\b").test(t)) found = m;
      });
      return found;
    },

    _matchCategoria: function (t, ambito) {
      if (ambito === "individual") {
        var hit = null;
        C.CATEGORIAS_INDIVIDUAL.forEach(function (c) {
          if (t.indexOf(fold(c)) !== -1) hit = c;
        });
        if (/medicin/.test(t)) hit = "Medicina";
        return hit;
      }
      if (/mercado|comida|super/.test(t)) return "Mercado";
      if (/luz|agua|internet|gas|telefono|servicio/.test(t)) return "Servicios Básicos";
      if (/limpieza|higiene|comisariato|papel/.test(t)) return "Comisariato";
      if (/gasolina|bus|transporte/.test(t)) return "Transporte";
      if (/salud|medic|dentista|medico/.test(t)) return "Salud";
      if (/escuel|educacion|util/.test(t)) return "Educación";
      var found = null;
      Object.keys(C.CATEGORIAS_FAMILIAR).forEach(function (c) {
        if (t.indexOf(fold(c)) !== -1) found = c;
      });
      return found;
    },

    _matchSub: function (t, cat) {
      var list = (cat && C.CATEGORIAS_FAMILIAR[cat]) || [];
      var found = null;
      list.forEach(function (s) {
        var f = fold(s);
        var short = f.split(" ")[0];
        if (t.indexOf(f) !== -1 || (short.length >= 4 && t.indexOf(short) !== -1)) found = s;
      });
      if (/carne|prote/.test(t)) found = found || "Carne y proteínas";
      if (/verdura/.test(t)) found = found || "Verduras";
      if (/fruta/.test(t)) found = found || "Frutas";
      if (/lacteo|leche/.test(t)) found = found || "Lácteos";
      return found;
    },

    _matchChoice: function (t, choices) {
      var found = null;
      (choices || []).forEach(function (c) {
        var f = fold(c.label);
        if (t.indexOf(f) !== -1) found = c;
      });
      return found;
    }
  };

  global.FamiliarWizard = Wizard;
})(window);

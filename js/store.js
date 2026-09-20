(function (global) {
  "use strict";

  var STORAGE_KEY = "familiar_gastos_v1";

  var CATEGORIAS_FAMILIAR = {
    "Servicios Básicos": ["Luz", "Agua", "Internet", "Gas", "Teléfono", "Otros servicios"],
    Mercado: ["Carne y proteínas", "Frutas", "Verduras", "Lácteos", "Granos y cereales", "Bebidas", "Condimentos y aditivos", "Otros"],
    Comisariato: ["Artículos de limpieza", "Artículos de higiene personal", "Papel y servilletas", "Otros artículos"],
    Transporte: ["Gasolina", "Transporte público", "Mantenimiento vehículo", "Estacionamiento", "Otros"],
    Salud: ["Medicinas", "Médico/Consultas", "Dentista", "Otros"],
    Educación: ["Útiles escolares", "Cuotas/Mensualidades", "Otros"],
    Otros: ["Otros"]
  };

  var CATEGORIAS_INDIVIDUAL = [
    "Medicina",
    "Ropa",
    "Transporte personal",
    "Entretenimiento",
    "Otros"
  ];

  var MEDIOS_DIGITAL = [
    { id: "transferencia", label: "Transferencia" },
    { id: "tarjeta", label: "Tarjeta" },
    { id: "app", label: "App / billetera" },
    { id: "otro_digital", label: "Otro pago digital" }
  ];

  var ORIGEN_INGRESO = [
    { id: "retiro", label: "Retiro de cajero / banco" },
    { id: "sueldo", label: "Sueldo o pago" },
    { id: "transferencia", label: "Me transfirieron" },
    { id: "otro", label: "Otro" }
  ];

  var MESES_NOMBRE = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  var MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  function uid(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function mesKey(date) {
    var d = date instanceof Date ? date : parseFecha(date);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    return d.getFullYear() + "-" + m;
  }

  function parseFecha(value) {
    if (value instanceof Date) return value;
    var parts = String(value).split("-");
    if (parts.length >= 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date(value);
  }

  function hoyISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function ahoraHora() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function etiquetaMes(key) {
    var parts = key.split("-");
    return MESES_NOMBRE[Number(parts[1]) - 1] + " " + parts[0];
  }

  function fechaCorta(iso) {
    var p = String(iso).split("-");
    if (p.length < 3) return iso;
    return Number(p[2]) + " " + MESES_CORTO[Number(p[1]) - 1];
  }

  function mesAnteriorKey(key) {
    var parts = key.split("-");
    var y = Number(parts[0]);
    var m = Number(parts[1]) - 1;
    if (m === 0) { y -= 1; m = 12; }
    return y + "-" + String(m).padStart(2, "0");
  }

  function mesSiguienteKey(key) {
    var parts = key.split("-");
    var y = Number(parts[0]);
    var m = Number(parts[1]) + 1;
    if (m === 13) { y += 1; m = 1; }
    return y + "-" + String(m).padStart(2, "0");
  }

  function defaultMensuales() {
    return [
      { id: uid("gm"), nombre: "Luz", categoria: "Servicios Básicos", subcategoria: "Luz", diaPago: 5, montoEstimado: 0, quienSuelePagar: null, activo: true },
      { id: uid("gm"), nombre: "Agua", categoria: "Servicios Básicos", subcategoria: "Agua", diaPago: 10, montoEstimado: 0, quienSuelePagar: null, activo: true },
      { id: uid("gm"), nombre: "Internet", categoria: "Servicios Básicos", subcategoria: "Internet", diaPago: 15, montoEstimado: 0, quienSuelePagar: null, activo: true }
    ];
  }

  function defaultState() {
    var key = mesKey(new Date());
    return {
      version: 2,
      miembros: [],
      transacciones: [],
      bolsas: [],
      gastosMensuales: defaultMensuales(),
      meses: {},
      mesSeleccionado: key,
      ultimoYo: null,
      setupHecho: false
    };
  }

  function asegurarMes(state, key) {
    if (!state.meses[key]) {
      state.meses[key] = { metaPresupuestaria: 0, cerrado: false, resumen: null };
    }
    return state.meses[key];
  }

  function migrar(data) {
    if (!data.bolsas) data.bolsas = [];
    if (!data.gastosMensuales) data.gastosMensuales = defaultMensuales();
    if (!data.ultimoYo) data.ultimoYo = null;
    if (!data.transacciones) data.transacciones = [];
    data.version = 2;
    return data;
  }

  function etiquetaOrigen(origen) {
    if (origen === "retiro") return "Retiro";
    if (origen === "sueldo") return "Sueldo";
    if (origen === "transferencia") return "Transferencia";
    if (origen === "prestamo") return "Préstamo recibido";
    return "Dinero";
  }

  var Store = {
    data: defaultState(),

    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          this.data = defaultState();
          return this.data;
        }
        var parsed = JSON.parse(raw);
        this.data = migrar(Object.assign(defaultState(), parsed));
        if (!this.data.meses) this.data.meses = {};
        asegurarMes(this.data, this.data.mesSeleccionado || mesKey(new Date()));
        return this.data;
      } catch (err) {
        this.data = defaultState();
        return this.data;
      }
    },

    save: function () {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    },

    reset: function () {
      this.data = defaultState();
      this.save();
    },

    completarSetup: function (nombres) {
      this.data.miembros = nombres.map(function (nombre) {
        return { id: uid("m"), nombre: nombre.trim(), activo: true };
      });
      this.data.setupHecho = true;
      this.data.mesSeleccionado = mesKey(new Date());
      this.data.gastosMensuales = defaultMensuales();
      asegurarMes(this.data, this.data.mesSeleccionado);
      this.save();
    },

    setUltimoYo: function (id) {
      this.data.ultimoYo = id;
      this.save();
    },

    miembrosActivos: function () {
      return this.data.miembros.filter(function (m) { return m.activo; });
    },

    miembroPorId: function (id) {
      for (var i = 0; i < this.data.miembros.length; i++) {
        if (this.data.miembros[i].id === id) return this.data.miembros[i];
      }
      return null;
    },

    nombre: function (id) {
      var m = this.miembroPorId(id);
      return m ? m.nombre : "Alguien";
    },

    agregarMiembro: function (nombre) {
      this.data.miembros.push({ id: uid("m"), nombre: nombre.trim(), activo: true });
      this.save();
    },

    editarMiembro: function (id, nombre) {
      var m = this.miembroPorId(id);
      if (m) { m.nombre = nombre.trim(); this.save(); }
    },

    setActivo: function (id, activo) {
      var m = this.miembroPorId(id);
      if (!m) return;
      if (!activo) {
        var activos = this.miembrosActivos();
        if (activos.length <= 2 && m.activo) return false;
      }
      m.activo = activo;
      this.save();
      return true;
    },

    quitarMiembro: function (id) {
      if (this.data.miembros.length <= 2) return false;
      this.data.miembros = this.data.miembros.filter(function (m) { return m.id !== id; });
      this.save();
      return true;
    },

    mesActual: function () {
      asegurarMes(this.data, this.data.mesSeleccionado);
      return this.data.meses[this.data.mesSeleccionado];
    },

    setMes: function (key) {
      this.data.mesSeleccionado = key;
      asegurarMes(this.data, key);
      this.save();
    },

    setMeta: function (monto) {
      this.mesActual().metaPresupuestaria = Number(monto) || 0;
      this.save();
    },

    txsDelMes: function (key) {
      key = key || this.data.mesSeleccionado;
      return this.data.transacciones.filter(function (tx) {
        return String(tx.fecha).slice(0, 7) === key;
      });
    },

    bolsaPorId: function (id) {
      for (var i = 0; i < this.data.bolsas.length; i++) {
        if (this.data.bolsas[i].id === id) return this.data.bolsas[i];
      }
      return null;
    },

    etiquetaBolsa: function (bolsa) {
      if (!bolsa) return "Efectivo";
      return etiquetaOrigen(bolsa.origen) + " del " + fechaCorta(bolsa.fecha) + " · quedan " + this.fmtMoney(bolsa.restante);
    },

    fmtMoney: function (n) {
      var v = round2(n);
      var neg = v < 0;
      v = Math.abs(v);
      var parts = v.toFixed(2).split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return (neg ? "-$" : "$") + parts.join(".");
    },

    bolsasDe: function (memberId, soloConSaldo) {
      return this.data.bolsas.filter(function (b) {
        if (b.dueno !== memberId) return false;
        if (b.forma !== "efectivo") return false;
        if (soloConSaldo && round2(b.restante) <= 0) return false;
        return true;
      }).sort(function (a, b) {
        return String(b.fecha).localeCompare(String(a.fecha));
      });
    },

    efectivoEnMano: function (memberId) {
      var total = 0;
      this.bolsasDe(memberId, true).forEach(function (b) { total += b.restante; });
      return round2(total);
    },

    crearBolsa: function (opts) {
      var bolsa = {
        id: uid("b"),
        dueno: opts.dueno,
        forma: opts.forma || "efectivo",
        origen: opts.origen || "retiro",
        montoInicial: round2(opts.monto),
        restante: round2(opts.monto),
        fecha: opts.fecha || hoyISO(),
        descripcion: opts.descripcion || "",
        txId: opts.txId || null,
        prestamoId: opts.prestamoId || null
      };
      this.data.bolsas.unshift(bolsa);
      return bolsa;
    },

    usarBolsa: function (bolsaId, monto) {
      var b = this.bolsaPorId(bolsaId);
      if (!b) return { ok: false, error: "No encuentro ese dinero." };
      monto = round2(monto);
      if (round2(b.restante) + 0.001 < monto) {
        return { ok: false, error: "En ese retiro solo quedan " + this.fmtMoney(b.restante) + "." };
      }
      b.restante = round2(b.restante - monto);
      return { ok: true, bolsa: b };
    },

    devolverBolsa: function (bolsaId, monto) {
      var b = this.bolsaPorId(bolsaId);
      if (!b) return;
      b.restante = round2(b.restante + monto);
    },

    agregarTx: function (tx) {
      var mes = asegurarMes(this.data, String(tx.fecha).slice(0, 7));
      if (mes.cerrado) return { ok: false, error: "Este mes ya está cerrado." };
      tx.id = tx.id || uid("tx");
      tx.creadoEn = tx.creadoEn || new Date().toISOString();
      if (!tx.hora) tx.hora = ahoraHora();
      tx.monto = round2(tx.monto);
      this.data.transacciones.unshift(tx);
      this.save();
      return { ok: true, tx: tx };
    },

    registrarIngreso: function (d) {
      var tx = {
        tipo: "ingreso",
        fecha: d.fecha || hoyISO(),
        monto: d.monto,
        descripcion: d.descripcion || etiquetaOrigen(d.origen),
        quienPago: d.yo,
        origen: d.origen,
        medio: d.forma,
        forma: d.forma
      };
      var res = this.agregarTx(tx);
      if (!res.ok) return res;
      if (d.forma === "efectivo") {
        var bolsa = this.crearBolsa({
          dueno: d.yo,
          forma: "efectivo",
          origen: d.origen,
          monto: d.monto,
          fecha: tx.fecha,
          descripcion: tx.descripcion,
          txId: tx.id
        });
        tx.bolsaId = bolsa.id;
        this.save();
        res.bolsa = bolsa;
      }
      return res;
    },

    registrarGasto: function (d) {
      var tx = {
        tipo: d.ambito === "familiar" ? "familiar" : "individual",
        fecha: d.fecha || hoyISO(),
        monto: d.monto,
        descripcion: d.descripcion || d.categoria || "Gasto",
        quienPago: d.yo,
        medio: d.medio,
        forma: d.medio === "efectivo" ? "efectivo" : "digital",
        bolsaId: d.bolsaId || null,
        categoria: d.ambito === "familiar" ? d.categoria : null,
        subcategoria: d.ambito === "familiar" ? (d.subcategoria || null) : null,
        categoriaIndividual: d.ambito === "individual" ? d.categoria : null,
        desglose: d.desglose || null,
        gastoMensualId: d.gastoMensualId || null,
        esFijo: !!d.gastoMensualId,
        conDineroPrestado: false,
        deQuienPrestado: null
      };
      if (d.bolsaId) {
        var bolsa = this.bolsaPorId(d.bolsaId);
        if (bolsa && bolsa.origen === "prestamo" && bolsa.prestamoId) {
          var prestamo = this.data.transacciones.filter(function (t) { return t.id === bolsa.prestamoId; })[0];
          if (prestamo) {
            tx.conDineroPrestado = true;
            tx.deQuienPrestado = prestamo.de;
          }
        }
        var uso = this.usarBolsa(d.bolsaId, d.monto);
        if (!uso.ok) return uso;
      }
      var res = this.agregarTx(tx);
      if (!res.ok && d.bolsaId) this.devolverBolsa(d.bolsaId, d.monto);
      if (res.ok && d.gastoMensualId && d.monto) {
        var gm = this.gastoMensualPorId(d.gastoMensualId);
        if (gm) {
          gm.montoEstimado = round2(d.monto);
          if (d.yo) gm.quienSuelePagar = d.yo;
          this.save();
        }
      }
      return res;
    },

    registrarPrestamo: function (d) {
      var tx = {
        tipo: "prestamo",
        fecha: d.fecha || hoyISO(),
        monto: d.monto,
        descripcion: d.descripcion || "Préstamo",
        de: d.yo,
        para: d.para,
        proposito: d.proposito || "familiar",
        medio: d.medio,
        forma: d.medio === "efectivo" ? "efectivo" : "digital",
        bolsaId: d.bolsaId || null
      };
      if (d.bolsaId) {
        var uso = this.usarBolsa(d.bolsaId, d.monto);
        if (!uso.ok) return uso;
      }
      var res = this.agregarTx(tx);
      if (!res.ok && d.bolsaId) {
        this.devolverBolsa(d.bolsaId, d.monto);
        return res;
      }
      if (d.medio === "efectivo") {
        this.crearBolsa({
          dueno: d.para,
          forma: "efectivo",
          origen: "prestamo",
          monto: d.monto,
          fecha: tx.fecha,
          descripcion: "Préstamo de " + this.nombre(d.yo),
          txId: tx.id,
          prestamoId: tx.id
        });
        this.save();
      }
      return res;
    },

    registrarMePrestaron: function (d) {
      var tx = {
        tipo: "prestamo",
        fecha: d.fecha || hoyISO(),
        monto: d.monto,
        descripcion: d.descripcion || "Me prestaron",
        de: d.de,
        para: d.yo,
        proposito: d.proposito || "individual",
        medio: d.medio,
        forma: d.medio === "efectivo" ? "efectivo" : "digital",
        bolsaId: d.bolsaId || null
      };
      var res = this.agregarTx(tx);
      if (!res.ok) return res;
      if (d.medio === "efectivo") {
        this.crearBolsa({
          dueno: d.yo,
          forma: "efectivo",
          origen: "prestamo",
          monto: d.monto,
          fecha: tx.fecha,
          descripcion: "Préstamo de " + this.nombre(d.de),
          txId: tx.id,
          prestamoId: tx.id
        });
        this.save();
      }
      return res;
    },

    eliminarTx: function (id) {
      var tx = this.data.transacciones.filter(function (t) { return t.id === id; })[0];
      if (!tx) return false;
      var key = String(tx.fecha).slice(0, 7);
      if (this.data.meses[key] && this.data.meses[key].cerrado) return false;

      if (tx.tipo === "ingreso" && tx.bolsaId) {
        var bIn = this.bolsaPorId(tx.bolsaId);
        if (bIn && round2(bIn.restante) < round2(bIn.montoInicial) - 0.009) {
          return { ok: false, error: "Ese retiro ya se usó. Borra primero los gastos o préstamos que salieron de ahí." };
        }
      }
      if (tx.tipo === "prestamo") {
        var usado = this.data.bolsas.some(function (x) {
          return x.prestamoId === tx.id && round2(x.restante) < round2(x.montoInicial) - 0.009;
        });
        if (usado) return { ok: false, error: "Ese préstamo ya se gastó. Borra primero esos gastos." };
      }

      if (tx.bolsaId && (tx.tipo === "familiar" || tx.tipo === "individual" || tx.tipo === "prestamo")) {
        this.devolverBolsa(tx.bolsaId, tx.monto);
      }
      if (tx.tipo === "ingreso" && tx.bolsaId) {
        this.data.bolsas = this.data.bolsas.filter(function (x) { return x.id !== tx.bolsaId; });
      }
      if (tx.tipo === "prestamo") {
        this.data.bolsas = this.data.bolsas.filter(function (x) { return x.prestamoId !== tx.id; });
      }

      this.data.transacciones = this.data.transacciones.filter(function (t) { return t.id !== id; });
      this.save();
      return true;
    },

    gastoMensualPorId: function (id) {
      for (var i = 0; i < this.data.gastosMensuales.length; i++) {
        if (this.data.gastosMensuales[i].id === id) return this.data.gastosMensuales[i];
      }
      return null;
    },

    guardarGastoMensual: function (gm) {
      if (gm.id) {
        var cur = this.gastoMensualPorId(gm.id);
        if (cur) {
          cur.nombre = gm.nombre;
          cur.categoria = gm.categoria;
          cur.subcategoria = gm.subcategoria;
          cur.diaPago = Number(gm.diaPago) || 1;
          cur.montoEstimado = round2(gm.montoEstimado);
          cur.quienSuelePagar = gm.quienSuelePagar || null;
          cur.activo = gm.activo !== false;
          this.save();
          return cur;
        }
      }
      var nuevo = {
        id: uid("gm"),
        nombre: gm.nombre,
        categoria: gm.categoria || "Servicios Básicos",
        subcategoria: gm.subcategoria || "Otros servicios",
        diaPago: Number(gm.diaPago) || 1,
        montoEstimado: round2(gm.montoEstimado),
        quienSuelePagar: gm.quienSuelePagar || null,
        activo: true
      };
      this.data.gastosMensuales.push(nuevo);
      this.save();
      return nuevo;
    },

    quitarGastoMensual: function (id) {
      this.data.gastosMensuales = this.data.gastosMensuales.filter(function (g) { return g.id !== id; });
      this.save();
    },

    pagosDeMensual: function (id, key) {
      return this.txsDelMes(key).filter(function (tx) { return tx.gastoMensualId === id; });
    },

    recordatorios: function (key) {
      key = key || this.data.mesSeleccionado;
      var parts = key.split("-");
      var y = Number(parts[0]);
      var m = Number(parts[1]);
      var lastDay = new Date(y, m, 0).getDate();
      var hoy = hoyISO();
      var hoyDia = Number(hoy.slice(8, 10));
      var esEsteMes = key === mesKey(new Date());
      var self = this;
      return this.data.gastosMensuales.filter(function (g) { return g.activo; }).map(function (g) {
        var dia = Math.min(g.diaPago, lastDay);
        var fecha = key + "-" + String(dia).padStart(2, "0");
        var pagos = self.pagosDeMensual(g.id, key);
        var pagado = pagos.reduce(function (s, t) { return s + t.monto; }, 0);
        var estado = "pendiente";
        if (pagado > 0) estado = "pagado";
        else if (esEsteMes && hoyDia > dia) estado = "atrasado";
        else if (esEsteMes && hoyDia === dia) estado = "hoy";
        else if (esEsteMes && dia - hoyDia <= 3) estado = "proximo";
        return {
          gm: g,
          fecha: fecha,
          dia: dia,
          pagado: round2(pagado),
          pagos: pagos,
          estado: estado
        };
      }).sort(function (a, b) { return a.dia - b.dia; });
    },

    cerrarMes: function () {
      var key = this.data.mesSeleccionado;
      var mes = asegurarMes(this.data, key);
      mes.cerrado = true;
      mes.resumen = this.resumenMes(key);
      mes.resumen.cerradoEn = new Date().toISOString();
      this.save();
      return mes.resumen;
    },

    reabrirMes: function () {
      this.mesActual().cerrado = false;
      this.save();
    },

    nuevoMes: function () {
      var actual = this.data.mesSeleccionado;
      var siguiente = mesSiguienteKey(actual);
      var metaAnterior = this.data.meses[actual] ? this.data.meses[actual].metaPresupuestaria : 0;
      asegurarMes(this.data, siguiente);
      this.data.meses[siguiente].metaPresupuestaria = metaAnterior;
      this.data.mesSeleccionado = siguiente;
      this.save();
      return { mes: siguiente };
    },

    exportarJSON: function () {
      return JSON.stringify(this.data, null, 2);
    },

    exportarCSV: function () {
      var self = this;
      var rows = [["Fecha", "Hora", "Tipo", "Monto", "Descripción", "Quién", "Para", "Categoría", "Subcategoría", "Medio", "De qué efectivo", "Mensual"]];
      this.data.transacciones.forEach(function (tx) {
        var bolsa = tx.bolsaId ? self.bolsaPorId(tx.bolsaId) : null;
        var sub = tx.subcategoria || "";
        if (tx.desglose && tx.desglose.length) {
          sub = tx.desglose.map(function (d) { return d.subcategoria + " " + d.monto; }).join("; ");
        }
        rows.push([
          tx.fecha, tx.hora || "", tx.tipo, tx.monto,
          (tx.descripcion || "").replace(/"/g, '""'),
          self.nombre(tx.de || tx.quienPago),
          tx.para ? self.nombre(tx.para) : "",
          tx.categoria || tx.categoriaIndividual || tx.origen || "",
          sub,
          tx.medio || tx.forma || "",
          bolsa ? etiquetaOrigen(bolsa.origen) + " " + bolsa.fecha : "",
          tx.gastoMensualId ? "sí" : ""
        ]);
      });
      return "\uFEFF" + rows.map(function (r) {
        return r.map(function (c) { return '"' + String(c) + '"'; }).join(",");
      }).join("\n");
    },

    resumenMes: function (key) {
      key = key || this.data.mesSeleccionado;
      var txs = this.txsDelMes(key);
      var activos = this.miembrosActivos();
      var n = Math.max(activos.length, 1);
      var gastoFamiliar = 0, gastoIndividual = 0, prestado = 0, ingresos = 0;
      var pagadoPor = {};
      var porCategoria = {};
      var porSub = {};
      activos.forEach(function (m) { pagadoPor[m.id] = 0; });

      txs.forEach(function (tx) {
        if (tx.tipo === "familiar") {
          gastoFamiliar += tx.monto;
          if (pagadoPor[tx.quienPago] == null) pagadoPor[tx.quienPago] = 0;
          pagadoPor[tx.quienPago] += tx.monto;
          var cat = tx.categoria || "Otros";
          porCategoria[cat] = (porCategoria[cat] || 0) + tx.monto;
          if (!porSub[cat]) porSub[cat] = {};
          if (tx.desglose && tx.desglose.length) {
            tx.desglose.forEach(function (d) {
              porSub[cat][d.subcategoria] = (porSub[cat][d.subcategoria] || 0) + d.monto;
            });
          } else {
            var sub = tx.subcategoria || "Otros";
            porSub[cat][sub] = (porSub[cat][sub] || 0) + tx.monto;
          }
        } else if (tx.tipo === "individual") {
          gastoIndividual += tx.monto;
        } else if (tx.tipo === "prestamo") {
          prestado += tx.monto;
        } else if (tx.tipo === "ingreso") {
          ingresos += tx.monto;
        }
      });

      var efectivo = 0;
      var self = this;
      activos.forEach(function (m) { efectivo += self.efectivoEnMano(m.id); });

      return {
        gastoFamiliar: round2(gastoFamiliar),
        gastoIndividual: round2(gastoIndividual),
        prestado: round2(prestado),
        ingresos: round2(ingresos),
        efectivoEnMano: round2(efectivo),
        promedio: round2(gastoFamiliar / n),
        pagadoPor: pagadoPor,
        porCategoria: porCategoria,
        porSub: porSub,
        nActivos: n
      };
    },

    ranking: function (key) {
      var resumen = this.resumenMes(key);
      return this.miembrosActivos().map(function (m) {
        var pagado = resumen.pagadoPor[m.id] || 0;
        return { id: m.id, nombre: m.nombre, pagado: pagado, deberia: resumen.promedio, diferencia: pagado - resumen.promedio };
      }).sort(function (a, b) { return b.pagado - a.pagado; });
    },

    deudas: function (key) {
      key = key || this.data.mesSeleccionado;
      var txs = this.txsDelMes(key);
      var activos = this.miembrosActivos();
      var net = {};
      var ids = activos.map(function (m) { return m.id; });
      ids.forEach(function (id) { net[id] = 0; });

      txs.forEach(function (tx) {
        if (tx.tipo === "prestamo") {
          if (net[tx.de] == null) net[tx.de] = 0;
          if (net[tx.para] == null) net[tx.para] = 0;
          net[tx.de] += tx.monto;
          net[tx.para] -= tx.monto;
        }
      });

      var familiar = txs.filter(function (tx) { return tx.tipo === "familiar"; });
      var total = 0;
      familiar.forEach(function (tx) { total += tx.monto; });
      var n = Math.max(activos.length, 1);
      var share = total / n;
      familiar.forEach(function (tx) {
        if (net[tx.quienPago] == null) net[tx.quienPago] = 0;
        net[tx.quienPago] += tx.monto;
      });
      ids.forEach(function (id) { net[id] -= share; });
      return simplificar(net, this);
    }
  };

  function simplificar(net, store) {
    var EPS = 0.009;
    var deudores = [];
    var acreedores = [];
    Object.keys(net).forEach(function (id) {
      var v = round2(net[id]);
      if (v < -EPS) deudores.push({ id: id, monto: -v });
      else if (v > EPS) acreedores.push({ id: id, monto: v });
    });
    deudores.sort(function (a, b) { return b.monto - a.monto; });
    acreedores.sort(function (a, b) { return b.monto - a.monto; });
    var pares = [];
    var i = 0, j = 0;
    while (i < deudores.length && j < acreedores.length) {
      var pagar = round2(Math.min(deudores[i].monto, acreedores[j].monto));
      if (pagar > EPS) {
        pares.push({
          de: deudores[i].id, para: acreedores[j].id,
          deNombre: store.nombre(deudores[i].id),
          paraNombre: store.nombre(acreedores[j].id),
          monto: pagar
        });
      }
      deudores[i].monto = round2(deudores[i].monto - pagar);
      acreedores[j].monto = round2(acreedores[j].monto - pagar);
      if (deudores[i].monto <= EPS) i += 1;
      if (acreedores[j].monto <= EPS) j += 1;
    }
    return pares;
  }

  global.FamiliarStore = Store;
  global.FamiliarConst = {
    CATEGORIAS_FAMILIAR: CATEGORIAS_FAMILIAR,
    CATEGORIAS_INDIVIDUAL: CATEGORIAS_INDIVIDUAL,
    MEDIOS_DIGITAL: MEDIOS_DIGITAL,
    ORIGEN_INGRESO: ORIGEN_INGRESO,
    MESES_NOMBRE: MESES_NOMBRE,
    mesKey: mesKey,
    hoyISO: hoyISO,
    ahoraHora: ahoraHora,
    etiquetaMes: etiquetaMes,
    fechaCorta: fechaCorta,
    mesAnteriorKey: mesAnteriorKey,
    mesSiguienteKey: mesSiguienteKey,
    round2: round2
  };
})(window);

(function () {
  "use strict";

  var deferredPrompt = null;
  var listening = false;
  var recognition = null;

  function standalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function canInstall() {
    return !!deferredPrompt && !standalone();
  }

  function toast(msg) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
    setTimeout(function () { el.classList.add("hidden"); }, 2600);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    document.dispatchEvent(new CustomEvent("familiar-installable"));
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    toast("Ya está en el inicio. Di: Ok Google, abre Familia.");
    document.dispatchEvent(new CustomEvent("familiar-installed"));
  });

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    var https = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!https) return;
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }

  function installApp() {
    if (!deferredPrompt) {
      toast("En Chrome: menú (⋮) → Instalar app, o Añadir a la pantalla de inicio.");
      return Promise.resolve(false);
    }
    return deferredPrompt.prompt().then(function () {
      return deferredPrompt.userChoice;
    }).then(function (choice) {
      deferredPrompt = null;
      return choice && choice.outcome === "accepted";
    }).catch(function () {
      return false;
    });
  }

  function hasSpeech() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function stopListen() {
    listening = false;
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    document.dispatchEvent(new CustomEvent("familiar-listen", { detail: { on: false } }));
  }

  function startListen(onText) {
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      toast("Este navegador no deja hablar. Usa Chrome en Android.");
      return;
    }
    if (listening) {
      stopListen();
      return;
    }
    recognition = new Rec();
    recognition.lang = "es-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = function () {
      listening = true;
      document.dispatchEvent(new CustomEvent("familiar-listen", { detail: { on: true } }));
    };
    recognition.onerror = function () {
      stopListen();
      toast("No se oyó. Prueba otra vez cerca del micrófono.");
    };
    recognition.onend = function () {
      listening = false;
      document.dispatchEvent(new CustomEvent("familiar-listen", { detail: { on: false } }));
    };
    recognition.onresult = function (ev) {
      var text = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : "";
      stopListen();
      if (text && onText) onText(text);
    };
    try {
      recognition.start();
    } catch (e) {
      toast("No se pudo abrir el micrófono.");
    }
  }

  window.FamiliarPWA = {
    registerSW: registerSW,
    installApp: installApp,
    canInstall: canInstall,
    standalone: standalone,
    hasSpeech: hasSpeech,
    startListen: startListen,
    stopListen: stopListen,
    isListening: function () { return listening; }
  };

  registerSW();
})();

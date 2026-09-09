// Motor de Audio de Alta Penetración (Web Audio API)
let audioCtx = null;

export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === "suspended") {
      audioCtx = new AudioContextClass();
    }

    // Reactivar contexto si el navegador lo suspendió por inactividad
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const duration = 5.0; // 5 segundos de sirena continua

    // 1. Oscilador primario de alta ganancia
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // 2. Modulador LFO de frecuencia (Sirena de Alerta Industrial)
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();

    // Configuración sonora: Onda tipo diente de sierra (sawtooth) penetrante
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1050, now); // Frecuencia central

    // LFO oscilando entre 850Hz y 1250Hz (amplitud de 200Hz a 3.5 ciclos/segundo)
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(3.5, now);
    lfoGain.gain.setValueAtTime(200, now);

    lfo.connect(osc.frequency);

    // Envolvente de volumen: Ataque rápido (0.05s) y máxima potencia
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.exponentialRampToValueAtTime(0.95, now + 0.05);
    gainNode.gain.setValueAtTime(0.95, now + duration - 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Conexión al nodo de salida master
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Arranque y parada sincronizados
    lfo.start(now);
    osc.start(now);

    lfo.stop(now + duration);
    osc.stop(now + duration);

    // Patrón de vibración táctil agresivo para teléfonos
    if ("vibrate" in navigator) {
      navigator.vibrate([600, 200, 600, 200, 600, 200, 600, 200, 600]);
    }
  } catch (err) {
    console.warn("Aviso en el sistema de alarma Web Audio:", err);
  }
};

// Notificación de Sistema Persistente (Rompe segundo plano y despierta dispositivos)
export const triggerBrowserNotification = (title, body) => {
  try {
    if (!("Notification" in window)) return;

    const options = {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      requireInteraction: true, // Se mantiene fija hasta que el administrador la atienda
      tag: "diego-industrial-alert",
      renotify: true,
      vibrate: [600, 200, 600, 200, 600]
    };

    if (Notification.permission === "granted") {
      new Notification(title, options);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(title, options);
        }
      });
    }
  } catch (e) {
    console.warn("Aviso en despacho de notificación nativa:", e);
  }
};
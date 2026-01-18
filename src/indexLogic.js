// src/indexLogic.js
// Versão compatível com React/Vite

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

try {
  gsap.registerPlugin(ScrollTrigger);
} catch (e) {
  console.warn("[Vitaclin] Erro ao registrar ScrollTrigger:", e);
}

// expõe no window para manter seu código atual funcionando
if (typeof window !== "undefined") {
  window.gsap = gsap;
  window.ScrollTrigger = ScrollTrigger;
}

/* ========== SPLIT TEXT / ANIMAÇÕES ========== */
function splitTextForAnimation(el) {
  if (!el || !window.gsap) return [];

  // guarda o original 1x (pra reconstruir quando React reatribuir texto)
  if (!el.dataset.splitOriginal) {
    el.dataset.splitOriginal = el.innerHTML;
  }

  const hasSplit = !!el.querySelector(".split-char");
  const hasRawText = Array.from(el.childNodes).some(
    (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim().length
  );

  // se estava splitado, mas voltou texto puro (React/HMR), refaz do zero
  if (el.dataset.splitInit === "1" && hasSplit && hasRawText) {
    el.innerHTML = el.dataset.splitOriginal;
    delete el.dataset.splitInit;
  }

  // se já está splitado limpo, só retorna
  if (el.dataset.splitInit === "1" && hasSplit) {
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType !== Node.TEXT_NODE) return;
      const t = n.textContent || "";
      if (t.trim().length) n.remove();
    });
    return Array.from(el.querySelectorAll(".split-char"));
  }

  el.dataset.splitInit = "1";
  const originalNodes = Array.from(el.childNodes);
  el.innerHTML = "";
  const chars = [];

  function wrapChars(text, parent) {
    if (!text) return;
    const parts = text.split(/(\s+)/);

    parts.forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        parent.appendChild(document.createTextNode("\u00A0"));
        return;
      }
      const wordSpan = document.createElement("span");
      wordSpan.className = "split-word";
      parent.appendChild(wordSpan);

      for (let i = 0; i < part.length; i++) {
        const chSpan = document.createElement("span");
        chSpan.className = "split-char";
        chSpan.textContent = part[i];
        wordSpan.appendChild(chSpan);
        chars.push(chSpan);
      }
    });
  }

  function walk(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text.length) wrapChars(text, parent);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const clone = node.cloneNode(false);
      parent.appendChild(clone);
      Array.from(node.childNodes).forEach((child) => walk(child, clone));
    }
  }

  originalNodes.forEach((n) => walk(n, el));
  return chars;
}

function splitTextAndAnimate(target, options) {
  if (!window.gsap) return;

  const opts = Object.assign(
    {
      delay: 0.03,
      duration: 0.45,
      ease: "power3.out",
      from: { opacity: 0, y: 40 },
      to: { opacity: 1, y: 0 },
      threshold: 0.2,
      rootMargin: -80,
      useScrollTrigger: false,
    },
    options || {}
  );

  let elements;
  if (typeof target === "string") elements = document.querySelectorAll(target);
  else if (target instanceof Element) elements = [target];
  else if (target && typeof target.length === "number") elements = target;
  else return;

  Array.from(elements).forEach((el) => {
    const chars = splitTextForAnimation(el);
    if (!chars.length) return;

    gsap.killTweensOf(chars);

    const fromVars = Object.assign({}, opts.from);
    const toVars = Object.assign({}, opts.to, {
      duration: opts.duration,
      ease: opts.ease,
      stagger: opts.delay,
    });

    if (opts.useScrollTrigger && window.ScrollTrigger) {
      const startPct = (1 - (opts.threshold || 0.2)) * 100;
      const marginVal =
        typeof opts.rootMargin === "number"
          ? opts.rootMargin
          : parseFloat(opts.rootMargin || 0) || 0;
      const sign =
        marginVal === 0
          ? ""
          : marginVal < 0
          ? `-=${Math.abs(marginVal)}px`
          : `+=${marginVal}px`;
      const start = `top ${startPct}%${sign}`;

      toVars.scrollTrigger = {
        trigger: el,
        start: start,
        once: true,
        toggleActions: "play none none none",
      };
    }

    gsap.fromTo(chars, fromVars, toVars);
  });
}

function animateContent(target, options) {
  if (!window.gsap) return;

  const opts = Object.assign(
    {
      distance: 100,
      direction: "vertical",
      reverse: false,
      duration: 0.8,
      ease: "power3.out",
      initialOpacity: 0,
      animateOpacity: true,
      scale: 1,
      threshold: 0.1,
      delay: 0,
      stagger: 0.08,
      useScrollTrigger: false,
      onComplete: null,
    },
    options || {}
  );

  let elements;
  if (typeof target === "string") elements = document.querySelectorAll(target);
  else if (target instanceof Element) elements = [target];
  else if (target && typeof target.length === "number") elements = target;
  else return;

  elements = Array.from(elements);
  elements.forEach((el, index) => {
    const axis = opts.direction === "horizontal" ? "x" : "y";
    const offset = (opts.reverse ? -1 : 1) * (opts.distance || 100);

    const fromVars = {
      [axis]: offset,
      scale: opts.scale,
      opacity: opts.animateOpacity ? opts.initialOpacity : 1,
    };

    const toVars = {
      [axis]: 0,
      scale: 1,
      opacity: 1,
      duration: opts.duration,
      ease: opts.ease,
      delay: (opts.delay || 0) + (opts.stagger || 0) * index,
    };

    if (
      typeof opts.onComplete === "function" &&
      index === elements.length - 1
    ) {
      toVars.onComplete = opts.onComplete;
    }

    if (opts.useScrollTrigger && window.ScrollTrigger) {
      const startPct = (1 - (opts.threshold || 0.1)) * 100;
      toVars.scrollTrigger = {
        trigger: el,
        start: `top ${startPct}%`,
        toggleActions: "play none none none",
        once: true,
      };
    }

    gsap.fromTo(el, fromVars, toVars);
  });
}

/* ========== CONFIG / MÁSCARAS / UTILS ========== */
const CONFIG = {
  API_URL:
    "https://script.google.com/macros/s/AKfycbx7foVrZRKAjUsM-kf5ElbaNP-MsQbBoFofFGfVAVJgCNtdcEH6BGRiAOe3BFmGnlQo/exec",
  LOCAL_KEY: "vitaclin_indicacoes_v3",
  ADMIN_PASS: "13102712",
  USED_COUPONS_KEY: "vitaclin_cupons_usados_v1",
};

const CouponStore = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.USED_COUPONS_KEY) || "[]");
    } catch (e) {
      return [];
    }
  },
  save(list) {
    localStorage.setItem(CONFIG.USED_COUPONS_KEY, JSON.stringify(list || []));
  },
  has(code) {
    return this.load().includes(code);
  },
  add(code) {
    const list = this.load();
    if (!list.includes(code)) {
      list.push(code);
      this.save(list);
    }
  },
};

// Limite de 3 indicações por mês para o mesmo indicador (nome/cpf/whats)
const MonthStore = {
  KEY: "vitaclin_indicacoes_mes_v1",
  read() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || "{}");
    } catch {
      return {};
    }
  },
  write(obj) {
    localStorage.setItem(this.KEY, JSON.stringify(obj || {}));
  },
};

const Masks = {
  cpf: (el) => {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    el.value = v;
  },
  phone: (el) => {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d)(\d{4})$/, "$1-$2");
    el.value = v;
  },
  date: (el) => {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length >= 5) {
      el.value = v.replace(/(\d{2})(\d{2})(\d{0,4}).*/, "$1/$2/$3");
    } else if (v.length >= 3) {
      el.value = v.replace(/(\d{2})(\d{0,2}).*/, "$1/$2");
    } else {
      el.value = v;
    }
  },
};

const Utils = {
  /* valida WhatsApp com DDD brasileiro */
  isValidPhone(digits) {
    const v = (digits || "").replace(/\D/g, "");
    if (v.length < 10) return false;
    if (/^(\d)\1+$/.test(v)) return false;
    const ddd = v.slice(0, 2);
    const VALID_DDDS = new Set([
      "11","12","13","14","15","16","17","18","19",
      "21","22","24","27","28",
      "31","32","33","34","35","37","38",
      "41","42","43","44","45","46","47","48","49",
      "51","53","54","55",
      "61","62","63","64","65","66","67","68","69",
      "71","73","74","75","77","79",
      "81","82","83","84","85","86","87","88","89",
      "91","92","93","94","95","96","97","98","99",
    ]);
    if (!VALID_DDDS.has(ddd)) return false;
    return true;
  },

  /* valida CPF pelos dígitos verificadores */
  isValidCpf(cpf) {
    const v = (cpf || "").replace(/\D/g, "");
    if (v.length !== 11) return false;
    if (/^(\d)\1+$/.test(v)) return false;
    const calc = (len) => {
      let sum = 0;
      for (let i = 0; i < len; i++)
        sum += parseInt(v[i], 10) * (len + 1 - i);
      const r = (sum * 10) % 11;
      return r === 10 ? 0 : r;
    };
    const d1 = calc(9);
    if (d1 !== parseInt(v[9], 10)) return false;
    const d2 = calc(10);
    return d2 === parseInt(v[10], 10);
  },

  /* permite tanto yyyy-mm-dd quanto dd/mm/aaaa ou dd-mm-aaaa */
  parseBirthDate(value) {
    const v = (value || "").trim();
    if (!v) return null;

    // formato padrão input date
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = new Date(v + "T00:00:00");
      if (!isNaN(d.getTime())) return d;
      return null;
    }

    // formatos dd/mm/aaaa ou dd-mm-aaaa
    const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!m) return null;

    const dia = parseInt(m[1], 10);
    const mes = parseInt(m[2], 10) - 1;
    const ano = parseInt(m[3], 10);

    const d = new Date(ano, mes, dia);
    if (d.getFullYear() !== ano || d.getMonth() !== mes || d.getDate() !== dia) {
      return null;
    }
    return d;
  },

  formatDateISO(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  },
};

/* ========== APP PRINCIPAL ========== */
const App = {
  init: () => {
    try {
      localStorage.removeItem("vitaclin_admin_ok");
    } catch {}
    App.renderIndicadosInputs();
  },

  goTo(step) {
    const targetStep = Number(step);

    // ✅ guarda "step desejado" para o dock não esperar o fim da animação 3D
    window.__VITACLIN_LAST_STEP__ = targetStep;

    // ====== GATE ADMIN ======
    if (targetStep === 7) {
      if (!App.isAdmin()) {
        App.showAdminGate();
        return;
      }
    }
    if (targetStep !== 7) {
      try {
        localStorage.removeItem("vitaclin_admin_ok");
      } catch {}
    }

    // ====== LIMPA ESTADOS DE TRANSIÇÃO ======
    document.querySelectorAll(".step-section").forEach((el) => {
      el.classList.remove(
        "active",
        "step-3d-animating",
        "step-3d-out-forward",
        "step-3d-in-forward",
        "step-3d-out-backward",
        "step-3d-in-backward"
      );
    });

    // ====== ATIVA SEÇÃO ======
    const section = document.querySelector(
      `.step-section[data-step="${targetStep}"]`
    );
    if (section) section.classList.add("active");

    // ✅ avisa React/GSAP que a etapa mudou (dock ou botões)
    window.dispatchEvent(
      new CustomEvent("vitaclin:stepchange", { detail: { step: targetStep } })
    );

    // ✅ SYNC IMEDIATO DO DOCK (sem duplicar lógica)
    if (typeof window.updateDock === "function") {
      window.updateDock(targetStep);
      requestAnimationFrame(() => window.updateDock(targetStep));
      requestAnimationFrame(() => {
        // ✅ libera a prioridade depois que o DOM já teve tempo de refletir
        window.__VITACLIN_LAST_STEP__ = null;
      });
    }

    // ====== CARROSSEL ======
    if (typeof Carousel !== "undefined" && Carousel) {
      if (targetStep === 2) {
        setTimeout(() => {
          // ✅ garante que o DOM da etapa 2 já existe
          Carousel.init && Carousel.init();
          Carousel.recalcWidth && Carousel.recalcWidth();
          Carousel.update && Carousel.update();
        }, 0);

        Carousel.startAutoplay && Carousel.startAutoplay();
      } else {
        Carousel.stopAutoplay && Carousel.stopAutoplay();
      }
    }

    // ====== SCROLL ======
    window.scrollTo({ top: 0, behavior: "smooth" });

    // ====== ADMIN ======
    if (targetStep === 7) {
      Admin.renderLocal();
      Admin.fetchAll();
    }

    // ====== ANIMAÇÕES ======
    if (window.gsap && typeof App.animateCurrentStep === "function") {
      App.animateCurrentStep(targetStep);
    }
  },

  isAdmin: () => {
    try {
      return localStorage.getItem("vitaclin_admin_ok") === "1";
    } catch {
      return false;
    }
  },

  showAdminGate: () => {
    const existing = document.getElementById("adminGate");
    if (existing) {
      existing.style.display = "flex";
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "adminGate";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55)";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#ffffff;border-radius:12px;padding:16px;min-width:260px;max-width:90vw;box-shadow:0 20px 50px rgba(0,0,0,0.3);color:#111827;font-size:14px";

    const title = document.createElement("div");
    title.textContent = "Acesso Admin";
    title.style.cssText = "font-weight:700;margin-bottom:8px";

    const input = document.createElement("input");
    input.type = "password";
    input.placeholder = "Senha";
    input.style.cssText =
      "width:100%;border:1px solid #d1d5db;border-radius:8px;padding:10px;margin:8px 0;background:#fff;caret-color:#111827;color:#111827";

    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;gap:8px;justify-content:flex-end;margin-top:8px";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancelar";
    cancel.style.cssText =
      "border:1px solid #d1d5db;border-radius:999px;padding:8px 12px;background:#fff;color:#374151;cursor:pointer";
    cancel.onclick = () => {
      overlay.style.display = "none";
    };

    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "Entrar";
    ok.style.cssText =
      "border:none;border-radius:999px;padding:8px 12px;background:#111827;color:#fff;cursor:pointer";
    ok.onclick = () => {
      const val = (input.value || "").trim();
      if (val === CONFIG.ADMIN_PASS) {
        try {
          localStorage.setItem("vitaclin_admin_ok", "1");
        } catch {}
        overlay.remove();
        App.goTo(7);
      } else {
        alert("Senha incorreta.");
        input.focus();
      }
    };

    box.appendChild(title);
    box.appendChild(input);
    row.appendChild(cancel);
    row.appendChild(ok);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  logoutAdmin: () => {
    try {
      localStorage.removeItem("vitaclin_admin_ok");
    } catch {}
    App.showAdminGate();
  },

  checkAdmin: () => App.goTo(7),

  renderIndicadosInputs: () => {
    const container = document.getElementById("indicadosContainer");
    if (!container) return;
    let html = "";
    for (let i = 1; i <= 10; i++) {
      const req = i <= 2; // 2 obrigatórios
      const labelStyle = req
        ? "background:rgba(15,118,110,0.1); color:#0f766e;"
        : "";
      html += `
        <div class="indicado-item">
          <div class="indicado-header">
            <span>#${i} indicado</span>
            <span class="indicado-tag" style="${labelStyle}">${
        req ? "Obrigatório" : "Opcional"
      }</span>
          </div>
          <div class="field-group">
            <label>Nome completo</label>
            <input type="text" name="ind_nome_${i}">
          </div>
          <div class="field-row-2">
            <div class="field-group">
              <label>WhatsApp</label>
              <input type="tel" name="ind_whats_${i}" oninput="Masks.phone(this)" placeholder="(99) 99999-9999">
            </div>
            <div class="field-group">
              <label>Instagram (ex: @usuario)</label>
              <input type="text" name="ind_insta_${i}" placeholder="@usuario">
            </div>
          </div>
        </div>`;
    }
    container.innerHTML = html;
  },

  validateStep4: () => {
    const nome = document.getElementById("nomeIndicador").value.trim();
    const cpf = document
      .getElementById("cpfIndicador")
      .value.replace(/\D/g, "");
    const whatsDigits = document
      .getElementById("whatsIndicador")
      .value.replace(/\D/g, "");

    const instaInput = document.getElementById("instaIndicador");
    const instaRaw = instaInput.value.trim();
    const instaSemEspaco = instaRaw.replace(/\s+/g, "");
    const instaLimpo = instaSemEspaco.replace(/^@+/, "");
    const nascStr = document.getElementById("nascIndicador").value.trim();

    if (!nome) return alert("Preencha o seu nome completo.");

    if (!instaLimpo) {
      return alert("Informe seu Instagram (ex: @usuario), sem espaços.");
    }

    if (cpf.length !== 11) return alert("CPF incompleto.");
    if (!Utils.isValidCpf(cpf))
      return alert("CPF inválido. Verifique os dígitos.");
    if (!Utils.isValidPhone(whatsDigits))
      return alert("Informe um WhatsApp válido.");

    if (!nascStr) return alert("Preencha sua data de nascimento.");
    const nascDate = Utils.parseBirthDate(nascStr);
    if (!nascDate)
      return alert("Data de nascimento inválida. Use o formato dd/mm/aaaa.");

    const hoje = new Date();
    const minAno = hoje.getFullYear() - 110;
    if (nascDate.getFullYear() < minAno || nascDate > hoje) {
      return alert("Data de nascimento fora do intervalo permitido.");
    }

    // Normaliza o campo para @usuario
    instaInput.value = "@" + instaLimpo;

    App.goTo(6);
  },

  followAndContinue: () => {
    window.open(
      "https://www.instagram.com/vitaclinsaude?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
      "_blank",
      "noopener,noreferrer"
    );
  },

  copyCouponAndShowFollow: async (code) => {
    const go = () => App.goTo(5);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
        alert("Cupom copiado!");
        return go();
      }
    } catch (e) {}

    try {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, code.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) {
        alert("Cupom copiado!");
        return go();
      }
    } catch (e2) {}

    alert("Não foi possível copiar automaticamente. Anote este código: " + code);
    go();
  },

  makeUniqueCoupon: (base) => {
    let candidate =
      base ||
      "VITA-" +
        Math.floor(Math.random() * 9999)
          .toString()
          .padStart(4, "0");
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let tries = 0;
    while (CouponStore.has(candidate) && tries < 50) {
      const extra =
        chars[Math.floor(Math.random() * chars.length)] +
        chars[Math.floor(Math.random() * chars.length)];
      candidate = (base || "VITA-") + extra;
      tries++;
    }
    CouponStore.add(candidate);
    return candidate;
  },

  handleSubmit: async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById("alert");
    const submitBtn = document.getElementById("submitBtn");
    const resultBox = document.getElementById("resultBox");

    if (!alertBox || !submitBtn || !resultBox) return;

    alertBox.style.display = "none";
    resultBox.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.innerHTML = "⏳ Enviando...";

    try {
      const indicados = [];
      for (let i = 1; i <= 10; i++) {
        const nEl = document.querySelector(`[name="ind_nome_${i}"]`);
        const wEl = document.querySelector(`[name="ind_whats_${i}"]`);
        const igEl = document.querySelector(`[name="ind_insta_${i}"]`);

        const n = nEl ? nEl.value.trim() : "";
        const w = wEl ? wEl.value.replace(/\D/g, "") : "";
        const igRaw = igEl ? igEl.value.trim() : "";

        const igNormalizado = igRaw.replace(/\s+/g, "");
        let igClean = "";
        if (igNormalizado) {
          igClean = igNormalizado.startsWith("@")
            ? igNormalizado
            : "@" + igNormalizado.replace(/^@+/, "");
        }

        const algumPreenchido = n || w || igClean;

        if (algumPreenchido) {
          if (!n || !igClean) {
            throw new Error(
              `Preencha nome e Instagram (ex: @usuario, sem espaços) do indicado #${i}.`
            );
          }
          if (!Utils.isValidPhone(w)) {
            throw new Error(
              `Informe um WhatsApp válido para o indicado #${i}.`
            );
          }
          indicados.push({ nome: n, whatsapp: w, instagram: igClean });
        }
      }

      if (indicados.length < 2) {
        throw new Error(
          "Indique pelo menos 2 pessoas completas (nome, WhatsApp e Instagram)."
        );
      }

      const instaLower = indicados
        .map((i) => (i.instagram || "").toLowerCase())
        .filter(Boolean);
      const instaRep = instaLower.find(
        (ig, idx) => instaLower.indexOf(ig) !== idx
      );
      if (instaRep) {
        throw new Error(
          "O Instagram das pessoas indicadas não pode se repetir. Use um Instagram diferente para cada indicado."
        );
      }

      const nomeIndicador = document
        .getElementById("nomeIndicador")
        .value.trim();
      const cpfIndicador = document.getElementById("cpfIndicador").value;
      const nascIndicadorRaw = document
        .getElementById("nascIndicador")
        .value.trim();
      const whatsIndicador = document.getElementById("whatsIndicador").value;
      const emailIndicador = document.getElementById("emailIndicador").value;
      const instaField = document
        .getElementById("instaIndicador")
        .value.trim();

      const instaIndicador = (function (v) {
        const semEspaco = v.replace(/\s+/g, "");
        if (!semEspaco) return "";
        if (semEspaco.startsWith("@")) return semEspaco;
        return "@" + semEspaco.replace(/^@+/, "");
      })(instaField);

      let nascIndicadorISO = nascIndicadorRaw;
      const parsedNasc = Utils.parseBirthDate(nascIndicadorRaw);
      if (parsedNasc) {
        nascIndicadorISO = Utils.formatDateISO(parsedNasc);
      }

      // Limite de 3 cupons por mês por indicador (nome/cpf/whats)
      const cpfDigits = cpfIndicador.replace(/\D/g, "");
      const whatsDigits = whatsIndicador.replace(/\D/g, "");
      const idKey =
        cpfDigits || whatsDigits || nomeIndicador.trim().toLowerCase();
      const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

      const dataLim = MonthStore.read();
      const counts = dataLim[monthKey] || {};
      const current = counts[idKey] || 0;
      if (current >= 3) {
        throw new Error(
          "Você já gerou descontos 3 vezes neste mês. Aguarde o próximo mês para novas indicações."
        );
      }

      const payload = {
        type: "indicacao",
        origem: "landing-v3",
        cliente: {
          nome: nomeIndicador,
          cpf: cpfIndicador,
          dataNascimento: nascIndicadorISO,
          whatsapp: whatsIndicador,
          email: emailIndicador,
          instagram: instaIndicador,
        },
        indicados: indicados,
      };

      const resp = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!data.ok && !data.indicacao)
        throw new Error(data.error || "Erro ao salvar.");

      const info = data.indicacao || {};
      const cupomBase =
        info.cupom ||
        info.id ||
        "VITA-" +
          Math.floor(Math.random() * 9999)
            .toString()
            .padStart(4, "0");
      const cupom = App.makeUniqueCoupon(cupomBase);

      const qtd = indicados.length;

      let faixa = "0%";
      if (qtd >= 2 && qtd <= 4) faixa = "10%";
      else if (qtd >= 5 && qtd <= 7) faixa = "12%";
      else if (qtd >= 8) faixa = "15%";

      Admin.saveLocal({
        ...payload.cliente,
        cupom,
        qtd,
        faixa,
        indicados,
        data: new Date().toISOString(),
      });

      // incrementa contagem do mês
      const dataLim2 = MonthStore.read();
      const counts2 = dataLim2[monthKey] || {};
      counts2[idKey] = (counts2[idKey] || 0) + 1;
      dataLim2[monthKey] = counts2;
      MonthStore.write(dataLim2);

      resultBox.innerHTML = `
        <div style="font-size:16px; margin-bottom:8px;">🎉 <strong>Sucesso!</strong></div>
        <div>Você indicou ${qtd} pessoas e gerou seu desconto de <strong>${faixa}</strong>.</div>
        <div style="margin-top:6px;">
          Código: <span class="result-code">${cupom}</span>
          <button type="button" class="copy-code-btn"
                  style="margin-left:8px; border:none; border-radius:999px; padding:6px 12px; font-size:11px; font-weight:600; background:#111827; color:#fff; cursor:pointer;"
                  onclick="App.copyCouponAndShowFollow('${cupom}')">
            Copiar
          </button>
        </div>
        <div style="font-size:11px; margin-top:8px; color:#065f46">
          Tire um print desta tela e mostre na recepção ao utilizar o desconto.
        </div>
        <div style="font-size:11px; margin-top:6px; color:#065f46;">
          Lembre-se: para que os descontos sejam aplicados, você também precisa orientar seus indicados a seguir o Instagram oficial <strong>@vitaclinsaude</strong> antes do atendimento.
        </div>
        <div style="font-size:11px; margin-top:6px; color:#7f1d1d; background:#fef2f2; border-radius:10px; padding:8px;">
          ⚠️ Em casos de uso indevido ou tentativa de spam (mais de 3 cupons gerados no mesmo mês pela mesma pessoa, considerando nome, CPF e WhatsApp),
          os descontos podem ser suspensos para o indicador.
        </div>
      `;
      resultBox.style.display = "block";
      submitBtn.style.display = "none";
      const panel = document.querySelector(".indicados-panel");
      if (panel) panel.style.display = "none";
    } catch (err) {
      console.error(err);
      alertBox.textContent = err.message || "Erro ao enviar suas indicações.";
      alertBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="icon">🎫</span> Tentar Novamente';
    }
  },
};

/* animações por etapa */
App.animateCurrentStep = function (step) {
  if (!window.gsap) return;
  const section = document.querySelector(`.step-section[data-step="${step}"]`);
  if (!section) return;

  if (step === 1) {
    splitTextAndAnimate(".hero-title", {
      delay: 0.03,
      duration: 0.45,
      from: { opacity: 0, y: 40 },
      to: { opacity: 1, y: 0 },
      useScrollTrigger: false,
    });

    animateContent(".hero-right", {
      distance: 120,
      direction: "horizontal",
      duration: 1.0,
      ease: "power3.out",
      initialOpacity: 0,
      animateOpacity: true,
      scale: 1.02,
      delay: 0.05,
      useScrollTrigger: false,
    });

    animateContent(".hero-perks > div", {
      distance: 80,
      direction: "vertical",
      duration: 0.9,
      ease: "power3.out",
      initialOpacity: 0,
      animateOpacity: true,
      scale: 1,
      delay: 0.15,
      stagger: 0.06,
      useScrollTrigger: false,
    });

    return;
  }

  if (step === 2) {
    animateContent(section.querySelectorAll(".carousel-container"), {
      distance: 140,
      direction: "vertical",
      duration: 1.0,
      ease: "power3.out",
      initialOpacity: 0,
      animateOpacity: true,
      scale: 1,
      delay: 0.05,
      stagger: 0.08,
      useScrollTrigger: false,
    });
  } else if (step === 3) {
    const procCards = section.querySelectorAll(
      [
        ".procedures-shell .procedure-card",
        ".procedures-shell .proc-card",
        ".procedures-shell .procedure-item",
        ".proc-block",
        ".procItem",
        ".procCard",
        ".chip",
        "label",
      ].join(", ")
    );

    const procTargets = Array.from(procCards).map((card) => {
      return (
        card.querySelector(".procedure-inner") ||
        card.querySelector(".card-inner") ||
        card.firstElementChild ||
        card
      );
    });

    if (procTargets.length) {
      animateContent(procTargets, {
        distance: 22,
        direction: "vertical",
        reverse: false,
        duration: 0.55,
        ease: "power3.out",
        initialOpacity: 0,
        animateOpacity: true,
        stagger: 0.06,
        delay: 0.02,
        useScrollTrigger: false,
      });
    }
  } else if (step === 4) {
    animateContent(section.querySelectorAll(".form-card"), {
      distance: 140,
      direction: "vertical",
      duration: 1.0,
      ease: "power3.out",
      initialOpacity: 0,
      animateOpacity: true,
      scale: 1.01,
      delay: 0.05,
      stagger: 0.08,
      useScrollTrigger: false,
    });
  } else if (step === 5) {
    animateContent(section.querySelectorAll(".form-card"), {
      distance: 130,
      direction: "vertical",
      duration: 0.9,
      ease: "power3.out",
      initialOpacity: 0,
      animateOpacity: true,
      scale: 1.02,
      delay: 0.05,
      stagger: 0.08,
      useScrollTrigger: false,
    });
  } else if (step === 6) {
    animateContent(section.querySelectorAll(".form-card, .indicados-panel"), {
      distance: 140,
      direction: "vertical",
      duration: 1.0,
      ease: "power3.out",
      initialOpacity: 0,
      animateOpacity: true,
      scale: 1.01,
      delay: 0.05,
      stagger: 0.08,
      useScrollTrigger: false,
    });
  } else if (step === 7) {
    animateContent(section.querySelectorAll(".admin-panel"), {
      distance: 160,
      direction: "vertical",
      duration: 1.1,
      ease: "power3.out",
      initialOpacity: 0,
      animateOpacity: true,
      scale: 1,
      delay: 0.05,
      stagger: 0.08,
      useScrollTrigger: false,
    });
  }
};

/* ========== CARROSSEL ========== */
const Carousel = {
  items: [
    {
      icon: "1",
      title: "Você preenche seus dados",
      description:
        "Informe nome completo, CPF, data de nascimento, WhatsApp, e-mail e Instagram (ex: @usuario). Esses dados identificam quem gerou as indicações e garantem que o desconto será aplicado para a pessoa certa.",
    },
    {
      icon: "2",
      title: "Você indica de 2 a 10 pessoas",
      description:
        "Adicione nome, número de WhatsApp e Instagram (ex: @usuario) de conhecidos ou familiares que podem realizar exames ou atendimentos na Vitaclin. Menos de 2 indicações não gera desconto. Como indicador, você também precisa orientar essas pessoas a seguir o Instagram oficial @vitaclinsaude para que todos consigam aproveitar corretamente os descontos.",
    },
    {
      icon: "3",
      title: "Desconto para você e para os indicados",
      description:
        "Você ganha de 10% a 15% de desconto em serviços privados elegíveis, conforme a quantidade de pessoas indicadas. Cada pessoa indicada recebe 5% de desconto em 1 serviço privado elegível, ao informar seu nome na recepção, sem acumular com o seu desconto de 10% ou 15% no mesmo atendimento.",
    },
    {
      icon: "4",
      title: "Validação pela equipe Vitaclin",
      description:
        "Na hora do atendimento, a recepção confere se o indicado está no nosso banco de dados vinculado a você e, se necessário, verifica se segue o perfil @vitaclinsaude. Tudo de forma clara e segura.",
    },
  ],
  currentIndex: 0,
  autoplay: true,
  delay: 6000,
  timer: null,
  slideWidth: 0,
  isTouchDragging: false,
  _inited: false,

  recalcWidth() {
    const container = document.getElementById("benefitsCarousel");
    if (!container) return;
    const track = container.querySelector(".carousel-track");
    if (!track) return;

    const totalWidth =
      container.clientWidth || container.getBoundingClientRect().width;
    if (!totalWidth) return;

    const innerWidth = Math.max(totalWidth - 32, 260);

    this.slideWidth = innerWidth;

    track.style.width = innerWidth * this.items.length + "px";
    const items = track.querySelectorAll(".carousel-item");
    items.forEach((item) => {
      item.style.flex = "0 0 " + innerWidth + "px";
    });
  },

  init() {
    const container = document.getElementById("benefitsCarousel");
    if (!container) return;
    // evita duplicar listeners/estrutura se já inicializado e com itens
    if (this._inited && container.querySelector(".carousel-track")?.children?.length) {
      return;
    }
    this._inited = true;
    const track = container.querySelector(".carousel-track");
    const indicators = container.querySelector(".carousel-indicators");
    if (!track || !indicators) return;

    track.innerHTML = "";
    indicators.innerHTML = "";

    this.items.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "carousel-item";
      card.innerHTML = `
        <div class="carousel-item-header">
          <span class="carousel-icon-container">
            <span class="carousel-icon">${item.icon || ""}</span>
          </span>
        </div>
        <div class="carousel-item-content">
          <div class="carousel-item-title">${item.title}</div>
          <p class="carousel-item-description">${item.description}</p>
        </div>
      `;
      track.appendChild(card);

      const dot = document.createElement("div");
      dot.className =
        "carousel-indicator" + (index === 0 ? " active" : " inactive");
      dot.addEventListener("click", () => {
        Carousel.goTo(index);
      });
      indicators.appendChild(dot);
    });

    this.recalcWidth();
    this.update();

    container.addEventListener("mouseenter", () => this.stopAutoplay());
    container.addEventListener("mouseleave", () => this.startAutoplay());

    let startX = 0;
    let deltaX = 0;

    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      startX = e.touches[0].clientX;
      deltaX = 0;
      Carousel.isTouchDragging = true;
      Carousel.stopAutoplay();
    };

    const onTouchMove = (e) => {
      if (!Carousel.isTouchDragging) return;
      if (!e.touches || e.touches.length === 0) return;
      const x = e.touches[0].clientX;
      deltaX = x - startX;

      const width =
        Carousel.slideWidth || container.getBoundingClientRect().width;
      const base = -Carousel.currentIndex * width;

      track.style.transition = "none";
      track.style.transform = `translateX(${base + deltaX}px)`;
    };

    const onTouchEnd = () => {
      if (!Carousel.isTouchDragging) return;
      Carousel.isTouchDragging = false;

      const width =
        Carousel.slideWidth || container.getBoundingClientRect().width;
      const threshold = width * 0.2;

      track.style.transition = "";

      if (Math.abs(deltaX) > threshold) {
        if (deltaX < 0) Carousel.next();
        else Carousel.prev();
      } else {
        Carousel.update();
      }
      Carousel.startAutoplay();
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("touchcancel", onTouchEnd);

    window.addEventListener("resize", () => {
      Carousel.recalcWidth();
      Carousel.update();
    });
  },

  update() {
    const container = document.getElementById("benefitsCarousel");
    if (!container) return;
    const track = container.querySelector(".carousel-track");
    if (!track) return;

    if (!this.slideWidth) this.recalcWidth();
    const width = this.slideWidth;

    track.style.transition = "transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)";
    track.style.transform = `translateX(-${this.currentIndex * width}px)`;

    const dots = container.querySelectorAll(".carousel-indicator");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === this.currentIndex);
      dot.classList.toggle("inactive", idx !== this.currentIndex);
    });
  },

  goTo(index) {
    if (index < 0 || index >= this.items.length) return;
    this.currentIndex = index;
    this.update();
  },

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.update();
  },

  prev() {
    this.currentIndex =
      (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.update();
  },

  startAutoplay() {
    if (!this.autoplay || this.timer) return;
    this.timer = setInterval(() => {
      if (this.isTouchDragging) return;
      this.next();
    }, this.delay);
  },

  stopAutoplay() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },
};

/* ========== MAGIC PROCEDURES (efeitos nos blocos) ========== */
const MagicProcedures = {
  _initialized: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;

    const cards = document.querySelectorAll(".proc-block");
    if (!cards.length) return;

    cards.forEach((card) => {
      if (!card.style.getPropertyValue("--glow-intensity")) {
        card.style.setProperty("--glow-intensity", "0");
      }
    });

    const isMobile = window.innerWidth <= 999;

    function spawnClickWave(card, clientX, clientY) {
      const rect = card.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      card.style.setProperty("--glow-x", `${(localX / rect.width) * 100}%`);
      card.style.setProperty("--glow-y", `${(localY / rect.height) * 100}%`);
      card.style.setProperty("--glow-intensity", "1");
      card.classList.add("magic-proc-active");

      const maxDist = Math.max(
        Math.hypot(localX, localY),
        Math.hypot(localX - rect.width, localY),
        Math.hypot(localX, localY - rect.height),
        Math.hypot(localX - rect.width, localY - rect.height)
      );
      const wave = document.createElement("div");
      wave.className = "proc-click-wave";
      wave.style.left = localX + "px";
      wave.style.top = localY + "px";
      const size = maxDist * 2;
      wave.style.width = size + "px";
      wave.style.height = size + "px";
      card.appendChild(wave);

      if (window.gsap) {
        gsap.fromTo(
          wave,
          { scale: 0, opacity: 0.98 },
          {
            scale: 1,
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
            onComplete: () => wave.remove(),
          }
        );
      } else {
        wave.style.transition =
          "transform 0.5s ease-out, opacity 0.5s ease-out";
        requestAnimationFrame(() => {
          wave.style.transform = "translate(-50%, -50%) scale(1)";
          wave.style.opacity = "0";
        });
        setTimeout(() => wave.remove(), 600);
      }

      setTimeout(() => {
        card.classList.remove("magic-proc-active");
        card.style.setProperty("--glow-intensity", "0.25");
        setTimeout(() => {
          card.style.setProperty("--glow-intensity", "0");
        }, 200);
      }, 350);
    }

    if (!isMobile) {
      cards.forEach((card) => {
        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateX = ((y - centerY) / centerY) * -6;
          const rotateY = ((x - centerX) / centerX) * 6;

          card.style.setProperty("--glow-x", `${(x / rect.width) * 100}%`);
          card.style.setProperty("--glow-y", `${(y / rect.height) * 100}%`);
          card.style.setProperty("--glow-intensity", "1");

          if (window.gsap) {
            gsap.to(card, {
              rotateX,
              rotateY,
              duration: 0.18,
              ease: "power2.out",
              transformPerspective: 800,
            });
          }
        });

        card.addEventListener("mouseleave", () => {
          card.style.setProperty("--glow-intensity", "0");
          if (window.gsap) {
            gsap.to(card, {
              rotateX: 0,
              rotateY: 0,
              x: 0,
              y: 0,
              duration: 0.28,
              ease: "power2.out",
            });
          }
        });

        card.addEventListener("click", (e) => {
          spawnClickWave(card, e.clientX, e.clientY);
        });
      });

      return;
    }

    let activeCard = null;
    let longPressTimer = null;
    let startTouch = null;
    const LONG_PRESS_MS = 260;
    const MOVE_TOL = 10;

    function cancelLongPress() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }

    function resetCard(card) {
      card.classList.remove("magic-proc-active");
      card.style.setProperty("--glow-intensity", "0");
      if (window.gsap) {
        gsap.to(card, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.28,
          ease: "power3.out",
        });
      }
    }

    cards.forEach((card) => {
      card.addEventListener(
        "touchstart",
        (e) => {
          if (!e.touches || !e.touches.length) return;
          const t = e.touches[0];
          startTouch = { x: t.clientX, y: t.clientY, card };

          cancelLongPress();

          longPressTimer = setTimeout(() => {
            if (!startTouch || startTouch.card !== card) return;

            activeCard = card;
            card.classList.add("magic-proc-active");

            const rect = card.getBoundingClientRect();
            const localX = startTouch.x - rect.left;
            const localY = startTouch.y - rect.top;

            card.style.setProperty("--glow-x", `${(localX / rect.width) * 100}%`);
            card.style.setProperty("--glow-y", `${(localY / rect.height) * 100}%`);
            card.style.setProperty("--glow-intensity", "1");

            if (window.gsap) {
              gsap.to(card, {
                y: -10,
                scale: 1.03,
                duration: 0.2,
                ease: "power2.out",
              });
            }
          }, LONG_PRESS_MS);
        },
        { passive: true }
      );

      card.addEventListener(
        "touchmove",
        (e) => {
          if (!e.touches || !e.touches.length) return;
          const t = e.touches[0];

          if (!activeCard && startTouch) {
            const dx = t.clientX - startTouch.x;
            const dy = t.clientY - startTouch.y;
            if (Math.hypot(dx, dy) > MOVE_TOL) {
              cancelLongPress();
              startTouch = null;
              return;
            }
          }

          if (activeCard === card && startTouch) {
            const dx = t.clientX - startTouch.x;
            const dy = t.clientY - startTouch.y;

            if (window.gsap) {
              gsap.to(card, {
                x: dx * 0.08,
                y: -10 + dy * 0.08,
                duration: 0.16,
                ease: "power2.out",
              });
            }
          }
        },
        { passive: true }
      );

      const end = (e) => {
        if (!activeCard && startTouch && e && e.changedTouches && e.changedTouches[0]) {
          const t = e.changedTouches[0];
          spawnClickWave(card, t.clientX, t.clientY);
        }

        cancelLongPress();
        startTouch = null;

        if (activeCard === card) {
          resetCard(card);
          activeCard = null;
        }
      };

      card.addEventListener("touchend", end);
      card.addEventListener("touchcancel", end);
    });

    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", (event) => {
        if (activeCard) return;

        const beta = event.beta || 0;
        const gamma = event.gamma || 0;
        const maxTilt = 8;
        const rotateX = Math.max(Math.min(beta / 8, maxTilt), -maxTilt);
        const rotateY = Math.max(Math.min(gamma / 8, maxTilt), -maxTilt);

        if (window.gsap) {
          cards.forEach((card) => {
            gsap.to(card, {
              rotateX: -rotateX,
              rotateY: rotateY,
              duration: 0.3,
              ease: "power2.out",
              transformPerspective: 800,
            });
          });
        }
      });
    }
  },
};

/* ========== ADMIN ========== */
const Admin = {
  saveLocal: (data) => {
    const list = JSON.parse(localStorage.getItem(CONFIG.LOCAL_KEY) || "[]");
    list.push(data);
    localStorage.setItem(CONFIG.LOCAL_KEY, JSON.stringify(list));
  },

  clearLocal: () => {
    if (confirm("Apagar histórico local?")) {
      localStorage.removeItem(CONFIG.LOCAL_KEY);
      Admin.renderLocal();
    }
  },

  renderLocal: () => {
    const list = JSON.parse(localStorage.getItem(CONFIG.LOCAL_KEY) || "[]").reverse();
    const el = document.getElementById("adminLocalList");
    const emptyMsg = document.getElementById("adminEmptyMsg");
    if (!el) return;

    if (!list.length) {
      el.innerHTML = "";
      if (emptyMsg) emptyMsg.style.display = "block";
      return;
    }
    if (emptyMsg) emptyMsg.style.display = "none";

    el.innerHTML = list
      .map((r) => {
        const inds = (r.indicados || [])
          .map((ind, idx) => `${idx + 1}. ${ind.nome} — ${ind.whatsapp} — ${ind.instagram}`)
          .join("\n");
        return `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <div class="admin-card-title">${r.nome}</div>
              <div class="admin-card-meta">
                CPF: ${r.cpf} · Whats: ${r.whatsapp}<br>
                Insta: ${r.instagram}
              </div>
            </div>
            <div class="admin-badge">${r.qtd} indicado(s) · ${r.faixa || "0%"}</div>
          </div>
          <div class="admin-card-meta">
            Cupom: <strong style="color:#4ade80; font-family:monospace">${r.cupom}</strong><br>
            Enviado em: ${new Date(r.data).toLocaleString()}
          </div>
          <div class="admin-card-indicados-title">Indicados:</div>
          <pre class="admin-card-indicados-list">${inds}</pre>
        </div>`;
      })
      .join("");
  },

  fetchAll: async () => {
    const statusDiv = document.getElementById("adminRemoteStatus");
    const container = document.getElementById("adminRemoteAll");
    if (statusDiv) statusDiv.textContent = "Carregando dados da nuvem...";

    try {
      const resp = await fetch(CONFIG.API_URL + "?list_indicados=1");
      const data = await resp.json();
      const rows = data.rows || [];
      Admin.renderCloudList(rows, "adminRemoteAll");
      if (statusDiv)
        statusDiv.textContent = `Carregado: ${rows.length} registros na nuvem.`;
    } catch (e) {
      if (statusDiv) statusDiv.textContent = "Erro ao carregar dados da planilha.";
      if (container)
        container.innerHTML = '<div class="admin-empty">Falha ao carregar a nuvem.</div>';
    }
  },

  searchCloud: async () => {
    const indr = document.getElementById("adminIndicador").value;
    const indd = document.getElementById("adminIndicado").value;
    const w = document.getElementById("adminWhats").value;
    const statusDiv = document.getElementById("adminRemoteStatus");

    if (statusDiv) statusDiv.textContent = "Buscando na nuvem...";

    try {
      let url = `${CONFIG.API_URL}?search_indicado=1`;
      if (indr) url += `&indicador=${encodeURIComponent(indr)}`;
      if (indd) url += `&nome=${encodeURIComponent(indd)}`;
      if (w) url += `&whats=${encodeURIComponent(w)}`;

      const resp = await fetch(url);
      const data = await resp.json();
      const results = data.results || [];
      Admin.renderCloudList(results, "adminRemoteResults");
      if (statusDiv)
        statusDiv.textContent = `Busca concluída: ${results.length} resultado(s).`;
    } catch (e) {
      if (statusDiv) statusDiv.textContent = "Erro na busca na nuvem.";
      const container = document.getElementById("adminRemoteResults");
      if (container)
        container.innerHTML = '<div class="admin-empty">Erro ao buscar.</div>';
    }
  },

  renderCloudList: (rows, containerId) => {
    const div = document.getElementById(containerId);
    if (!div) return;

    if (!rows || !rows.length) {
      div.innerHTML = '<div class="admin-empty">Nenhum registro encontrado.</div>';
      return;
    }

    const groups = {};
    rows.forEach((r) => {
      const indicadorNome = r.nome_indicador || r.nomeIndicador || "Sem indicador";
      const cupomGrupo = r.cupom || r.id_lote || r.id_indicacao || r.id || "";
      const key = indicadorNome + "|||" + (cupomGrupo || "SEM-CUPOM");
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    let html = '<div class="admin-groups">';
    Object.keys(groups)
      .sort((a, b) => {
        const [nA, cA] = a.split("|||");
        const [nB, cB] = b.split("|||");
        if (nA < nB) return -1;
        if (nA > nB) return 1;
        if (cA < cB) return -1;
        if (cA > cB) return 1;
        return 0;
      })
      .forEach((key) => {
        const list = groups[key];
        const first = list[0] || {};
        const partsKey = key.split("|||");
        const indicadorNome = partsKey[0];
        const cupomGrupoHint = partsKey[1];
        const cupomGrupo =
          first.cupom ||
          first.id_lote ||
          first.id_indicacao ||
          first.id ||
          (cupomGrupoHint === "SEM-CUPOM" ? "" : cupomGrupoHint);

        const indicadorStatusRaw = (first.status_indicador || "")
          .toString()
          .toLowerCase();
        const indicadorResgatou = indicadorStatusRaw.includes("resgat");

        const indicadorStatusLabel = indicadorResgatou
          ? "Status do indicador: cupom já resgatado"
          : "Status do indicador: em andamento";

        const indResgClass =
          "admin-indicado-btn" + (indicadorResgatou ? " done" : "");
        const indResgDisabled = indicadorResgatou ? "disabled" : "";
        const indResgText = "🎟️ Já resgatou o cupom";

        html += `
          <div class="admin-group" data-indicador-nome="${indicadorNome}" data-cupom-grupo="${cupomGrupo}">
            <div class="admin-group-title">
              <span>${indicadorNome}</span>
              <span class="admin-indicador-tag">${list.length} indicado(s)</span>
            </div>
            <div class="admin-group-meta">
              Cupom deste grupo: <strong>${cupomGrupo || "—"}</strong><br>
              <strong>${indicadorStatusLabel}</strong>
            </div>

            <div class="admin-indicador-actions">
              <button type="button"
                      class="${indResgClass}"
                      data-indicator-status="resgatou"
                      ${indResgDisabled}
                      onclick="Admin.markIndicatorStatus('${indicadorNome.replace(/'/g, "\\'")}', 'resgatou', this)">
                ${indResgText}
              </button>
            </div>
        `;

        list.forEach((item) => {
          const parts = [];
          if (item.whats_indicado) parts.push(`Whats: ${item.whats_indicado}`);
          if (item.instagram_indicado) parts.push(`IG: ${item.instagram_indicado}`);
          if (item.cupom || item.id_indicacao)
            parts.push(`Cupom: ${item.cupom || item.id_indicacao}`);
          if (item.status_contato) parts.push(`Status: ${item.status_contato}`);
          if (item.desconto_indicado)
            parts.push(`Desc. indicado: ${item.desconto_indicado}`);

          const rowId = item.id_indicacao || item.id || item.cupom || "";
          const rowIndex = item.row_index || "";
          const cupomRow = item.cupom || item.id_indicacao || item.id || "";

          const statusRaw = (item.status_contato || "").toString().toLowerCase();
          const isResgatou =
            statusRaw.includes("resgat") || statusRaw.includes("conclu");

          const resgClass = "admin-indicado-btn" + (isResgatou ? " done" : "");
          const resgDisabled = isResgatou ? "disabled" : "";

          html += `
            <div class="admin-indicado-row"
                 data-row-id="${rowId}"
                 data-row-index="${rowIndex}"
                 data-row-cupom="${cupomRow}">
              <span class="admin-indicado-name">${item.nome_indicado || item.nome}</span>
              <span class="admin-indicado-meta">${parts.join(" • ")}</span>
              <div class="admin-indicado-actions">
                <button type="button"
                        class="${resgClass}"
                        data-status="resgatou"
                        ${resgDisabled}
                        onclick="Admin.markStatus('${rowId}','resgatou', this)">
                  🎟️ Já resgatou o cupom
                </button>
              </div>
            </div>`;
        });

        html += `</div>`;
      });

    html += "</div>";
    div.innerHTML = html;
  },

  markStatus: async (rowId, status, btn) => {
    if (!rowId) {
      alert("Não foi possível identificar o registro na planilha.");
      return;
    }

    const statusDiv = document.getElementById("adminRemoteStatus");
    if (statusDiv) statusDiv.textContent = "Atualizando status na planilha...";

    try {
      const rowEl = btn ? btn.closest(".admin-indicado-row") : null;
      const rowIndex =
        rowEl && rowEl.dataset.rowIndex ? Number(rowEl.dataset.rowIndex) : null;
      const cupom = rowEl && rowEl.dataset.rowCupom ? rowEl.dataset.rowCupom : null;

      const payload = { id: rowId, status };
      if (rowIndex) payload.row_index = rowIndex;
      if (cupom) payload.cupom = cupom;

      const resp = await fetch(CONFIG.API_URL + "?update_status=1", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = {};
      }

      if (!data || data.ok === false) {
        throw new Error(
          data && data.error ? data.error : "Erro ao atualizar status no servidor."
        );
      }

      if (statusDiv) {
        statusDiv.textContent =
          'Status do indicado atualizado na planilha como "já resgatou o cupom".';
      }

      if (btn) {
        btn.classList.add("done");
        btn.disabled = true;
        btn.textContent = "🎟️ Já resgatou o cupom";

        const row = btn.closest(".admin-indicado-row");
        if (row) {
          const meta = row.querySelector(".admin-indicado-meta");
          if (meta && !meta.textContent.includes("Marcado:")) {
            meta.textContent += " • Marcado: já resgatou o cupom";
          }

          const group = row.closest(".admin-group");
          const indicadorNome = group && group.dataset.indicadorNome;
          if (indicadorNome) {
            Admin.markIndicatorStatus(indicadorNome, "resgatou");
          }
        }
      }
    } catch (e) {
      console.error(e);
      const statusDiv2 = document.getElementById("adminRemoteStatus");
      if (statusDiv2) {
        statusDiv2.textContent =
          "Não foi possível confirmar o status no servidor. Verifique se o parâmetro update_status está implementado no Apps Script.";
      }
      alert("Erro ao atualizar status na planilha. Confira o Apps Script.");
    }
  },

  markIndicatorStatus: async (indicadorNome, status, btn) => {
    if (!indicadorNome) {
      alert("Não foi possível identificar o indicador.");
      return;
    }

    const statusDiv = document.getElementById("adminRemoteStatus");
    if (statusDiv)
      statusDiv.textContent = "Atualizando status do indicador na planilha...";

    try {
      const payload = { indicador: indicadorNome, status };

      const resp = await fetch(CONFIG.API_URL + "?update_indicator_status=1", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = {};
      }

      if (!data || data.ok === false) {
        throw new Error(
          data && data.error ? data.error : "Erro ao atualizar status do indicador no servidor."
        );
      }

      if (btn) {
        btn.classList.add("done");
        btn.disabled = true;
        btn.textContent = "🎟️ Já resgatou o cupom";
      }

      const group = btn ? btn.closest(".admin-group") : null;
      if (group) {
        const metaGroup = group.querySelector(".admin-group-meta");
        if (metaGroup) {
          metaGroup.innerHTML = `
            Cupom deste grupo: <strong>${group.dataset.cupomGrupo || "—"}</strong><br>
            <strong>Status do indicador: cupom já resgatado</strong>
          `;
        }
      }

      if (statusDiv) {
        statusDiv.textContent = `Status do indicador "${indicadorNome}" atualizado na planilha como "já resgatou o cupom".`;
      }

      Admin.fetchAll();
    } catch (e) {
      console.error(e);
      const statusDiv2 = document.getElementById("adminRemoteStatus");
      if (statusDiv2) {
        statusDiv2.textContent =
          "Não foi possível confirmar o status do indicador na nuvem. Verifique o Apps Script.";
      }
      alert("Erro ao atualizar status do indicador na planilha. Confira o Apps Script.");
    }
  },
};

/* ========== ON LOAD / EXPORTS GLOBAIS ========== */
/* Guard anti-duplicação para Vite/HMR */
if (typeof window !== "undefined" && !window.__VITACLIN_INDICACOES_BOOT__) {
  window.__VITACLIN_INDICACOES_BOOT__ = true;

  // exports globais (para manter o HTML antigo funcionando)
  window.Masks = Masks;
  window.Utils = Utils;
  window.App = App;
  window.Admin = Admin;
  window.Carousel = Carousel;
  window.MagicProcedures = MagicProcedures;

  // ========= DOCK AUTO-SYNC (único, sem conflito) =========
  (function dockAutoSync() {
    const normalize = (s) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const LABEL_MAP = {
      1: ["inicio", "início"],
      2: ["como funciona"],
      3: ["procedimentos"],
      4: ["cupom"],
      5: ["cupom"],
      6: ["cupom"],
      7: ["admin"],
    };

    function updateDock(stepRaw) {
      const step = Number(stepRaw);
      const dock =
        document.querySelector(".dock-nav") ||
        document.querySelector("header nav");
      if (!dock) return;

      const items = Array.from(dock.querySelectorAll("a, button"));
      if (!items.length) return;

      items.forEach((i) => i.classList.remove("dock-active"));

      // 1) data-step
      let activeEl = items.find(
        (i) => String(i.getAttribute("data-step") || "") === String(step)
      );

      // 2) onclick com App.goTo(x) ou goTo(x)
      if (!activeEl) {
        activeEl = items.find((i) => {
          const oc = i.getAttribute("onclick") || "";
          return (
            oc.includes(`App.goTo(${step})`) || oc.includes(`goTo(${step})`)
          );
        });
      }

      // 3) texto
      if (!activeEl) {
        const labels = LABEL_MAP[step] || [];
        activeEl = items.find((i) => labels.includes(normalize(i.textContent)));
      }

      if (activeEl) activeEl.classList.add("dock-active");
    }

    function getActiveStepFromDOM() {
      const active = document.querySelector(".step-section.active");
      return active ? active.getAttribute("data-step") : null;
    }

    function refreshFromDOM() {
      // ✅ prioridade para o step que o App.goTo acabou de pedir
      const desired = window.__VITACLIN_LAST_STEP__;
      if (desired) {
        updateDock(desired);
        return;
      }
      const s = getActiveStepFromDOM();
      if (s) updateDock(s);
    }

    window.updateDock = updateDock;

    window.addEventListener("load", () => {
      updateDock(1);
      refreshFromDOM();
    });

    const observer = new MutationObserver(refreshFromDOM);

    window.addEventListener("load", () => {
      document.querySelectorAll(".step-section").forEach((sec) => {
        observer.observe(sec, { attributes: true, attributeFilter: ["class"] });
      });
    });
  })();

  window.addEventListener("load", function () {
    // limpa admin a cada reload
    try {
      localStorage.removeItem("vitaclin_admin_ok");
    } catch {}

    // (redundante mas seguro)
    if (window.gsap && window.ScrollTrigger) {
      try {
        gsap.registerPlugin(ScrollTrigger);
      } catch {}
    }

    // init app
    try {
      App.init();
    } catch (e) {
      console.warn("[Vitaclin] App.init falhou:", e);
    }

    // init módulos opcionais
    try {
      if (typeof Carousel !== "undefined" && Carousel.init) {
        Carousel.init();
      }
    } catch (e) {
      console.warn("[Vitaclin] Carousel.init falhou:", e);
    }

    try {
      if (typeof MagicProcedures !== "undefined" && MagicProcedures.init) {
        MagicProcedures.init();
      }
    } catch (e) {
      console.warn("[Vitaclin] MagicProcedures.init falhou:", e);
    }

    // vai para início
    if (typeof App.goTo === "function") {
      App.goTo(1);
    }

    // estilo do dock ativo (evita duplicar no HMR)
    const DOCK_STYLE_ID = "vitaclin-dock-active-style";
    if (!document.getElementById(DOCK_STYLE_ID)) {
      const dockStyle = document.createElement("style");
      dockStyle.id = DOCK_STYLE_ID;
      dockStyle.textContent = `
        nav.dock-nav a.dock-active {
          background: linear-gradient(135deg,
            rgba(243,227,211,0.98),
            rgba(205,162,121,0.98)
          ) !important;
          border-color: rgba(181,135,92,0.95) !important;
          color: #111827 !important;
        }
      `;
      if (document.head) document.head.appendChild(dockStyle);
    }

    /* permitir DIGITAR a data no celular, com máscara e limite */
    (function () {
      const input = document.getElementById("nascIndicador");
      if (!input) return;

      const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      if (!isMobileUA) return;

      input.setAttribute("type", "text");
      input.setAttribute("inputmode", "numeric");
      input.setAttribute("autocomplete", "bday");
      input.maxLength = 10; // dd/mm/aaaa
      if (!input.placeholder) input.placeholder = "dd/mm/aaaa";

      if (input.dataset.maskBound === "1") return;
      input.dataset.maskBound = "1";

      input.addEventListener("input", function () {
        let v = input.value.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);

        if (v.length >= 5) {
          input.value = v.replace(/(\d{2})(\d{2})(\d{0,4}).*/, "$1/$2/$3");
        } else if (v.length >= 3) {
          input.value = v.replace(/(\d{2})(\d{0,2}).*/, "$1/$2");
        } else {
          input.value = v;
        }
      });
    })();

    /* evitar zoom de double-tap na etapa 3 */
    (function () {
      const sec3 = document.querySelector('.step-section[data-step="3"]');
      if (!sec3) return;

      if (sec3.dataset.noDblTapZoom === "1") return;
      sec3.dataset.noDblTapZoom = "1";

      let lastTouch = 0;
      sec3.addEventListener(
        "touchend",
        function (e) {
          const now = Date.now();
          if (now - lastTouch < 400) {
            e.preventDefault();
          }
          lastTouch = now;
        },
        { passive: false }
      );
    })();
  });
}

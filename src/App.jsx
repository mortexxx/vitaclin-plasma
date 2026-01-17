// src/App.jsx
import { useEffect, useState, useRef } from "react";
import "./index.css";
import "./App.css";
import MagicBento, { ParticleCard } from "./MagicBento";
import Plasma from "./Plasma";
import PageTransitionOverlay from "./PageTransitionOverlay";
import AnimatedContent from "./AnimatedContent";
 

/**
 * Tela principal: é o seu "index" original,
 * com header, etapas, formulário, admin etc.
 */
function MainProgram() {
  const [pageReady, setPageReady] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const pendingStepRef = useRef(null);
  const currentStepRef = useRef(1);
  const stepAnimatingRef = useRef(false);
  const cancelStepAnimRef = useRef(null);
  const transitionLockRef = useRef(false);
  const activeTransitionIdRef = useRef(0);

  const syncDock = (step) => {
    const links = document.querySelectorAll("nav.dock-nav a[data-step]");
    links.forEach((a) => a.classList.remove("dock-active"));

    const active = document.querySelector(`nav.dock-nav a[data-step="${step}"]`);
    if (active) active.classList.add("dock-active");
  };

  // força o dock a acompanhar a etapa real, mesmo se JS legado setar outra classe
  const forceDock = (step) => {
    syncDock(step);
    requestAnimationFrame(() => syncDock(step));
    setTimeout(() => syncDock(step), 60);
  };

  const runEnterAnimWithRetry = (stepNumber) => {
    const stepEl = document.querySelector(`.step-section[data-step="${stepNumber}"]`);
    if (!stepEl) return;

    const runAnimFn = () => {
      if (window.App && typeof window.App.animateCurrentStep === "function") {
        window.App.animateCurrentStep(stepNumber);
      }
    };

    requestAnimationFrame(() => {
      runAnimFn();
      requestAnimationFrame(() => runAnimFn());
      setTimeout(() => runAnimFn(), 120);
      setTimeout(() => runAnimFn(), 280);
    });

    const isProcedimentos = stepEl.getAttribute("data-step") === "3";
    if (!isProcedimentos) return;

    const obs = new MutationObserver(() => {
      const hasProcs =
        stepEl.querySelector('input[type="checkbox"]') ||
        stepEl.querySelector("label") ||
        stepEl.querySelector('[data-anim], .procItem, .procCard, .chip');

      if (hasProcs) {
        runAnimFn();
        obs.disconnect();
      }
    });

    obs.observe(stepEl, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 2000);
  };

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    forceDock(1);
  }, []);

  useEffect(() => {
    // força o primeiro replay das animações da etapa 1 ao montar
    window.dispatchEvent(
      new CustomEvent("vitaclin:stepchange", { detail: { step: 1 } })
    );

    // aciona animações GSAP legadas da etapa 1, se existirem
    requestAnimationFrame(() => {
      if (window.App && typeof window.App.animateCurrentStep === "function") {
        window.App.animateCurrentStep(1);
      }
    });
  }, []);
  // Dispara o "load" do script antigo + inicializa o glow / clique dos procedimentos
  useEffect(() => {
    let cancelled = false;

    // Carrega o indexLogic somente depois de entrar no programa
    (async () => {
      try {
        await import("./indexLogic.js");
        if (cancelled) return;
        window.dispatchEvent(new Event("load"));
      } catch (e) {
        if (!cancelled) console.warn("Falha ao carregar/disparar indexLogic:", e);
      }
    })();

    // Liga o efeito dos blocos de procedimentos (.proc-block)
    const blocks = document.querySelectorAll(".proc-block");
    if (!blocks.length) return;

    const listeners = [];

    blocks.forEach((block) => {
      const updateGlow = (clientX, clientY) => {
        const rect = block.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        block.style.setProperty("--glow-x", `${x}%`);
        block.style.setProperty("--glow-y", `${y}%`);
        block.style.setProperty("--glow-intensity", "1");
      };

      const handlePointerMove = (ev) => {
        updateGlow(ev.clientX, ev.clientY);
      };

      const handlePointerLeave = () => {
        block.style.setProperty("--glow-intensity", "0");
      };

      const handleClick = (ev) => {
        const rect = block.getBoundingClientRect();

        // remove "ativo" dos outros e marca este
        document
          .querySelectorAll(".proc-block.magic-proc-active")
          .forEach((b) => b.classList.remove("magic-proc-active"));
        block.classList.add("magic-proc-active");

        // cria a onda de clique
        const wave = document.createElement("div");
        wave.className = "proc-click-wave";

        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        wave.style.left = `${x}px`;
        wave.style.top = `${y}px`;

        block.appendChild(wave);

        // anima expansão da onda
        requestAnimationFrame(() => {
          const maxSize = Math.max(rect.width, rect.height) * 2;
          wave.style.width = `${maxSize}px`;
          wave.style.height = `${maxSize}px`;
          wave.style.opacity = "0";
        });

        setTimeout(() => {
          wave.remove();
        }, 450);
      };

      block.addEventListener("pointermove", handlePointerMove);
      block.addEventListener("pointerleave", handlePointerLeave);
      block.addEventListener("click", handleClick);

      listeners.push({
        block,
        handlePointerMove,
        handlePointerLeave,
        handleClick,
      });
    });

    // cleanup quando o componente desmontar
    return () => {
      cancelled = true;
      listeners.forEach(
        ({ block, handlePointerMove, handlePointerLeave, handleClick }) => {
          block.removeEventListener("pointermove", handlePointerMove);
          block.removeEventListener("pointerleave", handlePointerLeave);
          block.removeEventListener("click", handleClick);
        }
      );
    };
  }, []);

  const performStepChange = (numericStep) => {
    const current = document.querySelector(".step-section.active");
    const target = document.querySelector(`.step-section[data-step="${numericStep}"]`);

    if (!target || target === current) {
      transitionLockRef.current = false;
      activeTransitionIdRef.current = 0;
      return;
    }

    // Remove qualquer resíduo de classes de animação 3D
    document.querySelectorAll(".step-section").forEach((sec) => {
      sec.classList.remove(
        "step-3d-animating",
        "step-3d-in-forward",
        "step-3d-out-forward",
        "step-3d-in-backward",
        "step-3d-out-backward"
      );
      sec.classList.remove("active");
    });

    // Ativa direto
    target.classList.add("active");
    currentStepRef.current = numericStep;

    // dispara evento para AnimatedContent reanimar a etapa ativa
    window.dispatchEvent(
      new CustomEvent("vitaclin:stepchange", { detail: { step: numericStep } })
    );

    // opcional: dispara animações GSAP legadas da etapa
    requestAnimationFrame(() => {
      if (window.App && typeof window.App.animateCurrentStep === "function") {
        window.App.animateCurrentStep(numericStep);
      }
    });

    // dock acompanha a etapa real
    forceDock(numericStep);

    transitionLockRef.current = false;
    activeTransitionIdRef.current = 0;

    // Se tiver clique rápido, executa o último pedido
    const nextPending = pendingStepRef.current;
    pendingStepRef.current = null;
    if (typeof nextPending === "number" && nextPending !== numericStep) {
      goTo(nextPending);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const goTo = (step) => {
    const numericStep = typeof step === "string" ? parseInt(step, 10) : step;

    // Admin gate
    if (numericStep === 7) {
      if (
        window.App &&
        typeof window.App.isAdmin === "function" &&
        typeof window.App.showAdminGate === "function"
      ) {
        if (!window.App.isAdmin()) {
          window.App.showAdminGate();

          // não deixa o dock grudar no Admin se não entrou
          forceDock(currentStepRef.current);
          return;
        }
      }

      // entrou de fato → ok deixar o fluxo seguir
      if (window.App && typeof window.App.goTo === "function") {
        try { window.App.goTo(7); } catch {}
      }
    } else {
      // saindo do Admin: remove flag para exigir senha novamente
      try { localStorage.removeItem("vitaclin_admin_ok"); } catch {}
    }

    const current = document.querySelector(".step-section.active");
    const target = document.querySelector(`.step-section[data-step="${numericStep}"]`);
    if (!target || target === current) {
      pendingStepRef.current = null;
      forceDock(currentStepRef.current);
      return;
    }

    pendingStepRef.current = numericStep;

    // se estiver animando, cancela e troca já
    if (stepAnimatingRef.current && typeof cancelStepAnimRef.current === "function") {
      cancelStepAnimRef.current();
    }

    // troca imediata e sem overlay 3D
    setTransitionActive(false);
    performStepChange(numericStep);
  };


  const handleSubmit = (e) => {
    if (window.App && typeof window.App.handleSubmit === "function") {
      window.App.handleSubmit(e);
    } else {
      e.preventDefault();
    }
  };

  const validateStep4 = () => {
    if (window.App && typeof window.App.validateStep4 === "function") {
      window.App.validateStep4();
    }
  };

  const followAndContinue = () => {
    if (window.App && typeof window.App.followAndContinue === "function") {
      window.App.followAndContinue();
    }
  };

  const checkAdmin = () => {
    if (window.App && typeof window.App.checkAdmin === "function") {
      window.App.checkAdmin();
    }
  };

  const adminFetchAll = () => {
    if (window.Admin && typeof window.Admin.fetchAll === "function") {
      window.Admin.fetchAll();
    }
  };

  const adminSearchCloud = () => {
    if (window.Admin && typeof window.Admin.searchCloud === "function") {
      window.Admin.searchCloud();
    }
  };

  const adminClearLocal = () => {
    if (window.Admin && typeof window.Admin.clearLocal === "function") {
      window.Admin.clearLocal();
    }
  };

  return (
    <>
      <PageTransitionOverlay
        active={transitionActive}
        onDone={() => {
          // overlay é apenas efeito visual; só desligamos ao fim
          setTransitionActive(false);
        }}
      />
      <div className={`page ${pageReady ? "page-fade-in" : "page-hidden"}`}>
      <header className="site-header">
        <div className="header-inner">
          <div className="logo-area">
            <img
              src="/logo.png"
              alt="Vitaclin Saúde"
            />
            <div className="logo-text">
              <span>Programa de Indicação</span>
              <span>Vitaclin Saúde</span>
            </div>
          </div>

          {/* DOCK deslizando pro lado, igual antes */}
          <nav className="dock-nav">
            <a
              href="#"
              data-step="1"
              onClick={(e) => {
                e.preventDefault();
                goTo(1);
              }}
            >
              Início
            </a>
            <a
              href="#"
              data-step="2"
              onClick={(e) => {
                e.preventDefault();
                goTo(2);
              }}
            >
              Como funciona
            </a>
            <a
              href="#"
              data-step="3"
              onClick={(e) => {
                e.preventDefault();
                goTo(3);
              }}
            >
              Procedimentos
            </a>
            <a
              href="#"
              data-step="4"
              onClick={(e) => {
                e.preventDefault();
                goTo(4);
              }}
            >
              Cupom
            </a>
            <a
              href="#"
              data-step="7"
              onClick={(e) => {
                e.preventDefault();
                goTo(7);
              }}
            >
              Admin
            </a>
          </nav>
        </div>
      </header>

      <main className="page-main">
        {/* ===== ETAPA 1 (hero normal, sem plasma) ===== */}
        <section className="step-section active" data-step="1">
          <div className="hero">
            <div className="hero-left">
              <AnimatedContent distance={22} duration={0.6} ease="power3.out" delay={0.0}>
                <div className="pill-badge">
                  <span>✨</span>
                  <span>
                    <strong>Quer ganhar até 15% de desconto</strong> em serviços
                    privados?
                  </span>
                </div>
              </AnimatedContent>

              <AnimatedContent distance={28} duration={0.75} ease="power3.out" delay={0.08}>
                <h1 className="hero-title">
                  Indique amigos e familiares e ganhe{" "}
                  <span className="highlight">até 15% de desconto</span> na
                  Vitaclin.
                </h1>
              </AnimatedContent>

              <AnimatedContent distance={22} duration={0.7} ease="power3.out" delay={0.16}>
                <p className="hero-sub">
                  Você indica pessoas que podem se beneficiar dos nossos exames e
                  atendimentos. Nós cuidamos do contato e, quando você utilizar os
                  serviços privados elegíveis, aplicamos o seu desconto. Cada
                  indicado ainda ganha <strong>5% de desconto</strong> em{" "}
                  <strong>1 serviço privado elegível</strong>, ao informar seu
                  nome na recepção, sem somar com o seu desconto de 10% ou 15% no
                  mesmo atendimento.
                </p>
              </AnimatedContent>

              <AnimatedContent distance={18} duration={0.65} ease="power3.out" delay={0.24}>
                <div className="hero-perks">
                  <div>
                    <span className="icon">✓</span>
                    <span>
                      Programa transparente: você escolhe quem indicar e pode
                      acompanhar tudo na clínica.
                    </span>
                  </div>
                  <div>
                    <span className="icon">✓</span>
                    <span>
                      Desconto crescente para você: quanto mais pessoas indicar,
                      maior o benefício.
                    </span>
                  </div>
                  <div>
                    <span className="icon">✓</span>
                    <span>
                      Indicações com consentimento, uso responsável dos dados e
                      foco em saúde.
                    </span>
                  </div>
                </div>
              </AnimatedContent>

              <AnimatedContent distance={18} duration={0.65} ease="power3.out" delay={0.32}>
                <div className="hero-cta-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => goTo(2)}
                  >
                    <span className="icon">⬇</span> Ir para próxima etapa
                  </button>
                  <span className="hero-small-text">
                    Você poderá indicar de 2 a 10 pessoas. Menos de 2 indicações
                    não gera desconto.
                  </span>
                </div>
              </AnimatedContent>
            </div>

            {/* bloco "Simulação rápida" com estrelas verdes */}
            <div className="hero-star-wrap">
              <AnimatedContent
                direction="horizontal"
                distance={28}
                duration={0.75}
                ease="power3.out"
                delay={0.18}
              >
                <aside className="hero-right">
                  <div className="hero-right-header">
                    <span className="label">Simulação rápida</span>
                    <span className="badge">Indicador</span>
                  </div>
                  <div className="hero-right-grid">
                    <div className="hero-right-card">
                      <h4>Você indica</h4>
                      <strong>2 a 4</strong>
                      <small>amigos / familiares</small>
                      <small>
                        → <strong>10%</strong> de desconto
                      </small>
                    </div>
                    <div className="hero-right-card">
                      <h4>Você indica</h4>
                      <strong>5 a 7</strong>
                      <small>pessoas</small>
                      <small>
                        → <strong>12%</strong> de desconto
                      </small>
                    </div>
                    <div className="hero-right-card">
                      <h4>Você indica</h4>
                      <strong>8 a 10</strong>
                      <small>ou mais</small>
                      <small>
                        → <strong>15%</strong> de desconto
                      </small>
                    </div>
                    <div className="hero-right-card">
                      <h4>Seus indicados</h4>
                      <strong>5%</strong>
                      <small>de desconto em 1 serviço privado elegível</small>
                      <small>ao informar seu nome na recepção</small>
                    </div>
                  </div>
                  <div className="hero-right-footer">
                    Para validar as indicações, é obrigatório informar o{" "}
                    <strong>@ do Instagram</strong> do indicador e dos indicados.
                    A equipe poderá verificar se seguem o perfil oficial{" "}
                    <strong>@vitaclinsaude</strong>.
                  </div>
                </aside>
              </AnimatedContent>
            </div>
          </div>
        </section>

        {/* ===== ETAPA 2 ===== */}
        <section className="section step-section" data-step="2">
          <h2>Como funciona o programa de indicação</h2>
          <p className="section-sub">
            Leia com calma: deixamos tudo simples e em texto maior, para você
            entender cada passo.
          </p>

          <div className="carousel-wrapper">
            <div className="carousel-container" id="benefitsCarousel">
              <div className="carousel-track"></div>
              <div className="carousel-indicators-container">
                <div className="carousel-indicators"></div>
              </div>
            </div>
          </div>

          <div className="step-nav">
            <button
              className="btn-outline"
              type="button"
              onClick={() => goTo(1)}
            >
              Voltar
            </button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => goTo(3)}
            >
              Próxima etapa
            </button>
          </div>
        </section>

        {/* ===== ETAPA 3 ===== */}
        <section className="section step-section" data-step="3">
          <h2>Procedimentos que podem receber desconto</h2>
          <p className="section-sub">
            Veja abaixo os principais procedimentos e atendimentos em saúde e
            estética onde o programa de indicação pode gerar benefício.
          </p>

          <div className="procedures-shell magic-bento-procedures">
            <div className="procedures-shell-header">
              <h3>Serviços em que o desconto pode ser aplicado</h3>
              <p>
                Passe o mouse (no computador) ou toque (no celular) em cada
                bloco para ver o brilho verde.
              </p>
            </div>

            <MagicBento
              textAutoHide={false}
              enableStars={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              enableTilt={true}
              enableMagnetism={false}
              clickEffect={true}
              spotlightRadius={260}
              particleCount={10}
              glowColor="34, 197, 94"
            >
              <div className="procedures-grid">
                <ParticleCard
                  className="magic-bento-card magic-bento-card--border-glow procedimentos-card"
                  enableTilt
                  enableMagnetism
                  clickEffect
                  glowColor="34, 197, 94"
                >
                  <div className="magic-bento-card__header">
                    <div className="magic-bento-card__label">Procedimentos</div>
                  </div>
                  <div className="magic-bento-card__content">
                    <ul className="proc-list">
                      <li>Triagem otoneurológica</li>
                      <li>Avaliação psicossocial</li>
                      <li>Acuidade visual</li>
                      <li>Audiometria tonal e vocal</li>
                      <li>Audiometria tonal</li>
                      <li>Eletrocardiograma</li>
                      <li>Eletroencefalograma</li>
                      <li>Exames laboratoriais</li>
                      <li>Espirometria c/ BO</li>
                      <li>Espirometria</li>
                      <li>Lavagem otológica</li>
                      <li>Raio-X em geral</li>
                      <li>Relatório psicológico</li>
                    </ul>
                  </div>
                </ParticleCard>

                <ParticleCard
                  className="magic-bento-card magic-bento-card--border-glow"
                  enableTilt
                  enableMagnetism
                  clickEffect
                  glowColor="34, 197, 94"
                >
                  <div className="magic-bento-card__header">
                    <div className="magic-bento-card__label">Atendimentos</div>
                  </div>
                  <div className="magic-bento-card__content">
                    <ul className="proc-list">
                      <li>Medicina do trabalho</li>
                      <li>Segurança do trabalho</li>
                      <li>Clínica geral</li>
                      <li>Fonoaudiologia</li>
                      <li>Psicologia</li>
                      <li>Nutrição</li>
                      <li>Psicopedagógico</li>
                      <li>Podologia</li>
                      <li>Estética</li>
                    </ul>
                  </div>
                </ParticleCard>
              </div>
            </MagicBento>
          </div>

          <div className="step-nav">
            <button
              className="btn-outline"
              type="button"
              onClick={() => goTo(2)}
            >
              Voltar
            </button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => goTo(4)}
            >
              Próxima etapa
            </button>
          </div>
        </section>

        {/* ===== FORM PRINCIPAL (ETAPA 4, 5, 6) ===== */}
        <form id="mainForm" noValidate onSubmit={handleSubmit}>
          {/* ETAPA 4 */}
          <section className="section step-section" data-step="4">
            <h2>Indique amigos e gere seu cupom</h2>
            <p className="section-sub">Primeiro, preencha seus dados.</p>
            <div className="form-card">
              <div className="form-section-title">Seus dados</div>
              <div className="field-group">
                <label>
                  Nome completo <span className="required">*</span>
                </label>
                <input id="nomeIndicador" type="text" required />
              </div>
              <div className="field-row-2">
                <div className="field-group">
                  <label>
                    CPF <span className="required">*</span>
                  </label>
                  <input
                    id="cpfIndicador"
                    type="tel"
                    placeholder="000.000.000-00"
                    required
                    onInput={(e) =>
                      window.Masks &&
                      typeof window.Masks.cpf === "function" &&
                      window.Masks.cpf(e.target)
                    }
                  />
                </div>
                <div className="field-group">
                  <label>
                    Data de nascimento <span className="required">*</span>
                  </label>
                  <input
                    id="nascIndicador"
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="dd/mm/aaaa"
                    onInput={(e) =>
                      window.Masks &&
                      typeof window.Masks.date === "function" &&
                      window.Masks.date(e.target)
                    }
                  />
                </div>
              </div>
              <div className="field-row-2">
                <div className="field-group">
                  <label>
                    WhatsApp <span className="required">*</span>
                  </label>
                  <input
                    id="whatsIndicador"
                    type="tel"
                    placeholder="(DD) 9 9999-9999"
                    required
                    onInput={(e) =>
                      window.Masks &&
                      typeof window.Masks.phone === "function" &&
                      window.Masks.phone(e.target)
                    }
                  />
                </div>
                <div className="field-group">
                  <label>
                    Instagram (ex: @usuario){" "}
                    <span className="required">*</span>
                  </label>
                  <input
                    id="instaIndicador"
                    type="text"
                    placeholder="@usuario"
                    required
                  />
                </div>
              </div>
              <div className="field-group">
                <label>E-mail</label>
                <input
                  id="emailIndicador"
                  type="email"
                  placeholder="opcional"
                />
              </div>
              <div className="step-nav">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => goTo(3)}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={validateStep4}
                >
                  Próxima etapa
                </button>
              </div>
            </div>
          </section>

          {/* ETAPA 5 (seguir insta) */}
          <section className="section step-section" data-step="5">
            <h2>Siga a Vitaclin no Instagram</h2>
            <p className="section-sub">
              Depois de gerar seu cupom, siga o perfil oficial da Vitaclin no
              Instagram para acompanhar novidades, avisos importantes e outras
              formas de cuidar da sua saúde.
            </p>
            <div className="form-card" style={{ textAlign: "center" }}>
              <img
                src="https://raw.githubusercontent.com/mortexxx/vitaclin-brand/refs/heads/main/vitaclin.png"
                alt="Vitaclin Saúde"
                style={{
                  maxWidth: "180px",
                  width: "60%",
                  margin: "0 auto 12px",
                  display: "block",
                }}
              />

              <p
                style={{
                  fontSize: "13px",
                  marginBottom: "14px",
                  color: "#374151",
                }}
              >
                Toque no botão abaixo para abrir o Instagram da Vitaclin.
                Depois de seguir, você pode voltar a esta página quando quiser.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={followAndContinue}
              >
                Seguir @vitaclinsaude
              </button>
            </div>
          </section>

          {/* ETAPA 6 (indicados) */}
          <section className="section step-section" data-step="6">
            <h2>Pessoas indicadas</h2>
            <p className="section-sub">Adicione de 2 a 10 pessoas.</p>
            <div className="animated-gradient-text gradient-lembrar">
              <div className="gradient-overlay"></div>
              <div className="text-content">
                Lembre-se: para que os descontos sejam aplicados, você também
                precisa orientar seus indicados a seguir o Instagram oficial
                @vitaclinsaude antes do atendimento.
              </div>
            </div>

            <div className="form-card">
              <div className="indicados-panel">
                <div className="indicados-title">Lista de Indicações</div>
                <div className="indicados-sub">
                  Cada indicado ganha 5% de desconto.
                </div>
              </div>
              <div
                id="indicadosContainer"
                style={{ marginTop: "12px" }}
              ></div>
              <div id="alert" className="alert"></div>
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  background: "#f9fafb",
                  borderRadius: "12px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    fontSize: "11px",
                    color: "#4b5563",
                  }}
                >
                  <input type="checkbox" required style={{ width: "auto" }} />
                  <span>
                    Declaro ter permissão para indicar e concordo com as
                    regras.
                  </span>
                </label>
              </div>
              <div id="resultBox" className="result-box"></div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => goTo(4)}
                >
                  Voltar
                </button>
                <button type="submit" className="btn-primary" id="submitBtn">
                  <span className="icon">🎫</span> Gerar meu desconto
                </button>
              </div>
            </div>
          </section>
        </form>

        {/* ===== ETAPA 7 (ADMIN) ===== */}
        <section className="section step-section" data-step="7">
          <h2>Admin — registros locais e nuvem</h2>

          <div className="admin-panel admin-panel-remote">
            <div className="admin-panel-header">
              <div>
                <div className="admin-panel-title">Pesquisar na planilha</div>
                <div className="admin-panel-sub">
                  Filtre por indicador, indicado ou WhatsApp.
                </div>
              </div>
              <button
                type="button"
                className="admin-clear-btn"
                onClick={() =>
                  window.App &&
                  typeof window.App.logoutAdmin === "function" &&
                  window.App.logoutAdmin()
                }
              >
                Sair do Admin
              </button>
            </div>
            <div className="admin-remote-controls">
              <div className="field-group-inline">
                <label>Indicador</label>
                <input id="adminIndicador" type="text" />
              </div>
              <div className="field-group-inline">
                <label>Indicado</label>
                <input id="adminIndicado" type="text" />
              </div>
              <div className="field-group-inline">
                <label>WhatsApp</label>
                <input id="adminWhats" type="tel" />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  className="btn-outline"
                  style={{
                    borderColor: "#4b5563",
                    color: "#e5e7eb",
                  }}
                  onClick={adminFetchAll}
                >
                  Recarregar visão geral
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={adminSearchCloud}
                >
                  🔍 Buscar
                </button>
              </div>
            </div>
            <div id="adminRemoteStatus" className="admin-status"></div>
            <div id="adminRemoteResults" className="admin-results admin-empty">
              Nenhum dado filtrado.
            </div>
          </div>

          <div className="admin-panel admin-panel-remote">
            <div className="admin-panel-header">
              <div>
                <div className="admin-panel-title">Nuvem — visão geral</div>
                <div className="admin-panel-sub">
                  Todos os indicadores e indicados que estão na planilha
                  (leitura).
                </div>
              </div>
            </div>
            <div id="adminRemoteAll" className="admin-results admin-empty">
              Carregando...
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <div className="admin-panel-title">Registros locais</div>
              </div>
              <button
                type="button"
                className="admin-clear-btn"
                onClick={adminClearLocal}
              >
                Limpar
              </button>
            </div>
            <div id="adminLocalList" className="admin-list"></div>
            <div
              id="adminEmptyMsg"
              className="admin-empty"
              style={{ display: "none" }}
            >
              Nenhum registro salvo localmente.
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-inner">
          <a
            href="https://www.instagram.com/vitaclinsaude?utm_source=ig_web_button_share_sheet&amp;igsh=ZDNlZDc0MzIxNw=="
            target="_blank"
            rel="noopener noreferrer"
          >
            @vitaclinsaude
          </a>
        </div>
      </footer>
      </div>
    </>
  );
}

/**
 * App: controla se o usuário está na
 * tela de introdução (plasma) ou no index principal.
 */
export default function App() {
  const [started, setStarted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);


  const handleIntroClick = () => {
    if (transitioning) return;
    // troca imediato para o index
    setStarted(true);
    // dispara as paletas por cima
    setTransitioning(true);
  };

  const handleTransitionDone = () => {
    setTransitioning(false);
  };

  return (
    <>
      {!started && (
        <div className="plasma-intro-root">
          <Plasma speed={1.1} direction="forward" scale={1} opacity={1} mouseInteractive={false} />
          <div className="intro-content">
            <p className="intro-pill">Vitaclin <span>Saúde</span></p>
            <h1 className="intro-title">Ganhe até <span className="intro-highlight">15% de desconto</span></h1>
            <p className="intro-sub">com nossos serviços, participando do Programa de Indicação Vitaclin.</p>
            <button type="button" className="intro-button" onClick={handleIntroClick}>Seja bem-vindo</button>
          </div>
        </div>
      )}

      {(started || transitioning) && <MainProgram />}

      {/* <PageTransitionOverlay active={transitioning} onDone={handleTransitionDone} /> */}
    </>
  );
}

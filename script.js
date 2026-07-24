(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const content = window.OYA_CONTENT;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 700px)");

  if (!content) {
    document.documentElement.classList.add("content-error");
    return;
  }

  const intro = $("#intro");
  const shell = $("#site-shell");
  const modal = $("#wish-modal");
  const audio = $("#soundtrack");
  const soundToggle = $("#sound-toggle");
  const introCanvas = $("#intro-particles");
  const introContext = introCanvas?.getContext("2d");
  const confettiCanvas = $("#confetti");
  const confettiContext = confettiCanvas?.getContext("2d");

  let soundEnabled = true;
  let introTimers = [];
  let introFrame = 0;
  let confettiFrame = 0;
  let introParticles = [];
  let confetti = [];
  let lastFocused = null;

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderContent() {
    document.title = `İyi ki Doğdunuz ${content.person.address} | ${content.team.name}`;
    $$("[data-person-address]").forEach((node) => {
      node.textContent = content.person.address.endsWith(".") ? content.person.address : `${content.person.address}.`;
    });
    $("[data-hero-line]").textContent = content.person.heroLine;
    $("[data-final-title]").textContent = content.person.finalTitle;
    $("[data-final-line]").textContent = content.person.finalLine;
    $("[data-signature]").textContent = content.team.signature;

    $("#star-nodes").innerHTML = content.stars.map((star, index) => `
      <button
        class="star-node${star.leader ? " star-node--leader" : ""}"
        style="--x:${star.x}%;--y:${star.y}%;--delay:${(index * .13).toFixed(2)}s"
        data-title="${escapeHTML(star.title)}"
        data-copy="${escapeHTML(star.message)}"
        type="button"
        aria-label="${escapeHTML(star.title)} mesajını aç">
        <span aria-hidden="true">✦</span>
        <small>${escapeHTML(star.title)}</small>
      </button>
    `).join("");

    $("#moments-grid").innerHTML = content.moments.map((moment, index) => `
      <figure class="moment${moment.wide ? " moment--wide" : ""}" data-reveal>
        <div class="moment__media">
          <img src="${escapeHTML(moment.src)}" alt="${escapeHTML(moment.alt)}" loading="lazy" decoding="async">
          <span class="moment__glow" aria-hidden="true"></span>
        </div>
        <figcaption><span>${String(index + 1).padStart(2, "0")}</span>${escapeHTML(moment.label)}</figcaption>
      </figure>
    `).join("");

    $("#timeline").innerHTML = content.journey.map((item, index) => `
      <li>
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div><p>${escapeHTML(item.kicker)}</p><h3>${escapeHTML(item.title)}</h3><small>${escapeHTML(item.copy)}</small></div>
      </li>
    `).join("");

    audio.src = content.music.file;
  }

  function createStars() {
    const field = $("#stars");
    const count = reducedMotion ? 24 : mobile.matches ? 58 : 112;
    field.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < count; index += 1) {
      const star = document.createElement("span");
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.setProperty("--opacity", (Math.random() * .55 + .18).toFixed(2));
      star.style.setProperty("--duration", `${Math.random() * 3 + 2}s`);
      star.style.setProperty("--size", `${(Math.random() * 1.9 + .8).toFixed(1)}px`);
      if (index % 17 === 0) star.classList.add("is-bright");
      fragment.append(star);
    }
    field.append(fragment);
  }

  function sizeCanvases() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    [introCanvas, confettiCanvas].forEach((canvas) => {
      if (!canvas) return;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
    });
  }

  function seedIntroParticles() {
    const count = reducedMotion ? 12 : mobile.matches ? 38 : 74;
    introParticles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.8 + .4,
      speed: Math.random() * .35 + .08,
      opacity: Math.random() * .6 + .15
    }));
  }

  function drawIntroParticles() {
    if (!introContext || intro.hidden) {
      introFrame = 0;
      return;
    }
    introContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    introParticles.forEach((particle) => {
      particle.y -= particle.speed;
      if (particle.y < -5) {
        particle.y = window.innerHeight + 5;
        particle.x = Math.random() * window.innerWidth;
      }
      introContext.fillStyle = `rgba(255,225,154,${particle.opacity})`;
      introContext.beginPath();
      introContext.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      introContext.fill();
    });
    introFrame = requestAnimationFrame(drawIntroParticles);
  }

  function showIntroScene(index) {
    $$(".intro__scene").forEach((scene) => {
      scene.classList.toggle("is-active", Number(scene.dataset.introScene) === index);
    });
  }

  function clearIntroTimers() {
    introTimers.forEach(clearTimeout);
    introTimers = [];
  }

  function startIntroSequence() {
    clearIntroTimers();
    intro.classList.add("is-running");
    showIntroScene(0);
    if (reducedMotion) {
      showIntroScene(2);
      return;
    }
    introTimers.push(setTimeout(() => showIntroScene(1), 2600));
    introTimers.push(setTimeout(() => showIntroScene(2), 5700));
    introTimers.push(setTimeout(() => finishIntro(), 9200));
  }

  async function playAudio() {
    if (!soundEnabled) return;
    audio.volume = 0;
    try {
      await audio.play();
      const started = performance.now();
      const fade = (now) => {
        const progress = Math.min((now - started) / 1800, 1);
        audio.volume = .52 * progress;
        if (progress < 1 && soundEnabled) requestAnimationFrame(fade);
      };
      requestAnimationFrame(fade);
      updateSoundControl();
    } catch {
      soundEnabled = false;
      updateSoundControl();
      showAudioNotice();
    }
  }

  function showAudioNotice() {
    const notice = $("#audio-notice");
    notice.hidden = false;
    clearTimeout(showAudioNotice.timer);
    showAudioNotice.timer = setTimeout(() => { notice.hidden = true; }, 4200);
  }

  function updateSoundControl() {
    const playing = soundEnabled && !audio.paused;
    soundToggle.setAttribute("aria-pressed", String(playing));
    soundToggle.setAttribute("aria-label", playing ? "Sesi kapat" : "Sesi aç");
    $(".sound-label", soundToggle).textContent = playing ? "Ses açık" : "Ses kapalı";
    soundToggle.classList.toggle("is-muted", !playing);
  }

  function toggleSound() {
    if (!audio.paused && soundEnabled) {
      soundEnabled = false;
      audio.pause();
      updateSoundControl();
      return;
    }
    soundEnabled = true;
    void playAudio();
  }

  function launchExperience(withSound) {
    soundEnabled = withSound;
    shell.hidden = false;
    requestAnimationFrame(() => shell.classList.add("is-visible"));
    $(".intro__launch").classList.add("is-hidden");
    $("#skip-intro").classList.add("is-visible");
    if (withSound) void playAudio();
    startIntroSequence();
  }

  function finishIntro() {
    clearIntroTimers();
    intro.classList.add("is-leaving");
    setTimeout(() => {
      intro.hidden = true;
      cancelAnimationFrame(introFrame);
      $("#hero")?.scrollIntoView({ block: "start" });
      celebrate(155);
    }, reducedMotion ? 0 : 800);
  }

  function replayIntro() {
    clearIntroTimers();
    intro.hidden = false;
    intro.classList.remove("is-leaving");
    $(".intro__launch").classList.add("is-hidden");
    $("#skip-intro").classList.add("is-visible");
    seedIntroParticles();
    if (!introFrame) drawIntroParticles();
    startIntroSequence();
  }

  function initReveal() {
    const targets = $$("[data-reveal]");
    if (reducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .14, rootMargin: "0px 0px -5% 0px" });
    targets.forEach((target) => observer.observe(target));
  }

  function initConstellation() {
    const nodes = $$(".star-node");
    const card = $("#star-card");
    const title = $("#star-card-title");
    const copy = $("#star-card-copy");
    const kicker = $("#star-card-kicker");

    nodes.forEach((node) => {
      node.addEventListener("click", () => {
        nodes.forEach((item) => item.classList.remove("is-active"));
        node.classList.add("is-active");
        card.classList.add("is-changing");
        setTimeout(() => {
          kicker.textContent = node.classList.contains("star-node--leader") ? "Lider yıldızımız" : "Bir kelimeyle";
          title.textContent = node.dataset.title;
          copy.textContent = node.dataset.copy;
          card.classList.remove("is-changing");
        }, reducedMotion ? 0 : 150);
        if (node.classList.contains("star-node--leader")) celebrate(90);
      });
    });

    $("#close-star-card")?.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.remove("is-active"));
      kicker.textContent = "Bir kelimeyle";
      title.textContent = "Bir yıldıza dokunun";
      copy.textContent = `Ekibin ${content.person.address} için seçtiği kelimeleri keşfedin.`;
    });
  }

  function initParallax() {
    if (reducedMotion || mobile.matches) return;
    const visual = $(".hero__visual");
    window.addEventListener("pointermove", (event) => {
      const x = (event.clientX / window.innerWidth - .5) * 12;
      const y = (event.clientY / window.innerHeight - .5) * 12;
      visual?.style.setProperty("--parallax-x", `${x}px`);
      visual?.style.setProperty("--parallax-y", `${y}px`);
    }, { passive: true });
  }

  function drawConfetti() {
    confettiContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    confetti = confetti.filter((piece) => piece.y < window.innerHeight + 45);
    confetti.forEach((piece) => {
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vy += .045;
      piece.rotation += piece.spin;
      confettiContext.save();
      confettiContext.translate(piece.x, piece.y);
      confettiContext.rotate(piece.rotation);
      confettiContext.fillStyle = piece.color;
      confettiContext.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      confettiContext.restore();
    });
    confettiFrame = confetti.length ? requestAnimationFrame(drawConfetti) : 0;
  }

  function celebrate(amount = 130) {
    if (reducedMotion || !confettiContext) return;
    const colors = ["#f6c85f", "#ffe7aa", "#a77dff", "#ffffff", "#6f4bd8"];
    for (let index = 0; index < amount; index += 1) {
      confetti.push({
        x: window.innerWidth * (.08 + Math.random() * .84),
        y: -20 - Math.random() * 180,
        vx: (Math.random() - .5) * 4.4,
        vy: 2.2 + Math.random() * 3.5,
        w: 4 + Math.random() * 6,
        h: 7 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - .5) * .22
      });
    }
    if (!confettiFrame) drawConfetti();
  }

  function getFocusable(root) {
    return $$('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter((element) => !element.hidden && element.offsetParent !== null);
  }

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    $(".modal__close", modal)?.focus();
    setTimeout(() => celebrate(130), 160);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    lastFocused?.focus();
  }

  function initModal() {
    $$("[data-close-modal]").forEach((control) => control.addEventListener("click", closeModal));
    $("#wish-done")?.addEventListener("click", () => {
      celebrate(190);
      setTimeout(closeModal, reducedMotion ? 0 : 750);
    });
    document.addEventListener("keydown", (event) => {
      if (modal.hidden) return;
      if (event.key === "Escape") closeModal();
      if (event.key !== "Tab") return;
      const focusable = getFocusable(modal);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  renderContent();
  createStars();
  sizeCanvases();
  seedIntroParticles();
  drawIntroParticles();
  initReveal();
  initConstellation();
  initModal();
  initParallax();
  updateSoundControl();

  $("#enter-site")?.addEventListener("click", () => launchExperience(true));
  $("#enter-silent")?.addEventListener("click", () => launchExperience(false));
  $("#skip-intro")?.addEventListener("click", finishIntro);
  $("#replay-intro")?.addEventListener("click", replayIntro);
  soundToggle?.addEventListener("click", toggleSound);
  $("#celebrate-top")?.addEventListener("click", () => celebrate(120));
  $("#celebrate-hero")?.addEventListener("click", () => celebrate(175));
  $("#final-celebrate")?.addEventListener("click", openModal);
  audio?.addEventListener("error", showAudioNotice);
  audio?.addEventListener("pause", updateSoundControl);
  audio?.addEventListener("play", updateSoundControl);
  window.addEventListener("resize", () => {
    sizeCanvases();
    seedIntroParticles();
  }, { passive: true });
})();

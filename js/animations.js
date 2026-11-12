/**
 * Small, dependency-free motion layer for the portfolio.
 *
 * Each effect is a vanilla take on a React Bits component (https://reactbits.dev):
 *   - TechText      -> hero name (see ./tech-text.js)
 *   - DecryptedText -> hero role line
 *   - CountUp       -> hero stats
 *   - BlurText      -> section titles
 *   - FadeContent   -> timeline entries and cards
 *   (ShinyText on the status pill is pure CSS in index.html.)
 *
 * Everything is progressive enhancement: without this script the page renders exactly
 * as before, and all effects except the static TechText are skipped when the visitor
 * prefers reduced motion.
 *
 * Loaded as a classic deferred script (after ./tech-text.js) rather than an ES module, so
 * it also runs when index.html is opened straight from disk.
 */
(() => {
const mountTechText = window.mountTechText;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canObserve = 'IntersectionObserver' in window;

/** Calls `onEnter(elements)` once for each batch of elements scrolling into view. */
const whenVisible = (elements, onEnter, rootMargin = '0px 0px -8% 0px') => {
  const observer = new IntersectionObserver(
    (entries) => {
      const entered = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
      if (!entered.length) return;
      entered.forEach((el) => observer.unobserve(el));
      onEnter(entered);
    },
    { rootMargin, threshold: 0 }
  );
  elements.forEach((el) => observer.observe(el));
};

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/* ── 1. TechText: the name becomes an inspectable, draggable wordmark ── */
const heroTitle = document.querySelector('.hero-title');
if (heroTitle && mountTechText) {
  mountTechText(heroTitle, {
    intro: 'type',
    introDuration: 1.6,
    strokeWidth: 1,
    dashLength: 3,
    dashGap: 2,
    specks: 8,
    speed: 0.7
  });
}

if (!reducedMotion) {
  /* ── StarBorder: a light travels the outline of every button ── */
  if (window.mountStarBorder) {
    document.querySelectorAll('.btn').forEach((button) => {
      // Primary buttons carry the light all the time; the rest only while hovered or focused.
      const primary = button.classList.contains('btn-primary');
      window.mountStarBorder(button, {
        hover: primary ? 'lap' : 'reveal',
        duration: primary ? 5 : 3,
        glow: 0.5
      });
    });
  }

  /* ── SwarmCursor: a quiet particle swarm behind the page that follows the mouse ── */
  // Only where there is a real cursor to follow; touch devices keep a clean background.
  if (window.mountSwarmCursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const root = document.documentElement;
    const swarmLook = () => {
      const dark = root.getAttribute('data-theme') === 'dark';
      const styles = getComputedStyle(root);
      return {
        lightMode: !dark,
        color: styles.getPropertyValue('--swarm-color').trim() || (dark ? '#52525b' : '#a1a1aa'),
        accentColor: styles.getPropertyValue('--link-color').trim() || '#2563eb'
      };
    };
    const swarm = window.mountSwarmCursor({
      ...swarmLook(),
      count: 320,
      size: 2,
      spread: 80,
      speed: 0.8,
      depth: 0.5,
      targets: '.btn, .social-link, .filter-pill',
      clickEffect: 'pulse'
    });
    if (swarm) {
      root.classList.add('has-swarm');
      new MutationObserver(() => swarm.set(swarmLook())).observe(root, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }
  }
  /* ── 2. DecryptedText: the role line resolves out of random glyphs ── */
  const roleLine = document.querySelector('.hero-role-line');
  if (roleLine && roleLine.children.length === 0) {
    const text = roleLine.textContent.replace(/\s+/g, ' ').trim();
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&$';
    const duration = 1400;
    const scrambleEvery = 45;

    // Screen readers get the real text; the scrambling copy is decorative.
    const label = document.createElement('span');
    label.className = 'visually-hidden';
    label.textContent = text;
    const live = document.createElement('span');
    live.setAttribute('aria-hidden', 'true');
    roleLine.replaceChildren(label, live);

    const scramble = (from) =>
      Array.from(text.slice(from), (char) =>
        /[\s|@-]/.test(char) ? char : glyphs[Math.floor(Math.random() * glyphs.length)]
      ).join('');

    let startedAt = 0;
    let lastScramble = -Infinity;
    const step = (now) => {
      startedAt ||= now;
      const progress = Math.min(1, (now - startedAt) / duration);
      if (progress >= 1) {
        roleLine.textContent = text;
        return;
      }
      if (now - lastScramble >= scrambleEvery) {
        lastScramble = now;
        const revealed = Math.floor(progress * text.length);
        live.textContent = text.slice(0, revealed) + scramble(revealed);
      }
      requestAnimationFrame(step);
    };
    live.textContent = scramble(0);
    requestAnimationFrame(step);
  }

  if (canObserve) {
    /* ── 3. CountUp: leading numbers in the stats strip count up from zero ── */
    const counters = [];
    document.querySelectorAll('.stat-number').forEach((el) => {
      const match = el.textContent.trim().match(/^(\d+)(.*)$/);
      if (!match) return;
      const counter = { el, target: Number(match[1]), suffix: match[2] };
      el.textContent = `0${counter.suffix}`;
      counters.push(counter);
    });
    const counterFor = new Map(counters.map((counter) => [counter.el, counter]));
    whenVisible(
      counters.map((counter) => counter.el),
      (entered) => {
        entered.forEach((el, i) => {
          const { target, suffix } = counterFor.get(el);
          const duration = 1100;
          const delay = i * 120;
          let startedAt = 0;
          const step = (now) => {
            startedAt ||= now;
            const progress = Math.min(1, Math.max(0, now - startedAt - delay) / duration);
            el.textContent = `${Math.round(target * easeOutCubic(progress))}${suffix}`;
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      },
      '0px'
    );

    /* ── 4. BlurText: section titles come into focus word by word ── */
    const titles = [...document.querySelectorAll('.section-title')].filter(
      (title) => title.children.length === 0
    );
    titles.forEach((title) => {
      const words = title.textContent.trim().split(/\s+/);
      title.classList.add('blur-text');
      title.replaceChildren(
        ...words.flatMap((word, i) => {
          const span = document.createElement('span');
          span.className = 'blur-word';
          span.style.setProperty('--i', i);
          span.textContent = word;
          return i < words.length - 1 ? [span, ' '] : [span];
        })
      );
    });
    whenVisible(titles, (entered) => entered.forEach((title) => title.classList.add('is-in')));

    /* ── 5. FadeContent: entries and cards rise in as they are scrolled to ── */
    const blocks = [
      ...document.querySelectorAll(
        '.timeline-entry, .skill-box, .edu-card, .cert-item, .achievement-card, .resume-banner'
      )
    ];
    blocks.forEach((block) => block.classList.add('reveal'));
    whenVisible(blocks, (entered) => {
      entered.forEach((block, i) => {
        const delay = Math.min(i, 5) * 80;
        block.style.transitionDelay = `${delay}ms`;
        block.classList.add('is-in');
        // Hand the element back to its own styles once it has settled.
        setTimeout(() => {
          block.classList.remove('reveal', 'is-in');
          block.style.transitionDelay = '';
        }, delay + 750);
      });
    });
  }
}
})();

/**
 * @file mouse_trail.js
 * @summary Displays a five-image mouse trail only on wide viewports.
 * @description
 * Injects a `.trail-wrapper` with five `<img>` elements into the `#xy` container,
 * animates them with `mousemove` and applies an idle fade-out. The feature is
 * permanently disabled once a login/signup field receives focus. It also toggles
 * automatically on window `resize` depending on the viewport width.
 *
 * @author Leugzim Rullani
 */

/**
 * A simple 2D point.
 * @typedef {Object} Point
 * @property {number} x - X coordinate in pixels.
 * @property {number} y - Y coordinate in pixels.
 */

(() => {
  /** @constant {number} THRESHOLD Viewport threshold (px) above which the trail becomes active. */
  const THRESHOLD = 1400;                        // sichtbar NUR bei > 1400px

  /** @constant {string} IMG_PATH Base path to the trail images. */
  const IMG_PATH = '../../assets/icons/';

  /**
   * Ordered list of image files used for the trail (last image is fixed).
   * @constant {string[]}
   */
  const files = [
    'soccerfan.jpg',
    'icehockey.jpg',
    'music.jpg',
    'schwingen.jpg',
    'onair.jpg'   // immer letztes Bild
  ];

  /** @type {HTMLElement|null} Root container `#xy` where the trail wrapper is injected. */
  let root = null;

  /** @type {boolean} Whether mousemove handling is currently active. */
  let active = false;

  /** @type {boolean} Whether the feature has been permanently disabled. */
  let killed = false;

  /** @type {number|null} Idle timer handle (for fade-out), `null` if not running. */
  let idleTimer = null;

  /** @type {((e: MouseEvent) => void)|null} Registered mousemove handler, if any. */
  let moveHandler = null;

  /**
   * Checks whether the viewport is strictly wider than {@link THRESHOLD}.
   * @returns {boolean} `true` if `min-width` is greater than THRESHOLD, else `false`.
   */
  const isWide = () => window.matchMedia(`(min-width: ${THRESHOLD + 1}px)`).matches;

  /**
   * Injects the `.trail-wrapper` with five images into `#xy` if it does not exist yet.
   * Leaves existing wrapper intact when already present.
   *
   * @returns {HTMLElement|null} The `#xy` root element if available; otherwise `null`.
   *
   * @example
   * // Ensures that the wrapper exists and returns the root:
   * const host = buildTrail();
   * if (host) console.log('Trail wrapper ensured.');
   */
  function buildTrail() {
    root = document.getElementById('xy');
    if (!root) return null;

    // Wrapper nur erzeugen, wenn er fehlt
    let wrapper = root.querySelector('.trail-wrapper');
    if (!wrapper) {
      root.innerHTML =
        '<div class="trail-wrapper">' +
        files.map((f, i) => `<img src="${IMG_PATH}${f}" alt="trail-${i}">`).join('') +
        '</div>';
      wrapper = root.querySelector('.trail-wrapper');
    }
    return root;
  }

  /**
   * Removes only the injected trail wrapper (keeps any other markup in `#xy` intact).
   * Clears the `idle` CSS state from the root if present.
   * @returns {void}
   */
  function destroyTrail() {
    if (!root) return;
    const wrapper = root.querySelector('.trail-wrapper');
    if (wrapper) wrapper.remove();
    root.classList.remove('idle');
  }

  /**
   * Attaches the mousemove/idle logic if not already active.
   * Registers a one-time focus listener on login/signup forms to permanently disable the trail.
   *
   * @private
   * @listens Document#mousemove
   * @listens HTMLFormElement#focusin
   * @returns {void}
   */
  function attachTrail() {
    if (!root || active) return;

    const imgs = root.querySelectorAll('.trail-wrapper img');
    if (!imgs.length) return;

    /** @type {Point[]} */
    const coords = Array.from({ length: imgs.length }, () => ({ x: 0, y: 0 }));

    /** @type {(e: MouseEvent) => void} */
    moveHandler = (e) => {
      // Idle‑Fade stoppen solange sich die Maus bewegt
      root.classList.remove('idle');
      clearTimeout(idleTimer);

      const smoothing = 0.8; // sanftes Nachziehen
      const last = coords[0] || { x: e.clientX, y: e.clientY };
      coords.unshift({
        x: last.x + (e.clientX - last.x) * smoothing,
        y: last.y + (e.clientY - last.y) * smoothing
      });
      coords.length = imgs.length;

      // jedes Bild bekommt eine ältere Koordinate → natürlicher Abstand
      coords.forEach((c, i) => {
        const horizontalSpread = 260; // je Bild 260px weiter rechts
        const x = c.x - 100 - i * horizontalSpread;
        const y = c.y - 100;
        imgs[i].style.transform = `translate(${x}px, ${y}px)`;
      });

      // Idle‑Fade nach 0.8 s
      idleTimer = window.setTimeout(() => root.classList.add('idle'), 800);
    };

    document.addEventListener('mousemove', moveHandler);
    active = true;

    // Permanent abschalten, sobald ein Login-/Sign‑up‑Feld Fokus bekommt
    const form = document.querySelector('#loginForm, #sign_up_form');
    if (form) form.addEventListener('focusin', kill, { once: true });
  }

  /**
   * Detaches listeners and clears timers. DOM stays intact.
   * @returns {void}
   */
  function detachTrail() {
    if (!active) return;
    if (moveHandler) {
      document.removeEventListener('mousemove', moveHandler);
      moveHandler = null;
    }
    clearTimeout(idleTimer);
    idleTimer = null;
    active = false;
  }

  /**
   * Permanently disables the mouse trail for the current session.
   * Removes resize listener, detaches handlers, destroys wrapper and hides `#xy`.
   * @returns {void}
   */
  function kill() {
    if (killed) return;
    killed = true;
    window.removeEventListener('resize', onResize);
    detachTrail();
    destroyTrail();
    if (root) root.style.display = 'none';
  }

  /**
   * Enables or disables the trail depending on the current viewport width.
   * No-ops if the feature has been permanently disabled via {@link kill}.
   * @returns {void}
   */
  function maybeActivate() {
    if (killed) return;

    // Root ggf. neu ermitteln (z. B. wenn DOM später kam)
    root = document.getElementById('xy');
    if (!root) return;

    if (isWide()) {
      buildTrail();   // injiziert bei Bedarf
      attachTrail();  // hängt Logik an, falls nicht aktiv
    } else {
      detachTrail();
      destroyTrail();
    }
  }

  /**
   * Window resize handler that re-evaluates activation state.
   * @private
   * @listens Window#resize
   * @returns {void}
   */
  function onResize() {
    maybeActivate();
  }

  /**
   * Bootstraps the feature: initial activation and resize binding.
   * @private
   * @returns {void}
   */
  function bootstrap() {
    maybeActivate();
    window.addEventListener('resize', onResize);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
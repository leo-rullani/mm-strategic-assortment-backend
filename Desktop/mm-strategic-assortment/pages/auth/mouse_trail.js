/**
 * Mouse-Trail für Login und Registrierung.
 *
 * Benötigte Dateien unter:
 * ../../assets/icons/
 *
 * camera.avif
 * playstation.avif
 * notebook.avif
 * phone.avif
 * tv.avif
 * cofee.avif
 */

(() => {
    const MIN_WIDTH = 1401;
    const IDLE_DELAY = 750;
    const IMAGE_PATH = "../../assets/icons/";

    const imageFiles = [
        "camera.avif",
        "playstation.avif",
        "notebook.avif",
        "phone.avif",
        "tv.avif",
        "coffee.avif"
    ];

    const rotations = [-5, 4, -3, 5, -4, 3];

    const wideScreenQuery = window.matchMedia(
        `(min-width: ${MIN_WIDTH}px)`
    );

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let root = null;
    let wrapper = null;
    let images = [];
    let positions = [];

    let pointer = {
        x: 0,
        y: 0
    };

    let initialized = false;
    let animationFrame = null;
    let idleTimer = null;
    let active = false;

    function trailIsAllowed() {
        return (
            wideScreenQuery.matches &&
            !reducedMotionQuery.matches
        );
    }

    function buildTrail() {
        root = document.getElementById("xy");

        if (!root || active || !trailIsAllowed()) {
            return;
        }

        wrapper = document.createElement("div");
        wrapper.className = "trail-wrapper";

        images = imageFiles.map((fileName, index) => {
            const image = document.createElement("img");

            image.src = `${IMAGE_PATH}${fileName}`;
            image.alt = "";
            image.setAttribute("aria-hidden", "true");
            image.decoding = "async";
            image.draggable = false;
            image.dataset.trailIndex = String(index);

            wrapper.appendChild(image);

            return image;
        });

        root.replaceChildren(wrapper);
        root.classList.add("idle");

        positions = images.map(() => ({
            x: 0,
            y: 0
        }));

        initialized = false;
        active = true;

        document.addEventListener(
            "pointermove",
            handlePointerMove,
            { passive: true }
        );

        animationFrame = window.requestAnimationFrame(
            renderTrail
        );
    }

    function handlePointerMove(event) {
        if (!active) {
            return;
        }

        if (
            event.pointerType &&
            event.pointerType !== "mouse"
        ) {
            return;
        }

        pointer.x = event.clientX;
        pointer.y = event.clientY;

        if (!initialized) {
            positions.forEach((position) => {
                position.x = pointer.x;
                position.y = pointer.y;
            });

            initialized = true;
        }

        root.classList.remove("idle");

        window.clearTimeout(idleTimer);

        idleTimer = window.setTimeout(() => {
            if (root) {
                root.classList.add("idle");
            }
        }, IDLE_DELAY);
    }

    function renderTrail() {
        if (!active) {
            return;
        }

        if (initialized) {
            positions.forEach((position, index) => {
                const target =
                    index === 0
                        ? pointer
                        : positions[index - 1];

                const easing =
                index === 0
                ? 0.272
                : Math.max(0.096, 0.176 - index * 0.012);

                position.x +=
                    (target.x - position.x) * easing;

                position.y +=
                    (target.y - position.y) * easing;

                const image = images[index];

                if (!image) {
                    return;
                }

                const imageWidth =
                    image.offsetWidth || 200;

                const imageHeight =
                    image.offsetHeight || 200;

                const x =
                    position.x - imageWidth / 2;

                const y =
                    position.y - imageHeight / 2;

                image.style.transform =
                    `translate3d(${x}px, ${y}px, 0) ` +
                    `rotate(${rotations[index]}deg)`;
            });
        }

        animationFrame = window.requestAnimationFrame(
            renderTrail
        );
    }

    function destroyTrail() {
        if (!active && !wrapper) {
            return;
        }

        document.removeEventListener(
            "pointermove",
            handlePointerMove
        );

        window.clearTimeout(idleTimer);
        idleTimer = null;

        if (animationFrame !== null) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        if (wrapper) {
            wrapper.remove();
        }

        if (root) {
            root.classList.add("idle");
        }

        wrapper = null;
        images = [];
        positions = [];
        initialized = false;
        active = false;
    }

    function synchronizeTrail() {
        if (trailIsAllowed()) {
            buildTrail();
        } else {
            destroyTrail();
        }
    }

    function registerMediaQueryListener(query) {
        if (typeof query.addEventListener === "function") {
            query.addEventListener(
                "change",
                synchronizeTrail
            );
        } else if (typeof query.addListener === "function") {
            query.addListener(synchronizeTrail);
        }
    }

    function initialize() {
        registerMediaQueryListener(wideScreenQuery);
        registerMediaQueryListener(reducedMotionQuery);

        synchronizeTrail();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }
})();
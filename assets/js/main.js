/**
 * Undangan Pernikahan - Fajri & Mardiah
 * Main UI Logic (assets/js/main.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    initCoverModal();
    initScrollAnimations();
    initCountdown();
    initBackToTop();
    initMusicPlayer();
});

/* ==========================================================================
   1. Scroll Reveal Animations (Intersection Observer)
   ========================================================================== */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.12
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });
}

/* ==========================================================================
   2. Countdown Timer (Target: 20 Des 2026 08:00 WITA = UTC+8)
   ========================================================================== */
function initCountdown() {
    const targetDate = new Date("2026-12-20T08:00:00+08:00").getTime();

    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");
    const countdownGrid = document.getElementById("countdown-grid");
    const countdownFinished = document.getElementById("countdown-finished");
    const countdownBadge = document.getElementById("countdown-badge");
    const countdownTitle = document.getElementById("countdown-title");
    const countdownDesc = document.getElementById("countdown-desc");

    let timerInterval = null;

    function renderFinished() {
        if (countdownGrid) countdownGrid.classList.add("hidden");
        if (countdownFinished) countdownFinished.classList.remove("hidden");
        if (countdownBadge) {
            countdownBadge.textContent = "Alhamdulillah";
            countdownBadge.className = "text-[11px] sm:text-xs uppercase tracking-widest text-sage-700 font-bold bg-sage-100 px-4 py-1.5 rounded-full border border-sage-300";
        }
        if (countdownTitle) countdownTitle.textContent = "Acara Telah Dilaksanakan";
        if (countdownDesc) countdownDesc.textContent = "Terima kasih atas doa restu dan kehadiran yang tulus untuk kedua mempelai";
    }

    function update() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance <= 0) {
            if (timerInterval) clearInterval(timerInterval);
            renderFinished();
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    update();
    timerInterval = setInterval(update, 1000);
}

/* ==========================================================================
   3. Toast Notification Helper
   ========================================================================== */
let toastTimeout;
function showToast(message, icon = 'fa-check-circle') {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    toast.className = "show";

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.className = toast.className.replace("show", "");
    }, 3200);
}

/* ==========================================================================
   4. Copy to Clipboard (Modern API with Fallback)
   ========================================================================== */
async function copyToClipboard(elementId, label = "Teks") {
    const el = document.getElementById(elementId);
    if (!el) return;

    const textToCopy = el.innerText.trim();

    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            showToast(`${label} berhasil disalin!`);
            return;
        } catch (err) {
            console.warn("Clipboard API failed, trying fallback...", err);
        }
    }

    // Fallback for older browsers or non-HTTPS environments
    try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
            showToast(`${label} berhasil disalin!`);
        } else {
            showToast("Gagal menyalin, silakan salin manual.", "fa-exclamation-circle");
        }
    } catch (err) {
        showToast("Browser tidak mendukung penyalinan otomatis.", "fa-exclamation-circle");
    }
}

/* ==========================================================================
   5. Back to Top Button
   ========================================================================== */
function initBackToTop() {
    const btnTop = document.getElementById("btn-back-to-top");
    if (!btnTop) return;

    window.addEventListener("scroll", () => {
        if (window.scrollY > 400) {
            btnTop.classList.remove("hidden", "opacity-0");
            btnTop.classList.add("opacity-100");
        } else {
            btnTop.classList.add("opacity-0");
            setTimeout(() => {
                if (window.scrollY <= 400) btnTop.classList.add("hidden");
            }, 250);
        }
    });

    btnTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* ==========================================================================
   6. Background Audio Controller
   ========================================================================== */
function initMusicPlayer() {
    const btnMusic = document.getElementById("btn-music-toggle");
    const audio = document.getElementById("wedding-audio");
    if (!btnMusic || !audio) return;

    // Sync button UI on audio events
    audio.addEventListener('play', () => {
        btnMusic.classList.add("spin-music");
        btnMusic.innerHTML = '<i class="fas fa-compact-disc"></i>';
    });

    audio.addEventListener('pause', () => {
        btnMusic.classList.remove("spin-music");
        btnMusic.innerHTML = '<i class="fas fa-play"></i>';
    });

    function togglePlay() {
        if (!audio.paused) {
            audio.pause();
        } else {
            audio.play().then(() => {
                showToast("Lagu Cundamani diputar", "fa-music");
            }).catch(() => {
                showToast("Klik tombol musik untuk memutar", "fa-info-circle");
            });
        }
    }

    btnMusic.addEventListener("click", togglePlay);
}

/* ==========================================================================
   7. Opening Cover Screen & Guest URL Parameter Handling
   ========================================================================== */
function initCoverModal() {
    const coverModal = document.getElementById("cover-modal");
    const btnOpen = document.getElementById("btn-open-invitation");
    const guestEl = document.getElementById("cover-guest-name");
    const nameInput = document.getElementById("name");
    const audio = document.getElementById("wedding-audio");
    const btnMusic = document.getElementById("btn-music-toggle");

    // Read guest name from URL parameters: ?to=Nama+Tamu or ?u=Nama+Tamu or ?guest=...
    const urlParams = new URLSearchParams(window.location.search);
    const guestParam = urlParams.get('to') || urlParams.get('u') || urlParams.get('guest');

    if (guestParam) {
        const cleanName = guestParam.trim();
        if (cleanName && guestEl) {
            guestEl.textContent = cleanName;
        }
        if (cleanName && nameInput && !nameInput.value) {
            nameInput.value = cleanName;
        }
    }

    if (btnOpen && coverModal) {
        btnOpen.addEventListener("click", () => {
            // Smoothly slide cover away
            coverModal.classList.add("cover-hidden");
            document.body.classList.remove("cover-active");

            // Play background music (Denny Caknan - Cundamani)
            if (audio) {
                audio.play().then(() => {
                    if (btnMusic) {
                        btnMusic.classList.add("spin-music");
                        btnMusic.innerHTML = '<i class="fas fa-compact-disc"></i>';
                    }
                    showToast("Lagu Cundamani diputar", "fa-music");
                }).catch((err) => {
                    console.log("Audio autoplay prevented", err);
                });
            }

            // Scroll smoothly to hero section
            const heroSection = document.getElementById("hero");
            if (heroSection) {
                setTimeout(() => {
                    heroSection.scrollIntoView({ behavior: "smooth" });
                }, 300);
            }
        });
    }
}

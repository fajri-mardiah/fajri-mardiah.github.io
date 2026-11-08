/**
 * Undangan Pernikahan - Fajri & Mardiah
 * Public RSVP & Wishes Management (assets/js/rsvp.js)
 * 
 * Features:
 * - 100% Clean state (All trial/test wishes purged)
 * - LocalStorage persistence for real incoming guest wishes
 * - Simple & fast attendance confirmation (Hadir / Tidak Hadir)
 * - Filter wishes by attendance (Semua / Hadir / Berhalangan)
 * - Safe HTML sanitization (XSS prevention)
 * - Dynamic relative timestamp
 */

// Fresh production storage key (completely separated from previous test trials)
const RSVP_STORAGE_KEY = 'wedding_fajri_mardiah_live_wishes';

// Immediately purge any previous test/trial data from localStorage
(function purgeLegacyTestData() {
    try {
        localStorage.removeItem('wedding_fajri_mardiah_rsvps');
        localStorage.removeItem('undangan_rsvp_wishes');
        localStorage.removeItem('wedding_fajri_mardiah_rsvps_v1');
    } catch (e) {
        // Safe ignore
    }
})();

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    initRSVP();
});

function initRSVP() {
    setupFormListeners();
    renderRSVP();
}

/**
 * Retrieve RSVP entries from localStorage (Clean state)
 */
function getRSVPData() {
    try {
        const stored = localStorage.getItem(RSVP_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('LocalStorage access error, using memory fallback', e);
    }
    return [];
}

/**
 * Persist RSVP entries
 */
function saveRSVPData(data) {
    try {
        localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save RSVP to localStorage', e);
    }
}

/**
 * Attach listeners to form inputs and controls
 */
function setupFormListeners() {
    const rsvpForm = document.getElementById('rsvp-form');
    const filterButtons = document.querySelectorAll('.rsvp-filter-btn');

    // Handle form submit
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitRSVP();
        });
    }

    // Setup filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => {
                b.classList.remove('bg-sage-700', 'text-white', 'shadow-sm');
                b.classList.add('bg-white', 'text-sage-700', 'border', 'border-sage-200');
            });
            btn.classList.add('bg-sage-700', 'text-white', 'shadow-sm');
            btn.classList.remove('bg-white', 'text-sage-700', 'border');

            currentFilter = btn.getAttribute('data-filter') || 'all';
            renderWishesList();
        });
    });
}

/**
 * Process RSVP submission
 */
function submitRSVP() {
    const nameInput = document.getElementById('name');
    const attendanceInput = document.getElementById('attendance');
    const messageInput = document.getElementById('message');

    const name = nameInput.value.trim();
    const attendance = attendanceInput.value;
    const message = messageInput.value.trim();

    if (!name || !attendance || !message) {
        if (typeof showToast === 'function') {
            showToast('Mohon lengkapi semua kolom formulir!', 'fa-exclamation-triangle');
        }
        return;
    }

    const newEntry = {
        id: 'rsvp-' + Date.now(),
        name: name,
        attendance: attendance,
        message: message,
        timestamp: Date.now()
    };

    const data = getRSVPData();
    data.unshift(newEntry);
    saveRSVPData(data);

    // Re-render UI
    renderRSVP();

    if (typeof showToast === 'function') {
        showToast('Konfirmasi dan ucapan Anda berhasil terkirim!');
    }

    // Reset form
    document.getElementById('rsvp-form').reset();
}

/**
 * Render complete RSVP module (Wishes list + Counter badge)
 */
function renderRSVP() {
    const data = getRSVPData();
    const wishesCountBadge = document.getElementById('wishes-count-badge');
    if (wishesCountBadge) {
        wishesCountBadge.textContent = data.length === 0 ? 'Belum Ada Ucapan' : `${data.length} Ucapan`;
    }
    renderWishesList();
}

/**
 * Render filtered wishes list
 */
function renderWishesList() {
    const container = document.getElementById('wishes-container');
    if (!container) return;

    const data = getRSVPData();

    // 100% clean empty state
    if (data.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 px-4 text-sage-500">
                <div class="w-12 h-12 mx-auto rounded-full bg-sage-100 flex items-center justify-center text-sage-400 mb-3 text-lg">
                    <i class="far fa-comment-dots"></i>
                </div>
                <h4 class="font-heading font-semibold text-sage-800 text-sm sm:text-base mb-1">Belum Ada Ucapan</h4>
                <p class="text-xs sm:text-sm text-sage-500 max-w-xs mx-auto leading-relaxed">
                    Jadilah yang pertama memberikan doa restu dan ucapan hangat untuk Fajri &amp; Mardiah.
                </p>
            </div>
        `;
        return;
    }

    let filtered = data;
    if (currentFilter === 'hadir') {
        filtered = data.filter(item => item.attendance === 'Hadir');
    } else if (currentFilter === 'absen') {
        filtered = data.filter(item => item.attendance !== 'Hadir');
    }

    // Filter category is empty
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 px-4 text-sage-500">
                <i class="far fa-comment-dots text-3xl mb-2 text-sage-300"></i>
                <p class="font-heading italic text-xs sm:text-sm">Belum ada ucapan pada kategori ini.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const isHadir = item.attendance === 'Hadir';
        const badgeClass = isHadir 
            ? 'bg-sage-100 text-sage-800 border border-sage-300' 
            : 'bg-rose-50 text-rose-700 border border-rose-200';
        const badgeIcon = isHadir ? 'fa-check-circle' : 'fa-times-circle';
        const timeAgo = formatRelativeTime(item.timestamp);

        // First letter for avatar icon
        const initial = (item.name || 'G').trim().charAt(0).toUpperCase();

        return `
            <div class="bg-sage-50/80 p-4 sm:p-5 rounded-2xl border border-sage-100 transition-all hover:bg-white hover:shadow-sm">
                <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-sage-200 text-sage-800 font-heading font-bold flex items-center justify-center text-xs sm:text-sm shadow-inner flex-shrink-0">
                            ${escapeHTML(initial)}
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-bold text-sage-800 font-heading text-xs sm:text-sm md:text-base leading-tight truncate">
                                ${escapeHTML(item.name)}
                            </h4>
                            <p class="text-[10px] sm:text-[11px] text-sage-400 mt-0.5">
                                <i class="far fa-clock mr-1"></i>${timeAgo}
                            </p>
                        </div>
                    </div>
                    <span class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${badgeClass} px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full whitespace-nowrap flex-shrink-0">
                        <i class="fas ${badgeIcon} mr-1"></i>${escapeHTML(item.attendance)}
                    </span>
                </div>
                <p class="text-sage-700 text-xs sm:text-sm leading-relaxed pl-10 sm:pl-11 break-words">
                    ${escapeHTML(item.message)}
                </p>
            </div>
        `;
    }).join('');
}

/**
 * Format relative time (Indonesian)
 */
function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Baru saja';
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000); // seconds

    if (diff < 60) return 'Baru saja';
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari lalu`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Sanitize strings against XSS attacks
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

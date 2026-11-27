/**
 * Undangan Pernikahan - Fajri & Mardiah
 * Public RSVP & Wishes Management via Firebase Cloud Firestore (assets/js/rsvp.js)
 *
 * Cara mengaktifkan:
 * 1. Buat project di Firebase Console (https://console.firebase.google.com).
 * 2. Aktifkan Firestore Database lalu pasang Security Rules sesuai panduan di README.md.
 * 3. Tambahkan Web App di Project Settings, lalu tempel objek `firebaseConfig` ke `FIREBASE_CONFIG` di bawah ini.
 */

const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBRaYsYpadWHXYEfPit48TCz_iAR50mkAc',
    authDomain: 'undangan-fajri-mardiah.firebaseapp.com',
    projectId: 'undangan-fajri-mardiah',
    storageBucket: 'undangan-fajri-mardiah.firebasestorage.app',
    messagingSenderId: '591380561641',
    appId: '1:591380561641:web:e55b7f7770c644712cfa78'
};

const RSVP_COLLECTION = 'rsvp_wishes';
const MAX_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 500;
const MAX_WISHES_DISPLAY = 200;
const VALID_ATTENDANCE = new Set(['Hadir', 'Tidak Hadir']);

// Hapus sisa data lokal lama agar semua perangkat membaca data terpusat dari Firestore
(function purgeLegacyLocalData() {
    try {
        localStorage.removeItem('wedding_fajri_mardiah_rsvps');
        localStorage.removeItem('undangan_rsvp_wishes');
        localStorage.removeItem('wedding_fajri_mardiah_rsvps_v1');
        localStorage.removeItem('wedding_fajri_mardiah_live_wishes');
    } catch (e) {
        // Safe ignore
    }
})();

let db = null;
let unsubscribeRSVP = null;
let wishesData = [];
let currentFilter = 'all';
let isLoading = false;
let isSubmitting = false;
let loadError = '';

document.addEventListener('DOMContentLoaded', () => {
    initRSVP();
});

window.addEventListener('beforeunload', () => {
    if (typeof unsubscribeRSVP === 'function') {
        unsubscribeRSVP();
        unsubscribeRSVP = null;
    }
});

function initRSVP() {
    setupFormListeners();
    subscribeRSVPData();
}

/**
 * Periksa apakah FIREBASE_CONFIG sudah diisi dengan nilai asli
 */
function isFirebaseConfigured() {
    if (!FIREBASE_CONFIG || typeof FIREBASE_CONFIG !== 'object') return false;
    const requiredKeys = ['apiKey', 'projectId', 'appId'];
    return requiredKeys.every((key) => {
        const val = String(FIREBASE_CONFIG[key] || '').trim();
        return Boolean(val) && !val.startsWith('PASTE_');
    });
}

/**
 * Inisialisasi instance Firestore jika belum aktif
 */
function ensureFirestoreInstance() {
    if (db) return db;
    if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') {
        throw new Error('Library Firebase gagal dimuat. Periksa koneksi internet Anda.');
    }
    if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    return db;
}

/**
 * Dengarkan daftar ucapan secara real-time dari Firestore
 */
function subscribeRSVPData() {
    if (typeof unsubscribeRSVP === 'function') {
        unsubscribeRSVP();
        unsubscribeRSVP = null;
    }

    if (!isFirebaseConfigured()) {
        isLoading = false;
        loadError = '';
        renderRSVP();
        return;
    }

    isLoading = true;
    loadError = '';
    renderRSVP();

    try {
        const firestore = ensureFirestoreInstance();

        unsubscribeRSVP = firestore
            .collection(RSVP_COLLECTION)
            .orderBy('createdAt', 'desc')
            .limit(MAX_WISHES_DISPLAY)
            .onSnapshot(
                (snapshot) => {
                    wishesData = snapshot.docs
                        .map(normalizeFirestoreDoc)
                        .filter(Boolean);
                    isLoading = false;
                    loadError = '';
                    renderRSVP();
                },
                (err) => {
                    console.error('Gagal memuat data RSVP dari Firestore:', err);
                    isLoading = false;
                    loadError = err && err.code === 'permission-denied'
                        ? 'Akses database ditolak. Periksa Firestore Security Rules di Firebase Console.'
                        : 'Gagal memuat ucapan dari server. Periksa koneksi internet lalu coba lagi.';
                    renderRSVP();
                }
            );
    } catch (err) {
        console.error('Inisialisasi Firestore gagal:', err);
        isLoading = false;
        loadError = err.message || 'Gagal menghubungkan ke Firebase Firestore.';
        renderRSVP();
    }
}

/**
 * Konversi dokumen Firestore ke format tampilan UI
 */
function normalizeFirestoreDoc(doc) {
    if (!doc) return null;

    let raw;
    try {
        raw = doc.data({ serverTimestamps: 'estimate' });
    } catch (e) {
        raw = doc.data();
    }

    if (!raw || typeof raw !== 'object') return null;

    const name = String(raw.name || '').trim();
    const attendance = String(raw.attendance || '').trim();
    const message = String(raw.message || '').trim();
    if (!name || !message) return null;

    let timestamp = Date.now();
    if (raw.createdAt && typeof raw.createdAt.toMillis === 'function') {
        timestamp = raw.createdAt.toMillis();
    } else if (typeof raw.createdAt === 'number') {
        timestamp = raw.createdAt;
    }

    return {
        id: doc.id || ('rsvp-' + Date.now()),
        name: name.slice(0, MAX_NAME_LENGTH),
        attendance: VALID_ATTENDANCE.has(attendance) ? attendance : 'Tidak Hadir',
        message: message.slice(0, MAX_MESSAGE_LENGTH),
        timestamp
    };
}

/**
 * Pasang event listener form & tombol filter
 */
function setupFormListeners() {
    const rsvpForm = document.getElementById('rsvp-form');
    const filterButtons = document.querySelectorAll('.rsvp-filter-btn');

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitRSVP();
        });
    }

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
 * Ubah tampilan tombol submit selama proses kirim
 */
function setSubmitButtonLoading(loading) {
    const submitBtn = document.getElementById('rsvp-submit-btn');
    if (!submitBtn) return;

    submitBtn.disabled = loading;
    if (loading) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-gold"></i> <span>Mengirim Ucapan...</span>';
    } else {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane text-gold"></i> <span>Kirim Konfirmasi & Ucapan</span>';
    }
}

/**
 * Simpan konfirmasi kehadiran & ucapan ke Firebase Firestore
 */
async function submitRSVP() {
    if (isSubmitting) return;

    const rsvpForm = document.getElementById('rsvp-form');
    const honeypotInput = document.getElementById('rsvp-hp');
    const nameInput = document.getElementById('name');
    const attendanceInput = document.getElementById('attendance');
    const messageInput = document.getElementById('message');

    // Abaikan pengiriman bot jika field honeypot terisi
    if (honeypotInput && honeypotInput.value.trim() !== '') {
        if (rsvpForm) rsvpForm.reset();
        if (typeof showToast === 'function') {
            showToast('Konfirmasi dan ucapan Anda berhasil terkirim!');
        }
        return;
    }

    const name = nameInput ? nameInput.value.trim() : '';
    const attendance = attendanceInput ? attendanceInput.value : '';
    const message = messageInput ? messageInput.value.trim() : '';

    if (!name || !attendance || !message) {
        if (typeof showToast === 'function') {
            showToast('Mohon lengkapi semua kolom formulir!', 'fa-exclamation-triangle');
        }
        return;
    }

    if (!VALID_ATTENDANCE.has(attendance)) {
        if (typeof showToast === 'function') {
            showToast('Silakan pilih status kehadiran yang valid.', 'fa-exclamation-triangle');
        }
        return;
    }

    if (name.length > MAX_NAME_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
        if (typeof showToast === 'function') {
            showToast(`Nama maksimal ${MAX_NAME_LENGTH} karakter dan ucapan maksimal ${MAX_MESSAGE_LENGTH} karakter.`, 'fa-exclamation-triangle');
        }
        return;
    }

    if (!isFirebaseConfigured()) {
        if (typeof showToast === 'function') {
            showToast('Konfigurasi Firebase belum diisi di assets/js/rsvp.js.', 'fa-exclamation-triangle');
        }
        return;
    }

    isSubmitting = true;
    setSubmitButtonLoading(true);

    try {
        const firestore = ensureFirestoreInstance();
        await firestore.collection(RSVP_COLLECTION).add({
            name,
            attendance,
            message,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (typeof showToast === 'function') {
            showToast('Konfirmasi dan ucapan Anda berhasil terkirim!');
        }

        if (rsvpForm) {
            rsvpForm.reset();
        }
    } catch (err) {
        console.error('Gagal menyimpan RSVP ke Firestore:', err);
        const errorMsg = err && err.code === 'permission-denied'
            ? 'Gagal menyimpan: periksa Firestore Security Rules.'
            : 'Gagal mengirim ucapan, silakan coba lagi.';
        if (typeof showToast === 'function') {
            showToast(errorMsg, 'fa-exclamation-circle');
        }
    } finally {
        isSubmitting = false;
        setSubmitButtonLoading(false);
    }
}

/**
 * Render badge jumlah ucapan & daftar ucapan
 */
function renderRSVP() {
    const wishesCountBadge = document.getElementById('wishes-count-badge');
    if (wishesCountBadge) {
        if (!isFirebaseConfigured()) {
            wishesCountBadge.textContent = 'Menunggu konfigurasi Firebase';
        } else if (isLoading && wishesData.length === 0) {
            wishesCountBadge.textContent = 'Memuat ucapan...';
        } else if (loadError && wishesData.length === 0) {
            wishesCountBadge.textContent = 'Gagal memuat ucapan';
        } else if (wishesData.length === 0) {
            wishesCountBadge.textContent = 'Belum Ada Ucapan';
        } else {
            const hadirCount = wishesData.filter(item => item.attendance === 'Hadir').length;
            wishesCountBadge.textContent = `${wishesData.length} Ucapan • ${hadirCount} Hadir`;
        }
    }
    renderWishesList();
}

/**
 * Render daftar ucapan sesuai filter aktif
 */
function renderWishesList() {
    const container = document.getElementById('wishes-container');
    if (!container) return;

    if (!isFirebaseConfigured()) {
        container.innerHTML = `
            <div class="text-center py-10 px-4 text-sage-600">
                <div class="w-12 h-12 mx-auto rounded-full bg-gold-light flex items-center justify-center text-gold-dark mb-3 text-lg">
                    <i class="fas fa-tools"></i>
                </div>
                <h4 class="font-heading font-semibold text-sage-800 text-sm sm:text-base mb-1">Firebase Belum Dikonfigurasi</h4>
                <p class="text-xs sm:text-sm text-sage-500 max-w-sm mx-auto leading-relaxed">
                    Silakan tempel <code class="px-1.5 py-0.5 bg-sage-100 rounded text-sage-700">firebaseConfig</code> dari Firebase Console ke <code class="px-1.5 py-0.5 bg-sage-100 rounded text-sage-700">FIREBASE_CONFIG</code> di <code class="px-1.5 py-0.5 bg-sage-100 rounded text-sage-700">assets/js/rsvp.js</code>.
                </p>
            </div>
        `;
        return;
    }

    if (isLoading && wishesData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 px-4 text-sage-500">
                <div class="w-12 h-12 mx-auto rounded-full bg-sage-100 flex items-center justify-center text-sage-600 mb-3 text-lg">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <h4 class="font-heading font-semibold text-sage-800 text-sm sm:text-base mb-1">Memuat Ucapan &amp; Doa</h4>
                <p class="text-xs sm:text-sm text-sage-500 max-w-xs mx-auto leading-relaxed">
                    Sedang mengambil doa restu terbaru dari para tamu...
                </p>
            </div>
        `;
        return;
    }

    if (loadError && wishesData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 px-4 text-sage-600">
                <div class="w-12 h-12 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-3 text-lg">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4 class="font-heading font-semibold text-sage-800 text-sm sm:text-base mb-1">Tidak Dapat Memuat Ucapan</h4>
                <p class="text-xs sm:text-sm text-sage-500 max-w-xs mx-auto leading-relaxed mb-4">
                    ${escapeHTML(loadError)}
                </p>
                <button type="button" id="btn-retry-rsvp" class="px-5 py-2 bg-sage-700 text-white rounded-full text-xs font-semibold hover:bg-sage-800 transition-colors shadow-sm inline-flex items-center gap-2">
                    <i class="fas fa-sync-alt"></i> Muat Ulang
                </button>
            </div>
        `;
        const retryBtn = document.getElementById('btn-retry-rsvp');
        if (retryBtn) {
            retryBtn.addEventListener('click', subscribeRSVPData);
        }
        return;
    }

    if (wishesData.length === 0) {
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

    let filtered = wishesData;
    if (currentFilter === 'hadir') {
        filtered = wishesData.filter(item => item.attendance === 'Hadir');
    } else if (currentFilter === 'absen') {
        filtered = wishesData.filter(item => item.attendance !== 'Hadir');
    }

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
 * Format waktu relatif (Bahasa Indonesia)
 */
function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Baru saja';
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);

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
 * Sanitasi string untuk mencegah XSS
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

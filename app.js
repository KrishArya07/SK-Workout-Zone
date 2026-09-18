// SK Workout Zone (Unisex Gym) - Application Javascript Controller
// Merges Codex Animated UI with Gym Management Features

// Base Configuration & Pricing Table
const PLAN_PRICES = {
    '1': 1000,
    '3': 2500,
    '6': 4500,
    '12': 8000
};

const PLAN_NAMES = {
    '1': '1 Month Pack',
    '3': '3 Month Pack',
    '6': '6 Month Pack',
    '12': '1 Year Pack'
};

// Global App State
let state = {
    members: [],
    payments: []
};

// ==========================================
// INITIALIZATION & DOM CONTENT LOADED
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Set default registration date to today
  const dateInput = document.getElementById("reg-date");
  if (dateInput) {
    dateInput.value = getLocalDateString();
  }

  // Load state from local storage & seed demo if empty
  loadState();

  // Initial UI Render & Calculators
  calculateBmi();
  resizeCanvas();
  animateParticles();
  handleScroll();
  updateCalcFields();
  updateHeroLiveCalendar();

  // Render Live Gym Status & Celebrations Widget
  renderLiveGymStatus();
  renderCelebrationsWidget();
  setInterval(renderLiveGymStatus, 60000); // Check auto-schedule every minute

  // If there are leads, render them
  renderLeadsList();

  // Check admin session & URL hash
  checkAdminSession();
  if (window.location.hash === "#admin") {
      if (isAdminAuthenticated()) {
          switchView("admin-portal");
      } else {
          openAdminLoginModal();
      }
  }
});

// ==========================================
// CODEX UI LOGIC (Preserved & Enhanced)
// ==========================================
const loader = document.getElementById("loader");
const header = document.getElementById("siteHeader");
const progressLine = document.getElementById("progressLine");
const cursorGlow = document.getElementById("cursorGlow");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const classList = document.getElementById("classList");
const bmiBtn = document.getElementById("bmiBtn");
const bmiResult = document.getElementById("bmiResult");
const joinModal = document.getElementById("joinModal");
const joinForm = document.getElementById("joinForm");
const particleCanvas = document.getElementById("particleCanvas");
const ctx = particleCanvas.getContext("2d");

let particles = [];
let countersStarted = false;

window.addEventListener("load", () => {
  setTimeout(() => loader.classList.add("done"), 450);
});

window.addEventListener("scroll", handleScroll, { passive: true });
window.addEventListener("resize", resizeCanvas);
document.addEventListener("mousemove", moveGlow);

navToggle.addEventListener("click", () => {
  navToggle.classList.toggle("open");
  navLinks.classList.toggle("open");
});

// Toggle mobile menu off when clicking nav links or outside
navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navToggle.classList.remove("open");
    navLinks.classList.remove("open");
  });
});

document.addEventListener("click", (e) => {
  if (navLinks.classList.contains("open") && !header.contains(e.target)) {
    navToggle.classList.remove("open");
    navLinks.classList.remove("open");
  }
});

// Join modal open/close queries
document.querySelectorAll("[data-open-join]").forEach((button) => {
  button.addEventListener("click", openJoinModal);
});

document.querySelectorAll("[data-close-join]").forEach((button) => {
  button.addEventListener("click", closeJoinModal);
});

joinModal.addEventListener("click", (event) => {
  if (event.target === joinModal) closeJoinModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeJoinModal();
    // Close other modal overlays too
    closeModal("adminRegModal");
    closeModal("payModal");
    closeModal("editModal");
    closeModal("remindModal");
    closeModal("receiptModal");
  }
});

// Front-page Enquiry Lead submission
joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(joinForm));
  const leads = JSON.parse(localStorage.getItem("sk-fitness-leads") || "[]");
  const newLead = { ...data, id: `LEAD-${Date.now().toString().slice(-4)}`, createdAt: new Date().toISOString() };
  leads.push(newLead);
  localStorage.setItem("sk-fitness-leads", JSON.stringify(leads));
  
  if (typeof dbSaveLead === 'function') {
      dbSaveLead(newLead);
  }
  
  showToast("Enquiry submitted successfully! We will call you soon.");
  document.getElementById("formNote").textContent = "Enquiry saved. We will call you back soon.";
  
  joinForm.reset();
  setTimeout(() => {
    closeJoinModal();
    // Reset enquiry text note
    document.getElementById("formNote").textContent = "We will call you back with timing and joining details.";
  }, 1500);

  // Auto-refresh enquiries panel in admin dashboard
  renderLeadsList();
});

bmiBtn.addEventListener("click", calculateBmi);

// Intersection observer for element entry slide animations
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      if (entry.target.classList.contains("hero-stats")) startCounters();
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

// ==========================================
// ADMIN AUTHENTICATION & SECURITY (USER & PASS)
// ==========================================
const DEFAULT_ADMIN_USER = "admin";
const DEFAULT_ADMIN_PASS = "2711";

function getAdminUsername() {
    return localStorage.getItem("sk_admin_user") || DEFAULT_ADMIN_USER;
}

function getAdminPassword() {
    return localStorage.getItem("sk_admin_pass") || DEFAULT_ADMIN_PASS;
}

function isAdminAuthenticated() {
    return localStorage.getItem("sk_admin_auth") === "true" || sessionStorage.getItem("sk_admin_auth") === "true";
}

function checkAdminSession() {
    const isAuth = isAdminAuthenticated();
    const navAdminLink = document.getElementById("navAdminLink");
    const mobileOwnerLink = document.getElementById("mobileOwnerLink");
    const headerOwnerBtn = document.getElementById("headerOwnerBtn");
    const heroOwnerBadge = document.getElementById("heroOwnerBadge");
    
    if (navAdminLink) {
        navAdminLink.style.display = isAuth ? "inline-flex" : "none";
    }
    if (mobileOwnerLink) {
        mobileOwnerLink.style.display = isAuth ? "none" : "inline-flex";
    }
    if (heroOwnerBadge) {
        heroOwnerBadge.style.display = isAuth ? "block" : "none";
    }
    if (headerOwnerBtn) {
        if (isAuth) {
            headerOwnerBtn.className = "header-admin-btn";
            headerOwnerBtn.innerHTML = '<i class="fa-solid fa-gauge-high"></i> <span>Dashboard</span>';
            headerOwnerBtn.title = "Open Admin Dashboard";
        } else {
            headerOwnerBtn.className = "header-owner-btn";
            headerOwnerBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span>Owner</span>';
            headerOwnerBtn.title = "Owner / Admin Login";
        }
    }
}

function handleOwnerHeaderClick() {
    if (isAdminAuthenticated()) {
        switchView('admin-portal');
    } else {
        openAdminLoginModal();
    }
}

function openAdminLoginModal() {
    if (isAdminAuthenticated()) {
        switchView('admin-portal');
        return;
    }
    const userInput = document.getElementById("admin-user-input");
    const passInput = document.getElementById("admin-pass-input");
    if (userInput) userInput.value = "";
    if (passInput) passInput.value = "";
    openModal('adminLoginModal');
    setTimeout(() => {
        if (userInput) userInput.focus();
    }, 200);
}

function handleAdminLogin(event) {
    event.preventDefault();
    const enteredUser = document.getElementById("admin-user-input").value.trim();
    const enteredPass = document.getElementById("admin-pass-input").value.trim();
    const rememberMe = document.getElementById("admin-remember-me")?.checked;
    
    const correctUser = getAdminUsername();
    const correctPass = getAdminPassword();

    if (enteredUser.toLowerCase() === correctUser.toLowerCase() && enteredPass === correctPass) {
        if (rememberMe) {
            localStorage.setItem("sk_admin_auth", "true");
            sessionStorage.removeItem("sk_admin_auth");
        } else {
            sessionStorage.setItem("sk_admin_auth", "true");
            localStorage.removeItem("sk_admin_auth");
        }
        closeModal('adminLoginModal');
        checkAdminSession();
        showToast(`Welcome back, ${correctUser}! Dashboard Unlocked.`, "success");
        switchView('admin-portal');
    } else {
        showToast("Invalid Username or Password!", "danger");
        const passInput = document.getElementById("admin-pass-input");
        if (passInput) {
            passInput.value = "";
            passInput.focus();
        }
    }
}

function adminLogout() {
    localStorage.removeItem("sk_admin_auth");
    sessionStorage.removeItem("sk_admin_auth");
    checkAdminSession();
    switchView('member-portal');
    showToast("Logged out of Admin Dashboard.", "warning");
}

function openChangeCredentialsModal() {
    const cur = document.getElementById("current-pass-input");
    const u = document.getElementById("new-user-input");
    const p1 = document.getElementById("new-pass-input");
    const p2 = document.getElementById("confirm-pass-input");
    if (cur) cur.value = "";
    if (u) u.value = getAdminUsername();
    if (p1) p1.value = "";
    if (p2) p2.value = "";
    openModal('changeCredentialsModal');
}

function handleChangeCredentials(event) {
    event.preventDefault();
    const cur = document.getElementById("current-pass-input").value.trim();
    const newUser = document.getElementById("new-user-input").value.trim();
    const p1 = document.getElementById("new-pass-input").value.trim();
    const p2 = document.getElementById("confirm-pass-input").value.trim();

    if (cur !== getAdminPassword()) {
        showToast("Current password is incorrect!", "danger");
        return;
    }
    if (newUser.length < 3) {
        showToast("Username must be at least 3 characters.", "warning");
        return;
    }
    if (p1.length < 4) {
        showToast("New password must be at least 4 characters.", "warning");
        return;
    }
    if (p1 !== p2) {
        showToast("New password and Confirm password do not match!", "danger");
        return;
    }

    localStorage.setItem("sk_admin_user", newUser);
    localStorage.setItem("sk_admin_pass", p1);
    closeModal('changeCredentialsModal');
    showToast("Login credentials updated successfully!", "success");
}

function togglePinVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    const icon = btn.querySelector("i");
    if (icon) {
        icon.className = isPass ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    }
}

// ==========================================
// SPA ROUTER VIEW CONTROLLER
// ==========================================
function switchView(viewId) {
    // Show top progress loading line bar animation
    const progressLine = document.getElementById("progressLine");
    if (progressLine) {
        progressLine.style.width = '0%';
        progressLine.style.boxShadow = '0 0 24px rgba(185, 255, 40, 0.8)';
        
        requestAnimationFrame(() => {
            progressLine.style.transition = 'width 0.4s cubic-bezier(0.08, 0.82, 0.17, 1)';
            progressLine.style.width = '100%';
            setTimeout(() => {
                progressLine.style.transition = 'none';
                progressLine.style.width = '0%';
                progressLine.style.boxShadow = '0 0 24px rgba(185, 255, 40, 0.45)';
            }, 450);
        });
    }

    const memberView = document.getElementById("member-portal-view");
    const adminView = document.getElementById("admin-portal-view");
    const navAdminLink = document.getElementById("navAdminLink");

    // Remove active state from header links
    navLinks.querySelectorAll("a").forEach(link => link.classList.remove("active"));

    if (viewId === "admin-portal") {
        // Security check: Only authenticated owners can enter
        if (!isAdminAuthenticated()) {
            openAdminLoginModal();
            return;
        }

        memberView.style.display = "none";
        adminView.style.display = "block";
        if (navAdminLink) navAdminLink.classList.add("active");
        
        // Load stats, charts and tables
        refreshAdminDashboard();
        
        // Scroll to dashboard top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        adminView.style.display = "none";
        memberView.style.display = "block";
        if (navAdminLink) navAdminLink.classList.remove("active");
    }
}

// Shortcut plan selector from pricing table cards
function selectPlanShort(months) {
    const joinPackSelect = document.getElementById("join-form-package");
    if (joinPackSelect) {
        joinPackSelect.value = months;
    }
    openJoinModal();
}

// ==========================================
// STATE MANAGEMENT & LOCALSTORAGE SEEDING
// ==========================================
// STATE MANAGEMENT & LOCALSTORAGE SEEDING
// ==========================================
async function loadState() {
    // 1. Initial fast local render
    const storedMembers = localStorage.getItem('sk_members');
    const storedPayments = localStorage.getItem('sk_payments');
    
    let needsSeed = true;
    if (storedMembers && storedPayments) {
        try {
            const parsedM = JSON.parse(storedMembers);
            const parsedP = JSON.parse(storedPayments);
            if (Array.isArray(parsedM) && parsedM.length > 0) {
                state.members = parsedM;
                state.payments = Array.isArray(parsedP) ? parsedP : [];
                needsSeed = false;
            }
        } catch (e) {
            console.warn("Local storage parse error:", e);
        }
    }
    
    if (needsSeed) {
        seedDemoData();
    }

    // 2. Initialize Supabase if credentials are saved
    if (typeof initSupabase === 'function') {
        const isReady = initSupabase();
        if (isReady) {
            await fetchCloudState();
        }
    }
    
    refreshAdminDashboard();
    renderCelebrationsWidget();
    renderLeadsList();
}

async function fetchCloudState() {
    try {
        let hasCloudData = false;

        if (typeof dbFetchMembers === 'function') {
            const cloudMembers = await dbFetchMembers();
            if (cloudMembers && cloudMembers.length > 0) {
                state.members = cloudMembers;
                localStorage.setItem('sk_members', JSON.stringify(state.members));
                hasCloudData = true;
            }
        }

        if (typeof dbFetchPayments === 'function') {
            const cloudPayments = await dbFetchPayments();
            if (cloudPayments && cloudPayments.length > 0) {
                state.payments = cloudPayments;
                localStorage.setItem('sk_payments', JSON.stringify(state.payments));
                hasCloudData = true;
            }
        }

        // If cloud database is empty, auto-push local seeded data to cloud
        if (!hasCloudData && state.members && state.members.length > 0) {
            console.log("Empty cloud database detected. Auto-uploading initial member records to Supabase...");
            for (const m of state.members) {
                await dbSaveMember(m);
            }
            for (const p of state.payments) {
                await dbSavePayment(p);
            }
            const leads = JSON.parse(localStorage.getItem("sk-fitness-leads") || "[]");
            for (const l of leads) {
                await dbSaveLead(l);
            }
        }

        if (typeof dbFetchLeads === 'function') {
            const cloudLeads = await dbFetchLeads();
            if (cloudLeads && cloudLeads.length > 0) {
                localStorage.setItem('sk-fitness-leads', JSON.stringify(cloudLeads));
            }
        }

        if (typeof dbFetchSetting === 'function') {
            const cloudSettings = await dbFetchSetting('live_status');
            if (cloudSettings) {
                if (cloudSettings.mode) localStorage.setItem('sk_gym_status_mode', cloudSettings.mode);
                if (cloudSettings.title) localStorage.setItem('sk_holiday_title', cloudSettings.title);
                if (cloudSettings.desc) localStorage.setItem('sk_holiday_desc', cloudSettings.desc);
                renderLiveGymStatus();
            }
        }

        renderCelebrationsWidget();
        refreshAdminDashboard();
        renderLeadsList();
    } catch (e) {
        console.warn("Cloud sync error:", e);
    }
}

// Auto-sync whenever user returns to the tab or app
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && typeof fetchCloudState === 'function') {
        fetchCloudState();
    }
});
window.addEventListener('focus', () => {
    if (typeof fetchCloudState === 'function') {
        fetchCloudState();
    }
});
// Periodic background sync every 25 seconds
setInterval(() => {
    if (typeof fetchCloudState === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
        fetchCloudState();
    }
}, 25000);

function saveState() {
    localStorage.setItem('sk_members', JSON.stringify(state.members));
    localStorage.setItem('sk_payments', JSON.stringify(state.payments));
}

// Supabase Configuration UI Handlers
function openSupabaseModal() {
    if (typeof getSupabaseConfig === 'function') {
        const config = getSupabaseConfig();
        const urlInput = document.getElementById("sb-url-input");
        const keyInput = document.getElementById("sb-key-input");
        const sqlArea = document.getElementById("supabase-sql-code");

        if (urlInput) urlInput.value = config.url || '';
        if (keyInput) keyInput.value = config.key || '';
        if (sqlArea && typeof SUPABASE_SQL_SETUP !== 'undefined') {
            sqlArea.value = SUPABASE_SQL_SETUP;
        }
    }
    openModal('supabaseConfigModal');
}

async function handleSaveSupabaseConfig(event) {
    event.preventDefault();
    const url = document.getElementById("sb-url-input").value.trim();
    const key = document.getElementById("sb-key-input").value.trim();

    if (!url.startsWith("https://")) {
        showToast("Invalid Supabase URL! Must start with https://", "danger");
        return;
    }

    localStorage.setItem('sk_supabase_url', url);
    localStorage.setItem('sk_supabase_key', key);

    const isConnected = initSupabase();
    if (isConnected) {
        showToast("Testing Supabase connection...", "warning");
        const res = await testSupabaseConnection(url, key);
        if (res.success) {
            showToast("Supabase Connected Successfully!", "success");
            fetchCloudState();
            closeModal('supabaseConfigModal');
        } else {
            showToast(`Connected, but tables missing: ${res.error}. Run the SQL script in Supabase!`, "warning");
        }
    } else {
        showToast("Could not initialize Supabase. Check URL and Key.", "danger");
    }
}

async function handleTestSupabaseConnection() {
    const url = document.getElementById("sb-url-input").value.trim();
    const key = document.getElementById("sb-key-input").value.trim();

    if (!url || !key) {
        showToast("Please enter both URL and Anon Key to test.", "warning");
        return;
    }

    showToast("Testing connection to Supabase...", "warning");
    const res = await testSupabaseConnection(url, key);
    if (res.success) {
        showToast("Connection Test Passed! Supabase tables are ready.", "success");
    } else {
        showToast(`Connection failed: ${res.error}`, "danger");
    }
}

function copySupabaseSQL() {
    const sqlArea = document.getElementById("supabase-sql-code");
    if (sqlArea && typeof SUPABASE_SQL_SETUP !== 'undefined') {
        navigator.clipboard.writeText(SUPABASE_SQL_SETUP).then(() => {
            showToast("SQL Script copied! Paste it in Supabase SQL Editor and click Run.", "success");
        }).catch(() => {
            sqlArea.select();
            document.execCommand('copy');
            showToast("SQL Script copied!", "success");
        });
    }
}

function seedDemoData() {
    const todayStr = getLocalDateString();
    
    const subDays = (d, days) => {
        const date = new Date(d);
        date.setDate(date.getDate() - days);
        return getLocalDateString(date);
    };

    const addDays = (d, days) => {
        const date = new Date(d);
        date.setDate(date.getDate() + days);
        return getLocalDateString(date);
    };

    // Calculate dates relative to today for active, expiring and expired demo states
    const aaravStart = subDays(todayStr, 150);
    const aaravEnd = calculateEndDate(aaravStart, '12');
    
    const priyaStart = subDays(todayStr, 86);
    const priyaEnd = calculateEndDate(priyaStart, '3'); // expires in 3 days
    
    const vikramStart = subDays(todayStr, 34);
    const vikramEnd = calculateEndDate(vikramStart, '1'); // expired 5 days ago

    const anjaliStart = subDays(todayStr, 179);
    const anjaliEnd = calculateEndDate(anjaliStart, '6'); // expires today
    
    const rohitStart = subDays(todayStr, 10);
    const rohitEnd = calculateEndDate(rohitStart, '3');

    state.members = [
        {
            id: 'MEM-2001',
            name: 'Aarav Sharma',
            phone: '9876543210',
            email: 'aarav.sharma@gmail.com',
            dob: '1996-' + todayStr.slice(5),
            anniversary: '',
            planPack: '12',
            startDate: aaravStart,
            endDate: aaravEnd,
            paymentStatus: 'Paid',
            createdAt: subDays(todayStr, 150) + 'T10:00:00.000Z'
        },
        {
            id: 'MEM-2002',
            name: 'Priya Patel',
            phone: '9123456780',
            email: 'priya.patel@yahoo.com',
            dob: '1998-' + addDays(todayStr, 3).slice(5),
            anniversary: '',
            planPack: '3',
            startDate: priyaStart,
            endDate: priyaEnd,
            paymentStatus: 'Paid',
            createdAt: subDays(todayStr, 86) + 'T11:30:00.000Z'
        },
        {
            id: 'MEM-2003',
            name: 'Vikram Singh',
            phone: '9812736450',
            email: 'vikram.singh@outlook.com',
            dob: '',
            anniversary: '2019-' + addDays(todayStr, 5).slice(5),
            planPack: '1',
            startDate: vikramStart,
            endDate: vikramEnd,
            paymentStatus: 'Paid',
            createdAt: subDays(todayStr, 34) + 'T09:15:00.000Z'
        },
        {
            id: 'MEM-2004',
            name: 'Anjali Sharma',
            phone: '9008877665',
            email: 'anjali.s@gmail.com',
            dob: '',
            anniversary: '2021-' + todayStr.slice(5),
            planPack: '6',
            startDate: anjaliStart,
            endDate: anjaliEnd,
            paymentStatus: 'Paid',
            createdAt: subDays(todayStr, 179) + 'T18:00:00.000Z'
        },
        {
            id: 'MEM-2005',
            name: 'Rohit Verma',
            phone: '8887776665',
            email: 'rohitv@gmail.com',
            dob: '1995-11-20',
            anniversary: '',
            planPack: '3',
            startDate: rohitStart,
            endDate: rohitEnd,
            paymentStatus: 'Paid',
            createdAt: subDays(todayStr, 10) + 'T08:00:00.000Z'
        },
        {
            id: 'MEM-2006',
            name: 'Kabita Roy',
            phone: '7776665554',
            email: 'kabita.r@gmail.com',
            dob: '',
            anniversary: '',
            planPack: '1',
            startDate: todayStr,
            endDate: calculateEndDate(todayStr, '1'),
            paymentStatus: 'Pending',
            createdAt: todayStr + 'T12:00:00.000Z'
        }
    ];

    state.payments = [
        {
            id: 'TXN20001',
            memberId: 'MEM-2001',
            memberName: 'Aarav Sharma',
            memberPhone: '9876543210',
            planPack: '12',
            amount: PLAN_PRICES['12'],
            discount: 0,
            paymentDate: aaravStart,
            type: 'New Registration'
        },
        {
            id: 'TXN20002',
            memberId: 'MEM-2002',
            memberName: 'Priya Patel',
            memberPhone: '9123456780',
            planPack: '3',
            amount: PLAN_PRICES['3'],
            discount: 0,
            paymentDate: priyaStart,
            type: 'New Registration'
        },
        {
            id: 'TXN20003',
            memberId: 'MEM-2003',
            memberName: 'Vikram Singh',
            memberPhone: '9812736450',
            planPack: '1',
            amount: PLAN_PRICES['1'],
            discount: 0,
            paymentDate: vikramStart,
            type: 'New Registration'
        },
        {
            id: 'TXN20004',
            memberId: 'MEM-2004',
            memberName: 'Anjali Sharma',
            memberPhone: '9008877665',
            planPack: '6',
            amount: PLAN_PRICES['6'],
            discount: 0,
            paymentDate: anjaliStart,
            type: 'New Registration'
        },
        {
            id: 'TXN20005',
            memberId: 'MEM-2005',
            memberName: 'Rohit Verma',
            memberPhone: '8887776665',
            planPack: '3',
            amount: PLAN_PRICES['3'],
            discount: 0,
            paymentDate: rohitStart,
            type: 'New Registration'
        }
    ];
    
    // Seed initial leads if empty
    const initialLeads = [
        { name: "Suresh Gupta", mobile: "9823456711", goal: "Muscle gain", package: "3 Month Pack", createdAt: todayStr + 'T08:00:00.000Z' },
        { name: "Meera Nair", mobile: "9012345678", goal: "Fat loss", package: "1 Month Pack", createdAt: todayStr + 'T14:30:00.000Z' }
    ];
    localStorage.setItem("sk-fitness-leads", JSON.stringify(initialLeads));

    saveState();
}

// ==========================================
// DATE UTILITY HELPERS (Timezone-Independent)
// ==========================================
function getLocalDateString(dateObj = new Date()) {
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 10);
    return localISOTime;
}

function formatUserDate(dateStr) {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(day).padStart(2, '0')}-${months[monthIndex]}-${year}`;
}

function calculateEndDate(startDateStr, planPack) {
    const parts = startDateStr.split('-');
    const startDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    let daysToAdd = 30;
    
    if (planPack === '1') daysToAdd = 30;
    else if (planPack === '3') daysToAdd = 90;
    else if (planPack === '6') daysToAdd = 180;
    else if (planPack === '12') daysToAdd = 365;
    
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + daysToAdd - 1);
    return getLocalDateString(endDate);
}

function getRemainingDays(endDateStr) {
    const partsEnd = endDateStr.split('-');
    const expiry = new Date(parseInt(partsEnd[0], 10), parseInt(partsEnd[1], 10) - 1, parseInt(partsEnd[2], 10));
    
    const partsToday = getLocalDateString().split('-');
    const today = new Date(parseInt(partsToday[0], 10), parseInt(partsToday[1], 10) - 1, parseInt(partsToday[2], 10));
    
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

function getMemberStatus(endDateStr) {
    const remainingDays = getRemainingDays(endDateStr);
    if (remainingDays < 0) return 'Expired';
    else if (remainingDays <= 7) return 'Expiring';
    else return 'Active';
}

// ==========================================
// TOAST NOTIFICATIONS WRAPPER
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'danger') icon = '<i class="fa-solid fa-circle-xmark"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// LIVE GYM STATUS & HOLIDAY MANAGER
// ==========================================
function getGymStatusSettings() {
    return {
        mode: localStorage.getItem('sk_gym_status_mode') || 'auto',
        title: localStorage.getItem('sk_holiday_title') || 'Sunday Weekly Off',
        desc: localStorage.getItem('sk_holiday_desc') || 'Gym is closed today for weekly maintenance. Re-opens tomorrow at 5:00 AM!'
    };
}

function calculateGymStatus() {
    const settings = getGymStatusSettings();

    if (settings.mode === 'force_open') {
        return {
            isOpen: true,
            isHoliday: false,
            statusTag: 'OPEN',
            statusText: 'OPEN NOW',
            subText: '(Special Open Hours)',
            noticeActive: false
        };
    }

    if (settings.mode === 'holiday') {
        return {
            isOpen: false,
            isHoliday: true,
            statusTag: 'HOLIDAY',
            statusText: 'HOLIDAY TODAY',
            subText: settings.title,
            noticeActive: true,
            noticeTitle: settings.title,
            noticeDesc: settings.desc
        };
    }

    // Auto Mode: Follows official Mon-Sat 5-10 AM & 5-10 PM, Sunday closed
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeVal = hours * 60 + minutes;

    if (day === 0) {
        return {
            isOpen: false,
            isHoliday: true,
            statusTag: 'CLOSED',
            statusText: 'CLOSED TODAY',
            subText: 'Sunday Weekly Off',
            noticeActive: true,
            noticeTitle: 'Sunday Weekly Off',
            noticeDesc: 'Gym is closed every Sunday for weekly deep cleaning & maintenance. Re-opens Monday at 5:00 AM!'
        };
    }

    const morningOpen = (timeVal >= 300 && timeVal < 600); // 5:00 AM to 10:00 AM
    const eveningOpen = (timeVal >= 1020 && timeVal < 1320); // 5:00 PM to 10:00 PM

    if (morningOpen || eveningOpen) {
        return {
            isOpen: true,
            isHoliday: false,
            statusTag: 'OPEN',
            statusText: 'OPEN NOW',
            subText: morningOpen ? '(Morning Shift 5-10 AM)' : '(Evening Shift 5-10 PM)',
            noticeActive: false
        };
    } else {
        let nextShift = '';
        if (timeVal < 300) {
            nextShift = 'Opens today at 5:00 AM';
        } else if (timeVal >= 600 && timeVal < 1020) {
            nextShift = 'Opens today at 5:00 PM';
        } else {
            nextShift = 'Opens tomorrow at 5:00 AM';
        }
        return {
            isOpen: false,
            isHoliday: false,
            statusTag: 'CLOSED',
            statusText: 'CLOSED NOW',
            subText: nextShift,
            noticeActive: false
        };
    }
}

function renderLiveGymStatus() {
    const status = calculateGymStatus();
    const settings = getGymStatusSettings();

    // 1. Front Page Hero Pill
    const pill = document.getElementById('liveGymStatusPill');
    const textElem = document.getElementById('liveGymStatusText');
    const subElem = document.getElementById('liveGymStatusSub');
    if (pill && textElem) {
        pill.className = `live-status-pill ${status.isOpen ? 'open' : (status.isHoliday ? 'holiday' : 'closed')}`;
        textElem.innerText = status.statusText;
        if (subElem) subElem.innerText = status.subText;
    }

    // 2. Front Page Hero Live Calendar Status Tag
    const calTag = document.getElementById('hero-cal-status-badge');
    if (calTag) {
        calTag.className = `cal-status-tag ${status.isOpen ? 'open' : (status.isHoliday ? 'holiday' : 'closed')}`;
        calTag.innerText = status.statusTag;
    }

    // 3. Front Page Holiday & Special Announcement Banner
    const noticeBanner = document.getElementById('frontHolidayNotice');
    const noticeTitle = document.getElementById('frontHolidayTitle');
    const noticeDesc = document.getElementById('frontHolidayDesc');
    if (noticeBanner) {
        if (status.noticeActive) {
            noticeBanner.style.display = 'flex';
            if (noticeTitle) noticeTitle.innerText = status.noticeTitle || 'GYM NOTICE';
            if (noticeDesc) noticeDesc.innerText = status.noticeDesc || 'Gym is closed today.';
        } else {
            noticeBanner.style.display = 'none';
        }
    }

    // 4. Admin Dashboard Controls
    const adminPill = document.getElementById('admin-live-status-pill');
    const adminBadge = document.getElementById('admin-live-status-badge');
    if (adminPill && adminBadge) {
        adminPill.className = `live-status-pill ${status.isOpen ? 'open' : (status.isHoliday ? 'holiday' : 'closed')}`;
        adminBadge.innerText = `${status.statusText}`;
    }

    const btnAuto = document.getElementById('mode-btn-auto');
    const btnOpen = document.getElementById('mode-btn-open');
    const btnHoliday = document.getElementById('mode-btn-holiday');
    if (btnAuto && btnOpen && btnHoliday) {
        btnAuto.classList.toggle('active', settings.mode === 'auto');
        btnOpen.classList.toggle('active', settings.mode === 'force_open');
        btnHoliday.classList.toggle('active', settings.mode === 'holiday');
    }

    const titleInput = document.getElementById('holiday-title-input');
    const descInput = document.getElementById('holiday-desc-input');
    if (titleInput && !titleInput.value) titleInput.value = settings.title;
    if (descInput && !descInput.value) descInput.value = settings.desc;
}

function setGymStatusMode(mode) {
    localStorage.setItem('sk_gym_status_mode', mode);
    renderLiveGymStatus();
    
    if (typeof dbSaveSetting === 'function') {
        dbSaveSetting('live_status', {
            mode,
            title: localStorage.getItem('sk_holiday_title') || 'Sunday Weekly Off',
            desc: localStorage.getItem('sk_holiday_desc') || 'Gym is closed today.'
        });
    }

    let modeLabel = 'Auto Schedule (5-10 AM, 5-10 PM)';
    if (mode === 'force_open') modeLabel = 'Force OPEN (Website shows OPEN)';
    if (mode === 'holiday') modeLabel = 'Holiday / Closed (Notice published)';
    showToast(`Gym Live Status updated: ${modeLabel}`, 'success');
}

function applyHolidayPreset(title, desc) {
    const titleInput = document.getElementById('holiday-title-input');
    const descInput = document.getElementById('holiday-desc-input');
    if (titleInput) titleInput.value = title;
    if (descInput) descInput.value = desc;

    localStorage.setItem('sk_holiday_title', title);
    localStorage.setItem('sk_holiday_desc', desc);
    localStorage.setItem('sk_gym_status_mode', 'holiday');
    
    renderLiveGymStatus();

    if (typeof dbSaveSetting === 'function') {
        dbSaveSetting('live_status', { mode: 'holiday', title, desc });
    }

    showToast(`Holiday Preset Published: ${title}`, 'success');
}

function saveHolidayDetails() {
    const title = document.getElementById('holiday-title-input')?.value.trim() || 'Gym Holiday';
    const desc = document.getElementById('holiday-desc-input')?.value.trim() || 'Gym is closed today.';

    localStorage.setItem('sk_holiday_title', title);
    localStorage.setItem('sk_holiday_desc', desc);
    localStorage.setItem('sk_gym_status_mode', 'holiday');

    renderLiveGymStatus();

    if (typeof dbSaveSetting === 'function') {
        dbSaveSetting('live_status', { mode: 'holiday', title, desc });
    }

    showToast('Holiday notice saved & live on website!', 'success');
}

// ==========================================
// CELEBRATIONS & GREETINGS (BIRTHDAYS & ANNIVERSARIES)
// ==========================================
let currentCelebrationTab = 'today';

function switchCelebrationTab(tab) {
    currentCelebrationTab = tab;
    const tabToday = document.getElementById('tab-celeb-today');
    const tabUpcoming = document.getElementById('tab-celeb-upcoming');
    if (tabToday) tabToday.classList.toggle('active', tab === 'today');
    if (tabUpcoming) tabUpcoming.classList.toggle('active', tab === 'upcoming');
    renderCelebrationsWidget();
}

function getCelebrationEvents() {
    const today = new Date();
    const curMonth = today.getMonth() + 1; // 1-12
    const curDay = today.getDate(); // 1-31

    const todayEvents = [];
    const upcomingEvents = [];

    state.members.forEach(member => {
        // 1. Check Birthday
        if (member.dob) {
            const parts = member.dob.split('-');
            if (parts.length === 3) {
                const bMonth = parseInt(parts[1], 10);
                const bDay = parseInt(parts[2], 10);
                const bYear = parseInt(parts[0], 10);
                const age = today.getFullYear() - bYear;

                if (bMonth === curMonth && bDay === curDay) {
                    todayEvents.push({
                        type: 'birthday',
                        member: member,
                        title: `${member.name} - Birthday! 🎂`,
                        sub: age > 0 ? `Turning ${age} years young today! 💪` : 'Birthday celebration today! 🎂',
                        dateStr: 'Today'
                    });
                } else {
                    const thisYearBday = new Date(today.getFullYear(), bMonth - 1, bDay);
                    let diffDays = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    if (diffDays < 0) {
                        const nextYearBday = new Date(today.getFullYear() + 1, bMonth - 1, bDay);
                        diffDays = Math.ceil((nextYearBday.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    }
                    if (diffDays > 0 && diffDays <= 7) {
                        upcomingEvents.push({
                            type: 'birthday',
                            member: member,
                            title: `${member.name} - Birthday 🎂`,
                            sub: `In ${diffDays} day${diffDays > 1 ? 's' : ''} (${parts[2]}/${parts[1]})`,
                            dateStr: `In ${diffDays} days`
                        });
                    }
                }
            }
        }

        // 2. Check Anniversary
        if (member.anniversary) {
            const parts = member.anniversary.split('-');
            if (parts.length === 3) {
                const aMonth = parseInt(parts[1], 10);
                const aDay = parseInt(parts[2], 10);

                if (aMonth === curMonth && aDay === curDay) {
                    todayEvents.push({
                        type: 'anniversary',
                        member: member,
                        title: `${member.name} - Wedding Anniversary! 💍`,
                        sub: 'Wishing a happy married life! 💐✨',
                        dateStr: 'Today'
                    });
                } else {
                    const thisYearAnniv = new Date(today.getFullYear(), aMonth - 1, aDay);
                    let diffDays = Math.ceil((thisYearAnniv.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    if (diffDays < 0) {
                        const nextYearAnniv = new Date(today.getFullYear() + 1, aMonth - 1, aDay);
                        diffDays = Math.ceil((nextYearAnniv.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    }
                    if (diffDays > 0 && diffDays <= 7) {
                        upcomingEvents.push({
                            type: 'anniversary',
                            member: member,
                            title: `${member.name} - Anniversary 💍`,
                            sub: `In ${diffDays} day${diffDays > 1 ? 's' : ''} (${parts[2]}/${parts[1]})`,
                            dateStr: `In ${diffDays} days`
                        });
                    }
                }
            }
        }
    });

    return { todayEvents, upcomingEvents };
}

function renderCelebrationsWidget() {
    const { todayEvents, upcomingEvents } = getCelebrationEvents();
    
    const badge = document.getElementById('celebrations-badge-count');
    if (badge) {
        badge.innerText = `${todayEvents.length} Today`;
    }

    const container = document.getElementById('celebrations-feed-container');
    if (!container) return;

    const listToDisplay = currentCelebrationTab === 'today' ? todayEvents : upcomingEvents;

    if (listToDisplay.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--muted); padding: 1.5rem; font-size: 0.88rem;">
                ${currentCelebrationTab === 'today' ? 'No birthdays or anniversaries today. 🎉' : 'No upcoming celebrations in the next 7 days.'}
            </div>
        `;
        return;
    }

    container.innerHTML = listToDisplay.map(ev => {
        const isBday = ev.type === 'birthday';
        const icon = isBday ? '🎂' : '💍';
        const btnLabel = isBday ? 'Wish Birthday' : 'Wish Anniversary';
        const clickHandler = isBday ? `sendBirthdayWhatsApp('${ev.member.id}')` : `sendAnniversaryWhatsApp('${ev.member.id}')`;
        const accentCol = isBday ? 'var(--amber)' : 'var(--blue)';

        return `
            <div class="celebration-item-card" style="border-left: 3px solid ${accentCol};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.5rem;">${icon}</span>
                        <div>
                            <strong style="color: var(--text); font-size: 0.92rem; display: block;">${ev.member.name}</strong>
                            <span style="color: var(--muted); font-size: 0.78rem;">${ev.sub} &bull; Ph: ${ev.member.phone}</span>
                        </div>
                    </div>
                    <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--muted); font-weight: 800;">
                        ${ev.dateStr}
                    </span>
                </div>
                <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                    <button type="button" class="celeb-whatsapp-btn" onclick="${clickHandler}">
                        <i class="fa-brands fa-whatsapp"></i> ${btnLabel}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function sendBirthdayWhatsApp(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    const message = `🎂 *Happy Birthday, ${member.name}!* 🎉💪\n\n*SK Workout Zone (Unisex Gym)* ki poori team ki taraf se aapko janamdin ki bohot bohot shubhkamnayein! 🥳🔥\n\nAane wala saal aapke liye acchi health, strength aur solid fitness lekar aaye!\n\nAapka birthday special banane ke liye, SK Workout Zone ki taraf se aapke next renewal par *Special Birthday Discount* ya aapke friend ke liye *3 Days Free Workout Pass*! 🎁🏋️\n\nEat clean, train hard & enjoy your day! 🍰💪\n\nBest Regards,\n*Sumit & Team SK Workout Zone*\n📞 +91 86198 57725\n📍 Plot No. 298 Mangal Vihar, Agra Road, Jamdoli, Jaipur\n📸 https://www.instagram.com/sk_workout_zone_2711`;

    window.open(`https://wa.me/91${member.phone}?text=${encodeURIComponent(message)}`, '_blank');
}

function sendAnniversaryWhatsApp(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    const message = `💍 *Happy Wedding Anniversary, ${member.name} ji!* ✨💐\n\n*SK Workout Zone (Unisex Gym)* family ki taraf se aapko aur aapke partner ko Marriage Anniversary ki dher saari badhaiyan aur shubhkamnayein! 🥂🎉\n\nBhagwan kare aap dono ka saath hamesha bana rahe, aur aap dono hamesha swasth, khush aur fit rahein! 🙏💪\n\nEnjoy your special day with family & loved ones! 🎂❤️\n\nWarm Wishes,\n*Sumit & Team SK Workout Zone*\n📞 +91 86198 57725\n📍 Jamdoli, Agra Road, Jaipur\n📸 https://www.instagram.com/sk_workout_zone_2711`;

    window.open(`https://wa.me/91${member.phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// ==========================================
// ADMIN DASHBOARD MODULES
// ==========================================
function refreshAdminDashboard() {
    updateDashboardKPIs();
    filterMembers();
    renderBillingLedger();
    drawAnalyticsChart();
    renderLeadsList();
    renderCelebrationsWidget();
    renderLiveGymStatus();
}

function updateDashboardKPIs() {
    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    
    state.members.forEach(member => {
        const status = getMemberStatus(member.endDate);
        if (status === 'Active') activeCount++;
        else if (status === 'Expiring') expiringCount++;
        else if (status === 'Expired') expiredCount++;
    });
    
    const totalRev = state.payments.reduce((sum, pay) => sum + pay.amount, 0);
    
    // Count-up stats animation
    animateValue('kpi-active-members', 0, activeCount + expiringCount, 800);
    animateValue('kpi-total-revenue', 0, totalRev, 1000);
    animateValue('kpi-expiring-soon', 0, expiringCount, 600);
    animateValue('kpi-expired', 0, expiredCount, 600);

    // Dynamic warning alert popup (throttled)
    if (expiringCount > 0 || expiredCount > 0) {
        let msg = [];
        if (expiredCount > 0) msg.push(`${expiredCount} packs expired`);
        if (expiringCount > 0) msg.push(`${expiringCount} expiring soon (<= 7 days)`);
        
        if (window.lastAlertTime === undefined || (Date.now() - window.lastAlertTime) > 30000) {
            showToast(`Dashboard Alert: You have ${msg.join(', ')}. Remind them now!`, 'warning');
            window.lastAlertTime = Date.now();
        }
    }
}

function animateValue(elementId, start, end, duration) {
    const obj = document.getElementById(elementId);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = Math.floor(progress * (end - start) + start);
        
        if (elementId === 'kpi-total-revenue') {
            obj.innerText = `₹${currentVal.toLocaleString('en-IN')}`;
        } else {
            obj.innerText = currentVal.toLocaleString('en-IN');
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Directory Search & Filter list
function filterMembers() {
    const searchVal = document.getElementById("member-search").value.toLowerCase().trim();
    const filterVal = document.getElementById("member-filter-status").value;
    const tbody = document.getElementById("members-list-body");
    tbody.innerHTML = "";
    
    const filtered = state.members.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchVal) || m.phone.includes(searchVal);
        const status = getMemberStatus(m.endDate);
        
        let matchesFilter = true;
        if (filterVal === 'Active') matchesFilter = (status === 'Active');
        else if (filterVal === 'Expiring') matchesFilter = (status === 'Expiring');
        else if (filterVal === 'Expired') matchesFilter = (status === 'Expired');
        else if (filterVal === 'Pending') matchesFilter = (m.paymentStatus === 'Pending');
        
        return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--muted); padding: 2rem;">
                    No members match search / status filter.
                </td>
            </tr>
        `;
        return;
    }

    // Sort newest first
    filtered.sort((a,b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate));

    filtered.forEach(m => {
        const status = getMemberStatus(m.endDate);
        let badgeClass = 'active';
        if (status === 'Expiring') badgeClass = 'expiring';
        if (status === 'Expired') badgeClass = 'expired';

        let statusHTML = `<span class="status-badge ${badgeClass}">${status}</span>`;
        if (m.paymentStatus === 'Pending') {
            statusHTML += `<div style="font-size: 0.65rem; color: var(--red); font-weight: 850; margin-top: 4px;">FEE PENDING</div>`;
        }

        const remaining = getRemainingDays(m.endDate);
        let remainingHTML = '';
        if (m.paymentStatus === 'Pending') {
            remainingHTML = `<span style="color: var(--red); font-weight: 800;">Pending</span>`;
        } else if (remaining < 0) {
            remainingHTML = `<span style="color: var(--red); font-weight: 850;">Expired ${Math.abs(remaining)} d ago</span>`;
        } else if (remaining === 0) {
            remainingHTML = `<span style="color: var(--amber); font-weight: 900;">Expires Today!</span>`;
        } else if (remaining <= 7) {
            remainingHTML = `<span style="color: var(--amber); font-weight: 800;">${remaining} d remaining</span>`;
        } else {
            remainingHTML = `<span style="color: var(--mint); font-weight: 800;">${remaining} d remaining</span>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <strong>${escapeHTML(m.name)}</strong>
                <div style="font-size:0.75rem; color: var(--muted); margin-top: 2px;">${escapeHTML(m.email || 'No email')}</div>
            </td>
            <td style="font-family: monospace;">${escapeHTML(m.phone)}</td>
            <td>${PLAN_NAMES[m.planPack]}</td>
            <td>
                <strong>${formatUserDate(m.endDate)}</strong>
                <div style="font-size: 0.76rem; margin-top: 2px;">${remainingHTML}</div>
            </td>
            <td>${statusHTML}</td>
            <td>
                <div class="action-btn-group">
                    <button class="admin-action-btn pay" title="Renew Plan" onclick="openRenewalModal('${m.id}')"><i class="fa-solid fa-wallet"></i></button>
                    <button class="admin-action-btn edit" title="Edit Profile" onclick="openEditMemberModal('${m.id}')"><i class="fa-solid fa-user-pen"></i></button>
                    <button class="admin-action-btn remind" title="Send Reminder" onclick="openReminderModal('${m.id}')"><i class="fa-brands fa-whatsapp"></i></button>
                    <button class="admin-action-btn delete" title="Delete Profile" onclick="deleteMember('${m.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderReminderList();
}

// Expiry alerts listing panel on right column
function renderReminderList() {
    const container = document.getElementById("reminder-list-container");
    const countBadge = document.getElementById("reminder-count");
    if (!container) return;

    const alertMembers = state.members.filter(m => {
        const s = getMemberStatus(m.endDate);
        return s === 'Expiring' || s === 'Expired' || m.paymentStatus === 'Pending';
    });

    countBadge.innerText = `${alertMembers.length} Alerts`;

    if (alertMembers.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--muted); padding: 1.5rem;">
                <i class="fa-solid fa-circle-check" style="font-size: 1.8rem; color: var(--mint); margin-bottom: 8px; display:block;"></i>
                All packs are active!
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    alertMembers.forEach(m => {
        const s = getMemberStatus(m.endDate);
        const rem = getRemainingDays(m.endDate);
        let label = '';
        let badgeClass = 'active';

        if (m.paymentStatus === 'Pending') {
            label = 'Fee Payment Pending';
            badgeClass = 'expired';
        } else if (s === 'Expired') {
            label = `Expired ${Math.abs(rem)} days ago`;
            badgeClass = 'expired';
        } else {
            label = `Ends in ${rem} days`;
            badgeClass = 'expiring';
        }

        const card = document.createElement("div");
        card.className = "side-widget-card";
        card.innerHTML = `
            <div class="widget-info">
                <span class="widget-name">${escapeHTML(m.name)}</span>
                <span class="widget-sub">
                    <span class="status-badge ${badgeClass}" style="font-size: 0.65rem; min-height:18px; padding: 0 6px;">${m.paymentStatus === 'Pending' ? 'Pending' : s}</span>
                    <strong style="margin-left: 6px; font-size: 0.8rem;">${label}</strong>
                </span>
            </div>
            <button class="join-btn small" style="min-height:30px; font-size: 0.72rem; padding: 0 10px;" onclick="openReminderModal('${m.id}')">
                <i class="fa-brands fa-whatsapp"></i> Remind
            </button>
        `;
        container.appendChild(card);
    });
}

// Render Billing Transaction logs table
function renderBillingLedger() {
    const tbody = document.getElementById("payments-list-body");
    if (!tbody) return;
    
    if (state.payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--muted); padding: 2rem;">
                    No transactions recorded yet.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";
    // Sort transactions newest first
    const sorted = [...state.payments].sort((a,b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    sorted.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 700; color: var(--blue);">${p.id}</td>
            <td>${formatUserDate(p.paymentDate)}</td>
            <td><strong>${escapeHTML(p.memberName)}</strong></td>
            <td style="font-family: monospace;">${escapeHTML(p.memberPhone)}</td>
            <td>${PLAN_NAMES[p.planPack] || p.planPack}</td>
            <td style="color: var(--red); font-weight: 800;">${p.discount > 0 ? `₹${p.discount.toLocaleString('en-IN')}` : '-'}</td>
            <td style="color: var(--mint); font-weight: 900;">₹${p.amount.toLocaleString('en-IN')}</td>
            <td><span class="status-badge active" style="background: rgba(255,255,255,0.04); border-color: var(--line); color: var(--text);">${p.type || 'Payment'}</span></td>
            <td>
                <button class="admin-action-btn edit" style="width: 28px; height: 28px;" title="Print Receipt" onclick="showInvoice('${p.id}')">
                    <i class="fa-solid fa-receipt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Popularity progress bars values setting
function drawAnalyticsChart() {
    const counts = { '1': 0, '3': 0, '6': 0, '12': 0 };
    state.members.forEach(m => {
        if (counts[m.planPack] !== undefined) counts[m.planPack]++;
    });

    const total = Math.max(state.members.length, 1);
    
    // Set widths & labels
    ['1', '3', '6', '12'].forEach(key => {
        const bar = document.getElementById(`chart-bar-${key}m`);
        const valText = document.getElementById(`chart-val-${key}m`);
        if (bar && valText) {
            const percent = (counts[key] / total) * 100;
            bar.style.width = `${Math.max(percent, 5)}%`;
            valText.innerText = counts[key];
        }
    });
}

// Public Enquiries leads listing & converters
function renderLeadsList() {
    const container = document.getElementById("leads-list-container");
    if (!container) return;

    const leads = JSON.parse(localStorage.getItem("sk-fitness-leads") || "[]");
    if (leads.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--muted); padding: 1.5rem;">
                <i class="fa-solid fa-circle-check" style="font-size: 1.8rem; color: var(--lime); margin-bottom: 8px; display:block;"></i>
                No new public leads.
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    leads.forEach((l, idx) => {
        const card = document.createElement("div");
        card.className = "side-widget-card";
        card.innerHTML = `
            <div class="widget-info">
                <span class="widget-name">${escapeHTML(l.name)}</span>
                <span class="widget-sub">
                    <i class="fa-solid fa-phone" style="font-size:0.7rem;"></i> ${escapeHTML(l.mobile)}
                    <div style="font-size:0.72rem; color: var(--lime); margin-top:2px;">Goal: ${escapeHTML(l.goal || 'General')} (${escapeHTML(l.package || '3 Month Pack')})</div>
                </span>
            </div>
            <div class="leads-btn-grp">
                <button class="lead-action-btn convert" title="Convert to Member" onclick="convertLead('${l.id}')">Convert</button>
                <button class="lead-action-btn discard" title="Discard Enquiry" onclick="discardLead('${l.id}')"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Convert public lead enquiry into member
function convertLead(leadId) {
    const leads = JSON.parse(localStorage.getItem("sk-fitness-leads") || "[]");
    const lead = leads.find(l => l.id === leadId || (l.mobile && l.name && !l.id)); // fallback for legacy leads
    if (!lead) return;

    // Open Admin Registration Modal
    openModal("adminRegModal");
    
    // Autofill fields
    document.getElementById("reg-name").value = lead.name;
    document.getElementById("reg-phone").value = lead.mobile;
    document.getElementById("reg-email").value = lead.email || "";
    
    // Map Package options to select values
    const selectPack = document.getElementById("reg-pack");
    if (lead.package && selectPack) {
        if (lead.package.includes("1 Month")) selectPack.value = "1";
        else if (lead.package.includes("3 Month")) selectPack.value = "3";
        else if (lead.package.includes("6 Month")) selectPack.value = "6";
        else if (lead.package.includes("12 Month")) selectPack.value = "12";
    }
    
    updateCalcFields();
    showToast("Lead details loaded into registration form!");
}

function discardLead(leadId) {
    let leads = JSON.parse(localStorage.getItem("sk-fitness-leads") || "[]");
    const lead = leads.find(l => l.id === leadId);
    const name = lead ? lead.name : "this enquiry";

    if (confirm(`Are you sure you want to delete lead enquiry of "${name}"?`)) {
        leads = leads.filter(l => l.id !== leadId);
        localStorage.setItem("sk-fitness-leads", JSON.stringify(leads));
        showToast("Lead enquiry deleted.", "danger");
        renderLeadsList();
    }
}

// ==========================================
// DIALOG OVERLAY VIEW SWITCHERS
// ==========================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
    }
}

// Open Admin Register Form Modal
function openAdminRegisterModal() {
    document.getElementById("adminRegForm").reset();
    document.getElementById("reg-date").value = getLocalDateString();
    document.getElementById("reg-discount").value = 0;
    updateCalcFields();
    openModal("adminRegModal");
}

// Update calculated price inputs in Registration
function updateCalcFields() {
    const selectPack = document.getElementById('reg-pack');
    if (!selectPack) return;
    const val = selectPack.value;
    const price = PLAN_PRICES[val];
    const discountInput = document.getElementById('reg-discount');
    let discount = 0;
    
    if (discountInput) {
        discount = parseInt(discountInput.value) || 0;
        if (discount < 0) discount = 0;
        if (discount > price) {
            discount = price;
            discountInput.value = price;
        }
    }

    const netPrice = price - discount;
    
    document.getElementById('calc-base-price').innerText = `₹${price.toLocaleString()}`;
    
    const discRow = document.getElementById('calc-discount-row');
    if (discRow) {
        if (discount > 0) {
            discRow.style.display = 'flex';
            document.getElementById('calc-discount-val').innerText = `-₹${discount.toLocaleString()}`;
        } else {
            discRow.style.display = 'none';
        }
    }
    document.getElementById('calc-total-price').innerText = `₹${netPrice.toLocaleString()}`;
}

// Submit Admin Registration
function handleAdminRegistration(event) {
    event.preventDefault();
    
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const planPack = document.getElementById('reg-pack').value;
    const startDate = document.getElementById('reg-date').value;
    const paymentStatus = document.getElementById('reg-status').value;
    const discount = parseInt(document.getElementById('reg-discount').value) || 0;
    const dob = document.getElementById('reg-dob') ? document.getElementById('reg-dob').value : '';
    const anniversary = document.getElementById('reg-anniversary') ? document.getElementById('reg-anniversary').value : '';
    
    if (!name || !phone || !startDate) {
        showToast('Please fill all mandatory fields.', 'danger');
        return;
    }
    
    if (!/^\d{10}$/.test(phone)) {
        showToast('Mobile number must be exactly 10 digits.', 'danger');
        return;
    }
    
    const basePrice = PLAN_PRICES[planPack];
    const finalAmount = Math.max(0, basePrice - discount);
    const endDate = calculateEndDate(startDate, planPack);
    const memberId = `MEM-${Date.now().toString().slice(-6)}`;
    
    const newMember = {
        id: memberId,
        name,
        phone,
        email: email || '',
        dob: dob || '',
        anniversary: anniversary || '',
        planPack,
        startDate,
        endDate,
        paymentStatus,
        createdAt: new Date().toISOString()
    };
    
    state.members.push(newMember);
    if (typeof dbSaveMember === 'function') {
        dbSaveMember(newMember);
    }
    
    let txnId = '';
    if (paymentStatus === 'Paid') {
        txnId = `TXN${Date.now().toString().slice(-5)}`;
        const newPayment = {
            id: txnId,
            memberId: memberId,
            memberName: name,
            memberPhone: phone,
            planPack,
            amount: finalAmount,
            discount: discount,
            paymentDate: startDate,
            type: 'New Registration'
        };
        state.payments.push(newPayment);
        if (typeof dbSavePayment === 'function') {
            dbSavePayment(newPayment);
        }
    }
    
    // Remove lead from enquiry list if it was a converted lead
    let leads = JSON.parse(localStorage.getItem("sk-fitness-leads") || "[]");
    const initialLen = leads.length;
    leads = leads.filter(l => l.mobile !== phone);
    if (leads.length < initialLen) {
        localStorage.setItem("sk-fitness-leads", JSON.stringify(leads));
        if (typeof dbDeleteLead === 'function') {
            dbDeleteLead(phone);
        }
    }
    
    saveState();
    closeModal("adminRegModal");
    showToast(`Registered successfully! Member ID: ${memberId}`);
    
    refreshAdminDashboard();
    
    if (paymentStatus === 'Paid' && txnId) {
        showInvoice(txnId);
    }
}

// Delete Profile
function deleteMember(id) {
    const m = state.members.find(member => member.id === id);
    if (!m) return;
    
    if (confirm(`Are you sure you want to delete profile of "${m.name}"? This will not erase their invoice transactions.`)) {
        state.members = state.members.filter(member => member.id !== id);
        saveState();
        if (typeof dbDeleteMember === 'function') {
            dbDeleteMember(id);
        }
        showToast('Member profile deleted.', 'danger');
        refreshAdminDashboard();
    }
}

// Renewal functions
function openRenewalModal(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;
    
    document.getElementById('pay-member-id').value = member.id;
    document.getElementById('pay-member-name').value = member.name;
    document.getElementById('pay-pack').value = member.planPack;
    document.getElementById('pay-discount').value = 0;
    
    const partsExpiry = member.endDate.split('-');
    const currentExpiry = new Date(parseInt(partsExpiry[0], 10), parseInt(partsExpiry[1], 10) - 1, parseInt(partsExpiry[2], 10));
    
    const partsToday = getLocalDateString().split('-');
    const today = new Date(parseInt(partsToday[0], 10), parseInt(partsToday[1], 10) - 1, parseInt(partsToday[2], 10));
    
    if (currentExpiry >= today) {
        const nextDay = new Date(currentExpiry.getFullYear(), currentExpiry.getMonth(), currentExpiry.getDate() + 1);
        document.getElementById('pay-start-date').value = getLocalDateString(nextDay);
    } else {
        document.getElementById('pay-start-date').value = getLocalDateString();
    }
    
    updatePayAmount();
    openModal('payModal');
}

function updatePayAmount() {
    const pack = document.getElementById("pay-pack").value;
    const basePrice = PLAN_PRICES[pack];
    const discountInput = document.getElementById("pay-discount");
    let discount = 0;
    
    if (discountInput) {
        discount = parseInt(discountInput.value) || 0;
        if (discount < 0) discount = 0;
        if (discount > basePrice) {
            discount = basePrice;
            discountInput.value = basePrice;
        }
    }
    
    const netPrice = basePrice - discount;
    
    const basePriceEl = document.getElementById("pay-base-price");
    if (basePriceEl) basePriceEl.innerText = `₹${basePrice.toLocaleString()}`;
    
    const discRow = document.getElementById("pay-discount-row");
    if (discRow) {
        if (discount > 0) {
            discRow.style.display = 'flex';
            const discValEl = document.getElementById("pay-discount-val");
            if (discValEl) discValEl.innerText = `-₹${discount.toLocaleString()}`;
        } else {
            discRow.style.display = 'none';
        }
    }
    
    document.getElementById("pay-amount").innerText = `₹${netPrice.toLocaleString()}`;
}

// Submit Renewal
function handleRenewMember(event) {
    event.preventDefault();
    
    const memberId = document.getElementById('pay-member-id').value;
    const planPack = document.getElementById('pay-pack').value;
    const startDate = document.getElementById('pay-start-date').value;
    const discount = parseInt(document.getElementById('pay-discount').value) || 0;
    
    const memberIndex = state.members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) return;
    
    const member = state.members[memberIndex];
    const basePrice = PLAN_PRICES[planPack];
    const finalAmount = Math.max(0, basePrice - discount);
    const endDate = calculateEndDate(startDate, planPack);
    
    // Update Member expiry parameters
    member.planPack = planPack;
    member.startDate = startDate;
    member.endDate = endDate;
    member.paymentStatus = 'Paid';
    
    const txnId = `TXN${Date.now().toString().slice(-5)}`;
    const newPayment = {
        id: txnId,
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phone,
        planPack,
        amount: finalAmount,
        discount: discount,
        paymentDate: getLocalDateString(),
        type: 'Renewal'
    };
    
    state.payments.push(newPayment);
    saveState();
    
    if (typeof dbSaveMember === 'function') {
        dbSaveMember(member);
    }
    if (typeof dbSavePayment === 'function') {
        dbSavePayment(newPayment);
    }
    
    closeModal("payModal");
    showToast(`Membership renewed for ${member.name}!`);
    refreshAdminDashboard();
    
    showInvoice(txnId);
}

// Profile edit controls
function openEditMemberModal(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;
    
    document.getElementById('edit-member-id').value = member.id;
    document.getElementById('edit-name').value = member.name;
    document.getElementById('edit-phone').value = member.phone;
    document.getElementById('edit-email').value = member.email || '';
    if (document.getElementById('edit-dob')) {
        document.getElementById('edit-dob').value = member.dob || '';
    }
    if (document.getElementById('edit-anniversary')) {
        document.getElementById('edit-anniversary').value = member.anniversary || '';
    }
    
    openModal('editModal');
}

function handleEditMember(event) {
    event.preventDefault();
    
    const memberId = document.getElementById('edit-member-id').value;
    const name = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const dob = document.getElementById('edit-dob') ? document.getElementById('edit-dob').value : '';
    const anniversary = document.getElementById('edit-anniversary') ? document.getElementById('edit-anniversary').value : '';
    
    if (!name || !phone) {
        showToast('Name and mobile phone are required.', 'danger');
        return;
    }
    
    if (!/^\d{10}$/.test(phone)) {
        showToast('Mobile number must be 10 digits.', 'danger');
        return;
    }
    
    const idx = state.members.findIndex(m => m.id === memberId);
    if (idx === -1) return;
    
    state.members[idx].name = name;
    state.members[idx].phone = phone;
    state.members[idx].email = email;
    state.members[idx].dob = dob;
    state.members[idx].anniversary = anniversary;
    
    // Cascade edits to payment ledger for name display consistency
    state.payments.forEach(p => {
        if (p.memberId === memberId) {
            p.memberName = name;
            p.memberPhone = phone;
        }
    });
    
    saveState();
    if (typeof dbSaveMember === 'function') {
        dbSaveMember(state.members[idx]);
    }
    closeModal("editModal");
    showToast('Member profile updated successfully!');
    refreshAdminDashboard();
}

// Receipt formatting & rendering
function showInvoice(txnId) {
    const payment = state.payments.find(p => p.id === txnId);
    if (!payment) {
        showToast('Receipt details not found.', 'danger');
        return;
    }
    
    const member = state.members.find(m => m.id === payment.memberId);
    let validityText = 'N/A';
    if (member) {
        validityText = `${formatUserDate(member.startDate)} to ${formatUserDate(member.endDate)}`;
    }
    
    const discount = payment.discount || 0;
    const subtotal = PLAN_PRICES[payment.planPack] || payment.amount;
    
    // Set receipt overlay elements
    document.getElementById('receipt-txn-id').innerText = payment.id;
    document.getElementById('receipt-date').innerText = formatUserDate(payment.paymentDate);
    document.getElementById('receipt-time').innerText = formatUserDate(payment.paymentDate) + ' ' + new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
    document.getElementById('receipt-member-name').innerText = payment.memberName;
    document.getElementById('receipt-member-phone').innerText = payment.memberPhone;
    document.getElementById('receipt-item-name').innerText = `${PLAN_NAMES[payment.planPack]} Gym Membership`;
    document.getElementById('receipt-item-validity').innerText = validityText;
    
    document.getElementById('receipt-subtotal-val').innerText = `₹${subtotal.toLocaleString('en-IN')}`;
    
    const discRow = document.getElementById('receipt-discount-row');
    if (discRow) {
        if (discount > 0) {
            discRow.style.display = 'flex';
            document.getElementById('receipt-discount-val').innerText = `-₹${discount.toLocaleString('en-IN')}`;
        } else {
            discRow.style.display = 'none';
        }
    }
    
    document.getElementById('receipt-total-val').innerText = `₹${payment.amount.toLocaleString('en-IN')}`;

    // WhatsApp Digital Invoice Generator
    const cleanPhone = payment.memberPhone.replace(/\D/g, '');
    const prefixPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone;
    
    const waMessageText = `*SK WORKOUT ZONE - BILLING INVOICE* 🧾\n\nHello *${payment.memberName}*,\nThank you for your payment! Here is your digital membership receipt:\n\n*Receipt No:* ${payment.id}\n*Date:* ${formatUserDate(payment.paymentDate)}\n*Plan Pack:* ${PLAN_NAMES[payment.planPack] || payment.planPack}\n*Validity:* ${validityText}\n\n*Base Price:* ₹${subtotal.toLocaleString('en-IN')}\n*Discount Applied:* -₹${discount.toLocaleString('en-IN')}\n*Net Amount Paid:* *₹${payment.amount.toLocaleString('en-IN')}* (PAID)\n\n📍 *Gym Location:* Plot No. 298, Mangal Vihar, Agra Road, Jamdoli, Jaipur\n🗺️ *Google Maps:* https://maps.app.goo.gl/LDyRF7d3ncYDzPhQ8\n📞 *Contact:* +91 86198 57725\n📸 *Instagram:* https://www.instagram.com/sk_workout_zone_2711\n\n*NO PAIN NO GAIN!* 💪\nLet's crush your fitness goals together!\n*SK Workout Zone (Unisex Gym)*`;
    
    const encodedWaMessage = encodeURIComponent(waMessageText);
    const waLink = `https://api.whatsapp.com/send?phone=${prefixPhone}&text=${encodedWaMessage}`;
    
    const waBtn = document.getElementById('receipt-whatsapp-btn');
    if (waBtn) {
        waBtn.href = waLink;
    }
    
    openModal('receiptModal');
}

// WhatsApp Reminder message templates (Hinglish!)
function openReminderModal(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;
    
    const status = getMemberStatus(member.endDate);
    const remaining = getRemainingDays(member.endDate);
    const amount = PLAN_PRICES[member.planPack];
    
    let messageText = '';
    
    if (member.paymentStatus === 'Pending') {
        messageText = `Hello ${member.name},\n\nHope you are enjoying your workouts at *SK Workout Zone* 💪.\n\nAapki membership active hai, par iska fee payment (*₹${amount.toLocaleString('en-IN')}*) for *${PLAN_NAMES[member.planPack]}* abhi pending hai.\n\nUninterrupted access ke liye please desk par contact karke payment clear kar dein.\n\nThank you,\n*SK Workout Zone (Unisex Gym)*\n📞 +91 86198 57725\n📸 *Instagram:* https://www.instagram.com/sk_workout_zone_2711`;
    } else if (status === 'Expired') {
        messageText = `Hello ${member.name},\n\n*SK Workout Zone* se friendly alert! Aapki *${PLAN_NAMES[member.planPack]}* membership *${Math.abs(remaining)} din pehle expired* ho gayi hai (on ${formatUserDate(member.endDate)}) ⚠️.\n\nWorkout flow banaye rakhne ke liye pack renew kar lijiye. Dues pay karne me koi issue ho toh batayein.\n\n*Renewal packs:* \n- 1 Month: ₹1,000\n- 3 Months: ₹2,500\n- 6 Months: ₹4,500\n- 1 Year: ₹8,000\n\nGym me milte hain!\n*SK Workout Zone (Unisex Gym)*\n📍 Agra Road, Jamdoli, Jaipur (https://maps.app.goo.gl/LDyRF7d3ncYDzPhQ8)\n📞 +91 86198 57725\n📸 *Instagram:* https://www.instagram.com/sk_workout_zone_2711`;
    } else {
        // Expiring soon
        messageText = `Hello ${member.name},\n\n*SK Workout Zone* se quick alert! Aapki *${PLAN_NAMES[member.planPack]}* membership *${remaining} din me expire* hone wali hai (on ${formatUserDate(member.endDate)}) ⏳.\n\nExpire hone se pehle hi apna pack renew kar lijiye taaki aapki training continue rahe.\n\n*Renewal plans for you:* \n- 1 Month: ₹1,000\n- 3 Months: ₹2,500\n- 6 Months: ₹4,500\n- 1 Year: ₹8,000\n\nThanks,\n*SK Workout Zone (Unisex Gym)*\n📍 Agra Road, Jamdoli, Jaipur (https://maps.app.goo.gl/LDyRF7d3ncYDzPhQ8)\n📞 +91 86198 57725\n📸 *Instagram:* https://www.instagram.com/sk_workout_zone_2711`;
    }
    
    document.getElementById('reminder-msg-text').value = messageText;
    
    // URL-encode & set WhatsApp redirect link
    const cleanPhone = member.phone.replace(/\D/g, '');
    const prefixPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone;
    const encoded = encodeURIComponent(messageText);
    
    document.getElementById('reminder-whatsapp-link').href = `https://api.whatsapp.com/send?phone=${prefixPhone}&text=${encoded}`;
    
    openModal('remindModal');
}

function copyReminderText() {
    const area = document.getElementById("reminder-msg-text");
    area.select();
    area.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(area.value)
        .then(() => showToast("Reminder message copied to clipboard!"))
        .catch(() => showToast("Failed to copy message.", "danger"));
}

// ==========================================
// CANBERRA PARTICLES ENGINE & UTILS
// ==========================================
function resizeCanvas() {
  particleCanvas.width = window.innerWidth * window.devicePixelRatio;
  particleCanvas.height = window.innerHeight * window.devicePixelRatio;
  particleCanvas.style.width = `${window.innerWidth}px`;
  particleCanvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  particles = Array.from({ length: Math.min(90, Math.floor(window.innerWidth / 16)) }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 2.2 + 0.7,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    color: Math.random() > 0.62 ? "rgba(185,255,40,.58)" : "rgba(255,255,255,.34)",
  }));
}

function animateParticles() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles.forEach((p, index) => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
    if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    for (let j = index + 1; j < particles.length; j += 1) {
      const other = particles[j];
      const dx = p.x - other.x;
      const dy = p.y - other.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 115) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(other.x, other.y);
        ctx.strokeStyle = `rgba(185,255,40,${0.13 * (1 - distance / 115)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  });
  requestAnimationFrame(animateParticles);
}

function handleScroll() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  const percent = height > 0 ? (scrollTop / height) * 100 : 0;
  progressLine.style.width = `${percent}%`;
  header.classList.toggle("scrolled", scrollTop > 30);
}

function moveGlow(event) {
  cursorGlow.style.left = `${event.clientX}px`;
  cursorGlow.style.top = `${event.clientY}px`;
}

function calculateBmi() {
  const height = Number(document.getElementById("heightInput").value) / 100;
  const weight = Number(document.getElementById("weightInput").value);
  if (!height || !weight) return;
  const bmi = weight / (height * height);
  let label = "Healthy range";
  let feedback = "Healthy range is 18.5 - 24.9. Perfect! Your weight is ideal.";
  let color = "var(--lime)";
  
  if (bmi < 18.5) {
    label = "Underweight";
    feedback = "Underweight is < 18.5. Normal range is 18.5 - 24.9. Consider a clean caloric surplus.";
    color = "var(--blue)";
  } else if (bmi >= 25 && bmi < 30) {
    label = "Overweight";
    feedback = "Overweight is 25.0 - 29.9. Normal range is 18.5 - 24.9. Consider a slight calorie deficit.";
    color = "var(--amber)";
  } else if (bmi >= 30) {
    label = "Obese range";
    feedback = "Obese range is >= 30.0. Focus on cardiovascular health and deficit dieting.";
    color = "var(--red)";
  }
  
  const resBox = document.getElementById("bmiResult");
  if (resBox) {
      resBox.innerHTML = `
        <strong style="font-size: 2.8rem; line-height: 1;">${bmi.toFixed(1)}</strong>
        <span id="bmi-label" style="display: block; font-weight: 850; margin-top: 4px; color: ${color}; font-size: 0.95rem;">${label}</span>
        <p id="bmi-feedback" style="font-size: 0.74rem; color: var(--muted); margin: 6px 0 0; line-height: 1.4;">${feedback}</p>
      `;
      resBox.style.boxShadow = `inset 0 0 0 1px ${color}, 0 20px 60px rgba(0,0,0,.22)`;
  }
}

// Body Analyzer Tab Toggle
function toggleBodyCheckTab(tabName) {
    const bmiTab = document.getElementById("tab-bmi");
    const calorieTab = document.getElementById("tab-calorie");
    const bmiSec = document.getElementById("body-check-bmi-section");
    const calorieSec = document.getElementById("body-check-calorie-section");

    if (tabName === 'bmi') {
        bmiTab.classList.add("active");
        calorieTab.classList.remove("active");
        bmiSec.style.display = "block";
        calorieSec.style.display = "none";
    } else {
        calorieTab.classList.add("active");
        bmiTab.classList.remove("active");
        calorieSec.style.display = "block";
        bmiSec.style.display = "none";
        
        // Sync height & weight values automatically
        document.getElementById("calHeight").value = document.getElementById("heightInput").value;
        document.getElementById("calWeight").value = document.getElementById("weightInput").value;
    }
}

// Calorie (TDEE) and target calculations
function calculateCalories() {
    const weight = Number(document.getElementById("calWeight").value);
    const height = Number(document.getElementById("calHeight").value);
    const age = Number(document.getElementById("calAge").value);
    const gender = document.getElementById("calGender").value;
    const activity = Number(document.getElementById("calActivity").value);

    if (!weight || !height || !age) {
        showToast("Please enter weight, height, and age.", "warning");
        return;
    }

    // Mifflin-St Jeor BMR Formula
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender === 'male') {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    // Maintenance Calories (TDEE)
    const tdee = Math.round(bmr * activity);
    
    // Target Calculations
    const bulking = Math.round(tdee + 300);
    const cutting = Math.round(tdee - 500);
    const recomposition = Math.round(tdee - 200);

    // Display values
    document.getElementById("cal-maintenance").innerText = tdee.toLocaleString('en-IN');
    document.getElementById("cal-bulking").innerText = bulking.toLocaleString('en-IN');
    document.getElementById("cal-cutting").innerText = cutting.toLocaleString('en-IN');
    document.getElementById("cal-recomp").innerText = recomposition.toLocaleString('en-IN');

    // Show result panel
    document.getElementById("calorieResult").style.display = "block";
}

function openJoinModal() {
  joinModal.classList.add("open");
  joinModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  joinForm.querySelector("input").focus();
}

function closeJoinModal() {
  joinModal.classList.remove("open");
  joinModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function startCounters() {
  if (countersStarted) return;
  countersStarted = true;
  document.querySelectorAll("[data-count]").forEach((counter) => {
    const target = Number(counter.dataset.count);
    const duration = 1500;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = Math.round(target * eased).toLocaleString("en-IN");
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

function updateHeroLiveCalendar() {
    const dateEl = document.getElementById("hero-cal-date");
    const dayMonthEl = document.getElementById("hero-cal-day-month");
    if (!dateEl || !dayMonthEl) return;
    
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    dateEl.innerText = today.getDate();
    dayMonthEl.innerText = `${days[today.getDay()]}, ${months[today.getMonth()]}`;
}

// SK Workout Zone (Unisex Gym) - Supabase Cloud Database Service
// Connects to Supabase PostgreSQL with automatic offline / localStorage fallback

const SUPABASE_SQL_SETUP = `-- ========================================================
-- SK WORKOUT ZONE (UNISEX GYM) - DATABASE SCHEMA
-- Paste this script into Supabase SQL Editor and click RUN
-- ========================================================

-- 1. Members Table
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  dob TEXT,
  anniversary TEXT,
  plan_pack TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Payments Ledger Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  member_id TEXT,
  member_name TEXT,
  member_phone TEXT,
  plan_pack TEXT,
  amount NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  payment_date TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Public Enquiries (Leads) Table
CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  goal TEXT,
  package TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Gym Settings (Live Status & Holiday Notice) Table
CREATE TABLE IF NOT EXISTS gym_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) with open read/write for anon API key
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to members" ON public.members;
DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all access to enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Allow all access to gym_settings" ON public.gym_settings;

CREATE POLICY "Allow all access to members" ON public.members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payments" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to enquiries" ON public.enquiries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to gym_settings" ON public.gym_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Grant table level privileges to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.enquiries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gym_settings TO anon, authenticated;

-- Reload Supabase API cache
NOTIFY pgrst, 'reload schema';
`;

let supabaseClient = null;

function getSupabaseConfig() {
    return {
        url: (localStorage.getItem('sk_supabase_url') || '').trim(),
        key: (localStorage.getItem('sk_supabase_key') || '').trim()
    };
}

function isSupabaseConfigured() {
    const config = getSupabaseConfig();
    return Boolean(config.url && config.key && config.url.startsWith('https://'));
}

function initSupabase() {
    const config = getSupabaseConfig();
    if (isSupabaseConfigured() && window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            supabaseClient = window.supabase.createClient(config.url, config.key);
            console.log("⚡ Supabase Client initialized successfully.");
            updateCloudStatusUI(true);
            return true;
        } catch (err) {
            console.error("Supabase initialization error:", err);
            supabaseClient = null;
            updateCloudStatusUI(false);
            return false;
        }
    }
    supabaseClient = null;
    updateCloudStatusUI(false);
    return false;
}

function updateCloudStatusUI(isConnected) {
    const statusText = document.getElementById("cloudStatusText");
    const statusBtn = document.getElementById("cloudStatusBtn");
    if (!statusText || !statusBtn) return;

    if (isConnected) {
        statusText.innerHTML = '<span style="color: #3ecf8e;"><i class="fa-solid fa-cloud-check"></i> Cloud Sync</span>';
        statusBtn.style.borderColor = 'rgba(62, 207, 142, 0.6)';
        statusBtn.style.boxShadow = '0 0 12px rgba(62, 207, 142, 0.25)';
    } else {
        statusText.innerHTML = '<span style="color: var(--muted);"><i class="fa-solid fa-cloud"></i> Connect Cloud</span>';
        statusBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        statusBtn.style.boxShadow = 'none';
    }
}

// Test Connection
async function testSupabaseConnection(url, key) {
    if (!window.supabase || !window.supabase.createClient) {
        return { success: false, error: "Supabase JS SDK library not loaded." };
    }
    try {
        const testClient = window.supabase.createClient(url, key);
        const { data, error } = await testClient.from('members').select('id').limit(1);
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ==========================================
// SUPABASE DATA OPERATIONS (ASYNC WITH FALLBACK)
// ==========================================

// Fetch Members from Supabase
async function dbFetchMembers() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.warn("Supabase fetch members error:", error);
            return null;
        }
        return data.map(m => ({
            id: m.id,
            name: m.name,
            phone: m.phone,
            email: m.email || '',
            dob: m.dob || '',
            anniversary: m.anniversary || '',
            planPack: m.plan_pack,
            startDate: m.start_date,
            endDate: m.end_date,
            paymentStatus: m.payment_status,
            createdAt: m.created_at
        }));
    } catch (e) {
        console.warn("Failed to fetch members from Supabase:", e);
        return null;
    }
}

// Upsert (Insert or Update) Member
async function dbSaveMember(member) {
    if (!supabaseClient) return false;
    try {
        const row = {
            id: member.id,
            name: member.name,
            phone: member.phone,
            email: member.email || '',
            dob: member.dob || '',
            anniversary: member.anniversary || '',
            plan_pack: member.planPack,
            start_date: member.startDate,
            end_date: member.endDate,
            payment_status: member.paymentStatus,
            created_at: member.createdAt || new Date().toISOString()
        };
        const { error } = await supabaseClient.from('members').upsert(row);
        if (error) throw error;
        return true;
    } catch (e) {
        console.warn("Error saving member to Supabase:", e);
        return false;
    }
}

// Delete Member
async function dbDeleteMember(id) {
    if (!supabaseClient) return false;
    try {
        const { error } = await supabaseClient.from('members').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        console.warn("Error deleting member from Supabase:", e);
        return false;
    }
}

// Fetch Payments from Supabase
async function dbFetchPayments() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.warn("Supabase fetch payments error:", error);
            return null;
        }
        return data.map(p => ({
            id: p.id,
            memberId: p.member_id,
            memberName: p.member_name,
            memberPhone: p.member_phone,
            planPack: p.plan_pack,
            amount: Number(p.amount),
            discount: Number(p.discount || 0),
            paymentDate: p.payment_date,
            type: p.type || 'Registration',
            createdAt: p.created_at
        }));
    } catch (e) {
        console.warn("Failed to fetch payments from Supabase:", e);
        return null;
    }
}

// Insert Payment
async function dbSavePayment(payment) {
    if (!supabaseClient) return false;
    try {
        const row = {
            id: payment.id,
            member_id: payment.memberId,
            member_name: payment.memberName,
            member_phone: payment.memberPhone,
            plan_pack: payment.planPack,
            amount: payment.amount,
            discount: payment.discount || 0,
            payment_date: payment.paymentDate,
            type: payment.type || 'Registration',
            created_at: new Date().toISOString()
        };
        const { error } = await supabaseClient.from('payments').upsert(row);
        if (error) throw error;
        return true;
    } catch (e) {
        console.warn("Error saving payment to Supabase:", e);
        return false;
    }
}

// Fetch Leads / Enquiries
async function dbFetchLeads() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('enquiries')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) return null;
        return data.map(l => ({
            id: l.id,
            name: l.name,
            mobile: l.mobile,
            goal: l.goal,
            package: l.package,
            createdAt: l.created_at
        }));
    } catch (e) {
        return null;
    }
}

// Insert Lead
async function dbSaveLead(lead) {
    if (!supabaseClient) return false;
    try {
        const row = {
            id: lead.id || `LEAD-${Date.now().toString().slice(-4)}`,
            name: lead.name,
            mobile: lead.mobile,
            goal: lead.goal,
            package: lead.package,
            created_at: lead.createdAt || new Date().toISOString()
        };
        const { error } = await supabaseClient.from('enquiries').upsert(row);
        if (error) throw error;
        return true;
    } catch (e) {
        console.warn("Error saving lead to Supabase:", e);
        return false;
    }
}

// Delete Lead
async function dbDeleteLead(phoneOrId) {
    if (!supabaseClient) return false;
    try {
        await supabaseClient.from('enquiries').delete().or(`id.eq.${phoneOrId},mobile.eq.${phoneOrId}`);
        return true;
    } catch (e) {
        return false;
    }
}

// Fetch Gym Setting
async function dbFetchSetting(key) {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('gym_settings')
            .select('value')
            .eq('key', key)
            .maybeSingle();
        if (error || !data) return null;
        return data.value;
    } catch (e) {
        return null;
    }
}

// Save Gym Setting
async function dbSaveSetting(key, value) {
    if (!supabaseClient) return false;
    try {
        const { error } = await supabaseClient.from('gym_settings').upsert({
            key: key,
            value: value,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
        return true;
    } catch (e) {
        return false;
    }
}

// Migrate all local state to Supabase
async function migrateLocalDataToSupabase() {
    if (!supabaseClient) {
        showToast("Supabase not connected. Please enter URL and Key first.", "danger");
        return;
    }

    // If local state is empty, seed demo members first so cloud gets populated
    if (!state.members || state.members.length === 0) {
        if (typeof seedDemoData === 'function') {
            seedDemoData();
        }
    }
    
    showToast("Starting cloud data migration...", "warning");
    let memberCount = 0;
    let paymentCount = 0;

    // Migrate members
    for (const m of state.members) {
        await dbSaveMember(m);
        memberCount++;
    }

    // Migrate payments
    for (const p of state.payments) {
        await dbSavePayment(p);
        paymentCount++;
    }

    // Migrate leads
    const leads = JSON.parse(localStorage.getItem("sk-fitness-leads") || "[]");
    for (const l of leads) {
        await dbSaveLead(l);
    }

    // Migrate gym settings
    await dbSaveSetting('live_status', {
        mode: localStorage.getItem('sk_gym_status_mode') || 'auto',
        title: localStorage.getItem('sk_holiday_title') || 'Sunday Weekly Off',
        desc: localStorage.getItem('sk_holiday_desc') || 'Gym is closed today.'
    });

    if (typeof refreshAdminDashboard === 'function') refreshAdminDashboard();
    if (typeof renderCelebrationsWidget === 'function') renderCelebrationsWidget();
    if (typeof renderLeadsList === 'function') renderLeadsList();

    showToast(`Successfully synced ${memberCount} members and ${paymentCount} payments to Supabase!`, "success");
    closeModal('supabaseConfigModal');
}

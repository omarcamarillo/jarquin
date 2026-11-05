import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, runTransaction } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

let currentUser = null;

// Escapa valores externos antes de interpolarlos en plantillas HTML.
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function formatCurrency(value) {
  const currency = ["MXN", "USD"].includes(settings.currency) ? settings.currency : "MXN";
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency, minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

window.logout = async function () {
  try { await signOut(auth); }
  catch (error) { console.error("No se pudo cerrar la sesión:", error); }
};

window.toggleMobileMenu = function () {
  const menu = document.getElementById("mobile-dropdown-menu");
  if (!menu) return;
  menu.classList.toggle("hidden");
  if (!menu.classList.contains("hidden") && window.gsap) {
    gsap.fromTo(menu, { opacity:0, y:-8 }, { opacity:1, y:0, duration:.22 });
  }
};

        const DEFAULT_SETTINGS = {
            name: 'Mi Empresa / Rancho Agrícola',
            taxId: 'XAXX010101000',
            phone: '+52 000 000 0000',
            email: 'contacto@tuempresa.com',
            address: 'Dirección de tu bodega o rancho...',
            subtitle: 'Gestión Agrícola & Comercial',
            currency: 'MXN'
        };

        let clients = [];
        let invoices = [];
        let settings = DEFAULT_SETTINGS;

        let activeTab = 'home';
        let currentEditingClientId = null;
        let selectedClientProfileId = null;

        let invoiceItems = [{ id: '1', description: '', unitType: 'Caja', saleDate: new Date().toISOString().split('T')[0], quantity: 1, unitPrice: 0, subtotal: 0 }];
        let invoiceExpenses = [{ id: '1', description: 'Flete / Transporte', amount: 0 }];

        async function loadUserDataFromFirestore() {
            if (!currentUser) return;
            try {
                const settingsRef = doc(db, 'users', currentUser.uid, 'config', 'settings');
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    settings = settingsSnap.data();
                } else {
                    settings = DEFAULT_SETTINGS;
                    await setDoc(settingsRef, settings);
                }

                const clientsSnap = await getDocs(collection(db, 'users', currentUser.uid, 'clients'));
                clients = [];
                clientsSnap.forEach(docSnap => {
                    clients.push({ id: docSnap.id, ...docSnap.data() });
                });

                const invoicesSnap = await getDocs(collection(db, 'users', currentUser.uid, 'invoices'));
                invoices = [];
                invoicesSnap.forEach(docSnap => {
                    invoices.push({ id: docSnap.id, ...docSnap.data() });
                });
            } catch (e) {
                console.error("Error cargando datos de Firestore:", e);
            }
        }

        function initApp() {
            loadSettingsIntoForm();
            applySettingsToHeader();
            window.renderInvoiceFormItems();
            window.renderInvoiceFormExpenses();
            updateInvoiceSummary();
            populateClientDropdown();
            renderHomeDashboard();
            lucide.createIcons();
        }

        function applySettingsToHeader() {
            document.getElementById('header-brand-title').textContent = settings.name || 'Mi Empresa';
            document.getElementById('header-brand-subtitle').textContent = settings.subtitle || 'Gestión Agrícola & Comercial';
        }

        function loadSettingsIntoForm() {
            document.getElementById('set-company-name').value = settings.name || '';
            document.getElementById('set-company-tax').value = settings.taxId || '';
            document.getElementById('set-company-phone').value = settings.phone || '';
            document.getElementById('set-company-email').value = settings.email || '';
            document.getElementById('set-company-address').value = settings.address || '';
            document.getElementById('set-company-subtitle').value = settings.subtitle || '';
            document.getElementById('set-company-currency').value = settings.currency || 'MXN';
        }

        window.handleSettingsSave = async function(e) {
            e.preventDefault();
            settings = {
                name: document.getElementById('set-company-name').value,
                taxId: document.getElementById('set-company-tax').value,
                phone: document.getElementById('set-company-phone').value,
                email: document.getElementById('set-company-email').value,
                address: document.getElementById('set-company-address').value,
                subtitle: document.getElementById('set-company-subtitle').value,
                currency: document.getElementById('set-company-currency').value
            };
            try {
                await setDoc(doc(db, 'users', currentUser.uid, 'config', 'settings'), settings);
                applySettingsToHeader();
                const alertBox = document.getElementById('settings-success');
                alertBox.classList.remove('hidden');
                gsap.fromTo(alertBox, { opacity: 0, y: -5 }, { opacity: 1, y: 0, duration: 0.3 });
                setTimeout(() => alertBox.classList.add('hidden'), 3500);
            } catch (e) {
                console.error("Error guardando configuración:", e);
            }
        }

        function getInvoiceTotals(invoice) {
            const gross = Number(invoice.totalGross ?? (invoice.items || []).reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0)) || 0;
            const invested = Number(invoice.totalExpenses ?? (invoice.expenses || []).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)) || 0;
            const profit = Number(invoice.netProfit ?? (gross - invested)) || 0;
            return { gross, invested, profit };
        }

        function renderHomeDashboard() {
            const totals = invoices.reduce((acc, invoice) => {
                const value = getInvoiceTotals(invoice);
                acc.gross += value.gross;
                acc.invested += value.invested;
                acc.profit += value.profit;
                return acc;
            }, { gross: 0, invested: 0, profit: 0 });

            document.getElementById('home-total-clients').textContent = clients.length.toLocaleString('es-MX');
            document.getElementById('home-total-sales').textContent = formatCurrency(totals.gross);
            document.getElementById('home-total-invested').textContent = formatCurrency(totals.invested);
            document.getElementById('home-total-profit').textContent = formatCurrency(totals.profit);

            const recent = [...invoices].sort((a, b) => {
                const dateA = new Date(a.createdAt || a.date || 0).getTime() || 0;
                const dateB = new Date(b.createdAt || b.date || 0).getTime() || 0;
                return dateB - dateA;
            }).slice(0, 5);
            const container = document.getElementById('home-recent-invoices');
            if (!recent.length) {
                container.innerHTML = '<p class="text-xs text-slate-500 py-5 text-center">Todavía no hay notas de venta.</p>';
            } else {
                container.innerHTML = recent.map(invoice => {
                    const client = clients.find(item => item.id === invoice.clientId);
                    const values = getInvoiceTotals(invoice);
                    return `<div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div class="min-w-0"><p class="text-xs font-bold text-slate-900 truncate">${escapeHTML(client?.name || 'Cliente no disponible')}</p><p class="text-[10px] text-slate-500">${escapeHTML(invoice.id)} · ${escapeHTML(invoice.date || 'Sin fecha')}</p></div>
                        <div class="text-right shrink-0"><p class="text-xs font-bold text-slate-900">${formatCurrency(values.gross)}</p><p class="text-[10px] text-emerald-700">Ganancia: ${formatCurrency(values.profit)}</p></div>
                    </div>`;
                }).join('');
            }
            if (window.lucide) lucide.createIcons();
        }

        window.switchTab = function(tab) {
            const allowedTabs = ['home', 'clients', 'history', 'settings', 'news', 'create-invoice'];
            if (!allowedTabs.includes(tab)) tab = 'home';
            activeTab = tab;
            if (tab !== 'create-invoice') selectedClientProfileId = null;

            ['home', 'create-invoice', 'clients', 'history', 'settings', 'news'].forEach(name => {
                const section = document.getElementById(`section-${name}`);
                if (section) section.classList.toggle('hidden', name !== tab);
            });

            ['home', 'clients', 'history', 'news'].forEach(name => {
                const btn = document.getElementById(`nav-${name}`);
                if (btn) btn.className = `flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === name ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`;
                const mobBtn = document.getElementById(`mob-nav-${name}`);
                if (mobBtn) mobBtn.className = `w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${tab === name ? 'bg-orange-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`;
            });

            const settingsBtn = document.getElementById('nav-settings');
            if (settingsBtn) settingsBtn.className = tab === 'settings'
                ? 'p-2 rounded-xl bg-orange-600 text-white border border-orange-500 transition-colors shadow-xs'
                : 'p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 transition-colors';

            if (tab === 'clients') {
                document.getElementById('clients-main-container').classList.remove('hidden');
                document.getElementById('client-detail-view').classList.add('hidden');
                window.renderClientsList();
            }
            if (tab === 'history') renderHistoryList();
            if (tab === 'home') renderHomeDashboard();

            const activeSection = document.getElementById(`section-${tab}`);
            if (activeSection && window.gsap) gsap.fromTo(activeSection, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
            if (window.lucide) lucide.createIcons();
        }

        function populateClientDropdown(selectedId = '') {
            const select = document.getElementById('invoice-client-select');
            select.innerHTML = '<option value="">Selecciona un cliente registrado...</option>';
            clients.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.name} ${c.taxId ? '(' + c.taxId + ')' : ''}`;
                if (c.id === selectedId) opt.selected = true;
                select.appendChild(opt);
            });
        }

        window.renderInvoiceFormItems = function() {
            const container = document.getElementById('invoice-items-container');
            container.innerHTML = '';
            invoiceItems.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-white/70 p-3.5 rounded-xl border border-slate-300/80 item-row shadow-xs';
                div.innerHTML = `
                    <div class="sm:col-span-4">
                        <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Descripción del Producto</label>
                        <input type="text" placeholder="Ej. Aguacate Hass / Limón" value="${escapeHTML(item.description)}" oninput="window.updateItem('${escapeHTML(item.id)}', 'description', this.value)" required class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Vendido por</label>
                        <select onchange="window.updateItem('${escapeHTML(item.id)}', 'unitType', this.value)" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500">
                            <option value="Caja" ${item.unitType === 'Caja' ? 'selected' : ''}>Caja</option>
                            <option value="Kg" ${item.unitType === 'Kg' ? 'selected' : ''}>Kg</option>
                        </select>
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Fecha Venta</label>
                        <input type="date" value="${escapeHTML(item.saleDate)}" onchange="window.updateItem('${escapeHTML(item.id)}', 'saleDate', this.value)" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500">
                    </div>
                    <div class="sm:col-span-1">
                        <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Cant.</label>
                        <input type="number" min="0.1" step="any" value="${escapeHTML(item.quantity)}" oninput="window.updateItem('${escapeHTML(item.id)}', 'quantity', this.value)" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Precio Unit. ($)</label>
                        <input type="number" min="0" step="any" value="${escapeHTML(item.unitPrice)}" oninput="window.updateItem('${escapeHTML(item.id)}', 'unitPrice', this.value)" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500">
                    </div>
                    <div class="sm:col-span-1 flex items-center justify-between sm:justify-end gap-1 pt-1 sm:pt-0">
                        <span class="text-xs font-bold font-mono text-slate-900 sm:hidden">${formatCurrency(item.subtotal || 0)}</span>
                        ${invoiceItems.length > 1 ? `<button type="button" onclick="window.removeInvoiceItem('${escapeHTML(item.id)}')" class="text-slate-400 hover:text-red-600 p-1.5 rounded-md transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
                    </div>
                `;
                container.appendChild(div);
                if (index === invoiceItems.length - 1) {
                    gsap.fromTo(div, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.3 });
                }
            });
            lucide.createIcons();
        }

        window.addInvoiceItem = function() {
            invoiceItems.push({ id: Date.now().toString(), description: '', unitType: 'Caja', saleDate: new Date().toISOString().split('T')[0], quantity: 1, unitPrice: 0, subtotal: 0 });
            window.renderInvoiceFormItems();
        }

        window.removeInvoiceItem = function(id) {
            if (invoiceItems.length === 1) return;
            invoiceItems = invoiceItems.filter(i => i.id !== id);
            window.renderInvoiceFormItems();
            updateInvoiceSummary();
        }

        window.updateItem = function(id, field, value) {
            invoiceItems = invoiceItems.map(item => {
                if (item.id == id) {
                    item[field] = value;
                    const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
                    const price = parseFloat(field === 'unitPrice' ? value : item.unitPrice) || 0;
                    item.subtotal = qty * price;
                }
                return item;
            });
            updateInvoiceSummary();
        }

        window.renderInvoiceFormExpenses = function() {
            const container = document.getElementById('invoice-expenses-container');
            container.innerHTML = '';
            invoiceExpenses.forEach((exp, index) => {
                const div = document.createElement('div');
                div.className = 'grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-red-50/50 p-3.5 rounded-xl border border-red-200/70 shadow-xs';
                div.innerHTML = `
                    <div class="sm:col-span-7">
                        <label class="block text-[10px] uppercase font-bold text-red-800/60 mb-1">Concepto de Gasto</label>
                        <input type="text" placeholder="Ej. Flete, Carga y descarga, Cartón" value="${escapeHTML(exp.description)}" oninput="window.updateExpense('${escapeHTML(exp.id)}', 'description', this.value)" class="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-400">
                    </div>
                    <div class="sm:col-span-4">
                        <label class="block text-[10px] uppercase font-bold text-red-800/60 mb-1">Monto del Gasto ($)</label>
                        <input type="number" min="0" step="any" value="${escapeHTML(exp.amount)}" oninput="window.updateExpense('${escapeHTML(exp.id)}', 'amount', this.value)" class="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-xs font-mono text-red-700 font-semibold focus:outline-none focus:ring-1 focus:ring-red-400">
                    </div>
                    <div class="sm:col-span-1 flex justify-end">
                        <button type="button" onclick="window.removeInvoiceExpense('${escapeHTML(exp.id)}')" class="text-slate-400 hover:text-red-600 p-1.5 rounded-md transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                `;
                container.appendChild(div);
                if (index === invoiceExpenses.length - 1) {
                    gsap.fromTo(div, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.3 });
                }
            });
            lucide.createIcons();
        }

        window.addInvoiceExpense = function() {
            invoiceExpenses.push({ id: Date.now().toString(), description: '', amount: 0 });
            window.renderInvoiceFormExpenses();
        }

        window.removeInvoiceExpense = function(id) {
            invoiceExpenses = invoiceExpenses.filter(e => e.id !== id);
            window.renderInvoiceFormExpenses();
            updateInvoiceSummary();
        }

        window.updateExpense = function(id, field, value) {
            invoiceExpenses = invoiceExpenses.map(exp => {
                if (exp.id == id) exp[field] = value;
                return exp;
            });
            updateInvoiceSummary();
        }

        function updateInvoiceSummary() {
            const gross = invoiceItems.reduce((acc, curr) => acc + (parseFloat(curr.subtotal) || 0), 0);
            const validExpenses = invoiceExpenses.filter(ex => ex.description.trim() !== '' && Number(ex.amount) > 0);
            const expenses = validExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
            const net = gross - expenses;

            document.getElementById('summary-gross').textContent = formatCurrency(gross);
            document.getElementById('summary-expenses').textContent = '-' + formatCurrency(expenses);
            document.getElementById('summary-net').textContent = formatCurrency(net);
        }

        window.resetInvoiceForm = function() {
            document.getElementById('editing-invoice-id').value = '';
            document.getElementById('form-badge-text').textContent = 'Nueva Venta';
            document.getElementById('form-heading-title').textContent = 'Generar Nota de Venta';
            document.getElementById('submit-invoice-btn-text').textContent = 'Guardar y Emitir Nota';
            document.getElementById('cancel-edit-btn').classList.add('hidden');
            document.getElementById('invoice-notes').value = '';

            invoiceItems = [{ id: Date.now().toString(), description: '', unitType: 'Caja', saleDate: new Date().toISOString().split('T')[0], quantity: 1, unitPrice: 0, subtotal: 0 }];
            invoiceExpenses = [{ id: Date.now().toString(), description: 'Flete / Transporte', amount: 0 }];

            populateClientDropdown();
            window.renderInvoiceFormItems();
            window.renderInvoiceFormExpenses();
            updateInvoiceSummary();
        };

        window.editInvoice = function(invoiceId) {
            const inv = invoices.find(i => i.id === invoiceId);
            if (!inv) return;

            window.switchTab('create-invoice');

            document.getElementById('editing-invoice-id').value = inv.id;
            document.getElementById('form-badge-text').textContent = `Editando ${escapeHTML(inv.id)}`;
            document.getElementById('form-heading-title').textContent = `Modificar Nota: ${escapeHTML(inv.id)}`;
            document.getElementById('submit-invoice-btn-text').textContent = 'Actualizar Nota';
            document.getElementById('cancel-edit-btn').classList.remove('hidden');

            populateClientDropdown(inv.clientId);
            document.getElementById('invoice-notes').value = inv.notes || '';

            invoiceItems = inv.items.map((item, index) => ({
                id: (index + 1).toString(),
                description: item.description,
                unitType: item.unitType || 'Caja',
                saleDate: item.saleDate || inv.date,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal
            }));

            invoiceExpenses = inv.expenses && inv.expenses.length > 0 ? inv.expenses.map((exp, index) => ({
                id: (index + 1).toString(),
                description: exp.description,
                amount: exp.amount
            })) : [{ id: '1', description: 'Flete / Transporte', amount: 0 }];

            window.renderInvoiceFormItems();
            window.renderInvoiceFormExpenses();
            updateInvoiceSummary();
        };

        window.deleteInvoice = async function(invoiceId) {
            if (confirm(`¿Estás seguro de que deseas eliminar la nota ${invoiceId}? Esta acción no se puede deshacer.`)) {
                try {
                    await deleteDoc(doc(db, 'users', currentUser.uid, 'invoices', invoiceId));
                    invoices = invoices.filter(i => i.id !== invoiceId);

                    if (activeTab === 'history') {
                        renderHistoryList();
                    } else if (activeTab === 'clients' && selectedClientProfileId) {
                        window.openClientProfile(selectedClientProfileId);
                    }
                } catch (e) {
                    console.error("Error al eliminar la nota:", e);
                    alert("Ocurrió un error al eliminar la nota.");
                }
            }
        };

        window.handleInvoiceSubmit = async function(e) {
            e.preventDefault();
            const clientId = document.getElementById('invoice-client-select').value;
            if (!clientId) {
                alert('Por favor selecciona un cliente.');
                return;
            }

            const editingId = document.getElementById('editing-invoice-id').value;
            const clientObj = clients.find(c => c.id === clientId);
            const gross = invoiceItems.reduce((acc, curr) => acc + (parseFloat(curr.subtotal) || 0), 0);
            const validExpenses = invoiceExpenses.filter(ex => ex.description.trim() !== '' && Number(ex.amount) > 0);
            const expenses = validExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
            const net = gross - expenses;

            let invoiceId = editingId;

            const savedInvoice = {
                id: invoiceId,
                clientId,
                clientName: clientObj ? clientObj.name : 'General',
                date: new Date().toISOString().split('T')[0],
                items: [...invoiceItems.filter(i => i.description.trim() !== '')],
                expenses: [...validExpenses],
                totalGross: gross,
                totalExpenses: expenses,
                netProfit: net,
                notes: document.getElementById('invoice-notes').value
            };

            try {
                if (!editingId) {
                    const counterRef = doc(db, 'users', currentUser.uid, 'counters', 'invoices');
                    const nextNumber = await runTransaction(db, async (transaction) => {
                        const counterSnap = await transaction.get(counterRef);
                        const next = (counterSnap.exists() ? Number(counterSnap.data().value) || 0 : 0) + 1;
                        transaction.set(counterRef, { value: next }, { merge: true });
                        return next;
                    });
                    invoiceId = `NOT-${new Date().getFullYear()}-${String(nextNumber).padStart(6, '0')}`;
                    savedInvoice.id = invoiceId;
                }
                await setDoc(doc(db, 'users', currentUser.uid, 'invoices', invoiceId), savedInvoice);

                if (editingId) {
                    invoices = invoices.map(i => i.id === editingId ? savedInvoice : i);
                } else {
                    invoices.unshift(savedInvoice);
                }

                window.resetInvoiceForm();

                const alertBox = document.getElementById('success-alert');
                const alertText = document.getElementById('success-alert-text');
                alertText.textContent = editingId ? 'Nota actualizada correctamente' : 'Nota guardada correctamente';
                alertBox.classList.remove('hidden');
                gsap.fromTo(alertBox, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3 });
                setTimeout(() => alertBox.classList.add('hidden'), 3500);

                window.openPreviewModal(savedInvoice.id);
            } catch (e) {
                console.error("Error al guardar/actualizar la factura:", e);
                alert("Error al guardar la factura en Firestore.");
            }
        };

        window.renderClientsList = function() {
            const search = document.getElementById('client-search').value.toLowerCase();
            const grid = document.getElementById('clients-grid');
            grid.innerHTML = '';

            const filtered = clients.filter(c => c.name.toLowerCase().includes(search) || (c.taxId && c.taxId.toLowerCase().includes(search)));

            if (filtered.length === 0) {
                grid.innerHTML = '<div class="col-span-1 md:col-span-2 text-center py-12 text-xs text-slate-500 bg-slate-200/50 p-6 rounded-2xl border border-slate-300">No hay clientes registrados. Haz clic en "Nuevo Cliente" para comenzar.</div>';
                return;
            }

            filtered.forEach((client, idx) => {
                const clientInvs = invoices.filter(inv => inv.clientId === client.id);
                const totalGross = clientInvs.reduce((acc, i) => acc + i.totalGross, 0);
                
                const card = document.createElement('div');
                card.className = 'bg-slate-200/60 backdrop-blur-sm p-5 rounded-xl border border-slate-300 shadow-xs hover:border-slate-400 transition-all flex flex-col justify-between space-y-4 glass-reflection';
                card.innerHTML = `
                    <div class="space-y-2">
                        <div class="flex justify-between items-start">
                            <span class="px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-300">RFC: ${escapeHTML(client.taxId || 'S/N')}</span>
                            <div class="flex gap-1">
                                <button onclick="window.openClientModal('${escapeHTML(client.id)}')" class="p-1.5 text-slate-500 hover:text-slate-900 rounded bg-white/60 border border-slate-300"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                                <button onclick="window.deleteClient('${escapeHTML(client.id)}')" class="p-1.5 text-slate-500 hover:text-red-600 rounded bg-white/60 border border-slate-300"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                            </div>
                        </div>
                        <h3 class="font-bold text-slate-900 text-sm">${escapeHTML(client.name)}</h3>
                        <div class="text-xs text-slate-600 space-y-1 pt-1">
                            <p class="flex items-center gap-1.5"><i data-lucide="users" class="w-3 h-3 text-orange-600 shrink-0"></i> <span>${escapeHTML(client.contactPerson || 'Sin contacto')}</span></p>
                            <p class="flex items-center gap-1.5"><i data-lucide="phone" class="w-3 h-3 text-orange-600 shrink-0"></i> <span>${escapeHTML(client.phone || 'Sin teléfono')}</span></p>
                        </div>
                    </div>
                    <div class="pt-3 border-t border-slate-300/60 flex items-center justify-between">
                        <div>
                            <span class="text-[10px] font-semibold text-slate-500 uppercase">Ventas Totales</span>
                            <p class="text-xs font-mono font-bold text-slate-900">${formatCurrency(totalGross)}</p>
                        </div>
                        <button onclick="window.openClientProfile('${escapeHTML(client.id)}')" class="flex items-center gap-1 bg-orange-600 text-white hover:bg-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs">
                            <span>Ver Expediente</span> <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                `;
                grid.appendChild(card);
                gsap.fromTo(card, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, delay: idx * 0.04 });
            });
            lucide.createIcons();
        }

        window.openClientProfile = function(clientId) {
            selectedClientProfileId = clientId;
            const client = clients.find(c => c.id === clientId);
            if (!client) return;

            const clientInvs = invoices.filter(inv => inv.clientId === clientId);
            const stats = clientInvs.reduce((acc, inv) => {
                const values = getInvoiceTotals(inv);
                return { gross: acc.gross + values.gross, expenses: acc.expenses + values.invested, net: acc.net + values.profit };
            }, { gross: 0, expenses: 0, net: 0 });

            document.getElementById('clients-main-container').classList.add('hidden');
            const detailView = document.getElementById('client-detail-view');
            detailView.classList.remove('hidden');

            let invsHtml = clientInvs.length === 0 ? '<p class="text-xs text-slate-500 py-4 text-center">No hay notas registradas para este cliente.</p>' : clientInvs.map(inv => `
                <div class="bg-slate-200/60 backdrop-blur-sm p-4 rounded-xl border border-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <span class="text-xs font-mono font-bold text-slate-900">${escapeHTML(inv.id)}</span>
                        <p class="text-[11px] text-slate-600">${escapeHTML(inv.date)} · ${inv.items.length} producto(s)</p>
                    </div>
                    <div class="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div class="text-right">
                            <span class="text-[10px] uppercase font-bold text-slate-500 block">Ganancia Neta</span>
                            <p class="text-xs font-mono font-bold text-slate-900">${formatCurrency(inv.netProfit)}</p>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="window.openPreviewModal('${escapeHTML(inv.id)}')" title="Ver Nota" class="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="window.editInvoice('${escapeHTML(inv.id)}')" title="Editar Nota" class="p-1.5 text-slate-700 hover:text-slate-900 rounded-lg bg-white border border-slate-300">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="window.deleteInvoice('${escapeHTML(inv.id)}')" title="Eliminar Nota" class="p-1.5 text-slate-500 hover:text-red-600 rounded-lg bg-white border border-slate-300">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            detailView.innerHTML = `
                <div class="space-y-6">
                    <button onclick="window.closeClientProfile()" class="flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors gap-1.5 bg-slate-200/80 px-3.5 py-2 rounded-lg border border-slate-300">
                        <i data-lucide="arrow-left" class="w-3.5 h-3.5 text-orange-600"></i> Volver a lista de clientes
                    </button>

                    <div class="bg-slate-200/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-300 shadow-xs flex flex-col md:flex-row justify-between gap-6 glass-reflection">
                        <div class="space-y-3">
                            <div>
                                <span class="px-2.5 py-0.5 rounded-md bg-white text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-300">Ficha de Cliente</span>
                                <h2 class="text-xl font-bold text-slate-900 mt-1">${escapeHTML(client.name)}</h2>
                                <p class="text-xs font-mono text-slate-600">RFC: ${escapeHTML(client.taxId || 'Sin registrar')}</p>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-700 pt-1">
                                <p class="flex items-center gap-2"><i data-lucide="users" class="w-3.5 h-3.5 text-orange-600 shrink-0"></i> <span>${escapeHTML(client.contactPerson || 'N/A')}</span></p>
                                <p class="flex items-center gap-2"><i data-lucide="phone" class="w-3.5 h-3.5 text-orange-600 shrink-0"></i> <span>${escapeHTML(client.phone || 'N/A')}</span></p>
                                <p class="flex items-center gap-2"><i data-lucide="mail" class="w-3.5 h-3.5 text-orange-600 shrink-0"></i> <span>${escapeHTML(client.email || 'N/A')}</span></p>
                                <p class="flex items-center gap-2"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-orange-600 shrink-0"></i> <span>${escapeHTML(client.address || 'N/A')}</span></p>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row md:flex-col justify-end gap-2 shrink-0">
                            <button onclick="window.openClientModal('${escapeHTML(client.id)}')" class="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 px-4 py-2.5 rounded-lg text-xs font-bold border border-slate-300 shadow-xs">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5 text-slate-600"></i> Editar Datos
                            </button>
                            <button onclick="window.createInvoiceForClient('${escapeHTML(client.id)}')" class="flex items-center justify-center gap-1.5 bg-orange-600 text-white hover:bg-orange-700 px-4 py-2.5 rounded-lg text-xs font-bold shadow-xs">
                                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Crear Nota para Cliente
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="bg-slate-200/60 backdrop-blur-sm p-4 rounded-xl border border-slate-300 shadow-xs">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ventas Brutas</span>
                            <p class="text-xl font-bold font-mono text-slate-900 mt-1">${formatCurrency(stats.gross)}</p>
                        </div>
                        <div class="bg-red-50/80 p-4 rounded-xl border border-red-200">
                            <span class="text-[10px] font-bold text-red-700 uppercase tracking-wider">Total invertido</span>
                            <p class="text-xl font-bold font-mono text-red-700 mt-1">-${formatCurrency(stats.expenses)}</p>
                        </div>
                        <div class="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md">
                            <span class="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Ganancia Neta Total</span>
                            <p class="text-2xl font-bold font-mono text-white mt-1">${formatCurrency(stats.net)}</p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <i data-lucide="receipt" class="w-4 h-4 text-orange-600"></i> Historial de Notas de Venta (${clientInvs.length})
                        </h3>
                        <div class="space-y-2">${invsHtml}</div>
                    </div>
                </div>
            `;
            gsap.fromTo(detailView, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
            lucide.createIcons();
        }

        window.closeClientProfile = function() {
            selectedClientProfileId = null;
            document.getElementById('client-detail-view').classList.add('hidden');
            document.getElementById('clients-main-container').classList.remove('hidden');
            window.renderClientsList();
        }

        window.createInvoiceForClient = function(clientId) {
            const client = clients.find(item => item.id === clientId);
            if (!client) return;
            window.switchTab('create-invoice');
            populateClientDropdown(clientId);
            const heading = document.getElementById('form-heading-title');
            if (heading) heading.textContent = `Nueva nota para ${client.name}`;
            document.getElementById('invoice-client-select').value = clientId;
        }

        window.openClientModal = function(id = null) {
            currentEditingClientId = id;
            const modal = document.getElementById('client-modal');
            const box = document.getElementById('client-modal-box');
            const title = document.getElementById('client-modal-title');
            
            if (id) {
                title.textContent = 'Editar Datos del Cliente';
                const c = clients.find(item => item.id === id);
                document.getElementById('modal-client-name').value = c.name || '';
                document.getElementById('modal-client-contact').value = c.contactPerson || '';
                document.getElementById('modal-client-phone').value = c.phone || '';
                document.getElementById('modal-client-email').value = c.email || '';
                document.getElementById('modal-client-tax').value = c.taxId || '';
                document.getElementById('modal-client-address').value = c.address || '';
            } else {
                title.textContent = 'Registrar Nuevo Cliente';
                document.getElementById('client-form').reset();
            }
            modal.classList.remove('hidden');
            gsap.fromTo(box, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.4)" });
        }

        window.closeClientModal = function() {
            const box = document.getElementById('client-modal-box');
            gsap.to(box, { scale: 0.95, opacity: 0, duration: 0.2, onComplete: () => {
                document.getElementById('client-modal').classList.add('hidden');
                currentEditingClientId = null;
            }});
        }

        window.handleClientFormSubmit = async function(e) {
            e.preventDefault();
            const data = {
                name: document.getElementById('modal-client-name').value,
                contactPerson: document.getElementById('modal-client-contact').value,
                phone: document.getElementById('modal-client-phone').value,
                email: document.getElementById('modal-client-email').value,
                taxId: document.getElementById('modal-client-tax').value,
                address: document.getElementById('modal-client-address').value,
            };

            try {
                if (currentEditingClientId) {
                    clients = clients.map(c => c.id === currentEditingClientId ? { ...c, ...data } : c);
                    await setDoc(doc(db, 'users', currentUser.uid, 'clients', currentEditingClientId), data, { merge: true });
                } else {
                    const newId = 'cli-' + Date.now();
                    const newClient = { ...data, id: newId, createdAt: new Date().toISOString().split('T')[0] };
                    clients.unshift(newClient);
                    await setDoc(doc(db, 'users', currentUser.uid, 'clients', newId), newClient);
                }

                window.closeClientModal();
                populateClientDropdown();

                if (activeTab === 'clients') {
                    if (selectedClientProfileId) {
                        window.openClientProfile(selectedClientProfileId);
                    } else {
                        window.renderClientsList();
                    }
                }
            } catch (e) {
                console.error("Error guardando cliente:", e);
                alert("Error al guardar cliente en Firestore.");
            }
        }

        window.deleteClient = async function(id) {
            const clientInvs = invoices.filter(inv => inv.clientId === id);
            const msg = clientInvs.length > 0 ? `Este cliente tiene ${clientInvs.length} nota(s) registradas. ¿Deseas eliminarlo?` : '¿Confirmas eliminar este cliente?';
            if (confirm(msg)) {
                try {
                    clients = clients.filter(c => c.id !== id);
                    await deleteDoc(doc(db, 'users', currentUser.uid, 'clients', id));
                    populateClientDropdown();
                    window.renderClientsList();
                } catch (e) {
                    console.error("Error eliminando cliente:", e);
                }
            }
        }

        function renderHistoryList() {
            const container = document.getElementById('history-list');
            container.innerHTML = '';
            if (invoices.length === 0) {
                container.innerHTML = '<div class="text-center py-12 text-xs text-slate-500 bg-slate-200/50 p-6 rounded-2xl border border-slate-300">No hay notas de venta registradas aún.</div>';
                return;
            }

            invoices.forEach((inv, idx) => {
                const div = document.createElement('div');
                div.className = 'bg-slate-200/60 backdrop-blur-sm p-5 rounded-2xl border border-slate-300 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-reflection';
                div.innerHTML = `
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-mono font-bold text-slate-900">${escapeHTML(inv.id)}</span>
                            <span class="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800 text-[10px] font-bold">${escapeHTML(inv.date)}</span>
                        </div>
                        <h4 class="text-sm font-bold text-slate-900">${escapeHTML(inv.clientName)}</h4>
                        <p class="text-xs text-slate-600">${inv.items.length} producto(s) · ${inv.expenses.length} gasto(s) operativo(s)</p>
                    </div>
                    <div class="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <div class="text-right">
                            <span class="text-[10px] uppercase font-bold text-slate-500 block">Ganancia Neta</span>
                            <span class="text-base font-mono font-bold text-slate-900">${formatCurrency(inv.netProfit)}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button onclick="window.openPreviewModal('${escapeHTML(inv.id)}')" title="Ver Nota" class="flex items-center gap-1 bg-orange-600 text-white hover:bg-orange-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="window.editInvoice('${escapeHTML(inv.id)}')" title="Editar Nota" class="p-2 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="window.deleteInvoice('${escapeHTML(inv.id)}')" title="Eliminar Nota" class="p-2 text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl border border-slate-300 transition-colors">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(div);
                gsap.fromTo(div, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, delay: idx * 0.04 });
            });
            lucide.createIcons();
        }

        window.openPreviewModal = function(invoiceId) {
            const inv = invoices.find(i => i.id === invoiceId);
            if (!inv) return;
            const client = clients.find(c => c.id === inv.clientId) || { name: inv.clientName, taxId: 'S/N', address: 'S/N', phone: 'S/N', email: 'S/N' };

            const itemsHtml = inv.items.map(item => `
                <tr class="border-b border-slate-200">
                    <td class="py-2 pr-2">${escapeHTML(item.description)}</td>
                    <td class="py-2 px-2 text-center">${escapeHTML(item.quantity)} ${escapeHTML(item.unitType)}(s)</td>
                    <td class="py-2 px-2 text-right font-mono">${formatCurrency(parseFloat(item.unitPrice))}</td>
                    <td class="py-2 pl-2 text-right font-mono font-bold">${formatCurrency(parseFloat(item.subtotal))}</td>
                </tr>
            `).join('');

            const expensesHtml = inv.expenses && inv.expenses.length > 0 ? inv.expenses.map(exp => `
                <div class="flex justify-between text-slate-700 text-[11px] py-1 border-b border-red-100">
                    <span>${escapeHTML(exp.description)}</span>
                    <span class="font-mono font-semibold text-red-700">-${formatCurrency(parseFloat(exp.amount))}</span>
                </div>
            `).join('') : '<p class="text-[11px] text-slate-500">Sin gastos operativos registrados.</p>';

            const content = document.getElementById('preview-content');
            content.innerHTML = `
                <div class="space-y-6 bg-slate-200/40 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-slate-300 glass-reflection">
                    <div class="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-300 pb-4">
                        <div>
                            <h2 class="text-base font-bold text-slate-900">${escapeHTML(settings.name)}</h2>
                            <p class="text-[11px] text-slate-600">RFC: ${escapeHTML(settings.taxId || 'S/N')} · ${escapeHTML(settings.phone || '')}</p>
                            <p class="text-[11px] text-slate-600">${escapeHTML(settings.address || '')}</p>
                        </div>
                        <div class="text-left sm:text-right text-xs">
                            <span class="inline-block px-2.5 py-0.5 rounded bg-orange-600 text-white font-bold mb-1 shadow-xs">NOTA DE VENTA</span>
                            <p class="font-mono font-semibold text-slate-800">${escapeHTML(inv.id)}</p>
                            <p class="text-slate-600 font-mono text-[11px]">${escapeHTML(inv.date)}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white/80 p-4 rounded-xl border border-slate-300">
                        <div>
                            <span class="font-bold text-slate-500 uppercase text-[10px] block mb-1">Cliente / Comprador</span>
                            <p class="font-bold text-slate-900">${escapeHTML(client.name)}</p>
                            <p class="text-slate-600">RFC: ${escapeHTML(client.taxId || 'S/N')}</p>
                        </div>
                        <div>
                            <span class="font-bold text-slate-500 uppercase text-[10px] block mb-1">Contacto / Dirección</span>
                            <p class="text-slate-600">${escapeHTML(client.address || 'Sin dirección')}</p>
                            <p class="text-slate-600">${escapeHTML(client.phone || '')} · ${escapeHTML(client.email || '')}</p>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Detalle de Productos</h4>
                        <table class="w-full text-left min-w-[450px]">
                            <thead>
                                <tr class="border-b border-slate-300 text-[10px] font-bold text-slate-500 uppercase">
                                    <th class="pb-2 pr-2">Descripción</th>
                                    <th class="pb-2 px-2 text-center">Cantidad</th>
                                    <th class="pb-2 px-2 text-right">Precio Unit.</th>
                                    <th class="pb-2 pl-2 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>${itemsHtml}</tbody>
                        </table>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                            <h4 class="text-xs font-bold uppercase tracking-wider text-red-700 mb-2">Gastos Operativos</h4>
                            <div class="bg-red-50/70 p-3 rounded-xl border border-red-200 space-y-1">${expensesHtml}</div>
                        </div>
                        <div class="bg-slate-900 text-white p-4 rounded-xl space-y-2 shadow-md">
                            <div class="flex justify-between text-xs text-slate-300"><span>Venta Bruta:</span><span class="font-mono">${formatCurrency(inv.totalGross)}</span></div>
                            <div class="flex justify-between text-xs text-red-300"><span>Total Gastos:</span><span class="font-mono">-${formatCurrency(inv.totalExpenses)}</span></div>
                            <div class="flex justify-between text-sm font-bold pt-2 border-t border-slate-800 text-orange-400"><span>Ganancia Neta:</span><span class="font-mono">${formatCurrency(inv.netProfit)}</span></div>
                        </div>
                    </div>

                    ${inv.notes ? `<div class="bg-white/80 p-3 rounded-xl text-xs border border-slate-300"><span class="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">Observaciones</span><p class="text-slate-700">${escapeHTML(inv.notes)}</p></div>` : ''}
                </div>
            `;
            const modal = document.getElementById('invoice-preview-modal');
            const box = document.getElementById('preview-modal-box');
            modal.classList.remove('hidden');
            gsap.fromTo(box, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.4)" });
            lucide.createIcons();
        }

        window.closePreviewModal = function() {
            const box = document.getElementById('preview-modal-box');
            gsap.to(box, { scale: 0.95, opacity: 0, duration: 0.2, onComplete: () => {
                document.getElementById('invoice-preview-modal').classList.add('hidden');
            }});
        }

// Protección de ruta: el dashboard solo se inicializa con sesión válida.
let dashboardInitialized = false;
onAuthStateChanged(auth, async (user) => {
  const loader = document.getElementById("route-loader");
  if (!user) {
    window.location.replace("./index.html");
    return;
  }
  currentUser = user;
  const name = user.displayName || (user.email ? user.email.split("@")[0] : "Usuario");
  const nameNode = document.getElementById("user-display-name");
  if (nameNode) nameNode.textContent = name;
  const avatar = document.getElementById("user-avatar");
  if (avatar && user.photoURL) { avatar.src = user.photoURL; avatar.classList.remove("hidden"); }
  else if (avatar) avatar.classList.add("hidden");
  if (!dashboardInitialized) {
    dashboardInitialized = true;
    await loadUserDataFromFirestore();
    document.getElementById("app-main-layout")?.classList.remove("hidden");
    if (loader) loader.hidden = true;
    if (window.gsap) gsap.fromTo("#app-main-layout", { opacity:0, y:6 }, { opacity:1, y:0, duration:.4, ease:"power2.out" });
    initApp();
  }
});

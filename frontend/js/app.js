const API_URL = 'https://utang-logs.onrender.com/api';
let currentBorrowerId = null;

// ==================== NAVIGATION ====================

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Show selected section
    const section = document.getElementById('section' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
    if (section) section.classList.add('active');
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById('nav' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
    if (navBtn) navBtn.classList.add('active');
    
    // Hide debt detail if showing
    document.getElementById('debtDetailView').style.display = 'none';
}

// ==================== FETCH FUNCTIONS ====================

async function fetchBorrowers() {
    try {
        const response = await fetch(`${API_URL}/borrowers`);
        if (!response.ok) throw new Error('Failed to fetch borrowers');
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Error fetching borrowers:', error);
        return [];
    }
}

async function fetchBorrowerDetails(borrowerId) {
    try {
        const response = await fetch(`${API_URL}/borrowers/${borrowerId}`);
        if (!response.ok) throw new Error('Failed to fetch borrower details');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching borrower details:', error);
        return null;
    }
}

async function fetchDebtDetails(debtId) {
    try {
        const response = await fetch(`${API_URL}/debts/${debtId}`);
        if (!response.ok) throw new Error('Failed to fetch debt details');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching debt details:', error);
        return null;
    }
}

// ==================== BORROWER FUNCTIONS ====================

async function addBorrower(name, contactInfo) {
    try {
        const response = await fetch(`${API_URL}/borrowers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, contactInfo })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add borrower');
        }
        
        const data = await response.json();
        return data.data;
    } catch (error) {
        throw error;
    }
}

// ==================== DEBT FUNCTIONS ====================

async function addDebt(borrowerId, amount, reason, dateBorrowed) {
    try {
        const response = await fetch(`${API_URL}/debts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ borrowerId, amount, reason, dateBorrowed })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add debt');
        }
        
        const data = await response.json();
        return data.data;
    } catch (error) {
        throw error;
    }
}

// ==================== PAYMENT FUNCTIONS ====================

async function addPayment(debtId, amountPaid, notes) {
    try {
        const response = await fetch(`${API_URL}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ debtId, amountPaid, notes })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to record payment');
        }
        
        const data = await response.json();
        return data.data;
    } catch (error) {
        throw error;
    }
}

// ==================== UI RENDER FUNCTIONS ====================

function renderBorrowers(borrowers) {
    const container = document.getElementById('borrowerList');
    
    if (!borrowers || borrowers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>No borrowers yet. Add your first borrower above!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = borrowers.map(borrower => `
        <div class="borrower-card" onclick="showBorrowerDebts('${borrower._id}')">
            <h3>${borrower.name}</h3>
            ${borrower.contactInfo ? `<p>📱 ${borrower.contactInfo}</p>` : ''}
            <div class="details">
                <div class="detail-item">
                    <label>Total Borrowed</label>
                    <div class="value">₱${borrower.totalBorrowed?.toFixed(2) || '0.00'}</div>
                </div>
                <div class="detail-item">
                    <label>Total Paid</label>
                    <div class="value negative">₱${borrower.totalPaid?.toFixed(2) || '0.00'}</div>
                </div>
                <div class="detail-item">
                    <label>Remaining Balance</label>
                    <div class="value ${borrower.totalRemaining > 0 ? 'positive' : ''}">
                        ₱${borrower.totalRemaining?.toFixed(2) || '0.00'}
                    </div>
                </div>
                <div class="detail-item">
                    <label>Active Debts</label>
                    <div class="value">${borrower.activeDebtCount || 0}</div>
                </div>
            </div>
            <div class="click-hint">👆 Click to view debts</div>
        </div>
    `).join('');
}

async function showBorrowerDebts(borrowerId) {
    currentBorrowerId = borrowerId;
    const data = await fetchBorrowerDetails(borrowerId);
    
    if (!data) {
        alert('Error loading borrower details');
        return;
    }
    
    const { borrower, debts, summary } = data;
    
    // Show debt detail view
    const detailView = document.getElementById('debtDetailView');
    const content = document.getElementById('debtDetailContent');
    
    let debtsHtml = '';
    if (debts && debts.length > 0) {
        debtsHtml = debts.map(debt => `
            <div class="debt-item" onclick="showDebtPayments('${debt._id}')">
                <div class="debt-info">
                    <span class="reason">${debt.reason}</span>
                    <span class="date">📅 ${formatDate(debt.dateBorrowed)}</span>
                </div>
                <div class="debt-amount ${debt.status.toLowerCase()}">
                    ₱${debt.amount.toFixed(2)}
                    <span style="font-size:0.8rem;color:#718096;font-weight:400;">
                        (Paid: ₱${debt.totalPaid.toFixed(2)})
                    </span>
                </div>
                <span class="debt-status status-${debt.status.toLowerCase()}">${debt.status}</span>
            </div>
        `).join('');
    } else {
        debtsHtml = `<p style="text-align:center;color:#a0aec0;padding:20px;">No debts recorded for this borrower.</p>`;
    }
    
    content.innerHTML = `
        <div class="debt-detail-header">
            <div>
                <h2>${borrower.name}'s Debts</h2>
                ${borrower.contactInfo ? `<p>📱 ${borrower.contactInfo}</p>` : ''}
            </div>
            <div>
                <div style="text-align:right;">
                    <div>Total: <strong>₱${summary.totalBorrowed.toFixed(2)}</strong></div>
                    <div>Paid: <strong>₱${summary.totalPaid.toFixed(2)}</strong></div>
                    <div>Remaining: <strong style="color:${summary.remainingBalance > 0 ? '#e53e3e' : '#38a169'}">
                        ₱${summary.remainingBalance.toFixed(2)}
                    </strong></div>
                </div>
            </div>
        </div>
        <div class="debt-list">
            ${debtsHtml}
        </div>
        <div class="click-hint" style="margin-top:15px;text-align:center;color:#a0aec0;">
            👆 Click a debt to view payments
        </div>
    `;
    
    detailView.style.display = 'block';
    detailView.scrollIntoView({ behavior: 'smooth' });
}

async function showDebtPayments(debtId) {
    const debtData = await fetchDebtDetails(debtId);
    
    if (!debtData) {
        alert('Error loading debt details');
        return;
    }
    
    const content = document.getElementById('debtDetailContent');
    
    // Find the current debt item and scroll to it, then show payments
    let paymentsHtml = '';
    if (debtData.payments && debtData.payments.length > 0) {
        paymentsHtml = debtData.payments.map(p => `
            <div class="payment-item">
                <div class="payment-info">
                    <span class="amount">₱${p.amountPaid.toFixed(2)}</span>
                    <span class="date">📅 ${formatDate(p.datePaid)}</span>
                    ${p.notes ? `<span class="notes">📝 ${p.notes}</span>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        paymentsHtml = `<div class="no-payments">No payments recorded for this debt yet.</div>`;
    }
    
    // Add payment details to the existing view
    const debtHtml = `
        <div style="background:#f7fafc;padding:15px;border-radius:8px;margin:10px 0 20px 0;border-left:4px solid #667eea;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
                <div>
                    <strong>${debtData.reason}</strong>
                    <span style="margin-left:10px;font-size:0.9rem;color:#718096;">
                        📅 ${formatDate(debtData.dateBorrowed)}
                    </span>
                </div>
                <div>
                    <span style="font-weight:700;font-size:1.1rem;color:#2d3748;">
                        ₱${debtData.amount.toFixed(2)}
                    </span>
                    <span style="margin-left:10px;padding:2px 12px;border-radius:12px;font-size:0.8rem;background:${debtData.status === 'Paid' ? '#c6f6d5' : debtData.status === 'Partial' ? '#feebc8' : '#fed7d7'};">
                        ${debtData.status}
                    </span>
                </div>
            </div>
            <div style="margin-top:5px;font-size:0.9rem;color:#718096;">
                Paid: ₱${debtData.totalPaid.toFixed(2)} | Remaining: ₱${debtData.remainingBalance.toFixed(2)}
            </div>
        </div>
        
        <h3 style="margin:20px 0 10px 0;">💰 Payment History</h3>
        ${paymentsHtml}
    `;
    
    // Find the debt item and replace with expanded view
    // We'll just append/update the content
    // For simplicity, we'll add it to the top of the debt list
    
    const debtList = content.querySelector('.debt-list');
    if (debtList) {
        // Keep the debt list but add the detail above it
        const detailDiv = document.createElement('div');
        detailDiv.className = 'debt-payment-detail';
        detailDiv.innerHTML = debtHtml;
        
        // Insert before the debt list
        debtList.parentNode.insertBefore(detailDiv, debtList);
        
        // Scroll to it
        detailDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

function closeDebtDetail() {
    document.getElementById('debtDetailView').style.display = 'none';
    // Refresh dashboard
    refreshDashboard();
}

// ==================== POPULATE SELECTS ====================

async function populateSelects() {
    const borrowers = await fetchBorrowers();
    
    const selects = ['debtBorrower', 'paymentBorrower'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Borrower</option>';
        borrowers.forEach(borrower => {
            const option = document.createElement('option');
            option.value = borrower._id;
            option.textContent = borrower.name;
            select.appendChild(option);
        });
        if (currentValue) select.value = currentValue;
    });
    
    // Payment debt dropdown
    document.getElementById('paymentBorrower').addEventListener('change', async function() {
        const debtSelect = document.getElementById('paymentDebt');
        const borrowerId = this.value;
        
        debtSelect.innerHTML = '<option value="">Select Debt</option>';
        if (borrowerId) {
            try {
                const response = await fetch(`${API_URL}/debts/borrower/${borrowerId}`);
                const data = await response.json();
                const debts = data.data || [];
                const unpaidDebts = debts.filter(d => d.status !== 'Paid');
                unpaidDebts.forEach(debt => {
                    const option = document.createElement('option');
                    option.value = debt._id;
                    const remaining = debt.remainingBalance || debt.amount;
                    option.textContent = `${debt.reason} - ₱${remaining.toFixed(2)} remaining`;
                    debtSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading debts:', error);
            }
        }
    });
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

async function refreshDashboard() {
    const borrowers = await fetchBorrowers();
    renderBorrowers(borrowers);
    await populateSelects();
}

// ==================== EVENT LISTENERS ====================

// Borrower Form 1 (Dashboard)
document.getElementById('borrowerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('borrowerName').value.trim();
    const contactInfo = document.getElementById('borrowerContact').value.trim();
    
    try {
        await addBorrower(name, contactInfo);
        document.getElementById('borrowerForm').reset();
        await refreshDashboard();
        alert('✅ Borrower added successfully!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// Borrower Form 2
document.getElementById('borrowerForm2').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('borrowerName2').value.trim();
    const contactInfo = document.getElementById('borrowerContact2').value.trim();
    
    try {
        await addBorrower(name, contactInfo);
        document.getElementById('borrowerForm2').reset();
        await refreshDashboard();
        alert('✅ Borrower added successfully!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// Debt Form
document.getElementById('debtForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const borrowerId = document.getElementById('debtBorrower').value;
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const reason = document.getElementById('debtReason').value.trim();
    const dateBorrowed = document.getElementById('debtDate').value;
    
    if (!borrowerId || !amount || !reason) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        await addDebt(borrowerId, amount, reason, dateBorrowed);
        document.getElementById('debtForm').reset();
        await refreshDashboard();
        alert('✅ Debt logged successfully!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// Payment Form
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const debtId = document.getElementById('paymentDebt').value;
    const amountPaid = parseFloat(document.getElementById('paymentAmount').value);
    const notes = document.getElementById('paymentNotes').value.trim();
    
    if (!debtId || !amountPaid) {
        alert('Please select a debt and enter the payment amount');
        return;
    }
    
    try {
        await addPayment(debtId, amountPaid, notes);
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentDebt').innerHTML = '<option value="">Select Debt</option>';
        await refreshDashboard();
        alert('✅ Payment recorded successfully!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// ==================== INIT ====================

async function initApp() {
    await refreshDashboard();
}

// Load app
initApp();

// Auto-refresh every 30 seconds
setInterval(refreshDashboard, 30000);
// ========================================
// UTANG LOGS - Complete Application
// ========================================

const API_URL = 'https://utang-logs.onrender.com/api';
let currentBorrowerId = null;

// ========================================
// TOAST NOTIFICATIONS
// ========================================

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ========================================
// DELETE BORROWER
// ========================================

async function deleteBorrower(borrowerId, borrowerName, hasRemainingBalance) {
    if (hasRemainingBalance > 0) {
        const confirmDelete = confirm(
            `⚠️ ${borrowerName} still has remaining balance of ₱${hasRemainingBalance.toFixed(2)}!\n\n` +
            `Are you sure you want to delete this borrower and ALL their debts?\n` +
            `This action cannot be undone!`
        );
        if (!confirmDelete) return;
    } else {
        const confirmDelete = confirm(
            `✅ ${borrowerName} is fully paid!\n\n` +
            `Do you want to delete this borrower and their records?\n` +
            `This action cannot be undone!`
        );
        if (!confirmDelete) return;
    }
    
    try {
        const response = await fetch(`${API_URL}/borrowers/${borrowerId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete borrower');
        }
        
        await refreshDashboard();
        showToast('✅ Borrower deleted successfully!', 'success');
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ========================================
// DELETE DEBT WITH HISTORY
// ========================================

async function deleteDebt(debtId, debtReason, debtAmount) {
    const confirmDelete = confirm(
        `⚠️ Delete this debt?\n\n` +
        `Reason: ${debtReason}\n` +
        `Amount: ₱${debtAmount.toFixed(2)}\n\n` +
        `This will also delete all payments associated with this debt.\n` +
        `The debt will be saved in Delete History for restoration.\n` +
        `This action can be undone!`
    );
    
    if (!confirmDelete) return;
    
    try {
        const response = await fetch(`${API_URL}/debts/${debtId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete debt');
        }
        
        await refreshDashboard();
        showToast('✅ Debt deleted! You can restore it from History.', 'success');
        
        document.getElementById('debtDetailView').style.display = 'none';
        
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ========================================
// EDIT DEBT WITH MODAL
// ========================================

function openEditModal(debtId, currentAmount, currentReason, currentDate, currentStatus) {
    document.getElementById('editDebtId').value = debtId;
    document.getElementById('editAmount').value = currentAmount;
    document.getElementById('editReason').value = currentReason;
    
    if (currentDate) {
        const date = new Date(currentDate);
        const formattedDate = date.toISOString().split('T')[0];
        document.getElementById('editDate').value = formattedDate;
    }
    
    document.getElementById('editStatus').value = currentStatus || 'Unpaid';
    document.getElementById('editDebtModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editDebtModal').style.display = 'none';
    document.getElementById('editDebtForm').reset();
}

async function submitEditDebt(e) {
    e.preventDefault();
    
    const debtId = document.getElementById('editDebtId').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const reason = document.getElementById('editReason').value.trim();
    const dateBorrowed = document.getElementById('editDate').value;
    const status = document.getElementById('editStatus').value;
    
    if (isNaN(amount) || amount <= 0) {
        showToast('❌ Please enter a valid amount', 'error');
        return;
    }
    
    if (!reason) {
        showToast('❌ Please enter a reason', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/debts/${debtId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount,
                reason: reason,
                dateBorrowed: dateBorrowed || undefined,
                status: status
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to edit debt');
        }
        
        closeEditModal();
        await refreshDashboard();
        showToast('✅ Debt updated successfully!', 'success');
        document.getElementById('debtDetailView').style.display = 'none';
        
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// Add event listener for edit form
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('editDebtForm');
    if (editForm) {
        editForm.addEventListener('submit', submitEditDebt);
    }
});

// ========================================
// VIEW DELETE HISTORY
// ========================================

async function viewDeleteHistory(borrowerId, borrowerName) {
    try {
        const url = borrowerId ? `${API_URL}/debts/history/${borrowerId}` : `${API_URL}/debts/history`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch delete history');
        }
        
        const data = await response.json();
        const history = data.data || [];
        
        if (history.length === 0) {
            showToast('📭 No deleted debts found', 'info');
            return;
        }
        
        let historyHtml = `
            <div class="history-modal">
                <div class="history-modal-content">
                    <div class="history-modal-header">
                        <div>
                            <h2>🗑️ Deleted Debts History</h2>
                            ${borrowerName ? `<p>For: ${borrowerName}</p>` : ''}
                            <p style="font-size:0.8rem;color:var(--gray-400);">${history.length} deleted debts found</p>
                        </div>
                        <button onclick="closeHistoryModal()" class="btn-close-modal">✕</button>
                    </div>
                    <div class="history-modal-body">
        `;
        
        history.forEach(item => {
            historyHtml += `
                <div class="history-item">
                    <div class="history-info">
                        <strong>${item.reason}</strong>
                        <span class="history-amount">₱${item.amount.toFixed(2)}</span>
                        <span class="history-date">📅 ${formatDate(item.dateBorrowed)}</span>
                        <span class="history-status status-${item.status.toLowerCase()}">${item.status}</span>
                        <span class="history-deleted">🗑️ Deleted: ${formatDate(item.deletedAt)}</span>
                        ${item.borrowerName ? `<span class="history-borrower">👤 ${item.borrowerName}</span>` : ''}
                        ${item.restored ? `<span class="history-restored">✅ Restored</span>` : ''}
                    </div>
                    ${!item.restored ? `<button onclick="restoreDebt('${item._id}')" class="btn-restore">↩️ Restore</button>` : ''}
                </div>
            `;
        });
        
        historyHtml += `
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.querySelector('.history-modal');
        if (existingModal) existingModal.remove();
        
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = historyHtml;
        document.body.appendChild(modalDiv.firstElementChild);
        
    } catch (error) {
        showToast('❌ Error loading history: ' + error.message, 'error');
    }
}

function closeHistoryModal() {
    const modal = document.querySelector('.history-modal');
    if (modal) modal.remove();
}

// ========================================
// RESTORE DEBT
// ========================================

async function restoreDebt(historyId) {
    const confirmRestore = confirm(
        '↩️ Restore this debt?\n\n' +
        'This will recreate the debt with the same details.\n' +
        'All payments will need to be re-recorded.\n\n' +
        'Do you want to continue?'
    );
    
    if (!confirmRestore) return;
    
    try {
        const response = await fetch(`${API_URL}/debts/restore/${historyId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to restore debt');
        }
        
        showToast('✅ Debt restored successfully!', 'success');
        closeHistoryModal();
        await refreshDashboard();
        
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ========================================
// NAVIGATION
// ========================================

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById('section' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
    if (section) section.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById('nav' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
    if (navBtn) navBtn.classList.add('active');
    
    document.getElementById('debtDetailView').style.display = 'none';
}

// ========================================
// FETCH FUNCTIONS
// ========================================

async function fetchBorrowers() {
    try {
        console.log('🔄 Fetching borrowers from:', `${API_URL}/borrowers`);
        const response = await fetch(`${API_URL}/borrowers`);
        if (!response.ok) throw new Error('Failed to fetch borrowers');
        const data = await response.json();
        console.log('✅ Borrowers fetched:', data.data?.length || 0);
        return data.data || [];
    } catch (error) {
        console.error('❌ Error fetching borrowers:', error);
        showToast('Error connecting to server. Make sure backend is running.', 'error');
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
        console.log('🔍 Fetching debt details for ID:', debtId);
        const response = await fetch(`${API_URL}/debts/${debtId}`);
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Failed to fetch debt details: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Debt details data:', data);
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch debt details');
        }
        
        return data.data;
    } catch (error) {
        console.error('❌ Error fetching debt details:', error);
        showToast('Error loading debt details: ' + error.message, 'error');
        return null;
    }
}

// ========================================
// CRUD OPERATIONS
// ========================================

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

// ========================================
// UI RENDER FUNCTIONS
// ========================================

function renderBorrowers(borrowers) {
    const container = document.getElementById('borrowerList');
    
    // Update the borrower count
    const countElement = document.getElementById('borrowerCount');
    if (countElement) {
        countElement.textContent = `${borrowers.length} borrower${borrowers.length !== 1 ? 's' : ''}`;
    }
    
    if (!borrowers || borrowers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <h3>No borrowers yet</h3>
                <p>Add your first borrower using the form above!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = borrowers.map(borrower => {
        const isFullyPaid = borrower.totalRemaining <= 0 && borrower.totalBorrowed > 0;
        const hasDebts = borrower.debtCount > 0;
        
        return `
        <div class="borrower-card">
            <div class="card-top">
                <div>
                    <span class="name">${borrower.name}</span>
                    ${borrower.contactInfo ? `<span class="contact">📱 ${borrower.contactInfo}</span>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="debt-count">${borrower.activeDebtCount || 0} active debts</span>
                    ${isFullyPaid ? '<span class="badge-paid">✅ Fully Paid</span>' : ''}
                    <button onclick="event.stopPropagation(); viewDeleteHistory('${borrower._id}', '${borrower.name}')" 
                            class="btn-history"
                            title="View deleted debts history">
                        📜
                    </button>
                    <button onclick="event.stopPropagation(); deleteBorrower('${borrower._id}', '${borrower.name}', ${borrower.totalRemaining || 0})" 
                            class="btn-delete"
                            title="Delete borrower${!isFullyPaid && hasDebts ? ' (has remaining balance)' : ''}">
                        🗑️
                    </button>
                </div>
            </div>
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
                    <label>Total Debts</label>
                    <div class="value">${borrower.debtCount || 0}</div>
                </div>
            </div>
            <div class="click-hint" onclick="event.stopPropagation(); showBorrowerDebts('${borrower._id}')">
                👆 Click to view debts
            </div>
        </div>
    `}).join('');
}

async function showBorrowerDebts(borrowerId) {
    currentBorrowerId = borrowerId;
    const data = await fetchBorrowerDetails(borrowerId);
    
    if (!data) {
        showToast('Error loading borrower details', 'error');
        return;
    }
    
    const { borrower, debts, summary } = data;
    
    const detailView = document.getElementById('debtDetailView');
    const content = document.getElementById('debtDetailContent');
    
    let debtsHtml = '';
    if (debts && debts.length > 0) {
        debtsHtml = debts.map(debt => `
            <div class="debt-item">
                <div class="debt-info" onclick="showDebtPayments('${debt._id}')" style="flex:1;cursor:pointer;">
                    <span class="reason">${debt.reason}</span>
                    <span class="date">📅 ${formatDate(debt.dateBorrowed)}</span>
                </div>
                <div class="debt-amount ${debt.status.toLowerCase()}">
                    ₱${debt.amount.toFixed(2)}
                    <span style="font-size:0.8rem;color:var(--gray-400);font-weight:400;">
                        (Paid: ₱${debt.totalPaid.toFixed(2)})
                    </span>
                </div>
                <span class="debt-status status-${debt.status.toLowerCase()}">${debt.status}</span>
                <div class="debt-actions">
                    <button onclick="event.stopPropagation(); openEditModal('${debt._id}', ${debt.amount}, '${debt.reason}', '${debt.dateBorrowed}', '${debt.status}')" 
                            class="btn-edit-debt"
                            title="Edit this debt">
                        ✏️
                    </button>
                    <button onclick="event.stopPropagation(); deleteDebt('${debt._id}', '${debt.reason}', ${debt.amount})" 
                            class="btn-delete-debt"
                            title="Delete this debt">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    } else {
        debtsHtml = `<div class="no-payments"><span class="icon">📭</span>No debts recorded for this borrower.</div>`;
    }
    
    content.innerHTML = `
        <div class="debt-detail-header">
            <div>
                <h2>${borrower.name}'s Debts</h2>
                ${borrower.contactInfo ? `<p>📱 ${borrower.contactInfo}</p>` : ''}
            </div>
            <div class="debt-summary">
                <div>Total: <strong>₱${summary.totalBorrowed.toFixed(2)}</strong></div>
                <div>Paid: <strong>₱${summary.totalPaid.toFixed(2)}</strong></div>
                <div>Remaining: <strong style="color:${summary.remainingBalance > 0 ? 'var(--danger)' : 'var(--success)'}">
                    ₱${summary.remainingBalance.toFixed(2)}
                </strong></div>
            </div>
        </div>
        <div class="debt-list">
            <div class="debt-list-title">💰 Debts (${debts.length})</div>
            ${debtsHtml}
        </div>
        <div class="click-hint" style="margin-top:15px;text-align:center;color:var(--gray-400);font-size:0.85rem;">
            👆 Click a debt to view payments | ✏️ Edit | 🗑️ Delete
        </div>
    `;
    
    detailView.style.display = 'block';
    detailView.scrollIntoView({ behavior: 'smooth' });
}

async function showDebtPayments(debtId) {
    console.log('🟢 Showing debt payments for ID:', debtId);
    
    if (!debtId) {
        showToast('Invalid debt ID', 'error');
        return;
    }
    
    try {
        const debtData = await fetchDebtDetails(debtId);
        console.log('📦 Debt data received:', debtData);
        
        if (!debtData) {
            showToast('Error loading debt details - debt not found', 'error');
            return;
        }
        
        const content = document.getElementById('debtDetailContent');
        
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
            paymentsHtml = `<div class="no-payments"><span class="icon">💸</span>No payments recorded for this debt yet.</div>`;
        }
        
        const debtHtml = `
            <div class="debt-payment-detail" style="background:var(--gray-50);padding:20px;border-radius:var(--radius-sm);margin:15px 0 20px 0;border-left:4px solid var(--primary);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <div>
                        <strong style="font-size:1.1rem;">${debtData.reason || 'No reason provided'}</strong>
                        <span style="margin-left:12px;font-size:0.9rem;color:var(--gray-500);">
                            📅 ${formatDate(debtData.dateBorrowed)}
                        </span>
                    </div>
                    <div>
                        <span style="font-weight:700;font-size:1.2rem;color:var(--gray-800);">
                            ₱${(debtData.amount || 0).toFixed(2)}
                        </span>
                        <span style="margin-left:10px;padding:3px 14px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${debtData.status === 'Paid' ? 'var(--success-light)' : debtData.status === 'Partial' ? 'var(--warning-light)' : 'var(--danger-light)'};color:${debtData.status === 'Paid' ? '#065f46' : debtData.status === 'Partial' ? '#92400e' : '#991b1b'};">
                            ${debtData.status || 'Unknown'}
                        </span>
                    </div>
                </div>
                <div style="margin-top:8px;font-size:0.95rem;color:var(--gray-500);">
                    Paid: ₱${(debtData.totalPaid || 0).toFixed(2)} | Remaining: ₱${(debtData.remainingBalance || 0).toFixed(2)}
                </div>
            </div>
            
            <h3 style="margin:20px 0 12px 0;font-size:1.1rem;">💰 Payment History</h3>
            ${paymentsHtml}
        `;
        
        const debtList = content.querySelector('.debt-list');
        if (debtList) {
            const existingDetail = content.querySelector('.debt-payment-detail');
            if (existingDetail) existingDetail.remove();
            
            const detailDiv = document.createElement('div');
            detailDiv.className = 'debt-payment-detail';
            detailDiv.innerHTML = debtHtml;
            
            debtList.parentNode.insertBefore(detailDiv, debtList);
            detailDiv.scrollIntoView({ behavior: 'smooth' });
        } else {
            content.innerHTML += debtHtml;
        }
        
    } catch (error) {
        console.error('❌ Error in showDebtPayments:', error);
        showToast('Error loading debt details: ' + error.message, 'error');
    }
}

function closeDebtDetail() {
    document.getElementById('debtDetailView').style.display = 'none';
    refreshDashboard();
}

// ========================================
// POPULATE SELECTS
// ========================================

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

// ========================================
// UTILITY FUNCTIONS
// ========================================

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

// ========================================
// THEME / COLOR SYSTEM (UPDATED WITH NAV-BAR)
// ========================================

// Generate header gradient based on background color
function getHeaderGradient(bgColor) {
    const defaultGradient = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
    const darkGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const warmGradient = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    const oceanGradient = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    const forestGradient = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
    const sunsetGradient = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    const purpleGradient = 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)';
    const nightGradient = 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 100%)';
    
    const gradientMap = {
        '#1a1a2e': darkGradient,
        '#0f0e17': nightGradient,
        '#2d1b69': darkGradient,
        '#1b3a4b': oceanGradient,
        '#2d2d2d': darkGradient,
        '#fef9e7': warmGradient,
        '#fff3e0': sunsetGradient,
        '#e8f5e9': forestGradient,
        '#e3f2fd': oceanGradient,
        '#fce4ec': purpleGradient,
        '#f3e5f5': purpleGradient,
        '#f1f5f9': defaultGradient,
    };
    
    return gradientMap[bgColor] || defaultGradient;
}

// Load saved colors from localStorage
function loadThemeColors() {
    const savedBg = localStorage.getItem('utang_bg_color');
    const savedCard = localStorage.getItem('utang_card_color');
    
    if (savedBg) {
        document.body.style.backgroundColor = savedBg;
        document.body.style.backgroundImage = 'none';
        
        const header = document.querySelector('header');
        if (header) {
            header.style.background = getHeaderGradient(savedBg);
            header.classList.add('custom-header');
        }
        
        document.querySelectorAll('#bgColorOptions .color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === savedBg);
        });
        
        const customBgInput = document.getElementById('customBgColor');
        if (customBgInput) {
            customBgInput.value = savedBg;
        }
    }
    
    if (savedCard) {
        // INCLUDES .nav-bar NOW!
        const cardElements = document.querySelectorAll('.borrower-card, .dashboard, .form-section, .debt-detail-view, .debt-item, .payment-item, .theme-controls, .nav-bar');
        cardElements.forEach(el => {
            el.style.backgroundColor = savedCard;
        });
        document.querySelectorAll('#cardColorOptions .color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === savedCard);
        });
        
        const customCardInput = document.getElementById('customCardColor');
        if (customCardInput) {
            customCardInput.value = savedCard;
        }
    }
}

// Set background color
function setBgColor(color) {
    document.body.style.backgroundColor = color;
    document.body.style.backgroundImage = 'none';
    localStorage.setItem('utang_bg_color', color);
    
    const header = document.querySelector('header');
    if (header) {
        header.style.background = getHeaderGradient(color);
        header.classList.add('custom-header');
    }
    
    document.querySelectorAll('#bgColorOptions .color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
    });
    
    const customBgInput = document.getElementById('customBgColor');
    if (customBgInput) {
        customBgInput.value = color;
    }
}

// Set card color (UPDATED - includes .nav-bar)
function setCardColor(color) {
    const elements = document.querySelectorAll('.borrower-card, .dashboard, .form-section, .debt-detail-view, .debt-item, .payment-item, .theme-controls, .nav-bar');
    elements.forEach(el => {
        el.style.backgroundColor = color;
    });
    localStorage.setItem('utang_card_color', color);
    
    document.querySelectorAll('#cardColorOptions .color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
    });
    
    const customCardInput = document.getElementById('customCardColor');
    if (customCardInput) {
        customCardInput.value = color;
    }
}

// Reset background color
function resetBgColor() {
    const defaultColor = '#f1f5f9';
    document.body.style.backgroundColor = defaultColor;
    document.body.style.backgroundImage = '';
    localStorage.removeItem('utang_bg_color');
    
    const header = document.querySelector('header');
    if (header) {
        header.style.background = '';
        header.classList.remove('custom-header');
    }
    
    document.querySelectorAll('#bgColorOptions .color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === defaultColor);
    });
    
    const customBgInput = document.getElementById('customBgColor');
    if (customBgInput) {
        customBgInput.value = defaultColor;
    }
    
    showToast('🔄 Background color reset to default', 'info');
}

// Reset card color (UPDATED - includes .nav-bar)
function resetCardColor() {
    const defaultColor = '#ffffff';
    const elements = document.querySelectorAll('.borrower-card, .dashboard, .form-section, .debt-detail-view, .debt-item, .payment-item, .theme-controls, .nav-bar');
    elements.forEach(el => {
        el.style.backgroundColor = defaultColor;
    });
    localStorage.removeItem('utang_card_color');
    
    document.querySelectorAll('#cardColorOptions .color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === defaultColor);
    });
    
    const customCardInput = document.getElementById('customCardColor');
    if (customCardInput) {
        customCardInput.value = defaultColor;
    }
    
    showToast('🔄 Card color reset to default', 'info');
}

// Apply custom colors from color pickers
function applyCustomColors() {
    const bgColor = document.getElementById('customBgColor').value;
    const cardColor = document.getElementById('customCardColor').value;
    
    if (bgColor) {
        setBgColor(bgColor);
    }
    
    if (cardColor) {
        setCardColor(cardColor);
    }
    
    showToast('🎨 Colors applied and saved!', 'success');
}

// ========================================
// SAVE COLORS
// ========================================

function saveColors() {
    const bgColor = localStorage.getItem('utang_bg_color');
    const cardColor = localStorage.getItem('utang_card_color');
    
    let savedCount = 0;
    
    if (bgColor) {
        localStorage.setItem('utang_bg_color', bgColor);
        savedCount++;
    } else {
        const currentBg = document.body.style.backgroundColor;
        if (currentBg && currentBg !== '') {
            localStorage.setItem('utang_bg_color', currentBg);
            savedCount++;
        }
    }
    
    if (cardColor) {
        localStorage.setItem('utang_card_color', cardColor);
        savedCount++;
    } else {
        const firstCard = document.querySelector('.borrower-card');
        if (firstCard) {
            const currentCard = firstCard.style.backgroundColor || '#ffffff';
            localStorage.setItem('utang_card_color', currentCard);
            savedCount++;
        }
    }
    
    const header = document.querySelector('header');
    if (header) {
        const bg = header.style.background || getComputedStyle(header).background;
        localStorage.setItem('utang_header_gradient', bg);
    }
    
    if (savedCount > 0) {
        showToast(`✅ ${savedCount} color(s) saved permanently!`, 'success');
    } else {
        showToast('✅ Colors saved permanently!', 'success');
    }
}

// Initialize theme controls
function initThemeControls() {
    document.querySelectorAll('#bgColorOptions .color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.dataset.color;
            setBgColor(color);
            showToast('🎨 Background color applied!', 'info');
        });
    });
    
    document.querySelectorAll('#cardColorOptions .color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.dataset.color;
            setCardColor(color);
            showToast('🎨 Card color applied!', 'info');
        });
    });
    
    loadThemeColors();
}

// ========================================
// EVENT LISTENERS
// ========================================

document.getElementById('borrowerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('borrowerName').value.trim();
    const contactInfo = document.getElementById('borrowerContact').value.trim();
    
    try {
        await addBorrower(name, contactInfo);
        document.getElementById('borrowerForm').reset();
        await refreshDashboard();
        showToast('✅ Borrower added successfully!', 'success');
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
});

document.getElementById('borrowerForm2').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('borrowerName2').value.trim();
    const contactInfo = document.getElementById('borrowerContact2').value.trim();
    
    try {
        await addBorrower(name, contactInfo);
        document.getElementById('borrowerForm2').reset();
        await refreshDashboard();
        showToast('✅ Borrower added successfully!', 'success');
        showSection('dashboard');
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
});

document.getElementById('debtForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const borrowerId = document.getElementById('debtBorrower').value;
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const reason = document.getElementById('debtReason').value.trim();
    const dateBorrowed = document.getElementById('debtDate').value;
    
    if (!borrowerId || !amount || !reason) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        await addDebt(borrowerId, amount, reason, dateBorrowed);
        document.getElementById('debtForm').reset();
        await refreshDashboard();
        showToast('✅ Debt logged successfully!', 'success');
        showSection('dashboard');
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
});

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const debtId = document.getElementById('paymentDebt').value;
    const amountPaid = parseFloat(document.getElementById('paymentAmount').value);
    const notes = document.getElementById('paymentNotes').value.trim();
    
    if (!debtId || !amountPaid) {
        showToast('Please select a debt and enter the payment amount', 'error');
        return;
    }
    
    try {
        await addPayment(debtId, amountPaid, notes);
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentDebt').innerHTML = '<option value="">Select Debt</option>';
        await refreshDashboard();
        showToast('✅ Payment recorded successfully!', 'success');
        showSection('dashboard');
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
});

// ========================================
// INITIALIZE APP
// ========================================

async function initApp() {
    console.log('🚀 Utang Logs App Starting...');
    console.log('📡 API URL:', API_URL);
    await refreshDashboard();
    initThemeControls();
    console.log('✅ App ready!');
}

initApp();
setInterval(refreshDashboard, 30000);
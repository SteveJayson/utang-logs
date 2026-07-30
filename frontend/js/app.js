const API_URL = 'http://localhost:5000/api';

// Fetch all borrowers
async function fetchBorrowers() {
    try {
        const response = await fetch(`${API_URL}/borrowers`);
        if (!response.ok) throw new Error('Failed to fetch borrowers');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching borrowers:', error);
        return [];
    }
}

// Add borrower
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

// Add debt
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

// Add payment
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

// Get debts for a borrower
async function getBorrowerDebts(borrowerId) {
    try {
        const response = await fetch(`${API_URL}/debts/borrower/${borrowerId}`);
        if (!response.ok) throw new Error('Failed to fetch debts');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching debts:', error);
        return [];
    }
}

// Update UI
function renderBorrowers(borrowers) {
    const container = document.getElementById('borrowerList');
    
    if (borrowers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>No borrowers yet. Add your first borrower above!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = borrowers.map(borrower => `
        <div class="borrower-card">
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
        </div>
    `).join('');
}

// Populate select dropdowns
async function populateSelects() {
    const borrowers = await fetchBorrowers();
    const select1 = document.getElementById('debtBorrower');
    const select2 = document.getElementById('paymentBorrower');
    
    [select1, select2].forEach(select => {
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
    
    // Update debt dropdown when borrower changes
    document.getElementById('paymentBorrower').addEventListener('change', async function() {
        const debtSelect = document.getElementById('paymentDebt');
        const borrowerId = this.value;
        
        debtSelect.innerHTML = '<option value="">Select Debt</option>';
        if (borrowerId) {
            const debts = await getBorrowerDebts(borrowerId);
            const unpaidDebts = debts.filter(d => d.status !== 'Paid');
            unpaidDebts.forEach(debt => {
                const option = document.createElement('option');
                option.value = debt._id;
                const remaining = debt.remainingBalance || debt.amount;
                option.textContent = `${debt.reason} - ₱${remaining.toFixed(2)} remaining`;
                debtSelect.appendChild(option);
            });
        }
    });
}

// Initialize app
async function initApp() {
    await populateSelects();
    const borrowers = await fetchBorrowers();
    renderBorrowers(borrowers);
}

// Event Listeners
document.getElementById('borrowerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('borrowerName').value.trim();
    const contactInfo = document.getElementById('borrowerContact').value.trim();
    
    try {
        await addBorrower(name, contactInfo);
        document.getElementById('borrowerForm').reset();
        await populateSelects();
        const borrowers = await fetchBorrowers();
        renderBorrowers(borrowers);
        alert('✅ Borrower added successfully!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

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
        await populateSelects();
        const borrowers = await fetchBorrowers();
        renderBorrowers(borrowers);
        alert('✅ Debt logged successfully!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

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
        await populateSelects();
        const borrowers = await fetchBorrowers();
        renderBorrowers(borrowers);
        alert('✅ Payment recorded successfully!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// Initial load
initApp();

// Refresh data every 30 seconds
setInterval(async () => {
    const borrowers = await fetchBorrowers();
    renderBorrowers(borrowers);
}, 30000);
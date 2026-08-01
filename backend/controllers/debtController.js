const Debt = require('../models/Debt');
const Borrower = require('../models/Borrower');
const Payment = require('../models/Payment');
const DeleteHistory = require('../models/DeleteHistory');

// Create a new debt
exports.createDebt = async (req, res) => {
    try {
        const { borrowerId, amount, reason, dateBorrowed } = req.body;
        
        const borrower = await Borrower.findById(borrowerId);
        if (!borrower) {
            return res.status(404).json({
                success: false,
                message: 'Borrower not found'
            });
        }
        
        const debt = new Debt({
            borrowerId,
            amount,
            reason,
            dateBorrowed: dateBorrowed || Date.now()
        });
        
        await debt.save();
        
        res.status(201).json({
            success: true,
            data: debt
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all debts for a borrower
exports.getDebtsByBorrower = async (req, res) => {
    try {
        const { borrowerId } = req.params;
        
        const debts = await Debt.find({ borrowerId })
            .sort({ dateBorrowed: -1 });
            
        res.json({
            success: true,
            data: debts
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get single debt with full details
exports.getDebtById = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🔍 Fetching debt with ID:', id);
        
        const debt = await Debt.findById(id);
        
        if (!debt) {
            console.log('❌ Debt not found with ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        console.log('✅ Debt found:', debt);
        
        const payments = await Payment.find({ debtId: id });
        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        
        res.json({
            success: true,
            data: {
                _id: debt._id,
                amount: debt.amount,
                reason: debt.reason,
                status: debt.status || 'Unpaid',
                dateBorrowed: debt.dateBorrowed,
                totalPaid: totalPaid,
                remainingBalance: debt.amount - totalPaid,
                payments: payments.map(p => ({
                    _id: p._id,
                    amountPaid: p.amountPaid,
                    datePaid: p.datePaid,
                    notes: p.notes || ''
                }))
            }
        });
    } catch (error) {
        console.error('❌ Error in getDebtById:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update debt status
exports.updateDebtStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const debt = await Debt.findById(id);
        if (!debt) {
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        if (!['Unpaid', 'Partial', 'Paid'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }
        
        debt.status = status;
        await debt.save();
        
        res.json({
            success: true,
            data: debt
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// EDIT DEBT - NEW!
// ============================================
exports.editDebt = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, reason, dateBorrowed } = req.body;
        
        console.log('✏️ Editing debt with ID:', id);
        
        const debt = await Debt.findById(id);
        if (!debt) {
            console.log('❌ Debt not found');
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        // Update fields (only if provided)
        if (amount !== undefined && amount !== null) {
            if (amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be greater than 0'
                });
            }
            debt.amount = amount;
        }
        
        if (reason) {
            debt.reason = reason.trim();
        }
        
        if (dateBorrowed) {
            debt.dateBorrowed = dateBorrowed;
        }
        
        // Update status based on new amount vs payments
        const payments = await Payment.find({ debtId: debt._id });
        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        
        if (totalPaid >= debt.amount) {
            debt.status = 'Paid';
        } else if (totalPaid > 0) {
            debt.status = 'Partial';
        } else {
            debt.status = 'Unpaid';
        }
        
        await debt.save();
        
        console.log('✅ Debt updated successfully');
        
        res.json({
            success: true,
            data: debt,
            message: 'Debt updated successfully'
        });
    } catch (error) {
        console.error('❌ Error editing debt:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// DELETE DEBT WITH HISTORY - UPDATED!
// ============================================
exports.deleteDebt = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Deleting debt with ID:', id);
        
        const debt = await Debt.findById(id);
        if (!debt) {
            console.log('❌ Debt not found');
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        // Get borrower info for history
        const borrower = await Borrower.findById(debt.borrowerId);
        
        // Save to delete history BEFORE deleting
        const history = new DeleteHistory({
            debtId: debt._id,
            borrowerId: debt.borrowerId,
            borrowerName: borrower ? borrower.name : 'Unknown',
            amount: debt.amount,
            reason: debt.reason,
            dateBorrowed: debt.dateBorrowed,
            status: debt.status,
            deletedAt: new Date()
        });
        await history.save();
        console.log('📜 Delete history saved');
        
        // Delete all payments associated with this debt
        const paymentResult = await Payment.deleteMany({ debtId: id });
        console.log(`💸 Deleted ${paymentResult.deletedCount} payments`);
        
        // Delete the debt
        await debt.deleteOne();
        console.log('✅ Debt deleted successfully');
        
        res.json({
            success: true,
            message: 'Debt and associated payments deleted successfully',
            historyId: history._id
        });
    } catch (error) {
        console.error('❌ Error deleting debt:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET DELETE HISTORY - NEW!
// ============================================
exports.getDeleteHistory = async (req, res) => {
    try {
        const { borrowerId } = req.params;
        
        let query = {};
        if (borrowerId) {
            query.borrowerId = borrowerId;
        }
        
        const history = await DeleteHistory.find(query)
            .sort({ deletedAt: -1 })
            .limit(100);
        
        res.json({
            success: true,
            data: history,
            count: history.length
        });
    } catch (error) {
        console.error('❌ Error fetching delete history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// RESTORE DEBT FROM HISTORY - NEW!
// ============================================
exports.restoreDebt = async (req, res) => {
    try {
        const { historyId } = req.params;
        
        console.log('🔄 Restoring debt from history ID:', historyId);
        
        const history = await DeleteHistory.findById(historyId);
        if (!history) {
            return res.status(404).json({
                success: false,
                message: 'History record not found'
            });
        }
        
        // Check if borrower still exists
        const borrower = await Borrower.findById(history.borrowerId);
        if (!borrower) {
            return res.status(404).json({
                success: false,
                message: 'Borrower no longer exists. Cannot restore debt.'
            });
        }
        
        // Check if debt already exists
        const existingDebt = await Debt.findById(history.debtId);
        if (existingDebt) {
            return res.status(400).json({
                success: false,
                message: 'Debt already exists. Cannot restore.'
            });
        }
        
        // Create new debt from history
        const newDebt = new Debt({
            _id: history.debtId,
            borrowerId: history.borrowerId,
            amount: history.amount,
            reason: history.reason,
            dateBorrowed: history.dateBorrowed,
            status: history.status || 'Unpaid',
            isDeleted: false
        });
        
        await newDebt.save();
        console.log('✅ Debt restored successfully');
        
        // Mark history as restored
        history.restored = true;
        history.restoredAt = new Date();
        await history.save();
        
        res.json({
            success: true,
            data: newDebt,
            message: 'Debt restored successfully'
        });
    } catch (error) {
        console.error('❌ Error restoring debt:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
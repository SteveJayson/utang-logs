const Debt = require('../models/Debt');
const Borrower = require('../models/Borrower');
const Payment = require('../models/Payment');

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

// SIMPLIFIED: Get single debt with payments
exports.getDebtById = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Fetching debt with ID:', id);
        
        // Find the debt
        const debt = await Debt.findById(id);
        
        if (!debt) {
            console.log('Debt not found with ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        console.log('Debt found:', debt);
        
        // Get payments for this debt
        const payments = await Payment.find({ debtId: id });
        console.log('Payments found:', payments.length);
        
        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        
        // Get borrower info (optional)
        let borrowerName = 'Unknown';
        try {
            const borrower = await Borrower.findById(debt.borrowerId);
            if (borrower) borrowerName = borrower.name;
        } catch (err) {
            console.log('Could not fetch borrower:', err.message);
        }
        
        res.json({
            success: true,
            data: {
                _id: debt._id,
                amount: debt.amount,
                reason: debt.reason,
                status: debt.status || 'Unpaid',
                dateBorrowed: debt.dateBorrowed,
                borrowerName: borrowerName,
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
        console.error('Error in getDebtById:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
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
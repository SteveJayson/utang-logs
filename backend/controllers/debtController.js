const Debt = require('../models/Debt');
const Borrower = require('../models/Borrower');

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

// Get single debt with full details
exports.getDebtById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const debt = await Debt.findById(id)
            .populate('payments')
            .populate('borrowerId', 'name contactInfo');
            
        if (!debt) {
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        const payments = debt.payments || [];
        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        
        res.json({
            success: true,
            data: {
                _id: debt._id,
                amount: debt.amount,
                reason: debt.reason,
                status: debt.status,
                dateBorrowed: debt.dateBorrowed,
                borrower: debt.borrowerId,
                totalPaid: totalPaid,
                remainingBalance: debt.amount - totalPaid,
                payments: payments.map(p => ({
                    _id: p._id,
                    amountPaid: p.amountPaid,
                    datePaid: p.datePaid,
                    notes: p.notes
                }))
            }
        });
    } catch (error) {
        res.status(400).json({
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
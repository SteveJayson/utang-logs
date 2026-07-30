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

// Get all debts for a borrower
exports.getDebtsByBorrower = async (req, res) => {
    try {
        const { borrowerId } = req.params;
        
        const debts = await Debt.find({ borrowerId })
            .sort({ dateBorrowed: -1 })
            .populate('payments');
            
        const formattedDebts = debts.map(debt => {
            const payments = debt.payments || [];
            const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
            return {
                ...debt.toJSON(),
                totalPaid,
                remainingBalance: debt.amount - totalPaid
            };
        });
        
        res.json({
            success: true,
            data: formattedDebts
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
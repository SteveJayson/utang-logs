const Payment = require('../models/Payment');
const Debt = require('../models/Debt');

// Record a payment
exports.createPayment = async (req, res) => {
    try {
        const { debtId, amountPaid, datePaid, notes } = req.body;
        
        const debt = await Debt.findById(debtId);
        if (!debt) {
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        // Check if payment exceeds remaining balance
        const existingPayments = await Payment.find({ debtId });
        const totalPaid = existingPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        const remaining = debt.amount - totalPaid;
        
        if (amountPaid > remaining) {
            return res.status(400).json({
                success: false,
                message: `Payment exceeds remaining balance of ₱${remaining.toFixed(2)}`
            });
        }
        
        const payment = new Payment({
            debtId,
            amountPaid,
            datePaid: datePaid || Date.now(),
            notes
        });
        
        await payment.save();
        
        // Update debt status
        await debt.updateStatus();
        
        res.status(201).json({
            success: true,
            data: payment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all payments for a debt
exports.getPaymentsByDebt = async (req, res) => {
    try {
        const { debtId } = req.params;
        
        const payments = await Payment.find({ debtId })
            .sort({ datePaid: -1 });
            
        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
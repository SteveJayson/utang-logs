const Payment = require('../models/Payment');
const Debt = require('../models/Debt');

// ============================================
// RECORD PAYMENT
// ============================================
exports.createPayment = async (req, res) => {
    try {
        const { debtId, amountPaid, datePaid, notes } = req.body;
        
        console.log('📥 Payment request received:', { debtId, amountPaid, datePaid });
        
        // Validate inputs
        if (!debtId) {
            return res.status(400).json({
                success: false,
                message: 'Debt ID is required'
            });
        }
        
        if (!amountPaid || amountPaid <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }
        
        const debt = await Debt.findById(debtId);
        if (!debt) {
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        // Calculate current remaining balance (with precision)
        const existingPayments = await Payment.find({ debtId });
        const totalPaid = existingPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        const remaining = Math.round((debt.amount - totalPaid) * 100) / 100;
        
        console.log('💰 Debt info:', {
            reason: debt.reason,
            amount: debt.amount,
            totalPaid: totalPaid,
            remaining: remaining,
            requestedPayment: amountPaid
        });
        
        // Check if payment exceeds remaining balance (with tolerance)
        if (amountPaid > remaining + 0.01) {
            console.log('❌ Payment exceeds remaining:', amountPaid, '>', remaining);
            return res.status(400).json({
                success: false,
                message: `Payment exceeds remaining balance of ₱${remaining.toFixed(2)}`
            });
        }
        
        // Cap the payment to the remaining balance
        const finalAmount = Math.round(Math.min(amountPaid, remaining) * 100) / 100;
        
        console.log('✅ Accepting payment:', finalAmount);
        
        // Create payment
        const payment = new Payment({
            debtId,
            amountPaid: finalAmount,
            datePaid: datePaid || Date.now(),
            notes
        });
        
        await payment.save();
        
        // Update debt status
        await debt.updateStatus();
        
        // Get updated debt
        const updatedDebt = await Debt.findById(debtId);
        
        console.log('✅ Payment saved. New status:', updatedDebt.status);
        
        res.status(201).json({
            success: true,
            data: payment,
            debtStatus: updatedDebt.status,
            remainingBalance: Math.round((updatedDebt.amount - (totalPaid + finalAmount)) * 100) / 100,
            message: `Payment recorded! Status: ${updatedDebt.status}`
        });
        
    } catch (error) {
        console.error('❌ Error in createPayment:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================
// GET ALL PAYMENTS FOR A DEBT
// ============================================
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
        console.error('❌ Error in getPaymentsByDebt:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

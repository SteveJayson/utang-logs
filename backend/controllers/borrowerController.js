const Borrower = require('../models/Borrower');
const Debt = require('../models/Debt');
const Payment = require('../models/Payment');

exports.createBorrower = async (req, res) => {
    try {
        const { name, contactInfo } = req.body;
        const existingBorrower = await Borrower.findOne({ name: name.trim() });
        if (existingBorrower) {
            return res.status(400).json({ message: 'Borrower already exists' });
        }
        const borrower = new Borrower({ name, contactInfo });
        await borrower.save();
        res.status(201).json({ success: true, data: borrower });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getAllBorrowers = async (req, res) => {
    try {
        const borrowers = await Borrower.find().sort({ createdAt: -1 });
        const borrowerSummaries = await Promise.all(borrowers.map(async (borrower) => {
            const debts = await Debt.find({ borrowerId: borrower._id });
            const totalBorrowed = debts.reduce((sum, debt) => sum + debt.amount, 0);
            const payments = await Payment.find({ debtId: { $in: debts.map(d => d._id) } });
            const totalPaid = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
            const activeDebts = debts.filter(d => d.status !== 'Paid');
            const totalRemaining = activeDebts.reduce((sum, debt) => {
                const paid = payments.filter(p => p.debtId.toString() === debt._id.toString()).reduce((s, p) => s + p.amountPaid, 0);
                return sum + (debt.amount - paid);
            }, 0);
            return { ...borrower.toJSON(), totalBorrowed, totalPaid, totalRemaining, debtCount: debts.length, activeDebtCount: activeDebts.length };
        }));
        res.json({ success: true, data: borrowerSummaries });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get a single borrower with their debts and payment details
exports.getBorrowerById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const borrower = await Borrower.findById(id);
        if (!borrower) {
            return res.status(404).json({
                success: false,
                message: 'Borrower not found'
            });
        }
        
        // Get all debts with payments populated
        const debts = await Debt.find({ borrowerId: id })
            .populate('payments')
            .sort({ dateBorrowed: -1 });
            
        // Format debts with payment details
        const formattedDebts = debts.map(debt => {
            const payments = debt.payments || [];
            const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
            const remaining = debt.amount - totalPaid;
            
            return {
                _id: debt._id,
                amount: debt.amount,
                reason: debt.reason,
                status: debt.status,
                dateBorrowed: debt.dateBorrowed,
                totalPaid: totalPaid,
                remainingBalance: remaining,
                payments: payments.map(p => ({
                    _id: p._id,
                    amountPaid: p.amountPaid,
                    datePaid: p.datePaid,
                    notes: p.notes
                }))
            };
        });
        
        // Calculate totals
        const totalBorrowed = debts.reduce((sum, debt) => sum + debt.amount, 0);
        const totalPaid = debts.reduce((sum, debt) => {
            const paid = debt.payments ? debt.payments.reduce((s, p) => s + p.amountPaid, 0) : 0;
            return sum + paid;
        }, 0);
        const remainingBalance = totalBorrowed - totalPaid;
        
        res.json({
            success: true,
            data: {
                borrower: {
                    _id: borrower._id,
                    name: borrower.name,
                    contactInfo: borrower.contactInfo,
                    createdAt: borrower.createdAt
                },
                debts: formattedDebts,
                summary: {
                    totalBorrowed,
                    totalPaid,
                    remainingBalance,
                    debtCount: debts.length,
                    activeDebtCount: debts.filter(d => d.status !== 'Paid').length
                }
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteBorrower = async (req, res) => {
    try {
        const { id } = req.params;
        const borrower = await Borrower.findById(id);
        if (!borrower) {
            return res.status(404).json({ success: false, message: 'Borrower not found' });
        }
        const debts = await Debt.find({ borrowerId: id });
        const debtIds = debts.map(d => d._id);
        await Payment.deleteMany({ debtId: { $in: debtIds } });
        await Debt.deleteMany({ borrowerId: id });
        await borrower.deleteOne();
        res.json({ success: true, message: 'Borrower and all associated data deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
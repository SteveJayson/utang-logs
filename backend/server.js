require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5000',
        'http://localhost:8000',
        'https://utang-logs-frontend.onrender.com',
        'https://utang-logs.onrender.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// IMPORT MODELS
// ============================================
const Debt = require('./models/Debt');
const Payment = require('./models/Payment');
const Borrower = require('./models/Borrower');

// ============================================
// DIRECT ROUTE FOR DEBT DETAILS - MUST BE BEFORE OTHER ROUTES!
// ============================================
app.get('/api/debts/:id', async (req, res) => {
    try {
        const debtId = req.params.id;
        console.log('🔍 DIRECT ROUTE: Looking for debt with ID:', debtId);
        
        // Find the debt
        const debt = await Debt.findById(debtId);
        
        if (!debt) {
            console.log('❌ DIRECT ROUTE: Debt not found with ID:', debtId);
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        console.log('✅ DIRECT ROUTE: Debt found:', debt.reason);
        
        // Get payments
        const payments = await Payment.find({ debtId: debt._id });
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
        console.error('❌ DIRECT ROUTE Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// ROUTES
// ============================================
const borrowerRoutes = require('./routes/borrowers');
const debtRoutes = require('./routes/debts');
const paymentRoutes = require('./routes/payments');

app.use('/api/borrowers', borrowerRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/payments', paymentRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Utang Logs API' });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
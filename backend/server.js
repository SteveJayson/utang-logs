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
// DIRECT ROUTE FOR DEBT DETAILS (FIX)
// ============================================
app.get('/api/debts/:id', async (req, res) => {
    try {
        const Debt = require('./models/Debt');
        const Payment = require('./models/Payment');
        
        console.log('🔍 Fetching debt with ID:', req.params.id);
        
        const debt = await Debt.findById(req.params.id);
        if (!debt) {
            console.log('❌ Debt not found');
            return res.status(404).json({
                success: false,
                message: 'Debt not found'
            });
        }
        
        const payments = await Payment.find({ debtId: req.params.id });
        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        
        console.log('✅ Debt found, payments:', payments.length);
        
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
        console.error('❌ Error in debt details:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Routes
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
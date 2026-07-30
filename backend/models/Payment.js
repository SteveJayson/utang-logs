const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    debtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Debt',
        required: [true, 'Debt ID is required']
    },
    amountPaid: {
        type: Number,
        required: [true, 'Amount paid is required'],
        min: [0.01, 'Amount must be greater than 0']
    },
    datePaid: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
const mongoose = require('mongoose');

const deleteHistorySchema = new mongoose.Schema({
    debtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Debt',
        required: true
    },
    borrowerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Borrower',
        required: true
    },
    borrowerName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    dateBorrowed: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Unpaid', 'Partial', 'Paid'],
        default: 'Unpaid'
    },
    deletedAt: {
        type: Date,
        default: Date.now
    },
    deletedBy: {
        type: String,
        default: 'User'
    },
    restored: {
        type: Boolean,
        default: false
    },
    restoredAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DeleteHistory', deleteHistorySchema);
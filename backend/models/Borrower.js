const mongoose = require('mongoose');

const borrowerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Borrower name is required'],
        trim: true
    },
    contactInfo: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual to get total debt amount
borrowerSchema.virtual('totalDebt', {
    ref: 'Debt',
    localField: '_id',
    foreignField: 'borrowerId',
    justOne: false,
    options: { match: { status: { $ne: 'Paid' } } }
});

module.exports = mongoose.model('Borrower', borrowerSchema);
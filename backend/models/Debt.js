const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
    borrowerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Borrower',
        required: [true, 'Borrower ID is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be greater than 0']
    },
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        trim: true
    },
    status: {
        type: String,
        enum: ['Unpaid', 'Partial', 'Paid'],
        default: 'Unpaid'
    },
    dateBorrowed: {
        type: Date,
        required: [true, 'Date borrowed is required'],
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual to get total payments for this debt
debtSchema.virtual('payments', {
    ref: 'Payment',
    localField: '_id',
    foreignField: 'debtId',
    justOne: false
});

// Virtual to get total paid amount
debtSchema.virtual('totalPaid').get(function() {
    if (!this.payments) return 0;
    return this.payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
});

// Virtual to get remaining balance
debtSchema.virtual('remainingBalance').get(function() {
    const totalPaid = this.totalPaid || 0;
    return this.amount - totalPaid;
});

// Method to update status based on payments
debtSchema.methods.updateStatus = async function() {
    const totalPaid = await this.model('Payment').aggregate([
        { $match: { debtId: this._id } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);

    const paidAmount = totalPaid.length > 0 ? totalPaid[0].total : 0;
    
    if (paidAmount >= this.amount) {
        this.status = 'Paid';
    } else if (paidAmount > 0) {
        this.status = 'Partial';
    } else {
        this.status = 'Unpaid';
    }
    
    await this.save();
    return this;
};

module.exports = mongoose.model('Debt', debtSchema);
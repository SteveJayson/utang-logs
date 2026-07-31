const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');

// Routes
router.post('/', debtController.createDebt);
router.get('/borrower/:borrowerId', debtController.getDebtsByBorrower);
router.get('/:id', debtController.getDebtById);  // ← THIS IS THE MISSING ROUTE!
router.put('/:id/status', debtController.updateDebtStatus);

module.exports = router;
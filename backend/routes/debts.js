const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');

router.post('/', debtController.createDebt);
router.get('/borrower/:borrowerId', debtController.getDebtsByBorrower);
router.get('/:id', debtController.getDebtById);
router.put('/:id/status', debtController.updateDebtStatus);
router.delete('/:id', debtController.deleteDebt);  // ← NEW DELETE ROUTE

module.exports = router;
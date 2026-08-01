const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');

router.post('/', debtController.createDebt);
router.get('/borrower/:borrowerId', debtController.getDebtsByBorrower);
router.get('/:id', debtController.getDebtById);
router.put('/:id', debtController.editDebt);  // ← NEW: Edit debt
router.put('/:id/status', debtController.updateDebtStatus);
router.delete('/:id', debtController.deleteDebt);
router.get('/history/:borrowerId?', debtController.getDeleteHistory);  // ← NEW: Get history
router.post('/restore/:historyId', debtController.restoreDebt);  // ← NEW: Restore debt

module.exports = router;
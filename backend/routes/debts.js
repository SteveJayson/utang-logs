const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');

router.post('/', debtController.createDebt);
router.get('/borrower/:borrowerId', debtController.getDebtsByBorrower);
router.get('/:id', debtController.getDebtById);  // ← THIS LINE IS MISSING!
router.put('/:id/status', debtController.updateDebtStatus);

module.exports = router;
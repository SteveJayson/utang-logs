const express = require('express'); 
const router = express.Router(); 
const borrowerController = require('../controllers/borrowerController'); 
 
router.post('/', borrowerController.createBorrower); 
router.get('/', borrowerController.getAllBorrowers); 
router.get('/:id', borrowerController.getBorrowerById); 
router.delete('/:id', borrowerController.deleteBorrower); 
 
module.exports = router; 

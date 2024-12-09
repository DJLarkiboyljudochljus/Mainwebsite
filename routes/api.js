const express = require('express');

const router = express.Router();

router.use('/auth', require('./api/auth'));
router.use('/admin', require('./api/admin'));
router.use('/users', require('./api/user'));

module.exports = router;

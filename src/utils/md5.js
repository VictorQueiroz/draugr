var crypto = require('crypto');

module.exports = function (value) {
	return crypto.createHash('md5').update(value).digest('hex');
};
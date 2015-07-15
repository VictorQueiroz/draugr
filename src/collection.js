var _ 			= require('lodash');
var first		= _.first;

function Collection(items) {
	this.items = items;
}

Collection.prototype = {
	all: function () {
		return this.items;
	},

	first: function (callback, d) {
		if(!callback) {
			return this.items.length > 0 ? first(this.items) : null;
		}

		return callback(first(this.items), d);
	}
};

module.exports = Collection;
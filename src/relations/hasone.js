var _						 	= require('lodash');
var extend				= _.extend;
var inherits 			= require('../utils/inherits');
var HasOneOrMany 	= require('./hasone-or-many')

function HasOne() {
	HasOneOrMany.apply(this, arguments);
}

inherits(HasOne, HasOneOrMany);

extend(HasOne.prototype, {
	getResults: function () {
		return this.query.first();
	},

	initRelation: function (models, relation) {
		forEach(models, function (model) {
			model.setRelation(relation, null);
		});

		return models;
	},

	match: function (models, results, relation) {
		return this.matchOne(models, results, relation);
	}
});

module.exports = HasOne;
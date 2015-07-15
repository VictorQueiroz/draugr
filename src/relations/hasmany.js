var _						 	= require('lodash');
var extend				= _.extend;
var inherits 			= require('../utils/inherits');
var HasOneOrMany 	= require('./hasone-or-many');

function HasMany() {
	HasOneOrMany.apply(this, arguments);
}

inherits(HasMany, HasOneOrMany);

extend(HasMany.prototype, {
	getResults: function () {
		return this.query.get();
	},

	initRelation: function (models, relation) {
		forEach(models, function (model) {
			model.setRelation(relation, this.related.newCollection());
		});

		return models;
	},

	match: function (models, results, relation) {
		return this.matchMany(models, results, relation);
	}
});

module.exports = HasMany;
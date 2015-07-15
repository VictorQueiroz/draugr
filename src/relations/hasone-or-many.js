var _ 						= require('lodash'),
		md5						= require('../utils/md5'),
		extend				= _.extend,
		inherits				= require('../utils/inherits'),
		microtime 			= require('../utils/microtime'),
		Expression			= require('sqlbuilder/src/expression'),
		Relation				= require('./relation');

inherits(HasOneOrMany, Relation);

function HasOneOrMany(query, parent, foreignKey, localKey) {
	this.localKey = localKey;
	this.foreignKey = foreignKey;

  Relation.call(this, query, parent);
}

extend(HasOneOrMany.prototype, {
	foreignKey: '',

	localKey: '',

	addConstraints: function () {
    if(this.constraints) {
  		this.query.where(this.foreignKey, '=', this.getParentKey());
  		this.query.whereNotNull(this.foreignKey);
    }
	},

	getRelationCountQuery: function (query, parent) {
		if(parent.getQuery().from == query.getQuery().from) {
			return this.getRelationCountQueryForSelfRelation(query, parent);
		}

		return this.getRelationCountQuery(query, parent);
	},

	getRelationCountQueryForSelfRelation: function (query, parent) {
		var hash = this.getRelationCountHash();

		query.select(new Expression('count(*)'));
		query.from(`${query.getModel().getTable()} as ${hash}`);

		var key = this.wrap(this.getQualifiedParentKeyName());

		return query.where(`${hash}.${this.getPlainForeignKey()}`, '=', new Expression(key));
	},

	/**
   * Get a relationship join table hash.
   */
  getRelationCountHash: function () {
  	return `self_${md5(microtime(true))}`;
  },

  addEagerConstraints: function (models) {
  	return this.query.whereIn(this.foreignKey, this.getKeys(models, this.localKey));
  },

  matchOne: function (models, results, relation) {
  	return this.matchOneOrMany(models, results, relation, 'one');
  },

  matchMany: function (models, results, relation) {
  	return this.matchOneOrMany(models, results, relation, 'many');
  },

  matchOneOrMany: function (models, results, relation, type) {
  	var dictionary = this.buildDictionary(results);

  	// Once we have the dictionary we can simply spin through the parent models to
    // link them up with their children using the keyed dictionary to make the
    // matching very convenient and easy work. Then we'll just return them.
    forEach(models, function (model) {
    	var key = model.getAttribute(this.localKey);

    	if(dictionary[key]) {
    		var value = this.getRelationValue(dictionary, key, type);

    		model.setRelation(relation, value);
    	}
    }, this);

    return models;
  },

  getRelationValue: function (dictionary, key, type) {
  	var value = dictionary[key];

  	return type == 'one' ? first(value) : this.related.newCollection(value);
  },

  buildDictionary: function (results) {
  	var dictionary = [];

  	var foreign = this.getPlainForeignKey();

  	// First we will create a dictionary of models keyed by the foreign key of the
    // relationship as this will allow us to quickly access all of the related
    // models without having to do nested looping which will be quite slow.
    forEach(results, function (result) {
    	dictionary[result[foreign]].push(result);
    });

    return dictionary;
  },

	/**
	 * Attach a model instance to the parent model.
	 */
  save: function (model) {
  	model.setAttribute(this.getPlainForeignKey(), this.getParentKey());

  	return model.save() ? model : false;
  },

	/**
	 * Attach a collection of models to the parent instance.
	 */
  saveMany: function (models) {
  	forEach(models, function (model) {
  		this.save(model);
  	}, this);

  	return models;
  },

  /**
   * Find a model by its primary key or return new instance of the related model.
   */
  findOrNew: function (id, columns) {
  	columns = columns || ['*'];

  	var instance = this.find(id, columns);

  	if(isEmpty(instance)) {
  		instance = this.related.newInstance();
  		instance.setAttribute(this.getPlainForeignKey(), this.getParentKey());
  	}

  	return instance;
  },

  firstOrNew: function (attributes) {
  	var instance = this.where(attributes).first();

  	if(isEmpty(instance)) {
  		instance = this.related.newInstance(attributes);
  		instance.setAttribute(this.getPlainForeignKey(), this.getParentKey());
  	}

  	return instance;
  },

  firstOrCreate: function (attributes) {
  	var instance = this.where(attributes).first();

  	if(isEmpty(instance)) {
  		instance = this.create(attributes);
  	}

  	return instance;
  },

  updateOrCreate: function (attributes, values) {
  	values = values || [];

  	var instance = this.firstOrNew(attributes);
  	instance.fill(values);
  	instance.save();

  	return instance;
  },

  create: function (attributes) {
  	// Here we will set the raw attributes to avoid hitting the "fill" method so
    // that we do not have to worry about a mass accessor rules blocking sets
    // on the models. Otherwise, some of these attributes will not get set.
    var instance = this.related.newInstance(attributes);

    instance.setAttribute(this.getPlainForeignKey(), this.getParentKey());
    instance.save();

    return instance;
  },

  createMany: function (records) {
  	var instances = [];

  	forEach(records, function (record) {
  		instances.push(this.create(record));
  	}, this);

  	return instances;
  },

  update: function (attributes) {
  	if(this.related.usesTimestamps()) {
  		attributes[this.relatedUpdatedAt()] = this.related.freshTimestampString();
  	}

  	return this.query.update(attributes);
  },

  getHasCompareKey: function () {
  	return this.getForeignKey();
  },

  getForeignKey: function () {
  	return this.foreignKey;
  },

  getPlainForeignKey: function () {
  	var segments = this.getForeignKey().split('.');

  	return segments[segments.length - 1];
  },

  getParentKey: function () {
  	return this.parent.getAttribute(this.localKey);
  },

  getQualifiedParentKeyName: function () {
  	return `${this.parent.getTable()}.${this.localKey}`;
  }
});

module.exports = HasOneOrMany;
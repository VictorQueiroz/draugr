'use strict';

var _               = require('lodash');
var last            = _.last;
var first           = _.first;
var Builder         = require('./builder');
var extend          = _.extend;
var HasOne          = require('./relations/hasone');
var HasMany         = require('./relations/hasmany');
var isEmpty         = _.isEmpty;
var forEach         = _.forEach;
var isString        = _.isString;
var inherits        = require('./utils/inherits');
var isDefined       = function (value) { return !(_.isUndefined(value)); };
var inflection      = require('inflection');
var isFunction      = _.isFunction;
var isUndefined     = _.isUndefined;
var EventEmitter    = require('events');

/**
 * Determine if a given string starts with a given substring.
 */
function startsWith (haystack, needles) {
  var has = false;

  forEach(needles, function (needle) {
    if(isEmpty(needle) && haystack.indexOf(needle) === 0) {
      has = true;
    }
  });

  return has;
}

function class_basename (fn) {
  fn = fn.constructor || fn;

  return first(fn.toString().match(/^function\s*([A-z0-9]+)/));
}

function ctype_lower(text) {
  if (!isString(text)) {
    return false;
  }
  return text === text.toLowerCase();
}

function snake(value, delimiter) {
  delimiter = delimiter || '_';
  value     = value || '';

  var key = `${value}${delimiter}`;

  if(!ctype_lower(value)) {
    value = value.toLowerCase().replace(/(.)(?=[A-Z])/, `$1${delimiter}`);
    value = value.replace(/\s+/, '');
  }

  return value;
}

/**
 * Uppercase the first character of each word in a string
 */
function ucwords(str) {
  return (str + '')
    .replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function($1) {
      return $1.toUpperCase();
    });
}

/**
 * Convert a value to studly caps case.
 */
function studly (value) {
  value = value || '';

  var key = value;

  value = ucwords(value.replace(/[-_]/g, ' '));

  return value.replace(/\ /g, '');
}

// Extending multiple constructors
// inside the new extended model
inherits(Model, EventEmitter, Builder);

function Model() {
  Builder.apply(this, [this.connection, this.grammar]);

  // Call event emitter constructor on this
	EventEmitter.call(this);

	this.emit('initialized');

  // Auto set the table to the table name of this model
  this.from(this.table);

  if(isFunction(this.initialize)) {
    this.initialize.apply(this, arguments);
  }
}

extend(Model.prototype, {
  table: '',

  /**
   * The primary key for the model.
   */
  primaryKey: 'id',

  /**
   * The number of models to return for pagination.
   */
  perPage: 15,

  /**
   * Indicates if the IDs are auto-incrementing.
   */
  incrementing: true,

  /**
   * Indicates if the model should be timestamped.
   */
  timestamps: true,

  /**
   * The model's attributes.
   */
  attributes: {},

  /**
   * The model attribute's original state.
   */
  original: [],

  /**
   * The loaded relationships for the model.
   */
  relations: [],

  /**
   * The attributes that should be hidden for arrays.
   */
  hidden: [],

  /**
   * The attributes that should be visible in arrays.
   */
  visible: [],

  /**
   * The accessors to append to the model's array form.
   */
  appends: [],

  /**
   * The attributes that are mass assignable.
   */
  fillable: [],

  /**
   * The attributes that aren't mass assignable.
   */
  guarded: ['*'],

  /**
   * The attributes that should be mutated to dates.
   */
  dates: [],

  /**
   * The storage format of the model's date columns.
   */
  dateFormat: '',

  /**
   * The attributes that should be casted to native types.
   */
  casts: [],

  /**
   * The relationships that should be touched on save.
   */
  touches: [],

  /**
   * User exposed observable events.
   */
  observables: [],

  /**
   * The relations to eager load on every query.
   */
  with: [],

  /**
   * The class name to be used in polymorphic relations.
   */
  morphClass: '',

  /**
   * Indicates if the model exists.
   */
  exists: false,

  /**
   * Indicates whether attributes are snake cased on arrays.
   */
  snakeAttributes: true,

  /**
   * The connection resolver instance.
   */
  resolver: '',

  /**
   * The event dispatcher instance.
   */
  dispatcher: '',

  /**
   * The array of booted models.
   */
  booted: [],

  /**
   * The array of global scopes on the model.
   */
  globalScopes: [],

  /**
   * Indicates if all mass assignment is enabled.
   */
  unguarded: false,

  /**
   * The cache of the mutated attributes for each class.
   */
  mutatorCache: [],

  /**
   * The many to many relationship methods.
   */
  manyMethods: ['belongsToMany', 'morphToMany', 'morphedByMany'],

  /**
   * The name of the "created at" column.
   */
  CREATED_AT: 'created_at',

  /**
   * The name of the "updated at" column.
   */
  UPDATED_AT: 'updated_at',
});

extend(Model.prototype, {
  initialize: function (attributes) {
    this.fill(attributes);
  },

	save: function () {
		if(this.exists) {
			this.performUpdate();
		}
	},

	peformUpdate: function () {
		this.emit('updating');
	},

	performInsert: function () {
		this.emit('creating');
	},

  removeTableFromKey: function (key) {
    if(key.indexOf('.') === -1) {
      return key;
    }

    return last(key.split('.'));
  },

  /**
   * Get the attributes that should be converted to dates.
   */
  getDates: function () {
    var defaults = [this.CREATED_AT, this.UPDATED_AT];

    return (this.dates = this.dates.concat(defaults));
  },

  isFillable: function (key) {
    // If the key is in the "fillable" array, we can of course assume that it's
    // a fillable attribute. Otherwise, we will check the guarded array when
    // we need to determine if the attribute is black-listed on the model.
    if(this.fillable.indexOf(key) > -1) {
      return true;
    }

    return isEmpty(this.fillable) && !startsWith(key, '_');
  },

  fill: function (attributes) {
    forEach(attributes, function (value, key) {
      key = this.removeTableFromKey(key);

      // The developers may choose to place some attributes in the "fillable"
      // array, which means only those attributes may be set through mass
      // assignment to the model, and all others will just be ignored.
      if(this.isFillable(key)) {
        this.setAttribute(key, value);
      }
    }, this);

    return this;
  },

  /**
   * Determine whether a value is JSON castable for inbound manipulation.
   */
  isJsonCastable: function (key) {
    if(this.hasCast(key)) {
      return (
        ['array', 'json', 'object', 'collection']
          .indexOf(this.getCastType(key)) > -1
      );
    }

    return false;
  },

  hasCast: function (key) {
    return this.casts.hasOwnProperty(key);
  },

  getCastType: function (key) {
    return this.casts[key].trim().toLowerCase();
  },

  /**
   * Set a given attribute on the model.
   */
  setAttribute: function (key, value) {
    // First we will check for the presence of a mutator for the set operation
    // which simply lets the developers tweak the attribute as it is set on
    // the model, such as "json_encoding" an listing of data for storage.
    if(this.hasSetMutator(key)) {
      var method = `set${studly(key)}Attribute`;

      return this[method](value);
    }

    // If an attribute is listed as a "date", we'll convert it from a DateTime
    // instance into a form proper for storage on the database tables using
    // the connection grammar's date format. We will auto set the values.
    else if (isDefined(this.getDates()[key]) && value) {
      value = this.fromDateTime(value);
    }

    if(this.isJsonCastable(key)) {
      value = JSON.stringify(value);
    }

    this.attributes[key] = value;
  },

  /**
   * Determine if a set mutator exists for an attribute.
   */
  hasSetMutator: function (key) {
    return isFunction(this[`set${studly(key)}Attribute`]);
  },

  /**
   * Extend the Builder `get` method,
   * so we can ensure that we will always
   * get only the rows from the SQL query result
   */
  get: function () {
    return this._parent_.get.apply(this, arguments).then(function (data) {
      return data.rows;
    });
  },

  find: function (id, columns) {
    columns = columns || ['*'];

    if(id) {
      return this.where(this.primaryKey, '=', id).first(columns);
    }

    /**
     * If there is no id defined, list the resource.
     * This way, there's two ways we can use this method
     */
    else {
      return this.get(columns);
    }
  },

  all: function (columns) {
    return this.find(null, columns);
  },

  getTable: function () {
    if(this.table || this._from) {
      return this.table || this._from;
    }

    return snake(inflection.pluralize(class_basename(this))).replace(/\\/, '');
  },

  getClassName: function () {
    var className = class_basename(this) || this.name;

    return className;
  },

  getForeignKey: function () {
    return `${snake(this.getClassName())}_id`;
  },

  getKeyName: function () {
    return this.primaryKey;
  },

  getAttribute: function (key) {
    if(isDefined(this.attributes[key]) || this.hasGetMutator(key)) {
      return this.getAttributeValue(key);
    }

    return this.getRelationValue(key);
  },

  getAttributeValue: function (key) {
    var value = this.getAttributeFromObject(key);

    // If the attribute has a get mutator, we will call that then return what
    // it returns as the value, which is useful for transforming values on
    // retrieval from the model to a form that is more useful for usage.
    if(this.hasGetMutator(key)) {
      return this.mutateAttribute(key, value);
    }

    // If the attribute exists within the cast array, we will convert it to
    // an appropriate native PHP type dependant upon the associated value
    // given with the key in the pair. Dayle made this comment line up.
    if(this.hasCast(key)) {
      value = this.castAttribute(key, value);
    }

    // If the attribute is listed as a date, we will convert it to a DateTime
    // instance on retrieval, which makes it quite convenient to work with
    // date fields without having to create a mutator for each property.
    else if (this.getDates().indexOf(key) > -1) {
      if(!isUndefined(value)) {
        return this.asDateTime(value);
      }
    }

    return value;
  },

  relationLoaded: function (key) {
    return isFunction(this.relations[key]);
  },

  getRelationValue: function (key) {
    // If the key already exists in the relationships array, it just means the
    // relationship has already been loaded, so we'll just return it out of
    // here because there is no need to query within the relations twice.
    if(this.relationLoaded(key)) {
      return this.relations[key];
    }

    // If the "attribute" exists as a method on the model, we will just assume
    // it is a relationship and will load and return results from the query
    // and hydrate the relationship's value on the "relationships" array.
    if(isFunction(this[key])) {
      return this.getRelationshipFromMethod(key);
    }
  },

  getAttributeFromObject: function (key) {
    if(this.attributes[key]) {
      return this.attributes[key];
    }
  },

  getRelationshipFromMethod: function (method) {
    var relations = this[method]();

    if(!(first(relations) instanceof Relation)) {
      throw new Error('Relationship method must return an object of type Relation');
    }

    return this.relations[method] = relations.getResults();
  },

  hasGetMutator: function (key) {
    return isFunction(this[`get${studly(key)}Attribute`]);
  },

  mutateAttribute: function (key, value) {
    return this[`get${studly(key)}Attribute`](value);
  }
});

// Relationships
extend(Model.prototype, {
  /**
  * Define a one-to-one relationship.
  */
  hasOne: function (related, foreignKey, localKey) {
    foreignKey = foreignKey || this.getForeignKey();

    var instance = new related();

    localKey = localKey || this.getKeyName();

    return new HasOne(instance, this, `${instance.getTable()}.${foreignKey}`, localKey);
  },

  /**
   * Define a one-to-many relationship.
   */
  hasMany: function (related, foreignKey, localKey) {
    foreignKey = foreignKey || this.getForeignKey();
    localKey = localKey || this.getKeyName();

    var instance = new related();

    return new HasMany(instance, this, `${instance.getTable()}.${foreignKey}`, localKey);
  }
});

extend(Model, {
  instantiate: function (callback, defineTable) {
    return callback(new this());
  },

  find: function (id, columns) {
    return this.instantiate(function (model) {
      return model.find(id, columns);
    });
  },

  all: function (columns) {
    return this.instantiate(function (model) {
      return model.all(columns);
    });
  },

  /**
   * Being querying a model with eager loading.
   */
  with: function (relations) {
  },

  extend: require('./utils/extend')
});

module.exports = Model;
var _				= require('lodash');
var first		= _.first;
var extend	= _.extend;
var toArray	= _.toArray;
var forEach = _.forEach;

module.exports = function () {
	var args = toArray(arguments);

	var targetCtor = first(args);
	var bullets 		 = args.slice(1);

	forEach(bullets, function (bullet) {
		var proto 					= bullet.prototype;
		var targetCtorProto = targetCtor.prototype;

		targetCtorProto._parent_ = proto;

		extend(targetCtorProto, proto);
	});
};
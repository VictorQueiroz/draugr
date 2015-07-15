# draugr

## Example 1
```js
var sqlbuilder = require('sqlbuilder')({
	host: 'localhost',
	user: 'root',
	password: ''
});

var draugr = require('draugr')(sqlbuilder);
var User = draugr.Model.extend({
	table: 'users',
	name: 'User'
});

User.find(2).then(function (user) {
	res.json(user);
});

User.all().then(function (user) {
	res.json(user);
});
```
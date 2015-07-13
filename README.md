# expressive

## Example 1
```js
var sqlbuilder = require('sqlbuilder')({
	host: 'localhost',
	user: 'root',
	password: ''
});

var expressive = require('expressive')(sqlbuilder);
var User = expressive.Model.extend({
	
});

User.find(2).then(function (user) {
	res.json(user);
});
```
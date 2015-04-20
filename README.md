angular-resource-sails
======================

<a href="https://travis-ci.org/angular-resource-sails/angular-resource-sails">
	<img src="https://travis-ci.org/angular-resource-sails/angular-resource-sails.svg" title="Build Status Images"/>
</a>

Sails.js is a realtime MVC framework built for NodeJS.
Angular is a front end framework for building client side web applications. One of Angular's features is ngResource,
a small service that allows developers to create objects on the client that can be saved and deleted as if they were on the server.
It's a fantastic abstraction that eliminates the usual plumping code of making a change on the client, doing an HTTP call, and handling the response.
However, it only works with the Angular $http service, which does not operate using socket.io as Sails.js does.

angular-resource-sails bridges this gap by allowing you to create service objects that behave like those
from ngResource but do all of their updating through Sails.js socket.io connections. It also sets up the
binding necessary for realtime updates to affect the client.

Install
=====================
Add 'angular-resource-sails' to your bower.json file and the following to your page head:
```html
<script src="/bower_components/sails.io.js/dist/sails.io.js"></script>
<script src="/bower_components/angular-resource-sails/src/sailsResource.js"></script>
```

Then, in your Angular application dependencies include 'sailsResource' as one of them.

```js
angular.module('myApp', ['sailsResource']);
```


Usage
======================

###Create model instance
```js
var Item = sailsResource('item');
var newItem = new Item();
newItem.data = 'abc';
newItem.$save(); // POST /item (if the item does not have an id)
```

###Get a listing of model instances
```js
var items = sailsResource('item').query(); // GET /item
```

###Get a single model instance
```js
var item = sailsResource('item').get({ id: 53 }); // GET /item/53
```

###Update a model instance
```js
var item = sailsResource('item').get({ id: 53 });
item.data = 'def';
item.$save(); // PUT /item/53 (if the item has an id)
```

###Delete a model instance
```js
var item = sailsResource('item').get({ id: 53 });
item.$delete(); // DELETE /item/53
```

###Success and error callbacks
Works like ngResource - can optionally provide callbacks
```js
var item = sailsResource('item').get({ id: 'notreal' }, 
  function(response) { // first function is success handler
    // Handle success
  },
  function(response) { // second function is error handler
    // Handle error
  });
```

Callbacks also available for actions without parameters.
```js
item.$save(
	function(item) {
		// Handle success
	},
	function(error) {
		// Handle error
	});
```

###Customize actions
Default actions are get, query, save, and remove. You can override these or add your own.
```js
var service = sailsResource('item',
	{
		// create a custom PUT
		'update' { method: 'PUT' }, // Resources will have $update function
		// attach a transformResponse function
		// overrides default query function
		'query': { method: 'GET', isArray: true, function transformResponse(response) {
			// runs after response returns
			return someCustomLogicToRun(response);
		}},
		// attach a transformRequest function
		// overrides default $save function
		'save': { method: 'POST', function transformRequest(request) {
			// runs before request is made
			return JSON.stringify(someCustomLogicToRun(request));
		}}
	}
};
```

###Options
We've included a few useful options you can enable on any sailsResource.
```js
var service = sailsResource('item', {}, {
		verbose: true, // sailsResource will log messages to console
		prefix: 'myapi', // apply a prefix to all routes
		socket: socketInstance // provide your own socket instance,
		origin: 'http://notlocalhost.com' // change the socket origin
	}
};
```
You can also change these globally by editing the provider's configuration.
```js
angular.module('myapp').config(function (sailsResourceProvider) {
	sailsResourceProvider.configuration = {
		prefix = 'api',
		verbose: true
	};
});
```

Realtime updates
===============================

All angular-resource-sails instances will be subscribed to socket.io updates. If the client receives a create, update, or
delete message from the server every instance already created will automatically update as needed.

Additionally, angular-resource-sails will $broadcast a $sailsResourceCreated, $sailsResourceUpdated, and
$sailsResourceDestroyed messages when those socket messages are received. You can respond in a customized way by
subscribing to those events.
```js
$rootScope.$on('$sailsResourceUpdated', function(event, message) {
	if(message.model == 'user') {
		// some logic for user update messages
	}
});
```

Development
===============================
1. `bower install`

### Run Tests
1. Open SpecRunner.html

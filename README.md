angular-resource-sails
======================

Sails.js is a realtime MVC framework built for NodeJS. Angular is a front end framework for building client side web applications. One of Angular's features is ngResource, a small service that allows developers to create objects on the client that can be saved and deleted as if they were on the server. It's a fantastic abstraction that eliminates the usual plumping code of making a change on the client, doing an HTTP call, and handling the response. However, it only works with the Angular $http service, which does not operate using socket.io as Sails.js does.

angular-resource-sails bridges this gap by allowing you to create service objects that behave like those from ngResource but do all of their updating through Sails.js socket.io connections. It also sets up the binding necessary for realtime updates to affect the client. 

Install
=====================
Include 'angular-resource-sails' in your bower.json file. At this time we recommend getting the latest version. Alternatively, include the sailsResource.js file in your project.

Then, in your Angular application dependencies include 'sailsResource' as one of them.

```
angular.module('myApp', ['sailsResource']);
```


Usage
======================

###Create model instance
```
var Item = sailsResource('item');
var newItem = new Item();
newItem.data = 'abc';
newItem.$save(); // POST /item (if the item does not have an id)
```

###Get a listing of model instances
```
var items = sailsResource('item').query(); // GET /item
```

###Get a single model instance
```
var item = sailsResource('item').get({ id: 53 }); // GET /item/53
```

###Update a model instance
```
var item = sailsResource('item').get({ id: 53 });
item.data = 'def';
item.$save(); // PUT /item/53 (if the item has an id)
```

###Delete a model instance
```
var item = sailsResource('item').get({ id: 53 });
item.$delete(); // DELETE /item/53
```

###Success and error callbacks
Works like ngResource - can optionally provide callbacks
```
var item = sailsResource('item').get({ id: 'notreal' }, 
  function(response) { // first function is success handler
    // Handle success
  },
  function(response) { // second function is error handler
    // Handle error
  });
```

###Customize actions
Works like ngResource
```
var service = sailsResource('item',
	{
		// create a custom PUT
		'update' { method: 'PUT' }, // Resources will have $update method
		// attach a transformResponse method
		'query': { method: 'GET', isArray: true, transformResponse(response) { // overrides default query method
			return someCustomLogicToRun(response);
		}}
	}
};
// More customizations to come!
```

Realtime updates
===============================

All angular-resource-sails instances will be subscribed to socket.io updates. If the client recieves a create, update, or delete message from the server every instance already created will automatically update as needed.

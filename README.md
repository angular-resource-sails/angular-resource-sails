angular-resource-sails
======================
Angular service for managing Sails socket.io connections in a ngResource like way.

Usage
======================

Create model instance
----------------------

var Item = sailsResource("item");
var newItem = new Item();
newItem.data = "abc";
newItem.$save(); // POST /item (if the item does not have an id)

Get a listing of model instances
----------------------

var items = sailsResource("item").query(); // GET /item

Get a single model instance
----------------------

var item = sailsResource("item").get(53); // GET /item/53

Update a model instance
 ----------------------

item.data = "def";
item.$save(); // PUT /item/53 (if the item has an id)

Delete a model instance
----------------------

item.$delete(); // DELETE /item/53

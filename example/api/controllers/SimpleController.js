/**
 * SimpleController
 *
 * @description :: Server-side logic for managing simples
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	count: function(req, res) {
		Simple.count().exec(function(error, count) {
			if(error) return res.serverError();
			res.ok({count: count});
		});
	}
};
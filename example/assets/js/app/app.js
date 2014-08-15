window.app = angular.module('example', ['sailsResource', 'ui.router'])
  .config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('home', {
        url: '/',
        templateUrl: 'js/app/home/home.html',
        controller: 'HomeController as home'
      });
  });
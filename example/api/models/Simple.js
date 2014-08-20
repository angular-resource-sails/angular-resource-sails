/**
 * Simple.js
 *
 * @description :: Check all the types
 * @docs        :: http://sailsjs.org/#/documentation/concepts/ORM
 */

module.exports = {

  attributes: {
    email: 'string',
    isAwesome: 'boolean',
    manyThings: 'array',
    oneTwoOrThree: {
      type: 'string',
      enum: ['one', 'two', 'three']
    },
    perfectDate: 'datetTime',
    age: 'int',
    answerToEverything: 'float'
  }
};


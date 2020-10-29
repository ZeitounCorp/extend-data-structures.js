const RegisterChangesIO = require('../../Utils/events');

/**
 *  SearchableArray constructor
 *
 * @constructor
 * @param {Array} arr - initial array
 * @typedef {{content_type: string, length: number, ordered: boolean, two_d: boolean}} ObjectSettings
 * @param {ObjectSettings} [stts] - settings to be passed. If stts passed is not typeof 'object', then it will be ignored
 */

function SearchableArray(arr, stts) {
  this.stts = typeof stts === 'object' ? stts : {
    content_type: '',
    length: arr.length,
    ordered: false,
    two_d: false
  };
  this.arr = arr;
  this.queued_actions = [];
  this.actions_history = [];

  if (!stts || typeof stts !== 'object') {
    this.content_type(arr);
    isTwoDee(this.arr, this);
  }
}

/**
 * Get Array content's type
 *
 * @param {Array} [arr] - not required
 * @return {String} 8 possibilites => 'number', 'string', 'function', 'boolean', 'bigint', 'symbol', 'object', 'mixed'
 */

SearchableArray.prototype.content_type = function (arr) {
  let curr_arr = arr || this.arr;
  let type = this.stts.content_type || '';
  // All possible typeof returns
  const possible_types = ['number', 'string', 'function', 'boolean', 'bigint', 'symbol', 'object', 'undefined'];

  // Check if curr_arr contains only one type data
  possible_types.forEach((opt) => {
    if (curr_arr.every((el) => typeof el === opt)) {
      type = opt;
    }
  });

  // Attribute 'mixed' value if there is multiple types of data
  type = type === '' ? 'mixed' : type;
  this.stts.content_type = type;

  RegisterChangesIO.emit('action_occured_array', this, 'Request array\'s content type');

  return type
}

/**
 * Get Array content's at index i or at each index contains in an array
 *
 * @param {(Number|Array)}  index
 * @param {Boolean}  [value_only] - set it to false if you want a detailed array of value returned
 * @throws {Error} - if the array has more than one dimension
 * @return {(Object|Array|Number|String)} - item at array[index] or an array of the items found 
 */

SearchableArray.prototype.get_content_at_index = function (index, value_only = true) {

  if (!index) {
    throw_err('You didn\'t provide an index nor an array of indexes');
  } else if (value_only && typeof value_only !== 'boolean') {
    throw_err('value_only must be of type boolean');
  } else if (this.stts.two_d === true) {
    throw_err('This method is only applicable to one dimensional array');
  }

  const type_of_index = Array.isArray(index) ? 'array' : typeof index === 'number' ? 'number' : 'NaN';

  if (type_of_index !== 'NaN') {
    RegisterChangesIO.emit('action_occured_array', this, 'Request content at index: success');
  } else {
    RegisterChangesIO.emit('action_occured_array', this, 'Request content at index: fail');
  }

  switch (type_of_index) {
    case 'number':
      if (index >= this.arr.length) {
        throw_err('The index you provided is out of boundaries');
      }
      return value_only ? this.arr[index] : { value: this.arr[index], type: typeof this.arr[index] }
    case 'array':
      if (index.some((i) => i >= this.arr.length)) {
        throw_err('One or more indexes provided are out of boundaries');
      }
      const items_retrieved = [];
      index.forEach((i) => items_retrieved.push({ value: this.arr[i], type: typeof this.arr[i], index: i }));
      return value_only ? items_retrieved.map((item) => item.value) : { items_retrieved: items_retrieved, total: index.length }
    case 'NaN':
      throw_err('The parameter\'s you provided isn\'t of type Array nor Number');
  }
}

/**
* Split Arrays' content in subsets arrays named after their content's type.
*
* @throws {Error} - if the array has more than one dimension or if array's content type is not 'mixed'
* @return {Object} - return an object made of arrays, their key is based on their content type (egc: number || object || function || string)
*/

SearchableArray.prototype.split_mixed_content = function() {

  if (this.stts.content_type !== 'mixed') {
    RegisterChangesIO.emit('action_occured_array', this, 'Request to split mixed array content: fail');
    throw_err('This function cannot be applied on an array whose content is not of type mixed');
  } else if (this.stts.two_d === true) {
    RegisterChangesIO.emit('action_occured_array', this, 'Request to split mixed array content: fail');
    throw_err('This method is only applicable to one dimensional array');
  }

  const keys = [];
  const returnable = {};

  for (let i = 0; i < this.arr.length; i++) {
    const type_of_el = typeof this.arr[i];
    if(keys.includes(type_of_el)) {
      returnable[type_of_el].push(this.arr[i]);
    } else {
      keys.push(type_of_el);
      Object.defineProperty(returnable, type_of_el, {
        value: [],
        enumerable: true,
        writable: false
      });
      returnable[type_of_el].push(this.arr[i]);
    }
  }

  RegisterChangesIO.emit('action_occured_array', this, 'Request to split mixed array content: success');

  return returnable;

}

/**
  * Check if this.arr is a two dimensional array
  *
  * @param {Array} arr
  * @param {SearchableArray} it
  */

function isTwoDee(arr, it) {
  if(arr.every((el) => Array.isArray(el))) {
    it.stts.two_d = true;
  } else {
    it.stts.two_d = false;
  }
}

/**
  * Handle errors.
  *
  * @param {String} err
  */

function throw_err(err) {
  throw new Error(err);
}


module.exports = SearchableArray;

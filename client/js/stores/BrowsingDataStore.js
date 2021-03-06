/*
 * Copyright (c) 2015, Tom Lodge
 * All rights reserved.
 *
 * BrowsingDataStore
 */

var AppDispatcher = require('../dispatcher/AppDispatcher');
var EventEmitter = require('events').EventEmitter;
var Constants = require('../constants/Constants');
var Utils = require('../utils/Utils');
var assign = require('object-assign');
var d3 = require('../lib/d3.min');
var WebAPIUtils = require('../utils/WebAPIUtils');
var DevicesStore = require('./DevicesStore');

//var extend = require('extend');

var CHANGE_EVENT = 'change';
var ActionTypes = Constants.ActionTypes;
var _data, _urlhistory, _currenturl, _browsingdata;
var _selectedlocation = {};


// Browsing data is the data that has been selected, _data is the full unzoomed dataset

var overlaylocations = false;

var _toggle_url = function(url){
	if (url === _currenturl){
		_currenturl = "";
		_data.urlhistory = undefined;
		_browsingdata.urlhistory = undefined;
		_urlhistory = undefined;
	}else{
		_currenturl = url;
	}	
};


var _toggle_locations = function(){
	if (!overlaylocations){
		var devices = DevicesStore.selected();
		WebAPIUtils.fetch_locations(devices);
	}else{
		_data.locations = [];
		_browsingdata.locations = [];
		//_data.range =  d3.extent(_data.keys, function(d){return d*1000});
	}
	overlaylocations = !overlaylocations;
};

var _update_filtered_data = function(range){
 	_browsingdata.range = range;
};

var _update_location_data = function(data){
  
  if (!data.locations || data.locations.length <= 0){
  	overlaylocations = false;
  	return;
  }
  
  _data.locations = data.locations;	
  _browsingdata.locations = data.locations;
  
  _data.range = data.locations.reduce(function(acc, obj){
  	if (acc[0] > obj.exit*1000 || acc[0]==0){
  		acc[0] = obj.exit*1000;
  	}
  	if (acc[1] < obj.enter*1000){
  		acc[1] = obj.enter*1000;
  	}	
  	return acc;
   },_data.range);
};

var _update_selected_location = function(lat, lng){
	_selectedlocation = {lat:parseFloat(lat), lng:parseFloat(lng)};
};

var _update_raw_url_history_data = function(data){
  _urlhistory  = data.timestamps;
  _data.urlhistory = _urlhistory;
  _browsingdata.urlhistory = _urlhistory;
};

var _update_zoom_data = function(data){
	_browsingdata = data;
	_browsingdata.locations = _data.locations;
	_browsingdata.urlhistory = _data.urlhistory;
	_data.reset = false;
};

var _update_data = function(data){
	
  	_browsingdata = data;
  	_data = _format_data(data.browsing);
  	_data.reset = true;
};

_format_data = function(data){

  var keys = Utils.binkeys(data.bin, data.timerange.from, data.timerange.to);

  var _bins = data.binned.reduce(function(acc, item){
      acc[item.host] =  acc[item.host]  || {};
      acc[item.host][item.bin] = item.total;
      return acc;
  },{});

  var hosts = Object.keys(_bins);
	
  //create browsing as:
  //[{name:hostname, values:[{date:javascriptts, y:number},..], name:hostname2, values:[{date:javascriptts, y:number}]];

  var browsing = hosts.map(function(host){
    return {
      name:host,
      //do a data.keys map here and give 0 if no sorresponding entry in data.hosts!
      values: keys.map(function(d){
          //console.log("looking up key " + (d) + " for host " + host);
          return {
            date: d*1000,
            y: _bins[host][d] ? +(_bins[host][d]) : 0
          }
      })
    }
  });


  var obj = {
      keys: keys,
      hosts: hosts,
      browsing: browsing,
      range:  d3.extent(keys, function(d){return d*1000}),
  }
  if (_urlhistory){
  	obj.urlhistory = _urlhistory;
  }
  return obj;
};

var BrowsingDataStore = assign({}, EventEmitter.prototype, {
  
  data: function(){
    return _data || {};
  },

  zoomdata: function(){
  	return _browsingdata || {};
  },
  
  location: function(){
  	return _selectedlocation;
  },
  
  locationoverlay: function(){
  	return overlaylocations;
  },
  
  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  }
});

// Register callback to handle all updates
BrowsingDataStore.dispatchToken = AppDispatcher.register(function(action) {

  var action = action.action;
  
  switch(action.type) {

  	case ActionTypes.RAW_BROWSING_DATA:
      _update_data(action.rawData);   
      BrowsingDataStore.emitChange();
      break;
      
    case ActionTypes.RAW_ZOOM_DATA:
      _update_zoom_data(action.rawData);
      BrowsingDataStore.emitChange();
	  break;
    
    case ActionTypes.RANGE_CHANGE:
      _update_filtered_data(action.range);
      BrowsingDataStore.emitChange();
      break;

	case ActionTypes.URL_CLICKED:
      _toggle_url(action.url);
      BrowsingDataStore.emitChange();
      break;
      
    case ActionTypes.RAW_URL_HISTORY_DATA:
      _update_raw_url_history_data(action.rawData);
      BrowsingDataStore.emitChange();
      break;	   	
	
	case ActionTypes.RAW_LOCATION_DATA:
      _update_location_data(action.rawData);
      BrowsingDataStore.emitChange();
      break;
    
    case ActionTypes.LOCATION_HIGHLIGHTED:
      _update_selected_location(action.lat, action.lng);
      BrowsingDataStore.emitChange();	
      break;
      
    case ActionTypes.TOGGLE_LOCATIONS:
      _toggle_locations();
      BrowsingDataStore.emitChange();
      break;
    	 
    default:
      // no op
  }
});

module.exports = BrowsingDataStore;

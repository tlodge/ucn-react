var AppDispatcher = require('../dispatcher/AppDispatcher');
var Constants = require('../constants/Constants');
var ActionTypes = Constants.ActionTypes;

module.exports = {


  nodeselected: function(node){
    AppDispatcher.handleViewAction({
      type: ActionTypes.CATEGORY_NODE_SELECTED,
      node: node,
    });
  },
  
  urlselected: function(url){
  	 AppDispatcher.handleViewAction({
      type: ActionTypes.CATEGORY_URL_SELECTED,
      url: url,
    });
  },
  
   categoryselected: function(category){
    AppDispatcher.handleViewAction({
      type: ActionTypes.CATEGORY_SELECTED,
      category: category,
    });
  },
  
  categorise: function(obj){
  	console.log("ok would categorise");
  	console.log(obj);
  },

};

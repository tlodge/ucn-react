var React = require('react');
var fn = require('../utils/fn');
var ChartFactory = require('../utils/ChartFactory');

var Chart = React.createClass({

  propTypes:{
    type: React.PropTypes.string.isRequired,
    options: React.PropTypes.object
  },

  componentDidMount: function(){
    this._chart = new ChartFactory(
      this.props.type,
      this.props.data,
      this.getDOMNode(),
      this.props.options
    );
  },



  componentDidUpdate: function(){
      this._chart.update(this.props.data);
  },

  componentWillUnmount: function(){
      //this._chart.remove();
  },

  render: function(){
   return (
    <div className={'chart ' + fn.dasherize(this.props.type)}></div>
   );
  },

  _handleClick: function(){
    ActionCreators.clicked();
  },

});

module.exports = Chart;

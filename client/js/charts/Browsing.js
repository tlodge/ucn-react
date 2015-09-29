var d3 = require('../lib/d3.min');
var d3tip = require('../lib/d3.tip')(d3);
var fn = require('../utils/fn');
var ActionCreators = require('../actions/ActionCreators');
var Colours = require('../utils/Colours');

var ANIMATION_DURATION = 2000;

Browsing = function(){
};

Browsing.prototype.initialise = function(data, node, opts){
 
  var start = Date.now();
  var self = this;
  this.opts = opts;
 
  this.x  = d3.time.scale().range([0,opts.width]);
  this.y  = d3.scale.linear().range([opts.height,0]);

  this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
  this.yAxis = d3.svg.axis().scale(this.y).orient("left");

  this.brush = d3.svg.brush()
                  .x(this.x)
                  .on("brushend", function(){
                      var xrange = this.brush.empty() ? this.x.domain() : this.brush.extent();
                      ActionCreators.rangechange(xrange);
                      this.brush.extent([0,0]);
                      this.svg.select(".brush")
                              .select("rect.extent")
                              .attr("width",0);


                  }.bind(this))
                  .on("brush", function(){
                      console.log("brush end");
                  });


  this.colour = function(host){
  	
     return Colours.colourFor(host);
  };

  this.stack = d3.layout.stack()
                 .offset("zero")
                 .values(function(d) {return d.values;})
                 .x(function(d){return self.x(d.date);})
                 .y(function(d){return d.y;});

  this.area = d3.svg.area()
                .interpolate("basis")
                .x(function(d) {return self.x(d.date);})
                .y0(function(d) {return self.y(d.y0);})
                .y1(function(d) {return self.y(d.y0 + d.y);}),

  this.svg = d3.select(node).append('svg')
              .attr('width', opts.width + opts.margin.left + opts.margin.right)
              .attr('height', opts.height + opts.margin.top + opts.margin.bottom)
              .append('g')
              .attr('transform', 'translate(' + opts.margin.left + ',' + opts.margin.top + ')');

  //mask to prevent areas goind past lhs yscale, clipath is defined in style.

  this.svg.append("defs").append("clipPath")
                .attr("id", "clip")
                .append("rect")
                .attr("width", opts.width)
                .attr("height", opts.height);

  
         
  this.svg.append("g")
          .attr("class", "chart");

  this.svg.append("g")
              .attr("class", "x brush")
              .call(self.brush)
              .selectAll("rect")
              .attr("y", -6)
              .attr("height", opts.height + 7);

  this.svg.append("g")
             .attr("class", "x axis")
             .attr("transform", "translate(0," + opts.height + ")")
             .call(this.xAxis);

  this.svg.append("g")
             .attr("class", "y axis")
             .call(this.yAxis);

  //placeholders for overlays..
  this.svg.append("g")
         .attr("class","historyoverlay");

   this.svg.append("g")
         .attr("class","locationoverlay");
};

Browsing.prototype.update = function(data){
		
    var self = this;
    //guard against empty data;
    if (!data || !data.browsing){
      console.log("no data yet..");
      return;
    }

    var browsers = this.stack(data.browsing);

    this.x.domain(data.range);
		
    this.y.domain([0, d3.max(browsers, function(c){
        return d3.max(c.values.filter(function(item){return item.date >= data.range[0] && item.date <= data.range[1];}), function(d) {return d.y0 +d.y;});
    })]);

    //update the scales
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);

    var chart = this.svg.selectAll("g.chart");

    //need to add exit!
    var browser = chart.selectAll("g.browser")
                       .data(browsers, function(d){return d.name;});
    //enter
    browser.enter()
           .append("g")
           .attr("class", "browser")
           .append("path")
           .attr("class", "area")
           .style("fill", function(d){return self.colour(d.name);})
           .style("fill-opacity", 0.8)
           .style("stroke", function(d){return self.colour(d.name);})
           .style("stroke-opacity", 1.0)

	
    //update
    browser.selectAll("path.area")
          //.transition()
          //.duration(ANIMATION_DURATION)
          .attr("d", function(d) {return self.area(d.values);});

    //update axes

    this.svg.select(".x.axis")
            //.transition()
            //.duration(ANIMATION_DURATION)
            .call(this.xAxis);

    this.svg.select(".y.axis")
            //.transition()
            //.duration(ANIMATION_DURATION)
            .call(this.yAxis);
    //exit
    browser
          .exit()
          .remove();
    
    //handle overlays!
          
	if (data.urlhistory){
      this.urlhistory(data.urlhistory);
	}
	if (data.locations){
	  console.log("RENDERING LOACTIONS!!");
	  this.locations(data.locations);
	}    
};

Browsing.prototype.locations = function(locations){
 	
 	var overlay = this.svg.select("g.locationoverlay");
	var height = this.opts.height;
	
	var zones = overlay.selectAll("rect")
					   .data(locations, function(d){return d.enter + ""+ d.exit});
	//enter			   					   						    
	zones.enter()
		 .append("rect")	
		 .style("fill", function(d,i,j){return this.colour(d.name)}.bind(this))	
		 .style("fill-opacity", function(d){return 0.5})	
		 .style("stroke", "none")
		 
		 .on('mouseover', function(d){
		 		console.log("ok am showing the location tip now!!!");
		 		console.log(d);
		 		this.locationtip.show(d)}.bind(this)
		 )
		 .on('mouseout', this.locationtip.hide);
	
	//update
	zones
		.attr("x", function(d){return this.x(d.enter*1000)}.bind(this))
		 .attr("y", 0)
		 .attr("width" , function(d){return this.x(d.exit*1000) - this.x(d.enter*1000)}.bind(this))
		 .attr("height", height)
		 .call(this.locationtip)	
						    
	//exit
	zones.exit().remove();		
};

Browsing.prototype.locationtip = d3tip().attr('class', 'd3-tip')
										.offset([-10,0])
										.html(function(d){
											console.log(d);
											console.log("setting d name " + d['name']);
											return "<strong>" + d['name'] + "</strong>";
										});


Browsing.prototype.urlhistory = function(data){

    var overlay = this.svg.select("g.historyoverlay");

    var timestamps = overlay.selectAll("line.ts")
                            .data(data, function(d){return d;});
    //enter
    timestamps
          .enter()
          .append("line")
          .attr("class", "ts")
          .style("stroke", function(d){return "#000000";})
          .style("stroke-opacity", 0.4);

   //update and new
   this.svg.selectAll("line.ts")
          .attr("y1", 0)
          .attr("x1", function(d){return this.x(d*1000);}.bind(this))
          .attr("y2", this.opts.height)
          .attr("x2", function(d){return this.x(d*1000);}.bind(this));


    timestamps.exit()
           .remove();
};

Browsing.prototype._addListeners = function(){

};

Browsing.prototype._removeListeners = function(){

};

_onMouseOver = function(options){

};

_onMouseOut = function(){

};

module.exports = Browsing;

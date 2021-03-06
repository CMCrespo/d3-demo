// created by Carlos Crespo 2018 for D3 Lab

(function(){
    
//pseudo-global variable
var attrArray = ["Coal", "Natural Gas", "Petroleum", "Nuclear Electric", "Hydro Electric", "Wind", "Fuel Ethanol"]; 

var expressed = attrArray[0]; //initial attribute     

//chart frame dimensions
var chartWidth = window.innerWidth * 0.425,
    chartHeight = 473,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create quantity for the different attributes
var mst = "Million Short Tons";
var mb = "Million Barrels";
var bcf = "Billion Cubic Feet";
var bk = "Billion Kilowatthours";

    
//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([463, 0])
    .domain([0, 100]);    
    
// begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    
    //map frame dimension
    var width = window.innerWidth * 0.5,
        height = 460;
    
    //create new svg container for map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height)
        //add zoom and pan functionality to map
//        .call(d3.zoom().on("zoom", function () {
//            map.attr("transform", d3.event.transform)
//        }));
        
    
    //create Albers equal area conic projection centered on US
    var projection = d3.geoAlbersUsa()
        .scale(850)
        .translate([width / 2, height / 2]);
    
    //create path generator
    var path = d3.geoPath()
        .projection(projection);
    
    //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/energy.csv") //load attributes fm csv
        .defer(d3.json, "data/USmap.topojson") //load choropleth spatial data
        .await(callback);
    
    function callback(error, csvData, states){
        //translate states TopoJSON
        var usStates = topojson.feature(states, states.objects.US_map).features;
        
        //examine results
        console.log(error);
        console.log(csvData);
        console.log(states);
              
        //join csv data to GeoJSON enumeration units
        usStates = joinData(usStates, csvData);
        
        var colorScale = makeColorScale(csvData);
                
        //add enumeration units to the map
        setEnumerationUnits(usStates, map, path, colorScale);
        
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
        
        //add dropdown
        createDropdown(csvData);
        
    };
};

function joinData(usStates, csvData){
     
    //loop through csv to assign each set of attr values to geojson region
    for (var i = 0; i < csvData.length; i++){
        var csvState = csvData[i]; //current region
        var csvKey = csvState.adm1_code; //CSV primary key
            
    //loop through geojson regions to find correct state
        for (var a = 0; a < usStates.length; a++){
            var geojsonProps = usStates[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.adm1_code; // the geojson primary key
                
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                    
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvState[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return usStates;
};

function setEnumerationUnits(usStates, map, path, colorScale){
        
    var states = map.selectAll(".states")
        .data(usStates)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "states " + d.properties.adm1_code;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        .on("mouseover", function(d){
            highlight(d.properties);    
        })
        .on("mouseout", function(d){
            dehighlight(d.properties)
        })
        .on("mousemove", moveLabel);
    
    var desc = states.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');
                
};
    
function makeColorScale(data){
    var colorClasses = [
        "#ffffcc",
        "#c2e699",
        "#78c679",
        "#31a354",
        "#006837"
    ];
    
    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);
    
    //build arra of all values of the expressed attribute
    var domainArray = [];
    for (var i = 0 ; i < data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };
    
    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    
    //remove first value from domain array to create class breakpoints
    domainArray.shift();
    
    //assign array of last 4 clusters minimum as domain
    colorScale.domain(domainArray);
    
    return colorScale;
};    

//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == "number" && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#ccc";
    };
};    

//function to create a coordinated bar chart
function setChart(csvData, colorScale){
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    
    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //set bars for each state
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.adm1_code;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
    
    //add style descriptor
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}')
    
        .attr("x", function (d, i) {
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function (d, i) {
            return 463-yScale(parseFloat(d[expressed]));
        })
        .attr("y", function (d, i) {
            return yScale(parseFloat(d[expressed])) ;
        })
        .style("fill", function (d) {
            return choropleth(d, colorScale);
        });
        
    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 60)
        .attr("y", 40)
        .attr("class", "chartTitle")
    //    .text(expressed + " Consumption per State");
    
    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale)
        .tickFormat(d3.format("s"));
    
    d3.selectAll("g.axis")
        .call(yAxis);
    
    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);
    
    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //set bar position, heights, and colors
    updateChart(bars, csvData.length, colorScale);
};

//function to create a dropdown menu for attribute selection 
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });
    
    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Energy Source");
    
    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};
    
//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    
    // Retrieve the max value for the selected attribute
    var max = d3.max(csvData,function(d){
        return + parseFloat(d[expressed])
    });
           
        // yScale is a global variable - just set the domain to 0 and the max value you found. Adjust if needed.
   
        if (expressed == attrArray[1]){
         yScale = d3.scaleLinear()
            .range([463,0])    
            .domain([0,max + 50]);  
        } else if (expressed == attrArray[2]){  
            yScale = d3.scaleLinear()
                .range([463,0]) 
                .domain([0,max + 50]);
        } else if (expressed == attrArray[3]){  
            yScale = d3.scaleLinear()
                .range([463,0]) 
                .domain([0,max + 10]);
        } else if (expressed == attrArray[4]){  
            yScale = d3.scaleLinear()
                .range([463,0]) 
                .domain([0,max + 5]);
        } else if (expressed == attrArray[5]){  
            yScale = d3.scaleLinear()
                .range([463,0]) 
                .domain([0,max + 10]);
        }  else {    
            yScale = d3.scaleLinear()
                .range([463,0]) 
                .domain([0,Math.ceil(max)]);            
        }
    
    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    
    //recolor enumeration units
    var states = d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() // add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);
    
    
    
    updateChart(bars, csvData.length, colorScale);
};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
        return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    
    //var chartTitle = d3.select(".chartTitle")
    //    .text(expressed + " Consumption per State");
    
    //add units of measure
    if (expressed == attrArray[0]){
        var chartTitle = d3.select(".chartTitle")
        .text(expressed + " Consumption measured in " + mst);
    } else if (expressed == attrArray[1]) {
        var chartTitle = d3.select(".chartTitle")
        .text(expressed + " Consumption measured in " + bcf);
    } else if (expressed == attrArray[2],[6]) {
        var chartTitle = d3.select(".chartTitle")
        .text(expressed + " Consumption measured in " + mb);
    } else if (expressed == attrArray[3,4,5]) {
        var chartTitle = d3.select(".chartTitle")
        .text(expressed + " Consumption measured in " + bk);
    };
        
        
    //update the chart axis
    var yAxis = d3.axisLeft()
        .scale(yScale)
    
    d3.selectAll("g.axis")
        .call(yAxis);
    
};
 
//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.adm1_code)
        .style("fill-opacity", "0.6")
        .style("stroke", "red")
        .style("stroke-width", "3");
    
    setLabel(props);
};

//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.adm1_code)
        .style("fill-opacity", function(){
            return getStyle(this, "fill-opacity")
        })
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();
        
        var styleObject = JSON.parse(styleText);
        
        return styleObject[styleName];
    };
    
    //remove info label
    d3.select(".infolabel")
        .remove();
    
};
    
//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";
    
    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.adm1_code + "_label")
        .html(labelAttribute);
    
    var stateName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};
    
//function to move info label w/mouse
function moveLabel(){
    
    //get width of label
    var labelWidth = d3.select(".infolabel");
    
    //use coordinates of mousemove event to set label coordintes
    var x1 = d3.event.clientX - 65,
        y1 = d3.event.clientY + 40,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 15;
    
    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, tensting for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;
    
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
    
};
    
})();
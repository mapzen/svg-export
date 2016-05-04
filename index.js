var layers = [
    { layer: 'boundaries',
      display: false,
      types: []} ,
    { layer: 'buildings',
      display: false,
      types: []} ,
    { layer: 'earth',
      display: false,
      types: []} ,
    { layer: 'landuse',
      display: false,
      types: []} ,
    { layer: 'places',
      display: false,
      types: []} ,
    { layer: 'pois',
      display: false,
      types: []} ,
    { layer: 'roads',
      display: true,
      types: []} ,
    { layer: 'transit',
      display: false,
      types: []} ,
    { layer: 'water',
      display: true,
      types: []}
    ];

//default origin of the map
var origin = [-118.2437, 34.0522, 13];
if (window.location.hash) {
  origin = window.location.hash.slice(1)
    .split("/").map(function(n){ return Number(n); });
}

//initialize the control panel from the 'layers' data object
function createControls () {
  var layerToggle = d3.select(".layer-toggle").selectAll(".layer-name").data(layers);
    entering = layerToggle.enter().append("li").attr("class","layer-name");
    entering.append("input").attr("type","checkbox");
    entering.append("span").text(function(d){ return d.layer; });
    entering.append("span").attr("class","toggle btn btn-transparent").text("toggle all");

    layerToggle.select(".toggle")
      .style("display",function(d){ return (d.display && d.types.length) ? "block" : "none"; })
      .on("click",function(d){
        var display = d.types[0].display;
        d.types.forEach(function(t){
          t.display = !display;
        });
        createControls();
        d3.selectAll(".tile").each(renderTiles);
      });
    
    layerToggle.select("input")
      .property("checked",function(d){ return d.display; })
      .on("change",function(d){
        d.display = this.checked;
        d.types = [];
        createControls();
        d3.selectAll(".tile").each(renderTiles);
        setTimeout(sortFeatures, 1500);
      });

    var types = layerToggle.selectAll(".type")
      .data(function(d){ 
        if (!d.display) return [];
        return d.types.filter(function(e){ return e.visible; }); 
      });
    var enterTypes = types.enter().append("p").attr("class","type");
    enterTypes.append("input").attr("type","checkbox");
    enterTypes.append("span");
    types.exit().remove();
    types.select("input").property("checked",function(d){ return d.display; })
      .on("change",function(d){
        d.display = this.checked;
        d3.selectAll(".tile").each(renderTiles);
      });
    types.select("span").text(function(d){ return d.type.replace("_", " "); });
}

createControls();

var width = window.innerWidth,
    height = window.innerHeight;

var tile = d3.geo.tile()
    .size([width, height]);

// translating tile zoom levels to d3's scale
var projection = d3.geo.mercator()
    .scale((1 << (8 + origin[2])) / 2 / Math.PI) // change scale here, 21 is about z13
    .translate([-width / 2, -height / 2]); // just temporary

var tileProjection = d3.geo.mercator();

var tilePath = d3.geo.path()
    .projection(tileProjection);

var zoom = d3.behavior.zoom()
    .scale(projection.scale() * 2 * Math.PI)
    .scaleExtent([1 << 12, 1 << 25]) // 12 to 25 is roughly z4-z5 to z17
    // .translate(projection([-74.0059, 40.7128]) //nyc
    .translate(projection([origin[0], origin[1]]) //la
    // .translate(projection([-122.4407, 37.7524]) //sf
      .map(function(x) { return -x; }))
    .on("zoom", zoomed)
    .on("zoomend",function(){
      setTimeout(sortFeatures, 1000);
    });

d3.select("#search-submit").on("click",function(){
    search();
});
d3.select("#search-text").on("keydown",function(){
  if (event.keyCode == 13)
    search();
});

function search(text) {
  var text = document.getElementById('search-text').value;
  d3.json("https://search.mapzen.com/v1/search?text="+text+"&api_key=search-owZDPeC", function(error, json) {
        var latlon = json.features[0].geometry.coordinates;
        zoomTo(latlon);
        document.getElementById('search-text').value = '';
    });
}

var map = d3.select("body").append("div")
    .attr("class", "map")
    .style("width", width + "px")
    .style("height", height + "px")
    .call(zoom);

var svg = map.append("div")
    .attr("class", "layer")
    .append("svg").attr("id","map").append("g");

var zoom_controls = map.append("div")
    .attr("class", "zoom-container");

var zoom_in = zoom_controls.append("a")
    .attr("class", "zoom")
    .attr("id", "zoom_in")
    .text("+");

var zoom_out = zoom_controls.append("a")
    .attr("class", "zoom")
    .attr("id", "zoom_out")
    .text("-");

var info = map.append("div")
    .attr("class", "info")
    .html('<a href="http://bl.ocks.org/mbostock/5593150" target="_top">Mike Bostock</a> | © <a href="https://www.openstreetmap.org/copyright" target="_top">OpenStreetMap contributors</a> | <a href="https://mapzen.com/projects/vector-tiles" title="Tiles courtesy of Mapzen" target="_top">Mapzen</a>');

zoomed();
setTimeout(sortFeatures, 1500);

// Resize when window resizes
window.onresize = function () {
  width = window.innerWidth;
  height = window.innerHeight;
  map.style("width", width + "px")
    .style("height", height + "px");
  tile = d3.geo.tile()
    .size([width, height]);
  zoomed();
}

function zoomed() {
  var tiles = tile
      .scale(zoom.scale())
      .translate(zoom.translate())
      ();

  projection
      .scale(zoom.scale() / 2 / Math.PI)
      .translate(zoom.translate());

  var zoomLevel = tiles[0][2],
  mapCenter = projection.invert([width/2, height/2]);

  // adding zoom level as a class  
  d3.select(".layer").attr("class",function(){ return "layer z"+zoomLevel; });
  // url hash for the location
  window.location.hash = [mapCenter[0].toFixed(5), mapCenter[1].toFixed(5), zoomLevel].join("/");

  var image = svg
      .attr("transform", matrix3d(tiles.scale, tiles.translate))
    .selectAll(".tile")
      .data(tiles, function(d){ return d; });

  image.exit()
      .each(function(d) { this._xhr.abort(); })
      .remove();

  image.enter().append("g")
      .attr("class", "tile")
      .attr("transform",function(d){ return "translate("+ d[0] * 256 +","+ d[1] * 256 +")"; })
      .each(renderTiles);
}

var download = d3.select("#exportify")
  .attr("download","map.svg")
  .on("click",exportify);
var downloadA = download.node();

//use d3 nest to group the entire page's features by type
function sortData(thorough) {
  var mapData = d3.select("svg").selectAll("path").data();
  var t = d3.nest()
    .key(function(d){ return d.layer_name; })
    .key(function(d){ 
      var kind = d.properties.kind;
      if (thorough && d.properties.boundary=='yes')
        kind += '_boundary';
      return kind; })
    .entries(mapData);

  return t;
}

//get list of feature types and figure out which are currently visible
function sortFeatures() {
  var featureTypes = sortData();
  featureTypes.forEach(function(l){
    var layerIndex;
    layers.forEach(function(d,i){ if (d.layer == l.key) layerIndex = i; });
    var currentTypes = l.values.map(function(d){ return d.key; });
    
    layers[layerIndex].types.forEach(function(d,i){ d.visible = false; });

    l.values.forEach(function(f){
      var featureIndex = -1;
      layers[layerIndex].types.forEach(function(d,i){ if (d.type == f.key) featureIndex = i; });
      if (featureIndex == -1)
        layers[layerIndex].types.push({
          type: f.key,
          display: true,
          visible: true
        });
      else
        layers[layerIndex].types[featureIndex].visible = true;
    });
  });

  createControls();
}

function matrix3d(scale, translate) {
  var k = scale / 256, r = scale % 1 ? Number : Math.round;
  return "translate("+r(translate[0] * scale)+","+r(translate[1] * scale)+") scale("+k+")";
}

// zoom controls

function interpolateZoom (translate, scale) {
    var self = this;
    return d3.transition().duration(350).tween("zoom", function () {
        var iTranslate = d3.interpolate(zoom.translate(), translate),
            iScale = d3.interpolate(zoom.scale(), scale);

        return function (t) {
            zoom
                .scale(iScale(t))
                .translate(iTranslate(t));
            zoomed();
        };
    });
}

function zoomTo(latlon) {
    var proj = projection(latlon).map(function(x){ return -x; }),
        center = [width / 2 + proj[0], height / 2 + proj[1] ],
        translate = zoom.translate(),
        view = {x: translate[0], y: translate[1], k: zoom.scale()};

    view.x += center[0];
    view.y += center[1];

    zoom.translate([view.x, view.y]).scale(view.k);
    zoomed();
}

function zoomClick() {
    var clicked = d3.event.target,
        direction = 1,
        factor = 0.2,
        target_zoom = 1,
        center = [width / 2, height / 2],
        extent = zoom.scaleExtent(),
        translate = zoom.translate(),
        translate0 = [],
        l = [],
        view = {x: translate[0], y: translate[1], k: zoom.scale()};

    d3.event.preventDefault();
    direction = (this.id === 'zoom_in') ? 1 : -1;
    target_zoom = zoom.scale() * (1 + factor * direction);

    if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }

    translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
    view.k = target_zoom;
    l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

    view.x += center[0] - l[0];
    view.y += center[1] - l[1];

    interpolateZoom([view.x, view.y], view.k);
}

d3.selectAll('a.zoom').on('click', zoomClick);

//disable mousewheel zoom if iframed
if (window.self !== window.top) {
  map.on("wheel.zoom", null);

  document.documentElement.className += ' mapzen-demo-iframed';
}

// Hide zoom control on touch devices, which interferes with project page navigation overlay
if (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch)) {
  document.getElementsByClassName('zoom-container')[0].style.display = 'none';
}

// initialize mapzen bug
var mzBug = new MapzenBug({
  name: window.bugTitle,
  link: 'https://github.com/mapzen/svg-export',
  tweet: 'An SVG map download tool from @mapzen',
  repo: 'https://github.com/mapzen/svg-export'
});

function renderTiles(d) {
  var displayLayers = layers.filter(function(d){ return d.display; })
      .map(function(d){ return d.layer; }),
    requestLayers = displayLayers.join(",");

  var svg = d3.select(this);
  var zoom = d[2];
  this._xhr = d3.json("https://vector.mapzen.com/osm/"+requestLayers+"/" + zoom + "/" + d[0] + "/" + d[1] + ".topojson?api_key=vector-tiles-LM25tq4", function(error, json) {
    var k = Math.pow(2, d[2]) * 256; // size of the world in pixels

    tilePath.projection()
        .translate([k / 2 - d[0] * 256, k / 2 - d[1] * 256]) // [0°,0°] in pixels
        .scale(k / 2 / Math.PI)
        .precision(0);
    
    var data = {};
    for (var key in json.objects) {
      data[key] = topojson.feature(json, json.objects[key]);
    }
  
    // build up a single concatenated array of all tile features from all tile layers
    var features = [];
    layers.forEach(function(l){
      if (!l.display) return;
      var layer = displayLayers.length > 1 ? l.layer : 'vectile';
      if(data[layer])
      {
        // Don't show large buildings at z13 or below.
        if(zoom <= 13 && layer == 'buildings') return;

        var sorted = d3.nest()
          .key(function(d){ return d.properties.kind; })
          .entries(data[layer].features);

        for (var i in sorted) {
          var displayFeature = true;
          if (l.types.length)
            l.types.forEach(function(t){ if (t.type == sorted[i].key) displayFeature = t.display; })

          var kind = sorted[i].key;
          for (var j in sorted[i].values) {
            // Don't include any label placement points
            if(sorted[i].values[j].properties.label_placement == 'yes') { continue }
            // Don't show small buildings at z14 or below.
            if(zoom <= 14 && layer == 'buildings' && sorted[i].values[j].properties.area < 2000) { continue }

            sorted[i].values[j].layer_name = layer;
            sorted[i].values[j].display = displayFeature;
            features.push(sorted[i].values[j]);
          }
        }
      }
    });
    
    // put all the features into SVG paths
    var paths = svg.selectAll("path")
      .data(features.sort(function(a, b) { 
        return a.properties.sort_key ? a.properties.sort_key - b.properties.sort_key : 0 }));
    paths.enter().append("path");
    paths.exit().remove();
    paths.attr("class", function(d) {
        var kind = d.properties.kind || '',
          kind = kind.replace("_","-");
        if(d.properties.boundary=='yes')
          {kind += '_boundary';} 
        return d.layer_name + '-layer ' + kind; })
      .attr("d", tilePath)
      .style("display",function(d){ return d.display ? "block" : "none"; });
  });
}

//process the page's data and download as an .svg
function exportify() {

  var featureTypes = sortData(true);

  featureTypes.forEach(function(l){
    var featureData;
    layers.forEach(function(t){ if (t.layer == l.key) featureData = t.types; });
    if (!featureData) return;
    featureData.forEach(function(t){
      if (!t.display) {
        l.values.forEach(function(f,i){ if (f.key == t.type || f.key == t.type+"_boundary") l.values.splice(i,1); })
      }
    });
  });

  var svg2 = map.append("svg")
    .attr("width",width).attr("height",height)
    .attr("style","position:absolute; top: 10000px; left: 10000px;")
    .attr("id","svg-download");


    var tiles = tile.scale(zoom.scale()).translate(zoom.translate())(),
      top = tiles[0],
      k = Math.pow(2, top[2]) * 256; // size of the world in pixels

    tilePath.projection()
        .translate([k / 2 - top[0] * 256, k / 2 - top[1] * 256]) // [0°,0°] in pixels
        .scale(k / 2 / Math.PI)
        .precision(0);

    var featureList = ["svg", "tile"];

    var layerType = svg2.selectAll(".tile").data(featureTypes);
    layerType.enter().append("g").attr("class","tile").attr("id",function(d){ return d.key; });
    layerType.exit().remove();

    var features = layerType.selectAll(".feature-type")
      .data(function(d){ return d.values; });
    features.enter().append("g").attr("class","feature-type");
    features.attr("id",function(d){ featureList.push(d.key.replace("_","-")); return d.key; });
    features.exit().remove();

    var paths = features.selectAll("path").data(function(d){ return d.values; });
    paths.enter().append("path");
    paths.exit().remove();
    paths.attr("class", function(d) {
        var kind = d.properties.kind || '',
          kind = kind.replace("_","-");
        if(d.properties.boundary=='yes')
          {kind += '_boundary';} 
        return d.layer_name + '-layer ' + kind; })
      .attr("d", tilePath);

  //messy way of finding the applicable css styles and inserting them into the file
  var addStyles = [];
  for( var i in document.styleSheets ){
    if(document.styleSheets[i].href && document.styleSheets[i].cssRules) {
      var rules = document.styleSheets[i].cssRules;
      for (var r in rules) {
        var cssText = rules[r].cssText;
        featureList.forEach(function(f){
          if (cssText && cssText.indexOf(f) != -1)
            addStyles.push(cssText);
        })
      };
    }
  }

  var styleTag = '<style type="text/css">' + addStyles.join("\n") + "</style>"

  var svgText = '<svg xmlns="http://www.w3.org/2000/svg">' + styleTag + "<svg>" + document.getElementById("svg-download").innerHTML + "</svg></svg>";
  var blob = new Blob([svgText], {type: 'text/xml'});
  var url = URL.createObjectURL(blob);
  downloadA.href = url;

  svg2.remove();
}
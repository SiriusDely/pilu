var width = 960,
  height = 500;

var centered;

var projection = d3.geo.equirectangular()
  .scale(1050)
  .rotate([-120, 0])
  .translate([width / 2, height / 2]);

var path = d3.geo.path()
  .projection(projection);
/*
var zoom = d3.behavior.zoom()
  .translate(projection.translate())
  .scale(projection.scale())
  .scaleExtent([height, 8 * height])
  .on('zoom', handleOnZoom);
*/
var svg = d3.select('#map')
  .attr('width', width)
  .attr('height', height);

var g = svg.append('g')
  // .call(zoom)
;

g.append('rect')
  .attr('class', 'background')
  .attr('width', width)
  .attr('height', height)
  .on('click', handleOnClick);

// d3.json('./json/indonesia-topojson-city-regency.json', function(err, idn) {
d3.json('./json/indonesia.json', function(err, idn) {
  if (err) { throw err; }
  console.log(idn);

  g.append('g')
    .attr('id', 'states')
    .selectAll('path')
    // .data(topojson.feature(idn, idn.objects.IDN_adm_2_kabkota).features)
    .data(topojson.feature(idn, idn.objects.states_provinces).features)
    .enter()
    .append('path')
    .attr('d', path)
    .on('click', handleOnClick);

  g.append('path')
    // .datum(topojson.mesh(idn, idn.objects.IDN_adm_2_kabkota), function(a, b) {
    .datum(topojson.mesh(idn, idn.objects.states_provinces), function(a, b) {
      return a !== b;
    })
    .attr('id', 'state-borders')
    .attr('d', path);

});

function handleOnClick(d) {
  var x, y, k;

  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;
    document.getElementById('info').innerHTML = d.properties.name;
  } else {
    x = width / 2;
    y = height / 2;
    k = 1;
    centered = null;
    document.getElementById('info').innerHTML = 'INDONESIA';
  }

  g.selectAll('path')
    .classed('active', centered && function(d) {
      return d === centered;
    });

  g.transition()
    .duration(750)
    .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')' +
      'scale(' + k + ')translate(' + -x + ',' + -y + ')')
    .attr('stroke-width', 1.5 / k + 'px');
}

function handleOnZoom() {
  // console.log('handleOnZoom');
  return;
  projection.translate(d3.event.translate).scale(d3.event.scale);
  g.selectAll('path').attr('d', path);
}


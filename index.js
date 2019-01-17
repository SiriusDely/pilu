var selectedIdx = 0;

var columns = [
  'ipm',
  'pengeluaran_perkapita',
  'angka_harapan_hidup',
  'angka_melek_huruf',
  'lama_sekolah',
];

var interpolators = [
  'interpolateRdBu',
  'interpolateGnBu',
  'interpolateBlues',
  'interpolateRdYlBu',
  'interpolateSpectral',
];

var titles = [
  'Human Development Index',
  'Per-Capita Expenditure',
  'Life Expectancy',
  'Literacy Rate',
  'Duration of Education'
];

d3.select('#columns')
  .on('change', update)
  .selectAll('option')
  .data(d3.range(0, 5))
  .enter().append('option')
  .attr('value', function(d) { return columns[d]; })
  .text(function(d) { return titles[d]; });

var column = columns[selectedIdx];
var title = titles[selectedIdx];

function update() {

  selectedIdx = this.selectedIndex;
  column = columns[selectedIdx];
  title = titles[selectedIdx];

  extent = extents[selectedIdx];

  color.domain(extent);
  x.domain(extent);

  var interpolator = interpolators[selectedIdx];
  color.interpolator(d3[interpolator]);

  average = averages[selectedIdx];

  var details = `${title} (Average): ${average}`;
  d3.select('#info-details')
    .text(details);

  g.select('.caption')
    .text(`${title}: Indonesia`);

  var duration = 1000;

  g.selectAll('.subunit')
    .transition().duration(duration)
    .attr('fill', function(d) {
      var key = d.properties.name;
      key = d.properties.nameAlt ? d.properties.nameAlt: key;
      if (!map.get(key)) {
        key = d.properties.name;
        // console.log(`${d.properties.province} - ${key}: `, d.properties.nameAlt);
      }
      return color(d[column] = +map.get(key)[column]);
    })
  ;

  g.selectAll(".bar")
    .data(d3.range(extentLegend[0], extentLegend[1]), function(d) { return d; })
    .transition().duration(duration)
    .style("fill", function(d) { return color(x.invert(d)); })

  g.transition().duration(duration)
    .call(d3.axisBottom(x)
    .ticks(9)
    .tickSize(13)
  )
    .select('.domain')
    // .transition().duration(duration)
    .remove();
}

var width = 960,
  height = 500;

var centered;

var map = d3.map();

var average = 0;

var projection = d3.geoEquirectangular()
  .scale(1050)
  .rotate([-120, 0])
  .translate([width / 2, height / 2]);

var path = d3.geoPath()
  .projection(projection);

var svg = d3.select('#map')
  .attr('width', width)
  .attr('height', height);

svg.append('rect')
  .attr('class', 'background')
  .attr('width', width)
  .attr('height', height)
  .on('click', handleOnClick);

var g = svg.append('g');

var extentLegend = [600, 860];
var extents = new Array(5);
var extent;

var averages = Array.apply(null, Array(5)).map(function() { return 0 });
var average;

var interpolator = interpolators[selectedIdx];
var color = d3.scaleSequential(d3[interpolator]);
var x = d3.scaleLinear()
  .rangeRound(extentLegend);

d3.queue()
  .defer(d3.json, './json/indonesia-provinces-regencies-topo.json')
  .defer(d3.csv, './csv/ipm.csv')
  .await(init);

function init(err, idn, hdi) {
  if (err) { throw err; }

  hdi.forEach(function(d) {
    map.set(d.nama_kabkota, d);
  });

  // Calculate average IPM
  map.each(function(d) {
    for (var i=0; i<5; i++) {
      var column1 = columns[i];
      averages[i] += +d[column1];
    }
  });

  for (var i=0; i<5; i++) {
    averages[i] = (averages[i] / map.size()).toPrecision(4);
  }

  for (var i=0; i<5; i++) {
    var column1 = columns[i];
    extents[i] = d3.extent(hdi, function(d) {
      return +d[column1];
    });
  }

  extent = extents[selectedIdx];

  color.domain(extent);
  x.domain(extent);

  g.selectAll(".bar")
    .data(d3.range(extentLegend[0], extentLegend[1]), function(d) { return d; })
    .enter().append("rect")
    .attr('class', 'bar')
    .attr("x", function(d) { return d; })
    .attr("height", 8)
    .attr("width", 1)
    .style("fill", function(d) { return color(x.invert(d)); })

  g.call(d3.axisBottom(x)
    .ticks(9)
    .tickSize(13)
  )
    .select('.domain')
    .remove();

  g.append('text')
    .attr('class', 'caption')
    .attr('x', x.range()[0])
    .attr('y', 60)
    .attr('fill', '#000')
    .attr('text-anchor', 'start')
    .attr('font-weignt', 'bold')
    .text(`${title}: Indonesia`);

  average = averages[selectedIdx];

  var details = `${title} (Average): ${average}`;
  d3.select('#info-details')
    .text(details);

  g.append('g')
    .attr('id', 'subunits')
    .selectAll('path')
    .data(topojson.feature(idn, idn.objects.regencies).features)
    .enter().append('path')
    .attr('class', 'subunit')
    .attr('fill', function(d) {
      var key = d.properties.name;
      key = d.properties.nameAlt ? d.properties.nameAlt: key;
      if (!map.get(key)) {
        key = d.properties.name;
        // console.log(`${d.properties.province} - ${key}: `, d.properties.nameAlt);
      }

      return color(d[column] = +map.get(key)[column]);
    })
    .attr('d', path)
    .text(function(d) { return d[column] + '%'; })
    .on('click', handleOnClick);

  g.append('path')
    .datum(topojson.mesh(idn, idn.objects.regencies), function(a, b) {
      return a !== b;
    })
    .attr('id', 'state-borders')
    .attr('d', path);

};

function getName(region) {
  return region.properties.province.toUpperCase() + ': ' + region.properties.name.toUpperCase();
}

function getData(region) {
  var key = region.properties.name;
  if (map.get(key)) { return (+map.get(key)[column]).toPrecision(4); }
  key = region.properties.nameAlt;
  if (map.get(key)) { return (+map.get(key)[column]).toPrecision(4); }

  return 'no data';
}

function handleOnClick(d) {
  var x, y, k;

  var location, details;
  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;
    location = getName(d);
    details = `${title}: ${getData(d)}`;
  } else {
    x = width / 2;
    y = height / 2;
    k = 1;
    centered = null;
    location = 'INDONESIA';
    details = `${title} (Average): ${average}`;
  }

  d3.select('#info-location')
    .text(location);
  d3.select('#info-details')
    .text(details);

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

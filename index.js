var width = 960,
  height = 500;

var centered;

var ipm = d3.map();

var avgIpm = 0;

var color = d3.scaleThreshold()
  .domain(d3.range(2, 10))
  .range(d3.schemeGreens[9]);

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

var x = d3.scaleLinear()
  .domain([1, 10])
  .rangeRound([600, 860]);

g.selectAll('rect')
  .data(color.range().map(function(d) {
    d = color.invertExtent(d);
    if (d[0] == null) { d[0] = x.domain()[0]; }
    if (d[1] == null) { d[1] = x.domain()[1]; }
    return d;
  }))
  .enter().append('rect')
  .attr('height', 8)
  .attr('x', function(d) { return x(d[0]); })
  .attr('width', function(d) { return x(d[1]) - x(d[0]); })
  .attr('fill', function(d) { return color(d[0]); });

g.append('text')
.attr('class', 'caption')
.attr('x', x.range()[0])
.attr('y', 60)
.attr('fill', '#000')
.attr('text-anchor', 'start')
.attr('font-weignt', 'bold')
.text('Human Development Index: Indonesia');

g.call(d3.axisBottom(x)
  .tickSize(13)
  .tickFormat(function(x, i) { return x + '0'; })
  .tickValues(color.domain()))
  .select('.domain')
  .remove();

d3.queue()
  .defer(d3.json, './json/indonesia-topojson-city-regency.json')
  .defer(d3.csv, './csv/ipm.csv', function(d) {
    ipm.set(d.nama_kabkota, Number(d.ipm / 10));
  })
  .await(processData);

function processData(err, idn) {
  if (err) { throw err; }

  // Calculate average IPM
  ipm.each(function(d) {
    avgIpm += Number(d) * 10;
  });
  avgIpm = (avgIpm / ipm.size()).toPrecision(4);

  document.getElementById('info-details').innerHTML = 'Human Development Index (Average): ' + avgIpm;

  g.append('g')
    .attr('id', 'subunits')
    .selectAll('path')
    .data(topojson.feature(idn, idn.objects.IDN_adm_2_kabkota).features)
    .enter().append('path')
    .attr('fill', function(d) {
      var key = d.properties.NAME_2;
      key = d.properties.VARNAME_2 ? d.properties.VARNAME_2 : key;
      if (!ipm.get(key)) {
        key = d.properties.NAME_2;
        console.log(d.properties.VARNAME_2, key);
      }

      return color(d.ipm = ipm.get(key));
    })
    .attr('d', path)
    .text(function(d) { return d.ipm + '%'; })
    .on('click', handleOnClick);

  g.append('path')
    .datum(topojson.mesh(idn, idn.objects.IDN_adm_2_kabkota), function(a, b) {
      return a !== b;
    })
    .attr('id', 'state-borders')
    .attr('d', path);

};

function getName(region) {
  return region.properties.NAME_1.toUpperCase() + ': ' + region.properties.NAME_2.toUpperCase();
}

function getIpm(region) {
  var key = region.properties.NAME_2;
  if (ipm.get(key)) { return (ipm.get(key) * 10).toPrecision(4); }
  key = region.properties.VARNAME_2;
  if (ipm.get(key)) { return (ipm.get(key) * 10).toPrecision(4); }

  return 'no data';
}

function handleOnClick(d) {
  var x, y, k;

  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;
    document.getElementById('info-location').innerHTML = getName(d);
    document.getElementById('info-details').innerHTML = 'Human Development Index: ' + getIpm(d);
  } else {
    x = width / 2;
    y = height / 2;
    k = 1;
    centered = null;
    document.getElementById('info-location').innerHTML = 'INDONESIA';
    document.getElementById('info-details').innerHTML = 'Human Development Index (Average): ' + avgIpm;
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

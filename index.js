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
  .on('change', handleColumnOnChange)
  .selectAll('option')
  .data(d3.range(0, 5))
  .enter().append('option')
  .attr('value', function(d) { return columns[d]; })
  .text(function(d) { return titles[d]; });

var column = columns[selectedIdx];
var title = titles[selectedIdx];

var subunits;

function handleColumnOnChange() {
  console.log(this.selectedIndex, columns[this.selectedIndex]);

  selectedIdx = this.selectedIndex;
  column = columns[selectedIdx];
  title = titles[selectedIdx];

  hdi.forEach(function(d) {
    mapIpm.set(d.nama_kabkota, Number(d[column]));
  });

  var extentIpm = d3.extent(hdi, function(d) {
    return +d[column];
  });

  color.domain(extentIpm);
  x.domain(extentIpm);

  var interpolator = interpolators[selectedIdx];
  color.interpolator(d3[interpolator]);

  avgIpm = 0;
  mapIpm.each(function(d) {
    avgIpm += Number(d);
  });
  avgIpm = (avgIpm / mapIpm.size()).toPrecision(4);

  var details = `${title} (Average): ${avgIpm}`;
  // document.getElementById('info-details').innerHTML = details;
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
      if (!mapIpm.get(key)) {
        key = d.properties.name;
        // console.log(`${d.properties.province} - ${key}: `, d.properties.nameAlt);
      }
      return color(d[column] = mapIpm.get(key));
    })
  ;

  g.selectAll(".bar")
    .data(d3.range(extentLegend[0], extentLegend[1]), function(d) { return d; })
    .transition().duration(duration)
    .style("fill", function(d) { return color(x.invert(d)); })

  g
    .transition().duration(duration)
    .call(d3.axisBottom(x)
    .ticks(9)
    .tickSize(13)
  )
    .select('.domain')
    .remove();
}

var width = 960,
  height = 500;

var centered;

var mapIpm = d3.map();

var avgIpm = 0;

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

var interpolator = interpolators[selectedIdx];
var color = d3.scaleSequential(d3[interpolator]);
var x = d3.scaleLinear()
  .rangeRound(extentLegend);

var idn, hdi;

d3.queue()
  .defer(d3.json, './json/indonesia-provinces-regencies-topo.json')
  .defer(d3.csv, './csv/ipm.csv')
  .await(processMap);

function processMap(err, idn2, hdi2) {
  if (err) { throw err; }

  idn = idn2;
  hdi = hdi2;

  hdi.forEach(function(d) {
    mapIpm.set(d.nama_kabkota, Number(d[column]));
  });

  var extentIpm = d3.extent(hdi, function(d) {
    return +d[column];
  });

  color.domain(extentIpm);
  x.domain(extentIpm);

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

  // Calculate average IPM
  mapIpm.each(function(d) {
    avgIpm += Number(d);
  });
  avgIpm = (avgIpm / mapIpm.size()).toPrecision(4);

  var details = `${title} (Average): ${avgIpm}`;
  // document.getElementById('info-details').innerHTML = details;
  d3.select('#info-details')
    .text(details);

  subunits = g.append('g')
    .attr('id', 'subunits')
    .selectAll('path')
    .data(topojson.feature(idn, idn.objects.regencies).features)
    .enter().append('path')
    .attr('class', 'subunit')
    .attr('fill', function(d) {
      var key = d.properties.name;
      key = d.properties.nameAlt ? d.properties.nameAlt: key;
      if (!mapIpm.get(key)) {
        key = d.properties.name;
        // console.log(`${d.properties.province} - ${key}: `, d.properties.nameAlt);
      }

      return color(d[column] = mapIpm.get(key));
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

function getIpm(region) {
  var key = region.properties.name;
  if (mapIpm.get(key)) { return mapIpm.get(key).toPrecision(4); }
  key = region.properties.nameAlt;
  if (mapIpm.get(key)) { return mapIpm.get(key).toPrecision(4); }

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
    details = `${title}: ${getIpm(d)}`;
  } else {
    x = width / 2;
    y = height / 2;
    k = 1;
    centered = null;
    location = 'INDONESIA';
    details = `${title} (Average): ${avgIpm}`;
  }

  // document.getElementById('info-location').innerHTML = location;
  // document.getElementById('info-details').innerHTML = details;
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

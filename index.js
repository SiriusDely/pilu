var width = 960,
  height = 500;

var centered;

var ipm = d3.map();

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

d3.queue()
  .defer(d3.json, './json/indonesia-provinces-regencies-topo.json')
  .defer(d3.csv, './csv/ipm.csv')
  .await(processMap);

function processMap(err, idn, hdi) {
  if (err) { throw err; }

  hdi.forEach(function(d) {
    ipm.set(d.nama_kabkota, Number(d.ipm));
  });

  var maxIpm = d3.max(hdi, function(d) {
    return +d.ipm;
  });
  var minIpm = d3.min(hdi, function(d) {
    return +d.ipm;
  });

  var stepIpm = (maxIpm - minIpm) / 9;

  console.log('maxIpm: ', maxIpm);
  console.log('minIpm: ', minIpm);
  var maxScale = Math.round(maxIpm / 10) * 10;
  var minScale = Math.round(minIpm / 10) * 10;
  console.log('maxScale: ', maxScale);
  console.log('minScale: ', minScale);

  var color = d3.scaleThreshold()
    .domain(d3.range(2, 10))
    .range(d3.schemeBlues[9]);

  var color2 = d3.scaleSequential(d3.interpolateRdBu)
  .domain([minIpm, maxIpm]);

  var x = d3.scaleLinear()
    .domain([1, 10])
    .rangeRound([600, 860]);

  var x2 = d3.scaleLinear()
    .domain([minIpm, maxIpm])
    .rangeRound([600, 860]);

  g.selectAll("rect")
    .data(d3.range(600, 860), function(d) { return d; })
    .enter().append("rect")
    .attr("x", function(d) { return d; })
    .attr("height", 8)
    .attr("width", 1)
    .style("fill", function(d) { return color2(x2.invert(d)); })

  g.call(d3.axisBottom(x2)
    .ticks(9)
    .tickSize(13))
    .select('.domain')
    .remove();

  g.append('text')
    .attr('class', 'caption')
    .attr('x', x.range()[0])
    .attr('y', 60)
    .attr('fill', '#000')
    .attr('text-anchor', 'start')
    .attr('font-weignt', 'bold')
    .text('Human Development Index: Indonesia');

  // Calculate average IPM
  ipm.each(function(d) {
    avgIpm += Number(d);
  });
  avgIpm = (avgIpm / ipm.size()).toPrecision(4);

  document.getElementById('info-details').innerHTML = 'Human Development Index (Average): ' + avgIpm;

  g.append('g')
    .attr('id', 'subunits')
    .selectAll('path')
    .data(topojson.feature(idn, idn.objects.regencies).features)
    .enter().append('path')
    .attr('fill', function(d) {
      var key = d.properties.name;
      key = d.properties.nameAlt ? d.properties.nameAlt: key;
      if (!ipm.get(key)) {
        key = d.properties.name;
        console.log(`${d.properties.province} - ${key}: `, d.properties.nameAlt);
      }

      return color2(d.ipm = ipm.get(key));
    })
    .attr('d', path)
    .text(function(d) { return d.ipm + '%'; })
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
  if (ipm.get(key)) { return ipm.get(key).toPrecision(4); }
  key = region.properties.nameAlt;
  if (ipm.get(key)) { return ipm.get(key).toPrecision(4); }

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

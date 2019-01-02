const fs = require('fs');
const util = require('util');

const readFile  = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

(async () => {
  const inputString = await readFile('./json/indonesia.json', 'utf8');

  const inputJson = JSON.parse(inputString);
  const { type, arcs, transform, objects } = inputJson;
  const { subunits, states_provinces, places } = objects;

  const countries = { type: subunits.type };
  countries.geometries = subunits.geometries.map(g => {
    return {
      type: g.type,
      id: g.id,
      properties: {
        name: g.properties['NAME_LONG']
      },
      arcs: g.arcs,
    };
  });

  const provinces = { type: states_provinces.type };
  provinces.geometries = states_provinces.geometries.map(g => {
    return {
      type: g.type,
      properties: {
        name: g.properties.name
      },
      arcs: g.arcs,
    };
  });

  const cities = { type: places.type };
  cities.geometries = places.geometries.map(g => {
    return {
      type: g.type,
      properties: {
        name: g.properties['LS_NAME'],
        province: g.properties['ADM1NAME'],
        country: g.properties['ADM0NAME']
      },
      coordinates: g.coordinates,
    };
  });

  const outputJson = { type, objects: {
    // countries,
    provinces,
    cities
  }, arcs, transform };

  const outputString = JSON.stringify(outputJson);

  const result = await writeFile('./json/indonesia-provinces-cities-topo.json', outputString, 'utf8');
  console.log('result: ', result);

  // console.log(JSON.stringify(outputJson.objects.cities));

})();

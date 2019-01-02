const fs = require('fs');
const util = require('util');

const readFile  = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

(async () => {
  const inputString = await readFile('./json/indonesia-topojson-city-regency.json', 'utf8');

  const inputJson = JSON.parse(inputString);
  const { type, arcs, transform, objects } = inputJson;
  const { IDN_adm_2_kabkota: kabkota } = objects;

  const regencies = { type: kabkota.type, bbox: kabkota.bbox };
  regencies.geometries = kabkota.geometries.map(g => {
    return {
      type: g.type,
      properties: {
        id: g.properties['ID_0'],
        name: g.properties['NAME_2'],
        nameAlt: g.properties['VARNAME_2'],
        provinceId: g.properties['ID_1'],
        province: g.properties['NAME_1'],
        type: g.properties['TYPE_2'],
        typeEn: g.properties['ENGTYPE_2'],
      },
      arcs: g.arcs,
    };
  });

  const outputJson = { type, objects: {
    regencies
  }, arcs, transform };

  const outputString = JSON.stringify(outputJson);

  const result = await writeFile('./json/indonesia-provinces-regencies-topo.json', outputString, 'utf8');
  console.log('result: ', result);

  // console.log(JSON.stringify(outputJson.objects.cities));

})();

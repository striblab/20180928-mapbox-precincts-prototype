echo "Downloading 2018 precincts ..." &&
wget ftp://ftp.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_sos/bdry_votingdistricts/shp_bdry_votingdistricts.zip && \
  unzip shp_bdry_votingdistricts.zip  && \
  shp2json bdry_votingdistricts.shp | \
  mapshaper - -quiet -proj longlat from=bdry_votingdistricts.prj -o ./bdry_votingdistricts.json format=geojson && \
  cat bdry_votingdistricts.json | \
  geo2topo precincts=- > ./mn-precincts-longlat.tmp.json && \
  rm bdry_votingdistricts.* && \
  rm -rf ./metadata && \
  rm shp_bdry_votingdistricts.* &&

echo "Downloading 2014 precinct results ..." &&
echo "state;county_id;precinct_id;office_id;office_name;district;\
cand_order;cand_name;suffix;incumbent;party;precincts_reporting;\
precincts_voting;votes;votes_pct;votes_office" | \
  cat - <(wget -O - -o /dev/null https://electionresults.sos.state.mn.us/Results/MediaResult/20?mediafileid=39) > mn-gov-precinct-2014.tmp.csv &&

echo "Getting 2014 DFL totals ..." &&
cat mn-gov-precinct-2014.tmp.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party, "votes": parseInt(d.votes)}' | \
  ndjson-filter 'd.party == "DFL"' | \
  uniq > 'dfl14.tmp.ndjson' &&

echo "Getting 2014 Republican totals ..." &&
cat mn-gov-precinct-2014.tmp.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party, "votes": parseInt(d.votes)}' | \
  ndjson-filter 'd.party == "R"' | \
  uniq > 'r14.tmp.ndjson' &&

echo "Joining and calculating results ..." &&
ndjson-join 'd.id' <(cat dfl14.tmp.ndjson) <(cat r14.tmp.ndjson) | \
  ndjson-map '{"id":  d[0].county_id + d[0].precinct_id, "winner2014": d[0].votes > d[1].votes ? "clinton" : d[0].votes == d[1].votes ? "even" : "trump", "dfl_votes": parseInt(d[0].votes), "gop_votes": parseInt(d[1].votes), "total_votes": parseInt(d[1].votes) + parseInt(d[0].votes)}' > joined14.tmp.ndjson &&

echo "Joining results to precinct map ..." &&
ndjson-split 'd.objects.precincts.geometries' < mn-precincts-longlat.tmp.json |
  ndjson-map -r d3 '{"type": d.type, "arcs": d.arcs, "properties": {"id": d3.format("02")(d.properties.COUNTYCODE) + d.properties.PCTCODE, "county": d.properties.COUNTYNAME, "precinct": d.properties.PCTNAME, "area_sqmi": d.properties.Shape_Area * 0.00000038610}}' > mn-precincts-longlat.tmp.ndjson &&
  ndjson-join --left 'd.properties.id' 'd.id' <(cat mn-precincts-longlat.tmp.ndjson) <(cat joined14.tmp.ndjson) |
   ndjson-map '{"type": d[0].type, "arcs": d[0].arcs, "properties": {"id": d[0].properties.id, "county": d[0].properties.county, "precinct": d[0].properties.precinct, "area_sqmi": d[0].properties.area_sqmi, "winner2014": d[1] != null ? d[1].winner2014 : null, "dfl_votes": d[1] != null ? d[1].dfl_votes : null, "gop_votes": d[1] != null ? d[1].gop_votes : null, "total_votes": d[1] != null ? d[1].total_votes : null, "votes_sqmi": d[1] != null ? d[1].total_votes / d[0].properties.area_sqmi : null}}' |
   ndjson-reduce 'p.geometries.push(d), p' '{"type": "GeometryCollection", "geometries":[]}' > mn-precincts.geometries.tmp.ndjson &&

echo "Putting it all together ..." &&
ndjson-join '1' '1' <(ndjson-cat mn-precincts-longlat.tmp.json) <(cat mn-precincts.geometries.tmp.ndjson) |
  ndjson-map '{"type": d[0].type, "bbox": d[0].bbox, "transform": d[0].transform, "objects": {"precincts": {"type": "GeometryCollection", "geometries": d[1].geometries}}, "arcs": d[0].arcs}' > mn-precincts-final.json &&
topo2geo precincts=mn-precincts-geo.json < mn-precincts-final.json &&

echo "Creating SVG for print ..." &&
mapshaper mn-precincts-geo.json \
  -quiet \
  -proj albersusa \
  -colorizer name=calcFill colors='#c0272d,#0258a0,#dfdfdf,#dfdfdf' categories='trump,clinton,even,null' \
  -colorizer name=calcOpacity colors='0.1,0.25,0.5,0.75,1,1' breaks=10,25,100,500,100000 \
  -style fill='calcFill(winner2014)' opacity='calcOpacity(votes_sqmi)' \
  -o mn-precincts-2014.svg &&

echo "Creating MBtiles for Mapbox upload ..." &&
tippecanoe -o ./mapbox/mn_election_results_2014.mbtiles -Z 2 -z 13 --generate-ids ./mn-precincts-geo.json &&

echo "Cleaning up ..."
rm *.tmp.csv
rm *.tmp.json
rm *.tmp.ndjson
rm mn-precincts-final.json
rm mn-precincts-geo.json

echo "Done!"
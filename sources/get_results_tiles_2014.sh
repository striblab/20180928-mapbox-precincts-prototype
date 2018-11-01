mkdir -p mapbox &&

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

echo "Getting DFL totals ..." &&
cat mn-gov-precinct-2014.tmp.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party, "votes": parseInt(d.votes), "votes_pct": parseFloat(d.votes_pct)}' | \
  ndjson-filter 'd.party == "DFL"' | \
  uniq > 'dfl.tmp.ndjson' &&

echo "Getting Republican totals ..." &&
cat mn-gov-precinct-2014.tmp.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party, "votes": parseInt(d.votes), "votes_pct": parseFloat(d.votes_pct)}' | \
  ndjson-filter 'd.party == "R"' | \
  uniq > 'r.tmp.ndjson' &&

echo "Tallying results from third parties ..." &&
cat mn-gov-precinct-2014.tmp.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party != "DFL" && d.party != "R" ? "O" : d.party, "votes": parseInt(d.votes), "votes_pct": parseFloat(d.votes_pct)}' | \
  ndjson-filter 'd.party == "O"' | \
  ndjson-reduce '(p[d.id] = p[d.id] || []).push(d.votes), p' '{}' | \
  ndjson-split 'Object.keys(d).map(key => ({id: key, votes: d[key]}))' | \
  ndjson-join 'd.id' 'd.county_id + d.precinct_id' - <(cat mn-gov-precinct-2014.tmp.csv | csv2json -r ";" | ndjson-split) | \
  ndjson-map '{"id": d[0].id, "county_id": d[1].county_id, "precinct_id": d[1].precinct_id, "party": "O", "votes": d[0].votes.reduce((a, b) => a + b, 0), "votes_pct": (d[0].votes.reduce((a, b) => a + b, 0) / d[1].votes_office * 100).toFixed(2), "majority_oth": d[0].votes.reduce((a, b) => a + b, 0) / d[1].votes_office > .5 ? true : false}' | \
  uniq > 'oth.tmp.ndjson' &&

echo "Joining and calculating results ..." &&
ndjson-join 'd.id' <(cat dfl.tmp.ndjson) <(cat r.tmp.ndjson) | \
  ndjson-map '{"id":  d[0].county_id + d[0].precinct_id, "winner": d[0].votes > d[1].votes ? "dfl" : d[0].votes == d[1].votes ? "even" : "r", "winner_margin": d[0].votes > d[1].votes ? d[0].votes_pct - d[1].votes_pct : d[0].votes < d[1].votes ? d[1].votes_pct - d[0].votes_pct : "even", "dfl_votes": parseInt(d[0].votes), "gop_votes": parseInt(d[1].votes), "total_votes": parseInt(d[1].votes) + parseInt(d[0].votes), "dfl_pct": parseFloat(d[0].votes_pct), "gop_pct": parseFloat(d[1].votes_pct)}' | \
ndjson-join 'd.id' - <(cat oth.tmp.ndjson) | \
ndjson-map '{"id": d[0].id, "winner": d[1].majority_oth ? "oth" : d[0].winner, "winner_margin": d[0].winner_margin, "dfl_votes": d[0].dfl_votes, "gop_votes": d[0].gop_votes, "oth_votes": d[1].votes, "total_votes": d[0].total_votes, "dfl_pct": d[0].dfl_pct, "gop_pct": d[0].gop_pct, "oth_pct": d[1].votes_pct}' |
ndjson-map '{"id": d.id, "winner": d.winner, "winner_margin": d.winner_margin, "dfl_votes": d.dfl_votes, "gop_votes": d.gop_votes, "oth_votes": d.oth_votes, "total_votes": d.total_votes, "dfl_pct": d.dfl_pct, "gop_pct": d.gop_pct, "oth_pct": d.oth_pct, "winner_cat": d.winner != "even" ? d.winner_margin <= 5 ? d.winner + "-small" : d.winner_margin <= 10 && d.winner_margin > 5 ? d.winner + "-med" : d.winner_margin > 10 ? d.winner + "-large" : null : d.winner == "oth" ? "oth" : "even"}' > joined.tmp.ndjson &&

echo "Joining results to precinct map ..." &&
ndjson-split 'd.objects.precincts.geometries' < mn-precincts-longlat.tmp.json |
  ndjson-map -r d3 '{"type": d.type, "arcs": d.arcs, "properties": {"id": d3.format("02")(d.properties.COUNTYCODE) + d.properties.PCTCODE, "county": d.properties.COUNTYNAME, "precinct": d.properties.PCTNAME, "area_sqmi": d.properties.Shape_Area * 0.00000038610}}' > mn-precincts-longlat.tmp.ndjson &&
  ndjson-join --left 'd.properties.id' 'd.id' <(cat mn-precincts-longlat.tmp.ndjson) <(cat joined.tmp.ndjson) |
   ndjson-map '{"type": d[0].type, "arcs": d[0].arcs, "properties": {"id": d[0].properties.id, "county": d[0].properties.county, "precinct": d[0].properties.precinct, "area_sqmi": d[0].properties.area_sqmi, "winner": d[1] != null ? d[1].winner : null, "winner_margin": d[1] != null ? d[1].winner_margin : null, "winner_cat": d[1] != null ? d[1].winner_cat : null, "dfl_votes": d[1] != null ? d[1].dfl_votes : null, "gop_votes": d[1] != null ? d[1].gop_votes : null, "oth_votes": d[1] != null ? d[1].oth_votes : null, "total_votes": d[1] != null ? d[1].total_votes : null, "votes_sqmi": d[1] != null ? d[1].total_votes / d[0].properties.area_sqmi : null, "dfl_pct": d[1] != null ? d[1].dfl_pct : null, "gop_pct": d[1] != null ? d[1].gop_pct : null, "oth_pct": d[1] != null ? d[1].oth_pct : null }}' |
   ndjson-reduce 'p.geometries.push(d), p' '{"type": "GeometryCollection", "geometries":[]}' > mn-precincts.geometries.tmp.ndjson &&

echo "Putting it all together ..." &&
ndjson-join '1' '1' <(ndjson-cat mn-precincts-longlat.tmp.json) <(cat mn-precincts.geometries.tmp.ndjson) |
  ndjson-map '{"type": d[0].type, "bbox": d[0].bbox, "transform": d[0].transform, "objects": {"precincts": {"type": "GeometryCollection", "geometries": d[1].geometries}}, "arcs": d[0].arcs}' > mn-precincts-final.json &&
topo2geo precincts=mn-precincts-geo.json < mn-precincts-final.json &&

echo "Creating SVG for print ..." &&
mapshaper mn-precincts-geo.json \
  -quiet \
  -proj +proj=utm +zone=15 +ellps=GRS80 +datum=NAD83 +units=m +no_defs \
  -colorizer name=calcFill colors='#ffe6e6,#ff8080,#ff1a1a,#e6eeff,#80aaff,#1a66ff,chartreuse,#874e8e,#dfdfdf' categories='r-small,r-med,r-large,dfl-small,dfl-med,dfl-large,oth,even,null' \
  -style fill='calcFill(winner_cat)' \
  -o mn-precincts-2014.svg

echo "Creating MBtiles for Mapbox upload ..." &&
tippecanoe -o ./mapbox/mn_election_results_2014.mbtiles -Z 2 -z 14 --generate-ids ./mn-precincts-geo.json &&

echo "Cleaning up ..."
rm *.tmp.csv
rm *.tmp.json
rm *.tmp.ndjson
rm mn-precincts-final.json
rm mn-precincts-geo.json

echo "Done!"
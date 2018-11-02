# 2014
# YEAR=2014
# RESULTSURL=https://electionresults.sos.state.mn.us/Results/MediaResult/20?mediafileid=39

# 2016
YEAR=2016
RESULTSURL=https://electionresults.sos.state.mn.us/Results/MediaResult/100?mediafileid=52

# 2018
# YEAR=2018
# RESULTSURL=https://electionresults.sos.state.mn.us/Results/MediaResult/115?mediafileid=39

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

echo "Downloading precinct results ..." &&
echo "state;county_id;precinct_id;office_id;office_name;district;\
cand_order;cand_name;suffix;incumbent;party;precincts_reporting;\
precincts_voting;votes;votes_pct;votes_office" | \
  cat - <(wget -O - -o /dev/null $RESULTSURL) > mn-gov-precinct.tmp.csv &&

echo "Getting vote totals ..." &&
cat mn-gov-precinct.tmp.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party, "votes": parseInt(d.votes), "votes_pct": parseFloat(d.votes_pct)}' | \
  ndjson-reduce '(p[d.id] = p[d.id] || []).push({party: d.party, votes: d.votes, votes_pct: d.votes_pct}), p' '{}' | \
  ndjson-split 'Object.keys(d).map(key => ({id: key, votes: d[key]}))' | \
  ndjson-map '{"id": d.id, "votes": d.votes.filter(obj => obj.party != "").sort((a, b) => b.votes - a.votes)}' | \
  ndjson-map '{"id": d.id, "votes": d.votes, "winner": d.votes[0].votes > 0 ? d.votes[0].votes != d.votes[1].votes ? ["DFL", "R"].includes(d.votes[0].party) ? d.votes[0].party : "OTH" : "even" : "none", "winner_margin": (d.votes[0].votes_pct - d.votes[1].votes_pct).toFixed(2)}' | \
  ndjson-map '{"id": d.id, "winner": d.winner, "winner_margin": d.winner_margin, "total_votes": d.votes.reduce((a, b) => a + b.votes, 0), "winner_cat": d.winner_margin != 0 && d.winner != "OTH" ? d.winner_margin <= 5 ? d.winner + "-small" : d.winner_margin <= 25 && d.winner_margin > 5 ? d.winner + "-med" : d.winner_margin > 25 ? d.winner + "-large" : null : d.winner == "OTH" ? "OTH" : "even", "votes_obj": d.votes}' > joined.tmp.ndjson &&

echo "Joining results to precinct map ..." &&
ndjson-split 'd.objects.precincts.geometries' < mn-precincts-longlat.tmp.json | \
  ndjson-map -r d3 '{"type": d.type, "arcs": d.arcs, "properties": {"id": d3.format("02")(d.properties.COUNTYCODE) + d.properties.PCTCODE, "county": d.properties.COUNTYNAME, "precinct": d.properties.PCTNAME, "area_sqmi": d.properties.Shape_Area * 0.00000038610}}' > mn-precincts-longlat.tmp.ndjson &&
  ndjson-join --left 'd.properties.id' 'd.id' <(cat mn-precincts-longlat.tmp.ndjson) <(cat joined.tmp.ndjson) | \
   ndjson-map '{"type": d[0].type, "arcs": d[0].arcs, "properties": {"id": d[0].properties.id, "county": d[0].properties.county, "precinct": d[0].properties.precinct, "area_sqmi": d[0].properties.area_sqmi, "winner": d[1] != null ? d[1].winner : null, "winner_margin": d[1] != null ? d[1].winner_margin : null, "winner_cat": d[1] != null ? d[1].winner_cat : null, "total_votes": d[1] != null ? d[1].total_votes : null, "votes_sqmi": d[1] != null ? d[1].total_votes / d[0].properties.area_sqmi : null, "votes_obj": d[1] != null ? d[1].votes_obj : null}}' | \
   ndjson-reduce 'p.geometries.push(d), p' '{"type": "GeometryCollection", "geometries":[]}' > mn-precincts.geometries.tmp.ndjson &&

echo "Putting it all together ..." &&
ndjson-join '1' '1' <(ndjson-cat mn-precincts-longlat.tmp.json) <(cat mn-precincts.geometries.tmp.ndjson) |
  ndjson-map '{"type": d[0].type, "bbox": d[0].bbox, "transform": d[0].transform, "objects": {"precincts": {"type": "GeometryCollection", "geometries": d[1].geometries}}, "arcs": d[0].arcs}' > mn-precincts-final.json &&
topo2geo precincts=mn-precincts-geo.json < mn-precincts-final.json

echo "Creating statewide SVG for print ..." &&
mapshaper mn-precincts-geo.json \
  -quiet \
  -proj +proj=utm +zone=15 +ellps=GRS80 +datum=NAD83 +units=m +no_defs \
  -colorizer name=calcFill colors='#fee0d2,#fc9272,#de2d26,#deebf7,#9ecae1,#3182bd,#dfdfdf,#dfdfdf,#dfdfdf' categories='R-small,R-med,R-large,DFL-small,DFL-med,DFL-large,OTH,even,null' \
  -style fill='calcFill(winner_cat)' \
  -o mn-precincts-state-$YEAR.svg

echo "Creating metro SVG for print ..." &&
mapshaper mn-precincts-geo.json \
  -quiet \
  -filter '"Hennepin,Ramsey,Anoka,Dakota,Carver,Scott,Washington".indexOf(county) > -1' \
  -proj +proj=utm +zone=15 +ellps=GRS80 +datum=NAD83 +units=m +no_defs \
  -colorizer name=calcFill colors='#fee0d2,#fc9272,#de2d26,#deebf7,#9ecae1,#3182bd,#dfdfdf,#dfdfdf,#dfdfdf' categories='R-small,R-med,R-large,DFL-small,DFL-med,DFL-large,OTH,even,null' \
  -style fill='calcFill(winner_cat)' \
  -o mn-precincts-metro-$YEAR.svg &&

echo "Creating MBtiles for Mapbox upload ..." &&
tippecanoe -o ./mapbox/mn_election_results_$YEAR.mbtiles -Z 2 -z 14 --generate-ids ./mn-precincts-geo.json &&

echo "Cleaning up ..."
rm *.tmp.csv
rm *.tmp.json
rm *.tmp.ndjson
rm mn-precincts-final.json
rm mn-precincts-geo.json

echo "Done!"
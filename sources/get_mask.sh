mkdir -p mapbox &&

wget https://www2.census.gov/geo/tiger/GENZ2017/shp/cb_2017_us_county_500k.zip && \
  unzip cb_2017_us_county_500k.zip && \
  shp2json cb_2017_us_county_500k.shp | \
  mapshaper - -filter "STATEFP == '27'" -quiet -proj longlat -o ./cb_2017_us_county_500k.json format=geojson && \
  cat cb_2017_us_county_500k.json | \
  geo2topo counties=- | \
  topomerge state=counties -k '1' > ./mn-counties.json && \
  node make_mask_turf.js &&
  rm ./mn-counties.json &&
  rm cb_2017_us_county_500k.*
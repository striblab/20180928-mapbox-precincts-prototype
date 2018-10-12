/**
 * Main JS file for project.
 */

function makeTooltip(precinct, dfl, gop) {
  var html = '<div class=".mapboxgl-popup"> \
    <h4 id="title">' + precinct + '</h4> \
    <table> \
      <thead> \
        <tr> \
          <th>Party</th> \
          <th class="right">Votes</th> \
        </tr> \
      </thead> \
      <tbody> \
        <tr> \
          <td><span class="label-d"></span>DFL</td> \
          <td id="votes-d" class="right">' + dfl + '</td> \
        </tr> \
        <tr> \
          <td><span class="label-r"></span>GOP</td> \
          <td id="votes-r" class="right">' + gop + '</td> \
        </tr>\
      </tbody> \
    </table> \
  </div>'

  return html;
}

// Adaptive map height
var mapHeight = window.innerWidth * 1.07
document.getElementById("map").style.height = mapHeight.toString() + "px";

mapboxgl.accessToken = 'pk.eyJ1IjoiY2pkZDNiIiwiYSI6ImNqZWJtZWVsYjBoYTAycm1raTltdnpvOWgifQ.aPWEg8C-5IJ0_7cXusY-1g';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/cjdd3b/cjmt2qdtt1bvv2stn3fp6bt33',
  center: [-94.6859, 47.7296],
  zoom: 2,
  maxBounds: [-97.25, 43.4, -89.53, 49.5],
  scrollZoom: false
});

map.addControl(new mapboxgl.NavigationControl());

// Make and attach geocoder
var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    bbox: [-97.25, 43.4, -89.53, 49.5],
    zoom: 12,
    placeholder: "Search for an address"
});
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

map.dragRotate.disable();
map.touchZoomRotate.disableRotation();
map.dragPan.disable();

map.on('load', function() {
  var popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
  });

  let hoveredStateId = null;

  map.on('zoom', function() {
    if (map.getZoom() < 7) {
      map.dragPan.disable();
    } else {
      map.dragPan.enable();
    }
  });

  map.on('mousemove', 'mnprecinctsgeo', function(e) {
    map.getCanvas().style.cursor = 'pointer';

    var coordinates = e.features[0].geometry.coordinates.slice();

    // Popup components
    var precinct = e.features[0].properties.precinct;
    var dfl = e.features[0].properties.dfl_votes;
    var gop = e.features[0].properties.gop_votes;

    // Populate the popup and set its coordinates
    // based on the feature found.
    popup.setLngLat(e.lngLat)
      .setHTML(makeTooltip(precinct, dfl, gop))
      .addTo(map);
  });

  map.on('mouseleave', 'mnprecinctsgeo', function() {
    popup.remove();
  });

});

// Todo:
// MOBILE BEHAVIOR
// LEGEND
// STYLE GEOCODE, ETC.
// MULTIPLE LAYERS FOR DIFF RACES?
// KEEP POLISHING STUDIO STYLES
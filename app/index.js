/**
 * Main JS file for project.
 */

import Popover from './shared/popover.js';

var isMobile = {
  Android: function() {
    return navigator.userAgent.match(/Android/i);
  },
  BlackBerry: function() {
    return navigator.userAgent.match(/BlackBerry/i);
  },
  iOS: function() {
    return navigator.userAgent.match(/iPhone|iPad|iPod/i);
  },
  Opera: function() {
    return navigator.userAgent.match(/Opera Mini/i);
  },
  Windows: function() {
    return navigator.userAgent.match(/IEMobile/i);
  },
  any: function() {
    return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
  }
};

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
          <td><span class="label-d"></span>Dayton</td> \
          <td id="votes-d" class="right">' + dfl + '</td> \
        </tr> \
        <tr> \
          <td><span class="label-r"></span>Johnson</td> \
          <td id="votes-r" class="right">' + gop + '</td> \
        </tr>\
      </tbody> \
    </table> \
  </div>'

  return html;
}

function placeTooltip(e, popup) {
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
}

// Adaptive map height
var mapHeight = window.innerWidth * 1.07
document.getElementById("map").style.height = mapHeight.toString() + "px";

// Init map
mapboxgl.accessToken = 'pk.eyJ1IjoiY2pkZDNiIiwiYSI6ImNqZWJtZWVsYjBoYTAycm1raTltdnpvOWgifQ.aPWEg8C-5IJ0_7cXusY-1g';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/cjdd3b/cjmt2qdtt1bvv2stn3fp6bt33',
  center: [-94.6859, 47.7296],
  zoom: 2,
  maxBounds: [-97.25, 43.4, -89.53, 49.5],
  scrollZoom: false
});

// Basic options and setup
map.addControl(new mapboxgl.NavigationControl());
map.dragRotate.disable();
map.touchZoomRotate.disableRotation();
map.dragPan.disable();
map.getCanvas().style.cursor = 'pointer';

// Make and attach geocoder
var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    bbox: [-97.25, 43.4, -89.53, 49.5],
    zoom: 12,
    placeholder: "Search for an address"
});
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

// Onload behaviors
map.on('load', function() {
  var popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  var popover = new Popover('#map-popover');

  // Handlers
  map.on('zoom', function() {
    if (map.getZoom() < 7) {
      map.dragPan.disable();
    } else {
      map.dragPan.enable();
    }
  });

  // Capture mousemove events on desktop and touch on mobile
  if (!isMobile.any()) {
    map.on('mousemove', 'mnprecinctsgeo', function(e) {
      var f = map.queryRenderedFeatures(e.point)[0];
      placeTooltip(e, popup);
    });

    map.on('mouseleave', 'mnprecinctsgeo', function() {
      popup.remove();
    });
  } else {
    map.on('click', 'mnprecinctsgeo', function(e) {
      // Popup components
      var precinct = e.features[0].properties.precinct;
      var dfl = e.features[0].properties.dfl_votes;
      var gop = e.features[0].properties.gop_votes;

      // Populate the popup and set its coordinates
      // based on the feature found.
      popover.open(precinct, dfl, gop);
    });
  }

});

// Todo:
// MOBILE BEHAVIOR
//  - Popup styles at bottom
// LEGEND
// STYLE GEOCODE, ETC.
// MULTIPLE LAYERS FOR DIFF RACES?
// KEEP POLISHING STUDIO STYLES
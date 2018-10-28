/**
 * Main JS file for project.
 */

import Popover from './shared/popover.js';
import StribPopup from './shared/popup.js';
import utilsFn from './utils.js';

/********** CONSTANTS **********/

const adaptive_ratio = 1.07; // Height/width ratio for adaptive map sizing
const popover_thresh = 500; // The width of the map when tooltips turn to popvers
const utils = utilsFn({});
const isMobile = (window.innerWidth <= popover_thresh || document.body.clientWidth) <= popover_thresh || utils.isMobile();

// Probably a better way than declaring this up here, but ...
let popover = new Popover('#map-popover');
let center = null;

mapboxgl.accessToken = 'pk.eyJ1IjoiY2pkZDNiIiwiYSI6ImNqZWJtZWVsYjBoYTAycm1raTltdnpvOWgifQ.aPWEg8C-5IJ0_7cXusY-1g';

/********** INITIALIZE MAP **********/

// Set adaptive sizing
let mapHeight = window.innerWidth * adaptive_ratio;
document.getElementById("map").style.height = mapHeight.toString() + "px";

// Init map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/cjdd3b/cjmt2qdtt1bvv2stn3fp6bt33',
  center: [-94.6859, 47.7296],
  zoom: 2,
  maxBounds: [-97.25, 43.4, -89.53, 49.5],
  scrollZoom: false
});

// Setup basic map features
if (utils.isMobile()) {
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
} else {
  map.dragPan.disable();
  map.getCanvas().style.cursor = 'pointer';
}

/********** INITIALIZE GEOCODER **********/

// Make and attach geocoder
let geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    bbox: [-97.25, 43.4, -89.53, 49.5],
    zoom: 9,
    placeholder: "Search for an address"
});

// For completely mystifying reasons, the geocoder event fires twice. This prevents
// that from happening by tracking the last geocode.
let last_geocode = null;
geocoder.on('result', function(ev) {
  let r = ev.result.geometry;

  // Todo: Raise some kind of error if current geocode == last one?
  if (r.coordinates.toString() !== last_geocode) {
    // Close popover if open on mobile
    if (isMobile) {
      popover.close();
    }

    map.once('moveend', function(e) {
      // Highlight precinct once tiles are loaded
      let checker = setInterval(function(){ 
        if (map.areTilesLoaded()) {

          // Gotta project to pixels first, then get the feature
          let pixels = map.project(r.coordinates);

          // Get features from the main layer, then highlight using highlight layer
          let f = map.queryRenderedFeatures(pixels, {layers: ["mnprecinctsgeo"]})[0];
          map.setFilter("precincts-highlighted", ['==', 'id', f.properties.id]);

          // Open popover on mobile
          if (isMobile) {
            popover.open(f);
          }

          clearInterval(checker);
        }
      }, 100);
    });

    last_geocode = r.coordinates.toString();
  }
});

map.addControl(geocoder, 'top-right');

/********** MAP BEHAVIORS **********/

map.on('load', function() {
  // Prep popup
  let popup = new StribPopup(map);

  map.addLayer({
    "id": "precincts-highlighted",
    "type": "line",
    "source": "composite",
    "source-layer": "mnprecinctsgeo",
    "paint": {
      "line-color": "#000000"
    },
      "filter": ['in', 'id', '']
  }, 'place-city-sm'); // Place polygon under these labels.

  // Only allow dragpan after you zoom in
  map.on('zoomend', function(e) {
    if (map.getZoom() < 5 ) {
      map.dragPan.disable();
    } else {
      map.dragPan.enable();
    }
  });

  // Capture mousemove events on desktop and touch on mobile or small viewports
  if (isMobile) {
    map.on('click', 'mnprecinctsgeo', function(e) {
      let f = e.features[0];

      popover.open(f);

      // Scroll into view if popover is off the screen. jQuery assumed to
      // be on page because of Strib environment.
      if (!popover.is_in_viewport()) {
        $('html, body').animate({
          'scrollTop' : $("#map").offset().top
        });
      }

      // Highlight precinct on touch
      map.setFilter("precincts-highlighted", ['==', 'id', f.properties.id]);

      // Zoom and enhance! But only if you're not already zoomed in past 9
      let zoom = map.getZoom() < 9 ? 9 : map.getZoom();
      map.flyTo({center: e.lngLat, zoom: zoom});
    });
  // Handle mouseover events in desktop and non-mobile viewports
  } else {
    map.on('mousemove', 'mnprecinctsgeo', function(e) {
      popup.open(e);
    });

    map.on('mouseleave', 'mnprecinctsgeo', function() {
      popup.close();
    });
  }
});
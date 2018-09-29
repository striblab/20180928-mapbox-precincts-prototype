/**
 * Main JS file for project.
 */

// Define globals that are added through the js.globals in
// the config.json file, here like this:
// /* global _ */

// Utility functions, such as Pym integration, number formatting,
// and device checking

//import utilsFn from './utils.js';
//utilsFn({ });


// Import local ES6 modules like this:
//import utilsFn from './utils.js';

// Or import libraries installed with npm like this:
// import module from 'module';

// Utilize templates on the client.  Get the main content template.
//import Content from '../templates/_index-content.svelte.html';
//
// Get the data parts that are needed.  For larger data points,
// utilize window.fetch.  Add the build = true option in the buildData
// options.
// import content from '../content.json';

// OR: let content = await (await window.fetch('./assets/data/content.json')).json();
//

// const app = new Content({
//   target: document.querySelector('.main-app-container'),
//   data: {
//     content
//   }
// });

// import mapboxgl from 'mapbox-gl';
import * as topojson from "topojson";
import * as turf from '@turf/turf';
import mn from '../sources/mn-counties.json';
import precincts from '../sources/mn-precincts-geo.json';

let bounds = [-97.2, 43.4, -89.5, 49.5];

function polyMask(mask, bounds) {
  let bboxPoly = turf.bboxPolygon(bounds);
  return turf.difference(bboxPoly, mask);
}

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

// Let's just go ahead and assume there's a cleaner way to do this.      
let mask = turf.polygon(
  topojson.feature(mn, mn.objects.state).features[0].geometry.coordinates[0]
);
 
mapboxgl.accessToken = 'pk.eyJ1IjoiY2pkZDNiIiwiYSI6ImNqZWJtZWVsYjBoYTAycm1raTltdnpvOWgifQ.aPWEg8C-5IJ0_7cXusY-1g';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9',
  center: [-94.6859, 47.7296],
  zoom: 2,
  maxBounds: bounds,
  scrollZoom: false
});

// map.addControl(new mapboxgl.NavigationControl());
// map.addControl(new mapboxgl.FullscreenControl());
// map.dragRotate.disable();
// map.touchZoomRotate.disableRotation();

map.on('load', function() {
  map.addSource('mask', {
    "type": "geojson",
    "data": polyMask(mask, bounds)
  });

  map.addSource('precincts', {
    type: 'geojson',
    data: precincts
  });

  map.addLayer({
    "id": "zmask",
    "source": "mask",
    "type": "fill",
    "paint": {
      "fill-color": "white",
      'fill-opacity': .75
    }
  });

  map.addLayer({
      'id': 'precincts',
      'interactive': true,
      'source': 'precincts',
      'layout': {},
      'type': 'fill',
      'paint': {
        'fill-antialias': true,
        'fill-opacity': {
          'property': 'votes_sqmi',
          'stops': [[10, 0.1], [25, 0.25], [100, 0.5], [500, 0.75], [10000, 1.0]]
        },
        'fill-color': {
          'property': 'winner2016',
          'type': 'categorical',
          'stops': [['trump', '#C0272D'], ['clinton', '#0258A0'],['even', 'gray']]
        }
      }
  }, 'building');

  var popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
  });

  map.on('mousemove', 'precincts', function(e) {
    var coordinates = e.features[0].geometry.coordinates.slice();

    // Popup components
    var precinct = e.features[0].properties.precinct;
    var dfl = e.features[0].properties.dfl_votes;
    var gop = e.features[0].properties.gop_votes;

    // // Populate the popup and set its coordinates
    // // based on the feature found.
    popup.setLngLat(e.lngLat)
        .setHTML(makeTooltip(precinct, dfl, gop))
        .addTo(map);
  });

  map.on('mouseleave', 'precincts', function() {
      map.getCanvas().style.cursor = '';
      popup.remove();
  });

});

// For rough demo:
// PRICE ESTIMATE
//  - Load page: 1
//  - Zoom in and scroll around: XX

// If it's a go:
// CLEAN UP CODE
// CONFIRM ACCURACY
// PERFORMANCE
// ALIGN PRECINCTS TO BASEMAP SOMEHOW (unsimplified webgl layer?)
// FIX BASEMAP STYLES
// RESPONSIVENESS
// ADDRESS SEARCH
#! /usr/bin/env node

const Fs = require('fs');
const turf = require("@turf/turf");
const topojson = require("topojson");
const mn = require('./mn-counties.json');

let bounds = [-97.5, 43.4, -89.5, 49.5];

/********** HELPER FUNCTIONS **********/

function polyMask(mask, bounds) {
  let bboxPoly = turf.bboxPolygon(bounds);
  return turf.difference(bboxPoly, mask);
}

/********** MAIN **********/

let state = turf.polygon(
  topojson.feature(mn, mn.objects.state).features[0].geometry.coordinates[0]
);

let mask = polyMask(state, bounds);

Fs.writeFile('./mapbox/mn-mask.json', JSON.stringify(mask));
class StribPopup {

  constructor(map){
    this.popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 30
    });
    this.map = map;
  }

  _layout(precinct, dfl_votes, gop_votes) {
    return '<div class=".mapboxgl-popup"> \
      <h4 id="title">' + precinct + '</h4> \
      <table> \
        <thead> \
          <tr> \
            <th>Candidate</th> \
            <th class="right">Votes</th> \
          </tr> \
        </thead> \
        <tbody> \
          <tr> \
            <td><span class="label-d"></span>Dayton</td> \
            <td id="votes-d" class="right">' + dfl_votes + '</td> \
          </tr> \
          <tr> \
            <td><span class="label-r"></span>Johnson</td> \
            <td id="votes-r" class="right">' + gop_votes + '</td> \
          </tr>\
        </tbody> \
      </table> \
    </div>';
  }

  open(e) {
    var coordinates = e.features[0].geometry.coordinates.slice();

    // Popup components
    var precinct = e.features[0].properties.precinct;
    let dfl_votes = e.features[0].properties.dfl_votes ? e.features[0].properties.dfl_votes : '-';
    let gop_votes = e.features[0].properties.gop_votes ? e.features[0].properties.gop_votes : '-';

    // Populate the popup and set its coordinates
    // based on the feature found.
    this.popup.setLngLat(e.lngLat)
      .setHTML(this._layout(precinct, dfl_votes, gop_votes))
      .addTo(this.map);
  }
 
  close() {
    this.popup.remove();
  }

}

export default StribPopup;
class StribPopup {

  constructor(map){
    this.popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 30
    });
    this.map = map;
  }

  _get_candidate(party) {
    if (party == 'DFL') {
      return 'Walz';
    } else if (party == 'R') {
      return 'Johnson';
    } else if (party == 'GLC') {
      return 'Wright';
    } else if (party == 'LIB') {
      return 'Welter';
    } else if (party == 'WI') {
      return 'Write-in';
    } else {
      return 'Other';
    }
  }

  _get_label(party) {
    if (party == 'DFL') {
      return 'label-d';
    } else if (party == 'R') {
      return 'label-r';
    } else {
      return 'label-oth';
    }
  }

  _layout(precinct, votes_obj) {
    let winner = votes_obj[0];
    let second = votes_obj[1];

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
            <td><span class="' + this._get_label(winner.party) + '"></span>' + this._get_candidate(winner.party) + '</td> \
            <td id="votes-d" class="right">' + winner.votes + '</td> \
          </tr> \
          <tr> \
            <td><span class="' + this._get_label(second.party) + '"></span>' + this._get_candidate(second.party) + '</td> \
            <td id="votes-r" class="right">' + second.votes + '</td> \
          </tr>\
        </tbody> \
      </table> \
    </div>';
  }

  open(e) {
    var coordinates = e.features[0].geometry.coordinates.slice();

    // Popup components
    let precinct = e.features[0].properties.precinct;
    let votes_obj = eval(e.features[0].properties.votes_obj);

    // Populate the popup and set its coordinates
    // based on the feature found.
    this.popup.setLngLat(e.lngLat)
      .setHTML(this._layout(precinct, votes_obj))
      .addTo(this.map);
  }
 
  close() {
    this.popup.remove();
  }

}

export default StribPopup;
class Popover {

  constructor(el){
    this.el = el;
  }

  _layout(precinct, dfl_votes, gop_votes, dfl_pct, gop_pct) {
    return '<div id="popover-header"> \
      <h4 id="title">' + precinct + '</h4> \
      <span id="close">&#10006;</span> \
    </div> \
    <table> \
      <thead> \
        <tr> \
          <th>Candidate</th> \
          <th class="right">Votes</th> \
          <th class="right">Pct.</th> \
        </tr> \
      </thead> \
      <tbody> \
        <tr> \
          <td><span class="label-d"></span>Dayton</td> \
          <td id="votes-d" class="right">' + dfl_votes + '</td> \
          <td id="pct-d" class="right">' + Math.round(dfl_pct) + '%</td> \
        </tr> \
        <tr> \
          <td><span class="label-r"></span>Johnson</td> \
          <td id="votes-r" class="right">' + gop_votes + '</td> \
          <td id="pct-r" class="right">' + Math.round(gop_pct) + '%</td> \
        </tr>\
      </tbody> \
    </table>';
  }

  is_in_viewport() {
    let el = document.querySelector(this.el);

    var top = el.offsetTop;
    var left = el.offsetLeft;
    var width = el.offsetWidth;
    var height = el.offsetHeight;

    while(el.offsetParent) {
      el = el.offsetParent;
      top += el.offsetTop;
      left += el.offsetLeft;
    }

    return (
      top < (window.pageYOffset + window.innerHeight) &&
      left < (window.pageXOffset + window.innerWidth) &&
      (top + height) > window.pageYOffset &&
      (left + width) > window.pageXOffset
    );
  }

  open(f) {
    var self = this;

    // Create and populate popover if mobile or small viewport
    let precinct = f.properties.precinct;
    let dfl_votes = f.properties.dfl_votes ? f.properties.dfl_votes : '-';
    let gop_votes = f.properties.gop_votes ? f.properties.gop_votes : '-';
    let dfl_pct = f.properties.dfl_pct ? f.properties.dfl_pct : '-';
    let gop_pct = f.properties.gop_pct ? f.properties.gop_pct : '-';

    let el = document.querySelector(this.el);
    el.innerHTML = this._layout(precinct, dfl_votes, gop_votes, dfl_pct, gop_pct);

    let close_button = el.querySelector('#close');
    close_button.onclick = function() {
      self.close();
    }

    if (el.style.visibility != 'visible') {
      el.style.visibility = 'visible';
    }
  }
 
  close() {
    let el = document.querySelector('#map-popover');
    if (el.style.visibility == 'visible') {
      el.style.visibility = 'hidden';
    }
  }

}

export default Popover;
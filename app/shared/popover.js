class Popover {

  constructor(el){
    this.el = el;
  }

  _layout(precinct, dfl, gop) {
    return '<div id="popover-header"> \
      <h4 id="title">' + precinct + '</h4> \
      <span id="close">&#10006;</span> \
    </div> \
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
    </table>';
  }

  open(precinct, dfl, gop) {
    var self = this;

    let el = document.querySelector(this.el);
    el.innerHTML = this._layout(precinct, dfl, gop);

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
const Impetus = require('Impetus');

class Wicket {

  constructor (elm, options) {

    // global vars
    this.hatches = document.querySelectorAll(elm);
    this.scrollPoints = [];
    this.interval = false;
    this.is_init = false;
    this.scroller = null;
    this.index = 0;
    this.lastScrollTop = 0;

    // defaults
    const defaults = {
      'touch': true
    }

    // create options by extending defaults with the passed in arugments
    if (arguments[1] && typeof arguments[1] === 'object') {
      this.options = extendDefaults(defaults, arguments[1]);
    } else {
      this.options = defaults;
    }

    try {
      if (this.hatches.length < 1) throw 'No matching elements found';
      this.init();
    }
    catch (err) {
      log (err);
    }

  }

  bindEvents () {
    if (!is_touch_device() && !this.interval) {
      this.interval = setInterval(() => this.handleScroll(), 20);
    } else {
      if (this.options.touch === true) {
        // calculate outer bounds
        let h = (parseInt(this.scroller.style.height) - window.innerHeight) * -1;
        new Impetus({
          source: document.querySelector('body'),
          multiplier: 1.3,
          boundY: [h, 0],
          update: (x, y) => {
            this.handleScroll('touch', y);
          }
        });
      }
    }
  }

  bindListeners () {
    this.listener = () => {
      this.calcScrollPoints();
    }
    window.addEventListener('resize', this.listener);
    window.addEventListener('orientationchange', this.listener);
  }


  calcScrollPoints () {
    // empty out the array
    this.scrollPoints = [];

    // // calc height of panes
    for (let i = 0, len = this.hatches.length; i < len; i++) {
        let oHeight = this.hatches[i].offsetHeight;
        let nHeight = (i > 0) ? (oHeight + this.scrollPoints[i - 1]) : oHeight;
        this.scrollPoints.push(nHeight);
    }

    // prepend 0 to the array
    this.scrollPoints.unshift(0);

    // set the scrolling height
    this.scroller.style.height = this.scrollPoints[this.scrollPoints.length - 1] + 'px';
  }

  createScroller () {
    this.scroller = document.createElement('div');
    this.scroller.style.position = 'absolute';
    this.scroller.style.width = '1px';
    document.body.appendChild(this.scroller);
  }

  destroy () {
    if (this.is_init) {
      clearInterval (this.interval);
      this.interval = false;
      this.is_init = false;
      window.removeEventListener('resize', this.listener);
      window.removeEventListener('scroll', this.listener);
      this.resetScreens();
    }
  }

  handleScroll (event, offset) {
    let nOffset = offset || (window.pageYOffset * -1);
    let hatch = this.hatches[this.index];
    let scrollOffset = (nOffset + this.scrollPoints[this.index]);
    hatch.style['transform'] = `translate3d(0px,${scrollOffset}px,0px)`;
    hatch.style['-ms-transform'] = `translate3d(0px,${scrollOffset}px,0px)`;
    hatch.style['-webkit-transform'] = `translate3d(0px,${scrollOffset}px,0px)`;

    // force element repaint on touch devices
    if (is_touch_device() && !hatch.dataset.haspaint) {
      hatch.style.display = 'none';
      hatch.offsetHeight; // no need to store this anywhere, the reference is enough
      hatch.style.display = '';
      hatch.dataset.haspaint = 'yes';
    }

    if ((nOffset * -1) > this.scrollPoints[this.index + 1]) {
      this.index++;
      this.index = Math.min(this.index, this.hatches.length - 2);
    }

    if ((nOffset * -1) < this.scrollPoints[this.index]) {
      // make all the panels hard snap to the top, except the first one, which may bounce
      if (this.index > 0) {
        hatch.style['transform'] = `translate3d(0px,0px,0px)`;
        hatch.style['-ms-transform'] = `translate3d(0px,0px,0px)`;
        hatch.style['-webkit-transform'] = `translate3d(0px,0px,0px)`;
      }

      this.index--;
      this.index = Math.max(0, this.index);
    }
  }

  fixHatches () {
    for (let i = 0, len = this.hatches.length; i < len; i++) {
      this.hatches[i].style.position = 'fixed';
      this.hatches[i].style.zIndex = this.hatches.length - i;

    }
  }

  has_init () {
    return this.is_init;
  }

  init () {
    if (!this.is_init) {
      this.createScroller();
      this.fixHatches();
      this.calcScrollPoints();
      this.bindListeners();
      this.bindEvents();
      this.is_init = true;
      }
  }

  refresh () {
    this.init();
  }

  resetScreens () {
    for (let i = 0, len = this.hatches.length; i < len; i++) {
      this.hatches[i].removeAttribute('style');
    }
    document.body.removeChild(this.scroller);
  }

}

const log = function (msg) {
  if (window.console && window.console.error) {
    console.error (msg);
  }
}

const is_touch_device = function() {
  return (('ontouchstart' in window)
    || (navigator.MaxTouchPoints > 0)
    || (navigator.msMaxTouchPoints > 0));
}

global.Wicket = module.exports = Wicket;

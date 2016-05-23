(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['exports', 'module'], factory);
	} else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		factory(exports, module);
	} else {
		var mod = {
			exports: {}
		};
		factory(mod.exports, mod);
		global.Impetus = mod.exports;
	}
})(this, function (exports, module) {
	'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var stopThresholdDefault = 0.3;
	var bounceDeceleration = 0.04;
	var bounceAcceleration = 0.11;

	var Impetus = function Impetus(_ref) {
		var _ref$source = _ref.source;
		var sourceEl = _ref$source === undefined ? document : _ref$source;
		var updateCallback = _ref.update;
		var _ref$multiplier = _ref.multiplier;
		var multiplier = _ref$multiplier === undefined ? 1 : _ref$multiplier;
		var _ref$friction = _ref.friction;
		var friction = _ref$friction === undefined ? 0.92 : _ref$friction;
		var initialValues = _ref.initialValues;
		var boundX = _ref.boundX;
		var boundY = _ref.boundY;
		var _ref$bounce = _ref.bounce;
		var bounce = _ref$bounce === undefined ? true : _ref$bounce;

		_classCallCheck(this, Impetus);

		var boundXmin, boundXmax, boundYmin, boundYmax, pointerLastX, pointerLastY, pointerCurrentX, pointerCurrentY, pointerId, decVelX, decVelY;
		var targetX = 0;
		var targetY = 0;
		var stopThreshold = stopThresholdDefault * multiplier;
		var ticking = false;
		var pointerActive = false;
		var paused = false;
		var decelerating = false;
		var trackingPoints = [];

		/**
   * Initialize instance
   */
		(function init() {
			sourceEl = typeof sourceEl === 'string' ? document.querySelector(sourceEl) : sourceEl;
			if (!sourceEl) {
				throw new Error('IMPETUS: source not found.');
			}

			if (!updateCallback) {
				throw new Error('IMPETUS: update function not defined.');
			}

			if (initialValues) {
				if (initialValues[0]) {
					targetX = initialValues[0];
				}
				if (initialValues[1]) {
					targetY = initialValues[1];
				}
				callUpdateCallback();
			}

			// Initialize bound values
			if (boundX) {
				boundXmin = boundX[0];
				boundXmax = boundX[1];
			}
			if (boundY) {
				boundYmin = boundY[0];
				boundYmax = boundY[1];
			}

			sourceEl.addEventListener('touchstart', onDown);
			sourceEl.addEventListener('mousedown', onDown);
		})();

		/**
   * Disable movement processing
   * @public
   */
		this.pause = function () {
			pointerActive = false;
			paused = true;
		};

		/**
   * Enable movement processing
   * @public
   */
		this.resume = function () {
			paused = false;
		};

		/**
   * Update the current x and y values
   * @public
   * @param {Number} x
   * @param {Number} y
   */
		this.setValues = function (x, y) {
			if (typeof x === 'number') {
				targetX = x;
			}
			if (typeof y === 'number') {
				targetY = y;
			}
		};

		/**
   * Update the multiplier value
   * @public
   * @param {Number} val
   */
		this.setMultiplier = function (val) {
			multiplier = val;
			stopThreshold = stopThresholdDefault * multiplier;
		};

		/**
   * Executes the update function
   */
		function callUpdateCallback() {
			updateCallback.call(sourceEl, targetX, targetY);
		}

		/**
   * Creates a custom normalized event object from touch and mouse events
   * @param  {Event} ev
   * @returns {Object} with x, y, and id properties
   */
		function normalizeEvent(ev) {
			if (ev.type === 'touchmove' || ev.type === 'touchstart' || ev.type === 'touchend') {
				var touch = ev.targetTouches[0] || ev.changedTouches[0];
				return {
					x: touch.clientX,
					y: touch.clientY,
					id: touch.identifier
				};
			} else {
				// mouse events
				return {
					x: ev.clientX,
					y: ev.clientY,
					id: null
				};
			}
		}

		/**
   * Initializes movement tracking
   * @param  {Object} ev Normalized event
   */
		function onDown(ev) {
			var event = normalizeEvent(ev);
			if (!pointerActive && !paused) {
				pointerActive = true;
				decelerating = false;
				pointerId = event.id;

				pointerLastX = pointerCurrentX = event.x;
				pointerLastY = pointerCurrentY = event.y;
				trackingPoints = [];
				addTrackingPoint(pointerLastX, pointerLastY);

				document.addEventListener('touchmove', onMove);
				document.addEventListener('touchend', onUp);
				document.addEventListener('touchcancel', stopTracking);
				document.addEventListener('mousemove', onMove);
				document.addEventListener('mouseup', onUp);
			}
		}

		/**
   * Handles move events
   * @param  {Object} ev Normalized event
   */
		function onMove(ev) {
			ev.preventDefault();
			var event = normalizeEvent(ev);

			if (pointerActive && event.id === pointerId) {
				pointerCurrentX = event.x;
				pointerCurrentY = event.y;
				addTrackingPoint(pointerLastX, pointerLastY);
				requestTick();
			}
		}

		/**
   * Handles up/end events
   * @param {Object} ev Normalized event
   */
		function onUp(ev) {
			var event = normalizeEvent(ev);

			if (pointerActive && event.id === pointerId) {
				stopTracking();
			}
		}

		/**
   * Stops movement tracking, starts animation
   */
		function stopTracking() {
			pointerActive = false;
			addTrackingPoint(pointerLastX, pointerLastY);
			startDecelAnim();

			document.removeEventListener('touchmove', onMove);
			document.removeEventListener('touchend', onUp);
			document.removeEventListener('touchcancel', stopTracking);
			document.removeEventListener('mouseup', onUp);
			document.removeEventListener('mousemove', onMove);
		}

		/**
   * Records movement for the last 100ms
   * @param {number} x
   * @param {number} y [description]
   */
		function addTrackingPoint(x, y) {
			var time = Date.now();
			while (trackingPoints.length > 0) {
				if (time - trackingPoints[0].time <= 100) {
					break;
				}
				trackingPoints.shift();
			}

			trackingPoints.push({ x: x, y: y, time: time });
		}

		/**
   * Calculate new values, call update function
   */
		function updateAndRender() {
			var pointerChangeX = pointerCurrentX - pointerLastX;
			var pointerChangeY = pointerCurrentY - pointerLastY;

			targetX += pointerChangeX * multiplier;
			targetY += pointerChangeY * multiplier;

			if (bounce) {
				var diff = checkBounds();
				if (diff.x !== 0) {
					targetX -= pointerChangeX * dragOutOfBoundsMultiplier(diff.x) * multiplier;
				}
				if (diff.y !== 0) {
					targetY -= pointerChangeY * dragOutOfBoundsMultiplier(diff.y) * multiplier;
				}
			} else {
				checkBounds(true);
			}

			callUpdateCallback();

			pointerLastX = pointerCurrentX;
			pointerLastY = pointerCurrentY;
			ticking = false;
		}

		/**
   * Returns a value from around 0.5 to 1, based on distance
   * @param {Number} val
   */
		function dragOutOfBoundsMultiplier(val) {
			return 0.000005 * Math.pow(val, 2) + 0.0001 * val + 0.55;
		}

		/**
   * prevents animating faster than current framerate
   */
		function requestTick() {
			if (!ticking) {
				requestAnimFrame(updateAndRender);
			}
			ticking = true;
		}

		/**
   * Determine position relative to bounds
   * @param {Boolean} restrict Whether to restrict target to bounds
   */
		function checkBounds(restrict) {
			var xDiff = 0;
			var yDiff = 0;

			if (boundXmin !== undefined && targetX < boundXmin) {
				xDiff = boundXmin - targetX;
			} else if (boundXmax !== undefined && targetX > boundXmax) {
				xDiff = boundXmax - targetX;
			}

			if (boundYmin !== undefined && targetY < boundYmin) {
				yDiff = boundYmin - targetY;
			} else if (boundYmax !== undefined && targetY > boundYmax) {
				yDiff = boundYmax - targetY;
			}

			if (restrict) {
				if (xDiff !== 0) {
					targetX = xDiff > 0 ? boundXmin : boundXmax;
				}
				if (yDiff !== 0) {
					targetY = yDiff > 0 ? boundYmin : boundYmax;
				}
			}

			return {
				x: xDiff,
				y: yDiff,
				inBounds: xDiff === 0 && yDiff === 0
			};
		}

		/**
   * Initialize animation of values coming to a stop
   */
		function startDecelAnim() {
			var firstPoint = trackingPoints[0];
			var lastPoint = trackingPoints[trackingPoints.length - 1];

			var xOffset = lastPoint.x - firstPoint.x;
			var yOffset = lastPoint.y - firstPoint.y;
			var timeOffset = lastPoint.time - firstPoint.time;

			var D = timeOffset / 15 / multiplier;

			decVelX = xOffset / D || 0; // prevent NaN
			decVelY = yOffset / D || 0;

			var diff = checkBounds();

			if (Math.abs(decVelX) > 1 || Math.abs(decVelY) > 1 || !diff.inBounds) {
				decelerating = true;
				requestAnimFrame(stepDecelAnim);
			}
		}

		/**
   * Animates values slowing down
   */
		function stepDecelAnim() {
			if (!decelerating) {
				return;
			}

			decVelX *= friction;
			decVelY *= friction;

			targetX += decVelX;
			targetY += decVelY;

			var diff = checkBounds();

			if (Math.abs(decVelX) > stopThreshold || Math.abs(decVelY) > stopThreshold || !diff.inBounds) {

				if (bounce) {
					var reboundAdjust = 2.5;

					if (diff.x !== 0) {
						if (diff.x * decVelX <= 0) {
							decVelX += diff.x * bounceDeceleration;
						} else {
							var adjust = diff.x > 0 ? reboundAdjust : -reboundAdjust;
							decVelX = (diff.x + adjust) * bounceAcceleration;
						}
					}
					if (diff.y !== 0) {
						if (diff.y * decVelY <= 0) {
							decVelY += diff.y * bounceDeceleration;
						} else {
							var adjust = diff.y > 0 ? reboundAdjust : -reboundAdjust;
							decVelY = (diff.y + adjust) * bounceAcceleration;
						}
					}
				} else {
					if (diff.x !== 0) {
						if (diff.x > 0) {
							targetX = boundXmin;
						} else {
							targetX = boundXmax;
						}
						decVelX = 0;
					}
					if (diff.y !== 0) {
						if (diff.y > 0) {
							targetY = boundYmin;
						} else {
							targetY = boundYmax;
						}
						decVelY = 0;
					}
				}

				callUpdateCallback();

				requestAnimFrame(stepDecelAnim);
			} else {
				decelerating = false;
			}
		}
	}

	/**
  * @see http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
  */
	;

	module.exports = Impetus;
	var requestAnimFrame = (function () {
		return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
			window.setTimeout(callback, 1000 / 60);
		};
	})();
});

},{}],2:[function(require,module,exports){
(function (global){
(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'Impetus'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, require('Impetus'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, global.Impetus);
    global.Wicket = mod.exports;
  }
})(this, function (module, Impetus) {
  'use strict';

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
  };

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var Wicket = function () {
    function Wicket(elm, options) {
      _classCallCheck(this, Wicket);

      // global vars
      this.hatches = document.querySelectorAll(elm);
      this.impetus = null;
      this.scrollPoints = [];
      this.interval = false;
      this.is_init = false;
      this.scroller = null;
      this.index = 0;
      this.scrollOffset = 0;
      this.lastScrollTop = 0;

      // defaults
      var defaults = {
        'touch': true,
        'change': null
      };

      // create options by extending defaults with the passed in arugments
      if (arguments[1] && _typeof(arguments[1]) === 'object') {
        this.options = extendDefaults(defaults, arguments[1]);
      } else {
        this.options = defaults;
      }

      try {
        if (this.hatches.length < 1) throw 'No matching elements found';
        this.init();
      } catch (err) {
        log(err);
      }
    }

    _createClass(Wicket, [{
      key: 'bindEvents',
      value: function bindEvents() {
        var _this = this;

        if (!is_touch_device() && !this.interval) {
          (function () {
            var repeatOften = function repeatOften() {
              _this.handleScroll();
              _this.interval = requestAnimationFrame(repeatOften);
            };
            repeatOften();
          })();
        } else {
          if (this.options.touch === true) {
            // calculate outer bounds
            // this.interval = setInterval(() => this.handleScroll(), 20);
            var h = (parseInt(this.scroller.style.height) - window.innerHeight) * -1;
            this.impetus = new Impetus({
              source: document.body,
              multiplier: 1.5,
              boundY: [h, 0],
              update: function update(x, y) {
                _this.handleScroll('touch', y);
              }
            });
          }
        }
      }
    }, {
      key: 'handleScroll',
      value: function handleScroll(event, offset) {
        // incoming offset should be negative
        offset = offset == 0 ? -0.001 : offset;
        var nOffset = offset || window.scrollY * -1;
        var hatch = this.hatches[this.index];
        var scrollOffset = nOffset + this.scrollPoints[this.index];
        var oIndex = this.index;
        translateY(hatch, scrollOffset);

        // keep track of the current scrollOffset
        this.scrollOffset = nOffset;

        // force element repaint on touch devices
        if (is_touch_device() && !hatch.dataset.haspaint) {
          hatch.style.display = 'none';
          hatch.offsetHeight; // no need to store this anywhere, the reference is enough
          hatch.style.display = '';
          hatch.dataset.haspaint = 'yes';
        }

        if (nOffset * -1 > this.scrollPoints[this.index + 1]) {
          this.index++;
          this.index = Math.min(this.index, this.hatches.length - 1);
          this.callChangeCallback();
        }

        if (nOffset * -1 < this.scrollPoints[this.index]) {
          // make all the panels hard snap to the top, except the first one, which may bounce
          if (this.index > 0) {
            translateY(hatch, 0);
          }

          this.index--;
          this.index = Math.max(0, this.index);
          this.callChangeCallback();
        }
      }
    }, {
      key: 'bindListeners',
      value: function bindListeners() {
        var _this2 = this;

        this.listener = function () {
          _this2.calcScrollPoints();
        };
        window.addEventListener('resize', this.listener);
        window.addEventListener('orientationchange', this.listener);
      }
    }, {
      key: 'calcScrollPoints',
      value: function calcScrollPoints() {
        // empty out the array
        this.scrollPoints = [];

        // // calc height of panes
        for (var i = 0, len = this.hatches.length; i < len; i++) {
          var oHeight = this.hatches[i].offsetHeight;
          var nHeight = i > 0 ? oHeight + this.scrollPoints[i - 1] : oHeight;
          this.scrollPoints.push(nHeight);
        }

        // prepend 0 to the array
        this.scrollPoints.unshift(0);

        // set the scrolling height
        this.scroller.style.height = this.scrollPoints[this.scrollPoints.length - 1] + 'px';
      }
    }, {
      key: 'callChangeCallback',
      value: function callChangeCallback() {
        var getType = {};
        if (this.options.change && getType.toString.call(this.options.change) === '[object Function]') {
          this.options.change.call(this, this.index);
        }
      }
    }, {
      key: 'createScroller',
      value: function createScroller() {
        this.scroller = document.createElement('div');
        this.scroller.style.position = 'absolute';
        this.scroller.style.width = '1px';
        document.body.appendChild(this.scroller);
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        if (this.is_init) {
          clearInterval(this.interval);
          this.interval = false;
          this.is_init = false;
          if (this.impetus) {
            this.impetus.pause();
          }
          window.removeEventListener('resize', this.listener);
          window.removeEventListener('scroll', this.listener);
          this.resetScreens();
        }
      }
    }, {
      key: 'fixHatches',
      value: function fixHatches() {
        for (var i = 0, len = this.hatches.length; i < len; i++) {
          this.hatches[i].style.position = 'fixed';
          this.hatches[i].style.zIndex = this.hatches.length - i;
        }
      }
    }, {
      key: 'has_init',
      value: function has_init() {
        return this.is_init;
      }
    }, {
      key: 'init',
      value: function init() {
        if (!this.is_init) {
          this.createScroller();
          this.fixHatches();
          this.calcScrollPoints();
          this.bindListeners();
          this.bindEvents();
          this.callChangeCallback();
          if (this.impetus) {
            this.impetus.resume();
          }
          this.is_init = true;
        }
      }
    }, {
      key: 'refresh',
      value: function refresh() {
        this.init();
      }
    }, {
      key: 'resetScreens',
      value: function resetScreens() {
        for (var i = 0, len = this.hatches.length; i < len; i++) {
          this.hatches[i].removeAttribute('style');
        }
        document.body.removeChild(this.scroller);
      }
    }, {
      key: 'scrollTo',
      value: function scrollTo(id) {
        var _this3 = this;

        var interval = void 0;
        var elm = document.querySelector(id);
        var nodeList = Array.prototype.slice.call(elm.parentNode.children);
        var index = nodeList.indexOf(elm);

        if (interval) clearInterval(interval); // clear the interval when there is one set

        // update index value
        this.index = index;

        var start = this.scrollOffset;
        var end = this.scrollPoints[index] * -1;
        var delta = start;
        var scrollSpeed = 55;

        if (!is_touch_device()) {
          (function () {
            var time = 350;
            var start = new Date().getTime();
            var interval = setInterval(function () {
              var step = Math.min(1, (new Date().getTime() - start) / time);
              document.body.scrollTop = window.pageYOffset + step * (end * -1 - window.pageYOffset);
              if (step == 1) clearInterval(interval);
            }, scrollSpeed);
            document.body.scrollTop = window.pageYOffset;
          })();
        } else {
          (function () {
            var interval = setInterval(function () {

              if (start < end) {
                if (delta >= end) clearInterval(interval);
                delta = parseFloat(Math.min(delta += scrollSpeed, end)) + 0.001;
              } else {
                if (delta <= end) clearInterval(interval);
                delta = parseFloat(Math.max(delta -= scrollSpeed, end)) - 0.001;
              }

              // scroll to panel
              _this3.handleScroll('touch', delta);

              // update impetus values
              if (_this3.impetus) {
                _this3.impetus.setValues(0, end);
              }
            }, 10);
          })();
        }
      }
    }, {
      key: 'setValues',
      value: function setValues(x, y) {
        this.impetus.setValues(x, y);
      }
    }]);

    return Wicket;
  }();

  var translateY = function translateY(obj, val) {
    obj.style['transform'] = 'translate3d(0px,' + val + 'px,0px)';
    obj.style['-ms-transform'] = 'translate3d(0px,' + val + 'px,0px)';
    obj.style['-webkit-transform'] = 'translate3d(0px,' + val + 'px,0px)';
  };

  var extendDefaults = function extendDefaults(source, properties) {
    var property;
    for (property in properties) {
      if (properties.hasOwnProperty(property)) {
        source[property] = properties[property];
      }
    }
    return source;
  };

  var log = function log(msg) {
    if (window.console && window.console.error) {
      console.error(msg);
    }
  };

  var is_touch_device = function is_touch_device() {
    return 'ontouchstart' in window || navigator.MaxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
  };

  // requestAnimationFrame for Smart Animating http://goo.gl/sx5sts
  var requestAnimFrame = function requestAnimFrame() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
      window.setTimeout(callback, 1000 / 60);
    };
  };

  global.Wicket = module.exports = Wicket;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"Impetus":1}]},{},[2]);
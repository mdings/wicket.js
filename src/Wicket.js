const Impetus = require('Impetus')

class Wicket {

    constructor(elm, options) {

        // global vars
        this.hatches = document.querySelectorAll(elm)
        this.impetus = null
        this.scrollPoints = []
        this.interval = false
        this.is_init = false
        this.scroller = null
        this.index = 0
        this.scrollOffset = 0
        this.lastScrollTop = 0

        // defaults 
        const defaults = {

            'touch': true,
            'change': null
        }

        // create options by extending defaults with the passed in arugments
        if (arguments[1] && typeof arguments[1] === 'object') {
            
            this.options = extendDefaults(defaults, arguments[1])

        } else {

            this.options = defaults
        }

        try {

            if (this.hatches.length < 1) throw 'No matching elements found'
            this.init()
        }
        catch (err) {

            log (err)
        }
    }

    bindEvents() {

        if (!is_touch_device() && !this.interval) {

            let repeatOften = () => {

                this.handleScroll()
                this.interval = requestAnimationFrame(repeatOften)
            }

            repeatOften()

        } else {

            if (this.options.touch === true) {

                // calculate outer bounds
                // this.interval = setInterval(() => this.handleScroll(), 20);
                let h = (parseInt(this.scroller.style.height) - window.innerHeight) * -1

                this.impetus = new Impetus({
                    source: document.body,
                    multiplier: 1.5,
                    boundY: [h, 0],
                    update: (x, y) => {
                        this.handleScroll('touch', y)
                    }
                })
            }
        }
    }

    handleScroll(event, offset) {

        // incoming offset should be negative
        offset = (offset == 0) ? -0.001 : offset
        let nOffset = offset || (window.scrollY * -1)
        let hatch = this.hatches[this.index]
        let scrollOffset = (nOffset + this.scrollPoints[this.index])
        let oIndex = this.index

        translateY(hatch, scrollOffset)

        // keep track of the current scrollOffset
        this.scrollOffset = nOffset

        // force element repaint on touch devices
        if (is_touch_device() && !hatch.dataset.haspaint) {

            hatch.style.display = 'none'
            hatch.offsetHeight; // no need to store this anywhere, the reference is enough
            hatch.style.display = ''
            hatch.dataset.haspaint = 'yes'
        }

        if ((nOffset * -1) > this.scrollPoints[this.index + 1]) {

            this.index++
            this.index = Math.min(this.index, this.hatches.length - 1)
            this.callChangeCallback()
        }

        if ((nOffset * -1) < this.scrollPoints[this.index]) {

            // make all the panels hard snap to the top, except the first one, which may bounce
            if (this.index > 0) {
                
                translateY(hatch, 0)
            }

            this.index--
            this.index = Math.max(0, this.index)
            this.callChangeCallback()
        }
    }

    bindListeners() {

        this.listener = () => {

            this.calcScrollPoints()
        }

        window.addEventListener('resize', this.listener)
        window.addEventListener('orientationchange', this.listener)
    }

    calcScrollPoints() {

        // empty out the array
        this.scrollPoints = [];

        // // calc height of panes
        for (let i = 0, len = this.hatches.length; i < len; i++) {

            let oHeight = this.hatches[i].offsetHeight
            let nHeight = (i > 0) ? (oHeight + this.scrollPoints[i - 1]) : oHeight
            this.scrollPoints.push(nHeight)
        }

        // prepend 0 to the array
        this.scrollPoints.unshift(0)

        // set the scrolling height
        this.scroller.style.height = this.scrollPoints[this.scrollPoints.length - 1] + 'px'
    }

    callChangeCallback() {

        let getType = {};

        if (this.options.change && getType.toString.call(this.options.change) === '[object Function]') {

            this.options.change.call(this, this.index)
        }
    }

    createScroller() {

        this.scroller = document.createElement('div')
        this.scroller.style.position = 'absolute'
        this.scroller.style.width = '1px'
        document.body.appendChild(this.scroller)
    }

    destroy() {

        if (this.is_init) {

            clearInterval (this.interval)
            this.interval = false
            this.is_init = false

            if(this.impetus) {

                this.impetus.pause()
            }

            window.removeEventListener('resize', this.listener)
            window.removeEventListener('scroll', this.listener)
            this.resetScreens()
        }
    }

    fixHatches() {

        for (let i = 0, len = this.hatches.length; i < len; i++) {

            this.hatches[i].style.position = 'fixed'
            this.hatches[i].style.zIndex = this.hatches.length - i
        }
    }

    hasInit() {

        return this.is_init
    }

    init() {

        if (!this.is_init) {

            this.createScroller();
            this.fixHatches();
            this.calcScrollPoints();
            this.bindListeners();
            this.bindEvents();
            this.callChangeCallback();
      
            if(this.impetus) {

                this.impetus.resume();
            }

            this.is_init = true;
        }
    }

    refresh() {

        this.init()
    }

    resetScreens() {

        for (let i = 0, len = this.hatches.length; i < len; i++) {

            this.hatches[i].removeAttribute('style');
        }

        document.body.removeChild(this.scroller);
    }

    scrollTo (id) {
        
        let interval
        let elm = document.querySelector(id)
        let nodeList = Array.prototype.slice.call(elm.parentNode.children)
        let index = nodeList.indexOf(elm)

         if (interval) clearInterval (interval) // clear the interval when there is one set
    
        // update index value
        this.index = index;

        let start = this.scrollOffset
        let end = this.scrollPoints[index] * -1
        let delta = start
        let scrollSpeed = 55

        if (!is_touch_device()) {

            let time = 350;
            let start = new Date().getTime()

            let interval = setInterval(() => {

                let step = Math.min (1, (new Date().getTime() - start) / time)
                document.body.scrollTop = window.pageYOffset + step * ((end * -1) - window.pageYOffset)
        
                if (step == 1) clearInterval (interval)
            }, scrollSpeed);

            document.body.scrollTop = window.pageYOffset

        } else {

            let interval = setInterval(() => {

                if (start < end) {

                    if (delta >= end) clearInterval(interval)

                    delta = parseFloat(Math.min(delta += scrollSpeed, end)) + 0.001
                } else {

                    if (delta <= end) clearInterval(interval)
                    
                    delta = parseFloat(Math.max(delta -= scrollSpeed, end)) - 0.001
                }

                // scroll to panel
                this.handleScroll('touch', delta);

                // update impetus values
                if(this.impetus) {

                    this.impetus.setValues(0, end)
                }

            }, 10);
        }
    }

    setValues(x,y) {

        this.impetus.setValues(x,y)
    }
}

const translateY = (obj, val) => {

    obj.style['transform'] = `translate3d(0px,${val}px,0px)`
    obj.style['-ms-transform'] = `translate3d(0px,${val}px,0px)`
    obj.style['-webkit-transform'] = `translate3d(0px,${val}px,0px)`
}

const extendDefaults =  (source, properties) => {

    const property;

    for (property in properties) {

        if (properties.hasOwnProperty(property)) {

            source[property] = properties[property]
        }
    }

    return source;
}

const log = (msg) => {

    if (window.console && window.console.error) {

        console.error (msg)
    }
}

const is_touch_device = () => {

    return (('ontouchstart' in window)
        || (navigator.MaxTouchPoints > 0)
        || (navigator.msMaxTouchPoints > 0))
}

// requestAnimationFrame for Smart Animating http://goo.gl/sx5sts
const requestAnimFrame = (() => {

    return  window.requestAnimationFrame
        || window.webkitRequestAnimationFrame
        || window.mozRequestAnimationFrame
        || (callback) => { 
            
            window.setTimeout(callback, 1000 / 60) 
        }
});

global.Wicket = module.exports = Wicket;

const Impetus = require('Impetus')

const log = (msg) => {
    if (window.console && window.console.error) {
        console.error (msg)
    }
}

const isTouchDevice = () => {
    return (('ontouchstart' in window)
        || (navigator.MaxTouchPoints > 0)
        || (navigator.msMaxTouchPoints > 0))
}

const forceRepaint = hatch => {
    // force element repaint on touch devices
    if (isTouchDevice() && !hatch.dataset.haspaint) {
        hatch.style.display = 'none'
        hatch.offsetHeight
        hatch.style.display = ''
        hatch.dataset.haspaint = 'yes'
    }
}

const translateY = (obj, val) => {
    obj.style['transform'] = `translate3d(0px,${val}px,0px)`
    obj.style['-ms-transform'] = `translate3d(0px,${val}px,0px)`
    obj.style['-webkit-transform'] = `translate3d(0px,${val}px,0px)`
}

class Wicket {
    constructor(elm, options) {
        this.hatches = document.querySelectorAll(elm)
        this.impetus = null
        this.scrollPoints = []
        this.interval = false
        this.isInit = false
        this.scroller = null
        this.index = 0
        this.scrollOffset = 0
        this.lastScrollTop = 0

        // Defaults
        const defaults = {
            'touch': true,
            'change': null
        }

        // Create options by extending defaults with the passed in arguments
        if (arguments[1] && typeof arguments[1] === 'object') {
            this.options = { ...defaults, ...arguments[1] }
        } else {
            this.options = defaults
        }

        try {
            if (this.hatches.length < 1) throw 'No matching elements found'
            this.init()
        }
        catch (err) {
            log(err)
        }
    }

    init() {
        if (!this.isInit) {
            this.createScroller()
            this.fixHatches()
            this.calcScrollPoints()
            this.bindListeners()
            this.bindEvents()
            this.callChangeCallback()

            if (this.impetus) {
                this.impetus.resume()
            }

            this.isInit = true
        }
    }

    refresh() {
        this.init()
    }

    createScroller() {
        this.scroller = document.createElement('div')
        this.scroller.style.position = 'absolute'
        this.scroller.style.width = '1px'
        document.body.appendChild(this.scroller)
    }

    fixHatches() {
        for (let i=0, len=this.hatches.length; i<len; i++) {
            this.hatches[i].style.position = 'fixed'
            this.hatches[i].style.zIndex = this.hatches.length - i
        }
    }

    calcScrollPoints() {
        this.scrollPoints = []
        for (let i=0, len=this.hatches.length; i<len; i++) {
            const oHeight = this.hatches[i].offsetHeight
            const nHeight = (i>0) ? (oHeight + this.scrollPoints[i-1]) : oHeight
            this.scrollPoints.push(nHeight)
        }
        this.scrollPoints.unshift(0)
        this.scroller.style.height = `${this.scrollPoints[this.scrollPoints.length-1]}px`
    }

    bindListeners() {
        this.listener = () => {
            this.calcScrollPoints()
        }

        window.addEventListener('resize', this.listener)
        window.addEventListener('orientationchange', this.listener)
    }

    bindEvents() {
        if (!isTouchDevice() && !this.interval) {
            const repeatOften = () => {
                this.handleScroll()
                this.interval = requestAnimationFrame(repeatOften)
            }
            repeatOften()
        } else {
            if (this.options.touch === true) {
                // calculate outer bounds
                const h = (parseInt(this.scroller.style.height) - window.innerHeight) * -1
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

    callChangeCallback() {
        const getType = {}
        if (this.options.change && getType.toString.call(this.options.change) === '[object Function]') {
            this.options.change.call(this, this.index)
        }
    }

    handleScroll(event, offset) {
        // incoming offset should be negative
        offsset = (offset>=0) ? -0.001 : offset
        const nOffset = offset || window.scrollY * -1
        const hatch = this.hatches[this.index]
        const scrollOffset = (nOffset + this.scrollPoints[this.index])
        const oIndex = this.index
        translateY(hatch, scrollOffset)
        
        // keep track of the current scrollOffset
        this.scrollOffset = nOffset
        forceRepaint(hatch)
        
        if ((nOffset*-1)>this.scrollPoints[this.index+1]) {
            this.index++
            this.index = Math.min(this.index, this.hatches.length-1)
            this.callChangeCallback()
        }

        if ((nOffset*-1) < this.scrollPoints[this.index]) {
            // make all the panels hard snap to the top, except the first one, which may bounce
            if (this.index > 0) {
                translateY(hatch, 0)
            }

            this.index--
            this.index = Math.max(0, this.index)
            this.callChangeCallback()
        }
    }

    destroy() {
        if (this.isInit) {
            clearInterval(this.interval)
            this.interval = false
            this.isInit = false

            if (this.impetus) {
                this.impetus.pause()
            }

            window.removeEventListener('resize', this.listener)
            window.removeEventListener('scroll', this.listener)
            this.resetScreens()
        }
    }

    resetScreens() {
        for (let i=0, len=this.hatches.length; i<len; i++) {
            this.hatches[i].removeAttribute('style')
        }
        document.body.removeChild(this.scroller)
    }

    scrollTo(id) {
        let interval
        const elm = document.querySelector(id)
        const nodeList = Array.prototype.slice.call(elm.parentNode.children)
        const index = nodeList.indexOf(elm)

        if (interval) clearInterval(interval)

        this.index = index

        const start = this.scrollOffset
        const end = this.scrollPoints[index]*-1
        const delta = start
        const scrollSpeed = 55

        if (!isTouchDevice()) {
            const time = 350
            const start = new Date().getTime()

            interval = setInterval(() => {
                const step = Math.min(1, (new Date().getTime() - start) / time)
                document.documentElement.scrollTop = window.pageYOffset + step * ((end * -1) - window.pageYOffset)
                
                if (step == 1) clearInterval(interval)
            }, scrollSpeed)

            document.documentElement.scrollTop = window.pageYOffset
        } else {
            interval = setInterval(() => {
                if (start < end) {
                    if (delta >= end) clearInterval(interval)
                    delta = parseFloat(Math.min(delta += scrollSpeed, end)) + 0.001
                } else {
                    if (delta <= end) clearInterval(interval)
                    delta = parseFloat(Math.max(delta -= scrollSpeed, end)) - 0.001
                }
                this.handleScroll('touch', delta)
                if (this.impetus) {
                    this.impetus.setValues(0, end)
                }
            }, 10)
        }
    }
} 

global.Wicket = module.exports = Wicket
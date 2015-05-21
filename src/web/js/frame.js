
import Url from './lib/url.js';

var url = new Url();

const zoomConfig = {
  min: 0.2,
  max: 3,
  step: 0.1,
  defaultValue: 1
};

export default class Frame {
  constructor(config) {
    this.id = config.id;
    this.config = config;

    // Mozbrowser events that we are interested in listening to.
    this.browserEvents = ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
      'mozbrowserloadend', 'mozbrowserloadstart', 'mozbrowsertitlechange',
      'mozbrowserlocationchange', 'mozbrowsermetachange', 'mozbrowsericonchange',
      'mozbrowserasyncscroll', 'mozbrowseropentab', 'mozbrowseropenwindow', 'mozbrowsersecuritychange'];

    this.title = '';
    this.location = config.url;
    this.isStereo = false;

    this.zoomValue = zoomConfig.defaultValue;
    this.createFrame();
  }

  handleEvent(e) {
    var listener = 'on_' + e.type;
    if (this[listener]) {
      this[listener](e);
    }

    this.config.browserEvent(e, this);
  }

  on_mozbrowserlocationchange(e) {
    this.location = e.detail;
  }
  on_mozbrowsertitlechange(e) {
    this.title = e.detail;
  }

  on_mozbrowsermetachange({detail}) {
    if (detail.name !== 'viewmode') {
      return;
    }

    var values = {};
    detail.content.split(',').forEach(def => {
      var [key, val] = def.split('=');
      values[String(key).trim()] = String(val).trim();
    });

    var {projection} = values;

    // If the meta-tag is removed, we revert to the default mono viewmode.
    if (detail.type === 'removed') {
      projection = 'mono';
    }

    if (projection === 'stereo' && !this.isStereo) {
      window.dispatchEvent(new CustomEvent('stereo-viewmode', {
        detail: this
      }));
    } else if (!projection || projection === 'mono') {
      window.dispatchEvent(new CustomEvent('mono-viewmode', {
        detail: this
      }));
    }
  }

  on_backclicked() {
    if (this.element.goBack) {
      this.element.goBack();
    }
  }

  on_forwardclicked() {
    if (this.element.goForward) {
      this.element.goForward();
    }
  }

  on_stopclicked() {
    if (this.element.stop) {
      this.element.stop();
    }
  }

  on_reloadclicked() {
    if (this.element.reload) {
      this.element.reload();
    }
  }

  createFrame() {
    var element = document.createElement('iframe');
    element.setAttribute('src', this.config.url);
    element.setAttribute('mozbrowser', 'true');
    element.setAttribute('remote', 'true');
    element.className = 'frame--mono threed';
    this.config.container.appendChild(element);

    this.element = element;

    this.browserEvents.forEach(event => {
      element.addEventListener(event, this);
    });
  }

  close() {
    this.element.parentNode.removeChild(this.element);
  }

  zoomIn() {
    this.zoomValue = Math.min(this.zoomValue + zoomConfig.step, zoomConfig.max);
    this.element.zoom(this.zoomValue);
  }

  zoomOut() {
    this.zoomValue = Math.max(this.zoomValue - zoomConfig.step, zoomConfig.min);
    this.element.zoom(this.zoomValue);
  }

  resetZoom() {
    this.zoomValue = zoomConfig.defaultValue;
    this.element.zoom(this.zoomValue);
  }

  navigate(value) {
    var location = url.getUrlFromInput(value);
    this.location = location;
    this.title = '';

    // Reset local values and update the hud when we navigate..
    window.dispatchEvent(new CustomEvent('frame_mozbrowserlocationchange', {
      bubbles: true,
      detail: location
    }));

    this.element.setAttribute('src', location);
  }
}

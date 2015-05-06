import * as Frame from 'js/frame.js';

export default class Navigation {
  constructor() {
    this.frames = [];
    this.activeFrameIndex = null;

    this.hud = $('#hud');
    this.container = $('#fs-container');
    this.contentContainer = $('#frames');
    this.urlbar = $('#urlbar');
    this.urlInput = $('#urlbar input');
  }

  get activeFrame() {
    return this.frames[this.activeFrameIndex];
  }

  handleEvent(e) {
    var action = e.target.dataset && e.target.dataset.action;
    if (!action) { return; }

    if (action === 'new') {
      this.newFrame();
      return;
    }

    this.activeFrame['_handle_' + e.target.dataset.action](e);
  }

  /**
   * Opens a new browsing frame.
   */
  newFrame() {
    var app = new Frame({
      url: 'http://www.mozvr.com/projects',
      container: this.contentContainer
    });
    this.activeFrameIndex = this.frames.length;
    this.frames.push(app);

    this.positionFrames();
  }

  /**
   * Closes the currently active frame.
   */
  closeFrame() {
    if (!this.activeFrame) { return; }

    this.activeFrame.close();

    this.frames.splice(this.activeFrameIndex, 1);
    this.activeFrameIndex = this.activeFrameIndex > 0 ? this.activeFrameIndex - 1 : 0;

    this.positionFrames();
  }

  positionFrames() {
    for (var i = 0 ; i < this.frames.length; i++) {
      var width = this.frames[i].element.offsetWidth;
      var x = (i - this.activeFrameIndex) * width;
      var distance = 1000;
      var rotate = 20 * (i - this.activeFrameIndex) * -1;
      this.frames[i].element.style.transform = `translateX(${x}px)
        perspective(${distance}px)
        rotateY(${rotate}deg)`;
    }
  }

  focusUrlbar() {
    var urlbarInput = $('#urlbar input');
    urlbarInput.focus();
  }

  handleUrlEntry(e) {
    var urlbarInput = $('#urlbar input');
    e.preventDefault();
    this.navigate(urlbarInput.value);
    urlbarInput.blur();
  }

  handleFocusUrlBar() {
    this.urlInput.select();
  }

  navigate(url) {
    if (!this.activeFrame) {
      this.newFrame();
    }
    this.activeFrame.navigate(url);
  }

  start(runtime) {
    window.addEventListener('resize', this.positionFrames.bind(this));
    this.hud.addEventListener('click', this);
    this.urlbar.addEventListener('submit', this.handleUrlEntry.bind(this));
    this.urlInput.addEventListener('focus', this.handleFocusUrlBar.bind(this));
    this.newFrame();

    runtime.keyboardControl.assign({
      'ctrl t': () => this.newFrame(),
      'ctrl w': () => this.closeFrame(),
      'ctrl l': () => this.focusUrlbar()
    });
  }
}

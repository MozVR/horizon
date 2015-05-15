import Gamepads from '../../../../../node_modules/gamepad-plus/src/lib/gamepads.js';

export default class GamepadInput {

  constructor() {
    this.config = {};
    this.gamepads = {};
    this._pollingInterval = {};
  }

  /**
   * Polls the gamepad state, updating the `Gamepads` instance's `state`
   * property with the latest gamepad data.
   */
  _update() {
    this.gamepads.update();
    window.requestAnimationFrame(this._update.bind(this));
  }

  /**
   * Stops the loop(s) that are polling the gamepad state.
   */
  _stopUpdate() {
    if (this._pollingInterval) {
      window.clearInterval(this._pollingInterval);
    }

    window.cancelAnimationFrame(this._update.bind(this));
  }

  init() {
    this.gamepads = new Gamepads(this.config);

    if (!this.gamepads.gamepadsSupported) {
      return;
    }

    // At the time of this writing, Firefox is the only browser that
    // fires the `gamepadconnected` event. For the other browsers
    // <https://crbug.com/344556>, we start polling every 100ms
    // until the first gamepad is connected.
    if (Gamepads.utils.browser !== 'firefox') {
      this._pollingInterval = window.setInterval(() => {
        if (this.gamepads.poll().length) {
          this._update();
          window.clearInterval(this._pollingInterval);
        }
      }, 200);
    }

    window.addEventListener('gamepadconnected', e => {
      console.log('Gamepad connected at index %d: %s. %d buttons, %d axes.',
        e.gamepad.index, e.gamepad.id, e.gamepad.buttons.length, e.gamepad.axes.length);

      this._update();
    });

    window.addEventListener('gamepaddisconnected', e => {
      console.log('Gamepad removed at index %d: %s.', e.gamepad.index, e.gamepad.id);
    });

    window.addEventListener('gamepadaxismove', e => {
      console.log('Gamepad axis move at index %d: %s. Axis: %d. Value: %f.',
        e.gamepad.index, e.gamepad.id, e.axis, e.value);
    });

    window.addEventListener('gamepadbuttondown', e => {
      console.log('Gamepad button down at index %d: %s. Button: %d.',
        e.gamepad.index, e.gamepad.id, e.button);
    });

    window.addEventListener('gamepadbuttonup', e => {
      console.log('Gamepad button up at index %d: %s. Button: %d.',
        e.gamepad.index, e.gamepad.id, e.button);
    });
  }

  /**
   * Assigns gamepad configurations.
   * @param {Object} config Options object to use for creating `Gamepads` instance.
   */
  assign(config) {
    this.config = config;
  }
}

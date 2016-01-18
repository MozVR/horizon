Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/Webapps.jsm');
Cu.import('resource://gre/modules/AppsUtils.jsm');

var origin = 'http://mozvr.github.io';

var BrowserAppInstaller = {

  manifestUrl: null,

  /**
   * Resolves to a json manifest.
   */
  loadManifest: function() {
    return new Promise((aResolve, aReject) => {
      console.log('Loading manifest ' + this.manifestUrl);

      let xhr =  Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
                 .createInstance(Ci.nsIXMLHttpRequest);
      xhr.mozBackgroundRequest = true;
      xhr.open('GET', this.manifestUrl);
      xhr.responseType = 'json';
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 400) {
          console.log('Success loading ' + this.manifestUrl);
          aResolve(xhr.response);
        } else {
          aReject('Error loading ' + this.manifestUrl);
        }
      });
      xhr.addEventListener('error', () => {
        aReject('Error loading ' + this.manifestUrl);
      });
      xhr.send(null);
    });
  },

  /**
   * Installs the system app into the registry.
   */
  installSystemApp: function(aManifest) {
    // Get the appropriate startup url from the manifest launch_path.
    let base = Services.io.newURI(this.manifestUrl, null, null);
    let origin = base.prePath;
    let helper = new ManifestHelper(aManifest, origin, this.manifestUrl);
    this.startupUrl = helper.fullLaunchPath();
    console.log('Startup url is:' + this.startupUrl);

    return new Promise((aResolve, aReject) => {
      console.log('Origin is ' + origin);
      let appData = {
        app: {
          installOrigin: origin,
          origin: origin,
          manifest: aManifest,
          manifestURL: this.manifestUrl,
          manifestHash: AppsUtils.computeHash(JSON.stringify(aManifest)),
          appStatus: Ci.nsIPrincipal.APP_STATUS_CERTIFIED
        },
        appId: 1,
        isBrowser: false,
        isPackage: false
      };

      DOMApplicationRegistry.confirmInstall(appData, null, aResolve);
    });
  },

  configure: function() {
    // XXX: Probably not needed.
    Services.prefs.setCharPref('b2g.system_manifest_url', this.manifestUrl);
    Services.prefs.setCharPref('b2g.system_startup_url', this.startupUrl);

    // Set a certified CSP preference, otherwise the default one is too strict.
    Services.prefs.setCharPref('security.apps.certified.CSP.default', '');

    // Enables mozbrower iframes.
    Services.prefs.setBoolPref('dom.mozBrowserFramesEnabled', true);

    // In-process browser frames currently do not work on desktop.
    // We could set this to true to enable it, but for now we just specify
    // the 'remote' attribute for our browsers.
    Services.prefs.setBoolPref('dom.ipc.browser_frames.oop_by_default', false);

    // Necessary to install permissions from an app installed in the local profile.
    Services.prefs.setBoolPref('dom.webapps.useCurrentProfile', true);

    // Enable VR APIs.
    Services.prefs.setBoolPref('dom.vr.enabled', true);

    return Promise.resolve();
  },

  /**
   * Installs the browser as a system app.
   */
  install: function(manifestUrl) {
    this.manifestUrl = manifestUrl;
    return DOMApplicationRegistry.registryReady
          .then(this.loadManifest.bind(this))
          .then(this.installSystemApp.bind(this))
          .then(this.configure.bind(this))
          .catch(e => {
            console.log('Got error when installing the vr browser.', e)
          });
  }
};

/**
 * Installs the toolbar button with the given ID into the given
 * toolbar, if it is not already present in the document.
 *
 * @param {string} toolbarId The ID of the toolbar to install to.
 * @param {string} id The ID of the button to install.
 * @param {string} afterId The ID of the element to insert after. @optional
 */
function installButton(toolbarId, id, afterId) {
  if (!document.getElementById(id)) {
      var toolbar = document.getElementById(toolbarId);

      // If no afterId is given, then append the item to the toolbar
      var before = null;
      if (afterId) {
          let elem = document.getElementById(afterId);
          if (elem && elem.parentNode == toolbar)
              before = elem.nextElementSibling;
      }

      toolbar.insertItem(id, before);
      toolbar.setAttribute('currentset', toolbar.currentSet);
      document.persist(toolbar.id, 'currentset');

      if (toolbarId == 'addon-bar')
          toolbar.collapsed = false;
  }
}

var vrbrowser = function () {
  return {
    init: function () {
      // Install the icon onto the main toolbar.
      installButton('nav-bar', 'vrbrowser-toolbar-button');
      installButton('addon-bar', 'vrbrowser-toolbar-button');

      BrowserAppInstaller.install(origin + '/horizon/web/manifest.webapp');
    },

    run: function () {
      console.log('Trying to run() from extension.');
      var newTabBrowser = gBrowser.addTab('chrome://vrbrowser/content/wrapper.html');
      gBrowser.selectedTab = newTabBrowser;


      var browser = gBrowser.getBrowserForTab(newTabBrowser);
      newTabBrowser.addEventListener('load', () => {
        console.log('Got load event.');
        var aWindow = browser.contentWindowAsCPOW;
        if (!aWindow) {
          return;
        }

        var appsService = Cc['@mozilla.org/AppsService;1'].getService(Ci.nsIAppsService);
        var docShell = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                            .getInterface(Ci.nsIDocShell);
        var manifestUrl = origin + '/horizon/web/manifest.webapp';
        var manifest = appsService.getAppByManifestURL(manifestUrl);
        var systemApp = manifest.QueryInterface(Ci.mozIApplication);

        console.log('Got docShell. App id is:', docShell.appId);
        console.log('Setting new id: ', systemApp.localId);

        docShell.setIsApp(systemApp.localId);

        var uri = Services.io.newURI(origin, null, null);
        Services.perms.add(uri, 'embed-apps', Services.perms.ALLOW_ACTION);
        Services.perms.add(uri, 'browser', Services.perms.ALLOW_ACTION);
        Services.perms.add(uri, 'systemXHR', Services.perms.ALLOW_ACTION);
      });
    }
  };
}();

window.addEventListener('load', vrbrowser.init, false);

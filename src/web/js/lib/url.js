var rscheme = /^(?:[a-z\u00a1-\uffff0-9-+]+)(?::(?:\/\/)?)/i;

export default class Url {

  constructor() {
    // Placeholder anchor tag to format URLs.
    this.a = null;
  }

  getUrlFromInput(input) {
    this.a = this.a || document.createElement('a');
    this.a.href = input;

    var formattedUrl = this.a.href;
    var hasScheme = this.hasScheme(input);

    // No scheme, prepend basic protocol and return
    if (!hasScheme) {
      formattedUrl = 'http://' + input;
    }

    return formattedUrl;
  }

  _getScheme(input) {
    // This function returns one of followings
    // - scheme + ':' (ex. http:)
    // - scheme + '://' (ex. http://)
    // - null
    return (rscheme.exec(input) || [])[0];
  }

  hasScheme(input) {
    return !!this._getScheme(input);
  }

  isURL(input) {
    return !UrlHelper.isNotURL(input);
  }

  isNotURL(input) {
    // in bug 904731, we use <input type='url' value=''> to
    // validate url. However, there're still some cases
    // need extra validation. We'll remove it til bug fixed
    // for native form validation.
    //
    // for cases, ?abc and "a? b" which should searching query
    var case1Reg = /^(\?)|(\?.+\s)/;
    // for cases, pure string
    var case2Reg = /[\?\.\s\:]/;
    // for cases, data:uri and view-source:uri
    var case3Reg = /^(data|view-source)\:/;

    var str = input.trim();
    if (case1Reg.test(str) || !case2Reg.test(str) ||
        this._getScheme(str) === str) {
      return true;
    }
    if (case3Reg.test(str)) {
      return false;
    }
    // require basic scheme before form validation
    if (!this.hasScheme(str)) {
      str = 'http://' + str;
    }
    if (!this.urlValidate) {
      this.urlValidate = document.createElement('input');
      this.urlValidate.setAttribute('type', 'url');
    }
    this.urlValidate.setAttribute('value', str);
    return !this.urlValidate.validity.valid;
  }
}
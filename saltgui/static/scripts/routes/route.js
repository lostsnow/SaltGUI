class Route {

  constructor(path, name, page_selector, menuitem_selector, router) {
    this.path = new RegExp(path);
    this.name = name;
    this.page_element = document.querySelector(page_selector);
    this.router = router;
    if(menuitem_selector)
      this.menuitem_element = document.querySelector(menuitem_selector);
  }

  getName() {
    return this.name;
  }

  getPath() {
    return this.path;
  }

  getPageElement() {
    return this.page_element;
  }

  getMenuItemElement() {
    return this.menuitem_element;
  }

  static _createDiv(className, content) {
    const div = document.createElement("div");
    div.className = className;
    div.innerHTML = content;
    return div;
  }

  static _createH1(content) {
    const h1 = document.createElement('h1');
    h1.innerHTML = content;
    return h1;
  }

}

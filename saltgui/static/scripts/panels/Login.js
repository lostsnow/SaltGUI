/* global document window */

import {Panel} from "./Panel.js";
import {Utils} from "../Utils.js";

export class LoginPanel extends Panel {

  constructor () {
    super("login");

    this.addTitle("SaltGUI");

    // The FORM is important, so that the ENTER key
    // in any field is redirected to the submit button
    const form = document.createElement("form");
    this.div.append(form);

    const noticeWrapper = document.createElement("div");
    noticeWrapper.id = "notice-wrapper";
    noticeWrapper.classList.add("notice-wrapper");
    form.append(noticeWrapper);

    const username = document.createElement("input");
    username.id = "username";
    username.type = "text";
    username.placeholder = "Username";
    username.autofocus = "";
    form.append(username);

    const password = document.createElement("input");
    password.id = "password";
    password.type = "password";
    password.placeholder = "Password";
    form.append(password);

    // see https://docs.saltstack.com/en/latest/ref/auth/all/index.html
    const select = document.createElement("select");
    select.id = "eauth";

    const option1 = document.createElement("option");
    option1.id = "eauth-default";
    option1.value = "default";
    option1.innerText = "Type";
    select.append(option1);

    const option2 = document.createElement("optgroup");
    option2.label = "standard";
    select.append(option2);

    const option2a = document.createElement("option");
    option2a.value = "pam";
    option2a.innerText = "pam";
    option2.append(option2a);

    // move items to this optgroup only when at least
    // one user reports a succesful use
    // see https://github.com/saltstack/salt/tree/master/salt/auth
    // for information and configuration
    const option3 = document.createElement("optgroup");
    option3.label = "other";
    select.append(option3);

    const option3a = document.createElement("option");
    option3a.value = "file";
    option3a.innerText = "file";
    option3.append(option3a);

    const option3b = document.createElement("option");
    option3b.value = "ldap";
    option3b.innerText = "ldap";
    option3.append(option3b);

    const option3c = document.createElement("option");
    option3c.value = "mysql";
    option3c.innerText = "mysql";
    option3.append(option3c);

    const option3d = document.createElement("option");
    option3d.value = "yubico";
    option3d.innerText = "yubico";
    option3.append(option3d);

    // auto and sharedsecret already tested but not suitable for general use
    // other values are: django, keystone, pki, rest
    // these can be added after testing to optgroup 'other'
    // add untested values to (new) optgroup 'experimental' on explicit user request
    // and only while the code is on a branch

    form.append(select);

    const submit = document.createElement("input");
    submit.id = "login-button";
    submit.type = "submit";
    submit.value = "Login";
    form.append(submit);

    const aa = document.createElement("a");
    aa.href = "https://github.com/erwindon/SaltGUI";
    aa.target = "_blank";
    aa.classList.add("attribution");

    const img = document.createElement("img");
    img.src = "static/images/github.png";
    aa.append(img);

    const txt = document.createTextNode("SaltGUI v1.21.0");
    aa.append(txt);

    form.append(aa);

    this.div.append(form);

    this.loginPending = false;

    this._registerLoginRouteEventListeners(form);
  }

  _registerLoginRouteEventListeners (pLoginForm) {
    pLoginForm.addEventListener("submit", (ev) => {
      this._onLogin(ev);
    });
  }

  _showNoticeText (pBackgroundColour, pText, pInfoClass) {
    // create a new child every time to restart the animation
    const noticeDiv = Utils.createDiv("", pText);
    noticeDiv.id = "notice";
    noticeDiv.classList.add(pInfoClass);
    noticeDiv.style.backgroundColor = pBackgroundColour;
    const noticeWrapperDiv = document.getElementById("notice-wrapper");
    while (noticeWrapperDiv.hasChildNodes()) {
      noticeWrapperDiv.removeChild(noticeWrapperDiv.firstChild);
    }
    noticeWrapperDiv.appendChild(noticeDiv);
  }

  onShow () {
    const eauthSelector = document.getElementById("eauth");
    eauthSelector.value = Utils.getStorageItem("local", "eauth", "pam");

    const reason = decodeURIComponent(Utils.getQueryParam("reason"));
    switch (reason) {
    case null:
    case "":
    case "undefined":
      break;
    case "no-session":
      // gray because we cannot prove that the user was/wasnt logged in
      this._showNoticeText("gray", "Not logged in", "notice_not_logged_in");
      break;
    case "expired-session":
      this._showNoticeText("#F44336", "Session expired", "notice_session_expired");
      break;
    case "logout":
      // gray because this is the result of a user action
      this._showNoticeText("gray", "Logout", "notice_logout");
      break;
    default:
      // should not occur
      this._showNoticeText("#F44336", reason, "notice_other:" + reason);
    }
  }

  _onLogin (pSubmitEvent) {
    pSubmitEvent.preventDefault();
    if (this.loginPending) {
      // Don't continue if waiting on a request
      return;
    }

    const userNameField = document.getElementById("username");
    const userName = userNameField.value;
    const passWordField = document.getElementById("password");
    const passWord = passWordField.value;
    const eauthField = document.getElementById("eauth");
    const eauth = eauthField.value;

    if (eauth === "default") {
      this._onLoginFailure("Invalid login-type");
      return;
    }

    this._toggleForm(false);
    this.api.login(userName, passWord, eauth).then(() => {
      this._onLoginSuccess();
    }, () => {
      this._onLoginFailure();
    });
  }

  _onLoginSuccess () {
    this._toggleForm(true);

    const userNameField = document.getElementById("username");
    userNameField.disabled = true;
    const passWordField = document.getElementById("password");
    passWordField.disabled = true;
    const eauthField = document.getElementById("eauth");
    eauthField.disabled = true;

    this._showNoticeText("#4CAF50", "Please wait...", "notice_please_wait");

    // We need these functions to populate the dropdown boxes
    const wheelConfigValuesPromise = this.api.getWheelConfigValues();

    // We need these functions to populate the dropdown boxes
    wheelConfigValuesPromise.then((pWheelConfigValuesData) => {
      this._handleLoginWheelConfigValues(pWheelConfigValuesData);
    }, () => {
      // never mind
    });

    // allow the success message to be seen
    window.setTimeout(() => {
      this.router.goTo("/");
    }, 1000);
  }

  _handleLoginWheelConfigValues (pWheelConfigValuesData) {
    // store for later use

    const wheelConfigValuesData = pWheelConfigValuesData.return[0].data.return;

    const templates = wheelConfigValuesData.saltgui_templates;
    Utils.setStorageItem("session", "templates", JSON.stringify(templates));

    const publicPillars = wheelConfigValuesData.saltgui_public_pillars;
    Utils.setStorageItem("session", "public_pillars", JSON.stringify(publicPillars));

    const previewGrains = wheelConfigValuesData.saltgui_preview_grains;
    Utils.setStorageItem("session", "preview_grains", JSON.stringify(previewGrains));

    const hideJobs = wheelConfigValuesData.saltgui_hide_jobs;
    Utils.setStorageItem("session", "hide_jobs", JSON.stringify(hideJobs));
    const showJobs = wheelConfigValuesData.saltgui_show_jobs;
    Utils.setStorageItem("session", "show_jobs", JSON.stringify(showJobs));

    let nodeGroups = wheelConfigValuesData.nodegroups;
    // Even when not set, the api server gives this an actual value "{}" here.
    // Let's assume the user never sets that value. Sounds reasonable because
    // when it is set, it is normally set to an actual value/list.
    if (!nodeGroups || !Object.keys(nodeGroups).length) {
      nodeGroups = undefined;
    }
    Utils.setStorageItem("session", "nodegroups", JSON.stringify(nodeGroups));

    const outputFormats = wheelConfigValuesData.saltgui_output_formats;
    Utils.setStorageItem("session", "output_formats", JSON.stringify(outputFormats));

    const dateTimeFractionDigits = wheelConfigValuesData.saltgui_datetime_fraction_digits;
    Utils.setStorageItem("session", "datetime_fraction_digits", JSON.stringify(dateTimeFractionDigits));

    const toolTipMode = wheelConfigValuesData.saltgui_tooltip_mode;
    Utils.setStorageItem("session", "tooltip_mode", toolTipMode);

    // Now that we have the basic configuration
    // Update the GUI accordingly for a few cases

    this._EnableGuiOptions();
  }

  _EnableGuiOptions () {
    // show template menu item if templates defined
    const templatesText = Utils.getStorageItem("session", "templates", "");
    if (templatesText && templatesText.length) {
      const item1 = document.getElementById("button-templates1");
      item1.classList.remove("menu-item-hidden");
      const item2 = document.getElementById("button-templates2");
      item2.classList.remove("menu-item-hidden");
    }
  }

  _onLoginFailure (error) {
    this._toggleForm(true);

    if (typeof error === "string") {
      // something detected before trying to login
      this._showNoticeText("#F44336", error, "notice_login_string_error");
    } else if (error && error.status === 503) {
      // Service Unavailable
      // e.g. salt-api running but salt-master not running
      this._showNoticeText("#F44336", error.message, "notice_login_service_unavailable");
    } else if (error && error.status === -1) {
      // No permissions: login valid, but no api functions executable
      // e.g. PAM says OK and /etc/salt/master says NO
      this._showNoticeText("#F44336", error.message, "notice_login_other_error");
    } else {
      this._showNoticeText("#F44336", "Authentication failed", "notice_auth_failed");
    }
  }

  _toggleForm (pAllowSubmit) {
    this.loginPending = !pAllowSubmit;
    const loginButton = this.div.querySelector("#login-button");
    loginButton.disabled = !pAllowSubmit;
  }
}

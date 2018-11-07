class CommandBox {

  constructor(api) {
    this.api = api;
    this._getRunParams = this._getRunParams.bind(this);
    this._onRun = this._onRun.bind(this);
    this._onRunReturn = this._onRunReturn.bind(this);
    this._showManualRun = this._showManualRun.bind(this);
    this._hideManualRun = this._hideManualRun.bind(this);

    const cmdbox = document.querySelector(".run-command #cmdbox");
    this.cmdmenu = new DropDownMenu(cmdbox);

    this.documentation = new Documentation(this);
    this._registerEventListeners();

    RunType.createMenu();
    TargetType.createMenu();
  }

  _registerEventListeners() {
    document.querySelector("#popup_runcommand")
      .addEventListener("click", this._hideManualRun);
    document.querySelector("#button_manualrun")
      .addEventListener("click", this._showManualRun);
    document.querySelector("#button_close_cmd")
      .addEventListener("click", this._hideManualRun);

    document.querySelector(".run-command input[type='submit']")
      .addEventListener("click", this._onRun);

    this._addKeyEventListener("#target", _ => {
      const target = document.querySelector(".run-command #target").value;
      TargetType.autoSelectTargetType(target);
    });

    this._addKeyEventListener("#command", this.cmdmenu.verifyAll);
  }

  _addKeyEventListener(selector, func) {
    // keydown is too early, keypress also does not work
    document.querySelector(selector).addEventListener("keyup", func);
    // cut/paste do not work everywhere
    document.querySelector(selector).addEventListener("cut", func);
    document.querySelector(selector).addEventListener("paste", func);
    // blur/focus should not be needed but are a valueable fallback
    document.querySelector(selector).addEventListener("blur", func);
    document.querySelector(selector).addEventListener("focus", func);
  }

  _onRun() {
    const button = document.querySelector(".run-command input[type='submit']");
    if(button.disabled) return;
    const output = document.querySelector(".run-command pre");

    const target = document.querySelector(".run-command #target").value;
    const command = document.querySelector(".run-command #command").value;

    const tgtType = TargetType.menuTargetType._value;

    const func = this._getRunParams(tgtType, target, command);
    if(func === null) return;

    button.disabled = true;
    output.innerText = "Loading...";

    func.then(response => {
      this._onRunReturn(response.return[0], command);
    });
  }

  _onRunReturn(response, command) {
    const outputContainer = document.querySelector(".run-command pre");
    const minions = Object.keys(response);
    Output.addResponseOutput(outputContainer, minions, response, command);
    const button = document.querySelector(".run-command input[type='submit']");
    button.disabled = false;
  }

  _showManualRun(evt) {
    const manualRun = document.querySelector("#popup_runcommand");
    manualRun.style.display = "block";

    document.body.style["overflow-y"] = "hidden";
    document.querySelector(".run-command pre").innerText = "Waiting for command...";

    const target = document.querySelector(".run-command #target").value;
    TargetType.autoSelectTargetType(target);

    RunType.setRunTypeDefault();

    evt.stopPropagation();
  }

  _hideManualRun(evt) {
    //Don't close if they click inside the window
    if(evt.target.className !== "popup" && evt.target.className !== "nearlyvisiblebutton") return;

    const manualRun = document.querySelector("#popup_runcommand");
    manualRun.style.display = "none";

    document.body.style["overflow-y"] = "scroll";

    // reset to default, so that its value is initially hidden
    RunType.setRunTypeDefault();
    TargetType.setTargetTypeDefault();

    // test whether the command may have caused an update to the list
    // the user may have altered the text after running the command, just ignore that
    const command = document.querySelector(".run-command #command").value.split(" ")[0];
    const output = document.querySelector(".run-command pre").innerText;
    const screenModifyingCommands = [
      "wheel.key.accept",
      "wheel.key.delete",
      "wheel.key.reject",
    ];
    if(screenModifyingCommands.includes(command) && output !== "Waiting for command...") {
      location.reload();
    }

    evt.stopPropagation();
  }

  _showError(message) {
    this._onRunReturn(message, "");
  }

  _getRunParams(tgtType, target, toRun) {

    if(toRun === "") {
      this._showError("'Command' field cannot be empty");
      return null;
    }

    // collection for unnamed parameters
    const args = [ ];

    // collection for named parameters
    const params = { };

    const ret = window.parseCommandLine(toRun, args, params);
    if(ret !== null) {
      // that is an error message being returned
      this._showError(ret);
      return null;
    }

    if(args.length === 0) {
      this._showError("First (unnamed) parameter is the function name, it is mandatory");
      return null;
    }

    const functionToRun = args.shift();

    if(typeof functionToRun !== "string") {
      this._showError("First (unnamed) parameter is the function name, it must be a string, not a " + typeof functionToRun);
      return null;
    }

    // RUNNERS commands do not have a target (MASTER is the target)
    // WHEEL commands also do not have a target
    // but we use the TARGET value to form the usually required MATCH parameter
    // therefore for WHEEL commands it is still required
    if(target === "" && functionToRun !== "runners" && !functionToRun.startsWith("runners.")) {
      this._showError("'Target' field cannot be empty");
      return null;
    }

    if(functionToRun.startsWith("runners.")) {
      params.client = "runner";
      // use only the part after "runners." (8 chars)
      params.fun = functionToRun.substring(8);
      if(args.length !== 0) params.arg = args;
    } else if(functionToRun.startsWith("wheel.")) {
      // wheel.key functions are treated slightly different
      // we re-use the "target" field to fill the parameter "match"
      // as used by the salt.wheel.key functions
      params.client = "wheel";
      // use only the part after "wheel." (6 chars)
      params.fun = functionToRun.substring(6);
      params.match = target;
    } else {
      // for the localClient, the kwargs are a separate parameter
      const kwarg = params;
      params = { };
      if(Object.keys(kwarg).length > 0) params.kwarg = kwarg;
      params.client = "local";
      params.fun = functionToRun;
      params.tgt = target;
      if(tgtType) params.tgt_type = tgtType;
      if(args.length !== 0) params.arg = args;
    }

    const runType = RunType.getRunType();
    if(params.client === "local" && runType === "async") {
      params.client = "local_async";
      // return looks like:
      // { "jid": "20180718173942195461", "minions": [ ... ] }
    }

    return this.api.apiRequest("POST", "/", params)
      .catch(error => {
        this._showError(error.message);
        return error;
      });
  }
}

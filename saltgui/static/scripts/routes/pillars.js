class PillarsRoute extends PageRoute {

  constructor(router) {
    super("^[\/]pillars$", "Pillars", "#page_pillars", "#button_pillars");
    this.router = router;
    this.keysLoaded = false;
    this.jobsLoaded = false;

    this._showPillars = this._showPillars.bind(this);
    this._updateJobs = this._updateJobs.bind(this);
    this._updateKeys = this._updateKeys.bind(this);
    this._updateMinion = this._updateMinion.bind(this);
  }

  onShow() {
    const minions = this;

    const pillarsContainer = document.querySelector("#page_pillars .pillars-list");
    pillarsContainer.style.display = "none";

    return new Promise(function(resolve, reject) {
      minions.resolvePromise = resolve;
      if(minions.keysLoaded && minions.jobsLoaded) resolve();
      minions.router.api._getRunParams('*', 'pillar.items')
        .then(minions._updateMinions, minions._updateMinions);
      minions.router.api.getKeys().then(minions._updateKeys);
      minions.router.api.getJobs().then(minions._updateJobs);
    });
  }

  _updateKeys(data) {
    const keys = data.return;

    const list = this.getPageElement().querySelector('#minions');

    const hostnames = keys.minions.sort();
    for(const hostname of hostnames) {
      this._addMinion(list, hostname);
    }

    this.keysLoaded = true;
    if(this.keysLoaded && this.jobsLoaded) this.resolvePromise();
  }

  _updateMinion(container, minion, hostname) {

    const element = this._getElement(container, hostname);

    element.appendChild(Route._createDiv("hostname", hostname));

    const status = Route._createDiv("status", "accepted");
    status.classList.add("accepted");
    element.appendChild(status);

    const cnt = Object.keys(minion).length;

    let pillarInfoText;
    switch(cnt){
    case 0:
      pillarInfoText = "no pillars";
      break;
    case 1:
      pillarInfoText = cnt + " pillar";
      break;
    default:
      pillarInfoText = cnt + " pillars";
    }
    const pillarInfoDiv = Route._createDiv("pillarinfo", pillarInfoText);
    element.appendChild(pillarInfoDiv);

    const menu = new DropDownMenu(element);
    if(cnt > 0) {
      menu.addMenuItem("Show&nbsp;pillars", function(evt) {
        this._showPillars(evt, hostname, minion);
      }.bind(this));
    }
  }

  _showPillars(evt, hostname, minion) {

    const title = document.getElementById("pillars_title");
    title.innerText = "Pillars on " + hostname;

    const container = document.getElementById("pillars_list");

    while(container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const keys = Object.keys(minion).sort();
    let cnt = 0;
    for(const k of keys) {
      const pillar = document.createElement('li');

      const name = Route._createDiv("pillar_name", k);
      pillar.appendChild(name);

      const eye_icon = window.createElement("img", "eye_icon", "");
      eye_icon.src = "static/images/eye_black.png";
      pillar.appendChild(eye_icon);

      const pillar_value_hidden = Route._createDiv("pillar_value_hidden", "\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF");
      pillar.appendChild(pillar_value_hidden);

      let pillar_value_shown = JSON.sortify(minion[k]);
      if(pillar_value_shown == "[]") {
        // show the brackets a bit wider apart
        pillar_value_shown = "[&nbsp;]";
      }
      else if(pillar_value_shown == "{}") {
        // show the brackets a bit wider apart
        pillar_value_shown = "{&nbsp;}";
      }
      else {
        pillar_value_shown = JSON.sortify(minion[k], null, "  ");
      }
      pillar_value_shown = Route._createDiv("pillar_value_shown", pillar_value_shown);
      pillar_value_shown.style.display = "none";
      pillar.appendChild(pillar_value_shown);

      eye_icon.addEventListener("mouseenter", function(evt) {
        pillar_value_shown.style.display = "inline-block";
        pillar_value_hidden.style.display = "none";
      });
      eye_icon.addEventListener("mouseleave", function(evt) {
        let permanent = pillar.getAttribute("permanent");
        if(!permanent) permanent = 1;
        if(permanent == 1) {
          pillar_value_hidden.style.display = "inline-block";
          pillar_value_shown.style.display = "none";
          eye_icon.src = "static/images/eye_black.png";
        } else {
          eye_icon.src = "static/images/eye_red.png";
        }
      });
      eye_icon.addEventListener("click", function(evt) {
        // 1 = dynamic
        // 2 = static
        let permanent = pillar.getAttribute("permanent");
        if(!permanent) permanent = 1;
        permanent = 3 - permanent;
        pillar.setAttribute("permanent", permanent);
        if(permanent == 1) {
          eye_icon.src = "static/images/eye_black.png";
        } else {
          eye_icon.src = "static/images/eye_red.png";
        }
      });

      container.appendChild(pillar);
      cnt++;
    }

    if(cnt === 0) {
      const noPillarsMsg = Route._createDiv("msg", "No pillars found");
      container.appendChild(noPillarsMsg);
    }

    // highlite the minion
    document.querySelectorAll("#page_pillars .minions li").forEach(
      function (e){ e.classList.remove("minion_active"); }
    );
    const minionElem = document.querySelector("#page_pillars .minions #" + hostname);
    if(minionElem) minionElem.classList.add("minion_active");

    // replace the initial jobs list with the pillars details
    const pillarsContainer = document.querySelector("#page_pillars .pillars-list");
    pillarsContainer.style.display = "block";
    const jobContainer = document.querySelector("#page_pillars .job-list");
    jobContainer.style.display = "none";
  }
}

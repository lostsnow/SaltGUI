class SchedulesRoute extends PageRoute {

  constructor(router) {
    super("^[\/]schedules$", "Schedules", "#page_schedules", "#button_schedules");
    this.router = router;
    this.keysLoaded = false;
    this.jobsLoaded = false;

    this._showJobs = this._showJobs.bind(this);
    this._updateJobs = this._updateJobs.bind(this);
    this._updateKeys = this._updateKeys.bind(this);
    this._updateMinion = this._updateMinion.bind(this);
    this._updateMinions = this._updateMinions.bind(this);
  }

  onShow() {
    const minions = this;

    const schedulesContainer = document.querySelector("#page_schedules .schedules-list");
    schedulesContainer.style.display = "none";

    return new Promise(function(resolve, reject) {
      minions.resolvePromise = resolve;
      if(minions.keysLoaded && minions.jobsLoaded) resolve();
      minions.router.api._getRunParams('*', 'schedule.list return_yaml=False')
        .then(minions._updateMinions, minions._updateMinions);
      minions.router.api.getKeys().then(minions._updateKeys);
      minions.router.api.getJobs().then(minions._updateJobs);
    });
  }

  // This one has some historic ballast:
  // Meta-data is returned on the same level as
  // the list of scheduled items
  _fixMinion(data) {
    const ret = { "schedules": {}, "enabled": true };
    for(const k in data) {
      if(k === "enabled") {
        ret.enabled = data.enabled;
        continue;
      }
      if(k === "schedule" && JSON.stringify(data[k]) === "{}") {
        continue;
      }
      ret.schedules[k] = data[k];
    }
    return ret;
  }

  _updateMinions(data) {
    const minions = data.return[0];

    const list = this.getPageElement().querySelector('#minions');
    const hostnames = Object.keys(minions).sort();

    for(const hostname of hostnames) {
      const minion_info = minions[hostname];

      // minions can be offline, then the info will be false
      if (minion_info === false) {
        this._updateOfflineMinion(list, hostname);
      } else {
        const minion = this._fixMinion(minion_info);
        this._updateMinion(list, minion, hostname);
      }
    }
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

    const cnt = Object.keys(minion.schedules).length;
    let scheduleinfo = cnt + " schedule" + (cnt == 1 ? "" : "s");
    if(!minion.enabled)
      scheduleinfo += " (disabled)";

    let element = document.getElementById(hostname);
    if(element == null) {
      // offline minion not found on screen...
      // construct a basic element that can be updated here
      element = document.createElement('li');
      element.id = hostname;
      container.appendChild(element);
    }
    while(element.firstChild) {
      element.removeChild(element.firstChild);
    }

    element.appendChild(Route._createDiv("hostname", hostname));

    const statusDiv = Route._createDiv("status", "accepted");
    statusDiv.classList.add("accepted");
    element.appendChild(statusDiv);

    element.appendChild(Route._createDiv("scheduleinfo", scheduleinfo));

    const menu = new DropDownMenu(element);
    if(cnt > 0) {
      menu.addMenuItem("Show&nbsp;jobs", function(evt) {
        this._showJobs(evt, minion, hostname);
      }.bind(this));
    }
  }

  _showJobs(evt, jobs, hostname) {

    const keys = Object.keys(jobs.schedules).sort();

    const title = document.getElementById("schedules_title");
    title.innerText = "Schedules on " + hostname;
    if(!jobs.enabled) {
      title.innerText += " (disabled)";
      title.classList.add("disabled");
    } else {
      title.classList.remove("disabled");
    }

    const container = document.getElementById("schedules_list");

    while(container.firstChild) {
      container.removeChild(container.firstChild);
    }

    for(const k of keys) {

      const details = jobs.schedules[k];
      if("name" in details)
        delete details.name;
      if("enabled" in details && details.enabled)
        delete details.enabled;
      if("jid_include" in details && details.jid_include)
        delete details.jid_include;
      if("maxrunning" in details && details.maxrunning == 1)
        delete details.maxrunning;

      const schedule = document.createElement('li');

      const schedule_name = Route._createDiv("schedule_name", k);
      if("enabled" in details && !details.enabled)
        schedule_name.classList.add("disabled");
      schedule.appendChild(schedule_name);

      const schedule_value = Route._createDiv(
        "schedule_value",
        JSON.sortify(jobs.schedules[k], null, "  "));
      schedule_value.style.display = "inline-block";
      if("enabled" in details && !details.enabled)
        schedule_value.classList.add("disabled");
      schedule.appendChild(schedule_value);

      container.appendChild(schedule);
    }

    if(!keys) {
      const noSchedulesMsg = Route._createDiv("msg", "No schedules found");
      container.appendChild(noSchedulesMsg);
    }

    // highlite the minion
    document.querySelectorAll("#page_schedules .minions li").forEach(
      function (e){ e.classList.remove("minion_active"); }
    );
    const minion = document.querySelector("#page_schedules .minions #" + hostname);
    if(minion) minion.classList.add("minion_active");

    // replace the initial jobs list with the schedules details
    const schedulesContainer = document.querySelector("#page_schedules .schedules-list");
    schedulesContainer.style.display = "block";
    const jobContainer = document.querySelector("#page_schedules .job-list");
    jobContainer.style.display = "none";
  }
}

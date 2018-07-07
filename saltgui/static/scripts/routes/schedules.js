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

  _updateOfflineMinion(container, hostname) {
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

    const offline = Route._createDiv("offline", "offline");
    offline.id = "status";

    element.appendChild(offline);
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
    menu.addMenuItem("Show&nbsp;jobs", function(evt) {
      this._showJobs(evt, minion, hostname);
    }.bind(this));

    if(!minion.enabled)
      menu.addMenuItem("Enable&nbsp;schedule...", function(evt) {
        this._enableSchedule(evt, hostname);
      }.bind(this));

    if(minion.enabled)
      menu.addMenuItem("Disable&nbsp;schedule...", function(evt) {
        this._disableSchedule(evt, hostname);
      }.bind(this));
  }

  _addMinion(container, hostname) {

    let element = document.getElementById(hostname);
    if(element != null) {
      // minion already on screen...
      return;
    }

    element = document.createElement('li');
    element.id = hostname;

    element.appendChild(Route._createDiv("hostname", hostname));

    element.appendChild(Route._createDiv("os", "loading..."));

    container.appendChild(element);
  }

  _updateJobs(data) {
    const jobContainer = document.querySelector("#page_schedules .jobs");
    jobContainer.innerHTML = "";
    const jobs = this._jobsToArray(data.return[0]);
    this._sortJobs(jobs);

    //Add seven most recent jobs
    let shown = 0;
    let i = 0;
    while(shown < 7 && jobs[i] !== undefined) {
      const job = jobs[i];
      i = i + 1;
      if(job.Function === "saltutil.find_job") continue;
      if(job.Function === "schedule.items") continue;
      if(job.Function === "wheel.key.list_all") continue;
      if(job.Function === "runner.jobs.list_jobs") continue;

      this._addJob(jobContainer, job);
      shown = shown + 1;
    }
    this.jobsLoaded = true;
    if(this.keysLoaded && this.jobsLoaded) this.resolvePromise();
  }

  _addJob(container, job) {
    const element = document.createElement('li');
    element.id = job.id;

    element.appendChild(Route._createDiv("function", job.Function));
    element.appendChild(Route._createDiv("target", job.Target));
    element.appendChild(Route._createDiv("time", job.StartTime));
    container.appendChild(element);
    element.addEventListener('click', this._createJobListener(job.id));
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

    const mainMenu = new DropDownMenu(title);

    if(!jobs.enabled)
      mainMenu.addMenuItem("Enable&nbsp;schedule...", function(evt) {
        this._enableSchedule(evt, hostname);
      }.bind(this));

    if(jobs.enabled)
      mainMenu.addMenuItem("Disable&nbsp;schedule...", function(evt) {
        this._disableSchedule(evt, hostname);
      }.bind(this));

    if(keys.length) {
      mainMenu.addMenuItem("Delete&nbsp;all&nbsp;jobs...", function(evt) {
        this._deleteJobs(evt, hostname);
      }.bind(this));
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

      const scheduleMenu = new DropDownMenu(schedule);

      scheduleMenu.addMenuItem("Delete&nbsp;job...", function(evt) {
        this._deleteJob(evt, hostname, k);
      }.bind(this));

      if("enabled" in details && !details.enabled)
        scheduleMenu.addMenuItem("Enable&nbsp;job...", function(evt) {
          this._enableJob(evt, hostname, k);
        }.bind(this));

      if(!("enabled" in details) || details.enabled)
        scheduleMenu.addMenuItem("Disable&nbsp;job...", function(evt) {
          this._disableJob(evt, hostname, k);
        }.bind(this));

      scheduleMenu.addMenuItem("Run&nbsp;job...", function(evt) {
        this._runJob(evt, hostname, k, !("enabled" in details) || details.enabled);
      }.bind(this));

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

  _deleteJob(evt, hostname, k) {
    this._runCommand(evt, hostname, "schedule.delete " + k);
  }

  _deleteJobs(evt, hostname) {
    this._runCommand(evt, hostname, "schedule.purge");
  }

  _disableJob(evt, hostname, k) {
    this._runCommand(evt, hostname, "schedule.disable_job " + k);
  }

  _disableSchedule(evt, hostname) {
    this._runCommand(evt, hostname, "schedule.disable");
  }

  _enableJob(evt, hostname, k) {
    this._runCommand(evt, hostname, "schedule.enable_job " + k);
  }

  _enableSchedule(evt, hostname) {
    this._runCommand(evt, hostname, "schedule.enable");
  }

  _runJob(evt, hostname, k, isEnabled) {
    if(isEnabled)
      this._runCommand(evt, hostname, "schedule.run_job " + k);
    else
      this._runCommand(evt, hostname, "schedule.run_job " + k + " force=True");
  }

  _createJobListener(id) {
    const router = this.router;
    return function() {
      router.goTo("/job?id=" + id);
    };
  }

  _jobsToArray(jobs) {
    const keys = Object.keys(jobs);
    const newArray = [];

    for(const key of keys) {
      const job = jobs[key];
      job.id = key;
      newArray.push(job);
    }

    return newArray;
  }

  _sortJobs(jobs) {
    jobs.sort(function(a, b){
      // The id is already a integer value based on the date, let's use
      // it to sort the jobs
      if (a.id < b.id) return 1;
      if (a.id > b.id) return -1;
      return 0;
    });
  }

  _copyAddress(evt) {
    const target = evt.target;
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
  }
}

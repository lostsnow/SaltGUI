class JobsRoute extends PageRoute {

  constructor(router) {
    super("^[\/]jobs$", "Jobs", "#page_jobs", "#button_jobs", router);
    this.jobsLoaded = false;

    this._updateJobs = this._updateJobs.bind(this);
    this._runningJobs = this._runningJobs.bind(this);
  }

  onShow() {
    const jobs = this;
    return new Promise(function(resolve, reject) {
      jobs.resolvePromise = resolve;
      if(jobs.jobsLoaded) resolve();
      jobs.router.api.getJobs().then(data => {
        jobs._updateJobs(data, 20, true);
      });
      jobs.router.api.getJobsActive().then(data => {
        jobs._runningJobs(data, true);
      });
    });
  }

}
import {Output} from './Output.js';
import {OutputNested} from './OutputNested.js';

export class OutputHighstate {

  static isHighStateOutput(command, response) {

    if(!Output.isOutputFormatAllowed("highstate")) return false;

    if(typeof response !== "object") return false;
    if(Array.isArray(response)) return false;
    if(command !== "state.apply" && command !== "state.highstate") return false;
    for(const key of Object.keys(response)) {
      const components = key.split("_|-");
      if(components.length !== 4) return false;
    }
    return true;
  }

  static getDurationClauseMillis(millis) {
    let ms = Math.round(millis * 1000) / 1000;
    return `${ms} ms`;
  }

  static getDurationClauseSecs(millis) {
    let s = Math.round(millis) / 1000;
    return `${s} s`;
  }

  static getHighStateLabel(hostname, hostResponse) {
    let anyFailures = false;
    let anySkips = false;
    // do not use Object.entries, that is not supported by the test framework
    for(const key of Object.keys(hostResponse)) {
      const task = hostResponse[key];
      if(task.result === null) anySkips = true;
      else if(!task.result) anyFailures = true;
    }

    if(anyFailures) {
      return Output.getHostnameHtml(hostname, "host_failure");
    }
    if(anySkips) {
      return Output.getHostnameHtml(hostname, "host_skips");
    }
    return Output.getHostnameHtml(hostname, "host_success");
  }

  static getHighStateOutput(hostname, hostResponse) {

    // The tasks are in an (unordered) object with uninteresting keys
    // convert it to an array that is in execution order
    // first put all the values in an array
    const tasks = [];
    Object.keys(hostResponse).forEach(
      function(taskKey) {
        hostResponse[taskKey].___key___ = taskKey;
        tasks.push(hostResponse[taskKey]);
      }
    );
    // then sort the array
    tasks.sort(function(a, b) { return a.__run_num__ - b.__run_num__; } );

    const indent = "    ";

    const div = document.createElement("div");

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    let total_millis = 0;
    let changes = 0;
    for(const task of tasks) {

      if(task.result === null) {
        skipped += 1;
      } else if(task.result) {
        succeeded += 1;
      } else {
        failed += 1;
      }

      const components = task.___key___.split("_|-");

      const taskDiv = document.createElement("div");

      const taskSpan = document.createElement("span");
      let txt = "----------";

      if(task.name)
        txt += "\n          ID: " + task.name;
      else
        txt += "\n          ID: (anonymous task)";

      txt += "\n    Function: " + components[0] + "." + components[3];

      txt += "\n      Result: " + JSON.stringify(task.result);

      if(task.comment)
        txt += "\n     Comment: " + task.comment;

      if(task.start_time)
        txt += "\n     Started: " + task.start_time;

      if(task.duration) {
        txt += "\n    Duration: " + OutputHighstate.getDurationClauseMillis(task.duration);
        total_millis += task.duration;
      }

      txt += "\n     Changes:";

      if(task.hasOwnProperty("changes")) {
        const str = JSON.stringify(task.changes);
        if(str !== "{}") {
          txt += "\n" + OutputNested.formatNESTED(task.changes, 14);
          changes += 1;
        }
      }

      taskSpan.innerText = txt;
      taskDiv.append(taskSpan);

      div.append(taskDiv);
    }

    const summarySpan = document.createElement("span");
    let txt = "\nSummary for " + hostname;
    txt += "\n------------";
    txt += "\nSucceeded: " + succeeded;
    if(changes > 0) txt += " (changed=" + changes + ")";
    txt += "\nFailed:    " + failed;
    txt += "\n------------";
    txt += "\nTotal states run: " + (succeeded + skipped + failed);
    txt += "\nTotal run time: " + OutputHighstate.getDurationClauseSecs(total_millis);
    summarySpan.innerText = txt;
    div.append(summarySpan);

    return div;
  }

}

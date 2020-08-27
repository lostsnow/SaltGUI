/* global document window */

import {Route} from "./Route.js";
import {Utils} from "../Utils.js";

export class PageRoute extends Route {

  updateOfflineMinion (pMinionId, pMinionsDict) {
    const minionTr = this.getElement(Utils.getIdFromMinionId(pMinionId));

    minionTr.appendChild(Utils.createTd("minion-id", pMinionId));

    const offlineSpan = Utils.createSpan("status", "offline");
    // add an opinion when we have one
    if (pMinionId in pMinionsDict) {
      if (pMinionsDict[pMinionId] === "true") {
        Utils.addToolTip(offlineSpan, "Minion is offline\nIs the host running and is the salt-minion installed and started?\nUpdate file 'minions.txt' when needed", "bottom-left");
        offlineSpan.style.color = "red";
      } else {
        Utils.addToolTip(offlineSpan, "Minion is offline\nSince it is reported as inactive in file 'minions.txt', that should be OK", "bottom-left");
      }
    }
    offlineSpan.classList.add("offline");
    const offlineTd = Utils.createTd("", "");
    offlineTd.appendChild(offlineSpan);
    minionTr.appendChild(offlineTd);
  }

  _getIpNumberPrefixes (pAllMinionsGrains) {
    // First we gather all (resonable) prefixes
    // Only use byte-boundaries for networks
    // Must match a subnet of A, B or C network
    const prefixes = {};
    for (const minionId in pAllMinionsGrains) {
      const grains = pAllMinionsGrains[minionId];
      if (!grains.fqdn_ip4) {
        continue;
      }
      if (!Array.isArray(grains.fqdn_ip4)) {
        continue;
      }
      for (const ip of grains.fqdn_ip4) {
        const parts = ip.split(".");
        if (ip.startsWith("10.")) {
          prefixes[parts[0] + "."] = true;
        }
        if (ip.startsWith("10.") ||
           ip.startsWith("172.16.") ||
           ip.startsWith("172.17.") ||
           ip.startsWith("172.18.") ||
           ip.startsWith("172.19.") ||
           ip.startsWith("172.20.") ||
           ip.startsWith("172.21.") ||
           ip.startsWith("172.22.") ||
           ip.startsWith("172.23.") ||
           ip.startsWith("172.24.") ||
           ip.startsWith("172.25.") ||
           ip.startsWith("172.26.") ||
           ip.startsWith("172.27.") ||
           ip.startsWith("172.28.") ||
           ip.startsWith("172.29.") ||
           ip.startsWith("172.30.") ||
           ip.startsWith("172.31.") ||
           ip.startsWith("192.168.")) {
          prefixes[parts[0] + "." + parts[1] + "."] = true;
          prefixes[parts[0] + "." + parts[1] + "." + parts[2] + "."] = true;
        }
      }
    }

    // Then we look whether each minion uses the prefix
    // When at least one minion does not use the subnet,
    //    then it is not a suitable subnet
    for (const prefix in prefixes) {
      for (const minionId in pAllMinionsGrains) {
        let cnt = 0;
        const grains = pAllMinionsGrains[minionId];
        if (!grains.fqdn_ip4) {
          continue;
        }
        if (!Array.isArray(grains.fqdn_ip4)) {
          continue;
        }
        for (const ip of grains.fqdn_ip4) {
          if (!ip.startsWith(prefix)) {
            continue;
          }
          cnt += 1;
        }
        // multiple or unused?
        //    then it is not a suitable subnet
        if (cnt !== 1) {
          prefixes[prefix] = false;
          break;
        }
      }
    }

    // actually remove the unused prefixes
    for (const prefix in prefixes) {
      if (!prefixes[prefix]) {
        delete prefixes[prefix];
      }
    }

    return prefixes;
  }

  _addNone (pContainer) {
    const tr = document.createElement("tr");
    const td = Utils.createTd("minion-id", "none");
    td.setAttribute("colspan", pContainer.rows[0].cells.length);
    tr.appendChild(td);
    pContainer.appendChild(tr);
  }

  _copyAddress (pTarget) {
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(pTarget.firstChild);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();

    Utils.addToolTip(pTarget, "Copied!");
  }

  _restoreClickToCopy (pTarget) {
    Utils.addToolTip(pTarget, "Click to copy");
  }

  addPanel (pPanel) {
    pPanel.route = this;
    pPanel.router = this.router;
    const dashboard = this.pageElement.querySelector(".dashboard");
    dashboard.append(pPanel.div);
  }
}

/* eslint-disable no-shadow */
/* eslint-disable no-use-before-define */
/* eslint-disable no-plusplus */
/* eslint-disable no-prototype-builtins */
import browser from 'webextension-polyfill';

function getPackageInfo() {
  const host = window.location.host
  if (host.indexOf('npmjs.com') !== -1) {
    return getPackageInfoNPM()
  }

  return false;
}

function getPackageInfoNPM() {
  const packageUrlInfo = window.location
  let packageName = ''
  let packageVersion = ''
  if (packageUrlInfo.pathname.indexOf('/package') === 0) {

    const packageUrlSegments = packageUrlInfo.pathname.split('/')
    if (packageUrlSegments.length === 4) {
      packageName = `${packageUrlSegments[2]}/${packageUrlSegments[3]}`
    }

    if (packageUrlSegments.length === 3) {
      packageName = packageUrlSegments[2]
    }
  }

  packageVersion = document.getElementsByClassName('f2874b88 fw6 mb3 mt2 truncate black-80 f4')[0].textContent

  return {
    packageName,
    packageVersion
  }
}

browser.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    return sendResponse(getPackageInfo())
  }
);
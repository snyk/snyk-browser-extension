/* eslint-disable no-shadow */
/* eslint-disable no-use-before-define */
/* eslint-disable no-plusplus */
/* eslint-disable no-prototype-builtins */
import browser from 'webextension-polyfill'

function getPackageInfo() {
  const host = window.location.host
  if (host.indexOf('npmjs.com') !== -1) {
    return getPackageInfoNPM()
  }

  return false
}

function getPackageInfoNPM() {
  const packageUrlInfo = window.location
  let packageName = ''
  let packageVersion = ''

  try {
    if (packageUrlInfo.pathname.indexOf('/package') === 0) {
      const packageUrlSegments = packageUrlInfo.pathname.split('/')
      if (packageUrlSegments.length === 4) {
        packageName = `${packageUrlSegments[2]}/${packageUrlSegments[3]}`
      }

      if (packageUrlSegments.length === 3) {
        packageName = packageUrlSegments[2]
      }
    }

    packageVersion = document.getElementsByClassName('flex flex-row items-center')[1].textContent

    return {
      packageName,
      packageVersion
    }
  } catch (error) {
    // swallow error as we're unable to operate on this npmjs page
  }
}

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const data = getPackageInfo()
  return Promise.resolve(data)
})

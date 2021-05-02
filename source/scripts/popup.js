import browser from 'webextension-polyfill'

let snykApiToken = ''

function openWebPage(url) {
  return browser.tabs.create({ url })
}

function sortByServerity(data) {

  const severityMap = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  }

  data.sort(function(vuln1, vuln2) {
    var severityVuln1 = severityMap[vuln1.severity.toLowerCase()]
    var severityVuln2 = severityMap[vuln2.severity.toLowerCase()]
    return severityVuln2 - severityVuln1
  })

  return data
}


function drawVulnerabilities(vulnerabilities) {

  const vulnerabilitiesList = document.getElementById('vulnerabilitiesList')
  let vulnerabilitiesCards = ''

  let upgradePath = ''
  let upgradeInfo = ''
  let directOrIndirect = ''

  const vulnerabilitiesSorted = sortByServerity(vulnerabilities)
  vulnerabilitiesSorted.forEach(vulnerability => {

    let severityClass = ''
    let severityText = ''
    switch (vulnerability.severity) {
      case 'critical': 
      case 'high': 
        severityClass = 'bg-danger'
        severityText = 'High'
        break
      case 'medium':
        severityClass = 'bg-warning'
        severityText = 'Medium'
        break
      case 'low':
        severityClass = 'bg-secondary'
        severityText = 'Low'
        break
    }

    let isUpgradable = vulnerability.isUpgradable ? 'badge-success' : 'badge-danger'
    let isPatchable = vulnerability.isPatchable ? 'badge-success' : 'badge-secondary'

    upgradePath = ''
    if (vulnerability.upgradePath && vulnerability.upgradePath.length > 0) {
      if (vulnerability.upgradePath[1] !== false) {
        upgradePath = vulnerability.upgradePath[1]
      }

      if (vulnerability.upgradePath[0] !== false) {
        upgradePath = vulnerability.upgradePath[0]
      }
    }

    if (vulnerability.from && vulnerability.from.length > 1) {
      directOrIndirect = `<span class="badge badge-secondary">indirect</span>`
      upgradeInfo = `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        Upgrade path:
        <span class="badge badge-primary badge-pill">${upgradePath}</span>
      </li>
      `
    } else {
      directOrIndirect = `<span class="badge badge-secondary">direct</span>`
      upgradeInfo = `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        Upgradable:
        <span class="badge ${isUpgradable} badge-pill">${vulnerability.isUpgradable}</span>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center">
        Patchable:
        <span class="badge ${isPatchable} badge-pill">${vulnerability.isPatchable}</span>
      </li>
      `
    }

    vulnerabilitiesCards += `
    <div class="card text-white mb-3">
      <div class="card-header ${severityClass}">${severityText} severity <span class="badge badge-secondary">${vulnerability.cvssScore}</span> ${directOrIndirect}</div>
      <div class="card-body ${severityClass}">
        <h5 class="card-title">${vulnerability.title}</h5>
        <p class="card-text">

        <ul class="list-group text-dark">
          <li class="list-group-item list-group-item-action flex-column align-items-start active">
              <div class="d-flex w-100 justify-content-between">
              <h5 class="mb-1">${vulnerability.package}</h5>
              <small>${vulnerability.version}</small>
            </div>
            <p class="mb-1">
              Introduced through:
              <br/>${vulnerability.from.join(' -> ')}
            </p>
          </li>

          ${upgradeInfo}

          <li class="list-group-item d-flex justify-content-between align-items-center">
            CVEs
            <span class="badge badge-secondary badge-pill">${vulnerability.identifiers.CVE.join(' ')}</span>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center">
            CWEs
            <span class="badge badge-secondary badge-pill">${vulnerability.identifiers.CWE.join(' ')}</span>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center">
            Disclosed at:
            <span class="badge badge-secondary badge-pill">${new Date(vulnerability.disclosureTime).toLocaleString()}</span>
          </li>
        </ul>

        </p>
      </div>
      <div class="card-footer bg-gray text-muted">
        <a target="_blank" href="${vulnerability.url}" onClick="browser.tabs.create({"url": "${vulnerability.url}"})">Learn more</a>
      </div>  
    </div>
    `
  })

  vulnerabilitiesList.innerHTML = vulnerabilitiesCards

  $('#loader').toggleClass('d-none');
  $('#results').toggleClass('d-none');

}

document.addEventListener('DOMContentLoaded', async () => {

  const storage = await browser.storage.local.get()
  snykApiToken = storage['apiToken']
  document.getElementById('snykApiToken').value = snykApiToken
  if (!storage.apiToken) {
    $('.collapse').collapse('show')
  }
  
  let response
  try {
    const tabs = await browser.tabs.query({active: true, currentWindow: true})
    response = await browser.tabs.sendMessage(tabs[0].id, {greeting: "hello"})
  } catch (error) {
    $('#error').toggleClass('d-none')
    document.getElementById('errorMessage').textContent = 'Unsupported package repository website'
  }

  document.getElementById('packageName').textContent = response.packageName
  document.getElementById('packageVersion').textContent = `v${response.packageVersion}`

  if (snykApiToken && response.packageName && response.packageVersion) {

    $('#loader').toggleClass('d-none')

    const url = `https://snyk.io/api/v1/test/npm/${response.packageName}/${response.packageVersion}`
    try {
      const vulnerabilitiesData = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${snykApiToken}`
        }
      })

      const snykPackageData = await vulnerabilitiesData.json()
      const vulnerabilityIssues = snykPackageData.issues.vulnerabilities
      const licenseIssues = snykPackageData.issues.licenses
      
      document.getElementById('vulnerabilitiesCount').textContent = `${vulnerabilityIssues.length} vulnerabilities`
      if (vulnerabilityIssues.length > 0) {
        document.getElementById('vulnerabilitiesStatus').textContent = '❌'
        $('#vulnerabilitiesHeader').toggleClass('text-danger')
      } else {
        document.getElementById('vulnerabilitiesStatus').textContent = '✅'
        $('#vulnerabilitiesHeader').toggleClass('text-success')
      }

      if (licenseIssues.length > 0) {
        document.getElementById('licensesCount').textContent = `${licenseIssues.length} license issues`
        document.getElementById('licensesStatus').textContent = '❌'
        $('#licensesHeader').toggleClass('text-danger')
      } else {
        document.getElementById('licensesCount').textContent = `No license issues`
        document.getElementById('licensesStatus').textContent = '✅'
        $('#licensesHeader').toggleClass('text-success')
      }

      drawVulnerabilities(vulnerabilityIssues)
      
    } catch (err) {
      console.log(err)
    }
  }

  document.getElementById('link_website').addEventListener('click', () => {
    return openWebPage('https://snyk.io')
  })

  const buttonSaveApiToken = document.getElementById('buttonSaveApiToken')
  buttonSaveApiToken.addEventListener('click', async () => {
    const snykApiTokenElement = document.getElementById('snykApiToken')
    const snykApiTokenValue = snykApiTokenElement.value
    await browser.storage.local.set({ apiToken: snykApiTokenValue })
    $('.collapse').collapse('toggle')
  })

})


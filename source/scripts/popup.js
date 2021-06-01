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

  vulnerabilitiesCards += `<p class="number">We've found ${vulnerabilities.length} vulnerabilities</p>`;

  const vulnerabilitiesSorted = sortByServerity(vulnerabilities)
  vulnerabilitiesSorted.forEach(vulnerability => {

    let severityClass = ''
    let severityText = ''
    switch (vulnerability.severity) {
      case 'critical': 
      case 'high': 
        severityClass = 'high'
        severityText = 'H'
        break
      case 'medium':
        severityClass = 'medium'
        severityText = 'M'
        break
      case 'low':
        severityClass = 'low'
        severityText = 'L'
        break
    }

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
      directOrIndirect = `<span class="text-muted">Indirect Vulnerability</span>`
      upgradeInfo = `
      <div class="d-flex justify-content-between border-top pt-2">
        <dt class="font-weight-normal">Upgrade path</dt>
        <dd class="my-0 number">${upgradePath ? upgradePath : '–'}</dd>
      </div>
      `
    } else {
      directOrIndirect = `<span class="text-muted">Direct Vulnerability</span>`
      upgradeInfo = `
      <div class="d-flex justify-content-between border-top pt-2">
        <dt class="font-weight-normal">Upgradable</dt>
        <dd class="my-0 number">${vulnerability.isUpgradable ? 'Yes' : 'No'}</dd>
      </div>
      <div class="d-flex justify-content-between border-top pt-2">
        <dt class="font-weight-normal">Patchable</dt>
        <dd class="my-0 number">${vulnerability.isPatchable ? 'Yes' : 'No'}</dd>
      </div>
      `
    }

    vulnerabilitiesCards += `
    <div class="vulnerability rounded ${severityClass}">
      <div class="vulnerability-indicator rounded-top"></div>
      <div class="vulnerability-header p-3">
        <div class="d-flex align-items-center">
          <span class="severity">${severityText}</span>
          <h2 class="h5 my-0 ml-2">${vulnerability.package}</h2>
        </div>
        <p class="vulnerability-title text-muted my-2">${vulnerability.title}</p>
        <div class="vulnerability-meta d-flex align-items-center">
          <span class="text-muted number">${vulnerability.version}</span>
          <span class="text-muted">&middot;</span>
          <span class="text-muted number">${vulnerability.cvssScore}</span>
          <span class="text-muted">&middot;</span>
          ${directOrIndirect}
        </div>
      </div>
      <div class="vulnerability-body rounded-bottom p-3">

        <dl class="text-xs mt-0 mb-3">

          <div class="d-flex justify-content-between">
            <dt class="font-weight-normal">Introduced through</dt>
            <dd class="my-0 text-right number">${vulnerability.from.join('<br />')}</dd>
          </div>

          ${upgradeInfo}

          <div class="d-flex justify-content-between border-top pt-2">
            <dt class="font-weight-normal">CVEs</dt>
            <dd class="my-0 number">${vulnerability.identifiers.CVE.length > 0 ? vulnerability.identifiers.CVE.join(' ') : '–'}</dd>
          </div>
          <div class="d-flex justify-content-between border-top pt-2">
            <dt class="font-weight-normal">CWEs</dt>
            <dd class="my-0 number">${vulnerability.identifiers.CWE.length > 0 ? vulnerability.identifiers.CWE.join(' ') : '–'}</dd>
          </div>
          <div class="d-flex justify-content-between border-top pt-2">
            <dt class="font-weight-normal">Disclosed at</dt>
            <dd class="my-0 number">${new Date(vulnerability.disclosureTime).toLocaleString()}</dd>
          </div>

        </dl>

        <a target="_blank" href="${vulnerability.url}?utm_medium=Referral&utm_source=Google&utm_campaign=Chrome-Extension&utm_content=Vuln" onClick="browser.tabs.create({"url": "${vulnerability.url}?utm_medium=Referral&utm_source=Google&utm_campaign=Chrome-Extension&utm_content=Vuln"})">Learn more</a>

      </div>
    </div>
    `
  })

  vulnerabilitiesList.innerHTML = vulnerabilitiesCards;

  $('#loader').addClass('d-none');

}


async function retrieveSnykInformation({snykApiToken}) {

  let response
  try {
    const tabs = await browser.tabs.query({active: true, currentWindow: true})
    response = await browser.tabs.sendMessage(tabs[0].id, {greeting: "hello"})
  } catch (error) {
    $('#results').addClass('d-none');
    $('#errorPackageDetails').removeClass('d-none');
    $('details').attr('open', false).find('summary').removeClass('d-none');
    return;
  }

  if (!response) {
    $('#results').addClass('d-none');
    $('#errorPackageDetails').removeClass('d-none');
    $('details').attr('open', false).find('summary').removeClass('d-none');
  }

  if (snykApiToken && response.packageName && response.packageVersion) {
    
    document.getElementById('packageName').textContent = response.packageName
    document.getElementById('packageVersion').textContent = `v${response.packageVersion}`

    $('#loader').removeClass('d-none');

    const advisorUrl = `https://snyk.io/advisor/npm-package/${response.packageName}?utm_medium=Referral&utm_source=Google&utm_campaign=Chrome-Extension&utm_content=Advisor`;
    const scoreUrl = `http://snyk.io/advisor/npm-package/${response.packageName}/score`;
    $('#healthscore').after(`<a target="_blank" href="${advisorUrl}" onClick="browser.tabs.create({"url": "${advisorUrl}"})" class="d-block px-3 pb-3 pt-0">View package health on Snyk Advisor</a>`);
    $('#healthscore iframe').prop('src', scoreUrl)

    const url = `https://snyk.io/api/v1/test/npm/${response.packageName}/${response.packageVersion}`
    try {
      const vulnerabilitiesData = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${snykApiToken}`
        }
      })

      // authentication error
      if (vulnerabilitiesData.status === 401) {

        $('#results').addClass('d-none');
        $('#vulnerabilitiesList').addClass('d-none');
        $('#loader').addClass('d-none');
        $('#errorAPITokenMissing').removeClass('d-none');
        $('details').attr('open', true).find('summary').addClass('d-none').end().find('input').focus();
      
      // authentication ok
      } else {

        $('#results').removeClass('d-none');
        $('#vulnerabilitiesList').removeClass('d-none');
        $('details').attr('open', false).find('summary').removeClass('d-none');

        const snykPackageData = await vulnerabilitiesData.json()
        const vulnerabilityIssues = snykPackageData.issues.vulnerabilities
        const licenseIssues = snykPackageData.issues.licenses
        
        if (vulnerabilityIssues.length > 0) {

          let high = 0;
          let medium = 0;
          let low = 0;
          
          vulnerabilityIssues.forEach(function(item, i){
            if(item.severity === 'high') {
              ++high;
            }
            if(item.severity === 'medium') {
              ++medium;
            }
            if(item.severity === 'low') {
              ++low;
            }
          })

          if(high > 0) {
            document.getElementById('totalVulnerabilitiesHigh').querySelector('.number').textContent = high
            document.getElementById('totalVulnerabilitiesHigh').classList.add('high')
          }

          if(medium > 0) {
            document.getElementById('totalVulnerabilitiesMedium').querySelector('.number').textContent = medium
            document.getElementById('totalVulnerabilitiesMedium').classList.add('medium')
          }

          if(low > 0) {
            document.getElementById('totalVulnerabilitiesLow').querySelector('.number').textContent = low
            document.getElementById('totalVulnerabilitiesLow').classList.add('low')
          }

        }

        if (licenseIssues.length > 0) {

          let high = 0;
          let medium = 0;
          let low = 0;
          
          vulnerabilityIssues.forEach(function(item, i){
            if(item.severity === 'high') {
              ++high;
            }
            if(item.severity === 'medium') {
              ++medium;
            }
            if(item.severity === 'low') {
              ++low;
            }
          })

          if(high > 0) {
            document.getElementById('totalLicenseIssuesHigh').querySelector('.number').textContent = high
            document.getElementById('totalLicenseIssuesHigh').classList.add('high')
          }

          if(medium > 0) {
            document.getElementById('totalLicenseIssuesMedium').querySelector('.number').textContent = medium
            document.getElementById('totalLicenseIssuesMedium').classList.add('medium')
          }

          if(low > 0) {
            document.getElementById('totalLicenseIssuesLow').querySelector('.number').textContent = low
            document.getElementById('totalLicenseIssuesLow').classList.add('low')
          }

        }

        drawVulnerabilities(vulnerabilityIssues)

      }
      
    } catch (err) {
      
    }
  }

}

document.addEventListener('DOMContentLoaded', async () => {

  const storage = await browser.storage.local.get()
  snykApiToken = storage['apiToken']
  
  if (snykApiToken) {
    document.getElementById('snykApiToken').value = snykApiToken
    await retrieveSnykInformation({snykApiToken})
  }

  if (!snykApiToken) {
    $('#results').addClass('d-none');
    $('#errorAPITokenMissing').removeClass('d-none');
    $('details').attr('open', true).find('summary').addClass('d-none').end().find('input').focus();
  }

  document.getElementById('link_website').addEventListener('click', () => {
    return openWebPage('https://snyk.io')
  })

  document.getElementById('link_account').addEventListener('click', () => {
    return openWebPage('https://app.snyk.io/account')
  })

  const buttonSaveApiToken = document.getElementById('buttonSaveApiToken')
  buttonSaveApiToken.addEventListener('click', async () => {
    
    const snykApiTokenElement = document.getElementById('snykApiToken')
    const snykApiTokenValue = snykApiTokenElement.value
    await browser.storage.local.set({ apiToken: snykApiTokenValue })

    if (snykApiTokenValue) {
      $('#errorAPITokenMissing').toggleClass('d-none')
      $(buttonSaveApiToken).attr('disabled', false);
      await retrieveSnykInformation({snykApiToken: snykApiTokenValue})
    }

  })

})


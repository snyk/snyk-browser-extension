# About

This is the source code repository of the official [Snyk browser extension](https://chrome.google.com/webstore/detail/snyk/elldmoebdepbaglfinnieaobjjggpmdn) as found on the Chrome web store.

It builds upon [Snyk Open Source](https://snyk.io/product/open-source-security-management/) and [Snyk Advisor](https://snyk.io/advisor) to provide rich software composition analysis information when browsing open source package pages.

## Support and gaps

- Browsers known to be supported are Chrome and chromium-based versions such as Brave.
- Package pages only support npm
- Packages pages in npm don't support specific versioned pages

## Development

Install all dependencies:

```
yarn install
```

Build the chrome extension:

```
npm run dev:chrome
```

Go to Chrome extensions manager, Load unpacked extension, and choose the `extensions/chrome` folder to load it from

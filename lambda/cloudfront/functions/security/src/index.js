// eslint-disable-next-line
function handler(event) {
  const response = event.response;
  const headers = response.headers;
  const defaultSrc = "'self'";
  const imgSrc =
    "'self' https://googletagmanager.com https://*.analytics.google.com https://ssl.gstatic.com https://www.gstatic.com https://*.google-analytics.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com https://*.google.co.jp";
  const scriptSrc =
    "'self' https://googletagmanager.com https://tagmanager.google.com https://*.googletagmanager.com";
  const styleSrc =
    "'self' https://googletagmanager.com https://tagmanager.google.com https://fonts.googleapis.com";
  const fontSrc = "'self' https://fonts.gstatic.com data:";
  const connectSrc =
    "'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com https://*.google.co.jp";

  // Set HTTP security headers
  // Since JavaScript doesn't allow for hyphens in variable names, we use the dict["key"] notation
  headers['strict-transport-security'] = {
    value: 'max-age=63072000; includeSubdomains; preload',
  };
  headers['content-security-policy'] = {
    value:
      `default-src ${defaultSrc};` +
      ` img-src ${imgSrc};` +
      ` script-src ${scriptSrc};` +
      ` style-src ${styleSrc};` +
      ` font-src ${fontSrc};` +
      ` connect-src ${connectSrc};`,
  };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['x-xss-protection'] = { value: '1; mode=block' };

  // Return the response to viewers
  return response;
}

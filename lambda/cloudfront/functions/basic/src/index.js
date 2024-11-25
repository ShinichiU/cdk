// eslint-disable-next-line
function handler(event) {
  const request = event.request;
  const headers = request.headers;

  if (
    typeof headers.authorization === 'undefined' ||
    // echo -n ura:be | base64
    headers.authorization.value !== 'Basic dXJhOmJl'
  ) {
    return {
      statusCode: 401,
      statusDescription: 'Unauthorized',
      headers: { 'www-authenticate': { value: 'Basic' } },
    };
  }

  return request;
}
